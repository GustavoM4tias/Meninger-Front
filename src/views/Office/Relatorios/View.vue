<script setup>
// Visualização interna de um relatório (dono, admin ou compartilhado).
// Sempre exibe a versão publicada. Quem pode editar tem aqui as mesmas ações
// do builder: exportar (HTML/PNG/PDF), compartilhar e gerar link público —
// antes só existia o PDF, e compartilhar exigia voltar ao builder.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import PageHelp from '@/components/UI/PageHelp.vue'
import Skeleton from '@/components/UI/Skeleton.vue'
import EmptyState from '@/components/UI/EmptyState.vue'
import ReportRenderer from '@/components/Reports/ReportRenderer.vue'
import ReportFilterBar from '@/components/Reports/ReportFilterBar.vue'
import DrillModal from '@/components/Reports/DrillModal.vue'
import RowDetailModal from '@/components/Reports/RowDetailModal.vue'
import { useReportLiveData } from '@/components/Reports/useReportLiveData.js'
import ShareModal from '@/components/Reports/eme/ShareModal.vue'
import PublicLinkModal from '@/components/Reports/eme/PublicLinkModal.vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'
import { requestWithAuth } from '@/utils/Auth/requestWithAuth.js'
import { exportPng, exportPdf, exportHtml } from '@/components/Reports/exportReport.js'
import { exportSheetsXlsx, tablesFromSpec } from '@/components/Reports/exportExcel.js'
import { datasetsExportaveis as datasetsDoSpec } from '@/components/Reports/exportSources.js'
import ExportDataModal from '@/components/Reports/ExportDataModal.vue'

const route = useRoute()
const router = useRouter()
const store = useReportsStore()

const data = ref(null)

// Relatório interativo: filtros do leitor + props recalculadas no servidor
const specRef = computed(() => data.value?.spec || null)
// O período do documento preenche os filtros de data (nunca em branco)
const periodRef = computed(() => ({ start: data.value?.periodStart, end: data.value?.periodEnd }))
const live = useReportLiveData(() => route.params.id, specRef, periodRef)
const loading = ref(true)
const error = ref('')
const reportEl = ref(null)

const exportando = ref('')          // '' | 'html' | 'png' | 'pdf'
const menuAberto = ref(false)
const menuEl = ref(null)
const showShare = ref(false)
const showPublic = ref(false)

const podeEditar = computed(() => !!data.value?.canEdit)
const currentAccess = ref([]) // preenchido junto com o relatório, para o ShareModal

// ── Interatividade do leitor: drill-down, detalhe de linha e foco ────────────

