// src/stores/Marketing/Expenses/expensesStore.js
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
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data?.error || 'Erro na requisição');
    }
    return data;
}

export const useExpensesStore = defineStore('expenses', () => {
    const carregamento = useCarregamentoStore();

    const month = ref(dayjs().format('YYYY-MM')); // mês atual
    const data = ref(null);                       // { competenceMonth, total, groups: [...] }
    const error = ref(null);

    // 🔎 filtro por departamento (multi) 
    const selectedDepartments = ref([]);

    const isLoading = computed(() => carregamento.carregando);
    const rawTotal = computed(() => Number(data.value?.total || 0));
    const rawGroups = computed(() => data.value?.groups || []);

    // 🔹 departamentos existentes (dinâmico, sem lista fixa)
    const departmentOptions = computed(() => {
        const set = new Set();
        const groups = rawGroups.value;

        for (const g of groups) {
            const exps = g.expenses || [];
            for (const exp of exps) {
                const name = exp.departmentName || exp.bill?.mainDepartmentName;
                if (name) set.add(name);
            }
        }

        return Array.from(set).sort();
    });

    // 🔎 grupos filtrados por departamento
    const filteredGroups = computed(() => {
        const groups = rawGroups.value;
        const sel = selectedDepartments.value;

        if (!sel.length) return groups;

        const selSet = new Set(sel.map(d => (d || '').toLowerCase()));

        return groups
            .map(g => {
                const filteredExpenses = (g.expenses || []).filter(exp => {
                    const name = exp.departmentName || exp.bill?.mainDepartmentName || '';
                    return selSet.has(name.toLowerCase());
                });

                const total = filteredExpenses.reduce(
                    (sum, exp) => sum + Number(exp.amount || 0),
                    0
                );

                return {
                    ...g,
                    expenses: filteredExpenses,
                    total,
                };
            })
            .filter(g => (g.expenses || []).length > 0);
    });

    // total já respeitando o filtro de departamento
    const total = computed(() =>
        filteredGroups.value.reduce(
            (sum, g) => sum + Number(g.total || 0),
            0
        )
    );

    async function fetchExpenses() {
        error.value = null;
        if (!month.value) {
            error.value = 'Informe o mês.';
            return;
        }

        try {
            carregamento.iniciarCarregamento();
            const params = new URLSearchParams({ month: month.value });
            const res = await requestWithAuth(`${API_URL}/expenses?${params.toString()}`);
            data.value = res || null;
        } catch (e) {
            console.error(e);
            error.value = e.message;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    async function updateExpense(id, payload) {
        // payload: { amount, description, departmentId?, departmentName? }
        await requestWithAuth(`${API_URL}/expenses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });

        // mais simples: recarrega o mês
        await fetchExpenses();
    }

    async function deleteExpense(id) {
        await requestWithAuth(`${API_URL}/expenses/${id}`, {
            method: 'DELETE',
        });

        await fetchExpenses();
    }

    return {
        // state
        month,
        data,
        error,
        selectedDepartments,

        // computed
        isLoading,
        rawTotal,
        rawGroups,
        total,
        groups: filteredGroups,     // 👈 já vem filtrado por departamento
        departmentOptions,

        // actions
        fetchExpenses,
        updateExpense,
        deleteExpense,
    };
});
