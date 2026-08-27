<script setup>
/**
 * Reservas — o funil pós pré-cadastro (reservada, em contrato, em repasse,
 * vendida, cancelada).
 *
 * A tela É a listagem, pelo mesmo motivo do Pré-Cadastros: havia dois desenhos
 * do mesmo dado - uma página com resumo, cartões de bucket, detalhamento por
 * situação e uma tabela AGREGADA por empreendimento, e um modal com a lista de
 * reservas de verdade. Quem queria achar uma reserva passava pela página só
 * para chegar no modal.
 *
 *   filtros    fechados, com selo de quantos estão ativos
 *   KPIs       cinco números com série e variação; CLICAR NELES recorta a lista
 *   tabela     ordenável, truncada, com o registro inteiro a um clique
 *
 * Pizza, colunas e funil saíram. O que eles mostravam - composição por
 * empreendimento, por situação, por corretor - a tabela mostra ordenando a
 * coluna, e o filtro recorta com mais precisão do que clicar numa fatia.
 *
 * "Vendida" aqui é a ETAPA do CRM, não venda concretizada. A venda real mora
 * no Faturamento.
 */
import { onMounted, ref, toRef, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useReservasStore } from '@/stores/Comercial/Reservas/reservasStore';

import Favorite from '@/components/config/Favorite.vue';
import Export from '@/components/config/Export.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import FilterBar from '@/components/UI/FilterBar.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Spinner from '@/components/UI/Spinner.vue';

import ReservaDetailModal from './components/ReservaDetailModal.vue';
import { iconForStage, bucketOf, etapaDe } from './stages.js';
import { useIncrementalList } from '@/composables/useIncrementalList';

const store = useReservasStore();
const route = useRoute();
const router = useRouter();

const { isVendida, isCancelada, isEmRepasse } = store;

const reservas = toRef(store, 'reservas');
const periodo = toRef(store, 'periodo');
const error = toRef(store, 'error');
const filtros = toRef(store, 'filtros');

/* ── Filtros do servidor (URL + API) ─────────────────────────────────────── */
const ARRAY_FIELDS = ['empreendimento', 'etapa', 'bloco', 'unidade', 'situacao', 'status_repasse', 'tipovenda', 'imobiliaria', 'corretor', 'empresa_correspondente', 'lead_origem'];
const STR_FIELDS = ['nome', 'documento', 'data_inicio', 'data_fim'];
const BOOL_FIELDS = ['only_active', 'only_vendida', 'with_lead', 'excluir_painel', 'only_alerta_erp'];

function syncFiltersFromUrl() {
  const q = route.query;
  if (!Object.keys(q).length) return;
  const next = { ...filtros.value };
  for (const k of ARRAY_FIELDS) next[k] = q[k] ? String(q[k]).split(',').filter(Boolean) : [];
  for (const k of STR_FIELDS) next[k] = q[k] ? String(q[k]) : '';
  for (const k of BOOL_FIELDS) next[k] = String(q[k]) === 'true';
  Object.assign(filtros.value, next);
}

function syncUrlFromFilters() {
  const q = {};
  Object.entries(filtros.value).forEach(([k, v]) => {
    if (Array.isArray(v)) { if (v.length) q[k] = v.join(','); }
    else if (typeof v === 'boolean') { if (v) q[k] = 'true'; }
    else if (v && String(v).trim()) q[k] = String(v).trim();
  });
  router.replace({ query: q });
}

/* O período padrão é o que o SERVIDOR escolhe quando ninguém pede data. Guardar
   qual é ele serve para duas coisas: saber se o usuário mudou o período (é o
   que liga o selo de filtro ativo) e ter para onde voltar no Limpar. */
const periodoPadrao = ref({ data_inicio: '', data_fim: '' });

/* Quantos filtros estão preenchidos - conta DIMENSÃO, não valor: três
   empreendimentos selecionados são um filtro ativo, não três.

   A data só conta como filtro quando o usuário MUDOU o período que está na
   tela. O campo nasce espelhando o período que o servidor devolveu, e espelho
   não é filtro - se contasse, a barra abriria dizendo "2 ativos" sem ninguém
   ter filtrado nada. */
