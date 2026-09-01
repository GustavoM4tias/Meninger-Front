// stores/Microsoft/transcriptStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

import { noteGraphError } from '@/utils/Microsoft/noteGraphError';
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
    const reportDbId          = ref(null);  // ID do banco do relatório atual (para e-mail)
    // Quem já tinha baixado esta transcrição/gerado o relatório. A transcrição é
    // a mesma para todo mundo que esteve na reunião: quando ela vem de outro
    // participante, a tela diz de quem veio em vez de fingir que baixou agora.
    const sharedFrom          = ref(null);
    // Reunião pedida de FORA (clique no evento do calendário). A aba Reuniões
    // ainda nem está montada quando o pedido acontece, então ele fica aqui e é
    // consumido no mount - em vez de a agenda ter que conhecer a outra tela.
    const pendente            = ref(null);
    // Mesma ideia, para uma ATA já salva (a aba Hoje lista as recentes).
    const pendenteRelatorio   = ref(null);

    // ── Reuniões recentes ─────────────────────────────────────────────────────

    async function fetchMeetings(days = 30) {
        loadingMeetings.value = true;
        error.value = null;
        try {
            meetings.value = await requestWithAuth(`${BASE}/meetings?days=${days}`);
        } catch (err) {
            error.value = err.message; noteGraphError(err);
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
        reportDbId.value = null;
        sharedFrom.value = null;

        if (!meeting.joinUrl) {
            transcriptInfo.value = { available: false, transcripts: [] };
            return;
        }

        checkingTranscript.value = true;
        error.value = null;
        try {
            // organizerEmail deixa o backend tentar o caminho de aplicação
            // quando a pessoa apenas PARTICIPOU da reunião. start/end recortam
            // a OCORRÊNCIA: reunião recorrente acumula transcrições de todas as
            // datas no mesmo link, e sem o recorte vinha a da semana errada.
            const organizerEmail = meeting?.organizer?.email || '';
            transcriptInfo.value = await requestWithAuth(
                `${BASE}/check?joinUrl=${encodeURIComponent(meeting.joinUrl)}`
                + (organizerEmail ? `&organizerEmail=${encodeURIComponent(organizerEmail)}` : '')
                + (meeting?.start ? `&start=${encodeURIComponent(meeting.start)}` : '')
                + (meeting?.end ? `&end=${encodeURIComponent(meeting.end)}` : '')
            );
        } catch (err) {
            error.value = err.message; noteGraphError(err);
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
            sharedFrom.value = data.sharedFrom || null;
            // Se já tem relatório gerado, carrega também
            if (data.reportReady) {
                await loadReport(transcriptId);
            }
            return data;
        } catch (err) {
            error.value = err.message; noteGraphError(err);
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
            if (data.sharedFrom) sharedFrom.value = data.sharedFrom;
            // Atualiza lista e captura o ID do banco
            if (!data.cached) await fetchReports();
            const saved = reports.value.find(r => r.transcriptId === transcriptId);
            if (saved) reportDbId.value = saved.id;
            return data.report;
        } catch (err) {
            error.value = err.message; noteGraphError(err);
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
            error.value = err.message; noteGraphError(err);
        } finally {
            loadingReports.value = false;
        }
    }

    async function loadReport(transcriptId) {
        // Verifica se já está no estado local
        if (report.value) return report.value;
        // Busca na lista local; se vazia, tenta buscar do backend
        let saved = reports.value.find(r => r.transcriptId === transcriptId);
        if (!saved) {
            await fetchReports();
            saved = reports.value.find(r => r.transcriptId === transcriptId);
        }
        if (saved) {
            const full = await requestWithAuth(`${BASE}/reports/${saved.id}`);
            report.value = full.report;
            reportDbId.value = saved.id;
            cues.value = full.cues || cues.value;
            return full.report;
        }
        return null;
    }

    async function openSavedReport(reportId) {
        loadingTranscript.value = true;
        cues.value = [];
        report.value = null;
        reportDbId.value = null;
        sharedFrom.value = null;
        error.value = null;
        try {
            const full = await requestWithAuth(`${BASE}/reports/${reportId}`);
            cues.value = full.cues || [];
            report.value = full.report;
            reportDbId.value = reportId;
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
            error.value = err.message; noteGraphError(err);
        } finally {
            loadingTranscript.value = false;
        }
    }

    function reset() {
        selectedMeeting.value = null;
        transcriptInfo.value = null;
        cues.value = [];
        report.value = null;
        reportDbId.value = null;
        sharedFrom.value = null;
        error.value = null;
    }

    return {
        meetings, reports, loadingMeetings, loadingReports, error,
        selectedMeeting, transcriptInfo, cues, report, reportDbId,
        checkingTranscript, loadingTranscript, generatingReport, sharedFrom, pendente, pendenteRelatorio,
        fetchMeetings, checkTranscript, loadTranscript,
        generateReport, fetchReports, loadReport, openSavedReport, reset,
    };
});
