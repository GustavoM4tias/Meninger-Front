<script setup>
/**
 * "Como o período se formou" — a leitura ANALÍTICA do Dashboard de vendas.
 * ─────────────────────────────────────────────────────────────────────────────
 * Entrou em 2026-08-31, no lugar do alternador Listagem / Pizza / Colunas.
 *
 * A regra do piloto (RECEITA-DE-TELA) diz que ranking e gráfico de composição
 * que a TABELA já mostra ordenando uma coluna são redundância — foi por isso
 * que as pizzas saíram. Este painel não repete a tabela: ele mostra as duas
 * coisas que ordenar coluna nenhuma responde.
 *
 *   1. TEMPO. A tabela não tem eixo de tempo. "Fechamos R$ 12 mi" e "fechamos
 *      R$ 12 mi, sendo R$ 9 mi nos últimos cinco dias" são meses diferentes, e
 *      hoje o segundo era invisível.
 *   2. CONCENTRAÇÃO. É um número derivado: dá para chegar nele somando três
 *      linhas na mão, mas ninguém soma. Quantos empreendimentos seguram 80% do
 *      VGV é a pergunta de risco da diretoria.
 *
 * Fica ACIMA da tabela porque é leitura de conjunto: o detalhe vem depois, e o
 * registro individual só no modal da linha. Uma página, de cima para baixo.
 *
 * Não pede NADA ao servidor: tudo sai de `contractsStore.uniqueSales`, que a
 * tela já tem em memória.
 */
import { computed } from 'vue';
import dayjs from 'dayjs';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useChartTheme } from '@/composables/useChartTheme';

import VChart from 'vue-echarts';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import { TooltipComponent, GridComponent, AxisPointerComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

import Panel from '@/components/UI/Panel.vue';
import MetricInline from '@/components/UI/MetricInline.vue';

echarts.use([BarChart, TooltipComponent, GridComponent, AxisPointerComponent, CanvasRenderer]);

const contractsStore = useContractsStore();
const t = useChartTheme();

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
});
const moedaCurta = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0, notation: 'compact',
});
const inteiro = new Intl.NumberFormat('pt-BR');

/* ── vendas com data utilizável ──────────────────────────────────────────────
 * Data da instituição financeira é o relógio do faturamento (a mesma que o
 * backend usou para montar o período). Venda sem ela não some do total da
 * tela — ela só não tem onde cair no eixo, e o rodapé avisa quantas são.
 */
const vendasComData = computed(() => {
  const out = [];
  for (const sale of contractsStore.uniqueSales || []) {
    const bruto = sale?.financial_institution_date;
    if (!bruto) continue;
    const d = dayjs(String(bruto).slice(0, 10));
    if (!d.isValid()) continue;
    out.push({ data: d, valor: Number(contractsStore.valuePicker(sale)) || 0 });
  }
  return out;
});

const semData = computed(() =>
  (contractsStore.uniqueSales || []).length - vendasComData.value.length);

/* ── granularidade ───────────────────────────────────────────────────────────
 * Um balde por MÊS num filtro de um mês é uma barra só, e uma barra não é um
 * gráfico. Um balde por DIA num filtro de um ano são 365 riscos de 1px. Então
 * a granularidade sai do tamanho do período, e o cabeçalho diz qual é —
 * gráfico que muda de unidade sem avisar faz a pessoa ler o mês como semana.
 */
const periodo = computed(() => {
  const f = contractsStore.filters || {};
  const ini = f.startDate ? dayjs(f.startDate) : null;
  const fim = f.endDate ? dayjs(f.endDate) : null;
  if (ini?.isValid() && fim?.isValid() && !fim.isBefore(ini)) return { ini, fim };

  // Sem período declarado (não acontece hoje, mas o painel não pode depender
  // disso): usa o intervalo das próprias vendas.
  const datas = vendasComData.value.map((v) => v.data).sort((a, b) => a.valueOf() - b.valueOf());
  if (!datas.length) return null;
  return { ini: datas[0], fim: datas[datas.length - 1] };
});

const granularidade = computed(() => {
  if (!periodo.value) return { chave: 'dia', label: 'dia', plural: 'dias' };
  const dias = periodo.value.fim.diff(periodo.value.ini, 'day') + 1;
  if (dias <= 31) return { chave: 'dia', label: 'dia', plural: 'dias' };
  if (dias <= 120) return { chave: 'semana', label: 'semana', plural: 'semanas' };
  return { chave: 'mes', label: 'mês', plural: 'meses' };
});

/* Início do balde a que uma data pertence. A semana começa na SEGUNDA: semana
   que vira no domingo parte o fim de semana em dois baldes. */
