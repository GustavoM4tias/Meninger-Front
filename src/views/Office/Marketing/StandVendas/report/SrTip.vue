<script setup>
/**
 * A dica flutuante das telas do Stand de Vendas.
 *
 * Qualquer elemento com `data-tip` (HTML permitido: o chamador escapa o que
 * vem do cadastro) mostra a dica ao passar o mouse, e também ao receber foco
 * pelo teclado. Um só ouvinte no documento serve a página e os modais.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';
import './standReport.css';

const tip = ref({ on: false, html: '', x: 0, y: 0 });

function place(x, y) {
    const w = 280;
    tip.value.x = Math.max(8, Math.min(x + 14, window.innerWidth - w - 8));
    tip.value.y = Math.min(y + 18, window.innerHeight - 60);
}
function onMove(e) {
    const el = e.target?.closest?.('[data-tip]');
    if (!el || !el.dataset.tip) { tip.value.on = false; return; }
    tip.value.html = el.dataset.tip;
    tip.value.on = true;
    place(e.clientX, e.clientY);
}
function onFocus(e) {
    const el = e.target?.closest?.('[data-tip]');
    if (!el || !el.dataset.tip) { tip.value.on = false; return; }
    const r = el.getBoundingClientRect();
    tip.value.html = el.dataset.tip;
    tip.value.on = true;
    place(r.left, r.bottom - 10);
}
const hide = () => { tip.value.on = false; };

onMounted(() => {
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('focusin', onFocus);
    document.addEventListener('scroll', hide, { passive: true, capture: true });
});
onBeforeUnmount(() => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('focusin', onFocus);
    document.removeEventListener('scroll', hide, { capture: true });
});
</script>

<template>
    <Teleport to="body">
        <div class="sr sr-tip" :class="{ on: tip.on }" :style="{ left: tip.x + 'px', top: tip.y + 'px' }"
            role="tooltip" v-html="tip.html"></div>
    </Teleport>
</template>

<style>
.sr-tip {
    position: fixed; z-index: 10050; pointer-events: none; max-width: 280px;
    background: var(--sr-ink); color: var(--sr-paper); font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-size: 12.5px; line-height: 1.45; padding: 7px 10px; border-radius: 8px;
    box-shadow: 0 10px 28px rgba(12, 20, 38, 0.25); opacity: 0; transform: translateY(2px);
    transition: opacity 0.12s, transform 0.12s;
}
.sr-tip.on { opacity: 1; transform: none; }
.sr-tip > b { display: block; font-family: inherit; font-weight: 600; }
.sr-tip .t b, .sr-tip b + b { font-family: var(--sr-mono); font-weight: 500; }
.sr-tip .t { display: block; color: var(--sr-sunken); opacity: 0.8; font-size: 11.5px; margin-top: 2px; }
@media (hover: none) { .sr-tip { display: none; } }
</style>
