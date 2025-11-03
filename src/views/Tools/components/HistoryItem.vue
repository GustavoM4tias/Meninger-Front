<template>
  <div class="bg-white dark:bg-gray-700 p-3 rounded-xl shadow hover:shadow-lg hover:shadow-black/20 hover:scale-[101%] transition-all cursor-pointer"
    @click="emit('open', item)">
    <div class="flex flex-col justify-between gap-1">
      <div class="text-xs text-gray-400 dark:text-gray-300 flex justify-between">
        <span class="text-xs font-bold px-2 py-1 rounded-full" :class="statusBadge(item.status)">
          {{ item.status }}
        </span>
        <span>{{ new Date(item.createdAt).toLocaleDateString() }}</span>
      </div>
      <h3 class="text-lg font-bold text-gray-800 dark:text-white leading-tight">
        {{ item.cliente }}
      </h3>
      <p class="text-sm text-gray-500 dark:text-gray-300 truncate">
        {{ item.empreendimento }}
      </p>
      <span class="text-sm text-gray-400 -mb-1.5">{{ item.model }}</span>
      <span>{{ item.tokens_used }} tokens</span>

    </div>

  </div>
</template>

<script setup>
const props = defineProps({ item: Object });
const emit = defineEmits(['open']);

const statusBadge = (status) => {
  switch (status) {
    case 'APROVADO':
      return 'bg-green-100 text-green-800';
    case 'REPROVADO':
      return 'bg-red-100 text-red-800';
    case 'ERRO':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};
</script>

