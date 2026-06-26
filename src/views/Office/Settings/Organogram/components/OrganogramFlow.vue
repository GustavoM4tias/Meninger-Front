<script setup>
import { computed, ref, watch } from 'vue';
import { VueFlow, Position, MarkerType, useVueFlow } from '@vue-flow/core';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

const props = defineProps({
  rootNode: { type: Object, required: true },
  selectedId: { type: [Number, String], default: null },
  editMode: { type: Boolean, default: false },
  overrideMap: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['select', 'update-position']);

// Posição arrastada localmente (id -> {x,y}). Aplicada com prioridade máxima no
// buildGraph para o card não "voltar" enquanto o PUT ao backend vai e volta.
const localPos = ref({});

function hasOverride(id) {
  const ov = props.overrideMap?.[id];
  return !!(ov && (ov.display_parent_id != null || ov.display_order != null
    || ov.pos_x != null || ov.pos_y != null));
}

// ── Layout: Reingold-Tilford simplificado (top-down por subárvore) ──
const NODE_W = 220;
const NODE_H = 92;
const H_GAP = 24;
const V_GAP = 70;

function computeWidth(node) {
  if (!node.children || node.children.length === 0) {
    node._w = NODE_W;
    return NODE_W;
  }
  let total = 0;
  node.children.forEach((c, i) => {
    const w = computeWidth(c);
    total += w;
    if (i > 0) total += H_GAP;
  });
  node._w = Math.max(NODE_W, total);
  return node._w;
}

function placeSubtree(node, x, y, level = 0) {
  // Centraliza o nó horizontalmente sobre sua subárvore
  node._x = x + node._w / 2 - NODE_W / 2;
  node._y = y;
  node._level = level;

  if (!node.children || node.children.length === 0) return;

  let cursor = x;
  node.children.forEach((child, i) => {
    if (i > 0) cursor += H_GAP;
    placeSubtree(child, cursor, y + NODE_H + V_GAP, level + 1);
    cursor += child._w;
  });
}

function buildGraph(rootNode) {
  const root = JSON.parse(JSON.stringify(rootNode));
  computeWidth(root);
  placeSubtree(root, 0, 0);

  const nodes = [];
  const edges = [];
  function walk(node, parentId = null) {
    // Precedência da posição: arrasto local > posição salva (override) > auto-layout.
    // Nó-raiz "empresa" usa a chave sentinela 0 (não tem user id).
    const oid = node.type === 'company' ? 0 : node.data?.id;
    const lp = oid != null ? localPos.value[oid] : null;
    const ov = oid != null ? props.overrideMap?.[oid] : null;
    const position = lp
      ? { x: lp.x, y: lp.y }
      : (ov && ov.pos_x != null && ov.pos_y != null)
        ? { x: ov.pos_x, y: ov.pos_y }
        : { x: node._x, y: node._y };

    nodes.push({
      id: node.key,
      position,
      data: {
        ...node.data, level: node._level, hasChildren: !!(node.children?.length),
        editing: props.editMode, adjusted: oid != null && hasOverride(oid),
      },
      type: node.type === 'company' ? 'company' : 'person',
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });
    if (parentId) {
      edges.push({
        id: `e-${parentId}-${node.key}`,
        source: parentId,
        target: node.key,
        type: 'smoothstep',
        animated: false,
        class: 'org-edge',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 12, height: 12 },
      });
    }
    (node.children || []).forEach(c => walk(c, node.key));
  }
  walk(root);
  return { nodes, edges };
}

const graph = computed(() => buildGraph(props.rootNode));
const nodes = computed(() => graph.value.nodes);
const edges = computed(() => graph.value.edges);

// ── Path highlighting ──────────────────────────────
// Quando seleciona, destaca o caminho da raiz até o selecionado
function findPath(node, targetId, path = []) {
  if (!node) return null;
  const newPath = [...path, node.key];
  if (String(node.data.id) === String(targetId)) return newPath;
  for (const child of (node.children || [])) {
    const found = findPath(child, targetId, newPath);
    if (found) return found;
  }
  return null;
}

const highlightedNodeIds = computed(() => {
  if (!props.selectedId) return new Set();
  const path = findPath(props.rootNode, props.selectedId);
  return new Set(path || []);
});

