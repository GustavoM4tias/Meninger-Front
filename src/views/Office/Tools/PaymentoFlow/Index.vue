<script setup>
/**
 * Fluxo de Pagamento — lançamentos a caminho do Sienge.
 *
 * Cada lançamento percorre um pipeline (fornecedor -> contrato -> aditivo ->
 * medição -> título). A TELA é a listagem desses lançamentos; o fluxo é de cada
 * registro, e aparece quando a linha abre.
 *
 * Migrada em 2026-08-21 seguindo `_design/RECEITA-DE-TELA.md`. O que saiu:
 *
 *   - a barra lateral de "Resumo" (1/4 da largura) com as etapas clicáveis:
 *     era um StatRow deitado. Virou StatRow de verdade, no topo, e a tela
 *     ganhou a largura inteira para a lista.
 *   - o cabeçalho artesanal, a `Surface` de filtros e a paginação
 *     "Anterior/Próxima".
 *   - a lista montada com `grid grid-cols-12` na mão, com cabeçalho de coluna
 *     que não ordenava nada.
 *   - 251 cores fixas: a tela estava quebrada no tema claro.
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePaymentFlowStore } from '@/stores/Tools/PaymentFlow/paymentFlowStore';
import { useCan } from '@/composables/useCan';

import CreateLaunchModal from './components/CreateLaunchModal.vue';
import LaunchPipelineCard from './components/LaunchPipelineCard.vue';
import SiengeCredentialsModal from './components/SiengeCredentialsModal.vue';
import RidRequestModal from './components/RidRequestModal.vue';
import UpdateBoletoModal from './components/UpdateBoletoModal.vue';

import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import FilterBar from '@/components/UI/FilterBar.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import { useIncrementalList } from '@/composables/useIncrementalList';

const store = usePaymentFlowStore();
const route = useRoute();
const router = useRouter();

// `configure` (admin) vem das capacidades da tela — lib/screenCapabilities.js.
// Aqui ela também controla a visão de AUTORIA do lançamento (quem criou), que
// é supervisão, não operação. Ver composables/useCan.js.
const can = useCan('/financeiro/paymentflow');

/* Nasce CARREGANDO. Com `false`, o primeiro quadro é renderizado antes de o
   `onMounted` rodar: a lista está vazia e a tela pisca "sem registros" antes do
   esqueleto aparecer. O `finally` do onMounted é quem desliga. */
const loading = ref(true);
const showCredentialsModal = ref(false);

/* ── Filtros: rascunho local, aplicados no botão ──────────────────────────
   Busca e datas ficam num rascunho até "Filtrar", porque cada aplicação é uma
   ida ao servidor. O recorte por etapa (cartão) e os chips especiais aplicam
   na hora - são um clique só, e o usuário espera resposta imediata. */
const draft = ref({ search: '', dateFrom: '', dateTo: '', launchType: '' });

const tipoOptions = computed(() => [
    { value: '', label: 'Todos os tipos' },
    ...(store.launchTypes || []).map((t) => ({ value: t, label: t })),
]);

/** Conta DIMENSÕES preenchidas, não valores. */
const activeCount = computed(() => {
    const f = store.filters;
    let n = 0;
    if (f.search) n++;
    if (f.launchType) n++;
    if (f.status) n++;
    /* Data só conta quando difere do padrão (mês anterior até o fim deste). */
    if (store.hasNonDefaultFilters && (f.dateFrom || f.dateTo)) n++;
    return n;
});

/* ── Filtros na URL ───────────────────────────────────────────────────────
   Permite salvar e mandar o link já filtrado. É recurso, não detalhe: está
   dito no PageHelp. */
function syncFiltersFromUrl() {
    const q = route.query;
    if (!Object.keys(q).length) return;
    const patch = {};
    for (const k of ['status', 'launchType', 'search', 'dateFrom', 'dateTo']) {
        if (q[k]) patch[k] = String(q[k]);
    }
    if (String(q.showCancelled) === 'true' && !store.showCancelled) store.toggleShowCancelled();
    if (String(q.showTituloPago) === 'true' && !store.showTituloPago) store.toggleShowTituloPago();
    if (Object.keys(patch).length) store.filters = { ...store.filters, ...patch };
}

