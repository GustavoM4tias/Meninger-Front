<script setup>
/**
 * VizConfirm - UM padrão de confirmar dentro do chat, com a consequência
 * escrita (regra da casa: "tem certeza?" não é consequência).
 * confirm: { title, detail?, note?, consequence?, confirmLabel?, declineLabel?, effect }
 * effect: { type: 'memory', proposta } | { type: 'prompt', prompt } | { type: 'api', method, path, body }
 * Depois de confirmado, o card diz o que aconteceu e não some.
 */
import { ref, computed, onMounted } from 'vue';
import { useOfficeAIStore } from '@/stores/officeAIStore';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const props = defineProps({
  confirm: { type: Object, required: true },
});
const aiStore = useOfficeAIStore();
const estado = ref('idle');   // idle | saving | done | declined | error
const erro = ref('');
const efeito = computed(() => props.confirm.effect || {});

/* Memória: se já está guardada (conversa reaberta), o card sabe. */
const jaFeito = computed(() => efeito.value.type === 'memory'
  && aiStore.memories.some((m) => m.key === efeito.value.proposta?.key && m.value === efeito.value.proposta?.value && m.enabled));
onMounted(() => { if (efeito.value.type === 'memory' && !aiStore.memories.length) aiStore.loadMemories().catch(() => {}); });

async function confirmar() {
  estado.value = 'saving';
  erro.value = '';
  try {
    const e = efeito.value;
    if (e.type === 'memory') await aiStore.addMemory({ key: e.proposta.key, value: e.proposta.value, category: e.proposta.category });
    else if (e.type === 'prompt') { if (!aiStore.isStreaming) aiStore.sendMessage(e.prompt); }
    else if (e.type === 'api') await requestWithAuth(e.path, { method: e.method || 'POST', body: e.body ? JSON.stringify(e.body) : undefined });
    estado.value = 'done';
  } catch (err) {
    estado.value = 'error';
    erro.value = err?.message || 'Não deu certo.';
  }
}
</script>

<template>
  <div class="rounded-xl border border-accent/25 bg-accent-soft/40 px-3 py-2.5 text-sm max-w-md mt-2">
    <div class="flex items-start gap-2">
      <i class="fas fa-circle-question text-accent mt-0.5 text-xs"></i>
      <div class="min-w-0 flex-1">
        <p class="text-xs text-ink-muted">{{ confirm.title }}</p>
        <p v-if="confirm.detail" class="text-ink mt-0.5 break-words">{{ confirm.detail }}</p>
        <p v-if="confirm.note && !(estado === 'done' || jaFeito)" class="text-micro text-ink-subtle mt-0.5">{{ confirm.note }}</p>
        <p v-if="confirm.consequence && !(estado === 'done' || jaFeito)" class="text-micro text-ink-muted mt-1 leading-relaxed">{{ confirm.consequence }}</p>

        <div v-if="estado === 'done' || jaFeito" class="flex items-center gap-2 mt-2 text-xs text-data-pos">
          <i class="fas fa-check"></i> {{ confirm.doneLabel || 'Feito.' }}
          <button v-if="efeito.type === 'memory'" type="button" class="underline text-ink-muted hover:text-ink" @click="aiStore.settingsOpen = true">Gerenciar</button>
        </div>
        <p v-else-if="estado === 'declined'" class="text-xs text-ink-subtle mt-2">{{ confirm.declinedLabel || 'Tudo bem, não fiz.' }}</p>
        <div v-else class="flex items-center gap-2 mt-2">
          <button type="button" :disabled="estado === 'saving'" @click="confirmar"
            class="h-8 px-3 rounded-lg text-xs font-medium bg-accent text-white hover:brightness-105 disabled:opacity-60 transition-all duration-120 focus-ring">
            <i v-if="estado === 'saving'" class="fas fa-circle-notch fa-spin mr-1"></i>{{ confirm.confirmLabel || 'Confirmar' }}
          </button>
          <button type="button" @click="estado = 'declined'"
            class="h-8 px-3 rounded-lg text-xs text-ink-muted hover:text-ink transition-colors duration-120">{{ confirm.declineLabel || 'Agora não' }}</button>
          <span v-if="erro" class="text-micro text-data-neg">{{ erro }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
