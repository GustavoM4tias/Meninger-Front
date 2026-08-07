// stores/contractAdjustmentsStore.js
//
// Ajustes contábeis do Faturamento: máscara sobre o dado do contrato para
// corrigir, por questão contábil, o que veio errado do Sienge.
//
// Só admin usa este store (a API inteira é requireAdmin). O SELO do ajuste, que
// todo usuário vê no dashboard, NÃO passa por aqui: ele vem junto com cada
// contrato no campo `adjustments` (contractsStore).
import { defineStore } from 'pinia'
import API_URL from '@/config/apiUrl'

export const ADJ_TYPE_LABEL = {
    FI_DATE: 'Data da inst. financeira',
    SERIE_ADD: 'Série adicionada',
    SERIE_EDIT: 'Série editada'
}

export const ADJ_TYPE_ICON = {
    FI_DATE: 'far fa-calendar-check',
    SERIE_ADD: 'fas fa-circle-plus',
    SERIE_EDIT: 'fas fa-pen'
}

// Vigilância do dado de origem (o Sienge pode mudar debaixo do ajuste).
export const ADJ_STATUS_LABEL = {
    active: 'Valendo',
    needs_review: 'Conferir',
    auto_resolved: 'Resolvido sozinho'
}

export const ADJ_STATUS_VARIANT = {
    active: 'success',
    needs_review: 'warning',
    auto_resolved: 'neutral'
}

export const useContractAdjustmentsStore = defineStore('contractAdjustments', {
    state: () => ({
        items: [],
        loading: false,
        saving: false,
        error: null,
        // Última chamada que gerou divergência em mês já consolidado. A tela usa
        // para avisar na hora — o fechamento não muda sozinho.
        lastDivergences: 0
    }),

    getters: {
        // Ajustes cuja origem mudou no Sienge depois da correção. A máscara
        // segue valendo; o que falta é o admin decidir.
        needsReview: (state) => state.items.filter((i) => i.status === 'needs_review'),
        autoResolved: (state) => state.items.filter((i) => i.status === 'auto_resolved'),
        countByContract: (state) => {
            const map = new Map()
            for (const it of state.items) {
                const k = String(it.contract_id)
                map.set(k, (map.get(k) || 0) + 1)
            }
            return map
        }
    },

    actions: {
        _headers() {
            return {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        },

        async _json(res) {
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || `Erro ${res.status}`)
            }
            return res.json()
        },

        async fetchAll() {
            this.loading = true
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/contract-adjustments`, { headers: this._headers() })
                const data = await this._json(res)
                this.items = Array.isArray(data.results) ? data.results : []
            } catch (e) {
                this.error = e.message
            } finally {
                this.loading = false
            }
        },

        // Busca contrato por número, cliente ou unidade (entrada pela engrenagem).
        async searchContracts(q) {
            const term = String(q || '').trim()
            if (term.length < 2) return []
            const res = await fetch(
                `${API_URL}/admin/contract-adjustments/contracts?q=${encodeURIComponent(term)}`,
                { headers: this._headers() }
            )
            const data = await this._json(res)
            return Array.isArray(data.results) ? data.results : []
        },

        // Contrato completo, com data efetiva e séries já mascaradas — é o que o
        // formulário mostra para escolher a série e comparar antes/depois.
        async fetchContract(contractId) {
            const res = await fetch(
                `${API_URL}/admin/contract-adjustments/contracts/${encodeURIComponent(contractId)}`,
                { headers: this._headers() }
            )
            return this._json(res)
        },

        async createItem(body) {
            this.saving = true
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/contract-adjustments`, {
                    method: 'POST',
                    headers: this._headers(),
                    body: JSON.stringify(body)
                })
                const item = await this._json(res)
                this.lastDivergences = Number(item.new_divergences) || 0
                const idx = this.items.findIndex((i) => i.id === item.id)
                if (idx >= 0) this.items.splice(idx, 1, item)
                else this.items.unshift(item)
                return item
            } catch (e) {
                this.error = e.message
                throw e
            } finally {
                this.saving = false
            }
        },

        async updateItem(id, body) {
            this.saving = true
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/contract-adjustments/${id}`, {
                    method: 'PUT',
                    headers: this._headers(),
                    body: JSON.stringify(body)
                })
                const item = await this._json(res)
                this.lastDivergences = Number(item.new_divergences) || 0
                const idx = this.items.findIndex((i) => i.id === item.id)
                if (idx >= 0) this.items.splice(idx, 1, item)
                return item
            } catch (e) {
                this.error = e.message
                throw e
            } finally {
                this.saving = false
            }
        },

        // "Conferir agora": não espera o cron das 03:40.
        async runCheck() {
            this.saving = true
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/contract-adjustments/check`, {
                    method: 'POST',
                    headers: this._headers()
                })
                const result = await this._json(res)
                await this.fetchAll()
                return result
            } catch (e) {
                this.error = e.message
                throw e
            } finally {
                this.saving = false
            }
        },

        // "Já conferi": mantém o ajuste como está e adota a origem nova como
        // referência, senão a pendência voltaria a aparecer todo dia.
        async reviewItem(id) {
            this.saving = true
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/contract-adjustments/${id}/review`, {
                    method: 'PUT',
                    headers: this._headers()
                })
                const item = await this._json(res)
                const idx = this.items.findIndex((i) => i.id === item.id)
                if (idx >= 0) this.items.splice(idx, 1, item)
                return item
            } catch (e) {
                this.error = e.message
                throw e
            } finally {
                this.saving = false
            }
        },

        async removeItem(id) {
            this.saving = true
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/contract-adjustments/${id}`, {
                    method: 'DELETE',
                    headers: this._headers()
                })
                const data = await this._json(res)
                this.lastDivergences = Number(data.new_divergences) || 0
                this.items = this.items.filter((i) => i.id !== id)
            } catch (e) {
                this.error = e.message
                throw e
            } finally {
                this.saving = false
            }
        }
    }
})
