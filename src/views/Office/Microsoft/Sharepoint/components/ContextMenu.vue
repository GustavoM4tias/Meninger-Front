<template>
  <Teleport to="body">
    <Transition name="ctx">
      <div
        v-if="visible"
        ref="menuEl"
        :style="menuStyle"
        class="fixed z-[9999] bg-surface-raised rounded-xl shadow-2xl border border-line py-1.5 min-w-[210px] select-none"
        @contextmenu.prevent
      >
        <!-- File name header -->
        <div class="px-3 py-2 mb-0.5 border-b border-line">
          <div class="flex items-center gap-2 min-w-0">
            <i :class="item?.isFolder ? 'fas fa-folder text-series-2' : fileIconClass(item?.ext)" class="text-sm shrink-0"></i>
            <span class="text-xs font-semibold text-ink-muted truncate">{{ item?.name }}</span>
          </div>
        </div>

        <template v-if="item?.isFolder">
          <CtxItem icon="fas fa-folder-open text-accent" label="Abrir" @click="act('open')" />
          <CtxItem icon="fas fa-arrow-up-right-from-square text-ink-subtle" label="Abrir em nova guia" @click="act('open-new-tab')" />
          <CtxDivider />
          <CtxItem :icon="isFavorited ? 'fas fa-star text-series-2' : 'far fa-star text-series-2'" :label="isFavorited ? 'Remover favorito' : 'Favoritar'" @click="act('favorite')" />
          <CtxDivider />
          <CtxItem icon="fas fa-pen text-ink-muted" label="Renomear" @click="act('rename')" />
          <CtxItem icon="fas fa-trash text-data-neg" label="Excluir" @click="act('delete')" :danger="true" />
        </template>

        <template v-else>
          <CtxItem icon="fas fa-eye text-accent" label="Visualizar" @click="act('preview')" />
          <CtxItem icon="fas fa-arrow-up-right-from-square text-ink-subtle" label="Abrir no aplicativo" @click="act('open-app')" />
          <CtxItem icon="fas fa-up-right-from-square text-ink-subtle" label="Abrir em nova guia" @click="act('open-new-tab')" />
          <CtxDivider />
          <CtxItem icon="fas fa-share-nodes text-data-pos" label="Compartilhar..." @click="act('share')" />
          <CtxItem icon="fas fa-link text-ink-muted" label="Copiar link" @click="act('copy-link')" />
          <CtxDivider />
          <CtxItem icon="fas fa-download text-accent" label="Baixar" @click="act('download')" />
          <CtxItem :icon="isFavorited ? 'fas fa-star text-series-2' : 'far fa-star text-series-2'" :label="isFavorited ? 'Remover favorito' : 'Favoritar'" @click="act('favorite')" />
          <CtxDivider />
          <CtxItem icon="fas fa-pen text-ink-muted" label="Renomear" @click="act('rename')" />
          <CtxItem icon="fas fa-trash text-data-neg" label="Excluir" @click="act('delete')" :danger="true" />
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
          ? 'text-data-neg hover:bg-data-neg/10 '
          : 'text-ink hover:bg-surface-hover',
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
    return () => h('div', { class: 'my-1 border-t border-line' });
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
// Cor de tipo de arquivo e IDENTIDADE (qual formato), nao estado. Por isso a
// escala categorica, e nao `data-pos`/`data-warn`/`data-neg`, que sao
// RESERVADAS para bom/atencao/ruim. Um .pdf nao e "negativo".
const EXT_ICONS = {
  xlsx: 'fas fa-file-excel text-series-8', xls: 'fas fa-file-excel text-series-8',
  docx: 'fas fa-file-word text-series-1', doc: 'fas fa-file-word text-series-1',
  pptx: 'fas fa-file-powerpoint text-series-6', ppt: 'fas fa-file-powerpoint text-series-6',
  pdf: 'fas fa-file-pdf text-series-6',
  png: 'fas fa-file-image text-series-7', jpg: 'fas fa-file-image text-series-7',
  jpeg: 'fas fa-file-image text-series-7', gif: 'fas fa-file-image text-series-7',
  svg: 'fas fa-file-image text-series-7', webp: 'fas fa-file-image text-series-7',
  mp4: 'fas fa-file-video text-series-5', mov: 'fas fa-file-video text-series-5',
  avi: 'fas fa-file-video text-series-5',
  mp3: 'fas fa-file-audio text-series-4', wav: 'fas fa-file-audio text-series-4',
  txt: 'fas fa-file-lines text-ink-muted', csv: 'fas fa-file-csv text-series-3',
  json: 'fas fa-file-code text-ink-muted', js: 'fas fa-file-code text-series-2',
  zip: 'fas fa-file-zipper text-series-2', rar: 'fas fa-file-zipper text-series-2',
};
function fileIconClass(ext) { return EXT_ICONS[ext?.toLowerCase()] || 'fas fa-file text-ink-subtle'; }
</script>

<style scoped>
.ctx-enter-active { transition: opacity 0.1s, transform 0.1s; }
.ctx-leave-active { transition: opacity 0.08s; }
.ctx-enter-from { opacity: 0; transform: scale(0.96) translateY(-4px); }
.ctx-leave-to { opacity: 0; }
</style>
