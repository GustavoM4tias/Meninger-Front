<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBoletoStore } from '@/stores/Financeiro/BoletoCaixa/boletoStore';

import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

// Emits Filtros aplicados → pai dispara fetchHistory.
const emit = defineEmits(['filter-changed']);

const store = useBoletoStore();
const route = useRoute();
const router = useRouter();

// Helper: formata Date pra ISO YYYY-MM-DD respeitando timezone local.
function toIsoDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Default = janela dos últimos 30 dias (hoje incluso).
const today = new Date();
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(today.getDate() - 30);
const DEFAULT_DATE_FROM = toIsoDateLocal(thirtyDaysAgo);
const DEFAULT_DATE_TO   = toIsoDateLocal(today);

// Estado local (espelho do store.historyFilter pra controlar v-model). Ao
// aplicar (botão Filtrar ou input com debounce), copia pro store + emite.
const local = ref({
  status: ['success', 'error', 'processing'], // default sem "Sem série"
  paymentStatus: [],
  empreendimento: [],
  idreserva: '',
  dateFrom: DEFAULT_DATE_FROM,
  dateTo: DEFAULT_DATE_TO,
  dateField: 'created_at', // 'created_at' = emissão | 'paid_at' = pagamento
  q: '',
});

// Data de referência da busca por período: emissão (created_at) ou pagamento (paid_at).
const DATE_FIELD_OPTIONS = [
  { value: 'created_at', label: 'Emissão' },
  { value: 'paid_at',    label: 'Pagamento' },
];

// ── Opções dos selects ──────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'success',    label: 'Sucesso' },
  { value: 'error',      label: 'Erro' },
  { value: 'processing', label: 'Processando' },
  { value: 'skipped',    label: 'Sem série' },
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

// Empreendimentos vem da rota /history-facets (cached pelo store)
const empreendimentosOptions = computed(() =>
  (store.facets?.empreendimentos || []).map(e => e.name)
);

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
  if (q.empreendimento) local.value.empreendimento = String(q.empreendimento).split(',').filter(Boolean);
  if (q.idreserva) local.value.idreserva = String(q.idreserva);
  if (q.dateFrom) local.value.dateFrom = String(q.dateFrom);
  if (q.dateTo)   local.value.dateTo = String(q.dateTo);
  if (q.dateField === 'paid_at') local.value.dateField = 'paid_at';
  if (q.q)        local.value.q = String(q.q);
}

function syncUrlFromFilters() {
  const q = {};
  const f = local.value;
  if (f.status.length)          q.status = f.status.join(',');
  if (f.paymentStatus.length)   q.paymentStatus = f.paymentStatus.join(',');
  if (f.empreendimento.length)  q.empreendimento = f.empreendimento.join(',');
  if (f.idreserva)              q.idreserva = f.idreserva;
  if (f.dateFrom)               q.dateFrom = f.dateFrom;
  if (f.dateTo)                 q.dateTo = f.dateTo;
  if (f.dateField === 'paid_at') q.dateField = f.dateField;
  if (f.q)                      q.q = f.q;
  router.replace({ query: q }).catch(() => {});
}

// ── Apply / Clear ───────────────────────────────────────────────────────────
function applyFilters() {
  store.historyFilter = { ...local.value };
  store.historyPage = 1;
  syncUrlFromFilters();
  emit('filter-changed');
}

function clearFilters() {
  // Limpa tudo mas mantém o range padrão de 30 dias — evita "ah, sumiu tudo"
  // quando o usuário clica Limpar e nada aparece porque base é gigante.
  local.value = {
    status: ['success', 'error', 'processing'], paymentStatus: [], empreendimento: [],
    idreserva: '', dateFrom: DEFAULT_DATE_FROM, dateTo: DEFAULT_DATE_TO,
    dateField: 'created_at', q: '',
  };
  store.historyFilter = { ...local.value };
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
  if (f.empreendimento.length) n++;
  if (f.idreserva) n++;
  if (f.dateFrom)  n++;
  if (f.dateTo)    n++;
  if (f.q)         n++;
  return n;
});

