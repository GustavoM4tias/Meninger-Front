<script setup>
// Card visual da Ficha Comercial no chat da Eme (action.type === 'condition_sheet').
// Mostra a ficha mais recente e, quando ela não está autorizada, a última
// autorizada em aba separada. Rodapé: sugestões de follow-up + abrir ficha
// completa (navega e deixa a Eme flutuando, padrão eme:navigate).
import { computed, ref, watch } from 'vue'
import { useOfficeAIStore } from '@/stores/officeAIStore'

const props = defineProps({
  action: { type: Object, required: true },
})

const aiStore = useOfficeAIStore()

// ── Abas: mais recente + (opcional) última autorizada ────────────────────────
const tabs = computed(() => {
  const list = [{ key: 'recente', fonte: props.action.fonte || {}, ficha: props.action.ficha || {} }]
  if (props.action.ficha_autorizada) {
    list.push({ key: 'autorizada', fonte: props.action.fonte_autorizada || {}, ficha: props.action.ficha_autorizada })
  }
  return list
})

const activeKey = ref('recente')
const active = computed(() => tabs.value.find(t => t.key === activeKey.value) || tabs.value[0])

const modules = computed(() => active.value.ficha?.modulos || [])
const moduleIdx = ref(0)
watch(activeKey, () => { moduleIdx.value = 0 })
const mod = computed(() => modules.value[moduleIdx.value] || {})

const showDetails = ref(false)

// ── Formatação ───────────────────────────────────────────────────────────────
const fmtBRL = (v) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
const fmtPct = (v) => (v == null ? '—' : `${Number(v).toLocaleString('pt-BR')}%`)

const statusClass = (fonte) => {
  const s = fonte?.status || ''
  if (s === 'Autorizada')      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20'
  if (s === 'Encerrada')       return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-slate-500/20'
  if (s === 'Em autorização')  return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20'
  return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 ring-gray-500/20' // Rascunho
}

// ── Indicadores principais (módulo com fallback pro nível da ficha) ──────────
const indicadores = computed(() => {
  const f = active.value.ficha || {}
  const m = mod.value
  return [
    { label: 'Comissão',       value: fmtPct(m.operacional?.comissao_pct ?? f.comissao_pct) },
    { label: 'Entrada máx.',   value: m.negociacao?.entrada_maxima != null ? fmtBRL(m.negociacao.entrada_maxima) : '—' },
    { label: 'Máx. parcelas',  value: m.negociacao?.max_parcelas ?? '—' },
    { label: 'Prazo entrega',  value: (m.operacional?.prazo_entrega_meses ?? f.prazo_entrega_meses) != null ? `${m.operacional?.prazo_entrega_meses ?? f.prazo_entrega_meses} meses` : '—' },
  ]
})

const custos = computed(() => active.value.ficha?.custos_totais || null)
const campanhas = computed(() => mod.value.campanhas || [])

// Documentação/operacional (seção "mais detalhes")
const docItems = computed(() => {
  const d = mod.value.documentacao || {}
  const o = mod.value.operacional || {}
  const items = []
  if (d.pacote_cef)  items.push({ label: 'Pacote CEF', value: `${fmtBRL(d.pacote_cef.valor)}${d.pacote_cef.pago_por ? ` · ${d.pacote_cef.pago_por}` : ''}` })
  if (d.itbi === 'Isento') items.push({ label: 'ITBI', value: 'Isento' })
  else if (d.itbi)   items.push({ label: 'ITBI', value: `${fmtBRL(d.itbi.valor)}${d.itbi.pago_por ? ` · ${d.itbi.pago_por}` : ''}` })
  if (d.cartorio)    items.push({ label: 'Cartório', value: `${fmtBRL((Number(d.cartorio.prenotacao) || 0) + (Number(d.cartorio.registro) || 0))}${d.cartorio.pago_por ? ` · ${d.cartorio.pago_por}` : ''}` })
  if (o.cca)         items.push({ label: `CCA${o.cca.empresa ? ` (${o.cca.empresa})` : ''}`, value: `${fmtBRL(o.cca.custo)}${o.cca.pago_por ? ` · ${o.cca.pago_por}` : ''}` })
  if (o.certificacao_digital) items.push({ label: 'Cert. digital', value: `${fmtBRL(o.certificacao_digital.custo)}${o.certificacao_digital.pago_por ? ` · ${o.certificacao_digital.pago_por}` : ''}` })
  return items
})

