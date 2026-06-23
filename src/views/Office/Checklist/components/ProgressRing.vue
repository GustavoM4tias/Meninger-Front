<script setup>
import { computed } from 'vue';

const props = defineProps({
    pct: { type: Number, default: 0 },
    size: { type: Number, default: 44 },
    stroke: { type: Number, default: 5 },
});

const radius = computed(() => (props.size - props.stroke) / 2);
const circ = computed(() => 2 * Math.PI * radius.value);
const offset = computed(() => circ.value * (1 - Math.max(0, Math.min(100, props.pct)) / 100));
const color = computed(() => (props.pct >= 100 ? '#22c55e' : props.pct >= 50 ? '#3b82f6' : '#f59e0b'));
</script>

<template>
    <div class="relative inline-flex items-center justify-center" :style="{ width: size + 'px', height: size + 'px' }">
        <svg :width="size" :height="size" class="-rotate-90">
            <circle :cx="size / 2" :cy="size / 2" :r="radius" :stroke-width="stroke" fill="none"
                class="stroke-line" />
            <circle :cx="size / 2" :cy="size / 2" :r="radius" :stroke-width="stroke" fill="none" :stroke="color"
                stroke-linecap="round" :stroke-dasharray="circ" :stroke-dashoffset="offset"
                style="transition: stroke-dashoffset .4s ease" />
        </svg>
        <span class="absolute font-semibold text-ink"
            :style="{ fontSize: Math.max(9, size / 4) + 'px' }">{{ Math.round(pct) }}%</span>
    </div>
</template>
