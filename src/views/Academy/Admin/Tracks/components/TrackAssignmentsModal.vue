<template>
    <dialog v-if="open" open class="fixed inset-0 z-50">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50" @click="close"></div>

        <!-- Center -->
        <div class="fixed inset-0 flex min-h-full items-center justify-center p-4" @click.stop>
            <!-- Card (stop click aqui) -->
            <div class="w-full max-w-6xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
                @click.stop role="dialog" aria-modal="true">
                <header
                    class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
                    <div class="min-w-0">
                        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Vincular trilha</h2>
                        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Selecione por Cargo, Departamento, Cidade e/ou Usuários. O admin sempre pode vincular
                            usuários.
                        </p>
                    </div>

                    <button class="rounded-lg px-2 py-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        @click="close" aria-label="Fechar" title="Fechar">
                        ✕
                    </button>
                </header>

                <section class="p-6 space-y-4 max-h-[75vh] overflow-auto">
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <label class="md:col-span-6">
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Buscar (Cargos/Deptos/Cidades)
                            </div>
                            <input v-model="qLocal"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                placeholder="Filtrar listas..." />
                        </label>

                        <label class="md:col-span-6">
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Buscar Usuários</div>
                            <input v-model="qUser"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                placeholder="Nome, email..." />
                        </label>
                    </div>

                    <div v-if="loadingMeta" class="text-sm text-slate-500 dark:text-slate-400">
                        Carregando metadados...
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <!-- POSITIONS -->
                        <div
                            class="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div
                                class="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <div class="text-sm font-semibold text-slate-900 dark:text-white">
                                    Cargos 
                                </div>
                                <button class="text-sm text-slate-700 dark:text-slate-200 hover:underline"
                                    @click="clearSet('POSITION')">
                                    Limpar
                                </button>
                            </div>

                            <div class="p-3 space-y-2 max-h-[320px] overflow-auto">
                                <label v-for="p in filteredPositions" :key="`pos-${p.code}`"
                                    class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                                    <input type="checkbox" :checked="selectedPositions.has(String(p.code))"
                                        @change="toggle('POSITION', String(p.code))" />
                                    <div class="min-w-0">
                                        <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{{
                                            p.name }}</div>
                                        <div class="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                                            code={{ p.code }} | dep={{ p.department_id ?? '-' }}
                                        </div>
                                    </div>
                                </label>

                                <div v-if="!filteredPositions.length"
                                    class="text-sm text-slate-500 dark:text-slate-400 p-4">
                                    Nenhum cargo.
                                </div>
                            </div>
                        </div>

                        <!-- DEPARTMENTS -->
                        <div
                            class="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div
                                class="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <div class="text-sm font-semibold text-slate-900 dark:text-white">
                                    Departamentos  
                                </div>
                                <button class="text-sm text-slate-700 dark:text-slate-200 hover:underline"
                                    @click="clearSet('DEPARTMENT')">
                                    Limpar
                                </button>
                            </div>

                            <div class="p-3 space-y-2 max-h-[320px] overflow-auto">
                                <label v-for="d in filteredDepartments" :key="`dep-${d.id}`"
                                    class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                                    <input type="checkbox" :checked="selectedDepartments.has(String(d.id))"
                                        @change="toggle('DEPARTMENT', String(d.id))" />
                                    <div class="min-w-0">
                                        <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{{
                                            d.name }}</div>
                                        <div class="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                                            id={{ d.id }} | code={{ d.code }}
                                        </div>
                                    </div>
                                </label>

                                <div v-if="!filteredDepartments.length"
                                    class="text-sm text-slate-500 dark:text-slate-400 p-4">
                                    Nenhum departamento.
                                </div>
                            </div>
                        </div>

                        <!-- CITIES -->
                        <div
                            class="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div
                                class="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <div class="text-sm font-semibold text-slate-900 dark:text-white">
                                    Cidades 
                                </div>
                                <button class="text-sm text-slate-700 dark:text-slate-200 hover:underline"
                                    @click="clearSet('CITY')">
                                    Limpar
                                </button>
                            </div>

                            <div class="p-3 space-y-2 max-h-[320px] overflow-auto">
                                <label v-for="c in filteredCities" :key="`city-${c.id}`"
                                    class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                                    <input type="checkbox" :checked="selectedCities.has(String(c.id))"
                                        @change="toggle('CITY', String(c.id))" />
                                    <div class="min-w-0">
                                        <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                            {{ c.name }}<span v-if="c.uf">/{{ c.uf }}</span>
                                        </div>
                                        <div class="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">id={{
                                            c.id }}</div>
                                    </div>
                                </label>

                                <div v-if="!filteredCities.length"
                                    class="text-sm text-slate-500 dark:text-slate-400 p-4">
                                    Nenhuma cidade.
                                </div>
                            </div>
                        </div>

                        <!-- USERS -->
                        <div
                            class="lg:col-span-12 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div
                                class="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                <div class="text-sm font-semibold text-slate-900 dark:text-white">
                                    Usuários 
                                </div>
                                <button class="text-sm text-slate-700 dark:text-slate-200 hover:underline"
                                    @click="clearSet('USER')">
                                    Limpar
                                </button>
                            </div>

                            <div class="p-3 space-y-2 max-h-[360px] overflow-auto">
                                <div v-if="loadingUsers" class="text-sm text-slate-500 dark:text-slate-400 p-4">
                                    Carregando usuários...
                                </div>

                                <div v-else-if="!filteredUsers.length"
                                    class="text-sm text-slate-500 dark:text-slate-400 p-4">
                                    Nenhum usuário.
                                </div>

                                <label v-else v-for="u in filteredUsers" :key="`user-${u.id}`"
                                    class="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                                    <input type="checkbox" :checked="selectedUsers.has(String(u.id))"
                                        @change="toggle('USER', String(u.id))" />
                                    <div class="min-w-0">
                                        <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                            {{ u.username }}
                                            <span class="text-xs font-mono text-slate-500">({{ u.role }})</span>
                                        </div>
                                        <div class="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                                            {{ u.email }} | {{ u.position || '-' }} | {{ u.city || '-' }}
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div v-if="error"
                        class="rounded-2xl border border-rose-200 dark:border-rose-900/50 p-4 text-sm text-rose-700 dark:text-rose-400">
                        {{ error }}
                    </div>
                </section>

                <footer
                    class="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div class="text-xs text-slate-500 dark:text-slate-400">
                        Total selecionados: <span class="font-mono">{{ totalSelected }}</span>
                    </div>

                    <div class="flex justify-end gap-2">
                        <button
                            class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                            @click="close">
                            Cancelar
                        </button>

                        <button
                            class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                            :disabled="saving || totalSelected === 0" @click="apply">
                            {{ saving ? 'Aplicando...' : 'Aplicar vínculos' }}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    </dialog>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { useAcademyAdminMetaStore } from '@/stores/Academy/academyAdminMetaStore';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const props = defineProps({
    open: { type: Boolean, default: false },
    trackSlug: { type: String, required: true },
});
const emit = defineEmits(['update:open', 'changed']);

