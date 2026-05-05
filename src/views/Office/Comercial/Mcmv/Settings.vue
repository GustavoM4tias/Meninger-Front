<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMcmvStore } from '@/stores/Comercial/Mcmv/mcmvStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';

const store = useMcmvStore();
const router = useRouter();

const selectedFile = ref(null);
const importing = ref(false);
const importError = ref('');
const importSuccess = ref('');
const dragover = ref(false);
const fileInput = ref(null);

onMounted(() => store.fetchInfo());

function onFileChange(e) {
  selectedFile.value = e.target.files[0] ?? null;
  importError.value = '';
  importSuccess.value = '';
}

function onDrop(e) {
  dragover.value = false;
  const file = e.dataTransfer.files[0];
  if (file?.name.endsWith('.xlsx')) {
    selectedFile.value = file;
    importError.value = '';
    importSuccess.value = '';
  }
}

function clearFile() {
  selectedFile.value = null;
  if (fileInput.value) fileInput.value.value = '';
  importError.value = '';
  importSuccess.value = '';
}

async function doImport() {
  if (!selectedFile.value) return;
  importing.value = true;
  importError.value = '';
  importSuccess.value = '';
  try {
    const data = await store.importXlsx(selectedFile.value);
    importSuccess.value = `${data.imported?.toLocaleString('pt-BR')} municípios importados com sucesso.`;
    clearFile();
  } catch (e) {
    importError.value = e.message || 'Erro ao importar planilha.';
  } finally {
    importing.value = false;
  }
}

