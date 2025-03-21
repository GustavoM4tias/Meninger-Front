import { defineStore } from 'pinia';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import API_URL from '@/config/apiUrl';

export const useRepassesStore = defineStore('repasses', {
    state: () => ({
        repasses: [],
        empreendimentos: [],
        total: 0,
        limit: "5000",
        offset: 0,
        filtroEmpreendimento: [], // Changed to array to support multiple empreendimentos
        mostrarCancelados: false,
        mostrarDistratos: false,
        mostrarCessoes: false,
        statusConfig: [],
        grupos: [],
        contagemSituacoes: {},
        contagemGrupos: {}
    }),
    actions: {
        async fetchRepasses(empreendimento = [], opcoesFiltro = {}) {
            const carregamentoStore = useCarregamentoStore();
            try {
                carregamentoStore.iniciarCarregamento();
                // Constrói a URL com os filtros
                let url = `${API_URL}/external/repasses`;
                const params = new URLSearchParams();

                // Se empreendimento for um array não vazio, envie como lista separada por vírgula
                if (Array.isArray(empreendimento) && empreendimento.length > 0) {
                    // Normalize e junte os empreendimentos em uma string
                    const empreendimentosSemAcentos = empreendimento.map(emp =>
                        emp.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    );
                    params.append('empreendimento', empreendimentosSemAcentos.join(','));
                }

                // Adiciona os filtros de status
                params.append('mostrarCancelados', String(opcoesFiltro.mostrarCancelados !== undefined ?
                    opcoesFiltro.mostrarCancelados : this.mostrarCancelados));
                params.append('mostrarDistratos', String(opcoesFiltro.mostrarDistratos !== undefined ?
                    opcoesFiltro.mostrarDistratos : this.mostrarDistratos));
                params.append('mostrarCessoes', String(opcoesFiltro.mostrarCessoes !== undefined ?
                    opcoesFiltro.mostrarCessoes : this.mostrarCessoes));

                // Adiciona os parâmetros à URL
                if (params.toString()) {
                    url += `?${params.toString()}`;
                }

                const response = await fetch(url);
                if (!response.ok) {
                    console.error('Erro ao buscar repasses:', response.status);
                    return;
                }

                const data = await response.json();

                // Armazena os dados na store
                this.repasses = data.repasses;
                this.empreendimentos = data.empreendimentos || [];
                this.total = data.total;

                // Handle filtroAplicado as an array
                if (data.filtroAplicado) {
                    this.filtroEmpreendimento = Array.isArray(data.filtroAplicado)
                        ? data.filtroAplicado
                        : data.filtroAplicado.split(',');
                } else {
                    this.filtroEmpreendimento = [];
                }

                this.statusConfig = data.statusConfig || [];
                this.grupos = data.grupos || [];
                this.contagemSituacoes = data.contagemSituacoes || {};
                this.contagemGrupos = data.contagemGrupos || {};

                // Atualiza os estados dos filtros
                if (data.filtros) {
                    this.mostrarCancelados = data.filtros.mostrarCancelados;
                    this.mostrarDistratos = data.filtros.mostrarDistratos;
                    this.mostrarCessoes = data.filtros.mostrarCessoes;
                }
                console.log('Repasses carregados:', data);
            } catch (error) {
                console.error('Erro ao buscar repasses:', error.message);
            } finally {
                carregamentoStore.finalizarCarregamento();
            }
        },

        // Método atualizado para aceitar array de empreendimentos
        async setFiltroEmpreendimento(empreendimento) {
            // Garantir que filtroEmpreendimento seja sempre um array
            this.filtroEmpreendimento = Array.isArray(empreendimento) ? empreendimento : [empreendimento];
            // Recarrega os dados com o novo filtro
            await this.fetchRepasses(this.filtroEmpreendimento);
        },

        async setFiltroStatus(filtros) {
            Object.assign(this, filtros);
            // Recarrega os dados com os novos filtros
            await this.fetchRepasses(this.filtroEmpreendimento, filtros);
        },


        async fetchEmpreendimentos() {
            if (this.empreendimentos.length > 0) {
                return this.empreendimentos;
            }

            try {
                const response = await fetch(`${API_URL}/external/listagem-empreendimentos`);
                if (!response.ok) {
                    console.error('Erro ao buscar empreendimentos:', response.status);
                    return;
                }

                const data = await response.json();
                this.empreendimentos = data.empreendimentos || [];

                console.log('Empreendimentos carregados:', this.empreendimentos);
                return this.empreendimentos;
            } catch (error) {
                console.error('Erro ao buscar empreendimentos:', error.message);
            }
        },

        async fetchRepasseWorkflow() {
            try {
                const response = await fetch(`${API_URL}/external/repasse-workflow`);
                if (!response.ok) {
                    console.error('Erro ao buscar workflow de repasses:', response.status);
                    return;
                }

                const data = await response.json();
                this.statusConfig = data.situacoes || [];
                this.grupos = data.grupos || [];

                console.log('Workflow de repasses carregado:', data);
                return data;
            } catch (error) {
                console.error('Erro ao buscar workflow de repasses:', error.message);
            }
        },

        getStatusName(statusId) {
            const status = this.statusConfig.find(s => s.idsituacao === statusId);
            return status ? status.nome : 'Desconhecido';
        },

        getStatusColor(statusId) {
            const status = this.statusConfig.find(s => s.idsituacao === statusId);
            return status ? status.cor_bg : '#cccccc';
        },

        getStatusTextColor(statusId) {
            const status = this.statusConfig.find(s => s.idsituacao === statusId);
            return status ? status.cor_nome : '#000000';
        }
    }
});