<script setup>
/**
 * Painel de ranking do Relatório Comercial — o MESMO nas três guias analíticas.
 * ─────────────────────────────────────────────────────────────────────────────
 * Nasceu em 2026-09-01 juntando duas implementações que mostravam a mesma coisa
 * de jeitos diferentes: Imobiliárias e Corretores já usavam `RankBars`, e Leads
 * ainda usava a `RankingTable` (que desenhava cartão no celular e tabela no
 * desktop, dois desenhos do mesmo dado). Trocar de guia mudava o layout sem
 * mudar a pergunta — era a inconsistência mais visível do relatório.
 *
 * Agora existe um bloco só. O que varia entre as guias é o que deve variar: a
 * dimensão do ranking e o rótulo. Forma, espaçamento, borda e exportação são os
 * mesmos por construção, não por disciplina de quem edita.
 *
 * A barra vem SEMPRE repartida por empreendimento: o ranking responde "quanto",
 * e a repartição responde "de onde veio" sem pedir uma segunda leitura. Clicar
 * na linha abre a composição ali mesmo; o botão da linha leva às vendas.
 */
import { computed, ref } from 'vue';

import Panel from '@/components/UI/Panel.vue';
import RankBars from '@/components/UI/RankBars.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Export from '@/components/config/Export.vue';

import { comporLinhas } from '@/utils/Comercial/saleAttribution';

const props = defineProps({
  /* saída de `agruparVendas` — cada linha traz `itens` (as vendas dela) */
  linhas: { type: Array, required: true },
  /* rótulo da dimensão no singular: "Imobiliária", "Mídia", "Campanha"... */
  label: { type: String, required: true },
  icon: { type: String, default: 'fas fa-list' },
  /* mesma função de valor do agrupamento, para a composição bater com o total */
  valorDe: { type: Function, required: true },
  emptyText: { type: String, default: 'Nada para mostrar neste período.' },
  /* "de lead" só faz sentido no ranking de quem VENDEU */
  showLead: { type: Boolean, default: false },
});

const emit = defineEmits(['abrir']);

const moeda = (v) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
}).format(Number(v) || 0);

/* `comporLinhas` decide o slot de cor de cada empreendimento UMA vez, pelo VGV
   do conjunto — então a mesma cor é o mesmo empreendimento em todas as linhas,
   e não a "primeira faixa" de cada uma. */
const composicao = computed(() => comporLinhas(props.linhas, 'empreendimento', props.valorDe));

/* Classe por slot, escrita por extenso: `bg-series-${n}` não gera CSS, porque o
   Tailwind varre o TEXTO do arquivo. Slot 0 é o "Outros", neutro de propósito —
   ciclar a paleta diria que duas entidades diferentes são a mesma. Faixa é
   ÁREA, então `-soft`. */
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
    props.showLead && l.comLead ? `${l.comLead} de lead` : null,
  ].filter(Boolean).join(' · '),
  /* "sem identificação" não é um parceiro: vira selo, porque cor sozinha (o
     itálico da tabela antiga) não identifica nada. */
  badge: l.semDado
    ? { text: 'sem identificação', class: 'bg-surface-sunken text-ink-muted' }
    : null,
  _linha: l,
})));

const totalVendas = computed(() => props.linhas.reduce((s, l) => s + l.vendas, 0));
const totalValor = computed(() => props.linhas.reduce((s, l) => s + (Number(l.valor) || 0), 0));

const subtitulo = computed(() => {
  const n = props.linhas.length;
  const rot = props.label.toLowerCase();
  return `${n} ${rot}${n === 1 ? '' : 's'} · ${totalVendas.value} venda${totalVendas.value === 1 ? '' : 's'}`
    + ` · ${moeda(totalValor.value)} · barra repartida por empreendimento`;
});

/* ── Exportar ────────────────────────────────────────────────────────────────
 * Sai a lista INTEIRA, não só o que está à vista: o "Ver as outras N" é recorte
 * de leitura, e planilha truncada em silêncio é pior que planilha nenhuma.
 * `itens` (as vendas de cada linha) fica de fora — é objeto aninhado e pesado,
 * e quem quer venda a venda abre a linha.
 */
const exportOpen = ref(false);

const dadosExport = computed(() => composicao.value.linhas.map((l, i) => {
  const linha = {
    'Posição': i + 1,
    [props.label]: l.label,
    'Vendas': l.vendas,
  };
  if (props.showLead) linha['De lead'] = l.comLead;
  linha['Ticket'] = Number(l.ticket) || 0;
  linha['VGV'] = Number(l.valor) || 0;
  linha['Participação (%)'] = Number((Number(l.shareValor) || 0).toFixed(1));
  // A composição entra como coluna por empreendimento: o mesmo cruzamento que a
  // barra mostra, só que somável na planilha.
  for (const s of composicao.value.segmentos) {
    linha[`VGV ${s.label}`] = Number(l.segments?.[s.key] || 0);
  }
  return linha;
}));

const camposExport = computed(() => Object.keys(dadosExport.value[0] || {}));
</script>

<template>
  <Panel :icon="icon" :title="`Ranking por ${label.toLowerCase()}`" :subtitle="subtitulo"
    :empty="!linhas.length" :empty-icon="icon" empty-title="Sem dados" :empty-text="emptyText">

    <template #actions>
      <IconButton icon="fas fa-download" size="sm" label="Exportar dados"
        @click="exportOpen = true" />
    </template>

    <!-- Clicar na linha abre a COMPOSIÇÃO ali mesmo; o botão da linha leva às
         vendas. Duas coisas diferentes, dois alvos, nenhum modo. -->
    <RankBars :items="itens" :segments="segmentos" :value-format="moeda"
      action-icon="fas fa-list" action-label="Ver as vendas"
      :empty-title="`Nenhuma ${label.toLowerCase()} no período`"
      empty-text="Ajuste os filtros para ver resultados."
      @action="emit('abrir', $event._linha)" />

    <template #footer>
      Clique numa linha para ver de quais empreendimentos veio o valor.
    </template>
  </Panel>

  <Export v-model="exportOpen" :source="dadosExport"
    :title="`Ranking por ${label.toLowerCase()}`" :preselect="camposExport" />
</template>
