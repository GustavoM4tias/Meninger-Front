<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';

const props = defineProps({
  align: { type: String, default: 'right' },     // left | right | center
  offset: { type: Number, default: 8 },
  width: { type: String, default: 'auto' },      // auto | full | <tailwind class>
  closeOnClick: { type: Boolean, default: true },
});

const emit = defineEmits(['open', 'close']);

const open = ref(false);
const triggerRef = ref(null);
const panelRef = ref(null);

function toggle() {
  open.value ? close() : show();
}

function show() {
  open.value = true;
  emit('open');
  nextTick(() => document.addEventListener('mousedown', onClickOutside, true));
}

function close() {
  if (!open.value) return;
  open.value = false;
  emit('close');
  document.removeEventListener('mousedown', onClickOutside, true);
}

function onClickOutside(e) {
  if (panelRef.value?.contains(e.target) || triggerRef.value?.contains(e.target)) return;
  close();
}

function onPanelClick(e) {
  if (props.closeOnClick && e.target.closest('[data-dropdown-item]')) close();
}

function onKey(e) { if (e.key === 'Escape') close(); }

onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  document.removeEventListener('mousedown', onClickOutside, true);
});

const alignClass = computed(() => ({
  left: 'left-0 origin-top-left',
  right: 'right-0 origin-top-right',
  center: 'left-1/2 -translate-x-1/2 origin-top',
}[props.align] || 'right-0 origin-top-right'));

defineExpose({ open: show, close, toggle });
</script>

<template>
  <div class="relative inline-block">
    <div ref="triggerRef" @click="toggle">
      <slot name="trigger" :open="open" :toggle="toggle" />
    </div>

    <transition
      enter-active-class="transition ease-out-expo duration-200"
      enter-from-class="opacity-0 scale-95 -translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95 -translate-y-1"
    >
      <div v-if="open" ref="panelRef"
        @click="onPanelClick"
        :class="['absolute z-50 mt-2', alignClass]"
        :style="{ marginTop: `${offset}px` }">
        <slot :close="close" />
      </div>
    </transition>
  </div>
</template>
