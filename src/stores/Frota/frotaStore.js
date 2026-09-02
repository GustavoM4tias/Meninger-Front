// src/stores/Frota/frotaStore.js
//
// Estado da tela do veículo corporativo.
//
// O servidor é a fonte única do que está ocupado: o cliente NÃO recalcula
// conflito. Ele só desenha o que veio e, na hora de reservar, pergunta antes
// (verificar) e obedece o 409 depois - assim a tela nunca fica mais permissiva
// que a API, que é onde a regra de verdade mora.
import { defineStore } from 'pinia';
import {
    fetchOverview, fetchAgenda, fetchMinhasReservas,
    criarReserva, cancelarReserva, registrarRetirada, registrarDevolucao, retirarAgora,
    criarBloqueio, removerBloqueio, fetchRegistros,
} from '@/utils/Frota/apiFrota';
import { mensagemDeErro } from '@/utils/mensagemDeErro';

/* O calendário navega meses, então a janela carregada tem que ir além do mês
   atual - senão o mês seguinte apareceria todo livre por falta de dado, que é
   pior do que não mostrar. 90 dias é o mesmo teto da antecedência máxima. */
const DIAS_NA_AGENDA = 90;

export const useFrotaStore = defineStore('frota', {
    state: () => ({
        veiculos: [],
        veiculoId: null,
        gestor: false,
        config: {},

        reservas: [],
        bloqueios: [],
        minhasReservas: [],
        avarias: [],

        carregando: false,
        salvando: false,
        erro: '',
    }),

    getters: {
        veiculo(state) {
            return state.veiculos.find(v => v.id === state.veiculoId) || state.veiculos[0] || null;
        },
        estado() {
            return this.veiculo?.estado || null;
        },
        centrosCusto(state) {
            return state.config?.centros_custo || [];
        },
        /** O que ainda não terminou: é isso que a pessoa pode retirar ou cancelar. */
        minhasAtivas(state) {
            return state.minhasReservas.filter(r => ['reservada', 'em_uso'].includes(r.status));
        },
    },

    actions: {
        async carregar() {
            this.carregando = true;
            this.erro = '';
            try {
                const overview = await fetchOverview();
                this.veiculos = overview.veiculos || [];
                this.gestor = Boolean(overview.gestor);
                this.config = overview.config || {};
                if (!this.veiculoId && this.veiculos.length) this.veiculoId = this.veiculos[0].id;

                await Promise.all([this.carregarAgenda(), this.carregarMinhas(), this.carregarAvarias()]);
            } catch (e) {
                this.erro = mensagemDeErro(e, 'Não foi possível carregar a agenda do veículo.');
            } finally {
                this.carregando = false;
            }
        },

        async carregarAgenda() {
            const de = new Date();
            de.setHours(0, 0, 0, 0);
            const ate = new Date(de.getTime() + DIAS_NA_AGENDA * 86400000);
            const dados = await fetchAgenda({ de, ate, vehicleId: this.veiculoId });
            this.reservas = dados.reservas || [];
            this.bloqueios = dados.bloqueios || [];
        },

        async carregarMinhas() {
            this.minhasReservas = await fetchMinhasReservas();
        },

        /* As avarias conhecidas do veículo. Elas moram no histórico do CARRO e
           não na reserva: um amassado continua lá na próxima vez que alguém
           pegar, e é isso que a retirada precisa mostrar. */
        async carregarAvarias() {
            if (!this.veiculoId) { this.avarias = []; return; }
            try {
                const registros = await fetchRegistros(this.veiculoId);
                this.avarias = registros.filter(r => r.tipo === 'avaria');
            } catch {
                this.avarias = [];   // histórico é apoio: não pode travar a retirada
            }
        },

        /** Toda ação que muda a agenda recarrega tudo: meia tela atualizada mente. */
        async depoisDeMudar() {
            const overview = await fetchOverview();
            this.veiculos = overview.veiculos || [];
            await Promise.all([this.carregarAgenda(), this.carregarMinhas(), this.carregarAvarias()]);
        },

        async reservar(payload) {
            this.salvando = true;
            try {
                const reserva = await criarReserva({ ...payload, vehicle_id: this.veiculoId });
                await this.depoisDeMudar();
                return reserva;
            } finally {
                this.salvando = false;
            }
        },

        async cancelar(id, motivo) {
            this.salvando = true;
            try {
                await cancelarReserva(id, motivo);
                await this.depoisDeMudar();
            } finally {
                this.salvando = false;
            }
        },

        async retirar(id, payload) {
            this.salvando = true;
            try {
                const reserva = await registrarRetirada(id, payload);
                await this.depoisDeMudar();
                return reserva;
            } finally {
                this.salvando = false;
            }
        },

        async devolver(id, payload) {
            this.salvando = true;
            try {
                const reserva = await registrarDevolucao(id, payload);
                await this.depoisDeMudar();
                return reserva;
            } finally {
                this.salvando = false;
            }
        },

        async retirarSemReserva(payload) {
            this.salvando = true;
            try {
                const reserva = await retirarAgora({ ...payload, vehicle_id: this.veiculoId });
                await this.depoisDeMudar();
                return reserva;
            } finally {
                this.salvando = false;
            }
        },

        async bloquear(payload) {
            this.salvando = true;
            try {
                const resultado = await criarBloqueio({ ...payload, vehicle_id: this.veiculoId });
                await this.depoisDeMudar();
                return resultado;
            } finally {
                this.salvando = false;
            }
        },

        async desbloquear(id) {
            this.salvando = true;
            try {
                await removerBloqueio(id);
                await this.depoisDeMudar();
            } finally {
                this.salvando = false;
            }
        },

        async trocarVeiculo(id) {
            this.veiculoId = id;
            await this.carregarAgenda();
        },
    },
});
