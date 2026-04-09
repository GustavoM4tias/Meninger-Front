<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import {
    usePaymentFlowStore,
    PIPELINE_STAGE_LABELS,
} from '@/stores/Tools/PaymentFlow/paymentFlowStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import CreateLaunchModal from './components/CreateLaunchModal.vue';
import LaunchPipelineCard from './components/LaunchPipelineCard.vue';
import SiengeCredentialsModal from './components/SiengeCredentialsModal.vue';
import RidRequestModal from './components/RidRequestModal.vue';
import UpdateBoletoModal from './components/UpdateBoletoModal.vue';
import Favorite from '@/components/config/Favorite.vue'

const store = usePaymentFlowStore();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.hasRole('admin'));

// ── Gate de credenciais Sienge ─────────────────────────────────────────────────
const showCredentialsModal = ref(false);

onMounted(async () => {
    store.fetchLaunches();
    store.fetchSummary();
    store.fetchLaunchTypes();
    await store.checkSiengeCredentials();
    if (store.siengeCredentialsOk === false) showCredentialsModal.value = true;
});

function onCredentialsSaved() {
    store.siengeCredentialsOk = true;
    showCredentialsModal.value = false;
}

// Para todo polling ao sair da página
onUnmounted(() => {
    store.stopAllPolling();
});

// ── Filtros ───────────────────────────────────────────────────────────────────
const searchInput = ref('');
const filterStatus = ref('');
const filterType = ref('');

function applySearch() {
    store.applyFilters({ search: searchInput.value });
}

function applyStatusFilter(s) {
    filterStatus.value = filterStatus.value === s ? '' : s;
    store.applyFilters({ status: filterStatus.value });
}
function applyTypeFilter(t) {
    filterType.value = filterType.value === t ? '' : t;
    store.applyFilters({ launchType: filterType.value });
}
function clearAllFilters() {
    searchInput.value = filterStatus.value = filterType.value = '';
    store.resetFilters();
}

// ── Detail: card de pipeline expandido por linha ──────────────────────────────
const expandedId = ref(null);
function toggleExpand(id) {
    expandedId.value = expandedId.value === id ? null : id;
}

// ── Ações de transição ────────────────────────────────────────────────────────
const confirmingAction = ref(null); // { id, action, label }
const actionReason = ref('');

function askAction(launch, action, label) {
    confirmingAction.value = { id: launch.id, action, label };
    actionReason.value = '';
}
function cancelAction() {
    confirmingAction.value = null;
    actionReason.value = '';
}
async function executeAction() {
    const { id, action } = confirmingAction.value;
    try {
        if (action === 'cancel') await store.cancelLaunch(id);
        else if (action === 'mark-paid') await store.markPaid(id);
    } finally {
        cancelAction();
    }
}

// Ações disponíveis por status
// Cancelamento disponível em qualquer etapa ativa
const CANCEL = { action: 'cancel', label: 'Cancelar', icon: 'fa-ban', color: 'slate' };
const ACTIONS = {
    fornecedor: [CANCEL],
    contrato: [CANCEL],
    aditivo: [CANCEL],
    medicao: [CANCEL],
    titulo: [CANCEL],
    erro: [CANCEL],
};

// ── Helpers visuais ───────────────────────────────────────────────────────────
function statusBadgeClass(status) {
    const map = {
        fornecedor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        contrato: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
        aditivo: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        medicao: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
        titulo: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
        titulo_pago: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        cancelado: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
        erro: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    };
    return map[status] || map.fornecedor;
}

const STATUS_LABELS = {
    fornecedor: 'Fornecedor',
    contrato: 'Contrato',
    aditivo: 'Aditivo',
    medicao: 'Medição',
    titulo: 'Título',
    titulo_pago: 'Título Pago',
    cancelado: 'Cancelado',
    erro: 'Erro',
};

