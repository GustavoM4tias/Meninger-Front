<template>
    <div class="space-y-4">
        <AcademyPageHeader title="Comunidade" :subtitle="title" :backTo="{ name: 'AcademyPanel' }" :breadcrumbs="[
            { label: 'Academy', to: { name: 'AcademyPanel' } },
            { label: 'Comunidade' }
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
                        class="rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2.5 text-sm font-medium text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white transition-all active:scale-95"
                        @click="openCreate = true">
                        Novo tópico
                    </button>
                </div>
            </template>
        </AcademyPageHeader>

        <div class="flex flex-col gap-3">
            <div class="flex flex-wrap gap-2">
                <button v-for="t in types" :key="t.key" 
                    class="rounded-full border px-3 py-1 text-sm font-medium transition-all"
                    :class="typeParam === t.key ? activePillClasses : idlePillClasses" 
                    @click="goType(t.key)">
                    {{ t.label }}
                </button>
            </div>

            <div class="flex flex-wrap gap-2">
                <button class="rounded-full border px-3 py-1 text-sm font-medium transition-all"
                    :class="status === 'OPEN' ? activePillClasses : idlePillClasses" @click="setStatus('OPEN')">
                    Abertos
                </button>
                <button class="rounded-full border px-3 py-1 text-sm font-medium transition-all"
                    :class="status === 'CLOSED' ? activePillClasses : idlePillClasses" @click="setStatus('CLOSED')">
                    Fechados
                </button>
            </div>
        </div>

        <div v-if="store.error" 
            class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
            {{ store.error }}
        </div>

        <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors overflow-hidden">
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                <div class="text-sm text-slate-600 dark:text-slate-400">
                    <span class="font-semibold text-slate-900 dark:text-slate-200">{{ store.total }}</span> tópicos • status: <span class="capitalize">{{ status.toLowerCase() }}</span>
                </div>
            </div>

            <div class="p-2">
                <ul v-if="store.list?.length" class="divide-y divide-slate-100 dark:divide-slate-800">
                    <li v-for="it in store.list" :key="it.id"
                        class="flex items-start justify-between gap-3 rounded-xl px-3 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                        @click="openTopic(it.id)">
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2 mb-2">
                                <p class="truncate text-sm font-semibold text-slate-900 dark:text-slate-200 group-hover:text-slate-700 dark:group-hover:text-white transition-colors">
                                    {{ it.title }}
                                </p>

                                <span v-if="Number(it.acceptedPostId) > 0"
                                    class="rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                    resolvido
                                </span>

                                <span class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                                    :class="topicStatusPillClass(it)">
                                    {{ topicStatusPillLabel(it) }}
                                </span>
                            </div>

                            <div class="flex flex-wrap items-center gap-2">
                                <span v-for="tag in (it.tags || []).slice(0, 3)" :key="tag"
                                    class="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-400">
                                    #{{ tag }}
                                </span>
                            </div>
                        </div>

                        <span class="text-slate-400 dark:text-slate-600 group-hover:translate-x-1 transition-transform">›</span>
                    </li>
                </ul>

                <div v-else class="px-3 py-10 text-sm text-slate-500 dark:text-slate-400 text-center">
                    Nenhum tópico encontrado.
                </div>

                <div class="flex items-center justify-between px-3 py-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                    <button
                        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                        :disabled="store.page <= 1" @click="reload(store.page - 1)">
                        Anterior
                    </button>

                    <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Página {{ store.page }}</div>

                    <button
                        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                        :disabled="store.page * store.pageSize >= store.total" @click="reload(store.page + 1)">
                        Próxima
                    </button>
                </div>
            </div>
        </div>

        <div v-if="openCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div class="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all scale-in">
                <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                    <div>
                        <h2 class="text-base font-semibold text-slate-900 dark:text-white">Novo tópico</h2>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Crie uma dúvida, discussão ou incidente</p>
                    </div>
                    <button class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" @click="openCreate = false">
                        ✕
                    </button>
                </div>

                <div class="space-y-4 p-5">
                    <input v-model="form.title"
                        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all"
                        placeholder="Título do tópico" />

                    <textarea v-model="form.body" rows="6"
                        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all"
                        placeholder="Descreva com detalhes..." />

                    <input v-model="form.tagsText"
                        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all"
                        placeholder="Tags (separadas por vírgula)" />

                    <div class="flex gap-2 pt-2">
                        <button
                            class="flex-1 md:flex-none rounded-xl bg-slate-900 dark:bg-slate-100 px-6 py-2.5 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 transition-all"
                            :disabled="submitting || !form.title.trim() || !form.body.trim()" @click="submit">
                            {{ submitting ? 'Criando...' : 'Criar Tópico' }}
                        </button>

                        <button
                            class="flex-1 md:flex-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                            :disabled="submitting" @click="openCreate = false">
                            Cancelar
                        </button>
                    </div>

                    <div v-if="submitError" class="text-sm font-medium text-rose-700 dark:text-rose-400">{{ submitError }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyCommunityStore } from '@/stores/Academy/academyCommunityStore';

