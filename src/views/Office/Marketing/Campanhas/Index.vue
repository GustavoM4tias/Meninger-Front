<script setup>
// Central Meta › aba Campanhas — relatório de desempenho Meta no padrão de mercado:
// (Panel do hub /meta — sem PageContainer/PageHeader próprios.)
//
//   RÉGUA DE TEMPO (mestre)  → PeriodPicker no topo; TODAS as métricas
//                              (KPIs, gráfico, tabelas) são do período.
//   RÉGUA DE ESTRUTURA       → drill Conta → Campanha → Conjunto → Anúncio
//                              (tabs de nível + breadcrumb de escopo).
//
// Fonte: série diária local (meta_insights_daily) via /marketing/meta-report.
// Os filtros do FiltersBar (status, conta, mídia...) refinam a listagem;
// conta também recorta KPIs/gráfico (vai ao servidor).

import { onMounted, ref, computed, watch } from 'vue';
import dayjs from 'dayjs';
import { useCampaignsStore } from '@/stores/Marketing/Campaigns/campaignsStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import CampaignDetailModal from './components/CampaignDetailModal.vue';
import CampaignsCardsView from './components/CampaignsCardsView.vue';
import CampaignsTimelineView from './components/CampaignsTimelineView.vue';
import CampaignsAdminModal from './components/CampaignsAdminModal.vue';
import CampaignsFiltersBar from './components/CampaignsFiltersBar.vue';
import PeriodPicker from './components/PeriodPicker.vue';
import ReportKpiCards from './components/ReportKpiCards.vue';
import CampaignDailyChart from './components/CampaignDailyChart.vue';
import AdSetsTable from './components/AdSetsTable.vue';
import AdsGalleryView from './components/AdsGalleryView.vue';

const store = useCampaignsStore();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore?.user?.role === 'admin');

// ── Régua de tempo: período mestre (default: este mês) ─────────────────────
const periodo = ref({
    since: dayjs().startOf('month').format('YYYY-MM-DD'),
    until: dayjs().format('YYYY-MM-DD'),
    preset: 'this_month',
});

// ── Régua de estrutura: nível + drill ──────────────────────────────────────
const level = ref('campaign');                       // campaign | adset | ad
const drill = ref({ campaign: null, adset: null });  // { id, name } | null

function setLevel(l) {
    if (l === 'campaign') drill.value = { campaign: null, adset: null };
    if (l === 'adset')    drill.value = { ...drill.value, adset: null };
    level.value = l;
}

function drillIntoCampaign(c) {
    drill.value = { campaign: { id: String(c.id), name: c.name || `#${c.id}` }, adset: null };
    level.value = 'adset';
}
function drillIntoAdSet(a) {
    drill.value = { ...drill.value, adset: { id: String(a.id), name: a.name || `#${a.id}` } };
    level.value = 'ad';
}
function clearCampaignDrill() { setLevel('campaign'); }
function clearAdsetDrill()    { setLevel('adset'); }

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

