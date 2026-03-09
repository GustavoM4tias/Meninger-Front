<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    modelValue: {
        type: Object,
        default: () => ({ users: [], positions: [], emails: [] }),
    },
    users: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const userQuery = ref('');
const emailInput = ref('');
const posQuery = ref('');

const ensureMV = (mv) => ({
    users: Array.isArray(mv?.users) ? mv.users : [],
    positions: Array.isArray(mv?.positions) ? mv.positions : [],
    emails: Array.isArray(mv?.emails) ? mv.emails : [],
});

const mv = computed(() => ensureMV(props.modelValue));

const normalizeText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const inputBase =
    'w-full px-3.5 py-2.5 text-sm rounded-xl border outline-none transition bg-white dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 placeholder:text-gray-400';
const inputClass = `${inputBase} border-gray-200 dark:border-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15`;
const labelClass = 'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide';

const uniquePositions = computed(() => {
    const set = new Set((props.users || []).map((u) => u?.position).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
});

const filteredUsers = computed(() => {
    const q = normalizeText(userQuery.value);

    const list = !q
        ? props.users
        : props.users.filter((u) => {
            const haystack = normalizeText([u.username, u.email, u.position].filter(Boolean).join(' '));
            return haystack.includes(q);
        });

    return list
        .filter((u) => !mv.value.users.includes(u.id))
        .slice(0, 8);
});

const filteredPositions = computed(() => {
    const q = normalizeText(posQuery.value);

    const list = !q
        ? uniquePositions.value
        : uniquePositions.value.filter((p) => normalizeText(p).includes(q));

    return list
        .filter((p) => !mv.value.positions.includes(p))
        .slice(0, 8);
});

const modelUpdate = (partial) => {
    emit('update:modelValue', { ...mv.value, ...partial });
};

const resolveUser = (id) => props.users.find((u) => u.id === id);

const addUserId = (id) => {
    const set = new Set(mv.value.users);
    set.add(id);
    modelUpdate({ users: Array.from(set) });
    userQuery.value = '';
};

const removeUserId = (id) => {
    modelUpdate({ users: mv.value.users.filter((u) => u !== id) });
};

const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

const addEmail = () => {
    const email = emailInput.value.trim().toLowerCase();
    if (!email || !isValidEmail(email)) return;

    const set = new Set(mv.value.emails);
    set.add(email);
    modelUpdate({ emails: Array.from(set) });
    emailInput.value = '';
};

const removeEmail = (email) => {
    modelUpdate({ emails: mv.value.emails.filter((x) => x !== email) });
};

const addPosition = (position) => {
    const set = new Set(mv.value.positions);
    set.add(position);
    modelUpdate({ positions: Array.from(set) });
    posQuery.value = '';
};

const removePosition = (position) => {
    modelUpdate({ positions: mv.value.positions.filter((x) => x !== position) });
};
</script>

<template>
    <div class="space-y-5">
        <!-- Usuários -->
        <div class="space-y-2">
            <label :class="labelClass">Usuários</label>

            <div class="relative">
                <input v-model="userQuery" type="text" placeholder="Buscar usuário por nome, e-mail ou cargo"
                    :class="inputClass" />

                <div v-if="userQuery && filteredUsers.length"
                    class="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                    <div class="max-h-56 overflow-y-auto">
                        <button v-for="u in filteredUsers" :key="u.id" type="button"
                            @mousedown.prevent="addUserId(u.id)"
                            class="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {{ u.username }}
                                    </p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {{ u.email || 'Sem e-mail' }}
                                    </p>
                                </div>

                                <span v-if="u.position"
                                    class="shrink-0 text-[11px] px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                    {{ u.position }}
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="mv.users.length" class="flex flex-wrap gap-1.5">
                <span v-for="id in mv.users" :key="id"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                    <i class="fas fa-user text-[10px]"></i>
                    <span class="truncate max-w-56">
                        {{ resolveUser(id)?.username || `ID ${id}` }}
                        <span v-if="resolveUser(id)?.position" class="opacity-70">
                            - {{ resolveUser(id)?.position }}
                        </span>
                    </span>
                    <button type="button" @click="removeUserId(id)" class="hover:text-red-500 transition leading-none">
                        <i class="fas fa-times text-[10px]"></i>
                    </button>
                </span>
            </div>
        </div>

        <!-- Cargos -->
        <div class="space-y-2">
            <label :class="labelClass">Cargos</label>

            <div class="relative">
                <input v-model="posQuery" type="text" placeholder="Buscar cargo" :class="inputClass" />

                <div v-if="posQuery && filteredPositions.length"
                    class="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                    <div class="max-h-56 overflow-y-auto">
                        <button v-for="position in filteredPositions" :key="position" type="button"
                            @mousedown.prevent="addPosition(position)"
                            class="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {{ position }}
                            </p>
                        </button>
                    </div>
                </div>
            </div>

            <p class="text-[11px] text-gray-500 dark:text-gray-400">
                Todos os usuários com os cargos selecionados receberão notificação.
            </p>

            <div v-if="mv.positions.length" class="flex flex-wrap gap-1.5">
                <span v-for="position in mv.positions" :key="position"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300">
                    <i class="fas fa-id-badge text-[10px]"></i>
                    {{ position }}
                    <button type="button" @click="removePosition(position)"
                        class="hover:text-red-500 transition leading-none">
                        <i class="fas fa-times text-[10px]"></i>
                    </button>
                </span>
            </div>
        </div>

        <!-- Emails -->
        <div class="space-y-2">
            <label :class="labelClass">E-mails externos</label>

            <div class="flex gap-2">
                <input v-model="emailInput" type="email" placeholder="email@dominio.com" :class="inputClass + ' flex-1'"
                    @keydown.enter.prevent="addEmail" />

                <button type="button" @click="addEmail"
                    class="px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition shrink-0">
                    <i class="fas fa-plus text-xs"></i>
                </button>
            </div>

            <div v-if="mv.emails.length" class="flex flex-wrap gap-1.5">
                <span v-for="email in mv.emails" :key="email"
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                    <i class="fas fa-envelope text-[10px]"></i>
                    <span class="truncate max-w-64">{{ email }}</span>
                    <button type="button" @click="removeEmail(email)"
                        class="hover:text-red-500 transition leading-none">
                        <i class="fas fa-times text-[10px]"></i>
                    </button>
                </span>
            </div>
        </div>
    </div>
</template>