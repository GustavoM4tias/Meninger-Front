<script setup>
// Visualização interna de um relatório (dono, admin ou compartilhado).
// Sempre exibe a versão publicada; o dono pode exportar PDF e voltar ao builder.
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '@/components/UI/Button.vue'
import Badge from '@/components/UI/Badge.vue'
import ReportRenderer from '@/components/Reports/ReportRenderer.vue'
import { requestWithAuth } from '@/utils/Auth/requestWithAuth.js'

const route = useRoute()
const router = useRouter()

const data = ref(null)
const loading = ref(true)
const error = ref('')
const exporting = ref(false)
const reportEl = ref(null)

onMounted(async () => {
  try {
    data.value = await requestWithAuth(`/reports/${route.params.id}/view`)
  } catch (e) {
    error.value = e.status === 403 ? 'Você não tem acesso a este relatório.' : 'Relatório não encontrado.'
  } finally {
    loading.value = false
  }
})

async function exportPdf() {
  if (!reportEl.value) return
  exporting.value = true
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])
    const canvas = await html2canvas(reportEl.value, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgH = (canvas.height * pageW) / canvas.width
    let remaining = imgH
    let position = 0
    const img = canvas.toDataURL('image/jpeg', 0.92)
    pdf.addImage(img, 'JPEG', 0, position, pageW, imgH)
    remaining -= pageH
    while (remaining > 0) {
      position -= pageH
      pdf.addPage()
      pdf.addImage(img, 'JPEG', 0, position, pageW, imgH)
      remaining -= pageH
    }
    pdf.save(`${(data.value?.title || 'relatorio').replace(/[^\w\s-]/g, '')}.pdf`)
  } finally {
    exporting.value = false
  }
}

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : null)
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <div class="flex items-center gap-2 px-3 sm:px-5 py-2.5 border-b border-line bg-surface-raised/80 backdrop-blur sticky top-0 z-30">
      <button class="w-8 h-8 rounded-lg text-ink-subtle hover:bg-surface-sunken transition flex-shrink-0" aria-label="Voltar" @click="router.push('/relatorios')">
        <i class="fas fa-arrow-left" />
      </button>
      <div class="min-w-0">
        <p class="text-sm font-semibold text-ink truncate">{{ data?.title || 'Relatório' }}</p>
        <p v-if="data?.publishedAt" class="text-[11px] text-ink-subtle">Publicado em {{ fmtDate(data.publishedAt) }}</p>
      </div>
      <Badge v-if="data?.visibility === 'public'" variant="warning" size="sm" dot class="flex-shrink-0">Público</Badge>
      <div class="ml-auto flex items-center gap-1.5 flex-shrink-0">
        <Button variant="secondary" size="sm" icon="fas fa-file-pdf" :loading="exporting" @click="exportPdf">
          <span class="hidden sm:inline">PDF</span>
        </Button>
        <Button v-if="data?.canEdit" variant="primary" size="sm" icon="fas fa-wand-magic-sparkles" @click="router.push(`/relatorios/${route.params.id}`)">
          <span class="hidden sm:inline">Editar com a Eme</span>
        </Button>
      </div>
    </div>

    <div v-if="loading" class="py-24 text-center text-ink-subtle"><i class="fas fa-circle-notch fa-spin text-xl" /></div>
    <div v-else-if="error" class="py-24 text-center">
      <i class="fas fa-lock text-2xl text-ink-subtle mb-3" />
      <p class="text-sm text-ink-muted">{{ error }}</p>
    </div>
    <div v-else class="px-4 py-6 sm:px-8 bg-surface">
      <div ref="reportEl">
        <ReportRenderer :spec="data.spec" :theme="data.theme || 'classic'" />
      </div>
    </div>
  </div>
</template>
