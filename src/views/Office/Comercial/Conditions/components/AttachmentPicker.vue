<template>
  <div>
    <!-- ── Display atual ──────────────────────────────────────────────────── -->
    <div class="flex gap-2">
      <div class="flex-1 relative">
        <input
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
          type="url"
          class="inp"
          :placeholder="placeholder || 'Cole o link ou use os botões ao lado...'"
        />
      </div>
      <a
        v-if="modelValue"
        :href="modelValue"
        target="_blank"
        rel="noopener"
        class="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-line bg-surface-sunken text-gray-500 dark:text-gray-300 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:border-blue-700 dark:hover:text-blue-400 transition"
        title="Abrir link"
      >
        <i class="fas fa-external-link-alt text-xs"></i>
      </a>
      <button
        type="button"
        @click="openModal"
        class="flex-shrink-0 flex items-center gap-1.5 px-3 h-10 border border-line bg-surface-sunken text-ink-muted text-xs font-semibold rounded-md hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:border-blue-700 dark:hover:text-blue-400 transition"
        title="Buscar ou enviar arquivo"
      >
        <i class="fas fa-paperclip text-xs"></i>
        <span class="hidden sm:inline">Vincular</span>
      </button>
    </div>
    <p v-if="hint" class="mt-1.5 text-xs text-ink-subtle">{{ hint }}</p>

    <!-- ── Modal ──────────────────────────────────────────────────────────── -->
    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="modalOpen"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          @click.self="closeModal"
        >
          <div class="bg-surface-raised rounded-2xl shadow-2xl border border-line w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">

            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-line flex-shrink-0">
              <h3 class="text-sm font-bold text-ink flex items-center gap-2">
                <i class="fas fa-paperclip text-blue-500"></i>
                Vincular Arquivo
              </h3>
              <button
                @click="closeModal"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-surface-hover transition"
              >
                <i class="fas fa-times text-sm"></i>
              </button>
            </div>

            <!-- Tabs -->
            <div class="flex border-b border-line flex-shrink-0 px-5">
              <button
                v-for="tab in availableTabs"
                :key="tab.id"
                @click="activeTab = tab.id"
                :class="[
                  'flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-blue-600 text-accent'
                    : 'border-transparent text-ink-muted hover:text-gray-700 dark:hover:text-gray-200'
                ]"
              >
                <i :class="tab.icon" class="text-xs"></i>
                {{ tab.label }}
              </button>
            </div>

            <!-- Conteúdo -->
            <div class="flex-1 overflow-y-auto p-5 min-h-0">

              <!-- ── Tab: URL Manual ───────────────────────────────────────── -->
              <div v-if="activeTab === 'url'" class="space-y-4">
                <p class="text-xs text-ink-muted">
                  Cole o link direto de qualquer arquivo (Google Drive, OneDrive, SharePoint, etc.).
                </p>
                <div>
                  <label class="lbl">URL do Arquivo</label>
                  <input
                    v-model="urlInput"
                    type="url"
                    class="inp"
                    placeholder="https://..."
                    @keyup.enter="confirmUrl"
                  />
                </div>
                <div v-if="urlInput" class="flex items-center gap-3 p-3 bg-accent-soft border border-accent/30 rounded-md">
                  <i class="fas fa-link text-blue-500 text-sm flex-shrink-0"></i>
                  <span class="text-xs text-accent break-all flex-1">{{ urlInput }}</span>
                  <a :href="urlInput" target="_blank" class="text-blue-500 hover:text-blue-700 text-xs flex-shrink-0">
                    <i class="fas fa-external-link-alt"></i>
                  </a>
                </div>
                <button
                  @click="confirmUrl"
                  :disabled="!urlInput"
                  class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-40 transition"
                >
                  <i class="fas fa-check text-xs"></i> Usar este link
                </button>
              </div>

              <!-- ── Tab: Upload da Máquina ────────────────────────────────── -->
              <div v-if="activeTab === 'upload'" class="space-y-4">
                <p class="text-xs text-ink-muted">
                  Envie o arquivo do seu computador. Ele será armazenado e o link gerado automaticamente.
                </p>

                <!-- Drop zone -->
                <label
                  class="flex flex-col items-center justify-center gap-3 w-full h-36 border-2 border-dashed rounded-xl cursor-pointer transition"
                  :class="uploadFile
                    ? 'border-blue-400 bg-accent-soft'
                    : 'border-line bg-surface-sunken/30 hover:border-blue-300 dark:hover:border-blue-700'"
                >
                  <input type="file" class="sr-only" @change="handleFileSelect" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" />
                  <div v-if="!uploadFile" class="text-center">
                    <i class="fas fa-cloud-upload-alt text-2xl text-ink-subtle mb-2"></i>
                    <p class="text-sm font-medium text-ink-muted">Clique para selecionar</p>
                    <p class="text-xs text-ink-subtle mt-0.5">PDF, Word, Excel, Imagens</p>
                  </div>
                  <div v-else class="flex items-center gap-3 px-4">
                    <i class="fas fa-file text-blue-500 text-xl flex-shrink-0"></i>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-ink truncate">{{ uploadFile.name }}</p>
                      <p class="text-xs text-ink-subtle">{{ formatSize(uploadFile.size) }}</p>
                    </div>
                    <button type="button" @click.prevent="uploadFile = null" class="ml-auto text-gray-400 hover:text-red-500 transition">
                      <i class="fas fa-times text-xs"></i>
                    </button>
                  </div>
                </label>

                <!-- Progress -->
                <div v-if="uploading" class="w-full h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                  <div class="h-full bg-blue-500 rounded-full" style="width: 100%; animation: indeterminate 1.2s ease-in-out infinite;"></div>
                </div>

                <div v-if="uploadError" class="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-xs">
                  <i class="fas fa-exclamation-circle flex-shrink-0"></i>
                  {{ uploadError }}
                </div>

                <button
                  @click="handleUpload"
                  :disabled="!uploadFile || uploading"
                  class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-accent-hover disabled:opacity-40 transition"
                >
                  <i :class="uploading ? 'fa-spinner fa-spin' : 'fa-upload'" class="fas text-xs"></i>
                  {{ uploading ? 'Enviando...' : 'Enviar Arquivo' }}
                </button>
              </div>

              <!-- ── Tab: SharePoint ────────────────────────────────────────── -->
              <div v-if="activeTab === 'sharepoint'" class="space-y-4">

                <!-- Seleção de Site -->
                <div v-if="!sp.selectedSite">
                  <p class="text-xs text-ink-muted mb-3">Selecione o site do SharePoint:</p>
                  <div v-if="sp.loading" class="flex items-center justify-center py-8 text-gray-400">
                    <i class="fas fa-spinner fa-spin text-xl"></i>
                  </div>
                  <div v-else class="space-y-1">
                    <button
                      v-for="site in sp.sites"
                      :key="site.id"
                      @click="sp.selectSite(site)"
                      class="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-ink bg-surface-sunken/40 border border-line rounded-md hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-950/20 dark:hover:border-blue-800 dark:hover:text-blue-300 transition"
                    >
                      <i class="fab fa-microsoft text-blue-500 flex-shrink-0"></i>
                      <div class="min-w-0 flex-1">
                        <p class="font-semibold truncate">{{ site.displayName }}</p>
                        <p class="text-xs text-ink-subtle truncate">{{ site.webUrl }}</p>
                      </div>
                    </button>
                    <div v-if="!sp.sites.length && !sp.loading" class="text-sm text-gray-400 py-4 text-center">
                      Nenhum site encontrado.
                    </div>
                  </div>
                </div>

                <!-- Drive selecionado: browse de arquivos -->
                <template v-else>
                  <!-- Breadcrumb + back -->
                  <div class="flex items-center gap-2 flex-wrap">
                    <button
                      @click="resetSpSite"
                      class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                    >
                      <i class="fas fa-arrow-left mr-1"></i>Sites
                    </button>
                    <span class="text-xs text-ink-subtle">/</span>
                    <span class="text-xs font-semibold text-ink">{{ sp.selectedSite.displayName }}</span>

                    <!-- Drive selector (se mais de 1) -->
                    <select
                      v-if="sp.drives.length > 1"
                      :value="sp.selectedDrive?.id"
                      @change="(e) => sp.selectDrive(sp.drives.find(d => d.id === e.target.value))"
                      class="ml-2 text-xs px-2 py-1 border border-line rounded-md bg-surface-raised/60 text-ink-muted outline-none"
                    >
                      <option v-for="d in sp.drives" :key="d.id" :value="d.id">{{ d.name }}</option>
                    </select>
                  </div>

                  <!-- Busca -->
                  <div v-if="sp.selectedDrive" class="relative">
                    <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                    <input
                      v-model="sp.searchQuery"
                      @keyup.enter="sp.doSearch()"
                      type="text"
                      class="inp-sp"
                      placeholder="Buscar arquivo no SharePoint..."
                    />
                  </div>

                  <!-- Folder breadcrumb -->
                  <div v-if="sp.breadcrumb.length" class="flex items-center gap-1.5 flex-wrap text-xs">
                    <button @click="sp.navigateToBreadcrumb(-1)" class="text-blue-500 hover:text-blue-700 transition">
                      <i class="fas fa-folder text-xs mr-1"></i>Raiz
                    </button>
                    <template v-for="(crumb, ci) in sp.breadcrumb" :key="crumb.id">
                      <span class="text-gray-400">/</span>
                      <button
                        @click="sp.navigateToBreadcrumb(ci)"
                        :class="ci === sp.breadcrumb.length - 1
                          ? 'text-ink font-semibold'
                          : 'text-blue-500 hover:text-blue-700'"
                        class="transition"
                      >
                        {{ crumb.name }}
                      </button>
                    </template>
                  </div>

                  <!-- Aviso quando pode selecionar pasta -->
                  <div v-if="allowFolderSelection && !sp.loading && !sp.isSearching" class="flex items-start gap-2 p-2.5 bg-blue-50/60 dark:bg-blue-950/20 border border-accent/20 rounded-lg text-[11px] text-accent">
                    <i class="fas fa-info-circle mt-0.5"></i>
                    <span>Você pode selecionar uma <strong>pasta inteira</strong> — clique em "Selecionar pasta" ao lado dela. Ou abra a pasta e selecione "Selecionar esta pasta atual" no topo.</span>
                  </div>

                  <!-- Botão: selecionar a pasta atual (quando navegou para dentro de uma) -->
                  <button
                    v-if="allowFolderSelection && currentFolder && !sp.loading && !sp.isSearching"
                    @click="selectFolder(currentFolder)"
                    class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-accent-hover transition shadow-sm"
                  >
                    <i class="fas fa-folder-plus text-xs"></i>
                    Selecionar esta pasta atual: <strong class="font-bold">{{ currentFolder.name }}</strong>
                  </button>

                  <!-- Lista de arquivos -->
                  <div v-if="sp.loading || sp.isSearching" class="flex items-center justify-center py-8 text-gray-400">
                    <i class="fas fa-spinner fa-spin text-xl"></i>
                  </div>
                  <div v-else class="border border-line rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
                    <template v-for="item in displayedItems" :key="item.id">
                      <!-- Pasta -->
                      <div
                        v-if="item.isFolder"
                        class="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-hover/50 transition group"
                      >
                        <button
                          type="button"
                          @click="enterFolder(item)"
                          class="flex-1 flex items-center gap-3 min-w-0 text-left"
                        >
                          <i class="fas fa-folder text-yellow-500 w-4 text-sm"></i>
                          <span class="text-sm text-ink flex-1 truncate">{{ item.name }}</span>
                          <i class="fas fa-chevron-right text-ink-subtle text-xs"></i>
                        </button>
                        <button
                          v-if="allowFolderSelection"
                          type="button"
                          @click.stop="selectFolder(item)"
                          class="flex-shrink-0 ml-2 px-2.5 py-1 text-[11px] font-semibold rounded bg-accent-soft text-accent border border-accent/30 hover:bg-accent-soft transition"
                          title="Selecionar esta pasta inteira"
                        >
                          <i class="fas fa-folder-plus text-[10px] mr-1"></i>Selecionar pasta
                        </button>
                      </div>
                      <!-- Arquivo -->
                      <button
                        v-else
                        @click="selectSpFile(item)"
                        class="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent-soft group transition"
                      >
                        <i :class="fileIcon(item.name)" class="w-4 text-sm text-gray-400 group-hover:text-blue-500"></i>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm text-ink group-hover:text-blue-700 dark:group-hover:text-blue-300 truncate">
                            {{ item.name }}
                          </p>
                          <p v-if="item.lastModifiedAt" class="text-xs text-ink-subtle">
                            {{ formatDate(item.lastModifiedAt) }}{{ item.size ? ` · ${formatSize(item.size)}` : '' }}
                          </p>
                        </div>
                        <span class="flex-shrink-0 text-xs text-blue-500 opacity-0 group-hover:opacity-100 font-semibold transition">
                          Selecionar
                        </span>
                      </button>
                    </template>
                    <div v-if="!displayedItems.length" class="flex flex-col items-center justify-center py-8 text-ink-subtle">
                      <i class="fas fa-folder-open text-2xl mb-2"></i>
                      <p class="text-sm">Pasta vazia{{ allowFolderSelection && currentFolder ? ' — você pode selecioná-la mesmo assim usando o botão acima.' : '' }}</p>
                    </div>
                  </div>
                </template>
              </div>

            </div>
          </div>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useUploadStore } from '@/stores/Config/uploadStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import { useSharepointStore } from '@/stores/Microsoft/sharepointStore';

