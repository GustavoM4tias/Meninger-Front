<script setup>
// /marketing/campanhas — tela principal de campanhas Meta com KPIs agregados,
// filtros (status, conta, datas, busca) e tabela com investimento + leads + CAC.

import { onMounted, ref, computed, watch } from 'vue';
import dayjs from 'dayjs';
import { useCampaignsStore } from '@/stores/Marketing/Campaigns/campaignsStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import CampaignDetailModal from './components/CampaignDetailModal.vue';
import CampaignsCardsView from './components/CampaignsCardsView.vue';
import CampaignsTimelineView from './components/CampaignsTimelineView.vue';
import CampaignsAdminModal from './components/CampaignsAdminModal.vue';
import CampaignsFiltersBar from './components/CampaignsFiltersBar.vue';
import CampaignsSummaryCards from './components/CampaignsSummaryCards.vue';

const store = useCampaignsStore();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore?.user?.role === 'admin');

// ── Filtros (objeto único pra simplificar) ────────────────────────────────
// Defaults: mês atual, sem nada selecionado → mostra tudo do mês
const filtros = ref({
    status: [],
    conta: [],
    midia: [],
    objetivo: [],
    busca: '',
    sort: 'spend',
    incluir_arquivadas: false,
    data_inicio: '',
    data_fim: '',
});

const adminModalOpen = ref(false);

// View mode: 'list' | 'cards' | 'timeline' (persiste por usuário)
const viewMode = ref(localStorage.getItem('marketing.campaigns.viewMode') || 'list');
function setViewMode(mode) {
    viewMode.value = mode;
    localStorage.setItem('marketing.campaigns.viewMode', mode);
}

const detailOpen = ref(false);
const detailId   = ref(null);

const syncDays = ref(90);

function openDetail(c) {
    detailId.value = c.id;
    detailOpen.value = true;
}

onMounted(() => {
    store.fetchAll();
});

// Arquivadas (flag local da aba Gestão) não vêm no fetch padrão. Quando o usuário
// liga "Incluir arquivadas", re-busca do servidor incluindo-as (e vice-versa).
watch(() => filtros.value.incluir_arquivadas, (incluir) => {
    store.fetchAll({ includeArchived: !!incluir });
});

// Reset pro mês atual
function resetFilters() {
    filtros.value = {
        status: [],
        conta: [],
        midia: [],
        objetivo: [],
        busca: '',
        sort: 'spend',
        incluir_arquivadas: false,
        data_inicio: dayjs().startOf('month').format('YYYY-MM-DD'),
        data_fim: dayjs().endOf('month').format('YYYY-MM-DD'),
    };
}

function buscar() {
    // Filtragem é client-side e reativa; este botão serve só pra refresh do server.
    store.fetchAll();
}

// ── Opções dinâmicas pros MultiSelectors ──────────────────────────────────
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

// Mapeia rótulo em pt-BR → token de status na Meta
const STATUS_TOKENS = {
    'Ativas':     'ACTIVE',
    'Pausadas':   'PAUSED',
    'Arquivadas': 'ARCHIVED',
    'Excluídas':  'DELETED',
    'Rascunho':   'DRAFT',
};

function statusMatches(c, selectedLabels) {
    if (!selectedLabels?.length) return true;
    const s = String(c.effective_status || c.status || '').toUpperCase();
    return selectedLabels.some(label => {
        const tok = STATUS_TOKENS[label];
        return tok && s.includes(tok);
    });
}

/**
 * Overlap: campanha rodou ads no período selecionado?
 *
 * Regras (conservadoras, evitam falso-positivo):
 *   1. start_time depois do fim do período → fora
 *   2. Tem stop_time → overlap padrão (start ≤ to E stop ≥ from)
 *   3. Status ATIVA sem stop_time → rodando até hoje
 *   4. Pausada/Arquivada/Excluída SEM stop_time → EXCLUI
 *      (Meta não diz quando foi pausada; assumir que rodou até hoje é falso-
 *      positivo. Pra ver essas, remova o filtro de data.)
 */