const meta = useAcademyAdminMetaStore();

const qLocal = ref('');
const qUser = ref('');

const saving = ref(false);
const loadingMeta = ref(false);
const loadingUsers = ref(false);
const error = ref(null);

const selectedPositions = ref(new Set());
const selectedDepartments = ref(new Set());
const selectedCities = ref(new Set());
const selectedUsers = ref(new Set());

function close() {
    emit('update:open', false);
}

function lockBodyScroll(lock) {
    const el = document.documentElement;
    if (lock) el.classList.add('overflow-hidden');
    else el.classList.remove('overflow-hidden');
}

function onKeyDown(e) {
    if (e.key === 'Escape') close();
}

watch(
    () => props.open,
    async (v) => {
        error.value = null;

        if (v) {
            lockBodyScroll(true);
            window.addEventListener('keydown', onKeyDown);

            selectedPositions.value = new Set();
            selectedDepartments.value = new Set();
            selectedCities.value = new Set();
            selectedUsers.value = new Set();

            qLocal.value = '';
            qUser.value = '';

            loadingMeta.value = true;
            try {
                if (!meta.positions.length || !meta.departments.length || !meta.cities.length) {
                    await meta.fetchMeta();
                }
            } finally {
                loadingMeta.value = false;
            }

            // lista inicial (vazia) no open
            await fetchUsers('');
        } else {
            lockBodyScroll(false);
            window.removeEventListener('keydown', onKeyDown);
        }
    }
);

