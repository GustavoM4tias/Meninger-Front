<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="full">

            <PageHeader icon="fas fa-store" eyebrow="Stand de Vendas"
                :title="tab === 'relatorio' ? 'Relatório do stand' : (stand?.name || 'Stand')"
                :subtitle="subtitulo">
                <template #actions>
                    <PageHelp storage-key="marketing-sales-stand-detalhe" title="Como usar o detalhe do stand"
                        intro="Aqui está tudo de um stand: quanto custou, o que se repete todo mês, o que ele tem e como ele ficou."
                        :steps="[
                            { title: 'Leia o relatório', text: 'A aba Relatório mostra quanto o stand custou, mês a mês, por categoria e quanto custa para ficar aberto. Todo número abre os lançamentos que o formam; do lançamento dá para classificar ali mesmo.' },
                            { title: 'Resolva as pendências', text: 'No fim do relatório ficam o que está fora do departamento no Sienge, o que não tem classificação e as contas mensais que faltaram. Resolvidas, elas somem sozinhas.' },
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

            <p v-if="store.error" class="sr sr-note warn sr-banner">
                <i class="fas fa-circle-exclamation"></i><span>{{ store.error }}</span>
            </p>
            <p v-if="store.spendUnavailable" class="sr sr-note warn sr-banner">
                <i class="fas fa-triangle-exclamation"></i>
                <span>O Sienge não respondeu agora: os valores de gasto aparecem zerados e voltam sozinhos quando a base responder.</span>
            </p>

            <template v-if="store.detailLoading && !stand">
                <SrSkeleton variant="report" label="Carregando o relatório do stand e os pagamentos do Sienge…" />
            </template>

            <template v-else-if="stand">
                <!-- Abas: o relatório é a leitura; Custos, Itens e Fotos são o
                     trabalho de quem cuida do stand. -->
                <div class="mb-6">
                    <SegmentedControl v-model="tab" :options="[
                        { value: 'relatorio', label: 'Relatório', icon: 'fas fa-chart-column' },
                        { value: 'custos', label: 'Custos', icon: 'fas fa-receipt', count: store.expenses.length },
                        { value: 'itens', label: 'Itens', icon: 'fas fa-list-check', count: stand.items?.length || 0 },
                        { value: 'fotos', label: 'Fotos', icon: 'fas fa-images', count: stand.images?.length || 0 },
                    ]" />
                </div>

                <StandReport v-if="tab === 'relatorio'" :stand="stand" :expenses="store.expenses"
                    :outside="store.outside" :categories="store.categories" :category-options="store.categoryOptions"
                    :can-manage="podeCuidar" :saving="store.saving"
                    :checking="store.liveCheckingStand"
                    @classify="classificar" @edit="editando = true" @live-check="conferirAoVivo" />

                <ExpenseTab v-else-if="tab === 'custos'" :expenses="store.expenses" :summary="store.summary"
                    :patterns="store.patterns" :category-options="store.categoryOptions"
                    :can-manage="podeCuidar" :saving="store.saving" @classify="classificar" />

                <ItemsTab v-else-if="tab === 'itens'" :items="stand.items" :model-name="stand.model?.name || ''"
                    :can-manage="podeCuidar" :saving="store.saving" @save="salvarItens" />

                <PhotosTab v-else :images="stand.images" :can-manage="podeCuidar" :saving="store.saving"
                    :max="stand.images_max || 24"
                    @upload="subirFoto" @remove="removerFoto" @caption="salvarLegenda" @reorder="reordenarFotos" />
            </template>

            <div v-else class="sr sr-wrap">
                <div class="sr-head sr-vazio">
                    <p class="eyebrow">Stand de Vendas</p>
                    <h1 class="display">Stand não encontrado</h1>
                    <p class="lede">Ele pode ter sido excluído ou ser de um empreendimento fora da sua alçada. Volte para a lista e abra outro.</p>
                    <button type="button" class="sr-btn ghost" @click="voltar"><i class="fas fa-arrow-left"></i>Voltar para os stands</button>
                </div>
            </div>

        </PageContainer>

        <StandFormModal :open="editando" :stand="stand" @close="editando = false" @saved="recarregar"
            @deleted="voltar" />
    </div>
</template>

<script setup>
import './report/standReport.css';
// Detalhe do stand em TELA CHEIA (a navegação continua na lateral). Era um
// modal flutuante: com lançamento a lançamento, itens e fotos na mesma tela,
// não cabia mais numa caixinha.
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useSalesStandStore } from '@/stores/Marketing/SalesStand/salesStandStore';
import { useCan } from '@/composables/useCan';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { fmtBRL } from './standFormat';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Button from '@/components/UI/Button.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import SrSkeleton from './report/SrSkeleton.vue';

import StandFormModal from './StandFormModal.vue';
import ExpenseTab from './components/ExpenseTab.vue';
import ItemsTab from './components/ItemsTab.vue';
import PhotosTab from './components/PhotosTab.vue';
import StandReport from './report/StandReport.vue';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const store = useSalesStandStore();
const can = useCan('/marketing/stand-vendas');

const tab = ref('relatorio');
const editando = ref(false);

const standId = computed(() => Number(route.params.id));
const stand = computed(() => store.detail);
const canManage = computed(() => can('manage'));
// Quem abre o stand tem alçada em TODOS os centros de custo dele (o acesso é
// tudo ou nada), então cuidar do stand depende só da capacidade da tela. O
// `!!stand` não é detalhe: o cabeçalho renderiza antes de o stand chegar, e
// sem ele os botões leem `stand.status` de um nulo.
const podeCuidar = computed(() => canManage.value && !!stand.value);
const subtitulo = computed(() => {
    if (!stand.value) return 'Custo, itens e fotos do stand.';
    return `${stand.value.model?.name || 'Sem modelo'} · ${stand.value.cost_center_names?.length || 0} centro(s) de custo no Sienge`;
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
        if (tab.value === 'relatorio') toast.success(payload.reset ? 'O lançamento voltou a herdar da conta.' : 'Classificação salva.');
    } catch (e) {
        toast.error(e.message || 'Não foi possível classificar os lançamentos.');
    }
}

// Título corrigido no Sienge não precisa esperar a carga diária do espelho:
// a conferência ao vivo confirma e o relatório já conta.
async function conferirAoVivo() {
    try {
        const r = await store.liveCheckStand(standId.value);
        if (!r.checked) toast.info('Nenhum título deste stand está fora do departamento.');
        else if (r.resolved) toast.success(`${r.resolved} de ${r.checked} título(s) já corrigido(s) no Sienge: entraram no relatório.`);
        else toast.info(`Nenhum dos ${r.checked} título(s) foi corrigido no Sienge ainda.`);
    } catch (e) {
        toast.error(e.message || 'Não foi possível consultar o Sienge agora.');
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

// A aba manda uma foto por vez e espera a resposta: assim a barra de progresso
// diz qual subiu e qual falhou, em vez de um "deu erro" geral no fim.
async function subirFoto({ pronta, resolve, reject }) {
    try {
        await store.addImage(standId.value, pronta);
        resolve();
    } catch (e) {
        reject(e);
    }
}

async function salvarLegenda({ id, caption }) {
    try {
        await store.updateImage(standId.value, id, { caption });
    } catch (e) {
        toast.error(e.message || 'Não foi possível salvar a legenda.');
    }
}

async function reordenarFotos(ids) {
    try {
        await store.reorderImages(standId.value, ids);
    } catch (e) {
        toast.error(e.message || 'Não foi possível salvar a ordem das fotos.');
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
