<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useBucketUploadStore } from '@/stores/Tools/BucketUpload/bucketUploadStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Switch from '@/components/UI/Switch.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Favorite from '@/components/config/Favorite.vue';

const store = useBucketUploadStore();
const fileInput = ref(null);
const dragging = ref(false);
const selectedFileName = ref('');
const successResult = ref(null);

onMounted(() => store.fetchHistory());

// ── Paginação preview ────────────────────────────────
const PAGE_SIZE = 20;
const pageMap = ref({});
watch(() => store.preview, () => { pageMap.value = {}; });

function getPage(file) { return pageMap.value[file.name] ?? 1; }
function setPage(file, p) {
  const max = totalPages(file);
  pageMap.value[file.name] = Math.max(1, Math.min(p, max));
}
function totalPages(file) { return Math.max(1, Math.ceil(file.totalRows / PAGE_SIZE)); }
function getPageRows(file) {
  const dataRows = file.previewRows.slice(1);
  const page = getPage(file);
  const start = (page - 1) * PAGE_SIZE;
  return dataRows.slice(start, start + PAGE_SIZE);
}
function pageRangeLabel(file) {
  const page = getPage(file);
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, file.totalRows);
  return `${start}–${end}`;
}
function visiblePages(file) {
  const current = getPage(file);
  const total = totalPages(file);
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  if (current <= 4) pages.push(1, 2, 3, 4, 5, '...', total);
  else if (current >= total - 3) pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
  else pages.push(1, '...', current - 1, current, current + 1, '...', total);
  return pages;
}

