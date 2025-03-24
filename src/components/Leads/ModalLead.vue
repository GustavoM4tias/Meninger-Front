<template>
    <aside class="Recents w-full h-full bg-gray-100 dark:bg-gray-800 p-4" ref="scrollContainer">
        <div class="flex flex-col h-full">
            <h2 class="text-2xl font-semibold ps-2 pb-2">Últimos Leads</h2>
            <div class="overflow-y-auto overflow-hidden h-[calc(100%-2rem)] px-2" ref="leadsList"
                @scroll="handleScroll">
                <div v-for="lead in visibleLeads" :key="lead.idlead"
                    class="bg-gray-200 dark:bg-gray-900 rounded-lg shadow hover:-translate-x-2 filter transition-transform duration-100 ease-in-out p-3 mb-2 w-full">
                    <div class="flex">
                        <!-- Nome e Ícone de Expansão -->
                        <div @click="toggleDetails(lead.idlead)"
                            class="flex w-auto max-w-[60%] min-w-[30%] overflow-hidden cursor-pointer">
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
                                <button v-tippy="lead.midia_principal" class="shrink-0">
                                    <p v-if="lead.midia_principal"
                                        class="py-0.5 px-1.5 rounded-lg bg-gray-50 dark:bg-gray-700 truncate">
                                        {{ lead.midia_principal }}
                                    </p>
                                </button>
                                <button v-tippy="lead.situacao.nome" class="flex-grow min-w-0 overflow-hidden">
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
                                <a v-if="lead.link_rdstation" :href="lead.link_rdstation" target="_blank"
                                    class="cursor-pointer" v-tippy="'RD Station'">
                                    <img src="/RDLogo.png" alt="RD Station" class="w-5 min-w-5" />
                                </a>
                            </div>
                        </div>
                    </div>

                    <div v-if="detailsOpened(lead.idlead)" class="mt-2">
                        <div
                            class="bg-gray-200 dark:bg-gray-700 px-1 sm:px-2 pb-1 md:pb-2 pt-2 md:pt-3 rounded-xl flex text-center my-3">
                            <label class="absolute ms-2 md:ms-3 -mt-6 font-semibold text-md md:text-lg">Dados
                                Cliente</label>
                            <button v-if="lead.email" v-tippy="'Email'" class="flex-1 truncate">
                                <a class="text-sm md:text-md truncate" :href="'mailto:' + lead.email"><i
                                        class="fas fa-envelope"></i> {{ lead.email
                                        }}</a></button>
                            <button v-if="lead.telefone" v-tippy="'WhatsApp'" class="flex-1 truncate">
                                <a class="text-sm md:text-md truncate"
                                    :href="'https://wa.me/' + lead.telefone.replace(/\D/g, '')" target="_blank"><i
                                        class="fab fa-whatsapp"></i> {{ lead.telefone }}</a></button>
                        </div>
                        <div v-if="lead.imobiliaria.nome"
                            class="bg-gray-200 dark:bg-gray-700 px-0.5 md:px-2 pb-0.5 md:pb-2 pt-3 rounded-xl flex text-center my-1 md:my-3">
                            <label class="absolute ms-2 md:ms-3 -mt-6 font-semibold text-md md:text-lg">Dados
                                imobiliária</label>
                            <button v-tippy="'CV Imobiliária'" class="flex-1 truncate">
                                <a class="text-sm md:text-md truncate" target="_blank"
                                    :href="'https://menin.cvcrm.com.br/gestor/cadastros/imobiliarias?q%5B1%7Cimobiliarias.idimobiliaria%5D=&q%5B2%7Cimobiliarias.nome%5D=' + lead.imobiliaria.nome">
                                    <i class="fas fa-trowel-bricks"></i> {{ lead.imobiliaria.nome }}
                                </a>
                            </button>
                            <button v-if="lead.corretor?.nome" v-tippy="'CV Corretor'" class="flex-1 truncate">
                                <a class="text-sm md:text-md truncate" target="_blank"
                                    :href="'https://menin.cvcrm.com.br/gestor/cadastros/corretores?q%5B1%7Cc.idcorretor%5D=&q%5B2%7Cc.nome%5D=' + lead.corretor.nome">
                                    <i class="fas fa-clipboard"></i> {{ lead.corretor.nome }}
                                </a>
                            </button>
                        </div>
                    </div>

                    <div class="flex w-full justify-between pt-1">
                        <a v-tippy="lead.empreendimento[0]?.nome"
                            :href="'/buildings?search=' + lead.empreendimento[0]?.nome" target="_blank"
                            class="bg-gray-50 dark:bg-gray-700 rounded-md px-2 w-auto truncate text-sm ms-0 m-auto"
                            v-if="lead.empreendimento && lead.empreendimento.length > 0">
                            {{ lead.empreendimento[0].nome }}
                        </a>
                        <div v-else class="bg-gray-50 dark:bg-gray-700 rounded-md px-2 w-auto truncate text-sm ms-0 m-auto">SEM EMPREENDIMENTO</div>
                        <span v-tippy="formatDateHour(lead.data_cad)" class="text-gray-500 truncate cursor-pointer">
                            {{ formatDateHour(lead.data_cad) }}
                        </span>
                    </div>
                </div>

                <!-- Indicador de carregamento -->
                <div v-if="isLoading" class="text-center py-4">
                    <p class="text-gray-500">Carregando mais leads...</p>
                </div>

                <!-- Mensagem de final da lista -->
                <div v-if="allLoaded && !isLoading && ultimosLeads.length > 0" class="text-center py-4">
                    <p class="text-gray-500">Todos os leads foram carregados</p>
                </div>
            </div>
        </div>
    </aside>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";

