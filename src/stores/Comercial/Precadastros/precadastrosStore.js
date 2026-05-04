import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { bucketOf, STAGE_GROUPS } from '@/views/Office/Comercial/Precadastros/stages.js';

const LS = {
    emp: 'pre_emp_options_v1',
    sit: 'pre_sit_options_v1',
    imo: 'pre_imo_options_v1',
    cor: 'pre_cor_options_v1',
    crsp: 'pre_crsp_options_v1',
    emcrsp: 'pre_emcrsp_options_v1',
    int: 'pre_int_options_v1',
    company: 'pre_company_options_v1',
    leadOrig: 'pre_lead_origens_v1',
};

const loadLS = (k) => { try { const r = localStorage.getItem(k); const a = r ? JSON.parse(r) : []; return Array.isArray(a) ? a : []; } catch { return []; } };
const saveLS = (k, a) => { try { localStorage.setItem(k, JSON.stringify(a)); } catch {} };

export const usePrecadastrosStore = defineStore('precadastros', () => {
    const precadastros = ref([]);
    const count = ref(0);
    const periodo = ref({ data_inicio: null, data_fim: null });
    const error = ref(null);
    const carregamento = useCarregamentoStore();

    // listas persistentes (alimentadas com o que vem do back)
    const empreendimentosOptions = ref(loadLS(LS.emp));
    const situacoesOptions       = ref(loadLS(LS.sit));
    const imobiliariasOptions    = ref(loadLS(LS.imo));
    const corretoresOptions      = ref(loadLS(LS.cor));
    const correspondentesOptions = ref(loadLS(LS.crsp));
    const empresasCorrespondentesOptions = ref(loadLS(LS.emcrsp));
    const intencoesOptions       = ref(loadLS(LS.int));
    const leadOrigensOptions     = ref(loadLS(LS.leadOrig));
    const companiesOptions       = ref(loadLS(LS.company)); // empresas (construtora) — para 1 ou N empreendimentos

    const filtros = ref({
        nome: '', documento: '',
        empresa: [],
        empreendimento: [], situacao_nome: [],
        imobiliaria: [], corretor: [],
        correspondente: [], empresa_correspondente: [],
        intencao_compra: [],
        only_active: false, with_lead: false, excluir_painel: false,
        lead_origem: [],
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

    // mergeOptions acumula opções a partir do que carrega no período.
    // ACUMULA — não remove. Persistido em localStorage, então com o tempo as listas
    // de empreendimento/situação/etc. ficam completas mesmo quando o período é curto.
    function mergeOptions(list) {
        const empSet = new Set(empreendimentosOptions.value);
        const sitSet = new Set(situacoesOptions.value);
        const imoSet = new Set(imobiliariasOptions.value);
        const corSet = new Set(corretoresOptions.value);
        const crSet  = new Set(correspondentesOptions.value);
        const ecSet  = new Set(empresasCorrespondentesOptions.value);
        const intSet = new Set(intencoesOptions.value);
        const lorSet = new Set(leadOrigensOptions.value);

        for (const p of list || []) {
            const emp = p?.empreendimento?.nome?.trim();          if (emp) empSet.add(emp);
            if (p.situacao_nome) sitSet.add(String(p.situacao_nome).trim());
            const imo = p?.imobiliaria?.nome?.trim();             if (imo) imoSet.add(imo);
            const cor = p?.corretor?.nome?.trim();                if (cor) corSet.add(cor);
            const cr  = p?.correspondente?.nome?.trim();          if (cr)  crSet.add(cr);
            const ec  = p?.empresa_correspondente?.nome?.trim();  if (ec)  ecSet.add(ec);
            if (p.intencao_compra) intSet.add(String(p.intencao_compra).trim());
            for (const o of (p.lead_origens || [])) {
                if (o && String(o).trim()) lorSet.add(String(o).trim());
            }
        }
        const sortPt = (a, b) => a.localeCompare(b, 'pt-BR');
        empreendimentosOptions.value = Array.from(empSet).sort(sortPt);
        situacoesOptions.value       = Array.from(sitSet).sort(sortPt);
        imobiliariasOptions.value    = Array.from(imoSet).sort(sortPt);
        corretoresOptions.value      = Array.from(corSet).sort(sortPt);
        correspondentesOptions.value = Array.from(crSet).sort(sortPt);
        empresasCorrespondentesOptions.value = Array.from(ecSet).sort(sortPt);
        intencoesOptions.value       = Array.from(intSet).sort(sortPt);
        leadOrigensOptions.value     = Array.from(lorSet).sort(sortPt);

        saveLS(LS.emp, empreendimentosOptions.value);
        saveLS(LS.sit, situacoesOptions.value);
        saveLS(LS.imo, imobiliariasOptions.value);
        saveLS(LS.cor, corretoresOptions.value);
        saveLS(LS.crsp, correspondentesOptions.value);
        saveLS(LS.emcrsp, empresasCorrespondentesOptions.value);
        saveLS(LS.int, intencoesOptions.value);
        saveLS(LS.leadOrig, leadOrigensOptions.value);
    }

    async function fetchPrecadastros(loading = false) {
        error.value = null;
        try {
            if (loading) carregamento.iniciarCarregamento();
            const qs = buildQuery();
            const url = `${API_URL}/cv/precadastros${qs ? `?${qs}` : ''}`;
            const resp = await fetch(url, { method: 'GET', headers: authHeaders() });
            if (resp.status === 401) {
                localStorage.removeItem('token');
                throw new Error('Sessão expirada. Faça login novamente.');
            }
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.error || 'Erro ao carregar pré-cadastros');

            precadastros.value = Array.isArray(data.results) ? data.results : [];
            count.value = data.count ?? precadastros.value.length ?? 0;
            periodo.value = data.periodo ?? { data_inicio: null, data_fim: null };
            mergeOptions(precadastros.value);
        } catch (e) {
            error.value = e.message;
        } finally {
            if (loading) carregamento.finalizarCarregamento();
        }
    }

    // ============= Helpers =============
    // "Em Reserva" também conta como APROVADO — o pré-cadastro só vira reserva
    // após passar por todas as etapas de análise e ser aprovado.
    const isReserva   = (p) => /reserva/i.test(p.situacao_nome || '');
    const isAprovado  = (p) => /aprovad|reserva/i.test(p.situacao_nome || '');
    const isReprovado = (p) => /reprovad|negad|inelegív|inelegiv|inviáv|inviav|restriç|restric/i.test(p.situacao_nome || '')
                                && !/aprovad/i.test(p.situacao_nome || ''); // "Aprovado Restrição" → aprovado
    const isCancelado = (p) => !!p.data_cancelamento || /cancelad|distrat/i.test(p.situacao_nome || '');
    const isEmAnalise = (p) => !p.data_fim && !p.data_cancelamento;

    // ============= KPIs =============
    const kpiPorSituacao = computed(() => {
        const map = new Map();
        for (const p of precadastros.value) {
            const key = (p.situacao_nome || 'Sem Situação').trim();
            map.set(key, (map.get(key) || 0) + 1);
        }
        return map;
    });

    const situationsList = computed(() =>
        Array.from(kpiPorSituacao.value.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => ({ key: k, label: k, count: v }))
    );

    const kpiSituacoes = computed(() => ({
        total: count.value || precadastros.value.length || 0,
        items: situationsList.value,
    }));

    // tempo médio em análise (dias) — TODOS (em curso + finalizados)
    const tempoMedioAnaliseDias = computed(() => {
        const arr = precadastros.value
            .map(p => Number(p.dias_em_analise))
            .filter(n => Number.isFinite(n) && n >= 0);
        if (!arr.length) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    });

    // tempo médio APENAS para análises FINALIZADAS (data_fim ou data_cancelamento setados)
    // = tempo de "ciclo" da análise — o que realmente representa quanto tempo um banco
    // leva para chegar a uma resposta.
    const tempoMedioFinalizar = computed(() => {
        const arr = precadastros.value
            .filter(p => p.data_fim || p.data_cancelamento)
            .map(p => Number(p.dias_em_analise))
            .filter(n => Number.isFinite(n) && n >= 0);
        if (!arr.length) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    });

    // Distribuição de outcomes — TODOS os percentuais sobre o TOTAL de pastas:
    //  - aprovados_total = "Aprovado*" + "Em Reserva" (todos sucessos)
    //  - aprovados_sem_reserva = só "Aprovado*"
    //  - reservas = subset que avançou para reserva
    //  - reprovados = "Reprovado/Negado/Cancelado/Restrição*"
    //  - total = TODAS as pastas (incluindo em análise / em curso)
    //
    //  - pct_aprovados        = aprovados   ÷ TOTAL
    //  - pct_conversao_reserva = reservas   ÷ TOTAL
    //  - pct_reprovados       = reprovados  ÷ TOTAL
    const outcomeBreakdown = computed(() => {
        let aprovSemReserva = 0, reprov = 0, reserva = 0;
        const total = precadastros.value.length;
        for (const p of precadastros.value) {
            if (isReserva(p))           reserva++;
            else if (isAprovado(p))     aprovSemReserva++;
            else if (isReprovado(p))    reprov++;
        }
        const aprovTotal = aprovSemReserva + reserva;
        const totalFinalizadas = aprovTotal + reprov;
        return {
            total,
            aprovados:       aprovTotal,                  // inclui reserva
            aprovados_sem_reserva: aprovSemReserva,
            reservas:        reserva,
            reprovados:      reprov,
            total_finalizadas: totalFinalizadas,
            pct_aprovados:         total ? aprovTotal / total : 0,
            pct_conversao_reserva: total ? reserva    / total : 0,
            pct_reprovados:        total ? reprov     / total : 0,
        };
    });

    // Taxa de aprovação: sucesso (aprov + reserva) ÷ total finalizadas
    const taxaAprovacao = computed(() => {
        const aprov = precadastros.value.filter(isAprovado).length;   // já inclui reserva
        const reprov = precadastros.value.filter(isReprovado).length;
        const denom = aprov + reprov;
        return denom ? aprov / denom : 0;
    });

    // por empreendimento
    const porEmpreendimento = computed(() => {
        const map = new Map();
        for (const p of precadastros.value) {
            const name = p?.empreendimento?.nome?.trim() || 'Sem Empreendimento';
            const e = map.get(name) || { name, count: 0, aprovados: 0, em_analise: 0, cancelados: 0, precadastros: [] };
            e.count++;
            if (isAprovado(p)) e.aprovados++;
            if (isEmAnalise(p)) e.em_analise++;
            if (isCancelado(p)) e.cancelados++;
            e.precadastros.push(p);
            map.set(name, e);
        }
        return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
    });

    // por empresa correspondente — velocidade + taxa de aprovação
    const porEmpresaCorrespondente = computed(() => {
        const map = new Map();
        for (const p of precadastros.value) {
            const name = p?.empresa_correspondente?.nome?.trim() || 'Sem Empresa';
            const e = map.get(name) || {
                name, count: 0, aprovados: 0, reprovados: 0, em_analise: 0,
                soma_dias: 0, qtd_finalizados: 0, precadastros: [],
            };
            e.count++;
            if (isAprovado(p)) e.aprovados++;
            if (isReprovado(p)) e.reprovados++;
            if (isEmAnalise(p)) e.em_analise++;
            const dias = Number(p.dias_em_analise);
            if (Number.isFinite(dias) && (p.data_fim || p.data_cancelamento)) {
                e.soma_dias += dias;
                e.qtd_finalizados++;
            }
            e.precadastros.push(p);
            map.set(name, e);
        }
        return Array.from(map.values()).map(e => ({
            ...e,
            tempo_medio_dias: e.qtd_finalizados ? e.soma_dias / e.qtd_finalizados : 0,
            taxa_aprovacao: (e.aprovados + e.reprovados) ? e.aprovados / (e.aprovados + e.reprovados) : 0,
        })).sort((a, b) => b.count - a.count);
    });

    // por mês
    const porMes = computed(() => {
        const map = new Map();
        for (const p of precadastros.value) {
            if (!p.data_cad) continue;
            const d = new Date(p.data_cad);
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const e = map.get(k) || { mes: k, total: 0, aprovados: 0, em_analise: 0, cancelados: 0 };
            e.total++;
            if (isAprovado(p)) e.aprovados++;
            if (isEmAnalise(p)) e.em_analise++;
            if (isCancelado(p)) e.cancelados++;
            map.set(k, e);
        }
        return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
    });

    return {
        // state
        precadastros, count, periodo, error, filtros,
        // options (alimentadas via mergeOptions do período)
        empreendimentosOptions, situacoesOptions, imobiliariasOptions, corretoresOptions,
        correspondentesOptions, empresasCorrespondentesOptions, intencoesOptions,
        leadOrigensOptions,
        // getters
        kpiPorSituacao, kpiSituacoes, situationsList,
        tempoMedioAnaliseDias, tempoMedioFinalizar, taxaAprovacao, outcomeBreakdown,
        porEmpreendimento, porEmpresaCorrespondente, porMes,
        // helpers (caso componentes precisem)
        isAprovado, isReprovado, isCancelado, isEmAnalise,
        // actions
        fetchPrecadastros,
    };
});