// Detalhe de um registro (linha de tabela ou linha do drill)
const rowDetail = ref(null) // { title, row, columns, sobreDrill }
// Drill-down: lista dos registros por trás de um item clicado
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
    const res = await requestWithAuth(`/reports/${route.params.id}/data/drill`, {
      method: 'POST',
      body: JSON.stringify({
        block_id: payload.blockId,
        label: payload.label,
        filters: live.values.value,
      }),
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

// Rótulos dos filtros para a aba "Sobre" do Excel
const filterLabels = computed(() =>
  Object.fromEntries((data.value?.spec?.filters || []).map((f) => [f.key, f.label]))
)

onMounted(async () => {
  try {
    data.value = await requestWithAuth(`/reports/${route.params.id}/view`)
    // Relatório com datasets: consulta os dados frescos já na abertura
    live.start()
    // Os modais de compartilhamento leem o relatório do store; carrega só para
    // quem tem permissão de editar, que é quem enxerga esses botões.
    if (data.value?.canEdit) {
      await store.fetchReport(route.params.id).catch(() => {})
      const full = await requestWithAuth(`/reports/${route.params.id}`).catch(() => null)
      currentAccess.value = full?.access || []
    }
  } catch (e) {
    error.value = e.status === 403 ? 'Você não tem acesso a este relatório.' : 'Relatório não encontrado.'
  } finally {
    loading.value = false
  }
  document.addEventListener('click', fecharMenuFora)
})
onBeforeUnmount(() => document.removeEventListener('click', fecharMenuFora))

function fecharMenuFora(e) {
  if (menuAberto.value && menuEl.value && !menuEl.value.contains(e.target)) menuAberto.value = false
}

// Excel com escolha do que entra: relatório interativo com mais de uma consulta
// abre o modal (uma aba por etapa do funil raramente é toda desejada). Com uma
// consulta só, ou sem consultas, o modal não teria o que perguntar.
const exportModal = ref(false)

// Uma opção por FONTE de dados (helper compartilhado com a página do link
// público, que exporta pelo mesmo motor no servidor).
const datasetsExportaveis = computed(() => datasetsDoSpec(data.value?.spec))
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
  try {
    const titulo = data.value?.title || 'relatorio'
    if (tipo === 'png') await exportPng(reportEl.value, titulo)
    else if (tipo === 'pdf') await exportPdf(reportEl.value, titulo)
    else if (tipo === 'xlsx') await exportarExcel(titulo)
    else await exportHtml(reportEl.value, titulo)
  } catch (err) {
    console.error('[Relatorios] export', tipo, err)
    error.value = err?.friendly || `Não foi possível gerar o ${tipo.toUpperCase()}. Tente novamente.`
    setTimeout(() => { if (error.value.startsWith('Não foi possível') || error.value.startsWith('Este relatório')) error.value = '' }, 5000)
  } finally {
    exportando.value = ''
  }
}

// Excel: relatório interativo exporta as linhas cruas das consultas (com os
// filtros e as alçadas de quem exporta, direto do servidor); relatório sem
// consultas exporta as tabelas visíveis do documento.
// Confirmação do modal: exporta só as consultas marcadas.
async function exportarSelecao(ids) {
  if (exportando.value) return
  exportando.value = 'xlsx'
  try {
    await exportarExcel(data.value?.title || 'relatorio', ids)
    exportModal.value = false
  } catch (err) {
    console.error('[Relatorios] export xlsx', err)
    exportModal.value = false
    error.value = err?.friendly || 'Não foi possível gerar o Excel. Tente novamente.'
    setTimeout(() => { if (error.value.startsWith('Não foi possível') || error.value.startsWith('Este relatório')) error.value = '' }, 5000)
  } finally {
    exportando.value = ''
  }
}

async function exportarExcel(titulo, datasetIds = null) {
  if (live.isInteractive.value) {
    const res = await requestWithAuth(`/reports/${route.params.id}/data/export`, {
      method: 'POST',
      body: JSON.stringify({
        filters: live.values.value,
        ...(datasetIds?.length ? { datasets: datasetIds } : {}),
      }),
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

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : null)
</script>

<template>
  <!-- design:tela-cheia — leitor de documento. A barra de ações é `sticky` de
     propósito: em relatório longo, exportar e compartilhar precisam ficar ao
     alcance enquanto se rola. PageHeader não é fixo, e trocá-lo por ela
     esconderia as ações no topo. -->
  <div class="min-h-[calc(100vh-3.5rem)]">
    <!-- Barra de ações: mesmo recuo lateral do documento, para o título nascer
         alinhado com o conteúdo. Antes a barra usava px-3/sm:px-5 e o conteúdo
         px-4/sm:px-8, então nada batia. -->
    <div class="sticky top-0 z-30 border-b border-line bg-surface-raised/80 backdrop-blur">
      <div class="flex items-center gap-3 px-4 sm:px-8 pb-2 pt-3.5">
        <button
          class="w-9 h-9 -ml-1.5 rounded-lg text-ink-subtle hover:bg-surface-sunken hover:text-ink transition flex items-center justify-center flex-shrink-0"
          aria-label="Voltar para a lista" @click="router.push('/relatorios')"
        >
          <i class="fas fa-arrow-left" />
        </button>

        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 min-w-0">
            <p class="text-sm font-semibold text-ink truncate">{{ data?.title || 'Relatório' }}</p>
            <Badge v-if="data?.visibility === 'public'" variant="warning" size="sm" dot class="flex-shrink-0 hidden sm:inline-flex">
              Público
            </Badge>
            <Badge v-if="data?.dataMode === 'live'" variant="success" size="sm" dot class="flex-shrink-0 hidden sm:inline-flex">
              Ao vivo
            </Badge>
          </div>
          <p v-if="data?.publishedAt" class="text-micro text-ink-subtle truncate">
            Publicado em {{ fmtDate(data.publishedAt) }}
          </p>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <PageHelp
            storage-key="relatorio-view"
            label=""
            title="Como ler este relatório"
            intro="Este é o relatório publicado. O que você vê aqui é o que quem recebeu o link também vê — respeitando a alçada de cada um."
            :steps="[
              { title: 'Confira a data', text: 'O selo Ao vivo diz que os números são recalculados a cada abertura. Sem ele, o relatório é um retrato congelado da data de publicação.' },
              { title: 'Use os filtros', text: 'Se o relatório tiver filtros no topo, eles recortam os números na hora, e a consulta roda com a SUA alçada.' },
              { title: 'Entre no número', text: 'Em relatório interativo, clicar num item do gráfico ou da tabela abre a lista dos registros por trás dele.' },
              { title: 'Exporte', text: 'HTML guarda a página inteira, PNG vira imagem, PDF sai em A4 sem cortar bloco no meio e Excel deixa escolher quais dados levar.' },
            ]"
            :tips="[
              'Dois leitores podem ver números diferentes no mesmo relatório: cada consulta roda com a alçada de quem abre.',
              'O link público é congelado e não respeita alçada — por isso ele fica separado do compartilhamento interno.',
            ]" />
          <!-- Exportar -->
          <div ref="menuEl" class="relative">
            <Button
              variant="secondary" size="sm" icon="fas fa-download"
              :loading="!!exportando" :disabled="loading || !!error"
              @click.stop="menuAberto = !menuAberto"
            >
              <span class="hidden sm:inline">Exportar</span>
            </Button>
            <div
              v-if="menuAberto"
              class="absolute right-0 mt-1.5 w-48 rounded-xl border border-line bg-surface-raised shadow-lg overflow-hidden z-40"
            >
              <button
                v-for="opt in [
                  { id: 'html', icon: 'fa-code', label: 'HTML', hint: 'Página completa' },
                  { id: 'png', icon: 'fa-image', label: 'PNG', hint: 'Imagem única' },
                  { id: 'pdf', icon: 'fa-file-pdf', label: 'PDF', hint: 'A4, sem cortar blocos' },
                  { id: 'xlsx', icon: 'fa-file-excel', label: 'Excel', hint: 'Escolher quais dados' },
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

          <template v-if="podeEditar">
            <Button variant="secondary" size="sm" icon="fas fa-share-nodes" @click="showShare = true">
              <span class="hidden lg:inline">Compartilhar</span>
            </Button>
            <Button variant="secondary" size="sm" icon="fas fa-link" @click="showPublic = true">
              <span class="hidden lg:inline">Link público</span>
            </Button>
            <Button
              variant="primary" size="sm" icon="fas fa-wand-magic-sparkles"
              @click="router.push(`/relatorios/${route.params.id}`)"
            >
              <span class="hidden sm:inline">Editar com a Eme</span>
            </Button>
          </template>
        </div>
      </div>
    </div>

    <!-- Carregando: a forma do documento (título, números, gráfico), para a
         página não saltar quando o relatório chega. -->
    <div v-if="loading" class="px-4 sm:px-8 py-6 space-y-4">
      <Skeleton variant="title" class="max-w-md" />
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Skeleton v-for="i in 4" :key="i" variant="stat" />
      </div>
      <Skeleton variant="chart" />
      <Skeleton variant="table" />
    </div>

    <EmptyState v-else-if="error && !data" class="py-16"
      icon="fas fa-lock" title="Relatório indisponível" :description="error">
      <template #actions>
        <Button icon="fas fa-arrow-left" @click="router.push('/relatorios')">Voltar para a lista</Button>
      </template>
    </EmptyState>
    <template v-else>
      <p v-if="error" class="mx-4 sm:mx-8 mt-4 rounded-lg border border-data-neg/30 bg-data-neg/10 px-3 py-2 text-sm text-data-neg">
        {{ error }}
      </p>
      <div class="px-4 sm:px-8 py-6 bg-surface">
        <div ref="reportEl">
          <ReportRenderer
            :spec="data.spec"
            :theme="data.theme || 'classic'"
            :live-props="live.liveProps.value"
            :live-errors="live.blockErrors.value"
            :live-loading="live.loading.value"
            interactive
            :meta="{
              generatedAt: data.publishedAt,
              refreshedAt: live.refreshedAt.value || data.refreshedAt,
              periodStart: data.periodStart,
              periodEnd: data.periodEnd,
              dataMode: data.dataMode,
            }"
            @drill="onDrill"
          >
            <!-- Filtros do leitor: dentro do documento (sempre abaixo do
                 cabeçalho da marca), marcados no renderer para o export
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
                <span
                  class="inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent px-3 py-1.5 text-xs font-medium"
                >
                  <i class="fas fa-filter text-micro" />
                  Focado em: {{ focoStack[focoStack.length - 1].label }}
                </span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted hover:text-ink hover:bg-surface-sunken transition min-h-[32px]"
                  @click="voltarFoco"
                >
                  <i class="fas fa-arrow-rotate-left text-micro" />Voltar
                </button>
              </div>
              <!-- Consulta que falhou: o leitor precisa saber que aquele
                   pedaço está com o número da última publicação, não em branco -->
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
      </div>
    </template>

    <ShareModal v-if="podeEditar" :open="showShare" :current-access="currentAccess" @close="showShare = false" />
    <PublicLinkModal v-if="podeEditar" :open="showPublic" @close="showPublic = false" />

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
