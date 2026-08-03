<script setup>
// Rodapé do relatório. A data é SEMPRE a do próprio relatório (injetada pelo
// renderer), nunca o que a IA escrever — e exibida em pt-BR, nunca ISO cru.
// O período também sai daqui: em relatório LIVE o fim é aberto, então mostra
// "até hoje" em vez de uma data final que a IA tenha escrito à mão.
import { computed, inject } from 'vue'

defineProps({
  sources: { type: Array, default: () => [] }, // ['Leads (Office)', 'Reservas (CV)']
  note: { type: String, default: '' },
})

// { generatedAt, refreshedAt, periodStart, periodEnd, dataMode } do relatório
const reportMeta = inject('reportMeta', computed(() => ({})))

function pretty(value, withTime = false) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '' // string não-data: não exibe lixo
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

// DATEONLY ('2026-05-01') vira meio-dia local para não voltar um dia no fuso
const shortDate = (value) => {
  if (!value) return ''
  const raw = String(value)
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

const generated = computed(() => pretty(reportMeta.value?.generatedAt))
const refreshed = computed(() => pretty(reportMeta.value?.refreshedAt, true))
const isLive = computed(() => reportMeta.value?.dataMode === 'live')

const periodo = computed(() => {
  const ini = shortDate(reportMeta.value?.periodStart)
  const fim = shortDate(reportMeta.value?.periodEnd)
  if (!ini && !fim) return ''
  if (ini && !fim) return `${ini} até hoje`
  if (!ini && fim) return `até ${fim}`
  return `${ini} a ${fim}`
})
</script>

<template>
  <footer class="mt-4 pt-5 border-t-2 border-accent/25 text-xs text-ink-subtle">
    <div class="space-y-1.5">
      <p v-if="periodo">
        <span class="font-medium text-ink-muted">Período:</span> {{ periodo }}
        <span
          v-if="isLive"
          class="rp-live-badge ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent-soft text-accent font-medium"
        >
          <span aria-hidden="true" class="w-1.5 h-1.5 rounded-full bg-accent"></span>ao vivo
        </span>
      </p>
      <p v-if="sources.length"><span class="font-medium text-ink-muted">Fontes:</span> {{ sources.join(' · ') }}</p>
      <p v-if="refreshed"><span class="font-medium text-ink-muted">Dados atualizados em:</span> {{ refreshed }}</p>
      <p v-if="note">{{ note }}</p>
    </div>

    <!-- Assinatura textual. A MARCA fica no timbre do documento (ReportRenderer),
         que é sempre renderizado — aqui repetir a logo só duplicaria. -->
    <div class="mt-4 pt-3.5 border-t border-line flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>
        Relatório gerado pela Eme ·
        <a
          href="https://www.menin.com.br/" target="_blank" rel="noopener noreferrer"
          class="font-medium text-accent hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >Menin Office</a>
      </span>
      <span v-if="generated" class="sm:ml-auto">{{ generated }}</span>
    </div>
  </footer>
</template>
