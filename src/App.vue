<script setup>
import { computed } from 'vue';
import { useAuthStore } from './stores/Settings/Auth/authStore';
import OfficeChatFloat from './components/OfficeAI/OfficeChatFloat.vue';
import { isAcademyContext } from '@/utils/appContext';
import ConfirmHost from '@/components/UI/ConfirmHost.vue';
import PermissaoMicrosoftModal from '@/components/Microsoft/PermissaoMicrosoftModal.vue';

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
    <!-- Permissao da Microsoft faltando: avisa toda vez que a operacao for tentada -->
    <PermissaoMicrosoftModal v-if="isAuthenticated" />
  </div>
</template>