function campaignOverlapsPeriod(c) {
    const f = filtros.value;
    if (!f.data_inicio && !f.data_fim) return true;

    const from = f.data_inicio ? new Date(f.data_inicio) : null;
    const to   = f.data_fim    ? new Date(f.data_fim)    : null;
    if (to) to.setHours(23, 59, 59, 999);

    const start = c.start_time ? new Date(c.start_time) : null;
    if (!start) return true;                                   // sem start_time = não dá pra avaliar → não esconde
    if (to && start > to) return false;                        // começou depois do fim

    const isActive = String(c.effective_status || c.status || '').toUpperCase().includes('ACTIVE');

    let effectiveEnd;
    if (c.stop_time) {
        effectiveEnd = new Date(c.stop_time);
    } else if (isActive) {
        effectiveEnd = new Date();                             // ativa = rodando até agora
    } else if (c.updated_time) {
        // Pausada/arquivada SEM stop_time: updated_time é o melhor proxy
        // (toda mudança — incluindo pausar — atualiza esse campo).
        effectiveEnd = new Date(c.updated_time);
    } else {
        // Sem nada que indique quando parou → exclui.
        return false;
    }

    if (from && effectiveEnd < from) return false;             // parou antes do início
    return true;
}

const filtered = computed(() => {
    const f = filtros.value;
    const q = (f.busca || '').trim().toLowerCase();
    const sortBy = f.sort || 'spend';

    let arr = store.campaigns.filter(c => {
        if (!f.incluir_arquivadas && c.archived) return false;
        if (!statusMatches(c, f.status)) return false;
        if (f.conta?.length && !f.conta.includes(c.account_name)) return false;
        if (f.midia?.length && !f.midia.includes(c.midia_slug)) return false;
        if (f.objetivo?.length && !f.objetivo.includes(c.objective)) return false;
        if (!campaignOverlapsPeriod(c)) return false;

        if (q) {
            const txt = [c.name, c.id, c.account_name, c.objective, c.notes, c.midia_slug]
                .filter(Boolean).join(' ').toLowerCase();
            if (!txt.includes(q)) return false;
        }
        return true;
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

const summary = computed(() => {
    let spend = 0, leadsMeta = 0, impressions = 0, clicks = 0;
    for (const c of filtered.value) {
        spend       += Number(c.spend) || 0;
        leadsMeta   += Number(c.meta_leads_total) || 0;
        impressions += c.impressions || 0;
        clicks      += c.clicks      || 0;
    }
    // CAC médio agregado base Meta (telas Meta = só Meta).
    const cacMedio = leadsMeta > 0 ? spend / leadsMeta : null;
    const ctrAgg   = impressions > 0 ? (clicks / impressions) * 100 : null;
    return { spend, leadsMeta, impressions, clicks, cacMedio, ctrAgg };
});

function fmtMoney(v, currency = 'BRL') {
    if (v == null) return '—';
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(v)); }
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

function isActive(c) {
    return String(c.effective_status || c.status || '').toUpperCase().includes('ACTIVE');
}

/**
 * Texto da 2ª linha do "Período" (após start_time). Só mostra "Em andamento"
 * pra campanhas ativas sem stop_time; pausadas/excluídas mostram "—".
 */
function periodEnd(c) {
    if (c.stop_time) return { text: '→ ' + fmtShortDate(c.stop_time), cls: 'text-ink-subtle' };
    if (isActive(c)) return { text: 'em andamento', cls: 'text-emerald-600 dark:text-emerald-300' };
    return { text: '—', cls: 'text-ink-subtle italic' };
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">
      <PageHeader
        title="Campanhas Meta"
        subtitle="Investimento, leads e desempenho por campanha. Sync automático a cada 2h em horário comercial."
        icon="fab fa-meta">
        <template #actions>
          <Button variant="secondary" size="sm" icon="fas fa-arrows-rotate" :loading="store.loading" @click="store.fetchAll">
            Atualizar
          </Button>
          <!-- Gear admin — só pra admin -->
          <button v-if="isAdmin" @click="adminModalOpen = true"
            title="Ferramentas admin (sincronizar, importar histórico, disparar ao CV, etc.)"
            class="inline-flex items-center justify-center w-8 h-8 rounded-md border border-line bg-surface hover:bg-surface-hover hover:border-accent/40 text-ink-muted hover:text-ink transition-colors">
            <i class="fas fa-screwdriver-wrench text-xs"></i>
          </button>
        </template>
      </PageHeader>

      <!-- KPIs -->
      <div class="mb-4">
        <CampaignsSummaryCards
          :periodo="{ data_inicio: filtros.data_inicio, data_fim: filtros.data_fim }"
          :summary="summary"
          :total-campaigns="filtered.length" />
      </div>

      <!-- FiltersBar (mesmo padrão de Leads) -->
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
            <!-- Ícone status -->
            <span class="mt-0.5 shrink-0 w-5 text-center">
              <i v-if="op.status === 'running'" class="fas fa-circle-notch fa-spin text-sky-500"></i>
              <i v-else-if="op.status === 'success'" class="fas fa-circle-check text-emerald-500"></i>
              <i v-else class="fas fa-circle-xmark text-red-500"></i>
            </span>

            <!-- Conteúdo -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span :class="[
                  'inline-flex rounded text-[9px] px-1.5 py-0.5 font-mono uppercase',
                  op.type === 'sync'      ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300' :
                  op.type === 'import'    ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300' :
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

              <!-- Resumo do resultado -->
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

              <div v-else-if="op.status === 'success' && op.type === 'reconcile'" class="text-[11px] text-ink-muted mt-0.5">
                <b>{{ op.result.matched }}</b> casados · {{ op.result.unmatched }} sem match · {{ op.result.errors }} erros (de {{ op.result.processed }})
              </div>

              <div v-else-if="op.status === 'success' && op.type === 'ads'" class="text-[11px] text-ink-muted mt-0.5">
                <b>{{ op.result.ads_total }}</b> ads · {{ op.result.ads_new }} novos · {{ op.result.ads_updated }} atualizados
              </div>

              <div v-else-if="op.status === 'error'" class="text-[11px] text-red-600 dark:text-red-300 mt-0.5 break-words">
                {{ op.error || 'erro desconhecido' }}
              </div>

              <!-- Detalhes expandíveis se tem erros por form -->
              <details v-if="op.result?.errors?.length" class="mt-1">
                <summary class="text-[10px] text-amber-600 dark:text-amber-300 cursor-pointer">ver detalhes dos {{ op.result.errors.length }} erro(s)</summary>
                <ul class="mt-1 ml-2 space-y-0.5 text-[10px] text-ink-muted font-mono max-h-32 overflow-y-auto">
                  <li v-for="(e, i) in op.result.errors.slice(0, 20)" :key="i">
                    <b>{{ e.form_name || e.page_name || '?' }}:</b> {{ e.error }}
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
              <RouterLink to="/marketing/captacao" class="underline">Ver leads em Captação →</RouterLink>
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

      <!-- Seletor de view mode -->
      <div class="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div class="inline-flex rounded-lg border border-line bg-surface p-0.5">
          <button @click="setViewMode('list')"
            :class="['px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
              viewMode === 'list' ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink hover:bg-surface-hover']">
            <i class="fas fa-list text-[10px]"></i>Lista
          </button>
          <button @click="setViewMode('cards')"
            :class="['px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
              viewMode === 'cards' ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink hover:bg-surface-hover']">
            <i class="fas fa-grip text-[10px]"></i>Cards
          </button>
          <button @click="setViewMode('timeline')"
            :class="['px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5',
              viewMode === 'timeline' ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink hover:bg-surface-hover']">
            <i class="fas fa-chart-gantt text-[10px]"></i>Timeline
          </button>
        </div>
        <div class="text-[11px] text-ink-subtle">
          <b>{{ filtered.length }}</b> de {{ store.campaigns.length }} campanha(s)
        </div>
      </div>

      <!-- View: Cards -->
      <div v-if="viewMode === 'cards'">
        <CampaignsCardsView :campaigns="filtered" @select="openDetail" />
      </div>

      <!-- View: Timeline (Gantt) — janela = período do filtro -->
      <div v-else-if="viewMode === 'timeline'">
        <CampaignsTimelineView
          :campaigns="filtered"
          :period-start="filtros.data_inicio"
          :period-end="filtros.data_fim"
          @select="openDetail" />
      </div>

      <!-- View: Lista (tabela atual) -->
      <Surface v-else variant="raised" padding="none" class="overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-surface-sunken/30 border-b border-line">
              <tr>
                <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Campanha</th>
                <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Conta</th>
                <th class="px-3 py-2.5 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Período</th>
                <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Investido</th>
                <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Leads</th>
                <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle" title="Custo por lead">CAC</th>
                <th class="px-3 py-2.5 text-right  text-[11px] font-mono uppercase tracking-wider text-ink-subtle">CTR</th>
                <th class="px-3 py-2.5 text-left   text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Último</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line/60">
              <tr v-if="store.loading">
                <td colspan="9" class="px-4 py-10 text-center text-ink-subtle">
                  <i class="fas fa-circle-notch fa-spin mr-2"></i>Carregando...
                </td>
              </tr>
              <tr v-else-if="!store.campaigns.length">
                <td colspan="9" class="px-4 py-10 text-center text-ink-subtle">
                  Nenhuma campanha sincronizada ainda. Clique em <b>"Sincronizar com Meta"</b>.
                </td>
              </tr>
              <tr v-else-if="!filtered.length">
                <td colspan="9" class="px-4 py-10 text-center text-ink-subtle">
                  Nenhuma campanha corresponde aos filtros.
                </td>
              </tr>
              <tr v-else v-for="c in filtered" :key="c.id"
                @click="openDetail(c)"
                class="hover:bg-surface-hover/40 cursor-pointer transition-colors">

                <!-- Campanha -->
                <td class="px-3 py-2.5">
                  <div class="flex items-center gap-2">
                    <span :class="['inline-block w-2 h-2 rounded-full shrink-0', priorityDot(c.priority).cls]" :title="priorityDot(c.priority).title"></span>
                    <div class="min-w-0">
                      <div class="text-ink font-medium leading-tight truncate">{{ c.name || '(sem nome)' }}</div>
                      <div class="text-[10px] font-mono text-ink-subtle truncate">
                        #{{ c.id }}<span v-if="c.objective"> · {{ c.objective }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Conta -->
                <td class="px-3 py-2.5 text-ink-muted text-xs truncate max-w-[160px]">
                  {{ c.account_name || c.account_id }}
                </td>

                <!-- Status -->
                <td class="px-3 py-2.5 text-center">
                  <span :class="['inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium', statusBadge(c).cls]">
                    {{ statusBadge(c).label }}
                  </span>
                </td>

                <!-- Período -->
                <td class="px-3 py-2.5">
                  <div class="text-[11px] text-ink-muted">
                    <span v-if="c.start_time">{{ fmtShortDate(c.start_time) }}</span>
                    <span v-else class="text-ink-subtle italic">—</span>
                  </div>
                  <div class="text-[10px]" :class="periodEnd(c).cls">{{ periodEnd(c).text }}</div>
                </td>

                <!-- Investido -->
                <td class="px-3 py-2.5 text-right whitespace-nowrap">
                  <div class="text-sm font-semibold text-ink leading-tight">{{ fmtMoney(c.spend, c.currency) }}</div>
                  <div v-if="c.daily_budget_cents" class="text-[10px] text-ink-subtle">{{ fmtMoney(c.daily_budget_cents / 100, c.currency) }}/dia</div>
                </td>

                <!-- Leads (Meta + nosso DB) -->
                <td class="px-3 py-2.5 text-right whitespace-nowrap">
                  <div class="text-sm font-semibold text-ink leading-tight" title="Leads contados pela Meta (insights)">
                    {{ fmtInt(c.meta_leads_total || 0) }}
                    <i class="fab fa-meta text-[9px] text-ink-subtle ml-0.5"></i>
                  </div>
                </td>

                <!-- CAC -->
                <td class="px-3 py-2.5 text-right whitespace-nowrap text-sm">
                  <span v-if="c.cac != null" class="font-medium text-ink" title="CAC = gasto ÷ leads da Meta">
                    {{ fmtMoney(c.cac, c.currency) }}
                    <i class="fab fa-meta text-[9px] text-ink-subtle ml-0.5"></i>
                  </span>
                  <span v-else class="text-ink-subtle italic text-xs">—</span>
                </td>

                <!-- CTR -->
                <td class="px-3 py-2.5 text-right text-[11px] text-ink-muted">{{ fmtPct(c.ctr) }}</td>

                <!-- Último lead -->
                <td class="px-3 py-2.5 text-[11px] text-ink-muted whitespace-nowrap">
                  {{ fmtRelative(c.lead_stats?.last_lead_at) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Surface>

      <CampaignDetailModal
        v-model:open="detailOpen"
        :campaign-id="detailId"
        @saved="store.fetchAll()" />

      <!-- Ferramentas admin (gear icon no header) -->
      <CampaignsAdminModal v-if="isAdmin" v-model:open="adminModalOpen" />
    </PageContainer>
  </div>
</template>
