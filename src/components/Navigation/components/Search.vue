<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import Fuse from 'fuse.js';

import { useFavoritesStore } from '@/stores/Config/favoriteStore';
import { customSearchableRoutes } from '@/router/searchableRoutes';
import Modal from '@/components/UI/Modal.vue';

const STORAGE_KEY = 'menin:search:lastQuery';

const open = ref(false);
const query = ref(localStorage.getItem(STORAGE_KEY) || '');
const results = ref([]);
const activeIndex = ref(0);
const searchInput = ref(null);
const router = useRouter();
const favoritesStore = useFavoritesStore();

let allRoutes = [];
let fuse;

function buildIndex() {
  const baseRoutes = router.getRoutes()
    .filter(r => r.meta.searchable)
    .map(r => ({ name: r.name, path: r.path, content: r.meta.content, query: {} }));

  allRoutes = [...baseRoutes, ...customSearchableRoutes];
  fuse = new Fuse(allRoutes, { keys: ['name', 'content'], threshold: 0.3 });
}

function showInitialList() {
  const favoriteList = Array.isArray(favoritesStore.favorites) ? favoritesStore.favorites : [];
  const favoriteRoutes = favoriteList.map(fav =>
    allRoutes.find(r =>
      r.path === fav.router && (r.query?.section === fav.section || r.name === fav.section)
    )
  ).filter(Boolean).map(route => ({ ...route, favorited: true }));

  const favoriteKeys = favoriteRoutes.map(f => f.path + (f.query?.section || '') + f.name);
  const nonFavoriteRoutes = allRoutes
    .filter(r => !favoriteKeys.includes(r.path + (r.query?.section || '') + r.name))
    .map(r => ({ ...r, favorited: false }));

  results.value = [...favoriteRoutes, ...nonFavoriteRoutes];
}

function openModal() {
  open.value = true;
  activeIndex.value = 0;
  // se tinha query salva, refaz busca; senão mostra lista inicial
  query.value ? runSearch() : showInitialList();
  nextTick(() => searchInput.value?.focus());
}

function closeModal() { open.value = false; }

function clearQuery() {
  query.value = '';
  localStorage.removeItem(STORAGE_KEY);
  showInitialList();
  searchInput.value?.focus();
}

function runSearch() {
  if (!query.value.trim()) { showInitialList(); return; }
  const found = fuse.search(query.value).map(r => r.item).map(item => ({
    ...item,
    favorited: favoritesStore.isFavorited(item.path, item.name),
  }));
  results.value = found.sort((a, b) => b.favorited - a.favorited);
  activeIndex.value = 0;
}

function onSearch() {
  // persiste query digitada (mantém entre fechamentos)
  localStorage.setItem(STORAGE_KEY, query.value);
  runSearch();
}

function goTo(item) {
  closeModal();
  if (typeof item === 'string') router.push(item);
  else router.push({ path: item.path, query: item.query || {} });
}

async function toggleFavorite(item) {
  const isNowFav = favoritesStore.isFavorited(item.path, item.name);
  if (isNowFav) await favoritesStore.removeFavorite(item.path, item.name);
  else          await favoritesStore.addFavorite(item.path, item.name);
  await favoritesStore.loadFavorites();
  item.favorited = !isNowFav;
}

// ── Navegação por teclado dentro do modal ──────────
function onInputKeydown(e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex.value = Math.min(activeIndex.value + 1, results.value.length - 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex.value = Math.max(activeIndex.value - 1, 0); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    const item = results.value[activeIndex.value];
    if (item) goTo(item);
  }
}

watch(activeIndex, async (i) => {
  await nextTick();
  document.querySelector(`[data-search-item="${i}"]`)?.scrollIntoView({ block: 'nearest' });
});

// ── Atalho global Ctrl/Cmd+K ───────────────────────
const onShortcut = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openModal();
  }
};

onMounted(async () => {
  await favoritesStore.loadFavorites();
  buildIndex();
  window.addEventListener('keydown', onShortcut);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onShortcut));

const isMac = computed(() => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform));
</script>

