// src/stores/Sienge/envioSiengeStore.js
//
// Vigia do envio da venda ao ERP: a lista de reservas travadas em "Envio Sienge"
// e a regra que decide o que é "travada".
//
// Vive numa store porque a lista e a regra ficam em ABAS DIFERENTES da tela
// Sienge (Vendas travadas × Configuração) e precisam do mesmo dado: a aba da
// lista escreve "parada há mais de N minutos" com o N que a aba de configuração
// grava. Com fetch solto em cada tela, salvar em uma não mudava a outra.

import { defineStore } from 'pinia'
import { requestWithAuth } from '@/utils/Auth/requestWithAuth'

export const useEnvioSiengeStore = defineStore('envioSienge', {
    state: () => ({
        itens: [],
        settings: null,
        loading: false,
        saving: false,
        loaded: false,
        error: null,
        lastRunAt: null,
    }),

    getters: {
        /** Ato pago e sem contrato: o dinheiro entrou e o ERP não sabe. */
        comAtoPago: (state) => state.itens.filter(i => i.ato_pago).length,
        minutosLimite: (state) => Number(state.settings?.minutos_limite ?? 30),
    },

    actions: {
        async fetchAll() {
            this.loading = true
            this.error = null
            try {
                const [s, p] = await Promise.all([
                    requestWithAuth('/envio-sienge-watch/settings'),
                    requestWithAuth('/envio-sienge-watch/pendencias'),
                ])
                this.settings = {
                    active: !!s.active,
                    minutos_limite: s.minutos_limite ?? 30,
                    idsituacao_vigiada: s.idsituacao_vigiada ?? 17,
                    notify_user_ids: Array.isArray(s.notify_user_ids) ? s.notify_user_ids.map(Number) : [],
                    cron_expression: s.cron_expression || '*/15 * * * *',
                }
                this.lastRunAt = s.last_run_at || null
                this.itens = p.itens || []
                return this.itens
            } catch (err) {
                this.error = err.message || 'Falha ao carregar.'
                throw err
            } finally {
                this.loading = false
                this.loaded = true
            }
        },

        /**
         * Roda a varredura agora. `notificar = false` mede sem avisar ninguém -
         * serve para ver o efeito de um prazo novo antes de deixá-lo valendo.
         */
        async run(notificar = false) {
            this.loading = true
            this.error = null
            try {
                await requestWithAuth(`/envio-sienge-watch/run?notificar=${notificar}`, { method: 'POST' })
                await this.fetchAll()
            } catch (err) {
                this.error = err.message || 'Falha ao verificar.'
                throw err
            } finally {
                this.loading = false
            }
        },

        async saveSettings(patch) {
            this.saving = true
            this.error = null
            try {
                await requestWithAuth('/envio-sienge-watch/settings', {
                    method: 'PUT',
                    body: JSON.stringify(patch),
                })
                await this.fetchAll()
                return this.settings
            } catch (err) {
                this.error = err.message || 'Falha ao salvar.'
                throw err
            } finally {
                this.saving = false
            }
        },
    },
})
