<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBuildingStore } from '@/stores/Comercial/Building/buildingStore';

import BuildingCard from '@/views/Office/Comercial/Buildings/components/BuildingCard.vue';
import BuildingModal from '@/views/Office/Comercial/Buildings/components/BuildingModal.vue';
import Favorite from '@/components/config/Favorite.vue';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Input from '@/components/UI/Input.vue';
import Badge from '@/components/UI/Badge.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const route = useRoute();
const router = useRouter();
const search = ref('');
const selectedBuilding = ref(null);
const buildingStore = useBuildingStore();
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try { await buildingStore.fetchBuildings(); }
  finally { loading.value = false; }
});

// ── Filtros / agrupamentos ─────────────────────────────────
const buildingsFiltered = computed(() => {
  const filter = (search.value || '').toLowerCase();
  return buildingStore.buildings
    .filter(b => b.nome.toLowerCase().includes(filter)
      || (b.cidade || '').toLowerCase().includes(filter))
    .reverse();
});

const stageOf = (b) => b.situacao_comercial?.[0]?.nome ?? null;

const groups = computed(() => {
  const all = buildingsFiltered.value;
  return {
    'Pré Lançamentos':   all.filter(b => stageOf(b) === 'Pré-Lançamento'),
    'Lançamentos':       all.filter(b => stageOf(b) === 'Lançamento'),
    'Em Obras':          all.filter(b => stageOf(b) === 'Em construção'),
    'Finalizados':       all.filter(b => stageOf(b) === 'Finalizado'),
    'Portal do Cliente': all.filter(b => stageOf(b) === 'Portal do Cliente'),
  };
});

// ── Tabs ────────────────────────────────────────────────────
const currentSection = computed({
  get: () => route.query.section || 'Geral',
  set: (v) => router.replace({ query: { ...route.query, section: v, search: search.value || undefined } }),
});

const tabOptions = computed(() => {
  const counts = groups.value;
  const total = buildingsFiltered.value.length;
  return [
    { value: 'Geral',             label: `Geral`,             icon: 'fas fa-grip',         count: total },
    { value: 'Pré Lançamentos',   label: `Pré Lançamentos`,   icon: 'fas fa-map-location', count: counts['Pré Lançamentos'].length },
    { value: 'Lançamentos',       label: `Lançamentos`,       icon: 'fas fa-bullhorn',     count: counts['Lançamentos'].length },
    { value: 'Em Obras',          label: `Em obras`,          icon: 'fas fa-helmet-safety', count: counts['Em Obras'].length },
    { value: 'Finalizados',       label: `Finalizados`,       icon: 'fas fa-key',          count: counts['Finalizados'].length },
    { value: 'Portal do Cliente', label: `Portal do cliente`, icon: 'fas fa-door-open',    count: counts['Portal do Cliente'].length },
  ];
});

// ── Watchers de URL/search ─────────────────────────────────
watch(() => route.query.search, (q) => { search.value = q || ''; }, { immediate: true });
const onSearchInput = () => router.replace({ query: { ...route.query, search: search.value || undefined } });

// ── Modal ──────────────────────────────────────────────────
const openBuildingModal = async (building) => {
  await buildingStore.fetchBuildingById(building.idempreendimento);
  selectedBuilding.value = buildingStore.selectedBuilding;
};
const closeBuildingModal = () => {
  selectedBuilding.value = null;
  if (route.query.open) router.replace({ query: { ...route.query, open: undefined } });
};

// Deep-link: /comercial/buildings?open=<idempreendimento> abre o modal do
// empreendimento direto (usado pelo relatório de imobiliárias, entre outros).
watch(() => route.query.open, (id) => {
  const num = Number(id);
  if (Number.isFinite(num) && num > 0) openBuildingModal({ idempreendimento: num });
}, { immediate: true });

// ── Render decisions ───────────────────────────────────────
const visibleSections = computed(() => {
  if (currentSection.value !== 'Geral') {
    const list = groups.value[currentSection.value] || [];
    return list.length ? [{ key: currentSection.value, list }] : [];
  }
  return Object.entries(groups.value)
    .filter(([, list]) => list.length > 0)
    .map(([key, list]) => ({ key, list }));
});

const sectionMeta = (key) => ({
  'Pré Lançamentos':   { icon: 'fas fa-map-location-dot', accent: 'text-emerald-500' },
  'Lançamentos':       { icon: 'fas fa-bullhorn',         accent: 'text-sky-500' },
  'Em Obras':          { icon: 'fas fa-helmet-safety',    accent: 'text-amber-500' },
  'Finalizados':       { icon: 'fas fa-key',              accent: 'text-rose-500' },
  'Portal do Cliente': { icon: 'fas fa-door-open',        accent: 'text-purple-500' },
}[key] || { icon: 'fas fa-building', accent: 'text-accent' });
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="full">

      <!-- Header padrão -->
      <PageHeader
        subtitle="Acompanhe o portfólio de empreendimentos por etapa comercial."
        icon="fas fa-building">
        <template #title>
          <span>Empreendimentos</span>
          <Favorite :router="'/comercial/buildings'" :section="currentSection" />
        </template>
        <template #actions>
          <Badge variant="neutral" size="sm">
            <i class="fas fa-grip text-[9px]"></i>
            <span class="font-mono">{{ buildingsFiltered.length }}</span> empreendimento(s)
          </Badge>
        </template>
      </PageHeader>

      <!-- Toolbar: busca + tabs -->
      <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient mb-4 p-3 sm:p-4">
        <div class="flex flex-col lg:flex-row lg:items-center gap-3">
          <div class="lg:flex-1 lg:max-w-md">
            <Input v-model="search" @input="onSearchInput"
              placeholder="Buscar por nome ou cidade..."
              iconLeft="fas fa-magnifying-glass" />
          </div>
          <div class="lg:ml-auto overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <SegmentedControl v-model="currentSection" :options="tabOptions" size="sm" />
          </div>
        </div>
      </section>

      <!-- Loading -->
      <div v-if="loading" class="py-16 flex flex-col items-center gap-3 text-ink-muted">
        <Spinner size="lg" />
        <p class="text-sm">Carregando empreendimentos...</p>
      </div>

      <!-- Empty -->
      <EmptyState v-else-if="visibleSections.length === 0"
        size="lg"
        :icon="search ? 'fas fa-magnifying-glass' : 'fas fa-building'"
        :title="search
          ? 'Nenhum empreendimento encontrado'
          : `Nenhum empreendimento em ${currentSection.toLowerCase()}`"
        description="Ajuste a busca ou troque de aba para ver outros." />

      <!-- Conteúdo -->
      <div v-else class="space-y-8">
        <section v-for="section in visibleSections" :key="section.key">
          <header class="flex items-center justify-between mb-3 px-1">
            <h2 class="text-sm sm:text-base font-semibold text-ink inline-flex items-center gap-2">
              <i :class="[sectionMeta(section.key).icon, sectionMeta(section.key).accent]" class="text-sm"></i>
              {{ section.key }}
              <span class="text-xs font-mono text-ink-subtle">({{ section.list.length }})</span>
            </h2>
          </header>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <BuildingCard v-for="building in section.list" :key="building.idempreendimento"
              :building="building" @click="openBuildingModal(building)" />
          </div>
        </section>
      </div>
    </PageContainer>

    <BuildingModal v-if="selectedBuilding" :building="selectedBuilding" @close="closeBuildingModal" />
  </div>
</template>
