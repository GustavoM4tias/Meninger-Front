<script setup>
import { ref } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Fila from './Fila.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
  filas: { type: [Array, Object], default: () => [] },
});

const open = ref(false);
const list = () => Array.isArray(props.filas) ? props.filas : Object.values(props.filas || {});
</script>

<template>
  <!-- Botão integrado (usado na PageHeader actions) -->
  <Button variant="secondary" size="sm" icon="fas fa-people-group" @click="open = true">
    <span class="hidden sm:inline">Filas</span>
    <span v-if="list().length"
      class="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-accent-soft text-accent">
      {{ list().length }}
    </span>
  </Button>

  <Modal :open="open" position="right" size="md" @close="open = false">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-people-group text-sm"></i>
        </div>
        <div>
          <h2 class="text-base font-semibold text-ink">Filas de distribuição</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="font-mono">{{ list().length }}</span> fila(s) configurada(s)
          </p>
        </div>
      </div>
    </template>

    <div v-if="list().length" class="space-y-2">
      <Fila v-for="fila in list()" :key="fila.idfila_distribuicao_leads" :fila="fila" />
    </div>

    <div v-else class="text-center py-12 text-ink-subtle">
      <i class="fas fa-inbox text-2xl mb-2 block"></i>
      <p class="text-sm">Nenhuma fila configurada</p>
    </div>
  </Modal>
</template>
