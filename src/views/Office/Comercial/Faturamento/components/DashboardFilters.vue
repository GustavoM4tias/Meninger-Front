<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';

import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const emit = defineEmits(['filter-changed']);
const contractsStore = useContractsStore();
const route = useRoute();
const router = useRouter();

const localFilters = ref({
  startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
  endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
  situation: '',
  selectedCompanyNames: [],
  groupIds: [],
});

// Empresas
const companiesOptions = computed(() =>
  (contractsStore.companies || []).map(c => c.name)
);

const companyIdByName = computed(() => {
  const m = new Map();
  for (const c of contractsStore.companies || []) {
    m.set(c.name, Number(c.id));
  }
  return m;
});

// Grupos workflow
const groupLabelOf = (g) =>
  `${g.tipo === 'reservas' ? 'Reserva' : 'Repasse'} • ${g.nome}`;

const groupsOptions = computed(() =>
  (contractsStore.workflowGroups || []).map(groupLabelOf)
);

const groupIdByLabel = computed(() => {
  const m = new Map();
  for (const g of contractsStore.workflowGroups || []) {
    m.set(groupLabelOf(g), Number(g.idgroup));
  }
  return m;
});

// ── URL sync ─────────────────────────────────────────
function syncFiltersFromUrl() {
  const q = route.query;
  if (!Object.keys(q).length) return;
  const next = { ...localFilters.value };
  if (q.companyNames) next.selectedCompanyNames = String(q.companyNames).split(',').map(s => s.trim()).filter(Boolean);
  else next.selectedCompanyNames = [];
  if (q.groupIds) next.groupIds = String(q.groupIds).split(',').map(s => s.trim()).filter(Boolean);
  else next.groupIds = [];
  if (q.startDate) next.startDate = String(q.startDate);
  if (q.endDate) next.endDate = String(q.endDate);
  if (q.situation) next.situation = String(q.situation);
  localFilters.value = next;
  emit('filter-changed');
}

function syncUrlFromFilters() {
  const q = {};
  if (localFilters.value.startDate) q.startDate = localFilters.value.startDate;
  if (localFilters.value.endDate) q.endDate = localFilters.value.endDate;
  if (localFilters.value.situation) q.situation = localFilters.value.situation;
  if (localFilters.value.selectedCompanyNames?.length) q.companyNames = localFilters.value.selectedCompanyNames.join(',');
  if (localFilters.value.groupIds?.length) q.groupIds = localFilters.value.groupIds.join(',');
  router.replace({ query: q });
}

// ── Apply / Watch ────────────────────────────────────
const applyFilters = () => {
  const companyIds = (localFilters.value.selectedCompanyNames || [])
    .map(name => companyIdByName.value.get(name))
    .filter(id => Number.isFinite(id));

  contractsStore.setFilters({
    startDate: localFilters.value.startDate,
    endDate: localFilters.value.endDate,
    situation: localFilters.value.situation,
    companyIds,
  });

  const groupIds = (localFilters.value.groupIds || [])
    .map(lbl => groupIdByLabel.value.get(lbl))
    .filter(n => Number.isFinite(n));

  contractsStore.setSelectedGroups(groupIds);
  syncUrlFromFilters();
  emit('filter-changed');
};

const isActive = v => Array.isArray(v) ? v.length > 0 : (v !== '' && v != null);
const hasActiveFilters = computed(() =>
  Object.values(localFilters.value).some(isActive)
);

const activeFiltersCount = computed(() => {
  let n = 0;
  if (localFilters.value.selectedCompanyNames?.length) n++;
  if (localFilters.value.groupIds?.length) n++;
  if (localFilters.value.situation) n++;
  // Datas só contam quando diferentes do default do mês atual
  const defaultStart = dayjs().startOf('month').format('YYYY-MM-DD');
  const defaultEnd = dayjs().endOf('month').format('YYYY-MM-DD');
  if (localFilters.value.startDate && localFilters.value.startDate !== defaultStart) n++;
  if (localFilters.value.endDate && localFilters.value.endDate !== defaultEnd) n++;
  return n;
});

watch(localFilters, () => {
  if (!hasActiveFilters.value) return;
  const companyIds = (localFilters.value.selectedCompanyNames || [])
    .map(name => companyIdByName.value.get(name))
    .filter(id => Number.isFinite(id));
  contractsStore.setFilters({
    startDate: localFilters.value.startDate,
    endDate: localFilters.value.endDate,
    situation: localFilters.value.situation,
    companyIds,
  });
  const groupIds = (localFilters.value.groupIds || [])
    .map(lbl => groupIdByLabel.value.get(lbl))
    .filter(n => Number.isFinite(n));
  contractsStore.setSelectedGroups(groupIds);
}, { deep: true });

const clearFilters = () => {
  localFilters.value = {
    startDate: '', endDate: '', situation: '',
    selectedCompanyNames: [], groupIds: [],
  };
  contractsStore.clearFilters();
  router.replace({ query: {} });
  emit('filter-changed');
};

// ── Expandir / colapsar ──────────────────────────────
const isExpanded = ref(typeof window !== 'undefined' && window.innerWidth >= 1024);
function toggle() { isExpanded.value = !isExpanded.value; }

onMounted(async () => {
  await Promise.all([
    contractsStore.fetchCompanies(),
    contractsStore.fetchWorkflowGroups(),
  ]);
  syncFiltersFromUrl();
});
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
    <!-- Toolbar -->
    <div class="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-line bg-surface-sunken/40 rounded-t-xl">
      <button @click="toggle"
        class="flex items-center gap-2 text-sm font-medium text-ink hover:text-accent transition-colors">
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
        <Button size="sm" icon="fas fa-magnifying-glass" @click="applyFilters">
          <span class="hidden sm:inline">Filtrar</span>
        </Button>
      </div>
    </div>

    <!-- Campos -->
    <div v-show="isExpanded"
      class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in"
      style="overflow:visible">

      <Input v-model="localFilters.startDate" type="date" label="Data início" />
      <Input v-model="localFilters.endDate" type="date" label="Data fim" />

      <div v-if="groupsOptions.length">
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-diagram-project text-[10px] mr-1 text-ink-subtle"></i>Grupos workflow (projeção)
        </label>
        <MultiSelector :model-value="localFilters.groupIds"
          @update:modelValue="v => localFilters.groupIds = Array.isArray(v) ? v : []"
          :options="groupsOptions" placeholder="Selecione grupos" :page-size="200" />
      </div>

      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>Empresa(s)
        </label>
        <MultiSelector :model-value="localFilters.selectedCompanyNames"
          @update:modelValue="v => localFilters.selectedCompanyNames = Array.isArray(v) ? v : []"
          :options="companiesOptions" placeholder="Empresas" :page-size="150" :select-all="true" />
      </div>
    </div>
  </section>
</template>
