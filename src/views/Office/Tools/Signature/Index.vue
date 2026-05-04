<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useSignatureDocumentStore } from '@/stores/Signature/signatureDocumentStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { uploadSignatureDocApi } from '@/utils/Signature/signatureDocumentApi';
import SignatureModal from '@/components/Signature/SignatureModal.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Spinner from '@/components/UI/Spinner.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

// ── Stores ───────────────────────────────────────────────────────────────────
const sigDocStore = useSignatureDocumentStore();
const authStore = useAuthStore();

// ── Tabs ─────────────────────────────────────────────────────────────────────
const activeTab = ref('create');

const tabOptions = computed(() => [
  { value: 'create', label: 'Criar / Enviar', icon: 'fas fa-paper-plane' },
  {
    value: 'pending',
    label: sigDocStore.pendingCount > 0
      ? `Para assinar (${sigDocStore.pendingCount > 9 ? '9+' : sigDocStore.pendingCount})`
      : 'Para assinar',
    icon: 'fas fa-pen-nib',
  },
  { value: 'history', label: 'Histórico', icon: 'fas fa-history' },
]);

// ── Utilitários gerais ───────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function computeHash(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function downloadDoc(url, name) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name ?? 'documento'}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, '_blank');
  }
}

function progressPct(doc) {
  const total = doc?.required_signers_count ?? doc?.signers?.length ?? 1;
  const signed = doc?.signed_signers_count ?? 0;
  return total > 0 ? Math.round((signed / total) * 100) : 0;
}

