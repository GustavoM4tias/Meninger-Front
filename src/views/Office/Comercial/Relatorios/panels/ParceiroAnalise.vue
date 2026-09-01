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
// A tabela manual saiu junto (RankingTable continua servindo a guia de Leads,
// que não tem composição para mostrar): ela renderizava cartão no celular e
// tabela no desktop, dois desenhos do mesmo dado. O RankBars é uma coluna de
// linhas nas duas larguras.
import { computed, ref } from 'vue';
import KpiRow from '../components/KpiRow.vue';
import VendasDoGrupoModal from '../components/VendasDoGrupoModal.vue';

import Panel from '@/components/UI/Panel.vue';
import RankBars from '@/components/UI/RankBars.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Export from '@/components/config/Export.vue';

import { agruparVendas, comporLinhas, saleVeioDeLead, DIMENSOES } from '@/utils/Comercial/saleAttribution';

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

/* A segunda dimensão. `comporLinhas` decide o slot de cor de cada
   empreendimento UMA vez, pelo VGV do conjunto - então a mesma cor é o mesmo
   empreendimento em todas as linhas, e não a "primeira faixa" de cada uma. */
const composicao = computed(() => comporLinhas(linhas.value, 'empreendimento', props.valorDe));

/* Classe por slot, escrita por extenso. `bg-series-${n}` não existe: o Tailwind
   varre o TEXTO do arquivo, então classe montada em runtime não gera CSS.
   Slot 0 é o "Outros" - neutro de propósito, porque ciclar a paleta diria que
   duas entidades diferentes são a mesma. Faixa é ÁREA, então `-soft`. */
const CLASSES_SLOT = [
  { bar: 'bg-data-neutral-area', text: 'text-ink-muted' },
  { bar: 'bg-series-1-soft', text: 'text-series-1' },
  { bar: 'bg-series-2-soft', text: 'text-series-2' },
  { bar: 'bg-series-3-soft', text: 'text-series-3' },
  { bar: 'bg-series-4-soft', text: 'text-series-4' },
  { bar: 'bg-series-5-soft', text: 'text-series-5' },
  { bar: 'bg-series-6-soft', text: 'text-series-6' },
  { bar: 'bg-series-7-soft', text: 'text-series-7' },
  { bar: 'bg-series-8-soft', text: 'text-series-8' },
];

const segmentos = computed(() => composicao.value.segmentos.map((s) => ({
  key: s.key,
  label: s.label,
  ...(CLASSES_SLOT[s.slot] || CLASSES_SLOT[0]),
})));

const itens = computed(() => composicao.value.linhas.map((l) => ({
  key: l.chave,
  label: l.label,
  value: l.valor,
  segments: l.segments,
  meta: [
    `${l.vendas} venda${l.vendas === 1 ? '' : 's'}`,
    `ticket ${moeda(l.ticket)}`,
    l.comLead ? `${l.comLead} de lead` : null,
  ].filter(Boolean).join(' · '),
  /* `semDado` não é um parceiro: era itálico na tabela antiga, aqui é selo -
     cor sozinha nunca identifica nada. */
  badge: l.semDado
    ? { text: 'sem identificação', class: 'bg-surface-sunken text-ink-muted' }
    : null,
  _linha: l,
})));

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

const kpis = computed(() => [
  {
    label: def.value.label + 's ativas', icon: def.value.icon, tone: 'accent',
    value: String(identificadas.value.length),
    hint: `${props.vendas.length} vendas no período`,
  },
  {
    label: 'Líder do período', icon: 'fas fa-trophy', tone: 'success',
    value: lider.value ? moeda(lider.value.valor) : '—',
    hint: lider.value ? lider.value.label : 'Sem dados',
  },
  {
    label: 'Concentração top 3', icon: 'fas fa-chart-pie', tone: 'warning',
    value: `${top3.value.toFixed(1)}%`,
    hint: 'Do VGV do período',
  },
  {
    label: 'Vendas de lead nosso', icon: 'fas fa-bullhorn', tone: 'neutral',
    value: String(deLead.value),
    hint: props.vendas.length
      ? `${((deLead.value / props.vendas.length) * 100).toFixed(1)}% do período`
      : '',
  },
]);

