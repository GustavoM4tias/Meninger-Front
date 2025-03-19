<template>
  <div class="min-h-[calc(100%-4rem)] flex flex-col">
    <h1 class="text-2xl font-bold mb-4">Relatório de Repasses</h1>

    <div class="flex items-center justify-between">
      <div>
        <!-- <p><strong>Total de repasses:</strong> {{ store.total }}</p> -->
        <p class="flex items-center">
          <!-- <strong>Total Conteúdo:</strong> {{ store.totalConteudo }} -->
          <button @click="toggleAllDetails" class="ml-4 px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            {{ allExpanded ? 'Recolher Todos' : 'Expandir Todos' }}
          </button>
        </p>
      </div>
    </div>

    <div v-if="store.carregando" class="text-gray-500">
      Carregando repasses...
    </div>

    <div v-else class="relative m-4 max-h-[78vh] rounded-lg overflow-y-auto">
      <!-- SCROLL HORIZONTAL -->
      <div ref="scrollContainer" class="overflow-auto flex flex-nowrap gap-4 pb-4 select-none" @mousedown="startDrag"
        @mousemove="onDrag" @mouseup="stopDrag" @mouseleave="stopDrag">
        <div v-for="status in orderedStatuses" :key="status"
          :class="['min-w-[300px] bg-white dark:bg-gray-700 shadow-md rounded-lg p-4 filter drop-shadow-md', getStatusClass(status)]">
          <div class="title mb-2">
            <h2 class="text-xl font-semibold text-white text-center truncate">
              {{ status }}
            </h2>
            <p class="text-xs text-center text-gray-200">{{ repassesByStatus[status]?.length }} Contratos</p>
          </div>
          <!-- SE NÃO HÁ REPASSES NESSE STATUS -->
          <div v-if="!repassesByStatus[status] || repassesByStatus[status].length === 0"
            class="text-sm text-gray-500 dark:text-gray-400 text-center">
            Nenhum repasse neste status
          </div>

          <!-- LISTA DE REPASSES -->
          <div v-else>
            <div v-for="repasse in repassesByStatus[status]" :key="repasse.ID"
              class="relative mb-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800">
              <div class="flex flex-col">

                <div class="flex justify-between items-center">
                  <div class="flex gap-2 items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <!-- <span class="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {{ repasse.data_contrato_contab ? formatDate(repasse.data_contrato_contab) : 'N/A' }}
                  </span> -->
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
                <!-- <strong>Criado em:</strong> {{ formatOnlyDate(repasse.data_contrato_contab) }}<br>
                <strong>Na situação desde:</strong> {{ formatDate(repasse.data_status_repasse) }}<br> -->
                <div class="flex-1">
                  <span class="font-semibold text-xs text-gray-800 dark:text-gray-200">Criado há:</span>
                  <br> {{ timeDifference(repasse.data_contrato_contab) }}<br>
                </div>
                <div class="border-[0.5px] mt-2 border-gray-300 dark:border-gray-700"></div>
                <div v-if="status === 'Em espera'" class="flex-1">
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
import { ref, onMounted, computed } from 'vue';
import { useRepassesStore } from '@/stores/Reports/Repasses/repassesStore';

// 1) LISTA DOS STATUS NA ORDEM DESEJADA E SUAS CLASSES
const statusConfig = {
  'Em espera': '!bg-blue-600',
  'Abertura SIOPI': '!bg-amber-500',
  'Ressarcimento FGTS': ' !bg-indigo-800',
  'Assinatura Formulários': ' !bg-fuchsia-400',
  'Enviar CEHOP': '!bg-rose-600',
  'Inconforme CEHOP': '!bg-rose-800',
  'Conforme CEHOP': '!bg-teal-400',
  'Em Contratação CAIXA': ' !bg-cyan-500',
  'Entrevista Comercial CAIXA': '!bg-sky-600',
  'Contrato Emitido CAIXA': '!bg-blue-800',
  'Geração Contratos Construtora': '!bg-yellow-500',
  'Analise Contratos': '!bg-cyan-800',
  'Inconforme Confissão': '!bg-green-800',
  'Inconforme Contrato': '!bg-purple-800',
  // 'Conforme Contrato': '!bg-green-800',
  'Documento Pendente': '!bg-orange-600',
  'Autorizado envio assinatura': '!bg-green-500',
  'Enviado assinatura': '!bg-sky-400',
  'Aditamento': '!bg-emerald-700',
  'Informações Incompletas': '!bg-orange-700',
  'Contratos assinados MCMV': '!bg-blue-700',
  'Faturado SIENGE MCMV': '!bg-red-600',
  'ITBI': '!bg-purple-900',
  'Preparação Para Envio Cartório': '!bg-violet-700',
  'Entrada Cartório RI': '!bg-fuchsia-600',
  'Devolução': '!bg-rose-950',
  'Contrato Registrado': '!bg-rose-700',
  'Envio Para Conformidade CEHOP': '!bg-purple-600',
  'Inconforme Contrato CEHOP': '!bg-fuchsia-950',
  'Conforme Contrato CEHOP': '!bg-sky-600',
  'Finalizado': '!bg-blue-900',
  'Contrato Assinado SBPE': '!bg-amber-400',
  'Inconforme SBPE': '!bg-red-500',
  'Distrato': '!bg-gray-900',
  'Sessão': '!bg-orange-700',
};

const orderedStatuses = Object.keys(statusConfig);

// Função para obter a classe do status
const getStatusClass = (status) => {
  return statusConfig[status] || '';
};

// 2) CARREGANDO OS DADOS
const store = useRepassesStore();

onMounted(async () => {
  await store.fetchRepasses();
  console.log('Dados de repasses na view:', store.repasses);
});

// 3) AGRUPAMENTO POR STATUS
const repassesByStatus = computed(() => {
  const map = {};
  orderedStatuses.forEach((status) => (map[status] = []));

  for (const repasse of store.repasses) {
    if (repasse.status_repasse === 'Cancelado') continue;

    const currentStatus = repasse.status_repasse || 'N/A';

    if (!map[currentStatus]) continue;

    map[currentStatus].push(repasse);
  }

  return map;
});

// 4) FUNÇÕES AUXILIARES
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
  for (const status in repassesByStatus.value) {
    repassesByStatus.value[status].forEach(repasse => {
      expandedDetails.value[repasse.ID] = allExpanded.value;
    });
  }
};

// 6) FUNÇÃO PARA SCROLL "PRESS AND PUSH"
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