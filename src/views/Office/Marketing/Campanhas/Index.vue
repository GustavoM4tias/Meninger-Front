<script setup>
// Central Meta › aba Campanhas - relatório de desempenho Meta no padrão de mercado:
// (Panel do hub /meta - sem PageContainer/PageHeader próprios.)
//
//   RÉGUA DE TEMPO (mestre)  → PeriodPicker no topo; TODAS as métricas
//                              (KPIs, gráfico, tabelas) são do período.
//   RÉGUA DE ESTRUTURA       → drill Contas → Campanhas → Conjuntos → Anúncios
//                              → Formulários (tabs de nível com contadores +
//                              breadcrumb de escopo). Contas agrega o relatório
//                              de campanhas client-side; Formulários lista os
//                              lead forms da Meta (asset da Página, sem série).
//
// Fonte: série diária local (meta_insights_daily) via /marketing/meta-report.
// Os filtros do FiltersBar (status, conta, mídia...) refinam a listagem;
// conta também recorta KPIs/gráfico (vai ao servidor).

import { onMounted, ref, computed, watch } from 'vue';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import dayjs from 'dayjs';
import { useCampaignsStore } from '@/stores/Marketing/Campaigns/campaignsStore';
import { useMetaFormsStore } from '@/stores/Marketing/Capture/metaFormsStore';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Panel from '@/components/UI/Panel.vue';
import DataTable from '@/components/UI/DataTable.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import MetaFormMappingModal from '../Formularios/components/MetaFormMappingModal.vue';
import CampaignDetailModal from './components/CampaignDetailModal.vue';
import CampaignsTimelineView from './components/CampaignsTimelineView.vue';
import CampaignsAdminModal from './components/CampaignsAdminModal.vue';
import CampaignsFiltersBar from './components/CampaignsFiltersBar.vue';
import ReportKpiCards from './components/ReportKpiCards.vue';
import CampaignDailyChart from './components/CampaignDailyChart.vue';
import AdsGalleryView from './components/AdsGalleryView.vue';

const store = useCampaignsStore();
// Fonte autoritativa: permissoes confirmadas pelo servidor
// (/permissions/me), nao o authStore. Aqui nao cabe capacidade: painel da Central Meta, que e admin por codigo.
const perm = usePermissionStore();
const isAdmin = computed(() => perm.isAdmin);

// Resumo da gaveta de operações: o que precisa ser visto sem abrir.
const opsEmAndamento = computed(() => store.ops.some(o => o.status === 'running'));
const opsComErro = computed(() => store.ops.filter(o => o.status === 'error').length);

// ── Régua de tempo: período mestre (default: este mês) ─────────────────────
const periodo = ref({
    since: dayjs().startOf('month').format('YYYY-MM-DD'),
    until: dayjs().format('YYYY-MM-DD'),
    preset: 'this_month',
});

// ── Régua de estrutura: nível + drill ──────────────────────────────────────
const level = ref('campaign');                       // account | campaign | adset | ad | forms
const drill = ref({ campaign: null, adset: null });  // { id, name } | null

function setLevel(l) {
    if (l === 'account' || l === 'campaign' || l === 'forms') drill.value = { campaign: null, adset: null };
    if (l === 'adset') drill.value = { ...drill.value, adset: null };
    level.value = l;
}

function drillIntoCampaign(c) {
    drill.value = { campaign: { id: String(c.id), name: c.name || `#${c.id}` }, adset: null };
    level.value = 'adset';
}
// Direcionamento por coluna: "Anúncios" da linha → artes só daquela campanha.
function drillIntoCampaignAds(c) {
    drill.value = { campaign: { id: String(c.id), name: c.name || `#${c.id}` }, adset: null };
    level.value = 'ad';
}
function drillIntoAdSet(a) {
    drill.value = { ...drill.value, adset: { id: String(a.id), name: a.name || `#${a.id}` } };
    level.value = 'ad';
}
function clearCampaignDrill() { setLevel('campaign'); }
function clearAdsetDrill()    { setLevel('adset'); }

// Direcionamento por coluna: Conta da linha → nível Campanhas filtrado na conta.
function focusAccount(name) {
    if (!name) return;
    filtros.value = { ...filtros.value, conta: [name] };
    setLevel('campaign');
}
// Direcionamento por coluna: Status da linha → filtra a listagem pelo status.
function focusStatus(label) {
    if (!label || !STATUS_TOKENS[label]) return;
    const cur = filtros.value.status || [];
    filtros.value = { ...filtros.value, status: cur.includes(label) ? [] : [label] };
}

// ── Filtros da listagem ─────────────────────────────────────────────────────
const filtros = ref({
    status: [],
    conta: [],
    midia: [],
    objetivo: [],
    busca: '',
    sort: 'spend',
    incluir_arquivadas: false,
    mostrar_sem_veiculacao: false,
});

const adminModalOpen = ref(false);

// View do nível campanha: 'list' (DataTable, que vira cartão no celular) ou
// 'timeline' (Gantt das janelas de veiculação). A view "Cards" saiu: era a
// mesma lista em caixas, e o Office não tem alternador de visualização.
const VIEW_MODES = ['list', 'timeline'];
const viewModeInicial = localStorage.getItem('marketing.campaigns.viewMode');
const viewMode = ref(VIEW_MODES.includes(viewModeInicial) ? viewModeInicial : 'list');
watch(viewMode, (mode) => localStorage.setItem('marketing.campaigns.viewMode', mode));
const viewOptions = [
    { value: 'list',     label: 'Lista',    icon: 'fas fa-list' },
    { value: 'timeline', label: 'Timeline', icon: 'fas fa-chart-gantt' },
];
// SegmentedControl de nível: v-model chama setLevel (que limpa o drill).
const levelSel = computed({ get: () => level.value, set: (l) => setLevel(l) });
const levelOptions = computed(() => levelTabs.value.map(t => ({ value: t.key, label: t.label, icon: t.icon, count: t.count ?? undefined })));

const detailOpen = ref(false);
const detailId   = ref(null);

function openDetail(c) {
    detailId.value = c.id;
    detailOpen.value = true;
}

