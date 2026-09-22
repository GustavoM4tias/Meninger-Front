import { defineStore } from 'pinia';
import { ref } from 'vue';
import { etapaDe } from '@/views/Office/Comercial/Reservas/stages.js';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

// Empreendimento NÃO fica mais aqui: o filtro guarda o idempreendimento do CV e
// as opções vêm das facetas do servidor + catálogo (useEnterpriseCatalog). Um
// cache de nomes duplicava "PARK ALAMEDA" e "PARK ALAMEDA - SARANDI" e filtrar
// por um deles perdia metade do histórico.
const LS = {
    sit: 'res_sit_options_v1',
    rep: 'res_rep_options_v1',
    imo: 'res_imo_options_v1',
    cor: 'res_cor_options_v1',
    emcrsp: 'res_emcrsp_options_v1',
    tipoVenda: 'res_tipoVenda_options_v1',
    leadOrig: 'res_lead_origens_v1',
};

const loadLS = (k) => { try { const r = localStorage.getItem(k); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; } catch { return []; } };
const saveLS = (k, a) => { try { localStorage.setItem(k, JSON.stringify(a)); } catch {} };
// Cache antigo de nomes: some para não ressuscitar o filtro por nome.
try { localStorage.removeItem('res_emp_options_v1'); } catch {}

