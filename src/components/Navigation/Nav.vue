<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, watchEffect } from 'vue';
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
import ThemeToggle from '@/components/Navigation/components/ThemeToggle.vue';
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
// Fonte autoritativa: permissoes confirmadas pelo servidor
// (/permissions/me), nao o authStore. Aqui nao cabe capacidade: menu monta a partir das permissoes confirmadas pelo servidor.
const isAdmin = computed(() => permissionStore.isAdmin);

// Link para o app Academy — resolve produção vs local automaticamente.
const academyHref = computed(() => academyUrl('/panel'));
const getCat = (key) => navRegistry.find(c => c.key === key);

const canSeeItem = (item) => {
  // Tela que virou aba de outra continua no registry (é ela que a alçada
  // nomeia), mas não pode aparecer como item próprio — dois caminhos para a
  // mesma tela é o que se quis eliminar. Vale inclusive para admin.
  if (item.hiddenInNav) return false;
  if (isAdmin.value) return true;
  // adminOnly do código + telas travadas pelo admin na tela de Alçadas.
  if (item.adminOnly || permissionStore.isRouteAdminOnly(item.route)) return false;
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
    items: (sub.pages || []).filter(p => !p.hiddenInNav && (isAdmin.value || canSeeItem(p))),
  }));
};

