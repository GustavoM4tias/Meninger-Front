// src/stores/Sienge/backupStore.js
import { defineStore } from 'pinia'
import { useCarregamentoStore } from '@/stores/Config/carregamento'
import API_URL from '@/config/apiUrl'

function authHeaders() {
    return {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
    }
}

export const useSiengeBackupStore = defineStore('siengeBackup', {
    state: () => ({
        items: [],
        loading: false,
        error: null,
        triggering: false,
    }),

    getters: {
        runningBackup: (state) => state.items.find((i) => i.status === 'running') || null,
        latestSuccess: (state) => state.items.find((i) => i.status === 'success') || null,
        hasError: (state) => !!state.error,
    },

    actions: {
        setError(message) { this.error = message },

        async fetchBackups({ limit = 30, withSpinner = false } = {}) {
            const carregamento = useCarregamentoStore()
            this.error = null
            this.loading = true
            try {
                if (withSpinner) carregamento.iniciarCarregamento()
                const res = await fetch(`${API_URL}/sienge/backups?limit=${limit}`, {
                    headers: authHeaders(),
                })
                if (!res.ok) throw new Error('Erro ao buscar logs de backup')
                const data = await res.json()
                this.items = Array.isArray(data.items) ? data.items : []
            } catch (err) {
                this.error = err.message
            } finally {
                this.loading = false
                if (withSpinner) carregamento.finalizarCarregamento()
            }
        },

        /** Roda o pipeline completo: baixa Sienge → descomprime → pg_restore */
        async triggerFullBackup() {
            this.error = null
            this.triggering = true
            try {
                const res = await fetch(`${API_URL}/sienge/backups/trigger`, {
                    method: 'POST',
                    headers: authHeaders(),
                })
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body.error || 'Erro ao iniciar backup')
                }
                return await res.json()
            } catch (err) {
                this.error = err.message
                throw err
            } finally {
                this.triggering = false
            }
        },
    },
})
