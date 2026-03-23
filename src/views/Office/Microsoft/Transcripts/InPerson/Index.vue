<template>
  <div class="p-6 max-w-6xl mx-auto space-y-6">

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-sm">
            <i class="fas fa-microphone text-white text-xs"></i>
          </div>
          Reuniões Presenciais
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Transcrições gravadas via microfone com resumo de IA</p>
      </div>
      <button @click="$router.push('/microsoft/inperson/recording')"
        class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white text-sm font-semibold shadow-md shadow-violet-200 dark:shadow-violet-900/30 transition-all whitespace-nowrap">
        <i class="fas fa-plus"></i> Nova Reunião
      </button>
    </div>

    <!-- Floating recording bar (se há gravação ativa) -->
    <div v-if="recStore.isActive"
      class="flex items-center justify-between gap-4 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-violet-900/80 to-purple-900/80 border border-violet-500/30 backdrop-blur-sm shadow-xl shadow-violet-900/20 cursor-pointer"
      @click="$router.push('/microsoft/inperson/recording')">
      <div class="flex items-center gap-3">
        <div class="relative w-8 h-8 flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full bg-red-500/20 animate-ping" />
          <div class="w-3 h-3 rounded-full bg-red-500"></div>
        </div>
        <div>
          <p class="text-sm font-semibold text-white">Gravando agora</p>
          <p class="text-xs text-violet-300 truncate max-w-[200px]">{{ recStore.title }}</p>
        </div>
      </div>
      <div class="flex items-center gap-4">
        <span class="font-mono text-lg font-bold text-white tabular-nums">{{ recStore.timerDisplay }}</span>
        <span class="flex items-center gap-1.5 text-xs text-violet-300 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors">
          <i class="fas fa-arrow-up-right-from-square text-[10px]"></i> Abrir
        </span>
      </div>
    </div>

    <!-- Lista de reuniões -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse" />
    </div>

    <div v-else-if="!meetings.length" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5">
        <i class="fas fa-microphone-slash text-3xl text-gray-400 dark:text-gray-600"></i>
      </div>
      <h3 class="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">Nenhuma reunião gravada</h3>
      <p class="text-sm text-gray-500 dark:text-gray-500 mb-6 max-w-xs">Inicie uma nova reunião presencial para transcrever e gerar resumos com IA.</p>
      <button @click="$router.push('/microsoft/inperson/recording')"
        class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors">
        <i class="fas fa-microphone"></i> Gravar primeira reunião
      </button>
    </div>

    <div v-else class="space-y-3">
      <TransitionGroup name="list">
        <div v-for="m in meetings" :key="m.id"
          class="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md hover:shadow-violet-50 dark:hover:shadow-violet-900/10 transition-all cursor-pointer"
          :class="{ 'ring-2 ring-violet-500/30': highlightId == m.id }"
          @click="openMeeting(m)">
          <div class="flex items-start justify-between gap-4">

            <!-- Left: info -->
            <div class="flex items-start gap-4 min-w-0">
              <!-- Icon -->
              <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                :class="statusBg(m.status)">
                <i class="text-sm" :class="statusIcon(m.status)"></i>
              </div>
              <!-- Text -->
              <div class="min-w-0">
                <h3 class="font-semibold text-gray-900 dark:text-white text-sm truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {{ m.title }}
                </h3>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span v-if="m.meeting_date">
                    <i class="fas fa-calendar mr-1 opacity-60"></i>{{ fmtDate(m.meeting_date) }}
                  </span>
                  <span v-if="m.duration_min">
                    <i class="fas fa-clock mr-1 opacity-60"></i>{{ m.duration_min }} min
                  </span>
                  <span v-if="m.location">
                    <i class="fas fa-location-dot mr-1 opacity-60"></i>{{ m.location }}
                  </span>
                  <span v-if="m.attendees_json?.length">
                    <i class="fas fa-users mr-1 opacity-60"></i>{{ m.attendees_json.length }} participante(s)
                  </span>
                </div>
              </div>
            </div>

            <!-- Right: status + actions -->
            <div class="flex items-center gap-2 shrink-0">
              <span :class="statusBadge(m.status)" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold">
                <i class="text-[9px]" :class="statusIcon(m.status)"></i>
                {{ statusLabel(m.status) }}
              </span>

              <!-- Delete -->
              <button @click.stop="confirmDelete(m)"
                class="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                <i class="fas fa-trash text-xs"></i>
              </button>
            </div>
          </div>

          <!-- Prévia do resumo (se summarized) -->
          <p v-if="m.status === 'summarized' && m.report_json?.resumo"
            class="mt-3 text-xs text-gray-500 dark:text-gray-500 line-clamp-2 pl-14 leading-relaxed">
            {{ m.report_json.resumo }}
          </p>
        </div>
      </TransitionGroup>
    </div>

    <!-- ── Painel de detalhes (side ou modal) ─────────────────────────────── -->
    <Transition name="slide">
      <div v-if="selected" class="fixed inset-0 z-40 flex">
        <div class="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" @click="selected = null" />
        <div class="relative ml-auto w-full max-w-2xl h-full bg-white dark:bg-gray-950 shadow-2xl flex flex-col overflow-hidden">

          <!-- Painel header -->
          <div class="flex items-start justify-between gap-4 p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div>
              <h2 class="font-bold text-gray-900 dark:text-white">{{ selected.title }}</h2>
              <div class="flex flex-wrap gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span v-if="selected.meeting_date"><i class="fas fa-calendar mr-1"></i>{{ fmtDate(selected.meeting_date) }}</span>
                <span v-if="selected.duration_min"><i class="fas fa-clock mr-1"></i>{{ selected.duration_min }} min</span>
                <span v-if="selected.location"><i class="fas fa-location-dot mr-1"></i>{{ selected.location }}</span>
              </div>
            </div>
            <button @click="selected = null" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Participantes -->
          <div v-if="selected.attendees_json?.length" class="px-6 pt-4 pb-0 shrink-0">
            <div class="flex flex-wrap gap-1.5">
              <span v-for="a in selected.attendees_json" :key="a.name"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs">
                <i class="fas fa-circle-user text-xs opacity-50"></i> {{ a.name }}
              </span>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex gap-1 px-6 pt-4 pb-0 shrink-0">
            <button v-for="tab in ['Relatório', 'Transcrição']" :key="tab"
              @click="activeTab = tab"
              :class="activeTab === tab
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
              class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">
              {{ tab }}
            </button>
          </div>

          <!-- Conteúdo do painel -->
          <div class="flex-1 overflow-y-auto p-6">

            <!-- Tab: Relatório -->
            <div v-if="activeTab === 'Relatório'">
              <!-- Gerar relatório -->
              <div v-if="selected.status === 'recorded'" class="flex flex-col items-center py-10 text-center">
                <div class="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 flex items-center justify-center mb-4">
                  <i class="fas fa-sparkles text-2xl text-violet-600 dark:text-violet-400"></i>
                </div>
                <h3 class="font-semibold text-gray-800 dark:text-gray-200 mb-1">Gerar Resumo de IA</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs">Analise a transcrição e gere resumo, decisões, ações e muito mais.</p>
                <button @click="generateReport" :disabled="generatingReport"
                  class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50">
                  <i class="fas" :class="generatingReport ? 'fa-circle-notch animate-spin' : 'fa-wand-magic-sparkles'"></i>
                  {{ generatingReport ? 'Gerando...' : 'Gerar Resumo' }}
                </button>
              </div>

              <!-- Loading -->
              <div v-else-if="generatingReport" class="flex flex-col items-center py-12">
                <div class="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mb-4"></div>
                <p class="text-sm text-gray-500">Analisando transcrição com IA...</p>
              </div>

              <!-- Relatório gerado -->
              <div v-else-if="selected.status === 'summarized' && selectedReport">
                <ReportPanel :report="selectedReport" :meeting="meetingMeta(selected)" @email="openEmail" />
              </div>

              <!-- Outros status -->
              <div v-else class="flex flex-col items-center py-12 text-center">
                <i class="fas fa-file-circle-question text-4xl text-gray-300 dark:text-gray-700 mb-3"></i>
                <p class="text-sm text-gray-500">
                  {{ selected.status === 'recording' ? 'Reunião ainda em andamento.' : 'Carregue a transcrição primeiro.' }}
                </p>
              </div>
            </div>

            <!-- Tab: Transcrição -->
            <div v-if="activeTab === 'Transcrição'">
              <div v-if="!selectedCues.length" class="flex flex-col items-center py-12 text-center">
                <i class="fas fa-file-lines text-4xl text-gray-300 dark:text-gray-700 mb-3"></i>
                <p class="text-sm text-gray-500">Nenhuma transcrição disponível.</p>
              </div>
              <div v-else class="space-y-2">
                <div v-for="(cue, i) in selectedCues" :key="i"
                  class="flex gap-3 text-sm leading-relaxed py-2 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                  <span class="text-violet-500 shrink-0 font-mono text-xs mt-0.5 tabular-nums">{{ cue.startStr }}</span>
                  <span class="text-gray-700 dark:text-gray-300">{{ cue.text }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Painel footer com ações -->
          <div v-if="selected.status === 'summarized'"
            class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 shrink-0">
            <button @click="generateReport" :disabled="generatingReport"
              class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <i class="fas fa-rotate-right text-[10px]"></i>
              {{ generatingReport ? 'Regenerando...' : 'Regenerar' }}
            </button>
            <div class="flex gap-2">
              <button @click="openEmail"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <i class="fas fa-envelope text-violet-500 text-[10px]"></i> E-mail
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Email Modal -->
    <EmailReportModal
      :show="showEmail"
      :meeting="selected ? meetingMeta(selected) : null"
      :report="selectedReport"
      :report-id="null"
      :meeting-id="selected?.id"
      :is-in-person="true"
      @close="showEmail = false"
      @sent="showEmail = false"
    />

    <!-- Delete confirm -->
    <Transition name="modal">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="deleteTarget = null" />
        <div class="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <h3 class="font-bold text-gray-900 dark:text-white mb-1">Excluir reunião?</h3>
          <p class="text-sm text-gray-500 mb-5">
            "<span class="font-medium">{{ deleteTarget.title }}</span>" será removida permanentemente.
          </p>
          <div class="flex gap-3">
            <button @click="deleteTarget = null"
              class="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancelar
            </button>
            <button @click="doDelete"
              class="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
              Excluir
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';
import { useInPersonRecordingStore } from '@/stores/Microsoft/inPersonRecording';
import ReportPanel from '../components/ReportPanel.vue';
import EmailReportModal from '../components/EmailReportModal.vue';

const route   = useRoute();
const router  = useRouter();
const recStore = useInPersonRecordingStore();

const loading       = ref(true);
const meetings      = ref([]);
const selected      = ref(null);
const selectedCues  = ref([]);
const selectedReport = ref(null);
const activeTab     = ref('Relatório');
const generatingReport = ref(false);
const showEmail     = ref(false);
const deleteTarget  = ref(null);
const highlightId   = ref(route.query.highlight || null);

// ── Load list ─────────────────────────────────────────────────────────────────
async function loadMeetings() {
  loading.value = true;
  try {
    const res  = await requestWithAuth(`${API_URL}/microsoft/inperson/meetings`);
    meetings.value = await res.json();
  } catch {}
  loading.value = false;
}

onMounted(async () => {
  await loadMeetings();
  // Auto-abrir se highlight
  if (highlightId.value) {
    const m = meetings.value.find(x => x.id == highlightId.value);
    if (m) openMeeting(m);
  }
});

// ── Open meeting detail ───────────────────────────────────────────────────────
async function openMeeting(m) {
  selected.value      = m;
  selectedCues.value  = [];
  selectedReport.value = null;
  activeTab.value     = m.status === 'summarized' ? 'Relatório' : 'Transcrição';

  // Carrega detalhes completos
  try {
    const res  = await requestWithAuth(`${API_URL}/microsoft/inperson/meetings/${m.id}`);
    const data = await res.json();
    selected.value       = data;
    selectedCues.value   = data.cues || [];
    selectedReport.value = data.report_json || null;
  } catch {}
}

// ── Generate report ───────────────────────────────────────────────────────────
async function generateReport() {
  if (!selected.value) return;
  generatingReport.value = true;
  try {
    const res  = await requestWithAuth(`${API_URL}/microsoft/inperson/meetings/${selected.value.id}/report`, {
      method: 'POST',
      body:   JSON.stringify({ force: selected.value.status === 'summarized' }),
    });
    const data = await res.json();
    selectedReport.value = data.report;
    selected.value = { ...selected.value, status: 'summarized', report_json: data.report };
    // Atualiza na lista
    const idx = meetings.value.findIndex(m => m.id === selected.value.id);
    if (idx >= 0) meetings.value[idx] = { ...meetings.value[idx], status: 'summarized', report_json: data.report };
    activeTab.value = 'Relatório';
  } catch (err) {
    alert('Erro ao gerar relatório: ' + (err.message || 'Tente novamente.'));
  } finally {
    generatingReport.value = false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
function confirmDelete(m) { deleteTarget.value = m; }
async function doDelete() {
  const id = deleteTarget.value?.id;
  if (!id) return;
  try {
    await requestWithAuth(`${API_URL}/microsoft/inperson/meetings/${id}`, { method: 'DELETE' });
    meetings.value  = meetings.value.filter(m => m.id !== id);
    if (selected.value?.id === id) selected.value = null;
  } catch {}
  deleteTarget.value = null;
}

// ── Email ─────────────────────────────────────────────────────────────────────
function openEmail() { showEmail.value = true; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function meetingMeta(m) {
  return {
    subject:   m.title,
    start:     m.meeting_date,
    organizer: { name: m.organizer_name },
    attendees: m.attendees_json || [],
    location:  m.location,
  };
}

function fmtDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function statusLabel(s) {
  return { recording: 'Gravando', recorded: 'Gravado', summarized: 'Resumido', error: 'Erro' }[s] || s;
}
function statusIcon(s) {
  return {
    recording:  'fas fa-circle text-red-500',
    recorded:   'fas fa-check text-blue-500',
    summarized: 'fas fa-sparkles text-violet-500',
    error:      'fas fa-circle-exclamation text-red-500',
  }[s] || 'fas fa-circle text-gray-400';
}
function statusBadge(s) {
  return {
    recording:  'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    recorded:   'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    summarized: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    error:      'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  }[s] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
}
function statusBg(s) {
  return {
    recording:  'bg-red-50 dark:bg-red-900/20',
    recorded:   'bg-blue-50 dark:bg-blue-900/20',
    summarized: 'bg-violet-50 dark:bg-violet-900/20',
    error:      'bg-red-50 dark:bg-red-900/20',
  }[s] || 'bg-gray-100 dark:bg-gray-800';
}
</script>

<style scoped>
.slide-enter-active { transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
.slide-leave-active { transition: transform 0.2s ease-in; }
.slide-enter-from   { transform: translateX(100%); }
.slide-leave-to     { transform: translateX(100%); }

.modal-enter-active { transition: opacity 0.2s, transform 0.2s; }
.modal-leave-active { transition: opacity 0.15s; }
.modal-enter-from   { opacity: 0; transform: scale(0.97); }
.modal-leave-to     { opacity: 0; }

.list-enter-active  { transition: all 0.3s ease; }
.list-enter-from    { opacity: 0; transform: translateY(10px); }
</style>
