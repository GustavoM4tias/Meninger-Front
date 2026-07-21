<script setup>
/**
 * ProjectionDetail — editor de metas (tela nova, reescrita).
 * Orquestra: período → grade editável (unidades/mês) → salvamento UNIFICADO
 * (defaults + linhas numa transação) → histórico limpo. Rascunho é EXPLÍCITO
 * (banner "restaurar/descartar"), nunca aplicado às escondidas.
 */
import { onMounted, ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useRoute, onBeforeRouteLeave } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useProjectionsStore } from '@/stores/Comercial/Projections/projectionsStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import Badge from '@/components/UI/Badge.vue';
import Modal from '@/components/UI/Modal.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import Export from '@/components/config/Export.vue';

import ProjectionEditorGrid from './components/ProjectionEditorGrid.vue';
import EnterpriseFormModal from './components/EnterpriseFormModal.vue';
import ProjectionHistory from './components/ProjectionHistory.vue';

import {
  ensureYM, buildMonthRange, monthLabel, rowKey, emptyCell,
  rowHasValue, cellVgv, rowUnits, rowVgv, brl, brlCompact, int,
  cityKey, buildCityCanonicalMap, canonicalCity,
} from './projectionUtils';

const route = useRoute();
const store = useProjectionsStore();
const auth = useAuthStore();
const toast = useToast();

const id = Number(route.params.id);
const isAdmin = computed(() => auth?.user?.role === 'admin');

/* ── Período ───────────────────────────────────────────────────────────────── */
const currentYear = new Date().getFullYear();
const startMonth = ref(`${currentYear}-01`);
const endMonth = ref(`${currentYear}-12`);
const hideZero = ref(false);

const monthKeys = computed(() => {
  const s = ensureYM(startMonth.value), e = ensureYM(endMonth.value);
  if (!s || !e || s > e) return [];
  return buildMonthRange(s, e);
});
const rangeValid = computed(() => monthKeys.value.length > 0);

