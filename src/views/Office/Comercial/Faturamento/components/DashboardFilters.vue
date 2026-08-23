<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';

import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

// 'ready' avisa que os filtros já leram a URL e escreveram no store. Telas que
// carregam dados sozinhas (as guias analíticas do Relatório Comercial) esperam
// por ele em vez de buscar no próprio onMounted — senão a primeira consulta sai
// com o período padrão e só depois é refeita com o da URL.
const emit = defineEmits(['filter-changed', 'ready']);
const contractsStore = useContractsStore();
const route = useRoute();
const router = useRouter();

// O backend, sem datas, consulta do 1º do mês até HOJE. A tela mostrava até o
// fim do mês, sugerindo um período maior do que o consultado.
const DEFAULT_START = dayjs().startOf('month').format('YYYY-MM-DD');
const DEFAULT_END = dayjs().format('YYYY-MM-DD');

const localFilters = ref({
  startDate: DEFAULT_START,
  endDate: DEFAULT_END,
  situation: '',
  selectedCompanyNames: [],
  selectedCities: [],
  groupIds: [],
});

// Modo de valor (VGV × VGV+DC) — mora aqui, junto dos demais filtros do topo.
// Não entra em `localFilters`: é modo de exibição (aplica na hora, sem
// depender do botão Filtrar) e não conta no selo de filtros ativos.
const valueModeOptions = [
  { value: 'net', label: 'VGV' },
  { value: 'gross', label: 'VGV+DC' },
];
const valueModeProxy = computed({
  get: () => contractsStore.valueMode,
  set: (v) => contractsStore.setValueMode(v),
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

// Cidades — a lista vem do servidor já limitada ao escopo do usuário, então o
// seletor nunca oferece cidade que a pessoa não poderia consultar.
const citiesOptions = computed(() => contractsStore.cities || []);

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
function syncFiltersFromUrl({ silent = false } = {}) {
  const q = route.query;
  if (!Object.keys(q).length) return;
  const next = { ...localFilters.value };
  if (q.companyNames) next.selectedCompanyNames = String(q.companyNames).split(',').map(s => s.trim()).filter(Boolean);
  else next.selectedCompanyNames = [];
  if (q.cities) next.selectedCities = String(q.cities).split(',').map(s => s.trim()).filter(Boolean);
  else next.selectedCities = [];
  if (q.groupIds) next.groupIds = String(q.groupIds).split(',').map(s => s.trim()).filter(Boolean);
  else next.groupIds = [];
  if (q.startDate) next.startDate = String(q.startDate);
  if (q.endDate) next.endDate = String(q.endDate);
  if (q.situation) next.situation = String(q.situation);
  localFilters.value = next;
  // Aplicar no store ANTES de disparar o fetch: quem copiava localFilters →
  // store era um watcher (roda depois do emit), então o fetch saía com o
  // filtro antigo — a tela mostrava o período da URL, mas os dados eram do
  // mês atual.
  applyFilters({ silent });
}

function syncUrlFromFilters() {
  const q = {};
  if (localFilters.value.startDate) q.startDate = localFilters.value.startDate;
  if (localFilters.value.endDate) q.endDate = localFilters.value.endDate;
  if (localFilters.value.situation) q.situation = localFilters.value.situation;
  if (localFilters.value.selectedCompanyNames?.length) q.companyNames = localFilters.value.selectedCompanyNames.join(',');
  if (localFilters.value.selectedCities?.length) q.cities = localFilters.value.selectedCities.join(',');
  if (localFilters.value.groupIds?.length) q.groupIds = localFilters.value.groupIds.join(',');
  router.replace({ query: q });
}

// ── Apply / Watch ────────────────────────────────────
const applyFilters = ({ silent = false } = {}) => {
  const companyIds = (localFilters.value.selectedCompanyNames || [])
    .map(name => companyIdByName.value.get(name))
    .filter(id => Number.isFinite(id));

  contractsStore.setFilters({
    startDate: localFilters.value.startDate,
    endDate: localFilters.value.endDate,
    situation: localFilters.value.situation,
    companyIds,
    cities: [...(localFilters.value.selectedCities || [])],
  });

  const groupIds = (localFilters.value.groupIds || [])
    .map(lbl => groupIdByLabel.value.get(lbl))
    .filter(n => Number.isFinite(n));

  contractsStore.setSelectedGroups(groupIds);
  syncUrlFromFilters();
  if (!silent) emit('filter-changed');
};

const isActive = v => Array.isArray(v) ? v.length > 0 : (v !== '' && v != null);
const hasActiveFilters = computed(() =>
  Object.values(localFilters.value).some(isActive)
);

const activeFiltersCount = computed(() => {
  let n = 0;
  if (localFilters.value.selectedCompanyNames?.length) n++;
  if (localFilters.value.selectedCities?.length) n++;
  if (localFilters.value.groupIds?.length) n++;
  if (localFilters.value.situation) n++;
  // Datas só contam quando diferentes do default do mês atual
  if (localFilters.value.startDate && localFilters.value.startDate !== DEFAULT_START) n++;
  if (localFilters.value.endDate && localFilters.value.endDate !== DEFAULT_END) n++;
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
    cities: [...(localFilters.value.selectedCities || [])],
  });
  const groupIds = (localFilters.value.groupIds || [])
    .map(lbl => groupIdByLabel.value.get(lbl))
    .filter(n => Number.isFinite(n));
  contractsStore.setSelectedGroups(groupIds);
}, { deep: true });

