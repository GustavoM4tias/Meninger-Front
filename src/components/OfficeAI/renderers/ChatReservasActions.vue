<script setup>
import { computed } from 'vue'
import { useOfficeAIStore } from '@/stores/officeAIStore'
import dayjs from 'dayjs'

const props = defineProps({
  context: { type: Object, default: () => ({}) },
})

const aiStore = useOfficeAIStore()

const buttons = computed(() => {
  const c = props.context || {}
  const list = []

  // ── Abrir relatório de reservas ─────────────────────────────────────────
  const dashQuery = {}
  if (c.data_inicio)            dashQuery.data_inicio            = c.data_inicio
  if (c.data_fim)               dashQuery.data_fim               = c.data_fim
  if (c.empreendimento)         dashQuery.empreendimento         = c.empreendimento
  if (c.etapa)                  dashQuery.etapa                  = c.etapa
  if (c.bloco)                  dashQuery.bloco                  = c.bloco
  if (c.unidade)                dashQuery.unidade                = c.unidade
  if (c.situacao)               dashQuery.situacao               = c.situacao
  if (c.status_repasse)         dashQuery.status_repasse         = c.status_repasse
  if (c.tipovenda)              dashQuery.tipovenda              = c.tipovenda
  if (c.imobiliaria)            dashQuery.imobiliaria            = c.imobiliaria
  if (c.corretor)               dashQuery.corretor               = c.corretor
  if (c.empresa_correspondente) dashQuery.empresa_correspondente = c.empresa_correspondente
  if (c.lead_origem)            dashQuery.lead_origem            = c.lead_origem
  if (c.only_active)            dashQuery.only_active            = '1'
  if (c.only_vendida)           dashQuery.only_vendida           = '1'
  if (c.with_lead)              dashQuery.with_lead              = '1'
  if (c.excluir_painel)         dashQuery.excluir_painel         = '1'

  list.push({
    id: 'dashboard',
    icon: 'fas fa-arrow-up-right-from-square',
    label: 'Abrir Relatório',
    color: 'indigo',
    action: () => {
      window.dispatchEvent(new CustomEvent('eme:navigate', {
        detail: { route: '/comercial/reservas', filters: dashQuery, message: 'Abrindo relatório de reservas...' },
      }))
    },
  })

  // ── Visão de funil ──────────────────────────────────────────────────────
  if (c.group_by !== 'bucket') {
    list.push({
      id: 'funil',
      icon: 'fas fa-filter',
      label: 'Visão de Funil',
      color: 'violet',
      action: () => sendMessage('Mostre o funil de reservas agrupado por bucket'),
    })
  }

  // ── Por empreendimento ──────────────────────────────────────────────────
  if (c.group_by !== 'empreendimento' && !c.empreendimento) {
    list.push({
      id: 'empreendimento',
      icon: 'fas fa-building',
      label: 'Por Empreendimento',
      color: 'teal',
      action: () => sendMessage('Agrupe essas reservas por empreendimento'),
    })
  }

  // ── Por corretor ─────────────────────────────────────────────────────────
  if (c.group_by !== 'corretor' && !c.corretor) {
    list.push({
      id: 'corretor',
      icon: 'fas fa-user-tie',
      label: 'Por Corretor',
      color: 'blue',
      action: () => sendMessage('Agrupe essas reservas por corretor'),
    })
  }

  // ── Por imobiliária ──────────────────────────────────────────────────────
  if (c.group_by !== 'imobiliaria' && !c.imobiliaria) {
    list.push({
      id: 'imobiliaria',
      icon: 'fas fa-handshake',
      label: 'Por Imobiliária',
      color: 'cyan',
      action: () => sendMessage('Agrupe essas reservas por imobiliária'),
    })
  }

  // ── Excluir Painel ───────────────────────────────────────────────────────
  if (!c.excluir_painel) {
    list.push({
      id: 'sem-painel',
      icon: 'fas fa-globe',
      label: 'Só Leads (sem Painel)',
      color: 'blue',
      action: () => sendMessage('Filtre apenas reservas com lead (excluindo Painel)'),
    })
  }

  // ── Por Origem do Lead ───────────────────────────────────────────────────
  const isLeadContext = c.excluir_painel || c.with_lead || c.lead_origem
  if (isLeadContext && c.group_by !== 'lead_origem') {
    list.push({
      id: 'origem-lead',
      icon: 'fas fa-tags',
      label: 'Por Origem do Lead',
      color: 'rose',
      action: () => sendMessage('Agrupe essas reservas por origem do lead'),
    })
  }

  // ── Bridge: Pré-cadastros que originaram estas reservas ──────────────────
  if (c.format === 'list' && Array.isArray(c.idprecadastros) && c.idprecadastros.length) {
    const idsCsv = c.idprecadastros.slice(0, 100).join(',')
    list.push({
      id: 'precads-origem',
      icon: 'fas fa-folder-open',
      label: 'Pré-cadastros de Origem',
      color: 'emerald',
      action: () => sendMessage(
        `Mostre os pré-cadastros que originaram essas ${c.idprecadastros.length} reservas. ` +
        `Use query_precadastros com idprecadastros="${idsCsv}".`
      ),
    })
  }

  // ── Bridge: Detalhes dos Leads vinculados ────────────────────────────────
  if (c.format === 'list' && Array.isArray(c.idleads) && c.idleads.length) {
    const idsCsv = c.idleads.slice(0, 100).join(',')
    list.push({
      id: 'detalhes-leads',
      icon: 'fas fa-id-card',
      label: 'Detalhes dos Leads',
      color: 'rose',
      action: () => sendMessage(
        `Mostre os leads completos (com telefone, mídia, score) dessas ${c.idleads.length} reservas. ` +
        `Use query_leads com idleads="${idsCsv}" e incluir_painel=true para garantir todos.`
      ),
    })
  }

  // ── Período anterior ─────────────────────────────────────────────────────
  if (c.data_inicio && c.data_fim) {
    const diffDays  = dayjs(c.data_fim).diff(dayjs(c.data_inicio), 'day') + 1
    const prevEnd   = dayjs(c.data_inicio).subtract(1, 'day').format('DD/MM/YYYY')
    const prevStart = dayjs(c.data_inicio).subtract(diffDays, 'day').format('DD/MM/YYYY')
    list.push({
      id: 'periodo-anterior',
      icon: 'fas fa-rotate-left',
      label: 'Período Anterior',
      color: 'slate',
      action: () => sendMessage(
        `Compare com o período anterior: de ${prevStart} a ${prevEnd}` +
        (c.empreendimento ? ` no empreendimento ${c.empreendimento}` : '')
      ),
    })
  }

  return list
})

function sendMessage(text) {
  aiStore.sendMessage(text)
}

const colorMap = {
  indigo:  'bg-accent/10  hover:bg-accent/20  text-accent    ring-accent/20',
  cyan:    'bg-accent/10    hover:bg-accent/20    text-accent    ring-accent/20',
  violet:  'bg-accent/10  hover:bg-accent/20  text-accent  ring-accent/20',
  emerald: 'bg-data-pos/10 hover:bg-data-pos/20 text-data-pos ring-data-pos/20',
  amber:   'bg-data-warn/10   hover:bg-data-warn/20   text-data-warn   ring-data-warn/20',
  rose:    'bg-data-neg/10    hover:bg-data-neg/20    text-data-neg    ring-data-neg/20',
  slate:   'bg-slate-500/10   hover:bg-surface-sunken   text-ink-muted   ring-slate-500/20',
  teal:    'bg-teal-500/10    hover:bg-teal-500/20    text-teal-600    dark:text-teal-400    ring-teal-500/20',
  blue:    'bg-accent/10    hover:bg-accent/20    text-accent    ring-accent/20',
  sky:     'bg-accent/10     hover:bg-accent/20     text-accent     ring-accent/20',
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
