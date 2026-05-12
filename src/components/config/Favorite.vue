<script setup>
import { ref, watchEffect, onMounted } from 'vue';
import { useFavoritesStore } from "@/stores/Config/favoriteStore";
import { useToast } from 'vue-toastification';

const props = defineProps({
  router: { type: String, required: true },
  section: { type: String, required: true },
});

const favoritesStore = useFavoritesStore();
const isFavorited = ref(false);
const busy = ref(false);

const toast = (() => {
  try { return useToast(); }
  catch { return { success: () => { }, error: console.error }; }
})();

// Reage à store: quando favorites muda, recalcula o estado da estrela
watchEffect(() => {
  isFavorited.value = favoritesStore.isFavorited(props.router, props.section);
});

const toggleFavorite = async () => {
  if (busy.value) return;
  busy.value = true;
  const wasFavorited = isFavorited.value;
  try {
    if (wasFavorited) {
      await favoritesStore.removeFavorite(props.router, props.section);
    } else {
      await favoritesStore.addFavorite(props.router, props.section);
    }
  } catch (error) {
    console.error("Erro ao atualizar favorito:", error);
    toast.error(error.message || 'Erro ao atualizar favorito.');
  } finally {
    busy.value = false;
  }
};

onMounted(() => { favoritesStore.loadFavorites(); });
</script>

<template>
  <!-- Componente somente de texto para mostrar o favorito na pagina -->
  <i @click="toggleFavorite"
    :class="[
      isFavorited ? 'fas fa-star text-amber-200 dark:text-amber-300' : 'far fa-star text-gray-500 dark:text-gray-400',
      busy ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
    ]"
    class="ml-2 text-lg md:text-2xl"></i>
</template>
