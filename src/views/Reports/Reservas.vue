<template>
    <div class="w-full h-[calc(100%-4rem)] relative overflow-hidden flex">
        <!-- Área principal -->
        <div class="w-10/12 ps-4 pe-2 py-4 h-full flex flex-col overflow-hidden">
            <div class="flex items-center pb-2">
                <h1 v-if="currentSection === 'Imobiliarias'" class="text-xl md:text-2xl font-bold">Reservas x
                    Imobiliarias</h1>
                <h1 v-else class="text-xl md:text-2xl font-bold">Reservas</h1>
                <Favorite v-if="currentSection === 'Imobiliarias'" :router="'/comercial/reservas'"
                    :section="'Imobiliarias'" />
                <Favorite v-else :router="'/comercial/reservas'" :section="'Reservas'" />
            </div>

            <div class="cards flex w-full gap-4 mb-3">
                <!-- Card para o total de reservas -->
                <Card v-if="store.total > 0" :title="'Todas as Reservas'" :icon="'fas fa-tent'"
                    :class="'!bg-blue-500/15 !border-blue-500/30'" :value="store.total"
                    :label="`Desde ${formatDate(dataFiltro)}`" @click="showAllReservas()" />
                <Card v-if="totalEmpreendimentosComReserva > 0" :title="'Empreendimentos com Reserva'"
                    :icon="'fas fa-building'" :class="'!bg-purple-500/15 !border-purple-500/30'"
                    :value="totalEmpreendimentosComReserva" :label="'Total de empreendimentos com reservas ativas'" />
                <Card v-if="aggregatedInfo.totalValorContrato > 0" :title="'Valor Total dos Contratos'"
                    :icon="'fas fa-dollar-sign'" :class="'!bg-green-500/15 !border-green-500/30'"
                    :value="formatMoney(aggregatedInfo.totalValorContrato)" :label="'Soma dos valores dos contratos'" />
            </div>

            <!-- Cards para reservas por situação -->
            <div class="cards flex w-full gap-4 mb-3">
                <Card v-for="(count, situacao) in aggregatedInfo.porSituacao" :key="situacao" :title="situacao"
                    :icon="'fas fa-sitemap'" :class="'!bg-indigo-500/15 !border-indigo-500/30'" :value="count"
                    :label="`Reservas em ${situacao}`" @click="showReservasBySituacao(situacao)" />
            </div>

            <!-- Filtros do Relatório -->
            <ReservaFilterBar :empreendimentos="store.empreendimentos"
                :initialSelectedEmpreendimentos="selectedEmpreendimentos" :initialDataFiltro="dataFiltro"
                :initialDataFiltroFim="dataFiltroFim" @applyFilters="aplicarFiltros"
                @update:selectedEmpreendimentos="updateEmpreendimentos" @update:dataFiltro="updateDataFiltro"
                @update:dataFiltroFim="updateDataFiltroFim" />

            <!-- Tabela de Reservas Componentizada -->

            <div v-if="currentSection === 'Imobiliarias'"
                class="flex-grow overflow-auto overflow-x-auto mt-4 rounded-lg border border-gray-600">
                <ImobiliariasPerformance :reservas="store.reservas" />
            </div>

            <ReservasTable v-else :reservas="store.reservas" @show-reserva-details="handleShowReservaDetails" />

        </div>

        <!-- Aside componentizado -->
        <ReservasAside :porEmpreendimento="aggregatedInfo.porEmpreendimento"
            @show-reservas-by-empreendimento="showReservasByEmpreendimento" />

        <!-- Modal de detalhes centralizado na View -->
        <ReservasModal :reservas="reservasToShow" :modalVisivel="modalVisivel"
            @update:modalVisivel="modalVisivel = $event" />

    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useReservasStore } from '@/stores/Reports/Reservas/reservasStore';
import Favorite from "@/components/config/Favorite.vue";
import ReservaFilterBar from '@/components/Reports/Reservas/ReservaFilterBar.vue';
import Card from '@/components/Reports/Reservas/Card.vue';
import ReservasTable from '@/components/Reports/Reservas/Reservas/ReservasTable.vue';
import ReservasAside from '@/components/Reports/Reservas/Reservas/ReservasAside.vue';
import ReservasModal from '@/components/Reports/Reservas/ReservasModal.vue';
import ImobiliariasPerformance from '@/components/Reports/Reservas/Imobiliarias/ImobiliariasPerformance.vue'

// Toast de notificação
import { useToast } from 'vue-toastification';
const toast = useToast();


const route = useRoute();

const currentSection = computed(() => route.query.section);

const modalVisivel = ref(false);
const reservasToShow = ref([]);

// Função para receber o evento de exibição de detalhes de uma única reserva
const handleShowReservaDetails = (reserva) => {
    // Exibe o modal com apenas a reserva selecionada
    reservasToShow.value = [reserva];
    modalVisivel.value = true;
};

