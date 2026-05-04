<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { updateMeInfo } from '@/utils/Auth/apiAuth';
import API_URL from '@/config/apiUrl';

import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Surface from '@/components/UI/Surface.vue';

const router    = useRouter();
const authStore = useAuthStore();

const state        = ref('loading');
const isNew        = ref(false);
const errorMessage = ref('Ocorreu um erro ao autenticar com a Microsoft.');

const setupForm = ref({ username: '', birth_date: '', phone: '', position: '', city: '' });
const setupLoading = ref(false);
const setupError   = ref('');

const positionsOptions = ref([]);
const positionDescMap  = ref({});
const citiesOptions    = ref([]);

const selectedPositionDesc = computed(() =>
  setupForm.value.position ? positionDescMap.value[setupForm.value.position] || '' : ''
);

const ERROR_MESSAGES = {
  missing_params: 'Parâmetros ausentes na resposta da Microsoft.',
  invalid_state:  'Sessão expirada. Tente novamente.',
  auth_failed:    'Falha ao autenticar com a Microsoft. Tente novamente.',
  access_denied:  'Acesso negado. Você cancelou o login.',
};

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
  } catch { /* silencioso */ }
}

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

function goToLogin() { router.push({ name: 'login' }); }
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface p-4">

    <!-- Carregando -->
    <template v-if="state === 'loading'">
      <div class="text-center max-w-sm px-6">
        <Spinner size="lg" class="mb-4" />
        <p class="text-ink-muted text-sm">Autenticando com Microsoft...</p>
      </div>
    </template>

    <!-- Setup — novo usuário -->
    <template v-else-if="state === 'setup'">
      <Surface variant="raised" padding="lg" class="w-full max-w-md">

        <div class="text-center mb-6">
          <div class="h-12 w-12 grid place-items-center mx-auto mb-3 rounded-2xl bg-accent-soft text-accent border border-accent/20">
            <i class="fas fa-user-plus" />
          </div>
          <h2 class="text-lg font-semibold text-ink">Complete seu perfil</h2>
          <p class="text-sm text-ink-muted mt-1">
            Precisamos de mais algumas informações para concluir o cadastro
          </p>
        </div>

        <form @submit.prevent="submitSetup" class="space-y-4">
          <Input v-model="setupForm.username" type="text" label="Nome completo" placeholder="Seu nome completo" required />

          <div class="grid grid-cols-2 gap-3">
            <Input v-model="setupForm.birth_date" type="date" label="Nascimento" required />
            <Input v-model="setupForm.phone" type="tel" label="Telefone (DDD)" placeholder="(11) 99999-9999" />
          </div>

          <div>
            <Select v-model="setupForm.position" :options="positionsOptions"
              label="Cargo" placeholder="Selecione seu cargo" required />
            <Transition name="fade">
              <div v-if="selectedPositionDesc"
                class="mt-2 flex items-start gap-2 rounded-lg border border-accent/20 bg-accent-soft/40 px-3 py-2">
                <i class="fas fa-circle-info text-accent text-xs mt-0.5 shrink-0"></i>
                <p class="text-xs text-accent leading-relaxed">{{ selectedPositionDesc }}</p>
              </div>
            </Transition>
          </div>

          <Select v-model="setupForm.city" :options="citiesOptions"
            label="Cidade" placeholder="Selecione sua cidade" required />

          <Transition name="fade">
            <p v-if="setupError" class="text-xs text-red-500 flex items-center gap-1">
              <i class="fas fa-circle-exclamation"></i>{{ setupError }}
            </p>
          </Transition>

          <Button type="submit" block size="lg" :loading="setupLoading" icon="fas fa-check">
            {{ setupLoading ? 'Salvando...' : 'Concluir cadastro' }}
          </Button>
        </form>
      </Surface>
    </template>

    <!-- Sucesso -->
    <template v-else-if="state === 'success'">
      <div class="text-center max-w-sm px-6">
        <div class="h-12 w-12 grid place-items-center mx-auto mb-3 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <i class="fas fa-check text-lg" />
        </div>
        <h2 class="text-base font-semibold text-ink mb-1">
          {{ isNew ? 'Conta criada com sucesso!' : 'Login realizado!' }}
        </h2>
        <p class="text-sm text-ink-muted">Redirecionando...</p>
      </div>
    </template>

    <!-- Erro -->
    <template v-else-if="state === 'error'">
      <div class="text-center max-w-sm px-6">
        <div class="h-12 w-12 grid place-items-center mx-auto mb-3 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
          <i class="fas fa-xmark text-lg" />
        </div>
        <h2 class="text-base font-semibold text-ink mb-2">Falha na autenticação</h2>
        <p class="text-sm text-ink-muted mb-4">{{ errorMessage }}</p>
        <Button @click="goToLogin">Voltar ao login</Button>
      </div>
    </template>

  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