function syncUrlFromFilters() {
    const f = store.filters;
    const q = {};
    for (const k of ['status', 'launchType', 'search', 'dateFrom', 'dateTo']) {
        if (f[k]) q[k] = f[k];
    }
    if (store.showCancelled) q.showCancelled = 'true';
    if (store.showTituloPago) q.showTituloPago = 'true';
    router.replace({ query: q });
}

async function buscar() {
    store.applyFilters({
        search: draft.value.search,
        launchType: draft.value.launchType,
        dateFrom: draft.value.dateFrom,
        dateTo: draft.value.dateTo,
    });
    syncUrlFromFilters();
}

function limparFiltros() {
    draft.value = { search: '', dateFrom: '', dateTo: '', launchType: '' };
    store.resetFilters();
    draft.value.dateFrom = store.filters.dateFrom;
    draft.value.dateTo = store.filters.dateTo;
    router.replace({ query: {} });
}

/* ── Recorte por etapa (o cartão) ─────────────────────────────────────────
   Mesmo gesto liga e desliga; "Em andamento" volta ao conjunto inteiro. */
function aoClicarKpi(item) {
    const alvo = item.key === 'andamento' ? '' : item.key;
    store.applyFilters({ status: store.filters.status === alvo ? '' : alvo });
    syncUrlFromFilters();
}

/* Chips de estado terminal. Além de filtrar, ligam a visibilidade daquele
   estado - sem isso o filtro devolveria zero, porque o `buildQuery` exclui o
   que está desligado. É o comportamento que a tela já tinha. */
function aoClicarEspecial(chave) {
    if (chave === 'titulo_pago' && !store.showTituloPago) store.toggleShowTituloPago();
    if (chave === 'cancelado' && !store.showCancelled) store.toggleShowCancelled();
    if (chave === 'erro' && !store.showErrors) store.toggleShowErrors();
    store.applyFilters({ status: store.filters.status === chave ? '' : chave });
    syncUrlFromFilters();
}

/* ── Etapas: rótulo e cor ─────────────────────────────────────────────────
   Cor de ENTIDADE, dos tokens de série, na ordem do pipeline. Aprovado e
   reprovado do fluxo (pago, cancelado, erro) usam as cores RESERVADAS de
   estado. A mesma cor vale no cartão, no selo da linha e no chip. */
const ETAPAS = [
    { key: 'fornecedor', label: 'Fornecedor', icon: 'fas fa-building-user', tone: 1, badge: 'accent' },
    { key: 'contrato', label: 'Contrato', icon: 'fas fa-file-signature', tone: 4, badge: 'accent' },
    { key: 'aditivo', label: 'Aditivo', icon: 'fas fa-file-circle-plus', tone: 5, badge: 'accent' },
    { key: 'medicao', label: 'Medição', icon: 'fas fa-ruler-combined', tone: 7, badge: 'info' },
    { key: 'titulo', label: 'Título', icon: 'fas fa-file-invoice-dollar', tone: 2, badge: 'warning' },
];

const ESPECIAIS = [
    { key: 'titulo_pago', label: 'Título pago', icon: 'fas fa-circle-check', badge: 'success', dot: 'bg-data-pos' },
    { key: 'cancelado', label: 'Cancelados', icon: 'fas fa-ban', badge: 'neutral', dot: 'bg-data-neutral' },
    { key: 'erro', label: 'Erros', icon: 'fas fa-triangle-exclamation', badge: 'danger', dot: 'bg-data-neg' },
];

const STATUS_LABELS = Object.fromEntries(
    [...ETAPAS, ...ESPECIAIS].map((e) => [e.key, e.label]),
);
const statusBadge = (s) => [...ETAPAS, ...ESPECIAIS].find((e) => e.key === s)?.badge || 'neutral';

