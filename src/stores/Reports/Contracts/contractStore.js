// src/stores/Reports/Contracts/contractStore.js
import { defineStore } from 'pinia';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { ref } from 'vue';

export const useContratosStore = defineStore('contratos', () => {
    const contratos = ref([]);
    const error = ref(null);
    const count = ref(0);

    const fetchContratos = async ({
        companyId = '',
        enterpriseId = '',
        enterpriseName = '',
        startDate = '',
        endDate = '', 
        linkedEnterprises = '' 
    } = {}) => {
        const loading = useCarregamentoStore();
        error.value = null;

        try {
            loading.iniciarCarregamento();
            const url = new URL(`${API_URL}/sienge/contratos`);
            if (companyId) url.searchParams.append('companyId', companyId);
            if (enterpriseId) url.searchParams.append('enterpriseId', enterpriseId);
            if (enterpriseName) url.searchParams.append('enterpriseName', enterpriseName);
            if (startDate) url.searchParams.append('startDate', startDate);
            if (endDate) url.searchParams.append('endDate', endDate);
            if (linkedEnterprises) {
                // Expect linkedEnterprises as a comma-separated string
                url.searchParams.append('linkedEnterprises', linkedEnterprises);
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error('Resposta inválida da API');
            const data = await res.json();

            contratos.value = data.results;
            count.value = data.count;
        } catch (e) {
            error.value = 'Erro ao buscar contratos';
            console.error(e);
        } finally {
            loading.finalizarCarregamento();
        }
    };

    return { contratos, count, error, fetchContratos };
});
