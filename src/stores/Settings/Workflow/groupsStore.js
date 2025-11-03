import { defineStore } from 'pinia'
import API_URL from '@/config/apiUrl'
import { useCarregamentoStore } from '@/stores/Config/carregamento';

export const useWorkflowGroupsStore = defineStore('workflowGroups', {
    state: () => ({
        grupos: [],
        workflow: [],
        tipo: 'reservas', 
        segmentos: [],         // opções vindas de cv_enterprises.segmento_nome
        error: null
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
            const carregamentoStore = useCarregamentoStore();
            carregamentoStore.iniciarCarregamento();
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
                carregamentoStore.finalizarCarregamento();
                console.error(e)
            } finally {
                carregamentoStore.finalizarCarregamento();
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
            if (!res.ok) throw new Error(`Erro ao salvar: ${res.status}`)
            const data = await res.json()
            // refresh rápido
            await this.fetchGrupos(this.tipo)
            return data
        },

        async deleteGrupo(idgroup) {
            const res = await fetch(`${API_URL}/cv/workflow-grupos/${idgroup}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (!res.ok) throw new Error(`Erro ao excluir grupo (${res.status})`)
            await this.fetchGrupos(this.tipo)
        },

        // --- NOVO: carrega opções distintas de segmento a partir do backend ---
        async fetchSegmentos() {
            const res = await fetch(`${API_URL}/cv/workflow-grupos/segments`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (!res.ok) throw new Error('Falha ao carregar segmentos')
            const data = await res.json()
            const items = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : [])
            this.segmentos = items
                .map(s => (typeof s === 'string' ? s : s?.segmento_nome || s?.name || ''))
                .map(s => s?.trim())
                .filter(Boolean)
                .sort((a, b) => a.localeCompare(b))
        }
    }
})
