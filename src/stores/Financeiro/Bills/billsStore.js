// src/stores/Financeiro/Bills/billsStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import dayjs from 'dayjs';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

export const useBillsStore = defineStore('bills', () => {
    const carregamento = useCarregamentoStore();

    const today = dayjs();
    const costCenterIds = ref([]);
    const startDate = ref(today.subtract(1, 'month').date(15).format('YYYY-MM-DD'));
    const endDate = ref(today.format('YYYY-MM-DD'));

    const bills = ref([]);
    const error = ref(null);

    // filtro multi de departamento (lado cliente)
    const selectedDepartments = ref([]);

    const isLoading = computed(() => carregamento.carregando);

    const departmentsOptions = computed(() => {
        const set = new Set();
        for (const b of bills.value) {
            if (b.main_department_name) set.add(b.main_department_name);
        }
        return Array.from(set).sort();
    });

    const visibleBills = computed(() => {
        if (!selectedDepartments.value.length) return bills.value;
        const sel = new Set(selectedDepartments.value.map(d => (d || '').toLowerCase()));
        return bills.value.filter(b => sel.has((b.main_department_name || '').toLowerCase()));
    });

    const MAX_MONTHS = 6;

    const dateRangeWarning = computed(() => {
        if (!startDate.value || !endDate.value) return null;
        const s = new Date(startDate.value);
        const e = new Date(endDate.value);
        const diff = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
        if (diff > MAX_MONTHS) return `Período máximo é ${MAX_MONTHS} meses. Ajuste as datas.`;
        return null;
    });

    async function fetchBills() {
        error.value = null;

        if (!costCenterIds.value.length || !startDate.value || !endDate.value) {
            error.value = 'Informe ao menos um centro de custo, data inicial e final.';
            return;
        }

        if (dateRangeWarning.value) {
            error.value = dateRangeWarning.value;
            return;
        }

        try {
            carregamento.iniciarCarregamento();

            const params = new URLSearchParams({
                costCenterId: costCenterIds.value.join(','),
                startDate: startDate.value,
                endDate: endDate.value,
            });

            const data = await requestWithAuth(`${API_URL}/sienge/bills?${params.toString()}`);
            bills.value = data || [];
        } catch (e) {
            console.error(e);
            error.value = e.message;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    return {
        // state
        costCenterIds,
        startDate,
        endDate,
        bills,
        error,
        selectedDepartments,

        // computed
        isLoading,
        visibleBills,
        departmentsOptions,
        dateRangeWarning,

        // actions
        fetchBills,
    };
});
