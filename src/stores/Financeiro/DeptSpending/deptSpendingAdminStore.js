// src/stores/Financeiro/DeptSpending/deptSpendingAdminStore.js
//
// Config admin da tela "Gastos por Departamento" (admin-only no backend):
//  - quais departamentos do Custos têm o gasto acompanhado (global)
//  - configuração por EMPRESA Sienge (bloqueadas + overrides de depto + loja)
//  - status manual e LIBERAÇÃO por EMPREENDIMENTO (etapa/CC): a linha da tela é
//    uma etapa, então liberar uma não mexe nas irmãs da mesma SPE
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

const lc = (s) => String(s || '').trim().toLowerCase();

export const useDeptSpendingAdminStore = defineStore('marketingDeptSpendingAdmin', () => {
    const carregamento = useCarregamentoStore();

    const known = ref([]);              // ['Marketing','Comercial',...]
    const configured = ref([]);         // [{ department_name, is_marketing }]
    const enterpriseSettings = ref([]); // [{ company_id, ... }] — config da empresa
    const stageSettings = ref([]);      // [{ enterprise_key, status_override, is_released, ... }]
    const error = ref(null);
    const savingName = ref(null);       // depto em gravação (spinner por linha)
    const releasingId = ref(null);      // enterprise_key em liberação (spinner por linha)

    const isLoading = computed(() => carregamento.carregando);

    const marketingCount = computed(() => configured.value.filter((c) => c.is_marketing).length);

    function isMarketing(name) {
        const found = configured.value.find((c) => lc(c.department_name) === lc(name));
        return found ? !!found.is_marketing : false;
    }

    async function fetchMarketingDepartments() {
        error.value = null;
        try {
            carregamento.iniciarCarregamento();
            const res = await requestWithAuth(`${API_URL}/dept-spending/admin/marketing-departments`);
            known.value = res?.known || [];
            configured.value = res?.configured || [];
        } catch (e) {
            error.value = e?.message || 'Erro ao carregar departamentos.';
            known.value = [];
            configured.value = [];
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    async function setMarketingDepartment(name, isMkt) {
        savingName.value = name;
        try {
            await requestWithAuth(`${API_URL}/dept-spending/admin/marketing-departments`, {
                method: 'PUT',
                body: JSON.stringify({ name, is_marketing: !!isMkt }),
            });
            const idx = configured.value.findIndex((c) => lc(c.department_name) === lc(name));
            if (idx >= 0) configured.value[idx] = { ...configured.value[idx], is_marketing: !!isMkt };
            else configured.value = [...configured.value, { department_name: name, is_marketing: !!isMkt }];
        } finally {
            savingName.value = null;
        }
    }

    async function fetchEnterpriseSettings() {
        const res = await requestWithAuth(`${API_URL}/dept-spending/admin/enterprise-settings`);
        enterpriseSettings.value = res?.results || [];
        stageSettings.value = res?.stages || [];
    }

    function upsertStage(res) {
        if (!res?.enterprise_key) return;
        const idx = stageSettings.value.findIndex((e) => String(e.enterprise_key) === String(res.enterprise_key));
        if (idx >= 0) stageSettings.value[idx] = res;
        else stageSettings.value = [...stageSettings.value, res];
    }

    // Status manual do EMPREENDIMENTO (etapa).
    async function setStageSettings(enterpriseKey, payload) {
        const res = await requestWithAuth(
            `${API_URL}/dept-spending/admin/stage-settings/${encodeURIComponent(enterpriseKey)}`,
            { method: 'PUT', body: JSON.stringify(payload) }
        );
        upsertStage(res);
        return res;
    }

    async function setEnterpriseSettings(companyId, payload) {
        const res = await requestWithAuth(
            `${API_URL}/dept-spending/admin/enterprise-settings/${encodeURIComponent(companyId)}`,
            { method: 'PUT', body: JSON.stringify(payload) }
        );
        const idx = enterpriseSettings.value.findIndex((e) => String(e.company_id) === String(companyId));
        if (idx >= 0) enterpriseSettings.value[idx] = res;
        else if (res) enterpriseSettings.value = [...enterpriseSettings.value, res];
        return res;
    }

    // Liberação (rascunho → liberado) por EMPREENDIMENTO (etapa/CC).
    async function setEnterpriseRelease(enterpriseKey, isReleased, notes, companyId = null) {
        releasingId.value = enterpriseKey;
        try {
            const res = await requestWithAuth(
                `${API_URL}/dept-spending/admin/release/${encodeURIComponent(enterpriseKey)}`,
                { method: 'PUT', body: JSON.stringify({ is_released: !!isReleased, notes, company_id: companyId }) }
            );
            upsertStage(res);
            return res;
        } finally {
            releasingId.value = null;
        }
    }

    return {
        known, configured, enterpriseSettings, stageSettings, error, savingName, releasingId,
        isLoading, marketingCount, isMarketing,
        fetchMarketingDepartments, setMarketingDepartment,
        fetchEnterpriseSettings, setEnterpriseSettings, setStageSettings, setEnterpriseRelease,
    };
});
