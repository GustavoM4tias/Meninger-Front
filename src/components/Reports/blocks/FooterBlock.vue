<script setup>
// Rodapé do relatório. Datas chegam em formatos variados (ISO da Eme, string
// solta) — sempre exibimos em pt-BR legível, nunca o timestamp cru.
import { computed } from 'vue'

const props = defineProps({
  sources: { type: Array, default: () => [] }, // ['Leads (Office)', 'Reservas (CV)']
  generatedAt: { type: [String, Number, Date], default: '' },
  refreshedAt: { type: [String, Number, Date], default: '' },
  note: { type: String, default: '' },
})

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

const generated = computed(() => pretty(props.generatedAt))
const refreshed = computed(() => pretty(props.refreshedAt, true))
</script>

<template>
  <footer class="mt-4 pt-5 border-t border-line text-xs text-ink-subtle space-y-1.5">
    <p v-if="sources.length"><span class="font-medium text-ink-muted">Fontes:</span> {{ sources.join(' · ') }}</p>
    <p v-if="refreshed"><span class="font-medium text-ink-muted">Dados atualizados em:</span> {{ refreshed }}</p>
    <p v-if="note">{{ note }}</p>
    <p class="pt-1">
      Relatório gerado pela Eme · Menin Office<template v-if="generated"> · {{ generated }}</template>
    </p>
  </footer>
</template>
