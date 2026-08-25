<script setup>
defineProps({
  // Não é obrigatório: a forma normal de usar quando o título precisa de um
  // adorno (o botão de favorito, um badge) é o slot #title, e aí a prop não é
  // passada. Eram 20 telas nesse padrão, cada uma cuspindo "Missing required
  // prop: title" no console - aviso que não apontava defeito nenhum e ainda
  // afogava os que apontam. O render nunca dependeu da prop: o slot já vence.
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  iconImg: { type: String, default: '' },   // logo de marca (PNG/SVG); vence o icon
  eyebrow: { type: String, default: '' },
});
</script>

<template>
  <header class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 mb-6 min-w-0">
    <div class="flex items-start gap-3 min-w-0">
      <div v-if="iconImg"
           class="hidden sm:grid place-items-center h-10 w-10 rounded-xl bg-surface-sunken border border-line shrink-0 overflow-hidden">
        <img :src="iconImg" alt="" class="h-8 w-8 object-contain" />
      </div>
      <div v-else-if="icon"
           class="hidden sm:grid place-items-center h-10 w-10 rounded-xl bg-accent-soft text-accent border border-accent/20 shrink-0">
        <i :class="icon"></i>
      </div>
      <div class="min-w-0">
        <p v-if="eyebrow" class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">{{ eyebrow }}</p>
        <h1 class="text-lg sm:text-2xl font-semibold text-ink tracking-tight flex items-center gap-2 min-w-0 break-words">
          <slot name="title">{{ title }}</slot>
        </h1>
        <p v-if="subtitle || $slots.subtitle" class="text-xs sm:text-sm text-ink-muted mt-0.5">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>
    </div>

    <div v-if="$slots.actions"
         class="flex items-center gap-2 flex-wrap shrink-0 -mx-1 px-1 -my-1 py-1
                overflow-x-auto sm:overflow-visible no-scrollbar">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
