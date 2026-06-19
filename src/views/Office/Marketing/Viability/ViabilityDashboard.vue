<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="full">

            <PageHeader icon="fas fa-scale-balanced"
                subtitle="Quanto cada empreendimento pode gastar em marketing por unidade — orçamento de vida útil + Custo Loja, gasto real e estoque.">
                <template #title>
                    Viabilidade de Marketing
                    <Favorite :router="'/marketing/viability'" :section="'Viabilidade'" />
                </template>
                <template #actions>
                    <Button v-if="isAdmin" variant="ghost" size="sm" icon="fas fa-sliders-h"
                        @click="settingsOpen = true">
                        Departamentos
                    </Button>
                    <Button variant="primary" size="sm" icon="fas fa-rotate" :loading="store.isLoading"
                        @click="load">
                        Atualizar
                    </Button>
                </template>
            </PageHeader>

            <!-- Filtros -->
            <Surface variant="raised" padding="md" class="mb-5">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                    <div>
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 flex items-center gap-1.5">
                            <i class="far fa-calendar-alt text-ink-subtle text-[10px]"></i>
                            Mês de competência
                        </label>
                        <Input v-model="month" type="month" />
                    </div>

                    <div class="lg:col-span-2">
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 flex items-center gap-1.5">
                            <i class="fas fa-city text-ink-subtle text-[10px]"></i>
                            Empreendimento(s)
                        </label>
                        <MultiSelector :model-value="selectedCompanies"
                            @update:modelValue="v => selectedCompanies = Array.isArray(v) ? v : []"
                            :options="companyOptions" placeholder="Todos os empreendimentos" :page-size="200"
                            :select-all="true" />
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 flex items-center gap-1.5">
                            <i class="fas fa-traffic-light text-ink-subtle text-[10px]"></i>
                            Status do mês
                        </label>
                        <Select v-model="statusFilter" :options="statusOptions" placeholder="(Todos)" />
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 flex items-center gap-1.5">
                            <i class="fas fa-layer-group text-ink-subtle text-[10px]"></i>
                            Categoria
                        </label>
                        <Select v-model="categoryFilter" :options="categoryOptions" placeholder="(Todas)" />
                    </div>
                </div>

                <Surface v-if="store.error" variant="raised" padding="sm" class="mt-3 border-red-500/30 bg-red-500/10">
                    <div class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                        <i class="fas fa-circle-exclamation"></i>{{ store.error }}
                    </div>
                </Surface>
            </Surface>

            <!-- KPIs -->
            <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
                <Surface variant="raised" padding="md" class="border-accent/20 bg-accent-soft/40">
                    <div class="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-accent mb-2">
                        <i class="fas fa-wallet"></i> Orçamento
                    </div>
                    <div class="text-xl font-bold text-ink font-mono tabular-nums">{{ fmtBRL(totals.budget) }}</div>
                    <div class="text-[10px] text-ink-subtle mt-1">Vida útil + Loja {{ fmtBRL(totals.loja) }}</div>
                </Surface>

                <Surface variant="raised" padding="md">
                    <div class="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-2">
                        <i class="fas fa-fire text-amber-500"></i> Gasto marketing
                    </div>
                    <div class="text-xl font-bold text-ink font-mono tabular-nums">{{ fmtBRL(totals.spent) }}</div>
                    <div class="mt-1.5">
                        <div class="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                            <div class="h-full rounded-full transition-all" :class="pctBarClass(totals.pctInvested)"
                                :style="{ width: Math.min(100, totals.pctInvested * 100) + '%' }"></div>
                        </div>
                        <div class="text-[10px] text-ink-subtle mt-1">{{ fmtPct(totals.pctInvested) }} investido</div>
                    </div>
                </Surface>

                <Surface variant="raised" padding="md"
                    :class="totals.saldo >= 0 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'">
                    <div class="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-2">
                        <i class="fas fa-piggy-bank text-emerald-500"></i> Saldo
                    </div>
                    <div class="text-xl font-bold font-mono tabular-nums" :class="moneyClass(totals.saldo)">
                        {{ fmtBRL(totals.saldo) }}
                    </div>
                    <div class="text-[10px] text-ink-subtle mt-1">Orçamento − gasto</div>
                </Surface>

                <Surface variant="raised" padding="md">
                    <div class="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-2">
                        <i class="fas fa-bullseye text-accent"></i> Recom. {{ monthLabel }}
                    </div>
                    <div class="text-xl font-bold text-ink font-mono tabular-nums">{{ fmtBRL(totals.recMonth) }}</div>
                    <div class="text-[10px] text-ink-subtle mt-1">Gasto no mês: {{ fmtBRL(totals.monthSpent) }}</div>
                </Surface>

                <Surface variant="raised" padding="md">
                    <div class="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-2">
                        <i class="fas fa-warehouse text-emerald-500"></i> Estoque
                    </div>
                    <div class="text-xl font-bold text-ink font-mono tabular-nums">{{ totals.available }} <span class="text-xs font-normal text-ink-subtle">unid.</span></div>
                    <div class="text-[10px] text-ink-subtle mt-1">Disp. p/ marketing · {{ totals.sold }} vendidas</div>
                </Surface>
            </div>

            <!-- Tabela -->
            <Surface variant="raised" padding="none" class="overflow-hidden">
                <div class="px-5 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40 flex items-center justify-between flex-wrap gap-2">
                    <h3 class="text-base font-semibold text-ink flex items-center gap-2">
                        <i class="fas fa-table text-emerald-500"></i>
                        Empreendimentos
                    </h3>
                    <span class="text-xs text-ink-muted">
                        <span class="font-mono tabular-nums">{{ activeItems.length }}</span> empresa(s)
                    </span>
                </div>

                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="bg-surface-sunken/60 border-b border-line">
                            <tr>
                                <th class="px-5 py-3 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Empresa</th>
                                <th class="px-5 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Orçamento</th>
                                <th class="px-5 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Gasto</th>
                                <th class="px-5 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Saldo</th>
                                <th class="px-5 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Mês {{ monthLabel }}</th>
                                <th class="px-5 py-3 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Estoque</th>
                                <th class="px-5 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-line">
                            <tr v-for="item in activeItems" :key="item.companyId ?? item.erpId"
                                class="hover:bg-surface-hover/40 transition-colors align-top">
                                <!-- EMPRESA -->
                                <td class="px-5 py-3">
                                    <div class="flex items-start gap-3">
                                        <div class="h-10 w-10 mt-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                            <i class="fas fa-building"></i>
                                        </div>
                                        <div class="min-w-0">
                                            <div class="text-sm font-semibold text-ink flex items-center gap-2">
                                                {{ item.enterpriseName || '—' }}
                                                <button v-if="isAdmin" @click="openEnterpriseSettings(item)"
                                                    class="text-ink-subtle hover:text-accent transition-colors"
                                                    title="Configurar empresa (bloqueadas / departamentos)">
                                                    <i class="fas fa-gear text-[11px]"></i>
                                                </button>
                                            </div>
                                            <div class="text-xs text-ink-subtle font-mono">
                                                Empresa {{ item.companyId || item.displayId || '—' }}
                                                <span v-if="item.header?.costCenterIds?.length">· CC {{ item.header.costCenterIds.join(', ') }}</span>
                                            </div>
                                            <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                <Badge v-if="statusInfo(item)" :variant="statusInfo(item).variant" size="sm">
                                                    <i class="fas" :class="statusInfo(item).icon"></i>
                                                    {{ statusInfo(item).label }}
                                                </Badge>
                                                <Badge :variant="investedVariant(item)" size="sm">
                                                    {{ fmtPct(item.header?.pctInvested) }} investido
                                                </Badge>
                                                <Badge v-if="trendBadge(item)" :variant="trendBadge(item).variant" size="sm"
                                                    v-tippy="trendTip(item)">
                                                    <i class="fas" :class="trendBadge(item).icon"></i>
                                                    {{ trendBadge(item).label }}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <!-- ORÇAMENTO -->
                                <td class="px-5 py-3 text-right whitespace-nowrap">
                                    <div class="text-sm font-bold text-ink font-mono tabular-nums">{{ fmtBRL(item.header?.budgetTotal) }}</div>
                                    <div v-if="item.header?.custoLoja" class="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                                        <i class="fas fa-store text-[8px]"></i> Loja {{ fmtBRL(item.header.custoLoja) }}
                                    </div>
                                    <div class="text-[10px] text-ink-subtle font-mono">{{ fmtBRL(item.header?.plannedCostPerUnit) }}/unid</div>
                                </td>

                                <!-- GASTO -->
                                <td class="px-5 py-3 text-right whitespace-nowrap">
                                    <div class="text-sm font-semibold text-ink font-mono tabular-nums">{{ fmtBRL(item.header?.spentTotal) }}</div>
                                    <div class="text-[10px] mt-0.5">
                                        <Badge :variant="investedVariant(item)" size="sm">{{ fmtPct(item.header?.pctInvested) }}</Badge>
                                    </div>
                                </td>

                                <!-- SALDO -->
                                <td class="px-5 py-3 text-right whitespace-nowrap">
                                    <div class="text-sm font-bold font-mono tabular-nums" :class="moneyClass(item.header?.remainingBudgetTotal)">
                                        {{ fmtBRL(item.header?.remainingBudgetTotal) }}
                                    </div>
                                    <div class="text-[10px] text-ink-subtle font-mono">
                                        real <span :class="realUnitClass(item)">{{ fmtBRL(item.header?.currentRealCostPerUnit) }}</span>/unid
                                    </div>
                                </td>

                                <!-- MÊS -->
                                <td class="px-5 py-3 text-right whitespace-nowrap">
                                    <div class="text-sm font-semibold text-ink font-mono tabular-nums">{{ fmtBRL(item.header?.monthContext?.monthBudget) }}</div>
                                    <div class="text-[10px] text-ink-subtle font-mono">gasto {{ fmtBRL(item.header?.monthContext?.monthSpent) }}</div>
                                    <div class="mt-0.5">
                                        <Badge :variant="monthStatus(item).variant" size="sm">{{ monthStatus(item).label }}</Badge>
                                    </div>
                                </td>

                                <!-- ESTOQUE -->
                                <td class="px-5 py-3 text-center whitespace-nowrap">
                                    <div class="text-sm font-semibold text-ink font-mono tabular-nums">{{ Number(item.header?.availableInventory || 0) }}</div>
                                    <div class="text-[10px] text-ink-subtle mb-1">disponíveis</div>
                                    <div class="flex items-center justify-center gap-1">
                                        <span class="inline-flex items-center gap-0.5 text-[9px] font-mono text-emerald-600 dark:text-emerald-400" v-tippy="'Disponíveis'">
                                            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>{{ Number(item.header?.availableUnits || 0) }}
                                        </span>
                                        <span class="inline-flex items-center gap-0.5 text-[9px] font-mono text-sky-600 dark:text-sky-400" v-tippy="'Reservadas (contam como disponíveis)'">
                                            <span class="h-1.5 w-1.5 rounded-full bg-sky-500"></span>{{ Number(item.header?.reservedUnits || 0) }}
                                        </span>
                                        <span class="inline-flex items-center gap-0.5 text-[9px] font-mono text-ink-subtle" v-tippy="'Bloqueadas'">
                                            <span class="h-1.5 w-1.5 rounded-full bg-ink-subtle/60"></span>{{ Number(item.header?.blockedUnits || 0) }}
                                        </span>
                                        <span class="inline-flex items-center gap-0.5 text-[9px] font-mono text-red-600 dark:text-red-400" v-tippy="'Vendidas'">
                                            <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span>{{ Number(item.header?.soldUnitsStock ?? item.header?.soldUnits ?? 0) }}
                                        </span>
                                    </div>
                                </td>

                                <!-- AÇÕES -->
                                <td class="px-5 py-3 text-right whitespace-nowrap">
                                    <Button variant="secondary" size="sm" icon="fas fa-chart-line" @click="openDetail(item)">
                                        Detalhes
                                    </Button>
                                </td>
                            </tr>

                            <tr v-if="!activeItems.length && !store.isLoading">
                                <td colspan="7" class="px-6 py-12">
                                    <EmptyState icon="fas fa-inbox" title="Nenhum empreendimento com projeção"
                                        description="Ajuste o mês/filtros. Lembre de marcar os departamentos de marketing em Departamentos, senão o gasto aparece zerado." />
                                </td>
                            </tr>
                            <tr v-if="store.isLoading">
                                <td colspan="7" class="px-6 py-10 text-center text-ink-muted text-sm">
                                    <i class="fas fa-circle-notch fa-spin mr-2"></i> Carregando viabilidade...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Surface>
        </PageContainer>

        <!-- Modais admin -->
        <ViabilitySettingsModal :open="settingsOpen" @close="settingsOpen = false" />
        <ViabilityEnterpriseSettingsModal :open="entSettingsOpen" :company="entSettingsTarget"
            @close="entSettingsOpen = false" @saved="load" />

        <!-- Modal de detalhe (série mensal) -->
        <Modal :open="!!detailItem" size="lg" :title="detailItem?.enterpriseName || 'Empreendimento'"
            :subtitle="detailItem ? `Empresa ${detailItem.companyId || detailItem.displayId || '—'} · recomendado vs. gasto por mês` : ''"
            @close="closeDetail">
            <div v-if="detailItem">
                <div class="grid grid-cols-3 gap-3 mb-4">
                    <Surface variant="flat" padding="sm" bordered>
                        <div class="text-[10px] text-ink-subtle uppercase tracking-wider">Orçamento</div>
                        <div class="text-base font-bold text-ink font-mono tabular-nums">{{ fmtBRL(detailItem.header?.budgetTotal) }}</div>
                    </Surface>
                    <Surface variant="flat" padding="sm" bordered>
                        <div class="text-[10px] text-ink-subtle uppercase tracking-wider">Gasto</div>
                        <div class="text-base font-bold text-ink font-mono tabular-nums">{{ fmtBRL(detailItem.header?.spentTotal) }}</div>
                    </Surface>
                    <Surface variant="flat" padding="sm" bordered>
                        <div class="text-[10px] text-ink-subtle uppercase tracking-wider">Saldo/unid a vender</div>
                        <div class="text-base font-bold font-mono tabular-nums" :class="moneyClass(detailItem.header?.saldoPerUnit)">{{ fmtBRL(detailItem.header?.saldoPerUnit) }}</div>
                    </Surface>
                </div>

                <div class="overflow-x-auto rounded-lg border border-line">
                    <table class="min-w-full text-sm">
                        <thead class="bg-surface-sunken/60 border-b border-line">
                            <tr>
                                <th class="px-3 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Mês</th>
                                <th class="px-3 py-2 text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Meta / Vend.</th>
                                <th class="px-3 py-2 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Recomendado</th>
                                <th class="px-3 py-2 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Gasto</th>
                                <th class="px-3 py-2 text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-line">
                            <tr v-for="m in (detailItem.months || [])" :key="m.yearMonth">
                                <td class="px-3 py-2 font-mono text-ink-muted">{{ fmtMonth(m.yearMonth) }}</td>
                                <td class="px-3 py-2 text-center font-mono tabular-nums text-ink-muted">{{ m.unitsTarget }} / {{ m.unitsSoldReal }}</td>
                                <td class="px-3 py-2 text-right font-mono tabular-nums text-ink">{{ fmtBRL(m.recommendedBudget) }}</td>
                                <td class="px-3 py-2 text-right font-mono tabular-nums text-ink">{{ fmtBRL(m.spent) }}</td>
                                <td class="px-3 py-2 text-center">
                                    <Badge :variant="m.status === 'OVER' ? 'danger' : m.status === 'UNDER' ? 'success' : 'neutral'" size="sm">
                                        {{ m.status === 'OVER' ? 'Acima' : m.status === 'UNDER' ? 'Abaixo' : 'No alvo' }}
                                    </Badge>
                                </td>
                            </tr>
                            <tr v-if="!(detailItem.months || []).length">
                                <td colspan="5" class="px-3 py-6 text-center text-ink-subtle text-xs">Sem meses no período selecionado.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <template #footer>
                <Button variant="secondary" @click="closeDetail">Fechar</Button>
            </template>
        </Modal>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import dayjs from 'dayjs';
