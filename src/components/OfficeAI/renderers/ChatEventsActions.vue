<script setup>
import { ref, computed } from 'vue'
import { useOfficeAIStore } from '@/stores/officeAIStore'
import dayjs from 'dayjs'
import ChatEventsReport from './ChatEventsReport.vue'

const props = defineProps({
  context: { type: Object, required: true },
  rows:    { type: Array,  default: () => [] },
})

const aiStore     = useOfficeAIStore()
const showReport  = ref(false)

const buttons = computed(() => {
  const c    = props.context
  const list = []

  const navQuery = {}
  if (c.titulo) navQuery.search = c.titulo

  // ── Abrir Dashboard ──────────────────────────────────────────────────────
  list.push({
    id: 'dashboard',
    icon: 'fas fa-arrow-up-right-from-square',
    label: 'Abrir Dashboard',
    color: 'indigo',
    action: () => window.dispatchEvent(new CustomEvent('eme:navigate', {
      detail: { route: '/marketing/events', filters: { ...navQuery, section: 'Geral' }, message: 'Abrindo eventos...' },
    })),
  })

  // ── Gerar Relatório ──────────────────────────────────────────────────────
  if (props.rows.length) {
    list.push({
      id: 'report',
      icon: showReport.value ? 'fas fa-eye-slash' : 'fas fa-file-image',
      label: showReport.value ? 'Ocultar Relatório' : 'Gerar Relatório',
      color: 'blue',
      action: () => { showReport.value = !showReport.value },
    })
  }

  // ── Agrupamentos ─────────────────────────────────────────────────────────
  const dateCtx = (c.data_inicio && c.data_fim)
    ? ` de ${dayjs(c.data_inicio).format('DD/MM/YYYY')} a ${dayjs(c.data_fim).format('DD/MM/YYYY')}`
    : ''

  const filterCtx = [
    c.empreendimento && `do empreendimento "${c.empreendimento}"`,
    c.cidade && `em ${c.cidade}`,
    c.tag && `com tag "${c.tag}"`,
  ].filter(Boolean).join(', ')

  const suffix = [dateCtx, filterCtx && ` — ${filterCtx}`].filter(Boolean).join('')

  if (c.group_by !== 'tag') {
    list.push({
      id: 'tag',
      icon: 'fas fa-tags',
      label: 'Por Tag',
      color: 'cyan',
      action: () => aiStore.sendMessage(`Agrupe os eventos por tag${suffix}`),
    })
  }

  if (c.group_by !== 'empreendimento') {
    list.push({
      id: 'empreendimento',
      icon: 'fas fa-building',
      label: 'Por Empreendimento',
      color: 'emerald',
      action: () => aiStore.sendMessage(`Agrupe os eventos por empreendimento${suffix}`),
    })
  }

  if (c.group_by !== 'cidade') {
    list.push({
      id: 'cidade',
      icon: 'fas fa-location-dot',
      label: 'Por Cidade',
      color: 'violet',
      action: () => aiStore.sendMessage(`Agrupe os eventos por cidade${suffix}`),
    })
  }

  if (c.group_by !== 'mes') {
    list.push({
      id: 'mes',
      icon: 'fas fa-calendar',
      label: 'Por Mês',
      color: 'amber',
      action: () => aiStore.sendMessage(`Mostre os eventos agrupados por mês${suffix}`),
    })
  }

  // ── Período anterior ─────────────────────────────────────────────────────
  if (c.data_inicio && c.data_fim) {
    const diffDays = dayjs(c.data_fim).diff(dayjs(c.data_inicio), 'day') + 1
    const prevEnd   = dayjs(c.data_inicio).subtract(1, 'day').format('DD/MM/YYYY')
    const prevStart = dayjs(c.data_inicio).subtract(diffDays, 'day').format('DD/MM/YYYY')
    list.push({
      id: 'periodo-anterior',
      icon: 'fas fa-rotate-left',
      label: 'Período Anterior',
      color: 'slate',
      action: () => aiStore.sendMessage(
        `Mostre os eventos de ${prevStart} a ${prevEnd}` +
        (c.group_by ? `, agrupados por ${c.group_by}` : '')
      ),
    })
  }

  return list
})

const colorMap = {
  indigo: 'bg-accent/10 hover:bg-accent/20 text-accent  ring-accent/20',
  blue:   'bg-accent/10 hover:bg-accent/20 text-accent ring-accent/20',
  cyan:   'bg-accent/10 hover:bg-accent/20 text-accent ring-accent/20',
  emerald:'bg-data-pos/10 hover:bg-data-pos/20 text-data-pos ring-data-pos/20',
  violet: 'bg-accent/10 hover:bg-accent/20 text-accent ring-accent/20',
  amber:  'bg-data-warn/10 hover:bg-data-warn/20 text-data-warn ring-data-warn/20',
  slate:  'bg-slate-500/10 hover:bg-surface-sunken text-ink-muted ring-slate-500/20',
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
        :disabled="aiStore.isStreaming && btn.id !== 'report' && btn.id !== 'dashboard'"
        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ring-1 transition disabled:opacity-40 disabled:cursor-not-allowed"
        :class="colorMap[btn.color]"
      >
        <i :class="btn.icon" class="text-[10px]" />
        {{ btn.label }}
      </button>
    </div>

    <!-- Relatório inline -->
    <ChatEventsReport
      v-if="showReport"
      :rows="rows"
      :context="context"
    />
  </div>
</template>
