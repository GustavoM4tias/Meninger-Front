<script setup>
// Estado vazio de um bloco do relatório.
//
// Antes, bloco sem dado simplesmente não renderizava nada: sobrava um buraco no
// documento e ninguém sabia se era erro, falta de acesso ou ausência real de
// registro. Agora todo bloco que não tem o que mostrar declara isso na cara,
// com o rótulo do que deveria estar ali.
defineProps({
  label: { type: String, default: 'Sem dados' },
  hint: { type: String, default: '' },
  icon: { type: String, default: 'fas fa-chart-simple' },
})
</script>

<template>
  <div class="rounded-xl border border-dashed border-line bg-surface-sunken/40 px-4 py-5 text-center">
    <i :class="icon" class="text-ink-subtle text-sm" />
    <p class="mt-1.5 text-sm font-medium text-ink-muted">{{ label }}</p>
    <p v-if="hint" class="mt-0.5 text-xs text-ink-subtle">{{ hint }}</p>
  </div>
</template>
