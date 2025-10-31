import { defineStore } from 'pinia'
import API_URL from '@/config/apiUrl'

export const useWorkflowGroupsStore = defineStore('workflowGroups', {
    state: () => ({
        grupos: [],
        workflow: [],
        tipo: 'reservas',
        loading: false,
        error: null,
    }),

    actions: {
        async fetchWorkflow(tipo = this.tipo) {
            try {
                const res = await fetch(`${API_URL}/cv/${tipo === 'repasses' ? 'repasse-workflow' : 'reserva-workflow'}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!res.ok) throw new Error(`Erro ao carregar workflow (${res.status})`)
                const data = await res.json()
                this.workflow = Array.isArray(data.situacoes) ? data.situacoes : data.situacoes ?? []
            } catch (e) {
                console.error('Erro ao buscar workflow:', e)
                this.workflow = []
            }
        },

        async fetchGrupos(tipo = this.tipo) {
            this.loading = true
            this.error = null
            try {
                const res = await fetch(`${API_URL}/cv/workflow-grupos?tipo=${tipo}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!res.ok) throw new Error(`Erro ao carregar grupos (${res.status})`)
                const data = await res.json()
                this.grupos = Array.isArray(data) ? data : []
                this.tipo = tipo
            } catch (e) {
                this.error = e.message
                console.error(e)
            } finally {
                this.loading = false
            }
        },

        async saveGrupo(payload) {
            const res = await fetch(`${API_URL}/cv/workflow-grupos`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            if (!res.ok) throw new Error(`Erro ao salvar grupo (${res.status})`)
            await this.fetchGrupos(this.tipo)
        },

        async deleteGrupo(idgroup) {
            const res = await fetch(`${API_URL}/cv/workflow-grupos/${idgroup}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (!res.ok) throw new Error(`Erro ao excluir grupo (${res.status})`)
            await this.fetchGrupos(this.tipo)
        }
    }
})
