<script setup>
// Barra de contexto da Eme: onde a pessoa está e o que ela apontou.
//
// Vive num componente próprio porque existem DOIS compositores - o da home
// (ChatComposer) e o da bolinha flutuante (OfficeChatSession, com markup
// próprio). A primeira versão ficou só no ChatComposer e não aparecia em lugar
// nenhum: na bolinha porque o componente não é usado lá, e na home porque lá a
// Eme é a própria tela.
//
// Duas coisas, com pesos visuais diferentes:
//   - a TELA atual, indicador fixo (com alfinete, sem X): é contexto que a Eme
//     já tem, não uma escolha da pessoa;
//   - os trechos marcados com Ctrl+clique, que ela escolheu e pode tirar.

import { ref, computed, watch } from 'vue';
import { useEmeScreenContext } from '@/composables/useEmeScreenContext';

const props = defineProps({
  // Na home a Eme É a tela: dizer "você está na home" não informa nada.
  mostrarTela: { type: Boolean, default: true },
});

const { referencias, removerReferencia, tela, rota, ultimaMarcada } = useEmeScreenContext();

const temTela = computed(() => props.mostrarTela && !!tela.value && rota.value !== '/');

// A etiqueta recém-criada pisca por um instante - sem isso, quem clicou lá no
// meio da página não percebe que apareceu algo aqui embaixo.
const destaque = ref(null);
watch(ultimaMarcada, (id) => {
  if (!id) return;
  destaque.value = id;
  setTimeout(() => { if (destaque.value === id) destaque.value = null; }, 1400);
});
</script>

<template>
  <div v-if="temTela || referencias.length"
    class="flex flex-wrap items-center gap-1.5 pb-2">

    <!-- Onde a pessoa está -->
    <span v-if="temTela" :title="`A Eme sabe que você está em ${tela}`"
      class="inline-flex items-center gap-1.5 max-w-full px-2 py-1 rounded-lg
             border border-line bg-surface-sunken text-ink-muted text-micro select-none">
      <i class="fas fa-location-dot text-micro shrink-0 text-accent"></i>
      <span class="truncate max-w-[12rem]">{{ tela }}</span>
    </span>

    <!-- O que ela apontou com Ctrl+clique -->
    <span v-for="r in referencias" :key="r.id"
      :class="destaque === r.id ? 'ring-2 ring-accent/40 scale-[1.03]' : ''"
      class="inline-flex items-center gap-1.5 max-w-full px-2 py-1 rounded-lg
             bg-accent-soft border border-accent/25 text-accent text-micro
             transition-all duration-200">
      <i class="fas fa-crosshairs text-micro shrink-0"></i>
      <span class="truncate max-w-[14rem]">{{ r.rotulo ? `${r.rotulo}: ${r.texto}` : r.texto }}</span>
      <button type="button" @click="removerReferencia(r.id)"
        class="shrink-0 opacity-60 hover:opacity-100" title="Tirar esta referência">
        <i class="fas fa-xmark text-micro"></i>
      </button>
    </span>

    <span v-if="temTela && !referencias.length" class="text-micro text-ink-subtle">
      Ctrl+clique em algo da tela para apontar
    </span>
  </div>
</template>
