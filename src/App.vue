<script setup>
import { computed } from 'vue'; // Importando ref para reatividade
import Carregamento from './components/Carregamento.vue';
import Nav from './components/Nav.vue';
import { useUserStore } from './stores/userStore'; // Importando o userStore
const userStore = useUserStore();

const isAuthenticated = computed(() => userStore.isAuthenticated());

</script>

<template>
  <div>
    <div class="flex h-screen w-16" v-if="isAuthenticated">
      <Nav />
    </div>
    <div class="flex-1">
      <Carregamento />
      <router-view />
    </div>
  </div>
</template>
