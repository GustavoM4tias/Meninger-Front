<script setup>
import { computed } from 'vue'

const props = defineProps({
  action: { type: Object, required: true },
})

const a = computed(() => props.action || {})

const kpis = computed(() => [
  { label: 'Total de Reservas', value: a.value.total ?? 0,        color: 'indigo',  icon: 'fas fa-bookmark' },
  { label: 'Reservada / Análise', value: a.value.reservada ?? 0,  color: 'yellow',  icon: 'fas fa-bookmark' },
  { label: 'Em Contrato',         value: a.value.contrato ?? 0,   color: 'violet',  icon: 'fas fa-file-contract' },
  { label: 'Em Repasse',          value: a.value.em_repasse ?? 0, color: 'sky',     icon: 'fas fa-money-bill-transfer' },
  { label: 'Vendida (CRM)',       value: a.value.vendida ?? 0,    color: 'emerald', icon: 'fas fa-flag-checkered', sub: 'Etapa CRM (não venda real)' },
  { label: 'Cancelada / Distrato', value: a.value.cancelada ?? 0, color: 'rose',    icon: 'fas fa-ban' },
])

const rates = computed(() => [
  { label: '% Vendida (CRM)', value: a.value.taxa_venda,    suffix: '%', color: 'emerald', tooltip: 'Vendida (etapa CRM) ÷ Total. NÃO confundir com venda concretizada.' },
  { label: '% Distrato',      value: a.value.taxa_distrato, suffix: '%', color: 'rose',    tooltip: 'Canceladas ÷ Total' },
])

const tempos = computed(() => [
  { label: 'Tempo médio em reserva',   value: a.value.tempo_medio_em_reserva,   color: 'yellow',  tooltip: 'Média de dias entre data_reserva e desfecho atual (venda, contrato ou hoje)' },
  { label: 'Tempo médio até contrato', value: a.value.tempo_medio_ate_contrato, color: 'violet',  tooltip: 'Apenas reservas com contrato — média de dias entre reserva e contrato' },
  { label: 'Tempo médio até venda',    value: a.value.tempo_medio_ate_venda,    color: 'emerald', tooltip: 'Apenas reservas com venda — média de dias entre reserva e venda (etapa CRM)' },
])

const colorMap = {
  indigo:  'bg-indigo-500/10  text-indigo-400  ring-indigo-500/20',
  yellow:  'bg-yellow-500/10  text-yellow-400  ring-yellow-500/20',
  violet:  'bg-violet-500/10  text-violet-400  ring-violet-500/20',
  sky:     'bg-sky-500/10     text-sky-400     ring-sky-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  rose:    'bg-rose-500/10    text-rose-400    ring-rose-500/20',
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
      <i class="fas fa-bookmark text-xs text-gray-400 dark:text-slate-500" />
      <span class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ a.title }}</span>
    </div>

    <!-- Aviso vendida=S -->
    <div
      v-if="a.vendida > 0"
      class="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl px-3 py-2 text-[11px] flex items-start gap-2"
    >
      <i class="fas fa-circle-info mt-0.5" />
      <span>
        <strong>{{ fmtNum(a.vendida) }} reservas</strong> estão na etapa "Vendida" do CRM —
        isso é apenas a etapa do funil, não a venda concretizada. A venda real é validada no Faturamento (em breve).
      </span>
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
    <div v-if="a.total > 0" class="grid grid-cols-2 gap-2">
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
    <div v-if="a.total > 0" class="grid grid-cols-3 gap-2">
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
      Nenhuma reserva encontrada no período com esses filtros.
    </div>
  </div>
</template>
