<template>
  <div class="min-h-[calc(100%-4rem)] flex flex-col">

    <div class="relative bg-gray-200 dark:bg-gray-600 m-2 md:m-auto p-3 md:p-4 rounded-xl drop-shadow-md">
      <h1 class="text-2xl font-bold">Relatório de Repasses</h1>
      <!-- Container principal com espaçamento mais equilibrado -->
      <div class="flex justify-between me-2">
        <!-- Primeira linha: botão expandir e filtro de empreendimentos -->
        <div class="flex flex-wrap items-center gap-2">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <i class="fas fa-chevron-down"></i>
            </div>
            <select v-model="selectedEmpreendimento" @change="filtrarPorEmpreendimento"
              class="block w-full pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md appearance-none">
              <option value="">Todos os Empreendimentos</option>
              <option v-for="empreendimento in store.empreendimentos" :key="empreendimento" :value="empreendimento">
                {{ empreendimento }}
              </option>
            </select>
          </div>
          <button @click="toggleAllDetails"
            class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors duration-150 shadow-sm">
            <i v-if="allExpanded" class="fas fa-chevron-up w-4 h-4"></i>
            <i v-else class="fas fa-chevron-down w-4 h-4"></i>
            {{ allExpanded ? 'Recolher Todos' : 'Expandir Todos' }}
          </button>
          <!-- Segunda linha: checkboxes com estilo moderno -->
          <div class="flex flex-wrap items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <div class="relative inline-block w-10 align-middle select-none">
                <input type="checkbox" id="mostrarCancelados" v-model="filtros.mostrarCancelados"
                  @change="aplicarFiltros" class="peer sr-only" />
                <div
                  class="h-5 w-10 bg-gray-200 rounded-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:h-4 after:w-4 after:rounded-full after:transition-all peer-checked:after:translate-x-5">
                </div>
              </div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Mostrar Cancelados</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <div class="relative inline-block w-10 align-middle select-none">
                <input type="checkbox" id="mostrarDistratos" v-model="filtros.mostrarDistratos" @change="aplicarFiltros"
                  class="peer sr-only" />
                <div
                  class="h-5 w-10 bg-gray-200 rounded-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:h-4 after:w-4 after:rounded-full after:transition-all peer-checked:after:translate-x-5">
                </div>
              </div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Mostrar Distratos</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <div class="relative inline-block w-10 align-middle select-none">
                <input type="checkbox" id="mostrarCessoes" v-model="filtros.mostrarCessoes" @change="aplicarFiltros"
                  class="peer sr-only" />
                <div
                  class="h-5 w-10 bg-gray-200 rounded-full peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:h-4 after:w-4 after:rounded-full after:transition-all peer-checked:after:translate-x-5">
                </div>
              </div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Mostrar Cessões</span>
            </label>
          </div>
        </div>


        <!-- Terceira linha: cards de grupos renovados -->
        <div class="flex flex-wrap gap-3 mb-4">
          <div v-for="grupoInfo in gruposSumarizados" :key="grupoInfo.id"
            class="rounded-lg overflow-hidden shadow hover:shadow-md transition-shadow duration-150 flex flex-col"
            :style="{
              backgroundColor: getGrupoColor(grupoInfo.id),
              color: getGrupoTextColor(grupoInfo.id)
            }">
            <div class="px-4 py-1.5 flex items-center justify-between">
              <span class="font-medium">{{ grupoInfo.nome }}</span>
              <span class="ml-2 px-2 py-0.5 text-sm font-bold rounded-full" :style="{
                backgroundColor: adjustColor(getGrupoColor(grupoInfo.id), 0.2),
                color: getGrupoTextColor(grupoInfo.id)
              }">
                {{ grupoInfo.total }}
              </span>
            </div>
            <div class="px-4 py-1 text-sm font-semibold bg-opacity-10 bg-black dark:bg-opacity-25 dark:bg-white">
              {{ formatMoney(grupoInfo.valorTotal) }}
            </div>
          </div>
        </div>
      </div>


      <div v-if="store.repasses.length > 0" class="relative max-h-[70vh] w-[90vw] m-auto rounded-lg overflow-y-auto ">
        <!-- SCROLL HORIZONTAL -->
        <div ref="scrollContainer" class="overflow-auto flex flex-nowrap gap-4 select-none" @mousedown="startDrag"
          @mousemove="onDrag" @mouseup="stopDrag" @mouseleave="stopDrag">
          <div v-for="status in orderedStatuses" :key="status.idsituacao || status.nome"
            class="min-w-[300px] shadow-md rounded-lg p-4 filter drop-shadow-md mb-8"
            :style="{ backgroundColor: status.cor_bg || '#ffffff' }">
            <div class="title mb-2">
              <h2 class="text-xl font-semibold text-center truncate" :style="{ color: status.cor_nome || '#000000' }">
                {{ status.nome }}
              </h2>
              <p class="text-xs text-center" :style="{ color: status.cor_nome || '#000000' }">
                {{ repassesByStatus[status.nome]?.length || 0 }} Contratos
              </p>
            </div>
            <!-- SE NÃO HÁ REPASSES NESSE STATUS -->
            <div v-if="!repassesByStatus[status.nome] || repassesByStatus[status.nome].length === 0"
              class="text-sm text-gray-500 dark:text-gray-400 text-center">
              Nenhum repasse neste status
            </div>

            <!-- LISTA DE REPASSES -->
            <div v-else>
              <div v-for="repasse in repassesByStatus[status.nome]" :key="repasse.ID"
                class="relative mb-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800">
                <!-- Conteúdo do repasse (sem alterações) -->
                <div class="flex flex-col">
                  <div class="flex justify-between items-center">
                    <div class="flex gap-2 items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <span>#{{ repasse.ID }}</span>
                      <a :href="'https://menin.cvcrm.com.br/gestor/comercial/reservas/' + repasse.idreserva + '/administrar'"
                        target="_blank" v-tippy="repasse.status_reserva" @mousedown.stop
                        class="text-white px-2 py-0.5 rounded-md shadow cursor-pointer"
                        :class="repasse.status_reserva === 'Vendida' ? 'bg-green-600' : 'bg-red-500'">
                        {{ repasse.status_reserva }}
                      </a>
                    </div>
                    <button v-tippy="'CV CRM'">
                      <a :href="'https://menin.cvcrm.com.br/gestor/financeiro/repasses/' + repasse.ID + '/administrar'"
                        target="_blank">
                        <img src="/CVLogo.png" alt="CV CRM" class="h-5 min-w-5 drop-shadow">
                      </a>
                    </button>
                  </div>
                  <div class="border-b mt-2 border-gray-300 dark:border-gray-700 w-full"></div>
                </div>

                <div class="text-sm mt-3 mx-1">
                  <p class="truncate">
                    <i class="fas text-lg fa-building"></i> {{ repasse.empreendimento }}<br>
                  </p>
                  <p class="text-xs my-0.5 text-gray-400 truncate">
                    {{ repasse.etapa }} | {{ repasse.bloco }} | {{ repasse.unidade }}
                  </p>
                  <p class="truncate text-lg">
                    <i class="fas fa-money-bill"></i> {{ formatMoney(repasse.valor_contrato) }}
                  </p>
                </div>

                <div class="relative flex items-center w-full">
                  <!-- Linha central -->
                  <div class="absolute left-0 right-0 h-[1px] bg-gray-300 dark:bg-gray-700"></div>
                  <!-- Botão sobreposto -->
                  <button @click.stop="toggleDetails(repasse.ID)" @mousedown.stop
                    class="relative m-auto z-10 px-3 py-0.5 text-xs dark:bg-gray-800 dark:hover:bg-gray-900 bg-gray-100 hover:bg-gray-100 border-gray-300 border dark:border-gray-700 dark:text-gray-300 text-gray-400 rounded-md">
                    {{ expandedDetails[repasse.ID] ? '- Detalhes' : '+ Detalhes' }}
                  </button>
                </div>

                <!-- Informações Extras (Exibidas se expandido) -->
                <div v-if="expandedDetails[repasse.ID]"
                  class="text-gray-700 dark:text-gray-400 flex text-center text-sm">
                  <div class="flex-1">
                    <span class="font-semibold text-xs text-gray-800 dark:text-gray-200">Criado há:</span>
                    <br> {{ timeDifference(repasse.data_contrato_contab) }}<br>
                  </div>
                  <div class="border-[0.5px] mt-2 border-gray-300 dark:border-gray-700"></div>
                  <div v-if="status.nome === 'Em espera'" class="flex-1">
                    <span class="font-semibold text-xs text-gray-800 dark:text-gray-200">Na situação há:</span>
                    <br> {{ timeDifference(repasse.data_contrato_contab) }}<br>
                  </div>
                  <div v-else class="flex-1">
                    <span class="font-semibold text-xs text-gray-800 dark:text-gray-200">Na situação há:</span>
                    <br> {{ timeDifference(repasse.data_status_repasse) }}<br>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>


    <!-- <div class="content-2 h-screen">
    </div> -->


  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, reactive } from 'vue';
