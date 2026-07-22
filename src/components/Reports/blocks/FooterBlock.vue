<script setup>
defineProps({
  sources: { type: Array, default: () => [] }, // ['Leads (Office)', 'Reservas (CV)']
  generatedAt: { type: String, default: '' },
  refreshedAt: { type: String, default: '' },
  note: { type: String, default: '' },
})
</script>

<template>
  <footer class="mt-4 pt-5 border-t border-line text-xs text-ink-subtle space-y-1.5">
    <p v-if="sources.length"><span class="font-medium text-ink-muted">Fontes:</span> {{ sources.join(' · ') }}</p>
    <p v-if="refreshedAt"><span class="font-medium text-ink-muted">Dados de:</span> {{ refreshedAt }}</p>
    <p v-if="note">{{ note }}</p>
    <p class="pt-1">Gerado pela Eme · Menin Office<span v-if="generatedAt"> · {{ generatedAt }}</span></p>
  </footer>
</template>
