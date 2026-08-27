<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="full">

            <PageHeader icon="fas fa-store" eyebrow="Stand de Vendas"
                :title="stand?.name || 'Stand'"
                :subtitle="subtitulo">
                <template #actions>
                    <PageHelp storage-key="marketing-sales-stand-detalhe" title="Como usar o detalhe do stand"
                        intro="Aqui está tudo de um stand: quanto custou, o que se repete todo mês, o que ele tem e como ele ficou."
                        :steps="[
                            { title: 'Separe os tipos de gasto', text: 'Na aba Custos, marque os lançamentos e diga o que é construção, o que é recorrência e o que é esporádico. Dá para marcar vários de uma vez, até de meses diferentes.' },
                            { title: 'Use os padrões achados', text: 'O que se repete mês a mês (aluguel, energia, café) aparece no topo já somado. Um clique marca todos os lançamentos daquele padrão como recorrência.' },
                            { title: 'Marque os itens', text: 'A aba Itens traz a lista do modelo. Desmarque o que este stand não tem e acrescente o que ele tem de diferente.' },
                            { title: 'Feche a construção', text: 'Quando a montagem terminar, clique em Definir: o valor de construção congela e o que vier depois conta como recorrência.' },
                        ]"
                        :tips="[
                            'São três tipos: construção (montar o stand), recorrência (volta todo mês) e esporádica (acontece de vez em quando). O tipo puxa automático da categoria da conta; classificar à mão vale só para aquele lançamento, e a mãozinha mostra quais foram.',
                            'Uma nota paga em dois meses é um lançamento só: classificar uma vez vale para os dois meses.',
                        ]" />
                    <Button variant="ghost" size="sm" icon="fas fa-arrow-left" @click="voltar">Voltar</Button>
                    <Button v-if="podeCuidar" variant="secondary" size="sm" icon="fas fa-pen"
                        @click="editando = true">
                        Editar
                    </Button>
                    <template v-if="podeCuidar">
                        <Button v-if="stand.status !== 'defined'" variant="primary" size="sm" icon="fas fa-lock"
                            :loading="store.saving" @click="definir">
                            Definir stand
                        </Button>
                        <Button v-else variant="outline" size="sm" icon="fas fa-lock-open" :loading="store.saving"
                            @click="reabrir">
                            Reabrir
                        </Button>
                    </template>
                </template>
            </PageHeader>

            <Surface v-if="store.error" variant="raised" padding="sm" class="mb-5 border-data-neg/30 bg-data-neg/10">
                <div class="text-sm text-data-neg flex items-center gap-2">
                    <i class="fas fa-circle-exclamation"></i>{{ store.error }}
                </div>
            </Surface>
            <Surface v-if="store.spendUnavailable" variant="raised" padding="sm"
                class="mb-5 border-data-warn/30 bg-data-warn/10">
                <div class="text-sm text-data-warn flex items-center gap-2">
                    <i class="fas fa-triangle-exclamation"></i>
                    Sienge indisponível no momento — os valores de gasto estão zerados e voltam quando a base responder.
                </div>
            </Surface>

            <template v-if="store.detailLoading && !stand">
                <Skeleton variant="stat" :lines="4" class="mb-5" />
                <Skeleton variant="table" :lines="6" />
            </template>

            <template v-else-if="stand">
                <!-- Números do stand -->
                <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                    <Surface variant="flat" padding="sm" bordered
                        :title="`${store.expenses.length} lançamentos pagos no plano 2.02.07 dos centros de custo deste stand`">
                        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Gasto total</p>
                        <p class="font-mono tabular-nums font-bold text-ink text-metric-sm">{{ fmtBRL(stand.spend_total) }}</p>
                        <p class="text-micro text-ink-subtle mt-0.5">{{ store.expenses.length }} lançamentos</p>
                    </Surface>
                    <Surface variant="flat" padding="sm" bordered
                        :title="stand.status === 'defined'
                            ? `Congelada em ${fmtDate(stand.defined_at)}. Hoje os lançamentos de construção somam ${fmtBRL(stand.construction_live)}.`
                            : 'Soma dos lançamentos classificados como construção. Congela quando o stand for definido.'">
                        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">
                            Construção
                            <i v-if="stand.status === 'defined'" class="fas fa-lock text-micro ml-0.5"></i>
                        </p>
                        <p class="font-mono tabular-nums font-bold text-series-1 text-metric-sm">
                            {{ fmtBRL(stand.construction_value) }}
                        </p>
                        <p v-if="stand.status === 'defined' && divergeConstrucao" class="text-micro text-data-warn mt-0.5">
                            hoje somaria {{ fmtBRL(stand.construction_live) }}
                        </p>
                        <p v-else class="text-micro text-ink-subtle mt-0.5">
                            {{ stand.status === 'defined' ? `congelada em ${fmtDate(stand.defined_at)}` : 'apurando' }}
                        </p>
                    </Surface>
                    <Surface variant="flat" padding="sm" bordered
                        title="Soma de tudo que está classificado como recorrência, desde o primeiro mês">
                        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Recorrência</p>
                        <p class="font-mono tabular-nums font-bold text-series-2 text-metric-sm">
                            {{ fmtBRL(stand.maintenance_value) }}
                        </p>
                        <p class="text-micro text-ink-subtle mt-0.5">acumulada</p>
                    </Surface>
                    <Surface variant="flat" padding="sm" bordered
                        title="Gasto que acontece de vez em quando: não é montagem do stand nem custo mensal">
                        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Esporádico</p>
                        <p class="font-mono tabular-nums font-bold text-series-3 text-metric-sm">
                            {{ fmtBRL(stand.sporadic_value) }}
                        </p>
                        <p class="text-micro text-ink-subtle mt-0.5">eventual</p>
                    </Surface>
                    <Surface variant="flat" padding="sm" bordered
                        title="Média da recorrência nos últimos 3 meses JÁ FECHADOS (o mês corrente entra pela metade no backup e puxaria a média para baixo)">
                        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Custo por mês</p>
                        <p class="font-mono tabular-nums font-bold text-ink text-metric-sm">
                            {{ fmtBRL(stand.recurring_monthly) }}
                        </p>
                        <p class="text-micro text-ink-subtle mt-0.5">média dos 3 meses fechados</p>
                    </Surface>
                </div>

                <!-- Como o gasto se reparte, num olho só. -->
                <Surface v-if="stand.spend_total > 0" variant="raised" padding="sm" class="mb-5">
                    <div class="flex items-center gap-0.5">
                        <span v-for="f in composicao" :key="f.kind" class="h-2.5 first:rounded-l last:rounded-r"
                            :class="kindMeta(f.kind).dot" :style="{ width: f.width }"
                            :title="`${kindMeta(f.kind).label}: ${fmtBRL(f.value)} (${f.pct}%)`"></span>
                    </div>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">
                        <span v-for="f in composicao" :key="f.kind"
                            class="inline-flex items-center gap-1.5 text-xs text-ink-muted"
                            :title="kindMeta(f.kind).hint">
                            <span class="w-2 h-2 rounded-full" :class="kindMeta(f.kind).dot"></span>
                            {{ kindMeta(f.kind).label }}
                            <span class="font-mono tabular-nums text-ink">{{ fmtBRL(f.value) }}</span>
                            <span class="font-mono tabular-nums text-ink-subtle">{{ f.pct }}%</span>
                        </span>
                    </div>
                </Surface>

                <!-- Identificação. Enquanto o stand é rascunho, modelo e centros
                     de custo se trocam daqui mesmo; depois de definido eles
                     travam, porque o valor congelado fala daquele conjunto. -->
                <Surface variant="raised" padding="sm" class="mb-5">
                    <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                        <Badge :variant="statusMeta.variant" size="sm" :title="statusTitle">
                            <i :class="statusMeta.icon" class="mr-1 text-micro"></i>{{ statusMeta.label }}
                        </Badge>

                        <button type="button" class="text-ink-muted text-left transition-colors"
                            :class="podeTrocarBase ? 'hover:text-ink cursor-pointer' : 'cursor-default'"
                            :title="podeTrocarBase
                                ? 'Trocar o modelo deste stand'
                                : 'Stand definido: reabra para trocar o modelo'"
                            @click="podeTrocarBase && (editando = true)">
                            <i class="fas fa-shapes text-micro mr-1.5 text-ink-subtle"></i>
                            {{ stand.model?.name || 'Sem modelo' }}
                            <span v-if="faixaModelo" class="text-ink-subtle font-mono tabular-nums ml-1">({{ faixaModelo }})</span>
                            <i v-if="podeTrocarBase" class="fas fa-pen text-micro ml-1.5 text-ink-subtle"></i>
                            <i v-else class="fas fa-lock text-micro ml-1.5 text-ink-subtle"></i>
                        </button>

                        <button type="button" class="text-ink-muted min-w-0 text-left transition-colors"
                            :class="podeTrocarBase ? 'hover:text-ink cursor-pointer' : 'cursor-default'"
                            :title="podeTrocarBase
                                ? `Alterar os centros de custo (hoje: ${(stand.cost_center_names || []).join(', ') || 'nenhum'})`
                                : `Stand definido: reabra para alterar os centros de custo (hoje: ${(stand.cost_center_names || []).join(', ')})`"
                            @click="podeTrocarBase && (editando = true)">
                            <i class="fas fa-building text-micro mr-1.5 text-ink-subtle"></i>
                            {{ ccResumo }}
                            <i v-if="podeTrocarBase" class="fas fa-pen text-micro ml-1.5 text-ink-subtle"></i>
                            <i v-else class="fas fa-lock text-micro ml-1.5 text-ink-subtle"></i>
                        </button>

                        <span v-if="stand.notes" class="text-ink-muted min-w-0" :title="stand.notes">
                            <i class="fas fa-note-sticky text-micro mr-1.5 text-ink-subtle"></i>{{ stand.notes }}
                        </span>
                    </div>
                </Surface>

                <!-- Abas -->
                <div class="mb-5">
                    <SegmentedControl v-model="tab" :options="[
                        { value: 'custos', label: 'Custos', icon: 'fas fa-receipt', count: store.expenses.length },
                        { value: 'itens', label: 'Itens', icon: 'fas fa-list-check', count: stand.items?.length || 0 },
                        { value: 'fotos', label: 'Fotos', icon: 'fas fa-images', count: stand.images?.length || 0 },
                    ]" />
                </div>

                <ExpenseTab v-if="tab === 'custos'" :expenses="store.expenses" :summary="store.summary"
                    :patterns="store.patterns" :category-options="store.categoryOptions"
                    :can-manage="podeCuidar" :saving="store.saving" @classify="classificar" />

                <ItemsTab v-else-if="tab === 'itens'" :items="stand.items" :model-name="stand.model?.name || ''"
                    :can-manage="podeCuidar" :saving="store.saving" @save="salvarItens" />

                <PhotosTab v-else :images="stand.images" :can-manage="podeCuidar" :saving="store.saving"
                    @upload="subirFotos" @remove="removerFoto" />
            </template>

            <Surface v-else variant="raised" padding="none">
                <EmptyState icon="fas fa-store-slash" title="Stand não encontrado"
                    description="Ele pode ter sido excluído ou ser de um empreendimento fora da sua alçada." />
            </Surface>

        </PageContainer>

        <StandFormModal :open="editando" :stand="stand" @close="editando = false" @saved="recarregar"
            @deleted="voltar" />
    </div>
