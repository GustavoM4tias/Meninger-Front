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
    const settings = ref(null);         // configurações comerciais (listas de permissão)
    const permissions = ref({ isAdmin: false, canEdit: false, canAuthorize: false });
    const error = ref(null);

    // ─── Toast global das fichas (qualquer componente notifica; Detail exibe) ─
    const toast = ref({ show: false, type: 'success', message: '' });
    let toastTimer = null;
    function notify(message, type = 'success') {
        toast.value = { show: true, type, message };
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toast.value = { ...toast.value, show: false }; }, 3500);
    }

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

    // ─── Enviar para autorização (draft → pending_approval) ──────────────────

    async function submitForApproval(id) {
        const result = await requestWithAuth(`${API_URL}/conditions/${id}/submit`, {
            method: 'POST',
        });
        if (detail.value?.id === id) {
            detail.value.status = 'pending_approval';
        }
        return result;
    }

    // ─── Autorizar (pending_approval → approved) ─────────────────────────────

    async function authorizeCondition(id) {
        const result = await requestWithAuth(`${API_URL}/conditions/${id}/authorize`, {
            method: 'POST',
        });
        if (detail.value?.id === id) {
            detail.value.status = 'approved';
        }
        return result;
    }

    // ─── Desbloquear (approved → draft) ──────────────────────────────────────

    async function unlockCondition(id, note = '') {
        const result = await requestWithAuth(`${API_URL}/conditions/${id}/unlock`, {
            method: 'POST',
            body: JSON.stringify({ note }),
        });
        if (detail.value?.id === id) {
            detail.value.status = 'draft';
            detail.value.approved_at = null;
        }
        return result;
    }

    // ─── Cancelar autorização (pending_approval → draft) ─────────────────────

    async function cancelApproval(id, note = '') {
        const result = await requestWithAuth(`${API_URL}/conditions/${id}/cancel-approval`, {
            method: 'POST',
            body: JSON.stringify({ note }),
        });
        if (detail.value?.id === id) {
            detail.value.status = 'draft';
        }
        return result;
    }

    // ─── Encerrar (any → closed, dupla validação) ─────────────────────────────

    async function closeCondition(id, { note = '', confirmation = '' } = {}) {
        const result = await requestWithAuth(`${API_URL}/conditions/${id}/close`, {
            method: 'POST',
            body: JSON.stringify({ note, confirmation }),
        });
        if (detail.value?.id === id) {
            detail.value.status = 'closed';
        }
        return result;
    }

    // ─── Publicar (legado — alias de submitForApproval) ───────────────────────

    async function publishCondition(id) {
        return submitForApproval(id);
    }

    // ─── Configurações comerciais ─────────────────────────────────────────────

    async function fetchSettings() {
        try {
            settings.value = await requestWithAuth(`${API_URL}/conditions/settings`);
        } catch (e) {
            console.warn('[conditions] fetchSettings:', e.message);
        }
    }

    async function updateSettings(payload) {
        const result = await requestWithAuth(`${API_URL}/conditions/settings`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        await fetchSettings();
        return result;
    }

    // ─── Permissões do usuário atual (editar/autorizar) ──────────────────────

    async function fetchMyPermissions() {
        try {
            permissions.value = await requestWithAuth(`${API_URL}/conditions/permissions`);
        } catch (e) {
            console.warn('[conditions] fetchMyPermissions:', e.message);
        }
    }

    // ─── Módulos ─────────────────────────────────────────────────────────────

    async function saveModules(id, modules, { silent = false } = {}) {
        // modules agora inclui campaigns[] dentro de cada módulo.
        // silent=true (auto-saves) não registra diff no histórico (casa com o backend).
        return await requestWithAuth(`${API_URL}/conditions/${id}/modules`, {
            method: 'PUT',
            body: JSON.stringify({ modules, silent }),
        });
    }

    async function deleteModule(conditionId, moduleId) {
        return await requestWithAuth(
            `${API_URL}/conditions/${conditionId}/modules/${moduleId}`,
            { method: 'DELETE' }
        );
    }

    async function copyModule(conditionId, targetModuleId, sourceModuleId) {
        return await requestWithAuth(
            `${API_URL}/conditions/${conditionId}/modules/${targetModuleId}/copy-from/${sourceModuleId}`,
            { method: 'POST' }
        );
    }

    async function copyModuleFromSource(conditionId, moduleId, sourceConditionId, sourceModuleId, fields = []) {
        return await requestWithAuth(
            `${API_URL}/conditions/${conditionId}/modules/${moduleId}/copy-from/${sourceConditionId}/module/${sourceModuleId}`,
            { method: 'POST', body: JSON.stringify({ fields }) }
        );
    }

    async function fetchModulesForEnterprise(idempreendimento) {
        return await requestWithAuth(`${API_URL}/conditions/enterprise/${idempreendimento}/modules`);
    }

    async function fetchEnterpriseStages(idempreendimento) {
        return await requestWithAuth(`${API_URL}/conditions/enterprise/${idempreendimento}/stages`);
    }

    async function fetchUnitsForStage(idempreendimento, idetapa) {
        return await requestWithAuth(`${API_URL}/conditions/enterprise/${idempreendimento}/stages/${idetapa}/units`);
    }

    // ─── DocuSign: settings (admin) + assinatura por ficha ───────────────────

    async function fetchDocusignSettings() {
        return await requestWithAuth(`${API_URL}/conditions/docusign-settings`);
    }
    async function updateDocusignSettings(payload) {
        return await requestWithAuth(`${API_URL}/conditions/docusign-settings`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    }
    async function fetchDocusignConsentUrl() {
        return await requestWithAuth(`${API_URL}/conditions/docusign/consent-url`);
    }
    async function testDocusign() {
        return await requestWithAuth(`${API_URL}/conditions/docusign/test`, { method: 'POST' });
    }
    // Login "Conectar com DocuSign": retorna { url, redirect_uri } p/ redirecionar o navegador.
    async function fetchDocusignOauthUrl() {
        return await requestWithAuth(`${API_URL}/conditions/docusign/oauth-url`, {
            method: 'POST',
            body: JSON.stringify({ front: window.location.origin }),
        });
    }
    async function disconnectDocusign() {
        return await requestWithAuth(`${API_URL}/conditions/docusign/disconnect`, { method: 'POST' });
    }
    async function fetchSignature(conditionId) {
        return await requestWithAuth(`${API_URL}/conditions/${conditionId}/signature`);
    }
    async function sendSignature(conditionId, html) {
        return await requestWithAuth(`${API_URL}/conditions/${conditionId}/signature/send`, {
            method: 'POST',
            body: JSON.stringify({ html }),
        });
    }
    async function refreshSignature(conditionId) {
        return await requestWithAuth(`${API_URL}/conditions/${conditionId}/signature/refresh`, { method: 'POST' });
    }
    // Reenvia o convite: emails=null → todos os elegíveis; ou lista de e-mails específicos.
    async function resendSignature(conditionId, emails = null) {
        return await requestWithAuth(`${API_URL}/conditions/${conditionId}/signature/resend`, {
            method: 'POST',
            body: JSON.stringify({ emails }),
        });
    }
    async function voidSignature(conditionId, reason = '') {
        return await requestWithAuth(`${API_URL}/conditions/${conditionId}/signature/void`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }

    // ─── Biblioteca de campanhas (modelos reutilizáveis) ─────────────────────
    const campaignTemplates = ref([]);

    async function fetchCampaignTemplates(force = false) {
        if (campaignTemplates.value.length && !force) return campaignTemplates.value;
        try {
            campaignTemplates.value = await requestWithAuth(`${API_URL}/conditions/campaign-templates`);
        } catch (e) {
            console.warn('[conditions] fetchCampaignTemplates:', e.message);
        }
        return campaignTemplates.value;
    }

    async function createCampaignTemplate(payload) {
        const t = await requestWithAuth(`${API_URL}/conditions/campaign-templates`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        await fetchCampaignTemplates(true);
        return t;
    }

    // propagate=true atualiza o modelo + instâncias vinculadas em fichas rascunho.
    async function updateCampaignTemplate(id, payload) {
        const r = await requestWithAuth(`${API_URL}/conditions/campaign-templates/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        await fetchCampaignTemplates(true);
        return r;
    }

    async function fetchCampaignTemplateUsage(id) {
        return await requestWithAuth(`${API_URL}/conditions/campaign-templates/${id}/usage`);
    }

    // ─── Vincular avulsa ao CV (promove a série inteira) ─────────────────────
    async function linkSeriesToCv(id, idempreendimento, moduleStageMap = {}) {
        return await requestWithAuth(`${API_URL}/conditions/${id}/link-to-cv`, {
            method: 'POST',
            body: JSON.stringify({ idempreendimento, moduleStageMap }),
        });
    }

    // ─── Empreendimentos do CV (seletor do vínculo avulso → CV) ──────────────
    async function fetchCvEnterprises() {
        const data = await requestWithAuth(`${API_URL}/cv/empreendimentos`);
        return (data ?? []).slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    }

    // ─── Campanhas ───────────────────────────────────────────────────────────

    async function saveCampaigns(id, campaigns, module_id = null) {
        return await requestWithAuth(`${API_URL}/conditions/${id}/campaigns`, {
            method: 'PUT',
            body: JSON.stringify({ campaigns, ...(module_id != null ? { module_id } : {}) }),
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
        // Ficha avulsa não tem empreendimento — nem chama a API.
        if (idempreendimento == null || !Number.isInteger(Number(idempreendimento))) return;
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
        list, detail, priceTables, priceDistribution, correspondents, officeUsers, correspondentCompanies, settings, permissions, error,
        toast, notify,
        fetchList, fetchDetail,
        createCondition, saveCondition, publishCondition,
        submitForApproval, authorizeCondition, unlockCondition, cancelApproval, closeCondition,
        saveModules, deleteModule, copyModule, copyModuleFromSource, fetchModulesForEnterprise, fetchEnterpriseStages,
        saveCampaigns, deleteCampaign,
        fetchPriceTables, fetchPriceDistribution,
        fetchCorrespondents, fetchOfficeUsers, fetchCorrespondentCompanies,
        fetchSettings, updateSettings, fetchMyPermissions,
        fetchUnitsForStage,
        linkSeriesToCv, fetchCvEnterprises,
        campaignTemplates, fetchCampaignTemplates, createCampaignTemplate, updateCampaignTemplate, fetchCampaignTemplateUsage,
        fetchDocusignSettings, updateDocusignSettings, fetchDocusignConsentUrl, testDocusign,
        fetchDocusignOauthUrl, disconnectDocusign,
        fetchSignature, sendSignature, refreshSignature, voidSignature, resendSignature,
    };
});
