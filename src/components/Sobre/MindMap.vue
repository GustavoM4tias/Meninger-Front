<script setup>
/**
 * MindMap — canvas de mapa mental com pan, zoom e ramos expansíveis.
 * ─────────────────────────────────────────────────────────────────────────────
 * Recebe a árvore de `aboutOffice.js` e desenha uma árvore horizontal: o nó pai
 * à esquerda, os filhos à direita, ligados por curvas. Cada nó com filhos abre e
 * fecha no clique; fechado, mostra no selo quantos itens existem dentro dele.
 *
 * O layout é calculado em duas fases porque a altura de cada cartão depende do
 * texto: primeiro renderizamos na posição conhecida, depois medimos o DOM e
 * reposicionamos. `measure()` roda em nextTick a cada mudança de abertura.
 */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

const props = defineProps({
    tree: { type: Object, required: true },
    // Títulos (nível 1 e 2) que já nascem abertos.
    initialOpen: { type: Array, default: () => [] },
});

const GAP_X = 44;        // distância horizontal entre pai e filho
const GAP_Y = 12;        // respiro vertical entre irmãos
const BRANCH_GAP = 26;   // respiro maior entre os ramos da raiz
const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
const FIT_SCALE_MAX = 1.4;   // teto do enquadramento automático (o zoom manual vai até MAX_SCALE)

// ─── Achatamento da árvore ────────────────────────────────────────────────────
// Cada nó ganha um id estável pelo caminho, para servir de chave do v-for e do
// mapa de posições sem depender de índice de array.
const openIds = ref(new Set());

const allNodes = computed(() => {
    const out = [];
    const walk = (node, depth, parentId, acc, path) => {
        const id = path.join('/');
        const item = {
            id, depth, parentId,
            node,
            acc: node.acc || acc || 'var(--map-default)',
            childCount: countAll(node),
        };
        out.push(item);
        (node.c || []).forEach((child, i) => walk(child, depth + 1, id, item.acc, [...path, i]));
    };
    walk(props.tree, 0, null, null, ['r']);
    return out;
});

function countAll(node) {
    return (node.c || []).reduce((acc, child) => acc + 1 + countAll(child), 0);
}

const byId = computed(() => new Map(allNodes.value.map(n => [n.id, n])));

/** Um nó aparece quando todos os seus ancestrais estão abertos. */
const visibleNodes = computed(() => {
    const map = byId.value;
    return allNodes.value.filter(n => {
        let p = n.parentId;
        while (p) {
            if (!openIds.value.has(p)) return false;
            p = map.get(p)?.parentId ?? null;
        }
        return true;
    });
});

function toggle(item) {
    if (!item.node.c?.length) return;
    const next = new Set(openIds.value);
    next.has(item.id) ? next.delete(item.id) : next.add(item.id);
    openIds.value = next;
}

function expandAll() {
    openIds.value = new Set(allNodes.value.filter(n => n.node.c?.length).map(n => n.id));
    remeasureAndFit();
}

function collapseAll() {
    // Mantém só a raiz aberta: os 5 ramos ficam visíveis, o resto recolhe.
    openIds.value = new Set(['r']);
    remeasureAndFit();
}

function applyInitialOpen() {
    const wanted = new Set(props.initialOpen);
    openIds.value = new Set(
        allNodes.value
            .filter(n => n.node.c?.length && (n.depth === 0 || wanted.has(n.node.t)))
            .map(n => n.id)
    );
}

// ─── Medição e posicionamento ─────────────────────────────────────────────────
const els = new Map();          // id -> HTMLElement
const box = ref({ w: 0, h: 0 });
const pos = ref(new Map());     // id -> { x, y, w, h }

function setEl(id, el) {
    if (el) els.set(id, el);
    else els.delete(id);
}