const highlightedEdgeIds = computed(() => {
  if (!props.selectedId) return new Set();
  const path = findPath(props.rootNode, props.selectedId);
  if (!path) return new Set();
  const ids = new Set();
  for (let i = 0; i < path.length - 1; i++) {
    ids.add(`e-${path[i]}-${path[i + 1]}`);
  }
  return ids;
});

const decoratedNodes = computed(() =>
  nodes.value.map(n => ({
    ...n,
    class: highlightedNodeIds.value.size === 0
      ? 'org-node'
      : (highlightedNodeIds.value.has(n.id) ? 'org-node is-highlight' : 'org-node is-dim'),
  }))
);

const decoratedEdges = computed(() =>
  edges.value.map(e => ({
    ...e,
    animated: highlightedEdgeIds.value.has(e.id),
    class: highlightedEdgeIds.value.size === 0
      ? 'org-edge'
      : (highlightedEdgeIds.value.has(e.id) ? 'org-edge is-highlight' : 'org-edge is-dim'),
  }))
);

// ── Vue Flow controls ──────────────────────────────
const { fitView, zoomIn, zoomOut } = useVueFlow();

function onNodeClick({ node }) {
  if (node.type === 'company') return;
  emit('select', node.data);
}

function onNodeDragStop({ node }) {
  if (!node) return;
  // Empresa (raiz) persiste sob a chave sentinela 0; pessoas sob o próprio id.
  const id = node.type === 'company' ? 0 : node.data?.id;
  if (id == null) return;
  const x = Math.round(node.position.x);
  const y = Math.round(node.position.y);
  // Fixa imediatamente para o card não voltar enquanto o backend confirma.
  localPos.value = { ...localPos.value, [id]: { x, y } };
  emit('update-position', { userId: id, x, y });
}

function handleFit() { fitView({ padding: 0.2, duration: 400 }); }

// Helpers visuais
function ringColorForLevel(level) {
  const colors = [
    'ring-blue-500/60',     // root
    'ring-indigo-500/50',   // level 1
    'ring-purple-500/45',   // level 2
    'ring-pink-500/40',     // level 3
    'ring-amber-500/40',    // level 4
    'ring-emerald-500/40',  // level 5+
  ];
  return colors[Math.min(level, colors.length - 1)];
}

function avatarBgForLevel(level) {
  const colors = [
    'bg-blue-500/10',
    'bg-indigo-500/10',
    'bg-purple-500/10',
    'bg-pink-500/10',
    'bg-amber-500/10',
    'bg-emerald-500/10',
  ];
  return colors[Math.min(level, colors.length - 1)];
}

// Conta descendentes diretos
function directCount(node) {
  return node?.children?.length ?? 0;
}

// Re-fit ao trocar de árvore. Limpa o cache de arrasto: mudanças estruturais
// (reparent/reorder/reset) reconstroem a árvore e a posição passa a vir do override
// (ou do auto-layout). Arrasto puro não troca o rootNode, então o cache persiste.
watch(() => props.rootNode, () => {
  localPos.value = {};
  setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 50);
});
</script>

