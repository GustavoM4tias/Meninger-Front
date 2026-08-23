<script setup>
// Sincronização de empresas — registro unificado (companies + enterprises).
//
// Padrões desta tela:
//   - Barra de filtros no padrão do sistema (filters-toolbar + expandir).
//   - Ordenação pelo CABEÇALHO da tabela, server-side (a lista é paginada:
//     ordenar só a página exibida daria um resultado enganoso).
//   - Seleção em lote com ações (vincular empresa, ativar, inativar).
//   - Linha de ALTURA FIXA: o selo "Inativo" fica na mesma linha do nome, à
//     direita — antes ele caía embaixo e esticava a linha.

import { ref, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useOrgSyncStore } from '@/stores/Settings/Admin/orgSyncStore';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import { useToast } from 'vue-toastification';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Modal from '@/components/UI/Modal.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Favorite from '@/components/config/Favorite.vue';

const store = useOrgSyncStore();
const carregamento = useCarregamentoStore();
const toast = (() => {
  try { return useToast(); }
  catch { return { success: console.log, error: console.error }; }
})();

const { items, total, companies, page, pageSize, loading, error, filtros, sort } = storeToRefs(store);

const searchQuery = computed({
  get: () => filtros.value.q || '',
  set: (v) => { filtros.value.q = v; },
});
const filterStatus = computed({
  get: () => filtros.value.status || '',
  set: (v) => { filtros.value.status = v; },
});
const filterCompany = computed({
  get: () => filtros.value.companyId || '',
  set: (v) => { filtros.value.companyId = v; },
});
const filterActive = computed({
  get: () => filtros.value.active || '',
  set: (v) => { filtros.value.active = v; },
});

const totalPages = computed(() => Math.max(1, Math.ceil((total.value || 0) / (pageSize.value || 50))));

const statusOptions = [
  { value: '',         label: 'Todos os status' },
  { value: 'paired',   label: 'Pareado (CV + Sienge)' },
  { value: 'cv_only',  label: 'Só CV' },
  { value: 'erp_only', label: 'Só Sienge' },
];

const activeOptions = [
  { value: '',      label: 'Ativos e inativos' },
  { value: 'true',  label: 'Somente ativos' },
  { value: 'false', label: 'Somente inativos' },
];

const pageSizeOptions = [
  { value: 25, label: '25 por página' },
  { value: 50, label: '50 por página' },
  { value: 100, label: '100 por página' },
  { value: 200, label: '200 por página' },
];

const companyOptions = computed(() => [
  { value: '', label: 'Todas as empresas' },
  ...companies.value.map(c => ({ value: String(c.id), label: c.name })),
]);

const companyPickOptions = computed(() => [
  { value: '', label: '(sem empresa)' },
  ...companies.value.map(c => ({ value: String(c.id), label: c.name })),
]);

const statusMeta = {
  paired:   { label: 'Pareado',   variant: 'success', icon: 'fa-link' },
  cv_only:  { label: 'Só CV',     variant: 'accent',  icon: 'fa-database' },
  erp_only: { label: 'Só Sienge', variant: 'warning', icon: 'fa-building' },
};

// ── Filtros (padrão do sistema) ─────────────────────────────────────────────
const isExpanded = ref(typeof window !== 'undefined' && window.innerWidth >= 1024);
function toggleFilters() { isExpanded.value = !isExpanded.value; }

const activeFiltersCount = computed(() => {
  let n = 0;
  if (filtros.value.q) n++;
  if (filtros.value.status) n++;
  if (filtros.value.companyId) n++;
  if (filtros.value.active) n++;
  return n;
});

async function buscar(reset = false) {
  await store.fetchList({ resetPage: reset });
  // A seleção é por id da página atual; trocar o resultado a invalida.
  selectedIds.value = new Set();
}

function clearFilters() {
  searchQuery.value = '';
  filterStatus.value = '';
  filterCompany.value = '';
  filterActive.value = '';
  buscar(true);
}

async function goTo(p) {
  if (p < 1 || p > totalPages.value) return;
  page.value = p;
  await buscar(false);
}

async function changePageSize(v) {
  pageSize.value = Number(v) || 50;
  await buscar(true);
}

