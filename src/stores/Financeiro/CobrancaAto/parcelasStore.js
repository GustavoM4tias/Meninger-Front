// src/stores/Financeiro/CobrancaAto/parcelasStore.js
//
// Aba Parcelas da tela Ato (Financeiro > Cobranca > Ato). Consome
// /api/cobranca-ato/parcelas/*: planos de parcelas mensais por reserva, KPIs,
// detalhe e acoes. O plano nasce quando o ato e pago e encerra quando o Sienge
// fatura o contrato - ver _estudo/ato-parcelas/PLANO.md no backend.
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const BASE = '/cobranca-ato/parcelas';

export const useParcelasStore = defineStore('atoParcelas', () => {
    // ── Filtros ────────────────────────────────────────────────────────────────
    const filtro = ref({
        status: ['ativo'],       // ativo | pausado | encerrado | cancelado
        empreendimento: [],
        q: '',
        comAtraso: false,
    });
    const sortBy = ref('proxima');
    const sortDir = ref('asc');

    // ── Dados ──────────────────────────────────────────────────────────────────
    const planos = ref([]);
    const total = ref(0);
    const page = ref(1);
    const limit = ref(100);
    const loading = ref(false);
    const loadingMore = ref(false);
    const error = ref(null);

    const stats = ref(null);
    const statsLoading = ref(false);
    const facets = ref({ empreendimentos: [] });
    const status = ref(null);          // { ultima_rodada_em, cfg }

    function params(p = page.value) {
        const q = new URLSearchParams({ page: p, limit: limit.value, sortBy: sortBy.value, sortDir: sortDir.value });
        const f = filtro.value;
        if (f.status?.length) q.set('status', f.status.join(','));
        if (f.empreendimento?.length) q.set('empreendimento', f.empreendimento.join(','));
        if (f.q) q.set('q', f.q);
        if (f.comAtraso) q.set('comAtraso', '1');
        return q;
    }

    async function fetchPlanos({ silent = false } = {}) {
        if (!silent) { loading.value = true; error.value = null; }
        page.value = 1;
        try {
            const data = await requestWithAuth(`${BASE}/planos?${params(1)}`);
            planos.value = data?.rows || [];
            total.value = data?.total || 0;
        } catch (e) {
            if (!silent) error.value = e.message || 'Falha ao carregar os planos.';
        } finally {
            if (!silent) loading.value = false;
        }
    }

    async function loadMore() {
        if (loadingMore.value || planos.value.length >= total.value) return;
        loadingMore.value = true;
        try {
            const data = await requestWithAuth(`${BASE}/planos?${params(page.value + 1)}`);
            page.value += 1;
            planos.value = planos.value.concat(data?.rows || []);
            total.value = data?.total || total.value;
        } catch (e) {
            error.value = e.message || 'Falha ao carregar mais planos.';
        } finally {
            loadingMore.value = false;
        }
    }

    async function fetchStats({ silent = false } = {}) {
        if (!silent) statsLoading.value = true;
        try {
            const q = new URLSearchParams();
            const f = filtro.value;
            if (f.empreendimento?.length) q.set('empreendimento', f.empreendimento.join(','));
            if (f.q) q.set('q', f.q);
            stats.value = await requestWithAuth(`${BASE}/stats?${q}`);
        } catch (e) {
            console.error('[parcelas] stats', e);
        } finally {
            if (!silent) statsLoading.value = false;
        }
    }

    async function fetchFacets() {
        try { facets.value = await requestWithAuth(`${BASE}/facets`); }
        catch (e) { console.error('[parcelas] facets', e); }
    }

    async function fetchStatus() {
        try { status.value = await requestWithAuth(`${BASE}/status`); }
        catch (e) { console.error('[parcelas] status', e); }
    }

    function setSort(by, dir) {
        sortBy.value = by || 'proxima';
        sortDir.value = dir === 'desc' ? 'desc' : 'asc';
        return fetchPlanos();
    }

    function refresh() {
        return Promise.allSettled([fetchPlanos(), fetchStats()]);
    }

    // ── Detalhe ────────────────────────────────────────────────────────────────
    const detalhe = ref(null);       // { plano, parcelas, boletos, contrato, hoje }
    const detalheLoading = ref(false);
    const detalheError = ref(null);

    async function fetchDetalhe(idreserva, { silent = false } = {}) {
        if (!silent) { detalheLoading.value = true; detalheError.value = null; }
        try {
            detalhe.value = await requestWithAuth(`${BASE}/planos/${idreserva}`);
        } catch (e) {
            if (!silent) detalheError.value = e.message || 'Falha ao carregar o plano.';
        } finally {
            if (!silent) detalheLoading.value = false;
        }
    }

    // ── Acoes ──────────────────────────────────────────────────────────────────
    const acting = ref(false);
    const actionError = ref(null);

    async function post(path, body) {
        acting.value = true;
        actionError.value = null;
        try {
            return await requestWithAuth(`${BASE}${path}`, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
        } catch (e) {
            actionError.value = e.message || 'Falha na acao.';
            throw e;
        } finally {
            acting.value = false;
        }
    }

    const criarPlano = (idreserva) => post('/planos', { idreserva });
    const sincronizar = (idreserva) => post(`/planos/${idreserva}/sincronizar`);
    const pausar = (idreserva) => post(`/planos/${idreserva}/pausar`);
    const reativar = (idreserva) => post(`/planos/${idreserva}/reativar`);
    const encerrar = (idreserva, motivo) => post(`/planos/${idreserva}/encerrar`, { motivo });
    const emitirParcela = (id) => post(`/${id}/emitir`);
    const baixarParcela = (id) => post(`/${id}/baixar`);
    const marcarPaga = (id, nota) => post(`/${id}/marcar-paga`, { nota });
    const rodarCiclo = () => post('/rodar');

    // ── Templates WhatsApp (configure) ─────────────────────────────────────────
    const templates = ref([]);
    const templatesLoading = ref(false);
    const templatesMsg = ref(null);

    async function fetchTemplates() {
        templatesLoading.value = true;
        try { templates.value = (await requestWithAuth(`${BASE}/whatsapp-templates`))?.templates || []; }
        catch (e) { templatesMsg.value = e.message; }
        finally { templatesLoading.value = false; }
    }

    async function syncTemplates() {
        templatesLoading.value = true;
        templatesMsg.value = null;
        try {
            const r = await requestWithAuth(`${BASE}/whatsapp-templates/sync`, { method: 'POST' });
            templatesMsg.value = r?.note || 'Templates enviados.';
            await fetchTemplates();
        } catch (e) {
            templatesMsg.value = e.message || 'Falha ao sincronizar os templates.';
        } finally {
            templatesLoading.value = false;
        }
    }

    return {
        filtro, sortBy, sortDir,
        planos, total, page, limit, loading, loadingMore, error,
        stats, statsLoading, facets, status,
        fetchPlanos, loadMore, fetchStats, fetchFacets, fetchStatus, setSort, refresh,
        detalhe, detalheLoading, detalheError, fetchDetalhe,
        acting, actionError,
        criarPlano, sincronizar, pausar, reativar, encerrar, emitirParcela, baixarParcela, marcarPaga, rodarCiclo,
        templates, templatesLoading, templatesMsg, fetchTemplates, syncTemplates,
    };
});