onBeforeUnmount(() => {
    lockBodyScroll(false);
    window.removeEventListener('keydown', onKeyDown);
});

let userTmr = null;
watch(
    () => qUser.value,
    (term) => {
        if (!props.open) return;
        clearTimeout(userTmr);
        userTmr = setTimeout(() => fetchUsers(term), 250);
    }
);

async function fetchUsers(term) {
    loadingUsers.value = true;
    try {
        await meta.searchUsers(String(term || ''));
    } finally {
        loadingUsers.value = false;
    }
}

function toggle(type, value) {
    const v = String(value);

    const map = {
        POSITION: selectedPositions,
        DEPARTMENT: selectedDepartments,
        CITY: selectedCities,
        USER: selectedUsers,
    };

    const refSet = map[type];
    const next = new Set(refSet.value);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    refSet.value = next;
}

function clearSet(type) {
    if (type === 'POSITION') selectedPositions.value = new Set();
    if (type === 'DEPARTMENT') selectedDepartments.value = new Set();
    if (type === 'CITY') selectedCities.value = new Set();
    if (type === 'USER') selectedUsers.value = new Set();
}

function filterLocalList(arr, getLabel, getSub) {
    const term = String(qLocal.value || '').trim().toLowerCase();
    const base = Array.isArray(arr) ? arr : [];
    if (!term) return base;

    return base.filter((it) => {
        const l = String(getLabel(it) || '').toLowerCase();
        const s = String(getSub(it) || '').toLowerCase();
        return l.includes(term) || s.includes(term);
    });
}

const filteredPositions = computed(() =>
    filterLocalList(meta.positions || [], (p) => p.name, (p) => `code=${p.code} dep=${p.department_id ?? ''}`)
);

const filteredDepartments = computed(() =>
    filterLocalList(meta.departments || [], (d) => d.name, (d) => `id=${d.id} code=${d.code ?? ''}`)
);

const filteredCities = computed(() =>
    filterLocalList(meta.cities || [], (c) => `${c.name}${c.uf ? '/' + c.uf : ''}`, (c) => `id=${c.id}`)
);

const filteredUsers = computed(() => {
    const term = String(qUser.value || '').trim().toLowerCase();
    const arr = meta.usersSearch || [];
    if (!term) return arr;

    return arr.filter((u) => {
        const hay = `${u.username || ''} ${u.email || ''} ${u.position || ''} ${u.city || ''}`.toLowerCase();
        return hay.includes(term);
    });
});

const totalSelected = computed(
    () =>
        selectedPositions.value.size +
        selectedDepartments.value.size +
        selectedCities.value.size +
        selectedUsers.value.size
);

async function bulk(scopeType, setRef) {
    const scopeValues = Array.from(setRef.value || []);
    if (!scopeValues.length) return;

    await requestWithAuth(`/academy/tracks-admin/${encodeURIComponent(props.trackSlug)}/assignments/bulk`, {
        method: 'POST',
        body: JSON.stringify({
            scopeType,
            scopeValues,
            required: true, // fixo (não aparece mais na UI)
        }),
    });
}

async function apply() {
    saving.value = true;
    error.value = null;

    try {
        await bulk('POSITION', selectedPositions);
        await bulk('DEPARTMENT', selectedDepartments);
        await bulk('CITY', selectedCities);
        await bulk('USER', selectedUsers);

        emit('changed');
        close();
    } catch (e) {
        error.value = e?.message || 'Erro ao aplicar vínculos.';
        throw e;
    } finally {
        saving.value = false;
    }
}
</script>
