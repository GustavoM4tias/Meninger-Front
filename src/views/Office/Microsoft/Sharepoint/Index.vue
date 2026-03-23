<template>
  <div
    class="min-h-full py-8 px-4 relative"
    @dragover="onWindowDragOver"
    @dragleave="onWindowDragLeave"
    @drop.prevent="onWindowDrop"
  >

    <!-- Drop zone overlay (for uploading files from desktop) -->
    <Transition name="dropzone">
      <div v-if="showDropZone"
        class="fixed inset-0 z-50 bg-blue-600/20 backdrop-blur-sm border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl px-10 py-8 text-center pointer-events-none">
          <i class="fas fa-cloud-arrow-up text-5xl text-blue-500 mb-3 block"></i>
          <p class="text-xl font-bold text-gray-800 dark:text-white">Soltar para fazer upload</p>
          <p class="text-sm text-gray-500 mt-1">Os arquivos serão enviados para a pasta atual</p>
        </div>
      </div>
    </Transition>

    <div class="max-w-7xl mx-auto space-y-5">

      <!-- ── Header ── -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center p-2">
            <svg width="22" height="22" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
              <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
              <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
              <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
            </svg>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">SharePoint</h1>
            <p class="text-xs text-gray-500 dark:text-gray-400">Navegue, visualize e gerencie seus arquivos</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Upload button -->
          <button v-if="sp.selectedDrive"
            @click="triggerUpload"
            :disabled="sp.uploading"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
            <i class="fas fa-cloud-arrow-up text-xs"></i>
            Upload
          </button>
          <input ref="fileInputEl" type="file" multiple class="hidden" @change="onFileInputChange" />

          <!-- Reload -->
          <button v-if="sp.selectedDrive"
            @click="reloadCurrent"
            :disabled="sp.loading"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
            <i class="fas fa-rotate-right text-xs" :class="{ 'animate-spin': sp.loading }"></i>
            Atualizar
          </button>
        </div>
      </div>

      <!-- ── Selectors ── -->
      <div class="flex flex-wrap gap-3">
        <div class="flex-1 min-w-48">
          <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Site SharePoint</label>
          <select
            class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            :disabled="sp.loading || !sp.sites.length"
            @change="e => onSelectSite(e.target.value)">
            <option value="">{{ sp.sites.length ? 'Selecione um site...' : 'Carregando sites...' }}</option>
            <option v-for="site in sp.sites" :key="site.id" :value="site.id">{{ site.name }}</option>
          </select>
        </div>

        <div class="flex-1 min-w-48">
          <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Biblioteca</label>
          <select
            class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            :disabled="sp.loading || !sp.drives.length"
            @change="e => onSelectDrive(e.target.value)">
            <option value="">{{ sp.selectedSite ? (sp.drives.length ? 'Selecione uma biblioteca...' : 'Carregando...') : 'Selecione um site primeiro' }}</option>
            <option v-for="drive in sp.drives" :key="drive.id" :value="drive.id">{{ drive.name }}</option>
          </select>
        </div>

        <div v-if="sp.selectedDrive" class="flex-1 min-w-48">
          <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">Buscar</label>
          <div class="relative">
            <input
              v-model="sp.searchQuery"
              @keydown.enter="sp.doSearch()"
              @input="sp.searchQuery ? null : sp.clearSearch()"
              type="text"
              placeholder="Nome do arquivo ou pasta..."
              class="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
          </div>
        </div>
      </div>

      <!-- ── Upload progress ── -->
      <Transition name="slide">
        <div v-if="sp.uploadProgress"
          class="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <i class="fas fa-cloud-arrow-up text-blue-500 text-sm shrink-0"></i>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-blue-700 dark:text-blue-300 truncate">{{ sp.uploadProgress.filename }}</p>
            <div class="mt-1 h-1.5 rounded-full bg-blue-200 dark:bg-blue-800 overflow-hidden">
              <div class="h-full rounded-full bg-blue-500 transition-all duration-300"
                :style="{ width: `${sp.uploadProgress.percent}%` }" />
            </div>
          </div>
          <span class="text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">{{ sp.uploadProgress.percent }}%</span>
        </div>
      </Transition>

      <!-- Toast movido para fixed (ver fora do max-w-7xl) -->

      <!-- ── File explorer ── -->
      <div v-if="sp.selectedDrive"
        class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">

        <!-- Breadcrumb (com suporte a drop para mover itens) -->
        <div class="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-1 flex-wrap text-sm bg-gray-50 dark:bg-gray-800/50">
          <button
            @click="sp.navigateToBreadcrumb(-1)"
            @dragover.prevent="breadcrumbDragOver = 'root'"
            @dragleave="breadcrumbDragOver = null"
            @drop.prevent="onBreadcrumbDrop('root')"
            :class="breadcrumbDragOver === 'root' ? 'bg-blue-100 dark:bg-blue-900/30 rounded px-1' : ''"
            class="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors">
            <i class="fas fa-hard-drive text-xs"></i>
            {{ sp.selectedDrive?.name }}
          </button>
          <template v-for="(crumb, idx) in sp.breadcrumb" :key="crumb.id">
            <i class="fas fa-chevron-right text-gray-300 dark:text-gray-600 text-xs"></i>
            <button
              @click="sp.navigateToBreadcrumb(idx)"
              @dragover.prevent="breadcrumbDragOver = crumb.id"
              @dragleave="breadcrumbDragOver = null"
              @drop.prevent="onBreadcrumbDrop(crumb.id)"
              :class="[
                idx === sp.breadcrumb.length - 1
                  ? 'text-gray-700 dark:text-gray-200 font-semibold'
                  : 'text-blue-600 dark:text-blue-400 hover:underline',
                breadcrumbDragOver === crumb.id ? 'bg-blue-100 dark:bg-blue-900/30 rounded px-1' : ''
              ]"
              class="transition-colors">
              {{ crumb.name }}
            </button>
          </template>
        </div>

        <!-- Search results banner -->
        <template v-if="sp.searchResults.length || sp.isSearching">
          <div class="px-5 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900 flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
            <span><i class="fas fa-magnifying-glass mr-1.5"></i>{{ sp.searchResults.length }} resultado(s) para "{{ sp.searchQuery }}"</span>
            <button @click="sp.clearSearch()" class="hover:underline">Limpar busca</button>
          </div>
          <FileGrid
            :items="sp.searchResults"
            :loading="sp.isSearching"
            @open-folder="sp.openFolder($event)"
            @action="handleAction"
            @move="handleMove"
          />
        </template>

        <template v-else>
          <FileGrid
            :items="sp.items"
            :loading="sp.loading"
            @open-folder="sp.openFolder($event)"
            @action="handleAction"
            @move="handleMove"
          />
        </template>
      </div>

      <!-- ── Initial empty state ── -->
      <div v-else-if="!sp.loading" class="text-center py-16 text-gray-400 dark:text-gray-600">
        <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-folder-open text-2xl text-gray-300 dark:text-gray-600"></i>
        </div>
        <p class="text-sm">Selecione um site e uma biblioteca para navegar pelos arquivos</p>
      </div>

    </div>

    <!-- ── Modals ── -->

    <!-- Rename modal -->
    <Transition name="modal">
      <div v-if="renameModal.show" class="fixed inset-0 z-[8000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6" @click.stop>
          <h2 class="text-base font-bold text-gray-900 dark:text-white mb-1">Renomear</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">{{ renameModal.item?.name }}</p>
          <input
            ref="renameInputEl"
            v-model="renameModal.newName"
            @keydown.enter="confirmRename"
            @keydown.esc="renameModal.show = false"
            class="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          <div class="flex gap-2 justify-end">
            <button @click="renameModal.show = false"
              class="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancelar
            </button>
            <button @click="confirmRename" :disabled="!renameModal.newName.trim() || renameModal.loading"
              class="px-4 py-2 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
              <i v-if="renameModal.loading" class="fas fa-circle-notch animate-spin mr-1"></i>
              Renomear
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Delete confirm modal -->
    <Transition name="modal">
      <div v-if="deleteModal.show" class="fixed inset-0 z-[8000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6" @click.stop>
          <div class="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <i class="fas fa-trash text-red-500 text-xl"></i>
          </div>
          <h2 class="text-base font-bold text-gray-900 dark:text-white mb-1">Excluir {{ deleteModal.item?.isFolder ? 'pasta' : 'arquivo' }}</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Tem certeza que deseja excluir <strong class="text-gray-700 dark:text-gray-200">{{ deleteModal.item?.name }}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <div v-if="!deleteModal.confirmed" class="flex gap-2 justify-end">
            <button @click="deleteModal.show = false"
              class="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancelar
            </button>
            <button @click="deleteModal.confirmed = true"
              class="px-4 py-2 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors">
              Excluir
            </button>
          </div>
          <div v-else class="flex flex-col gap-2">
            <p class="text-xs text-red-600 dark:text-red-400 font-medium text-center">Confirme a exclusão definitiva:</p>
            <div class="flex gap-2 justify-end">
              <button @click="deleteModal.show = false; deleteModal.confirmed = false"
                class="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancelar
              </button>
              <button @click="confirmDelete" :disabled="deleteModal.loading"
                class="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors">
                <i v-if="deleteModal.loading" class="fas fa-circle-notch animate-spin mr-1"></i>
                Sim, excluir permanentemente
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Share link modal -->
    <Transition name="modal">
      <div v-if="shareModal.show" class="fixed inset-0 z-[8000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6" @click.stop>
          <h2 class="text-base font-bold text-gray-900 dark:text-white mb-1">Compartilhar</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">{{ shareModal.item?.name }}</p>
          <div v-if="shareModal.loading" class="flex items-center justify-center py-6 text-gray-400">
            <i class="fas fa-circle-notch animate-spin mr-2"></i> Gerando link...
          </div>
          <div v-else-if="shareModal.link">
            <div class="flex gap-2 mb-4">
              <input :value="shareModal.link" readonly
                class="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 focus:outline-none" />
              <button @click="copyShareLink"
                class="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors whitespace-nowrap">
                <i class="fas fa-copy mr-1"></i> Copiar
              </button>
            </div>
            <p class="text-xs text-gray-400">Link de visualização válido para membros da organização.</p>
          </div>
          <div class="flex justify-end mt-4">
            <button @click="shareModal.show = false"
              class="px-4 py-2 rounded-xl text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- File preview -->
    <FilePreview :item="previewItem" @close="previewItem = null" />

    <!-- Toast: fixed bottom-right, acima de tudo -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.show"
          class="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm max-w-sm"
          :class="toast.type === 'success'
            ? 'bg-white dark:bg-gray-900 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            : 'bg-white dark:bg-gray-900 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'">
          <i :class="toast.type === 'success' ? 'fas fa-circle-check text-green-500' : 'fas fa-circle-exclamation text-red-500'" class="text-base shrink-0"></i>
          <span>{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, watch } from 'vue';

