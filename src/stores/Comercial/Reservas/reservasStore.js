import { defineStore } from 'pinia';
import { ref } from 'vue';
import { etapaDe } from '@/views/Office/Comercial/Reservas/stages.js';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

const LS = {
    emp: 'res_emp_options_v1',
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

export const useReservasStore = defineStore('reservas', () => {
    const reservas = ref([]);
    const count = ref(0);
    const periodo = ref({ data_inicio: null, data_fim: null });
    const error = ref(null);
    const carregamento = useCarregamentoStore();

    // listas persistentes
    const empreendimentosOptions       = ref(loadLS(LS.emp));
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

    function mergeOptions(list) {
        const empSet = new Set(empreendimentosOptions.value);
        const sitSet = new Set(situacoesOptions.value);
        const repSet = new Set(statusRepasseOptions.value);
        const imoSet = new Set(imobiliariasOptions.value);
        const corSet = new Set(corretoresOptions.value);
        const ecSet  = new Set(empresasCorrespondentesOptions.value);
        const tvSet  = new Set(tipoVendaOptions.value);
        const lorSet = new Set(leadOrigensOptions.value);

        for (const r of (list || [])) {
            if (r?.empreendimento) empSet.add(String(r.empreendimento).trim());
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
        empreendimentosOptions.value = Array.from(empSet).sort(sortPt);
        situacoesOptions.value       = Array.from(sitSet).sort(sortPt);
        statusRepasseOptions.value   = Array.from(repSet).sort(sortPt);
        imobiliariasOptions.value    = Array.from(imoSet).sort(sortPt);
        corretoresOptions.value      = Array.from(corSet).sort(sortPt);
        empresasCorrespondentesOptions.value = Array.from(ecSet).sort(sortPt);
        tipoVendaOptions.value       = Array.from(tvSet).sort(sortPt);
        leadOrigensOptions.value     = Array.from(lorSet).sort(sortPt);

        saveLS(LS.emp, empreendimentosOptions.value);
        saveLS(LS.sit, situacoesOptions.value);
        saveLS(LS.rep, statusRepasseOptions.value);
        saveLS(LS.imo, imobiliariasOptions.value);
        saveLS(LS.cor, corretoresOptions.value);
        saveLS(LS.emcrsp, empresasCorrespondentesOptions.value);
        saveLS(LS.tipoVenda, tipoVendaOptions.value);
        saveLS(LS.leadOrig, leadOrigensOptions.value);
    }

    async function fetchReservas(loading = false) {
        error.value = null;
        try {
            if (loading) carregamento.iniciarCarregamento();
            const qs = buildQuery();
            const url = `${API_URL}/cv/reservas/report${qs ? `?${qs}` : ''}`;
            const resp = await fetch(url, { method: 'GET', headers: authHeaders() });
            if (resp.status === 401) {
                localStorage.removeItem('token');
                throw new Error('Sessão expirada. Faça login novamente.');
            }
            const data = await resp.json();
            if (!resp.ok) throw new Error(data?.error || 'Erro ao carregar reservas');

            reservas.value = Array.isArray(data.results) ? data.results : [];
            count.value = data.count ?? reservas.value.length ?? 0;
            periodo.value = data.periodo ?? { data_inicio: null, data_fim: null };
            mergeOptions(reservas.value);
        } catch (e) {
            error.value = e.message;
        } finally {
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
        reservas, count, periodo, error, filtros,
        // options
        empreendimentosOptions, situacoesOptions, statusRepasseOptions,
        imobiliariasOptions, corretoresOptions, empresasCorrespondentesOptions,
        tipoVendaOptions, leadOrigensOptions,
        // helpers
        isVendida, isCancelada, isAtiva, isEmRepasse,
        // actions
        fetchReservas,
    };
});
