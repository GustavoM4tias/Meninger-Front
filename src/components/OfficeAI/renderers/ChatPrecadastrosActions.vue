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

  // ── Abrir relatório de pré-cadastros com filtros aplicados ───────────────
  const dashQuery = {}
  if (c.data_inicio)            dashQuery.data_inicio            = c.data_inicio
  if (c.data_fim)               dashQuery.data_fim               = c.data_fim
  if (c.empreendimento)         dashQuery.empreendimento         = c.empreendimento
  if (c.empresa_correspondente) dashQuery.empresa_correspondente = c.empresa_correspondente
  if (c.correspondente)         dashQuery.correspondente         = c.correspondente
  if (c.imobiliaria)            dashQuery.imobiliaria            = c.imobiliaria
  if (c.corretor)               dashQuery.corretor               = c.corretor
  if (c.situacao_nome)          dashQuery.situacao_nome          = c.situacao_nome
  if (c.lead_origem)            dashQuery.lead_origem            = c.lead_origem
  if (c.excluir_painel)         dashQuery.excluir_painel         = '1'
  if (c.only_active)            dashQuery.only_active            = '1'
  if (c.with_lead)              dashQuery.with_lead              = '1'

  list.push({
    id: 'dashboard',
    icon: 'fas fa-arrow-up-right-from-square',
    label: 'Abrir Relatório',
    color: 'indigo',
    action: () => {
      window.dispatchEvent(new CustomEvent('eme:navigate', {
        detail: { route: '/comercial/precadastros', filters: dashQuery, message: 'Abrindo relatório de pré-cadastros...' },
      }))
    },
  })

  // ── Por CCA / Empresa Correspondente ──────────────────────────────────────
  if (c.group_by !== 'empresa_correspondente') {
    list.push({
      id: 'cca',
      icon: 'fas fa-building-columns',
      label: 'Por CCA',
      color: 'cyan',
      action: () => sendMessage('Agrupe esses pré-cadastros por empresa correspondente'),
    })
  }

  // ── Top CCAs por taxa de aprovação ────────────────────────────────────────
  if (c.metric !== 'taxa_aprovacao') {
    list.push({
      id: 'top-aprovacao',
      icon: 'fas fa-trophy',
      label: 'Top CCAs por Aprovação',
      color: 'emerald',
      action: () => sendMessage('Quais CCAs aprovam mais? Compare a taxa de aprovação entre as empresas correspondentes.'),
    })
  }

  // ── Tempo médio até finalizar por CCA ─────────────────────────────────────
  if (c.metric !== 'tempo_medio_finalizar') {
    list.push({
      id: 'velocidade',
      icon: 'fas fa-stopwatch',
      label: 'Velocidade por CCA',
      color: 'sky',
      action: () => sendMessage('Qual CCA aprova mais rápido? Mostre o tempo médio até finalizar por empresa correspondente.'),
    })
  }

  // ── Por funil (buckets) ───────────────────────────────────────────────────
  if (c.group_by !== 'bucket') {
    list.push({
      id: 'funil',
      icon: 'fas fa-filter',
      label: 'Visão de Funil',
      color: 'violet',
      action: () => sendMessage('Mostre o funil de pré-cadastros agrupado por bucket'),
    })
  }

  // ── Por empreendimento ────────────────────────────────────────────────────
  if (c.group_by !== 'empreendimento' && !c.empreendimento) {
    list.push({
      id: 'empreendimento',
      icon: 'fas fa-building',
      label: 'Por Empreendimento',
      color: 'teal',
      action: () => sendMessage('Agrupe esses pré-cadastros por empreendimento'),
    })
  }

  // ── Pastas paradas ────────────────────────────────────────────────────────
  if (!c.only_active) {
    list.push({
      id: 'paradas',
      icon: 'fas fa-hourglass-half',
      label: 'Pastas em Curso',
      color: 'amber',
      action: () => sendMessage('Quais pastas estão paradas (em análise) há mais tempo?'),
    })
  }

  // ── Excluir Painel (mostrar só leads, não os internos de Painel) ──────────
  if (!c.excluir_painel) {
    list.push({
      id: 'sem-painel',
      icon: 'fas fa-globe',
      label: 'Só Leads (sem Painel)',
      color: 'blue',
      action: () => sendMessage('Filtre apenas pré-cadastros com lead (excluindo Painel)'),
    })
  }

  // ── Por Origem do Lead (quando contexto envolve leads) ────────────────────
  const isLeadContext = c.excluir_painel || c.with_lead || c.lead_origem
  if (isLeadContext && c.group_by !== 'lead_origem') {
    list.push({
      id: 'origem-lead',
      icon: 'fas fa-tags',
      label: 'Por Origem do Lead',
      color: 'rose',
      action: () => sendMessage('Agrupe esses pré-cadastros por origem do lead'),
    })
  }

  // ── Detalhes dos Leads (bridge para query_leads) ──────────────────────────
  // Só faz sentido quando temos a lista de pré-cadastros + idleads no contexto.
  if (c.format === 'list' && Array.isArray(c.idleads) && c.idleads.length) {
    const idsCsv = c.idleads.slice(0, 100).join(',')
    list.push({
      id: 'detalhes-leads',
      icon: 'fas fa-id-card',
      label: 'Detalhes dos Leads',
      color: 'rose',
      action: () => sendMessage(
        `Mostre os leads completos (com telefone, mídia, score) desses ${c.idleads.length} pré-cadastros. ` +
        `Use query_leads com idleads="${idsCsv}" e incluir_painel=true para garantir todos.`
      ),
    })
  }

  // ── Período anterior ──────────────────────────────────────────────────────
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
        (c.empresa_correspondente ? ` para a CCA ${c.empresa_correspondente}` : '') +
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
  indigo:  'bg-indigo-500/10  hover:bg-indigo-500/20  text-indigo-400  dark:text-indigo-400  ring-indigo-500/20',
  cyan:    'bg-cyan-500/10    hover:bg-cyan-500/20    text-cyan-500    dark:text-cyan-400    ring-cyan-500/20',
  violet:  'bg-violet-500/10  hover:bg-violet-500/20  text-violet-500  dark:text-violet-400  ring-violet-500/20',
  emerald: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
  amber:   'bg-amber-500/10   hover:bg-amber-500/20   text-amber-600   dark:text-amber-400   ring-amber-500/20',
  rose:    'bg-rose-500/10    hover:bg-rose-500/20    text-rose-500    dark:text-rose-400    ring-rose-500/20',
  slate:   'bg-slate-500/10   hover:bg-slate-500/20   text-slate-600   dark:text-slate-400   ring-slate-500/20',
  teal:    'bg-teal-500/10    hover:bg-teal-500/20    text-teal-600    dark:text-teal-400    ring-teal-500/20',
  blue:    'bg-blue-500/10    hover:bg-blue-500/20    text-blue-500    dark:text-blue-400    ring-blue-500/20',
  sky:     'bg-sky-500/10     hover:bg-sky-500/20     text-sky-500     dark:text-sky-400     ring-sky-500/20',
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
