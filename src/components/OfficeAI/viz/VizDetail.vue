<script setup>
/**
 * VizDetail - a ficha de UM registro: campo-valor em seções.
 * detail: { fields?: Field[], sections?: [{ title, icon?, fields: Field[] }] }
 * Field: { label, value, type?, tone?, wide? }
 */
import { computed } from 'vue';
import { formatarValor } from './formatos.js';

const props = defineProps({
  detail: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});

const secoes = computed(() => {
  const out = [];
  if (props.detail.fields?.length) out.push({ title: '', fields: props.detail.fields });
  for (const s of props.detail.sections || []) if (s?.fields?.length) out.push(s);
  return out;
});
const TONE = { pos: 'text-data-pos', neg: 'text-data-neg', warn: 'text-data-warn', accent: 'text-accent' };
</script>

<template>
  <div class="p-3 space-y-3">
    <section v-for="(s, i) in secoes" :key="i">
      <p v-if="s.title" class="text-micro uppercase tracking-wider text-ink-subtle font-mono mb-1.5 flex items-center gap-1.5">
        <i v-if="s.icon" :class="s.icon"></i>{{ s.title }}
      </p>
      <dl class="grid gap-x-4 gap-y-2" :class="compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'">
        <div v-for="(f, j) in s.fields" :key="j" class="min-w-0" :class="f.wide ? 'col-span-2 sm:col-span-3' : ''">
          <dt class="text-micro text-ink-subtle truncate">{{ f.label }}</dt>
          <dd class="text-sm text-ink break-words" :class="[TONE[f.tone] || '', ['number','currency','percent'].includes(f.type) ? 'metric text-metric-sm' : '']">
            <a v-if="f.type === 'link' && f.value" :href="String(f.value)" target="_blank" rel="noopener" class="text-accent hover:underline text-sm">{{ f.text || f.value }}</a>
            <template v-else>{{ formatarValor(f.value, f.type) }}</template>
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>
