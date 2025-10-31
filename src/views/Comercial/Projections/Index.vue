<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useProjectionsStore } from '@/stores/Comercial/Projections/projectionsStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import Favorite from "@/components/config/Favorite.vue";
import { RouterLink } from 'vue-router';

const store = useProjectionsStore();
const auth = useAuthStore();

const isAdmin = computed(() => auth?.user?.role === 'admin');
const selectedYear = ref(new Date().getFullYear());
const search = ref('');
const modalOpen = ref(false);

// novo: campos do modal
const form = ref({
    year: selectedYear.value,
    name: '',
    is_active: false,       // por padrão inativa
    clone_source_id: null,  // id da projeção ativa para clonar (opcional)
});

onMounted(async () => {
    await store.fetchList(selectedYear.value);
    await store.fetchAllActive(); // carrega lista de ativas (de todos os anos) para o select de cópia
});

watch(selectedYear, (y) => store.fetchList(y));

const years = [2024, 2025, 2026, 2027];

const filtered = computed(() => {
    const q = (search.value || '').trim().toLowerCase();

    // helper p/ pegar a data de atualização com fallback
    const updatedAt = (p) =>
        new Date(p.updated_at || p.updatedAt || p.created_at || p.createdAt || 0).getTime();

    return store.list
        .filter(p => !q || String(p.name).toLowerCase().includes(q))
        .sort((a, b) => {
            // 1) ano desc
            if (a.year !== b.year) return b.year - a.year;

            // 2) ativa primeiro (true antes de false)
            if (!!a.is_active !== !!b.is_active) return a.is_active ? -1 : 1;

            // 3) mais recente primeiro
            const ua = updatedAt(a);
            const ub = updatedAt(b);
            if (ua !== ub) return ub - ua;

            // 4) nome asc (desempate)
            return String(a.name || '').localeCompare(String(b.name || ''));
        });
});

const grouped = computed(() => {
    const by = {};
    for (const p of filtered.value) {
        const y = p.year;
        if (!by[y]) by[y] = [];
        by[y].push(p);
    }
    return by;
});

async function create() {
    const payloadBase = {
        year: form.value.year,
        name: (form.value.name || '').trim(),
        is_active: !!form.value.is_active, // mesmo que usuário marque, backend aplica regra 1-por-ano
    };
    if (!payloadBase.name) return;

    if (form.value.clone_source_id) {
        await store.cloneProjection({
            ...payloadBase,
            source_id: form.value.clone_source_id
        });
    } else {
        await store.createProjection(payloadBase);
    }
    modalOpen.value = false;
    form.value = { year: selectedYear.value, name: '', is_active: false, clone_source_id: null };
}

const chipClass = {
    active(v) {
        return v
            ? 'bg-blue-200 text-blue-700 border-blue-400'
            : 'bg-gray-200 text-gray-600 border-gray-400';
    },
    locked(v) {
        return v
            ? 'bg-emerald-200 text-emerald-700 border-emerald-400'
            : 'bg-red-200 text-red-700 border-red-400';
    }
};

</script>

