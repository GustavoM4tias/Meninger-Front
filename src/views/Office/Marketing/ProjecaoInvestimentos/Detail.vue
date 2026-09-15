<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="full">

            <PageHeader icon="fas fa-chart-line" :eyebrow="e?.cidade || 'Projeção de Investimentos'"
                :title="e?.nome || 'Empreendimento'" :subtitle="subtitulo">
                <template #actions>
                    <PageHelp storage-key="marketing-projecao-investimentos-detalhe" title="Como ler o detalhe do empreendimento"
                        intro="Tudo o que a planilha registra deste empreendimento: a viabilidade aprovada, quanto já foi investido desde o lançamento e o mês a mês do exercício."
                        :steps="[
                            { title: 'Confira a saúde', text: 'Desde o lançamento mostra o total investido e o selo Dentro, Atenção ou Estouro em relação à viabilidade de MKT.' },
                            { title: 'Veja o mês atual', text: 'Atual é o que já foi pago neste mês e Liberado é o que estava planejado. A barra Consumo do mês compara os dois.' },
                            { title: 'Acompanhe o ano', text: 'No gráfico, a linha cheia é o realizado dos meses fechados e a tracejada é o projetado dali para a frente.' },
                            { title: 'Entenda o valor', text: 'Itens do investimento lista o que compõe o número, mês a mês, exatamente como está na aba da planilha.' },
                        ]"
                        :tips="[
                            'Para mudar qualquer número, edite a aba deste empreendimento na planilha do SharePoint: a tela relê sozinha ao abrir.',
                        ]" />
                    <Button variant="ghost" size="sm" icon="fas fa-arrow-left" @click="voltar">Portfólio</Button>
                </template>
            </PageHeader>

            <Surface v-if="store.error" variant="raised" padding="sm" class="mb-5 border-data-neg/30 bg-data-neg/10">
                <div class="text-sm text-data-neg flex items-center gap-2">
                    <i class="fas fa-circle-exclamation"></i>{{ store.error }}
                </div>
            </Surface>

            <template v-if="store.loading && !e">
                <Skeleton variant="stat" :lines="6" class="mb-5" />
                <Skeleton variant="chart" class="mb-5" />
                <Skeleton variant="table" :lines="4" />
            </template>

            <template v-else-if="e">
                <div class="flex flex-wrap items-center gap-2 mb-4 text-xs text-ink-muted">
                    <Badge variant="accent" outlined size="sm">Realizado até {{ store.meses[store.closedIdx] }}/{{ store.exercicio }}</Badge>
                    <Badge :variant="st.variant" size="sm">{{ st.label }}</Badge>
                    <span>{{ pct(e.pct * 100) }} da viabilidade de MKT consumida</span>
                </div>

                <StatRow :items="kpis" :cols="{ sm: 2, md: 3, lg: 6 }" class="mb-5" />

                <!-- Um painel abaixo do outro, em qualquer largura (pedido do usuário). -->
                <div class="flex flex-col gap-5 mb-5">
                    <!-- Consumo do mês -->
                    <Panel icon="fas fa-gauge-high" title="Consumo do mês"
                        :subtitle="`Valor liberado × valor utilizado em ${mesAtual}`">
                        <template #actions>
                            <span class="text-xs text-ink-muted">{{ mesPctLabel }}</span>
                        </template>
                        <div class="flex flex-col gap-4 py-1">
                            <div v-for="b in mesBars" :key="b.label" class="flex items-center gap-3">
                                <span class="text-xs text-ink-muted w-28 shrink-0">{{ b.label }}</span>
                                <div class="flex-1 h-3.5 rounded-full bg-surface-sunken overflow-hidden">
                                    <div class="h-full rounded-full animate-grow origin-left" :class="b.cls"
                                        :style="{ width: b.w + '%' }"></div>
                                </div>
                                <span class="metric tabular-nums text-sm w-24 text-right shrink-0" :title="brlCheio(b.val)">{{ brl(b.val) }}</span>
                            </div>
                        </div>
                        <MetricInline class="mt-4" :items="[
                            { key: 'viab', label: 'Viabilidade MKT', value: brl(e.viabMkt), tooltip: brlCheio(e.viabMkt) },
                            { key: 'saldo', label: saldoViab >= 0 ? 'Saldo da viabilidade' : 'Excedido', value: brl(Math.abs(saldoViab)), tone: saldoViab >= 0 ? 'pos' : 'neg', tooltip: brlCheio(Math.abs(saldoViab)) },
                            { key: 'ano', label: `Investido em ${store.exercicio}`, value: brl(e.mktRealizado), hint: 'meses fechados', tooltip: brlCheio(e.mktRealizado) },
                        ]" />
                    </Panel>

                    <!-- Realizado × Projetado -->
                    <Panel icon="fas fa-chart-line" title="Realizado × Projetado por mês"
                        :subtitle="`Exercício ${store.exercicio} · cheia = realizado, tracejada = projetado`">
                        <VChart :option="chartOption" autoresize class="w-full" style="height: 280px" />
                    </Panel>
                </div>

                <!-- Itens do investimento -->
                <Panel icon="fas fa-receipt" title="Itens do investimento" subtitle="O que compõe o valor, mês a mês" :padded="false">
                    <DataTable :columns="colunasItens" :rows="itens" row-key="label" density="compact"
                        empty-icon="fas fa-receipt" empty-title="Nenhum item detalhado"
                        empty-text="A planilha não detalha itens para este empreendimento no período." />
                </Panel>
            </template>

            <Surface v-else-if="!store.loading" variant="raised" padding="lg" class="text-center">
                <i class="fas fa-file-circle-question text-2xl text-ink-subtle mb-2"></i>
                <p class="text-sm text-ink-muted">Não achei a aba "{{ tab }}" na planilha. Ela pode ter sido renomeada.</p>
                <Button variant="secondary" size="sm" class="mt-3" icon="fas fa-arrow-left" @click="voltar">Voltar ao portfólio</Button>
            </Surface>
        </PageContainer>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useMktProjectionStore, statusMeta } from '@/stores/Marketing/MktProjection/mktProjectionStore';
