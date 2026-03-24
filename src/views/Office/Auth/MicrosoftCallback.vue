<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">

    <!-- Carregando -->
    <template v-if="state === 'loading'">
      <div class="text-center max-w-sm px-6">
        <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p class="text-gray-600 dark:text-gray-300 text-sm">Autenticando com Microsoft...</p>
      </div>
    </template>

    <!-- Setup — novo usuário -->
    <template v-else-if="state === 'setup'">
      <div class="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">

        <!-- Header -->
        <div class="text-center mb-6">
          <div class="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-user-plus text-blue-600 dark:text-blue-400 text-xl" />
          </div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Complete seu perfil</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Precisamos de mais algumas informações para concluir o cadastro
          </p>
        </div>

        <!-- Form -->
        <form @submit.prevent="submitSetup" class="space-y-4">

          <!-- Nome -->
          <div class="space-y-1.5">
            <label class="field-label">Nome Completo</label>
            <input v-model="setupForm.username" type="text" required
              class="field-input" placeholder="Seu nome completo" />
          </div>

          <!-- Data de nascimento + Telefone -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="field-label">Nascimento</label>
              <input v-model="setupForm.birth_date" type="date" required class="field-input" />
            </div>
            <div class="space-y-1.5">
              <label class="field-label">Telefone <span class="text-gray-400 font-normal normal-case tracking-normal">(DDD)</span></label>
              <input v-model="setupForm.phone" type="tel" class="field-input" placeholder="(11) 99999-9999" />
            </div>
          </div>

          <!-- Cargo -->
          <div class="space-y-1.5">
            <label class="field-label">Cargo</label>
            <select v-model="setupForm.position" required class="field-input">
              <option value="" disabled hidden>Selecione seu cargo</option>
              <option v-for="pos in positionsOptions" :key="pos.value" :value="pos.value">{{ pos.label }}</option>
            </select>
            <Transition name="fade">
              <div v-if="selectedPositionDesc"
                class="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                <i class="fas fa-circle-info text-blue-400 text-xs mt-0.5 shrink-0"></i>
                <p class="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{{ selectedPositionDesc }}</p>
              </div>
            </Transition>
          </div>

          <!-- Cidade -->
          <div class="space-y-1.5">
            <label class="field-label">Cidade</label>
            <select v-model="setupForm.city" required class="field-input">
              <option value="" disabled hidden>Selecione sua cidade</option>
              <option v-for="city in citiesOptions" :key="city.value" :value="city.value">{{ city.label }}</option>
            </select>
          </div>

          <!-- Erro -->
          <Transition name="fade">
            <p v-if="setupError" class="text-xs text-red-500">
              <i class="fas fa-exclamation-circle mr-1"></i>{{ setupError }}
            </p>
          </Transition>

          <!-- Submit -->
          <button type="submit" :disabled="setupLoading"
            class="w-full mt-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            <span v-if="setupLoading"><i class="fas fa-spinner animate-spin mr-2"></i>Salvando...</span>
            <span v-else><i class="fas fa-check mr-2"></i>Concluir cadastro</span>
          </button>

        </form>
      </div>
    </template>

    <!-- Sucesso -->
    <template v-else-if="state === 'success'">
      <div class="text-center max-w-sm px-6">
        <div class="w-14 h-14 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-check text-green-600 dark:text-green-400 text-xl" />
        </div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {{ isNew ? 'Conta criada com sucesso!' : 'Login realizado!' }}
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">Redirecionando...</p>
      </div>
    </template>

    <!-- Erro -->
    <template v-else-if="state === 'error'">
      <div class="text-center max-w-sm px-6">
        <div class="w-14 h-14 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-times text-red-600 dark:text-red-400 text-xl" />
        </div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Falha na autenticação</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ errorMessage }}</p>
        <button @click="goToLogin"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
          Voltar ao login
        </button>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { updateMeInfo } from '@/utils/Auth/apiAuth';
import API_URL from '@/config/apiUrl';

const router    = useRouter();
const authStore = useAuthStore();

const state        = ref('loading');
const isNew        = ref(false);
const errorMessage = ref('Ocorreu um erro ao autenticar com a Microsoft.');

// ── Setup form ─────────────────────────────────────────────────────────────
const setupForm = ref({ username: '', birth_date: '', phone: '', position: '', city: '' });
const setupLoading = ref(false);
const setupError   = ref('');

