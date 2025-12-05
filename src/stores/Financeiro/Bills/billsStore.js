// src/stores/Marketing/Bills/billsStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import dayjs from 'dayjs';
import API_URL from '@/config/apiUrl';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useAdminMetaStore } from '@/stores/Settings/Admin/metaStore';

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

    // 🔴 Tratamento específico de 401 (igual outras stores)
    if (res.status === 401) {
        localStorage.removeItem('token');
        throw new Error(data?.error || 'Sessão expirada. Faça login novamente.');
    }

    if (!res.ok) {
        throw new Error(data?.error || 'Erro na requisição');
    }

    return data;
}

export const useBillsStore = defineStore('bills', () => {
    const carregamento = useCarregamentoStore();
    const contractsStore = useContractsStore();
    const adminMeta = useAdminMetaStore();
    // datas padrão: 15 dias antes / depois de hoje
    const today = dayjs();
    const costCenterIds = ref([]); // ex.: [80001, 80002]
    const startDate = ref(
        today
            .date(15)          // Define o dia para 15
            .subtract(1, 'month') // Volta um mês
            .format('YYYY-MM-DD') // 2025-10-15
    );
    const endDate = ref(today.add(15, 'day').format('YYYY-MM-DD'));
    const month = ref(today.format('YYYY-MM')); // mês de competência

    // dados
    const bills = ref([]);           // todos os títulos carregados
    const error = ref(null);
    const selectedIds = ref([]);     // ids selecionados
    const notes = ref({});           // { [billId]: string }
    const expenseDepartments = ref({}); // { [billId]: string } -> departamento que será usado na custa
    const expenseCategories = ref({});       // 👈 NOVO { [billId]: categoryId }
    const billLinks = ref({}); // { [billId]: { count, total } }

    // 🔄 filtro de departamento AGORA MULTI
    const selectedDepartments = ref([]); // ex.: ['Marketing', 'Comercial']

    const departmentsOptions = computed(() => {
        const set = new Set();
        for (const b of bills.value) {
            if (b.main_department_name) set.add(b.main_department_name);
        }
        return Array.from(set).sort();
    });

    const isLoading = computed(() => carregamento.carregando);

    // 🔎 aplica filtro multi de departamentos (vazio = todos)
    const visibleBills = computed(() => {
        if (!selectedDepartments.value.length) return bills.value;

        const selectedSet = new Set(
            selectedDepartments.value.map(d => (d || '').toLowerCase())
        );

        return bills.value.filter(b =>
            selectedSet.has((b.main_department_name || '').toLowerCase())
        );
    });

    const selectedBills = computed(() =>
        bills.value.filter(b => selectedIds.value.includes(b.id))
    );

    const selectedCount = computed(() => selectedIds.value.length);

    const selectedTotal = computed(() =>
        selectedBills.value.reduce(
            (sum, b) => sum + Number(b.total_invoice_amount || 0),
            0
        )
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

        if (!getToken()) {
            error.value = 'Sessão expirada. Faça login novamente.';
            return;
        }

        if (!costCenterIds.value.length || !startDate.value || !endDate.value) {
            error.value = 'Informe ao menos um centro de custo, data inicial e final.';
            return;
        }

        try {
            carregamento.iniciarCarregamento();

            const params = new URLSearchParams({
                costCenterId: costCenterIds.value.join(','), // 👈 backend aceita múltiplos
                startDate: startDate.value,
                endDate: endDate.value,
            });

            const data = await requestWithAuth(
                `${API_URL}/sienge/bills?${params.toString()}`
            );

            bills.value = data || [];
            selectedIds.value = [];
            notes.value = {};
            expenseDepartments.value = {};
            billLinks.value = {};

            for (const b of bills.value) {
                if (b.main_department_name) {
                    expenseDepartments.value[b.id] = b.main_department_name;
                }
            }

            if (bills.value.length) {
                const idsParam = bills.value.map(b => b.id).join(',');
                try {
                    const links = await requestWithAuth(
                        `${API_URL}/expenses/links?billIds=${idsParam}`
                    );
                    const map = {};
                    for (const l of links) {
                        map[l.billId] = l;
                    }
                    billLinks.value = map;
                } catch (err) {
                    console.error('Erro ao buscar vínculos de custas', err);
                }
            }
        } catch (e) {
            console.error(e);
            error.value = e.message;
        } finally {
            carregamento.finalizarCarregamento();
        }
    }

    async function linkSelectedToMonth() {
        error.value = null;

        if (!getToken()) {
            error.value = 'Sessão expirada. Faça login novamente.';
            return;
        }

        if (!month.value) {
            error.value = 'Informe o mês de competência.';
            return;
        }
        if (!selectedIds.value.length) {
            error.value = 'Selecione ao menos um título.';
            return;
        }

        const competenceMonth = month.value;
        const startMonth = dayjs(`${competenceMonth}-01`);

        try {
            carregamento.iniciarCarregamento();

            // 🔹 Garantir que temos a lista de empreendimentos carregada
            if (!contractsStore.enterprises || !contractsStore.enterprises.length) {
                try {
                    await contractsStore.fetchEnterprises();
                } catch (e) {
                    console.error('Erro ao carregar empreendimentos para custas:', e);
                }
            }

            // 🔹 Mapa id -> nome de centro de custo
            const enterpriseNameById = new Map(
                (contractsStore.enterprises || []).map(e => [Number(e.id), e.name])
            );

            const promises = [];

            selectedBills.value.forEach(bill => {
                const baseDesc =
                    `${bill.document_identification_id || ''} ${bill.document_number || ''}`.trim()
                    || `Título ${bill.id}`;

                const extra =
                    notes.value && notes.value[bill.id]
                        ? String(notes.value[bill.id]).trim()
                        : '';
                const description = extra ? `${baseDesc} - ${extra}` : baseDesc;

                const installments = Number(bill.installments_number || 1);
                const parts = installments > 0 ? installments : 1;

                const total = Number(bill.total_invoice_amount || 0);

                const totalCents = Math.round(total * 100);
                const basePartCents = Math.floor(totalCents / parts);
                const diffCents = totalCents - basePartCents * parts;

                const chosenDepartmentName =
                    (expenseDepartments.value && expenseDepartments.value[bill.id])
                    || bill.main_department_name
                    || null;
                const chosenDepartmentId = bill.main_department_id || null;
                // 👇 NOVO: categoria
                const chosenCategoryId =
                    expenseCategories.value && expenseCategories.value[bill.id]
                        ? Number(expenseCategories.value[bill.id])
                        : null;

                let chosenCategoryName = null;
                if (chosenCategoryId && adminMeta.departmentCategories?.length) {
                    const cat = adminMeta.departmentCategories.find(c => c.id === chosenCategoryId);
                    if (cat) chosenCategoryName = cat.name;
                }
                // 👇 Cost center por título
                const billCostCenterId = Number(bill.cost_center_id || 0);
                const billCostCenterName = enterpriseNameById.get(billCostCenterId) || null;

                for (let i = 0; i < parts; i++) {
                    const thisPartCents = basePartCents + (i === parts - 1 ? diffCents : 0);
                    const amount = thisPartCents / 100;

                    const expMonth = startMonth.add(i, 'month').format('YYYY-MM');

                    const payload = {
                        costCenterId: billCostCenterId,
                        costCenterName: billCostCenterName,
                        month: expMonth,
                        billId: bill.id,
                        amount,
                        description,
                        departmentId: chosenDepartmentId,
                        departmentName: chosenDepartmentName,
                        departmentCategoryId: chosenCategoryId,
                        departmentCategoryName: chosenCategoryName,
                    };

                    promises.push(
                        requestWithAuth(`${API_URL}/expenses`, {
                            method: 'POST',
                            body: JSON.stringify(payload),
                        })
                    );
                }
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
        costCenterIds,
        startDate,
        endDate,
        month,
        bills,
        error,
        selectedIds,
        notes,
        selectedDepartments,
        expenseDepartments,
        expenseCategories,
        billLinks,

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