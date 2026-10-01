<script setup>
/**
 * Aba "Tabelas" do empreendimento: o HISTÓRICO de tabelas de preço.
 *
 * O sync do CV (PriceTableSyncService) só insere e atualiza, nunca apaga, então
 * o banco guarda toda tabela que já existiu desde a primeira sincronização -
 * vigente, encerrada ou futura. Aqui a pessoa vê a linha do tempo e abre
 * qualquer uma delas com as unidades e as séries de pagamento.
 *
 * Duas telas na mesma aba: a LISTA (todas as tabelas) e o DETALHE (uma tabela
 * com as unidades). `?tabela=<id>` na URL guarda qual está aberta.
 *
 * ADIMPLÊNCIA PREMIADA (Desconto Construtora): cadastro por unidade do Office
 * (AdimplenciaModal). Por padrão os preços aqui já vêm com ela descontada; a
 * chave "Descontar adimplência" mostra o cheio do CV. Tabela encerrada usa a
 * cópia congelada quando foi lida; vigente usa o cadastro de hoje.
 */
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { getPriceTables, getPriceTable, syncPriceTables, importAdimplencia, criarBuscaAdimplencia, statusBuscaAdimplencia } from '@/utils/Building/apiBuilding';
import { CV_ORIGIN, cvExportarUnidadesUrl } from '@/utils/cvLinks';
import Modal from '@/components/UI/Modal.vue';
import AdimplenciaModal from './AdimplenciaModal.vue';

import DataTable from '@/components/UI/DataTable.vue';
import Panel from '@/components/UI/Panel.vue';
import FilterBar from '@/components/UI/FilterBar.vue';
import StatRow from '@/components/UI/StatRow.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Switch from '@/components/UI/Switch.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

const props = defineProps({
  idempreendimento: { type: Number, required: true },
  // id da tabela aberta (vem da URL); null = lista
  tabela: { type: Number, default: null },
  canSync: { type: Boolean, default: false },
  canConfigure: { type: Boolean, default: false },
});
const emit = defineEmits(['update:tabela', 'loaded']);

// ── formatadores ───────────────────────────────────────────
const fmtBRL = (v) => (Number.isFinite(Number(v)) && v !== null
  ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  : '-');
const fmtBRL2 = (v) => (Number.isFinite(Number(v)) && v !== null
  ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  : '-');
const fmtArea = (v) => (Number.isFinite(Number(v)) && v !== null
  ? `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`
  : '-');
