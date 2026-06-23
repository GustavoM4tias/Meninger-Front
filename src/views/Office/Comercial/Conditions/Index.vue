<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';

import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const store = useConditionsStore();
const auth = useAuthStore();
const router = useRouter();

const isAdmin = computed(() => auth.hasRole('admin'));
const canEdit = computed(() => isAdmin.value || !!store.permissions?.canEdit);
const canManage = computed(() => canEdit.value || !!store.permissions?.canAuthorize);

const loading = ref(true);
const search = ref('');
const filterStatus = ref('');
const filterMonth = ref(currentMonthYm());
const showClosed = ref(false);

const statusOptions = computed(() => {
  const opts = [{ value: '', label: 'Todos os status' }];
  if (canManage.value) {
    opts.push({ value: 'draft', label: 'Rascunho' });
    opts.push({ value: 'pending_approval', label: 'Em autorização' });
  }
  opts.push({ value: 'approved', label: 'Autorizado' });
  opts.push({ value: 'closed', label: 'Encerrado' });
  return opts;
});

// ── Criação ──────────────────────────────────────────
const openCreate = ref(false);
const creating = ref(false);
const createError = ref('');
const enterprises = ref([]);
const enterpriseStages = ref([]);
const loadingStages = ref(false);

const newForm = ref({
  kind: 'cv',
  idempreendimento: '',
  display_name: '',
  reference_month: '',
  selectedStageIds: [],
  includeCustom: false,
});

function setKind(k) {
  newForm.value.kind = k;
  if (k === 'avulsa') {
    newForm.value.idempreendimento = '';
    newForm.value.selectedStageIds = [];
    enterpriseStages.value = [];
  } else {
    newForm.value.display_name = '';
  }
}

const expandedStages = ref(new Set());
function toggleStageExpand(idetapa) {
  const next = new Set(expandedStages.value);
  if (next.has(idetapa)) next.delete(idetapa);
  else next.add(idetapa);
  expandedStages.value = next;
}

const totalSelectedModules = computed(() =>
  newForm.value.selectedStageIds.length + (newForm.value.includeCustom ? 1 : 0)
);

const canSubmitCreate = computed(() => {
  if (!newForm.value.reference_month) return false;
  if (newForm.value.kind === 'avulsa') return !!(newForm.value.display_name || '').trim();
  return !!newForm.value.idempreendimento && totalSelectedModules.value > 0;
});

const enterpriseOptions = computed(() => [
  { value: '', label: 'Selecionar empreendimento...' },
  ...enterprises.value.map(ent => ({
    value: ent.idempreendimento,
    label: `${ent.nome}${ent.cidade ? ` — ${ent.cidade}` : ''}`,
  })),
]);

function closeCreate() {
  openCreate.value = false;
  newForm.value = {
    kind: 'cv', idempreendimento: '', display_name: '',
    reference_month: '', selectedStageIds: [], includeCustom: false
  };
  enterpriseStages.value = [];
  expandedStages.value = new Set();
  createError.value = '';
}

function selectAllStages() {
  newForm.value.selectedStageIds = enterpriseStages.value.map(s => s.idetapa);
}

async function onEnterpriseChange() {
  newForm.value.selectedStageIds = [];
  newForm.value.includeCustom = false;
  enterpriseStages.value = [];
  if (!newForm.value.idempreendimento) return;
  loadingStages.value = true;
  try {
    enterpriseStages.value = await store.fetchEnterpriseStages(newForm.value.idempreendimento);
    selectAllStages();
  } catch (e) {
    console.warn('[Index] fetchEnterpriseStages:', e.message);
  } finally {
    loadingStages.value = false;
  }
}

async function handleCreate() {
  createError.value = '';
  if (!newForm.value.reference_month) { createError.value = 'Selecione um mês de referência.'; return; }
  if (newForm.value.kind === 'cv' && !newForm.value.idempreendimento) { createError.value = 'Selecione um empreendimento.'; return; }
  if (newForm.value.kind === 'avulsa' && !(newForm.value.display_name || '').trim()) { createError.value = 'Digite um nome para a ficha avulsa.'; return; }

  creating.value = true;
  try {
    const isAvulsa = newForm.value.kind === 'avulsa';
    const payload = isAvulsa
      ? { idempreendimento: null, display_name: newForm.value.display_name.trim(), reference_month: newForm.value.reference_month }
      : { idempreendimento: Number(newForm.value.idempreendimento), reference_month: newForm.value.reference_month, selectedStageIds: newForm.value.selectedStageIds };
    const result = await store.createCondition(payload);
    closeCreate();
    router.push(`/comercial/conditions/${result.id}`);
  } catch (e) {
    createError.value = e.message || 'Erro ao criar ficha.';
  } finally {
    creating.value = false;
  }
}

