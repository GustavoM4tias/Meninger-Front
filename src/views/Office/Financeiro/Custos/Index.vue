<script setup>
/**
 * Custos por Empreendimento - o que foi pago no período, por centro de custo.
 *
 * Painel (parte do celular): filtros fechados com selo de quantos estão
 * ativos, quatro números no topo e a tabela de empreendimentos logo abaixo.
 * Clicar em "Cancelados" recorta a tabela para os empreendimentos que têm
 * lançamento cancelado; clicar de novo desfaz.
 *
 * O detalhe do centro de custo é um modal de tela cheia que é, ele próprio,
 * uma listagem: um painel de filtro só, DataTable ordenável, scroll de 50 em
 * 50 e seleção com a ação no rodapé do modal. Clicar na linha abre o
 * lançamento inteiro num modal de registro, onde a observação se edita.
 */
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useExpensesStore } from '@/stores/Financeiro/Expenses/expensesStore';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useCostCenterNamesStore } from '@/stores/Financeiro/costCenterNamesStore';
import { useToast } from 'vue-toastification';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import FilterBar from '@/components/UI/FilterBar.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Modal from '@/components/UI/Modal.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Favorite from '@/components/config/Favorite.vue';
import Export from '@/components/config/Export.vue';
import LancamentoDetailModal from './components/LancamentoDetailModal.vue';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { useIncrementalList } from '@/composables/useIncrementalList';

const store = useExpensesStore();
const contractsStore = useContractsStore();
const ccNames = useCostCenterNamesStore();
const route = useRoute();
const router = useRouter();

const toast = (() => {
  try { return useToast(); }
  catch { return { success: console.log, error: console.error }; }
})();

/* ── Formatadores ────────────────────────────────────────────────────────── */
const nf = new Intl.NumberFormat('pt-BR');
const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-';
};
function formatDate(d) {
  if (!d) return '-';
  const s = String(d);
  const date = new Date(s + (s.length === 10 ? 'T12:00:00' : ''));
  return isNaN(date) ? '-' : date.toLocaleDateString('pt-BR');
}

/* Ordenação de tela: a tabela recebe a lista já fatiada pelo scroll, então
   quem ordena é a tela. Nulo e "-" vão para o fim nas duas direções. */
function ordenar(lista, colunas, { by, dir }) {
  if (!by) return lista;
  const col = colunas.find((c) => c.key === by);
  const mul = dir === 'asc' ? 1 : -1;
  const valor = (r) => (col?.value ? col.value(r) : r[by]);
  const nula = (v) => v == null || v === '' || v === '-';
  return [...lista].sort((a, b) => {
    const va = valor(a), vb = valor(b);
    if (nula(va) && nula(vb)) return 0;
    if (nula(va)) return 1;
    if (nula(vb)) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul;
    return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' }) * mul;
  });
}

/* ── Empreendimentos (filtro e nome efetivo) ─────────────────────────────── */
const selectedEnterpriseNames = ref([]);

// Nome efetivo = override admin (se houver) senão o nome do enterprise_cities
function effectiveName(e) {
  return ccNames.displayName(e.erp_id, e.name);
}

// Rótulo "Nome (CC)" para o filtro buscar por nome OU por número do centro de custo.
// Dedup por erp_id (enterprise_cities pode ter duplicatas crm/erp).
const enterpriseEntries = computed(() => {
  const byId = new Map();
  for (const e of contractsStore.enterpriseCities || []) {
    const id = Number(e.erp_id);
    if (!Number.isFinite(id) || byId.has(id)) continue;
    byId.set(id, `${effectiveName(e)} (${id})`);
  }
  return byId;
});

