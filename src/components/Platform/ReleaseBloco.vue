<script setup>
// O conteúdo de UMA release, na versão curta.
//
// A primeira leitura do mural era um paredão: cada novidade com um parágrafo,
// mais melhorias e correções abertas, tudo de uma vez. Ninguém lê um aviso que
// pede rolagem. Aqui a hierarquia é: regra que mudou > o que passou a existir >
// o resto DOBRADO atrás de uma linha com a contagem, para quem quiser.
//
// A versão longa não se perdeu: ela é a mesma lista, aberta na tela /docs.
import { ref, computed } from 'vue';

const props = defineProps({
  release: { type: Object, required: true },
});
const emit = defineEmits(['abrir-tela']);

const detalhesAbertos = ref(false);

const melhorias = computed(() => props.release?.improvements || []);
const correcoes = computed(() => props.release?.fixes || []);
const regras = computed(() => props.release?.breakingChanges || []);

// "3 melhorias e 2 correções" — o número já diz se vale abrir.
const resumoDetalhes = computed(() => {
  const partes = [];
  const m = melhorias.value.length;
  const c = correcoes.value.length;
  if (m) partes.push(`${m} ${m === 1 ? 'melhoria' : 'melhorias'}`);
  if (c) partes.push(`${c} ${c === 1 ? 'correção' : 'correções'}`);
  return partes.join(' e ');
});
</script>

<template>
  <div class="space-y-3">
    <p v-if="release.description" class="text-sm text-ink-muted leading-relaxed">
      {{ release.description }}
    </p>

    <!-- Regra que mudou vem primeiro: é o único bloco que muda o que a pessoa
         precisa fazer amanhã. -->
    <div v-if="regras.length"
      class="rounded-lg border border-data-warn/30 bg-data-warn-soft px-3 py-2.5">
      <p class="text-micro font-medium uppercase tracking-wide text-data-warn mb-1">
        <i class="fas fa-triangle-exclamation mr-1"></i>
        {{ regras.length === 1 ? 'Mudou uma regra' : 'Mudaram regras' }}
      </p>
      <p v-for="r in regras" :key="r.id" class="text-xs text-ink leading-relaxed">
        {{ r.description }}
      </p>
    </div>

    <!-- Novidades -->
    <ul v-if="release.features?.length" class="space-y-2.5">
      <li v-for="f in release.features" :key="f.id" class="flex items-start gap-2.5">
        <span class="shrink-0 mt-0.5 h-5 w-5 rounded-md grid place-items-center
                     bg-accent-soft border border-accent/20 text-accent">
          <i class="fas fa-plus text-[9px]"></i>
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-ink leading-snug">
            {{ f.title }}
            <button v-if="f.link" type="button" @click="emit('abrir-tela', f.link)"
              class="ml-1.5 text-micro font-medium text-accent hover:underline whitespace-nowrap">
              abrir <i class="fas fa-arrow-right text-[9px]"></i>
            </button>
          </p>
          <p class="text-xs text-ink-muted leading-relaxed">{{ f.description }}</p>
        </div>
      </li>
    </ul>

    <!-- Melhorias e correções: dobradas. -->
    <div v-if="resumoDetalhes">
      <button type="button" @click="detalhesAbertos = !detalhesAbertos"
        class="text-micro text-ink-subtle hover:text-accent transition-colors inline-flex items-center gap-1.5">
        <i class="fas fa-chevron-down text-[9px] transition-transform duration-200"
           :class="{ 'rotate-180': detalhesAbertos }"></i>
        {{ resumoDetalhes }}
      </button>

      <div v-if="detalhesAbertos" class="mt-2 pl-3 border-l border-line space-y-1.5">
        <p v-for="m in melhorias" :key="`m${m.id}`" class="text-xs text-ink-muted leading-relaxed">
          <span v-if="m.category" class="text-ink">{{ m.category }}: </span>{{ m.description }}
        </p>
        <p v-for="c in correcoes" :key="`c${c.id}`" class="text-xs text-ink-muted leading-relaxed">
          <i class="fas fa-wrench text-[9px] text-ink-subtle mr-1"></i>{{ c.description }}
        </p>
      </div>
    </div>
  </div>
</template>