// ── Status labels / classes ──────────────────────────────────────────────────
const DOC_STATUS = {
  DRAFT:            { label: 'Rascunho',  cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400' },
  PENDING:          { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  PARTIALLY_SIGNED: { label: 'Parcial',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  SIGNED:           { label: 'Assinado',  cls: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
  CANCELLED:        { label: 'Cancelado', cls: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
  REJECTED:         { label: 'Recusado',  cls: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' },
  EXPIRED:          { label: 'Expirado',  cls: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400' },
};

const SIGNER_STATUS = {
  REQUESTED: { label: 'Aguardando', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
  PENDING:   { label: 'Iniciado',   cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' },
  SIGNED:    { label: 'Assinado',   cls: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' },
  REJECTED:  { label: 'Recusado',   cls: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' },
  CANCELLED: { label: 'Cancelado',  cls: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' },
  EXPIRED:   { label: 'Expirado',   cls: 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400' },
};

function docStatusLabel(s) { return DOC_STATUS[s]?.label ?? s ?? '–'; }
function docStatusClass(s) { return DOC_STATUS[s]?.cls ?? 'bg-gray-100 text-gray-500'; }
function signerStatusLabel(s) { return SIGNER_STATUS[s]?.label ?? s ?? '–'; }
function signerStatusClass(s) { return SIGNER_STATUS[s]?.cls ?? 'bg-gray-100 text-gray-500'; }

// ── Signer avatar helpers ────────────────────────────────────────────────────
function signerAvatarBorder(status) {
  const map = { SIGNED: 'border-green-400', REJECTED: 'border-rose-400', CANCELLED: 'border-red-400', PENDING: 'border-blue-400' };
  return map[status] ?? 'border-line';
}
function signerDotClass(status) {
  const map = { SIGNED: 'bg-green-400 text-white', REJECTED: 'bg-rose-400 text-white', CANCELLED: 'bg-red-400 text-white', PENDING: 'bg-blue-400 text-white' };
  return map[status] ?? 'bg-amber-400 text-white';
}
function signerDotIcon(status) {
  const map = { SIGNED: 'fas fa-check text-[6px]', REJECTED: 'fas fa-times text-[6px]', CANCELLED: 'fas fa-ban text-[6px]', PENDING: 'fas fa-hourglass-half text-[6px]' };
  return map[status] ?? 'fas fa-clock text-[6px]';
}

// ── Usuários ─────────────────────────────────────────────────────────────────
const currentUserId = computed(() => String(authStore.user?.id ?? ''));

const userIdOptions = computed(() =>
  (authStore.users || []).filter(u => u.status === true || u.status === 1).map(u => String(u.id))
);

const userMap = computed(() => {
  const map = {};
  for (const u of authStore.users || []) map[String(u.id)] = u;
  return map;
});

function userById(id) { return userMap.value[String(id)] ?? null; }
function isCurrentUser(id) { return String(id) === currentUserId.value; }
function removeSignerUser(id) { selectedSignerIds.value = selectedSignerIds.value.filter(v => v !== id); }
function toggleSignerId(id) {
  const idx = selectedSignerIds.value.indexOf(id);
  selectedSignerIds.value = idx === -1
    ? [...selectedSignerIds.value, id]
    : selectedSignerIds.value.filter(v => v !== id);
}

// ── Criar documento ──────────────────────────────────────────────────────────
const createFileInputRef = ref(null);
const createFile = ref(null);
const isCreateDragging = ref(false);
const createLoading = ref(false);
const createError = ref(null);
const createSuccess = ref(null);
const selectedSignerIds = ref([]);
const createForm = ref({ documentName: '', documentHash: '' });

async function handleCreateFileSelected(file) {
  if (!file || file.type !== 'application/pdf') {
    createError.value = 'Apenas arquivos PDF são aceitos.';
    return;
  }
  createError.value = null;
  createFile.value = file;
  createForm.value.documentName = file.name.replace(/\.pdf$/i, '');
  createForm.value.documentHash = await computeHash(file);
}

function onCreateFileChange(e) { handleCreateFileSelected(e.target.files[0]); }
function onCreateFileDrop(e) { isCreateDragging.value = false; handleCreateFileSelected(e.dataTransfer.files[0]); }
function clearCreateFile() {
  createFile.value = null;
  createForm.value.documentHash = '';
  if (createFileInputRef.value) createFileInputRef.value.value = '';
}

async function submitCreateDocument() {
  if (!createFile.value || !createForm.value.documentName || !selectedSignerIds.value.length) return;
  createLoading.value = true;
  createError.value = null;
  createSuccess.value = null;
  try {
    const uploadRes = await uploadSignatureDocApi(createFile.value);
    const documentUrl = uploadRes.data?.url ?? uploadRes.url ?? null;
    await sigDocStore.createDocument({
      document_name: createForm.value.documentName,
      document_type: 'PDF',
      document_url: documentUrl,
      document_hash: createForm.value.documentHash,
      metadata: {},
      signer_ids: selectedSignerIds.value.map(uid => Number(uid)),
    });
    createSuccess.value = `Documento criado e enviado para ${selectedSignerIds.value.length} assinante(s)!`;
    clearCreateFile();
    createForm.value.documentName = '';
    selectedSignerIds.value = [];
    await Promise.all([sigDocStore.fetchMyDocuments(), sigDocStore.fetchPendingCount()]);
  } catch (err) {
    createError.value = sigDocStore.error || err?.message || 'Erro ao criar documento.';
  } finally {
    createLoading.value = false;
  }
}

// ── Deletar documento ────────────────────────────────────────────────────────
const deletingDocIds = ref(new Set());
function canDeleteDoc(doc) { return ['PENDING', 'DRAFT'].includes(doc.status); }

async function deleteDocument(doc) {
  if (!confirm(`Excluir "${doc.document_name}"? Todas as assinaturas pendentes serão canceladas.`)) return;
  deletingDocIds.value = new Set([...deletingDocIds.value, doc.id]);
  try {
    await sigDocStore.deleteDocument(doc.id);
    await sigDocStore.fetchPendingCount();
  } catch (err) {
    alert(sigDocStore.error || err?.message || 'Erro ao excluir documento.');
  } finally {
    const next = new Set(deletingDocIds.value);
    next.delete(doc.id);
    deletingDocIds.value = next;
  }
}

// ── Signing items ────────────────────────────────────────────────────────────
const pendingSigningItems = computed(() =>
  sigDocStore.mySigningItems.filter(s => s.status === 'REQUESTED' || s.status === 'PENDING')
);
const historySigningItems = computed(() =>
  sigDocStore.mySigningItems.filter(s => !['REQUESTED', 'PENDING'].includes(s.status))
);
function refreshPending() {
  sigDocStore.fetchMySigningItems();
  sigDocStore.fetchPendingCount();
}

// ── Rejeitar ─────────────────────────────────────────────────────────────────
const rejectingIds = ref(new Set());
const rejectErrors = ref({});

async function rejectSignerItem(item) {
  if (!confirm(`Recusar a solicitação para "${item.document?.document_name ?? 'este documento'}"?`)) return;
  rejectingIds.value = new Set([...rejectingIds.value, item.id]);
  delete rejectErrors.value[item.id];
  try {
    await sigDocStore.rejectSigner(item.id, 'Recusado pelo assinante');
    await sigDocStore.fetchMySigningItems();
    await sigDocStore.fetchPendingCount();
  } catch (err) {
    rejectErrors.value = { ...rejectErrors.value, [item.id]: sigDocStore.error || err?.message || 'Erro ao recusar.' };
  } finally {
    const next = new Set(rejectingIds.value);
    next.delete(item.id);
    rejectingIds.value = next;
  }
}

// ── Modal de assinatura ──────────────────────────────────────────────────────
const showSignModal = ref(false);
const activeSignerItem = ref(null);

function openSignModal(item) { activeSignerItem.value = item; showSignModal.value = true; }
async function onSigned() {
  showSignModal.value = false;
  activeSignerItem.value = null;
  await Promise.all([sigDocStore.fetchMyDocuments(), sigDocStore.fetchMySigningItems(), sigDocStore.fetchPendingCount()]);
}
function onSignCancel() { showSignModal.value = false; activeSignerItem.value = null; }

// ── Inicialização ────────────────────────────────────────────────────────────
async function loadTabData() {
  await Promise.all([
    sigDocStore.fetchMyDocuments(),
    sigDocStore.fetchMySigningItems(),
    sigDocStore.fetchPendingCount(),
  ]);
  if (!authStore.users?.length) await authStore.getAllUsers();
}

onMounted(loadTabData);
watch(activeTab, loadTabData);
</script>

<template>
  <div class="h-[calc(100vh-3.5rem)] flex flex-col bg-surface">

    <!-- Header -->
    <PageContainer :padded="false" class="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-3">
      <PageHeader
        subtitle="Crie documentos com múltiplas assinaturas autenticadas por senha e reconhecimento facial."
        icon="fas fa-file-signature">
        <template #title>
          <span>Assinatura Digital</span>
          <Favorite :router="'/tools/signature'" :section="'Assinatura Digital'" />
        </template>
        <template #actions>
          <Badge v-if="sigDocStore.pendingCount > 0" variant="warning" size="sm">
            <i class="fas fa-pen-nib text-[9px]"></i>
            {{ sigDocStore.pendingCount }} aguardando
          </Badge>
        </template>
      </PageHeader>
    </PageContainer>

    <!-- Tabs -->
    <PageContainer :padded="false" class="px-4 sm:px-6 lg:px-8 pb-3">
      <SegmentedControl v-model="activeTab" :options="tabOptions" />
    </PageContainer>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-6">
      <div class="max-w-7xl mx-auto px-2 sm:px-8 lg:px-10 pb-3 ">

        <!-- ═══════════════════════════════════════════════════════════
             TAB: CRIAR / ENVIAR
             ═══════════════════════════════════════════════════════════ -->
        <div v-show="activeTab === 'create'" class="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-2">

          <!-- Formulário -->
          <div class="lg:col-span-2">
            <Surface variant="raised" padding="md" class="space-y-4">
              <h2 class="font-semibold text-ink text-sm">Novo documento</h2>

              <!-- Upload PDF -->
              <div
                class="relative rounded-xl border-2 border-dashed transition-colors cursor-pointer"
                :class="[
                  isCreateDragging ? 'border-accent bg-accent-soft/40' : 'border-line hover:border-accent',
                  createFile ? 'bg-green-500/10 border-green-400' : ''
                ]"
                @dragover.prevent="isCreateDragging = true"
                @dragleave="isCreateDragging = false"
                @drop.prevent="onCreateFileDrop"
                @click="createFileInputRef?.click()">
                <input ref="createFileInputRef" type="file" accept="application/pdf" class="hidden"
                  @change="onCreateFileChange" />
                <div class="p-6 text-center">
                  <template v-if="createFile">
                    <i class="fas fa-file-pdf text-3xl text-green-500 mb-2" />
                    <p class="font-medium text-ink text-sm truncate">{{ createFile.name }}</p>
                    <p class="text-xs text-ink-subtle mt-0.5">{{ formatSize(createFile.size) }}</p>
                    <button type="button" class="mt-2 text-xs text-red-400 hover:text-red-500 transition"
                      @click.stop="clearCreateFile">
                      Remover
                    </button>
                  </template>
                  <template v-else>
                    <i class="fas fa-cloud-upload-alt text-3xl text-ink-subtle mb-2" />
                    <p class="text-sm text-ink-muted">
                      Arraste um PDF ou <span class="text-accent">clique para selecionar</span>
                    </p>
                    <p class="text-xs text-ink-subtle mt-0.5">Apenas arquivos .pdf</p>
                  </template>
                </div>
              </div>

              <!-- Nome do documento -->
              <Input
                v-model="createForm.documentName"
                label="Nome do documento"
                placeholder="Ex: Contrato de prestação de serviços"
                iconLeft="fas fa-file-alt" />

              <!-- Hash -->
              <div v-if="createForm.documentHash"
                class="text-[11px] text-ink-subtle font-mono break-all bg-surface-sunken rounded-lg p-2 border border-line">
                SHA-256: {{ createForm.documentHash }}
              </div>

              <!-- Assinantes -->
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-ink-muted uppercase tracking-wide">Assinantes</label>
                <MultiSelector v-model="selectedSignerIds" :options="userIdOptions"
                  placeholder="Selecione um ou mais assinantes...">
                  <template #button="{ selected }">
                    <template v-if="selected.length === 0">Selecione um ou mais assinantes...</template>
                    <template v-else-if="selected.length === 1">
                      <span class="flex items-center gap-2">
                        <img
                          :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(userById(selected[0])?.username ?? '')}&background=random&size=24`"
                          class="h-5 w-5 rounded-full shrink-0" />
                        {{ userById(selected[0])?.username ?? selected[0] }}
                      </span>
                    </template>
                    <template v-else>
                      <span class="flex items-center gap-1.5">
                        <i class="fas fa-users text-accent text-xs" />
                        {{ selected.length }} assinantes selecionados
                      </span>
                    </template>
                  </template>

                  <template #option="{ option }">
                    <div class="flex items-center gap-2.5 flex-1 min-w-0" @click.prevent="toggleSignerId(option)">
                      <img
                        :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(userById(option)?.username ?? '')}&background=random&size=32`"
                        class="h-7 w-7 rounded-full shrink-0" />
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-ink truncate leading-tight">
                          {{ userById(option)?.username ?? option }}
                          <span v-if="isCurrentUser(option)"
                            class="ml-2 inline-flex items-center rounded-full bg-accent-soft text-accent px-2 py-0.5 text-[10px]">
                            Eu
                          </span>
                        </p>
                        <p class="text-xs text-ink-subtle truncate leading-tight">
                          {{ userById(option)?.position ?? '' }}
                        </p>
                      </div>
                      <i v-if="userById(option) && !userById(option).face_enabled"
                        class="fas fa-exclamation-triangle text-amber-400 text-xs shrink-0"
                        title="Sem facial cadastrado" />
                    </div>
                  </template>
                </MultiSelector>

                <!-- Chips dos selecionados -->
                <div v-if="selectedSignerIds.length" class="flex flex-wrap gap-1.5 mt-1">
                  <span v-for="uid in selectedSignerIds" :key="uid"
                    class="inline-flex items-center gap-1.5 rounded-full bg-accent-soft border border-accent/20 pl-1.5 pr-2 py-0.5 text-xs text-accent">
                    <img
                      :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(userById(uid)?.username ?? '')}&background=random&size=20`"
                      class="h-4 w-4 rounded-full shrink-0" />
                    {{ userById(uid)?.username ?? uid }}
                    <i v-if="userById(uid) && !userById(uid).face_enabled"
                      class="fas fa-exclamation-triangle text-amber-400 text-[9px]" title="Sem facial" />
                    <button type="button" class="text-accent/60 hover:text-accent transition ml-0.5"
                      @click="removeSignerUser(uid)">
                      <i class="fas fa-times text-[9px]" />
                    </button>
                  </span>
                </div>

                <p v-if="selectedSignerIds.length" class="text-[11px] text-amber-600 dark:text-amber-400">
                  <i class="fas fa-info-circle mr-1" />
                  Todos os assinantes precisam ter reconhecimento facial cadastrado.
                </p>
              </div>

              <!-- Erro / Sucesso -->
              <div v-if="createError"
                class="rounded-xl bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
                <i class="fas fa-exclamation-circle mr-2" />{{ createError }}
              </div>
              <div v-if="createSuccess"
                class="rounded-xl bg-green-500/10 border border-green-200 dark:border-green-500/20 p-3 text-sm text-green-700 dark:text-green-400 flex gap-2">
                <i class="fas fa-check-circle mt-0.5 shrink-0" />{{ createSuccess }}
              </div>

              <!-- Submit -->
              <Button
                variant="primary"
                size="md"
                class="w-full justify-center"
                :icon="createLoading ? 'fas fa-circle-notch fa-spin' : 'fas fa-paper-plane'"
                :disabled="!createFile || !createForm.documentName || !selectedSignerIds.length || createLoading"
                @click="submitCreateDocument">
                {{ createLoading ? 'Enviando...' : `Criar e enviar para ${selectedSignerIds.length || 0} assinante(s)` }}
              </Button>
            </Surface>
          </div>

          <!-- Documentos criados por mim -->
          <div class="lg:col-span-3">
            <Surface variant="raised" padding="md">
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-semibold text-ink text-sm">Documentos criados por mim</h2>
                <Button variant="ghost" size="sm" icon="fas fa-rotate-right"
                  @click="sigDocStore.fetchMyDocuments()">
                  Atualizar
                </Button>
              </div>

              <!-- Loading -->
              <div v-if="sigDocStore.loading && !sigDocStore.myDocuments.length"
                class="py-10 flex flex-col items-center gap-3 text-ink-muted">
                <Spinner size="md" />
                <p class="text-sm">Carregando...</p>
              </div>

              <!-- Empty -->
              <EmptyState v-else-if="!sigDocStore.myDocuments.length"
                size="sm" icon="fas fa-folder-open"
                title="Nenhum documento criado ainda"
                description="Crie um documento ao lado para começar." />

              <!-- List -->
              <div v-else class="space-y-2">
                <div v-for="doc in sigDocStore.myDocuments" :key="doc.id"
                  class="rounded-xl border border-line bg-surface-sunken px-3 py-3 hover:bg-surface-hover transition">
                  <div class="flex items-start gap-3">
                    <i class="fas fa-file-pdf text-ink-subtle text-sm shrink-0 mt-0.5" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-ink truncate">{{ doc.document_name }}</p>
                      <p class="text-xs text-ink-subtle mt-0.5">{{ fmtDate(doc.createdAt) }}</p>

                      <!-- Progress -->
                      <div class="mt-2 space-y-1">
                        <div class="flex items-center justify-between">
                          <span class="text-[11px] text-ink-subtle">
                            {{ doc.signed_signers_count ?? 0 }}/{{ doc.required_signers_count ?? doc.signers?.length ?? 0 }} assinatura(s)
                          </span>
                          <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                            :class="docStatusClass(doc.status)">
                            {{ docStatusLabel(doc.status) }}
                          </span>
                        </div>
                        <div class="h-1.5 w-full rounded-full bg-surface-sunken border border-line overflow-hidden">
                          <div class="h-full rounded-full transition-all"
                            :class="doc.status === 'SIGNED' ? 'bg-green-500' : ['CANCELLED','REJECTED'].includes(doc.status) ? 'bg-red-400' : 'bg-accent'"
                            :style="{ width: `${progressPct(doc)}%` }" />
                        </div>
                      </div>

                      <div class="flex w-full justify-between mt-2">
                        <!-- Avatares -->
                        <div v-if="doc.signers?.length" class="flex items-center gap-1 flex-wrap">
                          <div v-for="signer in doc.signers" :key="signer.id" class="relative"
                            :title="`${signer.signer?.username ?? 'Assinante'} — ${signerStatusLabel(signer.status)}`">
                            <img
                              :src="`https://ui-avatars.com/api/?name=${encodeURIComponent(signer.signer?.username ?? '')}&background=random&size=28`"
                              class="h-7 w-7 rounded-full border-2" :class="signerAvatarBorder(signer.status)" />
                            <span
                              class="absolute -bottom-0.5 -right-0.5 text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-gray-900"
                              :class="signerDotClass(signer.status)">
                              <i :class="signerDotIcon(signer.status)" />
                            </span>
                          </div>
                        </div>

                        <!-- Ações dropdown -->
                        <div class="flex items-center gap-2 ml-auto">
                          <div v-if="doc.original_document_url || doc.final_document_url" class="relative group">
                            <button type="button"
                              class="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-hover transition">
                              Ações <i class="fas fa-chevron-down text-[9px]" />
                            </button>
                            <div class="absolute left-0 top-full w-full h-2 bg-transparent"></div>
                            <div class="absolute right-0 top-full z-20 min-w-[140px] rounded-xl border border-line bg-surface-overlay shadow-overlay opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0">
                              <div class="py-1">
                                <a v-if="doc.original_document_url" :href="doc.original_document_url" target="_blank" rel="noopener"
                                  class="flex items-center gap-3 px-4 py-2.5 text-xs text-accent hover:bg-surface-hover transition">
                                  <i class="fas fa-eye text-[11px]" /> Ver original
                                </a>
                                <a v-if="doc.final_document_url" :href="doc.final_document_url" target="_blank" rel="noopener"
                                  class="flex items-center gap-3 px-4 py-2.5 text-xs text-green-600 hover:bg-surface-hover transition">
                                  <i class="fas fa-file-signature text-[11px]" /> Ver assinado
                                </a>
                                <div class="border-t border-line my-1"></div>
                                <button v-if="doc.original_document_url" type="button"
                                  class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-ink-muted hover:bg-surface-hover transition"
                                  @click="downloadDoc(doc.original_document_url, `${doc.document_name}-original`)">
                                  <i class="fas fa-download text-[11px]" /> Baixar original
                                </button>
                                <button v-if="doc.final_document_url" type="button"
                                  class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-green-600 hover:bg-surface-hover transition"
                                  @click="downloadDoc(doc.final_document_url, `${doc.document_name}-assinado`)">
                                  <i class="fas fa-download text-[11px]" /> Baixar assinado
                                </button>
                              </div>
                            </div>
                          </div>

                          <button v-if="canDeleteDoc(doc)" type="button"
                            class="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition"
                            :disabled="deletingDocIds.has(doc.id)" @click="deleteDocument(doc)">
                            <i v-if="deletingDocIds.has(doc.id)" class="fas fa-circle-notch fa-spin text-[10px]" />
                            <i v-else class="fas fa-trash text-[10px]" />
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Surface>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════
             TAB: PARA ASSINAR
             ═══════════════════════════════════════════════════════════ -->
        <div v-show="activeTab === 'pending'" class="pt-2">
          <Surface variant="raised" padding="md">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="font-semibold text-ink text-sm">Documentos aguardando minha assinatura</h2>
                <p class="text-xs text-ink-subtle mt-0.5">Solicitações recebidas de outros usuários. Assine ou recuse cada uma.</p>
              </div>
              <Button variant="ghost" size="sm" icon="fas fa-rotate-right" @click="refreshPending">Atualizar</Button>
            </div>

            <!-- Loading -->
            <div v-if="sigDocStore.loading && !sigDocStore.mySigningItems.length"
              class="py-12 flex flex-col items-center gap-3 text-ink-muted">
              <Spinner size="md" />
              <p class="text-sm">Carregando...</p>
            </div>

            <!-- Empty -->
            <EmptyState v-else-if="!pendingSigningItems.length"
              size="md" icon="fas fa-check-circle"
              title="Tudo em dia!"
              description="Nenhum documento aguardando sua assinatura." />

            <!-- List -->
            <div v-else class="space-y-3">
              <div v-for="item in pendingSigningItems" :key="item.id"
                class="flex items-start gap-4 rounded-xl border border-line bg-surface-sunken p-4 hover:border-accent/40 transition">

                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                  <i class="fas fa-file-signature text-amber-500" />
                </div>

                <div class="flex-1 min-w-0">
                  <p class="font-medium text-ink text-sm">{{ item.document?.document_name ?? 'Documento' }}</p>
                  <p class="text-xs text-ink-subtle mt-0.5">
                    <span>Criado por: </span>
                    <span class="font-medium text-ink-muted">{{ item.document?.creator?.username ?? 'Desconhecido' }}</span>
                    <span class="mx-1.5">·</span>
                    <span>{{ fmtDate(item.created_at) }}</span>
                  </p>

                  <!-- Progress -->
                  <div v-if="item.document" class="mt-2 space-y-1">
                    <span class="text-[11px] text-ink-subtle">
                      {{ item.document.signed_signers_count ?? 0 }}/{{ item.document.required_signers_count ?? item.document.signers?.length ?? 0 }} assinatura(s) concluídas
                    </span>
                    <div class="h-1.5 w-full rounded-full bg-surface-sunken border border-line overflow-hidden">
                      <div class="h-full rounded-full bg-accent transition-all" :style="{ width: `${progressPct(item.document)}%` }" />
                    </div>
                  </div>

                  <a v-if="item.document?.original_document_url" :href="item.document.original_document_url"
                    target="_blank" rel="noopener"
                    class="inline-flex items-center gap-1 text-xs text-accent hover:text-accent-hover mt-1.5 transition">
                    <i class="fas fa-eye text-[10px]" />Ver documento
                  </a>

                  <p v-if="rejectErrors[item.id]" class="text-xs text-red-500 mt-1">
                    <i class="fas fa-exclamation-circle mr-1" />{{ rejectErrors[item.id] }}
                  </p>
                </div>

                <!-- Botões de ação -->
                <div class="flex flex-col gap-2 shrink-0">
                  <Button variant="outline" size="sm"
                    :icon="rejectingIds.has(item.id) ? 'fas fa-circle-notch fa-spin' : 'fas fa-times'"
                    :disabled="rejectingIds.has(item.id)"
                    class="border-red-200 dark:border-red-500/30 text-red-500 hover:bg-red-500/10"
                    @click="rejectSignerItem(item)">
                    {{ rejectingIds.has(item.id) ? 'Recusando...' : 'Recusar' }}
                  </Button>
                  <Button variant="primary" size="sm" icon="fas fa-pen-nib" @click="openSignModal(item)">
                    Assinar
                  </Button>
                </div>
              </div>
            </div>
          </Surface>
        </div>

        <!-- ═══════════════════════════════════════════════════════════
             TAB: HISTÓRICO
             ═══════════════════════════════════════════════════════════ -->
        <div v-show="activeTab === 'history'" class="pt-2">
          <Surface variant="raised" padding="md">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="font-semibold text-ink text-sm">Meu histórico de assinaturas</h2>
                <p class="text-xs text-ink-subtle mt-0.5">Documentos que já assinei ou que foram cancelados/recusados.</p>
              </div>
              <Button variant="ghost" size="sm" icon="fas fa-rotate-right"
                @click="sigDocStore.fetchMySigningItems()">Atualizar</Button>
            </div>

            <!-- Loading -->
            <div v-if="sigDocStore.loading && !sigDocStore.mySigningItems.length"
              class="py-8 flex flex-col items-center gap-3 text-ink-muted">
              <Spinner size="md" />
              <p class="text-sm">Carregando...</p>
            </div>

            <!-- Empty -->
            <EmptyState v-else-if="!historySigningItems.length"
              size="sm" icon="fas fa-history"
              title="Nenhuma assinatura no histórico"
              description="Documentos assinados, cancelados ou recusados aparecerão aqui." />

            <!-- List -->
            <div v-else class="space-y-2">
              <div v-for="item in historySigningItems" :key="item.id"
                class="rounded-xl border border-line bg-surface-sunken px-3 py-3 hover:bg-surface-hover transition">
                <div class="flex items-start gap-3">
                  <i class="fas fa-file-pdf text-ink-subtle text-sm shrink-0 mt-0.5" />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-ink truncate">
                          {{ item.document?.document_name ?? 'Documento' }}
                        </p>
                        <p class="text-xs text-ink-subtle mt-0.5">
                          <span>Criado por: {{ item.document?.creator?.username ?? '–' }}</span>
                          <span class="mx-1.5">·</span>
                          <span>{{ fmtDate(item.signed_at || item.created_at) }}</span>
                        </p>
                      </div>
                      <span v-if="item.document?.final_document_url"
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-500/15 text-green-600 dark:text-green-400 shrink-0">
                        PDF assinado disponível
                      </span>
                    </div>

                    <!-- Status badges -->
                    <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                        :class="signerStatusClass(item.status)">
                        {{ signerStatusLabel(item.status) }}
                      </span>
                      <span v-if="item.document"
                        class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                        :class="docStatusClass(item.document.status)">
                        Doc: {{ docStatusLabel(item.document.status) }}
                      </span>
                    </div>

                    <div class="flex w-full justify-between mt-1.5">
                      <!-- Código verificação -->
                      <div class="text-[11px] my-auto font-mono text-ink-subtle bg-surface-sunken border border-line rounded px-2 py-1 inline-block">
                        <template v-if="item.verification_code && item.status === 'SIGNED'">
                          Cód. individual: {{ item.verification_code }}
                        </template>
                        <template v-else>Sem validade</template>
                      </div>

                      <!-- Ações dropdown -->
                      <div v-if="item.document?.original_document_url || item.document?.final_document_url"
                        class="relative group">
                        <button type="button"
                          class="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-hover transition">
                          Ações <i class="fas fa-chevron-down text-[9px]" />
                        </button>
                        <div class="absolute left-0 top-full w-full h-2 bg-transparent"></div>
                        <div class="absolute right-0 top-full z-20 min-w-[140px] rounded-xl border border-line bg-surface-overlay shadow-overlay opacity-0 invisible translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0">
                          <div class="py-1">
                            <a v-if="item.document?.original_document_url" :href="item.document.original_document_url"
                              target="_blank" rel="noopener"
                              class="flex items-center gap-3 px-4 py-2.5 text-xs text-accent hover:bg-surface-hover transition">
                              <i class="fas fa-eye text-[11px]" /> Ver original
                            </a>
                            <a v-if="item.document?.final_document_url" :href="item.document.final_document_url"
                              target="_blank" rel="noopener"
                              class="flex items-center gap-3 px-4 py-2.5 text-xs text-green-600 hover:bg-surface-hover transition">
                              <i class="fas fa-file-signature text-[11px]" /> Ver assinado
                            </a>
                            <div class="border-t border-line my-1"></div>
                            <button v-if="item.document?.original_document_url" type="button"
                              class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-ink-muted hover:bg-surface-hover transition"
                              @click="downloadDoc(item.document.original_document_url, `${item.document.document_name}-original`)">
                              <i class="fas fa-download text-[11px]" /> Baixar original
                            </button>
                            <button v-if="item.document?.final_document_url" type="button"
                              class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-xs text-green-600 hover:bg-surface-hover transition"
                              @click="downloadDoc(item.document.final_document_url, `${item.document.document_name}-assinado`)">
                              <i class="fas fa-download text-[11px]" /> Baixar assinado
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Surface>
        </div>

      </div>
    </div>

    <!-- Modal de assinatura -->
    <SignatureModal v-model="showSignModal" :signer-item="activeSignerItem" @signed="onSigned" @cancel="onSignCancel" />

  </div>
</template>
