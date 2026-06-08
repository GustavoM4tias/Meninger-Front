<script setup>
import { computed, ref, watch } from 'vue';
import Export from '@/components/config/Export.vue';
import ChartActions from '@/components/config/ChartActions.vue';

import Modal from '@/components/UI/Modal.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

import LeadDetailModal from './LeadDetailModal.vue';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { FunnelChart, PieChart, BarChart } from 'echarts/charts';
import {
  TooltipComponent, LegendComponent, GridComponent,
  DataZoomComponent, TitleComponent, ToolboxComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([
  FunnelChart, PieChart, BarChart, TooltipComponent, LegendComponent,
  GridComponent, DataZoomComponent, TitleComponent, ToolboxComponent, CanvasRenderer,
]);

const props = defineProps({
  leads: { type: Array, required: true },
  visivel: { type: Boolean, required: true },
  initialMode: { type: String, default: 'list' },
});

const emit = defineEmits(['fechar', 'buscar', 'limpar']);

// ── Tema / paletas ───────────────────────────────────
const isDark = computed(() => document.documentElement.classList.contains('dark'));
const txt = computed(() => isDark.value ? '#E5E7EB' : '#374151');
const sub = computed(() => isDark.value ? '#9CA3AF' : '#6B7280');
const gridLine = computed(() => isDark.value ? '#374151' : '#E5E7EB');
const palette = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'];

// ── State ────────────────────────────────────────────
const normalizeMode = (m) => (['list', 'funnel', 'stacked', 'pie'].includes(m) ? m : 'list');
const viewMode = ref(normalizeMode(props.initialMode));
const groupBy = ref('date');
const exportOpen = ref(false);
const filtersOpen = ref(false);
const chartRef = ref(null);

// Lead detail
const selectedLead = ref(null);
const detailVisible = ref(false);
const openDetail = (lead) => { selectedLead.value = lead; detailVisible.value = true; };
const closeDetail = () => { detailVisible.value = false; };

const viewOptions = [
  { value: 'list',    label: 'Listagem', icon: 'fas fa-list' },
  { value: 'funnel',  label: 'Funil',    icon: 'fas fa-filter' },
  { value: 'stacked', label: 'Barras',   icon: 'fas fa-chart-column' },
  { value: 'pie',     label: 'Pizza',    icon: 'fas fa-chart-pie' },
];

const groupOptions = [
  { value: 'date',       label: 'Data',          icon: 'far fa-calendar' },
  { value: 'enterprise', label: 'Empreendimento', icon: 'fas fa-city' },
];

watch(() => props.initialMode, (m) => { viewMode.value = normalizeMode(m); });

watch(() => props.visivel, (v) => {
  if (v) {
    viewMode.value = normalizeMode(props.initialMode);
    draftEnterprise.value = new Set(filtroEnterprise.value);
    draftBroker.value     = new Set(filtroBroker.value);
    draftAgent.value      = new Set(filtroAgent.value);
    draftStatus.value     = new Set(filtroStatus.value);
  }
});

// ── Formatters ───────────────────────────────────────
const formatDateHour = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('pt-BR'); } catch { return String(d); }
};

const dateKey = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

const statusVariant = (status) => ({
  'Aguardando Atendimento Corretor': 'warning',
  'Em Atendimento': 'accent',
  'Lead Qualificado': 'success',
  'Em Negociação': 'warning',
  'Em Análise de Crédito': 'accent',
  'Com Reserva': 'warning',
  'Venda Realizada': 'success',
  'Descartado': 'danger',
  'Novo Lead': 'info',
  '1ª Tentativa de Contato': 'info',
  'Atendimento Externo': 'accent',
}[status] || 'neutral');

// ── Helpers ──────────────────────────────────────────
const normalizeOpt = (v) => {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  const candidate = v.value ?? v.label ?? v.nome ?? v.name;
  return candidate != null ? String(candidate).trim() : String(v).trim();
};
const setSet = (bagRef, arr) => { bagRef.value = new Set((Array.isArray(arr) ? arr : []).map(normalizeOpt)); };

const cancelReasonOf = (l) => {
  if (!l?.motivo_cancelamento) return null;
  const sub = l.submotivo_cancelamento ? ` — ${l.submotivo_cancelamento}` : '';
  return l.motivo_cancelamento + sub;
};

