// Composable: lógica do fluxo "Esqueci minha senha" (3 passos: email -> OTP -> nova senha).
// Mantém store interno + validações + helpers de OTP, isolado do componente visual.

import { ref, computed, watch, nextTick } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

export const OTP_LENGTH = 6;
export const PASSWORD_MIN_LENGTH = 8;

const ALLOWED_PASSWORD_REGEX = /^[A-Za-z0-9!@#$%^&*()_\-+=[\]{};:,.?/\\|~`"'<>]+$/;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_REGEX = /[!@#$%^&*()_\-+=[\]{};:,.?/\\|~`"'<>]/;

export const passwordCheckList = [
  { key: 'minLength', label: `${PASSWORD_MIN_LENGTH}+ caracteres` },
  { key: 'uppercase', label: '1 maiúscula' },
  { key: 'lowercase', label: '1 minúscula' },
  { key: 'number', label: '1 número' },
  { key: 'special', label: '1 caractere especial' },
  { key: 'noInvalidChars', label: 'Caracteres válidos' },
];

export function sanitizeEmail(value) { return String(value || '').trim().toLowerCase(); }
export function sanitizeCode(value) { return String(value || '').replace(/\D/g, '').slice(0, OTP_LENGTH); }

export function useForgotPassword() {
  const authStore = useAuthStore();
  const forgotPassword = computed(() => authStore.forgotPassword);

  const codeStepValidated = ref(false);
  const codeValidationMessage = ref('');
  const otpInputRefs = ref(Array(OTP_LENGTH).fill(null));

  const otpDigits = computed(() => {
    const code = String(forgotPassword.value.code || '').slice(0, OTP_LENGTH);
    const digits = code.split('');
    while (digits.length < OTP_LENGTH) digits.push('');
    return digits;
  });

  const isOtpComplete = computed(() => String(forgotPassword.value.code || '').length === OTP_LENGTH);
  const isCodeValidated = computed(() => codeStepValidated.value && isOtpComplete.value);

  const currentVisualStep = computed(() => {
    if (forgotPassword.value.step === 1) return 1;
    if (!isCodeValidated.value) return 2;
    return 3;
  });

  const stepSubtitle = computed(() => ({
    1: 'Passo 1 de 3 — Informe o e-mail',
    2: 'Passo 2 de 3 — Valide o código',
    3: 'Passo 3 de 3 — Crie a nova senha',
  })[currentVisualStep.value] ?? '');

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
    const c = passwordChecks.value;
    return [c.minLength, c.uppercase, c.lowercase, c.number, c.special].filter(Boolean).length;
  });

  function passwordStrengthColor(n) {
    const score = passwordStrengthScore.value;
    if (score === 0) return 'bg-surface-sunken';
    const colors = ['bg-red-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-500'];
    const level = Math.ceil((score / 5) * 4);
    return n <= level ? colors[level - 1] : 'bg-surface-sunken';
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

  function resetUiState() {
    codeStepValidated.value = false;
    codeValidationMessage.value = '';
    otpInputRefs.value = Array(OTP_LENGTH).fill(null);
  }

  function open(email = '') {
    authStore.openForgotPasswordModal(sanitizeEmail(email));
    resetUiState();
  }

  function close() {
    authStore.closeForgotPasswordModal();
    resetUiState();
  }

  function back() {
    authStore.backForgotPasswordStep();
    resetUiState();
    setForgotField('password', '');
    setForgotField('confirmPassword', '');
    setForgotCode('');
  }

  async function requestReset() {
    try {
      await authStore.requestForgotPassword();
      syncOtpFromStore();
      nextTick(() => focusOtpInput(0));
    } catch { /* handled by store */ }
  }

  async function confirmReset() {
    if (!canSubmitReset.value) return null;
    try {
      const result = await authStore.confirmForgotPassword();
      // Após sucesso: limpa tudo (não preserva senha antiga)
      authStore.resetForgotPasswordModal();
      resetUiState();
      return result;
    } catch { return null; }
  }

  watch(() => forgotPassword.value.open, (isOpen) => { if (!isOpen) resetUiState(); });

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

  return {
    // state
    forgotPassword,
    otpDigits,
    isOtpComplete,
    isCodeValidated,
    currentVisualStep,
    stepSubtitle,
    passwordChecks,
    passwordStrengthScore,
    canSubmitReset,
    codeValidationMessage,
    // actions
    open, close, back,
    requestReset, confirmReset,
    setForgotField, setForgotCode,
    setOtpInputRef, handleOtpInput, handleOtpKeydown, handleOtpPaste,
    validateCodeStep,
    passwordStrengthColor,
    passwordCheckList,
  };
}
