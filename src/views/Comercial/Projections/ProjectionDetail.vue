<script setup>
import { onMounted, ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import { useProjectionsStore } from '@/stores/Comercial/Projections/projectionsStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import ProjectionLogsDrawer from './components/ProjectionLogsDrawer.vue';
import API_URL from '@/config/apiUrl';
import MultiSelector from '@/components/UI/MultiSelector.vue';

/* ===== Helpers (Auth) ===== */
function getToken() { return localStorage.getItem('token'); }
async function requestWithAuth(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const isForm = options.body instanceof FormData;
    if (!isForm && !headers.has('Content-Type') && options.method && options.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...options, headers });
    const tryJson = async () => res.json().catch(() => ({}));
    if (!res.ok) {
        const j = await tryJson();
        throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
    }
    return tryJson();
}

/* ===== Helpers (IDs / Months) ===== */
function uuid() {
    return (crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
}
function ensureYM(v) {
    const ym = String(v || '').slice(0, 7);
    return /^\d{4}-\d{2}$/.test(ym) ? ym : null;
}
function addMonths(ym, n) {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, (m - 1) + n, 1);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yy}-${mm}`;
}
function buildMonthRange(start, end) {
    const out = [];
    let cur = start;
    while (cur <= end) {
        out.push(cur);
        cur = addMonths(cur, 1);
    }
    return out;
}

/* ===== Dinheiro (pt-BR) ===== */
const nfBR2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfBRCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function moneyBR(v) {
    const n = Number(v);
    return nfBR2.format(Number.isFinite(n) ? n : 0);
}
function moneyBRL(v) {
    const n = Number(v);
    return nfBRCurrency.format(Number.isFinite(n) ? n : 0);
}
function parseMoneyBR(raw) {
    const digits = String(raw ?? '').replace(/\D+/g, '');
    if (!digits) return 0;
    return Number(digits) / 100;
}
function setMaskedInputValue(el, numericValue) {
    if (el) el.value = moneyBR(numericValue);
}

/* ===== Stores & route ===== */
const route = useRoute();
const store = useProjectionsStore();
const auth = useAuthStore();

const id = Number(route.params.id);
const isAdmin = computed(() => auth?.user?.role === 'admin');

/* ===== Intervalo (UI) ===== */
const currentYear = new Date().getFullYear();
const startMonth = ref(`${currentYear}-01`);
const endMonth = ref(`${currentYear}-12`);

const monthLabels = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const monthKeys = computed(() => {
    const s = ensureYM(startMonth.value);
    const e = ensureYM(endMonth.value);
    if (!s || !e || s > e) return [];
    return buildMonthRange(s, e);
});
const monthLabel = (ym) => {
    const [y, m] = String(ym).split('-');
    const idx = Number(m) - 1;
    return `${monthLabels[idx]}/${y}`;
};

/* ===== Estado principal ===== */
const rows = ref([]);
const originalPairs = ref(new Set());

/* ===== Inline edit nome da projeção ===== */
const editingName = ref(false);
const tempName = ref('');

function startEditName() {
    if (!isAdmin.value) return;
    tempName.value = store.detail?.projection?.name || '';
    editingName.value = true;
    nextTick(() => document.getElementById('proj-name-input')?.focus());
}
async function commitName() {
    const current = store.detail?.projection?.name || '';
    const next = (tempName.value || '').trim();
    editingName.value = false;
    if (!next || next === current) return;
    await store.updateMeta(id, { name: next });
    await refreshDetail();
}
function cancelName() { editingName.value = false; }

/* ===== Carregar enterprises (ERP picker) ===== */
const enterprises = ref([]); // [{id,name}]
async function loadEnterprises() {
    const data = await requestWithAuth(`${API_URL}/projections/enterprise-picker`);
    enterprises.value = data.results || data || [];
}

/* =======================================================================
   ✅ ESTADO/FUNÇÕES DO MODAL (estavam faltando no seu snippet atual)
   ======================================================================= */
const showAdd = ref(false);
const pickerMode = ref('add'); // 'add' | 'edit'
const rowBeingEdited = ref(null);

const selectedToAdd = ref([]); // no edit: 1 item; no add: pode múltiplos
const search = ref('');

const manualForm = ref({
    name: '',
    defaultPrice: 0,
    defaultMarketingPct: 0,
    defaultCommissionPct: 0
});

// botão “Lançar sem centro de custo” (só no ADD)
const showManualInAdd = ref(false);

function resetModalState() {
    selectedToAdd.value = [];
    search.value = '';
    rowBeingEdited.value = null;
    pickerMode.value = 'add';
    manualForm.value = { name: '', defaultPrice: 0, defaultMarketingPct: 0, defaultCommissionPct: 0 };
    showManualInAdd.value = false;
}

function openAddModal() {
    if (rowDisabled.value) return;
    pickerMode.value = 'add';
    rowBeingEdited.value = null;
    selectedToAdd.value = [];
    search.value = '';
    manualForm.value = { name: '', defaultPrice: 0, defaultMarketingPct: 0, defaultCommissionPct: 0 };
    showManualInAdd.value = false;
    showAdd.value = true;

    // opcional: garante lista carregada para já aparecer
    if (!enterprises.value.length) loadEnterprises();
}

async function openEditEnterpriseModal(row) {
    if (rowDisabled.value) return;
    pickerMode.value = 'edit';
    rowBeingEdited.value = row;
    selectedToAdd.value = [];
    search.value = '';
    showManualInAdd.value = false;
    showAdd.value = true;

    if (!enterprises.value.length) await loadEnterprises();

    // preseleciona o ERP atual do row (se existir)
    if (row?.erp_id) {
        const current = enterprises.value.find(e => String(e.id) === String(row.erp_id));
        if (current) selectedToAdd.value = [current];
    }
}

/* ===== Dedup / chave ===== */
const keyOf = (r, idx) => `${String(r.enterprise_key)}|${String(r.alias_id || 'default')}|${idx}`;
const rowDisabled = computed(() => !!(store.detail?.projection?.is_locked) || !isAdmin.value);

function shallowCloneRow(r) {
    const out = {
        enterprise_key: `MAN:${uuid()}`,
        erp_id: null,
        alias_id: uuid(),
        name: (r.name || 'Empreendimento') + ' (cópia)',
        defaultPrice: Number(r.defaultPrice || 0),
        defaultMarketingPct: Number(r.defaultMarketingPct || 0),
        defaultCommissionPct: Number(r.defaultCommissionPct || 0),
        values: {}
    };
    for (const [k, v] of Object.entries(r.values || {})) {
        out.values[k] = {
            units: Number(v.units || 0),
            price: Number(v.price || 0),
            total: Number(v.total || 0),
            total_manual: !!v.total_manual,
            marketing_pct: Number(v.marketing_pct || 0),
            commission_pct: Number(v.commission_pct || 0),
        };
    }
    return out;
}
function duplicateRow(row) { rows.value.push(shallowCloneRow(row)); }
function removeRow(row) {
    rows.value = rows.value.filter(r => !(r.enterprise_key === row.enterprise_key && r.alias_id === row.alias_id));
}

/* ===== Edição inline (nome / ticket padrão) ===== */
const edit = ref({});

function startEdit(r, field, idx) {
    if (rowDisabled.value) return;
    const k = keyOf(r, idx);
    edit.value[k] ??= {};
    edit.value[k][field] = true;
    nextTick(() => {
        const el = document.getElementById(`in-${field}-${k}`);
        el?.focus();
        if (field === 'name') el?.select();
    });
}
function stopEdit(r, field, idx) {
    const k = keyOf(r, idx);
    if (edit.value[k]) edit.value[k][field] = false;
}
function isEditing(r, field, idx) {
    const k = keyOf(r, idx);
    return !!(edit.value[k]?.[field]);
}

/* ===== Célula + VGV (auto/manual) ===== */
function ensureCell(row, ym) {
    row.values[ym] ||= { units: 0, price: 0, total: 0, total_manual: false, marketing_pct: 0, commission_pct: 0 };
    return row.values[ym];
}
function vgvValue(row, ym) {
    const c = ensureCell(row, ym);
    const units = Number(c.units || 0);
    const price = Number(c.price || 0) || Number(row.defaultPrice || 0);
    if (c.total_manual) return Number(c.total || 0);
    return units * price;
}

/* ===== Regras de input ===== */
function onUnitsInput(row, monthKey) {
    const cell = ensureCell(row, monthKey);

    const units = Number(cell.units || 0);
    const defPrice = Number(row.defaultPrice || 0);
    const defMkt = Number(row.defaultMarketingPct || 0);
    const defComm = Number(row.defaultCommissionPct || 0);

    if (units <= 0) {
        cell.units = 0;
        cell.price = 0;
        cell.total = 0;
        cell.total_manual = false;
    } else {
        if (!Number(cell.price || 0) && defPrice > 0) cell.price = defPrice;
        if (!Number(cell.marketing_pct || 0) && defMkt > 0) cell.marketing_pct = defMkt;
        if (!Number(cell.commission_pct || 0) && defComm > 0) cell.commission_pct = defComm;
    }

    row.values = { ...row.values };
}

function onDefaultPriceChange(row) {
    const defPrice = Number(row.defaultPrice || 0);
    if (defPrice <= 0) return;

    for (const ym of monthKeys.value) {
        const cell = ensureCell(row, ym);
        const units = Number(cell.units || 0);
        if (units > 0) {
            if (!Number(cell.price || 0)) cell.price = defPrice;
            if (!cell.total_manual) cell.total = 0;
        }
    }

    row.values = { ...row.values };
}

/* ===== Inflate do backend ===== */
function inflateFromBackend() {
    const detail = store.detail;
    if (!detail?.projection) return;

    const dfltMap = new Map();
    for (const d of (detail.enterprise_defaults || [])) {
        const ek = String(d.enterprise_key);
        const alias = String(d.alias_id || 'default');
        const key = `${ek}|${alias}`;
        dfltMap.set(key, {
            defaultPrice: Number(d.default_avg_price || 0),
            defaultMarketingPct: Number(d.default_marketing_pct || 0),
            defaultCommissionPct: Number(d.default_commission_pct || 0),
            name: d.enterprise_name_cache || null,
            erp_id: d.erp_id ? String(d.erp_id) : null,
            enterprise_key: ek,
            alias_id: alias
        });
    }

    const map = new Map();
    for (const l of (detail.lines || [])) {
        const ek = String(l.enterprise_key);
        const alias = String(l.alias_id || 'default');
        const key = `${ek}|${alias}`;

        if (!map.has(key)) {
            const dflt = dfltMap.get(key) || {};
            map.set(key, {
                enterprise_key: ek,
                erp_id: l.erp_id ? String(l.erp_id) : (dflt.erp_id ?? null),
                alias_id: alias,
                name: l.enterprise_name_cache || dflt.name || (l.erp_id ? `ERP ${l.erp_id}` : 'Empreendimento'),
                defaultPrice: Number(dflt.defaultPrice || 0),
                defaultMarketingPct: Number(dflt.defaultMarketingPct || 0),
                defaultCommissionPct: Number(dflt.defaultCommissionPct || 0),
                values: {}
            });
        }

        map.get(key).values[String(l.year_month)] = {
            units: Number(l.units_target || 0),
            price: Number(l.avg_price_target || 0),
            total: 0,
            total_manual: false,
            marketing_pct: Number(l.marketing_pct || 0),
            commission_pct: Number(l.commission_pct || 0),
        };
    }

    for (const [key, v] of dfltMap.entries()) {
        if (!map.has(key)) {
            map.set(key, {
                enterprise_key: v.enterprise_key,
                erp_id: v.erp_id ?? null,
                alias_id: v.alias_id,
                name: v.name || (v.erp_id ? `ERP ${v.erp_id}` : 'Empreendimento'),
                defaultPrice: Number(v.defaultPrice || 0),
                defaultMarketingPct: Number(v.defaultMarketingPct || 0),
                defaultCommissionPct: Number(v.defaultCommissionPct || 0),
                values: {}
            });
        }
    }

    const months = monthKeys.value;
    const arr = [...map.values()].map(r => {
        const values = { ...(r.values || {}) };
        for (const ym of months) {
            values[ym] ||= { units: 0, price: 0, total: 0, total_manual: false, marketing_pct: 0, commission_pct: 0 };
        }
        return { ...r, values };
    });

    arr.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
    rows.value = arr;

    originalPairs.value = new Set(arr.map(r => `${r.enterprise_key}|${r.alias_id}`));
    dirty.value = false;
}

/* ===== Picker: add / edit ERP / manual ===== */
function addSelected() {
    if (pickerMode.value === 'edit' && rowBeingEdited.value) {
        const chosen = selectedToAdd.value[0];
        const erpId = chosen ? String(chosen.id || chosen.erp_id || chosen) : null;

        if (erpId) {
            rowBeingEdited.value.erp_id = erpId;
            const name = chosen?.name || rowBeingEdited.value.name;
            if (name) rowBeingEdited.value.name = name;
        }

        showAdd.value = false;
        resetModalState();
        return;
    }

    const ids = selectedToAdd.value.map(x => String(x.id || x.erp_id || x));
    for (const erp_id of ids) {
        const enterprise_key = `ERP:${erp_id}`;
        const already = rows.value.find(r => r.enterprise_key === enterprise_key && String(r.alias_id) === 'default');
        if (!already) {
            const name = enterprises.value.find(e => String(e.id) === erp_id)?.name || `ERP ${erp_id}`;
            rows.value.push({
                enterprise_key,
                erp_id,
                alias_id: 'default',
                name,
                defaultPrice: 0,
                defaultMarketingPct: 0,
                defaultCommissionPct: 0,
                values: {}
            });
        }
    }

    selectedToAdd.value = [];
    showAdd.value = false;
    resetModalState();
}

function addManualEnterprise() {
    if (rowDisabled.value) return;
    const name = (manualForm.value.name || '').trim();
    if (!name) return;

    const enterprise_key = `MAN:${uuid()}`;
    rows.value.push({
        enterprise_key,
        erp_id: null,
        alias_id: 'default',
        name,
        defaultPrice: Number(manualForm.value.defaultPrice || 0),
        defaultMarketingPct: Number(manualForm.value.defaultMarketingPct || 0),
        defaultCommissionPct: Number(manualForm.value.defaultCommissionPct || 0),
        values: {}
    });

    showAdd.value = false;
    resetModalState();
}

/* ===== Remoções ===== */
const confirmOpen = ref(false);
const pairsToRemove = ref([]);

function computeRemovals() {
    const currentPairs = new Set(rows.value.map(r => `${r.enterprise_key}|${r.alias_id}`));
    const removed = [];

    for (const key of originalPairs.value) {
        if (!currentPairs.has(key)) {
            const [enterprise_key, alias_id] = key.split('|');
            removed.push({
                enterprise_key, alias_id,
                name: rows.value.find(r => r.enterprise_key === enterprise_key)?.name || enterprise_key
            });
        }
    }
    return removed;
}

/* ===== Persistência ===== */
const saving = ref(false);

function ymLE(a, b) { return String(a) <= String(b); }
function ymGE(a, b) { return String(a) >= String(b); }

function monthRangeBetween(allMonths, minYM, maxYM) {
    return allMonths.filter(ym => ymGE(ym, minYM) && ymLE(ym, maxYM));
}

function findMinMaxProjectedYM(row, allMonths) {
    const projected = [];
    for (const ym of allMonths) {
        const c = ensureCell(row, ym);
        if (Number(c.units || 0) > 0) projected.push(ym);
    }
    if (!projected.length) return null;
    projected.sort();
    return { min: projected[0], max: projected[projected.length - 1] };
}

async function doSave({ removeMissing }) {
    saving.value = true;
    try {
        const lineMap = new Map();

        for (const r of rows.value) {
            const mm = findMinMaxProjectedYM(r, monthKeys.value);
            if (!mm) continue;

            const monthsToSend = monthRangeBetween(monthKeys.value, mm.min, mm.max);

            for (const ym of monthsToSend) {
                const cell = ensureCell(r, ym);
                const k = `${r.enterprise_key}|${r.alias_id}|${ym}`;

                lineMap.set(k, {
                    enterprise_key: r.enterprise_key,
                    erp_id: r.erp_id || null,
                    alias_id: r.alias_id || 'default',
                    year_month: ym,
                    units_target: Number(cell.units || 0),
                    avg_price_target: Number(cell.price || 0),
                    enterprise_name_cache: r.name,
                    marketing_pct: Number(cell.marketing_pct || 0),
                    commission_pct: Number(cell.commission_pct || 0),
                });
            }
        }

        await store.saveLines(id, [...lineMap.values()], { removeMissing });

        if (isAdmin.value) {
            const defaultsPayload = rows.value.map(r => ({
                enterprise_key: r.enterprise_key,
                erp_id: r.erp_id || null,
                alias_id: r.alias_id || 'default',
                default_avg_price: Number(r.defaultPrice || 0),
                enterprise_name_cache: r.name,
                default_marketing_pct: Number(r.defaultMarketingPct || 0),
                default_commission_pct: Number(r.defaultCommissionPct || 0),
            }));
            await store.saveDefaults(id, defaultsPayload, { removeMissing });
        }

        await refreshDetail();
        clearDraft();
    } finally {
        saving.value = false;
    }
}
async function onSaveClick() {
    const removed = computeRemovals();
    if (removed.length > 0) {
        pairsToRemove.value = removed;
        confirmOpen.value = true;
    } else {
        await doSave({ removeMissing: false });
    }
}
async function confirmRemovalAndSave() {
    confirmOpen.value = false;
    await doSave({ removeMissing: true });
}

/* ===== Meta ===== */
async function toggleLock() {
    const cur = store.detail?.projection?.is_locked;
    await store.updateMeta(id, { is_locked: !cur });
    await refreshDetail();
}

/* ===== Filtro de exibição ===== */
const selectedEnterpriseLabels = ref([]);

const projectionEnterprises = computed(() => {
    const map = new Map();
    for (const r of rows.value || []) {
        const key = String(r.enterprise_key);
        if (!map.has(key)) map.set(key, r.name || key);
    }
    return [...map.entries()]
        .map(([enterprise_key, name]) => ({ enterprise_key, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
});
const enterprisesOptions = computed(() => projectionEnterprises.value.map(e => e.name));
const enterpriseKeyByName = computed(() => {
    const m = new Map();
    for (const e of projectionEnterprises.value) m.set(e.name, String(e.enterprise_key));
    return m;
});
const selectedEnterpriseKeys = computed(() => {
    const keys = new Set();
    for (const name of selectedEnterpriseLabels.value || []) {
        const k = enterpriseKeyByName.value.get(name);
        if (k) keys.add(k);
    }
    return keys;
});
const filteredRows = computed(() => {
    if (!selectedEnterpriseLabels.value.length) return rows.value;
    const keys = selectedEnterpriseKeys.value;
    return rows.value.filter(r => keys.has(String(r.enterprise_key)));
});
watch(rows, () => {
    const allowed = new Set(enterprisesOptions.value);
    selectedEnterpriseLabels.value = (selectedEnterpriseLabels.value || []).filter(n => allowed.has(n));
}, { deep: true });

/* ===== Totais ===== */
const totals = computed(() => {
    const out = { units: 0, revenue: 0 };
    for (const r of filteredRows.value) {
        for (const ym of monthKeys.value) {
            const c = r.values?.[ym];
            if (!c) continue;
            out.units += Number(c.units || 0);
            out.revenue += Number(vgvValue(r, ym) || 0);
        }
    }
    return out;
});

/* ===== Draft local ===== */
const draftKey = computed(() => `proj:${id}:draft`);
const dirty = ref(false);
let draftTimer = null;

function snapshotRows() {
    return { rows: rows.value, start: startMonth.value, end: endMonth.value, _ts: new Date().toISOString() };
}

function loadDraftIfAny() {
    try {
        const raw = localStorage.getItem(draftKey.value);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data?.rows) return false;

        if (data.start !== startMonth.value || data.end !== endMonth.value) return false;

        rows.value = data.rows;
        dirty.value = true;
        return true;
    } catch {
        return false;
    }
}

function markDirty() {
    if (saving.value) return;
    dirty.value = true;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
        localStorage.setItem(draftKey.value, JSON.stringify(snapshotRows()));
    }, 500);
}

function clearDraft() {
    localStorage.removeItem(draftKey.value);
    dirty.value = false;
}
function discardChangesAndReloadFromBackend() {
    clearDraft();
    inflateFromBackend();
}

/* ===== Guards ===== */
function beforeUnload(e) {
    if (!dirty.value) return;
    e.preventDefault();
    e.returnValue = '';
}
window.addEventListener('beforeunload', beforeUnload);
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));

onBeforeRouteLeave((to, from, next) => {
    if (!dirty.value) return next();
    const ok = confirm('Você pode ter alterações não salvas. Deseja sair?');
    if (ok) { clearDraft(); next(); } else { next(false); }
});
watch(rows, () => markDirty(), { deep: true });

/* ===== Carregamento ===== */
async function refreshDetail() {
    await store.fetchDetail(id, { start_month: startMonth.value, end_month: endMonth.value });
    inflateFromBackend();
    loadDraftIfAny();
}
async function init() {
    await refreshDetail();
    if (isAdmin.value) await loadEnterprises();
}
onMounted(init);

watch([startMonth, endMonth], async ([s, e]) => {
    const ss = ensureYM(s), ee = ensureYM(e);
    if (!ss || !ee || ss > ee) return;
    await refreshDetail();
});

/* ===== Chips ===== */
const chipClass = {
    active(v) {
        return v ? 'bg-blue-200 text-blue-700 border-blue-400' : 'bg-gray-200 text-gray-600 border-gray-400';
    },
    locked(v) {
        return v ? 'bg-emerald-200 text-emerald-700 border-emerald-400' : 'bg-red-200 text-red-700 border-red-400';
    }
};
</script>

<template>
    <div class="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
        <!-- Header -->
        <div
            class="rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 p-4 md:p-5 shadow-sm dark:shadow-lg">
            <div
                class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
                <div class="min-w-0">
                    <h1
                        class="text-2xl font-semibold leading-tight text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <span v-if="!editingName" @click="startEditName"
                            class="cursor-text hover:underline decoration-dotted underline-offset-4 flex items-center gap-2">
                            <i class="fas fa-chart-line text-indigo-500"></i>
                            <span class="truncate max-w-[260px] md:max-w-[360px]">
                                {{ store.detail?.projection?.name }}
                            </span>
                        </span>

                        <input v-else id="proj-name-input" v-model="tempName" @keyup.enter="commitName"
                            @keyup.esc="cancelName" @blur="commitName" type="text"
                            class="h-9 px-3 rounded-lg border border-indigo-200 dark:border-indigo-500/60 bg-white/95 dark:bg-gray-900/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 text-sm"
                            :maxlength="120" />

                        <span class="px-2.5 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1"
                            :class="chipClass.locked(store.detail?.projection?.is_locked)">
                            <i class="fas"
                                :class="store.detail?.projection?.is_locked ? 'fa-lock' : 'fa-lock-open'"></i>
                            {{ store.detail?.projection?.is_locked ? 'Bloqueada' : 'Aberta' }}
                        </span>

                        <span class="px-2.5 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1"
                            :class="chipClass.active(store.detail?.projection?.is_active)">
                            <i class="fas"
                                :class="store.detail?.projection?.is_active ? 'fa-circle-check' : 'fa-circle-dot'"></i>
                            {{ store.detail?.projection?.is_active ? 'Ativa' : 'Inativa' }}
                        </span>
                    </h1>

                    <p
                        class="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span class="inline-flex items-center gap-1">
                            <i class="far fa-calendar text-[11px] text-indigo-500"></i>
                            Período: <span class="font-semibold">{{ startMonth }}</span> → <span
                                class="font-semibold">{{ endMonth }}</span>
                        </span>
                        <span class="hidden md:inline text-gray-300 dark:text-gray-700">•</span>
                        <span class="text-[11px] md:text-[12px] text-gray-500 dark:text-gray-400">
                            Última atualização:
                            {{ store.detail?.projection?.updated_at ? new
                                Date(store.detail.projection.updated_at).toLocaleDateString('pt-BR') : '—' }}
                        </span>
                    </p>
                </div>

                <!-- Botões -->
                <div class="flex items-center gap-2 flex-wrap md:justify-end">
                    <div class="flex flex-col">
                        <span class="text-[11px] text-gray-500">Mês inicial</span>
                        <input type="month" v-model="startMonth"
                            class="h-9 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70" />
                    </div>

                    <div class="flex flex-col">
                        <span class="text-[11px] text-gray-500">Mês final</span>
                        <input type="month" v-model="endMonth"
                            class="h-9 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70" />
                    </div>

                    <div class="hidden md:block w-px h-7 bg-gray-200 dark:bg-gray-700"></div>

                    <button v-if="isAdmin"
                        @click="(async () => { await store.updateMeta(id, { is_active: !Boolean(store.detail?.projection?.is_active) }); await refreshDetail(); })()"
                        class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 hover:bg-gray-50 dark:hover:bg-gray-800/80 text-xs md:text-sm font-medium flex items-center gap-2">
                        <i class="fas"
                            :class="store.detail?.projection?.is_active ? 'fa-toggle-off' : 'fa-toggle-on'"></i>
                        {{ store.detail?.projection?.is_active ? 'Inativar' : 'Ativar' }}
                    </button>

                    <button v-if="isAdmin" @click="toggleLock"
                        class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 hover:bg-gray-50 dark:hover:bg-gray-800/80 text-xs md:text-sm font-medium flex items-center gap-2">
                        <i class="fas" :class="store.detail?.projection?.is_locked ? 'fa-lock-open' : 'fa-lock'"></i>
                        {{ store.detail?.projection?.is_locked ? 'Desbloquear' : 'Bloquear' }}
                    </button>

                    <button v-if="isAdmin && !store.detail?.projection?.is_locked" @click="openAddModal"
                        class="h-9 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm text-xs md:text-sm font-medium flex items-center gap-2">
                        <i class="fas fa-plus-circle"></i>
                        Adicionar
                    </button>

                    <button v-if="isAdmin && !store.detail?.projection?.is_locked && dirty"
                        @click="discardChangesAndReloadFromBackend"
                        class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 hover:bg-gray-50 dark:hover:bg-gray-800/80 text-xs md:text-sm font-medium flex items-center gap-2">
                        <i class="fas fa-rotate-left"></i>
                        Cancelar alterações
                    </button>

                    <button v-if="isAdmin && !store.detail?.projection?.is_locked && dirty" @click="onSaveClick"
                        :disabled="saving || !monthKeys.length"
                        class="h-9 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 shadow-sm text-xs md:text-sm font-semibold flex items-center gap-2">
                        <i v-if="!saving" class="fas fa-save"></i>
                        <i v-else class="fas fa-circle-notch fa-spin"></i>
                        {{ saving ? 'Salvando...' : 'Salvar' }}
                    </button>
                </div>
            </div>

            <!-- KPIs + filtro -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
                <div
                    class="p-3 rounded-xl border dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 shadow-sm flex items-center gap-3">
                    <div
                        class="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                        <i class="fas fa-cubes text-sm"></i>
                    </div>
                    <div>
                        <p class="text-[11px] uppercase tracking-wide text-gray-500">Unidades no período</p>
                        <p class="text-lg font-semibold text-gray-900 dark:text-white">{{ totals.units }}</p>
                    </div>
                </div>

                <div
                    class="p-3 rounded-xl border dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 shadow-sm flex items-center gap-3">
                    <div
                        class="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-300">
                        <i class="fas fa-dollar-sign text-sm"></i>
                    </div>
                    <div>
                        <p class="text-[11px] uppercase tracking-wide text-gray-500">Receita no período</p>
                        <p class="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{{
                            moneyBRL(totals.revenue) }}</p>
                    </div>
                </div>

                <div class="p-3 rounded-xl border dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 shadow-sm">
                    <label
                        class="text-[11px] font-medium mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <i class="fas fa-city text-indigo-500"></i>
                        Empreendimentos (filtrar exibição)
                    </label>
                    <MultiSelector :model-value="selectedEnterpriseLabels"
                        @update:modelValue="v => selectedEnterpriseLabels = Array.isArray(v) ? v : []"
                        :options="enterprisesOptions" placeholder="Selecione empreendimentos" :page-size="600"
                        :select-all="true" />
                </div>
            </div>
        </div>

        <!-- Grade -->
        <div
            class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 overflow-auto shadow-sm">
            <table class="min-w-[1100px] w-full text-sm">
                <thead
                    class="bg-gray-50/90 dark:bg-gray-900/70 sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-gray-50/75">
                    <tr class="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-900">
                        <th class="px-4 py-3 text-left w-[420px] sticky left-0 z-40 bg-inherit">Empreendimento</th>
                        <th v-for="ym in monthKeys" :key="ym" class="px-4 py-3 text-center font-medium tracking-wide">
                            {{ monthLabel(ym) }}
                        </th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-for="(r, idx) in filteredRows" :key="`${r.enterprise_key}@@${r.alias_id}@@${idx}`"
                        :class="idx % 2 ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-[#19222e]'">
                        <!-- Coluna fixa -->
                        <td class="px-3 py-3 align-top sticky left-0 z-20 border-r dark:border-gray-700"
                            :class="idx % 2 ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-[#19222e]'">
                            <div class="flex flex-wrap items-end gap-x-4 gap-y-2">
                                <div class="flex justify-between w-full min-w-[420px]">
                                    <div class="flex flex-col">
                                        <button type="button"
                                            class="text-[11px] text-gray-500 block text-left underline decoration-dotted underline-offset-2 hover:text-indigo-600 disabled:text-gray-400 disabled:no-underline"
                                            :disabled="rowDisabled" @click="openEditEnterpriseModal(r)">
                                            Centro de Custo:
                                            <span v-if="r.erp_id">{{ r.erp_id }}</span>
                                            <span v-else class="text-orange-600 font-semibold">— manual —</span>
                                        </button>

                                        <div v-if="!isEditing(r, 'name', idx)" @click="startEdit(r, 'name', idx)"
                                            class="h-9 px-2 rounded flex items-center cursor-text">
                                            <span class="truncate">{{ r.name || 'Clique para editar' }}</span>
                                        </div>

                                        <input v-else :id="`in-name-${keyOf(r, idx)}`" v-model="r.name"
                                            @blur="stopEdit(r, 'name', idx)" @keyup.enter="stopEdit(r, 'name', idx)"
                                            :disabled="rowDisabled"
                                            class="w-full h-9 px-2 rounded focus:outline-none" />
                                    </div>

                                    <div class="flex gap-2">
                                        <!-- Ticket médio padrão -->
                                        <div>
                                            <label class="text-[11px] text-gray-500 block">Ticket médio padrão</label>

                                            <div v-if="!isEditing(r, 'price', idx)" @click="startEdit(r, 'price', idx)"
                                                class="h-9 px-2 rounded flex items-center cursor-text">
                                                <span class="tabular-nums">{{ moneyBRL(Number(r.defaultPrice || 0))
                                                    }}</span>
                                            </div>

                                            <input v-else :id="`in-price-${keyOf(r, idx)}`" type="text"
                                                inputmode="numeric" :value="moneyBR(r.defaultPrice)" @input="(e) => {
                                                    r.defaultPrice = parseMoneyBR(e.target.value);
                                                    setMaskedInputValue(e.target, r.defaultPrice);
                                                }" @blur="stopEdit(r, 'price', idx); onDefaultPriceChange(r)"
                                                @keyup.enter="stopEdit(r, 'price', idx); onDefaultPriceChange(r)"
                                                :disabled="rowDisabled"
                                                class="w-32 h-9 px-2 rounded focus:outline-none" />
                                        </div>

                                        <!-- % Marketing -->
                                        <div>
                                            <label class="text-[11px] text-gray-500 block">% Marketing</label>
                                            <input type="number" min="0" max="100" step="0.01"
                                                v-model.number="r.defaultMarketingPct" :disabled="rowDisabled"
                                                class="w-16 h-9 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-0" />
                                        </div>

                                        <!-- % Comissão -->
                                        <div>
                                            <label class="text-[11px] text-gray-500 block">% Comissão</label>
                                            <input type="number" min="0" max="100" step="0.01"
                                                v-model.number="r.defaultCommissionPct" :disabled="rowDisabled"
                                                class="w-16 h-9 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-0" />
                                        </div>

                                        <div class="flex items-center gap-3">
                                            <button @click="duplicateRow(r)" :disabled="rowDisabled"
                                                class="text-lg text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
                                                <i class="fas fa-copy" v-tippy="'Duplicar Empreendimento'"></i>
                                            </button>
                                            <button @click="removeRow(r)" :disabled="rowDisabled"
                                                class="text-lg text-red-600 hover:text-red-700">
                                                <i class="fas fa-trash" v-tippy="'Remover Empreendimento'"></i>
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </td>

                        <!-- Meses -->
                        <td v-for="ym in monthKeys" :key="ym" class="px-3 py-2 align-top">
                            <div class="flex gap-2">
                                <!-- Unidades -->
                                <div>
                                    <label class="text-[11px] text-gray-500 block text-center">Qtd. Uni</label>
                                    <input :disabled="!isAdmin || store.detail?.projection?.is_locked"
                                        v-model.number="ensureCell(r, ym).units" @input="onUnitsInput(r, ym)"
                                        type="number" min="0"
                                        class="w-14 h-9 border text-center border-gray-200 dark:border-gray-800 rounded px-2 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-0"
                                        placeholder="Uds" />
                                </div>

                                <!-- VGV -->
                                <div>
                                    <label class="text-[11px] text-gray-500 block text-center">VGV</label>
                                    <input :disabled="!isAdmin || store.detail?.projection?.is_locked" type="text"
                                        inputmode="numeric" :value="moneyBR(vgvValue(r, ym))" @input="(e) => {
                                            const c = ensureCell(r, ym);
                                            c.total_manual = true;
                                            c.total = parseMoneyBR(e.target.value);
                                            setMaskedInputValue(e.target, vgvValue(r, ym));
                                            r.values = { ...r.values };
                                        }"
                                        class="w-36 h-9 border border-gray-200 dark:border-gray-800 rounded px-2 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-0" />

                                    <div class="text-[10px] text-gray-500 flex items-center justify-between">
                                        <span>{{ moneyBRL((r.values[ym]?.price || 0) || (r.defaultPrice || 0)) }}</span>
                                        <button v-if="(r.values[ym]?.total_manual)" type="button"
                                            class="text-[10px] text-indigo-600 hover:underline"
                                            :disabled="!isAdmin || store.detail?.projection?.is_locked" @click="() => {
                                                const c = ensureCell(r, ym);
                                                c.total_manual = false;
                                                c.total = 0;
                                                r.values = { ...r.values };
                                            }" title="Voltar para cálculo automático (unidades x ticket médio)">
                                            auto
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </td>

                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Logs -->
        <ProjectionLogsDrawer :id="id" />

        <!-- ✅ Modal adicionar/editar (AJUSTADO) -->
        <div v-if="showAdd" class="fixed inset-0 z-[60]">
            <div class="absolute inset-0 bg-black/40"></div>

            <div class="absolute inset-0 flex items-center justify-center p-4 z-[61]">
                <div
                    class="bg-white dark:bg-gray-900 rounded-2xl p-4 w-full max-w-3xl shadow-xl border dark:border-gray-700">
                    <div class="flex items-center justify-between mb-3">
                        <h1 class="font-semibold text-2xl p-2">
                            <i class="far fa-building pr-1"></i>
                            {{ pickerMode === 'add' ? 'Adicionar empreendimento(s)' : 'Vincular / alterar centro de custo' }}
                        </h1>
                        <button @click="showAdd = false; resetModalState();" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- ADD: botão que abre/fecha o manual -->
                    <div v-if="pickerMode === 'add'" class="flex items-center justify-between gap-2 mb-3">
                        <p class="text-[12px] text-gray-500">
                            Selecione empresas do ERP. Se precisar, lance um empreendimento sem centro de custo.
                        </p>

                        <button type="button" @click="showManualInAdd = !showManualInAdd"
                            class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 hover:bg-gray-50 dark:bg-gray-900/70 text-sm font-medium flex items-center gap-2">
                            <i class="fas" :class="showManualInAdd ? 'fa-arrow-left' : 'fa-plus'"></i>
                            {{ showManualInAdd ? 'Lançar com centro de custo' : 'Lançar sem centro de custo' }}
                        </button>
                    </div>

                    <!-- ERP picker (sempre aparece; é o padrão) -->
                    <div v-if="!showManualInAdd" class="rounded-xl border dark:border-gray-700 p-3">
                        <h4 class="font-semibold text-sm mb-2">
                            {{ pickerMode === 'add' ? 'Selecionar do ERP' : 'Selecionar centro de custo (ERP)' }}
                        </h4>

                        <div class="relative">
                            <i
                                class="fas fa-magnifying-glass absolute left-3 top-5 -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input v-model="search" @focus="loadEnterprises" placeholder="Buscar..."
                                class="w-full border dark:border-gray-700 rounded-lg h-10 pl-9 pr-3 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 mb-3" />
                        </div>

                        <div class="max-h-80 overflow-auto border dark:border-gray-700 rounded-lg">
                            <label
                                v-for="e in enterprises.filter(x => !search || x.name?.toLowerCase().includes(search.toLowerCase()))"
                                :key="e.id"
                                class="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/60">
                                <div class="flex items-center gap-2">
                                    <input type="checkbox" :value="e" v-model="selectedToAdd" class="accent-indigo-600"
                                        :disabled="pickerMode === 'edit' && selectedToAdd.length > 0 && selectedToAdd[0]?.id !== e.id">
                                    <span class="font-medium">{{ e.name }}</span>
                                </div>
                                <span class="text-xs text-gray-500">ERP {{ e.id }}</span>
                            </label>
                        </div>

                        <div class="mt-3 flex items-center justify-between gap-2">
                            <p class="text-[11px] text-gray-500">
                                <span v-if="pickerMode === 'edit'">
                                    No modo <strong>editar</strong>, selecione <strong>1</strong> ERP para vincular. O
                                    <strong>enterprise_key</strong> não muda.
                                </span>
                                <span v-else>
                                    No modo <strong>adicionar</strong>, selecione 1 ou mais empresas do ERP.
                                </span>
                            </p>

                            <button @click="addSelected"
                                class="h-9 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow">
                                {{ pickerMode === 'add' ? 'Adicionar selecionados' : 'Vincular selecionado' }}
                            </button>
                        </div>
                    </div>

                    <!-- Manual form (SÓ no ADD e só quando abrir) -->
                    <div v-if="pickerMode === 'add' && showManualInAdd"
                        class="mt-4 rounded-xl border dark:border-gray-700 p-3">
                        <h4 class="font-semibold text-sm mb-2">Lançar sem centro de custo</h4>

                        <div class="space-y-2">
                            <div>
                                <label class="text-[11px] text-gray-500 block">Nome</label>
                                <input v-model="manualForm.name"
                                    class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70"
                                    placeholder="Ex.: Empreendimento X (pré-cadastro)" />
                            </div>

                            <div class="grid grid-cols-3 gap-2">
                                <div>
                                    <label class="text-[11px] text-gray-500 block">Ticket médio</label>
                                    <input type="text" inputmode="numeric" :value="moneyBR(manualForm.defaultPrice)"
                                        @input="(e) => {
                                            manualForm.defaultPrice = parseMoneyBR(e.target.value);
                                            setMaskedInputValue(e.target, manualForm.defaultPrice);
                                        }"
                                        class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70" />
                                </div>

                                <div>
                                    <label class="text-[11px] text-gray-500 block">% Marketing</label>
                                    <input type="number" min="0" max="100" step="0.01"
                                        v-model.number="manualForm.defaultMarketingPct"
                                        class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70" />
                                </div>

                                <div>
                                    <label class="text-[11px] text-gray-500 block">% Comissão</label>
                                    <input type="number" min="0" max="100" step="0.01"
                                        v-model.number="manualForm.defaultCommissionPct"
                                        class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70" />
                                </div>
                            </div>

                            <div class="flex justify-end">
                                <button @click="addManualEnterprise"
                                    class="h-9 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow">
                                    Criar
                                </button>
                            </div>

                            <p class="text-[11px] text-gray-500">
                                Manual cria uma linha com <strong>erp_id = null</strong> e <strong>enterprise_key =
                                    MAN:uuid</strong>.
                            </p>
                        </div>
                    </div>

                    <div class="mt-4 flex justify-end gap-2">
                        <button @click="showAdd = false; resetModalState();"
                            class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 hover:bg-gray-50 dark:bg-gray-900/70">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal confirmação remoção -->
        <div v-if="confirmOpen" class="fixed inset-0 z-[70]">
            <div class="absolute inset-0 bg-black/40"></div>
            <div class="absolute inset-0 flex items-center justify-center p-4 z-[71]">
                <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 w-full max-w-lg shadow-xl border">
                    <h3 class="font-semibold text-gray-900 dark:text-white mb-2">Confirmar remoção</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Você removeu {{ pairsToRemove.length }} item(ns). Ao confirmar, as linhas mensais e defaults
                        desses itens serão excluídos <strong>definitivamente</strong>.
                    </p>

                    <div class="max-h-52 overflow-auto border rounded-lg p-2 mb-4">
                        <ul class="text-sm space-y-1">
                            <li v-for="p in pairsToRemove" :key="p.enterprise_key + '|' + p.alias_id"
                                class="flex items-center gap-2">
                                <span
                                    class="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]">-</span>
                                <span class="truncate">
                                    {{ p.name }}
                                    <span class="text-xs text-gray-500">(key {{ p.enterprise_key }}, alias {{ p.alias_id
                                        }})</span>
                                </span>
                            </li>
                        </ul>
                    </div>

                    <div class="flex justify-end gap-2">
                        <button @click="confirmOpen = false"
                            class="h-9 px-3 rounded-lg border bg-white/90 hover:bg-gray-50 dark:bg-gray-900/70">
                            Cancelar
                        </button>
                        <button @click="confirmRemovalAndSave"
                            class="h-9 px-3 rounded-lg bg-red-600 text-white hover:bg-red-500 shadow">
                            Excluir e salvar
                        </button>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>
