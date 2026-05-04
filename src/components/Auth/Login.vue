<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';

import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Select from '@/components/UI/Select.vue';

import ForgotPasswordModal from './ForgotPasswordModal.vue';
import FaceLoginModal from './FaceLoginModal.vue';
import { sanitizeEmail } from './composables/useForgotPassword';
import { usePersistedRef, clearPersisted } from '@/utils/usePersistedRef';

const toast = useToast();
const authStore = useAuthStore();
const microsoftStore = useMicrosoftStore();

// ─── State ──────────────────────────────────────────
// Email e tipo de login persistidos (UX: usuário não digita de novo se fechar)
const email = usePersistedRef('login:email', '');
const loginType = usePersistedRef('login:type', '/');
const password = ref('');
const errorMessage = ref('');
const loginLoading = ref(false);
const showPassword = ref(false);
const faceModalOpen = ref(false);

const loginTypeOptions = [
  { value: '/',      label: 'Office' },
  { value: '/panel', label: 'Academy' },
];

// versão dinâmica (injetada pelo Vite a partir do package.json)
const versions = {
  '/': __APP_VERSION_OFFICE__,
  '/panel': __APP_VERSION_ACADEMY__,
};
const currentVersion = computed(() => versions[loginType.value] || '');

// ─── Helpers ────────────────────────────────────────
function isLocal() {
  const h = window.location.hostname;
  return h === 'localhost' || h.endsWith('.localhost');
}

function resolveRedirectUrl(selectedPath) {
  const isAcademy = selectedPath === '/panel';
  if (isLocal()) return isAcademy ? 'http://localhost:5174/panel' : 'http://localhost:5173/';
  return isAcademy ? 'https://academy.menin.com.br/panel' : 'https://office.menin.com.br/';
}

async function redirectAfterLogin() {
  faceModalOpen.value = false;
  await nextTick();
  window.location.assign(resolveRedirectUrl(loginType.value));
}

// ─── Login ──────────────────────────────────────────
async function handleLogin() {
  errorMessage.value = '';
  loginLoading.value = true;
  try {
    await authStore.login(sanitizeEmail(email.value), password.value);
    // login deu certo: limpa o backup do email (mas guarda o tipo pra próxima)
    clearPersisted('login:email');
    await redirectAfterLogin();
  } catch (error) {
    errorMessage.value = error?.message || 'Erro ao tentar login.';
  } finally {
    loginLoading.value = false;
  }
}

function openFaceLogin() { faceModalOpen.value = true; }
function openForgotPassword() { authStore.openForgotPasswordModal(sanitizeEmail(email.value)); }
async function register() { toast.info('Solicite acesso a seu gestor.'); }

// ─── Lifecycle ──────────────────────────────────────
onMounted(() => {
  if (authStore.isAuthenticated()) { redirectAfterLogin(); return; }
  authStore.clearUser();
});

onBeforeUnmount(() => { faceModalOpen.value = false; });
</script>

<template>
  <form @submit.prevent="handleLogin" class="space-y-5">

    <!-- Header com tipo de acesso -->
    <div class="flex items-end justify-between gap-3">
      <div>
        <p class="text-xs text-ink-subtle">Acesse sua conta</p>
        <h2 class="text-xl font-semibold text-ink">Bem-vindo</h2>
      </div>
      <div class="w-32">
        <Select v-model="loginType" :options="loginTypeOptions" size="sm" />
      </div>
    </div>

    <div class="hairline"></div>

    <!-- Email -->
    <Input
      v-model="email" type="email" placeholder="seu@email.com" label="E-mail"
      iconLeft="fas fa-envelope" required
    />

    <!-- Senha -->
    <div>
      <label class="block text-xs font-medium text-ink-muted mb-1.5">Senha</label>
      <div class="relative">
        <Input
          v-model="password" :type="showPassword ? 'text' : 'password'"
          placeholder="Digite sua senha" iconLeft="fas fa-lock" required
        />
        <button type="button"
          class="absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-center text-ink-subtle hover:text-ink transition-colors"
          @click="showPassword = !showPassword"
          :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'">
          <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" class="text-sm"></i>
        </button>
      </div>
      <button type="button" class="mt-2 text-xs text-accent hover:underline" @click="openForgotPassword">
        Esqueceu a senha?
      </button>
    </div>

    <!-- Botão principal -->
    <Button type="submit" block size="lg" :loading="loginLoading">
      {{ loginLoading ? 'Entrando...' : 'Entrar' }}
    </Button>

    <!-- Erro -->
    <transition name="fade">
      <div v-if="errorMessage"
        class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ errorMessage }}
      </div>
    </transition>

    <!-- Divider -->
    <div class="flex items-center gap-3">
      <div class="hairline flex-1"></div>
      <span class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">ou</span>
      <div class="hairline flex-1"></div>
    </div>

    <!-- Login alternativo -->
    <div class="grid grid-cols-2 gap-2">
      <Button type="button" variant="secondary" @click="microsoftStore.redirectToLogin()" :disabled="loginLoading">
        <svg width="16" height="16" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
          <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
          <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
          <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
        </svg>
        Microsoft
      </Button>
      <Button type="button" variant="secondary" icon="fas fa-face-grin" @click="openFaceLogin" :disabled="loginLoading">
        Face ID
      </Button>
    </div>

    <a @click="register"
       class="block text-center text-xs text-ink-muted hover:text-accent cursor-pointer transition-colors">
      Não tem uma conta? <span class="text-accent">Solicite acesso.</span>
    </a>

    <!-- Modais -->
    <ForgotPasswordModal />
    <FaceLoginModal v-model:open="faceModalOpen" :on-success="redirectAfterLogin" />
  </form>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
