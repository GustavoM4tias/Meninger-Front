<script setup>
import { ref, computed, watch } from 'vue';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(['update:open', 'created']);

const store = useWhatsappStore();

const form = ref({
  name: '',
  category: 'UTILITY',
  language: 'pt_BR',
  body: '',
  examples: [],         // array de strings (1 por variável)
  headerText: '',
  footerText: '',
});

const isSubmitting = ref(false);
const error = ref('');

// Conta variáveis {{N}} no body. Atualiza `examples` pra ter o mesmo tamanho.
const variables = computed(() => {
  const set = new Set();
  const matches = form.value.body.match(/\{\{\s*(\d+)\s*\}\}/g) || [];
  for (const m of matches) {
    const n = m.replace(/\D/g, '');
    if (n) set.add(Number(n));
  }
  return Array.from(set).sort((a, b) => a - b);
});

watch(variables, (vars) => {
  // ajusta o array de exemplos (preserva os já preenchidos)
  const next = [];
  for (let i = 0; i < vars.length; i++) {
    next[i] = form.value.examples[i] || '';
  }
  form.value.examples = next;
}, { immediate: true });

const slugifyName = computed(() =>
  String(form.value.name || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
);

const previewBody = computed(() => {
  let txt = form.value.body || '';
  variables.value.forEach((n, i) => {
    const ex = form.value.examples[i];
    if (ex) txt = txt.replace(new RegExp(`\\{\\{\\s*${n}\\s*\\}\\}`, 'g'), ex);
  });
  return txt;
});

// Conta palavras "puras" (descartando os {{N}}). Meta exige proporção mínima
// de palavras por variável — caso contrário rejeita com error_subcode 2388293.
const wordCount = computed(() => {
  const stripped = form.value.body
    .replace(/\{\{\s*\d+\s*\}\}/g, '')   // remove placeholders
    .replace(/[*_~`]/g, '')               // remove markdown WhatsApp
    .trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
});

// Limite empírico observado: ~5 palavras úteis por variável é seguro
const ratioWarning = computed(() => {
  const v = variables.value.length;
  if (!v) return null;
  const ratio = wordCount.value / v;
  if (ratio < 5) {
    return `Apenas ${wordCount.value} palavras para ${v} variável(is) — Meta provavelmente vai rejeitar. Mire 5+ palavras por variável.`;
  }
  return null;
});

const isValid = computed(() => {
  if (!slugifyName.value) return false;
  if (!form.value.body.trim()) return false;
  if (variables.value.length && form.value.examples.some(e => !String(e || '').trim())) return false;
  return true;
});

const closeModal = () => emit('update:open', false);

const reset = () => {
  form.value = {
    name: '', category: 'UTILITY', language: 'pt_BR',
    body: '', examples: [], headerText: '', footerText: '',
  };
  error.value = '';
};

const onSubmit = async () => {
  error.value = '';
  if (!isValid.value) {
    error.value = 'Preencha nome, corpo e todos os exemplos das variáveis.';
    return;
  }
  isSubmitting.value = true;
  try {
    await store.createTemplate({
      name: slugifyName.value,
      category: form.value.category,
      language: form.value.language,
      body: form.value.body,
      examples: form.value.examples,
      headerText: form.value.headerText || undefined,
      footerText: form.value.footerText || undefined,
    });
    emit('created');
    reset();
    closeModal();
  } catch (e) {
    error.value = e.message || 'Falha ao criar template.';
  } finally {
    isSubmitting.value = false;
  }
};

// Templates prontos pro NotificationService — atalho.
// Importante: a Meta rejeita templates com poucas palavras por variável (regra
// de proporção). Manter pelo menos ~5 palavras por {{N}} pra passar na revisão.
const presets = [
  {
    name: 'event_created_v1',
    label: 'Novo evento',
    body: 'Olá *{{1}}*! Um novo evento foi adicionado à sua agenda no Menin Office: *{{2}}*. Acontece em {{3}}. Acesse o sistema para ver todos os detalhes.',
    examples: ['Maria', 'Workshop de Vendas', '09/05 14h'],
  },
  {
    name: 'event_reminder_v1',
    label: 'Lembrete de evento',
    body: 'Olá *{{1}}*! Passando para lembrar que o evento *{{2}}* está chegando — ele acontece em {{3}}. Não esqueça de comparecer e bons estudos!',
    examples: ['Maria', 'Workshop de Vendas', '09/05 14h'],
  },
  {
    name: 'support_opened_v1',
    label: 'Chamado aberto',
    body: 'Olá! Confirmamos a abertura do seu chamado de suporte *{{1}}* no Menin Office. Resumo do problema: {{2}}. Em breve nosso time entrará em contato com você.',
    examples: ['#123456', 'Erro ao gerar boleto na integração Sienge'],
  },
  {
    name: 'support_updated_v1',
    label: 'Atualização em chamado',
    body: 'Houve uma atualização no seu chamado de suporte *{{1}}* no Menin Office: {{2}}. Acesse o sistema para acompanhar todos os detalhes do andamento.',
    examples: ['#123456', 'Status alterado para Em andamento'],
  },
];

const applyPreset = (p) => {
  form.value.name = p.name;
  form.value.body = p.body;
  form.value.examples = [...p.examples];
  form.value.category = 'UTILITY';
  form.value.language = 'pt_BR';
};
</script>

<template>
  <Modal :open="open" @close="closeModal" @update:open="(v) => emit('update:open', v)"
    title="Criar template" subtitle="O template entra em revisão e fica pendente até a Meta aprovar." size="lg">

    <div class="space-y-5">
      <!-- Atalhos para os 4 templates do NotificationService -->
      <div>
        <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">
          Atalhos: templates do sistema
        </p>
        <div class="flex flex-wrap gap-2">
          <button v-for="p in presets" :key="p.name" type="button" @click="applyPreset(p)"
            class="text-xs px-2.5 py-1.5 rounded-md border border-line bg-surface-sunken hover:bg-accent-soft hover:border-accent/30 hover:text-accent transition-colors">
            <i class="fas fa-bolt text-[9px] mr-1"></i>{{ p.label }}
          </button>
        </div>
      </div>

      <!-- Identidade -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input v-model="form.name" label="Nome (slug)" placeholder="event_reminder_v1"
          :hint="slugifyName !== form.name ? `Será salvo como: ${slugifyName}` : 'Use lowercase + underscore, único por idioma.'" />
        <div>
          <label class="text-xs font-medium text-ink-muted mb-1.5 block">Categoria</label>
          <select v-model="form.category"
            class="w-full h-10 px-3 rounded-md border border-line bg-surface-raised text-sm text-ink">
            <option value="UTILITY">UTILITY (transacional, mais barato)</option>
            <option value="MARKETING">MARKETING (promocional)</option>
            <option value="AUTHENTICATION">AUTHENTICATION (códigos)</option>
          </select>
        </div>
        <div>
          <label class="text-xs font-medium text-ink-muted mb-1.5 block">Idioma</label>
          <select v-model="form.language"
            class="w-full h-10 px-3 rounded-md border border-line bg-surface-raised text-sm text-ink">
            <option value="pt_BR">Português (BR)</option>
            <option value="en_US">English (US)</option>
            <option value="es_ES">Español</option>
          </select>
        </div>
      </div>

      <!-- Corpo -->
      <div>
        <label class="text-xs font-medium text-ink-muted mb-1.5 block">Corpo</label>
        <textarea v-model="form.body" rows="4"
          placeholder="Olá {{1}}, lembrete: o evento {{2}} começa em {{3}}."
          class="w-full px-3 py-2 rounded-md border border-line bg-surface-raised text-sm text-ink
                 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring/20 resize-y"></textarea>
        <div class="flex items-center justify-between gap-2 mt-1">
          <p class="text-[11px] text-ink-subtle">
            Use <code class="font-mono" v-pre>{{1}}</code>, <code class="font-mono" v-pre>{{2}}</code>... para variáveis.
            Negrito <code class="font-mono">*texto*</code>, itálico <code class="font-mono">_texto_</code>.
          </p>
          <p class="text-[11px] text-ink-subtle whitespace-nowrap">
            <span class="font-mono">{{ wordCount }}</span> palavras
            <span v-if="variables.length"> · <span class="font-mono">{{ variables.length }}</span> var{{ variables.length === 1 ? '' : 's' }}</span>
          </p>
        </div>
        <p v-if="ratioWarning" class="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
          <i class="fas fa-triangle-exclamation mr-1"></i>{{ ratioWarning }}
        </p>
      </div>

      <!-- Exemplos -->
      <div v-if="variables.length">
        <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">
          Exemplos das variáveis (obrigatório)
        </p>
        <div class="space-y-2">
          <div v-for="(n, i) in variables" :key="n" class="flex items-center gap-2">
            <code class="font-mono text-xs px-2 py-1 rounded bg-surface-sunken border border-line shrink-0">
              &#123;&#123;{{ n }}&#125;&#125;
            </code>
            <Input v-model="form.examples[i]" :placeholder="`Exemplo da variável ${n}`" size="sm" class="flex-1" />
          </div>
        </div>
      </div>

      <!-- Header / Footer opcionais -->
      <details class="border border-line rounded-lg">
        <summary class="cursor-pointer px-3 py-2 text-xs text-ink-muted hover:bg-surface-sunken/50 select-none">
          Cabeçalho e rodapé (opcional)
        </summary>
        <div class="px-3 py-3 space-y-3 border-t border-line">
          <Input v-model="form.headerText" label="Cabeçalho (texto, max 60 chars)"
            placeholder="Ex: Aviso Menin" />
          <Input v-model="form.footerText" label="Rodapé (max 60 chars)"
            placeholder="Ex: Mensagem automática — não responder" />
        </div>
      </details>

      <!-- Preview -->
      <div class="rounded-xl border border-line bg-surface-sunken/40 p-3">
        <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">Preview</p>
        <div class="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 text-sm text-ink whitespace-pre-wrap">
          <p v-if="form.headerText" class="font-bold mb-1">{{ form.headerText }}</p>
          <p>{{ previewBody || 'Digite o corpo para ver a prévia.' }}</p>
          <p v-if="form.footerText" class="text-xs text-ink-muted mt-2 italic">{{ form.footerText }}</p>
        </div>
      </div>

      <div v-if="error" class="text-xs text-red-600 dark:text-red-400">{{ error }}</div>
    </div>

    <template #footer>
      <Button variant="secondary" @click="closeModal">Cancelar</Button>
      <Button :loading="isSubmitting" :disabled="!isValid" icon="fas fa-paper-plane" @click="onSubmit">
        Criar e enviar pra revisão
      </Button>
    </template>
  </Modal>
</template>
