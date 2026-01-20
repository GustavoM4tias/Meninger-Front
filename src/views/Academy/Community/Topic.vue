<template>
    <div class="space-y-4">
        <AcademyPageHeader :title="topicTitle" subtitle="Tópico • respostas e solução" :backTo="backTo"
            :breadcrumbs="breadcrumbs">
            <template #actions>
                <div class="flex items-center gap-2">
                    <span v-if="isSolved"
                        class="rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        resolvido
                    </span>

                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusPillClass">
                        {{ statusPillLabel }}
                    </span>

                    <button v-if="canClose"
                        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        @click="closeTopic">
                        Fechar tópico
                    </button>
                </div>
            </template>
        </AcademyPageHeader>

        <div class="mx-auto max-w-5xl">
            <div v-if="store.error" class="mb-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
                {{ store.error }}
            </div>

            <section class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors">
                <div class="flex flex-wrap items-center gap-2">
                    <span
                        class="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-700 dark:text-slate-400">
                        {{ topic?.type || 'topic' }}
                    </span>
                    <span class="text-xs text-slate-500 dark:text-slate-500">• {{ formatDate(topic?.createdAt) }}</span>
                </div>

                <div class="mt-4 prose prose-slate dark:prose-invert max-w-none" v-html="topicBodyHtml" />

                <div class="mt-6 flex flex-wrap gap-2">
                    <span v-for="tag in (topic?.tags || [])" :key="tag"
                        class="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                        #{{ tag }}
                    </span>
                </div>
            </section>

            <section class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
                <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                    <h2 class="text-base font-semibold text-slate-900 dark:text-white">Respostas</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400">{{ answers.length }} respostas</p>
                </div>

                <div class="p-4">
                    <div v-if="!answers.length" class="py-8 text-sm text-slate-500 dark:text-slate-400 text-center">
                        Ainda não há respostas.
                    </div>

                    <ul v-else class="space-y-4">
                        <li v-for="p in answers" :key="p.id" 
                            class="rounded-xl border transition-all p-5"
                            :class="isAccepted(p) 
                                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10 ring-1 ring-emerald-100 dark:ring-emerald-900/20' 
                                : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'">
                            
                            <div class="flex items-start justify-between gap-3 mb-4">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-slate-500 dark:text-slate-500">
                                        {{ formatDate(p.createdAt) }}
                                    </span>
                                    <span v-if="isAccepted(p)"
                                        class="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-emerald-700 dark:text-emerald-400">
                                        solução aceita
                                    </span>
                                </div>

                                <button v-if="canAccept && !isAccepted(p)"
                                    class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    @click="accept(p.id)">
                                    Marcar como solução
                                </button>
                            </div>

                            <div class="prose prose-sm prose-slate dark:prose-invert max-w-none" v-html="renderMd(p.body)" />
                        </li>
                    </ul>
                </div>
            </section>

            <section class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
                <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                    <h2 class="text-base font-semibold text-slate-900 dark:text-white">Responder</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Ajude a comunidade com sua experiência</p>
                </div>

                <div class="p-5">
                    <textarea v-model="reply" rows="6"
                        class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100 dark:focus:ring-slate-800 transition-all disabled:opacity-50 placeholder:text-slate-400"
                        :disabled="isClosed" placeholder="Escreva sua resposta detalhadamente..." />

                    <div class="mt-4 flex items-center justify-between">
                        <button
                            class="rounded-xl bg-slate-900 dark:bg-slate-100 px-6 py-2.5 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 transition-all active:scale-95"
                            :disabled="isClosed || !reply.trim() || sending" @click="send">
                            {{ sending ? 'Publicando...' : 'Publicar resposta' }}
                        </button>

                        <div v-if="sendError" class="text-sm font-medium text-rose-700 dark:text-rose-400">{{ sendError }}</div>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import { useAcademyCommunityStore } from '@/stores/Academy/academyCommunityStore';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const route = useRoute();
const store = useAcademyCommunityStore();

const id = Number(route.params.id);
const reply = ref('');
const sending = ref(false);
const sendError = ref('');

// origem para voltar corretamente
const backType = computed(() => String(route.query.type || 'questions'));

const current = computed(() => store.current);
const topic = computed(() => current.value?.topic || null);
const posts = computed(() => (Array.isArray(current.value?.posts) ? current.value.posts : []));

// --- status/solved padronizado ---
function normalizeTopicStatus(s) {
    const v = String(s || '').toUpperCase();
    if (v === 'OPEN' || v === 'ABERTO') return 'OPEN';
    if (v === 'CLOSED' || v === 'FECHADO') return 'CLOSED';
    return 'OPEN';
}

const status = computed(() => normalizeTopicStatus(topic.value?.status));
const isClosed = computed(() => status.value === 'CLOSED');

const isSolved = computed(() => Number(topic.value?.acceptedPostId) > 0);

const statusPillLabel = computed(() => (isClosed.value ? 'fechado' : 'aberto'));
const statusPillClass = computed(() =>
    isClosed.value ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'
);

// regras de ação
const canClose = computed(() => !isClosed.value);
const canAccept = computed(() => !isClosed.value);

// header + navegação
const topicTitle = computed(() => topic.value?.title || 'Tópico');

const backTo = computed(() => ({
    name: 'AcademyCommunityType',
    params: { type: backType.value },
}));

const breadcrumbs = computed(() => [
    { label: 'Academy', to: { name: 'AcademyPanel' } },
    { label: 'Comunidade', to: { name: 'AcademyCommunityType', params: { type: backType.value } } },
    { label: 'Tópico' },
]);

const topicBodyHtml = computed(() => {
    const first = posts.value.find(p => p.type === 'COMMENT');
    const raw = String(first?.body || '');
    return DOMPurify.sanitize(marked.parse(raw));
});

const answers = computed(() => posts.value.filter(p => p.type === 'ANSWER'));

function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function renderMd(md) {
    return DOMPurify.sanitize(marked.parse(String(md || '')));
}

function isAccepted(p) {
    return Number(topic.value?.acceptedPostId) === Number(p?.id);
}

async function load() {
    await store.fetchTopic(id, { audience: 'BOTH' });
}

async function send() {
    sendError.value = '';
    try {
        sending.value = true;
        await store.createPost(id, { body: reply.value, type: 'ANSWER' });
        reply.value = '';
        await load();
    } catch (e) {
        sendError.value = e?.message || 'Erro ao publicar';
    } finally {
        sending.value = false;
    }
}

async function accept(postId) {
    await store.acceptPost(id, postId);
    await load();
}

async function closeTopic() {
    await store.closeTopic(id);
    await load();
}

onMounted(load);
</script>
