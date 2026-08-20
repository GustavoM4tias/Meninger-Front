/**
 * useCountUp — o número contando até o valor.
 * ─────────────────────────────────────────────────────────────────────────────
 * É o movimento de maior efeito no Office e o de menor risco: nada de camada
 * translúcida, nada atrás do conteúdo. O próprio dado se anuncia.
 *
 * Conta na PRIMEIRA aparição e a cada vez que o valor muda de verdade (filtro
 * novo, mês novo). Não conta em re-render à toa.
 *
 *   const bruto = computed(() => store.vgv);
 *   const { display, counting } = useCountUp(bruto, { duration: 900 });
 *   // no template: {{ fmtBRL(display) }} com :class="{ 'metric-counting': counting }"
 *
 * Respeita `prefers-reduced-motion`: quem pediu menos movimento recebe o valor
 * final direto, sem animação.
 */
import { ref, watch, onBeforeUnmount, unref } from 'vue';

const prefersReduced = () =>
    typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

/* easeOutExpo: a mesma curva do resto do sistema (ease-out-expo). Sobe rápido
   e assenta devagar, que é o que faz parecer que o número "chegou". */
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export function useCountUp(source, options = {}) {
    const {
        duration = 800,
        /* abaixo disso não vale a pena animar: conta rápido demais para ser lido */
        minDelta = 0,
        /* casas decimais do valor intermediário (o formatador cuida do resto) */
        decimals = 0,
    } = options;

    const display = ref(Number(unref(source)) || 0);
    const counting = ref(false);
    let raf = null;

    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } counting.value = false; };

    function run(from, to) {
        stop();
        if (prefersReduced() || Math.abs(to - from) <= minDelta || !isFinite(to)) {
            display.value = to;
            return;
        }
        const t0 = performance.now();
        counting.value = true;
        const step = (now) => {
            const p = Math.min(1, (now - t0) / duration);
            const v = from + (to - from) * easeOutExpo(p);
            display.value = decimals ? Number(v.toFixed(decimals)) : Math.round(v);
            if (p < 1) raf = requestAnimationFrame(step);
            else { display.value = to; counting.value = false; raf = null; }
        };
        raf = requestAnimationFrame(step);
    }

    watch(
        () => Number(unref(source)),
        (novo, velho) => {
            if (!isFinite(novo)) { display.value = 0; return; }
            /* Primeira aparição conta do zero; mudança depois conta do valor
               anterior, para a variação ficar legível. */
            run(velho == null || !isFinite(velho) ? 0 : Number(display.value), novo);
        },
        { immediate: true },
    );

    onBeforeUnmount(stop);

    return { display, counting };
}

export default useCountUp;
