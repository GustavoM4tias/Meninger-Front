<script setup>
// "Desempenho diário" — investimento e leads, dia a dia.
//
// ERA UM GRÁFICO DE EIXO DUPLO: barra de dinheiro numa escala e linha de leads
// noutra, no mesmo desenho. Isso é o erro nº 1 de gráfico, e aqui ele custava
// caro: as duas escalas se ajustam sozinhas e INDEPENDENTES, então o ponto em
// que a linha "passa por cima" das barras é artefato do auto-escalonamento, não
// fato nenhum do mundo. Só que ele parece um fato — as pessoas leem ali um
// "hoje o lead ficou mais barato" que o gráfico nunca disse. Trocar o período
// de 30 para 7 dias mudava o cruzamento sem um único dado mudar.
//
// Agora são duas faixas empilhadas dividindo o MESMO eixo de tempo: cada medida
// com a sua escala, declarada, e a comparação que interessa (o mesmo dia nas
// duas) continua sendo uma linha vertical. O ponteiro é ligado entre as duas,
// então passar o mouse em cima marca o dia nas duas de uma vez.
//
// E a pergunta que o eixo duplo tentava responder no olho — "o lead está
// ficando mais caro?" — virou número no cabeçalho, que é onde ela se responde
// sem gráfico nenhum.

import { computed } from 'vue';
import { useChartTheme } from '@/composables/useChartTheme';
import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { TooltipComponent, GridComponent, AxisPointerComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, TooltipComponent, GridComponent, AxisPointerComponent, CanvasRenderer]);

const props = defineProps({
    daily: { type: Array, default: () => [] },           // [{ day, spend, office_leads, ... }]
    currency: { type: String, default: 'BRL' },
});

const t = useChartTheme();

/* As duas séries usam os slots 1 e 3 da paleta. O cabeçalho lê OS MESMOS
   valores daqui: antes a legenda dizia `bg-accent` e `bg-data-pos` enquanto o
   gráfico desenhava outras duas cores, então o quadradinho ao lado do número
   não correspondia a barra nenhuma. */
const corInvestimento = computed(() => t.fill(1));
const corLeads = computed(() => t.color(3));

const moneyFmt = computed(() => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: props.currency || 'BRL', minimumFractionDigits: 2,
}));
const moneyCurto = computed(() => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: props.currency || 'BRL', maximumFractionDigits: 0, notation: 'compact',
}));
const intFmt = new Intl.NumberFormat('pt-BR');

const totalSpend = computed(() => props.daily.reduce((a, d) => a + (Number(d.spend) || 0), 0));
const totalLeads = computed(() => props.daily.reduce((a, d) => a + (Number(d.office_leads) || 0), 0));
const dias = computed(() => props.daily.length);

/* Custo por lead do período INTEIRO, não a média dos custos diários: dia com
   1 lead e dia com 200 não pesam igual, e a média das médias mentiria. */
const custoPorLead = computed(() => (totalLeads.value ? totalSpend.value / totalLeads.value : null));

