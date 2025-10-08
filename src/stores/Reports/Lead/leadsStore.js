import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { fetchCarregamento } from '@/utils/Config/fetchCarregamento';

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
    const leads = ref([]);
    const count = ref(0);
    const periodo = ref({ data_inicio: null, data_fim: null });
    const filas = ref([]);
    const error = ref(null);
    const carregando = ref(false);

    // listas persistentes (não dependem do filtro atual)
    const empreendimentosOptions = ref(loadLS(LS.emp));
    const origensOptions = ref(loadLS(LS.org));
    const situacoesOptions = ref(loadLS(LS.sit));
    const midiasOptions = ref(loadLS(LS.mid));
    const imobiliariasOptions = ref(loadLS(LS.imo));
    const corretoresOptions = ref(loadLS(LS.cor));

    // filtros como ARRAYS
    const filtros = ref({
        nome: '',
        email: '',
        telefone: '',
        imobiliaria: [],       // ← array
        corretor: [],        // ← array
        situacao_nome: [],     // ← array
        midia_principal: [],   // ← array
        origem: [],            // ← array
        empreendimento: [],    // ← array
        data_inicio: '',
        data_fim: '',
    });

    const hasFilters = computed(() =>
        Object.entries(filtros.value).some(([k, v]) => {
            if (Array.isArray(v)) return v.length > 0;
            return v && String(v).trim() !== '';
        })
    );

    const buildQuery = () => {
        const q = new URLSearchParams();
        Object.entries(filtros.value).forEach(([k, v]) => {
            if (v === undefined || v === null) return;
            if (Array.isArray(v)) {
                if (v.length) q.append(k, v.join(',')); // CSV
            } else if (String(v).trim() !== '') {
                q.append(k, String(v).trim());
            }
        });
        return q.toString();
    };

    const authHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        };
    };

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
    }

    async function fetchLeads() {
        carregando.value = true;
        error.value = null;
        try {
            const qs = buildQuery();
            // ajuste se seu backend usa '/api/cv/leads' em vez de '/cv/leads'
            const url = `${API_URL}/cv/leads${qs ? `?${qs}` : ''}`;

            const resp = await fetchCarregamento(url, { method: 'GET', headers: authHeaders() });
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
            carregando.value = false;
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

    // KPIs leves
    const kpiPorSituacao = computed(() => {
        const map = {};
        for (const l of leads.value) {
            const key = l.situacao_nome || 'Sem Situação';
            map[key] = (map[key] || 0) + 1;
        }
        return map;
    });
    const kpiTotais = computed(() => ({
        total: count.value || leads.value.length || 0,
        aguardando: kpiPorSituacao.value['Aguardando Atendimento Corretor'] || 0,
        atendimento: kpiPorSituacao.value['Em Atendimento'] || 0,
        qualificados: (kpiPorSituacao.value['Lead Qualificado'] || 0) + (kpiPorSituacao.value['Em Negociação'] || 0),
        descartados: kpiPorSituacao.value['Descartado'] || 0,
        analise: kpiPorSituacao.value['Em Análise de Crédito'] || 0,
        reserva: kpiPorSituacao.value['Com Reserva'] || 0,
        venda: kpiPorSituacao.value['Venda Realizada'] || 0,
    }));

    return {
        // state
        leads, count, periodo, filas, error, carregando, filtros,
        // options
        empreendimentosOptions, origensOptions, situacoesOptions, midiasOptions, imobiliariasOptions, corretoresOptions,
        // getters
        hasFilters, kpiPorSituacao, kpiTotais,
        // actions
        fetchLeads, fetchFilas,
    };
});
