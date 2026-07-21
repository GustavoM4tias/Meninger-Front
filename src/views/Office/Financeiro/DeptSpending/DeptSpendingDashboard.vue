<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="full">

            <PageHeader icon="fas fa-chart-pie"
                subtitle="Até o mês escolhido: quanto cada empreendimento já gastou (acumulado) e quanto ainda tem pela frente para comercializar.">
                <template #title>
                    Gastos por Departamento
                    <Favorite :router="'/financeiro/gastos-departamento'" :section="'Gastos por Departamento'" />
                </template>
                <template #actions>
                    <PageHelp storage-key="gastos-departamento"
                        title="Como usar - Gastos por Departamento"
                        intro="Escolha um mês de referência. A tela mostra o gasto acumulado até ele (para trás) e o que resta a comercializar dali em diante (projeção futura ou estoque)."
                        :steps="helpSteps" :tips="helpTips" />
                    <Button v-if="isAdmin" variant="ghost" size="sm" icon="fas fa-sliders-h"
                        @click="settingsOpen = true">
                        Departamentos
                    </Button>
                </template>
            </PageHeader>

            <!-- Aviso de rascunho (admin) -->
            <div v-if="isAdmin"
                class="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                <i class="fas fa-pen-ruler mt-0.5"></i>
                <span>
                    <strong>Modo backoffice.</strong> Você vê rascunhos e liberados. A diretoria só enxerga os
                    <strong>liberados</strong>. Libere cada empreendimento quando os números estiverem 100%.
                </span>
            </div>

            <!-- Filtros (padrão da projeção: barra recolhível) -->
            <section class="mb-5 rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
                <div class="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-line bg-surface-sunken/40 rounded-t-xl">
                    <button @click="filtersExpanded = !filtersExpanded"
                        class="flex items-center gap-2 text-sm font-medium text-ink hover:text-accent transition-colors">
                        <i class="fas fa-filter text-xs text-ink-muted"></i>
                        <span>Filtros</span>
                        <Badge v-if="activeFiltersCount" variant="accent" size="sm">
                            {{ activeFiltersCount }} ativo{{ activeFiltersCount > 1 ? 's' : '' }}
                        </Badge>
                        <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
                            :class="{ 'rotate-180': filtersExpanded }"></i>
                    </button>
                    <span class="ml-3 hidden md:inline text-xs text-ink-subtle">
                        Referência: <strong class="text-ink-muted font-mono">{{ monthLabel }}</strong>
                    </span>
                    <div class="ml-auto flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="clearFilters">
                            <span class="hidden sm:inline">Limpar</span>
                        </Button>
                        <Button size="sm" icon="fas fa-magnifying-glass" :loading="store.isLoading" @click="applyFilters">
                            <span class="hidden sm:inline">Filtrar</span>
                        </Button>
                    </div>
                </div>

                <div v-show="filtersExpanded" class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Input v-model="refMonth" type="month" label="Mês de referência" />

                    <div class="lg:col-span-2">
                        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
                            <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>Empreendimento(s)
                        </label>
                        <MultiSelector :model-value="selectedCompanies"
                            @update:modelValue="v => selectedCompanies = Array.isArray(v) ? v : []"
                            :options="companyOptions" placeholder="Todos" :page-size="200" :select-all="true" />
                    </div>

                    <div v-if="isAdmin">
                        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
                            <i class="fas fa-circle-check text-[10px] mr-1 text-ink-subtle"></i>Liberação
                        </label>
                        <Select v-model="releaseFilter" :options="releaseOptions" placeholder="(Todos)" />
                    </div>
                </div>
            </section>

            <Surface v-if="store.error" variant="raised" padding="sm" class="mb-4 border-red-500/30 bg-red-500/10">
                <div class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <i class="fas fa-circle-exclamation"></i>{{ store.error }}
                </div>
            </Surface>

            <!-- Cards: passado (acumulado) × futuro (a comercializar) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                <div v-for="c in cards" :key="c.key"
                    class="flex items-center gap-3 p-4 rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
                    <span class="h-11 w-11 rounded-xl grid place-items-center text-base shrink-0" :class="c.accent">
                        <i :class="c.icon"></i>
                    </span>
                    <div class="min-w-0 flex-1">
                        <p class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">{{ c.label }}</p>
                        <p class="text-2xl font-semibold tabular-nums tracking-tight leading-tight mt-0.5 truncate"
                            :class="c.valueClass || 'text-ink'">{{ c.value }}</p>
                        <p class="text-[11px] text-ink-muted mt-0.5 truncate" :title="c.sub">{{ c.sub }}</p>
                    </div>
                </div>
            </div>

            <!-- Tabela -->
            <Surface variant="raised" padding="none" class="overflow-hidden">
                <div class="px-5 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40 flex items-center justify-between flex-wrap gap-2">
                    <h3 class="text-base font-semibold text-ink flex items-center gap-2">
                        <i class="fas fa-timeline text-emerald-500"></i>
                        Acumulado até {{ monthLabel }} · a comercializar pela frente
                    </h3>
                    <span class="text-xs text-ink-muted">
                        <span class="font-mono tabular-nums">{{ sortedItems.length }}</span> empreendimento(s)
                    </span>
                </div>

                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="bg-surface-sunken/60 border-b border-line">
                            <tr>
                                <th @click="handleSort('empresa')" class="px-5 py-3 text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle cursor-pointer hover:text-ink transition-colors select-none">
                                    <div class="flex items-center gap-1.5">Empreendimento <i :class="sortIcon('empresa')" class="text-[9px]"></i></div>
                                </th>
                                <th @click="handleSort('acumulado')" class="px-5 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle cursor-pointer hover:text-ink transition-colors select-none">
                                    <div class="flex items-center justify-end gap-1.5">Gasto acumulado <i :class="sortIcon('acumulado')" class="text-[9px]"></i></div>
                                </th>
                                <th @click="handleSort('orcamento')" class="px-5 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle cursor-pointer hover:text-ink transition-colors select-none">
                                    <div class="flex items-center justify-end gap-1.5">Orçamento <i :class="sortIcon('orcamento')" class="text-[9px]"></i></div>
                                </th>
                                <th @click="handleSort('saldo')" class="px-5 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle cursor-pointer hover:text-ink transition-colors select-none">
                                    <div class="flex items-center justify-end gap-1.5">Saldo <i :class="sortIcon('saldo')" class="text-[9px]"></i></div>
                                </th>
                                <th @click="handleSort('futuro')" class="px-5 py-3 text-center text-[11px] font-mono uppercase tracking-wider text-ink-subtle cursor-pointer hover:text-ink transition-colors select-none">
                                    <div class="flex items-center justify-center gap-1.5">A comercializar <i :class="sortIcon('futuro')" class="text-[9px]"></i></div>
                                </th>
                                <th @click="handleSort('recomendado')" class="px-5 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle cursor-pointer hover:text-ink transition-colors select-none">
                                    <div class="flex items-center justify-end gap-1.5">Recom./unid <i :class="sortIcon('recomendado')" class="text-[9px]"></i></div>
                                </th>
                                <th class="px-5 py-3 text-right text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Ações</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-line">
                            <tr v-for="item in sortedItems" :key="item.companyId ?? item.erpId"
                                class="hover:bg-surface-hover/40 transition-colors align-top">
                                <!-- EMPREENDIMENTO -->
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
                                                    title="Configurar / liberar empreendimento">
                                                    <i class="fas fa-gear text-[11px]"></i>
                                                </button>
                                            </div>
                                            <div class="text-xs text-ink-subtle font-mono">
                                                Empresa {{ item.companyId || item.displayId || '—' }}
                                                <span v-if="item.header?.costCenterIds?.length">· CC {{ item.header.costCenterIds.join(', ') }}</span>
                                            </div>
                                            <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                <Badge v-if="isAdmin" :variant="item.released ? 'success' : 'warning'" size="sm">
                                                    <i class="fas" :class="item.released ? 'fa-circle-check' : 'fa-pen-ruler'"></i>
                                                    {{ item.released ? 'Liberado' : 'Rascunho' }}
                                                </Badge>
                                                <Badge v-if="statusInfo(item)" :variant="statusInfo(item).variant" size="sm">
                                                    <i class="fas" :class="statusInfo(item).icon"></i>
                                                    {{ statusInfo(item).label }}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                <!-- GASTO ACUMULADO (para trás) -->
                                <td class="px-5 py-3 text-right whitespace-nowrap">
                                    <div class="text-sm font-bold text-ink font-mono tabular-nums">{{ fmtBRL(item.header?.spentAccumulated) }}</div>
                                    <div class="mt-1 w-28 ml-auto">
                                        <div class="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                                            <div class="h-full rounded-full" :class="pctBarClass(item.header?.pctInvested)"
                                                :style="{ width: Math.min(100, Number(item.header?.pctInvested || 0) * 100) + '%' }"></div>
                                        </div>
                                        <div class="text-[10px] text-ink-subtle mt-0.5">{{ fmtPct(item.header?.pctInvested) }} do orçamento</div>
                                    </div>
                                </td>

                                <!-- ORÇAMENTO -->
                                <td class="px-5 py-3 text-right whitespace-nowrap">
                                    <div class="text-sm font-semibold text-ink font-mono tabular-nums">{{ fmtBRL(item.header?.budgetTotal) }}</div>
                                    <div class="text-[10px] text-ink-subtle font-mono">{{ fmtBRL(item.header?.plannedCostPerUnit) }}/unid</div>
                                </td>

                                <!-- SALDO -->
                                <td class="px-5 py-3 text-right whitespace-nowrap">
                                    <div class="text-sm font-bold font-mono tabular-nums" :class="moneyClass(item.header?.remainingBudgetTotal)">
                                        {{ fmtBRL(item.header?.remainingBudgetTotal) }}
                                    </div>
                                    <div class="text-[10px] text-ink-subtle">orçamento − acumulado</div>
                                </td>

                                <!-- A COMERCIALIZAR (futuro) -->
                                <td class="px-5 py-3 text-center whitespace-nowrap">
                                    <div class="text-base font-bold text-ink font-mono tabular-nums">{{ Number(item.header?.futureUnits || 0) }}</div>
                                    <div class="text-[10px] text-ink-subtle mb-1">unidades</div>
                                    <Badge :variant="futureSourceInfo(item).variant" size="sm" v-tippy="futureSourceInfo(item).tip">
                                        <i class="fas" :class="futureSourceInfo(item).icon"></i> {{ futureSourceInfo(item).label }}
                                    </Badge>
                                </td>

                                <!-- RECOMENDADO / UNIDADE FUTURA -->
                                <td class="px-5 py-3 text-right whitespace-nowrap">
                                    <div class="text-sm font-semibold font-mono tabular-nums" :class="moneyClass(item.header?.recommendedPerFutureUnit)">
                                        {{ fmtBRL(item.header?.recommendedPerFutureUnit) }}
                                    </div>
                                    <div class="text-[10px] text-ink-subtle font-mono">
                                        VGV fut. {{ fmtCompact(item.header?.futureRevenue) }}
                                    </div>
                                </td>

                                <!-- AÇÕES -->
                                <td class="px-5 py-3 text-right whitespace-nowrap">
                                    <div class="flex items-center justify-end gap-2">
                                        <Button v-if="isAdmin" size="sm"
                                            :variant="item.released ? 'ghost' : 'primary'"
                                            :icon="item.released ? 'fas fa-rotate-left' : 'fas fa-circle-check'"
                                            :loading="adminStore.releasingId === item.companyId"
                                            :disabled="item.companyId == null"
                                            @click="quickToggleRelease(item)">
                                            {{ item.released ? 'Rascunho' : 'Liberar' }}
                                        </Button>
                                        <Button variant="secondary" size="sm" icon="fas fa-chart-line" @click="openDetail(item)">
                                            Detalhes
                                        </Button>
                                    </div>
                                </td>
                            </tr>

                            <tr v-if="!sortedItems.length && !store.isLoading">
                                <td colspan="7" class="px-6 py-12">
                                    <EmptyState icon="fas fa-inbox"
                                        :title="isAdmin ? 'Nenhum empreendimento no mês' : 'Nenhum empreendimento liberado'"
                                        :description="isAdmin ? 'Ajuste o mês de referência/filtros. Marque os departamentos em Departamentos, senão o gasto aparece zerado.' : 'A diretoria vê apenas empreendimentos liberados.'" />
                                </td>
                            </tr>
                            <tr v-if="store.isLoading">
                                <td colspan="7" class="px-6 py-10 text-center text-ink-muted text-sm">
                                    <i class="fas fa-circle-notch fa-spin mr-2"></i> Carregando...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Surface>
        </PageContainer>

        <!-- Modais admin -->
        <DeptSpendingDepartmentsModal :open="settingsOpen" @close="settingsOpen = false" />
        <DeptSpendingEnterpriseModal :open="entSettingsOpen" :company="entSettingsTarget"
            @close="entSettingsOpen = false" @saved="load" />

        <!-- Modal de detalhe: passado × futuro -->
        <Modal :open="!!detailItem" size="xl" :title="detailItem?.enterpriseName || 'Empreendimento'"
            :subtitle="detailItem ? `Empresa ${detailItem.companyId || detailItem.displayId || '—'} · CC ${(detailItem.header?.costCenterIds || []).join(', ')}` : ''"
            @close="closeDetail">
            <div v-if="detailItem" class="space-y-5">
                <div class="flex items-center gap-2 flex-wrap">
                    <Badge v-if="isAdmin" :variant="detailItem.released ? 'success' : 'warning'">
                        <i class="fas" :class="detailItem.released ? 'fa-circle-check' : 'fa-pen-ruler'"></i>
                        {{ detailItem.released ? 'Liberado' : 'Rascunho' }}
                    </Badge>
                    <Badge v-if="statusInfo(detailItem)" :variant="statusInfo(detailItem).variant">
                        <i class="fas" :class="statusInfo(detailItem).icon"></i> {{ statusInfo(detailItem).label }}
                    </Badge>
                    <span class="text-xs text-ink-subtle ml-auto">Orçamento {{ fmtBRL(detailItem.header?.budgetTotal) }} · {{ Number(detailItem.header?.marketingPct || 0).toFixed(2) }}% do VGV</span>
                </div>

                <!-- PARA TRÁS -->
                <div>
                    <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">
                        <i class="fas fa-clock-rotate-left mr-1"></i>Para trás — acumulado até {{ monthLabel }}
                    </p>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Surface variant="flat" padding="sm" bordered>
                            <div class="text-[10px] text-ink-subtle uppercase tracking-wider">Gasto acumulado</div>
                            <div class="text-base font-bold text-ink font-mono tabular-nums">{{ fmtBRL(detailItem.header?.spentAccumulated) }}</div>
                        </Surface>
                        <Surface variant="flat" padding="sm" bordered>
                            <div class="text-[10px] text-ink-subtle uppercase tracking-wider">% investido</div>
                            <div class="text-base font-bold text-ink font-mono tabular-nums">{{ fmtPct(detailItem.header?.pctInvested) }}</div>
                        </Surface>
                        <Surface variant="flat" padding="sm" bordered>
                            <div class="text-[10px] text-ink-subtle uppercase tracking-wider">Vendidas (real)</div>
                            <div class="text-base font-bold text-ink font-mono tabular-nums">{{ Number(detailItem.header?.soldUnitsRealYtd || 0) }}</div>
                        </Surface>
                        <Surface variant="flat" padding="sm" bordered>
                            <div class="text-[10px] text-ink-subtle uppercase tracking-wider">Real / unid vendida</div>
                            <div class="text-base font-bold text-ink font-mono tabular-nums" :class="realUnitClass(detailItem)">{{ fmtBRL(detailItem.header?.currentRealCostPerUnit) }}</div>
                        </Surface>
                    </div>
                </div>

                <!-- PELA FRENTE -->
                <div>
                    <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">
                        <i class="fas fa-forward mr-1"></i>Pela frente — a comercializar
                        <span class="normal-case text-ink-subtle">({{ futureSourceInfo(detailItem).label.toLowerCase() }})</span>
                    </p>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Surface variant="flat" padding="sm" bordered>
                            <div class="text-[10px] text-ink-subtle uppercase tracking-wider">Unidades futuras</div>
                            <div class="text-base font-bold text-ink font-mono tabular-nums">{{ Number(detailItem.header?.futureUnits || 0) }}</div>
                        </Surface>
                        <Surface variant="flat" padding="sm" bordered>
                            <div class="text-[10px] text-ink-subtle uppercase tracking-wider">VGV a realizar</div>
                            <div class="text-base font-bold text-ink font-mono tabular-nums">{{ fmtBRL(detailItem.header?.futureRevenue) }}</div>
                        </Surface>
                        <Surface variant="flat" padding="sm" bordered>
                            <div class="text-[10px] text-ink-subtle uppercase tracking-wider">Saldo a investir</div>
                            <div class="text-base font-bold font-mono tabular-nums" :class="moneyClass(detailItem.header?.remainingBudgetTotal)">{{ fmtBRL(detailItem.header?.remainingBudgetTotal) }}</div>
                        </Surface>
                        <Surface variant="flat" padding="sm" bordered>
                            <div class="text-[10px] text-ink-subtle uppercase tracking-wider">Recomendado / unid</div>
                            <div class="text-base font-bold font-mono tabular-nums" :class="moneyClass(detailItem.header?.recommendedPerFutureUnit)">{{ fmtBRL(detailItem.header?.recommendedPerFutureUnit) }}</div>
                        </Surface>
                    </div>
                    <div class="flex items-center gap-4 text-xs flex-wrap text-ink-muted mt-2">
                        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-emerald-500"></span>Disponíveis <strong class="font-mono">{{ Number(detailItem.header?.availableUnits || 0) }}</strong></span>
                        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-sky-500"></span>Reservadas <strong class="font-mono">{{ Number(detailItem.header?.reservedUnits || 0) }}</strong></span>
                        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-ink-subtle/60"></span>Bloqueadas <strong class="font-mono">{{ Number(detailItem.header?.blockedUnits || 0) }}</strong></span>
                        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-red-500"></span>Vendidas (CV) <strong class="font-mono">{{ Number(detailItem.header?.soldUnitsStock ?? detailItem.header?.soldUnits ?? 0) }}</strong></span>
                    </div>
                </div>

                <!-- Série mensal -->
                <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle -mb-2">Mês a mês - recomendado vs. gasto</p>
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
                                <td colspan="5" class="px-3 py-6 text-center text-ink-subtle text-xs">Sem meses no período.</td>
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
import { ref, computed, watch, onMounted } from 'vue';
import dayjs from 'dayjs';
import { useDeptSpendingStore } from '@/stores/Financeiro/DeptSpending/deptSpendingStore';
import { useDeptSpendingAdminStore } from '@/stores/Financeiro/DeptSpending/deptSpendingAdminStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useTableSort } from '@/composables/useTableSort';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Select from '@/components/UI/Select.vue';
import Input from '@/components/UI/Input.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Modal from '@/components/UI/Modal.vue';
import Favorite from '@/components/config/Favorite.vue';
import DeptSpendingDepartmentsModal from './DeptSpendingDepartmentsModal.vue';
import DeptSpendingEnterpriseModal from './DeptSpendingEnterpriseModal.vue';