const negItems = computed(() => {
  const n = mod.value.negociacao || {}
  const items = []
  if (n.parcela_ato != null)    items.push({ label: 'Parcela do Ato', value: fmtBRL(n.parcela_ato) })
  if (n.parcela_rp != null)     items.push({ label: 'Parcela RP', value: fmtBRL(n.parcela_rp) })
  if (n.parcela_minima != null) items.push({ label: 'Parcela mínima', value: fmtBRL(n.parcela_minima) })
  if (n.correcao_ate_habite_se) items.push({ label: 'Até habite-se', value: n.correcao_ate_habite_se })
  if (n.correcao_pos_habite_se) items.push({ label: 'Pós habite-se', value: n.correcao_pos_habite_se })
  return items
})

const tabelas = computed(() => {
  const p = mod.value.precos || {}
  return [...(p.tabelas_cv || []), ...(p.tabelas_manuais || []).map(t => t.nome).filter(Boolean)]
})

// ── Ações ────────────────────────────────────────────────────────────────────
const nome = computed(() => props.action.fonte?.empreendimento || '')

function openFicha() {
  const id = active.value.fonte?.ficha_id
  if (!id) return
  window.dispatchEvent(new CustomEvent('eme:navigate', {
    detail: { route: `/comercial/conditions/${id}`, message: 'Abrindo ficha completa...' },
  }))
}

// Pool de sugestões por tema. O backend ecoa em context.foco o tema que o
// usuário acabou de perguntar — esse sai da lista e entram as próximas do pool.
const foco = computed(() => props.action.context?.foco || 'geral')

const POOL = computed(() => [
  { id: 'campanhas',    icon: 'fas fa-bullhorn',         label: 'Campanhas',        prompt: `Quais campanhas estão valendo na ficha do ${nome.value}?` },
  { id: 'custos',       icon: 'fas fa-hand-holding-usd', label: 'Custos',           prompt: `Quais os custos Menin e Cliente na ficha do ${nome.value}?` },
  { id: 'negociacao',   icon: 'fas fa-handshake',        label: 'Negociação',       prompt: `Quais as regras de negociação (entrada, parcelas, correção) da ficha do ${nome.value}?` },
  { id: 'comissao',     icon: 'fas fa-percent',          label: 'Comissão',         prompt: `Qual a comissão na ficha do ${nome.value}?` },
  { id: 'precos',       icon: 'fas fa-table-list',       label: 'Tabelas de preço', prompt: `Quais tabelas de preço estão valendo na ficha do ${nome.value}?` },
  { id: 'documentacao', icon: 'fas fa-file-signature',   label: 'ITBI & Docs',      prompt: `Como ficam ITBI, cartório e pacote CEF na ficha do ${nome.value}? Quem paga cada um?` },
  { id: 'prazo',        icon: 'fas fa-clock',            label: 'Prazo',            prompt: `Qual o prazo de entrega na ficha do ${nome.value}?` },
])

const sugestoes = computed(() => {
  const list = POOL.value.filter(s => s.id !== foco.value).slice(0, 3)
  list.push({ id: 'mudancas', icon: 'fas fa-code-compare', label: 'O que mudou?', prompt: `Compare a ficha do ${nome.value} com o mês anterior: o que mudou?` })
  // Evolução só faz sentido com 3+ meses de histórico na série
  if ((props.action.meses_disponiveis || '').split(',').length >= 3) {
    list.push({ id: 'evolucao', icon: 'fas fa-chart-line', label: 'Evolução', prompt: `Mostre a evolução da ficha do ${nome.value} desde o início: o que mudou?` })
  }
  return list
})

