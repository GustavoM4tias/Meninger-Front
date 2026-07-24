<script setup>
// Adicionar um bloco ao relatório, em posição específica.
// Blocos estruturais (texto, nota, separador) entram na hora, vazios e prontos
// para editar. Blocos com dados são pedidos à Eme, que preenche com dado real.
import { ref } from 'vue'
import Modal from '@/components/UI/Modal.vue'
import { useReportsStore } from '@/stores/Reports/reportsStore.js'
import { BLOCK_LABELS } from '../blocks/registry.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  afterId: { type: String, default: null },
})
const emit = defineEmits(['close'])

const store = useReportsStore()
const instruction = ref('')

// Blocos que entram direto (sem IA), já com conteúdo de exemplo editável
const DIRECT = {
  'narrative': { markdown: 'Escreva aqui a análise, ou peça à Eme para preencher.' },
  'note': { text: 'Nota de rodapé.' },
  'insight-box': { label: 'Insight', text: 'Um destaque curto e direto.' },
  'divider': {},
}

const GROUPS = [
  {
    title: 'Estrutura e texto',
    items: ['section-header', 'narrative', 'insight-box', 'note', 'divider', 'highlight-list'],
  },
  {
    title: 'Números',
    items: ['stat-row', 'big-number', 'progress-goal', 'comparison', 'gauge'],
  },
  {
    title: 'Gráficos',
    items: ['chart-bar', 'chart-line', 'chart-donut', 'chart-funnel', 'ranking'],
  },
  {
    title: 'Tabelas e mídia',
    items: ['table', 'timeline', 'map', 'image'],
  },
]

const ICONS = {
  'section-header': 'fas fa-heading',
  'narrative': 'fas fa-align-left',
  'insight-box': 'fas fa-lightbulb',
  'note': 'fas fa-comment-dots',
  'divider': 'fas fa-minus',
  'highlight-list': 'fas fa-list-check',
  'stat-row': 'fas fa-chart-simple',
  'big-number': 'fas fa-hashtag',
  'progress-goal': 'fas fa-bullseye',
  'comparison': 'fas fa-code-compare',
  'gauge': 'fas fa-gauge-high',
  'chart-bar': 'fas fa-chart-column',
  'chart-line': 'fas fa-chart-line',
  'chart-donut': 'fas fa-chart-pie',
  'chart-funnel': 'fas fa-filter',
  'ranking': 'fas fa-ranking-star',
  'table': 'fas fa-table',
  'timeline': 'fas fa-timeline',
  'map': 'fas fa-map-location-dot',
  'image': 'fas fa-image',
}

async function add(type) {
  if (DIRECT[type]) {
    const blocks = [...(store.spec.blocks || [])]
    const block = { id: `b${Date.now().toString(36)}`, type, props: { ...DIRECT[type] } }
    const at = props.afterId ? blocks.findIndex((b) => b.id === props.afterId) : -1
    blocks.splice(at >= 0 ? at + 1 : blocks.length, 0, block)
    await store.saveSpec({ ...store.spec, blocks }, `Bloco adicionado (${BLOCK_LABELS[type] || type})`)
    store.selectOnly(block.id)
    emit('close')
    return
  }
  // Bloco com dados → a Eme monta com dado real
  const posicao = props.afterId ? `logo depois do bloco "${props.afterId}"` : 'no final do relatório'
  const extra = instruction.value.trim() ? ` Detalhes: ${instruction.value.trim()}` : ''
  store.sendMessage(`Adicione um bloco do tipo "${type}" (${BLOCK_LABELS[type]}) ${posicao}, buscando os dados necessários.${extra}`)
  instruction.value = ''
  emit('close')
}
</script>

<template>
  <Modal
    :open="open"
    title="Adicionar bloco"
    :subtitle="afterId ? 'Será inserido logo depois do bloco selecionado' : 'Será inserido ao final do relatório'"
    size="lg"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <div v-for="g in GROUPS" :key="g.title">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle mb-1.5">{{ g.title }}</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            v-for="type in g.items" :key="type"
            class="flex items-center gap-2.5 rounded-xl border border-line bg-surface-raised px-3 py-2.5 text-left hover:border-accent hover:bg-accent-soft/40 transition"
            @click="add(type)"
          >
            <i :class="ICONS[type]" class="text-accent text-sm w-4 text-center flex-shrink-0" />
            <span class="text-xs text-ink truncate">{{ BLOCK_LABELS[type] || type }}</span>
            <i v-if="!DIRECT[type]" class="fas fa-wand-magic-sparkles text-[9px] text-ink-subtle ml-auto flex-shrink-0" title="A Eme busca os dados" />
          </button>
        </div>
      </div>

      <div class="rounded-xl border border-line bg-surface-sunken px-3 py-2.5">
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-ink-subtle mb-1.5">
          Instrução para a Eme (opcional)
        </label>
        <input
          v-model="instruction"
          type="text"
          placeholder="Ex.: leads por origem, só dos últimos 30 dias"
          class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-ring"
        />
        <p class="mt-1.5 text-[11px] text-ink-subtle">
          <i class="fas fa-wand-magic-sparkles mr-1" />Blocos marcados com a varinha são montados pela Eme com dados reais.
        </p>
      </div>
    </div>
  </Modal>
</template>
