<script setup>
/**
 * Campo de SEGREDO (senha, URL com senha dentro).
 *
 * O valor nunca chega ao navegador - o servidor manda só um selo dizendo se
 * existe e de onde vem. Por isso o campo tem três estados, e não um:
 *
 *   configurado nesta tela  → mostra o selo, com "Trocar" e "Apagar"
 *   vindo do ambiente       → mostra que ainda depende do painel da nuvem
 *   em branco               → pede o valor
 *
 * `modelValue` sai vazio quando nada foi digitado (o servidor então MANTÉM o
 * que está lá) ou com a sentinela '__CLEAR__' quando a pessoa apaga, que
 * devolve o campo à variável de ambiente.
 */
import { computed, ref } from 'vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
    modelValue: { type: String, default: '' },
    label: { type: String, required: true },
    hint: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    /* o segredo existe hoje (aqui ou no ambiente) */
    configured: { type: Boolean, default: false },
    /* existe, mas vem da variável de ambiente - ainda depende de deploy */
    fromEnv: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);

const CLEAR = '__CLEAR__';

const editando = ref(false);

const apagado = computed(() => props.modelValue === CLEAR);

const selo = computed(() => {
    if (apagado.value) return { texto: 'Será apagado ao salvar', classe: 'text-data-warn' };
    if (!props.configured) return { texto: 'Não configurado', classe: 'text-ink-subtle' };
    if (props.fromEnv) return { texto: 'Configurado na variável de ambiente', classe: 'text-ink-muted' };
    return { texto: 'Configurado aqui', classe: 'text-data-pos' };
});

function trocar() {
    editando.value = true;
    emit('update:modelValue', '');
}

function cancelar() {
    editando.value = false;
    emit('update:modelValue', '');
}

function apagar() {
    editando.value = false;
    emit('update:modelValue', CLEAR);
}

function desfazerApagar() {
    emit('update:modelValue', '');
}
</script>

<template>
  <div class="w-full">
    <!-- Sem valor gravado, ou trocando: o campo comum. -->
    <div v-if="editando || !configured">
      <Input
        :model-value="modelValue === CLEAR ? '' : modelValue"
        type="password"
        autocomplete="new-password"
        :label="label"
        :hint="hint"
        :placeholder="placeholder"
        @update:model-value="emit('update:modelValue', $event)" />
      <button v-if="configured" type="button"
        class="mt-1 text-xs text-ink-muted hover:text-ink focus-ring rounded px-1 -mx-1 min-h-10"
        @click="cancelar">
        Manter o valor atual
      </button>
    </div>

    <!-- Já configurado: nunca mostramos o valor, só o que dá para fazer com ele. -->
    <div v-else>
      <p class="text-xs font-medium text-ink-muted mb-1.5">{{ label }}</p>
      <div class="flex items-center gap-2 flex-wrap rounded-lg border border-line bg-surface-sunken px-3 py-2 min-h-10">
        <i class="fas fa-key text-xs text-ink-subtle"></i>
        <span class="font-mono text-xs text-ink-subtle tracking-widest">••••••••</span>
        <span class="text-xs" :class="selo.classe">{{ selo.texto }}</span>

        <span class="flex-1"></span>

        <template v-if="apagado">
          <Button variant="ghost" size="sm" icon="fas fa-rotate-left" @click="desfazerApagar">
            Desfazer
          </Button>
        </template>
        <template v-else>
          <Button variant="ghost" size="sm" icon="fas fa-pen" @click="trocar">Trocar</Button>
          <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="apagar">Apagar</Button>
        </template>
      </div>
      <p v-if="hint" class="text-xs text-ink-subtle mt-1">{{ hint }}</p>
    </div>
  </div>
</template>
