<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader title="Meus tópicos" subtitle="Abertos e fechados" :breadcrumbs="breadcrumbs"
            :backTo="{ name: 'AcademyCommunity' }">
            <template #actions>
                <button type="button" @click="router.push({ name: 'AcademyCommunity' })"
                    class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                    <i class="fa-solid fa-comments"></i>
                    Ver comunidade
                </button>
            </template>
        </AcademyPageHeader>

        <div
            class="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
            <div
                class="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
                <div class="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                    <div class="relative w-full md:w-80">
                        <i
                            class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
                        <input v-model="q" placeholder="Buscar nos meus tópicos..." @keyup.enter="apply"
                            class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                    </div>

                    <select v-model="status" @change="apply"
                        class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60 md:w-44">
                        <option value="">Todos os status</option>
                        <option value="OPEN">Abertos</option>
                        <option value="CLOSED">Fechados</option>
                    </select>
                </div>

                <div class="text-sm text-slate-500 dark:text-slate-400">
                    Total:
                    <span class="font-semibold text-slate-900 dark:text-slate-100">{{ store.my.total }}</span>
                </div>
            </div>

            <div class="p-2">
                <div v-if="store.my.error"
                    class="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    {{ store.my.error }}
                </div>

                <div v-if="!store.my.results.length" class="px-3 py-12 text-center">
                    <i class="fa-regular fa-comments text-3xl text-slate-300 dark:text-slate-700"></i>
                    <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Nenhum tópico encontrado.</p>
                </div>

                <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
                    <li v-for="it in store.my.results" :key="it.id"
                        class="group flex flex-col justify-between gap-3 rounded-xl px-3 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 sm:flex-row sm:items-center">
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {{ it.title }}
                                </p>

                                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                    :class="it.status === 'OPEN'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'">
                                    {{ it.status === 'OPEN' ? 'aberto' : 'fechado' }}
                                </span>

                                <span
                                    class="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                                    {{ typeLabel(it.type) }}
                                </span>
                            </div>

                            <div
                                class="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <span
                                    class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                    {{ it.categorySlug }}
                                </span>
                                <span v-if="it.createdAt" class="inline-flex items-center gap-1">
                                    <i class="fa-regular fa-calendar text-[10px]"></i>
                                    Criado {{ fmtDate(it.createdAt) }}
                                </span>
                                <span v-if="it.updatedAt" class="inline-flex items-center gap-1">
                                    <i class="fa-regular fa-clock text-[10px]"></i>
                                    Atualizado {{ fmtDate(it.updatedAt) }}
                                </span>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            <button type="button" @click="open(it.id)"
                                class="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:flex-none">
                                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i> Abrir
                            </button>

                            <button v-if="it.status === 'OPEN'" type="button" @click="setClosed(it.id, true)"
                                class="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 sm:flex-none">
                                Fechar
                            </button>

                            <button v-else type="button" @click="setClosed(it.id, false)"
                                class="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:flex-none">
                                Reabrir
                            </button>
                        </div>
                    </li>
                </ul>
            </div>

            <div class="flex items-center justify-between border-t border-slate-100 px-4 py-4 dark:border-slate-800">
                <button type="button" :disabled="store.my.page <= 1" @click="prev"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    <i class="fa-solid fa-chevron-left text-[10px]"></i>
                    Anterior
                </button>

                <div class="text-sm text-slate-500 dark:text-slate-400">
                    Página <span class="font-semibold text-slate-900 dark:text-slate-100">{{ store.my.page }}</span>
                </div>

                <button type="button" :disabled="store.my.page * store.my.pageSize >= store.my.total" @click="next"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    Próxima
                    <i class="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyCommunityStore } from '@/stores/Academy/academyCommunityStore';

const router = useRouter();
const store = useAcademyCommunityStore();

const q = ref(store.my.q || '');
const status = ref(store.my.status || '');

const breadcrumbs = [
    { label: 'Academy', to: { name: 'AcademyPanel' } },
    { label: 'Comunidade', to: { name: 'AcademyCommunity' } },
    { label: 'Meus tópicos' },
];

function fmtDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function typeLabel(typeEnum) {
    const t = String(typeEnum || '').toUpperCase();
    if (t === 'QUESTION') return 'Dúvida';
    if (t === 'DISCUSSION') return 'Discussão';
    if (t === 'SUGGESTION') return 'Sugestão';
    if (t === 'INCIDENT') return 'Incidente';
    return t || '—';
}

async function load(page = 1) {
    await store.fetchMyTopics({
        q: q.value,
        status: status.value,
        page,
        pageSize: store.my.pageSize,
    });
}

function apply() { load(1); }
function prev() { load(Math.max(1, (store.my.page || 1) - 1)); }
function next() { load((store.my.page || 1) + 1); }

function open(id) {
    const topicId = Number(id);
    if (!Number.isFinite(topicId) || topicId <= 0) return;
    router.push({ name: 'AcademyCommunityTopicManage', params: { id: topicId } })
}

async function setClosed(id, close) {
    const topicId = Number(id);
    if (!Number.isFinite(topicId) || topicId <= 0) return;

    if (close) await store.closeTopic(topicId);
    else await store.reopenTopic(topicId);

    await load(store.my.page || 1);
}

onMounted(() => load(1));
</script>
