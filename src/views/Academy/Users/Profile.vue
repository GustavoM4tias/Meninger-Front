<template>
    <div class="space-y-4">
        <AcademyPageHeader :title="title" :subtitle="subtitle" :breadcrumbs="breadcrumbs"
            :backTo="{ name: 'AcademyUsers' }" />

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
                    <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ score }}</div>
                    <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">MVP (produção)</div>
                </div>
            </div>
        </section>

        <section class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div
                class="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <div>
                    <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">KB</div>
                    <div class="mt-2 text-sm text-slate-700 dark:text-slate-300">Publicados</div>
                    <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ kb.published }}</div>
                    <div class="mt-2 text-xs text-slate-500 dark:text-slate-400">Rascunhos: {{ kb.drafts }} • Total: {{
                        kb.total }}</div>
                </div>
            </div>

            <div
                class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Comunidade</div>
                <div class="mt-2 text-sm text-slate-700 dark:text-slate-300">Tópicos criados</div>
                <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ community.topicsCreated }}</div>
                <div class="mt-2 text-sm text-slate-700 dark:text-slate-300">Respostas</div>
                <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ community.answersPosted }}</div>
            </div>

            <div
                class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                <div class="text-xs font-semibold text-slate-500 dark:text-slate-400">Trilhas</div>
                <div class="mt-2 text-sm text-slate-700 dark:text-slate-300">Em andamento</div>
                <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ tracks.inProgress }}</div>
                <div class="mt-2 text-sm text-slate-700 dark:text-slate-300">Concluídas</div>
                <div class="text-2xl font-bold text-slate-900 dark:text-white">{{ tracks.completed }}</div>
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
    await store.fetchUserProfile(id.value, { audience: 'BOTH' });
});
</script>
