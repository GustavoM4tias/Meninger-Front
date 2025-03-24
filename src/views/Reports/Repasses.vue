<template>
  <div class="min-h-[calc(100%-4rem)] md:max-h-[90%] flex flex-col">
    <div class="relative bg-gray-200 dark:bg-gray-600 m-2 md:m-auto p-3 md:p-4 rounded-xl drop-shadow-md"> 
      <div class="flex items-center">
        <h1 class="text-xl md:text-2xl font-bold">Repasses</h1>
        <Favorite :router="'/reports/repasses'" :section="'Repasses'" />
      </div>
      <!-- Container principal com espaçamento mais equilibrado -->
      <div class="flex justify-between pb-2">
        <!-- Primeira linha: botão expandir e filtro de empreendimentos -->
        <filter-bar :initial-selected-empreendimento="selectedEmpreendimento" :initial-all-expanded="allExpanded"
          :initial-filtros="filtros" :empreendimentos="store.empreendimentos"
          @update:empreendimento="filtrarPorEmpreendimento" @update:all-expanded="toggleAllDetails"
          @update:filtros="aplicarFiltros" :maxSelection="2" />

        <!-- Terceira linha: cards de grupos renovados -->
        <grupos-summary :grupos-sumarizados="gruposSumarizados" :get-grupo-color="getGrupoColor"
          :get-grupo-text-color="getGrupoTextColor" :adjust-color="adjustColor" :format-money="formatMoney" />
        <!-- Novo botão para modal de repasses mensais -->
        <Modal />
      </div>

      <div v-if="store.repasses.length > 0" class="relative max-h-[70vh] w-[90vw] m-auto rounded-lg overflow-y-auto">
        <!-- SCROLL HORIZONTAL -->
        <scroll-container :ordered-statuses="orderedStatuses" :repasses-by-status="repassesByStatus"
          :paginated-repasses="paginatedRepasses" :has-more-repasses="hasMoreRepasses"
          :load-more-repasses="loadMoreRepasses" :expanded-details="expandedDetails" :toggle-details="toggleDetails"
          :time-difference="timeDifference" :format-money="formatMoney" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, reactive } from 'vue';
import { useRepassesStore } from '@/stores/Reports/Repasses/repassesStore';
import Favorite from "@/components/config/Favorite.vue";
import FilterBar from '@/components/Reports/Repasses/FilterBar.vue';
import GruposSummary from '@/components/Reports/Repasses/GruposSummary.vue';
import ScrollContainer from '@/components/Reports/Repasses/ScrollContainer.vue';
import Modal from '@/components/Reports/Repasses/Modal.vue';

const store = useRepassesStore();
// Changed from string to array to support multiple selections
const selectedEmpreendimento = ref([]);
const isLoading = ref(false);

// Filtros reativos
const filtros = reactive({
  mostrarCancelados: false,
  mostrarDistratos: false,
  mostrarCessoes: false
});

// Paginação por coluna (status)
const paginationLimit = ref(10);
const paginationState = reactive({});

// Inicializar o estado de paginação para cada status
const initPaginationState = () => {
  if (store.statusConfig && store.statusConfig.length > 0) {
    store.statusConfig.forEach(status => {
      if (!paginationState[status.nome]) {
        paginationState[status.nome] = {
          page: 1,
          limit: paginationLimit.value
        };
      }
    });
  }
};

// Carregar mais itens para um status específico
const loadMoreRepasses = (statusName) => {
  if (paginationState[statusName]) {
    paginationState[statusName].page += 1;
  }
};

// Verificar se há mais repasses para carregar para um status específico
const hasMoreRepasses = (statusName) => {
  if (!repassesByStatus.value[statusName]) return false;

  const total = repassesByStatus.value[statusName].length;
  const current = paginationState[statusName]?.page * paginationState[statusName]?.limit || 0;

  return current < total;
};

// Obter repasses paginados para um status específico
const paginatedRepasses = (statusName) => {
  if (!repassesByStatus.value[statusName]) return [];

  const page = paginationState[statusName]?.page || 1;
  const limit = paginationState[statusName]?.limit || paginationLimit.value;

  return repassesByStatus.value[statusName].slice(0, page * limit);
};

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
  isLoading.value = true;
  try {
    // Carrega o workflow de repasses (situações/status)
    await store.fetchRepasseWorkflow();

    // Carrega os empreendimentos
    await store.fetchEmpreendimentos();

    // Carrega os repasses
    await store.fetchRepasses();

    // Sincroniza o valor do select com o filtro atual
    // Convert to array if it's a string
    selectedEmpreendimento.value = Array.isArray(store.filtroEmpreendimento)
      ? store.filtroEmpreendimento
      : store.filtroEmpreendimento ? [store.filtroEmpreendimento] : [];

    // Sincroniza os filtros com os valores do store
    filtros.mostrarCancelados = store.mostrarCancelados;
    filtros.mostrarDistratos = store.mostrarDistratos;
    filtros.mostrarCessoes = store.mostrarCessoes;

    // Inicializa o estado de paginação
    initPaginationState();
  } finally {
    isLoading.value = false;
  }
});

// Observar mudanças nos repasses para reiniciar a paginação quando necessário
watch(() => store.repasses, () => {
  initPaginationState();
}, { deep: true });

// Filtro por empreendimento - modificado para aceitar array
const filtrarPorEmpreendimento = async (novosEmpreendimentos) => {
  isLoading.value = true;
  try {
    selectedEmpreendimento.value = novosEmpreendimentos;
    await store.setFiltroEmpreendimento(novosEmpreendimentos);
    // Reinicia a paginação ao filtrar
    initPaginationState();
  } finally {
    isLoading.value = false;
  }
};

// Aplicar filtros de status
const aplicarFiltros = async (novosFiltros) => {
  isLoading.value = true;
  try {
    Object.assign(filtros, novosFiltros);
    await store.setFiltroStatus({
      mostrarCancelados: filtros.mostrarCancelados,
      mostrarDistratos: filtros.mostrarDistratos,
      mostrarCessoes: filtros.mostrarCessoes
    });
    // Reinicia a paginação ao filtrar
    initPaginationState();
  } finally {
    isLoading.value = false;
  }
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
</script>