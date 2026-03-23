// stores/Microsoft/transcriptStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const BASE = `${API_URL}/microsoft/transcripts`;

export const useTranscriptStore = defineStore('transcript', () => {

    // ── Estado ────────────────────────────────────────────────────────────────
    const meetings       = ref([]);   // reuniões recentes do calendário
    const reports        = ref([]);   // relatórios salvos no banco
    const loadingMeetings = ref(false);
    const loadingReports  = ref(false);
    const error = ref(null);

    // Reunião selecionada para visualização
    const selectedMeeting = ref(null);  // objeto da lista de meetings
    const transcriptInfo  = ref(null);  // { available, meetingId, transcripts[] }
    const cues            = ref([]);    // [{speaker, startStr, startSec, text}]
    const report          = ref(null);  // relatório IA completo

    const checkingTranscript  = ref(false);
    const loadingTranscript   = ref(false);
    const generatingReport    = ref(false);

    // ── Reuniões recentes ─────────────────────────────────────────────────────

    async function fetchMeetings(days = 30) {
        loadingMeetings.value = true;
        error.value = null;
        try {
            meetings.value = await requestWithAuth(`${BASE}/meetings?days=${days}`);
        } catch (err) {
            error.value = err.message;
        } finally {
            loadingMeetings.value = false;
        }
    }

    // ── Verificar transcrição de uma reunião ──────────────────────────────────

    async function checkTranscript(meeting) {
        selectedMeeting.value = meeting;
        transcriptInfo.value = null;
        cues.value = [];
        report.value = null;

        if (!meeting.joinUrl) {
            transcriptInfo.value = { available: false, transcripts: [] };
            return;
        }

        checkingTranscript.value = true;
        error.value = null;
        try {
            transcriptInfo.value = await requestWithAuth(
                `${BASE}/check?joinUrl=${encodeURIComponent(meeting.joinUrl)}`
            );
        } catch (err) {
            error.value = err.message;
            transcriptInfo.value = { available: false, transcripts: [] };
        } finally {
            checkingTranscript.value = false;
        }
    }

    // ── Carregar conteúdo da transcrição ─────────────────────────────────────

    async function loadTranscript(meetingId, transcriptId) {
        loadingTranscript.value = true;
        cues.value = [];
        report.value = null;
        error.value = null;
        try {
            const m = selectedMeeting.value;
            const params = new URLSearchParams({
                subject:       m?.subject || '',
                start:         m?.start || '',
                end:           m?.end || '',
                joinUrl:       m?.joinUrl || '',
                webLink:       m?.webLink || '',
                organizerName: m?.organizer?.name || '',
                organizerEmail: m?.organizer?.email || '',
                attendees:     JSON.stringify(m?.attendees || []),
            });
            const data = await requestWithAuth(
                `${BASE}/${meetingId}/${transcriptId}?${params}`
            );
            cues.value = data.cues || [];
            // Se já tem relatório gerado, carrega também
            if (data.reportReady) {
                await loadReport(transcriptId);
            }
            return data;
        } catch (err) {
            error.value = err.message;
            throw err;
        } finally {
            loadingTranscript.value = false;
        }
    }

    // ── Gerar relatório IA ────────────────────────────────────────────────────

    async function generateReport(meetingId, transcriptId, force = false) {
        generatingReport.value = true;
        error.value = null;
        try {
            const data = await requestWithAuth(
                `${BASE}/${meetingId}/${transcriptId}/report`,
                { method: 'POST', body: JSON.stringify({ force }) }
            );
            report.value = data.report;
            // Atualiza lista de relatórios se existir
            if (!data.cached) await fetchReports();
            return data.report;
        } catch (err) {
            error.value = err.message;
            throw err;
        } finally {
            generatingReport.value = false;
        }
    }

    // ── Relatórios salvos ─────────────────────────────────────────────────────

    async function fetchReports() {
        loadingReports.value = true;
        error.value = null;
        try {
            reports.value = await requestWithAuth(`${BASE}/reports`);
        } catch (err) {
            error.value = err.message;
        } finally {
            loadingReports.value = false;
        }
    }

    async function loadReport(transcriptId) {
        // Verifica se já está no estado local
        if (report.value) return report.value;
        // Busca da lista
        const saved = reports.value.find(r => r.transcriptId === transcriptId);
        if (saved) {
            // Carrega completo pelo ID do banco
            const full = await requestWithAuth(`${BASE}/reports/${saved.id}`);
            report.value = full.report;
            cues.value = full.cues || cues.value;
            return full.report;
        }
        return null;
    }

    async function openSavedReport(reportId) {
        loadingTranscript.value = true;
        cues.value = [];
        report.value = null;
        error.value = null;
        try {
            const full = await requestWithAuth(`${BASE}/reports/${reportId}`);
            cues.value = full.cues || [];
            report.value = full.report;
            selectedMeeting.value = {
                subject: full.subject,
                start: full.meetingDate,
                joinUrl: full.joinUrl,
                organizer: { name: full.organizerName },
                attendees: full.attendees || [],
            };
            transcriptInfo.value = {
                available: true,
                meetingId: full.meetingId,
                transcripts: [{ id: full.transcriptId, reportReady: true }],
            };
        } catch (err) {
            error.value = err.message;
        } finally {
            loadingTranscript.value = false;
        }
    }

    function reset() {
        selectedMeeting.value = null;
        transcriptInfo.value = null;
        cues.value = [];
        report.value = null;
        error.value = null;
    }

    return {
        meetings, reports, loadingMeetings, loadingReports, error,
        selectedMeeting, transcriptInfo, cues, report,
        checkingTranscript, loadingTranscript, generatingReport,
        fetchMeetings, checkTranscript, loadTranscript,
        generateReport, fetchReports, openSavedReport, reset,
    };
});
