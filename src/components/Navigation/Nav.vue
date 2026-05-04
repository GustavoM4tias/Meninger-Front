<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { RouterLink } from 'vue-router';

import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useFavoritesStore } from '@/stores/Config/favoriteStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import { navRegistry, allManagedRoutes } from '@/config/navRegistry';

import Search from '@/components/Navigation/components/Search.vue';
import Notification from '@/components/Navigation/components/Notification.vue';
import Profile from '@/components/Navigation/components/Profile.vue';

import IconButton from '@/components/UI/IconButton.vue';
import SidebarItem from './components/sidebar/SidebarItem.vue';
import SidebarFavorites from './components/sidebar/SidebarFavorites.vue';
import SidebarCategory from './components/sidebar/SidebarCategory.vue';

// ─── Stores ──────────────────────────────────────────
const authStore       = useAuthStore();
const favoritesStore  = useFavoritesStore();
const microsoftStore  = useMicrosoftStore();
const permissionStore = usePermissionStore();

// ─── Permissões ──────────────────────────────────────
const isAdmin = computed(() => authStore?.user?.role === 'admin');
const getCat = (key) => navRegistry.find(c => c.key === key);

const canSeeItem = (item) => {
  if (isAdmin.value) return true;
  if (item.adminOnly) return false;
  if (!allManagedRoutes.includes(item.route)) return true;
  return permissionStore.hasAccess(item.route);
};

const subcatHasVisible = (sub) => (sub.pages || []).some(canSeeItem);

const categoryHasVisible = (key) => {
  if (isAdmin.value) return true;
  const cat = getCat(key);
  if (!cat) return false;
  const flatOk   = (cat.pages || []).some(canSeeItem);
  const subcatOk = (cat.subcategories || []).some(subcatHasVisible);
  return flatOk || subcatOk;
};

const categoryKeys = computed(() =>
  navRegistry
    .filter(cat => !cat.requiresMicrosoft || microsoftStore.connected)
    .filter(cat => cat.permissionManaged === false || categoryHasVisible(cat.key))
    .map(cat => cat.key)
);

const subcatEntries = (key) => {
  const cat = getCat(key);
  const subs = cat?.subcategories || [];
  const list = isAdmin.value ? subs : subs.filter(subcatHasVisible);
  return list.map(sub => ({
    ...sub,
    items: (isAdmin.value ? (sub.pages || []) : (sub.pages || []).filter(canSeeItem)),
  }));
};

const categoryFlatItems = (key) => {
  const items = getCat(key)?.pages || [];
  return isAdmin.value ? items : items.filter(canSeeItem);
};

// ─── Dropdown state ──────────────────────────────────
const dropdowns    = ref({});
const subDropdowns = ref({});

function initDropdownStates() {
  const d = { favorites: false };
  const s = {};
  for (const key of categoryKeys.value) {
    d[key] = false;
    for (const sub of subcatEntries(key)) {
      s[`${key}.${sub.key}`] = false;
    }
  }
  dropdowns.value = d;
  subDropdowns.value = s;
}
initDropdownStates();
watch(categoryKeys, initDropdownStates);

const toggleDropdown = (name) => {
  Object.keys(dropdowns.value).forEach(k => { if (k !== name) dropdowns.value[k] = false; });
  if (!dropdowns.value[name]) {
    Object.keys(subDropdowns.value).forEach(k => {
      if (k.startsWith(`${name}.`)) subDropdowns.value[k] = false;
    });
  }
  dropdowns.value[name] = !dropdowns.value[name];
};

const toggleSubDropdown = (cat, subKey) => {
  const key = `${cat}.${subKey}`;
  subDropdowns.value[key] = !subDropdowns.value[key];
};

// ─── Sidebar collapse ────────────────────────────────
const isCollapsed = ref(false);
// No mobile (<sm) o wrapper reserva 0px (sidebar abre como overlay).
// No desktop (sm+) reserva a largura real pra empurrar o conteúdo.
const sidebarWidthClass = computed(() =>
  isCollapsed.value ? 'w-0 sm:w-14' : 'w-0 sm:w-72'
);
const isMobileOpen = ref(false);

const collapseSidebar = () => {
  isCollapsed.value = true;
  Object.keys(dropdowns.value).forEach(k => (dropdowns.value[k] = false));
  Object.keys(subDropdowns.value).forEach(k => (subDropdowns.value[k] = false));
};
const expandSidebar = () => { isCollapsed.value = false; };
const toggleSidebar = () => { isCollapsed.value ? expandSidebar() : collapseSidebar(); };

const withExpand = (fn) => (...args) => {
  if (isCollapsed.value) { expandSidebar(); requestAnimationFrame(() => fn(...args)); return; }
  fn(...args);
};
const toggleDropdownSafe    = withExpand(toggleDropdown);
const toggleSubDropdownSafe = withExpand(toggleSubDropdown);

// ─── Index para favoritos ────────────────────────────
const routeIndex = computed(() => {
  const idx = {};
  const add = (catKey, subcatName, item) => {
    const k = `${item.route}@@${item.section ?? ''}`;
    idx[k] = { category: getCat(catKey)?.label || catKey, subcategory: subcatName || null };
  };
  for (const catKey of categoryKeys.value) {
    for (const it of categoryFlatItems(catKey)) add(catKey, null, it);
    for (const sub of subcatEntries(catKey)) {
      for (const it of sub.items || []) add(catKey, sub.name, it);
    }
  }
  return idx;
});

