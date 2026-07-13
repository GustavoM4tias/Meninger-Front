<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useFavoritesStore } from '@/stores/Config/favoriteStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import { navRegistry, allManagedRoutes, isItemActive } from '@/config/navRegistry';
import { academyUrl } from '@/utils/appContext';

import Search from '@/components/Navigation/components/Search.vue';
import Notification from '@/components/Navigation/components/Notification.vue';
import MuralBell from '@/components/Navigation/components/MuralBell.vue';
import Profile from '@/components/Navigation/components/Profile.vue';

import IconButton from '@/components/UI/IconButton.vue';
import SidebarItem from './components/sidebar/SidebarItem.vue';
import SidebarFavorites from './components/sidebar/SidebarFavorites.vue';
import SidebarCategory from './components/sidebar/SidebarCategory.vue';
import SidebarFlyout from './components/sidebar/SidebarFlyout.vue';

const route = useRoute();

// ─── Stores ──────────────────────────────────────────
const authStore       = useAuthStore();
const favoritesStore  = useFavoritesStore();
const microsoftStore  = useMicrosoftStore();
const permissionStore = usePermissionStore();

// ─── Permissões ──────────────────────────────────────
const isAdmin = computed(() => authStore?.user?.role === 'admin');

// Link para o app Academy — resolve produção vs local automaticamente.
const academyHref = computed(() => academyUrl('/panel'));
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

// Agrupa as categorias visíveis por seção de topo (group), preservando a ordem
// de primeira aparição. Permite que a navbar escale com rótulos de seção.
const navSections = computed(() => {
  const order = [];
  const buckets = {};
  for (const key of categoryKeys.value) {
    const group = getCat(key)?.group || 'Geral';
    if (!buckets[group]) { buckets[group] = []; order.push(group); }
    buckets[group].push(key);
  }
  return order.map(group => ({ group, keys: buckets[group] }));
});

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
  openActiveTrail();
}

// ─── Trilha da rota ativa (auto-abre onde o usuário está) ─────────────
const activeTrail = computed(() => {
  const path = route.path, sec = route.query.section;
  for (const key of categoryKeys.value) {
    if (categoryFlatItems(key).some(it => isItemActive(path, sec, it))) return { cat: key, sub: null };
    for (const sub of subcatEntries(key)) {
      if ((sub.items || []).some(it => isItemActive(path, sec, it))) return { cat: key, sub: sub.key };
    }
  }
  return { cat: null, sub: null };
});

function openActiveTrail() {
  const { cat, sub } = activeTrail.value;
  if (cat && cat in dropdowns.value) dropdowns.value[cat] = true;
  if (cat && sub) subDropdowns.value[`${cat}.${sub}`] = true;
}

initDropdownStates();
watch(categoryKeys, initDropdownStates);
watch(() => route.fullPath, openActiveTrail);

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

// ─── Flyout do rail recolhido ────────────────────────
// Ao passar o mouse numa categoria (recolhido), abre um painel flutuante ao
// lado com a árvore dela. Timers evitam flicker ao mover o mouse entre o
// ícone e o painel.
const flyout = ref({ key: null, rect: null });
let openTimer = null, closeTimer = null;

function scheduleOpenFlyout({ key, rect }) {
  clearTimeout(openTimer); clearTimeout(closeTimer);
  openTimer = setTimeout(() => { flyout.value = { key, rect }; }, 70);
}
function scheduleCloseFlyout() {
  clearTimeout(openTimer); clearTimeout(closeTimer);
  closeTimer = setTimeout(() => { flyout.value = { key: null, rect: null }; }, 140);
}
function keepFlyout()  { clearTimeout(closeTimer); }
function closeFlyout() { clearTimeout(openTimer); clearTimeout(closeTimer); flyout.value = { key: null, rect: null }; }

const flyoutCat = computed(() => {
  const key = flyout.value.key;
  if (!key) return null;
  const cat = getCat(key);
  if (!cat) return null;
  return {
    label: cat.label,
    icon: cat.icon,
    iconColor: cat.iconColor,
    subEntries: subcatEntries(key),
    flatItems: categoryFlatItems(key),
    rect: flyout.value.rect,
  };
});

