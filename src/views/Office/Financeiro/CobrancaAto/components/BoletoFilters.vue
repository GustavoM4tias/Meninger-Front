<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBoletoStore } from '@/stores/Financeiro/BoletoCaixa/boletoStore';
import { useEnterpriseCatalog } from '@/composables/useEnterpriseCatalog';

import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import FilterBar from '@/components/UI/FilterBar.vue';
import PeriodoFilter from './PeriodoFilter.vue';
import { periodoPadrao, periodosAtivos } from './periodo';

// Emits Filtros aplicados → pai dispara fetchHistory.
const emit = defineEmits(['filter-changed']);

const store = useBoletoStore();
const route = useRoute();
const router = useRouter();
// Catálogo de empreendimentos do CV: o filtro e a URL guardam o ID; o rótulo
// é o nome ATUAL. Uma carga por sessão (cache de módulo).
const catalogo = useEnterpriseCatalog();

// Estado local (espelho do store.historyFilter pra controlar v-model). Ao
// aplicar (botão Filtrar ou input com debounce), copia pro store + emite.
const local = ref({
  status: ['success', 'error', 'processing', 'queued'], // default sem "Sem série"
  paymentStatus: [],
  forma: [],            // boleto | cartao — vazio = as duas
  empreendimento: [],
  idreserva: '',
  periodo: periodoPadrao(), // { emitidoDe, emitidoAte, pagoDe, pagoAte }
  q: '',
  cvSituacao: [], // ids de situação da RESERVA no CV
  cvRepasse: [],  // ids de situação do REPASSE no CV
});

// ── Opções dos selects ──────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'success',    label: 'Sucesso' },
  { value: 'error',      label: 'Erro' },
  { value: 'processing', label: 'Processando' },
  { value: 'queued',     label: 'Agendado' },
  { value: 'skipped',    label: 'Ignorado' },
];
const PAYMENT_OPTIONS = [
  { value: 'pending',   label: 'Pendente' },
  { value: 'paid',      label: 'Pago' },
  { value: 'cancelled', label: 'Baixado' },
  { value: 'error',     label: 'Erro verificação' },
];

const statusLabels   = STATUS_OPTIONS.map(o => o.label);
const paymentLabels  = PAYMENT_OPTIONS.map(o => o.label);

const labelToStatus  = Object.fromEntries(STATUS_OPTIONS.map(o => [o.label, o.value]));
const statusToLabel  = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o.label]));
const labelToPayment = Object.fromEntries(PAYMENT_OPTIONS.map(o => [o.label, o.value]));
const paymentToLabel = Object.fromEntries(PAYMENT_OPTIONS.map(o => [o.value, o.label]));

// Empreendimentos vêm da rota /history-facets como [{ id, nome }] (cached
// pelo store). O catálogo devolve { value: id, label: nome atual } ordenado
// por id; faceta sem id (linha antiga) vira opção pelo próprio nome.
const empreendimentosOptions = computed(() => catalogo.opcoes(store.facets?.empreendimentos || []));

// ── Etapas CV (reserva + repasse) — opções vindas dos facets, filtro por id ──
// MultiSelector trabalha com labels (nome da etapa); convertemos pra ids.
const cvSituacaoOptions = computed(() => (store.facets?.cvSituacoes || []).map(s => s.nome));
const cvRepasseOptions  = computed(() => (store.facets?.cvRepasses  || []).map(s => s.nome));
const cvSitByLabel = computed(() => Object.fromEntries((store.facets?.cvSituacoes || []).map(s => [s.nome, String(s.id)])));
const cvSitById    = computed(() => Object.fromEntries((store.facets?.cvSituacoes || []).map(s => [String(s.id), s.nome])));
const cvRepByLabel = computed(() => Object.fromEntries((store.facets?.cvRepasses  || []).map(s => [s.nome, String(s.id)])));
const cvRepById    = computed(() => Object.fromEntries((store.facets?.cvRepasses  || []).map(s => [String(s.id), s.nome])));

const selectedCvSituacaoLabels = computed({
  get: () => local.value.cvSituacao.map(v => cvSitById.value[String(v)] || String(v)),
  set: (labels) => { local.value.cvSituacao = labels.map(l => cvSitByLabel.value[l]).filter(Boolean); },
});
const selectedCvRepasseLabels = computed({
  get: () => local.value.cvRepasse.map(v => cvRepById.value[String(v)] || String(v)),
  set: (labels) => { local.value.cvRepasse = labels.map(l => cvRepByLabel.value[l]).filter(Boolean); },
});

