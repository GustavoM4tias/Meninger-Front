<script setup>
/**
 * ChipListField — campo de lista de ids do CV (séries, situações de reserva).
 * ─────────────────────────────────────────────────────────────────────────────
 * Estava escrito à mão em três lugares da aba Configurações, com a mesma
 * lógica repetida em cada um (`addSerieId`, `addSituacaoMorta`, `addSerie`:
 * mesmo "ignora vazio, ignora repetido, limpa o campo"), e três marcações
 * ligeiramente diferentes.
 *
 * Solto na grade ao lado dos <Input>, o conjunto campo + botão + selos + nota
 * não tinha moldura nenhuma e não se lia como UM campo - era o "inputs
 * soltos". Aqui a parte editável mora numa caixa com borda, que faz o papel
 * que a borda do input faz nos vizinhos.
 *
 *   <ChipListField v-model="form.idserie_ra" label="IDs de série CV (entrada)"
 *     hint="..." empty-text="Nenhuma série configurada" remove-label="Remover série" />
 */
import { ref } from 'vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import ChipId from './ChipId.vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: { type: String, required: true },
  hint: { type: String, default: '' },
  placeholder: { type: String, default: 'Ex.: 21' },
  emptyText: { type: String, default: 'Nenhum id configurado' },
  removeLabel: { type: String, default: 'Remover' },
});
const emit = defineEmits(['update:modelValue']);

const novo = ref(null);

function adicionar() {
  const id = Number(novo.value);
  /* Vazio, zero, negativo e repetido não entram - a checagem que os três
     lugares faziam, cada um com uma variação. */
  if (!Number.isFinite(id) || id <= 0) return;
  if (!props.modelValue.includes(id)) emit('update:modelValue', [...props.modelValue, id]);
  novo.value = null;
}

function remover(id) {
  emit('update:modelValue', props.modelValue.filter((x) => x !== id));
}
</script>

<template>
  <div class="min-w-0">
    <label class="block text-xs font-medium text-ink-muted mb-1.5">{{ label }}</label>

    <div class="rounded-lg border border-line bg-surface-sunken/40 p-2.5 space-y-2">
      <div class="flex gap-2">
        <Input v-model.number="novo" type="number" :placeholder="placeholder"
          @keydown.enter.prevent="adicionar" />
        <Button variant="primary" size="sm" icon="fas fa-plus" class="shrink-0" @click="adicionar">
          Adicionar
        </Button>
      </div>

      <div class="flex flex-wrap items-center gap-1">
        <ChipId v-for="id in modelValue" :key="id" :id="id"
          removable :remove-label="removeLabel" @remove="remover(id)" />
        <span v-if="!modelValue.length" class="text-xs text-ink-subtle italic">
          {{ emptyText }}
        </span>
      </div>
    </div>

    <!-- `text-ink-subtle` e `mt-1.5`: é o mesmo `hint` do Input ao lado. -->
    <p v-if="hint" class="mt-1.5 text-xs text-ink-subtle leading-relaxed">{{ hint }}</p>
  </div>
</template>
