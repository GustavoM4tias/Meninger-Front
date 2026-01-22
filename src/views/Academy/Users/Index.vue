<template>
    <div class="space-y-4">
        <AcademyPageHeader title="Ranking" subtitle="Pontuação por produção no Menin Academy" :breadcrumbs="breadcrumbs"
            :backTo="{ name: 'AcademyPanel' }" />

        <div v-if="store.error"
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
            {{ store.error }}
        </div>

        <div
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div
                class="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 dark:border-slate-800">
                <div class="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                    <div class="relative w-full md:w-[420px]">
                        <input v-model="qLocal"
                            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="Buscar usuário..." @input="onSearchInput" @keyup.enter="apply" />
                        <button
                            class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            @click="apply" type="button">
                            ⌕
                        </button>
                    </div>
                </div>

                <div class="text-sm text-slate-500 dark:text-slate-400">
                    Total:
                    <span class="font-semibold text-slate-900 dark:text-slate-100">{{ filteredTotal }}</span>
                </div>
            </div>

            <div class="p-2">
                <div v-if="!pagedResults.length"
                    class="px-3 py-10 text-sm text-slate-500 dark:text-slate-400 text-center">
                    Nenhum usuário encontrado.
                </div>

                <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
                    <li v-for="(u, idx) in pagedResults" :key="u.user?.id || idx"
                        class="rounded-xl px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        @click="openUser(u)">
                        <div class="flex items-start justify-between gap-4">
                            <div class="min-w-0">
                                <div class="flex items-center gap-3">
                                    <span
                                        class="shrink-0 w-8 h-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center justify-center text-xs font-mono text-slate-600 dark:text-slate-300">
                                        {{ rankNumber(idx) }}
                                    </span>

                                    <div class="min-w-0">
                                        <div class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                            {{ u.user?.username || 'Usuário' }}
                                        </div>
                                        <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                                            {{ u.user?.position || '—' }} • {{ u.user?.city || '—' }}
                                        </div>
                                    </div>
                                </div>

                                <div
                                    class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span
                                        class="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5 bg-white dark:bg-slate-900">
                                        Artigos publicados
                                        <span class="ml-1 font-semibold text-slate-700 dark:text-slate-200">
                                            {{ u.kb?.published ?? 0 }}
                                        </span>
                                    </span>

                                    <span
                                        class="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5 bg-white dark:bg-slate-900">
                                        Respostas
                                        <span class="ml-1 font-semibold text-slate-700 dark:text-slate-200">
                                            {{ u.community?.answersPosted ?? 0 }}
                                        </span>
                                    </span>

                                    <span
                                        class="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5 bg-white dark:bg-slate-900">
                                        Tópicos
                                        <span class="ml-1 font-semibold text-slate-700 dark:text-slate-200">
                                            {{ u.community?.topicsCreated ?? 0 }}
                                        </span>
                                    </span>

                                    <span
                                        class="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5 bg-white dark:bg-slate-900">
                                        Trilhas concluídas
                                        <span class="ml-1 font-semibold text-slate-700 dark:text-slate-200">
                                            {{ u.tracks?.completed ?? 0 }}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            <div class="shrink-0 text-right">
                                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Score</div>
                                <div class="text-2xl font-bold text-slate-900 dark:text-white">
                                    {{ u.score ?? 0 }}
                                </div>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>

            <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-4">
                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    :disabled="page <= 1" @click="setPage(page - 1)">
                    Anterior
                </button>

                <div class="text-sm text-slate-500 dark:text-slate-400">
                    Página <span class="font-semibold text-slate-900 dark:text-slate-100">{{ page }}</span>
                </div>

                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    :disabled="page * pageSize >= filteredTotal" @click="setPage(page + 1)">
                    Próxima
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyUsersStore } from '@/stores/Academy/academyUsersStore';

const router = useRouter();
const store = useAcademyUsersStore();

const breadcrumbs = computed(() => [
    { label: 'Academy', to: { name: 'AcademyPanel' } },
    { label: 'Ranking' },
]);

// ✅ garante sempre uma estrutura segura no render
const list = computed(() => store.list ?? { results: [], total: 0, pageSize: 20 });

const qLocal = ref('');
const page = ref(1);
const pageSize = ref(20);

const rawList = computed(() => (Array.isArray(list.value.results) ? list.value.results : []));

function normalize(s) {
  return String(s || '')
    .normalize('NFD')                    // separa acentos
    .replace(/[\u0300-\u036f]/g, '')     // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')         // remove pontuação (vira espaço)
    .trim()
    .replace(/\s+/g, ' ');               // colapsa espaços
}

const filtered = computed(() => {
  const term = normalize(qLocal.value);
  if (!term) return rawList.value;

  const tokens = term.split(' ').filter(Boolean);

  return rawList.value.filter((row) => {
    const u = row?.user || {};
    const hay = normalize([u.username, u.position, u.city].join(' '));

    // todas as palavras precisam existir (AND)
    return tokens.every(t => hay.includes(t));
  });
});

const filteredTotal = computed(() => filtered.value.length);

const pagedResults = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return filtered.value.slice(start, start + pageSize.value);
});

function rankNumber(idxInPage) {
    return (page.value - 1) * pageSize.value + idxInPage + 1;
}

function onSearchInput() {
    page.value = 1;
}

function apply() {
    page.value = 1;
}

function setPage(p) {
    page.value = Math.max(1, p);
}

function openUser(row) {
    const id = row?.user?.id;
    if (!id) return;
    router.push({ name: 'AcademyUserProfile', params: { id } });
}

onMounted(async () => {
    await store.fetchRank({
        q: '',
        page: 1,
        pageSize: 10000,
        audience: 'BOTH',
    });

    pageSize.value = Number(list.value.pageSize) || 20;
});
</script>
