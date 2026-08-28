// stores/Marketing/SalesStand/salesStandStore.js
// Stand de Vendas: stands modelo (categorias com valor médio + itens), stands
// reais e o gasto ao vivo do Sienge (plano 2.02.07 — Despesas com Stand) já
// separado entre CONSTRUÇÃO e RECORRÊNCIA.
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/utils/Marketing/salesStandApi.js';

export const STATUS_META = {
    draft: { label: 'Rascunho', variant: 'warning', icon: 'fas fa-pen-ruler' },
    defined: { label: 'Definido', variant: 'success', icon: 'fas fa-circle-check' },
};

// Os três tipos de gasto do stand. `series-N` é a paleta categórica do design
// system: construção, recorrência e esporádica são categorias, não estados
// (nada de verde/vermelho aqui).
export const KIND_META = {
    construcao: { label: 'Construção', short: 'Constr.', icon: 'fas fa-hammer', text: 'text-series-1', bg: 'bg-series-1-soft', border: 'border-series-1/30', dot: 'bg-series-1', hint: 'Montar o stand: o que fica nele depois de pronto.' },
    recorrencia: { label: 'Recorrência', short: 'Recor.', icon: 'fas fa-rotate', text: 'text-series-2', bg: 'bg-series-2-soft', border: 'border-series-2/30', dot: 'bg-series-2', hint: 'Volta todo mês enquanto o stand está de pé.' },
    esporadica: { label: 'Esporádica', short: 'Espor.', icon: 'fas fa-bolt', text: 'text-series-3', bg: 'bg-series-3-soft', border: 'border-series-3/30', dot: 'bg-series-3', hint: 'Acontece de vez em quando: não é montagem nem custo mensal.' },
    sem_classificacao: { label: 'Sem classificação', short: 'Sem classe', icon: 'fas fa-circle-question', text: 'text-ink-subtle', bg: 'bg-surface-sunken', border: 'border-line', dot: 'bg-data-neutral-area', hint: 'A conta deste lançamento não está em nenhuma categoria.' },
};
export const kindMeta = (k) => KIND_META[k] || KIND_META.sem_classificacao;
// Os tipos que a tela oferece para escolher (a "sem classificação" não se escolhe).
export const KIND_OPTIONS = ['construcao', 'recorrencia', 'esporadica']
    .map((value) => ({ value, label: KIND_META[value].label, icon: KIND_META[value].icon }));

