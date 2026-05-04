<script setup>
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Surface from '@/components/UI/Surface.vue';

const props = defineProps({
  events: { type: Array, default: () => [] },
});

defineEmits(['close']);

const authStore = useAuthStore();
const reportRef = ref(null);
const reportTitle = ref('');
const exporting = ref(false);
const exportError = ref('');

// E-mail
const showEmailModal = ref(false);
const emailTo = ref('');
const emailSubject = ref('');
const emailMessage = ref('');
const emailError = ref('');
const emailSuccess = ref(false);
const sending = ref(false);

const selectedIds = ref(new Set());
const startDate = ref('');
const endDate = ref('');

const DEFAULT_IMAGE = '/Mlogo.png';
const FOOTER_LOGO = '/menin-vazada-branca.png';

const imageStatusMap = ref({});
const imageExportMap = ref({});

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// ── Date helpers ──────────────────────────────────────
const toInputDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const getStartOfWeek = (date = new Date()) => {
  const cur = new Date(date);
  const day = cur.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  cur.setDate(cur.getDate() + diff); cur.setHours(0,0,0,0);
  return cur;
};
const getEndOfWeek = (date = new Date()) => {
  const start = getStartOfWeek(date);
  const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
  return end;
};
const normalizeDate = (value, endOfDay = false) => {
  if (!value) return null;
  const d = new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`);
  return isNaN(d.getTime()) ? null : d;
};

// ── Image handling (canvas-safe) ─────────────────────
const isDataUrl = (v) => /^data:/i.test(v || '');
const isSafeForCanvas = (v) => {
  if (!v || typeof v !== 'string') return false;
  if (v.startsWith('/')) return true;
  if (isDataUrl(v)) return true;
  try {
    const parsed = new URL(v, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch { return false; }
};

const getRawEventImage = (event) => {
  const eventImage = Array.isArray(event.images) && event.images.length
    ? event.images[0] : (event.image || event.cover_image || null);
  const enterpriseImage = event.enterprise_photo || event.enterprise_image || event.enterprise_logo || null;
  return eventImage || enterpriseImage || DEFAULT_IMAGE;
};
const getImageKey = (event) => `event-${event?.id}`;
const setImageStatus = (e, s) => { imageStatusMap.value = { ...imageStatusMap.value, [getImageKey(e)]: s }; };
const getImageStatus = (e) => imageStatusMap.value[getImageKey(e)] || 'idle';
const setExportImage = (e, v) => { imageExportMap.value = { ...imageExportMap.value, [getImageKey(e)]: v }; };

const getResolvedPreviewImage = (e) => {
  const raw = getRawEventImage(e);
  return getImageStatus(e) === 'error' ? DEFAULT_IMAGE : (raw || DEFAULT_IMAGE);
};

const getResolvedExportImage = (e) => {
  const raw = getRawEventImage(e);
  const cached = imageExportMap.value[getImageKey(e)];
  if (cached) return cached;
  if (isSafeForCanvas(raw)) return raw;
  return DEFAULT_IMAGE;
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onloadend = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(blob);
});

const tryConvertImageToDataUrl = async (src) => {
  if (!src) return null;
  if (src.startsWith('/')) return src;
  if (isDataUrl(src)) return src;
  try {
    const proxyUrl = `${API_URL}/events/proxy-image?url=${encodeURIComponent(src)}`;
    const token = localStorage.getItem('token');
    const res = await fetch(proxyUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch { return null; }
};

const preloadImageForExport = async (src) => {
  if (!src) return DEFAULT_IMAGE;
  if (isSafeForCanvas(src)) return src;
  return (await tryConvertImageToDataUrl(src)) || DEFAULT_IMAGE;
};

const hydrateExportImages = async () => {
  await Promise.all(selectedEvents.value.map(async (e) => {
    const raw = getRawEventImage(e);
    setExportImage(e, await preloadImageForExport(raw) || DEFAULT_IMAGE);
  }));
};

// ── Format helpers ───────────────────────────────────
const formatEventDate = (s) => {
  const d = new Date(s);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
};
const formatTime = (s) => {
  const d = new Date(s);
  const h = d.getHours(); const m = d.getMinutes();
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2,'0')}`;
};
const formatDateShort = (s) => new Date(s).toLocaleDateString('pt-BR',
  { day:'2-digit', month:'2-digit', year:'numeric' });
