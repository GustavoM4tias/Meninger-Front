<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useStageCommissionRulesStore } from '@/stores/Comercial/Contracts/stageCommissionRulesStore';
import { useAwardsStore } from '@/stores/Comercial/Awards/awardStore';
import ChartActions from '@/components/config/ChartActions.vue';
import Export from '@/components/config/Export.vue';

import Modal from '@/components/UI/Modal.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { PieChart, BarChart } from 'echarts/charts';
import { TooltipComponent, LegendComponent, GridComponent, DataZoomComponent, TitleComponent, ToolboxComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([PieChart, BarChart, TooltipComponent, LegendComponent, GridComponent, DataZoomComponent, TitleComponent, ToolboxComponent, CanvasRenderer]);

const props = defineProps({
  enterprise: { type: Object, required: true },
  sales: { type: Array, required: true },
  initialMode: { type: String, default: 'list' },
  projectionRow: { type: Object, default: null },
  timeElapsedPct: { type: Number, default: 0 },
});

const emit = defineEmits(['close']);
const open = ref(false);

const contractsStore = useContractsStore();
const stageRulesStore = useStageCommissionRulesStore();
const awardsStore = useAwardsStore();

// Local helper — mirrors contractHadStageInHistory in contractsStore
const hadStageInHistory = (contract, stageId) => {
  const repasses = Array.isArray(contract?.repasse) ? contract.repasse : [];
  const stageNum = Number(stageId);
  if (!Number.isFinite(stageNum)) return false;
  for (const rp of repasses) {
    if (!rp) continue;
    if (Number(rp.idsituacao_repasse) === stageNum) return true;
    const history = Array.isArray(rp.status) ? rp.status : [];
    if (history.some((s) => Number(s?.idsituacao_repasse) === stageNum)) return true;
  }
  return false;
};

const viewMode = ref(['list', 'pie', 'bar'].includes(props.initialMode) ? props.initialMode : 'list');

// Helpers de Tema
const isDark = computed(() => document.documentElement.classList.contains('dark'));
const txt = computed(() => (isDark.value ? '#E5E7EB' : '#374151'));
const sub = computed(() => (isDark.value ? '#9CA3AF' : '#6B7280'));
const gridLine = computed(() => (isDark.value ? '#374151' : '#E5E7EB'));
const palette = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'];

const selectedSales = ref(new Set());
const lastAwardsMessage = ref('');

onMounted(() => {
  if (!awardsStore.awards?.length) {
    awardsStore.fetchAwards();
  }
});

const statusLabel = (s) =>
({
  iniciado: 'Iniciado',
  autorizacao: 'Em autorização',
  andamento: 'Em andamento',
  pago: 'Pago',
}[s] || '—');

const firstContractOf = (sale) => sale?.contracts?.[0] || {};
const repasseOf = (sale) => firstContractOf(sale)?.repasse?.[0] || null;
const reservaOf = (sale) => {
  const first = firstContractOf(sale);
  if (first?.reserva) return first.reserva;

  const r = first?.repasse?.[0];
  if (r?.reserva) return r.reserva;
  if (r?.reserva_obj) return r.reserva_obj;
  if (r?.reservaObj) return r.reservaObj;

  return null;
};

// chave estável da venda pra premiação
const saleKeyOf = (sale) => {
  if (!sale) return '';

  const first = firstContractOf(sale);

  const enterprisePart =
    first?.enterprise_id ??
    first?.enterprise_name ??
    props.enterprise?.id ??
    props.enterprise?.name ??
    '';

  const customerPart = sale.customer_id ?? customerNameOf(sale) ?? '';

  const unitPart = sale.unit_id ?? sale.unit_name ?? reservaUnitOf(sale) ?? '';

  const datePart =
    sale.financial_institution_date ??
    reservaDateOf(sale) ??
    '';

  return [enterprisePart, customerPart, unitPart, datePart]
    .map((v) => String(v ?? '').trim())
    .join('|');
};

const awardStatusBySaleKey = computed(() => {
  const map = new Map();
  for (const award of awardsStore.awards || []) {
    const status = award.status;
    if (!Array.isArray(award.links)) continue;
    award.links.forEach((link) => {
      if (!link?.saleKey) return;
      if (!map.has(link.saleKey)) {
        map.set(link.saleKey, { status, awardId: award.id });
      }
    });
  }
  return map;
});

const awardInfoForSale = (sale) => awardStatusBySaleKey.value.get(saleKeyOf(sale)) || null;
const awardStatusForSale = (sale) => awardInfoForSale(sale)?.status || null;
const saleHasAward = (sale) => !!awardInfoForSale(sale);

watch(awardStatusBySaleKey, (map) => {
  if (!map) return;
  const next = new Set(selectedSales.value);
  let changed = false;
  for (const key of Array.from(selectedSales.value)) {
    if (map.has(key)) {
      next.delete(key);
      changed = true;
    }
  }
  if (changed) selectedSales.value = next;
});

const sanitizeAwardField = (value) => {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '—') return null;
    return trimmed;
  }
  return value;
};

const normalizeCostCenterCode = (value) => {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length >= 5) return digits.slice(-5);
  return digits;
};

const extractCostCenterFromText = (value) => {
  if (!value) return null;
  const match = String(value).match(/(\d{5})/);
  return match ? match[1] : null;
};

const enterpriseCostCenterHint = computed(() =>
  normalizeCostCenterCode(
    props.enterprise?.cost_center_code ||
    extractCostCenterFromText(props.enterprise?.name)
  )
);

