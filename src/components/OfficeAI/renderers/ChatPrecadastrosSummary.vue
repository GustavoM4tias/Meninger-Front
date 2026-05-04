<script setup>
import { computed } from 'vue'

const props = defineProps({
  action: { type: Object, required: true },
})

const a = computed(() => props.action || {})

const kpis = computed(() => [
  { label: 'Total de Pastas', value: a.value.total ?? 0,           color: 'indigo',  icon: 'fas fa-folder-open' },
  { label: 'Em Análise',      value: a.value.em_analise ?? 0,      color: 'purple',  icon: 'fas fa-magnifying-glass-chart' },
  { label: 'Documentação',    value: a.value.documentacao ?? 0,    color: 'amber',   icon: 'fas fa-file-circle-exclamation' },
  { label: 'Aprovados',       value: a.value.aprovados ?? 0,       color: 'emerald', icon: 'fas fa-check-double', sub: `${a.value.aprovado_sem_reserva ?? 0} sem reserva + ${a.value.reserva ?? 0} em reserva` },
  { label: 'Em Reserva',      value: a.value.reserva ?? 0,         color: 'yellow',  icon: 'fas fa-bookmark' },
  { label: 'Reprovados',      value: a.value.reprovado ?? 0,       color: 'rose',    icon: 'fas fa-circle-xmark' },
])

const rates = computed(() => [
  { label: '% Aprovação',     value: a.value.taxa_aprovacao,    suffix: '%', color: 'emerald', tooltip: '(Aprovados + Reservas) ÷ Total' },
  { label: '% Conv. Reserva', value: a.value.taxa_conv_reserva, suffix: '%', color: 'yellow',  tooltip: 'Reservas ÷ Total' },
  { label: '% Reprovação',    value: a.value.taxa_reprovacao,   suffix: '%', color: 'rose',    tooltip: 'Reprovados ÷ Total' },
])

const tempos = computed(() => [
  { label: 'Tempo médio em análise', value: a.value.tempo_medio_em_analise, color: 'purple', tooltip: 'Média de dias de todas as pastas (em curso e finalizadas)' },
  { label: 'Tempo médio até finalizar', value: a.value.tempo_medio_finalizar, color: 'sky', tooltip: 'Média de dias apenas das pastas finalizadas (velocidade da CCA)' },
])

const colorMap = {
  indigo:  'bg-indigo-500/10  text-indigo-400  ring-indigo-500/20',
  purple:  'bg-purple-500/10  text-purple-400  ring-purple-500/20',
  amber:   'bg-amber-500/10   text-amber-400   ring-amber-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  yellow:  'bg-yellow-500/10  text-yellow-400  ring-yellow-500/20',
  rose:    'bg-rose-500/10    text-rose-400    ring-rose-500/20',
  sky:     'bg-sky-500/10     text-sky-400     ring-sky-500/20',
}

function fmtNum(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR').format(v)
}

function fmtRate(v) {
  if (v == null || isNaN(v)) return '—'
  return `${Number(v).toFixed(1).replace('.', ',')}`
}
</script>

<template>
  <div class="space-y-3 mt-1">
    <!-- Título -->
    <div class="flex items-center gap-2">
      <i class="fas fa-folder-open text-xs text-gray-400 dark:text-slate-500" />
      <span class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ a.title }}</span>
    </div>

    <!-- Grid de contagens (6 cards) -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <div
        v-for="k in kpis"
        :key="k.label"
        class="bg-slate-50 dark:bg-slate-800/60 ring-1 ring-inset rounded-xl p-3"
        :class="colorMap[k.color]"
      >
        <div class="flex items-center gap-2 text-[10px] uppercase tracking-wide font-medium opacity-80">
          <i :class="k.icon" />
          {{ k.label }}
        </div>
        <p class="text-xl font-bold tabular-nums mt-1">{{ fmtNum(k.value) }}</p>
        <p v-if="k.sub" class="text-[10px] opacity-70 mt-0.5">{{ k.sub }}</p>
      </div>
    </div>

    <!-- Taxas -->
    <div v-if="a.total > 0" class="grid grid-cols-3 gap-2">
      <div
        v-for="r in rates"
        :key="r.label"
        class="bg-slate-50 dark:bg-slate-800/60 ring-1 ring-inset rounded-xl p-3"
        :class="colorMap[r.color]"
        :title="r.tooltip"
      >
        <p class="text-[10px] uppercase tracking-wide font-medium opacity-80">{{ r.label }}</p>
        <p class="text-xl font-bold tabular-nums mt-1">
          {{ fmtRate(r.value) }}<span class="text-sm font-normal opacity-70">{{ r.suffix }}</span>
        </p>
      </div>
    </div>

    <!-- Tempos médios -->
    <div v-if="a.total > 0" class="grid grid-cols-2 gap-2">
      <div
        v-for="t in tempos"
        :key="t.label"
        class="bg-slate-50 dark:bg-slate-800/60 ring-1 ring-inset rounded-xl p-3"
        :class="colorMap[t.color]"
        :title="t.tooltip"
      >
        <p class="text-[10px] uppercase tracking-wide font-medium opacity-80">{{ t.label }}</p>
        <p class="text-base font-semibold tabular-nums mt-1">
          {{ t.value != null ? `${fmtRate(t.value)} dias` : '—' }}
        </p>
      </div>
    </div>

    <!-- Caso vazio -->
    <div
      v-if="a.total === 0"
      class="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 text-xs text-gray-500 dark:text-slate-400 text-center"
    >
      Nenhum pré-cadastro encontrado no período com esses filtros.
    </div>
  </div>
</template>