function send(prompt) {
  if (aiStore.isStreaming) return
  aiStore.sendMessage(prompt)
}
</script>

<template>
  <div class="mt-2 rounded-2xl border border-line bg-surface-raised overflow-hidden shadow-soft">
    <!-- Header -->
    <div class="flex items-center gap-3 px-4 py-3 border-b border-line">
      <img v-if="action.fonte?.logo" :src="action.fonte.logo" alt=""
        class="h-9 w-9 rounded-lg object-cover bg-surface-sunken shrink-0" />
      <div v-else class="h-9 w-9 rounded-lg bg-accent-soft grid place-items-center shrink-0">
        <i class="fas fa-file-contract text-accent text-sm" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-ink truncate">{{ action.fonte?.empreendimento }}</p>
        <p class="text-[11px] text-ink-muted">
          Ficha Comercial<span v-if="action.fonte?.cidade"> · {{ action.fonte.cidade }}</span><span v-if="action.fonte?.avulsa"> · Avulsa</span>
        </p>
      </div>
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 shrink-0"
        :class="statusClass(active.fonte)">
        {{ active.fonte?.mes_referencia }} · {{ active.fonte?.status }}
      </span>
    </div>

    <!-- Aviso: nenhuma autorizada -->
    <div v-if="action.sem_ficha_autorizada"
      class="flex items-start gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
      <i class="fas fa-triangle-exclamation mt-0.5" />
      <span>Nenhuma ficha desta série está autorizada — dados em elaboração, sujeitos a alteração.</span>
    </div>

    <!-- Abas recente × autorizada -->
    <div v-if="tabs.length > 1" class="flex gap-1 px-4 pt-3">
      <button v-for="t in tabs" :key="t.key" @click="activeKey = t.key"
        class="px-2.5 py-1 rounded-lg text-[11px] font-medium ring-1 transition"
        :class="activeKey === t.key
          ? 'bg-accent-soft text-accent ring-accent/30'
          : 'bg-surface-sunken text-ink-muted ring-line hover:text-ink'">
        <template v-if="t.key === 'recente'">Mais recente · {{ t.fonte?.mes_referencia }} ({{ t.fonte?.status }})</template>
        <template v-else>Autorizada · {{ t.fonte?.mes_referencia }}</template>
      </button>
    </div>

    <div class="px-4 py-3 space-y-3">
      <!-- Módulos -->
      <div v-if="modules.length > 1" class="flex flex-wrap gap-1.5">
        <button v-for="(m, i) in modules" :key="i" @click="moduleIdx = i"
          class="px-2 py-0.5 rounded-md text-[11px] ring-1 transition"
          :class="moduleIdx === i ? 'bg-accent-soft text-accent ring-accent/30' : 'bg-surface-sunken text-ink-muted ring-line hover:text-ink'">
          {{ m.modulo || `Módulo ${i + 1}` }}
        </button>
      </div>
      <p v-else-if="mod.modulo && mod.modulo !== action.fonte?.empreendimento" class="text-[11px] text-ink-muted">
        <i class="fas fa-cube mr-1" />{{ mod.modulo }}
      </p>

      <!-- Indicadores -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div v-for="ind in indicadores" :key="ind.label" class="rounded-xl bg-surface-sunken px-3 py-2">
          <p class="text-[10px] uppercase tracking-wide text-ink-subtle">{{ ind.label }}</p>
          <p class="text-sm font-semibold text-ink mt-0.5">{{ ind.value }}</p>
        </div>
      </div>

      <!-- Custos Menin × Cliente -->
      <div v-if="custos" class="grid grid-cols-2 gap-2">
        <div class="rounded-xl bg-surface-sunken px-3 py-2">
          <p class="text-[10px] uppercase tracking-wide text-ink-subtle">Custos Menin</p>
          <p class="text-sm font-semibold text-ink mt-0.5">{{ fmtBRL(custos.total_menin ?? 0) }}</p>
        </div>
        <div class="rounded-xl bg-surface-sunken px-3 py-2">
          <p class="text-[10px] uppercase tracking-wide text-ink-subtle">Custos Cliente</p>
          <p class="text-sm font-semibold text-ink mt-0.5">{{ fmtBRL(custos.total_cliente ?? 0) }}</p>
        </div>
      </div>

      <!-- Campanhas -->
      <div v-if="campanhas.length">
        <p class="text-[10px] uppercase tracking-wide text-ink-subtle mb-1.5">Campanhas</p>
        <div class="space-y-1.5">
          <div v-for="(c, i) in campanhas" :key="i"
            class="flex items-center justify-between gap-2 rounded-lg bg-surface-sunken px-3 py-1.5">
            <div class="min-w-0">
              <p class="text-xs font-medium text-ink truncate">{{ c.titulo }}</p>
              <p v-if="c.periodo" class="text-[10px] text-ink-muted">{{ c.periodo }}</p>
            </div>
            <span v-if="c.valor != null" class="text-[11px] font-medium text-ink shrink-0">
              {{ fmtBRL(c.valor) }}<span v-if="c.pago_por" class="text-ink-muted"> · {{ c.pago_por }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Mais detalhes (negociação + documentação + tabelas) -->
      <button @click="showDetails = !showDetails"
        class="w-full flex items-center justify-center gap-1.5 text-[11px] text-ink-muted hover:text-accent transition py-1">
        <i class="fas text-[10px]" :class="showDetails ? 'fa-chevron-up' : 'fa-chevron-down'" />
        {{ showDetails ? 'Menos detalhes' : 'Mais detalhes' }}
      </button>
      <div v-if="showDetails" class="space-y-3">
        <div v-if="negItems.length">
          <p class="text-[10px] uppercase tracking-wide text-ink-subtle mb-1.5">Negociação</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <div v-for="it in negItems" :key="it.label" class="flex justify-between gap-2 text-xs">
              <span class="text-ink-muted">{{ it.label }}</span>
              <span class="text-ink font-medium text-right">{{ it.value }}</span>
            </div>
          </div>
        </div>
        <div v-if="docItems.length">
          <p class="text-[10px] uppercase tracking-wide text-ink-subtle mb-1.5">Documentação & Operacional</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <div v-for="it in docItems" :key="it.label" class="flex justify-between gap-2 text-xs">
              <span class="text-ink-muted truncate">{{ it.label }}</span>
              <span class="text-ink font-medium text-right shrink-0">{{ it.value }}</span>
            </div>
          </div>
        </div>
        <div v-if="tabelas.length">
          <p class="text-[10px] uppercase tracking-wide text-ink-subtle mb-1.5">Tabelas de preço</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="(t, i) in tabelas" :key="i"
              class="px-2 py-0.5 rounded-md bg-surface-sunken text-[11px] text-ink-muted ring-1 ring-line">{{ t }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Rodapé: sugestões + abrir ficha -->
    <div class="px-4 py-3 border-t border-line">
      <p class="text-[11px] text-ink-subtle uppercase tracking-wide mb-2">Sugestões</p>
      <div class="flex flex-wrap items-center gap-1.5">
        <button v-for="s in sugestoes" :key="s.id" @click="send(s.prompt)" :disabled="aiStore.isStreaming"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ring-1 ring-line
                 bg-surface-sunken text-ink-muted hover:text-accent hover:ring-accent/30 hover:bg-accent-soft/40
                 transition disabled:opacity-40 disabled:cursor-not-allowed">
          <i :class="s.icon" class="text-[10px]" />
          {{ s.label }}
        </button>
        <button @click="openFicha"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                 bg-accent text-white hover:opacity-90 transition ml-auto">
          <i class="fas fa-arrow-up-right-from-square text-[10px]" />
          Abrir ficha completa
        </button>
      </div>
    </div>
  </div>
</template>