// Função para mostrar reservas por situação
const showReservasBySituacao = (situacao) => {
    // Filtra as reservas pela situação selecionada
    const reservasFiltradas = store.reservas.filter(
        reserva => (reserva.situacao?.situacao || 'N/A') === situacao
    );

    // Exibe o modal com as reservas filtradas
    reservasToShow.value = reservasFiltradas;
    modalVisivel.value = true;
};

// Função para mostrar reservas por empreendimento
const showReservasByEmpreendimento = (empreendimento) => {
    // Filtra as reservas pelo empreendimento selecionado
    const reservasFiltradas = store.reservas.filter(
        reserva => (reserva.unidade?.empreendimento || 'N/A') === empreendimento
    );

    // Exibe o modal com as reservas filtradas
    reservasToShow.value = reservasFiltradas;
    modalVisivel.value = true;
};

// Função para mostrar todas as reservas
const showAllReservas = () => {
    reservasToShow.value = store.reservas;
    console.log(store.reservas)
    modalVisivel.value = true;
};

const store = useReservasStore();

// Estados reativos para os filtros
const selectedEmpreendimentos = ref([]);
const dataFiltro = ref('');
// Na view, adicionar um novo estado reativo para o filtro de data final
const dataFiltroFim = ref('');

// Funções para atualizar os filtros conforme os eventos do componente ReservaFilterBar
const updateEmpreendimentos = (empreendimentos) => {
    selectedEmpreendimentos.value = empreendimentos;
};

const updateDataFiltro = (data) => {
    dataFiltro.value = data;
};

const updateDataFiltroFim = (data) => {
    dataFiltroFim.value = data;
};

// Função para atualizar os filtros e recarregar os dados
const aplicarFiltros = async (filters) => {
    // Atualiza o filtro de data se informado
    if (filters.a_partir_de) {
        dataFiltro.value = filters.a_partir_de;
    }
    // Atualiza a data final se informada
    if (filters.ate) {
        dataFiltroFim.value = filters.ate;
    }
    // Atualiza os empreendimentos selecionados
    if (filters.selectedEmpreendimentos) {
        selectedEmpreendimentos.value = filters.selectedEmpreendimentos;
    }
    // Chama o método do store para buscar reservas com os parâmetros de filtro
    // await store.fetchReservas({
    //     a_partir_de: dataFiltro.value,
    //     ate: dataFiltroFim.value,
    //     idempreendimento: selectedEmpreendimentos.value.join(','),
    //     faturar: filters.faturar === 'ambas' ? 'ambos' : (filters.faturar || 'false')
    // });
    try {
        await store.fetchReservas({
            a_partir_de: dataFiltro.value,
            ate: dataFiltroFim.value,
            idempreendimento: selectedEmpreendimentos.value.join(','),
            faturar: filters.faturar === 'ambas' ? 'ambos' : (filters.faturar || 'false')
        });
    } catch (error) {
        toast.error('Sem retorno para os parâmetros fornecidos'); 
    }
};

// Funções utilitárias
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR');
};

const formatMoney = (value) =>
    new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);

// Carregamento inicial dos dados
onMounted(async () => {
    await store.fetchEmpreendimentos();
    const hoje = new Date();
    const dataInicial = `01/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;
    dataFiltro.value = dataInicial;
    dataFiltroFim.value = hoje.toISOString().slice(0, 10); // Data atual como data final
    await store.fetchReservas({
        a_partir_de: dataInicial,
        ate: dataFiltroFim.value,
        faturar: 'false'
    });
});


const aggregatedInfo = computed(() => {
    const info = {
        totalReservas: store.reservas.length,
        porSituacao: {},
        totalValorContrato: 0,
        porEmpreendimento: {}
    };

    store.reservas.forEach((reserva) => {
        // Agrupamento por situação
        const situacao = reserva.situacao?.situacao || 'N/A';
        if (!info.porSituacao[situacao]) {
            info.porSituacao[situacao] = 0;
        }
        info.porSituacao[situacao]++;

        // Soma dos valores de contrato
        const valor = parseFloat(reserva.condicoes?.valor_contrato) || 0;
        info.totalValorContrato += valor;

        // Agrupamento por empreendimento
        const empreendimento = reserva.unidade?.empreendimento || 'N/A';
        if (!info.porEmpreendimento[empreendimento]) {
            info.porEmpreendimento[empreendimento] = 0;
        }
        info.porEmpreendimento[empreendimento]++;
    });

    // Ordenar os empreendimentos por quantidade de reservas (do maior para o menor)
    info.porSituacao = Object.entries(info.porSituacao)
        .sort((a, b) => b[1] - a[1])  // Ordenar de forma decrescente
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});

    // Ordenar os empreendimentos por quantidade de reservas (do maior para o menor)
    info.porEmpreendimento = Object.entries(info.porEmpreendimento)
        .sort((a, b) => b[1] - a[1])  // Ordenar de forma decrescente
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});

    return info;
});

// Computed para contar os empreendimentos com reservas ativas
const totalEmpreendimentosComReserva = computed(() => {
    return Object.keys(aggregatedInfo.value.porEmpreendimento)
        .filter(key => key !== 'N/A') // remova esta linha se quiser contar até as chaves 'N/A'
        .length;
});
</script>