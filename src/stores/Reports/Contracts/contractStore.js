import { defineStore } from 'pinia'
import API_URL from '@/config/apiUrl'
import { ref } from 'vue'

export const useContratosStore = defineStore('contratos', () => {
    const contratos = ref([])
    const loading = ref(false)
    const error = ref(null)
    const count = ref(0)

    const fetchContratos = async (filtros = {}) => {
        loading.value = true
        error.value = null

        try {
            const url = new URL(`${API_URL}/sienge/contratos`)
            Object.entries(filtros).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    value.forEach(v => url.searchParams.append(key, v))
                } else {
                    url.searchParams.append(key, value)
                }
            })

            const response = await fetch(url)
            if (!response.ok) throw new Error('Erro na resposta da API')

            const data = await response.json()

            contratos.value = data.results || []
            count.value = data.count || 0
        } catch (err) {
            error.value = 'Erro ao buscar contratos'
            console.error(err)
        } finally {
            loading.value = false
        }
    }

    return {
        contratos,
        loading,
        error,
        count,
        fetchContratos,
    }
})
