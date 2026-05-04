<script setup>
import { computed, watch, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  size: { type: String, default: 'md' },           // sm | md | lg | xl | full
  position: { type: String, default: 'center' },   // center | right | left
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  closeOnBackdrop: { type: Boolean, default: true },
  hideClose: { type: Boolean, default: false },
  scrollable: { type: Boolean, default: true },
});

const emit = defineEmits(['close', 'update:open']);

const sizeMapCenter = {
  sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl',
  full: 'max-w-[min(96vw,1400px)]',
};
const sizeMapDrawer = {
  sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-xl', xl: 'max-w-2xl',
  full: 'max-w-[min(96vw,900px)]',
};

const isDrawer = computed(() => props.position === 'right' || props.position === 'left');

const sizeClass = computed(() =>
  (isDrawer.value ? sizeMapDrawer : sizeMapCenter)[props.size] || sizeMapCenter.md
);

const wrapperClass = computed(() => {
  if (props.position === 'right') return 'justify-end items-stretch p-0';
  if (props.position === 'left')  return 'justify-start items-stretch p-0';
  return 'items-center justify-center p-3 sm:p-6';
});

const panelClass = computed(() => {
  if (props.position === 'right') {
    return 'h-screen rounded-none sm:rounded-l-2xl border-l shadow-overlay';
  }
  if (props.position === 'left') {
    return 'h-screen rounded-none sm:rounded-r-2xl border-r shadow-overlay';
  }
  return 'rounded-2xl border shadow-overlay max-h-[92vh]';
});

const enterFromClass = computed(() => {
  if (props.position === 'right') return 'opacity-0 translate-x-8';
  if (props.position === 'left')  return 'opacity-0 -translate-x-8';
  return 'opacity-0 scale-95 translate-y-4';
});
const leaveToClass = computed(() => {
  if (props.position === 'right') return 'opacity-0 translate-x-8';
  if (props.position === 'left')  return 'opacity-0 -translate-x-8';
  return 'opacity-0 scale-95';
});

function close() {
  emit('close');
  emit('update:open', false);
}

// Como o painel tem @mousedown.stop, qualquer mousedown que chega aqui veio
// do wrapper OU do backdrop (filho visual). Em ambos os casos: fechar.
function onBackdrop() {
  if (props.closeOnBackdrop) close();
}

function onKey(e) {
  if (e.key === 'Escape' && props.open) close();
}

function applyOpen(v) {
  if (typeof window === 'undefined') return;
  if (v) {
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
  } else {
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
  }
}

onMounted(() => applyOpen(props.open));
watch(() => props.open, applyOpen);

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<template>
  <teleport to="body">
    <transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        :class="['fixed inset-0 z-[9999] flex', wrapperClass]"
        @mousedown="onBackdrop"
      >
        <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"></div>

        <transition
          appear
          enter-active-class="transition-all duration-300 ease-out-expo"
          :enter-from-class="enterFromClass"
          enter-to-class="opacity-100 scale-100 translate-y-0 translate-x-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0 translate-x-0"
          :leave-to-class="leaveToClass"
        >
        <div
          :class="[
            'relative w-full bg-surface-raised border-line surface-gradient',
            'flex flex-col overflow-hidden',
            sizeClass, panelClass,
          ]"
          @mousedown.stop
        >
          <!-- Header -->
          <div v-if="$slots.header || title || !hideClose"
               class="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-line shrink-0">
            <div class="flex-1 min-w-0">
              <slot name="header">
                <h2 v-if="title" class="text-base font-semibold text-ink truncate">{{ title }}</h2>
                <p v-if="subtitle" class="text-xs text-ink-muted mt-0.5">{{ subtitle }}</p>
              </slot>
            </div>
            <button v-if="!hideClose" type="button" @click="close"
              class="h-8 w-8 grid place-items-center rounded-lg text-ink-muted
                     hover:bg-surface-sunken hover:text-ink transition-colors shrink-0"
              aria-label="Fechar">
              <i class="fas fa-xmark text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div :class="['flex-1 min-h-0', scrollable ? 'overflow-y-auto' : 'overflow-hidden', 'p-4 sm:p-5']">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer"
               class="flex flex-wrap items-center justify-end gap-2 px-4 sm:px-5 py-3 sm:py-4 border-t border-line bg-surface shrink-0">
            <slot name="footer" />
          </div>
        </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>
