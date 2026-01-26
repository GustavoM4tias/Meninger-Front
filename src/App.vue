<script setup>
import { onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import Carregamento from './components/Loading/Carregamento.vue';
import ChatBot from './components/ChatBot/ChatBotIcon.vue';
import Nav from './components/Navigation/Nav.vue';
import { useAuthStore } from './stores/Settings/Auth/authStore';

const authStore = useAuthStore();
const route = useRoute();

const host = computed(() => window.location.host);
const isAcademyHost = computed(() => host.value === 'academy.menin.com.br');
const isAuthenticated = computed(() => authStore.isAuthenticated());

onMounted(async () => {
  const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (darkMode) document.documentElement.classList.add('dark');

  // ✅ não inicializa auth do Office no domínio do Academy
  if (isAcademyHost.value) {
    // se você também autentica no Academy via mesmo token, pode manter o initializeAuth,
    // MAS em geral o problema de navbar vem daqui: Office inicializando no Academy.
    if (authStore.token && !authStore.user) {
      await authStore.initializeAuth();
    }
    return;
  }

  // ✅ Office
  if (authStore.token && !authStore.user) {
    await authStore.initializeAuth();
  }
});
</script>

<template>

  <body v-if="isAcademyHost" id="app" class="overflow-x-hidden">
    <router-view />
  </body>

  <body v-else-if="!isAuthenticated" id="app" class="flex">
    <router-view />
    <Carregamento />
  </body>

  <body v-else id="app" class="flex">
    <main class="flex flex-col h-screen w-full">
      <div class="flex">
        <Nav />
        <div class="flex flex-1 mt-16 sm:mt-14 w-full h-auto md:min-h-[calc(100vh-3.5rem)] break-words overflow-auto">
          <div class="w-full max-w-full bg-gray-50 dark:bg-gray-900">
            <router-view />
          </div>
        </div>
      </div>
    </main>
    <ChatBot v-if="isAuthenticated" />
    <Carregamento />
  </body>
</template>
