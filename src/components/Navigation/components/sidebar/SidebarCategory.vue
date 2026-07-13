<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { isItemActive } from '@/config/navRegistry';
import SidebarGroup from './SidebarGroup.vue';
import SidebarItem from './SidebarItem.vue';

const props = defineProps({
  category: { type: Object, required: true },         // { key, label, icon, requiresMicrosoft, ... }
  catKey: { type: String, required: true },
  open: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
  flatItems: { type: Array, default: () => [] },
  subEntries: { type: Array, default: () => [] },     // [{ key, name, icon, items }]
  subDropdowns: { type: Object, default: () => ({}) },
  isFavorited: { type: Function, required: true },
});

const emit = defineEmits(['toggle', 'toggleSub', 'expand', 'toggleFavorite', 'hover', 'leave']);

const route = useRoute();
const curSection = computed(() => route.query.section);

// Subcategoria que contém a rota atual (para destacar/abrir a trilha).
const activeSubKey = computed(() => {
  for (const sub of props.subEntries) {
    if ((sub.items || []).some(it => isItemActive(route.path, curSection.value, it))) return sub.key;
  }
  return null;
});
const activeInFlat = computed(() =>
  props.flatItems.some(it => isItemActive(route.path, curSection.value, it))
);
const isActive = computed(() => activeInFlat.value || activeSubKey.value !== null);

// Categoria de destino único (sem subcats e 1 item) → link direto, sem acordeão.
// Ex.: Checklists (tela única com abas internas). Usa o rótulo/ícone da categoria.
const directItem = computed(() =>
  (props.subEntries.length === 0 && props.flatItems.length === 1) ? props.flatItems[0] : null
);

// Flyout (só recolhido): passa o retângulo do ícone-âncora para posicionar.
function onEnter(e) {
  if (!props.collapsed) return;
  emit('hover', { key: props.catKey, rect: e.currentTarget.getBoundingClientRect() });
}
function onLeave() {
  if (!props.collapsed) return;
  emit('leave');
}
</script>

<template>
  <!-- Categoria de destino único → link direto (sem acordeão) -->
  <SidebarItem
    v-if="directItem"
    :to="{ path: directItem.route, query: directItem.section ? { section: directItem.section } : undefined }"
    :icon="category.icon || directItem.icon || 'far fa-file'"
    :icon-color="category.iconColor"
    :label="category.label"
    :collapsed="collapsed"
    @click="$emit('expand')"
  />

  <SidebarGroup
    v-else
    :label="category.label"
    :icon="category.requiresMicrosoft ? '' : (category.icon || 'far fa-folder')"
    :icon-color="category.iconColor"
    :icon-slot="!!category.requiresMicrosoft"
    :open="open"
    :collapsed="collapsed"
    :active="isActive"
    @toggle="$emit('toggle')"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <template #icon v-if="category.requiresMicrosoft">
      <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-5 shrink-0">
        <rect x="0" y="0" width="10" height="10" fill="#F25022" />
        <rect x="11" y="0" width="10" height="10" fill="#7FBA00" />
        <rect x="0" y="11" width="10" height="10" fill="#00A4EF" />
        <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
      </svg>
    </template>

    <!-- Subcategorias -->
    <li v-for="sub in subEntries" :key="`${catKey}.${sub.key}`">
      <SidebarGroup
        :label="sub.name"
        :icon="sub.icon || 'far fa-folder'"
        :open="subDropdowns[`${catKey}.${sub.key}`]"
        :collapsed="collapsed"
        :active="activeSubKey === sub.key"
        level="sub"
        @toggle="$emit('toggleSub', sub.key)"
      >
        <li v-for="item in sub.items" :key="`${item.route}-${item.section}`">
          <SidebarItem
            :to="{ path: item.route, query: item.section ? { section: item.section } : undefined }"
            :icon="item.icon || 'far fa-file'"
            :icon-img="item.iconImg"
            :icon-color="item.iconColor"
            :label="item.name"
            :collapsed="collapsed"
            :favorite="isFavorited(item.route, item.section)"
            size="sm"
            @click="$emit('expand')"
            @toggleFavorite="$emit('toggleFavorite', item.route, item.section)"
          />
        </li>
      </SidebarGroup>
    </li>

    <!-- Itens planos -->
    <li v-for="item in flatItems" :key="`${item.route}-${item.section}`">
      <SidebarItem
        :to="{ path: item.route, query: item.section ? { section: item.section } : undefined }"
        :icon="item.icon || 'far fa-file'"
        :icon-img="item.iconImg"
        :icon-color="item.iconColor"
        :label="item.name"
        :collapsed="collapsed"
        :favorite="isFavorited(item.route, item.section)"
        size="sm"
        @click="$emit('expand')"
        @toggleFavorite="$emit('toggleFavorite', item.route, item.section)"
      />
    </li>
  </SidebarGroup>
</template>
