<script setup>
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

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

// Seleção
const selectedIds = ref(new Set());

// Datas
const startDate = ref('');
const endDate = ref('');

// Assets locais seguros para export
const DEFAULT_IMAGE = '/Mlogo.png';
const FOOTER_LOGO = '/menin-vazada-branca.png';

// Cache em memória
const imageStatusMap = ref({});
const imageExportMap = ref({});

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const toInputDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getStartOfWeek = (date = new Date()) => {
    const current = new Date(date);
    const day = current.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    current.setDate(current.getDate() + diff);
    current.setHours(0, 0, 0, 0);
    return current;
};

const getEndOfWeek = (date = new Date()) => {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
};

const normalizeDate = (value, endOfDay = false) => {
    if (!value) return null;
    const date = new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`);
    return isNaN(date.getTime()) ? null : date;
};

const isDataUrl = (value) => /^data:/i.test(value || '');

const isSafeForCanvas = (value) => {
    if (!value || typeof value !== 'string') return false;
    if (value.startsWith('/')) return true;
    if (isDataUrl(value)) return true;

    try {
        const parsed = new URL(value, window.location.origin);
        return parsed.origin === window.location.origin;
    } catch {
        return false;
    }
};

const getRawEventImage = (event) => {
    const eventImage =
        Array.isArray(event.images) && event.images.length
            ? event.images[0]
            : event.image || event.cover_image || null;

    const enterpriseImage =
        event.enterprise_photo ||
        event.enterprise_image ||
        event.enterprise_logo ||
        null;

    return eventImage || enterpriseImage || DEFAULT_IMAGE;
};

const getImageKey = (event) => `event-${event?.id}`;

const setImageStatus = (event, status) => {
    const key = getImageKey(event);
    imageStatusMap.value = {
        ...imageStatusMap.value,
        [key]: status,
    };
};

const getImageStatus = (event) => {
    const key = getImageKey(event);
    return imageStatusMap.value[key] || 'idle';
};

const setExportImage = (event, value) => {
    const key = getImageKey(event);
    imageExportMap.value = {
        ...imageExportMap.value,
        [key]: value,
    };
};

// Preview: usa a imagem real até falhar
const getResolvedPreviewImage = (event) => {
    const raw = getRawEventImage(event);
    const status = getImageStatus(event);

    if (status === 'error') return DEFAULT_IMAGE;
    return raw || DEFAULT_IMAGE;
};

// Export/e-mail: usa apenas imagem segura para canvas
const getResolvedExportImage = (event) => {
    const raw = getRawEventImage(event);
    const key = getImageKey(event);

    if (imageExportMap.value[key]) return imageExportMap.value[key];
    if (isSafeForCanvas(raw)) return raw;
    return DEFAULT_IMAGE;
};
const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

const tryConvertImageToDataUrl = async (src) => {
    if (!src) return null;

    if (src.startsWith('/')) return src;
    if (isDataUrl(src)) return src;

    try {
        const response = await fetch(src, {
            mode: 'cors',
            credentials: 'omit',
        });

        if (!response.ok) return null;

        const blob = await response.blob();
        return await blobToDataUrl(blob);
    } catch {
        return null;
    }
};

const previewLoadedImageMap = ref({});

const preloadImageForExport = async (src) => {
    if (!src) return DEFAULT_IMAGE;

    if (isSafeForCanvas(src)) return src;

    const converted = await tryConvertImageToDataUrl(src);
    if (converted) return converted;

    return DEFAULT_IMAGE;
};

const hydrateExportImages = async () => {
    const tasks = selectedEvents.value.map(async (event) => {
        const raw = getRawEventImage(event);
        const resolved = await preloadImageForExport(raw);
        setExportImage(event, resolved || DEFAULT_IMAGE);
    });

    await Promise.all(tasks);
};

const truncateDescription = (text, max = 160) => {
    if (!text) return '';
    if (text.length <= max) return text;
    return `${text.slice(0, max).trim()}...`;
};

const formatEventDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const h = d.getHours();
    const m = d.getMinutes();
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
};

const formatDateShort = (dateStr) =>
    new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

const isPast = (dateStr) => new Date(dateStr) < new Date();

const filteredEvents = computed(() => {
    const start = normalizeDate(startDate.value, false);
    const end = normalizeDate(endDate.value, true);

    return [...props.events]
        .filter((event) => {
            const eventDate = new Date(event.event_date);
            if (isNaN(eventDate.getTime())) return false;
            if (start && eventDate < start) return false;
            if (end && eventDate > end) return false;
            return true;
        })
        .sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
});

watch(
    () => props.events,
    () => {
        selectedIds.value = new Set(filteredEvents.value.map((event) => event.id));
        if (!reportTitle.value?.trim()) reportTitle.value = 'Cronograma de Eventos';
    },
    { immediate: true, deep: true }
);

watch(
    filteredEvents,
    (events) => {
        const availableIds = new Set(events.map((event) => event.id));
        selectedIds.value = new Set([...selectedIds.value].filter((id) => availableIds.has(id)));

        if (!selectedIds.value.size && events.length) {
            selectedIds.value = new Set(events.map((event) => event.id));
        }
    },
    { immediate: true }
);

watch(
    selectedIds,
    async () => {
        await hydrateExportImages();
    },
    { deep: true }
);

watch(
    [startDate, endDate],
    async () => {
        await hydrateExportImages();
    }
);

const selectAll = () => {
    selectedIds.value = new Set(filteredEvents.value.map((event) => event.id));
};

const deselectAll = () => {
    selectedIds.value = new Set();
};

const toggleEvent = (id) => {
    const next = new Set(selectedIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds.value = next;
};

const selectedEvents = computed(() =>
    filteredEvents.value.filter((event) => selectedIds.value.has(event.id))
);

const dateRangeLabel = computed(() => {
    if (!selectedEvents.value.length) return '';

    const timestamps = selectedEvents.value.map((event) => new Date(event.event_date).getTime());
    const min = new Date(Math.min(...timestamps));
    const max = new Date(Math.max(...timestamps));

    const fmt = (date) => `${date.getDate()} ${MONTHS_PT[date.getMonth()]}`;

    if (min.toDateString() === max.toDateString()) return fmt(min);
    return `${fmt(min)} à ${fmt(max)}`;
});

const captureReport = async (scale = 2.2) => {
    await hydrateExportImages();

    const { default: html2canvas } = await import('html2canvas');
    return html2canvas(reportRef.value, {
        scale,
        useCORS: false,
        allowTaint: false,
        backgroundColor: '#0F2747',
        logging: false,
    });
};

const exportPDF = async () => {
    if (!selectedEvents.value.length) return;

    exporting.value = true;
    exportError.value = '';

    try {
        const { default: jsPDF } = await import('jspdf');
        const canvas = await captureReport(2.2);
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true,
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const ratio = canvas.width / canvas.height;
        let renderWidth = pageWidth;
        let renderHeight = renderWidth / ratio;

        if (renderHeight > pageHeight) {
            renderHeight = pageHeight;
            renderWidth = renderHeight * ratio;
        }

        const x = (pageWidth - renderWidth) / 2;
        const y = (pageHeight - renderHeight) / 2;

        pdf.addImage(imgData, 'JPEG', x, y, renderWidth, renderHeight, undefined, 'FAST');

        const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        pdf.save(`Cronograma_Eventos_${date}.pdf`);
    } catch (err) {
        exportError.value = 'Erro ao gerar PDF.';
        console.error(err);
    } finally {
        exporting.value = false;
    }
};

const exportJPG = async () => {
    if (!selectedEvents.value.length) return;

    exporting.value = true;
    exportError.value = '';

    try {
        const canvas = await captureReport(2.2);
        const link = document.createElement('a');
        link.download = `Cronograma_Eventos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.94);
        link.click();
    } catch (err) {
        exportError.value = 'Erro ao gerar JPG.';
        console.error(err);
    } finally {
        exporting.value = false;
    }
};

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
        const canvas = await captureReport(1);
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.5);

        await requestWithAuth('/events/report/email', {
            method: 'POST',
            body: JSON.stringify({
                to: emailTo.value.split(',').map((email) => email.trim()).filter(Boolean),
                subject: emailSubject.value || `${reportTitle.value || 'Cronograma de Eventos'} — Menin`,
                message: emailMessage.value,
                imageBase64,
                reportTitle: reportTitle.value || 'Cronograma de Eventos',
            }),
        });

        emailSuccess.value = true;
        setTimeout(() => {
            showEmailModal.value = false;
        }, 2200);
    } catch (err) {
        emailError.value = err.message || 'Erro ao enviar. Tente novamente.';
    } finally {
        sending.value = false;
    }
};

