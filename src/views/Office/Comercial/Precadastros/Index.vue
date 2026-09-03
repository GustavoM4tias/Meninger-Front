<script setup>
/**
 * Pré-Cadastros — análise de crédito do funil comercial.
 *
 * A tela É a listagem. Antes havia dois lugares para o mesmo assunto: uma
 * página com resumo, rankings e gráficos, e um modal com a lista e os cartões.
 * O modal respondia melhor - e ter dois desenhos do mesmo dado é justamente o
 * problema que este trabalho veio resolver. Então a página virou o que
 * funcionava:
 *
 *   filtros    fechados, com selo de quantos estão ativos
 *   KPIs       cinco números com série e variação; CLICAR NELES recorta a lista
 *   tabela     ordenável, truncada, com o registro inteiro a um clique
 *
 * Rankings, funil e gráficos saíram. O que eles mostravam - composição por
 * empreendimento, por correspondente, por etapa - a tabela mostra ordenando a
 * coluna, sem exigir uma segunda leitura da mesma informação.
 */
import { onMounted, ref, toRef, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePrecadastrosStore } from '@/stores/Comercial/Precadastros/precadastrosStore';

import Favorite from '@/components/config/Favorite.vue';
import Export from '@/components/config/Export.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Spinner from '@/components/UI/Spinner.vue';

import FiltersBar from './components/FiltersBar.vue';
import PrecadastroDetailModal from './components/PrecadastroDetailModal.vue';
import { iconForStage, bucketOf } from './stages.js';
import { useIncrementalList } from '@/composables/useIncrementalList';

// `embedded` = renderizada como guia do Relatório Comercial: esconde só o
// cabeçalho próprio, que a casca já traz. Nenhuma regra muda.
defineProps({ embedded: { type: Boolean, default: false } });

const store = usePrecadastrosStore();
const route = useRoute();
const router = useRouter();

const precadastros = toRef(store, 'precadastros');
const periodo = toRef(store, 'periodo');
const error = toRef(store, 'error');
const filtros = toRef(store, 'filtros');

/* A store sobrevive a troca de guia; a tela nao. Um erro da visita anterior
   pintaria a faixa vermelha por um quadro antes de a busca nova apaga-lo. */
error.value = null;

/* ── Filtros do servidor (URL + API) ─────────────────────────────────────── */
const ARRAY_FIELDS = ['empresa', 'empreendimento', 'situacao_nome', 'imobiliaria', 'corretor', 'correspondente', 'empresa_correspondente', 'intencao_compra', 'lead_origem'];
const STR_FIELDS = ['nome', 'documento', 'data_inicio', 'data_fim'];
const BOOL_FIELDS = ['only_active', 'with_lead', 'excluir_painel'];

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
  if (!Object.keys(q).length && !Object.keys(route.query).length) return;
  router.replace({ query: q });
}

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
  try { await store.fetchPrecadastros(true); }
  finally { loading.value = false; }
}

/* ── Recorte pelo KPI ─────────────────────────────────────────────────────
   Clicar num cartão recorta a TABELA, não os cartões: se o número do cartão
   também mudasse, clicar em "Aprovação" levaria a 100% e a leitura perderia o
   sentido. Os cartões descrevem o período; a tabela mostra o recorte. */
const recorte = ref('');

const RECORTES = {
  tempo: { label: 'finalizadas', teste: (p) => !!(p.data_fim || p.data_cancelamento) },
  aprov: { label: 'aprovadas ou em reserva', teste: (p) => ['aprovado', 'reserva'].includes(bucketOf(p.situacao_nome).key) },
  reserva: { label: 'em reserva', teste: (p) => bucketOf(p.situacao_nome).key === 'reserva' },
  reprov: { label: 'reprovadas', teste: (p) => bucketOf(p.situacao_nome).key === 'reprovado' },
};

function aoClicarKpi(item) {
  /* Clicar no cartão já ativo desliga o recorte: o mesmo gesto liga e desliga,
     como nos outros filtros do sistema. "Total" sempre volta ao conjunto todo. */
  recorte.value = (item.key === 'total' || recorte.value === item.key) ? '' : item.key;
}

const recorteAtivo = computed(() => RECORTES[recorte.value] || null);

const lista = computed(() => (recorteAtivo.value
  ? precadastros.value.filter(recorteAtivo.value.teste)
  : precadastros.value));

function limpar() {
  Object.assign(filtros.value, {
    nome: '', documento: '',
    empresa: [], empreendimento: [], situacao_nome: [],
    imobiliaria: [], corretor: [], correspondente: [], empresa_correspondente: [],
    intencao_compra: [], lead_origem: [],
    only_active: false, with_lead: false, excluir_painel: false,
    data_inicio: '', data_fim: '',
  });
  recorte.value = '';
  router.replace({ query: {} });
  buscar();
}

