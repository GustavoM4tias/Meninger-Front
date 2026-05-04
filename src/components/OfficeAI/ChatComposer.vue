<script setup>
import { ref, nextTick, computed } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Pergunte ao Eme...' },
  size: { type: String, default: 'md' },        // md | lg (lg = landing, md = chat)
  isStreaming: { type: Boolean, default: false },
  showHistoryButton: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'send', 'history']);

const textareaEl = ref(null);

function autoResize() {
  const el = textareaEl.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 180) + 'px';
}

function onInput(e) {
  emit('update:modelValue', e.target.value);
  autoResize();
}

function send() {
  const text = props.modelValue.trim();
  if (!text || props.disabled || props.isStreaming) return;
  emit('send', text);
  emit('update:modelValue', '');
  nextTick(() => { if (textareaEl.value) textareaEl.value.style.height = 'auto'; });
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
}

const padding = computed(() => props.size === 'lg' ? 'px-5 pt-4 pb-2' : 'px-5 pt-3.5 pb-2');
const buttonSize = computed(() => props.size === 'lg' ? 'w-9 h-9' : 'w-8 h-8');

defineExpose({ focus: () => textareaEl.value?.focus() });
</script>

<template>
  <div class="relative bg-surface-raised border border-line rounded-2xl
              shadow-soft hover:shadow-elevated focus-within:border-accent/40
              focus-within:shadow-glow-accent transition-all duration-200">
    <textarea
      ref="textareaEl"
      :value="modelValue"
      @input="onInput"
      @keydown="onKeydown"
      :placeholder="placeholder"
      :disabled="disabled"
      rows="1"
      :class="[
        'w-full bg-transparent outline-none border-none resize-none leading-relaxed',
        'text-ink placeholder:text-ink-subtle disabled:opacity-40',
        size === 'lg' ? 'text-base' : 'text-sm',
        padding
      ]"
      style="max-height: 180px;"
    />
    <div class="flex items-center justify-between px-3 pb-2 pt-1">
      <button v-if="showHistoryButton" type="button" @click="$emit('history')"
        class="flex items-center gap-1.5 text-xs text-ink-subtle hover:text-accent
               hover:bg-accent-soft px-2.5 py-1.5 rounded-lg transition-colors">
        <i class="fas fa-clock-rotate-left"></i>
        Histórico
      </button>
      <span v-else></span>

      <button type="button" @click="send"
        :disabled="!modelValue.trim() || disabled || isStreaming"
        :class="[
          buttonSize,
          'rounded-full grid place-items-center transition-all duration-150',
          modelValue.trim() && !isStreaming
            ? 'bg-accent text-white hover:bg-accent-hover hover:scale-105 shadow-soft'
            : 'bg-surface-sunken text-ink-subtle cursor-not-allowed'
        ]">
        <i :class="['fas fa-arrow-up', size === 'lg' ? 'text-sm' : 'text-xs']"></i>
      </button>
    </div>
  </div>
</template>
