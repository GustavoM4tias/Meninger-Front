// stores/Comercial/Contracts/enterpriseValueRulesStore.js
//
// Regras de composição de VGV por empreendimento (Faturamento).
// Diz COMO somar o valor de um empreendimento:
//   FULL            → soma normal das condições de pagamento
//   LAND_VALUE_ONLY → usa só o land_value do contrato
//   TR_ONLY         → soma só as condições de Terreno (TR)
//
// Leitura liberada a qualquer usuário (a regra vale para todos); só o admin
// escreve, pela engrenagem do Faturamento.
import { defineStore } from 'pinia'
import API_URL from '@/config/apiUrl'

const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
})

export const useEnterpriseValueRulesStore = defineStore('enterpriseValueRules', {
    state: () => ({
        items: [],   // [{ id, enterprise_id, enterprise_name, gross_mode, net_mode, description }]
        loading: false,
        loaded: false,
        error: null
    }),

    getters: {
        // enterprise_id -> { gross, net } no formato consumido pelo contractsStore
        ruleByEnterprise: (state) => {
            const map = new Map()
            for (const r of state.items) {
                const eid = Number(r.enterprise_id)
                if (!Number.isFinite(eid) || eid <= 0) continue
                map.set(eid, {
                    gross: r.gross_mode || 'FULL',
                    net: r.net_mode || 'FULL'
                })
            }
            return map
        }
    },

    actions: {
        async fetchAll() {
            this.loading = true
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/enterprise-value-rules`, { headers: authHeaders() })
                if (!res.ok) throw new Error(`Erro ${res.status}`)
                const data = await res.json()
                this.items = Array.isArray(data.results) ? data.results : []
                this.loaded = true
            } catch (e) {
                this.error = e.message
            } finally {
                this.loading = false
            }
        },

        async addRule({ enterprise_id, enterprise_name, gross_mode, net_mode, description }) {
            this.error = null
            const res = await fetch(`${API_URL}/admin/enterprise-value-rules`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ enterprise_id, enterprise_name, gross_mode, net_mode, description })
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) {
                this.error = body?.error || `Erro ${res.status}`
                throw new Error(this.error)
            }
            const idx = this.items.findIndex(i => Number(i.enterprise_id) === Number(body.enterprise_id))
            if (idx >= 0) this.items.splice(idx, 1, body)
            else this.items.push(body)
            return body
        },

        async removeRule(id) {
            this.error = null
            const res = await fetch(`${API_URL}/admin/enterprise-value-rules/${id}`, {
                method: 'DELETE',
                headers: authHeaders()
            })
            if (!res.ok) {
                this.error = `Erro ${res.status}`
                throw new Error(this.error)
            }
            this.items = this.items.filter(i => i.id !== id)
        }
    }
})
