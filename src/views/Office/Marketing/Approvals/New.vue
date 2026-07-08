<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="full">
            <PageHeader icon="fas fa-stamp" subtitle="Preencha os dados do pedido — a diretoria decide direto pelo Office ou WhatsApp.">
                <template #title>Nova solicitação</template>
                <template #actions>
                    <Button variant="ghost" size="sm" icon="fas fa-arrow-left" @click="$router.push('/marketing/aprovacoes')">
                        Voltar
                    </Button>
                </template>
            </PageHeader>

            <Surface variant="raised" padding="lg" class="max-w-3xl mx-auto">
                <form class="space-y-5" @submit.prevent="submit">

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">
                                Tipo de solicitação <span class="text-red-500">*</span>
                            </label>
                            <Select v-model="form.type_key" :options="store.typeOptions" placeholder="Selecione o tipo" required />
                        </div>
                        <div>
                            <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">
                                Perfis de autorização <span class="text-red-500">*</span>
                            </label>
                            <MultiSelector :model-value="profileSelection" @update:modelValue="v => profileSelection = Array.isArray(v) ? v : []"
                                :options="profileOptions" placeholder="Quem precisa autorizar" />
                        </div>
                    </div>
                    <p class="text-[11px] text-ink-subtle -mt-2">
                        Todos os perfis selecionados precisam aprovar. Qualquer reprovação encerra a solicitação.
                    </p>

                    <!-- Itens -->
                    <div>
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">
                            Itens da solicitação <span class="text-red-500">*</span>
                        </label>
                        <div v-for="(it, i) in items" :key="i" class="border border-line rounded-lg p-3 mb-2 bg-surface-sunken/30">
                            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                <Input class="sm:col-span-5" v-model="it.name" placeholder="Item (ex: Outdoor Av. Brasil)" />
                                <Input class="sm:col-span-5" v-model="it.description" placeholder="Descrição (opcional)" />
                                <Input class="sm:col-span-2" v-model="it.amount" inputmode="decimal" placeholder="0,00" />
                            </div>
                            <div class="flex justify-end mt-1">
                                <button type="button" class="text-[11px] text-red-500 hover:text-red-600 disabled:opacity-40"
                                    :disabled="items.length === 1" @click="removeItem(i)">
                                    <i class="fas fa-trash-can mr-1"></i>Remover item
                                </button>
                            </div>
                        </div>
                        <div class="flex items-center justify-between mt-1">
                            <Button type="button" variant="secondary" size="sm" icon="fas fa-plus" @click="addItem">Adicionar item</Button>
                            <div class="text-sm text-ink">
                                Total: <span class="font-mono font-bold tabular-nums text-accent">{{ fmtBRL(total) }}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Centro de custo (Sienge)</label>
                        <MultiSelector :model-value="ccSelection" @update:modelValue="v => ccSelection = Array.isArray(v) ? v : []"
                            :options="store.costCenterOptions" placeholder="(Opcional) Vincular a um empreendimento" :page-size="200" single />
                        <p v-if="store.costCenterUnavailable" class="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                            <i class="fas fa-triangle-exclamation mr-1"></i>
                            Sienge indisponível no momento — deixe em branco e vincule depois.
                        </p>
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Justificativa</label>
                        <textarea v-model="form.justification" rows="2"
                            class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
                            placeholder="Por que o pedido é necessário (opcional)"></textarea>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Fornecedor</label>
                            <Input v-model="form.supplier" placeholder="Se houver" />
                        </div>
                        <div>
                            <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Prazo</label>
                            <Input v-model="form.due_date" type="date" />
                        </div>
                    </div>

                    <!-- Anexos -->
                    <div>
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Anexos (orçamentos, artes, propostas)</label>
                        <div class="flex items-center gap-2">
                            <input ref="fileInput" type="file" class="hidden" multiple
                                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx"
                                @change="onFilesPicked" />
                            <Button type="button" variant="secondary" size="sm" icon="fas fa-paperclip"
                                :loading="uploading" @click="fileInput?.click()">
                                Adicionar arquivo
                            </Button>
                        </div>
                        <ul v-if="attachments.length" class="mt-2 space-y-1">
                            <li v-for="(att, i) in attachments" :key="att.url"
                                class="flex items-center gap-2 text-sm text-ink-muted bg-surface-sunken rounded-lg px-3 py-1.5">
                                <i class="fas fa-file text-ink-subtle text-xs"></i>
                                <button type="button" class="flex-1 truncate text-left hover:text-accent" @click="viewerAtt = att">{{ att.file_name }}</button>
                                <button type="button" class="text-red-500 hover:text-red-600" @click="attachments.splice(i, 1)">
                                    <i class="fas fa-xmark"></i>
                                </button>
                            </li>
                        </ul>
                    </div>

                    <div class="flex justify-end gap-2 pt-2 border-t border-line">
                        <Button type="button" variant="secondary" @click="$router.push('/marketing/aprovacoes')">Cancelar</Button>
                        <Button type="submit" variant="primary" icon="fas fa-paper-plane" :loading="store.saving">
                            Enviar para aprovação
                        </Button>
                    </div>
                </form>
            </Surface>
        </PageContainer>

        <AttachmentViewerModal v-if="viewerAtt" :attachment="viewerAtt" @close="viewerAtt = null" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useApprovalsStore } from '@/stores/Marketing/Approvals/approvalsStore';
