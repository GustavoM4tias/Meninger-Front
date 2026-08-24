<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { getSignupOptions, completeSignup } from '@/utils/Auth/apiAuth';
import API_URL from '@/config/apiUrl';

import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Surface from '@/components/UI/Surface.vue';

const router    = useRouter();
const authStore = useAuthStore();

// loading | setup | pending | success | error
const state        = ref('loading');
const isNew        = ref(false);
const errorMessage = ref('Ocorreu um erro ao autenticar com a Microsoft.');

// O usuário NÃO escolhe o próprio cargo: só o departamento. O cargo é
// definido pelo admin na aprovação do cadastro.
const setupForm = ref({ username: '', birth_date: '', phone: '', department_id: '', city_id: '' });
const setupLoading = ref(false);
const setupError   = ref('');

const departmentsOptions = ref([]);
// Catálogo completo de municípios (IBGE): o seletor tem BUSCA e o valor
// trafega por ID — existem municípios homônimos em UFs diferentes.
const citiesRaw = ref([]);
const cityLabel = (c) => (c.uf ? `${c.name} - ${c.uf}` : c.name);
const cityOptions = computed(() =>
  citiesRaw.value.map(cityLabel).sort((a, b) => a.localeCompare(b, 'pt-BR'))
);
const citySelection = computed({
  get: () => {
    const found = citiesRaw.value.find(c => Number(c.id) === Number(setupForm.value.city_id));
    return found ? [cityLabel(found)] : [];
  },
  set: (arr) => {
    const label = Array.isArray(arr) ? arr[arr.length - 1] : null;
    const rec = label ? citiesRaw.value.find(c => cityLabel(c) === label) : null;
    setupForm.value.city_id = rec?.id ?? '';
  },
});

const ERROR_MESSAGES = {
  missing_params: 'Parâmetros ausentes na resposta da Microsoft.',
  invalid_state:  'Sessão expirada. Tente novamente.',
  auth_failed:    'Falha ao autenticar com a Microsoft. Tente novamente.',
  access_denied:  'Acesso negado. Você cancelou o login.',
};

// ── Modo VÍNCULO (?mode=link) ────────────────────────────────────────────────
// Quem já está logado e clicou em "Conectar conta Microsoft" volta por aqui. A
// sessão do Office NÃO é tocada: nenhum token novo é emitido, nenhum exchange é
// feito. Antes esse botão caía no fluxo de login e trocava a sessão pela conta
// escolhida na tela da Microsoft.
const isLinkMode = ref(false);
const isMailMode = ref(false);
const linkError  = ref('');

function describeLinkError(code, expected, got) {
  if (code === 'email_mismatch') {
    return `Você entrou na Microsoft com ${got || 'outra conta'}, mas sua conta do Office é ${expected || 'outra'}. `
         + 'Escolha a conta certa ou peça ao administrador para ajustar seu cadastro.';
  }
  if (code === 'already_linked') return 'Essa conta Microsoft já está vinculada a outro usuário do Office.';
  if (code === 'no_email')       return 'A Microsoft não devolveu um e-mail para essa conta.';
  if (code === 'user_not_found') return 'Sua sessão não foi encontrada. Entre de novo e tente outra vez.';
  if (code === 'access_denied')  return 'Você cancelou a conexão com a Microsoft.';
  return ERROR_MESSAGES[code] || 'Não foi possível conectar sua conta Microsoft.';
}

function goToAccount() { router.push('/settings/account'); }

async function loadSetupOptions() {
  try {
    const data = await getSignupOptions();
    departmentsOptions.value = (Array.isArray(data.departments) ? data.departments : [])
      .map(d => ({ label: d.name, value: String(d.id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
    citiesRaw.value = Array.isArray(data.cities) ? data.cities : [];
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
  if (!f.username?.trim() || !f.birth_date || !f.department_id || !f.city_id) {
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
      city_id: Number(f.city_id),
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

  // ── Vínculo e autorização de e-mail: o backend já gravou (ou recusou).
  //    Nada a trocar aqui, e a sessão do Office não é tocada. ────────────────
  const mode = params.get('mode');
  if (mode === 'link' || mode === 'mail') {
    isLinkMode.value = true;
    isMailMode.value = mode === 'mail';
    const back = '/settings/account';
    if (params.get('linked') === '1') {
      state.value = 'success';
      setTimeout(() => router.push(back), 1400);
    } else {
      linkError.value = describeLinkError(error, params.get('expected'), params.get('got'));
      state.value = 'error';
    }
    return;
  }

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
            <label class="block text-xs font-medium text-ink-muted mb-1.5">
              Cidade <span class="text-data-neg">*</span>
            </label>
            <MultiSelector :model-value="citySelection"
              @update:modelValue="citySelection = $event"
              :options="cityOptions" placeholder="Busque sua cidade…"
              :single="true" :page-size="120" />
          </div>

          <p class="text-xs text-ink-muted flex items-start gap-1.5">
            <i class="fas fa-circle-info text-accent mt-0.5 shrink-0"></i>
            <span>Após concluir, seu cadastro passa pela aprovação do gestor responsável.
            Você receberá um e-mail quando o acesso for liberado.</span>
          </p>

          <Transition name="fade">
            <p v-if="setupError" class="text-xs text-data-neg flex items-center gap-1">
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
        <div class="h-12 w-12 grid place-items-center mx-auto mb-3 rounded-full bg-data-warn/15 text-data-warn">
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
        <div class="h-12 w-12 grid place-items-center mx-auto mb-3 rounded-full bg-data-pos/15 text-data-pos">
          <i class="fas fa-check text-lg" />
        </div>
        <h2 class="text-base font-semibold text-ink mb-1">
          {{ isMailMode ? 'Acesso ao e-mail autorizado!' : (isLinkMode ? 'Conta Microsoft conectada!' : (isNew ? 'Conta criada com sucesso!' : 'Login realizado!')) }}
        </h2>
        <p class="text-sm text-ink-muted">Redirecionando...</p>
      </div>
    </template>

    <!-- Erro -->
    <template v-else-if="state === 'error'">
      <div class="text-center max-w-sm px-6">
        <div class="h-12 w-12 grid place-items-center mx-auto mb-3 rounded-full bg-data-neg/15 text-data-neg">
          <i class="fas fa-xmark text-lg" />
        </div>
        <h2 class="text-base font-semibold text-ink mb-2">
          {{ isLinkMode ? 'Não foi possível conectar' : 'Falha na autenticação' }}
        </h2>
        <p class="text-sm text-ink-muted mb-4">{{ isLinkMode ? linkError : errorMessage }}</p>
        <!-- No vinculo a sessao do Office continua de pe: devolver para o login
             seria expulsar quem nunca saiu. -->
        <Button v-if="isLinkMode" @click="goToAccount">{{ isMailMode ? 'Voltar para o laboratório' : 'Voltar para Minha conta' }}</Button>
        <Button v-else @click="goToLogin">Voltar ao login</Button>
      </div>
    </template>

  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
