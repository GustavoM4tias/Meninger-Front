<script setup>
import { ref, onMounted } from 'vue';
import { useAIStore } from '@/stores/Config/aiStore.js';
import AIHistoryItem from './HistoryItem.vue';
import ModalDetalhes from './HistoryModal.vue';

const aiStore = useAIStore();
const showModal = ref(false);
const selectedItem = ref(null);

const openModal = (item) => {
  selectedItem.value = item;
  showModal.value = true;
};

onMounted(() => {
  aiStore.fetchValidatorHistory();
});
</script>

<template>
  <div
    class="group bg-gray-100 dark:bg-gray-800 cursor-pointer shadow absolute right-[-18rem] top-0 transform transition-transform duration-300">
    <div @click="aiStore.fetchValidatorHistory();"
      class="button absolute top-10 -left-10 md:-left-14 text-2xl md:text-3xl bg-gray-100 dark:bg-gray-800 shadow-[-3px_0_5px_rgba(0,0,0,.05)] cursor-pointer rounded-l-lg p-2 md:p-4">
      <i class="fas fa-clock-rotate-left"></i>
    </div>
    <div class="content w-72 max-w-full h-[calc(100vh-3.6rem)] overflow-hidden p-2 gap-2 flex flex-col justify-between">
      <h2 class="text-2xl text-center font-semibold text-gray-800 dark:text-gray-100 p-2">
        Histórico de Validação
      </h2>

      <div class="flex flex-col overflow-auto gap-2 p-1 flex-1">
        <AIHistoryItem v-for="item in aiStore.validatorHistory" :key="item.id" :item="item" @open="openModal" />
        <span class="text-center text-xs">
          Aprovados: {{
            aiStore.validatorHistory.filter(({ status }) => status === 'APROVADO').length
          }} |
          Reprovados: {{
            aiStore.validatorHistory.filter(({ status }) => status === 'REPROVADO').length
          }}
        </span>
        <p class="text-center text-xs">Total de validações: {{ aiStore.validatorHistory.length }}</p>
      </div>
    </div>

    <ModalDetalhes v-if="selectedItem" :show="showModal" :item="selectedItem" @close="showModal = false" />
  </div>
</template>