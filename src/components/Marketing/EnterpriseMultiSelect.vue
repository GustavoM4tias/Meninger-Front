<script setup>
// EnterpriseMultiSelect — multiselect de empreendimentos do CV.
// Carrega a lista do endpoint /api/marketing/cv-enterprises uma vez por sessão
// (cache em memória do módulo). UX inline (sem dropdown flutuante) pra evitar
// problemas de clipping dentro de modais.

import { computed, onMounted, ref } from 'vue';
import API_URL from '@/config/apiUrl';

const props = defineProps({
    modelValue: { type: Array, default: () => [] },  // [int] ids
    disabled: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue']);

// Cache compartilhado entre todas as instâncias do componente.
let cache = null;
let inflight = null;

async function fetchEnterprises() {
    if (cache) return cache;
    if (inflight) return inflight;
    inflight = (async () => {
        const token = localStorage.getItem('token');
        const r = await fetch(`${API_URL}/marketing/cv-enterprises`, {
            headers: {
                Authorization: token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json',
            },
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.ok) throw new Error(d?.error || 'Erro ao carregar empreendimentos.');
        cache = Array.isArray(d.results) ? d.results : [];
        return cache;
    })();
    try { return await inflight; }
    finally { inflight = null; }
}

const enterprises = ref([]);
const loading = ref(true);
const error = ref(null);
const search = ref('');
const expanded = ref(false);

onMounted(async () => {
    try {
        enterprises.value = await fetchEnterprises();
    } catch (e) {
        error.value = e.message;
    } finally {
        loading.value = false;
    }
});

const byId = computed(() => {
    const m = new Map();
    for (const e of enterprises.value) m.set(e.id, e);
    return m;
});

const selectedList = computed(() => {
    return (props.modelValue || [])
        .map(id => byId.value.get(id))
        .filter(Boolean);
});

const missingIds = computed(() => {
    return (props.modelValue || []).filter(id => !byId.value.has(id));
});

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return enterprises.value;
    return enterprises.value.filter(e => {
        const name = String(e.name || '').toLowerCase();
        const city = String(e.city || '').toLowerCase();
        return name.includes(q) || city.includes(q) || String(e.id).includes(q);
    });
});

function isSelected(id) { return (props.modelValue || []).includes(id); }

function toggle(id) {
    if (props.disabled) return;
    const cur = new Set(props.modelValue || []);
    if (cur.has(id)) cur.delete(id); else cur.add(id);
    emit('update:modelValue', [...cur]);
}

function remove(id) {
    if (props.disabled) return;
    emit('update:modelValue', (props.modelValue || []).filter(i => i !== id));
}

function clearAll() {
    if (props.disabled) return;
    emit('update:modelValue', []);
}
</script>

<template>
    <div :class="{ 'opacity-60 pointer-events-none': disabled }">
        <!-- Chips dos selecionados -->
        <div class="min-h-[36px] flex flex-wrap gap-1.5 mb-1.5">
            <span v-for="e in selectedList" :key="e.id"
                class="inline-flex items-center gap-1.5 rounded-md bg-accent/10 text-accent border border-accent/20 px-2 py-1 text-xs">
                <span class="font-medium">{{ e.name }}</span>
                <span v-if="e.city" class="text-ink-subtle text-[10px]">{{ e.city }}</span>
                <button type="button" @click="remove(e.id)" class="hover:text-red-500" aria-label="Remover">
                    <i class="fas fa-times text-[10px]"></i>
                </button>
            </span>
            <span v-for="id in missingIds" :key="`m-${id}`"
                class="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20 px-2 py-1 text-xs"
                title="ID não encontrado no CV (talvez tenha sido removido)">
                <i class="fas fa-circle-exclamation text-[10px]"></i>
                #{{ id }}
                <button type="button" @click="remove(id)" class="hover:text-red-500" aria-label="Remover">
                    <i class="fas fa-times text-[10px]"></i>
                </button>
            </span>
            <span v-if="!selectedList.length && !missingIds.length"
                class="text-xs text-ink-subtle italic self-center">Nenhum empreendimento selecionado</span>
        </div>

        <!-- Botão pra expandir/fechar -->
        <div class="flex items-center gap-2">
            <button type="button" @click="expanded = !expanded"
                class="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-hover transition-colors">
                <i :class="expanded ? 'fas fa-chevron-up' : 'fas fa-plus'" class="text-[10px]"></i>
                {{ expanded ? 'Fechar' : 'Selecionar empreendimentos' }}
            </button>
            <button v-if="selectedList.length || missingIds.length" type="button" @click="clearAll"
                class="text-xs text-ink-subtle hover:text-red-500 transition-colors">
                Limpar
            </button>
            <span class="text-[10px] text-ink-subtle ml-auto" v-if="!loading && !error">
                {{ enterprises.length }} empreendimentos no CV
            </span>
        </div>

        <!-- Painel inline -->
        <div v-if="expanded"
            class="mt-2 rounded-lg border border-line bg-surface-sunken/30 overflow-hidden">
            <!-- Busca -->
            <div class="px-2 pt-2 pb-1.5 border-b border-line/60 bg-surface">
                <input v-model="search" type="text" placeholder="Buscar por nome, cidade ou ID..."
                    class="w-full rounded border border-line bg-surface px-2.5 py-1.5 text-sm text-ink placeholder-ink-subtle focus:outline-none focus:border-accent/40" />
            </div>

            <!-- Estados -->
            <div v-if="loading" class="px-3 py-6 text-center text-xs text-ink-subtle">
                <i class="fas fa-circle-notch fa-spin mr-1"></i>Carregando empreendimentos...
            </div>
            <div v-else-if="error" class="px-3 py-4 text-center text-xs text-red-600 dark:text-red-300">
                <i class="fas fa-circle-exclamation mr-1"></i>{{ error }}
            </div>
            <div v-else-if="!filtered.length" class="px-3 py-4 text-center text-xs text-ink-subtle">
                Nenhum empreendimento encontrado.
            </div>

            <!-- Lista -->
            <div v-else class="max-h-56 overflow-y-auto divide-y divide-line/40">
                <label v-for="e in filtered" :key="e.id"
                    class="flex items-center gap-2 px-3 py-2 hover:bg-surface-hover/40 cursor-pointer text-sm">
                    <input type="checkbox" :checked="isSelected(e.id)" @change="toggle(e.id)" class="shrink-0" />
                    <span class="flex-1 min-w-0">
                        <span class="text-ink font-medium">{{ e.name }}</span>
                        <span v-if="e.city" class="text-ink-subtle text-xs"> · {{ e.city }}</span>
                        <span v-if="e.status" class="text-ink-subtle text-xs"> · {{ e.status }}</span>
                    </span>
                    <span class="text-[10px] font-mono text-ink-subtle shrink-0">#{{ e.id }}</span>
                </label>
            </div>
        </div>
    </div>
</template>
