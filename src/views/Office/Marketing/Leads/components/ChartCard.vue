<script setup>
import ChartActions from '@/components/config/ChartActions.vue';

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  accent: { type: String, default: 'from-indigo-500 to-violet-500' }, // gradient classes
  badge: { type: String, default: '' },         // ex: "8 status"
  badgeColor: { type: String, default: 'indigo' },
  filename: { type: String, default: '' },
  height: { type: String, default: '300px' },
});
</script>

<template>
  <div class="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex flex-col">
    <div class="h-0.5 bg-gradient-to-r" :class="accent"></div>

    <div class="px-4 sm:px-5 py-3 sm:py-4 flex items-start sm:items-center justify-between gap-2">
      <div class="min-w-0">
        <p class="text-sm font-semibold text-slate-200 truncate">{{ title }}</p>
        <p v-if="subtitle" class="text-xs text-slate-500 mt-0.5 truncate">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span v-if="badge"
          class="hidden sm:inline-flex text-[10px] font-mono px-2 py-1 rounded-md text-slate-300 bg-slate-800 border border-slate-700">
          {{ badge }}
        </span>
        <div class="[&_button]:border-slate-700 [&_button]:text-slate-500
                    [&_button:hover]:bg-slate-700 [&_button:hover]:text-slate-200
                    [&_button]:transition-colors [&_button]:rounded-md [&_button]:px-2 [&_button]:py-1">
          <ChartActions v-if="filename" :filename="filename" bg="#0F172A" />
        </div>
      </div>
    </div>

    <div :style="{ height }" class="w-full">
      <slot />
    </div>
  </div>
</template>
