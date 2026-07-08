<template>
    <div class="min-h-[calc(100vh-3.5rem)]">
        <PageContainer size="full">
            <PageHeader icon="fas fa-sliders-h" subtitle="Perfis de autorização, tipos de solicitação e cobrança de pendências.">
                <template #title>Configurações · Aprovações de Marketing</template>
                <template #actions>
                    <Button variant="ghost" size="sm" icon="fas fa-arrow-left" @click="$router.push('/marketing/aprovacoes')">
                        Voltar
                    </Button>
                </template>
            </PageHeader>

            <div class="max-w-3xl mx-auto space-y-5">

                <!-- Perfis de autorização -->
                <Surface variant="raised" padding="md">
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-sm font-semibold text-ink">Perfis de autorização</h2>
                        <Button variant="secondary" size="sm" icon="fas fa-plus" @click="openProfile()">Novo perfil</Button>
                    </div>
                    <p class="text-[12px] text-ink-subtle mb-3">
                        Cada perfil dá uma decisão por solicitação: qualquer membro decide em nome do perfil.
                        O solicitante escolhe quais perfis precisam autorizar cada pedido.
                    </p>
                    <ul class="divide-y divide-line">
                        <li v-for="p in store.profiles" :key="p.id" class="py-2.5 flex items-center gap-3">
                            <div class="flex-1 min-w-0">
                                <span class="text-sm font-medium text-ink">{{ p.name }}</span>
                                <span v-if="p.is_active === false" class="ml-2 text-[10px] uppercase text-ink-subtle">inativo</span>
                                <p class="text-[12px] text-ink-muted truncate">{{ memberNames(p) }}</p>
                            </div>
                            <Button variant="ghost" size="sm" icon="fas fa-pen" @click="openProfile(p)">Editar</Button>
                        </li>
                        <li v-if="!store.profiles.length" class="py-4 text-sm text-ink-subtle text-center">
                            Nenhum perfil criado ainda — crie o primeiro (ex.: "Diretoria").
                        </li>
                    </ul>
                </Surface>

                <!-- Tipos -->
                <Surface variant="raised" padding="md">
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="text-sm font-semibold text-ink">Tipos de solicitação</h2>
                        <Button variant="secondary" size="sm" icon="fas fa-plus" @click="addType">Adicionar tipo</Button>
                    </div>
                    <ul class="space-y-2">
                        <li v-for="(t, i) in editableTypes" :key="t.key || i" class="flex items-center gap-2">
                            <Input v-model="t.label" class="flex-1" placeholder="Nome do tipo" />
                            <Switch v-model="t.active" />
                        </li>
                    </ul>
                    <p class="text-[11px] text-ink-subtle mt-2">
                        Desativar um tipo esconde ele de novas solicitações sem afetar o histórico.
                    </p>
                </Surface>

                <!-- Cobrança -->
                <Surface variant="raised" padding="md">
                    <h2 class="text-sm font-semibold text-ink mb-3">Cobrança de pendências</h2>
                    <div class="flex items-center gap-3">
                        <label class="text-sm text-ink-muted">Re-notificar aprovadores após</label>
                        <Input v-model="reminderDays" type="number" min="1" class="w-24" />
                        <span class="text-sm text-ink-muted">dia(s) com a solicitação pendente</span>
                    </div>
                </Surface>

                <div class="flex justify-end">
                    <Button variant="primary" icon="fas fa-floppy-disk" :loading="store.saving" @click="save">
                        Salvar configurações
                    </Button>
                </div>
            </div>
        </PageContainer>

        <!-- Modal de perfil -->
        <Modal :open="profileOpen" :title="profileDraft.id ? 'Editar perfil' : 'Novo perfil'" size="md" @close="profileOpen = false">
            <div class="space-y-4">
                <div>
                    <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Nome <span class="text-red-500">*</span></label>
                    <Input v-model="profileDraft.name" placeholder="Ex.: Diretoria" />
                </div>
                <div>
                    <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Descrição</label>
                    <Input v-model="profileDraft.description" placeholder="Opcional" />
                </div>
                <div>
                    <label class="text-[11px] font-medium text-ink-muted mb-1.5 block">Membros <span class="text-red-500">*</span></label>
                    <MultiSelector :model-value="memberSelection" @update:modelValue="v => memberSelection = Array.isArray(v) ? v : []"
                        :options="userOptions" placeholder="Quem decide por este perfil" :page-size="200" overlay />
                </div>
                <div class="flex items-center gap-2">
                    <Switch v-model="profileDraft.is_active" />
                    <span class="text-sm text-ink-muted">Perfil ativo</span>
                </div>
            </div>
            <template #footer>
                <Button variant="secondary" @click="profileOpen = false">Cancelar</Button>
                <Button variant="primary" :loading="store.saving" @click="saveProfile">Salvar perfil</Button>
            </template>
        </Modal>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useApprovalsStore } from '@/stores/Marketing/Approvals/approvalsStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import Modal from '@/components/UI/Modal.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';

const store = useApprovalsStore();
const toast = useToast();

const editableTypes = ref([]);
const reminderDays = ref(3);

// Perfil em edição (modal)
const profileOpen = ref(false);
const profileDraft = ref({ id: null, name: '', description: '', is_active: true });
const memberSelection = ref([]);

const userOptions = computed(() => store.users.map((u) => u.username));
const userIdByName = computed(() => new Map(store.users.map((u) => [u.username, u.id])));
const userNameById = computed(() => new Map(store.users.map((u) => [u.id, u.username])));

function memberNames(p) {
    const names = (p.user_ids || []).map((id) => userNameById.value.get(Number(id)) || `#${id}`);
    return names.join(', ') || 'Sem membros';
}

function slugify(label) {
    return String(label).trim().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function addType() {
    editableTypes.value.push({ key: '', label: '', active: true });
}

function openProfile(p = null) {
    profileDraft.value = p
        ? { id: p.id, name: p.name, description: p.description || '', is_active: p.is_active !== false }
        : { id: null, name: '', description: '', is_active: true };
    memberSelection.value = p
        ? (p.user_ids || []).map((id) => userNameById.value.get(Number(id))).filter(Boolean)
        : [];
    profileOpen.value = true;
}

async function saveProfile() {
    const user_ids = memberSelection.value.map((n) => userIdByName.value.get(n)).filter(Boolean);
    if (!profileDraft.value.name.trim()) return toast.error('Informe o nome do perfil.');
    if (!user_ids.length) return toast.error('Selecione ao menos um membro.');
    try {
        await store.saveProfile({ ...profileDraft.value, user_ids });
        profileOpen.value = false;
        toast.success('Perfil salvo.');
    } catch (e) { toast.error(e.message); }
}

async function save() {
    const types = editableTypes.value
        .map((t) => ({ ...t, label: t.label.trim(), key: t.key || slugify(t.label) }))
        .filter((t) => t.label);
    try {
        await store.saveSettings({ types, reminder_days: Number(reminderDays.value) || 3 });
        toast.success('Configurações salvas.');
    } catch (e) { toast.error(e.message); }
}

onMounted(async () => {
    await store.fetchAdmin();
    editableTypes.value = (store.settings?.types || []).map((t) => ({ ...t }));
    reminderDays.value = store.settings?.reminder_days ?? 3;
});
</script>
