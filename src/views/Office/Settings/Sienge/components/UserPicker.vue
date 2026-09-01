<script setup>
/**
 * "Quem recebe o aviso": lista de pessoas escolhidas por id.
 *
 * Existe porque a tela Sienge tem DUAS listas de destinatário (a da carga do
 * espelho e a do vigia do ERP) e elas eram escritas duas vezes, cada uma com um
 * alvo de toque diferente. Aqui o chip e o seletor têm 40px, como manda o
 * padrão móvel.
 */
import { computed } from 'vue';
import Select from '@/components/UI/Select.vue';

const props = defineProps({
    modelValue: { type: Array, default: () => [] },
    /* [{ id, username, email }] */
    users: { type: Array, default: () => [] },
    label: { type: String, default: 'Quem recebe' },
    /* o que acontece quando ninguém é escolhido */
    emptyText: { type: String, default: 'Ninguém escolhido.' },
});

const emit = defineEmits(['update:modelValue']);

const nome = (id) => {
    const u = props.users.find(x => Number(x.id) === Number(id));
    return u?.username || u?.email || `#${id}`;
};

const disponiveis = computed(() => props.users
    .filter(u => !props.modelValue.map(Number).includes(Number(u.id)))
    .map(u => ({ value: String(u.id), label: u.username || u.email })));

function adicionar(valor) {
    const id = Number(valor);
    if (!id || props.modelValue.map(Number).includes(id)) return;
    emit('update:modelValue', [...props.modelValue, id]);
}

function remover(id) {
    emit('update:modelValue', props.modelValue.filter(x => Number(x) !== Number(id)));
}
</script>

<template>
  <div>
    <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5">{{ label }}</p>

    <p v-if="!modelValue.length" class="text-xs text-ink-muted">{{ emptyText }}</p>

    <div v-else class="flex flex-wrap gap-1.5 mb-2">
      <span v-for="id in modelValue" :key="id"
        class="inline-flex items-center gap-1.5 pl-3 pr-1.5 h-10 rounded-full
               bg-accent-soft text-accent border border-accent/20 text-xs">
        {{ nome(id) }}
        <button type="button" :aria-label="`Remover ${nome(id)}`"
          class="h-7 w-7 grid place-items-center rounded-full hover:bg-accent/10 focus-ring"
          @click="remover(id)">
          <i class="fas fa-times text-micro"></i>
        </button>
      </span>
    </div>

    <Select model-value="" :options="disponiveis" placeholder="Adicionar pessoa..."
      class="sm:max-w-xs mt-2" @change="adicionar" />
  </div>
</template>
