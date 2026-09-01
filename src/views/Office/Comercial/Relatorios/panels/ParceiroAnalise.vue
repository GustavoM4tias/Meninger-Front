<script setup>
// Conteúdo das guias de Imobiliárias e Corretores - a mesma análise, mudando só
// a dimensão de agrupamento (quem fechou a venda, lido da reserva do CV).
//
// ── Por que o ranking virou RankBars em 2026-08-31 ──────────────────────────
// O Faturamento perdeu, no mesmo dia, o alternador Listagem / Pizza / Colunas e
// os gráficos de composição do VGV por imobiliária que moravam dentro do modal
// de detalhe. Aquele dado não sumiu: ele é ESTE ranking - e é aqui que ele pode
// existir, porque só esta guia carrega a visão `ranking` (reserva + corretor +
// lead resolvidos). Levá-lo de volta ao Faturamento significaria pagar essa
// consulta na tela de entrada de todo mundo.
//
// O que faltava aqui era a segunda dimensão: o ranking dizia QUANTO cada
// imobiliária vendeu, nunca DE ONDE vinha esse valor. Agora a barra de
// participação vem repartida por empreendimento, e clicar na linha abre a
// composição NA PRÓPRIA LINHA - que é exatamente o que a pizza mostrava, sem
// modo separado, sem modal para agregado e sem uma segunda tabela dizendo a
// mesma coisa que a primeira.
//
// A tabela manual saiu junto: ela renderizava cartão no celular e tabela no
// desktop, dois desenhos do mesmo dado. Em 01/09 a guia de Leads veio para o
// mesmo bloco (RankPanel) e a RankingTable foi apagada - as três guias
// analíticas passaram a ter forma, espaçamento e exportação idênticos por
// construção.
import { computed, ref } from 'vue';
import StatRow from '@/components/UI/StatRow.vue';
import VendasDoGrupoModal from '../components/VendasDoGrupoModal.vue';

import RankPanel from '../components/RankPanel.vue';

import { agruparVendas, saleVeioDeLead, DIMENSOES } from '@/utils/Comercial/saleAttribution';

const props = defineProps({
  vendas: { type: Array, required: true },
  valorDe: { type: Function, required: true },
  dimensao: { type: String, required: true }, // 'imobiliaria' | 'corretor'
});

const def = computed(() => DIMENSOES[props.dimensao]);

const moeda = (v) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
}).format(Number(v) || 0);

const linhas = computed(() => agruparVendas(props.vendas, props.dimensao, props.valorDe));

// Só as linhas com o dado de fato preenchido entram na contagem de parceiros -
// "sem identificação" não é um parceiro.
const identificadas = computed(() => linhas.value.filter((l) => !l.semDado));

const vgvTotal = computed(() =>
  props.vendas.reduce((s, v) => s + (Number(props.valorDe(v)) || 0), 0));

const lider = computed(() => identificadas.value[0] || null);

// Concentração: quanto do VGV está nos 3 primeiros. Número que a diretoria olha
// para saber se o resultado depende de poucos parceiros.
const top3 = computed(() => {
  const soma = identificadas.value.slice(0, 3).reduce((s, l) => s + l.valor, 0);
  return vgvTotal.value ? (soma / vgvTotal.value) * 100 : 0;
});

const deLead = computed(() => props.vendas.filter(saleVeioDeLead).length);

// Linha do ranking aberta no modal padrão de vendas. O modal é para chegar no
// REGISTRO - o agregado fica na página, sempre visível.
const grupoAberto = ref(null);

const inteiro = (v) => new Intl.NumberFormat('pt-BR').format(Math.round(v) || 0);
const pct = (v) => `${Number(v).toFixed(1)}%`;

// Cartões no primitivo do sistema (o KpiRow local era a quarta implementação de
// cartão de número do Office). `raw` + `format` ligam o count-up.
const kpis = computed(() => [
  {
    key: 'ativas', label: def.value.label + 's ativas', icon: def.value.icon, tone: 'accent',
    raw: identificadas.value.length, format: inteiro,
    hint: `${props.vendas.length} vendas no período`,
  },
  {
    key: 'lider', label: 'Líder do período', icon: 'fas fa-trophy', tone: 'pos',
    // Sem líder não há número para contar: o cartão mostra o traço.
    ...(lider.value ? { raw: lider.value.valor, format: moeda } : { value: '—' }),
    hint: lider.value ? lider.value.label : 'Sem dados',
  },
  {
    key: 'top3', label: 'Concentração top 3', icon: 'fas fa-layer-group', tone: 'warn',
    raw: top3.value, format: pct,
    hint: 'Do VGV do período',
  },
  {
    key: 'lead', label: 'Vendas de lead nosso', icon: 'fas fa-bullhorn', tone: 'neutral',
    raw: deLead.value, format: inteiro,
    hint: props.vendas.length
      ? `${((deLead.value / props.vendas.length) * 100).toFixed(1)}% do período`
      : '',
  },
]);

</script>

<template>
  <div class="space-y-4">
    <StatRow :items="kpis" :cols="{ sm: 2, md: 2, lg: 4 }" />

    <!-- `.panel` em vez da borda escrita a mao: a caixa de nota e uma
         superficie do sistema como qualquer outra, e assim ela acompanha a
         escada de elevacao em vez de virar um quarto degrau proprio. -->
    <div class="panel surface-gradient p-3 text-xs text-ink-muted flex items-start gap-2">
      <i class="fas fa-circle-info text-accent mt-0.5"></i>
      <p>
        Quem aparece aqui é quem <strong class="text-ink">fechou</strong> a venda, lido da
        reserva do CV - não necessariamente quem atendeu o lead. A coluna
        <strong class="text-ink">De lead</strong> mostra quantas dessas vendas começaram
        numa captação nossa.
      </p>
    </div>

    <RankPanel :linhas="linhas" :label="def.label" :icon="def.icon"
      :valor-de="valorDe" show-lead
      :empty-text="`Nenhuma venda do período tem ${def.label.toLowerCase()} identificada na reserva.`"
      @abrir="grupoAberto = $event" />

    <VendasDoGrupoModal :grupo="grupoAberto" :dimensao="def.label"
      @fechar="grupoAberto = null" />
  </div>
</template>
