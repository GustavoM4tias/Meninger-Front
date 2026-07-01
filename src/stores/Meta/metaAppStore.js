// stores/Meta/metaAppStore.js
//
// Credenciais de App do Meta (compartilhadas WhatsApp + Lead Ads).
// Conversa com /api/meta-app. O App Secret é guardado criptografado no banco —
// o GET nunca retorna o valor, só a flag has_meta_app_secret. O PUT só grava o
// secret quando o usuário digita um novo (vazio = preserva).

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

export const useMetaAppStore = defineStore('metaApp', () => {
    const config = ref(null);
    const loading = ref(false);
    const saving = ref(false);
    const testing = ref(false);
    const error = ref(null);
    const testResult = ref(null);

    async function fetchConfig() {
        loading.value = true;
        error.value = null;
        try {
            const resp = await fetch(`${API_URL}/meta-app/config`, { headers: authHeaders() });
            const d = await resp.json().catch(() => ({}));
            if (!resp.ok || d?.ok === false) throw new Error(d?.error || `Erro (${resp.status}).`);
            config.value = d.config;
        } catch (e) {
            error.value = e.message;
        } finally {
            loading.value = false;
        }
    }

    async function updateConfig(patch) {
        saving.value = true;
        error.value = null;
        try {
            const resp = await fetch(`${API_URL}/meta-app/config`, {
                method: 'PUT', headers: authHeaders(), body: JSON.stringify(patch),
            });
            const d = await resp.json().catch(() => ({}));
            if (!resp.ok || d?.ok === false) throw new Error(d?.error || `Erro (${resp.status}).`);
            config.value = d.config;
            return true;
        } catch (e) {
            error.value = e.message;
            return false;
        } finally {
            saving.value = false;
        }
    }

    // O teste responde 200 com { ok:false, error, hint } quando o segredo não
    // bate — por isso lemos o corpo direto (sem tratar ok:false como exceção).
    async function testSecret() {
        testing.value = true;
        testResult.value = null;
        try {
            const resp = await fetch(`${API_URL}/meta-app/config/test`, { method: 'POST', headers: authHeaders() });
            testResult.value = await resp.json().catch(() => ({ ok: false, error: `Erro (${resp.status}).` }));
            await fetchConfig();
        } catch (e) {
            testResult.value = { ok: false, error: e.message };
        } finally {
            testing.value = false;
        }
    }

    // ── Token de gestão de campanhas (admin — vê todas as contas/BMs) ─────────
    const campaignsStatus = ref(null);
    const campaignsBusy = ref(false);
    const campaignsMsg = ref(null);

    async function fetchCampaignsStatus() {
        try {
            const resp = await fetch(`${API_URL}/meta-app/campaigns/status`, { headers: authHeaders() });
            const d = await resp.json().catch(() => ({}));
            if (resp.ok && d?.ok) campaignsStatus.value = d.status;
        } catch { /* silencioso */ }
    }

    async function connectCampaigns(token) {
        campaignsBusy.value = true; campaignsMsg.value = null;
        try {
            const resp = await fetch(`${API_URL}/meta-app/campaigns/connect`, {
                method: 'POST', headers: authHeaders(), body: JSON.stringify({ token }),
            });
            const d = await resp.json().catch(() => ({}));
            if (!resp.ok || d?.ok === false) throw new Error(d?.error || `Erro (${resp.status}).`);
            await fetchCampaignsStatus();
            campaignsMsg.value = { type: 'success', text: `Conectado como ${d.name || 'admin'}${d.accounts_count != null ? ` · ${d.accounts_count} contas visíveis` : ''}.` };
            return d;
        } catch (e) {
            campaignsMsg.value = { type: 'error', text: e.message };
            return null;
        } finally { campaignsBusy.value = false; }
    }

    async function refreshCampaigns() {
        campaignsBusy.value = true; campaignsMsg.value = null;
        try {
            const resp = await fetch(`${API_URL}/meta-app/campaigns/refresh`, { method: 'POST', headers: authHeaders() });
            const d = await resp.json().catch(() => ({}));
            await fetchCampaignsStatus();
            campaignsMsg.value = d?.refreshed
                ? { type: 'success', text: `Token renovado${d.days_left != null ? ` · expira em ${d.days_left} dias` : ''}.` }
                : { type: 'error', text: d?.reason || 'Não foi possível renovar (reconecte pelo login).' };
        } finally { campaignsBusy.value = false; }
    }

    async function disconnectCampaigns() {
        campaignsBusy.value = true; campaignsMsg.value = null;
        try {
            await fetch(`${API_URL}/meta-app/campaigns/disconnect`, { method: 'POST', headers: authHeaders() });
            await fetchCampaignsStatus();
        } finally { campaignsBusy.value = false; }
    }

    async function campaignsOAuthUrl() {
        const resp = await fetch(`${API_URL}/meta-app/campaigns/oauth/url`, { headers: authHeaders() });
        const d = await resp.json().catch(() => ({}));
        if (!resp.ok || d?.ok === false) throw new Error(d?.error || `Erro (${resp.status}).`);
        return d;
    }

    return {
        config, loading, saving, testing, error, testResult, fetchConfig, updateConfig, testSecret,
        campaignsStatus, campaignsBusy, campaignsMsg,
        fetchCampaignsStatus, connectCampaigns, refreshCampaigns, disconnectCampaigns, campaignsOAuthUrl,
    };
});