import { useChartTheme } from '@/composables/useChartTheme';
import { fmtInt } from '@/utils/format';
import { brl, brlCheio, pct } from './projFormat';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import StatRow from '@/components/UI/StatRow.vue';
import MetricInline from '@/components/UI/MetricInline.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent, CanvasRenderer]);

const route = useRoute();
const router = useRouter();
const store = useMktProjectionStore();
const t = useChartTheme();

const tab = computed(() => decodeURIComponent(String(route.params.aba || '')));
const e = computed(() => store.byTab(tab.value));
const st = computed(() => statusMeta(e.value?.st));
const mesAtual = computed(() => store.meses[store.curIdx]);

const subtitulo = computed(() => e.value
    ? `${fmtInt(e.value.unidades, '0')} unidades · VGV ${brl(e.value.vgv)} · Exercício ${store.exercicio}`
    : '');

const mesRealizado = computed(() => e.value?.realMonths?.[store.curIdx] || 0);
const mesLiberado = computed(() => e.value?.projMonths?.[store.curIdx] || 0);
const saldoViab = computed(() => (e.value?.viabMkt || 0) - (e.value?.desde || 0));

const kpis = computed(() => {
    const x = e.value;
    if (!x) return [];
    const pctLib = x.viabMkt ? (mesLiberado.value / x.viabMkt) * 100 : 0;
    return [
        { key: 'viab', label: 'Viabilidade MKT', raw: x.viabMkt, format: brl, icon: 'fas fa-scale-balanced', tone: 'accent', hint: 'valor aprovado (1% da viabilidade)', tooltip: brlCheio(x.viabMkt) },
        { key: 'desde', label: 'Desde o lançamento', raw: x.desde, format: brl, icon: 'fas fa-bullhorn', tone: st.value.tone, hint: `${st.value.label} · ${pct(x.pct * 100)} da viabilidade`, tooltip: brlCheio(x.desde) },
        { key: 'atual', label: `Atual (${mesAtual.value})`, raw: mesRealizado.value, format: brl, icon: 'fas fa-calendar-day', tone: 'accent', hint: 'investimento do mês', tooltip: brlCheio(mesRealizado.value) },
        { key: 'liberado', label: 'Liberado', raw: mesLiberado.value, format: brl, icon: 'fas fa-bullseye', tone: 'pos', hint: 'planejado para o mês', tooltip: brlCheio(mesLiberado.value) },
        { key: 'pct', label: '% consumida', raw: x.pct * 100, format: (v) => pct(v), decimals: 1, icon: 'fas fa-chart-pie', tone: st.value.tone, hint: 'da viabilidade total' },
        { key: 'pctLib', label: '% liberado', raw: pctLib, format: (v) => pct(v), decimals: 1, icon: 'fas fa-percent', tone: 'pos', hint: 'da viabilidade total, no mês' },
    ];
});