const isPast = (s) => new Date(s) < new Date();

// ── Filtering / selection ────────────────────────────
const filteredEvents = computed(() => {
  const start = normalizeDate(startDate.value, false);
  const end = normalizeDate(endDate.value, true);
  return [...props.events]
    .filter(e => {
      const ed = new Date(e.event_date);
      if (isNaN(ed.getTime())) return false;
      if (start && ed < start) return false;
      if (end && ed > end) return false;
      return true;
    })
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
});

watch(() => props.events, () => {
  selectedIds.value = new Set(filteredEvents.value.map(e => e.id));
  if (!reportTitle.value?.trim()) reportTitle.value = 'Cronograma de Eventos';
}, { immediate: true, deep: true });

watch(filteredEvents, (events) => {
  const ids = new Set(events.map(e => e.id));
  selectedIds.value = new Set([...selectedIds.value].filter(id => ids.has(id)));
  if (!selectedIds.value.size && events.length) {
    selectedIds.value = new Set(events.map(e => e.id));
  }
}, { immediate: true });

watch(selectedIds, hydrateExportImages, { deep: true });
watch([startDate, endDate], hydrateExportImages);

const selectAll = () => { selectedIds.value = new Set(filteredEvents.value.map(e => e.id)); };
const deselectAll = () => { selectedIds.value = new Set(); };
const toggleEvent = (id) => {
  const next = new Set(selectedIds.value);
  next.has(id) ? next.delete(id) : next.add(id);
  selectedIds.value = next;
};

const selectedEvents = computed(() =>
  filteredEvents.value.filter(e => selectedIds.value.has(e.id))
);

const dateRangeLabel = computed(() => {
  if (!selectedEvents.value.length) return '';
  const ts = selectedEvents.value.map(e => new Date(e.event_date).getTime());
  const min = new Date(Math.min(...ts));
  const max = new Date(Math.max(...ts));
  const fmt = (d) => `${d.getDate()} ${MONTHS_PT[d.getMonth()]}`;
  return min.toDateString() === max.toDateString() ? fmt(min) : `${fmt(min)} à ${fmt(max)}`;
});

// ── Export ────────────────────────────────────────────
const captureReport = async (scale = 2.2) => {
  await hydrateExportImages();
  const { default: html2canvas } = await import('html2canvas');
  return html2canvas(reportRef.value, {
    scale, useCORS: false, allowTaint: false, backgroundColor: '#0F2747', logging: false,
  });
};

async function exportPDF() {
  if (!selectedEvents.value.length) return;
  exporting.value = true; exportError.value = '';
  try {
    const { default: jsPDF } = await import('jspdf');
    const canvas = await captureReport(2.2);
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const ratio = canvas.width / canvas.height;
    let rw = pw, rh = pw / ratio;
    if (rh > ph) { rh = ph; rw = ph * ratio; }
    const x = (pw - rw) / 2, y = (ph - rh) / 2;
    pdf.addImage(imgData, 'JPEG', x, y, rw, rh, undefined, 'FAST');
    const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    pdf.save(`Cronograma_Eventos_${date}.pdf`);
  } catch (err) {
    exportError.value = 'Erro ao gerar PDF.';
    console.error(err);
  } finally { exporting.value = false; }
}

