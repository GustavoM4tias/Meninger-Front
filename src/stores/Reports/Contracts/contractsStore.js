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
        filters: {
            startDate: '',
            endDate: '',
            situation: 'Emitido',
            enterpriseName: [] // nomes (CSV no request)
        }
    }),
    getters: {
        // ---- helpers visíveis aos getters ----
        discountCodes: () => new Set(['DC', 'DESCONTO_CONSTRUTORA']),

        // Totais por contrato: { net, gross }
        // net: descontos NEGATIVOS (subtraem) | gross: descontos POSITIVOS (somam)
        _contractTotals() {
            return (contract) => {
                const isDiscount = (pc) =>
                    this.discountCodes.has(String(pc.condition_type_id || '').toUpperCase())

                const pcs = Array.isArray(contract.payment_conditions)
                    ? contract.payment_conditions
                    : []

                let net = 0
                let gross = 0
                for (const pc of pcs) {
                    const v = Number(pc.total_value) || 0
                    if (isDiscount(pc)) {
                        // Para desconto: bruto soma, líquido subtrai
                        gross += v 
                    } else {
                        // Para não desconto: ambos somam
                        gross += v
                        net += v
                    }
                }
                return { net, gross }
            }
        },

        _makeSaleKey: () => (c) =>
            `${c.customer_id}__${(c.unit_name || '').trim().toUpperCase()}`,

        // Agrupa vendas por unidade, acumulando líquido e bruto
        uniqueSales() {
            const salesMap = new Map()
            const makeKey = this._makeSaleKey
            const totalsOf = this._contractTotals

            this.contracts.forEach((contract) => {
                const key = makeKey(contract)
                if (!salesMap.has(key)) {
                    salesMap.set(key, {
                        customer_id: contract.customer_id,
                        customer_name: contract.customer_name,
                        unit_name: contract.unit_name,
                        enterprise_name: contract.enterprise_name,
                        financial_institution_date: contract.financial_institution_date,
                        contracts: [contract],
                        total_value_net: 0,
                        total_value_gross: 0
                    })
                } else {
                    salesMap.get(key).contracts.push(contract)
                }
            })

            salesMap.forEach((sale) => {
                sale.total_value_net = sale.contracts.reduce(
                    (acc, c) => acc + totalsOf(c).net,
                    0
                )
                sale.total_value_gross = sale.contracts.reduce(
                    (acc, c) => acc + totalsOf(c).gross,
                    0
                )
            })

            return Array.from(salesMap.values())
        },

        // Vendas por empreendimento (liquido e bruto)
        salesByEnterprise() {
            const enterpriseMap = new Map()
            const totalsOf = this._contractTotals

            this.contracts.forEach((contract) => {
                const key = contract.enterprise_name || `ID:${contract.enterprise_id}`
                if (!enterpriseMap.has(key)) {
                    enterpriseMap.set(key, {
                        name: key,
                        count: 0,
                        total_value_net: 0,
                        total_value_gross: 0
                    })
                }
                const ref = enterpriseMap.get(key)
                ref.count += 1
                const { net, gross } = totalsOf(contract)
                ref.total_value_net += net
                ref.total_value_gross += gross
            })

            // ordenação padrão pelo líquido desc (component controla isso também)
            return Array.from(enterpriseMap.values()).sort(
                (a, b) => b.total_value_net - a.total_value_net
            )
        },

        // Resumo por tipo de condição (traz ambos: net e gross)
        paymentConditionsSummary() {
            const conditionsMap = new Map()
            const discountCodes = this.discountCodes

            this.contracts.forEach((contract) => {
                const pcs = Array.isArray(contract.payment_conditions)
                    ? contract.payment_conditions
                    : []
                pcs.forEach((pc) => {
                    const name = pc.condition_type_name || '—'
                    const code = (pc.condition_type_id || '—').toString().toUpperCase()
                    const key = `${code}__${name}`

                    if (!conditionsMap.has(key)) {
                        conditionsMap.set(key, {
                            name,
                            code,
                            total_value_net: 0,
                            total_value_gross: 0,
                            count: 0
                        })
                    }

                    const v = Number(pc.total_value) || 0
                    const ref = conditionsMap.get(key)

                    if (discountCodes.has(code)) {
                        // Para desconto: bruto soma, líquido subtrai
                        ref.total_value_gross += v 
                    } else {
                        // Para não desconto: ambos somam
                        ref.total_value_gross += v
                        ref.total_value_net += v
                    }
                    ref.count += 1
                })
            })

            return Array.from(conditionsMap.values()).sort(
                (a, b) => b.total_value_net - a.total_value_net
            )
        },

        // Vendas por mês (a partir das vendas únicas)
        salesByMonth() {
            const monthMap = new Map()

            this.uniqueSales.forEach((sale) => {
                const date = new Date(sale.financial_institution_date)
                if (isNaN(date)) return
                const monthKey = `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, '0')}`

                if (!monthMap.has(monthKey)) {
                    monthMap.set(monthKey, {
                        month: monthKey,
                        count: 0,
                        total_value_net: 0,
                        total_value_gross: 0
                    })
                }
                const ref = monthMap.get(monthKey)
                ref.count += 1
                ref.total_value_net += Number(sale.total_value_net) || 0
                ref.total_value_gross += Number(sale.total_value_gross) || 0
            })

            return Array.from(monthMap.values()).sort((a, b) =>
                a.month.localeCompare(b.month)
            )
        },

        // Top clientes por valor (liquido e bruto)
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

        // Métricas gerais (liquido e bruto)
        metrics() {
            const unique = this.uniqueSales
            const totalSales = unique.length

            const totalValueNet = unique.reduce(
                (sum, s) => sum + (Number(s.total_value_net) || 0),
                0
            )
            const totalValueGross = unique.reduce(
                (sum, s) => sum + (Number(s.total_value_gross) || 0),
                0
            )

            const avgSaleValueNet = totalSales > 0 ? totalValueNet / totalSales : 0
            const avgSaleValueGross = totalSales > 0 ? totalValueGross / totalSales : 0

            const totalEnterprises = new Set(this.contracts.map((c) => c.enterprise_id)).size

            return {
                totalSales,
                // novos campos:
                totalValueNet,
                totalValueGross,
                avgSaleValueNet,
                avgSaleValueGross,
                // compat (se algum lugar ainda usa):
                totalValue: totalValueNet,
                avgSaleValue: avgSaleValueNet,
                totalEnterprises,
                totalContracts: this.contracts.length
            }
        }
    },

    actions: {
        // ---------------- normalização ----------------
        _toNumber(v) {
            return v === null || v === undefined || v === '' ? 0 : Number(v)
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
                    participation_percentage: n(
                        a.participation_percentage ?? a.participationPercentage
                    )
                }))
                : []

            return {
                contract_id: n(c.contract_id ?? c.id),
                enterprise_id: n(c.enterprise_id ?? c.enterpriseId),
                enterprise_name: c.enterprise_name ?? c.enterpriseName ?? '',
                financial_institution_date:
                    c.financial_institution_date ?? c.financialInstitutionDate ?? null,
                unit_name: c.unit_name ?? c.unitName ?? '',

                customer_id: n(c.customer_id ?? c.customerId),
                customer_name: c.customer_name ?? c.customerName ?? '',
                participation_percentage: n(
                    c.participation_percentage ?? c.participationPercentage
                ),

                payment_conditions: pcs,
                associates,
                links: Array.isArray(c.links) ? c.links : []
            }
        },
        // ------------------------------------------------

        async fetchContracts() {
            const carregamentoStore = useCarregamentoStore()
            this.error = null

            try {
                carregamentoStore.iniciarCarregamento()

                let url = `${API_URL}/sienge/contracts`
                const params = new URLSearchParams()
                if (this.filters.startDate) params.append('startDate', this.filters.startDate)
                if (this.filters.endDate) params.append('endDate', this.filters.endDate)
                params.append('situation', this.filters.situation || 'Emitido')

                if (
                    Array.isArray(this.filters.enterpriseName) &&
                    this.filters.enterpriseName.length > 0
                ) {
                    params.append('enterpriseName', this.filters.enterpriseName.join(','))
                }
                if (params.toString()) url += `?${params.toString()}`

                const response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!response.ok)
                    throw new Error(`Erro ao buscar contratos: ${response.status}`)

                const data = await response.json()
                const normalized = Array.isArray(data.results)
                    ? data.results.map(this._normalizeContract)
                    : []

                this.contracts = normalized
                console.log(this.contracts)
                this.total = data.count || 0
            } catch (error) {
                this.error = error.message
                console.error('Erro ao buscar contratos:', error)
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
                if (!response.ok)
                    throw new Error(`Erro ao buscar empreendimentos: ${response.status}`)
                const data = await response.json()
                this.enterprises = data.results || []
                return this.enterprises
            } catch (error) {
                console.error('Erro ao buscar empreendimentos:', error)
                return []
            }
        },

        setFilters(filters) {
            this.filters = { ...this.filters, ...filters }
        },

        clearFilters() {
            this.filters = {
                startDate: '',
                endDate: '',
                situation: 'Emitido',
                enterpriseName: []
            }
        }
    }
})