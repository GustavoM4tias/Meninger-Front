<script setup>
/**
 * Empreendimentos: o portfólio por etapa comercial.
 *
 * A URL é a fonte única do estado (?section, ?search, ?open, ?tab, ?tabela):
 * busca e seção são deep-link, e o cartão clicado vira `?open=<id>`, que é o
 * mesmo caminho do link vindo de outros relatórios. Antes a busca gravava na
 * URL a cada tecla ANTES do v-model atualizar, e o observador da URL devolvia
 * o valor velho por cima do que a pessoa tinha acabado de digitar - a letra
 * sumia e a URL ficava uma tecla atrasada (`?search=m`).
 */
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBuildingStore } from '@/stores/Comercial/Building/buildingStore';

import BuildingCard from '@/views/Office/Comercial/Buildings/components/BuildingCard.vue';
import BuildingModal from '@/views/Office/Comercial/Buildings/components/BuildingModal.vue';
import Favorite from '@/components/config/Favorite.vue';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Input from '@/components/UI/Input.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import MetricInline from '@/components/UI/MetricInline.vue';

const route = useRoute();
const router = useRouter();
const buildingStore = useBuildingStore();
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try { await buildingStore.fetchBuildings(); }
  finally { loading.value = false; }
});

// ── URL como estado ────────────────────────────────────────
const setQuery = (patch) => router.replace({ query: { ...route.query, ...patch } });

// Busca: o campo é local (responde na hora); a URL recebe o valor com um
// atraso curto, e só quando o valor de fato mudou. A URL só escreve no campo
// quando vem de fora (link, voltar do navegador), nunca por cima de uma
// digitação em curso.
const search = ref(String(route.query.search || ''));
let debounce = null;
watch(search, (v) => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    const atual = String(route.query.search || '');
    if (v.trim() !== atual) setQuery({ search: v.trim() || undefined });
  }, 250);
});
watch(() => route.query.search, (q) => {
  const v = String(q || '');
  if (v !== search.value.trim()) search.value = v;
});
const limparBusca = () => { search.value = ''; };

const currentSection = computed({
  get: () => route.query.section || 'Geral',
  set: (v) => setQuery({ section: v === 'Geral' ? undefined : v }),
});

// ── Filtros / agrupamentos ─────────────────────────────────
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const buildingsFiltered = computed(() => {
  const q = norm(search.value.trim());
  return buildingStore.buildings
    .filter((b) => !q || norm(b.nome).includes(q) || norm(b.cidade).includes(q) || String(b.idempreendimento) === q)
    .slice()
    .reverse();
});

const stageOf = (b) => b.situacao_comercial?.[0]?.nome ?? null;

const SECTIONS = [
  { key: 'Pré Lançamentos',   stage: 'Pré-Lançamento',    label: 'Pré Lançamentos',   icon: 'fas fa-map-location-dot', accent: 'text-data-pos' },
  { key: 'Lançamentos',       stage: 'Lançamento',        label: 'Lançamentos',       icon: 'fas fa-bullhorn',         accent: 'text-accent' },
  { key: 'Em Obras',          stage: 'Em construção',     label: 'Em obras',          icon: 'fas fa-helmet-safety',    accent: 'text-data-warn' },
  { key: 'Finalizados',       stage: 'Finalizado',        label: 'Finalizados',       icon: 'fas fa-key',              accent: 'text-data-neg' },
  { key: 'Portal do Cliente', stage: 'Portal do Cliente', label: 'Portal do cliente', icon: 'fas fa-door-open',        accent: 'text-accent' },
];
const groups = computed(() => Object.fromEntries(
  SECTIONS.map((s) => [s.key, buildingsFiltered.value.filter((b) => stageOf(b) === s.stage)]),
));
// Sem etapa conhecida: não some da lista, cai no grupo neutro
const semEtapa = computed(() => buildingsFiltered.value.filter((b) => !SECTIONS.some((s) => s.stage === stageOf(b))));

const tabOptions = computed(() => [
  { value: 'Geral', label: 'Geral', icon: 'fas fa-grip', count: buildingsFiltered.value.length },
  ...SECTIONS.map((s) => ({ value: s.key, label: s.label, icon: s.icon, count: groups.value[s.key].length })),
]);

const visibleSections = computed(() => {
  if (currentSection.value !== 'Geral') {
    const list = groups.value[currentSection.value] || [];
    return list.length ? [{ key: currentSection.value, list }] : [];
  }
  const out = SECTIONS.map((s) => ({ key: s.key, list: groups.value[s.key] })).filter((s) => s.list.length);
  if (semEtapa.value.length) out.push({ key: 'Sem etapa', list: semEtapa.value });
  return out;
});
const sectionMeta = (key) => SECTIONS.find((s) => s.key === key) || { icon: 'fas fa-building', accent: 'text-ink-muted' };

