<script setup>
import { computed, ref, watch } from 'vue';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { PieChart, BarChart, FunnelChart } from 'echarts/charts';
import {
  TooltipComponent, LegendComponent, GridComponent, TitleComponent, DataZoomComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import Export from '@/components/config/Export.vue';
import ChartActions from '@/components/config/ChartActions.vue';

import Modal from '@/components/UI/Modal.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

import PrecadastroDetailModal from './PrecadastroDetailModal.vue';
import { iconForStage, bucketOf, STAGE_GROUPS } from '../stages.js';

echarts.use([PieChart, BarChart, FunnelChart, TooltipComponent, LegendComponent, GridComponent, TitleComponent, DataZoomComponent, CanvasRenderer]);

const props = defineProps({
  precadastros: { type: Array, default: () => [] },
  visivel: { type: Boolean, default: false },
  initialMode: { type: String, default: 'list' },
});
const emit = defineEmits(['fechar']);

// ── Tema reativo ─────────────────────────────────────
const isDark = computed(() => document.documentElement.classList.contains('dark'));
const txt = computed(() => isDark.value ? '#E5E7EB' : '#374151');
const sub = computed(() => isDark.value ? '#94A3B8' : '#64748B');
const gridLine = computed(() => isDark.value ? '#334155' : '#E2E8F0');

// ── View modes ───────────────────────────────────────
const viewOptions = [
  { value: 'list',   label: 'Listagem', icon: 'fas fa-list' },
  { value: 'pie',    label: 'Pizza',    icon: 'fas fa-chart-pie' },
  { value: 'bar',    label: 'Colunas',  icon: 'fas fa-chart-column' },
  { value: 'funnel', label: 'Funil',    icon: 'fas fa-filter' },
];
const normalizeMode = (m) => ['list', 'pie', 'bar', 'funnel'].includes(m) ? m : 'list';
const viewMode = ref(normalizeMode(props.initialMode));
const chartGroup = ref('empresa');

watch(() => props.initialMode, (m) => { viewMode.value = normalizeMode(m); });
watch(() => props.visivel, (v) => { if (v) viewMode.value = normalizeMode(props.initialMode); });

// ── State ────────────────────────────────────────────
const search = ref('');
const itemsPerPage = ref(25);
const currentPage = ref(1);
const expanded = ref(new Set());
const exportOpen = ref(false);
const filtersOpen = ref(false);
const detailVisible = ref(false);
const detailItem = ref(null);

const itemsPerPageOptions = [
  { value: 10, label: '10 por página' },
  { value: 25, label: '25 por página' },
  { value: 50, label: '50 por página' },
  { value: 100, label: '100 por página' },
];

const chartGroupOptions = [
  { value: 'empresa',        label: 'Por empresa correspondente' },
  { value: 'etapa',          label: 'Por etapa' },
  { value: 'empreendimento', label: 'Por empreendimento' },
  { value: 'bucket',         label: 'Por grupo (funil)' },
];

// ── Filtros draft + aplicados ────────────────────────
const draftEmpreendimento = ref(new Set());
const draftEmpresa        = ref(new Set());
const draftEtapa          = ref(new Set());
const draftImob           = ref(new Set());
const draftCorretor       = ref(new Set());
const draftOrigem         = ref(new Set());

const aplEmpreendimento = ref(new Set());
const aplEmpresa        = ref(new Set());
const aplEtapa          = ref(new Set());
const aplImob           = ref(new Set());
const aplCorretor       = ref(new Set());
const aplOrigem         = ref(new Set());

const setSet = (r, arr) => { r.value = new Set(Array.isArray(arr) ? arr : []); };
const toArr  = (r) => ({ get: () => Array.from(r.value), set: (v) => setSet(r, v) });

const draftEmpreendimentoArr = computed(toArr(draftEmpreendimento));
const draftEmpresaArr        = computed(toArr(draftEmpresa));
const draftEtapaArr          = computed(toArr(draftEtapa));
const draftImobArr           = computed(toArr(draftImob));
const draftCorretorArr       = computed(toArr(draftCorretor));
const draftOrigemArr         = computed(toArr(draftOrigem));

// Opções
const _extractOptions = (list, accessor) => {
  const set = new Set();
  for (const p of (list || [])) {
    const v = accessor(p);
    if (Array.isArray(v)) v.forEach(x => x && set.add(String(x).trim()));
    else if (v) set.add(String(v).trim());
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
};
const opcoesEmpreendimento = computed(() => _extractOptions(props.precadastros, p => p?.empreendimento?.nome));
const opcoesEmpresa        = computed(() => _extractOptions(props.precadastros, p => p?.empresa_correspondente?.nome));
const opcoesEtapa          = computed(() => _extractOptions(props.precadastros, p => p?.situacao_nome));
const opcoesImob           = computed(() => _extractOptions(props.precadastros, p => p?.imobiliaria?.nome));
const opcoesCorretor       = computed(() => _extractOptions(props.precadastros, p => p?.corretor?.nome));
const opcoesOrigem         = computed(() => _extractOptions(props.precadastros, p => p?.lead_origens));

const activeFiltrosCount = computed(() =>
  [aplEmpreendimento, aplEmpresa, aplEtapa, aplImob, aplCorretor, aplOrigem]
    .filter(r => r.value.size > 0).length
);

const precadastrosFiltrados = computed(() => {
  return (props.precadastros || []).filter(p => {
    if (aplEmpreendimento.value.size && !aplEmpreendimento.value.has(p?.empreendimento?.nome?.trim())) return false;
    if (aplEmpresa.value.size        && !aplEmpresa.value.has(p?.empresa_correspondente?.nome?.trim())) return false;
    if (aplEtapa.value.size          && !aplEtapa.value.has(String(p?.situacao_nome || '').trim())) return false;
    if (aplImob.value.size           && !aplImob.value.has(p?.imobiliaria?.nome?.trim())) return false;
    if (aplCorretor.value.size       && !aplCorretor.value.has(p?.corretor?.nome?.trim())) return false;
    if (aplOrigem.value.size) {
      const arr = Array.isArray(p?.lead_origens) ? p.lead_origens : [];
      if (!arr.some(o => aplOrigem.value.has(String(o).trim()))) return false;
    }
    return true;
  });
});

function onAplicarModal() {
  aplEmpreendimento.value = new Set(draftEmpreendimento.value);
  aplEmpresa.value        = new Set(draftEmpresa.value);
  aplEtapa.value          = new Set(draftEtapa.value);
  aplImob.value           = new Set(draftImob.value);
  aplCorretor.value       = new Set(draftCorretor.value);
  aplOrigem.value         = new Set(draftOrigem.value);
  currentPage.value = 1;
}
function onLimparModal() {
  [draftEmpreendimento, draftEmpresa, draftEtapa, draftImob, draftCorretor, draftOrigem,
    aplEmpreendimento, aplEmpresa, aplEtapa, aplImob, aplCorretor, aplOrigem]
    .forEach(r => r.value = new Set());
  currentPage.value = 1;
}

watch(() => props.visivel, v => {
  if (!v) {
    search.value = '';
    currentPage.value = 1;
    expanded.value = new Set();
    onLimparModal();
  }
});
watch(search, () => { currentPage.value = 1; });
watch(itemsPerPage, () => { currentPage.value = 1; });
watch(precadastrosFiltrados, () => { currentPage.value = 1; });

// ── Search & paginação ───────────────────────────────
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  const base = precadastrosFiltrados.value;
  if (!term) return base;
  return base.filter(p =>
    String(p.idprecadastro).includes(term) ||
    (p.nome_cliente || '').toLowerCase().includes(term) ||
    (p.documento || '').toLowerCase().includes(term) ||
    (p.empreendimento?.nome || '').toLowerCase().includes(term) ||
    (p.empresa_correspondente?.nome || '').toLowerCase().includes(term) ||
    (p.situacao_nome || '').toLowerCase().includes(term)
  );
});

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / Number(itemsPerPage.value))));
const startItem = computed(() => (currentPage.value - 1) * Number(itemsPerPage.value) + 1);
const endItem   = computed(() => Math.min(currentPage.value * Number(itemsPerPage.value), filtered.value.length));
const paginated = computed(() => {
  const ipp = Number(itemsPerPage.value);
  const start = (currentPage.value - 1) * ipp;
  return filtered.value.slice(start, start + ipp);
});