const dataDiferenteDoPeriodo = (campo) => {
  const v = filtros.value[campo];
  if (!v) return false;
  return String(v).slice(0, 10) !== periodoPadrao.value[campo];
};

const activeCount = computed(() => {
  const f = filtros.value;
  let n = 0;
  for (const k of ARRAY_FIELDS) if (f[k]?.length) n++;
  if (f.nome?.trim()) n++;
  if (f.documento?.trim()) n++;
  for (const k of BOOL_FIELDS) if (f[k]) n++;
  if (dataDiferenteDoPeriodo('data_inicio')) n++;
  if (dataDiferenteDoPeriodo('data_fim')) n++;
  return n;
});

/* Nasce CARREGANDO. Com `false`, o primeiro quadro é renderizado antes de o
   `onMounted` rodar: a lista está vazia e a tela pisca "sem registros" antes do
   esqueleto aparecer. O `finally` do onMounted é quem desliga. */
const loading = ref(true);
const exportOpen = ref(false);
const detailVisible = ref(false);
const detailItem = ref(null);

async function buscar() {
  syncUrlFromFilters();
  loading.value = true;
  try { await store.fetchReservas(true); }
  finally { loading.value = false; espelharPeriodoNosCampos(); }
}

/* Na primeira carga as datas vão vazias e quem define o período é o servidor.
   Depois que ele responde, os campos passam a mostrar o período que está na
   tela - senão o filtro diz uma coisa e a lista mostra outra. */
function espelharPeriodoNosCampos() {
  const p = periodo.value || {};
  const ini = p.data_inicio ? String(p.data_inicio).slice(0, 10) : '';
  const fim = p.data_fim ? String(p.data_fim).slice(0, 10) : '';
  const servidorQueEscolheu = !filtros.value.data_inicio && !filtros.value.data_fim;
  if (servidorQueEscolheu && (ini || fim)) periodoPadrao.value = { data_inicio: ini, data_fim: fim };
  if (!filtros.value.data_inicio && ini) filtros.value.data_inicio = ini;
  if (!filtros.value.data_fim && fim) filtros.value.data_fim = fim;
}

/* ── Recorte pelo KPI ─────────────────────────────────────────────────────
   Clicar num cartão recorta a TABELA, não os cartões: se o número do cartão
   também mudasse, clicar em "Vendida" levaria a 100% e a leitura perderia o
   sentido. Os cartões descrevem o período; a tabela mostra o recorte. */
const recorte = ref('');

const RECORTES = {
  tempo: { label: 'finalizadas', teste: (r) => isVendida(r) || isCancelada(r) },
  vendida: { label: 'na etapa Vendida', teste: (r) => isVendida(r) },
  repasse: { label: 'em repasse', teste: (r) => isEmRepasse(r) },
  cancelada: { label: 'canceladas ou distratadas', teste: (r) => isCancelada(r) },
};

function aoClicarKpi(item) {
  /* Clicar no cartão já ativo desliga o recorte: o mesmo gesto liga e desliga,
     como nos outros filtros do sistema. "Total" sempre volta ao conjunto todo. */
  recorte.value = (item.key === 'total' || recorte.value === item.key) ? '' : item.key;
}

const recorteAtivo = computed(() => RECORTES[recorte.value] || null);

const lista = computed(() => (recorteAtivo.value
  ? reservas.value.filter(recorteAtivo.value.teste)
  : reservas.value));

function limpar() {
  Object.assign(filtros.value, {
    nome: '', documento: '',
    empreendimento: [], etapa: [], bloco: [], unidade: [],
    situacao: [], status_repasse: [], tipovenda: [],
    imobiliaria: [], corretor: [], empresa_correspondente: [],
    lead_origem: [],
    only_active: false, only_vendida: false, with_lead: false, excluir_painel: false,
    only_alerta_erp: false,
    data_inicio: '', data_fim: '',
  });
  recorte.value = '';
  router.replace({ query: {} });
  buscar();
}

