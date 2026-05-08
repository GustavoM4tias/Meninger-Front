// stores/trSatelliteStore.js
//
// Configuração de "satélites de TR": empreendimentos cujos contratos de TR são
// emitidos sob um enterprise_id distinto dos contratos de incorporação para o
// mesmo cliente+unidade. A regra reescreve enterprise_id/name dos contratos do
// satélite para o partner correspondente (match por customer + unit_name).
import { defineStore } from 'pinia'
import API_URL from '@/config/apiUrl'

export const useTrSatelliteStore = defineStore('trSatellite', {
    state: () => ({
        items: [], // [{ id, satellite_enterprise_id, satellite_enterprise_name, partner_enterprise_ids[], description }]
        loading: false,
        error: null
    }),

    getters: {
        // satellite_id -> Set(partner_id)
        partnerIdsBySatellite: (state) => {
            const map = new Map()
            for (const it of state.items) {
                const sid = Number(it.satellite_enterprise_id)
                if (!Number.isFinite(sid)) continue
                const partners = Array.isArray(it.partner_enterprise_ids)
                    ? it.partner_enterprise_ids.map(Number).filter(Number.isFinite)
                    : []
                if (!partners.length) continue
                map.set(sid, new Set(partners))
            }
            return map
        },
        satelliteIds: (state) => new Set(
            state.items.map(i => Number(i.satellite_enterprise_id)).filter(Number.isFinite)
        )
    },

    actions: {
        _headers() {
            return {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        },

        async fetchAll() {
            this.loading = true
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/tr-satellite-enterprises`, { headers: this._headers() })
                if (!res.ok) throw new Error(`Erro ${res.status}`)
                const data = await res.json()
                this.items = Array.isArray(data.results) ? data.results : []
            } catch (e) {
                this.error = e.message
            } finally {
                this.loading = false
            }
        },

        async addItem({ satellite_enterprise_id, satellite_enterprise_name, partner_enterprise_ids, description }) {
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/tr-satellite-enterprises`, {
                    method: 'POST',
                    headers: this._headers(),
                    body: JSON.stringify({
                        satellite_enterprise_id,
                        satellite_enterprise_name: satellite_enterprise_name || null,
                        partner_enterprise_ids: Array.isArray(partner_enterprise_ids) ? partner_enterprise_ids : [],
                        description: description || null
                    })
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err.error || `Erro ${res.status}`)
                }
                const item = await res.json()
                const idx = this.items.findIndex(i => Number(i.satellite_enterprise_id) === Number(item.satellite_enterprise_id))
                if (idx >= 0) this.items.splice(idx, 1, item)
                else this.items.push(item)
            } catch (e) {
                this.error = e.message
                throw e
            }
        },

        async updateItem(id, { satellite_enterprise_name, partner_enterprise_ids, description }) {
            this.error = null
            try {
                const body = {}
                if (satellite_enterprise_name !== undefined) body.satellite_enterprise_name = satellite_enterprise_name
                if (partner_enterprise_ids !== undefined) body.partner_enterprise_ids = partner_enterprise_ids
                if (description !== undefined) body.description = description

                const res = await fetch(`${API_URL}/admin/tr-satellite-enterprises/${id}`, {
                    method: 'PUT',
                    headers: this._headers(),
                    body: JSON.stringify(body)
                })
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}))
                    throw new Error(err.error || `Erro ${res.status}`)
                }
                const item = await res.json()
                const idx = this.items.findIndex(i => i.id === item.id)
                if (idx >= 0) this.items.splice(idx, 1, item)
            } catch (e) {
                this.error = e.message
                throw e
            }
        },

        async removeItem(id) {
            this.error = null
            try {
                const res = await fetch(`${API_URL}/admin/tr-satellite-enterprises/${id}`, {
                    method: 'DELETE',
                    headers: this._headers()
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
