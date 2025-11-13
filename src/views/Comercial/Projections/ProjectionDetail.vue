<script setup>
import { onMounted, ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import { useProjectionsStore } from '@/stores/Comercial/Projections/projectionsStore';
import ProjectionLogsDrawer from './components/ProjectionLogsDrawer.vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import API_URL from '@/config/apiUrl';
import MultiSelector from '@/components/UI/MultiSelector.vue';

/* ===== Helpers ===== */
function getToken() { return localStorage.getItem('token'); }
async function requestWithAuth(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken(); if (token) headers.set('Authorization', `Bearer ${token}`);
    const isForm = options.body instanceof FormData;
    if (!isForm && !headers.has('Content-Type') && options.method && options.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
    }
    const res = await fetch(url, { ...options, headers });
    const tryJson = async () => res.json().catch(() => ({}));
    if (!res.ok) { const j = await tryJson(); throw new Error(j?.error || j?.message || `HTTP ${res.status}`); }
    return tryJson();
}

/* ===== Stores & route ===== */
const route = useRoute();
const store = useProjectionsStore();
const auth = useAuthStore();

const id = Number(route.params.id);
const isAdmin = computed(() => auth?.user?.role === 'admin');

// Inline edit do nome
const editingName = ref(false);
const tempName = ref('');

function startEditName() {
    if (!isAdmin.value) return;
    tempName.value = store.detail?.projection?.name || '';
    editingName.value = true;
    nextTick(() => {
        document.getElementById('proj-name-input')?.focus();
    });
}

async function commitName() {
    const current = store.detail?.projection?.name || '';
    const next = (tempName.value || '').trim();
    editingName.value = false;
    if (!next || next === current) return; // sem mudança
    await store.updateMeta(id, { name: next });
}

function cancelName() {
    editingName.value = false;
}
/* ===== Constantes / estado ===== */
// chaves canônicas (para backend) e labels para UI
const monthKeys = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const monthLabels = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const ym = (y, mm) => `${y}-${mm}`;

const year = ref(null);

/**
 * Estrutura local de edição:
 * rows: [{
 *   erp_id: string,
 *   alias_id: string ('default' ou uuid para cópias),
 *   name: string, // rótulo exibido
 *   defaultPrice: number,
 *   values: { 'YYYY-MM': { units: number, price: number } }
 * }]
 */
const rows = ref([]);

/* Para confirmação de remoção */
const originalPairs = ref(new Set()); // pares "erp|alias" carregados do backend
const confirmOpen = ref(false);
const pairsToRemove = ref([]); // [{erp_id, alias_id, name}]

/* Picker de empreendimentos (modal de adicionar) */
const enterprises = ref([]); // [{ id: <erp_id>, name }]
const search = ref('');
const showAdd = ref(false);
const selectedToAdd = ref([]);

/* ===== Carregar empreendimentos (picker) ===== */
async function loadEnterprises() {
    const data = await requestWithAuth(`${API_URL}/projections/enterprise-picker`);
    enterprises.value = data.results || data || [];
}

/* ===== Inflar do backend ===== */
function inflateFromBackend() {
    const detail = store.detail;
    if (!detail?.projection) return;
    year.value = detail.projection.year;

    // Defaults por empreendimento/alias
    const dfltMap = new Map(); // key: erp|alias => { defaultPrice, name }
    for (const d of (detail.enterprise_defaults || [])) {
        const key = `${String(d.erp_id)}|${String(d.alias_id || 'default')}`;
        dfltMap.set(key, {
            defaultPrice: Number(d.default_avg_price || 0),
            name: d.enterprise_label || d.enterprise_name_cache || null,
        });
    }

    // Linhas
    const map = new Map();
    for (const l of (detail.lines || [])) {
        const key = `${String(l.erp_id)}|${String(l.alias_id || 'default')}`;
        if (!map.has(key)) map.set(key, {
            erp_id: String(l.erp_id),
            alias_id: String(l.alias_id || 'default'),
            name: l.enterprise_label || l.enterprise_name_cache || dfltMap.get(key)?.name || String(l.erp_id),
            defaultPrice: dfltMap.get(key)?.defaultPrice || 0,
            values: {}
        });
        map.get(key).values[l.year_month] = {
            units: Number(l.units_target || 0),
            price: Number(l.avg_price_target || 0),
        };
    }

    // Defaults sem linhas (aparecem para permitir edição)
    for (const [key, v] of dfltMap.entries()) {
        if (!map.has(key)) {
            const [erp_id, alias_id] = key.split('|');
            map.set(key, {
                erp_id, alias_id,
                name: v.name || erp_id,
                defaultPrice: v.defaultPrice || 0,
                values: {}
            });
        }
    }

    const arr = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    rows.value = arr;

    // Snapshot para detectar remoções
    originalPairs.value = new Set(arr.map(r => `${r.erp_id}|${r.alias_id}`));

    // Estado limpo após sincronizar com o backend
    dirty.value = false;
}

/* ===== Init ===== */
async function init() {
    await store.fetchDetail(id);
    inflateFromBackend();
    // tenta re-aplicar rascunho local, caso exista
    loadDraftIfAny();
    if (isAdmin.value) await loadEnterprises();
}
onMounted(init);
watch(() => store.detail, () => {
    inflateFromBackend();
    loadDraftIfAny(); // se houver rascunho, re-aplica
});

/* ===== Ações da grade ===== */
function uuid() {
    return (crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
}

function addSelected() {
    const ids = selectedToAdd.value.map(x => String(x.id || x.erp_id || x));
    for (const erp_id of ids) {
        const already = rows.value.find(r => r.erp_id === erp_id && String(r.alias_id) === 'default');
        if (!already) {
            const name = enterprises.value.find(e => String(e.id) === erp_id)?.name || erp_id;
            rows.value.push({ erp_id, alias_id: 'default', name, defaultPrice: 0, values: {} });
        }
    }
    selectedToAdd.value = [];
    showAdd.value = false;
}

// chave unica por linha
const keyOf = (r) => `${String(r.erp_id)}|${String(r.alias_id || 'default')}`

// estado de edição inline por campo
// ex.: edit['123|default'] = { name: true, price: false }
const edit = ref({})

// bloqueio geral de edição da linha
const rowDisabled = computed(() => !!(store.detail?.projection?.is_locked) || !isAdmin.value)

function startEdit(r, field) {
    if (rowDisabled.value) return
    const k = keyOf(r)
    edit.value[k] ??= {}
    edit.value[k][field] = true
    nextTick(() => {
        const el = document.getElementById(`in-${field}-${k}`)
        el?.focus()
        if (field === 'name') el?.select()
    })
}
function stopEdit(r, field) {
    const k = keyOf(r)
    if (edit.value[k]) edit.value[k][field] = false
}
function isEditing(r, field) {
    const k = keyOf(r)
    return !!(edit.value[k]?.[field])
}

function shallowCloneRow(r) {
    const out = {
        erp_id: r.erp_id,
        alias_id: uuid(),
        name: (r.name || r.erp_id) + ' (cópia)',
        defaultPrice: Number(r.defaultPrice || 0),
        values: {}
    };
    for (const [k, v] of Object.entries(r.values || {})) {
        out.values[k] = { units: Number(v.units || 0), price: Number(v.price || 0) };
    }
    return out;
}
function duplicateRow(row) { rows.value.push(shallowCloneRow(row)); }
function removeRow(row) { rows.value = rows.value.filter(r => !(r.erp_id === row.erp_id && r.alias_id === row.alias_id)); }

/* ===== Regras de input ===== */
/** Ao digitar unidades:
 * - se units <= 0 -> zera preço
 * - se units > 0 e preço vazio -> usa defaultPrice
 */
function onUnitsInput(row, monthKey) {
    row.values[monthKey] ||= { units: 0, price: 0 };
    const cell = row.values[monthKey];
    const units = Number(cell.units || 0);
    const def = Number(row.defaultPrice || 0);

    if (units <= 0) {
        cell.units = 0;
        cell.price = 0;
    } else if (!Number(cell.price || 0) && def > 0) {
        cell.price = def;
    }
    row.values = { ...row.values };
}

/* ===== Persistência (com duplo-cheque para remoções) ===== */
function computeRemovals() {
    const currentPairs = new Set(rows.value.map(r => `${r.erp_id}|${r.alias_id}`));
    const removedPairs = [];
    for (const key of originalPairs.value) {
        if (!currentPairs.has(key)) {
            const [erp_id, alias_id] = key.split('|');
            removedPairs.push({
                erp_id, alias_id,
                name: store.detail?.enterprise_defaults?.find(d => `${d.erp_id}|${d.alias_id || 'default'}` === key)?.enterprise_name_cache
                    || rows.value.find(r => r.erp_id === erp_id)?.name
                    || erp_id
            });
        }
    }
    return removedPairs;
}

const saving = ref(false);

async function onSaveClick() {
    const removed = computeRemovals();
    if (removed.length > 0) {
        pairsToRemove.value = removed;
        confirmOpen.value = true; // abre modal de duplo-cheque
    } else {
        await doSave({ removeMissing: false });
    }
}

async function confirmRemovalAndSave() {
    confirmOpen.value = false;
    await doSave({ removeMissing: true });
}

async function doSave({ removeMissing }) {
    if (!year.value) return;
    saving.value = true;
    try {
        // LINES
        const map = new Map();
        for (const r of rows.value) {
            for (const mm of monthKeys) {
                const key = ym(year.value, mm);
                const cell = r.values[key] || { units: 0, price: 0 };
                const k = `${r.erp_id}|${r.alias_id}|${key}`;
                map.set(k, {
                    erp_id: r.erp_id,
                    alias_id: r.alias_id || 'default',
                    year_month: key,
                    units_target: Number(cell.units || 0),
                    avg_price_target: Number(cell.price || 0),
                    enterprise_name_cache: r.name
                });
            }
        }
        const linePayload = [...map.values()];
        await store.saveLines(id, linePayload, { removeMissing });

        // DEFAULTS
        if (isAdmin.value) {
            const defaultsPayload = rows.value.map(r => ({
                erp_id: r.erp_id,
                alias_id: r.alias_id || 'default',
                default_avg_price: Number(r.defaultPrice || 0),
                enterprise_name_cache: r.name
            }));
            await store.saveDefaults(id, defaultsPayload, { removeMissing });
        }

        // Recarregar e atualizar snapshot
        await store.fetchDetail(id);
        inflateFromBackend();

        // salvou? remove rascunho
        clearDraft();
    } finally {
        saving.value = false;
    }
}

/* ===== Meta (lock/unlock) ===== */
async function toggleLock() {
    const cur = store.detail?.projection?.is_locked;
    await store.updateMeta(id, { is_locked: !cur });
}
 
/* ===== Totais (reativos aos filtros do cabeçalho) ===== */
const fmtBRL = (v) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00';
const totals = computed(() => {
  const out = { units: 0, revenue: 0 };
  // usa APENAS o que está visível após os filtros (filteredRows)
  for (const r of filteredRows.value) {
    for (const mm of monthKeys) {
      const cell = r.values[ym(year.value, mm)];
      if (!cell) continue;
      const u = Number(cell.units || 0);
      const price = Number(cell.price || 0);
      const vgv = Number(cell.total ?? 0);
      out.units += u;
      // prioriza total (VGV) digitado; se não houver, cai para units * price
      out.revenue += vgv > 0 ? vgv : (u * price);
    }
  }
  return out;
});

/* ===== Seletor de Empreendimentos (somente; baseado APENAS na projeção) ===== */
const selectedEnterpriseLabels = ref([]); // nomes selecionados

// Lista única de empreendimentos que existem nas rows (projeção)
const projectionEnterprises = computed(() => {
    // Dedup por erp_id, mantendo o primeiro name disponível
    const map = new Map(); // id -> name
    for (const r of rows.value || []) {
        const id = String(r.erp_id);
        if (!map.has(id)) map.set(id, r.name || id);
    }
    // Ordena por label (name)
    return [...map.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
});

// Options exibidas no MultiSelector (somente nomes que estão na projeção)
const enterprisesOptions = computed(() =>
    projectionEnterprises.value.map(e => e.name)
);

// name -> id (apenas dos que estão na projeção)
const enterpriseIdByName = computed(() => {
    const m = new Map();
    for (const e of projectionEnterprises.value) m.set(e.name, String(e.id));
    return m;
});

// Seleção atual convertida em ids (usado para filtrar a grade)
const selectedEnterpriseIds = computed(() => {
    const ids = new Set();
    for (const name of selectedEnterpriseLabels.value || []) {
        const id = enterpriseIdByName.value.get(name);
        if (id) ids.add(id);
    }
    return ids;
});

// Filtra as linhas exibidas (sem seleção => mostra tudo)
const filteredRows = computed(() => {
    if (!selectedEnterpriseLabels.value.length) return rows.value;
    const ids = selectedEnterpriseIds.value;
    return rows.value.filter(r => ids.has(String(r.erp_id)));
});

// Se rows mudarem (recarregar projeção, etc.), limpa seleções inexistentes
watch(rows, () => {
    const allowed = new Set(enterprisesOptions.value);
    selectedEnterpriseLabels.value = (selectedEnterpriseLabels.value || []).filter(n => allowed.has(n));
}, { deep: true });

/* ===== Rascunho local + proteção ===== */
const draftKey = computed(() => `proj:${id}:draft`);
const dirty = ref(false);
let draftTimer = null;

function snapshotRows() {
    return { year: year.value, rows: rows.value, _ts: new Date().toISOString() };
}
function markDirty() {
    if (saving.value) return;
    dirty.value = true;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
        localStorage.setItem(draftKey.value, JSON.stringify(snapshotRows()));
    }, 500);
}
function loadDraftIfAny() {
    try {
        const raw = localStorage.getItem(draftKey.value);
        if (!raw) return false;
        const data = JSON.parse(raw);
        if (!data?.rows) return false;
        rows.value = data.rows;
        if (data.year) year.value = data.year;
        dirty.value = true;
        return true;
    } catch { return false; }
}
function clearDraft() {
    localStorage.removeItem(draftKey.value);
    dirty.value = false;
}
function discardChangesAndReloadFromBackend() {
    clearDraft();
    inflateFromBackend();
}
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

// observar mudanças (inclusive duplicar/remover/inputs)
watch(rows, () => markDirty(), { deep: true });


const chipClass = {
    active(v) {
        return v
            ? 'bg-blue-200 text-blue-700 border-blue-400'
            : 'bg-gray-200 text-gray-600 border-gray-400';
    },
    locked(v) {
        return v
            ? 'bg-emerald-200 text-emerald-700 border-emerald-400'
            : 'bg-red-200 text-red-700 border-red-400';
    }
};
</script>

<template>
    <div class="p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto">
        <!-- Header / status -->
        <div
            class="rounded-2xl border dark:border-gray-700 bg-white/80 dark:bg-gray-800 p-4 md:p-5 shadow-sm dark:shadow-lg">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div class="min-w-0">
                    <h1
                        class="text-2xl font-semibold leading-tight text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <!-- Nome: visual vs edição -->
                        <span v-if="!editingName" @click="startEditName"
                            class="cursor-text hover:underline decoration-dotted underline-offset-4">
                            {{ store.detail?.projection?.name }}
                        </span>
                        <input v-else id="proj-name-input" v-model="tempName" @keyup.enter="commitName"
                            @keyup.esc="cancelName" @blur="commitName" type="text"
                            class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                            :maxlength="120" />

                        <!-- Chip de status -->
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-medium border"
                            :class="chipClass.locked(store.detail?.projection?.is_locked)">
                            {{ store.detail?.projection?.is_locked ? 'Bloqueada' : 'Aberta' }}
                        </span>
                    </h1>
                    <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Ano {{ year }}</p>
                </div>
                <!-- dentro do header, no bloco de botões -->
                <div class="flex items-center gap-3 flex-wrap md:justify-end">
                    <!-- Chips de status (sempre visíveis) -->
                    <div class="flex items-center gap-2">
                        <span class="px-2.5 py-1 rounded-full text-[11px] font-medium border"
                            :class="chipClass.active(store.detail?.projection?.is_active)">
                            {{ store.detail?.projection?.is_active ? 'Ativa' : 'Inativa' }}
                        </span>
                    </div>

                    <!-- separador visual -->
                    <div class="hidden md:block w-px h-6 bg-gray-200 dark:bg-gray-700"></div>

                    <!-- Ações (ordem e hierarquia) -->
                    <div class="flex items-center gap-2">
                        <!-- Alternar Ativa/Inativa -->
                        <button v-if="isAdmin"
                            @click="store.updateMeta(id, { is_active: !Boolean(store.detail?.projection?.is_active) })"
                            class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 hover:bg-gray-50 dark:bg-gray-900/70">
                            {{ store.detail?.projection?.is_active ? 'Inativar' : 'Ativar' }}
                        </button>

                        <!-- Bloquear/Desbloquear -->
                        <button v-if="isAdmin" @click="toggleLock"
                            class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 hover:bg-gray-50 dark:bg-gray-900/70">
                            {{ store.detail?.projection?.is_locked ? 'Desbloquear' : 'Bloquear' }}
                        </button>

                        <!-- Adicionar empreendimentos (só se aberta) -->
                        <button v-if="isAdmin && !store.detail?.projection?.is_locked" @click="showAdd = true"
                            class="h-9 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm">
                            Adicionar Empreendimentos
                        </button>

                        <!-- Cancelar alterações (só se houver dirty e aberta) -->
                        <button v-if="isAdmin && !store.detail?.projection?.is_locked && dirty"
                            @click="discardChangesAndReloadFromBackend"
                            class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 hover:bg-gray-50 dark:bg-gray-900/70">
                            Cancelar alterações
                        </button>

                        <!-- Salvar (primário) -->
                        <button v-if="isAdmin && !store.detail?.projection?.is_locked" @click="onSaveClick"
                            :disabled="saving || !year"
                            class="h-9 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60 shadow-sm">
                            {{ saving ? 'Salvando...' : 'Salvar' }}
                        </button>
                    </div>
                </div>

            </div>

            <!-- KPIs + Seletor de Empreendimentos -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <!-- KPIs -->
                <div class="p-3 rounded-xl border dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 shadow-sm">
                    <p class="text-[11px] uppercase tracking-wide text-gray-500">Unidades projetadas</p>
                    <p class="text-lg font-semibold">{{ totals.units }}</p>
                </div>
                <div class="p-3 rounded-xl border dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 shadow-sm">
                    <p class="text-[11px] uppercase tracking-wide text-gray-500">Receita projetada</p>
                    <p class="text-lg font-semibold">{{ fmtBRL(totals.revenue) }}</p>
                </div>

                <!-- Seletor de Empreendimentos (ADICIONADO) -->
                <div class="p-3 rounded-xl border dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 shadow-sm">
                    <label class="block text-[11px] font-medium mb-1 text-gray-700 dark:text-gray-300">
                        <i class="fas fa-city mr-1"></i> Empreendimentos (filtrar exibição)
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
                    <tr class="text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800">
                        <th class="px-4 py-3 text-left w-[380px] sticky left-0 z-40 bg-inherit">Empreendimento</th>
                        <th v-for="(mm, i) in monthKeys" :key="mm"
                            class="px-4 py-3 text-center font-medium tracking-wide">
                            {{ monthLabels[i] }}/{{ year }}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <!-- usar filteredRows para respeitar seleção -->
                    <tr v-for="(r, idx) in filteredRows" :key="`${r.erp_id}@@${r.alias_id}`"
                        :class="idx % 2 ? 'bg-gray-200/40 dark:bg-gray-700/40' : 'bg-white/0'">
                        <!-- Coluna fixa -->
                        <td class="px-3 py-3 align-top sticky left-0 z-20 border-r dark:border-gray-700"
                            :class="idx % 2 ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'">

                            <!-- Linha compacta: Nome (inline-edit) • Ticket médio (inline-edit) • Ações -->
                            <div class="flex flex-wrap items-end gap-x-4 gap-y-2">
                                <!-- Nome exibido: parece texto, vira input ao clicar -->
                                <div class="flex justify-between md:min-w-[400px]">

                                    <div>
                                        <label class="text-[11px] text-gray-500 block">Centro de Custo: {{ r.erp_id
                                            }}</label>
                                        <!-- "texto" clicável -->
                                        <div v-if="!isEditing(r, 'name')" @click="startEdit(r, 'name')"
                                            class="h-9 px-2 rounded flex items-center cursor-text">
                                            <span class="truncate">{{ r.name || 'Clique para editar' }} </span>
                                        </div>

                                        <!-- input quando editando -->
                                        <input v-else :id="`in-name-${r.erp_id}|${r.alias_id}`" v-model="r.name"
                                            @blur="stopEdit(r, 'name')" @keyup.enter="stopEdit(r, 'name')"
                                            :disabled="rowDisabled"
                                            class="w-full h-9 px-2 rounded focus:outline-none" />
                                    </div>

                                    <div class="flex gap-2">
                                        <div>
                                            <label class="text-[11px] text-gray-500 block">Ticket médio padrão</label>
                                            <!-- "texto" clicável -->
                                            <div v-if="!isEditing(r, 'price')" @click="startEdit(r, 'price')"
                                                class="h-9 px-2 rounded flex items-center cursor-text">
                                                <span class="tabular-nums">{{ fmtBRL(Number(r.defaultPrice || 0))
                                                    }}</span>
                                            </div>
                                            <!-- input quando editando -->
                                            <input v-else :id="`in-price-${r.erp_id}|${r.alias_id}`" type="number"
                                                min="0" step="0.01" v-model.number="r.defaultPrice"
                                                @blur="stopEdit(r, 'price')" @keyup.enter="stopEdit(r, 'price')"
                                                :disabled="rowDisabled"
                                                class="w-full h-9 px-2 rounded focus:outline-none" />
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
                        <td v-for="(mm, i) in monthKeys" :key="mm" class="px-3 py-2 align-top">
                            <div class="flex gap-2">
                                <div>
                                    <label class="text-[11px] text-gray-500 block text-center">Qtd. Unidades</label>
                                    <input :disabled="!isAdmin || store.detail?.projection?.is_locked"
                                        v-model.number="(r.values[ym(year, mm)] ||= { units: 0, price: 0 }).units"
                                        @input="onUnitsInput(r, ym(year, mm))" type="number" min="0"
                                        class="w-20 h-9 border border-gray-200 dark:border-gray-800 rounded px-2 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-0"
                                        placeholder="Uds" />
                                </div>
                                <div>
                                    <label class="text-[11px] text-gray-500 block text-center">VGV</label>

                                    <input :disabled="!isAdmin || store.detail?.projection?.is_locked"
                                        v-model.number="(r.values[ym(year, mm)] ||= { units: 0, total: 0 }).total"
                                        type="number" min="0" step="0.01"
                                        class="w-36 h-9 border border-gray-200 dark:border-gray-800 rounded px-2 bg-white/90 dark:bg-gray-900/70 focus:outline-none focus:ring-0"
                                        :placeholder="fmtBRL((r.values[ym(year, mm)]?.units || 0) * (r.values[ym(year, mm)]?.price || 0))" />

                                    <div class="text-[10px] text-gray-500">
                                        {{ `R$ ${(r.values[ym(year, mm)] ||= { units: 0, price: 0 }).price} ` }}
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

        <!-- Modal adicionar empreendimentos -->
        <div v-if="showAdd" class="fixed inset-0 z-[60]">
            <div class="absolute inset-0 bg-black/40"></div>
            <div class="absolute inset-0 flex items-center justify-center p-4 z-[61]">
                <div
                    class="bg-white dark:bg-gray-900 rounded-2xl p-4 w-full max-w-2xl shadow-xl border dark:border-gray-700">
                    <div class="flex items-center justify-between mb-3">
                        <h3 class="font-semibold">Adicionar empreendimentos</h3>
                        <button @click="showAdd = false" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

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
                                <input type="checkbox" :value="e" v-model="selectedToAdd" class="accent-indigo-600">
                                <span class="font-medium">{{ e.name }}</span>
                            </div>
                            <span class="text-xs text-gray-500">ERP {{ e.id }}</span>
                        </label>
                    </div>

                    <div class="mt-4 flex justify-end gap-2">
                        <button @click="showAdd = false"
                            class="h-9 px-3 rounded-lg border dark:border-gray-700 bg-white/90 hover:bg-gray-50 dark:bg-gray-900/70">
                            Cancelar
                        </button>
                        <button @click="addSelected"
                            class="h-9 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 shadow">
                            Adicionar
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de confirmação de remoção -->
        <div v-if="confirmOpen" class="fixed inset-0 z-[70]">
            <div class="absolute inset-0 bg-black/40"></div>
            <div class="absolute inset-0 flex items-center justify-center p-4 z-[71]">
                <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 w-full max-w-lg shadow-xl border">
                    <h3 class="font-semibold text-gray-900 dark:text-white mb-2">Confirmar remoção</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Você removeu {{ pairsToRemove.length }} empreendimento(s) desta meta. Ao confirmar, todas as
                        linhas mensais e tickets padrão desses itens serão excluídos <strong>definitivamente</strong>.
                    </p>

                    <div class="max-h-52 overflow-auto border rounded-lg p-2 mb-4">
                        <ul class="text-sm space-y-1">
                            <li v-for="p in pairsToRemove" :key="p.erp_id + '|' + p.alias_id"
                                class="flex items-center gap-2">
                                <span
                                    class="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]">-</span>
                                <span class="truncate">
                                    {{ p.name }}
                                    <span class="text-xs text-gray-500">(ERP {{ p.erp_id }}, alias {{ p.alias_id
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
