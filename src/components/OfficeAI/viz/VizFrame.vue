<script setup>
/**
 * VizFrame - a casca de todo bloco da galeria.
 * ─────────────────────────────────────────────────────────────────────────────
 * Título, subtítulo, FONTE do dado, ações (copiar, Excel, abrir tela), o
 * botão "trocar visual" e os estados vazio/esqueleto/truncado. Os componentes
 * de visual só desenham o miolo - a moldura é uma só, e é o que faz uma
 * resposta da Eme parecer um produto e não vinte.
 *
 * É o `Panel` do design system com o que uma resposta de chat precisa a mais.
 */
import { ref, computed } from 'vue';
import Panel from '@/components/UI/Panel.vue';
import { VISUAIS_DE_DATASET } from './emeBlock.js';
import { ROTULO_VISUAL as ROTULO, ICONE_VISUAL as ICONE } from './visuais.js';

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  /* De onde saiu o dado ("Fichas Comerciais 09/2026 (Autorizada)"). */
  source: { type: String, default: '' },
  icon: { type: String, default: '' },
  padded: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
  loadingVariant: { type: String, default: 'text' },
  empty: { type: Boolean, default: false },
  emptyText: { type: String, default: 'A consulta não retornou nenhuma linha.' },
  /* Visual atual e os possíveis - habilita o "trocar visual". */
  visual: { type: String, default: '' },
  visuais: { type: Array, default: () => [] },
  /* N de M quando a tool cortou linhas. */
  total: { type: Number, default: null },
  exibidos: { type: Number, default: null },
  truncated: { type: Boolean, default: false },
  /* Ações declaradas pela tool: [{ kind, label, payload }]. */
  actions: { type: Array, default: () => [] },
});
const emit = defineEmits(['visual', 'action']);


const trocavel = computed(() => props.visuais.filter((v) => VISUAIS_DE_DATASET.includes(v)).length > 1);
const opcoes = computed(() => props.visuais.map((v) => ({ value: v, label: ROTULO[v] || v, icon: ICONE[v] || '' })));
const aberto = ref(false);

const acoesNav = computed(() => props.actions.filter((a) => a?.kind === 'navigate' && a.payload?.route));

const rodape = computed(() => {
  if (props.truncated && props.total != null && props.exibidos != null && props.exibidos < props.total) {
    return `${props.exibidos.toLocaleString('pt-BR')} de ${props.total.toLocaleString('pt-BR')} - o resto está na tela completa.`;
  }
  return '';
});
</script>

<template>
  <Panel :padded="padded" :icon="icon" :loading="loading" :loading-variant="loadingVariant"
    :empty="empty && !loading" empty-icon="far fa-folder-open" empty-title="Sem resultados" :empty-text="emptyText"
    class="mt-2 overflow-hidden">
    <template #title>{{ title || 'Resultado' }}</template>
    <template v-if="subtitle || source" #subtitle>
      <span v-if="subtitle">{{ subtitle }}</span>
      <span v-if="subtitle && source" class="mx-1 text-ink-subtle">·</span>
      <span v-if="source" class="text-ink-subtle"><i class="fas fa-database text-micro mr-1"></i>{{ source }}</span>
    </template>

    <template #actions>
      <!-- Trocar visual: só quando há mais de um que faz sentido -->
      <div v-if="trocavel" class="relative">
        <button type="button" @click="aberto = !aberto" v-tippy="'Trocar visual'"
          class="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs text-ink-muted
                 hover:text-ink hover:bg-surface-sunken transition-colors duration-120 focus-ring">
          <i :class="ICONE[visual] || 'fas fa-shapes'"></i>
          <span class="hidden sm:inline">{{ ROTULO[visual] || 'Visual' }}</span>
          <i class="fas fa-chevron-down text-micro opacity-70"></i>
        </button>
        <Transition enter-active-class="transition duration-120 ease-out-expo" enter-from-class="opacity-0 -translate-y-1"
          leave-active-class="transition duration-120" leave-to-class="opacity-0">
          <div v-if="aberto" class="absolute right-0 top-9 z-20 min-w-[160px] rounded-xl border border-line bg-surface-overlay shadow-overlay p-1"
            @mouseleave="aberto = false">
            <button v-for="o in opcoes" :key="o.value" type="button"
              @click="emit('visual', o.value); aberto = false"
              class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors duration-120"
              :class="o.value === visual ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-sunken'">
              <i :class="o.icon" class="w-4 text-center text-micro"></i>{{ o.label }}
              <i v-if="o.value === visual" class="fas fa-check ml-auto text-micro"></i>
            </button>
          </div>
        </Transition>
      </div>
      <slot name="actions" />
      <button v-for="(a, i) in acoesNav" :key="i" type="button" @click="emit('action', a)"
        class="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-xs font-medium
               bg-accent-soft text-accent hover:brightness-105 transition-all duration-120 focus-ring">
        <i class="fas fa-arrow-up-right-from-square text-micro"></i>
        <span class="hidden sm:inline">{{ a.label || 'Abrir tela' }}</span>
      </button>
    </template>

    <slot />

    <p v-if="rodape" class="px-3 pb-2.5 pt-1 text-micro text-ink-subtle">
      <i class="fas fa-circle-info mr-1"></i>{{ rodape }}
    </p>
  </Panel>
</template>