// Números do portfólio (o que a busca recortou)
const metricas = computed(() => {
  const all = buildingsFiltered.value;
  const disp = all.reduce((s, b) => s + (Number(b.unidades_disponiveis) || 0), 0);
  const cidades = new Set(all.map((b) => b.cidade).filter(Boolean)).size;
  return [
    { key: 'emp', label: 'Empreendimentos', raw: all.length },
    { key: 'obras', label: 'Em obras', raw: groups.value['Em Obras'].length, tone: 'warn' },
    { key: 'lanc', label: 'Lançamentos', raw: groups.value['Lançamentos'].length + groups.value['Pré Lançamentos'].length, tone: 'accent' },
    { key: 'disp', label: 'Unidades disponíveis', raw: disp, tone: 'pos', hint: 'segundo o CV' },
    { key: 'cid', label: 'Cidades', raw: cidades },
  ];
});

// ── Detalhe: ?open=<id> é o clique E o deep-link ───────────
const selectedBuilding = ref(null);
const openBuilding = (building) => setQuery({ open: building.idempreendimento });
const closeBuildingModal = () => {
  selectedBuilding.value = null;
  setQuery({ open: undefined, tab: undefined, tabela: undefined });
};
watch(() => route.query.open, async (id) => {
  const num = Number(id);
  if (!Number.isFinite(num) || num <= 0) { selectedBuilding.value = null; return; }
  if (selectedBuilding.value?.idempreendimento === num) return;
  await buildingStore.fetchBuildingById(num);
  selectedBuilding.value = buildingStore.selectedBuilding;
}, { immediate: true });
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="full">

      <PageHeader
        subtitle="Acompanhe o portfólio de empreendimentos por etapa comercial."
        icon="fas fa-building">
        <template #title>
          <span>Empreendimentos</span>
          <Favorite :router="'/crm/buildings'" :section="currentSection" />
        </template>
        <template #actions>
          <PageHelp
            storage-key="empreendimentos"
            title="Como ler o portfólio"
            intro="Cada cartão é um empreendimento, agrupado pela etapa comercial em que ele está. É a visão de onde o portfólio está parado e onde está andando."
            :steps="[
              { title: 'Leia por etapa', text: 'A etapa é a fase comercial: da prospecção ao encerramento. A cor do cartão acompanha essa fase.' },
              { title: 'Abra o empreendimento', text: 'Clique no cartão: ele abre em tela cheia, com as seções à vista: visão geral, espelho, unidades, tabelas de preço e materiais.' },
              { title: 'Leia o espelho', text: 'A seção Espelho mostra cada torre como uma grade: andares de cima para baixo, finais da esquerda para a direita, cor pela situação. Escolha o que a célula mostra (preço, R$/m², área, dormitórios ou sol) e clique numa unidade para abrir a ficha.' },
              { title: 'Consulte as tabelas', text: 'A seção Tabelas de preço guarda toda tabela que já passou pelo CV, vigente ou não. Clique numa para ver as unidades e as séries de pagamento.' },
            ]"
            :tips="[
              'O que aparece aqui vem do CV: empreendimento cadastrado errado lá aparece errado aqui.',
              'Empreendimento sem etapa definida cai no grupo Sem etapa, e não some da lista.',
              'O link da tela guarda a busca, a seção, o empreendimento e a tabela abertos: dá para mandar por WhatsApp e a pessoa cai no mesmo lugar.',
            ]" />
          <Badge variant="neutral" size="sm">
            <i class="fas fa-grip text-[9px]"></i>
            <span class="font-mono">{{ buildingsFiltered.length }}</span> empreendimento(s)
          </Badge>
        </template>
      </PageHeader>

      <!-- Busca + seções + números do recorte -->
      <section class="panel mb-4">
        <div class="flex flex-col lg:flex-row lg:items-center gap-3 p-3 sm:p-4">
          <div class="lg:flex-1 lg:max-w-md flex items-center gap-2">
            <Input v-model="search"
              placeholder="Buscar por nome, cidade ou ID do CV" iconLeft="fas fa-magnifying-glass" />
            <IconButton v-if="search" icon="fas fa-xmark" size="sm" label="Limpar busca" @click="limparBusca" />
          </div>
          <div class="lg:ml-auto overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <SegmentedControl v-model="currentSection" :options="tabOptions" size="sm" />
          </div>
        </div>
        <MetricInline :items="metricas" />
      </section>

      <Skeleton v-if="loading" variant="card" :lines="3" />

      <EmptyState v-else-if="visibleSections.length === 0"
        size="lg"
        :icon="search ? 'fas fa-magnifying-glass' : 'fas fa-building'"
        :title="search ? `Nada com “${search}”` : `Nenhum empreendimento em ${currentSection.toLowerCase()}`"
        description="Ajuste a busca ou troque de seção para ver outros.">
        <template v-if="search" #actions>
          <IconButton icon="fas fa-xmark" label="Limpar busca" @click="limparBusca" />
        </template>
      </EmptyState>

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
            <BuildingCard v-for="(building, i) in section.list" :key="building.idempreendimento"
              :building="building" :class="i < 12 ? 'stagger-in' : ''" :style="{ '--i': i }"
              @click="openBuilding(building)" />
          </div>
        </section>
      </div>
    </PageContainer>

    <BuildingModal v-if="selectedBuilding" :building="selectedBuilding" @close="closeBuildingModal" />
  </div>
</template>
