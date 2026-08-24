<script setup>
// Página PÚBLICA de relatório da Eme (sem login) — /r/:token
// Serve sempre o snapshot publicado; token inválido/vencido = mensagem neutra.
//
// Relatório INTERATIVO: quem abre o link tem as mesmas ferramentas do leitor
// interno — barra de filtros, abrir os registros por trás de um número e
// exportar em Excel. As consultas vão para /api/reports/public/:token/... e
// rodam no servidor com as alçadas do DONO do relatório (o visitante nunca
// escolhe fonte ou argumento: só valores dos filtros declarados no spec).
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import API_URL from '@/config/apiUrl.js'
import ReportRenderer from '@/components/Reports/ReportRenderer.vue'
import ReportFilterBar from '@/components/Reports/ReportFilterBar.vue'
import DrillModal from '@/components/Reports/DrillModal.vue'
import RowDetailModal from '@/components/Reports/RowDetailModal.vue'
import ExportDataModal from '@/components/Reports/ExportDataModal.vue'
import { useReportLiveData } from '@/components/Reports/useReportLiveData.js'
import { publicPost } from '@/components/Reports/publicApi.js'
import { exportPng, exportPdf, exportHtml } from '@/components/Reports/exportReport.js'
import { exportSheetsXlsx, tablesFromSpec } from '@/components/Reports/exportExcel.js'
import { datasetsExportaveis as datasetsDoSpec } from '@/components/Reports/exportSources.js'

const route = useRoute()
const token = String(route.params.token || '')
const data = ref(null)
const loading = ref(true)
const notFound = ref(false)

const specRef = computed(() => data.value?.spec || null)
// O período do documento preenche os filtros de data (nunca em branco)
const periodRef = computed(() => ({ start: data.value?.periodStart, end: data.value?.periodEnd }))
// `enabled` como função: só depois do GET sabemos se o servidor libera consulta
// (relatório sem datasets, ou dono do relatório inativo, seguem congelados).
const live = useReportLiveData(null, specRef, periodRef, {
  request: (subPath, body) => publicPost(token, subPath, body),
  enabled: () => data.value?.interactive === true,
})

