// src/stores/Settings/Permissions/departmentVisibilityStore.js
//
// Config (admin) da visibilidade de departamentos em cascata global → cargo → usuário.
// Consome /api/permissions/department-visibility*.
import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useDepartmentVisibilityStore = defineStore('departmentVisibility', () => {
    const departments = ref([]);
    const orgDepartments = ref([]);
    const positions = ref([]);
    const users = ref([]);
    const loadedMeta = ref(false);

    async function fetchMeta(force = false) {
        if (loadedMeta.value && !force) return;
        const res = await requestWithAuth(`${API_URL}/permissions/department-visibility/meta`);
        departments.value = res?.departments || [];
        orgDepartments.value = res?.orgDepartments || [];
        positions.value = res?.positions || [];
        users.value = res?.users || [];
        loadedMeta.value = true;
    }

    // Retorna { [department_name]: hidden } para o escopo/chave.
    async function getRules(scope, key = '') {
        const params = new URLSearchParams({ scope });
        if (key) params.set('key', String(key));
        const res = await requestWithAuth(`${API_URL}/permissions/department-visibility?${params.toString()}`);
        return res?.rules || {};
    }

    async function setRule(scope, key, departmentName, hidden) {
        return requestWithAuth(`${API_URL}/permissions/department-visibility`, {
            method: 'PUT',
            body: JSON.stringify({ scope, key, departmentName, hidden }),
        });
    }

    async function clearRule(scope, key, departmentName) {
        return requestWithAuth(`${API_URL}/permissions/department-visibility`, {
            method: 'DELETE',
            body: JSON.stringify({ scope, key, departmentName }),
        });
    }

    return { departments, orgDepartments, positions, users, loadedMeta, fetchMeta, getRules, setRule, clearRule };
});
