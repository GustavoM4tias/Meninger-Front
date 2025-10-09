<template>
    <div
        class="cards grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
        <!-- Card total -->
        <Card title="Todos os Leads" icon="fas fa-people-group" :value="kpi.total" :label="periodoLabel"
            class="w-full h-full !bg-blue-300/30 !border-blue-400/30" />

        <!-- Cards dinâmicos com cor/ícone por status -->
        <Card v-for="item in kpi.items" :key="item.key" :title="item.label" :value="item.count"
            :icon="iconFor(item.key)" :label="periodoLabel"
            :class="['w-full h-full cursor-pointer', clsFor(item.key)]"
            @click="emit('filtrarSituacao', item.key)" />
    </div>
</template>

<script setup>
import { computed } from 'vue'
import Card from '@/components/UI/Card.vue'

const props = defineProps({
    periodo: { type: Object, required: true },
    kpi: { type: Object, required: true }
})
const emit = defineEmits(['filtrarSituacao'])

const periodoLabel = computed(() => {
    const ini = props.periodo?.data_inicio ? props.periodo.data_inicio.slice(0, 10).split('-').reverse().join('/') : '—'
    const fim = props.periodo?.data_fim ? props.periodo.data_fim.slice(0, 10).split('-').reverse().join('/') : '—'
    return `De ${ini} a ${fim}`
})

/** Ícones por status (adicionados os novos) */
const iconFor = (status) => {
    const map = {
        'Em Atendimento': 'fas fa-people-arrows',
        'Aguardando Atendimento Corretor': 'fas fa-stopwatch',
        'Com Reserva': 'fas fa-bookmark',
        '1ª Tentativa de Contato': 'fas fa-phone',
        'Novo Lead': 'fas fa-user-plus',
        'Descartado': 'fas fa-trash-can',
        'Em Análise de Crédito': 'fas fa-credit-card',
        'Lead Qualificado': 'fas fa-ranking-star',
        'Em Negociação': 'fas fa-handshake',
        'Venda Realizada': 'fas fa-coins',
        'Atendimento Externo': 'fas fa-briefcase'
    }
    return map[status] || 'fas fa-circle'
}

/** Cores por status (mantive o padrão que você já vinha usando e criei para os novos) */
const clsFor = (status) => {
    const map = {
        'Em Atendimento': '!bg-orange-300/30 !border-orange-400/30',
        'Aguardando Atendimento Corretor': '!bg-amber-200/30 !border-amber-400/30',
        'Com Reserva': '!bg-yellow-300/30 !border-yellow-400/30',
        '1ª Tentativa de Contato': '!bg-sky-300/30 !border-sky-400/30',
        'Novo Lead': '!bg-blue-200/30 !border-blue-300/30',
        'Descartado': '!bg-red-300/30 !border-red-400/30',
        'Em Análise de Crédito': '!bg-purple-300/30 !border-purple-400/30',
        'Lead Qualificado': '!bg-emerald-300/30 !border-emerald-400/30',
        'Em Negociação': '!bg-emerald-300/30 !border-emerald-400/30',
        'Venda Realizada': '!bg-green-400/30 !border-green-500/30',
        'Atendimento Externo': '!bg-indigo-300/30 !border-indigo-400/30'
    }
    // fallback neutro caso venha algum status inesperado
    return map[status] || '!bg-gray-200/20 !border-gray-300/20'
}
</script>
