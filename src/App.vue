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
    <div class="w-16" v-if="isAuthenticated">
      <Nav />
    </div>
    <div class="flex-1 overflow-auto">
      <Carregamento />
      <router-view />
    </div>
  </div>
</template>
