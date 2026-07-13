<script setup>
/**
 * PageHelp — instruções de uso padrão de uma tela.
 * ─────────────────────────────────────────────────────────────────────────────
 * Botão "Como usar" que abre um painel (Modal) com instruções claras. Pensado
 * para o usuário final que NÃO conhece o sistema — deve sanar as dúvidas de
 * "como faço X aqui" sem precisar de tutorial guiado.
 *
 * Toda tela do Office deve ter um <PageHelp>, normalmente no slot #actions do
 * <PageHeader>. Conteúdo via props (rápido) ou slot default (rico).
 *
 * Uso rápido:
 *   <PageHelp
 *     storage-key="leads"
 *     intro="Aqui você acompanha e gerencia os leads captados."
 *     :steps="[
 *       'Use os filtros no topo para achar um lead por origem, status ou data.',
 *       { title: 'Abrir um lead', text: 'Clique na linha para ver o histórico completo.' },
 *       'Arraste o lead entre as colunas para mudar o estágio.',
 *     ]"
 *     :tips="['Leads em vermelho estão sem contato há mais de 48h.']"
 *   />
 *
 * Uso rico (slot):
 *   <PageHelp title="Como usar as Fichas">
 *     <p class="text-sm text-ink-muted">Conteúdo livre em HTML...</p>
 *   </PageHelp>
 */
import { ref, computed, onMounted } from 'vue';
import Modal from './Modal.vue';

const props = defineProps({
  title: { type: String, default: 'Como usar esta tela' },
  label: { type: String, default: 'Como usar' },     // rótulo do botão
  intro: { type: String, default: '' },
  steps: { type: Array, default: () => [] },          // string | { title, text }
  tips: { type: Array, default: () => [] },           // string[]
  // Se informado, o botão pulsa até ser aberto pela 1ª vez (por usuário/navegador).
  storageKey: { type: String, default: '' },
});

const open = ref(false);
const seen = ref(true);

const storeKey = computed(() => props.storageKey ? `menin:help-seen:${props.storageKey}` : '');

onMounted(() => {
  if (storeKey.value) seen.value = localStorage.getItem(storeKey.value) === '1';
});

function show() {
  open.value = true;
  if (storeKey.value && !seen.value) {
    localStorage.setItem(storeKey.value, '1');
    seen.value = true;
  }
}

const normalizedSteps = computed(() =>
  props.steps.map(s => (typeof s === 'string' ? { title: '', text: s } : s))
);
</script>

<template>
  <!-- Trigger -->
  <button type="button" @click="show"
    class="relative inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium
           bg-surface-raised text-ink-muted border border-line
           hover:bg-surface-sunken hover:text-ink hover:border-line-strong
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring/40
           active:scale-[0.98] transition-all duration-150 ease-out-expo shrink-0"
    :aria-label="label">
    <i class="far fa-circle-question text-base text-accent"></i>
    <span class="hidden sm:inline">{{ label }}</span>
    <!-- Pulso de 1ª visita -->
    <span v-if="!seen" class="absolute -top-1 -right-1 flex h-2.5 w-2.5">
      <span class="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping"></span>
      <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent"></span>
    </span>
  </button>

  <Modal :open="open" size="lg" position="right" :title="title" @close="open = false">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <span class="grid place-items-center h-9 w-9 rounded-xl bg-accent-soft text-accent border border-accent/20 shrink-0">
          <i class="far fa-circle-question"></i>
        </span>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">{{ title }}</h2>
          <p class="text-xs text-ink-muted">Guia rápido desta tela</p>
        </div>
      </div>
    </template>

    <div class="space-y-5">
      <!-- Intro -->
      <p v-if="intro" class="text-sm text-ink leading-relaxed">{{ intro }}</p>

      <!-- Passos -->
      <ol v-if="normalizedSteps.length" class="space-y-3">
        <li v-for="(step, i) in normalizedSteps" :key="i" class="flex gap-3">
          <span class="grid place-items-center h-6 w-6 shrink-0 rounded-full bg-accent-soft text-accent
                       text-xs font-semibold border border-accent/20">
            {{ i + 1 }}
          </span>
          <div class="min-w-0 pt-0.5">
            <p v-if="step.title" class="text-sm font-medium text-ink">{{ step.title }}</p>
            <p class="text-sm text-ink-muted leading-relaxed">{{ step.text }}</p>
          </div>
        </li>
      </ol>

      <!-- Conteúdo livre -->
      <div v-if="$slots.default" class="text-sm text-ink-muted leading-relaxed space-y-3">
        <slot />
      </div>

      <!-- Dicas -->
      <div v-if="tips.length" class="rounded-xl border border-accent/20 bg-accent-soft/40 p-3.5 space-y-2">
        <p class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
          <i class="fas fa-lightbulb"></i> Dicas
        </p>
        <ul class="space-y-1.5">
          <li v-for="(tip, i) in tips" :key="i" class="flex gap-2 text-sm text-ink-muted leading-relaxed">
            <i class="fas fa-circle text-[5px] mt-1.5 text-accent shrink-0"></i>
            <span>{{ tip }}</span>
          </li>
        </ul>
      </div>
    </div>

    <template #footer>
      <button type="button" @click="open = false"
        class="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium
               bg-accent text-white border border-accent hover:bg-accent-hover
               active:scale-[0.98] transition-all duration-150 ease-out-expo shadow-soft">
        Entendi
      </button>
    </template>
  </Modal>
</template>
