<script setup>
// Visualização interna de um relatório (dono, admin ou compartilhado).
// Sempre exibe a versão publicada. Quem pode editar tem aqui as mesmas ações
// do builder: exportar (HTML/PNG/PDF), compartilhar e gerar link público —
// antes só existia o PDF, e compartilhar exigia voltar ao builder.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import ReportRenderer from '@/components/Reports/ReportRenderer.vue'
import ShareModal from '@/components/Reports/eme/ShareModal.vue'
import PublicLinkModal from '@/components/Reports/eme/PublicLinkModal.vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'
import { requestWithAuth } from '@/utils/Auth/requestWithAuth.js'
import { exportPng, exportPdf, exportHtml } from '@/components/Reports/exportReport.js'

const route = useRoute()
const router = useRouter()
const store = useReportsStore()

const data = ref(null)
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

onMounted(async () => {
  try {
    data.value = await requestWithAuth(`/reports/${route.params.id}/view`)
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

async function exportar(tipo) {
  if (!reportEl.value || exportando.value) return
  menuAberto.value = false
  exportando.value = tipo
  try {
    const titulo = data.value?.title || 'relatorio'
    if (tipo === 'png') await exportPng(reportEl.value, titulo)
    else if (tipo === 'pdf') await exportPdf(reportEl.value, titulo)
    else await exportHtml(reportEl.value, titulo)
  } catch (err) {
    console.error('[Relatorios] export', tipo, err)
    error.value = `Não foi possível gerar o ${tipo.toUpperCase()}. Tente novamente.`
    setTimeout(() => { if (error.value.startsWith('Não foi possível')) error.value = '' }, 5000)
  } finally {
    exportando.value = ''
  }
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : null)
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <!-- Barra de ações: mesmo recuo lateral do documento, para o título nascer
         alinhado com o conteúdo. Antes a barra usava px-3/sm:px-5 e o conteúdo
         px-4/sm:px-8, então nada batia. -->
    <div class="sticky top-0 z-30 border-b border-line bg-surface-raised/80 backdrop-blur">
      <div class="flex items-center gap-3 px-4 sm:px-8 py-3">
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
          <p v-if="data?.publishedAt" class="text-[11px] text-ink-subtle truncate">
            Publicado em {{ fmtDate(data.publishedAt) }}
          </p>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
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
                ]" :key="opt.id"
                type="button"
                class="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-surface-sunken transition"
                @click="exportar(opt.id)"
              >
                <i :class="`fas ${opt.icon}`" class="text-ink-subtle w-4 text-center" />
                <span class="min-w-0">
                  <span class="block text-sm text-ink leading-tight">{{ opt.label }}</span>
                  <span class="block text-[11px] text-ink-subtle leading-tight">{{ opt.hint }}</span>
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

    <div v-if="loading" class="py-24 text-center text-ink-subtle"><i class="fas fa-circle-notch fa-spin text-xl" /></div>
    <div v-else-if="error && !data" class="py-24 text-center">
      <i class="fas fa-lock text-2xl text-ink-subtle mb-3" />
      <p class="text-sm text-ink-muted">{{ error }}</p>
    </div>
    <template v-else>
      <p v-if="error" class="mx-4 sm:mx-8 mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
        {{ error }}
      </p>
      <div class="px-4 sm:px-8 py-6 bg-surface">
        <div ref="reportEl">
          <ReportRenderer
            :spec="data.spec"
            :theme="data.theme || 'classic'"
            :meta="{
              generatedAt: data.publishedAt,
              refreshedAt: data.refreshedAt,
              periodStart: data.periodStart,
              periodEnd: data.periodEnd,
              dataMode: data.dataMode,
            }"
          />
        </div>
      </div>
    </template>

    <ShareModal v-if="podeEditar" :open="showShare" :current-access="currentAccess" @close="showShare = false" />
    <PublicLinkModal v-if="podeEditar" :open="showPublic" @close="showPublic = false" />
  </div>
</template>
