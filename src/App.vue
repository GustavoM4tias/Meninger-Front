<script setup>
import { computed } from 'vue';
import { useAuthStore } from './stores/Settings/Auth/authStore';
import Carregamento from './components/Loading/Carregamento.vue';
import ChatBot from './components/ChatBot/ChatBotIcon.vue';

const authStore = useAuthStore();

const host = computed(() => window.location.host);
const isAcademyHost = computed(() => host.value === 'academy.menin.com.br');
const isAuthenticated = computed(() => authStore.isAuthenticated());
</script>

<template>
  <div id="app" class="w-full h-full overflow-x-hidden">
    <router-view />
  </div>
</template>