<script setup>
/**
 * CampoConfig — o par rótulo/valor do modo LEITURA de um cartão de configuração.
 * ─────────────────────────────────────────────────────────────────────────────
 * Existe por um motivo só: em modo leitura o campo tem que ocupar a MESMA
 * caixa que o <Input> ocupa em modo edição. Senão a grade se remonta a cada
 * clique em "Editar" e as colunas dançam.
 *
 * Por isso o rótulo daqui é o `labelBase` do design system — o mesmo do Input e
 * do Select, 12px sans, `mb-1.5` — e NÃO o `metric-label` (11px mono caixa
 * alta). O `metric-label` é rótulo de MÉTRICA e de COLUNA de tabela; usá-lo
 * como rótulo de formulário colocava dois sistemas de rótulo na mesma linha da
 * grade, com tamanhos, caixas e margens diferentes. Era a origem do
 * "textos gigantes e outros pequenos, desalinhado" da aba.
 *
 * A nota embaixo é o mesmo `hint` do Input: 12px, `mt-1.5`, `text-ink-subtle`.
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
    <p class="block text-xs font-medium text-ink-muted mb-1.5">{{ label }}</p>

    <!-- `min-h-[2.375rem]` = altura do Input md (h-9 + borda). Mantém a linha
         da grade na mesma altura em leitura e em edição. -->
    <div class="min-h-[2.375rem] flex items-center flex-wrap gap-1 text-sm text-ink break-words"
      :class="mono ? 'font-mono tabular-nums' : ''">
      <slot>{{ value === '' || value === null || value === undefined ? '-' : value }}</slot>
    </div>

    <p v-if="note || $slots.note" class="mt-1.5 text-xs text-ink-subtle leading-relaxed">
      <slot name="note">{{ note }}</slot>
    </p>
  </div>
</template>
