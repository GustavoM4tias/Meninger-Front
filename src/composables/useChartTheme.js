/**
 * useChartTheme — tema único para todo gráfico ECharts do Office.
 * ─────────────────────────────────────────────────────────────────────────────
 * ANTES: cada gráfico escrevia o hex na mão e inventava o próprio jeito de
 * descobrir o tema (uns com MutationObserver, uns recebendo `isDark` por prop,
 * cinco sem nenhum). No escuro, esses cinco ficavam com eixo cinza-claro sobre
 * quase-preto.
 *
 * AGORA: um observer só para o app inteiro, e o gráfico pede as partes prontas.
 *
 *   import { useChartTheme } from '@/composables/useChartTheme';
 *   const t = useChartTheme();
 *
 *   const option = computed(() => ({
 *     ...t.base.value,                       // tipografia + animação
 *     grid: t.grid.value,
 *     tooltip: t.tooltip.value,
 *     legend: t.legend.value,                // sempre, com 2+ séries
 *     xAxis: { type: 'category', data: labels.value, ...t.axisCategory.value },
 *     yAxis: { type: 'value', ...t.axisValue.value },
 *     series: [
 *       t.bar(1, { name: 'Vendas', data: vendas.value }),
 *       t.line(3, { name: 'Meta', data: meta.value }),
 *     ],
 *   }));
 *
 * As fábricas `t.bar / t.line / t.area / t.donut` é que padronizam espaçamento,
 * arredondamento e movimento. Qualquer chave extra passa direto para o ECharts,
 * então dá para ajustar um caso sem sair do padrão.
 *
 * REGRAS (ver _design/DESIGN-LANGUAGE.md):
 * - Cor de série vem de `t.color(n)` ou `t.palette.value`, em ORDEM FIXA: a cor
 *   segue a entidade, não a posição no filtro. Filtrar não pode repintar quem
 *   sobrou.
 * - Nunca cicle a paleta. A 9ª série vira "Outros" ou vai para gráficos
 *   separados (small multiples).
 * - Cores de estado (`t.pos`, `t.neg`, `t.warn`) são RESERVADAS: nunca use como
 *   "série 4".
 * - Um eixo só. Duas medidas de escala diferente = dois gráficos.
 */
import { ref, computed, readonly } from 'vue';

/* ── estado de tema: um observer para o app todo ──────────────────────────── */
const isDark = ref(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
);

