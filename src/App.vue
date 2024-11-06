<script setup>
import { computed } from 'vue'; // Importando ref para reatividade
import Carregamento from './components/Carregamento.vue';
import Nav from './components/Nav.vue';
import { useUserStore } from './stores/userStore'; // Importando o userStore
const userStore = useUserStore();

const isAuthenticated = computed(() => userStore.isAuthenticated());

</script>


<template>
  <div class="flex">
    <div class="w-16 top-0 left-0" v-if="isAuthenticated">
      <Nav />
    </div>
    <div class="flex-1">
      <div class="mt-16" v-if="isAuthenticated"></div>
      <Carregamento />
      <router-view />
    </div>
  </div>
</template>