<template>
  <!-- Trigger -->
  <button type="button" @click="openModal"
    class="group hidden md:inline-flex items-center gap-2 w-56 lg:w-72 px-3 h-9 rounded-lg
           bg-surface-raised border border-line text-ink-muted whitespace-nowrap
           hover:border-accent/40 hover:bg-surface-sunken transition-colors duration-150">
    <i class="fas fa-magnifying-glass text-xs shrink-0 group-hover:text-accent transition-colors"></i>
    <span class="flex-1 min-w-0 text-left text-sm text-ink-subtle truncate">Pesquisar...</span>
    <kbd class="hidden lg:inline-flex shrink-0 items-center gap-0.5 font-mono text-[10px] uppercase tracking-tighter
                text-ink-subtle px-1.5 py-0.5 rounded border border-line bg-surface
                group-hover:border-accent/30 group-hover:text-accent transition-colors">
      <span>{{ isMac ? '⌘' : 'Ctrl' }}</span><span>K</span>
    </kbd>
  </button>

  <Modal :open="open" size="lg" hide-close @close="closeModal">
    <template #header>
      <div class="relative w-full">
        <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-sm pointer-events-none"></i>
        <input v-model="query" ref="searchInput"
          @input="onSearch" @keydown="onInputKeydown"
          class="w-full pl-10 pr-20 py-2.5 text-sm bg-surface text-ink rounded-lg border border-line
                 placeholder:text-ink-subtle outline-none
                 focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20"
          placeholder="Pesquisar uma funcionalidade..." autocomplete="off" />

        <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button v-if="query" @click="clearQuery" type="button" title="Limpar"
            class="h-6 w-6 grid place-items-center rounded text-ink-subtle hover:text-ink hover:bg-surface-sunken transition-colors">
            <i class="fas fa-xmark text-xs"></i>
          </button>
          <kbd class="font-mono text-[10px] uppercase tracking-tighter text-ink-subtle
                      px-1.5 py-0.5 rounded border border-line bg-surface">ESC</kbd>
        </div>
      </div>
    </template>

    <ul class="max-h-80 overflow-auto -mx-2 px-1 flex flex-col gap-0.5">
      <li v-for="(item, i) in results" :key="item.path + item.name + (item.query?.section || '')"
        :data-search-item="i"
        @click="goTo(item)"
        @mouseenter="activeIndex = i"
        class="cursor-pointer p-3 rounded-lg flex justify-between items-center gap-3 transition-colors group"
        :class="activeIndex === i ? 'bg-accent-soft/60' : 'hover:bg-surface-sunken'">
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium truncate"
               :class="activeIndex === i ? 'text-accent' : 'text-ink'">
            {{ item.name }}
          </div>
          <div class="text-xs text-ink-muted truncate">{{ item.content }}</div>
        </div>
        <button @click.stop="toggleFavorite(item)"
          class="h-7 w-7 grid place-items-center rounded-md transition-colors shrink-0"
          :class="item.favorited
            ? 'text-amber-400 hover:bg-amber-400/10'
            : 'text-ink-subtle hover:text-amber-400 hover:bg-amber-400/10'">
          <i :class="item.favorited ? 'fas fa-star' : 'far fa-star'" class="text-xs"></i>
        </button>
      </li>

      <li v-if="!results.length" class="p-6 text-center">
        <i class="fas fa-magnifying-glass text-2xl text-ink-subtle mb-2"></i>
        <p class="text-sm text-ink-muted">Nenhum resultado para <span class="text-ink font-medium">"{{ query }}"</span></p>
      </li>
    </ul>

    <template #footer>
      <div class="flex items-center justify-between w-full text-[11px] text-ink-subtle font-mono">
        <div class="flex items-center gap-3">
          <span class="flex items-center gap-1.5">
            <kbd class="px-1.5 py-0.5 rounded border border-line bg-surface">↑</kbd>
            <kbd class="px-1.5 py-0.5 rounded border border-line bg-surface">↓</kbd>
            navegar
          </span>
          <span class="flex items-center gap-1.5">
            <kbd class="px-1.5 py-0.5 rounded border border-line bg-surface">↵</kbd>
            abrir
          </span>
        </div>
        <span>{{ results.length }} resultado{{ results.length !== 1 ? 's' : '' }}</span>
      </div>
    </template>
  </Modal>
</template>
