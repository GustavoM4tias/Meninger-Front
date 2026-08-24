<script setup>
import { computed, defineAsyncComponent } from 'vue';
import { useAuthStore } from './stores/Settings/Auth/authStore';
// Assíncrona de propósito: a Eme arrasta a cadeia inteira do chat (23 renderers,
// gráfico e planilha). Importada aqui no topo, ela entrava no pacote inicial do
// app - ou seja, a TELA DE LOGIN baixava o assistente antes de existir usuário.
// Ela é um painel flutuante: chegar um instante depois da primeira pintura não
// muda nada para quem usa.
const OfficeChatFloat = defineAsyncComponent(() => import('./components/OfficeAI/OfficeChatFloat.vue'));
import { isAcademyContext } from '@/utils/appContext';
import ConfirmHost from '@/components/UI/ConfirmHost.vue';
import NotificationToaster from '@/components/Notifications/NotificationToaster.vue';

const authStore = useAuthStore();
const isAuthenticated = computed(() => authStore.isAuthenticated());

// A Eme do Office (OfficeChatFloat) é o ÚNICO assistente. Aparece no contexto
// Office — que inclui o Academy migrado para dentro do Office (rotas /academy).
// A Eme própria do Academy (AcademyTutorChat) foi removida do AcademyShell.
const showOfficeChat = computed(() => isAuthenticated.value && !isAcademyContext());
</script>

<template>
  <div id="app" class="w-full h-full overflow-x-hidden">
    <router-view />
    <OfficeChatFloat v-if="showOfficeChat" />
    <!-- Uma confirmacao para o app inteiro: ver composables/useConfirm.js -->
    <ConfirmHost />
    <!-- Aviso nao lido aparece sozinho no canto ao abrir o Office e ao voltar
         para a tela inicial: ver components/Notifications/NotificationToaster -->
    <NotificationToaster v-if="isAuthenticated" />
  </div>
</template>