const visiblePages = computed(() => {
  const tp = totalPages.value, cp = currentPage.value, pages = [], show = 5;
  let start = Math.max(1, cp - Math.floor(show / 2));
  let end = Math.min(tp, start + show - 1);
  if (end - start + 1 < show) start = Math.max(1, end - show + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

// ── KPIs ─────────────────────────────────────────────
const kpis = computed(() => {
  const list = precadastrosFiltrados.value || [];
  let aprovSemReserva = 0, reprov = 0, reserva = 0, emAnalise = 0, somaDias = 0, qtdFin = 0;
  const empresas = new Set(); const clientes = new Set();
  let valorAprov = 0;
  for (const p of list) {
    const b = bucketOf(p.situacao_nome);
    if (b.key === 'aprovado')   aprovSemReserva++;
    if (b.key === 'reprovado')  reprov++;
    if (b.key === 'reserva')    reserva++;
    if (!p.data_fim && !p.data_cancelamento) emAnalise++;
    if (p.data_fim || p.data_cancelamento) {
      const d = Number(p.dias_em_analise);
      if (Number.isFinite(d)) { somaDias += d; qtdFin++; }
    }
    if (p.empresa_correspondente?.nome) empresas.add(p.empresa_correspondente.nome);
    if (p.documento) clientes.add(p.documento);
    const va = Number(p.valor_aprovado);
    if (Number.isFinite(va)) valorAprov += va;
  }
  const aprov = aprovSemReserva + reserva;
  const total = list.length;
  return {
    total, emAnalise,
    aprov, aprovSemReserva, reprov, reserva,
    pctAprov:     total ? aprov / total : 0,
    pctConversao: total ? reserva / total : 0,
    pctReprov:    total ? reprov / total : 0,
    tempoMedioFin: qtdFin ? somaDias / qtdFin : 0,
    totalFin: qtdFin,
    bancos: empresas.size,
    clientes: clientes.size,
    valorAprov,
  };
});

const kpiCards = computed(() => [
  { label: 'Total',              value: kpis.value.total,                                sub: `Em análise: ${kpis.value.emAnalise}`, icon: 'fas fa-id-card-clip', accent: 'text-accent bg-accent-soft' },
  { label: 'Tempo finalizar',    value: `${kpis.value.tempoMedioFin.toFixed(1)}d`,       sub: `${kpis.value.totalFin} finalizadas`,  icon: 'fas fa-stopwatch',    accent: 'text-amber-500 bg-amber-500/10' },
  { label: '% Aprovação',        value: `${(kpis.value.pctAprov * 100).toFixed(1)}%`,    sub: `${kpis.value.aprov} de ${kpis.value.total}`, icon: 'fas fa-check-double', accent: 'text-emerald-500 bg-emerald-500/10' },
  { label: '% Conv. Reserva',    value: `${(kpis.value.pctConversao * 100).toFixed(1)}%`,sub: `${kpis.value.reserva} de ${kpis.value.total}`, icon: 'fas fa-bookmark',    accent: 'text-yellow-500 bg-yellow-500/10' },
  { label: '% Reprovação',       value: `${(kpis.value.pctReprov * 100).toFixed(1)}%`,   sub: `${kpis.value.reprov} de ${kpis.value.total}`, icon: 'fas fa-circle-xmark', accent: 'text-red-500 bg-red-500/10' },
]);

// ── Charts ───────────────────────────────────────────
const palette = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#F97316', '#3B82F6', '#22C55E'];
const baseTooltip = computed(() => ({
  confine: true,
  extraCssText: `background:${isDark.value ? 'rgba(2,6,23,0.96)' : 'rgba(255,255,255,0.98)'};border:1px solid rgba(99,102,241,0.25);border-radius:12px;color:${isDark.value ? '#E2E8F0' : '#0F172A'};padding:8px 10px;font-size:12px;`,
}));

function groupByKey(list) {
  const map = new Map();
  for (const p of list) {
    let key;
    if (chartGroup.value === 'empresa')              key = p?.empresa_correspondente?.nome || 'Sem empresa';
    else if (chartGroup.value === 'etapa')           key = p?.situacao_nome || 'Sem etapa';
    else if (chartGroup.value === 'empreendimento')  key = p?.empreendimento?.nome || 'Sem empreendimento';
    else if (chartGroup.value === 'bucket')          key = bucketOf(p?.situacao_nome).label;
    const cur = map.get(key) || { name: key, value: 0 };
    cur.value++;
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

const chartData = computed(() => groupByKey(precadastrosFiltrados.value));

const chartOption = computed(() => {
  if (viewMode.value === 'pie') {
    return {
      backgroundColor: 'transparent', color: palette,
      tooltip: { ...baseTooltip.value, trigger: 'item', formatter: p => `${p.name}<br/><b>${p.value}</b> (${p.percent}%)` },
      legend: { type: 'scroll', orient: 'vertical', left: 'left', top: 'middle', textStyle: { fontSize: 11, color: txt.value } },
      series: [{
        type: 'pie', radius: ['40%', '70%'], padAngle: 1,
        itemStyle: { borderRadius: 6, borderWidth: 0 },
        label: { show: false },
        emphasis: { label: { show: true, fontWeight: 'bold', color: txt.value } },
        data: chartData.value,
      }],
    };
  }
  if (viewMode.value === 'funnel') {
    const data = STAGE_GROUPS.filter(g => g.key !== 'outros').map(g => ({
      name: g.label,
      value: precadastrosFiltrados.value.filter(p => bucketOf(p.situacao_nome).key === g.key).length,
    })).filter(d => d.value > 0);
    return {
      backgroundColor: 'transparent', color: palette,
      tooltip: { ...baseTooltip.value, trigger: 'item', formatter: '{b}: <b>{c}</b>' },
      series: [{
        type: 'funnel', left: '10%', width: '80%', sort: 'descending', gap: 2,
        label: { color: '#FFFFFF', fontWeight: 600, formatter: '{b}: {c}' },
        itemStyle: { borderRadius: 6, borderWidth: 0 },
        data,
      }],
    };
  }
  // bar
  return {
    backgroundColor: 'transparent', color: palette,
    tooltip: { ...baseTooltip.value, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 32, right: 24, top: 30, bottom: 80, containLabel: true },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 20, textStyle: { color: sub.value } }],
    xAxis: {
      type: 'category', data: chartData.value.map(r => r.name),
      axisLabel: { interval: 0, rotate: 25, fontSize: 10, color: txt.value, formatter: v => v.length > 18 ? v.slice(0, 18) + '…' : v },
      axisLine: { lineStyle: { color: gridLine.value } },
    },
    yAxis: { type: 'value', axisLabel: { color: txt.value, fontSize: 11 }, splitLine: { lineStyle: { color: gridLine.value, type: 'dashed' } } },
    series: [{
      name: 'Quantidade', type: 'bar', barWidth: '60%',
      data: chartData.value.map(r => r.value),
      itemStyle: { borderRadius: [6, 6, 0, 0] },
      label: { show: true, position: 'top', fontSize: 10, color: txt.value },
    }],
  };
});

function onChartClick(params) { if (params && params.name) search.value = params.name; }

function toggleExpand(p) {
  const next = new Set(expanded.value);
  if (next.has(p.idprecadastro)) next.delete(p.idprecadastro);
  else next.add(p.idprecadastro);
  expanded.value = next;
}

function abrirDetalhe(p) { detailItem.value = p; detailVisible.value = true; }

const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—';
};
const fmtDate = (d) => { if (!d) return '—'; const dt = new Date(d); return isNaN(dt) ? '—' : dt.toLocaleDateString('pt-BR'); };
const fmtDateTime = (d) => { if (!d) return '—'; const dt = new Date(d); return isNaN(dt) ? '—' : dt.toLocaleString('pt-BR'); };
const stageVariant = (s) => {
  if (!s) return 'neutral';
  if (/aprovad/i.test(s) && !/restri/i.test(s)) return 'success';
  if (/reserva/i.test(s)) return 'warning';
  if (/reprovad|negad|cancelad|distrat/i.test(s)) return 'danger';
  if (/análise|analise|aguardando/i.test(s)) return 'accent';
  return 'info';
};
</script>

<template>
  <Modal :open="visivel" size="full" @close="emit('fechar')">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-id-card-clip text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">Pré-Cadastros</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="font-mono text-ink">{{ kpis.total }}</span> análise(s) ·
            <span class="font-mono">{{ kpis.bancos }}</span> empresa(s) ·
            <span class="font-mono">{{ kpis.clientes }}</span> cliente(s)
          </p>
        </div>
        <IconButton icon="fas fa-download" size="sm" label="Exportar"
          class="ml-auto shrink-0" @click="exportOpen = true" />
      </div>
    </template>

    <div class="-m-4 sm:-m-5 flex flex-col">

      <!-- Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 px-4 sm:px-5 py-3 border-b border-line bg-surface-sunken/40">
        <SegmentedControl v-model="viewMode" :options="viewOptions" size="sm" class="overflow-x-auto" />

        <div class="ml-auto flex items-center gap-1.5">
          <Button size="sm" :variant="filtersOpen ? 'primary' : 'secondary'"
            icon="fas fa-filter" @click="filtersOpen = !filtersOpen">
            <span class="hidden sm:inline">Filtros</span>
            <span v-if="activeFiltrosCount" class="font-mono text-[10px]">{{ activeFiltrosCount }}</span>
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
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] font-medium text-ink-muted mb-1.5">Empreendimento</label>
              <MultiSelector v-model="draftEmpreendimentoArr" :options="opcoesEmpreendimento" placeholder="Selecione..." :page-size="200" :select-all="true" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-ink-muted mb-1.5">Empresa</label>
              <MultiSelector v-model="draftEmpresaArr" :options="opcoesEmpresa" placeholder="Selecione..." :page-size="150" :select-all="true" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-ink-muted mb-1.5">Etapa</label>
              <MultiSelector v-model="draftEtapaArr" :options="opcoesEtapa" placeholder="Selecione..." :page-size="150" :select-all="true" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-ink-muted mb-1.5">Imobiliária</label>
              <MultiSelector v-model="draftImobArr" :options="opcoesImob" placeholder="Selecione..." :page-size="150" :select-all="true" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-ink-muted mb-1.5">Corretor</label>
              <MultiSelector v-model="draftCorretorArr" :options="opcoesCorretor" placeholder="Selecione..." :page-size="150" :select-all="true" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-ink-muted mb-1.5">Origem do lead</label>
              <MultiSelector v-model="draftOrigemArr" :options="opcoesOrigem" placeholder="Selecione..." :page-size="150" :select-all="true" />
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="onLimparModal">Limpar</Button>
            <Button size="sm" icon="fas fa-magnifying-glass" @click="onAplicarModal">Aplicar filtros</Button>
          </div>
        </div>
      </transition>

      <!-- Conteúdo scrollável -->
      <div class="flex-1 overflow-y-auto max-h-[68vh]">

        <!-- KPI Strip -->
        <div class="px-4 sm:px-5 py-4 border-b border-line">
          <div class="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible no-scrollbar">
            <div class="flex sm:grid gap-2.5 sm:gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 min-w-max sm:min-w-0">
              <div v-for="k in kpiCards" :key="k.label"
                class="flex flex-col gap-1 p-3 rounded-xl border border-line bg-surface-raised
                       shadow-soft hover:shadow-elevated hover:border-accent/30 hover:-translate-y-0.5
                       transition-all duration-200 ease-out-expo
                       w-44 sm:w-auto shrink-0 surface-gradient">
                <div class="flex items-center justify-between gap-2">
                  <span class="h-7 w-7 rounded-lg grid place-items-center text-xs" :class="k.accent">
                    <i :class="k.icon"></i>
                  </span>
                  <span class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">{{ k.label }}</span>
                </div>
                <span class="text-xl font-semibold text-ink tabular-nums tracking-tight leading-none mt-1">{{ k.value }}</span>
                <span class="text-[11px] text-ink-muted truncate" :title="k.sub">{{ k.sub }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts -->
        <div v-if="viewMode !== 'list'" class="p-4 sm:p-5 border-b border-line">
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <span v-if="search" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-accent-soft text-accent border border-accent/20">
              Filtro: {{ search }}
              <button @click="search = ''" class="hover:text-accent-hover">
                <i class="fas fa-times text-[10px]"></i>
              </button>
            </span>
            <span v-else class="text-xs text-ink-subtle">Clique no gráfico para filtrar a lista abaixo.</span>

            <Select v-model="chartGroup" :options="chartGroupOptions" size="sm" class="ml-auto w-56" />
            <ChartActions :filename="`precadastros-${viewMode}-${chartGroup}`" />
          </div>
          <div class="rounded-xl border border-line bg-surface-raised p-3 surface-gradient">
            <VChart :option="chartOption" autoresize style="height: 400px; width: 100%;" @click="onChartClick" />
          </div>
        </div>

        <!-- Search + items per page -->
        <div class="px-4 sm:px-5 py-3 border-b border-line bg-surface-sunken/30 flex flex-wrap gap-3 items-end">
          <div class="flex-1 min-w-[200px]">
            <Input v-model="search" placeholder="Cliente · CPF · Empreendimento · Empresa · Etapa"
              iconLeft="fas fa-magnifying-glass" />
          </div>
          <div class="w-44">
            <Select v-model="itemsPerPage" :options="itemsPerPageOptions" />
          </div>
        </div>

        <!-- Lista -->
        <div class="p-4 sm:p-5">
          <EmptyState v-if="!paginated.length"
            icon="fas fa-inbox" title="Nenhum pré-cadastro encontrado"
            description="Ajuste os filtros ou a busca para ver resultados." />

          <div v-else class="space-y-2">
            <article v-for="p in paginated" :key="p.idprecadastro"
              class="bg-surface-raised border border-line rounded-xl overflow-hidden surface-gradient
                     hover:shadow-elevated hover:border-accent/30 transition-all duration-200 ease-out-expo">

              <!-- Linha principal -->
              <div class="px-3 sm:px-4 py-3 cursor-pointer" @click="toggleExpand(p)">
                <div class="flex items-start gap-3">
                  <!-- Indicador status -->
                  <div class="h-9 w-9 shrink-0 rounded-lg grid place-items-center text-sm border"
                    :class="{
                      'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': stageVariant(p.situacao_nome) === 'success',
                      'bg-yellow-500/10 text-yellow-500 border-yellow-500/20': stageVariant(p.situacao_nome) === 'warning',
                      'bg-red-500/10 text-red-500 border-red-500/20': stageVariant(p.situacao_nome) === 'danger',
                      'bg-accent-soft text-accent border-accent/20': stageVariant(p.situacao_nome) === 'accent',
                      'bg-blue-500/10 text-blue-500 border-blue-500/20': stageVariant(p.situacao_nome) === 'info' || stageVariant(p.situacao_nome) === 'neutral',
                    }">
                    <i :class="iconForStage(p.situacao_nome)"></i>
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2 flex-wrap">
                      <div class="min-w-0">
                        <h4 class="text-sm font-semibold text-ink truncate">
                          {{ p.nome_cliente || p.cliente?.nome || '—' }}
                          <span class="ml-1 text-[11px] text-ink-subtle font-mono">#{{ p.idprecadastro }}</span>
                        </h4>
                        <p class="text-[11px] text-ink-subtle font-mono mt-0.5">{{ p.documento || '—' }}</p>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <Badge :variant="stageVariant(p.situacao_nome)" size="sm">
                          {{ p.situacao_nome || '—' }}
                        </Badge>
                        <a v-if="p.link" :href="p.link" target="_blank" rel="noopener"
                          @click.stop class="opacity-70 hover:opacity-100 transition" v-tippy="'Abrir no CV CRM'">
                          <img src="/CVLogo.png" alt="CV CRM" class="h-4" />
                        </a>
                      </div>
                    </div>

                    <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <span class="inline-flex items-center gap-1.5 max-w-[200px] truncate">
                        <i class="fas fa-building text-[10px] text-indigo-500"></i>
                        {{ p.empreendimento?.nome || '—' }}
                      </span>
                      <span v-if="p.empresa_correspondente?.nome" class="inline-flex items-center gap-1.5 max-w-[200px] truncate">
                        <i class="fas fa-city text-[10px] text-cyan-500"></i>
                        {{ p.empresa_correspondente.nome }}
                      </span>
                      <span class="inline-flex items-center gap-1.5">
                        <i class="fas fa-coins text-[10px] text-emerald-500"></i>
                        <span class="font-semibold text-emerald-500 tabular-nums">{{ fmtMoney(p.valor_aprovado) }}</span>
                      </span>
                      <span class="inline-flex items-center gap-1.5">
                        <i class="far fa-calendar text-[10px] text-orange-500"></i>
                        <span class="font-mono">{{ fmtDate(p.data_cad) }}</span>
                      </span>
                      <span class="inline-flex items-center gap-1.5">
                        <i class="fas fa-stopwatch text-[10px] text-amber-500"></i>
                        <span class="font-mono tabular-nums">{{ Number(p.dias_em_analise || 0).toFixed(0) }}d</span>
                      </span>
                    </div>
                  </div>

                  <i class="fas fa-chevron-down text-xs text-ink-subtle mt-2 transition-transform"
                    :class="{ 'rotate-180': expanded.has(p.idprecadastro) }"></i>
                </div>
              </div>

              <!-- Expandido -->
              <div v-if="expanded.has(p.idprecadastro)"
                class="border-t border-line bg-surface-sunken/40 px-3 sm:px-4 py-3 space-y-3 animate-fade-in">
                <!-- Financeiro -->
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  <div v-for="(v, lab) in {
                    'Avaliação': fmtMoney(p.valor_avaliacao),
                    'Aprovado': fmtMoney(p.valor_aprovado),
                    'Subsídio': fmtMoney(p.valor_subsidio),
                    'FGTS': fmtMoney(p.valor_fgts),
                    'Total': fmtMoney(p.valor_total),
                    'Renda': fmtMoney(p.renda_total),
                  }" :key="lab" class="rounded-lg p-2 border border-line bg-surface-raised">
                    <p class="text-[9px] uppercase tracking-wider text-ink-subtle font-mono">{{ lab }}</p>
                    <p class="text-xs font-semibold text-ink tabular-nums truncate">{{ v }}</p>
                  </div>
                </div>

                <!-- Detalhes -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  <div v-for="(v, lab) in {
                    'Imobiliária': p.imobiliaria?.nome || '—',
                    'Corretor': p.corretor?.nome || '—',
                    'Correspondente': p.correspondente?.nome || '—',
                    'Aprovado por': p.usuario_aprovou?.nome || '—',
                    'Cadastro': fmtDateTime(p.data_cad),
                    'Finalização': fmtDateTime(p.data_fim),
                    'Cancelamento': fmtDateTime(p.data_cancelamento),
                    'Vencimento': p.vencimento_aprovacao || '—',
                  }" :key="lab" class="min-w-0">
                    <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">{{ lab }}</p>
                    <p class="text-ink truncate">{{ v }}</p>
                  </div>
                </div>

                <!-- Ações -->
                <div class="flex justify-end gap-2 pt-2 border-t border-line">
                  <Button variant="secondary" size="sm" icon="fas fa-list-check" @click.stop="abrirDetalhe(p)">
                    Histórico / Leads
                  </Button>
                  <Button v-if="p.link" tag="a" :href="p.link" target="_blank" rel="noopener"
                    variant="primary" size="sm" icon="fas fa-arrow-up-right-from-square">
                    <a :href="p.link" target="_blank" rel="noopener" class="inline-flex items-center gap-1">
                      Administrar no CV
                    </a>
                  </Button>
                </div>
              </div>
            </article>
          </div>
        </div>

        <!-- Paginação -->
        <div v-if="totalPages > 1"
          class="px-4 sm:px-5 py-3 border-t border-line bg-surface-sunken/40 flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs text-ink-muted font-mono">
            {{ startItem }}–{{ endItem }} de {{ filtered.length }}
          </div>
          <div class="flex items-center gap-1">
            <IconButton icon="fas fa-angles-left" size="sm" label="Primeira"
              :disabled="currentPage === 1" @click="currentPage = 1" />
            <IconButton icon="fas fa-chevron-left" size="sm" label="Anterior"
              :disabled="currentPage === 1" @click="currentPage--" />
            <button v-for="page in visiblePages" :key="page" @click="currentPage = page"
              class="min-w-[32px] h-8 px-2 rounded-md text-xs font-mono transition-colors"
              :class="page === currentPage
                ? 'bg-accent text-white'
                : 'text-ink-muted hover:bg-surface-hover'">
              {{ page }}
            </button>
            <IconButton icon="fas fa-chevron-right" size="sm" label="Próxima"
              :disabled="currentPage === totalPages" @click="currentPage++" />
            <IconButton icon="fas fa-angles-right" size="sm" label="Última"
              :disabled="currentPage === totalPages" @click="currentPage = totalPages" />
          </div>
        </div>
      </div>
    </div>

    <!-- Export -->
    <Export v-model="exportOpen" :source="filtered" title="Pré-Cadastros"
      initial-delimiter=";" initial-array-mode="join"
      :filters="{
        'Busca': search,
        'Empreendimento': aplEmpreendimento,
        'Empresa correspondente': aplEmpresa,
        'Etapa/Situação': aplEtapa,
        'Imobiliária': aplImob,
        'Corretor': aplCorretor,
        'Origem': aplOrigem,
      }"
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

    <PrecadastroDetailModal :precadastro="detailItem" :visivel="detailVisible" @fechar="detailVisible = false" />
  </Modal>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
