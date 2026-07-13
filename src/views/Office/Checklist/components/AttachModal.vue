<script setup>
import { ref } from 'vue';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({ taskId: { type: Number, required: true } });
const emit = defineEmits(['close']);
const store = useChecklistStore();
const toast = useToast();

const tab = ref('url');
const url = ref('');
const name = ref('');
const uploading = ref(false);
const saving = ref(false);

async function addUrl() {
    const u = url.value.trim();
    if (!u) return;
    saving.value = true;
    try {
        await store.addAttachment(props.taskId, { url: u, file_name: name.value.trim() || u, kind: 'LINK' });
        toast.success('Arquivo vinculado.');
        emit('close');
    } catch (e) { toast.error(e.message); } finally { saving.value = false; }
}
async function onFile(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    uploading.value = true;
    try {
        const fd = new FormData();
        fd.append('file', file); fd.append('context', 'checklist_attachment'); fd.append('referenceId', String(props.taskId));
        const token = localStorage.getItem('token');
        const resp = await fetch(`${API_URL}/uploads`, { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: fd });
        const up = await resp.json();
        if (!resp.ok) throw new Error(up?.message || 'Falha no upload');
        await store.addAttachment(props.taskId, { file_name: up.fileName, mime_type: up.mimeType, url: up.url, storage_path: up.path, size: up.size });
        toast.success('Arquivo enviado.');
        emit('close');
    } catch (e) { toast.error(e.message); } finally { uploading.value = false; ev.target.value = ''; }
}
const inputCls = 'w-full rounded-lg border border-line bg-surface-raised text-ink px-3 py-2 text-sm shadow-inner-soft placeholder:text-ink-subtle outline-none focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20 transition-all';
</script>

<template>
    <Modal :open="true" size="sm" @close="emit('close')">
        <template #header>
            <div class="flex items-center gap-2.5 min-w-0">
                <span class="grid place-items-center h-9 w-9 rounded-xl bg-accent-soft text-accent border border-accent/20 shrink-0">
                    <i class="fas fa-paperclip"></i>
                </span>
                <div class="min-w-0">
                    <h2 class="text-base font-semibold text-ink truncate">Vincular arquivo</h2>
                    <p class="text-xs text-ink-muted">Cole um link ou envie do computador</p>
                </div>
            </div>
        </template>

        <div class="space-y-4">
            <!-- Alternador de origem -->
            <div class="grid grid-cols-2 sm:inline-flex rounded-lg border border-line overflow-hidden text-sm w-full sm:w-auto">
                <button @click="tab = 'url'" class="px-4 py-1.5 focus-ring transition-colors"
                    :class="tab === 'url' ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-sunken'">
                    <i class="fas fa-link"></i> Colar URL
                </button>
                <button @click="tab = 'upload'" class="px-4 py-1.5 focus-ring transition-colors"
                    :class="tab === 'upload' ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-sunken'">
                    <i class="fas fa-upload"></i> Enviar Arquivo
                </button>
            </div>

            <div v-if="tab === 'url'" class="space-y-3">
                <p class="text-xs text-ink-muted">Cole o link direto de qualquer arquivo (Google Drive, OneDrive, SharePoint, etc.).</p>
                <div>
                    <label class="block text-xs font-medium text-ink-muted mb-1.5">URL do arquivo</label>
                    <input v-model="url" placeholder="https://..." :class="inputCls" @keyup.enter="addUrl" />
                </div>
                <div>
                    <label class="block text-xs font-medium text-ink-muted mb-1.5">Nome (opcional)</label>
                    <input v-model="name" placeholder="Ex.: Contrato assinado" :class="inputCls" />
                </div>
            </div>

            <div v-else class="space-y-3">
                <p class="text-xs text-ink-muted">Envie um arquivo do seu computador (PDF, imagem ou documento).</p>
                <label class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-line rounded-xl py-8 cursor-pointer hover:border-accent hover:bg-surface-sunken transition-colors">
                    <i class="fas fa-cloud-arrow-up text-2xl text-ink-subtle"></i>
                    <span class="text-sm text-ink-muted">{{ uploading ? 'Enviando...' : 'Clique para escolher o arquivo' }}</span>
                    <input type="file" class="hidden" @change="onFile" :disabled="uploading" />
                </label>
            </div>
        </div>

        <template #footer>
            <Button variant="ghost" @click="emit('close')">Cancelar</Button>
            <Button v-if="tab === 'url'" :loading="saving" :disabled="!url.trim()" icon="fas fa-link" @click="addUrl">Vincular</Button>
        </template>
    </Modal>
</template>
