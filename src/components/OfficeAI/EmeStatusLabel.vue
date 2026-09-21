<script setup>
// A frase do status com a troca animada (o antigo sobe e some, o novo entra
// de baixo) e um brilho varrendo o texto. Preso ao texto por background-clip,
// nunca véu sobre a tela: mostra movimento contínuo mesmo quando a frase
// fica a mesma por segundos. Tudo desliga sob prefers-reduced-motion (regra
// global no main.css).
defineProps({
  label: { type: String, required: true },
})
</script>

<template>
  <span class="relative block min-w-0 overflow-hidden">
    <Transition name="eme-label" mode="out-in">
      <span :key="label" class="eme-shimmer animate-shimmer block truncate">{{ label }}</span>
    </Transition>
  </span>
</template>

<style scoped>
.eme-label-enter-active { transition: opacity .22s ease, transform .22s ease; }
.eme-label-leave-active { transition: opacity .16s ease, transform .16s ease; }
.eme-label-enter-from   { opacity: 0; transform: translateY(6px); }
.eme-label-leave-to     { opacity: 0; transform: translateY(-6px); }

.eme-shimmer {
  color: transparent;
  background-image: linear-gradient(
    90deg,
    rgb(var(--ink-muted)) 0%,
    rgb(var(--ink-muted)) 40%,
    rgb(var(--accent)) 50%,
    rgb(var(--ink-muted)) 60%,
    rgb(var(--ink-muted)) 100%
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
}
</style>
