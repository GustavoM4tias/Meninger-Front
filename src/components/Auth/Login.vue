<template>
  <form @submit.prevent="handleLogin">
    <select v-model="loginType"
      class="absolute top-20 text-md bg-gray-100 dark:bg-gray-700 border-none rounded-lg px-3 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer z-10">
      <option value="/">Office</option>
      <option value="/panel">Academy</option>
    </select>

    <p class="text-xl font-light uppercase my-2 dark:text-gray-400">Acesse sua conta</p>
    <hr class="border-t border-gray-400 dark:border-gray-600 mb-10" />

    <Input class="my-6" v-model="email" type="email" placeholder="Email" required />

    <div class="relative my-6">
      <Input v-model="password" :type="showLoginPassword ? 'text' : 'password'" placeholder="Senha"
        required />
      <button type="button"
        class="absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
        @click="showLoginPassword = !showLoginPassword"
        :aria-label="showLoginPassword ? 'Ocultar senha' : 'Mostrar senha'">
        <i :class="showLoginPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
      </button>
    </div>

    <p class="text-sm -mt-3 mb-2 text-blue-500 underline cursor-pointer hover:text-blue-600"
      @click="openForgotPassword">
      Esqueceu a Senha?
    </p>

    <Button class="w-full text-xl" type="submit" :disabled="loginLoading">
      {{ loginLoading ? 'Entrando...' : 'Login' }}
    </Button>
 
    <!-- Entrar com Microsoft -->
    <button
      type="button"
      @click="microsoftStore.redirectToLogin()"
      :disabled="loginLoading"
      class="w-full mt-3 flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <!-- Logo Microsoft SVG -->
      <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
        <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
        <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
        <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
      </svg>
      Entrar com Microsoft
    </button>


    <div v-if="errorMessage" class="text-red-500 mt-2 text-sm">{{ errorMessage }}</div>
    
    <a @click="register" class="text-sm mt-1 text-blue-500 cursor-pointer hover:text-blue-600">
      Não tem uma conta? Crie agora.
    </a>

    <!-- <div class="mt-4 flex gap-2 items-center">
      <Button v-if="faceEnabled" type="button" @click="loginFacial" :disabled="loginLoading">
        Entrar com o Face ID
      </Button>
    </div> --> 

    <!-- ─────────────────── FORGOT PASSWORD MODAL ─────────────────── -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="forgotPassword.open" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeForgotPassword" />

          <div
            class="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/95 dark:bg-gray-900/90 shadow-2xl backdrop-blur-xl overflow-hidden">
            <!-- Header -->
            <div class="p-4 border-b border-black/5 dark:border-white/10 flex items-center gap-3">
              <!-- Step back button (only on step 2) -->
              <button v-if="forgotPassword.step === 2" type="button"
                class="h-8 w-8 rounded-lg grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 transition text-gray-500 dark:text-gray-300 shrink-0"
                @click="backForgotPasswordStep" :disabled="forgotPassword.loading" aria-label="Voltar">
                <i class="fas fa-arrow-left text-sm"></i>
              </button>

              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-gray-900 dark:text-white">Redefinir senha</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {{ stepSubtitle }}
                </div>
              </div>

              <button type="button"
                class="h-8 w-8 rounded-lg grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 transition shrink-0"
                @click="closeForgotPassword" :disabled="forgotPassword.loading" aria-label="Fechar">
                <i class="fas fa-times text-gray-500 dark:text-gray-300 text-sm"></i>
              </button>
            </div>

            <!-- Step indicator -->
            <div class="flex gap-1 px-4 pt-3">
              <div v-for="i in 3" :key="i" class="h-1 flex-1 rounded-full transition-all duration-300"
                :class="i <= currentVisualStep ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'" />
            </div>

            <!-- Body -->
            <div class="p-4">

              <!-- ── STEP 1: Email ── -->
              <transition name="slide-fade" mode="out-in">
                <div v-if="forgotPassword.step === 1" key="step1" class="space-y-4">
                  <div
                    class="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-400/20 px-3 py-3 text-xs text-blue-800 dark:text-blue-200 leading-5">
                    Informe seu e-mail cadastrado. Enviaremos um código de 6 dígitos para redefinir sua senha.
                  </div>

                  <Input :model-value="forgotPassword.email" type="email" placeholder="Seu e-mail cadastrado"
                    @update:modelValue="setForgotField('email', sanitizeEmail($event))" />

                  <Button type="button" :disabled="forgotPassword.loading || !forgotPassword.email"
                    @click="handleForgotPasswordRequest" class="w-full">
                    <span v-if="forgotPassword.loading">
                      <i class="fas fa-circle-notch fa-spin mr-2"></i>Enviando...
                    </span>
                    <span v-else>Enviar código</span>
                  </Button>

                  <!-- Help links -->
                  <div class="space-y-2 pt-1">
                    <button type="button" class="text-xs text-blue-500 hover:text-blue-600 underline block"
                      @click="toggleHelp('email')">
                      Não sei qual e-mail está cadastrado
                    </button>
                    <transition name="fade">
                      <div v-if="activeHelp === 'email'"
                        class="rounded-xl border border-gray-200 bg-gray-50 dark:bg-white/5 dark:border-white/10 px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300 leading-5">
                        Entre em contato com o administrador do sistema para verificar ou atualizar o e-mail vinculado à
                        sua conta.
                      </div>
                    </transition>
                  </div>
                </div>
              </transition>

              <!-- ── STEP 2: OTP ── -->
              <transition name="slide-fade" mode="out-in">
                <div v-if="forgotPassword.step === 2 && !isCodeValidated" key="step2" class="space-y-4">
                  <div class="text-xs text-gray-600 dark:text-gray-300 leading-5">
                    Enviamos um código para <span class="font-semibold text-gray-800 dark:text-white">{{
                      forgotPassword.email }}</span>. Verifique sua caixa de entrada.
                  </div>

                  <!-- OTP inputs -->
                  <div>
                    <div class="grid grid-cols-6 gap-2">
                      <input v-for="(_, index) in otpDigits" :key="index" :ref="(el) => setOtpInputRef(el, index)"
                        :value="otpDigits[index]" type="text" inputmode="numeric" autocomplete="one-time-code"
                        maxlength="1"
                        class="h-12 w-full rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-center text-lg font-semibold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
                        :class="{ 'border-red-400 dark:border-red-400': codeValidationMessage }"
                        @input="handleOtpInput(index, $event)" @keydown="handleOtpKeydown(index, $event)"
                        @paste="handleOtpPaste($event)" />
                    </div>
                    <transition name="fade">
                      <p v-if="codeValidationMessage" class="mt-2 text-xs text-red-500">
                        <i class="fas fa-exclamation-circle mr-1"></i>{{ codeValidationMessage }}
                      </p>
                    </transition>
                  </div>

                  <Button type="button" :disabled="forgotPassword.loading || !isOtpComplete" @click="validateCodeStep"
                    class="w-full">
                    <span v-if="forgotPassword.loading">
                      <i class="fas fa-circle-notch fa-spin mr-2"></i>Validando...
                    </span>
                    <span v-else>Validar código</span>
                  </Button>

                  <!-- Help links -->
                  <div class="space-y-2 pt-1">
                    <button type="button" class="text-xs text-blue-500 hover:text-blue-600 underline block"
                      @click="toggleHelp('delivery')">
                      Não recebi o código
                    </button>
                    <transition name="fade">
                      <div v-if="activeHelp === 'delivery'"
                        class="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-400/20 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-100 leading-5">
                        Verifique sua caixa de entrada, spam ou lixo eletrônico. Se não receber, entre em contato com o
                        administrador.
                      </div>
                    </transition>
                  </div>
                </div>
              </transition>

              <!-- ── STEP 3: New Password (slides in after code validated) ── -->
              <transition name="slide-fade" mode="out-in">
                <div v-if="isCodeValidated" key="step3" class="space-y-4">
                  <div
                    class="rounded-xl border border-green-200 bg-green-50 dark:bg-green-500/10 dark:border-green-400/20 px-3 py-2.5 text-xs text-green-800 dark:text-green-200 leading-5 flex items-center gap-2">
                    <i class="fas fa-check-circle text-green-500"></i>
                    Código validado! Defina sua nova senha abaixo.
                  </div>

                  <!-- New password -->
                  <div class="space-y-1">
                    <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Nova senha</label>
                    <div class="relative">
                      <Input :model-value="forgotPassword.password"
                        :type="showForgotPassword ? 'text' : 'password'" placeholder="Mínimo 8 caracteres"
                        @update:modelValue="setForgotField('password', sanitizePassword($event))" />
                      <button type="button"
                        class="absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
                        @click="showForgotPassword = !showForgotPassword">
                        <i :class="showForgotPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                      </button>
                    </div>

                    <!-- Strength indicators -->
                    <div v-if="forgotPassword.password" class="mt-2 space-y-1">
                      <div class="flex gap-1">
                        <div v-for="n in 4" :key="n" class="h-1 flex-1 rounded-full transition-all duration-300"
                          :class="passwordStrengthColor(n)" />
                      </div>
                      <div class="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                        <div v-for="check in passwordCheckList" :key="check.key"
                          class="flex items-center gap-1.5 text-xs transition-colors duration-200"
                          :class="passwordChecks[check.key] ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'">
                          <i class="text-[10px] w-3 shrink-0"
                            :class="passwordChecks[check.key] ? 'fas fa-check-circle text-green-500' : 'far fa-circle'"></i>
                          {{ check.label }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Confirm password -->
                  <div class="space-y-1">
                    <label class="text-xs font-medium text-gray-600 dark:text-gray-400">Confirmar nova senha</label>
                    <div class="relative">
                      <Input :model-value="forgotPassword.confirmPassword"
                        :type="showForgotConfirmPassword ? 'text' : 'password'" placeholder="Repita a nova senha"
                        @update:modelValue="setForgotField('confirmPassword', sanitizePassword($event))" />
                      <button type="button"
                        class="absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white"
                        @click="showForgotConfirmPassword = !showForgotConfirmPassword">
                        <i :class="showForgotConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                      </button>
                    </div>
                    <transition name="fade">
                      <p v-if="forgotPassword.confirmPassword && !passwordChecks.match"
                        class="text-xs text-red-500 mt-1">
                        <i class="fas fa-exclamation-circle mr-1"></i>As senhas não coincidem.
                      </p>
                      <p v-else-if="forgotPassword.confirmPassword && passwordChecks.match"
                        class="text-xs text-green-600 dark:text-green-400 mt-1">
                        <i class="fas fa-check-circle mr-1"></i>Senhas coincidem.
                      </p>
                    </transition>
                  </div>

                  <Button type="button" :disabled="forgotPassword.loading || !canSubmitReset"
                    @click="handleForgotPasswordReset" class="w-full">
                    <span v-if="forgotPassword.loading">
                      <i class="fas fa-circle-notch fa-spin mr-2"></i>Redefinindo...
                    </span>
                    <span v-else>Redefinir senha</span>
                  </Button>
                </div>
              </transition>

              <!-- Global feedback messages -->
              <transition name="fade">
                <div v-if="forgotPassword.message"
                  class="mt-3 rounded-xl border border-green-200 bg-green-50 dark:bg-green-500/10 dark:border-green-400/20 px-3 py-2.5 text-xs text-green-700 dark:text-green-200 flex items-center gap-2">
                  <i class="fas fa-check-circle text-green-500"></i>
                  {{ forgotPassword.message }}
                </div>
              </transition>
              <transition name="fade">
                <div v-if="forgotPassword.error"
                  class="mt-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-400/20 px-3 py-2.5 text-xs text-red-700 dark:text-red-200 flex items-center gap-2">
                  <i class="fas fa-exclamation-circle text-red-500"></i>
                  {{ forgotPassword.error }}
                </div>
              </transition>

            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- ─────────────────── FACE MODAL ─────────────────── -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="faceLoginOpen" class="fixed inset-0 z-[9999] flex items-center justify-center p-4" tabindex="-1">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeFaceLogin" />

          <div
            class="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/95 dark:bg-gray-900/75 shadow-2xl backdrop-blur-xl overflow-hidden">
            <div class="p-4 border-b border-black/5 dark:border-white/10 flex items-start justify-between">
              <div>
                <div class="text-sm font-semibold text-gray-900 dark:text-white">Autenticação facial</div>
                <div class="text-xs text-gray-600 dark:text-gray-300 mt-1">Siga as instruções para validar.</div>
              </div>
              <button type="button"
                class="h-9 w-9 rounded-xl grid place-items-center hover:bg-black/5 dark:hover:bg-white/10 transition"
                @click="closeFaceLogin" :disabled="loginLoading" aria-label="Fechar">
                <i class="fas fa-times text-gray-700 dark:text-gray-200"></i>
              </button>
            </div>

            <div class="h-1.5 w-full transition-colors duration-200" :class="statusBarClass"></div>

            <div class="p-4">
              <div class="mb-3 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 p-3">
                <div class="text-xs font-semibold text-gray-800 dark:text-gray-100 mb-2">Como alinhar o rosto</div>
                <ul class="text-xs text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
                  <li>Centralize o rosto dentro da <b>moldura oval</b>.</li>
                  <li>Mantenha os <b>olhos na linha</b> horizontal indicada.</li>
                  <li>Fique a ~<b>40–60 cm</b> da câmera e com boa luz.</li>
                  <li>Evite óculos escuros, bonés e movimento rápido.</li>
                </ul>
              </div>

              <div class="relative rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-black"
                :class="glowClass">
                <video ref="videoLoginRef" autoplay playsinline muted class="w-full aspect-video" />
                <div class="pointer-events-none absolute inset-0">
                  <div class="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"></div>
                  <div class="absolute inset-0 grid place-items-center">
                    <div class="relative">
                      <div class="h-44 w-36 rounded-[999px] border transition-colors duration-200"
                        :class="frameBorderClass"></div>
                      <div class="absolute left-1/2 top-[38%] -translate-x-1/2 w-44 h-px transition-colors duration-200"
                        :class="frameLineClass"></div>
                      <div class="absolute -left-2 top-1/2 -translate-y-1/2 h-10 w-px transition-colors duration-200"
                        :class="frameLineClass"></div>
                      <div class="absolute -right-2 top-1/2 -translate-y-1/2 h-10 w-px transition-colors duration-200"
                        :class="frameLineClass"></div>
                    </div>
                  </div>
                  <div class="absolute bottom-3 left-3 text-[11px] font-mono text-white/80">{{ statusText }}</div>
                </div>
              </div>

              <div class="mt-3 flex items-center justify-between gap-3">
                <span
                  class="font-mono text-xs px-2 py-1 rounded-full border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-gray-600 dark:text-gray-300">
                  {{ statusPill }}
                </span>
                <div class="flex gap-2">
                  <Button type="button" :disabled="loginLoading || !cameraReady" @click="doFaceLogin">
                    {{ loginLoading ? 'Validando...' : 'Confirmar' }}
                  </Button>
                  <Button outlined type="button" @click="closeFaceLogin" :disabled="loginLoading">
                    Cancelar
                  </Button>
                </div>
              </div>

              <div v-if="faceError" class="mt-3 text-sm text-red-500">{{ faceError }}</div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </form>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useFaceStore } from '@/stores/Settings/Auth/faceStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import { useToast } from 'vue-toastification';