const inicioDoBalde = (dj) => {
  if (granularidade.value.chave === 'mes') return dj.startOf('month');
  if (granularidade.value.chave === 'semana') {
    const diaSemana = (dj.day() + 6) % 7;   // 0 = segunda
    return dj.startOf('day').subtract(diaSemana, 'day');
  }
  return dj.startOf('day');
};

/* Os baldes nascem TODOS, do início ao fim do período, mesmo os vazios: sem
   isso o gráfico encosta as barras umas nas outras e uma semana sem venda
   nenhuma some do desenho — que é justamente o que se quer enxergar. */
const baldes = computed(() => {
  if (!periodo.value) return [];

  const mapa = new Map();
  let cursor = inicioDoBalde(periodo.value.ini);
  const limite = inicioDoBalde(periodo.value.fim);
  let guarda = 0;
  while (!cursor.isAfter(limite) && guarda++ < 800) {
    mapa.set(cursor.format('YYYY-MM-DD'), {
      chave: cursor.format('YYYY-MM-DD'), inicio: cursor, valor: 0, vendas: 0,
    });
    cursor = granularidade.value.chave === 'mes' ? cursor.add(1, 'month')
      : granularidade.value.chave === 'semana' ? cursor.add(7, 'day')
        : cursor.add(1, 'day');
  }

  for (const v of vendasComData.value) {
    const b = mapa.get(inicioDoBalde(v.data).format('YYYY-MM-DD'));
    if (!b) continue;                       // venda fora do período declarado
    b.valor += v.valor;
    b.vendas += 1;
  }

  return [...mapa.values()];
});

const rotuloBalde = (b) => (granularidade.value.chave === 'mes'
  ? b.inicio.format('MM/YYYY')
  : b.inicio.format('DD/MM'));

const totalPeriodo = computed(() => baldes.value.reduce((s, b) => s + b.valor, 0));

/* ── o gráfico ───────────────────────────────────────────────────────────────
 * Uma medida (VGV), uma série, uma cor, um eixo. A contagem de vendas mora no
 * tooltip: pôr as duas no mesmo desenho seria eixo duplo, o erro nº 1 de
 * gráfico (DESIGN-LANGUAGE, "Nunca dois eixos no mesmo desenho").
 */
const option = computed(() => ({
  ...t.base.value,
  grid: { ...t.grid.value, top: 14, bottom: 2 },
  tooltip: {
    ...t.tooltip.value,
    axisPointer: { ...t.axisPointerBand.value },
    formatter(params) {
      const p = Array.isArray(params) ? params[0] : params;
      if (!p) return '';
      const b = baldes.value[p.dataIndex];
      if (!b) return '';
      const quando = granularidade.value.chave === 'mes'
        ? b.inicio.format('MM/YYYY')
        : granularidade.value.chave === 'semana'
          ? `semana de ${b.inicio.format('DD/MM')}`
          : b.inicio.format('DD/MM/YYYY');
      const linhas = [
        `<b>${quando}</b>`,
        `${p.marker}${contractsStore.valueModeLabel}: <b>${moeda.format(b.valor)}</b>`,
        b.vendas
          ? `<span style="opacity:.7">${inteiro.format(b.vendas)} venda${b.vendas === 1 ? '' : 's'}</span>`
          : '<span style="opacity:.7">nenhuma venda</span>',
      ];
      if (b.valor > 0 && totalPeriodo.value > 0) {
        linhas.push(`<span style="opacity:.7">${((b.valor / totalPeriodo.value) * 100).toFixed(1)}% do período</span>`);
      }
      return linhas.join('<br>');
    },
  },
  xAxis: {
    type: 'category',
    data: baldes.value.map(rotuloBalde),
    ...t.axisCategory.value,
  },
  yAxis: {
    type: 'value',
    ...t.axisValue.value,
    axisLabel: { ...t.axisValue.value.axisLabel, formatter: (v) => moedaCurta.format(v) },
  },
  series: [t.bar(1, { name: contractsStore.valueModeLabel, data: baldes.value.map((b) => b.valor) })],
}));

/* ── concentração ────────────────────────────────────────────────────────────
 * Lida do MESMO recorte da tabela (`salesDashboard`), então "top 3" quer dizer
 * três empresas quando a tela está por empresa e três empreendimentos quando
 * está por empreendimento — e o rótulo diz qual.
 */
const unidade = computed(() => (contractsStore.groupBy === 'company'
  ? { um: 'empresa', muitos: 'empresas' }
  : { um: 'empreendimento', muitos: 'empreendimentos' }));

const valoresDasLinhas = computed(() =>
  (contractsStore.salesDashboard || [])
    .map((r) => contractsStore.combinedValueForRow(r) || 0)
    .filter((v) => v > 0)
    .sort((a, b) => b - a));

const vgvDasLinhas = computed(() => valoresDasLinhas.value.reduce((s, v) => s + v, 0));

