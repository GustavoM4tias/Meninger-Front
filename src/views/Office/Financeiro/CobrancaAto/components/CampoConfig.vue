<script setup>
/**
 * CampoConfig — o par rótulo/valor do modo LEITURA de um cartão de configuração.
 * ─────────────────────────────────────────────────────────────────────────────
 * O rótulo é o `labelBase` do design system (12px sans), o mesmo do Input e do
 * Select. NÃO é o `metric-label` (11px mono caixa alta): esse é rótulo de
 * MÉTRICA e de COLUNA de tabela, e usá-lo aqui colocava dois sistemas de
 * rótulo na mesma grade, com tamanhos e caixas diferentes.
 *
 * Leitura e edição são blocos deliberadamente distintos: em leitura os campos
 * moram dentro de uma caixa com borda (`.campos-leitura` nos cartões), que faz
 * o papel que a borda do input faz no formulário. Por isso aqui não se reserva
 * mais a altura de um Input - era o que deixava o modo leitura alto e vazio.
 *
 *   <CampoConfig label="Tolerância" value="1 dia útil" note="Prazo antes de baixar." />
 *   <CampoConfig label="Séries"><ChipId v-for="..." /></CampoConfig>
 */
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '' },
  /* Mesma função do `hint` do Input: explica o campo sem virar parágrafo. */
  note: { type: String, default: '' },
  /* Número, id, hora e dinheiro em mono tabular para a coluna não dançar.
     Texto corrido em sans, igual ao que o Input mostraria. */
  mono: { type: Boolean, default: false },
});
</script>

<template>
  <div class="min-w-0">
    <p class="block text-xs font-medium text-ink-muted mb-1">{{ label }}</p>

    <div class="flex items-center flex-wrap gap-1 text-sm font-medium text-ink break-words"
      :class="mono ? 'font-mono tabular-nums' : ''">
      <slot>{{ value === '' || value === null || value === undefined ? '-' : value }}</slot>
    </div>

    <p v-if="note || $slots.note" class="mt-1 text-xs text-ink-subtle leading-relaxed">
      <slot name="note">{{ note }}</slot>
    </p>
  </div>
</template>