// ─── Constants ───────────────────────────────────────────────────────────────
const OTP_LENGTH = 6;
const PASSWORD_MIN_LENGTH = 8;

const ALLOWED_PASSWORD_REGEX = /^[A-Za-z0-9!@#$%^&*()_\-+=[\]{};:,.?/\\|~`"'<>]+$/;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_REGEX = /[!@#$%^&*()_\-+=[\]{};:,.?/\\|~`"'<>]/;

const passwordCheckList = [
  { key: 'minLength', label: `${PASSWORD_MIN_LENGTH}+ caracteres` },
  { key: 'uppercase', label: '1 maiúscula' },
  { key: 'lowercase', label: '1 minúscula' },
  { key: 'number', label: '1 número' },
  { key: 'special', label: '1 caractere especial' },
  { key: 'noInvalidChars', label: 'Caracteres válidos' },
];

// ─── Store & Toast ────────────────────────────────────────────────────────────
const toast = useToast();
const authStore = useAuthStore();
const faceStore = useFaceStore();
const microsoftStore = useMicrosoftStore();

// ─── Login state ─────────────────────────────────────────────────────────────
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const loginType = ref('/');
const loginLoading = ref(false);
const showLoginPassword = ref(false);

// ─── Face state ───────────────────────────────────────────────────────────────
const faceEnabled = ref(true);
const faceLoginOpen = ref(false);
const videoLoginRef = ref(null);
const streamRef = ref(null);
const cameraReady = ref(false);
const faceError = ref('');
const faceStatus = ref('idle');

// ─── Forgot password UI state ─────────────────────────────────────────────────
const showForgotPassword = ref(false);
const showForgotConfirmPassword = ref(false);
const activeHelp = ref(null);
const codeStepValidated = ref(false);
const codeValidationMessage = ref('');
const otpInputRefs = ref(Array(OTP_LENGTH).fill(null));

// ─── Store computed ───────────────────────────────────────────────────────────
const forgotPassword = computed(() => authStore.forgotPassword);

const otpDigits = computed(() => {
  const code = String(forgotPassword.value.code || '').slice(0, OTP_LENGTH);
  const digits = code.split('');
  while (digits.length < OTP_LENGTH) digits.push('');
  return digits;
});

const isOtpComplete = computed(() => String(forgotPassword.value.code || '').length === OTP_LENGTH);

const isCodeValidated = computed(() => codeStepValidated.value && isOtpComplete.value);

/** Which visual step (1–3) to highlight in the progress bar */
const currentVisualStep = computed(() => {
  if (forgotPassword.value.step === 1) return 1;
  if (!isCodeValidated.value) return 2;
  return 3;
});

const stepSubtitle = computed(() => {
  const map = {
    1: 'Passo 1 de 3 — Informe o e-mail',
    2: 'Passo 2 de 3 — Valide o código',
    3: 'Passo 3 de 3 — Crie a nova senha',
  };
  return map[currentVisualStep.value] ?? '';
});

// ─── Password checks ──────────────────────────────────────────────────────────
const passwordChecks = computed(() => {
  const p = String(forgotPassword.value.password || '');
  const c = String(forgotPassword.value.confirmPassword || '');
  return {
    minLength: p.length >= PASSWORD_MIN_LENGTH,
    uppercase: UPPERCASE_REGEX.test(p),
    lowercase: LOWERCASE_REGEX.test(p),
    number: NUMBER_REGEX.test(p),
    special: SPECIAL_REGEX.test(p),
    noInvalidChars: p.length > 0 ? ALLOWED_PASSWORD_REGEX.test(p) : true,
    match: p.length > 0 && c.length > 0 && p === c,
  };
});

const passwordStrengthScore = computed(() => {
  const checks = passwordChecks.value;
  return [checks.minLength, checks.uppercase, checks.lowercase, checks.number, checks.special].filter(Boolean).length;
});

function passwordStrengthColor(n) {
  const score = passwordStrengthScore.value;
  if (score === 0) return 'bg-gray-200 dark:bg-gray-700';
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
  const level = Math.ceil((score / 5) * 4); // 1–4
  return n <= level ? colors[level - 1] : 'bg-gray-200 dark:bg-gray-700';
}

const canSubmitReset = computed(() => {
  const c = passwordChecks.value;
  return Boolean(
    forgotPassword.value.email &&
    isCodeValidated.value &&
    forgotPassword.value.password &&
    forgotPassword.value.confirmPassword &&
    c.minLength && c.uppercase && c.lowercase && c.number && c.special && c.noInvalidChars && c.match
  );
});

// ─── Face computed ────────────────────────────────────────────────────────────
const statusText = computed(() => {
  const map = { opening: 'iniciando câmera...', ready: 'alinhe o rosto na moldura', validating: 'validando...', success: 'aprovado ✓', error: 'reprovado ✕' };
  return map[faceStatus.value] ?? 'aguardando...';
});

const statusPill = computed(() => {
  const map = { success: 'APROVADO', error: 'REPROVADO', validating: 'VALIDANDO', ready: 'PRONTO', opening: 'INICIANDO' };
  return map[faceStatus.value] ?? 'AGUARDANDO';
});

const statusBarClass = computed(() => {
  const map = { success: 'bg-green-500', error: 'bg-red-500', validating: 'bg-blue-500' };
  return map[faceStatus.value] ?? 'bg-gray-300 dark:bg-gray-700';
});

const frameBorderClass = computed(() => {
  const map = { success: 'border-green-400', error: 'border-red-400', validating: 'border-blue-400' };
  return map[faceStatus.value] ?? 'border-white/60 dark:border-white/35';
});

const frameLineClass = computed(() => {
  const map = { success: 'bg-green-400', error: 'bg-red-400', validating: 'bg-blue-400' };
  return map[faceStatus.value] ?? 'bg-white/60';
});

const glowClass = computed(() => {
  const map = { success: 'shadow-[0_0_0_2px_rgba(34,197,94,0.25)]', error: 'shadow-[0_0_0_2px_rgba(239,68,68,0.25)]', validating: 'shadow-[0_0_0_2px_rgba(59,130,246,0.25)]' };
  return map[faceStatus.value] ?? '';
});

// ─── Watchers ─────────────────────────────────────────────────────────────────
watch(() => forgotPassword.value.open, (isOpen) => { if (!isOpen) resetForgotUiState(); });

watch(() => forgotPassword.value.step, (step) => {
  if (step === 2) {
    syncOtpFromStore();
    nextTick(() => focusOtpInput(0));
  }
});

watch(() => forgotPassword.value.code, () => {
  codeStepValidated.value = false;
  codeValidationMessage.value = '';
  setForgotField('password', '');
  setForgotField('confirmPassword', '');
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isLocal() {
  const h = window.location.hostname;
  return h === 'localhost' || h.endsWith('.localhost');
}

function resolveRedirectUrl(selectedPath) {
  const isAcademy = selectedPath === '/panel';
  if (isLocal()) return isAcademy ? 'http://localhost:5174/panel' : 'http://localhost:5173/';
  return isAcademy ? 'https://academy.menin.com.br/panel' : 'https://office.menin.com.br/';
}

function sanitizeEmail(value) { return String(value || '').trim().toLowerCase(); }
function sanitizeCode(value) { return String(value || '').replace(/\D/g, '').slice(0, OTP_LENGTH); }
function sanitizePassword(value) { return String(value || ''); }

// ─── OTP helpers ─────────────────────────────────────────────────────────────
function setOtpInputRef(el, index) { otpInputRefs.value[index] = el; }

function focusOtpInput(index) {
  const t = otpInputRefs.value[index];
  if (t?.focus) { t.focus(); t.select?.(); }
}

function setForgotField(field, value) { authStore.setForgotPasswordField(field, value); }
function setForgotCode(code) { setForgotField('code', sanitizeCode(code)); }
function syncOtpFromStore() { setForgotCode(forgotPassword.value.code || ''); }

function handleOtpInput(index, event) {
  const digit = String(event?.target?.value || '').replace(/\D/g, '').slice(-1);
  const digits = [...otpDigits.value];
  digits[index] = digit;
  setForgotCode(digits.join(''));
  if (digit && index < OTP_LENGTH - 1) nextTick(() => focusOtpInput(index + 1));
}

function handleOtpKeydown(index, event) {
  const digits = [...otpDigits.value];
  if (event.key === 'Backspace') {
    if (digits[index]) { digits[index] = ''; setForgotCode(digits.join('')); return; }
    if (index > 0) { digits[index - 1] = ''; setForgotCode(digits.join('')); nextTick(() => focusOtpInput(index - 1)); }
    return;
  }
  if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); focusOtpInput(index - 1); return; }
  if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) { event.preventDefault(); focusOtpInput(index + 1); return; }
  if (event.key === ' ' || event.key === 'Spacebar') event.preventDefault();
}

