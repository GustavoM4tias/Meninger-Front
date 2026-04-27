<script setup>
import { computed } from 'vue';
import { useAuthStore } from './stores/Settings/Auth/authStore';
import OfficeChatFloat from './components/OfficeAI/OfficeChatFloat.vue';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated());
</script>

<template>
  <div id="app" class="w-full h-full overflow-x-hidden">
    <router-view />
    <OfficeChatFloat v-if="isAuthenticated" />
  </div>
</template>
