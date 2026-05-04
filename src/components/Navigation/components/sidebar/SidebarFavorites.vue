<script setup>
import { computed } from 'vue';
import { useFavoritesStore } from '@/stores/Config/favoriteStore';
import SidebarGroup from './SidebarGroup.vue';
import SidebarItem from './SidebarItem.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
  routeIndex: { type: Object, required: true },
});

defineEmits(['toggle', 'expand']);

const favoritesStore = useFavoritesStore();

const groupedFavorites = computed(() => {
  const list = Array.isArray(favoritesStore.favorites) ? favoritesStore.favorites : [];
  return list.reduce((groups, fav) => {
    const k = `${fav.router}@@${fav.section ?? ''}`;
    const meta = props.routeIndex[k] || { category: 'Outros', subcategory: null };
    const category = meta.category;
    const subcategory = meta.subcategory || '__sem_subcategoria__';
    if (!groups[category]) groups[category] = {};
    if (!groups[category][subcategory]) groups[category][subcategory] = [];
    groups[category][subcategory].push(fav);
    return groups;
  }, {});
});

async function removeFavorite(router, section) {
  await favoritesStore.removeFavorite(router, section);
  await favoritesStore.loadFavorites();
}
</script>

<template>
  <SidebarGroup label="Favoritos" icon="fas fa-star" :open="open" :collapsed="collapsed" @toggle="$emit('toggle')">
    <template v-if="Object.keys(groupedFavorites).length > 0">
      <li v-for="(subGroups, category) in groupedFavorites" :key="category" class="py-1">
        <p class="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle mb-1 px-2">
          {{ category }}
        </p>
        <ul class="space-y-0.5">
          <template v-for="(favorites, subcategory) in subGroups" :key="subcategory">
            <p v-if="subcategory !== '__sem_subcategoria__'"
               class="text-xs text-ink-muted mb-1 px-2 mt-1">{{ subcategory }}</p>
            <li v-for="favorite in favorites" :key="`${favorite.router}-${favorite.section}`">
              <SidebarItem
                :to="{ path: favorite.router, query: { section: favorite.section } }"
                :label="favorite.section"
                :collapsed="collapsed" :favorite="true" size="sm"
                @click="$emit('expand')"
                @toggleFavorite="removeFavorite(favorite.router, favorite.section)"
              />
            </li>
          </template>
        </ul>
      </li>
    </template>
    <li v-else>
      <p class="text-xs text-ink-subtle px-2 py-2">Nenhum favorito adicionado</p>
    </li>
  </SidebarGroup>
</template>
