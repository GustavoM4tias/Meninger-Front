<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { getSignupOptions, completeSignup } from '@/utils/Auth/apiAuth';
import API_URL from '@/config/apiUrl';

import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Surface from '@/components/UI/Surface.vue';

const router    = useRouter();
const authStore = useAuthStore();

// loading | setup | pending | success | error
const state        = ref('loading');
const isNew        = ref(false);
const errorMessage = ref('Ocorreu um erro ao autenticar com a Microsoft.');

const setupForm = ref({ username: '', birth_date: '', phone: '', department_id: '', position: '', city: '' });
const setupLoading = ref(false);
const setupError   = ref('');

const allPositions      = ref([]);   // [{name, description, department_id}]
const departmentsOptions = ref([]);
const citiesOptions      = ref([]);

// Cargos filtrados pelo departamento escolhido
const positionsOptions = computed(() => {
  const deptId = Number(setupForm.value.department_id);
  if (!deptId) return [];
  return allPositions.value
    .filter(p => Number(p.department_id) === deptId)
    .map(p => ({ label: p.name, value: p.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
});

// Trocou de departamento e o cargo escolhido não pertence a ele → limpa
watch(() => setupForm.value.department_id, () => {
  const valid = positionsOptions.value.some(o => o.value === setupForm.value.position);
  if (!valid) setupForm.value.position = '';
});

const selectedPositionDesc = computed(() => {
  const p = allPositions.value.find(x => x.name === setupForm.value.position);
  return p?.description || '';
});

const ERROR_MESSAGES = {
  missing_params: 'Parâmetros ausentes na resposta da Microsoft.',
  invalid_state:  'Sessão expirada. Tente novamente.',
  auth_failed:    'Falha ao autenticar com a Microsoft. Tente novamente.',
  access_denied:  'Acesso negado. Você cancelou o login.',
};

async function loadSetupOptions() {
  try {
    const data = await getSignupOptions();
    allPositions.value = Array.isArray(data.positions) ? data.positions : [];
    departmentsOptions.value = (Array.isArray(data.departments) ? data.departments : [])
      .map(d => ({ label: d.name, value: String(d.id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    citiesOptions.value = (Array.isArray(data.cities) ? data.cities : [])
      .map(c => ({ label: c.uf ? `${c.name} - ${c.uf}` : c.name, value: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch (err) {
    console.error('[MicrosoftCallback] Erro ao carregar opções de cadastro:', err);
    setupError.value = 'Não foi possível carregar as opções de cadastro. Recarregue a página e tente novamente.';
  }
}

// Cadastro enviado: encerra a sessão local (o acesso só abre após aprovação).
function endPendingSession() {
  try { authStore.clearUser(); } catch { /* segue */ }
}

async function submitSetup() {
  setupError.value = '';
  const f = setupForm.value;
  if (!f.username?.trim() || !f.birth_date || !f.department_id || !f.position || !f.city) {
    setupError.value = 'Preencha todos os campos obrigatórios.';
    return;
  }
  setupLoading.value = true;
  try {
    await completeSignup({
      username: f.username.trim(),
      birth_date: f.birth_date,
      phone: f.phone || null,
      department_id: Number(f.department_id),
      position: f.position,
      city: f.city,
    });
    endPendingSession();
    state.value = 'pending';
  } catch (err) {
    setupError.value = err?.message || 'Erro ao salvar informações. Tente novamente.';
  } finally {
    setupLoading.value = false;
  }
}

onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  const code   = params.get('code');
  const error  = params.get('error');

  if (error) {
    errorMessage.value = ERROR_MESSAGES[error] || 'Erro desconhecido. Tente novamente.';
    state.value = 'error';
    return;
  }
  if (!code) {
    errorMessage.value = 'Código de login não recebido. Tente novamente.';
    state.value = 'error';
    return;
  }

  try {
    // Troca o código de uso único pelo par de tokens (o JWT nunca vem na URL).
    const resp = await fetch(`${API_URL}/microsoft/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }).then(r => r.json());

    if (!resp?.success || !resp?.data?.token) {
      throw new Error(resp?.error || 'Falha ao concluir o login Microsoft.');
    }

    authStore.setToken(resp.data.token);
    authStore.setRefreshToken(resp.data.refreshToken);
    await authStore.fetchUserInfo();

    const newAcc   = resp.data.isNew === true;
    const pending  = resp.data.pending === true;
    const complete = resp.data.profileComplete === true;
    isNew.value = newAcc;

    if (pending && complete) {
      // Já concluiu o formulário antes; segue aguardando o gestor liberar.
      endPendingSession();
      state.value = 'pending';
    } else if (pending || newAcc) {
      setupForm.value.username = authStore.user?.username || '';
      await loadSetupOptions();
      state.value = 'setup';
    } else {
      state.value = 'success';
      setTimeout(() => router.push('/'), 1200);
    }
  } catch (err) {
    console.error('[MicrosoftCallback] Erro ao concluir login:', err);
    authStore.clearUser();
    errorMessage.value = err?.message || 'Erro ao carregar seus dados. Tente novamente.';
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

          <Select v-model="setupForm.department_id" :options="departmentsOptions"
            label="Departamento" placeholder="Selecione seu departamento" required />

          <div>
            <Select v-model="setupForm.position" :options="positionsOptions"
              :disabled="!setupForm.department_id"
              label="Cargo"
              :placeholder="setupForm.department_id ? 'Selecione seu cargo' : 'Escolha o departamento primeiro'"
              required />
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

          <p class="text-xs text-ink-muted flex items-start gap-1.5">
            <i class="fas fa-circle-info text-accent mt-0.5 shrink-0"></i>
            <span>Após concluir, seu cadastro passa pela aprovação do gestor responsável.
            Você receberá um e-mail quando o acesso for liberado.</span>
          </p>

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

    <!-- Pendente de aprovação -->
    <template v-else-if="state === 'pending'">
      <div class="text-center max-w-sm px-6">
        <div class="h-12 w-12 grid place-items-center mx-auto mb-3 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <i class="fas fa-user-clock text-lg" />
        </div>
        <h2 class="text-base font-semibold text-ink mb-2">Cadastro em aprovação</h2>
        <p class="text-sm text-ink-muted mb-4">
          Seu cadastro foi concluído e está passando pela aprovação do gestor responsável.
          Assim que for liberado, você receberá um <strong class="text-ink">e-mail</strong> com as
          instruções e a senha de acesso.
        </p>
        <Button variant="ghost" @click="goToLogin">Voltar ao login</Button>
      </div>
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
