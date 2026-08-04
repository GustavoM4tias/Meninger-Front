// Dados ao vivo dos relatórios interativos: quando o spec declara datasets,
// este composable consulta POST /reports/:id/data e devolve as props
// recalculadas por bloco (liveProps) + erros/opções de filtro.
//
// Usado pelo View e pelo preview do Builder. O link público NÃO usa isto —
// visitante recebe o retrato congelado da publicação.
import { ref, computed, watch } from 'vue'
import { requestWithAuth } from '@/utils/Auth/requestWithAuth.js'

export function useReportLiveData(reportId, specRef) {
  const values = ref({})          // filterKey -> valor escolhido pelo leitor
  const liveProps = ref({})       // blockId -> props recalculadas
  const blockErrors = ref({})     // blockId -> mensagem ("sem acesso", etc.)
  const options = ref({})         // filterKey -> opções dinâmicas do select
  const datasetErrors = ref([])
  const loading = ref(false)
  const refreshedAt = ref(null)
  const error = ref('')

  const filters = computed(() => specRef.value?.filters || [])
  const isInteractive = computed(() => (specRef.value?.datasets || []).length > 0)

  // Defaults declarados no spec entram uma única vez (sem sobrescrever o que o
  // leitor já mexeu).
  function seedDefaults() {
    for (const f of filters.value) {
      if (f.default != null && values.value[f.key] === undefined) {
        values.value[f.key] = f.default
      }
    }
  }

  let requestSeq = 0
  async function fetchData() {
    if (!isInteractive.value) return
    const seq = ++requestSeq
    loading.value = true
    error.value = ''
    try {
      const id = typeof reportId === 'function' ? reportId() : reportId
      const res = await requestWithAuth(`/reports/${id}/data`, {
        method: 'POST',
        body: JSON.stringify({ filters: values.value }),
      })
      if (seq !== requestSeq) return // resposta velha: descarta
      liveProps.value = res.props || {}
      blockErrors.value = res.blockErrors || {}
      options.value = res.options || {}
      datasetErrors.value = res.datasetErrors || []
      refreshedAt.value = res.refreshedAt || null
    } catch (e) {
      if (seq !== requestSeq) return
      error.value = e?.message || 'Falha ao consultar os dados.'
    } finally {
      if (seq === requestSeq) loading.value = false
    }
  }

  // Troca de filtro reconsulta com debounce (digitação em campo text não pode
  // virar uma consulta por tecla).
  let debounceTimer = null
  watch(values, () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(fetchData, 450)
  }, { deep: true })

  function start() {
    if (!isInteractive.value) return
    seedDefaults()
    fetchData()
  }

  function clearFilters() {
    values.value = {}
  }

  const hasActiveFilters = computed(() =>
    Object.values(values.value).some((v) => {
      if (v == null || v === '') return false
      if (typeof v === 'object') return Object.values(v).some(Boolean)
      return true
    })
  )

  return {
    values, liveProps, blockErrors, options, datasetErrors,
    loading, refreshedAt, error,
    filters, isInteractive, hasActiveFilters,
    start, fetchData, clearFilters,
  }
}
