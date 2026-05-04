<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';

import SettingsCard from '@/components/UI/SettingsCard.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';

const toast = useToast();
const open = ref(false);
const loading = ref(false);
const status = ref(null);

const form = reactive({ email: '', password: '', confirmPassword: '' });
const showPassword = ref(false);

const canSubmit = computed(() =>
  form.email?.trim() && form.password?.trim() && form.password === form.confirmPassword
);

async function loadStatus() {
  try {
    status.value = await requestWithAuth(`${API_URL}/auth/user/sienge-credentials`);
  } catch { /* silencioso */ }
}

function reset() {
  form.email = ''; form.password = ''; form.confirmPassword = '';
  showPassword.value = false;
}

function onToggle(o) { if (!o) reset(); }

async function handleSubmit() {
  if (!canSubmit.value) return;
  loading.value = true;
  try {
    await requestWithAuth(`${API_URL}/auth/user/sienge-credentials`, {
      method: 'PUT',
      body: JSON.stringify({ email: form.email.trim(), password: form.password }),
    });
    await loadStatus();
    open.value = false;
    reset();
    toast.success('Credenciais Sienge salvas com segurança!');
  } catch (error) {
    toast.error(error?.message || 'Erro ao salvar credenciais Sienge.');
  } finally {
    loading.value = false;
  }
}

onMounted(loadStatus);
</script>

<template>
  <SettingsCard
    icon="fas fa-key"
    :iconColor="status?.hasCredentials ? 'danger' : 'neutral'"
    title="Credenciais Sienge"
    :badge="status?.hasCredentials ? `Configurado — ${status.maskedEmail}` : ''"
    :badgeVariant="status?.hasCredentials ? 'success' : 'neutral'"
    :description="status?.hasCredentials
      ? '' : 'Não configurado — necessário para criar contratos automaticamente'"
    v-model="open" @toggle="onToggle">

    <!-- LGPD notice -->
    <div class="rounded-lg border border-accent/20 bg-accent-soft/40 px-3 py-2.5 text-xs text-accent leading-relaxed mb-4">
      <i class="fas fa-shield-halved mr-1.5"></i>
      <strong>Privacidade e segurança:</strong> Suas credenciais são criptografadas com
      AES-256 antes de armazenadas e nunca são compartilhadas com outros usuários.
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <Input v-model="form.email" type="email" label="E-mail Sienge"
        placeholder="seu@email.com" required autocomplete="off" iconLeft="fas fa-envelope" />

      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">Senha Sienge</label>
        <div class="relative">
          <Input v-model="form.password" :type="showPassword ? 'text' : 'password'"
            placeholder="Sua senha do Sienge" required autocomplete="new-password" />
          <button type="button"
            class="absolute inset-y-0 right-0 z-10 w-10 grid place-items-center text-ink-subtle hover:text-ink"
            @click="showPassword = !showPassword">
            <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
          </button>
        </div>
      </div>

      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">Confirmar senha</label>
        <Input v-model="form.confirmPassword" :type="showPassword ? 'text' : 'password'"
          placeholder="Repita a senha" required autocomplete="new-password" />
        <p v-if="form.confirmPassword && form.password !== form.confirmPassword"
          class="mt-1 text-xs text-red-500 flex items-center gap-1">
          <i class="fas fa-circle-exclamation"></i>As senhas não coincidem.
        </p>
      </div>

      <Button type="submit" :loading="loading" :disabled="!canSubmit" icon="fas fa-floppy-disk">
        {{ loading
          ? 'Salvando...'
          : (status?.hasCredentials ? 'Atualizar credenciais' : 'Salvar credenciais') }}
      </Button>
    </form>
  </SettingsCard>
</template>
