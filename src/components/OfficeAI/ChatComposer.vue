<script setup>
import { ref, nextTick, computed } from 'vue';
import { useEmeVoice } from '@/composables/useEmeVoice';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';

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

// ── Voz ───────────────────────────────────────────────────────────────────────
const permStore = usePermissionStore();
const voice = useEmeVoice();
const voiceAvailable = computed(() => permStore.isAdmin && voice.isSupported);

const voicePlaceholder = computed(() => ({
  OFF:        '',
  ARMED:      'Diga "Olá Eme"…',
  LISTENING:  voice.interimText.value || 'Te ouvindo…',
  PROCESSING: 'Eme está pensando…',
  SPEAKING:   'Respondendo… (microfone pausado)',
}[voice.state.value] || ''));

const effectivePlaceholder = computed(() =>
  voice.isActive.value ? voicePlaceholder.value : props.placeholder
);

const containerStateClass = computed(() => ({
  OFF:        '',
  ARMED:      'border-blue-500/50 ring-2 ring-blue-500/20',
  LISTENING:  'border-red-500/60 ring-2 ring-red-500/20',
  PROCESSING: 'border-purple-500/60 ring-2 ring-purple-500/20',
  SPEAKING:   'border-amber-500/50 ring-2 ring-amber-500/20',
}[voice.state.value] || ''));

// alwaysOn persistido: true = voz ativa (entre sessões). false = desligada.
// Default false (não ouve sem o user ativar). Pulse amber só aparece se o user
// ativou mas a voz caiu (ex: erro temporário); senão fica como mic cinza normal.
const alwaysOnPersisted = computed(() =>
  localStorage.getItem('eme:voice:always-on') === 'true'
);

const micIconClass = computed(() => {
  if (voice.state.value === 'OFF' && alwaysOnPersisted.value) {
    return 'fas fa-microphone text-amber-500 animate-pulse';  // user ativou mas voz caiu
  }
  return ({
    OFF:        'fas fa-microphone text-ink-subtle',
    ARMED:      'fas fa-microphone text-blue-500',
    LISTENING:  'fas fa-waveform-lines text-red-500 animate-pulse',
    PROCESSING: 'fas fa-circle-notch fa-spin text-purple-500',
    SPEAKING:   'fas fa-volume-high text-amber-500',
  }[voice.state.value]);
});

const micTitle = computed(() => {
  const base = voice.statusLabel.value;
  if (voice.state.value === 'OFF') return `${base} · Clique para ATIVAR voz (fica ligada até desativar)`;
  return `${base} · Clique para DESATIVAR voz`;
});

function onMicClick() {
  if (!voiceAvailable.value) return;
  if (voice.state.value === 'OFF') {
    voice.wakeUp();           // ativa + persiste alwaysOn=true
  } else {
    voice.sleepUntilWoken();  // desativa + persiste alwaysOn=false
  }
}

// ── Comportamento original ────────────────────────────────────────────────────
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
  <div :class="[
        'relative bg-surface-raised border border-line rounded-2xl',
        'shadow-soft hover:shadow-elevated focus-within:border-accent/40',
        'focus-within:shadow-glow-accent transition-all duration-200',
        containerStateClass,
      ]">
    <textarea
      ref="textareaEl"
      :value="modelValue"
      @input="onInput"
      @keydown="onKeydown"
      :placeholder="effectivePlaceholder"
      :disabled="disabled"
      rows="1"
      :class="[
        'w-full bg-transparent outline-none border-none resize-none leading-relaxed',
        'text-ink placeholder:text-ink-subtle disabled:opacity-40',
        voice.state.value === 'LISTENING' ? 'placeholder:text-ink placeholder:italic' : '',
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

      <div class="flex items-center gap-1.5">
        <button v-if="voiceAvailable" type="button" @click="onMicClick"
          :title="micTitle"
          :class="[
            buttonSize,
            'rounded-full grid place-items-center transition-all duration-150',
            'bg-surface-sunken hover:bg-accent-soft border border-line',
            voice.isActive.value ? 'ring-2 ring-offset-1 ring-offset-surface' : '',
            voice.state.value === 'LISTENING' ? 'ring-red-500/40' : '',
            voice.state.value === 'ARMED' ? 'ring-blue-500/40' : '',
            voice.state.value === 'PROCESSING' ? 'ring-purple-500/40' : '',
            voice.state.value === 'SPEAKING' ? 'ring-amber-500/40' : '',
          ]">
          <i :class="[micIconClass, size === 'lg' ? 'text-sm' : 'text-xs']"></i>
        </button>

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
  </div>
</template>