// ─── Favoritos ───────────────────────────────────────
const isFavorited = (route, section) => favoritesStore.isFavorited(route, section);
const toggleFavorite = async (route, section) => {
  try {
    if (isFavorited(route, section)) await favoritesStore.removeFavorite(route, section);
    else                             await favoritesStore.addFavorite(route, section);
    await favoritesStore.loadFavorites();
  } catch (error) {
    console.error('Erro ao atualizar favorito', error);
  }
};

// ─── Init ────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([
    favoritesStore.loadFavorites(),
    microsoftStore.fetchStatus(),
  ]);
  if (typeof initFlowbite !== 'undefined') initFlowbite();
});

const closeMobile = () => { isMobileOpen.value = false; };
</script>

<template>
  <div :class="['transition-[width] duration-200 ease-out-expo', sidebarWidthClass]">

    <!-- ─── Top Bar ─── -->
    <nav class="fixed top-0 z-50 w-full bg-surface/80 backdrop-blur-xl border-b border-line">
      <div class="px-3 py-2 lg:px-5 lg:pl-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <IconButton icon="fas fa-bars" size="md" label="Abrir menu" class="sm:hidden"
            @click="isMobileOpen = !isMobileOpen" />

          <a href="#" @click.prevent="toggleSidebar"
             class="flex items-center select-none cursor-pointer">
            <img src="/Mlogotext.png" alt="Menin Logo"
                 class="h-9 sm:h-10 -my-2 dark:invert-0 invert" />
          </a>
        </div>

        <div class="flex items-center gap-1">
          <div class="hidden md:block"><Search /></div>
          <Notification />
          <Profile />
        </div>
      </div>
    </nav>

    <!-- Backdrop mobile -->
    <transition name="fade">
      <div v-if="isMobileOpen"
        @click="closeMobile"
        class="sm:hidden fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-30"></div>
    </transition>

    <!-- ─── Sidebar ─── -->
    <aside id="logo-sidebar"
      :class="[
        'fixed top-0 left-0 z-40 h-screen pt-16',
        'bg-surface/95 backdrop-blur-xl border-r border-line',
        'transition-[width,transform] duration-200 ease-out-expo',
        'sm:translate-x-0',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        isCollapsed ? 'w-14' : 'w-72'
      ]" aria-label="Sidebar">

      <div :class="[
        'flex flex-col justify-between h-full pb-4 overflow-y-auto',
        isCollapsed ? 'px-1.5' : 'px-3',
        'transition-[padding] duration-200 ease-out-expo'
      ]">

        <!-- Topo -->
        <ul class="space-y-1 mt-2">
          <li>
            <SidebarItem to="/" icon="fas fa-house" label="Dashboard"
              :collapsed="isCollapsed" @click="expandSidebar(); closeMobile();" />
          </li>

          <li>
            <SidebarFavorites
              :open="dropdowns.favorites"
              :collapsed="isCollapsed"
              :route-index="routeIndex"
              @toggle="toggleDropdownSafe('favorites')"
              @expand="expandSidebar(); closeMobile();"
            />
          </li>

          <li v-for="catKey in categoryKeys" :key="catKey">
            <SidebarCategory
              :category="getCat(catKey)"
              :cat-key="catKey"
              :open="dropdowns[catKey]"
              :collapsed="isCollapsed"
              :flat-items="categoryFlatItems(catKey)"
              :sub-entries="subcatEntries(catKey)"
              :sub-dropdowns="subDropdowns"
              :is-favorited="isFavorited"
              @toggle="toggleDropdownSafe(catKey)"
              @toggleSub="(subKey) => toggleSubDropdownSafe(catKey, subKey)"
              @expand="expandSidebar(); closeMobile();"
              @toggleFavorite="toggleFavorite"
            />
          </li>
        </ul>

        <!-- Bottom -->
        <ul class="space-y-1 pt-3 border-t border-line">
          <div class="block md:hidden mb-2"><Search /></div>

          <li v-if="authStore?.user?.role === 'admin'">
            <SidebarItem to="/support" icon="fas fa-circle-info" label="Suporte"
              :collapsed="isCollapsed" @click="expandSidebar(); closeMobile();" />
          </li>
          <li>
            <SidebarItem to="/report" icon="fas fa-bug" label="Reportar Problema"
              :collapsed="isCollapsed" @click="expandSidebar(); closeMobile();" />
          </li>
          <li>
            <SidebarItem to="/docs" icon="fas fa-book" label="Documentação"
              :collapsed="isCollapsed" @click="expandSidebar(); closeMobile();" />
          </li>
          <li>
            <RouterLink to="" custom v-slot="{}">
              <a href="https://academy.menin.com.br/panel"
                @click="expandSidebar(); closeMobile();"
                class="flex items-center h-10 px-2 rounded-lg text-ink hover:bg-surface-sunken transition-colors group"
                :class="isCollapsed ? 'justify-center' : ''">
                <i class="fas fa-graduation-cap w-5 text-ink-muted group-hover:text-accent text-sm shrink-0"></i>
                <span v-show="!isCollapsed" class="ms-3 text-sm">Academy</span>
              </a>
            </RouterLink>
          </li>
          <li>
            <SidebarItem
              asButton icon="fas fa-arrow-right-from-bracket" label="Sair"
              :collapsed="isCollapsed" @click="authStore.logout()" />
          </li>
        </ul>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
