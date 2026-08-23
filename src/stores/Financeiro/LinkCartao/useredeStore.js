// stores/Financeiro/LinkCartao/useredeStore.js
//
// Estado da tela Link de Cartão (Userede).
// As credenciais só sobem: o backend nunca devolve usuário/senha, apenas os
// flags `usuario_set`/`senha_set`.
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useUseredeStore = defineStore('userede', () => {
    const settings = ref(null);
    const settingsLoading = ref(false);
    const settingsError = ref(null);
    const settingsSaved = ref(false);

    async function fetchSettings() {
        settingsLoading.value = true;
        settingsError.value = null;
        try {
            settings.value = await requestWithAuth('/link-cartao/settings');
        } catch (err) {
            settingsError.value = err.message || 'Falha ao carregar as configurações.';
        } finally {
            settingsLoading.value = false;
        }
    }

    async function saveSettings(payload) {
        settingsLoading.value = true;
        settingsError.value = null;
        settingsSaved.value = false;
        try {
            settings.value = await requestWithAuth('/link-cartao/settings', {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            settingsSaved.value = true;
            setTimeout(() => { settingsSaved.value = false; }, 3000);
            return true;
        } catch (err) {
            settingsError.value = err.message || 'Falha ao salvar as configurações.';
            return false;
        } finally {
            settingsLoading.value = false;
        }
    }

    // ── Teste de conexão ──────────────────────────────────────────────────────
    // O backend responde 200 mesmo quando falha, com `ok:false` e o diagnóstico —
    // a tela mostra o motivo em vez de um erro genérico.
    const testing = ref(false);
    const testResult = ref(null);

    async function testConnection() {
        testing.value = true;
        testResult.value = null;
        try {
            testResult.value = await requestWithAuth('/link-cartao/test-connection', { method: 'POST' });
            await fetchSettings();
        } catch (err) {
            testResult.value = { ok: false, etapa: 'falha', mensagem: err.message || 'Falha ao testar a conexão.' };
        } finally {
            testing.value = false;
        }
    }

    const resetting = ref(false);

    async function resetSession() {
        resetting.value = true;
        try {
            await requestWithAuth('/link-cartao/session/reset', { method: 'POST' });
            testResult.value = null;
            await fetchSettings();
            return true;
        } catch (err) {
            testResult.value = { ok: false, etapa: 'falha', mensagem: err.message };
            return false;
        } finally {
            resetting.value = false;
        }
    }

    return {
        settings, settingsLoading, settingsError, settingsSaved,
        fetchSettings, saveSettings,
        testing, testResult, testConnection,
        resetting, resetSession,
    };
});

export default useUseredeStore;
