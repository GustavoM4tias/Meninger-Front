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
                                Valor (R$) <span class="text-red-500">*</span>
                            </label>
                            <Input v-model="amountInput" inputmode="decimal" placeholder="0,00" required />
                        </div>
                    </div>

                    <div>
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">
                            Perfis de autorização <span class="text-red-500">*</span>
                        </label>
                        <MultiSelector :model-value="profileSelection" @update:modelValue="v => profileSelection = Array.isArray(v) ? v : []"
                            :options="profileOptions" placeholder="Quem precisa autorizar" />
                        <p class="text-[11px] text-ink-subtle mt-1">
                            Todos os perfis selecionados precisam aprovar. Qualquer reprovação encerra a solicitação.
                        </p>
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
                        <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">
                            Descrição da solicitação <span class="text-red-500">*</span>
                        </label>
                        <textarea v-model="form.description" rows="3" required
                            class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent/40"
                            placeholder="O que está sendo solicitado"></textarea>
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
                                <span class="flex-1 truncate">{{ att.file_name }}</span>
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

const store = useApprovalsStore();
const router = useRouter();
const toast = useToast();

const form = ref({ type_key: '', description: '', justification: '', supplier: '', due_date: '' });
const amountInput = ref('');
const profileSelection = ref([]);
const ccSelection = ref([]);
const attachments = ref([]);
const uploading = ref(false);
const fileInput = ref(null);

// MultiSelector usa strings puras → nome do perfil + mapa p/ id.
const profileOptions = computed(() => store.activeProfiles.map((p) => p.name));
const profileIdByName = computed(() => new Map(store.activeProfiles.map((p) => [p.name, p.id])));

function parseAmount(str) {
    // Aceita "1.234,56", "1234,56" e "1234.56".
    const s = String(str || '').trim().replace(/[R$\s]/g, '');
    if (!s) return NaN;
    const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
    return Number(normalized);
}

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

async function submit() {
    const amount = parseAmount(amountInput.value);
    if (!Number.isFinite(amount) || amount < 0) return toast.error('Informe um valor (R$) válido.');
    const auth_profile_ids = profileSelection.value
        .map((name) => profileIdByName.value.get(name)).filter(Boolean);
    if (!auth_profile_ids.length) return toast.error('Selecione ao menos um perfil de autorização.');

    const cost_center_id = ccSelection.value.length
        ? store.costCenterCodeByOption.get(ccSelection.value[0]) || null : null;

    try {
        const created = await store.createRequest({
            ...form.value,
            amount,
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
