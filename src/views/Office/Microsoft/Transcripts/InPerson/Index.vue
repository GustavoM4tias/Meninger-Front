<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        subtitle="Transcrições gravadas via microfone com resumo de IA"
        icon="fas fa-microphone">
        <template #title>Reuniões Presenciais</template>
        <template #actions>
          <Button variant="primary"
            icon="fas fa-plus"
            class="!bg-violet-600 hover:!bg-violet-700"
            @click="$router.push('/microsoft/inperson/recording')">
            Nova Reunião
          </Button>
        </template>
      </PageHeader>

      <!-- Floating recording bar (se há gravação ativa) -->
      <Surface v-if="recStore.isActive"
        variant="raised"
        padding="md"
        class="mb-5 border-violet-500/30 bg-violet-500/10 surface-gradient cursor-pointer"
        @click="$router.push('/microsoft/inperson/recording')">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <div class="relative w-8 h-8 grid place-items-center shrink-0">
              <div class="absolute w-8 h-8 rounded-full bg-red-500/20 animate-ping" />
              <div class="w-3 h-3 rounded-full bg-red-500"></div>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-violet-700 dark:text-violet-200">Gravando agora</p>
              <p class="text-xs text-violet-500 dark:text-violet-400 truncate max-w-[260px]">{{ recStore.title }}</p>
            </div>
          </div>
          <div class="flex items-center gap-4 shrink-0">
            <span class="font-mono text-lg font-bold text-violet-700 dark:text-violet-200 tabular-nums">
              {{ recStore.timerDisplay }}
            </span>
            <span class="hidden sm:flex items-center gap-1.5 text-xs text-violet-500 px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 transition-colors">
              <i class="fas fa-arrow-up-right-from-square text-[10px]"></i> Abrir
            </span>
          </div>
        </div>
      </Surface>

      <!-- Lista de reuniões -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 4" :key="i" class="h-24 rounded-2xl bg-surface-sunken/50 animate-pulse" />
      </div>

      <div v-else-if="!meetings.length" class="py-12">
        <EmptyState
          icon="fas fa-microphone-slash"
          title="Nenhuma reunião gravada"
          description="Inicie uma nova reunião presencial para transcrever e gerar resumos com IA." />
        <div class="flex justify-center mt-4">
          <Button variant="primary"
            icon="fas fa-microphone"
            class="!bg-violet-600 hover:!bg-violet-700"
            @click="$router.push('/microsoft/inperson/recording')">
            Gravar primeira reunião
          </Button>
        </div>
      </div>

      <div v-else class="space-y-3">
        <TransitionGroup name="list">
          <div v-for="m in meetings" :key="m.id"
            class="group bg-surface-raised rounded-2xl border border-line p-5 hover:border-violet-500/40 hover:shadow-md hover:shadow-violet-500/10 transition-all cursor-pointer"
            :class="{ 'ring-2 ring-violet-500/30': highlightId == m.id }"
            @click="openMeeting(m)">
            <div class="flex items-start justify-between gap-4">

              <!-- Left: info -->
              <div class="flex items-start gap-4 min-w-0">
                <!-- Icon -->
                <div class="w-10 h-10 rounded-xl grid place-items-center shrink-0"
                  :class="statusBg(m.status)">
                  <i class="text-sm" :class="statusIcon(m.status)"></i>
                </div>
                <!-- Text -->
                <div class="min-w-0">
                  <h3 class="font-semibold text-ink text-sm truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {{ m.title }}
                  </h3>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-ink-muted">
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
                <IconButton
                  icon="fas fa-trash"
                  label="Excluir reunião"
                  variant="danger"
                  size="sm"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.stop="confirmDelete(m)" />
              </div>
            </div>

            <!-- Prévia do resumo (se summarized) -->
            <p v-if="m.status === 'summarized' && m.report_json?.resumo"
              class="mt-3 text-xs text-ink-subtle line-clamp-2 pl-14 leading-relaxed">
              {{ m.report_json.resumo }}
            </p>
          </div>
        </TransitionGroup>
      </div>
    </PageContainer>

    <!-- ── Painel de detalhes (drawer) ─────────────────────────────── -->
    <Modal :open="!!selected"
      size="xl"
      position="right"
      :title="selected?.title"
      @close="selected = null">

      <template #subtitle>
        <div class="flex flex-wrap gap-3 text-xs text-ink-muted">
          <span v-if="selected?.meeting_date"><i class="fas fa-calendar mr-1"></i>{{ fmtDate(selected.meeting_date) }}</span>
          <span v-if="selected?.duration_min"><i class="fas fa-clock mr-1"></i>{{ selected.duration_min }} min</span>
          <span v-if="selected?.location"><i class="fas fa-location-dot mr-1"></i>{{ selected.location }}</span>
        </div>
      </template>

      <div v-if="selected" class="space-y-4">

        <!-- Participantes -->
        <div v-if="selected.attendees_json?.length" class="flex flex-wrap gap-1.5">
          <span v-for="a in selected.attendees_json" :key="a.name"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-sunken text-ink-muted text-xs border border-line">
            <i class="fas fa-circle-user text-xs opacity-50"></i> {{ a.name }}
          </span>
        </div>

        <!-- Tabs -->
        <div class="self-start">
          <SegmentedControl
            v-model="activeTab"
            :options="tabOptions"
            size="sm" />
        </div>

        <!-- Tab: Relatório -->
        <div v-if="activeTab === 'Relatório'">
          <!-- Gerar relatório -->
          <Surface v-if="selected.status === 'recorded'" variant="raised" padding="lg" class="text-center surface-gradient">
            <div class="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/30 grid place-items-center mx-auto mb-4">
              <i class="fas fa-sparkles text-2xl text-violet-500"></i>
            </div>
            <h3 class="font-semibold text-ink mb-1">Gerar Resumo de IA</h3>
            <p class="text-sm text-ink-muted mb-5 max-w-xs mx-auto">Analise a transcrição e gere resumo, decisões, ações e muito mais.</p>
            <Button
              variant="primary"
              :icon="generatingReport ? 'fas fa-circle-notch fa-spin' : 'fas fa-wand-magic-sparkles'"
              class="!bg-violet-600 hover:!bg-violet-700 mx-auto"
              :disabled="generatingReport"
              @click="generateReport">
              {{ generatingReport ? 'Gerando...' : 'Gerar Resumo' }}
            </Button>
          </Surface>

          <!-- Loading -->
          <div v-else-if="generatingReport" class="flex flex-col items-center py-12">
            <div class="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin mb-4"></div>
            <p class="text-sm text-ink-muted">Analisando transcrição com IA...</p>
          </div>

          <!-- Relatório gerado -->
          <div v-else-if="selected.status === 'summarized' && selectedReport">
            <ReportPanel :report="selectedReport" :meeting="meetingMeta(selected)" @email="openEmail" />
          </div>

          <!-- Outros status -->
          <Surface v-else variant="raised" padding="lg" class="text-center text-ink-muted">
            <i class="fas fa-file-circle-question text-4xl text-ink-subtle mb-3"></i>
            <p class="text-sm">
              {{ selected.status === 'recording' ? 'Reunião ainda em andamento.' : 'Carregue a transcrição primeiro.' }}
            </p>
          </Surface>
        </div>

        <!-- Tab: Transcrição -->
        <div v-if="activeTab === 'Transcrição'">
          <Surface v-if="!selectedCues.length" variant="raised" padding="lg" class="text-center text-ink-muted">
            <i class="fas fa-file-lines text-4xl text-ink-subtle mb-3"></i>
            <p class="text-sm">Nenhuma transcrição disponível.</p>
          </Surface>
          <Surface v-else variant="raised" padding="md">
            <div class="space-y-2">
              <div v-for="(cue, i) in selectedCues" :key="i"
                class="flex gap-3 text-sm leading-relaxed py-2 border-b border-line/50 last:border-0">
                <span class="text-violet-500 shrink-0 font-mono text-xs mt-0.5 tabular-nums">{{ cue.startStr }}</span>
                <span class="text-ink-muted">{{ cue.text }}</span>
              </div>
            </div>
          </Surface>
        </div>
      </div>

      <template v-if="selected?.status === 'summarized'" #footer>
        <button @click="generateReport" :disabled="generatingReport"
          class="flex items-center gap-1.5 text-xs text-ink-subtle hover:text-ink transition-colors">
          <i class="fas fa-rotate-right text-[10px]"></i>
          {{ generatingReport ? 'Regenerando...' : 'Regenerar' }}
        </button>
        <div class="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" icon="fas fa-envelope" @click="openEmail">E-mail</Button>
        </div>
      </template>
    </Modal>

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
    <Modal :open="!!deleteTarget"
      size="sm"
      title="Excluir reunião?"
      @close="deleteTarget = null">
      <p class="text-sm text-ink-muted">
        "<span class="font-medium text-ink">{{ deleteTarget?.title }}</span>" será removida permanentemente.
      </p>
      <template #footer>
        <Button variant="ghost" @click="deleteTarget = null">Cancelar</Button>
        <Button variant="danger" icon="fas fa-trash" @click="doDelete">Excluir</Button>
      </template>
    </Modal>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';
