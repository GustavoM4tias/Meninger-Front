// stores/Alerts/alertStore.js
import { defineStore } from 'pinia';
import * as api from '@/utils/Alerts/apiAlerts';

export const useAlertStore = defineStore('alertStore', {
    state: () => ({
        items: [],
        loading: false,
        logs: [],
        loadingLogs: false,
    }),
    actions: {
        async fetch(params = {}) {
            this.loading = true;
            try {
                const r = await api.listAlerts(params);
                this.items = Array.isArray(r?.items) ? r.items : [];
            } catch (e) {
                console.error('[alertStore] fetch', e);
                this.items = [];
            } finally { this.loading = false; }
        },
        async toggle(rule) {
            const next = !rule.enabled;
            const idx = this.items.findIndex(i => i.id === rule.id);
            if (idx >= 0) this.items[idx] = { ...this.items[idx], enabled: next };
            try {
                const r = await api.updateAlert(rule.id, { enabled: next });
                if (idx >= 0 && r?.rule) this.items[idx] = { ...this.items[idx], ...r.rule };
            } catch (e) {
                console.error('[alertStore] toggle', e);
                if (idx >= 0) this.items[idx] = { ...this.items[idx], enabled: !next }; // rollback
                throw e;
            }
        },
        async update(id, patch) {
            const idx = this.items.findIndex(i => i.id === id);
            const r = await api.updateAlert(id, patch);
            if (idx >= 0 && r?.rule) this.items[idx] = { ...this.items[idx], ...r.rule };
            return r;
        },
        async remove(id) {
            const idx = this.items.findIndex(i => i.id === id);
            const removed = idx >= 0 ? this.items.splice(idx, 1)[0] : null;
            try {
                await api.deleteAlert(id);
            } catch (e) {
                if (removed) this.items.splice(idx, 0, removed);
                throw e;
            }
        },
        async fire(id) { return api.fireAlert(id); },

        async fetchLogs(id) {
            this.loadingLogs = true;
            try {
                const r = await api.fetchLogs(id);
                this.logs = Array.isArray(r?.items) ? r.items : [];
            } catch (e) {
                console.error('[alertStore] fetchLogs', e);
                this.logs = [];
            } finally { this.loadingLogs = false; }
        },
    },
});