import { useViabilityStore } from '@/stores/Marketing/Viability/viabilityStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Select from '@/components/UI/Select.vue';
import Input from '@/components/UI/Input.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Modal from '@/components/UI/Modal.vue';
import Favorite from '@/components/config/Favorite.vue';
import ViabilitySettingsModal from './ViabilitySettingsModal.vue';
import ViabilityEnterpriseSettingsModal from './ViabilityEnterpriseSettingsModal.vue';

const store = useViabilityStore();
const auth = useAuthStore();
const isAdmin = computed(() => auth?.user?.role === 'admin');

const month = ref(store.selectedMonth);
const statusFilter = ref(store.statusFilter);
const selectedCompanies = ref([]);

const settingsOpen = ref(false);
const entSettingsOpen = ref(false);
const entSettingsTarget = ref(null);
const detailItem = ref(null);

const statusOptions = [
    { value: 'all', label: '(Todos)' },
    { value: 'UNDER', label: 'Abaixo do orçamento (mês)' },
    { value: 'ON_TRACK', label: 'No alvo (mês)' },
    { value: 'OVER', label: 'Acima do orçamento (mês)' },
];

const categoryFilter = ref('all');
const categoryOptions = [
    { value: 'all', label: '(Todas)' },
    { value: 'em_andamento', label: 'Em andamento' },
    { value: 'previsao_futura', label: 'Previsão Futura' },
    { value: 'concluido', label: 'Concluído' },
];

