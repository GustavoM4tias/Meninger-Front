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
            city: d.manual_city || null,

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
                city: r.erp_id ? null : (r.city || null),
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
    totalUnits: null,
    defaultPrice: 0,
    defaultMarketingPct: 0,
    defaultCommissionPct: 0,
});

function openRowDefaultsModal(row) {
    // if (rowDisabled.value) return;

    rowDefaultsTarget.value = row;
    rowDefaultsForm.value = {
        name: row?.name || '',
        city: row?.city || '',
        totalUnits: row?.erp_id ? null : (row?.totalUnits ?? null),
        defaultPrice: Number(row?.defaultPrice || 0),
        defaultMarketingPct: Number(row?.defaultMarketingPct || 0),
        defaultCommissionPct: Number(row?.defaultCommissionPct || 0),
    };

    showRowDefaults.value = true;
    // Só foca se não estiver desabilitado, para evitar erro no console
    if (!rowDisabled.value) {
        nextTick(() => document.getElementById('row-default-city')?.focus());
    }
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
    if (!row.erp_id) {
        const tu = rowDefaultsForm.value.totalUnits;
        row.totalUnits = tu !== null && tu !== '' ? Math.max(0, parseInt(tu, 10) || 0) : null;
    }
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

/* =============================================================================
   VIEW MODE  (cards | table)  — persiste em localStorage
============================================================================= */
const viewMode = ref(localStorage.getItem('proj-view-mode') || 'cards')
watch(viewMode, (v) => localStorage.setItem('proj-view-mode', v))

/* =============================================================================
   CARD: modal de edição por empresa
============================================================================= */
const cardEditOpen = ref(false)
const cardEditRow  = ref(null)

function openCardEdit(row) {
    if (rowDisabled.value) return
    cardEditRow.value = row
    cardEditOpen.value = true
}
function closeCardEdit() {
    cardEditOpen.value = false
    cardEditRow.value  = null
}

/* =============================================================================
   CARD: helpers de estoque + formatação
============================================================================= */
function stockOf(row) {
    const s         = row?.units_summary
    const total     = Number(s?.totalUnits    ?? row?.totalUnits ?? 0)
    const sold      = Number(s?.soldUnitsStock ?? s?.soldUnits  ?? 0)
    const reserved  = Number(s?.reservedUnits ?? 0)
    const blocked   = Number(s?.blockedUnits  ?? 0)
    const available = Number(s?.availableUnits ?? 0)
    return { total, sold, reserved, blocked, available, hasSummary: !!s }
}

// Formato "cheio" sem centavos — R$ 1.200.000
const nfBRLFull = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const brlShortFmt = (v) => {
    const n = Number(v)
    if (!n) return '—'
    return nfBRLFull.format(n)
}
// Formato compacto para resumos de header (mi/bi)
const brlCompact = (v) => {
    const n = Number(v)
    if (!n) return '—'
    if (n >= 1_000_000_000) return `R$ ${(n / 1_000_000_000).toFixed(2).replace('.', ',')} bi`
    if (n >= 1_000_000)     return `R$ ${(n / 1_000_000).toFixed(2).replace('.', ',')} mi`
    if (n >= 1_000)         return `R$ ${(n / 1_000).toFixed(0)} mil`
    return nfBRLFull.format(n)
}

const _shortMonthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
function shortMonthLabel(ym) {
    const [y, m] = String(ym).split('-')
    return `${_shortMonthNames[Number(m) - 1]}/${y.slice(2)}`
}

/** Maior valor de unidades em qualquer mês da projeção (para normalizar as barras) */
function rowMaxUnits(row) {
    let max = 0
    for (const ym of monthKeys.value) {
        const u = Number(row.values?.[ym]?.units || 0)
        if (u > max) max = u
    }
    return max
}

const globalTotals = computed(() => {
    let units = 0, revenue = 0
    for (const r of filteredRows.value) {
        units   += rowSumUnits(r)
        revenue += rowSumVgv(r)
    }
    return {
        units,
        revenue,
        enterprises: filteredRows.value.length,
        avgTicket:   units > 0 ? revenue / units : 0,
    }
})

/* =============================================================================
   FILTROS: contagem + limpeza rápida
============================================================================= */
const activeFilterCount = computed(() =>
    (selectedEnterpriseLabels.value?.length || 0) + (selectedCityLabels.value?.length || 0)
)
function clearAllFilters() {
    selectedEnterpriseLabels.value = []
    selectedCityLabels.value = []
}

/* PAINEL FILTRO: toggle visibilidade */
const filterPanelOpen = ref(true)
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
                <div class="flex flex-col gap-3 md:items-end">
                    <!-- Período -->
                    <div class="flex items-end gap-2">
                        <div class="flex flex-col">
                            <span class="text-[11px] text-gray-500 dark:text-gray-400 font-medium mb-1">Mês inicial</span>
                            <input type="month" v-model="startMonth"
                                class="h-9 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 text-sm" />
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[11px] text-gray-500 dark:text-gray-400 font-medium mb-1">Mês final</span>
                            <input type="month" v-model="endMonth"
                                class="h-9 border dark:border-gray-700 rounded-lg px-3 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 text-sm" />
                        </div>
                    </div>

                    <!-- Ações -->
                    <div class="flex items-center gap-2 flex-wrap">
                        <!-- Status group: Ativar + Bloquear -->
                        <div v-if="isAdmin" class="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm divide-x divide-gray-200 dark:divide-gray-700">
                            <button
                                @click="store.updateMeta(id, { is_active: !Boolean(store.detail?.projection?.is_active) })"
                                class="h-9 px-3 bg-white dark:bg-gray-900/80 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
                                :class="store.detail?.projection?.is_active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'"
                                v-tippy="store.detail?.projection?.is_active ? 'Inativar projeção' : 'Ativar projeção'">
                                <i class="fas" :class="store.detail?.projection?.is_active ? 'fa-toggle-off' : 'fa-toggle-on'"></i>
                                <span class="hidden sm:inline">{{ store.detail?.projection?.is_active ? 'Inativar' : 'Ativar' }}</span>
                            </button>
                            <button
                                @click="toggleLock"
                                class="h-9 px-3 bg-white dark:bg-gray-900/80 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
                                :class="store.detail?.projection?.is_locked ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'"
                                v-tippy="store.detail?.projection?.is_locked ? 'Desbloquear edição' : 'Bloquear edição'">
                                <i class="fas" :class="store.detail?.projection?.is_locked ? 'fa-lock-open' : 'fa-lock'"></i>
                                <span class="hidden sm:inline">{{ store.detail?.projection?.is_locked ? 'Desbloquear' : 'Bloquear' }}</span>
                            </button>
                        </div>

                        <!-- Divider -->
                        <div v-if="isAdmin" class="hidden sm:block w-px h-6 bg-gray-200 dark:bg-gray-700"></div>

                        <!-- Adicionar empreendimento -->
                        <button v-if="isAdmin && !store.detail?.projection?.is_locked" @click="openAddModal"
                            class="h-9 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm text-xs font-semibold flex items-center gap-1.5 transition-colors">
                            <i class="fas fa-plus text-[10px]"></i>
                            <span>Empreendimento</span>
                        </button>

                        <!-- Exportar -->
                        <button
                            class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
                            v-tippy="'Exportar dados (CSV/Excel)'" @click="exportOpen = true"
                            :disabled="!monthKeys.length || !filteredRows.length">
                            <i class="fas fa-download text-gray-500 dark:text-gray-400"></i>
                            <span class="hidden sm:inline text-gray-600 dark:text-gray-300">Exportar</span>
                        </button>

                        <!-- Cancelar + Salvar (só quando dirty) -->
                        <template v-if="isAdmin && !store.detail?.projection?.is_locked && dirty">
                            <button
                                @click="discardChangesAndReloadFromBackend"
                                class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 dark:bg-gray-900/80 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-medium flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                <i class="fas fa-rotate-left text-[10px]"></i>
                                <span class="hidden sm:inline">Cancelar</span>
                            </button>
                            <button @click="onSaveClick"
                                :disabled="saving || !monthKeys.length"
                                class="h-9 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 shadow-sm text-xs font-bold flex items-center gap-1.5 transition-colors">
                                <i v-if="!saving" class="fas fa-save text-[10px]"></i>
                                <i v-else class="fas fa-circle-notch fa-spin text-[10px]"></i>
                                {{ saving ? 'Salvando...' : 'Salvar' }}
                            </button>
                        </template>
                    </div>
                </div>
            </div>

            <!-- KPIs -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                <!-- Unidades -->
                <div class="p-3 rounded-xl border dark:border-gray-700 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-gray-900/60 shadow-sm flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-300 shrink-0">
                        <i class="fas fa-cubes"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Unidades</p>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white leading-none mt-0.5 tabular-nums">{{ totals.units.toLocaleString('pt-BR') }}</p>
                        <p class="text-[10px] text-gray-400 mt-0.5">no período</p>
                    </div>
                </div>

                <!-- Receita total -->
                <div class="p-3 rounded-xl border dark:border-gray-700 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-gray-900/60 shadow-sm flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-300 shrink-0">
                        <i class="fas fa-sack-dollar"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">VGV Total</p>
                        <p class="text-lg font-bold text-emerald-700 dark:text-emerald-400 leading-none mt-0.5 tabular-nums truncate">{{ fmtBRL(totals.revenue) }}</p>
                        <p class="text-[10px] text-gray-400 mt-0.5">no período</p>
                        <!-- <p class="text-lg font-bold text-emerald-700 dark:text-emerald-400 leading-none mt-0.5 tabular-nums truncate">{{ brlCompact(totals.revenue) }}</p>
                        <p class="text-[10px] text-gray-400 mt-0.5 tabular-nums truncate">{{ fmtBRL(totals.revenue) }}</p> -->
                    </div>
                </div>

                <!-- Ticket médio -->
                <div class="p-3 rounded-xl border dark:border-gray-700 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-gray-900/60 shadow-sm flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center text-violet-600 dark:text-violet-300 shrink-0">
                        <i class="fas fa-tag"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Ticket Médio</p>
                        <p class="text-lg font-bold text-violet-700 dark:text-violet-400 leading-none mt-0.5 tabular-nums truncate">{{ brlCompact(globalTotals.avgTicket) }}</p>
                        <p class="text-[10px] text-gray-400 mt-0.5 tabular-nums truncate">{{ fmtBRL(globalTotals.avgTicket) }}</p>
                    </div>
                </div>

                <!-- Empreendimentos -->
                <div class="p-3 rounded-xl border dark:border-gray-700 bg-gradient-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-gray-900/60 shadow-sm flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-600 dark:text-sky-300 shrink-0">
                        <i class="fas fa-city"></i>
                    </div>
                    <div class="min-w-0">
                        <p class="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Empreendimentos</p>
                        <p class="text-2xl font-bold text-gray-900 dark:text-white leading-none mt-0.5 tabular-nums">{{ filteredRows.length }}</p>
                        <p class="text-[10px] text-gray-400 mt-0.5">
                            <span v-if="activeFilterCount" class="text-amber-500 font-semibold">{{ activeFilterCount }} filtro{{ activeFilterCount > 1 ? 's' : '' }} ativo{{ activeFilterCount > 1 ? 's' : '' }}</span>
                            <span v-else>de {{ rows.length }} total</span>
                        </p>
                    </div>
                </div>
            </div>

            <!-- Barra de filtros -->
            <div class="mt-3 rounded-xl border dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30">
                <!-- Cabeçalho da barra -->
                <button type="button" @click="filterPanelOpen = !filterPanelOpen"
                    class="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-100/80 dark:hover:bg-gray-700/40 transition-colors rounded-xl"
                    :class="filterPanelOpen ? 'rounded-b-none' : ''">
                    <div class="flex items-center gap-2 flex-wrap">
                        <div class="flex items-center gap-1.5">
                            <i class="fas fa-sliders text-[11px]" :class="activeFilterCount ? 'text-indigo-500' : 'text-gray-400'"></i>
                            <span class="text-xs font-semibold" :class="activeFilterCount ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'">
                                Filtros
                            </span>
                        </div>
                        <span v-if="activeFilterCount"
                            class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold leading-none">
                            {{ activeFilterCount }}
                        </span>
                        <span v-if="activeFilterCount" class="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium hidden sm:inline">
                            {{ filteredRows.length }} de {{ rows.length }} empreendimentos
                        </span>
                        <button v-if="activeFilterCount" type="button" @click.stop="clearAllFilters"
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-semibold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                            <i class="fas fa-xmark text-[9px]"></i> Limpar filtros
                        </button>
                    </div>
                    <i class="fas text-[10px] text-gray-400 transition-transform duration-200 ml-2 shrink-0"
                        :class="filterPanelOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                </button>

                <!-- Conteúdo dos filtros -->
                <div v-show="filterPanelOpen" class="px-4 pb-4 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-gray-200 dark:border-gray-700">
                    <!-- Empreendimentos -->
                    <div>
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1.5">
                            <i class="fas fa-building text-indigo-400 text-[10px]"></i>
                            Empreendimentos
                            <span v-if="selectedEnterpriseLabels.length" class="ml-auto px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold">
                                {{ selectedEnterpriseLabels.length }} selecionado(s)
                            </span>
                        </label>
                        <MultiSelector :model-value="selectedEnterpriseLabels"
                            @update:modelValue="v => selectedEnterpriseLabels = Array.isArray(v) ? v : []"
                            :options="enterprisesOptions" placeholder="Todos os empreendimentos" class="z-10" :page-size="600" :select-all="true" />
                    </div>

                    <!-- Cidades -->
                    <div>
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-1.5">
                            <i class="fas fa-location-dot text-indigo-400 text-[10px]"></i>
                            Cidades
                            <span v-if="selectedCityLabels.length" class="ml-auto px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold">
                                {{ selectedCityLabels.length }} selecionada(s)
                            </span>
                        </label>
                        <MultiSelector :model-value="selectedCityLabels"
                            @update:modelValue="v => selectedCityLabels = Array.isArray(v) ? v : []"
                            :options="cityOptions" placeholder="Todas as cidades" class="z-10" :page-size="300" :select-all="true" />
                    </div>
                </div>
            </div>
        </div>

        <!-- ── View Toggle + Resumo ────────────────────────────────────────── -->
        <div class="flex items-center justify-between gap-4 px-1">
            <!-- Chips de resumo rápido -->
            <div class="flex flex-wrap items-center gap-2">
                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40">
                    <i class="fas fa-building text-indigo-400 text-[10px]"></i>
                    <span class="text-xs font-semibold text-indigo-700 dark:text-indigo-300 tabular-nums">{{ filteredRows.length }}</span>
                    <span class="text-[10px] text-indigo-500 dark:text-indigo-400">empreend.</span>
                </div>
                <div v-if="globalTotals.units" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <i class="fas fa-cubes text-gray-400 text-[10px]"></i>
                    <span class="text-xs font-semibold text-gray-700 dark:text-gray-200 tabular-nums">{{ globalTotals.units.toLocaleString('pt-BR') }}</span>
                    <span class="text-[10px] text-gray-400">unidades</span>
                </div>
                <div v-if="globalTotals.revenue" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40">
                    <i class="fas fa-dollar-sign text-emerald-500 text-[10px]"></i>
                    <span class="text-xs font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">{{ brlCompact(globalTotals.revenue) }}</span>
                    <span class="text-[10px] text-emerald-500 dark:text-emerald-400">VGV</span>
                </div>
                <div v-if="activeFilterCount" class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                    <i class="fas fa-filter text-amber-500 text-[9px]"></i>
                    <span class="text-[10px] font-semibold text-amber-700 dark:text-amber-400">{{ activeFilterCount }} filtro{{ activeFilterCount > 1 ? 's' : '' }}</span>
                    <button @click="clearAllFilters" class="ml-1 text-amber-500 hover:text-amber-700 text-[9px]">
                        <i class="fas fa-xmark"></i>
                    </button>
                </div>
            </div>

            <!-- Toggle cards / tabela -->
            <div class="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5 shrink-0 border border-gray-200 dark:border-gray-700">
                <button @click="viewMode = 'cards'"
                    class="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-150"
                    :class="viewMode === 'cards'
                        ? 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 shadow-sm border border-gray-200 dark:border-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'">
                    <i class="fas fa-table-cells-large text-[11px]"></i> Cards
                </button>
                <button @click="viewMode = 'table'"
                    class="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-150"
                    :class="viewMode === 'table'
                        ? 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 shadow-sm border border-gray-200 dark:border-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'">
                    <i class="fas fa-table text-[11px]"></i> Tabela
                </button>
            </div>
        </div>

        <!-- ── Cards View ──────────────────────────────────────────────────── -->
        <template v-if="viewMode === 'cards'">

            <!-- Empty state -->
            <div v-if="!filteredRows.length"
                class="flex flex-col items-center justify-center py-24 text-center">
                <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <i class="fas fa-building-circle-xmark text-gray-300 dark:text-gray-600 text-2xl"></i>
                </div>
                <p class="font-medium text-gray-500 dark:text-gray-400">Nenhum empreendimento nesta projeção</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {{ isAdmin ? 'Clique em "+ Empreendimentos" para adicionar' : 'Ajuste os filtros' }}
                </p>
            </div>

            <!-- Card grid -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                <div v-for="row in filteredRows" :key="rowPairKey(row)"
                    class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all duration-200 group overflow-hidden">

                    <!-- ── Card Header ────────────────────────────────────── -->
                    <div class="p-4 border-b border-gray-100 dark:border-gray-800">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0 flex-1">
                                <h3 class="font-bold text-sm text-gray-900 dark:text-white leading-snug truncate" :title="row.name">
                                    {{ row.name || '—' }}
                                </h3>
                                <div class="flex items-center gap-1.5 mt-2 flex-wrap">
                                    <span v-if="row.erp_id"
                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60">
                                        <i class="fas fa-hashtag text-[8px]"></i>CC {{ row.erp_id }}
                                    </span>
                                    <span v-else
                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800/60">
                                        <i class="fas fa-circle-info text-[8px]"></i>Manual
                                    </span>
                                    <span v-if="row.city" class="inline-flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                        <i class="fas fa-location-dot text-[9px]"></i>{{ row.city }}
                                    </span>
                                </div>
                            </div>
                            <!-- Actions -->
                            <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button @click="openRowDefaultsModal(row)"
                                    v-tippy="'Configurar ticket médio · % Mkt · % Comissão'"
                                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <i class="fas fa-sliders text-xs"></i>
                                </button>
                                <button v-if="!rowDisabled" @click="openCardEdit(row)"
                                    v-tippy="'Editar metas mensais'"
                                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                    <i class="fas fa-pen text-xs"></i>
                                </button>
                            </div>
                        </div>

                        <!-- KPIs compactos do card -->
                        <div class="mt-4 grid grid-cols-2 gap-2">
                            <div class="rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-3 py-2">
                                <p class="text-[9px] uppercase tracking-widest text-indigo-400 dark:text-indigo-500 font-bold">Unidades</p>
                                <p class="text-2xl font-black text-indigo-700 dark:text-indigo-300 tabular-nums leading-none mt-0.5">{{ rowSumUnits(row) }}</p>
                                <p class="text-[9px] text-indigo-400 dark:text-indigo-500 mt-0.5">no período</p>
                            </div>
                            <div class="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 px-3 py-2 min-w-0">
                                <p class="text-[9px] uppercase tracking-widest text-emerald-500 dark:text-emerald-600 font-bold">VGV</p>
                                <p class="text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums leading-none mt-0.5 truncate" :title="fmtBRL(rowSumVgv(row))">
                                    {{ rowSumVgv(row) > 0 ? brlShortFmt(rowSumVgv(row)) : '—' }}
                                </p>
                                <p class="text-[9px] text-emerald-400 dark:text-emerald-600 mt-0.5 truncate">{{ fmtBRL(rowSumVgv(row)) }}</p>
                            </div>
                        </div>

                        <!-- Alerta sem meta -->
                        <div v-if="!rowSumUnits(row) && !rowSumVgv(row)"
                            class="mt-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                            <i class="fas fa-triangle-exclamation text-[10px] text-amber-500"></i>
                            <span class="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Sem metas no período selecionado</span>
                        </div>
                    </div>

                    <!-- ── Estoque ─────────────────────────────────────────── -->
                    <div class="p-4 border-b border-gray-50 dark:border-gray-800/60">
                        <div class="flex items-center justify-between mb-2.5">
                            <span class="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest">Estoque atual</span>
                            <span v-if="stockOf(row).total"
                                class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 tabular-nums bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                {{ stockOf(row).total }} total
                            </span>
                        </div>

                        <template v-if="stockOf(row).hasSummary">
                            <div class="h-3 w-full rounded-full bg-green-400 overflow-hidden flex"
                                v-tippy="`Vendidos: ${stockOf(row).sold} · Reservados: ${stockOf(row).reserved} · Disponíveis: ${stockOf(row).available} · Bloqueados: ${stockOf(row).blocked}`">
                                <div class="h-full bg-rose-500 rounded-l-full transition-all duration-700"
                                    :style="{ width: stockOf(row).total ? Math.min(100, Math.round(stockOf(row).sold / stockOf(row).total * 100)) + '%' : '0%' }" />
                                <div class="h-full bg-amber-400 transition-all duration-700"
                                    :style="{ width: stockOf(row).total ? Math.min(100, Math.round(stockOf(row).reserved / stockOf(row).total * 100)) + '%' : '0%' }" />
                                <div class="h-full bg-slate-400 transition-all duration-700"
                                    :style="{ width: stockOf(row).total ? Math.min(100, Math.round(stockOf(row).blocked / stockOf(row).total * 100)) + '%' : '0%' }" />
                            </div>
                            <div class="grid grid-cols-4 gap-1 mt-3">
                                <div class="text-center px-1 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                                    <p class="text-[9px] text-rose-500 font-bold uppercase tracking-wide">Vendidos</p>
                                    <p class="text-base font-black text-rose-700 dark:text-rose-400 tabular-nums leading-none mt-0.5">{{ stockOf(row).sold }}</p>
                                    <p class="text-[9px] text-rose-400 tabular-nums">{{ stockOf(row).total ? Math.round(stockOf(row).sold / stockOf(row).total * 100) : 0 }}%</p>
                                </div>
                                <div class="text-center px-1 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                                    <p class="text-[9px] text-amber-500 font-bold uppercase tracking-wide">Reserv.</p>
                                    <p class="text-base font-black text-amber-700 dark:text-amber-400 tabular-nums leading-none mt-0.5">{{ stockOf(row).reserved }}</p>
                                    <p class="text-[9px] text-amber-400 tabular-nums">{{ stockOf(row).total ? Math.round(stockOf(row).reserved / stockOf(row).total * 100) : 0 }}%</p>
                                </div>
                                <div class="text-center px-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                                    <p class="text-[9px] text-emerald-600 font-bold uppercase tracking-wide">Disp.</p>
                                    <p class="text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums leading-none mt-0.5">{{ stockOf(row).available }}</p>
                                    <p class="text-[9px] text-emerald-500 tabular-nums">{{ stockOf(row).total ? Math.round(stockOf(row).available / stockOf(row).total * 100) : 0 }}%</p>
                                </div>
                                <div class="text-center px-1 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                                    <p class="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Bloq.</p>
                                    <p class="text-base font-black text-slate-600 dark:text-slate-400 tabular-nums leading-none mt-0.5">{{ stockOf(row).blocked }}</p>
                                    <p class="text-[9px] text-slate-400 tabular-nums">{{ stockOf(row).total ? Math.round(stockOf(row).blocked / stockOf(row).total * 100) : 0 }}%</p>
                                </div>
                            </div>
                        </template>
                        <template v-else-if="stockOf(row).total">
                            <div class="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-800 mb-2"></div>
                            <p class="text-[10px] text-gray-400 dark:text-gray-600 italic">Dados detalhados do ERP indisponíveis · {{ stockOf(row).total }} unid. total</p>
                        </template>
                        <template v-else>
                            <!-- Manual: sem summary nem total → permite informar total de unidades -->
                            <AvailabilityInline
                                :summary="null"
                                :total-units="row.totalUnits"
                                :editable="!rowDisabled && !row.erp_id"
                                @update:totalUnits="(v) => { row.totalUnits = v; rows.value = [...rows.value]; }" />
                        </template>
                    </div>

                    <!-- ── Metas mensais ─────────────────────────────────── -->
                    <div class="p-4 flex-1 flex flex-col">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest">Metas mensais</span>
                            <button v-if="!rowDisabled" @click="openCardEdit(row)"
                                class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-all">
                                <i class="fas fa-pen text-[9px]"></i> Editar
                            </button>
                        </div>

                        <!-- Headers colunas -->
                        <div class="flex items-center gap-2 px-1 mb-1">
                            <span class="text-[9px] text-gray-300 dark:text-gray-700 font-bold uppercase w-14 shrink-0">Mês</span>
                            <div class="flex-1"></div>
                            <span class="text-[9px] text-gray-300 dark:text-gray-700 font-bold uppercase w-8 text-right shrink-0">Un.</span>
                            <span class="text-[9px] text-gray-300 dark:text-gray-700 font-bold uppercase w-28 text-right shrink-0">VGV</span>
                        </div>

                        <!-- Linhas mensais -->
                        <div class="flex-1 overflow-y-auto space-y-px rounded-lg">
                            <div v-for="ym in monthKeys" :key="ym"
                                class="flex items-center gap-0 py-1 px-1 rounded-lg cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-900/10 transition-colors"
                                @click="!rowDisabled && openCardEdit(row)">
                                <span class="text-[10px] font-semibold text-gray-500 dark:text-gray-400 w-14 shrink-0 tabular-nums">
                                    {{ shortMonthLabel(ym) }}
                                </span>
                                <div class="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div class="h-full rounded-full transition-all duration-500"
                                        :class="(row.values?.[ym]?.units || 0) > 0 ? 'bg-indigo-400 dark:bg-indigo-500' : ''"
                                        :style="{ width: rowMaxUnits(row) > 0 ? Math.round((row.values?.[ym]?.units || 0) / rowMaxUnits(row) * 100) + '%' : '0%' }" />
                                </div>
                                <span class="text-xs font-bold w-8 text-right shrink-0 tabular-nums"
                                    :class="(row.values?.[ym]?.units || 0) > 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-200 dark:text-gray-800'">
                                    {{ row.values?.[ym]?.units || 0 }}
                                    <!-- <span v-if="vgvValue(row, ym) > 0" class="text-[9px] text-gray-400 ml-1">({{ brlShortFmt(vgvValue(row, ym)) }} VGV)</span> -->
                                </span>
                                <span class="text-[10px] w-28 text-right shrink-0 tabular-nums font-semibold truncate"
                                    :class="vgvValue(row, ym) > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-200 dark:text-gray-800'">
                                    {{ vgvValue(row, ym) > 0 ? brlShortFmt(vgvValue(row, ym)) : '—' }}
                                </span>
                            </div>
                        </div>

                        <!-- Total row -->
                        <div class="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 px-1">
                            <span class="text-xs font-bold text-gray-700 dark:text-gray-300 w-14 shrink-0">Total</span>
                            <div class="flex-1 h-px bg-gray-100 dark:bg-gray-800"></div>
                            <span class="text-sm font-black text-gray-900 dark:text-white w-8 text-right shrink-0 tabular-nums">{{ rowSumUnits(row) }}</span>
                            <span class="text-xs font-black text-emerald-700 dark:text-emerald-400 w-28 text-right shrink-0 tabular-nums truncate">{{ brlShortFmt(rowSumVgv(row)) }}</span>
                        </div>

                        <!-- Defaults: ticket · mkt · comissão -->
                        <div v-if="row.defaultPrice || row.defaultMarketingPct || row.defaultCommissionPct"
                            class="flex items-center gap-1.5 mt-3 flex-wrap">
                            <span v-if="row.defaultPrice"
                                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[9px] text-gray-500 dark:text-gray-400 font-semibold tabular-nums">
                                <i class="fas fa-tag text-[8px]"></i>{{ brlShortFmt(row.defaultPrice) }}
                            </span>
                            <span v-if="row.defaultMarketingPct"
                                class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[9px] text-gray-500 dark:text-gray-400 font-semibold">
                                Mkt {{ Number(row.defaultMarketingPct).toFixed(1) }}%
                            </span>
                            <span v-if="row.defaultCommissionPct"
                                class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[9px] text-gray-500 dark:text-gray-400 font-semibold">
                                Com {{ Number(row.defaultCommissionPct).toFixed(1) }}%
                            </span>
                        </div>
                    </div>

                </div>
            </div>
        </template>

        <!-- ── Tabela (Grade) ──────────────────────────────────────────────── -->
        <div v-if="viewMode === 'table'"
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
                                        <span class="font-semibold text-emerald-600">{{ fmtBRL(monthTotals[ym]?.revenue || 0) }}</span>
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
                                        :value="moneyBR(vgvValue(r, ym))"
                                        @input="(e) => { const c = ensureCell(r, ym); c.total_manual = true; c.total = parseMoneyBR(e.target.value); setMaskedInputValue(e.target, vgvValue(r, ym)); r.values = { ...r.values }; }"
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

        <!-- ── Modal: Configurações do empreendimento ──────────────────────── -->
        <Teleport to="body">
            <Transition enter-active-class="transition-opacity duration-200" leave-active-class="transition-opacity duration-150"
                enter-from-class="opacity-0" leave-to-class="opacity-0">
                <div v-if="showRowDefaults" class="fixed inset-0 z-[80] flex items-center justify-center p-4">
                    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeRowDefaultsModal"></div>

                    <div class="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800"
                        @click.stop>

                        <!-- Header -->
                        <div class="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800/30 flex items-start justify-between shrink-0">
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <div class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                        <i class="fas fa-sliders text-slate-500 dark:text-slate-400 text-sm"></i>
                                    </div>
                                    <h3 class="font-bold text-gray-900 dark:text-white">Configurações do empreendimento</h3>
                                </div>
                                <p class="text-xs text-gray-400 dark:text-gray-500 ml-10 truncate">{{ rowDefaultsTarget?.name }}</p>
                            </div>
                            <button @click="closeRowDefaultsModal"
                                class="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0 ml-3">
                                <i class="fas fa-times text-sm"></i>
                            </button>
                        </div>

                        <!-- Body -->
                        <div class="px-6 py-5 space-y-5 overflow-y-auto">

                            <!-- Identidade -->
                            <div>
                                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">Identidade</p>
                                <div class="space-y-3">
                                    <div>
                                        <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">Nome de exibição</label>
                                        <input id="row-default-name" v-model="rowDefaultsForm.name"
                                            class="w-full h-10 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 dark:focus:border-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            :disabled="rowDisabled" placeholder="Nome do empreendimento" />
                                    </div>
                                    <div>
                                        <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">
                                            <i class="fas fa-location-dot text-indigo-400 mr-1 text-[10px]"></i>Cidade
                                        </label>
                                        <input id="row-default-city" v-model="rowDefaultsForm.city"
                                            class="w-full h-10 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 dark:focus:border-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            placeholder="Ex.: São Paulo" :disabled="rowDisabled" />
                                    </div>

                                </div>
                            </div>

                            <!-- Defaults financeiros -->
                            <div>
                                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">Defaults financeiros</p>
                                <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div>
                                        <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">
                                            <i class="fas fa-tag text-indigo-400 mr-1 text-[9px]"></i>Ticket médio
                                        </label>
                                        <input id="row-default-price" type="text" inputmode="numeric" :disabled="rowDisabled"
                                            :value="moneyBR(rowDefaultsForm.defaultPrice)"
                                            @input="(e) => { rowDefaultsForm.defaultPrice = parseMoneyBR(e.target.value); setMaskedInputValue(e.target, rowDefaultsForm.defaultPrice); }"
                                            class="w-full h-10 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-right tabular-nums" />
                                    </div>
                                    
                                    <!-- Total de unidades — só empreendimentos manuais -->
                                    <div v-if="!rowDefaultsTarget?.erp_id">
                                        <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">
                                            <i class="fas fa-cubes text-indigo-400 mr-1 text-[10px]"></i>Total unidades
                                        </label>
                                        <input
                                            type="number" min="0" step="1"
                                            v-model.number="rowDefaultsForm.totalUnits"
                                            :disabled="rowDisabled"
                                            class="w-full h-10 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 dark:focus:border-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-right tabular-nums"
                                            placeholder="0" /> 
                                    </div>

                                    <div>
                                        <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">
                                            <i class="fas fa-bullhorn text-violet-400 mr-1 text-[9px]"></i>% Marketing
                                        </label>
                                        <div class="relative">
                                            <input type="number" min="0" max="100" step="0.01"
                                                v-model.number="rowDefaultsForm.defaultMarketingPct" :disabled="rowDisabled"
                                                class="w-full h-10 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 pr-7 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-right tabular-nums" />
                                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">
                                            <i class="fas fa-handshake text-emerald-400 mr-1 text-[9px]"></i>% Comissão
                                        </label>
                                        <div class="relative">
                                            <input type="number" min="0" max="100" step="0.01"
                                                v-model.number="rowDefaultsForm.defaultCommissionPct" :disabled="rowDisabled"
                                                class="w-full h-10 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 pr-7 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-right tabular-nums" />
                                            <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                                        </div>
                                    </div>
                                </div>
                                <!-- Preview valores -->
                                <div v-if="rowDefaultsForm.defaultPrice || rowDefaultsForm.defaultMarketingPct || rowDefaultsForm.defaultCommissionPct"
                                    class="mt-3 flex items-center gap-2 flex-wrap">
                                    <span v-if="rowDefaultsForm.defaultPrice" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 tabular-nums">
                                        <i class="fas fa-tag text-[8px]"></i> {{ brlShortFmt(rowDefaultsForm.defaultPrice) }}/un.
                                    </span>
                                    <span v-if="rowDefaultsForm.defaultMarketingPct" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900 text-[10px] font-semibold text-violet-700 dark:text-violet-400">
                                        Mkt {{ Number(rowDefaultsForm.defaultMarketingPct).toFixed(1) }}%
                                    </span>
                                    <span v-if="rowDefaultsForm.defaultCommissionPct" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                        Com {{ Number(rowDefaultsForm.defaultCommissionPct).toFixed(1) }}%
                                    </span>
                                </div>
                            </div>

                            <!-- CC vinculado -->
                            <div>
                                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">Centro de custo (ERP)</p>
                                <button type="button" :disabled="rowDisabled" @click="openEditEnterpriseModal(rowDefaultsTarget)"
                                    class="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all"
                                    :class="rowDefaultsTarget?.erp_id
                                        ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 hover:border-indigo-400 dark:hover:border-indigo-600'
                                        : 'border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 hover:border-amber-400'">
                                    <div class="flex items-center gap-3">
                                        <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                            :class="rowDefaultsTarget?.erp_id ? 'bg-indigo-100 dark:bg-indigo-900' : 'bg-amber-100 dark:bg-amber-900/50'">
                                            <i class="fas text-sm"
                                                :class="rowDefaultsTarget?.erp_id ? 'fa-hashtag text-indigo-500' : 'fa-triangle-exclamation text-amber-500'"></i>
                                        </div>
                                        <div class="text-left">
                                            <p class="text-xs font-bold"
                                                :class="rowDefaultsTarget?.erp_id ? 'text-indigo-700 dark:text-indigo-300' : 'text-amber-700 dark:text-amber-400'">
                                                {{ rowDefaultsTarget?.erp_id ? `CC ${rowDefaultsTarget.erp_id}` : 'Sem centro de custo' }}
                                            </p>
                                            <p class="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                                {{ rowDefaultsTarget?.erp_id ? 'Clique para trocar o vínculo ERP' : 'Empreendimento manual — clique para vincular' }}
                                            </p>
                                        </div>
                                    </div>
                                    <i class="fas fa-chevron-right text-xs text-gray-300 dark:text-gray-600 shrink-0"></i>
                                </button>
                            </div>

                            <!-- Zona destrutiva -->
                            <div v-if="!rowDisabled" class="pt-1 border-t border-gray-100 dark:border-gray-800">
                                <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">Ações</p>
                                <div class="flex items-center gap-2">
                                    <button type="button"
                                        class="flex-1 h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center gap-2 transition-colors"
                                        @click="rowDefaultsTarget && duplicateRow(rowDefaultsTarget)"
                                        :disabled="!rowDefaultsTarget">
                                        <i class="fas fa-copy text-gray-400"></i> Duplicar
                                    </button>
                                    <button type="button"
                                        class="flex-1 h-9 px-3 rounded-xl border border-red-200 dark:border-red-900 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center gap-2 transition-colors"
                                        @click="rowDefaultsTarget && (removeRow(rowDefaultsTarget), closeRowDefaultsModal())"
                                        :disabled="!rowDefaultsTarget">
                                        <i class="fas fa-trash"></i> Excluir empreendimento
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-between shrink-0">
                            <p class="text-[10px] text-gray-400 dark:text-gray-600">
                                <i class="fas fa-circle-info mr-1"></i>Salvo ao confirmar na tela principal
                            </p>
                            <div class="flex items-center gap-2">
                                <button type="button"
                                    class="h-9 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    @click="closeRowDefaultsModal">
                                    Cancelar
                                </button>
                                <button type="button"
                                    class="h-9 px-5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                    @click="applyRowDefaultsModal" :disabled="rowDisabled">
                                    Aplicar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- ── Modal: Adicionar / Vincular centro de custo ─────────────────── -->
        <Teleport to="body">
            <Transition enter-active-class="transition-opacity duration-200" leave-active-class="transition-opacity duration-150"
                enter-from-class="opacity-0" leave-to-class="opacity-0">
                <div v-if="showAdd" class="fixed inset-0 z-[90] flex items-center justify-center p-4">
                    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeAddModal"></div>

                    <div class="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800"
                        @click.stop>

                        <!-- Header -->
                        <div class="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-indigo-50 to-transparent dark:from-indigo-950/20 flex items-start justify-between shrink-0">
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2 mb-0.5">
                                    <div class="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                                        <i class="fas fa-building text-indigo-500 dark:text-indigo-400 text-sm"></i>
                                    </div>
                                    <h3 class="font-bold text-gray-900 dark:text-white">
                                        {{ pickerMode === 'add' ? 'Adicionar empreendimentos' : 'Vincular centro de custo' }}
                                    </h3>
                                </div>
                                <p class="text-xs text-gray-400 dark:text-gray-500 ml-10">
                                    {{ pickerMode === 'add' ? 'Selecione do ERP ou cadastre manualmente' : 'Selecione o novo vínculo de centro de custo ERP' }}
                                </p>
                            </div>

                            <!-- Tab toggle ERP / Manual (modo add) -->
                            <div class="flex items-center gap-2 shrink-0 ml-4">
                                <div v-if="pickerMode === 'add'" class="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5 border border-gray-200 dark:border-gray-700">
                                    <button type="button" @click="showManualInAdd = false"
                                        class="h-7 px-3 rounded-lg text-xs font-semibold transition-all"
                                        :class="!showManualInAdd
                                            ? 'bg-white dark:bg-gray-900 text-indigo-700 dark:text-indigo-300 shadow-sm border border-gray-200 dark:border-gray-700'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'">
                                        <i class="fas fa-database mr-1 text-[9px]"></i>ERP
                                    </button>
                                    <button type="button" @click="showManualInAdd = true"
                                        class="h-7 px-3 rounded-lg text-xs font-semibold transition-all"
                                        :class="showManualInAdd
                                            ? 'bg-white dark:bg-gray-900 text-amber-700 dark:text-amber-400 shadow-sm border border-gray-200 dark:border-gray-700'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'">
                                        <i class="fas fa-pen mr-1 text-[9px]"></i>Manual
                                    </button>
                                </div>
                                <button @click="closeAddModal"
                                    class="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <i class="fas fa-times text-sm"></i>
                                </button>
                            </div>
                        </div>

                        <!-- ── ERP picker ──────────────────────────────────── -->
                        <template v-if="!showManualInAdd">
                            <!-- Barra de busca -->
                            <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 space-y-3 shrink-0">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div class="relative">
                                        <i class="fas fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                                        <input v-model="search" @focus="store.fetchEnterprisePicker()"
                                            placeholder="Buscar por nome ou ID do ERP…"
                                            class="w-full border border-gray-200 dark:border-gray-700 rounded-md h-10 pl-10 pr-3 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 transition-colors" />
                                    </div>
                                    <div class="relative">
                                        <i class="fas fa-location-dot absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                                        <input v-model="citySearch" placeholder="Buscar por cidade…"
                                            class="w-full border border-gray-200 dark:border-gray-700 rounded-md h-10 pl-10 pr-3 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 transition-colors" />
                                    </div>
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Filtrar por cidades</label>
                                    <MultiSelector :model-value="modalSelectedCities"
                                        @update:modelValue="v => modalSelectedCities = Array.isArray(v) ? v : []"
                                        :options="store.enterprisePickerCities" placeholder="Todas as cidades" :page-size="400" :select-all="true" />
                                </div>
                                <!-- Contagem + seleção -->
                                <div class="flex items-center justify-between">
                                    <span class="text-[10px] text-gray-400">
                                        <span class="font-semibold text-gray-600 dark:text-gray-300">{{ enterprisesFilteredInModal.length }}</span> resultado(s)
                                    </span>
                                    <span v-if="selectedToAdd.length" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold text-indigo-700 dark:text-indigo-400">
                                        <i class="fas fa-check-circle text-[9px]"></i>{{ selectedToAdd.length }} selecionado(s)
                                    </span>
                                </div>
                            </div>

                            <!-- Lista de empreendimentos -->
                            <div class="overflow-y-auto flex-1 divide-y divide-gray-50 dark:divide-gray-800/60">
                                <label v-for="e in enterprisesFilteredInModal" :key="e.id"
                                    class="flex items-center gap-3 px-6 py-3.5 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/10 cursor-pointer transition-colors group"
                                    :class="selectedToAdd.some(s => String(s.id) === String(e.id)) ? 'bg-indigo-50/60 dark:bg-indigo-950/20' : ''">
                                    <input type="checkbox" :value="e" v-model="selectedToAdd"
                                        class="w-4 h-4 accent-indigo-600 shrink-0"
                                        :disabled="pickerMode === 'edit' && selectedToAdd.length > 0 && String(selectedToAdd[0]?.id) !== String(e.id)" />
                                    <div class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                                        <i class="fas fa-building text-gray-400 dark:text-gray-600 group-hover:text-indigo-500 text-xs transition-colors"></i>
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <p class="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{{ e.name }}</p>
                                        <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span v-if="e.city" class="text-[10px] text-gray-400 flex items-center gap-1">
                                                <i class="fas fa-location-dot text-[9px]"></i>{{ e.city }}
                                            </span>
                                        </div>
                                    </div>
                                    <span class="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 shrink-0">
                                        ERP {{ e.id }}
                                    </span>
                                </label>

                                <!-- Estados vazios -->
                                <div v-if="store.enterprisePickerError" class="flex flex-col items-center justify-center py-12 px-6 text-center">
                                    <div class="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-3">
                                        <i class="fas fa-triangle-exclamation text-red-400 text-lg"></i>
                                    </div>
                                    <p class="text-sm font-medium text-red-600 dark:text-red-400">{{ store.enterprisePickerError }}</p>
                                </div>
                                <div v-else-if="!enterprisesFilteredInModal.length" class="flex flex-col items-center justify-center py-12 px-6 text-center">
                                    <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                                        <i class="fas fa-magnifying-glass text-gray-300 dark:text-gray-600 text-lg"></i>
                                    </div>
                                    <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Nenhum resultado encontrado</p>
                                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Tente ajustar os filtros de busca</p>
                                </div>
                            </div>

                            <!-- Footer ERP -->
                            <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-between shrink-0">
                                <span class="text-xs text-gray-400">
                                    {{ selectedToAdd.length ? `${selectedToAdd.length} empreendimento(s) selecionado(s)` : 'Selecione ao menos um' }}
                                </span>
                                <div class="flex items-center gap-2">
                                    <button @click="closeAddModal"
                                        class="h-9 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        Cancelar
                                    </button>
                                    <button @click="addSelected" :disabled="!selectedToAdd.length"
                                        class="h-9 px-5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                        <i class="fas fa-plus text-xs"></i>
                                        {{ pickerMode === 'add' ? 'Adicionar' : 'Confirmar vínculo' }}
                                    </button>
                                </div>
                            </div>
                        </template>

                        <!-- ── Manual form ─────────────────────────────────── -->
                        <template v-else>
                            <div class="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                                <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                                    <i class="fas fa-circle-info text-amber-500 text-sm mt-0.5 shrink-0"></i>
                                    <p class="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                        Empreendimentos manuais não possuem centro de custo ERP. São úteis para planejar lançamentos futuros ainda não cadastrados no sistema.
                                    </p>
                                </div>

                                <!-- Identidade -->
                                <div>
                                    <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">Identidade</p>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">Nome <span class="text-red-400">*</span></label>
                                            <input v-model="manualForm.name"
                                                class="w-full h-10 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 transition-colors"
                                                placeholder="Ex.: Residencial Sol Nascente" />
                                        </div>
                                        <div>
                                            <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">
                                                <i class="fas fa-location-dot text-indigo-400 mr-1 text-[9px]"></i>Cidade <span class="text-red-400">*</span>
                                            </label>
                                            <input v-model="manualForm.city"
                                                class="w-full h-10 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-300 transition-colors"
                                                placeholder="Ex.: Campinas" />
                                        </div>
                                    </div>
                                </div>

                                <!-- Financeiros -->
                                <div>
                                    <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">Dados financeiros (opcionais)</p>
                                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div>
                                            <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">Total de unidades</label>
                                            <input type="number" min="0" v-model.number="manualForm.totalUnits"
                                                class="w-full h-10 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 text-right tabular-nums transition-colors"
                                                placeholder="0" />
                                        </div>
                                        <div>
                                            <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">
                                                <i class="fas fa-tag text-indigo-400 mr-1 text-[9px]"></i>Ticket médio
                                            </label>
                                            <input type="text" inputmode="numeric" :value="moneyBR(manualForm.defaultPrice)"
                                                @input="(e) => { manualForm.defaultPrice = parseMoneyBR(e.target.value); setMaskedInputValue(e.target, manualForm.defaultPrice); }"
                                                class="w-full h-10 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 text-right tabular-nums transition-colors" />
                                        </div>
                                        <div>
                                            <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">% Marketing</label>
                                            <div class="relative">
                                                <input type="number" min="0" max="100" step="0.01" v-model.number="manualForm.defaultMarketingPct"
                                                    class="w-full h-10 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 pr-7 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-right tabular-nums transition-colors" />
                                                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1.5">% Comissão</label>
                                            <div class="relative">
                                                <input type="number" min="0" max="100" step="0.01" v-model.number="manualForm.defaultCommissionPct"
                                                    class="w-full h-10 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 pr-7 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/40 text-right tabular-nums transition-colors" />
                                                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Footer Manual -->
                            <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-between shrink-0">
                                <p class="text-[10px] text-gray-400 dark:text-gray-600">
                                    <i class="fas fa-circle-info mr-1"></i>Campos obrigatórios: Nome e Cidade
                                </p>
                                <div class="flex items-center gap-2">
                                    <button @click="closeAddModal"
                                        class="h-9 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        Cancelar
                                    </button>
                                    <button @click="addManualEnterprise" :disabled="!manualForm.name || !manualForm.city"
                                        class="h-9 px-5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors shadow-sm shadow-emerald-200 dark:shadow-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                        <i class="fas fa-plus text-xs"></i>Criar empreendimento
                                    </button>
                                </div>
                            </div>
                        </template>

                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- ── Modal: Confirmação de remoção ────────────────────────────────── -->
        <Teleport to="body">
            <Transition enter-active-class="transition-opacity duration-200" leave-active-class="transition-opacity duration-150"
                enter-from-class="opacity-0" leave-to-class="opacity-0">
                <div v-if="confirmOpen" class="fixed inset-0 z-[95] flex items-center justify-center p-4">
                    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="confirmOpen = false"></div>

                    <div class="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800"
                        @click.stop>

                        <!-- Header destrutivo -->
                        <div class="px-6 py-5 border-b border-red-100 dark:border-red-900/40 bg-gradient-to-r from-red-50 to-transparent dark:from-red-950/20 flex items-start gap-4">
                            <div class="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                                <i class="fas fa-trash text-red-500 dark:text-red-400"></i>
                            </div>
                            <div class="min-w-0 flex-1">
                                <h3 class="font-bold text-gray-900 dark:text-white">Confirmar exclusão</h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Esta ação removerá <strong class="text-red-600 dark:text-red-400">{{ pairsToRemove.length }} empreendimento{{ pairsToRemove.length > 1 ? 's' : '' }}</strong> permanentemente da projeção.
                                </p>
                            </div>
                            <button @click="confirmOpen = false"
                                class="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
                                <i class="fas fa-times text-sm"></i>
                            </button>
                        </div>

                        <!-- Lista de itens a remover -->
                        <div class="px-6 py-4 max-h-64 overflow-y-auto">
                            <p class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 mb-3">Serão excluídos</p>
                            <ul class="space-y-2">
                                <li v-for="p in pairsToRemove"
                                    :key="p.enterprise_key + '|' + p.alias_id + '|' + (p.erp_id || '')"
                                    class="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
                                    <div class="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                                        <i class="fas fa-minus text-red-500 text-[10px]"></i>
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <p class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{{ p.name }}</p>
                                        <p class="text-[10px] text-gray-400 font-mono mt-0.5 truncate">
                                            <span v-if="p.erp_id">CC {{ p.erp_id }}</span>
                                            <span v-else class="text-amber-500">Manual</span>
                                            <span class="mx-1 text-gray-300 dark:text-gray-700">·</span>
                                            alias: {{ p.alias_id }}
                                        </p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <!-- Aviso -->
                        <div class="px-6 pb-4">
                            <div class="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                                <i class="fas fa-triangle-exclamation text-amber-500 text-sm mt-0.5 shrink-0"></i>
                                <p class="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                    Todas as <strong>linhas de metas</strong> e <strong>defaults</strong> desses empreendimentos serão excluídos definitivamente do backend. Esta ação não pode ser desfeita.
                                </p>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex items-center justify-end gap-2 shrink-0">
                            <button @click="confirmOpen = false"
                                class="h-9 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                Cancelar
                            </button>
                            <button @click="confirmRemovalAndSave"
                                class="h-9 px-5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-colors shadow-sm shadow-red-200 dark:shadow-red-900 flex items-center gap-2">
                                <i class="fas fa-trash text-xs"></i>Excluir e salvar
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- ── Modal: edição mensal por card ─────────────────────────────── -->
        <Teleport to="body">
            <Transition enter-active-class="transition-opacity duration-200" leave-active-class="transition-opacity duration-150"
                enter-from-class="opacity-0" leave-to-class="opacity-0">
                <div v-if="cardEditOpen && cardEditRow" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <!-- Backdrop -->
                    <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeCardEdit"></div>

                    <!-- Panel -->
                    <div class="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">

                        <!-- Header -->
                        <div class="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between shrink-0 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-950/20">
                            <div class="min-w-0 flex-1">
                                <h2 class="font-bold text-gray-900 dark:text-white truncate text-base">{{ cardEditRow.name }}</h2>
                                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span v-if="cardEditRow.erp_id"
                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                        <i class="fas fa-hashtag text-[8px]"></i>CC {{ cardEditRow.erp_id }}
                                    </span>
                                    <span v-if="cardEditRow.city" class="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                                        <i class="fas fa-location-dot text-[9px]"></i>{{ cardEditRow.city }}
                                    </span>
                                </div>
                                <!-- KPIs rápidos no header do modal -->
                                <div class="flex items-center gap-4 mt-3">
                                    <div>
                                        <p class="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Total un.</p>
                                        <p class="text-lg font-black text-indigo-700 dark:text-indigo-300 tabular-nums leading-none">{{ rowSumUnits(cardEditRow) }}</p>
                                    </div>
                                    <div class="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
                                    <div>
                                        <p class="text-[9px] uppercase tracking-widest text-gray-400 font-bold">VGV total</p>
                                        <p class="text-lg font-black text-emerald-700 dark:text-emerald-400 tabular-nums leading-none">{{ brlShortFmt(rowSumVgv(cardEditRow)) }}</p>
                                        <p class="text-[9px] text-gray-400 tabular-nums mt-0.5">{{ fmtBRL(rowSumVgv(cardEditRow)) }}</p>
                                    </div>
                                </div>
                            </div>
                            <button @click="closeCardEdit"
                                class="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0 ml-4">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <!-- Months list -->
                        <div class="overflow-y-auto flex-1">
                            <!-- Col headers -->
                            <div class="sticky top-0 z-10 flex items-center gap-3 px-6 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                                <span class="text-[9px] font-bold uppercase tracking-widest text-gray-400 w-24 shrink-0">Mês</span>
                                <span class="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex-1 text-center">Unidades</span>
                                <span class="text-[9px] font-bold uppercase tracking-widest text-gray-400 flex-1 text-center">Ticket médio</span>
                                <span class="text-[9px] font-bold uppercase tracking-widest text-gray-400 w-32 text-right shrink-0">VGV</span>
                            </div>

                            <div v-for="ym in monthKeys" :key="ym"
                                class="flex items-center gap-3 px-6 py-3 border-b border-gray-50 dark:border-gray-800/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/10 transition-colors"
                                :class="(ensureCell(cardEditRow, ym).units || 0) > 0 ? 'bg-white dark:bg-transparent' : 'opacity-75'">

                                <!-- Month label -->
                                <div class="w-24 shrink-0">
                                    <p class="text-sm font-bold text-gray-800 dark:text-gray-100">{{ shortMonthLabel(ym) }}</p>
                                    <p class="text-[10px] text-gray-400 tabular-nums font-mono">{{ ym }}</p>
                                </div>

                                <!-- Units -->
                                <div class="flex-1">
                                    <input type="number" min="0"
                                        v-model.number="ensureCell(cardEditRow, ym).units"
                                        @input="onUnitsInput(cardEditRow, ym)"
                                        class="w-full h-10 px-3 rounded-xl border-2 text-center font-bold text-base tabular-nums transition-all focus:outline-none"
                                        :class="(ensureCell(cardEditRow, ym).units || 0) > 0
                                            ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 focus:border-indigo-400'
                                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 focus:border-indigo-300'"
                                        placeholder="0" />
                                </div>

                                <!-- Ticket -->
                                <div class="flex-1">
                                    <input type="text" inputmode="numeric"
                                        :value="moneyBR(ensureCell(cardEditRow, ym).price || (Number(ensureCell(cardEditRow, ym).units) > 0 ? cardEditRow.defaultPrice : 0))"
                                        @input="e => { const c = ensureCell(cardEditRow, ym); const p = parseMoneyBR(e.target.value); c.price = p; if (!c.total_manual) c.total = Number(c.units) * p; cardEditRow.values = { ...cardEditRow.values }; }"
                                        class="w-full h-10 px-3 rounded-xl border-2 text-right font-semibold text-sm tabular-nums transition-all focus:outline-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:border-emerald-300 dark:focus:border-emerald-700" />
                                </div>

                                <!-- VGV display -->
                                <div class="w-32 text-right shrink-0">
                                    <p class="text-sm font-bold tabular-nums"
                                        :class="vgvValue(cardEditRow, ym) > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-200 dark:text-gray-800'">
                                        {{ vgvValue(cardEditRow, ym) > 0 ? brlShortFmt(vgvValue(cardEditRow, ym)) : '—' }}
                                    </p>
                                    <p v-if="vgvValue(cardEditRow, ym) > 0" class="text-[9px] text-gray-400 tabular-nums mt-0.5">{{ fmtBRL(vgvValue(cardEditRow, ym)) }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-800/30">
                            <div class="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                <span class="font-black text-indigo-700 dark:text-indigo-300 tabular-nums text-base">{{ rowSumUnits(cardEditRow) }}</span>
                                <span class="text-gray-400 mx-1 text-xs">un. ·</span>
                                <span class="font-black text-emerald-700 dark:text-emerald-400 tabular-nums text-base">{{ brlShortFmt(rowSumVgv(cardEditRow)) }}</span>
                                <span class="text-[9px] text-gray-400 block tabular-nums mt-0.5">{{ fmtBRL(rowSumVgv(cardEditRow)) }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <button @click="closeCardEdit"
                                    class="h-9 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    Fechar
                                </button>
                                <button v-if="dirty" @click="onSaveClick" :disabled="saving"
                                    class="h-9 px-5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors disabled:opacity-60 flex items-center gap-2 shadow-sm shadow-emerald-200 dark:shadow-emerald-900">
                                    <i v-if="!saving" class="fas fa-save text-xs"></i>
                                    <i v-else class="fas fa-circle-notch fa-spin text-xs"></i>
                                    {{ saving ? 'Salvando...' : 'Salvar tudo' }}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </Transition>
        </Teleport>

    </div>
</template>
