<script setup>
/**
 * HighlightCards — a faixa de números de topo do "Sobre o Office".
 * ─────────────────────────────────────────────────────────────────────────────
 * Usada pelo Mapa do Sistema e pela Visão Executiva, para as duas telas nunca
 * divergirem. Um cartão com `info` ganha o botão de detalhe, que abre o tooltip
 * explicando a composição do número (no celular, o tooltip abre no toque).
 */
defineProps({
    items: { type: Array, required: true },
    updatedLabel: { type: String, default: '' },
    isLive: { type: Boolean, default: false },
});
</script>

<template>
  <div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
      <div v-for="kpi in items" :key="kpi.l"
           class="relative rounded-xl border border-line bg-surface-raised surface-gradient
                  shadow-soft p-3 sm:p-4">
        <button v-if="kpi.info" type="button" v-tippy="kpi.info"
                aria-label="Como este número é calculado"
                class="absolute top-2 right-2 grid place-items-center h-7 w-7 rounded-md
                       text-ink-subtle hover:text-accent hover:bg-surface-sunken
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring/40
                       transition-colors">
          <i class="fas fa-circle-info text-xs"></i>
        </button>

        <p class="text-lg sm:text-2xl font-semibold text-accent tracking-tight tabular-nums"
           :class="kpi.info ? 'pr-7' : ''">
          {{ kpi.v }}
        </p>
        <p class="text-micro sm:text-xs font-medium text-ink mt-0.5">{{ kpi.l }}</p>
        <p class="text-micro sm:text-micro text-ink-subtle leading-snug mt-1">{{ kpi.s }}</p>
      </div>
    </div>

    <p v-if="updatedLabel" class="flex items-center gap-1.5 text-micro text-ink-subtle">
      <span v-if="isLive" class="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-dot-pulse"></span>
      {{ updatedLabel }}
    </p>
  </div>
</template>
