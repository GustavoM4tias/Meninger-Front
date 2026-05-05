<script setup>
import { ref, computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';

import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const emit = defineEmits(['filter-changed']);
const contractsStore = useContractsStore();

const localStart = ref(dayjs().format('YYYY-MM'));
const localEnd = ref(dayjs().format('YYYY-MM'));
const localCompanyNames = ref([]);
const localGroupIds = ref([]);

// Companies
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

// Workflow groups
const groupLabelOf = (g) => `${g.tipo === 'reservas' ? 'Reserva' : 'Repasse'} • ${g.nome}`;

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

const isValid = computed(() =>
  !!localStart.value && !!localEnd.value && localStart.value <= localEnd.value
);

const activeFiltersCount = computed(() => {
  let n = 0;
  const defaultMonth = dayjs().format('YYYY-MM');
  if (localStart.value !== defaultMonth) n++;
  if (localEnd.value !== defaultMonth) n++;
  if (localCompanyNames.value.length) n++;
  if (localGroupIds.value.length) n++;
  return n;
});
const hasActiveFilters = computed(() => activeFiltersCount.value > 0);

const isExpanded = ref(typeof window !== 'undefined' && window.innerWidth >= 1024);
function toggle() { isExpanded.value = !isExpanded.value; }

function applyFilters() {
  if (!isValid.value) return;

  const companyIds = localCompanyNames.value
    .map(n => companyIdByName.value.get(n))
    .filter(id => Number.isFinite(id));

  const groupIds = localGroupIds.value
    .map(lbl => groupIdByLabel.value.get(lbl))
    .filter(n => Number.isFinite(n));

  contractsStore.setSelectedGroups(groupIds);

  const startDate = dayjs(localStart.value + '-01').startOf('month').format('YYYY-MM-DD');
  const endDate = dayjs(localEnd.value + '-01').endOf('month').format('YYYY-MM-DD');

  emit('filter-changed', { startDate, endDate, companyIds });
}

function clearFilters() {
  localStart.value = dayjs().format('YYYY-MM');
  localEnd.value = dayjs().format('YYYY-MM');
  localCompanyNames.value = [];
  localGroupIds.value = [];
  contractsStore.clearFilters();
  contractsStore.setSelectedGroups([]);

  emit('filter-changed', {
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    companyIds: [],
  });
}

onMounted(async () => {
  await Promise.all([
    contractsStore.fetchCompanies(),
    contractsStore.fetchWorkflowGroups(),
  ]);
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
        <Badge v-if="hasActiveFilters" variant="accent" size="sm">
          {{ activeFiltersCount }} ativo{{ activeFiltersCount > 1 ? 's' : '' }}
        </Badge>
        <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"></i>
      </button>

      <div class="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="clearFilters">
          <span class="hidden sm:inline">Limpar</span>
        </Button>
        <Button size="sm" icon="fas fa-magnifying-glass" :disabled="!isValid" @click="applyFilters">
          <span class="hidden sm:inline">Filtrar</span>
        </Button>
      </div>
    </div>

    <!-- Campos -->
    <div v-show="isExpanded"
      class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in"
      style="overflow:visible">

      <Input v-model="localStart" type="month" label="Mês início" />
      <Input v-model="localEnd" type="month" label="Mês fim" />

      <div v-if="groupsOptions.length">
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-diagram-project text-[10px] mr-1 text-ink-subtle"></i>Grupos workflow (projeção)
        </label>
        <MultiSelector
          :model-value="localGroupIds"
          @update:modelValue="v => localGroupIds = Array.isArray(v) ? v : []"
          :options="groupsOptions" placeholder="Selecione grupos" :page-size="200" />
      </div>

      <div>
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>Empresa(s)
        </label>
        <MultiSelector
          :model-value="localCompanyNames"
          @update:modelValue="v => localCompanyNames = Array.isArray(v) ? v : []"
          :options="companiesOptions" placeholder="Empresas" :page-size="150" :select-all="true" />
      </div>
    </div>
  </section>
</template>
