<script setup>
import { onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import Carregamento from './components/Loading/Carregamento.vue';
import ChatBot from './components/ChatBot/ChatBotIcon.vue';
import Nav from './components/Navigation/Nav.vue';
import { useAuthStore } from './stores/Auth/authStore'; // Importando o authStore
const authStore = useAuthStore();

const isAuthenticated = computed(() => authStore.isAuthenticated());

// Obtemos a rota atual
const route = useRoute();

// Propriedade computada que verifica se a URL atual inicia com '/academy'
const isAcademyRoute = computed(() => route.path.startsWith('/academy'));

// Verifica a preferência inicial do sistema e aplica o tema
onMounted(async () => {
  const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (darkMode) {
    document.documentElement.classList.add('dark');
  }
  if (!authStore.user) {
    await authStore.fetchUserInfo();
  }
});
</script>

<template>

  <body id="app" :class="['flex', { 'overflow-x-hidden': isAcademyRoute }]">
    <div class="top-0 left-0" v-if="isAuthenticated">
      <Nav />
    </div>
    <div class="flex-1 h-screen w-screen">
      <div class="mt-16" v-if="isAuthenticated"></div>
      <router-view :class="{ 'ps-16': isAuthenticated }" />
      <ChatBot />
    </div>
    <Carregamento />
  </body>
</template>