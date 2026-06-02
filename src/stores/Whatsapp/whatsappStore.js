// stores/Whatsapp/whatsappStore.js
import { defineStore } from 'pinia';
import * as api from '@/utils/Whatsapp/apiWhatsapp';

export const useWhatsappStore = defineStore('whatsappStore', {
    state: () => ({
        config: null,            // { phone_number_id, ..., active, dry_run, has_access_token, ... }
        loadingConfig: false,
        savingConfig: false,
        healthRunning: false,

        templates: [],
        loadingTemplates: false,
        syncing: false,

        messages: [],
        messagesTotal: 0,
        loadingMessages: false,

        stats: null,
        loadingStats: false,

        // info pública do número do sistema (visível pra qualquer user)
        systemInfo: null, // { display_phone, display_name, active, ready }

        // opt do usuário logado
        opt: null, // { phone, consented, consent_at, revoked_at }
        loadingOpt: false,
    }),
    getters: {
        isActive: (state) => !!state.config?.active && !state.config?.dry_run,
        isReady:  (state) => !!state.config?.has_access_token && !!state.config?.phone_number_id,
    },
    actions: {
        // ── Config ────────────────────────────────────────────────────
        async fetchConfig() {
            this.loadingConfig = true;
            try {
                const r = await api.getConfig();
                this.config = r?.config || null;
            } catch (e) {
                console.error('[whatsappStore] fetchConfig', e);
            } finally { this.loadingConfig = false; }
        },
        async saveConfig(patch) {
            this.savingConfig = true;
            try {
                const r = await api.updateConfig(patch);
                this.config = r?.config || this.config;
                return this.config;
            } finally { this.savingConfig = false; }
        },
        async runHealth() {
            this.healthRunning = true;
            try {
                const r = await api.healthCheck();
                await this.fetchConfig();
                return r;
            } finally { this.healthRunning = false; }
        },
        async testSend(payload) { return api.testSend(payload); },
        async registerPhone(pin) { return api.registerPhone(pin); },

        // Setup Wizard
        async discoverFromToken(payload) { return api.discoverFromToken(payload); },
        async applyDiscovered(payload) {
            const r = await api.applyDiscovered(payload);
            await this.fetchConfig();
            return r;
        },

        // ── Templates ────────────────────────────────────────────────
        async fetchTemplates(params = {}) {
            this.loadingTemplates = true;
            try {
                const r = await api.listTemplates(params);
                this.templates = Array.isArray(r?.items) ? r.items : [];
            } catch (e) {
                console.error('[whatsappStore] fetchTemplates', e);
                this.templates = [];
            } finally { this.loadingTemplates = false; }
        },
        async syncTemplates() {
            this.syncing = true;
            try {
                const r = await api.syncTemplates();
                await this.fetchTemplates();
                return r;
            } finally { this.syncing = false; }
        },

        async createTemplate(payload) {
            const r = await api.createTemplate(payload);
            await this.fetchTemplates();
            return r;
        },

        async deleteTemplate(name) {
            const r = await api.deleteTemplate(name);
            await this.fetchTemplates();
            return r;
        },

        // ── Mensagens ────────────────────────────────────────────────
        async fetchMessages(params = {}) {
            this.loadingMessages = true;
            try {
                const r = await api.listMessages(params);
                this.messages = Array.isArray(r?.items) ? r.items : [];
                this.messagesTotal = Number(r?.total ?? 0);
            } catch (e) {
                console.error('[whatsappStore] fetchMessages', e);
                this.messages = [];
                this.messagesTotal = 0;
            } finally { this.loadingMessages = false; }
        },
        async fetchStats(days = 30) {
            this.loadingStats = true;
            try {
                this.stats = await api.fetchStats(days);
            } catch (e) {
                console.error('[whatsappStore] fetchStats', e);
                this.stats = null;
            } finally { this.loadingStats = false; }
        },

        // ── Info pública do sistema ──────────────────────────────────
        async fetchSystemInfo() {
            try {
                this.systemInfo = await api.getSystemInfo();
            } catch (e) {
                console.error('[whatsappStore] fetchSystemInfo', e);
                this.systemInfo = null;
            }
        },

        // ── Opt do usuário ───────────────────────────────────────────
        async fetchOpt() {
            this.loadingOpt = true;
            try {
                this.opt = await api.getOptStatus();
            } catch (e) {
                console.error('[whatsappStore] fetchOpt', e);
                this.opt = null;
            } finally { this.loadingOpt = false; }
        },
        async optIn({ phone, accept }) {
            await api.optIn({ phone, accept });
            await this.fetchOpt();
        },
        async optOut() {
            await api.optOut();
            await this.fetchOpt();
        },
    },
});