const enterpriseOptions = computed(() =>
  Array.from(enterpriseEntries.value.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
);

const enterpriseIdByName = computed(() => {
  const m = new Map();
  for (const [id, label] of enterpriseEntries.value) m.set(label, id);
  return m;
});

const enterpriseNameById = computed(() => {
  const m = new Map();
  for (const e of contractsStore.enterpriseCities || []) {
    m.set(Number(e.erp_id), effectiveName(e));
  }
  return m;
});

function resolveEnterpriseName(costCenterId) {
  // override tem prioridade mesmo que enterprise_cities não tenha o CC
  return ccNames.displayName(costCenterId, enterpriseNameById.value.get(Number(costCenterId)) || null);
}

const nomeDoGrupo = (g) => g.costCenterName || resolveEnterpriseName(g.costCenterId) || '-';

const selectedEnterpriseIds = computed(() =>
  selectedEnterpriseNames.value
    .map((name) => enterpriseIdByName.value.get(name))
    .filter(Boolean)
);

/* ── Filtros: URL + busca ───────────────────────────────────────────────────
   `activeCount` conta dimensões preenchidas, não valores: três empreendimentos
   marcados são 1 filtro. O período não conta - ele é o recorte da tela, não
   um filtro sobre ele. */
const filtrosAtivos = computed(() =>
  (selectedEnterpriseNames.value.length ? 1 : 0)
  + (store.selectedDepartments.length ? 1 : 0)
);

function syncUrlFromFilters() {
  const q = {};
  if (selectedEnterpriseIds.value.length) q.emp = selectedEnterpriseIds.value.join(',');
  if (store.selectedDepartments.length) q.dept = store.selectedDepartments.join(',');
  if (store.startDate) q.de = store.startDate;
  if (store.endDate) q.ate = store.endDate;
  if (!Object.keys(q).length && !Object.keys(route.query).length) return;
  router.replace({ query: q });
}

/* Datas e departamentos entram na hora; o empreendimento depende da lista de
   enterprise_cities, então o rótulo é montado depois que ela chega. */
function syncPeriodoFromUrl() {
  const q = route.query;
  if (q.de) store.startDate = String(q.de);
  if (q.ate) store.endDate = String(q.ate);
  if (q.dept) store.selectedDepartments = String(q.dept).split(',').filter(Boolean);
}
function syncEmpreendimentosFromUrl() {
  const q = route.query;
  if (!q.emp) return;
  const ids = String(q.emp).split(',').map(Number).filter(Number.isFinite);
  selectedEnterpriseNames.value = ids.map((id) => enterpriseEntries.value.get(id)).filter(Boolean);
}

/* Nasce CARREGANDO: com `false` o primeiro quadro mostraria "nenhum gasto"
   antes de o esqueleto aparecer. */
const loading = ref(true);

async function buscar() {
  syncUrlFromFilters();
  loading.value = true;
  try { await store.fetchExpenses(); }
  finally { loading.value = false; }
}

function limpar() {
  selectedEnterpriseNames.value = [];
  store.selectedDepartments = [];
  recorte.value = '';
  router.replace({ query: {} });
  buscar();
}

/* ── Grupos filtrados (página) ──────────────────────────────────────────── */
const filteredGroups = computed(() => {
  const base = store.groups || [];
  const selIds = selectedEnterpriseIds.value;

  return base
    .map((g) => {
      const exps = g.expenses || [];
      // Cancelados continuam na lista, mas NÃO somam no total ativo - vão num total à parte
      const total = exps.reduce(
        (sum, e) => sum + (e.status === 'cancelled' ? 0 : Number(e.amount || 0)), 0);
      const cancelledTotal = exps.reduce(
        (sum, e) => sum + (e.status === 'cancelled' ? Number(e.amount || 0) : 0), 0);
      return { ...g, expenses: exps, total, cancelledTotal };
    })
    .filter((g) => g.expenses.length > 0)
    .filter((g) => !selIds.length || selIds.includes(Number(g.costCenterId)));
});

const filteredTotal = computed(() =>
  filteredGroups.value.reduce((sum, g) => sum + Number(g.total || 0), 0)
);
const filteredCancelledTotal = computed(() =>
  filteredGroups.value.reduce((sum, g) => sum + Number(g.cancelledTotal || 0), 0)
);
const totalLancamentos = computed(() =>
  filteredGroups.value.reduce((sum, g) => sum + g.expenses.length, 0)
);

/* ── Recorte pelo KPI ───────────────────────────────────────────────────────
   Clicar num cartão recorta a TABELA, não os cartões. O único recorte com
   sentido aqui é "com cancelados"; qualquer outro cartão volta ao conjunto. */
const recorte = ref('');
const RECORTES = {
  cancel: { label: 'com cancelados', teste: (g) => Number(g.cancelledTotal) > 0 },
};
const recorteAtivo = computed(() => RECORTES[recorte.value] || null);

function aoClicarKpi(item) {
  recorte.value = (item.key !== 'cancel' || recorte.value === 'cancel') ? '' : 'cancel';
}

const lista = computed(() => (recorteAtivo.value
  ? filteredGroups.value.filter(recorteAtivo.value.teste)
  : filteredGroups.value));

/* ── Série e variação dos cartões ─────────────────────────────────────────
   12 baldes ao longo do próprio período, por data de pagamento. A variação
   compara a segunda metade com a primeira - não existe "período anterior"
   quando o filtro é quem define as datas. */
const NUM_BALDES = 12;

const serieDoPeriodo = computed(() => {
  const ini = new Date(`${store.startDate}T12:00:00`).getTime();
  const fim = new Date(`${store.endDate}T12:00:00`).getTime();
  if (!Number.isFinite(ini) || !Number.isFinite(fim)) return [];
  const span = Math.max(1, fim - ini);
  const baldes = Array.from({ length: NUM_BALDES }, () => ({ pago: 0, cancelado: 0, qtd: 0 }));
  for (const g of filteredGroups.value) {
    for (const e of g.expenses) {
      const d = e.paidAt || e.dueDate;
      if (!d) continue;
      const t = new Date(`${String(d).slice(0, 10)}T12:00:00`).getTime();
      if (!Number.isFinite(t)) continue;
      const idx = Math.max(0, Math.min(NUM_BALDES - 1, Math.floor(((t - ini) / span) * NUM_BALDES)));
      const b = baldes[idx];
      b.qtd++;
      if (e.status === 'cancelled') b.cancelado += Number(e.amount || 0);
      else b.pago += Number(e.amount || 0);
    }
  }
  return baldes;
});

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

const kpiCards = computed(() => {
  const s = serieDoPeriodo.value;
  const sPago = s.map((b) => b.pago);
  const sCancel = s.map((b) => b.cancelado);
  const sQtd = s.map((b) => b.qtd);
  const n = filteredGroups.value.length;
  return [
    { key: 'total', label: 'Total pago', raw: filteredTotal.value, format: fmtMoney, decimals: 2,
      hint: 'pago no período', icon: 'fas fa-coins', tone: 'accent',
      series: sPago, sparkMode: 'bars', delta: variacao(sPago, { maiorEhMelhor: false }),
      tooltip: 'Clique para ver todos os empreendimentos' },
    { key: 'cancel', label: 'Cancelados', raw: filteredCancelledTotal.value, format: fmtMoney, decimals: 2,
      hint: 'não somam no total', icon: 'fas fa-ban', tone: 'neg',
      series: sCancel, sparkMode: 'bars', delta: variacao(sCancel, { maiorEhMelhor: false }),
      tooltip: 'Clique para ver só os empreendimentos com lançamento cancelado' },
    { key: 'emps', label: 'Empreendimentos', raw: n,
      hint: 'com lançamentos no período', icon: 'fas fa-building', tone: 1,
      tooltip: 'Clique para ver todos os empreendimentos' },
    { key: 'lanc', label: 'Lançamentos', raw: totalLancamentos.value,
      hint: `${n ? nf.format(Math.round(totalLancamentos.value / n)) : 0} por empreendimento`,
      icon: 'fas fa-list-ul', tone: 2, series: sQtd, sparkMode: 'bars', delta: variacao(sQtd),
      tooltip: 'Clique para ver todos os empreendimentos' },
  ];
});

/* ── Tabela da página ─────────────────────────────────────────────────── */
const ordem = ref({ by: 'total', dir: 'desc' });

const COLUNAS = [
  { key: 'nome', label: 'Empreendimento', priority: 1, sortable: true, value: nomeDoGrupo },
  { key: 'total', label: 'Pago', priority: 1, numeric: true, sortable: true, width: '11rem',
    value: (g) => Number(g.total || 0) },
  { key: 'cancelledTotal', label: 'Cancelado', priority: 2, numeric: true, sortable: true, width: '10rem',
    value: (g) => Number(g.cancelledTotal || 0) },
  { key: 'qtd', label: 'Lançamentos', priority: 2, numeric: true, sortable: true, width: '8rem',
    value: (g) => g.expenses.length },
  { key: 'costCenterId', label: 'Centro de custo', priority: 3, sortable: true, width: '8rem',
    value: (g) => Number(g.costCenterId) },
];

const ordenada = computed(() => ordenar(lista.value, COLUNAS, ordem.value));
const inc = useIncrementalList(ordenada, { step: 50 });

const periodoLabel = computed(() => `${formatDate(store.startDate)} → ${formatDate(store.endDate)}`);

/* ── Modal de detalhes ───────────────────────────────────────────────── */
const selectedGroup = ref(null);
const selectedExpenseIds = ref([]);
const scrollRoot = ref(null);
const modalOrdem = ref({ by: 'paidAt', dir: 'asc' });

// Filtros do modal
const modalSearch = ref('');
const modalFilterDept = ref('');
const modalFilterDateFrom = ref('');
const modalFilterDateTo = ref('');
const modalDatePreset = ref('all');

const PRESET_OPTIONS = [
  { value: 'all',        label: 'Todo o período' },
  { value: 'this-month', label: 'Este mês' },
  { value: 'last-month', label: 'Mês anterior' },
  { value: 'quarter',    label: 'Trimestre' },
  { value: 'custom',     label: 'Personalizado' },
];

const modalFiltrosAtivos = computed(() =>
  (modalSearch.value.trim() ? 1 : 0)
  + (modalFilterDept.value ? 1 : 0)
  + ((modalFilterDateFrom.value || modalFilterDateTo.value) ? 1 : 0)
);

// Exportação (modal universal do sistema)
const showExport = ref(false);

const exportFilters = computed(() => {
  if (!selectedGroup.value) return {};
  const range = (from, to) => {
    if (from && to) return `${formatDate(from)} a ${formatDate(to)}`;
    if (from) return `a partir de ${formatDate(from)}`;
    if (to) return `até ${formatDate(to)}`;
    return '';
  };
  return {
    'Empreendimento': resolveEnterpriseName(selectedGroup.value.costCenterId) || selectedGroup.value.costCenterName || '',
    'Centro de custo': String(selectedGroup.value.costCenterId || ''),
    'Período': range(store.startDate, store.endDate),
    'Busca': modalSearch.value,
    'Departamento': modalFilterDept.value,
    'Pagamento entre': range(modalFilterDateFrom.value, modalFilterDateTo.value),
  };
});

const modalDeptOptions = computed(() => {
  if (!selectedGroup.value) return [];
  const hidden = new Set((store.data?.hiddenDepartments || []).map((d) => (d || '').toLowerCase()));
  const set = new Set();
  for (const exp of selectedGroup.value.expenses || []) {
    const d = exp.departmentName || exp.bill?.mainDepartmentName;
    if (d && !hidden.has(d.toLowerCase())) set.add(d);
  }
  return Array.from(set).sort();
});

const modalDeptSelectOptions = computed(() => [
  { value: '', label: 'Todos departamentos' },
  ...modalDeptOptions.value.map((d) => ({ value: d, label: d })),
]);

function clearModalFilters() {
  modalSearch.value = '';
  modalFilterDept.value = '';
  modalFilterDateFrom.value = '';
  modalFilterDateTo.value = '';
  modalDatePreset.value = 'all';
}

/* Mexer na data à mão vira "Personalizado"; escolher um atalho grava as datas. */
function setModalDate(campo, v) {
  if (campo === 'from') modalFilterDateFrom.value = v || '';
  else modalFilterDateTo.value = v || '';
  modalDatePreset.value = 'custom';
}

function setModalDatePreset(preset) {
  modalDatePreset.value = preset;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (d) => d.toISOString().slice(0, 10);

  if (preset === 'this-month') {
    modalFilterDateFrom.value = iso(new Date(y, m, 1));
    modalFilterDateTo.value = iso(new Date(y, m + 1, 0));
  } else if (preset === 'last-month') {
    modalFilterDateFrom.value = iso(new Date(y, m - 1, 1));
    modalFilterDateTo.value = iso(new Date(y, m, 0));
  } else if (preset === 'quarter') {
    modalFilterDateFrom.value = iso(new Date(y, m - 2, 1));
    modalFilterDateTo.value = iso(new Date(y, m + 1, 0));
  } else if (preset === 'all') {
    modalFilterDateFrom.value = '';
    modalFilterDateTo.value = '';
  }
}

const nomeFornecedor = (e) => e.bill?.creditor_json?.tradeName || e.bill?.creditor_json?.name || '';
const deptDoLancamento = (e) => e.departmentName || e.bill?.mainDepartmentName || '';
const parcelaDoLancamento = (e) =>
  (e.installmentsNumber > 1 ? `${e.installmentNumber}/${e.installmentsNumber}` : '1/1');

/* Colunas do lançamento. O que não cabe numa linha (vencimento, emissão,
   CNPJ, observação, nota do título) fica no modal do registro, a um clique. */
const COLUNAS_LANC = [
  { key: 'sel', label: 'Sel.', priority: 2, align: 'center', width: '3.25rem', truncate: false },
  { key: 'fornecedor', label: 'Fornecedor / Título', priority: 1, sortable: true, value: nomeFornecedor },
  { key: 'amount', label: 'Valor', priority: 1, numeric: true, sortable: true, width: '13rem',
    value: (e) => Number(e.amount || 0) },
  { key: 'paidAt', label: 'Pagamento', priority: 2, sortable: true, width: '7.5rem',
    value: (e) => e.paidAt || e.dueDate || '', format: formatDate },
  { key: 'departamento', label: 'Departamento', priority: 2, sortable: true, width: '12rem', value: deptDoLancamento },
  { key: 'parcela', label: 'Parcela', priority: 2, align: 'center', width: '5.5rem', value: parcelaDoLancamento },
];

const modalFiltrados = computed(() => {
  if (!selectedGroup.value) return [];
  let list = [...(selectedGroup.value.expenses || [])];

  const q = modalSearch.value.trim().toLowerCase();
  if (q) {
    list = list.filter((exp) => {
      const name = nomeFornecedor(exp).toLowerCase();
      const doc = `${exp.bill?.document_identification_id || ''} ${exp.bill?.document_number || ''}`.toLowerCase();
      const obs = (exp.description || '').toLowerCase();
      const notes = (exp.bill?.notes || '').toLowerCase();
      const cnpj = (exp.bill?.creditor_json?.cnpj || '').toLowerCase();
      const dept = deptDoLancamento(exp).toLowerCase();
      const billId = String(exp.bill?.id || '');
      const amount = String(exp.amount || '');
      return name.includes(q) || doc.includes(q) || obs.includes(q) || notes.includes(q)
        || cnpj.includes(q) || dept.includes(q) || billId.includes(q) || amount.includes(q);
    });
  }

  if (modalFilterDept.value) {
    const d = modalFilterDept.value.toLowerCase();
    list = list.filter((exp) => deptDoLancamento(exp).toLowerCase() === d);
  }

  if (modalFilterDateFrom.value) {
    list = list.filter((exp) => {
      const d = exp.paidAt || exp.dueDate;
      return d && d >= modalFilterDateFrom.value;
    });
  }
  if (modalFilterDateTo.value) {
    list = list.filter((exp) => {
      const d = exp.paidAt || exp.dueDate;
      return d && d <= modalFilterDateTo.value;
    });
  }
  return list;
});

/* Ordem: filtrar -> ordenar -> fatiar. */
const modalExpenses = computed(() => ordenar(modalFiltrados.value, COLUNAS_LANC, modalOrdem.value));
const incModal = useIncrementalList(modalExpenses, { step: 50, root: scrollRoot });

const modalTotal = computed(() =>
  modalExpenses.value.reduce(
    (sum, e) => sum + (e.status === 'cancelled' ? 0 : Number(e.amount || 0)), 0)
);
const modalCancelledTotal = computed(() =>
  modalExpenses.value.reduce(
    (sum, e) => sum + (e.status === 'cancelled' ? Number(e.amount || 0) : 0), 0)
);

const modalKpis = computed(() => [
  { key: 'ativo', label: 'Total ativo', raw: modalTotal.value, format: fmtMoney, decimals: 2,
    hint: 'do que está na lista', icon: 'fas fa-coins', tone: 'accent' },
  { key: 'cancel', label: 'Cancelado', raw: modalCancelledTotal.value, format: fmtMoney, decimals: 2,
    hint: 'não soma no total', icon: 'fas fa-ban', tone: 'neg' },
  { key: 'qtd', label: 'Lançamentos', raw: modalExpenses.value.length,
    hint: `de ${nf.format(selectedGroup.value?.expenses?.length || 0)} no período`,
    icon: 'fas fa-list-ul', tone: 2 },
]);

function openDetails(group) {
  selectedGroup.value = group;
  selectedExpenseIds.value = [];
  clearModalFilters();
}

function closeDetails() {
  selectedGroup.value = null;
  selectedExpenseIds.value = [];
  showExport.value = false;
  clearModalFilters();
}

/* ── Seleção ──────────────────────────────────────────────────────────────
   "Selecionar todos" marca o RECORTE inteiro (todos os filtrados), não só as
   50 linhas montadas pelo scroll. */
const selecionados = computed(() => new Set(selectedExpenseIds.value));
const todosMarcados = computed(() =>
  modalExpenses.value.length > 0 && modalExpenses.value.every((e) => selecionados.value.has(e.id))
);
const algunsMarcados = computed(() =>
  !todosMarcados.value && modalExpenses.value.some((e) => selecionados.value.has(e.id))
);

function toggleExpenseSelection(id) {
  if (selecionados.value.has(id)) {
    selectedExpenseIds.value = selectedExpenseIds.value.filter((x) => x !== id);
  } else {
    selectedExpenseIds.value = [...selectedExpenseIds.value, id];
  }
}

function toggleSelectAllExpenses() {
  selectedExpenseIds.value = todosMarcados.value ? [] : modalExpenses.value.map((e) => e.id);
}

/* ── Registro: o lançamento inteiro ───────────────────────────────────── */
const detailItem = ref(null);
const detailVisible = ref(false);
const detailSaving = ref(false);

function abrirLancamento(exp) {
  detailItem.value = exp;
  detailVisible.value = true;
}

function fecharLancamento() {
  detailVisible.value = false;
  detailSaving.value = false;
}

async function salvarObservacao(description) {
  if (!detailItem.value) return;
  detailSaving.value = true;
  try {
    await store.updateExpense(detailItem.value.id, { description: description || null });
    toast.success('Observação salva!');
    refreshAfterEdit();
  } catch (e) {
    toast.error(e.message || 'Erro ao salvar.');
  } finally {
    detailSaving.value = false;
  }
}

/* ── Exclusão ────────────────────────────────────────────────────────── */
async function removeExpense(exp) {
  const billId = exp.billId ?? exp.bill?.id ?? null;
  const parts = Number(exp.installmentsNumber || 0);

  /* Excluir UMA parcela remove o titulo inteiro. Isso precisa estar escrito
     antes do clique, e com o numero de parcelas. */
  const pergunta = (billId && parts > 1)
    ? {
        title: `Excluir a parcela ${exp.installmentNumber}/${parts} do titulo ${billId}?`,
        consequence: `As ${parts} parcelas do titulo saem juntas - nao da para excluir so esta.`,
      }
    : { title: 'Excluir este custo?', consequence: 'Ele sai do total do periodo.' };

  if (!await pedirConfirmacao({ ...pergunta, confirmLabel: 'Excluir' })) return;

  try {
    await store.deleteExpense(exp.id);
    toast.success(billId && parts > 1 ? `Todas as parcelas do título ${billId} excluídas.` : 'Custo excluído!');
    refreshAfterEdit();
  } catch (e) {
    toast.error(e.message || 'Erro ao excluir.');
  }
}

async function removeSelectedExpenses() {
  const n = selectedExpenseIds.value.length;
  if (!n) return;
  if (!await pedirConfirmacao({
    title: `Excluir ${n} custo(s) selecionado(s)?`,
    consequence: `Os ${n} saem do total do periodo de uma vez.`,
    confirmLabel: 'Excluir selecionados',
  })) return;

  try {
    await Promise.all(selectedExpenseIds.value.map((id) => store.deleteExpense(id)));
    toast.success('Custos excluídos!');
    selectedExpenseIds.value = [];
    refreshAfterEdit();
  } catch (e) {
    toast.error(e.message || 'Erro ao excluir.');
  }
}

/* A store já recarrega o mês ao salvar/excluir; aqui só se re-apontam o grupo
   e o lançamento abertos para a versão nova (ou fecham, se sumiram). */
function refreshAfterEdit() {
  if (!selectedGroup.value) return;
  const updated = filteredGroups.value.find((g) => g.costCenterId === selectedGroup.value.costCenterId);
  selectedGroup.value = updated?.expenses?.length ? updated : null;
  if (detailItem.value) {
    const exp = selectedGroup.value?.expenses?.find((e) => e.id === detailItem.value.id) || null;
    detailItem.value = exp;
    if (!exp) detailVisible.value = false;
  }
}

/* ── Status ──────────────────────────────────────────────────────────── */
function expStatusVariant(status) {
  switch (status) {
    case 'paid':      return 'success';
    case 'cancelled': return 'danger';
    default:          return 'neutral';
  }
}
function expStatusLabel(status) {
  switch (status) {
    case 'paid':      return 'Pago';
    case 'cancelled': return 'Cancelado';
    case 'open':      return 'Em aberto';
    default:          return '-';
  }
}

/* ── Mount ───────────────────────────────────────────────────────────────
   Quem manda na primeira busca: a URL, quando traz filtro (link compartilhado,
   favorito); senão o período padrão da store. */
onMounted(async () => {
  store.selectedDepartments = [];
  const temQuery = Object.keys(route.query).length > 0;
  if (temQuery) syncPeriodoFromUrl();
  loading.value = true;
  try {
    await Promise.all([
      Promise.all([contractsStore.fetchEnterpriseCities(), ccNames.fetchOverrideMap()])
        .then(() => { if (temQuery) syncEmpreendimentosFromUrl(); }),
      store.fetchExpenses(),
    ]);
    if (!temQuery) syncUrlFromFilters();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <PageContainer size="full">

    <PageHeader
      subtitle="O que foi pago no período, por centro de custo, lido do backup do Sienge."
      icon="fas fa-building">
      <template #title>
        <span>Custos por Empreendimento</span>
        <Favorite :router="'/financeiro/custos'" :section="'Custos'" />
      </template>
      <template #actions>
        <PageHelp
          storage-key="custos"
          title="Como ler os custos"
          intro="O que foi pago no período, lido ao vivo do backup do Sienge. Os números seguem o espelho mais recente, não o instante atual do Sienge."
          :steps="[
            { title: 'Recorte o período', text: 'Abra Filtros, defina as datas de pagamento e, se quiser, empreendimento e departamento. Clique em Filtrar. A barra fica fechada para os números aparecerem primeiro.' },
            { title: 'Leia os quatro cartões', text: 'Total pago, cancelados, empreendimentos e lançamentos do período. As barras mostram como o valor se distribuiu ao longo das datas.' },
            { title: 'Clique em Cancelados para recortar', text: 'A tabela passa a mostrar só os empreendimentos com lançamento cancelado. Clicar de novo desfaz o recorte.' },
            { title: 'Ordene a tabela', text: 'Clique no título da coluna para ordenar por valor, cancelado ou quantidade. No celular o controle de ordenação fica acima da lista.' },
            { title: 'Abra o empreendimento', text: 'Clique na linha para ver os lançamentos. Lá dá para buscar, filtrar por departamento e data, e clicar num lançamento para abrir o registro inteiro, com a observação editável e a exclusão.' },
          ]"
          :tips="[
            'O que você enxerga depende da visibilidade de departamento configurada nas Alçadas.',
            'Cancelados aparecem na lista, mas não entram no total do período de propósito.',
            'Diferença contra o Sienge quase sempre é defasagem do backup - confira a data do espelho antes de tratar como erro.',
            'Os filtros ficam gravados no endereço da página: dá para salvar o link ou mandar para alguém já filtrado.',
          ]" />
      </template>
    </PageHeader>

    <div class="mb-4">
      <FilterBar :active-count="filtrosAtivos" :loading="store.isLoading" :cols="4"
        @apply="buscar" @clear="limpar">
        <MultiSelector label="Empreendimento" :model-value="selectedEnterpriseNames"
          @update:modelValue="v => (selectedEnterpriseNames = Array.isArray(v) ? v : [])"
          :options="enterpriseOptions" placeholder="Todos os empreendimentos" :page-size="200" />
        <MultiSelector label="Departamento" :model-value="store.selectedDepartments"
          @update:modelValue="v => (store.selectedDepartments = Array.isArray(v) ? v : [])"
          :options="store.departmentOptions" placeholder="Todos os departamentos" :page-size="200" />
        <Input v-model="store.startDate" type="date" label="Pago de" />
        <Input v-model="store.endDate" type="date" label="Pago até" />
      </FilterBar>
    </div>

    <div v-if="store.error"
      class="mb-4 rounded-xl border border-data-neg/25 bg-data-neg/10 p-4 text-sm text-data-neg
             flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-start gap-2 min-w-0">
        <i class="fas fa-circle-exclamation mt-0.5 shrink-0"></i><span class="min-w-0">{{ store.error }}</span>
      </div>
      <Button variant="outline" size="sm" icon="fas fa-rotate-right" class="shrink-0" @click="buscar()">
        Tentar novamente
      </Button>
    </div>

    <div v-else-if="loading" class="space-y-4">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <Skeleton v-for="i in 4" :key="i" variant="stat" />
      </div>
      <Skeleton variant="table" :lines="8" />
    </div>

    <div v-else class="space-y-4">
      <!-- Cartões: clicar em Cancelados recorta a tabela -->
      <StatRow :items="kpiCards" :cols="{ sm: 2, md: 2, lg: 4 }"
        selectable :active-key="recorte" @select="aoClicarKpi" />

      <!-- Linha de estado: o que está na tabela agora -->
      <div class="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <span class="tabular-nums">
          <b class="text-ink">{{ nf.format(lista.length) }}</b>
          de {{ nf.format(filteredGroups.length) }} empreendimento{{ filteredGroups.length === 1 ? '' : 's' }}
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

      <DataTable :columns="COLUNAS" :rows="inc.visiveis.value" row-key="costCenterId"
        manual-sort clickable density="compact"
        v-model:sort-by="ordem.by" v-model:sort-dir="ordem.dir"
        more-label="Ver mais campos"
        empty-icon="fas fa-inbox"
        empty-title="Nenhum gasto encontrado"
        empty-text="Ajuste os filtros ou o recorte para ver resultados."
        @row-click="openDetails">

        <template #cell-nome="{ row }">
          <span class="flex items-center gap-2.5 min-w-0">
            <span class="h-8 w-8 rounded-lg bg-accent-soft text-accent grid place-items-center shrink-0">
              <i class="fas fa-building text-xs"></i>
            </span>
            <span class="min-w-0">
              <span class="block font-medium text-ink truncate" :title="nomeDoGrupo(row)">{{ nomeDoGrupo(row) }}</span>
              <span class="block text-micro font-mono text-ink-subtle tabular-nums">CC {{ row.costCenterId }}</span>
            </span>
          </span>
        </template>

        <template #cell-total="{ row }">
          <span class="metric text-sm text-ink">{{ fmtMoney(row.total) }}</span>
        </template>

        <template #cell-cancelledTotal="{ row }">
          <span v-if="Number(row.cancelledTotal) > 0" class="metric text-sm text-data-neg">{{ fmtMoney(row.cancelledTotal) }}</span>
          <span v-else class="text-ink-subtle">-</span>
        </template>

        <template #cell-qtd="{ row }">
          <span class="tabular-nums">{{ nf.format(row.expenses.length) }}</span>
        </template>

        <template #cell-costCenterId="{ row }">
          <span class="font-mono tabular-nums">{{ row.costCenterId }}</span>
        </template>

        <template #actions="{ row }">
          <IconButton icon="fas fa-list" size="sm" label="Ver lançamentos" @click.stop="openDetails(row)" />
        </template>
      </DataTable>

      <!-- Gatilho do scroll incremental -->
      <div v-if="!inc.acabou.value" :ref="el => inc.observar(el)"
        class="py-6 flex items-center justify-center gap-2 text-micro text-ink-subtle">
        <Spinner size="sm" />
        carregando mais {{ Math.min(inc.step, inc.restantes.value) }} de {{ inc.restantes.value }} restantes
      </div>
    </div>
  </PageContainer>

  <!-- ═══════════════════════════════════════════════════════════════════
       DETALHE DO EMPREENDIMENTO - listagem em tela cheia
  ════════════════════════════════════════════════════════════════════ -->
  <Modal :open="!!selectedGroup" size="screen" :padded="false" @close="closeDetails">
    <template #header>
      <div v-if="selectedGroup" class="flex items-center gap-3 min-w-0">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-building text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">
            {{ resolveEnterpriseName(selectedGroup.costCenterId) || selectedGroup.costCenterName || 'Empreendimento' }}
          </h2>
          <p class="text-xs text-ink-muted mt-0.5">
            CC <span class="font-mono tabular-nums text-ink">{{ selectedGroup.costCenterId }}</span> &middot;
            <span class="tabular-nums text-ink">{{ nf.format(selectedGroup.expenses.length) }}</span> lançamento(s) &middot;
            <span class="font-mono tabular-nums text-ink-subtle">{{ periodoLabel }}</span>
          </p>
        </div>
        <div class="ml-auto shrink-0 flex items-center gap-1.5">
          <IconButton icon="fas fa-download" size="sm" label="Exportar lançamentos" @click="showExport = true" />
        </div>
      </div>
    </template>

    <!-- Este é o container que rola, e é ele que o scroll incremental observa. -->
    <div v-if="selectedGroup" ref="scrollRoot" class="h-full overflow-y-auto">

      <div class="px-4 sm:px-5 pt-4">
        <StatRow :items="modalKpis" :cols="{ sm: 3, md: 3, lg: 3 }" size="sm" />
      </div>

      <!-- UM caminho de filtro: busca, departamento e datas no mesmo painel -->
      <div class="px-4 sm:px-5 pt-4">
        <FilterBar :active-count="modalFiltrosAtivos" :cols="5" auto-apply @clear="clearModalFilters">
          <Input v-model="modalSearch" label="Busca"
            placeholder="Fornecedor, documento, CNPJ, observação..."
            icon-left="fas fa-magnifying-glass" />
          <Select v-model="modalFilterDept" label="Departamento"
            :options="modalDeptSelectOptions" placeholder="Todos departamentos" />
          <Input :model-value="modalFilterDateFrom" type="date" label="Pago de"
            @update:modelValue="v => setModalDate('from', v)" />
          <Input :model-value="modalFilterDateTo" type="date" label="Pago até"
            @update:modelValue="v => setModalDate('to', v)" />
          <Select :model-value="modalDatePreset" label="Atalho de período"
            :options="PRESET_OPTIONS" @update:modelValue="setModalDatePreset" />
        </FilterBar>
      </div>

      <!-- Selecionar todos vive fora da tabela porque precisa existir nas DUAS
           larguras: no celular não há cabeçalho de coluna onde encaixá-lo. -->
      <div class="px-4 sm:px-5 pt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted">
        <label v-if="modalExpenses.length" class="inline-flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" class="checkbox checkbox-sm"
            :checked="todosMarcados" :indeterminate.prop="algunsMarcados"
            @change="toggleSelectAllExpenses" />
          <span>Selecionar todos ({{ nf.format(modalExpenses.length) }})</span>
        </label>
        <span class="tabular-nums">
          <b class="text-ink">{{ nf.format(modalExpenses.length) }}</b>
          de {{ nf.format(selectedGroup.expenses.length) }} lançamento{{ selectedGroup.expenses.length === 1 ? '' : 's' }}
        </span>
      </div>

      <div class="px-4 sm:px-5 py-4">
        <DataTable :columns="COLUNAS_LANC" :rows="incModal.visiveis.value" row-key="id"
          clickable manual-sort density="compact"
          v-model:sort-by="modalOrdem.by" v-model:sort-dir="modalOrdem.dir"
          more-label="Ver mais campos"
          empty-icon="fas fa-magnifying-glass"
          empty-title="Nenhum lançamento encontrado"
          empty-text="Ajuste a busca ou os filtros para ver resultados."
          @row-click="abrirLancamento">

          <template #emptyActions>
            <Button variant="outline" size="sm" icon="fas fa-eraser" @click="clearModalFilters">
              Limpar filtros
            </Button>
          </template>

          <!-- Seleção: o clique nunca chega na linha, então marcar não abre. -->
          <template #cell-sel="{ row }">
            <input type="checkbox" class="checkbox checkbox-sm" :checked="selecionados.has(row.id)"
              :aria-label="`Selecionar lançamento ${row.id}`"
              @click.stop @change="toggleExpenseSelection(row.id)" />
          </template>

          <template #cell-fornecedor="{ row }">
            <span class="block min-w-0">
              <span v-if="row.bill" class="block font-medium text-ink truncate" :title="nomeFornecedor(row) || undefined">
                {{ nomeFornecedor(row) || '-' }}
              </span>
              <span v-else class="block text-ink-subtle italic">sem vínculo</span>
              <span v-if="row.bill" class="block text-micro text-ink-subtle truncate">
                {{ row.bill.document_identification_id }} {{ row.bill.document_number }}
                <span class="font-mono tabular-nums">&middot; #{{ row.bill.id }}</span>
              </span>
            </span>
          </template>

          <template #cell-amount="{ row }">
            <span class="inline-flex items-center justify-end gap-2">
              <span class="metric text-sm"
                :class="row.status === 'cancelled' ? 'text-ink-subtle line-through' : 'text-ink'">
                {{ fmtMoney(row.amount) }}
              </span>
              <Badge :variant="expStatusVariant(row.status)" size="sm">{{ expStatusLabel(row.status) }}</Badge>
            </span>
          </template>

          <template #cell-paidAt="{ row }">
            <span class="font-mono tabular-nums">{{ formatDate(row.paidAt || row.dueDate) }}</span>
          </template>

          <template #cell-departamento="{ row }">
            <Badge v-if="deptDoLancamento(row)" variant="info" size="sm" class="max-w-full">
              <span class="truncate">{{ deptDoLancamento(row) }}</span>
            </Badge>
            <span v-else class="text-ink-subtle">-</span>
          </template>

          <template #cell-parcela="{ row }">
            <Badge :variant="row.installmentsNumber > 1 ? 'accent' : 'neutral'" size="sm" class="font-mono">
              {{ parcelaDoLancamento(row) }}
            </Badge>
          </template>

          <template #actions="{ row }">
            <span class="inline-flex items-center gap-1">
              <IconButton icon="fas fa-eye" size="sm" label="Abrir lançamento" @click.stop="abrirLancamento(row)" />
              <IconButton icon="fas fa-trash" size="sm" variant="danger" label="Excluir" @click.stop="removeExpense(row)" />
            </span>
          </template>
        </DataTable>

        <div v-if="!incModal.acabou.value" :ref="el => incModal.observar(el)"
          class="py-6 flex items-center justify-center gap-2 text-micro text-ink-subtle">
          <Spinner size="sm" />
          carregando mais {{ Math.min(incModal.step, incModal.restantes.value) }} de {{ incModal.restantes.value }} restantes
        </div>
      </div>

      <Export v-model="showExport" :source="modalExpenses" title="Custos"
        :subtitle="`${resolveEnterpriseName(selectedGroup.costCenterId) || selectedGroup.costCenterName || 'Empreendimento'} (CC ${selectedGroup.costCenterId})`"
        initial-delimiter=";" initial-array-mode="join"
        :filters="exportFilters"
        :preselect="[
          'paidAt', 'dueDate', 'amount', 'status',
          'installmentNumber', 'installmentsNumber',
          'departmentName', 'description',
          'bill.creditor_json.name', 'bill.creditor_json.cnpj',
          'bill.document_identification_id', 'bill.document_number',
          'bill.totalInvoiceAmount',
        ]" />
    </div>

    <!-- Rodapé: a ação da seleção mora aqui, onde o polegar alcança. Sem
         seleção, o rodapé resume o que está na lista. -->
    <template #footer>
      <div v-if="selectedExpenseIds.length" class="flex flex-wrap items-center gap-3 w-full">
        <span class="text-sm font-medium text-ink tabular-nums">
          {{ nf.format(selectedExpenseIds.length) }} selecionado{{ selectedExpenseIds.length === 1 ? '' : 's' }}
        </span>
        <div class="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" icon="fas fa-xmark" @click="selectedExpenseIds = []">
            <span class="hidden sm:inline">Desmarcar</span>
          </Button>
          <Button variant="danger" size="sm" icon="fas fa-trash" @click="removeSelectedExpenses">
            Excluir {{ nf.format(selectedExpenseIds.length) }}
          </Button>
        </div>
      </div>
      <div v-else class="flex flex-wrap items-center justify-between gap-3 w-full">
        <div class="text-xs text-ink-muted tabular-nums">
          Total ativo
          <span class="font-semibold text-ink font-mono">{{ fmtMoney(modalTotal) }}</span>
          <template v-if="modalCancelledTotal > 0">
            &middot; cancelado
            <span class="font-semibold text-data-neg font-mono">{{ fmtMoney(modalCancelledTotal) }}</span>
          </template>
        </div>
        <Button variant="ghost" size="sm" @click="closeDetails">Fechar</Button>
      </div>
    </template>
  </Modal>

  <!-- ═══════════════════════════════════════════════════════════════════
       O LANÇAMENTO - registro inteiro, sobre a listagem
  ════════════════════════════════════════════════════════════════════ -->
  <LancamentoDetailModal
    :expense="detailItem"
    :visivel="detailVisible"
    :enterprise-name="selectedGroup ? (resolveEnterpriseName(selectedGroup.costCenterId) || selectedGroup.costCenterName || '') : ''"
    :cost-center-id="selectedGroup?.costCenterId || ''"
    :saving="detailSaving"
    @fechar="fecharLancamento"
    @salvar="salvarObservacao"
    @excluir="detailItem && removeExpense(detailItem)" />
</template>