/* ── KPIs ─────────────────────────────────────────────────────────────────
   Sobre o período inteiro, nunca sobre o recorte. */
const kpis = computed(() => {
  const l = precadastros.value;
  let aprovSemReserva = 0, reprov = 0, reserva = 0, emAnalise = 0, somaDias = 0, qtdFin = 0;
  for (const p of l) {
    const b = bucketOf(p.situacao_nome).key;
    if (b === 'aprovado') aprovSemReserva++;
    if (b === 'reprovado') reprov++;
    if (b === 'reserva') reserva++;
    if (!p.data_fim && !p.data_cancelamento) emAnalise++;
    else {
      const d = Number(p.dias_em_analise);
      if (Number.isFinite(d)) { somaDias += d; qtdFin++; }
    }
  }
  const aprov = aprovSemReserva + reserva;
  const total = l.length;
  return {
    total, emAnalise, aprov, reprov, reserva, totalFin: qtdFin,
    pctAprov: total ? aprov / total : 0,
    pctConversao: total ? reserva / total : 0,
    pctReprov: total ? reprov / total : 0,
    tempoMedioFin: qtdFin ? somaDias / qtdFin : 0,
  };
});

/* ── Série e variação dos cartões ─────────────────────────────────────────
   A variação compara a segunda metade do período com a primeira. Não existe
   "período anterior" aqui: o filtro define um recorte de datas, e comparar com
   um mês que ninguém pediu seria inventar contexto. */
const NUM_BALDES = 12;

