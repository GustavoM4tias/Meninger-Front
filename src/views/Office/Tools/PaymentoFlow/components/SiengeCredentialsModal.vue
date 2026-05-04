<script setup>
/**
 * SiengeCredentialsModal — gate exibido quando o usuário acessa o
 * Fluxo de pagamento sem ter configurado suas credenciais Sienge.
 */
import { ref, reactive, computed } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';

const emit = defineEmits(['saved', 'close']);

const loading = ref(false);
const error = ref(null);
const showPassword = ref(false);
const form = reactive({ email: '', password: '', confirmPassword: '' });

const canSubmit = computed(() =>
  form.email?.trim() &&
  form.password?.trim() &&
  form.password === form.confirmPassword
);

async function handleSave() {
  if (!canSubmit.value) return;
  loading.value = true;
  error.value = null;
  try {
    await requestWithAuth(`${API_URL}/auth/user/sienge-credentials`, {
      method: 'PUT',
      body: JSON.stringify({ email: form.email.trim(), password: form.password }),
    });
    emit('saved');
  } catch (err) {
    error.value = err.message || 'Erro ao salvar credenciais.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Modal :open="true" size="md" @close="$emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-plug text-sm"></i>
        </div>
        <div>
          <h2 class="text-base font-semibold text-ink">Configurar credenciais Sienge</h2>
          <p class="text-xs text-ink-muted mt-0.5">Necessário para criar contratos automaticamente</p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Aviso de autorização -->
      <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
        <p class="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
          <i class="fas fa-triangle-exclamation"></i>
          Leia antes de continuar
        </p>
        <p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          Ao informar suas credenciais, você autoriza o sistema a acessar o Sienge usando sua conta para
          realizar automaticamente ações como <strong>criar contratos, aditivos, medições e títulos</strong>,
          além de <strong>ler e editar dados</strong> em seu nome.
        </p>
        <p class="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          Em alguns processos, o sistema pode <strong>iniciar uma sessão ativa</strong> com seu usuário,
          o que pode encerrar sessões abertas no navegador. Isso é esperado.
        </p>
      </div>

      <!-- Segurança -->
      <div class="rounded-lg border border-accent/20 bg-accent-soft/40 p-3 text-xs text-accent leading-relaxed">
        <i class="fas fa-shield-halved mr-1.5"></i>
        <strong>Suas credenciais estão protegidas.</strong> Os dados são criptografados com AES-256
        e armazenados exclusivamente na sua conta. Nenhum outro usuário tem acesso.
      </div>

      <Input v-model="form.email" type="email" label="E-mail Sienge"
        placeholder="seu@email.com" autocomplete="off" iconLeft="fas fa-envelope" />

      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">Senha Sienge</label>
        <div class="relative">
          <Input v-model="form.password" :type="showPassword ? 'text' : 'password'"
            placeholder="Sua senha" autocomplete="new-password" />
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
          placeholder="Repita a senha" autocomplete="new-password" />
        <p v-if="form.confirmPassword && form.password !== form.confirmPassword"
          class="mt-1 text-xs text-red-500 flex items-center gap-1">
          <i class="fas fa-circle-exclamation"></i>As senhas não coincidem.
        </p>
      </div>

      <div v-if="error"
        class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ error }}
      </div>
    </div>

    <template #footer>
      <a href="/settings/Account"
        class="mr-auto text-xs text-ink-muted hover:text-accent transition-colors flex items-center gap-1">
        <i class="fas fa-arrow-up-right-from-square text-[10px]"></i>
        Configurar em Minha Conta
      </a>
      <Button :loading="loading" :disabled="!canSubmit"
        icon="fas fa-floppy-disk" @click="handleSave">
        {{ loading ? 'Salvando...' : 'Salvar e continuar' }}
      </Button>
    </template>
  </Modal>
</template>
