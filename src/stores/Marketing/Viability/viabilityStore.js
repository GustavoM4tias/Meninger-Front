// src/stores/Marketing/Viability/viabilityStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import dayjs from 'dayjs';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';

function getToken() {
    return localStorage.getItem('token');
}

async function requestWithAuth(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const isForm = options.body instanceof FormData;
    if (!isForm && !headers.has('Content-Type') && options.method && options.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data?.error || 'Erro na requisição');
    }
    return data;
}

export const useViabilityStore = defineStore('marketingViability', () => {
    const carregamento = useCarregamentoStore();

    const currentYear = dayjs().year();
    const currentMonth = dayjs().format('YYYY-MM');

    // ===== STATE =====
    const selectedYear = ref(currentYear);
    const selectedAliasId = ref(null);
    const selectedMonth = ref(currentMonth); // YYYY-MM

    const list = ref([]); // [{ erpId, enterpriseName, header }]
    const error = ref(null);

    const search = ref('');
    const statusFilter = ref('all'); // all | UNDER | ON_TRACK | OVER

    // ===== YEAR OPTIONS =====
    const yearOptions = computed(() => {
        const years = [];
        const span = 50;
        for (let y = currentYear - span; y <= currentYear + span; y++) {
            years.push(y);
        }
        return years;
    });

    // ===== MONTH OPTIONS =====
    const monthOptions = computed(() => {
        const y = Number(selectedYear.value) || currentYear;
        return Array.from({ length: 12 }, (_, i) => {
            const ym = `${y}-${String(i + 1).padStart(2, '0')}`;
            return {
                value: ym,
                label: dayjs(`${ym}-01`).format('MMM/YYYY')
            };
        });
    });

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
            const monthSpent = Number(
                rawMonthCtx.monthSpent ?? rawMonthCtx.spentMonth ?? 0
            );
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
                    monthContext: {
                        ...rawMonthCtx,
                        monthBudget,
                        monthSpent,
                        monthRemaining
                    }
                }
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
            if (statusSel !== 'all') {
                matchesStatus = item.status === statusSel;
            }

            return matchesTerm && matchesStatus;
        });
    });

    // ===== Ordenação (maior orçamento do mês primeiro) =====
    const sorted = computed(() => {
        return [...filtered.value].sort((a, b) => {
            const aBudget = Number(a.header?.monthContext?.monthBudget || 0);
            const bBudget = Number(b.header?.monthContext?.monthBudget || 0);
            return bBudget - aBudget;
        });
    });

    // ===== Totais agregados (VISÃO MENSAL + GLOBAL ANUAL) =====
    const totals = computed(() => {
        let monthBudget = 0;
        let monthSpent = 0;
        let monthRemaining = 0;

        let monthUnitsTarget = 0;
        let soldUnitsMonth = 0;

        // Estoque para viabilidade e detalhamento
        let availableInventory = 0;
        let availableUnits = 0;
        let reservedUnits = 0;
        let blockedUnits = 0;
        let soldUnitsStock = 0;

        // Visão global anual
        let budgetTotal = 0;
        let spentTotal = 0;
        let remainingBudgetTotal = 0;

        let unitsTargetTotal = 0;
        let soldUnitsYear = 0;
        let remainingUnitsYear = 0;

        normalizedItems.value.forEach(item => {
            const h = item.header || {};
            const ctx = h.monthContext || {};

            // visão mensal
            monthBudget += Number(ctx.monthBudget || 0);
            monthSpent += Number(ctx.monthSpent || 0);
            monthRemaining += Number(ctx.monthRemaining || 0);

            monthUnitsTarget += Number(ctx.unitsTargetMonth || 0);
            soldUnitsMonth += Number(ctx.unitsSoldRealMonth || 0);

            // estoque (snapshot)
            availableInventory += Number(h.availableInventory || 0);
            availableUnits += Number(h.availableUnits || 0);
            reservedUnits += Number(h.reservedUnits || 0);
            blockedUnits += Number(h.blockedUnits || 0);
            // usa soldUnitsStock do backend; se não vier, cai em soldUnits
            soldUnitsStock += Number(
                h.soldUnitsStock ?? h.soldUnits ?? 0
            );

            // visão global anual
            budgetTotal += Number(h.budgetTotal || 0);
            spentTotal += Number(h.spentTotal || 0);
            remainingBudgetTotal += Number(h.remainingBudgetTotal || 0);

            unitsTargetTotal += Number(h.unitsTargetTotal || 0);
            soldUnitsYear += Number(h.soldUnitsRealYtd || 0);
            remainingUnitsYear += Number(h.remainingUnitsPlan || 0);
        });

        const monthSpentPct = monthBudget > 0 ? (monthSpent / monthBudget) * 100 : 0;
        const yearSpentPct = budgetTotal > 0 ? (spentTotal / budgetTotal) * 100 : 0;

        return {
            // visão mensal
            monthBudget,
            monthSpent,
            monthRemaining,
            monthSpentPct,

            monthUnitsTarget,
            soldUnitsMonth,

            // estoque (snapshot)
            availableInventory,
            availableUnits,
            reservedUnits,
            blockedUnits,
            soldUnitsStock,

            // visão global anual
            budgetTotal,
            spentTotal,
            remainingBudgetTotal,
            unitsTargetTotal,
            soldUnitsYear,
            remainingUnitsYear,
            yearSpentPct
        };
    });

    // ===== ACTIONS =====
    function setYear(year) {
        selectedYear.value = Number(year);
        // se o ano mudar e o mês não pertence a ele, ajusta o mês
        if (selectedMonth.value && !String(selectedMonth.value).startsWith(String(year))) {
            const mm = dayjs().format('MM');
            selectedMonth.value = `${year}-${mm}`;
        }
    }

    function setAlias(alias) {
        selectedAliasId.value = alias || 'default';
    }

    function setSearch(v) {
        search.value = v;
    }

    function setStatusFilter(v) {
        statusFilter.value = v || 'all';
    }

    function setMonth(ym) {
        selectedMonth.value = ym || '';
    }

    async function fetchList() {
        error.value = null;

        const year = Number(selectedYear.value);
        if (!year || year < 2000) {
            error.value = 'Ano inválido.';
            console.warn('[ViabilityStore] fetchList: ano inválido', { year });
            return;
        }

        try {
            carregamento.iniciarCarregamento();

            const params = new URLSearchParams();
            params.set('year', String(year));
            if (selectedMonth.value) params.set('month', selectedMonth.value);

            const url = `${API_URL}/viability/enterprises?${params.toString()}`;
            console.log('[ViabilityStore] fetchList: GET', {
                url,
                year,
                aliasId: selectedAliasId.value,
                month: selectedMonth.value || null
            });

            const res = await requestWithAuth(url);

            console.log('[ViabilityStore] fetchList: resposta', {
                year,
                aliasId: selectedAliasId.value,
                month: res?.upToMonth || null,
                projectionId: res?.projectionId,
                count: res?.count,
                sample: (res?.results || []).slice(0, 3)
            });

            list.value = res?.results || [];
        } catch (e) {
            console.error('[ViabilityStore] fetchList: erro', e);
            error.value = e.message || 'Erro ao carregar viabilidade.';
            list.value = [];
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    return {
        // state
        selectedYear,
        selectedAliasId,
        selectedMonth,
        list,
        error,
        search,
        statusFilter,

        // computed
        isLoading,
        yearOptions,
        monthOptions,
        items: normalizedItems,
        filtered,
        sorted,
        totals,

        // actions
        setYear,
        setAlias,
        setSearch,
        setStatusFilter,
        setMonth,
        fetchList
    };
});
