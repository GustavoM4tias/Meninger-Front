<script setup>
import { computed } from 'vue';
import { useAuthStore } from './stores/Settings/Auth/authStore';
import OfficeChatFloat from './components/OfficeAI/OfficeChatFloat.vue';
import BolaoScoreBadge from './components/Bolao/BolaoScoreBadge.vue';
import { isAcademyContext } from '@/utils/appContext';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated());

// O Eme Office só aparece no contexto Office. No Academy, o assistente é o
// AcademyTutorChat (plugado no AcademyShell) — não pode haver os dois juntos.
const showOfficeChat = computed(() => isAuthenticated.value && !isAcademyContext());

// Badge de placar ao vivo do bolão — Office autenticado, fora do Academy.
const showBolaoBadge = computed(() => isAuthenticated.value && !isAcademyContext());
</script>

<template>
  <div id="app" class="w-full h-full overflow-x-hidden">
    <router-view />
    <OfficeChatFloat v-if="showOfficeChat" />
    <BolaoScoreBadge v-if="showBolaoBadge" />
  </div>
</template>