</template>

<script setup>
// Detalhe do stand em TELA CHEIA (a navegação continua na lateral). Era um
// modal flutuante: com lançamento a lançamento, itens e fotos na mesma tela,
// não cabia mais numa caixinha.
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useSalesStandStore, STATUS_META, kindMeta } from '@/stores/Marketing/SalesStand/salesStandStore';
import { useCan } from '@/composables/useCan';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { fmtBRL, fmtDate, fmtValueRange, fmtAreaRange } from './standFormat';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

import StandFormModal from './StandFormModal.vue';
import ExpenseTab from './components/ExpenseTab.vue';
import ItemsTab from './components/ItemsTab.vue';
import PhotosTab from './components/PhotosTab.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const store = useSalesStandStore();
const can = useCan('/marketing/stand-vendas');

const tab = ref('custos');
const editando = ref(false);

const standId = computed(() => Number(route.params.id));
const stand = computed(() => store.detail);
const canManage = computed(() => can('manage'));
// Quem abre o stand tem alçada em TODOS os centros de custo dele (o acesso é
// tudo ou nada), então cuidar do stand depende só da capacidade da tela. O
// `!!stand` não é detalhe: o cabeçalho renderiza antes de o stand chegar, e
// sem ele os botões leem `stand.status` de um nulo.
const podeCuidar = computed(() => canManage.value && !!stand.value);
const statusMeta = computed(() => STATUS_META[stand.value?.status] || STATUS_META.draft);