function fmtVigencia(v) {
  if (!v || v.length < 8) return '—';
  return `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}`;
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="md">

      <!-- Header com voltar -->
      <div class="flex items-center gap-3 mb-6">
        <IconButton icon="fas fa-arrow-left" size="md" label="Voltar"
          @click="router.back()" />
        <div class="min-w-0">
          <h1 class="text-xl font-semibold text-ink">Tabela MCMV — Configurações</h1>
          <p class="text-sm text-ink-muted mt-0.5">
            Importe a planilha oficial de municípios (atualizada anualmente pela CEF/MDIC)
          </p>
        </div>
      </div>

      <div class="space-y-4">

        <!-- Info atual -->
        <Surface variant="raised" padding="lg" class="space-y-4">
          <div class="flex items-center gap-2">
            <i class="fas fa-database text-accent"></i>
            <h2 class="text-xs font-bold text-ink uppercase tracking-wider font-mono">Tabela atual</h2>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-xl p-3 bg-surface-sunken border border-line text-center">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Municípios</p>
              <p class="text-2xl font-bold text-ink mt-1 tabular-nums">
                {{ store.info.total != null ? store.info.total.toLocaleString('pt-BR') : '—' }}
              </p>
            </div>
            <div class="rounded-xl p-3 bg-surface-sunken border border-line text-center">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Vigência</p>
              <p class="text-base font-bold text-ink mt-1 font-mono">{{ fmtVigencia(store.info.co_periodo) }}</p>
            </div>
          </div>

          <!-- Última importação -->
          <div v-if="store.info.last_import"
            class="flex items-center gap-3 bg-surface-sunken border border-line rounded-xl px-4 py-3">
            <div class="h-9 w-9 rounded-full bg-accent-soft text-accent flex items-center justify-center shrink-0">
              <i class="fas fa-user text-xs"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Última importação</p>
              <p class="text-sm font-semibold text-ink truncate">
                {{ store.info.last_import.username }}
                <span class="text-xs font-normal text-ink-subtle ml-1">
                  · <span class="font-mono">{{ store.info.last_import.imported_count?.toLocaleString('pt-BR') }}</span> municípios
                </span>
              </p>
            </div>
          </div>
          <div v-else
            class="flex items-center gap-2 px-4 py-3 bg-surface-sunken border border-line rounded-xl text-xs text-ink-subtle">
            <i class="fas fa-circle-info"></i>
            Nenhuma importação registrada ainda.
          </div>
        </Surface>

        <!-- Upload -->
        <Surface variant="raised" padding="lg" class="space-y-4">
          <div class="flex items-center gap-2">
            <i class="fas fa-file-excel text-emerald-500"></i>
            <h2 class="text-xs font-bold text-ink uppercase tracking-wider font-mono">Importar nova planilha</h2>
          </div>
          <p class="text-xs text-ink-muted leading-relaxed">
            Faça upload da planilha oficial
            <strong class="text-ink font-mono text-[11px]">TABELA_MUNICIPIOS_VIGENCIA_*.xlsx</strong>
            da CEF. Todos os municípios são atualizados via upsert — sem perda de dados.
          </p>

          <!-- Drop area -->
          <label
            class="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl py-8 cursor-pointer transition-colors"
            :class="dragover
              ? 'border-accent bg-accent-soft/40'
              : selectedFile ? 'border-emerald-500 bg-emerald-500/10' : 'border-line hover:border-accent hover:bg-surface-sunken'"
            @dragover.prevent="dragover = true"
            @dragleave="dragover = false"
            @drop.prevent="onDrop">
            <i class="fas fa-cloud-upload-alt text-3xl"
              :class="selectedFile ? 'text-emerald-500' : 'text-ink-subtle'"></i>
            <span v-if="!selectedFile" class="text-sm text-ink-muted">
              Arraste ou <span class="text-accent font-medium">clique para selecionar</span>
            </span>
            <span v-else class="text-sm font-medium text-ink truncate max-w-full px-4">
              {{ selectedFile.name }}
            </span>
            <span class="text-[11px] text-ink-subtle font-mono">.xlsx — máx 5 MB</span>
            <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="onFileChange" />
          </label>

          <!-- Arquivo selecionado -->
          <div v-if="selectedFile"
            class="flex items-center gap-3 bg-surface-sunken border border-line rounded-xl px-4 py-3">
            <i class="fas fa-file-excel text-emerald-500"></i>
            <span class="text-sm text-ink flex-1 truncate font-mono">{{ selectedFile.name }}</span>
            <button @click="clearFile"
              class="text-ink-subtle hover:text-red-500 transition-colors p-1">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>

          <!-- Erro / Sucesso -->
          <div v-if="importError"
            class="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <i class="fas fa-circle-exclamation"></i>{{ importError }}
          </div>
          <div v-if="importSuccess"
            class="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
            <i class="fas fa-circle-check"></i>{{ importSuccess }}
          </div>

          <Button variant="primary" size="md" class="w-full justify-center"
            :icon="importing ? 'fas fa-circle-notch fa-spin' : 'fas fa-upload'"
            :disabled="!selectedFile || importing"
            @click="doImport">
            {{ importing ? 'Importando...' : 'Importar planilha' }}
          </Button>
        </Surface>

        <!-- Valores fixos -->
        <Surface variant="raised" padding="lg" class="space-y-3">
          <div class="flex items-center gap-2">
            <i class="fas fa-lock text-ink-subtle"></i>
            <h2 class="text-xs font-bold text-ink uppercase tracking-wider font-mono">Valores fixos (nacionais)</h2>
          </div>
          <p class="text-xs text-ink-muted">Definidos em portaria federal, não variam por município.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="rounded-xl p-4 bg-blue-500/10 border border-blue-500/20 text-center">
              <p class="text-[11px] font-semibold text-blue-700 dark:text-blue-300">Faixa 3</p>
              <p class="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">R$4.700 a R$8.000</p>
              <p class="text-lg font-bold text-blue-700 dark:text-blue-200 mt-1.5 tabular-nums">R$ 400.000</p>
            </div>
            <div class="rounded-xl p-4 bg-purple-500/10 border border-purple-500/20 text-center">
              <p class="text-[11px] font-semibold text-purple-700 dark:text-purple-300">Faixa 4</p>
              <p class="text-[10px] text-purple-600/80 dark:text-purple-400/80 mt-0.5">até R$12.000</p>
              <p class="text-lg font-bold text-purple-700 dark:text-purple-200 mt-1.5 tabular-nums">R$ 600.000</p>
            </div>
          </div>
        </Surface>
      </div>
    </PageContainer>
  </div>
</template>