const categoryFlatItems = (key) => {
  const items = (getCat(key)?.pages || []).filter(p => !p.hiddenInNav);
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
// Desktop (sm+): padrão recolhida como rail de ícones; o botão de barras
// alterna rail ↔ expandida. O rail depende de hover/flyout, então no mobile
// ele não existe: lá a sidebar é um overlay que SEMPRE abre expandida.
// `isCollapsed` é derivado — nunca escrito direto — pra que o estado do
// mobile não possa dessincronizar do estado do desktop.
const SM_QUERY = '(max-width: 639.98px)';   // abaixo do breakpoint `sm` do Tailwind
const mediaMobile = typeof window !== 'undefined' ? window.matchMedia(SM_QUERY) : null;

const isMobile         = ref(!!mediaMobile?.matches);
const collapsedDesktop = ref(true);
const isCollapsed      = computed(() => (isMobile.value ? false : collapsedDesktop.value));
const isMobileOpen     = ref(false);

// No mobile (<sm) o wrapper reserva 0px (sidebar abre como overlay).
// No desktop (sm+) reserva a largura real pra empurrar o conteúdo.
const sidebarWidthClass = computed(() =>
  collapsedDesktop.value ? 'w-0 sm:w-14' : 'w-0 sm:w-72'
);

// ─── Medidas da nav, publicadas para o resto do app ──────────────────────
// Camadas teleportadas para o <body> (modal, flyout, drawer) não conseguem ler
// o estado local daqui. Em vez de subir isso para uma store só por causa
// disso, a nav PUBLICA suas medidas como CSS vars no <html>: quem precisar
// posiciona com `left: var(--nav-sidebar-w)` e acompanha a animação de
// recolher/expandir de graça, sem saber nada da nav.
//
//   --nav-sidebar-w   largura reservada pela sidebar (0 no mobile: lá é overlay)
//   --nav-topbar-h    altura da barra de cima (64px no mobile, 48px no desktop)
const larguraSidebar = computed(() => {
  if (isMobile.value) return '0px';
  return collapsedDesktop.value ? '3.5rem' : '18rem';   // w-14 / w-72
});
/* Altura MEDIDA, não chutada: a barra tem borda e conteúdo de altura variável,
   então 3rem no papel vira 3rem + alguns pixels na tela - e o modal encostava
   por cima da nav por essa diferença. O ResizeObserver mantém a var certa
   mesmo se o conteúdo da barra mudar de altura. */
const topbarEl = ref(null);
const alturaTopbarMedida = ref(0);
let obsTopbar = null;

watchEffect(() => {
  if (typeof document === 'undefined') return;
  const raiz = document.documentElement;
  raiz.style.setProperty('--nav-sidebar-w', larguraSidebar.value);
  /* Enquanto a medida não chega (primeiro paint), o valor de projeto serve de
     ponte para não haver um salto visível. */
  const h = alturaTopbarMedida.value || (isMobile.value ? 64 : 48);
  raiz.style.setProperty('--nav-topbar-h', `${h}px`);
});

onMounted(() => {
  if (typeof ResizeObserver === 'undefined' || !topbarEl.value) return;
  obsTopbar = new ResizeObserver(([e]) => {
    alturaTopbarMedida.value = Math.round(e.target.getBoundingClientRect().height);
  });
  obsTopbar.observe(topbarEl.value);
});
onBeforeUnmount(() => obsTopbar?.disconnect());

/* Fora do Office (login, link público) não existe nav: zera as medidas para
   quem consome não ficar com um recuo fantasma. */
onBeforeUnmount(() => {
  if (typeof document === 'undefined') return;
  const raiz = document.documentElement;
  raiz.style.setProperty('--nav-sidebar-w', '0px');
  raiz.style.setProperty('--nav-topbar-h', '0px');
});

const closeAllDropdowns = () => {
  Object.keys(dropdowns.value).forEach(k => (dropdowns.value[k] = false));
  Object.keys(subDropdowns.value).forEach(k => (subDropdowns.value[k] = false));
};

const collapseSidebar = () => { collapsedDesktop.value = true; closeAllDropdowns(); };
const expandSidebar   = () => { collapsedDesktop.value = false; };
const toggleSidebar   = () => { collapsedDesktop.value ? expandSidebar() : collapseSidebar(); };

// Botão de barras — uma responsabilidade por breakpoint:
// mobile abre/fecha o overlay (sempre expandido), desktop alterna o rail.
const onMenuClick = () => {
  if (isMobile.value) { isMobileOpen.value = !isMobileOpen.value; return; }
  toggleSidebar();
};

// Trocou de breakpoint: nunca deixar o overlay do mobile preso no desktop.
const onBreakpointChange = (e) => {
  isMobile.value = e.matches;
  if (!e.matches) isMobileOpen.value = false;
};
mediaMobile?.addEventListener('change', onBreakpointChange);
onBeforeUnmount(() => mediaMobile?.removeEventListener('change', onBreakpointChange));

// Recolhido: cliques em categorias/itens NÃO expandem a sidebar — só o botão de
// barras (toggleSidebar) faz isso. Recolhido, a navegação acontece pelo flyout.
const toggleDropdownSafe    = toggleDropdown;
const toggleSubDropdownSafe = toggleSubDropdown;

// ─── Flyout do rail recolhido ────────────────────────
// Ao passar o mouse numa categoria (recolhido), abre um painel flutuante ao
// lado com a árvore dela. Timers evitam flicker ao mover o mouse entre o
// ícone e o painel.
const FAVORITES_KEY = 'favorites';
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

  // Favoritos não vem do registry — monta o painel a partir da lista salva,
  // agrupada por categoria (mesmo agrupamento da sidebar expandida).
  if (key === FAVORITES_KEY) {
    return {
      label: 'Favoritos',
      icon: 'fas fa-star',
      iconColor: '',
      subEntries: favoriteEntries.value,
      flatItems: [],
      emptyText: 'Nenhum favorito adicionado',
      rect: flyout.value.rect,
    };
  }

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
    // `item` guarda o nome/ícone do registry — usado pelo flyout de favoritos
    // para exibir a entrada igualzinha à do menu (o favorito salvo só tem
    // router + section).
    idx[k] = { category: getCat(catKey)?.label || catKey, subcategory: subcatName || null, item };
  };
  for (const catKey of categoryKeys.value) {
    for (const it of categoryFlatItems(catKey)) add(catKey, null, it);
    for (const sub of subcatEntries(catKey)) {
      for (const it of sub.items || []) add(catKey, sub.name, it);
    }
  }
  return idx;
});

