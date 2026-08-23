<script setup>
// Ranking: lista ordenada com barra proporcional. Ideal para "top origens de
// lead", "corretores por reserva", "empreendimentos por venda".
import { computed, inject, ref, onMounted, onBeforeUnmount } from 'vue'
import { formatValue } from '../format.js'
import { themePalette } from '../themes.js'
import { inlineMd } from '../mdInline.js'
import BlockEmpty from './BlockEmpty.vue'

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  // items: [{ label, value, note? }]
  items: { type: Array, default: () => [] },
  format: { type: String, default: 'number' },
  showShare: { type: Boolean, default: true }, // % sobre o total
  caption: { type: String, default: '' },
  // Relatório interativo: clicar numa posição lista os registros dela
  blockId: { type: String, default: null },
  clickable: { type: Boolean, default: false },
})

const reportDrill = inject('reportDrill', null)
function abrirItem(label) {
  if (!props.clickable || !reportDrill) return
  reportDrill({ kind: 'category', blockId: props.blockId, label: String(label) })
}

// Cada posição recebe uma cor da paleta do tema. Antes todas as barras usavam
// o mesmo acento variando só a opacidade, o que deixava o ranking praticamente
// monocromático — e invisível nos temas de acento neutro.
const reportTheme = inject('reportTheme', computed(() => 'classic'))
const isDark = ref(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
let observer
onMounted(() => {
  observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onBeforeUnmount(() => observer?.disconnect())
const palette = computed(() => themePalette(reportTheme.value, isDark.value))

const captionHtml = computed(() => inlineMd(props.caption))
const vazio = computed(() => !props.items.length)
const total = computed(() => props.items.reduce((s, i) => s + (Number(i.value) || 0), 0))
const max = computed(() => Math.max(...props.items.map((i) => Number(i.value) || 0), 1))

const rows = computed(() =>
  [...props.items]
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    .map((i, idx) => ({
      ...i,
      pos: idx + 1,
      color: palette.value[idx % palette.value.length],
      width: Math.max(2, ((Number(i.value) || 0) / max.value) * 100),
      share: total.value ? Math.round(((Number(i.value) || 0) / total.value) * 1000) / 10 : 0,
    }))
)
</script>

<template>
  <BlockEmpty v-if="vazio" :label="title || 'Ranking'" hint="Nenhum item para classificar neste recorte." icon="fas fa-ranking-star" />
  <figure v-else class="rounded-xl border border-line bg-surface-raised shadow-soft px-4 py-4 sm:px-5">
    <figcaption v-if="title || subtitle" class="mb-3">
      <p v-if="title" class="text-sm font-medium text-ink">{{ title }}</p>
      <p v-if="subtitle" class="text-xs text-ink-subtle mt-0.5">{{ subtitle }}</p>
    </figcaption>

    <ol class="space-y-2.5">
      <li
        v-for="r in rows" :key="r.label"
        :class="clickable ? 'cursor-pointer rounded-lg -mx-2 px-2 py-1 -my-1 hover:bg-surface-sunken/60 transition-colors' : ''"
        :role="clickable ? 'button' : undefined"
        :tabindex="clickable ? 0 : undefined"
        :title="clickable ? 'Ver os registros deste item' : undefined"
        @click="abrirItem(r.label)"
        @keydown.enter="abrirItem(r.label)"
      >
        <div class="flex items-baseline gap-2 mb-1">
          <span
            class="w-5 h-5 rounded-md text-micro font-semibold flex items-center justify-center flex-shrink-0 tabular-nums"
            :class="r.pos <= 3 ? 'text-white' : 'bg-surface-sunken text-ink-subtle'"
            :style="r.pos <= 3 ? { backgroundColor: r.color } : null"
          >{{ r.pos }}</span>
          <span class="text-sm text-ink truncate">{{ r.label }}</span>
          <span class="ml-auto text-sm font-semibold text-ink tabular-nums whitespace-nowrap">{{ formatValue(r.value, format) }}</span>
          <span v-if="showShare" class="text-micro text-ink-subtle tabular-nums w-11 text-right flex-shrink-0">{{ r.share }}%</span>
        </div>
        <div class="h-1.5 rounded-full bg-surface-sunken overflow-hidden ml-7">
          <div
            class="h-full rounded-full transition-all duration-700"
            :style="{ width: r.width + '%', backgroundColor: r.color, opacity: r.pos <= 3 ? 1 : 0.7 }"
          />
        </div>
        <p v-if="r.note" class="ml-7 mt-0.5 text-micro text-ink-subtle">{{ r.note }}</p>
      </li>
    </ol>

    <p v-if="captionHtml" class="mt-3 text-xs text-ink-subtle" v-html="captionHtml" />
  </figure>
</template>
