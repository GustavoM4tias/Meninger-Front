// src/stores/Config/notificationStore.js
import { defineStore } from 'pinia';
import {
    fetchNotifications,
    fetchUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    fetchNotificationPreferences,
    saveNotificationPreference,
} from '@/utils/Config/apiNotification';

export const useNotificationStore = defineStore('notificationStore', {
    state: () => ({
        notifications: [],
        unread: 0,
        total: 0,
        loading: false,
        // preferências
        preferences: [],
        prefsLoading: false,
        // polling
        _pollHandle: null,
    }),
    getters: {
        unreadList: (state) => state.notifications.filter(n => !n.read_at),
        hasUnread: (state) => state.unread > 0,
    },
    actions: {
        async fetchNotifications({ unread = false, limit = 30, offset = 0, append = false } = {}) {
            this.loading = true;
            try {
                const result = await fetchNotifications({ unread, limit, offset });
                const items = Array.isArray(result?.items) ? result.items : [];
                this.notifications = append ? [...this.notifications, ...items] : items;
                this.total = Number(result?.total ?? 0);
                if (typeof result?.unread === 'number') this.unread = result.unread;
            } catch (err) {
                console.error('[notificationStore] fetchNotifications', err);
                if (!append) this.notifications = [];
            } finally {
                this.loading = false;
            }
        },

        async refreshUnreadCount() {
            try {
                const r = await fetchUnreadCount();
                this.unread = Number(r?.count ?? 0);
            } catch (err) {
                console.error('[notificationStore] refreshUnreadCount', err);
            }
        },

        async markRead(id) {
            // otimista
            const item = this.notifications.find(n => n.id === id);
            if (item && !item.read_at) {
                item.read_at = new Date().toISOString();
                this.unread = Math.max(0, this.unread - 1);
            }
            try {
                await markNotificationRead(id);
            } catch (err) {
                console.error('[notificationStore] markRead', err);
                // rollback
                if (item) item.read_at = null;
                this.refreshUnreadCount();
            }
        },

        async markAllRead() {
            const prev = this.notifications.map(n => ({ ...n }));
            const now = new Date().toISOString();
            this.notifications = this.notifications.map(n => ({ ...n, read_at: n.read_at || now }));
            this.unread = 0;
            try {
                await markAllNotificationsRead();
            } catch (err) {
                console.error('[notificationStore] markAllRead', err);
                this.notifications = prev;
                this.refreshUnreadCount();
            }
        },

        async remove(id) {
            const idx = this.notifications.findIndex(n => n.id === id);
            const removed = idx >= 0 ? this.notifications.splice(idx, 1)[0] : null;
            if (removed && !removed.read_at) this.unread = Math.max(0, this.unread - 1);
            try {
                await deleteNotification(id);
            } catch (err) {
                console.error('[notificationStore] remove', err);
                if (removed) this.notifications.splice(idx, 0, removed);
                this.refreshUnreadCount();
            }
        },

        // ─── Preferências ────────────────────────────────────
        async fetchPreferences() {
            this.prefsLoading = true;
            try {
                const r = await fetchNotificationPreferences();
                this.preferences = Array.isArray(r?.preferences) ? r.preferences : [];
            } catch (err) {
                console.error('[notificationStore] fetchPreferences', err);
                this.preferences = [];
            } finally {
                this.prefsLoading = false;
            }
        },

        async setPreference(type, { inapp, email }) {
            const local = this.preferences.find(p => p.type === type);
            if (local) {
                if (typeof inapp === 'boolean') local.inapp = inapp;
                if (typeof email === 'boolean') local.email = email;
            }
            try {
                await saveNotificationPreference({ type, inapp, email });
            } catch (err) {
                console.error('[notificationStore] setPreference', err);
                this.fetchPreferences();
            }
        },

        // ─── Polling simples (60s) ──────────────────────────
        startPolling(intervalMs = 60_000) {
            this.stopPolling();
            this.refreshUnreadCount();
            this._pollHandle = setInterval(() => this.refreshUnreadCount(), intervalMs);
        },

        stopPolling() {
            if (this._pollHandle) {
                clearInterval(this._pollHandle);
                this._pollHandle = null;
            }
        },
    },
});
