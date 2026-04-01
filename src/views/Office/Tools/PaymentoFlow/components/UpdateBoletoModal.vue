<script setup>
/**
 * UpdateBoletoModal.vue
 * Permite substituir o boleto de um título Sienge já criado.
 * Fluxo: upload → IA extrai dados → usuário revisa/edita → confirma → backend atualiza.
 */
import { ref, computed } from 'vue';
import { usePaymentFlowStore } from '@/stores/Tools/PaymentFlow/paymentFlowStore';
import API_URL from '@/config/apiUrl';

const props = defineProps({
    launch: { type: Object, required: true },
});
const emit = defineEmits(['close', 'updated']);

const store = usePaymentFlowStore();

// ── Estado local ──────────────────────────────────────────────────────────────
const fileInputRef = ref(null);
const dragging = ref(false);

const selectedFile = ref(null);
const uploading = ref(false);
const extracting = ref(false);
const saving = ref(false);
const uploadError = ref(null);
const saveError = ref(null);

// Campos editáveis pós-extração
const form = ref({
    boletoBarcode: '',
    boletoDueDate: '',
    boletoAmount: '',
});

// Resultado do upload (url, path, fileName, mimeType)
const uploadResult = ref(null);

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

// ── Computed ──────────────────────────────────────────────────────────────────
const canSave = computed(() =>
    !!uploadResult.value &&
    !!form.value.boletoBarcode.trim() &&
    !saving.value
);

// ── Handlers ──────────────────────────────────────────────────────────────────
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

    // 1. Upload para storage
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

    // 2. Extração IA
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
    } catch (_) {
        // Extração falhou — usuário preenche manualmente
    } finally {
        extracting.value = false;
    }
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
    <!-- Backdrop -->
    <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" @click="emit('close')"></div>

    <!-- Container de scroll -->
    <div class="fixed inset-0 z-50 overflow-y-auto" @click.self="emit('close')">
        <div class="flex items-start justify-center p-4 pt-10 min-h-full">

            <div class="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">

                <!-- Header -->
                <div class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-file-invoice-dollar text-lg"></i>
                        <div>
                            <div class="font-bold text-sm">Enviar Novo Boleto</div>
                            <div class="text-xs text-orange-100">
                                Título #{{ launch.siengeTituloNumber }} — {{ launch.providerName || '—' }}
                            </div>
                        </div>
                    </div>
                    <button @click="emit('close')"
                        class="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition">
                        <i class="fas fa-xmark text-sm"></i>
                    </button>
                </div>

                <div class="px-6 py-5 space-y-5">

                    <!-- Zona de upload -->
                    <div>
                        <div class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">
                            Arquivo do boleto
                        </div>

                        <!-- Sem arquivo selecionado -->
                        <label v-if="!selectedFile && !uploading && !extracting"
                            class="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed cursor-pointer transition"
                            :class="dragging
                                ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-900/20'
                                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-orange-400 hover:bg-orange-50/30 dark:hover:bg-orange-900/10'"
                            @click="fileInputRef?.click()"
                            @dragover.prevent="dragging = true"
                            @dragleave="dragging = false"
                            @drop.prevent="onDrop">
                            <i class="fas fa-file-arrow-up text-3xl text-gray-300 dark:text-gray-600 mb-2"></i>
                            <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {{ dragging ? 'Solte o arquivo aqui' : 'Clique ou arraste o PDF do boleto' }}
                            </span>
                            <span class="text-xs text-gray-400 mt-0.5">PDF — máx. 2 MB</span>
                        </label>

                        <!-- Processando -->
                        <div v-else-if="uploading || extracting"
                            class="h-32 rounded-xl border border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 flex flex-col items-center justify-center gap-2">
                            <i class="fas fa-spinner fa-spin text-orange-500 text-xl"></i>
                            <div class="text-xs text-orange-600 dark:text-orange-300 font-medium text-center">
                                <div v-if="uploading">Enviando arquivo…</div>
                                <div v-else>IA extraindo dados do boleto…</div>
                            </div>
                        </div>

                        <!-- Arquivo carregado -->
                        <div v-else
                            class="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <div class="flex items-center gap-2 min-w-0">
                                <i class="fas fa-file-pdf text-red-400 flex-shrink-0"></i>
                                <span class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                    {{ selectedFile?.name }}
                                </span>
                            </div>
                            <button
                                class="text-gray-400 hover:text-red-500 flex-shrink-0 transition ml-3"
                                @click="selectedFile = null; uploadResult = null; uploadError = null;">
                                <i class="fas fa-xmark text-sm"></i>
                            </button>
                        </div>

                        <input ref="fileInputRef" type="file" accept="application/pdf" class="hidden" @change="onFileSelected" />

                        <div v-if="uploadError" class="mt-1.5 text-xs text-red-500">{{ uploadError }}</div>
                    </div>

                    <!-- Formulário de revisão (aparece após extração) -->
                    <div v-if="uploadResult" class="space-y-3">
                        <div class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <i class="fas fa-robot text-gray-400"></i>
                            Dados extraídos — revise antes de confirmar
                        </div>

                        <div>
                            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Código de barras <span class="text-red-500">*</span>
                            </label>
                            <input
                                v-model="form.boletoBarcode"
                                type="text"
                                placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
                                class="input-field font-mono text-xs" />
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Vencimento
                                </label>
                                <input
                                    v-model="form.boletoDueDate"
                                    type="text"
                                    placeholder="DD/MM/AAAA"
                                    class="input-field text-xs" />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                    Valor (R$)
                                </label>
                                <input
                                    v-model="form.boletoAmount"
                                    type="text"
                                    placeholder="0.00"
                                    class="input-field text-xs" />
                            </div>
                        </div>
                    </div>

                    <!-- Erro ao salvar -->
                    <div v-if="saveError"
                        class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 px-4 py-3 text-xs text-red-600 dark:text-red-400">
                        <i class="fas fa-triangle-exclamation mr-1.5"></i>{{ saveError }}
                    </div>
                </div>

                <!-- Footer -->
                <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <button
                        type="button"
                        class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        @click="emit('close')">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        class="px-5 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
                        :class="canSave ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-400 cursor-not-allowed'"
                        :disabled="!canSave"
                        @click="handleSave">
                        <i v-if="saving" class="fas fa-spinner fa-spin mr-1.5"></i>
                        <i v-else class="fas fa-check mr-1.5"></i>
                        {{ saving ? 'Salvando…' : 'Confirmar novo boleto' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.input-field {
    @apply w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none transition focus:border-blue-500;
}

.field-label {
    @apply block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1;
}
</style>