<template>
    <section
        class="rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
        <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 class="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
                <i class="fa-solid fa-building-shield text-indigo-500"></i>
                Visibilidade
            </h2>
            <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Quem pode ver este conteúdo. Administradores sempre veem tudo.
            </p>
        </div>

        <div class="space-y-3 p-5">
            <!-- Modo: Geral × Departamentos -->
            <ul class="space-y-1.5">
                <li>
                    <label class="flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition"
                        :class="mode === 'GERAL' ? selClass : unselClass">
                        <input type="radio" :name="groupName" class="mt-0.5 h-4 w-4 accent-indigo-600" value="GERAL"
                            :checked="mode === 'GERAL'" @change="setMode('GERAL')" />
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-1.5">
                                <i class="fa-solid fa-globe text-xs text-sky-500"></i>
                                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">Geral</span>
                                <span
                                    class="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">todos</span>
                            </div>
                            <p class="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                                Todos os funcionários do Office veem este conteúdo.
                            </p>
                        </div>
                    </label>
                </li>
                <li>
                    <label class="flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition"
                        :class="mode === 'DEPARTMENTS' ? selClass : unselClass">
                        <input type="radio" :name="groupName" class="mt-0.5 h-4 w-4 accent-indigo-600"
                            value="DEPARTMENTS" :checked="mode === 'DEPARTMENTS'" @change="setMode('DEPARTMENTS')" />
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-1.5">
                                <i class="fa-solid fa-building-user text-xs text-indigo-500"></i>
                                <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">Departamentos
                                    específicos</span>
                            </div>
                            <p class="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                                Só os departamentos selecionados (e administradores) veem.
                            </p>
                        </div>
                    </label>
                </li>
            </ul>

            <!-- Lista de departamentos (modo específico) -->
            <div v-if="mode === 'DEPARTMENTS'" class="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div v-if="loading" class="py-3 text-center text-xs text-slate-400 dark:text-slate-500">
                    <i class="fa-solid fa-spinner fa-spin mr-1"></i> Carregando departamentos…
                </div>
                <div v-else-if="!departments.length" class="py-3 text-center text-xs text-slate-400 dark:text-slate-500">
                    Nenhum departamento cadastrado.
                </div>
                <div v-else class="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <label v-for="d in departments" :key="d.id"
                        class="flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition"
                        :class="isSelected(d.id) ? selClass : unselClass">
                        <input type="checkbox" class="h-4 w-4 accent-indigo-600" :checked="isSelected(d.id)"
                            @change="toggle(d.id)" />
                        <span class="truncate text-slate-800 dark:text-slate-200">{{ d.name }}</span>
                    </label>
                </div>
            </div>

            <!-- feedback -->
            <p v-if="mode === 'DEPARTMENTS' && !selectedIds.length"
                class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                <i class="fa-solid fa-circle-exclamation mr-1"></i>
                Nenhum departamento selecionado — equivale a <strong>Geral</strong> (todos veem).
            </p>
            <p v-else-if="mode === 'DEPARTMENTS'"
                class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <i class="fa-solid fa-lock mr-1"></i>
                Restrito a {{ selectedIds.length }} departamento(s) — fora deles, ninguém vê (exceto admin).
            </p>
        </div>
    </section>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

// v-model = ARRAY de ids de departamento. [] = GERAL (todos veem).
const props = defineProps({
    modelValue: { type: Array, default: () => [] },
    // permite mais de um seletor na mesma página sem colidir o name do radio
    groupName: { type: String, default: 'dept-visibility' },
});
const emit = defineEmits(['update:modelValue']);

const selClass = 'border-indigo-300 bg-indigo-50/70 dark:border-indigo-700 dark:bg-indigo-950/40';
const unselClass = 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800 dark:hover:bg-indigo-950/20';

const departments = ref([]);
const loading = ref(false);

const selectedIds = computed(() =>
    Array.isArray(props.modelValue) ? props.modelValue.map(Number).filter(Number.isFinite) : []
);

const mode = ref(selectedIds.value.length ? 'DEPARTMENTS' : 'GERAL');

// Se o valor mudar de fora (ex.: ao carregar um artigo existente), alinha o modo.
watch(() => props.modelValue, () => {
    if (selectedIds.value.length && mode.value !== 'DEPARTMENTS') mode.value = 'DEPARTMENTS';
});

function isSelected(id) {
    return selectedIds.value.includes(Number(id));
}

function setMode(m) {
    mode.value = m;
    if (m === 'GERAL') emit('update:modelValue', []);
    // DEPARTMENTS: mantém a seleção atual (pode estar vazia → mostra aviso).
}

function toggle(id) {
    const n = Number(id);
    const set = new Set(selectedIds.value);
    if (set.has(n)) set.delete(n); else set.add(n);
    emit('update:modelValue', [...set]);
}

async function fetchDepartments() {
    if (departments.value.length || loading.value) return;
    loading.value = true;
    try {
        const data = await requestWithAuth('/academy/departments');
        departments.value = Array.isArray(data?.results) ? data.results : [];
    } catch (_) {
        departments.value = [];
    } finally {
        loading.value = false;
    }
}

onMounted(fetchDepartments);
</script>
