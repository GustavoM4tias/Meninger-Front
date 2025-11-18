import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import dayjs from 'dayjs';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

function getToken() {
    return localStorage.getItem('token');
}

async function requestWithAuth(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const isForm = options.body instanceof FormData;
    if (!isForm && !headers.has('Content-Type') && options.method && options.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Erro na requisição');
    }
    return res.json();
}

export const useMktExpensesStore = defineStore('mktExpenses', () => {
    const carregamento = useCarregamentoStore();

    const month = ref(dayjs().format('YYYY-MM')); // mês do usuário
    const data = ref(null);                       // { competenceMonth, total, groups: [...] }
    const error = ref(null);

    const isLoading = computed(() => carregamento.carregando);
    const total = computed(() => Number(data.value?.total || 0));
    const groups = computed(() => data.value?.groups || []);

    async function fetchExpenses() {
        error.value = null;
        if (!month.value) {
            error.value = 'Informe o mês.';
            return;
        }

        try {
            carregamento.iniciarCarregamento();
            const params = new URLSearchParams({ month: month.value });
            const res = await requestWithAuth(`${API_URL}/mkt/expenses?${params.toString()}`);
            data.value = res || null;
        } catch (e) {
            console.error(e);
            error.value = e.message;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    return {
        month,
        data,
        error,
        isLoading,
        total,
        groups,
        fetchExpenses,
    };
});