// ── Carga do relatório ──────────────────────────────────────────────────────
// Conta selecionada vai ao SERVIDOR (recorta KPIs + gráfico + linhas).
const accountIdsSelected = computed(() => {
    if (!filtros.value.conta?.length) return [];
    const ids = new Set();
    for (const c of store.campaigns) {
        if (c.account_id && filtros.value.conta.includes(c.account_name)) ids.add(c.account_id);
    }
    return [...ids].sort();
});

async function loadReport() {
    // Formulários não têm série diária (asset da Página); Contas agrega o
    // relatório de campanhas client-side.
    if (level.value === 'forms') return;
    const apiLevel = level.value === 'account' ? 'campaign' : level.value;
    await store.fetchReport({
        since: periodo.value.since,
        until: periodo.value.until,
        level: apiLevel,
        accounts: accountIdsSelected.value,
        campaignId: apiLevel !== 'campaign' ? (drill.value.campaign?.id || null) : null,
        adsetId: apiLevel === 'ad' ? (drill.value.adset?.id || null) : null,
    });
}

const reportKey = computed(() => JSON.stringify({
    p: [periodo.value.since, periodo.value.until],
    l: level.value,
    c: drill.value.campaign?.id || null,
    a: drill.value.adset?.id || null,
    acc: accountIdsSelected.value,
}));

onMounted(() => {
    store.fetchAll();
    store.fetchCoverage();
    loadReport();
});

watch(reportKey, () => { loadReport(); });

// ── Nível FORMULÁRIOS (lead forms da Meta - carrega 1x ao entrar no nível) ──
const metaFormsStore = useMetaFormsStore();
const metaFormsLoaded = ref(false);
watch(level, (l) => {
    if (l === 'forms' && !metaFormsLoaded.value) {
        metaFormsLoaded.value = true;
        metaFormsStore.fetchAll();
    }
});

const formModalOpen = ref(false);
const formModalForm = ref(null);
function openMetaForm(f) { formModalForm.value = f; formModalOpen.value = true; }

const metaFormRows = computed(() => {
    if (level.value !== 'forms') return [];
    const q = (filtros.value.busca || '').trim().toLowerCase();
    let arr = metaFormsStore.forms || [];
    if (q) arr = arr.filter(f => `${f.name || ''} ${f.page_name || ''} ${f.id}`.toLowerCase().includes(q));
    return arr;
});

function formQuestionChips(f) {
    const qs = Array.isArray(f.questions) ? f.questions : [];
    return qs.slice(0, 4).map(q => q.label || q.key).filter(Boolean);
}

// Arquivadas: flag local só existe no cache de campanhas → re-busca do server.
watch(() => filtros.value.incluir_arquivadas, (incluir) => {
    store.fetchAll({ includeArchived: !!incluir });
});

function resetFilters() {
    filtros.value = {
        status: [], conta: [], midia: [], objetivo: [],
        busca: '', sort: 'spend',
        incluir_arquivadas: false, mostrar_sem_veiculacao: false,
    };
}

function buscar() {
    store.fetchAll({ includeArchived: !!filtros.value.incluir_arquivadas });
    loadReport();
}

// ── Opções dinâmicas dos MultiSelectors ─────────────────────────────────────
const contasOptions = computed(() => {
    const set = new Set();
    for (const c of store.campaigns) if (c.account_name) set.add(c.account_name);
    return [...set].sort();
});
const midiasOptions = computed(() => {
    const set = new Set();
    // Mídia EFETIVA (própria ou herdada da conta): é a que vai para o CV.
    for (const c of store.campaigns) { const m = c.effective_binding?.midia_slug || c.midia_slug; if (m) set.add(m); }
    return [...set].sort();
});
const objetivosOptions = computed(() => {
    const set = new Set();
    for (const c of store.campaigns) if (c.objective) set.add(c.objective);
    return [...set].sort();
});

// ── Matching client-side (refina a listagem) ────────────────────────────────
const STATUS_TOKENS = {
    'Ativas': 'ACTIVE', 'Pausadas': 'PAUSED', 'Arquivadas': 'ARCHIVED',
    'Excluídas': 'DELETED', 'Rascunho': 'DRAFT',
};

function statusMatches(row, selectedLabels) {
    if (!selectedLabels?.length) return true;
    const s = String(row.effective_status || row.status || '').toUpperCase();
    return selectedLabels.some(label => {
        const tok = STATUS_TOKENS[label];
        return tok && s.includes(tok);
    });
}

/** Filtros que dependem de atributos da campanha valem em qualquer nível (via row.campaign). */
function rowMatches(row) {
    const f = filtros.value;
    const camp = row.campaign || row;
    if (f.midia?.length && !f.midia.includes(camp.effective_binding?.midia_slug || camp.midia_slug)) return false;
    if (f.objetivo?.length && !f.objetivo.includes(camp.objective)) return false;
    if (!statusMatches(row, f.status)) return false;

    const q = (f.busca || '').trim().toLowerCase();
    if (q) {
        const txt = [row.name, row.id, camp.name, camp.account_name, row.adset_name, row.notes, camp.midia_slug]
            .filter(Boolean).join(' ').toLowerCase();
        if (!txt.includes(q)) return false;
    }
    return true;
}

// ── Linhas do nível CAMPANHA (merge cache + período) ────────────────────────
const cacheById = computed(() => new Map(store.campaigns.map(c => [String(c.id), c])));

const campaignRows = computed(() => {
    if (level.value !== 'campaign') return [];
    const rep = (store.report?.rows || []);
    // Cache primeiro (lead_stats, archived, notes...), período por cima (spend, leads, cac...)
    const rows = rep.map(r => ({ ...(cacheById.value.get(String(r.id)) || {}), ...r }));

    if (filtros.value.mostrar_sem_veiculacao) {
        const seen = new Set(rep.map(r => String(r.id)));
        for (const c of store.campaigns) {
            if (seen.has(String(c.id))) continue;
            rows.push({
                ...c,
                spend: 0, impressions: 0, clicks: 0,
                office_leads: 0, office_leads_delivered: 0,
                cac: null, ctr: null, cpm: null, cpc: null,
                no_delivery: true,
            });
        }
    }
    return rows;
});

