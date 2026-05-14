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
    const historyFilter = ref({ status: '', idreserva: '' });

    async function fetchHistory() {
        historyLoading.value = true;
        historyError.value = null;
        try {
            const params = new URLSearchParams({
                page: historyPage.value,
                limit: historyLimit.value,
            });
            if (historyFilter.value.status) params.set('status', historyFilter.value.status);
            if (historyFilter.value.idreserva) params.set('idreserva', historyFilter.value.idreserva);

            const data = await requestWithAuth(`/boleto-caixa/history?${params}`);
            history.value = data.rows || [];
            historyTotal.value = data.total || 0;
        } catch (err) {
            historyError.value = err.message || 'Erro ao carregar histórico.';
        } finally {
            historyLoading.value = false;
        }
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
        fetchHistory, setPage, totalPages, retryHistoryItem,
        // comission rules
        rules, rulesLoading, rulesError,
        fetchComissionRules, createComissionRule, updateComissionRule, deleteComissionRule,
    };
});