export const useSalesStandStore = defineStore('marketingSalesStand', () => {
    const stands = ref([]);
    const models = ref([]);
    const categories = ref([]);
    const contas = ref([]); // contas para categorizar [{ code, name, standPlan, entries }]
    const settings = ref(null);      // { expense_source, department_id, conta_prefix }
    const departments = ref([]);     // departamentos do Sienge [{ id, name }]
    const audit = ref(null);         // conferência departamento x plano
    const auditLoading = ref(false);
    const liveCheck = ref(null);     // resultado da conferência ao vivo no Sienge
    const liveChecking = ref(false);
    const costCenters = ref([]); // [{ code, name }]
    const spendUnavailable = ref(false);
    const loading = ref(false);
    const saving = ref(false);
    const error = ref(null);

    // ── Detalhe (tela cheia de um stand) ──
    const detail = ref(null);       // { ...stand, images }
    const expenses = ref([]);       // lançamento a lançamento, já classificado
    const summary = ref(null);      // totais, por mês, por categoria, por conta
    const patterns = ref([]);       // padrões recorrentes detectados
    const detailLoading = ref(false);

    const modelOptions = computed(() => models.value
        .filter((m) => m.is_active !== false)
        .map((m) => ({ value: m.id, label: m.name })));

    const categoryOptions = computed(() => categories.value
        .filter((c) => c.is_active !== false)
        .map((c) => ({ value: c.id, label: `${c.name} (${kindMeta(c.kind).label})` })));

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
            const [cc, m, cat] = await Promise.all([api.costCenters(), api.models(), api.categories()]);
            costCenters.value = cc.items || [];
            models.value = m.items || [];
            categories.value = cat.items || [];
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

    async function fetchCategories() {
        try {
            const data = await api.categories();
            categories.value = data.items || [];
        } catch (e) {
            console.error('[SalesStandStore] fetchCategories: erro', e);
            error.value = e.message || 'Erro ao carregar as categorias.';
        }
    }

    async function fetchSettings() {
        try {
            const data = await api.settings();
            settings.value = data.settings || null;
            departments.value = data.departments || [];
        } catch (e) {
            console.error('[SalesStandStore] fetchSettings: erro', e);
        }
        return settings.value;
    }

    async function saveSettings(payload) {
        saving.value = true;
        try {
            settings.value = await api.saveSettings(payload);
            // A régua mudou: os números de todo mundo mudaram junto.
            contas.value = [];
            audit.value = null;
            await Promise.all([fetchStands(), fetchCategories()]);
            return settings.value;
        } finally {
            saving.value = false;
        }
    }

    async function fetchAudit() {
        auditLoading.value = true;
        try {
            audit.value = await api.conferencia();
        } catch (e) {
            console.error('[SalesStandStore] fetchAudit: erro', e);
            error.value = e.message || 'Erro ao carregar a conferência.';
        } finally {
            auditLoading.value = false;
        }
        return audit.value;
    }

    /**
     * Confere na API do Sienge o que já foi corrigido, sem esperar a carga do
     * backup. Vai em páginas porque a API recusa acima de ~100 chamadas/min.
     */
    async function revalidarConferencia({ limit = 40, offset = 0, acumular = false } = {}) {
        liveChecking.value = true;
        try {
            const r = await api.revalidar({ limit, offset });
            if (acumular && liveCheck.value) {
                liveCheck.value = {
                    ...r,
                    checked: [...liveCheck.value.checked, ...r.checked],
                    resolved: liveCheck.value.resolved + r.resolved,
                    pending: liveCheck.value.pending + r.pending,
                    errors: liveCheck.value.errors + r.errors,
                };
            } else {
                liveCheck.value = r;
            }
            return liveCheck.value;
        } finally {
            liveChecking.value = false;
        }
    }

    async function fetchContas() {
        if (contas.value.length) return contas.value;
        try {
            const data = await api.contas();
            contas.value = data.items || [];
        } catch (e) {
            console.error('[SalesStandStore] fetchContas: erro', e);
        }
        return contas.value;
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

    async function saveCategory(payload, id = null) {
        saving.value = true;
        try {
            if (id) await api.updateCategory(id, payload);
            else await api.createCategory(payload);
            await fetchCategories();
        } finally {
            saving.value = false;
        }
    }

    async function deleteCategory(id) {
        saving.value = true;
        try {
            await api.deleteCategory(id);
            await fetchCategories();
        } finally {
            saving.value = false;
        }
    }

    async function saveStand(payload, id = null) {
        saving.value = true;
        try {
            const saved = id ? await api.update(id, payload) : await api.create(payload);
            await fetchStands();
            if (id && detail.value?.id === Number(id)) await fetchDetail(id);
            return saved;
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

    // ── Detalhe ──────────────────────────────────────────────────────────────

    async function fetchDetail(id) {
        detailLoading.value = true;
        error.value = null;
        try {
            const data = await api.get(id);
            detail.value = data.stand || null;
            expenses.value = data.expenses || [];
            summary.value = data.summary || null;
            patterns.value = data.patterns || [];
            categories.value = data.categories || categories.value;
            spendUnavailable.value = !!data.spend_unavailable;
            return detail.value;
        } catch (e) {
            console.error('[SalesStandStore] fetchDetail: erro', e);
            error.value = e.message || 'Erro ao carregar o stand.';
            detail.value = null;
            expenses.value = [];
            summary.value = null;
            patterns.value = [];
            throw e;
        } finally {
            detailLoading.value = false;
        }
    }

    function clearDetail() {
        detail.value = null;
        expenses.value = [];
        summary.value = null;
        patterns.value = [];
    }

    /** Classifica lançamentos em lote. payload: { keys, kind?, category_id?, reset? } */
    async function classify(id, payload) {
        saving.value = true;
        try {
            const r = await api.classify(id, payload);
            await fetchDetail(id);
            return r;
        } finally {
            saving.value = false;
        }
    }

    async function saveItems(id, items) {
        saving.value = true;
        try {
            await api.saveItems(id, items);
            await fetchDetail(id);
        } finally {
            saving.value = false;
        }
    }

    async function addImage(id, pronta, caption = '') {
        saving.value = true;
        try {
            const img = await api.addImage(id, pronta, caption);
            await fetchDetail(id);
            return img;
        } finally {
            saving.value = false;
        }
    }

    async function updateImage(id, imageId, payload) {
        saving.value = true;
        try {
            await api.updateImage(id, imageId, payload);
            await fetchDetail(id);
        } finally {
            saving.value = false;
        }
    }

    async function reorderImages(id, ids) {
        saving.value = true;
        try {
            await api.reorderImages(id, ids);
            // A capa do stand muda junto, e ela aparece no cartao da listagem.
            await Promise.all([fetchDetail(id), fetchStands()]);
        } finally {
            saving.value = false;
        }
    }

    async function deleteImage(id, imageId) {
        saving.value = true;
        try {
            await api.deleteImage(id, imageId);
            await fetchDetail(id);
        } finally {
            saving.value = false;
        }
    }

    async function defineStand(id) {
        saving.value = true;
        try {
            await api.define(id);
            await fetchStands();
            if (detail.value?.id === Number(id)) await fetchDetail(id);
        } finally {
            saving.value = false;
        }
    }

    async function undefineStand(id) {
        saving.value = true;
        try {
            await api.undefine(id);
            await fetchStands();
            if (detail.value?.id === Number(id)) await fetchDetail(id);
        } finally {
            saving.value = false;
        }
    }

    const fetchSpend = (id) => api.spend(id);

    return {
        stands, models, categories, contas, costCenters, settings, departments,
        audit, auditLoading, liveCheck, liveChecking,
        spendUnavailable, loading, saving, error,
        detail, expenses, summary, patterns, detailLoading,
        modelOptions, categoryOptions, costCenterOptions, costCenterCodeByOption, costCenterOptionByCode,
        fetchMeta, fetchStands, fetchModels, fetchCategories, fetchContas,
        fetchSettings, saveSettings, fetchAudit, revalidarConferencia,
        saveModel, deleteModel,
        saveCategory, deleteCategory,
        saveStand, deleteStand, defineStand, undefineStand, fetchSpend,
        fetchDetail, clearDetail, classify, saveItems,
        addImage, updateImage, reorderImages, deleteImage,
    };
});