function handleOtpPaste(event) {
  event.preventDefault();
  const pasted = sanitizeCode(event.clipboardData?.getData('text') || '');
  if (!pasted) return;
  setForgotCode(pasted);
  nextTick(() => focusOtpInput(Math.min(pasted.length - 1, OTP_LENGTH - 1)));
}

function validateCodeStep() {
  if (!isOtpComplete.value) {
    codeValidationMessage.value = 'Preencha todos os 6 dígitos do código.';
    codeStepValidated.value = false;
    return;
  }
  codeValidationMessage.value = '';
  codeStepValidated.value = true;
}

// ─── UI actions ───────────────────────────────────────────────────────────────
function toggleHelp(type) { activeHelp.value = activeHelp.value === type ? null : type; }

function resetForgotUiState() {
  activeHelp.value = null;
  showForgotPassword.value = false;
  showForgotConfirmPassword.value = false;
  codeStepValidated.value = false;
  codeValidationMessage.value = '';
  otpInputRefs.value = Array(OTP_LENGTH).fill(null);
}

async function redirectAfterLogin() {
  closeFaceLogin();
  await nextTick();
  window.location.assign(resolveRedirectUrl(loginType.value));
}

// ─── Login ────────────────────────────────────────────────────────────────────
async function handleLogin() {
  errorMessage.value = '';
  loginLoading.value = true;
  try {
    await authStore.login(sanitizeEmail(email.value), password.value);
    await redirectAfterLogin();
  } catch (error) {
    errorMessage.value = error?.message || 'Erro ao tentar login.';
  } finally {
    loginLoading.value = false;
  }
}

