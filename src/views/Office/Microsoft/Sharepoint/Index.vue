<template>
  <div
    class="min-h-[calc(100vh-3.5rem)]"
    @dragover="onWindowDragOver"
    @dragleave="onWindowDragLeave"
    @drop.prevent="onWindowDrop"
  >
    <!-- Drop zone overlay (for uploading files from desktop) -->
    <Transition name="dropzone">
      <div v-if="showDropZone"
        class="fixed inset-0 z-50 bg-accent/20 backdrop-blur-sm border-4 border-dashed border-accent flex items-center justify-center pointer-events-none">
        <div class="bg-surface-raised border border-line rounded-2xl shadow-overlay px-10 py-8 text-center pointer-events-none">
          <i class="fas fa-cloud-arrow-up text-5xl text-accent mb-3 block"></i>
          <p class="text-xl font-semibold text-ink">Soltar para fazer upload</p>
          <p class="text-sm text-ink-muted mt-1">Os arquivos serão enviados para a pasta atual</p>
        </div>
      </div>
    </Transition>

    <PageContainer size="full">
      <PageHeader
        subtitle="Navegue, visualize e gerencie seus arquivos"
        icon="fas fa-folder-tree">
        <template #title>SharePoint</template>
        <template #actions>
          <Button v-if="sp.selectedDrive"
            variant="primary"
            size="sm"
            icon="fas fa-cloud-arrow-up"
            :disabled="sp.uploading"
            @click="triggerUpload">
            Upload
          </Button>
          <input ref="fileInputEl" type="file" multiple class="hidden" @change="onFileInputChange" />
          <IconButton v-if="sp.selectedDrive"
            icon="fas fa-rotate-right"
            label="Atualizar"
            variant="secondary"
            size="sm"
            :disabled="sp.loading"
            :class="sp.loading ? 'animate-spin' : ''"
            @click="reloadCurrent" />
        </template>
      </PageHeader>

      <div class="space-y-5">

        <!-- ── Selectors ── -->
        <Surface variant="raised" padding="md" class="surface-gradient">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1 block">
                Site SharePoint
              </label>
              <Select
                :model-value="sp.selectedSite?.id || ''"
                :options="siteOptions"
                :placeholder="sp.sites.length ? 'Selecione um site...' : 'Carregando sites...'"
                :disabled="sp.loading || !sp.sites.length"
                @update:model-value="onSelectSite" />
            </div>

            <div>
              <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1 block">
                Biblioteca
              </label>
              <Select
                :model-value="sp.selectedDrive?.id || ''"
                :options="driveOptions"
                :placeholder="sp.selectedSite ? (sp.drives.length ? 'Selecione uma biblioteca...' : 'Carregando...') : 'Selecione um site primeiro'"
                :disabled="sp.loading || !sp.drives.length"
                @update:model-value="onSelectDrive" />
            </div>

            <div v-if="sp.selectedDrive">
              <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1 block">
                Buscar
              </label>
              <Input
                v-model="sp.searchQuery"
                placeholder="Nome do arquivo ou pasta..."
                icon-left="fas fa-magnifying-glass"
                @keydown.enter="sp.doSearch()"
                @input="sp.searchQuery ? null : sp.clearSearch()" />
            </div>
          </div>
        </Surface>

        <!-- ── Upload progress ── -->
        <Transition name="slide">
          <Surface v-if="sp.uploadProgress"
            variant="raised"
            padding="sm"
            class="border-accent/30 bg-accent-soft flex items-center gap-3">
            <i class="fas fa-cloud-arrow-up text-accent text-sm shrink-0"></i>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-accent truncate">{{ sp.uploadProgress.filename }}</p>
              <div class="mt-1 h-1.5 rounded-full bg-accent/20 overflow-hidden">
                <div class="h-full rounded-full bg-accent transition-all duration-300"
                  :style="{ width: `${sp.uploadProgress.percent}%` }" />
              </div>
            </div>
            <span class="text-xs font-bold text-accent shrink-0 font-mono tabular-nums">
              {{ sp.uploadProgress.percent }}%
            </span>
          </Surface>
        </Transition>

        <!-- ── File explorer ── -->
        <section v-if="sp.selectedDrive"
          class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden surface-gradient">

          <!-- Breadcrumb (drop target) -->
          <div class="px-4 sm:px-5 py-3 border-b border-line flex items-center gap-1 flex-wrap text-sm bg-surface-sunken/50">
            <button
              @click="sp.navigateToBreadcrumb(-1)"
              @dragover.prevent="breadcrumbDragOver = 'root'"
              @dragleave="breadcrumbDragOver = null"
              @drop.prevent="onBreadcrumbDrop('root')"
              :class="breadcrumbDragOver === 'root' ? 'bg-accent-soft rounded px-1' : ''"
              class="flex items-center gap-1.5 text-accent hover:underline font-medium transition-colors">
              <i class="fas fa-hard-drive text-xs"></i>
              {{ sp.selectedDrive?.name }}
            </button>
            <template v-for="(crumb, idx) in sp.breadcrumb" :key="crumb.id">
              <i class="fas fa-chevron-right text-ink-subtle text-xs"></i>
              <button
                @click="sp.navigateToBreadcrumb(idx)"
                @dragover.prevent="breadcrumbDragOver = crumb.id"
                @dragleave="breadcrumbDragOver = null"
                @drop.prevent="onBreadcrumbDrop(crumb.id)"
                :class="[
                  idx === sp.breadcrumb.length - 1
                    ? 'text-ink font-semibold'
                    : 'text-accent hover:underline',
                  breadcrumbDragOver === crumb.id ? 'bg-accent-soft rounded px-1' : ''
                ]"
                class="transition-colors">
                {{ crumb.name }}
              </button>
            </template>
          </div>

          <!-- Search results banner -->
          <template v-if="sp.searchResults.length || sp.isSearching">
            <div class="px-4 sm:px-5 py-2 bg-accent-soft border-b border-accent/20 flex items-center justify-between text-xs text-accent">
              <span><i class="fas fa-magnifying-glass mr-1.5"></i>{{ sp.searchResults.length }} resultado(s) para "{{ sp.searchQuery }}"</span>
              <button @click="sp.clearSearch()" class="hover:underline font-medium">Limpar busca</button>
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
        </section>

        <!-- ── Initial empty state ── -->
        <EmptyState v-else-if="!sp.loading"
          icon="fas fa-folder-open"
          title="Nenhuma biblioteca selecionada"
          description="Selecione um site e uma biblioteca para navegar pelos arquivos." />
      </div>
    </PageContainer>

    <!-- ── Modals ── -->

    <!-- Rename modal -->
    <Modal :open="renameModal.show"
      size="sm"
      title="Renomear"
      :subtitle="renameModal.item?.name"
      @close="renameModal.show = false">
      <Input
        ref="renameInputEl"
        v-model="renameModal.newName"
        placeholder="Novo nome"
        @keydown.enter="confirmRename"
        @keydown.esc="renameModal.show = false" />
      <template #footer>
        <Button variant="ghost" @click="renameModal.show = false">Cancelar</Button>
        <Button
          variant="primary"
          icon="fas fa-pen"
          :loading="renameModal.loading"
          :disabled="!renameModal.newName.trim()"
          @click="confirmRename">
          Renomear
        </Button>
      </template>
    </Modal>

    <!-- Delete confirm modal -->
    <Modal :open="deleteModal.show"
      size="sm"
      :title="`Excluir ${deleteModal.item?.isFolder ? 'pasta' : 'arquivo'}`"
      @close="deleteModal.show = false; deleteModal.confirmed = false">
      <div class="space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-red-500/10 grid place-items-center">
          <i class="fas fa-trash text-red-500 text-xl"></i>
        </div>
        <p class="text-sm text-ink-muted">
          Tem certeza que deseja excluir <strong class="text-ink">{{ deleteModal.item?.name }}</strong>?
          Esta ação não pode ser desfeita.
        </p>
        <p v-if="deleteModal.confirmed" class="text-xs text-red-500 font-medium">
          Confirme a exclusão definitiva:
        </p>
      </div>
      <template #footer>
        <Button variant="ghost" @click="deleteModal.show = false; deleteModal.confirmed = false">
          Cancelar
        </Button>
        <Button
          v-if="!deleteModal.confirmed"
          variant="danger"
          icon="fas fa-trash"
          @click="deleteModal.confirmed = true">
          Excluir
        </Button>
        <Button
          v-else
          variant="danger"
          icon="fas fa-triangle-exclamation"
          :loading="deleteModal.loading"
          @click="confirmDelete">
          Sim, excluir permanentemente
        </Button>
      </template>
    </Modal>

    <!-- Share link modal -->
    <Modal :open="shareModal.show"
      size="md"
      title="Compartilhar"
      :subtitle="shareModal.item?.name"
      @close="shareModal.show = false">
      <div v-if="shareModal.loading" class="flex items-center justify-center py-6 text-ink-muted">
        <i class="fas fa-circle-notch animate-spin mr-2"></i> Gerando link...
      </div>
      <div v-else-if="shareModal.link" class="space-y-3">
        <div class="flex gap-2">
          <input :value="shareModal.link" readonly
            class="flex-1 px-3 py-2 rounded-lg border border-line bg-surface-sunken text-xs text-ink-muted focus:outline-none" />
          <Button variant="primary" icon="fas fa-copy" size="sm" @click="copyShareLink">
            Copiar
          </Button>
        </div>
        <p class="text-xs text-ink-subtle">Link de visualização válido para membros da organização.</p>
      </div>
      <template #footer>
        <Button variant="ghost" @click="shareModal.show = false">Fechar</Button>
      </template>
    </Modal>

    <!-- File preview -->
    <FilePreview :item="previewItem" @close="previewItem = null" />

    <!-- Toast: fixed bottom-right -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.show"
          class="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-overlay border bg-surface-raised text-sm max-w-sm"
          :class="toast.type === 'success'
            ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            : 'border-red-500/30 text-red-600 dark:text-red-400'">
          <i :class="toast.type === 'success' ? 'fas fa-circle-check text-emerald-500' : 'fas fa-circle-exclamation text-red-500'" class="text-base shrink-0"></i>
          <span>{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, watch } from 'vue';
