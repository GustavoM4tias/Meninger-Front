<script setup>
import { onMounted, ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import { useProjectionsStore } from '@/stores/Comercial/Projections/projectionsStore';
import ProjectionLogsDrawer from './components/ProjectionLogsDrawer.vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import AvailabilityInline from './components/AvailabilityInline.vue';
import Export from '@/components/config/Export.vue';

/* =============================================================================
   HELPERS YM (YYYY-MM)
============================================================================= */
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

/* =============================================================================
   MONEY (pt-BR)
============================================================================= */
const nfBR2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nfBRCurrency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtBRL = (v) => nfBRCurrency.format(Number.isFinite(Number(v)) ? Number(v) : 0);

function moneyBR(v) {
    const n = Number(v);
    return nfBR2.format(Number.isFinite(n) ? n : 0);
}
function parseMoneyBR(raw) {
    const digits = String(raw ?? '').replace(/\D+/g, '');
    if (!digits) return 0;
    return Number(digits) / 100;
}
function setMaskedInputValue(el, numericValue) {
    if (el) el.value = moneyBR(numericValue);
}

/* =============================================================================
   STORES / ROUTE
============================================================================= */
const route = useRoute();
const store = useProjectionsStore();
const auth = useAuthStore();

const id = Number(route.params.id);
const isAdmin = computed(() => auth?.user?.role === 'admin');

/* =============================================================================
   UI: PERÍODO + SHOW ZERO
============================================================================= */
const currentYear = new Date().getFullYear();
const startMonth = ref(`${currentYear}-01`);
const endMonth = ref(`${currentYear}-12`);
const showZero = ref(false);

const monthLabels = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const monthKeys = computed(() => {
    const s = ensureYM(startMonth.value);
    const e = ensureYM(endMonth.value);
    if (!s || !e || s > e) return [];
    return buildMonthRange(s, e);
});
const monthLabel = (ym) => {
    const [y, m] = String(ym).split('-');
    return `${monthLabels[Number(m) - 1]}/${y}`;
};

/* =============================================================================
   META: EDIT NAME
============================================================================= */
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
}
function cancelName() { editingName.value = false; }

/* =============================================================================
   ROW MODEL
============================================================================= */
const rows = ref([]);

/**
 * Cell model:
 *  { units, price, total, total_manual, marketing_pct, commission_pct }
 */
