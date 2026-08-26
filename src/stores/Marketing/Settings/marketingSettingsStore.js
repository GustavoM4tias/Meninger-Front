// stores/Marketing/Settings/marketingSettingsStore.js
//
// Store da config singleton de captação. Conversa com /api/marketing/config.
// Secrets são guardados no banco criptografados — o GET nunca retorna o valor;
// só flags has_X. O PUT só persiste secret quando o usuário digita um novo
// (campos vazios são preservados pelo backend).

import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';

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

export const useMarketingSettingsStore = defineStore('marketingSettings', () => {
    const config = ref(null);
    const webhookUrl = ref('');
    const loading = ref(false);
    const saving = ref(false);
    const testing = ref(false);
    const error = ref(null);
    const testResult = ref(null);

    async function fetchConfig() {
        loading.value = true;
        error.value = null;
        try {
            const d = await apiFetch('/config');
            config.value = d.config;
            webhookUrl.value = d.webhook_url || '';
        } catch (e) {
            error.value = e.message;
        } finally {
            loading.value = false;
        }
    }

    // Etapas de lead do CV (ordem + nome). A régua do retorno de lead é escolhida
    // por etapa, e a lista tem que vir do CV para acompanhar etapa nova criada lá.
    async function fetchSituacoesCv() {
        const d = await apiFetch('/lead-return/workflow');
        return (d.situacoes || [])
            .map(s => ({ idsituacao: s.idsituacao, nome: s.nome, ordem: Number(s.ordem) }))
            .sort((a, b) => a.ordem - b.ordem);
    }

    async function updateConfig(patch) {
        saving.value = true;
        error.value = null;
        try {
            const d = await apiFetch('/config', {
                method: 'PUT',
                body: JSON.stringify(patch),
            });
            config.value = d.config;
            return true;
        } catch (e) {
            error.value = e.message;
            return false;
        } finally {
            saving.value = false;
        }
    }

    async function testMeta() {
        testing.value = true;
        testResult.value = null;
        try {
            const d = await apiFetch('/config/meta-test', { method: 'POST' });
            testResult.value = d;
        } catch (e) {
            testResult.value = { ok: false, error: e.message };
        } finally {
            testing.value = false;
        }
    }

    return {
        config, webhookUrl, loading, saving, testing, error, testResult,
        fetchConfig, updateConfig, fetchSituacoesCv, testMeta,
    };
});
