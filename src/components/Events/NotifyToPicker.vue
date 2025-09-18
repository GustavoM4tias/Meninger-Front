<!-- NotifyToPicker.vue -->
<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    // Agora aceitamos também positions no modelValue
    modelValue: { type: Object, default: () => ({ users: [], positions: [], emails: [] }) },
    // users = [{ id, username, email, position }]
    users: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue']);

const userQuery = ref('');
const emailInput = ref('');
const posQuery = ref('');

// ---------- Helpers ----------
const ensureMV = (mv) => ({
    users: mv?.users ?? [],
    positions: mv?.positions ?? [],
    emails: mv?.emails ?? [],
});

const mv = computed(() => ensureMV(props.modelValue));

// Lista de cargos únicos (limpa nulos, tira repetidos, ordena)
const uniquePositions = computed(() => {
    const set = new Set((props.users || []).map(u => u?.position).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
});

const filteredUsers = computed(() => {
    const q = userQuery.value.trim().toLowerCase();
    const list = q
        ? props.users.filter(u =>
            (u.username || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q)
        )
        : props.users;
    return list.slice(0, 8);
});

const filteredPositions = computed(() => {
    const q = posQuery.value.trim().toLowerCase();
    const list = uniquePositions.value.filter(p => p.toLowerCase().includes(q));
    return list.slice(0, 8);
});

const modelUpdate = (partial) => {
    const next = { ...mv.value, ...partial };
    emit('update:modelValue', next);
};

// ---------- Users ----------
const addUserId = (id) => {
    const set = new Set(mv.value.users);
    set.add(id);
    modelUpdate({ users: Array.from(set) });
    userQuery.value = '';
};
const removeUserId = (id) => {
    modelUpdate({ users: mv.value.users.filter(u => u !== id) });
};

// Resolve dados do usuário a partir do id (para mostrar nome/cargo em vez do ID)
const resolveUser = (id) => props.users.find(u => u.id === id);

// ---------- Emails ----------
const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

const addEmail = () => {
    const email = emailInput.value.trim();
    if (!email || !isValidEmail(email)) return;
    const set = new Set(mv.value.emails);
    set.add(email);
    modelUpdate({ emails: Array.from(set) });
    emailInput.value = '';
};
const removeEmail = (e) => {
    modelUpdate({ emails: mv.value.emails.filter(x => x !== e) });
};

// ---------- Positions ----------
const addPosition = (p) => {
    const set = new Set(mv.value.positions);
    set.add(p);
    modelUpdate({ positions: Array.from(set) });
    posQuery.value = '';
};
const removePosition = (p) => {
    modelUpdate({ positions: mv.value.positions.filter(x => x !== p) });
};
</script>

<template>
    <div class="space-y-6">
        <label class="text-sm font-medium">Destinatários das notificações</label>

        <!-- Usuários do sistema -->
        <div>
            <p class="text-xs text-gray-500 mb-1">Usuários do sistema</p>
            <div class="relative">
                <input v-model="userQuery" type="text" placeholder="Buscar usuário (nome ou e-mail)"
                    class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
                <div v-if="userQuery && filteredUsers.length"
                    class="absolute z-10 bg-gray-100 dark:bg-gray-600 shadow rounded-lg w-full max-h-52 overflow-auto">
                    <button v-for="u in filteredUsers" :key="u.id"
                        class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between"
                        @click="addUserId(u.id)">
                        <span>
                            {{ u.username }}
                            <span v-if="u.email" class="text-gray-400 text-xs">- {{ u.email }}</span>
                        </span>
                        <span v-if="u.position"
                            class="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-200">
                            {{ u.position }}
                        </span>
                    </button>
                </div>
            </div>

            <!-- Chips de usuários selecionados -->
            <div class="mt-2 flex flex-wrap gap-2" v-if="mv.users.length">
                <span v-for="id in mv.users" :key="id"
                    class="px-2 py-1 bg-green-50 text-green-700 rounded-lg border text-xs flex items-center gap-2">
                    <i class="fas fa-user"></i>
                    <span class="truncate max-w-48">
                        {{ resolveUser(id)?.username || ('ID ' + id) }}
                        <span v-if="resolveUser(id)?.position" class="opacity-70"> - {{ resolveUser(id)?.position
                            }}</span>
                    </span>
                    <button @click="removeUserId(id)" class="hover:text-red-500">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </span>
            </div>
        </div>

        <!-- Cargos (positions) -->
        <div>
            <p class="text-xs text-gray-500 mb-1">Cargos (todos os usuários com estes cargos serão notificados)</p>
            <div class="relative">
                <input v-model="posQuery" type="text" placeholder="Buscar cargo (ex.: Vendedor, Gerente...)"
                    class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors" />
                <div v-if="filteredPositions.length && posQuery"
                    class="absolute z-10 bg-gray-100 dark:bg-gray-600 shadow rounded-lg w-full max-h-52 overflow-auto">
                    <button v-for="p in filteredPositions" :key="p"
                        class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600"
                        @click="addPosition(p)">
                        <i class="fas fa-id-badge mr-2"></i>{{ p }}
                    </button>
                </div>
            </div>

            <!-- Chips de cargos selecionados -->
            <div class="mt-2 flex flex-wrap gap-2" v-if="mv.positions.length">
                <span v-for="p in mv.positions" :key="p"
                    class="px-2 py-1 bg-sky-50 text-sky-700 rounded-lg border text-xs flex items-center gap-2">
                    <i class="fas fa-users"></i>{{ p }}
                    <button @click="removePosition(p)" class="hover:text-red-500">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </span>
            </div>
        </div>

        <!-- E-mails externos -->
        <div>
            <p class="text-xs text-gray-500 mb-1">E-mails externos</p>
            <div class="flex gap-2">
                <input v-model="emailInput" type="email" placeholder="email@dominio.com"
                    class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors"
                    @keyup.enter="addEmail" />
                <button class="px-3 py-2 bg-blue-600 text-white rounded-xl" @click="addEmail">Adicionar</button>
            </div>
            <div class="mt-2 flex flex-wrap gap-2" v-if="mv.emails.length">
                <span v-for="e in mv.emails" :key="e"
                    class="px-2 py-1 bg-purple-50 text-purple-700 rounded-lg border text-xs flex items-center gap-2">
                    <i class="fas fa-envelope"></i>{{ e }}
                    <button @click="removeEmail(e)" class="hover:text-red-500">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </span>
            </div>
        </div>
    </div>
</template>
