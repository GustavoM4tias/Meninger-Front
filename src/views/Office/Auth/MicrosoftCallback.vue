<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div class="text-center max-w-sm px-6">

      <!-- Carregando -->
      <template v-if="state === 'loading'">
        <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-300 text-sm">Autenticando com Microsoft...</p>
      </template>

      <!-- Sucesso -->
      <template v-else-if="state === 'success'">
        <div class="w-14 h-14 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-check text-green-600 dark:text-green-400 text-xl" />
        </div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {{ isNew ? 'Conta criada com sucesso!' : 'Login realizado!' }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">Redirecionando...</p>
      </template>

      <!-- Erro -->
      <template v-else-if="state === 'error'">
        <div class="w-14 h-14 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-times text-red-600 dark:text-red-400 text-xl" />
        </div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Falha na autenticação</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ errorMessage }}</p>
        <button
          @click="goToLogin"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          Voltar ao login
        </button>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

const router = useRouter();
const authStore = useAuthStore();

const state = ref('loading');
const isNew = ref(false);
const errorMessage = ref('Ocorreu um erro ao autenticar com a Microsoft.');

const ERROR_MESSAGES = {
  missing_params:  'Parâmetros ausentes na resposta da Microsoft.',
  invalid_state:   'Sessão expirada. Tente novamente.',
  auth_failed:     'Falha ao autenticar com a Microsoft. Tente novamente.',
  access_denied:   'Acesso negado. Você cancelou o login.',
};

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');
  const error  = params.get('error');
  const newAcc = params.get('isNew') === 'true';

  // ── Erro retornado pelo backend ──────────────────────────────────────────
  if (error) {
    errorMessage.value = ERROR_MESSAGES[error] || 'Erro desconhecido. Tente novamente.';
    state.value = 'error';
    return;
  }

  // ── Sem token: não deveria chegar aqui ───────────────────────────────────
  if (!token) {
    errorMessage.value = 'Token não recebido. Tente novamente.';
    state.value = 'error';
    return;
  }

  try {
    // Armazena o JWT da plataforma (mesmo fluxo do login interno)
    authStore.setToken(token);

    // Carrega dados do usuário
    await authStore.fetchUserInfo();

    isNew.value = newAcc;
    state.value = 'success';

    // Aguarda 1.2s para o usuário ver o feedback visual, depois redireciona
    setTimeout(() => {
      router.push(newAcc ? '/profile' : '/');
    }, 1200);

  } catch (err) {
    console.error('[MicrosoftCallback] Erro ao carregar usuário:', err);
    authStore.clearUser();
    errorMessage.value = 'Erro ao carregar seus dados. Tente novamente.';
    state.value = 'error';
  }
});

function goToLogin() {
  router.push({ name: 'login' });
}
</script>