const onPreviewImageError = (event) => {
    setImageStatus(event, 'error');
};

const onPreviewImageLoad = async (event) => {
    setImageStatus(event, 'loaded');

    const raw = getRawEventImage(event);
    const key = getImageKey(event);

    if (imageExportMap.value[key]) return;

    const converted = await preloadImageForExport(raw);
    setExportImage(event, converted || DEFAULT_IMAGE);
};

startDate.value = toInputDate(getStartOfWeek());
endDate.value = toInputDate(getEndOfWeek());
</script>

<template>
    <Teleport to="body">
        <div
            class="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
            <div class="bg-white dark:bg-slate-900 rounded-[24px] w-full max-w-[1180px] flex flex-col overflow-hidden"
                style="max-height: 95vh; min-height: 72vh;">
                <!-- Header -->
                <div class="shrink-0 px-5 md:px-6 py-4 bg-white dark:bg-slate-900">
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex items-center gap-4 min-w-0">
                            <div class="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0">
                                <i class="fas fa-file-export text-white text-base"></i>
                            </div>

                            <div class="min-w-0">
                                <h2 class="font-semibold text-slate-900 dark:text-white text-xl leading-tight">
                                    Gerar Relatório de Eventos
                                </h2>
                                <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    {{ selectedIds.size }} selecionado(s) • {{ filteredEvents.length }} evento(s) no
                                    período
                                </p>
                            </div>
                        </div>

                        <button @click="$emit('close')"
                            class="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                            title="Fechar">
                            <i class="fas fa-times text-base"></i>
                        </button>
                    </div>
                </div>

                <div class="flex flex-1 min-h-0 overflow-hidden">
                    <!-- Sidebar -->
                    <aside
                        class="w-full max-w-[360px] shrink-0 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-5 md:p-6">
                        <div class="space-y-4">
                            <div class="rounded-2xl bg-white dark:bg-slate-900 p-4">
                                <label
                                    class="block text-[11px] font-bold text-slate-500 uppercase tracking-[0.16em] mb-2">
                                    Título do relatório
                                </label>
                                <input v-model="reportTitle" type="text" placeholder="Cronograma de Eventos"
                                    class="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>

                            <div class="rounded-2xl bg-white dark:bg-slate-900 p-4">
                                <div class="flex items-center gap-2 mb-4">
                                    <i class="fas fa-calendar-week text-blue-500"></i>
                                    <span
                                        class="text-sm font-semibold text-slate-800 dark:text-slate-100">Período</span>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label
                                            class="block text-[11px] font-bold text-slate-500 uppercase tracking-[0.14em] mb-2">
                                            Data inicial
                                        </label>
                                        <input v-model="startDate" type="date"
                                            class="w-full px-3 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>

                                    <div>
                                        <label
                                            class="block text-[11px] font-bold text-slate-500 uppercase tracking-[0.14em] mb-2">
                                            Data final
                                        </label>
                                        <input v-model="endDate" type="date"
                                            class="w-full px-3 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                </div>

                                <div class="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
                                    <p class="text-[11px] font-bold text-slate-500 uppercase tracking-[0.14em] mb-1">
                                        Pré-visualização
                                    </p>
                                    <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                        {{ dateRangeLabel || 'Nenhum evento no período' }}
                                    </p>
                                </div>
                            </div>

                            <div class="rounded-2xl bg-white dark:bg-slate-900 p-4">
                                <div class="flex items-center justify-between mb-4 gap-3">
                                    <div class="min-w-0">
                                        <p class="text-[11px] font-bold text-slate-500 uppercase tracking-[0.16em]">
                                            Eventos
                                        </p>
                                        <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                            {{ selectedIds.size }}/{{ filteredEvents.length }} selecionados
                                        </p>
                                    </div>

                                    <div class="flex items-center gap-2 shrink-0">
                                        <button @click="selectAll"
                                            class="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 transition">
                                            <i class="fas fa-check-double mr-1"></i>
                                            Todos
                                        </button>

                                        <button @click="deselectAll"
                                            class="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 transition">
                                            <i class="fas fa-ban mr-1"></i>
                                            Nenhum
                                        </button>
                                    </div>
                                </div>

                                <div class="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                                    <label v-for="event in filteredEvents" :key="event.id"
                                        class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 cursor-pointer transition hover:bg-slate-100 dark:hover:bg-slate-700">
                                        <input type="checkbox" :checked="selectedIds.has(event.id)"
                                            @change="toggleEvent(event.id)"
                                            class="w-4 h-4 mt-1 text-blue-600 rounded border-slate-300 dark:border-slate-600 cursor-pointer shrink-0" />

                                        <div
                                            class="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0">
                                            <img :src="getResolvedPreviewImage(event)"
                                                :alt="event.enterprise_name || event.title"
                                                class="w-full h-full object-cover" @error="onPreviewImageError(event)"
                                                @load="onPreviewImageLoad(event)" />
                                        </div>

                                        <div class="min-w-0 flex-1">
                                            <p
                                                class="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                                                {{ event.title }}
                                            </p>
                                            <p class="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                                <i class="fas fa-clock text-slate-400"></i>
                                                {{ formatDateShort(event.event_date) }}
                                            </p>
                                            <p v-if="event.enterprise_name"
                                                class="text-[11px] text-slate-400 mt-1 uppercase tracking-wide truncate">
                                                {{ event.enterprise_name }}
                                            </p>
                                        </div>
                                    </label>

                                    <div v-if="!filteredEvents.length"
                                        class="rounded-xl bg-slate-50 dark:bg-slate-800 p-8 text-center text-sm text-slate-500">
                                        <i class="fas fa-calendar-xmark text-2xl mb-3 block text-slate-400"></i>
                                        Nenhum evento encontrado no período selecionado.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    <!-- Main -->
                    <main class="flex-1 overflow-y-auto min-h-0 bg-slate-100 dark:bg-slate-950 p-5 md:p-6">
                        <div class="flex flex-wrap items-center gap-3 mb-5">
                            <button @click="exportPDF" :disabled="exporting || !selectedEvents.length"
                                class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition">
                                <i :class="exporting ? 'fas fa-spinner fa-spin' : 'fas fa-file-pdf'"></i>
                                Exportar PDF
                            </button>

                            <button @click="exportJPG" :disabled="exporting || !selectedEvents.length"
                                class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition">
                                <i :class="exporting ? 'fas fa-spinner fa-spin' : 'fas fa-image'"></i>
                                Exportar JPG
                            </button>

                            <button @click="openEmailModal" :disabled="exporting || !selectedEvents.length"
                                class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition">
                                <i class="fas fa-envelope-open-text"></i>
                                Enviar por E-mail
                            </button>

                            <div
                                class="ml-auto flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                                <i class="fas fa-layer-group text-blue-500"></i>
                                <span class="font-semibold">{{ selectedEvents.length }}</span>
                                <span>evento(s)</span>
                            </div>

                            <span v-if="exporting" class="text-xs text-slate-500 flex items-center gap-2 w-full mt-1">
                                <i class="fas fa-spinner fa-spin text-blue-500"></i>
                                Gerando relatório...
                            </span>

                            <p v-if="exportError" class="text-xs text-rose-500 w-full mt-1">
                                {{ exportError }}
                            </p>
                        </div>

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
                                        <div style="
                                                display:flex;
                                                gap:22px;
                                                padding:22px;
                                                align-items:flex-start;
                                            ">
                                            <div style="
                                                    min-width:110px;
                                                    display:flex;
                                                    flex-direction:column;
                                                    align-items:center;
                                                    gap:12px;
                                                ">
                                                <div style="
                                                        font-size:32px;
                                                        font-weight:900;
                                                        color:#fbbb22;
                                                        line-height:1;
                                                        text-align:center;
                                                    ">
                                                    {{ formatEventDate(event.event_date) }}
                                                </div>

                                                <img :src="getResolvedExportImage(event)"
                                                    :alt="event.enterprise_name || event.title" style="
                                                        width:72px;
                                                        height:72px;
                                                        object-fit:cover;
                                                        display:block; 
                                                        padding: px;
                                                    " />
                                            </div>

                                            <div style="
                                                    width:1px;
                                                    background:rgba(255,255,255,0.10);
                                                    align-self:stretch;
                                                    flex-shrink:0;
                                                "></div>

                                            <div style="flex:1; padding-top:2px; min-width:0;">
                                                <h2 style="
                                                        color:#ffffff;
                                                        font-size:18px;
                                                        font-weight:800;
                                                        text-transform:uppercase;
                                                        letter-spacing:0.8px;
                                                        margin:0 0 10px 0;
                                                        line-height:1.35;
                                                    ">
                                                    {{ event.title }}
                                                </h2>

                                                <div style="
                                                        display:flex;
                                                        flex-wrap:wrap;
                                                        gap:8px;
                                                        margin-bottom:10px;
                                                        align-items:center;
                                                    ">
                                                    <span style=" 
                                                            color:rgba(255,255,255,0.86);
                                                            font-size:20px;
                                                            font-weight:400;
                                                            padding:7px 10px; 
                                                            line-height:1;
                                                        ">
                                                        <i class="fas fa-clock" style="margin-right:6px;"></i>
                                                        {{ formatTime(event.event_date) }}
                                                    </span>
                                                    |
                                                    <span v-if="event.address?.city" style=" 
                                                            color:rgba(255,255,255,0.76);
                                                            font-size:20px;
                                                            font-weight:400;
                                                            padding:7px 10px; 
                                                            line-height:1;
                                                        ">
                                                        <i class="fas fa-location-dot" style="margin-right:6px;"></i>
                                                        {{ event.address.city }}/{{ event.address.state }}
                                                    </span>

                                                </div>

                                                <span v-if="isPast(event.event_date)" style="
                                                            display:inline-flex;
                                                            align-items:top;
                                                            justify-content:top;
                                                            background:#DC2626;
                                                            color:#ffffff;
                                                            font-size:12px;
                                                            font-weight:900;
                                                            letter-spacing:1px;
                                                            padding:2px 8px 10px 8px;
                                                            border-radius:999px;
                                                            text-transform:uppercase;
                                                            line-height:1;
                                                        ">
                                                    REALIZADO
                                                </span>

                                                <p v-if="event.enterprise_name" style="
                                                        color:rgba(255,255,255,0.55);
                                                        font-size:11px;
                                                        margin:0 0 10px 0;
                                                        text-transform:uppercase;
                                                        letter-spacing:1px;
                                                        font-weight:700;
                                                    ">
                                                    {{ event.enterprise_name }}
                                                </p>

                                            </div>
                                        </div>
                                    </div>
                                </template>

                                <div style="text-align:center; padding-top:18px;">
                                    <p style="
                                            color:rgba(255,255,255,0.35);
                                            font-size:11px;
                                            letter-spacing:1px;
                                            margin:0 0 10px 0;
                                        ">
                                        Datas sujeitas a alteração
                                    </p>

                                    <img :src="FOOTER_LOGO" alt="Menin" style="
                                            height:72px;
                                            width:auto;
                                            filter:brightness(0) invert(1);
                                            display:block;
                                            margin:0 auto 8px;
                                        " />

                                    <p style="
                                            color:rgba(255,255,255,0.35);
                                            font-size:10px;
                                            letter-spacing:0.5px;
                                            margin:0;
                                        ">
                                        Este relatório foi gerado por
                                        <strong style="color:rgba(255,255,255,0.55);">
                                            {{ authStore.user?.username }}
                                        </strong>
                                        no Menin Office.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>

        <!-- Modal e-mail -->
        <div v-if="showEmailModal"
            class="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-white dark:bg-slate-900 rounded-[24px] w-full max-w-lg p-6">
                <div class="flex items-center justify-between mb-5">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                            <i class="fas fa-paper-plane text-white"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-slate-900 dark:text-white text-lg">Enviar por E-mail</h3>
                            <p class="text-xs text-slate-500 dark:text-slate-400">O relatório será enviado como imagem
                            </p>
                        </div>
                    </div>

                    <button @click="showEmailModal = false"
                        class="w-10 h-10 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Destinatário(s) <span class="text-rose-500">*</span>
                        </label>
                        <input v-model="emailTo" type="text" placeholder="email@exemplo.com, outro@exemplo.com"
                            class="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <p class="text-xs text-slate-400 mt-1">Separe múltiplos e-mails com vírgula</p>
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Assunto</label>
                        <input v-model="emailSubject" type="text"
                            class="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                        <label class="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Mensagem (opcional)
                        </label>
                        <textarea v-model="emailMessage" rows="4"
                            placeholder="Segue em anexo o cronograma de eventos..."
                            class="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
                    </div>
                </div>

                <div v-if="emailError"
                    class="mt-4 flex items-center gap-2 text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/20 rounded-xl px-4 py-3">
                    <i class="fas fa-exclamation-circle shrink-0"></i>
                    {{ emailError }}
                </div>

                <div v-if="emailSuccess"
                    class="mt-4 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-4 py-3">
                    <i class="fas fa-check-circle shrink-0"></i>
                    E-mail enviado com sucesso!
                </div>

                <div class="flex gap-3 mt-6">
                    <button @click="showEmailModal = false"
                        class="flex-1 px-4 py-3 text-sm font-bold rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition">
                        Cancelar
                    </button>

                    <button @click="sendEmail" :disabled="sending || !emailTo.trim()"
                        class="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition">
                        <i :class="sending ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'"></i>
                        {{ sending ? 'Enviando...' : 'Enviar' }}
                    </button>
                </div>
            </div>
        </div>
    </Teleport>
</template>