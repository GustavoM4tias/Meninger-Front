// stores/Comercial/ReservaCancel/reservaCancelStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useReservaCancelStore = defineStore('reservaCancel', () => {
    // ── Settings ──────────────────────────────────────────────────────────────
    const settings = ref(null);
    const settingsLoading = ref(false);
    const settingsError = ref(null);
    const settingsSaved = ref(false);

    async function fetchSettings() {
        settingsLoading.value = true;
        settingsError.value = null;
        try {
            settings.value = await requestWithAuth('/cancelamento-reservas/settings');
        } catch (err) {
            settingsError.value = err.message || 'Erro ao carregar configurações.';
        } finally {
            settingsLoading.value = false;
        }
    }

    async function saveSettings(payload) {
        settingsLoading.value = true;
        settingsError.value = null;
        settingsSaved.value = false;
        try {
            settings.value = await requestWithAuth('/cancelamento-reservas/settings', {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            settingsSaved.value = true;
        } catch (err) {
            settingsError.value = err.message || 'Erro ao salvar configurações.';
        } finally {
            settingsLoading.value = false;
        }
    }

    // ── History ───────────────────────────────────────────────────────────────
    const history = ref([]);
    const historyTotal = ref(0);
    const historyPage = ref(1);
    const historyLimit = ref(20);
    const historyLoading = ref(false);
    const historyError = ref(null);

    const historyFilter = ref({
        status: [],            // multi: processing/success/blocked/skipped/ignored/error
        empreendimento: [],
        idreserva: '',
        dateFrom: '',
        dateTo: '',
        q: '',
    });

    // ── Ordenação (server-side) — padrão: caso mais recente primeiro ───────────
    const sortBy = ref('caso');  // caso | titular | unidade | contrato | status | quando
    const sortDir = ref('desc'); // asc | desc

    function buildParams(extra = {}) {
        const params = new URLSearchParams(extra);
        const f = historyFilter.value;
        if (Array.isArray(f.status) && f.status.length) params.set('status', f.status.join(','));
        if (Array.isArray(f.empreendimento) && f.empreendimento.length) params.set('empreendimento', f.empreendimento.join(','));
        if (f.idreserva) params.set('idreserva', f.idreserva);
        if (f.dateFrom)  params.set('dateFrom', f.dateFrom);
        if (f.dateTo)    params.set('dateTo', f.dateTo);
        if (f.q)         params.set('q', f.q);
        return params;
    }

    async function fetchHistory(opts = {}) {
        const silent = !!opts.silent;
        if (!silent) {
            historyLoading.value = true;
            historyError.value = null;
        }
        try {
            const params = buildParams({
                page: historyPage.value,
                limit: historyLimit.value,
                sortBy: sortBy.value,
                sortDir: sortDir.value,
            });
            const data = await requestWithAuth(`/cancelamento-reservas/history?${params}`);
            history.value = data.rows || [];
            historyTotal.value = data.total || 0;
        } catch (err) {
            if (!silent) historyError.value = err.message || 'Erro ao carregar histórico.';
        } finally {
            if (!silent) historyLoading.value = false;
        }
    }

    const totalPages = computed(() => Math.ceil(historyTotal.value / historyLimit.value));

    function setPage(p) {
        historyPage.value = p;
        fetchHistory();
    }

    function setSort(key) {
        if (sortBy.value === key) {
            sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
        } else {
            sortBy.value = key;
            sortDir.value = 'asc';
        }
        historyPage.value = 1;
        fetchHistory();
    }

    function resetHistoryFilters() {
        historyFilter.value = { status: [], empreendimento: [], idreserva: '', dateFrom: '', dateTo: '', q: '' };
        historyPage.value = 1;
    }

    // ── Stats / Facets ────────────────────────────────────────────────────────
    const stats = ref(null);
    async function fetchStats() {
        try {
            stats.value = await requestWithAuth(`/cancelamento-reservas/history-stats?${buildParams()}`);
        } catch (err) {
            console.warn('[reservaCancelStore] stats:', err.message);
        }
    }

    const facets = ref({ empreendimentos: [] });
    async function fetchFacets() {
        try {
            facets.value = await requestWithAuth('/cancelamento-reservas/history-facets');
        } catch (err) {
            console.warn('[reservaCancelStore] facets:', err.message);
        }
    }

    // ── Detalhe / timeline ────────────────────────────────────────────────────
    const timelineLoading = ref(false);
    const timelineError = ref(null);
    const timelineEvents = ref([]);
    const timelineHistory = ref(null);
    const timelineAttempts = ref([]);

    async function fetchTimeline(historyId, opts = {}) {
        const silent = !!opts.silent;
        if (!silent) {
            timelineLoading.value = true;
            timelineError.value = null;
            timelineEvents.value = [];
            timelineHistory.value = null;
            timelineAttempts.value = [];
        }
        try {
            const data = await requestWithAuth(`/cancelamento-reservas/history/${historyId}/events`);
            timelineEvents.value = Array.isArray(data?.events) ? data.events : [];
            timelineAttempts.value = Array.isArray(data?.attempts) ? data.attempts : [];
            timelineHistory.value = data?.history || null;
        } catch (err) {
            if (!silent) timelineError.value = err.message || 'Erro ao carregar timeline.';
        } finally {
            if (!silent) timelineLoading.value = false;
        }
    }

    // ── Ações ─────────────────────────────────────────────────────────────────
    async function retryHistoryItem(id) {
        try {
            const data = await requestWithAuth(`/cancelamento-reservas/history/${id}/retry`, { method: 'POST' });
            return { ok: true, data };
        } catch (err) {
            return { ok: false, error: err.message || 'Erro ao reprocessar.' };
        }
    }

    async function processManual(idreserva) {
        try {
            const data = await requestWithAuth('/cancelamento-reservas/process', {
                method: 'POST',
                body: JSON.stringify({ idreserva: Number(idreserva) }),
            });
            return { ok: true, data };
        } catch (err) {
            return { ok: false, error: err.message || 'Erro ao processar reserva.' };
        }
    }

    async function simulateWebhook(idreserva) {
        try {
            await requestWithAuth('/cancelamento-reservas/simulate', {
                method: 'POST',
                body: JSON.stringify({ idreserva: Number(idreserva) }),
            });
            return { ok: true };
        } catch (err) {
            return { ok: false, error: err.message || 'Erro ao simular webhook.' };
        }
    }

    return {
        settings, settingsLoading, settingsError, settingsSaved, fetchSettings, saveSettings,
        history, historyTotal, historyPage, historyLimit, historyLoading, historyError,
        historyFilter, fetchHistory, setPage, setSort, sortBy, sortDir, totalPages, resetHistoryFilters,
        stats, fetchStats, facets, fetchFacets,
        timelineLoading, timelineError, timelineEvents, timelineHistory, timelineAttempts, fetchTimeline,
        retryHistoryItem, processManual, simulateWebhook,
    };
});