// Props
const props = defineProps({
    leads: {
        type: Array,
        required: true
    },
    batchSize: {
        type: Number,
        default: 20
    },
    scrollThreshold: {
        type: Number,
        default: 200 // pixels antes do fim da lista para carregar mais
    }
});

// Refs
const scrollContainer = ref(null);
const leadsList = ref(null);
const leadsDetails = ref({});
const modalAbertoId = ref(null);
const displayCount = ref(props.batchSize);
const isLoading = ref(false);
const allLoaded = ref(false);

// Computed
const ultimosLeads = computed(() => {
    return props.leads
        .slice()
        .sort((a, b) => new Date(b.data_cad) - new Date(a.data_cad));
});

const visibleLeads = computed(() => {
    return ultimosLeads.value.slice(0, displayCount.value);
});

const formatDateHour = (dataString) => {
  if (!dataString) return "";
  return new Date(dataString)
    .toLocaleString("pt-BR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
    .replace(",", "");
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

const handleScroll = () => {
    const list = leadsList.value;
    if (!list) return;

    const scrollBottom = list.scrollTop + list.clientHeight;
    const totalHeight = list.scrollHeight;

    // Carrega mais leads quando chegar próximo ao fim da lista
    if (!isLoading.value && !allLoaded.value && scrollBottom >= totalHeight - props.scrollThreshold) {
        loadMoreLeads();
    }
};

const loadMoreLeads = async () => {
    // Simula uma carga de dados para evitar congelamento da UI
    isLoading.value = true;

    await new Promise(resolve => setTimeout(resolve, 300));

    // Adiciona mais leads
    const newDisplayCount = displayCount.value + props.batchSize;

    // Verifica se todos os leads foram carregados
    if (newDisplayCount >= ultimosLeads.value.length) {
        displayCount.value = ultimosLeads.value.length;
        allLoaded.value = true;
    } else {
        displayCount.value = newDisplayCount;
    }

    isLoading.value = false;
};

// Atualiza o estado quando os leads mudam
watch(() => props.leads, () => {
    displayCount.value = props.batchSize;
    allLoaded.value = props.leads.length <= props.batchSize;
}, { deep: true });

// Inicialização
onMounted(() => {
    allLoaded.value = ultimosLeads.value.length <= props.batchSize;
});
</script>