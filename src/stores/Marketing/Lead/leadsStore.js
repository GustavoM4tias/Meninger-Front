import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

const LS = {
    emp: 'leads_emp_options_v1',
    org: 'leads_org_options_v1',
    sit: 'leads_sit_options_v1',
    mid: 'leads_mid_options_v1',
    imo: 'leads_imo_options_v1',
    cor: 'leads_cor_options_v1',
};

function loadLS(key) {
    try {
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}
function saveLS(key, arr) {
    try {
        localStorage.setItem(key, JSON.stringify(arr));
    } catch { }
}

export const useLeadsStore = defineStore('leads', () => {
    const leads = ref([])
    const count = ref(0)
    const periodo = ref({ data_inicio: null, data_fim: null })
    const filas = ref([])
    const error = ref(null)
    const carregamento = useCarregamentoStore();

    // listas persistentes
    const empreendimentosOptions = ref(loadLS(LS.emp))
    const origensOptions = ref(loadLS(LS.org))
    const situacoesOptions = ref(loadLS(LS.sit))
    const midiasOptions = ref(loadLS(LS.mid))
    const imobiliariasOptions = ref(loadLS(LS.imo))
    const corretoresOptions = ref(loadLS(LS.cor))

    // Origens de painel interno — não são captação real, então saem do padrão.
    const ORIGENS_EXCLUIDAS = ['Painel Corretor', 'Painel Gestor', 'Painel Imobiliária'];

    // filtros
    const filtros = ref({
        nome: '', email: '', telefone: '',
        imobiliaria: [], corretor: [], situacao_nome: [], midia_principal: [], origem: [], empreendimento: [],
        data_inicio: '', data_fim: '', cidade: ''
    })

    // Situações: sem whitelist por padrão. A versão antiga montava a lista a
    // partir do cache do localStorage, o que ESCONDIA qualquer situação ainda
    // não cacheada (lead novo com situação inédita sumia do relatório).
    function applyDefaultSituacoes() {
        filtros.value.situacao_nome = [];
    }

    // Origens: por padrão todas, menos os painéis internos.
    function applyDefaultOrigens() {
        if (origensOptions.value.length === 0) return;
        filtros.value.origem = origensOptions.value
            .filter(o => !ORIGENS_EXCLUIDAS.includes(String(o).trim()));
    }

    // Aplica o default imediatamente se as opções já estão no localStorage
    applyDefaultOrigens();

    const buildQuery = () => {
        const q = new URLSearchParams()
        Object.entries(filtros.value).forEach(([k, v]) => {
            if (v === undefined || v === null) return
            if (Array.isArray(v)) { if (v.length) q.append(k, v.join(',')) } else if (String(v).trim() !== '') { q.append(k, String(v).trim()) }
        })

        // Painéis internos saem SEMPRE por exclusão de nome, não pela lista
        // branca de origens. A lista branca vem do cache do localStorage e na
        // primeira abertura ela está vazia — era por isso que a primeira carga
        // vinha sem o filtro. A exclusão não depende de cache nenhum.
        // Se o usuário escolher explicitamente um painel, ele deixa de ser excluído.
        const selecionadas = filtros.value.origem || []
        const excluir = ORIGENS_EXCLUIDAS.filter(o => !selecionadas.includes(o))
        if (excluir.length) q.append('origem_excluir', excluir.join(','))

        return q.toString()
    }
    const authHeaders = () => {
        const token = localStorage.getItem('token')
        return { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' }
    }

    function mergeOptionsFromLeads(list) {
        const empSet = new Set(empreendimentosOptions.value);
        const orgSet = new Set(origensOptions.value);
        const sitSet = new Set(situacoesOptions.value);
        const midSet = new Set(midiasOptions.value);
        const imoSet = new Set(imobiliariasOptions.value);
        const corSet = new Set(corretoresOptions.value);

        for (const l of list || []) {
            // empreendimentos (array)
            const arr = Array.isArray(l.empreendimento) ? l.empreendimento : [];
            for (const e of arr) {
                const nome = e?.nome?.trim();
                if (nome) empSet.add(nome);
            }
            // simples
            if (l.origem) orgSet.add(String(l.origem).trim());
            if (l.situacao_nome) sitSet.add(String(l.situacao_nome).trim());
            if (l.midia_principal) midSet.add(String(l.midia_principal).trim());

            // jsons
            const imo = l.imobiliaria?.nome?.trim();
            if (imo) imoSet.add(imo);
            const cor = l.corretor?.nome?.trim();
            if (cor) corSet.add(cor);
        }

        const sortPt = (a, b) => a.localeCompare(b, 'pt-BR');

        empreendimentosOptions.value = Array.from(empSet).sort(sortPt);
        origensOptions.value = Array.from(orgSet).sort(sortPt);
        situacoesOptions.value = Array.from(sitSet).sort(sortPt);
        midiasOptions.value = Array.from(midSet).sort(sortPt);
        imobiliariasOptions.value = Array.from(imoSet).sort(sortPt);
        corretoresOptions.value = Array.from(corSet).sort(sortPt);

        saveLS(LS.emp, empreendimentosOptions.value);
        saveLS(LS.org, origensOptions.value);
        saveLS(LS.sit, situacoesOptions.value);
        saveLS(LS.mid, midiasOptions.value);
        saveLS(LS.imo, imobiliariasOptions.value);
        saveLS(LS.cor, corretoresOptions.value);

        // Aplica o default de origens assim que elas forem descobertas
        // (não sobrescreve seleção manual do usuário).
        if (filtros.value.origem.length === 0 && origensOptions.value.length > 0) {
            applyDefaultOrigens();
        }
    }

    async function fetchLeads(loading = false) {
        error.value = null;
        try {
            if (loading) carregamento.iniciarCarregamento();
            console.log('buscando leads')
            const qs = buildQuery();
            // ajuste se seu backend usa '/api/cv/leads' em vez de '/cv/leads'
            const url = `${API_URL}/cv/leads${qs ? `?${qs}` : ''}`;

            const resp = await fetch(url, { method: 'GET', headers: authHeaders() });
            if (resp.status === 401) {
                localStorage.removeItem('token');
                throw new Error('Sessão expirada. Faça login novamente.');
            }
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.error || 'Erro ao carregar leads');

            leads.value = Array.isArray(data.results) ? data.results : [];
            count.value = data.count ?? leads.value.length ?? 0;
            periodo.value = data.periodo ?? { data_inicio: null, data_fim: null };

            // alimente as listas persistentes (não reduz)
            mergeOptionsFromLeads(leads.value);
        } catch (e) {
            error.value = e.message;
        } finally {
            if (loading) carregamento.finalizarCarregamento();
        }
    }

    // ---------- Leads recentes (INDEPENDENTES do filtro do dashboard) ----------
    // O painel "Leads recentes" deve mostrar os últimos leads captados DE VERDADE,
    // não os mais recentes dentro do período/filtros escolhidos no dashboard.
    // Por isso busca à parte: janela recente fixa (últimos 30 dias) + exclusão dos
    // painéis internos. O componente ordena por data_cad desc e corta os N mais novos.
    const recentLeads = ref([]);
    async function fetchRecentLeads() {
        try {
            const hoje = new Date();
            const ini = new Date(hoje); ini.setDate(ini.getDate() - 30);
            const fmt = d => d.toISOString().slice(0, 10);
            const q = new URLSearchParams();
            q.append('data_inicio', fmt(ini));
            q.append('data_fim', fmt(hoje));
            q.append('origem_excluir', ORIGENS_EXCLUIDAS.join(','));
            const resp = await fetch(`${API_URL}/cv/leads?${q.toString()}`, { headers: authHeaders() });
            if (!resp.ok) return;
            const data = await resp.json();
            recentLeads.value = Array.isArray(data.results) ? data.results : [];
        } catch {
            // Painel de apoio: falha silenciosa não deve quebrar o dashboard.
        }
    }

    // ---------- Comparação com período anterior (pros deltas dos KPIs) ----------
    const prevCount = ref(0);
    const prevSituacoes = ref({});   // { situacao_nome: count }

    function effectiveRange() {
        const startS = filtros.value.data_inicio || periodo.value?.data_inicio;
        const endS   = filtros.value.data_fim    || periodo.value?.data_fim;
        if (!startS || !endS) return null;
        return { start: new Date(startS), end: new Date(endS) };
    }

    // Busca o período ANTERIOR de mesma duração com os mesmos filtros (menos datas)
    // e guarda só as contagens — sem tocar em `leads`.
    async function fetchComparison() {
        try {
            const range = effectiveRange();
            if (!range) { prevCount.value = 0; prevSituacoes.value = {}; return; }
            const days = Math.max(1, Math.round((range.end - range.start) / 86400000) + 1);
            const prevEnd = new Date(range.start); prevEnd.setDate(prevEnd.getDate() - 1);
            const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - (days - 1));
            const fmt = d => d.toISOString().slice(0, 10);

            const q = new URLSearchParams();
            Object.entries(filtros.value).forEach(([k, v]) => {
                if (k === 'data_inicio' || k === 'data_fim') return;
                if (Array.isArray(v)) { if (v.length) q.append(k, v.join(',')); }
                else if (String(v).trim() !== '') q.append(k, String(v).trim());
            });

            // Mesma exclusão de painéis do período atual — sem isso o período
            // anterior viria sem filtro e as variações % ficariam infladas.
            const selecionadas = filtros.value.origem || [];
            const excluir = ORIGENS_EXCLUIDAS.filter(o => !selecionadas.includes(o));
            if (excluir.length) q.append('origem_excluir', excluir.join(','));

            q.append('data_inicio', fmt(prevStart));
            q.append('data_fim', fmt(prevEnd));

            const resp = await fetch(`${API_URL}/cv/leads?${q.toString()}`, { headers: authHeaders() });
            if (!resp.ok) { prevCount.value = 0; prevSituacoes.value = {}; return; }
            const data = await resp.json();
            const list = Array.isArray(data.results) ? data.results : [];
            prevCount.value = data.count ?? list.length ?? 0;
            const m = {};
            for (const l of list) {
                const k = (l.situacao_nome || 'Sem Situação').trim();
                m[k] = (m[k] || 0) + 1;
            }
            prevSituacoes.value = m;
        } catch {
            prevCount.value = 0; prevSituacoes.value = {};
        }
    }

    async function fetchFilas() {
        try {
            const url = `${API_URL}/cv/filas`;
            const resp = await fetch(url, { headers: authHeaders() });
            if (resp.status === 401) {
                localStorage.removeItem('token');
                throw new Error('Sessão expirada. Faça login novamente.');
            }
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.error || 'Erro ao carregar filas');
            filas.value = data.filas || data?.results || data || [];
        } catch (e) {
            error.value = e.message;
        }
    }

    // ---------- KPIs dinâmicos por situação ----------
    // Mapa bruto: { situacao -> quantidade }
    const kpiPorSituacao = computed(() => {
        const map = new Map()
        for (const l of leads.value) {
            const key = (l.situacao_nome || 'Sem Situação').trim()
            map.set(key, (map.get(key) || 0) + 1)
        }
        return map
    })
    // Lista ordenada para render dinâmico: [{ key, label, count }]
    const situationsList = computed(() => {
        return Array.from(kpiPorSituacao.value.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => ({ key: k, label: k, count: v }))
    })
    // Atalho p/ cards: inclui total agregado
    const kpiSituacoes = computed(() => ({
        total: count.value || leads.value.length || 0,
        items: situationsList.value
    }))


    // ---------- Agregação por empreendimento ----------
    const normalizeEnterpriseName = (l) => {
        const n = l?.empreendimento?.[0]?.nome
        return n ? String(n).trim() : 'Sem Empreendimento'
    }


    // Saída: [{ name, count, leads: Lead[] }]
    const leadsByEnterprise = computed(() => {
        const map = new Map()
        for (const l of leads.value) {
            const name = normalizeEnterpriseName(l)
            const entry = map.get(name) || { name, count: 0, leads: [] }
            entry.count += 1
            entry.leads.push(l)
            map.set(name, entry)
        }
        return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'))
    })


    return {
        // state
        leads, count, periodo, filas, error, filtros, recentLeads,
        // options
        empreendimentosOptions, origensOptions, situacoesOptions, midiasOptions, imobiliariasOptions, corretoresOptions,
        // comparação
        prevCount, prevSituacoes, fetchComparison,
        // getters
        kpiPorSituacao, kpiSituacoes, situationsList, leadsByEnterprise,
        // actions
        fetchLeads, fetchRecentLeads, fetchFilas, applyDefaultSituacoes, applyDefaultOrigens,
    }
})
