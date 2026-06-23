<script setup>
import { ref } from 'vue';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';

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
const inputCls = 'w-full rounded-lg border border-line bg-surface text-ink px-3 py-2 text-sm focus-ring';
</script>

<template>
    <div class="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4 animate-fade-in" @click.self="emit('close')">
        <div class="bg-surface-overlay border border-line rounded-2xl shadow-overlay w-full max-w-md p-5 animate-scale-in">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-base font-bold text-ink flex items-center gap-2"><i class="fas fa-paperclip text-accent"></i> Vincular Arquivo</h3>
                <button @click="emit('close')" class="text-ink-subtle hover:text-ink focus-ring rounded"><i class="fas fa-times"></i></button>
            </div>

            <div class="inline-flex rounded-lg border border-line overflow-hidden mb-4 text-sm">
                <button @click="tab = 'url'" class="px-4 py-1.5 focus-ring" :class="tab === 'url' ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-sunken'"><i class="fas fa-link"></i> Colar URL</button>
                <button @click="tab = 'upload'" class="px-4 py-1.5 focus-ring" :class="tab === 'upload' ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-sunken'"><i class="fas fa-upload"></i> Enviar Arquivo</button>
            </div>

            <div v-if="tab === 'url'" class="space-y-2">
                <p class="text-xs text-ink-muted">Cole o link direto de qualquer arquivo (Google Drive, OneDrive, SharePoint, etc.).</p>
                <div><label class="block text-xs text-ink-muted mb-1">URL do Arquivo</label><input v-model="url" placeholder="https://..." :class="inputCls" @keyup.enter="addUrl" /></div>
                <div><label class="block text-xs text-ink-muted mb-1">Nome (opcional)</label><input v-model="name" placeholder="Ex.: Contrato assinado" :class="inputCls" /></div>
                <div class="flex justify-end pt-1"><button @click="addUrl" :disabled="saving || !url.trim()" class="px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg focus-ring disabled:opacity-50">Vincular</button></div>
            </div>

            <div v-else class="space-y-3">
                <p class="text-xs text-ink-muted">Envie um arquivo do seu computador (PDF, imagem ou documento).</p>
                <label class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-line rounded-xl py-8 cursor-pointer hover:border-accent hover:bg-surface-sunken transition">
                    <i class="fas fa-cloud-arrow-up text-2xl text-ink-subtle"></i>
                    <span class="text-sm text-ink-muted">{{ uploading ? 'Enviando...' : 'Clique para escolher o arquivo' }}</span>
                    <input type="file" class="hidden" @change="onFile" :disabled="uploading" />
                </label>
            </div>
        </div>
    </div>
</template>
