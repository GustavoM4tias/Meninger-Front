// src/stores/Marketing/Viability/viabilityAdminStore.js
//
// Config admin da Viabilidade de Marketing (admin-only no backend):
//  - quais departamentos do Custos contam como "marketing" (global)
//  - configuração por empreendimento (bloqueadas consideradas disponíveis + overrides)
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

const lc = (s) => String(s || '').trim().toLowerCase();

export const useViabilityAdminStore = defineStore('marketingViabilityAdmin', () => {
    const carregamento = useCarregamentoStore();

    const known = ref([]);              // ['Marketing','Comercial',...] (deptos vistos nas despesas)
    const configured = ref([]);         // [{ department_name, is_marketing }]
    const enterpriseSettings = ref([]); // [{ enterprise_key, blocked_considered_available, marketing_dept_overrides }]
    const error = ref(null);
    const savingName = ref(null);       // depto em gravação (para spinner por linha)

    const isLoading = computed(() => carregamento.carregando);

    const marketingCount = computed(
        () => configured.value.filter((c) => c.is_marketing).length
    );

    function isMarketing(name) {
        const found = configured.value.find((c) => lc(c.department_name) === lc(name));
        return found ? !!found.is_marketing : false;
    }

    async function fetchMarketingDepartments() {
        error.value = null;
        try {
            carregamento.iniciarCarregamento();
            const res = await requestWithAuth(`${API_URL}/viability/admin/marketing-departments`);
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
            await requestWithAuth(`${API_URL}/viability/admin/marketing-departments`, {
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
        const res = await requestWithAuth(`${API_URL}/viability/admin/enterprise-settings`);
        enterpriseSettings.value = res?.results || [];
    }

    async function setEnterpriseSettings(companyId, payload) {
        const res = await requestWithAuth(
            `${API_URL}/viability/admin/enterprise-settings/${encodeURIComponent(companyId)}`,
            { method: 'PUT', body: JSON.stringify(payload) }
        );
        // atualiza cache local
        const idx = enterpriseSettings.value.findIndex((e) => String(e.company_id) === String(companyId));
        if (idx >= 0) enterpriseSettings.value[idx] = res;
        else if (res) enterpriseSettings.value = [...enterpriseSettings.value, res];
        return res;
    }

    return {
        known,
        configured,
        enterpriseSettings,
        error,
        savingName,
        isLoading,
        marketingCount,
        isMarketing,
        fetchMarketingDepartments,
        setMarketingDepartment,
        fetchEnterpriseSettings,
        setEnterpriseSettings,
    };
});
