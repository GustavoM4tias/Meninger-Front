<script setup>
// Faixa de indicadores das guias analíticas. Segue o desenho dos MetricsCards
// do Faturamento (cartão com ícone à esquerda), mas aceita KPI livre.
defineProps({
  items: { type: Array, required: true }, // [{ label, value, hint?, icon, tone? }]
});

const TONES = {
  accent:  'bg-accent-soft text-accent border-accent/20',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  neutral: 'bg-surface-sunken text-ink-muted border-line',
};
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <div v-for="item in items" :key="item.label"
      class="rounded-xl border border-line bg-surface-raised surface-gradient p-3 sm:p-4
             flex items-start gap-3 transition-shadow duration-200 hover:shadow-soft">
      <div class="h-9 w-9 shrink-0 rounded-lg grid place-items-center text-sm border"
        :class="TONES[item.tone] || TONES.accent">
        <i :class="item.icon"></i>
      </div>
      <div class="min-w-0">
        <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">{{ item.label }}</p>
        <p class="text-lg sm:text-xl font-semibold text-ink tabular-nums leading-tight mt-0.5 truncate">
          {{ item.value }}
        </p>
        <p v-if="item.hint" class="text-[11px] text-ink-muted mt-0.5 truncate">{{ item.hint }}</p>
      </div>
    </div>
  </div>
</template>
