// Dados ao vivo dos relatórios interativos: quando o spec declara datasets,
// este composable consulta POST /reports/:id/data e devolve as props
// recalculadas por bloco (liveProps) + erros/opções de filtro.
//
// Usado pelo View e pelo preview do Builder. O link público NÃO usa isto —
// visitante recebe o retrato congelado da publicação.
import { ref, computed, watch } from 'vue'
import { requestWithAuth } from '@/utils/Auth/requestWithAuth.js'

// `periodRef` é o período do próprio relatório ({ start, end }) e serve de
// preenchimento padrão para filtros de data que o spec não trouxe com default:
// campo de período em branco fazia o leitor achar que estava vendo "tudo", e a
// primeira consulta ia sem janela nenhuma.
export function useReportLiveData(reportId, specRef, periodRef = null) {
  const values = ref({})          // filterKey -> valor escolhido pelo leitor
  const baseValues = ref({})      // recorte padrão (período do relatório + defaults do spec)
  const liveProps = ref({})       // blockId -> props recalculadas
  const blockErrors = ref({})     // blockId -> mensagem ("sem acesso", etc.)
  const options = ref({})         // filterKey -> opções dinâmicas do select
  const datasetErrors = ref([])
  const loading = ref(false)
  const refreshedAt = ref(null)
  const error = ref('')

  const filters = computed(() => specRef.value?.filters || [])
  const isInteractive = computed(() => (specRef.value?.datasets || []).length > 0)

  const hoje = () => new Date().toISOString().slice(0, 10)
  const soData = (v) => (v ? String(v).slice(0, 10) : null)

  // Período padrão do relatório, usado quando o filtro de data não declara
  // default. Em relatório ao vivo (fim aberto) o "até" é hoje.
  function periodoPadrao() {
    const p = typeof periodRef === 'function' ? periodRef() : periodRef?.value ?? periodRef
    const from = soData(p?.start)
    const to = soData(p?.end) || hoje()
    if (!from && !to) return null
    return { ...(from ? { from } : {}), ...(to ? { to } : {}) }
  }

  // Defaults entram uma única vez (sem sobrescrever o que o leitor já mexeu).
  function seedDefaults() {
    const padrao = periodoPadrao()
    for (const f of filters.value) {
      if (values.value[f.key] !== undefined) continue
      if (f.default != null) {
        values.value[f.key] = f.default
      } else if (f.type === 'date-range' && padrao) {
        values.value[f.key] = { ...padrao }
      }
    }
    baseValues.value = JSON.parse(JSON.stringify(values.value))
  }

  let requestSeq = 0
  let ultimaChave = null
  async function fetchData() {
    if (!isInteractive.value) return
    ultimaChave = JSON.stringify(values.value)
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
    debounceTimer = setTimeout(() => {
      // O próprio seedDefaults mexe em `values` e dispararia uma segunda
      // consulta idêntica logo após a inicial.
      if (JSON.stringify(values.value) === ultimaChave) return
      fetchData()
    }, 450)
  }, { deep: true })

  function start() {
    if (!isInteractive.value) return
    seedDefaults()
    fetchData()
  }

  // Limpar volta ao RECORTE PADRÃO do relatório (não deixa tudo em branco): o
  // período do documento é a base sobre a qual os números foram escritos.
  function clearFilters() {
    values.value = JSON.parse(JSON.stringify(baseValues.value))
  }

  // "Tem filtro ativo" = o leitor mudou algo em relação ao recorte padrão. Sem
  // isso o botão Limpar apareceria sempre (o período nasce preenchido) e não
  // faria nada visível.
  const hasActiveFilters = computed(
    () => JSON.stringify(values.value) !== JSON.stringify(baseValues.value)
  )

  return {
    values, liveProps, blockErrors, options, datasetErrors,
    loading, refreshedAt, error,
    filters, isInteractive, hasActiveFilters,
    start, fetchData, clearFilters,
  }
}
