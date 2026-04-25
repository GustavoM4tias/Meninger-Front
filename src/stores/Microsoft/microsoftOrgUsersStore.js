// stores/Microsoft/microsoftOrgUsersStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getOrgUsers, importOrgUsers } from '@/utils/Microsoft/apiMicrosoftOrgUsers';

export const useMicrosoftOrgUsersStore = defineStore('microsoftOrgUsers', () => {
    const users = ref([]);
    const loading = ref(false);
    const importing = ref(false);
    const error = ref(null);

    async function fetchOrgUsers() {
        loading.value = true;
        error.value = null;
        try {
            const res = await getOrgUsers();
            users.value = res.users ?? [];
        } catch (err) {
            error.value = err.message;
            users.value = [];
        } finally {
            loading.value = false;
        }
    }

    async function importUsers(usersToImport) {
        importing.value = true;
        error.value = null;
        try {
            const res = await importOrgUsers(usersToImport);
            // Marca como importado na lista local
            const createdIds = new Set(res.created.map(u => u.email));
            users.value = users.value.map(u =>
                createdIds.has(u.email) ? { ...u, imported: true } : u
            );
            return res;
        } catch (err) {
            error.value = err.message;
            throw err;
        } finally {
            importing.value = false;
        }
    }

    return { users, loading, importing, error, fetchOrgUsers, importUsers };
});