function setYear(y) { startMonth.value = `${y}-01`; endMonth.value = `${y}-12`; }
function setNext12() {
  const d = new Date();
  startMonth.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const e = new Date(d.getFullYear(), d.getMonth() + 11, 1);
  endMonth.value = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}`;
}

/* ── Projeção / permissões ─────────────────────────────────────────────────── */
const projection = computed(() => store.detail?.projection || null);
const locked = computed(() => !!projection.value?.is_locked);
const editable = computed(() => isAdmin.value && !locked.value);

/* ── Linhas ────────────────────────────────────────────────────────────────── */
const rows = ref([]);
const originalMeta = ref(new Map());   // pair -> name (estado do backend)
const hydrating = ref(false);
const saving = ref(false);
const dirty = ref(false);

const cityByErpId = computed(() => {
  const m = new Map();
  for (const it of store.enterprisePicker || []) {
    if (it?.id != null && it?.city) m.set(String(it.id), String(it.city));
  }
  return m;
});

function inflateFromBackend() {
  const detail = store.detail;
  if (!detail?.projection) { rows.value = []; return; }

  const map = new Map();
  for (const d of (detail.enterprise_defaults || [])) {
    const ek = String(d.enterprise_key);
    const alias = String(d.alias_id || 'default');
    const erp = d.erp_id ? String(d.erp_id) : null;
    map.set(`${ek}|${alias}`, {
      enterprise_key: ek,
      alias_id: alias,
      erp_id: erp,
      name: d.enterprise_name_cache || (erp ? `CC ${erp}` : 'Empreendimento'),
      city: d.manual_city || (erp ? cityByErpId.value.get(erp) : null) || null,
      units_summary: d.units_summary || null,
      totalUnits: d.total_units == null ? null : Number(d.total_units),
      defaultPrice: Number(d.default_avg_price || 0),
      defaultMarketingPct: Number(d.default_marketing_pct || 0),
      defaultCommissionPct: Number(d.default_commission_pct || 0),
      custoLoja: Number(d.custo_loja || 0),
      blockedConsideredAvailable: Number(d.blocked_considered_available || 0),
      values: {},
    });
  }

  for (const l of (detail.lines || [])) {
    const ek = String(l.enterprise_key);
    const alias = String(l.alias_id || 'default');
    const erp = l.erp_id ? String(l.erp_id) : null;
    const key = `${ek}|${alias}`;
    if (!map.has(key)) {
      map.set(key, {
        enterprise_key: ek, alias_id: alias, erp_id: erp,
        name: l.enterprise_name_cache || (erp ? `CC ${erp}` : 'Empreendimento'),
        city: erp ? (cityByErpId.value.get(erp) || null) : null,
        units_summary: null, totalUnits: null,
        defaultPrice: Number(l.avg_price_target || 0),
        defaultMarketingPct: Number(l.marketing_pct || 0),
        defaultCommissionPct: Number(l.commission_pct || 0),
        custoLoja: 0, blockedConsideredAvailable: 0, values: {},
      });
    }
    const target = map.get(key);
    target.values[String(l.year_month)] = { units: Number(l.units_target || 0) };
    // Ticket médio: usa o default; se ausente, herda de uma linha existente.
    if (!target.defaultPrice) target.defaultPrice = Number(l.avg_price_target || 0);
  }

  const arr = [...map.values()].map((r) => {
    const values = { ...(r.values || {}) };
    for (const ym of monthKeys.value) values[ym] ||= emptyCell();
    return { ...r, values };
  });
  arr.sort((a, b) => String(a.name).localeCompare(String(b.name), 'pt-BR'));

  // Unifica variações de cidade (Marília / Marilia / MARÍLIA → uma só, com acento).
  const cmap = buildCityCanonicalMap(arr.map((r) => r.city).filter(Boolean));
  for (const r of arr) if (r.city) r.city = canonicalCity(r.city, cmap);

  hydrating.value = true;
  rows.value = arr;
  originalMeta.value = new Map(arr.map((r) => [rowKey(r), r.name]));
  dirty.value = false;
  nextTick(() => { hydrating.value = false; });
}

async function refresh() {
  await store.fetchDetail(id, { start_month: startMonth.value, end_month: endMonth.value, include_zero: 1 });
  inflateFromBackend();
  checkDraft();
}

/* ── Rascunho (explícito) ──────────────────────────────────────────────────── */
const draftKey = computed(() => `proj:v2:${id}:${startMonth.value}:${endMonth.value}`);
const pendingDraft = ref(null);
let draftTimer = null;

watch(rows, () => {
  if (hydrating.value || saving.value) return;
  dirty.value = true;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    try {
      localStorage.setItem(draftKey.value, JSON.stringify({ rows: rows.value, _ts: new Date().toISOString() }));
    } catch { /* quota */ }
  }, 500);
}, { deep: true });

function checkDraft() {
  pendingDraft.value = null;
  try {
    const raw = localStorage.getItem(draftKey.value);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data?.rows?.length) pendingDraft.value = data;
  } catch { /* ignore */ }
}
function restoreDraft() {
  if (!pendingDraft.value?.rows) return;
  hydrating.value = true;
  rows.value = pendingDraft.value.rows.map((r) => {
    const values = { ...(r.values || {}) };
    for (const ym of monthKeys.value) values[ym] ||= emptyCell();
    return { ...r, values };
  });
  pendingDraft.value = null;
  dirty.value = true;
  nextTick(() => { hydrating.value = false; });
  toast.success('Rascunho restaurado.');
}
function discardDraft() {
  localStorage.removeItem(draftKey.value);
  pendingDraft.value = null;
}
function clearDraft() { localStorage.removeItem(draftKey.value); dirty.value = false; }

/* ── Filtros (cliente) ─────────────────────────────────────────────────────── */
const filterEnterprises = ref([]);
const filterCities = ref([]);

const enterpriseOptions = computed(() => [...new Set(rows.value.map((r) => r.name))].sort((a, b) => a.localeCompare(b, 'pt-BR')));
const cityCanonMap = computed(() => buildCityCanonicalMap(rows.value.map((r) => r.city).filter(Boolean)));
const cityOptions = computed(() => {
  const set = new Set();
  for (const r of rows.value) if (r.city) set.add(canonicalCity(r.city, cityCanonMap.value));
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
});

const visibleRows = computed(() => {
  let arr = rows.value;
  if (hideZero.value) arr = arr.filter((r) => rowHasValue(r, monthKeys.value));
  if (filterEnterprises.value.length) {
    const set = new Set(filterEnterprises.value);
    arr = arr.filter((r) => set.has(r.name));
  }
  if (filterCities.value.length) {
    const keys = new Set(filterCities.value.map(cityKey));
    arr = arr.filter((r) => r.city && keys.has(cityKey(r.city)));
  }
  return arr;
});
const activeFilters = computed(() => filterEnterprises.value.length + filterCities.value.length + (hideZero.value ? 1 : 0));
function clearFilters() { filterEnterprises.value = []; filterCities.value = []; hideZero.value = false; }

/* ── Totais (todas as linhas) ──────────────────────────────────────────────── */
const totals = computed(() => {
  let units = 0, vgv = 0;
  for (const r of rows.value) { units += rowUnits(r, monthKeys.value); vgv += rowVgv(r, monthKeys.value); }
  return { units, vgv, enterprises: rows.value.length, ticket: units > 0 ? vgv / units : 0 };
});

/* ── Add / edit / duplicate / remove ───────────────────────────────────────── */
const formOpen = ref(false);
const formMode = ref('add');
const editTarget = ref(null);

const existingErpIds = computed(() => rows.value.map((r) => r.erp_id).filter(Boolean).map(String));

function openAdd() { formMode.value = 'add'; editTarget.value = null; formOpen.value = true; }
function openEdit(row) { formMode.value = 'edit'; editTarget.value = row; formOpen.value = true; }

function onSubmitAdd({ erps, manual }) {
  if (erps?.length) {
    for (const e of erps) {
      if (rows.value.some((r) => String(r.erp_id) === String(e.id) && (r.alias_id || 'default') === 'default')) continue;
      rows.value.push({
        enterprise_key: String(e.id), alias_id: 'default', erp_id: String(e.id),
        name: e.name, city: e.city || cityByErpId.value.get(String(e.id)) || null,
        units_summary: null, totalUnits: null,
        defaultPrice: 0, defaultMarketingPct: 0, defaultCommissionPct: 0,
        custoLoja: 0, blockedConsideredAvailable: 0, values: {},
      });
    }
  }
  if (manual) {
    rows.value.push({
      enterprise_key: `MAN:${crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
      alias_id: 'default', erp_id: null,
      name: manual.name, city: manual.city,
      units_summary: null, totalUnits: manual.totalUnits ?? 0,
      defaultPrice: manual.defaultPrice, defaultMarketingPct: manual.defaultMarketingPct,
      defaultCommissionPct: manual.defaultCommissionPct, custoLoja: manual.custoLoja,
      blockedConsideredAvailable: 0, values: {},
    });
  }
  rows.value = [...rows.value];
  formOpen.value = false;
}

