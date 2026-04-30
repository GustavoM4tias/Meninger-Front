<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getFeedback } from '@/utils/OfficeAI/apiOfficeChat'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/pt-br'
dayjs.extend(relativeTime)
dayjs.locale('pt-br')

const loading = ref(false)
const feedback = ref([])
const stats = ref({ up: 0, down: 0, total: 0 })
const total = ref(0)
const page = ref(1)
const filterRating = ref('')

const selectedItem = ref(null)
const detailOpen = ref(false)

const pages = computed(() => Math.ceil(total.value / 30) || 1)
const positiveRate = computed(() =>
  stats.value.total ? Math.round((stats.value.up / stats.value.total) * 100) : 0
)

async function load() {
  loading.value = true
  try {
    const data = await getFeedback({ page: page.value, per_page: 30, rating: filterRating.value || undefined })
    feedback.value = data.feedback
    stats.value = data.stats
    total.value = data.total
  } catch { /* silencioso */ } finally {
    loading.value = false
  }
}

onMounted(load)
watch([page, filterRating], load)

function openDetail(item) {
  selectedItem.value = item
  detailOpen.value = true
}

function closeDetail() {
  detailOpen.value = false
  selectedItem.value = null
}

function truncate(text, n = 120) {
  if (!text) return '—'
  try {
    const parsed = JSON.parse(text)
    text = parsed.text || text
  } catch { /* not json */ }
  return text.length > n ? text.slice(0, n) + '...' : text
}

function fromNow(d) {
  return dayjs(d).fromNow()
}