const toIsoDate = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const brMatch = raw.match(/^([0-3]\d)\/([01]\d)\/(\d{4})/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  const dt = new Date(raw);
  if (!Number.isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return null;
};

const saleDateIsoOf = (sale) =>
  toIsoDate(
    sale.financial_institution_date ||
    firstContractOf(sale)?.financial_institution_date ||
    reservaDateOf(sale)
  );

const costCenterOfSale = (sale) =>
  normalizeCostCenterCode(
    sale.cost_center ??
    sale.costCenter ??
    firstContractOf(sale)?.cost_center ??
    firstContractOf(sale)?.costCenter ??
    firstContractOf(sale)?.cost_center_id ??
    firstContractOf(sale)?.cost_centers?.[0]?.name ??
    sale.contracts?.[0]?.cost_center ??
    sale.contracts?.[0]?.costCenter ??
    sale.contracts?.[0]?.cost_center_id ??
    extractCostCenterFromText(firstContractOf(sale)?.enterprise_name) ??
    extractCostCenterFromText(sale.enterprise_name) ??
    enterpriseCostCenterHint.value ??
    firstContractOf(sale)?.enterprise_id ??
    null
  );

const customerNameOf = (sale) =>
  reservaOf(sale)?.titular?.nome ||
  sale?.customer_name ||
  reservaOf(sale)?.cliente?.nome ||
  reservaOf(sale)?.comprador ||
  '—';

const imobiliariaOf = (sale) => {
  const res = reservaOf(sale);
  const rep = repasseOf(sale);

  return (
    res?.corretor?.imobiliaria ||
    rep?.corretor?.imobiliaria ||
    sale?.contracts?.[0]?.corretor?.imobiliaria ||
    sale?.imobiliaria?.nomefantasia ||
    sale?.imobiliaria?.razaosocial ||
    rep?.imobiliaria?.nomefantasia ||
    rep?.imobiliaria?.razaosocial ||
    rep?.imobiliaria?.email ||
    rep?.imobiliaria?.cnpj ||
    '—'
  );
};

const brokerNameOf = (sale) => {
  const res = reservaOf(sale);
  const rep = repasseOf(sale);

  const c = [
    res?.corretor?.imobiliaria,
    rep?.corretor?.imobiliaria,
    sale?.contracts?.[0]?.corretor?.imobiliaria,
    sale?.imobiliaria?.nomefantasia,
    sale?.imobiliaria?.razaosocial,
    rep?.imobiliaria?.nomefantasia,
    rep?.imobiliaria?.razaosocial,
    rep?.imobiliaria?.email,
    rep?.imobiliaria?.cnpj,
  ].find((v) => typeof v === 'string' && v.trim());

  return c ? String(c).trim() : 'Sem imobiliária';
};

const repasseLinkOf = (sale) => {
  const idRep = repasseOf(sale)?.idrepasse;
  if (idRep) {
    return `https://menin.cvcrm.com.br/gestor/financeiro/repasses/${idRep}/administrar`;
  }
  const idRes = reservaOf(sale)?.idreserva || sale?.idreserva;
  if (idRes) {
    return `https://menin.cvcrm.com.br/gestor/comercial/reservas/${idRes}/administrar`;
  }
  return 'javascript:void(0)';
};

const repasseStatusOf = (sale) => {
  const r = repasseOf(sale);
  if (r) {
    const sr = (r.status_repasse ?? r.statusRepasse ?? '').toString().trim();
    if (sr) return sr;
    if (r.idsituacao_repasse != null) return `Situação #${r.idsituacao_repasse}`;
  }

  const res = reservaOf(sale);
  if (res) {
    const srr = (res.status_repasse ?? res.statusRepasse ?? '').toString().trim();
    if (srr) return srr;

    const srz = (res.status_reserva ?? res.statusReserva ?? '').toString().trim();
    if (srz) return srz;

    const sw = (res.status_workflow ?? '').toString().trim();
    if (sw) return sw;
  }

  const c = firstContractOf(sale);
  const pools = [
    c?.repasse_status_history,
    c?.repasse_history,
    c?.historico_repasse,
    c?.status_evolution,
    c?.repasse?.status_history,
    c?.reserva_status_history,
  ].filter(Array.isArray);

  for (const arr of pools) {
    const latest = [...arr].sort(
      (a, b) =>
        new Date(b.captured_at || b.data || 0) -
        new Date(a.captured_at || a.data || 0)
    )[0];

    const ls = (latest?.status_repasse ?? latest?.status ?? '').toString().trim();
    if (ls) return ls;
  }

  return null;
};

const repasseTooltipOf = (sale) => {
  const status = repasseStatusOf(sale) || '—';
  return `${status}`;
};

const empreendimentoOf = (sale) =>
  repasseOf(sale)?.empreendimento ??
  reservaOf(sale)?.empreendimento ??
  firstContractOf(sale)?.enterprise_name ??
  '—';

const etapaOf = (sale) =>
  repasseOf(sale)?.etapa ??
  reservaOf(sale)?.etapa ??
  reservaOf(sale)?.unidade_json?.etapa ??
  '—';

const blocoOf = (sale) =>
  repasseOf(sale)?.bloco ??
  reservaOf(sale)?.bloco ??
  reservaOf(sale)?.unidade_json?.quadra ??
  reservaOf(sale)?.unidade_json?.bloco ??
  '—';

const reservaUnitOf = (sale) =>
  reservaOf(sale)?.unidade ??
  reservaOf(sale)?.unidade_json?.nome ??
  firstContractOf(sale)?.unit_name ??
  sale?.unit_name ??
  '—';

const reservaDateOf = (sale) =>
  reservaOf(sale)?.data_reserva ??
  reservaOf(sale)?.data ??
  null;

/* ===================== utils ===================== */
const valueModeLabel = computed(() => contractsStore.valueModeLabel);

const toNumSafe = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const sumTR = (c) => {
  const pcs = Array.isArray(c.payment_conditions) ? c.payment_conditions : [];
  return pcs
    .filter((pc) => contractsStore._isTR(pc))
    .reduce((s, pc) => s + (Number(pc.total_value) || 0), 0);
};

const uplift = (base, pct) => (pct > 0 ? base * (pct / (1 - pct)) : 0);

const contractValueByMode = (contract) => {
  if (!contract) return 0;

  const pct = Number(contractsStore.enterpriseCommissionFor(contract)?.commission_pct) || 0;
  const rule = contractsStore.enterpriseRuleFor(contract) || {};

  let base = 0;

  if (contractsStore.isGross) {
    if (rule.gross === 'LAND_VALUE_ONLY') base = Number(contract.land_value) || 0;
    else base = toNumSafe(contractsStore._contractTotals(contract).gross);
  } else {
    if (rule.net === 'TR_ONLY') base = sumTR(contract);
    else if (rule.net === 'LAND_VALUE_ONLY') base = Number(contract.land_value) || 0;
    else base = toNumSafe(contractsStore._contractTotals(contract).net);
  }

  const add = pct > 0 ? uplift(base, pct) : 0;
  return base + (Number.isFinite(add) ? add : 0);
};

const saleValueFromConditions = (sale) => {
  const contracts = Array.isArray(sale?.contracts) ? sale.contracts : [];
  if (!contracts.length) return 0;
  if (selectedSerie.value) {
    return contracts.reduce((sum, c) => sum + contractValueForSerie(c, selectedSerie.value), 0);
  }
  return contracts.reduce((sum, c) => sum + contractValueByMode(c), 0);
};

const getSaleValue = (sale) => {
  if (!selectedSerie.value) {
    const direct = contractsStore.isGross ? sale?.total_value_gross : sale?.total_value_net;
    const d = Number(direct);
    if (Number.isFinite(d) && d > 0) return d;
  }
  return saleValueFromConditions(sale);
};

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v || 0);
const formatDate = (d) => {
  if (!d) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const isDiscount = (c) =>
  contractsStore.discountCodes.has(String(c?.condition_type_id || '').toUpperCase());

/* ===================== série filter ===================== */
const selectedSerie = ref('');

const seriesOptions = computed(() => {
  const map = new Map();
  let hasCommission = false;
  for (const sale of props.sales) {
    for (const contract of sale.contracts || []) {
      for (const pc of contract.payment_conditions || []) {
        const id = String(pc.condition_type_id || '').trim().toUpperCase();
        const name = String(pc.condition_type_name || pc.condition_type_id || '').trim();
        if (id && !map.has(id)) map.set(id, name);
      }
      if (!hasCommission && resolveCommissionPct(contract) > 0) {
        hasCommission = true;
      }
    }
  }
  const options = [...map.entries()]
    .map(([id, name]) => ({ id, label: name ? `${name} (${id})` : id }))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (hasCommission) {
    options.push({ id: 'COMISSAO_FORA', label: 'Comissão Fora do Contrato (COMISSAO_FORA)' });
  }
  return options;
});

const serieSelectOptions = computed(() => [
  { value: '', label: 'Todas as séries' },
  ...seriesOptions.value.map(s => ({ value: s.id, label: s.label })),
]);

const itemsPerPageOptions = [
  { value: 10, label: '10 / pág.' },
  { value: 25, label: '25 / pág.' },
  { value: 50, label: '50 / pág.' },
  { value: 100, label: '100 / pág.' },
];

const contractValueForSerie = (contract, serieId) => {
  if (!serieId) return contractValueByMode(contract);

  if (serieId === 'COMISSAO_FORA') {
    const pct = resolveCommissionPct(contract);
    if (pct <= 0) return 0;
    const base = contractsStore.isGross ? baseGross(contract) : baseNet(contract);
    return uplift(base, pct);
  }

  const rule = contractsStore.enterpriseRuleFor(contract) || {};
  const pcs = Array.isArray(contract?.payment_conditions) ? contract.payment_conditions : [];
  const matching = pcs.filter(
    (pc) => String(pc.condition_type_id || '').trim().toUpperCase() === serieId
  );
  if (!matching.length) return 0;

  const serieTotal = matching.reduce((s, pc) => s + (Number(pc.total_value) || 0), 0);

  if (serieId === 'TR') {
    if (contractsStore.isGross && rule.gross === 'LAND_VALUE_ONLY') return Number(contract.land_value) || 0;
    if (contractsStore.isNet && rule.net === 'LAND_VALUE_ONLY') return Number(contract.land_value) || 0;
  }

  return serieTotal;
};

/* ===================== busca/paginação ===================== */
const searchTerm = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(25);
const expandedSales = ref(new Set());

const normalizedSearch = computed(() => (searchTerm.value || '').toLowerCase());
const filteredSales = computed(() => {
  let list = props.sales;

  if (selectedSerie.value) {
    if (selectedSerie.value === 'COMISSAO_FORA') {
      list = list.filter((sale) =>
        (sale.contracts || []).some((contract) => resolveCommissionPct(contract) > 0)
      );
    } else {
      list = list.filter((sale) =>
        (sale.contracts || []).some((contract) =>
          (contract.payment_conditions || []).some(
            (pc) => String(pc.condition_type_id || '').trim().toUpperCase() === selectedSerie.value
          )
        )
      );
    }
  }

  if (!normalizedSearch.value) return list;
  const t = normalizedSearch.value;
  const has = (s = '') => String(s ?? '').toLowerCase().includes(t);

  return list.filter((sale) => {
    return (
      has(customerNameOf(sale)) ||
      has(sale.unit_name) ||
      has(reservaUnitOf(sale)) ||
      has(sale.contracts?.[0]?.associates?.[0]?.name) ||
      has(blocoOf(sale)) ||
      has(etapaOf(sale)) ||
      has(empreendimentoOf(sale)) ||
      has(repasseStatusOf(sale)) ||
      has(imobiliariaOf(sale)) ||
      has(formatDate(sale.financial_institution_date || reservaDateOf(sale))) ||
      has(formatCurrency(getSaleValue(sale)))
    );
  });
});

const showLandOnlyNote = computed(() =>
  (filteredSales.value ?? []).some((s) =>
    (s.contracts ?? []).some((c) => {
      const r = contractsStore.enterpriseRuleFor(c);
      return (
        (contractsStore.isGross && r?.gross === 'LAND_VALUE_ONLY') ||
        (contractsStore.isNet && r?.net === 'LAND_VALUE_ONLY')
      );
    })
  )
);

const totalSales = computed(() => filteredSales.value.length);

const totalValue = computed(() =>
  filteredSales.value.reduce((s, sale) => s + Number(getSaleValue(sale) || 0), 0)
);

const avgTicket = computed(() =>
  totalSales.value ? totalValue.value / totalSales.value : 0
);

const uniqueCustomers = computed(
  () =>
    new Set(
      filteredSales.value.map((s) => s.customer_id || customerNameOf(s))
    ).size
);

const totalPages = computed(
  () => Math.ceil(filteredSales.value.length / itemsPerPage.value) || 1
);
const startItem = computed(
  () => (currentPage.value - 1) * itemsPerPage.value + 1
);
const endItem = computed(() =>
  Math.min(currentPage.value * itemsPerPage.value, filteredSales.value.length)
);
const paginatedSales = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredSales.value.slice(start, start + Number(itemsPerPage.value));
});
const visiblePages = computed(() => {
  const max = 5;
  let start = Math.max(1, currentPage.value - Math.floor(max / 2));
  let end = Math.min(totalPages.value, start + max - 1);
  if (end - start + 1 < max) start = Math.max(1, end - max + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

const hasRepasse = computed(() =>
  paginatedSales.value.some(
    (s) => s.contracts?.[0]?.repasse?.[0] || s.contracts?.[0]?.reserva
  )
);

watch([searchTerm, itemsPerPage, selectedSerie], () => {
  currentPage.value = 1;
});
watch(
  () => props.sales,
  () => {
    expandedSales.value.clear();
    selectedSerie.value = '';
  }
);

const toggleDetails = (sale) => {
  const key = `${sale.customer_id}-${sale.unit_name}`;
  const next = new Set(expandedSales.value);
  next.has(key) ? next.delete(key) : next.add(key);
  expandedSales.value = next;
};

const saleIsProjection = (sale) =>
  (sale.contracts || []).every((c) => c._projection);

/* ===================== detalhe/condições ===================== */
const displayedConditions = (contract) => {
  const landOnly = contractsStore.isLandOnlyForContract(contract);
  const lv = Number(contract?.land_value) || 0;

  let list;
  if (landOnly && lv > 0) {
    list = [
      {
        condition_type_id: 'TR',
        condition_type_name: 'Terreno (TR) Campo de Observação',
        total_value: lv,
        installments_number: 1,
        synthetic: true,
      },
    ];
  } else {
    list = Array.isArray(contract?.payment_conditions)
      ? contract.payment_conditions
      : [];
  }

  const commission = commissionConditionFor(contract);
  if (commission && !list.some((pc) => pc.condition_type_id === 'COMISSAO_FORA')) {
    list = [...list, commission];
  }

  if (selectedSerie.value) {
    list = list.map((pc) => ({
      ...pc,
      _dimmed: String(pc.condition_type_id || '').trim().toUpperCase() !== selectedSerie.value,
    }));
  }

  return list;
};

const ruleFor = computed(() => contractsStore.enterpriseRuleFor);
const comFor = computed(() => contractsStore.enterpriseCommissionFor);
const totalsOf = computed(() => contractsStore._contractTotals);

/* ===================== comparison view (projection context) ===================== */
const achievementPctUnits = computed(() => {
  if (!props.projectionRow?.projectedUnits) return null;
  return parseFloat((totalSales.value / props.projectionRow.projectedUnits * 100).toFixed(1));
});

const achievementPctVgv = computed(() => {
  if (!props.projectionRow?.projectedVgv) return null;
  return parseFloat((totalValue.value / props.projectionRow.projectedVgv * 100).toFixed(1));
});

function achievementBarColor(pct) {
  if (pct == null) return 'bg-surface-sunken';
  const elapsed = props.timeElapsedPct || 0;
  const ratio = elapsed > 0 ? pct / elapsed : (pct >= 100 ? 1.2 : 0.5);
  if (ratio >= 1.1) return 'bg-emerald-500';
  if (ratio >= 0.8) return 'bg-blue-500';
  if (ratio >= 0.4) return 'bg-yellow-500';
  return 'bg-red-500';
}

function achievementTextColor(pct) {
  if (pct == null) return 'text-ink-subtle';
  const elapsed = props.timeElapsedPct || 0;
  const ratio = elapsed > 0 ? pct / elapsed : (pct >= 100 ? 1.2 : 0.5);
  if (ratio >= 1.1) return 'text-emerald-600 dark:text-emerald-400';
  if (ratio >= 0.8) return 'text-accent';
  if (ratio >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

const baseGross = (c) => {
  const r = ruleFor.value(c) || {};
  if (r.gross === 'LAND_VALUE_ONLY') return Number(c.land_value) || 0;
  return totalsOf.value(c).gross || 0;
};
const baseNet = (c) => {
  const r = ruleFor.value(c) || {};
  if (r.net === 'TR_ONLY') return sumTR(c);
  if (r.net === 'LAND_VALUE_ONLY') return Number(c.land_value) || 0;
  return totalsOf.value(c).net || 0;
};

const resolveCommissionPct = (contract) => {
  const hardcoded = comFor.value(contract);
  if (hardcoded) {
    const p = Number(hardcoded.commission_pct) || 0;
    if (p > 0) return p;
  }
  if (contract?._projection) return 0;
  const eid = Number(contract?.enterprise_id);
  if (!Number.isFinite(eid) || eid <= 0) return 0;
  const dynamicRules = stageRulesStore.rulesByEnterprise.get(eid) || [];
  for (const rule of dynamicRules) {
    if (hadStageInHistory(contract, rule.stage_id)) {
      return Number(rule.commission_pct) || 0;
    }
  }
  return 0;
};

const commissionConditionFor = (contract) => {
  const pct = resolveCommissionPct(contract);
  if (pct <= 0) return null;

  const base = contractsStore.isGross ? baseGross(contract) : baseNet(contract);
  const add = uplift(base, pct);
  if (add <= 0) return null;

  const pctLabel = Math.round(pct * 100);
  return {
    condition_type_id: 'COMISSAO_FORA',
    condition_type_name: `Comissão ${pctLabel}% (Fora de contrato)`,
    total_value: add,
    installments_number: 1,
    synthetic: false,
    _isCommission: true,
  };
};

/* Seleção e envio para premiação */
const selectedSalesPayload = computed(() => {
  const allSales = props.sales || [];
  const list = [];

  for (const key of selectedSales.value) {
    if (awardStatusBySaleKey.value.has(key)) continue;

    const sale =
      allSales.find((s) => saleKeyOf(s) === key) ||
      paginatedSales.value.find((s) => saleKeyOf(s) === key);

    if (!sale) continue;

    const first = firstContractOf(sale);

    list.push({
      saleKey: key,
      customerId: sale.customer_id || null,
      customerName: customerNameOf(sale),
      unitId: sale.unit_id || null,
      unitName: sale.unit_name || reservaUnitOf(sale),
      enterpriseId: first.enterprise_id,
      enterpriseName: first.enterprise_name,
      saleValue: getSaleValue(sale),
      stage: sanitizeAwardField(etapaOf(sale)),
      block: sanitizeAwardField(blocoOf(sale)),
      costCenter: costCenterOfSale(sale),
      saleDate: saleDateIsoOf(sale),
    });
  }

  return list;
});

const toggleSaleSelection = (sale) => {
  if (saleHasAward(sale)) return;
  const key = saleKeyOf(sale);
  const next = new Set(selectedSales.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  selectedSales.value = next;
};

const registerAwards = async () => {
  if (selectedSalesPayload.value.length === 0) return;

  try {
    lastAwardsMessage.value = '';

    await awardsStore.registerSalesForAward(selectedSalesPayload.value);
    await awardsStore.fetchAwards();
    await contractsStore.fetchContracts();

    selectedSales.value = new Set();
    lastAwardsMessage.value = 'Clientes adicionados à premiação com sucesso.';
    emit('close');
  } catch (err) {
    console.error('Erro ao registrar premiação:', err);
    lastAwardsMessage.value = 'Erro ao adicionar clientes à premiação.';
  }
};

const keyOf = (n) =>
  (n || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const rowsByBroker = computed(() => {
  const map = new Map();
  for (const sale of filteredSales.value) {
    const name = brokerNameOf(sale);
    const key = keyOf(name);
    const prev = map.get(key) ?? { name, count: 0, value: 0 };
    const v = Number(getSaleValue(sale) || 0);
    prev.count += 1;
    prev.value += v;
    map.set(key, prev);
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
});

const baseTooltip = computed(() => ({
  trigger: 'item',
  confine: true,
  appendToBody: true,
  extraCssText: 'max-width:260px; white-space:normal; font-size:12px; line-height:1.2; padding:6px 8px;',
}));

const chartOption = computed(() => {
  if (viewMode.value === 'pie') {
    return {
      color: palette,
      tooltip: {
        ...baseTooltip.value,
        trigger: 'item',
        formatter: (p) =>
          `${p.name}<br/><b>${formatCurrency(p.value)}</b> (${p.percent}%)`,
      },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        left: 'left',
        top: 'middle',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 6,
        textStyle: { fontSize: 11, color: txt.value },
        pageTextStyle: { color: sub.value },
        pageIconColor: sub.value,
        pageIconInactiveColor: gridLine.value,
      },
      series: [
        {
          name: 'Vendas por Imobiliária',
          type: 'pie',
          radius: ['40%', '70%'],
          padAngle: 1,
          itemStyle: { borderRadius: 6, borderColor: 'transparent', borderWidth: 0 },
          label: { show: false },
          emphasis: { label: { show: true, fontWeight: 'bold', color: txt.value } },
          data: rowsByBroker.value.map((r) => ({
            name: r.name,
            value: r.value,
            _rawCount: r.count,
          })),
        },
      ],
    };
  }

  return {
    color: palette,
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'shadow' },
      valueFormatter: (v) => formatCurrency(v),
      extraCssText: 'max-width:320px; white-space:normal; font-size:12px; line-height:1.2; padding:6px 8px;',
    },
    grid: { left: 32, right: 32, top: 42, bottom: 64, containLabel: true },
    dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 20 }],
    xAxis: {
      type: 'category',
      data: rowsByBroker.value.map((r) => r.name),
      axisLabel: {
        interval: 0,
        rotate: 20,
        fontSize: 10,
        color: txt.value,
        formatter: (val) => (val.length > 15 ? val.slice(0, 15) + '…' : val),
      },
      axisLine: { lineStyle: { color: sub.value } },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 10,
        color: txt.value,
        formatter: (v) =>
          new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(v),
      },
      splitLine: { lineStyle: { color: gridLine.value } },
    },
    series: [
      {
        name: `Valor (${valueModeLabel.value})`,
        type: 'bar',
        barWidth: '60%',
        data: rowsByBroker.value.map((r) => ({
          value: r.value,
          count: r.count,
        })),
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        emphasis: { focus: 'series' },
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          color: sub.value,
          formatter: (p) => `${p.data.count}`,
        },
      },
    ],
  };
});

const onChartClick = (params) => {
  if (params && params.name) {
    searchTerm.value = params.name;
  }
};

// ── Bridges para SegmentedControl ──────────────────────────
const valueModeOptions = [
  { value: 'net',   label: 'VGV' },
  { value: 'gross', label: 'VGV+DC' },
];

const valueModeProxy = computed({
  get: () => contractsStore.valueMode,
  set: (v) => contractsStore.setValueMode(v),
});

const viewModeOptions = computed(() => {
  const opts = [
    { value: 'list', label: 'Listagem', icon: 'fas fa-list' },
    { value: 'pie',  label: 'Pizza',    icon: 'fas fa-chart-pie' },
    { value: 'bar',  label: 'Colunas',  icon: 'fas fa-chart-column' },
  ];
  if (props.projectionRow) {
    opts.push({ value: 'comparison', label: 'Comparação', icon: 'fas fa-bullseye' });
  }
  return opts;
});

// KPI Strip
const kpiCards = computed(() => [
  { key: 'total',   label: 'Total de vendas',   value: totalSales.value,                   sub: 'no período',                              icon: 'fas fa-chart-line',     accent: 'text-accent bg-accent-soft', mono: true },
  { key: 'value',   label: `Valor total ${valueModeLabel.value}`, value: formatCurrency(totalValue.value),     sub: showLandOnlyNote.value ? 'Cálculo pelo "Observação"' : (contractsStore.isNet ? 'VGV (descontos ignorados)' : 'VGV + DC (descontos somam)'),  icon: contractsStore.isNet ? 'fas fa-money-bill-wave' : 'fas fa-sack-dollar', accent: 'text-emerald-500 bg-emerald-500/10' },
  { key: 'ticket',  label: `Ticket médio ${valueModeLabel.value}`, value: formatCurrency(avgTicket.value),      sub: 'valor médio por venda',                   icon: 'fas fa-receipt',        accent: 'text-purple-500 bg-purple-500/10' },
  { key: 'clients', label: 'Clientes únicos',   value: uniqueCustomers.value,              sub: 'pessoas distintas',                       icon: 'fas fa-users',          accent: 'text-amber-500 bg-amber-500/10', mono: true },
]);

const closeModal = () => emit('close');
</script>

<template>
  <Modal :open="true" size="full" hide-close @close="closeModal">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-chart-line text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">{{ enterprise.name }}</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="font-mono text-ink">{{ totalSales }}</span> venda(s) ·
            <span class="font-mono text-ink">{{ formatCurrency(totalValue) }}</span> ·
            <span class="font-mono text-ink">{{ uniqueCustomers }}</span> cliente(s)
          </p>
        </div>
        <IconButton icon="fas fa-download" size="sm" label="Exportar dados"
          class="ml-auto shrink-0" @click="open = true" />
      </div>
    </template>

    <div class="-m-4 sm:-m-5 flex flex-col">

      <!-- Toolbar de modos -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 px-4 sm:px-5 py-3 border-b border-line bg-surface-sunken/40">
        <SegmentedControl v-model="valueModeProxy" :options="valueModeOptions" size="sm" />
        <SegmentedControl v-model="viewMode" :options="viewModeOptions" size="sm" class="overflow-x-auto" />
      </div>

      <!-- Conteúdo scrollável -->
      <div class="flex-1 overflow-y-auto max-h-[68vh]">

        <!-- KPI Strip -->
        <div class="px-4 sm:px-5 py-4 border-b border-line">
          <div class="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible no-scrollbar">
            <div class="flex sm:grid gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4 min-w-max sm:min-w-0">
              <div v-for="k in kpiCards" :key="k.key"
                class="flex items-center gap-3 p-3 rounded-xl border border-line bg-surface-raised
                       shadow-soft hover:shadow-elevated hover:border-accent/30 hover:-translate-y-0.5
                       transition-all duration-200 ease-out-expo
                       w-56 sm:w-auto shrink-0 surface-gradient">
                <span class="h-10 w-10 rounded-lg grid place-items-center text-sm shrink-0" :class="k.accent">
                  <i :class="k.icon"></i>
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">{{ k.label }}</p>
                  <p class="text-xl font-semibold text-ink leading-tight tracking-tight mt-0.5 truncate"
                    :class="k.mono ? 'tabular-nums' : 'tabular-nums'">
                    {{ k.value }}
                  </p>
                  <p class="text-[11px] text-ink-muted mt-0.5 truncate" :title="k.sub">{{ k.sub }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Search + filtros -->
        <div class="px-4 sm:px-5 py-3 border-b border-line bg-surface-sunken/30">
          <div class="grid grid-cols-1 lg:grid-cols-[1fr_14rem_10rem] gap-3 items-end">
            <div>
              <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
                <i class="fas fa-magnifying-glass text-[10px] mr-1 text-ink-subtle"></i>
                Busca livre
              </label>
              <Input v-model="searchTerm"
                placeholder="Cliente · imobiliária · repasse · empreendimento · etapa · bloco · unidade · data · valor"
                iconLeft="fas fa-magnifying-glass" />
            </div>
            <Select v-model="selectedSerie" :options="serieSelectOptions" label="Série" />
            <Select v-model="itemsPerPage" :options="itemsPerPageOptions" label="Itens" />
          </div>
        </div>

        <!-- ── COMPARAÇÃO ─────────────────────────────────────────── -->
        <div v-if="viewMode === 'comparison' && projectionRow"
          class="p-4 sm:p-5 border-b border-line space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h4 class="text-sm font-semibold text-ink">Realizado × Projetado</h4>
            <span class="text-xs text-ink-subtle font-mono">
              {{ timeElapsedPct > 0 ? `${timeElapsedPct.toFixed(0)}% do mês decorrido` : 'Início do período' }}
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Unidades -->
            <Surface variant="raised" padding="md">
              <div class="flex items-center gap-2 mb-3">
                <i class="fas fa-key text-violet-500"></i>
                <span class="text-sm font-semibold text-ink">Vendas (unidades)</span>
              </div>
              <div class="flex items-end gap-1 mb-1">
                <span class="text-3xl font-bold text-ink tabular-nums">{{ totalSales }}</span>
                <span class="text-base text-ink-subtle mb-0.5 font-mono">/ {{ projectionRow.projectedUnits || '—' }}</span>
              </div>
              <p class="text-xs text-ink-subtle mb-3">realizadas / projetadas</p>
              <div class="w-full h-2.5 bg-surface-sunken rounded-full overflow-hidden mb-1">
                <div class="h-full rounded-full transition-all duration-500"
                  :class="achievementBarColor(achievementPctUnits)"
                  :style="{ width: Math.min(achievementPctUnits ?? 0, 100) + '%' }"></div>
              </div>
              <div class="flex items-center justify-between text-xs mt-1">
                <span class="font-semibold tabular-nums" :class="achievementTextColor(achievementPctUnits)">
                  {{ achievementPctUnits != null ? achievementPctUnits.toFixed(1) + '%' : '—' }}
                </span>
                <span v-if="timeElapsedPct > 0" class="text-ink-subtle font-mono">
                  meta parcial: {{ projectionRow.projectedUnits ? Math.ceil(projectionRow.projectedUnits * timeElapsedPct / 100) : '—' }} un.
                </span>
              </div>
            </Surface>

            <!-- VGV -->
            <Surface variant="raised" padding="md">
              <div class="flex items-center gap-2 mb-3">
                <i class="fas fa-bullseye text-sky-500"></i>
                <span class="text-sm font-semibold text-ink">{{ valueModeLabel }}</span>
              </div>
              <div class="flex items-end gap-1 mb-1">
                <span class="text-xl font-bold text-ink tabular-nums">{{ formatCurrency(totalValue) }}</span>
              </div>
              <p class="text-xs text-ink-subtle mb-1 font-mono">de {{ formatCurrency(projectionRow.projectedVgv || 0) }} projetado</p>
              <div class="w-full h-2.5 bg-surface-sunken rounded-full overflow-hidden mb-1">
                <div class="h-full rounded-full transition-all duration-500"
                  :class="achievementBarColor(achievementPctVgv)"
                  :style="{ width: Math.min(achievementPctVgv ?? 0, 100) + '%' }"></div>
              </div>
              <div class="flex items-center justify-between text-xs mt-1">
                <span class="font-semibold tabular-nums" :class="achievementTextColor(achievementPctVgv)">
                  {{ achievementPctVgv != null ? achievementPctVgv.toFixed(1) + '%' : '—' }}
                </span>
                <span v-if="timeElapsedPct > 0 && projectionRow.projectedVgv" class="text-ink-subtle font-mono">
                  meta parcial: {{ formatCurrency(projectionRow.projectedVgv * timeElapsedPct / 100) }}
                </span>
              </div>
            </Surface>
          </div>

          <!-- Time-elapsed reference -->
          <div v-if="timeElapsedPct > 0" class="flex items-center gap-3 text-xs text-ink-subtle font-mono">
            <span class="flex-none">0%</span>
            <div class="relative flex-1 h-1 bg-surface-sunken rounded-full">
              <div class="absolute top-0 left-0 h-full bg-accent/60 rounded-full"
                :style="{ width: timeElapsedPct + '%' }"></div>
              <div class="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-accent rounded-full border border-surface-raised"
                :style="{ left: 'calc(' + timeElapsedPct + '% - 4px)' }"></div>
            </div>
            <span class="flex-none">100%</span>
            <span class="flex-none text-accent font-semibold">{{ timeElapsedPct.toFixed(0) }}% do mês</span>
          </div>
        </div>

        <!-- ── CHARTS (pie / bar) ───────────────────────────────── -->
        <div v-if="viewMode === 'pie' || viewMode === 'bar'"
          class="p-4 sm:p-5 border-b border-line">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span v-if="searchTerm"
                class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-accent-soft text-accent border border-accent/20">
                Filtro: {{ searchTerm }}
                <button @click="searchTerm = ''" class="hover:text-accent-hover">
                  <i class="fas fa-times text-[10px]"></i>
                </button>
              </span>
              <span v-else class="text-xs text-ink-subtle">Clique no gráfico para filtrar a lista abaixo.</span>
            </div>
            <ChartActions :filename="`vendas-${viewMode}`" />
          </div>
          <div class="rounded-xl border border-line bg-surface-raised p-3 surface-gradient">
            <VChart :option="chartOption" autoresize style="height:360px;width:100%;" @click="onChartClick" />
          </div>
        </div>

        <!-- ── EXPORT MODAL ───────────────────────────────────── -->
        <Export v-model="open" :source="filteredSales" title="Vendas"
          :subtitle="enterprise?.name || ''"
          initial-delimiter=";" initial-array-mode="join"
          :filters="{
            'Empreendimento': enterprise?.name,
            'Busca': searchTerm,
            'Série': selectedSerie,
          }"
          :preselect="[
            'customer_id', 'customer_name', 'unit_name', 'enterprise_name',
            'financial_institution_date', 'total_value_gross', 'total_value_net',
            'contracts.contract_id'
          ]" />

        <!-- ── LIST (sempre visível) ─────────────────────────── -->
        <div class="p-4 sm:p-5">

          <EmptyState v-if="!paginatedSales.length"
            icon="fas fa-file-invoice" title="Nenhuma venda encontrada"
            description="Ajuste os filtros, a busca ou a série para ver resultados." />

          <div v-else class="space-y-2">
            <article v-for="sale in paginatedSales" :key="`${sale.customer_id ?? ''}-${sale.unit_name}`"
              class="rounded-xl border bg-surface-raised overflow-hidden transition-all duration-200 ease-out-expo
                     hover:shadow-soft hover:border-accent/30"
              :class="saleIsProjection(sale)
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-line surface-gradient'">

              <!-- Linha principal -->
              <div class="px-3 sm:px-4 py-3 cursor-pointer" @click="toggleDetails(sale)">
                <div class="flex items-start gap-3">
                  <!-- Avatar/ícone -->
                  <div class="h-9 w-9 shrink-0 rounded-lg grid place-items-center text-sm border"
                    :class="saleIsProjection(sale)
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-accent-soft text-accent border-accent/20'">
                    <i :class="saleIsProjection(sale) ? 'fas fa-chart-line' : 'fas fa-handshake'"></i>
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2 flex-wrap">
                      <div class="min-w-0">
                        <h4 class="text-sm font-semibold text-ink truncate">
                          {{ customerNameOf(sale) }}
                          <span v-if="sale.customer_id" class="ml-1 text-[11px] text-ink-subtle font-mono">
                            #{{ sale.customer_id }}
                          </span>
                        </h4>
                        <p v-if="sale.contracts?.[0]?.associates?.[0]"
                          class="text-[11px] text-ink-subtle truncate font-mono">
                          {{ sale.contracts[0].associates[0].name }} #{{ sale.contracts[0].associates[0].customer_id }}
                        </p>
                      </div>
                      <div class="flex items-center gap-2 shrink-0">
                        <Badge v-if="saleIsProjection(sale)" variant="success" size="sm">
                          <i class="fas fa-chart-line text-[9px]"></i>Projeção
                        </Badge>
                        <Badge v-if="awardStatusForSale(sale)" variant="accent" size="sm"
                          v-tippy="`Premiação: ${statusLabel(awardStatusForSale(sale))}`">
                          <i class="fas fa-trophy text-[9px]"></i>{{ statusLabel(awardStatusForSale(sale)) }}
                        </Badge>
                        <span class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {{ formatCurrency(getSaleValue(sale)) }}
                        </span>
                      </div>
                    </div>

                    <!-- Linha 2: metadados -->
                    <div class="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <span v-if="hasRepasse" class="inline-flex items-center gap-1.5 max-w-[200px] truncate">
                        <i class="fas fa-store text-[10px] text-indigo-500"></i>
                        {{ imobiliariaOf(sale) }}
                      </span>
                      <a v-if="hasRepasse" :href="repasseLinkOf(sale)" target="_blank" rel="noopener"
                        @click.stop
                        class="inline-flex items-center gap-1.5 max-w-[180px] truncate hover:text-accent transition-colors"
                        v-tippy="repasseTooltipOf(sale)">
                        <img src="/CVLogo.png" alt="CV CRM" class="h-3.5 grayscale hover:grayscale-0" />
                        <span class="truncate">{{ repasseStatusOf(sale) || '—' }}</span>
                      </a>
                      <span v-if="hasRepasse" class="inline-flex items-center gap-1.5 max-w-[200px] truncate">
                        <i class="fas fa-building text-[10px] text-cyan-500"></i>
                        {{ empreendimentoOf(sale) }}
                      </span>
                      <span v-if="hasRepasse && etapaOf(sale) !== '—'" class="inline-flex items-center gap-1.5">
                        <i class="fas fa-layer-group text-[10px] text-purple-500"></i>
                        {{ etapaOf(sale) }}
                      </span>
                      <span v-if="hasRepasse && blocoOf(sale) !== '—'" class="inline-flex items-center gap-1.5">
                        <i class="fas fa-cube text-[10px] text-amber-500"></i>
                        {{ blocoOf(sale) }}
                      </span>
                      <span class="inline-flex items-center gap-1.5">
                        <i class="fas fa-hashtag text-[10px] text-rose-500"></i>
                        <span class="font-mono">{{ sale.unit_name || reservaUnitOf(sale) }}</span>
                      </span>
                      <span class="inline-flex items-center gap-1.5">
                        <i class="far fa-calendar text-[10px] text-orange-500"></i>
                        <span class="font-mono">{{ formatDate(sale.financial_institution_date || reservaDateOf(sale)) }}</span>
                      </span>
                    </div>
                  </div>

                  <i class="fas fa-chevron-down text-xs text-ink-subtle mt-2 transition-transform"
                    :class="{ 'rotate-180': expandedSales.has(`${sale.customer_id}-${sale.unit_name}`) }"></i>
                </div>
              </div>

              <!-- Linha expandida: contratos + condições -->
              <div v-if="expandedSales.has(`${sale.customer_id}-${sale.unit_name}`)"
                class="border-t border-line bg-surface-sunken/40 px-3 sm:px-4 py-3 space-y-3 animate-fade-in">
                <div v-for="contract in sale.contracts" :key="contract.contract_id" class="space-y-2">
                  <div class="rounded-lg border bg-surface-raised p-3"
                    :class="contract._projection ? 'border-l-4 border-l-emerald-500 border-y border-r border-line' : 'border-line'">
                    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <span class="text-xs font-mono text-ink-muted">
                        {{ contract._projection ? 'Reserva' : 'Contrato' }}
                        <span class="text-ink font-semibold">#{{ contract.contract_id }}</span>
                      </span>
                      <span class="text-xs text-ink-subtle font-mono">
                        Participação: <span class="text-ink">{{ contract.participation_percentage || 100 }}%</span>
                      </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5"
                      :key="`${contractsStore.valueMode}-${contract.contract_id}`">
                      <div v-for="(condition, idx) in displayedConditions(contract)"
                        :key="`${contract.contract_id}-${condition.synthetic ? 'SYNTH' : 'REAL'}-${condition.condition_type_id || 'NA'}-${idx}-${contractsStore.valueMode}`"
                        class="rounded-lg p-2.5 border bg-surface-sunken transition-opacity"
                        :class="[
                          isDiscount(condition)
                            ? 'border-l-4 border-l-red-500 border-y border-r border-line'
                            : 'border-l-4 border-l-emerald-500 border-y border-r border-line',
                          condition._isCommission ? '!border-l-orange-500' : '',
                          condition._dimmed ? 'opacity-30' : '',
                        ]">
                        <div class="text-xs font-medium text-ink mb-0.5 flex items-center gap-1.5 flex-wrap">
                          <span class="truncate">{{ condition.condition_type_name || 'Não informado' }}</span>
                          <Badge v-if="condition.synthetic" variant="warning" size="sm">Observação</Badge>
                          <button v-if="condition.synthetic" class="text-ink-subtle hover:text-ink transition-colors"
                            v-tippy="'Atualização D-1 às 07h'">
                            <i class="fas fa-circle-info text-[10px]"></i>
                          </button>
                        </div>
                        <div class="text-base font-semibold tabular-nums"
                          :class="isDiscount(condition) ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'">
                          {{ formatCurrency(condition.total_value) }}
                          <span v-if="isDiscount(condition)" class="text-[10px] ml-1 text-ink-subtle font-normal">(desconto)</span>
                        </div>
                        <div class="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-ink-subtle">
                          <span>Cód: {{ condition.condition_type_id || '—' }}</span>
                          <span v-if="condition.installments_number">· {{ condition.installments_number }}x parcelas</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>

        <!-- Paginação -->
        <div v-if="totalPages > 1"
          class="px-4 sm:px-5 py-3 border-t border-line bg-surface-sunken/40 flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs text-ink-muted font-mono">
            {{ startItem }}–{{ endItem }} de {{ filteredSales.length }}
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

    <template #footer>
      <Button variant="ghost" @click="closeModal">Fechar</Button>
      <Button v-if="selectedSalesPayload.length"
        icon="fas fa-trophy" @click="registerAwards">
        Adicionar à premiação ({{ selectedSalesPayload.length }})
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