function ensureCell(row, ym) {
    row.values ||= {};
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

/* =============================================================================
   SAVE: only months with value
============================================================================= */
function hasValueToSave(cell) {
    const u = Number(cell?.units || 0);
    const manual = !!cell?.total_manual && Number(cell?.total || 0) > 0;
    return u > 0 || manual;
}

/* =============================================================================
   EXIBIÇÃO: quando showZero OFF, só mostra se tiver valor no período
============================================================================= */
function rowPairKey(r) {
    return `${String(r.enterprise_key)}|${String(r.alias_id || 'default')}|${String(r.erp_id || '')}`;
}
function rowHasAnyValueInRange(row) {
    const months = monthKeys.value || [];
    for (const ym of months) {
        const c = row.values?.[ym];
        if (hasValueToSave(c)) return true;
    }
    return false;
}

const originalPairs = ref(new Set());

const baseRowsForUI = computed(() => {
    const arr = rows.value || [];
    if (showZero.value) return arr;

    return arr.filter((row) => {
        const isNew = !originalPairs.value.has(rowPairKey(row));
        return isNew || rowHasAnyValueInRange(row);
    });
});

/* =============================================================================
   FILTER: MultiSelector (Empreendimentos) + CIDADES
============================================================================= */
const selectedEnterpriseLabels = ref([]);
const selectedCityLabels = ref([]);

const projectionEnterprises = computed(() => {
    const map = new Map();
    for (const r of baseRowsForUI.value || []) {
        const key = String(r.erp_id || r.enterprise_key);
        if (!map.has(key)) map.set(key, r.name || key);
    }
    return [...map.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
});

const enterprisesOptions = computed(() => projectionEnterprises.value.map(e => e.name));

const enterpriseIdByName = computed(() => {
    const m = new Map();
    for (const e of projectionEnterprises.value) m.set(e.name, String(e.id));
    return m;
});

const selectedEnterpriseIds = computed(() => {
    const ids = new Set();
    for (const name of selectedEnterpriseLabels.value || []) {
        const id = enterpriseIdByName.value.get(name);
        if (id) ids.add(id);
    }
    return ids;
});

// cidades derivadas das rows (já com applyCitiesToRows)
const projectionCities = computed(() => {
    const set = new Set();
    for (const r of baseRowsForUI.value || []) {
        if (r?.city) set.add(String(r.city));
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
});
const cityOptions = computed(() => projectionCities.value);

const filteredRows = computed(() => {
    const base = baseRowsForUI.value;

    const hasEnterpriseFilter = !!selectedEnterpriseLabels.value.length;
    const hasCityFilter = !!selectedCityLabels.value.length;

    if (!hasEnterpriseFilter && !hasCityFilter) return base;

    const ids = selectedEnterpriseIds.value;
    const cities = new Set((selectedCityLabels.value || []).map(String));

    return base.filter((r) => {
        const okEnterprise = !hasEnterpriseFilter || ids.has(String(r.erp_id || r.enterprise_key));
        const okCity = !hasCityFilter || (r?.city && cities.has(String(r.city)));
        return okEnterprise && okCity;
    });
});

watch(rows, () => {
    const allowed = new Set(enterprisesOptions.value);
    selectedEnterpriseLabels.value = (selectedEnterpriseLabels.value || []).filter(n => allowed.has(n));

    const allowedCities = new Set(cityOptions.value);
    selectedCityLabels.value = (selectedCityLabels.value || []).filter(n => allowedCities.has(n));
}, { deep: true });

/* =============================================================================
   INPUT RULES
============================================================================= */
function onUnitsInput(row, monthKey) {
    const cell = ensureCell(row, monthKey);

    const units = Number(cell.units || 0);
    const defPrice = Number(row.defaultPrice || 0);
    const defMkt = Number(row.defaultMarketingPct || 0);
    const defComm = Number(row.defaultCommissionPct || 0);

    if (units <= 0) {
        cell.units = 0;
        if (!cell.total_manual) cell.total = 0;
        if (!cell.total_manual) cell.price = 0;
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
        if (units > 0 && !Number(cell.price || 0)) cell.price = defPrice;
    }
    row.values = { ...row.values };
}

/* =============================================================================
   AVAILABILITY FIX (units_summary)
============================================================================= */
function buildSummaryByErpFromDefaults(defaults) {
    const byErp = new Map();
    if (!Array.isArray(defaults)) return byErp;

    for (const d of defaults) {
        const erp = d?.erp_id != null ? String(d.erp_id) : '';
        if (!erp) continue;
        if (d?.units_summary) byErp.set(erp, d.units_summary);
    }
    return byErp;
}

function applyUnitsSummaryPatchFromDefaults(defaults) {
    if (!Array.isArray(rows.value) || !rows.value.length) return;

    const byErp = buildSummaryByErpFromDefaults(defaults);
    if (!byErp.size) return;

    let changed = false;

    for (const r of rows.value) {
        if (r?.units_summary) continue;

        const erp = r?.erp_id != null ? String(r.erp_id) : '';
        if (!erp) continue;

        const next = byErp.get(erp);
        if (next) {
            r.units_summary = next;
            changed = true;
        }
    }

    if (changed) rows.value = [...rows.value];
}

function mergeDraftIntoRowsPreservingSummary(draftRows, backendRows, defaults) {
    const byErp = buildSummaryByErpFromDefaults(defaults);

    const backendByPair = new Map();
    for (const r of backendRows || []) {
        const k = `${String(r.enterprise_key)}|${String(r.alias_id || 'default')}|${String(r.erp_id || '')}`;
        backendByPair.set(k, r);
    }

    const merged = (draftRows || []).map((dr) => {
        const k = `${String(dr.enterprise_key)}|${String(dr.alias_id || 'default')}|${String(dr.erp_id || '')}`;
        const br = backendByPair.get(k);

        const erp =
            dr?.erp_id != null ? String(dr.erp_id) :
                br?.erp_id != null ? String(br.erp_id) : '';

        const summary =
            dr?.units_summary ||
            br?.units_summary ||
            (erp ? byErp.get(erp) : null) ||
            null;

        return {
            ...(br || {}),
            ...dr,
            units_summary: summary,
        };
    });

    const draftKeys = new Set(
        (draftRows || []).map((dr) =>
            `${String(dr.enterprise_key)}|${String(dr.alias_id || 'default')}|${String(dr.erp_id || '')}`
        )
    );

    for (const br of backendRows || []) {
        const k = `${String(br.enterprise_key)}|${String(br.alias_id || 'default')}|${String(br.erp_id || '')}`;
        if (!draftKeys.has(k)) merged.push(br);
    }

    rows.value = merged;
    applyUnitsSummaryPatchFromDefaults(defaults);
}

/* =============================================================================
   CIDADES: aplica city nas rows a partir do enterprisePicker (store)
============================================================================= */
const cityByErpId = computed(() => {
    const m = new Map();
    for (const it of store.enterprisePicker || []) {
        if (it?.id == null) continue;
        if (it?.city) m.set(String(it.id), String(it.city));
    }
    return m;
});

function applyCitiesToRows() {
    if (!rows.value?.length) return;
    const map = cityByErpId.value;
    let changed = false;

    for (const r of rows.value) {
        const erp = r?.erp_id != null ? String(r.erp_id) : '';
        if (!erp) continue;

        const city = map.get(erp) || null;
        if (city && r.city !== city) {
            r.city = city;
            changed = true;
        }
    }
    if (changed) rows.value = [...rows.value];
}

/* =============================================================================
   INFLATE (backend)
============================================================================= */
function inflateFromBackend() {
    const detail = store.detail;
    if (!detail?.projection) return;

    const pairs = detail.enterprise_defaults || [];
    const map = new Map();

    for (const d of pairs) {
        const ek = String(d.enterprise_key);
        const alias = String(d.alias_id || 'default');
        const erp = d.erp_id ? String(d.erp_id) : '';
        const key = `${ek}|${alias}|${erp}`;

        map.set(key, {
            enterprise_key: ek,
            alias_id: alias,
            erp_id: d.erp_id ? String(d.erp_id) : null,
            name: d.enterprise_name_cache || (d.erp_id ? `ERP ${d.erp_id}` : 'Empreendimento'),
            city: null,

            units_summary: d.units_summary || null,

            totalUnits: d.total_units == null ? null : Number(d.total_units),
            defaultPrice: Number(d.default_avg_price || 0),
            defaultMarketingPct: Number(d.default_marketing_pct || 0),
            defaultCommissionPct: Number(d.default_commission_pct || 0),
            values: {},
        });
    }

    for (const l of (detail.lines || [])) {
        const ek = String(l.enterprise_key);
        const alias = String(l.alias_id || 'default');
        const erp = l.erp_id ? String(l.erp_id) : '';
        const key = `${ek}|${alias}|${erp}`;

        if (!map.has(key)) {
            map.set(key, {
                enterprise_key: ek,
                alias_id: alias,
                erp_id: l.erp_id ? String(l.erp_id) : null,
                name: l.enterprise_name_cache || (l.erp_id ? `ERP ${l.erp_id}` : 'Empreendimento'),
                city: null,

                totalUnits: null,
                units_summary: null,
                defaultPrice: 0,
                defaultMarketingPct: 0,
                defaultCommissionPct: 0,
                values: {},
            });
        }

        const row = map.get(key);
        if (l.enterprise_name_cache && !row.name) row.name = l.enterprise_name_cache;

        row.values[String(l.year_month)] = {
            units: Number(l.units_target || 0),
            price: Number(l.avg_price_target || 0),
            total: 0,
            total_manual: false,
            marketing_pct: Number(l.marketing_pct || 0),
            commission_pct: Number(l.commission_pct || 0),
        };
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

    originalPairs.value = new Set(arr.map(r => rowPairKey(r)));
    dirty.value = false;

    applyUnitsSummaryPatchFromDefaults(store.detail?.enterprise_defaults);
    applyCitiesToRows();
}

/* =============================================================================
   REFRESH DETAIL
============================================================================= */
async function refreshDetail() {
    await store.fetchDetail(id, {
        start_month: startMonth.value,
        end_month: endMonth.value,
        include_zero: showZero.value ? 1 : 0,
    });

    inflateFromBackend();
    loadDraftIfAnySafe();
    applyUnitsSummaryPatchFromDefaults(store.detail?.enterprise_defaults);
    applyCitiesToRows();
}

/* =============================================================================
   ADD / EDIT ENTERPRISE PICKER (STORE) + busca por cidade
============================================================================= */
const search = ref('');
const citySearch = ref('');
const showAdd = ref(false);
const selectedToAdd = ref([]);

const pickerMode = ref('add'); // 'add' | 'edit'
const rowBeingEdited = ref(null);

const modalSelectedCities = ref([]);

function uuid() {
    return (crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
}

const showManualInAdd = ref(false);
const manualForm = ref({
    name: '',
    city: '', // ✅ obrigatório
    totalUnits: 0,
    defaultPrice: 0,
    defaultMarketingPct: 0,
    defaultCommissionPct: 0
});

function resetModalState() {
    selectedToAdd.value = [];
    search.value = '';
    citySearch.value = '';
    modalSelectedCities.value = [];
    rowBeingEdited.value = null;
    pickerMode.value = 'add';
    showManualInAdd.value = false;
    manualForm.value = { name: '', city: '', totalUnits: 0, defaultPrice: 0, defaultMarketingPct: 0, defaultCommissionPct: 0 };
}

async function openAddModal() {
    pickerMode.value = 'add';
    rowBeingEdited.value = null;
    selectedToAdd.value = [];
    search.value = '';
    citySearch.value = '';
    modalSelectedCities.value = [];
    showManualInAdd.value = false;
    manualForm.value = { name: '', city: '', totalUnits: 0, defaultPrice: 0, defaultMarketingPct: 0, defaultCommissionPct: 0 };

    showAdd.value = true;
    await store.fetchEnterprisePicker(); // ✅ store
}

function closeAddModal() {
    showAdd.value = false;
    resetModalState();
}

async function openEditEnterpriseModal(row) {
    if (rowDisabled.value) return;

    pickerMode.value = 'edit';
    rowBeingEdited.value = row;
    selectedToAdd.value = [];
    search.value = '';
    citySearch.value = '';
    modalSelectedCities.value = [];
    showManualInAdd.value = false;

    await store.fetchEnterprisePicker();

    const current = (store.enterprisePicker || []).find(e => String(e.id) === String(row.erp_id));
    if (current) selectedToAdd.value = [current];

    showAdd.value = true;
}

const enterprisesFilteredInModal = computed(() => {
    return store.filterEnterprisePicker({
        search: search.value,
        citySearch: citySearch.value,
        selectedCities: modalSelectedCities.value,
    });
});

function addSelected() {
    if (!selectedToAdd.value.length) {
        closeAddModal();
        return;
    }

    // EDIT mode
    if (pickerMode.value === 'edit' && rowBeingEdited.value) {
        const chosen = selectedToAdd.value[0];
        const erpId = String(chosen.id || chosen.erp_id || chosen);
        const name = chosen.name || erpId;

        rowBeingEdited.value.erp_id = erpId;
        rowBeingEdited.value.name = name;
        rowBeingEdited.value.city = chosen.city || null;

        applyUnitsSummaryPatchFromDefaults(store.detail?.enterprise_defaults);
        rows.value = [...rows.value];
        closeAddModal();
        return;
    }

    // ADD mode
    const ids = selectedToAdd.value.map(x => String(x.id || x.erp_id || x));
    for (const erp_id of ids) {
        const exists = rows.value.find(r => String(r.erp_id) === erp_id && String(r.alias_id || 'default') === 'default');
        if (exists) continue;

        const pickItem = (store.enterprisePicker || []).find(e => String(e.id) === erp_id);
        const name = pickItem?.name || erp_id;
        const city = pickItem?.city || null;

        rows.value.push({
            enterprise_key: erp_id,
            erp_id,
            alias_id: 'default',
            name,
            city,
            totalUnits: null,
            defaultPrice: 0,
            defaultMarketingPct: 0,
            defaultCommissionPct: 0,
            units_summary: null,
            values: {},
        });
    }

    applyUnitsSummaryPatchFromDefaults(store.detail?.enterprise_defaults);
    rows.value = [...rows.value];
    closeAddModal();
}

function addManualEnterprise() {
    if (rowDisabled.value) return;

    const name = (manualForm.value.name || '').trim();
    const city = (manualForm.value.city || '').trim();

    if (!name) return;
    if (!city) return; // ✅ obriga cidade

    const enterprise_key = `MAN:${uuid()}`;

    rows.value.push({
        enterprise_key,
        erp_id: null,
        alias_id: 'default',
        name,
        city, // ✅ salva cidade
        totalUnits: Number(manualForm.value.totalUnits || 0),
        defaultPrice: Number(manualForm.value.defaultPrice || 0),
        defaultMarketingPct: Number(manualForm.value.defaultMarketingPct || 0),
        defaultCommissionPct: Number(manualForm.value.defaultCommissionPct || 0),
        units_summary: null,
        values: {},
    });

    rows.value = [...rows.value];
    closeAddModal();
}

/* =============================================================================
   DUPLICATE / REMOVE + CONFIRM REMOVE
============================================================================= */
const confirmOpen = ref(false);
const pairsToRemove = ref([]);

function shallowCloneRow(r) {
    const out = {
        enterprise_key: r.enterprise_key,
        erp_id: r.erp_id ?? null,
        alias_id: uuid(),
        name: (r.name || r.erp_id || r.enterprise_key) + ' (cópia)',
        city: r.city ?? null,
        totalUnits: r.totalUnits ?? null,
        defaultPrice: Number(r.defaultPrice || 0),
        defaultMarketingPct: Number(r.defaultMarketingPct || 0),
        defaultCommissionPct: Number(r.defaultCommissionPct || 0),
        units_summary: r.units_summary || null,
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

function duplicateRow(row) { rows.value.push(shallowCloneRow(row)); rows.value = [...rows.value]; }
function removeRow(row) { rows.value = rows.value.filter(r => rowPairKey(r) !== rowPairKey(row)); rows.value = [...rows.value]; }

function computeRemovals() {
    const currentPairs = new Set(rows.value.map(r => rowPairKey(r)));
    const removed = [];

    for (const key of originalPairs.value) {
        if (!currentPairs.has(key)) {
            const [enterprise_key, alias_id, erp_id] = key.split('|');
            removed.push({
                enterprise_key,
                alias_id,
                erp_id: erp_id || null,
                name: rows.value.find(r => String(r.enterprise_key) === enterprise_key)?.name || `ERP ${erp_id || enterprise_key}`
            });
        }
    }
    return removed;
}

/* =============================================================================
   SAVE
============================================================================= */
const saving = ref(false);

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

async function doSave({ removeMissing }) {
    saving.value = true;
    try {
        const payload = [];
        for (const r of rows.value) {
            for (const ym of monthKeys.value) {
                const c = ensureCell(r, ym);
                if (!hasValueToSave(c)) continue;

                payload.push({
                    enterprise_key: r.enterprise_key,
                    erp_id: r.erp_id || null,
                    alias_id: r.alias_id || 'default',
                    year_month: ym,
                    units_target: Math.max(0, parseInt(c.units ?? 0, 10)),
                    avg_price_target: Number(c.price || 0),
                    enterprise_name_cache: r.name,
                    marketing_pct: Number(c.marketing_pct || 0),
                    commission_pct: Number(c.commission_pct || 0),
                });
            }
        }

        await store.saveLines(id, payload.length ? payload : [{
            enterprise_key: rows.value?.[0]?.enterprise_key || 'noop',
            erp_id: rows.value?.[0]?.erp_id || null,
            alias_id: rows.value?.[0]?.alias_id || 'default',
            year_month: monthKeys.value?.[0] || startMonth.value,
            units_target: 0,
            avg_price_target: 0,
            enterprise_name_cache: rows.value?.[0]?.name || 'noop',
            marketing_pct: 0,
            commission_pct: 0,
        }], { removeMissing });

        if (isAdmin.value) {
            const defaultsPayload = rows.value.map(r => ({
                enterprise_key: r.enterprise_key,
                erp_id: r.erp_id || null,
                alias_id: r.alias_id || 'default',
                default_avg_price: Number(r.defaultPrice || 0),
                enterprise_name_cache: r.name,
                default_marketing_pct: Number(r.defaultMarketingPct || 0),
                default_commission_pct: Number(r.defaultCommissionPct || 0),
                total_units: r.erp_id ? null : Number(r.totalUnits ?? 0),
                // cidade ainda é só front (se quiser persistir, precisa endpoint/coluna no backend)
            }));
            await store.saveDefaults(id, defaultsPayload, { removeMissing });
        }

        await refreshDetail();
        clearDraft();
    } finally {
        saving.value = false;
    }
}

/* =============================================================================
   META (lock/unlock)
============================================================================= */
async function toggleLock() {
    const cur = store.detail?.projection?.is_locked;
    await store.updateMeta(id, { is_locked: !cur });
}

/* =============================================================================
   TOTALS
============================================================================= */
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

const monthTotals = computed(() => {
    const byMonth = {};
    for (const ym of monthKeys.value) byMonth[ym] = { units: 0, revenue: 0 };

    for (const r of filteredRows.value) {
        for (const ym of monthKeys.value) {
            const c = r.values?.[ym];
            if (!c) continue;
            byMonth[ym].units += Number(c.units || 0);
            byMonth[ym].revenue += Number(vgvValue(r, ym) || 0);
        }
    }

    return byMonth;
});

function rowSumUnits(row) {
    let u = 0;
    for (const ym of monthKeys.value) u += Number(row.values?.[ym]?.units || 0);
    return u;
}
function rowSumVgv(row) {
    let v = 0;
    for (const ym of monthKeys.value) v += Number(vgvValue(row, ym) || 0);
    return v;
}

/* =============================================================================
   ROW DISABLED
============================================================================= */
const rowDisabled = computed(() => !!(store.detail?.projection?.is_locked) || !isAdmin.value);

/* =============================================================================
   MODAL: defaults (Ticket/Mkt/Comissão/Cidade) ✅ FUNCIONANDO
============================================================================= */
const showRowDefaults = ref(false);
const rowDefaultsTarget = ref(null);

const rowDefaultsForm = ref({
    name: '',
    city: '',
    defaultPrice: 0,
    defaultMarketingPct: 0,
    defaultCommissionPct: 0,
});

function openRowDefaultsModal(row) {
    if (rowDisabled.value) return;

    rowDefaultsTarget.value = row;
    rowDefaultsForm.value = {
        name: row?.name || '',
        city: row?.city || '',
        defaultPrice: Number(row?.defaultPrice || 0),
        defaultMarketingPct: Number(row?.defaultMarketingPct || 0),
        defaultCommissionPct: Number(row?.defaultCommissionPct || 0),
    };

    showRowDefaults.value = true;
    nextTick(() => document.getElementById('row-default-city')?.focus());
}

function closeRowDefaultsModal() {
    showRowDefaults.value = false;
    rowDefaultsTarget.value = null;
}

function applyRowDefaultsModal() {
    const row = rowDefaultsTarget.value;
    if (!row) return;

    row.name = String(rowDefaultsForm.value.name).trim() || null;
    row.city = String(rowDefaultsForm.value.city || '').trim() || null;
    row.defaultPrice = Number(rowDefaultsForm.value.defaultPrice || 0);
    row.defaultMarketingPct = Number(rowDefaultsForm.value.defaultMarketingPct || 0);
    row.defaultCommissionPct = Number(rowDefaultsForm.value.defaultCommissionPct || 0);

    onDefaultPriceChange(row);
    rows.value = [...rows.value];

    closeRowDefaultsModal();
}

/* =============================================================================
   EXPORT
============================================================================= */
const exportOpen = ref(false);

const exportSource = computed(() => {
    const out = [];
    for (const r of filteredRows.value) {
        for (const ym of monthKeys.value) {
            const c = ensureCell(r, ym);
            const units = Number(c.units || 0);
            const price = Number(c.price || 0) || Number(r.defaultPrice || 0);
            const vgv = Number(vgvValue(r, ym) || 0);

            out.push({
                enterprise_name: r.name,
                enterprise_key: r.enterprise_key,
                erp_id: r.erp_id || null,
                city: r.city || null,
                alias_id: r.alias_id || 'default',
                year_month: ym,
                month_label: monthLabel(ym),

                units_target: units,
                avg_price_target: price,
                vgv_target: vgv,

                marketing_pct: Number(c.marketing_pct || 0),
                commission_pct: Number(c.commission_pct || 0),

                default_avg_price: Number(r.defaultPrice || 0),
                default_marketing_pct: Number(r.defaultMarketingPct || 0),
                default_commission_pct: Number(r.defaultCommissionPct || 0),
            });
        }
    }
    return out;
});

/* =============================================================================
   DRAFT
============================================================================= */
const draftKey = computed(() => `proj:${id}:draft:${startMonth.value}:${endMonth.value}:${showZero.value ? '1' : '0'}`);
const dirty = ref(false);
let draftTimer = null;

function snapshotRows() {
    return {
        start: startMonth.value,
        end: endMonth.value,
        showZero: !!showZero.value,
        rows: rows.value,
        _ts: new Date().toISOString(),
    };
}
function markDirty() {
    if (saving.value) return;
    dirty.value = true;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
        localStorage.setItem(draftKey.value, JSON.stringify(snapshotRows()));
    }, 450);
}
watch(rows, () => markDirty(), { deep: true });

function loadDraftIfAnySafe() {
    try {
        const raw = localStorage.getItem(draftKey.value);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data?.rows) return false;

        mergeDraftIntoRowsPreservingSummary(
            data.rows,
            rows.value,
            store.detail?.enterprise_defaults
        );

        dirty.value = true;
        applyCitiesToRows();
        return true;
    } catch {
        return false;
    }
}

function clearDraft() {
    localStorage.removeItem(draftKey.value);
    dirty.value = false;
}
function discardChangesAndReloadFromBackend() {
    clearDraft();
    refreshDetail();
}

/* =============================================================================
   GUARD
============================================================================= */
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

/* =============================================================================
   INIT + WATCHERS
============================================================================= */
async function init() {
    if (isAdmin.value) await store.fetchEnterprisePicker();
    await refreshDetail();
    applyCitiesToRows();
}
onMounted(init);

watch([startMonth, endMonth], async ([s, e]) => {
    const ss = ensureYM(s), ee = ensureYM(e);
    if (!ss || !ee || ss > ee) return;
    clearDraft();
    await refreshDetail();
});

watch(showZero, async () => {
    clearDraft();
    await refreshDetail();
});

watch(
    () => store.detail?.enterprise_defaults,
    (d) => applyUnitsSummaryPatchFromDefaults(d),
    { deep: true, immediate: true }
);

watch(
    () => store.enterprisePicker,
    () => applyCitiesToRows(),
    { deep: false }
);

/* =============================================================================
   UI helpers (chips)
============================================================================= */
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
    <div class="p-4 md:p-6 space-y-4 w-full mx-auto">
        <!-- Header -->
        <div
            class="relative rounded-2xl border dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 p-4 md:p-5 shadow-sm dark:shadow-lg">
            <div
                class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
                <div class="min-w-0">
                    <h1
                        class="text-xl font-semibold leading-tight text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <span v-if="!editingName" @click="startEditName"
                            class="cursor-text hover:underline decoration-dotted underline-offset-4 flex items-center gap-2">
                            <i class="fas fa-chart-line text-indigo-500"></i>
                            <span class="truncate max-w-[260px]">{{ store.detail?.projection?.name }}</span>
                        </span>

                        <input v-else id="proj-name-input" v-model="tempName" @keyup.enter="commitName"
                            @keyup.esc="cancelName" @blur="commitName" type="text"
                            class="h-9 px-3 rounded-lg border border-indigo-200 dark:border-indigo-500/60 bg-white/95 dark:bg-gray-900/90 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 text-sm"
                            :maxlength="120" />
                    </h1>

                    <!-- Chips -->
                    <div class="flex gap-1 pt-2">
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-medium border flex items-center gap-1"
                            :class="chipClass.locked(store.detail?.projection?.is_locked)">
                            <i class="fas"
                                :class="store.detail?.projection?.is_locked ? 'fa-lock' : 'fa-lock-open'"></i>
                            {{ store.detail?.projection?.is_locked ? 'Bloqueada' : 'Aberta' }}
                        </span>

                        <span class="px-2 py-0.5 rounded-full text-[10px] font-medium border flex items-center gap-1"
                            :class="chipClass.active(store.detail?.projection?.is_active)">
                            <i class="fas"
                                :class="store.detail?.projection?.is_active ? 'fa-circle-check' : 'fa-circle-dot'"></i>
                            {{ store.detail?.projection?.is_active ? 'Ativa' : 'Inativa' }}
                        </span>
                    </div>

                    <!-- Show zero -->
                    <label
                        class="mt-2 inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 select-none">
                        <input type="checkbox" v-model="showZero" class="accent-indigo-600" />
                        Mostrar empreendimentos sem projeção
                    </label>
                </div>

                <!-- Controls -->
                <div class="flex items-center flex-wrap md:justify-end">
                    <div class="flex gap-2">
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

                        <div class="hidden mt-4 md:block w-px h-10 bg-gray-200 dark:bg-gray-700"></div>

                        <button v-if="isAdmin"
                            @click="store.updateMeta(id, { is_active: !Boolean(store.detail?.projection?.is_active) })"
                            class="h-9 mt-4 px-3 rounded-lg border dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 hover:bg-gray-50 dark:hover:bg-gray-800/80 text-xs md:text-sm font-medium flex items-center gap-2">
                            <i class="fas"
                                :class="store.detail?.projection?.is_active ? 'fa-toggle-off' : 'fa-toggle-on'"></i>
                            {{ store.detail?.projection?.is_active ? 'Inativar' : 'Ativar' }}
                        </button>

                        <button v-if="isAdmin" @click="toggleLock"
                            class="h-9 mt-4 px-3 rounded-lg border dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 hover:bg-gray-50 dark:hover:bg-gray-800/80 text-xs md:text-sm font-medium flex items-center gap-2">
                            <i class="fas"
                                :class="store.detail?.projection?.is_locked ? 'fa-lock-open' : 'fa-lock'"></i>
                            {{ store.detail?.projection?.is_locked ? 'Desbloquear' : 'Bloquear' }}
                        </button>

                        <button v-if="isAdmin && !store.detail?.projection?.is_locked" @click="openAddModal"
                            class="h-9 mt-4 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm text-xs md:text-sm font-medium flex items-center gap-2">
                            <i class="fas fa-plus-circle"></i>
                            Empreendimentos
                        </button>

                        <!-- Export -->
                        <button
                            class="h-9 mt-4 px-3 rounded-lg border dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 hover:bg-gray-50 dark:hover:bg-gray-800/80 text-xs md:text-sm font-medium flex items-center gap-2"
                            v-tippy="'Exportar dados (CSV/Excel)'" @click="exportOpen = true"
                            :disabled="!monthKeys.length || !filteredRows.length">
                            <i class="fas fa-download"></i>
                            Exportar
                        </button>

                        <button v-if="isAdmin && !store.detail?.projection?.is_locked && dirty"
                            @click="discardChangesAndReloadFromBackend"
                            class="h-9 mt-4 px-3 rounded-lg border dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 hover:bg-gray-50 dark:hover:bg-gray-800/80 text-xs md:text-sm font-medium flex items-center gap-2">
                            <i class="fas fa-rotate-left"></i>
                            Cancelar
                        </button>

                        <button v-if="isAdmin && !store.detail?.projection?.is_locked && dirty" @click="onSaveClick"
                            :disabled="saving || !monthKeys.length"
                            class="h-9 mt-4 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 shadow-sm text-xs md:text-sm font-semibold flex items-center gap-2">
                            <i v-if="!saving" class="fas fa-save"></i>
                            <i v-else class="fas fa-circle-notch fa-spin"></i>
                            {{ saving ? 'Salvando...' : 'Salvar' }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- KPIs + filtros -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mt-1">
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
                            fmtBRL(totals.revenue) }}</p>
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

                <div class="p-3 rounded-xl border dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 shadow-sm">
                    <label
                        class="text-[11px] font-medium mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                        <i class="fas fa-location-dot text-indigo-500"></i>
                        Cidades (filtrar exibição)
                    </label>
                    <MultiSelector :model-value="selectedCityLabels"
                        @update:modelValue="v => selectedCityLabels = Array.isArray(v) ? v : []" :options="cityOptions"
                        placeholder="Selecione cidades" :page-size="300" :select-all="true" />
                </div>
            </div>
        </div>

        <!-- Grade -->
        <div
            class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/50 shadow-sm overflow-auto max-h-[80vh]">
            <table class="min-w-[1100px] w-full text-sm">
                <thead
                    class="bg-gray-50/95 dark:bg-gray-900/85 sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80">
                    <tr class="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-900">
                        <th
                            class="px-4 py-3 text-left sticky left-0 top-0 z-[70] bg-inherit border dark:border-gray-800">
                            Empreendimento
                        </th>

                        <th v-for="ym in monthKeys" :key="ym"
                            class="px-4 py-2 text-center font-medium tracking-wide sticky top-0 z-[50] bg-inherit border dark:border-gray-800">
                            <div class="flex flex-col items-center gap-1">
                                <div class="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                    {{ monthLabel(ym) }}
                                </div>

                                <div class="flex items-center gap-3 text-[10px] text-gray-600 dark:text-gray-300">
                                    <span class="inline-flex items-center gap-1">
                                        <i class="fas fa-cubes text-[10px]"></i>
                                        <span class="font-semibold">{{ monthTotals[ym]?.units || 0 }}</span>
                                    </span>

                                    <span class="inline-flex items-center gap-1">
                                        <i class="fas fa-dollar-sign text-[10px]"></i>
                                        <span class="font-semibold text-emerald-600">{{ fmtBRL(monthTotals[ym]?.revenue
                                            || 0) }}</span>
                                    </span>
                                </div>
                            </div>
                        </th>

                        <th
                            class="px-4 py-3 text-center sticky right-0 top-0 z-[70] bg-inherit border-l dark:border-gray-700">
                            TOTAL
                        </th>
                    </tr>
                </thead>

                <tbody>
                    <tr v-for="(r, idx) in filteredRows"
                        :key="`${r.enterprise_key}@@${r.erp_id}@@${r.alias_id}@@${idx}`"
                        :class="idx % 2 ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-[#19222e]'">

                        <!-- Coluna fixa -->
                        <td class="px-3 py-3 align-top sticky left-0 z-[5] border dark:border-gray-800"
                            :class="idx % 2 ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-[#19222e]'">
                            <div class="w-[280px] max-w-[280px]">
                                <div class="flex items-start justify-between gap-3">
                                    <div class="min-w-0 flex-1">
                                        <div class="h-9 -mb-2 rounded flex items-center">
                                            <span class="truncate font-medium">{{ r.name }}</span>
                                        </div>

                                        <div v-if="r.city"
                                            class="text-[11px] text-gray-500 -my-2 flex items-center gap-1">
                                            <i class="fas fa-location-dot text-[10px]"></i>
                                            <span class="truncate">{{ r.city }}</span>
                                            <span v-if="r.erp_id" class="truncate"> - CC: {{ r.erp_id }}</span>
                                        </div>

                                        <AvailabilityInline :summary="r.units_summary" :total-units="r.totalUnits"
                                            :editable="!rowDisabled"
                                            @update:totalUnits="(v) => { r.totalUnits = v; rows.value = [...rows.value]; }" />
                                    </div>

                                    <div class="flex flex-col items-center gap-2">
                                        <div
                                            class="hidden sm:flex flex-col gap-1 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40">
                                            <div v-tippy="'Comissão'"
                                                class="h-54 w-8 flex items-center justify-between cursor-pointer gap-1 text-[12px] text-gray-600 dark:text-gray-300">
                                                {{ Number(r.defaultCommissionPct || 0).toFixed(2) }}%
                                            </div>
                                        </div>

                                        <button type="button" @click="openRowDefaultsModal(r)" :disabled="rowDisabled"
                                            class="h-7 w-12 inline-flex items-center justify-center rounded-lg border dark:border-gray-700 bg-white/90 dark:bg-gray-900/40 hover:bg-gray-50 dark:hover:bg-gray-800/70"
                                            v-tippy="'Editar ticket médio / % mkt / % comissão / cidade'">
                                            <i class="fas fa-pen-to-square"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </td>

                        <!-- Meses -->
                        <td v-for="ym in monthKeys" :key="ym" class="align-center p-1 border dark:border-gray-800">
                            <div class="flex gap-1">
                                <div>
                                    <label class="text-[10px] text-gray-500 block text-center">Qtd. Uni</label>
                                    <input :disabled="rowDisabled" v-model.number="ensureCell(r, ym).units"
                                        @input="onUnitsInput(r, ym)" type="number" min="0"
                                        class="w-14 h-8 border text-center border-gray-200 dark:border-gray-800 rounded px-2 bg-white/90 dark:bg-gray-900/70 focus:outline-none"
                                        placeholder="Uds" />
                                </div>

                                <div>
                                    <label class="text-[10px] text-gray-500 block text-center">VGV</label>
                                    <input :disabled="rowDisabled" type="text" inputmode="numeric"
                                        :value="moneyBR(vgvValue(r, ym))" @input="(e) => {
                                            const c = ensureCell(r, ym);
                                            c.total_manual = true;
                                            c.total = parseMoneyBR(e.target.value);
                                            setMaskedInputValue(e.target, vgvValue(r, ym));
                                            r.values = { ...r.values };
                                        }"
                                        class="w-32 h-8 border border-gray-200 dark:border-gray-800 rounded px-2 bg-white/90 dark:bg-gray-900/70 focus:outline-none" />

                                    <div class="text-[10px] text-gray-500 flex items-center justify-between">
                                        <span>{{ fmtBRL((r.values[ym]?.price || 0) || (r.defaultPrice || 0)) }}</span>
                                        <button v-if="(r.values[ym]?.total_manual)" type="button"
                                            class="text-[10px] text-indigo-600 hover:underline" :disabled="rowDisabled"
                                            @click="() => { const c = ensureCell(r, ym); c.total_manual = false; c.total = 0; r.values = { ...r.values }; }">
                                            auto
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </td>

                        <!-- TOTAL linha -->
                        <td class="px-3 py-2 text-center sticky right-0 z-10 border-l dark:border-gray-700"
                            :class="idx % 2 ? 'bg-gray-100 dark:bg-gray-900' : 'bg-white dark:bg-[#19222e]'">
                            <div class="flex flex-col items-center">
                                <div
                                    class="inline-flex items-center gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                                    <i class="fas fa-cubes text-[11px]"></i>
                                    <span class="font-semibold">{{ rowSumUnits(r) }}</span>
                                </div>

                                <div
                                    class="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                                    <i class="fas fa-dollar-sign text-[11px]"></i>
                                    <span class="font-semibold">{{ fmtBRL(rowSumVgv(r)) }}</span>
                                </div>
                            </div>
                        </td>

                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Logs -->
        <ProjectionLogsDrawer :id="id" />

        <!-- Export -->
        <Export v-model="exportOpen" :source="exportSource" title="Exportação da projeção" filename="projecao-vendas"
            initial-delimiter=";" initial-array-mode="join"
            :preselect="['enterprise_name', 'city', 'erp_id', 'year_month', 'units_target', 'avg_price_target', 'vgv_target', 'marketing_pct', 'commission_pct']" />

        <!-- ✅ Modal: Ticket médio / %Mkt / %Comissão / Cidade (ESTAVA FALTANDO) -->
        <div v-if="showRowDefaults" class="fixed inset-0 z-[80]">
            <div class="absolute inset-0 bg-black/40" @click="closeRowDefaultsModal"></div>

            <div class="absolute inset-0 flex items-center justify-center p-4 z-[81]">
                <div class="bg-white dark:bg-gray-900 rounded-2xl p-4 w-full max-w-lg shadow-xl border dark:border-gray-700"
                    @click.stop>
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <i class="fas fa-sliders"></i>
                            Ajustes do empreendimento
                        </h3>
                        <button @click="closeRowDefaultsModal" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <p class="text-xs text-gray-500 mb-3 truncate">
                        {{ rowDefaultsTarget?.name }}
                    </p>

                    <div class="space-y-3">
                        <div>
                            <label class="text-[11px] text-gray-500 block">Nome</label>
                            <input id="row-default-name" v-model="rowDefaultsForm.name"
                                class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70"
                                :disabled="rowDisabled" />
                        </div>
                        <div>
                            <label class="text-[11px] text-gray-500 block">Cidade</label>
                            <input id="row-default-city" v-model="rowDefaultsForm.city"
                                class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70"
                                placeholder="Ex.: São Paulo" :disabled="rowDisabled" />
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                                <label class="text-[11px] text-gray-500 block">Ticket médio</label>
                                <input id="row-default-price" type="text" inputmode="numeric" :disabled="rowDisabled"
                                    :value="moneyBR(rowDefaultsForm.defaultPrice)"
                                    @input="(e) => { rowDefaultsForm.defaultPrice = parseMoneyBR(e.target.value); setMaskedInputValue(e.target, rowDefaultsForm.defaultPrice); }"
                                    class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70" />
                            </div>

                            <div>
                                <label class="text-[11px] text-gray-500 block">% Marketing</label>
                                <input type="number" min="0" max="100" step="0.01"
                                    v-model.number="rowDefaultsForm.defaultMarketingPct" :disabled="rowDisabled"
                                    class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70" />
                            </div>

                            <div class="md:col-span-2">
                                <label class="text-[11px] text-gray-500 block">% Comissão</label>
                                <input type="number" min="0" max="100" step="0.01"
                                    v-model.number="rowDefaultsForm.defaultCommissionPct" :disabled="rowDisabled"
                                    class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70" />
                            </div>
                        </div>

                        <div class="flex flex-col justify-between gap-2 pt-2">
                            <div class="flex items-center gap-2">
                                <button type="button"
                                    class="h-9 px-3 truncate rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/70"
                                    @click="rowDefaultsTarget && duplicateRow(rowDefaultsTarget)"
                                    :disabled="rowDisabled || !rowDefaultsTarget">
                                    <i class="fas fa-copy mr-2"></i>
                                    Duplicar
                                </button>

                                <button type="button"
                                    class="h-9 px-3 truncate rounded-lg bg-red-600 text-white hover:bg-red-500"
                                    @click="rowDefaultsTarget && (removeRow(rowDefaultsTarget), closeRowDefaultsModal())"
                                    :disabled="rowDisabled || !rowDefaultsTarget">
                                    <i class="fas fa-trash mr-2"></i>
                                    Excluir
                                </button>

                                <button type="button"
                                    class="h-9 px-3 flex-1 truncate rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/70"
                                    :disabled="rowDisabled" @click="openEditEnterpriseModal(rowDefaultsTarget)">
                                    <i class="fas fa-building mr-2"></i> Centro de Custo: <span
                                        v-if="rowDefaultsTarget?.erp_id">{{ rowDefaultsTarget.erp_id }}</span> <span
                                        v-else class="text-orange-600 font-semibold">— manual —</span>
                                </button>
                            </div>

                            <div class="flex items-center justify-end gap-2">
                                <button type="button"
                                    class="h-9 px-3 truncate rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/70"
                                    @click="closeRowDefaultsModal">
                                    Cancelar
                                </button>

                                <button type="button"
                                    class="h-9 px-3 truncate rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                                    @click="applyRowDefaultsModal" :disabled="rowDisabled">
                                    Salvar
                                </button>
                            </div>
                        </div>

                        <p class="text-[11px] text-gray-500 pt-2">
                            Obs.: persiste no backend quando você clicar em <strong>Salvar</strong> na tela principal.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal adicionar/editar empreendimentos -->
        <div v-if="showAdd" class="fixed inset-0 z-[90]">
            <div class="absolute inset-0 bg-black/40"></div>
            <div class="absolute inset-0 flex items-center justify-center p-4 z-[61]">
                <div class="bg-white dark:bg-gray-900 rounded-2xl p-4 w-full max-w-3xl shadow-xl border dark:border-gray-700"
                    @click.stop>
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-semibold">
                            {{ pickerMode === 'add' ? 'Adicionar empreendimentos' : 'Selecionar centro de custo' }}
                        </h3>
                        <button @click="closeAddModal" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <!-- ADD: alternar ERP x Manual -->
                    <div v-if="pickerMode === 'add'" class="flex items-center justify-between gap-2 mb-3">
                        <p class="text-[12px] text-gray-500">
                            Selecione empreendimentos do ERP ou crie um empreendimento manual (sem centro de custo).
                        </p>

                        <button type="button" @click="showManualInAdd = !showManualInAdd"
                            class="h-9 px-3 truncate rounded-lg border dark:border-gray-700 bg-white/90 hover:bg-gray-50 dark:bg-gray-900/70 text-sm font-medium flex items-center gap-2">
                            <i class="fas" :class="showManualInAdd ? 'fa-arrow-left' : 'fa-plus'"></i>
                            {{ showManualInAdd ? 'Selecionar do ERP' : 'Cadastrar s/ Centro de Custo' }}
                        </button>
                    </div>

                    <!-- ERP picker -->
                    <div v-if="!showManualInAdd" class="rounded-xl border dark:border-gray-700 p-3">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                            <div class="relative">
                                <i
                                    class="fas fa-magnifying-glass absolute left-3 top-5 -translate-y-1/2 text-gray-400 text-sm"></i>
                                <input v-model="search" @focus="store.fetchEnterprisePicker()"
                                    placeholder="Buscar por nome / ERP..."
                                    class="w-full border dark:border-gray-700 rounded-lg h-10 pl-9 pr-3 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/40" />
                            </div>

                            <div class="relative">
                                <i
                                    class="fas fa-location-dot absolute left-3 top-5 -translate-y-1/2 text-gray-400 text-sm"></i>
                                <input v-model="citySearch" placeholder="Buscar por cidade..."
                                    class="w-full border dark:border-gray-700 rounded-lg h-10 pl-9 pr-3 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/40" />
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="text-[11px] text-gray-500 block mb-1">Filtrar por cidades</label>
                            <MultiSelector :model-value="modalSelectedCities"
                                @update:modelValue="v => modalSelectedCities = Array.isArray(v) ? v : []"
                                :options="store.enterprisePickerCities" placeholder="Selecione cidades" :page-size="400"
                                :select-all="true" />
                        </div>

                        <div class="max-h-80 overflow-auto border dark:border-gray-700 rounded-lg">
                            <label v-for="e in enterprisesFilteredInModal" :key="e.id"
                                class="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/60">
                                <div class="flex items-center gap-2 min-w-0">
                                    <input type="checkbox" :value="e" v-model="selectedToAdd" class="accent-indigo-600"
                                        :disabled="pickerMode === 'edit' && selectedToAdd.length > 0 && String(selectedToAdd[0]?.id) !== String(e.id)">
                                    <div class="min-w-0">
                                        <span class="font-medium block truncate">{{ e.name }}</span>
                                        <span v-if="e.city" class="text-[11px] text-gray-500 flex items-center gap-1">
                                            <i class="fas fa-location-dot text-[10px]"></i>
                                            <span class="truncate">{{ e.city }}</span>
                                        </span>
                                    </div>
                                </div>

                                <span class="text-xs text-gray-500 whitespace-nowrap">ERP {{ e.id }}</span>
                            </label>

                            <div v-if="store.enterprisePickerError" class="p-3 text-sm text-red-600">
                                {{ store.enterprisePickerError }}
                            </div>

                            <div v-if="!enterprisesFilteredInModal.length && !store.enterprisePickerError"
                                class="p-3 text-sm text-gray-500">
                                Nenhum resultado.
                            </div>
                        </div>

                        <div class="mt-4 flex justify-end gap-2">
                            <button @click="closeAddModal"
                                class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 hover:bg-gray-50 dark:bg-gray-900/70">
                                Cancelar
                            </button>
                            <button @click="addSelected"
                                class="h-9 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow">
                                {{ pickerMode === 'add' ? 'Adicionar' : 'Confirmar' }}
                            </button>
                        </div>
                    </div>

                    <!-- Manual form -->
                    <div v-if="pickerMode === 'add' && showManualInAdd"
                        class="rounded-xl border dark:border-gray-700 p-3">
                        <h4 class="font-semibold text-sm mb-2">Lançar empreendimento manual</h4>

                        <div class="space-y-2">
                            <div>
                                <label class="text-[11px] text-gray-500 block">Nome</label>
                                <input v-model="manualForm.name"
                                    class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70"
                                    placeholder="Ex.: Empreendimento X (pré-cadastro)" />
                            </div>

                            <div>
                                <label class="text-[11px] text-gray-500 block">Cidade <span
                                        class="text-red-500">*</span></label>
                                <input v-model="manualForm.city"
                                    class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70"
                                    placeholder="Ex.: Campinas" />
                            </div>

                            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div>
                                    <label class="text-[11px] text-gray-500 block">Total units</label>
                                    <input type="number" min="0" v-model.number="manualForm.totalUnits"
                                        class="w-full h-10 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70" />
                                </div>

                                <div>
                                    <label class="text-[11px] text-gray-500 block">Ticket médio</label>
                                    <input type="text" inputmode="numeric" :value="moneyBR(manualForm.defaultPrice)"
                                        @input="(e) => { manualForm.defaultPrice = parseMoneyBR(e.target.value); setMaskedInputValue(e.target, manualForm.defaultPrice); }"
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

                            <div class="mt-4 flex justify-end gap-2">
                                <button @click="closeAddModal"
                                    class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 hover:bg-gray-50 dark:bg-gray-900/70">
                                    Cancelar
                                </button>
                                <button @click="addManualEnterprise"
                                    class="h-9 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 shadow"
                                    :disabled="!manualForm.name || !manualForm.city">
                                    Criar
                                </button>
                            </div>

                            <p class="text-[11px] text-gray-500">
                                Manual cria <strong>erp_id = null</strong>, <strong>enterprise_key = MAN:uuid</strong> e
                                salva
                                <strong>total_units</strong> via defaults. Cidade fica na linha para filtro e export.
                            </p>
                        </div>
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
                        Você removeu {{ pairsToRemove.length }} empreendimento(s) desta meta. Ao confirmar, as linhas e
                        defaults desses itens serão excluídos <strong>definitivamente</strong>.
                    </p>

                    <div class="max-h-52 overflow-auto border rounded-lg p-2 mb-4">
                        <ul class="text-sm space-y-1">
                            <li v-for="p in pairsToRemove"
                                :key="p.enterprise_key + '|' + p.alias_id + '|' + (p.erp_id || '')"
                                class="flex items-center gap-2">
                                <span
                                    class="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]">-</span>
                                <span class="truncate">
                                    {{ p.name }}
                                    <span class="text-xs text-gray-500">
                                        (enterprise_key {{ p.enterprise_key }}, erp {{ p.erp_id || '—' }}, alias {{
                                            p.alias_id }})
                                    </span>
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
