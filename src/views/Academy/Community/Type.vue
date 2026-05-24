<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader title="Comunidade" :subtitle="title" :backTo="{ name: 'AcademyPanel' }" :breadcrumbs="[
            { label: 'Academy', to: { name: 'AcademyPanel' } },
            { label: 'Comunidade' },
        ]">
            <template #actions>
                <div class="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                    <div class="relative w-full md:w-80">
                        <input v-model="q" type="text" placeholder="Buscar tópicos..." @keyup.enter="reload(1)"
                            class="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-4 pr-11 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                        <button type="button" @click="reload(1)" aria-label="Buscar"
                            class="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-700">
                            <i class="fa-solid fa-magnifying-glass text-sm"></i>
                        </button>
                    </div>
                    <button type="button"
                        @click="router.push({ name: 'AcademyCommunityMyTopics', params: { type: typeParam } })"
                        class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                        <i class="fa-regular fa-bookmark"></i>
                        Meus tópicos
                    </button>
                </div>
            </template>
        </AcademyPageHeader>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <!-- MENU LATERAL (tipos) -->
            <aside class="lg:col-span-3">
                <div
                    class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                        <h2 class="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                            <i class="fa-solid fa-comments text-amber-500"></i>
                            Tipos
                        </h2>
                        <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            <span class="font-semibold text-slate-900 dark:text-slate-200">{{ store.total }}</span>
                            tópicos
                        </p>
                        <div class="mt-3 flex flex-wrap gap-2">
                            <button type="button" @click="setStatus('OPEN')"
                                class="rounded-full border px-3 py-1 text-xs font-semibold transition-all"
                                :class="status === 'OPEN' ? activePillClasses : idlePillClasses">
                                Abertos
                            </button>
                            <button type="button" @click="setStatus('CLOSED')"
                                class="rounded-full border px-3 py-1 text-xs font-semibold transition-all"
                                :class="status === 'CLOSED' ? activePillClasses : idlePillClasses">
                                Fechados
                            </button>
                        </div>
                    </div>

                    <div class="flex flex-col gap-1 p-2">
                        <button v-for="t in types" :key="t.key" type="button" @click="goType(t.key)"
                            class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors"
                            :class="typeParam === t.key
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'">
                            <i class="fa-solid text-xs opacity-70"
                                :class="{ questions: 'fa-circle-question', discussions: 'fa-comments', suggestions: 'fa-lightbulb', incidents: 'fa-triangle-exclamation' }[t.key]"></i>
                            {{ t.label }}
                        </button>
                    </div>
                </div>
            </aside>

            <!-- CONTEÚDO (lista) -->
            <main class="lg:col-span-9">
                <div v-if="store.error"
                    class="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    {{ store.error }}
                </div>

                <div
                    class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div
                        class="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                        <div class="text-sm text-slate-600 dark:text-slate-400">
                            <span class="font-semibold text-slate-900 dark:text-slate-200">{{ store.total }}</span>
                            tópicos • <span class="font-semibold">{{ title }}</span>
                            <span v-if="q?.trim()">• busca: "{{ q }}"</span>
                        </div>

                        <button type="button" @click="openCreateModal"
                            class="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 active:scale-95">
                            <i class="fa-solid fa-plus text-xs"></i>
                            Novo tópico
                        </button>
                    </div>

                    <div class="p-2">
                        <ul v-if="store.list?.length" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <li v-for="it in store.list" :key="it.id" @click="openTopic(it.id)"
                                class="group flex cursor-pointer items-start justify-between gap-3 rounded-xl px-3 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <div class="min-w-0">
                                    <div class="mb-2 flex flex-wrap items-center gap-2">
                                        <p
                                            class="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-400">
                                            {{ it.title }}
                                        </p>

                                        <span v-if="Number(it.acceptedPostId) > 0"
                                            class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                            <i class="fa-solid fa-circle-check text-[9px]"></i> resolvido
                                        </span>

                                        <span
                                            class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                            :class="topicStatusPillClass(it)">
                                            {{ topicStatusPillLabel(it) }}
                                        </span>

                                        <span v-if="it.categorySlug"
                                            class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                            {{ categoryName(it.categorySlug, it.type) }}
                                        </span>
                                    </div>

                                    <div class="flex flex-wrap items-center gap-1.5">
                                        <span v-for="tag in (it.tags || []).slice(0, 3)" :key="tag"
                                            class="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                                            #{{ tag }}
                                        </span>
                                    </div>

                                    <div class="mt-2 text-xs text-slate-500 dark:text-slate-500">
                                        <span v-if="it?.createdBy?.username">
                                            Criado por
                                            <span class="font-semibold text-slate-700 dark:text-slate-200">{{
                                                it.createdBy.username }}</span>
                                        </span>
                                        <span v-if="it.createdAt">• {{ formatDateTime(it.createdAt) }}</span>

                                        <template v-if="it?.updatedBy?.username && it.updatedAt">
                                            <span>•</span>
                                            <span>
                                                Última edição por
                                                <span class="font-semibold text-slate-700 dark:text-slate-200">{{
                                                    it.updatedBy.username }}</span>
                                                • {{ formatDateTime(it.updatedAt) }}
                                            </span>
                                        </template>
                                    </div>
                                </div>

                                <i
                                    class="fa-solid fa-chevron-right mt-1 text-xs text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-600"></i>
                            </li>
                        </ul>

                        <div v-else class="px-3 py-12 text-center">
                            <i class="fa-regular fa-comments text-3xl text-slate-300 dark:text-slate-700"></i>
                            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">Nenhum tópico encontrado.</p>
                        </div>

                        <div
                            class="mt-2 flex items-center justify-between border-t border-slate-100 px-3 py-4 dark:border-slate-800">
                            <button type="button" :disabled="store.page <= 1" @click="reload(store.page - 1)"
                                class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                                <i class="fa-solid fa-chevron-left text-[10px]"></i>
                                Anterior
                            </button>

                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Página {{ store.page }}
                            </div>

                            <button type="button" :disabled="store.page * store.pageSize >= store.total"
                                @click="reload(store.page + 1)"
                                class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                                Próxima
                                <i class="fa-solid fa-chevron-right text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <!-- MODAL -->
        <div v-if="openCreate"
            class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div
                class="scale-in flex h-[90%] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div
                    class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div>
                        <h2 class="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                            <i class="fa-solid fa-pen-to-square text-indigo-500"></i>
                            Novo tópico
                        </h2>
                        <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                            Crie uma dúvida, discussão ou incidente
                        </p>
                    </div>

                    <button type="button" @click="closeModal"
                        class="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="space-y-4 overflow-auto p-5">
                    <div class="grid grid-cols-1 gap-3 md:grid-cols-12">
                        <div class="md:col-span-8">
                            <label
                                class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Título</label>
                            <input v-model="form.title" placeholder="Título do tópico"
                                class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                        </div>

                        <div class="grid w-full grid-cols-1 gap-3 md:col-span-4 md:grid-cols-12">
                            <div class="md:col-span-6">
                                <label
                                    class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                    Tipo
                                </label>
                                <select v-model="form.type"
                                    class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60">
                                    <option v-for="t in metaTypes" :key="t.value" :value="t.value">
                                        {{ t.label }}
                                    </option>
                                </select>
                            </div>

                            <div class="md:col-span-6">
                                <label
                                    class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                    Categoria
                                </label>
                                <select v-model="form.categorySlug"
                                    class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60">
                                    <option v-for="c in categoryOptionsByFormType" :key="c.slug" :value="c.slug">
                                        {{ c.name }}
                                    </option>
                                </select>
                                <p v-if="!categoryOptionsByFormType.length"
                                    class="mt-2 text-xs text-rose-600 dark:text-rose-400">
                                    Nenhuma categoria disponível para este tipo.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div
                        class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <div
                            class="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                            <div>
                                <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Conteúdo</h3>
                                <p class="text-xs text-slate-500 dark:text-slate-400">Markdown com embeds (@)</p>
                            </div>
                            <button type="button" @click="applyTopicTemplate"
                                class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-900/60 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40">
                                <i class="fa-solid fa-shapes text-[10px]"></i>
                                Usar modelo de {{ topicTypeLabel(form.type) }}
                            </button>
                        </div>
                        <div class="p-4">
                            <TokenEditor v-model="form.body" v-model:modelPayload="form.payload" :rows="10"
                                placeholder="# Contexto&#10;&#10;## Detalhes&#10;- ...&#10;" />
                        </div>
                    </div>

                    <div>
                        <label
                            class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Tags</label>
                        <input v-model="form.tagsText" placeholder="Tags (separadas por vírgula)"
                            class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-700 dark:focus:ring-indigo-950/60" />
                        <p class="mt-1 text-xs text-slate-500 dark:text-slate-500">
                            Ex: crm, procedimentos, propostas
                        </p>
                    </div>

                    <div class="flex gap-2 pt-2">
                        <button type="button" :disabled="submitting || !canSubmit" @click="submit"
                            class="flex-1 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 disabled:opacity-40 md:flex-none">
                            {{ submitting ? 'Criando...' : 'Criar Tópico' }}
                        </button>

                        <button type="button" :disabled="submitting" @click="closeModal"
                            class="flex-1 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 md:flex-none">
                            Cancelar
                        </button>
                    </div>

                    <div v-if="submitError" class="text-sm font-medium text-rose-700 dark:text-rose-400">
                        {{ submitError }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import TokenEditor from '@/views/Academy/components/TokenEditor.vue';
import { useAcademyCommunityStore } from '@/stores/Academy/academyCommunityStore';

const route = useRoute();
const router = useRouter();
const store = useAcademyCommunityStore();

const activePillClasses = 'border-indigo-600 bg-indigo-600 text-white shadow-sm';
const idlePillClasses = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700';

const typeParam = computed(() => String(route.params.type || 'questions'));
const q = ref('');
const status = ref('OPEN');

let qTimer = null;

watch(
    () => q.value,
    () => {
        clearTimeout(qTimer);
        qTimer = setTimeout(() => reload(1), 10);
    }
);

const types = [
    { key: 'questions', label: 'Dúvidas' },
    { key: 'discussions', label: 'Discussões' },
    { key: 'suggestions', label: 'Sugestões' },
    { key: 'incidents', label: 'Incidentes' },
];

const title = computed(() => ({
    questions: 'Dúvidas',
    discussions: 'Discussões',
    suggestions: 'Sugestões',
    incidents: 'Incidentes',
}[typeParam.value] || 'Comunidade'));

const categoriesByType = computed(() => store.meta?.categories || {});

// tipos vindos do backend (labels oficiais)
const metaTypes = computed(() => {
    const list = Array.isArray(store.meta?.types) ? store.meta.types : [];
    // fallback se meta ainda não veio
    return list.length
        ? list
        : [
            { key: 'questions', label: 'Dúvidas', value: 'QUESTION' },
            { key: 'discussions', label: 'Discussões', value: 'DISCUSSION' },
            { key: 'suggestions', label: 'Sugestões', value: 'SUGGESTION' },
            { key: 'incidents', label: 'Incidentes', value: 'INCIDENT' },
        ];
});

// categorias baseadas no type escolhido no modal
const categoryOptionsByFormType = computed(() => {
    const t = String(form.type || 'QUESTION');
    return categoriesByType.value?.[t] || [];
});

// para exibir o nome no card da lista
function categoryNameFromType(typeEnum, slug) {
    const list = categoriesByType.value?.[String(typeEnum || '')] || [];
    const found = list.find(x => x.slug === slug);
    return found?.name || slug;
}
function categoryName(slug, itType) {
    // se você tem it.type na listagem (você tem), usa it.type
    return categoryNameFromType(itType || apiType.value, String(slug || ''));
}

const openCreate = ref(false);
const submitting = ref(false);
const submitError = ref('');

const form = reactive({
    title: '',
    type: 'QUESTION',          // <--- NOVO (ENUM)
    categorySlug: 'geral',
    body: '',
    payload: { embeds: [], widgets: { quiz: {}, task: {} } },
    tagsText: '',
});

const canSubmit = computed(() => form.title.trim() && form.categorySlug.trim() && form.body.trim());

function normalizeTopicStatus(s) {
    const v = String(s || '').toUpperCase();
    return v === 'CLOSED' ? 'CLOSED' : 'OPEN';
}
function topicStatusPillLabel(it) {
    return normalizeTopicStatus(it?.status) === 'CLOSED' ? 'fechado' : 'aberto';
}
function topicStatusPillClass(it) {
    return normalizeTopicStatus(it?.status) === 'CLOSED'
        ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
}

function formatDateTime(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

async function reload(page = 1) {
    await store.fetchTopics({
        type: typeParam.value,
        q: q.value,
        status: status.value,
        audience: 'BOTH',
        page,
        pageSize: 20,
    });
}

async function openCreateModal() {
    if (!store.meta?.categories || !store.meta?.types) await store.fetchMeta();

    // default: tipo do route atual (questions/discussions/etc) -> enum
    const defaultType = ({
        questions: 'QUESTION',
        discussions: 'DISCUSSION',
        suggestions: 'SUGGESTION',
        incidents: 'INCIDENT',
    }[typeParam.value] || 'QUESTION');

    form.type = defaultType;

    const opts = categoriesByType.value?.[form.type] || [];
    form.categorySlug = opts?.[0]?.slug || 'geral';

    openCreate.value = true;
}

async function goType(t) {
    if (t === typeParam.value) return;

    q.value = '';
    status.value = 'OPEN';

    await router.push({ name: 'AcademyCommunityType', params: { type: t } });
    await nextTick();
    await reload(1);
}

function setStatus(s) {
    status.value = s;
    reload(1);
}

function openTopic(id) {
    router.push({ name: 'AcademyCommunityTopic', params: { id }, query: { type: typeParam.value } });
}

function closeModal() {
    if (submitting.value) return;
    openCreate.value = false;
    submitError.value = '';
}

function resetForm() {
    form.title = '';
    form.categorySlug = 'geral';
    form.body = '';
    form.payload = { embeds: [], widgets: { quiz: {}, task: {} } };
    form.tagsText = '';
}

function parseTags(text) {
    return String(text || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
}

function topicTypeLabel(t) {
    return ({
        QUESTION: 'dúvida',
        DISCUSSION: 'discussão',
        SUGGESTION: 'sugestão',
        INCIDENT: 'incidente',
    }[String(t || '').toUpperCase()]) || 'tópico';
}

// Modelos prontos por tipo — preenchem o corpo com uma estrutura comum.
const TOPIC_TEMPLATES = {
    QUESTION: `## Contexto

Descreva o cenário em que você está.

## O que eu esperava

O comportamento ou resultado esperado.

## O que aconteceu

O que realmente aconteceu.

## O que já tentei

- ...
- ...
`,
    DISCUSSION: `## Tópico

Defina claramente o que está em debate.

## Posição inicial

Seu ponto de vista ou o cenário sob análise.

## Pontos a discutir

- ...
- ...
`,
    SUGGESTION: `## Problema observado

O que hoje não está bom.

## Sugestão

A proposta de melhoria.

## Impacto esperado

Por que isso vale a pena.
`,
    INCIDENT: `## O que aconteceu

Descreva o incidente.

## Quando

Data, hora e em que situação.

## Impacto

Quem foi afetado e como.

## O que já tentei

- ...
- ...
`,
};

function applyTopicTemplate() {
    const tpl = TOPIC_TEMPLATES[String(form.type || '').toUpperCase()];
    if (!tpl) return;
    const has = !!(form.body && form.body.trim());
    if (has && !window.confirm('Substituir o conteúdo atual pelo modelo de ' + topicTypeLabel(form.type) + '?')) return;
    form.body = tpl;
}

async function submit() {
    submitError.value = '';
    submitting.value = true;

    try {
        await store.createTopic({
            title: form.title,
            type: form.type,                 // <--- ENUM
            categorySlug: form.categorySlug,
            body: form.body,
            payload: form.payload,
            tags: parseTags(form.tagsText),
            audience: 'BOTH',
        });

        openCreate.value = false;
        resetForm();
        await reload(1);
    } catch (e) {
        submitError.value = e?.message || 'Erro ao criar tópico';
    } finally {
        submitting.value = false;
    }
}

watch(
    () => form.type,
    () => {
        const opts = categoryOptionsByFormType.value;
        if (!opts.some(c => c.slug === form.categorySlug)) {
            form.categorySlug = opts?.[0]?.slug || 'geral';
        }
    }
);

onMounted(async () => {
    if (!store.meta?.categories) await store.fetchMeta();
    await reload(1);
});
</script>
