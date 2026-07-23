<script setup>
// Termômetro / velocímetro: mostra onde um indicador está dentro de uma faixa.
// Usado para temperatura de vendas, saúde do funil, atingimento de meta.
import { computed } from 'vue'
import { formatValue } from '../format.js'

const props = defineProps({
  title: { type: String, default: '' },
  value: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  format: { type: String, default: 'number' },
  // zones: faixas coloridas, ex.: [{ upTo: 40, label: 'Frio', tone: 'info' }, ...]
  zones: { type: Array, default: () => [] },
  caption: { type: String, default: '' },
  variant: { type: String, default: 'gauge' }, // gauge (arco) | thermometer (barra)
})

const ZONE_COLORS = {
  info: '#38bdf8',
  success: '#34d399',
  warning: '#f59e0b',
  danger: '#f43f5e',
  accent: 'rgb(var(--rp-accent))',
  neutral: '#94a3b8',
}

const pct = computed(() => {
  const span = props.max - props.min
  if (!span) return 0
  return Math.max(0, Math.min(1, (props.value - props.min) / span))
})

const effectiveZones = computed(() => {
  if (props.zones.length) return props.zones
  return [
    { upTo: props.min + (props.max - props.min) * 0.4, label: 'Baixo', tone: 'danger' },
    { upTo: props.min + (props.max - props.min) * 0.7, label: 'Atenção', tone: 'warning' },
    { upTo: props.max, label: 'Bom', tone: 'success' },
  ]
})

const currentZone = computed(() =>
  effectiveZones.value.find((z) => props.value <= z.upTo) || effectiveZones.value[effectiveZones.value.length - 1]
)

// Arco semicircular: 180° começando à esquerda
const ARC_R = 70
const ARC_CX = 90
const ARC_CY = 84

function arcPath(fromPct, toPct) {
  const a0 = Math.PI * (1 - fromPct)
  const a1 = Math.PI * (1 - toPct)
  const x0 = ARC_CX + ARC_R * Math.cos(a0)
  const y0 = ARC_CY - ARC_R * Math.sin(a0)
  const x1 = ARC_CX + ARC_R * Math.cos(a1)
  const y1 = ARC_CY - ARC_R * Math.sin(a1)
  return `M ${x0} ${y0} A ${ARC_R} ${ARC_R} 0 0 1 ${x1} ${y1}`
}

const zoneArcs = computed(() => {
  const span = props.max - props.min || 1
  let start = 0
  return effectiveZones.value.map((z) => {
    const end = Math.max(0, Math.min(1, (z.upTo - props.min) / span))
    const seg = { path: arcPath(start, end), color: ZONE_COLORS[z.tone] || ZONE_COLORS.neutral, label: z.label }
    start = end
    return seg
  })
})

const needle = computed(() => {
  const a = Math.PI * (1 - pct.value)
  return {
    x: ARC_CX + (ARC_R - 12) * Math.cos(a),
    y: ARC_CY - (ARC_R - 12) * Math.sin(a),
  }
})
</script>

<template>
  <figure class="rounded-xl border border-line bg-surface-raised shadow-soft px-4 py-4 sm:px-5">
    <figcaption v-if="title" class="text-sm font-medium text-ink mb-2">{{ title }}</figcaption>

    <!-- Arco -->
    <div v-if="variant !== 'thermometer'" class="flex flex-col items-center">
      <svg viewBox="0 0 180 100" class="w-full max-w-[260px]" role="img" :aria-label="title">
        <path
          v-for="(a, i) in zoneArcs" :key="i"
          :d="a.path" fill="none" :stroke="a.color" stroke-width="12" stroke-linecap="round" opacity="0.85"
        />
        <line
          :x1="ARC_CX" :y1="ARC_CY" :x2="needle.x" :y2="needle.y"
          stroke="rgb(var(--rp-accent))" stroke-width="3" stroke-linecap="round"
        />
        <circle :cx="ARC_CX" :cy="ARC_CY" r="5" fill="rgb(var(--rp-accent))" />
      </svg>
      <p class="-mt-2 font-display text-3xl text-ink tabular-nums">{{ formatValue(value, format) }}</p>
      <p v-if="currentZone" class="mt-0.5 text-xs font-medium" :style="{ color: ZONE_COLORS[currentZone.tone] }">
        {{ currentZone.label }}
      </p>
    </div>

    <!-- Termômetro (barra) -->
    <div v-else>
      <div class="flex items-baseline justify-between gap-2 mb-2">
        <span class="font-display text-2xl text-ink tabular-nums">{{ formatValue(value, format) }}</span>
        <span v-if="currentZone" class="text-xs font-medium" :style="{ color: ZONE_COLORS[currentZone.tone] }">{{ currentZone.label }}</span>
      </div>
      <div class="relative h-3 rounded-full overflow-hidden flex">
        <div
          v-for="(z, i) in effectiveZones" :key="i"
          class="h-full"
          :style="{
            width: (((z.upTo - (i === 0 ? min : effectiveZones[i - 1].upTo)) / (max - min)) * 100) + '%',
            backgroundColor: ZONE_COLORS[z.tone] || ZONE_COLORS.neutral,
            opacity: 0.35,
          }"
        />
        <div class="absolute top-0 bottom-0 w-1 rounded-full bg-[rgb(var(--rp-accent))]" :style="{ left: `calc(${pct * 100}% - 2px)` }" />
      </div>
      <div class="mt-1 flex justify-between text-[10px] text-ink-subtle tabular-nums">
        <span>{{ formatValue(min, format) }}</span>
        <span>{{ formatValue(max, format) }}</span>
      </div>
    </div>

    <p v-if="caption" class="mt-3 text-xs text-ink-subtle text-center">{{ caption }}</p>
  </figure>
</template>
