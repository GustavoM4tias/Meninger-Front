// stores/Checklist/cobrancaStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/utils/Checklist/api.js';

export const useCobrancaStore = defineStore('checklistCobranca', () => {
    const settings = ref(null);
    const rules = ref([]);
    const statuses = ref([]);
    const lastRun = ref(null);
    const loading = ref(false);
    const saving = ref(false);
    const running = ref(false);
    const error = ref(null);

    async function load() {
        loading.value = true; error.value = null;
        try {
            const [s, r, st] = await Promise.all([api.cobrancaSettings(), api.cobrancaRules(), api.statuses()]);
            settings.value = s;
            rules.value = r;
            statuses.value = st;
        } catch (e) { error.value = e.message; } finally { loading.value = false; }
    }

    // ── Status (rótulos e cores) ──
    function blankStatus() {
        return { scope: 'GLOBAL', label: 'Novo status', color: '#94a3b8', state_class: 'TODO', position: (statuses.value.length + 1) * 10, is_active: true, requires_approval: false, approval_role: null };
    }
    async function addStatus() {
        const created = await api.createStatus(blankStatus());
        statuses.value.push(created);
        return created;
    }
    async function saveStatus(s) {
        saving.value = true;
        try {
            const u = await api.updateStatus(s.id, s);
            const i = statuses.value.findIndex((x) => x.id === s.id);
            if (i >= 0) statuses.value[i] = u;
            return u;
        } finally { saving.value = false; }
    }
    async function deleteStatus(id) {
        await api.removeStatus(id);
        statuses.value = statuses.value.filter((s) => s.id !== id);
    }

    async function saveSettings() {
        saving.value = true;
        try { settings.value = await api.saveCobrancaSettings(settings.value); }
        finally { saving.value = false; }
    }

    function blankRule() {
        return {
            scope: 'GLOBAL', scope_id: null, name: 'Nova regra', anchor: 'DUE_DATE',
            offset_days: 0, repeat_every_days: null, max_occurrences: null,
            apply_states: ['TODO', 'IN_PROGRESS', 'BLOCKED'],
            recipients: { assignee: true, owner: false, user_ids: [], roles: [] },
            channels: { inapp: true, email: true, whatsapp: false },
            title_template: '', body_template: '', importance: 6, active: true,
            position: (rules.value.length + 1) * 10,
        };
    }

    async function addRule() {
        const created = await api.createRule(blankRule());
        rules.value.push(created);
        return created;
    }

    async function saveRule(rule) {
        saving.value = true;
        try {
            const updated = await api.updateRule(rule.id, rule);
            const i = rules.value.findIndex((r) => r.id === rule.id);
            if (i >= 0) rules.value[i] = updated;
            return updated;
        } finally { saving.value = false; }
    }

    async function deleteRule(id) {
        await api.removeRule(id);
        rules.value = rules.value.filter((r) => r.id !== id);
    }

    async function runNow(dryRun = true) {
        running.value = true; error.value = null;
        try { lastRun.value = await api.runCobranca(dryRun); return lastRun.value; }
        catch (e) { error.value = e.message; throw e; }
        finally { running.value = false; }
    }

    return { settings, rules, statuses, lastRun, loading, saving, running, error, load, saveSettings, blankRule, addRule, saveRule, deleteRule, runNow, addStatus, saveStatus, deleteStatus };
});