// Modelo e centros de custo mudam o que o stand É. Com o custo de construção
// já congelado, trocar isso deixaria o número falando de outro stand — por
// isso só em rascunho (a API cobra o mesmo).
// Repartição do gasto por tipo. Usa a construção AO VIVO: num stand definido
// o valor congelado pode não fechar com o total, e a faixa passaria de 100%.
const PARTES = [
    ['construcao', 'construction_live'],
    ['recorrencia', 'maintenance_value'],
    ['esporadica', 'sporadic_value'],
    ['sem_classificacao', 'unclassified_value'],
];
const composicao = computed(() => {
    const total = Number(stand.value?.spend_total) || 0;
    if (!total) return [];
    return PARTES
        .map(([kind, campo]) => ({ kind, value: Number(stand.value?.[campo]) || 0 }))
        .filter((f) => f.value > 0)
        .map((f) => ({
            ...f,
            pct: Math.round((f.value / total) * 100),
            width: `${Math.max(2, Math.round((f.value / total) * 100))}%`,
        }));
});

const podeTrocarBase = computed(() => podeCuidar.value && stand.value?.status !== 'defined');
const statusTitle = computed(() => (stand.value?.status === 'defined'
    ? `Construção congelada em ${fmtDate(stand.value?.defined_at)}. Modelo e centros de custo travados.`
    : 'Em apuração: dá para trocar modelo e centros de custo, e o custo de construção ainda soma ao vivo.'));

