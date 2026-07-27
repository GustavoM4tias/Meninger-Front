// stores/Comercial/Contracts/enterpriseErpLinksStore.js
//
// Vínculo CV ↔ Sienge das projeções + diagnóstico dos que não conectaram.
//
// O vínculo é aplicado no BACKEND (a projeção já chega com o enterprise_id do
// Sienge resolvido). Aqui o store serve à central de gestão e a explicar, na
// tela, quais empreendimentos ainda estão soltos e por quê.
import { defineStore } from 'pinia'
import API_URL from '@/config/apiUrl'

const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
})

export const useEnterpriseErpLinksStore = defineStore('enterpriseErpLinks', {
    state: () => ({
        items: [],      // vínculos ativos
        pending: [],    // empreendimentos do CV sem ERP resolvido
        loading: false,
        loadingPending: false,
        error: null
    }),

    getters: {
        pendingCount: (state) => state.pending.length
    },

    actions: {
        async fetchAll() {
            this.loading = true
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/enterprise-erp-links`, { headers: authHeaders() })
                if (!res.ok) throw new Error(`Erro ${res.status}`)
                const data = await res.json()
                this.items = Array.isArray(data.results) ? data.results : []
            } catch (e) {
                this.error = e.message
            } finally {
                this.loading = false
            }
        },

        async fetchPending() {
            this.loadingPending = true
            try {
                const res = await fetch(`${API_URL}/admin/enterprise-erp-links/pendentes`, { headers: authHeaders() })
                if (!res.ok) throw new Error(`Erro ${res.status}`)
                const data = await res.json()
                this.pending = Array.isArray(data.results) ? data.results : []
            } catch (e) {
                this.error = e.message
                this.pending = []
            } finally {
                this.loadingPending = false
            }
        },

        async addLink({ cv_enterprise_id, cv_enterprise_name, cv_stage_name, erp_enterprise_id, erp_enterprise_name, description }) {
            this.error = null
            const res = await fetch(`${API_URL}/admin/enterprise-erp-links`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ cv_enterprise_id, cv_enterprise_name, cv_stage_name, erp_enterprise_id, erp_enterprise_name, description })
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) {
                this.error = body?.error || `Erro ${res.status}`
                throw new Error(this.error)
            }
            const idx = this.items.findIndex(i => i.id === body.id)
            if (idx >= 0) this.items.splice(idx, 1, body)
            else this.items.push(body)
            await this.fetchPending()
            return body
        },

        async removeLink(id) {
            this.error = null
            const res = await fetch(`${API_URL}/admin/enterprise-erp-links/${id}`, {
                method: 'DELETE',
                headers: authHeaders()
            })
            if (!res.ok) {
                this.error = `Erro ${res.status}`
                throw new Error(this.error)
            }
            this.items = this.items.filter(i => i.id !== id)
            await this.fetchPending()
        }
    }
})