const filtered = computed(() => {
    const f = filtros.value;
    const sortBy = f.sort || 'spend';

    let arr = campaignRows.value.filter(c => {
        if (!f.incluir_arquivadas && c.archived) return false;
        // Conta já foi ao servidor, mas o merge "sem veiculação" traz do cache → refiltra local.
        if (f.conta?.length && !f.conta.includes(c.account_name)) return false;
        return rowMatches(c);
    });

    arr = [...arr];
    if (sortBy === 'spend') {
        arr.sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0));
    } else if (sortBy === 'leads') {
        arr.sort((a, b) => (Number(b.office_leads) || 0) - (Number(a.office_leads) || 0));
    } else if (sortBy === 'cac') {
        arr.sort((a, b) => (Number(a.cac) || Infinity) - (Number(b.cac) || Infinity));
    } else if (sortBy === 'start') {
        arr.sort((a, b) => {
            const ta = a.start_time ? new Date(a.start_time).getTime() : 0;
            const tb = b.start_time ? new Date(b.start_time).getTime() : 0;
            return tb - ta;
        });
    } else if (sortBy === 'name') {
        arr.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    }
    return arr;
});

// ── Nível CONTAS (agregado client-side do relatório de campanhas) ───────────
const accountRows = computed(() => {
    if (level.value !== 'account') return [];
    const rows = store.report?.rows || [];
    const map = new Map();
    for (const r of rows) {
        const cache = cacheById.value.get(String(r.id)) || {};
        const id = r.account_id || cache.account_id || '-';
        const name = r.account_name || cache.account_name || id;
        const cur = map.get(id) || {
            id, name, spend: 0, leads: 0, campaigns: 0, active: 0,
            currency: r.currency || cache.currency || 'BRL',
        };
        cur.spend += Number(r.spend) || 0;
        cur.leads += Number(r.office_leads) || 0;
        cur.campaigns += 1;
        const st = String(r.effective_status || r.status || cache.effective_status || cache.status || '').toUpperCase();
        if (st.includes('ACTIVE')) cur.active += 1;
        map.set(id, cur);
    }
    const q = (filtros.value.busca || '').trim().toLowerCase();
    let arr = [...map.values()].map(a => ({ ...a, cac: a.leads > 0 ? a.spend / a.leads : null }));
    if (q) arr = arr.filter(a => `${a.name} ${a.id}`.toLowerCase().includes(q));
    return arr.sort((x, y) => y.spend - x.spend);
});

// ── Linhas dos níveis CONJUNTO e ANÚNCIO ────────────────────────────────────
const adsetRows = computed(() => {
    if (level.value !== 'adset') return [];
    return (store.report?.rows || [])
        .filter(rowMatches)
        .sort((a, b) => (Number(b.spend) || 0) - (Number(a.spend) || 0));
});

const adRows = computed(() => {
    if (level.value !== 'ad') return [];
    return (store.report?.rows || []).filter(rowMatches);
});

const currency = computed(() => {
    const rows = store.report?.rows || [];
    return rows.find(r => r.currency)?.currency || 'BRL';
});

// ── Cobertura da série diária (banner de backfill) ─────────────────────────
const coverageInfo = computed(() => {
    const cov = (store.coverage || []).find(c => c.level === level.value);
    return cov || null;
});

const needsBackfill = computed(() => {
    if (store.loadingReport || !store.report) return false;
    const noData = !(store.report.series || []).length;
    const cov = coverageInfo.value;
    const beforeCoverage = cov?.min_date && periodo.value.since < String(cov.min_date).slice(0, 10);
    return noData || beforeCoverage;
});

const backfilling = ref(false);
async function runBackfill() {
    backfilling.value = true;
    try {
        const days = Math.min(730, Math.max(35, dayjs().diff(dayjs(periodo.value.since), 'day') + 1));
        await store.backfillDaily({ sinceDays: days });
        await loadReport();
    } finally {
        backfilling.value = false;
    }
}

// ── Formatters ──────────────────────────────────────────────────────────────
function fmtMoney(v, curr = 'BRL') {
    if (v == null) return '-';
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: curr }).format(Number(v)); }
    catch { return `R$ ${v}`; }
}
function fmtInt(v) {
    if (v == null) return '-';
    return new Intl.NumberFormat('pt-BR').format(Number(v));
}
function fmtPct(v) {
    if (v == null) return '-';
    return `${Number(v).toFixed(2)}%`;
}
function fmtShortDate(iso) {
    if (!iso) return '-';
    try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
    catch { return '-'; }
}
function fmtRelative(iso) {
    if (!iso) return '-';
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1)    return 'agora';
    if (min < 60)   return `${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24)     return `${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7)      return `${d}d`;
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function statusBadge(c) {
    const s = String(c.effective_status || c.status || '').toUpperCase();
    if (s.includes('ACTIVE'))    return { label: 'Ativa',     variant: 'success' };
    if (s.includes('PAUSED'))    return { label: 'Pausada',   variant: 'warning' };
    if (s.includes('DELETED'))   return { label: 'Excluída',  variant: 'danger' };
    if (s.includes('ARCHIVED'))  return { label: 'Arquivada', variant: 'neutral' };
    if (s.includes('COMPLETED')) return { label: 'Concluída', variant: 'neutral' };
    return { label: s || '-', variant: 'neutral' };
}