/* ── KPIs ─────────────────────────────────────────────────────────────────
   Sobre o período inteiro, nunca sobre o recorte.

   "Finalizada" é a reserva que teve DESFECHO: virou etapa Vendida ou foi
   cancelada/distratada. Reserva com contrato assinado mas sem desfecho ainda
   está em curso, e contá-la como finalizada encurtaria o tempo médio. */
const kpis = computed(() => {
  const l = reservas.value;
  let vendidas = 0, canceladas = 0, ativas = 0, emRepasse = 0, somaDias = 0, qtdFin = 0;
  for (const r of l) {
    const v = isVendida(r), c = isCancelada(r);
    if (v) vendidas++;
    else if (c) canceladas++;
    else ativas++;
    if (isEmRepasse(r)) emRepasse++;
    if (v || c) {
      const d = Number(r.dias_em_reserva);
      if (Number.isFinite(d) && d >= 0) { somaDias += d; qtdFin++; }
    }
  }
  const total = l.length;
  return {
    total, ativas, vendidas, canceladas, emRepasse, totalFin: qtdFin,
    pctVendidas: total ? vendidas / total : 0,
    pctEmRepasse: total ? emRepasse / total : 0,
    pctCanceladas: total ? canceladas / total : 0,
    tempoMedioFin: qtdFin ? somaDias / qtdFin : 0,
  };
});

/* ── Série e variação dos cartões ─────────────────────────────────────────
   A variação compara a segunda metade do período com a primeira. Não existe
   "período anterior" aqui: o filtro define um recorte de datas, e comparar com
   um mês que ninguém pediu seria inventar contexto. */
const NUM_BALDES = 12;

const serieDoPeriodo = computed(() => {
  const l = reservas.value.filter((r) => r.data_reserva);
  if (l.length < 2) return [];
  const tempos = l.map((r) => new Date(r.data_reserva).getTime()).filter(Number.isFinite);
  if (!tempos.length) return [];
  const ini = Math.min(...tempos), fim = Math.max(...tempos);
  const span = Math.max(1, fim - ini);

  const baldes = Array.from({ length: NUM_BALDES }, () => ({
    total: 0, vendidas: 0, repasse: 0, canceladas: 0, fin: 0, somaDias: 0,
  }));
  for (const r of l) {
    const t = new Date(r.data_reserva).getTime();
    if (!Number.isFinite(t)) continue;
    const b = baldes[Math.min(NUM_BALDES - 1, Math.floor(((t - ini) / span) * NUM_BALDES))];
    b.total++;
    const v = isVendida(r), c = isCancelada(r);
    if (v) b.vendidas++;
    else if (c) b.canceladas++;
    if (isEmRepasse(r)) b.repasse++;
    if (v || c) {
      const d = Number(r.dias_em_reserva);
      if (Number.isFinite(d) && d >= 0) { b.fin++; b.somaDias += d; }
    }
  }
  return baldes;
});

const serieDe = (fn) => serieDoPeriodo.value.map(fn);
const pctBalde = (b, campo) => (b.total ? (b[campo] / b.total) * 100 : 0);

function variacao(valores, { maiorEhMelhor = true } = {}) {
  const v = valores.filter((n) => Number.isFinite(n));
  if (v.length < 4) return null;
  const meio = Math.floor(v.length / 2);
  const media = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const antes = media(v.slice(0, meio));
  const depois = media(v.slice(meio));
  if (!antes) return null;
  const pct = ((depois - antes) / antes) * 100;
  if (!Number.isFinite(pct) || Math.abs(pct) < 0.05) return null;
  return {
    value: pct, dir: pct > 0 ? 'up' : 'down',
    good: pct > 0 ? maiorEhMelhor : !maiorEhMelhor,
    label: 'segunda metade do período contra a primeira',
  };
}

const nf = new Intl.NumberFormat('pt-BR');
const fmtPct1 = (v) => `${Number(v).toFixed(1)}%`;
const fmtDias1 = (v) => `${Number(v).toFixed(1)}d`;

