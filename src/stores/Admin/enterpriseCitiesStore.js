import { defineStore } from 'pinia'
import { ref } from 'vue'
import API_URL from '@/config/apiUrl'
import { useCarregamentoStore } from '@/stores/Config/carregamento';

function authHeaders() {
    const token = localStorage.getItem('token')
    return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' }
}
export const useEnterpriseCitiesStore = defineStore('enterpriseCities', () => {
    // state
    const items = ref([])
    const total = ref(0)
    const page = ref(1)
    const pageSize = ref(50)
    const loading = ref(false)
    const error = ref(null)
    const logs = ref([]) // logs do sync ERP quando verbose
    const carregamentoStore = useCarregamentoStore();


    // filtros da grid
    const filtros = ref({ q: '', source: '', hasOverride: '' })

    const showRaw = ref(true) // controla se traz raw_payload

    async function fetchList({ resetPage = false } = {}) {
        try {
            carregamentoStore.iniciarCarregamento();
            loading.value = true
            error.value = null
            if (resetPage) page.value = 1


            const params = new URLSearchParams()
            if (filtros.value.q?.trim()) params.append('q', filtros.value.q.trim())
            if (filtros.value.source) params.append('source', filtros.value.source)
            if (filtros.value.hasOverride !== '') params.append('hasOverride', String(filtros.value.hasOverride))
            params.append('page', String(page.value))
            params.append('pageSize', String(pageSize.value))
            if (showRaw.value) params.append('includeRaw', 'true')

            const url = `${API_URL}/admin/enterprise-cities?${params.toString()}`
            const resp = await fetch(url, { headers: authHeaders() })
            const data = await resp.json()
            if (!resp.ok) throw new Error(data?.error || 'Falha ao carregar lista')


            items.value = data.items || []
            total.value = data.total || 0 
        } catch (e) {
            error.value = e.message
            carregamentoStore.finalizarCarregamento();
        } finally {
            loading.value = false
            carregamentoStore.finalizarCarregamento();
        }
    }


    async function setOverride(id, city) {
        const url = `${API_URL}/admin/enterprise-cities/${id}/override`
        const resp = await fetch(url, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ city_override: city })
        })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data?.error || 'Falha ao salvar override')
        // atualiza item na lista
        const idx = items.value.findIndex(x => x.id === id)
        if (idx >= 0) {
            items.value[idx] = {
                ...items.value[idx],
                city_override: data.city_override,
                effective_city: data.effective_city,
            }
        }
        return data
    }


    // syncs --------------------------
    async function syncCRM() {
        const url = `${API_URL}/admin/enterprise-cities/sync/crm`
        const resp = await fetch(url, { method: 'POST', headers: authHeaders() })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data?.error || 'Falha ao sincronizar CRM')
        return data
    }


    /**
    * sync ERP (Sienge) com parâmetros opcionais
    * opts = { limit?: number, maxCount?: number, verbose?: boolean }
    */
    async function syncERP(opts = {}) {
        const p = new URLSearchParams()
        if (opts.limit) p.append('limit', String(opts.limit))
        if (opts.maxCount) p.append('maxCount', String(opts.maxCount))
        if (opts.verbose) p.append('log', 'verbose')


        const url = `${API_URL}/admin/enterprise-cities/sync/erp${p.size ? `?${p.toString()}` : ''}`
        const resp = await fetch(url, { method: 'POST', headers: authHeaders() })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data?.error || 'Falha ao sincronizar ERP')


        // se verbose, guarda logs para exibir na UI
        logs.value = Array.isArray(data.logs) ? data.logs : []
        return data
    }


    function clearLogs() { logs.value = [] }


    return {
        // state
        items, total, page, pageSize, loading, error, filtros, logs, showRaw,
        // actions
        fetchList, setOverride, syncCRM, syncERP, clearLogs
    }
})