<script setup>
import { onMounted, ref } from 'vue';
import { useBuildingStore } from '../../stores/Building/buildingStore';
import WeatherInfo from './UI/WeatherInfo.vue'
import Flag from './UI/Flag.vue';

// Store
const buildingStore = useBuildingStore();

// Reactive states
const isActionsMenuOpen = ref(false);
const isAvailabilityOpen = ref(false);

const props = defineProps({
    building: {
        type: Object,
        required: true,
    },
});

console.log(props.building)

const emit = defineEmits(['close']);

const closeModal = () => { emit('close'); };

const fetchWeather = async () => {
    if (props.building?.latitude && props.building?.longitude) {
        try {
            await buildingStore.getWeather(props.building.latitude, props.building.longitude);
        } catch (error) {
            console.error('Erro ao buscar o clima:', error);
        }
    } else {
        console.log('Latitude e longitude não encontradas no empreendimento.');
        buildingStore.weather = null;
    }
};

const formatDate = (dateString) => {
    if (!dateString) return 'Não informado';
    return dateString;
};

const getUnitStatus = (unidade) => {
    // Usa a situação_mapa_disponibilidade para determinar o status
    const situacao = unidade.situacao?.situacao_mapa_disponibilidade;

    switch (situacao) {
        case 1:
            return { text: 'Disponível', class: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' };
        case 2:
            return { text: 'Reservado', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' };
        case 3:
            return { text: 'Vendido', class: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' };
        case 4:
            return { text: 'Bloqueado', class: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300' };
        default:
            return { text: 'Não informado', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' };
    }
};

const getTotalUnits = () => {
    if (!props.building.etapas) return 0;
    return props.building.etapas.reduce((total, etapa) => {
        return total + (etapa.blocos?.reduce((blocoTotal, bloco) => {
            return blocoTotal + (bloco.paginacao_unidade?.total || 0);
        }, 0) || 0);
    }, 0);
};

const getTotalBlocks = () => {
    if (!props.building.etapas) return 0;
    return props.building.etapas.reduce((total, etapa) => {
        return total + (etapa.blocos?.length || 0);
    }, 0);
};

const getUnitStatusCounts = () => {
    if (!props.building.etapas) return { disponivel: 0, reservado: 0, vendido: 0, bloqueado: 0 };

    let counts = { disponivel: 0, reservado: 0, vendido: 0, bloqueado: 0 };

    props.building.etapas.forEach(etapa => {
        etapa.blocos?.forEach(bloco => {
            bloco.unidades?.forEach(unidade => {
                const situacao = unidade.situacao?.situacao_mapa_disponibilidade;
                switch (situacao) {
                    case 1: counts.disponivel++; break;
                    case 2: counts.reservado++; break;
                    case 3: counts.vendido++; break;
                    case 4: counts.bloqueado++; break;
                }
            });
        });
    });

    return counts;
};

const toggleActionsMenu = () => {
    isActionsMenuOpen.value = !isActionsMenuOpen.value;
};

const toggleAvailability = () => {
    isAvailabilityOpen.value = !isAvailabilityOpen.value;
};

const closeActionsMenu = () => {
    isActionsMenuOpen.value = false;
};

onMounted(() => {
    fetchWeather();
});
</script>

<template>
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click.self="closeModal">
        <div
            class="bg-white dark:bg-gray-800 max-w-7xl w-full rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto">
            <!-- Header com imagem e informações principais -->
            <div class="relative h-80 lg:h-96">
                <img :src="props.building.foto ? props.building.foto : '/noimg.jpg'" class="w-full h-full object-cover"
                    :alt="props.building.nome" />

                <!-- Overlay gradient -->
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                <!-- Botão fechar -->
                <button @click="closeModal"
                    class="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-200 group">
                    <i class="fas fa-xmark text-white text-xl group-hover:scale-110 transition-transform"></i>
                </button> 

                <!-- Informações principais sobrepostas -->
                <div class="absolute bottom-6 left-6 right-6">
                    <div class="flex items-end justify-between">
                        <div class="flex-1">
                            <h1 class="text-3xl lg:text-4xl font-bold text-white mb-3 drop-shadow-lg">
                                {{ props.building.nome }}
                            </h1>

                            <!-- Tags de status -->
                            <div class="flex flex-wrap gap-2 mb-4">
                                <span
                                    class="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full border border-white/30"
                                    v-if="props.building.situacao_comercial?.[0]?.nome">
                                    {{ props.building.situacao_comercial[0].nome }}
                                </span>
                                <span
                                    class="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full border border-white/30"
                                    v-if="props.building.tipo_empreendimento?.[0]?.nome">
                                    {{ props.building.tipo_empreendimento[0].nome }}
                                </span>
                                <span
                                    class="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full border border-white/30"
                                    v-if="props.building.situacao_obra?.[0]?.nome">
                                    {{ props.building.situacao_obra[0].nome }}
                                </span>
                                <span
                                    class="px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-full border border-white/30"
                                    v-if="props.building.segmento?.[0]?.nome">
                                    {{ props.building.segmento[0].nome }}
                                </span>
                            </div>
                        </div>

                        <!-- Weather -->
                        <WeatherInfo :weather="buildingStore.weather" :city="props.building.cidade" />
                    </div>
                </div>

                <!-- Flag -->
                <Flag :stage="props.building.situacao_comercial?.[0]?.nome" :rotate="true"
                    class="top-5 left-0 text-2xl pb-2 pe-10" v-if="props.building.situacao_comercial?.[0]?.nome" />
            </div>

            <!-- Conteúdo principal -->
            <div class="p-4 lg:p-8">
                <!-- Resumo estatístico -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div
                        class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                <i class="fas fa-home text-white text-sm"></i>
                            </div>
                            <div>
                                <p class="text-2xl font-bold text-blue-700 dark:text-blue-300">{{ getTotalUnits() }}</p>
                                <p class="text-sm text-blue-600 dark:text-blue-400">Unidades</p>
                            </div>
                        </div>
                    </div>

                    <div
                        class="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                                <i class="fas fa-building text-white text-sm"></i>
                            </div>
                            <div>
                                <p class="text-2xl font-bold text-green-700 dark:text-green-300">{{ getTotalBlocks() }}
                                </p>
                                <p class="text-sm text-green-600 dark:text-green-400">Blocos</p>
                            </div>
                        </div>
                    </div>

                    <div
                        class="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                                <i class="fas fa-layer-group text-white text-sm"></i>
                            </div>
                            <div>
                                <p class="text-2xl font-bold text-purple-700 dark:text-purple-300">{{
                                    props.building.etapas?.length || 0 }}</p>
                                <p class="text-sm text-purple-600 dark:text-purple-400">Etapas</p>
                            </div>
                        </div>
                    </div>

                    <div
                        class="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                                <i class="fas fa-images text-white text-sm"></i>
                            </div>
                            <div>
                                <p class="text-2xl font-bold text-orange-700 dark:text-orange-300">{{
                                    props.building.materiais_campanha?.length || 0 }}</p>
                                <p class="text-sm text-orange-600 dark:text-orange-400">Materiais</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Status de Disponibilidade - Resumo -->
                <div class="mb-8" v-if="props.building.etapas && props.building.etapas.length > 0">
                    <div
                        class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4 md:p-6 border border-blue-200 dark:border-gray-600">
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                            <i class="fas fa-chart-pie text-blue-600"></i>
                            Status das Unidades
                        </h3>

                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div class="text-center">
                                <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{
                                    getUnitStatusCounts().disponivel }}</div>
                                <div class="text-sm text-gray-600 dark:text-gray-400">Disponíveis</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{{
                                    getUnitStatusCounts().reservado }}</div>
                                <div class="text-sm text-gray-600 dark:text-gray-400">Reservadas</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-red-600 dark:text-red-400">{{
                                    getUnitStatusCounts().vendido }}</div>
                                <div class="text-sm text-gray-600 dark:text-gray-400">Vendidas</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold text-gray-600 dark:text-gray-400">{{
                                    getUnitStatusCounts().bloqueado }}</div>
                                <div class="text-sm text-gray-600 dark:text-gray-400">Bloqueadas</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Coluna 1 - Informações do Sienge e Empresa -->
                    <div class="space-y-6">
                        <!-- Card Sienge -->
                        <div
                            class="bg-red-50 dark:bg-gray-700 rounded-xl p-4 md:p-6 border border-red-200 dark:border-gray-600">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-building text-white"></i>
                                </div>
                                <h3 class="text-xl font-bold text-red-900 dark:text-white">Sienge</h3>
                            </div>

                            <div class="space-y-3">
                                <div
                                    class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-gray-500">
                                    <p class="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Empresa</p>
                                    <p class="text-gray-900 dark:text-white font-semibold">{{
                                        props.building?.nome_empresa || 'Não informado' }}</p>
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div
                                        class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-gray-500">
                                        <p class="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">ID Empresa
                                        </p>
                                        <p class="text-red-700 dark:text-red-300 font-bold text-lg">{{
                                            props.building?.idempresa_int || '-' }}</p>
                                    </div>

                                    <div
                                        class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-gray-500">
                                        <p class="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">CDC Sienge
                                        </p>
                                        <p class="text-red-700 dark:text-red-300 font-bold text-lg">{{
                                            props.building?.idempreendimento_int || '-' }}</p>
                                    </div>
                                </div>

                                <div
                                    class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-gray-500">
                                    <p class="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Matrícula</p>
                                    <p class="text-gray-900 dark:text-white font-semibold">{{ props.building?.matricula
                                        || 'Não informado' }}</p>
                                </div>

                                <div
                                    class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-gray-500">
                                    <p class="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">CNPJ</p>
                                    <p class="text-gray-900 dark:text-white font-semibold">{{
                                        props.building?.cnpj_empesa || 'Não informado' }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Card Tabela de Preços -->
                        <div class="bg-amber-50 dark:bg-gray-700 rounded-xl p-4 md:p-6 border border-amber-200 dark:border-gray-600"
                            v-if="props.building.tabela">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-tags text-white"></i>
                                </div>
                                <h3 class="text-xl font-bold text-amber-900 dark:text-white">Tabela de Preços</h3>
                            </div>

                            <div class="space-y-3">
                                <div
                                    class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-amber-200 dark:border-gray-500">
                                    <p class="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Nome</p>
                                    <p class="text-gray-900 dark:text-white font-semibold">{{ props.building.tabela.nome
                                        }}</p>
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div
                                        class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-amber-200 dark:border-gray-500">
                                        <p class="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Vigência
                                        </p>
                                        <p class="text-amber-700 dark:text-amber-300 font-semibold text-sm">{{
                                            props.building.tabela.data_vigencia_de }}</p>
                                        <p class="text-amber-700 dark:text-amber-300 font-semibold text-sm">até {{
                                            props.building.tabela.data_vigencia_ate }}</p>
                                    </div>

                                    <div
                                        class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-amber-200 dark:border-gray-500">
                                        <p class="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Status</p>
                                        <span
                                            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                            :class="props.building.tabela.aprovado === 'S' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'">
                                            {{ props.building.tabela.aprovado === 'S' ? 'Aprovada' : 'Pendente' }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Coluna 2 - Localização e Entrega -->
                    <div class="space-y-6">
                        <!-- Card Localização -->
                        <div
                            class="bg-green-50 dark:bg-gray-700 rounded-xl p-4 md:p-6 border border-green-200 dark:border-gray-600">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-map-marker-alt text-white"></i>
                                </div>
                                <h3 class="text-xl font-bold text-green-900 dark:text-white">Localização</h3>
                            </div>

                            <div class="space-y-2 text-gray-700 dark:text-gray-300">
                                <p class="flex items-start gap-2">
                                    <i class="fas fa-road text-green-600 mt-0.5 text-sm"></i>
                                    <span>{{ props.building?.endereco_emp || 'Não informado' }}{{ props.building?.numero ? ', ' + props.building.numero : '' }}</span>
                                </p>
                                <p class="flex items-center gap-2" v-if="props.building?.bairro">
                                    <i class="fas fa-location-dot text-green-600 text-sm"></i>
                                    <span>{{ props.building.bairro }}</span>
                                </p>
                                <p class="flex items-center gap-2">
                                    <i class="fas fa-city text-green-600 text-sm"></i>
                                    <span>{{ props.building?.cidade || 'Não informado' }}{{ props.building?.estado ? ' - ' + props.building.estado : '' }}</span>
                                </p>
                                <p class="flex items-center gap-2" v-if="props.building?.cep">
                                    <i class="fas fa-mail-bulk text-green-600 text-sm"></i>
                                    <span>{{ props.building.cep }}</span>
                                </p>
                                <p class="flex items-center gap-2" v-if="props.building?.regiao">
                                    <i class="fas fa-globe-americas text-green-600 text-sm"></i>
                                    <span>{{ props.building.regiao }}</span>
                                </p>
                            </div>
                        </div>

                        <!-- Card Data de Entrega -->
                        <div
                            class="bg-orange-50 dark:bg-gray-700 rounded-xl p-4 md:p-6 border border-orange-200 dark:border-gray-600">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-calendar-check text-white"></i>
                                </div>
                                <h3 class="text-xl font-bold text-orange-900 dark:text-white">Cronograma</h3>
                            </div>

                            <div class="space-y-3">
                                <div
                                    class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-orange-200 dark:border-gray-500">
                                    <p class="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Previsão de
                                        Entrega</p>
                                    <p class="text-2xl font-bold text-orange-700 dark:text-orange-300">{{
                                        formatDate(props.building.data_entrega) }}</p>
                                </div>

                                <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-orange-200 dark:border-gray-500"
                                    v-if="props.building.periodo_venda_inicio">
                                    <p class="text-gray-600 dark:text-gray-300 text-sm font-medium mb-1">Início das
                                        Vendas</p>
                                    <p class="text-orange-700 dark:text-orange-300 font-semibold">{{
                                        formatDate(props.building.periodo_venda_inicio) }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Card Etapas -->
                        <div class="bg-purple-50 dark:bg-gray-700 rounded-xl p-4 md:p-6 border border-purple-200 dark:border-gray-600"
                            v-if="props.building.etapas && props.building.etapas.length > 0">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-layer-group text-white"></i>
                                </div>
                                <h3 class="text-xl font-bold text-purple-900 dark:text-white">Etapas</h3>
                            </div>

                            <div class="space-y-3">
                                <div v-for="etapa in props.building.etapas" :key="etapa.idetapa"
                                    class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-gray-500">
                                    <div class="flex justify-between items-center mb-2">
                                        <h4 class="font-semibold text-gray-900 dark:text-white">{{ etapa.nome }}</h4>
                                        <span class="text-sm text-purple-700 dark:text-purple-300">{{
                                            etapa.blocos?.length || 0 }} blocos</span>
                                    </div>
                                    <div class="text-sm text-gray-600 dark:text-gray-300" v-if="etapa.blocos">
                                        <p>Total de unidades: {{etapa.blocos.reduce((total, bloco) => total +
                                            (bloco.paginacao_unidade?.total || 0), 0)}}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Card Materiais de Campanha -->
                        <div class="bg-rose-50 dark:bg-gray-700 rounded-xl p-4 md:p-6 border border-rose-200 dark:border-gray-600"
                            v-if="props.building.materiais_campanha && props.building.materiais_campanha.length > 0">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-images text-white"></i>
                                </div>
                                <h3 class="text-xl font-bold text-rose-900 dark:text-white">Materiais de Campanha</h3>
                            </div>

                            <div class="space-y-3 max-h-60 overflow-y-auto">
                                <div v-for="material in props.building.materiais_campanha" :key="material.idarquivo"
                                    class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-rose-200 dark:border-gray-500">
                                    <div class="flex items-center justify-between">
                                        <div class="flex-1 min-w-0">
                                            <h4 class="font-medium text-gray-900 dark:text-white text-sm truncate">{{
                                                material.nome }}</h4>
                                            <div class="flex items-center gap-3 mt-1">
                                                <span class="text-xs text-gray-500 dark:text-gray-400">{{ material.tipo
                                                    }}</span>
                                                <span class="text-xs text-rose-600 dark:text-rose-400"
                                                    v-if="material.tamanho > 0">
                                                    {{ (material.tamanho / 1024 / 1024).toFixed(2) }} MB
                                                </span>
                                            </div>
                                        </div>
                                        <a v-if="material.tipo === 'youtube'" :href="material.servidor" target="_blank"
                                            class="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 ml-2">
                                            <i class="fab fa-youtube text-lg"></i>
                                        </a>
                                        <a v-else :href="`${material.arquivo}`" target="_blank"
                                            class="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 ml-2"
                                            @click.stop>
                                            <i class="fas fa-external-link-alt"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Coluna 3 - Mapa e Links -->
                    <div class="space-y-6">
                        <!-- Card Mapa -->
                        <div class="bg-slate-50 dark:bg-gray-700 rounded-xl p-4 md:p-6 border border-slate-200 dark:border-gray-600"
                            v-if="props.building.latitude && props.building.longitude">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-map text-white"></i>
                                </div>
                                <h3 class="text-xl font-bold text-slate-900 dark:text-white">Mapa</h3>
                            </div>

                            <div
                                class="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-slate-200 dark:border-gray-600">
                                <iframe
                                    :src="`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1579.2792625838822!2d${props.building.longitude}!3d${props.building.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1spt-BR!2sbr!4v1738328467636!5m2!1spt-BR!2sbr`"
                                    allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
                                    class="w-full h-64"></iframe>
                            </div>

                            <div class="mt-4 flex justify-center">
                                <a :href="`https://www.google.com/maps?q=${props.building.latitude},${props.building.longitude}`"
                                    target="_blank"
                                    class="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors">
                                    <i class="fas fa-map-location-dot"></i>
                                    Abrir no Google Maps
                                    <i class="fas fa-external-link-alt text-sm"></i>
                                </a>
                            </div>
                        </div>

                        <!-- Card Plantas Mapeadas -->
                        <div class="bg-teal-50 dark:bg-gray-700 rounded-xl p-4 md:p-6 border border-teal-200 dark:border-gray-600"
                            v-if="props.building.plantas_mapeadas && props.building.plantas_mapeadas.length > 0">
                            <div class="flex items-center gap-3 mb-4">
                                <div class="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-drafting-compass text-white"></i>
                                </div>
                                <h3 class="text-xl font-bold text-teal-900 dark:text-white">Plantas Mapeadas</h3>
                            </div>

                            <div class="space-y-3">
                                <div v-for="planta in props.building.plantas_mapeadas" :key="planta.idplanta_mapeada"
                                    class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-teal-200 dark:border-gray-500">
                                    <div class="flex justify-between items-center">
                                        <h4 class="font-semibold text-gray-900 dark:text-white">{{ planta.nome }}</h4>
                                        <a :href="planta.link" target="_blank"
                                            class="text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300">
                                            <i class="fas fa-external-link-alt"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Link CV CRM -->
                        <div class="flex justify-center">
                            <a :href="`https://menin.cvcrm.com.br/gestor/cadastros/empreendimentos/${props.building.idempreendimento}/cadastro_simplificado`"
                                target="_blank" v-tippy="'Abrir no CV CRM'"
                                class="inline-flex items-center gap-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200">
                                <img src="/CVLogo.png" alt="CV CRM" class="h-8 w-8 drop-shadow">
                                <span class="font-semibold text-gray-700 dark:text-gray-200">Abrir no CV CRM</span>
                                <i class="fas fa-external-link-alt text-gray-400 text-sm"></i>
                            </a>
                        </div>

                    </div>
                </div>

                <!-- Seção de Disponibilidade -->
                <div class="mt-8" v-if="props.building.etapas && props.building.etapas.length > 0">
                    <div
                        class="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
                        <!-- Header clicável -->
                        <div @click="toggleAvailability"
                            class="flex items-center justify-between p-2 md:p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <i class="fas fa-building text-white"></i>
                                </div>
                                <h2 class="text-sm md:text-2xl font-bold text-gray-900 dark:text-white">Disponibilidade
                                </h2>
                            </div>

                            <div class="flex items-center gap-4">
                                <div class="text-right"> 
                                    <p class=" text-sm md:text-lg font-bold text-blue-600 dark:text-blue-400">{{ getTotalUnits() }}
                                        unidades</p>
                                </div>
                                <i class="fas fa-chevron-down text-gray-400 transform transition-transform duration-300"
                                    :class="{ 'rotate-180': isAvailabilityOpen }"></i>
                            </div>
                        </div>

                        <!-- Conteúdo expansível -->
                        <transition name="slide-down">
                            <div v-if="isAvailabilityOpen" class="border-t dark:border-gray-600">
                                <div class="p-4 md:p-6 space-y-6">
                                    <div v-for="etapa in props.building.etapas" :key="etapa.idetapa"
                                        class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 md:p-6">
                                        <div class="flex items-center justify-between mb-4">
                                            <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ etapa.nome }}
                                            </h3>
                                            <span
                                                class="text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                                                {{ etapa.blocos?.length || 0 }} blocos
                                            </span>
                                        </div>

                                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" v-if="etapa.blocos">
                                            <div v-for="bloco in etapa.blocos" :key="bloco.idbloco"
                                                class="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                                <!-- Header do Bloco -->
                                                <div class="p-2 md:p-4 border-b border-gray-200 dark:border-gray-600">
                                                    <div class="flex items-center justify-between">
                                                        <h4 class="font-bold text-lg text-gray-900 dark:text-white">{{
                                                            bloco.nome }}</h4>
                                                        <span
                                                            class="text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                                                            {{ bloco.paginacao_unidade?.total || 0 }} unidades
                                                        </span>
                                                    </div>
                                                </div>

                                                <!-- Lista de Unidades -->
                                                <div class="p-2 md:p-4">
                                                    <div class="max-h-80 overflow-y-auto space-y-2"
                                                        v-if="bloco.unidades && bloco.unidades.length > 0">
                                                        <div v-for="unidade in bloco.unidades" :key="unidade.idunidade"
                                                            class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 hover:shadow-sm transition-shadow">
                                                            <div class="flex justify-between items-start">
                                                                <div class="flex-1">
                                                                    <h5
                                                                        class="font-semibold text-gray-900 dark:text-white">
                                                                        {{ unidade.nome }}</h5>
                                                                    <div class="flex flex-wrap items-center gap-4 mt-1">
                                                                        <span
                                                                            class="text-sm text-gray-600 dark:text-gray-400"
                                                                            v-if="unidade.area_privativa">
                                                                            <i
                                                                                class="fas fa-ruler-combined text-xs mr-1"></i>
                                                                            {{
                                                                                parseFloat(unidade.area_privativa).toFixed(2)
                                                                            }}m² privativa
                                                                        </span>
                                                                        <span
                                                                            class="text-xs text-gray-500 dark:text-gray-400"
                                                                            v-if="unidade.idunidade_int">
                                                                            ID: {{ unidade.idunidade_int }}
                                                                        </span>
                                                                    </div>
                                                                    <div class="flex items-center gap-4 mt-2"
                                                                        v-if="unidade.valor || unidade.vagas_garagem">
                                                                        <span
                                                                            class="text-sm font-semibold text-blue-600 dark:text-blue-400"
                                                                            v-if="unidade.valor">
                                                                            <i
                                                                                class="fas fa-dollar-sign text-xs mr-1"></i>
                                                                            R$ {{
                                                                                parseFloat(unidade.valor).toLocaleString('pt-BR',
                                                                                    { minimumFractionDigits: 2 }) }}
                                                                        </span>
                                                                        <span
                                                                            class="text-sm text-gray-600 dark:text-gray-400"
                                                                            v-if="unidade.vagas_garagem">
                                                                            <i class="fas fa-car text-xs mr-1"></i>
                                                                            {{ unidade.vagas_garagem }} vaga(s)
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <!-- Status da Unidade -->
                                                                <div class="ml-3 flex-shrink-0">
                                                                    <span
                                                                        class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                                                        :class="getUnitStatus(unidade).class">
                                                                        {{ getUnitStatus(unidade).text }}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div v-else class="text-center py-4">
                                                        <p class="text-gray-500 dark:text-gray-400">Nenhuma unidade
                                                            encontrada</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </transition>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
    transition: all 0.3s ease-in-out;
    overflow: hidden;
}

.slide-down-enter-from,
.slide-down-leave-to {
    opacity: 0;
    max-height: 0;
}

.slide-down-enter-to,
.slide-down-leave-from {
    opacity: 1;
    max-height: 2000px;
}
</style>