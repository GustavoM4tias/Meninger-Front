import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchCarregamento } from '../../utils/Config/fetchCarregamento';
import API_URL from '../../config/apiUrl'; // Define a URL base da sua API

export const useLeadsStore = defineStore('leads', () => {
    const leads = ref([]);
    const carregando = ref(false); // Controle de carregamento
    const error = ref(null);
    const periodo = ref({ data_inicio: null, data_fim: null });
    const total = ref(0);
    const filas = ref([]);

    /**
     * Busca os leads da API.
     * Se os parâmetros de data não forem informados (ou estiverem vazios),
     * a consulta é feita sem os filtros de data (o backend usará o mês atual).
     * O parâmetro "mostrar_todos" deve ser "true" para ignorar o filtro de origem.
     */
    async function fetchLeads({ data_inicio, data_fim, mostrar_todos } = {}) {
        carregando.value = true;
        error.value = null;
        try {
            const url = `${API_URL}/external/leads`;
            const params = new URLSearchParams(); 

            if (data_inicio) params.append('data_inicio', data_inicio);
            if (data_fim) params.append('data_fim', data_fim);
            if (mostrar_todos) params.append('mostrar_todos', mostrar_todos);

            const response = await fetchCarregamento(`${url}?${params.toString()}`);
            const data = await response.json();

            if (response.ok) {
                leads.value = data.leads;
                periodo.value = data.periodo;
                total.value = data.total;
                // console.log('Retorno da requisição:', data)
            } else {
                error.value = data.error || 'Erro desconhecido';
            }
        } catch (err) {
            error.value = err.message;
        } finally {
            carregando.value = false;
        }
    }

    const fetchFilas = async () => {
        try {
            carregando.value = true; // Marca como carregando

            // URL com parâmetros para trazer todos os registros
            const url = `${API_URL}/external/filas`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.statusText}`);
            }

            const data = await response.json();

            if (response.ok) {
                filas.value = data.filas; 
            } else {
                error.value = data.error || 'Erro desconhecido';
            }
        } catch (err) {
            error.value = err.message;
        } finally {
            carregando.value = false;
        }
    }

    return {
        leads,
        carregando,
        error,
        periodo,
        total,
        filas,
        fetchLeads,
        fetchFilas,
    };
});
