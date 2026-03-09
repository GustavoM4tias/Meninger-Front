<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    modelValue: { type: Array, default: () => [] },
    users: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const query = ref('');
const externalName = ref('');
const externalEmail = ref('');
const externalPosition = ref('');

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

const filteredUsers = computed(() => {
    const q = normalizeText(query.value);
    const selectedIds = new Set(
        (props.modelValue || [])
            .filter((o) => o.type === 'user')
            .map((o) => o.id)
    );

    const base = !q
        ? props.users
        : props.users.filter((u) => {
            const haystack = normalizeText([u.username, u.email, u.position].filter(Boolean).join(' '));
            return haystack.includes(q);
        });

    return base
        .filter((u) => !selectedIds.has(u.id))
        .slice(0, 8);
});

const addUser = (u) => {
    const exists = props.modelValue.some((o) => o.type === 'user' && o.id === u.id);
    if (exists) return;

    emit('update:modelValue', [
        ...props.modelValue,
        {
            type: 'user',
            id: u.id,
            name: u.username,
            email: u.email,
            position: u.position || undefined,
        },
    ]);

    query.value = '';
};

const addExternal = () => {
    const name = externalName.value.trim();
    const email = externalEmail.value.trim();
    const position = externalPosition.value.trim();

    if (!name) return;

    emit('update:modelValue', [
        ...props.modelValue,
        {
            type: 'external',
            name,
            email: email || undefined,
            position: position || undefined,
        },
    ]);

    externalName.value = '';
    externalEmail.value = '';
    externalPosition.value = '';
};

const removeAt = (idx) => {
    const next = [...props.modelValue];
    next.splice(idx, 1);
    emit('update:modelValue', next);
};

const resolveUser = (id) => (props.users || []).find((u) => u.id === id);

const displayPosition = (o) => {
    if (o.type === 'user') return resolveUser(o.id)?.position || o.position;
    return o.position;
};

const displayEmail = (o) => {
    if (o.type === 'user') return resolveUser(o.id)?.email || o.email;
    return o.email;
};
</script>

<template>
    <div class="space-y-5">
        <!-- Selecionados -->
        <div v-if="modelValue.length" class="flex flex-wrap gap-1.5">
            <span v-for="(o, i) in modelValue" :key="i"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                <i class="fas fa-user text-[10px]"></i>

                <span class="truncate max-w-64">
                    {{ o.name }}
                    <span v-if="displayPosition(o)" class="opacity-70"> - {{ displayPosition(o) }}</span>
                    <span v-else-if="displayEmail(o)" class="opacity-70"> ({{ displayEmail(o) }})</span>
                </span>

                <button type="button" @click="removeAt(i)" class="hover:text-red-500 transition leading-none">
                    <i class="fas fa-times text-[10px]"></i>
                </button>
            </span>
        </div>

        <!-- Buscar usuários -->
        <div class="space-y-2">
            <label :class="labelClass">Usuários internos</label>

            <div class="relative">
                <input v-model="query" type="text" placeholder="Buscar organizador por nome, e-mail ou cargo"
                    :class="inputClass" />

                <div v-if="query && filteredUsers.length"
                    class="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
                    <div class="max-h-56 overflow-y-auto">
                        <button v-for="u in filteredUsers" :key="u.id" type="button" @mousedown.prevent="addUser(u)"
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
        </div>

        <!-- Externo -->
        <div class="space-y-2">
            <label :class="labelClass">Organizador externo</label>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input v-model="externalName" type="text" placeholder="Nome" :class="inputClass" />
                <input v-model="externalEmail" type="email" placeholder="E-mail (opcional)" :class="inputClass" />
                <input v-model="externalPosition" type="text" placeholder="Cargo (opcional)" :class="inputClass" />
            </div>

            <div class="flex justify-end">
                <button type="button" @click="addExternal"
                    class="px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition">
                    Adicionar externo
                </button>
            </div>
        </div>
    </div>
</template>