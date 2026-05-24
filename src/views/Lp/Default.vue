<script setup>
// Quem chega em lp.menin.com.br/ direto (sem slug) é redirecionado pro
// site institucional. As LPs reais ficam em lp.menin.com.br/<slug>.
import { onMounted } from 'vue';

onMounted(() => {
  window.location.replace('https://menin.com.br');
});
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-900 text-white">
    <i class="fas fa-circle-notch fa-spin text-xl"></i>
  </div>
</template>
