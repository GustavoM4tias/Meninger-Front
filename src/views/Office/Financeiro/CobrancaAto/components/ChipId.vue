<script setup>
/**
 * ChipId — o selo de id do CV (série, situação de reserva).
 * ─────────────────────────────────────────────────────────────────────────────
 * Estava escrito à mão em quatro lugares da aba Configurações, com uma classe
 * diferente em cada um: um perdeu o `text-xs` no codemod de cores e ficou 16px,
 * outro ficou sem `gap`, e o botão de remover mudava a altura do selo. Aqui é
 * um só, com número em `tabular-nums` para a fila de selos não dançar.
 *
 *   <ChipId :id="21" />
 *   <ChipId :id="21" removable @remove="removerSerie(21)" />
 */
defineProps({
  id: { type: [String, Number], required: true },
  /* Mostra o x. Só no modo edição: em leitura o selo é informação, não ação. */
  removable: { type: Boolean, default: false },
  /* O que o x faz, para o leitor de tela e para o tooltip. */
  removeLabel: { type: String, default: 'Remover' },
});

defineEmits(['remove']);
</script>

<template>
  <span class="inline-flex items-center gap-1.5 h-6 px-2 rounded-full
               border border-accent/20 bg-accent-soft
               text-xs font-mono tabular-nums text-accent">
    {{ id }}
    <button v-if="removable" type="button"
      :aria-label="`${removeLabel} ${id}`" v-tippy="removeLabel"
      class="grid place-items-center leading-none text-accent/70
             hover:text-data-neg transition-colors duration-120"
      @click="$emit('remove')">
      <i class="fas fa-times text-micro"></i>
    </button>
  </span>
</template>