function onSubmitEdit({ patch }) {
  const row = editTarget.value;
  if (!row) return;
  Object.assign(row, patch);
  rows.value = [...rows.value];
  formOpen.value = false;
}

function duplicateRow(row) {
  const clone = JSON.parse(JSON.stringify(row));
  clone.alias_id = crypto?.randomUUID?.() ?? `${Date.now().toString(36)}`;
  clone.name = `${row.name} (cópia)`;
  rows.value.push(clone);
  rows.value = [...rows.value];
}
function removeRow(row) {
  rows.value = rows.value.filter((r) => rowKey(r) !== rowKey(row));
}

/* ── Salvar ────────────────────────────────────────────────────────────────── */
const confirmOpen = ref(false);
const removalNames = ref([]);

function computeRemovals() {
  const current = new Set(rows.value.map(rowKey));
  const names = [];
  for (const [pair, name] of originalMeta.value.entries()) if (!current.has(pair)) names.push(name);
  return names;
}

function onSaveClick() {
  if (!editable.value) return;
  const removals = computeRemovals();
  if (removals.length) { removalNames.value = removals; confirmOpen.value = true; }
  else doSave();
}

async function doSave() {
  confirmOpen.value = false;
  saving.value = true;
  try {
    const defaults = rows.value.map((r) => ({
      enterprise_key: r.enterprise_key,
      erp_id: r.erp_id || null,
      alias_id: r.alias_id || 'default',
      enterprise_name_cache: r.name,
      default_avg_price: Number(r.defaultPrice || 0),
      default_marketing_pct: Number(r.defaultMarketingPct || 0),
      default_commission_pct: Number(r.defaultCommissionPct || 0),
      total_units: r.erp_id ? null : Number(r.totalUnits ?? 0),
      custo_loja: Number(r.custoLoja || 0),
      blocked_considered_available: Number(r.blockedConsideredAvailable || 0),
      city: r.erp_id ? null : (r.city || null),
    }));

    const lines = [];
    for (const r of rows.value) {
      for (const ym of monthKeys.value) {
        const c = r.values?.[ym];
        const units = Number(c?.units || 0);
        if (units <= 0) continue;
        lines.push({
          enterprise_key: r.enterprise_key,
          erp_id: r.erp_id || null,
          alias_id: r.alias_id || 'default',
          year_month: ym,
          units_target: units,
          avg_price_target: Number(r.defaultPrice || 0),
          enterprise_name_cache: r.name,
          marketing_pct: Number(r.defaultMarketingPct || 0),
          commission_pct: Number(r.defaultCommissionPct || 0),
        });
      }
    }

    await store.saveGrid(id, { defaults, lines, rangeStart: startMonth.value, rangeEnd: endMonth.value });
    clearDraft();
    await refresh();
    toast.success('Projeção salva.');
  } catch (e) {
    toast.error(store.error || e?.message || 'Erro ao salvar.');
  } finally {
    saving.value = false;
  }
}

