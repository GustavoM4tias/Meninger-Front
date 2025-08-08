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
            situation: '',
            enterpriseName: []
        }
    }),

    getters: {
        // Agrupa vendas por unidade (mesmo cliente + mesma unidade = 1 venda)
        uniqueSales: (state) => {
            const salesMap = new Map()

            state.contracts.forEach(contract => {
                const key = `${contract.customer_id}-${contract.unit_name}`

                if (!salesMap.has(key)) {
                    salesMap.set(key, {
                        customer_id: contract.customer_id,
                        customer_name: contract.customer_name,
                        unit_name: contract.unit_name,
                        enterprise_name: contract.enterprise_name,
                        financial_institution_date: contract.financial_institution_date,
                        contracts: [contract],
                        total_value: 0
                    })
                } else {
                    salesMap.get(key).contracts.push(contract)
                }
            })

            // Calcula o valor total de cada venda
            salesMap.forEach(sale => {
                sale.total_value = sale.contracts.reduce((total, contract) => {
                    return total + contract.payment_conditions.reduce((sum, condition) => sum + condition.total_value, 0)
                }, 0)
            })

            return Array.from(salesMap.values())
        },

        // Vendas por empreendimento
        salesByEnterprise: (state) => {
            const enterpriseMap = new Map()

            state.uniqueSales.forEach(sale => {
                if (!enterpriseMap.has(sale.enterprise_name)) {
                    enterpriseMap.set(sale.enterprise_name, {
                        name: sale.enterprise_name,
                        count: 0,
                        total_value: 0
                    })
                }

                const enterprise = enterpriseMap.get(sale.enterprise_name)
                enterprise.count++
                enterprise.total_value += sale.total_value
            })

            return Array.from(enterpriseMap.values()).sort((a, b) => b.total_value - a.total_value)
        },

        // Vendas por tipo de pagamento
        paymentConditionsSummary: (state) => {
            const conditionsMap = new Map()

            state.contracts.forEach(contract => {
                contract.payment_conditions.forEach(condition => {
                    if (!conditionsMap.has(condition.condition_type_name)) {
                        conditionsMap.set(condition.condition_type_name, {
                            name: condition.condition_type_name,
                            code: condition.condition_type_id,
                            total_value: 0,
                            count: 0
                        })
                    }

                    const conditionData = conditionsMap.get(condition.condition_type_name)
                    conditionData.total_value += condition.total_value
                    conditionData.count++
                })
            })

            return Array.from(conditionsMap.values()).sort((a, b) => b.total_value - a.total_value)
        },

        // Vendas por período (mensal)
        salesByMonth: (state) => {
            const monthMap = new Map()

            state.uniqueSales.forEach(sale => {
                const date = new Date(sale.financial_institution_date)
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

                if (!monthMap.has(monthKey)) {
                    monthMap.set(monthKey, {
                        month: monthKey,
                        count: 0,
                        total_value: 0
                    })
                }

                const monthData = monthMap.get(monthKey)
                monthData.count++
                monthData.total_value += sale.total_value
            })

            return Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))
        },

        // Top clientes
        topCustomers: (state) => {
            const customerMap = new Map()

            state.uniqueSales.forEach(sale => {
                if (!customerMap.has(sale.customer_id)) {
                    customerMap.set(sale.customer_id, {
                        customer_id: sale.customer_id,
                        customer_name: sale.customer_name,
                        sales_count: 0,
                        total_value: 0
                    })
                }

                const customer = customerMap.get(sale.customer_id)
                customer.sales_count++
                customer.total_value += sale.total_value
            })

            return Array.from(customerMap.values())
                .sort((a, b) => b.total_value - a.total_value)
                .slice(0, 10)
        },

        // Métricas gerais
        metrics: (state) => {
            const totalSales = state.uniqueSales.length
            const totalValue = state.uniqueSales.reduce((sum, sale) => sum + sale.total_value, 0)
            const avgSaleValue = totalSales > 0 ? totalValue / totalSales : 0
            const totalEnterprises = new Set(state.contracts.map(c => c.enterprise_id)).size

            return {
                totalSales,
                totalValue,
                avgSaleValue,
                totalEnterprises,
                totalContracts: state.contracts.length
            }
        }
    },

    actions: {
        async fetchContracts() {
            const carregamentoStore = useCarregamentoStore()
            this.error = null

            try {
                carregamentoStore.iniciarCarregamento()
                // Constrói a URL com os filtros
                let url = `${API_URL}/sienge/contracts`
                const params = new URLSearchParams()

                if (this.filters.startDate) params.append('startDate', this.filters.startDate)
                if (this.filters.endDate) params.append('endDate', this.filters.endDate)
                if (this.filters.situation) params.append('situation', this.filters.situation)
                if (Array.isArray(this.filters.enterpriseName) && this.filters.enterpriseName.length > 0) {
                    // envia os IDs separados por vírgula
                    params.append('enterpriseName', this.filters.enterpriseName.join(','))
                }

                // Adiciona os parâmetros à URL
                if (params.toString()) {
                    url += `?${params.toString()}`
                }

                console.log('[fetchContracts] URL da requisição:', url)
                console.log('[fetchContracts] Filtros enviados:', this.filters)

                const response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                if (!response.ok) {
                    throw new Error(`Erro ao buscar contratos: ${response.status}`)
                }

                const data = await response.json()
                console.log('[fetchContracts] Dados recebidos:', data)

                this.contracts = data.results || []
                this.total = data.count || 0

                console.log('Contratos carregados:', data)
            } catch (error) {
                this.error = error.message
                console.error('Erro ao buscar contratos:', error.message)
            } finally {
                carregamentoStore.finalizarCarregamento()
            }
        },

        async fetchEnterprises() {
            if (this.enterprises.length > 0) {
                return this.enterprises
            }

            try {
                console.log('[fetchEnterprises] Iniciando requisição de empreendimentos...')
                const response = await fetch(`${API_URL}/sienge/contracts/enterprises`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                })
                console.log('[fetchEnterprises] Status da resposta:', response.status)

                if (!response.ok) {
                    throw new Error(`Erro ao buscar empreendimentos: ${response.status}`)
                }

                const data = await response.json()
                this.enterprises = data.results || []

                console.log('Empreendimentos carregados:', this.enterprises)
                return this.enterprises
            } catch (error) {
                console.error('Erro ao buscar empreendimentos:', error.message)
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
                situation: '',
                enterpriseName: []
            }
        }
    }
})