onMounted(async () => {
  try {
    const res = await fetch(`${API_URL}/reports/public/${encodeURIComponent(token)}`)
    if (!res.ok) throw new Error('not found')
    data.value = await res.json()
    if (data.value?.title) document.title = `${data.value.title} · Menin`
    live.start()
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
  document.addEventListener('click', fecharMenuFora)
})
onBeforeUnmount(() => document.removeEventListener('click', fecharMenuFora))

// ── Interatividade do leitor: drill-down, detalhe de linha e foco ────────────

const rowDetail = ref(null) // { title, row, columns, sobreDrill }
const drill = ref({ open: false, loading: false, error: '', label: '', blockId: null, data: null })
// Pilha de "foco": cada filtro aplicado via drill guarda os valores anteriores
// para o botão Voltar restaurar exatamente o estado de antes
const focoStack = ref([])

function onDrill(payload) {
  if (payload.kind === 'row') {
    rowDetail.value = {
      title: payload.title || 'Registro',
      row: payload.row,
      columns: payload.columns || [],
      sobreDrill: false,
    }
    return
  }
  abrirDrill(payload)
}

async function abrirDrill(payload) {
  drill.value = { open: true, loading: true, error: '', label: payload.label, blockId: payload.blockId, data: null }
  try {
    const res = await publicPost(token, '/data/drill', {
      block_id: payload.blockId,
      label: payload.label,
      filters: live.values.value,
    })
    drill.value = { open: true, loading: false, error: '', label: res.label, blockId: payload.blockId, data: res }
  } catch (e) {
    drill.value = { open: true, loading: false, error: e?.message || 'Não foi possível abrir os registros.', label: payload.label, blockId: payload.blockId, data: null }
  }
}

// O item clicado pode virar filtro do relatório? Só quando o spec declara um
// filtro cujo argumento (ou chave) casa com o campo agrupado do gráfico.
const drillFilter = computed(() => {
  const groupBy = drill.value.data?.groupBy
  if (!groupBy) return null
  return (data.value?.spec?.filters || []).find(
    (f) => f.type !== 'date-range' && (f.arg === groupBy || f.key === groupBy)
  ) || null
})

function aplicarFocoDoDrill() {
  const filtro = drillFilter.value
  if (!filtro) return
  focoStack.value.push({ label: drill.value.label, values: { ...live.values.value } })
  live.values.value = { ...live.values.value, [filtro.key]: drill.value.label }
  drill.value = { ...drill.value, open: false }
}

function voltarFoco() {
  const anterior = focoStack.value.pop()
  if (anterior) live.values.value = anterior.values
}

function abrirLinhaDoDrill({ row, columns }) {
  rowDetail.value = { title: drill.value.label || 'Registro', row, columns, sobreDrill: true }
}

// ── Exportação ───────────────────────────────────────────────────────────────

const reportEl = ref(null)
const menuEl = ref(null)
const menuAberto = ref(false)
const exportando = ref('')       // '' | 'html' | 'png' | 'pdf' | 'xlsx'
const exportModal = ref(false)
const erroExport = ref('')

function fecharMenuFora(e) {
  if (menuAberto.value && menuEl.value && !menuEl.value.contains(e.target)) menuAberto.value = false
}

const datasetsExportaveis = computed(() => datasetsDoSpec(data.value?.spec))

// Rótulos dos filtros para a aba "Sobre" do Excel
const filterLabels = computed(() =>
  Object.fromEntries((data.value?.spec?.filters || []).map((f) => [f.key, f.label]))
)

const resumoFiltrosExport = computed(() => {
  const partes = (data.value?.spec?.filters || []).map((f) => {
    const v = live.values.value?.[f.key]
    if (v == null || v === '') return null
    if (f.type === 'date-range') {
      if (!v.from && !v.to) return null
      return `${f.label}: ${[fmtDate(v.from), fmtDate(v.to)].filter(Boolean).join(' a ')}`
    }
    return `${f.label}: ${v}`
  }).filter(Boolean)
  return partes.length ? partes.join(' · ') : ''
})

async function exportar(tipo) {
  if (!reportEl.value || exportando.value) return
  menuAberto.value = false
  if (tipo === 'xlsx' && live.isInteractive.value && datasetsExportaveis.value.length > 1) {
    exportModal.value = true
    return
  }
  exportando.value = tipo
  erroExport.value = ''
  try {
    const titulo = data.value?.title || 'relatorio'
    if (tipo === 'png') await exportPng(reportEl.value, titulo)
    else if (tipo === 'pdf') await exportPdf(reportEl.value, titulo)
    else if (tipo === 'xlsx') await exportarExcel(titulo)
    else await exportHtml(reportEl.value, titulo)
  } catch (err) {
    console.error('[RelatorioPublico] export', tipo, err)
    mostrarErroExport(err?.friendly || `Não foi possível gerar o ${tipo.toUpperCase()}. Tente novamente.`)
  } finally {
    exportando.value = ''
  }
}

// Confirmação do modal: exporta só as consultas marcadas.
async function exportarSelecao(ids) {
  if (exportando.value) return
  exportando.value = 'xlsx'
  erroExport.value = ''
  try {
    await exportarExcel(data.value?.title || 'relatorio', ids)
    exportModal.value = false
  } catch (err) {
    console.error('[RelatorioPublico] export xlsx', err)
    exportModal.value = false
    mostrarErroExport(err?.friendly || 'Não foi possível gerar o Excel. Tente novamente.')
  } finally {
    exportando.value = ''
  }
}

// Interativo: linhas cruas vindas do servidor (com os filtros aplicados e as
// alçadas do dono). Sem consultas: as tabelas visíveis do próprio documento.
async function exportarExcel(titulo, datasetIds = null) {
  if (live.isInteractive.value) {
    const res = await publicPost(token, '/data/export', {
      filters: live.values.value,
      ...(datasetIds?.length ? { datasets: datasetIds } : {}),
    })
    await exportSheetsXlsx({
      sheets: res.sheets,
      title: titulo,
      filtros: res.values,
      filterLabels: filterLabels.value,
      refreshedAt: res.refreshedAt,
    })
  } else {
    const sheets = tablesFromSpec(data.value?.spec, live.liveProps.value)
    if (!sheets.length) {
      const err = new Error('sem tabelas')
      err.friendly = 'Este relatório não tem tabelas de dados para exportar em Excel.'
      throw err
    }
    await exportSheetsXlsx({ sheets, title: titulo, filtros: {}, filterLabels: {} })
  }
}

function mostrarErroExport(msg) {
  erroExport.value = msg
  setTimeout(() => { erroExport.value = '' }, 5000)
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : null)
</script>

<template>
  <div class="min-h-screen bg-surface">
    <!-- Topo neutro -->
    <header class="border-b border-line bg-surface-raised">
      <!-- Mesma largura do documento (report-doc é max-w-3xl): o botão de
           exportar nasce alinhado com a borda direita do relatório. -->
      <div class="mx-auto max-w-3xl px-4 py-3 flex items-center gap-2.5">
        <a
          href="https://www.menin.com.br/" target="_blank" rel="noopener noreferrer"
          class="flex-shrink-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <img src="/Mlogotext.png" alt="Menin" class="h-7 w-auto dark:invert-0 invert" />
        </a>
        <span v-if="data?.publishedAt" class="ml-auto text-micro text-ink-subtle">Publicado em {{ fmtDate(data.publishedAt) }}</span>

        <!-- Exportar: mesmas opções da visualização interna -->
        <div v-if="data" ref="menuEl" class="relative flex-shrink-0" :class="data?.publishedAt ? '' : 'ml-auto'">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink hover:border-accent hover:text-accent transition min-h-[36px]"
            :disabled="!!exportando"
            @click.stop="menuAberto = !menuAberto"
          >
            <i :class="exportando ? 'fas fa-circle-notch fa-spin' : 'fas fa-download'" />
            <span class="hidden sm:inline">Exportar</span>
          </button>
          <div
            v-if="menuAberto"
            class="absolute right-0 mt-1.5 w-48 rounded-xl border border-line bg-surface-raised shadow-lg overflow-hidden z-40"
          >
            <button
              v-for="opt in [
                { id: 'html', icon: 'fa-code', label: 'HTML', hint: 'Página completa' },
                { id: 'png', icon: 'fa-image', label: 'PNG', hint: 'Imagem única' },
                { id: 'pdf', icon: 'fa-file-pdf', label: 'PDF', hint: 'A4, sem cortar blocos' },
                { id: 'xlsx', icon: 'fa-file-excel', label: 'Excel', hint: 'Dados em planilha' },
              ]" :key="opt.id"
              type="button"
              class="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-sunken transition"
              @click="exportar(opt.id)"
            >
              <i :class="`fas ${opt.icon}`" class="text-ink-subtle w-4 text-center" />
              <span class="min-w-0">
                <span class="block text-sm text-ink leading-tight">{{ opt.label }}</span>
                <span class="block text-micro text-ink-subtle leading-tight">{{ opt.hint }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="px-4 py-8 sm:px-6">
      <div v-if="loading" class="py-24 text-center text-ink-subtle">
        <i class="fas fa-circle-notch fa-spin text-xl" />
      </div>

      <!-- 404 neutro: não revela se o link existiu, foi revogado ou venceu -->
      <div v-else-if="notFound" class="py-24 text-center max-w-sm mx-auto">
        <span class="inline-flex w-14 h-14 rounded-full bg-surface-sunken text-ink-subtle items-center justify-center mb-4">
          <i class="fas fa-link-slash text-xl" />
        </span>
        <h1 class="text-lg font-semibold text-ink">Relatório indisponível</h1>
        <p class="mt-2 text-sm text-ink-muted">Este link não está mais ativo. Se você recebeu este endereço de alguém, peça um link atualizado.</p>
      </div>

      <template v-else>
        <p v-if="erroExport" class="mx-auto mb-4 max-w-3xl rounded-lg border border-data-neg/30 bg-data-neg/10 px-3 py-2 text-sm text-data-neg">
          {{ erroExport }}
        </p>
        <div ref="reportEl">
          <ReportRenderer
            :spec="data.spec"
            :theme="data.theme || 'classic'"
            :live-props="live.liveProps.value"
            :live-errors="live.blockErrors.value"
            :live-loading="live.loading.value"
            :interactive="live.isInteractive.value"
            :meta="{
              generatedAt: data.publishedAt,
              refreshedAt: live.refreshedAt.value || data.refreshedAt,
              periodStart: data.periodStart,
              periodEnd: data.periodEnd,
              dataMode: data.dataMode,
            }"
            @drill="onDrill"
          >
            <!-- Filtros do visitante: marcados no renderer para o export
                 (PNG/PDF/HTML) sair sem os controles. -->
            <template v-if="live.isInteractive.value && live.filters.value.length" #filters>
              <ReportFilterBar
                v-model="live.values.value"
                :filters="live.filters.value"
                :options="live.options.value"
                :loading="live.loading.value"
                :refreshed-at="live.refreshedAt.value"
                :has-active="live.hasActiveFilters.value"
                @clear="live.clearFilters(); focoStack = []"
              />
              <!-- Foco aplicado via drill-down: um clique volta ao estado anterior -->
              <div v-if="focoStack.length" class="mt-2 flex items-center gap-2 flex-wrap">
                <span class="inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent px-3 py-1.5 text-xs font-medium">
                  <i class="fas fa-filter text-[10px]" />
                  Focado em: {{ focoStack[focoStack.length - 1].label }}
                </span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted hover:text-ink hover:bg-surface-sunken transition min-h-[32px]"
                  @click="voltarFoco"
                >
                  <i class="fas fa-arrow-rotate-left text-[10px]" />Voltar
                </button>
              </div>
              <!-- Consulta que falhou: o leitor precisa saber que aquele pedaço
                   está com o número da última publicação, não em branco -->
              <div
                v-if="live.datasetErrors.value.length"
                class="mt-2 rounded-lg border border-data-warn/40 bg-data-warn/10 px-3 py-2 text-xs text-data-warn"
              >
                <i class="fas fa-triangle-exclamation mr-1.5" />
                <span v-for="(d, i) in live.datasetErrors.value" :key="d.id">
                  <template v-if="i">; </template>{{ d.label }}: {{ d.error }}
                </span>
              </div>
              <p v-if="live.error.value" class="mt-2 text-xs text-data-neg">
                {{ live.error.value }}
              </p>
            </template>
          </ReportRenderer>
        </div>
      </template>
    </main>

    <footer v-if="data" class="pb-8 text-center text-micro text-ink-subtle">
      Relatório gerado pela Eme · Menin Office
    </footer>

    <!-- Drill-down: registros por trás do item clicado -->
    <DrillModal
      :open="drill.open"
      :loading="drill.loading"
      :error="drill.error"
      :label="drill.label"
      :data="drill.data"
      :can-filter="!!drillFilter"
      :report-title="data?.title || 'relatorio'"
      @close="drill = { ...drill, open: false }"
      @apply-filter="aplicarFocoDoDrill"
      @open-row="abrirLinhaDoDrill"
    />

    <!-- Detalhe de um registro (linha de tabela ou linha do drill) -->
    <RowDetailModal
      :open="!!rowDetail"
      :title="rowDetail?.title || 'Registro'"
      :row="rowDetail?.row || null"
      :columns="rowDetail?.columns || []"
      :z-index="rowDetail?.sobreDrill ? 10000 : 9999"
      @close="rowDetail = null"
    />

    <!-- Exportação geral: escolhe quais fontes entram na planilha -->
    <ExportDataModal
      :open="exportModal"
      :datasets="datasetsExportaveis"
      :loading="exportando === 'xlsx'"
      :resumo-filtros="resumoFiltrosExport"
      @close="exportModal = false"
      @confirm="exportarSelecao"
    />
  </div>
</template>
