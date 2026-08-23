<script setup>
import { computed } from 'vue'
import { useOfficeAIStore } from '@/stores/officeAIStore'

const props = defineProps({
  context: { type: Object, required: true },
})

const aiStore = useOfficeAIStore()

const buttons = computed(() => {
  const c = props.context
  const list = []

  // ── Navegar para o dashboard ─────────────────────────────────────────────
  const dashQuery = {}
  if (c.cidade)             dashQuery.cidade             = c.cidade
  if (c.situacao_comercial) dashQuery.situacao_comercial = c.situacao_comercial
  if (c.situacao_obra)      dashQuery.situacao_obra      = c.situacao_obra
  if (c.tipo)               dashQuery.tipo               = c.tipo
  if (c.segmento)           dashQuery.segmento           = c.segmento

  list.push({
    id: 'dashboard',
    icon: 'fas fa-arrow-up-right-from-square',
    label: 'Abrir Dashboard',
    color: 'indigo',
    action: () => window.dispatchEvent(new CustomEvent('eme:navigate', {
      detail: { route: '/comercial/buildings', filters: dashQuery, message: 'Abrindo empreendimentos...' },
    })),
  })

  // ── Agrupamentos disponíveis ─────────────────────────────────────────────
  if (c.group_by !== 'situacao_comercial') {
    list.push({
      id: 'sit-comercial',
      icon: 'fas fa-tags',
      label: 'Por Situação',
      color: 'violet',
      action: () => sendMessage(buildPrompt('situação comercial', c)),
    })
  }

  if (c.group_by !== 'cidade') {
    list.push({
      id: 'cidade',
      icon: 'fas fa-map-marker-alt',
      label: 'Por Cidade',
      color: 'cyan',
      action: () => sendMessage(buildPrompt('cidade', c)),
    })
  }

  if (c.group_by !== 'tipo') {
    list.push({
      id: 'tipo',
      icon: 'fas fa-building',
      label: 'Por Tipo',
      color: 'emerald',
      action: () => sendMessage(buildPrompt('tipo', c)),
    })
  }

  if (c.group_by !== 'segmento') {
    list.push({
      id: 'segmento',
      icon: 'fas fa-layer-group',
      label: 'Por Segmento',
      color: 'amber',
      action: () => sendMessage(buildPrompt('segmento', c)),
    })
  }

  if (c.group_by !== 'situacao_obra') {
    list.push({
      id: 'sit-obra',
      icon: 'fas fa-hard-hat',
      label: 'Por Obra',
      color: 'orange',
      action: () => sendMessage(buildPrompt('situação de obra', c)),
    })
  }

  return list
})

function buildPrompt(agrupamento, c) {
  const partes = [`Agrupe os empreendimentos por ${agrupamento}`]
  if (c.cidade)             partes.push(`na cidade ${c.cidade}`)
  if (c.situacao_comercial) partes.push(`com situação comercial "${c.situacao_comercial}"`)
  if (c.segmento)           partes.push(`do segmento ${c.segmento}`)
  return partes.join(' ')
}

function sendMessage(text) {
  aiStore.sendMessage(text)
}

const colorMap = {
  indigo: 'bg-accent/10 hover:bg-accent/20 text-accent ring-accent/20',
  violet: 'bg-accent/10 hover:bg-accent/20 text-accent ring-accent/20',
  cyan:   'bg-accent/10 hover:bg-accent/20 text-accent ring-accent/20',
  emerald:'bg-data-pos/10 hover:bg-data-pos/20 text-data-pos ring-data-pos/20',
  amber:  'bg-data-warn/10 hover:bg-data-warn/20 text-data-warn ring-data-warn/20',
  orange: 'bg-data-warn/10 hover:bg-data-warn/20 text-data-warn ring-data-warn/20',
}
</script>

<template>
  <div class="mt-3 pt-3 border-t border-line dark:border-white/5">
    <p class="text-micro text-ink-subtle uppercase tracking-wide mb-2">Sugestões</p>
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="btn in buttons"
        :key="btn.id"
        @click="btn.action()"
        :disabled="aiStore.isStreaming"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ring-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
        :class="colorMap[btn.color]"
      >
        <i :class="btn.icon" class="text-[10px]" />
        {{ btn.label }}
      </button>
    </div>
  </div>
</template>
