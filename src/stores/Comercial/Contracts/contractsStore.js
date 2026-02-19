// stores/contractsStore.js
import { defineStore } from 'pinia'
import { useCarregamentoStore } from '@/stores/Config/carregamento'
import API_URL from '@/config/apiUrl'

const DEBUG = true
const DEBUG_PROJECTIONS = true // <- liga/desliga só projeções
const log = (...a) => { if (DEBUG) console.log('[contractsStore]', ...a) }
const logProj = (...a) => { if (DEBUG && DEBUG_PROJECTIONS) console.log('[contractsStore][PROJ]', ...a) }

// evita log gigante travar o console
const preview = (obj, max = 2500) => {
    try {
        const s = JSON.stringify(obj, null, 2)
        return s.length > max ? s.slice(0, max) + ' ...[truncated]' : s
    } catch {
        return obj
    }
}
export const useContractsStore = defineStore('contracts', {
    state: () => ({
        contracts: [],
        enterprises: [],
        groupBy: 'company', // 'enterprise' | 'company'
        total: 0,
        error: null,

        valueMode: 'net',
        filters: {
            startDate: '',
            endDate: '',
            situation: 'Emitido',
            enterpriseName: []
        },

        workflowGroups: [],
        selectedGroupIds: [],
        _projCache: new Map(),

        enterpriseCities: [],

        // cache por request (dashboard/detail)
        _contractsCache: new Map(), // key -> { ts, contracts, total }
        _cacheTTLms: 1000 * 60 * 5,
        _lastDashboardKey: null,

        // cache DETAIL por empreendimento
        _detailByEnterprise: new Map(), // ctxKey -> Map(enterpriseId -> { ts, contracts: [] })
        _detailTTLms: 1000 * 60 * 10
    }),

    getters: {
        // ==========================
        // Regras (mantidas)
        // ==========================
        enterpriseOverrides: () => ({
            byId: {
                17004: { gross: 'LAND_VALUE_ONLY', net: 'LAND_VALUE_ONLY' }
            },
            byName: {
                'JACAREZINHO/PR - RESIDENCIAL PARQUE DOS IPÊS - COMERCIAL/INCORPORAÇÃO/ESTOQUE': {
                    gross: 'LAND_VALUE_ONLY',
                    net: 'LAND_VALUE_ONLY'
                }
            }
        }),

        enterpriseCommissionRules: () => ({
            byId: {
                // 97001: { commission_pct: 0.04 },
                80001: { commission_pct: 0.04 }
            }
        }),

        enterpriseRuleFor() {
            return (c) => {
                if (c?._projection) return null
                const ov = this.enterpriseOverrides || {}
                const byId = ov.byId || {}
                const byName = ov.byName || {}
                const norm = (s) => (s || '').trim().toUpperCase()
                return byId[c?.enterprise_id] || byName[norm(c?.enterprise_name)] || null
            }
        },

        enterpriseCommissionFor() {
            return (c) => {
                if (c?._projection) return null
                const rules = this.enterpriseCommissionRules || {}
                const byId = rules.byId || {}
                const byName = rules.byName || {}
                const norm = (s) => (s || '').trim().toUpperCase()
                return byId[c?.enterprise_id] || byName[norm(c?.enterprise_name)] || null
            }
        },

        isLandOnlyForContract() {
            return (c) => {
                const rule = this.enterpriseRuleFor(c)
                if (!rule) return false
                return (
                    (this.isGross && rule.gross === 'LAND_VALUE_ONLY') ||
                    (this.isNet && rule.net === 'LAND_VALUE_ONLY')
                )
            }
        },

        // ==========================
        // Value mode
        // ==========================
        valueModeLabel: (state) => (state.valueMode === 'net' ? 'VGV' : 'VGV + DC'),
        isGross: (state) => state.valueMode === 'gross',
        isNet: (state) => state.valueMode === 'net',

        valuePicker: (state) => (obj) =>
            (state.valueMode === 'net' ? obj?.total_value_net : obj?.total_value_gross) ?? 0,

        // ==========================
        // Compat: totals / totalSales (faltavam no seu consumo)
        // ==========================
        totalSales() {
            // total de vendas (inclui vendas com contratos reais; projeções puras não contam como venda real)
            return this.uniqueSales.length
        },

        totalValueNet() {
            return this.uniqueSales.reduce((sum, s) => sum + (Number(s.total_value_net) || 0), 0)
        },

        totalValueGross() {
            return this.uniqueSales.reduce((sum, s) => sum + (Number(s.total_value_gross) || 0), 0)
        },

        // ==========================
        // Totais por contrato (VGV / VGV+DC)
        // ==========================
        discountCodes: () => new Set(['DC', 'DESCONTO_CONSTRUTORA']),

        _contractTotals() {
            return (contract) => {
                const isDiscount = (pc) =>
                    this.discountCodes.has(String(pc.condition_type_id || '').toUpperCase())
                const pcs = Array.isArray(contract.payment_conditions) ? contract.payment_conditions : []

                let full = 0
                let dcSumAbs = 0

                for (const pc of pcs) {
                    const v = Number(pc.total_value) || 0
                    if (isDiscount(pc)) dcSumAbs += Math.abs(v)
                    else full += v
                }

                const net = full
                const gross = full + dcSumAbs
                return { net, gross }
            }
        },

        // ==========================
        // Chave única de venda (corrigida: não pode ser só cliente+unidade)
        // ==========================
        _makeSaleKey() {
            return (c) => {
                const cust = c.customer_id ?? 'NULL'
                const unitId = (c.unit_id != null && c.unit_id !== '') ? String(c.unit_id) : 'NULL'
                const unitName = (c.unit_name || '').trim().toUpperCase() || 'NULL'
                const ent = (c.enterprise_id != null && c.enterprise_id !== '') ? String(c.enterprise_id) : 'NULL'
                // company entra como “refino” no modo company (evita colidir unidades iguais em empresas diferentes)
                const comp = (c.company_id != null && c.company_id !== '') ? String(c.company_id) : 'NULL'
                return `${cust}__${ent}__${comp}__${unitId}__${unitName}`
            }
        },

        // ==========================
        // Agrupamento em vendas (uniqueSales)
        // ==========================
        uniqueSales() {
            const salesMap = new Map()
            const makeKey = this._makeSaleKey
            const totalsOf = this._contractTotals

            const cloneContract = (c) => ({
                ...c,
                payment_conditions: Array.isArray(c.payment_conditions) ? [...c.payment_conditions] : []
            })

            // 1) agrupar por cliente+unidade(+enterprise/+company)
            this.contracts.forEach((contract) => {
                const key = makeKey(contract)
                if (!salesMap.has(key)) {
                    salesMap.set(key, {
                        customer_id: contract.customer_id,
                        customer_name: contract.customer_name,
                        unit_name: contract.unit_name,
                        unit_id: contract.unit_id,
                        enterprise_name: contract.enterprise_name,
                        enterprise_id: contract.enterprise_id,
                        company_id: contract.company_id,
                        company_name: contract.company_name,
                        financial_institution_date: contract.financial_institution_date,
                        contracts: [cloneContract(contract)],
                        total_value_net: 0,
                        total_value_gross: 0
                    })
                } else {
                    salesMap.get(key).contracts.push(cloneContract(contract))
                }
            })

            // 1.5 TR sintética + escolher contrato principal
            salesMap.forEach((sale) => {
                const realContracts = (sale.contracts || []).filter((c) => !c._projection)
                if (realContracts.length === 0) return

                const groupHasTRReal = realContracts.some(
                    (c) =>
                        Array.isArray(c.payment_conditions) && c.payment_conditions.some((pc) => this._isTR(pc))
                )
                const sumLandReal = realContracts.reduce((acc, c) => acc + (Number(c.land_value) || 0), 0)

                for (const rc of realContracts) {
                    rc._group_has_tr_real = groupHasTRReal
                    rc._group_land_sum_real = sumLandReal
                }

                if (!groupHasTRReal && sumLandReal > 0) {
                    const target = realContracts[0]
                    target.payment_conditions = [
                        ...(Array.isArray(target.payment_conditions) ? target.payment_conditions : []),
                        {
                            condition_type_id: 'TR',
                            condition_type_name: 'Terreno (TR)',
                            total_value: sumLandReal,
                            total_value_interest: 0,
                            outstanding_balance: 0,
                            amount_paid: 0,
                            base_date: target.financial_institution_date ?? null,
                            first_payment: null,
                            indexer_name: null,
                            bearer_name: null,
                            interest_type: null,
                            installments_number: 1,
                            synthetic: true
                        }
                    ]
                }

                sale.contracts.sort((a, b) => {
                    const aHasRepasse = Array.isArray(a.repasse) && a.repasse.length > 0
                    const bHasRepasse = Array.isArray(b.repasse) && b.repasse.length > 0
                    if (aHasRepasse !== bHasRepasse) return bHasRepasse - aHasRepasse

                    const isFin = (c) =>
                        Array.isArray(c.payment_conditions) &&
                        c.payment_conditions.some((pc) => {
                            const id = String(pc.condition_type_id ?? '').toUpperCase()
                            return id === 'FI' || id === 'RP'
                        })

                    const aIsFin = isFin(a)
                    const bIsFin = isFin(b)
                    if (aIsFin !== bIsFin) return bIsFin - aIsFin

                    return String(a.contract_id ?? '').localeCompare(String(b.contract_id ?? ''))
                })

                const main = sale.contracts[0] || {}
                sale.enterprise_name = main.enterprise_name
                sale.enterprise_id = main.enterprise_id
                sale.company_id = main.company_id
                sale.company_name = main.company_name
                sale.financial_institution_date = main.financial_institution_date
            })

            // 2) totais (override/comissão em reais; projeção como veio)
            salesMap.forEach((sale) => {
                const overrides = this.enterpriseOverrides || {}
                const byId = overrides.byId || {}
                const byName = overrides.byName || {}
                const norm = (s) => (s || '').trim().toUpperCase()
                const getRuleFor = (c) => byId[c.enterprise_id] || byName[norm(c.enterprise_name)] || null

                const real = sale.contracts.filter((c) => !c._projection)
                const projs = sale.contracts.filter((c) => c._projection)

                const matched = real.filter((c) => !!getRuleFor(c))
                const others = real.filter((c) => !getRuleFor(c))
                const rule = matched.length ? getRuleFor(matched[0]) : null

                const othersGross = others.reduce((acc, c) => acc + totalsOf(c).gross, 0)
                const othersNet = others.reduce((acc, c) => acc + totalsOf(c).net, 0)

                let matchedGross = matched.reduce((acc, c) => acc + totalsOf(c).gross, 0)
                let matchedNet = matched.reduce((acc, c) => acc + totalsOf(c).net, 0)

                if (rule?.gross === 'LAND_VALUE_ONLY') {
                    const landSum = matched.reduce((acc, c) => acc + (Number(c.land_value) || 0), 0)
                    matchedGross = landSum
                }
                if (rule?.net === 'TR_ONLY') {
                    const trSum = matched.reduce((acc, c) => {
                        const pcs = Array.isArray(c.payment_conditions) ? c.payment_conditions : []
                        return (
                            acc +
                            pcs
                                .filter((pc) => this._isTR(pc))
                                .reduce((s, pc) => s + (Number(pc.total_value) || 0), 0)
                        )
                    }, 0)
                    matchedNet = trSum
                }
                if (rule?.net === 'LAND_VALUE_ONLY') {
                    const landSum = matched.reduce((acc, c) => acc + (Number(c.land_value) || 0), 0)
                    matchedNet = landSum
                }

                const comRules = this.enterpriseCommissionRules || {}
                const comById = comRules.byId || {}
                const comByName = comRules.byName || {}
                const getComFor = (c) => comById[c.enterprise_id] || comByName[norm(c.enterprise_name)] || null
                const uplift = (base, pct) => (pct > 0 ? base * (pct / (1 - pct)) : 0)

                const baseGross = (c) => {
                    const r = getRuleFor(c) || {}
                    if (r.gross === 'LAND_VALUE_ONLY') return Number(c.land_value) || 0
                    return totalsOf(c).gross || 0
                }
                const baseNet = (c) => {
                    const r = getRuleFor(c) || {}
                    if (r.net === 'TR_ONLY') {
                        const pcs = Array.isArray(c.payment_conditions) ? c.payment_conditions : []
                        return pcs
                            .filter((pc) => this._isTR(pc))
                            .reduce((s, pc) => s + (Number(pc.total_value) || 0), 0)
                    }
                    if (r.net === 'LAND_VALUE_ONLY') return Number(c.land_value) || 0
                    return totalsOf(c).net || 0
                }

                let addGross = 0
                let addNet = 0
                for (const c of real) {
                    const com = getComFor(c)
                    const pct = Number(com?.commission_pct) || 0
                    if (pct > 0) {
                        addGross += uplift(baseGross(c), pct)
                        addNet += uplift(baseNet(c), pct)
                    }
                }

                const projsGross = projs.reduce((acc, c) => acc + totalsOf(c).gross, 0)
                const projsNet = projs.reduce((acc, c) => acc + totalsOf(c).net, 0)

                sale.total_value_gross = othersGross + matchedGross + addGross + projsGross
                sale.total_value_net = othersNet + matchedNet + addNet + projsNet

                sale._has_projection = projs.length > 0
                sale._realContracts = real
                sale._projContracts = projs
            })

            return Array.from(salesMap.values())
        },

        // ==========================
        // DASHBOARD (por empreendimento)
        // ==========================
        salesByEnterprise() {
            const pick = this.valuePicker
            const keyOf = (id, name) => (id != null ? `ID:${id}` : `NAME:${(name || '').trim().toUpperCase()}`)

            const unique = this.uniqueSales
            const real = unique.filter((s) => s.contracts.some((c) => !c._projection))
            const proj = unique.filter((s) => s.contracts.every((c) => c._projection))

            const realMap = new Map()
            for (const s of real) {
                const first = s.contracts.find((c) => !c._projection) || s.contracts[0] || {}
                const id = first.enterprise_id ?? null
                const name = first.enterprise_name || s.enterprise_name || '—'
                const key = keyOf(id, name)

                const prev = realMap.get(key) || {
                    id,
                    enterprise_id: id,
                    name,
                    count: 0,
                    total_value_net: 0,
                    total_value_gross: 0,
                    proj_count: 0,
                    proj_value_net: 0,
                    proj_value_gross: 0,
                    onlyProjectionRow: false,
                    key
                }

                prev.count += 1
                prev.total_value_net += Number(s.total_value_net) || 0
                prev.total_value_gross += Number(s.total_value_gross) || 0

                realMap.set(key, prev)
            }

            const outMap = new Map(realMap)
            for (const s of proj) {
                const first = s.contracts[0] || {}
                const id = first.enterprise_id ?? null
                const name = first.enterprise_name || s.enterprise_name || '—'
                const key = keyOf(id, name)

                const hasReal = [...realMap.values()].some((r) => r.id != null && r.id === id)
                if (hasReal && id != null) {
                    const baseKey = [...outMap.keys()].find((k) => outMap.get(k)?.id === id) || key
                    const row = outMap.get(baseKey)
                    row.proj_count += 1
                    row.proj_value_net += Number(s.total_value_net) || 0
                    row.proj_value_gross += Number(s.total_value_gross) || 0
                    outMap.set(baseKey, row)
                } else {
                    const prev = outMap.get(key) || {
                        id,
                        enterprise_id: id,
                        name,
                        count: 0,
                        total_value_net: 0,
                        total_value_gross: 0,
                        proj_count: 0,
                        proj_value_net: 0,
                        proj_value_gross: 0,
                        onlyProjectionRow: true,
                        key: `${key}__PROJ`
                    }
                    prev.count += 1
                    prev.total_value_net += Number(s.total_value_net) || 0
                    prev.total_value_gross += Number(s.total_value_gross) || 0
                    outMap.set(key, prev)
                }
            }

            const combined = [...outMap.values()].map((r) => {
                const base = pick(r)
                const append = (this.isNet ? r.proj_value_net : r.proj_value_gross) || 0
                return { ...r, __combined: (base || 0) + append }
            })

            return combined.sort((a, b) => b.__combined - a.__combined)
        },

        // mapeia enterprise->company baseado nos contratos reais atuais no store
        enterpriseToCompanyMap() {
            const map = new Map()
            for (const c of this.contracts || []) {
                if (c._projection) continue
                const eid = Number(c.enterprise_id)
                if (!Number.isFinite(eid)) continue
                const cid = (c.company_id != null) ? Number(c.company_id) : null
                const cname = c.company_name ?? null
                if (!map.has(eid)) map.set(eid, { company_id: cid, company_name: cname })
            }
            return map
        },

        // ==========================
        // DASHBOARD (por empresa)
        // ==========================
        salesByCompany() {
            const pick = this.valuePicker
            const normName = (s) => (s || '').trim()

            const unique = this.uniqueSales
            const real = unique.filter((s) => s.contracts.some((c) => !c._projection))
            const proj = unique.filter((s) => s.contracts.every((c) => c._projection))

            const byCompany = new Map()

            const toNum = (v) => {
                if (v === null || v === undefined || v === '') return null
                const n = Number(v)
                return Number.isFinite(n) ? n : null
            }

            const ensure = (companyId, companyName) => {
                const key = companyId != null ? `COMPANY:${companyId}` : `COMPANY:__NULL__:${normName(companyName)}`
                if (!byCompany.has(key)) {
                    byCompany.set(key, {
                        key,
                        id: companyId ?? null,
                        company_id: companyId ?? null,
                        name: normName(companyName) || (companyId != null ? `Empresa ${companyId}` : 'Sem Empresa'),
                        count: 0,
                        total_value_net: 0,
                        total_value_gross: 0,
                        proj_count: 0,
                        proj_value_net: 0,
                        proj_value_gross: 0,
                        onlyProjectionRow: false,
                        enterpriseIds: new Set()
                    })
                }
                return byCompany.get(key)
            }

            // 1) agrega REAL por company_id
            for (const s of real) {
                const first = s.contracts.find((c) => !c._projection) || s.contracts[0] || {}
                const companyId = first.company_id ?? null
                const companyName = first.company_name ?? null

                const row = ensure(companyId, companyName)

                row.count += 1
                row.total_value_net += Number(s.total_value_net) || 0
                row.total_value_gross += Number(s.total_value_gross) || 0

                for (const c of s.contracts || []) {
                    if (c._projection) continue
                    const eid = Number(c.enterprise_id)
                    if (Number.isFinite(eid)) row.enterpriseIds.add(eid)
                }
            }

            // 2) agrega PROJEÇÕES por company_id (já carimbadas) OU via centro de custo/enterprise->company
            for (const s of proj) {
                const first = s.contracts[0] || {}

                const companyId = first.company_id ?? null
                const companyName = first.company_name ?? null

                // preferencial: já veio com company
                if (companyId != null || companyName) {
                    const row = ensure(companyId, companyName)
                    row.proj_count += 1
                    row.proj_value_net += Number(s.total_value_net) || 0
                    row.proj_value_gross += Number(s.total_value_gross) || 0
                    continue
                }

                const eid = toNum(first.enterprise_id)

                // se não tem enterprise_id válido, não tenta encaixar por enterpriseId
                if (eid == null || eid <= 0) {
                    // cria/agg linha só de projeção por NOME (evita "0" e evita pular itens)
                    const ename = (first.enterprise_name || s.enterprise_name || 'Sem vínculo').trim()
                    const key = `COMPANY:PROJ:NAME:${ename.toUpperCase()}`

                    if (!byCompany.has(key)) {
                        byCompany.set(key, {
                            key,
                            id: null,
                            company_id: null,
                            name: ename,
                            count: 0,
                            total_value_net: 0,
                            total_value_gross: 0,
                            proj_count: 0,
                            proj_value_net: 0,
                            proj_value_gross: 0,
                            onlyProjectionRow: true,
                            enterpriseIds: new Set() // importante: NÃO guardar 0 aqui
                        })
                    }

                    const row = byCompany.get(key)
                    row.count += 1
                    row.total_value_net += Number(s.total_value_net) || 0
                    row.total_value_gross += Number(s.total_value_gross) || 0
                    continue
                }

                const map = this.enterpriseToCompanyMap
                const comp = (map instanceof Map) ? map.get(eid) : null
                if (comp && (comp.company_id != null || comp.company_name)) {
                    const row = ensure(comp.company_id ?? null, comp.company_name ?? null)
                    row.proj_count += 1
                    row.proj_value_net += Number(s.total_value_net) || 0
                    row.proj_value_gross += Number(s.total_value_gross) || 0
                    row.enterpriseIds.add(eid)
                    continue
                }

                // 2.2 fallback antigo: encaixa em algum row que já possua esse enterpriseId
                let targetRow = null
                for (const row of byCompany.values()) {
                    if (row.enterpriseIds.has(eid)) { targetRow = row; break }
                }

                if (targetRow) {
                    // ✅ se a linha é "só projeção" (verde), soma no BASE (count/total_value)
                    if (targetRow.onlyProjectionRow) {
                        targetRow.count += 1
                        targetRow.total_value_net += Number(s.total_value_net) || 0
                        targetRow.total_value_gross += Number(s.total_value_gross) || 0
                    } else {
                        // ✅ se a linha tem real, projeção é "append" (bolinha verde)
                        targetRow.proj_count += 1
                        targetRow.proj_value_net += Number(s.total_value_net) || 0
                        targetRow.proj_value_gross += Number(s.total_value_gross) || 0
                    }
                } else {
                    // cria linha só de projeção
                    const key = `COMPANY:PROJ:ENT:${eid}`
                    if (!byCompany.has(key)) {
                        byCompany.set(key, {
                            key,
                            id: null,
                            company_id: null,
                            name: first.enterprise_name || s.enterprise_name || `Empreendimento ${eid}`,
                            count: 0,
                            total_value_net: 0,
                            total_value_gross: 0,
                            proj_count: 0,
                            proj_value_net: 0,
                            proj_value_gross: 0,
                            onlyProjectionRow: true,
                            enterpriseIds: new Set([eid])
                        })
                    }
                    const row = byCompany.get(key)
                    row.count += 1
                    row.total_value_net += Number(s.total_value_net) || 0
                    row.total_value_gross += Number(s.total_value_gross) || 0
                }
            }

            // 3) finaliza e ordena por combinado
            const out = [...byCompany.values()].map((r) => {
                const base = pick(r)
                const append = (this.isNet ? r.proj_value_net : r.proj_value_gross) || 0
                return {
                    ...r,
                    enterpriseIds: [...r.enterpriseIds].filter((x) => Number.isFinite(x) && x > 0),
                    __combined: (base || 0) + append
                }
            })

            return out.sort((a, b) => b.__combined - a.__combined)
        },

        // Getter único para o dashboard
        salesDashboard() {
            return this.groupBy === 'company' ? this.salesByCompany : this.salesByEnterprise
        },

        salesByMonth() {
            const monthMap = new Map()

            this.uniqueSales.forEach((sale) => {
                const date = new Date(sale.financial_institution_date)
                if (isNaN(date)) return
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

                if (!monthMap.has(monthKey)) {
                    monthMap.set(monthKey, { month: monthKey, count: 0, total_value_net: 0, total_value_gross: 0 })
                }
                const ref = monthMap.get(monthKey)
                ref.count += 1
                ref.total_value_net += Number(sale.total_value_net) || 0
                ref.total_value_gross += Number(sale.total_value_gross) || 0
            })

            return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))
        },

        topCustomers() {
            const customerMap = new Map()

            this.uniqueSales.forEach((sale) => {
                if (!customerMap.has(sale.customer_id)) {
                    customerMap.set(sale.customer_id, {
                        customer_id: sale.customer_id,
                        customer_name: sale.customer_name,
                        sales_count: 0,
                        total_value_net: 0,
                        total_value_gross: 0
                    })
                }
                const c = customerMap.get(sale.customer_id)
                c.sales_count += 1
                c.total_value_net += Number(sale.total_value_net) || 0
                c.total_value_gross += Number(sale.total_value_gross) || 0
            })

            return Array.from(customerMap.values())
                .sort((a, b) => b.total_value_net - a.total_value_net)
                .slice(0, 10)
        },

        metrics() {
            const unique = this.uniqueSales
            const totalSales = this.totalSales

            const totalValueNet = unique.reduce((sum, s) => sum + (Number(s.total_value_net) || 0), 0)
            const totalValueGross = unique.reduce((sum, s) => sum + (Number(s.total_value_gross) || 0), 0)

            const avgSaleValueNet = totalSales > 0 ? totalValueNet / totalSales : 0
            const avgSaleValueGross = totalSales > 0 ? totalValueGross / totalSales : 0

            const totalEnterprises = new Set(this.contracts.map((c) => c.enterprise_id)).size

            return {
                totalSales,
                totalSalesWithProjections: this.totalSalesWithProjections,
                totalValueNet,
                totalValueGross,
                avgSaleValueNet,
                avgSaleValueGross,
                totalValue: totalValueNet,
                avgSaleValue: avgSaleValueNet,
                totalEnterprises,
                totalContracts: this.contracts.length
            }
        },

        workflowGroupOptions(state) {
            return (state.workflowGroups || []).map((g) => ({
                label: `${g.tipo === 'reservas' ? 'Reserva' : 'Repasse'} • ${g.nome}`,
                value: String(g.idgroup)
            }))
        },

        projectionContractsCount: (state) => state.contracts.filter((c) => c._projection === true).length,
        projectionItemsCount() {
            return this.uniqueSales.filter(
                (sale) => sale._has_projection && sale.contracts.every((c) => c._projection === true)
            ).length
        }
    },

    actions: {
        setValueMode(mode) {
            this.valueMode = mode === 'gross' ? 'gross' : 'net'
            log('setValueMode:', this.valueMode)
        },

        toggleValueMode() {
            this.valueMode = this.valueMode === 'net' ? 'gross' : 'net'
            log('toggleValueMode:', this.valueMode)
        },

        _isTR(pc) {
            if (!pc) return false
            const id = String(pc.condition_type_id ?? '').trim().toUpperCase()
            const name = String(pc.condition_type_name ?? '').trim().toUpperCase()
            return id === 'TR' || name === 'TR' || name.includes('TERRENO')
        },

        _toNumber(v) {
            if (v === null || v === undefined || v === '') return 0
            if (typeof v === 'number') return v
            if (typeof v === 'string') {
                const s = v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v
                const num = Number(s.replace(/[^\d.-]/g, ''))
                return Number.isFinite(num) ? num : 0
            }
            const num = Number(v)
            return Number.isFinite(num) ? num : 0
        },

        // extrai número de string tipo "123 - XYZ" / "CC 123"
        _parseLeadingNumber(v) {
            if (v === null || v === undefined) return null
            if (typeof v === 'number') return Number.isFinite(v) ? v : null
            const s = String(v).trim()
            if (!s) return null
            const m = s.match(/(\d{2,})/)
            if (!m) return null
            const n = Number(m[1])
            return Number.isFinite(n) ? n : null
        },

        // ===== Centro de custo -> enterprise/company (best effort) =====
        _extractEnterpriseIdFromProjectionRow(row) {
            // já existentes
            const direct =
                this._parseLeadingNumber(row?.codigointerno_empreendimento) ??
                this._parseLeadingNumber(row?.codigointernoEmpreendimento) ??
                this._parseLeadingNumber(row?.unidade_json?.idempreendimento_int) ??
                this._parseLeadingNumber(row?.unidadeJson?.idempreendimento_int) ??
                this._parseLeadingNumber(row?.enterprise_id) ??
                this._parseLeadingNumber(row?.enterpriseId)

            if (direct != null) return direct

            // “centro de custo” (variações comuns)
            const cc =
                row?.centro_custo_id ??
                row?.centrodecusto_id ??
                row?.centroCustoId ??
                row?.id_centro_custo ??
                row?.idCentroCusto ??
                row?.centro_custo ??
                row?.centroCusto ??
                row?.codigo_centro_custo ??
                row?.codigoCentroCusto ??
                row?.cost_center_id ??
                row?.costCenterId ??
                row?.cost_center ??
                row?.costCenter

            const fromCC = this._parseLeadingNumber(cc)
            return fromCC != null ? fromCC : null
        },

        _extractCompanyFromProjectionRow(row) {
            const cid =
                this._parseLeadingNumber(row?.company_id) ??
                this._parseLeadingNumber(row?.companyId) ??
                this._parseLeadingNumber(row?.empresa_id) ??
                this._parseLeadingNumber(row?.empresaId) ??
                this._parseLeadingNumber(row?.idempresa) ??
                this._parseLeadingNumber(row?.codigo_empresa) ??
                this._parseLeadingNumber(row?.codigointerno_empresa)

            const cname =
                row?.company_name ??
                row?.companyName ??
                row?.empresa_nome ??
                row?.empresaNome ??
                row?.nome_empresa ??
                row?.nomeEmpresa ??
                null

            return {
                company_id: (cid != null ? cid : null),
                company_name: (cname != null ? String(cname).trim() : null)
            }
        },

        // ✅ com log e limpando caches
        setGroupBy(mode) {
            const prev = this.groupBy
            this.groupBy = mode === 'company' ? 'company' : 'enterprise'
            log('setGroupBy:', prev, '->', this.groupBy)

            // sanity do agrupamento (se vier 0, API não traz company_id)
            let withCompany = 0
            let withoutCompany = 0
            for (const c of this.contracts || []) {
                if (c._projection) continue
                if (c.company_id == null) withoutCompany++
                else withCompany++
            }
            log('company_id real contracts:', { withCompany, withoutCompany })

            this.clearContractsCache()
        },

        _normalizePaymentCondition(pc) {
            const n = this._toNumber
            return {
                condition_type_id: pc.condition_type_id ?? pc.conditionTypeId ?? null,
                condition_type_name: pc.condition_type_name ?? pc.conditionTypeName ?? null,
                total_value: n(pc.total_value ?? pc.totalValue),
                total_value_interest: n(pc.total_value_interest ?? pc.totalValueInterest),
                outstanding_balance: n(pc.outstanding_balance ?? pc.outstandingBalance),
                amount_paid: n(pc.amount_paid ?? pc.amountPaid),
                base_date: pc.base_date ?? pc.baseDate ?? null,
                first_payment: pc.first_payment ?? pc.firstPayment ?? null,
                indexer_name: pc.indexer_name ?? pc.indexerName ?? null,
                bearer_name: pc.bearer_name ?? pc.bearerName ?? null,
                interest_type: pc.interest_type ?? pc.interestType ?? null,
                installments_number: n(pc.installments_number ?? pc.installmentsNumber)
            }
        },

        _normalizeContract(c) {
            const n = this._toNumber

            const pcs = Array.isArray(c.payment_conditions)
                ? c.payment_conditions.map(this._normalizePaymentCondition)
                : []

            const associates = Array.isArray(c.associates)
                ? c.associates.map((a) => ({
                    ...a,
                    participation_percentage: n(a.participation_percentage ?? a.participationPercentage)
                }))
                : []

            const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

            // IMPORTANT: contract_id precisa preservar string (projeções usam "PROJ-...")
            const rawId = c.contract_id ?? c.id ?? ''
            const contract_id = (rawId === null || rawId === undefined) ? '' : String(rawId)

            return {
                contract_id,

                // empresa (para agrupamento)
                company_id: (c.company_id ?? c.companyId) != null ? n(c.company_id ?? c.companyId) : null,
                company_name: c.company_name ?? c.companyName ?? null,

                enterprise_id: n(c.enterprise_id ?? c.enterpriseId),
                enterprise_name: c.enterprise_name ?? c.enterpriseName ?? '',
                financial_institution_date: c.financial_institution_date ?? c.financialInstitutionDate ?? null,
                land_value: n(c.land_value ?? c.landValue),
                unit_name: c.unit_name ?? c.unitName ?? '',
                unit_id: c.unit_id ?? c.unitId ?? '',

                customer_id: n(c.customer_id ?? c.customerId),
                customer_name: c.customer_name ?? c.customerName ?? '',
                participation_percentage: n(c.participation_percentage ?? c.participationPercentage),

                payment_conditions: pcs,
                associates,
                links: Array.isArray(c.links) ? c.links : [],
                repasse: Array.isArray(c.repasse) ? c.repasse : [],
                reserva: isPlainObject(c.reserva) ? c.reserva : null,

                _projection: !!c._projection,
                _projection_tipo: c._projection_tipo || null,
                _projection_group_id: c._projection_group_id || null
            }
        },

        _seriesToPaymentConditions(series = []) {
            const n = this._toNumber
            const out = []
            for (const s of series || []) {
                const qty = n(s?.quantidade) || 1
                const val = n(s?.valor) || 0
                out.push({
                    condition_type_id: (s?.sigla ?? '').toString().trim().toUpperCase() || null,
                    condition_type_name: s?.serie || '—',
                    total_value: val * qty,
                    installments_number: qty,
                    base_date: s?.vencimento || null
                })
            }
            return out
        },

        // ===== PROJEÇÕES: normaliza e "carimba" company usando enterprise OU centro de custo =====
        _normalizeProjectionRepasse(row, groupId) {
            const n = this._toNumber

            // valor fallback
            const fallbackValue =
                n(row?.valor_previsto) ||
                n(row?.valor_contrato) ||
                n(row?.condicoes?.total_proposta) ||
                n(row?.condicoes?.valor_contrato) ||
                n(row?.condicoes?.vgv_tabela) ||
                0

            // enterpriseId: tenta campos originais e fallback pelo centro de custo
            const enterpriseId = this._extractEnterpriseIdFromProjectionRow(row)

            // company: 1) se vier na projeção; 2) tenta enterprise->company
            const directCompany = this._extractCompanyFromProjectionRow(row)
            const map = this.enterpriseToCompanyMap
            const mapped = (enterpriseId != null && map instanceof Map) ? map.get(Number(enterpriseId)) : null

            const company_id = (directCompany.company_id != null)
                ? directCompany.company_id
                : (mapped?.company_id ?? null)

            const company_name = (directCompany.company_name)
                ? directCompany.company_name
                : (mapped?.company_name ?? null)

            const projId =
                row?.idrepasse ||
                row?.codigointerno_unidade ||
                row?.codigointernoUnidade ||
                Math.random().toString(36).slice(2)

            // ✅ 1) tenta montar condições por séries:
            // prioridade: row.condicoes.series (se o endpoint já devolve)
            // fallback: row.reserva.condicoes.series (se vier “reserva embutida” no repasse)
            const series =
                row?.condicoes?.series ||
                row?.reserva?.condicoes?.series ||
                row?.reserva_obj?.condicoes?.series ||
                row?.reservaObj?.condicoes?.series ||
                null

            let pcs = this._seriesToPaymentConditions(series)

            // ✅ 2) fallback: cria condição sintética se não veio séries
            if (!Array.isArray(pcs) || pcs.length === 0) {
                pcs = [{
                    condition_type_id: 'PROJ',
                    condition_type_name: 'Projeção de Repasse',
                    total_value: fallbackValue,
                    installments_number: 1,
                    base_date: row?.data_status_repasse || row?.dataStatusRepasse || null,
                    synthetic: true
                }]
            }

            // ✅ 3) anexa reserva (se vier), senão cria stub quando existir idreserva
            const embeddedReserva =
                row?.reserva ||
                row?.reserva_obj ||
                row?.reservaObj ||
                null

            const idreserva =
                row?.idreserva != null ? row.idreserva :
                    embeddedReserva?.idreserva != null ? embeddedReserva.idreserva :
                        null

            const reservaStub = (idreserva != null || row?.condicoes)
                ? {
                    idreserva: idreserva ?? null,
                    data_reserva: row?.data_reserva || row?.dataReserva || null,
                    data_venda: row?.data_venda || row?.dataVenda || null,
                    empreendimento: row?.empreendimento || row?.enterprise_name || null,
                    etapa: row?.etapa || row?.unidade_json?.etapa || null,
                    bloco: row?.bloco || row?.unidade_json?.bloco || row?.unidade_json?.quadra || null,
                    unidade: row?.unidade || row?.unit_name || null,
                    titular: row?.titular || null,
                    corretor: row?.corretor || null,
                    imobiliaria: row?.imobiliaria || null,
                    unidade_json: row?.unidade_json || row?.unidadeJson || null,
                    condicoes: row?.condicoes || null
                }
                : null

            const reservaFinal = embeddedReserva || reservaStub

            return {
                _projection: true,
                _projection_tipo: 'repasses',
                _projection_group_id: groupId,

                contract_id: `PROJ-RP-${projId}`,

                enterprise_id: enterpriseId,
                enterprise_name: row?.empreendimento || row?.enterprise_name || '',

                company_id,
                company_name,

                financial_institution_date: row?.data_status_repasse || row?.dataStatusRepasse || null,

                // mantém só como referência
                land_value: fallbackValue,

                unit_name: row?.unidade || row?.unit_name || '',
                unit_id: row?.codigointerno_unidade || row?.codigointernoUnidade || null,

                customer_id: null,
                customer_name: row?.titular?.nome || row?.cliente || '—',

                // ✅ AGORA É AQUI QUE O MODAL VAI SE APOIAR PRA LISTAR/ SOMAR
                payment_conditions: pcs,

                // ✅ mantém repasse, mas também garante que reserva fique acessível
                repasse: [{
                    ...row,
                    // se o endpoint não devolve, ao menos deixa acessível a reserva para o front
                    reserva: reservaFinal ?? row?.reserva ?? null
                }],

                reserva: reservaFinal, // ✅ também no nível do contrato (compat)
                links: []
            }
        },
        _normalizeProjectionReserva(row, groupId) {
            const n = this._toNumber

            const enterpriseId = this._extractEnterpriseIdFromProjectionRow(row)

            const directCompany = this._extractCompanyFromProjectionRow(row)
            const map = this.enterpriseToCompanyMap
            const mapped = (enterpriseId != null && map instanceof Map) ? map.get(Number(enterpriseId)) : null

            const company_id = (directCompany.company_id != null)
                ? directCompany.company_id
                : (mapped?.company_id ?? null)

            const company_name = (directCompany.company_name)
                ? directCompany.company_name
                : (mapped?.company_name ?? null)

            // 1) tenta montar por séries
            let pcs = this._seriesToPaymentConditions(row?.condicoes?.series)

            // 2) fallback (quando não tem séries)
            const fallback =
                n(row?.condicoes?.total_proposta) ||
                n(row?.condicoes?.valor_contrato) ||
                n(row?.condicoes?.vgv_tabela) ||
                0

            // ✅ FIX: se não vier série, cria uma condição sintética com o fallback
            if (!Array.isArray(pcs) || pcs.length === 0) {
                pcs = [{
                    condition_type_id: 'PROJ',
                    condition_type_name: 'Projeção de Reserva',
                    total_value: fallback,
                    installments_number: 1,
                    base_date: row?.data_reserva || row?.dataReserva || null,
                    synthetic: true
                }]
            }

            const projId =
                row.idreserva ||
                row?.unidade_json?.idunidade_int ||
                row?.unidadeJson?.idunidade_int ||
                Math.random().toString(36).slice(2)

            return {
                _projection: true,
                _projection_tipo: 'reservas',
                _projection_group_id: groupId,

                contract_id: `PROJ-RS-${projId}`,

                enterprise_id: enterpriseId,
                enterprise_name: row.empreendimento || row?.enterprise_name || '',

                company_id,
                company_name,

                financial_institution_date: row.data_reserva || row?.dataReserva || null,

                // mantém (não é usado no total, mas ok para referência)
                land_value: fallback,

                unit_name: row.unidade || row?.unit_name || '',
                unit_id: row?.unidade_json?.idunidade_int || row?.unidadeJson?.idunidade_int || null,

                customer_id: null,
                customer_name: row?.titular?.nome || row?.cliente || row?.comprador || '—',

                payment_conditions: pcs,

                repasse: [],
                reserva: row,
                links: []
            }
        },

        async _fetchProjectionsForGroup(idgroup) {
            if (this._projCache.has(idgroup)) return this._projCache.get(idgroup)

            const url = `${API_URL}/cv/workflow-grupos/${idgroup}/projecoes`
            logProj('fetch start:', { idgroup, url })

            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!res.ok) {
                logProj('fetch error:', { idgroup, status: res.status })
                throw new Error(`Erro ao buscar projeções do grupo ${idgroup}: ${res.status}`)
            }

            const data = await res.json()
            const { results = [], meta = {} } = data

            // --- LOG 1: meta + tamanho
            logProj('response meta:', meta)
            logProj('results length:', results.length)

            // --- LOG 2: amostra bruta (primeiro item) + keys
            const firstRaw = results?.[0] ?? null
            if (firstRaw) {
                logProj('first raw ids:', {
                    idrepasse: firstRaw?.idrepasse ?? null,
                    idreserva: firstRaw?.idreserva ?? null,
                    hasCondicoes: !!firstRaw?.condicoes,
                    seriesLen: Array.isArray(firstRaw?.condicoes?.series) ? firstRaw.condicoes.series.length : 0,
                    hasEmbeddedReserva: !!(firstRaw?.reserva || firstRaw?.reserva_obj || firstRaw?.reservaObj)
                })
            } else {
                logProj('no results returned')
            }

            // determina tipo (sem inventar)
            const tipo =
                (meta?.tipo || (results?.[0]?.idrepasse ? 'repasses' : 'reservas'))
                    .toString()
                    .toLowerCase()

            logProj('detected tipo:', tipo)

            // --- LOG 3: checar caminhos de "imobiliária" que o SEU front já tenta usar hoje
            // (repasseOf/reservaOf/imobiliariaOf do modal)
            if (firstRaw) {
                const rawImob = {
                    // caminhos comuns do seu front
                    imob_direct: firstRaw?.imobiliaria ?? null,
                    imob_reserva_corretor: firstRaw?.corretor?.imobiliaria ?? null,
                    imob_reserva_titular_corretor: firstRaw?.titular?.corretor?.imobiliaria ?? null,

                    // alguns payloads vêm com objeto (mostra só keys)
                    imob_obj_keys: (firstRaw?.imobiliaria && typeof firstRaw.imobiliaria === 'object')
                        ? Object.keys(firstRaw.imobiliaria)
                        : null
                }
                logProj('raw imobiliaria candidates (first):', rawImob)
            }

            // normaliza
            const normalized = results.map((r) =>
                tipo === 'repasses'
                    ? this._normalizeProjectionRepasse(r, idgroup)
                    : this._normalizeProjectionReserva(r, idgroup)
            )

            // --- LOG 4: amostra normalizada (valor, ids e repasse/reserva)
            const sample = normalized.slice(0, 3).map((c) => ({
                contract_id: c.contract_id,
                enterprise_id: c.enterprise_id,
                company_id: c.company_id,
                pcs_len: Array.isArray(c?.payment_conditions) ? c.payment_conditions.length : 0,
                pcs_first: c?.payment_conditions?.[0]?.condition_type_id ?? null,
                has_repasse: Array.isArray(c.repasse) && c.repasse.length > 0,
                repasse_idreserva: c?.repasse?.[0]?.idreserva ?? null,
                has_reserva_contract: !!c.reserva,
                has_reserva_inside_repasse: !!c?.repasse?.[0]?.reserva,
                reserva_series_len: Array.isArray(c?.reserva?.condicoes?.series) ? c.reserva.condicoes.series.length : 0
            }))
            logProj('normalized sample:', sample)

            this._projCache.set(idgroup, normalized)
            return normalized
        },

        _buildContractsCacheKey({ view = 'dashboard', enterpriseId = null, enterpriseIds = null } = {}) {
            const f = this.filters || {}
            const start = f.startDate || ''
            const end = f.endDate || ''
            const sit = f.situation || 'Emitido'
            const names = Array.isArray(f.enterpriseName) ? f.enterpriseName.slice().sort().join('|') : ''

            const ids = Array.isArray(enterpriseIds)
                ? [...new Set(enterpriseIds.map(Number).filter(Number.isFinite))].sort((a, b) => a - b).join(',')
                : ''
            const id1 = enterpriseId != null ? String(Number(enterpriseId)) : ''

            const groups = Array.isArray(this.selectedGroupIds)
                ? [...new Set(this.selectedGroupIds)].sort((a, b) => a - b).join(',')
                : ''

            return `v=${view};s=${start};e=${end};sit=${sit};names=${names};id=${id1};ids=${ids};g=${groups}`
        },

        _getCachedContracts(key) {
            const item = this._contractsCache.get(key)
            if (!item) return null
            if (Date.now() - item.ts > this._cacheTTLms) {
                this._contractsCache.delete(key)
                return null
            }
            return item
        },

        _setCachedContracts(key, payload) {
            this._contractsCache.set(key, { ts: Date.now(), ...payload })
        },

        restoreDashboardFromCache() {
            if (!this._lastDashboardKey) return false
            const cached = this._getCachedContracts(this._lastDashboardKey)
            if (!cached) return false
            this.contracts = cached.contracts
            this.total = cached.total
            return true
        },

        clearContractsCache() {
            this._contractsCache.clear()
            this._lastDashboardKey = null
            log('clearContractsCache')
        },

        // ==========================
        // cache DETAIL POR EMPREENDIMENTO
        // ==========================
        _buildDetailCtxKey() {
            const f = this.filters || {}
            const start = f.startDate || ''
            const end = f.endDate || ''
            const sit = f.situation || 'Emitido'
            const names = Array.isArray(f.enterpriseName) ? f.enterpriseName.slice().sort().join('|') : ''
            const groups = Array.isArray(this.selectedGroupIds)
                ? [...new Set(this.selectedGroupIds)].sort((a, b) => a - b).join(',')
                : ''
            return `s=${start};e=${end};sit=${sit};names=${names};g=${groups}`
        },

        _getDetailBucket(ctxKey) {
            if (!this._detailByEnterprise.has(ctxKey)) this._detailByEnterprise.set(ctxKey, new Map())
            return this._detailByEnterprise.get(ctxKey)
        },

        _getDetailFromCache(ctxKey, enterpriseId) {
            const bucket = this._getDetailBucket(ctxKey)
            const id = Number(enterpriseId)
            if (!Number.isFinite(id)) return null
            const item = bucket.get(id)
            if (!item) return null
            if (Date.now() - item.ts > this._detailTTLms) {
                bucket.delete(id)
                return null
            }
            return item.contracts
        },

        _indexDetailIntoCache(ctxKey, normalizedContracts = []) {
            const bucket = this._getDetailBucket(ctxKey)

            const byEnt = new Map()
            for (const c of normalizedContracts) {
                const id = Number(c.enterprise_id)
                if (!Number.isFinite(id)) continue
                if (!byEnt.has(id)) byEnt.set(id, [])
                byEnt.get(id).push(c)
            }

            for (const [enterpriseId, list] of byEnt.entries()) {
                bucket.set(enterpriseId, { ts: Date.now(), contracts: list })
            }
        },

        clearDetailCache() {
            this._detailByEnterprise.clear()
            log('clearDetailCache')
        },

        // ==========================
        // API
        // ==========================
        async fetchContracts({ view = 'dashboard', enterpriseId = null, enterpriseIds = null, force = false } = {}) {
            const carregamentoStore = useCarregamentoStore()
            this.error = null

            const isDetail = String(view).toLowerCase() === 'detail'

            let __detailCachedBeforeRequest = []
            let __detailRequestedIds = null

            // detail: 1 enterprise
            if (isDetail && !force && enterpriseId != null) {
                const ctxKey = this._buildDetailCtxKey()
                const cachedDetail = this._getDetailFromCache(ctxKey, enterpriseId)
                if (cachedDetail) {
                    let projections = []
                    if (this.selectedGroupIds.length > 0) {
                        const all = await Promise.all(
                            this.selectedGroupIds.map((id) => this._fetchProjectionsForGroup(id).catch(() => []))
                        )
                        projections = all.flat()
                    }
                    this.contracts = [...cachedDetail, ...projections]
                    this.total = this.contracts.length
                    log('fetchContracts (detail cached):', { enterpriseId, total: this.total })
                    return
                }
            }

            // detail: enterpriseIds (busca só missing)
            if (isDetail && !force && Array.isArray(enterpriseIds) && enterpriseIds.length > 0) {
                const ctxKey = this._buildDetailCtxKey()
                const ids = enterpriseIds.map(Number).filter(Number.isFinite)
                const missing = ids.filter((id) => !this._getDetailFromCache(ctxKey, id))

                if (missing.length === 0) {
                    const allCached = ids.flatMap((id) => this._getDetailFromCache(ctxKey, id) || [])
                    let projections = []
                    if (this.selectedGroupIds.length > 0) {
                        const all = await Promise.all(
                            this.selectedGroupIds.map((id) => this._fetchProjectionsForGroup(id).catch(() => []))
                        )
                        projections = all.flat()
                    }
                    this.contracts = [...allCached, ...projections]
                    this.total = this.contracts.length
                    log('fetchContracts (detail cached all):', { enterpriseIds: ids.length, total: this.total })
                    return
                }

                __detailRequestedIds = ids
                __detailCachedBeforeRequest = ids
                    .filter((id) => !missing.includes(id))
                    .flatMap((id) => this._getDetailFromCache(ctxKey, id) || [])

                enterpriseIds = missing
            }

            const key = this._buildContractsCacheKey({ view, enterpriseId, enterpriseIds })

            if (!force) {
                const cached = this._getCachedContracts(key)
                if (cached) {
                    this.contracts = cached.contracts
                    this.total = cached.total
                    if (view === 'dashboard') this._lastDashboardKey = key
                    log('fetchContracts (cached):', { view, total: this.total })
                    return
                }
            }

            try {
                carregamentoStore.iniciarCarregamento()

                let url = `${API_URL}/sienge/contracts`
                const params = new URLSearchParams()

                if (this.filters.startDate) params.append('startDate', this.filters.startDate)
                if (this.filters.endDate) params.append('endDate', this.filters.endDate)
                params.append('situation', this.filters.situation || 'Emitido')

                if (Array.isArray(this.filters.enterpriseName) && this.filters.enterpriseName.length > 0) {
                    params.append('enterpriseName', this.filters.enterpriseName.join(','))
                }

                params.append('view', view)

                if (enterpriseId != null) params.append('enterpriseId', String(enterpriseId))
                if (Array.isArray(enterpriseIds) && enterpriseIds.length > 0) {
                    params.append('enterpriseIds', enterpriseIds.map(String).join(','))
                }

                if (params.toString()) url += `?${params.toString()}`

                log('fetchContracts request:', url)

                const response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!response.ok) throw new Error(`Erro ao buscar contratos: ${response.status}`)

                const data = await response.json()
                const normalized = Array.isArray(data.results) ? data.results.map(this._normalizeContract) : []

                // seta temporário para permitir enterpriseToCompanyMap no normalize de projeção
                this.contracts = normalized

                if (isDetail) {
                    const ctxKey = this._buildDetailCtxKey()
                    this._indexDetailIntoCache(ctxKey, normalized)
                }

                let projections = []
                if (this.selectedGroupIds.length > 0) {
                    const all = await Promise.all(
                        this.selectedGroupIds.map((id) => this._fetchProjectionsForGroup(id).catch(() => []))
                    )
                    projections = all.flat()
                }

                let merged = [...normalized, ...projections]

                if (isDetail && Array.isArray(__detailRequestedIds) && __detailCachedBeforeRequest.length > 0) {
                    merged = [...__detailCachedBeforeRequest, ...normalized, ...projections]
                }

                // dedupe por contract_id
                const dedup = new Map()
                for (const c of merged) {
                    const k = String(c?.contract_id ?? '')
                    if (!k) continue
                    if (!dedup.has(k)) dedup.set(k, c)
                }
                merged = [...dedup.values()]

                const total = merged.length

                this.contracts = merged
                this.total = total

                this._setCachedContracts(key, { contracts: merged, total })
                if (view === 'dashboard') this._lastDashboardKey = key

                const sampleReal = merged.find((c) => !c._projection)
                log('fetchContracts done:', { view, normalized: normalized.length, projections: projections.length, merged: merged.length })
                log('sample company:', sampleReal ? { company_id: sampleReal.company_id, company_name: sampleReal.company_name } : null)

                let withCompany = 0
                let withoutCompany = 0
                for (const c of merged || []) {
                    if (c._projection) continue
                    if (c.company_id == null) withoutCompany++
                    else withCompany++
                }
                log('company_id real contracts after fetch:', { withCompany, withoutCompany })
            } catch (error) {
                this.error = error.message
                log('fetchContracts error:', this.error)
            } finally {
                carregamentoStore.finalizarCarregamento()
            }
        },

        async fetchEnterprises() {
            if (this.enterprises.length > 0) return this.enterprises
            try {
                const response = await fetch(`${API_URL}/sienge/contracts/enterprises`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!response.ok) throw new Error(`Erro ao buscar empreendimentos: ${response.status}`)
                const data = await response.json()
                this.enterprises = data.results || []
                return this.enterprises
            } catch (error) {
                this.error = error.message
                return []
            }
        },

        setSelectedGroups(ids) {
            this.selectedGroupIds = Array.isArray(ids) ? ids.map(Number).filter(Number.isFinite) : []
            this.clearDetailCache()
            this.clearContractsCache()
            log('setSelectedGroups:', this.selectedGroupIds)
        },

        async fetchEnterpriseCities() {
            if (this.enterpriseCities.length > 0) return this.enterpriseCities

            try {
                const headers = {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }

                const qs = new URLSearchParams({ page: '1', pageSize: '2000' })
                const res = await fetch(`${API_URL}/admin/enterprise-cities?${qs.toString()}`, { headers })
                if (!res.ok) throw new Error(`Erro ao buscar enterprise-cities: ${res.status}`)

                const data = await res.json()
                const items = Array.isArray(data?.items) ? data.items : []

                this.enterpriseCities = items
                    .filter((i) => i?.erp_id)
                    .map((i) => ({
                        erp_id: String(i.erp_id),
                        name: i.enterprise_name || '—',
                        city: i.effective_city || i.default_city || null,
                        source: i.source
                    }))

                return this.enterpriseCities
            } catch (e) {
                this.error = e.message
                this.enterpriseCities = []
                return []
            }
        },

        async fetchWorkflowGroups() {
            try {
                const headers = {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }

                const [resR, resP] = await Promise.all([
                    fetch(`${API_URL}/cv/workflow-grupos?tipo=reservas`, { headers }),
                    fetch(`${API_URL}/cv/workflow-grupos?tipo=repasses`, { headers })
                ])

                if (!resR.ok || !resP.ok) {
                    console.warn('Falha ao listar grupos de workflow (projeções serão desabilitadas).', {
                        reservas: resR.status,
                        repasses: resP.status
                    })
                    this.workflowGroups = []
                    return
                }

                const [dataR, dataP] = await Promise.all([resR.json(), resP.json()])

                const toArray = (d) =>
                    Array.isArray(d?.results) ? d.results : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []
                const raw = [...toArray(dataR), ...toArray(dataP)]

                const norm = (g) => {
                    const id = Number(g?.idgroup ?? g?.id ?? g?.group_id ?? g?.grupo_id)
                    const tipoRaw = (g?.tipo ?? g?.type ?? g?.origem ?? '').toString().toLowerCase()
                    return {
                        idgroup: Number.isFinite(id) ? id : null,
                        nome: g?.nome ?? g?.name ?? g?.titulo ?? '',
                        tipo: tipoRaw.includes('reserva') ? 'reservas' : 'repasses'
                    }
                }

                this.workflowGroups = raw.map(norm).filter((g) => g.idgroup !== null)
            } catch (e) {
                console.warn('Erro ao carregar grupos de workflow (projeções):', e)
                this.workflowGroups = []
            }
        },

        setFilters(filters) {
            this.filters = { ...this.filters, ...filters }
            this.clearContractsCache()
            this.clearDetailCache()
            log('setFilters:', this.filters)
        },

        clearFilters() {
            this.filters = { startDate: '', endDate: '', situation: 'Emitido', enterpriseName: [] }
            this.selectedGroupIds = []
            this.clearContractsCache()
            this.clearDetailCache()
            log('clearFilters')
        }
    }
})
