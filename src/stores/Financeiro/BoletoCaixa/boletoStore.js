// stores/Financeiro/BoletoCaixa/boletoStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useBoletoStore = defineStore('boletoCaixa', () => {
    // ── Settings ──────────────────────────────────────────────────────────────
    const settings = ref(null);
    const settingsLoading = ref(false);
    const settingsError = ref(null);
    const settingsSaved = ref(false);

    async function fetchSettings() {
        settingsLoading.value = true;
        settingsError.value = null;
        try {
            const data = await requestWithAuth('/boleto-caixa/settings');
            settings.value = data;
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
            const data = await requestWithAuth('/boleto-caixa/settings', { method: 'PATCH', body: JSON.stringify(payload) });
            settings.value = data;
            settingsSaved.value = true;
        } catch (err) {
            settingsError.value = err.message || 'Erro ao salvar configurações.';
        } finally {
            settingsLoading.value = false;
        }
    }

    // ── Simulate (dev only) ───────────────────────────────────────────────────
    const simulateLoading = ref(false);
    const simulateError = ref(null);
    const simulateSuccess = ref(false);

    async function simulateWebhook(idreserva) {
        simulateLoading.value = true;
        simulateError.value = null;
        simulateSuccess.value = false;
        try {
            await requestWithAuth('/boleto-caixa/simulate', {
                method: 'POST',
                body: JSON.stringify({ idreserva: Number(idreserva) }),
            });
            simulateSuccess.value = true;
        } catch (err) {
            simulateError.value = err.message || 'Erro ao simular webhook.';
        } finally {
            simulateLoading.value = false;
        }
    }

    // ── History ───────────────────────────────────────────────────────────────
    const history = ref([]);
    const historyTotal = ref(0);
    const historyPage = ref(1);
    const historyLimit = ref(20);
    const historyLoading = ref(false);
    const historyError = ref(null);

    // Filtros expandidos (alinhados com o backend listHistory). Arrays viram CSV
    // na query string; strings vazias são omitidas.
    const historyFilter = ref({
        status: [],            // multi: processing/success/error
        paymentStatus: [],     // multi: pending/paid/cancelled/error
        empreendimento: [],    // multi (nomes exatos)
        idreserva: '',
        dateFrom: '',
        dateTo: '',
        q: '',                 // titular / nosso número / nº documento
    });

    function buildHistoryParams() {
        const params = new URLSearchParams({
            page: historyPage.value,
            limit: historyLimit.value,
        });
        const f = historyFilter.value;
        if (Array.isArray(f.status) && f.status.length) params.set('status', f.status.join(','));
        if (Array.isArray(f.paymentStatus) && f.paymentStatus.length) params.set('paymentStatus', f.paymentStatus.join(','));
        if (Array.isArray(f.empreendimento) && f.empreendimento.length) params.set('empreendimento', f.empreendimento.join(','));
        if (f.idreserva) params.set('idreserva', f.idreserva);
        if (f.dateFrom)  params.set('dateFrom', f.dateFrom);
        if (f.dateTo)    params.set('dateTo', f.dateTo);
        if (f.q)         params.set('q', f.q);
        return params;
    }

    /**
     * Busca o histórico aplicando os filtros atuais.
     * @param {object} [opts]
     * @param {boolean} [opts.silent=false] - quando true, não toca em
     *   historyLoading/Error — usado pelo polling em background pra não piscar
     *   spinner na UI. Mantém a estabilidade visual durante atualizações
     *   automáticas após ações como "Verificar pagamento".
     */
    async function fetchHistory(opts = {}) {
        const silent = !!opts.silent;
        if (!silent) {
            historyLoading.value = true;
            historyError.value = null;
        }
        try {
            const data = await requestWithAuth(`/boleto-caixa/history?${buildHistoryParams()}`);
            history.value = data.rows || [];
            historyTotal.value = data.total || 0;
        } catch (err) {
            if (!silent) historyError.value = err.message || 'Erro ao carregar histórico.';
        } finally {
            if (!silent) historyLoading.value = false;
        }
    }

    // ── KPIs / Stats agregados (mesmos filtros do history) ───────────────────
    const stats = ref(null);
    const statsLoading = ref(false);

    async function fetchStats(opts = {}) {
        const silent = !!opts.silent;
        if (!silent) statsLoading.value = true;
        try {
            // Reusa os mesmos filtros — mas sem paginação
            const params = new URLSearchParams();
            const f = historyFilter.value;
            if (Array.isArray(f.status) && f.status.length) params.set('status', f.status.join(','));
            if (Array.isArray(f.paymentStatus) && f.paymentStatus.length) params.set('paymentStatus', f.paymentStatus.join(','));
            if (Array.isArray(f.empreendimento) && f.empreendimento.length) params.set('empreendimento', f.empreendimento.join(','));
            if (f.idreserva) params.set('idreserva', f.idreserva);
            if (f.dateFrom)  params.set('dateFrom', f.dateFrom);
            if (f.dateTo)    params.set('dateTo', f.dateTo);
            if (f.q)         params.set('q', f.q);

            stats.value = await requestWithAuth(`/boleto-caixa/history-stats?${params}`);
        } catch (err) {
            console.warn('[boletoStore] fetchStats:', err.message);
        } finally {
            if (!silent) statsLoading.value = false;
        }
    }

    // Facets pra alimentar selects do filtro (empreendimentos distintos + contagens)
    const facets = ref({ empreendimentos: [], statusCounts: [], paymentCounts: [] });
    const facetsLoading = ref(false);
    async function fetchFacets() {
        facetsLoading.value = true;
        try {
            facets.value = await requestWithAuth('/boleto-caixa/history-facets');
        } catch (err) {
            console.warn('[boletoStore] facets:', err.message);
        } finally {
            facetsLoading.value = false;
        }
    }

    function resetHistoryFilters() {
        historyFilter.value = {
            status: [],
            paymentStatus: [],
            empreendimento: [],
            idreserva: '',
            dateFrom: '',
            dateTo: '',
            q: '',
        };
        historyPage.value = 1;
    }

    const totalPages = computed(() => Math.ceil(historyTotal.value / historyLimit.value));

    function setPage(p) {
        historyPage.value = p;
        fetchHistory();
    }

    async function retryHistoryItem(id) {
        try {
            await requestWithAuth(`/boleto-caixa/history/${id}/retry`, { method: 'POST' });
            return true;
        } catch (err) {
            historyError.value = err.message || 'Erro ao re-disparar processamento.';
            return false;
        }
    }

    async function resendHistoryItem(id) {
        try {
            const data = await requestWithAuth(`/boleto-caixa/history/${id}/resend`, { method: 'POST' });
            await fetchHistory();
            return { ok: true, data };
        } catch (err) {
            historyError.value = err.message || 'Erro ao reenviar boleto ao cliente.';
            return { ok: false, error: err.message };
        }
    }

    // ── Timeline de eventos ───────────────────────────────────────────────────
    const timelineLoading = ref(false);
    const timelineError = ref(null);
    const timelineEvents = ref([]);
    const timelineHistory = ref(null);

    /**
     * Busca eventos da timeline de um histórico específico.
     * @param {number} historyId
     * @param {object} [opts]
     * @param {boolean} [opts.silent=false] - quando true, mantém o conteúdo
     *   atual visível durante o fetch (sem limpar eventos nem ligar spinner).
     *   Só substitui os arrays quando a resposta chega. Usado pelo polling.
     */
    async function fetchTimeline(historyId, opts = {}) {
        const silent = !!opts.silent;
        if (!silent) {
            timelineLoading.value = true;
            timelineError.value = null;
            timelineEvents.value = [];
            timelineHistory.value = null;
        }
        try {
            const data = await requestWithAuth(`/boleto-caixa/history/${historyId}/events`);
            timelineEvents.value = Array.isArray(data?.events) ? data.events : [];
            timelineHistory.value = data?.history || null;
        } catch (err) {
            if (!silent) timelineError.value = err.message || 'Erro ao carregar timeline.';
        } finally {
            if (!silent) timelineLoading.value = false;
        }
    }

    async function triggerPaymentCheck(historyId) {
        try {
            await requestWithAuth(`/boleto-caixa/history/${historyId}/check-payment`, { method: 'POST' });
            return { ok: true };
        } catch (err) {
            // 409 = lock ocupado — sinaliza pro UI mostrar mensagem diferente
            // (sem polling, sem "disparado") em vez de mensagem genérica.
            return {
                ok: false,
                error: err.message,
                conflict: err.status === 409,
                lock: err.payload?.lock || null,
            };
        }
    }

    // ── WhatsApp Template ─────────────────────────────────────────────────────
    const whatsappTemplate = ref(null);
    const whatsappTemplateLoading = ref(false);
    const whatsappTemplateError = ref(null);
    const whatsappTemplateMsg = ref(null);

    async function fetchWhatsappTemplate() {
        whatsappTemplateLoading.value = true;
        whatsappTemplateError.value = null;
        try {
            whatsappTemplate.value = await requestWithAuth('/boleto-caixa/whatsapp-template');
        } catch (err) {
            whatsappTemplateError.value = err.message || 'Erro ao consultar status do template.';
        } finally {
            whatsappTemplateLoading.value = false;
        }
    }

    async function syncWhatsappTemplate() {
        whatsappTemplateLoading.value = true;
        whatsappTemplateError.value = null;
        whatsappTemplateMsg.value = null;
        try {
            const data = await requestWithAuth('/boleto-caixa/whatsapp-template/sync', { method: 'POST' });
            whatsappTemplateMsg.value = data?.note || 'Template sincronizado com a Meta.';
            await fetchWhatsappTemplate();
            return true;
        } catch (err) {
            whatsappTemplateError.value = err.message || 'Erro ao sincronizar template com a Meta.';
            return false;
        } finally {
            whatsappTemplateLoading.value = false;
        }
    }

    // ── Empreendimentos do CV (para o picker das regras) ──────────────────────
    const enterprises = ref([]);
    const enterprisesLoading = ref(false);

    async function fetchEnterprises() {
        if (enterprises.value.length) return;
        enterprisesLoading.value = true;
        try {
            const data = await requestWithAuth('/cv/empreendimentos');
            const rows = Array.isArray(data) ? data : (data?.results ?? []);
            enterprises.value = rows
                .map(r => ({ idempreendimento: Number(r.idempreendimento), nome: r.nome }))
                .filter(r => Number.isFinite(r.idempreendimento))
                .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
        } catch (err) {
            console.warn('[boletoStore] fetchEnterprises:', err.message);
            enterprises.value = [];
        } finally {
            enterprisesLoading.value = false;
        }
    }

    // ── Regras de comissão por empreendimento ─────────────────────────────────
    const rules = ref([]);
    const rulesLoading = ref(false);
    const rulesError = ref(null);

    async function fetchComissionRules() {
        rulesLoading.value = true;
        rulesError.value = null;
        try {
            const data = await requestWithAuth('/boleto-caixa/comission-rules');
            rules.value = data.rows || [];
        } catch (err) {
            rulesError.value = err.message || 'Erro ao carregar regras de comissão.';
        } finally {
            rulesLoading.value = false;
        }
    }

    async function createComissionRule(payload) {
        rulesError.value = null;
        try {
            await requestWithAuth('/boleto-caixa/comission-rules', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            await fetchComissionRules();
            return true;
        } catch (err) {
            rulesError.value = err.message || 'Erro ao criar regra.';
            return false;
        }
    }

    async function updateComissionRule(id, payload) {
        rulesError.value = null;
        try {
            await requestWithAuth(`/boleto-caixa/comission-rules/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            await fetchComissionRules();
            return true;
        } catch (err) {
            rulesError.value = err.message || 'Erro ao atualizar regra.';
            return false;
        }
    }

    async function deleteComissionRule(id) {
        rulesError.value = null;
        try {
            await requestWithAuth(`/boleto-caixa/comission-rules/${id}`, { method: 'DELETE' });
            await fetchComissionRules();
            return true;
        } catch (err) {
            rulesError.value = err.message || 'Erro ao excluir regra.';
            return false;
        }
    }

    return {
        // settings
        settings, settingsLoading, settingsError, settingsSaved,
        fetchSettings, saveSettings,
        // simulate
        simulateLoading, simulateError, simulateSuccess,
        simulateWebhook,
        // history
        history, historyTotal, historyPage, historyLimit,
        historyLoading, historyError, historyFilter,
        fetchHistory, setPage, totalPages, retryHistoryItem, resendHistoryItem,
        resetHistoryFilters,
        // stats (KPIs)
        stats, statsLoading, fetchStats,
        // facets
        facets, facetsLoading, fetchFacets,
        // timeline
        timelineLoading, timelineError, timelineEvents, timelineHistory,
        fetchTimeline, triggerPaymentCheck,
        // whatsapp template
        whatsappTemplate, whatsappTemplateLoading, whatsappTemplateError, whatsappTemplateMsg,
        fetchWhatsappTemplate, syncWhatsappTemplate,
        // comission rules
        rules, rulesLoading, rulesError,
        fetchComissionRules, createComissionRule, updateComissionRule, deleteComissionRule,
        // enterprises picker
        enterprises, enterprisesLoading, fetchEnterprises,
    };
});