/* ── Nome / lock / ativo ───────────────────────────────────────────────────── */
const editingName = ref(false);
const tempName = ref('');
function startEditName() {
  if (!isAdmin.value) return;
  tempName.value = projection.value?.name || '';
  editingName.value = true;
  nextTick(() => document.getElementById('proj-name-input')?.focus());
}
async function commitName() {
  const next = (tempName.value || '').trim();
  editingName.value = false;
  if (!next || next === projection.value?.name) return;
  await store.updateMeta(id, { name: next });
  await store.fetchDetail(id, { start_month: startMonth.value, end_month: endMonth.value, include_zero: 1 });
}
async function toggleLock() {
  await store.updateMeta(id, { is_locked: !locked.value });
  await store.fetchDetail(id, { start_month: startMonth.value, end_month: endMonth.value, include_zero: 1 });
}
async function toggleActive() {
  await store.updateMeta(id, { is_active: !projection.value?.is_active });
  await store.fetchDetail(id, { start_month: startMonth.value, end_month: endMonth.value, include_zero: 1 });
}

/* ── Export ────────────────────────────────────────────────────────────────── */
const exportOpen = ref(false);
const exportSource = computed(() => {
  const out = [];
  for (const r of visibleRows.value) {
    for (const ym of monthKeys.value) {
      const c = r.values?.[ym];
      const units = Number(c?.units || 0);
      if (!units && hideZero.value) continue;
      out.push({
        Empreendimento: r.name,
        CC: r.erp_id || '(manual)',
        Cidade: r.city || '',
        Mês: monthLabel(ym),
        Unidades: units,
        Ticket: Number(r.defaultPrice || 0),
        VGV: cellVgv(r, ym),
        'Marketing %': Number(r.defaultMarketingPct || 0),
        'Comissão %': Number(r.defaultCommissionPct || 0),
      });
    }
  }
  return out;
});

/* ── Guardas / troca de período ────────────────────────────────────────────── */
async function changePeriod(fn) {
  if (dirty.value && !confirm('Há alterações não salvas neste período. Trocar mesmo assim? (o rascunho fica guardado)')) return;
  fn();
  await nextTick();
  await refresh();
}

function beforeUnload(e) { if (dirty.value) { e.preventDefault(); e.returnValue = ''; } }
onBeforeRouteLeave(() => {
  if (!dirty.value) return true;
  return confirm('Você tem alterações não salvas. Sair mesmo assim? (o rascunho fica guardado)');
});

onMounted(async () => {
  window.addEventListener('beforeunload', beforeUnload);
  if (isAdmin.value) await store.fetchEnterprisePicker();
  await refresh();
});
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
</script>

