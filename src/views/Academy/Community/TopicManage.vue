<template>
    <div class="mx-auto max-w-6xl space-y-5 pb-6">
        <AcademyPageHeader :title="headerTitle" subtitle="Comunidade • gerenciar e responder"
            :backTo="{ name: 'AcademyCommunityMyTopics' }" :breadcrumbs="[
                { label: 'Academy', to: { name: 'AcademyPanel' } },
                { label: 'Comunidade', to: { name: 'AcademyCommunity' } },
                { label: 'Meus tópicos', to: { name: 'AcademyCommunityMyTopics' } },
                { label: 'Gerenciar' },
            ]">
            <template #actions>
                <div class="flex flex-col gap-2 md:flex-row md:items-center">
                    <button type="button" :disabled="!topicId" @click="refresh"
                        class="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                        <i class="fa-solid fa-rotate-right text-xs"></i>
                        Recarregar
                    </button>

                    <button type="button" :disabled="!topicId" @click="toggleClosed"
                        class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 disabled:opacity-40">
                        <i class="fa-solid text-xs" :class="isOpen ? 'fa-lock' : 'fa-lock-open'"></i>
                        {{ isOpen ? 'Fechar' : 'Reabrir' }}
                    </button>
                </div>
            </template>
        </AcademyPageHeader>

        <div v-if="store.error"
            class="flex items-center gap-2 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-sm dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-400">
            <i class="fa-solid fa-circle-exclamation"></i>
            {{ store.error }}
        </div>

        <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <!-- Meta -->
            <section
                class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
                <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <h2 class="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                        <i class="fa-solid fa-circle-info text-indigo-500"></i>
                        Dados
                    </h2>
                    <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Tipo, categoria e status</p>
                </div>

                <div class="space-y-4 p-5">
                    <div>
                        <label
                            class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Título</label>
                        <div
                            class="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                            {{ topic?.title || '—' }}
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-3">
                        <div>
                            <label
                                class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Tipo</label>
                            <div
                                class="mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                                {{ typeLabel(topic?.type) }}
                            </div>
                        </div>

                        <div>
                            <label
                                class="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Categoria</label>
                            <div
                                class="mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                                {{ topic?.categorySlug || '—' }}
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 pt-2">
                        <span class="rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-tight"
                            :class="isOpen
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'">
                            {{ isOpen ? 'aberto' : 'fechado' }}
                        </span>

                        <span v-if="Number(topic?.acceptedPostId) > 0"
                            class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-tight text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <i class="fa-solid fa-circle-check text-[10px]"></i> resolvido
                        </span>
                    </div>
                </div>
            </section>

            <!-- Conteúdo -->
            <section
                class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-8">
                <div class="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <h2 class="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                        <i class="fa-solid fa-comments text-indigo-500"></i>
                        Conteúdo
                    </h2>
                    <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Descrição e respostas</p>
                </div>

                <div class="space-y-4 p-5">
                    <!-- Primeiro post (contexto) -->
                    <div
                        class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                        <div class="mb-2 text-xs text-slate-500 dark:text-slate-400">
                            Contexto • {{ fmtDateTime(topic?.createdAt) }}
                        </div>
                        <div class="whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-100">
                            {{ firstPost?.body || '—' }}
                        </div>
                    </div>

                    <!-- Responder -->
                    <div
                        class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                        <div class="border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                            <h3 class="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                                <i class="fa-solid fa-reply text-indigo-500"></i>
                                Responder
                            </h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400">Markdown com embeds (@)</p>
                        </div>

                        <div class="p-4">
                            <TokenEditor v-model="replyBody" v-model:modelPayload="replyPayload" :rows="10"
                                placeholder="Escreva sua resposta..." />
                        </div>

                        <div class="flex gap-2 p-4 pt-0">
                            <button type="button" :disabled="submitting || !canReply || !isOpen" @click="submitReply"
                                class="flex-1 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 transition hover:opacity-95 disabled:opacity-40 md:flex-none">
                                {{ submitting ? 'Enviando...' : 'Enviar resposta' }}
                            </button>

                            <button type="button" :disabled="submitting" @click="clearReply"
                                class="flex-1 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 md:flex-none">
                                Limpar
                            </button>
                        </div>

                        <div v-if="submitError" class="px-4 pb-4 text-sm font-medium text-rose-700 dark:text-rose-400">
                            {{ submitError }}
                        </div>
                    </div>

                    <!-- Lista de posts -->
                    <div v-if="posts?.length" class="divide-y divide-slate-100 dark:divide-slate-800">
                        <div v-for="p in posts" :key="p.id" class="py-4">
                            <div class="mb-1 flex items-center justify-between gap-3">
                                <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                    {{ p.createdBy?.username || '—' }}
                                    <span class="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                                        • {{ fmtDateTime(p.createdAt) }}
                                    </span>
                                </div>

                                <button v-if="Number(topic?.acceptedPostId || 0) <= 0 && isOpen" type="button"
                                    @click="markAccepted(p.id)"
                                    class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70">
                                    <i class="fa-solid fa-check text-[10px]"></i>
                                    Marcar solução
                                </button>
                            </div>

                            <div class="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">
                                {{ p.body }}
                            </div>
                        </div>
                    </div>

                    <div v-else class="py-4 text-sm text-slate-500 dark:text-slate-400">
                        Nenhuma resposta ainda.
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
import TokenEditor from '@/views/Academy/components/TokenEditor.vue';
import { useAcademyCommunityStore } from '@/stores/Academy/academyCommunityStore';

