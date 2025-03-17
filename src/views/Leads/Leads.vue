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
        <p @click="toggleModal" class="text-blue-500 underline cursor-pointer hover:text-blue-400 text-end pt-2">
          Ver relatório detalhado
        </p>

        <ModalLeads :leads="leads" :modalVisivel="modalVisivel"
          @update:modalVisivel="(visivel) => (modalVisivel = visivel)" />

        <div
          class="group bg-gray-100 dark:bg-gray-600 cursor-pointer shadow absolute right-[-18rem] top-32 rounded-bl-lg transform transition-transform duration-300">
          <div
            class="button absolute -left-6 bg-gray-100 dark:bg-gray-600 shadow-[-3px_0_5px_rgba(0,0,0,.05)] cursor-pointer rounded-l-lg py-3 ps-2.5 pe-3.5">
            <i class="fas fa-chevron-left"></i>
          </div>
          <div class="content w-72 h-auto max-h-[60vh] overflow-auto p-2 gap-2 flex flex-col justify-between">
            <h2 class="text-2xl text-center font-semibold text-gray-800 dark:text-gray-100 px-1">
              Filas de Distribuição
            </h2>
            <!-- Exibindo as filas usando o componente Filas -->
            <Filas v-for="fila in filas" :key="fila.idfila_distribuicao_leads" :fila="fila" />
          </div>
        </div>
      </div>
    </div>

    <!-- Aside com os últimos 6 leads recentes -->
    <aside class="Recents w-4/12 h-full bg-gray-100 dark:bg-gray-800 p-4">
      <div class="flex flex-col h-full justify-around">
        <h2 class="text-2xl">Últimos Leads</h2>
        <div v-for="lead in ultimosLeads" :key="lead.idlead"
          class="bg-gray-200 dark:bg-gray-900 rounded-lg shadow hover:-translate-x-2 filter transition-transform duration-100 ease-in-out p-3 w-full">
          <div class="flex">
            <!-- Nome e Ícone de Expansão -->
            <div @click="toggleDetails(lead.idlead)" class="flex w-auto max-w-[60%] min-w-[30%] overflow-hidden cursor-pointer">
              <p class="text-lg font-semibold truncate">
                {{ lead.nome }}
              </p>
              <i class="fas m-auto ms-1.5 shrink-0 min-w-5" 
                :class="detailsOpened(lead.idlead) ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </div>

            <!-- Parte Direita com Botões e Ícones -->
            <div class="flex flex-1 overflow-hidden">
              <!-- Mídia e Situação -->
              <div class="hidden md:flex px-2 text-xs m-auto mt-0 me-0 gap-2 min-w-0 overflow-hidden">
                <button v-tippy="'Mídia de Visita'" class="shrink-0">
                  <p v-if="lead.midia_principal" class="py-0.5 px-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 truncate">
                    {{ lead.midia_principal }}
                  </p>
                </button>
                <button v-tippy="'Situação'" class="flex-grow min-w-0 overflow-hidden">
                  <p class="py-0.5 px-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 truncate">
                    {{ lead.situacao.nome }}
                  </p>
                </button>
              </div>

              <!-- Ícones -->
              <div class="flex gap-2 shrink-0">
                <a :href="`https://menin.cvcrm.com.br/gestor/comercial/leads/${lead.idlead}/administrar?lido=true`"
                  target="_blank" class="cursor-pointer" v-tippy="'CV CRM'">
                  <img src="/CVLogo.png" alt="CV CRM" class="w-5 min-w-5" />
                </a>
                <a v-if="lead.link_rdstation" :href="lead.link_rdstation" target="_blank" class="cursor-pointer"
                  v-tippy="'RD Station'">
                  <img src="/RDLogo.png" alt="RD Station" class="w-5 min-w-5" />
                </a>
              </div>
            </div>
          </div>

          <!-- Detalhes adicionais do Lead, visíveis ao clicar no chevron -->
          <div v-if="detailsOpened(lead.idlead)" class="mt-4">
            <p class="text-sm text-gray-600">Telefone: {{ lead.telefone }}</p>
            <p class="text-sm text-gray-600">Email: {{ lead.email }}</p>
            <p class="text-sm text-gray-600">Endereço: {{ lead.endereco }}</p>
          </div>

          <div class="flex w-full justify-between">
            <a v-tippy="lead.empreendimento[0].nome" :href="'/buildings?search=' + lead.empreendimento[0].nome"
              target="_blank" class="bg-gray-50 dark:bg-gray-700 rounded-md px-2 w-auto truncate text-sm ms-0 m-auto"
              v-if="lead.empreendimento.length > 0">
              {{ lead.empreendimento[0].nome }}
            </a>
            <div v-else class="bg-gray-600 rounded-md px-2">SEM EMPREENDIMENTO</div>
            <div class="text-gray-500">
              {{
                new Date(lead.data_cad)
                  .toLocaleString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                  .replace(",", "")
              }}
            </div>
          </div>
        </div>
      </div>
    </aside>

  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from "vue";
import { useLeadsStore } from "@/stores/Lead/leads";
import { storeToRefs } from "pinia";
import ModalLeads from "@/components/Leads/ModalLeads.vue";
import Filas from "@/components/Leads/Filas.vue";
import Carregamento from "@/components/Loading/Carregamento.vue";
import Input from "@/components/UI/Input.vue";
import Button from "@/components/UI/Button.vue";

const modalVisivel = ref(false);
const modalAbertoId = ref(null);
const store = useLeadsStore();
const { fetchLeads, fetchFilas } = store;
const { leads, carregando, error, periodo, total, filas } = storeToRefs(store);

const dataInicio = ref("");
const dataFim = ref("");
const mostrarTodos = ref(false);

// Objeto para controlar o estado dos detalhes de cada lead
const leadsDetails = ref({});

const buscarLeads = () => {
  fetchLeads({
    data_inicio: dataInicio.value,
    data_fim: dataFim.value,
    mostrar_todos: mostrarTodos.value ? "true" : undefined,
  });
};

const toggleModal = () => {
  modalVisivel.value = !modalVisivel.value;
};

const toggleDetails = (leadId) => {
  if (modalAbertoId.value && modalAbertoId.value !== leadId) {
    leadsDetails.value[modalAbertoId.value] = false;
  }
  leadsDetails.value[leadId] = !leadsDetails.value[leadId];
  modalAbertoId.value = leadId;
};

const detailsOpened = (leadId) => {
  return leadsDetails.value[leadId];
};

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
