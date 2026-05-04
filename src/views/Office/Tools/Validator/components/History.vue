<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAIStore } from '@/stores/Config/aiStore.js';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import HistoryItem from './HistoryItem.vue';
import HistoryDetailModal from './HistoryModal.vue';

const aiStore = useAIStore();

const open = ref(false);
const showDetail = ref(false);
const selectedItem = ref(null);

const total = computed(() => aiStore.validatorHistory?.length ?? 0);
const aprovados = computed(() => (aiStore.validatorHistory || []).filter(v => v.status === 'APROVADO').length);
const reprovados = computed(() => (aiStore.validatorHistory || []).filter(v => v.status === 'REPROVADO').length);

function openDetail(item) { selectedItem.value = item; showDetail.value = true; }

onMounted(() => aiStore.fetchValidatorHistory());
</script>

<template>
  <!-- Botão integrado (usado em PageHeader actions) -->
  <Button variant="secondary" size="sm" icon="fas fa-clock-rotate-left" @click="open = true">
    <span class="hidden sm:inline">Histórico</span>
    <span v-if="total"
      class="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-accent-soft text-accent">
      {{ total }}
    </span>
  </Button>

  <Modal :open="open" position="right" size="md" @close="open = false">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-clock-rotate-left text-sm"></i>
        </div>
        <div>
          <h2 class="text-base font-semibold text-ink">Histórico de validações</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="text-emerald-600 dark:text-emerald-400">{{ aprovados }}</span> aprovado(s) ·
            <span class="text-red-600 dark:text-red-400">{{ reprovados }}</span> reprovado(s) ·
            <span class="font-mono">{{ total }}</span> total
          </p>
        </div>
      </div>
    </template>

    <div v-if="aiStore.validatorHistory?.length" class="space-y-2">
      <HistoryItem v-for="item in aiStore.validatorHistory" :key="item.id"
        :item="item" @open="openDetail" />
    </div>

    <EmptyState v-else size="md" icon="far fa-folder-open"
      title="Nenhuma validação ainda"
      description="As validações aparecerão aqui após o primeiro uso." />
  </Modal>

  <HistoryDetailModal v-if="selectedItem" :show="showDetail" :item="selectedItem"
    @close="showDetail = false" />
</template>
