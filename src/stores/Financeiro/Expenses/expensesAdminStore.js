// src/stores/Financeiro/Expenses/expensesAdminStore.js
//
// Configurações administrativas da tela Custos:
//   - overrides de nome por cost_center_id
//   - visibilidade de departamentos no filtro
import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useExpensesAdminStore = defineStore('expensesAdmin', () => {
    const overrides = ref([]);           // [{ cost_center_id, display_name, updated_by, updated_at }]
    const departments = ref([]);         // [{ name, hidden }]
    const loadingOverrides = ref(false);
    const loadingDepartments = ref(false);

    // ── Overrides de nome de CC ──────────────────────────────────────────
    async function fetchOverrides() {
        loadingOverrides.value = true;
        try {
            const data = await requestWithAuth(`${API_URL}/expenses/admin/cost-center-overrides`);
            overrides.value = Array.isArray(data) ? data : [];
        } finally {
            loadingOverrides.value = false;
        }
    }

    async function setOverride(costCenterId, displayName) {
        console.log('[CCOverride] PUT', { costCenterId, displayName });
        const result = await requestWithAuth(`${API_URL}/expenses/admin/cost-center-overrides/${costCenterId}`, {
            method: 'PUT',
            body: JSON.stringify({ displayName }),
        });
        console.log('[CCOverride] PUT resposta:', result);
        await fetchOverrides();
    }

    async function deleteOverride(costCenterId) {
        await requestWithAuth(`${API_URL}/expenses/admin/cost-center-overrides/${costCenterId}`, {
            method: 'DELETE',
        });
        await fetchOverrides();
    }

    // ── Visibilidade de departamentos ────────────────────────────────────
    async function fetchDepartments() {
        loadingDepartments.value = true;
        try {
            const data = await requestWithAuth(`${API_URL}/expenses/admin/department-visibility`);
            departments.value = Array.isArray(data?.departments) ? data.departments : [];
        } finally {
            loadingDepartments.value = false;
        }
    }

    async function setDepartmentVisibility(name, hidden) {
        await requestWithAuth(`${API_URL}/expenses/admin/department-visibility`, {
            method: 'PUT',
            body: JSON.stringify({ name, hidden }),
        });
        // Atualização otimista local
        const found = departments.value.find(d => d.name === name);
        if (found) found.hidden = hidden;
    }

    return {
        overrides,
        departments,
        loadingOverrides,
        loadingDepartments,
        fetchOverrides,
        setOverride,
        deleteOverride,
        fetchDepartments,
        setDepartmentVisibility,
    };
});
