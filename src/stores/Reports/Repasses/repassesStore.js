import { defineStore } from 'pinia';
import { fetchCarregamento } from '@/utils/Config/fetchCarregamento';
import API_URL from '@/config/apiUrl'; // Define a URL base da sua API

export const useRepassesStore = defineStore('repasses', {
    state: () => ({
        repasses: [],
        total: 0,
        limit: "5000",
        offset: 0,
        totalConteudo: 0,
        carregando: false,
    }),
    actions: {
        async fetchRepasses() {
            this.carregando = true;
            try {
                // Chama o endpoint da API que retorna os repasses
                const response = await fetchCarregamento(`${API_URL}/external/repasses`);
                if (!response.ok) {
                    console.error('Erro ao buscar repasses:', response.status);
                    return;
                }
                const data = await response.json();

                // Armazena os dados na store
                // this.repasses = data.repasses;
                // Inverte a ordem dos repasses (do mais recente para o mais antigo)
                this.repasses = data.repasses.reverse();
                this.total = data.total;
                this.totalConteudo = data.totalConteudo;
                console.log('Repasses carregados:', data);
            } catch (error) {
                console.error('Erro ao buscar repasses:', error.message);
            } finally {
                this.carregando = false;
            }
        }
    }
});
