<script setup>
import { computed } from 'vue'
import { formatValue } from '../format.js'

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  // stages: [{ label, value, hint? }] - ordem do topo para o fundo do funil
  stages: { type: Array, default: () => [] },
  format: { type: String, default: 'number' },
  caption: { type: String, default: '' },
})

const max = computed(() => Math.max(...props.stages.map((s) => Number(s.value) || 0), 1))

const rows = computed(() =>
  props.stages.map((s, i) => {
    const value = Number(s.value) || 0
    const prev = i > 0 ? Number(props.stages[i - 1].value) || 0 : null
    return {
      ...s,
      value,
      widthPct: Math.max(3, Math.round((value / max.value) * 100)),
      convPct: prev ? Math.round((value / prev) * 1000) / 10 : null,
    }
  })
)
</script>

<template>
  <figure class="rounded-xl border border-line bg-surface-raised shadow-soft px-4 py-4 sm:px-5">
    <figcaption v-if="title || subtitle" class="mb-3">
      <p class="text-sm font-medium text-ink">{{ title }}</p>
      <p v-if="subtitle" class="text-xs text-ink-subtle mt-0.5">{{ subtitle }}</p>
    </figcaption>
    <ol class="space-y-1">
      <li v-for="(r, i) in rows" :key="i">
        <div v-if="r.convPct !== null" class="flex items-center gap-2 pl-1 py-0.5">
          <svg class="w-3 h-3 text-ink-subtle" viewBox="0 0 12 12" fill="none"><path d="M6 1v8M3 6.5 6 9.5 9 6.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="text-[11px] tabular-nums" :class="r.convPct >= 50 ? 'text-emerald-600 dark:text-emerald-400' : r.convPct >= 20 ? 'text-ink-muted' : 'text-amber-600 dark:text-amber-400'">
            {{ r.convPct }}% converteram
          </span>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex-1 min-w-0">
            <div
              class="h-9 rounded-lg bg-accent flex items-center px-3 transition-all duration-700"
              :style="{ width: r.widthPct + '%', opacity: 1 - i * 0.55 / Math.max(rows.length - 1, 1) + '' }"
            >
              <span class="text-xs font-medium text-white truncate drop-shadow-sm">{{ r.label }}</span>
            </div>
          </div>
          <div class="w-24 sm:w-28 text-right flex-shrink-0">
            <span class="text-sm font-semibold text-ink tabular-nums">{{ formatValue(r.value, format) }}</span>
            <p v-if="r.hint" class="text-[10px] text-ink-subtle truncate">{{ r.hint }}</p>
          </div>
        </div>
      </li>
    </ol>
    <p v-if="caption" class="mt-3 text-xs text-ink-subtle">{{ caption }}</p>
  </figure>
</template>
