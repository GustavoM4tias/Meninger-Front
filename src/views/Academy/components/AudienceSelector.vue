<template>
    <section
        class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 class="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <i class="fa-solid fa-shield-halved text-indigo-500"></i>
                Visibilidade
            </h2>
            <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Quem pode enxergar este conteúdo. Selecione um ou mais públicos.
            </p>
        </div>
        <div class="space-y-3 p-5">
            <!-- presets rápidos -->
            <div class="flex flex-wrap gap-1.5">
                <button v-for="p in PRESETS" :key="p.key" type="button" @click="applyPreset(p)"
                    class="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition"
                    :class="presetActive(p)
                        ? 'border-indigo-300 bg-indigo-100 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40'">
                    {{ p.label }}
                </button>
            </div>

            <!-- tokens (checkbox-chips) -->
            <ul class="space-y-1.5">
                <li v-for="t in OPTIONS" :key="t.value">
                    <label
                        class="flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition"
                        :class="isSelected(t.value)
                            ? 'border-indigo-300 bg-indigo-50/70 dark:border-indigo-700 dark:bg-indigo-950/40'
                            : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20'">
                        <input type="checkbox" class="mt-0.5 h-4 w-4 accent-indigo-600"
                            :checked="isSelected(t.value)" @change="toggle(t.value)" />
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-1.5">
                                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {{ t.label }}
                                </span>
                                <span class="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                                    :class="t.tint">
                                    {{ t.value }}
                                </span>
                            </div>
                            <p class="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                                {{ t.hint }}
                            </p>
                        </div>
                    </label>
                </li>
            </ul>

            <!-- feedback -->
            <p v-if="!localValue.length"
                class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <i class="fa-solid fa-circle-exclamation mr-1"></i>
                Sem público selecionado, ninguém verá o conteúdo. Selecione pelo menos um.
            </p>
            <p v-else
                class="text-[11px] text-slate-500 dark:text-slate-400">
                <i class="fa-solid fa-eye mr-1"></i>
                Vai aparecer para: <strong>{{ summary }}</strong>.
            </p>
        </div>
    </section>
</template>

<script setup>
import { computed, watch, ref } from 'vue';

// Os mesmos tokens do backend (services/academy/audience.js).
const OPTIONS = [
    {
        value: 'INTERNAL',
        label: 'Funcionários Menin',
        hint: 'Todos os colaboradores internos da Menin (com login Office).',
        tint: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    },
    {
        value: 'GESTOR',
        label: 'Gestores',
        hint: 'Internos com cargo de gestão (gerente / diretor / coordenador).',
        tint: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    },
    {
        value: 'BROKER',
        label: 'Corretores',
        hint: 'Corretores externos cadastrados via CVCRM.',
        tint: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
    {
        value: 'REALESTATE',
        label: 'Imobiliárias',
        hint: 'Imobiliárias parceiras (login externo).',
        tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    },
    {
        value: 'CORRESPONDENT',
        label: 'Correspondentes',
        hint: 'Correspondentes bancários parceiros.',
        tint: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    },
    {
        value: 'ADMIN',
        label: 'Apenas administradores',
        hint: 'Conteúdo sensível — só quem tem role=admin enxerga.',
        tint: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    },
];

const PRESETS = [
    {
        key: 'all', label: 'Todos os públicos',
        value: ['INTERNAL', 'GESTOR', 'BROKER', 'REALESTATE', 'CORRESPONDENT'],
    },
    {
        key: 'internal', label: 'Só interno',
        value: ['INTERNAL', 'GESTOR'],
    },
    {
        key: 'external', label: 'Só externo',
        value: ['BROKER', 'REALESTATE', 'CORRESPONDENT'],
    },
    {
        key: 'gestor', label: 'Só gestor',
        value: ['GESTOR'],
    },
    {
        key: 'admin', label: 'Só admin',
        value: ['ADMIN'],
    },
];

const props = defineProps({
    modelValue: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

const localValue = ref(Array.isArray(props.modelValue) ? props.modelValue.slice() : []);

watch(() => props.modelValue, (v) => {
    const next = Array.isArray(v) ? v.slice() : [];
    if (JSON.stringify(next) !== JSON.stringify(localValue.value)) {
        localValue.value = next;
    }
});

function emitUpdate() {
    emit('update:modelValue', localValue.value.slice());
}

function isSelected(token) {
    return localValue.value.includes(token);
}

function toggle(token) {
    const i = localValue.value.indexOf(token);
    if (i >= 0) localValue.value.splice(i, 1);
    else localValue.value.push(token);
    emitUpdate();
}

function applyPreset(p) {
    localValue.value = p.value.slice();
    emitUpdate();
}

function presetActive(p) {
    const a = [...localValue.value].sort().join(',');
    const b = [...p.value].sort().join(',');
    return a === b && a.length > 0;
}

const summary = computed(() => {
    if (!localValue.value.length) return 'ninguém';
    return localValue.value
        .map(v => OPTIONS.find(o => o.value === v)?.label || v)
        .join(', ');
});
</script>