<template>
    <div class="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
        <!-- header -->
        <div class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-800 p-4 md:p-6 mt-4 shadow-sm">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">
                        Projeções de Vendas
                        <Favorite class="my-auto" :router="'/comercial/projections'" :section="'Projeção'" />
                    </h1>
                    <p class="text-md text-gray-600 dark:text-gray-400">Crie, visualize e gerencie as projeções por ano.
                    </p>
                </div>
                <div class="flex items-center gap-2">
                    <input v-model="search" placeholder="Buscar por nome..."
                        class="h-10 w-56 border dark:border-gray-700 rounded-lg px-3 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400/40" />
                    <select v-model="selectedYear"
                        class="h-10 border border-gray-200 dark:border-gray-700 rounded-lg px-3 bg-gray-50 dark:bg-gray-900/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/40">
                        <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
                    </select>
                    <button v-if="isAdmin" @click="modalOpen = true"
                        class="h-10 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/60">
                        Nova projeção
                    </button>
                </div>
            </div>
        </div>

        <!-- groups -->
        <div v-for="(items, y) in grouped" :key="y" class="space-y-2">
            <h2 class="text-xs uppercase text-gray-500 tracking-wide">Ano {{ y }}</h2>
            <div class="grid sm:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                <RouterLink v-for="p in items" :key="p.id" :to="`/comercial/projections/${p.id}`"
                    class="p-5 rounded-2xl border dark:border-gray-700 bg-white/70 hover:bg-white dark:bg-gray-800 shadow-lg hover:shadow-md transition-all duration-200 hover:-translate-y-1">
                    <div class="flex items-start justify-between gap-4">
                        <div class="min-w-0">
                            <div class="font-semibold truncate">{{ p.name }}</div>
                            <div class="text-xs text-gray-500 mt-1">Criada: {{ new Date(p.created_at ||
                                p.createdAt).toLocaleDateString() }}</div>
                            <div class="text-xs text-gray-500 mt-1">
                                Última atualização em:
                                {{ new Date(p.updated_at || p.updatedAt || p.created_at ||
                                    p.createdAt).toLocaleDateString() }}
                            </div>
                        </div>
                        <div class="flex flex-col items-end gap-1">
                            <!-- Ativa / Inativa -->
                            <span class="text-[11px] px-2 py-0.5 rounded-full border"
                                :class="chipClass.active(p.is_active)">
                                {{ p.is_active ? 'Ativa' : 'Inativa' }}
                            </span>
                            <!-- Aberta / Bloqueada -->
                            <span class="text-[11px] px-2 py-0.5 rounded-full border"
                                :class="chipClass.locked(p.is_locked)">
                                {{ p.is_locked ? 'Bloqueada' : 'Aberta' }}
                            </span>
                        </div>
                    </div>
                </RouterLink>
            </div>
        </div>

        <!-- modal criação -->
        <div v-if="modalOpen" class="fixed inset-0 z-[60]">
            <div class="absolute inset-0 bg-black/30"></div>
            <div class="absolute inset-0 flex items-center justify-center p-4 z-[61]">
                <div
                    class="bg-white dark:bg-gray-800 rounded-2xl p-5 w-full max-w-md shadow-xl border dark:border-gray-700">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-semibold text-xl">Nova Projeção</h3>
                        <button @click="modalOpen = false" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="space-y-3">
                        <div>
                            <label class="text-sm text-gray-600 dark:text-gray-300">Ano</label>
                            <select v-model="form.year"
                                class="w-full h-10 border dark:border-gray-700 rounded-lg px-2 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/40">
                                <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
                            </select>
                        </div>

                        <div>
                            <label class="text-sm text-gray-600 dark:text-gray-300">Nome</label>
                            <input v-model="form.name" placeholder="Ex.: Projeção 2026"
                                class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/40" />
                        </div>

                        <!-- NOVO: clonar de projeção ativa -->
                        <div>
                            <label class="text-sm text-gray-600 dark:text-gray-300">Clonar da projeção ativa
                                (opcional)</label>
                            <select v-model="form.clone_source_id"
                                class="w-full h-10 border dark:border-gray-700 rounded-lg px-2 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/40">
                                <option :value="null">— Não clonar —</option>
                                <option v-for="p in store.allActive" :key="p.id" :value="p.id">
                                    {{ p.year }} — {{ p.name }}
                                </option>
                            </select>
                            <p class="text-[11px] text-gray-500 mt-1">
                                Apenas projeções <strong>ativas</strong> aparecem aqui. A cópia será criada
                                <strong>inativa</strong> e <strong>desbloqueada</strong>.
                            </p>
                        </div>

                        <!-- NOVO: flag ativa? (padrão desmarcada) -->
                        <div class="flex items-center gap-2">
                            <input id="in-act" type="checkbox" v-model="form.is_active" class="accent-blue-600">
                            <label for="in-act" class="text-sm text-gray-700 dark:text-gray-200">Ativar após
                                criar</label>
                        </div>
                        <p class="text-[11px] text-gray-500 -mt-2">
                            Dica: deixe desmarcado para revisar a cópia antes de ativar. Só uma projeção pode ficar
                            ativa por ano.
                        </p>
                    </div>

                    <div class="mt-4 flex justify-end gap-2">
                        <button @click="modalOpen = false"
                            class="h-10 px-3 rounded-lg border dark:border-gray-700 bg-white/90 hover:bg-gray-50 dark:bg-gray-900/70">Cancelar</button>
                        <button @click="create"
                            class="h-10 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500">Criar</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