const kpiCards = computed(() => {
  const k = kpis.value;
  const sTotal = serieDe((b) => b.total);
  const sTempo = serieDe((b) => (b.fin ? b.somaDias / b.fin : 0));
  const sVendidas = serieDe((b) => pctBalde(b, 'vendidas'));
  const sRepasse = serieDe((b) => pctBalde(b, 'repasse'));
  const sCanceladas = serieDe((b) => pctBalde(b, 'canceladas'));

  return [
    { key: 'total', label: 'Total no período', raw: k.total, hint: `em curso: ${k.ativas}`,
      icon: 'fas fa-bookmark', tone: 'accent', series: sTotal, sparkMode: 'line',
      delta: variacao(sTotal), tooltip: 'Clique para ver todas as reservas' },
    { key: 'tempo', label: 'Tempo até finalizar', raw: k.tempoMedioFin, format: fmtDias1, decimals: 1,
      hint: `${k.totalFin} finalizadas`, icon: 'fas fa-stopwatch', tone: 2, series: sTempo,
      sparkMode: 'line', delta: variacao(sTempo, { maiorEhMelhor: false }),
      tooltip: 'Clique para ver só as reservas com desfecho' },
    { key: 'vendida', label: 'Etapa Vendida (CRM)', raw: k.pctVendidas * 100, format: fmtPct1, decimals: 1,
      hint: `${k.vendidas} de ${k.total}`, icon: 'fas fa-flag-checkered', tone: 'pos', series: sVendidas,
      sparkMode: 'line', delta: variacao(sVendidas),
      tooltip: 'Etapa do CRM, não venda concretizada. Clique para ver só elas' },
    { key: 'repasse', label: 'Em repasse', raw: k.pctEmRepasse * 100, format: fmtPct1, decimals: 1,
      hint: `${k.emRepasse} de ${k.total}`, icon: 'fas fa-money-bill-transfer', tone: 7, series: sRepasse,
      sparkMode: 'line', delta: variacao(sRepasse),
      tooltip: 'Clique para ver só as que estão em repasse' },
    { key: 'cancelada', label: 'Cancelada / distrato', raw: k.pctCanceladas * 100, format: fmtPct1, decimals: 1,
      hint: `${k.canceladas} de ${k.total}`, icon: 'fas fa-ban', tone: 'neg', series: sCanceladas,
      sparkMode: 'line', delta: variacao(sCanceladas, { maiorEhMelhor: false }),
      tooltip: 'Clique para ver só as canceladas ou distratadas' },
  ];
});

/* ── Tabela ───────────────────────────────────────────────────────────────
   Ordenar aqui, não na tabela: ela recebe a lista já fatiada pelo scroll, e
   ordenar 50 de mil é pior que não ordenar. Ordem: filtrar, ordenar, fatiar. */
const ordem = ref({ by: 'data_reserva', dir: 'desc' });

const unidadeDe = (r) => [r.bloco, r.unidade].filter(Boolean).join(' / ') || '-';

/* As duas etapas andam juntas: a da reserva e a do repasse sao o mesmo assunto
   lido em dois sistemas, e separa-las obrigava a varrer a linha de ponta a
   ponta para responder "em que pe esta". No estreito a Etapa fica no titulo do
   card (prioridade 1) e o Repasse abre o corpo (prioridade 2), que e a posicao
   imediatamente ao lado. */
/* Texto do triângulo: diz o que aconteceu e o que fazer, sem obrigar a abrir
   outra tela. "Estimado" aparece quando a reserva nunca acionou o fluxo do ato -
   aí a contagem cai na data da reserva e sai maior que a real. */
