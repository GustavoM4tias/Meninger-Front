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
    // Período padrão: 1º de janeiro do ano anterior → hoje.
    // Leitura AO VIVO do backup do Sienge (com cache no backend), barata mesmo em janela longa.
    const startDate = ref(today.subtract(1, 'year').startOf('year').format('YYYY-MM-DD'));
    const endDate = ref(today.format('YYYY-MM-DD'));

    const bills = ref([]);
    const error = ref(null);

    // filtro multi de departamento (lado cliente)
    const selectedDepartments = ref([]);

    // busca livre (lado cliente): tipo de lançamento, id do título, credor, status, etc.
    const searchTerm = ref('');

    // ordenação da tabela (lado cliente)
    const sortKey = ref('');           // '' = ordem original do backend
    const sortDir = ref('asc');        // 'asc' | 'desc'

    const isLoading = computed(() => carregamento.carregando);

    const departmentsOptions = computed(() => {
        const set = new Set();
        for (const b of bills.value) {
            if (b.main_department_name) set.add(b.main_department_name);
        }
        return Array.from(set).sort();
    });

    // Normaliza para busca: minúsculo, sem acento.
    const DIACRITICS = /[̀-ͯ]/g;
    function norm(v) {
        return String(v ?? '')
            .toLowerCase()
            .normalize('NFD')
            .replace(DIACRITICS, '');
    }

    function statusLabel(status) {
        switch (status) {
            case 'paid': return 'pago';
            case 'partial': return 'parcial';
            case 'cancelled': return 'cancelado';
            case 'open': return 'em aberto aberto';
            default: return '';
        }
    }

    // Texto pesquisável agregado de um título.
    function searchableText(b) {
        const c = b.creditor_json || {};
        return norm([
            c.tradeName, c.name, c.cnpj,
            b.document_identification_id,   // tipo de lançamento (ALUG, NFE, NFS...)
            b.document_number,
            b.id,                           // número após o "#"
            b.main_department_name,
            b.notes,
            statusLabel(b.current_status),
        ].filter(Boolean).join(' '));
    }

    // Valor de comparação por coluna de ordenação.
    function sortValue(b, key) {
        const c = b.creditor_json || {};
        switch (key) {
            case 'creditor': return norm(c.tradeName || c.name || '');
            case 'document': return norm(`${b.document_identification_id || ''} ${b.document_number || ''}`);
            case 'installments': return Number(b.installments_number || 0);
            case 'amount': return Number(b.total_invoice_amount || 0);
            case 'issue_date': return b.issue_date || '';
            case 'department': return norm(b.main_department_name || '');
            case 'status': return norm(statusLabel(b.current_status));
            default: return '';
        }
    }

    function setSort(key) {
        if (sortKey.value === key) {
            // 3º clique volta para a ordem original
            if (sortDir.value === 'asc') sortDir.value = 'desc';
            else { sortKey.value = ''; sortDir.value = 'asc'; }
        } else {
            sortKey.value = key;
            sortDir.value = 'asc';
        }
    }

    const visibleBills = computed(() => {
        let list = bills.value;

        // filtro por departamento
        if (selectedDepartments.value.length) {
            const sel = new Set(selectedDepartments.value.map(d => (d || '').toLowerCase()));
            list = list.filter(b => sel.has((b.main_department_name || '').toLowerCase()));
        }

        // busca livre (todos os termos precisam bater)
        const q = norm(searchTerm.value).trim();
        if (q) {
            const terms = q.split(/\s+/);
            list = list.filter(b => {
                const text = searchableText(b);
                return terms.every(t => text.includes(t));
            });
        }

        // ordenação
        if (sortKey.value) {
            const dir = sortDir.value === 'desc' ? -1 : 1;
            const key = sortKey.value;
            list = [...list].sort((a, b) => {
                const va = sortValue(a, key);
                const vb = sortValue(b, key);
                if (va < vb) return -1 * dir;
                if (va > vb) return 1 * dir;
                return 0;
            });
        }

        return list;
    });

    // dateRangeWarning preservado para compatibilidade com a tela, mas hoje sempre null —
    // a leitura ao vivo do backup tornou desnecessário limitar o range de consulta.
    const dateRangeWarning = computed(() => null);

    async function fetchBills() {
        error.value = null;

        if (!costCenterIds.value.length || !startDate.value || !endDate.value) {
            error.value = 'Informe ao menos um centro de custo, data inicial e final.';
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
        searchTerm,
        sortKey,
        sortDir,

        // computed
        isLoading,
        visibleBills,
        departmentsOptions,
        dateRangeWarning,

        // actions
        fetchBills,
        setSort,
    };
});
