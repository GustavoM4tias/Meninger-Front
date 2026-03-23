// stores/Microsoft/teamsStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const BASE = `${API_URL}/microsoft/teams`;

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function fmtDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export const useTeamsStore = defineStore('teams', () => {

    const events      = ref([]);
    const loading     = ref(false);
    const error       = ref(null);
    const currentView = ref('week'); // 'day' | 'week' | 'month' | 'list'
    const viewDate    = ref(new Date());

    // ── Computed ──────────────────────────────────────────────────────────────

    const weekStart = computed(() => getWeekStart(viewDate.value));

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

    // Single day array for day view
    const dayDays = computed(() => {
        const d = new Date(viewDate.value);
        d.setHours(0, 0, 0, 0);
        return [d];
    });

    // Full month grid (Mon→Sun rows) covering the viewDate month
    const monthDays = computed(() => {
        const year  = viewDate.value.getFullYear();
        const month = viewDate.value.getMonth();
        const first = new Date(year, month, 1);
        const last  = new Date(year, month + 1, 0);

        // Monday of week containing 1st
        const start = new Date(first);
        const sd = start.getDay();
        start.setDate(start.getDate() + (sd === 0 ? -6 : 1 - sd));

        // Sunday of week containing last
        const end = new Date(last);
        const ed = end.getDay();
        end.setDate(end.getDate() + (ed === 0 ? 0 : 7 - ed));

        const days = [];
        const d = new Date(start);
        while (d <= end) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
        return days;
    });

    const isCurrentPeriod = computed(() => {
        const today = new Date();
        if (currentView.value === 'day') return fmtDate(viewDate.value) === fmtDate(today);
        if (currentView.value === 'week' || currentView.value === 'list') {
            return weekStart.value.getTime() === getWeekStart(today).getTime();
        }
        if (currentView.value === 'month') {
            return viewDate.value.getMonth() === today.getMonth() &&
                   viewDate.value.getFullYear() === today.getFullYear();
        }
        return false;
    });

    // alias for backward compat
    const isCurrentWeek = isCurrentPeriod;

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

    // Events starting in the next 15 min (used for notifications)
    const upcomingEvents = computed(() => {
        const now  = Date.now();
        const in15 = now + 15 * 60 * 1000;
        return events.value.filter(e => {
            if (!e.start || e.isCancelled || e.isAllDay) return false;
            const t = new Date(e.start).getTime();
            return t > now && t <= in15;
        });
    });

    // ── Fetch ─────────────────────────────────────────────────────────────────

    async function fetchRange(start, end) {
        loading.value = true;
        error.value   = null;
        try {
            const s = `${fmtDate(start)}T00:00:00`;
            const e = `${fmtDate(end)}T00:00:00`;
            events.value = await requestWithAuth(
                `${BASE}/calendar?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`
            );
        } catch (err) {
            error.value = err.message;
        } finally {
            loading.value = false;
        }
    }

    async function fetchWeek() {
        await fetchRange(weekStart.value, weekEnd.value);
    }

    async function fetchCurrent() {
        if (currentView.value === 'week' || currentView.value === 'list') {
            await fetchRange(weekStart.value, weekEnd.value);
        } else if (currentView.value === 'day') {
            const next = new Date(viewDate.value);
            next.setDate(next.getDate() + 1);
            await fetchRange(viewDate.value, next);
        } else if (currentView.value === 'month') {
            const year = viewDate.value.getFullYear(), month = viewDate.value.getMonth();
            await fetchRange(new Date(year, month, 1), new Date(year, month + 1, 1));
        }
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    async function nextPeriod() {
        const d = new Date(viewDate.value);
        if (currentView.value === 'day') d.setDate(d.getDate() + 1);
        else if (currentView.value === 'week' || currentView.value === 'list') d.setDate(d.getDate() + 7);
        else if (currentView.value === 'month') d.setMonth(d.getMonth() + 1);
        viewDate.value = d;
        await fetchCurrent();
    }

    async function prevPeriod() {
        const d = new Date(viewDate.value);
        if (currentView.value === 'day') d.setDate(d.getDate() - 1);
        else if (currentView.value === 'week' || currentView.value === 'list') d.setDate(d.getDate() - 7);
        else if (currentView.value === 'month') d.setMonth(d.getMonth() - 1);
        viewDate.value = d;
        await fetchCurrent();
    }

    async function goToToday() {
        viewDate.value = new Date();
        await fetchCurrent();
    }

    async function switchView(view) {
        currentView.value = view;
        await fetchCurrent();
    }

    // Backward-compat aliases
    const nextWeek = nextPeriod;
    const prevWeek = prevPeriod;

    // ── CRUD ──────────────────────────────────────────────────────────────────

    async function createScheduledMeeting(data) {
        const event = await requestWithAuth(`${BASE}/meetings`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        const day = event.start?.split('T')[0];
        const allDays = (() => {
            if (currentView.value === 'day') return [fmtDate(viewDate.value)];
            if (currentView.value === 'month') return monthDays.value.map(fmtDate);
            return weekDays.value.map(fmtDate);
        })();
        if (allDays.includes(day)) {
            events.value = [...events.value, event]
                .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
        }
        return event;
    }

    async function createInstantMeeting(data) {
        return await requestWithAuth(`${BASE}/meetings/instant`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

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
        events, loading, error,
        currentView, viewDate,
        weekStart, weekDays, weekEnd, dayDays, monthDays,
        isCurrentWeek, isCurrentPeriod, eventsByDay, upcomingEvents,
        nextWeek, prevWeek, nextPeriod, prevPeriod, goToToday, switchView,
        fetchWeek, fetchCurrent, fetchRange,
        createScheduledMeeting, createInstantMeeting,
        cancelEvent, deleteEvent, updateEvent,
    };
});
