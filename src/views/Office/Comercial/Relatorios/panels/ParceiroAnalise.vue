<script setup>
// Conteúdo das guias de Imobiliárias e Corretores - a mesma análise, mudando só
// a dimensão de agrupamento (quem fechou a venda, lido da reserva do CV).
import { computed, ref } from 'vue';
import KpiRow from '../components/KpiRow.vue';
import RankingTable from '../components/RankingTable.vue';
import VendasDoGrupoModal from '../components/VendasDoGrupoModal.vue';
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

// Linha do ranking aberta no modal padrão de vendas.
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

    <div class="flex items-center justify-end">
      <p class="text-[11px] text-ink-subtle">Clique numa linha para ver as vendas.</p>
    </div>

    <RankingTable :rows="linhas"
      :titulo="`Ranking por ${def.label.toLowerCase()}`"
      :label-header="def.label" :icon="def.icon" show-lead
      :empty-text="`Nenhuma venda do período tem ${def.label.toLowerCase()} identificada na reserva.`"
      @selecionar="grupoAberto = $event" />

    <VendasDoGrupoModal :grupo="grupoAberto" :dimensao="def.label"
      @fechar="grupoAberto = null" />
  </div>
</template>
