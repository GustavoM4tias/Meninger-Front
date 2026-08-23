<template>
  <div class="relative">
    <!-- Toolbar: view toggle + count -->
    <div v-if="items.length && !loading"
      class="flex items-center justify-between px-5 py-2.5 border-b border-line">
      <span class="text-xs text-ink-subtle">
        {{ folders.length }} pasta(s) · {{ files.length }} arquivo(s)
      </span>
      <div class="flex items-center gap-1">
        <button @click="viewMode = 'grid'"
          :class="viewMode === 'grid' ? 'bg-accent/10 text-accent  ' : 'text-ink-subtle hover:text-ink-muted dark:hover:text-ink-subtle'"
          class="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors">
          <i class="fas fa-grip"></i>
        </button>
        <button @click="viewMode = 'list'"
          :class="viewMode === 'list' ? 'bg-accent/10 text-accent  ' : 'text-ink-subtle hover:text-ink-muted dark:hover:text-ink-subtle'"
          class="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors">
          <i class="fas fa-list"></i>
        </button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading"
      :class="viewMode === 'grid'
        ? 'p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3'
        : 'divide-y divide-line'">
      <div v-for="n in 12" :key="n"
        :class="viewMode === 'grid' ? 'h-24 rounded-xl' : 'h-10 mx-4 my-1 rounded-lg'"
        class="bg-surface-sunken animate-pulse" />
    </div>

    <!-- Empty -->
    <div v-else-if="!items.length"
      class="py-14 text-center text-sm text-ink-subtle">
      <i class="fas fa-folder-open text-3xl mb-3 block"></i>
      Esta pasta está vazia.
    </div>

    <!-- GRID mode -->
    <div v-else-if="viewMode === 'grid'"
      class="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      <div
        v-for="item in sortedItems"
        :key="item.id"
        :draggable="true"
        @dragstart="onDragStart($event, item)"
        @dragend="onDragEnd"
        @dragover.prevent="item.isFolder ? (dragOverId = item.id) : null"
        @dragleave="dragOverId = null"
        @drop.prevent="onDrop($event, item)"
        @click="handleClick(item)"
        @dblclick="handleDblClick(item)"
        @contextmenu.prevent="openCtx($event, item)"
        :title="item.name"
        class="group relative flex flex-col items-center gap-2 p-3 rounded-xl border cursor-pointer select-none transition-all duration-150"
        :class="[
          dragOverId === item.id && item.isFolder
            ? 'bg-accent/10 border-accent   scale-105'
            : item.isFolder
              ? 'border-transparent hover:bg-accent/10 hover:border-accent/25  '
              : 'border-transparent hover:bg-surface-sunken hover:border-line hover:bg-surface-sunken dark:hover:border-line',
          draggingId === item.id ? 'opacity-40' : ''
        ]">

        <!-- Favorite star -->
        <div v-if="sp.isFavorited(item.id)"
          class="absolute top-1.5 left-1.5 w-4 h-4 flex items-center justify-center">
          <i class="fas fa-star text-data-warn text-[10px]"></i>
        </div>

        <!-- Icon -->
        <div class="w-12 h-12 flex items-center justify-center">
          <i v-if="item.isFolder" class="fas fa-folder text-4xl text-data-warn"></i>
          <i v-else :class="fileIconClass(item.ext)" class="text-4xl"></i>
        </div>

        <!-- Name -->
        <span class="text-xs text-center text-ink-muted leading-tight line-clamp-2 w-full text-center">
          {{ item.name }}
        </span>

        <!-- Badge -->
        <span class="text-micro text-ink-subtle">
          <template v-if="item.isFolder && item.childCount !== null">
            {{ item.childCount }} {{ item.childCount === 1 ? 'item' : 'itens' }}
          </template>
          <template v-else-if="!item.isFolder">{{ formatSize(item.size) }}</template>
        </span>

        <!-- Hover actions overlay (files only) -->
        <div v-if="!item.isFolder"
          class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button @click.stop="emit('action', 'preview', item)"
            title="Visualizar"
            class="w-6 h-6 rounded-md bg-surface-sunken shadow flex items-center justify-center text-accent hover:text-accent">
            <i class="fas fa-eye text-[10px]"></i>
          </button>
          <button @click.stop="emit('action', 'download', item)"
            title="Baixar"
            class="w-6 h-6 rounded-md bg-surface-sunken shadow flex items-center justify-center text-data-pos hover:text-data-pos">
            <i class="fas fa-download text-[10px]"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- LIST mode -->
    <div v-else class="divide-y divide-line">
      <div
        v-for="item in sortedItems"
        :key="item.id"
        :draggable="true"
        @dragstart="onDragStart($event, item)"
        @dragend="onDragEnd"
        @dragover.prevent="item.isFolder ? (dragOverId = item.id) : null"
        @dragleave="dragOverId = null"
        @drop.prevent="onDrop($event, item)"
        @click="handleClick(item)"
        @dblclick="handleDblClick(item)"
        @contextmenu.prevent="openCtx($event, item)"
        class="group flex items-center gap-3 px-5 py-2.5 cursor-pointer select-none transition-colors"
        :class="[
          dragOverId === item.id && item.isFolder
            ? 'bg-accent-soft'
            : 'hover:bg-surface-hover/60',
          draggingId === item.id ? 'opacity-40' : '',
        ]">

        <!-- Icon -->
        <div class="w-8 h-8 flex items-center justify-center shrink-0">
          <i v-if="item.isFolder" class="fas fa-folder text-2xl text-data-warn"></i>
          <i v-else :class="fileIconClass(item.ext)" class="text-2xl"></i>
        </div>

        <!-- Name -->
        <span class="flex-1 text-sm text-ink truncate">{{ item.name }}</span>

        <!-- Favorite -->
        <i v-if="sp.isFavorited(item.id)" class="fas fa-star text-data-warn text-xs shrink-0"></i>

        <!-- Meta -->
        <span class="text-xs text-ink-subtle w-20 text-right shrink-0 hidden sm:block">
          <template v-if="item.isFolder && item.childCount !== null">{{ item.childCount }} itens</template>
          <template v-else-if="!item.isFolder">{{ formatSize(item.size) }}</template>
        </span>
        <span class="text-xs text-ink-subtle w-28 text-right shrink-0 hidden md:block">
          {{ formatDate(item.lastModified) }}
        </span>

        <!-- Actions (visible on hover) -->
        <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
          <button v-if="!item.isFolder" @click.stop="emit('action', 'preview', item)"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-ink-subtle hover:text-accent  hover:bg-accent/10  transition-colors">
            <i class="fas fa-eye text-xs"></i>
          </button>
          <button v-if="!item.isFolder" @click.stop="emit('action', 'download', item)"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-ink-subtle hover:text-data-pos  hover:bg-data-pos/10  transition-colors">
            <i class="fas fa-download text-xs"></i>
          </button>
          <button @click.stop="openCtx({ clientX: $event.clientX, clientY: $event.clientY }, item)"
            class="w-7 h-7 rounded-lg flex items-center justify-center text-ink-subtle hover:text-ink dark:hover:text-ink hover:bg-surface-hover transition-colors">
            <i class="fas fa-ellipsis-vertical text-xs"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Context menu -->
    <ContextMenu
      :visible="ctx.visible"
      :x="ctx.x"
      :y="ctx.y"
      :item="ctx.item"
      :is-favorited="ctx.item ? sp.isFavorited(ctx.item.id) : false"
      @close="ctx.visible = false"
      @action="(type, item) => { emit('action', type, item); ctx.visible = false; }"
    />
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { useSharepointStore } from '@/stores/Microsoft/sharepointStore';
import ContextMenu from './ContextMenu.vue';