function formatCurrency(val) {
    if (val == null) return '-';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function formatDate(val) {
    if (!val) return '-';
    const [y, m, d] = String(val).slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
}

/* ── Cartões ──────────────────────────────────────────────────────────────
   Descrevem o PERÍODO (vêm do summary do servidor, que não conhece o recorte).
   O recorte muda a tabela, não os cartões. */
const totalAtivo = computed(() =>
    ETAPAS.reduce((acc, e) => acc + (store.summary[e.key]?.totalAmount || 0), 0));
const contagemAtiva = computed(() =>
    ETAPAS.reduce((acc, e) => acc + (store.summary[e.key]?.count || 0), 0));

const kpiCards = computed(() => [
    {
        key: 'andamento', label: 'Em andamento', raw: contagemAtiva.value,
        hint: formatCurrency(totalAtivo.value),
        icon: 'fas fa-money-bill-transfer', tone: 'accent',
        tooltip: 'Clique para ver todos os lançamentos em andamento',
    },
    ...ETAPAS.map((e) => ({
        key: e.key, label: e.label, raw: store.summary[e.key]?.count || 0,
        hint: store.summary[e.key]?.totalAmount ? formatCurrency(store.summary[e.key].totalAmount) : '',
        icon: e.icon, tone: e.tone,
        tooltip: `Clique para ver só o que está em ${e.label}`,
    })),
]);

/* ── Tabela ───────────────────────────────────────────────────────────────
   Ordenar aqui (`manual-sort`): a tabela recebe a lista já fatiada pelo
   scroll. Ordem: filtrar (servidor) -> ordenar -> fatiar. */
const ordem = ref({ by: '', dir: 'asc' });

const COLUNAS = computed(() => [
    { key: 'launchType', label: 'Tipo', priority: 1, sortable: true, width: '8rem' },
    { key: 'providerName', label: 'Fornecedor', priority: 1, sortable: true },
    { key: 'status', label: 'Etapa', priority: 1, sortable: true, width: '9rem' },
    {
        key: 'enterpriseName', label: 'Empreendimento', priority: 2, sortable: true,
        value: (l) => l.enterpriseName || l.companyName || '-',
    },
    { key: 'documento', label: 'Documento', priority: 2, truncate: false, width: '9rem' },
    { key: 'unitPrice', label: 'Valor', priority: 2, numeric: true, sortable: true, width: '9rem' },
    { key: 'documentDate', label: 'Data', priority: 3, sortable: true, width: '7rem' },
    ...(can('configure')
        ? [{ key: 'createdByName', label: 'Criado por', priority: 3, sortable: true }]
        : []),
]);

const ordenada = computed(() => {
    const { by, dir } = ordem.value;
    const base = store.launches || [];
    if (!by) return base;
    const col = COLUNAS.value.find((c) => c.key === by);
    const mul = dir === 'asc' ? 1 : -1;
    const valor = (l) => (col?.value ? col.value(l) : l[by]);
    return [...base].sort((a, b) => {
        const va = valor(a), vb = valor(b);
        if (va == null || va === '-') return 1;
        if (vb == null || vb === '-') return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul;
        return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' }) * mul;
    });
});

const inc = useIncrementalList(ordenada, { step: 50 });

/* O servidor pagina. Quando o scroll esgota o que está na memória e ainda há
   página no servidor, busca a próxima e ACUMULA - senão ordenar por valor
   ordenaria só o primeiro lote. */
const faltaNoServidor = computed(() =>
    Math.max(0, (store.pagination.total || 0) - (store.launches?.length || 0)));

const carregandoMais = ref(false);
async function puxarMaisDoServidor() {
    if (carregandoMais.value || !faltaNoServidor.value) return;
    carregandoMais.value = true;
    try { await store.carregarMais(); }
    finally { carregandoMais.value = false; }
}

watch(() => inc.acabou.value, (acabou) => {
    if (acabou && faltaNoServidor.value) puxarMaisDoServidor();
});

/* ── Ações de transição ───────────────────────────────────────────────── */
const CANCEL = { action: 'cancel', label: 'Cancelar', icon: 'fa-ban' };
const ACTIONS = {
    fornecedor: [CANCEL], contrato: [CANCEL], aditivo: [CANCEL],
    medicao: [CANCEL], titulo: [CANCEL], erro: [CANCEL],
};

const confirmingAction = ref(null); // { id, action, label }
function askAction(launch, action, label) {
    confirmingAction.value = { id: launch.id, action, label };
}
function cancelAction() {
    confirmingAction.value = null;
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

const ETAPAS_TRAVADAS = ['searching_creditor', 'searching_contract', 'creating_contract', 'creating_additive', 'validating_items'];
const acaoTravada = (launch) =>
    ETAPAS_TRAVADAS.includes(launch.pipelineStage) || store.pipelineRunningIds.has(launch.id);

/* ── Pipeline ─────────────────────────────────────────────────────────── */
async function handleContinueExistingContract(launchId) {
    try {
        await store.continueExistingContract(launchId);
        await store.fetchLaunches();
    } catch (error) { console.error(error); }
}
async function handleAbort(launchId) {
    try { await store.abortPipeline(launchId); } catch (error) { console.error(error); }
}

const showUpdateBoletoModal = ref(false);
const updateBoletoLaunch = ref(null);
function handleUpdateBoleto(launch) {
    updateBoletoLaunch.value = launch;
    showUpdateBoletoModal.value = true;
}
async function onBoletoUpdated() { await store.fetchLaunches(true); }

function onCredentialsSaved() {
    store.siengeCredentialsOk = true;
    showCredentialsModal.value = false;
}

/* ── Estado ───────────────────────────────────────────────────────────── */
const recorteAtivo = computed(() => (store.filters.status
    ? STATUS_LABELS[store.filters.status] || store.filters.status
    : null));

const periodoLabel = computed(() => {
    const f = store.filters;
    return `${formatDate(f.dateFrom)} → ${formatDate(f.dateTo)}`;
});

onMounted(async () => {
    syncFiltersFromUrl();
    draft.value = {
        search: store.filters.search || '',
        launchType: store.filters.launchType || '',
        dateFrom: store.filters.dateFrom || '',
        dateTo: store.filters.dateTo || '',
    };
    loading.value = true;
    try {
        await Promise.all([store.fetchLaunches(), store.fetchSummary(), store.fetchLaunchTypes()]);
    } finally { loading.value = false; }
    await store.checkSiengeCredentials();
    if (store.siengeCredentialsOk === false) showCredentialsModal.value = true;
});

onUnmounted(() => store.stopAllPolling());
</script>

<template>
    <PageContainer size="full">

        <PageHeader title="Fluxo de Pagamento"
            subtitle="Lançamentos a caminho do Sienge: em que etapa cada um está e o que falta para pagar."
            icon="fas fa-money-bill-transfer">
            <template #title>
                <span>Fluxo de Pagamento</span>
                <Favorite :router="'/financeiro/paymentflow'" :section="'Fluxo de Pagamento'" />
            </template>
            <template #actions>
                <Button size="sm" icon="fas fa-plus" @click="store.openCreateModal">
                    <span class="hidden sm:inline">Lançamento</span>
                </Button>
                <PageHelp
                    storage-key="paymentflow"
                    title="Como usar o Fluxo de Pagamento"
                    intro="Cada lançamento é uma nota que precisa virar título no Sienge. A tela lista os lançamentos do período e mostra em que etapa do caminho cada um parou."
                    :steps="[
                        { title: 'Crie o lançamento', text: 'O botão Lançamento abre o cadastro. Anexe a nota e o boleto: os dados são lidos do PDF e já vêm preenchidos.' },
                        { title: 'Escolha o período', text: 'Abra Filtros para mudar as datas, buscar por fornecedor ou documento, ou olhar só um tipo de lançamento.' },
                        { title: 'Veja onde estão', text: 'Os cartões contam quantos lançamentos há em cada etapa e quanto somam. Clique num deles para deixar na tabela só aquela etapa; clique de novo para desfazer.' },
                        { title: 'Acompanhe um lançamento', text: 'Clique na linha para abrir o pipeline: cada passo com Sienge aparece com o estado atual e o que deu errado, se deu.' },
                        { title: 'Aja quando travar', text: 'Dentro da linha aberta ficam as ações: rodar o pipeline de novo, pedir o RID do fornecedor, atualizar o boleto ou cancelar o lançamento.' },
                    ]"
                    :tips="[
                        'A cor da etapa é a mesma no cartão, no selo da linha e no chip: verde é título pago, vermelho é erro e cinza é cancelado.',
                        'Cancelados e títulos pagos ficam escondidos por padrão. Clicar no chip deles liga a exibição e filtra de uma vez.',
                        'Quando há pipeline rodando, a tela se atualiza sozinha - o aviso aparece ao lado da contagem.',
                        'Os filtros ficam gravados no endereço da página: dá para salvar o link ou mandar para alguém já filtrado.',
                    ]"
                />
            </template>
        </PageHeader>

        <div class="mb-4">
            <FilterBar :active-count="activeCount" :loading="loading" :cols="4"
                @apply="buscar" @clear="limparFiltros">
                <Input v-model="draft.search" label="Buscar"
                    :placeholder="can('configure') ? 'Fornecedor · empresa · documento · criador' : 'Fornecedor · empresa · documento'"
                    iconLeft="fas fa-magnifying-glass" @keydown.enter="buscar" />
                <Input v-model="draft.dateFrom" type="date" label="Data início" />
                <Input v-model="draft.dateTo" type="date" label="Data fim" />
                <Select v-model="draft.launchType" label="Tipo de lançamento" :options="tipoOptions" />
            </FilterBar>
        </div>

        <div v-if="store.error"
            class="mb-4 rounded-xl border border-data-neg/25 bg-data-neg/10 p-4 text-sm text-data-neg
                   flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-start gap-2 min-w-0">
                <i class="fas fa-circle-exclamation mt-0.5 shrink-0"></i>
                <span class="min-w-0">{{ store.error }}</span>
            </div>
            <Button variant="outline" size="sm" icon="fas fa-rotate-right" class="shrink-0"
                @click="store.fetchLaunches()">
                Tentar novamente
            </Button>
        </div>

        <div v-else-if="loading" class="space-y-4">
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
                <Skeleton v-for="i in 6" :key="i" variant="stat" />
            </div>
            <Skeleton variant="table" :lines="8" />
        </div>

        <div v-else class="space-y-4">
            <!-- Cartões por etapa: clicar recorta a tabela -->
            <StatRow :items="kpiCards" :cols="{ sm: 2, md: 3, lg: 6 }" size="sm"
                selectable :active-key="store.filters.status || 'andamento'" @select="aoClicarKpi" />

            <!-- Estados terminais: chips, porque não fazem parte do funil ativo -->
            <div class="flex flex-wrap items-center gap-1.5">
                <button v-for="e in ESPECIAIS" :key="e.key" type="button"
                    :class="['inline-flex items-center gap-2 h-10 px-3 rounded-lg border text-xs font-medium',
                             'transition-colors duration-120 focus-ring',
                             store.filters.status === e.key
                               ? 'border-accent bg-accent-soft text-accent'
                               : 'border-line text-ink-muted hover:bg-surface-sunken hover:text-ink']"
                    @click="aoClicarEspecial(e.key)">
                    <span :class="[e.dot, 'h-2 w-2 rounded-full shrink-0']"></span>
                    {{ e.label }}
                    <span class="font-mono tabular-nums text-ink-subtle">
                        {{ store.summary[e.key]?.count || 0 }}
                    </span>
                </button>
            </div>

            <!-- Linha de estado -->
            <div class="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                <span class="tabular-nums">
                    <b class="text-ink">{{ store.launches.length }}</b>
                    de {{ store.pagination.total || store.launches.length }} lançamento{{ (store.pagination.total || 0) === 1 ? '' : 's' }}
                </span>
                <span class="font-mono text-ink-subtle tabular-nums">{{ periodoLabel }}</span>
                <button v-if="recorteAtivo" type="button"
                    class="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-accent-soft text-accent
                           text-micro font-medium hover:bg-accent/15 transition-colors duration-120 focus-ring"
                    @click="store.applyFilters({ status: '' }); syncUrlFromFilters()">
                    só {{ recorteAtivo }}
                    <i class="fas fa-xmark text-micro"></i>
                </button>
                <span v-if="store.liveRefreshId || store.hasActivePipelines"
                    class="inline-flex items-center gap-1.5 text-micro font-mono text-accent">
                    <span class="live-dot"></span>
                    atualizando em tempo real
                </span>
            </div>

            <DataTable :columns="COLUNAS" :rows="inc.visiveis.value" row-key="id"
                manual-sort expandable density="compact"
                v-model:sort-by="ordem.by" v-model:sort-dir="ordem.dir"
                more-label="Ver mais campos"
                empty-title="Nenhum lançamento encontrado"
                empty-text="Ajuste o período ou os filtros para ver resultados.">

                <template #cell-launchType="{ value }">
                    <Badge variant="accent" size="sm">{{ value || '-' }}</Badge>
                </template>

                <template #cell-providerName="{ row }">
                    <span class="block min-w-0">
                        <span class="block font-medium text-ink truncate">{{ row.providerName || '-' }}</span>
                        <span v-if="row.providerCnpj" class="block text-micro font-mono text-ink-subtle truncate">
                            {{ row.providerCnpj }}
                        </span>
                    </span>
                </template>

                <template #cell-status="{ value }">
                    <Badge :variant="statusBadge(value)" size="sm">
                        {{ STATUS_LABELS[value] || value || '-' }}
                    </Badge>
                </template>

                <template #cell-documento="{ row }">
                    <span class="inline-flex items-center gap-2" @click.stop>
                        <a v-if="row.nfUrl" :href="row.nfUrl" target="_blank" rel="noopener"
                            v-tippy="'Abrir a nota'"
                            class="inline-flex items-center gap-1 text-micro text-ink-muted
                                   hover:text-accent transition-colors duration-120 focus-ring rounded">
                            <i class="fas fa-file-invoice"></i>{{ row.nfType || 'NF' }}
                        </a>
                        <a v-if="row.boletoUrl" :href="row.boletoUrl" target="_blank" rel="noopener"
                            v-tippy="'Abrir o boleto'"
                            class="inline-flex items-center gap-1 text-micro text-ink-muted
                                   hover:text-accent transition-colors duration-120 focus-ring rounded">
                            <i class="fas fa-barcode"></i>Boleto
                        </a>
                        <span v-if="!row.nfUrl && !row.boletoUrl" class="text-ink-subtle">-</span>
                    </span>
                </template>

                <template #cell-unitPrice="{ value }">
                    <span class="metric text-sm">{{ formatCurrency(value) }}</span>
                </template>

                <template #cell-documentDate="{ value }">{{ formatDate(value) }}</template>

                <!-- A linha abre com o pipeline do registro e as ações dele -->
                <template #expanded="{ row }">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 py-1">
                        <LaunchPipelineCard :launch="row"
                            :polling="!!store.pipelinePolling[row.id]"
                            :running="store.pipelineRunningIds.has(row.id)"
                            @run-pipeline="store.runPipeline" @poll="store.pollNow"
                            @retry-contract="store.runPipeline"
                            @dismiss-error="store.fetchLaunches(true)"
                            @open-rid-modal="l => store.openRidModal(l.id)"
                            @register-boleto="id => store.registerBoleto(id)"
                            @update-boleto="handleUpdateBoleto" @abort="handleAbort"
                            @continue-existing-contract="handleContinueExistingContract" />

                        <div class="space-y-3">
                            <p class="metric-label">Ações</p>

                            <div v-if="ACTIONS[row.status]" class="flex flex-wrap gap-2">
                                <Button v-for="act in ACTIONS[row.status]" :key="act.action"
                                    variant="outline" size="sm" :icon="`fas ${act.icon}`"
                                    :disabled="acaoTravada(row)"
                                    @click.stop="askAction(row, act.action, act.label)">
                                    {{ act.label }}
                                </Button>
                            </div>
                            <p v-else class="text-micro text-ink-subtle italic">
                                Nenhuma ação disponível nesta etapa.
                            </p>

                            <dl class="panel p-3 grid grid-cols-2 gap-x-4 gap-y-2">
                                <div class="min-w-0">
                                    <dt class="metric-label">Empreendimento</dt>
                                    <dd class="text-xs text-ink truncate">
                                        {{ row.enterpriseName || row.companyName || '-' }}
                                    </dd>
                                </div>
                                <div class="min-w-0">
                                    <dt class="metric-label">ERP ID</dt>
                                    <dd class="text-xs text-ink-muted font-mono tabular-nums">{{ row.enterpriseId || '-' }}</dd>
                                </div>
                                <div class="min-w-0">
                                    <dt class="metric-label">Empresa Sienge</dt>
                                    <dd class="text-xs text-ink-muted font-mono tabular-nums">{{ row.companyId || '-' }}</dd>
                                </div>
                                <div v-if="row.boletoDueDate" class="min-w-0">
                                    <dt class="metric-label">Vencimento do boleto</dt>
                                    <dd class="text-xs text-ink tabular-nums">{{ formatDate(row.boletoDueDate) }}</dd>
                                </div>
                                <div v-if="row.notes" class="col-span-full min-w-0 pt-1 border-t border-line-subtle">
                                    <dt class="metric-label">Observação</dt>
                                    <dd class="text-xs text-ink-muted">{{ row.notes }}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </template>
            </DataTable>

            <!-- Gatilho do scroll. Quando o que está na memória acaba e o
                 servidor ainda tem página, ela é buscada e ACUMULADA. -->
            <div v-if="!inc.acabou.value || faltaNoServidor" :ref="el => inc.observar(el)"
                class="py-6 flex items-center justify-center gap-2 text-micro text-ink-subtle">
                <Spinner size="sm" />
                <span v-if="!inc.acabou.value">
                    carregando mais {{ Math.min(inc.step, inc.restantes.value) }} de {{ inc.restantes.value }} restantes
                </span>
                <span v-else>buscando mais {{ faltaNoServidor }} no servidor</span>
            </div>
        </div>

        <!-- Confirmação de ação destrutiva -->
        <Modal :open="!!confirmingAction" size="sm"
            :title="confirmingAction ? `${confirmingAction.label} lançamento` : ''"
            @close="cancelAction">
            <p class="text-sm text-ink-muted">
                Confirma <b class="text-ink">{{ confirmingAction?.label.toLowerCase() }}</b>
                este lançamento? A ação não pode ser desfeita.
            </p>
            <template #footer>
                <Button variant="ghost" @click="cancelAction">Voltar</Button>
                <Button variant="danger" icon="fas fa-ban" @click="executeAction">
                    {{ confirmingAction?.label }}
                </Button>
            </template>
        </Modal>

        <!-- Conflito de duplicidade: era um modal montado na mão, com backdrop
             e blur próprios. Virou o `Modal` do sistema, para se comportar como
             qualquer outro (tela cheia no celular, fecha no Esc, camada certa). -->
        <Modal :open="!!store.conflictLaunch" size="md" title="Lançamento duplicado"
            subtitle="Já existe um lançamento ativo com o mesmo número de NF e fornecedor."
            @close="store.conflictLaunch = null">
            <dl v-if="store.conflictLaunch" class="panel p-3 grid grid-cols-2 gap-x-4 gap-y-2">
                <div class="min-w-0">
                    <dt class="metric-label">Lançamento</dt>
                    <dd class="text-xs font-mono font-semibold text-ink tabular-nums">#{{ store.conflictLaunch.id }}</dd>
                </div>
                <div class="min-w-0">
                    <dt class="metric-label">Etapa</dt>
                    <dd><Badge :variant="statusBadge(store.conflictLaunch.status)" size="sm">
                        {{ STATUS_LABELS[store.conflictLaunch.status] || store.conflictLaunch.status }}
                    </Badge></dd>
                </div>
                <div class="min-w-0">
                    <dt class="metric-label">Tipo</dt>
                    <dd class="text-xs text-ink truncate">{{ store.conflictLaunch.launchType || '-' }}</dd>
                </div>
                <div class="min-w-0">
                    <dt class="metric-label">NF</dt>
                    <dd class="text-xs font-mono text-ink truncate">{{ store.conflictLaunch.nfNumber || '-' }}</dd>
                </div>
                <div class="min-w-0 col-span-2">
                    <dt class="metric-label">Fornecedor</dt>
                    <dd class="text-xs text-ink truncate">{{ store.conflictLaunch.providerName || '-' }}</dd>
                </div>
                <div class="min-w-0 col-span-2">
                    <dt class="metric-label">Criado por</dt>
                    <dd class="text-xs text-ink-muted truncate">{{ store.conflictLaunch.createdByName || '-' }}</dd>
                </div>
            </dl>
            <template #footer>
                <Button variant="ghost" @click="store.conflictLaunch = null">
                    Manter o existente
                </Button>
                <Button variant="danger" icon="fas fa-ban" @click="store.cancelConflictAndCreate()">
                    Cancelar #{{ store.conflictLaunch?.id }} e criar o novo
                </Button>
            </template>
        </Modal>

        <SiengeCredentialsModal v-if="showCredentialsModal" @saved="onCredentialsSaved" />

        <CreateLaunchModal v-if="store.showCreateModal" @close="store.closeCreateModal"
            @created="store.fetchLaunches()" />

        <RidRequestModal v-if="store.showRidModal && store.ridModalLaunchId"
            :launch="store.launches.find(l => l.id === store.ridModalLaunchId) || store.currentLaunch || {}"
            @close="store.closeRidModal()" />

        <UpdateBoletoModal v-if="showUpdateBoletoModal && updateBoletoLaunch" :launch="updateBoletoLaunch"
            @close="showUpdateBoletoModal = false; updateBoletoLaunch = null"
            @updated="onBoletoUpdated" />
    </PageContainer>
</template>
