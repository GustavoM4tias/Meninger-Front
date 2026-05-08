<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useProjectionGoalModeStore } from '@/stores/Comercial/Projections/projectionGoalModeStore';

import Modal from '@/components/UI/Modal.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart, GaugeChart } from 'echarts/charts';
import {
  TooltipComponent, LegendComponent, GridComponent,
  TitleComponent, DataZoomComponent, MarkLineComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart, PieChart, GaugeChart,
  TooltipComponent, LegendComponent, GridComponent,
  TitleComponent, DataZoomComponent, MarkLineComponent,
  CanvasRenderer,
]);

const props = defineProps({
  open: { type: Boolean, default: false },
  data: { type: Array, default: () => [] },
  metrics: { type: Object, default: () => ({}) },
  timeElapsedPct: { type: Number, default: 0 },
});

const emit = defineEmits(['close', 'open-detail']);

const contractsStore = useContractsStore();
const goalStore = useProjectionGoalModeStore();

// ── Tema reativo ─────────────────────────────────────
const isDark = ref(false);
let themeObserver = null;

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark');
  themeObserver = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark');
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});
onUnmounted(() => themeObserver?.disconnect());

const txt = computed(() => isDark.value ? '#E2E8F0' : '#0F172A');
const sub = computed(() => isDark.value ? '#94A3B8' : '#64748B');
const dim = computed(() => isDark.value ? '#334155' : '#E2E8F0');
const surface = computed(() => isDark.value ? '#0F172A' : '#FFFFFF');

const TT = computed(() =>
  isDark.value
    ? `background:rgba(2,6,23,0.96);border:1px solid rgba(99,102,241,0.25);border-radius:12px;font-size:12px;color:#E2E8F0;box-shadow:0 8px 32px rgba(0,0,0,0.5);padding:10px 14px;`
    : `background:rgba(255,255,255,0.98);border:1px solid rgba(99,102,241,0.2);border-radius:12px;font-size:12px;color:#0F172A;box-shadow:0 8px 32px rgba(15,23,42,0.12);padding:10px 14px;`
);

// ── Tabs ─────────────────────────────────────
const activeTab = ref('overview');
const tabOptions = [
  { value: 'overview',   label: 'Visão geral', icon: 'fas fa-chart-pie' },
  { value: 'comparison', label: 'Comparação',  icon: 'fas fa-chart-column' },
  { value: 'ranking',    label: 'Ranking',     icon: 'fas fa-ranking-star' },
  { value: 'how',        label: 'Como funciona', icon: 'fas fa-circle-info' },
];

// ── Helpers ──────────────────────────────────
const isNet = computed(() => contractsStore.isNet);
const valueModeLabel = computed(() => contractsStore.valueModeLabel);

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v || 0);