import { useInPersonRecordingStore } from '@/stores/Microsoft/inPersonRecording';
import ReportPanel from '../components/ReportPanel.vue';
import EmailReportModal from '../components/EmailReportModal.vue';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Modal from '@/components/UI/Modal.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

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

const tabOptions = [
  { value: 'Relatório', label: 'Relatório', icon: 'fas fa-robot' },
  { value: 'Transcrição', label: 'Transcrição', icon: 'fas fa-file-lines' },
];

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
    recorded:   'fas fa-check text-accent',
    summarized: 'fas fa-sparkles text-violet-500',
    error:      'fas fa-circle-exclamation text-red-500',
  }[s] || 'fas fa-circle text-ink-subtle';
}
function statusBadge(s) {
  return {
    recording:  'bg-red-500/10 text-red-600 dark:text-red-400',
    recorded:   'bg-accent-soft text-accent',
    summarized: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    error:      'bg-red-500/10 text-red-600 dark:text-red-400',
  }[s] || 'bg-surface-sunken text-ink-muted';
}
function statusBg(s) {
  return {
    recording:  'bg-red-500/10',
    recorded:   'bg-accent-soft',
    summarized: 'bg-violet-500/10',
    error:      'bg-red-500/10',
  }[s] || 'bg-surface-sunken';
}
</script>

<style scoped>
.list-enter-active  { transition: all 0.3s ease; }
.list-enter-from    { opacity: 0; transform: translateY(10px); }
</style>