function alertaErpTexto(row) {
  const min = Number(row.alerta_erp_minutos) || 0;
  const tempo = min < 120 ? `${min} min` : (min < 2880 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} dias`);
  return `Travada para o ERP: ${tempo} em Envio Sienge sem virar contrato no Sienge`
    + `${row.alerta_erp_estimado ? ' (tempo estimado)' : ''}.`
    + ' O lote do CV roda de 5 em 5 min. Abra a reserva no CV, corrija o que ele apontar e devolva a etapa.';
}

const COLUNAS = [
  { key: 'titular', label: 'Cliente', priority: 1, sortable: true,
    value: (r) => r.titular?.nome || '-' },
  { key: 'situacao', label: 'Etapa', priority: 1, sortable: true, width: '13rem',
    value: (r) => etapaDe(r) || '-' },
  { key: 'status_repasse', label: 'Repasse', priority: 2, sortable: true, width: '11rem',
    value: (r) => r.status_repasse || '-' },
  { key: 'empreendimento', label: 'Empreendimento', priority: 2, sortable: true },
  { key: 'unidade', label: 'Bloco / Unidade', priority: 2, sortable: true, width: '9rem',
    value: unidadeDe },
  { key: 'dias_em_reserva', label: 'Dias', priority: 2, numeric: true, sortable: true, width: '4.5rem' },
  { key: 'data_reserva', label: 'Reserva', priority: 3, sortable: true, width: '7rem' },
];

const ordenada = computed(() => {
  const { by, dir } = ordem.value;
  if (!by) return lista.value;
  const col = COLUNAS.find((c) => c.key === by);
  const mul = dir === 'asc' ? 1 : -1;
  const valor = (r) => (col?.value ? col.value(r) : r[by]);
  return [...lista.value].sort((a, b) => {
    const va = valor(a), vb = valor(b);
    if (va == null || va === '-') return 1;
    if (vb == null || vb === '-') return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul;
    return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' }) * mul;
  });
});

const inc = useIncrementalList(ordenada, { step: 50 });

/* ── Formatadores e detalhe ───────────────────────────────────────────── */
const fmtDate = (d) => { if (!d) return '-'; const dt = new Date(d); return isNaN(dt) ? '-' : dt.toLocaleDateString('pt-BR'); };

const stageVariant = (r) => {
  const k = bucketOf(r).key;
  if (k === 'vendida') return 'success';
  if (k === 'cancelada') return 'danger';
  if (k === 'em_repasse') return 'info';
  if (k === 'contrato') return 'accent';
  if (k === 'reservada') return 'warning';
  return 'neutral';
};

/* Links do CV. A reserva abre pelo idreserva; o repasse tem tela propria e
   precisa do idrepasse, que o relatorio passou a devolver junto. Sem repasse
   nao ha link - o selo fica sem href em vez de apontar para lugar nenhum. */
const cvLink = (r) => (r?.idreserva
  ? `https://menin.cvcrm.com.br/gestor/comercial/reservas/${r.idreserva}/administrar`
  : null);

const cvRepasseLink = (r) => (r?.idrepasse
  ? `https://menin.cvcrm.com.br/gestor/financeiro/repasses/${r.idrepasse}/administrar`
  : null);

/* O selo do repasse e mais discreto que o da etapa de proposito: a etapa e o
   assunto da linha, o repasse e o complemento. So os desfechos ganham cor. */
const repasseVariant = (v) => {
  const k = String(v || '');
  if (/cancelad|distrato/i.test(k)) return 'danger';
  if (/finalizad|conclu|quitad/i.test(k)) return 'success';
  if (/espera/i.test(k)) return 'neutral';
  return 'info';
};

function abrirDetalhe(r) { detailItem.value = r; detailVisible.value = true; }

const periodoLabel = computed(() => {
  const d = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '-');
  return `${d(periodo.value?.data_inicio)} → ${d(periodo.value?.data_fim)}`;
});

onMounted(async () => {
  syncFiltersFromUrl();
  loading.value = true;
  try { await store.fetchReservas(true); }
  finally { loading.value = false; espelharPeriodoNosCampos(); }
});
</script>

