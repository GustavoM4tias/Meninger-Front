// stores/Whatsapp/whatsappStore.js
import { defineStore } from 'pinia';
import * as api from '@/utils/Whatsapp/apiWhatsapp';

export const useWhatsappStore = defineStore('whatsappStore', {
    state: () => ({
        config: null,            // { phone_number_id, ..., active, dry_run, has_access_token, ... }
        loadingConfig: false,
        savingConfig: false,
        healthRunning: false,

        templates: [],       // lista crua sincronizada da Meta
        catalog: [],         // templates do código + destino/funcionalidade/status
        missingTemplates: [],// declarados no código e sem APPROVED na Meta
        orphanTemplates: [], // existem na Meta e nenhum fluxo usa
        loadingTemplates: false,
        syncing: false,

        messages: [],
        messagesTotal: 0,
        loadingMessages: false,

        stats: null,
        loadingStats: false,

        // info pública do número do sistema (visível pra qualquer user)
        systemInfo: null, // { display_phone, display_name, active, ready }

        // cobertura do canal (admin): quem está sem telefone no perfil
        coverage: null, // { total, withPhone, withoutPhone, coverage, missing[] }
        loadingCoverage: false,
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
                this.catalog = Array.isArray(r?.catalog) ? r.catalog : [];
                this.missingTemplates = Array.isArray(r?.missing) ? r.missing : [];
                this.orphanTemplates = Array.isArray(r?.orphans) ? r.orphans : [];
            } catch (e) {
                console.error('[whatsappStore] fetchTemplates', e);
                this.templates = [];
                this.catalog = [];
                this.missingTemplates = [];
                this.orphanTemplates = [];
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

        async deleteTemplate(name, opts = {}) {
            const r = await api.deleteTemplate(name, opts);
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

        // ── Cobertura do canal (admin) ───────────────────────────────
        async fetchCoverage() {
            this.loadingCoverage = true;
            try {
                this.coverage = await api.getCoverage();
            } catch (e) {
                console.error('[whatsappStore] fetchCoverage', e);
                this.coverage = null;
            } finally { this.loadingCoverage = false; }
        },
    },
});
