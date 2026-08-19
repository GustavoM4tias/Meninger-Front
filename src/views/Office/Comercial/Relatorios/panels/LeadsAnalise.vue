<script setup>
// Conteúdo do relatório de leads. Fica separado do painel para receber as
// vendas como PROPS e poder usar computed - dentro do slot elas seriam
// recalculadas a cada acesso.
//
// A quebra (mídia / origem / campanha) é escolhida num SegmentedControl e
// mostra UMA tabela por vez. Empilhar as três de uma vez virava rolagem longa e
// escondia justamente a comparação.
import { computed, ref } from 'vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import KpiRow from '../components/KpiRow.vue';
import RankingTable from '../components/RankingTable.vue';
import VendasDoGrupoModal from '../components/VendasDoGrupoModal.vue';
import { agruparVendas, saleVeioDeLead, leadOf, DIMENSOES } from '@/utils/Comercial/saleAttribution';

const props = defineProps({
  vendas: { type: Array, required: true },
  valorDe: { type: Function, required: true },
});

const moeda = (v) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
}).format(Number(v) || 0);

const comLead = computed(() => props.vendas.filter(saleVeioDeLead));

// Campanha só existe para o lead que a Central Meta captou; contar à parte
// mostra o quanto da atribuição já é rastreável até o anúncio.
const comCampanha = computed(() =>
  comLead.value.filter((v) => leadOf(v)?.campanha || leadOf(v)?.utm_campaign));

const somar = (lista) => lista.reduce((s, v) => s + (Number(props.valorDe(v)) || 0), 0);
const vgvTotal = computed(() => somar(props.vendas));
const vgvLead = computed(() => somar(comLead.value));

const kpis = computed(() => [
  {
    label: 'Vendas de lead nosso', icon: 'fas fa-bullhorn', tone: 'accent',
    value: String(comLead.value.length),
    hint: props.vendas.length
      ? `${((comLead.value.length / props.vendas.length) * 100).toFixed(1)}% das ${props.vendas.length} vendas`
      : '',
  },
  {
    label: 'VGV de lead nosso', icon: 'fas fa-sack-dollar', tone: 'success',
    value: moeda(vgvLead.value),
    hint: vgvTotal.value ? `${((vgvLead.value / vgvTotal.value) * 100).toFixed(1)}% do VGV do período` : '',
  },
  {
    label: 'Ticket do lead', icon: 'fas fa-receipt', tone: 'neutral',
    value: moeda(comLead.value.length ? vgvLead.value / comLead.value.length : 0),
    hint: `Geral: ${moeda(props.vendas.length ? vgvTotal.value / props.vendas.length : 0)}`,
  },
  {
    label: 'Já com campanha', icon: 'fas fa-rectangle-ad', tone: 'warning',
    value: String(comCampanha.value.length),
    hint: 'Captadas pela Central Meta',
  },
]);

// ── Quebra selecionável ──────────────────────────────────────────────────────
const QUEBRAS = [
  { value: 'midia',    label: 'Mídia',    icon: 'fas fa-bullhorn' },
  { value: 'origem',   label: 'Origem',   icon: 'fas fa-signs-post' },
  { value: 'campanha', label: 'Campanha', icon: 'fas fa-rectangle-ad' },
];
const quebra = ref('midia');

const linhas = computed(() => {
  if (quebra.value === 'campanha') {
    // Sem campanha vinculada não é uma "campanha vazia": é venda que ainda não
    // tem esse rastro, então some da lista em vez de virar uma linha genérica.
    return agruparVendas(comCampanha.value, 'campanha', props.valorDe, { incluirVazios: false });
  }
  return agruparVendas(comLead.value, quebra.value, props.valorDe);
});

const definicao = computed(() => DIMENSOES[quebra.value]);

const VAZIO = {
  midia: 'Nenhuma venda do período veio de lead de captação.',
  origem: 'Nenhuma venda do período veio de lead de captação.',
  campanha: 'Nenhuma venda do período tem campanha vinculada ainda. O ciclo do lead até o faturamento tem mediana de 69 dias, então a safra da Central Meta chega aqui aos poucos.',
};

// ── Detalhe ──────────────────────────────────────────────────────────────────
const grupoAberto = ref(null);
</script>

<template>
  <div class="space-y-4">
    <KpiRow :items="kpis" />

    <div class="rounded-xl border border-line bg-surface-raised surface-gradient p-3
                text-xs text-ink-muted flex items-start gap-2">
      <i class="fas fa-circle-info text-accent mt-0.5"></i>
      <p>
        Conta como <strong class="text-ink">lead nosso</strong> quem NÃO foi cadastrado nos
        painéis de gestor, corretor ou imobiliária - a mesma régua da tela de Leads. Venda
        antiga costuma não ter mídia registrada no CV e ainda assim é captação nossa;
        campanha e anúncio só existem para o que a Central Meta captou, de junho de 2026
        em diante.
      </p>
    </div>

    <div class="flex items-center justify-between gap-3 flex-wrap">
      <SegmentedControl v-model="quebra" :options="QUEBRAS" size="sm" />
      <p class="text-[11px] text-ink-subtle">Clique numa linha para ver as vendas.</p>
    </div>

    <RankingTable :rows="linhas"
      :titulo="`Vendas de lead por ${definicao.label.toLowerCase()}`"
      :label-header="definicao.label"
      :icon="definicao.icon"
      :empty-text="VAZIO[quebra]"
      @selecionar="grupoAberto = $event" />

    <VendasDoGrupoModal :grupo="grupoAberto" :dimensao="definicao.label"
      @fechar="grupoAberto = null" />
  </div>
</template>
