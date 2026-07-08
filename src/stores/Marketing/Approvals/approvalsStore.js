// stores/Marketing/Approvals/approvalsStore.js
// Estado do módulo Aprovações de Marketing (tickets p/ diretoria).
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/utils/Marketing/approvalsApi.js';

export const STATUS_META = {
    pending: { label: 'Pendente', variant: 'warning', icon: 'fas fa-hourglass-half' },
    approved: { label: 'Aprovada', variant: 'success', icon: 'fas fa-check' },
    approved_with_notes: { label: 'Aprovada c/ ressalva', variant: 'info', icon: 'fas fa-check-double' },
    rejected: { label: 'Reprovada', variant: 'danger', icon: 'fas fa-xmark' },
    cancelled: { label: 'Cancelada', variant: 'neutral', icon: 'fas fa-ban' },
};

export const useApprovalsStore = defineStore('marketingApprovals', () => {
    // ── Estado ──
    const items = ref([]);
    const total = ref(0);
    const current = ref(null);
    const me = ref({ isApprover: false, isAdmin: false, profileIds: [] });
    const types = ref([]);
    const profiles = ref([]);
    const costCenters = ref([]);
    const costCenterUnavailable = ref(false);
    const settings = ref(null);
    const users = ref([]);
    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);

    const filters = ref({ status: '', type_key: '', cost_center_id: '', from: '', to: '', q: '', mine: '' });

    // ── Computed ──
    // MultiSelector trabalha com strings puras → "nome (CC código)" + mapa p/ código.
    const costCenterOptions = computed(() => costCenters.value.map((c) => `${c.name} (CC ${c.code})`));
    const costCenterCodeByOption = computed(() => {
        const map = new Map();
        costCenters.value.forEach((c) => map.set(`${c.name} (CC ${c.code})`, c.code));
        return map;
    });
    const activeProfiles = computed(() => profiles.value.filter((p) => p.is_active !== false));
    const typeOptions = computed(() => types.value.map((t) => ({ value: t.key, label: t.label })));

    // ── Ações ──
    async function fetchMeta() {
        try {
            const [meRes, typesRes, profilesRes, ccRes] = await Promise.all([
                api.me(), api.types(), api.profiles(), api.costCenters(),
            ]);
            me.value = meRes;
            types.value = typesRes;
            profiles.value = profilesRes;
            costCenters.value = ccRes.items || [];
            costCenterUnavailable.value = !!ccRes.unavailable;
        } catch (e) { error.value = e.message; }
    }

    function buildQuery() {
        const params = new URLSearchParams();
        Object.entries(filters.value).forEach(([k, v]) => { if (v) params.set(k, v); });
        const qs = params.toString();
        return qs ? `?${qs}` : '';
    }

    async function fetchList() {
        loading.value = true; error.value = null;
        try {
            const data = await api.list(buildQuery());
            items.value = data.items || [];
            total.value = data.total || 0;
            if (data.me) me.value = data.me;
        } catch (e) { error.value = e.message; }
        finally { loading.value = false; }
    }

    async function fetchOne(id) {
        loading.value = true; error.value = null;
        try {
            current.value = await api.get(id);
        } catch (e) {
            error.value = e.message;
            current.value = null;
        } finally { loading.value = false; }
        return current.value;
    }

    async function createRequest(payload) {
        saving.value = true; error.value = null;
        try {
            const created = await api.create(payload);
            current.value = created;
            return created;
        } finally { saving.value = false; }
    }

    async function decide(id, payload) {
        saving.value = true;
        try {
            current.value = await api.decide(id, payload);
            return current.value;
        } finally { saving.value = false; }
    }

    async function cancel(id) {
        saving.value = true;
        try {
            current.value = await api.cancel(id);
            return current.value;
        } finally { saving.value = false; }
    }

    // ── Administração ──
    async function fetchAdmin() {
        try {
            const [settingsRes, profilesRes, usersRes] = await Promise.all([
                api.settings(), api.profiles(), api.users(),
            ]);
            settings.value = settingsRes;
            profiles.value = profilesRes;
            users.value = usersRes;
        } catch (e) { error.value = e.message; }
    }

    async function saveSettings(payload) {
        saving.value = true;
        try {
            settings.value = await api.saveSettings(payload);
            types.value = (settings.value.types || []).filter((t) => t.active !== false);
            return settings.value;
        } finally { saving.value = false; }
    }

    async function saveProfile(profile) {
        saving.value = true;
        try {
            const saved = profile.id
                ? await api.updateProfile(profile.id, profile)
                : await api.createProfile(profile);
            const idx = profiles.value.findIndex((p) => p.id === saved.id);
            if (idx >= 0) profiles.value.splice(idx, 1, saved);
            else profiles.value.push(saved);
            return saved;
        } finally { saving.value = false; }
    }

    return {
        items, total, current, me, types, profiles, costCenters, costCenterUnavailable,
        settings, users, loading, saving, error, filters,
        costCenterOptions, costCenterCodeByOption, activeProfiles, typeOptions,
        fetchMeta, fetchList, fetchOne, createRequest, decide, cancel,
        fetchAdmin, saveSettings, saveProfile,
    };
});
