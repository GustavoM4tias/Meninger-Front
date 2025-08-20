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
            enterpriseName: []
        }
    }),

    getters: {
        // Códigos que representam DESCONTO (entram NEGATIVO no VGV)
        discountCodes: () => new Set(['DC', 'DESCONTO_CONSTRUTORA']),

        // Função que calcula o VGV líquido de UM contrato:
        // soma todas as condições - (descontos DC como negativo)
        _contractNetValue() {
            return (contract) => {
                const pcs = Array.isArray(contract.payment_conditions) ? contract.payment_conditions : []
                let sum = 0
                for (const pc of pcs) {
                    const code = String(pc.condition_type_id || '').toUpperCase()
                    const v = Number(pc.total_value) || 0
                    sum += this.discountCodes.has(code) ? -v : v
                }
                return sum
            }
        },

        // chave para “contratos iguais” (agrupar venda): mesmo cliente + mesma unidade
        _makeSaleKey: () => (c) => `${c.customer_id}__${(c.unit_name || '').trim().toUpperCase()}`,

        // Vendas únicas (agregando contratos do mesmo cliente/unidade e somando TR, FI, RP, SE, etc.; DC negativo)
        uniqueSales() {
            const map = new Map()
            const makeKey = this._makeSaleKey
            const netOf = this._contractNetValue

            this.contracts.forEach((c) => {
                const key = makeKey(c)
                if (!map.has(key)) {
                    map.set(key, {
                        customer_id: c.customer_id,
                        customer_name: c.customer_name,
                        unit_name: c.unit_name,
                        enterprise_name: c.enterprise_name, // só para exibição
                        financial_institution_date: c.financial_institution_date,
                        contracts: [c],
                        total_value: 0
                    })
                } else {
                    map.get(key).contracts.push(c)
                }
            })

            map.forEach((sale) => {
                sale.total_value = sale.contracts.reduce((acc, c) => acc + netOf(c), 0)
            })

            return Array.from(map.values())
        },

        // Vendas por empreendimento (cada contrato soma APENAS no seu próprio empreendimento)
        salesByEnterprise(state) {
            const map = new Map()
            const netOf = this._contractNetValue

            state.contracts.forEach((c) => {
                const name = c.enterprise_name || `ID:${c.enterprise_id}`
                if (!map.has(name)) {
                    map.set(name, { name, count: 0, total_value: 0 })
                }
                const ref = map.get(name)
                ref.count += 1
                ref.total_value += netOf(c)
            })

            return Array.from(map.values()).sort((a, b) => b.total_value - a.total_value)
        },

        // Resumo por tipo de condição (DC negativo)
        paymentConditionsSummary(state) {
            const map = new Map()

            state.contracts.forEach((c) => {
                const pcs = Array.isArray(c.payment_conditions) ? c.payment_conditions : []
                pcs.forEach((pc) => {
                    const code = String(pc.condition_type_id || '—').toUpperCase()
                    const name = pc.condition_type_name || '—'
                    const key = `${code}__${name}`

                    if (!map.has(key)) map.set(key, { code, name, total_value: 0, count: 0 })

                    const sign = this.discountCodes.has(code) ? -1 : 1
                    const v = (Number(pc.total_value) || 0) * sign
                    const ref = map.get(key)
                    ref.total_value += v
                    ref.count += 1
                })
            })

            return Array.from(map.values()).sort((a, b) => b.total_value - a.total_value)
        },

        // Agregado mensal baseado nas vendas (não no nível do contrato)
        salesByMonth() {
            const map = new Map()

            this.uniqueSales.forEach((sale) => {
                const d = new Date(sale.financial_institution_date)
                if (isNaN(d)) return
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                if (!map.has(key)) map.set(key, { month: key, count: 0, total_value: 0 })
                const ref = map.get(key)
                ref.count += 1
                ref.total_value += Number(sale.total_value) || 0
            })

            return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
        },

        // Métricas
        metrics() {
            const unique = this.uniqueSales
            const totalSales = unique.length
            const totalValue = unique.reduce((sum, s) => sum + (Number(s.total_value) || 0), 0)
            const avgSaleValue = totalSales > 0 ? totalValue / totalSales : 0
            const totalEnterprises = new Set(this.contracts.map(c => c.enterprise_id)).size

            return {
                totalSales,
                totalValue,
                avgSaleValue,
                totalEnterprises,
                totalContracts: this.contracts.length
            }
        }
    },

    actions: {
        _toNumber(v) {
            return (v === null || v === undefined || v === '') ? 0 : Number(v)
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
                ? c.payment_conditions.map(pc => this._normalizePaymentCondition(pc))
                : []

            const associates = Array.isArray(c.associates)
                ? c.associates.map(a => ({
                    ...a,
                    participation_percentage: n(a.participation_percentage ?? a.participationPercentage)
                }))
                : []

            return {
                contract_id: n(c.contract_id ?? c.id),
                enterprise_id: n(c.enterprise_id ?? c.enterpriseId),
                enterprise_name: c.enterprise_name ?? c.enterpriseName ?? '',
                financial_institution_date: c.financial_institution_date ?? c.financialInstitutionDate ?? null,
                unit_name: c.unit_name ?? c.unitName ?? '',
                customer_id: n(c.customer_id ?? c.customerId),
                customer_name: c.customer_name ?? c.customerName ?? '',
                participation_percentage: n(c.participation_percentage ?? c.participationPercentage),
                payment_conditions: pcs,
                associates,
                links: Array.isArray(c.links) ? c.links : []
            }
        },

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
                if (Array.isArray(this.filters.enterpriseName) && this.filters.enterpriseName.length > 0) {
                    params.append('enterpriseName', this.filters.enterpriseName.join(','))
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

                // 👇 IMPORTANTE: preserve o this usando arrow
                const normalized = Array.isArray(data.results)
                    ? data.results.map(c => this._normalizeContract(c))
                    : []

                this.contracts = normalized
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
                if (!response.ok) throw new Error(`Erro ao buscar empreendimentos: ${response.status}`)
                const data = await response.json()
                this.enterprises = data.results || []
                return this.enterprises
            } catch (error) {
                console.error('Erro ao buscar empreendimentos:', error)
                return []
            }
        },

        setFilters(filters) { this.filters = { ...this.filters, ...filters } },

        clearFilters() {
            this.filters = { startDate: '', endDate: '', situation: 'Emitido', enterpriseName: [] }
        }
    }
})
