// stores/Microsoft/teamsStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const BASE = `${API_URL}/microsoft/teams`;

// Retorna segunda-feira da semana da data fornecida
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Dom, 1=Seg...
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Formata Date como "YYYY-MM-DD" usando hora local (evita problema do toISOString() em UTC-3)
export function fmtDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export const useTeamsStore = defineStore('teams', () => {

    const events    = ref([]);
    const loading   = ref(false);
    const error     = ref(null);
    const weekStart = ref(getWeekStart(new Date()));

    // ── Computed ──────────────────────────────────────────────────────────────

    const weekDays = computed(() =>
        Array.from({ length: 7 }, (_, i) => {
            const d = new Date(weekStart.value);
            d.setDate(d.getDate() + i);
            return d;
        })
    );

    const weekEnd = computed(() => {
        const d = new Date(weekStart.value);
        d.setDate(d.getDate() + 7);
        return d;
    });

    const isCurrentWeek = computed(() => {
        const now = getWeekStart(new Date()).getTime();
        return weekStart.value.getTime() === now;
    });

    // Eventos agrupados por dia ("YYYY-MM-DD")
    const eventsByDay = computed(() => {
        const map = {};
        for (const e of events.value) {
            if (!e.start) continue;
            const day = e.start.split('T')[0];
            if (!map[day]) map[day] = [];
            map[day].push(e);
        }
        return map;
    });

    // ── Navegação de semana ───────────────────────────────────────────────────

    async function nextWeek() {
        const d = new Date(weekStart.value);
        d.setDate(d.getDate() + 7);
        weekStart.value = d;
        await fetchWeek();
    }

    async function prevWeek() {
        const d = new Date(weekStart.value);
        d.setDate(d.getDate() - 7);
        weekStart.value = d;
        await fetchWeek();
    }

    async function goToToday() {
        weekStart.value = getWeekStart(new Date());
        await fetchWeek();
    }

    // ── Busca de eventos ──────────────────────────────────────────────────────

    async function fetchWeek() {
        loading.value = true;
        error.value = null;
        try {
            // Usamos hora local formatada manualmente para evitar off-by-one em UTC-3
            const start = `${fmtDate(weekStart.value)}T00:00:00`;
            const end   = `${fmtDate(weekEnd.value)}T00:00:00`;
            events.value = await requestWithAuth(
                `${BASE}/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
            );
        } catch (err) {
            error.value = err.message;
        } finally {
            loading.value = false;
        }
    }

    // ── Criar reunião agendada ────────────────────────────────────────────────

    async function createScheduledMeeting(data) {
        const event = await requestWithAuth(`${BASE}/meetings`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        // Insere no estado se cair dentro da semana atual
        const day = event.start?.split('T')[0];
        const weekDayStrs = weekDays.value.map(fmtDate);
        if (weekDayStrs.includes(day)) {
            events.value = [...events.value, event]
                .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
        }
        return event;
    }

    // ── Reunião instantânea ───────────────────────────────────────────────────

    async function createInstantMeeting(data) {
        return await requestWithAuth(`${BASE}/meetings/instant`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // ── Cancelar / excluir ────────────────────────────────────────────────────

    async function cancelEvent(eventId, comment = '') {
        await requestWithAuth(`${BASE}/events/${eventId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ comment }),
        });
        events.value = events.value.filter(e => e.id !== eventId);
    }

    async function deleteEvent(eventId) {
        await requestWithAuth(`${BASE}/events/${eventId}`, { method: 'DELETE' });
        events.value = events.value.filter(e => e.id !== eventId);
    }

    async function updateEvent(eventId, data) {
        const updated = await requestWithAuth(`${BASE}/events/${eventId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
        events.value = events.value.map(e => e.id === eventId ? updated : e);
        return updated;
    }

    return {
        events, loading, error, weekStart,
        weekDays, weekEnd, isCurrentWeek, eventsByDay,
        nextWeek, prevWeek, goToToday, fetchWeek,
        createScheduledMeeting, createInstantMeeting,
        cancelEvent, deleteEvent, updateEvent,
    };
});
