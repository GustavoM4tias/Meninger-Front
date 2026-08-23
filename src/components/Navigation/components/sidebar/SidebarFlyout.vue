<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import SidebarItem from './SidebarItem.vue';

/**
 * Painel flutuante exibido ao passar o mouse sobre uma categoria no rail
 * recolhido. Mostra a árvore inteira da categoria (subcategorias + itens),
 * navegável sem precisar expandir a sidebar. Teleportado para o body e
 * posicionado ao lado do ícone-âncora.
 */
const props = defineProps({
  label: { type: String, required: true },
  icon: { type: String, default: '' },
  iconColor: { type: String, default: '' },
  subEntries: { type: Array, default: () => [] },   // [{ key, name, icon, items }]
  flatItems: { type: Array, default: () => [] },
  emptyText: { type: String, default: '' },         // texto quando não há nenhum item (ex.: Favoritos vazio)
  isFavorited: { type: Function, required: true },
  rect: { type: Object, required: true },           // DOMRect do ícone-âncora
});

const emit = defineEmits(['navigate', 'toggleFavorite', 'keep', 'release']);

const MARGIN = 12;
const PANEL_W = 256; // w-64

const panel = ref(null);
const top = ref(props.rect.top);
const left = ref(props.rect.right + 8);

// Altura máxima do painel = viewport menos as margens. O corpo rola por dentro,
// então o painel nunca ultrapassa a tela verticalmente.
const maxHeight = computed(() => `calc(100vh - ${MARGIN * 2}px)`);

// Recalcula posição medindo a altura REAL já renderizada e prende dentro da
// viewport. Roda no mount e sempre que a âncora ou o conteúdo mudam (o mesmo
// componente é reaproveitado ao trocar de categoria no rail).
async function reposition() {
  await nextTick();
  const h = panel.value?.offsetHeight || 0;
  const maxTop = window.innerHeight - h - MARGIN;
  top.value = Math.max(MARGIN, Math.min(props.rect.top - 6, maxTop));

  // Horizontal: abre à direita do ícone; se não couber, vira para a esquerda.
  const wouldOverflowRight = props.rect.right + 8 + PANEL_W > window.innerWidth - MARGIN;
  left.value = wouldOverflowRight
    ? Math.max(MARGIN, props.rect.left - 8 - PANEL_W)
    : props.rect.right + 8;
}

onMounted(reposition);
watch(
  () => [props.rect, props.subEntries, props.flatItems],
  reposition,
  { deep: true }
);

const style = computed(() => ({
  top: `${top.value}px`,
  left: `${left.value}px`,
  maxHeight: maxHeight.value,
}));
</script>

<template>
  <teleport to="body">
    <transition
      appear
      enter-active-class="transition ease-out-expo duration-150"
      enter-from-class="opacity-0 -translate-x-1 scale-95"
      enter-to-class="opacity-100 translate-x-0 scale-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 -translate-x-1"
    >
      <div ref="panel" :style="style"
        @mouseenter="$emit('keep')" @mouseleave="$emit('release')"
        class="fixed z-[60] w-64 flex flex-col origin-left rounded-xl border border-line
               bg-surface-overlay shadow-overlay overflow-hidden">

        <!-- Cabeçalho -->
        <div class="shrink-0 flex items-center gap-2.5 px-3 h-11 border-b border-line
                    bg-gradient-to-br from-surface-raised to-surface-sunken">
          <i v-if="icon" :class="icon"
             :style="iconColor ? { color: iconColor } : undefined"
             class="w-4 text-accent text-sm shrink-0"></i>
          <span class="text-sm font-semibold text-ink truncate">{{ label }}</span>
        </div>

        <!-- Árvore -->
        <div class="flex-1 min-h-0 overflow-y-auto nav-scroll p-1.5 space-y-0.5">
          <p v-if="emptyText && !subEntries.length && !flatItems.length"
             class="px-2 py-2 text-xs text-ink-subtle">{{ emptyText }}</p>

          <!-- Subcategorias -->
          <template v-for="sub in subEntries" :key="sub.key">
            <p class="px-2 pt-1.5 pb-0.5 text-micro font-semibold uppercase tracking-wider text-ink-subtle">
              {{ sub.name }}
            </p>
            <SidebarItem
              v-for="item in sub.items" :key="`${item.route}-${item.section}`"
              :to="{ path: item.route, query: item.section ? { section: item.section } : undefined }"
              :icon="item.icon || 'far fa-file'"
              :icon-img="item.iconImg"
              :icon-color="item.iconColor"
              :label="item.name"
              :favorite="isFavorited(item.route, item.section)"
              size="sm"
              @click="$emit('navigate')"
              @toggleFavorite="$emit('toggleFavorite', item.route, item.section)"
            />
          </template>

          <!-- Itens planos -->
          <SidebarItem
            v-for="item in flatItems" :key="`${item.route}-${item.section}`"
            :to="{ path: item.route, query: item.section ? { section: item.section } : undefined }"
            :icon="item.icon || 'far fa-file'"
            :icon-img="item.iconImg"
            :icon-color="item.iconColor"
            :label="item.name"
            :favorite="isFavorited(item.route, item.section)"
            size="sm"
            @click="$emit('navigate')"
            @toggleFavorite="$emit('toggleFavorite', item.route, item.section)"
          />
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.nav-scroll { scrollbar-width: thin; scrollbar-color: rgb(148 163 184 / 0.35) transparent; }
.nav-scroll::-webkit-scrollbar { width: 6px; }
.nav-scroll::-webkit-scrollbar-thumb { background: rgb(148 163 184 / 0.35); border-radius: 9999px; }
.nav-scroll::-webkit-scrollbar-thumb:hover { background: rgb(148 163 184 / 0.6); }
.nav-scroll::-webkit-scrollbar-track { background: transparent; }
</style>