const positionsOptions = ref([]);
const positionDescMap  = ref({});
const citiesOptions    = ref([]);

const selectedPositionDesc = computed(() =>
  setupForm.value.position ? positionDescMap.value[setupForm.value.position] || '' : ''
);

// ── Error messages ─────────────────────────────────────────────────────────
const ERROR_MESSAGES = {
  missing_params: 'Parâmetros ausentes na resposta da Microsoft.',
  invalid_state:  'Sessão expirada. Tente novamente.',
  auth_failed:    'Falha ao autenticar com a Microsoft. Tente novamente.',
  access_denied:  'Acesso negado. Você cancelou o login.',
};

// ── Load positions & cities from API ───────────────────────────────────────
async function loadSetupOptions() {
  try {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
    const [posRes, cityRes] = await Promise.allSettled([
      fetch(`${API_URL}/admin/positions`,   { headers }).then(r => r.json()),
      fetch(`${API_URL}/admin/user-cities`, { headers }).then(r => r.json()),
    ]);

    if (posRes.status === 'fulfilled') {
      const list   = Array.isArray(posRes.value) ? posRes.value : (posRes.value?.data || []);
      const active = list.filter(p => p?.active && p?.is_internal);
      positionsOptions.value = active
        .map(p => ({ label: p.name, value: p.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
      positionDescMap.value = Object.fromEntries(active.map(p => [p.name, p.description || '']));
    }

    if (cityRes.status === 'fulfilled') {
      const list = Array.isArray(cityRes.value) ? cityRes.value : (cityRes.value?.data || []);
      citiesOptions.value = list
        .map(c => ({ label: c.name || c, value: c.name || c }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
  } catch { /* silencioso — usuário ainda pode digitar */ }
}

// ── Submit setup form ──────────────────────────────────────────────────────
async function submitSetup() {
  setupError.value = '';
  if (!setupForm.value.birth_date || !setupForm.value.position || !setupForm.value.city) {
    setupError.value = 'Preencha todos os campos obrigatórios.';
    return;
  }
  setupLoading.value = true;
  try {
    await updateMeInfo(
      setupForm.value.username,
      authStore.user.email,
      setupForm.value.position,
      setupForm.value.city,
      setupForm.value.birth_date,
      authStore.user.status,
      authStore.user.face_enabled,
      setupForm.value.phone || null,
    );
    await authStore.fetchUserInfo();
    state.value = 'success';
    setTimeout(() => router.push('/'), 1200);
  } catch (err) {
    setupError.value = err?.message || 'Erro ao salvar informações. Tente novamente.';
  } finally {
    setupLoading.value = false;
  }
}

// ── Mount ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get('token');
  const error  = params.get('error');
  const newAcc = params.get('isNew') === 'true';

  if (error) {
    errorMessage.value = ERROR_MESSAGES[error] || 'Erro desconhecido. Tente novamente.';
    state.value = 'error';
    return;
  }

  if (!token) {
    errorMessage.value = 'Token não recebido. Tente novamente.';
    state.value = 'error';
    return;
  }

  try {
    authStore.setToken(token);
    await authStore.fetchUserInfo();

    isNew.value = newAcc;

    if (newAcc) {
      // Pré-preenche o nome vindo do Microsoft
      setupForm.value.username = authStore.user?.username || '';
      await loadSetupOptions();
      state.value = 'setup';
    } else {
      state.value = 'success';
      setTimeout(() => router.push('/'), 1200);
    }
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

<style scoped>
.field-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 600;
  color: rgb(107 114 128);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
:is(.dark) .field-label { color: rgb(156 163 175); }

.field-input {
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  color: rgb(17 24 39);
  background: white;
  border: 1px solid rgb(229 231 235);
  border-radius: 0.375rem;
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  outline: none;
  transition: all 0.15s;
}
.field-input:focus {
  border-color: rgb(96 165 250);
  box-shadow: 0 0 0 3px rgb(59 130 246 / 0.15);
}
:is(.dark) .field-input {
  color: rgb(243 244 246);
  background: rgb(17 24 39 / 0.6);
  border-color: rgb(55 65 81);
}
:is(.dark) .field-input:focus { border-color: rgb(96 165 250); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
