<template>
    <div class="space-y-4">
        <!-- ── Linha 1: KPIs gerenciais (estilo Card translúcido) ─────────────── -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card title="Total" icon="fas fa-id-card-clip" :value="kpi.total" :label="periodoLabel"
                class="w-full h-full !bg-blue-300/30 !border-blue-400/30" />

            <Card title="Tempo até finalizar" icon="fas fa-stopwatch"
                :value="`${tempoMedioFinalizar.toFixed(1)} dias`"
                :label="`Em curso: ${tempoMedio.toFixed(1)}d • ${outcome.total_finalizadas} finalizada(s)`"
                class="w-full h-full !bg-amber-300/30 !border-amber-400/30"
                v-tippy="'Média de dias entre cadastro e desfecho — apenas análises finalizadas (aprovadas, reprovadas ou canceladas).'" />

            <Card title="% Aprovação" icon="fas fa-check"
                :value="pctStr(outcome.pct_aprovados)"
                :label="`${outcome.aprovados} de ${outcome.total} pastas (${outcome.aprovados_sem_reserva} aprov + ${outcome.reservas} reserva)`"
                class="w-full h-full !bg-emerald-300/30 !border-emerald-400/30"
                v-tippy="'Sobre o total de pastas no período: quantas foram aprovadas (inclui Em Reserva, que é o estágio final pós-aprovação).'" />

            <Card title="% Conversão Reserva" icon="fas fa-bookmark"
                :value="pctStr(outcome.pct_conversao_reserva)"
                :label="`${outcome.reservas} de ${outcome.total} pastas viraram reserva`"
                class="w-full h-full !bg-yellow-300/30 !border-yellow-400/30"
                v-tippy="'Sobre o total de pastas no período: quantas chegaram em reserva.'" />

            <Card title="% Reprovação" icon="fas fa-times"
                :value="pctStr(outcome.pct_reprovados)"
                :label="`${outcome.reprovados} de ${outcome.total} pastas reprovadas`"
                class="w-full h-full !bg-red-300/30 !border-red-400/30"
                v-tippy="'Sobre o total de pastas no período: quantas foram reprovadas / canceladas.'" />
        </div>

        <!-- ── Linha 2: Funil agrupado (5 buckets clicáveis) ─────────────────── -->
        <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <button v-for="g in groupCards" :key="g.key" @click="emit('filtrarGrupo', g)"
                :class="['relative text-left rounded-xl px-4 py-3 border transition-all hover:scale-[1.02] hover:shadow', g.bg]">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <i :class="[g.icon, g.text, 'text-lg']"></i>
                        <span class="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200">{{ g.label }}</span>
                    </div>
                    <span class="text-[10px] text-gray-500 dark:text-gray-400">{{ g.percent }}%</span>
                </div>
                <div class="mt-1 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">{{ g.count }}</div>
                <div class="mt-2 h-1.5 rounded-full bg-gray-200/60 dark:bg-gray-700/60 overflow-hidden">
                    <div :class="['h-full rounded-full transition-all duration-500', g.bar]"
                        :style="{ width: `${g.percent}%` }"></div>
                </div>
            </button>
        </div>

        <!-- ── Linha 3: cards detalhados por etapa real ───────────────────────── -->
        <details class="group" :open="kpi.items.length <= 8">
            <summary class="cursor-pointer flex items-center justify-between px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border dark:border-gray-700 select-none">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-200">
                    <i class="fas fa-layer-group mr-1 text-gray-500"></i>
                    Detalhamento por etapa do CV ({{ kpi.items.length }})
                </span>
                <i class="fas fa-chevron-down text-xs text-gray-500 group-open:rotate-180 transition-transform"></i>
            </summary>
            <div class="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                <button v-for="item in sortedItems" :key="item.key" @click="emit('filtrarSituacao', item.key)"
                    :class="['relative text-left rounded-lg px-3 py-2.5 border transition-all hover:scale-[1.02] hover:shadow cursor-pointer', clsForStage(item.key)]">
                    <div class="flex items-center gap-2 mb-1">
                        <i :class="[iconForStage(item.key), 'text-xs text-gray-600 dark:text-gray-300']"></i>
                        <span class="text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-200 line-clamp-2">{{ item.label }}</span>
                    </div>
                    <div class="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{{ item.count }}</div>
                </button>
            </div>
        </details>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import Card from '@/components/UI/Card.vue'
import { STAGE_GROUPS, bucketOf, iconForStage, clsForStage, STAGE_ORDER } from '../stages.js'

const props = defineProps({
    periodo: { type: Object, required: true },
    kpi: { type: Object, required: true }, // { total, items: [{ key, label, count }] }
    tempoMedio: { type: Number, default: 0 },
    tempoMedioFinalizar: { type: Number, default: 0 },
    outcome: { type: Object, default: () => ({ aprovados:0, reprovados:0, reservas:0, total_finalizadas:0, pct_aprovados:0, pct_reprovados:0, pct_reservas:0 }) },
})
const emit = defineEmits(['filtrarSituacao', 'filtrarGrupo'])

const periodoLabel = computed(() => {
    const ini = props.periodo?.data_inicio ? props.periodo.data_inicio.slice(0, 10).split('-').reverse().join('/') : '—'
    const fim = props.periodo?.data_fim    ? props.periodo.data_fim.slice(0, 10).split('-').reverse().join('/')    : '—'
    return `De ${ini} a ${fim}`
})

const pctStr = (v) => `${(v * 100).toFixed(1)}%`

const groupCards = computed(() => {
    const total = props.kpi.total || 0
    const groups = STAGE_GROUPS.filter(g => g.key !== 'outros').map(g => ({ ...g, count: 0, items: [] }))
    const outros = { ...STAGE_GROUPS[STAGE_GROUPS.length - 1], count: 0, items: [] }

    for (const it of (props.kpi.items || [])) {
        const b = bucketOf(it.key)
        const target = groups.find(g => g.key === b.key) || outros
        target.count += it.count
        target.items.push(it)
    }
    const list = [...groups]
    if (outros.count > 0) list.push(outros)
    return list.map(g => ({ ...g, percent: total > 0 ? Math.round((g.count / total) * 100) : 0 }))
})

const sortedItems = computed(() => {
    const orderIdx = (k) => {
        const i = STAGE_ORDER.indexOf(k)
        return i === -1 ? 999 : i
    }
    return [...(props.kpi.items || [])].sort((a, b) => {
        const ia = orderIdx(a.key), ib = orderIdx(b.key)
        if (ia !== ib) return ia - ib
        return b.count - a.count
    })
})
</script>