const breadcrumbDragOver = ref(null);
import { useSharepointStore } from '@/stores/Microsoft/sharepointStore';
import FileGrid from './components/FileGrid.vue';
import FilePreview from './components/FilePreview.vue';

const sp = useSharepointStore();

onMounted(() => sp.fetchSites());

// Converte erros do store em toasts (evita o banner vermelho permanente)
watch(() => sp.error, (msg) => {
  if (msg) {
    showToast(msg, 'error');
    sp.error = null;
  }
});

// ── Selectors ─────────────────────────────────────────────────────────────────
function onSelectSite(siteId) {
  const site = sp.sites.find(s => s.id === siteId);
  if (site) sp.selectSite(site);
}
function onSelectDrive(driveId) {
  const drive = sp.drives.find(d => d.id === driveId);
  if (drive) sp.selectDrive(drive);
}
function reloadCurrent() {
  if (sp.breadcrumb.length) {
    sp.navigateToBreadcrumb(sp.breadcrumb.length - 1);
  } else {
    sp.selectDrive(sp.selectedDrive);
  }
}

// ── Upload ────────────────────────────────────────────────────────────────────
const fileInputEl  = ref(null);
const showDropZone = ref(false);

function triggerUpload() { fileInputEl.value?.click(); }

async function onFileInputChange(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  for (const file of files) await doUpload(file);
  e.target.value = '';
}