const fmtDate = (ymd) => {
  if (!ymd) return '-';
  const [y, m, d] = String(ymd).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
const fmtDateTime = (iso) => (iso
  ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '-');
const vigencia = (t) => (t.data_vigencia_de || t.data_vigencia_ate
  ? `${fmtDate(t.data_vigencia_de)} → ${fmtDate(t.data_vigencia_ate)}`
  : 'Sem vigência');

const SITUACAO = {
  vigente:      { label: 'Vigente',      variant: 'success', dot: 'bg-data-pos' },
  futura:       { label: 'Futura',       variant: 'info',    dot: 'bg-accent' },
  encerrada:    { label: 'Encerrada',    variant: 'neutral', dot: 'bg-data-neutral' },
  sem_vigencia: { label: 'Sem vigência', variant: 'warning', dot: 'bg-data-warn' },
};
const sit = (t) => SITUACAO[t?.situacao] || SITUACAO.sem_vigencia;

// ── Adimplência premiada: descontar (padrão) ou ver o preço cheio ─
const descontar = ref(true);
const adimplenciaAberta = ref(false);
const FONTE_ADIMPL = {
  congelada: 'valor congelado quando a tabela foi lida',
  cadastro: 'cadastro vigente',
  nenhuma: 'nenhuma unidade com adimplência cadastrada',
};
const legendaAdimpl = (t) => {
  const a = t?.adimplencia;
  if (!a) return '';
  if (!a.unidades) return FONTE_ADIMPL.nenhuma;
  return `${a.unidades} unidade(s), ${fmtBRL(a.total)} · ${FONTE_ADIMPL[a.fonte] || a.fonte}${a.referencia ? ` (${fmtDate(a.referencia)})` : ''}`;
};

// ── Lista ──────────────────────────────────────────────────
const tables = ref([]);
const loading = ref(false);
const error = ref('');
const filtro = ref('todas'); // todas | vigente | encerrada | futura

const carregarLista = async () => {
  loading.value = true; error.value = '';
  try {
    tables.value = await getPriceTables(props.idempreendimento, { descontar: descontar.value });
    emit('loaded', tables.value.length);
  } catch (e) {
    error.value = e.message || 'Não foi possível carregar as tabelas.';
  } finally {
    loading.value = false;
  }
};

const contagem = computed(() => {
  const c = { todas: tables.value.length, vigente: 0, encerrada: 0, futura: 0 };
  for (const t of tables.value) if (c[t.situacao] !== undefined) c[t.situacao]++;
  return c;
});
const filtroOptions = computed(() => [
  { value: 'todas',     label: 'Todas',      count: contagem.value.todas },
  { value: 'vigente',   label: 'Vigentes',   count: contagem.value.vigente },
  { value: 'futura',    label: 'Futuras',    count: contagem.value.futura },
  { value: 'encerrada', label: 'Encerradas', count: contagem.value.encerrada },
]);
const listaFiltrada = computed(() => (filtro.value === 'todas'
  ? tables.value
  : tables.value.filter((t) => t.situacao === filtro.value)));

// Linha do tempo: da vigência mais antiga à mais nova, para dizer de quando
// até quando existe histórico.
const periodo = computed(() => {
  const des = tables.value.map((t) => t.data_vigencia_de).filter(Boolean).sort();
  const ates = tables.value.map((t) => t.data_vigencia_ate).filter(Boolean).sort();
  if (!des.length && !ates.length) return null;
  return { de: des[0] || null, ate: ates[ates.length - 1] || null };
});

// Coluna calculada precisa de `sortValue`: sem ele o DataTable ordena por
// row[key], que não existe.
const calc = (fn) => ({ value: fn, sortValue: fn });
const COLUNAS = [
  { key: 'nome',       label: 'Tabela',      priority: 1, sortable: true },
  { key: 'situacao',   label: 'Situação',    priority: 1, sortable: true, width: '120px' },
  { key: 'vigencia',   label: 'Vigência',    priority: 2, sortable: true, ...calc((t) => t.data_vigencia_de), format: (_, t) => vigencia(t), width: '190px' },
  { key: 'unidades',   label: 'Unidades',    priority: 2, numeric: true, sortable: true, ...calc((t) => t.resumo.unidades), width: '90px' },
  { key: 'disponiveis',label: 'Disponíveis', priority: 2, numeric: true, sortable: true, ...calc((t) => t.resumo.disponiveis), width: '100px' },
  { key: 'faixa',      label: 'Faixa de valor', priority: 2, numeric: true, sortable: true, ...calc((t) => t.resumo.valor_min),
    format: (_, t) => (t.resumo.valor_min == null ? '-' : `${fmtBRL(t.resumo.valor_min)} – ${fmtBRL(t.resumo.valor_max)}`), width: '210px' },
  { key: 'm2',         label: 'R$/m² médio', priority: 3, numeric: true, sortable: true, ...calc((t) => t.resumo.valor_m2_medio), format: fmtBRL, width: '120px' },
  { key: 'adimpl',     label: 'Adimpl. premiada', priority: 3, numeric: true, sortable: true, ...calc((t) => t.adimplencia?.total ?? 0),
    format: (_, t) => (t.adimplencia?.unidades ? `${fmtBRL(t.adimplencia.total)} · ${t.adimplencia.unidades} un.` : '-'), width: '170px' },
  { key: 'forma',      label: 'Forma',       priority: 3 },
  { key: 'sync',       label: 'Sincronizada', priority: 3, sortable: true, ...calc((t) => t.ultima_sincronizacao), format: fmtDateTime, width: '140px' },
];

// ── Detalhe ────────────────────────────────────────────────
const detail = ref(null);
const loadingDetail = ref(false);
const errorDetail = ref('');
const busca = ref('');
const situacaoUnidade = ref('todas');

const filtrosUnidade = computed(() => (busca.value ? 1 : 0) + (situacaoUnidade.value !== 'todas' ? 1 : 0));
const limparUnidade = () => { busca.value = ''; situacaoUnidade.value = 'todas'; };

const abrir = (t) => emit('update:tabela', t.idtabela);
const voltar = () => emit('update:tabela', null);

const carregarDetalhe = async (id) => {
  detail.value = null; errorDetail.value = '';
  if (!id) return;
  loadingDetail.value = true;
  try {
    detail.value = await getPriceTable(id, { descontar: descontar.value });
    busca.value = ''; situacaoUnidade.value = 'todas';
  } catch (e) {
    errorDetail.value = e.message || 'Não foi possível abrir a tabela.';
  } finally {
    loadingDetail.value = false;
  }
};
watch(() => props.tabela, carregarDetalhe, { immediate: true });
// Trocar a chave recarrega o que está na tela com o outro preço
watch(descontar, async () => {
  await carregarLista();
  if (props.tabela) await carregarDetalhe(props.tabela);
});
const aposGravarAdimplencia = async () => {
  await carregarLista();
  if (props.tabela) await carregarDetalhe(props.tabela);
};

const situacoesUnidade = computed(() => {
  const set = new Set((detail.value?.unidades || []).map((u) => u.situacao).filter(Boolean));
  return [{ value: 'todas', label: 'Todas as situações' }, ...[...set].sort().map((s) => ({ value: s, label: s }))];
});
const unidadesFiltradas = computed(() => {
  const q = busca.value.trim().toLowerCase();
  return (detail.value?.unidades || []).filter((u) => {
    if (situacaoUnidade.value !== 'todas' && u.situacao !== situacaoUnidade.value) return false;
    if (!q) return true;
    return [u.unidade, u.bloco, u.etapa].some((v) => (v || '').toLowerCase().includes(q));
  });
});

const kpisDetalhe = computed(() => {
  const r = detail.value?.resumo;
  if (!r) return [];
  return [
    { key: 'unid', label: 'Unidades na tabela', raw: r.unidades, icon: 'fas fa-house', tone: 'accent',
      hint: `${r.disponiveis} disponíveis` },
    { key: 'vgv', label: 'VGV da tabela', raw: r.vgv, format: fmtBRL, icon: 'fas fa-coins', tone: 'pos',
      hint: `${r.com_valor} unidade(s) com valor` },
    { key: 'faixa', label: 'Faixa de valor', value: r.valor_min == null ? '-' : `${fmtBRL(r.valor_min)} – ${fmtBRL(r.valor_max)}`,
      icon: 'fas fa-arrows-left-right', tone: 'neutral' },
    { key: 'm2', label: 'R$/m² médio', raw: r.valor_m2_medio, format: fmtBRL, icon: 'fas fa-ruler-combined', tone: 'warn',
      hint: 'ponderado pela área privativa' },
    { key: 'adimpl', label: descontar.value ? 'Adimplência descontada' : 'Adimplência (não descontada)', raw: r.adimplencia_total, format: fmtBRL, icon: 'fas fa-hand-holding-dollar', tone: r.unidades_com_adimplencia ? 'accent' : 'neutral',
      hint: r.unidades_com_adimplencia ? `${r.unidades_com_adimplencia} unidade(s) · ${FONTE_ADIMPL[detail.value.adimplencia?.fonte] || ''}` : 'nenhuma unidade com adimplência' },
  ];
});

const COLUNAS_UNIDADE = computed(() => [
  { key: 'unidade',        label: 'Unidade',   priority: 1, sortable: true },
  { key: 'valor_total',    label: descontar.value ? 'Valor' : 'Valor cheio', priority: 1, numeric: true, sortable: true, format: fmtBRL2, width: '150px' },
  { key: 'adimplencia_premiada', label: 'Adimpl. premiada', priority: 2, numeric: true, sortable: true, format: (v) => (v ? fmtBRL2(v) : '-'), width: '140px' },
  ...(descontar.value ? [{ key: 'valor_tabela', label: 'Valor cheio (CV)', priority: 3, numeric: true, sortable: true, format: fmtBRL2, width: '150px' }] : []),
  { key: 'bloco',          label: 'Bloco',     priority: 2, sortable: true, width: '140px' },
  { key: 'etapa',          label: 'Etapa',     priority: 3, sortable: true, width: '120px' },
  { key: 'area_privativa', label: 'Área',      priority: 2, numeric: true, sortable: true, format: fmtArea, width: '110px' },
  { key: 'valor_m2',       label: 'R$/m²',     priority: 2, numeric: true, sortable: true, format: fmtBRL, width: '120px' },
  { key: 'situacao',       label: 'Situação',  priority: 2, sortable: true, width: '120px' },
  { key: 'series',         label: 'Séries',    priority: 3, numeric: true, ...calc((u) => u.series.length), width: '80px' },
]);

const UNIDADE_SIT = {
  disponivel: 'success', vendida: 'danger', bloqueada: 'neutral', reservada: 'warning',
};
const unidadeVariant = (s) => {
  const k = (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return Object.entries(UNIDADE_SIT).find(([p]) => k.startsWith(p))?.[1] || 'neutral';
};

// ── Sync manual (admin) ────────────────────────────────────
const syncing = ref(false);
const syncMsg = ref(null); // { ok, text }
const sincronizar = async () => {
  syncing.value = true; syncMsg.value = null;
  try {
    const r = await syncPriceTables(props.idempreendimento);
    await carregarLista();
    if (props.tabela) await carregarDetalhe(props.tabela);
    syncMsg.value = { ok: true, text: `${r.synced ?? 0} tabela(s) lidas do CV` };
  } catch (e) {
    syncMsg.value = { ok: false, text: e.message || 'Erro ao sincronizar' };
  } finally {
    syncing.value = false;
  }
};

// ── "Atualizar do CV": adimplência premiada direto do CV ─────────────────
// O CV não dá o campo por API, o servidor não entra no CV (login com CAPTCHA)
// e o CV só entrega a exportação de unidades pedida de DENTRO dele - pedida
// pelo Office, ele redireciona sem fazer nada (medido em 01/10/2026). Então:
//   1. "Abrir o CV" abre a tela de exportação deste empreendimento numa aba;
//   2. lá a pessoa clica no favorito "Office: adimplência" (instalado uma vez),
//      que baixa a planilha com o login dela e a entrega a ESTA aba
//      (postMessage, só para a origem do Office);
//   3. esta aba confere a origem (só o CV) e grava pela importação que já
//      existe, com o login da pessoa. Nada de rota pública.
// Empreendimento grande o CV manda por e-mail em vez de entregar na hora: o
// favorito avisa e esta aba abre a busca que lê o e-mail (cron do back).
const buscaCv = ref(null);          // busca por e-mail (só quando o CV manda por e-mail)
const buscaErro = ref('');
const buscando = ref(false);
const recebido = ref(null);         // resultado da planilha que chegou pelo favorito
const escolhaAberta = ref(false);
let pollBusca = null;

const OFFICE_ORIGIN = window.location.origin;
const favoritoCodigo = `(async function(){var o=window.opener;var m=location.pathname.match(/empreendimentos\\/(\\d+)/);`
  + `if(!o||!m){alert('Abra o CV pelo botão "Atualizar do CV" do Office e clique de novo aqui.');return}`
  + `try{var r=await fetch('/'+location.pathname.split('/')[1]+'/cadastros/empreendimentos/'+m[1]+'/exportar_unidades_download',{credentials:'include'});var t=await r.text();`
  + `if(/ID Unidade/.test(t)&&/Adimpl/i.test(t)){o.postMessage({tipo:'office-adimplencia',idempreendimento:Number(m[1]),csv:t},${JSON.stringify(OFFICE_ORIGIN)});alert('Pronto: planilha enviada ao Office. Pode fechar esta aba.')}`
  + `else{o.postMessage({tipo:'office-adimplencia-email',idempreendimento:Number(m[1])},${JSON.stringify(OFFICE_ORIGIN)});alert('O CV vai mandar esta planilha por e-mail. O Office aplica sozinho quando chegar (alguns minutos). Pode fechar esta aba.')}`
  + `}catch(e){alert('Não consegui baixar a planilha do CV: '+e.message)}})()`;
const favoritoHref = 'javascript:' + encodeURIComponent(favoritoCodigo);

const pararPoll = () => { if (pollBusca) { clearInterval(pollBusca); pollBusca = null; } };
const acompanhar = (id) => {
  pararPoll();
  const ler = async () => {
    try {
      const antes = buscaCv.value?.atualizados ?? 0;
      buscaCv.value = await statusBuscaAdimplencia(id);
      if (buscaCv.value && buscaCv.value.atualizados !== antes) await aposGravarAdimplencia();
      if (buscaCv.value?.status !== 'aguardando') pararPoll();
    } catch (e) { buscaErro.value = e.message; pararPoll(); }
  };
  ler();
  pollBusca = setInterval(ler, 20000);
};

// Só mostra a busca que inclui ESTE empreendimento.
const buscaCvAqui = computed(() => {
  const b = buscaCv.value;
  if (!b) return null;
  return b.itens?.some((i) => Number(i.idempreendimento) === Number(props.idempreendimento)) ? b : null;
});

const abrirCv = () => {
  buscaErro.value = ''; recebido.value = null;
  const aba = window.open(cvExportarUnidadesUrl(props.idempreendimento), '_blank');
  if (!aba) buscaErro.value = 'O navegador bloqueou a aba do CV. Libere pop-ups para o Office e clique de novo.';
  escolhaAberta.value = false;
};

const aoReceberDoCv = async (ev) => {
  if (ev.origin !== CV_ORIGIN) return;
  const d = ev.data || {};
  if (Number(d.idempreendimento) !== Number(props.idempreendimento)) return;
  if (d.tipo === 'office-adimplencia' && typeof d.csv === 'string') {
    buscando.value = true; buscaErro.value = '';
    try {
      const r = await importAdimplencia(props.idempreendimento, { csv: d.csv, observacao: `Atualizado do CV pelo favorito em ${new Date().toLocaleDateString('pt-BR')}` });
      recebido.value = { gravadas: r.gravadas ?? 0, encerradas: r.encerradas ?? 0, com_valor: r.importacao?.com_valor ?? 0, em: new Date() };
      buscaCv.value = null; pararPoll();
      await aposGravarAdimplencia();
    } catch (e) { buscaErro.value = e.message; } finally { buscando.value = false; }
  } else if (d.tipo === 'office-adimplencia-email') {
    try { const b = await criarBuscaAdimplencia({ ids: [props.idempreendimento] }); acompanhar(b.id); }
    catch (e) { buscaErro.value = e.message; }
  }
};
window.addEventListener('message', aoReceberDoCv);
onBeforeUnmount(() => window.removeEventListener('message', aoReceberDoCv));

const resumoBusca = computed(() => {
  const hora = (d) => (d ? new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
  if (recebido.value) {
    const r = recebido.value;
    const tirados = Math.max(0, r.encerradas - r.gravadas);
    return { tom: 'text-data-pos', icone: 'fas fa-check',
      texto: `Adimplência atualizada do CV às ${hora(r.em)}: ${r.com_valor} unidade(s) com adimplência no CV; ${r.gravadas ? `${r.gravadas} com valor novo` : 'nenhum valor mudou'}${tirados ? `, ${tirados} sem adimplência agora` : ''}.` };
  }
  const b = buscaCvAqui.value;
  if (!b) return null;
  if (b.status === 'aguardando') {
    return { tom: 'text-ink-muted', icone: 'fas fa-circle-notch fa-spin',
      texto: `O CV vai mandar a planilha por e-mail; o Office aplica sozinho quando chegar (espera até ${hora(b.prazo_ate)}).` };
  }
  const falhas = b.itens.filter((i) => i.status !== 'atualizado');
  // Trocar o valor de uma unidade encerra o antigo E grava o novo: somar os
  // dois contaria a unidade duas vezes. Encerrada sem gravada = perdeu a adimplência.
  const novos = b.itens.reduce((s, i) => s + (i.gravadas || 0), 0);
  const tirados = b.itens.reduce((s, i) => s + Math.max(0, (i.encerradas || 0) - (i.gravadas || 0)), 0);
  return {
    tom: falhas.length ? 'text-data-warn' : 'text-data-pos',
    icone: falhas.length ? 'fas fa-triangle-exclamation' : 'fas fa-check',
    texto: `Busca no CV de ${hora(b.solicitado_em)}: ${b.atualizados} de ${b.total} atualizado(s); ${novos ? `${novos} unidade(s) com valor novo` : 'nenhum valor mudou'}${tirados ? `, ${tirados} sem adimplência agora` : ''}.`
      + (falhas.length ? ` Faltou: ${falhas.map((f) => `${f.nome} (${f.msg || f.status})`).join('; ')}` : ''),
  };
});

onMounted(async () => {
  await carregarLista();
  // Busca em andamento (ou das últimas horas) desta pessoa volta a aparecer.
  if (!props.canConfigure) return;
  try {
    const b = await statusBuscaAdimplencia('ultima');
    if (b && (b.status === 'aguardando' || Date.now() - new Date(b.solicitado_em).getTime() < 6 * 3600 * 1000)) {
      buscaCv.value = b;
      if (b.status === 'aguardando') acompanhar(b.id);
    }
  } catch { /* sem busca: nada a mostrar */ }
});
onBeforeUnmount(pararPoll);
</script>

<template>
  <div class="space-y-4">

    <!-- ══ DETALHE de uma tabela ═══════════════════════════════════════ -->
    <template v-if="tabela">
      <div class="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" icon="fas fa-arrow-left" @click="voltar">Todas as tabelas</Button>
        <span v-if="detail" class="text-xs text-ink-subtle font-mono ml-auto">#{{ detail.idtabela }}</span>
      </div>

      <Skeleton v-if="loadingDetail" variant="card" :lines="4" />

      <EmptyState v-else-if="errorDetail" icon="fas fa-triangle-exclamation"
        title="Não deu para abrir a tabela" :description="errorDetail">
        <template #actions><Button size="sm" @click="carregarDetalhe(tabela)">Tentar de novo</Button></template>
      </EmptyState>

      <template v-else-if="detail">
        <!-- Identidade da tabela -->
        <Panel :title="detail.nome" :subtitle="detail.forma || 'Forma de pagamento não informada'" icon="fas fa-tags">
          <template #actions>
            <div class="flex flex-wrap gap-1.5 justify-end">
              <Badge :variant="sit(detail).variant" size="sm">
                <span class="h-1.5 w-1.5 rounded-full" :class="sit(detail).dot"></span>{{ sit(detail).label }}
              </Badge>
              <Badge :variant="detail.aprovado ? 'success' : 'danger'" size="sm">{{ detail.aprovado ? 'Aprovada' : 'Pendente' }}</Badge>
              <Badge v-if="detail.tabela_minima" variant="warning" size="sm">Tabela mínima</Badge>
            </div>
          </template>
          <dl class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <div class="min-w-0">
              <dt class="text-micro text-ink-muted">Vigência</dt>
              <dd class="font-mono text-ink tabular-nums">{{ vigencia(detail) }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-micro text-ink-muted">Parcelas</dt>
              <dd class="text-ink tabular-nums">
                <template v-if="detail.quantidade_parcelas_max || detail.maximo_parcelas">até {{ detail.quantidade_parcelas_max || detail.maximo_parcelas }}</template>
                <template v-else>-</template>
                <span v-if="detail.juros_mes != null" class="text-ink-muted"> · {{ detail.juros_mes }}% a.m.</span>
              </dd>
            </div>
            <div class="min-w-0">
              <dt class="text-micro text-ink-muted">Primeira leitura</dt>
              <dd class="font-mono text-ink tabular-nums">{{ fmtDateTime(detail.primeira_sincronizacao) }}</dd>
            </div>
            <div class="min-w-0">
              <dt class="text-micro text-ink-muted">Última sincronização</dt>
              <dd class="font-mono text-ink tabular-nums">{{ fmtDateTime(detail.ultima_sincronizacao) }}</dd>
            </div>
          </dl>
        </Panel>

        <StatRow :items="kpisDetalhe" :cols="{ sm: 2, md: 3, lg: 5 }" />

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
          <Switch v-model="descontar" size="sm" label="Descontar adimplência premiada" />
          <span v-if="detail.adimplencia" class="inline-flex items-center gap-1.5">
            <i class="fas fa-hand-holding-dollar text-ink-subtle"></i>{{ legendaAdimpl(detail) }}
          </span>
          <Button v-if="canConfigure" variant="ghost" size="sm" icon="fas fa-pen" @click="adimplenciaAberta = true">Cadastrar adimplência</Button>
        </div>

        <!-- Unidades da tabela -->
        <FilterBar :active-count="filtrosUnidade" auto-apply :cols="2" @clear="limparUnidade">
          <Input v-model="busca" label="Busca" placeholder="Unidade, bloco ou etapa" iconLeft="fas fa-magnifying-glass" />
          <Select v-model="situacaoUnidade" label="Situação" :options="situacoesUnidade" />
          <template #actions>
            <Button v-if="filtrosUnidade" variant="ghost" size="sm" icon="fas fa-eraser" @click="limparUnidade">Limpar</Button>
          </template>
        </FilterBar>

        <Panel title="Unidades da tabela" icon="fas fa-house" :padded="false">
          <template #actions>
            <span class="text-xs text-ink-subtle font-mono tabular-nums">{{ unidadesFiltradas.length }} de {{ detail.unidades.length }}</span>
          </template>
          <div class="p-3 sm:p-4">
          <DataTable :columns="COLUNAS_UNIDADE" :rows="unidadesFiltradas" row-key="idunidade"
            sort-by="unidade" expandable
            empty-icon="fas fa-house" empty-title="Nenhuma unidade nesta tabela"
            empty-text="O CV não devolveu as unidades desta tabela. Sincronize de novo ou abra no CV.">
            <template #cell-valor_total="{ value, row }">
              <b class="text-ink">{{ value }}</b>
              <i v-if="descontar && row.adimplencia_premiada" class="fas fa-hand-holding-dollar ml-1 text-[10px] text-accent" v-tippy="`Já com ${fmtBRL2(row.adimplencia_premiada)} de adimplência premiada descontados`"></i>
            </template>
            <template #cell-situacao="{ row }">
              <Badge :variant="unidadeVariant(row.situacao)" size="sm">{{ row.situacao || '-' }}</Badge>
            </template>
            <template #expanded="{ row }">
              <div v-if="row.series.length" class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="text-ink-subtle">
                      <th class="text-left font-medium px-2 py-1">Série</th>
                      <th class="text-right font-medium px-2 py-1">Parcelas</th>
                      <th class="text-right font-medium px-2 py-1">Valor da parcela</th>
                      <th class="text-right font-medium px-2 py-1">Total da série</th>
                      <th class="text-left font-medium px-2 py-1">1º vencimento</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in row.series" :key="s.nome + s.data_vencimento" class="border-t border-line">
                      <td class="px-2 py-1 text-ink">{{ s.nome }}</td>
                      <td class="px-2 py-1 text-right tabular-nums">{{ s.qtd_parcelas ?? '-' }}</td>
                      <td class="px-2 py-1 text-right tabular-nums">{{ fmtBRL2(s.valor) }}</td>
                      <td class="px-2 py-1 text-right tabular-nums font-semibold text-ink">{{ fmtBRL2((s.valor || 0) * (s.qtd_parcelas || 1)) }}</td>
                      <td class="px-2 py-1 font-mono">{{ s.data_vencimento || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else class="text-xs text-ink-subtle">Sem séries de pagamento nesta unidade.</p>
            </template>
          </DataTable>
          </div>
        </Panel>
      </template>
    </template>

    <!-- ══ LISTA de todas as tabelas ═══════════════════════════════════ -->
    <template v-else>
      <Panel title="Histórico de tabelas" icon="fas fa-tags" :padded="false"
        :subtitle="periodo ? `Vigências de ${fmtDate(periodo.de)} a ${fmtDate(periodo.ate)} · tabela que saiu do CV continua aqui` : 'Toda tabela lida do CV fica guardada, vigente ou não'">
        <template #actions>
          <div class="flex flex-wrap items-center gap-2 justify-end">
            <Switch v-model="descontar" size="sm" label="Descontar adimplência" />
            <SegmentedControl v-model="filtro" :options="filtroOptions" size="sm" />
            <Button v-if="canConfigure" variant="secondary" size="sm" icon="fas fa-hand-holding-dollar" @click="adimplenciaAberta = true"
              v-tippy="'Adimplência premiada (Desconto Construtora) por unidade. O CV não manda esse campo; o cadastro é aqui e vale para as tabelas.'">
              <span class="hidden sm:inline">Adimplência premiada</span>
            </Button>
            <Button v-if="canConfigure" variant="secondary" size="sm" :loading="buscando" icon="fas fa-cloud-arrow-down"
              @click="escolhaAberta = true"
              v-tippy="'Busca a adimplência premiada no CV e atualiza aqui, sem importar arquivo.'">
              <span class="hidden sm:inline">Atualizar do CV</span>
            </Button>
            <Button v-if="canSync" variant="secondary" size="sm" :loading="syncing"
              :icon="syncMsg?.ok ? 'fas fa-check' : 'fas fa-rotate'" @click="sincronizar"
              v-tippy="'Lê agora as tabelas deste empreendimento no CV. O robô faz isso todo dia às 9h.'">
              <span class="hidden sm:inline">{{ syncing ? 'Lendo o CV...' : 'Sincronizar com o CV' }}</span>
            </Button>
          </div>
        </template>

        <div class="p-3 sm:p-4 space-y-3">
        <p v-if="resumoBusca" class="text-xs" :class="resumoBusca.tom">
          <i :class="resumoBusca.icone"></i> {{ resumoBusca.texto }}
        </p>
        <p v-if="buscaErro" class="text-xs text-data-neg"><i class="fas fa-triangle-exclamation"></i> {{ buscaErro }}</p>
        <p v-if="syncMsg" class="text-xs" :class="syncMsg.ok ? 'text-data-pos' : 'text-data-neg'">
          <i class="fas" :class="syncMsg.ok ? 'fa-check' : 'fa-triangle-exclamation'"></i> {{ syncMsg.text }}
        </p>

        <EmptyState v-if="error" icon="fas fa-triangle-exclamation" title="Não deu para listar as tabelas" :description="error">
          <template #actions><Button size="sm" @click="carregarLista">Tentar de novo</Button></template>
        </EmptyState>

        <DataTable v-else :columns="COLUNAS" :rows="listaFiltrada" row-key="idtabela" :loading="loading"
        clickable sort-by="vigencia" sort-dir="desc" density="comfortable" @row-click="abrir"
        empty-icon="fas fa-tags" empty-title="Nenhuma tabela lida do CV"
        :empty-text="canSync ? 'Sincronize para ler as tabelas deste empreendimento no CV.' : 'O robô lê o CV todo dia às 9h. Se o empreendimento tem tabela lá, ela aparece aqui depois disso.'">
        <template v-if="canSync" #emptyActions>
          <Button size="sm" icon="fas fa-rotate" :loading="syncing" @click="sincronizar">Sincronizar com o CV</Button>
        </template>
        <template #cell-nome="{ row }">
          <span class="font-medium text-ink">{{ row.nome }}</span>
          <span v-if="!row.aprovado" class="ml-1.5 text-micro text-data-neg">pendente</span>
        </template>
        <template #cell-situacao="{ row }">
          <Badge :variant="sit(row).variant" size="sm">
            <span class="h-1.5 w-1.5 rounded-full" :class="sit(row).dot"></span>{{ sit(row).label }}
          </Badge>
        </template>
        </DataTable>
        </div>

        <template #footer>Clique numa tabela para ver as unidades e as séries de pagamento. {{ descontar ? 'Preços já com a adimplência premiada descontada onde ela existe.' : 'Preços cheios, como estão no CV.' }}</template>
      </Panel>
    </template>

    <!-- Atualizar do CV: o favorito precisa rodar DENTRO do CV (ver o script). -->
    <Modal :open="escolhaAberta" size="md" title="Atualizar adimplência do CV"
      subtitle="O CV só entrega a planilha de unidades para quem pede de dentro dele. O favorito faz esse pedido com o seu login e devolve a planilha para o Office."
      @close="escolhaAberta = false">
      <ol class="space-y-4 text-sm text-ink">
        <li class="flex gap-3">
          <span class="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center">1</span>
          <div class="min-w-0">
            <p class="font-medium">Só na primeira vez: arraste este botão para a barra de favoritos</p>
            <a :href="favoritoHref" @click.prevent
              class="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-accent text-accent text-sm font-medium cursor-grab select-none">
              <i class="fas fa-bookmark"></i> Office: adimplência
            </a>
            <p class="text-micro text-ink-subtle mt-1">Barra de favoritos escondida? Ctrl+Shift+B mostra.</p>
          </div>
        </li>
        <li class="flex gap-3">
          <span class="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center">2</span>
          <div class="min-w-0">
            <p class="font-medium">Abra o CV neste empreendimento</p>
            <Button class="mt-2" variant="primary" size="sm" icon="fas fa-arrow-up-right-from-square" @click="abrirCv">Abrir o CV</Button>
          </div>
        </li>
        <li class="flex gap-3">
          <span class="flex-shrink-0 w-6 h-6 rounded-full bg-accent/15 text-accent text-xs font-bold flex items-center justify-center">3</span>
          <p class="min-w-0 font-medium">Na aba do CV, clique no favorito <strong>Office: adimplência</strong>. O Office atualiza sozinho.</p>
        </li>
      </ol>
    </Modal>

    <AdimplenciaModal :open="adimplenciaAberta" :idempreendimento="idempreendimento" :can-configure="canConfigure"
      @close="adimplenciaAberta = false" @saved="aposGravarAdimplencia" />
  </div>
</template>
