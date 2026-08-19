<script setup>
// Guia "Desempenho por lead": quanto do faturamento veio de captação nossa.
import AnalisePanel from '../components/AnalisePanel.vue';
import LeadsAnalise from './LeadsAnalise.vue';
</script>

<template>
  <AnalisePanel v-slot="{ vendas, valorDe }">
    <LeadsAnalise :vendas="vendas" :valor-de="valorDe" />
  </AnalisePanel>
</template>
