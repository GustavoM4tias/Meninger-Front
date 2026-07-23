<script setup>
// Renderer do relatório: transforma o spec { blocks: [{ id, type, props }] }
// no documento visual. `selectable` liga o overlay "Editar com a Eme" (Fase B).
//
// No modo selectable cada bloco ganha uma moldura com padding próprio: o botão
// e o contorno de hover vivem NESSA área, nunca por cima do conteúdo.
import { ref } from 'vue'
import { blockComponent, BLOCK_LABELS } from './blocks/registry.js'

defineProps({
  spec: { type: Object, default: () => ({ blocks: [] }) },
  selectable: { type: Boolean, default: false },
  selectedId: { type: String, default: null },
  highlightId: { type: String, default: null }, // bloco recém-alterado pela Eme
})

const emit = defineEmits(['select'])
const root = ref(null)

function extraProps(block) {
  // Blocos de gráfico compartilham o ChartBlock e precisam saber o próprio tipo
  return block.type.startsWith('chart-') ? { blockType: block.type } : {}
}

function scrollToBlock(id) {
  const el = root.value?.querySelector(`[data-block-id="${id}"]`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

defineExpose({ scrollToBlock })
</script>

<template>
  <article
    ref="root"
    class="mx-auto max-w-3xl pb-10"
    :class="selectable ? 'space-y-1' : 'space-y-5'"
  >
    <div
      v-for="block in spec.blocks || []"
      :key="block.id"
      :data-block-id="block.id"
      class="relative group rounded-lg transition-colors"
      :class="[
        selectable ? 'px-3 pt-7 pb-3 -mx-3 sm:-mx-4 sm:px-4' : '',
        selectable && selectedId === block.id ? 'bg-accent-soft/40 ring-1 ring-accent' : '',
        selectable && selectedId !== block.id ? 'hover:bg-surface-sunken/50 hover:ring-1 hover:ring-line-strong' : '',
        highlightId === block.id ? 'animate-pulse-once' : '',
      ]"
    >
      <!-- Barra de ação: vive no padding superior, fora do conteúdo -->
      <div
        v-if="selectable"
        class="absolute top-1 left-3 right-3 sm:left-4 sm:right-4 flex items-center gap-2 h-5"
      >
        <span class="text-[10px] uppercase tracking-wider text-ink-subtle opacity-0 group-hover:opacity-100 transition-opacity">
          {{ BLOCK_LABELS[block.type] || block.type }}
        </span>
        <button
          type="button"
          class="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-accent-hover transition"
          @click.stop="emit('select', block)"
        >
          <i class="fas fa-wand-magic-sparkles text-[9px]" />
          Editar
        </button>
      </div>

      <component
        :is="blockComponent(block.type)"
        v-if="blockComponent(block.type)"
        v-bind="{ ...(block.props || {}), ...extraProps(block) }"
      />
      <div v-else class="rounded-lg border border-dashed border-line px-4 py-3 text-xs text-ink-subtle">
        Bloco desconhecido: {{ block.type }}
      </div>
    </div>
  </article>
</template>

<style scoped>
@keyframes pulse-once {
  0% { box-shadow: 0 0 0 0 rgb(var(--accent) / 0.45); }
  70% { box-shadow: 0 0 0 10px rgb(var(--accent) / 0); }
  100% { box-shadow: 0 0 0 0 rgb(var(--accent) / 0); }
}
.animate-pulse-once { animation: pulse-once 1.2s ease-out 2; }
</style>
