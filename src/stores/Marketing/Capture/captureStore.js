// stores/Marketing/Capture/captureStore.js
//
// Store da gestão de captação de leads (inbox admin). Conversa com a API
// autenticada /api/marketing/* — listagem com filtros ricos, detalhe + timeline,
// roteamento de leads "held", redispatch, health/KPIs por período.

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';

const VIEWMODE_KEY = 'marketing.captacao.viewMode';
const PERIOD_KEY = 'marketing.captacao.healthPeriod';

function authHeaders() {
    const token = localStorage.getItem('token');
    return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
}

async function apiFetch(path, opts = {}) {
    const resp = await fetch(`${API_URL}/marketing${path}`, { headers: authHeaders(), ...opts });
    if (resp.status === 401) {
        localStorage.removeItem('token');
        throw new Error('Sessão expirada. Faça login novamente.');
    }
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || `Erro na requisição (${resp.status}).`);
    }
    return data;
}

// Defaults dos filtros — usado pra detectar "filtros ativos" e pelo botão Limpar.
function defaultFilters() {
    return {
        status: [],            // []  | ['held','failed',...]
        channel: [],           // []  | ['meta_lead_ads','site_form']
        cv_origem: [],         // []  | ['FB','IG','SI',...]
        midia_slug: [],        // []  | ['meta-mond-marilia', ...]
        meta_campaign_id: [],  // []  | ['1203...', ...]
        q: '',
        period_start: '',      // YYYY-MM-DD
        period_end: '',        // YYYY-MM-DD
        sort: 'recent',        // recent | oldest | stuck (presos há mais tempo)
    };
}

