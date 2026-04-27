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
  indigo: 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 ring-indigo-500/20',
  violet: 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 dark:text-violet-400 ring-violet-500/20',
  cyan:   'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 ring-cyan-500/20',
  emerald:'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
  amber:  'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-amber-500/20',
  orange: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 ring-orange-500/20',
}
</script>

<template>
  <div class="mt-3 pt-3 border-t border-gray-200 dark:border-white/5">
    <p class="text-[11px] text-gray-400 dark:text-slate-600 uppercase tracking-wide mb-2">Sugestões</p>
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
