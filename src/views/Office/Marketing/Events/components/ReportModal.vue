<script setup>
/**
 * ReportModal.vue — Gerador de Relatório de Eventos
 * Dependências: npm install html2canvas jspdf
 */
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const props = defineProps({
    events: { type: Array, default: () => [] },
});
const emit = defineEmits(['close']);

const authStore = useAuthStore();
const reportRef = ref(null);
const reportTitle = ref('');
const exporting = ref(false);
const exportError = ref('');

// ─── E-mail ───────────────────────────────────────────────────────────────────
const showEmailModal = ref(false);
const emailTo = ref('');
const emailSubject = ref('');
const emailMessage = ref('');
const emailError = ref('');
const emailSuccess = ref(false);
const sending = ref(false);

// ─── Seleção de eventos ───────────────────────────────────────────────────────
const selectedIds = ref(new Set());

const sortedEvents = computed(() =>
    [...props.events].sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
);

watch(() => props.events, (ev) => {
    selectedIds.value = new Set(ev.map(e => e.id));
}, { immediate: true });

const selectAll = () => { selectedIds.value = new Set(sortedEvents.value.map(e => e.id)); };
const deselectAll = () => { selectedIds.value = new Set(); };
const toggleEvent = (id) => {
    const s = new Set(selectedIds.value);
    s.has(id) ? s.delete(id) : s.add(id);
    selectedIds.value = s;
};

const selectedEvents = computed(() =>
    sortedEvents.value.filter(e => selectedIds.value.has(e.id))
);

// ─── Helpers de data/hora ─────────────────────────────────────────────────────
const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const dateRangeLabel = computed(() => {
    if (!selectedEvents.value.length) return '';
    const timestamps = selectedEvents.value.map(e => new Date(e.event_date).getTime());
    const min = new Date(Math.min(...timestamps));
    const max = new Date(Math.max(...timestamps));
    const fmt = (d) => `${d.getDate()} ${MONTHS_PT[d.getMonth()]}`;
    if (min.toDateString() === max.toDateString()) return fmt(min);
    return `${fmt(min)} à ${max.getDate()}/${String(max.getMonth() + 1).padStart(2, '0')}`;
});

const formatEventDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const h = d.getHours();
    const m = d.getMinutes();
    return m === 0 ? `${h}h` : `${h}h ${String(m).padStart(2, '0')}`;
};

const formatDateShort = (dateStr) =>
    new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const isPast = (dateStr) => new Date(dateStr) < new Date();

// ─── Captura do relatório com html2canvas ─────────────────────────────────────
const captureReport = async () => {
    const { default: html2canvas } = await import('html2canvas');
    return html2canvas(reportRef.value, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#0C2340',
        logging: false,
    });
};

// ─── Exportar PDF ─────────────────────────────────────────────────────────────
const exportPDF = async () => {
    if (!selectedEvents.value.length) return;
    exporting.value = true;
    exportError.value = '';
    try {
        const { default: jsPDF } = await import('jspdf');
        const canvas = await captureReport();
        const w = canvas.width / 2;
        const h = canvas.height / 2;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [w, h] });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
        const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        pdf.save(`Cronograma_Eventos_${date}.pdf`);
    } catch (err) {
        exportError.value = 'Erro ao gerar PDF. Verifique se html2canvas e jspdf estão instalados.';
        console.error(err);
    } finally {
        exporting.value = false;
    }
};