function onWindowDragOver(e) {
  // Only show the upload drop zone for files coming from outside (desktop).
  // Internal grid drags carry 'text/plain' but NOT 'Files'.
  if (e.dataTransfer?.types?.includes('Files')) {
    e.preventDefault();
    showDropZone.value = true;
  }
}

function onWindowDragLeave(e) {
  if (!e.relatedTarget) showDropZone.value = false;
}

async function onWindowDrop(e) {
  showDropZone.value = false;
  const files = Array.from(e.dataTransfer?.files || []);
  if (!files.length) return;
  for (const file of files) await doUpload(file);
}

async function doUpload(file) {
  const parentId = sp.currentFolderId || 'root';
  try {
    await sp.uploadFile(file, parentId);
    showToast(`"${file.name}" enviado com sucesso!`, 'success');
  } catch (err) {
    showToast(`Erro ao enviar "${file.name}": ${err.message}`, 'error');
  }
}

// ── Abrir no aplicativo nativo (Office protocol handlers) ─────────────────────
const APP_PROTOCOLS = {
  docx: 'ms-word', doc: 'ms-word',
  xlsx: 'ms-excel', xls: 'ms-excel',
  pptx: 'ms-powerpoint', ppt: 'ms-powerpoint',
};

function openInNativeApp(item) {
  const protocol = APP_PROTOCOLS[item.ext?.toLowerCase()];
  if (protocol && item.webUrl) {
    // Usa iframe hidden — mesma técnica do SharePoint Online nativo.
    // encodeURI garante que espaços no caminho sejam codificados (%20).
    const uri = `${protocol}:ofe|u|${encodeURI(item.webUrl)}`;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-1px;left:-1px;width:1px;height:1px;opacity:0;border:0';
    iframe.src = uri;
    document.body.appendChild(iframe);
    setTimeout(() => document.body.removeChild(iframe), 2000);
  } else {
    window.open(item.webUrl, '_blank', 'noopener');
  }
}