// View mode do nível campanha: 'list' | 'cards' | 'timeline'
const viewMode = ref(localStorage.getItem('marketing.campaigns.viewMode') || 'list');
function setViewMode(mode) {
    viewMode.value = mode;
    localStorage.setItem('marketing.campaigns.viewMode', mode);
}

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
    await store.fetchReport({
        since: periodo.value.since,
        until: periodo.value.until,
        level: level.value,
        accounts: accountIdsSelected.value,
        campaignId: level.value !== 'campaign' ? (drill.value.campaign?.id || null) : null,
        adsetId: level.value === 'ad' ? (drill.value.adset?.id || null) : null,
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
    for (const c of store.campaigns) if (c.midia_slug) set.add(c.midia_slug);
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
    if (f.midia?.length && !f.midia.includes(camp.midia_slug)) return false;
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
                meta_leads_total: 0, meta_leads_form: 0, meta_leads_pixel: 0,
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
        arr.sort((a, b) => (Number(b.meta_leads_total) || 0) - (Number(a.meta_leads_total) || 0));
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
    if (v == null) return '—';
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: curr }).format(Number(v)); }
    catch { return `R$ ${v}`; }
}
function fmtInt(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('pt-BR').format(Number(v));
}
function fmtPct(v) {
    if (v == null) return '—';
    return `${Number(v).toFixed(2)}%`;
}
function fmtShortDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
    catch { return '—'; }
}
function fmtRelative(iso) {
    if (!iso) return '—';
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
    if (s.includes('ACTIVE'))   return { label: 'Ativa',     cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' };
    if (s.includes('PAUSED'))   return { label: 'Pausada',   cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/20' };
    if (s.includes('DELETED'))  return { label: 'Excluída',  cls: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/20' };
    if (s.includes('ARCHIVED')) return { label: 'Arquivada', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    if (s.includes('COMPLETED')) return { label: 'Concluída', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    return { label: s || '—', cls: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
}

function priorityDot(p) {
    if (p === 'high')   return { cls: 'bg-red-500',     title: 'Prioridade alta' };
    if (p === 'low')    return { cls: 'bg-slate-400',   title: 'Prioridade baixa' };
    return { cls: 'bg-emerald-500', title: 'Prioridade normal' };
}

const LEVEL_TABS = [
    { key: 'campaign', label: 'Campanhas', icon: 'fas fa-bullhorn' },
    { key: 'adset',    label: 'Conjuntos', icon: 'fas fa-layer-group' },
    { key: 'ad',       label: 'Anúncios',  icon: 'fas fa-image' },
];
</script>

<template>
  <div>
      <!-- Toolbar da aba (o header vive no hub Central Meta) -->
      <div class="flex items-center justify-end gap-2 flex-wrap mb-3">
          <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate"
            :loading="store.loading || store.loadingReport" @click="buscar">
            Atualizar
          </Button>
          <button v-if="isAdmin" @click="adminModalOpen = true"
            title="Ferramentas admin (sincronizar, importar histórico, disparar ao CV, etc.)"
            class="inline-flex items-center justify-center w-8 h-8 rounded-md border border-line bg-surface hover:bg-surface-hover hover:border-accent/40 text-ink-muted hover:text-ink transition-colors">
            <i class="fas fa-screwdriver-wrench text-xs"></i>
          </button>
      </div>

      <!-- ══ RÉGUA DE TEMPO: período mestre ══════════════════════════════ -->
      <div class="mb-4">
        <PeriodPicker v-model:periodo="periodo" />
      </div>

      <!-- KPIs do período (com delta vs período anterior) -->
      <div class="mb-4">
        <ReportKpiCards
          :totals="store.report?.totals"
          :totals-prev="store.report?.totals_prev"
          :period-prev="store.report?.period_prev"
          :currency="currency"
          :loading="store.loadingReport" />
      </div>

      <!-- Banner: série diária sem cobertura no período -->
      <div v-if="needsBackfill"
        class="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2.5 text-sm text-sky-800 dark:text-sky-200 flex items-start gap-2.5 flex-wrap">
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
      <div class="mb-4">
        <CampaignDailyChart :daily="store.report?.series || []" :currency="currency" />
      </div>

      <!-- FiltersBar (refina a listagem; conta recorta KPIs também) -->
      <div class="mb-3">
        <CampaignsFiltersBar
          v-model:filtros="filtros"
          :contas-options="contasOptions"
          :midias-options="midiasOptions"
          :objetivos-options="objetivosOptions"
          @buscar="buscar"
          @limpar="resetFilters" />
      </div>

      <!-- Resultado do sync -->
      <div v-if="store.lastSync"
        :class="['rounded-lg border px-3 py-2.5 text-sm mb-3',
          store.lastSync.errors?.length
            ? 'border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200'
            : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300']">
        <div class="flex items-start gap-2">
          <i :class="store.lastSync.errors?.length ? 'fas fa-triangle-exclamation' : 'fas fa-circle-check'" class="mt-0.5"></i>
          <div class="flex-1">
            <div>
              Sincronizado: <b>{{ store.lastSync.accounts_count }}</b> conta(s) de anúncio,
              <b>{{ store.lastSync.campaigns_total }}</b> campanha(s)
              ({{ store.lastSync.campaigns_new }} nova(s), {{ store.lastSync.campaigns_updated }} atualizada(s))
              <span class="text-[11px] text-ink-subtle">· janela {{ store.lastSync.since }} → {{ store.lastSync.until }}</span>
            </div>
            <div v-if="store.lastSync.errors?.length" class="mt-1.5 space-y-1">
              <div v-for="(e, i) in store.lastSync.errors" :key="i"
                class="text-xs rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5">
                <div class="font-medium"><i class="fas fa-circle-exclamation mr-1"></i>{{ e.account_name || 'Conta' }} <span class="text-ink-subtle font-mono">#{{ e.account_id }}</span></div>
                <div class="text-amber-700 dark:text-amber-300 mt-0.5 font-mono text-[11px] break-words">{{ e.error }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Log de operações (só admin) ─────────────────────────────────── -->
      <div v-if="isAdmin && store.ops.length" class="mb-3 rounded-lg border border-line bg-surface overflow-hidden">
        <div class="flex items-center justify-between px-3 py-2 border-b border-line bg-surface-sunken/30">
          <div class="text-xs font-semibold text-ink flex items-center gap-2">
            <i class="fas fa-clock-rotate-left text-ink-subtle"></i>
            Operações recentes ({{ store.ops.length }})
          </div>
          <button @click="store.clearOps()" class="text-[10px] text-ink-subtle hover:text-red-500">limpar</button>
        </div>
        <ul class="divide-y divide-line/60 max-h-60 overflow-y-auto">
          <li v-for="op in store.ops" :key="op.id" class="px-3 py-2 text-xs flex items-start gap-2.5">
            <span class="mt-0.5 shrink-0 w-5 text-center">
              <i v-if="op.status === 'running'" class="fas fa-circle-notch fa-spin text-sky-500"></i>
              <i v-else-if="op.status === 'success'" class="fas fa-circle-check text-emerald-500"></i>
              <i v-else class="fas fa-circle-xmark text-red-500"></i>
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span :class="[
                  'inline-flex rounded text-[9px] px-1.5 py-0.5 font-mono uppercase',
                  op.type === 'sync'      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300' :
                  op.type === 'import'    ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300' :
                  op.type === 'backfill'  ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300' :
                  op.type === 'reconcile' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' :
                  op.type === 'ads'       ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' :
                  'bg-slate-500/10 text-slate-600 dark:text-slate-300'
                ]">{{ op.type }}</span>
                <span class="font-medium text-ink truncate">{{ op.label }}</span>
                <span class="text-[10px] text-ink-subtle ml-auto whitespace-nowrap">
                  {{ new Date(op.started_at).toLocaleTimeString('pt-BR') }}
                  <template v-if="op.duration_ms != null"> · {{ (op.duration_ms / 1000).toFixed(1) }}s</template>
                </span>
              </div>

              <div v-if="op.status === 'running'" class="text-[11px] text-ink-subtle mt-0.5">processando...</div>

              <div v-else-if="op.status === 'success' && op.type === 'sync'" class="text-[11px] text-ink-muted mt-0.5">
                <b>{{ op.result.campaigns_total }}</b> campanhas em {{ op.result.accounts_count }} contas
                ({{ op.result.campaigns_new }} novas)
                <span v-if="op.result.errors?.length" class="text-amber-600 dark:text-amber-300">· {{ op.result.errors.length }} erros</span>
              </div>

              <div v-else-if="op.status === 'success' && op.type === 'import'" class="text-[11px] text-ink-muted mt-0.5">
                <b>{{ op.result.inserted }}</b> novos · {{ op.result.duplicates }} duplicados · {{ op.result.forms_count }} forms
                <span v-if="op.result.errors?.length" class="text-amber-600 dark:text-amber-300">· {{ op.result.errors.length }} erros</span>
              </div>

              <div v-else-if="op.status === 'success' && op.type === 'backfill'" class="text-[11px] text-ink-muted mt-0.5">
                <b>{{ fmtInt(op.result.rows_written) }}</b> linhas diárias · {{ op.result.accounts_count }} contas
                · níveis: {{ (op.result.levels || []).join(', ') }}
                <span v-if="op.result.errors?.length" class="text-amber-600 dark:text-amber-300">· {{ op.result.errors.length }} erros</span>
              </div>

              <div v-else-if="op.status === 'success' && op.type === 'reconcile'" class="text-[11px] text-ink-muted mt-0.5">
                <b>{{ op.result.matched }}</b> casados · {{ op.result.unmatched }} sem match · {{ op.result.errors }} erros (de {{ op.result.processed }})
              </div>

              <div v-else-if="op.status === 'success' && op.type === 'ads'" class="text-[11px] text-ink-muted mt-0.5">
                <b>{{ op.result.ads_total }}</b> ads · {{ op.result.ads_new }} novos · {{ op.result.ads_updated }} atualizados
              </div>

              <div v-else-if="op.status === 'error'" class="text-[11px] text-red-600 dark:text-red-300 mt-0.5 break-words">
                {{ op.error || 'erro desconhecido' }}
              </div>

              <details v-if="op.result?.errors?.length" class="mt-1">
                <summary class="text-[10px] text-amber-600 dark:text-amber-300 cursor-pointer">ver detalhes dos {{ op.result.errors.length }} erro(s)</summary>
                <ul class="mt-1 ml-2 space-y-0.5 text-[10px] text-ink-muted font-mono max-h-32 overflow-y-auto">
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

      <!-- Resultado import histórico -->
      <div v-if="store.lastImport"
        class="rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-2.5 text-sm text-blue-700 dark:text-blue-300 mb-3">
        <div class="flex items-start gap-2">
          <i class="fas fa-cloud-arrow-down mt-0.5"></i>
          <div class="flex-1">
            <div>
              <b>Import histórico:</b> {{ store.lastImport.forms_count }} form(s) processado(s) ·
              <b>{{ store.lastImport.inserted }}</b> novo(s),
              <b>{{ store.lastImport.duplicates }}</b> duplicado(s)
              · janela desde {{ store.lastImport.since }}
            </div>
            <div v-if="store.lastImport.errors?.length" class="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
              ⚠️ {{ store.lastImport.errors.length }} form(s) com erro
              <span v-for="(e, i) in store.lastImport.errors.slice(0, 3)" :key="i" class="block font-mono text-[10px] mt-0.5">
                {{ e.form_name }}: {{ e.error }}
              </span>
            </div>
            <div class="text-[11px] mt-1">
              <RouterLink to="/meta?tab=captacao" class="underline">Ver leads em Captação →</RouterLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Erro -->
      <div v-if="store.error"
        class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300 flex items-start gap-2 mb-3">
        <i class="fas fa-circle-exclamation mt-0.5"></i>
        <div>{{ store.error }}</div>
      </div>

      <!-- ══ RÉGUA DE ESTRUTURA: nível + breadcrumb de drill ═════════════ -->
      <div class="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2 flex-wrap min-w-0">
          <!-- Tabs de nível -->
          <div class="inline-flex rounded-lg border border-line bg-surface p-0.5">
            <button v-for="t in LEVEL_TABS" :key="t.key" @click="setLevel(t.key)"
              :class="['px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                level === t.key ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink hover:bg-surface-hover']">
              <i :class="[t.icon, 'text-[10px]']"></i>{{ t.label }}
            </button>
          </div>

          <!-- Breadcrumb do drill -->
          <div v-if="drill.campaign" class="flex items-center gap-1.5 min-w-0 flex-wrap">
            <i class="fas fa-chevron-right text-[9px] text-ink-subtle"></i>
            <span class="inline-flex items-center gap-1.5 max-w-[260px] rounded-md border border-accent/30 bg-accent/10 pl-2 pr-1 py-1 text-[11px] text-accent">
              <i class="fas fa-bullhorn text-[9px]"></i>
              <span class="truncate" :title="drill.campaign.name">{{ drill.campaign.name }}</span>
              <button @click="clearCampaignDrill" class="w-4 h-4 rounded grid place-items-center hover:bg-accent/20" title="Remover escopo da campanha">
                <i class="fas fa-times text-[9px]"></i>
              </button>
            </span>
            <template v-if="drill.adset">
              <i class="fas fa-chevron-right text-[9px] text-ink-subtle"></i>
              <span class="inline-flex items-center gap-1.5 max-w-[240px] rounded-md border border-accent/30 bg-accent/10 pl-2 pr-1 py-1 text-[11px] text-accent">
                <i class="fas fa-layer-group text-[9px]"></i>
                <span class="truncate" :title="drill.adset.name">{{ drill.adset.name }}</span>
                <button @click="clearAdsetDrill" class="w-4 h-4 rounded grid place-items-center hover:bg-accent/20" title="Remover escopo do conjunto">
                  <i class="fas fa-times text-[9px]"></i>
                </button>
              </span>
            </template>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- View mode: só no nível campanha -->
          <div v-if="level === 'campaign'" class="inline-flex rounded-lg border border-line bg-surface p-0.5">
            <button @click="setViewMode('list')"
              :class="['px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'list' ? 'bg-surface-sunken text-ink' : 'text-ink-muted hover:text-ink hover:bg-surface-hover']">
              <i class="fas fa-list text-[10px]"></i>Lista
            </button>
            <button @click="setViewMode('cards')"
              :class="['px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'cards' ? 'bg-surface-sunken text-ink' : 'text-ink-muted hover:text-ink hover:bg-surface-hover']">
              <i class="fas fa-grip text-[10px]"></i>Cards
            </button>
            <button @click="setViewMode('timeline')"
              :class="['px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
                viewMode === 'timeline' ? 'bg-surface-sunken text-ink' : 'text-ink-muted hover:text-ink hover:bg-surface-hover']">
              <i class="fas fa-chart-gantt text-[10px]"></i>Timeline
            </button>
          </div>

          <div v-if="level === 'campaign'" class="text-[11px] text-ink-subtle whitespace-nowrap">
            <b>{{ filtered.length }}</b> campanha(s) no período
          </div>
          <div v-else-if="level === 'adset'" class="text-[11px] text-ink-subtle whitespace-nowrap">
            <b>{{ adsetRows.length }}</b> conjunto(s)
          </div>
        </div>
      </div>

      <!-- ══ NÍVEL: CAMPANHAS ═════════════════════════════════════════════ -->
      <template v-if="level === 'campaign'">
        <!-- View: Cards -->
        <div v-if="viewMode === 'cards'">
          <CampaignsCardsView :campaigns="filtered" @select="openDetail" />
        </div>

        <!-- View: Timeline (Gantt) — janela = período mestre -->
        <div v-else-if="viewMode === 'timeline'">
          <CampaignsTimelineView
            :campaigns="filtered"
            :period-start="periodo.since"
            :period-end="periodo.until"
            @select="openDetail" />
        </div>

        <!-- View: Lista -->
        <Surface v-else variant="raised" padding="none" class="overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-surface-sunken/30 border-b border-line">
                <tr>
                  <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Campanha</th>
                  <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Conta</th>
                  <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                  <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Investido</th>
                  <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Leads</th>
                  <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle" title="Custo por lead no período">CAC</th>
                  <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">CTR</th>
                  <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">CPM</th>
                  <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Último</th>
                  <th class="px-3 py-2.5 w-24"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line/60">
                <tr v-if="store.loadingReport && !filtered.length">
                  <td colspan="10" class="px-4 py-10 text-center text-ink-subtle">
                    <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
                  </td>
                </tr>
                <tr v-else-if="!filtered.length">
                  <td colspan="10" class="px-4 py-10 text-center text-ink-subtle">
                    Nenhuma campanha com veiculação no período.
                    <span class="block text-xs mt-1">Amplie o período, ative "Sem veiculação no período" nos filtros, ou rode o backfill da série diária.</span>
                  </td>
                </tr>
                <tr v-else v-for="c in filtered" :key="c.id"
                  @click="openDetail(c)"
                  class="hover:bg-surface-hover/40 cursor-pointer transition-colors group">

                  <!-- Campanha -->
                  <td class="px-3 py-2.5">
                    <div class="flex items-center gap-2">
                      <span :class="['inline-block w-2 h-2 rounded-full shrink-0', priorityDot(c.priority).cls]" :title="priorityDot(c.priority).title"></span>
                      <div class="min-w-0">
                        <div class="text-ink font-medium leading-tight truncate max-w-[320px]" :title="c.name || c.id">
                          {{ c.name || '(sem nome)' }}
                          <span v-if="c.no_delivery" class="ml-1 text-[9px] text-ink-subtle italic font-normal">sem veiculação</span>
                        </div>
                        <div class="text-[10px] font-mono text-ink-subtle truncate">
                          #{{ c.id }}<span v-if="c.objective"> · {{ c.objective }}</span>
                          <span v-if="c.start_time"> · {{ fmtShortDate(c.start_time) }}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <!-- Conta -->
                  <td class="px-3 py-2.5 text-ink-muted text-xs truncate max-w-[150px]">
                    {{ c.account_name || c.account_id }}
                  </td>

                  <!-- Status -->
                  <td class="px-3 py-2.5 text-center">
                    <span :class="['inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium', statusBadge(c).cls]">
                      {{ statusBadge(c).label }}
                    </span>
                  </td>

                  <!-- Métricas do período -->
                  <td class="px-3 py-2.5 text-right whitespace-nowrap">
                    <div class="text-sm font-semibold text-ink leading-tight">{{ fmtMoney(c.spend, c.currency) }}</div>
                    <div v-if="c.daily_budget_cents" class="text-[10px] text-ink-subtle">{{ fmtMoney(c.daily_budget_cents / 100, c.currency) }}/dia</div>
                  </td>

                  <td class="px-3 py-2.5 text-right whitespace-nowrap">
                    <div class="text-sm font-semibold text-ink leading-tight" title="Leads contados pela Meta no período">
                      {{ fmtInt(c.meta_leads_total || 0) }}
                      <i class="fab fa-meta text-[9px] text-ink-subtle ml-0.5"></i>
                    </div>
                    <div v-if="(c.meta_leads_form || 0) + (c.meta_leads_pixel || 0) > 0"
                      class="text-[10px] text-ink-subtle tabular-nums"
                      title="Formulário Meta (chega na Captação) × pixel (converte no site/LP — não passa pelo webhook)">
                      {{ fmtInt(c.meta_leads_form || 0) }} form · {{ fmtInt(c.meta_leads_pixel || 0) }} pixel
                    </div>
                  </td>

                  <td class="px-3 py-2.5 text-right whitespace-nowrap text-sm">
                    <span v-if="c.cac != null" class="font-medium text-ink" title="CAC = investido ÷ leads no período">
                      {{ fmtMoney(c.cac, c.currency) }}
                    </span>
                    <span v-else class="text-ink-subtle italic text-xs">—</span>
                  </td>

                  <td class="px-3 py-2.5 text-right text-[11px] text-ink-muted">{{ fmtPct(c.ctr) }}</td>
                  <td class="px-3 py-2.5 text-right text-[11px] text-ink-muted">{{ c.cpm != null ? fmtMoney(c.cpm, c.currency) : '—' }}</td>

                  <!-- Último lead -->
                  <td class="px-3 py-2.5 text-[11px] text-ink-muted whitespace-nowrap">
                    {{ fmtRelative(c.lead_stats?.last_lead_at) }}
                  </td>

                  <!-- Drill -->
                  <td class="px-3 py-2.5 text-right whitespace-nowrap">
                    <button @click.stop="drillIntoCampaign(c)"
                      class="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[10px] font-medium text-ink-muted
                             opacity-0 group-hover:opacity-100 hover:text-accent hover:border-accent/40 transition-all"
                      title="Ver conjuntos desta campanha">
                      <i class="fas fa-layer-group text-[9px]"></i>Conjuntos
                      <i class="fas fa-chevron-right text-[8px]"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Surface>
      </template>

      <!-- ══ NÍVEL: CONJUNTOS ═════════════════════════════════════════════ -->
      <template v-else-if="level === 'adset'">
        <AdSetsTable
          :adsets="adsetRows"
          :loading="store.loadingReport"
          :currency="currency"
          :show-campaign="!drill.campaign"
          @drill="drillIntoAdSet" />
      </template>

      <!-- ══ NÍVEL: ANÚNCIOS (artes) ══════════════════════════════════════ -->
      <template v-else>
        <AdsGalleryView
          :ads="adRows"
          :loading="store.loadingReport"
          :currency="currency"
          :show-campaign="!drill.campaign" />
      </template>

      <CampaignDetailModal
        v-model:open="detailOpen"
        :campaign-id="detailId"
        :since="periodo.since"
        :until="periodo.until"
        @saved="store.fetchAll()" />

      <!-- Ferramentas admin (gear icon na toolbar) -->
      <CampaignsAdminModal v-if="isAdmin" v-model:open="adminModalOpen" />
  </div>
</template>
