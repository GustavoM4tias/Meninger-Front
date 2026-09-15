// stores/Marketing/MktProjection/mktProjectionStore.js
// Projeção de Investimentos de Marketing: o backend lê a planilha "PROJEÇÃO X
// INVESTIMENTO MKT" do SharePoint e devolve um registro por empreendimento
// (uma aba cada) mais o consolidado. Aqui só se guarda e se recorta.
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/utils/Marketing/mktProjectionApi.js';

// Status = investido desde o lançamento / viabilidade de MKT aprovada. Cor de
// JUÍZO (pos/warn/neg), não de série: o verde diz "dentro", o vermelho "estourou".
export const STATUS_META = {
    ok: { label: 'Dentro', variant: 'success', tone: 'pos', dot: 'bg-data-pos', text: 'text-data-pos', bar: 'bg-data-pos-area' },
    atencao: { label: 'Atenção', variant: 'warning', tone: 'warn', dot: 'bg-data-warn', text: 'text-data-warn', bar: 'bg-data-warn-area' },
    estouro: { label: 'Estouro', variant: 'danger', tone: 'neg', dot: 'bg-data-neg', text: 'text-data-neg', bar: 'bg-data-neg-area' },
};
export const statusMeta = (st) => STATUS_META[st] || STATUS_META.ok;

export const useMktProjectionStore = defineStore('marketingMktProjection', () => {
    const meta = ref(null);      // { fileName, webUrl, lastModified, syncedAt, exercicio, curIdx, closedIdx, meses, ... }
    const cons = ref(null);      // consolidado
    const enr = ref([]);         // um por empreendimento
    const settings = ref(null);
    const loading = ref(false);
    const refreshing = ref(false);
    const saving = ref(false);
    const error = ref(null);
    const loadedAt = ref(0);

    const meses = computed(() => meta.value?.meses || ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']);
    const curIdx = computed(() => meta.value?.curIdx ?? new Date().getMonth());
    const closedIdx = computed(() => meta.value?.closedIdx ?? Math.max(new Date().getMonth() - 1, 0));
    const exercicio = computed(() => meta.value?.exercicio ?? new Date().getFullYear());

    function apply(data) {
        meta.value = data.meta || null;
        cons.value = data.cons || null;
        enr.value = Array.isArray(data.enr) ? data.enr : [];
        loadedAt.value = Date.now();
    }

    // Toda abertura da tela pergunta ao backend, que por sua vez pergunta ao
    // SharePoint se a planilha mudou (dentro da janela configurada ele nem
    // pergunta). Quem pede "force" pula a janela.
    async function fetchData({ force = false } = {}) {
        if (force) refreshing.value = true; else loading.value = true;
        error.value = null;
        try {
            apply(await api.data({ force }));
        } catch (e) {
            error.value = e.message;
        } finally {
            loading.value = false;
            refreshing.value = false;
        }
    }

    async function fetchSettings() {
        try { settings.value = await api.settings(); }
        catch (e) { error.value = e.message; }
    }

    async function saveSettings(payload) {
        saving.value = true;
        try {
            settings.value = await api.saveSettings(payload);
            await fetchData({ force: true });
            return true;
        } catch (e) {
            throw e;
        } finally {
            saving.value = false;
        }
    }

    const byTab = (tab) => enr.value.find((e) => e.tab === tab) || null;

    return {
        meta, cons, enr, settings, loading, refreshing, saving, error, loadedAt,
        meses, curIdx, closedIdx, exercicio,
        fetchData, fetchSettings, saveSettings, byTab,
    };
});