const route = useRoute();
const store = useAcademyCommunityStore();

const topicId = ref(route.params.id ? Number(route.params.id) : null);

const replyBody = ref('');
const replyPayload = ref({ embeds: [], widgets: { quiz: {}, task: {} } });

const submitting = ref(false);
const submitError = ref('');

const topic = computed(() => store.current?.topic || null);
const posts = computed(() => store.current?.posts || []);
const firstPost = computed(() => posts.value?.[0] || null);

const headerTitle = computed(() => 'Gerenciar tópico');

const isOpen = computed(() => String(topic.value?.status || '').toUpperCase() !== 'CLOSED');
const canReply = computed(() => replyBody.value.trim().length > 0);

function fmtDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function typeLabel(typeEnum) {
  const t = String(typeEnum || '').toUpperCase();
  if (t === 'QUESTION') return 'Dúvida';
  if (t === 'DISCUSSION') return 'Discussão';
  if (t === 'SUGGESTION') return 'Sugestão';
  if (t === 'INCIDENT') return 'Incidente';
  return t || '—';
}

async function refresh() {
  if (!topicId.value) return;
  await store.fetchTopic(topicId.value, { audience: 'BOTH' });
}

function clearReply() {
  replyBody.value = '';
  replyPayload.value = { embeds: [], widgets: { quiz: {}, task: {} } };
  submitError.value = '';
}

async function submitReply() {
  submitError.value = '';
  if (!topicId.value) return;
  if (!isOpen.value) {
    submitError.value = 'Tópico está fechado.';
    return;
  }
  if (!canReply.value) return;

  submitting.value = true;
  try {
    await store.createPost(topicId.value, {
      body: replyBody.value,
      payload: replyPayload.value,
      type: 'ANSWER',
    });

    clearReply();
    await refresh();
  } catch (e) {
    submitError.value = e?.message || 'Erro ao responder.';
  } finally {
    submitting.value = false;
  }
}

async function toggleClosed() {
  if (!topicId.value) return;

  if (isOpen.value) await store.closeTopic(topicId.value);
  else await store.reopenTopic(topicId.value);

  await refresh();
}

async function markAccepted(postId) {
  if (!topicId.value) return;
  const p = Number(postId);
  if (!Number.isFinite(p) || p <= 0) return;

  await store.acceptPost(topicId.value, p);
  await refresh();
}

onMounted(refresh);
</script>
