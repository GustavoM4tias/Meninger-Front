// stores/contractsStore.js
import { defineStore } from 'pinia'
import { useCarregamentoStore } from '@/stores/Config/carregamento'
import API_URL from '@/config/apiUrl'
import { useHiddenEnterprisesStore } from '@/stores/Comercial/Contracts/hiddenEnterprisesStore'
import { useStageCommissionRulesStore } from '@/stores/Comercial/Contracts/stageCommissionRulesStore'

// ─── Debug helpers ──────────────────────────────────────────────────────────
const DEBUG = true
const DEBUG_PROJECTIONS = true
const log = (...a) => { if (DEBUG) console.log('[contractsStore]', ...a) }
const logProj = (...a) => { if (DEBUG && DEBUG_PROJECTIONS) console.log('[contractsStore][PROJ]', ...a) }

// ─── Business-rule constants ─────────────────────────────────────────────────
const ENTERPRISE_OVERRIDES = {
    byId: {
        17004: { gross: 'LAND_VALUE_ONLY', net: 'LAND_VALUE_ONLY' }
    },
    byName: {
        'JACAREZINHO/PR - RESIDENCIAL PARQUE DOS IPÊS - COMERCIAL/INCORPORAÇÃO/ESTOQUE': {
            gross: 'LAND_VALUE_ONLY',
            net: 'LAND_VALUE_ONLY'
        }
    }
}

const ENTERPRISE_COMMISSION_RULES = {
    byId: {
        80001: { commission_pct: 0.04 }
    }
}

const DISCOUNT_CODES = new Set(['DC', 'DESCONTO_CONSTRUTORA'])

// ─── Pure helpers (no this) ──────────────────────────────────────────────────
function toNumber(v) {
    if (v === null || v === undefined || v === '') return 0
    if (typeof v === 'number') return v
    if (typeof v === 'string') {
        const s = v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v
        const n = Number(s.replace(/[^\d.-]/g, ''))
        return Number.isFinite(n) ? n : 0
    }
    return Number.isFinite(Number(v)) ? Number(v) : 0
}

function parseLeadingNumber(v) {
    if (v === null || v === undefined) return null
    if (typeof v === 'number') return Number.isFinite(v) ? v : null
    const s = String(v).trim()
    if (!s) return null
    const m = s.match(/(\d{2,})/)
    if (!m) return null
    const n = Number(m[1])
    return Number.isFinite(n) ? n : null
}

function isTRCondition(pc) {
    if (!pc) return false
    const id = String(pc.condition_type_id ?? '').trim().toUpperCase()
    const name = String(pc.condition_type_name ?? '').trim().toUpperCase()
    return id === 'TR' || name === 'TR' || name.includes('TERRENO')
}

function isDiscountCondition(pc) {
    return DISCOUNT_CODES.has(String(pc?.condition_type_id ?? '').toUpperCase())
}

function contractTotals(contract) {
    const pcs = Array.isArray(contract.payment_conditions) ? contract.payment_conditions : []
    let full = 0
    let dcAbs = 0
    for (const pc of pcs) {
        const v = toNumber(pc.total_value)
        if (isDiscountCondition(pc)) dcAbs += Math.abs(v)
        else full += v
    }
    return { net: full, gross: full + dcAbs }
}

function overrideRuleFor(c) {
    if (c?._projection) return null
    const norm = (s) => (s || '').trim().toUpperCase()
    return ENTERPRISE_OVERRIDES.byId[c?.enterprise_id]
        || ENTERPRISE_OVERRIDES.byName[norm(c?.enterprise_name)]
        || null
}

function commissionRuleFor(c) {
    if (c?._projection) return null
    const norm = (s) => (s || '').trim().toUpperCase()
    return ENTERPRISE_COMMISSION_RULES.byId[c?.enterprise_id]
        || ENTERPRISE_COMMISSION_RULES.byName?.[norm(c?.enterprise_name)]
        || null
}

// ─── Stage-history helper ────────────────────────────────────────────────────
// Returns true if any repasse linked to this contract ever had the given CV situacao ID.
// The `status` JSONB array on each repasse stores snapshots: { idsituacao_repasse, ... }
function contractHadStageInHistory(contract, stageId) {
    const repasses = Array.isArray(contract?.repasse) ? contract.repasse : []
    const stageNum = Number(stageId)
    if (!Number.isFinite(stageNum)) return false
    for (const rp of repasses) {
        if (!rp) continue
        // Current stage
        if (Number(rp.idsituacao_repasse) === stageNum) return true
        // Historical snapshots captured by the sync service
        const history = Array.isArray(rp.status) ? rp.status : []
        if (history.some(s => Number(s?.idsituacao_repasse) === stageNum)) return true
    }
    return false
}

// ─── Enterprise ID extraction from projection rows ────────────────────────────
function extractEnterpriseIdFromProjectionRow(row) {
    // Priority 1: ERP-resolved ID (Sienge) — only reliable ID for Sienge lookups
    const erp = parseLeadingNumber(row?.idemp_erp_resolvido)
    if (erp != null) return erp

    // Priority 2: Internal ID from unit JSON (may be CV or Sienge depending on integration)
    const fromUnit = parseLeadingNumber(row?.idemp_int_from_reserva)
        ?? parseLeadingNumber(row?.codigointerno_empreendimento)
        ?? parseLeadingNumber(row?.codigointernoEmpreendimento)
        ?? parseLeadingNumber(row?.unidade_json?.idempreendimento_int)
        ?? parseLeadingNumber(row?.unidadeJson?.idempreendimento_int)
    if (fromUnit != null) return fromUnit

    // Priority 3: Already-named fields
    return parseLeadingNumber(row?.enterprise_id) ?? parseLeadingNumber(row?.enterpriseId) ?? null
}

function extractCompanyFromProjectionRow(row) {
    // Priority 1: Backend-resolved company (new: empresa_id / empresa_nome from SQL CTE)
    const cid =
        parseLeadingNumber(row?.empresa_id) ??
        parseLeadingNumber(row?.empresa_correspondente?.id) ??
        parseLeadingNumber(row?.empresa_correspondente?.company_id) ??
        parseLeadingNumber(row?.company_id) ??
        parseLeadingNumber(row?.companyId) ??
        parseLeadingNumber(row?.empresa_id) ??
        parseLeadingNumber(row?.empresaId) ??
        parseLeadingNumber(row?.idempresa) ??
        parseLeadingNumber(row?.codigo_empresa) ??
        parseLeadingNumber(row?.codigointerno_empresa)

    const cname =
        row?.empresa_nome ??
        row?.company_name ??
        row?.companyName ??
        row?.empresa_nome ??
        row?.empresaNome ??
        row?.nome_empresa ??
        row?.nomeEmpresa ??
        null

    return {
        company_id: cid ?? null,
        company_name: cname != null ? String(cname).trim() : null
    }
}

