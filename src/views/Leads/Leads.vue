<template>
    <div class="w-full h-[calc(100%-4rem)] relative overflow-hidden flex">
        <!-- Área principal -->
        <div class="w-9/12 bg-red-400 p-4">
            <div class="bg-gray-300 dark:bg-gray-700 m-auto ms-3.5 md:ms-auto p-4 rounded-lg shadow-xl">
                <h1 class="text-2xl font-bold mb-6">Leads</h1>
                <!-- Filtros -->
                <div class="mb-6 flex flex-wrap gap-4 items-center">
                    <div>
                        <Input v-model="dataInicio" type="date" label="Data Início:" />
                    </div>
                    <div>
                        <Input v-model="dataFim" type="date" label="Data Fim:" />
                    </div>
                    <div>
                        <Button @click="buscarLeads" label="Buscar">Buscar Leads</Button>
                    </div>
                </div>

                <!-- Carregamento / Erro -->
                <Carregamento v-if="carregando" />
                <div v-if="error" class="text-red-500 my-4">{{ error }}</div>

                <!-- Exibição do período retornado -->
                <div v-if="periodo.data_inicio && periodo.data_fim" class="mt-6 p-4 dark:bg-gray-800 rounded">
                    <p class="font-semibold">Período:</p>
                    <p class="text-sm">Início: {{ dataInicio }}</p>
                    <p class="text-sm">Fim: {{ dataFim }}</p>
                    <p class="text-sm mt-2">Total de Leads: {{ total }}</p>
                </div>

                <!-- Ver relatório detalhado -->
                <p @click="openModal" class="text-blue-500 underline cursor-pointer hover:text-blue-400 text-end pt-2">
                    Ver relatório detalhado
                </p>

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
                    </div>
                </div>
            </div>
        </div>

        <!-- Aside com os últimos 6 leads recentes -->
        <aside class="Recents w-3/12 h-full bg-gray-100 dark:bg-gray-800 p-4">
            <div class="flex flex-col h-full justify-around">
                <h2 class="text-2xl">Últimos Leads</h2>
                <div v-for="lead in ultimosLeads" :key="lead.idlead"
                    class="bg-white dark:bg-gray-900 rounded-lg shadow hover:-translate-x-2 filter transition-transform duration-100 ease-in-out p-3 w-full">
                    <div class="flex justify-between">
                        <div class="flex-1">
                            <p class="text-lg font-semibold">{{ lead.nome }}</p>
                            <p class="text-sm text-gray-700">{{ lead.email }}</p>

                        </div>
                        <div class="flex gap-2">
                            <a :href="'https://menin.cvcrm.com.br/gestor/comercial/leads/' + lead.idlead + '/administrar?lido=true'"
                                target="_blank" class="cursor-pointer" v-tippy="'CV CRM'">
                                <img src="/CVLogo.png" alt="CV CRM" class="h-6 w-auto">
                            </a>
                            <a :href="lead.link_rdstation" target="_blank" class="cursor-pointer"
                                v-tippy="'RD Station'">
                                <img src="/RDLogo.png" alt="RD Station" class="h-6 w-auto">
                            </a>
                        </div>
                    </div>
                    <div class="flex  w-full">
                        <a v-tippy="lead.empreendimento[0].nome"
                            :href="'/buildings?search=' + lead.empreendimento[0].nome" target="_blank"
                            class="bg-gray-200 dark:bg-gray-700 rounded-md px-2 truncate w-7/12"
                            v-if="lead.empreendimento.length > 0">
                            {{ lead.empreendimento[0].nome }}
                        </a>
                        <div class="text-gray-500 truncate text-end w-5/12">
                            {{ new Date(lead.data_cad).toLocaleString('pt-BR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                            }).replace(',', '') }}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useLeadsStore } from '@/stores/Lead/leads';
import { storeToRefs } from 'pinia';
import ModalLeads from '@/components/Leads/ModalLeads.vue';
import Filas from '@/components/Leads/Filas.vue';
import Carregamento from '@/components/Loading/Carregamento.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';

const modalVisivel = ref(false);
const store = useLeadsStore();
const { fetchLeads, fetchFilas } = store;
const { leads, carregando, error, periodo, total, filas } = storeToRefs(store);

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

const openModal = () => {
    modalVisivel.value = !modalVisivel.value;
};

// Atualiza os inputs de data quando o período é retornado
watch(
    () => periodo.value.data_inicio,
    (newVal) => {
        if (newVal) {
            dataInicio.value = newVal.split('T')[0];
        }
    }
);

watch(
    () => periodo.value.data_fim,
    (newVal) => {
        if (newVal) {
            dataFim.value = newVal.split('T')[0];
        }
    }
);

onMounted(() => {
    fetchFilas();
    buscarLeads();
});

// Computed para obter os 6 leads mais recentes
const ultimosLeads = computed(() => {
    return leads.value
        .slice()
        .sort((a, b) => new Date(b.data_cad) - new Date(a.data_cad))
        .slice(0, 7);
});
</script>

<style scoped>
.group:hover {
    transform: translateX(-18rem);
}
</style>