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

  <body v-if="isAcademyRoute" id="app" class="overflow-x-hidden">
    <router-view />
  </body>

  <body v-else-if="!isAcademyRoute && !isAuthenticated" id="app" class="flex">
    <router-view />
    <Carregamento />
  </body>

  <body v-else-if="!isAcademyRoute && isAuthenticated" id="app" class="flex">
    <main class="flex flex-col h-screen w-full">
      <div class="flex">
        <Nav />
        <div class="flex flex-1 mt-16 sm:mt-14 w-full h-auto min-h-[calc(100vh-3.5rem)] break-words overflow-auto">
          <div class="w-full max-w-full bg-gray-50 dark:bg-gray-900">
            <!-- <h2 class="text-xl truncate">Título muito longo aqui</h2>
            <p class="break-words">Texto longo ou com palavras grandes...</p> -->
            <router-view />
          </div>
        </div>
      </div>
    </main>
    <ChatBot v-if="isAuthenticated" />
    <Carregamento />
  </body>
  <!-- <body v-else id="app" class="flex">
    <div class="top-0 left-0" v-if="isAuthenticated">
      <Nav />
    </div>
    <div class="flex-1 h-screen w-screen">
      <div class="mt-16" v-if="isAuthenticated"></div>
      <router-view :class="{ 'ps-16': isAuthenticated }" />
      <ChatBot v-if="isAuthenticated" />
    </div>
    <Carregamento />
  </body> -->
</template>