// Forma de pagamento: as duas maneiras de cobrar o MESMO ato. Vazio = as duas.
const formaToLabel = { boleto: 'Boleto Caixa', cartao: 'Link de cartão' };
const labelToForma = Object.fromEntries(Object.entries(formaToLabel).map(([v, l]) => [l, v]));
const formaLabels = Object.values(formaToLabel);
const selectedFormaLabels = computed({
  get: () => (local.value.forma || []).map(v => formaToLabel[v] || v),
  set: (labels) => { local.value.forma = labels.map(l => labelToForma[l] || l); },
});

// V-model adaptado: MultiSelector trabalha com labels; convertemos pra valores.
const selectedStatusLabels = computed({
  get: () => local.value.status.map(v => statusToLabel[v] || v),
  set: (labels) => { local.value.status = labels.map(l => labelToStatus[l] || l); },
});
const selectedPaymentLabels = computed({
  get: () => local.value.paymentStatus.map(v => paymentToLabel[v] || v),
  set: (labels) => { local.value.paymentStatus = labels.map(l => labelToPayment[l] || l); },
});

// ── URL sync ────────────────────────────────────────────────────────────────
function syncFiltersFromUrl() {
  const q = route.query;
  if (!Object.keys(q).length) return;
  if (q.status) local.value.status = String(q.status).split(',').filter(Boolean);
  if (q.paymentStatus) local.value.paymentStatus = String(q.paymentStatus).split(',').filter(Boolean);
  if (q.forma) local.value.forma = String(q.forma).split(',').filter(Boolean);
  // A URL guarda ids. Link antigo com NOME continua abrindo: nome conhecido
  // vira o id do catálogo; desconhecido segue como texto (o back ainda aceita).
  if (q.empreendimento) local.value.empreendimento = catalogo.normalizarFiltro(String(q.empreendimento));
  if (q.idreserva) local.value.idreserva = String(q.idreserva);
  // Período: `dateField=paid_at` é o formato antigo da URL (um período só,
  // sobre a data de pagamento) - vira o período "pago".
  const p = { ...local.value.periodo };
  if (q.dateField === 'paid_at') {
    p.emitidoDe = ''; p.emitidoAte = '';
    if (q.dateFrom) p.pagoDe = String(q.dateFrom);
    if (q.dateTo) p.pagoAte = String(q.dateTo);
  } else {
    if (q.dateFrom) p.emitidoDe = String(q.dateFrom);
    if (q.dateTo) p.emitidoAte = String(q.dateTo);
  }
  if (q.paidFrom) p.pagoDe = String(q.paidFrom);
  if (q.paidTo) p.pagoAte = String(q.paidTo);
  local.value.periodo = p;
  if (q.q)        local.value.q = String(q.q);
  if (q.cvSituacao) local.value.cvSituacao = String(q.cvSituacao).split(',').filter(Boolean);
  if (q.cvRepasse)  local.value.cvRepasse = String(q.cvRepasse).split(',').filter(Boolean);
}

function syncUrlFromFilters() {
  const q = {};
  const f = local.value;
  if (f.status.length)          q.status = f.status.join(',');
  if (f.paymentStatus.length)   q.paymentStatus = f.paymentStatus.join(',');
  if (f.forma?.length)          q.forma = f.forma.join(',');
  if (f.empreendimento.length)  q.empreendimento = f.empreendimento.join(',');
  if (f.idreserva)              q.idreserva = f.idreserva;
  if (f.periodo.emitidoDe)      q.dateFrom = f.periodo.emitidoDe;
  if (f.periodo.emitidoAte)     q.dateTo = f.periodo.emitidoAte;
  if (f.periodo.pagoDe)         q.paidFrom = f.periodo.pagoDe;
  if (f.periodo.pagoAte)        q.paidTo = f.periodo.pagoAte;
  if (f.q)                      q.q = f.q;
  if (f.cvSituacao.length)      q.cvSituacao = f.cvSituacao.join(',');
  if (f.cvRepasse.length)       q.cvRepasse = f.cvRepasse.join(',');
  router.replace({ query: q }).catch(() => {});
}

// ── Apply / Clear ───────────────────────────────────────────────────────────
function applyFilters() {
  store.historyFilter = { ...local.value, periodo: { ...local.value.periodo } };
  store.historyPage = 1;
  syncUrlFromFilters();
  emit('filter-changed');
}

function clearFilters() {
  // Limpa tudo mas mantém o range padrão de 30 dias — evita "ah, sumiu tudo"
  // quando o usuário clica Limpar e nada aparece porque base é gigante.
  local.value = {
    status: ['success', 'error', 'processing', 'queued'], paymentStatus: [], forma: [], empreendimento: [],
    idreserva: '', periodo: periodoPadrao(), q: '', cvSituacao: [], cvRepasse: [],
  };
  store.historyFilter = { ...local.value, periodo: { ...local.value.periodo } };
  store.historyPage = 1;
  syncUrlFromFilters();
  emit('filter-changed');
}

