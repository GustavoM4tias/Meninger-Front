// src/stores/Financeiro/Inadimplencia/inadimplenciaStore.js
//
// Inadimplência (Financeiro, admin-only). Consome /api/sienge/inadimplencia*,
// que lê do backup diário do Sienge e reproduz a query do BID a Danielle
// (com dias/juros travados em 0). Espelha o padrão de billsStore.js.
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import dayjs from 'dayjs';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

// Âncora do BI: inadimplência desde 2020.
const DEFAULT_START = '2020-01-01';

export const useInadimplenciaStore = defineStore('inadimplencia', () => {
  // ── Filtros ──────────────────────────────────────────────────────────────
  const empresas        = ref([]);   // códigos cdempresaview selecionados
  const empreendimentos = ref([]);   // códigos cdempreendview selecionados
  const situacoes       = ref([]);   // 'Normal' | 'Cobrança' | 'Inadimplente' | 'Sub-judicie'
  const startDate       = ref(DEFAULT_START);
  const endDate         = ref(dayjs().format('YYYY-MM-DD'));
  const search          = ref('');

  // ── Paginação / ordenação do detalhe ──────────────────────────────────────
  const page     = ref(1);
  const pageSize  = ref(100);
  const sort      = ref('valor_atual');
  const dir       = ref('desc');

  // ── Dados ──────────────────────────────────────────────────────────────────
  const dashboard     = ref(null);   // { summary, aging, byEmpresa, byEmpreendimento, generatedAt }
  const detailRows    = ref([]);
  const detailTotal   = ref(0);
  const filterOptions = ref({ empresas: [], empreendimentos: [] });

  // ── Estado ───────────────────────────────────────────────────────────────
  const loading       = ref(false);
  const loadingDetail = ref(false);
  const exporting     = ref(false);
  const error         = ref(null);

  // ── Derivados ──────────────────────────────────────────────────────────────
  const summary = computed(() => dashboard.value?.summary || {});
  const aging   = computed(() => dashboard.value?.aging || []);
  const byEmpresa = computed(() => dashboard.value?.byEmpresa || []);
  const byEmpreendimento = computed(() => dashboard.value?.byEmpreendimento || []);
  const totalPages = computed(() => Math.max(1, Math.ceil(detailTotal.value / pageSize.value)));

  // Mapa código → nome (para exibir empresa/empreendimento legíveis)
  const empresaName = computed(() => {
    const m = new Map();
    for (const e of filterOptions.value.empresas) m.set(Number(e.code), e.name);
    return (code) => m.get(Number(code)) || String(code);
  });
  const empreendName = computed(() => {
    const m = new Map();
    for (const e of filterOptions.value.empreendimentos) m.set(Number(e.code), e.name);
    return (code) => m.get(Number(code)) || String(code);
  });

  // ── Helpers ──────────────────────────────────────────────────────────────
  function baseParams() {
    const p = new URLSearchParams();
    if (startDate.value) p.set('startDate', startDate.value);
    if (endDate.value)   p.set('endDate', endDate.value);
    if (empresas.value.length)        p.set('empresas', empresas.value.join(','));
    if (empreendimentos.value.length) p.set('empreendimentos', empreendimentos.value.join(','));
    if (situacoes.value.length)       p.set('situacoes', situacoes.value.join(','));
    if (search.value.trim())          p.set('search', search.value.trim());
    return p;
  }

  // ── Ações ───────────────────────────────────────────────────────────────
  async function fetchFilters() {
    try {
      const data = await requestWithAuth(`${API_URL}/sienge/inadimplencia/filters`);
      filterOptions.value = data || { empresas: [], empreendimentos: [] };
    } catch (e) {
      console.error('[inadimplencia] fetchFilters', e);
    }
  }

  async function fetchDashboard({ refresh = false } = {}) {
    error.value = null;
    loading.value = true;
    try {
      const p = baseParams();
      if (refresh) p.set('refresh', '1');
      dashboard.value = await requestWithAuth(`${API_URL}/sienge/inadimplencia?${p.toString()}`);
    } catch (e) {
      console.error('[inadimplencia] fetchDashboard', e);
      error.value = e.message || 'Falha ao carregar a inadimplência.';
      dashboard.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchDetail() {
    loadingDetail.value = true;
    try {
      const p = baseParams();
      p.set('page', String(page.value));
      p.set('pageSize', String(pageSize.value));
      p.set('sort', sort.value);
      p.set('dir', dir.value);
      const data = await requestWithAuth(`${API_URL}/sienge/inadimplencia/detail?${p.toString()}`);
      detailRows.value  = data?.rows || [];
      detailTotal.value = Number(data?.total || 0);
    } catch (e) {
      console.error('[inadimplencia] fetchDetail', e);
      detailRows.value = [];
      detailTotal.value = 0;
    } finally {
      loadingDetail.value = false;
    }
  }

  /** Carrega dashboard + 1ª página do detalhe. Usado no Filtrar e no mount. */
  async function applyFilters({ refresh = false } = {}) {
    page.value = 1;
    await Promise.all([fetchDashboard({ refresh }), fetchDetail()]);
  }

  function goToPage(p) {
    const n = Math.min(Math.max(1, p), totalPages.value);
    if (n === page.value) return;
    page.value = n;
    return fetchDetail();
  }

  function setSort(col) {
    if (sort.value === col) {
      dir.value = dir.value === 'asc' ? 'desc' : 'asc';
    } else {
      sort.value = col;
      dir.value = 'desc';
    }
    page.value = 1;
    return fetchDetail();
  }

  async function exportCsv() {
    exporting.value = true;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/sienge/inadimplencia/export?${baseParams().toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inadimplencia_${dayjs().format('YYYY-MM-DD')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[inadimplencia] exportCsv', e);
      error.value = 'Falha ao exportar CSV.';
    } finally {
      exporting.value = false;
    }
  }

  return {
    // filtros
    empresas, empreendimentos, situacoes, startDate, endDate, search,
    // paginação
    page, pageSize, sort, dir, totalPages,
    // dados
    dashboard, summary, aging, byEmpresa, byEmpreendimento,
    detailRows, detailTotal, filterOptions, empresaName, empreendName,
    // estado
    loading, loadingDetail, exporting, error,
    // ações
    fetchFilters, fetchDashboard, fetchDetail, applyFilters, goToPage, setSort, exportCsv,
  };
});
