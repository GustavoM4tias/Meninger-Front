<script setup>
import { computed } from 'vue';
import { useAuthStore } from './stores/Settings/Auth/authStore';
import OfficeChatFloat from './components/OfficeAI/OfficeChatFloat.vue';
import BolaoScoreBadge from './components/Bolao/BolaoScoreBadge.vue';
import { isAcademyContext } from '@/utils/appContext';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated());

// A Eme do Office (OfficeChatFloat) é o ÚNICO assistente. Aparece no contexto
// Office — que inclui o Academy migrado para dentro do Office (rotas /academy).
// A Eme própria do Academy (AcademyTutorChat) foi removida do AcademyShell.
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