// ─── Exportar JPG ─────────────────────────────────────────────────────────────
const exportJPG = async () => {
    if (!selectedEvents.value.length) return;
    exporting.value = true;
    exportError.value = '';
    try {
        const canvas = await captureReport();
        const link = document.createElement('a');
        link.download = `Cronograma_Eventos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.92);
        link.click();
    } catch (err) {
        exportError.value = 'Erro ao gerar JPG.';
        console.error(err);
    } finally {
        exporting.value = false;
    }
};

// ─── Enviar por e-mail ────────────────────────────────────────────────────────
const openEmailModal = () => {
    emailTo.value = '';
    emailSubject.value = `${reportTitle.value || 'Cronograma de Eventos'} — Menin`;
    emailMessage.value = '';
    emailError.value = '';
    emailSuccess.value = false;
    showEmailModal.value = true;
};

const sendEmail = async () => {
    if (!emailTo.value.trim()) return;
    sending.value = true;
    emailError.value = '';
    emailSuccess.value = false;
    try {
        const canvas = await captureReport();
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.88);
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
        setTimeout(() => { showEmailModal.value = false; }, 2500);
    } catch (err) {
        emailError.value = err.message || 'Erro ao enviar. Tente novamente.';
    } finally {
        sending.value = false;
    }
};
</script>

<template>
    <Teleport to="body">

        <!-- Overlay principal -->
        <div class="fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-4 py-8 overflow-y-auto">
            <div class="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col"
                style="max-height: 92vh; min-height: 70vh;">

                <!-- Header -->
                <div
                    class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <div class="flex items-center gap-3">
                        <div
                            class="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                            <i class="fas fa-file-image text-blue-600 dark:text-blue-400"></i>
                        </div>
                        <div>
                            <h2 class="font-bold text-gray-900 dark:text-white leading-tight">Gerar Relatório de Eventos
                            </h2>
                            <p class="text-xs text-gray-400">{{ selectedIds.size }} evento(s) selecionado(s)</p>
                        </div>
                    </div>
                    <button @click="$emit('close')"
                        class="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Corpo: dois painéis -->
                <div class="flex flex-1 overflow-hidden min-h-0">

                    <!-- ── Painel esquerdo: configuração ────────────────────── -->
                    <aside
                        class="w-72 shrink-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4 space-y-5">

                        <!-- Título -->
                        <div>
                            <label
                                class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                                Título do Relatório
                            </label>
                            <input v-model="reportTitle" type="text" placeholder="Cronograma de Eventos"
                                class="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>

                        <!-- Período calculado -->
                        <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Período</p>
                            <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ dateRangeLabel || '—' }}
                            </p>
                        </div>

                        <!-- Seleção de eventos -->
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span
                                    class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Eventos
                                    <span class="text-blue-500 font-bold">({{ selectedIds.size }}/{{ sortedEvents.length
                                        }})</span>
                                </span>
                                <div class="flex gap-2 text-xs">
                                    <button @click="selectAll"
                                        class="text-blue-600 dark:text-blue-400 hover:underline">Todos</button>
                                    <span class="text-gray-300 dark:text-gray-600">|</span>
                                    <button @click="deselectAll" class="text-red-500 hover:underline">Nenhum</button>
                                </div>
                            </div>

                            <div class="space-y-0.5">
                                <label v-for="event in sortedEvents" :key="event.id"
                                    class="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer transition-colors">
                                    <input type="checkbox" :checked="selectedIds.has(event.id)"
                                        @change="toggleEvent(event.id)"
                                        class="w-4 h-4 mt-0.5 text-blue-600 rounded border-gray-300 dark:border-gray-600 cursor-pointer shrink-0" />
                                    <div class="min-w-0 flex-1">
                                        <p
                                            class="text-sm font-medium text-gray-800 dark:text-gray-200 leading-tight truncate">
                                            {{ event.title }}
                                        </p>
                                        <p class="text-xs text-gray-400 mt-0.5">{{ formatDateShort(event.event_date) }}
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </aside>

                    <!-- ── Painel direito: preview ──────────────────────────── -->
                    <main class="flex-1 overflow-y-auto p-6 bg-gray-100 dark:bg-gray-950 min-h-0">

                        <!-- Botões de exportação -->
                        <div class="flex flex-wrap items-center gap-2 mb-5">
                            <button @click="exportPDF" :disabled="exporting || !selectedEvents.length"
                                class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition shadow-sm">
                                <i :class="exporting ? 'fas fa-spinner fa-spin' : 'fas fa-file-pdf'"></i>
                                Salvar PDF
                            </button>
                            <button @click="exportJPG" :disabled="exporting || !selectedEvents.length"
                                class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition shadow-sm">
                                <i :class="exporting ? 'fas fa-spinner fa-spin' : 'fas fa-image'"></i>
                                Salvar JPG
                            </button>
                            <button @click="openEmailModal" :disabled="exporting || !selectedEvents.length"
                                class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition shadow-sm">
                                <i class="fas fa-envelope"></i>
                                Enviar por E-mail
                            </button>
                            <span v-if="exporting" class="text-xs text-gray-500 flex items-center gap-1.5">
                                <i class="fas fa-spinner fa-spin text-blue-500"></i> Gerando...
                            </span>
                            <p v-if="exportError" class="text-xs text-red-500 w-full mt-1">{{ exportError }}</p>
                        </div>

                        <!-- ────────────────────────────────────────────────── -->
                        <!-- RELATÓRIO — TODOS OS ESTILOS SÃO INLINE           -->
                        <!-- para garantir captura correta pelo html2canvas     -->
                        <!-- ────────────────────────────────────────────────── -->
                        <div class="flex justify-center">
                            <div ref="reportRef"
                                style="background-color:#0C2340; padding:48px 40px; font-family:'Arial','Helvetica',sans-serif; width:680px; box-sizing:border-box;">

                                <!-- Cabeçalho -->
                                <div style="text-align:center; margin-bottom:36px;">
                                    <h1
                                        style="color:#ffffff; font-size:28px; font-weight:900; letter-spacing:4px; text-transform:uppercase; margin:0 0 10px 0; line-height:1.2;">
                                        {{ reportTitle || 'CRONOGRAMA DE EVENTOS' }}
                                    </h1>
                                    <p v-if="dateRangeLabel"
                                        style="color:#ffffff; font-size:20px; font-weight:400; letter-spacing:3px; margin:0;">
                                        {{ dateRangeLabel }}
                                    </p>
                                </div>

                                <!-- Estado vazio -->
                                <div v-if="!selectedEvents.length"
                                    style="text-align:center; padding:40px 0; color:rgba(255,255,255,0.3); font-size:14px;">
                                    Nenhum evento selecionado
                                </div>

                                <!-- Eventos -->
                                <template v-else>
                                    <div v-for="event in selectedEvents" :key="event.id">
                                        <!-- Divisor -->
                                        <div style="border-top:1px solid rgba(255,255,255,0.18); margin:0;"></div>

                                        <!-- Linha do evento -->
                                        <div style="display:flex; gap:24px; padding:20px 0; align-items:flex-start;">

                                            <!-- Coluna esquerda: data + logo -->
                                            <div
                                                style="min-width:90px; display:flex; flex-direction:column; align-items:center; gap:10px;">

                                                <span
                                                    style="font-size:52px; font-weight:900; color:#E8A800; line-height:1; display:block; white-space:nowrap; text-align:center;">
                                                    {{ formatEventDate(event.event_date) }}
                                                </span>

                                                <img v-if="event.enterprise_logo || (event.images && event.images.length)"
                                                    :src="event.enterprise_logo || event.images[0]"
                                                    :alt="event.enterprise_name || event.title" crossorigin="anonymous"
                                                    style="width:56px; height:56px; object-fit:cover; border-radius:8px; display:block;" />
                                            </div>

                                            <!-- Linha vertical -->
                                            <div
                                                style="width:1px; background-color:rgba(255,255,255,0.18); align-self:stretch; margin:4px 0; flex-shrink:0;">
                                            </div>

                                            <!-- Coluna direita: informações -->
                                            <div style="flex:1; padding-top:4px; min-width:0;">
                                                <h2
                                                    style="color:#ffffff; font-size:16px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin:0 0 6px 0; line-height:1.3;">
                                                    {{ event.title }}
                                                </h2>
                                                <p
                                                    style="color:rgba(255,255,255,0.72); font-size:14px; font-weight:400; margin:0 0 6px 0;">
                                                    {{ formatTime(event.event_date) }}
                                                    <template v-if="event.address?.city">
                                                        &nbsp;&nbsp;|&nbsp;&nbsp;{{ event.address.city }}/{{
                                                        event.address.state }}
                                                    </template>
                                                </p>
                                                <p v-if="event.enterprise_name"
                                                    style="color:rgba(255,255,255,0.42); font-size:11px; margin:0 0 8px 0; text-transform:uppercase; letter-spacing:0.5px;">
                                                    {{ event.enterprise_name }}
                                                </p>
                                                <span v-if="isPast(event.event_date)"
                                                    style="display:inline-block; background-color:#DC2626; color:#ffffff; font-size:10px; font-weight:800; letter-spacing:1.5px; padding:3px 8px; border-radius:3px; text-transform:uppercase;">
                                                    REALIZADO
                                                </span>
                                            </div>

                                        </div>
                                    </div>

                                    <!-- Divisor final -->
                                    <div style="border-top:1px solid rgba(255,255,255,0.18); margin:0;"></div>
                                </template>

                                <!-- Rodapé -->
                                <div style="text-align:center; padding-top:28px;">
                                    <p
                                        style="color:rgba(255,255,255,0.35); font-size:11px; letter-spacing:1px; margin:0 0 20px 0;">
                                        datas sujeitas a alteração
                                    </p>
                                    <img src="/Mlogotext.png" alt="Menin" crossorigin="anonymous"
                                        style="height:28px; width:auto; filter:brightness(0) invert(1); display:block; margin:0 auto 6px;" />
                                    <!-- <p style="color:rgba(255,255,255,0.35); font-size:10px; letter-spacing:0.5px; margin:0 0 10px 0; font-style:italic;">
                                        Construindo seus melhores momentos
                                    </p> -->
                                    <p
                                        style="color:rgba(255,255,255,0.35); font-size:10px; letter-spacing:0.5px; margin:0;">
                                        Este relatório foi gerado por
                                        <strong style="color:rgba(255,255,255,0.5);">{{ authStore.user?.username
                                            }}</strong>
                                        no Menin Office.
                                    </p>
                                </div>

                            </div>
                        </div>
                        <!-- fim do relatório -->

                    </main>
                </div>
            </div>
        </div>

        <!-- ── Modal de envio por e-mail ───────────────────────────────────── -->
        <div v-if="showEmailModal" class="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl p-6">

                <div class="flex items-center justify-between mb-5">
                    <h3 class="font-bold text-gray-900 dark:text-white text-lg">Enviar por E-mail</h3>
                    <button @click="showEmailModal = false"
                        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Destinatário(s) <span class="text-red-500">*</span>
                        </label>
                        <input v-model="emailTo" type="text" placeholder="email@exemplo.com, outro@exemplo.com"
                            class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <p class="text-xs text-gray-400 mt-1">Separe múltiplos e-mails com vírgula</p>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Assunto</label>
                        <input v-model="emailSubject" type="text"
                            class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Mensagem (opcional)
                        </label>
                        <textarea v-model="emailMessage" rows="3"
                            placeholder="Segue em anexo o cronograma de eventos..."
                            class="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none">
                </textarea>
                    </div>
                </div>

                <div v-if="emailError"
                    class="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5">
                    <i class="fas fa-exclamation-circle shrink-0"></i>
                    {{ emailError }}
                </div>
                <div v-if="emailSuccess"
                    class="mt-3 flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2.5">
                    <i class="fas fa-check-circle shrink-0"></i>
                    E-mail enviado com sucesso!
                </div>

                <div class="flex gap-3 mt-5">
                    <button @click="showEmailModal = false"
                        class="flex-1 px-4 py-2.5 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        Cancelar
                    </button>
                    <button @click="sendEmail" :disabled="sending || !emailTo.trim()"
                        class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition">
                        <i :class="sending ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'"></i>
                        {{ sending ? 'Enviando...' : 'Enviar' }}
                    </button>
                </div>
            </div>
        </div>

    </Teleport>
</template>
