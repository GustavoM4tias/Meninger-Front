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

                return await res.json()
            } catch (err) {
                this.error = err.message
                throw err
            } finally {
                carregamentoStore.finalizarCarregamento()
            }
        },

        /** ANEXA NF PARA UM CLIENTE JÁ REGISTRADO */
        async attachNfToAward(awardId, file) {
            const carregamentoStore = useCarregamentoStore()
            this.error = null

            try {
                carregamentoStore.iniciarCarregamento()

                const formData = new FormData()
                formData.append("file", file)

                const res = await fetch(`${API_URL}/sienge/awards/${awardId}/attach-nfse`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                    body: formData
                })

                if (!res.ok) throw new Error("Erro ao anexar NF ao cliente")

                const data = await res.json()

                const idx = this.awards.findIndex(a => a.id === awardId)
                if (idx !== -1) this.awards[idx] = data.award

                return data.award
            } catch (err) {
                this.error = err.message
                throw err
            } finally {
                carregamentoStore.finalizarCarregamento()
            }
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
                    }),
                })

                if (!res.ok) throw new Error("Erro ao atualizar premiação")

                const data = await res.json()

                const idx = this.awards.findIndex(a => a.id === data.award.id)
                if (idx !== -1) this.awards[idx] = data.award

            } catch (err) {
                this.error = err.message
            } finally {
                carregamentoStore.finalizarCarregamento()
            }
        }
    }
})