<template>
  <div class="organogram-shell relative w-full h-full">

    <!-- Background animado -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden bg-surface">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
      <div class="grid-overlay"></div>
    </div>

    <VueFlow
      :nodes="decoratedNodes"
      :edges="decoratedEdges"
      :fit-view-on-init="true"
      :default-viewport="{ zoom: 0.65 }"
      :min-zoom="0.15"
      :max-zoom="2.5"
      :nodes-draggable="editMode"
      :nodes-connectable="false"
      :edges-updatable="false"
      :pan-on-drag="true"
      :zoom-on-double-click="false"
      :delete-key-code="null"
      class="organogram-flow"
      :class="{ 'is-editing': editMode }"
      @node-click="onNodeClick"
      @node-drag-stop="onNodeDragStop">

      <!-- Person node -->
      <template #node-person="{ data }">
        <div class="org-card-shell" :data-level="data.level">
          <div class="org-card" :class="{ 'is-editing': data.editing }">
            <!-- Marca de "ajustado" no modo edição -->
            <span v-if="data.editing && data.adjusted"
              class="absolute top-1.5 right-1.5 h-4 w-4 grid place-items-center rounded-full
                     bg-accent text-white text-[8px] shadow-soft z-10" title="Posição ajustada">
              <i class="fas fa-pen"></i>
            </span>
            <!-- Avatar com ring colorido por nível -->
            <div class="relative shrink-0">
              <img :src="data.image" :alt="data.name"
                class="org-avatar"
                :class="['ring-2 ring-offset-2 ring-offset-surface-raised', ringColorForLevel(data.level), avatarBgForLevel(data.level)]" />
              <span v-if="data.hasChildren"
                class="absolute -bottom-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full
                       bg-accent text-white text-[10px] font-bold border-2 border-surface-raised
                       grid place-items-center font-mono">
                {{ directCount({ children: data.hasChildren ? [1] : [] }) || 0 }}
              </span>
            </div>

            <!-- Info -->
            <div class="min-w-0 flex-1 text-left">
              <p class="text-sm font-semibold text-ink truncate leading-tight">{{ data.name }}</p>
              <p class="text-[11px] text-accent truncate font-medium leading-tight mt-0.5">{{ data.title }}</p>
              <p v-if="data.city" class="text-[10px] text-ink-subtle font-mono truncate flex items-center gap-1 mt-1">
                <i class="fas fa-location-dot text-[8px]"></i>{{ data.city }}
              </p>
            </div>
          </div>
        </div>
      </template>

      <!-- Company (root) -->
      <template #node-company="{ data }">
        <div class="org-card-shell company">
          <div class="company-card">
            <div class="company-icon">
              <img :src="data.image" :alt="data.name" class="invert" />
            </div>
            <p class="font-semibold text-sm text-white text-center leading-tight">{{ data.name }}</p>
            <p class="text-[11px] text-white/70 mt-1 font-mono flex items-center gap-1">
              <i class="fas fa-location-dot text-[9px]"></i>{{ data.city }}
            </p>
          </div>
        </div>
      </template>
    </VueFlow>

    <!-- Controles flutuantes -->
    <div class="absolute bottom-4 right-4 z-10 flex flex-col gap-1 p-1
                bg-surface-raised/95 backdrop-blur border border-line rounded-xl shadow-elevated">
      <button class="ctrl-btn" @click="zoomIn()" title="Aumentar zoom">
        <i class="fas fa-plus"></i>
      </button>
      <button class="ctrl-btn" @click="zoomOut()" title="Diminuir zoom">
        <i class="fas fa-minus"></i>
      </button>
      <div class="h-px bg-line my-0.5"></div>
      <button class="ctrl-btn" @click="handleFit()" title="Ajustar à tela">
        <i class="fas fa-expand"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ── Background animado ── */
.orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px);
  opacity: 0.4;
  pointer-events: none;
}
.orb-1 {
  top: -100px; left: 10%;
  width: 320px; height: 320px;
  background: radial-gradient(circle, rgb(var(--accent) / 0.5) 0%, transparent 70%);
  animation: drift-1 22s ease-in-out infinite;
}
.orb-2 {
  bottom: -100px; right: 10%;
  width: 380px; height: 380px;
  background: radial-gradient(circle, rgb(99 102 241 / 0.4) 0%, transparent 70%);
  animation: drift-2 26s ease-in-out infinite;
}
@keyframes drift-1 {
  0%,100% { transform: translate(0, 0) scale(1); }
  33%     { transform: translate(50px, 80px) scale(1.1); }
  66%     { transform: translate(-30px, 40px) scale(0.95); }
}
@keyframes drift-2 {
  0%,100% { transform: translate(0, 0) scale(1); }
  50%     { transform: translate(-60px, -50px) scale(1.08); }
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgb(var(--line) / 0.4) 1px, transparent 1px),
    linear-gradient(90deg, rgb(var(--line) / 0.4) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, black 30%, transparent 100%);
}

/* ── Vue Flow overrides ── */
.organogram-flow :deep(.vue-flow__pane) { cursor: grab; }
.organogram-flow :deep(.vue-flow__pane.dragging) { cursor: grabbing; }

.organogram-flow :deep(.vue-flow__node) {
  padding: 0; border: 0; background: transparent;
  border-radius: 0; box-shadow: none;
}
.organogram-flow :deep(.vue-flow__node.selected) { box-shadow: none; }
.organogram-flow :deep(.vue-flow__handle) { opacity: 0; pointer-events: none; }

