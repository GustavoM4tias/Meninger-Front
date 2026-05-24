<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader title="Admin · Nova trilha"
            subtitle="Crie a trilha. Depois adicione etapas (itens) e vínculos."
            :backTo="{ name: 'AcademyTracksAdmin' }" :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Admin', to: { name: 'AcademyAdmin' } },
                { label: 'Trilhas', to: { name: 'AcademyTracksAdmin' } },
                { label: 'Nova' }
            ]">
            <template #actions>
                <button type="button" :disabled="saving" @click="cancel"
                    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                    Cancelar
                </button>

                <button type="button" :disabled="saving" @click="save"
                    class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 active:scale-95 disabled:opacity-60">
                    <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin text-xs' : 'fa-plus text-xs'"></i>
                    {{ saving ? 'Salvando...' : 'Criar trilha' }}
                </button>
            </template>
        </AcademyPageHeader>

        <div v-if="error"
            class="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400">
            <i class="fa-solid fa-circle-exclamation"></i>
            {{ error }}
        </div>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <!-- Form -->
            <section
                class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-8">
                <div class="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
                    <h2 class="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                        <i class="fa-solid fa-route text-indigo-500"></i>
                        Dados da trilha
                    </h2>
                    <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                        Preencha o mínimo necessário. Você pode publicar depois.
                    </p>
                </div>

                <div class="space-y-5 p-6">
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-12">
                        <label class="md:col-span-8">
                            <div class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Título *
                            </div>
                            <input v-model="form.title" placeholder="Ex: Onboarding Comercial"
                                @keydown.enter.prevent="save"
                                class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                            <div class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                Use um nome claro — a pessoa entende sem contexto.
                            </div>
                        </label>

                        <label class="md:col-span-4">
                            <div class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Status
                            </div>
                            <select v-model="form.status"
                                class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60">
                                <option value="DRAFT">Rascunho</option>
                                <option value="PUBLISHED">Publicado</option>
                            </select>
                            <div class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                Recomendado começar como rascunho.
                            </div>
                        </label>

                        <label class="md:col-span-12">
                            <div class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                Descrição
                            </div>
                            <textarea v-model="form.description" rows="5"
                                placeholder="Objetivo da trilha, o que a pessoa vai aprender e o resultado esperado."
                                class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                        </label>
                    </div>

                    <!-- CTA secundário -->
                    <div
                        class="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 dark:border-indigo-900/40 dark:bg-indigo-950/30 sm:flex-row sm:items-center sm:justify-between">
                        <div class="text-sm text-slate-600 dark:text-slate-300">
                            <i class="fa-solid fa-arrow-right text-[10px] text-indigo-500"></i>
                            Após criar: <span class="font-semibold">vínculos</span> e
                            <span class="font-semibold">itens</span>.
                        </div>
                        <button type="button" :disabled="saving" @click="save"
                            class="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 disabled:opacity-60">
                            <i class="fa-solid" :class="saving ? 'fa-spinner fa-spin text-xs' : 'fa-arrow-right text-xs'"></i>
                            {{ saving ? 'Salvando...' : 'Criar e configurar' }}
                        </button>
                    </div>
                </div>
            </section>

            <!-- Side help -->
            <aside class="space-y-5 lg:col-span-4">
                <div
                    class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                            <i class="fa-solid fa-list-check text-indigo-500"></i>
                            Checklist rápido
                        </h3>
                        <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            Para publicar com qualidade.
                        </p>
                    </div>

                    <ol class="space-y-3 p-5 text-sm">
                        <li class="flex gap-3">
                            <span
                                class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                1
                            </span>
                            <div>
                                <div class="font-semibold text-slate-900 dark:text-white">Vínculos</div>
                                <div class="mt-0.5 text-slate-600 dark:text-slate-400">
                                    Defina cargos / cidade / depto, ou vincule usuários direto.
                                </div>
                            </div>
                        </li>
                        <li class="flex gap-3">
                            <span
                                class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                2
                            </span>
                            <div>
                                <div class="font-semibold text-slate-900 dark:text-white">Etapas (itens)</div>
                                <div class="mt-0.5 text-slate-600 dark:text-slate-400">
                                    Introdução (TEXT) + 3 a 7 itens. Marque os obrigatórios.
                                </div>
                            </div>
                        </li>
                        <li class="flex gap-3">
                            <span
                                class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                3
                            </span>
                            <div>
                                <div class="font-semibold text-slate-900 dark:text-white">Publicação</div>
                                <div class="mt-0.5 text-slate-600 dark:text-slate-400">
                                    Publique só quando a trilha estiver consistente.
                                </div>
                            </div>
                        </li>
                    </ol>
                </div>

                <div
                    class="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-900/40 dark:bg-indigo-950/30">
                    <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                        <i class="fa-solid fa-circle-info"></i>
                        Audiência × Vínculos
                    </div>
                    <p class="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                        A <span class="font-semibold">audiência</span> é o filtro amplo do módulo.
                        Os <span class="font-semibold">vínculos</span> são o controle fino
                        (cargos / cidade / depto / usuários).
                    </p>
                </div>
            </aside>
        </div>
    </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyTracksAdminStore } from '@/stores/Academy/academyTracksAdminStore';

const router = useRouter();
const store = useAcademyTracksAdminStore();

const saving = ref(false);
const error = ref(null);

const form = reactive({
    title: '',
    description: '',
    status: 'DRAFT',
    audience: 'BOTH',
    slug: '',
});

function cancel() {
    router.push({ name: 'AcademyTracksAdmin' });
}

function validate() {
    const title = String(form.title || '').trim();
    if (!title) return 'Título é obrigatório.';

    const st = String(form.status || 'DRAFT').toUpperCase();
    if (!['DRAFT', 'PUBLISHED'].includes(st)) return 'Status inválido.';

    const aud = String(form.audience || 'BOTH');
    if (!['BOTH', 'GESTOR_ONLY', 'ADM_ONLY'].includes(aud)) return 'Audiência inválida.';

    return '';
}

async function save() {
    error.value = null;
    saving.value = true;

    try {
        const msg = validate();
        if (msg) throw new Error(msg);

        const payload = {
            title: String(form.title || '').trim(),
            description: String(form.description || '').trim(),
            status: String(form.status || 'DRAFT').toUpperCase(),
            audience: String(form.audience || 'BOTH'),
        };

        const s = String(form.slug || '').trim();
        if (s) payload.slug = s;

        const res = await store.createTrack(payload);
        const slug = String(res?.track?.slug || '').trim();

        if (!slug) throw new Error('Trilha criada sem slug (backend).');

        // já direciona para a aba de vínculos (vamos aplicar isso no Detail no próximo passo)
        router.push({
            name: 'AcademyTracksAdminDetail',
            params: { slug },
            query: { tab: 'assignments', openAssign: '1' },
        });
    } catch (e) {
        error.value = e?.message || 'Erro ao criar trilha';
        throw e;
    } finally {
        saving.value = false;
    }
}
</script>
