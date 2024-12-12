<script setup>
import { ref, watchEffect, onMounted } from 'vue';
import { useFavoritesStore } from '../../../stores/favoriteStore';
import { addFavorite, removeFavorite } from '../../../utils/apiFavorite';

const props = defineProps({
    router: String,
    section: String,
    name: String,
    isFavorited: Boolean
});

const favoritesStore = useFavoritesStore();
const isFavorited = ref(false);

// Carregar favoritos quando o componente é montado
watchEffect(() => {
    isFavorited.value = favoritesStore.isFavorited(props.router, props.section);
});

// Função para alternar o estado de favorito
const toggleFavorite = async () => {
    try {
        if (isFavorited.value) {
            await removeFavorite(props.router, props.section); // favorite id
        } else {
            await addFavorite(props.router, props.section);
        }
        // Atualiza o estado de favoritos na store
        await favoritesStore.loadFavorites();
    } catch (error) {
        console.error("Erro ao atualizar favorito", error);
    }
};

onMounted(() => { favoritesStore.loadFavorites(); });
</script>

<template>
    <li>
        <RouterLink :to="{ path: router, query: { section: section } }"
            class="flex items-center justify-between ps-3 pe-2.5 py-1.5 my-1.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-md truncate">
            <p class="w-[90%] truncate">{{ name }}</p>
            <i @click="toggleFavorite" :class="isFavorited ? 'fas fa-star text-amber-300' : 'far fa-star'"
                class="cursor-pointer"></i>
        </RouterLink>
    </li>
</template>
