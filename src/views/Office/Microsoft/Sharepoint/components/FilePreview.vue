<template>
  <!-- O cabecalho proprio traz baixar e abrir no SharePoint, entao
       `hide-close`: o X do primitivo duplicaria a barra. -->
  <Modal :open="!!item" size="full" :padded="false" hide-close @close="emit('close')">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 bg-surface border-b border-line shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <i :class="fileIconClass(item.ext)" class="text-xl shrink-0"></i>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-white truncate">{{ item.name }}</p>
              <p class="text-xs text-ink-subtle">{{ formatSize(item.size) }} · {{ formatDate(item.lastModified) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0 ml-4">
            <button
              @click="handleDownload"
              :disabled="downloadingFile"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-sunken hover:bg-surface-raised text-xs text-ink transition-colors disabled:opacity-50">
              <i v-if="downloadingFile" class="fas fa-circle-notch animate-spin"></i>
              <i v-else class="fas fa-download"></i>
              Baixar
            </button>
            <button v-if="item.webUrl"
              @click="openInNewTab"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-sunken hover:bg-surface-raised text-xs text-ink transition-colors">
              <i class="fas fa-up-right-from-square"></i> Nova guia
            </button>
            <button @click="openInNativeApp"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-xs text-white transition-colors">
              <i class="fas fa-arrow-up-right-from-square"></i> Abrir no aplicativo
            </button>
            <button @click="emit('close')"
              class="w-8 h-8 rounded-lg bg-surface-sunken hover:bg-surface-raised flex items-center justify-center text-ink-subtle hover:text-white transition-colors ml-1">
              <i class="fas fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- Preview area -->
        <div class="flex-1 overflow-hidden flex items-center justify-center p-4">

          <!-- Loading state -->
          <div v-if="previewLoading" class="flex flex-col items-center gap-3 text-ink-subtle">
            <i class="fas fa-circle-notch animate-spin text-3xl text-accent"></i>
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
              <div class="w-32 h-32 rounded-2xl bg-surface-sunken flex items-center justify-center">
                <i class="fas fa-music text-5xl text-accent"></i>
              </div>
              <audio :src="item.downloadUrl" controls class="w-80" />
            </div>
          </template>

          <!-- Text / Code — via proxy -->
          <template v-else-if="isText">
            <div class="w-full h-full overflow-auto bg-surface rounded-lg p-5">
              <div v-if="textLoading" class="flex items-center justify-center h-full text-ink-subtle">
                <i class="fas fa-circle-notch animate-spin mr-2"></i> Carregando...
              </div>
              <pre v-else class="text-xs text-ink-subtle font-mono whitespace-pre-wrap leading-relaxed">{{ textContent }}</pre>
            </div>
          </template>

          <!-- Office files: embed via Office Online Viewer -->
          <!-- Planilha: lida da nuvem pela Workbook API do Graph.
               Vem antes do ramo Office porque o iframe do view.officeapps.live.com
               precisa de arquivo publicamente alcançável, e arquivo de biblioteca
               interna nunca é. Aqui a tabela é de verdade, com os valores. -->
          <template v-else-if="isSpreadsheet">
            <div class="w-full h-full flex flex-col rounded-lg overflow-hidden bg-surface-raised">
              <div v-if="sheetError" class="p-6 text-center text-sm text-ink-muted">
                <i class="fas fa-triangle-exclamation text-data-warn mb-2 block text-lg"></i>
                {{ sheetError }}
              </div>

              <template v-else>
                <!-- Abas da planilha -->
                <div v-if="sheets.length > 1" class="flex gap-1 px-3 py-2 border-b border-line overflow-x-auto shrink-0">
                  <button v-for="s in sheets" :key="s.id" type="button"
                    @click="carregarAba(s.name)"
                    class="px-2.5 py-1.5 min-h-9 rounded-lg text-micro font-medium whitespace-nowrap transition-colors"
                    :class="abaAtiva === s.name
                      ? 'bg-accent-soft text-accent'
                      : 'text-ink-muted hover:bg-surface-hover'">
                    {{ s.name }}
                  </button>
                </div>

                <div v-if="sheetLoading" class="flex-1 grid place-items-center text-ink-subtle text-sm">
                  <span><i class="fas fa-circle-notch animate-spin text-accent mr-2"></i>Lendo a planilha...</span>
                </div>

                <div v-else class="flex-1 overflow-auto">
                  <table class="text-xs border-collapse">
                    <tbody>
                      <tr v-for="(linha, li) in celulas" :key="li"
                        :class="li === 0 ? 'sticky top-0 bg-surface-sunken' : ''">
                        <td class="px-2 py-1 text-ink-subtle font-mono text-right border border-line/60 bg-surface-sunken sticky left-0 tabular-nums">
                          {{ li + 1 }}
                        </td>
                        <td v-for="(cel, ci) in linha" :key="ci"
                          class="px-2 py-1 border border-line/60 whitespace-nowrap max-w-[16rem] truncate"
                          :class="li === 0 ? 'font-semibold text-ink' : 'text-ink-muted'"
                          :title="String(cel ?? '')">
                          {{ cel }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="px-3 py-2 border-t border-line text-micro text-ink-subtle shrink-0">
                  {{ celulas.length }} linha(s) · {{ celulas[0]?.length || 0 }} coluna(s)
                  <span v-if="truncadaEm"> · mostrando as primeiras {{ truncadaEm }} linhas</span>
                </div>
              </template>
            </div>
          </template>

          <template v-else-if="isOffice">
            <div class="w-full h-full rounded-lg overflow-hidden bg-surface-raised">
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
  </Modal>
</template>

<script setup>
import { ref, computed, watch, defineComponent, h, onMounted, onUnmounted } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import Modal from '@/components/UI/Modal.vue';

const props = defineProps({ item: { type: Object, default: null } });
const emit  = defineEmits(['close']);

// ── Inline unsupported placeholder ───────────────────────────────────────────
const PreviewUnsupported = defineComponent({
  props: { item: Object },
  emits: ['open'],
  setup(p, { emit: e }) {
    return () => h('div', { class: 'flex flex-col items-center gap-4 text-center' }, [
      h('div', { class: 'w-24 h-24 rounded-2xl bg-surface-sunken flex items-center justify-center' },
        [h('i', { class: `${EXT_ICONS[p.item?.ext?.toLowerCase()] || 'fas fa-file text-ink-subtle'} text-5xl` })]),
      h('p', { class: 'text-ink-subtle font-medium' }, 'Pré-visualização não disponível'),
      h('p', { class: 'text-ink-muted text-sm max-w-xs' }, 'Use "Abrir no aplicativo" para acessar.'),
      h('button', {
        class: 'px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors',
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

// ── Planilha (Workbook API) ───────────────────────────────────────────────────
// Só .xlsx: a Microsoft não abre .xls nem .csv na nuvem. Fora disso o arquivo
// cai no ramo Office, como antes.
const isSpreadsheet = computed(() => ext.value === 'xlsx');

const MAX_LINHAS = 300; // planilha de 20 mil linhas travaria a tela

const sheets       = ref([]);
const abaAtiva     = ref('');
const celulas      = ref([]);
const truncadaEm   = ref(0);
const sheetLoading = ref(false);
const sheetError   = ref('');

async function carregarAbas() {
  const it = props.item;
  if (!it?.driveId || !it?.id) return;

  sheetLoading.value = true;
  sheetError.value = '';
  celulas.value = [];
  truncadaEm.value = 0;

  try {
    const base = `${API_URL}/microsoft/sharepoint/drives/${it.driveId}/items/${it.id}/worksheets`;
    const lista = await requestWithAuth(base);
    sheets.value = (lista || []).filter(s => s.visible);
    if (!sheets.value.length) {
      sheetError.value = 'A planilha não tem nenhuma aba visível.';
      return;
    }
    await carregarAba(sheets.value[0].name);
  } catch (err) {
    sheetError.value = err?.message || 'Não foi possível abrir a planilha.';
  } finally {
    sheetLoading.value = false;
  }
}

async function carregarAba(nome) {
  const it = props.item;
  if (!it?.driveId || !it?.id) return;

  abaAtiva.value = nome;
  sheetLoading.value = true;
  sheetError.value = '';

  try {
    const url = `${API_URL}/microsoft/sharepoint/drives/${it.driveId}/items/${it.id}`
              + `/worksheets/${encodeURIComponent(nome)}`;
    const data = await requestWithAuth(url);
    // `text` é o que aparece na tela do Excel (data formatada, moeda, fórmula
    // já resolvida). `values` traz o número cru — não serve para exibir.
    const linhas = (data.text?.length ? data.text : data.values) || [];
    truncadaEm.value = linhas.length > MAX_LINHAS ? MAX_LINHAS : 0;
    celulas.value = linhas.slice(0, MAX_LINHAS);
  } catch (err) {
    sheetError.value = err?.message || 'Não foi possível ler esta aba.';
  } finally {
    sheetLoading.value = false;
  }
}

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
</style>