const faixaModelo = computed(() => {
    if (!stand.value?.model) return '';
    return [fmtValueRange(stand.value.model), fmtAreaRange(stand.value.model)].filter(Boolean).join(' · ');
});

const ccResumo = computed(() => {
    const nomes = stand.value?.cost_center_names || [];
    if (!nomes.length) return 'Sem centro de custo';
    if (nomes.length <= 2) return nomes.join(', ');
    return `${nomes[0]} e mais ${nomes.length - 1} centros de custo`;
});

const subtitulo = computed(() => {
    if (!stand.value) return 'Custo, itens e fotos do stand.';
    return `${stand.value.model?.name || 'Sem modelo'} · ${stand.value.cost_center_names?.length || 0} centro(s) de custo no Sienge`;
});

// Depois de definido, o que ainda entra como construção não mexe no valor
// congelado. Se os dois números divergem, a tela mostra — em vez de deixar o
// congelado parecer o total.
const divergeConstrucao = computed(() => {
    if (!stand.value || stand.value.status !== 'defined') return false;
    return Math.abs(Number(stand.value.construction_live || 0) - Number(stand.value.construction_value || 0)) >= 0.01;
});

async function carregar() {
    try {
        await store.fetchDetail(standId.value);
    } catch (e) {
        if (e?.status === 403) toast.error('Este stand é de um empreendimento fora da sua alçada.');
    }
}

const recarregar = () => carregar();
const voltar = () => router.push('/marketing/stand-vendas');

async function classificar(payload) {
    try {
        await store.classify(standId.value, payload);
    } catch (e) {
        toast.error(e.message || 'Não foi possível classificar os lançamentos.');
    }
}

async function salvarItens(items) {
    try {
        await store.saveItems(standId.value, items);
        toast.success('Itens do stand salvos.');
    } catch (e) {
        toast.error(e.message || 'Não foi possível salvar os itens.');
    }
}

async function subirFotos(files) {
    for (const file of files) {
        try {
            await store.addImage(standId.value, file);
        } catch (e) {
            toast.error(e.message || `Não foi possível subir ${file.name}.`);
        }
    }
}

async function removerFoto(img) {
    try {
        await store.deleteImage(standId.value, img.id);
    } catch (e) {
        toast.error(e.message || 'Não foi possível excluir a foto.');
    }
}

async function definir() {
    const valor = fmtBRL(stand.value?.construction_live || 0);
    if (!await pedirConfirmacao({
        title: `Definir o ${stand.value?.name}?`,
        consequence: `O custo de construção congela em ${valor} (a soma do que está classificado como construção hoje). `
            + 'Todo gasto que entrar depois conta como recorrência. Dá para reabrir e voltar a apurar.',
        confirmLabel: 'Definir stand',
        tone: 'accent',
    })) return;
    try {
        await store.defineStand(standId.value);
        toast.success('Stand definido: custo de construção congelado.');
    } catch (e) {
        toast.error(e.message || 'Não foi possível definir o stand.');
    }
}

async function reabrir() {
    if (!await pedirConfirmacao({
        title: `Reabrir o ${stand.value?.name}?`,
        consequence: 'O valor de construção congelado é apagado e volta a ser apurado ao vivo pelos lançamentos. '
            + 'A classificação de cada lançamento continua como está.',
        confirmLabel: 'Reabrir stand',
    })) return;
    try {
        await store.undefineStand(standId.value);
        toast.info('Stand reaberto: a construção volta a ser apurada.');
    } catch (e) {
        toast.error(e.message || 'Não foi possível reabrir o stand.');
    }
}

watch(standId, () => carregar());

onMounted(async () => {
    store.clearDetail();
    await store.fetchMeta();
    await carregar();
});
</script>