if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => {
        isDark.value = document.documentElement.classList.contains('dark');
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

/* ── leitura dos tokens ───────────────────────────────────────────────────────
   Os valores vivem no main.css como "R G B" (formato do Tailwind com
   <alpha-value>). Lemos de lá para não haver duas fontes de verdade: mudou o
   token, mudou o gráfico. O fallback cobre SSR e o primeiro paint. */
const FALLBACK = {
    '--series-1': '37 99 235', '--series-2': '217 119 6', '--series-3': '13 148 136',
    '--series-4': '124 58 237', '--series-5': '219 39 119', '--series-6': '154 52 18',
    '--series-7': '8 145 178', '--series-8': '77 124 15',
    '--ink': '15 23 42', '--ink-muted': '71 85 105', '--ink-subtle': '148 163 184',
    '--line': '226 232 240', '--line-subtle': '241 245 249',
    '--surface-raised': '248 250 252', '--surface-overlay': '255 255 255',
    '--data-pos': '4 120 87', '--data-neg': '185 28 28', '--data-warn': '180 83 9',
    '--data-neutral': '148 163 184',
};

function token(name, alpha) {
    let raw = FALLBACK[name];
    if (typeof document !== 'undefined') {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        if (v) raw = v;
    }
    return alpha == null ? `rgb(${raw})` : `rgba(${raw.split(/\s+/).join(', ')}, ${alpha})`;
}

export function useChartTheme() {
    /* `isDark` entra em toda computed de propósito: é o que faz o ECharts
       recalcular a option quando o usuário troca o tema. */
    const dep = () => isDark.value;

    const palette = computed(() => (dep(), [1, 2, 3, 4, 5, 6, 7, 8].map((i) => token(`--series-${i}`))));

    /** Cor da série n (1-8). Acima de 8, devolve neutro: é o sinal de que a
     *  série deveria ter virado "Outros" em vez de ganhar cor nova. */
    const color = (n) => (dep(), n >= 1 && n <= 8 ? token(`--series-${n}`) : token('--data-neutral'));

    /** Gradiente de área para gráfico de linha (a cor da série esmaecendo). */
    const areaGradient = (n, from = 0.22, to = 0.02) => {
        const c = color(n);
        const rgb = c.replace('rgb(', '').replace(')', '');
        return {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
                { offset: 0, color: `rgba(${rgb.split(/[\s,]+/).join(', ')}, ${from})` },
                { offset: 1, color: `rgba(${rgb.split(/[\s,]+/).join(', ')}, ${to})` },
            ],
        };
    };

    const ink = computed(() => (dep(), token('--ink')));
    const inkMuted = computed(() => (dep(), token('--ink-muted')));
    const inkSubtle = computed(() => (dep(), token('--ink-subtle')));
    const pos = computed(() => (dep(), token('--data-pos')));
    const neg = computed(() => (dep(), token('--data-neg')));
    const warn = computed(() => (dep(), token('--data-warn')));
    const neutral = computed(() => (dep(), token('--data-neutral')));

    /* Base: tipografia e animação. Entrada curta - o gráfico é ferramenta de
       leitura, não abertura de filme. Quem liga "reduzir movimento" no sistema
       recebe o gráfico já montado, sem animação (o CSS não alcança o canvas do
       ECharts, então a checagem tem que ser aqui). */
    const base = computed(() => {
        dep();
        const reduzido = typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        return {
            textStyle: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontSize: 12 },
            animation: !reduzido,
            animationDuration: 480,
            animationEasing: 'cubicOut',
            /* Atualização de dado (troca de filtro) é mais rápida que a entrada:
               o gráfico já está na tela, só o valor mudou. */
            animationDurationUpdate: 320,
            animationEasingUpdate: 'cubicInOut',
        };
    });

    /* Grade: `containLabel` para o rótulo do eixo nunca ser cortado no celular. */
    const grid = computed(() => (dep(), {
        left: 8, right: 12, top: 16, bottom: 4, containLabel: true,
    }));

    /* Eixos recessivos: a linha de base fica, a moldura sai, a grade é quase
       invisível. Quem tem que aparecer é o dado. */
    const axisCategory = computed(() => (dep(), {
        axisLine: { lineStyle: { color: token('--line') } },
        axisTick: { show: false },
        axisLabel: { color: token('--ink-subtle'), fontSize: 11, hideOverlap: true },
        splitLine: { show: false },
    }));

    const axisValue = computed(() => (dep(), {
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: token('--ink-subtle'), fontSize: 11 },
        splitLine: { lineStyle: { color: token('--line-subtle'), type: 'dashed' } },
    }));

    /* Tooltip na superfície de overlay, com a mesma sombra dos dropdowns. */
    const tooltip = computed(() => (dep(), {
        trigger: 'axis',
        backgroundColor: token('--surface-overlay'),
        borderColor: token('--line'),
        borderWidth: 1,
        padding: [8, 10],
        textStyle: { color: token('--ink'), fontSize: 12 },
        extraCssText: 'border-radius:10px; box-shadow:0 16px 40px -10px rgba(15,23,42,.22);',
        axisPointer: { type: 'line', lineStyle: { color: token('--line-strong') } },
    }));

    /* Legenda embaixo: no celular ela precisa quebrar em linhas sem comer a
       altura do gráfico. Sempre presente com 2+ séries - identidade nunca pode
       depender só de cor. */
    const legend = computed(() => (dep(), {
        bottom: 0, left: 'center', icon: 'roundRect',
        itemWidth: 10, itemHeight: 10, itemGap: 14,
        textStyle: { color: token('--ink-muted'), fontSize: 11 },
    }));

    /* ── Fábricas de série ───────────────────────────────────────────────────
       É aqui que espaçamento, arredondamento e movimento ficam iguais em todo
       gráfico do sistema. Em vez de cada tela escrever `itemStyle`,
       `barMaxWidth` e `animationDelay` do seu jeito, ela pede a marca pronta:

         series: [
           t.bar(1, { name: 'Vendas', data: v }),
           t.line(3, { name: 'Meta', data: m }),
         ]

       Qualquer chave extra passa direto para o ECharts, então dá para
       sobrescrever pontualmente sem abandonar o padrão. */

    /* Entrada escalonada por ponto: as barras/pontos chegam da esquerda para a
       direita em vez de aparecerem todos de uma vez. Satura em 40 para série
       longa não levar meio minuto. */
    const stagger = (mult = 26) => (i) => Math.min(i, 40) * mult;

    /** Barra. Ponta arredondada de 5px ancorada na linha de base, largura com
     *  teto (barra gorda em série curta fica amadora) e realce no hover. */
    const bar = (slot, opts = {}) => {
        const { stacked, ...rest } = opts;
        return {
            type: 'bar',
            barMaxWidth: 34,
            barGap: '12%',
            barCategoryGap: '28%',
            itemStyle: {
                color: color(slot),
                /* Empilhada leva raio pequeno e um respiro de 2px na cor da
                   superfície entre os segmentos, senão viram um bloco só. */
                borderRadius: stacked ? 2 : [5, 5, 0, 0],
                ...(stacked ? { borderColor: token('--surface-raised'), borderWidth: 2 } : {}),
            },
            emphasis: { focus: 'series', itemStyle: { color: color(slot), opacity: 1 } },
            blur: { itemStyle: { opacity: 0.28 } },
            animationDelay: stagger(),
            ...(stacked ? { stack: typeof stacked === 'string' ? stacked : 'total' } : {}),
            ...rest,
        };
    };

    /** Linha. Traço de 2px, sem bolinha em repouso e bolinha de 8px no hover
     *  (o ponto só precisa existir quando alguém está mirando nele). */
    const line = (slot, opts = {}) => ({
        type: 'line',
        smooth: 0.25,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: color(slot), width: 2, cap: 'round', join: 'round' },
        itemStyle: { color: color(slot), borderColor: token('--surface-raised'), borderWidth: 2 },
        emphasis: { focus: 'series', scale: 1.4 },
        blur: { lineStyle: { opacity: 0.25 } },
        animationDelay: stagger(18),
        ...opts,
    });

    /** Área: a linha com a própria cor esmaecendo até sumir. Para UMA série
     *  principal; com muitas séries a área vira sopa e o certo é `line`. */
    const area = (slot, opts = {}) => ({
        ...line(slot, {}),
        areaStyle: { color: areaGradient(slot) },
        ...opts,
    });

    /** Rosca. Buraco grande (o número vai no meio), respiro de 2px entre
     *  fatias e canto arredondado. Nunca use como pizza cheia: comparar
     *  ângulo sem o furo é pior, não melhor. */
    const donut = (opts = {}) => {
        const { centerLabel, ...rest } = opts;
        return {
            type: 'pie',
            radius: ['62%', '86%'],
            center: ['50%', '48%'],
            avoidLabelOverlap: true,
            padAngle: 1.5,
            itemStyle: {
                borderRadius: 6,
                borderColor: token('--surface-raised'),
                borderWidth: 2,
            },
            label: centerLabel
                ? {
                    show: true, position: 'center', formatter: centerLabel,
                    color: token('--ink'), fontSize: 20, fontWeight: 600, lineHeight: 24,
                }
                : { show: false },
            labelLine: { show: false },
            emphasis: {
                scale: true, scaleSize: 4,
                itemStyle: { shadowBlur: 14, shadowColor: 'rgba(15,23,42,.18)' },
                ...(centerLabel ? { label: { show: true, fontSize: 20 } } : {}),
            },
            animationType: 'scale',
            animationEasing: 'elasticOut',
            animationDuration: 620,
            ...rest,
        };
    };

    /* Ponteiro em faixa: no toque do celular a linha fina de 1px é difícil de
       acertar; a faixa cobre a categoria inteira. */
    const axisPointerBand = computed(() => (dep(), {
        type: 'shadow',
        shadowStyle: { color: token('--ink', 0.05) },
    }));

    return {
        isDark: readonly(isDark),
        palette, color, areaGradient,
        base, grid, axisCategory, axisValue, tooltip, legend, axisPointerBand,
        bar, line, area, donut, stagger,
        ink, inkMuted, inkSubtle, pos, neg, warn, neutral,
        token,
    };
}

export default useChartTheme;
