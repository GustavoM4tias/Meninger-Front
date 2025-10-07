// src/stores/Support/supportStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { useAuthStore } from '@/stores/Auth/authStore'; // 👈 pegar token
import API_URL from '@/config/apiUrl';

export const useSupportStore = defineStore('support', () => {
    console.log('🍍 "support" store installed 🆕');

    // state
    const carregamentoStore = useCarregamentoStore();
    const list = ref([]);
    const current = ref(null);
    const counts = ref({ pending: 0, in_progress: 0, resolved: 0, closed: 0 });
    const stats = ref({ totalReports: 0, resolved: 0, avgResponseTime: '—' });
    const lastCreated = ref(null);
    const error = ref(null);

    // helpers
    const jsonFetch = async (path, options = {}) => {
        const auth = useAuthStore();
        const token = auth?.token; // ajuste conforme seu authStore (localStorage, etc.)

        const res = await fetch(`${API_URL}${path}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}), // 👈 manda o Bearer
                ...(options.headers || {}),
            },
            ...options,
            credentials: 'include', // pode manter ou remover se não usa cookies
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            // opcional: tratativa padrão de 401
            if (res.status === 401) {
                console.warn('Não autenticado (401).');
            }
            throw new Error(data.error || 'Erro de requisição');
        }
        return data;
    };

    const buildQuery = (params = {}) => {
        const q = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') q.append(k, v);
        });
        const s = q.toString();
        return s ? `?${s}` : '';
    };

    // actions
    const openTicket = async (payload) => {
        error.value = null;
        const data = await jsonFetch('/support/tickets', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        lastCreated.value = data;
        await Promise.all([fetchCounts(), fetchStats()]);
        return data;
    };

    const fetchTickets = async (params = {}) => {
        carregamentoStore.iniciarCarregamento();
        error.value = null;
        const data = await jsonFetch(`/support/tickets${buildQuery(params)}`);
        list.value = Array.isArray(data) ? data : (data.results || []);
        carregamentoStore.finalizarCarregamento();
    };

    const fetchTicket = async (id) => {
        carregamentoStore.iniciarCarregamento();
        error.value = null;
        current.value = null;
        const data = await jsonFetch(`/support/tickets/${id}`);
        current.value = data;
        carregamentoStore.finalizarCarregamento();
        return data;
    };

    const reply = async (ticketId, body, attachments = []) => {
        error.value = null;
        const data = await jsonFetch(`/support/tickets/${ticketId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ body, attachments }),
        });
        await fetchTicket(ticketId);
        return data;
    };

    const updateStatus = async (ticketId, status) => {
        error.value = null;
        const data = await jsonFetch(`/support/tickets/${ticketId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
        await Promise.all([fetchCounts(), fetchStats(), fetchTicket(ticketId)]);
        return data;
    };

    const fetchCounts = async () => {
        error.value = null;
        const data = await jsonFetch('/support/tickets/counts');
        counts.value = { pending: 0, in_progress: 0, resolved: 0, closed: 0, ...data };
    };

    const fetchStats = async () => {
        error.value = null;
        const data = await jsonFetch('/support/stats');
        stats.value = data;
    };

    return {
        // state
        list, current, counts, stats, lastCreated, error,
        // actions
        openTicket, fetchTickets, fetchTicket, reply, updateStatus, fetchCounts, fetchStats,
    };
});
