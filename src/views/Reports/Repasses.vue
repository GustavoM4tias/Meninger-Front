<template>
  <div class="min-h-[calc(100%-4rem)] flex flex-col">
    <h1 class="text-2xl font-bold mb-4">Relatório de Repasses</h1>

    <div class="flex flex-col gap-2 mb-4">
      <!-- Primeira linha de filtros -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="flex items-center">
            <button @click="toggleAllDetails" class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600">
              {{ allExpanded ? 'Recolher Todos' : 'Expandir Todos' }}
            </button>
          </div>

          <!-- Select de empreendimentos otimizado -->
          <div class="flex items-center">
            <select v-model="selectedEmpreendimento" @change="filtrarPorEmpreendimento"
              class="px-3 py-1 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              :disabled="store.carregandoEmpreendimentos">
              <option value="">Todos os Empreendimentos</option>
              <option v-for="empreendimento in store.empreendimentos" :key="empreendimento" :value="empreendimento">
                {{ empreendimento }}
              </option>
            </select>
            <div v-if="store.carregandoEmpreendimentos" class="ml-2 text-gray-500 text-sm">
              Carregando...
            </div>
          </div>
        </div>

        <!-- Checkboxes de filtro -->
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <input type="checkbox" id="mostrarCancelados" v-model="filtros.mostrarCancelados" @change="aplicarFiltros" />
            <label for="mostrarCancelados" class="text-sm">Mostrar Cancelados</label>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="mostrarDistratos" v-model="filtros.mostrarDistratos" @change="aplicarFiltros" />
            <label for="mostrarDistratos" class="text-sm">Mostrar Distratos</label>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="mostrarCessoes" v-model="filtros.mostrarCessoes" @change="aplicarFiltros" />
            <label for="mostrarCessoes" class="text-sm">Mostrar Cessões</label>
          </div>
        </div>
      </div>

      <!-- Segunda linha com cards de grupos -->
      <div class="flex flex-wrap gap-2">
        <div v-for="grupoInfo in gruposSumarizados" :key="grupoInfo.id"
          class="px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1 shadow-sm" :style="{
            backgroundColor: getGrupoColor(grupoInfo.id),
            color: getGrupoTextColor(grupoInfo.id)
          }">
          <span>{{ grupoInfo.nome }}</span>
          <div class="flex flex-col items-center">
            <span class="px-2 py-0.5 rounded-full text-xs" :style="{
              backgroundColor: adjustColor(getGrupoColor(grupoInfo.id), 0.2),
              color: getGrupoTextColor(grupoInfo.id)
            }">
              {{ grupoInfo.total }} contratos
            </span>
            <span class="px-2 py-0.5 text-xs font-bold">
              {{ formatMoney(grupoInfo.valorTotal) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.carregando" class="text-gray-500">
      Carregando repasses...
    </div>

    <div v-else class="relative min-h-[70vh] max-h-[78vh] rounded-lg overflow-y-auto">
      <!-- SCROLL HORIZONTAL -->
      <div ref="scrollContainer" class="overflow-auto flex flex-nowrap gap-4 pb-4 select-none" @mousedown="startDrag"
        @mousemove="onDrag" @mouseup="stopDrag" @mouseleave="stopDrag">
        <div v-for="status in orderedStatuses" :key="status.idsituacao || status.nome"
          class="min-w-[300px] shadow-md rounded-lg p-4 filter drop-shadow-md"
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
                <p class="text-xs my-0.5 text-gray-400">
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
              <div v-if="expandedDetails[repasse.ID]" class="text-gray-700 dark:text-gray-400 flex text-center text-sm">
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