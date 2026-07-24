<script setup>
// Renderer do relatório: transforma o spec { blocks: [{ id, type, props }] }
// no documento visual, aplicando o tema escolhido.
//
// Modo `editable`: cada bloco ganha uma moldura com padding próprio, checkbox
// de seleção (múltipla), botões de mover/remover e "adicionar bloco aqui".
// Os controles vivem NESSA moldura, nunca por cima do conteúdo.
import { ref, computed, provide } from 'vue'
import { blockComponent, BLOCK_LABELS } from './blocks/registry.js'
import { themeVars } from './themes.js'

const props = defineProps({
  spec: { type: Object, default: () => ({ blocks: [] }) },
  theme: { type: String, default: 'classic' },
  editable: { type: Boolean, default: false },
  selectedIds: { type: Array, default: () => [] },
  highlightId: { type: String, default: null }, // bloco recém-alterado pela Eme
  // Datas do próprio relatório — o rodapé usa estas, nunca o que a IA escrever
  meta: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['toggle', 'remove', 'move', 'add-after'])
const root = ref(null)

// Gráficos leem o tema para casar a paleta com o acento escolhido
provide('reportTheme', computed(() => props.theme))
// Rodapé lê as datas oficiais do relatório
provide('reportMeta', computed(() => props.meta || {}))

const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
const containerStyle = computed(() => ({
  ...themeVars(props.theme, isDark),
  '--rp-space': undefined,
}))

const gap = computed(() => themeVars(props.theme)['--rp-gap'] || '1.25rem')

function extraProps(block) {
  // Blocos de gráfico compartilham o ChartBlock e precisam saber o próprio tipo
  return block.type.startsWith('chart-') ? { blockType: block.type } : {}
}

function scrollToBlock(id) {
  const el = root.value?.querySelector(`[data-block-id="${id}"]`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const isSelected = (id) => props.selectedIds.includes(id)

defineExpose({ scrollToBlock })
</script>

<template>
  <article
    ref="root"
    class="report-doc mx-auto max-w-3xl pb-10"
    :style="containerStyle"
  >
    <div
      v-for="(block, i) in spec.blocks || []"
      :key="block.id"
      :data-block-id="block.id"
      class="relative group transition-colors"
      :class="[
        editable ? 'rounded-lg px-3 pt-7 pb-3 -mx-3 sm:-mx-4 sm:px-4' : '',
        editable && isSelected(block.id) ? 'bg-accent-soft/40 ring-1 ring-accent' : '',
        editable && !isSelected(block.id) ? 'hover:bg-surface-sunken/50 hover:ring-1 hover:ring-line-strong' : '',
        highlightId === block.id ? 'animate-pulse-once' : '',
      ]"
      :style="editable ? {} : { marginBottom: i === (spec.blocks || []).length - 1 ? 0 : gap }"
      @click="editable && emit('toggle', block.id)"
    >
      <!-- Barra de controles: vive no padding superior, fora do conteúdo -->
      <div
        v-if="editable"
        class="absolute top-1 left-3 right-3 sm:left-4 sm:right-4 flex items-center gap-2 h-5"
      >
        <button
          type="button"
          class="flex items-center gap-1.5 text-[10px] uppercase tracking-wider transition-opacity"
          :class="isSelected(block.id) ? 'text-accent opacity-100' : 'text-ink-subtle opacity-0 group-hover:opacity-100'"
          @click.stop="emit('toggle', block.id)"
        >
          <i :class="isSelected(block.id) ? 'fas fa-square-check' : 'far fa-square'" />
          {{ BLOCK_LABELS[block.type] || block.type }}
        </button>

        <div class="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button" title="Mover para cima" :disabled="i === 0"
            class="w-6 h-5 rounded text-ink-subtle hover:text-ink hover:bg-surface-sunken disabled:opacity-30 transition"
            @click.stop="emit('move', block.id, 'up')"
          ><i class="fas fa-chevron-up text-[9px]" /></button>
          <button
            type="button" title="Mover para baixo" :disabled="i === (spec.blocks || []).length - 1"
            class="w-6 h-5 rounded text-ink-subtle hover:text-ink hover:bg-surface-sunken disabled:opacity-30 transition"
            @click.stop="emit('move', block.id, 'down')"
          ><i class="fas fa-chevron-down text-[9px]" /></button>
          <button
            type="button" title="Adicionar bloco depois deste"
            class="w-6 h-5 rounded text-ink-subtle hover:text-accent hover:bg-surface-sunken transition"
            @click.stop="emit('add-after', block.id)"
          ><i class="fas fa-plus text-[9px]" /></button>
          <button
            type="button" title="Remover bloco"
            class="w-6 h-5 rounded text-ink-subtle hover:text-rose-500 hover:bg-surface-sunken transition"
            @click.stop="emit('remove', block.id)"
          ><i class="far fa-trash-can text-[9px]" /></button>
        </div>
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

    <div v-if="editable" class="pt-3">
      <button
        type="button"
        class="w-full rounded-lg border border-dashed border-line py-2.5 text-xs text-ink-subtle hover:border-accent hover:text-accent transition"
        @click="emit('add-after', null)"
      >
        <i class="fas fa-plus mr-1.5" />Adicionar bloco ao final
      </button>
    </div>
  </article>
</template>

<style scoped>
@keyframes pulse-once {
  0% { box-shadow: 0 0 0 0 rgb(var(--rp-accent) / 0.45); }
  70% { box-shadow: 0 0 0 10px rgb(var(--rp-accent) / 0); }
  100% { box-shadow: 0 0 0 0 rgb(var(--rp-accent) / 0); }
}
.animate-pulse-once { animation: pulse-once 1.2s ease-out 2; }
</style>
