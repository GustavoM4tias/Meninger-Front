<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMcmvStore } from '@/stores/Comercial/Mcmv/mcmvStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';

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

      <PageHeader
        title="Tabela MCMV"
        subtitle="A planilha oficial de municípios que define as faixas"
        icon="fas fa-table-list">
        <template #actions>
          <PageHelp
            storage-key="mcmv-settings"
            title="Como atualizar a tabela MCMV"
            intro="A faixa MCMV de cada município sai desta tabela. Ela é publicada pela CEF/MDIC e muda de tempos em tempos - enquanto não for trocada aqui, o sistema continua respondendo pela versão antiga."
            :steps="[
              { title: 'Baixe a planilha oficial', text: 'O arquivo tem nome no padrão TABELA_MUNICIPIOS_VIGENCIA_*.xlsx. Use o original, sem abrir e salvar por cima: o Excel às vezes reescreve colunas.' },
              { title: 'Envie aqui', text: 'Arraste ou escolha o arquivo. A importação substitui a tabela inteira, não mescla com a anterior.' },
              { title: 'Confira a vigência', text: 'Depois de importar, o bloco Tabela atual mostra quantos municípios entraram e de qual vigência. Se o número destoar, a planilha provavelmente veio errada.' },
            ]"
            :tips="[
              'Importar afeta toda consulta de MCMV do sistema na hora seguinte, inclusive as da Eme.',
              'Município fora da tabela fica sem faixa: a consulta responde que não encontrou, e não um palpite.',
            ]" />
          <Button variant="ghost" size="sm" icon="fas fa-arrow-left" @click="router.back()">
            <span class="hidden sm:inline">Voltar</span>
          </Button>
        </template>
      </PageHeader>

      <div class="space-y-4">

        <!-- Info atual -->
        <Surface variant="raised" padding="lg" class="space-y-4">
          <div class="flex items-center gap-2">
            <i class="fas fa-database text-accent"></i>
            <h2 class="text-xs font-bold text-ink uppercase tracking-wider font-mono">Tabela atual</h2>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-xl p-3 bg-surface-sunken border border-line text-center">
              <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono">Municípios</p>
              <p class="text-2xl font-bold text-ink mt-1 tabular-nums">
                {{ store.info.total != null ? store.info.total.toLocaleString('pt-BR') : '—' }}
              </p>
            </div>
            <div class="rounded-xl p-3 bg-surface-sunken border border-line text-center">
              <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono">Vigência</p>
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
              <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono">Última importação</p>
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
            <i class="fas fa-file-excel text-data-pos"></i>
            <h2 class="text-xs font-bold text-ink uppercase tracking-wider font-mono">Importar nova planilha</h2>
          </div>
          <p class="text-xs text-ink-muted leading-relaxed">
            Faça upload da planilha oficial
            <strong class="text-ink font-mono text-micro">TABELA_MUNICIPIOS_VIGENCIA_*.xlsx</strong>
            da CEF. Todos os municípios são atualizados via upsert — sem perda de dados.
          </p>

          <!-- Drop area -->
          <label
            class="flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl py-8 cursor-pointer transition-colors"
            :class="dragover
              ? 'border-accent bg-accent-soft/40'
              : selectedFile ? 'border-data-pos bg-data-pos/10' : 'border-line hover:border-accent hover:bg-surface-sunken'"
            @dragover.prevent="dragover = true"
            @dragleave="dragover = false"
            @drop.prevent="onDrop">
            <i class="fas fa-cloud-upload-alt text-3xl"
              :class="selectedFile ? 'text-data-pos' : 'text-ink-subtle'"></i>
            <span v-if="!selectedFile" class="text-sm text-ink-muted">
              Arraste ou <span class="text-accent font-medium">clique para selecionar</span>
            </span>
            <span v-else class="text-sm font-medium text-ink truncate max-w-full px-4">
              {{ selectedFile.name }}
            </span>
            <span class="text-micro text-ink-subtle font-mono">.xlsx — máx 5 MB</span>
            <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="onFileChange" />
          </label>

          <!-- Arquivo selecionado -->
          <div v-if="selectedFile"
            class="flex items-center gap-3 bg-surface-sunken border border-line rounded-xl px-4 py-3">
            <i class="fas fa-file-excel text-data-pos"></i>
            <span class="text-sm text-ink flex-1 truncate font-mono">{{ selectedFile.name }}</span>
            <button @click="clearFile"
              class="text-ink-subtle hover:text-data-neg transition-colors p-1">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>

          <!-- Erro / Sucesso -->
          <div v-if="importError"
            class="flex items-center gap-2 text-sm text-data-neg bg-data-neg/10 border border-data-neg/20 rounded-lg p-3">
            <i class="fas fa-circle-exclamation"></i>{{ importError }}
          </div>
          <div v-if="importSuccess"
            class="flex items-center gap-2 text-sm text-data-pos bg-data-pos/10 border border-data-pos/20 rounded-lg p-3">
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
            <div class="rounded-xl p-4 bg-accent/10 border border-accent/20 text-center">
              <p class="text-micro font-semibold text-accent">Faixa 3</p>
              <p class="text-micro text-accent  mt-0.5">R$4.700 a R$8.000</p>
              <p class="text-lg font-bold text-accent mt-1.5 tabular-nums">R$ 400.000</p>
            </div>
            <div class="rounded-xl p-4 bg-accent/10 border border-accent/20 text-center">
              <p class="text-micro font-semibold text-accent">Faixa 4</p>
              <p class="text-micro text-accent  mt-0.5">até R$12.000</p>
              <p class="text-lg font-bold text-accent mt-1.5 tabular-nums">R$ 600.000</p>
            </div>
          </div>
        </Surface>
      </div>
    </PageContainer>
  </div>
</template>
