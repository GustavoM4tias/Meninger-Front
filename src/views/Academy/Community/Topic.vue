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

                    <button v-if="canReopen"
                        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        @click="reopenTopic">
                        Reabrir tópico
                    </button>
                </div>
            </template>
        </AcademyPageHeader>

        <div class="mx-auto max-w-5xl">
            <div v-if="store.error"
                class="mb-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
                {{ store.error }}
            </div>

            <!-- Tópico -->
            <section
                class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-colors">
                <div class="flex flex-wrap items-center gap-2">
                    <span
                        class="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-700 dark:text-slate-400">
                        {{ topic?.type || 'topic' }}
                    </span>

                    <span v-if="topic?.categorySlug"
                        class="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-700 dark:text-slate-400">
                        {{ categoryLabel }}
                    </span>

                    <span class="text-xs text-slate-500 dark:text-slate-500">• {{ formatDateTime(topic?.createdAt)
                        }}</span>
                </div>

                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                    <span v-if="topic?.createdBy?.username">
                        Criado por
                        <span class="font-semibold text-slate-700 dark:text-slate-200">{{ topic.createdBy.username
                            }}</span>
                    </span>

                    <template v-if="topic?.updatedBy?.username && topic?.updatedAt">
                        <span>•</span>
                        <span>
                            Última edição por
                            <span class="font-semibold text-slate-700 dark:text-slate-200">{{ topic.updatedBy.username
                                }}</span>
                            • {{ formatDateTime(topic.updatedAt) }}
                        </span>
                    </template>

                    <template v-if="topic?.acceptedBy?.username && topic?.acceptedAt">
                        <span>•</span>
                        <span>
                            Solução aceita por
                            <span class="font-semibold text-slate-700 dark:text-slate-200">{{ topic.acceptedBy.username
                                }}</span>
                            • {{ formatDateTime(topic.acceptedAt) }}
                        </span>
                    </template>
                </div>

                <div class="mt-4 prose prose-slate dark:prose-invert max-w-none">
                    <TokenRenderer :content="firstPost?.body || ''" :payload="firstPost?.payload || null" item-type=""
                        item-key="" />
                </div>

                <div class="mt-6 flex flex-wrap gap-2">
                    <span v-for="tag in (topic?.tags || [])" :key="tag"
                        class="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                        #{{ tag }}
                    </span>
                </div>
            </section>

            <!-- Responder -->
            <section
                class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
                <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                    <h2 class="text-base font-semibold text-slate-900 dark:text-white">Responder</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Ajude a comunidade com sua experiência</p>
                </div>

                <div class="p-5">
                    <TokenEditor v-model="reply" v-model:modelPayload="replyPayload" :rows="8" :disabled="isClosed"
                        placeholder="Escreva sua resposta..." />

                    <div class="mt-4 flex items-center justify-between">
                        <button
                            class="rounded-xl bg-slate-900 dark:bg-slate-100 px-6 py-2.5 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 transition-all active:scale-95"
                            :disabled="isClosed || !reply.trim() || sending" @click="send">
                            {{ sending ? 'Publicando...' : 'Publicar resposta' }}
                        </button>

                        <div v-if="sendError" class="text-sm font-medium text-rose-700 dark:text-rose-400">{{ sendError
                            }}</div>
                    </div>
                </div>
            </section>

            <!-- Respostas -->
            <section
                class="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
                <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
                    <h2 class="text-base font-semibold text-slate-900 dark:text-white">Respostas</h2>
                    <p class="text-sm text-slate-500 dark:text-slate-400">{{ answers.length }} respostas</p>
                </div>

                <div class="p-4">
                    <div v-if="!answers.length" class="py-8 text-sm text-slate-500 dark:text-slate-400 text-center">
                        Ainda não há respostas.
                    </div>

                    <ul v-else class="space-y-4">
                        <li v-for="p in answers" :key="p.id" class="rounded-xl border transition-all p-5" :class="isAccepted(p)
                            ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10 ring-1 ring-emerald-100 dark:ring-emerald-900/20'
                            : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'">
                            <div class="flex items-start justify-between gap-3 mb-4">
                                <div class="flex flex-col">
                                    <div class="flex items-center gap-2">
                                        <span v-if="p?.createdBy?.username"
                                            class="text-xs text-slate-500 dark:text-slate-500">
                                            Resposta de
                                            <span class="font-semibold text-slate-700 dark:text-slate-200">{{
                                                p.createdBy.username }}</span>
                                        </span>

                                        <span v-if="isAccepted(p)"
                                            class="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-emerald-700 dark:text-emerald-400">
                                            solução aceita
                                        </span>
                                    </div>

                                    <div class="mt-1 text-xs text-slate-500 dark:text-slate-500">
                                        <span v-if="p.createdAt">{{ formatDateTime(p.createdAt) }}</span>
                                        <template
                                            v-if="p?.updatedBy?.username && p.updatedAt && p.updatedAt !== p.createdAt">
                                            <span> • </span>
                                            <span>editado por <span
                                                    class="font-semibold text-slate-700 dark:text-slate-200">{{
                                                    p.updatedBy.username }}</span> • {{ formatDateTime(p.updatedAt)
                                                }}</span>
                                        </template>
                                    </div>
                                </div>

                                <button v-if="canAccept && !isAccepted(p)"
                                    class="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    @click="accept(p.id)">
                                    Marcar como solução
                                </button>
                            </div>

                            <div class="prose prose-sm prose-slate dark:prose-invert max-w-none">
                                <TokenRenderer :content="p.body || ''" :payload="p.payload || null" item-type=""
                                    item-key="" />
                            </div>
                        </li>
                    </ul>
                </div>
            </section>
        </div>
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import AcademyPageHeader from '@/views/Academy/components/AcademyPageHeader.vue';
import TokenRenderer from '@/views/Academy/components/TokenRenderer.vue';
import TokenEditor from '@/views/Academy/components/TokenEditor.vue';
import { useAcademyCommunityStore } from '@/stores/Academy/academyCommunityStore';