// ── Upload ───────────────────────────────────────────
function onDrop(e) {
  dragging.value = false;
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}
function onFileSelected(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
  e.target.value = '';
}
async function processFile(file) {
  if (!file.name.endsWith('.xlsx')) {
    store.error = 'Apenas arquivos .xlsx são aceitos.';
    return;
  }
  selectedFileName.value = file.name;
  successResult.value = null;
  store.error = null;
  await store.processFile(file);
}
async function handleConfirm() {
  successResult.value = null;
  try {
    const result = await store.confirmSend();
    successResult.value = result;
    selectedFileName.value = '';
  } catch { /* error em store.error */ }
}
function resetFile() {
  store.cancelPreview();
  selectedFileName.value = '';
  successResult.value = null;
  if (fileInput.value) fileInput.value.value = '';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const folderName = computed(() => store.testMode ? 'test-robot' : 'encaminhados');
const folderPath = computed(() => `bucket-menin/${folderName.value}/`);
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="xl">

      <PageHeader
        title="Envio ao Bucket GCS"
        subtitle="Converta e envie as abas Engenharia e Area Construída Total para o Google Cloud Storage."
        icon="fas fa-cloud-arrow-up">
        <template #title>
          <span>Envio ao Bucket GCS</span>
          <Favorite :router="'/tools/bucket-upload'" :section="'Envio ao Bucket'" />
        </template>
      </PageHeader>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- Coluna principal -->
        <div class="lg:col-span-2 space-y-4">

          <!-- Modo de envio -->
          <Surface variant="raised" padding="md">
            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div class="min-w-0">
                <h2 class="text-sm font-semibold text-ink">Pasta de destino</h2>
                <p class="text-xs text-ink-muted mt-0.5">
                  Use <strong class="text-ink">test-robot</strong> antes de enviar para produção.
                </p>
              </div>
              <div class="flex items-center gap-3 shrink-0">
                <span class="text-xs font-medium font-mono"
                  :class="!store.testMode ? 'text-accent' : 'text-ink-subtle'">
                  encaminhados
                </span>
                <Switch v-model="store.testMode" :disabled="!!store.preview" size="sm" />
                <span class="text-xs font-medium font-mono"
                  :class="store.testMode ? 'text-amber-500' : 'text-ink-subtle'">
                  test-robot
                </span>
              </div>
            </div>

            <div class="mt-3">
              <Badge :variant="store.testMode ? 'warning' : 'accent'" dot>
                <i :class="store.testMode ? 'fas fa-flask' : 'fas fa-paper-plane'" class="text-[10px]"></i>
                <span class="font-mono">{{ folderPath }}</span>
              </Badge>
            </div>
          </Surface>

          <!-- Upload -->
          <Surface variant="raised" padding="none" class="overflow-hidden">
            <div class="px-5 py-3.5 border-b border-line">
              <h2 class="text-sm font-semibold text-ink">1. Selecionar planilha</h2>
              <p class="text-xs text-ink-muted mt-0.5">Arquivo .xlsx com as abas necessárias</p>
            </div>

            <div class="p-5">
              <!-- Drop zone -->
              <div v-if="!store.preview && !store.loading"
                class="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors"
                :class="dragging
                  ? 'border-accent bg-accent-soft/40'
                  : 'border-line hover:border-accent/50 hover:bg-surface-sunken/40'"
                @dragover.prevent="dragging = true"
                @dragleave="dragging = false"
                @drop.prevent="onDrop"
                @click="fileInput.click()">
                <div class="h-12 w-12 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 grid place-items-center mb-3 border border-emerald-500/20">
                  <i class="fas fa-file-excel text-lg"></i>
                </div>
                <p class="font-medium text-ink">Arraste o arquivo aqui ou clique para selecionar</p>
                <p class="text-xs text-ink-subtle mt-1 font-mono">Apenas .xlsx · máx. 20 MB</p>
                <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="onFileSelected" />
              </div>

              <!-- Loading -->
              <div v-if="store.loading" class="flex flex-col items-center justify-center py-12 gap-3">
                <i class="fas fa-spinner fa-spin text-2xl text-accent"></i>
                <p class="text-sm text-ink-muted">Processando planilha...</p>
              </div>

              <!-- Pronto -->
              <div v-if="store.preview && !store.loading" class="space-y-4">
                <div class="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <i class="fas fa-circle-check text-emerald-500 text-lg"></i>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-emerald-700 dark:text-emerald-300 truncate">{{ selectedFileName }}</p>
                    <p class="text-xs text-emerald-600 dark:text-emerald-400">
                      {{ store.preview.files.length }} arquivo(s) gerado(s) — pronto para envio
                    </p>
                  </div>
                  <IconButton icon="fas fa-xmark" size="sm" label="Cancelar" @click="resetFile" />
                </div>

                <div class="space-y-2">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">
                    Arquivos que serão enviados
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <div v-for="file in store.preview.files" :key="file.name"
                      class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-sunken border border-line text-sm">
                      <i class="fas fa-file-csv text-accent text-xs"></i>
                      <span class="font-mono text-ink text-xs">{{ file.name }}</span>
                      <span class="text-ink-subtle text-[11px] font-mono">({{ file.totalRows }} linhas)</span>
                    </div>
                  </div>
                  <p class="text-xs text-ink-subtle">
                    Destino: <span class="font-mono text-ink-muted">{{ folderPath }}</span>
                  </p>
                </div>

                <div class="flex flex-wrap gap-2 pt-2">
                  <Button :variant="store.testMode ? 'subtle' : 'primary'"
                    :loading="store.uploading"
                    :icon="store.testMode ? 'fas fa-flask' : 'fas fa-cloud-arrow-up'"
                    @click="handleConfirm">
                    {{ store.uploading ? 'Enviando...' : (store.testMode ? 'Enviar para test-robot' : 'Enviar ao Bucket') }}
                  </Button>
                  <Button variant="ghost" :disabled="store.uploading" @click="resetFile">Cancelar</Button>
                </div>
              </div>

              <div v-if="store.error"
                class="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                <i class="fas fa-circle-exclamation mt-0.5"></i>
                <p>{{ store.error }}</p>
              </div>

              <div v-if="successResult"
                class="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 flex items-start gap-2">
                <i class="fas fa-circle-check text-emerald-500 mt-0.5"></i>
                <div>
                  <p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">{{ successResult.message }}</p>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span v-for="f in successResult.files" :key="f.path"
                      class="text-xs font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {{ f.path }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Surface>

          <!-- Preview CSVs -->
          <Surface v-if="store.preview" variant="raised" padding="none" class="overflow-hidden">
            <div class="px-5 py-3.5 border-b border-line">
              <h2 class="text-sm font-semibold text-ink">2. Pré-visualização dos CSVs</h2>
              <p class="text-xs text-ink-muted mt-0.5">Todas as linhas de cada arquivo gerado</p>
            </div>

            <div class="p-5 space-y-6">
              <div v-for="file in store.preview.files" :key="file.name">
                <div class="flex items-center gap-2 mb-2">
                  <i class="fas fa-file-csv text-accent text-xs"></i>
                  <h3 class="text-sm font-semibold text-ink font-mono">{{ file.name }}</h3>
                  <Badge size="sm">{{ file.totalRows }} linhas</Badge>
                </div>

                <div class="overflow-x-auto rounded-lg border border-line">
                  <table class="min-w-full text-xs">
                    <thead>
                      <tr class="bg-surface-sunken/40 border-b border-line">
                        <th v-for="(col, ci) in (file.previewRows[0] || [])" :key="ci"
                          class="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-ink-subtle whitespace-nowrap border-r border-line last:border-r-0">
                          {{ col || '—' }}
                        </th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-line">
                      <tr v-for="(row, ri) in getPageRows(file)" :key="ri"
                        class="hover:bg-surface-sunken/40 transition-colors">
                        <td v-for="(cell, ci) in row" :key="ci"
                          class="px-3 py-1.5 text-ink whitespace-nowrap border-r border-line last:border-r-0">
                          {{ cell || '' }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="flex items-center justify-between mt-3 flex-wrap gap-2">
                  <p class="text-xs text-ink-subtle font-mono">
                    {{ pageRangeLabel(file) }} de {{ file.totalRows }}
                  </p>
                  <div class="flex items-center gap-1">
                    <button @click="setPage(file, 1)" :disabled="getPage(file) === 1"
                      class="h-7 w-7 grid place-items-center rounded-md text-xs border border-line bg-surface-raised disabled:opacity-30 hover:bg-surface-sunken text-ink-muted transition-colors">
                      <i class="fas fa-angles-left text-[10px]"></i>
                    </button>
                    <button @click="setPage(file, getPage(file) - 1)" :disabled="getPage(file) === 1"
                      class="h-7 w-7 grid place-items-center rounded-md text-xs border border-line bg-surface-raised disabled:opacity-30 hover:bg-surface-sunken text-ink-muted transition-colors">
                      <i class="fas fa-angle-left text-[10px]"></i>
                    </button>
                    <template v-for="p in visiblePages(file)" :key="p">
                      <span v-if="p === '...'" class="px-1 text-xs text-ink-subtle">…</span>
                      <button v-else @click="setPage(file, p)"
                        class="min-w-[28px] h-7 px-2 rounded-md text-xs border transition-colors"
                        :class="getPage(file) === p
                          ? 'bg-accent border-accent text-white font-semibold'
                          : 'border-line bg-surface-raised hover:bg-surface-sunken text-ink-muted'">
                        {{ p }}
                      </button>
                    </template>
                    <button @click="setPage(file, getPage(file) + 1)" :disabled="getPage(file) === totalPages(file)"
                      class="h-7 w-7 grid place-items-center rounded-md text-xs border border-line bg-surface-raised disabled:opacity-30 hover:bg-surface-sunken text-ink-muted transition-colors">
                      <i class="fas fa-angle-right text-[10px]"></i>
                    </button>
                    <button @click="setPage(file, totalPages(file))" :disabled="getPage(file) === totalPages(file)"
                      class="h-7 w-7 grid place-items-center rounded-md text-xs border border-line bg-surface-raised disabled:opacity-30 hover:bg-surface-sunken text-ink-muted transition-colors">
                      <i class="fas fa-angles-right text-[10px]"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Surface>
        </div>

        <!-- Sidebar -->
        <aside class="space-y-4">
          <Surface variant="raised" padding="md">
            <h3 class="text-sm font-semibold text-ink mb-3">Destino</h3>
            <div class="space-y-2 text-sm">
              <div class="flex items-start gap-2">
                <i class="fas fa-database text-accent text-xs mt-1"></i>
                <div class="min-w-0">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Bucket</p>
                  <p class="font-mono text-ink truncate">bucket-menin</p>
                </div>
              </div>
              <div class="flex items-start gap-2">
                <i class="text-xs mt-1"
                  :class="store.testMode ? 'fas fa-flask text-amber-500' : 'fas fa-folder text-yellow-500'"></i>
                <div class="min-w-0">
                  <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Pasta ativa</p>
                  <p class="font-mono text-ink truncate">{{ folderName }}/</p>
                </div>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-line">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-2">Arquivos gerados</p>
              <ul class="space-y-1.5 text-xs">
                <li class="flex items-center gap-2">
                  <i class="fas fa-file-csv text-accent text-[10px]"></i>
                  <span class="font-mono text-ink-muted">Engenharia.csv</span>
                </li>
                <li class="flex items-center gap-2">
                  <i class="fas fa-file-csv text-accent text-[10px]"></i>
                  <span class="font-mono text-ink-muted">Area_construida_total.csv</span>
                </li>
              </ul>
            </div>

            <div class="mt-4 pt-4 border-t border-line space-y-1.5">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-2">Pastas do bucket</p>
              <div class="flex items-center gap-2 text-xs">
                <i class="fas fa-flask text-amber-500 w-4 text-center text-[10px]"></i>
                <span class="font-mono text-ink">test-robot/</span>
                <span class="text-ink-subtle">testes</span>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <i class="fas fa-paper-plane text-accent w-4 text-center text-[10px]"></i>
                <span class="font-mono text-ink">encaminhados/</span>
                <span class="text-ink-subtle">produção</span>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <i class="fas fa-archive text-ink-subtle w-4 text-center text-[10px]"></i>
                <span class="font-mono text-ink">processados/</span>
                <span class="text-ink-subtle">pós-processamento</span>
              </div>
            </div>
          </Surface>

          <Surface variant="raised" padding="md">
            <h3 class="text-sm font-semibold text-ink mb-3">Como usar</h3>
            <ol class="space-y-2 text-sm text-ink-muted">
              <li v-for="(step, i) in [
                { txt: 'Selecione o arquivo Valores Projetados - 2025.xlsx' },
                { txt: 'Teste primeiro em test-robot antes de enviar para produção' },
                { txt: 'Revise a pré-visualização dos dados' },
                { txt: 'Clique em Enviar ao Bucket para confirmar' },
              ]" :key="i" class="flex items-start gap-2">
                <span class="h-5 w-5 grid place-items-center rounded-full bg-accent-soft text-accent text-xs font-bold shrink-0 mt-0.5">{{ i + 1 }}</span>
                <span class="text-xs leading-relaxed" v-html="step.txt"></span>
              </li>
            </ol>
          </Surface>
        </aside>
      </div>

      <!-- Histórico -->
      <Surface variant="raised" padding="none" class="overflow-hidden mt-6">
        <div class="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-line">
          <div>
            <h2 class="text-sm font-semibold text-ink">Histórico de envios</h2>
            <p class="text-xs text-ink-muted mt-0.5">Últimos 50 envios ao bucket</p>
          </div>
          <Button size="sm" variant="ghost" icon="fas fa-rotate" @click="store.fetchHistory()">
            Atualizar
          </Button>
        </div>

        <div v-if="store.history.length === 0" class="py-8">
          <EmptyState size="md" icon="far fa-clock"
            title="Nenhum envio registrado"
            description="O histórico aparecerá aqui após o primeiro envio." />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-surface-sunken/40 border-b border-line">
              <tr>
                <th v-for="h in ['Data/Hora', 'Usuário', 'Arquivo origem', 'Pasta', 'Arquivos enviados', 'Status', 'Detalhe']"
                  :key="h"
                  class="px-4 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle whitespace-nowrap">
                  {{ h }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="item in store.history" :key="item.id"
                class="hover:bg-surface-sunken/40 transition-colors">
                <td class="px-4 py-3 text-ink-muted whitespace-nowrap font-mono text-xs">{{ formatDate(item.createdAt) }}</td>
                <td class="px-4 py-3">
                  <p class="font-medium text-ink text-sm">{{ item.userName || '—' }}</p>
                  <p class="text-xs text-ink-subtle font-mono">{{ item.userEmail || '' }}</p>
                </td>
                <td class="px-4 py-3 text-ink-muted font-mono text-xs">{{ item.sourceFile || '—' }}</td>
                <td class="px-4 py-3">
                  <Badge :variant="item.folder === 'test-robot' ? 'warning' : 'accent'" size="sm">
                    <i :class="item.folder === 'test-robot' ? 'fas fa-flask' : 'fas fa-paper-plane'" class="text-[9px]"></i>
                    {{ item.folder || 'encaminhados' }}
                  </Badge>
                </td>
                <td class="px-4 py-3">
                  <div v-if="item.filesUploaded?.length" class="flex flex-wrap gap-1">
                    <Badge v-for="f in item.filesUploaded" :key="f" variant="accent" size="sm">{{ f }}</Badge>
                  </div>
                  <span v-else class="text-ink-subtle">—</span>
                </td>
                <td class="px-4 py-3">
                  <Badge :variant="item.status === 'success' ? 'success' : 'danger'" size="sm">
                    <i :class="item.status === 'success' ? 'fas fa-check' : 'fas fa-xmark'" class="text-[9px]"></i>
                    {{ item.status === 'success' ? 'Sucesso' : 'Erro' }}
                  </Badge>
                </td>
                <td class="px-4 py-3 text-xs text-ink-muted max-w-xs truncate font-mono">
                  {{ item.status === 'error' ? item.errorMessage : (item.gcsPaths?.join(', ') || '—') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Surface>
    </PageContainer>
  </div>
</template>