// ── Ordenação pelo cabeçalho (server-side) ──────────────────────────────────
async function handleSort(key) {
  if (sort.value.by === key) {
    sort.value = { by: key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' };
  } else {
    // Texto começa A→Z; número/status começam do maior — mais útil ao varrer.
    sort.value = { by: key, dir: ['name', 'city'].includes(key) ? 'asc' : 'desc' };
  }
  await buscar(true);
}

function sortIcon(key) {
  if (sort.value.by !== key) return 'fas fa-sort text-ink-subtle/40';
  return sort.value.dir === 'asc' ? 'fas fa-sort-up text-accent' : 'fas fa-sort-down text-accent';
}

// ── Seleção em lote ─────────────────────────────────────────────────────────
const selectedIds = ref(new Set());

const allVisibleSelected = computed(() =>
  items.value.length > 0 && items.value.every(i => selectedIds.value.has(i.id))
);
const someVisibleSelected = computed(() =>
  items.value.some(i => selectedIds.value.has(i.id)) && !allVisibleSelected.value
);

function toggleOne(id) {
  const s = new Set(selectedIds.value);
  if (s.has(id)) s.delete(id); else s.add(id);
  selectedIds.value = s;
}

function toggleAllVisible() {
  const s = new Set(selectedIds.value);
  if (allVisibleSelected.value) items.value.forEach(i => s.delete(i.id));
  else items.value.forEach(i => s.add(i.id));
  selectedIds.value = s;
}

function clearSelection() { selectedIds.value = new Set(); }

const selectedCount = computed(() => selectedIds.value.size);

// ── Ações em lote ───────────────────────────────────────────────────────────
const bulkCompanyModal = ref(false);
const bulkCompanyValue = ref('');

async function runBulk(patch, confirmMsg, successMsg) {
  const ids = [...selectedIds.value];
  if (!ids.length) return;
  if (confirmMsg && !confirm(confirmMsg)) return;
  try {
    carregamento.iniciarCarregamento();
    const r = await store.bulkUpdate(ids, patch);
    await buscar(false);
    toast.success(`${successMsg} (${r.updated ?? ids.length}).`);
  } catch (e) {
    toast.error(e.message);
  } finally {
    carregamento.finalizarCarregamento();
  }
}

const bulkActivate = () => runBulk(
  { active: true },
  `Reativar ${selectedCount.value} empreendimento(s)?`,
  'Empreendimento(s) reativado(s)'
);

const bulkDeactivate = () => runBulk(
  { active: false },
  `Inativar ${selectedCount.value} empreendimento(s)? Eles somem das liberações de acesso.`,
  'Empreendimento(s) inativado(s)'
);

function openBulkCompany() {
  bulkCompanyValue.value = '';
  bulkCompanyModal.value = true;
}

async function confirmBulkCompany() {
  const companyId = bulkCompanyValue.value ? Number(bulkCompanyValue.value) : null;
  bulkCompanyModal.value = false;
  await runBulk({ companyId }, null, 'Empresa aplicada');
}

// ── Sync com confirmação em 2 passos ────────────────────────────────────────
const confirmVisible = ref(false);
const confirmStep = ref(1);
const confirmSource = ref('');
const confirmPhraseInput = ref('');
const confirmRequiredPhrase = computed(() =>
  confirmSource.value === 'crm' ? 'SINCRONIZAR CV' : 'SINCRONIZAR SIENGE'
);
const canConfirm = computed(() =>
  confirmPhraseInput.value.trim().toUpperCase() === confirmRequiredPhrase.value
);

function openConfirm(source) {
  confirmSource.value = source; confirmStep.value = 1;
  confirmPhraseInput.value = ''; confirmVisible.value = true;
}
function closeConfirm() {
  confirmVisible.value = false; confirmPhraseInput.value = '';
  confirmStep.value = 1; confirmSource.value = '';
}

async function runConfirmedSync() {
  const source = confirmSource.value;
  closeConfirm();
  try {
    carregamento.iniciarCarregamento();
    const r = await store.runSync(source);
    await Promise.all([buscar(false), store.fetchCompanies()]);
    const c = r?.consolidated || {};
    toast.success(`Sync ${source === 'crm' ? 'CV' : 'Sienge'} concluído. ${c.enterprises ?? 0} empreendimento(s), ${c.companies ?? 0} empresa(s).`);
  } catch (e) {
    toast.error(e.message);
  } finally {
    carregamento.finalizarCarregamento();
  }
}

// ── Pareamento manual ───────────────────────────────────────────────────────
const pairModalRow = ref(null);
const pairSearch = ref('');

const pairCandidates = computed(() => {
  if (!pairModalRow.value) return [];
  const needErp = !pairModalRow.value.erp_cost_center_id;
  const q = pairSearch.value.trim().toLowerCase();
  return items.value
    .filter(r => r.id !== pairModalRow.value.id)
    .filter(r => needErp ? (r.erp_cost_center_id && !r.cv_id) : (r.cv_id && !r.erp_cost_center_id))
    .filter(r => !q || String(r.name || '').toLowerCase().includes(q));
});

function openPair(row) {
  pairModalRow.value = row;
  pairSearch.value = '';
}

async function confirmPair(candidate) {
  const base = pairModalRow.value;
  if (!confirm(`Parear "${base.name}" com "${candidate.name}"? Os dois registros viram UM (liberações de acesso são unificadas).`)) return;
  try {
    await store.pair(base.id, candidate.id);
    pairModalRow.value = null;
    await buscar(false);
    toast.success('Empreendimentos pareados.');
  } catch (e) {
    toast.error(e.message);
  }
}

// ── Empresa / ativo (individual) ────────────────────────────────────────────
const companyModalRow = ref(null);
const companyModalValue = ref('');

function openCompany(row) {
  companyModalRow.value = row;
  companyModalValue.value = row.company_id ? String(row.company_id) : '';
}

async function saveCompany() {
  try {
    await store.updateEnterprise(companyModalRow.value.id, {
      companyId: companyModalValue.value ? Number(companyModalValue.value) : null,
    });
    companyModalRow.value = null;
    await buscar(false);
    toast.success('Empresa vinculada.');
  } catch (e) {
    toast.error(e.message);
  }
}

async function toggleActive(row) {
  const acao = row.active ? 'Inativar' : 'Reativar';
  if (!confirm(`${acao} "${row.name}"? Empreendimento inativo some das liberações de acesso.`)) return;
  try {
    await store.updateEnterprise(row.id, { active: !row.active });
    await buscar(false);
  } catch (e) {
    toast.error(e.message);
  }
}

onMounted(() => {
  buscar(true);
  store.fetchCompanies();
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="xl">

      <!-- Header -->
      <PageHeader
        title="Sincronização de empresas"
        subtitle="Registro unificado de empresas (Sienge) e empreendimentos (CV × Sienge). A cidade é sempre a efetiva das fontes - sem ajustes manuais."
        icon="fas fa-building-circle-arrow-right">
        <template #title>
          <span>Sincronização de empresas</span>
          <Favorite :router="'/settings/empresas'" :section="'Empresas'" />
        </template>
        <template #actions>
          <PageHelp
            title="Como usar a Sincronização de empresas"
            :steps="[
              { title: 'Sincronizar (normalmente não precisa)', text: 'O sistema já roda os dois syncs sozinho toda madrugada. Use os botões só quando quiser atualizar na hora: Sync CV traz os empreendimentos do CRM, Sync Sienge traz empresas e centros de custo do ERP.' },
              { title: 'Conferir pareamento', text: 'Cada linha mostra o status: Pareado (CV e Sienge casados), Só CV ou Só Sienge. O ideal é tudo Pareado.' },
              { title: 'Parear manualmente', text: 'Se o mesmo empreendimento aparece em duas linhas (uma Só CV e outra Só Sienge), clique em Parear e escolha a outra metade.' },
              { title: 'Trabalhar em lote', text: 'Marque as caixas das linhas (ou a do cabeçalho para a página toda) e use a barra que aparece para vincular empresa, inativar ou reativar de uma vez.' },
              { title: 'Filtrar e ordenar', text: 'Use os filtros do topo para achar o que precisa e clique no cabeçalho da tabela para ordenar.' },
            ]"
            :tips="[
              'Este cadastro é a base das liberações de acesso por empreendimento na tela de Alçadas.',
              'Inativar é uma marcação SUA: o sync nunca a desfaz. O empreendimento continua no registro (e volta a aparecer se você reativar), mas sai das liberações de acesso e dos seletores.',
              'A lista traz todo centro de custo do Sienge no formato CIDADE/UF - NOME, então é normal ter milhares de linhas. Use os filtros e inative em lote o que não é empreendimento de verdade para enxugar a tela de Alçadas.',
            ]" />
          <Button variant="secondary" @click="openConfirm('crm')"
            v-tippy="'Traz só os empreendimentos do CV (CRM)'">
            <img src="/CVLogo.png" alt="CV" class="h-3.5 w-3.5" />
            Sync CV
          </Button>
          <Button @click="openConfirm('erp')" icon="fas fa-arrows-rotate"
            v-tippy="'Traz empresas e centros de custo do Sienge (ERP)'">
            Sync Sienge
          </Button>
        </template>
      </PageHeader>

      <!-- Filtros (padrão do sistema) -->
      <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient mb-4">
        <div class="filters-toolbar">
          <button @click="toggleFilters" class="filters-toolbar-trigger">
            <i class="fas fa-filter text-xs text-ink-muted"></i>
            <span>Filtros</span>
            <Badge v-if="activeFiltersCount" variant="accent" size="sm">
              {{ activeFiltersCount }} ativo{{ activeFiltersCount > 1 ? 's' : '' }}
            </Badge>
            <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
              :class="{ 'rotate-180': isExpanded }"></i>
          </button>

          <div class="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="clearFilters">
              <span class="hidden sm:inline">Limpar</span>
            </Button>
            <Button size="sm" icon="fas fa-magnifying-glass" @click="buscar(true)">
              <span class="hidden sm:inline">Filtrar</span>
            </Button>
          </div>
        </div>

        <div v-show="isExpanded"
          class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
          <div class="sm:col-span-2 lg:col-span-1">
            <label class="block text-micro font-medium text-ink-muted mb-1.5">
              <i class="fas fa-magnifying-glass text-[10px] mr-1 text-ink-subtle"></i>Buscar
            </label>
            <Input v-model="searchQuery" placeholder="Nome ou cidade…" @keyup.enter="buscar(true)" />
          </div>
          <div>
            <label class="block text-micro font-medium text-ink-muted mb-1.5">
              <i class="fas fa-link text-[10px] mr-1 text-ink-subtle"></i>Pareamento
            </label>
            <Select v-model="filterStatus" :options="statusOptions" />
          </div>
          <div>
            <label class="block text-micro font-medium text-ink-muted mb-1.5">
              <i class="fas fa-building text-[10px] mr-1 text-ink-subtle"></i>Empresa
            </label>
            <Select v-model="filterCompany" :options="companyOptions" />
          </div>
          <div>
            <label class="block text-micro font-medium text-ink-muted mb-1.5">
              <i class="fas fa-toggle-on text-[10px] mr-1 text-ink-subtle"></i>Situação
            </label>
            <Select v-model="filterActive" :options="activeOptions" />
          </div>
        </div>
      </section>

      <!-- Barra de ações em lote -->
      <transition name="slide-down">
        <div v-if="selectedCount"
          class="mb-3 rounded-xl bg-accent text-white px-4 py-2.5 flex flex-wrap items-center gap-3">
          <span class="text-sm font-semibold">
            <i class="fas fa-square-check mr-1"></i>
            <span class="font-mono tabular-nums">{{ selectedCount }}</span> selecionado(s)
          </span>
          <span class="opacity-40">|</span>
          <button @click="openBulkCompany"
            class="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors">
            <i class="fas fa-building mr-1"></i> Vincular empresa
          </button>
          <button @click="bulkActivate"
            class="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors">
            <i class="fas fa-rotate-left mr-1"></i> Reativar
          </button>
          <button @click="bulkDeactivate"
            class="px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors">
            <i class="fas fa-ban mr-1"></i> Inativar
          </button>
          <button @click="clearSelection"
            class="ml-auto text-sm underline opacity-90 hover:opacity-100">
            Limpar seleção
          </button>
        </div>
      </transition>

      <!-- Tabela -->
      <Surface variant="raised" padding="none" class="overflow-hidden mb-4">
        <div v-if="error" class="p-8 text-center">
          <i class="fas fa-circle-exclamation text-red-500 text-2xl mb-2"></i>
          <p class="text-sm text-ink-muted">{{ error }}</p>
        </div>

        <div v-else-if="loading" class="animate-pulse divide-y divide-line">
          <div class="h-10 bg-surface-sunken/50"></div>
          <div v-for="i in 8" :key="i" class="h-[3.25rem] bg-surface-raised"></div>
        </div>

        <EmptyState v-else-if="!items.length"
          icon="far fa-folder-open" title="Nenhum empreendimento"
          description="Ajuste os filtros ou rode o Sync CV e o Sync Sienge para popular o registro." />

        <div v-else class="overflow-x-auto">
          <table class="min-w-full text-sm table-fixed">
            <thead class="bg-surface-sunken/40 border-b border-line">
              <tr>
                <th class="px-3 py-2.5 w-10">
                  <input type="checkbox" class="accent-accent"
                    :checked="allVisibleSelected"
                    :indeterminate="someVisibleSelected"
                    @change="toggleAllVisible" />
                </th>
                <th @click="handleSort('name')"
                  class="px-4 py-2.5 text-left text-micro font-mono uppercase tracking-wider text-ink-subtle cursor-pointer select-none hover:text-ink transition-colors w-[28%]">
                  <span class="inline-flex items-center gap-1">Empreendimento <i :class="sortIcon('name')"></i></span>
                </th>
                <th class="px-4 py-2.5 text-left text-micro font-mono uppercase tracking-wider text-ink-subtle w-[18%]">
                  Empresa
                </th>
                <th @click="handleSort('city')"
                  class="px-4 py-2.5 text-left text-micro font-mono uppercase tracking-wider text-ink-subtle cursor-pointer select-none hover:text-ink transition-colors w-[14%]">
                  <span class="inline-flex items-center gap-1">Cidade <i :class="sortIcon('city')"></i></span>
                </th>
                <th @click="handleSort('cv_id')"
                  class="px-4 py-2.5 text-left text-micro font-mono uppercase tracking-wider text-ink-subtle cursor-pointer select-none hover:text-ink transition-colors w-[8%]">
                  <span class="inline-flex items-center gap-1">CV <i :class="sortIcon('cv_id')"></i></span>
                </th>
                <th @click="handleSort('erp_cost_center_id')"
                  class="px-4 py-2.5 text-left text-micro font-mono uppercase tracking-wider text-ink-subtle cursor-pointer select-none hover:text-ink transition-colors w-[10%]">
                  <span class="inline-flex items-center gap-1">CC Sienge <i :class="sortIcon('erp_cost_center_id')"></i></span>
                </th>
                <th @click="handleSort('pair_status')"
                  class="px-4 py-2.5 text-left text-micro font-mono uppercase tracking-wider text-ink-subtle cursor-pointer select-none hover:text-ink transition-colors w-[10%]">
                  <span class="inline-flex items-center gap-1">Status <i :class="sortIcon('pair_status')"></i></span>
                </th>
                <th class="px-4 py-2.5 w-44"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <!-- h-[3.25rem] + truncate: altura de linha CONSTANTE, com ou sem
                   o selo Inativo (que antes caía abaixo do nome e esticava). -->
              <tr v-for="row in items" :key="row.id"
                class="h-[3.25rem] hover:bg-surface-sunken/40 transition-colors"
                :class="[
                  !row.active ? 'opacity-60' : '',
                  selectedIds.has(row.id) ? 'bg-accent-soft/40' : '',
                ]">
                <td class="px-3">
                  <input type="checkbox" class="accent-accent"
                    :checked="selectedIds.has(row.id)"
                    @change="toggleOne(row.id)" />
                </td>
                <td class="px-4 max-w-0">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="truncate text-ink font-medium" :title="row.name">{{ row.name || '—' }}</span>
                    <Badge v-if="!row.active" variant="danger" size="sm" class="shrink-0">Inativo</Badge>
                  </div>
                </td>
                <td class="px-4 max-w-0">
                  <span class="block truncate text-xs text-ink-muted" :title="row.company?.name">
                    {{ row.company?.name || '—' }}
                  </span>
                </td>
                <td class="px-4 text-xs text-ink whitespace-nowrap">
                  {{ row.city || '—' }}<span v-if="row.uf" class="text-ink-subtle">/{{ row.uf }}</span>
                </td>
                <td class="px-4 text-ink-muted text-xs font-mono whitespace-nowrap">{{ row.cv_id ?? '—' }}</td>
                <td class="px-4 text-ink-muted text-xs font-mono whitespace-nowrap">{{ row.erp_cost_center_id ?? '—' }}</td>
                <td class="px-4 whitespace-nowrap">
                  <Badge :variant="statusMeta[row.pair_status]?.variant || 'neutral'" size="sm">
                    <i class="fas mr-1 text-[9px]" :class="statusMeta[row.pair_status]?.icon"></i>
                    {{ statusMeta[row.pair_status]?.label || row.pair_status }}
                  </Badge>
                </td>
                <td class="px-4 text-right whitespace-nowrap">
                  <div class="flex items-center justify-end gap-1">
                    <Button v-if="row.pair_status !== 'paired'" size="sm" variant="secondary"
                      icon="fas fa-link" @click="openPair(row)">Parear</Button>
                    <Button size="sm" variant="ghost" icon="fas fa-building"
                      v-tippy="'Vincular empresa'" @click="openCompany(row)" />
                    <Button size="sm" variant="ghost"
                      :icon="row.active ? 'fas fa-ban' : 'fas fa-rotate-left'"
                      :class="row.active ? 'text-red-500' : 'text-emerald-600'"
                      v-tippy="row.active ? 'Inativar' : 'Reativar'"
                      @click="toggleActive(row)" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Surface>

      <!-- Paginação -->
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-3 flex-wrap">
          <p class="text-xs text-ink-muted">
            Total: <span class="font-mono text-ink">{{ total }}</span>
            · Página <span class="font-mono text-ink">{{ page }}</span>
            de <span class="font-mono text-ink">{{ totalPages }}</span>
          </p>
          <div class="w-36">
            <Select :model-value="pageSize" :options="pageSizeOptions" size="sm"
              @update:modelValue="changePageSize" />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="secondary" size="sm" :disabled="page <= 1" icon="fas fa-chevron-left"
            @click="goTo(page - 1)">Anterior</Button>
          <Button variant="secondary" size="sm" :disabled="page >= totalPages" icon-right="fas fa-chevron-right"
            @click="goTo(page + 1)">Próxima</Button>
        </div>
      </div>
    </PageContainer>

    <!-- Modal: empresa em lote -->
    <Modal :open="bulkCompanyModal" size="md" @close="bulkCompanyModal = false">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
            <i class="fas fa-building text-sm"></i>
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-ink">Vincular empresa em lote</h3>
            <p class="text-xs text-ink-muted mt-0.5">
              Aplica a <span class="font-mono">{{ selectedCount }}</span> empreendimento(s) selecionado(s).
            </p>
          </div>
        </div>
      </template>

      <Select v-model="bulkCompanyValue" :options="companyPickOptions" label="Empresa (Sienge)" />
      <p class="text-micro text-ink-muted mt-2">
        Escolher "(sem empresa)" desvincula a empresa dos selecionados.
      </p>

      <template #footer>
        <Button variant="ghost" @click="bulkCompanyModal = false">Cancelar</Button>
        <Button icon="fas fa-floppy-disk" @click="confirmBulkCompany">Aplicar</Button>
      </template>
    </Modal>

    <!-- Modal Parear -->
    <Modal :open="!!pairModalRow" size="lg" @close="pairModalRow = null">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
            <i class="fas fa-link text-sm"></i>
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-ink">Parear empreendimento</h3>
            <p class="text-xs text-ink-muted mt-0.5 truncate">
              {{ pairModalRow?.name }} ({{ pairModalRow?.cv_id ? 'tem CV' : 'tem Sienge' }}) — escolha a outra metade
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-3">
        <Input v-model="pairSearch" placeholder="Buscar candidato…" iconLeft="fas fa-magnifying-glass" />
        <EmptyState v-if="!pairCandidates.length" icon="far fa-circle-question" title="Nenhum candidato"
          description="Só aparecem aqui registros da página atual com a metade que falta (ajuste a busca/página se necessário)." />
        <div v-else class="divide-y divide-line border border-line rounded-xl overflow-hidden max-h-80 overflow-y-auto">
          <button v-for="c in pairCandidates" :key="c.id"
            class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-sunken/50 transition-colors"
            @click="confirmPair(c)">
            <div class="min-w-0">
              <p class="text-sm text-ink font-medium truncate">{{ c.name || '—' }}</p>
              <p class="text-micro text-ink-subtle font-mono">
                {{ c.cv_id ? `CV ${c.cv_id}` : `CC ${c.erp_cost_center_id}` }} · {{ c.city || 'sem cidade' }}
              </p>
            </div>
            <Badge :variant="statusMeta[c.pair_status]?.variant || 'neutral'" size="sm">
              {{ statusMeta[c.pair_status]?.label }}
            </Badge>
          </button>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="pairModalRow = null">Cancelar</Button>
      </template>
    </Modal>

    <!-- Modal Empresa (individual) -->
    <Modal :open="!!companyModalRow" size="md" @close="companyModalRow = null">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
            <i class="fas fa-building text-sm"></i>
          </div>
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-ink">Vincular empresa</h3>
            <p class="text-xs text-ink-muted mt-0.5 truncate">{{ companyModalRow?.name }}</p>
          </div>
        </div>
      </template>

      <Select v-model="companyModalValue" :options="companyPickOptions" label="Empresa (Sienge)" />

      <template #footer>
        <Button variant="ghost" @click="companyModalRow = null">Cancelar</Button>
        <Button icon="fas fa-floppy-disk" @click="saveCompany">Salvar</Button>
      </template>
    </Modal>

    <!-- Modal Confirmação Dupla (sync) -->
    <Modal :open="confirmVisible" size="md" @close="closeConfirm">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 grid place-items-center shrink-0">
            <i class="fas fa-triangle-exclamation text-sm"></i>
          </div>
          <div>
            <h3 class="text-base font-semibold text-ink">
              Sincronizar {{ confirmSource === 'crm' ? 'CV (CRM)' : 'Sienge (ERP)' }}
            </h3>
            <p class="text-xs text-ink-muted mt-0.5">
              Passo {{ confirmStep }} de 2 — {{ confirmStep === 1 ? 'aviso' : 'confirmação' }}
            </p>
          </div>
        </div>
      </template>

      <template v-if="confirmStep === 1">
        <div class="rounded-lg border border-line bg-surface-sunken p-4 space-y-2 text-sm text-ink">
          <p>
            Consulta a API do {{ confirmSource === 'crm' ? 'CV' : 'Sienge' }} e
            <strong>atualiza o registro unificado</strong> de empresas/empreendimentos.
          </p>
          <ul class="list-disc pl-4 space-y-1 text-xs text-ink-muted">
            <li>Não remove liberações de acesso já concedidas.</li>
            <li>Pareamentos manuais são preservados.</li>
            <li>Cidades passam a refletir exatamente o que está na fonte.</li>
          </ul>
        </div>
      </template>

      <template v-else>
        <div class="space-y-3">
          <p class="text-sm text-ink">Digite exatamente a frase abaixo para confirmar:</p>
          <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-mono font-semibold text-amber-700 dark:text-amber-300 text-center tracking-wide">
            {{ confirmRequiredPhrase }}
          </div>
          <Input v-model.trim="confirmPhraseInput" placeholder="Digite aqui…" hint="Tudo em maiúsculo." />
        </div>
      </template>

      <template #footer>
        <Button v-if="confirmStep === 2" variant="ghost" @click="confirmStep = 1">Voltar</Button>
        <Button variant="ghost" @click="closeConfirm">Cancelar</Button>
        <Button v-if="confirmStep === 1" @click="confirmStep = 2">Continuar</Button>
        <Button v-else :disabled="!canConfirm" icon="fas fa-play" variant="danger" @click="runConfirmedSync">
          Iniciar
        </Button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.18s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
