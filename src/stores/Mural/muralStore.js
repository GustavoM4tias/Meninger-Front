// stores/Mural/muralStore.js
//
// Mural de Avisos / Comunicados — store do USUÁRIO. Cuida dos dados (mural pessoal,
// ciência) E do estado de UI do card flutuante (aberto/fechado, "novidade", polling).
//
// Comportamento de UI:
//  • O card flutua sozinho quando chega algo NOVO (pendência de ciência ainda não vista).
//  • Uma vez fechado sem dar ciência, fica fechado — a pendência continua sinalizada
//    apenas no ícone do mural na nav (badge). Clicar no ícone reabre o card.

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';

const SEEN_KEY = 'mural.seen';

function authHeaders() {
    const token = localStorage.getItem('token');
    return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
}

async function apiFetch(path, opts = {}) {
    const resp = await fetch(`${API_URL}/comunicados${path}`, { headers: authHeaders(), ...opts });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.ok === false) {
        throw new Error(data?.message || data?.error || `Erro na requisição (${resp.status}).`);
    }
    return data;
}

function loadSeen() {
    try {
        const a = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
        return Array.isArray(a) ? a.map(Number) : [];
    } catch {
        return [];
    }
}

export const useMuralStore = defineStore('mural', () => {
    const items = ref([]);     // comunicados ativos direcionados ao usuário (ordenados no backend)
    const pending = ref(0);    // obrigatórios ainda sem ciência (badge)
    const loading = ref(false);
    const error = ref(null);

    // ── Estado de UI do card flutuante ──
    const panelOpen = ref(false);
    const seenIds = ref(loadSeen());

    const hasPending = computed(() => pending.value > 0);
    const requiresAckPending = computed(() => items.value.filter((c) => c.requiresAck && !c.acked));
    const ackPendingCount = computed(() => requiresAckPending.value.length);
    const hasUrgentePending = computed(() => requiresAckPending.value.some((c) => c.kind === 'URGENTE'));
    // "novo" = pendência de ciência para a qual o card ainda não flutuou.
    const hasNew = computed(() => requiresAckPending.value.some((c) => !seenIds.value.includes(Number(c.id))));

    function persistSeen() {
        try { localStorage.setItem(SEEN_KEY, JSON.stringify(seenIds.value.slice(-300))); } catch { /* noop */ }
    }
    function markSeen() {
        let changed = false;
        for (const c of requiresAckPending.value) {
            const id = Number(c.id);
            if (!seenIds.value.includes(id)) { seenIds.value.push(id); changed = true; }
        }
        if (changed) persistSeen();
    }
    function openPanel() { panelOpen.value = true; markSeen(); }
    function closePanel() { panelOpen.value = false; }
    function togglePanel() { if (panelOpen.value) closePanel(); else openPanel(); }

    async function fetchMine() {
        loading.value = true;
        error.value = null;
        try {
            const data = await apiFetch('/me');
            items.value = Array.isArray(data.results) ? data.results : [];
            pending.value = requiresAckPending.value.length;
            // Flutua automaticamente só quando há algo NOVO (não visto).
            if (hasNew.value) openPanel();
        } catch (e) {
            error.value = e.message;
            items.value = [];
        } finally {
            loading.value = false;
        }
    }

    // Leve — usada por telas que só querem o número de pendências.
    async function fetchPending() {
        try {
            const data = await apiFetch('/me/pending');
            pending.value = Number(data?.pending || 0);
        } catch {
            /* badge não deve quebrar a navegação */
        }
        return pending.value;
    }

    // Confirma "Li e estou ciente". Idempotente; atualiza o item in-place.
    async function ack(id) {
        error.value = null;
        try {
            const data = await apiFetch(`/${id}/ack`, { method: 'POST' });
            const it = items.value.find((c) => c.id === id);
            if (it) {
                it.acked = true;
                it.ackedAt = data?.ackedAt || new Date().toISOString();
            }
            pending.value = requiresAckPending.value.length;
            return true;
        } catch (e) {
            error.value = e.message;
            return false;
        }
    }

    // ── Polling: detecta comunicados novos sem precisar recarregar ──
    let pollHandle = null;
    function startPolling(ms = 60000) {
        stopPolling();
        try { pollHandle = setInterval(() => { fetchMine(); }, ms); } catch { /* noop */ }
    }
    function stopPolling() {
        if (pollHandle) { clearInterval(pollHandle); pollHandle = null; }
    }

    return {
        items, pending, loading, error,
        hasPending, requiresAckPending, ackPendingCount, hasUrgentePending, hasNew,
        panelOpen, seenIds,
        fetchMine, fetchPending, ack,
        openPanel, closePanel, togglePanel, markSeen,
        startPolling, stopPolling,
    };
});
