// stores/Marketing/SalesStand/salesStandStore.js
// Stand de Vendas: stands modelo (categorias com valor médio + itens) e stands
// reais com custo ao vivo do Sienge (plano 2.02.07 — Despesas com Stand).
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/utils/Marketing/salesStandApi.js';

export const STATUS_META = {
    draft: { label: 'Rascunho', variant: 'warning', icon: 'fas fa-pen-ruler' },
    defined: { label: 'Definido', variant: 'success', icon: 'fas fa-circle-check' },
};

export const useSalesStandStore = defineStore('marketingSalesStand', () => {
    const stands = ref([]);
    const models = ref([]);
    const costCenters = ref([]); // [{ code, name }]
    const spendUnavailable = ref(false);
    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);

    const modelOptions = computed(() => models.value
        .filter((m) => m.is_active !== false)
        .map((m) => ({ value: m.id, label: m.name })));

    // MultiSelector trabalha com strings — "nome (código)" único por CC.
    const costCenterOptions = computed(() => costCenters.value.map((c) => `${c.name} (${c.code})`));
    const costCenterCodeByOption = computed(() => new Map(
        costCenters.value.map((c) => [`${c.name} (${c.code})`, c.code]),
    ));
    const costCenterOptionByCode = computed(() => new Map(
        costCenters.value.map((c) => [Number(c.code), `${c.name} (${c.code})`]),
    ));

    async function fetchMeta() {
        try {
            const [cc, m] = await Promise.all([api.costCenters(), api.models()]);
            costCenters.value = cc.items || [];
            models.value = m.items || [];
        } catch (e) {
            console.error('[SalesStandStore] fetchMeta: erro', e);
            error.value = e.message || 'Erro ao carregar os dados.';
        }
    }

    async function fetchStands() {
        loading.value = true;
        error.value = null;
        try {
            const data = await api.list();
            stands.value = data.items || [];
            spendUnavailable.value = !!data.spend_unavailable;
        } catch (e) {
            console.error('[SalesStandStore] fetchStands: erro', e);
            error.value = e.message || 'Erro ao carregar os stands.';
            stands.value = [];
        } finally {
            loading.value = false;
        }
    }

    async function fetchModels() {
        try {
            const data = await api.models();
            models.value = data.items || [];
        } catch (e) {
            console.error('[SalesStandStore] fetchModels: erro', e);
            error.value = e.message || 'Erro ao carregar os modelos.';
        }
    }

    async function saveModel(payload, id = null) {
        saving.value = true;
        try {
            if (id) await api.updateModel(id, payload);
            else await api.createModel(payload);
            await fetchModels();
        } finally {
            saving.value = false;
        }
    }

    async function deleteModel(id) {
        saving.value = true;
        try {
            await api.deleteModel(id);
            await fetchModels();
        } finally {
            saving.value = false;
        }
    }

    async function saveStand(payload, id = null) {
        saving.value = true;
        try {
            if (id) await api.update(id, payload);
            else await api.create(payload);
            await fetchStands();
        } finally {
            saving.value = false;
        }
    }

    async function deleteStand(id) {
        saving.value = true;
        try {
            await api.remove(id);
            await fetchStands();
        } finally {
            saving.value = false;
        }
    }

    async function defineStand(id, payload = {}) {
        saving.value = true;
        try {
            await api.define(id, payload);
            await fetchStands();
        } finally {
            saving.value = false;
        }
    }

    async function undefineStand(id) {
        saving.value = true;
        try {
            await api.undefine(id);
            await fetchStands();
        } finally {
            saving.value = false;
        }
    }

    const fetchSpend = (id) => api.spend(id);

    return {
        stands, models, costCenters, spendUnavailable, loading, saving, error,
        modelOptions, costCenterOptions, costCenterCodeByOption, costCenterOptionByCode,
        fetchMeta, fetchStands, fetchModels,
        saveModel, deleteModel,
        saveStand, deleteStand, defineStand, undefineStand, fetchSpend,
    };
});
