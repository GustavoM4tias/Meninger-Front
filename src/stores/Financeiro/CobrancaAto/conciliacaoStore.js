// src/stores/Financeiro/CobrancaAto/conciliacaoStore.js
//
// Aba Conciliação da tela Ato (Financeiro > Contas a Receber). Consome
// /api/sienge/recebimentos-ato/*, que lê a API do Sienge AO VIVO e espelha o
// relatório "Contas Recebidas (por Data de Recebimento)" no documento AVC.
// Ao vivo, e não do backup diário, porque o espelho é de ~05h: um relatório
// tirado no Sienge à tarde não batia com o nosso (ver o service).
// Alçada aplicada no backend: admin vê tudo, não-admin só os empreendimentos do
// seu escopo. Espelha o padrão do consultaCefStore.js.
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

const hoje = () => new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const primeiroDiaDoMes = () => {
    const d = hoje();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const TOTAIS_ZERO = {
    linhas: 0, parcelas: 0, titulos: 0, clientes: 0,
    valor_baixa: 0, acrescimo: 0, seguro: 0, taxa_adm: 0,
    desconto: 0, liquido: 0, valor_medio: 0,
};

export const useConciliacaoStore = defineStore('conciliacaoAto', () => {
    // ── Filtros ────────────────────────────────────────────────────────────────
    // Mês corrente por padrão: é o recorte que o Financeiro pede toda semana.
    const startDate = ref(primeiroDiaDoMes());
    const endDate = ref(iso(hoje()));
    const empresas = ref([]);          // cdempresaview
    const empreendimentos = ref([]);   // cdempreendview (centro de custo)
    /* Confronta o recebimento do Sienge com o ato cobrado pelo Office. Nasce
       LIGADO: o confronto é o motivo da aba existir, e abrir sem ele deixava a
       tela parecendo só um espelho do Sienge. Desligar continua valendo para
       quem quer o relatório puro (e economiza duas consultas). */
    const mesclarAto = ref(true);
    /* Quantos dias antes do periodo o confronto olha para NAO acusar de
       "falta lancar" um ato que ja foi lancado fora da janela. O padrao (90)
       vive no backend; aqui e so o que o usuario escolheu. */
    const folgaDias = ref(90);

    // ── Ordenação ──────────────────────────────────────────────────────────────
    const sort = ref('data_baixa');
    const dir = ref('asc');            // o relatório do Sienge sobe por data

    // ── Dados ──────────────────────────────────────────────────────────────────
    const empresaOptions = ref([]);        // [{ id, name }] já cortados pela alçada
    const empreendimentoOptions = ref([]);
    const isAdmin = ref(false);
    const consultadoEm = ref(null);        // instante da consulta ao vivo na API
    const linhas = ref([]);
    const porDia = ref([]);
    const totais = ref({ ...TOTAIS_ZERO });
    const conciliacao = ref(null);     // null = mesclagem desligada

    // ── Estado ─────────────────────────────────────────────────────────────────
    const loading = ref(false);
    const loadingFiltros = ref(false);
    const error = ref(null);
    const searched = ref(false);

    const temResultado = computed(() => linhas.value.length > 0);

    // ── Ações ──────────────────────────────────────────────────────────────────
    async function fetchFiltros() {
        if (empresaOptions.value.length || empreendimentoOptions.value.length) return;
        loadingFiltros.value = true;
        try {
            const data = await requestWithAuth(`${API_URL}/sienge/recebimentos-ato/filters`);
            empresaOptions.value = data?.empresas || [];
            empreendimentoOptions.value = data?.empreendimentos || [];

            isAdmin.value = !!data?.isAdmin;
        } catch (e) {
            console.error('[recebimentos-ato] fetchFiltros', e);
            error.value = e.message || 'Falha ao carregar os filtros.';
        } finally {
            loadingFiltros.value = false;
        }
    }

    function baseParams() {
        const p = new URLSearchParams();
        if (startDate.value) p.set('startDate', startDate.value);
        if (endDate.value) p.set('endDate', endDate.value);
        if (empresas.value.length) p.set('empresas', empresas.value.join(','));
        if (empreendimentos.value.length) p.set('empreendimentos', empreendimentos.value.join(','));
        if (mesclarAto.value) {
            p.set('mesclarAto', '1');
            p.set('folgaDias', String(folgaDias.value ?? 90));
        }
        return p;
    }

    async function search() {
        error.value = null;
        loading.value = true;
        try {
            const p = baseParams();
            p.set('sort', sort.value);
            p.set('dir', dir.value);
            const data = await requestWithAuth(`${API_URL}/sienge/recebimentos-ato?${p.toString()}`);
            linhas.value = data?.linhas || [];
            porDia.value = data?.porDia || [];
            totais.value = data?.totais || { ...TOTAIS_ZERO };
            conciliacao.value = data?.conciliacao || null;
            consultadoEm.value = data?.consultadoEm || null;
            if (typeof data?.isAdmin === 'boolean') isAdmin.value = data.isAdmin;
            searched.value = true;
        } catch (e) {
            console.error('[recebimentos-ato] search', e);
            error.value = e.message || 'Falha ao carregar os recebimentos do ato.';
            linhas.value = [];
            porDia.value = [];
            totais.value = { ...TOTAIS_ZERO };
            conciliacao.value = null;
        } finally {
            loading.value = false;
        }
    }

    const applyFilters = () => search();

    /* Ordenação EXPLÍCITA (coluna e direção de uma vez), que é o que o DataTable
       manda. Ele avisa as duas em eventos separados no mesmo clique, então a
       busca é adiada para a próxima microtarefa: sem isso um clique viraria
       DUAS consultas, e a segunda chegaria por cima. */
    let buscaAgendada = null;
    function applySort(col, direcao) {
        sort.value = col || 'data_baixa';
        dir.value = direcao === 'desc' ? 'desc' : 'asc';
        if (buscaAgendada) return buscaAgendada;
        buscaAgendada = Promise.resolve().then(() => {
            buscaAgendada = null;
            return search();
        });
        return buscaAgendada;
    }

    /* Baixa o CSV do recorte atual. O endpoint exige Bearer, então não dá pra
       usar window.open direto: fetch + blob + download programático (mesma
       estratégia do metaFormsStore). */
    const exporting = ref(false);
    async function exportCsv() {
        exporting.value = true;
        error.value = null;
        try {
            const p = baseParams();
            p.set('sort', sort.value);
            p.set('dir', dir.value);
            const token = localStorage.getItem('token');
            const r = await fetch(`${API_URL}/sienge/recebimentos-ato/export?${p.toString()}`, {
                headers: { Authorization: token ? `Bearer ${token}` : '' },
            });
            if (!r.ok) throw new Error(`Erro ao exportar (${r.status}).`);
            const blob = await r.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recebimentos-ato-${startDate.value}-a-${endDate.value}.csv`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('[recebimentos-ato] exportCsv', e);
            error.value = e.message || 'Falha ao exportar o relatório.';
        } finally {
            exporting.value = false;
        }
    }

    function clear() {
        startDate.value = primeiroDiaDoMes();
        endDate.value = iso(hoje());
        empresas.value = [];
        empreendimentos.value = [];
        mesclarAto.value = true;
        folgaDias.value = 90;
        sort.value = 'data_baixa';
        dir.value = 'asc';
        linhas.value = [];
        porDia.value = [];
        totais.value = { ...TOTAIS_ZERO };
        conciliacao.value = null;
        error.value = null;
        searched.value = false;
    }

    return {
        // filtros
        startDate, endDate, empresas, empreendimentos, mesclarAto, folgaDias,
        // ordenação
        sort, dir,
        // dados
        empresaOptions, empreendimentoOptions, isAdmin, consultadoEm, linhas, porDia, totais, conciliacao,
        // estado
        loading, loadingFiltros, exporting, error, searched, temResultado,
        // ações
        fetchFiltros, search, applyFilters, applySort, exportCsv, clear,
    };
});
