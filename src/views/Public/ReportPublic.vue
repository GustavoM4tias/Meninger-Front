<script setup>
// Página PÚBLICA de relatório da Eme (sem login) — /r/:token
// Serve sempre o snapshot publicado; token inválido/vencido = mensagem neutra.
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import API_URL from '@/config/apiUrl.js'
import ReportRenderer from '@/components/Reports/ReportRenderer.vue'

const route = useRoute()
const data = ref(null)
const loading = ref(true)
const notFound = ref(false)

onMounted(async () => {
  try {
    const res = await fetch(`${API_URL}/reports/public/${encodeURIComponent(route.params.token)}`)
    if (!res.ok) throw new Error('not found')
    data.value = await res.json()
    if (data.value?.title) document.title = `${data.value.title} · Menin`
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : null)
</script>

<template>
  <div class="min-h-screen bg-surface">
    <!-- Topo neutro -->
    <header class="border-b border-line bg-surface-raised">
      <div class="mx-auto max-w-3xl px-4 py-3 flex items-center gap-2.5">
        <span class="w-6 h-6 rounded-md bg-accent text-white flex items-center justify-center text-[11px] font-bold">M</span>
        <span class="text-sm font-semibold text-ink">Menin</span>
        <span v-if="data?.publishedAt" class="ml-auto text-[11px] text-ink-subtle">Publicado em {{ fmtDate(data.publishedAt) }}</span>
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

      <ReportRenderer
        v-else
        :spec="data.spec"
        :theme="data.theme || 'classic'"
        :meta="{ generatedAt: data.publishedAt, refreshedAt: data.refreshedAt }"
      />
    </main>

    <footer v-if="data" class="pb-8 text-center text-[11px] text-ink-subtle">
      Relatório gerado pela Eme · Menin Office
    </footer>
  </div>
</template>
