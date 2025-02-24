<script setup>
import { onMounted, computed } from 'vue';
import Carregamento from './components/Loading/Carregamento.vue';
import Nav from './components/Navigation/Nav.vue';
import { useAuthStore } from './stores/Auth/authStore'; // Importando o authStore
const authStore = useAuthStore();

const isAuthenticated = computed(() => authStore.isAuthenticated());

// Verifica a preferência inicial do sistema e aplica o tema
onMounted(async () => {
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (darkMode) {
        document.documentElement.classList.add('dark');
    }
});

</script>


<template>
  <div class="flex">
    <div class="top-0 left-0" v-if="isAuthenticated">
      <Nav />
    </div>
    <div class="flex-1 h-screen w-screen">
      <div class="mt-16" v-if="isAuthenticated"></div>
      <router-view :class="{ 'ps-16': isAuthenticated }"/>
    </div>
    <Carregamento />
  </div>
</template>