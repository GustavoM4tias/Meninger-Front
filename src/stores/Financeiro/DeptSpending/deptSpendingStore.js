// src/stores/Financeiro/DeptSpending/deptSpendingStore.js
//
// Store da tela "Gastos por Departamento" (reestruturação da Viabilidade).
// A diretoria (não-admin) recebe do backend só os empreendimentos LIBERADOS;
// o admin recebe tudo (rascunho + liberado) e vê o flag `released` por item.
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import dayjs from 'dayjs';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useDeptSpendingStore = defineStore('marketingDeptSpending', () => {
    const carregamento = useCarregamentoStore();

    const currentYear = dayjs().year();
    const currentMonth = dayjs().format('YYYY-MM');

    // ===== STATE =====
    const selectedYear = ref(currentYear);
    const selectedAliasId = ref(null);
    const selectedMonth = ref(currentMonth); // YYYY-MM

    const list = ref([]); // [{ companyId, erpId, enterpriseName, released, header, months }]
    const error = ref(null);
    const isAdminView = ref(false); // veio do backend: usuário é admin (vê rascunhos)

    // Relatório Gerencial de Investimento (1 empreendimento)
    const report = ref(null);
    const reportError = ref(null);
    const reportLoading = ref(false);

    const search = ref('');
    const statusFilter = ref('all'); // all | UNDER | ON_TRACK | OVER

    const isLoading = computed(() => carregamento.carregando);

    // ===== Normaliza header por item (STATUS e % baseados no MÊS) =====
    const normalizedItems = computed(() =>
        (list.value || []).map(item => {
            const h = item.header || {};
            const rawMonthCtx = h.monthContext || {};

            const monthBudget = Number(
                rawMonthCtx.monthBudget ??
                rawMonthCtx.adjustedBudgetMonth ??
                rawMonthCtx.plannedBudgetMonth ??
                0
            );
            const monthSpent = Number(rawMonthCtx.monthSpent ?? rawMonthCtx.spentMonth ?? 0);
            const monthRemaining = monthBudget - monthSpent;

            const diff = monthSpent - monthBudget;
            let status = 'ON_TRACK';
            if (diff > 0) status = 'OVER';
            if (diff < 0) status = 'UNDER';

            const spentPct = monthBudget > 0 ? (monthSpent / monthBudget) * 100 : 0;

            return {
                ...item,
                status,
                diff,
                spentPct,
                header: {
                    ...h,
                    monthContext: { ...rawMonthCtx, monthBudget, monthSpent, monthRemaining },
                },
            };
        })
    );

    // ===== Filtros =====
    const filtered = computed(() => {
        const term = (search.value || '').toLowerCase().trim();
        const statusSel = statusFilter.value;
        return normalizedItems.value.filter(item => {
            const name = (item.enterpriseName || '').toLowerCase();
            const erp = String(item.erpId || '').toLowerCase();
            const matchesTerm = !term || name.includes(term) || erp.includes(term);
            let matchesStatus = true;
            if (statusSel !== 'all') matchesStatus = item.status === statusSel;
            return matchesTerm && matchesStatus;
        });
    });

    // ===== Ordenação (maior orçamento do mês primeiro) =====
    const sorted = computed(() =>
        [...filtered.value].sort((a, b) => {
            const aBudget = Number(a.header?.monthContext?.monthBudget || 0);
            const bBudget = Number(b.header?.monthContext?.monthBudget || 0);
            return bBudget - aBudget;
        })
    );

    // ===== ACTIONS =====
    function setYear(year) {
        selectedYear.value = Number(year);
        if (selectedMonth.value && !String(selectedMonth.value).startsWith(String(year))) {
            const mm = dayjs().format('MM');
            selectedMonth.value = `${year}-${mm}`;
        }
    }
    function setAlias(alias) { selectedAliasId.value = alias || 'default'; }
    function setSearch(v) { search.value = v; }
    function setStatusFilter(v) { statusFilter.value = v || 'all'; }
    function setMonth(ym) { selectedMonth.value = ym || ''; }

    /* companyIds (opcional): filtro server-side — o backend calcula SÓ essas empresas
       (deep link compartilhável e resposta rápida). */
    async function fetchList(companyIds = null) {
        error.value = null;
        const year = Number(selectedYear.value);
        if (!year || year < 2000) {
            error.value = 'Ano inválido.';
            return;
        }
        try {
            carregamento.iniciarCarregamento();
            const params = new URLSearchParams();
            params.set('year', String(year));
            if (selectedMonth.value) params.set('month', selectedMonth.value);
            const ids = (companyIds || []).map(Number).filter(Number.isFinite);
            if (ids.length) params.set('company_ids', ids.join(','));

            const url = `${API_URL}/dept-spending/enterprises?${params.toString()}`;
            const res = await requestWithAuth(url);

            list.value = res?.results || [];
            isAdminView.value = !!res?.isAdmin;
        } catch (e) {
            console.error('[DeptSpendingStore] fetchList: erro', e);
            error.value = e.message || 'Erro ao carregar gastos por departamento.';
            list.value = [];
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    /* Relatório Gerencial de Investimento de 1 empreendimento (empresa Sienge). */
    async function fetchReport(companyId, month) {
        reportError.value = null;
        reportLoading.value = true;
        try {
            const params = new URLSearchParams();
            if (month) params.set('month', month);
            const url = `${API_URL}/dept-spending/report/${encodeURIComponent(companyId)}?${params.toString()}`;
            report.value = await requestWithAuth(url);
        } catch (e) {
            console.error('[DeptSpendingStore] fetchReport: erro', e);
            reportError.value = e.message || 'Erro ao carregar o relatório.';
            report.value = null;
        } finally {
            reportLoading.value = false;
        }
        return report.value;
    }

    /* Regenerar a "Leitura para decisão" (admin). */
    async function regenerateInsights(companyId, month) {
        const params = new URLSearchParams();
        if (month) params.set('month', month);
        const insights = await requestWithAuth(
            `${API_URL}/dept-spending/admin/report/${encodeURIComponent(companyId)}/insights/regenerate?${params.toString()}`,
            { method: 'POST' }
        );
        if (report.value) report.value = { ...report.value, insights };
        return insights;
    }

    return {
        // state
        selectedYear, selectedAliasId, selectedMonth,
        list, error, isAdminView, search, statusFilter,
        report, reportError, reportLoading,
        // computed
        isLoading, items: normalizedItems, filtered, sorted,
        // actions
        setYear, setAlias, setSearch, setStatusFilter, setMonth, fetchList,
        fetchReport, regenerateInsights,
    };
});
