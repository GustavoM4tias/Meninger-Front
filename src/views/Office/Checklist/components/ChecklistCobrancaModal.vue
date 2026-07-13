<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import RuleEditor from './RuleEditor.vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';

const emit = defineEmits(['close']);
const store = useChecklistStore();
const toast = useToast();

const loading = ref(true);
const saving = ref(false);
const mode = ref('DEFAULT');
const rules = ref([]);

const MODES = [
    { v: 'DEFAULT', l: 'Padrão', d: 'Usa a régua global de cobrança.' },
    { v: 'CUSTOM', l: 'Personalizada', d: 'Régua exclusiva deste checklist.' },
    { v: 'OFF', l: 'Desligada', d: 'Sem cobrança automática aqui.' },
];

function blankRule() {
    return { scope: 'CHECKLIST', name: 'Nova regra', anchor: 'DUE_DATE', offset_days: 0, repeat_every_days: null, max_occurrences: null, apply_states: ['TODO', 'IN_PROGRESS', 'BLOCKED'], recipients: { assignee: true, owner: false, user_ids: [], roles: [] }, channels: { inapp: true, email: true, whatsapp: false }, title_template: '', body_template: '', importance: 6, active: true };
}

onMounted(async () => {
    try {
        const res = await store.loadChecklistCobranca();
        if (res) { mode.value = res.mode || 'DEFAULT'; rules.value = res.rules || []; }
    } catch (e) { toast.error(e.message); }
    finally { loading.value = false; }
});

async function cloneDefault() {
    saving.value = true;
    try {
        const res = await store.saveChecklistCobranca({ mode: 'CUSTOM' }); // backend clona a régua global
        rules.value = res.rules || [];
        mode.value = 'CUSTOM';
        toast.success('Régua padrão copiada. Personalize à vontade.');
    } catch (e) { toast.error(e.message); }
    finally { saving.value = false; }
}

async function save() {
    saving.value = true;
    try {
        const payload = mode.value === 'CUSTOM' ? { mode: 'CUSTOM', rules: rules.value } : { mode: mode.value };
        await store.saveChecklistCobranca(payload);
        toast.success('Cobrança do checklist salva.');
        emit('close');
    } catch (e) { toast.error(e.message); }
    finally { saving.value = false; }
}
</script>

<template>
    <Modal :open="true" size="xl" @close="emit('close')">
        <template #header>
            <div class="flex items-center gap-2.5 min-w-0">
                <span class="grid place-items-center h-9 w-9 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                    <i class="fas fa-bell"></i>
                </span>
                <div class="min-w-0">
                    <h2 class="text-base font-semibold text-ink truncate">Cobrança deste checklist</h2>
                    <p class="text-xs text-ink-muted">Como os lembretes automáticos funcionam aqui</p>
                </div>
            </div>
        </template>

        <div v-if="loading" class="text-center text-ink-subtle py-10"><i class="fas fa-spinner fa-spin text-xl"></i></div>

        <template v-else>
            <!-- Modo -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                <button v-for="m in MODES" :key="m.v" @click="mode = m.v"
                    class="text-left p-3 rounded-xl border transition-colors focus-ring"
                    :class="mode === m.v ? 'border-accent bg-accent-soft/40' : 'border-line hover:bg-surface-sunken'">
                    <p class="font-semibold text-ink text-sm flex items-center gap-1.5">
                        <i v-if="mode === m.v" class="fas fa-circle-check text-accent text-xs"></i>{{ m.l }}
                    </p>
                    <p class="text-xs text-ink-muted mt-0.5">{{ m.d }}</p>
                </button>
            </div>

            <!-- Régua personalizada -->
            <div v-if="mode === 'CUSTOM'">
                <div v-if="!rules.length" class="surface-card p-5 text-center mb-3">
                    <i class="fas fa-sliders text-2xl text-ink-subtle mb-2 block opacity-50"></i>
                    <p class="text-sm text-ink-muted mb-3">Sem régua própria ainda. Comece copiando a régua padrão ou crie do zero.</p>
                    <div class="flex flex-wrap justify-center gap-2">
                        <Button :loading="saving" icon="fas fa-copy" @click="cloneDefault">Copiar régua padrão</Button>
                        <Button variant="secondary" icon="fas fa-plus" @click="rules.push(blankRule())">Criar do zero</Button>
                    </div>
                </div>

                <div v-else class="space-y-3">
                    <div v-for="(r, i) in rules" :key="i" class="surface-card p-4">
                        <RuleEditor :rule="r" @remove="rules.splice(i, 1)" />
                    </div>
                    <button @click="rules.push(blankRule())" class="text-sm text-accent hover:underline focus-ring rounded"><i class="fas fa-plus"></i> Adicionar regra</button>
                </div>
            </div>

            <div v-else class="rounded-xl border border-line bg-surface-sunken/50 p-4 text-sm text-ink-muted">
                <i class="fas fa-circle-info text-ink-subtle mr-1.5"></i>
                {{ mode === 'OFF' ? 'A cobrança automática fica desligada para este checklist.' : 'Este checklist usa a régua global. Para editá-la, vá em Cobrança (régua) no menu.' }}
            </div>
        </template>

        <template #footer>
            <Button variant="ghost" @click="emit('close')">Cancelar</Button>
            <Button :loading="saving" :disabled="loading" icon="fas fa-check" @click="save">Salvar</Button>
        </template>
    </Modal>
</template>