function formatLatency(ms) {
  if (ms == null) return '—'
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`
}

function poolLabel(pool) {
  if (pool === 'smart') return 'Smart (Pro)'
  if (pool === 'fast')  return 'Fast (Flash)'
  return pool || '—'
}

function poolClass(pool) {
  if (pool === 'smart') return 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
  if (pool === 'fast')  return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
  return 'bg-gray-200 dark:bg-slate-700 text-gray-500'
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-gray-200 p-6">
    <div class="max-w-5xl mx-auto space-y-6">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <img src="/Mlogo.png" class="h-6" alt="Eme" />
            Eme — Gestão de Respostas
          </h1>
          <p class="text-sm text-gray-500 dark:text-slate-500 mt-0.5">Feedbacks dos usuários sobre as respostas do assistente</p>
        </div>
        <button
          @click="load"
          class="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition"
          title="Atualizar"
        >
          <i class="fas fa-rotate-right" :class="loading ? 'animate-spin' : ''" />
        </button>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-transparent rounded-2xl p-4 space-y-1">
          <p class="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide">Total</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.total }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-transparent rounded-2xl p-4 space-y-1">
          <p class="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide">Positivos</p>
          <p class="text-2xl font-bold text-green-500 dark:text-green-400">{{ stats.up }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-transparent rounded-2xl p-4 space-y-1">
          <p class="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide">Negativos</p>
          <p class="text-2xl font-bold text-red-500 dark:text-red-400">{{ stats.down }}</p>
        </div>
        <div class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-transparent rounded-2xl p-4 space-y-1">
          <p class="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide">Taxa positiva</p>
          <p class="text-2xl font-bold" :class="positiveRate >= 70 ? 'text-green-500 dark:text-green-400' : positiveRate >= 40 ? 'text-yellow-500 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'">
            {{ positiveRate }}%
          </p>
        </div>
      </div>

      <!-- Barra de positivos -->
      <div v-if="stats.total" class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-transparent rounded-2xl p-4">
        <div class="flex justify-between text-xs text-gray-400 dark:text-slate-500 mb-2">
          <span>Distribuição de feedback</span>
          <span>{{ stats.up }} positivos / {{ stats.down }} negativos</span>
        </div>
        <div class="h-2 rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden flex">
          <div
            class="h-full bg-green-500 transition-all duration-700"
            :style="{ width: positiveRate + '%' }"
          />
          <div
            class="h-full bg-red-500 transition-all duration-700"
            :style="{ width: (100 - positiveRate) + '%' }"
          />
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex items-center gap-2">
        <button
          @click="filterRating = ''; page = 1"
          class="px-3 py-1.5 rounded-xl text-xs transition"
          :class="!filterRating ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300'"
        >
          Todos
        </button>
        <button
          @click="filterRating = 'up'; page = 1"
          class="px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5"
          :class="filterRating === 'up' ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300'"
        >
          <i class="fas fa-thumbs-up" /> Positivos
        </button>
        <button
          @click="filterRating = 'down'; page = 1"
          class="px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1.5"
          :class="filterRating === 'down' ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-slate-300'"
        >
          <i class="fas fa-thumbs-down" /> Negativos
        </button>
        <span class="ml-auto text-xs text-gray-400 dark:text-slate-600">{{ total }} resultado{{ total !== 1 ? 's' : '' }}</span>
      </div>

      <!-- Lista -->
      <div class="space-y-2">
        <div
          v-if="loading && !feedback.length"
          class="py-16 text-center text-gray-400 dark:text-slate-600"
        >
          <i class="fas fa-spinner animate-spin text-2xl mb-3 block" />
          Carregando feedbacks...
        </div>

        <div
          v-else-if="!feedback.length"
          class="py-16 text-center text-gray-400 dark:text-slate-600 bg-white dark:bg-slate-900 border border-gray-200 dark:border-transparent rounded-2xl"
        >
          <i class="far fa-comment-dots text-3xl mb-3 block" />
          Nenhum feedback encontrado.
        </div>

        <div
          v-for="item in feedback"
          :key="item.id"
          class="bg-white dark:bg-slate-900 border border-gray-200 dark:border-transparent rounded-2xl p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/80 transition group"
          @click="openDetail(item)"
        >
          <!-- Ícone de rating -->
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            :class="item.rating === 'up' ? 'bg-green-500/15 text-green-500 dark:text-green-400' : 'bg-red-500/15 text-red-500 dark:text-red-400'"
          >
            <i :class="item.rating === 'up' ? 'fas fa-thumbs-up' : 'fas fa-thumbs-down'" class="text-sm" />
          </div>

          <div class="flex-1 min-w-0 space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ item.user?.username || 'Usuário' }}</span>
              <span class="text-xs text-gray-400 dark:text-slate-600">{{ item.user?.city || '' }}</span>
              <span class="text-xs text-gray-300 dark:text-slate-700 ml-auto">{{ fromNow(item.created_at) }}</span>
            </div>

            <!-- Prévia da mensagem do assistente -->
            <p class="text-xs text-gray-500 dark:text-slate-500 line-clamp-2 leading-relaxed">
              {{ truncate(item.message?.content) }}
            </p>

            <!-- Comentário do usuário -->
            <p v-if="item.comment" class="text-xs text-gray-600 dark:text-slate-400 italic border-l-2 border-gray-200 dark:border-white/10 pl-2 mt-1">
              "{{ item.comment }}"
            </p>
          </div>

          <i class="fas fa-chevron-right text-xs text-gray-300 dark:text-slate-700 group-hover:text-gray-500 dark:group-hover:text-slate-500 transition mt-1 flex-shrink-0" />
        </div>
      </div>

      <!-- Paginação -->
      <div v-if="pages > 1" class="flex items-center justify-center gap-2">
        <button
          @click="page--"
          :disabled="page <= 1"
          class="px-3 py-1.5 rounded-xl text-xs text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <i class="fas fa-chevron-left" />
        </button>
        <span class="text-xs text-gray-400 dark:text-slate-500">{{ page }} / {{ pages }}</span>
        <button
          @click="page++"
          :disabled="page >= pages"
          class="px-3 py-1.5 rounded-xl text-xs text-gray-400 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <i class="fas fa-chevron-right" />
        </button>
      </div>
    </div>

    <!-- Modal de detalhe -->
    <Transition name="fade">
      <div
        v-if="detailOpen && selectedItem"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        @click.self="closeDetail"
      >
        <div class="w-full max-w-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center"
                :class="selectedItem.rating === 'up' ? 'bg-green-500/15 text-green-500 dark:text-green-400' : 'bg-red-500/15 text-red-500 dark:text-red-400'"
              >
                <i :class="selectedItem.rating === 'up' ? 'fas fa-thumbs-up' : 'fas fa-thumbs-down'" />
              </div>
              <div>
                <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ selectedItem.user?.username }}</p>
                <p class="text-xs text-gray-400 dark:text-slate-500">{{ selectedItem.user?.email }} · {{ selectedItem.user?.city }}</p>
              </div>
            </div>
            <button @click="closeDetail" class="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition p-1">
              <i class="fas fa-xmark" />
            </button>
          </div>

          <div class="space-y-3">
            <!-- Pergunta original do usuário -->
            <div v-if="selectedItem.context?.user_question">
              <p class="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Pergunta do usuário</p>
              <div class="bg-slate-700/30 dark:bg-slate-800 border border-slate-600/30 dark:border-transparent rounded-xl p-3 text-xs text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {{ selectedItem.context.user_question }}
              </div>
            </div>

            <!-- Resposta avaliada -->
            <div>
              <p class="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Resposta avaliada</p>
              <div class="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-transparent rounded-xl p-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                {{ selectedItem.context?.assistant_text || truncate(selectedItem.message?.content, 1000) }}
              </div>
            </div>

            <!-- Comentário do usuário -->
            <div v-if="selectedItem.comment">
              <p class="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">Comentário do usuário</p>
              <div class="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-transparent rounded-xl p-3 text-sm text-gray-700 dark:text-gray-200 italic leading-relaxed">
                "{{ selectedItem.comment }}"
              </div>
            </div>

            <!-- Raciocínio: modelo, pool, latência -->
            <div v-if="selectedItem.context" class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div class="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                <p class="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">Modelo</p>
                <p class="text-xs text-gray-700 dark:text-gray-200 font-mono truncate">{{ selectedItem.context.model || '—' }}</p>
              </div>
              <div class="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                <p class="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">Pool</p>
                <span class="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5" :class="poolClass(selectedItem.context.pool)">
                  {{ poolLabel(selectedItem.context.pool) }}
                </span>
              </div>
              <div class="bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                <p class="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide">Latência</p>
                <p class="text-xs text-gray-700 dark:text-gray-200">{{ formatLatency(selectedItem.context.latency_ms) }}</p>
              </div>
            </div>

            <!-- Ferramentas chamadas -->
            <div v-if="selectedItem.context?.tool_calls?.length">
              <p class="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1.5">
                Ferramentas chamadas ({{ selectedItem.context.tool_calls.length }})
              </p>
              <div class="space-y-2">
                <div
                  v-for="(tc, idx) in selectedItem.context.tool_calls"
                  :key="idx"
                  class="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-transparent rounded-xl p-3 space-y-2"
                >
                  <div class="flex items-center gap-2 flex-wrap">
                    <code class="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                      {{ tc.name }}
                    </code>
                    <span v-if="tc.error" class="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                      erro
                    </span>
                    <span class="text-[10px] text-gray-400 dark:text-slate-500 ml-auto">{{ formatLatency(tc.ms) }}</span>
                  </div>

                  <div v-if="tc.args && Object.keys(tc.args).length">
                    <p class="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Argumentos</p>
                    <pre class="text-[11px] font-mono text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-lg p-2 overflow-x-auto">{{ JSON.stringify(tc.args, null, 2) }}</pre>
                  </div>

                  <div v-if="tc.error" class="text-xs text-red-600 dark:text-red-400">
                    {{ tc.error }}
                  </div>

                  <div v-else-if="tc.result_summary">
                    <p class="text-[10px] text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">Resultado</p>
                    <div class="text-[11px] text-gray-600 dark:text-slate-300 space-y-0.5">
                      <div v-if="tc.result_summary.title"><span class="text-gray-400 dark:text-slate-500">Título:</span> {{ tc.result_summary.title }}</div>
                      <div v-if="tc.result_summary.total != null"><span class="text-gray-400 dark:text-slate-500">Total:</span> {{ tc.result_summary.total }}</div>
                      <div v-if="tc.result_summary.type"><span class="text-gray-400 dark:text-slate-500">Tipo:</span> {{ tc.result_summary.type }}</div>
                      <div v-if="tc.result_summary.route"><span class="text-gray-400 dark:text-slate-500">Rota:</span> <code class="font-mono">{{ tc.result_summary.route }}</code></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="selectedItem.context" class="text-xs text-gray-400 dark:text-slate-600 italic">
              Resposta sem chamada de ferramenta — texto direto do modelo.
            </div>

            <div class="flex items-center justify-between text-xs text-gray-400 dark:text-slate-600 pt-2 border-t border-gray-100 dark:border-white/5">
              <span>Tipo: <span class="text-gray-600 dark:text-slate-400">{{ selectedItem.message?.response_type || 'text' }}</span></span>
              <span>{{ dayjs(selectedItem.created_at).format('DD/MM/YYYY HH:mm') }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