// Favoritos no formato do flyout: [{ key, name, items }] agrupados por categoria.
// O flyout tem um só nível de cabeçalho, então a subcategoria não entra aqui
// (na sidebar expandida ela continua aparecendo).
const favoriteEntries = computed(() => {
  const list = Array.isArray(favoritesStore.favorites) ? favoritesStore.favorites : [];
  const order = [];
  const buckets = {};
  for (const fav of list) {
    const meta = routeIndex.value[`${fav.router}@@${fav.section ?? ''}`] || {};
    const category = meta.category || 'Outros';
    if (!buckets[category]) { buckets[category] = []; order.push(category); }
    buckets[category].push({
      route: fav.router,
      section: fav.section,
      name: meta.item?.name || fav.section || fav.router,
      icon: meta.item?.icon || 'far fa-file',
      iconImg: meta.item?.iconImg,
      iconColor: meta.item?.iconColor,
    });
  }
  return order.map(category => ({ key: category, name: category, items: buckets[category] }));
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

// Qualquer troca de rota fecha o overlay do mobile (busca, flyout, link direto).
watch(() => route.fullPath, closeMobile);
</script>

<template>
  <div :class="['transition-[width] duration-200 ease-out-expo', sidebarWidthClass]">

    <!-- ─── Top Bar ─── -->
    <nav ref="topbarEl" class="fixed top-0 z-50 w-full bg-surface/80 backdrop-blur-xl border-b border-line">
      <div class="px-3 py-2 lg:px-5 lg:pl-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <IconButton
            icon="fas fa-bars" size="md"
            :label="isMobileOpen ? 'Fechar menu' : 'Abrir menu'"
            @click="onMenuClick" />

          <a href="/" 
             class="flex items-center select-none cursor-pointer">
            <img src="/Mlogotext.png" alt="Menin Logo"
                 class="h-7 sm:h-8 -my-2 dark:invert-0 invert" />
          </a>
        </div>

        <div class="flex items-center gap-1.5">
          <div class="hidden md:block mr-1"><Search /></div>
          <ThemeToggle />
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
          <!-- <li>
            <SidebarItem to="/" icon="fas fa-house" label="Dashboard"
              :collapsed="isCollapsed" @click="closeMobile()" />
          </li> -->

          <li>
            <SidebarFavorites
              :open="dropdowns.favorites"
              :collapsed="isCollapsed"
              :route-index="routeIndex"
              @toggle="toggleDropdownSafe('favorites')"
              @expand="closeMobile()"
              @hover="scheduleOpenFlyout"
              @leave="scheduleCloseFlyout"
            />
          </li>

          <template v-for="(grp, gi) in navSections" :key="grp.group">
            <!-- Rótulo de seção (expandido) · divisória discreta (recolhido) -->
            <li v-if="!isCollapsed"
                :class="['select-none px-2 pb-0.5', gi === 0 ? 'pt-0.5' : 'pt-2.5']">
              <span class="text-micro font-semibold uppercase tracking-wider text-ink-subtle">
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
                @expand="closeMobile()"
                @toggleFavorite="toggleFavorite"
                @hover="scheduleOpenFlyout"
                @leave="scheduleCloseFlyout"
              />
            </li>
          </template>

        </ul>

        <!-- Bottom — fixo: não rola junto com a lista acima -->
        <ul class="shrink-0 space-y-0.5 pt-2 pb-3 border-t border-line">
          <div class="block md:hidden mb-2"><Search /></div>

          <li v-if="isAdmin">
            <SidebarItem to="/support" icon="fas fa-headset" label="Suporte"
              :collapsed="isCollapsed" @click="closeMobile()" />
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
      :empty-text="flyoutCat.emptyText"
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