export const useReservasStore = defineStore('reservas', () => {
    const reservas = ref([]);
    const count = ref(0);
    // O servidor confirma se filtrou. A tela mostra isso em cima da lista:
    // número que muda por causa de um filtro invisível é o que faz alguém
    // comparar com o CV e achar que o sistema está errado.
    const canceladosExcluidos = ref(true);
    const periodo = ref({ data_inicio: null, data_fim: null });
    // O periodo que o SERVIDOR escolhe quando ninguem manda data. Mora na store
    // (e nao na tela) porque a tela e remontada a cada troca de guia: se
    // nascesse vazio de novo, o filtro de data espelhado da visita anterior
    // contava como "2 filtros ativos" sem ninguem ter filtrado nada.
    const periodoPadrao = ref({ data_inicio: '', data_fim: '' });
    const error = ref(null);
    const carregamento = useCarregamentoStore();

    // Facetas de empreendimento no escopo do usuário: [{ id, nome }]. `null`
    // enquanto o servidor não respondeu (a tela cai no catálogo inteiro).
    const facets = ref({ empreendimentos: null });

    // listas persistentes
    const situacoesOptions             = ref(loadLS(LS.sit));
    const statusRepasseOptions         = ref(loadLS(LS.rep));
    const imobiliariasOptions          = ref(loadLS(LS.imo));
    const corretoresOptions            = ref(loadLS(LS.cor));
    const empresasCorrespondentesOptions = ref(loadLS(LS.emcrsp));
    const tipoVendaOptions             = ref(loadLS(LS.tipoVenda));
    const leadOrigensOptions           = ref(loadLS(LS.leadOrig));

    const filtros = ref({
        nome: '', documento: '',
        empreendimento: [], etapa: [], bloco: [], unidade: [],
        situacao: [], status_repasse: [], tipovenda: [],
        imobiliaria: [], corretor: [],
        empresa_correspondente: [],
        lead_origem: [],
        only_active: false, only_vendida: false, with_lead: false, excluir_painel: false,
        // Canceladas, distratadas, reprovadas e vencidas ficam FORA por padrão
        // (decisão de 2026-09-21). `false` aqui significa "usar o padrão do
        // servidor", que é excluir - `buildQuery` só manda booleano quando é
        // true, então marcar isto é o que PEDE o universo cheio.
        incluir_cancelados: false,
        // Travada para o ERP: entrou em Envio Sienge e não virou contrato no
        // Sienge dentro do prazo do lote (ver Meninger-Back/lib/alertaEnvioErp.js).
        only_alerta_erp: false,
        data_inicio: '', data_fim: '',
    });

    const buildQuery = () => {
        const q = new URLSearchParams();
        Object.entries(filtros.value).forEach(([k, v]) => {
            if (v === undefined || v === null) return;
            if (Array.isArray(v)) { if (v.length) q.append(k, v.join(',')); }
            else if (typeof v === 'boolean') { if (v) q.append(k, 'true'); }
            else if (String(v).trim() !== '') q.append(k, String(v).trim());
        });
        return q.toString();
    };
    const authHeaders = () => {
        const token = localStorage.getItem('token');
        return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' };
    };

    // GET /cv/reservas/report/facets → { empreendimentos: [{ id, nome }] }.
    // Falha fica silenciosa: o filtro passa a oferecer o catálogo inteiro.
    async function fetchFacets() {
        try {
            const resp = await fetch(`${API_URL}/cv/reservas/report/facets`, { headers: authHeaders() });
            if (!resp.ok) return;
            const data = await resp.json().catch(() => ({}));
            if (Array.isArray(data?.empreendimentos)) facets.value = { empreendimentos: data.empreendimentos };
        } catch {}
    }

    // As linhas trazem `idempreendimento_cv`: o que veio na busca e ainda não
    // está nas facetas entra nelas, para o filtro nunca esconder um
    // empreendimento que está na própria lista.
    function mergeFacetsFromRows(list) {
        const atuais = Array.isArray(facets.value.empreendimentos) ? facets.value.empreendimentos : [];
        const vistos = new Set(atuais.map(f => Number(f.id)));
        const novos = [];
        for (const r of (list || [])) {
            const id = Number(r?.idempreendimento_cv);
            if (!Number.isFinite(id) || id <= 0 || vistos.has(id)) continue;
            vistos.add(id);
            novos.push({ id, nome: r?.empreendimento || null });
        }
        if (novos.length) {
            facets.value = { empreendimentos: [...atuais, ...novos].sort((a, b) => Number(a.id) - Number(b.id)) };
        }
    }

    function mergeOptions(list) {
        const sitSet = new Set(situacoesOptions.value);
        const repSet = new Set(statusRepasseOptions.value);
        const imoSet = new Set(imobiliariasOptions.value);
        const corSet = new Set(corretoresOptions.value);
        const ecSet  = new Set(empresasCorrespondentesOptions.value);
        const tvSet  = new Set(tipoVendaOptions.value);
        const lorSet = new Set(leadOrigensOptions.value);

        for (const r of (list || [])) {
            const sit = etapaDe(r).trim();                     if (sit) sitSet.add(sit);
            if (r?.status_repasse) repSet.add(String(r.status_repasse).trim());
            const imo = r?.imobiliaria?.nome?.trim();          if (imo) imoSet.add(imo);
            const cor = r?.corretor?.nome?.trim();             if (cor) corSet.add(cor);
            const ec  = r?.empresa_correspondente?.nome?.trim(); if (ec) ecSet.add(ec);
            if (r?.tipovenda) tvSet.add(String(r.tipovenda).trim());
            for (const o of (r?.lead_origens || [])) {
                if (o && String(o).trim()) lorSet.add(String(o).trim());
            }
        }
        const sortPt = (a, b) => a.localeCompare(b, 'pt-BR');
        situacoesOptions.value       = Array.from(sitSet).sort(sortPt);
        statusRepasseOptions.value   = Array.from(repSet).sort(sortPt);
        imobiliariasOptions.value    = Array.from(imoSet).sort(sortPt);
        corretoresOptions.value      = Array.from(corSet).sort(sortPt);
        empresasCorrespondentesOptions.value = Array.from(ecSet).sort(sortPt);
        tipoVendaOptions.value       = Array.from(tvSet).sort(sortPt);
        leadOrigensOptions.value     = Array.from(lorSet).sort(sortPt);

        saveLS(LS.sit, situacoesOptions.value);
        saveLS(LS.rep, statusRepasseOptions.value);
        saveLS(LS.imo, imobiliariasOptions.value);
        saveLS(LS.cor, corretoresOptions.value);
        saveLS(LS.emcrsp, empresasCorrespondentesOptions.value);
        saveLS(LS.tipoVenda, tipoVendaOptions.value);
        saveLS(LS.leadOrig, leadOrigensOptions.value);
    }

    // Uma busca por vez. Cada chamada cancela a anterior (AbortController) e
    // carrega um numero de serie: so a resposta da busca MAIS RECENTE entra na
    // store. Sem isso, sair da guia com uma busca no ar e voltar (ou clicar em
    // Buscar duas vezes) deixava a resposta velha chegar por ultimo e
    // sobrescrever a lista com o filtro anterior - a tela dizia um filtro e
    // mostrava outro.
    let buscaNoAr = null;
    let serie = 0;

    async function fetchReservas(loading = false) {
        error.value = null;
        if (buscaNoAr) buscaNoAr.abort();
        const controle = new AbortController();
        buscaNoAr = controle;
        const minha = ++serie;
        try {
            if (loading) carregamento.iniciarCarregamento();
            const qs = buildQuery();
            const url = `${API_URL}/cv/reservas/report${qs ? `?${qs}` : ''}`;
            const resp = await fetch(url, { method: 'GET', headers: authHeaders(), signal: controle.signal });
            if (resp.status === 401) {
                localStorage.removeItem('token');
                throw new Error('Sessão expirada. Faça login novamente.');
            }
            const data = await resp.json();
            if (minha !== serie) return; // ja saiu uma busca mais nova: esta nao vale
            if (!resp.ok) throw new Error(data?.error || 'Erro ao carregar reservas');

            reservas.value = Array.isArray(data.results) ? data.results : [];
            count.value = data.count ?? reservas.value.length ?? 0;
            periodo.value = data.periodo ?? { data_inicio: null, data_fim: null };
            canceladosExcluidos.value = data.cancelados_excluidos !== false;
            mergeOptions(reservas.value);
            mergeFacetsFromRows(reservas.value);
        } catch (e) {
            if (e?.name === 'AbortError') return; // cancelada por uma busca mais nova
            error.value = e.message;
        } finally {
            if (buscaNoAr === controle) buscaNoAr = null;
            if (loading) carregamento.finalizarCarregamento();
        }
    }

    // ============= Helpers =============
    // Uma reserva tem DESFECHO quando virou etapa Vendida ou foi cancelada /
    // distratada. Enquanto isso ela esta em curso (ativa).
    // A etapa vem de `etapaDe`, nunca de `situacao.nome` - essa chave nao existe
    // no bloco do CV e fazia os dois regex abaixo falharem calados.
    const isVendida    = (r) => r?.vendida === 'S' || /vendid/i.test(etapaDe(r));
    const isCancelada  = (r) => /cancelad|distrato/i.test(etapaDe(r)) || /cancelad|distrato/i.test(r?.status_repasse || '');
    const isAtiva      = (r) => !isVendida(r) && !isCancelada(r);
    // PENDENTE: conta qualquer status_repasse nao nulo, e "Em espera" significa
    // repasse NAO iniciado. Mantido de proposito ate o Gustavo decidir se sai
    // da conta - mexer aqui muda o KPI "Em repasse" da tela.
    const isEmRepasse  = (r) => !!r?.status_repasse && !isCancelada(r);

    return {
        // state
        reservas, count, periodo, periodoPadrao, error, filtros, canceladosExcluidos,
        // facetas (empreendimento por id)
        facets, fetchFacets,
        // options
        situacoesOptions, statusRepasseOptions,
        imobiliariasOptions, corretoresOptions, empresasCorrespondentesOptions,
        tipoVendaOptions, leadOrigensOptions,
        // helpers
        isVendida, isCancelada, isAtiva, isEmRepasse,
        // actions
        fetchReservas,
    };
});