const annotationOf = (l) => {
  const i = l?.interacao;
  if (!i) return null;
  if (Array.isArray(i)) return i.length ? (i[i.length - 1]?.descricao || null) : null;
  return i.anotacao || i.descricao || null;
};

const brokerOf = (l) => {
  const raw = l?.corretor?.imobiliaria?.nome
    || l?.imobiliaria?.nome || l?.imobiliaria?.nomefantasia
    || l?.imobiliaria?.razaosocial || l?.imobiliaria?.email || l?.imobiliaria?.cnpj;
  return raw ? String(raw).trim() : 'Não informado';
};

// ── Filtros (aplicados + drafts) ─────────────────────
const filtroStatus = ref(new Set());
const filtroEnterprise = ref(new Set());
const filtroBroker = ref(new Set());
const filtroAgent = ref(new Set());

const draftStatus = ref(new Set());
const draftEnterprise = ref(new Set());
const draftBroker = ref(new Set());
const draftAgent = ref(new Set());

const draftEnterpriseArr = computed({
  get: () => Array.from(draftEnterprise.value),
  set: (v) => setSet(draftEnterprise, v),
});
const draftBrokerArr = computed({
  get: () => Array.from(draftBroker.value),
  set: (v) => setSet(draftBroker, v),
});
const draftAgentArr = computed({
  get: () => Array.from(draftAgent.value),
  set: (v) => setSet(draftAgent, v),
});
const draftStatusArr = computed({
  get: () => Array.from(draftStatus.value),
  set: (v) => setSet(draftStatus, v),
});

