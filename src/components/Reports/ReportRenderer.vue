<script setup>
// Renderer do relatório: transforma o spec { blocks: [{ id, type, props }] }
// no documento visual. `selectable` liga o overlay "Editar com a Eme" (Fase B).
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
  <article ref="root" class="mx-auto max-w-3xl space-y-5 pb-10">
    <div
      v-for="block in spec.blocks || []"
      :key="block.id"
      :data-block-id="block.id"
      class="relative group rounded-xl transition-shadow"
      :class="{
        'ring-2 ring-accent ring-offset-2 ring-offset-surface': selectedId === block.id,
        'animate-pulse-once': highlightId === block.id,
      }"
    >
      <component
        :is="blockComponent(block.type)"
        v-if="blockComponent(block.type)"
        v-bind="{ ...(block.props || {}), ...extraProps(block) }"
      />
      <div v-else class="rounded-xl border border-dashed border-line px-4 py-3 text-xs text-ink-subtle">
        Bloco desconhecido: {{ block.type }}
      </div>

      <!-- Overlay de seleção (Fase B) -->
      <button
        v-if="selectable"
        type="button"
        class="absolute -top-2.5 right-2 z-10 hidden group-hover:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-white text-[11px] font-medium shadow-elevated hover:bg-accent-hover transition"
        @click.stop="emit('select', block)"
      >
        <i class="fas fa-wand-magic-sparkles text-[10px]" />
        Editar {{ (BLOCK_LABELS[block.type] || 'bloco').toLowerCase() }}
      </button>
      <div
        v-if="selectable"
        class="absolute inset-0 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity ring-1 ring-accent/40"
      />
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
