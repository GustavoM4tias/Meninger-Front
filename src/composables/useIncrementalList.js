/**
 * useIncrementalList — a lista cresce conforme se rola, de 50 em 50.
 * ─────────────────────────────────────────────────────────────────────────────
 * Substitui a paginação em listagem longa. Paginar obriga a decidir "quantos
 * por página" e depois caçar o registro entre páginas; rolar é o gesto natural
 * e não pede decisão nenhuma.
 *
 * O passo é de 50 de propósito: renderizar 1.000 linhas de uma vez trava o
 * aparelho da diretoria, e passos pequenos demais fazem a rolagem engasgar.
 *
 *   const inc = useIncrementalList(filtrados, { step: 50 });
 *
 *   <div v-for="p in inc.visiveis.value" ...>
 *   <div ref="inc.sentinela" />        <!-- gatilho no fim da lista -->
 *
 * A sentinela é observada com IntersectionObserver: quando ela entra na tela,
 * mais um passo é liberado. `root` é o container que rola (o corpo do modal,
 * não a janela).
 *
 * GARANTIA DE CARREGAR TUDO: além do observer, há um `watch` que verifica se a
 * sentinela continua visível depois de crescer. É o caso do passo que não
 * preencheu a tela - sem isso a lista para no meio e parece que acabou.
 */
import { ref, computed, watch, onBeforeUnmount, nextTick } from 'vue';

export const STEP_PADRAO = 50;

export function useIncrementalList(items, options = {}) {
    const { step = STEP_PADRAO, root = null } = options;

    const limite = ref(step);
    const sentinela = ref(null);
    let observer = null;

    const lista = computed(() => (Array.isArray(items.value) ? items.value : []));
    const total = computed(() => lista.value.length);
    const visiveis = computed(() => lista.value.slice(0, limite.value));
    const restantes = computed(() => Math.max(0, total.value - limite.value));
    const acabou = computed(() => restantes.value === 0);

    function carregarMais() {
        if (acabou.value) return;
        limite.value = Math.min(total.value, limite.value + step);
    }

    /* Lista nova (filtro, busca) = volta ao primeiro passo. Continuar em 500
       itens depois de trocar o filtro é renderizar à toa. */
    watch(total, () => { limite.value = step; });

    /* Depois de crescer, confere se a sentinela AINDA está visível: um passo
       que não encheu a tela nunca dispararia o observer de novo, e a lista
       pararia no meio parecendo que acabou. */
    watch(limite, async () => {
        await nextTick();
        const el = sentinela.value;
        if (!el || acabou.value) return;
        const caixa = el.getBoundingClientRect();
        const alturaRef = root?.value
            ? root.value.getBoundingClientRect().bottom
            : (typeof window !== 'undefined' ? window.innerHeight : 0);
        if (caixa.top <= alturaRef) carregarMais();
    });

    function observar(el) {
        sentinela.value = el;
        observer?.disconnect();
        if (!el || typeof IntersectionObserver === 'undefined') return;
        observer = new IntersectionObserver((entradas) => {
            if (entradas.some((e) => e.isIntersecting)) carregarMais();
        }, {
            root: root?.value || null,
            /* Dispara ANTES de chegar no fim: o próximo passo já está montado
               quando a pessoa alcança o rodapé, então a rolagem não trava. */
            rootMargin: '400px 0px',
        });
        observer.observe(el);
    }

    onBeforeUnmount(() => observer?.disconnect());

    return { visiveis, total, restantes, acabou, limite, carregarMais, observar, step };
}

export default useIncrementalList;
