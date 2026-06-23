<script setup>
import SidebarGroup from './SidebarGroup.vue';
import SidebarItem from './SidebarItem.vue';

defineProps({
  category: { type: Object, required: true },         // { key, label, icon, requiresMicrosoft, ... }
  catKey: { type: String, required: true },
  open: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
  flatItems: { type: Array, default: () => [] },
  subEntries: { type: Array, default: () => [] },     // [{ key, name, icon, items }]
  subDropdowns: { type: Object, default: () => ({}) },
  isFavorited: { type: Function, required: true },
});

defineEmits(['toggle', 'toggleSub', 'expand', 'toggleFavorite']);
</script>

<template>
  <SidebarGroup
    :label="category.label"
    :icon="category.requiresMicrosoft ? '' : (category.icon || 'far fa-folder')"
    :icon-color="category.iconColor"
    :icon-slot="!!category.requiresMicrosoft"
    :open="open"
    :collapsed="collapsed"
    @toggle="$emit('toggle')"
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
