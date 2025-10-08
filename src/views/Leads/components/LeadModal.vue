<template>
    <Transition name="modal">
        <div v-if="visivel" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            @click="$emit('fechar')">
            <div class="bg-gray-200 dark:bg-gray-700 rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl"
                @click.stop>
                <!-- Cabeçalho -->
                <div class="flex justify-between items-center p-5 border-b border-gray-300 dark:border-gray-600">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-chart-line text-2xl text-blue-500"></i>
                        <div>
                            <h3 class="text-2xl font-bold">Relatório Detalhado de Leads</h3>
                            <p class="text-sm text-gray-500">{{ leads.length }} leads neste relatório</p>
                        </div>
                    </div>
                    <button @click="$emit('fechar')"
                        class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-2">
                        <i class="fas fa-xmark text-2xl"></i>
                    </button>
                </div>

                <!-- Filtros rápidos -->
                <div class="p-4 border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
                    <div class="flex flex-wrap gap-2">
                        <button v-for="(status, idx) in statusOptions" :key="idx"
                            @click="filtroStatus = filtroStatus === status ? null : status" :class="[
                                'px-3 py-1 rounded-lg text-sm transition-all',
                                filtroStatus === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                            ]">
                            {{ status }}
                        </button>
                        <button v-if="filtroStatus" @click="filtroStatus = null"
                            class="px-3 py-1 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600 transition-colors">
                            <i class="fas fa-times mr-1"></i> Limpar
                        </button>
                    </div>
                </div>

                <!-- Conteúdo scrollable -->
                <div class="flex-1 overflow-y-auto p-5 space-y-3">
                    <div v-for="l in leadsFilterados" :key="l.idlead"
                        class="bg-gray-100 dark:bg-gray-600 rounded-lg p-4 hover:shadow-lg transition-shadow">
                        <!-- Cabeçalho do lead -->
                        <div class="flex justify-between items-start mb-3">
                            <div class="flex-1">
                                <h4 class="text-xl font-bold mb-1">{{ l.nome }}</h4>
                                <span :class="[
                                    'inline-block px-3 py-1 rounded-full text-xs font-medium',
                                    getStatusColor(l.situacao_nome)
                                ]">
                                    {{ l.situacao_nome || 'Sem situação' }}
                                </span>
                            </div>
                            <div class="text-right">
                                <span class="text-sm text-gray-500">
                                    {{ formatDateHour(l.data_cad) }}
                                </span>
                                <div class="flex gap-2 mt-2">
                                    <a :href="`https://menin.cvcrm.com.br/gestor/comercial/leads/${l.idlead}/administrar?lido=true`"
                                        target="_blank" class="hover:opacity-70 transition-opacity"
                                        v-tippy="'Abrir no CV CRM'">
                                        <img src="/CVLogo.png" alt="CV CRM" class="h-6" />
                                    </a>
                                    <a v-if="l.link_rdstation" :href="l.link_rdstation" target="_blank"
                                        class="hover:opacity-70 transition-opacity" v-tippy="'Abrir no RD Station'">
                                        <img src="/RDLogo.png" alt="RD Station" class="h-6" />
                                    </a>
                                </div>
                            </div>
                        </div>

                        <!-- Grid de informações -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div class="bg-gray-200 dark:bg-gray-700 rounded p-3">
                                <div class="flex items-center gap-2 mb-2">
                                    <i class="fas fa-user text-orange-500"></i>
                                    <span class="font-semibold">Corretor</span>
                                </div>
                                <span>{{ l.corretor?.nome || 'Não informado' }}</span>
                            </div>

                            <div class="bg-gray-200 dark:bg-gray-700 rounded p-3">
                                <div class="flex items-center gap-2 mb-2">
                                    <i class="fas fa-bullhorn text-pink-500"></i>
                                    <span class="font-semibold">Mídia Principal</span>
                                </div>
                                <span>{{ l.midia_principal || 'Não informado' }}</span>
                            </div>

                            <div class="bg-gray-200 dark:bg-gray-700 rounded p-3 md:col-span-2">
                                <div class="flex items-center gap-2 mb-2">
                                    <i class="fas fa-city text-indigo-500"></i>
                                    <span class="font-semibold">Empreendimentos</span>
                                </div>
                                <div v-if="Array.isArray(l.empreendimento) && l.empreendimento.length"
                                    class="flex flex-wrap gap-2">
                                    <span v-for="(emp, idx) in l.empreendimento" :key="idx"
                                        class="bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded text-xs">
                                        {{ emp?.nome }}
                                    </span>
                                </div>
                                <span v-else class="text-gray-500">Nenhum empreendimento</span>
                            </div>
                        </div>
                    </div>

                    <!-- Mensagem vazia -->
                    <div v-if="!leadsFilterados.length" class="text-center py-12">
                        <i class="fas fa-inbox text-6xl text-gray-400 mb-4"></i>
                        <p class="text-gray-400 text-lg">Nenhum lead encontrado com os filtros aplicados</p>
                    </div>
                </div>

                <!-- Rodapé com estatísticas -->
                <div class="p-4 border-t border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
                    <div class="flex justify-between items-center text-sm">
                        <div class="flex gap-6">
                            <span>
                                <i class="fas fa-filter mr-1 text-blue-500"></i>
                                Exibindo: <strong>{{ leadsFilterados.length }}</strong> de <strong>{{ leads.length
                                    }}</strong>
                            </span>
                            <span v-if="periodo">
                                <i class="fas fa-calendar mr-1 text-green-500"></i>
                                {{ obterIntervaloDeDatas() }}
                            </span>
                        </div>
                        <button @click="$emit('fechar')"
                            class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup>
import { computed, ref } from 'vue';
import { formatDateHour } from '@/utils/Leads/formatters';

const props = defineProps({
    leads: { type: Array, required: true },
    visivel: { type: Boolean, required: true }
});

defineEmits(['fechar']);

const filtroStatus = ref(null);

const statusOptions = computed(() => {
    const statuses = new Set(props.leads.map(l => l.situacao_nome).filter(Boolean));
    return Array.from(statuses).sort();
});

const leadsFilterados = computed(() => {
    if (!filtroStatus.value) return props.leads;
    return props.leads.filter(l => l.situacao_nome === filtroStatus.value);
});

const periodo = computed(() => {
    if (!props.leads.length) return null;
    const datas = props.leads.map(l => new Date(l.data_cad)).sort((a, b) => a - b);
    return { inicio: datas[0], fim: datas[datas.length - 1] };
});

function getStatusColor(status) {
    const colorMap = {
        'Aguardando Atendimento Corretor': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        'Em Atendimento': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'Lead Qualificado': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'Descartado': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        'Em Análise de Crédito': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        'Com Reserva': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        'Venda Realizada': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
}

function obterIntervaloDeDatas() {
    if (!periodo.value) return '';
    const { inicio, fim } = periodo.value;
    const formatDate = (d) => d.toLocaleDateString('pt-BR');

    if (inicio.toDateString() === fim.toDateString()) {
        return formatDate(inicio);
    }
    return `${formatDate(inicio)} - ${formatDate(fim)}`;
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .bg-gray-200,
.modal-leave-active .bg-gray-200 {
    transition: transform 0.3s ease;
}

.modal-enter-from .bg-gray-200 {
    transform: scale(0.9);
}

.modal-leave-to .bg-gray-200 {
    transform: scale(0.9);
}
</style>