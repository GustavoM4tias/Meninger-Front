<template>
    <div class="space-y-4">
        <AcademyPageHeader :title="headerTitle" subtitle="KB • criar e editar artigos" :backTo="{ name: 'AcademyKB' }"
            :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Artigos', to: { name: 'AcademyKB' } },
                { label: isEdit ? 'Editar' : 'Novo' }
            ]">
            <template #actions>
                <div class="flex flex-col gap-2 md:flex-row md:items-center">
                    <button
                        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-all"
                        :disabled="!canSave" @click="save">
                        Salvar
                    </button>

                    <button
                        class="rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2.5 text-sm font-medium text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 transition-all"
                        :disabled="!articleId" @click="togglePublish">
                        {{ isPublished ? 'Despublicar' : 'Publicar' }}
                    </button>
                </div>
            </template>
        </AcademyPageHeader>

        <div v-if="admin.error"
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
            {{ admin.error }}
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <!-- Meta -->
            <section
                class="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                    <h2 class="text-base font-semibold text-slate-900 dark:text-white">Dados</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Título, categoria e status</p>
                </div>

                <div class="p-5 space-y-4">
                    <div>
                        <label
                            class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Título</label>
                        <input v-model="title" type="text"
                            class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all placeholder:text-slate-400"
                            placeholder="Ex: Fluxo comercial do Gestor" />
                    </div>

                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <input id="useExistingCategory" type="checkbox" v-model="useExistingCategory" />
                            <label for="useExistingCategory"
                                class="text-sm font-medium text-slate-700 dark:text-slate-200">
                                Usar categoria existente
                            </label>
                        </div>

                        <div v-if="useExistingCategory">
                            <label
                                class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Categoria</label>
                            <select v-model="categorySlug"
                                class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all">
                                <option value="" disabled>Selecione uma categoria</option>
                                <option v-for="c in kb.categories" :key="c.slug" :value="c.slug">
                                    {{ c.name }} ({{ c.slug }})
                                </option>
                            </select>
                        </div>

                        <div v-else>
                            <label
                                class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                Categoria (slug)
                            </label>
                            <input v-model="categorySlug" type="text"
                                class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all placeholder:text-slate-400"
                                placeholder="Ex: processos-comerciais" />
                            <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-500">
                                Use kebab-case. Ex: operacao-e-suporte
                            </p>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 pt-2">
                        <span class="rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-tight" :class="isPublished
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'">
                            {{ isPublished ? 'publicado' : 'rascunho' }}
                        </span> 
                    </div>
                </div>
            </section>

            <!-- Editor -->
            <section
                class="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                    <h2 class="text-base font-semibold text-slate-900 dark:text-white">Conteúdo</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Markdown com embeds (@)</p>
                </div>

                <div class="p-5">
                    <TokenEditor v-model="body" v-model:modelPayload="payload" :rows="18"
                        placeholder="# Objetivo&#10;&#10;## Pré-requisitos&#10;- ...&#10;&#10;## Passo a passo&#10;1) ...&#10;" />
                </div>
            </section>
        </div>

        <div
            class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-sm text-slate-600 dark:text-slate-400">
            <p class="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                <span class="text-amber-500">💡</span> Padrão de artigo
            </p>
            <p class="mt-1">
                Sempre use:
                <span class="font-mono text-xs">objetivo → pré-requisitos → passo a passo → validação → erros
                    comuns</span>.
            </p>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';

import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import TokenEditor from '@/views/Academy/components/TokenEditor.vue';

import { useAcademyKbAdminStore } from '@/stores/Academy/academyKbAdminStore';
import { useAcademyKbStore } from '@/stores/Academy/academyKbStore';

const route = useRoute();
const admin = useAcademyKbAdminStore();
const kb = useAcademyKbStore();

const articleId = ref(route.params.id ? Number(route.params.id) : null);
const isEdit = computed(() => !!articleId.value);

const title = ref('');
const categorySlug = ref('');
const body = ref('');

// payload do artigo
const payload = ref({ embeds: [], widgets: { quiz: {}, task: {} } });

// categoria existente
const useExistingCategory = ref(true);

const headerTitle = computed(() => (isEdit.value ? 'Editar artigo' : 'Novo artigo'));

const isPublished = computed(() => {
    const st = admin.lastSaved?.status;
    return st === 'PUBLISHED';
});

const canSave = computed(() => title.value.trim() && categorySlug.value.trim());

watch(useExistingCategory, async (v) => {
    if (!v) return;

    if (!kb.categories?.length) {
        await kb.fetchCategories({ audience: 'BOTH' });
    }

    if (categorySlug.value && !kb.categories.some((c) => c.slug === categorySlug.value)) {
        categorySlug.value = '';
    }
});

async function save() {
    if (!canSave.value) return;

    try {
        if (!articleId.value) {
            const created = await admin.createArticle({
                title: title.value,
                categorySlug: categorySlug.value,
                body: body.value,
                payload: payload.value,
            });

            articleId.value = created?.id || null;
            admin.lastSaved = created || null;
            return;
        }

        const updated = await admin.updateArticle(articleId.value, {
            title: title.value,
            categorySlug: categorySlug.value,
            body: body.value,
            payload: payload.value,
        });

        admin.lastSaved = updated;
    } catch (e) {
        console.error(e);
    }
}

async function togglePublish() {
    if (!articleId.value) return;
    const next = !isPublished.value;
    const r = await admin.setPublish(articleId.value, next);
    admin.lastSaved = r;
}

onMounted(async () => {
    await kb.fetchCategories({ audience: 'BOTH' });

    if (!articleId.value) return;

    const a = await admin.fetchById(articleId.value);
    if (!a) return;

    title.value = a.title || '';
    categorySlug.value = a.categorySlug || '';
    body.value = a.body || '';
    payload.value = a.payload && typeof a.payload === 'object'
        ? a.payload
        : { embeds: [], widgets: { quiz: {}, task: {} } };

    admin.lastSaved = a;
});
</script>
