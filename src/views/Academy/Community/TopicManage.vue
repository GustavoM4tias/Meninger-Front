<template>
  <div class="space-y-4">
    <AcademyPageHeader
      :title="headerTitle"
      subtitle="Comunidade • gerenciar e responder"
      :backTo="{ name: 'AcademyCommunityMyTopics' }"
      :breadcrumbs="[
        { label: 'Academy', to: { name: 'AcademyPanel' } },
        { label: 'Comunidade', to: { name: 'AcademyCommunity' } },
        { label: 'Meus tópicos', to: { name: 'AcademyCommunityMyTopics' } },
        { label: 'Gerenciar' },
      ]"
    >
      <template #actions>
        <div class="flex flex-col gap-2 md:flex-row md:items-center">
          <button
            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-all"
            :disabled="!topicId"
            @click="refresh"
          >
            Recarregar
          </button>

          <button
            class="rounded-xl bg-slate-900 dark:bg-slate-100 px-4 py-2.5 text-sm font-medium text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 transition-all"
            :disabled="!topicId"
            @click="toggleClosed"
          >
            {{ isOpen ? 'Fechar' : 'Reabrir' }}
          </button>
        </div>
      </template>
    </AcademyPageHeader>

    <div v-if="store.error"
      class="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-4 text-sm text-rose-700 dark:text-rose-400">
      {{ store.error }}
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <!-- Meta -->
      <section class="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <h2 class="text-base font-semibold text-slate-900 dark:text-white">Dados</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">Tipo, categoria e status</p>
        </div>

        <div class="p-5 space-y-4">
          <div>
            <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Título</label>
            <div class="mt-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100">
              {{ topic?.title || '—' }}
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3">
            <div>
              <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tipo</label>
              <div class="mt-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100">
                {{ typeLabel(topic?.type) }}
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Categoria</label>
              <div class="mt-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100">
                {{ topic?.categorySlug || '—' }}
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 pt-2">
            <span class="rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-tight"
              :class="isOpen
                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'">
              {{ isOpen ? 'aberto' : 'fechado' }}
            </span>

            <span v-if="Number(topic?.acceptedPostId) > 0"
              class="rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 text-xs font-bold uppercase tracking-tight text-emerald-700 dark:text-emerald-400">
              resolvido
            </span>
          </div>
        </div>
      </section>

      <!-- Conteúdo -->
      <section class="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <h2 class="text-base font-semibold text-slate-900 dark:text-white">Conteúdo</h2>
          <p class="text-sm text-slate-500 dark:text-slate-400">Descrição e respostas</p>
        </div>

        <div class="p-5 space-y-4">
          <!-- Primeiro post (contexto) -->
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
            <div class="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Contexto • {{ fmtDateTime(topic?.createdAt) }}
            </div>
            <div class="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
              {{ firstPost?.body || '—' }}
            </div>
          </div>

          <!-- Responder -->
          <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div class="border-b border-slate-100 dark:border-slate-800 px-5 py-3">
              <h3 class="text-sm font-semibold text-slate-900 dark:text-white">Responder</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Markdown com embeds (@)</p>
            </div>

            <div class="p-4">
              <TokenEditor
                v-model="replyBody"
                v-model:modelPayload="replyPayload"
                :rows="10"
                placeholder="Escreva sua resposta..."
              />
            </div>

            <div class="flex gap-2 p-4 pt-0">
              <button
                class="flex-1 md:flex-none rounded-xl bg-slate-900 dark:bg-slate-100 px-6 py-2.5 text-sm font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 transition-all"
                :disabled="submitting || !canReply || !isOpen"
                @click="submitReply"
              >
                {{ submitting ? 'Enviando...' : 'Enviar resposta' }}
              </button>

              <button
                class="flex-1 md:flex-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-all"
                :disabled="submitting"
                @click="clearReply"
              >
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
              <div class="flex items-center justify-between gap-3 mb-1">
                <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {{ p.createdBy?.username || '—' }}
                  <span class="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                    • {{ fmtDateTime(p.createdAt) }}
                  </span>
                </div>

                <button
                  v-if="Number(topic?.acceptedPostId || 0) <= 0 && isOpen"
                  class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  @click="markAccepted(p.id)"
                >
                  Marcar solução
                </button>
              </div>

              <div class="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {{ p.body }}
              </div>
            </div>
          </div>

          <div v-else class="text-sm text-slate-500 dark:text-slate-400">
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
