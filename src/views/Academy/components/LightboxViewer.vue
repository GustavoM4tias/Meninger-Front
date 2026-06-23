<template>
    <Teleport to="body">
        <Transition name="lb-fade">
            <div v-if="open" ref="rootEl" class="lb-root" @click.self="close" @wheel.prevent="onWheel" role="dialog"
                aria-modal="true" aria-label="Visualizador de imagem">
                <!-- Barra de ações -->
                <div class="lb-toolbar" @click.stop>
                    <span v-if="images.length > 1" class="lb-count">{{ index + 1 }} / {{ images.length }}</span>
                    <button type="button" class="lb-btn" title="Diminuir zoom (−)" @click="zoomBy(-0.3)">
                        <i class="fa-solid fa-magnifying-glass-minus"></i>
                    </button>
                    <button type="button" class="lb-btn lb-scale" title="Ajustar (0)" @click="resetView">
                        {{ Math.round(scale * 100) }}%
                    </button>
                    <button type="button" class="lb-btn" title="Aumentar zoom (+)" @click="zoomBy(0.3)">
                        <i class="fa-solid fa-magnifying-glass-plus"></i>
                    </button>
                    <button type="button" class="lb-btn" :title="isFs ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'"
                        @click="toggleFullscreen">
                        <i class="fa-solid" :class="isFs ? 'fa-compress' : 'fa-expand'"></i>
                    </button>
                    <a class="lb-btn" :href="current?.src" target="_blank" rel="noopener" title="Abrir original">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                    <button type="button" class="lb-btn" title="Fechar (Esc)" @click="close">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <!-- Navegação -->
                <button v-if="images.length > 1" type="button" class="lb-nav lb-prev" title="Anterior (←)"
                    @click.stop="go(-1)">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <button v-if="images.length > 1" type="button" class="lb-nav lb-next" title="Próxima (→)"
                    @click.stop="go(1)">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>

                <!-- Imagem -->
                <img v-if="current" :key="index" :src="current.src" :alt="current.alt || ''" class="lb-img"
                    :class="{ 'lb-grab': scale > 1, 'lb-grabbing': dragging }" :style="imgStyle"
                    draggable="false" @mousedown.prevent="onDown" @dblclick="onDblClick" @click.stop />

                <!-- Legenda -->
                <div v-if="current?.alt" class="lb-caption" @click.stop>{{ current.alt }}</div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    images: { type: Array, default: () => [] }, // [{ src, alt }]
    startIndex: { type: Number, default: 0 },
});
const emit = defineEmits(['update:open', 'close']);

const rootEl = ref(null);
const index = ref(0);
const scale = ref(1);
const tx = ref(0);
const ty = ref(0);
const dragging = ref(false);
const isFs = ref(false);

