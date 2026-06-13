<template>
    <section
        class="rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
        <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 class="flex items-center gap-2 font-display text-lg font-semibold text-slate-900 dark:text-white">
                <i class="fa-solid fa-user-pen text-indigo-500"></i>
                Quem pode editar
            </h2>
            <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                O autor e os administradores sempre podem editar. Adicione colegas internos que também poderão.
            </p>
        </div>

        <div class="space-y-3 p-5">
            <!-- Selecionados -->
            <div v-if="selected.length" class="flex flex-wrap gap-1.5">
                <span v-for="u in selected" :key="u.id"
                    class="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">
                    <i class="fa-solid fa-user text-[9px]"></i>
                    {{ u.username }}
                    <button type="button" class="ml-0.5 text-indigo-400 hover:text-rose-500" :title="`Remover ${u.username}`"
                        @click="remove(u.id)">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </span>
            </div>

            <!-- Busca -->
            <div class="relative">
                <div class="relative">
                    <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400"></i>
                    <input v-model="term" type="text" placeholder="Buscar por nome, e-mail ou cargo…"
                        @input="onInput" @focus="onInput" @blur="onBlur"
                        class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                </div>

                <Transition name="ate-pop">
                    <div v-if="open && results.length"
                        class="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                        <button v-for="u in results" :key="u.id" type="button" @mousedown.prevent="pick(u)"
                            class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                            <span class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                {{ initials(u.username) }}
                            </span>
                            <span class="font-medium text-slate-900 dark:text-slate-100">{{ u.username }}</span>
                            <span v-if="u.position" class="ml-auto truncate text-xs text-slate-400 dark:text-slate-500">
                                {{ u.position }}
                            </span>
                        </button>
                    </div>
                </Transition>
            </div>

            <p class="text-[11px] text-slate-500 dark:text-slate-400">
                <i class="fa-solid fa-circle-info mr-1"></i>
                Somente usuários internos podem ser editores.
            </p>
        </div>
    </section>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useAcademyKbAdminStore } from '@/stores/Academy/academyKbAdminStore';

const props = defineProps({
    // v-model: array de ids (números) dos editores.
    modelValue: { type: Array, default: () => [] },
    // seed: objetos {id, username, position} já conhecidos (modo edição).
    seed: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

const admin = useAcademyKbAdminStore();

const selected = ref([]);
const known = new Map(); // id -> {id, username, position}

function indexSeed() {
    for (const u of (props.seed || [])) {
        if (u && u.id != null) {
            known.set(Number(u.id), { id: Number(u.id), username: u.username || `#${u.id}`, position: u.position || '' });
        }
    }
}

function syncFromModel() {
    const ids = (props.modelValue || []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
    selected.value = ids.map((id) => known.get(id) || { id, username: `#${id}`, position: '' });
}

watch(() => props.seed, () => { indexSeed(); syncFromModel(); }, { immediate: true, deep: true });
watch(() => props.modelValue, () => syncFromModel(), { deep: true });

function initials(name) {
    return String(name || '?').slice(0, 2).toUpperCase();
}

// ── Busca (debounce) ──────────────────────────────────────────────────
const term = ref('');
const results = ref([]);
const open = ref(false);
let deb = null;

function onInput() {
    clearTimeout(deb);
    deb = setTimeout(async () => {
        const list = await admin.searchEditorCandidates(term.value);
        const sel = new Set((props.modelValue || []).map(Number));
        results.value = (Array.isArray(list) ? list : []).filter((u) => !sel.has(Number(u.id)));
        open.value = results.value.length > 0;
    }, 200);
}

function onBlur() {
    setTimeout(() => { open.value = false; }, 120);
}

function pick(u) {
    known.set(Number(u.id), { id: Number(u.id), username: u.username, position: u.position || '' });
    const ids = new Set((props.modelValue || []).map(Number));
    ids.add(Number(u.id));
    emit('update:modelValue', [...ids]);
    term.value = '';
    results.value = [];
    open.value = false;
}

function remove(id) {
    const ids = (props.modelValue || []).map(Number).filter((x) => x !== Number(id));
    emit('update:modelValue', ids);
}
</script>

<style scoped>
.ate-pop-enter-active,
.ate-pop-leave-active {
    transition: opacity .12s ease, transform .12s ease;
}

.ate-pop-enter-from,
.ate-pop-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}
</style>
