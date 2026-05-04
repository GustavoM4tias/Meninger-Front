<script setup>
import { ref, nextTick } from 'vue';

const props = defineProps({
  title: { type: String, default: '' },
});

const emit = defineEmits(['rename']);

const editing = ref(false);
const draft = ref('');
const inputRef = ref(null);

function start() {
  draft.value = props.title;
  editing.value = true;
  nextTick(() => inputRef.value?.select());
}

async function save() {
  editing.value = false;
  const trimmed = draft.value.trim();
  if (trimmed && trimmed !== props.title) emit('rename', trimmed);
}

function onKeydown(e) {
  if (e.key === 'Enter') { e.preventDefault(); save(); }
  if (e.key === 'Escape') { editing.value = false; }
}
</script>

<template>
  <div>
    <input v-if="editing" ref="inputRef" v-model="draft"
      @blur="save" @keydown="onKeydown"
      class="text-sm text-ink bg-transparent border-b border-accent outline-none px-1 py-0.5 w-48"
      placeholder="Nome do chat..." maxlength="80" />

    <button v-else @click="start"
      class="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg
             hover:bg-surface-sunken transition-colors max-w-xs"
      title="Renomear chat">
      <span class="text-sm text-ink-muted group-hover:text-ink truncate max-w-[12rem]">
        {{ title || 'Chat sem título' }}
      </span>
      <i class="fas fa-pen text-[10px] text-ink-subtle group-hover:text-accent transition-colors shrink-0"></i>
    </button>
  </div>
</template>