const mesPctLabel = computed(() => (mesLiberado.value > 0
    ? `${pct((mesRealizado.value / mesLiberado.value) * 100, 0)} do liberado`
    : 'sem valor liberado no mês'));

const mesBars = computed(() => {
    const max = Math.max(mesRealizado.value, mesLiberado.value, 1) * 1.15;
    return [
        { label: 'Valor liberado', val: mesLiberado.value, w: Math.min((mesLiberado.value / max) * 100, 100), cls: 'bg-data-pos-area' },
        { label: 'Valor utilizado', val: mesRealizado.value, w: Math.min((mesRealizado.value / max) * 100, 100), cls: mesRealizado.value > mesLiberado.value ? 'bg-data-neg-area' : 'bg-series-1-soft' },
    ];
});

// Realizado nos meses fechados; projetado dali em diante, emendado no último
// realizado para a linha não nascer no ar.
const chartOption = computed(() => {
    const x = e.value;
    const fechados = store.meta?.closedMonths ?? store.curIdx;
    const real = (x?.realMonths || []).map((v, i) => (i < fechados ? v : null));
    const proj = (x?.realMonths || []).map((v, i) => (i >= fechados ? (x?.projMonths?.[i] || 0) : (i === fechados - 1 ? v : null)));
    return {
        ...t.base.value,
        tooltip: { ...t.tooltip.value, trigger: 'axis', valueFormatter: (v) => (v == null ? '-' : brlCheio(v)) },
        legend: { ...t.legend.value, top: 0 },
        grid: { ...t.grid.value, top: 34 },
        xAxis: { type: 'category', data: store.meses, boundaryGap: false, ...t.axisCategory.value },
        yAxis: { type: 'value', ...t.axisValue.value, axisLabel: { ...t.axisValue.value.axisLabel, formatter: (v) => `${Math.round(v / 1000)}k` } },
        series: [
            t.line(1, { name: 'Realizado', data: real, connectNulls: false, showSymbol: true, symbolSize: 6 }),
            t.line(2, {
                name: 'Projetado', data: proj, connectNulls: false, showSymbol: true, symbolSize: 6,
                lineStyle: { color: t.color(2), width: 2, type: 'dashed' },
                ...(fechados > 0 && fechados < 12 ? {
                    markLine: {
                        silent: true, symbol: 'none',
                        lineStyle: { color: t.inkSubtle.value, type: 'dotted', width: 1 },
                        label: { show: false },
                        data: [{ xAxis: fechados - 1 }],
                    },
                } : {}),
            }),
        ],
    };
});

// Só os meses em que algum item tem valor viram coluna.
const mesesAtivos = computed(() => {
    const its = e.value?.items || [];
    const idx = [];
    for (let i = 0; i < 12; i++) if (its.some((it) => (it.months?.[i] || 0) > 0)) idx.push(i);
    return idx.length ? idx : [store.curIdx];
});
const itens = computed(() => (e.value?.items || []).map((it) => {
    const row = { label: it.label, total: it.total };
    for (const i of mesesAtivos.value) row[`m${i}`] = it.months?.[i] || 0;
    return row;
}));
const colunasItens = computed(() => [
    { key: 'label', label: 'Item', priority: 1, sortable: true },
    ...mesesAtivos.value.map((i) => ({ key: `m${i}`, label: store.meses[i], priority: 2, numeric: true, sortable: true, format: (v) => (v ? brl(v) : '-') })),
    { key: 'total', label: 'Total', priority: 1, numeric: true, sortable: true, format: brl, class: 'text-accent font-semibold' },
]);

const voltar = () => router.push('/marketing/projecao-investimentos');

onMounted(() => { if (!store.enr.length) store.fetchData(); });
</script>
