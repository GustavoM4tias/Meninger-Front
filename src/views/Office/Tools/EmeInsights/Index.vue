<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { getFeedback } from '@/utils/OfficeAI/apiOfficeChat';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Modal from '@/components/UI/Modal.vue';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const loading = ref(false);
const feedback = ref([]);
const stats = ref({ up: 0, down: 0, total: 0 });
const total = ref(0);
const page = ref(1);
const filterRating = ref('');

const selectedItem = ref(null);
const detailOpen = ref(false);

const pages = computed(() => Math.ceil(total.value / 30) || 1);
const positiveRate = computed(() =>
  stats.value.total ? Math.round((stats.value.up / stats.value.total) * 100) : 0
);

const ratingOptions = computed(() => [
  { value: '',     label: `Todos (${stats.value.total})` },
  { value: 'up',   label: `Positivos (${stats.value.up})`,   icon: 'fas fa-thumbs-up' },
  { value: 'down', label: `Negativos (${stats.value.down})`, icon: 'fas fa-thumbs-down' },
]);

async function load() {
  loading.value = true;
  try {
    const data = await getFeedback({
      page: page.value, per_page: 30,
      rating: filterRating.value || undefined,
    });
    feedback.value = data.feedback;
    stats.value = data.stats;
    total.value = data.total;
  } catch { /* silencioso */ }
  finally { loading.value = false; }
}

onMounted(load);
watch([page, filterRating], () => {
  if (page.value !== 1 && filterRating.value !== '') page.value = 1;
  load();
});

function openDetail(item) { selectedItem.value = item; detailOpen.value = true; }
function closeDetail() { detailOpen.value = false; selectedItem.value = null; }

function truncate(text, n = 120) {
  if (!text) return '—';
  try {
    const parsed = JSON.parse(text);
    text = parsed.text || text;
  } catch { /* not json */ }
  return text.length > n ? text.slice(0, n) + '...' : text;
}

