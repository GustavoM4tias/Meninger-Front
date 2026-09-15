// composables/useLarguraElemento.js
//
// Largura de UM elemento, reativa (ResizeObserver).
//
// Breakpoint do Tailwind é da JANELA. Um componente que mora dentro de um
// painel estreito no desktop (a Eme flutuante tem ~420px) precisa decidir
// pelo espaço que ELE tem, não pelo monitor - senão a tabela nasce larga
// dentro do painel e a pessoa rola de lado para ler uma linha.
//
//   const raiz = ref(null);
//   const { largura, estreito } = useLarguraElemento(raiz, 560);
//   <div ref="raiz"> ... <DataTable :layout="estreito ? 'cards' : 'auto'" />
import { ref, watch, onBeforeUnmount } from 'vue';

export function useLarguraElemento(elRef, limiar = 560) {
    const largura = ref(0);
    const estreito = ref(false);
    let obs = null;

    const medir = (el) => {
        const w = el?.getBoundingClientRect?.().width || 0;
        largura.value = w;
        estreito.value = w > 0 && w < limiar;
    };

    watch(elRef, (alvo) => {
        obs?.disconnect(); obs = null;
        // ref em componente entrega a instância; o nó é o $el
        const el = alvo?.$el ?? alvo;
        if (!el || typeof el.getBoundingClientRect !== 'function') return;
        medir(el);
        if (typeof ResizeObserver !== 'undefined') {
            obs = new ResizeObserver(() => medir(el));
            obs.observe(el);
        }
    }, { immediate: true });

    onBeforeUnmount(() => obs?.disconnect());
    return { largura, estreito };
}

export default useLarguraElemento;
