<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useChecklistStore } from '@/stores/Checklist/checklistStore.js';
import RuleEditor from './RuleEditor.vue';

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

const btnPrimary = 'px-4 py-2 text-sm bg-accent hover:bg-accent-hover text-white rounded-lg focus-ring disabled:opacity-60';
</script>

<template>
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" @click.self="emit('close')">
        <div class="bg-surface-overlay border border-line rounded-2xl shadow-overlay w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5 animate-scale-in">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-ink flex items-center gap-2"><i class="fas fa-bell text-amber-500"></i> Cobrança deste checklist</h3>
                <button @click="emit('close')" class="text-ink-subtle hover:text-ink focus-ring rounded"><i class="fas fa-times"></i></button>
            </div>

            <div v-if="loading" class="text-center text-ink-subtle py-10"><i class="fas fa-spinner fa-spin"></i></div>

            <template v-else>
                <!-- Modo -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                    <button v-for="m in MODES" :key="m.v" @click="mode = m.v"
                        class="text-left p-3 rounded-xl border transition focus-ring"
                        :class="mode === m.v ? 'border-accent bg-accent-soft/40' : 'border-line hover:bg-surface-sunken'">
                        <p class="font-semibold text-ink text-sm">{{ m.l }}</p>
                        <p class="text-xs text-ink-muted mt-0.5">{{ m.d }}</p>
                    </button>
                </div>

                <!-- Régua personalizada -->
                <div v-if="mode === 'CUSTOM'">
                    <div v-if="!rules.length" class="surface-card p-4 text-center mb-3">
                        <p class="text-sm text-ink-muted mb-3">Sem régua própria ainda. Comece copiando a régua padrão ou crie do zero.</p>
                        <div class="flex justify-center gap-2">
                            <button @click="cloneDefault" :disabled="saving" :class="btnPrimary"><i class="fas fa-copy"></i> Copiar régua padrão</button>
                            <button @click="rules.push(blankRule())" class="px-4 py-2 text-sm border border-line rounded-lg text-ink-muted hover:bg-surface-sunken focus-ring"><i class="fas fa-plus"></i> Criar do zero</button>
                        </div>
                    </div>

                    <div v-else class="space-y-3">
                        <div v-for="(r, i) in rules" :key="i" class="surface-card p-4">
                            <RuleEditor :rule="r" @remove="rules.splice(i, 1)" />
                        </div>
                        <button @click="rules.push(blankRule())" class="text-sm text-accent hover:underline"><i class="fas fa-plus"></i> Adicionar regra</button>
                    </div>
                </div>

                <div v-else class="text-sm text-ink-muted py-2">
                    {{ mode === 'OFF' ? 'A cobrança automática fica desligada para este checklist.' : 'Este checklist usa a régua global. Para editá-la, vá em Cobrança (régua) no menu.' }}
                </div>

                <div class="flex justify-end gap-2 mt-5 pt-3 border-t border-line">
                    <button @click="emit('close')" class="px-4 py-2 text-sm text-ink-muted hover:text-ink focus-ring rounded-lg">Cancelar</button>
                    <button @click="save" :disabled="saving" :class="btnPrimary"><i v-if="saving" class="fas fa-spinner fa-spin"></i> Salvar</button>
                </div>
            </template>
        </div>
    </div>
</template>
