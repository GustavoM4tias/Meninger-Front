<script setup>
// Card de PROPOSTA de memória (type: 'memory_proposal', da tool
// lembrar_preferencia). A Eme entendeu uma preferência; só vira memória se a
// pessoa clicar em Guardar. Depois de recarregar a conversa, o card sabe que
// já foi guardada porque a memória está na lista da pessoa.
import { ref, computed, onMounted } from 'vue';
import { useOfficeAIStore } from '@/stores/officeAIStore';

const props = defineProps({ action: { type: Object, required: true } });
const aiStore = useOfficeAIStore();

const proposta = computed(() => props.action.proposta || {});
const estado = ref('idle');   // idle | saving | saved | declined | error
const erro = ref('');

const jaGuardada = computed(() =>
  aiStore.memories.some(m => m.key === proposta.value.key && m.value === proposta.value.value && m.enabled));

onMounted(() => { if (!aiStore.memories.length) aiStore.loadMemories().catch(() => {}); });

async function guardar() {
  estado.value = 'saving';
  erro.value = '';
  try {
    await aiStore.addMemory({ key: proposta.value.key, value: proposta.value.value, category: proposta.value.category });
    estado.value = 'saved';
  } catch (e) {
    estado.value = 'error';
    erro.value = e?.message || 'Não consegui guardar.';
  }
}
function abrirConfig() { aiStore.settingsOpen = true; }
</script>

<template>
  <div class="rounded-xl border border-accent/25 bg-accent-soft/40 px-3 py-2.5 text-sm max-w-md">
    <div class="flex items-start gap-2">
      <i class="fas fa-bookmark text-accent mt-0.5 text-xs"></i>
      <div class="min-w-0 flex-1">
        <p class="text-xs text-ink-muted">Guardar esta preferência?</p>
        <p class="text-ink mt-0.5 break-words">
          <span class="font-mono text-micro text-ink-subtle">{{ proposta.key }}</span>
          <span class="mx-1 text-ink-subtle">·</span>{{ proposta.value }}
        </p>
        <p v-if="action.substitui && !(estado === 'saved' || jaGuardada)" class="text-micro text-ink-subtle mt-0.5">
          Substitui: "{{ action.substitui }}"
        </p>

        <div v-if="estado === 'saved' || jaGuardada" class="flex items-center gap-2 mt-2 text-xs text-data-pos">
          <i class="fas fa-check"></i> Guardada.
          <button type="button" class="underline text-ink-muted hover:text-ink" @click="abrirConfig">Gerenciar</button>
        </div>
        <p v-else-if="estado === 'declined'" class="text-xs text-ink-subtle mt-2">Tudo bem, não guardei.</p>
        <div v-else class="flex items-center gap-2 mt-2">
          <button type="button" :disabled="estado === 'saving'" @click="guardar"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:brightness-105 disabled:opacity-60 transition-all">
            <i v-if="estado === 'saving'" class="fas fa-circle-notch fa-spin mr-1"></i>Guardar
          </button>
          <button type="button" @click="estado = 'declined'"
            class="px-3 py-1.5 rounded-lg text-xs text-ink-muted hover:text-ink transition-colors">Agora não</button>
          <span v-if="erro" class="text-micro text-data-neg">{{ erro }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