const store = useDeptSpendingStore();
const adminStore = useDeptSpendingAdminStore();
const auth = useAuthStore();
const isAdmin = computed(() => auth?.user?.role === 'admin');

const refMonth = ref(store.selectedMonth || dayjs().format('YYYY-MM'));
const filtersExpanded = ref(typeof window !== 'undefined' && window.innerWidth >= 1024);
const selectedCompanies = ref([]);
const releaseFilter = ref('all');
const releaseOptions = [
    { value: 'all', label: '(Todos)' },
    { value: 'released', label: 'Liberados' },
    { value: 'draft', label: 'Rascunhos' },
];

const settingsOpen = ref(false);
const entSettingsOpen = ref(false);
const entSettingsTarget = ref(null);
const detailItem = ref(null);

const helpSteps = [
    { title: 'Mês de referência', text: 'Escolha o mês e clique em Filtrar. É o divisor entre passado e futuro.' },
    { title: 'Para trás (acumulado)', text: 'O "Gasto acumulado" soma tudo que o financeiro registrou até o mês, mesmo antes das vendas começarem.' },
    { title: 'Orçamento e saldo', text: 'Orçamento = VGV projetado × % do empreendimento. Saldo = orçamento − acumulado.' },
    { title: 'Pela frente (a comercializar)', text: 'Unidades que faltam vender: da projeção futura, ou, se não houver, do estoque disponível no CV.' },
    { title: 'Recomendado/unid', text: 'Saldo dividido pelas unidades a comercializar - quanto dá para investir por unidade daqui pra frente.' },
];
const helpTips = [
    'Se o gasto aparece zerado, confirme os departamentos acompanhados no botão "Departamentos".',
    'A etiqueta "Projeção" ou "Estoque" mostra de onde vieram as unidades a comercializar.',
];