// ── Indicadores ─────────────────────────────────────────────────────────────
const isActive = v => Array.isArray(v) ? v.length > 0 : (v !== '' && v != null);
const activeFiltersCount = computed(() => {
  let n = 0;
  const f = local.value;
  if (f.status.length) n++;
  if (f.paymentStatus.length) n++;
  if (f.forma?.length) n++;
  if (f.empreendimento.length) n++;
  if (f.idreserva) n++;
  n += periodosAtivos(f.periodo);
  if (f.q)         n++;
  if (f.cvSituacao.length) n++;
  if (f.cvRepasse.length)  n++;
  return n;
});

// Expand/colapse (default expandido em >= lg)

// Enter no campo de busca aplica
function onEnterApply(e) {
  if (e?.key === 'Enter') applyFilters();
}

onMounted(async () => {
  // O catálogo precisa estar carregado antes de ler a URL, senão um link
  // antigo por nome não vira id.
  await Promise.allSettled([store.fetchFacets(), catalogo.load()]);
  syncFiltersFromUrl();
  // SEMPRE aplica na primeira carga — temos default de 30 dias, então o
  // store precisa receber esses filtros pra que o /history e /history-stats
  // venham filtrados. (Antes só aplicava se viesse algo da URL.)
  applyFilters();
});
</script>

<template>
  <!-- Era a casca de filtro copiada à mão (`.filters-toolbar` + colapso +
       selo de ativos). Virou o primitivo `FilterBar`, que já traz altura fixa
       (a página não pula quando o selo aparece), começa fechada e emite
       apply/clear. Os campos continuam os mesmos. -->
  <FilterBar :active-count="activeFiltersCount" :cols="4"
    @apply="applyFilters" @clear="clearFilters">


      <!-- Período: emitido de/até E pago de/até, independentes. Era um
           período só com o botão "Emissão | Pagamento": dava para ver um OU
           outro, nunca "o que foi pago no período" junto do que foi emitido. -->
      <PeriodoFilter v-model="local.periodo" />

      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">
          <i class="fas fa-money-check-dollar text-micro mr-1 text-ink-subtle"></i>Forma de pagamento
        </label>
        <MultiSelector v-model="selectedFormaLabels"
          :options="formaLabels" placeholder="Boleto e cartão" :select-all="false" />
      </div>

      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">
          <i class="fas fa-bolt text-micro mr-1 text-ink-subtle"></i>Status da emissão
        </label>
        <MultiSelector v-model="selectedStatusLabels"
          :options="statusLabels" placeholder="Todos" :select-all="false" />
      </div>

      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">
          <i class="fas fa-coins text-micro mr-1 text-ink-subtle"></i>Status de pagamento
        </label>
        <MultiSelector v-model="selectedPaymentLabels"
          :options="paymentLabels" placeholder="Todos" :select-all="false" />
      </div>

      <div class="sm:col-span-1">
        <label class="block text-xs font-medium text-ink-muted mb-1.5">
          <i class="fas fa-city text-micro mr-1 text-ink-subtle"></i>Empreendimento(s)
        </label>
        <MultiSelector :model-value="local.empreendimento"
          @update:modelValue="v => local.empreendimento = Array.isArray(v) ? v : []"
          :options="empreendimentosOptions" placeholder="Todos os empreendimentos"
          :page-size="200" :select-all="true" />
      </div>

      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">
          <i class="fas fa-flag text-micro mr-1 text-ink-subtle"></i>Etapa CV (reserva)
        </label>
        <MultiSelector v-model="selectedCvSituacaoLabels"
          :options="cvSituacaoOptions" placeholder="Todas as etapas" :select-all="false" />
      </div>

      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">
          <i class="fas fa-building-columns text-micro mr-1 text-ink-subtle"></i>Etapa CV (repasse)
        </label>
        <MultiSelector v-model="selectedCvRepasseLabels"
          :options="cvRepasseOptions" placeholder="Todas as etapas" :select-all="false" />
      </div>

      <Input v-model="local.idreserva" type="number" label="ID Reserva" placeholder="Ex: 7460"
        @keyup="onEnterApply" />

      <Input v-model="local.q" type="text" label="Busca livre"
        placeholder="Titular, nosso número ou nº documento"
        @keyup="onEnterApply" />
  </FilterBar>
</template>