function measure() {
    const sizes = new Map();
    for (const item of visibleNodes.value) {
        const el = els.get(item.id);
        if (!el) return;   // ainda não renderizou: a próxima chamada resolve
        // Oculto (a tela começa no modo lista) mede zero. Sair agora evita gravar
        // um layout achatado; o ResizeObserver remede quando o mapa aparece.
        if (!el.offsetWidth) return;
        sizes.set(item.id, { w: el.offsetWidth, h: el.offsetHeight });
    }

    const childrenOf = new Map();
    for (const item of visibleNodes.value) {
        if (!item.parentId) continue;
        if (!childrenOf.has(item.parentId)) childrenOf.set(item.parentId, []);
        childrenOf.get(item.parentId).push(item);
    }

    const next = new Map();
    const place = (item, x, top) => {
        const size = sizes.get(item.id);
        const kids = childrenOf.get(item.id) || [];
        const gap = item.depth === 0 ? BRANCH_GAP : GAP_Y;

        if (!kids.length) {
            next.set(item.id, { x, y: top, ...size });
            return size.h;
        }
        let cursor = top, total = 0;
        kids.forEach((kid, i) => {
            const h = place(kid, x + size.w + GAP_X, cursor);
            cursor += h + gap;
            total += h + (i ? gap : 0);
        });
        next.set(item.id, { x, y: top + total / 2 - size.h / 2, ...size });
        return Math.max(total, size.h);
    };

    const root = visibleNodes.value[0];
    if (!root) return;
    const height = place(root, 0, 0);
    const width = Math.max(...[...next.values()].map(p => p.x + p.w));

    pos.value = next;
    box.value = { w: width, h: height };
}

const links = computed(() => {
    const out = [];
    for (const item of visibleNodes.value) {
        if (!item.parentId) continue;
        const a = pos.value.get(item.parentId);
        const b = pos.value.get(item.id);
        if (!a || !b) continue;
        const x1 = a.x + a.w, y1 = a.y + a.h / 2;
        const x2 = b.x, y2 = b.y + b.h / 2;
        const mx = (x1 + x2) / 2;
        out.push({ id: item.id, acc: item.acc, d: `M${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}` });
    }
    return out;
});

// ─── Pan e zoom ───────────────────────────────────────────────────────────────
const viewport = ref(null);
const view = ref({ x: 0, y: 0, k: 1 });
const dragging = ref(false);
const pointers = new Map();
let panStart = null, pinchStart = null, movedBy = 0;

/**
 * Enquadra a árvore no viewport. Diferente do "caber", aqui o mapa também CRESCE
 * quando sobra espaço (até FIT_SCALE_MAX): recolhido são poucos cartões, e a 1:1
 * eles ficavam perdidos no meio de um canvas de 62vh.
 */
function fit(padding = 32) {
    const vp = viewport.value;
    if (!vp || !box.value.w) return;
    const raw = Math.min(
        (vp.clientWidth - padding * 2) / box.value.w,
        (vp.clientHeight - padding * 2) / box.value.h,
    );
    const k = Math.min(FIT_SCALE_MAX, Math.max(MIN_SCALE, raw));
    // Centraliza; quando a árvore é maior que o viewport a conta fica negativa e
    // o padding assume, ancorando na raiz em vez de cortar o começo do mapa.
    view.value = {
        k,
        x: Math.max(padding, (vp.clientWidth - box.value.w * k) / 2),
        y: Math.max(padding, (vp.clientHeight - box.value.h * k) / 2),
    };
}

function zoomBy(factor, cx, cy) {
    const vp = viewport.value;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const px = cx ?? rect.width / 2;
    const py = cy ?? rect.height / 2;
    const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.value.k * factor));
    view.value = {
        k,
        x: px - (px - view.value.x) * k / view.value.k,
        y: py - (py - view.value.y) * k / view.value.k,
    };
}

function onPointerDown(e) {
    // Só captura o arrasto no fundo do canvas ou com dois dedos; o clique no
    // cartão continua chegando ao nó.
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedBy = 0;
    if (pointers.size === 1) {
        panStart = { x: e.clientX - view.value.x, y: e.clientY - view.value.y };
        dragging.value = true;
    } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = {
            dist: Math.hypot(a.x - b.x, a.y - b.y),
            k: view.value.k,
            cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2,
            x: view.value.x, y: view.value.y,
        };
    }
    // Sem setPointerCapture de propósito: capturar o ponteiro no viewport faria o
    // clique subsequente nascer nele, e não no cartão, matando o abrir/fechar.
}

function onPointerMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 1 && panStart) {
        const nx = e.clientX - panStart.x, ny = e.clientY - panStart.y;
        movedBy += Math.abs(nx - view.value.x) + Math.abs(ny - view.value.y);
        view.value = { ...view.value, x: nx, y: ny };
    } else if (pointers.size === 2 && pinchStart) {
        movedBy += 10;
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const k = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStart.k * dist / pinchStart.dist));
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        view.value = {
            k,
            x: cx - (pinchStart.cx - pinchStart.x) * k / pinchStart.k,
            y: cy - (pinchStart.cy - pinchStart.y) * k / pinchStart.k,
        };
    }
}

function onPointerUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = null;
    if (pointers.size === 0) { panStart = null; dragging.value = false; }
}

function onWheel(e) {
    e.preventDefault();
    const rect = viewport.value.getBoundingClientRect();
    zoomBy(e.deltaY < 0 ? 1.12 : 0.89, e.clientX - rect.left, e.clientY - rect.top);
}

// Arrastar não deve virar clique no cartão.
function onNodeClick(item) {
    if (movedBy > 6) return;
    toggle(item);
}

watch(visibleNodes, () => nextTick(measure), { flush: 'post' });

/**
 * Mudança em massa (abrir/recolher tudo) reenquadra: recolher devolve a árvore
 * ao centro em vez de deixá-la onde o último pan parou. Abrir/fechar um ramo
 * sozinho NÃO passa por aqui de propósito - puxar a câmera a cada clique tira a
 * referência de onde a pessoa estava lendo.
 */
async function remeasureAndFit() {
    await nextTick();
    measure();
    await nextTick();
    fit();
}

let ro = null;
onMounted(async () => {
    applyInitialOpen();
    await nextTick();
    measure();
    await nextTick();
    fit();
    // Remede antes de reenquadrar: cobre tanto o redimensionamento da janela
    // quanto a volta do modo lista para o mapa, quando as medidas ainda são zero.
    ro = new ResizeObserver(() => { measure(); fit(); });
    if (viewport.value) ro.observe(viewport.value);
});
onBeforeUnmount(() => ro?.disconnect());

defineExpose({ expandAll, collapseAll, fit, zoomBy });
</script>

<template>
  <div
    ref="viewport"
    class="map-viewport relative w-full h-full overflow-hidden rounded-xl border border-line
           bg-surface-sunken touch-none select-none"
    :class="dragging ? 'cursor-grabbing' : 'cursor-grab'"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @wheel="onWheel">

    <!-- Malha de pontos: dá noção de deslocamento ao arrastar -->
    <div class="absolute inset-0 map-grid pointer-events-none"></div>

    <div class="absolute top-0 left-0 origin-top-left"
         :style="{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
                   width: box.w + 'px', height: box.h + 'px' }">

      <svg class="absolute top-0 left-0 overflow-visible pointer-events-none"
           :width="box.w || 1" :height="box.h || 1">
        <path v-for="l in links" :key="l.id" :d="l.d"
              fill="none" stroke-width="1.6" :stroke="l.acc" opacity="0.5" />
      </svg>

      <div v-for="item in visibleNodes" :key="item.id"
           :ref="el => setEl(item.id, el)"
           class="map-node absolute"
           :class="[
             `depth-${Math.min(item.depth, 4)}`,
             item.node.c?.length ? 'cursor-pointer' : 'cursor-default',
             openIds.has(item.id) ? 'is-open' : '',
           ]"
           :style="{ '--acc': item.acc,
                     left: (pos.get(item.id)?.x ?? 0) + 'px',
                     top: (pos.get(item.id)?.y ?? 0) + 'px' }"
           @click.stop="onNodeClick(item)">
        <p class="node-title">
          {{ item.node.t }}
          <span v-if="item.node.k" class="node-kpi">{{ item.node.k }}</span>
        </p>
        <p v-if="item.node.s" class="node-sub">{{ item.node.s }}</p>
        <span v-if="item.node.c?.length" class="node-count">
          <i v-if="openIds.has(item.id)" class="fas fa-minus text-[8px]"></i>
          <template v-else>{{ item.childCount }}</template>
        </span>
      </div>
    </div>

    <!-- Zoom flutuante -->
    <div class="absolute bottom-3 right-3 flex flex-col gap-1 rounded-lg border border-line
                bg-surface-raised/95 shadow-elevated backdrop-blur p-1">
      <button type="button" @click.stop="zoomBy(1.2)" aria-label="Aproximar"
              class="grid place-items-center h-9 w-9 rounded-md text-ink-muted hover:text-accent hover:bg-surface-sunken transition-colors">
        <i class="fas fa-plus text-xs"></i>
      </button>
      <button type="button" @click.stop="zoomBy(0.83)" aria-label="Afastar"
              class="grid place-items-center h-9 w-9 rounded-md text-ink-muted hover:text-accent hover:bg-surface-sunken transition-colors">
        <i class="fas fa-minus text-xs"></i>
      </button>
      <button type="button" @click.stop="fit()" aria-label="Centralizar"
              class="grid place-items-center h-9 w-9 rounded-md text-ink-muted hover:text-accent hover:bg-surface-sunken transition-colors">
        <i class="fas fa-compress text-xs"></i>
      </button>
    </div>

    <p class="absolute bottom-3 left-3 text-micro text-ink-subtle pointer-events-none hidden sm:block">
      Clique num cartão para abrir o ramo · arraste para mover · role para dar zoom
    </p>
  </div>
