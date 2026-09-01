<script setup>
// Abre o MODAL PADRÃO de vendas (o mesmo do Faturamento) para as vendas que
// compõem uma linha de ranking.
//
// Reaproveitar o EnterpriseDetailModal em vez de escrever outra listagem é o
// que garante o padrão: busca, ordenação, selos de distrato/ajuste e o selo de
// Lead com o cartão de captação já vêm prontos e idênticos aos do Faturamento.
import EnterpriseDetailModal from '@/views/Office/Comercial/Faturamento/components/EnterpriseDetailModal.vue';

defineProps({
  // Linha do ranking selecionada: { label, itens: [venda] }
  grupo: { type: Object, default: null },
  // Rótulo da dimensão, usado no título ("Imobiliária: BROKERS MARILIA").
  dimensao: { type: String, default: '' },
});

defineEmits(['fechar']);
</script>

<template>
  <EnterpriseDetailModal v-if="grupo"
    :enterprise="{
      name: dimensao ? `${dimensao}: ${grupo.label}` : grupo.label,
      id: null,
      cost_center_code: null,
    }"
    :sales="grupo.itens || []"
    @close="$emit('fechar')" />
</template>
