<script setup>
import { ref, watch } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  rating: { type: String, default: null },
});

const emit = defineEmits(['confirm', 'close']);

const comment = ref('');

watch(() => props.open, (v) => { if (v) comment.value = ''; });

function confirm() {
  emit('confirm', { comment: comment.value.trim() || null });
  comment.value = '';
}

function close() {
  emit('close');
  comment.value = '';
}

const isUp = () => props.rating === 'up';
</script>

<template>
  <Modal :open="open" size="sm" @close="close">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 grid place-items-center rounded-xl"
          :class="isUp()
            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-500 border border-red-500/20'">
          <i :class="isUp() ? 'fas fa-thumbs-up' : 'fas fa-thumbs-down'"></i>
        </div>
        <div>
          <h2 class="text-base font-semibold text-ink">
            {{ isUp() ? 'O que foi bom?' : 'O que pode melhorar?' }}
          </h2>
          <p class="text-xs text-ink-muted mt-0.5">Opcional — ajuda a melhorar o Eme</p>
        </div>
      </div>
    </template>

    <textarea v-model="comment" rows="4" placeholder="Escreva um comentário..."
      class="w-full bg-surface-raised border border-line rounded-lg px-3.5 py-2.5
             text-sm text-ink placeholder:text-ink-subtle outline-none resize-none
             transition focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20" />

    <template #footer>
      <Button variant="ghost" @click="close">Cancelar</Button>
      <Button :variant="isUp() ? 'primary' : 'danger'" @click="confirm" icon="fas fa-paper-plane">
        Enviar
      </Button>
    </template>
  </Modal>
</template>