import { useRepassesStore } from '@/stores/Reports/Repasses/repassesStore';

const store = useRepassesStore();
const selectedEmpreendimento = ref('');

// Filtros reativos
const filtros = reactive({
  mostrarCancelados: false,
  mostrarDistratos: false,
  mostrarCessoes: false
});

// Referência para os status ordenados
const orderedStatuses = computed(() => {
  // Retorna os statusConfig da store, caso existam
  return store.statusConfig && store.statusConfig.length > 0
    ? [...store.statusConfig].sort((a, b) => a.ordem - b.ordem) // Ordena por ordem, se existir
    : [];
});

// Agrupamento por status
const repassesByStatus = computed(() => {
  const map = {};

  // Inicializa o mapa com todos os status da store
  if (store.statusConfig && store.statusConfig.length > 0) {
    store.statusConfig.forEach(status => {
      map[status.nome] = [];
    });
  }

  // Usamos diretamente os repasses do store, que já estão filtrados pelo backend
  const repassesParaAgrupar = store.repasses;

  for (const repasse of repassesParaAgrupar) {
    const currentStatus = repasse.status_repasse || 'N/A';

    if (!map[currentStatus]) {
      // Caso o status não esteja no mapa, cria-o
      map[currentStatus] = [];
    }

    map[currentStatus].push(repasse);
  }

  return map;
});