// ── Agrupamento por SÉRIE (CV: idempreendimento · Avulsa: series_id) ──────────
const ymOf = (d) => (d ? String(d).substring(0, 7) : '');

const groups = computed(() => {
  const map = new Map();
  for (const c of (store.list ?? [])) {
    const eid = c.enterprise?.idempreendimento ?? c.idempreendimento;
    // Avulsa agrupa por series_id; sem ele cada mês viraria um card separado.
    const groupKey = eid != null
      ? `cv:${eid}`
      : (c.series_id != null ? `serie:${c.series_id}` : `ficha:${c.id}`);
    if (!map.has(groupKey)) {
      const enterprise = c.enterprise ?? (eid != null
        ? { idempreendimento: eid }
        : { idempreendimento: null, nome: c.display_name || '(Ficha avulsa)', cidade: null, isAvulsa: true });
      map.set(groupKey, { groupKey, enterprise, isAvulsa: eid == null, conditions: [] });
    }
    map.get(groupKey).conditions.push(c);
  }
  for (const g of map.values()) {
    g.conditions.sort((a, b) => b.reference_month.localeCompare(a.reference_month));
    g.latest = g.conditions[0];
    if (g.isAvulsa && g.latest?.display_name) {
      g.enterprise = { ...g.enterprise, nome: g.latest.display_name };
    }
  }
  return [...map.values()].sort((a, b) =>
    (a.enterprise?.nome ?? '').localeCompare(b.enterprise?.nome ?? '', 'pt-BR')
  );
});

// Meses com fichas (mais recente primeiro) — alimenta o seletor de mês.
const availableMonths = computed(() => {
  const set = new Set();
  for (const c of (store.list ?? [])) { const m = ymOf(c.reference_month); if (m) set.add(m); }
  return [...set].sort().reverse();
});
const monthOptions = computed(() =>
  availableMonths.value.map(m => ({ value: m, label: formatMonth(m) }))
);

// Para cada série, a ficha do mês selecionado — é o que o card exibe.
const monthGroups = computed(() =>
  groups.value
    .map(g => ({ ...g, shown: g.conditions.find(c => ymOf(c.reference_month) === filterMonth.value) }))
    .filter(g => g.shown)
);

const filteredGroups = computed(() => {
  let r = monthGroups.value;
  if (filterStatus.value) r = r.filter(g => g.shown?.status === filterStatus.value);
  if (search.value.trim()) {
    const s = search.value.toLowerCase();
    r = r.filter(g =>
      g.enterprise?.nome?.toLowerCase().includes(s) ||
      g.enterprise?.cidade?.toLowerCase().includes(s)
    );
  }
  return r;
});

const activeGroups = computed(() =>
  filterStatus.value === 'closed' ? [] : filteredGroups.value.filter(g => g.shown?.status !== 'closed')
);
const closedGroups = computed(() =>
  filteredGroups.value.filter(g => g.shown?.status === 'closed')
);

function openGroup(group) {
  router.push(`/comercial/conditions/${group.shown.id}`);
}

// ── Helpers ──────────────────────────────────────────
const STATUS_MAP = {
  draft:            { label: 'Rascunho',       variant: 'warning', bar: 'bg-amber-500' },
  pending_approval: { label: 'Em autorização', variant: 'accent',  bar: 'bg-accent' },
  approved:         { label: 'Autorizado',     variant: 'success', bar: 'bg-emerald-500' },
  published:        { label: 'Autorizado',     variant: 'success', bar: 'bg-emerald-500' },
  closed:           { label: 'Encerrado',      variant: 'neutral', bar: 'bg-slate-500' },
};

const statusVariant = (s) => STATUS_MAP[s]?.variant ?? 'neutral';
const statusLabel = (s) => STATUS_MAP[s]?.label ?? s;
const statusBarClass = (s) => STATUS_MAP[s]?.bar ?? 'bg-slate-400';

