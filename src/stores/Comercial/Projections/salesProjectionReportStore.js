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

    // ── enterprisesResolved — aplica valueMode ────────────────────────────────
    const enterprisesResolved = computed(() => {
        return enterprises.value.map(ent => {
            const months = (ent.months ?? []).map(m => {
                const realized_vgv = isGross.value
                    ? (m.realized_vgv_gross ?? m.realized_vgv ?? 0)
                    : (m.realized_vgv_net   ?? m.realized_vgv ?? 0);
                const achievement_pct = (m.projected_vgv ?? 0) > 0
                    ? parseFloat(((realized_vgv / m.projected_vgv) * 100).toFixed(2))
                    : 0;
                return { ...m, realized_vgv, achievement_pct };
            });

            const totalProjectedVgv   = months.reduce((s, m) => s + (m.projected_vgv   ?? 0), 0);
            const totalRealizedVgv    = months.reduce((s, m) => s + (m.realized_vgv     ?? 0), 0);
            const totalRealizedUnits  = months.reduce((s, m) => s + (m.realized_units   ?? 0), 0);
            const totalProjectedUnits = months.reduce((s, m) => s + (m.projected_units  ?? 0), 0);

            const achievement_pct = totalProjectedVgv > 0
                ? parseFloat(((totalRealizedVgv / totalProjectedVgv) * 100).toFixed(2))
                : 0;

            const performance_ratio = (timeElapsedPct.value > 0 && totalProjectedVgv > 0)
                ? parseFloat((achievement_pct / timeElapsedPct.value).toFixed(4))
                : null;

            let status;
            if (totalProjectedVgv === 0)      status = 'no_projection';
            else if (totalRealizedVgv === 0)  status = 'no_sales';
            else if (performance_ratio === null) status = 'on_track';
            else if (performance_ratio >= 1.1) status = 'ahead';
            else if (performance_ratio >= 0.8) status = 'on_track';
            else if (performance_ratio >= 0.4) status = 'behind';
            else                               status = 'at_risk';

            return {
                ...ent,
                months,
                summary: {
                    ...ent.summary,
                    realized_vgv:    totalRealizedVgv,
                    projected_vgv:   totalProjectedVgv,
                    realized_units:  totalRealizedUnits,
                    projected_units: totalProjectedUnits,
                    achievement_pct,
                    performance_ratio,
                    status,
                },
            };
        });
    });

    /** Temperatura geral — VGV-based */
    const overallTemperature = computed(() => {
        const s = summary.value;
        if (!s || s.projected_vgv === 0) return 'neutral';
        const elapsed = report.value?.time_elapsed_pct ?? 0;
        const ach = s.achievement_pct;
        if (elapsed === 0) return ach > 0 ? 'ahead' : 'neutral';
        const ratio = ach / elapsed;
        if (ratio >= 1.1) return 'ahead';
        if (ratio >= 0.8) return 'on_track';
        if (ratio >= 0.4) return 'behind';
        return 'at_risk';
    });

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
     *   { startDate, endDate, situation, enterpriseName[], projection_id }
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
        filters.value = { startDate: '', endDate: '', situation: 'Emitido', enterpriseName: [] };
        selectedGroupIds.value = [];
        setValueMode('net');
    }

    /** Busca empreendimentos disponíveis — igual ao contractsStore */
    async function fetchEnterprises() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/sienge/enterprises`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Erro ao buscar empreendimentos');
            const raw = await res.json();
            enterprisesList.value = (raw?.results ?? raw ?? []).map(e => ({ id: e.id, name: e.name }));
        } catch {
            enterprisesList.value = [];
        }
    }

    /** Busca a lista de projeções disponíveis */
    async function fetchProjectionsList() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(
                `${API_URL}/projections?start_month=1900-01&end_month=2999-12`,
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
        overallTemperature, isGross, valueModeLabel, workflowGroupOptions,
        // actions
        fetchReport, setFilters, clearFilters,
        fetchProjectionsList, fetchWorkflowGroups, fetchEnterprises,
        setValueMode, setSelectedGroups, clearReport,
    };
});
