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
        companyIds = [],
        enterpriseIds = [],
        enterpriseNames = [],
        startDate = '',
        endDate = '',
        linkedEnterprises = [] // array de pares "id1:id2"
    } = {}) => {
        const loading = useCarregamentoStore();
        error.value = null;

        try {
            loading.iniciarCarregamento();
            const url = new URL(`${API_URL}/sienge/contratos`);

            companyIds.forEach(id => url.searchParams.append('companyId', id));
            enterpriseIds.forEach(id => url.searchParams.append('enterpriseId', id));
            enterpriseNames.forEach(n => url.searchParams.append('enterpriseName', n));
            if (startDate) url.searchParams.append('startDate', startDate);
            if (endDate) url.searchParams.append('endDate', endDate);

            if (linkedEnterprises.length)
                url.searchParams.append('linkedEnterprises', linkedEnterprises.join(','));

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