async function exportJPG() {
  if (!selectedEvents.value.length) return;
  exporting.value = true; exportError.value = '';
  try {
    const canvas = await captureReport(2.2);
    const link = document.createElement('a');
    link.download = `Cronograma_Eventos_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.94);
    link.click();
  } catch (err) {
    exportError.value = 'Erro ao gerar JPG.';
    console.error(err);
  } finally { exporting.value = false; }
}

function openEmailModal() {
  emailTo.value = '';
  emailSubject.value = `${reportTitle.value || 'Cronograma de Eventos'} — Menin`;
  emailMessage.value = '';
  emailError.value = '';
  emailSuccess.value = false;
  showEmailModal.value = true;
}

async function sendEmail() {
  if (!emailTo.value.trim()) return;
  sending.value = true; emailError.value = ''; emailSuccess.value = false;
  try {
    const canvas = await captureReport(1);
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.5);
    await requestWithAuth('/events/report/email', {
      method: 'POST',
      body: JSON.stringify({
        to: emailTo.value.split(',').map(e => e.trim()).filter(Boolean),
        subject: emailSubject.value || `${reportTitle.value || 'Cronograma de Eventos'} — Menin`,
        message: emailMessage.value,
        imageBase64,
        reportTitle: reportTitle.value || 'Cronograma de Eventos',
      }),
    });
    emailSuccess.value = true;
    setTimeout(() => { showEmailModal.value = false; }, 2000);
  } catch (err) {
    emailError.value = err.message || 'Erro ao enviar.';
  } finally { sending.value = false; }
}

const onPreviewImageError = (e) => setImageStatus(e, 'error');
const onPreviewImageLoad = async (event) => {
  setImageStatus(event, 'loaded');
  const raw = getRawEventImage(event);
  if (imageExportMap.value[getImageKey(event)]) return;
  setExportImage(event, await preloadImageForExport(raw) || DEFAULT_IMAGE);
};

startDate.value = toInputDate(getStartOfWeek());
endDate.value = toInputDate(getEndOfWeek());
</script>

<template>
  <Modal :open="true" size="full" @close="$emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-file-export text-sm"></i>
        </div>
        <div>
          <h2 class="text-base font-semibold text-ink">Gerar relatório de eventos</h2>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="font-mono text-accent">{{ selectedIds.size }}</span> selecionado(s) ·
            <span class="font-mono">{{ filteredEvents.length }}</span> no período
          </p>
        </div>
      </div>
    </template>

    <div class="-m-5 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-0 min-h-[60vh]">
      <!-- ── Sidebar ── -->
      <aside class="bg-surface-sunken border-b lg:border-b-0 lg:border-r border-line p-5 space-y-4 overflow-y-auto max-h-[80vh]">
        <Surface variant="raised" padding="sm">
          <Input v-model="reportTitle" label="Título do relatório"
            placeholder="Cronograma de Eventos" />
        </Surface>

        <Surface variant="raised" padding="sm">
          <div class="flex items-center gap-2 mb-3">
            <i class="far fa-calendar-days text-accent text-sm"></i>
            <span class="text-sm font-semibold text-ink">Período</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <Input v-model="startDate" type="date" label="Início" />
            <Input v-model="endDate" type="date" label="Fim" />
          </div>
          <div class="mt-3 px-3 py-2 rounded-md bg-surface-sunken border border-line">
            <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Pré-visualização</p>
            <p class="text-sm font-medium text-ink mt-0.5">{{ dateRangeLabel || 'Nenhum evento no período' }}</p>
          </div>
        </Surface>

        <Surface variant="raised" padding="sm">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono">Eventos</p>
              <p class="text-sm font-semibold text-ink">
                <span class="font-mono">{{ selectedIds.size }}/{{ filteredEvents.length }}</span> selecionados
              </p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <Button size="sm" variant="ghost" icon="fas fa-check-double" @click="selectAll">Todos</Button>
              <Button size="sm" variant="ghost" icon="fas fa-ban" @click="deselectAll">Nenhum</Button>
            </div>
          </div>

          <div class="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
            <label v-for="event in filteredEvents" :key="event.id"
              class="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors
                     hover:bg-accent-soft/40 border border-transparent hover:border-accent/20">
              <input type="checkbox" :checked="selectedIds.has(event.id)"
                @change="toggleEvent(event.id)"
                class="w-4 h-4 mt-1 cursor-pointer shrink-0" />

              <div class="w-10 h-10 rounded-md overflow-hidden bg-surface-sunken border border-line shrink-0">
                <img :src="getResolvedPreviewImage(event)"
                  :alt="event.enterprise_name || event.title"
                  class="w-full h-full object-cover"
                  @error="onPreviewImageError(event)"
                  @load="onPreviewImageLoad(event)" />
              </div>

              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-ink truncate">{{ event.title }}</p>
                <p class="text-[11px] text-ink-muted flex items-center gap-1 font-mono">
                  <i class="far fa-clock text-[9px]"></i>
                  {{ formatDateShort(event.event_date) }}
                </p>
                <p v-if="event.enterprise_name"
                  class="text-[10px] text-ink-subtle uppercase tracking-wide truncate font-mono">
                  {{ event.enterprise_name }}
                </p>
              </div>
            </label>

            <div v-if="!filteredEvents.length"
              class="text-center text-sm text-ink-subtle py-8 px-2">
              <i class="far fa-calendar-xmark text-2xl mb-2 block"></i>
              Nenhum evento no período.
            </div>
          </div>
        </Surface>
      </aside>

      <!-- ── Main: ações + preview ── -->
      <main class="bg-surface-sunken p-5 overflow-y-auto max-h-[80vh]">
        <div class="flex flex-wrap items-center gap-2 mb-5">
          <Button :disabled="exporting || !selectedEvents.length" :loading="exporting"
            icon="fas fa-file-pdf" variant="danger" @click="exportPDF">
            Exportar PDF
          </Button>
          <Button :disabled="exporting || !selectedEvents.length" :loading="exporting"
            icon="fas fa-image" @click="exportJPG">
            Exportar JPG
          </Button>
          <Button :disabled="exporting || !selectedEvents.length"
            icon="fas fa-envelope" variant="secondary" @click="openEmailModal">
            Enviar por e-mail
          </Button>

          <div class="ml-auto flex items-center gap-2 text-xs text-ink-muted bg-surface-raised border border-line rounded-lg px-3 py-2">
            <i class="fas fa-layer-group text-accent text-[10px]"></i>
            <span class="font-mono">{{ selectedEvents.length }}</span>
            <span>evento(s)</span>
          </div>
        </div>

        <p v-if="exportError"
          class="mb-3 text-xs text-red-500 flex items-center gap-1.5">
          <i class="fas fa-circle-exclamation"></i>{{ exportError }}
        </p>

        <!-- Preview do report (NÃO TOCAR estilos inline — usados pelo html2canvas) -->
        <div class="flex justify-center">
          <div ref="reportRef" style="
              background: linear-gradient(180deg, #123765 0%, #0F2747 30%, #0B1E38 100%);
              padding:40px 36px 30px 36px;
              font-family: Arial, Helvetica, sans-serif;
              width: 840px;
              box-sizing: border-box;
              border-radius: 24px;
              overflow: hidden;
            ">
            <div style="text-align:center; margin-bottom:30px;">
              <h1 style="
                  color:#ffffff;
                  font-size:28px;
                  font-weight:900;
                  letter-spacing:2px;
                  text-transform:uppercase;
                  margin:0 0 10px 0;
                  line-height:1.2;
                ">
                {{ reportTitle || 'CRONOGRAMA DE EVENTOS' }}
              </h1>

              <p v-if="dateRangeLabel" style="
                  color:rgba(255,255,255,0.86);
                  font-size:17px;
                  font-weight:500;
                  letter-spacing:1px;
                  margin:0;
                ">
                {{ dateRangeLabel }}
              </p>
            </div>

            <div v-if="!selectedEvents.length" style="
                text-align:center;
                padding:56px 0;
                color:rgba(255,255,255,0.45);
                font-size:14px;
              ">
              Nenhum evento selecionado
            </div>

            <template v-else>
              <div v-for="event in selectedEvents" :key="event.id" style="
                  margin-bottom: 14px;
                  border-radius: 18px;
                  overflow: hidden;
                  background: rgba(255,255,255,0.04);
                ">
                <div style="display:flex; gap:22px; padding:22px; align-items:flex-start;">
                  <div style="min-width:110px; display:flex; flex-direction:column; align-items:center; gap:12px;">
                    <div style="font-size:32px; font-weight:900; color:#fbbb22; line-height:1; text-align:center;">
                      {{ formatEventDate(event.event_date) }}
                    </div>
                    <img :src="getResolvedExportImage(event)"
                      :alt="event.enterprise_name || event.title"
                      style="width:72px; height:72px; object-fit:cover; display:block;" />
                  </div>

                  <div style="width:1px; background:rgba(255,255,255,0.10); align-self:stretch; flex-shrink:0;"></div>

                  <div style="flex:1; padding-top:2px; min-width:0;">
                    <h2 style="
                        color:#ffffff; font-size:18px; font-weight:800;
                        text-transform:uppercase; letter-spacing:0.8px;
                        margin:0 0 10px 0; line-height:1.35;
                      ">{{ event.title }}</h2>

                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; align-items:center;">
                      <span style="color:rgba(255,255,255,0.86); font-size:20px; font-weight:400; padding:7px 10px; line-height:1;">
                        <i class="fas fa-clock" style="margin-right:6px;"></i>{{ formatTime(event.event_date) }}
                      </span>
                      |
                      <span v-if="event.address?.city"
                        style="color:rgba(255,255,255,0.76); font-size:20px; font-weight:400; padding:7px 10px; line-height:1;">
                        <i class="fas fa-location-dot" style="margin-right:6px;"></i>
                        {{ event.address.city }}/{{ event.address.state }}
                      </span>
                    </div>

                    <span v-if="isPast(event.event_date)" style="
                        display:inline-flex; align-items:top; justify-content:top;
                        background:#DC2626; color:#ffffff; font-size:12px; font-weight:900;
                        letter-spacing:1px; padding:2px 8px 10px 8px; border-radius:999px;
                        text-transform:uppercase; line-height:1;
                      ">REALIZADO</span>

                    <p v-if="event.enterprise_name" style="
                        color:rgba(255,255,255,0.55); font-size:11px; margin:0 0 10px 0;
                        text-transform:uppercase; letter-spacing:1px; font-weight:700;
                      ">{{ event.enterprise_name }}</p>
                  </div>
                </div>
              </div>
            </template>

            <div style="text-align:center; padding-top:18px;">
              <p style="color:rgba(255,255,255,0.35); font-size:11px; letter-spacing:1px; margin:0 0 10px 0;">
                Datas sujeitas a alteração
              </p>
              <img :src="FOOTER_LOGO" alt="Menin"
                style="height:72px; width:auto; filter:brightness(0) invert(1); display:block; margin:0 auto 8px;" />
              <p style="color:rgba(255,255,255,0.35); font-size:10px; letter-spacing:0.5px; margin:0;">
                Este relatório foi gerado por
                <strong style="color:rgba(255,255,255,0.55);">{{ authStore.user?.username }}</strong>
                no Menin Office.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Submodal: e-mail -->
    <Modal :open="showEmailModal" size="md" @close="showEmailModal = false">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
            <i class="fas fa-paper-plane text-sm"></i>
          </div>
          <div>
            <h3 class="text-base font-semibold text-ink">Enviar por e-mail</h3>
            <p class="text-xs text-ink-muted mt-0.5">O relatório será enviado como imagem.</p>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <Input v-model="emailTo" label="Destinatário(s)" required
          placeholder="email@exemplo.com, outro@exemplo.com"
          iconLeft="fas fa-envelope"
          hint="Separe múltiplos e-mails com vírgula" />

        <Input v-model="emailSubject" label="Assunto" />

        <div>
          <label class="block text-xs font-medium text-ink-muted mb-1.5">Mensagem (opcional)</label>
          <textarea v-model="emailMessage" rows="4"
            placeholder="Segue em anexo o cronograma de eventos..."
            class="w-full px-3.5 py-2 text-sm bg-surface-raised text-ink border border-line rounded-lg
                   placeholder:text-ink-subtle outline-none resize-none transition-all shadow-inner-soft
                   focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20" />
        </div>

        <div v-if="emailError"
          class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <i class="fas fa-circle-exclamation"></i>{{ emailError }}
        </div>

        <div v-if="emailSuccess"
          class="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <i class="fas fa-check-circle"></i>E-mail enviado com sucesso!
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="showEmailModal = false" :disabled="sending">Cancelar</Button>
        <Button :loading="sending" :disabled="!emailTo.trim()" icon="fas fa-paper-plane" @click="sendEmail">
          {{ sending ? 'Enviando...' : 'Enviar' }}
        </Button>
      </template>
    </Modal>
  </Modal>
</template>