const route = useRoute();
const router = useRouter();
const store = useAcademyCommunityStore();
const activePillClasses = 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm';
const idlePillClasses = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700';
const typeParam = computed(() => String(route.params.type || 'questions'));

const q = ref('');
const status = ref('OPEN'); // OPEN | CLOSED

const types = [
    { key: 'questions', label: 'Dúvidas' },
    { key: 'discussions', label: 'Discussões' },
    { key: 'suggestions', label: 'Sugestões' },
    { key: 'incidents', label: 'Incidentes' },
];

const title = computed(() => {
    const map = {
        questions: 'Dúvidas',
        discussions: 'Discussões',
        suggestions: 'Sugestões',
        incidents: 'Incidentes',
    };
    return map[typeParam.value] || 'Comunidade';
});

const activePill = 'border-slate-900 bg-slate-900 text-white';
const idlePill = 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50';

const openCreate = ref(false);
const submitting = ref(false);
const submitError = ref('');
const form = reactive({ title: '', body: '', tagsText: '' });

// normalizador de status do item
function normalizeTopicStatus(s) {
    const v = String(s || '').toUpperCase();
    if (v === 'OPEN' || v === 'ABERTO') return 'OPEN';
    if (v === 'CLOSED' || v === 'FECHADO') return 'CLOSED';
    return 'OPEN';
}

function topicStatusPillLabel(it) {
    const st = normalizeTopicStatus(it?.status);
    return st === 'CLOSED' ? 'fechado' : 'aberto';
}

function topicStatusPillClass(it) {
    const st = normalizeTopicStatus(it?.status);
    return st === 'CLOSED'
        ? 'bg-slate-100 text-slate-700'
        : 'bg-amber-50 text-amber-700';
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

function goType(t) {
    router.push({ name: 'AcademyCommunityType', params: { type: t } });
}

function setStatus(s) {
    status.value = s;
    reload(1);
}

function openTopic(id) {
    router.push({
        name: 'AcademyCommunityTopic',
        params: { id },
        query: { type: typeParam.value }, // volta correta no detalhe
    });
}

async function submit() {
    submitError.value = '';
    submitting.value = true;
    try {
        const tags = form.tagsText.split(',').map(s => s.trim()).filter(Boolean);
        await store.createTopic({
            title: form.title,
            body: form.body,
            tags,
            type: typeParam.value,
            audience: 'BOTH',
        });
        openCreate.value = false;
        form.title = ''; form.body = ''; form.tagsText = '';
        await reload(1);
    } catch (e) {
        submitError.value = e?.message || 'Erro ao criar tópico';
    } finally {
        submitting.value = false;
    }
}

watch(() => route.params.type, () => reload(1));
onMounted(() => reload(1));
</script>