function pipelineDotClass(stage) {
    const c = PIPELINE_STAGE_LABELS[stage]?.color || 'gray';
    return {
        gray: 'bg-gray-300',
        blue: 'bg-blue-400 animate-pulse',
        green: 'bg-green-400',
        emerald: 'bg-emerald-400',
        red: 'bg-red-400',
        orange: 'bg-orange-400',
    }[c] || 'bg-gray-300';
}

function formatCurrency(val) {
    if (val == null) return '—';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(val) {
    if (!val) return '—';
    const [y, m, d] = String(val).slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
}

// ── Sidebar summary ───────────────────────────────────────────────────────────
const summaryItems = [
    { key: 'fornecedor', label: 'Fornecedor', dot: 'bg-blue-400' },
    { key: 'contrato', label: 'Contrato', dot: 'bg-indigo-400' },
    { key: 'aditivo', label: 'Aditivo', dot: 'bg-purple-400' },
    { key: 'medicao', label: 'Medição', dot: 'bg-cyan-400' },
    { key: 'titulo', label: 'Título', dot: 'bg-yellow-400' },
];

// Itens especiais ficam nos toggles (cancelado/erro/titulo_pago)
const totalActiveAmount = computed(() =>
    ['fornecedor', 'contrato', 'aditivo', 'medicao', 'titulo'].reduce(
        (acc, k) => acc + (store.summary[k]?.totalAmount || 0), 0
    )
);

async function handleContinueExistingContract(launchId) {
    try {
        await store.continueExistingContract(launchId);
        await store.fetchLaunches();
    } catch (error) {
        console.error(error);
    }
}

async function handleAbort(launchId) {
    try {
        await store.abortPipeline(launchId);
    } catch (error) {
        console.error(error);
    }
}

// ── UpdateBoleto modal ─────────────────────────────────────────────────────────
const showUpdateBoletoModal = ref(false);
const updateBoletoLaunch = ref(null);

function handleUpdateBoleto(launch) {
    updateBoletoLaunch.value = launch;
    showUpdateBoletoModal.value = true;
}

async function onBoletoUpdated() {
    await store.fetchLaunches(true);
}
</script>

<template>
    <div class="h-auto min-h-full overflow-x-hidden relative">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">

                <!-- ── Sidebar ─────────────────────────────────────────────── -->
                <aside class="lg:col-span-1 order-2 lg:order-1">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Resumo</h3>

                    <div
                        class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-5 sticky top-8 space-y-4">

                        <!-- Etapas do processo -->
                        <div class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                            Etapas</div>

                        <div v-for="item in summaryItems" :key="item.key"
                            class="flex items-center justify-between p-3 rounded-lg cursor-pointer transition" :class="filterStatus === item.key
                                ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'" @click="applyStatusFilter(item.key)">
                            <div class="flex items-center gap-2">
                                <span class="inline-block w-2 h-2 rounded-full flex-shrink-0" :class="item.dot"></span>
                                <span class="text-sm text-gray-600 dark:text-gray-400">{{ item.label }}</span>
                            </div>
                            <div class="text-right">
                                <div class="font-bold text-sm text-gray-900 dark:text-white">
                                    {{ store.summary[item.key]?.count || 0 }}
                                </div>
                                <div v-if="store.summary[item.key]?.totalAmount" class="text-xs text-gray-400">
                                    {{ formatCurrency(store.summary[item.key]?.totalAmount) }}
                                </div>
                            </div>
                        </div>

                        <!-- Totalizador -->
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
                            <div class="text-xs text-gray-500 mb-1">Em andamento</div>
                            <div class="text-base font-bold text-blue-600 dark:text-blue-400">
                                {{ formatCurrency(totalActiveAmount) }}
                            </div>
                        </div>

                        <!-- Especiais: Título Pago, Cancelados, Erros -->
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                            <div
                                class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                                Especiais</div>

                            <!-- Título Pago -->
                            <div class="flex items-center justify-between p-3 rounded-lg cursor-pointer transition"
                                :class="filterStatus === 'titulo_pago'
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700'
                                    : store.showTituloPago
                                        ? 'bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 opacity-60'"
                                @click="applyStatusFilter('titulo_pago'); if (!store.showTituloPago) store.toggleShowTituloPago()">
                                <div class="flex items-center gap-2">
                                    <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
                                    <span class="text-sm text-gray-600 dark:text-gray-400">Título Pago</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span v-if="store.showTituloPago"
                                        class="font-bold text-sm text-gray-900 dark:text-white">
                                        {{ store.summary['titulo_pago']?.count || 0 }}
                                    </span>
                                    <button class="text-xs px-1.5 py-0.5 rounded border transition" :class="store.showTituloPago
                                        ? 'border-emerald-400 text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-400'"
                                        @click.stop="store.toggleShowTituloPago(); if (store.showTituloPago && filterStatus === 'titulo_pago') filterStatus = ''">
                                        {{ store.showTituloPago ? 'Ocultar' : 'Exibir' }}
                                    </button>
                                </div>
                            </div>

                            <!-- Cancelados -->
                            <div class="flex items-center justify-between p-3 rounded-lg cursor-pointer transition"
                                :class="filterStatus === 'cancelado'
                                    ? 'bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600'
                                    : store.showCancelled
                                        ? 'bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-700/40'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 opacity-60'"
                                @click="applyStatusFilter('cancelado'); if (!store.showCancelled) store.toggleShowCancelled()">
                                <div class="flex items-center gap-2">
                                    <span class="inline-block w-2 h-2 rounded-full bg-slate-400 flex-shrink-0"></span>
                                    <span class="text-sm text-gray-600 dark:text-gray-400">Cancelados</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span v-if="store.showCancelled"
                                        class="font-bold text-sm text-gray-900 dark:text-white">
                                        {{ store.summary['cancelado']?.count || 0 }}
                                    </span>
                                    <button class="text-xs px-1.5 py-0.5 rounded border transition" :class="store.showCancelled
                                        ? 'border-slate-400 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-400'"
                                        @click.stop="store.toggleShowCancelled(); if (store.showCancelled && filterStatus === 'cancelado') filterStatus = ''">
                                        {{ store.showCancelled ? 'Ocultar' : 'Exibir' }}
                                    </button>
                                </div>
                            </div>

                            <!-- Erros -->
                            <div class="flex items-center justify-between p-3 rounded-lg cursor-pointer transition"
                                :class="filterStatus === 'erro'
                                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                                    : store.showErrors
                                        ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-800 opacity-60'"
                                @click="applyStatusFilter('erro'); if (!store.showErrors) store.toggleShowErrors()">
                                <div class="flex items-center gap-2">
                                    <span class="inline-block w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></span>
                                    <span class="text-sm text-gray-600 dark:text-gray-400">Erros</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span v-if="store.showErrors"
                                        class="font-bold text-sm text-gray-900 dark:text-white">
                                        {{ store.summary['erro']?.count || 0 }}
                                    </span>
                                    <button class="text-xs px-1.5 py-0.5 rounded border transition" :class="store.showErrors
                                        ? 'border-red-400 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-400'"
                                        @click.stop="store.toggleShowErrors(); if (store.showErrors && filterStatus === 'erro') filterStatus = ''">
                                        {{ store.showErrors ? 'Ocultar' : 'Exibir' }}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Filtro por tipo -->
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <div
                                class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                Tipo</div>
                            <div class="flex flex-wrap gap-1.5">
                                <button v-for="t in store.launchTypes" :key="t.id"
                                    class="text-xs px-2.5 py-1 rounded-full border transition truncate"
                                    :class="filterType === t.name
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400'" @click="applyTypeFilter(t.name)">
                                    {{ t.name }}
                                </button>
                            </div>
                        </div>

                        <!-- Pipeline em andamento -->
                        <div v-if="Object.keys(store.pipelinePolling).length"
                            class="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <div
                                class="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-1">
                                <i class="fas fa-sync fa-spin text-xs"></i>
                                {{ Object.keys(store.pipelinePolling).length }} monitorando
                            </div>
                            <button class="text-xs text-gray-400 hover:text-red-500 transition"
                                @click="store.stopAllPolling()">
                                Parar todos
                            </button>
                        </div>
                    </div>
                </aside>

                <!-- ── Main ───────────────────────────────────────────────── -->
                <main class="lg:col-span-3 order-1 lg:order-2">

                    <!-- Header -->
                    <div class="flex items-center justify-between mb-2">
                        <div>
                            <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Fluxo de pagamento
                                <Favorite :router="'/tools/paymentflow'" :section="'Fluxo de Pagamento'" />
                            </h1>
                            <p class="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                                Gerenciamento de lançamentos para pagamento
                            </p>
                        </div>
                        <button
                            class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                            @click="store.openCreateModal">
                            <i class="fas fa-plus"></i> Novo Lançamento
                        </button>
                    </div>

                    <!-- Barra de busca -->
                    <div
                        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
                        <div class="flex-1 min-w-48 relative">
                            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input v-model="searchInput" type="text"
                                :placeholder="isAdmin ? 'Buscar por fornecedor, empresa, documento, criador…' : 'Buscar por fornecedor, empresa, documento…'"
                                class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white outline-none focus:border-blue-500 transition"
                                @keydown.enter="applySearch" />
                        </div>

                        <!-- Filtro de período -->
                        <div class="flex items-center gap-2">
                            <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">De</span>
                            <input type="date" :value="store.filters.dateFrom"
                                @change="store.applyFilters({ dateFrom: $event.target.value })"
                                class="text-xs rounded-lg border py-2.5 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-2 outline-none focus:border-blue-500 transition" />
                            <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Até</span>
                            <input type="date" :value="store.filters.dateTo"
                                @change="store.applyFilters({ dateTo: $event.target.value })"
                                class="text-xs rounded-lg border py-2.5 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white px-2 outline-none focus:border-blue-500 transition" />
                        </div>

                        <!-- Botão Pesquisar -->
                        <button
                            class="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition"
                            @click="applySearch">
                            <i class="fas fa-search text-xs"></i> Pesquisar
                        </button>

                        <!-- Indicador de live refresh -->
                        <div v-if="store.liveRefreshId || store.hasActivePipelines"
                            class="flex items-center gap-1.5 text-xs text-blue-500 dark:text-blue-400">
                            <i class="fas fa-sync fa-spin text-xs"></i>
                        </div>

                        <button v-if="filterStatus || filterType || searchInput || store.hasNonDefaultFilters"
                            class="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition"
                            @click="clearAllFilters">
                            <i class="fas fa-xmark"></i> Limpar
                        </button>
                    </div>

                    <!-- Lista de lançamentos -->
                    <div
                        class="bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden">

                        <!-- Empty state -->
                        <div v-if="!store.hasLaunches" class="text-center py-16 px-6">
                            <div
                                class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <i class="fas fa-file-invoice-dollar text-2xl text-gray-400"></i>
                            </div>
                            <h3 class="font-semibold text-gray-700 dark:text-gray-300 mb-1">Nenhum lançamento</h3>
                            <p class="text-sm text-gray-400">
                                {{ filterStatus || filterType || searchInput
                                    ? 'Tente ajustar os filtros.'
                                    : 'Clique em "Novo Lançamento" para começar.' }}
                            </p>
                        </div>

                        <div v-else>
                            <!-- Cabeçalho (desktop) -->
                            <div
                                class="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                                <div class="col-span-2">Tipo</div>
                                <div class="col-span-3">Fornecedor</div>
                                <div class="col-span-2">Empreendimento</div>
                                <div class="col-span-1">Documento</div>
                                <div class="col-span-2 text-center">Valor</div>
                                <div class="col-span-1 text-center">Status</div>
                                <div class="col-span-1"></div>
                            </div>

                            <!-- Cada lançamento -->
                            <div v-for="launch in store.launches" :key="launch.id">

                                <!-- Linha principal -->
                                <div class="grid grid-cols-12 gap-2 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition items-center cursor-pointer"
                                    :class="expandedId === launch.id ? 'bg-gray-50 dark:bg-gray-800/40' : ''"
                                    @click="toggleExpand(launch.id)">

                                    <!-- Tipo -->
                                    <div class="col-span-12 md:col-span-2 flex justify-center">
                                        <span
                                            class="text-xs font-medium text-center w- px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                            {{ launch.launchType }}
                                        </span>
                                    </div>

                                    <!-- Fornecedor -->
                                    <div class="col-span-12 md:col-span-3">
                                        <div class="font-medium text-sm text-gray-900 dark:text-white truncate">
                                            {{ launch.providerName || '—' }}
                                        </div>
                                        <div class="text-xs text-gray-400 font-mono">
                                            {{ launch.providerCnpj
                                                ? launch.providerCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                                                    '$1.$2.$3/$4-$5')
                                                : '' }}
                                        </div>
                                        <!-- Badge do criador (apenas admin) -->
                                        <div v-if="isAdmin && launch.createdByName"
                                            class="mt-0.5 inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                            <i class="fas fa-user text-xs opacity-60"></i>
                                            {{ launch.createdByName }}
                                        </div>
                                    </div>

                                    <!-- Empreendimento -->
                                    <div
                                        class="col-span-12 md:col-span-2 text-sm text-gray-600 dark:text-gray-400 truncate">
                                        {{ launch.enterpriseName || launch.companyName || '—' }}
                                    </div>

                                    <!-- Documento -->
                                    <div class="col-span-12 md:col-span-1">
                                        <div
                                            class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 flex-wrap justify-center">
                                            <a v-if="launch.nfUrl" :href="launch.nfUrl" target="_blank"
                                                class="inline-flex items-center gap-1 text-red-400 hover:text-red-600 transition"
                                                @click.stop>
                                                <i class="fas fa-file-invoice text-xs"></i>
                                                {{ launch.nfType || 'NF' }}
                                            </a>
                                            <a v-if="launch.boletoUrl" :href="launch.boletoUrl" target="_blank"
                                                class="inline-flex items-center gap-1 text-blue-400 hover:text-blue-600 transition ml-1"
                                                @click.stop>
                                                <i class="fas fa-barcode text-xs"></i> Boleto
                                            </a>
                                        </div>
                                        <!-- <div class="text-xs text-gray-400">{{ formatDate(launch.documentDate) }}</div> -->
                                    </div>

                                    <!-- Valor -->
                                    <div class="col-span-12 md:col-span-2 text-center">
                                        <span class="font-semibold text-sm text-gray-900 dark:text-white">
                                            {{ formatCurrency(launch.unitPrice) }}
                                        </span>
                                    </div>

                                    <!-- Status badge + pipeline dot -->
                                    <div class="col-span-12 md:col-span-1 flex flex-col items-center gap-1">
                                        <!-- Badge de status macro -->
                                        <span class="text-xs font-medium px-2 py-0.5 rounded-full truncate"
                                            :class="statusBadgeClass(launch.status)">
                                            {{ STATUS_LABELS[launch.status] || launch.status }}
                                        </span>
                                        <!-- Dot de pipeline (sub-etapa Sienge) -->
                                        <div v-if="launch.pipelineStage && launch.pipelineStage !== 'idle'"
                                            class="flex items-center gap-1 mt-0.5">
                                            <span class="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                :class="pipelineDotClass(launch.pipelineStage)">
                                            </span>
                                            <span class="text-xs text-gray-400 hidden lg:inline truncate max-w-20">
                                                {{ PIPELINE_STAGE_LABELS[launch.pipelineStage]?.label }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Expand chevron -->
                                    <div class="col-span-12 md:col-span-1 flex justify-end">
                                        <i class="fas text-gray-400 text-xs transition-transform duration-200"
                                            :class="expandedId === launch.id ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                                    </div>
                                </div>

                                <!-- Painel expandido -->
                                <div v-if="expandedId === launch.id"
                                    class="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 px-4 py-4">
                                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                        <!-- Pipeline card -->
                                        <LaunchPipelineCard :launch="launch"
                                            :polling="!!store.pipelinePolling[launch.id]"
                                            :running="store.pipelineRunningIds.has(launch.id)"
                                            @run-pipeline="store.runPipeline" @poll="store.pollNow"
                                            @retry-contract="store.runPipeline"
                                            @dismiss-error="store.fetchLaunches(true)"
                                            @open-rid-modal="l => store.openRidModal(l.id)"
                                            @register-boleto="id => store.registerBoleto(id)"
                                            @update-boleto="handleUpdateBoleto" @abort="handleAbort"
                                            @continue-existing-contract="handleContinueExistingContract" />

                                        <!-- Ações de status -->
                                        <div class="space-y-3">
                                            <div
                                                class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                Ações
                                            </div>

                                            <!-- Botões de transição disponíveis -->
                                            <div v-if="ACTIONS[launch.status]" class="flex flex-wrap gap-2">
                                                <button v-for="act in ACTIONS[launch.status]" :key="act.action"
                                                    class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                                                    :class="{
                                                        'border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20': act.color === 'blue',
                                                        'border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20': act.color === 'green',
                                                        'border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20': act.color === 'red',
                                                        'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20': act.color === 'emerald',
                                                        'border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700': act.color === 'slate',
                                                    }"
                                                    :disabled="['searching_creditor', 'searching_contract', 'creating_contract', 'creating_additive', 'validating_items'].includes(launch.pipelineStage) || store.pipelineRunningIds.has(launch.id)"
                                                    @click="askAction(launch, act.action, act.label)">
                                                    <i :class="`fas ${act.icon} text-xs`"></i>
                                                    {{ act.label }}
                                                </button>
                                            </div>
                                            <div v-else class="text-xs text-gray-400 italic">
                                                Nenhuma ação disponível para este status.
                                            </div>

                                            <!-- Info extra do lançamento -->
                                            <div
                                                class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 space-y-2 text-xs">
                                                <div class="flex justify-between">
                                                    <span class="text-gray-500">Empreendimento</span>
                                                    <span
                                                        class="text-gray-800 dark:text-gray-200 font-medium truncate max-w-40 text-right">
                                                        {{ launch.enterpriseName || launch.companyName || '—' }}
                                                    </span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-gray-500">ERP ID</span>
                                                    <span class="font-mono text-gray-600 dark:text-gray-400">{{
                                                        launch.enterpriseId || '—' }}</span>
                                                </div>
                                                <div class="flex justify-between">
                                                    <span class="text-gray-500">Empresa Sienge</span>
                                                    <span class="font-mono text-gray-600 dark:text-gray-400">{{
                                                        launch.companyId || '—' }}</span>
                                                </div>
                                                <div v-if="launch.boletoDueDate" class="flex justify-between">
                                                    <span class="text-gray-500">Vencimento boleto</span>
                                                    <span class="text-gray-700 dark:text-gray-300">{{
                                                        formatDate(launch.boletoDueDate) }}</span>
                                                </div>
                                                <div v-if="launch.notes"
                                                    class="pt-1 border-t border-gray-100 dark:border-gray-800 text-gray-500 italic">
                                                    {{ launch.notes }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        <!-- Paginação -->
                        <div v-if="store.pagination.pages > 1"
                            class="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                            <span class="text-xs text-gray-500">
                                {{ store.pagination.total }} lançamentos · pág. {{ store.pagination.page }}/{{
                                    store.pagination.pages }}
                            </span>
                            <div class="flex gap-1">
                                <button
                                    class="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                    :disabled="store.pagination.page <= 1"
                                    @click="store.setPage(store.pagination.page - 1)">Anterior</button>
                                <button
                                    class="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                    :disabled="store.pagination.page >= store.pagination.pages"
                                    @click="store.setPage(store.pagination.page + 1)">Próxima</button>
                            </div>
                        </div>
                    </div>

                    <!-- Toasts -->
                    <div v-if="store.success"
                        class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        <i class="fas fa-circle-check mr-2"></i>{{ store.success }}
                    </div>
                    <div v-if="store.error"
                        class="mt-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                        <i class="fas fa-triangle-exclamation mr-2"></i>{{ store.error }}
                    </div>
                </main>
            </div>
        </div>

        <!-- Gate: credenciais Sienge não configuradas -->
        <SiengeCredentialsModal v-if="showCredentialsModal" @saved="onCredentialsSaved" />

        <!-- Modal de criação -->
        <CreateLaunchModal v-if="store.showCreateModal" @close="store.closeCreateModal"
            @created="store.fetchLaunches()" />

        <!-- Modal RID: solicitar cadastro de fornecedor -->
        <RidRequestModal v-if="store.showRidModal && store.ridModalLaunchId"
            :launch="store.launches.find(l => l.id === store.ridModalLaunchId) || store.currentLaunch || {}"
            @close="store.closeRidModal()" />

        <!-- Modal atualização de boleto -->
        <UpdateBoletoModal v-if="showUpdateBoletoModal && updateBoletoLaunch" :launch="updateBoletoLaunch"
            @close="showUpdateBoletoModal = false; updateBoletoLaunch = null" @updated="onBoletoUpdated" />

        <!-- Modal de conflito de duplicidade -->
        <div v-if="store.conflictLaunch"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            @click.self="store.conflictLaunch = null">
            <div
                class="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-orange-200 dark:border-orange-700 p-6 space-y-4">
                <!-- Cabeçalho -->
                <div class="flex items-start gap-3">
                    <div
                        class="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-triangle-exclamation text-orange-500"></i>
                    </div>
                    <div>
                        <h3 class="font-bold text-gray-900 dark:text-white">Lançamento duplicado</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Já existe um lançamento ativo com o mesmo número de NF e fornecedor.
                        </p>
                    </div>
                </div>

                <!-- Detalhes do lançamento existente -->
                <div
                    class="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 space-y-2 text-xs">
                    <div class="flex justify-between">
                        <span class="text-gray-500">Lançamento</span>
                        <span class="font-mono font-semibold text-gray-800 dark:text-gray-200">#{{
                            store.conflictLaunch.id }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Status</span>
                        <span class="font-semibold"
                            :class="statusBadgeClass(store.conflictLaunch.status)?.replace('bg-', 'text-').replace(/ bg-\S+/g, '')">
                            {{ store.conflictLaunch.status }}
                        </span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Tipo</span>
                        <span class="text-gray-700 dark:text-gray-300">{{ store.conflictLaunch.launchType || '—'
                            }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Fornecedor</span>
                        <span class="text-gray-700 dark:text-gray-300 text-right max-w-48 truncate">{{
                            store.conflictLaunch.providerName || '—' }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">NF</span>
                        <span class="font-mono text-gray-700 dark:text-gray-300">{{ store.conflictLaunch.nfNumber
                            }}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-500">Criado por</span>
                        <span class="text-gray-700 dark:text-gray-300">{{ store.conflictLaunch.createdByName || '—'
                            }}</span>
                    </div>
                </div>

                <p class="text-sm text-gray-600 dark:text-gray-400">
                    O que deseja fazer?
                </p>

                <div class="flex flex-col gap-2">
                    <button
                        class="w-full px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
                        @click="store.cancelConflictAndCreate()">
                        <i class="fas fa-ban text-xs"></i>
                        Cancelar o lançamento #{{ store.conflictLaunch.id }} e criar o novo
                    </button>
                    <button
                        class="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition"
                        @click="store.conflictLaunch = null">
                        Manter o lançamento existente
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal de confirmação de ação -->
        <div v-if="confirmingAction"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            @click.self="cancelAction">
            <div
                class="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <h3 class="font-bold text-gray-900 dark:text-white">{{ confirmingAction.label }}</h3>
                <p class="text-sm text-gray-500">
                    Confirma a ação <strong>{{ confirmingAction.label }}</strong> para este lançamento?
                </p>
                <div class="flex justify-end gap-3">
                    <button class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                        @click="cancelAction">Cancelar</button>
                    <button class="px-4 py-2 text-sm font-medium rounded-xl text-white transition" :class="confirmingAction.action === 'cancel'
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'" @click="executeAction">
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>