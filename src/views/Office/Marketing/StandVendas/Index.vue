<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="full">

            <PageHeader icon="fas fa-store"
                subtitle="Stands modelo com valor médio e itens, e os stands reais com o custo apurado do Sienge, separado entre construção e recorrência.">
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
                            'A aba Categorias diz, por conta do Sienge, o que é construção e o que é recorrência. Ela vale para todos os stands.',
                        ]" />
                    <Button v-if="tab === 'modelos' && canConfigure" variant="primary" size="sm" icon="fas fa-plus"
                        @click="openNewModel">
                        Novo modelo
                    </Button>
                    <Button v-else-if="tab === 'categorias' && canConfigure" variant="primary" size="sm"
                        icon="fas fa-plus" @click="openNewCategory">
                        Nova categoria
                    </Button>
                    <Button v-else-if="tab === 'stands' && canManage" variant="primary" size="sm" icon="fas fa-plus"
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
            <div v-if="tab === 'stands'" class="flex flex-col gap-4">
                <div class="flex items-center justify-end">
                    <SegmentedControl v-model="standView" size="sm" :options="[
                        { value: 'tabela', label: 'Tabela', icon: 'fas fa-table-list' },
                        { value: 'cartoes', label: 'Cartões', icon: 'fas fa-grip' },
                    ]" />
                </div>

                <div v-if="standView === 'cartoes'" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    <StandCard v-for="s in store.stands" :key="s.id" :stand="s" @open="abrir" />
                    <div v-if="!store.loading && !store.stands.length" class="sm:col-span-2 xl:col-span-3 2xl:col-span-4">
                        <Surface variant="raised" padding="none">
                            <EmptyState icon="fas fa-store" title="Nenhum stand cadastrado"
                                description="Crie os modelos na aba ao lado e cadastre aqui os stands reais com seus centros de custo." />
                        </Surface>
                    </div>
                </div>

                <DataTable v-else :columns="colunasStand" :rows="store.stands" row-key="id"
                clickable :loading="store.loading" density="comfortable"
                sort-by="spend_total" sort-dir="desc"
                empty-icon="fas fa-store" empty-title="Nenhum stand cadastrado"
                empty-text="Crie os modelos na aba ao lado e cadastre aqui os stands reais com seus centros de custo."
                @row-click="abrir">
                <template #cell-name="{ row }">
                    <span class="font-semibold text-ink"
                        :title="`${row.name}`
                            + (row.unclassified_value > 0 ? ` - ${fmtBRL(row.unclassified_value)} sem classificação` : '')">
                        {{ row.name }}
                        <i v-if="row.unclassified_value > 0" class="fas fa-circle-question text-data-warn text-micro ml-1"></i>
                    </span>
                </template>
                <!-- A coluna corta; o title abre a lista inteira de centros de custo. -->
                <template #cell-cost_centers="{ row }">
                    <span :title="(row.cost_center_names || []).join(', ') || 'Sem centro de custo'">
                        {{ resumoCc(row) }}
                    </span>
                </template>
                <template #cell-status="{ row }">
                    <Badge :variant="statusMeta(row.status).variant" size="sm"
                        :title="row.status === 'defined'
                            ? 'Custo de construção congelado'
                            : 'Em apuração: construção ainda soma ao vivo'">
                        <i :class="statusMeta(row.status).icon" class="mr-1 text-micro"></i>
                        {{ statusMeta(row.status).label }}
                    </Badge>
                </template>
                </DataTable>
            </div>

            <!-- ══ Aba Modelos ══ -->
            <div v-else-if="tab === 'modelos'" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Surface v-for="(m, i) in sortedModels" :key="m.id" variant="raised" padding="none"
                    :interactive="canConfigure"
                    class="overflow-hidden flex flex-col animate-fade-in [animation-fill-mode:backwards]"
                    :class="canConfigure ? 'cursor-pointer' : ''"
                    :style="{ animationDelay: Math.min(i, 12) * 30 + 'ms' }"
                    @click="canConfigure && openEditModel(m)">

                    <div class="p-4 sm:p-5">
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex items-center gap-2.5 min-w-0">
                                <div class="w-9 h-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center shrink-0">
                                    <i class="fas fa-store text-sm"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="font-semibold text-ink truncate">{{ m.name }}</p>
                                    <p class="text-micro text-ink-subtle">
                                        {{ m.stands_count }} stand{{ m.stands_count === 1 ? '' : 's' }} vinculado{{ m.stands_count === 1 ? '' : 's' }}
                                    </p>
                                </div>
                            </div>
                            <i v-if="canConfigure" class="fas fa-pen text-[11px] text-ink-subtle mt-1 shrink-0"></i>
                        </div>
                        <!-- Altura fixa (3 linhas) p/ as faixas de valor alinharem entre os cards. -->
                        <p class="text-xs text-ink-muted leading-relaxed mt-3 line-clamp-3 min-h-[3.75rem]">{{ m.description }}</p>
                    </div>

                    <!-- Faixas em destaque -->
                    <div class="grid grid-cols-2 divide-x divide-line border-y border-line bg-surface-sunken/60">
                        <div class="px-3.5 py-3 min-w-0">
                            <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-0.5">Valor médio</p>
                            <p class="font-mono tabular-nums font-bold text-[13px] leading-snug text-ink whitespace-nowrap"
                                :class="fmtValueRange(m) ? '' : 'text-ink-subtle font-normal'">
                                {{ fmtValueRange(m) || 'A definir' }}
                            </p>
                        </div>
                        <div class="px-3.5 py-3 min-w-0">
                            <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-0.5">Metragem</p>
                            <p class="font-mono tabular-nums font-bold text-[13px] leading-snug text-ink whitespace-nowrap"
                                :class="fmtAreaRange(m) ? '' : 'text-ink-subtle font-normal'">
                                {{ fmtAreaRange(m) || 'A definir' }}
                            </p>
                        </div>
                    </div>

                    <div class="p-4 sm:px-5 pt-3 flex-1">
                        <div v-if="m.items?.length" class="flex flex-wrap content-start gap-1.5">
                            <span v-for="item in m.items.slice(0, 5)" :key="item"
                                class="px-2 py-0.5 rounded-md bg-surface-sunken border border-line text-micro text-ink-muted">{{ item }}</span>
                            <span v-if="m.items.length > 5"
                                class="px-2 py-0.5 rounded-md border border-dashed border-line text-micro text-ink-subtle">
                                +{{ m.items.length - 5 }} itens
                            </span>
                        </div>
                        <p v-else class="text-xs text-ink-subtle">Sem itens cadastrados.</p>
                    </div>
                </Surface>

                <div v-if="!store.models.length" class="sm:col-span-2 xl:col-span-4">
                    <Surface variant="raised" padding="none">
                        <EmptyState icon="fas fa-shapes" title="Nenhum modelo cadastrado"
                            description="Cadastre os stands modelo (categorias) com o valor médio e os itens de cada padrão." />
                    </Surface>
                </div>
            </div>

            <!-- ══ Aba Categorias de gasto ══ -->
            <div v-else-if="tab === 'categorias'" class="flex flex-col gap-5">
                <SourceSettingsCard :can-configure="canConfigure" />

                <Surface variant="raised" padding="sm">
                    <p class="text-sm text-ink-muted">
                        Cada conta do plano <span class="font-mono text-ink">2.02.07 - Despesas com Stand</span> cai numa
                        categoria, e a categoria PUXA o tipo do gasto: <span class="text-series-1 font-medium">construção</span>,
                        <span class="text-series-2 font-medium">recorrência</span> ou
                        <span class="text-series-3 font-medium">esporádica</span>. É o padrão de todos os stands, e o tipo
                        se edita aqui — dentro de cada stand ainda dá para reclassificar um lançamento específico.
                    </p>
                </Surface>

                <DataTable :columns="colunasCategoria" :rows="store.categories" row-key="id"
                    :clickable="canConfigure" density="comfortable" sort-by="sort_order" sort-dir="asc"
                    empty-icon="fas fa-tags" empty-title="Nenhuma categoria"
                    empty-text="Sem categoria, todo lançamento fica sem tipo até alguém marcar um a um."
                    @row-click="(row) => canConfigure && openEditCategory(row)">
                    <template #cell-name="{ row }">
                        <span class="inline-flex items-center gap-2 min-w-0" :title="row.description || row.name">
                            <span class="w-2 h-2 rounded-full shrink-0" :class="kindMeta(row.kind).dot"></span>
                            <span class="truncate font-medium text-ink">{{ row.name }}</span>
                        </span>
                    </template>
                    <template #cell-kind="{ row }">
                        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-micro font-medium"
                            :class="[kindMeta(row.kind).bg, kindMeta(row.kind).border, kindMeta(row.kind).text]"
                            :title="kindMeta(row.kind).hint">
                            <i :class="kindMeta(row.kind).icon" class="text-micro"></i>{{ kindMeta(row.kind).label }}
                        </span>
                    </template>
                    <template #cell-conta_codes="{ row }">
                        <span class="inline-flex flex-wrap gap-1"
                            :title="`Contas do Sienge nesta categoria: ${(row.conta_codes || []).join(', ') || 'nenhuma'}`">
                            <span v-for="code in row.conta_codes" :key="code"
                                class="px-1.5 py-0.5 rounded-md bg-surface-sunken border border-line text-micro font-mono text-ink-muted">
                                {{ code }}
                            </span>
                            <span v-if="!row.conta_codes?.length" class="text-micro text-ink-subtle">Sem conta</span>
                        </span>
                    </template>
                    <template v-if="canConfigure" #actions="{ row }">
                        <IconButton icon="fas fa-pen" size="sm" variant="ghost" label="Editar categoria"
                            @click="openEditCategory(row)" />
                    </template>
                </DataTable>
            </div>

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
import { useSalesStandStore, STATUS_META, kindMeta } from '@/stores/Marketing/SalesStand/salesStandStore';
import { useCan } from '@/composables/useCan';
import { fmtBRL, fmtValueRange, fmtAreaRange, sortModelsByTier } from './standFormat';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import DataTable from '@/components/UI/DataTable.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Favorite from '@/components/config/Favorite.vue';

