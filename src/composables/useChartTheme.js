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
 * - MARCA e ÁREA são rampas diferentes. `t.color(n)` / `t.palette` é a MARCA
 *   (traço, ponto, ícone, swatch da legenda); `t.fill(n)` / `t.fillPalette` é a
 *   ÁREA (barra, fatia, faixa). As fábricas já escolhem sozinhas — só importa
 *   se você montar `itemStyle` na mão.
 *   Por que duas: a cor calibrada para um traço de 2px, esticada num bloco,
 *   deixa o tema claro pesado. E não dá para simplesmente clarear a rampa
 *   inteira - 8 matizes pálidas sobre branco param de se distinguir (medido).
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
    /* rampa de ÁREA (preenchimento) — sem estes, `fill()` cai em `rgb(undefined)`
       no primeiro quadro, antes de o CSS resolver. */
    '--series-1-soft': '96 165 250', '--series-2-soft': '251 191 36', '--series-3-soft': '45 212 191',
    '--series-4-soft': '167 139 250', '--series-5-soft': '244 114 182', '--series-6-soft': '251 146 60',
    '--series-7-soft': '34 211 238', '--series-8-soft': '163 230 53',
    '--data-pos': '4 120 87', '--data-neg': '185 28 28', '--data-warn': '180 83 9',
    '--data-neutral': '148 163 184',
    '--data-pos-area': '52 211 153', '--data-neg-area': '248 113 113',
    '--data-warn-area': '251 191 36', '--data-neutral-area': '203 213 225',
    '--accent': '37 99 235', '--surface': '255 255 255', '--surface-sunken': '241 245 249',
    '--line-strong': '203 213 225', '--scrim': '15 23 42',
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
    /** A mesma ordem, na versão de ÁREA. Use em qualquer coisa que PINTE
     *  superfície (rosca, funil, mapa de calor, faixa). Ver `fill()`. */
    const fillPalette = computed(() => (dep(), [1, 2, 3, 4, 5, 6, 7, 8].map((i) => token(`--series-${i}-soft`))));

    /** Cor da série n (1-8) na versão MARCA: forte, para traço fino, ponto e
     *  ícone, que só se enxergam com contraste. Acima de 8, devolve neutro: é o
     *  sinal de que a série deveria ter virado "Outros" em vez de ganhar cor nova. */
    const color = (n) => (dep(), n >= 1 && n <= 8 ? token(`--series-${n}`) : token('--data-neutral'));

    /** A mesma cor na versão ÁREA: um tom acima, para PREENCHIMENTO grande
     *  (barra, fatia da rosca, faixa do funil).
     *
     *  Esta é a regra que faltava e que deixava o tema claro pesado: a cor
     *  calibrada para ser vista num traço de 2px, esticada por 30% da largura
     *  da tela, vira um bloco que grita. A checagem de 3:1 contra o fundo vale
     *  para marca pequena; numa barra de 16px o que precisa separar é uma faixa
     *  da outra, e a rampa `-soft` mantém isso (ΔE 10,3 para daltonismo, 15,9
     *  para visão normal - medido, não estimado).
     *
     *  Não dá para simplesmente clarear tudo: 8 matizes categóricas pálidas
     *  sobre branco deixam de se distinguir (medido: qualquer lavagem acima de
     *  5% derruba o piso de croma). Por isso são DUAS rampas, e não uma. */
    const fill = (n) => (dep(), n >= 1 && n <= 8 ? token(`--series-${n}-soft`) : token('--data-neutral'));

    /** Gradiente de área para gráfico de linha (a cor da série esmaecendo). */
    const areaGradient = (n, from = 0.22, to = 0.02) => {
        const c = fill(n);
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
    /* Estado como MARCA (linha, texto, ícone). */
    const pos = computed(() => (dep(), token('--data-pos')));
    const neg = computed(() => (dep(), token('--data-neg')));
    const warn = computed(() => (dep(), token('--data-warn')));
    const neutral = computed(() => (dep(), token('--data-neutral')));

    /* Estado como ÁREA (barra, fatia). Mesma regra das séries: o tom da marca
       preenchendo um bloco pesa. Use com `t.barTone('pos', {...})`. */
    const posArea = computed(() => (dep(), token('--data-pos-area')));
    const negArea = computed(() => (dep(), token('--data-neg-area')));
    const warnArea = computed(() => (dep(), token('--data-warn-area')));
    const neutralArea = computed(() => (dep(), token('--data-neutral-area')));
    const TOM = {
        pos:     [posArea, pos],
        neg:     [negArea, neg],
        warn:    [warnArea, warn],
        neutral: [neutralArea, neutral],
    };

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
                /* Barra é ÁREA: tom `-soft`. Com o tom de marca, um gráfico de
                   seis barras no tema claro vira uma parede de cor. */
                color: fill(slot),
                /* Empilhada leva raio pequeno e um respiro de 2px na cor da
                   superfície entre os segmentos, senão viram um bloco só. */
                borderRadius: stacked ? 2 : [5, 5, 0, 0],
                ...(stacked ? { borderColor: token('--surface-raised'), borderWidth: 2 } : {}),
            },
            /* No hover a barra sobe para o tom de MARCA: o realce passa a ser
               a própria cor firmando, sem precisar de sombra nem borda. */
            emphasis: { focus: 'series', itemStyle: { color: color(slot), opacity: 1 } },
            blur: { itemStyle: { opacity: 0.28 } },
            animationDelay: stagger(),
            ...(stacked ? { stack: typeof stacked === 'string' ? stacked : 'total' } : {}),
            ...rest,
        };
    };

    /** Barra de ESTADO: quando a cor significa bom/atenção/ruim em vez de
     *  identificar uma série. `tom` = 'pos' | 'neg' | 'warn' | 'neutral'.
     *  Preenche com o degrau de área e firma no tom de marca ao passar o mouse. */
    const barTone = (tom, opts = {}) => {
        const [area, marca] = TOM[tom] ?? TOM.neutral;
        const b = bar(1, opts);
        return {
            ...b,
            itemStyle: { ...b.itemStyle, color: area.value },
            emphasis: { focus: 'series', itemStyle: { color: marca.value, opacity: 1 } },
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
                /* Fatia é ÁREA: tom `-soft`, na mesma ordem fixa da paleta.
                   Sem isto a rosca fica com seis blocos saturados no claro. */
                color: (p) => fillPalette.value[p.dataIndex % 8],
                borderRadius: 6,
                borderColor: token('--surface-raised'),
                borderWidth: 2,
            },
            /* Realce por ESCALA, não por cor. A rosca costuma receber cor por
               item (ex.: uma fatia "Outros" neutra); trocar a cor no hover
               pintaria essa fatia com um matiz que ela não tem. */
            emphasis: { scale: true, scaleSize: 6 },
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
        palette, fillPalette, color, fill, areaGradient,
        base, grid, axisCategory, axisValue, tooltip, legend, axisPointerBand,
        bar, barTone, line, area, donut, stagger,
        ink, inkMuted, inkSubtle, pos, neg, warn, neutral,
        posArea, negArea, warnArea, neutralArea,
        token,
    };
}

export default useChartTheme;
