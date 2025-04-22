<template>
  <div class="w-full h-[calc(100%-4rem)] relative overflow-hidden flex">
    <!-- Área principal -->
    <div class="w-9/12 ps-4 py-4">
      <div class="flex items-center pb-2">
        <h1 class="text-xl md:text-2xl font-bold">Leads</h1>
        <Favorite :router="'/comercial/leads'" :section="'Leads'" />
      </div>  
      <div class="cards flex w-full gap-4 mb-3">
        <Card @click="openModal(leads)" v-if="leads.length > 0" :title="'Todos os leads'" :icon="'fas fa-people-group'"
          :class="'!bg-gray-500/15 !border-gray-500/30'" :value="leads.length"
          :label="`De ${dataInicio.split('-').reverse().join('/')} a ${dataFim.split('-').reverse().join('/')}`">
        </Card>
        <Card @click="openModal(aguardando)" v-if="aguardando.length > 0" :title="'Aguardando Atendimento'"
          :icon="'fas fa-stopwatch'" :class="'!bg-gray-500/15 !border-gray-500/30'" :value="aguardando.length"
          :label="'Aguardando Atendimento Corretor'" />
        <Card @click="openModal(atendimentos)" v-if="atendimentos.length > 0" :title="'Em Atendimento'"
          :icon="'fas fa-people-arrows'" :class="'!bg-gray-500/15 !border-gray-500/30'" :value="atendimentos.length"
          :label="'Em Atendimento com Corretor'" />
        <Card @click="openModal(descartados)" v-if="descartados.length > 0" :title="'Descartados'"
          :icon="'fas fa-trash-can'" :class="'!bg-red-500/15 !border-red-500/30'" :value="descartados.length"
          :label="'Descartados pelo Atendente'" />
        <Card @click="openModal(qualificado)" v-if="qualificado.length > 0" :title="'Qualificados'"
          :icon="'fas fa-ranking-star'" :class="'!bg-blue-500/15 !border-blue-500/30'" :value="qualificado.length"
          :label="'Qualificados pelo Atendente'" />
      </div>
      <div class="cards flex w-full gap-4 mb-3">
        <Card @click="openModal(analise)" v-if="analise.length > 0" :title="'Em Análise de Crédito'"
          :icon="'fas fa-credit-card'" :class="'!bg-purple-500/15 !border-purple-500/30'" :value="analise.length"
          :label="'Pasta em Análise Bancária'" />
        <Card @click="openModal(reserva)" v-if="reserva.length > 0" :title="'Com Reserva'" :icon="'fas fa-tent'"
          :class="'!bg-yellow-500/20 !border-yellow-500/40'" :value="reserva.length" :label="'Reservas de Unidade'" />
        <Card @click="openModal(venda)" v-if="venda.length > 0" :title="'Venda Realizada'" :icon="'fas fa-coins'"
          :class="'!bg-green-500/20 !border-green-500/40'" :value="venda.length" :label="'Vendas Concretizadas'" />
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

        <!-- Ver relatório detalhado -->
        <p @click="toggleModal(leads)" class="text-blue-500 underline cursor-pointer hover:text-blue-400 text-end pt-2">
          Ver relatório detalhado
        </p>

        <ModalLeads :leads="modalLeadsData" :modalVisivel="modalVisivel"
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
import { ref, onMounted, watch, computed } from "vue";
import { useLeadsStore } from "@/stores/Reports/Lead/leadsStore";
import { storeToRefs } from "pinia";
import Filas from "@/components/Reports/Leads/Filas.vue";
import Favorite from "@/components/config/Favorite.vue";
import Carregamento from "@/components/Loading/Carregamento.vue";
import Input from "@/components/UI/Input.vue";
import Button from "@/components/UI/Button.vue";
import ModalLeads from "@/components/Reports/Leads/ModalLeads.vue";
import ModalLead from "@/components/Reports/Leads/ModalLead.vue"; // Importando o novo componente
import Card from "@/components/Reports/Leads/Card.vue";

const modalVisivel = ref(false);
const modalLeadsData = ref([]); // Armazena os leads a serem mostrados no modal
const store = useLeadsStore();
const { fetchLeads, fetchFilas } = store;
const { leads, carregando, error, periodo, total, filas } = storeToRefs(store);

const aguardando = computed(() =>
  leads.value.filter(lead => lead.situacao.nome === 'Aguardando Atendimento Corretor')
)
const atendimentos = computed(() =>
  leads.value.filter(lead => lead.situacao.nome === 'Em Atendimento')
)
const qualificado = computed(() =>
  leads.value.filter(lead =>
    lead.situacao.nome === 'Lead Qualificado' || lead.situacao.nome === 'Em Negociação'
  )
)
const descartados = computed(() =>
  leads.value.filter(lead => lead.situacao.nome === 'Descartado')
)
const analise = computed(() =>
  leads.value.filter(lead => lead.situacao.nome === 'Em Análise de Crédito')
)
const reserva = computed(() =>
  leads.value.filter(lead => lead.situacao.nome === 'Com Reserva')
)
const venda = computed(() =>
  leads.value.filter(lead => lead.situacao.nome === 'Venda Realizada')
)

const dataInicio = ref("");
const dataFim = ref("");
const mostrarTodos = ref(false);

// Função para abrir o modal com os leads recebidos
const openModal = (leadsData) => {
  modalLeadsData.value = leadsData;
  modalVisivel.value = true;
};
// Se desejar também usar a mesma função para o link "Ver relatório detalhado":
const toggleModal = (leadsData) => {
  openModal(leadsData);
};

const buscarLeads = () => {
  fetchLeads({
    data_inicio: dataInicio.value,
    data_fim: dataFim.value,
    mostrar_todos: mostrarTodos.value ? "true" : undefined,
  });
};

const formatLocalDate = (date) => {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

watch(periodo, (novoPeriodo) => {
  if (novoPeriodo.data_inicio) {
    const dataInicioObj = new Date(novoPeriodo.data_inicio);
    dataInicio.value = formatLocalDate(dataInicioObj);
  }
  if (novoPeriodo.data_fim) {
    const dataFimObj = new Date(novoPeriodo.data_fim);
    // Subtrai um dia para ajustar o valor final
    dataFimObj.setUTCDate(dataFimObj.getUTCDate() - 1);
    dataFim.value = formatLocalDate(dataFimObj);
  }
}, { immediate: true });


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