/* ---------- formatadores ---------- */
function fmtBRL(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function fmtCompact(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }); }
function fmtMonth(ym) { return ym ? dayjs(`${ym}-01`).format('MM/YYYY') : ''; }
function fmtPct(v) { return `${(Number(v || 0) * 100).toFixed(0)}%`; }
const monthLabel = computed(() => fmtMonth(store.selectedMonth) || 'mês');

/* ---------- opções de empresa / filtro cliente ---------- */
const companyOptions = computed(() => {
    const names = new Set();
    for (const it of store.sorted) if (it.enterpriseName) names.add(it.enterpriseName);
    return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'));
});
const activeItems = computed(() => {
    let list = store.sorted;
    if (selectedCompanies.value.length) {
        const set = new Set(selectedCompanies.value);
        list = list.filter((i) => set.has(i.enterpriseName));
    }
    if (isAdmin.value && releaseFilter.value !== 'all') {
        const want = releaseFilter.value === 'released';
        list = list.filter((i) => !!i.released === want);
    }
    return list;
});

const activeFiltersCount = computed(() => {
    let n = 0;
    if (refMonth.value !== dayjs().format('YYYY-MM')) n++;
    if (selectedCompanies.value.length) n++;
    if (isAdmin.value && releaseFilter.value !== 'all') n++;
    return n;
});