import API_URL from '@/config/apiUrl';

import { useSharepointStore } from '@/stores/Microsoft/sharepointStore';
import FileGrid from './components/FileGrid.vue';
import FilePreview from './components/FilePreview.vue';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const breadcrumbDragOver = ref(null);
const sp = useSharepointStore();

onMounted(() => sp.fetchSites());

// Converte erros do store em toasts (evita o banner vermelho permanente)
watch(() => sp.error, (msg) => {
  if (msg) {
    showToast(msg, 'error');
    sp.error = null;
  }
});

// ── Select options ────────────────────────────────────────────────────────────
const siteOptions = computed(() =>
  (sp.sites || []).map(s => ({ value: s.id, label: s.name }))
);
const driveOptions = computed(() =>
  (sp.drives || []).map(d => ({ value: d.id, label: d.name }))
);

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
    // Chrome bloqueia protocol handlers em iframes — usar <a>.click() é mais confiável
    const a = document.createElement('a');
    a.href = `${protocol}:ofe|u|${item.webUrl}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 500);
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
    case 'open-new-tab':
      if (item.webUrl) window.open(item.webUrl, '_blank', 'noopener');
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

// ── Download via proxy do backend (sem CORS) ─────────────────────────────────
async function forceDownload(item) {
  if (!item?.driveId) {
    if (item?.webUrl) window.open(item.webUrl, '_blank', 'noopener');
    return;
  }
  try {
    const token = localStorage.getItem('token');
    const url   = `${API_URL}/microsoft/sharepoint/drives/${item.driveId}/items/${item.id}/content?dl=1`;
    const res   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob    = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = blobUrl;
    a.download    = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
  } catch (err) {
    showToast(`Erro ao baixar: ${err.message}`, 'error');
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
  nextTick(() => renameInputEl.value?.focus?.());
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

.toast-enter-active { transition: opacity 0.2s, transform 0.2s; }
.toast-leave-active { transition: opacity 0.15s, transform 0.15s; }
.toast-enter-from { opacity: 0; transform: translateY(12px) scale(0.97); }
.toast-leave-to { opacity: 0; transform: translateY(6px) scale(0.97); }
</style>
