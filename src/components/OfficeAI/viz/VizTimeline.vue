<script setup>
/**
 * VizTimeline - linha do tempo (histórico da reserva, do repasse, do alerta).
 * timeline: { events: [{ at, title, detail?, tone?, icon? }] } - mais recente em cima.
 */
import { computed } from 'vue';
import dayjs from 'dayjs';

const props = defineProps({ timeline: { type: Object, required: true } });
const TONE = { pos: 'bg-data-pos', neg: 'bg-data-neg', warn: 'bg-data-warn', accent: 'bg-accent', neutral: 'bg-data-neutral' };
const eventos = computed(() => [...(props.timeline.events || [])]
  .sort((a, b) => String(b.at || '').localeCompare(String(a.at || ''))));
const quando = (v) => { const d = dayjs(v); return d.isValid() ? d.format(String(v).length > 10 ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY') : String(v || ''); };
</script>

<template>
  <ol class="p-3 pl-4 relative">
    <span class="absolute left-[19px] top-4 bottom-4 w-px bg-line"></span>
    <li v-for="(e, i) in eventos" :key="i" class="relative pl-5 pb-3 last:pb-0 stagger-in" :style="{ '--i': i }">
      <span class="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface-raised" :class="TONE[e.tone] || 'bg-accent'"></span>
      <p class="text-micro font-mono text-ink-subtle">{{ quando(e.at) }}</p>
      <p class="text-sm text-ink"><i v-if="e.icon" :class="e.icon" class="text-micro mr-1 text-ink-muted"></i>{{ e.title }}</p>
      <p v-if="e.detail" class="text-xs text-ink-muted mt-0.5 break-words">{{ e.detail }}</p>
    </li>
  </ol>
</template>
