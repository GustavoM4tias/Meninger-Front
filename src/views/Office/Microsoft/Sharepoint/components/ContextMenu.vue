<template>
  <Teleport to="body">
    <Transition name="ctx">
      <div
        v-if="visible"
        ref="menuEl"
        :style="menuStyle"
        class="fixed z-[9999] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 min-w-[210px] select-none"
        @contextmenu.prevent
      >
        <!-- File name header -->
        <div class="px-3 py-2 mb-0.5 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center gap-2 min-w-0">
            <i :class="item?.isFolder ? 'fas fa-folder text-yellow-400' : fileIconClass(item?.ext)" class="text-sm shrink-0"></i>
            <span class="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{{ item?.name }}</span>
          </div>
        </div>

        <template v-if="item?.isFolder">
          <CtxItem icon="fas fa-folder-open text-blue-500" label="Abrir" @click="act('open')" />
          <CtxDivider />
          <CtxItem :icon="isFavorited ? 'fas fa-star text-amber-400' : 'far fa-star text-amber-400'" :label="isFavorited ? 'Remover favorito' : 'Favoritar'" @click="act('favorite')" />
          <CtxDivider />
          <CtxItem icon="fas fa-pen text-gray-500" label="Renomear" @click="act('rename')" />
          <CtxItem icon="fas fa-trash text-red-500" label="Excluir" @click="act('delete')" :danger="true" />
        </template>

        <template v-else>
          <CtxItem icon="fas fa-eye text-blue-500" label="Visualizar" @click="act('preview')" />
          <CtxItem icon="fas fa-arrow-up-right-from-square text-gray-400" label="Abrir no aplicativo" @click="act('open-app')" />
          <CtxDivider />
          <CtxItem icon="fas fa-share-nodes text-green-500" label="Compartilhar..." @click="act('share')" />
          <CtxItem icon="fas fa-link text-gray-500" label="Copiar link" @click="act('copy-link')" />
          <CtxDivider />
          <CtxItem icon="fas fa-download text-blue-500" label="Baixar" @click="act('download')" />
          <CtxItem :icon="isFavorited ? 'fas fa-star text-amber-400' : 'far fa-star text-amber-400'" :label="isFavorited ? 'Remover favorito' : 'Favoritar'" @click="act('favorite')" />
          <CtxDivider />
          <CtxItem icon="fas fa-pen text-gray-500" label="Renomear" @click="act('rename')" />
          <CtxItem icon="fas fa-trash text-red-500" label="Excluir" @click="act('delete')" :danger="true" />
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, defineComponent, h } from 'vue';

// ── Inline sub-components ────────────────────────────────────────────────────
const CtxItem = defineComponent({
  props: { icon: String, label: String, danger: Boolean },
  emits: ['click'],
  setup(props, { emit }) {
    return () => h('button', {
      class: [
        'flex items-center gap-3 w-full px-3 py-1.5 text-sm transition-colors text-left',
        props.danger
          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
      ],
      onClick: () => emit('click'),
    }, [
      h('i', { class: `${props.icon} w-4 text-center text-xs` }),
      h('span', {}, props.label),
    ]);
  },
});

const CtxDivider = defineComponent({
  setup() {
    return () => h('div', { class: 'my-1 border-t border-gray-100 dark:border-gray-800' });
  },
});

// ── Props / emits ────────────────────────────────────────────────────────────
const props = defineProps({
  visible: Boolean,
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  item: { type: Object, default: null },
  isFavorited: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'action']);

const menuEl = ref(null);

const menuStyle = computed(() => {
  const margin = 8;
  let left = props.x;
  let top = props.y;
  if (menuEl.value) {
    const w = menuEl.value.offsetWidth || 210;
    const h2 = menuEl.value.offsetHeight || 250;
    if (left + w + margin > window.innerWidth) left = props.x - w;
    if (top + h2 + margin > window.innerHeight) top = props.y - h2;
  }
  return { top: `${Math.max(margin, top)}px`, left: `${Math.max(margin, left)}px` };
});

function act(type) {
  emit('action', type, props.item);
  emit('close');
}

function onClickOutside(e) {
  if (props.visible && menuEl.value && !menuEl.value.contains(e.target)) emit('close');
}
function onKey(e) { if (e.key === 'Escape') emit('close'); }

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside, true);
  document.addEventListener('keydown', onKey);
});
onUnmounted(() => {
  document.removeEventListener('mousedown', onClickOutside, true);
  document.removeEventListener('keydown', onKey);
});

// ── Icon map ─────────────────────────────────────────────────────────────────
const EXT_ICONS = {
  xlsx: 'fas fa-file-excel text-green-600', xls: 'fas fa-file-excel text-green-600',
  docx: 'fas fa-file-word text-blue-600', doc: 'fas fa-file-word text-blue-600',
  pptx: 'fas fa-file-powerpoint text-orange-500', ppt: 'fas fa-file-powerpoint text-orange-500',
  pdf: 'fas fa-file-pdf text-red-500',
  png: 'fas fa-file-image text-purple-500', jpg: 'fas fa-file-image text-purple-500',
  jpeg: 'fas fa-file-image text-purple-500', gif: 'fas fa-file-image text-purple-500',
  svg: 'fas fa-file-image text-purple-500', webp: 'fas fa-file-image text-purple-500',
  mp4: 'fas fa-file-video text-pink-500', mov: 'fas fa-file-video text-pink-500',
  avi: 'fas fa-file-video text-pink-500',
  mp3: 'fas fa-file-audio text-yellow-500', wav: 'fas fa-file-audio text-yellow-500',
  txt: 'fas fa-file-lines text-gray-500', csv: 'fas fa-file-csv text-teal-600',
  json: 'fas fa-file-code text-gray-600', js: 'fas fa-file-code text-yellow-500',
  zip: 'fas fa-file-zipper text-amber-600', rar: 'fas fa-file-zipper text-amber-600',
};
function fileIconClass(ext) { return EXT_ICONS[ext?.toLowerCase()] || 'fas fa-file text-gray-400'; }
</script>

<style scoped>
.ctx-enter-active { transition: opacity 0.1s, transform 0.1s; }
.ctx-leave-active { transition: opacity 0.08s; }
.ctx-enter-from { opacity: 0; transform: scale(0.96) translateY(-4px); }
.ctx-leave-to { opacity: 0; }
</style>
