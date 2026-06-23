<script setup>
// Painel flutuante do mural. Montado no OfficeShell; visibilidade controlada pelo
// muralStore (panelOpen). Flutua sozinho quando chega algo novo que exige ciência,
// e também abre/fecha ao clicar no ícone do mural na nav (MuralBell).
//
// Mostra os comunicados ativos do usuário (pendentes de ciência primeiro), com
// "Li e estou ciente" onde aplicável. Sempre dá feedback ao abrir: se não houver
// nenhum aviso (ou se a carga falhar), exibe um estado vazio. Arrastável.

import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useMuralStore } from '@/stores/Mural/muralStore';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import { kindMeta, formatDateTime } from '@/utils/Mural/muralFormat';

const store = useMuralStore();
const router = useRouter();
const idx = ref(0);
const ackingId = ref(null);

const open = computed(() => store.panelOpen);
const list = computed(() => {
    const arr = store.items.slice();
    arr.sort((a, b) => {
        const ap = (a.requiresAck && !a.acked) ? 0 : 1;
        const bp = (b.requiresAck && !b.acked) ? 0 : 1;
        if (ap !== bp) return ap - bp;                                  // pendentes de ciência primeiro
        return (b.kind === 'URGENTE' ? 1 : 0) - (a.kind === 'URGENTE' ? 1 : 0);
    });
    return arr;
});
const total = computed(() => list.value.length);
const current = computed(() => (total.value ? list.value[Math.min(idx.value, total.value - 1)] : null));
const meta = computed(() => (current.value ? kindMeta(current.value.kind) : null));

// ─── Posição / drag ──────────────────────────────────────────────────────────
const POS_KEY = 'mural.float.pos';
const rootEl = ref(null);
const pos = ref({ x: 0, y: 64 });
const dragging = ref(false);
let drag = null;

const floatStyle = computed(() => ({ left: `${pos.value.x}px`, top: `${pos.value.y}px` }));

function navBottom() {
    const nav = document.querySelector('nav');
    const b = nav ? nav.getBoundingClientRect().bottom : 52;
    return Math.max(8, Math.round(b) + 6);
}
function defaultPos() {
    return { x: Math.max(8, window.innerWidth - 320), y: navBottom() }; // superior-direito (perto do ícone)
}
function clampXY(x, y) {
    const el = rootEl.value;
    const w = el ? el.offsetWidth : 304;
    const h = el ? el.offsetHeight : 160;
    const minX = 8;
    const minY = navBottom();
    const maxX = Math.max(minX, window.innerWidth - w - 8);
    const maxY = Math.max(minY, window.innerHeight - h - 8);
    return { x: Math.min(Math.max(x, minX), maxX), y: Math.min(Math.max(y, minY), maxY) };
}
function applyClamp() { pos.value = clampXY(pos.value.x, pos.value.y); }
function savePos() { try { localStorage.setItem(POS_KEY, JSON.stringify(pos.value)); } catch { /* noop */ } }

function startDrag(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { px: e.clientX, py: e.clientY, ox: pos.value.x, oy: pos.value.y, moved: false };
    dragging.value = true;
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
}
function onDragMove(e) {
    if (!drag) return;
    const dx = e.clientX - drag.px;
    const dy = e.clientY - drag.py;
    if (!drag.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) drag.moved = true;
    pos.value = clampXY(drag.ox + dx, drag.oy + dy);
}
function onDragEnd() {
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    dragging.value = false;
    if (drag?.moved) savePos();
    drag = null;
}
function onResize() { applyClamp(); }

watch(open, (v) => { if (v) requestAnimationFrame(applyClamp); });

onMounted(() => {
    if (!store.items.length) store.fetchMine();
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch { /* noop */ }
    pos.value = (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) ? saved : defaultPos();
    requestAnimationFrame(applyClamp);
    window.addEventListener('resize', onResize);
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
});

// ─── Ações ───────────────────────────────────────────────────────────────────
async function confirm() {
    const c = current.value;
    if (!c) return;
    ackingId.value = c.id;
    try { await store.ack(c.id); } finally { ackingId.value = null; }
}
function next() { if (idx.value < total.value - 1) idx.value++; }
function prev() { if (idx.value > 0) idx.value--; }
function goMural() { store.closePanel(); router.push('/mural'); }
</script>

