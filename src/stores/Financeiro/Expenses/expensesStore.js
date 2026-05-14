// src/stores/Marketing/Expenses/expensesStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import dayjs from 'dayjs';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

function getToken() {
    return localStorage.getItem('token');
}

export const useExpensesStore = defineStore('expenses', () => {
    const carregamento = useCarregamentoStore();

    // Período padrão: 1º de janeiro do ano anterior → hoje.
    // Mostra o panorama completo recente, alimentado pelo auto-sync diário.
    const startDate = ref(dayjs().startOf('month').format('YYYY-MM-DD'));
    const endDate = ref(dayjs().format('YYYY-MM-DD'));
    const data = ref(null);                       // { startDate, endDate, total, groups: [...] }
    const error = ref(null);

    // 🔎 filtro por departamento (multi) 
    const selectedDepartments = ref([]);

    const isLoading = computed(() => carregamento.carregando);
    const rawTotal = computed(() => Number(data.value?.total || 0));
    const rawGroups = computed(() => data.value?.groups || []);
    // Departamentos marcados como ocultos pelo admin (vem do backend)
    const hiddenDepartments = computed(() =>
        new Set((data.value?.hiddenDepartments || []).map(d => (d || '').toLowerCase()))
    );

    // 🔹 departamentos existentes (dinâmico) — exclui os marcados como ocultos pelo admin
    const departmentOptions = computed(() => {
        const set = new Set();
        const groups = rawGroups.value;
        const hidden = hiddenDepartments.value;

        for (const g of groups) {
            const exps = g.expenses || [];
            for (const exp of exps) {
                const name = exp.departmentName || exp.bill?.mainDepartmentName;
                if (name && !hidden.has(name.toLowerCase())) set.add(name);
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
        if (!startDate.value || !endDate.value) {
            error.value = 'Informe o período (data início e fim).';
            return;
        }

        try {
            carregamento.iniciarCarregamento();
            const params = new URLSearchParams({ startDate: startDate.value, endDate: endDate.value });
            const res = await requestWithAuth(`${API_URL}/expenses?${params.toString()}`);
            // ✅ normaliza snake_case -> camelCase
            if (res?.groups?.length) {
                res.groups = res.groups.map(g => ({
                    ...g,
                    expenses: (g.expenses || []).map(e => ({
                        ...e,
                        installmentNumber: e.installmentNumber ?? e.installment_number ?? null,
                        installmentsNumber: e.installmentsNumber ?? e.installments_number ?? null,
                    })),
                }));
            }
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
        const res = await requestWithAuth(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
        await fetchExpenses();
        return res;
    }

    return {
        // state
        startDate,
        endDate,
        data,
        error,
        selectedDepartments,

        // computed
        isLoading,
        rawTotal,
        rawGroups,
        total,
        groups: filteredGroups,
        departmentOptions,

        // actions
        fetchExpenses,
        updateExpense,
        deleteExpense,
    };
});