// ─── Store ───────────────────────────────────────────────────────────────────
export const useContractsStore = defineStore('contracts', {
    state: () => ({
        contracts: [],
        enterprises: [],
        companies: [],
        groupBy: 'company', // 'enterprise' | 'company'
        total: 0,
        error: null,
        valueMode: 'net',   // 'net' | 'gross'

        filters: {
            startDate: '',
            endDate: '',
            situation: 'Emitido',
            enterpriseName: [],
            companyIds: []
        },

        workflowGroups: [],
        selectedGroupIds: [],
        enterpriseCities: [],

        // Permanent map: Sienge enterpriseId -> { company_id, company_name }
        _enterpriseCompanyMap: new Map(),

        // Projection cache: groupId -> normalized[]
        _projCache: new Map(),

        // Dashboard contracts cache
        _contractsCache: new Map(),
        _cacheTTLms: 1000 * 60 * 5,
        _lastDashboardKey: null,

        // Detail cache per enterprise
        _detailByEnterprise: new Map(),
        _detailTTLms: 1000 * 60 * 10
    }),

    // =========================================================================
    // GETTERS
    // =========================================================================
    getters: {

        // ── Value mode ─────────────────────────────────────────────────────
        valueModeLabel: (s) => (s.valueMode === 'net' ? 'VGV' : 'VGV + DC'),
        isGross: (s) => s.valueMode === 'gross',
        isNet: (s) => s.valueMode === 'net',
        valuePicker: (s) => (obj) =>
            (s.valueMode === 'net' ? obj?.total_value_net : obj?.total_value_gross) ?? 0,

        // ── Totals ─────────────────────────────────────────────────────────
        totalSales() { return this.uniqueSales.length },
        totalValueNet() {
            return this.uniqueSales.reduce((s, x) => s + (Number(x.total_value_net) || 0), 0)
        },
        totalValueGross() {
            return this.uniqueSales.reduce((s, x) => s + (Number(x.total_value_gross) || 0), 0)
        },
        projectionContractsCount: (s) => s.contracts.filter((c) => c._projection).length,
        projectionItemsCount() {
            return this.uniqueSales.filter(
                (sale) => sale._has_projection && sale.contracts.every((c) => c._projection)
            ).length
        },

        // ── Enterprise overrides (kept for rule access in getters below) ───
        enterpriseOverrides: () => ENTERPRISE_OVERRIDES,
        enterpriseCommissionRules: () => ENTERPRISE_COMMISSION_RULES,
        enterpriseRuleFor: () => (c) => overrideRuleFor(c),
        enterpriseCommissionFor: () => (c) => commissionRuleFor(c),
        isLandOnlyForContract() {
            return (c) => {
                const rule = overrideRuleFor(c)
                if (!rule) return false
                return (this.isGross && rule.gross === 'LAND_VALUE_ONLY') ||
                       (this.isNet && rule.net === 'LAND_VALUE_ONLY')
            }
        },

        // ── Map: Sienge enterprise_id -> company (built from current real contracts) ──
        enterpriseToCompanyMap() {
            const map = new Map()
            for (const c of this.contracts) {
                if (c._projection) continue
                const eid = Number(c.enterprise_id)
                if (!Number.isFinite(eid)) continue
                const cid = c.company_id != null ? Number(c.company_id) : null
                if (!map.has(eid)) map.set(eid, { company_id: cid, company_name: c.company_name ?? null })
            }
            return map
        },

        // ── Unique sales (contracts grouped by customer+unit+enterprise+company) ──
        uniqueSales() {
            const salesMap = new Map()

            const makeKey = (c) => {
                const cust = c.customer_id ?? 'NULL'
                const unitId = (c.unit_id != null && c.unit_id !== '') ? String(c.unit_id) : 'NULL'
                const unitName = (c.unit_name || '').trim().toUpperCase() || 'NULL'
                const ent = (c.enterprise_id != null && c.enterprise_id !== '') ? String(c.enterprise_id) : 'NULL'
                const comp = (c.company_id != null && c.company_id !== '') ? String(c.company_id) : 'NULL'
                return `${cust}__${ent}__${comp}__${unitId}__${unitName}`
            }

            const cloneContract = (c) => ({
                ...c,
                payment_conditions: Array.isArray(c.payment_conditions) ? [...c.payment_conditions] : []
            })

            // Filter hidden enterprises (admin-configured)
            let visibleContracts = this.contracts
            try {
                const hiddenStore = useHiddenEnterprisesStore()
                if (hiddenStore.hiddenIds.size > 0) {
                    visibleContracts = this.contracts.filter(
                        (c) => !hiddenStore.hiddenIds.has(Number(c.enterprise_id))
                    )
                }
            } catch { /* store may not be ready yet */ }

            // 1) Group by composite key
            for (const contract of visibleContracts) {
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
            }

            // 2) Synthetic TR condition + sort contracts within each sale
            for (const sale of salesMap.values()) {
                const realContracts = sale.contracts.filter((c) => !c._projection)
                if (realContracts.length === 0) continue

                const groupHasTRReal = realContracts.some(
                    (c) => Array.isArray(c.payment_conditions) && c.payment_conditions.some(isTRCondition)
                )
                const sumLandReal = realContracts.reduce((acc, c) => acc + (Number(c.land_value) || 0), 0)

                for (const rc of realContracts) {
                    rc._group_has_tr_real = groupHasTRReal
                    rc._group_land_sum_real = sumLandReal
                }

                // Inject synthetic TR when no TR condition exists but land_value is present
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

                // Sort: repasse first, then financial, then by id
                const isFin = (c) =>
                    Array.isArray(c.payment_conditions) &&
                    c.payment_conditions.some((pc) => {
                        const id = String(pc.condition_type_id ?? '').toUpperCase()
                        return id === 'FI' || id === 'RP'
                    })

                sale.contracts.sort((a, b) => {
                    const aHasRepasse = Array.isArray(a.repasse) && a.repasse.length > 0
                    const bHasRepasse = Array.isArray(b.repasse) && b.repasse.length > 0
                    if (aHasRepasse !== bHasRepasse) return bHasRepasse - aHasRepasse
                    if (isFin(a) !== isFin(b)) return isFin(b) - isFin(a)
                    return String(a.contract_id ?? '').localeCompare(String(b.contract_id ?? ''))
                })

                const main = sale.contracts[0] || {}
                sale.enterprise_name = main.enterprise_name
                sale.enterprise_id = main.enterprise_id
                sale.company_id = main.company_id
                sale.company_name = main.company_name
                sale.financial_institution_date = main.financial_institution_date
            }

            // 3) Compute totals per sale (respecting enterprise overrides and commission rules)
            for (const sale of salesMap.values()) {
                const real = sale.contracts.filter((c) => !c._projection)
                const projs = sale.contracts.filter((c) => c._projection)

                const matched = real.filter((c) => !!overrideRuleFor(c))
                const others = real.filter((c) => !overrideRuleFor(c))
                const rule = matched.length ? overrideRuleFor(matched[0]) : null

                let matchedGross = matched.reduce((acc, c) => acc + contractTotals(c).gross, 0)
                let matchedNet = matched.reduce((acc, c) => acc + contractTotals(c).net, 0)
                const othersGross = others.reduce((acc, c) => acc + contractTotals(c).gross, 0)
                const othersNet = others.reduce((acc, c) => acc + contractTotals(c).net, 0)

                if (rule?.gross === 'LAND_VALUE_ONLY') {
                    matchedGross = matched.reduce((acc, c) => acc + (Number(c.land_value) || 0), 0)
                }
                if (rule?.net === 'LAND_VALUE_ONLY') {
                    matchedNet = matched.reduce((acc, c) => acc + (Number(c.land_value) || 0), 0)
                }
                if (rule?.net === 'TR_ONLY') {
                    matchedNet = matched.reduce((acc, c) => {
                        const pcs = Array.isArray(c.payment_conditions) ? c.payment_conditions : []
                        return acc + pcs.filter(isTRCondition).reduce((s, pc) => s + (Number(pc.total_value) || 0), 0)
                    }, 0)
                }

                // Commission uplift
                const uplift = (base, pct) => (pct > 0 ? base * (pct / (1 - pct)) : 0)
                const baseGrossOf = (c) => {
                    const r = overrideRuleFor(c) || {}
                    if (r.gross === 'LAND_VALUE_ONLY') return Number(c.land_value) || 0
                    return contractTotals(c).gross
                }
                const baseNetOf = (c) => {
                    const r = overrideRuleFor(c) || {}
                    if (r.net === 'TR_ONLY') {
                        const pcs = Array.isArray(c.payment_conditions) ? c.payment_conditions : []
                        return pcs.filter(isTRCondition).reduce((s, pc) => s + (Number(pc.total_value) || 0), 0)
                    }
                    if (r.net === 'LAND_VALUE_ONLY') return Number(c.land_value) || 0
                    return contractTotals(c).net
                }

                // Resolve commission pct: hardcoded rules first, then dynamic stage-based rules.
                // Dynamic rules check if the contract's repasse ever passed through a specific CV stage.
                // If no rule applies the pct is 0 and no uplift is added — identical to the old behaviour.
                let _dynamicRulesByEid = null
                const getDynamicRulesForEnterprise = (eid) => {
                    if (_dynamicRulesByEid === null) {
                        try {
                            _dynamicRulesByEid = useStageCommissionRulesStore().rulesByEnterprise
                        } catch { _dynamicRulesByEid = new Map() }
                    }
                    return _dynamicRulesByEid.get(Number(eid)) || []
                }

                const resolveCommissionPct = (c) => {
                    // 1) Existing hardcoded rules — preserved exactly
                    const hardcoded = commissionRuleFor(c)
                    if (hardcoded) return Number(hardcoded.commission_pct) || 0

                    // 2) Dynamic stage-based rules from DB
                    if (c?._projection) return 0
                    const eid = Number(c?.enterprise_id)
                    if (!Number.isFinite(eid) || eid <= 0) return 0
                    for (const rule of getDynamicRulesForEnterprise(eid)) {
                        if (contractHadStageInHistory(c, rule.stage_id)) {
                            return Number(rule.commission_pct) || 0
                        }
                    }
                    return 0
                }

                let addGross = 0
                let addNet = 0
                for (const c of real) {
                    const pct = resolveCommissionPct(c)
                    if (pct > 0) {
                        addGross += uplift(baseGrossOf(c), pct)
                        addNet += uplift(baseNetOf(c), pct)
                    }
                }

                const projsGross = projs.reduce((acc, c) => acc + contractTotals(c).gross, 0)
                const projsNet = projs.reduce((acc, c) => acc + contractTotals(c).net, 0)

                sale.total_value_gross = othersGross + matchedGross + addGross + projsGross
                sale.total_value_net = othersNet + matchedNet + addNet + projsNet
                sale._has_projection = projs.length > 0
                sale._realContracts = real
                sale._projContracts = projs
            }

            return Array.from(salesMap.values())
        },

        // ── Dashboard: group by enterprise (fase/modulo) ───────────────────
        salesByEnterprise() {
            const pick = this.valuePicker
            const keyOf = (id, name) =>
                id != null ? `ID:${id}` : `NAME:${(name || '').trim().toUpperCase()}`

            const unique = this.uniqueSales
            const real = unique.filter((s) => s.contracts.some((c) => !c._projection))
            const proj = unique.filter((s) => s.contracts.every((c) => c._projection))

            // Build real rows map (keyed by enterprise_id or name)
            const realMap = new Map()
            for (const s of real) {
                const first = s.contracts.find((c) => !c._projection) || s.contracts[0] || {}
                const id = first.enterprise_id ?? null
                const name = first.enterprise_name || s.enterprise_name || '—'
                const key = keyOf(id, name)

                const row = realMap.get(key) || {
                    id, enterprise_id: id, name,
                    count: 0, total_value_net: 0, total_value_gross: 0,
                    proj_count: 0, proj_value_net: 0, proj_value_gross: 0,
                    onlyProjectionRow: false, key
                }
                row.count += 1
                row.total_value_net += Number(s.total_value_net) || 0
                row.total_value_gross += Number(s.total_value_gross) || 0
                realMap.set(key, row)
            }

            // Helper: resolve which real-enterprise key a projection belongs to.
            // Mirrors the same cascading strategy used in salesByCompany.
            const resolveRealKeyForProj = (s) => {
                const first = s.contracts[0] || {}
                const id = first.enterprise_id ?? null

                // Strategy 1: direct enterprise_id match (works when backend correctly resolves idemp_erp_resolvido)
                if (id != null) {
                    const direct = [...realMap.keys()].find((k) => realMap.get(k)?.id === id)
                    if (direct) return direct
                }

                // Strategy 2: name-prefix/contains match (fallback when backend resolves null)
                // "TERRAS DE SÃO PAULO V" ⊂ "MARILIA/SP - TERRAS DE SÃO PAULO V - FASE 3 ..."
                const projName = (first.enterprise_name || s.enterprise_name || '').toUpperCase().trim()
                if (!projName) return null

                const candidates = []
                for (const [k, row] of realMap) {
                    const realName = (row.name || '').toUpperCase().trim()
                    if (realName.includes(projName) || projName.includes(realName)) {
                        candidates.push(k)
                    }
                }

                if (candidates.length === 1) return candidates[0]

                // Multiple candidates: use company_id to narrow down
                if (candidates.length > 1 && first.company_id != null) {
                    const companyFiltered = candidates.filter((k) => {
                        const row = realMap.get(k)
                        // Find any real contract for this enterprise with the same company
                        return this.contracts.some(
                            (c) => !c._projection
                                && Number(c.enterprise_id) === row.id
                                && Number(c.company_id) === Number(first.company_id)
                        )
                    })
                    if (companyFiltered.length === 1) return companyFiltered[0]
                }

                // Ambiguous — don't guess
                return null
            }

            // Merge projections: into real row if resolvable, else orphan row
            const outMap = new Map(realMap)
            for (const s of proj) {
                const first = s.contracts[0] || {}
                const resolvedKey = resolveRealKeyForProj(s)

                if (resolvedKey) {
                    // Append to existing real row (same pattern as company view)
                    const row = outMap.get(resolvedKey)
                    row.proj_count += 1
                    row.proj_value_net += Number(s.total_value_net) || 0
                    row.proj_value_gross += Number(s.total_value_gross) || 0
                } else {
                    // Truly unresolvable: orphan projection-only row
                    const id = first.enterprise_id ?? null
                    const name = first.enterprise_name || s.enterprise_name || '—'
                    const projKey = `${keyOf(id, name)}__PROJ`

                    const row = outMap.get(projKey) || {
                        id, enterprise_id: id, name,
                        count: 0, total_value_net: 0, total_value_gross: 0,
                        proj_count: 0, proj_value_net: 0, proj_value_gross: 0,
                        onlyProjectionRow: true,
                        key: projKey
                    }
                    row.count += 1
                    row.total_value_net += Number(s.total_value_net) || 0
                    row.total_value_gross += Number(s.total_value_gross) || 0
                    outMap.set(projKey, row)
                }
            }

            return [...outMap.values()]
                .map((r) => ({
                    ...r,
                    __combined: (pick(r) || 0) + (this.isNet ? r.proj_value_net : r.proj_value_gross)
                }))
                .sort((a, b) => b.__combined - a.__combined)
        },

        // ── Dashboard: group by company ────────────────────────────────────
        salesByCompany() {
            const pick = this.valuePicker
            const normStr = (s) => (s || '').trim()

            const unique = this.uniqueSales
            const real = unique.filter((s) => s.contracts.some((c) => !c._projection))
            const proj = unique.filter((s) => s.contracts.every((c) => c._projection))

            const byCompany = new Map()

            const ensure = (companyId, companyName) => {
                const key = companyId != null
                    ? `COMPANY:${companyId}`
                    : `COMPANY:__NULL__:${normStr(companyName)}`
                if (!byCompany.has(key)) {
                    byCompany.set(key, {
                        key,
                        id: companyId ?? null,
                        company_id: companyId ?? null,
                        name: normStr(companyName) || (companyId != null ? `Empresa ${companyId}` : 'Sem Empresa'),
                        count: 0, total_value_net: 0, total_value_gross: 0,
                        proj_count: 0, proj_value_net: 0, proj_value_gross: 0,
                        onlyProjectionRow: false,
                        enterpriseIds: new Set()
                    })
                }
                return byCompany.get(key)
            }

            // 1) Aggregate real sales by company
            for (const s of real) {
                const first = s.contracts.find((c) => !c._projection) || s.contracts[0] || {}
                const row = ensure(first.company_id ?? null, first.company_name ?? null)
                row.count += 1
                row.total_value_net += Number(s.total_value_net) || 0
                row.total_value_gross += Number(s.total_value_gross) || 0
                for (const c of s.contracts) {
                    if (c._projection) continue
                    const eid = Number(c.enterprise_id)
                    if (Number.isFinite(eid) && eid > 0) row.enterpriseIds.add(eid)
                }
            }

            // Helper: resolve company for a projection sale using all available strategies
            const resolveCompanyForProj = (s) => {
                const first = s.contracts[0] || {}

                // Strategy 1: company already set on the projection (from backend resolver)
                if (first.company_id != null || first.company_name) {
                    return { company_id: first.company_id ?? null, company_name: first.company_name ?? null }
                }

                const eid = Number(first.enterprise_id)
                const hasValidEid = Number.isFinite(eid) && eid > 0

                // Strategy 2: look up enterprise_id in Sienge->company maps
                if (hasValidEid) {
                    const comp = this.enterpriseToCompanyMap.get(eid)
                        ?? this._enterpriseCompanyMap.get(eid)
                        ?? null
                    if (comp && (comp.company_id != null || comp.company_name)) return comp

                    // Strategy 3: find a real-company row that already tracks this enterprise_id
                    for (const row of byCompany.values()) {
                        if (row.enterpriseIds.has(eid)) {
                            return { company_id: row.company_id, company_name: row.name }
                        }
                    }
                }

                // Strategy 4: name-prefix matching
                // Projections often have a shorter/general enterprise name (e.g. "TERRAS DE SÃO PAULO")
                // while real contracts have fase-specific names (e.g. "TERRAS DE SÃO PAULO V - FASE 1")
                const projName = (first.enterprise_name || s.enterprise_name || '').toUpperCase().trim()
                if (projName) {
                    // Build a prefix index from current contracts if needed
                    for (const c of this.contracts) {
                        if (c._projection) continue
                        if (!c.company_id || !c.enterprise_name) continue
                        const realName = c.enterprise_name.toUpperCase().trim()
                        // Check: real enterprise name starts with projection enterprise name OR vice-versa
                        if (realName.startsWith(projName) || projName.startsWith(realName)) {
                            return { company_id: c.company_id, company_name: c.company_name ?? null }
                        }
                    }
                }

                return null // unresolved
            }

            // 2) Aggregate projections by company
            for (const s of proj) {
                const resolved = resolveCompanyForProj(s)

                if (resolved) {
                    const row = ensure(resolved.company_id, resolved.company_name)
                    row.proj_count += 1
                    row.proj_value_net += Number(s.total_value_net) || 0
                    row.proj_value_gross += Number(s.total_value_gross) || 0
                } else {
                    // Fallback: orphan projection-only row, keyed by enterprise name
                    const first = s.contracts[0] || {}
                    const ename = (first.enterprise_name || s.enterprise_name || 'Sem vínculo').trim()
                    const key = `COMPANY:PROJ:NAME:${ename.toUpperCase()}`

                    if (!byCompany.has(key)) {
                        byCompany.set(key, {
                            key,
                            id: null, company_id: null,
                            name: ename,
                            count: 0, total_value_net: 0, total_value_gross: 0,
                            proj_count: 0, proj_value_net: 0, proj_value_gross: 0,
                            onlyProjectionRow: true,
                            enterpriseIds: new Set()
                        })
                    }
                    const row = byCompany.get(key)
                    row.count += 1
                    row.total_value_net += Number(s.total_value_net) || 0
                    row.total_value_gross += Number(s.total_value_gross) || 0
                }
            }

            // 3) Finalise
            return [...byCompany.values()]
                .map((r) => ({
                    ...r,
                    enterpriseIds: [...r.enterpriseIds].filter((x) => Number.isFinite(x) && x > 0),
                    __combined: (pick(r) || 0) + (this.isNet ? r.proj_value_net : r.proj_value_gross)
                }))
                .sort((a, b) => b.__combined - a.__combined)
        },

        salesDashboard() {
            return this.groupBy === 'company' ? this.salesByCompany : this.salesByEnterprise
        },

        salesByMonth() {
            const monthMap = new Map()
            for (const sale of this.uniqueSales) {
                const date = new Date(sale.financial_institution_date)
                if (isNaN(date)) continue
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                const row = monthMap.get(key) || { month: key, count: 0, total_value_net: 0, total_value_gross: 0 }
                row.count += 1
                row.total_value_net += Number(sale.total_value_net) || 0
                row.total_value_gross += Number(sale.total_value_gross) || 0
                monthMap.set(key, row)
            }
            return [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month))
        },

        topCustomers() {
            const map = new Map()
            for (const sale of this.uniqueSales) {
                const row = map.get(sale.customer_id) || {
                    customer_id: sale.customer_id,
                    customer_name: sale.customer_name,
                    sales_count: 0, total_value_net: 0, total_value_gross: 0
                }
                row.sales_count += 1
                row.total_value_net += Number(sale.total_value_net) || 0
                row.total_value_gross += Number(sale.total_value_gross) || 0
                map.set(sale.customer_id, row)
            }
            return [...map.values()]
                .sort((a, b) => b.total_value_net - a.total_value_net)
                .slice(0, 10)
        },

        metrics() {
            const unique = this.uniqueSales
            const totalSales = this.totalSales
            const totalValueNet = unique.reduce((s, x) => s + (Number(x.total_value_net) || 0), 0)
            const totalValueGross = unique.reduce((s, x) => s + (Number(x.total_value_gross) || 0), 0)
            return {
                totalSales,
                totalSalesWithProjections: this.projectionItemsCount,
                totalValueNet, totalValueGross,
                avgSaleValueNet: totalSales > 0 ? totalValueNet / totalSales : 0,
                avgSaleValueGross: totalSales > 0 ? totalValueGross / totalSales : 0,
                totalValue: totalValueNet,
                avgSaleValue: totalSales > 0 ? totalValueNet / totalSales : 0,
                totalEnterprises: new Set(this.contracts.map((c) => c.enterprise_id)).size,
                totalContracts: this.contracts.length
            }
        },

        workflowGroupOptions(state) {
            return (state.workflowGroups || []).map((g) => ({
                label: `${g.tipo === 'reservas' ? 'Reserva' : 'Repasse'} • ${g.nome}`,
                value: String(g.idgroup)
            }))
        },

        discountCodes: () => DISCOUNT_CODES,

        // compat aliases
        _contractTotals: () => (contract) => contractTotals(contract)
    },

    // =========================================================================
    // ACTIONS
    // =========================================================================
    actions: {

        // ── Value mode ─────────────────────────────────────────────────────
        setValueMode(mode) {
            this.valueMode = mode === 'gross' ? 'gross' : 'net'
        },
        toggleValueMode() {
            this.valueMode = this.valueMode === 'net' ? 'gross' : 'net'
        },
        setGroupBy(mode) {
            this.groupBy = mode === 'company' ? 'company' : 'enterprise'
            this.clearContractsCache()
        },
        setFilters(filters) {
            this.filters = { ...this.filters, ...filters }
            this.clearContractsCache()
            this.clearDetailCache()
        },
        clearFilters() {
            this.filters = { startDate: '', endDate: '', situation: 'Emitido', enterpriseName: [], companyIds: [] }
            this.selectedGroupIds = []
            this.clearContractsCache()
            this.clearDetailCache()
        },
        setSelectedGroups(ids) {
            const newIds = (Array.isArray(ids) ? ids.map(Number).filter(Number.isFinite) : [])
                .sort((a, b) => a - b)
            const prevIds = [...this.selectedGroupIds].sort((a, b) => a - b)
            const changed = newIds.join(',') !== prevIds.join(',')

            this.selectedGroupIds = newIds
            // Only clear projection cache when the actual group selection changes.
            // This preserves cached projections when only dates/company change,
            // avoiding redundant re-fetches of the heavy projection queries.
            if (changed) this._projCache.clear()
            this.clearDetailCache()
            this.clearContractsCache()
        },

        // ── Compat accessor (used in EnterprisesSalesTable) ────────────────
        _isTR: (pc) => isTRCondition(pc),
        _toNumber: (v) => toNumber(v),
        _parseLeadingNumber: (v) => parseLeadingNumber(v),

        // ── Normalisation helpers ─────────────────────────────────────────
        _normalizePaymentCondition(pc) {
            return {
                condition_type_id: pc.condition_type_id ?? pc.conditionTypeId ?? null,
                condition_type_name: pc.condition_type_name ?? pc.conditionTypeName ?? null,
                total_value: toNumber(pc.total_value ?? pc.totalValue),
                total_value_interest: toNumber(pc.total_value_interest ?? pc.totalValueInterest),
                outstanding_balance: toNumber(pc.outstanding_balance ?? pc.outstandingBalance),
                amount_paid: toNumber(pc.amount_paid ?? pc.amountPaid),
                base_date: pc.base_date ?? pc.baseDate ?? null,
                first_payment: pc.first_payment ?? pc.firstPayment ?? null,
                indexer_name: pc.indexer_name ?? pc.indexerName ?? null,
                bearer_name: pc.bearer_name ?? pc.bearerName ?? null,
                interest_type: pc.interest_type ?? pc.interestType ?? null,
                installments_number: toNumber(pc.installments_number ?? pc.installmentsNumber)
            }
        },

        _normalizeContract(c) {
            const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
            const rawId = c.contract_id ?? c.id ?? ''
            const contract_id = String(rawId ?? '')

            const pcs = Array.isArray(c.payment_conditions)
                ? c.payment_conditions.map(this._normalizePaymentCondition.bind(this))
                : []

            const associates = Array.isArray(c.associates)
                ? c.associates.map((a) => ({
                    ...a,
                    participation_percentage: toNumber(a.participation_percentage ?? a.participationPercentage)
                }))
                : []

            return {
                contract_id,
                company_id: (c.company_id ?? c.companyId) != null ? toNumber(c.company_id ?? c.companyId) : null,
                company_name: c.company_name ?? c.companyName ?? null,
                enterprise_id: toNumber(c.enterprise_id ?? c.enterpriseId),
                enterprise_name: c.enterprise_name ?? c.enterpriseName ?? '',
                financial_institution_date: c.financial_institution_date ?? c.financialInstitutionDate ?? null,
                land_value: toNumber(c.land_value ?? c.landValue),
                unit_name: c.unit_name ?? c.unitName ?? '',
                unit_id: c.unit_id ?? c.unitId ?? '',
                customer_id: toNumber(c.customer_id ?? c.customerId),
                customer_name: c.customer_name ?? c.customerName ?? '',
                participation_percentage: toNumber(c.participation_percentage ?? c.participationPercentage),
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
            const out = []
            for (const s of series || []) {
                const qty = toNumber(s?.quantidade) || 1
                const val = toNumber(s?.valor) || 0
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

        // ── Projection normalisation ─────────────────────────────────────
        _normalizeProjectionRepasse(row, groupId) {
            const enterpriseId = extractEnterpriseIdFromProjectionRow(row)
            const directCompany = extractCompanyFromProjectionRow(row)
            const permMapped = enterpriseId != null ? this._enterpriseCompanyMap.get(Number(enterpriseId)) : null

            const company_id = directCompany.company_id ?? permMapped?.company_id ?? null
            const company_name = directCompany.company_name ?? permMapped?.company_name ?? null

            const fallbackValue =
                toNumber(row?.valor_previsto) ||
                toNumber(row?.valor_contrato) ||
                toNumber(row?.condicoes?.total_proposta) ||
                toNumber(row?.condicoes?.valor_contrato) ||
                toNumber(row?.condicoes?.vgv_tabela) ||
                0

            const series =
                row?.condicoes?.series ||
                row?.reserva?.condicoes?.series ||
                row?.reserva_obj?.condicoes?.series ||
                null

            let pcs = this._seriesToPaymentConditions(series)
            if (!pcs.length) {
                pcs = [{
                    condition_type_id: 'PROJ',
                    condition_type_name: 'Projeção de Repasse',
                    total_value: fallbackValue,
                    installments_number: 1,
                    base_date: row?.data_status_repasse || row?.dataStatusRepasse || null,
                    synthetic: true
                }]
            }

            const embeddedReserva = row?.reserva || row?.reserva_obj || row?.reservaObj || null
            const idreserva = row?.idreserva ?? embeddedReserva?.idreserva ?? null

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
            const projId = row?.idrepasse || row?.codigointerno_unidade || Math.random().toString(36).slice(2)

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
                land_value: fallbackValue,
                unit_name: row?.unidade || row?.unit_name || '',
                unit_id: row?.codigointerno_unidade || row?.codigointernoUnidade || null,
                customer_id: null,
                customer_name: row?.titular?.nome || row?.cliente || '—',
                payment_conditions: pcs,
                repasse: [{ ...row, reserva: reservaFinal ?? row?.reserva ?? null }],
                reserva: reservaFinal,
                links: []
            }
        },

        _normalizeProjectionReserva(row, groupId) {
            const enterpriseId = extractEnterpriseIdFromProjectionRow(row)
            const directCompany = extractCompanyFromProjectionRow(row)
            const permMapped = enterpriseId != null ? this._enterpriseCompanyMap.get(Number(enterpriseId)) : null

            const company_id = directCompany.company_id ?? permMapped?.company_id ?? null
            const company_name = directCompany.company_name ?? permMapped?.company_name ?? null

            let pcs = this._seriesToPaymentConditions(row?.condicoes?.series)
            const fallback =
                toNumber(row?.condicoes?.total_proposta) ||
                toNumber(row?.condicoes?.valor_contrato) ||
                toNumber(row?.condicoes?.vgv_tabela) ||
                0

            if (!pcs.length) {
                pcs = [{
                    condition_type_id: 'PROJ',
                    condition_type_name: 'Projeção de Reserva',
                    total_value: fallback,
                    installments_number: 1,
                    base_date: row?.data_reserva || row?.dataReserva || null,
                    synthetic: true
                }]
            }

            const projId = row.idreserva
                || row?.unidade_json?.idunidade_int
                || Math.random().toString(36).slice(2)

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
                land_value: fallback,
                unit_name: row.unidade || row?.unit_name || '',
                unit_id: row?.unidade_json?.idunidade_int || null,
                customer_id: null,
                customer_name: row?.titular?.nome || row?.cliente || row?.comprador || '—',
                payment_conditions: pcs,
                repasse: [],
                reserva: row,
                links: []
            }
        },

        // ── Projection fetching ──────────────────────────────────────────
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

            if (!res.ok) throw new Error(`Erro ao buscar projeções do grupo ${idgroup}: ${res.status}`)

            const data = await res.json()
            const { results = [], meta = {} } = data

            logProj('response meta:', meta, 'results:', results.length)

            if (results[0]) {
                logProj('first row empresa fields:', {
                    empresa_id: results[0]?.empresa_id ?? null,
                    empresa_nome: results[0]?.empresa_nome ?? null,
                    idemp_erp_resolvido: results[0]?.idemp_erp_resolvido ?? null,
                    idemp_int_from_reserva: results[0]?.idemp_int_from_reserva ?? null
                })
            }

            const tipo = (meta?.tipo || (results[0]?.idrepasse ? 'repasses' : 'reservas'))
                .toString().toLowerCase()

            const normalized = results.map((r) =>
                tipo === 'repasses'
                    ? this._normalizeProjectionRepasse(r, idgroup)
                    : this._normalizeProjectionReserva(r, idgroup)
            )

            logProj('normalized sample:', normalized.slice(0, 3).map((c) => ({
                contract_id: c.contract_id,
                enterprise_id: c.enterprise_id,
                company_id: c.company_id,
                pcs: c.payment_conditions?.length
            })))

            this._projCache.set(idgroup, normalized)
            return normalized
        },

        // ── Contracts cache ───────────────────────────────────────────────
        _buildContractsCacheKey({ view = 'dashboard', enterpriseId = null, enterpriseIds = null } = {}) {
            const f = this.filters
            const names = Array.isArray(f.enterpriseName) ? [...f.enterpriseName].sort().join('|') : ''
            const cids = Array.isArray(f.companyIds) ? [...f.companyIds].map(Number).filter(Number.isFinite).sort((a, b) => a - b).join(',') : ''
            const ids = Array.isArray(enterpriseIds)
                ? [...new Set(enterpriseIds.map(Number).filter(Number.isFinite))].sort((a, b) => a - b).join(',')
                : ''
            const groups = [...new Set(this.selectedGroupIds)].sort((a, b) => a - b).join(',')
            return `v=${view};s=${f.startDate};e=${f.endDate};sit=${f.situation};names=${names};cids=${cids};id=${enterpriseId ?? ''};ids=${ids};g=${groups}`
        },

        _getCachedContracts(key) {
            const item = this._contractsCache.get(key)
            if (!item) return null
            if (Date.now() - item.ts > this._cacheTTLms) { this._contractsCache.delete(key); return null }
            return item
        },

        _setCachedContracts(key, payload) {
            this._contractsCache.set(key, { ts: Date.now(), ...payload })
        },

        clearContractsCache() {
            this._contractsCache.clear()
            this._lastDashboardKey = null
        },

        restoreDashboardFromCache() {
            if (!this._lastDashboardKey) return false
            const cached = this._getCachedContracts(this._lastDashboardKey)
            if (!cached) return false
            this.contracts = cached.contracts
            this.total = cached.total
            return true
        },

        // ── Detail cache ──────────────────────────────────────────────────
        _buildDetailCtxKey() {
            const f = this.filters
            const names = Array.isArray(f.enterpriseName) ? [...f.enterpriseName].sort().join('|') : ''
            const cids = Array.isArray(f.companyIds) ? [...f.companyIds].map(Number).filter(Number.isFinite).sort((a, b) => a - b).join(',') : ''
            const groups = [...new Set(this.selectedGroupIds)].sort((a, b) => a - b).join(',')
            return `s=${f.startDate};e=${f.endDate};sit=${f.situation};names=${names};cids=${cids};g=${groups}`
        },

        _getDetailBucket(ctxKey) {
            if (!this._detailByEnterprise.has(ctxKey)) this._detailByEnterprise.set(ctxKey, new Map())
            return this._detailByEnterprise.get(ctxKey)
        },

        _getDetailFromCache(ctxKey, enterpriseId) {
            const id = Number(enterpriseId)
            if (!Number.isFinite(id)) return null
            const item = this._getDetailBucket(ctxKey).get(id)
            if (!item) return null
            if (Date.now() - item.ts > this._detailTTLms) { this._getDetailBucket(ctxKey).delete(id); return null }
            return item.contracts
        },

        _indexDetailIntoCache(ctxKey, contracts = []) {
            const bucket = this._getDetailBucket(ctxKey)
            const byEnt = new Map()
            for (const c of contracts) {
                const id = Number(c.enterprise_id)
                if (!Number.isFinite(id)) continue
                if (!byEnt.has(id)) byEnt.set(id, [])
                byEnt.get(id).push(c)
            }
            for (const [eid, list] of byEnt) {
                bucket.set(eid, { ts: Date.now(), contracts: list })
            }
        },

        clearDetailCache() {
            this._detailByEnterprise.clear()
        },

        // ── Main fetch ────────────────────────────────────────────────────
        async fetchContracts({ view = 'dashboard', enterpriseId = null, enterpriseIds = null, force = false } = {}) {
            const carregamentoStore = useCarregamentoStore()
            this.error = null
            const isDetail = String(view).toLowerCase() === 'detail'

            let cachedBeforeRequest = []
            let requestedIds = null

            // Serve from detail cache when possible
            if (isDetail && !force && enterpriseId != null) {
                const ctxKey = this._buildDetailCtxKey()
                const cached = this._getDetailFromCache(ctxKey, enterpriseId)
                if (cached) {
                    const projs = this.selectedGroupIds.length > 0
                        ? (await Promise.all(this.selectedGroupIds.map((id) => this._fetchProjectionsForGroup(id).catch(() => [])))).flat()
                        : []
                    this.contracts = [...cached, ...projs]
                    this.total = this.contracts.length
                    return
                }
            }

            if (isDetail && !force && Array.isArray(enterpriseIds) && enterpriseIds.length > 0) {
                const ctxKey = this._buildDetailCtxKey()
                const ids = enterpriseIds.map(Number).filter(Number.isFinite)
                const missing = ids.filter((id) => !this._getDetailFromCache(ctxKey, id))

                if (missing.length === 0) {
                    const allCached = ids.flatMap((id) => this._getDetailFromCache(ctxKey, id) || [])
                    const projs = this.selectedGroupIds.length > 0
                        ? (await Promise.all(this.selectedGroupIds.map((id) => this._fetchProjectionsForGroup(id).catch(() => [])))).flat()
                        : []
                    this.contracts = [...allCached, ...projs]
                    this.total = this.contracts.length
                    return
                }

                requestedIds = ids
                cachedBeforeRequest = ids.filter((id) => !missing.includes(id))
                    .flatMap((id) => this._getDetailFromCache(ctxKey, id) || [])
                enterpriseIds = missing
            }

            const cacheKey = this._buildContractsCacheKey({ view, enterpriseId, enterpriseIds })
            if (!force) {
                const cached = this._getCachedContracts(cacheKey)
                if (cached) {
                    this.contracts = cached.contracts
                    this.total = cached.total
                    if (view === 'dashboard') this._lastDashboardKey = cacheKey
                    return
                }
            }

            try {
                carregamentoStore.iniciarCarregamento()

                const params = new URLSearchParams()
                if (this.filters.startDate) params.append('startDate', this.filters.startDate)
                if (this.filters.endDate) params.append('endDate', this.filters.endDate)
                params.append('situation', this.filters.situation || 'Emitido')
                // companyIds takes priority over legacy enterpriseName filter
                if (Array.isArray(this.filters.companyIds) && this.filters.companyIds.length > 0) {
                    params.append('companyIds', this.filters.companyIds.join(','))
                } else if (Array.isArray(this.filters.enterpriseName) && this.filters.enterpriseName.length > 0) {
                    params.append('enterpriseName', this.filters.enterpriseName.join(','))
                }
                params.append('view', view)
                if (enterpriseId != null) params.append('enterpriseId', String(enterpriseId))
                if (Array.isArray(enterpriseIds) && enterpriseIds.length > 0) {
                    params.append('enterpriseIds', enterpriseIds.map(String).join(','))
                }

                const url = `${API_URL}/sienge/contracts?${params.toString()}`
                log('fetchContracts request:', url)

                // Start projections fetch IN PARALLEL with real contracts processing
                // (projections from cache are instant; uncached ones hit the API simultaneously)
                const projsFetchPromise = this.selectedGroupIds.length > 0
                    ? Promise.all(this.selectedGroupIds.map((id) => this._fetchProjectionsForGroup(id).catch(() => [])))
                        .then(all => all.flat())
                    : Promise.resolve([])

                const response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!response.ok) throw new Error(`Erro ao buscar contratos: ${response.status}`)

                const data = await response.json()
                const normalized = Array.isArray(data.results)
                    ? data.results.map(this._normalizeContract.bind(this))
                    : []

                // Show real contracts immediately (improves perceived performance)
                this.contracts = normalized

                // Build permanent enterprise->company map
                for (const c of normalized) {
                    const eid = Number(c.enterprise_id)
                    if (!Number.isFinite(eid) || eid <= 0) continue
                    if (!this._enterpriseCompanyMap.has(eid) && (c.company_id != null || c.company_name)) {
                        this._enterpriseCompanyMap.set(eid, {
                            company_id: c.company_id ?? null,
                            company_name: c.company_name ?? null
                        })
                    }
                }

                if (isDetail) {
                    this._indexDetailIntoCache(this._buildDetailCtxKey(), normalized)
                }

                // Await the already-started projections fetch
                const projs = await projsFetchPromise

                // Apply company filter to projections when active.
                // By this point _enterpriseCompanyMap is built from normalized contracts,
                // so we can resolve company_id for projections that don't have it directly.
                const companyFilter = Array.isArray(this.filters.companyIds) && this.filters.companyIds.length > 0
                    ? new Set(this.filters.companyIds.map(Number))
                    : null

                const filteredProjs = companyFilter
                    ? projs.filter((p) => {
                        let cid = p.company_id != null ? Number(p.company_id) : null
                        if (cid == null && p.enterprise_id != null) {
                            const mapped = this._enterpriseCompanyMap.get(Number(p.enterprise_id))
                            cid = mapped?.company_id != null ? Number(mapped.company_id) : null
                        }
                        // If company is resolved, check membership; if unresolvable, keep it
                        if (cid != null) return companyFilter.has(cid)
                        return true
                    })
                    : projs

                let merged = isDetail && requestedIds && cachedBeforeRequest.length > 0
                    ? [...cachedBeforeRequest, ...normalized, ...filteredProjs]
                    : [...normalized, ...filteredProjs]

                // Deduplicate by contract_id
                const dedup = new Map()
                for (const c of merged) {
                    const k = String(c?.contract_id ?? '')
                    if (k && !dedup.has(k)) dedup.set(k, c)
                }
                merged = [...dedup.values()]

                this.contracts = merged
                this.total = merged.length
                this._setCachedContracts(cacheKey, { contracts: merged, total: merged.length })
                if (view === 'dashboard') this._lastDashboardKey = cacheKey

                log('fetchContracts done:', {
                    view,
                    normalized: normalized.length,
                    projections: projs.length,
                    merged: merged.length
                })
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
                const res = await fetch(`${API_URL}/sienge/contracts/enterprises`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!res.ok) throw new Error(`Erro ao buscar empreendimentos: ${res.status}`)
                const data = await res.json()
                this.enterprises = data.results || []
                return this.enterprises
            } catch (error) {
                this.error = error.message
                return []
            }
        },

        async fetchCompanies() {
            if (this.companies.length > 0) return this.companies
            try {
                const res = await fetch(`${API_URL}/sienge/contracts/companies`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!res.ok) throw new Error(`Erro ao buscar empresas: ${res.status}`)
                const data = await res.json()
                this.companies = data.results || []
                return this.companies
            } catch (error) {
                this.error = error.message
                return []
            }
        },

        async fetchEnterpriseCities() {
            if (this.enterpriseCities.length > 0) return this.enterpriseCities
            try {
                const qs = new URLSearchParams({ page: '1', pageSize: '2000' })
                const res = await fetch(`${API_URL}/admin/enterprise-cities?${qs}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!res.ok) throw new Error(`Erro ao buscar enterprise-cities: ${res.status}`)
                const data = await res.json()
                this.enterpriseCities = (Array.isArray(data?.items) ? data.items : [])
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
                    console.warn('Falha ao listar grupos de workflow.', { reservas: resR.status, repasses: resP.status })
                    this.workflowGroups = []
                    return
                }

                const [dataR, dataP] = await Promise.all([resR.json(), resP.json()])
                const toArray = (d) =>
                    Array.isArray(d?.results) ? d.results
                        : Array.isArray(d?.data) ? d.data
                        : Array.isArray(d) ? d : []

                this.workflowGroups = [...toArray(dataR), ...toArray(dataP)]
                    .map((g) => {
                        const id = Number(g?.idgroup ?? g?.id ?? g?.group_id ?? g?.grupo_id)
                        const tipoRaw = (g?.tipo ?? g?.type ?? g?.origem ?? '').toString().toLowerCase()
                        return {
                            idgroup: Number.isFinite(id) ? id : null,
                            nome: g?.nome ?? g?.name ?? g?.titulo ?? '',
                            tipo: tipoRaw.includes('reserva') ? 'reservas' : 'repasses'
                        }
                    })
                    .filter((g) => g.idgroup !== null)
            } catch (e) {
                console.warn('Erro ao carregar grupos de workflow:', e)
                this.workflowGroups = []
            }
        },

        // Compat: expose extraction helpers for external usage (e.g. modal components)
        _extractEnterpriseIdFromProjectionRow: (row) => extractEnterpriseIdFromProjectionRow(row),
        _extractCompanyFromProjectionRow: (row) => extractCompanyFromProjectionRow(row)
    }
})