const props = defineProps({
  items:   { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['open-folder', 'action', 'move']);
const sp = useSharepointStore();

// ── View mode ─────────────────────────────────────────────────────────────────
const viewMode = ref('grid');

// ── Sorting ───────────────────────────────────────────────────────────────────
const folders     = computed(() => props.items.filter(i => i.isFolder).sort((a, b) => a.name.localeCompare(b.name)));
const files       = computed(() => props.items.filter(i => !i.isFolder).sort((a, b) => a.name.localeCompare(b.name)));
const sortedItems = computed(() => [...folders.value, ...files.value]);

// ── Click handlers ────────────────────────────────────────────────────────────
function handleClick(item) {
  if (item.isFolder) emit('open-folder', item);
}

function handleDblClick(item) {
  if (!item.isFolder) emit('action', 'preview', item);
}

// ── Drag-to-move ──────────────────────────────────────────────────────────────
const draggingId = ref(null);
const dragOverId = ref(null);

function onDragStart(e, item) {
  draggingId.value = item.id;
  window.__spDraggedItemId = item.id;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', item.id);
}

function onDragEnd() {
  draggingId.value = null;
  dragOverId.value = null;
  window.__spDraggedItemId = null;
}

function onDrop(e, targetItem) {
  dragOverId.value = null;
  const srcId = e.dataTransfer.getData('text/plain');
  if (!srcId || !targetItem.isFolder || srcId === targetItem.id) return;
  emit('move', srcId, targetItem.id);
}

// ── Context menu ─────────────────────────────────────────────────────────────
const ctx = reactive({ visible: false, x: 0, y: 0, item: null });

function openCtx(e, item) {
  ctx.x = e.clientX;
  ctx.y = e.clientY;
  ctx.item = item;
  ctx.visible = true;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const EXT_ICONS = {
  xlsx: 'fas fa-file-excel text-data-pos', xls: 'fas fa-file-excel text-data-pos',
  docx: 'fas fa-file-word text-accent', doc: 'fas fa-file-word text-accent',
  pptx: 'fas fa-file-powerpoint text-data-warn', ppt: 'fas fa-file-powerpoint text-data-warn',
  pdf: 'fas fa-file-pdf text-data-neg',
  png: 'fas fa-file-image text-accent', jpg: 'fas fa-file-image text-accent',
  jpeg: 'fas fa-file-image text-accent', gif: 'fas fa-file-image text-accent',
  svg: 'fas fa-file-image text-accent', webp: 'fas fa-file-image text-accent',
  mp4: 'fas fa-file-video text-pink-500', mov: 'fas fa-file-video text-pink-500',
  avi: 'fas fa-file-video text-pink-500',
  mp3: 'fas fa-file-audio text-data-warn', wav: 'fas fa-file-audio text-data-warn',
  txt: 'fas fa-file-lines text-ink-muted', csv: 'fas fa-file-csv text-teal-600',
  json: 'fas fa-file-code text-ink-muted', js: 'fas fa-file-code text-data-warn',
  zip: 'fas fa-file-zipper text-data-warn', rar: 'fas fa-file-zipper text-data-warn',
};
function fileIconClass(ext) { return EXT_ICONS[ext?.toLowerCase()] || 'fas fa-file text-ink-subtle'; }

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
