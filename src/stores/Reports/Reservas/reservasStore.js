// src/stores/Reports/Reservas/reservasStore.js

import { defineStore } from 'pinia';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import API_URL from '@/config/apiUrl'; // Certifique-se de que API_URL contenha a base da API (ex: "http://localhost:5000")

export const useReservasStore = defineStore('reservas', {
  state: () => ({
    reservas: [],                // Array com as reservas retornadas pela API
    empreendimentos: [],         // Lista de empreendimentos disponíveis
    total: 0,                    // Total de reservas retornadas
    filtroEmpreendimento: [],    // Empreendimentos filtrados (aceita array)
    filtroDataFim: null,         // Data final para filtro
    mostrarCancelados: false,
    mostrarDistratos: false,
    mostrarCessoes: false,
    // Você pode adicionar outros estados conforme necessário
  }),

  actions: {
    // Busca as reservas com base nos filtros passados
    async fetchReservas(params = {}) {
      const carregamentoStore = useCarregamentoStore();
      try {
        carregamentoStore.iniciarCarregamento();

        let reservas = [];

        // Log de tempo para identificar gargalos
        console.time('TempoTotal');

        // Função para fazer a requisição, agora simplificada e com log de tempo
        const makeRequest = async (faturarValue) => {
          const query = new URLSearchParams();
          if (params.a_partir_de) query.append('a_partir_de', params.a_partir_de);
          if (params.idempreendimento) query.append('idempreendimento', params.idempreendimento);
          if (params.ate) query.append('ate', params.ate); // Adiciona parâmetro 'ate'
          query.append('faturar', faturarValue);

          const url = `${API_URL}/cv/reservas?${query.toString()}`;

          console.time(`TempoFaturar-${faturarValue}`);
          const response = await fetch(url);
          console.timeEnd(`TempoFaturar-${faturarValue}`);

          if (!response.ok) throw new Error(`Erro ${response.status}`);
          const data = await response.json();
          return data.reservas || [];
        };

        // Verifica se o parâmetro `faturar` é 'ambos', se sim, faz duas requisições em paralelo
        if (params.faturar === 'ambos') {
          const [normal, sienge] = await Promise.all([
            makeRequest('false'),
            makeRequest('true')
          ]);
          reservas = [...normal, ...sienge];
        } else {
          reservas = await makeRequest(params.faturar || 'false');
        }

        // Ordena as reservas pela data, do mais antigo para o mais recente
        reservas.sort((a, b) => new Date(a.dataReserva) - new Date(b.dataReserva));

        console.timeEnd('TempoTotal');
        this.reservas = reservas;
        this.total = reservas.length;

        // Salva o filtro de data fim para referência futura
        if (params.ate) {
          this.filtroDataFim = params.ate;
        }

      } catch (error) { 
        console.error('Erro ao buscar reservas (store):', error.message);
        throw error;
      } finally {
        carregamentoStore.finalizarCarregamento();
      }
    },

    // Busca os empreendimentos para preencher o filtro
    async fetchEmpreendimentos() {
      try {
        const response = await fetch(`${API_URL}/cv/listagem-empreendimentos`);
        if (!response.ok) {
          console.error('Erro ao buscar empreendimentos:', response.status);
          return;
        }
        const data = await response.json();
        this.empreendimentos = data.empreendimentos || [];
        console.log('Empreendimentos carregados:', this.empreendimentos);
      } catch (error) {
        console.error('Erro ao buscar empreendimentos:', error.message);
      }
    },

    // Atualiza o filtro de empreendimento e recarrega as reservas de acordo
    async setFiltroEmpreendimento(empreendimentos) {
      // Assegura que sempre seja um array
      this.filtroEmpreendimento = Array.isArray(empreendimentos)
        ? empreendimentos
        : [empreendimentos];
      // Chama o fetchReservas com a lista de empreendimentos separados por vírgula
      await this.fetchReservas({
        idempreendimento: this.filtroEmpreendimento.join(','),
        ate: this.filtroDataFim, // Inclui a data final no filtro
        // Você pode incluir outros parâmetros padrão, se necessário
      });
    },
  },
});