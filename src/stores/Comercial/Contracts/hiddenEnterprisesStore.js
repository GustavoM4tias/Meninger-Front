// stores/hiddenEnterprisesStore.js
import { defineStore } from 'pinia'
import API_URL from '@/config/apiUrl'

export const useHiddenEnterprisesStore = defineStore('hiddenEnterprises', {
    state: () => ({
        items: [],       // [{ id, enterprise_id, enterprise_name }]
        loading: false,
        error: null
    }),

    getters: {
        hiddenIds: (state) => new Set(state.items.map(i => Number(i.enterprise_id)))
    },

    actions: {
        async fetchAll() {
            this.loading = true
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/hidden-enterprises`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!res.ok) throw new Error(`Erro ${res.status}`)
                const data = await res.json()
                this.items = Array.isArray(data.results) ? data.results : []
            } catch (e) {
                this.error = e.message
            } finally {
                this.loading = false
            }
        },

        // Lote numa request só — ocultar uma empresa expande em dezenas de CCs
        // e uma request por CC deixava a operação lenta.
        async addItems(items) {
            this.error = null
            const list = (items || []).filter(i => i?.enterprise_id != null)
            if (!list.length) return
            try {
                const res = await fetch(`${API_URL}/admin/hidden-enterprises`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ items: list })
                })
                if (!res.ok) throw new Error(`Erro ${res.status}`)
                const data = await res.json()
                for (const item of (data.results || [])) {
                    if (!this.items.find(i => i.enterprise_id === item.enterprise_id)) {
                        this.items.push(item)
                    }
                }
            } catch (e) {
                this.error = e.message
                throw e
            }
        },

        async addItem({ enterprise_id, enterprise_name }) {
            return this.addItems([{ enterprise_id, enterprise_name }])
        },

        async removeItems(ids) {
            this.error = null
            const list = (ids || []).map(Number).filter(Number.isFinite)
            if (!list.length) return
            try {
                const res = await fetch(`${API_URL}/admin/hidden-enterprises/restore`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ ids: list })
                })
                if (!res.ok) throw new Error(`Erro ${res.status}`)
                const removed = new Set(list)
                this.items = this.items.filter(i => !removed.has(Number(i.id)))
            } catch (e) {
                this.error = e.message
                throw e
            }
        },

        async removeItem(id) {
            return this.removeItems([id])
        }
    }
})
