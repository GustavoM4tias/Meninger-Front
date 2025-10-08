<template>
    <div class="cards grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <Card title="Todos os Leads" icon="fas fa-people-group" :value="kpi.total" :label="periodoLabel" />

        <Card title="Aguardando Atendimento" icon="fas fa-stopwatch" :value="kpi.aguardando"
            @click="emit('filtrarSituacao', 'Aguardando Atendimento Corretor')" />

        <Card title="Em Atendimento" icon="fas fa-people-arrows" :value="kpi.atendimento"
            @click="emit('filtrarSituacao', 'Em Atendimento')" />

        <Card title="Qualificados" icon="fas fa-ranking-star" :value="kpi.qualificados"
            @click="emit('filtrarSituacao', 'Lead Qualificado')" />
    </div>

    <div class="cards grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
        <Card title="Descartados" icon="fas fa-trash-can" :value="kpi.descartados" />
        <Card title="Em Análise de Crédito" icon="fas fa-credit-card" :value="kpi.analise"
            @click="emit('filtrarSituacao', 'Em Análise de Crédito')" />
        <Card title="Com Reserva" icon="fas fa-tent" :value="kpi.reserva"
            @click="emit('filtrarSituacao', 'Com Reserva')" />
        <Card title="Venda Realizada" icon="fas fa-coins" :value="kpi.venda"
            @click="emit('filtrarSituacao', 'Venda Realizada')" />
    </div>
</template>

<script setup>
import { computed } from 'vue';
import Card from './Card.vue';

const props = defineProps({
    periodo: { type: Object, required: true },
    kpi: { type: Object, required: true }
});
const emit = defineEmits(['filtrarSituacao']);

const periodoLabel = computed(() => {
    const ini = props.periodo?.data_inicio ? props.periodo.data_inicio.slice(0, 10).split('-').reverse().join('/') : '—';
    const fim = props.periodo?.data_fim ? props.periodo.data_fim.slice(0, 10).split('-').reverse().join('/') : '—';
    return `De ${ini} a ${fim}`;
});
</script>
