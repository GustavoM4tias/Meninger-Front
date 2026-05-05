<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import ChartActions from '@/components/config/ChartActions.vue';

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  accent: { type: String, default: 'from-indigo-500 to-violet-500' }, // gradient classes
  badge: { type: String, default: '' },
  badgeColor: { type: String, default: 'indigo' },
  filename: { type: String, default: '' },
  height: { type: String, default: '300px' },
});

// Bg para export do chart adapta ao tema
const isDark = ref(false);
let observer = null;

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark');
  observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark');
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
});

onUnmounted(() => observer?.disconnect());

const exportBg = computed(() => isDark.value ? '#0F172A' : '#FFFFFF');
</script>

<template>
  <div class="rounded-xl border border-line bg-surface-raised overflow-hidden flex flex-col">
    <div class="h-0.5 bg-gradient-to-r" :class="accent"></div>

    <div class="px-4 sm:px-5 py-3 sm:py-4 flex items-start sm:items-center justify-between gap-2">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-ink truncate">{{ title }}</p>
        <p v-if="subtitle" class="text-xs text-ink-subtle mt-0.5 truncate">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span v-if="badge"
          class="hidden sm:inline-flex text-[10px] font-mono px-2 py-1 rounded-md text-ink-muted bg-surface-sunken border border-line">
          {{ badge }}
        </span>
        <ChartActions v-if="filename" :filename="filename" :bg="exportBg" />
      </div>
    </div>

    <div :style="{ height }" class="w-full">
      <slot />
    </div>
  </div>
</template>