<template>
  <PageContainer size="full">
    <!-- ═══════ Header ═══════ -->
    <div class="rounded-2xl border border-line bg-surface-raised shadow-soft surface-gradient p-4 md:p-5 mb-4">
      <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <RouterLink to="/comercial/projections"
              class="h-8 w-8 grid place-items-center rounded-lg text-ink-muted hover:bg-surface-sunken hover:text-ink transition-colors shrink-0"
              v-tippy:bottom="'Voltar à lista'">
              <i class="fas fa-arrow-left text-sm"></i>
            </RouterLink>

            <template v-if="!editingName">
              <h1 class="text-xl font-semibold text-ink truncate flex items-center gap-2"
                :class="isAdmin ? 'cursor-text hover:underline decoration-dotted underline-offset-4' : ''"
                @click="startEditName">
                <i class="fas fa-bullseye text-accent"></i>
                {{ projection?.name || '—' }}
              </h1>
            </template>
            <input v-else id="proj-name-input" v-model="tempName" type="text" :maxlength="120"
              @keyup.enter="commitName" @keyup.esc="editingName = false" @blur="commitName"
              class="h-9 px-3 rounded-lg border border-accent/40 bg-surface text-ink text-sm focus-ring" />

            <Badge :variant="projection?.is_active ? 'accent' : 'neutral'" size="sm">
              <i :class="projection?.is_active ? 'fas fa-circle-check' : 'fas fa-circle-dot'" class="text-[9px]"></i>
              {{ projection?.is_active ? 'Ativa' : 'Inativa' }}
            </Badge>
            <Badge :variant="locked ? 'success' : 'warning'" size="sm">
              <i :class="locked ? 'fas fa-lock' : 'fas fa-lock-open'" class="text-[9px]"></i>
              {{ locked ? 'Bloqueada' : 'Aberta' }}
            </Badge>
          </div>

          <!-- Resumo -->
          <div class="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-sm">
            <span class="text-ink-muted"><i class="fas fa-building text-xs text-ink-subtle mr-1.5"></i>{{ int(totals.enterprises) }} empreend.</span>
            <span class="text-ink-muted"><i class="fas fa-cubes text-xs text-ink-subtle mr-1.5"></i>{{ int(totals.units) }} unidades</span>
            <span class="text-ink font-semibold"><i class="fas fa-sack-dollar text-xs text-accent mr-1.5"></i>{{ brl(totals.vgv) }}</span>
            <span class="text-ink-muted"><i class="fas fa-tag text-xs text-ink-subtle mr-1.5"></i>Ticket médio {{ brlCompact(totals.ticket) }}</span>
          </div>
        </div>

        <!-- Ações -->
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <PageHelp storage-key="projection-editor" title="Como usar o editor de projeção"
            intro="Aqui você define, mês a mês, quantas unidades cada empreendimento deve vender. O VGV é calculado automaticamente (unidades × ticket médio)."
            :steps="[
              { title: 'Escolha o período', text: 'Use os atalhos (Ano / Próximos 12m) ou os campos de mês para definir o intervalo que vai editar.' },
              { title: 'Adicione empreendimentos', text: 'Clique em Adicionar para trazer do Sienge (por código/cidade) ou cadastrar um manual.' },
              { title: 'Digite as unidades', text: 'Preencha a meta de unidades por mês direto na grade. O VGV aparece embaixo de cada célula.' },
              { title: 'Ajuste o empreendimento', text: 'No ícone de controles (engrenagem) você define ticket médio, marketing, comissão e cidade.' },
              { title: 'Salve', text: 'O botão Salvar grava tudo de uma vez. Se você removeu algum empreendimento, o sistema confirma antes.' },
            ]"
            :tips="[
              'Zerar um mês e salvar apaga aquela meta - só o período visível é afetado; outros meses ficam intactos.',
              'Rascunho automático: se sair sem salvar, ao voltar a tela oferece restaurar.',
              'Bloqueie a projeção para evitar edições acidentais.',
            ]" />

          <ProjectionHistory :id="id" />
          <Button variant="secondary" size="sm" icon="fas fa-file-export" @click="exportOpen = true">Exportar</Button>

          <template v-if="isAdmin">
            <Button variant="secondary" size="sm" :icon="locked ? 'fas fa-lock-open' : 'fas fa-lock'" @click="toggleLock">
              {{ locked ? 'Desbloquear' : 'Bloquear' }}
            </Button>
            <Button v-if="editable" icon="fas fa-plus" size="sm" @click="openAdd">Adicionar</Button>
            <Button v-if="editable" variant="primary" size="sm" icon="fas fa-floppy-disk" :loading="saving"
              :disabled="!dirty" @click="onSaveClick">
              {{ dirty ? 'Salvar' : 'Salvo' }}
            </Button>
          </template>
        </div>
      </div>

      <!-- Ativa toggle (admin) -->
      <div v-if="isAdmin" class="mt-3 pt-3 border-t border-line-subtle flex items-center gap-3">
        <Switch :model-value="!!projection?.is_active" size="sm" @update:model-value="toggleActive"
          label="Projeção ativa" description="Só uma projeção fica ativa (é a usada no Vendas × Projeção)." />
      </div>
    </div>

    <!-- ═══════ Rascunho pendente ═══════ -->
    <div v-if="pendingDraft"
      class="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <p class="text-sm text-amber-700 dark:text-amber-300">
        <i class="fas fa-triangle-exclamation mr-1.5"></i>
        Você tem um rascunho não salvo deste período.
      </p>
      <div class="flex gap-2 shrink-0">
        <Button variant="ghost" size="sm" @click="discardDraft">Descartar</Button>
        <Button variant="secondary" size="sm" icon="fas fa-rotate-left" @click="restoreDraft">Restaurar rascunho</Button>
      </div>
    </div>

    <!-- ═══════ Barra de período + filtros ═══════ -->
    <div class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-3 sm:p-4 mb-4">
      <div class="flex flex-col lg:flex-row lg:items-end gap-3">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
          <Input :model-value="startMonth" type="month" label="Mês inicial"
            @update:model-value="(v) => changePeriod(() => startMonth = v)" />
          <Input :model-value="endMonth" type="month" label="Mês final"
            @update:model-value="(v) => changePeriod(() => endMonth = v)" />
          <div class="col-span-2 flex items-end gap-2">
            <Button variant="outline" size="sm" @click="changePeriod(() => setYear(currentYear))">Ano {{ currentYear }}</Button>
            <Button variant="outline" size="sm" @click="changePeriod(() => setYear(currentYear + 1))">{{ currentYear + 1 }}</Button>
            <Button variant="outline" size="sm" @click="changePeriod(setNext12)">Próx. 12m</Button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[440px]">
          <MultiSelector v-model="filterEnterprises" :options="enterpriseOptions" placeholder="Filtrar empreendimento" />
          <MultiSelector v-model="filterCities" :options="cityOptions" placeholder="Filtrar cidade" />
        </div>
      </div>

      <div class="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-line-subtle">
        <Switch v-model="hideZero" size="sm" label="Ocultar sem metas" />
        <button v-if="activeFilters" @click="clearFilters"
          class="text-xs text-ink-muted hover:text-ink flex items-center gap-1.5">
          <i class="fas fa-filter-circle-xmark"></i> Limpar filtros ({{ activeFilters }})
        </button>
      </div>
    </div>

    <!-- ═══════ Grade ═══════ -->
    <div v-if="!rangeValid" class="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
      <i class="fas fa-circle-exclamation mr-1.5"></i> Período inválido: o mês inicial deve ser menor ou igual ao final.
    </div>

    <ProjectionEditorGrid v-else
      :rows="visibleRows" :month-keys="monthKeys" :disabled="!editable"
      @edit="openEdit" @duplicate="duplicateRow" @remove="removeRow" @changed="dirty = true" />

    <p v-if="!editable && isAdmin && locked" class="mt-3 text-xs text-ink-subtle">
      <i class="fas fa-lock mr-1"></i> Projeção bloqueada - desbloqueie no topo para editar.
    </p>

    <!-- Modais -->
    <EnterpriseFormModal :open="formOpen" :mode="formMode" :row="editTarget" :existing-erp-ids="existingErpIds"
      @close="formOpen = false" @submit-add="onSubmitAdd" @submit-edit="onSubmitEdit" />

    <Modal :open="confirmOpen" size="md" title="Confirmar remoção" @close="confirmOpen = false">
      <p class="text-sm text-ink-muted mb-3">
        Ao salvar, {{ removalNames.length }} empreendimento(s) e suas metas serão <strong class="text-red-500">removidos</strong> desta projeção:
      </p>
      <ul class="rounded-lg border border-line bg-surface-sunken divide-y divide-line-subtle max-h-52 overflow-auto text-sm">
        <li v-for="n in removalNames" :key="n" class="px-3 py-2 text-ink">{{ n }}</li>
      </ul>
      <template #footer>
        <Button variant="ghost" @click="confirmOpen = false">Cancelar</Button>
        <Button variant="danger" icon="fas fa-trash-can" :loading="saving" @click="doSave">Remover e salvar</Button>
      </template>
    </Modal>

    <Export v-model="exportOpen" :source="exportSource" title="Exportar projeção"
      :filename="`projecao-${projection?.name || id}`"
      :filters="{ Período: `${startMonth} a ${endMonth}` }" />
  </PageContainer>
</template>
