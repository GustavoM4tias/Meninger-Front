<template>
  <Teleport to="body">
    <Transition name="preview">
      <div
        v-if="item"
        class="fixed inset-0 z-[9000] flex flex-col bg-gray-950/95 backdrop-blur"
        @click.self="emit('close')"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 bg-gray-900 border-b border-gray-800 shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <i :class="fileIconClass(item.ext)" class="text-xl shrink-0"></i>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-white truncate">{{ item.name }}</p>
              <p class="text-xs text-gray-400">{{ formatSize(item.size) }} · {{ formatDate(item.lastModified) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0 ml-4">
            <button
              @click="handleDownload"
              :disabled="downloadingFile"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 transition-colors disabled:opacity-50">
              <i v-if="downloadingFile" class="fas fa-circle-notch animate-spin"></i>
              <i v-else class="fas fa-download"></i>
              Baixar
            </button>
            <button v-if="item.webUrl"
              @click="openInNewTab"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-200 transition-colors">
              <i class="fas fa-up-right-from-square"></i> Nova guia
            </button>
            <button @click="openInNativeApp"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs text-white transition-colors">
              <i class="fas fa-arrow-up-right-from-square"></i> Abrir no aplicativo
            </button>
            <button @click="emit('close')"
              class="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-300 hover:text-white transition-colors ml-1">
              <i class="fas fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- Preview area -->
        <div class="flex-1 overflow-hidden flex items-center justify-center p-4">

          <!-- Loading state -->
          <div v-if="previewLoading" class="flex flex-col items-center gap-3 text-gray-400">
            <i class="fas fa-circle-notch animate-spin text-3xl text-blue-400"></i>
            <span class="text-sm">Carregando preview...</span>
          </div>

          <!-- Image — via blob URL do proxy -->
          <template v-else-if="isImage">
            <img v-if="blobSrc" :src="blobSrc" :alt="item.name"
              class="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            <PreviewUnsupported v-else :item="item" @open="openInNativeApp" />
          </template>

          <!-- PDF — via blob URL do proxy -->
          <template v-else-if="item.ext === 'pdf'">
            <iframe v-if="blobSrc" :src="blobSrc" class="w-full h-full rounded-lg border-0" title="PDF Preview" />
            <PreviewUnsupported v-else :item="item" @open="openInNativeApp" />
          </template>

          <!-- Video -->
          <template v-else-if="isVideo">
            <video :src="item.downloadUrl" controls class="max-w-full max-h-full rounded-lg shadow-2xl">
              Seu navegador não suporta vídeo.
            </video>
          </template>

          <!-- Audio -->
          <template v-else-if="isAudio">
            <div class="flex flex-col items-center gap-6">
              <div class="w-32 h-32 rounded-2xl bg-gray-800 flex items-center justify-center">
                <i class="fas fa-music text-5xl text-purple-400"></i>
              </div>
              <audio :src="item.downloadUrl" controls class="w-80" />
            </div>
          </template>

          <!-- Text / Code — via proxy -->
          <template v-else-if="isText">
            <div class="w-full h-full overflow-auto bg-gray-900 rounded-lg p-5">
              <div v-if="textLoading" class="flex items-center justify-center h-full text-gray-400">
                <i class="fas fa-circle-notch animate-spin mr-2"></i> Carregando...
              </div>
              <pre v-else class="text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">{{ textContent }}</pre>
            </div>
          </template>

          <!-- Office files: embed via Office Online Viewer -->
          <template v-else-if="isOffice">
            <div class="w-full h-full rounded-lg overflow-hidden bg-white">
              <iframe
                :src="`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.webUrl)}`"
                class="w-full h-full border-0"
                title="Office Preview"
              />
            </div>
          </template>

          <!-- Unsupported -->
          <template v-else>
            <PreviewUnsupported :item="item" @open="openInNativeApp" />
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, defineComponent, h, onMounted, onUnmounted } from 'vue';
import API_URL from '@/config/apiUrl';

const props = defineProps({ item: { type: Object, default: null } });
const emit  = defineEmits(['close']);

// ── Inline unsupported placeholder ───────────────────────────────────────────
const PreviewUnsupported = defineComponent({
  props: { item: Object },
  emits: ['open'],
  setup(p, { emit: e }) {
    return () => h('div', { class: 'flex flex-col items-center gap-4 text-center' }, [
      h('div', { class: 'w-24 h-24 rounded-2xl bg-gray-800 flex items-center justify-center' },
        [h('i', { class: `${EXT_ICONS[p.item?.ext?.toLowerCase()] || 'fas fa-file text-gray-400'} text-5xl` })]),
      h('p', { class: 'text-gray-300 font-medium' }, 'Pré-visualização não disponível'),
      h('p', { class: 'text-gray-500 text-sm max-w-xs' }, 'Use "Abrir no aplicativo" para acessar.'),
      h('button', {
        class: 'px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors',
        onClick: () => e('open'),
      }, [h('i', { class: 'fas fa-arrow-up-right-from-square mr-1.5' }), 'Abrir no aplicativo']),
    ]);
  },
});

// ── File type detection ────────────────────────────────────────────────────────
const IMAGES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
const VIDEOS = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
const AUDIOS = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
const TEXTS  = ['txt', 'csv', 'json', 'js', 'ts', 'html', 'css', 'md', 'xml', 'yaml', 'yml', 'log', 'sh', 'py', 'java', 'c', 'cpp'];
const OFFICE = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'];

const ext      = computed(() => props.item?.ext?.toLowerCase());
const isImage  = computed(() => IMAGES.includes(ext.value));
const isVideo  = computed(() => VIDEOS.includes(ext.value));
const isAudio  = computed(() => AUDIOS.includes(ext.value));
const isText   = computed(() => TEXTS.includes(ext.value));
const isOffice = computed(() => OFFICE.includes(ext.value));

// ── Content state ─────────────────────────────────────────────────────────────
const blobSrc        = ref(null);  // object URL para imagem / PDF
const previewLoading = ref(false);
const textContent    = ref('');
const textLoading    = ref(false);
const downloadingFile = ref(false);
let _currentBlobUrl = null;

function _revokeCurrent() {
  if (_currentBlobUrl) { URL.revokeObjectURL(_currentBlobUrl); _currentBlobUrl = null; }
  blobSrc.value = null;
  textContent.value = '';
}

function _authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function _proxyUrl(item, dl = false) {
  return `${API_URL}/microsoft/sharepoint/drives/${item.driveId}/items/${item.id}/content${dl ? '?dl=1' : ''}`;
}

// ── Watch item change → fetch content ────────────────────────────────────────
watch(() => props.item, async (item) => {
  _revokeCurrent();
  if (!item) return;

  const e = item.ext?.toLowerCase();

  // Images & PDFs: fetch via proxy → blob URL (sem CORS)
  if ((IMAGES.includes(e) || e === 'pdf') && item.driveId) {
    previewLoading.value = true;
    try {
      const res = await fetch(_proxyUrl(item), { headers: _authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      _currentBlobUrl = URL.createObjectURL(blob);
      blobSrc.value   = _currentBlobUrl;
    } catch {
      blobSrc.value = null;
    } finally {
      previewLoading.value = false;
    }
    return;
  }

  // Text / Code: fetch via proxy
  if (TEXTS.includes(e) && item.driveId) {
    textLoading.value = true;
    try {
      const res = await fetch(_proxyUrl(item), { headers: _authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      textContent.value = await res.text();
    } catch {
      textContent.value = '(Não foi possível carregar o conteúdo)';
    } finally {
      textLoading.value = false;
    }
  }
}, { immediate: true });

// ── Download via proxy ────────────────────────────────────────────────────────
async function handleDownload() {
  if (!props.item?.driveId) {
    // fallback: webUrl
    if (props.item?.webUrl) window.open(props.item.webUrl, '_blank', 'noopener');
    return;
  }
  downloadingFile.value = true;
  try {
    const res = await fetch(_proxyUrl(props.item, true), { headers: _authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob   = await res.blob();
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = props.item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  } catch {
    if (props.item?.webUrl) window.open(props.item.webUrl, '_blank', 'noopener');
  } finally {
    downloadingFile.value = false;
  }
}

// ── Abrir em nova guia ────────────────────────────────────────────────────────
function openInNewTab() {
  if (props.item?.webUrl) window.open(props.item.webUrl, '_blank', 'noopener');
}

// ── Abrir no app nativo ───────────────────────────────────────────────────────
const APP_PROTOCOLS = {
  docx: 'ms-word', doc: 'ms-word',
  xlsx: 'ms-excel', xls: 'ms-excel',
  pptx: 'ms-powerpoint', ppt: 'ms-powerpoint',
};

function openInNativeApp() {
  const protocol = APP_PROTOCOLS[props.item?.ext?.toLowerCase()];
  if (protocol && props.item?.webUrl) {
    // Chrome bloqueia protocol handlers em iframes — <a>.click() é mais confiável
    const a = document.createElement('a');
    a.href = `${protocol}:ofe|u|${props.item.webUrl}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 500);
  } else {
    window.open(props.item?.webUrl, '_blank', 'noopener');
  }
}

// ── Cleanup + Escape key ──────────────────────────────────────────────────────
function onKey(e) { if (e.key === 'Escape') emit('close'); }
onMounted(() => document.addEventListener('keydown', onKey));
onUnmounted(() => {
  document.removeEventListener('keydown', onKey);
  _revokeCurrent();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const EXT_ICONS = {
  xlsx: 'fas fa-file-excel text-green-500', xls: 'fas fa-file-excel text-green-500',
  docx: 'fas fa-file-word text-blue-500', doc: 'fas fa-file-word text-blue-500',
  pptx: 'fas fa-file-powerpoint text-orange-500', ppt: 'fas fa-file-powerpoint text-orange-500',
  pdf: 'fas fa-file-pdf text-red-500',
  png: 'fas fa-file-image text-purple-500', jpg: 'fas fa-file-image text-purple-500',
  jpeg: 'fas fa-file-image text-purple-500', gif: 'fas fa-file-image text-purple-500',
  svg: 'fas fa-file-image text-purple-500', webp: 'fas fa-file-image text-purple-500',
  mp4: 'fas fa-file-video text-pink-500', mov: 'fas fa-file-video text-pink-500',
  mp3: 'fas fa-file-audio text-yellow-400', wav: 'fas fa-file-audio text-yellow-400',
  txt: 'fas fa-file-lines text-gray-300', csv: 'fas fa-file-csv text-teal-400',
  json: 'fas fa-file-code text-gray-300',
  zip: 'fas fa-file-zipper text-amber-500', rar: 'fas fa-file-zipper text-amber-500',
};
function fileIconClass(ext) { return EXT_ICONS[ext?.toLowerCase()] || 'fas fa-file text-gray-400'; }

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
</script>

<style scoped>
.preview-enter-active { transition: opacity 0.15s; }
.preview-leave-active { transition: opacity 0.1s; }
.preview-enter-from, .preview-leave-to { opacity: 0; }
</style>