import ModelFormModal from './ModelFormModal.vue';
import StandFormModal from './StandFormModal.vue';
import CategoryFormModal from './CategoryFormModal.vue';
import SourceSettingsCard from './components/SourceSettingsCard.vue';
import StandCard from './components/StandCard.vue';
import AuditTab from './components/AuditTab.vue';

const store = useSalesStandStore();
const router = useRouter();
const can = useCan('/marketing/stand-vendas');

const tab = ref('stands');
const standView = ref('tabela');
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

const statusMeta = (s) => STATUS_META[s] || STATUS_META.draft;
// Modelos por porte (Standard → Premium), não alfabético.
const sortedModels = computed(() => sortModelsByTier(store.models));

// Stand com muitos centros de custo não pode esticar a coluna (o title da
// célula, que a DataTable põe sozinha, mostra a lista inteira).
function resumoCc(s) {
    const nomes = s.cost_center_names || [];
    if (!nomes.length) return '-';
    if (nomes.length <= 2) return nomes.join(', ');
    return `${nomes[0]} e mais ${nomes.length - 1}`;
}

const colunasStand = computed(() => [
    { key: 'name', label: 'Stand', priority: 1, sortable: true },
    {
        key: 'model', label: 'Modelo', priority: 2, sortable: true,
        value: (r) => r.model?.name || '-',
    },
    {
        key: 'cost_centers', label: 'Centros de custo', priority: 2, sortable: true,
        value: (r) => resumoCc(r),
    },
    {
        key: 'spend_total', label: 'Gasto total', priority: 1, numeric: true, sortable: true,
        format: (v) => fmtBRL(v),
    },
    {
        key: 'construction_value', label: 'Construção', priority: 1, numeric: true, sortable: true,
        format: (v) => fmtBRL(v), class: 'text-series-1',
    },
    {
        key: 'maintenance_value', label: 'Recorrência', priority: 2, numeric: true, sortable: true,
        format: (v) => fmtBRL(v), class: 'text-series-2',
    },
    {
        key: 'sporadic_value', label: 'Esporádico', priority: 3, numeric: true, sortable: true,
        format: (v) => fmtBRL(v), class: 'text-series-3',
    },
    {
        key: 'recurring_monthly', label: 'Por mês', priority: 2, numeric: true, sortable: true,
        format: (v) => fmtBRL(v),
    },
    {
        key: 'unclassified_value', label: 'Sem classificação', priority: 3, numeric: true, sortable: true,
        format: (v) => fmtBRL(v),
    },
    { key: 'status', label: 'Status', priority: 1, sortable: true, truncate: false },
]);

const colunasCategoria = computed(() => [
    { key: 'name', label: 'Categoria', priority: 1, sortable: true },
    {
        key: 'kind', label: 'Tipo', priority: 1, sortable: true, truncate: false,
        sortValue: (r) => kindMeta(r.kind).label,
    },
    { key: 'conta_codes', label: 'Contas do Sienge', priority: 2, truncate: false },
    { key: 'description', label: 'O que entra aqui', priority: 2 },
    { key: 'sort_order', label: 'Ordem', priority: 3, numeric: true, sortable: true },
]);

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
