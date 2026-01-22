<template>
    <div class="space-y-4">
        <AcademyPageHeader title="Comunidade" :subtitle="title" :backTo="{ name: 'AcademyPanel' }" :breadcrumbs="[
            { label: 'Academy', to: { name: 'AcademyPanel' } },
            { label: 'Comunidade' },
        ]">
            <template #actions>
                <div class="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                    <div class="relative w-full md:w-[420px]">
                        <input v-model="q" type="text"
                            class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 pr-10 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="Buscar tópicos..." @keyup.enter="reload(1)" />
                        <button
                            class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            @click="reload(1)">
                            ⌕
                        </button>
                    </div>
                    <button
                        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        @click="router.push({ name: 'AcademyCommunityMyTopics', params: { type: typeParam } })">
                        Meus tópicos
                    </button>

                </div>
            </template>
        </AcademyPageHeader>
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <!-- MENU LATERAL (tipos) -->
            <aside class="lg:col-span-3">
                <div
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors overflow-hidden">
                    <div class="flex justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                        <div class="flex flex-col gap-2">
                            <h2 class="text-base font-semibold text-slate-900 dark:text-white">Tipos</h2>
                            <p class="text-sm text-slate-500 dark:text-slate-400">
                                <span class="font-semibold text-slate-900 dark:text-slate-200">{{ store.total }}</span>
                                Tópicos.
                            </p>
                        </div>
                        <div class="flex flex-wrap gap-2 my-auto">
                            <button class="rounded-full border px-3 py-1 text-sm font-medium transition-all"
                                :class="status === 'OPEN' ? activePillClasses : idlePillClasses"
                                @click="setStatus('OPEN')">
                                Abertos
                            </button>
                            <button class="rounded-full border px-3 py-1 text-sm font-medium transition-all"
                                :class="status === 'CLOSED' ? activePillClasses : idlePillClasses"
                                @click="setStatus('CLOSED')">
                                Fechados
                            </button>
                        </div>
                    </div>

                    <div class="flex flex-col gap-1 p-2">
                        <button v-for="t in types" :key="t.key"
                            class="w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors" :class="typeParam === t.key
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'"
                            @click="goType(t.key)">
                            {{ t.label }}
                        </button>
                    </div>

                </div>

            </aside>

            <!-- CONTEÚDO (lista + filtros) -->
            <main class="lg:col-span-9">
                <div v-if="store.error"
                    class="mb-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
                    {{ store.error }}
                </div>

                <div
                    class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors overflow-hidden">
                    <div
                        class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                        <div class="text-sm text-slate-600 dark:text-slate-400">
                            <span class="font-semibold text-slate-900 dark:text-slate-200">{{ store.total }}</span>
                            Tópicos • <span class="font-semibold">{{ title }}</span>
                            <span v-if="q?.trim()">• busca: "{{ q }}"</span>
                        </div>

                        <button
                            class="rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2.5 text-sm font-medium text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white transition-all active:scale-95"
                            @click="openCreateModal">
                            Novo tópico
                        </button>
                    </div>

                    <div class="p-2">
                        <ul v-if="store.list?.length" class="divide-y divide-slate-100 dark:divide-slate-800">
                            <!-- seu <li> 그대로 -->
                            <li v-for="it in store.list" :key="it.id"
                                class="flex items-start justify-between gap-3 rounded-xl px-3 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                @click="openTopic(it.id)">
                                <!-- ... (mantém seu conteúdo igual) ... -->
                                <div class="min-w-0">
                                    <div class="flex flex-wrap items-center gap-2 mb-2">
                                        <p
                                            class="truncate text-sm font-semibold text-slate-900 dark:text-slate-200 group-hover:text-slate-700 dark:group-hover:text-white transition-colors">
                                            {{ it.title }}
                                        </p>

                                        <span v-if="Number(it.acceptedPostId) > 0"
                                            class="rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                            resolvido
                                        </span>

                                        <span
                                            class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                            :class="topicStatusPillClass(it)">
                                            {{ topicStatusPillLabel(it) }}
                                        </span>

                                        <span v-if="it.categorySlug"
                                            class="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                            {{ categoryName(it.categorySlug, it.type) }}
                                        </span>
                                    </div>

                                    <div class="flex flex-wrap items-center gap-2">
                                        <span v-for="tag in (it.tags || []).slice(0, 3)" :key="tag"
                                            class="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
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

                                <span
                                    class="text-slate-400 dark:text-slate-600 group-hover:translate-x-1 transition-transform">›</span>
                            </li>
                        </ul>

                        <div v-else class="px-3 py-10 text-sm text-slate-500 dark:text-slate-400 text-center">
                            Nenhum tópico encontrado.
                        </div>

                        <div
                            class="flex items-center justify-between px-3 py-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                            <button
                                class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                                :disabled="store.page <= 1" @click="reload(store.page - 1)">
                                Anterior
                            </button>

                            <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Página {{ store.page }}
                            </div>

                            <button
                                class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                                :disabled="store.page * store.pageSize >= store.total" @click="reload(store.page + 1)">
                                Próxima
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <!-- MODAL -->
        <div v-if="openCreate"
            class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div
                class="w-full max-w-3xl h-[90%] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all scale-in">
                <div
                    class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                    <div>
                        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Novo tópico</h2>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Crie uma dúvida, discussão ou incidente
                        </p>
                    </div>

                    <button
                        class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        @click="closeModal">
                        ✕
                    </button>
                </div>

                <div class="space-y-4 p-5">
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div class="md:col-span-8">
                            <label
                                class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Título</label>
                            <input v-model="form.title"
                                class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all"
                                placeholder="Título do tópico" />
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-12 md:col-span-4 w-full gap-3">
                            <div class="md:col-span-6">
                                <label
                                    class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Tipo
                                </label>

                                <select v-model="form.type"
                                    class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all">
                                    <option v-for="t in metaTypes" :key="t.value" :value="t.value">
                                        {{ t.label }}
                                    </option>
                                </select>
                            </div>

                            <div class="md:col-span-6">
                                <label
                                    class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    Categoria
                                </label>

                                <select v-model="form.categorySlug"
                                    class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all">
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
                        class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                        <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-3">
                            <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Conteúdo</h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400">Markdown com embeds (@)</p>
                        </div>

                        <div class="p-4">
                            <TokenEditor v-model="form.body" v-model:modelPayload="form.payload" :rows="10"
                                placeholder="# Contexto&#10;&#10;## Detalhes&#10;- ...&#10;" />
                        </div>
                    </div>

                    <div>
                        <label
                            class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tags</label>
                        <input v-model="form.tagsText"
                            class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all"
                            placeholder="Tags (separadas por vírgula)" />
                        <p class="mt-1 text-xs text-slate-500 dark:text-slate-500">
                            Ex: crm, procedimentos, propostas
                        </p>
                    </div>

                    <div class="flex gap-2 pt-2">
                        <button
                            class="flex-1 md:flex-none rounded-xl bg-slate-900 dark:bg-slate-100 px-6 py-2.5 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 transition-all"
                            :disabled="submitting || !canSubmit" @click="submit">
                            {{ submitting ? 'Criando...' : 'Criar Tópico' }}
                        </button>

                        <button
                            class="flex-1 md:flex-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-all"
                            :disabled="submitting" @click="closeModal">
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

const activePillClasses = 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm';
const idlePillClasses = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700';

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
        ? 'bg-slate-100 text-slate-700'
        : 'bg-amber-50 text-amber-700';
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