function fromNow(d) { return dayjs(d).fromNow(); }
function formatLatency(ms) {
  if (ms == null) return '—';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`;
}
function poolLabel(pool) {
  if (pool === 'smart') return 'Smart (Pro)';
  if (pool === 'fast')  return 'Fast (Flash)';
  return pool || '—';
}
function poolVariant(pool) {
  if (pool === 'smart') return 'accent';
  if (pool === 'fast')  return 'info';
  return 'neutral';
}

const positiveRateColor = computed(() => {
  if (positiveRate.value >= 70) return 'text-emerald-500 dark:text-emerald-400';
  if (positiveRate.value >= 40) return 'text-amber-500 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="lg">

      <PageHeader
        title="Eme — Gestão de respostas"
        subtitle="Feedbacks dos usuários sobre as respostas do assistente"
        icon="fas fa-comments">
        <template #title>
          <img src="/Mlogo.png" class="h-6 invert dark:invert-0" alt="Eme" />
          <span>Eme — Gestão de respostas</span>
        </template>
        <template #actions>
          <IconButton icon="fas fa-rotate" size="md" label="Atualizar"
            :class="{ 'animate-spin': loading }" @click="load" />
        </template>
      </PageHeader>

      <!-- Stats cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Surface variant="raised" padding="sm">
          <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Total</p>
          <p class="text-2xl font-semibold text-ink mt-1 tabular-nums">{{ stats.total }}</p>
        </Surface>
        <Surface variant="raised" padding="sm">
          <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Positivos</p>
          <p class="text-2xl font-semibold text-emerald-500 dark:text-emerald-400 mt-1 tabular-nums flex items-center gap-1.5">
            <i class="fas fa-thumbs-up text-base"></i>{{ stats.up }}
          </p>
        </Surface>
        <Surface variant="raised" padding="sm">
          <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Negativos</p>
          <p class="text-2xl font-semibold text-red-500 dark:text-red-400 mt-1 tabular-nums flex items-center gap-1.5">
            <i class="fas fa-thumbs-down text-base"></i>{{ stats.down }}
          </p>
        </Surface>
        <Surface variant="raised" padding="sm">
          <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Taxa positiva</p>
          <p class="text-2xl font-semibold mt-1 tabular-nums" :class="positiveRateColor">
            {{ positiveRate }}%
          </p>
        </Surface>
      </div>

      <!-- Distribuição -->
      <Surface v-if="stats.total" variant="raised" padding="sm" class="mb-4">
        <div class="flex justify-between text-xs text-ink-subtle mb-2 font-mono">
          <span>Distribuição</span>
          <span><span class="text-emerald-500">{{ stats.up }}</span> / <span class="text-red-500">{{ stats.down }}</span></span>
        </div>
        <div class="h-2 rounded-full bg-surface-sunken overflow-hidden flex">
          <div class="h-full bg-emerald-500 transition-all duration-700"
            :style="{ width: positiveRate + '%' }"></div>
          <div class="h-full bg-red-500 transition-all duration-700"
            :style="{ width: (100 - positiveRate) + '%' }"></div>
        </div>
      </Surface>

      <!-- Filtros -->
      <div class="flex items-center justify-between flex-wrap gap-2 mb-4">
        <SegmentedControl :model-value="filterRating" :options="ratingOptions" size="sm"
          @change="(v) => { filterRating = v; page = 1; }" />
        <span class="text-xs text-ink-subtle font-mono">
          {{ total }} resultado{{ total !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Lista -->
      <div class="space-y-2">
        <div v-if="loading && !feedback.length" class="py-16 text-center text-ink-subtle">
          <i class="fas fa-spinner animate-spin text-2xl mb-3 block"></i>
          Carregando feedbacks...
        </div>

        <EmptyState v-else-if="!feedback.length" size="md"
          icon="far fa-comment-dots" title="Nenhum feedback encontrado"
          description="Ajuste os filtros ou aguarde novos feedbacks." />

        <article v-for="item in feedback" :key="item.id"
          @click="openDetail(item)"
          class="group flex items-start gap-3 p-3 sm:p-4 rounded-xl bg-surface-raised border border-line surface-gradient
                 hover:border-accent/30 hover:shadow-elevated hover:-translate-y-0.5
                 transition-all duration-200 ease-out-expo cursor-pointer">

          <div class="h-9 w-9 rounded-lg grid place-items-center shrink-0"
            :class="item.rating === 'up'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'">
            <i :class="item.rating === 'up' ? 'fas fa-thumbs-up' : 'fas fa-thumbs-down'" class="text-sm"></i>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium text-ink">{{ item.user?.username || 'Usuário' }}</span>
              <span v-if="item.user?.city" class="text-xs text-ink-subtle font-mono">{{ item.user.city }}</span>
              <span class="text-xs text-ink-subtle ml-auto font-mono">{{ fromNow(item.created_at) }}</span>
            </div>

            <p class="text-xs text-ink-muted line-clamp-2 leading-relaxed mt-1">
              {{ truncate(item.message?.content) }}
            </p>

            <p v-if="item.comment"
              class="text-xs text-ink italic border-l-2 border-line pl-2 mt-2">
              "{{ item.comment }}"
            </p>
          </div>

          <i class="fas fa-chevron-right text-ink-subtle text-xs mt-1 group-hover:text-accent transition-colors"></i>
        </article>
      </div>

      <!-- Paginação -->
      <div v-if="pages > 1" class="flex items-center justify-center gap-2 mt-5">
        <Button size="sm" variant="ghost" icon="fas fa-chevron-left"
          :disabled="page <= 1" @click="page--">Anterior</Button>
        <span class="text-xs text-ink-muted font-mono px-3">
          {{ page }} / {{ pages }}
        </span>
        <Button size="sm" variant="ghost" icon-right="fas fa-chevron-right"
          :disabled="page >= pages" @click="page++">Próxima</Button>
      </div>
    </PageContainer>

    <!-- Modal detalhe -->
    <Modal :open="detailOpen" size="lg" @close="closeDetail">
      <template #header>
        <div v-if="selectedItem" class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg grid place-items-center shrink-0"
            :class="selectedItem.rating === 'up'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20'">
            <i :class="selectedItem.rating === 'up' ? 'fas fa-thumbs-up' : 'fas fa-thumbs-down'" class="text-sm"></i>
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-ink truncate">{{ selectedItem.user?.username }}</h3>
            <p class="text-xs text-ink-muted font-mono truncate">
              {{ selectedItem.user?.email }}<span v-if="selectedItem.user?.city"> · {{ selectedItem.user.city }}</span>
            </p>
          </div>
        </div>
      </template>

      <div v-if="selectedItem" class="space-y-4">
        <!-- Pergunta -->
        <section v-if="selectedItem.context?.user_question">
          <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1.5">Pergunta do usuário</p>
          <div class="rounded-lg border border-line bg-surface-sunken p-3 text-sm text-ink leading-relaxed whitespace-pre-wrap">
            {{ selectedItem.context.user_question }}
          </div>
        </section>

        <!-- Resposta -->
        <section>
          <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1.5">Resposta avaliada</p>
          <div class="rounded-lg border border-line bg-surface-sunken p-3 text-sm text-ink leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
            {{ selectedItem.context?.assistant_text || truncate(selectedItem.message?.content, 1000) }}
          </div>
        </section>

        <!-- Comentário -->
        <section v-if="selectedItem.comment">
          <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1.5">Comentário do usuário</p>
          <div class="rounded-lg border border-line bg-surface-sunken p-3 text-sm text-ink italic leading-relaxed">
            "{{ selectedItem.comment }}"
          </div>
        </section>

        <!-- Modelo / Pool / Latência -->
        <section v-if="selectedItem.context" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div class="rounded-lg bg-surface-sunken border border-line px-3 py-2">
            <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Modelo</p>
            <p class="text-xs text-ink font-mono truncate mt-0.5">{{ selectedItem.context.model || '—' }}</p>
          </div>
          <div class="rounded-lg bg-surface-sunken border border-line px-3 py-2">
            <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Pool</p>
            <Badge :variant="poolVariant(selectedItem.context.pool)" size="sm" class="mt-0.5">
              {{ poolLabel(selectedItem.context.pool) }}
            </Badge>
          </div>
          <div class="rounded-lg bg-surface-sunken border border-line px-3 py-2">
            <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Latência</p>
            <p class="text-xs text-ink font-mono mt-0.5">{{ formatLatency(selectedItem.context.latency_ms) }}</p>
          </div>
        </section>

        <!-- Tools -->
        <section v-if="selectedItem.context?.tool_calls?.length">
          <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-2">
            Ferramentas chamadas ({{ selectedItem.context.tool_calls.length }})
          </p>
          <div class="space-y-2">
            <div v-for="(tc, idx) in selectedItem.context.tool_calls" :key="idx"
              class="rounded-lg border border-line bg-surface-sunken p-3 space-y-2">
              <div class="flex items-center gap-2 flex-wrap">
                <Badge variant="accent" size="sm">
                  <code class="font-mono">{{ tc.name }}</code>
                </Badge>
                <Badge v-if="tc.error" variant="danger" size="sm">erro</Badge>
                <span class="text-[10px] text-ink-subtle ml-auto font-mono">{{ formatLatency(tc.ms) }}</span>
              </div>

              <div v-if="tc.args && Object.keys(tc.args).length">
                <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Argumentos</p>
                <pre class="text-[11px] font-mono text-ink-muted bg-surface rounded p-2 overflow-x-auto">{{ JSON.stringify(tc.args, null, 2) }}</pre>
              </div>

              <div v-if="tc.error" class="text-xs text-red-600 dark:text-red-400">{{ tc.error }}</div>

              <div v-else-if="tc.result_summary">
                <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Resultado</p>
                <div class="text-[11px] text-ink-muted space-y-0.5">
                  <div v-if="tc.result_summary.title"><span class="text-ink-subtle">Título:</span> {{ tc.result_summary.title }}</div>
                  <div v-if="tc.result_summary.total != null"><span class="text-ink-subtle">Total:</span> {{ tc.result_summary.total }}</div>
                  <div v-if="tc.result_summary.type"><span class="text-ink-subtle">Tipo:</span> {{ tc.result_summary.type }}</div>
                  <div v-if="tc.result_summary.route"><span class="text-ink-subtle">Rota:</span> <code class="font-mono">{{ tc.result_summary.route }}</code></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <p v-else-if="selectedItem.context" class="text-xs text-ink-subtle italic">
          Resposta sem chamada de ferramenta — texto direto do modelo.
        </p>

        <div class="flex items-center justify-between text-xs text-ink-subtle pt-2 border-t border-line font-mono">
          <span>Tipo: <span class="text-ink">{{ selectedItem.message?.response_type || 'text' }}</span></span>
          <span>{{ dayjs(selectedItem.created_at).format('DD/MM/YYYY HH:mm') }}</span>
        </div>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
