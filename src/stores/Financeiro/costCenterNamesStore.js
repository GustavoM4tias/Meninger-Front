// src/stores/Financeiro/costCenterNamesStore.js
//
// Mapa { costCenterId -> nome de exibição } com overrides administrativos.
// Compartilhado por Custos, Títulos e AutoSync para que o nome editado
// reflita em todos os selectors/listagens. Cacheado (1 fetch por sessão).
import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useCostCenterNamesStore = defineStore('costCenterNames', () => {
    const overrideMap = ref({});   // { "10401": "Nome custom" }
    const loaded = ref(false);
    let inflight = null;

    async function fetchOverrideMap({ force = false } = {}) {
        if (loaded.value && !force) return overrideMap.value;
        if (inflight) return inflight;
        inflight = (async () => {
            try {
                const data = await requestWithAuth(`${API_URL}/expenses/cost-center-overrides/map`);
                overrideMap.value = data && typeof data === 'object' ? data : {};
                loaded.value = true;
            } catch (e) {
                console.error('[costCenterNames] falha ao carregar overrides:', e);
                overrideMap.value = {};
            } finally {
                inflight = null;
            }
            return overrideMap.value;
        })();
        return inflight;
    }

    // Retorna o override se houver, senão o fallback informado
    function displayName(costCenterId, fallback = null) {
        const key = String(costCenterId);
        return overrideMap.value[key] || fallback || null;
    }

    // Atualização otimista local (após salvar override em outra tela)
    function setLocal(costCenterId, name) {
        if (name) overrideMap.value = { ...overrideMap.value, [String(costCenterId)]: name };
        else {
            const next = { ...overrideMap.value };
            delete next[String(costCenterId)];
            overrideMap.value = next;
        }
    }

    return { overrideMap, loaded, fetchOverrideMap, displayName, setLocal };
});
