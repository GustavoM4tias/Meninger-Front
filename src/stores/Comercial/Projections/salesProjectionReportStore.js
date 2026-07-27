import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

export const useSalesProjectionReportStore = defineStore('salesProjectionReport', () => {
    const carregamento = useCarregamentoStore();

    const report  = ref(null);
    const error   = ref(null);
    const loading = ref(false);

    // Lista de projeções disponíveis para o seletor
    const projectionsList = ref([]);

    // Lista de empreendimentos disponíveis (igual ao contractsStore — carregado independente do report)
    const enterprisesList = ref([]);

    // ── VGV mode (idêntico ao contractsStore) ────────────────────────────────
    const valueMode = ref('net'); // 'net' | 'gross'

    // ── Workflow groups (idêntico ao contractsStore) ──────────────────────────
    const workflowGroups   = ref([]);
    const selectedGroupIds = ref([]);
    const _projCache       = ref(new Map());

    // ── Filtros ativos (mesma estrutura do contractsStore.filters) ────────────
    const filters = ref({
        startDate:      '',
        endDate:        '',
        situation:      'Emitido',
        enterpriseName: [],
        companyIds:     [],
        enterpriseIds:  [],
    });

    // ── Getters básicos ───────────────────────────────────────────────────────
    const projection     = computed(() => report.value?.projection    ?? null);
    const summary        = computed(() => report.value?.summary       ?? null);
    const enterprises    = computed(() => report.value?.enterprises   ?? []);
    const reportRange    = computed(() => report.value?.report_range  ?? null);
    const currentMonth   = computed(() => report.value?.current_month ?? null);
    const timeElapsedPct = computed(() => report.value?.time_elapsed_pct ?? 0);
    const currentDay     = computed(() => report.value?.current_day   ?? null);
    const daysInMonth    = computed(() => report.value?.days_in_current_month ?? null);

    const isGross        = computed(() => valueMode.value === 'gross');
    const valueModeLabel = computed(() => isGross.value ? 'VGV + DC' : 'VGV');

    // ── enterprisesResolved — totais projetados por empreendimento ────────────
    // Este store cuida SÓ das metas. O realizado vem do contractsStore (mesma
    // fonte do Faturamento), para que as duas telas nunca divirjam.
    const enterprisesResolved = computed(() =>
        enterprises.value.map(ent => {
            const months = ent.months ?? [];
            return {
                ...ent,
                months,
                summary: {
                    ...ent.summary,
                    projected_vgv: months.reduce((s, m) => s + (m.projected_vgv ?? 0), 0),
                    projected_units: months.reduce((s, m) => s + (m.projected_units ?? 0), 0),
                },
            };
        })
    );

    // ── workflowGroupOptions ──────────────────────────────────────────────────
    const workflowGroupOptions = computed(() =>
        (workflowGroups.value ?? []).map(g => ({
            label: `${g.tipo === 'reservas' ? 'Reserva' : 'Repasse'} • ${g.nome}`,
            value: String(g.idgroup),
        }))
    );

    // ── Actions ───────────────────────────────────────────────────────────────

    /**
     * fetchReport — aceita os MESMOS parâmetros do Faturamento:
     *   { startDate, endDate, situation, enterpriseName[], companyIds[], enterpriseIds[], projection_id }
     */
    async function fetchReport(params = {}) {
        error.value   = null;
        loading.value = true;
        try {
            carregamento.iniciarCarregamento();

            // Mescla com os filtros do store
            const f = { ...filters.value, ...params };

            const q = new URLSearchParams();
            if (f.startDate)    q.set('startDate',  f.startDate);
            if (f.endDate)      q.set('endDate',    f.endDate);
            if (f.situation)    q.set('situation',  f.situation);
            if (f.projection_id) q.set('projection_id', f.projection_id);

            if (Array.isArray(f.enterpriseName) && f.enterpriseName.length > 0) {
                q.set('enterpriseName', f.enterpriseName.join(','));
            }

            const cids = Array.isArray(f.companyIds)
                ? f.companyIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
                : [];
            if (cids.length > 0) q.set('companyIds', cids.join(','));

            const eids = Array.isArray(f.enterpriseIds)
                ? f.enterpriseIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
                : [];
            if (eids.length > 0) q.set('enterpriseIds', eids.join(','));

            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/projections/report?${q.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`Erro ${res.status} ao carregar relatório.`);
            report.value = await res.json();
        } catch (e) {
            error.value  = e?.message ?? 'Erro ao carregar relatório.';
            report.value = null;
        } finally {
            loading.value = false;
            carregamento.finalizarCarregamento();
        }
    }

    /** setFilters — atualiza filtros e dispara reload (idêntico ao contractsStore) */
    function setFilters(newFilters) {
        filters.value = { ...filters.value, ...newFilters };
    }

    function clearFilters() {
        filters.value = {
            startDate: '', endDate: '', situation: 'Emitido',
            enterpriseName: [], companyIds: [], enterpriseIds: [],
        };
        selectedGroupIds.value = [];
        setValueMode('net');
    }

    /** Busca empreendimentos disponíveis — igual ao contractsStore.
     *  Usa /sienge/contracts/enterprises (já filtrado por cidade no backend
     *  para usuários não-admin). */
    async function fetchEnterprises() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/sienge/contracts/enterprises`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Erro ao buscar empreendimentos');
            const raw = await res.json();
            enterprisesList.value = (raw?.results ?? raw ?? []).map(e => ({ id: e.id, name: e.name }));
        } catch {
            enterprisesList.value = [];
        }
    }

    /** Busca apenas projeções ATIVAS (o sistema garante só 1 ativa por vez).
     *  O Vendas × Projeção sempre opera sobre a projeção ativa — projeções
     *  inativas só aparecem no painel admin de projeções. */
    async function fetchProjectionsList() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_URL}/projections?start_month=1900-01&end_month=2999-12&only_active=true`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok) throw new Error('Erro ao buscar projeções');
            const raw = await res.json();
            projectionsList.value = (raw || []).map(p => ({
                id:        p.id,
                name:      p.name,
                is_active: p.is_active === true || p.is_active === 1 || p.is_active === '1',
                is_locked: p.is_locked === true || p.is_locked === 1 || p.is_locked === '1',
            }));
        } catch {
            projectionsList.value = [];
        }
    }

    /** Carrega grupos de workflow — idêntico ao contractsStore */
    async function fetchWorkflowGroups() {
        try {
            const headers = {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json',
            };
            const [resR, resP] = await Promise.all([
                fetch(`${API_URL}/cv/workflow-grupos?tipo=reservas`, { headers }),
                fetch(`${API_URL}/cv/workflow-grupos?tipo=repasses`, { headers }),
            ]);
            if (!resR.ok || !resP.ok) { workflowGroups.value = []; return; }

            const [dataR, dataP] = await Promise.all([resR.json(), resP.json()]);
            const toArray = d => Array.isArray(d?.results) ? d.results : Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [];
            const raw = [...toArray(dataR), ...toArray(dataP)];

            const norm = g => {
                const id = Number(g?.idgroup ?? g?.id ?? g?.group_id ?? g?.grupo_id);
                const tipoRaw = (g?.tipo ?? g?.type ?? g?.origem ?? '').toString().toLowerCase();
                return {
                    idgroup: Number.isFinite(id) ? id : null,
                    nome:    g?.nome ?? g?.name ?? g?.titulo ?? '',
                    tipo:    tipoRaw.includes('reserva') ? 'reservas' : 'repasses',
                };
            };
            workflowGroups.value = raw.map(norm).filter(g => g.idgroup !== null);
        } catch {
            workflowGroups.value = [];
        }
    }

    function setValueMode(mode) {
        valueMode.value = mode === 'gross' ? 'gross' : 'net';
    }

    function setSelectedGroups(ids) {
        selectedGroupIds.value = Array.isArray(ids) ? ids.map(Number).filter(Number.isFinite) : [];
    }

    function clearReport() {
        report.value = null;
        error.value  = null;
    }

    return {
        // state
        report, error, loading, projectionsList, enterprisesList, filters,
        valueMode, workflowGroups, selectedGroupIds,
        // computed
        projection, summary, enterprises, enterprisesResolved,
        reportRange, currentMonth, timeElapsedPct, currentDay, daysInMonth,
        isGross, valueModeLabel, workflowGroupOptions,
        // actions
        fetchReport, setFilters, clearFilters,
        fetchProjectionsList, fetchWorkflowGroups, fetchEnterprises,
        setValueMode, setSelectedGroups, clearReport,
    };
});
