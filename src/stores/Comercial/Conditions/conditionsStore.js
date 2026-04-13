import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useConditionsStore = defineStore('conditions', () => {
    const carregamento = useCarregamentoStore();

    const list = ref([]);
    const detail = ref(null);
    const priceTables = ref([]);        // tabelas do empreendimento ativo
    const priceDistribution = ref([]);  // distribuição de preços
    const correspondents = ref([]);
    const officeUsers = ref([]);
    const correspondentCompanies = ref([]);
    const error = ref(null);

    // ─── Listagem ────────────────────────────────────────────────────────────

    async function fetchList({ idempreendimento } = {}) {
        error.value = null;
        try {
            carregamento.iniciarCarregamento();
            const q = new URLSearchParams();
            if (idempreendimento) q.set('idempreendimento', idempreendimento);
            list.value = await requestWithAuth(`${API_URL}/conditions?${q}`);
        } catch (e) {
            error.value = e.message;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    // ─── Detalhe ─────────────────────────────────────────────────────────────

    async function fetchDetail(id) {
        error.value = null;
        detail.value = null;
        try {
            carregamento.iniciarCarregamento();
            detail.value = await requestWithAuth(`${API_URL}/conditions/${id}`);
        } catch (e) {
            error.value = e.message;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    // ─── Criar ───────────────────────────────────────────────────────────────

    async function createCondition(payload) {
        const result = await requestWithAuth(`${API_URL}/conditions`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return result;
    }

    // ─── Salvar (patch principal) ─────────────────────────────────────────────

    async function saveCondition(id, payload) {
        return await requestWithAuth(`${API_URL}/conditions/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    }

    // ─── Publicar ─────────────────────────────────────────────────────────────

    async function publishCondition(id) {
        const result = await requestWithAuth(`${API_URL}/conditions/${id}/publish`, {
            method: 'POST',
        });
        if (detail.value?.id === id) detail.value.status = 'published';
        return result;
    }

    // ─── Módulos ─────────────────────────────────────────────────────────────

    async function saveModules(id, modules) {
        return await requestWithAuth(`${API_URL}/conditions/${id}/modules`, {
            method: 'PUT',
            body: JSON.stringify({ modules }),
        });
    }

    async function copyModule(conditionId, targetModuleId, sourceModuleId) {
        return await requestWithAuth(
            `${API_URL}/conditions/${conditionId}/modules/${targetModuleId}/copy-from/${sourceModuleId}`,
            { method: 'POST' }
        );
    }

    // ─── Campanhas ───────────────────────────────────────────────────────────

    async function saveCampaigns(id, campaigns) {
        return await requestWithAuth(`${API_URL}/conditions/${id}/campaigns`, {
            method: 'PUT',
            body: JSON.stringify({ campaigns }),
        });
    }

    async function deleteCampaign(conditionId, campaignId) {
        return await requestWithAuth(
            `${API_URL}/conditions/${conditionId}/campaigns/${campaignId}`,
            { method: 'DELETE' }
        );
    }

    // ─── Tabelas de preço ─────────────────────────────────────────────────────

    async function fetchPriceTables(idempreendimento) {
        priceTables.value = [];
        try {
            priceTables.value = await requestWithAuth(
                `${API_URL}/conditions/enterprise/${idempreendimento}/price-tables`
            );
        } catch (e) {
            console.warn('[conditions] fetchPriceTables:', e.message);
        }
    }

    async function fetchPriceDistribution(idempreendimento, idetapa = null) {
        priceDistribution.value = [];
        try {
            const q = idetapa ? `?idetapa=${idetapa}` : '';
            priceDistribution.value = await requestWithAuth(
                `${API_URL}/conditions/enterprise/${idempreendimento}/price-distribution${q}`
            );
        } catch (e) {
            console.warn('[conditions] fetchPriceDistribution:', e.message);
        }
    }

    // ─── Correspondentes ─────────────────────────────────────────────────────

    async function fetchCorrespondents() {
        if (correspondents.value.length) return;
        try {
            correspondents.value = await requestWithAuth(`${API_URL}/conditions/correspondents`);
        } catch (e) {
            console.warn('[conditions] fetchCorrespondents:', e.message);
        }
    }

    async function fetchOfficeUsers() {
        if (officeUsers.value.length) return;
        try {
            // Usa o mesmo endpoint do menu de Configurações/Usuários
            const data = await requestWithAuth(`${API_URL}/auth/users`);
            const all = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
            // Filtra apenas usuários ativos e com nome
            officeUsers.value = all.filter(u => u.status !== false && u.username);
        } catch (e) {
            console.warn('[conditions] fetchOfficeUsers:', e.message);
        }
    }

    async function fetchCorrespondentCompanies() {
        if (correspondentCompanies.value.length) return;
        try {
            correspondentCompanies.value = await requestWithAuth(`${API_URL}/conditions/correspondents/companies`);
        } catch (e) {
            console.warn('[conditions] fetchCorrespondentCompanies:', e.message);
        }
    }

    return {
        list, detail, priceTables, priceDistribution, correspondents, officeUsers, correspondentCompanies, error,
        fetchList, fetchDetail,
        createCondition, saveCondition, publishCondition,
        saveModules, copyModule,
        saveCampaigns, deleteCampaign,
        fetchPriceTables, fetchPriceDistribution,
        fetchCorrespondents, fetchOfficeUsers, fetchCorrespondentCompanies,
    };
});