export const useCaptureStore = defineStore('marketingCapture', () => {
    // ── State ──────────────────────────────────────────────────────────────────
    const leads = ref([]);
    const total = ref(0);
    const page = ref(1);
    const pageSize = ref(25);
    const filters = ref(defaultFilters());

    const health = ref(null);
    const healthPeriod = ref(localStorage.getItem(PERIOD_KEY) || '7d'); // 24h | 7d | 30d | all
    const viewMode = ref(localStorage.getItem(VIEWMODE_KEY) || 'list'); // list | cards | timeline

    const loading = ref(false);
    const error = ref(null);

    const detail = ref(null);          // { lead, events, meta_form, lead_form, meta_campaign }
    const detailLoading = ref(false);
    const actionBusy = ref(false);

    // ── Options derivadas (alimentam os MultiSelectors da FiltersBar) ─────────
    const campaignOptions = computed(() => {
        const map = new Map();
        for (const l of leads.value) {
            if (l.meta_campaign_id && l.meta_campaign_name) {
                map.set(String(l.meta_campaign_id), l.meta_campaign_name);
            }
        }
        return [...map.entries()].map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    });

    const midiaOptions = computed(() => {
        const set = new Set();
        for (const l of leads.value) if (l.midia_slug) set.add(l.midia_slug);
        return [...set].sort();
    });

    const cvOrigemOptions = computed(() => {
        const set = new Set();
        for (const l of leads.value) if (l.cv_origem) set.add(l.cv_origem);
        return [...set].sort();
    });

    const hasActiveFilters = computed(() => {
        const f = filters.value;
        return (
            f.status.length > 0 || f.channel.length > 0 || f.cv_origem.length > 0 ||
            f.midia_slug.length > 0 || f.meta_campaign_id.length > 0 ||
            (f.q && f.q.trim() !== '') || !!f.period_start || !!f.period_end ||
            f.sort !== 'recent'
        );
    });

    // ── Helpers ────────────────────────────────────────────────────────────────
    function setViewMode(m) {
        viewMode.value = m;
        localStorage.setItem(VIEWMODE_KEY, m);
    }

    function setHealthPeriod(p) {
        healthPeriod.value = p;
        localStorage.setItem(PERIOD_KEY, p);
        fetchHealth();
    }

    function resetFilters() {
        filters.value = defaultFilters();
        page.value = 1;
        fetchLeads();
    }

    // ── API ────────────────────────────────────────────────────────────────────
    async function fetchLeads() {
        error.value = null;
        loading.value = true;
        try {
            const qs = new URLSearchParams();
            const f = filters.value;

            const appendCsv = (key, arr) => {
                if (Array.isArray(arr) && arr.length) qs.set(key, arr.join(','));
            };
            appendCsv('status', f.status);
            appendCsv('channel', f.channel);
            appendCsv('cv_origem', f.cv_origem);
            appendCsv('midia_slug', f.midia_slug);
            appendCsv('meta_campaign_id', f.meta_campaign_id);
            if (f.q && f.q.trim()) qs.set('q', f.q.trim());
            if (f.period_start) qs.set('period_start', f.period_start);
            if (f.period_end) qs.set('period_end', f.period_end);
            qs.set('page', String(page.value));
            qs.set('pageSize', String(pageSize.value));

            const data = await apiFetch(`/inbound-leads?${qs.toString()}`);
            leads.value = Array.isArray(data.results) ? data.results : [];
            total.value = data.total || 0;
        } catch (e) {
            error.value = e.message;
            leads.value = [];
        } finally {
            loading.value = false;
        }
    }

    async function fetchHealth() {
        try {
            health.value = await apiFetch(`/capture/health?period=${encodeURIComponent(healthPeriod.value)}`);
        } catch (e) {
            console.warn('[capture] health:', e.message);
        }
    }

    async function fetchDetail(id) {
        detail.value = null;
        detailLoading.value = true;
        error.value = null;
        try {
            const data = await apiFetch(`/inbound-leads/${id}`);
            detail.value = {
                lead: data.lead,
                events: data.events || [],
                meta_form: data.meta_form || null,
                lead_form: data.lead_form || null,
                meta_campaign: data.meta_campaign || null,
            };
        } catch (e) {
            error.value = e.message;
        } finally {
            detailLoading.value = false;
        }
    }

    async function refreshAround(id) {
        await Promise.all([fetchDetail(id), fetchLeads(), fetchHealth()]);
    }

    async function routeLead(id, binding) {
        actionBusy.value = true;
        error.value = null;
        try {
            await apiFetch(`/inbound-leads/${id}/route`, {
                method: 'POST',
                body: JSON.stringify(binding),
            });
            await refreshAround(id);
            return true;
        } catch (e) {
            error.value = e.message;
            return false;
        } finally {
            actionBusy.value = false;
        }
    }

    async function redispatchLead(id) {
        actionBusy.value = true;
        error.value = null;
        try {
            await apiFetch(`/inbound-leads/${id}/redispatch`, { method: 'POST' });
            await refreshAround(id);
            return true;
        } catch (e) {
            error.value = e.message;
            return false;
        } finally {
            actionBusy.value = false;
        }
    }

    async function setSpam(id, spam) {
        actionBusy.value = true;
        error.value = null;
        try {
            await apiFetch(`/inbound-leads/${id}/${spam ? 'mark-spam' : 'unmark-spam'}`, { method: 'POST' });
            await refreshAround(id);
            return true;
        } catch (e) {
            error.value = e.message;
            return false;
        } finally {
            actionBusy.value = false;
        }
    }

    async function reconcileCv(id) {
        actionBusy.value = true;
        error.value = null;
        try {
            const d = await apiFetch(`/inbound-leads/${id}/reconcile-cv`, { method: 'POST' });
            await refreshAround(id);
            return d;
        } catch (e) {
            error.value = e.message;
            return null;
        } finally {
            actionBusy.value = false;
        }
    }

    /**
     * Backfill em batch — resolve meta_campaign_id de leads históricos que têm
     * meta_ad_id preenchido mas perderam o campaign_id no import.
     */
    async function backfillCampaigns({ dryRun = false, limit = 1000 } = {}) {
        actionBusy.value = true;
        error.value = null;
        try {
            const d = await apiFetch('/inbound-leads/backfill-campaign', {
                method: 'POST',
                body: JSON.stringify({ dryRun, limit }),
            });
            if (!dryRun) await Promise.all([fetchLeads(), fetchHealth()]);
            return d;
        } catch (e) {
            error.value = e.message;
            return null;
        } finally {
            actionBusy.value = false;
        }
    }

    /**
     * Full sync da Meta — varre forms, campanhas, ads (todas), backfill,
     * import histórico e reconciliação CV. Demora 2-5 min em produção.
     *
     * Quando termina, recarrega lista e health pra refletir tudo.
     */
    async function runFullSync({ sinceDays = 90, historicalDays = 30 } = {}) {
        actionBusy.value = true;
        error.value = null;
        try {
            const d = await apiFetch('/sync/full', {
                method: 'POST',
                body: JSON.stringify({ sinceDays, historicalDays, adsAllStatuses: true }),
            });
            await Promise.all([fetchLeads(), fetchHealth()]);
            return d;
        } catch (e) {
            error.value = e.message;
            return null;
        } finally {
            actionBusy.value = false;
        }
    }

    return {
        // state
        leads, total, page, pageSize, filters,
        health, healthPeriod, viewMode,
        loading, error,
        detail, detailLoading, actionBusy,
        // derived
        campaignOptions, midiaOptions, cvOrigemOptions, hasActiveFilters,
        // actions
        fetchLeads, fetchHealth, fetchDetail,
        routeLead, redispatchLead, setSpam, reconcileCv,
        backfillCampaigns, runFullSync,
        setViewMode, setHealthPeriod, resetFilters,
    };
});