const clearFilters = () => {
  localFilters.value = {
    startDate: '', endDate: '', situation: '',
    selectedCompanyNames: [], selectedCities: [], groupIds: [],
  };
  contractsStore.clearFilters();
  router.replace({ query: {} });
  emit('filter-changed');
};

// ── Expandir / colapsar ──────────────────────────────
const isExpanded = ref(typeof window !== 'undefined' && window.innerWidth >= 1024);
function toggle() { isExpanded.value = !isExpanded.value; }

onMounted(async () => {
  // As listas do seletor (empresas, cidades, grupos) NÃO podem atrasar a busca
  // dos dados: esperar pelas três antes de liberar o 'ready' serializava o que
  // era paralelo e a tela demorava visivelmente mais para pintar.
  //
  // Só aguardamos o que a URL realmente precisa para virar filtro: nome de
  // empresa e rótulo de grupo viram id por lookup nessas listas. Cidade é
  // string pura e período é literal, então não dependem de nada.
  const q = route.query;
  const espera = [];
  if (q.companyNames) espera.push(contractsStore.fetchCompanies());
  if (q.groupIds) espera.push(contractsStore.fetchWorkflowGroups());
  if (espera.length) await Promise.all(espera);

  // Silencioso: escreve o filtro da URL no store SEM disparar busca. Quem
  // consome carrega ao receber o 'ready' — assim a primeira (e única) consulta
  // já sai com o recorte certo.
  syncFiltersFromUrl({ silent: true });
  emit('ready');

  // O resto abastece o seletor em segundo plano, já com os dados a caminho.
  contractsStore.fetchCompanies();
  contractsStore.fetchCities();
  contractsStore.fetchWorkflowGroups();
});
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
    <!-- Toolbar -->
    <div class="filters-toolbar">
      <button @click="toggle"
        class="filters-toolbar-trigger">
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
      class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 animate-fade-in"
      style="overflow:visible">

      <Input v-model="localFilters.startDate" type="date" label="Data início" />
      <Input v-model="localFilters.endDate" type="date" label="Data fim" />

      <div v-if="groupsOptions.length">
        <label class="block text-micro font-medium text-ink-muted mb-1.5">
          <i class="fas fa-diagram-project text-[10px] mr-1 text-ink-subtle"></i>Grupos workflow (projeção)
        </label>
        <MultiSelector :model-value="localFilters.groupIds"
          @update:modelValue="v => localFilters.groupIds = Array.isArray(v) ? v : []"
          :options="groupsOptions" placeholder="Selecione grupos" :page-size="200" />
      </div>

      <div>
        <label class="block text-micro font-medium text-ink-muted mb-1.5">
          <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>Empresa(s)
        </label>
        <MultiSelector :model-value="localFilters.selectedCompanyNames"
          @update:modelValue="v => localFilters.selectedCompanyNames = Array.isArray(v) ? v : []"
          :options="companiesOptions" placeholder="Empresas" :page-size="150" :select-all="true" />
      </div>

      <div>
        <label class="block text-micro font-medium text-ink-muted mb-1.5">
          <i class="fas fa-location-dot text-[10px] mr-1 text-ink-subtle"></i>Cidade(s)
        </label>
        <MultiSelector :model-value="localFilters.selectedCities"
          @update:modelValue="v => localFilters.selectedCities = Array.isArray(v) ? v : []"
          :options="citiesOptions" placeholder="Cidades" :page-size="150" :select-all="true" />
      </div>

      <div>
        <label class="block cursor-pointer text-micro font-medium text-ink-muted mb-1.5" :title="`VGV+DC inclui despesas de comercialização. Aplica na hora, sem filtrar.`">
          <i class="fas fa-coins text-[10px] mr-1 text-ink-subtle"></i>Modo de valor
        </label>
        <SegmentedControl v-model="valueModeProxy" :options="valueModeOptions" size="md" block /> 
      </div>
    </div>
  </section>
</template>
