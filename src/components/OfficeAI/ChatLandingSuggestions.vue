<script setup>
defineProps({
  suggestions: { type: Array, default: () => [] },
});
defineEmits(['select']);
</script>

<template>
  <div class="flex flex-wrap gap-2 justify-center max-w-2xl">
    <button
      v-for="(item, idx) in suggestions" :key="item.label"
      @click="$emit('select', item.prompt)"
      class="group flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm
             text-ink-muted bg-surface-raised border border-line
             hover:bg-accent-soft hover:text-accent hover:border-accent/30
             hover:-translate-y-0.5 transition-all duration-200 ease-out-expo"
      :style="{ animationDelay: `${idx * 50}ms` }"
    >
      <span class="text-base">{{ item.icon }}</span>
      <span class="text-sm">{{ item.label }}</span>
    </button>
  </div>
</template>