const top3Pct = computed(() => {
  if (!vgvDasLinhas.value) return 0;
  const soma = valoresDasLinhas.value.slice(0, 3).reduce((s, v) => s + v, 0);
  return (soma / vgvDasLinhas.value) * 100;
});

/* Quantas linhas seguram 80% do VGV. É a leitura de RISCO: "duas" e "onze"
   pedem conversas completamente diferentes, e a tabela ordenada não responde
   isso sem alguém somar linha por linha. */
const paraOitentaPct = computed(() => {
  if (!vgvDasLinhas.value) return 0;
  const alvo = vgvDasLinhas.value * 0.8;
  let acumulado = 0;
  let n = 0;
  for (const v of valoresDasLinhas.value) {
    acumulado += v;
    n += 1;
    if (acumulado >= alvo) break;
  }
  return n;
});

const melhorBalde = computed(() =>
  baldes.value.reduce((m, b) => (!m || b.valor > m.valor ? b : m), null));

/* Segunda metade contra a primeira — a mesma régua do Pré-Cadastros. Responde
   "o mês veio no fim?" sem inventar um período anterior que o filtro não
   declarou. */
const segundaMetadePct = computed(() => {
  const n = baldes.value.length;
  if (n < 2 || !totalPeriodo.value) return null;
  const corte = Math.ceil(n / 2);
  const fim = baldes.value.slice(corte).reduce((s, b) => s + b.valor, 0);
  return (fim / totalPeriodo.value) * 100;
});

const fmtPct = (v) => `${Number(v).toFixed(1)}%`;

const metricas = computed(() => {
  const m = [
    {
      key: 'top3', label: 'Concentração top 3', icon: 'fas fa-layer-group', tone: 'accent',
      raw: top3Pct.value, format: fmtPct, decimals: 1,
      hint: `do ${contractsStore.valueModeLabel} do período`,
      tooltip: `Quanto do ${contractsStore.valueModeLabel} está nas 3 maiores ${unidade.value.muitos}`,
    },
    {
      key: 'oitenta', label: `${unidade.value.muitos} até 80%`, icon: 'fas fa-percent',
      raw: paraOitentaPct.value, format: (v) => inteiro.format(Math.round(v)),
      hint: `de ${inteiro.format(valoresDasLinhas.value.length)} com venda`,
      tooltip: `Quantas ${unidade.value.muitos} somam 80% do ${contractsStore.valueModeLabel}. Quanto menor, mais o período depende de poucas.`,
    },
  ];

  if (melhorBalde.value && melhorBalde.value.valor > 0) {
    m.push({
      key: 'melhor', label: `Melhor ${granularidade.value.label}`, icon: 'fas fa-arrow-trend-up', tone: 'pos',
      raw: melhorBalde.value.valor, format: (v) => moedaCurta.format(v),
      hint: rotuloBalde(melhorBalde.value),
      tooltip: `${moeda.format(melhorBalde.value.valor)} em ${inteiro.format(melhorBalde.value.vendas)} venda(s)`,
    });
  }

  if (segundaMetadePct.value != null) {
    m.push({
      key: 'metade', label: 'Na 2ª metade', icon: 'fas fa-hourglass-half',
      raw: segundaMetadePct.value, format: fmtPct, decimals: 1,
      hint: 'do período filtrado',
      tooltip: 'Quanto do valor caiu na segunda metade do período. Perto de 50% é ritmo constante; muito acima disso é resultado que se decide no fim.',
    });
  }

  return m;
});

const vazio = computed(() => !baldes.value.length || totalPeriodo.value <= 0);

const subtitulo = computed(() => {
  if (!periodo.value) return '';
  const p = `${periodo.value.ini.format('DD/MM/YYYY')} a ${periodo.value.fim.format('DD/MM/YYYY')}`;
  return `${p} · por ${granularidade.value.label} · ${contractsStore.valueModeLabel}`;
});
</script>

<template>
  <Panel icon="fas fa-chart-column" title="Como o período se formou" :subtitle="subtitulo"
    :padded="false" :empty="vazio" empty-icon="fas fa-chart-column"
    empty-title="Sem vendas no período"
    empty-text="Ajuste o filtro de período, empresa ou cidade para ver o ritmo das vendas.">

    <div class="px-2 pt-3 sm:px-3">
      <VChart :option="option" autoresize class="h-[200px] sm:h-[240px] w-full" />
    </div>

    <MetricInline :items="metricas" class="mt-3" />

    <template v-if="semData > 0" #footer>
      <i class="fas fa-circle-info mr-1.5"></i>
      {{ semData }} venda(s) sem data da instituição financeira ficaram fora do desenho —
      elas continuam somando nos cartões e na tabela.
    </template>
  </Panel>
</template>