const totalVendas = computed(() => linhas.value.reduce((s, l) => s + l.vendas, 0));

// ── Exportar ────────────────────────────────────────────────────────────────
// Sai a lista INTEIRA, não só o que está à vista: o "Ver as outras N" é recorte
// de leitura, e planilha truncada em silêncio é pior que planilha nenhuma.
// `itens` (as vendas de cada linha) fica de fora - é objeto aninhado e pesado,
// e quem quer venda a venda abre a linha.
const exportOpen = ref(false);

const dadosExport = computed(() => composicao.value.linhas.map((l, i) => {
  const linha = {
    'Posição': i + 1,
    [def.value.label]: l.label,
    'Vendas': l.vendas,
    'De lead': l.comLead,
    'Ticket': Number(l.ticket) || 0,
    'VGV': Number(l.valor) || 0,
    'Participação (%)': Number((Number(l.shareValor) || 0).toFixed(1)),
  };
  // A composição por empreendimento entra como coluna por empreendimento: é o
  // mesmo cruzamento que a barra mostra, só que somável na planilha.
  for (const s of composicao.value.segmentos) {
    linha[`VGV ${s.label}`] = Number(l.segments?.[s.key] || 0);
  }
  return linha;
}));

const camposExport = computed(() => Object.keys(dadosExport.value[0] || {}));
</script>

<template>
  <div class="space-y-4">
    <KpiRow :items="kpis" />

    <div class="rounded-xl border border-line bg-surface-raised surface-gradient p-3
                text-xs text-ink-muted flex items-start gap-2">
      <i class="fas fa-circle-info text-accent mt-0.5"></i>
      <p>
        Quem aparece aqui é quem <strong class="text-ink">fechou</strong> a venda, lido da
        reserva do CV - não necessariamente quem atendeu o lead. A coluna
        <strong class="text-ink">De lead</strong> mostra quantas dessas vendas começaram
        numa captação nossa.
      </p>
    </div>

    <Panel :icon="def.icon" :title="`Ranking por ${def.label.toLowerCase()}`"
      :subtitle="`${linhas.length} ${def.label.toLowerCase()}(s) · ${totalVendas} venda(s) · ${moeda(vgvTotal)} · barra repartida por empreendimento`"
      :empty="!linhas.length" :empty-icon="def.icon" empty-title="Sem dados"
      :empty-text="`Nenhuma venda do período tem ${def.label.toLowerCase()} identificada na reserva.`">

      <template #actions>
        <IconButton icon="fas fa-download" size="sm" label="Exportar dados"
          @click="exportOpen = true" />
      </template>

      <!-- Clicar na linha abre a COMPOSIÇÃO ali mesmo; o botão da linha leva às
           vendas. Duas coisas diferentes, dois alvos, nenhum modo. -->
      <RankBars :items="itens" :segments="segmentos" :value-format="moeda"
        action-icon="fas fa-list" action-label="Ver as vendas"
        :empty-title="`Nenhuma ${def.label.toLowerCase()} no período`"
        empty-text="Ajuste os filtros para ver resultados."
        @action="grupoAberto = $event._linha" />

      <template #footer>
        Clique numa linha para ver de quais empreendimentos veio o valor.
      </template>
    </Panel>

    <VendasDoGrupoModal :grupo="grupoAberto" :dimensao="def.label"
      @fechar="grupoAberto = null" />

    <Export v-model="exportOpen" :source="dadosExport"
      :title="`Ranking por ${def.label.toLowerCase()}`" :preselect="camposExport" />
  </div>
</template>
