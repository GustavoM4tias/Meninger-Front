<template>
  <div class="w-full h-[calc(100%-4rem)] relative overflow-hidden flex">
    <!-- Área principal -->
    <div class="w-9/12 p-4">
      <div class="flex items-center pb-2">
        <h1 class="text-xl md:text-2xl font-bold">Leads</h1>
        <Favorite :router="'/reports/leads'" :section="'Leads'" />
      </div>

      <!-- https://preview--demo-data-analytics.lovable.app/
      https://lovable.dev/projects/01805fd4-daec-4cf7-a1e3-966d649fa0e9 -->

      <div class="cards flex w-full gap-4 mb-3">
        <div class="card flex flex-col h-28 w-full p-4 rounded-xl border border-gray-300/70 dark:border-gray-600/50 shadow shadow-black/5 hover:shadow-black/10 dark:shadow-white/5 dark:hover:shadow-white/10 transition-colors duration-150">
          <div class="flex justify-between text-xl">
            <h3>Novos Leads</h3>
            <i class="fas fa-person"></i>
          </div>
          <h1 class="text-3xl flex-1 flex items-center font-bold">
            15
          </h1>
        </div>
        <div class="card flex flex-col h-28 w-full p-4 rounded-xl border border-gray-300/70 dark:border-gray-600/50 shadow shadow-black/5 hover:shadow-black/10 dark:shadow-white/5 dark:hover:shadow-white/10 transition-colors duration-150">
          <div class="flex justify-between text-xl">
            <h3>Novos Leads</h3>
            <i class="fas fa-person"></i>
          </div>
          <h1 class="text-3xl flex-1 flex items-center font-bold">
            15
          </h1>
        </div>
        <div class="card flex flex-col h-28 w-full p-4 rounded-xl border border-gray-300/70 dark:border-gray-600/50 shadow shadow-black/5 hover:shadow-black/10 dark:shadow-white/5 dark:hover:shadow-white/10 transition-colors duration-150">
          <div class="flex justify-between text-xl">
            <h3>Novos Leads</h3>
            <i class="fas fa-person"></i>
          </div>
          <h1 class="text-3xl flex-1 flex items-center font-bold">
            15
          </h1>
        </div>
        <div class="card flex flex-col h-28 w-full p-4 rounded-xl border border-gray-300/70 dark:border-gray-600/50 shadow shadow-black/5 hover:shadow-black/10 dark:shadow-white/5 dark:hover:shadow-white/10 transition-colors duration-150">
          <div class="flex justify-between text-xl">
            <h3>Novos Leads</h3>
            <i class="fas fa-person"></i>
          </div>
          <h1 class="text-3xl flex-1 flex items-center font-bold">
            15
          </h1>
        </div>
        <div class="card flex flex-col h-28 w-full p-4 rounded-xl border border-gray-300/70 dark:border-gray-600/50 shadow shadow-black/5 hover:shadow-black/10 dark:shadow-white/5 dark:hover:shadow-white/10 transition-colors duration-150">
          <div class="flex justify-between text-xl">
            <h3>Novos Leads</h3>
            <i class="fas fa-person"></i>
          </div>
          <h1 class="text-3xl flex-1 flex items-center font-bold">
            15
          </h1>
        </div>

      </div>


      <div class="bg-gray-300 dark:bg-gray-700 m-auto ms-3.5 md:ms-auto p-4 rounded-lg shadow-xl">

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
          <p class="text-sm">Início: {{ formatarData(periodo.data_inicio) }}</p>
          <p class="text-sm">Fim: {{ formatarData(periodo.data_fim) }}</p>
          <p class="text-sm mt-2">Total de Leads: {{ total }}</p>
        </div>

        <!-- Ver relatório detalhado -->
        <p @click="toggleModal" class="text-blue-500 underline cursor-pointer hover:text-blue-400 text-end pt-2">
          Ver relatório detalhado
        </p>

        <ModalLeads :leads="leads" :modalVisivel="modalVisivel"
          @update:modalVisivel="(visivel) => (modalVisivel = visivel)" />

        <Filas :filas="filas" />

      </div>
    </div>

    <!-- Aside componentizado -->
    <div class="w-4/12 h-full overflow-hidden">
      <ModalLead :leads="leads" :batchSize="20" :scrollThreshold="200" />
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import { useLeadsStore } from "@/stores/Reports/Lead/leadsStore";
import { storeToRefs } from "pinia";
import ModalLeads from "@/components/Leads/ModalLeads.vue";
import Filas from "@/components/Leads/Filas.vue";
import Favorite from "@/components/config/Favorite.vue";
import Carregamento from "@/components/Loading/Carregamento.vue";
import Input from "@/components/UI/Input.vue";
import Button from "@/components/UI/Button.vue";
import ModalLead from "@/components/Leads/ModalLead.vue"; // Importando o novo componente

const modalVisivel = ref(false);
const store = useLeadsStore();
const { fetchLeads, fetchFilas } = store;
const { leads, carregando, error, periodo, total, filas } = storeToRefs(store);

const dataInicio = ref("");
const dataFim = ref("");
const mostrarTodos = ref(false);

const buscarLeads = () => {
  fetchLeads({
    data_inicio: dataInicio.value,
    data_fim: dataFim.value,
    mostrar_todos: mostrarTodos.value ? "true" : undefined,
  });
};

// Função para formatar a data para exibição
const formatarData = (dataString) => {
  if (!dataString) return "";
  // Converte a string de data para objeto Date
  const data = new Date(dataString);
  // Formata a data para o formato DD/MM/YYYY
  return data.toLocaleDateString('pt-BR');
};

watch(periodo, (novoPeriodo) => {
  if (novoPeriodo.data_inicio) {
    const dataInicioObj = new Date(novoPeriodo.data_inicio);
    dataInicio.value = dataInicioObj.toISOString().split('T')[0];
  }

  if (novoPeriodo.data_fim) {
    const dataFimObj = new Date(novoPeriodo.data_fim);
    dataFim.value = dataFimObj.toISOString().split('T')[0];
  }
}, { immediate: true });

const toggleModal = () => {
  modalVisivel.value = !modalVisivel.value;
};

onMounted(() => {
  fetchFilas();
  buscarLeads();
});
</script>

<style scoped>
.group:hover {
  transform: translateX(-18rem);
}
</style>