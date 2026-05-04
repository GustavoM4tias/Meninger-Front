// Composable: validação de força de senha + checklist visual.
// Usado em forgot-password, alteração de senha, etc.

import { computed } from 'vue';

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REGEX = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*()_\-+=[\]{};:,.?/\\|~`"'<>]/,
  allowed: /^[A-Za-z0-9!@#$%^&*()_\-+=[\]{};:,.?/\\|~`"'<>]+$/,
};

export const passwordCheckList = [
  { key: 'minLength',      label: `${PASSWORD_MIN_LENGTH}+ caracteres` },
  { key: 'uppercase',      label: '1 maiúscula' },
  { key: 'lowercase',      label: '1 minúscula' },
  { key: 'number',         label: '1 número' },
  { key: 'special',        label: '1 especial' },
  { key: 'noInvalidChars', label: 'Apenas chars válidos' },
];

export function usePasswordStrength(passwordRef, confirmRef) {
  const checks = computed(() => {
    const p = String(passwordRef.value || '');
    const c = String(confirmRef?.value || '');
    return {
      minLength:      p.length >= PASSWORD_MIN_LENGTH,
      uppercase:      PASSWORD_REGEX.uppercase.test(p),
      lowercase:      PASSWORD_REGEX.lowercase.test(p),
      number:         PASSWORD_REGEX.number.test(p),
      special:        PASSWORD_REGEX.special.test(p),
      noInvalidChars: p.length > 0 ? PASSWORD_REGEX.allowed.test(p) : true,
      match:          p.length > 0 && c.length > 0 && p === c,
    };
  });

  const score = computed(() => {
    const c = checks.value;
    return [c.minLength, c.uppercase, c.lowercase, c.number, c.special].filter(Boolean).length;
  });

  function strengthBarColor(barIndex) {
    const s = score.value;
    if (s === 0) return 'bg-surface-sunken';
    const colors = ['bg-red-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-500'];
    const level = Math.ceil((s / 5) * 4);
    return barIndex <= level ? colors[level - 1] : 'bg-surface-sunken';
  }

  const isStrong = computed(() => {
    const c = checks.value;
    return c.minLength && c.uppercase && c.lowercase && c.number && c.special && c.noInvalidChars;
  });

  return { checks, score, isStrong, strengthBarColor, passwordCheckList };
}
