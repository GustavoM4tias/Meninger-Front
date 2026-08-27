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
        // Vira true depois da 1ª resposta. A tela só desenha status/KPIs/histórico
        // depois disso, pra não piscar valores vazios antes do dado chegar.
        loaded: false,
        error: null,
        triggering: false,

        // Idade do espelho: de quando é o dado que as telas de Custos/Títulos,
        // Recebimentos do Ato, Inadimplência e Stand de Vendas estão mostrando.
        freshness: null,
        freshnessLoading: false,

        // Regra de operação da carga (tabela sienge_backup_settings).
        settings: null,
        settingsLoading: false,
        settingsSaving: false,
    }),

    getters: {
        runningBackup: (state) => state.items.find((i) => i.status === 'running') || null,
        latestSuccess: (state) => state.items.find((i) => i.status === 'success') || null,
        hasError: (state) => !!state.error,
        // Rodada dispensada pela trava: não é falha, é a segunda instância
        // sendo barrada antes de estragar a rodada de quem está com a trava.
        skippedRuns: (state) => state.items.filter((i) => i.status === 'skipped'),
    },

    actions: {
        setError(message) { this.error = message },

        /**
         * Busca as execuções de um período (padrão da tela: mês corrente).
         * `from`/`to` são instantes ISO no fuso do usuário; sem eles o backend
         * cai no limite padrão de 30 registros.
         */
        async fetchBackups({ from = null, to = null, withSpinner = false } = {}) {
            const carregamento = useCarregamentoStore()
            this.error = null
            this.loading = true
            try {
                if (withSpinner) carregamento.iniciarCarregamento()
                const qs = new URLSearchParams()
                if (from) qs.set('from', from)
                if (to) qs.set('to', to)
                const res = await fetch(`${API_URL}/sienge/backups?${qs.toString()}`, {
                    headers: authHeaders(),
                })
                if (!res.ok) throw new Error('Erro ao buscar logs de backup')
                const data = await res.json()
                this.items = Array.isArray(data.items) ? data.items : []
            } catch (err) {
                this.error = err.message
            } finally {
                this.loading = false
                this.loaded = true
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

        /**
         * Marca um backup zumbi (status=running mas processo morto, ex: após
         * deploy do Railway) como failed. Não mata processo nenhum — só
         * libera o estado pra UI permitir novo trigger.
         */
        async cancelBackup(id) {
            this.error = null
            try {
                const res = await fetch(`${API_URL}/sienge/backups/${id}/cancel`, {
                    method: 'POST',
                    headers: authHeaders(),
                })
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body.error || 'Erro ao cancelar backup')
                }
                return await res.json()
            } catch (err) {
                this.error = err.message
                throw err
            }
        },

        /**
         * Idade do espelho. `force` pula o cache de 5 min do servidor — use no
         * fim de uma carga, quando o dado acabou de mudar.
         */
        async fetchFreshness({ force = false } = {}) {
            this.freshnessLoading = true
            try {
                const qs = force ? '?force=true' : ''
                const res = await fetch(`${API_URL}/sienge/backups/freshness${qs}`, {
                    headers: authHeaders(),
                })
                if (!res.ok) throw new Error('Erro ao ler a data do espelho')
                this.freshness = await res.json()
                return this.freshness
            } catch (err) {
                this.error = err.message
                return null
            } finally {
                this.freshnessLoading = false
            }
        },

        async fetchSettings() {
            this.settingsLoading = true
            try {
                const res = await fetch(`${API_URL}/sienge/backups/settings`, {
                    headers: authHeaders(),
                })
                if (!res.ok) throw new Error('Erro ao buscar a configuração da carga')
                this.settings = await res.json()
                return this.settings
            } catch (err) {
                this.error = err.message
                return null
            } finally {
                this.settingsLoading = false
            }
        },

        async saveSettings(patch) {
            this.error = null
            this.settingsSaving = true
            try {
                const res = await fetch(`${API_URL}/sienge/backups/settings`, {
                    method: 'PUT',
                    headers: authHeaders(),
                    body: JSON.stringify(patch),
                })
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}))
                    throw new Error(body.error || 'Erro ao salvar a configuração')
                }
                this.settings = await res.json()
                return this.settings
            } catch (err) {
                this.error = err.message
                throw err
            } finally {
                this.settingsSaving = false
            }
        },
    },
})
