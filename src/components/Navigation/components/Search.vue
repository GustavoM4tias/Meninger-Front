<template>
    <!-- Botão de busca sempre visível -->
    <form class="w-80">
        <label class="mb-2 text-sm font-medium text-gray-900 sr-only dark:text-white">Search</label>
        <div class="relative" @click="openModal()">
            <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <i class="fas fa-magnifying-glass"></i>
            </div>
            <input type="search"
                class="block w-full p-3 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder="Pesquisar uma funcionalidade" @focus="openModal" readonly />
            <span
                class="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none text-xs font-mono tracking-tighter uppercase text-gray-500 dark:text-gray-300">
                CTRL<span class="p-[0.05rem]"></span>+<span class="p-[0.1rem]"></span>K
            </span>
        </div>
    </form>

    <!-- Modal de busca -->
    <div v-show="open" class="fixed inset-0 bg-black/20 flex items-center justify-center z-40"
        @click.self="closeModal()">
        <div
            class="bg-gray-100 shadow-dark dark:bg-gray-800 dark:shadow-black/40  rounded-xl shadow-lg w-full max-w-lg p-6 relative">

            <input v-model="query" @input="onSearch" ref="searchInput"
                class="w-full bg-white dark:bg-gray-600 shadow-sm rounded-xl p-4 mb-4 focus:outline-none"
                placeholder="Pesquisar uma funcionalidade" />

            <ul class="max-h-64 overflow-auto gap-2 px-1 flex flex-col">
                <li v-for="item in results" :key="item.path + item.name + (item.query?.section || '')"
                    @click="goTo(item)"
                    class="cursor-pointer p-3 rounded-lg bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 flex justify-between items-center">
                    <div>
                        <div class="font-medium">{{ item.name }}</div>
                        <div class="text-sm text-gray-600 dark:text-gray-400">{{ item.content }}</div>
                    </div>

                    <i @click.stop="toggleFavorite(item)" :class="item.favorited
                        ? 'fas fa-star text-amber-400'
                        : 'far fa-star text-gray-400 hover:text-yellow-400'" class="cursor-pointer" />
                </li>

                <li v-if="!results.length" class="p-2 text-gray-500">Nenhum resultado para {{ query }}</li>
            </ul>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import Fuse from 'fuse.js';

import { useFavoritesStore } from '@/stores/Config/favoriteStore';
import { customSearchableRoutes } from '@/router/searchableRoutes'; // <-- IMPORTANTE

const open = ref(false);
const query = ref('');
const results = ref([]);
const searchInput = ref(null);
const router = useRouter();
const favoritesStore = useFavoritesStore();

let allRoutes = [];
let fuse;

function buildIndex() {
    const baseRoutes = router.getRoutes()
        .filter(r => r.meta.searchable)
        .map(r => ({
            name: r.name,
            path: r.path,
            content: r.meta.content,
            query: {},
        }));

    // Junta rotas reais com personalizadas
    allRoutes = [...baseRoutes, ...customSearchableRoutes];

    fuse = new Fuse(allRoutes, {
        keys: ['name', 'content'],
        threshold: 0.3,
    });
}

onMounted(async () => {
    await favoritesStore.loadFavorites();
    buildIndex();
});

function openModal() {
    open.value = true;
    query.value = '';

    const favoriteRoutes = favoritesStore.favorites.map(fav => {
        return allRoutes.find(r =>
            r.path === fav.router &&
            (r.query?.section === fav.section || r.name === fav.section)
        );
    }).filter(Boolean).map(route => ({
        ...route,
        favorited: true,
    }));

    const favoriteKeys = favoriteRoutes.map(f =>
        f.path + (f.query?.section || '') + f.name
    );

    const nonFavoriteRoutes = allRoutes
        .filter(r => !favoriteKeys.includes(r.path + (r.query?.section || '') + r.name))
        .map(r => ({
            ...r,
            favorited: false,
        }));

    results.value = [...favoriteRoutes, ...nonFavoriteRoutes];

    nextTick(() => {
        searchInput.value?.focus();
    });
}

function closeModal() {
    open.value = false;
    results.value = [];
}

function onSearch() {
    if (!query.value) {
        openModal();
        return;
    }

    const found = fuse.search(query.value).map(r => r.item).map(item => ({
        ...item,
        favorited: favoritesStore.isFavorited(item.path, item.name)
    }));

    results.value = found.sort((a, b) => b.favorited - a.favorited);
}

function goTo(pathOrItem) {
    closeModal();

    // Suporte a item (com query) ou string
    if (typeof pathOrItem === 'string') {
        router.push(pathOrItem);
    } else {
        router.push({
            path: pathOrItem.path,
            query: pathOrItem.query || {},
        });
    }
}

function toggleFavorite(item) {
    const isNowFav = favoritesStore.isFavorited(item.path, item.name);
    if (isNowFav) {
        favoritesStore.removeFavorite(item.path, item.name);
    } else {
        favoritesStore.addFavorite(item.path, item.name);
    }

    favoritesStore.loadFavorites();
    item.favorited = !isNowFav;
}

const toggleSearch = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openModal();
    }
};

onMounted(() => window.addEventListener('keydown', toggleSearch));
onBeforeUnmount(() => window.removeEventListener('keydown', toggleSearch));
</script>
