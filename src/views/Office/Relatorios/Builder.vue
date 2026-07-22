<script setup>
// Builder de relatório com a Eme — experiência em 2 fases:
//  Fase A (build): Eme protagonista num painel dedicado + preview ao lado.
//  Fase B (refine): relatório em tela cheia + Eme flutuante com outline;
//  blocos selecionáveis direto no relatório ("Editar com a Eme").
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import ReportRenderer from '@/components/Reports/ReportRenderer.vue'
import EmeReportBuilder from '@/components/Reports/eme/EmeReportBuilder.vue'
import EmeReportFloat from '@/components/Reports/eme/EmeReportFloat.vue'
import PublicLinkModal from '@/components/Reports/eme/PublicLinkModal.vue'
import ShareModal from '@/components/Reports/eme/ShareModal.vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'

const route = useRoute()
const router = useRouter()
const store = useReportsStore()

const rendererRef = ref(null)
const mobileTab = ref('chat') // chat | preview (Fase A no mobile)
const showShare = ref(false)
const showPublic = ref(false)
const publishing = ref(false)
const publishedFlash = ref(false)
const currentAccess = ref([])

const isBuild = computed(() => store.phase === 'build')

onMounted(load)
watch(() => route.params.id, load)

async function load() {
  if (!route.params.id) return
  await store.fetchReport(route.params.id)
  currentAccess.value = []
}

function gotoBlock(id) {
  rendererRef.value?.scrollToBlock(id)
}

function onSelectBlock(block) {
  store.selectBlock(block)
}

async function publicar() {
  publishing.value = true
  try {
    await store.publish()
    publishedFlash.value = true
    setTimeout(() => { publishedFlash.value = false }, 2500)
  } catch (e) {
    window.alert(e.payload?.error || e.message)
  } finally {
    publishing.value = false
  }
}

// Preview atualizou durante o streaming (Fase A mobile): avisa na aba
watch(() => store.highlightId, (id) => {
  if (id && !isBuild.value) setTimeout(() => gotoBlock(id), 250)
})
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] flex flex-col">
    <!-- Barra do builder -->
    <div class="flex items-center gap-2 px-3 sm:px-5 py-2.5 border-b border-line bg-surface-raised/80 backdrop-blur sticky top-0 z-30">
      <button class="w-8 h-8 rounded-lg text-ink-subtle hover:bg-surface-sunken transition flex-shrink-0" aria-label="Voltar" @click="router.push('/relatorios')">
        <i class="fas fa-arrow-left" />
      </button>
      <div class="min-w-0">
        <p class="text-sm font-semibold text-ink truncate">{{ store.report?.title || 'Relatório' }}</p>
        <p class="text-[11px] text-ink-subtle truncate">
          {{ store.report?.enterpriseName || 'Sem empreendimento' }}
          · {{ store.report?.dataMode === 'live' ? 'dados ao vivo' : 'dados congelados' }}
        </p>
      </div>
      <Badge :variant="store.report?.status === 'published' ? 'success' : 'neutral'" size="sm" class="flex-shrink-0">
        {{ store.report?.status === 'published' ? 'Publicado' : 'Rascunho' }}
      </Badge>

      <div class="ml-auto flex items-center gap-1.5 flex-shrink-0">
        <!-- Alternar fase -->
        <button
          v-if="store.blockCount > 0"
          class="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-line text-xs text-ink-muted hover:border-accent hover:text-accent transition"
          @click="store.setPhase(isBuild ? 'refine' : 'build')"
        >
          <i :class="isBuild ? 'fas fa-expand' : 'fas fa-table-columns'" />
          {{ isBuild ? 'Modo refinamento' : 'Modo criação' }}
        </button>
        <Button variant="secondary" size="sm" icon="fas fa-share-nodes" @click="showShare = true">
          <span class="hidden sm:inline">Compartilhar</span>
        </Button>
        <Button variant="secondary" size="sm" icon="fas fa-globe" :disabled="store.report?.status !== 'published'" @click="showPublic = true">
          <span class="hidden sm:inline">Link público</span>
        </Button>
        <Button variant="primary" size="sm" :icon="publishedFlash ? 'fas fa-check' : 'fas fa-cloud-arrow-up'" :loading="publishing" :disabled="!store.blockCount" @click="publicar">
          <span class="hidden sm:inline">{{ publishedFlash ? 'Publicado!' : 'Publicar' }}</span>
        </Button>
      </div>
    </div>

    <div v-if="store.loadingReport" class="flex-1 flex items-center justify-center text-ink-subtle">
      <i class="fas fa-circle-notch fa-spin text-xl" />
    </div>

    <!-- FASE A: split chat + preview -->
    <div v-else-if="isBuild" class="flex-1 min-h-0 flex flex-col sm:flex-row">
      <!-- Mobile: abas -->
      <div class="sm:hidden flex border-b border-line flex-shrink-0">
        <button
          class="flex-1 py-2.5 text-sm font-medium border-b-2 transition"
          :class="mobileTab === 'chat' ? 'border-accent text-accent' : 'border-transparent text-ink-subtle'"
          @click="mobileTab = 'chat'"
        ><i class="fas fa-wand-magic-sparkles mr-1.5" />Eme</button>
        <button
          class="flex-1 py-2.5 text-sm font-medium border-b-2 transition"
          :class="mobileTab === 'preview' ? 'border-accent text-accent' : 'border-transparent text-ink-subtle'"
          @click="mobileTab = 'preview'"
        ><i class="fas fa-eye mr-1.5" />Preview ({{ store.blockCount }})</button>
      </div>

      <!-- Painel da Eme -->
      <div
        class="sm:w-[400px] sm:border-r border-line flex-col min-h-0 flex-1 sm:flex-none"
        :class="mobileTab === 'chat' ? 'flex' : 'hidden sm:flex'"
      >
        <EmeReportBuilder />
      </div>

      <!-- Preview -->
      <div
        class="flex-1 min-h-0 overflow-y-auto bg-surface px-4 py-6 sm:px-8"
        :class="mobileTab === 'preview' ? 'block' : 'hidden sm:block'"
      >
        <div v-if="!store.blockCount" class="h-full flex items-center justify-center">
          <div class="text-center max-w-sm">
            <span class="inline-flex w-14 h-14 rounded-full bg-accent-soft text-accent items-center justify-center mb-3">
              <i class="fas fa-file-lines text-xl" />
            </span>
            <p class="text-sm font-medium text-ink">O preview aparece aqui</p>
            <p class="mt-1 text-xs text-ink-muted">Conforme a Eme monta o relatório, cada seção vai surgindo nesta área em tempo real.</p>
          </div>
        </div>
        <ReportRenderer v-else ref="rendererRef" :spec="store.spec" :highlight-id="store.highlightId" />
      </div>
    </div>

    <!-- FASE B: relatório em tela cheia + Eme flutuante -->
    <div v-else class="flex-1 min-h-0 overflow-y-auto bg-surface px-4 py-6 sm:px-8 pb-28">
      <ReportRenderer
        ref="rendererRef"
        :spec="store.spec"
        selectable
        :selected-id="store.selectedBlock?.id || null"
        :highlight-id="store.highlightId"
        @select="onSelectBlock"
      />
      <EmeReportFloat @goto-block="gotoBlock" />
    </div>

    <ShareModal :open="showShare" :current-access="currentAccess" @close="showShare = false" />
    <PublicLinkModal :open="showPublic" @close="showPublic = false" />
  </div>
</template>
