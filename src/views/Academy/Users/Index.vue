<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader title="Ranking" subtitle="Pontuação por produção no Menin Academy"
            :breadcrumbs="breadcrumbs" :backTo="{ name: 'AcademyPanel' }" />

        <div v-if="store.error"
            class="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400">
            <i class="fa-solid fa-circle-exclamation"></i>
            {{ store.error }}
        </div>

        <div
            class="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
            <div
                class="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
                <div class="relative w-full md:w-96">
                    <input v-model="qLocal" placeholder="Buscar usuário..." @input="onSearchInput" @keyup.enter="apply"
                        class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-11 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                    <button type="button" @click="apply" aria-label="Buscar"
                        class="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-700">
                        <i class="fa-solid fa-magnifying-glass text-sm"></i>
                    </button>
                </div>

                <div class="text-sm text-slate-500 dark:text-slate-400">
                    Total:
                    <span class="font-semibold text-slate-900 dark:text-slate-100">{{ filteredTotal }}</span>
                </div>
            </div>

            <div class="p-2">
                <div v-if="!pagedResults.length" class="px-3 py-12 text-center">
                    <i class="fa-solid fa-trophy text-3xl text-slate-300 dark:text-slate-700"></i>
                    <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Nenhum usuário encontrado.</p>
                </div>

                <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
                    <li v-for="(u, idx) in pagedResults" :key="u.user?.id || idx" @click="openUser(u)"
                        class="group cursor-pointer rounded-xl px-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex min-w-0 gap-3">
                                <span
                                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                                    :class="rankNumber(idx) <= 3
                                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'">
                                    {{ rankNumber(idx) }}
                                </span>

                                <div class="min-w-0">
                                    <div
                                        class="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                                        {{ u.user?.username || 'Usuário' }}
                                    </div>
                                    <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                                        {{ u.user?.position || '—' }} • {{ u.user?.city || '—' }}
                                    </div>

                                    <div class="mt-2 flex flex-wrap items-center gap-1.5">
                                        <span
                                            class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-800">
                                            <i class="fa-solid fa-book text-[9px] text-slate-400 dark:text-slate-500"></i>
                                            <span class="font-semibold text-slate-700 dark:text-slate-200">{{
                                                u.kb?.published ?? 0 }}</span>
                                            <span class="text-slate-500 dark:text-slate-400">artigos</span>
                                        </span>
                                        <span
                                            class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-800">
                                            <i class="fa-solid fa-reply text-[9px] text-slate-400 dark:text-slate-500"></i>
                                            <span class="font-semibold text-slate-700 dark:text-slate-200">{{
                                                u.community?.answersPosted ?? 0 }}</span>
                                            <span class="text-slate-500 dark:text-slate-400">respostas</span>
                                        </span>
                                        <span
                                            class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-800">
                                            <i class="fa-solid fa-comments text-[9px] text-slate-400 dark:text-slate-500"></i>
                                            <span class="font-semibold text-slate-700 dark:text-slate-200">{{
                                                u.community?.topicsCreated ?? 0 }}</span>
                                            <span class="text-slate-500 dark:text-slate-400">tópicos</span>
                                        </span>
                                        <span
                                            class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] dark:bg-slate-800">
                                            <i class="fa-solid fa-route text-[9px] text-slate-400 dark:text-slate-500"></i>
                                            <span class="font-semibold text-slate-700 dark:text-slate-200">{{
                                                u.tracks?.completed ?? 0 }}</span>
                                            <span class="text-slate-500 dark:text-slate-400">trilhas</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div class="shrink-0 text-right">
                                <div
                                    class="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                                    Score
                                </div>
                                <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                    {{ u.score ?? 0 }}
                                </div>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>

            <div class="flex items-center justify-between border-t border-slate-100 px-4 py-4 dark:border-slate-800">
                <button type="button" :disabled="page <= 1" @click="setPage(page - 1)"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    <i class="fa-solid fa-chevron-left text-[10px]"></i>
                    Anterior
                </button>

                <div class="text-sm text-slate-500 dark:text-slate-400">
                    Página <span class="font-semibold text-slate-900 dark:text-slate-100">{{ page }}</span>
                </div>

                <button type="button" :disabled="page * pageSize >= filteredTotal" @click="setPage(page + 1)"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    Próxima
                    <i class="fa-solid fa-chevron-right text-[10px]"></i>
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
    });

    pageSize.value = Number(list.value.pageSize) || 20;
});
</script>
