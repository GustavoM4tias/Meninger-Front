<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="full">

            <PageHeader icon="fas fa-store"
                subtitle="Os stands de vendas com o custo apurado do Sienge, os modelos de referência e a régua que separa implantação, ajustes e operação.">
                <template #title>
                    Stand de Vendas
                    <Favorite :router="'/marketing/stand-vendas'" :section="'Stand de Vendas'" />
                </template>
                <template #actions>
                    <PageHelp storage-key="marketing-sales-stand" title="Como usar o Stand de Vendas"
                        intro="Aqui o Marketing organiza os stands: os modelos (categorias com valor médio e itens), os stands reais vinculados aos centros de custo do Sienge, e a régua que separa o custo de construção do custo recorrente."
                        :steps="[
                            { title: 'Crie os modelos', text: 'Na aba Modelos, cadastre as categorias de stand com o valor médio e a lista de itens que cada padrão possui.' },
                            { title: 'Cadastre os stands', text: 'Na aba Stands, crie cada stand real, atribua um modelo e vincule 1 ou mais centros de custo.' },
                            { title: 'Abra o stand', text: 'Clique na linha para abrir o stand em tela cheia: lançamento a lançamento, mês a mês, itens e fotos.' },
                            { title: 'Defina o stand', text: 'Quando a construção terminar, abra o stand e clique em Definir: o valor classificado como construção é congelado.' },
                        ]"
                        :tips="[
                            'Cada um enxerga os stands dos empreendimentos que estão na sua alçada, e o acesso é por inteiro: stand com um centro de custo fora da sua alçada não aparece.',
                            'A aba Categorias diz como cada lançamento ganha natureza e fase (implantação, ajustes ou operação): pela conta do Sienge, por palavra no fornecedor e pela janela de montagem. Vale para todos os stands.',
                            'Passe o mouse sobre qualquer número, barra ou ponto para ver o que ele quer dizer.',
                        ]" />
                    <Button v-if="tab === 'stands' && canManage" variant="primary" size="sm" icon="fas fa-plus"
                        @click="openNewStand">
                        Novo stand
                    </Button>
                </template>
            </PageHeader>

            <div class="mb-5">
                <SegmentedControl v-model="tab" :options="tabs" />
            </div>

            <Surface v-if="store.error" variant="raised" padding="sm" class="mb-5 border-data-neg/30 bg-data-neg/10">
                <div class="text-sm text-data-neg flex items-center gap-2">
                    <i class="fas fa-circle-exclamation"></i>{{ store.error }}
                </div>
            </Surface>
            <Surface v-if="tab === 'stands' && store.spendUnavailable" variant="raised" padding="sm"
                class="mb-5 border-data-warn/30 bg-data-warn/10">
                <div class="text-sm text-data-warn flex items-center gap-2">
                    <i class="fas fa-triangle-exclamation"></i>
                    Sienge indisponível no momento — os valores de gasto estão zerados e voltam quando a base responder.
                </div>
            </Surface>

            <!-- ══ Aba Stands ══ -->
            <template v-if="tab === 'stands'">
                <Skeleton v-if="store.loading && !store.stands.length" variant="chart" height="h-96" />
                <StandsOverview v-else-if="store.stands.length" :stands="store.stands" @open="abrir" />
                <Surface v-else variant="raised" padding="none">
                    <EmptyState icon="fas fa-store" title="Nenhum stand cadastrado"
                        description="Crie os modelos na aba ao lado e cadastre aqui os stands reais com seus centros de custo." />
                </Surface>
            </template>

            <!-- ══ Aba Modelos ══ -->
            <ModelsBoard v-else-if="tab === 'modelos'" :models="sortedModels" :stands="store.stands"
                :can-configure="canConfigure" @edit="openEditModel" @new="openNewModel" />

            <!-- ══ Aba Categorias de gasto ══ -->
            <CategoriesBoard v-else-if="tab === 'categorias'" :categories="store.categories"
                :can-configure="canConfigure" @edit="openEditCategory" @new="openNewCategory" />

            <!-- ══ Aba Conferência (departamento × plano do stand) ══ -->
            <AuditTab v-else :can-manage="canManage" />

        </PageContainer>

        <ModelFormModal :open="modelModalOpen" :model="editingModel" @close="modelModalOpen = false" />
        <StandFormModal :open="standModalOpen" :stand="editingStand" @close="standModalOpen = false" />
        <CategoryFormModal :open="categoryModalOpen" :category="editingCategory" @close="categoryModalOpen = false" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSalesStandStore } from '@/stores/Marketing/SalesStand/salesStandStore';
import { useCan } from '@/composables/useCan';
import { sortModelsByTier } from './standFormat';
import Skeleton from '@/components/UI/Skeleton.vue';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Favorite from '@/components/config/Favorite.vue';

import ModelFormModal from './ModelFormModal.vue';
import StandFormModal from './StandFormModal.vue';
import CategoryFormModal from './CategoryFormModal.vue';
import StandsOverview from './report/StandsOverview.vue';
import AuditTab from './components/AuditTab.vue';
import ModelsBoard from './report/ModelsBoard.vue';
import CategoriesBoard from './report/CategoriesBoard.vue';

const store = useSalesStandStore();
const router = useRouter();
const can = useCan('/marketing/stand-vendas');

const tab = ref('stands');
const modelModalOpen = ref(false);
const editingModel = ref(null);
const standModalOpen = ref(false);
const editingStand = ref(null);
const categoryModalOpen = ref(false);
const editingCategory = ref(null);

const canManage = computed(() => can('manage'));
const canConfigure = computed(() => can('configure'));

const tabs = computed(() => [
    { value: 'stands', label: 'Stands', icon: 'fas fa-store', count: store.stands.length },
    { value: 'modelos', label: 'Modelos', icon: 'fas fa-shapes', count: store.models.length },
    { value: 'categorias', label: 'Categorias', icon: 'fas fa-tags', count: store.categories.length },
    { value: 'conferencia', label: 'Conferência', icon: 'fas fa-clipboard-check' },
]);

// Modelos por porte (Standard → Premium), não alfabético.
const sortedModels = computed(() => sortModelsByTier(store.models));



const abrir = (s) => router.push(`/marketing/stand-vendas/${s.id}`);

function openNewModel() { editingModel.value = null; modelModalOpen.value = true; }
function openEditModel(m) { editingModel.value = m; modelModalOpen.value = true; }
function openNewStand() { editingStand.value = null; standModalOpen.value = true; }
function openNewCategory() { editingCategory.value = null; categoryModalOpen.value = true; }
function openEditCategory(c) { editingCategory.value = c; categoryModalOpen.value = true; }

onMounted(async () => {
    await store.fetchMeta();
    await Promise.all([store.fetchStands(), store.fetchSettings()]);
});
</script>

