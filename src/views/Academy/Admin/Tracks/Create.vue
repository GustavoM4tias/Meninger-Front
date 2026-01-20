<template>
    <div class="space-y-4">
        <AcademyPageHeader title="Admin | Nova trilha"
            subtitle="Crie a trilha. Depois adicione etapas (itens) e vínculos."
            :backTo="{ name: 'AcademyTracksAdmin' }" :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Admin', to: { name: 'AcademyAdmin' } },
                { label: 'Trilhas', to: { name: 'AcademyTracksAdmin' } },
                { label: 'Nova' }
            ]">
            <template #actions>
                <button
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    :disabled="saving" @click="cancel">
                    Cancelar
                </button>

                <button
                    class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2.5 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                    :disabled="saving" @click="save">
                    {{ saving ? 'Salvando...' : 'Criar trilha' }}
                </button>
            </template>
        </AcademyPageHeader>

        <div v-if="error"
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
            {{ error }}
        </div>

        <!-- Layout: form + painel de dicas -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <!-- Form -->
            <section
                class="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div class="border-b border-slate-100 dark:border-slate-800 px-6 py-5">
                    <h2 class="text-base font-semibold text-slate-900 dark:text-white">Dados da trilha</h2>
                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Preencha o mínimo necessário. Você pode publicar depois.
                    </p>
                </div>

                <div class="p-6 space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                        <label class="md:col-span-8">
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Título *</div>
                            <input v-model="form.title"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                placeholder="Ex: Onboarding Comercial" @keydown.enter.prevent="save" />
                            <div class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                Use um nome claro (pessoa entende sem contexto).
                            </div>
                        </label>

                        <label class="md:col-span-4">
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Status</div>
                            <select v-model="form.status"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm">
                                <option value="DRAFT">Rascunho</option>
                                <option value="PUBLISHED">Publicado</option>
                            </select>
                            <div class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                Recomendo criar como "Rascunho" e publicar no detalhe.
                            </div>
                        </label>

                        <label class="md:col-span-12">
                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Descrição</div>
                            <textarea v-model="form.description" rows="5"
                                class="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                                placeholder="Objetivo da trilha, o que a pessoa vai aprender e o resultado esperado." />
                        </label>
 
                    </div>

                    <!-- CTA secundário -->
                    <div
                        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 px-4 py-3">
                        <div class="text-sm text-slate-600 dark:text-slate-300">
                            Próximo passo após criar: <span class="font-semibold">vínculos</span>
                            (cargos/cidades/departamentos/usuários) e <span class="font-semibold">itens</span>.
                        </div>
                        <button
                            class="rounded-xl bg-slate-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                            :disabled="saving" @click="save">
                            {{ saving ? 'Salvando...' : 'Criar e configurar vínculos' }}
                        </button>
                    </div>
                </div>
            </section>

            <!-- Side help -->
            <aside
                class="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div class="border-b border-slate-100 dark:border-slate-800 px-6 py-5">
                    <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Checklist rápido</h3>
                    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Para publicar com qualidade.</p>
                </div>

                <div class="p-6 space-y-4 text-sm">
                    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                        <div class="font-semibold text-slate-900 dark:text-white">1) Vínculos</div>
                        <div class="mt-1 text-slate-600 dark:text-slate-300">
                            Defina cargos / cidade / depto. Se não existir, vincule usuários.
                        </div>
                    </div>

                    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                        <div class="font-semibold text-slate-900 dark:text-white">2) Etapas (itens)</div>
                        <div class="mt-1 text-slate-600 dark:text-slate-300">
                            Comece por uma introdução (TEXT) + 3 a 7 itens. Marque o que é obrigatório.
                        </div>
                    </div>

                    <div class="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                        <div class="font-semibold text-slate-900 dark:text-white">3) Publicação</div>
                        <div class="mt-1 text-slate-600 dark:text-slate-300">
                            Publique só quando a trilha estiver consistente.
                        </div>
                    </div>

                    <div class="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                        Observação: a “Audiência” é um filtro do módulo. Os “Vínculos” são o controle fino
                        (cargos/cidade/depto/usuários).
                    </div>
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
