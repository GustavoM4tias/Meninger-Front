// src/stores/Financeiro/ConsultaCef/consultaCefStore.js
//
// Consulta de nº CEF (Financeiro > Contas a Receber). Consome /api/sienge/cef/*,
// que lê os contratos sincronizados do Sienge e expõe o nº da instituição
// financeira (CEF). Alçada aplicada no backend: admin vê tudo, não-admin só os
// empreendimentos da sua cidade. Espelha o padrão de inadimplenciaStore.js.
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useConsultaCefStore = defineStore('consultaCef', () => {
    // ── Filtros ────────────────────────────────────────────────────────────────
    const enterpriseIds = ref([]);   // ids de empreendimento selecionados
    const q = ref('');               // busca geral (cliente, contrato, unidade, nº CEF)
    const cef = ref('');             // '' = todos | 'com' | 'sem'

    // ── Paginação / ordenação ──────────────────────────────────────────────────
    const page = ref(1);
    const pageSize = ref(50);
    const sort = ref('financial_institution_date');
    const dir = ref('desc');

    // ── Dados ──────────────────────────────────────────────────────────────────
    const enterprises = ref([]);     // [{ id, name }] já filtrados pela alçada
    const isAdmin = ref(false);      // flag vinda do backend
    const rows = ref([]);
    const total = ref(0);
    const summary = ref({ total: 0, withCef: 0, withoutCef: 0 });

    // ── Estado ─────────────────────────────────────────────────────────────────
    const loading = ref(false);
    const loadingEnterprises = ref(false);
    const error = ref(null);
    const searched = ref(false);     // já houve ao menos uma consulta?

    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

    // ── Ações ──────────────────────────────────────────────────────────────────
    async function fetchEnterprises() {
        if (enterprises.value.length) return;
        loadingEnterprises.value = true;
        try {
            const data = await requestWithAuth(`${API_URL}/sienge/cef/enterprises`);
            enterprises.value = data?.results || [];
            isAdmin.value = !!data?.isAdmin;
        } catch (e) {
            console.error('[consulta-cef] fetchEnterprises', e);
            error.value = e.message || 'Falha ao carregar os empreendimentos.';
        } finally {
            loadingEnterprises.value = false;
        }
    }

    function baseParams() {
        const p = new URLSearchParams();
        if (enterpriseIds.value.length) p.set('enterpriseIds', enterpriseIds.value.join(','));
        if (q.value.trim()) p.set('q', q.value.trim());
        if (cef.value) p.set('cef', cef.value);
        return p;
    }

    async function search() {
        error.value = null;
        loading.value = true;
        try {
            const p = baseParams();
            p.set('page', String(page.value));
            p.set('pageSize', String(pageSize.value));
            p.set('sort', sort.value);
            p.set('dir', dir.value);
            const data = await requestWithAuth(`${API_URL}/sienge/cef/search?${p.toString()}`);
            rows.value = data?.rows || [];
            total.value = Number(data?.total || 0);
            summary.value = data?.summary || { total: 0, withCef: 0, withoutCef: 0 };
            if (typeof data?.isAdmin === 'boolean') isAdmin.value = data.isAdmin;
            // needsFilter = backend recusou consulta sem filtro (defesa extra);
            // mantém o estado "faça uma consulta" em vez de "nenhum resultado".
            searched.value = !data?.needsFilter;
        } catch (e) {
            console.error('[consulta-cef] search', e);
            error.value = e.message || 'Falha ao consultar os contratos.';
            rows.value = [];
            total.value = 0;
        } finally {
            loading.value = false;
        }
    }

    /** Reinicia a paginação e consulta. Usado no botão Filtrar e no mount. */
    function applyFilters() {
        page.value = 1;
        return search();
    }

    function goToPage(p) {
        const n = Math.min(Math.max(1, p), totalPages.value);
        if (n === page.value) return;
        page.value = n;
        return search();
    }

    /** Limpa filtros e resultados (a tela volta ao estado "faça uma consulta"). */
    function clear() {
        enterpriseIds.value = [];
        q.value = '';
        cef.value = '';
        page.value = 1;
        sort.value = 'financial_institution_date';
        dir.value = 'desc';
        rows.value = [];
        total.value = 0;
        summary.value = { total: 0, withCef: 0, withoutCef: 0 };
        error.value = null;
        searched.value = false;
    }

    /* Ordenacao EXPLICITA (coluna e direcao de uma vez), que e o que o
       DataTable manda. Ele avisa as duas em eventos separados no mesmo
       clique, entao a busca e adiada para a proxima microtarefa: sem isso um
       clique viraria DUAS consultas, e a segunda chegaria por cima. */
    let buscaAgendada = null;
    function applySort(col, direcao) {
        sort.value = col || 'number';
        dir.value = direcao === 'asc' ? 'asc' : 'desc';
        page.value = 1;
        if (buscaAgendada) return buscaAgendada;
        buscaAgendada = Promise.resolve().then(() => {
            buscaAgendada = null;
            return search();
        });
        return buscaAgendada;
    }

    function setSort(col) {
        if (sort.value === col) {
            dir.value = dir.value === 'asc' ? 'desc' : 'asc';
        } else {
            sort.value = col;
            dir.value = 'desc';
        }
        page.value = 1;
        return search();
    }

    return {
        // filtros
        enterpriseIds, q, cef,
        // paginação
        page, pageSize, sort, dir, totalPages,
        // dados
        enterprises, isAdmin, rows, total, summary,
        // estado
        loading, loadingEnterprises, error, searched,
        // ações
        fetchEnterprises, search, applyFilters, goToPage, setSort, applySort, clear,
    };
});