const current = computed(() => props.images[index.value] || null);
const imgStyle = computed(() => ({
    transform: `translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
    transition: dragging.value ? 'none' : 'transform .15s ease',
}));

function resetView() { scale.value = 1; tx.value = 0; ty.value = 0; }

function clampScale(v) { return Math.min(6, Math.max(1, v)); }
function zoomBy(d) {
    const next = clampScale(scale.value + d);
    if (next === 1) resetView();
    else scale.value = next;
}
function onWheel(e) { zoomBy(e.deltaY < 0 ? 0.3 : -0.3); }
function onDblClick() { scale.value > 1 ? resetView() : (scale.value = 2.4); }

function go(dir) {
    if (!props.images.length) return;
    index.value = (index.value + dir + props.images.length) % props.images.length;
    resetView();
}

// ── Pan (arrastar quando ampliado) ───────────────────────────────────
let start = null;
function onDown(e) {
    if (scale.value <= 1) return;
    dragging.value = true;
    start = { x: e.clientX - tx.value, y: e.clientY - ty.value };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
}
function onMove(e) {
    if (!dragging.value || !start) return;
    tx.value = e.clientX - start.x;
    ty.value = e.clientY - start.y;
}
function onUp() {
    dragging.value = false;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
}

// ── Tela cheia ────────────────────────────────────────────────────────
function toggleFullscreen() {
    const el = rootEl.value;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => { });
    else document.exitFullscreen?.().catch(() => { });
}
function onFsChange() { isFs.value = !!document.fullscreenElement; }

// ── Teclado ───────────────────────────────────────────────────────────
function onKey(e) {
    if (!props.open) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === '+' || e.key === '=') zoomBy(0.3);
    else if (e.key === '-' || e.key === '_') zoomBy(-0.3);
    else if (e.key === '0') resetView();
    else if (e.key.toLowerCase() === 'f') toggleFullscreen();
}

function close() {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => { });
    emit('update:open', false);
    emit('close');
}

watch(() => props.open, (v) => {
    if (v) {
        index.value = Math.min(Math.max(0, props.startIndex), Math.max(0, props.images.length - 1));
        resetView();
        document.documentElement.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        document.addEventListener('fullscreenchange', onFsChange);
    } else {
        document.documentElement.style.overflow = '';
        window.removeEventListener('keydown', onKey);
        document.removeEventListener('fullscreenchange', onFsChange);
        onUp();
    }
});

onBeforeUnmount(() => {
    document.documentElement.style.overflow = '';
    window.removeEventListener('keydown', onKey);
    document.removeEventListener('fullscreenchange', onFsChange);
    onUp();
});
</script>

<style scoped>
.lb-root {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgb(8 10 18 / 0.92);
    backdrop-filter: blur(4px);
    overscroll-behavior: contain;
}

.lb-img {
    max-width: 92vw;
    max-height: 86vh;
    border-radius: .5rem;
    box-shadow: 0 24px 70px -20px rgb(0 0 0 / 0.7);
    user-select: none;
    cursor: default;
    will-change: transform;
}

.lb-grab { cursor: grab; }
.lb-grabbing { cursor: grabbing; }

.lb-toolbar {
    position: fixed;
    top: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: .35rem;
    padding: .35rem;
    border-radius: 9999px;
    background: rgb(15 23 42 / 0.7);
    border: 1px solid rgb(255 255 255 / 0.12);
    backdrop-filter: blur(8px);
}

.lb-count {
    padding: 0 .6rem;
    font-size: .8rem;
    font-variant-numeric: tabular-nums;
    color: rgb(203 213 225);
}

.lb-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.1rem;
    height: 2.1rem;
    padding: 0 .5rem;
    border-radius: 9999px;
    font-size: .85rem;
    color: rgb(226 232 240);
    transition: background-color .15s ease, color .15s ease;
}

.lb-btn:hover { background: rgb(255 255 255 / 0.14); color: #fff; }
.lb-scale { font-size: .75rem; font-variant-numeric: tabular-nums; min-width: 3rem; }

.lb-nav {
    position: fixed;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border-radius: 9999px;
    color: rgb(226 232 240);
    background: rgb(15 23 42 / 0.6);
    border: 1px solid rgb(255 255 255 / 0.12);
    transition: background-color .15s ease;
}

.lb-nav:hover { background: rgb(15 23 42 / 0.9); color: #fff; }
.lb-prev { left: 1rem; }
.lb-next { right: 1rem; }

.lb-caption {
    position: fixed;
    bottom: 1.1rem;
    left: 50%;
    transform: translateX(-50%);
    max-width: 80vw;
    padding: .5rem 1rem;
    border-radius: .75rem;
    font-size: .85rem;
    line-height: 1.4;
    text-align: center;
    color: rgb(226 232 240);
    background: rgb(15 23 42 / 0.7);
    border: 1px solid rgb(255 255 255 / 0.1);
    backdrop-filter: blur(8px);
}

.lb-fade-enter-active,
.lb-fade-leave-active { transition: opacity .18s ease; }

.lb-fade-enter-from,
.lb-fade-leave-to { opacity: 0; }
</style>