// Interpreta 'YYYY-MM-DD' como data LOCAL. `new Date('2026-07-01')` seria
// meia-noite UTC → em UTC-3 volta pra 30/06 e o rótulo aparece um dia antes.
function localDate(s) {
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

const rotuloDia = (v) => {
    try { return localDate(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); }
    catch { return v; }
};

const option = computed(() => {
    const dias_ = props.daily.map(d => d.day);
    /* Eixo de tempo compartilhado: o de cima existe só para alinhar a grade e
       vai sem rótulo, senão a data apareceria duas vezes na mesma coluna. */
    const eixoTempo = (comRotulo) => ({
        ...t.axisCategory.value,
        type: 'category',
        data: dias_,
        gridIndex: comRotulo ? 1 : 0,
        axisLabel: comRotulo
            ? { ...t.axisCategory.value.axisLabel, formatter: rotuloDia }
            : { show: false },
    });

    return {
        ...t.base.value,
        /* Duas faixas: dinheiro em cima com um pouco mais de altura (a barra
           precisa de amplitude para a diferença entre dias aparecer), leads
           embaixo levando os rótulos de data das duas. */
        grid: [
            { left: 8, right: 12, top: 14, height: '46%', containLabel: true },
            { left: 8, right: 12, bottom: 4, height: '30%', containLabel: true },
        ],
        tooltip: {
            ...t.tooltip.value,
            axisPointer: { ...t.axisPointerBand.value },
            formatter(params) {
                if (!params?.length) return '';
                let day;
                try {
                    day = localDate(params[0].axisValue)
                        .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
                } catch { day = params[0].axisValue; }

                const linhas = [`<b>${day}</b>`];
                const porNome = Object.fromEntries(params.map(p => [p.seriesName, p]));
                for (const p of params) {
                    const valor = p.seriesName === 'Investimento'
                        ? moneyFmt.value.format(p.value)
                        : intFmt.format(p.value);
                    linhas.push(`${p.marker}${p.seriesName}: <b>${valor}</b>`);
                }
                /* O custo do dia é a conta que o eixo duplo pedia para a pessoa
                   fazer de cabeça olhando duas alturas. Aqui ela vem pronta. */
                const gasto = Number(porNome.Investimento?.value) || 0;
                const leads = Number(porNome.Leads?.value) || 0;
                if (gasto && leads) {
                    linhas.push(`<span style="opacity:.7">custo por lead: <b>${moneyFmt.value.format(gasto / leads)}</b></span>`);
                } else if (gasto && !leads) {
                    linhas.push('<span style="opacity:.7">nenhum lead neste dia</span>');
                }
                return linhas.join('<br>');
            },
        },
        /* Liga o ponteiro das duas faixas: marcar um dia marca nas duas. É o que
           devolve a leitura "mesmo dia" que o gráfico único dava de graça. */
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        xAxis: [eixoTempo(false), eixoTempo(true)],
        yAxis: [
            {
                ...t.axisValue.value,
                gridIndex: 0,
                axisLabel: {
                    ...t.axisValue.value.axisLabel,
                    formatter: v => moneyCurto.value.format(v),
                },
            },
            {
                ...t.axisValue.value,
                gridIndex: 1,
                minInterval: 1,          // lead é contagem: meio lead não existe
            },
        ],
        series: [
            t.bar(1, {
                name: 'Investimento',
                xAxisIndex: 0, yAxisIndex: 0,
                data: props.daily.map(d => Number(d.spend) || 0),
                barMaxWidth: 18,
            }),
            t.line(3, {
                name: 'Leads',
                xAxisIndex: 1, yAxisIndex: 1,
                data: props.daily.map(d => Number(d.office_leads) || 0),
                areaStyle: { color: t.areaGradient(3) },
            }),
        ],
    };
});
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-4 flex flex-col">
    <div class="flex items-start justify-between gap-3 mb-2 flex-wrap">
      <div>
        <h2 class="text-micro font-semibold uppercase tracking-wider text-ink-subtle flex items-center gap-2">
          <i class="fas fa-chart-column text-accent"></i>Desempenho diário
        </h2>
        <p class="mt-1 flex items-baseline gap-x-4 gap-y-1 flex-wrap">
          <span>
            <!-- O quadradinho usa a cor REAL da série, lida do tema. -->
            <span class="inline-block w-2.5 h-2.5 rounded-[3px] mr-1.5"
              :style="{ backgroundColor: corInvestimento }"></span>
            <span class="text-lg font-bold text-ink tabular-nums">{{ moneyFmt.format(totalSpend) }}</span>
            <span class="text-xs text-ink-muted ml-1">investidos</span>
          </span>
          <span>
            <span class="inline-block w-2.5 h-[3px] rounded-full mr-1.5 align-middle"
              :style="{ backgroundColor: corLeads }"></span>
            <span class="text-lg font-bold text-ink tabular-nums">{{ intFmt.format(totalLeads) }}</span>
            <span class="text-xs text-ink-muted ml-1">leads na base</span>
          </span>
          <!-- A pergunta que o eixo duplo tentava responder no olho. -->
          <span v-if="custoPorLead !== null">
            <span class="text-lg font-bold text-ink tabular-nums">{{ moneyFmt.format(custoPorLead) }}</span>
            <span class="text-xs text-ink-muted ml-1">por lead</span>
          </span>
        </p>
      </div>
      <span class="text-micro text-ink-subtle font-mono px-2 py-1 rounded-md bg-surface-sunken border border-line shrink-0">
        {{ dias }} dia{{ dias === 1 ? '' : 's' }}
      </span>
    </div>

    <div class="flex-1 min-h-[260px]">
      <VChart v-if="dias" :option="option" autoresize class="h-[260px] w-full" />
      <div v-else class="h-[260px] grid place-items-center text-sm text-ink-subtle">
        Sem dados no período
      </div>
    </div>
  </section>
</template>
