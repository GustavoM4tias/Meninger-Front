<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import EnterprisePicker from './EnterprisePicker.vue';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const emit = defineEmits(['close', 'deleted']);
const store = useChecklistStore();
const toast = useToast();

const saving = ref(false);
const form = ref({ title: '', display_name: '', idempreendimento: null, key_dates: [], status: 'active' });

onMounted(() => {
    const c = store.current?.checklist || {};
    form.value = {
        title: c.title || '',
        display_name: c.display_name || '',
        idempreendimento: c.idempreendimento ?? null,
        key_dates: JSON.parse(JSON.stringify(c.key_dates || [])),
        status: c.status || 'active',
    };
});

const statusBadge = computed(() => ({
    draft: { label: 'Rascunho', variant: 'warning' },
    done: { label: 'Concluído', variant: 'success' },
    archived: { label: 'Arquivado', variant: 'neutral' },
}[form.value.status] || { label: 'Efetivo', variant: 'accent' }));

function slug(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''); }
function addKeyDate() { form.value.key_dates.push({ key: '', label: '', date: '' }); }
function quickAdd(key, label) { if (!form.value.key_dates.some((k) => k.key === key)) form.value.key_dates.push({ key, label, date: '' }); }

async function save(newStatus) {
    saving.value = true;
    try {
        const key_dates = form.value.key_dates
            .filter((k) => k.label || k.date)
            .map((k) => ({ key: k.key || slug(k.label) || ('m_' + Math.random().toString(36).slice(2, 7)), label: k.label || k.key, date: k.date || null }));
        const payload = {
            title: form.value.title.trim(),
            display_name: form.value.display_name?.trim() || null,
            idempreendimento: form.value.idempreendimento || null,
            key_dates,
        };
        if (newStatus) payload.status = newStatus;
        await store.updateChecklist(payload);
        toast.success(newStatus === 'draft' ? 'Salvo como rascunho.' : newStatus === 'active' ? 'Checklist efetivado.' : 'Configurações salvas.');
        emit('close');
    } catch (e) { toast.error(e.message); }
    finally { saving.value = false; }
}

async function del() {
    if (!confirm('Excluir este checklist e TODAS as tarefas? Esta ação não pode ser desfeita.')) return;
    saving.value = true;
    try {
        await store.deleteChecklist(store.current.checklist.id);
        toast.success('Checklist excluído.');
        emit('deleted');
    } catch (e) { toast.error(e.message || 'Sem permissão para excluir (admin).'); }
    finally { saving.value = false; }
}

const dateField = 'rounded-lg border border-line bg-surface-raised text-ink px-3 py-2 text-sm shadow-inner-soft outline-none transition-all focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20';
</script>

<template>
    <Modal :open="true" size="lg" @close="emit('close')">
        <template #header>
            <div class="flex items-center gap-2.5 min-w-0">
                <span class="h-8 w-8 grid place-items-center rounded-lg bg-accent-soft text-accent shrink-0"><i class="fas fa-gear"></i></span>
                <div class="min-w-0">
                    <h2 class="text-base font-semibold text-ink truncate">Configurar checklist</h2>
                    <p class="text-xs text-ink-muted">Nome, empreendimento e marcos do projeto.</p>
                </div>
                <Badge :variant="statusBadge.variant" class="ml-1 shrink-0">{{ statusBadge.label }}</Badge>
            </div>
        </template>

        <div class="space-y-5">
            <Input v-model="form.title" label="Nome do checklist" placeholder="Ex.: Lançamento - Três Marias - Ibitinga" />

            <div>
                <label class="block text-xs font-medium text-ink-muted mb-1.5">Empreendimento</label>
                <EnterprisePicker v-model:idempreendimento="form.idempreendimento" v-model:display-name="form.display_name" />
            </div>

            <div class="surface-card p-3.5">
                <div class="flex items-center justify-between gap-2 mb-2.5">
                    <label class="text-xs font-semibold text-ink-muted flex items-center gap-1.5"><i class="fas fa-flag-checkered text-ink-subtle"></i> Datas / marcos</label>
                    <div class="flex gap-1.5">
                        <Button variant="subtle" size="sm" icon="fas fa-plus" @click="quickAdd('meeting', 'Meeting')">Meeting</Button>
                        <Button variant="subtle" size="sm" icon="fas fa-plus" @click="quickAdd('store_opening', 'Abertura de Loja')">Abertura</Button>
                    </div>
                </div>

                <div v-if="!form.key_dates.length" class="text-xs text-ink-subtle py-2 text-center">Nenhum marco. Adicione "Meeting" / "Abertura" ou um marco livre.</div>
                <div v-else class="space-y-2">
                    <div v-for="(k, i) in form.key_dates" :key="i" class="flex items-center gap-2">
                        <input v-model="k.label" placeholder="Marco (ex.: Abertura de Loja)" :class="['flex-1 min-w-0', dateField]" />
                        <input type="date" v-model="k.date" :class="['w-[150px] shrink-0', dateField]" />
                        <button @click="form.key_dates.splice(i, 1)" class="h-9 w-9 grid place-items-center rounded-lg text-ink-subtle hover:text-red-500 hover:bg-red-500/10 transition shrink-0" title="Remover marco"><i class="fas fa-xmark"></i></button>
                    </div>
                </div>

                <button @click="addKeyDate" class="mt-2.5 text-xs text-accent hover:underline focus-ring rounded"><i class="fas fa-plus"></i> adicionar marco livre</button>
                <p class="text-[11px] text-ink-subtle mt-2">Os marcos "Meeting" e "Abertura de Loja" alimentam os prazos automáticos das tarefas-padrão.</p>
            </div>
        </div>

        <template #footer>
            <div class="flex flex-wrap items-center gap-2 w-full">
                <Button variant="danger" size="sm" icon="fas fa-trash" :loading="saving" @click="del">Excluir</Button>
                <div class="flex flex-wrap items-center gap-2 ml-auto">
                    <Button variant="outline" size="sm" icon="fas fa-file-pen" :disabled="saving" @click="save('draft')">Rascunho</Button>
                    <Button variant="outline" size="sm" icon="fas fa-circle-check" :disabled="saving" @click="save('active')">Tornar efetivo</Button>
                    <Button variant="primary" size="sm" icon="fas fa-floppy-disk" :loading="saving" @click="save()">Salvar</Button>
                </div>
            </div>
        </template>
    </Modal>
</template>
