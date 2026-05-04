<script setup>
const props = defineProps({
  title: { type: String, required: true },
  class: { type: String, default: '' },
  icon: { type: String, required: true },
  value: { type: [String, Number], required: true },
  label: { type: String, required: true },
  trend: { type: String, default: '' },        // ex: '+12%'
  trendUp: { type: Boolean, default: true },
});
</script>

<template>
  <div
    class="group flex flex-col gap-1 w-full p-4
           bg-surface-raised border border-line rounded-xl
           shadow-soft hover:shadow-elevated
           hover:-translate-y-0.5 hover:border-accent/30
           transition-all duration-200 ease-out-expo
           surface-gradient"
    :class="props.class"
  >
    <div class="flex items-center justify-between gap-2 min-w-0">
      <h3 v-tippy="props.title"
          class="truncate text-sm font-medium text-ink-muted">
        {{ props.title }}
      </h3>
      <i :class="icon" class="text-ink-subtle group-hover:text-accent transition-colors"></i>
    </div>

    <h1 class="text-2xl lg:text-3xl font-semibold text-ink truncate tracking-tight">
      {{ props.value }}
    </h1>

    <div class="flex items-center justify-between gap-2 mt-auto">
      <span class="text-xs text-ink-subtle truncate">{{ props.label }}</span>
      <span v-if="trend"
            class="text-[11px] font-mono px-1.5 py-0.5 rounded-md"
            :class="trendUp
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 text-red-600 dark:text-red-400'">
        {{ trend }}
      </span>
    </div>
  </div>
</template>
