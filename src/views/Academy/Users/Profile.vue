<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader :title="title" :subtitle="subtitle" :breadcrumbs="breadcrumbs"
            :backTo="{ name: 'AcademyUsers' }" />

        <div v-if="store.error"
            class="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-4 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400">
            <i class="fa-solid fa-circle-exclamation"></i>
            {{ store.error }}
        </div>

        <!-- Identidade -->
        <section
            class="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
            <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div class="flex min-w-0 items-center gap-4">
                    <span
                        class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-lg shadow-indigo-500/30">
                        {{ String(user?.username || '?').slice(0, 2).toUpperCase() }}
                    </span>
                    <div class="min-w-0">
                        <div class="truncate font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
                            {{ user?.username || 'Usuário' }}
                        </div>
                        <div class="truncate text-sm text-slate-500 dark:text-slate-400">
                            {{ user?.email || '' }}
                        </div>
                        <div class="mt-2 flex flex-wrap gap-2">
                            <span
                                class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <i class="fa-solid fa-briefcase text-[10px] text-slate-400"></i>
                                {{ user?.position || 'Cargo' }}
                            </span>
                            <span
                                class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <i class="fa-solid fa-location-dot text-[10px] text-slate-400"></i>
                                {{ user?.city || 'Cidade' }}
                            </span>
                            <span
                                class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                <i class="fa-regular fa-calendar text-[10px] text-slate-400"></i>
                                Desde {{ fmtDate(user?.createdAt) }}
                            </span>
                        </div>
                    </div>
                </div>

                <div
                    class="rounded-2xl border border-indigo-100 bg-indigo-50 px-6 py-4 text-center dark:border-indigo-900/40 dark:bg-indigo-950/40">
                    <div class="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
                        Score
                    </div>
                    <div class="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{{ score }}</div>
                    <div class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">MVP (produção)</div>
                </div>
            </div>
        </section>

        <!-- Métricas -->
        <section class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div
                class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-center gap-2">
                    <span
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <i class="fa-solid fa-book text-xs"></i>
                    </span>
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Base de Conhecimento
                    </div>
                </div>
                <div class="mt-3 text-sm text-slate-700 dark:text-slate-300">Publicados</div>
                <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ kb.published }}</div>
                <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Rascunhos: {{ kb.drafts }} • Total: {{ kb.total }}
                </div>
            </div>

            <div
                class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-center gap-2">
                    <span
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300">
                        <i class="fa-solid fa-comments text-xs"></i>
                    </span>
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Comunidade
                    </div>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2">
                    <div>
                        <div class="text-sm text-slate-700 dark:text-slate-300">Tópicos</div>
                        <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ community.topicsCreated }}
                        </div>
                    </div>
                    <div>
                        <div class="text-sm text-slate-700 dark:text-slate-300">Respostas</div>
                        <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ community.answersPosted }}
                        </div>
                    </div>
                </div>
            </div>

            <div
                class="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_2px_20px_-12px_rgb(15_23_42/0.18)] dark:border-slate-800 dark:bg-slate-900">
                <div class="flex items-center gap-2">
                    <span
                        class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                        <i class="fa-solid fa-route text-xs"></i>
                    </span>
                    <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Trilhas
                    </div>
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2">
                    <div>
                        <div class="text-sm text-slate-700 dark:text-slate-300">Em andamento</div>
                        <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ tracks.inProgress }}</div>
                    </div>
                    <div>
                        <div class="text-sm text-slate-700 dark:text-slate-300">Concluídas</div>
                        <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ tracks.completed }}</div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyUsersStore } from '@/stores/Academy/academyUsersStore';

const route = useRoute();
const store = useAcademyUsersStore();

const id = computed(() => Number(route.params.id || 0));

const data = computed(() => store.profile.data || null);
const user = computed(() => data.value?.user || null);
const kb = computed(() => data.value?.kb || { drafts: 0, published: 0, total: 0 });
const community = computed(() => data.value?.community || { topicsCreated: 0, answersPosted: 0 });
const tracks = computed(() => data.value?.tracks || { completed: 0, inProgress: 0, list: [] });

const score = computed(() => {
    // usa a MESMA regra do meStore (mantém coerência)
    const kbPublished = Number(kb.value?.published || 0);
    const answers = Number(community.value?.answersPosted || 0);
    const topics = Number(community.value?.topicsCreated || 0);
    const completed = Number(tracks.value?.completed || 0);
    return kbPublished * 20 + answers * 3 + topics * 10 + completed * 25;
});

const title = computed(() => user.value?.username || 'Perfil');

const subtitle = computed(() => user.value?.position || 'Cargo');

const breadcrumbs = computed(() => [
    { label: 'Academy', to: { name: 'AcademyPanel' } },
    { label: 'Ranking', to: { name: 'AcademyUsers' } },
    { label: title.value },
]);

function fmtDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

onMounted(async () => {
    if (!id.value) return;
    await store.fetchUserProfile(id.value);
});
</script>