// Recolher a sidebar fecha qualquer flyout aberto.
watch(isCollapsed, (v) => { if (!v) closeFlyout(); });
onBeforeUnmount(() => { clearTimeout(openTimer); clearTimeout(closeTimer); });

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
          <MuralBell />
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
        'flex flex-col h-full',
        isCollapsed ? 'px-1.5' : 'px-3',
        'transition-[padding] duration-200 ease-out-expo'
      ]">

        <!-- Topo — área rolável que ocupa o espaço restante (não empurra o rodapé) -->
        <ul class="flex-1 min-h-0 overflow-y-auto nav-scroll space-y-0.5 mt-1 pb-2">
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

          <template v-for="(grp, gi) in navSections" :key="grp.group">
            <!-- Rótulo de seção (expandido) · divisória discreta (recolhido) -->
            <li v-if="!isCollapsed"
                :class="['select-none px-2 pb-0.5', gi === 0 ? 'pt-0.5' : 'pt-2.5']">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
                {{ grp.group }}
              </span>
            </li>
            <li v-else-if="gi > 0" aria-hidden="true" class="mx-auto my-2 h-px w-6 bg-line"></li>

            <li v-for="catKey in grp.keys" :key="catKey">
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
                @hover="scheduleOpenFlyout"
                @leave="scheduleCloseFlyout"
              />
            </li>
          </template>

          <!-- Bolão — link direto (sem dropdown), abaixo das categorias. Aponta
               para a edição ATIVA (/bolao = Brasil x Japão); a 1ª chave da Copa
               fica arquivada em /bolao/copa-2026, fora da navbar. -->
          <li>
            <!-- <SidebarItem to="/bolao" icon-img="/bolao-icon.png" label="Bolão Brasil x Japão"
              :collapsed="isCollapsed" @click="expandSidebar(); closeMobile();" /> -->
          </li>
        </ul>

        <!-- Bottom — fixo: não rola junto com a lista acima -->
        <ul class="shrink-0 space-y-0.5 pt-2 pb-3 border-t border-line">
          <div class="block md:hidden mb-2"><Search /></div>

          <li v-if="authStore?.user?.role === 'admin'">
            <SidebarItem to="/support" icon="fas fa-headset" label="Suporte"
              :collapsed="isCollapsed" @click="expandSidebar(); closeMobile();" />
          </li>
          <!-- Documentação ocultada temporariamente — não utilizada por enquanto.
               A rota /docs continua funcional; basta reativar este item quando voltar a ser usada. -->
          <!--
          <li>
            <SidebarItem to="/docs" icon="fas fa-book" label="Documentação"
              :collapsed="isCollapsed" @click="expandSidebar(); closeMobile();" />
          </li>
          -->
          <!-- <li>
            <a :href="academyHref"
              @click="expandSidebar(); closeMobile();"
              class="flex items-center h-10 px-2 rounded-lg text-ink hover:bg-surface-sunken transition-colors group"
              :class="isCollapsed ? 'justify-center' : ''">
              <i class="fas fa-graduation-cap w-5 text-ink-muted group-hover:text-accent text-sm shrink-0"></i>
              <span v-show="!isCollapsed" class="ms-3 text-sm">Academy</span>
            </a>
          </li> -->
          <li>
            <SidebarItem
              asButton icon="fas fa-arrow-right-from-bracket" label="Sair"
              :collapsed="isCollapsed" @click="authStore.logout()" />
          </li>
        </ul>
      </div>
    </aside>

    <!-- Flyout do rail recolhido (teleportado para o body) -->
    <SidebarFlyout
      v-if="isCollapsed && flyoutCat"
      :label="flyoutCat.label"
      :icon="flyoutCat.icon"
      :icon-color="flyoutCat.iconColor"
      :sub-entries="flyoutCat.subEntries"
      :flat-items="flyoutCat.flatItems"
      :rect="flyoutCat.rect"
      :is-favorited="isFavorited"
      @keep="keepFlyout"
      @release="scheduleCloseFlyout"
      @navigate="closeFlyout"
      @toggleFavorite="toggleFavorite"
    />
  </div>
</template>


<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Scroll discreto somente na área superior (lista de navegação) */
.nav-scroll { scrollbar-width: thin; scrollbar-color: rgb(148 163 184 / 0.35) transparent; }
.nav-scroll::-webkit-scrollbar { width: 6px; }
.nav-scroll::-webkit-scrollbar-thumb { background: rgb(148 163 184 / 0.35); border-radius: 9999px; }
.nav-scroll::-webkit-scrollbar-thumb:hover { background: rgb(148 163 184 / 0.6); }
.nav-scroll::-webkit-scrollbar-track { background: transparent; }
</style>