const brlShort = (v) => {
  if (!v) return 'R$ 0';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`;
  return formatCurrency(v);
};

const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const truncate = (s, max = 38) => {
  const str = String(s ?? '');
  return str.length > max ? str.slice(0, max - 1).trimEnd() + '…' : str;
};

// Modo de meta do empreendimento (units | vgv)
const goalModeOf = (row) => {
  const eid = row.enterprise_id ?? row.id ?? null;
  return goalStore.modeForEnterprise(eid);
};

const isUnitsMode = (row) => goalModeOf(row) === 'units';

// Realizado absoluto no modo do empreend.
function realizedAbsOf(row) {
  if (isUnitsMode(row)) {
    return Math.max(0, (row.count || 0) > 0 ? (row.count || 0) : (row.proj_count || 0));
  }
  return row.realizedVgv || 0;
}

// Projetado absoluto no modo do empreend.
function projectedAbsOf(row) {
  if (isUnitsMode(row)) return row.projectedUnits || 0;
  return row.projectedVgv || 0;
}

// Formata valor segundo o modo (R$ ou unidades)
function formatByMode(row, value) {
  if (isUnitsMode(row)) {
    const n = Math.round(Number(value) || 0);
    return `${n} ${n === 1 ? 'unid.' : 'unid.'}`;
  }
  return formatCurrency(value);
}

// Label curto do modo
const modeLabelOf = (row) => isUnitsMode(row) ? 'Unidades' : 'VGV';

// effective achievement % using goal mode (units vs vgv)
function effectiveAchievementPct(row) {
  const eid = row.enterprise_id ?? row.id ?? null;
  const mode = goalStore.modeForEnterprise(eid);
  if (mode === 'units') {
    const projected = row.projectedUnits || 0;
    if (projected <= 0) return null;
    const effectiveCount = (row.count || 0) > 0 ? (row.count || 0) : (row.proj_count || 0);
    return parseFloat((effectiveCount / projected * 100).toFixed(1));
  }
  return row.achievementPct ?? null;
}

// ── Status agregado ───────────────────────
const STATUS_META = {
  ahead:         { label: 'Acima da meta',    color: '#10B981', icon: 'fas fa-fire' },
  on_track:      { label: 'Na meta',          color: '#3B82F6', icon: 'fas fa-circle-check' },
  behind:        { label: 'Em alerta',        color: '#EAB308', icon: 'fas fa-triangle-exclamation' },
  at_risk:       { label: 'Em risco',         color: '#EF4444', icon: 'fas fa-skull' },
  no_sales:      { label: 'Sem vendas',       color: '#94A3B8', icon: 'fas fa-ban' },
  no_projection: { label: 'Sem projeção',     color: '#CBD5E1', icon: 'fas fa-minus' },
};

const statusCounts = computed(() => {
  const counts = {};
  for (const row of props.data || []) {
    const s = row.status || 'no_projection';
    counts[s] = (counts[s] || 0) + 1;
  }
  return counts;
});

// Empreendimentos agrupados por status (com nomes ordenados por % atingida)
const enterprisesByStatus = computed(() => {
  const map = {};
  for (const row of props.data || []) {
    const s = row.status || 'no_projection';
    if (!map[s]) map[s] = [];
    const mode = goalModeOf(row);
    map[s].push({
      name: row.name || '—',
      enterprise_id: row.enterprise_id ?? row.id ?? null,
      realizedVgv: row.realizedVgv || 0,
      projectedVgv: row.projectedVgv || 0,
      projectedUnits: row.projectedUnits || 0,
      count: row.count || 0,
      ach: effectiveAchievementPct(row),
      mode,
      modeLabel: mode === 'units' ? 'Unidades' : 'VGV',
      realizedAbs: realizedAbsOf(row),
      projectedAbs: projectedAbsOf(row),
      _row: row,
    });
  }
  // Sort each list by achievement desc (or by realizedVgv when no projection)
  for (const s of Object.keys(map)) {
    map[s].sort((a, b) => {
      if (a.ach != null && b.ach != null) return b.ach - a.ach;
      if (a.ach != null) return -1;
      if (b.ach != null) return 1;
      return b.realizedVgv - a.realizedVgv;
    });
  }
  return map;
});

const statusList = computed(() =>
  Object.entries(statusCounts.value)
    .map(([key, count]) => ({
      key, count,
      enterprises: enterprisesByStatus.value[key] || [],
      ...STATUS_META[key],
    }))
    .sort((a, b) => b.count - a.count)
);

// Accordion state for status detail
const expandedStatus = ref(new Set());
function toggleStatus(key) {
  const next = new Set(expandedStatus.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expandedStatus.value = next;
}

const statusInsights = computed(() => ({
  total: props.data?.length || 0,
  ahead: statusCounts.value.ahead || 0,
  on_track: statusCounts.value.on_track || 0,
  behind: statusCounts.value.behind || 0,
  at_risk: statusCounts.value.at_risk || 0,
  no_sales: statusCounts.value.no_sales || 0,
  no_projection: statusCounts.value.no_projection || 0,
}));

// ── Comparação ──────────────────────────
// Aceita ambos os modos: VGV (projectedVgv > 0) ou Unidades (projectedUnits > 0)
// Ordena por % atingida desc (mode-aware)
const comparisonData = computed(() => {
  return (props.data || [])
    .filter(r => projectedAbsOf(r) > 0)
    .map(r => ({
      ...r,
      _ach: effectiveAchievementPct(r) ?? 0,
      _realized: realizedAbsOf(r),
      _projected: projectedAbsOf(r),
      _mode: goalModeOf(r),
    }))
    .sort((a, b) => b._ach - a._ach)
    .slice(0, 20);
});

// ── Ranking ──────────────────────────────
const rankableData = computed(() =>
  (props.data || [])
    .filter(r => r.projectedVgv > 0 || r.projectedUnits > 0)
    .map(r => ({ ...r, _ach: effectiveAchievementPct(r) }))
    .filter(r => r._ach != null)
);

// "Acima da meta": ratio >= 0.8 (acima ou na meta), ordenado desc
// "Em risco": ratio < 0.8 (alerta + risco), ordenado asc (pior primeiro)
const elapsedRef = computed(() => props.timeElapsedPct ?? 0);

function ratioFor(ach) {
  const e = elapsedRef.value;
  if (ach == null) return null;
  return e > 0 ? ach / e : (ach >= 100 ? 1.2 : 0.5);
}

const topPerformers = computed(() =>
  [...rankableData.value]
    .filter(r => {
      const ratio = ratioFor(r._ach);
      return ratio != null && ratio >= 0.8;
    })
    .sort((a, b) => b._ach - a._ach)
);

const worstPerformers = computed(() =>
  [...rankableData.value]
    .filter(r => {
      const ratio = ratioFor(r._ach);
      return ratio != null && ratio < 0.8;
    })
    .sort((a, b) => a._ach - b._ach)
);

// ── Charts ───────────────────────────────

// Status Donut
const statusDonutOption = computed(() => {
  const data = statusList.value.map(s => ({
    name: s.label,
    value: s.count,
    itemStyle: { color: s.color },
    _enterprises: s.enterprises,
    _key: s.key,
  }));
  const total = data.reduce((s, d) => s + d.value, 0);

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      confine: true,
      appendToBody: true,
      enterable: true,
      extraCssText: TT.value + 'max-width:340px;',
      formatter: (p) => {
        const ents = p.data?._enterprises || [];
        const head = `<b style="color:${p.color}">${escapeHtml(p.name)}</b> · ${p.value} empreend. · ${p.percent}%`;
        if (!ents.length) return head;
        const visible = ents.slice(0, 8);
        const rows = visible.map((e) => {
          const achTxt = e.ach != null
            ? `<span style="color:${sub.value};font-size:10px;flex-shrink:0;font-family:ui-monospace,monospace">${e.ach.toFixed(1)}%</span>`
            : '';
          const modeTxt = e.projectedAbs > 0
            ? `<span style="color:${sub.value};font-size:9px;font-family:ui-monospace,monospace;opacity:0.7;flex-shrink:0">${e.modeLabel}</span>`
            : '';
          const name = `<span style="color:${txt.value};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1 1 auto" title="${escapeHtml(e.name)}">${escapeHtml(truncate(e.name, 36))}</span>`;
          return `<div style="margin-top:4px;font-size:11px;line-height:1.3;display:flex;align-items:center;gap:8px;max-width:100%">${name}${modeTxt}${achTxt}</div>`;
        }).join('');
        const more = ents.length > 8
          ? `<div style="margin-top:6px;font-size:10px;color:${sub.value};font-style:italic">+ ${ents.length - 8} outro(s)</div>`
          : '';
        return `<div style="max-width:320px;overflow:hidden">${head}<div style="margin-top:6px;border-top:1px solid ${dim.value};padding-top:6px;max-width:100%">${rows}${more}</div></div>`;
      },
    },
    legend: {
      type: 'scroll', orient: 'vertical', left: 4, top: 'middle',
      textStyle: { color: sub.value, fontSize: 11 },
      icon: 'circle', itemWidth: 8, itemHeight: 8, itemGap: 8,
    },
    graphic: [
      { type: 'text', left: '70%', top: '44%',
        style: { text: `${total}`, fill: txt.value, fontSize: 24, fontWeight: 'bold', textAlign: 'center' } },
      { type: 'text', left: '70%', top: '55%',
        style: { text: 'empreend.', fill: sub.value, fontSize: 11, textAlign: 'center' } },
    ],
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['70%', '50%'],
      padAngle: 2,
      itemStyle: { borderColor: surface.value, borderWidth: 2, borderRadius: 6 },
      label: { show: false },
      emphasis: { scale: true, scaleSize: 6, label: { show: false } },
      data,
    }],
  };
});

// Global Achievement Gauge
const gaugeColor = computed(() => {
  const ach = props.metrics?.achievementPct;
  const elapsed = props.timeElapsedPct ?? 0;
  if (ach == null) return '#64748B';
  const ratio = elapsed > 0 ? ach / elapsed : (ach >= 100 ? 1.2 : 0.5);
  if (ratio >= 1.1) return '#10B981';
  if (ratio >= 0.8) return '#3B82F6';
  if (ratio >= 0.4) return '#EAB308';
  return '#EF4444';
});

const gaugeOption = computed(() => {
  const ach = Number(props.metrics?.achievementPct);
  const hasValue = Number.isFinite(ach);
  const value = hasValue ? Math.min(Math.max(ach, 0), 150) : 0;
  const elapsed = Number(props.timeElapsedPct) || 0;
  const elapsedClamped = Math.min(Math.max(elapsed, 0), 150);
  const color = gaugeColor.value;

  // Faixas coloridas no axisLine: até "elapsed" cinza claro (ainda no caminho),
  // depois transição p/ verde a partir de 100%
  const axisLineColor = elapsed > 0
    ? [[elapsedClamped / 150, dim.value], [1, isDark.value ? '#1E293B' : '#F1F5F9']]
    : [[1, dim.value]];

  return {
    backgroundColor: 'transparent',
    series: [
      {
        // Série 1: barra de progresso principal (% atingida)
        type: 'gauge',
        startAngle: 200, endAngle: -20,
        min: 0, max: 150,
        radius: '95%',
        progress: { show: true, width: 20, itemStyle: { color, borderRadius: 100 } },
        axisLine: { lineStyle: { width: 20, color: axisLineColor } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: {
          length: 10, distance: -22,
          lineStyle: { color: sub.value, width: 1 },
        },
        axisLabel: {
          color: sub.value, fontSize: 9, distance: -34,
          formatter: (v) => (v === 0 || v === 50 || v === 100 || v === 150) ? `${v}%` : '',
        },
        anchor: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-2%'],
          formatter: () => hasValue ? `${ach.toFixed(1)}%` : '—',
          color, fontSize: 28, fontWeight: 'bold',
        },
        data: [{ value }],
      },
      {
        // Série 2: ponteiro fino indicando "tempo decorrido" como referência
        type: 'gauge',
        startAngle: 200, endAngle: -20,
        min: 0, max: 150,
        radius: '95%',
        progress: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: elapsed > 0
          ? { show: true, length: '78%', width: 3, offsetCenter: [0, 0],
              itemStyle: { color: sub.value, opacity: 0.6 } }
          : { show: false },
        anchor: elapsed > 0
          ? { show: true, size: 8, showAbove: true,
              itemStyle: { color: sub.value, opacity: 0.6 } }
          : { show: false },
        title: { show: false },
        detail: { show: false },
        data: [{ value: elapsedClamped }],
      },
    ],
  };
});

// % Atingida por empreendimento (mode-aware: VGV ou Unidades)
// Cada barra colore conforme status (verde / azul / amarelo / vermelho)
const comparisonChartOption = computed(() => {
  const data = comparisonData.value;
  const reversed = data.slice().reverse();
  const names = reversed.map(r => {
    const n = r.name || '—';
    return n.length > 32 ? n.slice(0, 32) + '…' : n;
  });
  const elapsed = props.timeElapsedPct ?? 0;

  const colorFor = (ach) => {
    if (ach == null) return '#94A3B8';
    const ratio = elapsed > 0 ? ach / elapsed : (ach >= 100 ? 1.2 : 0.5);
    if (ratio >= 1.1) return '#10B981';
    if (ratio >= 0.8) return '#3B82F6';
    if (ratio >= 0.4) return '#EAB308';
    return '#EF4444';
  };

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'shadow' },
      extraCssText: TT.value + 'max-width:340px;',
      formatter: (ps) => {
        const idx = ps[0].dataIndex;
        const r = reversed[idx];
        const isUnits = r._mode === 'units';
        const realizedFmt = isUnits ? `${Math.round(r._realized)} unid.` : formatCurrency(r._realized);
        const projectedFmt = isUnits ? `${Math.round(r._projected)} unid.` : formatCurrency(r._projected);
        const c = colorFor(r._ach);
        return `<b>${escapeHtml(truncate(r.name, 40))}</b><br/>` +
          `<span style="color:${sub.value};font-size:10px">Modo: ${isUnits ? 'Unidades' : 'VGV'}</span><br/>` +
          `<span style="color:#10B981">●</span> Realizado: <b>${realizedFmt}</b><br/>` +
          `<span style="color:#3B82F6">●</span> Projetado: <b>${projectedFmt}</b><br/>` +
          `<span style="color:${c};font-weight:600">${r._ach.toFixed(1)}% atingida</span>`;
      },
    },
    grid: { left: 8, right: 60, top: 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      max: (v) => Math.max(100, Math.ceil(v.max / 10) * 10),
      axisLabel: {
        color: sub.value, fontSize: 10,
        formatter: v => `${v}%`,
      },
      splitLine: { lineStyle: { color: dim.value, type: 'dashed' } },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'category', data: names,
      axisLabel: { color: sub.value, fontSize: 10, width: 220, overflow: 'truncate' },
      axisLine: { show: false }, axisTick: { show: false },
    },
    series: [
      {
        name: '% Atingida',
        type: 'bar',
        barMaxWidth: 18,
        data: reversed.map((r) => ({
          value: r._ach,
          itemStyle: { color: colorFor(r._ach), borderRadius: [0, 6, 6, 0] },
        })),
        label: {
          show: true, position: 'right',
          color: txt.value, fontSize: 10, fontWeight: 600,
          formatter: (p) => `${p.value.toFixed(1)}%`,
        },
        // Linha de referência em 100% e no tempo decorrido
        markLine: {
          silent: true,
          symbol: 'none',
          data: [
            { xAxis: 100, lineStyle: { color: '#10B981', type: 'dashed', width: 1, opacity: 0.6 },
              label: { show: true, position: 'end', formatter: 'meta 100%', color: sub.value, fontSize: 9 } },
            ...(elapsed > 0 ? [{
              xAxis: elapsed,
              lineStyle: { color: sub.value, type: 'dotted', width: 1, opacity: 0.5 },
              label: { show: true, position: 'start', formatter: `tempo ${elapsed.toFixed(0)}%`, color: sub.value, fontSize: 9 },
            }] : []),
          ],
        },
      },
    ],
  };
});

// ── Aggregate mode label (units|vgv|mixed) ───
const aggregateModeLabel = computed(() => {
  const mode = props.metrics?.aggregateMode;
  if (mode === 'units') return 'Unidades';
  if (mode === 'vgv')   return 'VGV';
  if (mode === 'mixed') return 'Misto';
  return null;
});

// ── KPI Cards ─────────────────────────────
const overviewKpis = computed(() => [
  {
    key: 'total',
    label: 'Total empreend.',
    value: statusInsights.value.total,
    sub: 'no relatório',
    icon: 'fas fa-building',
    accent: 'text-accent bg-accent-soft',
  },
  {
    key: 'achievement',
    label: '% Atingida geral',
    value: props.metrics?.achievementPct != null
      ? `${props.metrics.achievementPct.toFixed(1)}%`
      : '—',
    sub: aggregateModeLabel.value
      ? `Base ${aggregateModeLabel.value} · ${props.timeElapsedPct?.toFixed(0) ?? 0}% do tempo`
      : `${props.timeElapsedPct?.toFixed(0) ?? 0}% do tempo decorrido`,
    icon: 'fas fa-trophy',
    accent: gaugeAccentClass.value,
  },
  {
    key: 'ahead',
    label: 'Acima da meta',
    value: statusInsights.value.ahead,
    sub: `${pctOf(statusInsights.value.ahead)}% do total`,
    icon: 'fas fa-fire',
    accent: 'text-emerald-500 bg-emerald-500/10',
  },
  {
    key: 'risk',
    label: 'Em alerta + risco',
    value: statusInsights.value.behind + statusInsights.value.at_risk,
    sub: `${pctOf(statusInsights.value.behind + statusInsights.value.at_risk)}% precisam atenção`,
    icon: 'fas fa-triangle-exclamation',
    accent: 'text-amber-500 bg-amber-500/10',
  },
]);

const gaugeAccentClass = computed(() => {
  const c = gaugeColor.value;
  if (c === '#10B981') return 'text-emerald-500 bg-emerald-500/10';
  if (c === '#3B82F6') return 'text-blue-500 bg-blue-500/10';
  if (c === '#EAB308') return 'text-yellow-500 bg-yellow-500/10';
  if (c === '#EF4444') return 'text-red-500 bg-red-500/10';
  return 'text-ink-muted bg-surface-sunken';
});

const gaugeBadgeVariant = computed(() => {
  const c = gaugeColor.value;
  if (c === '#10B981') return 'success';
  if (c === '#3B82F6') return 'accent';
  if (c === '#EAB308') return 'warning';
  if (c === '#EF4444') return 'danger';
  return 'neutral';
});

const pctOf = (n) => {
  const t = statusInsights.value.total;
  return t > 0 ? Math.round((n / t) * 100) : 0;
};

// ── Status detail (formula explanation) ───
const STATUS_RULES = [
  { key: 'ahead',         icon: 'fas fa-fire',                   color: 'text-emerald-500',        rule: 'ratio ≥ 1.1',     desc: 'Realizando 10%+ acima do esperado para o tempo decorrido' },
  { key: 'on_track',      icon: 'fas fa-circle-check',           color: 'text-blue-500',           rule: '0.8 ≤ ratio < 1.1', desc: 'Performance dentro da margem esperada' },
  { key: 'behind',        icon: 'fas fa-triangle-exclamation',   color: 'text-yellow-500',         rule: '0.4 ≤ ratio < 0.8', desc: 'Atrás do esperado, requer atenção' },
  { key: 'at_risk',       icon: 'fas fa-skull',                  color: 'text-red-500',            rule: 'ratio < 0.4',     desc: 'Performance crítica, ação urgente necessária' },
  { key: 'no_sales',      icon: 'fas fa-ban',                    color: 'text-slate-500',          rule: 'sem vendas',      desc: 'Possui meta cadastrada mas nenhuma venda no período' },
  { key: 'no_projection', icon: 'fas fa-minus',                  color: 'text-slate-400',          rule: 'sem meta',        desc: 'Não possui projeção/meta cadastrada para o período' },
];

const closeModal = () => emit('close');
const openDetail = (row) => {
  emit('open-detail', row);
  emit('close');
};
</script>

<template>
  <Modal :open="open" size="full" @close="closeModal">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-chart-pie text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">Análise gráfica — Vendas × Projeção</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="font-mono text-ink">{{ statusInsights.total }}</span> empreendimento(s) ·
            <span class="font-mono text-ink">{{ metrics.achievementPct != null ? metrics.achievementPct.toFixed(1) + '%' : '—' }}</span> atingidos ·
            <span class="font-mono text-ink">{{ timeElapsedPct?.toFixed(0) ?? 0 }}%</span> do tempo
          </p>
        </div>
      </div>
    </template>

    <div class="-m-4 sm:-m-5 flex flex-col">

      <!-- Tabs -->
      <div class="px-4 sm:px-5 py-3 border-b border-line bg-surface-sunken/40">
        <SegmentedControl v-model="activeTab" :options="tabOptions" size="sm" class="overflow-x-auto" />
      </div>

      <!-- Conteúdo -->
      <div class="flex-1 overflow-y-auto max-h-[68vh]">

        <!-- ════════════════ TAB: VISÃO GERAL ════════════════ -->
        <div v-if="activeTab === 'overview'" class="p-4 sm:p-5 space-y-4">

          <!-- KPI Strip -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div v-for="k in overviewKpis" :key="k.key"
              class="flex items-center gap-3 p-3 rounded-xl border border-line bg-surface-raised
                     shadow-soft surface-gradient">
              <span class="h-10 w-10 rounded-lg grid place-items-center text-base shrink-0" :class="k.accent">
                <i :class="k.icon"></i>
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">{{ k.label }}</p>
                <p class="text-2xl font-semibold text-ink tabular-nums leading-tight mt-0.5 truncate">{{ k.value }}</p>
                <p class="text-[11px] text-ink-muted mt-0.5 truncate" :title="k.sub">{{ k.sub }}</p>
              </div>
            </div>
          </div>

          <!-- Charts row: Donut + Gauge -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <!-- Status Donut -->
            <Surface variant="raised" padding="md">
              <div class="flex items-center justify-between gap-2 mb-3">
                <div class="flex items-center gap-2 min-w-0">
                  <i class="fas fa-chart-pie text-accent text-sm"></i>
                  <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">Distribuição por status</h3>
                </div>
                <Badge variant="neutral" size="sm">
                  <span class="font-mono">{{ statusInsights.total }}</span>
                </Badge>
              </div>
              <VChart :option="statusDonutOption" autoresize style="height:280px;width:100%;" />
            </Surface>

            <!-- Achievement Gauge -->
            <Surface variant="raised" padding="md">
              <div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div class="flex items-center gap-2 min-w-0">
                  <i class="fas fa-bullseye text-accent text-sm"></i>
                  <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">% Atingida geral</h3>
                </div>
                <div class="flex items-center gap-2">
                  <Badge v-if="aggregateModeLabel" variant="accent" size="sm">
                    <i class="fas fa-sliders text-[9px] mr-1"></i>
                    Base {{ aggregateModeLabel }}
                  </Badge>
                  <Badge :variant="gaugeBadgeVariant" size="sm">
                    {{ timeElapsedPct?.toFixed(0) ?? 0 }}% do tempo
                  </Badge>
                </div>
              </div>

              <!-- Sem dados → estado vazio -->
              <div v-if="metrics.achievementPct == null"
                class="h-[260px] flex flex-col items-center justify-center gap-2 text-ink-subtle">
                <i class="fas fa-bullseye text-3xl opacity-40"></i>
                <p class="text-sm">Sem projeção definida</p>
                <p class="text-[11px] font-mono">Cadastre uma meta para ver o % atingida.</p>
              </div>

              <!-- Com dados -->
              <template v-else>
                <VChart :option="gaugeOption" autoresize style="height:240px;width:100%;" />
                <div class="flex items-center justify-center gap-3 -mt-2 text-[11px] font-mono">
                  <span class="inline-flex items-center gap-1.5 text-ink-muted">
                    <span class="w-3 h-1 rounded-full" :style="{ backgroundColor: gaugeColor }"></span>
                    Atingida
                  </span>
                  <span v-if="timeElapsedPct > 0" class="inline-flex items-center gap-1.5 text-ink-subtle">
                    <span class="inline-block w-1 h-3 rounded-sm bg-ink-subtle/60"></span>
                    Tempo decorrido ({{ timeElapsedPct.toFixed(0) }}%)
                  </span>
                </div>
              </template>
            </Surface>
          </div>

          <!-- Status detail (accordion) -->
          <Surface variant="raised" padding="md">
            <div class="flex items-center justify-between gap-2 mb-3">
              <div class="flex items-center gap-2 min-w-0">
                <i class="fas fa-list-ul text-accent text-sm"></i>
                <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">Detalhamento por status</h3>
              </div>
              <span class="text-[10px] text-ink-subtle font-mono">clique para expandir</span>
            </div>

            <div class="space-y-1.5">
              <div v-for="s in statusList" :key="s.key"
                class="rounded-lg border border-line bg-surface-sunken overflow-hidden">

                <!-- Linha principal (clicável) -->
                <button @click="toggleStatus(s.key)"
                  class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-hover transition-colors text-left">
                  <i class="fas fa-chevron-right text-[10px] text-ink-subtle transition-transform duration-200 shrink-0"
                    :class="{ 'rotate-90': expandedStatus.has(s.key) }"></i>
                  <div class="flex items-center gap-2 w-44 shrink-0">
                    <i :class="s.icon" class="text-xs" :style="{ color: s.color }"></i>
                    <span class="text-sm font-medium text-ink">{{ s.label }}</span>
                  </div>
                  <div class="flex-1 h-2 rounded-full bg-surface-raised overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500"
                      :style="{ width: pctOf(s.count) + '%', backgroundColor: s.color }"></div>
                  </div>
                  <div class="w-20 text-right shrink-0">
                    <span class="text-sm font-bold text-ink tabular-nums">{{ s.count }}</span>
                    <span class="text-[11px] text-ink-subtle font-mono ml-1">{{ pctOf(s.count) }}%</span>
                  </div>
                </button>

                <!-- Lista de empreendimentos expandível -->
                <transition
                  enter-active-class="transition-all duration-200 ease-out-expo overflow-hidden"
                  enter-from-class="opacity-0 max-h-0"
                  enter-to-class="opacity-100 max-h-[600px]"
                  leave-active-class="transition-all duration-150 ease-in overflow-hidden"
                  leave-from-class="opacity-100 max-h-[600px]"
                  leave-to-class="opacity-0 max-h-0">
                  <div v-show="expandedStatus.has(s.key)" class="border-t border-line bg-surface-raised">
                    <div v-if="!s.enterprises.length" class="px-4 py-3 text-xs text-ink-subtle italic text-center">
                      Nenhum empreendimento neste status.
                    </div>
                    <ul v-else class="divide-y divide-line max-h-72 overflow-y-auto">
                      <li v-for="ent in s.enterprises" :key="ent._row._key"
                        class="flex items-center gap-3 px-3 py-2 hover:bg-surface-hover transition-colors cursor-pointer"
                        @click="openDetail(ent._row)">
                        <span class="h-2 w-2 rounded-full shrink-0" :style="{ backgroundColor: s.color }"></span>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-1.5 min-w-0">
                            <p class="text-sm font-medium text-ink truncate">{{ ent.name }}</p>
                            <Badge v-if="ent.projectedAbs > 0" variant="neutral" size="sm" class="shrink-0">
                              {{ ent.modeLabel }}
                            </Badge>
                          </div>
                          <p class="text-[10px] text-ink-subtle font-mono mt-0.5 truncate">
                            {{ ent.count }} venda(s)
                            <template v-if="ent.projectedAbs > 0">
                              · {{ formatByMode(ent._row, ent.realizedAbs) }} /
                              {{ formatByMode(ent._row, ent.projectedAbs) }}
                            </template>
                            <template v-else-if="ent.realizedVgv > 0">
                              · {{ formatCurrency(ent.realizedVgv) }}
                            </template>
                          </p>
                        </div>
                        <span v-if="ent.ach != null"
                          class="text-sm font-bold tabular-nums shrink-0"
                          :style="{ color: s.color }">
                          {{ ent.ach.toFixed(1) }}%
                        </span>
                        <span v-else class="text-xs text-ink-subtle shrink-0">—</span>
                        <i class="fas fa-arrow-right text-[10px] text-ink-subtle shrink-0"></i>
                      </li>
                    </ul>
                  </div>
                </transition>
              </div>
            </div>
          </Surface>
        </div>

        <!-- ════════════════ TAB: COMPARAÇÃO ════════════════ -->
        <div v-if="activeTab === 'comparison'" class="p-4 sm:p-5 space-y-4">
          <Surface variant="raised" padding="md">
            <div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div class="flex items-center gap-2 min-w-0">
                <i class="fas fa-chart-column text-accent text-sm"></i>
                <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">
                  % Atingida por empreendimento
                </h3>
              </div>
              <Badge variant="neutral" size="sm">
                Top {{ comparisonData.length }} de {{ statusInsights.total }}
              </Badge>
            </div>

            <EmptyState v-if="!comparisonData.length"
              size="md" icon="fas fa-chart-column"
              title="Sem dados para comparar"
              description="Nenhum empreendimento possui projeção (VGV ou unidades) cadastrada no período." />

            <VChart v-else :option="comparisonChartOption" autoresize
              :style="{ height: Math.max(360, comparisonData.length * 36 + 60) + 'px', width: '100%' }" />

            <p v-if="comparisonData.length" class="text-[11px] text-ink-subtle mt-3 font-mono leading-relaxed">
              <i class="fas fa-circle-info text-[10px] mr-1"></i>
              Cada empreend. é avaliado pelo modo configurado (VGV ou Unidades).
              <span class="text-emerald-500 font-semibold">Verde</span>: acima da meta ·
              <span class="text-blue-500 font-semibold">Azul</span>: na meta ·
              <span class="text-yellow-500 font-semibold">Amarelo</span>: alerta ·
              <span class="text-red-500 font-semibold">Vermelho</span>: em risco.
              Hover mostra os valores absolutos.
            </p>
          </Surface>
        </div>

        <!-- ════════════════ TAB: RANKING ════════════════ -->
        <div v-if="activeTab === 'ranking'" class="p-4 sm:p-5 space-y-4">

          <EmptyState v-if="!rankableData.length"
            size="lg" icon="fas fa-ranking-star"
            title="Sem ranking disponível"
            description="É preciso ter ao menos um empreendimento com meta cadastrada para gerar ranking." />

          <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <!-- Top 5 acima da meta -->
            <Surface variant="raised" padding="md">
              <div class="flex items-center justify-between gap-2 mb-3">
                <div class="flex items-center gap-2 min-w-0">
                  <i class="fas fa-fire text-emerald-500 text-sm"></i>
                  <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">Acima ou na meta</h3>
                </div>
                <Badge variant="success" size="sm">
                  <i class="fas fa-arrow-up text-[9px]"></i>{{ topPerformers.length }}
                </Badge>
              </div>

              <div v-if="!topPerformers.length" class="py-6 text-center text-sm text-ink-subtle">
                <i class="fas fa-circle-info mr-1"></i>
                Nenhum empreendimento atingindo 80%+ da meta proporcional ao tempo.
              </div>

              <ul v-else class="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                <li v-for="(r, idx) in topPerformers" :key="r._key"
                  class="flex items-center gap-3 p-2.5 rounded-lg border border-line bg-surface-sunken
                         hover:bg-surface-hover hover:border-emerald-500/30 transition-colors cursor-pointer"
                  @click="openDetail(r)">
                  <span class="h-7 w-7 rounded-md grid place-items-center text-sm font-bold shrink-0
                               bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {{ idx + 1 }}
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <p class="text-sm font-medium text-ink truncate">{{ r.name }}</p>
                      <Badge variant="neutral" size="sm" class="shrink-0">{{ modeLabelOf(r) }}</Badge>
                    </div>
                    <p class="text-[11px] text-ink-subtle font-mono mt-0.5 truncate">
                      {{ formatByMode(r, realizedAbsOf(r)) }} / {{ formatByMode(r, projectedAbsOf(r)) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {{ r._ach.toFixed(1) }}%
                    </span>
                    <i class="fas fa-arrow-right text-xs text-ink-subtle"></i>
                  </div>
                </li>
              </ul>
            </Surface>

            <!-- Bottom 5 em risco -->
            <Surface variant="raised" padding="md">
              <div class="flex items-center justify-between gap-2 mb-3">
                <div class="flex items-center gap-2 min-w-0">
                  <i class="fas fa-skull text-red-500 text-sm"></i>
                  <h3 class="text-xs uppercase tracking-wider font-mono text-ink-muted">Em alerta ou risco</h3>
                </div>
                <Badge variant="danger" size="sm">
                  <i class="fas fa-arrow-down text-[9px]"></i>{{ worstPerformers.length }}
                </Badge>
              </div>

              <div v-if="!worstPerformers.length" class="py-6 text-center text-sm text-ink-subtle">
                <i class="fas fa-circle-check mr-1 text-emerald-500"></i>
                Nenhum empreendimento em alerta — todos próximos ou acima da meta.
              </div>

              <ul v-else class="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                <li v-for="(r, idx) in worstPerformers" :key="r._key"
                  class="flex items-center gap-3 p-2.5 rounded-lg border border-line bg-surface-sunken
                         hover:bg-surface-hover hover:border-red-500/30 transition-colors cursor-pointer"
                  @click="openDetail(r)">
                  <span class="h-7 w-7 rounded-md grid place-items-center text-sm font-bold shrink-0
                               bg-red-500/10 text-red-500 border border-red-500/20">
                    {{ idx + 1 }}
                  </span>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 min-w-0">
                      <p class="text-sm font-medium text-ink truncate">{{ r.name }}</p>
                      <Badge variant="neutral" size="sm" class="shrink-0">{{ modeLabelOf(r) }}</Badge>
                    </div>
                    <p class="text-[11px] text-ink-subtle font-mono mt-0.5 truncate">
                      {{ formatByMode(r, realizedAbsOf(r)) }} / {{ formatByMode(r, projectedAbsOf(r)) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-base font-bold text-red-500 tabular-nums">
                      {{ r._ach.toFixed(1) }}%
                    </span>
                    <i class="fas fa-arrow-right text-xs text-ink-subtle"></i>
                  </div>
                </li>
              </ul>
            </Surface>
          </div>
        </div>

        <!-- ════════════════ TAB: COMO FUNCIONA ════════════════ -->
        <div v-if="activeTab === 'how'" class="p-4 sm:p-5 space-y-4">

          <!-- Banner intro -->
          <div class="rounded-xl border border-accent/30 bg-accent-soft p-4 flex items-start gap-3">
            <i class="fas fa-lightbulb text-accent text-base mt-0.5 shrink-0"></i>
            <div class="text-sm text-ink-muted leading-relaxed">
              <strong class="text-ink">Como interpretar este relatório:</strong> os dados mostram quanto cada empreendimento
              <strong class="text-ink">realizou</strong> versus o <strong class="text-ink">planejado</strong> para o período.
              O cálculo considera vendas reais (Sienge), pipeline em workflow (CRM) e descontos de distratos.
            </div>
          </div>

          <!-- Fórmulas -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <!-- Realizado -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-500 grid place-items-center">
                  <i class="fas fa-money-bill-wave text-sm"></i>
                </span>
                <h3 class="text-sm font-semibold text-ink">Valor realizado</h3>
              </div>
              <div class="rounded-lg border border-line bg-surface-sunken p-3 font-mono text-xs text-ink leading-relaxed">
                <div>Realizado =</div>
                <div class="ml-3">+ Vendas autorizadas (Sienge)</div>
                <div class="ml-3">+ Pipeline workflow (CRM)</div>
                <div class="ml-3">− Distratos</div>
              </div>
              <ul class="text-xs text-ink-muted space-y-1.5">
                <li class="flex items-start gap-2"><i class="fas fa-circle-check text-emerald-500 mt-0.5 text-[10px]"></i>
                  <span>Vendas autorizadas vêm dos contratos emitidos no Sienge filtrados pelo período.</span></li>
                <li class="flex items-start gap-2"><i class="fas fa-circle-check text-emerald-500 mt-0.5 text-[10px]"></i>
                  <span>Workflow é o pipeline de reservas/repasses em fluxos selecionados nos filtros.</span></li>
                <li class="flex items-start gap-2"><i class="fas fa-circle-xmark text-red-500 mt-0.5 text-[10px]"></i>
                  <span>Distratos (status "distrato" no repasse) são descontados do total.</span></li>
              </ul>
            </Surface>

            <!-- Projetado -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-500 grid place-items-center">
                  <i class="fas fa-bullseye text-sm"></i>
                </span>
                <h3 class="text-sm font-semibold text-ink">Valor projetado</h3>
              </div>
              <div class="rounded-lg border border-line bg-surface-sunken p-3 font-mono text-xs text-ink leading-relaxed">
                <div>Projetado =</div>
                <div class="ml-3">VGV ou unidades cadastradas</div>
                <div class="ml-3">no módulo de Projeções</div>
                <div class="ml-3">por empreendimento × mês</div>
              </div>
              <ul class="text-xs text-ink-muted space-y-1.5">
                <li class="flex items-start gap-2"><i class="fas fa-circle-info text-sky-500 mt-0.5 text-[10px]"></i>
                  <span>Cada projeção define meta de unidades e/ou VGV por mês.</span></li>
                <li class="flex items-start gap-2"><i class="fas fa-circle-info text-sky-500 mt-0.5 text-[10px]"></i>
                  <span>Ao filtrar por período, soma as metas dos meses dentro do intervalo.</span></li>
              </ul>
            </Surface>

            <!-- % Atingida -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-500 grid place-items-center">
                  <i class="fas fa-percent text-sm"></i>
                </span>
                <h3 class="text-sm font-semibold text-ink">% Atingida</h3>
              </div>
              <div class="rounded-lg border border-line bg-surface-sunken p-3 font-mono text-xs text-ink leading-relaxed space-y-1.5">
                <div><span class="text-purple-500">Modo VGV</span> (padrão):</div>
                <div class="ml-3">% = VGV realizado ÷ VGV projetado</div>
                <div class="border-t border-line my-2"></div>
                <div><span class="text-violet-500">Modo Unidades</span>:</div>
                <div class="ml-3">% = vendas realizadas ÷ unid. projetadas</div>
              </div>
              <p class="text-xs text-ink-muted">
                <i class="fas fa-circle-info text-purple-500 text-[10px] mr-1"></i>
                Configurável globalmente ou por empreendimento via "Configurações de meta".
              </p>
            </Surface>

            <!-- Tempo decorrido / Ratio -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 grid place-items-center">
                  <i class="far fa-clock text-sm"></i>
                </span>
                <h3 class="text-sm font-semibold text-ink">Tempo decorrido & ratio</h3>
              </div>
              <div class="rounded-lg border border-line bg-surface-sunken p-3 font-mono text-xs text-ink leading-relaxed">
                <div>Tempo decorrido = dias passados ÷ dias do período</div>
                <div class="border-t border-line my-2"></div>
                <div>Ratio = % atingida ÷ % tempo decorrido</div>
                <div class="ml-3 text-ink-subtle">(quanto > 1, mais à frente da meta)</div>
              </div>
              <p class="text-xs text-ink-muted">
                <i class="fas fa-circle-info text-amber-500 text-[10px] mr-1"></i>
                Hoje é dia 15? Tempo decorrido = ~50%. Se atingiu 60%, ratio = 1.2 (acima da meta).
              </p>
            </Surface>
          </div>

          <!-- Status legend -->
          <Surface variant="raised" padding="md" class="space-y-3">
            <div class="flex items-center gap-2">
              <i class="fas fa-tag text-accent text-sm"></i>
              <h3 class="text-sm font-semibold text-ink">Como o status é determinado</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div v-for="rule in STATUS_RULES" :key="rule.key"
                class="flex items-start gap-3 p-3 rounded-lg border border-line bg-surface-sunken">
                <span class="h-9 w-9 rounded-lg grid place-items-center text-sm shrink-0 bg-surface-raised border border-line">
                  <i :class="[rule.icon, rule.color]"></i>
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-semibold text-ink">{{ STATUS_META[rule.key].label }}</span>
                    <code class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-raised border border-line text-ink-muted">
                      {{ rule.rule }}
                    </code>
                  </div>
                  <p class="text-xs text-ink-muted mt-1 leading-relaxed">{{ rule.desc }}</p>
                </div>
              </div>
            </div>
          </Surface>

          <!-- Distratos -->
          <Surface variant="raised" padding="md" class="space-y-3">
            <div class="flex items-center gap-2">
              <i class="fas fa-rotate-left text-red-500 text-sm"></i>
              <h3 class="text-sm font-semibold text-ink">Distratos</h3>
            </div>
            <p class="text-xs text-ink-muted leading-relaxed">
              Vendas que foram canceladas (distrato) <strong class="text-ink">não contam como venda</strong>.
              Aparecem como <span class="font-mono text-red-500 font-semibold">−N</span> na coluna de vendas e
              <span class="font-mono text-red-500 font-semibold">−R$</span> na coluna de valor, em vermelho,
              para deixar visível o impacto no resultado.
            </p>
            <p class="text-xs text-ink-muted leading-relaxed">
              <i class="fas fa-circle-info text-red-500 text-[10px] mr-1"></i>
              A coluna "Realizado" já é o valor <strong class="text-ink">líquido</strong> (após subtrair distratos).
            </p>
          </Surface>
        </div>
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" @click="closeModal">Fechar</Button>
    </template>
  </Modal>
</template>
