<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'vue-toastification';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import { useForgotPassword, sanitizeEmail, OTP_LENGTH } from './composables/useForgotPassword';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

const toast = useToast();
const fp = useForgotPassword();
const authStore = useAuthStore();

function startOver() { authStore.resetForgotPasswordModal(); }

const showPassword = ref(false);
const showConfirmPassword = ref(false);
const activeHelp = ref(null);

function toggleHelp(type) { activeHelp.value = activeHelp.value === type ? null : type; }

async function onRequest() { await fp.requestReset(); }

async function onConfirm() {
  const result = await fp.confirmReset();
  if (result) toast.success(result?.message || result?.data?.message || 'Senha redefinida com sucesso.');
}

const isOpen = computed(() => fp.forgotPassword.value.open);
const step = computed(() => fp.forgotPassword.value.step);
const sanitizePassword = (v) => String(v || '');
</script>

<template>
  <Modal :open="isOpen" size="md" :title="'Redefinir senha'" :subtitle="fp.stepSubtitle.value" @close="fp.close()">
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <IconButton v-if="step === 2" icon="fas fa-arrow-left" size="sm" label="Voltar"
          @click="fp.back()" :disabled="fp.forgotPassword.value.loading" />
        <div class="flex-1 min-w-0">
          <h2 class="text-base font-semibold text-ink">Redefinir senha</h2>
          <p class="text-xs text-ink-muted mt-0.5">{{ fp.stepSubtitle.value }}</p>
        </div>
        <button v-if="step > 1 || fp.forgotPassword.value.email"
          type="button" @click="startOver"
          class="text-[11px] text-ink-subtle hover:text-accent transition-colors">
          Recomeçar
        </button>
      </div>
    </template>

    <!-- Step indicator -->
    <div class="flex gap-1 mb-5">
      <div v-for="i in 3" :key="i" class="h-1 flex-1 rounded-full transition-all duration-300"
        :class="i <= fp.currentVisualStep.value ? 'bg-accent' : 'bg-surface-sunken'" />
    </div>

    <!-- STEP 1: Email -->
    <transition name="slide-fade" mode="out-in">
      <div v-if="step === 1" key="step1" class="space-y-4">
        <div class="rounded-lg border border-accent/20 bg-accent-soft/40 px-3 py-3 text-xs text-accent leading-relaxed">
          Informe seu e-mail cadastrado. Enviaremos um código de 6 dígitos para redefinir sua senha.
        </div>

        <Input
          :model-value="fp.forgotPassword.value.email"
          type="email" placeholder="Seu e-mail cadastrado" iconLeft="fas fa-envelope"
          @update:modelValue="fp.setForgotField('email', sanitizeEmail($event))"
        />

        <Button block :loading="fp.forgotPassword.value.loading"
          :disabled="!fp.forgotPassword.value.email" @click="onRequest">
          Enviar código
        </Button>

        <div class="space-y-2 pt-1">
          <button type="button" class="text-xs text-accent hover:underline" @click="toggleHelp('email')">
            Não sei qual e-mail está cadastrado
          </button>
          <transition name="fade">
            <div v-if="activeHelp === 'email'"
              class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-xs text-ink-muted leading-5">
              Entre em contato com o administrador do sistema para verificar ou atualizar o e-mail vinculado à sua conta.
            </div>
          </transition>
        </div>
      </div>
    </transition>

    <!-- STEP 2: OTP -->
    <transition name="slide-fade" mode="out-in">
      <div v-if="step === 2 && !fp.isCodeValidated.value" key="step2" class="space-y-4">
        <div class="text-xs text-ink-muted leading-relaxed">
          Enviamos um código para
          <span class="font-semibold text-ink">{{ fp.forgotPassword.value.email }}</span>.
          Verifique sua caixa de entrada.
        </div>

        <div>
          <div class="grid grid-cols-6 gap-2">
            <input v-for="(_, index) in fp.otpDigits.value" :key="index"
              :ref="(el) => fp.setOtpInputRef(el, index)"
              :value="fp.otpDigits.value[index]" type="text" inputmode="numeric"
              autocomplete="one-time-code" maxlength="1"
              class="h-12 w-full rounded-lg border bg-surface-raised text-center text-lg font-semibold text-ink
                     outline-none transition focus:ring-2 focus:ring-accent-ring/30 focus:border-accent-ring"
              :class="fp.codeValidationMessage.value ? 'border-red-500' : 'border-line'"
              @input="fp.handleOtpInput(index, $event)"
              @keydown="fp.handleOtpKeydown(index, $event)"
              @paste="fp.handleOtpPaste($event)" />
          </div>
          <transition name="fade">
            <p v-if="fp.codeValidationMessage.value" class="mt-2 text-xs text-red-500 flex items-center gap-1">
              <i class="fas fa-circle-exclamation"></i>{{ fp.codeValidationMessage.value }}
            </p>
          </transition>
        </div>

        <Button block :loading="fp.forgotPassword.value.loading"
          :disabled="!fp.isOtpComplete.value" @click="fp.validateCodeStep()">
          Validar código
        </Button>

        <div class="space-y-2 pt-1">
          <button type="button" class="text-xs text-accent hover:underline" @click="toggleHelp('delivery')">
            Não recebi o código
          </button>
          <transition name="fade">
            <div v-if="activeHelp === 'delivery'"
              class="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300 leading-5">
              Verifique sua caixa de entrada, spam ou lixo eletrônico. Se não receber, entre em contato com o administrador.
            </div>
          </transition>
        </div>
      </div>
    </transition>

    <!-- STEP 3: New Password -->
    <transition name="slide-fade" mode="out-in">
      <div v-if="fp.isCodeValidated.value" key="step3" class="space-y-4">
        <div class="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <i class="fas fa-check-circle"></i>
          Código validado! Defina sua nova senha abaixo.
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-ink-muted">Nova senha</label>
          <div class="relative">
            <Input
              :model-value="fp.forgotPassword.value.password"
              :type="showPassword ? 'text' : 'password'" placeholder="Mínimo 8 caracteres"
              @update:modelValue="fp.setForgotField('password', sanitizePassword($event))"
            />
            <button type="button"
              class="absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-center text-ink-subtle hover:text-ink"
              @click="showPassword = !showPassword">
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>

          <div v-if="fp.forgotPassword.value.password" class="mt-2 space-y-2">
            <div class="flex gap-1">
              <div v-for="n in 4" :key="n" class="h-1 flex-1 rounded-full transition-all duration-300"
                :class="fp.passwordStrengthColor(n)" />
            </div>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
              <div v-for="check in fp.passwordCheckList" :key="check.key"
                class="flex items-center gap-1.5 text-xs transition-colors duration-200"
                :class="fp.passwordChecks.value[check.key] ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-subtle'">
                <i class="text-[10px] w-3 shrink-0"
                  :class="fp.passwordChecks.value[check.key] ? 'fas fa-check-circle' : 'far fa-circle'"></i>
                {{ check.label }}
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs font-medium text-ink-muted">Confirmar nova senha</label>
          <div class="relative">
            <Input
              :model-value="fp.forgotPassword.value.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'" placeholder="Repita a nova senha"
              @update:modelValue="fp.setForgotField('confirmPassword', sanitizePassword($event))"
            />
            <button type="button"
              class="absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-center text-ink-subtle hover:text-ink"
              @click="showConfirmPassword = !showConfirmPassword">
              <i :class="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
            </button>
          </div>
          <transition name="fade">
            <p v-if="fp.forgotPassword.value.confirmPassword && !fp.passwordChecks.value.match"
              class="text-xs text-red-500 flex items-center gap-1">
              <i class="fas fa-circle-exclamation"></i>As senhas não coincidem.
            </p>
            <p v-else-if="fp.forgotPassword.value.confirmPassword && fp.passwordChecks.value.match"
              class="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <i class="fas fa-check-circle"></i>Senhas coincidem.
            </p>
          </transition>
        </div>

        <Button block :loading="fp.forgotPassword.value.loading"
          :disabled="!fp.canSubmitReset.value" @click="onConfirm">
          Redefinir senha
        </Button>
      </div>
    </transition>

    <!-- Global feedback -->
    <transition name="fade">
      <div v-if="fp.forgotPassword.value.message"
        class="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
        <i class="fas fa-check-circle"></i>{{ fp.forgotPassword.value.message }}
      </div>
    </transition>
    <transition name="fade">
      <div v-if="fp.forgotPassword.value.error"
        class="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ fp.forgotPassword.value.error }}
      </div>
    </transition>
  </Modal>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-fade-enter-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.slide-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.slide-fade-enter-from { opacity: 0; transform: translateX(16px); }
.slide-fade-leave-to { opacity: 0; transform: translateX(-16px); }
</style>