.organogram-flow :deep(.vue-flow__edge-path) {
  stroke: rgb(var(--accent));
  stroke-width: 1.5;
  opacity: 0.5;
  transition: opacity 0.3s ease, stroke-width 0.3s ease;
}

/* Highlight de path */
.organogram-flow :deep(.org-edge.is-highlight .vue-flow__edge-path) {
  stroke: rgb(var(--accent));
  stroke-width: 2.5;
  opacity: 1;
  filter: drop-shadow(0 0 6px rgb(var(--accent) / 0.6));
}
.organogram-flow :deep(.org-edge.is-dim .vue-flow__edge-path) {
  opacity: 0.15;
}

/* Animação dos edges destacados */
.organogram-flow :deep(.vue-flow__edge.animated .vue-flow__edge-path) {
  stroke-dasharray: 6 4;
  animation: dash 1.2s linear infinite;
}
@keyframes dash {
  to { stroke-dashoffset: -20; }
}

/* ── Cards ── */
.org-card-shell {
  animation: card-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  transition: transform 0.18s ease, opacity 0.3s ease, filter 0.3s ease;
}

/* Stagger por nível (CSS based em data attribute) */
.org-card-shell[data-level="0"] { animation-delay: 0ms; }
.org-card-shell[data-level="1"] { animation-delay: 80ms; }
.org-card-shell[data-level="2"] { animation-delay: 160ms; }
.org-card-shell[data-level="3"] { animation-delay: 240ms; }
.org-card-shell[data-level="4"] { animation-delay: 320ms; }
.org-card-shell[data-level="5"] { animation-delay: 400ms; }

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.org-card-shell:hover { transform: translateY(-2px); }

/* Highlight / dim states */
:deep(.org-node.is-highlight) .org-card-shell {
  filter: drop-shadow(0 0 12px rgb(var(--accent) / 0.45));
}
:deep(.org-node.is-dim) .org-card-shell {
  opacity: 0.35;
  filter: grayscale(0.5);
}

.org-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.875rem;
  width: 220px;
  background: rgb(var(--surface-raised));
  border: 1px solid rgb(var(--line));
  border-radius: 14px;
  box-shadow:
    0 1px 2px rgb(15 23 42 / 0.06),
    0 4px 14px -3px rgb(15 23 42 / 0.08);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
  position: relative;
  overflow: hidden;
}

/* Surface gradient sutil em cada card */
.org-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgb(255 255 255 / 0.5), transparent 50%);
  pointer-events: none;
}
.dark .org-card::before {
  background: linear-gradient(to bottom, rgb(255 255 255 / 0.025), transparent 50%);
}

.org-card-shell:hover .org-card {
  border-color: rgb(var(--accent) / 0.5);
  box-shadow:
    0 4px 16px -3px rgb(var(--accent) / 0.25),
    0 0 0 3px rgb(var(--accent) / 0.08);
}

.org-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  object-fit: cover;
}

/* Modo edição: cards arrastáveis */
.organogram-flow.is-editing :deep(.vue-flow__node) { cursor: move; }
.org-card.is-editing {
  border-style: dashed;
  border-color: rgb(var(--accent) / 0.45);
}

/* ── Company (root) ── */
.company-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.125rem 1.25rem;
  width: 240px;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #6366f1 100%);
  background-size: 200% 200%;
  border-radius: 16px;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1) inset,
    0 4px 24px rgba(59, 130, 246, 0.4);
  position: relative;
  overflow: hidden;
  animation: company-glow 6s ease-in-out infinite;
}

@keyframes company-glow {
  0%,100% { background-position: 0% 50%; }
  50%     { background-position: 100% 50%; }
}

.company-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.18), transparent 60%);
  pointer-events: none;
}

.company-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  margin-bottom: 0.625rem;
  position: relative;
}
.company-icon img {
  width: 38px;
  height: 38px;
  object-fit: contain;
}

/* ── Botões de controle ── */
.ctrl-btn {
  height: 32px; width: 32px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: rgb(var(--ink-muted));
  transition: all 0.15s ease;
  font-size: 12px;
}
.ctrl-btn:hover {
  background: rgb(var(--accent) / 0.1);
  color: rgb(var(--accent));
}
.ctrl-btn:active { transform: scale(0.92); }

@media (prefers-reduced-motion: reduce) {
  .orb, .org-card-shell, .company-card { animation: none; }
}
</style>