/* ---------- formatadores ---------- */
function fmtBRL(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtMonth(ym) { return ym ? dayjs(`${ym}-01`).format('MM/YYYY') : ''; }
function fmtPct(v) { return `${(Number(v || 0) * 100).toFixed(0)}%`; }
const monthLabel = computed(() => fmtMonth(store.selectedMonth) || 'mês');

/* ---------- seleção / lista ---------- */
function companyLabel(item) {
    return `${item.enterpriseName || '—'} (Empresa ${item.companyId || item.displayId || '?'})`;
}
const companyOptions = computed(() => store.sorted.map(companyLabel));
const activeItems = computed(() => {
    let list = store.sorted;
    if (selectedCompanies.value.length) {
        const set = new Set(selectedCompanies.value);
        list = list.filter((i) => set.has(companyLabel(i)));
    }
    if (categoryFilter.value !== 'all') {
        list = list.filter((i) => i.header?.status === categoryFilter.value);
    }
    return list;
});

/* ---------- KPIs (sobre os itens ativos) ---------- */
const totals = computed(() => {
    let budget = 0, spent = 0, saldo = 0, loja = 0, recMonth = 0, monthSpent = 0, available = 0, sold = 0;
    for (const it of activeItems.value) {
        const h = it.header || {};
        budget += Number(h.budgetTotal || 0);
        spent += Number(h.spentTotal || 0);
        saldo += Number(h.remainingBudgetTotal || 0);
        loja += Number(h.custoLoja || 0);
        recMonth += Number(h.monthContext?.monthBudget || 0);
        monthSpent += Number(h.monthContext?.monthSpent || 0);
        available += Number(h.availableInventory || 0);
        sold += Number(h.soldUnitsRealYtd || 0);
    }
    return { budget, spent, saldo, loja, recMonth, monthSpent, available, sold, pctInvested: budget > 0 ? spent / budget : 0 };
});

/* ---------- helpers de cor/saúde ---------- */
function moneyClass(v) {
    const n = Number(v || 0);
    return n < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';
}
function pctBarClass(p) {
    const v = Number(p || 0);
    if (v > 1) return 'bg-red-500';
    if (v >= 0.75) return 'bg-amber-500';
    return 'bg-emerald-500';
}
function investedVariant(item) {
    const p = Number(item.header?.pctInvested || 0);
    return p > 1 ? 'danger' : p >= 0.75 ? 'warning' : 'success';
}
function realUnitClass(item) {
    const planned = Number(item.header?.plannedCostPerUnit || 0);
    const real = Number(item.header?.currentRealCostPerUnit || 0);
    if (!planned || !real) return 'text-ink-muted';
    return real > planned ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';
}
function monthStatus(item) {
    const s = item.status; // do store: OVER | UNDER | ON_TRACK
    if (s === 'OVER') return { variant: 'danger', label: 'Acima' };
    if (s === 'UNDER') return { variant: 'success', label: 'Abaixo' };
    return { variant: 'neutral', label: 'No alvo' };
}
function trendBadge(item) {
    const d = item.header?.trendDirection;
    if (d === 'improving') return { variant: 'success', icon: 'fa-arrow-trend-down', label: 'melhorando' };
    if (d === 'worsening') return { variant: 'danger', icon: 'fa-arrow-trend-up', label: 'piorando' };
    return null;
}
function trendTip(item) {
    const h = item.header || {};
    return `Gasto no mês: ${fmtBRL(h.monthContext?.monthSpent)} • Média mensal: ${fmtBRL(h.avgMonthlySpend)}`;
}

// categoria/status do empreendimento (com override do admin via header.status)
function statusInfo(item) {
    const s = item.header?.status;
    if (s === 'concluido') return { label: 'Concluído', variant: 'neutral', icon: 'fa-circle-check' };
    if (s === 'em_andamento') return { label: 'Em andamento', variant: 'info', icon: 'fa-person-running' };
    if (s === 'previsao_futura') return { label: 'Previsão Futura', variant: 'warning', icon: 'fa-calendar-day' };
    return null;
}

/* ---------- ações ---------- */
function openEnterpriseSettings(item) { entSettingsTarget.value = item; entSettingsOpen.value = true; }
function openDetail(item) { detailItem.value = item; }
function closeDetail() { detailItem.value = null; }

async function load() {
    const ym = month.value || dayjs().format('YYYY-MM');
    store.setYear(Number(String(ym).slice(0, 4)));
    store.setMonth(month.value);
    store.setStatusFilter(statusFilter.value);
    await store.fetchList();
}

watch(month, (v) => {
    store.setMonth(v);
    if (v && String(v).length >= 4) store.setYear(Number(String(v).slice(0, 4)));
});
watch(statusFilter, (v) => store.setStatusFilter(v));

onMounted(load);
</script>
