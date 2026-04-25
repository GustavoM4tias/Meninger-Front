<template>
  <div class="min-h-full bg-gray-50 dark:bg-gray-950">
    <div class="max-w-2xl mx-auto px-4 py-8 space-y-6">

      <!-- Cabeçalho -->
      <div class="flex items-center gap-3">
        <button @click="$router.back()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <i class="fas fa-arrow-left text-sm"></i>
        </button>
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Tabela MCMV — Configurações</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Importe a planilha oficial de municípios (atualizada anualmente pela CEF/MDIC)</p>
        </div>
      </div>

      <!-- Info atual -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
        <div class="flex items-center gap-2">
          <i class="fas fa-database text-blue-500"></i>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Tabela atual</h2>
        </div>

        <div class="grid grid-cols-2 gap-4 text-center">
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
            <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Municípios</p>
            <p class="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              {{ store.info.total != null ? store.info.total.toLocaleString('pt-BR') : '—' }}
            </p>
          </div>
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
            <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Vigência</p>
            <p class="text-base font-bold text-gray-900 dark:text-white mt-0.5">{{ fmtVigencia(store.info.co_periodo) }}</p>
          </div>
        </div>

        <!-- Última importação -->
        <div v-if="store.info.last_import" class="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
          <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
            <i class="fas fa-user text-blue-500 text-xs"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-500 dark:text-gray-400">Última importação</p>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ store.info.last_import.username }}
              <span class="text-xs font-normal text-gray-400 ml-1">
                · {{ store.info.last_import.imported_count?.toLocaleString('pt-BR') }} municípios
              </span>
            </p>
          </div> 
        </div>
        <div v-else class="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs text-gray-400">
          <i class="fas fa-info-circle"></i> Nenhuma importação registrada ainda.
        </div>
      </div>

      <!-- Upload -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
        <div class="flex items-center gap-2">
          <i class="fas fa-file-excel text-green-500"></i>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Importar nova planilha</h2>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Faça upload da planilha oficial <strong>TABELA_MUNICIPIOS_VIGENCIA_*.xlsx</strong> da CEF.
          Todos os municípios são atualizados via upsert — sem perda de dados.
        </p>

        <!-- Drop area -->
        <label
          class="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl py-8 cursor-pointer transition"
          :class="dragover
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'"
          @dragover.prevent="dragover = true"
          @dragleave="dragover = false"
          @drop.prevent="onDrop"
        >
          <i class="fas fa-cloud-upload-alt text-2xl text-gray-400"></i>
          <span class="text-sm text-gray-600 dark:text-gray-400">
            Arraste ou <span class="text-blue-500 font-medium">clique para selecionar</span>
          </span>
          <span class="text-xs text-gray-400">.xlsx — máx 5 MB</span>
          <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="onFileChange" />
        </label>

        <!-- Arquivo selecionado -->
        <div v-if="selectedFile" class="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
          <i class="fas fa-file-excel text-green-500"></i>
          <span class="text-sm text-gray-700 dark:text-gray-300 flex-1 truncate">{{ selectedFile.name }}</span>
          <button @click="clearFile" class="text-gray-400 hover:text-red-500 transition">
            <i class="fas fa-times text-sm"></i>
          </button>
        </div>

        <!-- Erro / Sucesso do import -->
        <div v-if="importError" class="flex items-center gap-2 text-sm font-medium text-red-500">
          <i class="fas fa-exclamation-circle"></i> {{ importError }}
        </div>
        <div v-if="importSuccess" class="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
          <i class="fas fa-check-circle"></i> {{ importSuccess }}
        </div>

        <button
          @click="doImport"
          :disabled="!selectedFile || importing"
          class="w-full py-2.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
          :class="!selectedFile || importing
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'"
        >
          <i v-if="importing" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-upload"></i>
          {{ importing ? 'Importando...' : 'Importar planilha' }}
        </button>
      </div>

      <!-- Valores fixos -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-3">
        <div class="flex items-center gap-2">
          <i class="fas fa-lock text-gray-400"></i>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Valores fixos (nacionais)</h2>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">Definidos em portaria federal, não variam por município.</p>
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
            <p class="text-xs font-semibold text-blue-600 dark:text-blue-400">Faixa 3 — R$4.700 a R$8.000</p>
            <p class="text-lg font-bold text-blue-800 dark:text-blue-200 mt-1">R$ 350.000</p>
          </div>
          <div class="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
            <p class="text-xs font-semibold text-purple-600 dark:text-purple-400">Faixa 4 — até R$12.000</p>
            <p class="text-lg font-bold text-purple-800 dark:text-purple-200 mt-1">R$ 500.000</p>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMcmvStore } from '@/stores/Comercial/Mcmv/mcmvStore';

const store = useMcmvStore();

const selectedFile  = ref(null);
const importing     = ref(false);
const importError   = ref('');
const importSuccess = ref('');
const dragover      = ref(false);
const fileInput     = ref(null);

onMounted(() => store.fetchInfo());

function onFileChange(e) {
    selectedFile.value = e.target.files[0] ?? null;
    importError.value  = '';
    importSuccess.value = '';
}

function onDrop(e) {
    dragover.value = false;
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.xlsx')) {
        selectedFile.value = file;
        importError.value  = '';
        importSuccess.value = '';
    }
}

function clearFile() {
    selectedFile.value = null;
    if (fileInput.value) fileInput.value.value = '';
    importError.value  = '';
    importSuccess.value = '';
}

async function doImport() {
    if (!selectedFile.value) return;
    importing.value     = true;
    importError.value   = '';
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

function fmtDate(v) {
    if (!v) return '—';
    return new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
</script>
