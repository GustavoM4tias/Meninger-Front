<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useOfficeAIStore } from '@/stores/officeAIStore'
import dayjs from 'dayjs'

const props = defineProps({
  context: { type: Object, required: true },
})

const router = useRouter()
const aiStore = useOfficeAIStore()

// Botões dinâmicos baseados no contexto
const buttons = computed(() => {
  const c = props.context
  const list = []

  // ── Navegar para o dashboard ─────────────────────────────────────────────
  const dashQuery = {}
  if (c.data_inicio) dashQuery.data_inicio = c.data_inicio
  if (c.data_fim)    dashQuery.data_fim    = c.data_fim
  if (c.empreendimento) dashQuery.empreendimento = c.empreendimento
  if (c.imobiliaria)    dashQuery.imobiliaria    = c.imobiliaria
  if (c.corretor)       dashQuery.corretor       = c.corretor
  if (c.midia)          dashQuery.midia_principal = c.midia
  if (c.situacao)       dashQuery.situacao_nome  = c.situacao
  if (c.cidade)         dashQuery.cidade         = c.cidade

  if (!c.incluir_painel) dashQuery.excluir_painel = '1'

  list.push({
    id: 'dashboard',
    icon: 'fas fa-arrow-up-right-from-square',
    label: 'Abrir Dashboard',
    color: 'indigo',
    action: () => {
      window.dispatchEvent(new CustomEvent('eme:navigate', {
        detail: { route: '/marketing/leads', filters: dashQuery, message: 'Abrindo relatório de leads...' },
      }))
    },
  })

  // ── Agrupamentos (se não está agrupado por esse campo) ───────────────────
  if (c.group_by !== 'midia') {
    list.push({
      id: 'midia',
      icon: 'fas fa-chart-bar',
      label: 'Por Mídia',
      color: 'cyan',
      action: () => sendMessage('Agrupe esses leads por mídia'),
    })
  }

  if (c.group_by !== 'situacao') {
    list.push({
      id: 'situacao',
      icon: 'fas fa-tags',
      label: 'Por Situação',
      color: 'violet',
      action: () => sendMessage('Agrupe esses leads por situação'),
    })
  }

  if (c.group_by !== 'empreendimento') {
    list.push({
      id: 'empreendimento',
      icon: 'fas fa-building',
      label: 'Por Empreendimento',
      color: 'emerald',
      action: () => sendMessage('Agrupe esses leads por empreendimento'),
    })
  }

  if (c.group_by !== 'mes') {
    list.push({
      id: 'mes',
      icon: 'fas fa-calendar',
      label: 'Por Mês',
      color: 'amber',
      action: () => sendMessage('Mostre esses leads agrupados por mês'),
    })
  }

  // ── Motivos de descarte ───────────────────────────────────────────────────
  if (c.has_cancelled && c.group_by !== 'motivo_cancelamento') {
    list.push({
      id: 'motivos',
      icon: 'fas fa-circle-xmark',
      label: 'Motivos de Descarte',
      color: 'rose',
      action: () => sendMessage(`Quais os motivos de descarte dos leads de ${c.data_inicio ? dayjs(c.data_inicio).format('DD/MM/YYYY') : 'hoje'}?`),
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
      action: () => sendMessage(
        `Compare com o período anterior: de ${prevStart} a ${prevEnd}` +
        (c.empreendimento ? ` para ${c.empreendimento}` : '') +
        (c.group_by ? `, agrupado por ${c.group_by}` : '')
      ),
    })
  }

  // ── Por imobiliária / corretor ──────────────────────────────────���────────
  if (c.group_by !== 'imobiliaria' && !c.imobiliaria) {
    list.push({
      id: 'imobiliaria',
      icon: 'fas fa-handshake',
      label: 'Por Imobiliária',
      color: 'teal',
      action: () => sendMessage('Agrupe esses leads por imobiliária'),
    })
  }

  if (c.group_by !== 'corretor' && !c.corretor) {
    list.push({
      id: 'corretor',
      icon: 'fas fa-user-tie',
      label: 'Por Corretor',
      color: 'blue',
      action: () => sendMessage('Agrupe esses leads por corretor'),
    })
  }

  return list
})

function sendMessage(text) {
  aiStore.sendMessage(text)
}

const colorMap = {
  indigo: 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 dark:text-indigo-400 ring-indigo-500/20',
  cyan:   'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 ring-cyan-500/20',
  violet: 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 dark:text-violet-400 ring-violet-500/20',
  emerald:'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
  amber:  'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-amber-500/20',
  rose:   'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 ring-rose-500/20',
  slate:  'bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 ring-slate-500/20',
  teal:   'bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 ring-teal-500/20',
  blue:   'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 dark:text-blue-400 ring-blue-500/20',
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
