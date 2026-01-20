<template>
    <div class="space-y-4">
        <AcademyPageHeader title="Meu perfil" subtitle="Produção e evolução no Menin Academy" :breadcrumbs="breadcrumbs"
            :backTo="{ name: 'AcademyPanel' }" />

        <div class="space-y-4">
            <div v-if="store.error"
                class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 px-5 py-4 text-sm text-rose-700 dark:text-rose-400 shadow-sm">
                {{ store.error }}
            </div>

            <section
                class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
                <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div class="min-w-0">
                        <div class="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                            {{ user?.username || 'Usuário' }}
                        </div>
                        <div class="truncate text-sm text-slate-500 dark:text-slate-400">
                            {{ user?.email || '' }}
                        </div>

                        <div class="mt-3 flex flex-wrap gap-2">
                            <span
                                class="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                {{ user?.position || 'Cargo' }}
                            </span>
                            <span
                                class="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                {{ user?.city || 'Cidade' }}
                            </span>
                            <span
                                class="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                                Desde: {{ fmtDate(user?.createdAt) }}
                            </span>
                        </div>
                    </div>

                    <div
                        class="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-5 py-4">
                        <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Score</div>
                        <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ store.score }}</div>
                        <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">MVP (produção)</div>
                    </div>
                </div>
            </section>

            <section class="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div
                    class="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <div>
                        <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Artigos</div>
                        <div class="mt-2 text-sm text-slate-700 dark:text-slate-300">Publicados</div>
                        <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ kb.published }}</div>
                        <div class="mt-2 text-xs text-slate-500 dark:text-slate-400">Rascunhos: {{ kb.drafts }} • Total:
                            {{ kb.total }}</div>
                    </div>

                    <div class="mt-4">
                        <button
                            class="rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors"
                            @click="router.push({ name: 'AcademyKBArticles' })">
                            Meus artigos
                        </button>
                    </div>
                </div>

                <div
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Comunidade</div>
                    <div class="mt-2 text-sm text-slate-700 dark:text-slate-300">Tópicos criados</div>
                    <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ community.topicsCreated }}</div>
                    <div class="mt-2 text-sm text-slate-700 dark:text-slate-300">Respostas</div>
                    <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ community.answersPosted }}</div>

                    <div class="mt-4">
                        <button
                            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            @click="router.push({ name: 'AcademyCommunity' })">
                            Abrir comunidade
                        </button>
                    </div>
                </div>

                <div
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                    <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Trilhas</div>
                    <div class="mt-2 text-sm text-slate-700 dark:text-slate-300">Em andamento</div>
                    <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ tracks.inProgress }}</div>
                    <div class="mt-2 text-sm text-slate-700 dark:text-slate-300">Concluídas</div>
                    <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ tracks.completed }}</div>

                    <div class="mt-4">
                        <button
                            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            @click="router.push({ name: 'AcademyTracks' })">
                            Ver trilhas
                        </button>
                    </div>
                </div>
            </section>

            <section
                class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                    <div class="text-base font-semibold text-slate-900 dark:text-white">Progresso recente</div>
                    <div class="text-sm text-slate-500 dark:text-slate-400">Últimas trilhas atualizadas</div>
                </div>

                <div class="p-2">
                    <div v-if="!tracks.list.length"
                        class="px-3 py-8 text-sm text-slate-500 dark:text-slate-400 text-center">
                        Nenhuma trilha iniciada ainda.
                    </div>

                    <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800">
                        <li v-for="t in tracks.list.slice(0, 10)" :key="t.trackSlug"
                            class="flex items-center justify-between gap-3 px-3 py-3">
                            <div class="min-w-0">
                                <div class="truncate text-sm font-semibold text-slate-900 dark:text-slate-200">
                                    {{ t.trackTitle || t.trackSlug }}
                                </div>
                                <div class="text-xs text-slate-500 dark:text-slate-400">
                                    Atualizado em {{ fmtDate(t.updatedAt) }}
                                </div>
                            </div>

                            <div class="flex items-center gap-2">
                                <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="t.status === 'COMPLETED'
                                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'">
                                    {{ t.status === 'COMPLETED' ? 'concluída' : 'em andamento' }}
                                </span>
                                <span class="text-sm font-semibold text-slate-900 dark:text-slate-200">
                                    {{ Number(t.progressPercent || 0) }}%
                                </span>
                            </div>
                        </li>
                    </ul>
                </div>
            </section>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyMeStore } from '@/stores/Academy/academyMeStore';

const router = useRouter();
const store = useAcademyMeStore();

const breadcrumbs = computed(() => [
    { label: 'Academy', to: { name: 'AcademyPanel' } },
    { label: 'Meu perfil' },
]);

const user = computed(() => store.user);
const kb = computed(() => store.kb);
const community = computed(() => store.community);
const tracks = computed(() => store.tracks);

function fmtDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

onMounted(() => {
    store.fetchSummary({ audience: 'BOTH' });
});
</script>
