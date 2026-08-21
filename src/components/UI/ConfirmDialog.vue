<script setup>
/**
 * ConfirmDialog — a confirmação do Office, uma só.
 * ─────────────────────────────────────────────────────────────────────────────
 * Casca fina sobre `Modal`. Não é primitivo visual novo: é o formato fixo da
 * pergunta "tem certeza?", que estava escrito de três jeitos diferentes só na
 * tela de Alçadas — um modal à mão, dois `confirm()` do navegador.
 *
 * `confirm()` e `alert()` nativos estão proibidos: não seguem o tema, não têm
 * foco visível, não dá para escrever a consequência com ênfase nenhuma e no
 * celular aparecem com a cara do sistema operacional, não do Office.
 *
 * A ordem dos botões é sempre a mesma: cancelar à esquerda, ação à direita.
 * Numa decisão, a saída fica onde o olho passa primeiro.
 *
 *   <ConfirmDialog v-model:open="apagar" tone="danger"
 *     title="Excluir o perfil Padrão - Comercial?"
 *     consequence="5 pessoas perdem as telas do perfil e ficam só com as exceções."
 *     confirm-label="Excluir perfil" :loading="salvando"
 *     @confirm="excluir" />
 *
 * `consequence` é obrigatório de fato, ainda que não pelo código: uma
 * confirmação que não diz o que vai acontecer é um "OK" caro.
 */
import { ref, watch } from 'vue';
import Modal from './Modal.vue';
import Button from './Button.vue';
import Input from './Input.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  /* O que acontece se confirmar, em uma frase de usuário. Com número quando a
     ação atinge mais de uma pessoa - "todo mundo" não é quantidade. */
  consequence: { type: String, default: '' },
  /* Detalhe secundário: o que NÃO acontece, ou como desfazer. */
  hint: { type: String, default: '' },
  tone: { type: String, default: 'danger' },   // danger | accent
  confirmLabel: { type: String, default: 'Confirmar' },
  cancelLabel: { type: String, default: 'Cancelar' },
  loading: { type: Boolean, default: false },
  /* Pede um motivo antes de confirmar (fica registrado). */
  askNote: { type: Boolean, default: false },
  noteLabel: { type: String, default: 'Motivo (opcional)' },
  notePlaceholder: { type: String, default: '' },
});

const emit = defineEmits(['update:open', 'confirm', 'cancel']);

const note = ref('');

/* Motivo não sobrevive de um diálogo para o outro: reaproveitar o texto da
   confirmação anterior é registrar a justificativa errada. */
watch(() => props.open, (v) => { if (v) note.value = ''; });

function cancelar() {
  emit('cancel');
  emit('update:open', false);
}

function confirmar() {
  emit('confirm', props.askNote ? (note.value.trim() || null) : undefined);
}

const TONES = {
  danger: { icon: 'fas fa-triangle-exclamation', box: 'bg-data-neg-soft text-data-neg', botao: 'danger' },
  accent: { icon: 'fas fa-circle-question', box: 'bg-accent-soft text-accent', botao: 'primary' },
};
</script>

<template>
  <Modal :open="open" size="sm" hide-close :close-on-backdrop="!loading"
    @close="cancelar">
    <div class="flex items-start gap-3">
      <span class="h-10 w-10 rounded-xl grid place-items-center shrink-0"
        :class="(TONES[tone] || TONES.danger).box">
        <i :class="(TONES[tone] || TONES.danger).icon"></i>
      </span>
      <div class="min-w-0 flex-1">
        <h2 class="text-sm font-semibold text-ink leading-snug">{{ title }}</h2>
        <p v-if="consequence" class="mt-1.5 text-sm text-ink-muted leading-relaxed">
          {{ consequence }}
        </p>
        <p v-if="hint" class="mt-1.5 text-micro text-ink-subtle leading-relaxed">
          {{ hint }}
        </p>

        <div v-if="askNote" class="mt-3">
          <Input v-model="note" :label="noteLabel" :placeholder="notePlaceholder" />
        </div>

        <!-- Campo que a decisão precisa (ex.: QUAL perfil aplicar no lote).
             Variante do primitivo, não componente novo: a confirmação continua
             sendo a mesma peça, com um campo a mais quando o caso pede. -->
        <div v-if="$slots.default" class="mt-3">
          <slot />
        </div>
      </div>
    </div>

    <template #footer>
      <!-- Cancelar à esquerda, ação à direita: sempre nesta ordem.
           E cancelar NUNCA fica desabilitado: `disabled` no Button vira
           `pointer-events-none`, então o clique morria em silêncio e só o Esc
           fechava - a saída de uma decisão não pode depender do teclado. -->
      <Button variant="ghost" @click="cancelar">{{ cancelLabel }}</Button>
      <Button :variant="(TONES[tone] || TONES.danger).botao" :loading="loading" @click="confirmar">
        {{ confirmLabel }}
      </Button>
    </template>
  </Modal>
</template>
