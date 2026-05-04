<script setup>
import { ref, reactive, computed, toRef } from 'vue';
import { useToast } from 'vue-toastification';
import { changePassword } from '@/utils/Auth/apiAuth';

import SettingsCard from '@/components/UI/SettingsCard.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import { usePasswordStrength } from '@/utils/usePasswordStrength';

const toast = useToast();
const open = ref(false);
const loading = ref(false);

const form = reactive({ current: '', new: '', confirm: '' });
const showPasswords = reactive({ current: false, new: false, confirm: false });

const successBanner = ref({ visible: false, password: '', copied: false });
let successTimer = null;

const strength = usePasswordStrength(toRef(form, 'new'), toRef(form, 'confirm'));

const canSubmit = computed(() => Boolean(
  form.current && form.new && form.confirm && strength.isStrong.value && strength.checks.value.match
));

function reset() {
  form.current = ''; form.new = ''; form.confirm = '';
  showPasswords.current = false; showPasswords.new = false; showPasswords.confirm = false;
}

function dismissBanner() {
  if (successTimer) clearTimeout(successTimer);
  successBanner.value.visible = false;
  successBanner.value.password = '';
}

function onToggle(o) {
  if (!o) reset();
  dismissBanner();
}

async function handleSubmit() {
  if (!canSubmit.value) return;
  loading.value = true;
  try {
    const newPwd = form.new;
    await changePassword(form.current, newPwd, form.confirm);
    reset();
    open.value = false;
    if (successTimer) clearTimeout(successTimer);
    successBanner.value = { visible: true, password: newPwd, copied: false };
    successTimer = setTimeout(() => { successBanner.value.visible = false; }, 30000);
  } catch (error) {
    toast.error(error?.message || 'Erro ao alterar senha.');
  } finally {
    loading.value = false;
  }
}

function copyPassword() {
  navigator.clipboard.writeText(successBanner.value.password);
  successBanner.value.copied = true;
  setTimeout(() => { successBanner.value.copied = false; }, 2500);
}
</script>

<template>
  <div class="space-y-3">
    <SettingsCard
      icon="fas fa-lock" iconColor="warning"
      title="Alterar senha"
      description="Atualize sua senha de acesso"
      v-model="open" @toggle="onToggle">
      <form @submit.prevent="handleSubmit" class="space-y-4">

        <!-- Senha atual -->
        <div>
          <label class="block text-xs font-medium text-ink-muted mb-1.5">Senha atual</label>
          <div class="relative">
            <Input v-model="form.current" :type="showPasswords.current ? 'text' : 'password'"
              placeholder="Digite sua senha atual" required autocomplete="current-password" />
            <button type="button"
              class="absolute inset-y-0 right-0 z-10 w-10 grid place-items-center text-ink-subtle hover:text-ink"
              @click="showPasswords.current = !showPasswords.current">
              <i :class="showPasswords.current ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
        </div>

        <div class="border-t border-dashed border-line"></div>

        <!-- Nova senha -->
        <div>
          <label class="block text-xs font-medium text-ink-muted mb-1.5">Nova senha</label>
          <div class="relative">
            <Input v-model="form.new" :type="showPasswords.new ? 'text' : 'password'"
              placeholder="Mínimo 8 caracteres" required autocomplete="new-password" />
            <button type="button"
              class="absolute inset-y-0 right-0 z-10 w-10 grid place-items-center text-ink-subtle hover:text-ink"
              @click="showPasswords.new = !showPasswords.new">
              <i :class="showPasswords.new ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>

          <transition name="fade">
            <div v-if="form.new" class="mt-2 space-y-2">
              <div class="flex gap-1">
                <div v-for="n in 4" :key="n" class="h-1 flex-1 rounded-full transition-all duration-300"
                  :class="strength.strengthBarColor(n)" />
              </div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                <div v-for="check in strength.passwordCheckList" :key="check.key"
                  class="flex items-center gap-1.5 text-xs transition-colors"
                  :class="strength.checks.value[check.key]
                    ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-subtle'">
                  <i class="text-[10px] w-3 shrink-0"
                    :class="strength.checks.value[check.key] ? 'fas fa-check-circle' : 'far fa-circle'"></i>
                  {{ check.label }}
                </div>
              </div>
            </div>
          </transition>
        </div>

        <!-- Confirmar -->
        <div>
          <label class="block text-xs font-medium text-ink-muted mb-1.5">Confirmar nova senha</label>
          <div class="relative">
            <Input v-model="form.confirm" :type="showPasswords.confirm ? 'text' : 'password'"
              placeholder="Repita a nova senha" required autocomplete="new-password" />
            <button type="button"
              class="absolute inset-y-0 right-0 z-10 w-10 grid place-items-center text-ink-subtle hover:text-ink"
              @click="showPasswords.confirm = !showPasswords.confirm">
              <i :class="showPasswords.confirm ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
          <transition name="fade">
            <p v-if="form.confirm && !strength.checks.value.match"
              class="mt-1 text-xs text-red-500 flex items-center gap-1">
              <i class="fas fa-circle-exclamation"></i>As senhas não coincidem.
            </p>
            <p v-else-if="form.confirm && strength.checks.value.match"
              class="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <i class="fas fa-check-circle"></i>Senhas coincidem.
            </p>
          </transition>
        </div>

        <div class="pt-1">
          <Button type="submit" :loading="loading" :disabled="!canSubmit"
            icon="fas fa-shield-halved">
            {{ loading ? 'Alterando...' : 'Alterar senha' }}
          </Button>
        </div>
      </form>
    </SettingsCard>

    <!-- Banner de sucesso -->
    <transition name="fade">
      <div v-if="successBanner.visible"
        class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 surface-gradient">
        <div class="flex items-start gap-3">
          <div class="h-9 w-9 grid place-items-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
            <i class="fas fa-circle-check"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-ink">Senha alterada com sucesso!</p>
            <p class="text-xs text-ink-muted mt-0.5 mb-3">Copie sua nova senha antes que este aviso desapareça.</p>
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface border border-line font-mono text-sm text-ink truncate">
                {{ successBanner.password }}
              </div>
              <Button size="sm" :variant="successBanner.copied ? 'subtle' : 'secondary'"
                :icon="successBanner.copied ? 'fas fa-check' : 'fas fa-copy'" @click="copyPassword">
                {{ successBanner.copied ? 'Copiado!' : 'Copiar' }}
              </Button>
              <button type="button" @click="dismissBanner"
                class="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors">
                <i class="fas fa-xmark text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