// ── Colunas das listas (DataTable) ──────────────────────────────────────────
// Prioridade decide a ordem no celular: 1 = título do card, 2 = corpo, 3 = "Ver detalhes".
const CAMPAIGN_COLUMNS = [
    { key: 'name',         label: 'Campanha',  priority: 1, sortable: true, width: '30%' },
    { key: 'account_name', label: 'Conta',     priority: 2, sortable: true },
    { key: 'status_label', label: 'Status',    priority: 2, sortable: true, width: '7rem' },
    { key: 'spend',        label: 'Investido', priority: 1, sortable: true, numeric: true },
    { key: 'office_leads', label: 'Leads',     priority: 1, sortable: true, numeric: true },
    { key: 'cac',          label: 'CAC',       priority: 2, sortable: true, numeric: true },
    { key: 'ctr',          label: 'CTR',       priority: 3, sortable: true, numeric: true, format: fmtPct },
    { key: 'cpm',          label: 'CPM',       priority: 3, sortable: true, numeric: true, format: (v) => v != null ? fmtMoney(v) : '-' },
    { key: 'last_lead_at', label: 'Último lead', priority: 3, sortable: true, format: fmtRelative },
];
const ACCOUNT_COLUMNS = [
    { key: 'name',      label: 'Conta',      priority: 1, sortable: true, width: '32%' },
    { key: 'active',    label: 'Ativas',     priority: 2, sortable: true, numeric: true, format: fmtInt },
    { key: 'campaigns', label: 'Campanhas',  priority: 3, sortable: true, numeric: true, format: fmtInt },
    { key: 'spend',     label: 'Investido',  priority: 1, sortable: true, numeric: true },
    { key: 'leads',     label: 'Leads',      priority: 1, sortable: true, numeric: true, format: fmtInt },
    { key: 'cac',       label: 'CAC médio',  priority: 2, sortable: true, numeric: true },
];
const ADSET_COLUMNS = [
    { key: 'name',          label: 'Conjunto',   priority: 1, sortable: true, width: '26%' },
    { key: 'campaign_name', label: 'Campanha',   priority: 2, sortable: true },
    { key: 'status_label',  label: 'Status',     priority: 2, sortable: true, width: '7rem' },
    { key: 'goal',          label: 'Otimização', priority: 3, sortable: true },
    { key: 'spend',         label: 'Investido',  priority: 1, sortable: true, numeric: true },
    { key: 'office_leads',  label: 'Leads',      priority: 1, sortable: true, numeric: true, format: fmtInt },
    { key: 'cac',           label: 'CAC',        priority: 2, sortable: true, numeric: true },
    { key: 'ctr',           label: 'CTR',        priority: 3, sortable: true, numeric: true, format: fmtPct },
    { key: 'cpm',           label: 'CPM',        priority: 3, sortable: true, numeric: true, format: (v) => v != null ? fmtMoney(v) : '-' },
    { key: 'impressions',   label: 'Impressões', priority: 3, sortable: true, numeric: true, format: fmtInt },
];
const FORM_COLUMNS = [
    { key: 'name',       label: 'Formulário', priority: 1, sortable: true, width: '40%' },
    { key: 'page_name',  label: 'Página',     priority: 2, sortable: true },
    { key: 'status',     label: 'Status',     priority: 2, sortable: true, width: '7rem' },
    { key: 'perguntas',  label: 'Perguntas',  priority: 2, sortable: true, numeric: true },
    { key: 'midia_slug', label: 'Mídia (fallback)', priority: 3 },
];
const GOAL_LABELS = {
    LEAD_GENERATION: 'Leads', LINK_CLICKS: 'Cliques', OFFSITE_CONVERSIONS: 'Conversões',
    REACH: 'Alcance', IMPRESSIONS: 'Impressões', LANDING_PAGE_VIEWS: 'Visitas LP',
    THRUPLAY: 'ThruPlay', POST_ENGAGEMENT: 'Engajamento', CONVERSATIONS: 'Conversas',
};
// Linhas prontas para ordenar: número como número, rótulo de status como texto.
const campaignTableRows = computed(() => filtered.value.map(c => ({
    ...c, status_label: statusBadge(c).label,
    spend: Number(c.spend) || 0, office_leads: Number(c.office_leads) || 0,
    cac: c.cac != null ? Number(c.cac) : null, ctr: c.ctr != null ? Number(c.ctr) : null, cpm: c.cpm != null ? Number(c.cpm) : null,
    last_lead_at: c.lead_stats?.last_lead_at || null,
})));
const adsetTableRows = computed(() => adsetRows.value.map(a => ({
    ...a, status_label: statusBadge(a).label, campaign_name: a.campaign?.name || '',
    goal: GOAL_LABELS[a.optimization_goal] || a.optimization_goal || '-',
    spend: Number(a.spend) || 0, office_leads: Number(a.office_leads) || 0,
    cac: a.cac != null ? Number(a.cac) : null, ctr: a.ctr != null ? Number(a.ctr) : null, cpm: a.cpm != null ? Number(a.cpm) : null,
    impressions: Number(a.impressions) || 0,
})));
const formTableRows = computed(() => metaFormRows.value.map(f => ({
    ...f, perguntas: Array.isArray(f.questions) ? f.questions.length : 0,
})));

function priorityDot(p) {
    if (p === 'high')   return { cls: 'bg-data-neg',     title: 'Prioridade alta' };
    if (p === 'low')    return { cls: 'bg-ink-subtle',   title: 'Prioridade baixa' };
    return { cls: 'bg-data-pos', title: 'Prioridade normal' };
}

// Contador aparece quando o dado do nível já está carregado (senão null = oculto).
const levelTabs = computed(() => [
    { key: 'account',  label: 'Contas',      icon: 'fas fa-building-columns',
      count: level.value === 'account' ? accountRows.value.length : null },
    { key: 'campaign', label: 'Campanhas',   icon: 'fas fa-bullhorn',
      count: level.value === 'campaign' ? filtered.value.length : null },
    { key: 'adset',    label: 'Conjuntos',   icon: 'fas fa-layer-group',
      count: level.value === 'adset' ? adsetRows.value.length : null },
    { key: 'ad',       label: 'Anúncios',    icon: 'fas fa-image',
      count: level.value === 'ad' ? adRows.value.length : null },
    { key: 'forms',    label: 'Formulários', icon: 'fas fa-rectangle-list',
      count: metaFormsLoaded.value ? metaFormRows.value.length : null },
]);
</script>

