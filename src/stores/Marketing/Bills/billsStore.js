// src/stores/Marketing/Bills/billsStore.js
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
    if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Erro na requisição');
    }
    return res.json();
}

export const useMktBillsStore = defineStore('mktBills', () => {
    const carregamento = useCarregamentoStore();

    // datas padrão: 15 dias antes / depois de hoje
    const today = dayjs();
    const costCenterId = ref('');
    const startDate = ref(
        today.date(15) // Define o dia para 15
            .subtract(1, 'month') // Volta um mês
            .format('YYYY-MM-DD') // 2025-10-15
    ); const endDate = ref(today.add(15, 'day').format('YYYY-MM-DD'));
    const month = ref(today.format('YYYY-MM')); // mês de competência

    // dados
    const bills = ref([]);           // todos os títulos carregados
    const error = ref(null);
    const selectedIds = ref([]);     // ids selecionados
    const notes = ref({});           // { [billId]: string } observação extra

    // filtro de departamento
    const selectedDepartment = ref('Marketing'); // padrão
    const departmentsOptions = computed(() => {
        const set = new Set();
        for (const b of bills.value) {
            if (b.main_department_name) set.add(b.main_department_name);
        }
        return Array.from(set).sort();
    });

    const isLoading = computed(() => carregamento.carregando);

    // Bills visíveis considerando filtro de departamento
    const visibleBills = computed(() => {
        if (!selectedDepartment.value || selectedDepartment.value === 'Todos') {
            return bills.value;
        }
        return bills.value.filter(
            b => (b.main_department_name || '').toLowerCase() === selectedDepartment.value.toLowerCase()
        );
    });

    const selectedBills = computed(() =>
        bills.value.filter(b => selectedIds.value.includes(b.id))
    );

    const selectedCount = computed(() => selectedIds.value.length);

    const selectedTotal = computed(() =>
        selectedBills.value.reduce((sum, b) => sum + Number(b.total_invoice_amount || 0), 0)
    );

    function toggleSelect(id) {
        if (selectedIds.value.includes(id)) {
            selectedIds.value = selectedIds.value.filter(x => x !== id);
        } else {
            selectedIds.value = [...selectedIds.value, id];
        }
    }

    function selectAllCurrentPage() {
        selectedIds.value = visibleBills.value.map(b => b.id);
    }

    function clearSelection() {
        selectedIds.value = [];
    }

    async function fetchBills() {
        error.value = null;
        if (!costCenterId.value || !startDate.value || !endDate.value) {
            error.value = 'Informe centro de custo, data inicial e final.';
            return;
        }

        try {
            carregamento.iniciarCarregamento();

            const params = new URLSearchParams({
                costCenterId: String(costCenterId.value),
                startDate: startDate.value,
                endDate: endDate.value,
            });

            const data = await requestWithAuth(`${API_URL}/sienge/bills?${params.toString()}`);
            bills.value = data || [];
            selectedIds.value = [];
            // se o filtro "Marketing" não existir, cai para "Todos"
            if (
                selectedDepartment.value &&
                selectedDepartment.value !== 'Todos' &&
                !departmentsOptions.value.includes(selectedDepartment.value)
            ) {
                selectedDepartment.value = 'Todos';
            }
        } catch (e) {
            console.error(e);
            error.value = e.message;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    /**
     * Vincula os títulos selecionados ao mês de competência, criando registros em /api/mkt/expenses
     * - costCenterId: do filtro
     * - month: YYYY-MM
     * - amount: total_invoice_amount (MVP)
     * - description: base do documento + observação extra (se houver)
     */
    async function linkSelectedToMonth() {
        error.value = null;
        if (!costCenterId.value || !month.value) {
            error.value = 'Informe centro de custo e mês de competência.';
            return;
        }
        if (!selectedIds.value.length) {
            error.value = 'Selecione ao menos um título.';
            return;
        }

        const competenceMonth = month.value; // YYYY-MM
        try {
            carregamento.iniciarCarregamento();

            const promises = selectedBills.value.map(bill => {
                const baseDesc =
                    `${bill.document_identification_id || ''} ${bill.document_number || ''}`.trim() ||
                    `Título ${bill.id}`;

                const extra = (notes.value && notes.value[bill.id]) ? String(notes.value[bill.id]).trim() : '';
                const description = extra ? `${baseDesc} - ${extra}` : baseDesc;

                const payload = {
                    costCenterId: Number(costCenterId.value),
                    month: competenceMonth,
                    billId: bill.id,
                    amount: Number(bill.total_invoice_amount || 0),
                    description,
                };

                return requestWithAuth(`${API_URL}/mkt/expenses`, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            });

            await Promise.all(promises);
        } catch (e) {
            console.error(e);
            error.value = e.message;
            throw e;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    return {
        // state
        costCenterId,
        startDate,
        endDate,
        month,
        bills,
        error,
        selectedIds,
        notes,
        selectedDepartment,

        // computed
        isLoading,
        visibleBills,
        departmentsOptions,
        selectedBills,
        selectedCount,
        selectedTotal,

        // actions
        fetchBills,
        toggleSelect,
        selectAllCurrentPage,
        clearSelection,
        linkSelectedToMonth,
    };
});
