// stores/Marketing/Capture/captureStore.js
//
// Store da gestão de captação de leads (inbox admin). Conversa com a API
// autenticada /api/marketing/* — listagem, detalhe + timeline, roteamento de
// leads "held", redispatch e health.

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

export const useCaptureStore = defineStore('marketingCapture', () => {
    const leads = ref([]);
    const total = ref(0);
    const page = ref(1);
    const pageSize = ref(25);
    const filters = ref({ status: '', channel: '', q: '' });

    const health = ref(null);
    const loading = ref(false);
    const error = ref(null);

    const detail = ref(null);          // { lead, events }
    const detailLoading = ref(false);
    const actionBusy = ref(false);

    async function fetchLeads() {
        error.value = null;
        loading.value = true;
        try {
            const qs = new URLSearchParams();
            if (filters.value.status) qs.set('status', filters.value.status);
            if (filters.value.channel) qs.set('channel', filters.value.channel);
            if (filters.value.q && filters.value.q.trim()) qs.set('q', filters.value.q.trim());
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
            health.value = await apiFetch('/capture/health');
        } catch (e) {
            // health é secundário — não bloqueia a tela
            console.warn('[capture] health:', e.message);
        }
    }

    async function fetchDetail(id) {
        detail.value = null;
        detailLoading.value = true;
        error.value = null;
        try {
            const data = await apiFetch(`/inbound-leads/${id}`);
            detail.value = { lead: data.lead, events: data.events || [] };
        } catch (e) {
            error.value = e.message;
        } finally {
            detailLoading.value = false;
        }
    }

    // Após uma ação, recarrega o detalhe + a lista + o health.
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

    return {
        leads, total, page, pageSize, filters, health, loading, error,
        detail, detailLoading, actionBusy,
        fetchLeads, fetchHealth, fetchDetail, routeLead, redispatchLead, setSpam,
    };
});