/* ---------- ordenação ---------- */
const sortAccessors = {
    empresa: (i) => (i.enterpriseName || '').toLowerCase(),
    acumulado: (i) => Number(i.header?.spentAccumulated || 0),
    orcamento: (i) => Number(i.header?.budgetTotal || 0),
    saldo: (i) => Number(i.header?.remainingBudgetTotal || 0),
    futuro: (i) => Number(i.header?.futureUnits || 0),
    recomendado: (i) => Number(i.header?.recommendedPerFutureUnit || 0),
};
const { handleSort, sortIcon, sorted: sortedItems } = useTableSort(activeItems, sortAccessors, {
    defaultKey: 'acumulado',
    defaultDir: 'desc',
});

/* ---------- cards ---------- */
const cards = computed(() => {
    let budget = 0, spent = 0, saldo = 0, futureUnits = 0;
    for (const it of activeItems.value) {
        const h = it.header || {};
        budget += Number(h.budgetTotal || 0);
        spent += Number(h.spentAccumulated || 0);
        saldo += Number(h.remainingBudgetTotal || 0);
        futureUnits += Number(h.futureUnits || 0);
    }
    const pctInvested = budget > 0 ? spent / budget : 0;
    const recPerUnit = futureUnits > 0 ? saldo / futureUnits : 0;
    return [
        { key: 'budget', label: 'Orçamento', value: fmtBRL(budget), sub: 'VGV projetado × %', icon: 'fas fa-wallet', accent: 'text-sky-500 bg-sky-500/10' },
        { key: 'spent', label: `Acumulado até ${monthLabel.value}`, value: fmtBRL(spent), sub: `${fmtPct(pctInvested)} do orçamento`, icon: 'fas fa-clock-rotate-left', accent: 'text-amber-500 bg-amber-500/10' },
        { key: 'saldo', label: 'Saldo a investir', value: fmtBRL(saldo), sub: 'orçamento − acumulado', icon: 'fas fa-piggy-bank', accent: 'text-emerald-500 bg-emerald-500/10', valueClass: saldo < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400' },
        { key: 'future', label: 'A comercializar', value: `${futureUnits} un`, sub: 'unidades pela frente', icon: 'fas fa-key', accent: 'text-violet-500 bg-violet-500/10' },
        { key: 'rec', label: 'Recomendado / unid', value: fmtBRL(recPerUnit), sub: 'saldo ÷ a comercializar', icon: 'fas fa-bullseye', accent: 'text-teal-500 bg-teal-500/10' },
    ];
});

/* ---------- helpers de cor/estado ---------- */
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
function realUnitClass(item) {
    const planned = Number(item.header?.plannedCostPerUnit || 0);
    const real = Number(item.header?.currentRealCostPerUnit || 0);
    if (!planned || !real) return 'text-ink-muted';
    return real > planned ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400';
}
function futureSourceInfo(item) {
    const s = item.header?.futureUnitsSource;
    if (s === 'projecao') return { label: 'Projeção', variant: 'info', icon: 'fa-chart-line', tip: 'Unidades vindas da projeção futura (meses a partir do mês de referência)' };
    if (s === 'estoque') return { label: 'Estoque', variant: 'accent', icon: 'fa-warehouse', tip: 'Sem projeção futura — unidades disponíveis no estoque do CV para comercializar' };
    return { label: 'Sem saldo', variant: 'neutral', icon: 'fa-ban', tip: 'Sem projeção futura nem estoque a comercializar' };
}
function statusInfo(item) {
    const s = item.header?.status;
    if (s === 'concluido') return { label: 'Concluído', variant: 'neutral', icon: 'fa-circle-check' };
    if (s === 'em_andamento') return { label: 'Em andamento', variant: 'info', icon: 'fa-person-running' };
    if (s === 'pre_lancamento') return { label: 'Pré-lançamento', variant: 'accent', icon: 'fa-rocket' };
    if (s === 'previsao_futura') return { label: 'Previsão Futura', variant: 'warning', icon: 'fa-calendar-day' };
    return null;
}

/* ---------- ações ---------- */
function openEnterpriseSettings(item) { entSettingsTarget.value = item; entSettingsOpen.value = true; }
function openDetail(item) { detailItem.value = item; }
function closeDetail() { detailItem.value = null; }

async function quickToggleRelease(item) {
    if (item.companyId == null) return;
    try {
        await adminStore.setEnterpriseRelease(item.companyId, !item.released, null);
        await store.fetchList();
    } catch (e) {
        store.error = e?.message || 'Erro ao liberar empreendimento.';
    }
}

function clearFilters() {
    refMonth.value = dayjs().format('YYYY-MM');
    selectedCompanies.value = [];
    releaseFilter.value = 'all';
    applyFilters();
}

async function applyFilters() {
    store.setMonth(refMonth.value);
    if (refMonth.value && String(refMonth.value).length >= 4) store.setYear(Number(String(refMonth.value).slice(0, 4)));
    await store.fetchList();
}
const load = applyFilters;

onMounted(applyFilters);
</script>
