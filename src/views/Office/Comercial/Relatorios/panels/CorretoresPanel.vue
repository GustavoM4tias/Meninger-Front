<script setup>
// Guia "Desempenho por corretor" — ranking de quem fechou as vendas.
import AnalisePanel from '../components/AnalisePanel.vue';
import ParceiroAnalise from './ParceiroAnalise.vue';
</script>

<template>
  <AnalisePanel v-slot="{ vendas, valorDe }">
    <ParceiroAnalise :vendas="vendas" :valor-de="valorDe" dimensao="corretor" />
  </AnalisePanel>
</template>
