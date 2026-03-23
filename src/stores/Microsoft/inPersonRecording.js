// stores/Microsoft/inPersonRecording.js
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';

function secToStr(totalSec) {
    const h   = Math.floor(totalSec / 3600);
    const m   = Math.floor((totalSec % 3600) / 60);
    const s   = Math.floor(totalSec % 60);
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export const useInPersonRecordingStore = defineStore('inPersonRecording', () => {
    // ── State ─────────────────────────────────────────────────────────────────
    const isActive     = ref(false);   // Sessão aberta (gravando ou pausado)
    const isRecording  = ref(false);   // Microfone ativo
    const isPaused     = ref(false);
    const meetingId    = ref(null);    // ID do banco após POST
    const title        = ref('');
    const location     = ref('');
    const attendees    = ref([]);
    const startedAt    = ref(null);
    const elapsedSec   = ref(0);
    const cues         = ref([]);      // [{speaker, startStr, startSec, text}]
    const interimText  = ref('');
    const hasMicSupport = ref(true);

    // ── Internals (não reativas) ───────────────────────────────────────────────
    let recognition    = null;
    let timerInterval  = null;
    let autoSaveTimer  = null;

    // ── Computed ──────────────────────────────────────────────────────────────
    const timerDisplay = computed(() => secToStr(elapsedSec.value));

    // ── Timer ─────────────────────────────────────────────────────────────────
    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (isRecording.value) elapsedSec.value++;
        }, 1000);
    }

    // ── Speech Recognition ────────────────────────────────────────────────────
    function initRecognition() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { hasMicSupport.value = false; return; }

        recognition = new SR();
        recognition.lang            = 'pt-BR';
        recognition.continuous      = true;
        recognition.interimResults  = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                const text   = result[0].transcript.trim();
                if (result.isFinal && text) {
                    cues.value.push({
                        speaker:  'Participante',
                        startSec: elapsedSec.value,
                        startStr: secToStr(elapsedSec.value),
                        text,
                    });
                    interimText.value = '';
                } else {
                    interim = text;
                }
            }
            interimText.value = interim;
        };

        // Auto-restart quando a API para (timeout de silêncio)
        recognition.onend = () => {
            if (isRecording.value && !isPaused.value) {
                try { recognition.start(); } catch {}
            }
        };

        recognition.onerror = (e) => {
            if (e.error === 'not-allowed') {
                hasMicSupport.value = false;
                isRecording.value   = false;
            }
        };
    }

    // ── Auto-save ─────────────────────────────────────────────────────────────
    function startAutoSave() {
        clearInterval(autoSaveTimer);
        autoSaveTimer = setInterval(async () => {
            if (!meetingId.value || !cues.value.length) return;
            try {
                await requestWithAuth(`${API_URL}/microsoft/inperson/meetings/${meetingId.value}`, {
                    method: 'PUT',
                    body: JSON.stringify({ cues: cues.value }),
                });
            } catch {}
        }, 30_000);
    }

    // ── Public actions ────────────────────────────────────────────────────────

    /**
     * Cria sessão no backend e inicia gravação.
     * @param {{ title, location, attendees, organizerName }} meetingData
     * @returns {number} ID do banco
     */
    async function startSession(meetingData) {
        const data = await requestWithAuth(`${API_URL}/microsoft/inperson/meetings`, {
            method: 'POST',
            body:   JSON.stringify(meetingData),
        });

        meetingId.value  = data.id;
        title.value      = meetingData.title;
        location.value   = meetingData.location || '';
        attendees.value  = meetingData.attendees || [];
        startedAt.value  = new Date();
        elapsedSec.value = 0;
        cues.value       = [];
        interimText.value = '';
        isActive.value   = true;
        isPaused.value   = false;

        initRecognition();
        startTimer();
        startAutoSave();

        isRecording.value = true;
        if (recognition) {
            try { recognition.start(); } catch {}
        }

        return data.id;
    }

    function pause() {
        if (!isRecording.value) return;
        isRecording.value = false;
        isPaused.value    = true;
        interimText.value = '';
        if (recognition) { try { recognition.stop(); } catch {} }
    }

    function resume() {
        if (!isPaused.value) return;
        isPaused.value    = false;
        isRecording.value = true;
        if (recognition) { try { recognition.start(); } catch {} }
    }

    /**
     * Encerra a gravação, salva no backend e retorna o ID.
     * @returns {number|null} ID da reunião salva
     */
    async function stop() {
        isRecording.value = false;
        isPaused.value    = false;
        interimText.value = '';

        clearInterval(timerInterval);
        clearInterval(autoSaveTimer);

        if (recognition) {
            try { recognition.stop(); } catch {}
            recognition = null;
        }

        const savedId = meetingId.value;

        if (savedId) {
            try {
                await requestWithAuth(`${API_URL}/microsoft/inperson/meetings/${savedId}`, {
                    method: 'PUT',
                    body:   JSON.stringify({ cues: cues.value, endedAt: new Date().toISOString() }),
                });
            } catch {}
        }

        // Reset state
        isActive.value   = false;
        meetingId.value  = null;
        title.value      = '';
        cues.value       = [];
        elapsedSec.value = 0;
        startedAt.value  = null;

        return savedId;
    }

    /** Descarta a sessão sem salvar transcrição final. */
    async function discard() {
        isRecording.value = false;
        isPaused.value    = false;
        isActive.value    = false;
        interimText.value = '';

        clearInterval(timerInterval);
        clearInterval(autoSaveTimer);

        if (recognition) {
            try { recognition.stop(); } catch {}
            recognition = null;
        }

        if (meetingId.value) {
            requestWithAuth(`${API_URL}/microsoft/inperson/meetings/${meetingId.value}`, { method: 'DELETE' }).catch(() => {});
        }

        meetingId.value  = null;
        title.value      = '';
        cues.value       = [];
        elapsedSec.value = 0;
        startedAt.value  = null;
    }

    return {
        // state
        isActive, isRecording, isPaused, meetingId,
        title, location, attendees, startedAt,
        elapsedSec, cues, interimText, hasMicSupport,
        // computed
        timerDisplay,
        // actions
        startSession, pause, resume, stop, discard,
    };
});
