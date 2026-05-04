import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { bucketOf, STAGE_GROUPS } from '@/views/Office/Comercial/Reservas/stages.js';

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
            const sit = r?.situacao?.nome?.trim();             if (sit) sitSet.add(sit);
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
    const isVendida    = (r) => r?.vendida === 'S' || /vendid/i.test(r?.situacao?.nome || '');
    const isCancelada  = (r) => /cancelad|distrato/i.test(r?.situacao?.nome || '') || /cancelad|distrato/i.test(r?.status_repasse || '');
    const isAtiva      = (r) => !isVendida(r) && !isCancelada(r);
    const isEmRepasse  = (r) => !!r?.status_repasse && !isCancelada(r);

    // ============= KPIs =============
    const kpiPorSituacao = computed(() => {
        const map = new Map();
        for (const r of reservas.value) {
            const key = (r.situacao?.nome || r.status_reserva || 'Sem Situação').trim();
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
        total: count.value || reservas.value.length || 0,
        items: situationsList.value,
    }));

    // tempo médio em reserva (até venda/contrato — apenas finalizadas)
    const tempoMedioFinalizar = computed(() => {
        const arr = reservas.value
            .filter(r => isVendida(r) || r.data_venda || r.data_contrato)
            .map(r => Number(r.dias_em_reserva))
            .filter(n => Number.isFinite(n) && n >= 0);
        if (!arr.length) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    });
    // tempo médio geral (em curso + finalizadas)
    const tempoMedioReservaDias = computed(() => {
        const arr = reservas.value
            .map(r => Number(r.dias_em_reserva))
            .filter(n => Number.isFinite(n) && n >= 0);
        if (!arr.length) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    });

    // Outcome breakdown (sobre TOTAL de reservas no período):
    //  - vendidas
    //  - canceladas (cancelada + distrato)
    //  - ativas (em curso)
    const outcomeBreakdown = computed(() => {
        let vendidas = 0, canceladas = 0, ativas = 0, emRepasse = 0;
        const total = reservas.value.length;
        for (const r of reservas.value) {
            if (isVendida(r))         vendidas++;
            else if (isCancelada(r))  canceladas++;
            else                       ativas++;
            if (isEmRepasse(r))       emRepasse++;
        }
        return {
            total,
            vendidas, canceladas, ativas, emRepasse,
            pct_vendidas:    total ? vendidas   / total : 0,
            pct_canceladas:  total ? canceladas / total : 0,
            pct_ativas:      total ? ativas     / total : 0,
            pct_em_repasse:  total ? emRepasse  / total : 0,
        };
    });

    // Taxa de conversão = vendidas ÷ (vendidas + canceladas) — entre as decididas
    const taxaConversao = computed(() => {
        const v = reservas.value.filter(isVendida).length;
        const c = reservas.value.filter(isCancelada).length;
        const denom = v + c;
        return denom ? v / denom : 0;
    });

    // Contagem por bucket do funil (usa o objeto reserva inteiro porque alguns
    // buckets — em_repasse, contrato — precisam de status_repasse além da situação).
    // Lista de reservas agrupadas em [{ key, label, icon, bg, text, bar, count, items }].
    const bucketCounts = computed(() => {
        const groups = STAGE_GROUPS.map(g => ({ ...g, count: 0, items: [] }));
        for (const r of reservas.value) {
            const b = bucketOf(r);
            const target = groups.find(g => g.key === b.key);
            if (target) { target.count++; target.items.push(r); }
        }
        // remove "outros" se vazio
        return groups.filter(g => g.key !== 'outros' || g.count > 0);
    });

    // por empreendimento
    const porEmpreendimento = computed(() => {
        const map = new Map();
        for (const r of reservas.value) {
            const name = (r.empreendimento || 'Sem Empreendimento').trim();
            const e = map.get(name) || { name, count: 0, vendidas: 0, ativas: 0, canceladas: 0, reservas: [] };
            e.count++;
            if (isVendida(r))    e.vendidas++;
            if (isCancelada(r))  e.canceladas++;
            if (isAtiva(r))      e.ativas++;
            e.reservas.push(r);
            map.set(name, e);
        }
        return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
    });

    // por mês (data_reserva)
    const porMes = computed(() => {
        const map = new Map();
        for (const r of reservas.value) {
            if (!r.data_reserva) continue;
            const d = new Date(r.data_reserva);
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const e = map.get(k) || { mes: k, total: 0, vendidas: 0, canceladas: 0, ativas: 0 };
            e.total++;
            if (isVendida(r))    e.vendidas++;
            if (isCancelada(r))  e.canceladas++;
            if (isAtiva(r))      e.ativas++;
            map.set(k, e);
        }
        return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
    });

    return {
        // state
        reservas, count, periodo, error, filtros,
        // options
        empreendimentosOptions, situacoesOptions, statusRepasseOptions,
        imobiliariasOptions, corretoresOptions, empresasCorrespondentesOptions,
        tipoVendaOptions, leadOrigensOptions,
        // getters
        kpiPorSituacao, kpiSituacoes, situationsList,
        tempoMedioReservaDias, tempoMedioFinalizar,
        outcomeBreakdown, taxaConversao, bucketCounts,
        porEmpreendimento, porMes,
        // helpers
        isVendida, isCancelada, isAtiva, isEmRepasse,
        // actions
        fetchReservas,
    };
});
