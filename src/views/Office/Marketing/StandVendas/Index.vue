<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="full">

            <PageHeader icon="fas fa-store"
                subtitle="Stands modelo com valor médio e itens, e os stands reais com o custo apurado ao vivo do Sienge (Despesas com Stand).">
                <template #title>
                    Stand de Vendas
                    <Favorite :router="'/marketing/stand-vendas'" :section="'Stand de Vendas'" />
                </template>
                <template #actions>
                    <PageHelp storage-key="marketing-sales-stand" title="Como usar o Stand de Vendas"
                        intro="Aqui o Marketing organiza os stands: primeiro os modelos (categorias com valor médio e itens), depois os stands reais vinculados aos centros de custo do Sienge."
                        :steps="[
                            { title: 'Crie os modelos', text: 'Na aba Modelos, cadastre as categorias de stand com o valor médio e a lista de itens que cada padrão possui.' },
                            { title: 'Cadastre os stands', text: 'Na aba Stands, crie cada stand real, atribua um modelo e vincule 1 ou mais centros de custo.' },
                            { title: 'Acompanhe o custo', text: 'O gasto soma automaticamente os pagamentos do plano Despesas com Stand (2.02.07) dos centros de custo vinculados.' },
                            { title: 'Defina o stand', text: 'Quando a construção terminar, abra o stand e clique em Definir: o valor é congelado e o gasto posterior vira manutenção.' },
                        ]"
                        :tips="[
                            'Um centro de custo pode ser vinculado a mais de um stand, mas o normal é 1 stand por empreendimento.',
                            'No detalhe do stand você vê o gasto por conta (aluguel, energia, manutenção...) e por mês.',
                        ]" />
                    <Button v-if="tab === 'modelos'" variant="primary" size="sm" icon="fas fa-plus" @click="openNewModel">
                        Novo modelo
                    </Button>
                    <Button v-else variant="primary" size="sm" icon="fas fa-plus" @click="openNewStand">
                        Novo stand
                    </Button>
                </template>
            </PageHeader>

            <div class="mb-5">
                <SegmentedControl v-model="tab" :options="[
                    { value: 'stands', label: 'Stands', icon: 'fas fa-store', count: store.stands.length },
                    { value: 'modelos', label: 'Modelos', icon: 'fas fa-shapes', count: store.models.length },
                ]" />
            </div>

            <Surface v-if="store.error" variant="raised" padding="sm" class="mb-5 border-red-500/30 bg-red-500/10">
                <div class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <i class="fas fa-circle-exclamation"></i>{{ store.error }}
                </div>
            </Surface>
            <Surface v-if="tab === 'stands' && store.spendUnavailable" variant="raised" padding="sm"
                class="mb-5 border-amber-500/30 bg-amber-500/10">
                <div class="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <i class="fas fa-triangle-exclamation"></i>
                    Sienge indisponível no momento — os valores de gasto estão zerados e voltam quando a base responder.
                </div>
            </Surface>

            <!-- ══ Aba Stands ══ -->
            <Surface v-if="tab === 'stands'" variant="raised" padding="none" class="overflow-hidden">
                <!-- Desktop: tabela -->
                <div class="hidden md:block overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-line text-left">
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted">Stand</th>
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted">Modelo</th>
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted">Centros de custo</th>
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted text-right">Gasto total</th>
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted text-right">Construção</th>
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted text-right">Manutenção</th>
                                <th class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-muted">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(s, i) in store.stands" :key="s.id"
                                class="border-b border-line/60 hover:bg-surface-sunken/60 cursor-pointer transition-colors animate-fade-in [animation-fill-mode:backwards]"
                                :style="{ animationDelay: Math.min(i, 12) * 30 + 'ms' }"
                                @click="openDetail(s)">
                                <td class="px-4 py-3 font-semibold text-ink">{{ s.name }}</td>
                                <td class="px-4 py-3 text-ink-muted">{{ s.model?.name || '-' }}</td>
                                <td class="px-4 py-3 text-ink-muted">
                                    <span class="line-clamp-1">{{ s.cost_center_names?.join(', ') || '-' }}</span>
                                </td>
                                <td class="px-4 py-3 text-right font-mono tabular-nums text-ink whitespace-nowrap">{{ fmtBRL(s.spend_total) }}</td>
                                <td class="px-4 py-3 text-right font-mono tabular-nums text-ink-muted whitespace-nowrap">
                                    {{ s.status === 'defined' ? fmtBRL(s.construction_value) : '-' }}
                                </td>
                                <td class="px-4 py-3 text-right font-mono tabular-nums text-ink-muted whitespace-nowrap">
                                    {{ s.status === 'defined' ? fmtBRL(s.maintenance_value) : '-' }}
                                </td>
                                <td class="px-4 py-3">
                                    <Badge :variant="statusMeta(s.status).variant" size="sm">
                                        <i :class="statusMeta(s.status).icon" class="mr-1 text-[10px]"></i>
                                        {{ statusMeta(s.status).label }}
                                    </Badge>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Mobile: cards -->
                <div class="md:hidden divide-y divide-line">
                    <button v-for="(s, i) in store.stands" :key="s.id" type="button"
                        class="w-full text-left p-4 flex flex-col gap-2 hover:bg-surface-sunken/60 transition-colors animate-slide-up [animation-fill-mode:backwards]"
                        :style="{ animationDelay: Math.min(i, 12) * 30 + 'ms' }"
                        @click="openDetail(s)">
                        <div class="flex items-center justify-between gap-2">
                            <span class="font-semibold text-ink truncate">{{ s.name }}</span>
                            <Badge :variant="statusMeta(s.status).variant" size="sm">
                                <i :class="statusMeta(s.status).icon" class="mr-1 text-[10px]"></i>
                                {{ statusMeta(s.status).label }}
                            </Badge>
                        </div>
                        <div class="flex items-center justify-between gap-2">
                            <span class="text-xs text-ink-muted truncate">{{ s.model?.name || 'Sem modelo' }}</span>
                            <span class="font-mono font-bold tabular-nums text-ink whitespace-nowrap">{{ fmtBRL(s.spend_total) }}</span>
                        </div>
                        <div v-if="s.status === 'defined'" class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                            <span>Construção: <span class="font-mono tabular-nums">{{ fmtBRL(s.construction_value) }}</span></span>
                            <span>Manutenção: <span class="font-mono tabular-nums">{{ fmtBRL(s.maintenance_value) }}</span></span>
                        </div>
                        <div class="text-xs text-ink-subtle truncate">
                            <i class="fas fa-building text-[10px] mr-1"></i>{{ s.cost_center_names?.join(', ') || '-' }}
                        </div>
                    </button>
                </div>

                <EmptyState v-if="!store.loading && !store.stands.length" icon="fas fa-store"
                    title="Nenhum stand cadastrado"
                    description="Crie os modelos na aba ao lado e cadastre aqui os stands reais com seus centros de custo." />
                <div v-if="store.loading" class="py-10 flex justify-center"><Spinner /></div>
            </Surface>

            <!-- ══ Aba Modelos ══ -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Surface v-for="(m, i) in store.models" :key="m.id" variant="raised" padding="md" interactive
                    class="cursor-pointer animate-fade-in [animation-fill-mode:backwards]"
                    :style="{ animationDelay: Math.min(i, 12) * 30 + 'ms' }"
                    @click="openEditModel(m)">
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                            <p class="font-semibold text-ink truncate">{{ m.name }}</p>
                            <p v-if="m.description" class="text-xs text-ink-muted mt-0.5 line-clamp-2">{{ m.description }}</p>
                        </div>
                        <Badge variant="neutral" size="sm">{{ m.stands_count }} stand{{ m.stands_count === 1 ? '' : 's' }}</Badge>
                    </div>
                    <div class="mt-3 flex items-end justify-between gap-3">
                        <div class="min-w-0">
                            <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Valor médio</p>
                            <p class="font-mono tabular-nums font-bold text-ink text-lg truncate">{{ fmtRange(m) }}</p>
                        </div>
                        <div v-if="fmtArea(m)" class="text-right shrink-0">
                            <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Metragem</p>
                            <p class="font-mono tabular-nums font-bold text-ink text-lg">{{ fmtArea(m) }}</p>
                        </div>
                    </div>
                    <div v-if="m.items?.length" class="flex flex-wrap gap-1.5 mt-3">
                        <span v-for="item in m.items.slice(0, 6)" :key="item"
                            class="px-2 py-0.5 rounded-md bg-surface-sunken border border-line text-[11px] text-ink-muted">{{ item }}</span>
                        <span v-if="m.items.length > 6" class="px-2 py-0.5 text-[11px] text-ink-subtle">
                            +{{ m.items.length - 6 }}
                        </span>
                    </div>
                    <p v-else class="text-xs text-ink-subtle mt-3">Sem itens cadastrados.</p>
                </Surface>

                <div v-if="!store.models.length" class="sm:col-span-2 lg:col-span-3">
                    <Surface variant="raised" padding="none">
                        <EmptyState icon="fas fa-shapes" title="Nenhum modelo cadastrado"
                            description="Cadastre os stands modelo (categorias) com o valor médio e os itens de cada padrão." />
                    </Surface>
                </div>
            </div>

        </PageContainer>

        <ModelFormModal :open="modelModalOpen" :model="editingModel" @close="modelModalOpen = false" />
        <StandFormModal :open="standModalOpen" :stand="editingStand" @close="standModalOpen = false" />
        <StandDetailModal :open="detailModalOpen" :stand="detailStand"
            @close="closeDetail" @edit="editFromDetail" />
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useSalesStandStore, STATUS_META } from '@/stores/Marketing/SalesStand/salesStandStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Favorite from '@/components/config/Favorite.vue';