import api from '@/utils/Marketing/approvalsApi.js';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Select from '@/components/UI/Select.vue';
import Input from '@/components/UI/Input.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import AttachmentViewerModal from '@/views/Office/Checklist/components/AttachmentViewerModal.vue';

const store = useApprovalsStore();
const router = useRouter();
const toast = useToast();

const form = ref({ type_key: '', justification: '', supplier: '', due_date: '' });
const items = ref([{ name: '', description: '', amount: '' }]);
const profileSelection = ref([]);
const ccSelection = ref([]);
const attachments = ref([]);
const uploading = ref(false);
const fileInput = ref(null);
const viewerAtt = ref(null);

// MultiSelector usa strings puras → nome do perfil + mapa p/ id.
const profileOptions = computed(() => store.activeProfiles.map((p) => p.name));
const profileIdByName = computed(() => new Map(store.activeProfiles.map((p) => [p.name, p.id])));

const total = computed(() => items.value.reduce((s, it) => s + (parseAmount(it.amount) || 0), 0));

function parseAmount(str) {
    // Aceita "1.234,56", "1234,56" e "1234.56".
    const s = String(str || '').trim().replace(/[R$\s]/g, '');
    if (!s) return NaN;
    const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
    return Number(normalized);
}

function addItem() { items.value.push({ name: '', description: '', amount: '' }); }
function removeItem(i) { if (items.value.length > 1) items.value.splice(i, 1); }

async function onFilesPicked(ev) {
    const files = Array.from(ev.target.files || []);
    if (!files.length) return;
    uploading.value = true;
    try {
        for (const file of files) {
            const up = await api.upload(file);
            attachments.value.push({
                file_name: up.fileName || file.name,
                mime_type: up.mimeType || file.type,
                url: up.url,
                storage_path: up.path,
                size: up.size ?? file.size,
            });
        }
    } catch (e) {
        toast.error(e.message);
    } finally {
        uploading.value = false;
        if (fileInput.value) fileInput.value.value = '';
    }
}

const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function submit() {
    const parsedItems = items.value
        .map((it) => ({ name: (it.name || '').trim(), description: (it.description || '').trim(), amount: parseAmount(it.amount) }))
        .filter((it) => it.name || Number.isFinite(it.amount));
    if (!parsedItems.length || parsedItems.some((it) => !it.name || !Number.isFinite(it.amount) || it.amount < 0)) {
        return toast.error('Cada item precisa de um nome e um valor válido.');
    }
    const auth_profile_ids = profileSelection.value
        .map((name) => profileIdByName.value.get(name)).filter(Boolean);
    if (!auth_profile_ids.length) return toast.error('Selecione ao menos um perfil de autorização.');

    const cost_center_id = ccSelection.value.length
        ? store.costCenterCodeByOption.get(ccSelection.value[0]) || null : null;

    try {
        const created = await store.createRequest({
            ...form.value,
            items: parsedItems,
            auth_profile_ids,
            cost_center_id,
            attachments: attachments.value,
        });
        toast.success(`Solicitação ${created.protocol} enviada para aprovação.`);
        router.push(`/marketing/aprovacoes/${created.id}`);
    } catch (e) {
        toast.error(e.message);
    }
}

onMounted(async () => {
    if (!store.types.length || !store.profiles.length) await store.fetchMeta();
});
</script>