<template>
  <div>
      <!-- Toolbar da aba (o header vive no hub Central Meta) -->
      <div class="flex items-center justify-end gap-2 flex-wrap mb-3">
          <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate"
            :loading="store.loading || store.loadingReport" @click="buscar">
            Atualizar
          </Button>
          <IconButton v-if="isAdmin" icon="fas fa-screwdriver-wrench" variant="secondary" size="sm"
            label="Ferramentas admin (sincronizar, importar histórico, disparar ao CV)" @click="adminModalOpen = true" />
      </div>

      <!-- Retorno das ferramentas de admin: uma gaveta so, fechada por
           padrao, junto do botao que dispara essas acoes. Antes eram tres
           faixas soltas empurrando a tabela pra fora da primeira dobra. -->
      <details v-if="isAdmin && (store.ops.length || store.lastSync || store.lastImport)"
        class="mb-3 rounded-lg border border-line bg-surface overflow-hidden">
        <summary class="px-3 py-2 cursor-pointer text-xs text-ink-muted hover:text-ink flex items-center gap-2">
          <i class="fas fa-clock-rotate-left text-ink-subtle"></i>
          <span class="font-medium text-ink">Operações recentes</span>
          <span v-if="store.ops.length" class="text-micro text-ink-subtle">({{ store.ops.length }})</span>
          <span v-if="opsEmAndamento" class="text-micro text-accent">
            <i class="fas fa-circle-notch fa-spin mr-1"></i>em andamento
          </span>
          <span v-else-if="opsComErro" class="text-micro text-data-neg">
            <i class="fas fa-circle-exclamation mr-1"></i>{{ opsComErro }} com erro
          </span>
        </summary>
        <div class="px-3 pb-3 pt-1 space-y-3 border-t border-line">
        <!-- Log de operações -->
        <div v-if="store.ops.length" class="rounded-lg border border-line/60 bg-surface-sunken/20 overflow-hidden">
          <div class="flex items-center justify-end px-3 py-1.5 border-b border-line/60">
            <button @click="store.clearOps()" class="text-micro text-ink-subtle hover:text-data-neg">limpar histórico</button>
          </div>
          <ul class="divide-y divide-line/60 max-h-60 overflow-y-auto">
            <li v-for="op in store.ops" :key="op.id" class="px-3 py-2 text-xs flex items-start gap-2.5">
              <span class="mt-0.5 shrink-0 w-5 text-center">
                <i v-if="op.status === 'running'" class="fas fa-circle-notch fa-spin text-accent"></i>
                <i v-else-if="op.status === 'success'" class="fas fa-circle-check text-data-pos"></i>
                <i v-else class="fas fa-circle-xmark text-data-neg"></i>
              </span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span :class="[
                    'inline-flex rounded text-micro px-1.5 py-0.5 font-mono uppercase',
                    op.type === 'sync'      ? 'bg-accent/10 text-accent' :
                    op.type === 'import'    ? 'bg-accent/10 text-accent' :
                    op.type === 'backfill'  ? 'bg-accent/10 text-accent' :
                    op.type === 'reconcile' ? 'bg-data-pos/10 text-data-pos' :
                    op.type === 'ads'       ? 'bg-data-warn/10 text-data-warn' :
                    'bg-surface-sunken text-ink-muted'
                  ]">{{ op.type }}</span>
                  <span class="font-medium text-ink truncate">{{ op.label }}</span>
                  <span class="text-micro text-ink-subtle ml-auto whitespace-nowrap">
                    {{ new Date(op.started_at).toLocaleTimeString('pt-BR') }}
                    <template v-if="op.duration_ms != null"> · {{ (op.duration_ms / 1000).toFixed(1) }}s</template>
                  </span>
                </div>

                <div v-if="op.status === 'running'" class="text-micro text-ink-subtle mt-0.5">processando...</div>

                <div v-else-if="op.status === 'success' && op.type === 'sync'" class="text-micro text-ink-muted mt-0.5">
                  <b>{{ op.result.campaigns_total }}</b> campanhas em {{ op.result.accounts_count }} contas
                  ({{ op.result.campaigns_new }} novas)
                  <span v-if="op.result.errors?.length" class="text-data-warn">· {{ op.result.errors.length }} erros</span>
                </div>

                <div v-else-if="op.status === 'success' && op.type === 'import'" class="text-micro text-ink-muted mt-0.5">
                  <b>{{ op.result.inserted }}</b> novos · {{ op.result.duplicates }} duplicados · {{ op.result.forms_count }} forms
                  <span v-if="op.result.errors?.length" class="text-data-warn">· {{ op.result.errors.length }} erros</span>
                </div>

                <div v-else-if="op.status === 'success' && op.type === 'backfill'" class="text-micro text-ink-muted mt-0.5">
                  <b>{{ fmtInt(op.result.rows_written) }}</b> linhas diárias · {{ op.result.accounts_count }} contas
                  · níveis: {{ (op.result.levels || []).join(', ') }}
                  <span v-if="op.result.errors?.length" class="text-data-warn">· {{ op.result.errors.length }} erros</span>
                </div>

                <div v-else-if="op.status === 'success' && op.type === 'reconcile'" class="text-micro text-ink-muted mt-0.5">
                  <b>{{ op.result.matched }}</b> casados · {{ op.result.unmatched }} sem match · {{ op.result.errors }} erros (de {{ op.result.processed }})
                </div>

                <div v-else-if="op.status === 'success' && op.type === 'ads'" class="text-micro text-ink-muted mt-0.5">
                  <b>{{ op.result.ads_total }}</b> ads · {{ op.result.ads_new }} novos · {{ op.result.ads_updated }} atualizados
                </div>

                <div v-else-if="op.status === 'error'" class="text-micro text-data-neg mt-0.5 break-words">
                  {{ op.error || 'erro desconhecido' }}
                </div>

                <details v-if="op.result?.errors?.length" class="mt-1">
                  <summary class="text-micro text-data-warn cursor-pointer">ver detalhes dos {{ op.result.errors.length }} erro(s)</summary>
                  <ul class="mt-1 ml-2 space-y-0.5 text-micro text-ink-muted font-mono max-h-32 overflow-y-auto">
                    <li v-for="(e, i) in op.result.errors.slice(0, 20)" :key="i">
                      <b>{{ e.form_name || e.page_name || e.account_name || '?' }}:</b> {{ e.error }}
                    </li>
                    <li v-if="op.result.errors.length > 20" class="italic">… mais {{ op.result.errors.length - 20 }}</li>
                  </ul>
                </details>
              </div>
            </li>
          </ul>
        </div>

        <!-- Resultado do sync -->
        <div v-if="store.lastSync"
          :class="['rounded-lg border px-3 py-2.5 text-sm',
            store.lastSync.errors?.length
              ? 'border-data-warn/30 bg-data-warn/5 text-data-warn'
              : 'border-data-pos/20 bg-data-pos/5 text-data-pos']">
          <div class="flex items-start gap-2">
            <i :class="store.lastSync.errors?.length ? 'fas fa-triangle-exclamation' : 'fas fa-circle-check'" class="mt-0.5"></i>
            <div class="flex-1">
              <div>
                Sincronizado: <b>{{ store.lastSync.accounts_count }}</b> conta(s) de anúncio,
                <b>{{ store.lastSync.campaigns_total }}</b> campanha(s)
                ({{ store.lastSync.campaigns_new }} nova(s), {{ store.lastSync.campaigns_updated }} atualizada(s))
                <span class="text-micro text-ink-subtle">· janela {{ store.lastSync.since }} → {{ store.lastSync.until }}</span>
              </div>
              <div v-if="store.lastSync.errors?.length" class="mt-1.5 space-y-1">
                <div v-for="(e, i) in store.lastSync.errors" :key="i"
                  class="text-xs rounded border border-data-warn/30 bg-data-warn/10 px-2 py-1.5">
                  <div class="font-medium"><i class="fas fa-circle-exclamation mr-1"></i>{{ e.account_name || 'Conta' }} <span class="text-ink-subtle font-mono">#{{ e.account_id }}</span></div>
                  <div class="text-data-warn mt-0.5 font-mono text-micro break-words">{{ e.error }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Resultado import histórico -->
        <div v-if="store.lastImport"
          class="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm text-accent">
          <div class="flex items-start gap-2">
            <i class="fas fa-cloud-arrow-down mt-0.5"></i>
            <div class="flex-1">
              <div>
                <b>Import histórico:</b> {{ store.lastImport.forms_count }} form(s) processado(s) ·
                <b>{{ store.lastImport.inserted }}</b> novo(s),
                <b>{{ store.lastImport.duplicates }}</b> duplicado(s)
                · janela desde {{ store.lastImport.since }}
              </div>
              <div v-if="store.lastImport.errors?.length" class="mt-1.5 text-xs text-data-warn">
                ⚠️ {{ store.lastImport.errors.length }} form(s) com erro
                <span v-for="(e, i) in store.lastImport.errors.slice(0, 3)" :key="i" class="block font-mono text-micro mt-0.5">
                  {{ e.form_name }}: {{ e.error }}
                </span>
              </div>
              <div class="text-micro mt-1">
                <RouterLink to="/meta?tab=captacao" class="underline">Ver leads em Captação →</RouterLink>
              </div>
            </div>
          </div>
        </div>

        </div>
      </details>

      <!-- Período mestre: as datas moram nos Filtros (Data início/fim) - sem
           picker separado no topo, igual ao dashboard de Leads. -->

      <!-- KPIs do período (com delta vs período anterior). Formulários são
           asset da Página - sem métrica de período, esconde a régua numérica. -->
      <div v-if="level !== 'forms'" class="mb-4">
        <ReportKpiCards
          :totals="store.report?.totals"
          :totals-prev="store.report?.totals_prev"
          :period-prev="store.report?.period_prev"
          :currency="currency"
          :loading="store.loadingReport" />
      </div>

      <!-- Banner: série diária sem cobertura no período -->
      <div v-if="needsBackfill && level !== 'forms'"
        class="mb-4 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5 text-sm text-accent flex items-start gap-2.5 flex-wrap">
        <i class="fas fa-database mt-0.5"></i>
        <div class="flex-1 min-w-[220px]">
          <b>Sem dados diários pra este período/nível.</b>
          <span v-if="coverageInfo?.min_date"> Cobertura atual começa em {{ fmtShortDate(coverageInfo.min_date) }}.</span>
          <span v-else> A série diária ainda não foi sincronizada.</span>
          O sync automático mantém os últimos 35 dias; períodos mais antigos precisam de backfill (1x).
        </div>
        <Button v-if="isAdmin" size="sm" variant="secondary" icon="fas fa-cloud-arrow-down"
          :loading="backfilling" @click="runBackfill">
          Preencher série diária
        </Button>
      </div>

      <!-- Gráfico diário do escopo atual -->
      <div v-if="level !== 'forms'" class="mb-4">
        <CampaignDailyChart :daily="store.report?.series || []" :currency="currency" />
      </div>

      <!-- FiltersBar (refina a listagem; conta recorta KPIs também) -->
      <div class="mb-3">
        <CampaignsFiltersBar
          v-model:filtros="filtros"
          v-model:periodo="periodo"
          :contas-options="contasOptions"
          :midias-options="midiasOptions"
          :objetivos-options="objetivosOptions"
          @buscar="buscar"
          @limpar="resetFilters" />
      </div>

      <!-- Erro -->
      <div v-if="store.error"
        class="rounded-lg border border-data-neg/20 bg-data-neg/10 px-3 py-2 text-sm text-data-neg flex items-start gap-2 mb-3">
        <i class="fas fa-circle-exclamation mt-0.5"></i>
        <div>{{ store.error }}</div>
      </div>

      <!-- ══ RÉGUA DE ESTRUTURA: nível + breadcrumb de drill ═════════════ -->
      <div class="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2 flex-wrap min-w-0">
          <!-- Nível da hierarquia (contador quando o nível está carregado) -->
          <SegmentedControl v-model="levelSel" :options="levelOptions" size="sm" />

          <!-- Breadcrumb do drill -->
          <div v-if="drill.campaign" class="flex items-center gap-1.5 min-w-0 flex-wrap">
            <i class="fas fa-chevron-right text-micro text-ink-subtle"></i>
            <span class="inline-flex items-center gap-1.5 max-w-[260px] rounded-md border border-accent/30 bg-accent/10 pl-2 pr-1 py-1 text-micro text-accent">
              <i class="fas fa-bullhorn text-micro"></i>
              <span class="truncate" :title="drill.campaign.name">{{ drill.campaign.name }}</span>
              <button type="button" @click="clearCampaignDrill" class="w-6 h-6 rounded grid place-items-center hover:bg-accent/20 focus-ring" title="Remover escopo da campanha">
                <i class="fas fa-times text-micro"></i>
              </button>
            </span>
            <template v-if="drill.adset">
              <i class="fas fa-chevron-right text-micro text-ink-subtle"></i>
              <span class="inline-flex items-center gap-1.5 max-w-[240px] rounded-md border border-accent/30 bg-accent/10 pl-2 pr-1 py-1 text-micro text-accent">
                <i class="fas fa-layer-group text-micro"></i>
                <span class="truncate" :title="drill.adset.name">{{ drill.adset.name }}</span>
                <button type="button" @click="clearAdsetDrill" class="w-6 h-6 rounded grid place-items-center hover:bg-accent/20 focus-ring" title="Remover escopo do conjunto">
                  <i class="fas fa-times text-micro"></i>
                </button>
              </span>
            </template>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Lista ou linha do tempo: só no nível campanha -->
          <SegmentedControl v-if="level === 'campaign'" v-model="viewMode" :options="viewOptions" size="sm" />

          <div v-if="level === 'campaign'" class="text-micro text-ink-subtle whitespace-nowrap">
            <b>{{ filtered.length }}</b> campanha(s) no período
          </div>
          <div v-else-if="level === 'adset'" class="text-micro text-ink-subtle whitespace-nowrap">
            <b>{{ adsetRows.length }}</b> conjunto(s)
          </div>
        </div>
      </div>

      <!-- ══ NÍVEL: CONTAS (clique = filtra o nível Campanhas nesta conta) ══ -->
      <Panel v-if="level === 'account'" :padded="false" title="Contas de anúncio" icon="fas fa-building-columns"
        subtitle="Clique numa conta para ver as campanhas dela no período"
        :loading="store.loadingReport && !accountRows.length" loading-variant="table"
        :empty="!store.loadingReport && !accountRows.length" empty-icon="fas fa-building-columns"
        empty-title="Nenhuma conta com veiculação no período" empty-text="Amplie o período ou rode o backfill da série diária.">
        <DataTable :columns="ACCOUNT_COLUMNS" :rows="accountRows" row-key="id" sort-by="spend" sort-dir="desc" clickable
          @row-click="focusAccount($event.name)">
          <template #cell-name="{ row }">
            <div class="text-ink font-medium truncate" :title="row.name">{{ row.name }}</div>
            <div class="text-micro font-mono text-ink-subtle truncate">{{ row.id }}</div>
          </template>
          <template #cell-active="{ row }">
            <Badge v-if="row.active" variant="success" size="sm">{{ row.active }} ativa{{ row.active > 1 ? 's' : '' }}</Badge>
            <span v-else class="text-ink-subtle">0</span>
          </template>
          <template #cell-spend="{ row }"><b class="tabular-nums text-ink">{{ fmtMoney(row.spend, row.currency) }}</b></template>
          <template #cell-cac="{ row }"><span class="tabular-nums">{{ row.cac != null ? fmtMoney(row.cac, row.currency) : '-' }}</span></template>
        </DataTable>
      </Panel>

      <!-- ══ NÍVEL: CAMPANHAS ═════════════════════════════════════════════ -->
      <template v-else-if="level === 'campaign'">
        <!-- Timeline (Gantt) - janela = período mestre -->
        <CampaignsTimelineView v-if="viewMode === 'timeline'"
          :campaigns="filtered" :period-start="periodo.since" :period-end="periodo.until" @select="openDetail" />

        <!-- Lista: clique na linha abre o detalhe (é onde se configura o vínculo);
             o drill para conjuntos/anúncios fica nas ações da linha. -->
        <Panel v-else :padded="false" title="Campanhas" icon="fas fa-bullhorn"
          :subtitle="`${fmtInt(filtered.length)} campanha(s) no período`"
          :loading="store.loadingReport && !filtered.length" loading-variant="table"
          :empty="!store.loadingReport && !filtered.length" empty-icon="fas fa-bullhorn"
          empty-title="Nenhuma campanha com veiculação no período"
          empty-text="Amplie o período, ative &quot;Sem veiculação no período&quot; nos filtros, ou rode o backfill da série diária.">
          <DataTable :columns="CAMPAIGN_COLUMNS" :rows="campaignTableRows" row-key="id" sort-by="spend" sort-dir="desc" clickable
            @row-click="openDetail">
            <template #cell-name="{ row }">
              <div class="flex items-center gap-2 min-w-0">
                <span class="inline-block w-2 h-2 rounded-full shrink-0" :class="priorityDot(row.priority).cls" v-tippy="priorityDot(row.priority).title"></span>
                <div class="min-w-0">
                  <div class="text-ink font-medium leading-tight truncate" :title="row.name || row.id">
                    {{ row.name || '(sem nome)' }}
                    <span v-if="row.no_delivery" class="ml-1 text-micro text-ink-subtle italic font-normal">sem veiculação</span>
                  </div>
                  <div class="text-micro font-mono text-ink-subtle truncate">
                    #{{ row.id }}<span v-if="row.objective"> · {{ row.objective }}</span><span v-if="row.start_time"> · {{ fmtShortDate(row.start_time) }}</span>
                  </div>
                </div>
              </div>
            </template>
            <template #cell-account_name="{ row }">
              <button v-if="row.account_name" type="button" @click.stop="focusAccount(row.account_name)"
                class="text-ink-muted hover:text-accent hover:underline truncate max-w-full text-left focus-ring rounded"
                :title="`Filtrar pela conta ${row.account_name}`">{{ row.account_name }}</button>
              <span v-else class="text-ink-muted">{{ row.account_id }}</span>
            </template>
            <template #cell-status_label="{ row }">
              <button type="button" @click.stop="focusStatus(statusBadge(row).label)" class="focus-ring rounded-md" :title="`Filtrar por ${statusBadge(row).label}`">
                <Badge :variant="statusBadge(row).variant" size="sm">{{ statusBadge(row).label }}</Badge>
              </button>
            </template>
            <template #cell-spend="{ row }">
              <b class="tabular-nums text-ink">{{ fmtMoney(row.spend, row.currency) }}</b>
              <div v-if="row.daily_budget_cents" class="text-micro text-ink-subtle">{{ fmtMoney(row.daily_budget_cents / 100, row.currency) }}/dia</div>
            </template>
            <template #cell-office_leads="{ row }">
              <b class="tabular-nums text-ink" v-tippy="'Leads da nossa base no período (com nome, telefone e e-mail). Spam fora.'">{{ fmtInt(row.office_leads) }}</b>
              <div v-if="(row.office_leads_delivered || 0) > 0" class="text-micro text-ink-subtle tabular-nums">{{ fmtInt(row.office_leads_delivered) }} no CV</div>
            </template>
            <template #cell-cac="{ row }">
              <span v-if="row.cac != null" class="tabular-nums text-ink" v-tippy="'CAC = investido ÷ leads da nossa base no período'">{{ fmtMoney(row.cac, row.currency) }}</span>
              <span v-else class="text-ink-subtle">-</span>
            </template>
            <template #actions="{ row }">
              <div class="flex gap-1 justify-end">
                <IconButton icon="fas fa-eye" size="sm" label="Detalhe da campanha (vínculo, leads)" @click.stop="openDetail(row)" />
                <IconButton icon="fas fa-layer-group" size="sm" label="Ver conjuntos desta campanha" @click.stop="drillIntoCampaign(row)" />
                <IconButton icon="fas fa-image" size="sm" label="Ver anúncios (artes) desta campanha" @click.stop="drillIntoCampaignAds(row)" />
              </div>
            </template>
          </DataTable>
        </Panel>
      </template>

      <!-- ══ NÍVEL: CONJUNTOS ═════════════════════════════════════════════ -->
      <Panel v-else-if="level === 'adset'" :padded="false" title="Conjuntos de anúncio" icon="fas fa-layer-group"
        subtitle="Clique num conjunto para ver os anúncios dele"
        :loading="store.loadingReport && !adsetRows.length" loading-variant="table"
        :empty="!store.loadingReport && !adsetRows.length" empty-icon="fas fa-layer-group"
        empty-title="Nenhum conjunto com veiculação no período">
        <DataTable :columns="drill.campaign ? ADSET_COLUMNS.filter(c => c.key !== 'campaign_name') : ADSET_COLUMNS"
          :rows="adsetTableRows" row-key="id" sort-by="spend" sort-dir="desc" clickable @row-click="drillIntoAdSet">
          <template #cell-name="{ row }">
            <div class="text-ink font-medium leading-tight truncate" :title="row.name">{{ row.name || '(não sincronizado)' }}</div>
            <div class="text-micro font-mono text-ink-subtle truncate">#{{ row.id }}</div>
          </template>
          <template #cell-status_label="{ row }"><Badge :variant="statusBadge(row).variant" size="sm">{{ statusBadge(row).label }}</Badge></template>
          <template #cell-spend="{ row }"><b class="tabular-nums text-ink">{{ fmtMoney(row.spend, row.currency || currency) }}</b></template>
          <template #cell-cac="{ row }"><span class="tabular-nums">{{ row.cac != null ? fmtMoney(row.cac, row.currency || currency) : '-' }}</span></template>
        </DataTable>
      </Panel>

      <!-- ══ NÍVEL: ANÚNCIOS (artes) ══════════════════════════════════════ -->
      <template v-else-if="level === 'ad'">
        <AdsGalleryView
          :ads="adRows"
          :loading="store.loadingReport"
          :currency="currency"
          :show-campaign="!drill.campaign" />
      </template>

      <!-- ══ NÍVEL: FORMULÁRIOS (lead forms da Meta - clique abre o mapping) ══ -->
      <Panel v-else :padded="false" title="Formulários de Lead Ads" icon="fas fa-rectangle-list"
        subtitle="O vínculo (empreendimento/mídia) vive na campanha; aqui você mapeia os campos (pergunta → CV) e vê os leads de cada form"
        :loading="metaFormsStore.loading && !metaFormRows.length" loading-variant="table"
        :empty="!metaFormsStore.loading && !metaFormRows.length" empty-icon="fas fa-rectangle-list"
        empty-title="Nenhum formulário Meta no cache" empty-text="Sincronize os formulários para puxar os da Página.">
        <template v-if="isAdmin" #actions>
          <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" :loading="metaFormsStore.syncing" @click="metaFormsStore.syncFromMeta()">
            <span class="hidden sm:inline">Sincronizar forms</span>
          </Button>
        </template>
        <template v-if="isAdmin" #emptyActions>
          <Button variant="primary" size="sm" icon="fas fa-arrows-rotate" :loading="metaFormsStore.syncing" @click="metaFormsStore.syncFromMeta()">Sincronizar forms</Button>
        </template>
        <DataTable :columns="FORM_COLUMNS" :rows="formTableRows" row-key="id" sort-by="name" clickable @row-click="openMetaForm">
          <template #cell-name="{ row }">
            <div class="text-ink font-medium truncate" :title="row.name">{{ row.name || `#${row.id}` }}</div>
            <div v-if="formQuestionChips(row).length" class="flex flex-wrap gap-1 mt-1">
              <span v-for="q in formQuestionChips(row)" :key="q" class="text-micro px-1.5 py-0.5 rounded-md bg-surface-sunken border border-line text-ink-muted truncate max-w-[160px]">{{ q }}</span>
            </div>
          </template>
          <template #cell-page_name="{ row }"><span class="text-ink-muted">{{ row.page_name || row.page_id }}</span></template>
          <template #cell-status="{ row }">
            <Badge :variant="String(row.status).toUpperCase() === 'ACTIVE' ? 'success' : 'neutral'" size="sm">
              {{ String(row.status).toUpperCase() === 'ACTIVE' ? 'Ativo' : (row.status || '-') }}
            </Badge>
            <Badge v-if="row.mapping_active === false" variant="warning" size="sm" class="ml-1">mapping off</Badge>
          </template>
          <template #cell-midia_slug="{ row }"><span class="font-mono text-ink-muted">{{ row.midia_slug || '-' }}</span></template>
        </DataTable>
      </Panel>

      <CampaignDetailModal
        v-model:open="detailOpen"
        :campaign-id="detailId"
        :since="periodo.since"
        :until="periodo.until"
        @saved="store.fetchAll()" />

      <!-- Ferramentas admin (gear icon na toolbar) -->
      <CampaignsAdminModal v-if="isAdmin" v-model:open="adminModalOpen" />

      <!-- Mapeamento de campos do form Meta (nível Formulários) -->
      <MetaFormMappingModal v-model:open="formModalOpen" :form="formModalForm"
        @saved="metaFormsStore.fetchAll()" />
  </div>
</template>
