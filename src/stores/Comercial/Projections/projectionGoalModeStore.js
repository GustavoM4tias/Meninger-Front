// stores/Comercial/Projections/projectionGoalModeStore.js
//
// Modo de meta (unidades × VGV) do Vendas X Projeção.
// REGRA GLOBAL: mora no banco (GET/PUT /api/projections/goal-mode). Todo mundo
// lê a mesma coisa; só admin grava. Antes era localStorage por navegador, então
// o que o admin escolhia não valia para mais ninguém.
import { defineStore } from 'pinia'
import { ref } from 'vue'
import API_URL from '@/config/apiUrl'

const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
})

export const useProjectionGoalModeStore = defineStore('projectionGoalMode', () => {
    const globalMode = ref('units')          // 'units' | 'vgv'
    const enterpriseOverrides = ref({})      // { [erp_id_str]: 'units' | 'vgv' }
    const loading = ref(false)
    const saving = ref(false)
    const error = ref(null)
    let _loaded = false

    function _apply(data) {
        globalMode.value = data?.globalMode === 'vgv' ? 'vgv' : 'units'
        enterpriseOverrides.value = (data && typeof data.enterpriseOverrides === 'object' && data.enterpriseOverrides)
            ? { ...data.enterpriseOverrides }
            : {}
    }

    async function load({ force = false } = {}) {
        if (_loaded && !force) return
        loading.value = true
        error.value = null
        try {
            const res = await fetch(`${API_URL}/projections/goal-mode`, { headers: authHeaders() })
            if (!res.ok) throw new Error(`Erro ${res.status}`)
            _apply(await res.json())
            _loaded = true
        } catch (e) {
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    // Grava o estado inteiro (só admin passa no servidor). Otimista: aplica na
    // tela e desfaz se o servidor recusar.
    async function _persist(next) {
        const before = { globalMode: globalMode.value, enterpriseOverrides: { ...enterpriseOverrides.value } }
        _apply({ ...before, ...next })
        saving.value = true
        error.value = null
        try {
            const res = await fetch(`${API_URL}/projections/goal-mode`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({
                    globalMode: globalMode.value,
                    enterpriseOverrides: enterpriseOverrides.value,
                }),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body?.error || `Erro ${res.status}`)
            }
            _apply(await res.json())
        } catch (e) {
            _apply(before)
            error.value = e.message
            throw e
        } finally {
            saving.value = false
        }
    }

    function setGlobalMode(mode) {
        return _persist({ globalMode: mode === 'vgv' ? 'vgv' : 'units' })
    }

    /** Passe mode = null para remover a exceção e voltar ao modo global. */
    function setEnterpriseMode(enterpriseId, mode) {
        const next = { ...enterpriseOverrides.value }
        if (mode === null || mode === undefined) {
            delete next[String(enterpriseId)]
        } else {
            next[String(enterpriseId)] = mode === 'vgv' ? 'vgv' : 'units'
        }
        return _persist({ enterpriseOverrides: next })
    }

    /** Modo efetivo do empreendimento (exceção ou global). */
    function modeForEnterprise(enterpriseId) {
        const key = String(enterpriseId ?? '')
        return enterpriseOverrides.value[key] ?? globalMode.value
    }

    return {
        globalMode,
        enterpriseOverrides,
        loading,
        saving,
        error,
        load,
        setGlobalMode,
        setEnterpriseMode,
        modeForEnterprise,
    }
})
