<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: [String, Number], required: true },
  options: { type: Array, required: true }, // [{ value, label, icon?, count? }]
  size: { type: String, default: 'md' },     // sm | md
  block: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'change']);

function select(v) {
  if (v === props.modelValue) return;
  emit('update:modelValue', v);
  emit('change', v);
}

const sizeMap = {
  sm: { btn: 'h-7 px-2.5 text-xs gap-1.5', radius: 'rounded-md' },
  md: { btn: 'h-8 px-3 text-sm gap-2', radius: 'rounded-md' },
};
const sz = computed(() => sizeMap[props.size] || sizeMap.md);
</script>

<template>
  <!-- Container scrollável horizontal: nunca transborda -->
  <div :class="[
    'p-1 bg-surface-sunken border border-line rounded-lg shadow-inner-soft',
    'overflow-x-auto no-scrollbar',
    block ? 'w-full flex' : 'inline-flex max-w-full'
  ]">
    <button v-for="opt in options" :key="opt.value" type="button"
      @click="select(opt.value)"
      :class="[
        'inline-flex items-center justify-center font-medium transition-all duration-200 ease-out-expo whitespace-nowrap shrink-0',
        sz.btn, sz.radius,
        block ? 'flex-1' : '',
        modelValue === opt.value
          ? 'bg-surface text-accent shadow-soft'
          : 'text-ink-muted hover:text-ink',
      ]">
      <i v-if="opt.icon" :class="opt.icon" class="text-[11px]"></i>
      <span>{{ opt.label }}</span>
      <span v-if="opt.count !== undefined"
        class="ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono"
        :class="modelValue === opt.value
          ? 'bg-accent-soft text-accent'
          : 'bg-line/50 text-ink-subtle'">
        {{ opt.count }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