const serieDoPeriodo = computed(() => {
  const l = precadastros.value.filter((p) => p.data_cad);
  if (l.length < 2) return [];
  const tempos = l.map((p) => new Date(p.data_cad).getTime()).filter(Number.isFinite);
  if (!tempos.length) return [];
  const ini = Math.min(...tempos), fim = Math.max(...tempos);
  const span = Math.max(1, fim - ini);

  const baldes = Array.from({ length: NUM_BALDES }, () => ({
    total: 0, aprov: 0, reserva: 0, reprov: 0, fin: 0, somaDias: 0,
  }));
  for (const p of l) {
    const t = new Date(p.data_cad).getTime();
    if (!Number.isFinite(t)) continue;
    const b = baldes[Math.min(NUM_BALDES - 1, Math.floor(((t - ini) / span) * NUM_BALDES))];
    b.total++;
    const bk = bucketOf(p.situacao_nome).key;
    if (bk === 'reserva') b.reserva++;
    else if (bk === 'aprovado') b.aprov++;
    else if (bk === 'reprovado') b.reprov++;
    if (p.data_fim || p.data_cancelamento) {
      const d = Number(p.dias_em_analise);
      if (Number.isFinite(d)) { b.fin++; b.somaDias += d; }
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
  const sAprov = serieDe((b) => pctBalde(b, 'aprov') + pctBalde(b, 'reserva'));
  const sReserva = serieDe((b) => pctBalde(b, 'reserva'));
  const sReprov = serieDe((b) => pctBalde(b, 'reprov'));

  return [
    { key: 'total', label: 'Total no período', raw: k.total, hint: `em análise: ${k.emAnalise}`,
      icon: 'fas fa-id-card-clip', tone: 'accent', series: sTotal, sparkMode: 'line',
      delta: variacao(sTotal), tooltip: 'Clique para ver todas as pastas' },
    { key: 'tempo', label: 'Tempo até finalizar', raw: k.tempoMedioFin, format: fmtDias1, decimals: 1,
      hint: `${k.totalFin} finalizadas`, icon: 'fas fa-stopwatch', tone: 2, series: sTempo,
      sparkMode: 'line', delta: variacao(sTempo, { maiorEhMelhor: false }),
      tooltip: 'Clique para ver só as pastas já finalizadas' },
    { key: 'aprov', label: 'Aprovação', raw: k.pctAprov * 100, format: fmtPct1, decimals: 1,
      hint: `${k.aprov} de ${k.total}`, icon: 'fas fa-check-double', tone: 'pos', series: sAprov,
      sparkMode: 'line', delta: variacao(sAprov), tooltip: 'Clique para ver só as aprovadas' },
    { key: 'reserva', label: 'Conversão em reserva', raw: k.pctConversao * 100, format: fmtPct1, decimals: 1,
      hint: `${k.reserva} de ${k.total}`, icon: 'fas fa-bookmark', tone: 3, series: sReserva,
      sparkMode: 'line', delta: variacao(sReserva), tooltip: 'Clique para ver só as que viraram reserva' },
    { key: 'reprov', label: 'Reprovação', raw: k.pctReprov * 100, format: fmtPct1, decimals: 1,
      hint: `${k.reprov} de ${k.total}`, icon: 'fas fa-circle-xmark', tone: 'neg', series: sReprov,
      sparkMode: 'line', delta: variacao(sReprov, { maiorEhMelhor: false }),
      tooltip: 'Clique para ver só as reprovadas' },
  ];
});

/* ── Tabela ───────────────────────────────────────────────────────────────
   Ordenar aqui, não na tabela: ela recebe a lista já fatiada pelo scroll, e
   ordenar 50 de mil é pior que não ordenar. Ordem: filtrar, ordenar, fatiar. */
const ordem = ref({ by: 'data_cad', dir: 'desc' });

const COLUNAS = [
  { key: 'nome_cliente', label: 'Cliente', priority: 1, sortable: true },
  { key: 'situacao_nome', label: 'Etapa', priority: 1, sortable: true, width: '13rem' },
  { key: 'empreendimento', label: 'Empreendimento', priority: 2, sortable: true,
    value: (p) => p.empreendimento?.nome || '-' },
  { key: 'correspondente', label: 'Correspondente', priority: 2, sortable: true,
    value: (p) => p.empresa_correspondente?.nome || '-' },
  { key: 'valor_aprovado', label: 'Aprovado', priority: 2, numeric: true, sortable: true, width: '8rem' },
  { key: 'dias_em_analise', label: 'Dias', priority: 2, numeric: true, sortable: true, width: '4.5rem' },
  { key: 'data_cad', label: 'Cadastro', priority: 3, sortable: true, width: '7rem' },
];

const ordenada = computed(() => {
  const { by, dir } = ordem.value;
  if (!by) return lista.value;
  const col = COLUNAS.find((c) => c.key === by);
  const mul = dir === 'asc' ? 1 : -1;
  const valor = (p) => (col?.value ? col.value(p) : p[by]);
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
const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-';
};
const fmtDate = (d) => { if (!d) return '-'; const dt = new Date(d); return isNaN(dt) ? '-' : dt.toLocaleDateString('pt-BR'); };

const stageVariant = (s) => {
  const k = bucketOf(s).key;
  if (k === 'aprovado') return 'success';
  if (k === 'reserva') return 'info';
  if (k === 'reprovado') return 'danger';
  if (k === 'documentacao') return 'warning';
  if (k === 'em_analise') return 'accent';
  return 'neutral';
};

function abrirDetalhe(p) { detailItem.value = p; detailVisible.value = true; }

const periodoLabel = computed(() => {
  const d = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '-');
  return `${d(periodo.value?.data_inicio)} → ${d(periodo.value?.data_fim)}`;
});

/* Quem manda na primeira busca: a URL, quando traz filtro (link compartilhado,
   Eme, favorito); senão o filtro que ficou na store da visita anterior. Nos
   dois casos a URL passa a dizer o que está valendo - antes, voltar para a
   guia aplicava o filtro antigo com o endereço em branco, e o link copiado
   dali abria a tela sem filtro nenhum. */
onMounted(async () => {
  if (Object.keys(route.query).length) syncFiltersFromUrl();
  else syncUrlFromFilters();
  loading.value = true;
  try { await store.fetchPrecadastros(true); }
  finally { loading.value = false; }
});
</script>

<template>
  <PageContainer size="full" :class="embedded && '!pt-0'">

    <PageHeader v-if="!embedded" title="Pré-Cadastros"
      subtitle="Análise de crédito do funil comercial: em que fase está cada pasta, quanto tempo leva e quem aprova."
      icon="fas fa-id-card-clip">
      <template #title>
        <span>Pré-Cadastros</span>
        <Favorite :router="'/comercial/relatorios/precadastros'" :section="'Pré-Cadastros'" />
      </template>
    </PageHeader>
    <!-- As ações da tela sobem para o cabeçalho do Relatório Comercial em vez
         de abrirem uma faixa só delas: a faixa custava a altura de uma linha
         inteira para dois botões à direita, e ainda punha um segundo "Como
         usar" logo abaixo do da casca. `disabled` faz o Teleport render no
         lugar quando a tela roda fora da casca. -->
    <Teleport to="#relatorio-acoes" :disabled="!embedded">
      <div :class="embedded ? 'flex items-center gap-1.5' : 'mb-4 flex items-center justify-end gap-2'">
        <Button size="sm" variant="secondary" icon="fas fa-download"
          :disabled="!lista.length" @click="exportOpen = true">
          <span class="hidden sm:inline">Exportar</span>
        </Button>
        <PageHelp
          storage-key="precadastros"
          title="Como usar Pré-Cadastros"
          intro="Esta tela lista as pastas de análise de crédito do período e resume, no topo, como elas estão indo: quantas entraram, quanto tempo levam para sair e quanto se aprova."
          :steps="[
            { title: 'Escolha o período', text: 'Abra Filtros, defina as datas e o que mais quiser (empreendimento, etapa, correspondente) e clique em Buscar. A barra fica fechada para os números aparecerem primeiro.' },
            { title: 'Leia os cinco cartões', text: 'Cada um traz o número, a linha de como ele variou dentro do período e um selo comparando a segunda metade do período com a primeira.' },
            { title: 'Clique num cartão para recortar', text: 'Clicar em Aprovação deixa na tabela só as pastas aprovadas; em Reprovação, só as reprovadas. Clicar de novo no mesmo cartão desfaz o recorte.' },
            { title: 'Ordene a tabela', text: 'Clique no título de uma coluna para ordenar por ela. É assim que se vê quem tem mais pastas, quem demora mais ou quem aprova mais.' },
            { title: 'Abra a pasta', text: 'Clique na linha para ver o registro inteiro, com histórico e leads. O botão ao lado leva direto ao CV.' },
          ]"
          :tips="[
            'A cor da etapa é a mesma em toda a tela e na resposta da Eme: violeta é em análise, âmbar é documentação, verde é aprovado, turquesa é em reserva e vermelho é reprovado ou cancelado.',
            'A tabela carrega de 50 em 50 conforme você rola, então não há página para caçar.',
            'Os filtros ficam gravados no endereço da página: dá para salvar o link ou mandar para alguém já filtrado.',
          ]"
        />
      </div>
    </Teleport>

    <div class="mb-4">
      <FiltersBar v-model:filtros="filtros"
        :enterprises-options="store.empreendimentosOptions"
        :situacoes-options="store.situacoesOptions"
        :imobiliarias-options="store.imobiliariasOptions"
        :corretores-options="store.corretoresOptions"
        :correspondentes-options="store.correspondentesOptions"
        :empresas-correspondentes-options="store.empresasCorrespondentesOptions"
        :lead-origens-options="store.leadOrigensOptions"
        @buscar="buscar" @limpar="limpar" />
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
          de {{ nf.format(precadastros.length) }} pasta{{ precadastros.length === 1 ? '' : 's' }}
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

      <DataTable :columns="COLUNAS" :rows="inc.visiveis.value" row-key="idprecadastro"
        manual-sort clickable density="compact"
        v-model:sort-by="ordem.by" v-model:sort-dir="ordem.dir"
        more-label="Ver mais campos"
        empty-title="Nenhum pré-cadastro encontrado"
        empty-text="Ajuste os filtros ou o recorte para ver resultados."
        @row-click="abrirDetalhe">

        <template #cell-nome_cliente="{ row }">
          <span class="flex items-baseline gap-2 min-w-0">
            <span :class="[bucketOf(row.situacao_nome).text, 'shrink-0']">
              <i :class="iconForStage(row.situacao_nome)" style="font-size:11px"></i>
            </span>
            <span class="font-medium text-ink truncate">{{ row.nome_cliente || row.cliente?.nome || '-' }}</span>
            <span class="text-micro font-mono text-ink-subtle tabular-nums shrink-0">#{{ row.idprecadastro }}</span>
          </span>
        </template>

        <template #cell-situacao_nome="{ row }">
          <Badge :variant="stageVariant(row.situacao_nome)" size="sm" class="max-w-full">
            <span class="truncate">{{ row.situacao_nome || '-' }}</span>
          </Badge>
        </template>

        <template #cell-valor_aprovado="{ row }">
          <span class="metric text-sm">{{ fmtMoney(row.valor_aprovado) }}</span>
        </template>

        <template #cell-dias_em_analise="{ row }">
          {{ Number(row.dias_em_analise || 0).toFixed(0) }}d
        </template>

        <template #cell-data_cad="{ row }">{{ fmtDate(row.data_cad) }}</template>

        <template #actions="{ row }">
          <span class="inline-flex items-center gap-1">
            <IconButton icon="fas fa-list-check" size="sm" label="Histórico e leads"
              @click.stop="abrirDetalhe(row)" />
            <a v-if="row.link" :href="row.link" target="_blank" rel="noopener" @click.stop
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

    <Export v-model="exportOpen" :source="lista" title="Pré-Cadastros"
      initial-delimiter=";" initial-array-mode="join"
      :preselect="[
        'idprecadastro', 'codigointerno',
        'nome_cliente', 'documento', 'email_cliente',
        'empreendimento.nome', 'unidade.nome',
        'imobiliaria.nome', 'corretor.nome',
        'empresa_correspondente.nome', 'correspondente.nome',
        'situacao_nome', 'data_cad', 'data_fim', 'dias_em_analise',
        'valor_avaliacao', 'valor_aprovado', 'valor_total', 'valor_fgts', 'valor_subsidio',
        'renda_total', 'link'
      ]" />

    <PrecadastroDetailModal :precadastro="detailItem" :visivel="detailVisible"
      @fechar="detailVisible = false" />
  </PageContainer>
</template>