// Computed para sumarizar grupos com valores totais
const gruposSumarizados = computed(() => {
  // Resultado que vamos retornar
  const gruposSumarizados = [];

  // Mapear cada status para seu grupo
  const statusToGrupo = {};

  // Criar o mapeamento de status para grupo
  store.statusConfig.forEach(status => {
    if (status.grupos && status.grupos.length > 0) {
      status.grupos.forEach(grupo => {
        statusToGrupo[status.nome] = {
          id: grupo.idgrupo,
          nome: grupo.nome
        };
      });
    }
  });

  // Calcular totais por grupo
  const grupoTotais = {};

  // Inicializar os grupos a partir dos dados da store
  store.grupos.forEach(grupo => {
    grupoTotais[grupo.id] = {
      id: grupo.id,
      nome: grupo.nome,
      total: 0,
      valorTotal: 0
    };
  });

  // Percorrer todos os repasses e somar por grupo
  Object.entries(repassesByStatus.value).forEach(([statusNome, repasses]) => {
    if (repasses.length === 0) return;

    const grupo = statusToGrupo[statusNome];
    if (!grupo) return;

    // Somar ao grupo correspondente
    if (grupoTotais[grupo.id]) {
      grupoTotais[grupo.id].total += repasses.length;

      // Somar os valores dos contratos
      repasses.forEach(repasse => {
        grupoTotais[grupo.id].valorTotal += parseFloat(repasse.valor_contrato || 0);
      });
    }
  });

  // Converter o objeto em array para ser usado no template
  Object.values(grupoTotais).forEach(grupo => {
    if (grupo.total > 0) {
      gruposSumarizados.push(grupo);
    }
  });

  return gruposSumarizados;
});

// Helper functions for group cards
const getGrupoColor = (id) => {
  // Find grupo in workflow data
  const grupo = store.grupos.find(g => g.id.toString() === id.toString());
  return grupo?.cor || '#f3f4f6'; // Default gray if not found
};

