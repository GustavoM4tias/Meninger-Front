<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader title="Admin" subtitle="Gestão de conteúdos e trilhas do Academy"
            :backTo="{ name: 'AcademyPanel' }" :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Admin' }
            ]">
            <template #actions>
                <button type="button" @click="goPanel"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                    <i class="fa-solid fa-chevron-left text-[10px]"></i>
                    Voltar ao painel
                </button>
            </template>
        </AcademyPageHeader>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <!-- Ações -->
            <section class="space-y-5 lg:col-span-8">
                <div
                    class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <h2 class="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                            <i class="fa-solid fa-bolt text-indigo-500"></i>
                            Ações
                        </h2>
                        <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            Acesso rápido às áreas administrativas
                        </p>
                    </div>

                    <div class="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                        <button v-for="a in actions" :key="a.title" type="button" @click="a.run"
                            class="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800">
                            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                                :class="a.tint">
                                <i class="fa-solid" :class="a.icon"></i>
                            </span>
                            <span class="min-w-0 flex-1">
                                <span class="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {{ a.title }}
                                </span>
                                <span class="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                    {{ a.desc }}
                                </span>
                                <span class="mt-2 block font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                    {{ a.hint }}
                                </span>
                            </span>
                            <i
                                class="fa-solid fa-chevron-right mt-1 text-xs text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-600"></i>
                        </button>
                    </div>
                </div>
            </section>

            <!-- Bloco lateral -->
            <aside class="space-y-5 lg:col-span-4">
                <section
                    class="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                    <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        <i class="fa-solid fa-gears text-indigo-500"></i>
                        Operação
                    </h3>
                    <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        O Admin serve para manter trilhas e conteúdos consistentes.
                        Em caso de dúvida recorrente: Comunidade → Aceite → KB.
                    </p>
                </section>

                <section
                    class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        <i class="fa-solid fa-link text-slate-400"></i>
                        Atalhos
                    </h3>
                    <div class="mt-3 grid grid-cols-1 gap-2">
                        <button type="button" @click="goPanel"
                            class="group rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 transition-all hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-indigo-800 dark:hover:bg-slate-700">
                            Voltar ao painel
                            <div class="mt-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">
                                Visão geral do Academy
                            </div>
                        </button>

                        <button type="button" @click="goTracks"
                            class="group rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 transition-all hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-indigo-800 dark:hover:bg-slate-700">
                            Trilhas (usuário)
                            <div class="mt-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">
                                Ver como o usuário enxerga
                            </div>
                        </button>
                    </div>
                </section>
            </aside>
        </div>
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';

const router = useRouter();

function goPanel() {
    router.push({ name: 'AcademyPanel' });
}

function goTracks() {
    router.push({ name: 'AcademyTracks' });
}

function goTracksAdmin() {
    router.push({ name: 'AcademyTracksAdmin' });
}

function goKbEditor() {
    router.push({ name: 'AcademyKBEditor' });
}

function goCommunityQuestions() {
    router.push({ name: 'AcademyCommunityType', params: { type: 'questions' } });
}

const actions = [
    {
        icon: 'fa-route', title: 'Trilhas (Admin)',
        tint: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300',
        desc: 'Criar trilhas, itens, publicar e gerenciar vínculos (ROLE/POSITION/CITY/USER).',
        hint: '/academy/admin/tracks', run: goTracksAdmin,
    },
    {
        icon: 'fa-pen-to-square', title: 'Artigo | Editor',
        tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300',
        desc: 'Criar e editar artigos (atalho para o editor).',
        hint: '/academy/kb/editor', run: goKbEditor,
    },
    {
        icon: 'fa-comments', title: 'Comunidade | Perguntas',
        tint: 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300',
        desc: 'Acompanhar perguntas (aceite/fechamento ocorre no fluxo do tópico).',
        hint: '/academy/community/questions', run: goCommunityQuestions,
    },
    {
        icon: 'fa-clipboard-question', title: 'Banco de Questões',
        tint: 'bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300',
        desc: 'Perguntas reutilizáveis para os quizzes das trilhas.',
        hint: '/academy/admin/questions', run: () => router.push({ name: 'AcademyAdminQuestions' }),
    },
    {
        icon: 'fa-chart-line', title: 'Aderência de Trilhas',
        tint: 'bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300',
        desc: 'Acompanhe conclusão de trilhas obrigatórias por usuário.',
        hint: '/academy/admin/adherence', run: () => router.push({ name: 'AcademyAdherence' }),
    },
    {
        icon: 'fa-wand-magic-sparkles', title: 'Onboarding Automático',
        tint: 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300',
        desc: 'Regras que atribuem trilhas automaticamente a novos usuários.',
        hint: '/academy/admin/onboarding', run: () => router.push({ name: 'AcademyAdminOnboarding' }),
    },
];
</script>
