<script setup>
/**
 * VizChoice - opções que a pessoa escolhe: sugestões de próxima pergunta,
 * seletor de recorte, check de várias. Cada opção vira um PROMPT enviado à
 * Eme (ou uma navegação), então a resposta continua na conversa.
 * choice: { options: [{ label, icon?, prompt?, route?, filters? }], multiple?, submitLabel? }
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useOfficeAIStore } from '@/stores/officeAIStore';

const props = defineProps({
  choice: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});
const router = useRouter();
const aiStore = useOfficeAIStore();
const marcadas = ref(new Set());

function escolher(o) {
  if (props.choice.multiple) {
    const s = new Set(marcadas.value); s.has(o.label) ? s.delete(o.label) : s.add(o.label); marcadas.value = s; return;
  }
  disparar(o);
}
function disparar(o) {
  if (o.route) { router.push({ path: o.route, query: o.filters || {} }); return; }
  if (o.prompt && !aiStore.isStreaming) aiStore.sendMessage(o.prompt);
}
function enviarMarcadas() {
  const escolhidas = props.choice.options.filter((o) => marcadas.value.has(o.label));
  if (!escolhidas.length) return;
  const prompt = props.choice.submitPrompt
    ? props.choice.submitPrompt.replace('{opcoes}', escolhidas.map((o) => o.label).join(', '))
    : escolhidas.map((o) => o.prompt || o.label).join('; ');
  if (!aiStore.isStreaming) aiStore.sendMessage(prompt);
}
</script>

<template>
  <div class="px-3 pb-3 pt-1">
    <p v-if="choice.label" class="text-micro uppercase tracking-wider text-ink-subtle font-mono mb-1.5">{{ choice.label }}</p>
    <div class="flex flex-wrap gap-1.5">
      <button v-for="(o, i) in choice.options" :key="i" type="button" @click="escolher(o)"
        class="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border text-xs transition-colors duration-120 focus-ring"
        :class="marcadas.has(o.label)
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line bg-surface-raised text-ink hover:border-accent/40 hover:text-accent'">
        <i v-if="o.icon" :class="o.icon" class="text-micro"></i>
        <i v-else-if="o.route" class="fas fa-arrow-up-right-from-square text-micro opacity-70"></i>
        {{ o.label }}
      </button>
    </div>
    <button v-if="choice.multiple" type="button" :disabled="!marcadas.size" @click="enviarMarcadas"
      class="mt-2 h-8 px-3 rounded-lg text-xs font-medium bg-accent text-white disabled:opacity-50 transition-all duration-120 focus-ring">
      {{ choice.submitLabel || 'Perguntar' }}<span v-if="marcadas.size"> ({{ marcadas.size }})</span>
    </button>
  </div>
</template>