const props = defineProps({
    modelValue: { type: String, default: '' },
    placeholder: { type: String, default: '' },
    hint: { type: String, default: '' },
    uploadContext: { type: String, default: 'appraisal_laudo' },
    referenceId: { type: [Number, String], default: null },
    // Quando true, permite selecionar pastas inteiras no SharePoint (não apenas arquivos)
    allowFolderSelection: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

const modalOpen   = ref(false);
const activeTab   = ref('url');
const urlInput    = ref('');
const uploadFile  = ref(null);
const uploading   = ref(false);
const uploadError = ref('');
const currentFolder = ref(null);  // pasta SharePoint em que estamos dentro (para botão "selecionar pasta atual")

const uploadStore    = useUploadStore();
const microsoftStore = useMicrosoftStore();
const sp             = useSharepointStore();

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const allTabs = [
    { id: 'url',        label: 'Colar URL',      icon: 'fas fa-link' },
    { id: 'upload',     label: 'Enviar Arquivo',  icon: 'fas fa-upload' },
    { id: 'sharepoint', label: 'SharePoint',      icon: 'fab fa-microsoft' },
];

const availableTabs = computed(() =>
    allTabs.filter(t => t.id !== 'sharepoint' || microsoftStore.connected)
);

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal() {
    urlInput.value    = props.modelValue || '';
    uploadFile.value  = null;
    uploadError.value = '';
    activeTab.value   = 'url';
    modalOpen.value   = true;
    currentFolder.value = null;
    if (microsoftStore.connected && !sp.sites?.length) {
        sp.fetchSites();
    }
}

function closeModal() { modalOpen.value = false; }

// ─── SharePoint: reset site navigation ───────────────────────────────────────
function resetSpSite() {
    // In Pinia setup stores, assign directly to the store's reactive state
    sp.$patch({ selectedSite: null, selectedDrive: null, items: [], breadcrumb: [] });
    currentFolder.value = null;
}

// ─── SharePoint: navegação e seleção de pastas ───────────────────────────────
function enterFolder(folder) {
    currentFolder.value = folder; // memoriza a pasta corrente p/ botão "Selecionar esta pasta atual"
    sp.openFolder(folder);
}

function selectFolder(folder) {
    if (!props.allowFolderSelection) return;
    const url = folder?.webUrl || folder?.url || '';
    if (!url) return;
    emit('update:modelValue', url);
    closeModal();
}

// Mantém currentFolder sincronizado com a navegação por breadcrumb (volta = clear)
watch(() => sp.breadcrumb?.length, (len) => {
    if (!len) currentFolder.value = null;
});

// ─── Tab URL ──────────────────────────────────────────────────────────────────
function confirmUrl() {
    if (!urlInput.value) return;
    emit('update:modelValue', urlInput.value.trim());
    closeModal();
}

// ─── Tab Upload ───────────────────────────────────────────────────────────────
function handleFileSelect(e) {
    uploadFile.value  = e.target.files?.[0] ?? null;
    uploadError.value = '';
}

async function handleUpload() {
    if (!uploadFile.value) return;
    uploading.value  = true;
    uploadError.value = '';
    try {
        uploadStore.setFile(uploadFile.value);
        const result = await uploadStore.uploadByContext({
            context:      props.uploadContext,
            referenceId:  props.referenceId,
            resourceType: 'appraisal',
        }, false);
        const url = result?.url || result?.publicUrl || result?.fileUrl || '';
        if (!url) throw new Error('URL não retornada pelo servidor.');
        emit('update:modelValue', url);
        closeModal();
    } catch (err) {
        uploadError.value = err.message || 'Erro ao enviar o arquivo.';
    } finally {
        uploading.value = false;
    }
}

// ─── Tab SharePoint ───────────────────────────────────────────────────────────
// Pinia auto-unwraps refs, so sp.searchResults is already the array (no .value)
const displayedItems = computed(() =>
    sp.searchQuery?.trim() && sp.searchResults?.length
        ? sp.searchResults
        : (sp.items ?? [])
);

function selectSpFile(item) {
    const url = item.webUrl || item.url || '';
    if (!url) return;
    emit('update:modelValue', url);
    closeModal();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}
function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fileIcon(name) {
    const ext = (name || '').split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'fas fa-file-pdf text-red-500';
    if (['doc','docx'].includes(ext)) return 'fas fa-file-word text-blue-600';
    if (['xls','xlsx'].includes(ext)) return 'fas fa-file-excel text-green-600';
    if (['png','jpg','jpeg','gif','webp'].includes(ext)) return 'fas fa-file-image text-purple-500';
    return 'fas fa-file text-gray-400';
}
</script>

<style scoped>
.lbl    { @apply block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5; }
.inp    { @apply w-full px-3.5 py-2.5 text-sm text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-accent focus:ring-2 focus:ring-blue-500/15 transition-all duration-150; }
.inp-sp { @apply w-full pl-9 pr-3.5 py-2.5 text-sm text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-accent focus:ring-2 focus:ring-blue-500/15 transition-all duration-150; }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity .2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

@keyframes indeterminate {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
}
</style>
