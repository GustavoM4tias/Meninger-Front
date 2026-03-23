<template>
  <div class="min-h-full py-8 px-4">
    <div class="max-w-7xl mx-auto">

      <!-- ── Header ── -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center shrink-0">
            <i class="fas fa-file-waveform text-white text-lg"></i>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Transcrições & IA</h1>
            <p class="text-xs text-gray-500 dark:text-gray-400">Relatórios gerados por IA a partir das reuniões</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <!-- Tabs: Reuniões / Relatórios salvos -->
          <div class="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button @click="activeTab = 'meetings'"
              :class="activeTab === 'meetings' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
              class="px-4 py-2 text-sm font-medium transition-colors">
              <i class="fas fa-calendar-days mr-1.5"></i> Reuniões
            </button>
            <button @click="switchToReports"
              :class="activeTab === 'reports' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
              class="px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700">
              <i class="fas fa-robot mr-1.5"></i> Relatórios IA
              <span v-if="ts.reports.length" class="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">{{ ts.reports.length }}</span>
            </button>
          </div>
          <button @click="refresh" :disabled="ts.loadingMeetings"
            class="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-40">
            <i class="fas fa-rotate-right text-sm" :class="{ 'animate-spin': ts.loadingMeetings }"></i>
          </button>
        </div>
      </div>

      <!-- ── Two-column layout ── -->
      <div class="flex gap-5 min-h-0">

        <!-- Left: List -->
        <div class="w-80 shrink-0 flex flex-col gap-3">

          <!-- TAB: Reuniões recentes -->
          <template v-if="activeTab === 'meetings'">
            <div v-if="ts.loadingMeetings" class="space-y-3">
              <div v-for="i in 4" :key="i" class="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
            </div>
            <div v-else-if="!ts.meetings.length"
              class="text-center py-12 text-gray-400 dark:text-gray-600">
              <i class="fas fa-calendar-xmark text-3xl mb-3 block"></i>
              <p class="text-sm">Nenhuma reunião Teams encontrada nos últimos 30 dias</p>
            </div>
            <div v-else v-for="m in ts.meetings" :key="m.eventId"
              @click="selectMeeting(m)"
              :class="ts.selectedMeeting?.eventId === m.eventId
                ? 'border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-purple-200 dark:hover:border-purple-800'"
              class="rounded-2xl border p-4 cursor-pointer transition-all group">
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-snug line-clamp-2 flex-1">{{ m.subject }}</p>
                <i class="fas fa-video text-purple-400 shrink-0 mt-0.5"></i>
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                <i class="fas fa-calendar-day"></i>
                <span>{{ fmtDate(m.start) }}</span>
                <span>·</span>
                <span>{{ fmtTime(m.start) }}</span>
              </div>
              <div v-if="m.attendees?.length" class="flex items-center gap-1 text-xs text-gray-400">
                <i class="fas fa-users"></i>
                <span>{{ m.attendees.length }} participante(s)</span>
              </div>
              <!-- Status indicator -->
              <div class="mt-2 flex items-center gap-1">
                <div v-if="meetingStatus(m) === 'loading'" class="flex items-center gap-1 text-xs text-gray-400">
                  <i class="fas fa-circle-notch animate-spin text-xs"></i> Verificando...
                </div>
                <span v-else-if="meetingStatus(m) === 'no-url'"
                  class="text-xs text-gray-400">Sem link Teams</span>
                <span v-else-if="meetingStatus(m) === 'no-transcript'"
                  class="text-xs text-gray-400"><i class="fas fa-minus-circle mr-1"></i>Sem transcrição</span>
                <span v-else-if="meetingStatus(m) === 'has-transcript'"
                  class="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <i class="fas fa-file-lines"></i> Transcrição disponível
                </span>
                <span v-else-if="meetingStatus(m) === 'has-report'"
                  class="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                  <i class="fas fa-robot"></i> Relatório IA pronto
                </span>
                <span v-else class="text-xs text-gray-300 dark:text-gray-600">Clique para verificar</span>
              </div>
            </div>
          </template>

          <!-- TAB: Relatórios salvos -->
          <template v-else>
            <div v-if="ts.loadingReports" class="space-y-3">
              <div v-for="i in 3" :key="i" class="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
            </div>
            <div v-else-if="!ts.reports.length"
              class="text-center py-12 text-gray-400 dark:text-gray-600">
              <i class="fas fa-robot text-3xl mb-3 block"></i>
              <p class="text-sm">Nenhum relatório gerado ainda</p>
            </div>
            <div v-else v-for="r in ts.reports" :key="r.id"
              @click="ts.openSavedReport(r.id)"
              class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-purple-200 dark:hover:border-purple-800 p-4 cursor-pointer transition-all">
              <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-2 mb-1">{{ r.subject }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">{{ fmtDate(r.meetingDate) }}</p>
              <div v-if="r.summaryPreview" class="text-xs text-gray-400 line-clamp-2 mb-2">{{ r.summaryPreview }}</div>
              <div class="flex flex-wrap gap-1.5">
                <span v-if="r.acaoCount" class="text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                  {{ r.acaoCount }} ações
                </span>
                <span v-if="r.kpiCount" class="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                  {{ r.kpiCount }} KPIs
                </span>
                <span v-for="tag in (r.tagsPreview || []).slice(0, 2)" :key="tag"
                  class="text-xs px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                  #{{ tag }}
                </span>
              </div>
            </div>
          </template>

        </div>

        <!-- Right: Detail panel -->
        <div class="flex-1 min-w-0">

          <!-- Empty state -->
          <div v-if="!ts.selectedMeeting && !ts.loadingTranscript"
            class="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-600 py-24">
            <div class="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-file-waveform text-4xl text-gray-300 dark:text-gray-700"></i>
            </div>
            <p class="text-base font-medium mb-1">Selecione uma reunião</p>
            <p class="text-sm">Escolha uma reunião na lista para verificar a transcrição e gerar o relatório com IA</p>
          </div>

          <!-- Loading transcript -->
          <div v-else-if="ts.loadingTranscript || ts.checkingTranscript"
            class="h-full flex flex-col items-center justify-center gap-3 text-gray-400 py-24">
            <i class="fas fa-circle-notch animate-spin text-3xl text-purple-500"></i>
            <p class="text-sm">{{ ts.checkingTranscript ? 'Verificando transcrição...' : 'Carregando transcrição...' }}</p>
          </div>

          <!-- Transcript panel -->
          <div v-else-if="ts.selectedMeeting" class="flex flex-col gap-4">

            <!-- Meeting header card -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">{{ ts.selectedMeeting.subject }}</h2>
                  <div class="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span v-if="ts.selectedMeeting.start"><i class="fas fa-calendar mr-1"></i>{{ fmtDate(ts.selectedMeeting.start) }} {{ fmtTime(ts.selectedMeeting.start) }}</span>
                    <span v-if="ts.selectedMeeting.organizer?.name"><i class="fas fa-user mr-1"></i>{{ ts.selectedMeeting.organizer.name }}</span>
                    <span v-if="ts.selectedMeeting.attendees?.length"><i class="fas fa-users mr-1"></i>{{ ts.selectedMeeting.attendees.length }} participantes</span>
                  </div>
                </div>
                <div class="flex gap-2">
                  <a v-if="ts.selectedMeeting.joinUrl" :href="ts.selectedMeeting.joinUrl" target="_blank" rel="noopener"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors">
                    <i class="fas fa-video"></i> Entrar
                  </a>
                </div>
              </div>
            </div>

            <!-- No transcript -->
            <div v-if="ts.transcriptInfo && !ts.transcriptInfo.available"
              class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-400">
              <i class="fas fa-microphone-slash text-3xl mb-3 block text-gray-300 dark:text-gray-700"></i>
              <p class="text-sm font-medium mb-1">Sem transcrição disponível</p>
              <p class="text-xs text-gray-400 max-w-xs mx-auto">A transcrição precisa ser iniciada durante a reunião no Microsoft Teams para que fique disponível aqui.</p>
            </div>

            <!-- Has transcripts -->
            <div v-else-if="ts.transcriptInfo?.available">

              <!-- Transcript picker (se houver mais de uma) -->
              <div v-if="ts.transcriptInfo.transcripts.length > 1" class="flex gap-2 flex-wrap">
                <button v-for="t in ts.transcriptInfo.transcripts" :key="t.id"
                  @click="loadTranscript(t)"
                  :class="activeTranscriptId === t.id
                    ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-purple-200'"
                  class="px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors">
                  Transcrição {{ fmtDateShort(t.createdAt) }}
                  <span v-if="t.reportReady" class="ml-1 text-green-500"><i class="fas fa-robot"></i></span>
                </button>
              </div>

              <!-- Load transcript button (first transcript auto-select) -->
              <div v-if="!ts.cues.length && !ts.loadingTranscript" class="text-center py-8">
                <button @click="loadTranscript(ts.transcriptInfo.transcripts[0])"
                  class="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors">
                  <i class="fas fa-download"></i> Carregar transcrição
                </button>
              </div>

              <!-- Tabs: Transcrição | Relatório -->
              <div v-if="ts.cues.length || ts.report" class="flex flex-col gap-4">
                <div class="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden self-start">
                  <button @click="contentTab = 'transcript'"
                    :class="contentTab === 'transcript' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
                    class="px-4 py-2 text-sm font-medium transition-colors">
                    <i class="fas fa-file-lines mr-1.5"></i> Transcrição
                    <span class="ml-1 text-xs opacity-75">({{ ts.cues.length }} falas)</span>
                  </button>
                  <button @click="contentTab = 'report'"
                    :class="contentTab === 'report' ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'"
                    class="px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 dark:border-gray-700">
                    <i class="fas fa-robot mr-1.5"></i> Relatório IA
                    <span v-if="ts.report" class="ml-1 w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                  </button>
                </div>

                <!-- TRANSCRIPT TAB -->
                <div v-show="contentTab === 'transcript'" class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <!-- Search bar -->
                  <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                    <i class="fas fa-magnifying-glass text-gray-400 text-xs"></i>
                    <input v-model="transcriptSearch" type="text" placeholder="Buscar na transcrição..."
                      class="flex-1 text-sm text-gray-700 dark:text-gray-300 bg-transparent focus:outline-none placeholder:text-gray-400" />
                    <span class="text-xs text-gray-400">{{ filteredCues.length }} falas</span>
                  </div>
                  <!-- Cues list -->
                  <div class="overflow-y-auto" style="max-height: 500px">
                    <div v-for="(cue, i) in filteredCues" :key="i"
                      class="flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                        :style="{ background: speakerColor(cue.speaker) }">
                        {{ cue.speaker.charAt(0).toUpperCase() }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-0.5">
                          <span class="text-xs font-semibold" :style="{ color: speakerColor(cue.speaker) }">{{ cue.speaker }}</span>
                          <span class="text-xs text-gray-400 font-mono">{{ cue.startStr }}</span>
                        </div>
                        <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed" v-html="highlightSearch(cue.text)"></p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- REPORT TAB -->
                <div v-show="contentTab === 'report'">
                  <!-- Generate button -->
                  <div v-if="!ts.report && !ts.generatingReport" class="text-center py-10">
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/40 dark:to-violet-900/40 flex items-center justify-center mx-auto mb-4">
                      <i class="fas fa-robot text-3xl text-purple-500"></i>
                    </div>
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Relatório não gerado</p>
                    <p class="text-xs text-gray-400 mb-4 max-w-xs mx-auto">
                      O Gemini vai analisar a transcrição e gerar um relatório completo com resumo, KPIs, ações, checklist e muito mais.
                    </p>
                    <button @click="doGenerateReport"
                      class="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
                      <i class="fas fa-wand-magic-sparkles"></i>
                      Gerar Relatório com IA
                    </button>
                  </div>

                  <!-- Generating spinner -->
                  <div v-else-if="ts.generatingReport" class="text-center py-12">
                    <div class="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <i class="fas fa-robot text-3xl text-purple-500"></i>
                    </div>
                    <p class="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Analisando com Gemini...</p>
                    <p class="text-xs text-gray-400">Isso pode levar alguns instantes dependendo do tamanho da reunião</p>
                  </div>

                  <!-- Report content -->
                  <div v-else-if="ts.report" class="space-y-2">
                    <div class="flex justify-end">
                      <button @click="doGenerateReport(true)"
                        class="text-xs text-gray-400 hover:text-purple-500 transition-colors">
                        <i class="fas fa-rotate-right mr-1"></i> Regenerar
                      </button>
                    </div>
                    <ReportPanel :report="ts.report" />
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </div>

    <!-- ── Toast ── -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.show"
          class="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm max-w-sm"
          :class="toast.type === 'success'
            ? 'bg-white dark:bg-gray-900 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            : 'bg-white dark:bg-gray-900 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'">
          <i :class="toast.type === 'success' ? 'fas fa-circle-check text-green-500' : 'fas fa-circle-exclamation text-red-500'" class="text-base shrink-0"></i>
          <span>{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue';
import { useTranscriptStore } from '@/stores/Microsoft/transcriptStore';
import ReportPanel from './components/ReportPanel.vue';

const ts = useTranscriptStore();

onMounted(() => ts.fetchMeetings());

watch(() => ts.error, (msg) => {
  if (msg) { showToast(msg, 'error'); ts.error = null; }
});

// ── Tab state ─────────────────────────────────────────────────────────────────
const activeTab   = ref('meetings');  // 'meetings' | 'reports'
const contentTab  = ref('transcript'); // 'transcript' | 'report'
const activeTranscriptId = ref(null);
const transcriptSearch = ref('');

// ── Meeting checked status map ────────────────────────────────────────────────
// { eventId → 'loading' | 'no-url' | 'no-transcript' | 'has-transcript' | 'has-report' | null }
const statusMap = reactive({});

function meetingStatus(m) { return statusMap[m.eventId] || null; }

async function selectMeeting(m) {
  contentTab.value = 'transcript';
  transcriptSearch.value = '';
  statusMap[m.eventId] = 'loading';
  await ts.checkTranscript(m);
  // Update status
  if (!m.joinUrl) {
    statusMap[m.eventId] = 'no-url';
  } else if (!ts.transcriptInfo?.available) {
    statusMap[m.eventId] = 'no-transcript';
  } else {
    const hasReport = ts.transcriptInfo.transcripts.some(t => t.reportReady);
    statusMap[m.eventId] = hasReport ? 'has-report' : 'has-transcript';
    // Auto-load if only one transcript and it's cached
    if (ts.transcriptInfo.transcripts.length === 1) {
      const t = ts.transcriptInfo.transcripts[0];
      if (t.reportReady || t.cached) {
        await loadTranscript(t);
        if (t.reportReady) contentTab.value = 'report';
      }
    }
  }
}

async function loadTranscript(transcriptObj) {
  activeTranscriptId.value = transcriptObj.id;
  try {
    await ts.loadTranscript(ts.transcriptInfo.meetingId, transcriptObj.id);
    if (transcriptObj.reportReady) {
      contentTab.value = 'report';
    }
  } catch {
    showToast('Erro ao carregar transcrição', 'error');
  }
}

async function doGenerateReport(force = false) {
  if (!ts.transcriptInfo?.meetingId || !activeTranscriptId.value) return;
  try {
    await ts.generateReport(ts.transcriptInfo.meetingId, activeTranscriptId.value, force);
    showToast('Relatório gerado com sucesso!', 'success');
    // Update status badge
    if (ts.selectedMeeting) statusMap[ts.selectedMeeting.eventId] = 'has-report';
  } catch (err) {
    showToast(`Erro ao gerar relatório: ${err.message}`, 'error');
  }
}

async function switchToReports() {
  activeTab.value = 'reports';
  if (!ts.reports.length) await ts.fetchReports();
}

function refresh() {
  if (activeTab.value === 'meetings') ts.fetchMeetings();
  else ts.fetchReports();
}

// ── Transcript search & speaker colors ───────────────────────────────────────
const filteredCues = computed(() => {
  if (!transcriptSearch.value.trim()) return ts.cues;
  const q = transcriptSearch.value.toLowerCase();
  return ts.cues.filter(c => c.text.toLowerCase().includes(q) || c.speaker.toLowerCase().includes(q));
});

const SPEAKER_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316'];
const speakerMap = computed(() => {
  const map = {};
  let i = 0;
  for (const c of ts.cues) {
    if (!map[c.speaker]) map[c.speaker] = SPEAKER_COLORS[i++ % SPEAKER_COLORS.length];
  }
  return map;
});
function speakerColor(speaker) { return speakerMap.value[speaker] || '#6b7280'; }

function highlightSearch(text) {
  if (!transcriptSearch.value.trim()) return text;
  const q = transcriptSearch.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${q})`, 'gi'), '<mark class="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">$1</mark>');
}

// ── Formatters ────────────────────────────────────────────────────────────────
const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function fmtDate(dt) {
  if (!dt) return '';
  const d = new Date(dt.replace('T',' ').split('.')[0]);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function fmtDateShort(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return `${d.getDate()}/${d.getMonth()+1}`;
}
function fmtTime(dt) {
  if (!dt) return '';
  return dt.split('T')[1]?.slice(0, 5) || '';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
const toast = reactive({ show: false, message: '', type: 'success' });
let toastTimer;
function showToast(message, type = 'success') {
  toast.message = message; toast.type = type; toast.show = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.show = false; }, 3500);
}
</script>

<style scoped>
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.toast-enter-active { transition: opacity 0.2s, transform 0.2s; }
.toast-leave-active { transition: opacity 0.15s, transform 0.15s; }
.toast-enter-from { opacity: 0; transform: translateY(12px) scale(0.97); }
.toast-leave-to { opacity: 0; transform: translateY(6px) scale(0.97); }
</style>