// ─── Forgot password ──────────────────────────────────────────────────────────
function openForgotPassword() {
  authStore.openForgotPasswordModal(sanitizeEmail(email.value));
  resetForgotUiState();
}

function closeForgotPassword() {
  authStore.closeForgotPasswordModal();
  resetForgotUiState();
}

function backForgotPasswordStep() {
  authStore.backForgotPasswordStep();
  resetForgotUiState();
  setForgotField('password', '');
  setForgotField('confirmPassword', '');
  setForgotCode('');
}

async function handleForgotPasswordRequest() {
  try {
    await authStore.requestForgotPassword();
    syncOtpFromStore();
    nextTick(() => focusOtpInput(0));
  } catch (_) { /* handled by store */ }
}

async function handleForgotPasswordReset() {
  if (!canSubmitReset.value) return;
  try {
    const result = await authStore.confirmForgotPassword();
    toast.success(result?.message || result?.data?.message || 'Senha redefinida com sucesso.');
    authStore.closeForgotPasswordModal();
    resetForgotUiState();
  } catch (_) { /* handled by store */ }
}

async function register() {
  toast.info('Solicite acesso a seu gestor.');
}

// ─── Face login ───────────────────────────────────────────────────────────────
function openFaceLogin() {
  faceError.value = '';
  cameraReady.value = false;
  faceStatus.value = 'opening';
  faceLoginOpen.value = true;
}

