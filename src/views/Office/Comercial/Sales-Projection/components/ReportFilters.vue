<script setup>
import { ref, computed, onMounted } from 'vue';
import dayjs from 'dayjs';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';

import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import FilterBar from '@/components/UI/FilterBar.vue';

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
  <!-- Nasce FECHADO, como todo filtro de relatório: o assunto da tela é o
       resultado; o recorte é o meio. O selo diz quantos estão ativos. -->
  <FilterBar :active-count="activeFiltersCount" :cols="4" :loading="!isValid"
    @apply="applyFilters" @clear="clearFilters">

    <Input v-model="localStart" type="month" label="Mês início" />
    <Input v-model="localEnd" type="month" label="Mês fim" />

    <div v-if="groupsOptions.length">
      <label class="block text-micro font-medium text-ink-muted mb-1.5">
        <i class="fas fa-diagram-project text-micro mr-1 text-ink-subtle"></i>Grupos workflow (projeção)
      </label>
      <MultiSelector
        :model-value="localGroupIds"
        @update:modelValue="v => localGroupIds = Array.isArray(v) ? v : []"
        :options="groupsOptions" placeholder="Selecione grupos" :page-size="200" />
    </div>

    <div>
      <label class="block text-micro font-medium text-ink-muted mb-1.5">
        <i class="fas fa-city text-micro mr-1 text-ink-subtle"></i>Empresa(s)
      </label>
      <MultiSelector
        :model-value="localCompanyNames"
        @update:modelValue="v => localCompanyNames = Array.isArray(v) ? v : []"
        :options="companiesOptions" placeholder="Empresas" :page-size="150" :select-all="true" />
    </div>
  </FilterBar>
</template>
