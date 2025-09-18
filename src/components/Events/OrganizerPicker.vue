<!-- OrganizerPicker.vue -->
<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    modelValue: { type: Array, default: () => [] }, // [{type:'user'|'external', id?, name, email?, position?}]
    users: { type: Array, default: () => [] }       // [{id, username, email, position}]
});

const emit = defineEmits(['update:modelValue']);

const query = ref('');

// campos para externo
const externalName = ref('');
const externalEmail = ref('');
const externalPosition = ref(''); // <— novo

const filteredUsers = computed(() => {
    const q = query.value.trim().toLowerCase();
    const base = props.users || [];
    const list = q
        ? base.filter(u =>
            (u.username || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.position || '').toLowerCase().includes(q)
        )
        : base;
    return list.slice(0, 8);
});

const addUser = (u) => {
    const exists = props.modelValue.some(o => o.type === 'user' && o.id === u.id);
    if (!exists) {
        const next = [
            ...props.modelValue,
            {
                type: 'user',
                id: u.id,
                name: u.username,
                email: u.email,
                position: u.position || undefined, // << snapshot do cargo
            }
        ];
        emit('update:modelValue', next);
    }
    query.value = '';
};

const addExternal = () => {
    const name = externalName.value.trim();
    const email = externalEmail.value.trim();
    const position = externalPosition.value.trim();
    if (!name) return;
    emit('update:modelValue', [
        ...props.modelValue,
        { type: 'external', name, email: email || undefined, position: position || undefined }
    ]);
    externalName.value = '';
    externalEmail.value = '';
    externalPosition.value = '';
};

const removeAt = (idx) => {
    const arr = [...props.modelValue];
    arr.splice(idx, 1);
    emit('update:modelValue', arr);
};

// ajuda a re-exibir cargo atualizado do user caso queira (fallback para snapshot salvo)
const resolveUser = (id) => (props.users || []).find(u => u.id === id);
const displayPosition = (o) => {
    if (o.type === 'user') {
        // prioriza cargo atual do store, senão usa o snapshot salvo
        return resolveUser(o.id)?.position || o.position;
    }
    return o.position;
};
</script>

<template>
    <div class="space-y-3"> 

        <!-- Selecionados -->
        <div v-if="modelValue.length" class="flex flex-wrap gap-2">
            <span v-for="(o, i) in modelValue" :key="i"
                class="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg border text-xs flex items-center gap-2">
                <i class="fas fa-user"></i>
                <span class="truncate max-w-56 font-semibold">
                    {{ o.name }}
                    <template v-if="displayPosition(o)">
                        <span class="opacity-70"> - {{ displayPosition(o) }}</span>
                    </template>
                    <template v-else-if="o.email">
                        <span class="opacity-70"> ({{ o.email }})</span>
                    </template>
                </span>
                <button @click="removeAt(i)" class="hover:text-red-500">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </span>
        </div>

        <!-- Buscar usuários -->
        <div class="relative">
            <input v-model="query" type="text" placeholder="Buscar organizador (nome, e-mail ou cargo)"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
            <div v-if="filteredUsers.length && query"
                class="absolute z-10 mt-1 bg-white dark:bg-gray-700 shadow rounded-lg w-full max-h-48 overflow-auto">
                <button v-for="u in filteredUsers" :key="u.id"
                    class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between"
                    @click="addUser(u)">
                    <span>
                        {{ u.username }}
                        <span v-if="u.email" class="text-gray-500 text-xs">— {{ u.email }}</span>
                    </span>
                    <span v-if="u.position"
                        class="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-200">
                        {{ u.position }}
                    </span>
                </button>
            </div>
        </div>

        <!-- Adicionar externo -->
        <div class="grid grid-cols-3 gap-2">
            <input v-model="externalName" type="text" placeholder="Nome externo"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
            <input v-model="externalEmail" type="email" placeholder="E-mail (opcional)"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
            <input v-model="externalPosition" type="text" placeholder="Cargo (opcional)"
                class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
        </div>
        <button class="px-3 py-2 bg-blue-600 text-white rounded-lg" @click="addExternal">
            Adicionar externo
        </button>
    </div>
</template>