function stopCamera() {
  try { streamRef.value?.getTracks()?.forEach((t) => t.stop()); } catch { }
  streamRef.value = null;
  cameraReady.value = false;
}

function closeFaceLogin() {
  stopCamera();
  faceLoginOpen.value = false;
  faceStatus.value = 'idle';
}

async function startCamera() {
  const video = videoLoginRef.value;
  if (!video) throw new Error('Video element não disponível.');
  streamRef.value = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
  video.srcObject = streamRef.value;
  if (!(video.readyState >= 2 && video.videoWidth && video.videoHeight)) {
    await new Promise((resolve) => { video.onloadedmetadata = () => resolve(); });
  }
  cameraReady.value = true;
  faceStatus.value = 'ready';
}

async function loginFacial() {
  faceError.value = '';
  loginLoading.value = true;
  try {
    await faceStore.loadModelsOnce();
    openFaceLogin();
    await nextTick();
    await startCamera();
  } catch (error) {
    faceError.value = error?.message || 'Erro ao iniciar câmera.';
    faceStatus.value = 'error';
    closeFaceLogin();
  } finally {
    loginLoading.value = false;
  }
}

async function doFaceLogin() {
  faceError.value = '';
  loginLoading.value = true;
  faceStatus.value = 'validating';
  try {
    const video = videoLoginRef.value;
    if (!video) throw new Error('Câmera não inicializada.');
    const embedding = await faceStore.getOneGoodEmbedding(video);
    if (!embedding) throw new Error('Rosto não detectado. Alinhe na moldura.');
    const result = await faceStore.identify(embedding);
    if (result?.success && result?.data?.token) {
      authStore.setToken(result.data.token);
      await authStore.fetchUserInfo();
      faceStatus.value = 'success';
      await nextTick();
      setTimeout(() => redirectAfterLogin(), 350);
      return;
    }
    faceStatus.value = 'error';
    faceError.value = result?.error || 'Falha no reconhecimento. Tente novamente ou use senha.';
  } catch (error) {
    faceStatus.value = 'error';
    faceError.value = error?.message || 'Erro na autenticação facial.';
  } finally {
    loginLoading.value = false;
    if (faceStatus.value !== 'success' && cameraReady.value) faceStatus.value = 'ready';
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(() => {
  if (authStore.isAuthenticated()) { redirectAfterLogin(); return; }
  authStore.clearUser();
});

onBeforeUnmount(() => closeFaceLogin());
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.slide-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>