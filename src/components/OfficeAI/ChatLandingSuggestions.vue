<script setup>
defineProps({
  suggestions: { type: Array, default: () => [] },
});
defineEmits(['select']);
</script>

<template>
  <div v-if="suggestions.length" class="w-full">
    <p class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle mb-3">
      <i class="fas fa-wand-magic-sparkles text-accent/70"></i>
      Sugestões para começar
    </p>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
      <button
        v-for="(item, idx) in suggestions" :key="item.label"
        @click="$emit('select', item.prompt)"
        class="group flex items-start gap-3 text-left p-3.5 rounded-xl
               bg-surface-raised border border-line
               animate-slide-up [animation-fill-mode:backwards]
               hover:border-accent/60 hover:bg-accent-soft/40 hover:-translate-y-1
               hover:ring-2 hover:ring-accent-ring/25 hover:shadow-glow-blue
               focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-ring/30
               transition-all duration-200 ease-out-expo"
        :style="{ animationDelay: `${idx * 70}ms` }"
      >
        <span class="shrink-0 h-9 w-9 grid place-items-center rounded-xl
                     bg-accent-soft border border-accent/20 text-accent
                     group-hover:bg-accent group-hover:text-white transition-colors">
          <i :class="item.icon" class="text-sm"></i>
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium text-ink truncate group-hover:text-accent transition-colors">
            {{ item.label }}
          </span>
          <span v-if="item.sublabel" class="block text-xs text-ink-muted truncate mt-0.5">
            {{ item.sublabel }}
          </span>
        </span>
      </button>
    </div>
  </div>
</template>