import ModelFormModal from './ModelFormModal.vue';
import StandFormModal from './StandFormModal.vue';
import StandDetailModal from './StandDetailModal.vue';

const store = useSalesStandStore();
const tab = ref('stands');

const modelModalOpen = ref(false);
const editingModel = ref(null);
const standModalOpen = ref(false);
const editingStand = ref(null);
const detailModalOpen = ref(false);
const detailStand = ref(null);

const statusMeta = (s) => STATUS_META[s] || STATUS_META.draft;
const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
// Faixa de valor médio do modelo: "de X até Y", "X+" (aberta) ou valor único.
function fmtRange(m) {
    const min = Number(m?.avg_value_min) || 0;
    const max = Number(m?.avg_value_max) || 0;
    if (min && max && min !== max) return `${fmtBRL(min)} a ${fmtBRL(max)}`;
    if (min && !max) return `${fmtBRL(min)}+`;
    return fmtBRL(max || min);
}
// Faixa de metragem: "14 a 22 m²", "80+ m²" (aberta) ou valor único.
function fmtArea(m) {
    const min = Number(m?.avg_area_min) || 0;
    const max = Number(m?.avg_area_max) || 0;
    if (!min && !max) return '';
    if (min && max && min !== max) return `${min} a ${max} m²`;
    if (min && !max) return `${min}+ m²`;
    return `${max || min} m²`;
}

function openNewModel() { editingModel.value = null; modelModalOpen.value = true; }
function openEditModel(m) { editingModel.value = m; modelModalOpen.value = true; }
function openNewStand() { editingStand.value = null; standModalOpen.value = true; }
function openDetail(s) { detailStand.value = s; detailModalOpen.value = true; }
function closeDetail() { detailModalOpen.value = false; detailStand.value = null; }
function editFromDetail(s) {
    detailModalOpen.value = false;
    editingStand.value = s;
    standModalOpen.value = true;
}

onMounted(async () => {
    await store.fetchMeta();
    await store.fetchStands();
});
</script>
