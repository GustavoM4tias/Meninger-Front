// src/stores/Sienge/awardsStore.js
import { defineStore } from 'pinia'
import { useCarregamentoStore } from '@/stores/Config/carregamento'
import API_URL from '@/config/apiUrl'

export const useAwardsStore = defineStore('awards', {
    state: () => ({
        awards: [],
        error: null,
    }),

    getters: {
        hasError: (state) => !!state.error,
    },

    actions: {
        setError(message) {
            this.error = message
        },

        upsertAwards(payload) {
            const list = Array.isArray(payload) ? payload : [payload]
            list.forEach((award) => {
                if (!award || award.id == null) return
                const idx = this.awards.findIndex((a) => a.id === award.id)
                if (idx === -1) {
                    this.awards.unshift(award)
                } else {
                    this.awards[idx] = award
                }
            })
        },

        async fetchAwards() {
            const carregamentoStore = useCarregamentoStore()
            this.error = null

            try {
                carregamentoStore.iniciarCarregamento()

                const res = await fetch(`${API_URL}/sienge/awards`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                })

                if (!res.ok) throw new Error("Erro ao buscar premiações")

                const data = await res.json()
                this.awards = Array.isArray(data.results) ? data.results : []

            } catch (err) {
                this.error = err.message
            } finally {
                carregamentoStore.finalizarCarregamento()
            }
        },

        /** REGISTRA OS CLIENTES NA PREMIAÇÃO (SEM NF) */
        async registerSalesForAward(sales = []) {
            const carregamentoStore = useCarregamentoStore()
            this.error = null

            try {
                carregamentoStore.iniciarCarregamento()

                const res = await fetch(`${API_URL}/sienge/awards/register-sales`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ sales })
                })

                if (!res.ok) throw new Error("Erro ao registrar clientes na premiação")

                const data = await res.json()
                this.upsertAwards(data.awards || [])
                return data
            } catch (err) {
                this.error = err.message
                throw err
            } finally {
                carregamentoStore.finalizarCarregamento()
            }
        },

        /** ANEXA NF PARA UM CLIENTE JÁ REGISTRADO */
        async attachNfToAward(awardId, file) {
            const [award] = await this.bulkAttachNf({
                awardIds: [awardId],
                file
            })
            return award
        },

        /** EDITA OS DADOS DE UMA NF JÁ SALVA */
        async updateAward(award) {
            const carregamentoStore = useCarregamentoStore()
            this.error = null

            try {
                carregamentoStore.iniciarCarregamento()

                const res = await fetch(`${API_URL}/sienge/awards/${award.id}`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        nfNumber: award.nfNumber,
                        nfIssueDate: award.nfIssueDate,
                        providerName: award.providerName,
                        providerCnpj: award.providerCnpj?.replace(/\D/g, '') || null,
                        customerName: award.customerName,
                        serviceDescription: award.serviceDescription,
                        totalAmount: award.totalAmount,
                        status: award.status,
                    }),
                })

                if (!res.ok) throw new Error("Erro ao atualizar premiação")

                const data = await res.json()

                this.upsertAwards(data.award)

                return data.award
            } catch (err) {
                this.error = err.message
                throw err
            } finally {
                carregamentoStore.finalizarCarregamento()
            }
        },

        /** Aplica NF (arquivo ou NF existente) para vários registros */
        async bulkAttachNf({ awardIds = [], file = null, sourceAwardId = null }) {
            const carregamentoStore = useCarregamentoStore()
            this.error = null

            try {
                if (!Array.isArray(awardIds) || awardIds.length === 0) {
                    throw new Error("Selecione ao menos um cliente.")
                }

                carregamentoStore.iniciarCarregamento()

                const formData = new FormData()
                formData.append("awardIds", JSON.stringify(awardIds))
                if (file) formData.append("file", file)
                if (sourceAwardId) formData.append("sourceAwardId", sourceAwardId)

                const res = await fetch(`${API_URL}/sienge/awards/nfse/bulk`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                    body: formData
                })

                if (!res.ok) throw new Error("Erro ao aplicar NF")

                const data = await res.json()
                this.upsertAwards(data.awards || [])
                return data.awards || []
            } catch (err) {
                this.error = err.message
                throw err
            } finally {
                carregamentoStore.finalizarCarregamento()
            }
        },

        /** Remove NF dos registros selecionados */
        async bulkClearNf(awardIds = []) {
            const carregamentoStore = useCarregamentoStore()
            this.error = null

            try {
                if (!Array.isArray(awardIds) || awardIds.length === 0) {
                    throw new Error("Selecione ao menos um cliente.")
                }

                carregamentoStore.iniciarCarregamento()

                const res = await fetch(`${API_URL}/sienge/awards/nfse/clear`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ awardIds })
                })

                if (!res.ok) throw new Error("Erro ao remover NF")

                const data = await res.json()
                this.upsertAwards(data.awards || [])
                return data.awards || []
            } catch (err) {
                this.error = err.message
                throw err
            } finally {
                carregamentoStore.finalizarCarregamento()
            }
        },

        /** Exclui premiações (clientes) */
        async deleteAwards(awardIds = []) {
            const carregamentoStore = useCarregamentoStore()
            this.error = null

            try {
                if (!Array.isArray(awardIds) || awardIds.length === 0) {
                    throw new Error("Selecione pelo menos um cliente para excluir.")
                }

                carregamentoStore.iniciarCarregamento()

                const res = await fetch(`${API_URL}/sienge/awards/delete`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ awardIds })
                })

                if (!res.ok) {
                    const errBody = await res.json().catch(() => ({}))
                    throw new Error(errBody.error || "Erro ao excluir premiação")
                }

                const data = await res.json()
                const removed = new Set(data.removedIds || awardIds)
                this.awards = this.awards.filter((award) => !removed.has(award.id))
                return { removedIds: Array.from(removed) }
            } catch (err) {
                this.error = err.message
                throw err
            } finally {
                carregamentoStore.finalizarCarregamento()
            }
        }
    }
})
