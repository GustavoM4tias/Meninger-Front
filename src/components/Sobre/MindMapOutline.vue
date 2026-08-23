<script setup>
/**
 * MindMapOutline — o mesmo mapa em forma de lista recolhível.
 * ─────────────────────────────────────────────────────────────────────────────
 * É a visão padrão no celular, onde arrastar e dar zoom num canvas é ruim: cada
 * ramo vira uma linha tocável de altura confortável, que abre os filhos abaixo.
 *
 * O estado de abertura vive na tela (um Set de ids), não aqui, para que os
 * botões "Abrir tudo" e "Recolher" alcancem todos os níveis. O componente se
 * chama a si mesmo para descer na árvore.
 */
defineProps({
    nodes: { type: Array, required: true },
    openIds: { type: Set, required: true },
    path: { type: String, default: 'r' },
    depth: { type: Number, default: 1 },
    acc: { type: String, default: '' },
});

const emit = defineEmits(['toggle']);

function countAll(node) {
    return (node.c || []).reduce((total, child) => total + 1 + countAll(child), 0);
}
</script>

<template>
  <ul class="space-y-1.5" :class="depth > 1 ? 'mt-1.5 ml-3 pl-3 border-l border-dashed border-line' : ''">
    <li v-for="(node, i) in nodes" :key="`${path}/${i}`">
      <div
        class="group flex items-start gap-2.5 rounded-lg border border-line bg-surface-raised
               px-3 py-2.5 min-h-[44px] transition-all duration-150 ease-out-expo"
        :class="[
          node.c?.length ? 'cursor-pointer hover:border-line-strong hover:shadow-soft active:scale-[0.995]' : '',
          depth === 1 ? 'shadow-soft' : '',
        ]"
        :style="{ borderLeftWidth: '3px', borderLeftColor: node.acc || acc }"
        @click="node.c?.length && emit('toggle', `${path}/${i}`)">

        <i v-if="node.c?.length"
           class="fas fa-chevron-right text-[10px] mt-1 shrink-0 transition-transform duration-200"
           :class="openIds.has(`${path}/${i}`) ? 'rotate-90' : ''"
           :style="{ color: node.acc || acc }"></i>
        <i v-else class="fas fa-circle text-[5px] mt-2 shrink-0 opacity-50"
           :style="{ color: node.acc || acc }"></i>

        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class="font-semibold text-ink leading-snug"
                  :class="depth === 1 ? 'text-[15px]' : 'text-sm'"
                  :style="depth === 1 ? { color: node.acc || acc } : null">
              {{ node.t }}
            </span>
            <span v-if="node.k"
                  class="text-[10.5px] font-bold rounded-md px-1.5 py-0.5 whitespace-nowrap"
                  :style="{ color: node.acc || acc,
                            background: `color-mix(in srgb, ${node.acc || acc} 14%, transparent)` }">
              {{ node.k }}
            </span>
          </p>
          <p v-if="node.s" class="text-xs text-ink-muted leading-relaxed mt-0.5">{{ node.s }}</p>
        </div>

        <span v-if="node.c?.length"
              class="shrink-0 self-center text-micro font-mono tabular-nums rounded-md px-1.5 py-0.5"
              :style="{ color: node.acc || acc,
                        background: `color-mix(in srgb, ${node.acc || acc} 12%, transparent)` }">
          {{ countAll(node) }}
        </span>
      </div>

      <MindMapOutline
        v-if="node.c?.length && openIds.has(`${path}/${i}`)"
        :nodes="node.c"
        :open-ids="openIds"
        :path="`${path}/${i}`"
        :depth="depth + 1"
        :acc="node.acc || acc"
        @toggle="id => emit('toggle', id)" />
    </li>
  </ul>
</template>
