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

        async addItem({ enterprise_id, enterprise_name }) {
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/hidden-enterprises`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ enterprise_id, enterprise_name })
                })
                if (!res.ok) throw new Error(`Erro ${res.status}`)
                const item = await res.json()
                if (!this.items.find(i => i.enterprise_id === item.enterprise_id)) {
                    this.items.push(item)
                }
            } catch (e) {
                this.error = e.message
                throw e
            }
        },

        async removeItem(id) {
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/hidden-enterprises/${id}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!res.ok) throw new Error(`Erro ${res.status}`)
                this.items = this.items.filter(i => i.id !== id)
            } catch (e) {
                this.error = e.message
                throw e
            }
        }
    }
})