function formatMonth(dateStr) {
  if (!dateStr) return '—';
  const [y, m] = dateStr.split('-');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${months[Number(m) - 1]}/${y}`;
}

// Mês atual do usuário no formato YYYY-MM (default do filtro de mês).
function currentMonthYm() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

onMounted(async () => {
  try {
    await Promise.all([store.fetchList(), store.fetchMyPermissions()]);
    // Se o mês atual ainda não tem fichas, cai para o mês mais recente disponível.
    if (availableMonths.value.length && !availableMonths.value.includes(filterMonth.value)) {
      filterMonth.value = availableMonths.value[0];
    }
    const data = await requestWithAuth(`${API_URL}/cv/empreendimentos`);
    enterprises.value = (data ?? []).sort((a, b) => a.nome?.localeCompare(b.nome, 'pt-BR'));
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="full">

      <!-- Header -->
      <PageHeader
        subtitle="Condições mensais de produto por empreendimento"
        icon="fas fa-file-contract">
        <template #title>
          <span>Fichas comerciais</span>
          <Favorite :router="'/comercial/conditions'" :section="'Fichas Comerciais'" />
        </template>
        <template v-if="isAdmin || canEdit" #actions>
          <RouterLink v-if="isAdmin" to="/comercial/conditions/settings">
            <Button variant="ghost" size="sm" icon="fas fa-cog">
              <span class="hidden sm:inline">Configurações</span>
            </Button>
          </RouterLink>
          <Button v-if="canEdit" icon="fas fa-plus" size="sm" @click="openCreate = true">
            Nova ficha
          </Button>
        </template>
      </PageHeader>

      <!-- Filtros -->
      <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient mb-4">
        <div class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-[1fr_12rem_12rem] gap-3">
          <Input v-model="search" placeholder="Buscar empreendimento..."
            iconLeft="fas fa-magnifying-glass" />
          <Select v-model="filterMonth" :options="monthOptions" placeholder="Mês" />
          <Select v-model="filterStatus" :options="statusOptions" />
        </div>
      </section>

      <!-- Erro -->
      <div v-if="store.error"
        class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ store.error }}
      </div>

      <!-- Loading -->
      <div v-if="loading" class="py-16 flex flex-col items-center gap-3 text-ink-muted">
        <Spinner size="lg" />
        <p class="text-sm">Carregando fichas...</p>
      </div>

      <!-- Conteúdo -->
      <template v-else-if="activeGroups.length || closedGroups.length">
        <!-- ATIVOS -->
        <div v-if="activeGroups.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <article v-for="group in activeGroups" :key="group.groupKey"
            class="group relative rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient overflow-hidden cursor-pointer
                   hover:shadow-elevated hover:border-accent/40 hover:-translate-y-0.5
                   transition-all duration-200 ease-out-expo"
            @click="openGroup(group)">

            <!-- Faixa de status -->
            <div :class="['h-1', statusBarClass(group.shown.status)]"></div>

            <div class="p-5">
              <div class="mb-3 min-w-0">
                <p class="font-semibold text-ink text-base leading-tight group-hover:text-accent transition-colors truncate flex items-center gap-1.5">
                  <i v-if="group.isAvulsa" class="fas fa-cube text-ink-subtle text-xs" v-tippy="'Ficha avulsa'"></i>
                  {{ group.enterprise.nome ?? '—' }}
                </p>
                <p class="text-xs text-ink-subtle mt-0.5 truncate">
                  <template v-if="group.isAvulsa">Avulsa · sem CV</template>
                  <template v-else>
                    {{ [group.enterprise.cidade, group.enterprise.segmento_nome].filter(Boolean).join(' · ') || '—' }}
                  </template>
                </p>
              </div>

              <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div class="flex items-center gap-2 text-xs text-ink-muted">
                  <i class="far fa-calendar text-[10px] text-ink-subtle"></i>
                  <span class="font-semibold font-mono">{{ formatMonth(group.shown.reference_month) }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <Badge :variant="statusVariant(group.shown.status)" size="sm">
                    {{ statusLabel(group.shown.status) }}
                  </Badge>
                  <Badge v-if="group.conditions.length > 1" variant="neutral" size="sm"
                    v-tippy="`${group.conditions.length} fichas no histórico`">
                    {{ group.conditions.length }} fichas
                  </Badge>
                </div>
              </div>

              <!-- Módulos -->
              <div v-if="group.shown.modules?.length" class="flex flex-wrap gap-1.5">
                <span v-for="mod in group.shown.modules.slice(0, 4)" :key="mod.id"
                  class="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-soft text-accent rounded-lg text-[11px] font-medium border border-accent/20">
                  <span class="truncate max-w-[100px]">{{ mod.module_name }}</span>
                  <span class="opacity-70 font-mono">{{ mod.total_units }}u</span>
                </span>
                <span v-if="group.shown.modules.length > 4"
                  class="px-2 py-0.5 bg-surface-sunken text-ink-subtle rounded-lg text-[11px] border border-line">
                  +{{ group.shown.modules.length - 4 }}
                </span>
              </div>
              <p v-else class="text-xs text-ink-subtle italic">Sem módulos</p>
            </div>

            <i class="fas fa-arrow-right absolute bottom-4 right-4 text-xs text-ink-subtle group-hover:text-accent transition-colors"></i>
          </article>
        </div>

        <!-- Aviso quando só tem encerrados -->
        <div v-else-if="!loading && closedGroups.length"
          class="flex items-center gap-3 px-4 py-3 bg-surface-sunken border border-line rounded-xl text-sm text-ink-muted">
          <i class="fas fa-circle-info text-ink-subtle"></i>
          Nenhum empreendimento ativo no momento.
        </div>

        <!-- ENCERRADOS -->
        <div v-if="closedGroups.length" class="mt-8">
          <button @click="showClosed = !showClosed"
            class="flex items-center gap-2 mb-3 px-3 py-2 -ml-3 rounded-lg text-sm font-semibold text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors">
            <i :class="showClosed ? 'fa-chevron-down' : 'fa-chevron-right'" class="fas text-xs transition-transform"></i>
            <i class="fas fa-flag-checkered text-ink-subtle"></i>
            Encerrados
            <Badge variant="neutral" size="sm">{{ closedGroups.length }}</Badge>
          </button>

          <div v-if="showClosed" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-75">
            <article v-for="group in closedGroups" :key="group.groupKey"
              class="group relative rounded-xl border border-line bg-surface-sunken shadow-soft overflow-hidden cursor-pointer
                     hover:shadow-elevated hover:border-ink-subtle hover:opacity-100
                     transition-all duration-200 ease-out-expo"
              @click="openGroup(group)">
              <div class="h-1 bg-slate-500"></div>
              <div class="p-5">
                <div class="mb-3">
                  <p class="font-semibold text-ink-muted text-base leading-tight group-hover:text-ink transition-colors truncate flex items-center gap-2">
                    <i class="fas fa-flag-checkered text-ink-subtle text-xs"></i>
                    {{ group.enterprise.nome ?? '—' }}
                  </p>
                  <p class="text-xs text-ink-subtle mt-0.5 truncate">
                    {{ [group.enterprise.cidade, group.enterprise.segmento_nome].filter(Boolean).join(' · ') || '—' }}
                  </p>
                </div>
                <div class="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <div class="flex items-center gap-2 text-xs text-ink-subtle">
                    <i class="far fa-calendar text-[10px]"></i>
                    <span class="font-semibold font-mono">Encerrado em {{ formatMonth(group.shown.reference_month) }}</span>
                  </div>
                  <Badge variant="neutral" size="sm">{{ statusLabel('closed') }}</Badge>
                </div>
                <p class="text-[11px] text-ink-subtle italic">
                  {{ group.conditions.length }} ficha{{ group.conditions.length > 1 ? 's' : '' }} no histórico
                </p>
              </div>
              <i class="fas fa-arrow-right absolute bottom-4 right-4 text-xs text-ink-subtle group-hover:text-ink-muted transition-colors"></i>
            </article>
          </div>
        </div>
      </template>

      <!-- Empty -->
      <EmptyState v-else-if="!loading"
        size="lg" icon="fas fa-file-contract"
        :title="store.list?.length ? `Nenhuma ficha em ${formatMonth(filterMonth)}` : 'Nenhuma ficha encontrada'"
        :description="store.list?.length ? 'Troque o mês no filtro para ver outras versões, ou ajuste os filtros/busca.' : 'Crie a primeira ficha para começar.'">
        <template v-if="canEdit && !(store.list?.length)" #actions>
          <Button icon="fas fa-plus" @click="openCreate = true">Nova ficha</Button>
        </template>
      </EmptyState>
    </PageContainer>

    <!-- Modal criar -->
    <Modal v-model:open="openCreate" size="lg" title="Nova ficha comercial"
      subtitle="Vinculada ao CV ou avulsa (sem cadastro)"
      @close="closeCreate">
      <div class="space-y-5">
        <!-- Tipo -->
        <div>
          <label class="block text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5">Tipo de ficha</label>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" @click="setKind('cv')"
              :class="['flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-md border text-sm font-medium transition-all',
                newForm.kind === 'cv'
                  ? 'border-accent bg-accent-soft text-accent shadow-soft'
                  : 'border-line text-ink-muted bg-surface-raised hover:border-accent/30 hover:text-ink']">
              <i class="fas fa-link text-xs"></i> Vinculada ao CV
            </button>
            <button type="button" @click="setKind('avulsa')"
              :class="['flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-md border text-sm font-medium transition-all',
                newForm.kind === 'avulsa'
                  ? 'border-accent bg-accent-soft text-accent shadow-soft'
                  : 'border-line text-ink-muted bg-surface-raised hover:border-accent/30 hover:text-ink']">
              <i class="fas fa-cube text-xs"></i> Avulsa (sem CV)
            </button>
          </div>
          <p class="text-[11px] text-ink-subtle mt-1.5 leading-relaxed">
            <template v-if="newForm.kind === 'cv'">
              <i class="fas fa-circle-info text-[10px] mr-1"></i>
              Ficha vinculada a empreendimento do CV — herda etapas, unidades e auto-evolui mensalmente.
            </template>
            <template v-else>
              <i class="fas fa-circle-info text-[10px] mr-1"></i>
              Ficha avulsa — produto sem cadastro no CV. Também evolui automaticamente todo mês.
            </template>
          </p>
        </div>

        <!-- Empreendimento (CV) -->
        <Select v-if="newForm.kind === 'cv'"
          v-model="newForm.idempreendimento"
          :options="enterpriseOptions"
          label="Empreendimento"
          @change="onEnterpriseChange" />

        <!-- Nome (avulsa) -->
        <div v-else>
          <Input v-model="newForm.display_name"
            label="Nome da ficha"
            placeholder="Ex: Residencial XYZ"
            iconLeft="fas fa-tag" />
          <p class="text-[11px] text-ink-subtle mt-1.5">
            <i class="fas fa-circle-info text-[10px] mr-1"></i>
            Nome livre que identifica este produto no sistema (será também o nome do módulo inicial).
          </p>
        </div>

        <!-- Mês de referência -->
        <Input v-model="newForm.reference_month" type="month" label="Mês de referência" />

        <!-- Módulos / Etapas -->
        <div v-if="newForm.kind === 'cv' && newForm.idempreendimento">
          <div class="flex items-center justify-between mb-2">
            <label class="block text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Módulos a incluir</label>
            <div v-if="enterpriseStages.length && !loadingStages" class="flex items-center gap-2 text-xs">
              <button @click="selectAllStages" class="text-accent hover:underline">Todos</button>
              <span class="text-ink-subtle">·</span>
              <button @click="newForm.selectedStageIds = []" class="text-ink-subtle hover:text-ink hover:underline">Nenhum</button>
            </div>
          </div>

          <div v-if="loadingStages" class="flex items-center gap-2 py-3 text-xs text-ink-subtle">
            <Spinner size="sm" /> Carregando etapas do CV...
          </div>

          <div v-else-if="enterpriseStages.length" class="space-y-2">
            <div v-for="stage in enterpriseStages" :key="stage.idetapa"
              class="rounded-xl border transition-all"
              :class="newForm.selectedStageIds.includes(stage.idetapa)
                ? 'border-accent bg-accent-soft'
                : 'border-line bg-surface-raised'">
              <label class="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                <input type="checkbox" :value="stage.idetapa" v-model="newForm.selectedStageIds" class="sr-only" />
                <span class="shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors"
                  :class="newForm.selectedStageIds.includes(stage.idetapa)
                    ? 'border-accent bg-accent'
                    : 'border-ink-subtle/40'">
                  <svg v-if="newForm.selectedStageIds.includes(stage.idetapa)"
                    class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M1 4l2.5 2.5L9 1" />
                  </svg>
                </span>

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold"
                    :class="newForm.selectedStageIds.includes(stage.idetapa) ? 'text-accent' : 'text-ink'">
                    {{ stage.nome }}
                  </p>
                  <p class="text-xs text-ink-subtle mt-0.5">
                    <span class="font-mono tabular-nums">{{ stage.total_units ?? 0 }}</span> unidades
                    <span v-if="stage.blocos?.length" class="ml-1">·
                      <span class="font-mono">{{ stage.blocos.length }}</span> bloco{{ stage.blocos.length > 1 ? 's' : '' }}
                    </span>
                  </p>
                </div>

                <button v-if="stage.blocos?.length" type="button"
                  @click.prevent="toggleStageExpand(stage.idetapa)"
                  class="w-6 h-6 flex items-center justify-center rounded transition-transform text-ink-subtle hover:text-ink"
                  :class="{ 'rotate-90': expandedStages.has(stage.idetapa) }">
                  <i class="fas fa-chevron-right text-[10px]"></i>
                </button>
                <i v-else class="fas fa-layer-group text-xs shrink-0"
                  :class="newForm.selectedStageIds.includes(stage.idetapa) ? 'text-accent/60' : 'text-ink-subtle'"></i>
              </label>

              <div v-if="expandedStages.has(stage.idetapa) && stage.blocos?.length"
                class="px-4 pb-3 space-y-1 border-t border-line pt-2">
                <div v-for="bloco in stage.blocos" :key="bloco.idbloco"
                  class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-sunken text-xs">
                  <div class="flex items-center gap-2">
                    <i class="fas fa-building text-ink-subtle"></i>
                    <span class="text-ink font-medium">{{ bloco.nome }}</span>
                  </div>
                  <span class="text-ink-subtle font-mono">{{ bloco.total_unidades ?? 0 }} un.</span>
                </div>
              </div>
            </div>

            <!-- Módulo avulso -->
            <label class="flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all select-none"
              :class="newForm.includeCustom
                ? 'border-ink-muted bg-surface-sunken'
                : 'border-line bg-surface-raised hover:border-accent/30'">
              <input type="checkbox" v-model="newForm.includeCustom" class="sr-only" />
              <span class="shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors"
                :class="newForm.includeCustom ? 'border-ink-muted bg-ink-muted' : 'border-ink-subtle/40'">
                <svg v-if="newForm.includeCustom" class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M1 4l2.5 2.5L9 1" />
                </svg>
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-ink">Módulo avulso</p>
                <p class="text-xs text-ink-subtle mt-0.5">Sem etapa do CV — preencher manualmente</p>
              </div>
              <i class="fas fa-cube text-xs text-ink-subtle shrink-0"></i>
            </label>
          </div>

          <div v-else
            class="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
            <i class="fas fa-triangle-exclamation shrink-0"></i>
            <span>
              Nenhuma etapa cadastrada no CV para este empreendimento.
              <span class="opacity-80">Você pode criar a ficha e adicionar módulos avulsos depois.</span>
            </span>
          </div>

          <p v-if="totalSelectedModules > 0" class="text-xs text-ink-muted mt-2">
            <i class="fas fa-circle-check text-accent mr-1"></i>
            <span class="font-mono">{{ totalSelectedModules }}</span>
            módulo{{ totalSelectedModules > 1 ? 's' : '' }} selecionado{{ totalSelectedModules > 1 ? 's' : '' }}
          </p>
          <p v-else class="text-xs text-amber-600 dark:text-amber-400 mt-2">
            <i class="fas fa-circle-exclamation mr-1"></i>
            Selecione ao menos um módulo ou marque "Módulo avulso".
          </p>
        </div>

        <!-- Erro -->
        <div v-if="createError"
          class="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
          <i class="fas fa-circle-exclamation shrink-0"></i>{{ createError }}
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="closeCreate">Cancelar</Button>
        <Button :icon="creating ? 'fas fa-circle-notch fa-spin' : 'fas fa-plus'"
          :disabled="creating || !canSubmitCreate"
          @click="handleCreate">
          {{ creating ? 'Criando...' : 'Criar ficha' }}
        </Button>
      </template>
    </Modal>
  </div>
</template>
