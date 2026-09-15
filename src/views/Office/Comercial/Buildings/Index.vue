<script setup>
/**
 * Empreendimentos: o portfólio por etapa comercial.
 *
 * Segue a receita de tela (_design/RECEITA-DE-TELA.md): FilterBar fechada com
 * selo de "N ativos", StatRow de etapas que RECORTA a lista ao clicar, linha
 * de estado dizendo o que está na tela, e os cartões. Os números da StatRow
 * descrevem o que os filtros deixaram (busca, cidade, tipo, segmento); o
 * recorte por etapa só muda a lista, nunca os cartões.
 *
 * A URL é a fonte única do estado (?section, ?search, ?cidade, ?tipo,
 * ?segmento, ?open, ?tab, ?tabela): filtro e recorte são deep-link, e o cartão
 * clicado vira `?open=<id>`, o mesmo caminho do link vindo de outros relatórios.
 *
 * Busca: o campo é local e a URL recebe o valor com atraso curto. A URL só
 * escreve no campo quando vem de fora (link, voltar do navegador) e NUNCA com
 * uma digitação em curso - antes a gravação na URL a cada tecla devolvia o
 * valor velho por cima da letra recém-digitada, e cada letra precisava ser
 * teclada duas vezes.
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
import FilterBar from '@/components/UI/FilterBar.vue';
import StatRow from '@/components/UI/StatRow.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Badge from '@/components/UI/Badge.vue';
import IconButton from '@/components/UI/IconButton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

const route = useRoute();
const router = useRouter();
const buildingStore = useBuildingStore();
const loading = ref(false);
const nf = new Intl.NumberFormat('pt-BR');

onMounted(async () => {
  loading.value = true;
  try { await buildingStore.fetchBuildings(); }
  finally { loading.value = false; }
});

// ── URL como estado ────────────────────────────────────────
const setQuery = (patch) => router.replace({ query: { ...route.query, ...patch } });
const queryStr = (k) => String(route.query[k] || '');

// Busca: campo local, URL com atraso. Enquanto há gravação pendente a URL não
// escreve no campo - é a digitação que manda.
const search = ref(queryStr('search'));
let debounce = null;
watch(search, (v) => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    debounce = null;
    if (v.trim() !== queryStr('search')) setQuery({ search: v.trim() || undefined });
  }, 250);
});
watch(() => route.query.search, (q) => {
  if (debounce) return;
  const v = String(q || '');
  if (v !== search.value.trim()) search.value = v;
});

// Filtros discretos: escrevem direto na URL
const urlField = (k) => computed({
  get: () => queryStr(k),
  set: (v) => setQuery({ [k]: v || undefined }),
});
const cidade = urlField('cidade');
const tipo = urlField('tipo');
const segmento = urlField('segmento');

const limpar = () => {
  search.value = '';
  setQuery({ search: undefined, cidade: undefined, tipo: undefined, segmento: undefined });
};

// activeCount conta DIMENSÕES preenchidas, não valores
const activeCount = computed(() =>
  [search.value.trim(), cidade.value, tipo.value, segmento.value].filter(Boolean).length);

const chips = computed(() => [
  search.value.trim() && { key: 'search', label: `“${search.value.trim()}”`, limpar: () => { search.value = ''; } },
  cidade.value && { key: 'cidade', label: cidade.value, limpar: () => { cidade.value = ''; } },
  tipo.value && { key: 'tipo', label: tipo.value, limpar: () => { tipo.value = ''; } },
  segmento.value && { key: 'segmento', label: segmento.value, limpar: () => { segmento.value = ''; } },
].filter(Boolean));

// ── Filtros / agrupamentos ─────────────────────────────────
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const stageOf = (b) => b.situacao_comercial?.[0]?.nome ?? null;
const tipoOf = (b) => b.tipo_empreendimento?.[0]?.nome ?? null;
const segmentoOf = (b) => b.segmento?.[0]?.nome ?? null;

// Opções vêm do próprio portfólio; a primeira (vazia) é o caminho de volta
// para "todas", porque o placeholder do Select não é selecionável.
const optionsDe = (fn, todas) => computed(() => {
  const set = new Set(buildingStore.buildings.map(fn).filter(Boolean));
  return [{ value: '', label: todas }, ...[...set].sort((a, b) => a.localeCompare(b, 'pt-BR')).map((v) => ({ value: v, label: v }))];
});
const cidadeOptions = optionsDe((b) => b.cidade, 'Todas');
const tipoOptions = optionsDe(tipoOf, 'Todos');
const segmentoOptions = optionsDe(segmentoOf, 'Todos');

const buildingsFiltered = computed(() => {
  const q = norm(search.value.trim());
  return buildingStore.buildings
    .filter((b) => !q || norm(b.nome).includes(q) || norm(b.cidade).includes(q) || String(b.idempreendimento) === q)
    .filter((b) => !cidade.value || b.cidade === cidade.value)
    .filter((b) => !tipo.value || tipoOf(b) === tipo.value)
    .filter((b) => !segmento.value || segmentoOf(b) === segmento.value)
    .slice()
    .reverse();
});

const SECTIONS = [
  { key: 'Pré Lançamentos',   stage: 'Pré-Lançamento',    label: 'Pré Lançamentos',   icon: 'fas fa-map-location-dot', tone: 'pos',     accent: 'text-data-pos' },
  { key: 'Lançamentos',       stage: 'Lançamento',        label: 'Lançamentos',       icon: 'fas fa-bullhorn',         tone: 1,         accent: 'text-series-1' },
  { key: 'Em Obras',          stage: 'Em construção',     label: 'Em obras',          icon: 'fas fa-helmet-safety',    tone: 'warn',    accent: 'text-data-warn' },
  { key: 'Finalizados',       stage: 'Finalizado',        label: 'Finalizados',       icon: 'fas fa-key',              tone: 'neg',     accent: 'text-data-neg' },
  { key: 'Portal do Cliente', stage: 'Portal do Cliente', label: 'Portal do cliente', icon: 'fas fa-door-open',        tone: 'neutral', accent: 'text-ink-muted' },
];
const groups = computed(() => Object.fromEntries(
  SECTIONS.map((s) => [s.key, buildingsFiltered.value.filter((b) => stageOf(b) === s.stage)]),
));
// Sem etapa conhecida: não some da lista, cai no grupo neutro
const semEtapa = computed(() => buildingsFiltered.value.filter((b) => !SECTIONS.some((s) => s.stage === stageOf(b))));
const sectionMeta = (key) => SECTIONS.find((s) => s.key === key) || { icon: 'fas fa-building', accent: 'text-ink-muted', label: key };

// ── Recorte por etapa: os cartões descrevem o filtro, a lista mostra o recorte
const currentSection = computed({
  get: () => (SECTIONS.some((s) => s.key === route.query.section) ? route.query.section : 'Geral'),
  set: (v) => setQuery({ section: v === 'Geral' ? undefined : v }),
});
const recorteAtivo = computed(() => (currentSection.value === 'Geral' ? null : sectionMeta(currentSection.value)));
const aoClicarKpi = (item) => {
  // O mesmo gesto liga e desliga; "Geral" sempre volta ao conjunto inteiro
  currentSection.value = (item.key === 'Geral' || currentSection.value === item.key) ? 'Geral' : item.key;
};

const kpiCards = computed(() => {
  const all = buildingsFiltered.value;
  const disp = all.reduce((s, b) => s + (Number(b.unidades_disponiveis) || 0), 0);
  const cidades = new Set(all.map((b) => b.cidade).filter(Boolean)).size;
  return [
    { key: 'Geral', label: 'Empreendimentos', raw: all.length, icon: 'fas fa-grip', tone: 'accent',
      hint: `${nf.format(disp)} un. disponíveis · ${cidades} cidade${cidades === 1 ? '' : 's'}`,
      tooltip: 'Todo o portfólio dentro do filtro' },
    ...SECTIONS.map((s) => ({
      key: s.key, label: s.label, raw: groups.value[s.key].length, icon: s.icon, tone: s.tone,
      tooltip: `Clique para ver só ${s.label.toLowerCase()}`,
    })),
  ];
});

const visibleSections = computed(() => {
  if (currentSection.value !== 'Geral') {
    const list = groups.value[currentSection.value] || [];
    return list.length ? [{ key: currentSection.value, list }] : [];
  }
  const out = SECTIONS.map((s) => ({ key: s.key, list: groups.value[s.key] })).filter((s) => s.list.length);
  if (semEtapa.value.length) out.push({ key: 'Sem etapa', list: semEtapa.value });
  return out;
});
const totalNaLista = computed(() => visibleSections.value.reduce((s, g) => s + g.list.length, 0));

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
              { title: 'Filtre o portfólio', text: 'Abra Filtros para buscar por nome, cidade ou ID do CV, e recortar por cidade, tipo ou segmento. A lista responde enquanto você digita.' },
              { title: 'Clique numa etapa para recortar', text: 'Os cartões contam o portfólio por etapa comercial. Clicar em Em obras deixa na lista só os empreendimentos em obra; clicar de novo desfaz o recorte.' },
              { title: 'Abra o empreendimento', text: 'Clique no cartão: ele abre em tela cheia, com as seções à vista: visão geral, espelho, unidades, tabelas de preço e materiais.' },
              { title: 'Leia o espelho', text: 'A seção Espelho mostra cada torre como uma grade: andares de cima para baixo, finais da esquerda para a direita, cor pela situação. Clique numa unidade para abrir a ficha.' },
            ]"
            :tips="[
              'O que aparece aqui vem do CV: empreendimento cadastrado errado lá aparece errado aqui.',
              'Empreendimento sem etapa definida cai no grupo Sem etapa, e não some da lista.',
              'O link da tela guarda filtro, recorte, empreendimento e tabela abertos: dá para mandar por WhatsApp e a pessoa cai no mesmo lugar.',
            ]" />
          <Badge variant="neutral" size="sm">
            <i class="fas fa-grip text-[9px]"></i>
            <span class="font-mono">{{ buildingsFiltered.length }}</span> empreendimento(s)
          </Badge>
        </template>
      </PageHeader>

      <div class="mb-4">
        <FilterBar :active-count="activeCount" auto-apply @clear="limpar">
          <Input v-model="search" label="Busca" placeholder="Nome, cidade ou ID do CV"
            iconLeft="fas fa-magnifying-glass" class="sm:col-span-2 lg:col-span-1" />
          <Select v-model="cidade" label="Cidade" placeholder="Todas" :options="cidadeOptions" />
          <Select v-model="tipo" label="Tipo" placeholder="Todos" :options="tipoOptions" />
          <Select v-model="segmento" label="Segmento" placeholder="Todos" :options="segmentoOptions" />

          <template #actions>
            <IconButton v-if="activeCount" icon="fas fa-eraser" size="sm" label="Limpar filtros" @click="limpar" />
          </template>

          <template #chips>
            <button v-for="c in chips" :key="c.key" type="button"
              class="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-accent-soft text-accent
                     text-micro font-medium hover:bg-accent/15 transition-colors duration-120 focus-ring"
              @click="c.limpar">
              {{ c.label }}
              <i class="fas fa-xmark text-micro"></i>
            </button>
          </template>
        </FilterBar>
      </div>

      <div v-if="loading" class="space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <Skeleton v-for="i in 6" :key="i" variant="stat" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Skeleton v-for="i in 4" :key="`c-${i}`" variant="card" :lines="3" />
        </div>
      </div>

      <div v-else class="space-y-4">
        <!-- Cartões: clicar recorta a lista, não os cartões -->
        <StatRow :items="kpiCards" :cols="{ sm: 2, md: 3, lg: 6 }"
          selectable :active-key="currentSection" @select="aoClicarKpi" />

        <!-- Linha de estado: o que está na lista agora -->
        <div class="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span class="tabular-nums">
            <b class="text-ink">{{ nf.format(totalNaLista) }}</b>
            de {{ nf.format(buildingStore.buildings.length) }} empreendimento{{ buildingStore.buildings.length === 1 ? '' : 's' }}
          </span>
          <button v-if="recorteAtivo" type="button"
            class="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-accent-soft text-accent
                   text-micro font-medium hover:bg-accent/15 transition-colors duration-120 focus-ring"
            @click="currentSection = 'Geral'">
            só {{ recorteAtivo.label.toLowerCase() }}
            <i class="fas fa-xmark text-micro"></i>
          </button>
        </div>

        <EmptyState v-if="visibleSections.length === 0"
          size="lg"
          :icon="activeCount ? 'fas fa-magnifying-glass' : 'fas fa-building'"
          :title="activeCount ? 'Nenhum empreendimento com esse filtro' : `Nenhum empreendimento em ${recorteAtivo ? recorteAtivo.label.toLowerCase() : 'portfólio'}`"
          description="Ajuste os filtros ou o recorte para ver outros.">
          <template v-if="activeCount" #actions>
            <IconButton icon="fas fa-eraser" label="Limpar filtros" @click="limpar" />
          </template>
        </EmptyState>

        <div v-else class="space-y-8">
          <section v-for="section in visibleSections" :key="section.key">
            <header class="flex items-center justify-between mb-3 px-1">
              <h2 class="text-sm sm:text-base font-semibold text-ink inline-flex items-center gap-2">
                <i :class="[sectionMeta(section.key).icon, sectionMeta(section.key).accent]" class="text-sm"></i>
                {{ sectionMeta(section.key).label }}
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
      </div>
    </PageContainer>

    <BuildingModal v-if="selectedBuilding" :building="selectedBuilding" @close="closeBuildingModal" />
  </div>
</template>
