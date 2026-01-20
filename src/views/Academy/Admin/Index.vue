<template>
    <div class="space-y-4">
        <AcademyPageHeader title="Admin" subtitle="Gestão de conteúdos e trilhas do Academy"
            :backTo="{ name: 'AcademyPanel' }" :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Admin' }
            ]">
            <template #actions>
                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    @click="goPanel">
                    Voltar ao painel
                </button>
            </template>
        </AcademyPageHeader>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <!-- Ações -->
            <section class="lg:col-span-8 space-y-4">
                <div
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
                    <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Ações</h2>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Acesso rápido às áreas administrativas</p>
                    </div>

                    <div class="p-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <!-- Trilhas -->
                        <button
                            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
                            @click="goTracksAdmin">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        Trilhas (Admin)
                                    </p>
                                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Criar trilhas, itens, publicar e gerenciar vínculos (ROLE/POSITION/CITY/USER).
                                    </p>

                                    <div class="mt-3 flex items-center gap-2">
                                        <span
                                            class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            /academy/admin/tracks
                                        </span>
                                    </div>
                                </div>
                                <span
                                    class="text-slate-400 dark:text-slate-600 group-hover:translate-x-1 transition-transform">›</span>
                            </div>
                        </button>

                        <!-- Placeholder artigo Admin (não quebra se não existir rota) -->
                        <button
                            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
                            @click="goKbEditor">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        Artigo | Editor
                                    </p>
                                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Criar e editar artigos (atalho para o editor).
                                    </p>

                                    <div class="mt-3 flex items-center gap-2">
                                        <span
                                            class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            /academy/kb/editor
                                        </span>
                                    </div>
                                </div>
                                <span
                                    class="text-slate-400 dark:text-slate-600 group-hover:translate-x-1 transition-transform">›</span>
                            </div>
                        </button>

                        <!-- Comunidade (admin operacional via moderação, se existir) -->
                        <button
                            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 transition-all group"
                            @click="goCommunityQuestions">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        Comunidade | Perguntas
                                    </p>
                                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Acompanhar perguntas (aceite/fechamento ocorre no fluxo do tópico).
                                    </p>

                                    <div class="mt-3 flex items-center gap-2">
                                        <span
                                            class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            /academy/community/questions
                                        </span>
                                    </div>
                                </div>
                                <span
                                    class="text-slate-400 dark:text-slate-600 group-hover:translate-x-1 transition-transform">›</span>
                            </div>
                        </button>
 
                    </div>
                </div>
            </section>

            <!-- Bloco lateral -->
            <aside class="lg:col-span-4 space-y-4">
                <section
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
                    <h3 class="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span class="text-amber-500">⚙️</span> Operação
                    </h3>

                    <p class="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        O Admin serve para manter trilhas e conteúdos consistentes.
                        Em caso de dúvida recorrente: Comunidade → Aceite → KB.
                    </p>
                </section>

                <section
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm transition-colors">
                    <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Atalhos</h3>
                    <div class="mt-3 grid grid-cols-1 gap-2">
                        <button
                            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
                            @click="goPanel">
                            Voltar ao painel
                            <div
                                class="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                                Visão geral do Academy
                            </div>
                        </button>

                        <button
                            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all group"
                            @click="goTracks">
                            Trilhas (usuário)
                            <div
                                class="mt-1 text-xs font-normal text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
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
 
</script>
