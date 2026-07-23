<script setup>
// Builder de relatório com a Eme.
// Layout fixo: Eme à esquerda em altura total (única Eme da tela — o player
// global fica oculto nesta rota) e o relatório à direita, com scroll próprio.
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import ReportRenderer from '@/components/Reports/ReportRenderer.vue'
import EmeReportPanel from '@/components/Reports/eme/EmeReportPanel.vue'
import AddBlockModal from '@/components/Reports/eme/AddBlockModal.vue'
import PublicLinkModal from '@/components/Reports/eme/PublicLinkModal.vue'
import ShareModal from '@/components/Reports/eme/ShareModal.vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'

const route = useRoute()
const router = useRouter()
const store = useReportsStore()

const rendererRef = ref(null)
const mobileTab = ref('chat') // chat | preview (só no mobile)
const showShare = ref(false)
const showPublic = ref(false)
const showAddBlock = ref(false)
const addAfterId = ref(null)
const publishing = ref(false)
const publishedFlash = ref(false)
const currentAccess = ref([])

const selCount = computed(() => store.selectedIds.length)

onMounted(load)
watch(() => route.params.id, load)

async function load() {
  if (!route.params.id) return
  await store.fetchReport(route.params.id)
  currentAccess.value = []
}

function gotoBlock(id) {
  mobileTab.value = 'preview'
  setTimeout(() => rendererRef.value?.scrollToBlock(id), 60)
}

function openAddBlock(afterId) {
  addAfterId.value = afterId
  showAddBlock.value = true
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

// Bloco alterado pela Eme entra em foco
watch(() => store.highlightId, (id) => {
  if (id) setTimeout(() => rendererRef.value?.scrollToBlock(id), 250)
})
</script>

<template>
  <!-- Altura travada na viewport: só a coluna do relatório rola -->
  <div class="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
    <!-- Barra do builder -->
    <div class="flex items-center gap-2 px-3 sm:px-5 py-2.5 border-b border-line bg-surface-raised flex-shrink-0">
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
      <Badge :variant="store.report?.status === 'published' ? 'success' : 'neutral'" size="sm" class="flex-shrink-0 hidden sm:inline-flex">
        {{ store.report?.status === 'published' ? 'Publicado' : 'Rascunho' }}
      </Badge>

      <div class="ml-auto flex items-center gap-1.5 flex-shrink-0">
        <Button variant="secondary" size="sm" icon="fas fa-share-nodes" @click="showShare = true">
          <span class="hidden lg:inline">Compartilhar</span>
        </Button>
        <Button variant="secondary" size="sm" icon="fas fa-globe" :disabled="store.report?.status !== 'published'" @click="showPublic = true">
          <span class="hidden lg:inline">Link público</span>
        </Button>
        <Button variant="primary" size="sm" :icon="publishedFlash ? 'fas fa-check' : 'fas fa-cloud-arrow-up'" :loading="publishing" :disabled="!store.blockCount" @click="publicar">
          <span class="hidden sm:inline">{{ publishedFlash ? 'Publicado!' : 'Publicar' }}</span>
        </Button>
      </div>
    </div>

    <div v-if="store.loadingReport" class="flex-1 flex items-center justify-center text-ink-subtle">
      <i class="fas fa-circle-notch fa-spin text-xl" />
    </div>

    <div v-else class="flex-1 min-h-0 flex flex-col sm:flex-row">
      <!-- Abas (mobile) -->
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
        ><i class="fas fa-eye mr-1.5" />Relatório ({{ store.blockCount }})</button>
      </div>

      <!-- Eme: fixa à esquerda, altura total -->
      <div
        class="sm:w-[400px] lg:w-[440px] sm:flex-shrink-0 min-h-0 flex-1 sm:flex-none"
        :class="mobileTab === 'chat' ? 'flex' : 'hidden sm:flex'"
      >
        <EmeReportPanel class="w-full" @goto-block="gotoBlock" />
      </div>

      <!-- Relatório: única área com scroll -->
      <div
        class="flex-1 min-h-0 overflow-y-auto bg-surface px-4 py-6 sm:px-8"
        :class="mobileTab === 'preview' ? 'block' : 'hidden sm:block'"
      >
        <div v-if="!store.blockCount" class="h-full flex items-center justify-center">
          <div class="text-center max-w-sm">
            <span class="inline-flex w-14 h-14 rounded-full bg-accent-soft text-accent items-center justify-center mb-3">
              <i class="fas fa-file-lines text-xl" />
            </span>
            <p class="text-sm font-medium text-ink">O relatório aparece aqui</p>
            <p class="mt-1 text-xs text-ink-muted">Conforme a Eme monta, cada seção vai surgindo nesta área em tempo real. Depois é só clicar num bloco para ajustá-lo.</p>
          </div>
        </div>

        <template v-else>
          <!-- Barra de seleção -->
          <div v-if="selCount" class="sticky top-0 z-20 mx-auto max-w-3xl mb-3 flex items-center gap-2 rounded-lg bg-accent text-white px-3 py-2 text-xs shadow-elevated">
            <i class="fas fa-square-check" />
            <span class="font-medium">{{ selCount }} bloco(s) selecionado(s)</span>
            <span class="hidden sm:inline opacity-80">- peça o ajuste à Eme ou remova</span>
            <button class="ml-auto px-2 py-0.5 rounded hover:bg-white/20 transition" @click="store.clearSelection()">Limpar</button>
            <button class="px-2 py-0.5 rounded hover:bg-white/20 transition" @click="store.removeBlocks([...store.selectedIds])">
              <i class="far fa-trash-can mr-1" />Remover
            </button>
          </div>

          <ReportRenderer
            ref="rendererRef"
            :spec="store.spec"
            :theme="store.theme"
            editable
            :selected-ids="store.selectedIds"
            :highlight-id="store.highlightId"
            @toggle="store.toggleBlock"
            @remove="store.removeBlocks([$event])"
            @move="(id, dir) => store.moveBlock(id, dir)"
            @add-after="openAddBlock"
          />
        </template>
      </div>
    </div>

    <AddBlockModal :open="showAddBlock" :after-id="addAfterId" @close="showAddBlock = false" />
    <ShareModal :open="showShare" :current-access="currentAccess" @close="showShare = false" />
    <PublicLinkModal :open="showPublic" @close="showPublic = false" />
  </div>
</template>