<template>
  <transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0 -translate-y-1"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0 -translate-y-1">
    <div v-if="open" ref="rootEl" class="fixed z-40 print:hidden" :style="floatStyle">
      <div class="w-[20rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-line bg-surface-raised shadow-elevated surface-gradient overflow-hidden">
        <!-- Cabeçalho (handle de drag) -->
        <div
          class="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-line select-none touch-none"
          :class="dragging ? 'cursor-grabbing' : 'cursor-move'"
          @pointerdown="startDrag">
          <span class="flex items-center gap-2 text-xs font-semibold text-ink-muted">
            <i class="fas fa-bullhorn"></i> Mural de avisos
            <span v-if="total > 1" class="text-ink-subtle font-normal tabular-nums">· {{ Math.min(idx + 1, total) }}/{{ total }}</span>
          </span>
          <button
            class="h-6 w-6 grid place-items-center rounded-md text-ink-subtle hover:bg-surface-sunken hover:text-ink transition-colors shrink-0"
            aria-label="Fechar" @pointerdown.stop @click="store.closePanel()">
            <i class="fas fa-xmark text-xs"></i>
          </button>
        </div>

        <!-- Carregando -->
        <div v-if="store.loading && !total" class="p-6 grid place-items-center text-ink-subtle">
          <i class="fas fa-circle-notch fa-spin"></i>
        </div>

        <!-- Comunicado atual -->
        <div v-else-if="current" class="px-3.5 py-3">
          <div class="flex items-center gap-1.5 flex-wrap mb-1.5">
            <Badge :variant="meta.badge" size="sm"><i :class="meta.icon"></i> {{ meta.label }}</Badge>
            <Badge v-if="current.pinned" variant="accent" size="sm"><i class="fas fa-thumbtack"></i></Badge>
            <Badge v-if="current.acked" variant="success" size="sm"><i class="fas fa-check"></i> Ciente</Badge>
          </div>
          <h3 class="text-sm font-semibold text-ink leading-snug">{{ current.title }}</h3>
          <p class="mt-1 text-xs text-ink-muted whitespace-pre-line leading-relaxed line-clamp-3">{{ current.body }}</p>

          <div class="mt-3 flex items-center justify-between gap-2">
            <div class="flex items-center gap-3 min-w-0">
              <Button
                v-if="current.requiresAck && !current.acked"
                variant="primary" size="sm" icon="fas fa-check"
                :loading="ackingId === current.id" @click="confirm">
                Li e estou ciente
              </Button>
              <span v-else-if="current.acked" class="text-[11px] text-emerald-600 dark:text-emerald-400 truncate">
                <i class="fas fa-circle-check"></i> Confirmado {{ formatDateTime(current.ackedAt) }}
              </span>
              <button class="text-xs text-accent hover:underline shrink-0" @click="goMural">Ver mural</button>
            </div>
            <div v-if="total > 1" class="flex items-center gap-0.5 text-xs text-ink-subtle shrink-0">
              <button
                class="h-6 w-6 grid place-items-center rounded hover:bg-surface-sunken disabled:opacity-40"
                :disabled="idx === 0" aria-label="Anterior" @click="prev"><i class="fas fa-chevron-left"></i></button>
              <button
                class="h-6 w-6 grid place-items-center rounded hover:bg-surface-sunken disabled:opacity-40"
                :disabled="idx >= total - 1" aria-label="Próximo" @click="next"><i class="fas fa-chevron-right"></i></button>
            </div>
          </div>
        </div>

        <!-- Vazio / erro -->
        <div v-else class="px-4 py-6 text-center">
          <div class="w-10 h-10 rounded-2xl bg-surface-sunken border border-line grid place-items-center mx-auto mb-2 text-ink-subtle">
            <i :class="store.error ? 'fas fa-triangle-exclamation' : 'fas fa-check'"></i>
          </div>
          <p class="text-sm text-ink">{{ store.error ? 'Não foi possível carregar os avisos.' : 'Você está em dia.' }}</p>
          <p class="text-xs text-ink-subtle mt-0.5">{{ store.error ? 'Tente novamente em instantes.' : 'Nenhum aviso ativo no momento.' }}</p>
          <button class="mt-3 text-xs text-accent hover:underline" @click="goMural">Ver mural</button>
        </div>
      </div>
    </div>
  </transition>
</template>
