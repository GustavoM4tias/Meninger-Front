<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="full">

            <PageHeader icon="fas fa-file-invoice-dollar"
                subtitle="Relatório gerencial de investimento do empreendimento: realizado × projetado, governança orçamentária e leitura para decisão.">
                <template #title>
                    {{ r?.company?.name || 'Relatório de Investimento' }}
                </template>
                <template #actions>
                    <PageHelp storage-key="gastos-departamento-relatorio"
                        title="Como usar - Relatório de Investimento"
                        intro="Escolha o mês de referência. Tudo até ele é REALIZADO (gasto registrado no financeiro); dali em diante é PROJETADO pela projeção de vendas."
                        :steps="helpSteps" :tips="helpTips" />
                    <Button variant="ghost" size="sm" icon="fas fa-arrow-left" @click="goBack">
                        <span class="hidden sm:inline">Voltar</span>
                    </Button>
                </template>
            </PageHeader>

            <!-- Erro (inclui 404 de não liberado p/ diretoria) -->
            <Surface v-if="store.reportError" variant="raised" padding="lg" class="mb-4">
                <EmptyState icon="fas fa-lock" title="Relatório não disponível"
                    :description="store.reportError" />
                <div class="text-center mt-2">
                    <Button variant="secondary" size="sm" icon="fas fa-arrow-left" @click="goBack">Voltar para a lista</Button>
                </div>
            </Surface>

            <div v-else-if="store.reportLoading && !r" class="py-16 text-center text-ink-muted text-sm">
                <i class="fas fa-circle-notch fa-spin mr-2"></i> Montando o relatório...
            </div>

            <template v-else-if="r">
                <!-- Faixa de identificação + mês de referência -->
                <section class="mb-5 rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-4 sm:p-5">
                    <div class="flex flex-wrap items-start gap-3">
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2 flex-wrap mb-1.5">
                                <Badge variant="neutral" size="sm"><i class="fas fa-user-shield"></i> Confidencial · Diretoria</Badge>
                                <Badge v-if="isAdmin" :variant="r.viability.released ? 'success' : 'warning'" size="sm">
                                    <i class="fas" :class="r.viability.released ? 'fa-circle-check' : 'fa-pen-ruler'"></i>
                                    {{ r.viability.released ? 'Liberado' : 'Rascunho' }}
                                </Badge>
                                <Badge variant="accent" size="sm">Exercício {{ r.year }}</Badge>
                            </div>
                            <p class="text-xs text-ink-subtle font-mono">
                                Empresa {{ r.company.companyId }} · CC {{ (r.company.costCenterIds || []).join(', ') }}
                            </p>
                            <p class="text-sm text-ink-muted mt-1">
                                <strong class="text-ink font-mono tabular-nums">{{ Number(r.viability.totalUnits || 0) }}</strong> unidades ·
                                VGV <strong class="text-ink font-mono tabular-nums">{{ fmtCompact(r.viability.vgvTotal) }}</strong> ·
                                Marketing <strong class="text-ink font-mono tabular-nums">{{ Number(r.viability.marketingPct || 0).toFixed(2) }}%</strong> do VGV ·
                                Realizado até <strong class="text-ink">{{ monthLabel }}</strong>
                            </p>
                        </div>
                        <div class="flex items-end gap-2 w-full sm:w-auto">
                            <div class="flex-1 sm:flex-none sm:w-44">
                                <Input v-model="refMonth" type="month" label="Mês de referência" />
                            </div>
                            <Button size="sm" class="h-10" icon="fas fa-magnifying-glass" :loading="store.reportLoading" @click="load">
                                <span class="hidden sm:inline">Aplicar</span>
                            </Button>
                        </div>
                    </div>
                </section>

                <!-- KPIs -->
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
                    <!-- VGV -->
                    <div class="p-4 rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
                        <p class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">VGV projetado {{ r.year }}</p>
                        <p class="text-2xl font-semibold tabular-nums tracking-tight text-ink mt-1">{{ fmtCompact(r.kpis.vgv.yearVgv) }}</p>
                        <p class="text-[11px] text-ink-muted mt-1">
                            {{ Number(r.kpis.vgv.yearUnits || 0) }} de {{ Number(r.kpis.vgv.totalUnits || 0) }} unidades
                            <template v-if="r.kpis.vgv.nextYearsVgv > 0"> · saldo {{ fmtCompact(r.kpis.vgv.nextYearsVgv) }} p/ {{ r.year + 1 }}+</template>
                        </p>
                    </div>
                    <!-- Buckets -->
                    <div v-for="b in bucketCards" :key="b.key"
                        class="p-4 rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
                        <div class="flex items-center justify-between gap-2">
                            <p class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">{{ b.title }}</p>
                            <Badge :variant="statusVariant(b.status)" size="sm">{{ b.statusText || statusLabel(b.status) }}</Badge>
                        </div>
                        <p class="text-2xl font-semibold tabular-nums tracking-tight mt-1" :class="b.valueClass || 'text-ink'">{{ fmtBRL(b.value) }}</p>
                        <p class="text-[11px] text-ink-muted mt-1">{{ fmtPct(b.pct) }} consumido · {{ b.tetoLabel }} {{ fmtBRL(b.teto) }}</p>
                        <p v-if="b.note" class="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5 truncate" :title="b.note">
                            <i class="fas fa-arrow-right-arrow-left mr-0.5"></i>{{ b.note }}
                        </p>
                        <p v-if="b.note2" class="text-[10px] text-ink-subtle mt-0.5 truncate" :title="b.note2">{{ b.note2 }}</p>
                    </div>
                </div>

                <!-- MARKETING: realizado × projetado -->
                <Surface variant="raised" padding="none" class="overflow-hidden mb-5">
                    <div class="px-4 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40 flex items-center justify-between flex-wrap gap-2">
                        <h3 class="text-base font-semibold text-ink flex items-center gap-2">
                            <i class="fas fa-bullhorn text-emerald-500"></i> Marketing - realizado × projetado por mês
                        </h3>
                        <span class="text-xs text-ink-subtle">projetado = saldo do exercício ÷ meses restantes (não segue a curva de vendas)</span>
                    </div>
                    <div class="p-3 sm:p-4">
                        <VChart :option="mktChartOption" autoresize class="w-full" style="height: 280px" />
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                            <div class="p-3 rounded-lg border border-line bg-surface-sunken/40">
                                <p class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">Realizado (Jan-{{ shortMonth(r.monthIndex) }})</p>
                                <p class="text-lg font-bold tabular-nums text-ink">{{ fmtBRL(mkt.realizadoAno) }}</p>
                                <p class="text-[11px] text-ink-muted">
                                    {{ fmtPct(distribution.pctRealizado) }} do plano anual de MKT
                                    <span v-if="Number(mkt.lojaExcedenteAno || 0) > 0" class="text-orange-600 dark:text-orange-400">
                                        · inclui {{ fmtBRL(mkt.lojaExcedenteAno) }} da loja
                                    </span>
                                </p>
                            </div>
                            <div class="p-3 rounded-lg border border-line bg-surface-sunken/40">
                                <p class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">Projetado ({{ shortMonth(r.monthIndex + 1) }}-Dez)</p>
                                <p class="text-lg font-bold tabular-nums" :class="moneyClass(mkt.projetadoAno)">{{ fmtBRL(mkt.projetadoAno) }}</p>
                                <p class="text-[11px] text-ink-muted">{{ fmtBRL(mkt.projetadoMes) }} / mês · saldo ÷ meses restantes</p>
                            </div>
                            <div class="p-3 rounded-lg border border-line bg-surface-sunken/40">
                                <p class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">Plano do ano</p>
                                <p class="text-lg font-bold tabular-nums text-ink">{{ fmtBRL(mkt.planoAno) }}</p>
                                <p class="text-[11px] text-ink-muted">saldo de viabilidade {{ fmtBRL(mkt.saldo) }}</p>
                            </div>
                        </div>
                    </div>
                </Surface>

                <!-- GOVERNANÇA + FLUXO -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
                    <Surface variant="raised" padding="none" class="overflow-hidden">
                        <div class="px-4 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40">
                            <h3 class="text-base font-semibold text-ink flex items-center gap-2">
                                <i class="fas fa-scale-balanced text-sky-500"></i> Governança orçamentária
                            </h3>
                            <p class="text-xs text-ink-subtle mt-0.5">Consumo da viabilidade aprovada · ritmo linear esperado do ano: {{ fmtPct(ritmo) }} ({{ monthLabelShort }})</p>
                        </div>
                        <div class="p-4 sm:p-5 space-y-5">
                            <div v-for="b in governanceRows" :key="b.key">
                                <div class="flex items-center justify-between gap-2 text-sm mb-1.5 flex-wrap">
                                    <span class="font-medium text-ink">{{ b.label }}</span>
                                    <span class="font-mono tabular-nums text-ink-muted text-xs">{{ fmtBRL(b.consumido) }} / {{ fmtBRL(b.teto) }}</span>
                                </div>
                                <div class="relative h-2.5 rounded-full bg-surface-sunken overflow-hidden">
                                    <div class="absolute inset-y-0 left-0 flex w-full">
                                        <div class="h-full transition-all" :class="barClass(b.status)"
                                            :style="{ width: segMainPct(b) + '%' }"></div>
                                        <!-- excedente da loja dentro do MKT (separado, laranja) -->
                                        <div v-if="segExcedPct(b) > 0" class="h-full bg-orange-500 transition-all"
                                            :style="{ width: segExcedPct(b) + '%' }"
                                            v-tippy="`Excedente da loja: ${fmtBRL(b.lojaExcedenteAno)}`"></div>
                                    </div>
                                    <!-- marcador do ritmo linear -->
                                    <div class="absolute top-0 bottom-0 w-0.5 bg-ink/40" :style="{ left: Math.min(100, ritmo * 100) + '%' }"
                                        v-tippy="`Ritmo linear esperado: ${fmtPct(ritmo)}`"></div>
                                </div>
                                <div class="flex items-center justify-between mt-1 text-[11px] text-ink-subtle flex-wrap gap-1">
                                    <span>
                                        {{ fmtPct(b.pctConsumido) }} consumido
                                        <template v-if="Number(b.lojaExcedenteAno || 0) > 0">
                                            · <span class="text-ink-muted">{{ fmtBRL(b.realizadoProprioAno) }} próprio</span>
                                            + <span class="text-orange-600 dark:text-orange-400">{{ fmtBRL(b.lojaExcedenteAno) }} da loja</span>
                                        </template>
                                        <template v-else-if="Number(b.excedenteVida || 0) > 0">
                                            · <span class="text-orange-600 dark:text-orange-400">pagou {{ fmtBRL(b.pagoTotalVida) }}, excedente {{ fmtBRL(b.excedenteVida) }} → MKT</span>
                                        </template>
                                    </span>
                                    <span :class="b.saldo < 0 ? 'text-red-600 dark:text-red-400 font-semibold' : ''">saldo {{ fmtBRL(b.saldo) }}</span>
                                </div>
                                <!-- projetado p/ frente (só MKT): saldo ÷ meses restantes -->
                                <div v-if="b.key === 'marketing'" class="mt-0.5 text-[11px] text-ink-subtle">
                                    a investir pela frente: <strong class="font-mono tabular-nums"
                                        :class="Number(b.projetadoMes) < 0 ? 'text-red-600 dark:text-red-400' : 'text-ink-muted'">
                                        {{ fmtBRL(b.projetadoMes) }} / mês
                                    </strong> (saldo ÷ meses restantes)
                                </div>
                            </div>
                        </div>
                    </Surface>

                    <Surface variant="raised" padding="none" class="overflow-hidden">
                        <div class="px-4 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40">
                            <h3 class="text-base font-semibold text-ink flex items-center gap-2">
                                <i class="fas fa-money-bill-transfer text-violet-500"></i> Fluxo de caixa
                            </h3>
                            <p class="text-xs text-ink-subtle mt-0.5">Investimento mensal · Marketing + Loja</p>
                        </div>
                        <div class="p-3 sm:p-4">
                            <VChart :option="cashflowChartOption" autoresize class="w-full" style="height: 240px" />
                        </div>
                    </Surface>
                </div>

                <!-- DISTRIBUIÇÃO + LEITURA -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <Surface variant="raised" padding="none" class="overflow-hidden">
                        <div class="px-4 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40">
                            <h3 class="text-base font-semibold text-ink flex items-center gap-2">
                                <i class="fas fa-chart-pie text-amber-500"></i> Distribuição MKT
                            </h3>
                            <p class="text-xs text-ink-subtle mt-0.5">Do plano anual, quanto já saiu</p>
                        </div>
                        <div class="p-3 sm:p-4">
                            <VChart :option="donutOption" autoresize class="w-full" style="height: 220px" />
                        </div>
                    </Surface>

                    <Surface variant="raised" padding="none" class="overflow-hidden lg:col-span-2">
                        <div class="px-4 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40 flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <h3 class="text-base font-semibold text-ink flex items-center gap-2">
                                    <i class="fas fa-lightbulb text-amber-500"></i> Leitura para decisão
                                </h3>
                                <p class="text-xs text-ink-subtle mt-0.5">
                                    O que estes números significam
                                    <span v-if="r.insights?.generatedAt"> · gerada {{ r.insights.source === 'ai' ? 'por IA' : 'automaticamente' }} em {{ fmtDateTime(r.insights.generatedAt) }}</span>
                                </p>
                            </div>
                            <Button v-if="isAdmin" variant="ghost" size="sm" icon="fas fa-rotate"
                                :loading="regenLoading" @click="regenerate">
                                Regenerar
                            </Button>
                        </div>
                        <div class="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div v-for="(blk, i) in (r.insights?.blocks || [])" :key="i"
                                class="p-3.5 rounded-xl border" :class="insightClass(blk.tone)">
                                <p class="text-sm font-semibold mb-1.5 flex items-center gap-2" :class="insightTitleClass(blk.tone)">
                                    <i class="fas" :class="insightIcon(blk.tone)"></i> {{ blk.title }}
                                </p>
                                <p class="text-xs leading-relaxed text-ink-muted">{{ blk.text }}</p>
                            </div>
                            <EmptyState v-if="!(r.insights?.blocks || []).length" class="md:col-span-3" size="sm"
                                icon="fas fa-lightbulb" title="Sem leitura gerada"
                                description="A narrativa será gerada quando o relatório for recarregado." />
                        </div>
                    </Surface>
                </div>
            </template>
        </PageContainer>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { BarChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useDeptSpendingStore } from '@/stores/Financeiro/DeptSpending/deptSpendingStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

