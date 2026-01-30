// stores/contractsStore.js
import { defineStore } from 'pinia'
import { useCarregamentoStore } from '@/stores/Config/carregamento'
import API_URL from '@/config/apiUrl'

export const useContractsStore = defineStore('contracts', {
    state: () => ({
        contracts: [],
        enterprises: [],
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

        // cache por request (dashboard/detail) - mantém
        _contractsCache: new Map(), // key -> { ts, contracts, total }
        _cacheTTLms: 1000 * 60 * 5,
        _lastDashboardKey: null,

        // ✅ NOVO: cache DETAIL por empreendimento (enterprise_id) + contexto (datas/situation/names/grupos)
        _detailByEnterprise: new Map(), // ctxKey -> Map(enterpriseId -> { ts, contracts: [] })
        _detailTTLms: 1000 * 60 * 10
    }),

    getters: {
        // Regras por empreendimento
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
                97001: { commission_pct: 0.04 },
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
                return (this.isGross && rule.gross === 'LAND_VALUE_ONLY') || (this.isNet && rule.net === 'LAND_VALUE_ONLY')
            }
        },

        valueModeLabel: (state) => (state.valueMode === 'net' ? 'VGV' : 'VGV + DC'),
        isGross: (state) => state.valueMode === 'gross',
        isNet: (state) => state.valueMode === 'net',

        valuePicker: (state) => (obj) =>
            (state.valueMode === 'net' ? obj?.total_value_net : obj?.total_value_gross) ?? 0,

        discountCodes: () => new Set(['DC', 'DESCONTO_CONSTRUTORA']),

        _contractTotals() {
            return (contract) => {
                const isDiscount = (pc) => this.discountCodes.has(String(pc.condition_type_id || '').toUpperCase())
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

        _makeSaleKey: () => (c) => `${c.customer_id}__${(c.unit_name || '').trim().toUpperCase()}`,

        uniqueSales() {
            const salesMap = new Map()
            const makeKey = this._makeSaleKey
            const totalsOf = this._contractTotals

            const cloneContract = (c) => ({
                ...c,
                payment_conditions: Array.isArray(c.payment_conditions) ? [...c.payment_conditions] : []
            })

            // 1) agrupar por cliente+unidade
            this.contracts.forEach((contract) => {
                const key = makeKey(contract)
                if (!salesMap.has(key)) {
                    salesMap.set(key, {
                        customer_id: contract.customer_id,
                        customer_name: contract.customer_name,
                        unit_name: contract.unit_name,
                        enterprise_name: contract.enterprise_name,
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
                    (c) => Array.isArray(c.payment_conditions) && c.payment_conditions.some((pc) => this._isTR(pc))
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

                    return (Number(a.contract_id) || 0) - (Number(b.contract_id) || 0)
                })

                const main = sale.contracts[0] || {}
                sale.enterprise_name = main.enterprise_name
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
                        return acc + pcs
                            .filter((pc) => this._isTR(pc))
                            .reduce((s, pc) => s + (Number(pc.total_value) || 0), 0)
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
                        return pcs.filter((pc) => this._isTR(pc)).reduce((s, pc) => s + (Number(pc.total_value) || 0), 0)
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

        salesByEnterprise() {
            const pick = this.valuePicker
            const keyOf = (id, name) => (id != null ? `ID:${id}` : `NAME:${(name || '').trim().toUpperCase()}`)

            const unique = this.uniqueSales
            const real = unique.filter((s) => s.contracts.some((c) => !c._projection))
            const proj = unique.filter((s) => s.contracts.every((c) => c._projection))

            const realMap = new Map()
            for (const s of real) {
                const first = s.contracts[0] || {}
                const id = first.enterprise_id ?? null
                const name = first.enterprise_name || s.enterprise_name || '—'
                const key = keyOf(id, name)

                const prev = realMap.get(key) || {
                    id,
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
            const totalSales = unique.length

            const totalValueNet = unique.reduce((sum, s) => sum + (Number(s.total_value_net) || 0), 0)
            const totalValueGross = unique.reduce((sum, s) => sum + (Number(s.total_value_gross) || 0), 0)

            const avgSaleValueNet = totalSales > 0 ? totalValueNet / totalSales : 0
            const avgSaleValueGross = totalSales > 0 ? totalValueGross / totalSales : 0

            const totalEnterprises = new Set(this.contracts.map((c) => c.enterprise_id)).size

            return {
                totalSales,
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
            return this.uniqueSales.filter((sale) => sale._has_projection && sale.contracts.every((c) => c._projection === true))
                .length
        }
    },

    actions: {
        setValueMode(mode) {
            this.valueMode = mode === 'gross' ? 'gross' : 'net'
        },
        toggleValueMode() {
            this.valueMode = this.valueMode === 'net' ? 'gross' : 'net'
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

            const pcs = Array.isArray(c.payment_conditions) ? c.payment_conditions.map(this._normalizePaymentCondition) : []

            const associates = Array.isArray(c.associates)
                ? c.associates.map((a) => ({
                    ...a,
                    participation_percentage: n(a.participation_percentage ?? a.participationPercentage)
                }))
                : []

            const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

            return {
                contract_id: n(c.contract_id ?? c.id),
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

        _normalizeProjectionRepasse(row, groupId) {
            const n = this._toNumber
            const value = n(row?.valor_previsto) || n(row?.valor_contrato) || 0
            return {
                _projection: true,
                _projection_tipo: 'repasses',
                _projection_group_id: groupId,

                contract_id: `PROJ-RP-${row.idrepasse || row.codigointerno_unidade || Math.random().toString(36).slice(2)}`,
                enterprise_id: n(row.codigointerno_empreendimento),
                enterprise_name: row.empreendimento || '',
                financial_institution_date: row.data_status_repasse || null,
                land_value: value,
                unit_name: row.unidade || '',
                unit_id: row.codigointerno_unidade || null,

                customer_id: null,
                customer_name: row?.titular?.nome || row?.cliente || '—',

                payment_conditions: [
                    {
                        condition_type_id: 'PROJ',
                        condition_type_name: 'Projeção de Repasse',
                        total_value: value,
                        installments_number: 1
                    }
                ],

                repasse: [row],
                reserva: null,
                links: []
            }
        },

        _normalizeProjectionReserva(row, groupId) {
            const n = this._toNumber
            const idempInt = row?.unidade_json?.idempreendimento_int
            const enterpriseId = idempInt ? Number(idempInt) : null

            const pcs = this._seriesToPaymentConditions(row?.condicoes?.series)
            const fallback = n(row?.condicoes?.total_proposta) || n(row?.condicoes?.valor_contrato) || n(row?.condicoes?.vgv_tabela) || 0

            return {
                _projection: true,
                _projection_tipo: 'reservas',
                _projection_group_id: groupId,

                contract_id: `PROJ-RS-${row.idreserva || row?.unidade_json?.idunidade_int || Math.random().toString(36).slice(2)}`,
                enterprise_id: enterpriseId,
                enterprise_name: row.empreendimento || '',
                financial_institution_date: row.data_reserva || null,
                land_value: fallback,
                unit_name: row.unidade || '',
                unit_id: row?.unidade_json?.idunidade_int || null,

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

            const res = await fetch(`${API_URL}/cv/workflow-grupos/${idgroup}/projecoes`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            })
            if (!res.ok) throw new Error(`Erro ao buscar projeções do grupo ${idgroup}: ${res.status}`)
            const data = await res.json()
            const { results = [], meta = {} } = data

            const tipo = (meta?.tipo || (results?.[0]?.idrepasse ? 'repasses' : 'reservas')).toString().toLowerCase()

            // ⚠️ mantém seu comportamento (corrigindo o bug aqui: repasses deve ir pra _normalizeProjectionRepasse)
            const normalized = results.map((r) => (tipo === 'repasses' ? this._normalizeProjectionRepasse(r, idgroup) : this._normalizeProjectionReserva(r, idgroup)))

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

            const groups = Array.isArray(this.selectedGroupIds) ? [...new Set(this.selectedGroupIds)].sort((a, b) => a - b).join(',') : ''

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
        },

        // ==========================
        // ✅ CACHE DETAIL POR EMPREENDIMENTO
        // ==========================
        _buildDetailCtxKey() {
            const f = this.filters || {}
            const start = f.startDate || ''
            const end = f.endDate || ''
            const sit = f.situation || 'Emitido'
            const names = Array.isArray(f.enterpriseName) ? f.enterpriseName.slice().sort().join('|') : ''
            const groups = Array.isArray(this.selectedGroupIds) ? [...new Set(this.selectedGroupIds)].sort((a, b) => a - b).join(',') : ''
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
        },

        // ==========================
        // API
        // ==========================
        async fetchContracts({ view = 'dashboard', enterpriseId = null, enterpriseIds = null, force = false } = {}) {
            const carregamentoStore = useCarregamentoStore()
            this.error = null

            const isDetail = String(view).toLowerCase() === 'detail'

            // ✅ detail: resolve via cache por enterprise_id (evita request unitário)
            if (isDetail && !force && enterpriseId != null) {
                const ctxKey = this._buildDetailCtxKey()
                const cachedDetail = this._getDetailFromCache(ctxKey, enterpriseId)
                if (cachedDetail) {
                    let projections = []
                    if (this.selectedGroupIds.length > 0) {
                        const all = await Promise.all(this.selectedGroupIds.map((id) => this._fetchProjectionsForGroup(id).catch(() => [])))
                        projections = all.flat()
                    }
                    this.contracts = [...cachedDetail, ...projections]
                    this.total = this.contracts.length
                    return
                }
            }

            // ✅ detail: se vier enterpriseIds, pede só os que faltam (se já tiver no cache)
            if (isDetail && !force && Array.isArray(enterpriseIds) && enterpriseIds.length > 0) {
                const ctxKey = this._buildDetailCtxKey()
                const ids = enterpriseIds.map(Number).filter(Number.isFinite)
                const missing = ids.filter((id) => !this._getDetailFromCache(ctxKey, id))

                if (missing.length === 0) {
                    const allCached = ids.flatMap((id) => this._getDetailFromCache(ctxKey, id) || [])
                    let projections = []
                    if (this.selectedGroupIds.length > 0) {
                        const all = await Promise.all(this.selectedGroupIds.map((gid) => this._fetchProjectionsForGroup(gid).catch(() => [])))
                        projections = all.flat()
                    }
                    this.contracts = [...allCached, ...projections]
                    this.total = this.contracts.length
                    return
                }

                // otimiza request: busca só o que falta
                enterpriseIds = missing
            }

            // ✅ mantém cache por request (bom pro dashboard + restore)
            const key = this._buildContractsCacheKey({ view, enterpriseId, enterpriseIds })

            if (!force) {
                const cached = this._getCachedContracts(key)
                if (cached) {
                    this.contracts = cached.contracts
                    this.total = cached.total
                    if (view === 'dashboard') this._lastDashboardKey = key
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

                const response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!response.ok) throw new Error(`Erro ao buscar contratos: ${response.status}`)

                const data = await response.json()
                const normalized = Array.isArray(data.results) ? data.results.map(this._normalizeContract) : []

                // ✅ indexa detail por empreendimento (para não buscar unitário depois)
                if (isDetail) {
                    const ctxKey = this._buildDetailCtxKey()
                    this._indexDetailIntoCache(ctxKey, normalized)
                }

                // projeções
                let projections = []
                if (this.selectedGroupIds.length > 0) {
                    const all = await Promise.all(this.selectedGroupIds.map((id) => this._fetchProjectionsForGroup(id).catch(() => [])))
                    projections = all.flat()
                }

                const merged = [...normalized, ...projections]
                const total = (data.count || 0) + (projections.length || 0)

                this.contracts = merged
                this.total = total

                this._setCachedContracts(key, { contracts: merged, total })
                if (view === 'dashboard') this._lastDashboardKey = key
            } catch (error) {
                this.error = error.message
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
            // mudou grupos => muda contexto do detail
            this.clearDetailCache()
            this.clearContractsCache()
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

                const toArray = (d) => (Array.isArray(d?.results) ? d.results : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [])
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
        },

        clearFilters() {
            this.filters = { startDate: '', endDate: '', situation: 'Emitido', enterpriseName: [] }
            this.selectedGroupIds = []
            this.clearContractsCache()
            this.clearDetailCache()
        }
    }
})
