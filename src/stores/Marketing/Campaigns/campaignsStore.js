// stores/Marketing/Campaigns/campaignsStore.js
//
// Campanhas Meta — list, sync, detail, leads, breakdown diário.

import { defineStore } from 'pinia';
import { ref } from 'vue';
import API_URL from '@/config/apiUrl';

function authHeaders() {
    const token = localStorage.getItem('token');
    return {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
    };
}

async function apiFetch(path, opts = {}) {
    const resp = await fetch(`${API_URL}/marketing${path}`, { headers: authHeaders(), ...opts });
    if (resp.status === 401) {
        localStorage.removeItem('token');
        throw new Error('Sessão expirada. Faça login novamente.');
    }
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.ok === false) {
        throw new Error(data?.error || `Erro na requisição (${resp.status}).`);
    }
    return data;
}

export const useCampaignsStore = defineStore('marketingCampaigns', () => {
    const campaigns = ref([]);
    const loading = ref(false);
    const syncing = ref(false);
    const saving = ref(false);
    const error = ref(null);
    const lastSync = ref(null);

    // ── Log de operações ────────────────────────────────────────────────────
    // Histórico das chamadas (sync/import/reconcile/ads) com tempo e resultado.
    // Vive em memória pela sessão — não persiste em localStorage.
    const ops = ref([]);  // mais recentes no início

    function pushOp(op) {
        ops.value.unshift({ id: crypto.randomUUID?.() || String(Date.now()) + Math.random(), ...op });
        // Limita histórico a 20
        if (ops.value.length > 20) ops.value.length = 20;
    }
    function updateOp(id, patch) {
        const idx = ops.value.findIndex(o => o.id === id);
        if (idx >= 0) ops.value[idx] = { ...ops.value[idx], ...patch };
    }
    function clearOps() { ops.value = []; }

    /** Wrapper: instrumenta uma operação com tempo + status no log. */
    async function withOp({ type, label, details }, fn) {
        const startedAt = Date.now();
        const opId = crypto.randomUUID?.() || String(startedAt) + Math.random();
        ops.value.unshift({
            id: opId, type, label, details,
            status: 'running', started_at: startedAt, duration_ms: null, result: null, error: null,
        });
        if (ops.value.length > 20) ops.value.length = 20;
        try {
            const result = await fn();
            updateOp(opId, {
                status: result === null ? 'error' : 'success',
                duration_ms: Date.now() - startedAt,
                result,
                error: result === null ? (error.value || 'Falhou.') : null,
            });
            return result;
        } catch (e) {
            updateOp(opId, {
                status: 'error',
                duration_ms: Date.now() - startedAt,
                error: e.message,
            });
            throw e;
        }
    }

    async function fetchAll({ includeArchived = false } = {}) {
        loading.value = true;
        error.value = null;
        try {
            const d = await apiFetch(`/meta-campaigns?archived=${includeArchived ? 1 : 0}`);
            campaigns.value = Array.isArray(d.results) ? d.results : [];
        } catch (e) {
            error.value = e.message;
            campaigns.value = [];
        } finally {
            loading.value = false;
        }
    }

    async function syncFromMeta({ sinceDays = 90 } = {}) {
        syncing.value = true;
        error.value = null;
        lastSync.value = null;
        return withOp({ type: 'sync', label: `Sincronizar campanhas (${sinceDays}d)`, details: { sinceDays } }, async () => {
        try {
            const d = await apiFetch('/meta-campaigns/sync', {
                method: 'POST',
                body: JSON.stringify({ sinceDays }),
            });
            lastSync.value = {
                accounts_count: d.accounts_count,
                campaigns_total: d.campaigns_total,
                campaigns_new: d.campaigns_new,
                campaigns_updated: d.campaigns_updated,
                since: d.since,
                until: d.until,
                errors: d.errors || [],
            };
            await fetchAll();
            return lastSync.value;
        } catch (e) {
            error.value = e.message;
            return null;
        } finally {
            syncing.value = false;
        }
        });
    }

    async function fetchDetail(id) {
        try {
            const d = await apiFetch(`/meta-campaigns/${encodeURIComponent(id)}`);
            return d.campaign;
        } catch (e) {
            error.value = e.message;
            return null;
        }
    }

    async function fetchLeads(id, { limit = 50 } = {}) {
        try {
            const d = await apiFetch(`/meta-campaigns/${encodeURIComponent(id)}/leads?limit=${limit}`);
            return Array.isArray(d.results) ? d.results : [];
        } catch (e) {
            error.value = e.message;
            return [];
        }
    }

    async function fetchDaily(id, { days = 30 } = {}) {
        try {
            const d = await apiFetch(`/meta-campaigns/${encodeURIComponent(id)}/daily?days=${days}`);
            return Array.isArray(d.results) ? d.results : [];
        } catch (e) {
            error.value = e.message;
            return [];
        }
    }

    async function updateInternal(id, patch) {
        saving.value = true;
        error.value = null;
        try {
            const d = await apiFetch(`/meta-campaigns/${encodeURIComponent(id)}`, {
                method: 'PUT',
                body: JSON.stringify(patch),
            });
            const idx = campaigns.value.findIndex(c => c.id === id);
            if (idx >= 0 && d.campaign) {
                campaigns.value[idx] = { ...campaigns.value[idx], ...d.campaign };
            }
            return d.campaign;
        } catch (e) {
            error.value = e.message;
            return null;
        } finally {
            saving.value = false;
        }
    }

    const importing = ref(false);
    const reconciling = ref(false);
    const lastImport = ref(null);
    const lastReconcile = ref(null);

    async function importHistorical({ sinceDays = 90 } = {}) {
        importing.value = true;
        error.value = null;
        lastImport.value = null;
        return withOp({ type: 'import', label: `Importar histórico (${sinceDays}d)`, details: { sinceDays } }, async () => {
        try {
            const d = await apiFetch('/meta-campaigns/import-historical', {
                method: 'POST',
                body: JSON.stringify({ sinceDays }),
            });
            lastImport.value = {
                forms_count: d.forms_count,
                since: d.since,
                inserted: d.inserted,
                duplicates: d.duplicates,
                errors: d.errors || [],
                details: d.details || [],
            };
            await fetchAll();
            return lastImport.value;
        } catch (e) {
            error.value = e.message;
            return null;
        } finally {
            importing.value = false;
        }
        });
    }

    // ── Ads globais (pra view "Anúncios" da tela principal) ─────────────────
    const allAds = ref([]);
    const loadingAllAds = ref(false);

    async function fetchAllAds() {
        loadingAllAds.value = true;
        error.value = null;
        try {
            const d = await apiFetch('/meta-ads');
            allAds.value = Array.isArray(d.results) ? d.results : [];
        } catch (e) {
            error.value = e.message;
            allAds.value = [];
        } finally {
            loadingAllAds.value = false;
        }
    }

    async function fetchAds(campaignId, { activeOnly = false } = {}) {
        try {
            const qs = activeOnly ? '?active=true' : '';
            const d = await apiFetch(`/meta-campaigns/${encodeURIComponent(campaignId)}/ads${qs}`);
            return Array.isArray(d.results) ? d.results : [];
        } catch (e) {
            error.value = e.message;
            return [];
        }
    }

    // ── Ad Sets (conjuntos de anúncio) — hierarquia Meta ────────────────────
    async function fetchAdSets(campaignId) {
        try {
            const d = await apiFetch(`/meta-campaigns/${encodeURIComponent(campaignId)}/adsets`);
            return Array.isArray(d.results) ? d.results : [];
        } catch (e) {
            error.value = e.message;
            return [];
        }
    }

    async function syncAds(campaignId, { sinceDays = 90 } = {}) {
        return withOp({ type: 'ads', label: `Sincronizar ads`, details: { campaignId, sinceDays } }, async () => {
            try {
                const d = await apiFetch(`/meta-campaigns/${encodeURIComponent(campaignId)}/ads/sync`, {
                    method: 'POST',
                    body: JSON.stringify({ sinceDays }),
                });
                return d;
            } catch (e) {
                error.value = e.message;
                return null;
            }
        });
    }

    // ── Full sync (varre tudo: forms + campanhas + ads + histórico + reconcile) ──
    const fullSyncing = ref(false);
    const lastFullSync = ref(null);

    async function runFullSync(opts = {}) {
        if (fullSyncing.value) return null;
        fullSyncing.value = true;
        error.value = null;
        lastFullSync.value = null;
        return withOp({ type: 'fullsync', label: 'Sincronizar TUDO (forms + campanhas + ads + histórico + CV)', details: opts }, async () => {
            try {
                const d = await apiFetch('/sync/full', {
                    method: 'POST',
                    body: JSON.stringify(opts),
                });
                lastFullSync.value = d;
                await fetchAll();
                await fetchAllAds();
                return d;
            } catch (e) {
                error.value = e.message;
                return null;
            } finally {
                fullSyncing.value = false;
            }
        });
    }

    async function migrateMappings() {
        return withOp({ type: 'migrate', label: 'Migrar mappings form → campanha', details: {} }, async () => {
            try {
                const d = await apiFetch('/meta-campaigns/migrate-mappings', { method: 'POST' });
                await fetchAll();
                return d;
            } catch (e) {
                error.value = e.message;
                return null;
            }
        });
    }

    async function reparseExistingLeads() {
        return withOp({ type: 'reparse', label: 'Re-processar nomes dos leads Meta', details: {} }, async () => {
            try {
                const d = await apiFetch('/meta-campaigns/reparse-existing', {
                    method: 'POST',
                    body: JSON.stringify({ onlyMissingNome: true }),
                });
                return d;
            } catch (e) {
                error.value = e.message;
                return null;
            }
        });
    }

    async function reconcileBatch({ limit = 200 } = {}) {
        reconciling.value = true;
        error.value = null;
        lastReconcile.value = null;
        return withOp({ type: 'reconcile', label: `Reconciliar com CV (até ${limit})`, details: { limit } }, async () => {
        try {
            const d = await apiFetch('/meta-campaigns/reconcile-cv-batch', {
                method: 'POST',
                body: JSON.stringify({ limit }),
            });
            lastReconcile.value = {
                processed: d.processed, matched: d.matched, unmatched: d.unmatched, errors: d.errors,
            };
            return lastReconcile.value;
        } catch (e) {
            error.value = e.message;
            return null;
        } finally {
            reconciling.value = false;
        }
        });
    }

    return {
        campaigns, loading, syncing, saving, error, lastSync,
        importing, reconciling, lastImport, lastReconcile,
        ops, clearOps,
        fetchAll, syncFromMeta, fetchDetail, fetchLeads, fetchDaily, updateInternal,
        importHistorical, reconcileBatch, reparseExistingLeads, migrateMappings,
        runFullSync, fullSyncing, lastFullSync,
        fetchAds, syncAds, fetchAdSets,
        allAds, loadingAllAds, fetchAllAds,
    };
});
