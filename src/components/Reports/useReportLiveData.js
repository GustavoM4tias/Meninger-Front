// Dados ao vivo dos relatórios interativos: quando o spec declara datasets,
// este composable consulta POST /reports/:id/data e devolve as props
// recalculadas por bloco (liveProps) + erros/opções de filtro.
//
// Usado pelo View, pelo preview do Builder e pela página do link público — que
// passa `options.request` para falar com a rota por token, sem JWT.
import { ref, computed, watch } from 'vue'
import { requestWithAuth } from '@/utils/Auth/requestWithAuth.js'

// `periodRef` é o período do próprio relatório ({ start, end }) e serve de
// preenchimento padrão para filtros de data que o spec não trouxe com default:
// campo de período em branco fazia o leitor achar que estava vendo "tudo", e a
// primeira consulta ia sem janela nenhuma.
//
// `options.request(subPath, body)` troca o transporte da consulta (o público
// não tem token JWT); o padrão é a rota interna autenticada.
export function useReportLiveData(reportId, specRef, periodRef = null, options_ = {}) {
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
  // `enabled` aceita valor ou função (o link público só sabe se pode consultar
  // depois que o payload chega do servidor).
  const habilitado = () => {
    const e = typeof options_.enabled === 'function' ? options_.enabled() : options_.enabled
    return e !== false
  }
  const isInteractive = computed(
    () => (specRef.value?.datasets || []).length > 0 && habilitado()
  )

  // Transporte da consulta: interno (JWT) por padrão, por token no link público.
  const request = options_.request || ((subPath, body) => {
    const id = typeof reportId === 'function' ? reportId() : reportId
    return requestWithAuth(`/reports/${id}${subPath}`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  })

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
      const res = await request('/data', { filters: values.value })
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

  // `values` só muda em evento discreto (botão "Filtrar" da barra ou "Limpar"),
  // então a consulta sai na hora - o debounce existia para não disparar uma
  // consulta por tecla digitada, o que a aplicação explícita já resolve.
  watch(values, () => {
    // O próprio seedDefaults mexe em `values` e dispararia uma segunda
    // consulta idêntica logo após a inicial.
    if (JSON.stringify(values.value) === ultimaChave) return
    fetchData()
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