const statusOptions = computed(() => {
  const s = new Set((props.leads || []).map(l => (l.situacao_nome || 'Sem Situação')).map(normalizeOpt));
  return Array.from(s).sort((a, b) => a.localeCompare(b, 'pt-BR'));
});
const enterpriseOptions = computed(() => {
  const set = new Set();
  for (const l of props.leads || []) {
    const arr = Array.isArray(l.empreendimento) ? l.empreendimento : [];
    if (arr.length) arr.forEach(e => e?.nome && set.add(normalizeOpt(e.nome)));
    else set.add('Sem Empreendimento');
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
});
const brokerOptions = computed(() => {
  const set = new Set();
  for (const l of props.leads || []) set.add(normalizeOpt(brokerOf(l)));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
});
const agentOptions = computed(() => {
  const set = new Set();
  for (const l of props.leads || []) set.add(normalizeOpt(l?.corretor?.nome || 'Sem Corretor'));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
});

const activeFiltersCount = computed(() =>
  filtroStatus.value.size + filtroEnterprise.value.size + filtroBroker.value.size + filtroAgent.value.size
);

const clearAllFilters = () => {
  filtroStatus.value = new Set();
  filtroEnterprise.value = new Set();
  filtroBroker.value = new Set();
  filtroAgent.value = new Set();
  draftStatus.value = new Set();
  draftEnterprise.value = new Set();
  draftBroker.value = new Set();
  draftAgent.value = new Set();
};

// ── Aplicação ────────────────────────────────────────
const leadsFiltrados = computed(() => {
  return (props.leads || []).filter(l => {
    if (filtroStatus.value.size && !filtroStatus.value.has(l.situacao_nome || 'Sem Situação')) return false;
    if (filtroEnterprise.value.size) {
      const arr = Array.isArray(l.empreendimento) ? l.empreendimento : [];
      const names = arr.length ? arr.map(e => e?.nome?.trim() || 'Sem Empreendimento') : ['Sem Empreendimento'];
      if (!names.some(n => filtroEnterprise.value.has(n))) return false;
    }
    if (filtroBroker.value.size && !filtroBroker.value.has(brokerOf(l))) return false;
    if (filtroAgent.value.size && !filtroAgent.value.has(l?.corretor?.nome || 'Sem Corretor')) return false;
    return true;
  });
});

const periodoTexto = computed(() => {
  if (!props.leads.length) return '—';
  const arr = props.leads.map(l => new Date(l.data_cad)).filter(d => !isNaN(d)).sort((a, b) => a - b);
  if (!arr.length) return '—';
  const ini = arr[0].toLocaleDateString('pt-BR');
  const fim = arr[arr.length - 1].toLocaleDateString('pt-BR');
  return ini === fim ? ini : `${ini} - ${fim}`;
});

// ── Charts ───────────────────────────────────────────
const countsByStatus = computed(() => {
  const m = new Map();
  for (const l of leadsFiltrados.value) {
    const s = (l.situacao_nome || 'Sem Situação').trim();
    m.set(s, (m.get(s) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
});

const allDatesSorted = computed(() => {
  const set = new Set();
  for (const l of leadsFiltrados.value) set.add(dateKey(l.data_cad));
  return Array.from(set).sort();
});

const allEnterprisesSorted = computed(() => {
  const set = new Set();
  for (const l of leadsFiltrados.value) {
    const arr = Array.isArray(l.empreendimento) ? l.empreendimento : [];
    if (arr.length) arr.forEach(e => e?.nome && set.add(String(e.nome).trim()));
    else set.add('Sem Empreendimento');
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
});

const statusesSorted = computed(() => countsByStatus.value.map(([s]) => s));

const makeStackedSeries = (xKeys, xExtractor) => {
  const map = new Map();
  for (const l of leadsFiltrados.value) {
    const x = xExtractor(l);
    const s = (l.situacao_nome || 'Sem Situação').trim();
    const m = map.get(x) || new Map();
    m.set(s, (m.get(s) || 0) + 1);
    map.set(x, m);
  }
  return statusesSorted.value.map((status, i) => ({
    name: status, type: 'bar', stack: 'total',
    emphasis: { focus: 'series' },
    data: xKeys.map(x => (map.get(x)?.get(status) || 0)),
    itemStyle: { color: palette[i % palette.length] },
    label: { show: false },
  }));
};

const pieLevel = computed(() => {
  const enterprises = allEnterprisesSorted.value;
  if (enterprises.length > 1) return 'enterprise';
  const brokers = new Set(leadsFiltrados.value.map(brokerOf)).size;
  if (enterprises.length === 1 && brokers > 1) return 'broker';
  return 'agent';
});

const pieData = computed(() => {
  const m = new Map();
  if (pieLevel.value === 'enterprise') {
    for (const l of leadsFiltrados.value) {
      const arr = Array.isArray(l.empreendimento) ? l.empreendimento : [];
      const list = arr.length ? arr : [{ nome: 'Sem Empreendimento' }];
      for (const e of list) {
        const name = e?.nome?.trim() || 'Sem Empreendimento';
        m.set(name, (m.get(name) || 0) + 1);
      }
    }
  } else if (pieLevel.value === 'broker') {
    for (const l of leadsFiltrados.value) {
      const name = brokerOf(l);
      m.set(name, (m.get(name) || 0) + 1);
    }
  } else {
    for (const l of leadsFiltrados.value) {
      const name = l?.corretor?.nome || 'Sem Corretor';
      m.set(name, (m.get(name) || 0) + 1);
    }
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
});

const baseTooltip = computed(() => ({
  trigger: 'item', confine: true, appendToBody: true,
  extraCssText: 'max-width:260px; white-space:normal; font-size:12px; line-height:1.2; padding:6px 8px;',
}));

const chartOption = computed(() => {
  if (viewMode.value === 'funnel') {
    return {
      color: palette,
      tooltip: { ...baseTooltip.value, formatter: p => `${p.name}<br/><b>${p.value}</b> lead(s)` },
      legend: { show: false },
      series: [{
        name: 'Leads por Situação', type: 'funnel',
        left: '10%', right: '10%', top: 24, bottom: 12,
        minSize: '10%', maxSize: '80%', sort: 'descending', gap: 1,
        label: { formatter: '{b}: {c}', color: txt.value, fontSize: 12 },
        itemStyle: { borderColor: 'transparent', borderWidth: 0, borderRadius: 6 },
        data: countsByStatus.value.map(([name, value]) => ({ name, value })),
      }],
    };
  }

  if (viewMode.value === 'stacked') {
    const isEnterprise = groupBy.value === 'enterprise';
    const xKeys = isEnterprise ? allEnterprisesSorted.value : allDatesSorted.value;
    const series = isEnterprise
      ? makeStackedSeries(xKeys, l => {
          const arr = Array.isArray(l.empreendimento) ? l.empreendimento : [];
          const names = arr.length ? arr.map(e => e?.nome?.trim() || 'Sem Empreendimento') : ['Sem Empreendimento'];
          return names[0];
        })
      : makeStackedSeries(xKeys, l => dateKey(l.data_cad));

    return {
      color: palette,
      tooltip: { trigger: 'axis', confine: true, axisPointer: { type: 'shadow' },
        extraCssText: 'max-width:320px; white-space:normal; font-size:12px; line-height:1.2; padding:6px 8px;' },
      legend: { type: 'scroll', textStyle: { color: txt.value, fontSize: 11 } },
      grid: { left: 32, right: 24, top: 48, bottom: 64, containLabel: true },
      dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 20 }],
      xAxis: { type: 'category', data: xKeys,
        axisLabel: { rotate: 20, fontSize: 11, color: txt.value },
        axisLine: { lineStyle: { color: sub.value } } },
      yAxis: { type: 'value', axisLabel: { fontSize: 11, color: txt.value },
        splitLine: { lineStyle: { color: gridLine.value } } },
      series,
    };
  }

  if (viewMode.value === 'pie') {
    const subtitle = pieLevel.value === 'enterprise' ? 'Comparação entre Empreendimentos'
      : pieLevel.value === 'broker' ? 'Comparação entre Imobiliárias'
        : 'Comparação entre Corretores';
    return {
      color: palette,
      title: { left: 'center', text: 'Distribuição de Leads', subtext: subtitle,
        textStyle: { fontSize: 14, color: txt.value }, subtextStyle: { color: sub.value } },
      tooltip: { ...baseTooltip.value, formatter: p => `${p.name}<br/><b>${p.value}</b> lead(s) (${p.percent}%)` },
      legend: { type: 'scroll', orient: 'vertical', left: 'left', top: 'middle',
        itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: txt.value } },
      series: [{
        name: 'Leads', type: 'pie', radius: ['40%', '70%'], padAngle: 1,
        itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 0 },
        label: { show: false },
        emphasis: { label: { show: true, fontWeight: 'bold', color: txt.value } },
        data: pieData.value,
      }],
    };
  }
  return {};
});

const onChartClick = (params) => {
  if (!params) return;
  if (viewMode.value === 'funnel' && params.name) {
    filtroStatus.value = new Set([params.name]); draftStatus.value = new Set([params.name]);
  }
  if (viewMode.value === 'pie' && params.name) {
    if (pieLevel.value === 'enterprise') {
      filtroEnterprise.value = new Set([params.name]); draftEnterprise.value = new Set([params.name]);
    } else if (pieLevel.value === 'broker') {
      filtroBroker.value = new Set([params.name]); draftBroker.value = new Set([params.name]);
    } else {
      filtroAgent.value = new Set([params.name]); draftAgent.value = new Set([params.name]);
    }
  }
  if (viewMode.value === 'stacked') {
    if (groupBy.value === 'enterprise' && params.axisValue) {
      filtroEnterprise.value = new Set([params.axisValue]); draftEnterprise.value = new Set([params.axisValue]);
    } else if (groupBy.value === 'date' && params.seriesName) {
      filtroStatus.value = new Set([params.seriesName]); draftStatus.value = new Set([params.seriesName]);
    }
  }
};

// ── Botões ───────────────────────────────────────────
const filtroPayload = computed(() => ({
  empreendimento: Array.from(draftEnterprise.value),
  imobiliaria:    Array.from(draftBroker.value),
  corretor:       Array.from(draftAgent.value),
  situacao_nome:  Array.from(draftStatus.value),
}));

const onBuscar = () => {
  filtroEnterprise.value = new Set(draftEnterprise.value);
  filtroBroker.value     = new Set(draftBroker.value);
  filtroAgent.value      = new Set(draftAgent.value);
  filtroStatus.value     = new Set(draftStatus.value);
  emit('buscar', filtroPayload.value);
};

const onLimpar = () => {
  clearAllFilters();
  emit('limpar');
};
</script>

<template>
  <Modal :open="visivel" size="full" @close="$emit('fechar')">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-chart-line text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">Relatório detalhado de leads</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="font-mono text-ink">{{ leadsFiltrados.length }}</span> de
            <span class="font-mono">{{ leads.length }}</span> lead(s)
            <span v-if="activeFiltersCount" class="text-accent">
              · <span class="font-mono">{{ activeFiltersCount }}</span> filtro(s)
            </span>
          </p>
        </div>
        <IconButton icon="fas fa-download" size="sm" label="Exportar"
          class="ml-auto shrink-0" @click="exportOpen = true" />
      </div>
    </template>

    <div class="-m-4 sm:-m-5 flex flex-col">
      <!-- Toolbar: visualização + filtros -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 px-4 sm:px-5 py-3 border-b border-line bg-surface-sunken/40">
        <SegmentedControl v-model="viewMode" :options="viewOptions" size="sm" class="overflow-x-auto" />

        <SegmentedControl v-if="viewMode === 'stacked'"
          v-model="groupBy" :options="groupOptions" size="sm" />

        <div class="ml-auto flex items-center gap-1.5">
          <Button size="sm" :variant="filtersOpen ? 'primary' : 'secondary'"
            icon="fas fa-filter" @click="filtersOpen = !filtersOpen">
            <span class="hidden sm:inline">Filtros</span>
            <span v-if="activeFiltersCount" class="font-mono text-[10px]">{{ activeFiltersCount }}</span>
          </Button>
        </div>
      </div>

      <!-- Filtros (collapsible) -->
      <transition
        enter-active-class="transition-all duration-200 ease-out-expo overflow-hidden"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-[500px]"
        leave-active-class="transition-all duration-150 ease-in overflow-hidden"
        leave-from-class="opacity-100 max-h-[500px]"
        leave-to-class="opacity-0 max-h-0">
        <div v-show="filtersOpen" class="px-4 sm:px-5 py-3 border-b border-line bg-surface-sunken/30 space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label class="block text-[11px] font-medium text-ink-muted mb-1.5">Empreendimento(s)</label>
              <MultiSelector v-model="draftEnterpriseArr" :options="enterpriseOptions"
                placeholder="Selecione..." :page-size="200" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-ink-muted mb-1.5">Imobiliária(s)</label>
              <MultiSelector v-model="draftBrokerArr" :options="brokerOptions"
                placeholder="Selecione..." :page-size="200" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-ink-muted mb-1.5">Corretor(es)</label>
              <MultiSelector v-model="draftAgentArr" :options="agentOptions"
                placeholder="Selecione..." :page-size="200" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-ink-muted mb-1.5">Situação(ões)</label>
              <MultiSelector v-model="draftStatusArr" :options="statusOptions"
                placeholder="Selecione..." :page-size="200" />
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="onLimpar">Limpar</Button>
            <Button size="sm" icon="fas fa-magnifying-glass" @click="onBuscar">Aplicar filtros</Button>
          </div>
        </div>
      </transition>

      <!-- Conteúdo -->
      <div class="flex-1 overflow-y-auto max-h-[60vh]">
        <!-- Charts -->
        <template v-if="viewMode !== 'list'">
          <div class="p-4 sm:p-5">
            <div class="flex justify-end mb-2">
              <ChartActions :filename="`leads-${viewMode}-${groupBy}`" />
            </div>
            <div class="rounded-xl border border-line bg-surface-raised p-3 surface-gradient">
              <VChart ref="chartRef" :option="chartOption" autoresize
                style="height: 400px; width: 100%;" @click="onChartClick" />
            </div>
          </div>
        </template>

        <!-- Listagem -->
        <div class="p-4 sm:p-5">
          <EmptyState v-if="!leadsFiltrados.length"
            icon="fas fa-inbox" title="Nenhum lead encontrado"
            description="Ajuste os filtros para ver resultados." />

          <div v-else class="space-y-2">
            <article v-for="l in leadsFiltrados" :key="l.idlead"
              @click="openDetail(l)"
              class="group bg-surface-raised border border-line rounded-xl px-3 sm:px-4 py-3
                     hover:shadow-elevated hover:border-accent/30 hover:-translate-y-0.5
                     transition-all duration-200 ease-out-expo cursor-pointer surface-gradient">

              <!-- Linha 1: Nome + status + data + links -->
              <div class="flex items-start justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                  <h4 class="font-semibold text-sm text-ink truncate group-hover:text-accent transition-colors">
                    {{ l.nome }}
                  </h4>
                  <Badge :variant="statusVariant(l.situacao_nome)" size="sm">
                    {{ l.situacao_nome || 'Sem situação' }}
                  </Badge>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="hidden sm:inline text-[10px] text-ink-subtle font-mono">
                    {{ formatDateHour(l.data_cad) }}
                  </span>
                  <a :href="`https://menin.cvcrm.com.br/gestor/comercial/leads/${l.idlead}/administrar?lido=true`"
                    target="_blank" class="hover:opacity-70 transition-opacity"
                    v-tippy="'CV CRM'" @click.stop>
                    <img src="/CVLogo.png" alt="CV CRM" class="h-4" />
                  </a>
                  <a v-if="l.link_rdstation" :href="l.link_rdstation" target="_blank"
                    class="hover:opacity-70 transition-opacity" v-tippy="'RD Station'" @click.stop>
                    <img src="/RDLogo.png" alt="RD Station" class="h-4" />
                  </a>
                </div>
              </div>

              <!-- Mobile: data abaixo do nome -->
              <p class="sm:hidden mt-1 text-[10px] text-ink-subtle font-mono">{{ formatDateHour(l.data_cad) }}</p>

              <!-- Linha 2: Imobiliária / Corretor / Mídia / Empreendimentos -->
              <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                <span class="inline-flex items-center gap-1.5 max-w-[180px] truncate">
                  <i class="fas fa-building text-[10px] text-indigo-500"></i>{{ brokerOf(l) }}
                </span>
                <span class="inline-flex items-center gap-1.5 max-w-[180px] truncate">
                  <i class="fas fa-user-tie text-[10px] text-orange-500"></i>{{ l.corretor?.nome || '—' }}
                </span>
                <span v-if="l.midia_principal" class="inline-flex items-center gap-1.5 max-w-[160px] truncate">
                  <i class="fas fa-bullhorn text-[10px] text-pink-500"></i>{{ l.midia_principal }}
                </span>
                <template v-if="Array.isArray(l.empreendimento) && l.empreendimento.length">
                  <Badge v-for="(emp, idx) in l.empreendimento" :key="idx" variant="accent" size="sm">
                    {{ emp?.nome }}
                  </Badge>
                </template>
              </div>

              <!-- Cancelamento -->
              <div v-if="cancelReasonOf(l)"
                class="mt-2 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                <i class="fas fa-ban shrink-0 mt-0.5 text-[10px]"></i>
                <span class="font-medium">{{ cancelReasonOf(l) }}</span>
              </div>

              <!-- Anotação -->
              <div v-if="annotationOf(l)"
                class="mt-2 flex items-start gap-1.5 text-xs text-ink-muted">
                <i class="fas fa-comment-dots shrink-0 mt-0.5 text-teal-500 text-[10px]"></i>
                <span class="line-clamp-2 italic">{{ annotationOf(l) }}</span>
              </div>
            </article>

            <p class="pt-3 text-xs text-ink-muted flex items-center gap-1.5 font-mono">
              <i class="far fa-calendar text-emerald-500"></i>{{ periodoTexto }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Export submodal -->
    <Export v-model="exportOpen" :source="leadsFiltrados" title="Leads"
      initial-delimiter=";" initial-array-mode="join"
      :filters="{
        'Status': filtroStatus,
        'Empreendimento': filtroEnterprise,
        'Imobiliária': filtroBroker,
        'Corretor': filtroAgent,
      }"
      :preselect="[
        'idlead', 'nome', 'email', 'telefone',
        'situacao_nome', 'midia_principal', 'origem',
        'empreendimento.0.nome', 'corretor.nome', 'imobiliaria.nome', 'data_cad'
      ]" />

    <LeadDetailModal v-if="selectedLead" :lead="selectedLead" :visivel="detailVisible" @fechar="closeDetail" />
  </Modal>
</template>
