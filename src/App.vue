<script setup>
import { computed } from 'vue'; // Importando ref para reatividade
import Carregamento from './components/Carregamento.vue';
import Nav from './components/Nav.vue';
import { useAuthStore } from './stores/authStore'; // Importando o authStore
const authStore = useAuthStore();

const isAuthenticated = computed(() => authStore.isAuthenticated());

</script>


<template>
  <div class="flex">
    <div class="top-0 left-0" v-if="isAuthenticated">
      <Nav />
    </div>
    <div class="flex-1 h-screen max-h-screen w-screen">
      <div class="mt-16" v-if="isAuthenticated"></div>
      <router-view :class="{ 'ps-16': isAuthenticated }"/>
    </div>
    <Carregamento />
  </div>
</template>