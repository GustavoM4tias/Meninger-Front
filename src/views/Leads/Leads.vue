<template>
    <div class="p-4 w-full min-h-[calc(100%-4rem)] relative overflow-x-hidden flex flex-col">


        <div class="bg-gray-700 m-auto p-4 rounded-lg filter shadow-xl">
            <h1 class="text-2xl font-bold mb-6">Leads</h1>
            <!-- Filtros -->
            <div class="mb-6 flex flex-wrap gap-4 items-center">
                <div> 
                    <Input v-model="dataInicio" type="date" label="Data Início:" />
                </div>
                <div> 
                    <Input v-model="dataFim" type="date" label="Data Fim:"/>
                </div>
                <!-- <div class="flex items-center">
                <label class="ml-2 text-sm">Mostrar Todos</label>
                <Input v-model="mostrarTodos" type="checkbox" />  
            </div> -->
                <div> 
                    <Button @click="buscarLeads" label="Buscar">Buscar Leads</Button>
                </div> 
            </div>

            <!-- Carregamento -->
            <Carregamento v-if="carregando" />

            <!-- Erro -->
            <div v-if="error" class="text-red-500 my-4">{{ error }}</div>

            <!-- Sem resultados 
            <div v-if="!carregando && leads.length === 0" class="my-4 text-gray-600">
                Nenhum lead encontrado.
            </div> -->

            <!-- Exibição do período retornado -->
            <div v-if="periodo.data_inicio && periodo.data_fim" class="mt-6 p-4 dark:bg-gray-800 rounded">
                <p class="font-semibold">Período:</p>
                <p class="text-sm">Início: {{ periodo.data_inicio }}</p>
                <p class="text-sm">Fim: {{ periodo.data_fim }}</p>
                <p class="text-sm mt-2">Total de Leads: {{ total }}</p>
            </div>

            <!-- Lista de Leads
        <ul v-if="leads.length > 0" class="space-y-4">
            <li v-for="lead in leads" :key="lead.idlead"
                class="p-4 dark:bg-gray-600 rounded shadow hover:shadow-md transition-shadow">
                <p class="font-semibold text-lg">{{ lead.nome }}</p>
                <p class="text-sm text-gray-700">{{ lead.email }}</p>
                <p class="text-sm text-gray-500">Origem: {{ lead.origem }}</p>
            </li>
        </ul> -->

        <p @click="openModal" class="text-blue-500 underline cursor-pointer hover:text-blue-400 text-end pt-2">Ver relatório detalhado</p>

            <ModalLeads :leads="leads" :modalVisivel="modalVisivel"
                @update:modalVisivel="(visivel) => modalVisivel = visivel" />

            <div
                class="group bg-gray-100 dark:bg-gray-600 cursor-pointer shadow absolute right-[-18rem] top-32 rounded-bl-lg transform transition-transform duration-300">
                <div
                    class="button absolute -left-6 bg-gray-100 dark:bg-gray-600 shadow-[-3px_0_5px_rgba(0,0,0,.05)] cursor-pointer rounded-l-lg py-3 ps-2.5 pe-3.5">
                    <i class="fas fa-chevron-left"></i>
                </div>
                <div class="content w-72 h-auto max-h-[60vh] overflow-auto p-2 gap-2 flex flex-col justify-between">
                    <h2 class="text-2xl text-center font-semibold text-gray-800 dark:text-gray-100 px-1">Filas de
                        Distribuição</h2>
                    <!-- Exibindo as filas usando o componente Filas -->
                    <Filas v-for="fila in filas" :key="fila.idfila_distribuicao_leads" :fila="fila" />
                    <!-- <p class="text-center text-gray-600 dark:text-gray-400 text-xs -mt-0.5">Relatório dos últimos 7 dias.
                </p> -->
                </div>
            </div>

        </div>

    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useLeadsStore } from '@/stores/Lead/leads';
import { storeToRefs } from 'pinia';
import ModalLeads from '@/components/Leads/ModalLeads.vue';
import Filas from '@/components/Leads/Filas.vue';
import Carregamento from '@/components/Loading/Carregamento.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';

const modalVisivel = ref(false); // Controle de visibilidade do modal

const store = useLeadsStore();
const { fetchLeads, fetchFilas } = store;
// Use storeToRefs para manter a reatividade dos estados
const { leads, carregando, error, periodo, total, filas } = storeToRefs(store);

const openModal = () => {
    modalVisivel.value = !modalVisivel.value;
}

const dataInicio = ref('');
const dataFim = ref('');
const mostrarTodos = ref(false);

const buscarLeads = () => {
    fetchLeads({
        data_inicio: dataInicio.value,
        data_fim: dataFim.value,
        mostrar_todos: mostrarTodos.value ? "true" : undefined,
    });
};

onMounted(() => {
    fetchFilas(),
        buscarLeads()
});

</script>

<style scoped>
.group:hover {
    transform: translateX(-18rem);
}
</style>
