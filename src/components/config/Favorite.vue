<script setup>
import { ref, watchEffect, onMounted } from 'vue';
import { useFavoritesStore } from "@/stores/Config/favoriteStore"; 

const props = defineProps({
  router:{
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  }
});

const favoritesStore = useFavoritesStore();
const isFavorited = ref(false);

// Observar mudanças nos favoritos
watchEffect(() => {
  isFavorited.value = favoritesStore.isFavorited(props.router, props.section);
});

// Função para alternar o estado de favorito
const toggleFavorite = async () => {
  try {
    if (isFavorited.value) {
      await favoritesStore.removeFavorite(props.router, props.section);
    } else {
      await favoritesStore.addFavorite(props.router, props.section);
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
        <!-- Componente somente de texto para mostrar o favorito na pagina -->
        <i @click="toggleFavorite"
          :class="isFavorited ? 'fas fa-star text-amber-200 dark:text-amber-300' : 'far fa-star text-gray-500 dark:text-gray-400'"
          class="cursor-pointer ml-2 text-lg md:text-2xl"></i>
</template>
