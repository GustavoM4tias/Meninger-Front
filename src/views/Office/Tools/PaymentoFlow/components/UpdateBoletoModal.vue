<script setup>
/**
 * UpdateBoletoModal — substituir boleto de um título Sienge já criado.
 * Fluxo: upload → IA extrai → usuário revisa → confirma → backend atualiza.
 */
import { ref, computed } from 'vue';
import { usePaymentFlowStore } from '@/stores/Tools/PaymentFlow/paymentFlowStore';
import API_URL from '@/config/apiUrl';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';

const props = defineProps({
  launch: { type: Object, required: true },
});
const emit = defineEmits(['close', 'updated']);

const store = usePaymentFlowStore();

const fileInputRef = ref(null);
const dragging = ref(false);
const selectedFile = ref(null);
const uploading = ref(false);
const extracting = ref(false);
const saving = ref(false);
const uploadError = ref(null);
const saveError = ref(null);
const uploadResult = ref(null);

const form = ref({ boletoBarcode: '', boletoDueDate: '', boletoAmount: '' });

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const canSave = computed(() =>
  !!uploadResult.value && !!form.value.boletoBarcode.trim() && !saving.value
);

async function processFile(file) {
  if (!file) return;
  if (file.size > MAX_FILE_SIZE) {
    uploadError.value = `O arquivo "${file.name}" excede o limite de 2 MB.`;
    return;
  }

  selectedFile.value = file;
  uploadError.value = null;
  uploadResult.value = null;
  form.value = { boletoBarcode: '', boletoDueDate: '', boletoAmount: '' };

  uploading.value = true;
  try {
    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('context', 'payment_flow_boleto');
    const res = await fetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || 'Erro no upload');
    uploadResult.value = data;
  } catch (err) {
    uploadError.value = `Upload: ${err.message}`;
    uploading.value = false;
    return;
  } finally {
    uploading.value = false;
  }

  extracting.value = true;
  try {
    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('document', file);
    fd.append('today', new Date().toISOString().slice(0, 10));
    const res = await fetch(`${API_URL}/ai/payment-flow/extract/boleto`, {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: fd,
    });
    const data = await res.json();
    if (res.ok && data?.prefill) {
      form.value.boletoBarcode = data.prefill.boletoBarcode || '';
      form.value.boletoDueDate = data.prefill.boletoDueDate || '';
      form.value.boletoAmount  = data.prefill.boletoAmount  || '';
    }
  } catch { /* extração falhou - usuário preenche */ }
  finally { extracting.value = false; }
}

function onFileSelected(e) {
  const file = e.target.files?.[0];
  fileInputRef.value.value = '';
  processFile(file);
}

function onDrop(e) {
  dragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  processFile(file);
}

async function handleSave() {
  if (!canSave.value) return;
  saving.value = true;
  saveError.value = null;
  try {
    await store.updateBoleto(props.launch.id, {
      boletoUrl:      uploadResult.value.url,
      boletoPath:     uploadResult.value.path,
      boletoFilename: uploadResult.value.fileName || selectedFile.value?.name,
      boletoBarcode:  form.value.boletoBarcode.trim(),
      boletoDueDate:  form.value.boletoDueDate || null,
      boletoAmount:   form.value.boletoAmount  || null,
    });
    emit('updated');
    emit('close');
  } catch (err) {
    saveError.value = err.message || 'Erro ao atualizar boleto.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Modal :open="true" size="md" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 grid place-items-center shrink-0">
          <i class="fas fa-file-invoice-dollar text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">Enviar novo boleto</h2>
          <p class="text-xs text-ink-muted mt-0.5 truncate">
            Título <span class="font-mono">#{{ launch.siengeTituloNumber }}</span> — {{ launch.providerName || '—' }}
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Upload zone -->
      <div>
        <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-2">Arquivo do boleto</p>

        <label v-if="!selectedFile && !uploading && !extracting"
          class="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
          :class="dragging
            ? 'border-amber-500/50 bg-amber-500/10'
            : 'border-line bg-surface-sunken hover:border-amber-500/40 hover:bg-amber-500/5'"
          @click="fileInputRef?.click()"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop">
          <i class="fas fa-file-arrow-up text-2xl text-ink-subtle mb-2"></i>
          <span class="text-xs font-medium text-ink-muted">
            {{ dragging ? 'Solte o arquivo aqui' : 'Clique ou arraste o PDF do boleto' }}
          </span>
          <span class="text-[10px] text-ink-subtle mt-0.5 font-mono">PDF · máx. 2 MB</span>
        </label>

        <div v-else-if="uploading || extracting"
          class="h-32 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col items-center justify-center gap-2">
          <Spinner size="md" />
          <p class="text-xs text-amber-700 dark:text-amber-300 font-medium text-center">
            <span v-if="uploading">Enviando arquivo...</span>
            <span v-else>IA extraindo dados do boleto...</span>
          </p>
        </div>

        <div v-else
          class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-line bg-surface-sunken">
          <div class="flex items-center gap-2 min-w-0">
            <i class="fas fa-file-pdf text-red-500 shrink-0"></i>
            <span class="text-xs font-medium text-ink truncate">{{ selectedFile?.name }}</span>
          </div>
          <button
            class="text-ink-subtle hover:text-red-500 transition-colors shrink-0"
            @click="selectedFile = null; uploadResult = null; uploadError = null;">
            <i class="fas fa-xmark text-sm"></i>
          </button>
        </div>

        <input ref="fileInputRef" type="file" accept="application/pdf" class="hidden" @change="onFileSelected" />

        <p v-if="uploadError" class="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <i class="fas fa-circle-exclamation"></i>{{ uploadError }}
        </p>
      </div>

      <!-- Form -->
      <div v-if="uploadResult" class="space-y-3">
        <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono flex items-center gap-2">
          <i class="fas fa-robot text-accent text-xs"></i>
          Dados extraídos — revise antes de confirmar
        </p>

        <Input v-model="form.boletoBarcode"
          label="Código de barras" required
          placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
          class="font-mono" />

        <div class="grid grid-cols-2 gap-3">
          <Input v-model="form.boletoDueDate" label="Vencimento" placeholder="DD/MM/AAAA" />
          <Input v-model="form.boletoAmount" label="Valor (R$)" placeholder="0.00" />
        </div>
      </div>

      <div v-if="saveError"
        class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ saveError }}
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" @click="emit('close')">Cancelar</Button>
      <Button :loading="saving" :disabled="!canSave"
        icon="fas fa-check" @click="handleSave">
        {{ saving ? 'Salvando...' : 'Confirmar novo boleto' }}
      </Button>
    </template>
  </Modal>
</template>