// ── Action handler (from FileGrid) ────────────────────────────────────────────
const previewItem = ref(null);

async function handleAction(type, item) {
  switch (type) {
    case 'preview':
    case 'open': {
      if (item.isFolder) { sp.openFolder(item); break; }
      // Garante que temos a downloadUrl antes de abrir o preview
      let previewable = item;
      if (!item.downloadUrl && item.driveId) {
        const detail = await sp.fetchItemDetail(item.driveId, item.id);
        if (detail) previewable = { ...item, ...detail };
      }
      previewItem.value = previewable;
      break;
    }
    case 'open-app':
      openInNativeApp(item);
      break;
    case 'share':
      openShareModal(item);
      break;
    case 'copy-link':
      try {
        await navigator.clipboard.writeText(item.webUrl);
        showToast('Link copiado para a área de transferência!', 'success');
      } catch {
        showToast('Não foi possível copiar o link.', 'error');
      }
      break;
    case 'download':
      await forceDownload(item);
      break;
    case 'favorite':
      sp.toggleFavorite(item.id);
      showToast(sp.isFavorited(item.id) ? 'Adicionado aos favoritos!' : 'Removido dos favoritos!', 'success');
      break;
    case 'rename':
      openRenameModal(item);
      break;
    case 'delete':
      openDeleteModal(item);
      break;
  }
}

