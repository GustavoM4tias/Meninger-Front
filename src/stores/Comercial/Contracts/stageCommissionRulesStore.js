// stores/Comercial/Contracts/stageCommissionRulesStore.js
import { defineStore } from 'pinia'
import API_URL from '@/config/apiUrl'

export const useStageCommissionRulesStore = defineStore('stageCommissionRules', {
    state: () => ({
        rules: [],   // [{ id, enterprise_id, enterprise_name, stage_id, stage_name, commission_pct, description }]
        loading: false,
        error: null
    }),

    getters: {
        // Returns a Map<enterprise_id, rule[]> for fast lookup
        rulesByEnterprise: (state) => {
            const map = new Map()
            for (const r of state.rules) {
                const eid = Number(r.enterprise_id)
                if (!map.has(eid)) map.set(eid, [])
                map.get(eid).push(r)
            }
            return map
        }
    },

    actions: {
        async fetchAll() {
            this.loading = true
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/stage-commission-rules`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!res.ok) throw new Error(`Erro ${res.status}`)
                const data = await res.json()
                this.rules = Array.isArray(data.results) ? data.results : []
            } catch (e) {
                this.error = e.message
            } finally {
                this.loading = false
            }
        },

        async addRule({ enterprise_id, enterprise_name, stage_id, stage_name, commission_pct, description }) {
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/stage-commission-rules`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ enterprise_id, enterprise_name, stage_id, stage_name, commission_pct, description })
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err.error || `Erro ${res.status}`)
                }
                const item = await res.json()
                const idx = this.rules.findIndex(r => r.id === item.id)
                if (idx >= 0) this.rules[idx] = item
                else this.rules.push(item)
            } catch (e) {
                this.error = e.message
                throw e
            }
        },

        async removeRule(id) {
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/stage-commission-rules/${id}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!res.ok) throw new Error(`Erro ${res.status}`)
                this.rules = this.rules.filter(r => r.id !== id)
            } catch (e) {
                this.error = e.message
                throw e
            }
        }
    }
})