echarts.use([BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

const route = useRoute();
const router = useRouter();
const store = useDeptSpendingStore();
const auth = useAuthStore();

const companyId = computed(() => route.params.companyId);
const refMonth = ref(store.selectedMonth || dayjs().format('YYYY-MM'));
const regenLoading = ref(false);

const r = computed(() => store.report);
const isAdmin = computed(() => r.value?.isAdmin ?? auth?.user?.role === 'admin');
const mkt = computed(() => r.value?.kpis?.buckets?.marketing || {});
const loja = computed(() => r.value?.kpis?.buckets?.loja || {});
const total = computed(() => r.value?.kpis?.buckets?.total || {});
const ritmo = computed(() => Number(r.value?.governance?.ritmoLinear || 0));
const distribution = computed(() => r.value?.distribution || {});

/* ---------- tema (padrão ChatChart: observa a classe dark) ---------- */
const isDark = ref(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
let observer;
onMounted(() => {
    observer = new MutationObserver(() => {
        isDark.value = document.documentElement.classList.contains('dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    // deep link: /financeiro/gastos-departamento/<id>?mes=YYYY-MM
    const qMes = String(route.query.mes || '');
    if (/^\d{4}-\d{2}$/.test(qMes)) refMonth.value = qMes;
    load();
});
onBeforeUnmount(() => observer?.disconnect());

/* ---------- formatadores ---------- */
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
function fmtBRL(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); }
function fmtCompact(v) { return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }); }
function fmtPct(v) { return `${(Number(v || 0) * 100).toFixed(1)}%`; }
function fmtDateTime(v) { return v ? dayjs(v).format('DD/MM HH:mm') : ''; }
function shortMonth(idx) { return MONTHS_SHORT[Math.min(11, Math.max(0, (idx || 1) - 1))]; }
const monthLabel = computed(() => {
    const ym = r.value?.refMonth || refMonth.value;
    const idx = Number(String(ym).slice(5, 7)) - 1;
    return `${MONTHS_FULL[idx] || ''} / ${String(ym).slice(0, 4)}`;
});
const monthLabelShort = computed(() => (r.value ? `${shortMonth(r.value.monthIndex).toLowerCase()}` : ''));

/* ---------- KPI cards ---------- */
const bucketCards = computed(() => {
    if (!r.value) return [];
    const exced = Number(mkt.value.lojaExcedenteAno || 0);
    const excedVida = Number(loja.value.excedenteVida || 0);
    return [
        {
            key: 'mkt', title: 'Investimento MKT', value: mkt.value.consumido,
            pct: mkt.value.pctConsumido, teto: mkt.value.teto, status: mkt.value.status,
            tetoLabel: 'teto do exercício',
            note: exced > 0 ? `inclui ${fmtBRL(exced)} de excedente da loja` : '',
            note2: `viabilidade vida útil ${fmtBRL(mkt.value.tetoVidaUtil)}`,
        },
        {
            key: 'loja', title: 'Investimento Loja', value: loja.value.consumido,
            pct: loja.value.pctConsumido, teto: loja.value.teto, status: loja.value.status,
            tetoLabel: 'pool vida útil',
            statusText: excedVida > 0 ? 'Teto atingido' : '',
            note: excedVida > 0 ? `pagou ${fmtBRL(loja.value.pagoTotalVida)} · excedente foi p/ o MKT` : '',
            note2: '',
        },
        {
            key: 'total', title: 'Investimento Total', value: total.value.consumido,
            pct: total.value.pctConsumido, teto: total.value.teto, status: total.value.status,
            tetoLabel: 'teto combinado',
            note: '',
            note2: '',
        },
    ];
});
const governanceRows = computed(() => {
    if (!r.value) return [];
    return [loja.value, mkt.value, total.value].filter((b) => b && (b.teto > 0 || b.consumido > 0));
});

function moneyClass(v) {
    return Number(v || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-ink';
}

/* Barra da governança: parcela própria × excedente da loja (só no bucket MKT). */
function segExcedPct(b) {
    const teto = Number(b.teto || 0);
    const exced = Number(b.lojaExcedenteAno || 0);
    if (!teto || !exced) return 0;
    return Math.min(100, (exced / teto) * 100);
}
function segMainPct(b) {
    const teto = Number(b.teto || 0);
    if (!teto) return 0;
    const proprio = Number(b.lojaExcedenteAno || 0) > 0 ? Number(b.realizadoProprioAno || 0) : Number(b.consumido || 0);
    return Math.max(0, Math.min(100 - segExcedPct(b), (proprio / teto) * 100));
}

function statusVariant(s) { return s === 'acima' ? 'danger' : s === 'atencao' ? 'warning' : 'success'; }
function statusLabel(s) { return s === 'acima' ? 'Estourado' : s === 'atencao' ? 'Atenção' : 'Dentro'; }
function barClass(s) { return s === 'acima' ? 'bg-red-500' : s === 'atencao' ? 'bg-amber-500' : 'bg-emerald-500'; }
function insightClass(t) {
    if (t === 'risco') return 'border-red-500/30 bg-red-500/5';
    if (t === 'atencao') return 'border-amber-500/30 bg-amber-500/5';
    return 'border-emerald-500/30 bg-emerald-500/5';
}
function insightTitleClass(t) {
    if (t === 'risco') return 'text-red-600 dark:text-red-400';
    if (t === 'atencao') return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
}
function insightIcon(t) { return t === 'risco' ? 'fa-triangle-exclamation' : t === 'atencao' ? 'fa-circle-exclamation' : 'fa-circle-check'; }

/* ---------- gráficos ---------- */
const chartColors = computed(() => ({
    txt: isDark.value ? '#94a3b8' : '#6b7280',
    grid: isDark.value ? '#1e293b' : '#f3f4f6',
    tooltipBg: isDark.value ? '#1e293b' : '#ffffff',
    tooltipTx: isDark.value ? '#e2e8f0' : '#1f2937',
    tooltipBd: isDark.value ? '#334155' : '#e5e7eb',
}));
const tooltipStyle = computed(() => ({
    backgroundColor: chartColors.value.tooltipBg,
    borderColor: chartColors.value.tooltipBd,
    textStyle: { color: chartColors.value.tooltipTx, fontSize: 12 },
    valueFormatter: (v) => fmtBRL(v),
}));

const monthLabels = computed(() => (r.value?.months || []).map((m) => MONTHS_SHORT[Number(m.ym.slice(5, 7)) - 1]));

const mktChartOption = computed(() => {
    const c = chartColors.value;
    const months = r.value?.months || [];
    return {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tooltipStyle.value },
        legend: { textStyle: { color: c.txt }, top: 0 },
        grid: { left: 8, right: 8, top: 34, bottom: 4, containLabel: true },
        xAxis: { type: 'category', data: monthLabels.value, axisLabel: { color: c.txt, fontSize: 10 }, axisLine: { lineStyle: { color: c.grid } } },
        yAxis: { type: 'value', axisLabel: { color: c.txt, fontSize: 10, formatter: (v) => `${Math.round(v / 1000)}k` }, splitLine: { lineStyle: { color: c.grid } } },
        series: [
            { name: 'Realizado', type: 'bar', stack: 'mkt', barMaxWidth: 22, data: months.map((m) => Math.round(m.mktRealizado)), itemStyle: { color: '#10b981', borderRadius: [3, 3, 0, 0] } },
            { name: 'Excedente da loja', type: 'bar', stack: 'mkt', barMaxWidth: 22, data: months.map((m) => Math.round(m.mktLojaExcedente || 0)), itemStyle: { color: '#f97316', borderRadius: [3, 3, 0, 0] } },
            { name: 'Projetado', type: 'bar', stack: 'mkt', barMaxWidth: 22, data: months.map((m) => Math.round(m.mktProjetado)), itemStyle: { color: '#38bdf8', borderRadius: [3, 3, 0, 0], opacity: 0.75 } },
        ],
    };
});

const cashflowChartOption = computed(() => {
    const c = chartColors.value;
    const months = r.value?.months || [];
    return {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...tooltipStyle.value },
        legend: { textStyle: { color: c.txt }, top: 0 },
        grid: { left: 8, right: 8, top: 34, bottom: 4, containLabel: true },
        xAxis: { type: 'category', data: monthLabels.value, axisLabel: { color: c.txt, fontSize: 10 }, axisLine: { lineStyle: { color: c.grid } } },
        yAxis: { type: 'value', axisLabel: { color: c.txt, fontSize: 10, formatter: (v) => `${Math.round(v / 1000)}k` }, splitLine: { lineStyle: { color: c.grid } } },
        series: [
            { name: 'Marketing', type: 'bar', stack: 'fluxo', barMaxWidth: 22, data: months.map((m) => Math.round(m.mktRealizado + m.mktProjetado)), itemStyle: { color: '#10b981' } },
            { name: 'Loja → MKT (excedente)', type: 'bar', stack: 'fluxo', barMaxWidth: 22, data: months.map((m) => Math.round(m.mktLojaExcedente || 0)), itemStyle: { color: '#f97316' } },
            { name: 'Loja', type: 'bar', stack: 'fluxo', barMaxWidth: 22, data: months.map((m) => Math.round(m.lojaRealizado + m.lojaProjetado)), itemStyle: { color: '#f59e0b', borderRadius: [3, 3, 0, 0] } },
        ],
    };
});

const donutOption = computed(() => {
    const c = chartColors.value;
    const d = distribution.value;
    return {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', ...tooltipStyle.value },
        series: [{
            type: 'pie', radius: ['58%', '80%'], center: ['50%', '50%'],
            label: { show: true, position: 'center', formatter: `${fmtPct(d.pctRealizado)}\njá investido`, color: c.tooltipTx, fontSize: 14, fontWeight: 600, lineHeight: 20 },
            data: [
                { name: 'Realizado', value: Math.round(d.realizadoAno || 0), itemStyle: { color: '#10b981' } },
                { name: 'A investir', value: Math.round(d.aInvestirAno || 0), itemStyle: { color: isDark.value ? '#334155' : '#e5e7eb' } },
            ],
        }],
    };
});

/* ---------- ajuda ---------- */
const helpSteps = [
    { title: 'Mês de referência', text: 'Divide o ano entre realizado (até o mês) e projetado (depois dele). Troque e clique em Aplicar.' },
    { title: 'Cards de investimento', text: 'Cada verba mostra o consumido contra o teto aprovado na viabilidade, com status Dentro, Atenção ou Estourado.' },
    { title: 'Gráfico de marketing', text: 'Barras verdes = pago de fato. Laranja = excedente da loja. Azuis = a investir por mês (saldo do exercício dividido pelos meses restantes; pode ficar negativo quando o teto já foi ultrapassado).' },
    { title: 'Governança', text: 'A barra mostra o consumo da verba; o traço vertical é o ritmo linear esperado do ano até o mês escolhido.' },
    { title: 'Leitura para decisão', text: 'Resumo em linguagem simples do que os números significam, gerado automaticamente a partir das regras de análise.' },
];
const helpTips = [
    'Se o realizado aparecer zerado, confira os departamentos acompanhados na tela de Gastos por Departamento.',
    'O relatório só aparece para a diretoria depois que um admin configura e libera o empreendimento.',
];

/* ---------- ações ---------- */
async function load() {
    store.setMonth(refMonth.value);
    router.replace({ query: { ...route.query, mes: refMonth.value } });
    await store.fetchReport(companyId.value, refMonth.value);
}
function goBack() { router.push('/financeiro/gastos-departamento'); }
async function regenerate() {
    regenLoading.value = true;
    try {
        await store.regenerateInsights(companyId.value, refMonth.value);
    } catch (e) {
        store.reportError = e?.message || 'Erro ao regenerar a leitura.';
    } finally {
        regenLoading.value = false;
    }
}
</script>