</template>

<style scoped>
.map-viewport { --map-default: rgb(var(--accent)); }

.map-grid {
  background-image: radial-gradient(circle, rgb(var(--ink) / 0.10) 1px, transparent 1px);
  background-size: 22px 22px;
}

.map-node {
  background: rgb(var(--surface-raised));
  border: 1px solid rgb(var(--line));
  border-left: 3px solid var(--acc);
  border-radius: 10px;
  padding: 7px 12px;
  /* width: max-content é obrigatório, não estético. O cartão é absoluto dentro de
     um wrapper que nasce com width: 0 (box.w só existe depois do measure). Sem
     largura própria, o shrink-to-fit resolve contra esse zero e cada cartão sai
     estreito e alto - e só se acertava quando o measure rodava de novo, no
     expandir/recolher. Com max-content a medida é a mesma na primeira pintura. */
  width: max-content;
  max-width: 260px;
  box-shadow: 0 1px 2px 0 rgb(15 23 42 / 0.06), 0 1px 3px 0 rgb(15 23 42 / 0.04);
  transition: box-shadow 150ms cubic-bezier(0.16, 1, 0.3, 1),
              border-color 150ms cubic-bezier(0.16, 1, 0.3, 1);
}
.map-node:hover { box-shadow: 0 4px 14px -3px rgb(15 23 42 / 0.14), 0 2px 6px -2px rgb(15 23 42 / 0.08); }

.node-title { font-size: 13px; font-weight: 600; line-height: 1.25; color: rgb(var(--ink)); }
.node-sub { font-size: 11px; line-height: 1.35; margin-top: 2px; color: rgb(var(--ink-muted)); }

.node-kpi {
  display: inline-block; margin-left: 6px; vertical-align: 1px; white-space: nowrap;
  font-size: 10.5px; font-weight: 700; color: var(--acc);
  background: color-mix(in srgb, var(--acc) 14%, transparent);
  border-radius: 6px; padding: 1px 6px;
}

.node-count {
  position: absolute; right: -9px; top: 50%; transform: translateY(-50%);
  min-width: 19px; height: 19px; padding: 0 4px;
  display: grid; place-items: center;
  font-size: 10px; font-weight: 700; font-variant-numeric: tabular-nums;
  color: #fff; background: var(--acc);
  border: 1px solid rgb(var(--surface-raised)); border-radius: 10px;
}
.map-node.is-open .node-count {
  color: var(--acc); background: rgb(var(--surface-raised)); border-color: var(--acc);
}

/* Raiz: único cartão com preenchimento cheio, para ancorar o olhar */
.map-node.depth-0 {
  max-width: 300px; padding: 14px 18px; border-radius: 14px;
  border: 1px solid rgb(var(--accent) / 0.4); border-left-width: 1px;
  background: linear-gradient(135deg, rgb(var(--accent) / 0.92), rgb(var(--accent) / 0.72));
}
.map-node.depth-0 .node-title { font-size: 18px; color: #fff; }
.map-node.depth-0 .node-sub { font-size: 11.5px; color: rgb(255 255 255 / 0.82); }

.map-node.depth-1 { max-width: 250px; padding: 9px 14px; }
.map-node.depth-1 .node-title { font-size: 14px; color: var(--acc); }

.map-node.depth-3, .map-node.depth-4 { max-width: 280px; border-radius: 8px; padding: 6px 10px; }
.map-node.depth-3 .node-title, .map-node.depth-4 .node-title { font-size: 12px; font-weight: 500; }
.map-node.depth-3 .node-sub, .map-node.depth-4 .node-sub { font-size: 10.5px; }
</style>