<template>
  <PageContainer size="full">

    <PageHeader title="Reservas"
      subtitle="Funil pós pré-cadastro: em que etapa está cada reserva, quanto tempo leva até ter desfecho e quanto vira contrato."
      icon="fas fa-bookmark">
      <template #title>
        <span>Reservas</span>
        <Favorite :router="'/comercial/reservas-report'" :section="'Reservas'" />
      </template>
      <template #actions>
        <Button size="sm" variant="secondary" icon="fas fa-download"
          :disabled="!lista.length" @click="exportOpen = true">
          <span class="hidden sm:inline">Exportar</span>
        </Button>
        <PageHelp
          storage-key="reservas"
          title="Como usar Reservas"
          intro="Esta tela lista as reservas do período e resume, no topo, como elas estão indo: quantas entraram, quanto tempo levam até ter desfecho, quantas chegaram na etapa Vendida e quantas foram canceladas."
          :steps="[
            { title: 'Escolha o período', text: 'Abra Filtros, defina as datas e o que mais quiser (empreendimento, situação, repasse, corretor) e clique em Buscar. A barra fica fechada para os números aparecerem primeiro.' },
            { title: 'Leia os cinco cartões', text: 'Cada um traz o número, a linha de como ele variou dentro do período e um selo comparando a segunda metade do período com a primeira.' },
            { title: 'Clique num cartão para recortar', text: 'Clicar em Etapa Vendida deixa na tabela só as reservas nessa etapa; em Cancelada, só as canceladas. Clicar de novo no mesmo cartão desfaz o recorte.' },
            { title: 'Ordene a tabela', text: 'Clique no título de uma coluna para ordenar por ela. É assim que se vê qual empreendimento tem mais reservas, quais estão paradas há mais dias ou quais já foram para repasse.' },
            { title: 'Abra a reserva', text: 'Clique na linha para ver o registro inteiro, com contratos, histórico de etapas, leads e mensagens. O botão ao lado leva direto ao CV.' },
          ]"
          :tips="[
            'Vendida aqui é a ETAPA do CRM, não venda concretizada: a venda real é a do Faturamento. Por isso o cartão se chama Etapa Vendida (CRM).',
            'Tempo até finalizar conta só as reservas com desfecho - virou etapa Vendida ou foi cancelada. As que estão em curso não entram na média.',
            'A etapa e o repasse são links: clicar abre aquele registro no CV CRM, cada um na sua tela - a reserva em Comercial, o repasse em Financeiro.',
            'Repasse vazio quer dizer que a reserva ainda não gerou repasse no CV, não que o dado faltou.',
            'A cor da etapa é a mesma em toda a tela: âmbar é reservada ou em análise, violeta é em contrato, ciano é em repasse, verde é vendida e vermelho é cancelada ou distrato.',
            'A tabela carrega de 50 em 50 conforme você rola, então não há página para caçar.',
            'Os filtros ficam gravados no endereço da página: dá para salvar o link ou mandar para alguém já filtrado.',
          ]"
        />
      </template>
    </PageHeader>

    <div class="mb-4">
      <FilterBar :active-count="activeCount" :loading="loading" apply-label="Buscar"
        @apply="buscar" @clear="limpar">
        <Input v-model="filtros.data_inicio" type="date" label="Cadastro - início" />
        <Input v-model="filtros.data_fim" type="date" label="Cadastro - fim" />
        <Input v-model="filtros.nome" label="Nome" placeholder="Nome do cliente" iconLeft="fas fa-user" />
        <Input v-model="filtros.documento" label="Documento" placeholder="CPF / CNPJ" iconLeft="fas fa-id-card" />

        <MultiSelector label="Empreendimento(s)" :model-value="filtros.empreendimento"
          @update:modelValue="v => filtros.empreendimento = Array.isArray(v) ? v : []"
          :options="store.empreendimentosOptions" :page-size="200" />
        <MultiSelector label="Situação" :model-value="filtros.situacao"
          @update:modelValue="v => filtros.situacao = Array.isArray(v) ? v : []"
          :options="store.situacoesOptions" />
        <MultiSelector label="Status repasse" :model-value="filtros.status_repasse"
          @update:modelValue="v => filtros.status_repasse = Array.isArray(v) ? v : []"
          :options="store.statusRepasseOptions" />
        <MultiSelector label="Tipo de venda" :model-value="filtros.tipovenda"
          @update:modelValue="v => filtros.tipovenda = Array.isArray(v) ? v : []"
          :options="store.tipoVendaOptions" />

        <MultiSelector label="Empresa correspondente" :model-value="filtros.empresa_correspondente"
          @update:modelValue="v => filtros.empresa_correspondente = Array.isArray(v) ? v : []"
          :options="store.empresasCorrespondentesOptions" />
        <MultiSelector label="Imobiliária" :model-value="filtros.imobiliaria"
          @update:modelValue="v => filtros.imobiliaria = Array.isArray(v) ? v : []"
          :options="store.imobiliariasOptions" />
        <MultiSelector label="Corretor" :model-value="filtros.corretor"
          @update:modelValue="v => filtros.corretor = Array.isArray(v) ? v : []"
          :options="store.corretoresOptions" />
        <MultiSelector label="Origem do lead" :model-value="filtros.lead_origem"
          @update:modelValue="v => filtros.lead_origem = Array.isArray(v) ? v : []"
          :options="store.leadOrigensOptions" />

        <div class="sm:col-span-2 lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2
                    pt-3 border-t border-line-subtle">
          <Switch v-model="filtros.only_active" size="sm" label="Em curso (ativa)" />
          <Switch v-model="filtros.only_vendida" size="sm" label="Só etapa Vendida (CRM)"
            description="Etapa do CRM, não venda concretizada" />
          <Switch v-model="filtros.with_lead" size="sm" label="Veio de lead" />
          <Switch v-model="filtros.excluir_painel" size="sm" label="Excluir leads de painel"
            description="Só leads externos ao CV" />
          <Switch v-model="filtros.only_alerta_erp" size="sm" label="Travadas para o ERP"
            description="Sem contrato no Sienge" />
        </div>
      </FilterBar>
    </div>

    <div v-if="error"
      class="mb-4 rounded-xl border border-data-neg/25 bg-data-neg/10 p-4 text-sm text-data-neg
             flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-start gap-2 min-w-0">
        <i class="fas fa-circle-exclamation mt-0.5 shrink-0"></i><span class="min-w-0">{{ error }}</span>
      </div>
      <Button variant="outline" size="sm" icon="fas fa-rotate-right" class="shrink-0" @click="buscar()">
        Tentar novamente
      </Button>
    </div>

    <div v-else-if="loading" class="space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <Skeleton v-for="i in 5" :key="i" variant="stat" />
      </div>
      <Skeleton variant="table" :lines="8" />
    </div>

    <div v-else class="space-y-4">
      <!-- Cartões: clicar recorta a tabela -->
      <StatRow :items="kpiCards" :cols="{ sm: 2, md: 3, lg: 5 }"
        selectable :active-key="recorte" @select="aoClicarKpi" />

      <!-- Linha de estado: o que está na tabela agora -->
      <div class="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <span class="tabular-nums">
          <b class="text-ink">{{ nf.format(lista.length) }}</b>
          de {{ nf.format(reservas.length) }} reserva{{ reservas.length === 1 ? '' : 's' }}
        </span>
        <span class="font-mono text-ink-subtle tabular-nums">{{ periodoLabel }}</span>
        <button v-if="recorteAtivo" type="button"
          class="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-accent-soft text-accent
                 text-micro font-medium hover:bg-accent/15 transition-colors duration-120 focus-ring"
          @click="recorte = ''">
          só {{ recorteAtivo.label }}
          <i class="fas fa-xmark text-micro"></i>
        </button>
      </div>

      <DataTable :columns="COLUNAS" :rows="inc.visiveis.value" row-key="idreserva"
        manual-sort clickable density="compact"
        v-model:sort-by="ordem.by" v-model:sort-dir="ordem.dir"
        more-label="Ver mais campos"
        empty-title="Nenhuma reserva encontrada"
        empty-text="Ajuste os filtros ou o recorte para ver resultados."
        @row-click="abrirDetalhe">

        <template #cell-titular="{ row }">
          <span class="flex items-baseline gap-2 min-w-0">
            <span :class="[bucketOf(row).text, 'shrink-0']">
              <i :class="iconForStage(etapaDe(row))" style="font-size:11px"></i>
            </span>
            <span class="font-medium text-ink truncate">{{ row.titular?.nome || '-' }}</span>
            <span class="text-micro font-mono text-ink-subtle tabular-nums shrink-0">#{{ row.idreserva }}</span>
          </span>
        </template>

        <template #cell-situacao="{ row }">
          <component :is="cvLink(row) ? 'a' : 'span'"
            :href="cvLink(row) || undefined" :target="cvLink(row) ? '_blank' : undefined"
            :rel="cvLink(row) ? 'noopener' : undefined"
            v-tippy="cvLink(row) ? 'Abrir a reserva no CV CRM' : undefined"
            class="inline-flex items-center max-w-full py-1 rounded-md focus-ring"
            @click.stop>
            <Badge :variant="stageVariant(row)" size="sm" class="max-w-full">
              <span class="truncate">{{ etapaDe(row) || '-' }}</span>
              <i v-if="cvLink(row)" class="fas fa-arrow-up-right-from-square text-micro opacity-50"></i>
            </Badge>
          </component>
          <!-- Travada para o ERP: o lote do CV roda de 5 em 5 min, então passar
               do prazo é erro, não demora. -->
          <i v-if="row.alerta_erp"
            class="fas fa-triangle-exclamation text-data-neg ml-1.5 shrink-0"
            v-tippy="alertaErpTexto(row)"></i>
        </template>

        <template #cell-status_repasse="{ row }">
          <component v-if="row.status_repasse" :is="cvRepasseLink(row) ? 'a' : 'span'"
            :href="cvRepasseLink(row) || undefined" :target="cvRepasseLink(row) ? '_blank' : undefined"
            :rel="cvRepasseLink(row) ? 'noopener' : undefined"
            v-tippy="cvRepasseLink(row) ? 'Abrir o repasse no CV CRM' : undefined"
            class="inline-flex items-center max-w-full py-1 rounded-md focus-ring"
            @click.stop>
            <Badge :variant="repasseVariant(row.status_repasse)" size="sm" class="max-w-full">
              <span class="truncate">{{ row.status_repasse }}</span>
              <i v-if="cvRepasseLink(row)" class="fas fa-arrow-up-right-from-square text-micro opacity-50"></i>
            </Badge>
          </component>
          <span v-else class="text-ink-subtle">-</span>
        </template>

        <template #cell-unidade="{ row }">
          <span class="font-mono text-xs">{{ unidadeDe(row) }}</span>
        </template>

        <template #cell-dias_em_reserva="{ row }">
          {{ Number(row.dias_em_reserva || 0).toFixed(0) }}d
        </template>

        <template #cell-data_reserva="{ row }">{{ fmtDate(row.data_reserva) }}</template>

        <template #actions="{ row }">
          <span class="inline-flex items-center gap-1">
            <IconButton icon="fas fa-list-check" size="sm" label="Contratos, histórico e leads"
              @click.stop="abrirDetalhe(row)" />
            <a v-if="cvLink(row)" :href="cvLink(row)" target="_blank" rel="noopener" @click.stop
              v-tippy="'Administrar no CV'" aria-label="Administrar no CV"
              class="h-8 w-8 grid place-items-center rounded-lg text-ink-subtle
                     hover:text-accent hover:bg-surface-sunken transition-colors duration-120 focus-ring">
              <i class="fas fa-arrow-up-right-from-square text-xs"></i>
            </a>
          </span>
        </template>
      </DataTable>

      <!-- Gatilho do scroll: mais 50 linhas quando chega perto do fim -->
      <div v-if="!inc.acabou.value" :ref="el => inc.observar(el)"
        class="py-6 flex items-center justify-center gap-2 text-micro text-ink-subtle">
        <Spinner size="sm" />
        carregando mais {{ Math.min(inc.step, inc.restantes.value) }} de {{ inc.restantes.value }} restantes
      </div>
    </div>

    <Export v-model="exportOpen" :source="lista" title="Reservas"
      initial-delimiter=";" initial-array-mode="join"
      :preselect="[
        'idreserva', 'documento', 'titular.nome',
        'empreendimento', 'etapa', 'bloco', 'unidade',
        'status_reserva', 'status_repasse', 'tipovenda',
        'vendida', 'data_reserva', 'data_contrato', 'data_venda',
        'imobiliaria.nome', 'corretor.nome', 'empresa_correspondente.nome',
        'dias_em_reserva', 'idprecadastro'
      ]" />

    <ReservaDetailModal :reserva="detailItem" :visivel="detailVisible"
      @fechar="detailVisible = false" />
  </PageContainer>
</template>
