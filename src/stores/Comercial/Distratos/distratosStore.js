import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import API_URL from '@/config/apiUrl'
import { requestWithAuth } from '@/utils/Auth/requestWithAuth'
import dayjs from 'dayjs'

export const useDistratosStore = defineStore('distratos', () => {

    // ── State ────────────────────────────────────────────────────────────────
    const distratos   = ref([])
    const enterprises = ref([])
    const loading     = ref(false)
    const error       = ref(null)

    // Filtros (espelho do DashboardFilters do Faturamento)
    const filters = ref({
        startDate:      dayjs().startOf('year').format('YYYY-MM-DD'),
        endDate:        dayjs().format('YYYY-MM-DD'),
        enterpriseName: [],  // array of strings (nomes), igual ao faturamento
    })

    // ── Fetch enterprises (mesmo endpoint do faturamento) ────────────────────
    async function fetchEnterprises() {
        try {
            const data = await requestWithAuth(`${API_URL}/sienge/contracts/enterprises`)
            enterprises.value = data?.results ?? (Array.isArray(data) ? data : [])
        } catch (e) {
            console.warn('[distratosStore] fetchEnterprises:', e)
        }
    }

    // ── Fetch distratos — novo endpoint dedicado ──────────────────────────────
    async function fetchDistratos() {
        loading.value = true
        error.value   = null
        try {
            const q = new URLSearchParams()
            if (filters.value.startDate)           q.set('startDate', filters.value.startDate)
            if (filters.value.endDate)             q.set('endDate',   filters.value.endDate)
            if (filters.value.enterpriseName.length > 0) {
                // mesma estratégia do contractsStore: manda como lista CSV
                q.set('enterpriseName', filters.value.enterpriseName.join(','))
            }

            const data = await requestWithAuth(`${API_URL}/sienge/distratos?${q.toString()}`)
            distratos.value = data?.results ?? (Array.isArray(data) ? data : [])
        } catch (e) {
            error.value = e?.message || 'Erro ao carregar distratos.'
        } finally {
            loading.value = false
        }
    }

    function setFilters(f) {
        filters.value = { ...filters.value, ...f }
    }

    function clearFilters() {
        filters.value = {
            startDate:      dayjs().startOf('year').format('YYYY-MM-DD'),
            endDate:        dayjs().format('YYYY-MM-DD'),
            enterpriseName: [],
        }
    }

    // ── Analytics computeds ───────────────────────────────────────────────────

    /** Tendência por mês usando effective_date (cancellation_date → financial_institution_date → contract_date) */
    const byMonth = computed(() => {
        const m = new Map()
        for (const d of distratos.value) {
            const raw = d.cancellation_date || d.effective_date || d.contract_date
            if (!raw) continue
            const key  = String(raw).slice(0, 7)   // YYYY-MM
            const prev = m.get(key) || { count: 0, amount: 0 }
            prev.count++
            prev.amount += Number(d.total_cancellation_amount) || 0
            m.set(key, prev)
        }
        const keys = [...m.keys()].sort()
        const ptMonths = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
        return {
            keys,
            labels:  keys.map(k => {
                const [y, mo] = k.split('-')
                return `${ptMonths[+mo - 1]}/${y}`
            }),
            counts:  keys.map(k => m.get(k).count),
            amounts: keys.map(k => +(m.get(k).amount).toFixed(2)),
        }
    })

    /** Agrupado por empreendimento */
    const byEnterprise = computed(() => {
        const m = new Map()
        for (const d of distratos.value) {
            const name = d.enterprise_name?.trim() || 'Sem Empreendimento'
            const prev = m.get(name) || { count: 0, amount: 0, originalTotal: 0 }
            prev.count++
            prev.amount        += Number(d.total_cancellation_amount) || 0
            prev.originalTotal += Number(d.total_selling_value) || Number(d.contract_value) || 0
            m.set(name, prev)
        }
        return [...m.entries()]
            .map(([name, d]) => ({
                name,
                count:         d.count,
                amount:        +(d.amount).toFixed(2),
                avgAmount:     d.count ? +(d.amount / d.count).toFixed(2) : 0,
                originalTotal: +(d.originalTotal).toFixed(2),
            }))
            .sort((a, b) => b.count - a.count)
    })

    /** Agrupado por motivo */
    const byReason = computed(() => {
        const m = new Map()
        for (const d of distratos.value) {
            const r = d.cancellation_reason?.trim() || 'Motivo não informado'
            m.set(r, (m.get(r) || 0) + 1)
        }
        return [...m.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
    })

    /** KPIs */
    const kpis = computed(() => {
        const total       = distratos.value.length
        const totalAmount = distratos.value.reduce((s, d) => s + (Number(d.total_cancellation_amount) || 0), 0)
        const totalOriginal = distratos.value.reduce((s, d) => s + (Number(d.total_selling_value) || Number(d.contract_value) || 0), 0)
        const avgAmount   = total ? totalAmount / total : 0
        const topEnt      = byEnterprise.value[0] || null
        const entCount    = byEnterprise.value.length || 1
        const avgPerEnt   = total / entCount
        const alerts      = byEnterprise.value.filter(e => e.count > avgPerEnt * 1.5 && e.count >= 3)
        const topReason   = byReason.value[0] || null
        return { total, totalAmount, totalOriginal, avgAmount, topEnt, alerts, alertCount: alerts.length, topReason }
    })

    /** Linhas da tabela, enriquecidas com campos do endpoint de distratos */
    const tableRows = computed(() =>
        distratos.value.map(d => {
            // effective_date já vem do backend como COALESCE(cancellation_date, financial_institution_date, contract_date)
            const effectiveDate = d.cancellation_date || d.effective_date || null
            return {
                id:                      d.contract_id || d.id,
                number:                  d.number,
                enterprise:              d.enterprise_name || '—',
                customer:                d.customer_name   || '—',
                unit:                    d.unit_name       || '—',
                financialInstitutionDate: d.financial_institution_date || null,
                cancelDate:              effectiveDate,
                hasCancelDate:           !!d.cancellation_date,
                contractDate:            d.contract_date || null,
                reason:                  d.cancellation_reason?.trim() || 'Não informado',
                originalValue:           Number(d.total_selling_value) || Number(d.contract_value) || 0,
                cancelAmount:            Number(d.total_cancellation_amount) || 0,
            }
        }).sort((a, b) => {
            if (!a.cancelDate && !b.cancelDate) return 0
            if (!a.cancelDate) return 1
            if (!b.cancelDate) return -1
            return b.cancelDate.localeCompare(a.cancelDate)
        })
    )

    return {
        distratos, enterprises, loading, error, filters,
        byMonth, byEnterprise, byReason, kpis, tableRows,
        fetchDistratos, fetchEnterprises, setFilters, clearFilters,
    }
})