const route = useRoute();
const store = useAcademyCommunityStore();
const auth = useAuthStore();

const id = Number(route.params.id);

const myUserId = computed(() => auth.user?.id);
const isAdmin = computed(() => auth.user?.isAdmin === true || String(auth.user?.role || '').toUpperCase() === 'ADMIN');

const current = computed(() => store.current);
const topic = computed(() => current.value?.topic || null);
const posts = computed(() => (Array.isArray(current.value?.posts) ? current.value.posts : []));

const firstPost = computed(() => posts.value.find(p => p.type === 'COMMENT') || null);
const answers = computed(() => posts.value.filter(p => p.type === 'ANSWER'));

const isOwner = computed(() => Number(topic.value?.createdByUserId) === Number(myUserId.value));

function normalizeTopicStatus(s) {
    const v = String(s || '').toUpperCase();
    return v === 'CLOSED' ? 'CLOSED' : 'OPEN';
}
const status = computed(() => normalizeTopicStatus(topic.value?.status));
const isClosed = computed(() => status.value === 'CLOSED');

const isSolved = computed(() => Number(topic.value?.acceptedPostId) > 0);

const canClose = computed(() => !isClosed.value && (isAdmin.value || isOwner.value));
const canReopen = computed(() => isClosed.value && (isAdmin.value || isOwner.value));
const canAccept = computed(() => !isClosed.value && (isAdmin.value || isOwner.value));

const statusPillLabel = computed(() => (isClosed.value ? 'fechado' : 'aberto'));
const statusPillClass = computed(() => (isClosed.value ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'));

const topicTitle = computed(() => topic.value?.title || 'Tópico');

const backType = computed(() => String(route.query.type || 'questions'));
const backTo = computed(() => ({ name: 'AcademyCommunityType', params: { type: backType.value } }));
const breadcrumbs = computed(() => [
    { label: 'Academy', to: { name: 'AcademyPanel' } },
    { label: 'Comunidade', to: { name: 'AcademyCommunityType', params: { type: backType.value } } },
    { label: 'Tópico' },
]);

function formatDateTime(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function isAccepted(p) {
    return Number(topic.value?.acceptedPostId) === Number(p?.id);
}

/** categorias */
const categoriesByType = computed(() => store.meta?.categories || {});
const categoryLabelMap = computed(() => {
    const t = String(topic.value?.type || 'QUESTION');
    const list = categoriesByType.value?.[t] || [];
    const m = {};
    for (const c of list) m[c.slug] = c.name;
    return m;
});
const categoryLabel = computed(() => {
    const slug = String(topic.value?.categorySlug || '');
    return categoryLabelMap.value[slug] || slug;
});

const reply = ref('');
const replyPayload = ref({ embeds: [], widgets: { quiz: {}, task: {} } });
const sending = ref(false);
const sendError = ref('');

async function load() {
    await store.fetchTopic(id, { audience: 'BOTH' });
}

async function send() {
    sendError.value = '';
    try {
        sending.value = true;

        await store.createPost(id, {
            body: reply.value,
            payload: replyPayload.value,
            type: 'ANSWER',
        });

        reply.value = '';
        replyPayload.value = { embeds: [], widgets: { quiz: {}, task: {} } };

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

async function reopenTopic() {
    await store.reopenTopic(id);
    await load();
}

onMounted(async () => {
    if (!store.meta?.categories) await store.fetchMeta();
    await load();
});
</script>