// Expand/colapse (default expandido em >= lg)
const isExpanded = ref(typeof window !== 'undefined' && window.innerWidth >= 1024);
function toggle() { isExpanded.value = !isExpanded.value; }

// Enter no campo de busca aplica
function onEnterApply(e) {
  if (e?.key === 'Enter') applyFilters();
}

onMounted(async () => {
  await store.fetchFacets();
  syncFiltersFromUrl();
  // SEMPRE aplica na primeira carga — temos default de 30 dias, então o
  // store precisa receber esses filtros pra que o /history e /history-stats
  // venham filtrados. (Antes só aplicava se viesse algo da URL.)
  applyFilters();
});
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
    <!-- Toolbar -->
    <div class="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-line bg-surface-sunken/40 rounded-t-xl">
      <button @click="toggle"
        class="flex items-center gap-2 text-sm font-medium text-ink hover:text-accent transition-colors">
        <i class="fas fa-filter text-xs text-ink-muted"></i>
        <span>Filtros</span>
        <Badge v-if="activeFiltersCount" variant="accent" size="sm">
          {{ activeFiltersCount }} ativo{{ activeFiltersCount > 1 ? 's' : '' }}
        </Badge>
        <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"></i>
      </button>

      <div class="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="clearFilters">
          <span class="hidden sm:inline">Limpar</span>
        </Button>
        <Button size="sm" icon="fas fa-magnifying-glass" @click="applyFilters">
          <span class="hidden sm:inline">Filtrar</span>
        </Button>
      </div>
    </div>

    <!-- Campos -->
    <div v-show="isExpanded"
      class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in"
      style="overflow:visible">

      <!-- Data de referência: emissão ou pagamento -->
      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-calendar-day text-[10px] mr-1 text-ink-subtle"></i>Buscar por data de
        </label>
        <div class="inline-flex rounded-lg border border-line bg-surface-sunken p-0.5 w-full">
          <button v-for="opt in DATE_FIELD_OPTIONS" :key="opt.value" type="button"
            @click="local.dateField = opt.value"
            class="flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            :class="local.dateField === opt.value
              ? 'bg-accent text-white shadow-sm'
              : 'text-ink-muted hover:text-ink'">
            {{ opt.label }}
          </button>
        </div>
      </div>

      <Input v-model="local.dateFrom" type="date"
        :label="local.dateField === 'paid_at' ? 'Pago a partir de' : 'Emitido a partir de'" />
      <Input v-model="local.dateTo" type="date"
        :label="local.dateField === 'paid_at' ? 'Pago até' : 'Emitido até'" />

      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-bolt text-[10px] mr-1 text-ink-subtle"></i>Status da emissão
        </label>
        <MultiSelector v-model="selectedStatusLabels"
          :options="statusLabels" placeholder="Todos" :select-all="false" />
      </div>

      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-coins text-[10px] mr-1 text-ink-subtle"></i>Status de pagamento
        </label>
        <MultiSelector v-model="selectedPaymentLabels"
          :options="paymentLabels" placeholder="Todos" :select-all="false" />
      </div>

      <div class="sm:col-span-1">
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>Empreendimento(s)
        </label>
        <MultiSelector :model-value="local.empreendimento"
          @update:modelValue="v => local.empreendimento = Array.isArray(v) ? v : []"
          :options="empreendimentosOptions" placeholder="Todos os empreendimentos"
          :page-size="200" :select-all="true" />
      </div>

      <Input v-model="local.idreserva" type="number" label="ID Reserva" placeholder="Ex: 7460"
        @keyup="onEnterApply" />

      <Input v-model="local.q" type="text" label="Busca livre"
        placeholder="Titular, nosso número ou nº documento"
        @keyup="onEnterApply" />
    </div>
  </section>
</template>
