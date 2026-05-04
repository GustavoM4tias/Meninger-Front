<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  icon: { type: String, default: '' },
  hint: { type: String, default: '' },          // texto cinza ao lado do título
  defaultOpen: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue']);
const internalOpen = ref(props.defaultOpen ?? props.modelValue ?? false);

watch(() => props.modelValue, (v) => { internalOpen.value = v; });

function toggle() {
  internalOpen.value = !internalOpen.value;
  emit('update:modelValue', internalOpen.value);
}
</script>

<template>
  <div class="rounded-lg border border-line bg-surface-raised overflow-hidden">
    <button type="button" @click="toggle"
      class="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-ink
             hover:bg-surface-sunken transition-colors group"
      :aria-expanded="internalOpen">
      <span class="flex items-center gap-2 min-w-0">
        <i v-if="icon" :class="icon" class="text-xs text-ink-muted group-hover:text-accent transition-colors"></i>
        <span class="truncate">{{ title }}</span>
        <span v-if="hint" class="text-xs font-normal text-ink-subtle truncate">— {{ hint }}</span>
      </span>
      <i class="fas fa-chevron-down text-xs text-ink-subtle transition-transform duration-200"
         :class="{ 'rotate-180': internalOpen }"></i>
    </button>

    <transition
      enter-active-class="transition-all duration-200 ease-out-expo overflow-hidden"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[2000px]"
      leave-active-class="transition-all duration-150 ease-in overflow-hidden"
      leave-from-class="opacity-100 max-h-[2000px]"
      leave-to-class="opacity-0 max-h-0">
      <div v-show="internalOpen" class="px-4 pb-4 pt-3 border-t border-line space-y-3">
        <slot />
      </div>
    </transition>
  </div>
</template>