// ── Forçar download (fetch + blob para evitar abrir no navegador) ─────────────
async function forceDownload(item) {
  const url = item.downloadUrl || item.webUrl;
  if (!url) return;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch {
    // fallback: abre em nova aba
    window.open(url, '_blank', 'noopener');
  }
}

async function handleMove(itemId, targetFolderId) {
  try {
    await sp.moveItem(itemId, targetFolderId);
    showToast('Item movido com sucesso!', 'success');
  } catch (err) {
    showToast(`Erro ao mover: ${err.message}`, 'error');
  }
}

// Drop em item do breadcrumb: move o item arrastado para essa pasta
async function onBreadcrumbDrop(folderId) {
  breadcrumbDragOver.value = null;
  // O FileGrid coloca o ID do item arrastado em dataTransfer via text/plain
  const draggedId = window.__spDraggedItemId;
  if (!draggedId) return;
  if (draggedId === folderId) return;
  await handleMove(draggedId, folderId);
}

// ── Rename modal ──────────────────────────────────────────────────────────────
const renameInputEl = ref(null);
const renameModal = reactive({ show: false, item: null, newName: '', loading: false });

function openRenameModal(item) {
  renameModal.item = item;
  renameModal.newName = item.name;
  renameModal.loading = false;
  renameModal.show = true;
  nextTick(() => renameInputEl.value?.focus());
}

async function confirmRename() {
  const name = renameModal.newName.trim();
  if (!name || name === renameModal.item.name) return;
  renameModal.loading = true;
  try {
    await sp.renameItem(renameModal.item.id, name);
    renameModal.show = false;
    showToast('Renomeado com sucesso!', 'success');
  } catch (err) {
    showToast(`Erro ao renomear: ${err.message}`, 'error');
  } finally {
    renameModal.loading = false;
  }
}

// ── Delete modal ──────────────────────────────────────────────────────────────
const deleteModal = reactive({ show: false, item: null, confirmed: false, loading: false });

function openDeleteModal(item) {
  deleteModal.item = item;
  deleteModal.confirmed = false;
  deleteModal.loading = false;
  deleteModal.show = true;
}

async function confirmDelete() {
  deleteModal.loading = true;
  try {
    await sp.deleteItem(deleteModal.item.id);
    deleteModal.show = false;
    showToast('Excluído com sucesso!', 'success');
  } catch (err) {
    showToast(`Erro ao excluir: ${err.message}`, 'error');
  } finally {
    deleteModal.loading = false;
  }
}

// ── Share modal ───────────────────────────────────────────────────────────────
const shareModal = reactive({ show: false, item: null, link: null, loading: false });

function openShareModal(item) {
  shareModal.item = item;
  shareModal.link = item.webUrl || null;
  shareModal.loading = false;
  shareModal.show = true;
}

async function copyShareLink() {
  await navigator.clipboard.writeText(shareModal.link).catch(() => {});
  showToast('Link copiado!', 'success');
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '', type: 'success' });
let toastTimer = null;

function showToast(message, type = 'success') {
  toast.message = message;
  toast.type = type;
  toast.show = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.show = false; }, 3000);
}
</script>

<style scoped>
.dropzone-enter-active, .dropzone-leave-active { transition: opacity 0.2s; }
.dropzone-enter-from, .dropzone-leave-to { opacity: 0; }

.slide-enter-active, .slide-leave-active { transition: opacity 0.2s, transform 0.2s; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-8px); }

.modal-enter-active, .modal-leave-active { transition: opacity 0.15s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }

.toast-enter-active { transition: opacity 0.2s, transform 0.2s; }
.toast-leave-active { transition: opacity 0.15s, transform 0.15s; }
.toast-enter-from { opacity: 0; transform: translateY(12px) scale(0.97); }
.toast-leave-to { opacity: 0; transform: translateY(6px) scale(0.97); }
</style>