const getGrupoTextColor = (id) => {
  // Find grupo in workflow data
  const grupo = store.grupos.find(g => g.id.toString() === id.toString());
  return grupo?.cor_texto || '#000000'; // Default black if not found
};

// Function to adjust color brightness for the counter badge
const adjustColor = (color, amount) => {
  if (!color) return '#f3f4f6';

  // Simple function to lighten or darken a hex color
  let usePound = false;

  if (color[0] === "#") {
    color = color.slice(1);
    usePound = true;
  }

  const num = parseInt(color, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  // Lighten
  r = Math.min(255, Math.max(0, Math.round(r + (255 - r) * amount)));
  g = Math.min(255, Math.max(0, Math.round(g + (255 - g) * amount)));
  b = Math.min(255, Math.max(0, Math.round(b + (255 - b) * amount)));

  return (usePound ? "#" : "") + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

onMounted(async () => {
  // Carrega o workflow de repasses (situações/status)
  await store.fetchRepasseWorkflow();

  // Carrega os empreendimentos
  await store.fetchEmpreendimentos();

  // Carrega os repasses
  await store.fetchRepasses();

  // Sincroniza o valor do select com o filtro atual
  selectedEmpreendimento.value = store.filtroEmpreendimento;

  // Sincroniza os filtros com os valores do store
  filtros.mostrarCancelados = store.mostrarCancelados;
  filtros.mostrarDistratos = store.mostrarDistratos;
  filtros.mostrarCessoes = store.mostrarCessoes;
});

// Filtro por empreendimento
const filtrarPorEmpreendimento = async () => {
  await store.setFiltroEmpreendimento(selectedEmpreendimento.value);
};

// Aplicar filtros de status
const aplicarFiltros = async () => {
  await store.setFiltroStatus({
    mostrarCancelados: filtros.mostrarCancelados,
    mostrarDistratos: filtros.mostrarDistratos,
    mostrarCessoes: filtros.mostrarCessoes
  });
};

// Funções auxiliares
const formatDate = (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('pt-BR') : 0;
const formatDateTime = (dateStr) => dateStr ? new Date(dateStr).toLocaleString('pt-BR') : 0;
const formatOnlyDate = (dateStr) => dateStr
  ? new Date(dateStr + "T00:00:00").toLocaleDateString('pt-BR')
  : 0;
const timeDifference = (dateStr) => {
  if (!dateStr) return 0;
  const now = new Date();
  const past = new Date(dateStr);
  let diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 0) diffInSeconds = 0;

  const days = Math.floor(diffInSeconds / (3600 * 24));
  const hours = Math.floor((diffInSeconds % (3600 * 24)) / 3600);

  return `${days} dias, ${hours} horas`;
};

const formatMoney = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

// Controla os estados de expansão individual
const expandedDetails = ref({});
const toggleDetails = (id) => {
  expandedDetails.value[id] = !expandedDetails.value[id];
};

// Controla expansão geral
const allExpanded = ref(false);
const toggleAllDetails = () => {
  allExpanded.value = !allExpanded.value;

  // Percorre todos os status e seus repasses
  for (const statusName in repassesByStatus.value) {
    const repasses = repassesByStatus.value[statusName];
    if (repasses && repasses.length) {
      repasses.forEach(repasse => {
        expandedDetails.value[repasse.ID] = allExpanded.value;
      });
    }
  }
};

// Funções para scroll "PRESS AND PUSH"
const isDragging = ref(false);
const startX = ref(0);
const scrollLeft = ref(0);
const scrollContainer = ref(null);

const startDrag = (e) => {
  // Verificar se o clique foi em um botão
  if (e.target.tagName === 'BUTTON') {
    return;
  }

  isDragging.value = true;
  startX.value = e.pageX - scrollContainer.value.offsetLeft;
  scrollLeft.value = scrollContainer.value.scrollLeft;
};

const onDrag = (e) => {
  if (!isDragging.value) return;
  e.preventDefault();
  const x = e.pageX - scrollContainer.value.offsetLeft;
  const walk = (x - startX.value) * 2;
  scrollContainer.value.scrollLeft = scrollLeft.value - walk;
};

const stopDrag = () => {
  isDragging.value = false;
};
</script>