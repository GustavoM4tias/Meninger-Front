<script setup>
/**
 * Detalhe do empreendimento, em tela cheia (Modal `screen`).
 *
 * Cinco seções, todas à vista na barra de abas: Visão geral, Espelho,
 * Unidades, Tabelas de preço e Materiais & Plantas. A seção e a tabela abertas moram na
 * URL (?open=<id>&tab=<aba>&tabela=<idtabela>), então o link leva a pessoa
 * ao mesmo lugar.
 *
 * Tudo aqui é feito com os primitivos de UI/ (Panel, StatRow, FunnelStrip,
 * FilterBar, DataTable, Badge): nada de card escrito à mão.
 */
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCan } from '@/composables/useCan';
import { setEmeScreenDetalhe } from '@/composables/useEmeScreenContext';
import { useBuildingStore } from '@/stores/Comercial/Building/buildingStore';

import Modal from '@/components/UI/Modal.vue';
import Panel from '@/components/UI/Panel.vue';
import StatRow from '@/components/UI/StatRow.vue';
import FunnelStrip from '@/components/UI/FunnelStrip.vue';
import FilterBar from '@/components/UI/FilterBar.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import IconButton from '@/components/UI/IconButton.vue';

import WeatherInfo from './UI/WeatherInfo.vue';
import PriceTablesTab from './PriceTablesTab.vue';
import MirrorTab from './MirrorTab.vue';

const props = defineProps({
  building: { type: Object, required: true },
});
const emit = defineEmits(['close']);

const buildingStore = useBuildingStore();

// ── Abas ───────────────────────────────────────────────────
const route = useRoute();
const router = useRouter();
const TABS = ['geral', 'espelho', 'unidades', 'tabelas', 'materiais'];
const activeTab = computed({
  get: () => (TABS.includes(route.query.tab) ? route.query.tab : 'geral'),
  set: (tab) => router.replace({ query: { ...route.query, tab: tab === 'geral' ? undefined : tab, tabela: undefined } }),
});
const tabelaAberta = computed({
  get: () => { const n = Number(route.query.tabela); return Number.isFinite(n) && n > 0 ? n : null; },
  set: (id) => router.replace({ query: { ...route.query, tab: 'tabelas', tabela: id || undefined } }),
});
const priceTablesCount = ref(null);

const closeModal = () => emit('close');

const fetchWeather = async () => {
  if (props.building?.latitude && props.building?.longitude) {
    try { await buildingStore.getWeather(props.building.latitude, props.building.longitude); }
    catch (e) { console.error('Erro ao buscar o clima:', e); }
  } else {
    buildingStore.weather = null;
  }
};

// ── Formatadores ───────────────────────────────────────────
const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== null && v !== ''
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : '-';
};
const fmtArea = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== null && v !== ''
    ? `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`
    : '-';
};
const fmtMB = (bytes) => (bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : '-');

// ── Situação das unidades (situacao_mapa_disponibilidade do CV) ─
// Mesmas cores da legenda em toda a tela: barra, selo e filtro.
const UNIT_STATUS = {
  1: { key: 'disponivel',     label: 'Disponível',     icon: 'fas fa-circle-check', variant: 'success', bar: 'bg-data-pos/70',     text: 'text-data-pos' },
  2: { key: 'reserva_inicio', label: 'Reserva início', icon: 'fas fa-hourglass-start', variant: 'accent', bar: 'bg-accent/70', text: 'text-accent' },
  5: { key: 'reserva_ativa',  label: 'Reserva ativa',  icon: 'fas fa-hourglass-half', variant: 'warning', bar: 'bg-data-warn/70', text: 'text-data-warn' },
  3: { key: 'vendida',        label: 'Vendida',        icon: 'fas fa-flag-checkered', variant: 'danger', bar: 'bg-data-neg/70',  text: 'text-data-neg' },
  4: { key: 'bloqueada',      label: 'Bloqueada',      icon: 'fas fa-lock',          variant: 'neutral', bar: 'bg-data-neutral/70', text: 'text-ink-muted' },
};
const UNKNOWN_STATUS = { key: 'sem_status', label: 'Não informado', icon: 'fas fa-circle-question', variant: 'neutral', bar: 'bg-data-neutral/40', text: 'text-ink-subtle' };
const statusOf = (u) => UNIT_STATUS[u.situacao?.situacao_mapa_disponibilidade] || UNKNOWN_STATUS;

// ── Unidades achatadas (uma linha por unidade) ─────────────
const units = computed(() => {
  const out = [];
  for (const etapa of props.building.etapas || []) {
    for (const bloco of etapa.blocos || []) {
      for (const u of bloco.unidades || []) {
        out.push({
          ...u,
          etapa: etapa.nome,
          bloco: bloco.nome,
          idetapa: etapa.idetapa,
          status: statusOf(u),
          area_num: u.area_privativa != null ? Number(u.area_privativa) : null,
          valor_num: u.valor != null ? Number(u.valor) : null,
        });
      }
    }
  }
  return out;
});

const totalUnits = computed(() => units.value.length);
const totalBlocks = computed(() =>
  (props.building.etapas || []).reduce((t, e) => t + (e.blocos?.length || 0), 0));

const statusStages = computed(() => {
  const count = {};
  for (const u of units.value) count[u.status.key] = (count[u.status.key] || 0) + 1;
  const ordem = [UNIT_STATUS[1], UNIT_STATUS[2], UNIT_STATUS[5], UNIT_STATUS[3], UNIT_STATUS[4], UNKNOWN_STATUS];
  return ordem
    .map((s) => ({ ...s, count: count[s.key] || 0 }))
    .filter((s) => s.count > 0 || s.key !== 'sem_status');
});

const materialsCount = computed(() =>
  (props.building.materiais_campanha?.length || 0) + (props.building.plantas_mapeadas?.length || 0));

const kpiCards = computed(() => {
  const disp = statusStages.value.find((s) => s.key === 'disponivel')?.count || 0;
  const vend = statusStages.value.find((s) => s.key === 'vendida')?.count || 0;
  return [
    { key: 'unidades', label: 'Unidades', raw: totalUnits.value, icon: 'fas fa-house', tone: 'accent',
      hint: `${totalBlocks.value} bloco(s) · ${props.building.etapas?.length || 0} etapa(s)` },
    { key: 'disp', label: 'Disponíveis', raw: disp, icon: 'fas fa-circle-check', tone: 'pos',
      hint: totalUnits.value ? `${((disp / totalUnits.value) * 100).toFixed(0)}% do estoque` : '' },
    { key: 'vend', label: 'Vendidas', raw: vend, icon: 'fas fa-flag-checkered', tone: 'neg',
      hint: totalUnits.value ? `${((vend / totalUnits.value) * 100).toFixed(0)}% do total` : '' },
    { key: 'mat', label: 'Materiais', raw: materialsCount.value, icon: 'fas fa-images', tone: 'warn',
      hint: `${props.building.plantas_mapeadas?.length || 0} planta(s) mapeada(s)` },
  ];
});

const tabOptions = computed(() => [
  { value: 'geral',     label: 'Visão geral',        icon: 'fas fa-grip',   hint: 'Números, empresa, endereço e cronograma' },
  { value: 'espelho',   label: 'Espelho',            icon: 'fas fa-table-cells', hint: 'Torres x andares: preço, sol e dormitórios' },
  { value: 'unidades',  label: 'Unidades',           icon: 'fas fa-house',  count: totalUnits.value, hint: 'Disponibilidade por etapa e bloco' },
  { value: 'tabelas',   label: 'Tabelas de preço',   icon: 'fas fa-tags',   count: priceTablesCount.value ?? undefined, hint: 'Histórico de tabelas lidas do CV' },
  { value: 'materiais', label: 'Materiais & Plantas', icon: 'fas fa-images', count: materialsCount.value, hint: 'Campanha, plantas e mapa' },
]);

// ── Filtros da aba Unidades ────────────────────────────────
const busca = ref('');
const filtroEtapa = ref('todas');
const filtroBloco = ref('todos');
const filtroStatus = ref([]); // chaves de UNIT_STATUS; vazio = todas

const etapaOptions = computed(() => [
  { value: 'todas', label: 'Todas as etapas' },
  ...(props.building.etapas || []).map((e) => ({ value: String(e.idetapa), label: e.nome })),
]);
const blocoOptions = computed(() => {
  const set = new Map();
  for (const u of units.value) {
    if (filtroEtapa.value !== 'todas' && String(u.idetapa) !== filtroEtapa.value) continue;
    set.set(u.idbloco, u.bloco);
  }
  return [{ value: 'todos', label: 'Todos os blocos' }, ...[...set].map(([v, l]) => ({ value: String(v), label: l }))];
});
const statusOptions = computed(() => [
  { value: 'todas', label: 'Todas as situações' },
  ...statusStages.value.map((s) => ({ value: s.key, label: s.label })),
]);
const filtroStatusSelect = computed({
  get: () => (filtroStatus.value.length === 1 ? filtroStatus.value[0] : 'todas'),
  set: (v) => { filtroStatus.value = v === 'todas' ? [] : [v]; },
});
const toggleStatus = (stage) => {
  const i = filtroStatus.value.indexOf(stage.key);
  if (i >= 0) filtroStatus.value.splice(i, 1);
  else filtroStatus.value.push(stage.key);
};
const filtrosAtivos = computed(() =>
  (busca.value ? 1 : 0) + (filtroEtapa.value !== 'todas' ? 1 : 0) + (filtroBloco.value !== 'todos' ? 1 : 0) + (filtroStatus.value.length ? 1 : 0));
const limparFiltros = () => { busca.value = ''; filtroEtapa.value = 'todas'; filtroBloco.value = 'todos'; filtroStatus.value = []; };

const unitsFiltradas = computed(() => {
  const q = busca.value.trim().toLowerCase();
  return units.value.filter((u) => {
    if (filtroEtapa.value !== 'todas' && String(u.idetapa) !== filtroEtapa.value) return false;
    if (filtroBloco.value !== 'todos' && String(u.idbloco) !== filtroBloco.value) return false;
    if (filtroStatus.value.length && !filtroStatus.value.includes(u.status.key)) return false;
    if (!q) return true;
    return [u.nome, u.bloco, u.etapa, u.idunidade_int, u.tipologia].some((v) => String(v ?? '').toLowerCase().includes(q));
  });
});

// Do funil da Visão geral direto para a lista já recortada
const verUnidades = (stage) => {
  filtroStatus.value = stage ? [stage.key] : [];
  activeTab.value = 'unidades';
};

const resumoFiltrado = computed(() => {
  const comValor = unitsFiltradas.value.filter((u) => u.valor_num != null);
  const vgv = comValor.reduce((s, u) => s + u.valor_num, 0);
  const area = comValor.reduce((s, u) => s + (u.area_num || 0), 0);
  return { n: unitsFiltradas.value.length, vgv, comValor: comValor.length, m2: area > 0 ? vgv / area : null };
});

const COLUNAS_UNIDADES = [
  { key: 'nome',           label: 'Unidade',   priority: 1, sortable: true },
  { key: 'status',         label: 'Situação',  priority: 1, sortable: true, sortValue: (u) => u.status.label, width: '140px' },
  { key: 'valor_num',      label: 'Valor',     priority: 1, numeric: true, sortable: true, format: fmtMoney, width: '150px' },
  { key: 'bloco',          label: 'Bloco',     priority: 2, sortable: true, width: '150px' },
  { key: 'etapa',          label: 'Etapa',     priority: 3, sortable: true, width: '130px' },
  { key: 'andar',          label: 'Andar',     priority: 2, sortable: true, width: '80px', align: 'center' },
  { key: 'area_num',       label: 'Área',      priority: 2, numeric: true, sortable: true, format: fmtArea, width: '110px' },
  { key: 'tipologia',      label: 'Tipologia', priority: 3, sortable: true },
  { key: 'vagas_garagem',  label: 'Vagas',     priority: 3, numeric: true, sortable: true, width: '70px' },
  { key: 'idunidade_int',  label: 'ID Sienge', priority: 3, width: '90px' },
];

// ── Materiais e plantas ────────────────────────────────────
const materiais = computed(() => (props.building.materiais_campanha || []).map((m) => ({
  ...m,
  href: m.tipo === 'youtube' ? m.servidor : m.arquivo,
  tamanho_num: Number(m.tamanho) || 0,
})));
const COLUNAS_MATERIAIS = [
  { key: 'nome',        label: 'Material', priority: 1, sortable: true },
  { key: 'tipo',        label: 'Tipo',     priority: 2, sortable: true, width: '120px' },
  { key: 'tamanho_num', label: 'Tamanho',  priority: 2, numeric: true, sortable: true, format: fmtMB, width: '110px' },
];
const COLUNAS_PLANTAS = [
  { key: 'nome', label: 'Planta', priority: 1, sortable: true },
];
const abrirLink = (href) => { if (href) window.open(href, '_blank', 'noopener'); };

// ── Cabeçalho ──────────────────────────────────────────────
const cvLink = computed(() =>
  `https://menin.cvcrm.com.br/gestor/cadastros/empreendimentos/${props.building.idempreendimento}/cadastro_simplificado`
);
const can = useCan('/crm/buildings');
const stage = computed(() => props.building.situacao_comercial?.[0]?.nome ?? null);
const stageChips = computed(() => [
  props.building.tipo_empreendimento?.[0]?.nome,
  props.building.situacao_obra?.[0]?.nome,
  props.building.segmento?.[0]?.nome,
].filter(Boolean));

// Campos de leitura das seções da Visão geral
const camposEmpresa = computed(() => [
  { label: 'Empresa',      value: props.building.nome_empresa },
  { label: 'ID Empresa',   value: props.building.idempresa_int, mono: true },
  { label: 'CDC Sienge',   value: props.building.idempreendimento_int, mono: true },
  { label: 'ID CV',        value: props.building.idempreendimento, mono: true },
  { label: 'Matrícula',    value: props.building.matricula, mono: true },
  { label: 'CNPJ',         value: props.building.cnpj_empesa, mono: true },
]);
const camposEndereco = computed(() => [
  { label: 'Endereço', value: [props.building.endereco_emp, props.building.numero].filter(Boolean).join(', ') },
  { label: 'Bairro',   value: props.building.bairro },
  { label: 'Cidade',   value: [props.building.cidade, props.building.estado].filter(Boolean).join(' · ') },
  { label: 'CEP',      value: props.building.cep, mono: true },
  { label: 'Região',   value: props.building.regiao },
]);
const camposCronograma = computed(() => [
  { label: 'Previsão de entrega', value: props.building.data_entrega, mono: true, tone: 'text-data-warn' },
  { label: 'Início das vendas',   value: props.building.periodo_venda_inicio, mono: true },
  { label: 'Tabela no CV',        value: props.building.tabela?.nome },
  { label: 'Vigência da tabela',  value: props.building.tabela ? `${props.building.tabela.data_vigencia_de} → ${props.building.tabela.data_vigencia_ate}` : null, mono: true },
]);

onMounted(fetchWeather);

// A Eme fica por cima deste modal: ela precisa saber qual empreendimento e
// qual seção estão abertos para "esse empreendimento" resolver sozinho.
watch(activeTab, (tab) => {
  const secao = tabOptions.value.find((t) => t.value === tab)?.label || tab;
  setEmeScreenDetalhe(`Empreendimento ${props.building.nome} (CV ${props.building.idempreendimento}), seção ${secao}`);
}, { immediate: true });
onBeforeUnmount(() => setEmeScreenDetalhe(''));
</script>

<template>
  <!-- `screen`: o empreendimento toma a tela inteira, como toda listagem do
       Office. O Fechar mora no canto de cima (padrão do Modal), e as ações
       ficam no cabeçalho, sempre à vista. -->
  <Modal :open="true" size="screen" :padded="false" @close="closeModal">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <img :src="building.logo || building.foto || '/noimg.jpg'" :alt="building.nome"
          class="h-9 w-9 rounded-lg object-cover border border-line shrink-0 bg-surface-sunken" />
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">{{ building.nome }}</h2>
          <p class="text-xs text-ink-muted mt-0.5 truncate">
            <span v-if="stage" class="text-ink">{{ stage }}</span><span v-if="stage"> · </span>{{ building.cidade }}<template v-if="building.estado">/{{ building.estado }}</template>
          </p>
        </div>
        <div class="ml-auto shrink-0 flex items-center gap-2">
          <a :href="cvLink" target="_blank" rel="noopener" v-tippy="'Abrir no CV CRM'"
            class="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors shadow-soft focus-ring">
            <img src="/CVLogo.png" alt="CV CRM" class="h-4 brightness-0 invert" />
            <span class="hidden sm:inline">Abrir no CV</span>
            <i class="fas fa-arrow-up-right-from-square text-[10px]"></i>
          </a>
        </div>
      </div>
    </template>

    <div class="h-full overflow-y-auto">

      <!-- Hero com foto + gradient (faixa de identidade, não protagonista).
           Sem overflow-hidden: o tooltip do clima precisa escapar do hero. -->
      <div class="relative h-36 sm:h-44">
        <img :src="building.foto || '/noimg.jpg'" :alt="building.nome"
          class="absolute inset-0 w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

        <!-- Clima (tooltip no hover), acima da barra de abas sticky (z-30) -->
        <div class="absolute bottom-4 right-4 text-3xl z-40">
          <WeatherInfo :weather="buildingStore.weather" :city="building.cidade" />
        </div>

        <div class="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10">
          <div class="flex flex-wrap gap-1.5 mb-2">
            <span v-if="stage"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-raised/20 backdrop-blur-md border border-white/30 text-white text-xs font-semibold">
              <span class="h-1.5 w-1.5 rounded-full bg-surface-raised"></span>{{ stage }}
            </span>
            <span v-for="chip in stageChips" :key="chip"
              class="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-raised/15 backdrop-blur-md border border-white/20 text-white/90 text-micro font-medium">
              {{ chip }}
            </span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-tight drop-shadow-lg">
            {{ building.nome }}
          </h1>
          <p class="text-sm text-white/85 mt-1 inline-flex items-center gap-1.5 drop-shadow">
            <i class="fas fa-location-dot text-xs"></i>
            {{ building.cidade }}<template v-if="building.estado">/{{ building.estado }}</template>
          </p>
        </div>
      </div>

      <!-- Abas: sticky no scroll único, todas à vista (no celular em duas
           colunas, nunca escondidas atrás de rolagem lateral). -->
      <nav class="sticky top-0 z-30 border-b border-line bg-surface" role="tablist" aria-label="Seções do empreendimento">
        <div class="grid grid-cols-2 md:flex md:items-stretch px-2 sm:px-4">
          <button v-for="t in tabOptions" :key="t.value" type="button" role="tab"
            :aria-selected="activeTab === t.value"
            @click="activeTab = t.value"
            class="relative flex items-center gap-2.5 px-3 sm:px-4 py-3 text-left min-h-[52px] transition-colors focus-ring rounded-md"
            :class="activeTab === t.value ? 'text-accent' : 'text-ink-muted hover:text-ink'">
            <i :class="t.icon" class="text-sm w-4 text-center shrink-0"></i>
            <span class="min-w-0">
              <span class="block text-sm font-semibold leading-tight truncate">
                {{ t.label }}
                <span v-if="t.count !== undefined" class="ml-1 px-1.5 py-0.5 rounded-md text-micro font-mono align-middle"
                  :class="activeTab === t.value ? 'bg-accent-soft text-accent' : 'bg-line/50 text-ink-subtle'">{{ t.count }}</span>
              </span>
              <span class="hidden lg:block text-micro text-ink-subtle leading-tight mt-0.5 truncate">{{ t.hint }}</span>
            </span>
            <span class="absolute left-2 right-2 bottom-0 h-0.5 rounded-t"
              :class="activeTab === t.value ? 'bg-accent' : 'bg-transparent'"></span>
          </button>
        </div>
      </nav>

      <div class="p-4 sm:p-6 space-y-4">

        <!-- ── Tabelas de preço (histórico) ─────────────────────── -->
        <PriceTablesTab v-if="activeTab === 'tabelas'"
          :idempreendimento="building.idempreendimento"
          v-model:tabela="tabelaAberta"
          :can-sync="can('sync')"
          @loaded="priceTablesCount = $event" />

        <!-- ── Espelho de vendas ────────────────────────────────── -->
        <MirrorTab v-else-if="activeTab === 'espelho'"
          :idempreendimento="building.idempreendimento"
          :can-configure="can('configure')" />

        <!-- ── Visão geral ──────────────────────────────────────── -->
        <template v-else-if="activeTab === 'geral'">
          <StatRow :items="kpiCards" :cols="{ sm: 2, md: 2, lg: 4 }" />

          <Panel title="Situação das unidades" icon="fas fa-chart-bar"
            subtitle="Clique numa faixa para abrir a lista de unidades já recortada"
            :empty="!totalUnits" empty-icon="fas fa-house" empty-title="Nenhuma unidade cadastrada no CV">
            <FunnelStrip :stages="statusStages" :total="totalUnits" unit="unidades" @select="verUnidades" />
          </Panel>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel v-for="sec in [
                { title: 'Sienge / Empresa', icon: 'fas fa-building-circle-check', campos: camposEmpresa },
                { title: 'Localização',      icon: 'fas fa-location-dot',          campos: camposEndereco },
                { title: 'Cronograma',       icon: 'far fa-calendar-check',        campos: camposCronograma },
              ]" :key="sec.title" :title="sec.title" :icon="sec.icon">
              <template v-if="sec.title === 'Localização' && building.latitude && building.longitude" #actions>
                <a :href="`https://www.google.com/maps?q=${building.latitude},${building.longitude}`" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors focus-ring rounded">
                  <i class="fas fa-arrow-up-right-from-square text-[10px]"></i> Google Maps
                </a>
              </template>
              <template v-else-if="sec.title === 'Cronograma' && building.tabela" #actions>
                <Badge :variant="building.tabela.aprovado === 'S' ? 'success' : 'danger'" size="sm">
                  {{ building.tabela.aprovado === 'S' ? 'Tabela aprovada' : 'Tabela pendente' }}
                </Badge>
              </template>
              <dl class="divide-y divide-line-subtle -my-1">
                <div v-for="c in sec.campos" :key="c.label" class="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                  <dt class="text-ink-muted shrink-0">{{ c.label }}</dt>
                  <dd class="text-right min-w-0 truncate" :class="[c.mono ? 'font-mono tabular-nums' : 'font-medium', c.value ? (c.tone || 'text-ink') : 'text-ink-subtle']"
                    :title="c.value ? String(c.value) : ''">
                    {{ c.value || '-' }}
                  </dd>
                </div>
              </dl>
            </Panel>
          </div>
        </template>

        <!-- ── Unidades ─────────────────────────────────────────── -->
        <template v-else-if="activeTab === 'unidades'">
          <Panel v-if="!totalUnits" empty empty-icon="fas fa-house"
            empty-title="Nenhuma etapa/unidade cadastrada no CV" />

          <template v-else>
            <Panel title="Situação" icon="fas fa-chart-bar" subtitle="Clique numa faixa para filtrar a lista; clique de novo para tirar">
              <FunnelStrip :stages="statusStages" :total="totalUnits" unit="unidades"
                :active="filtroStatus" @select="toggleStatus" @clear="filtroStatus = []" />
            </Panel>

            <FilterBar :active-count="filtrosAtivos" auto-apply :cols="4" @clear="limparFiltros">
              <Input v-model="busca" label="Busca" placeholder="Unidade, bloco, etapa, tipologia ou ID" iconLeft="fas fa-magnifying-glass" />
              <Select v-model="filtroEtapa" label="Etapa" :options="etapaOptions" />
              <Select v-model="filtroBloco" label="Bloco" :options="blocoOptions" />
              <Select v-model="filtroStatusSelect" label="Situação" :options="statusOptions" />
              <template #actions>
                <IconButton v-if="filtrosAtivos" icon="fas fa-eraser" size="sm" label="Limpar filtros" @click="limparFiltros" />
              </template>
            </FilterBar>

            <Panel title="Unidades" icon="fas fa-house" :padded="false">
              <template #actions>
                <span class="text-xs text-ink-subtle font-mono tabular-nums">
                  {{ resumoFiltrado.n }} de {{ totalUnits }}
                  <template v-if="resumoFiltrado.comValor"> · {{ fmtMoney(resumoFiltrado.vgv) }}<span v-if="resumoFiltrado.m2"> · {{ fmtMoney(resumoFiltrado.m2) }}/m²</span></template>
                </span>
              </template>
              <div class="p-3 sm:p-4">
                <DataTable :columns="COLUNAS_UNIDADES" :rows="unitsFiltradas" row-key="idunidade" sort-by="nome"
                  empty-icon="fas fa-filter" empty-title="Nenhuma unidade com esses filtros" empty-text="Ajuste a busca ou limpe os filtros.">
                  <template #emptyActions>
                    <IconButton icon="fas fa-eraser" label="Limpar filtros" @click="limparFiltros" />
                  </template>
                  <template #cell-nome="{ row }"><span class="font-medium text-ink">{{ row.nome }}</span></template>
                  <template #cell-status="{ row }">
                    <Badge :variant="row.status.variant" size="sm"><i :class="row.status.icon" class="text-[9px]"></i>{{ row.status.label }}</Badge>
                  </template>
                  <template #cell-valor_num="{ value, row }">
                    <b :class="row.valor_num != null ? 'text-ink' : 'text-ink-subtle'">{{ value }}</b>
                  </template>
                </DataTable>
              </div>
            </Panel>
          </template>
        </template>

        <!-- ── Materiais & Plantas ──────────────────────────────── -->
        <template v-else-if="activeTab === 'materiais'">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Materiais de campanha" icon="fas fa-images" :padded="false"
              :empty="!materiais.length" empty-icon="fas fa-images" empty-title="Nenhum material de campanha no CV">
              <template #actions><Badge variant="neutral" size="sm">{{ materiais.length }}</Badge></template>
              <div class="p-3 sm:p-4">
                <DataTable :columns="COLUNAS_MATERIAIS" :rows="materiais" row-key="idarquivo" clickable sort-by="nome"
                  @row-click="abrirLink($event.href)">
                  <template #cell-nome="{ row }">
                    <span class="inline-flex items-center gap-2 min-w-0">
                      <i :class="row.tipo === 'youtube' ? 'fab fa-youtube text-data-neg' : 'fas fa-file text-accent'" class="text-sm shrink-0"></i>
                      <span class="font-medium text-ink truncate">{{ row.nome }}</span>
                    </span>
                  </template>
                  <template #actions="{ row }">
                    <IconButton icon="fas fa-arrow-up-right-from-square" size="sm" label="Abrir" @click.stop="abrirLink(row.href)" />
                  </template>
                </DataTable>
              </div>
            </Panel>

            <Panel title="Plantas mapeadas" icon="fas fa-drafting-compass" :padded="false"
              :empty="!building.plantas_mapeadas?.length" empty-icon="fas fa-drafting-compass" empty-title="Nenhuma planta mapeada no CV">
              <template #actions><Badge variant="neutral" size="sm">{{ building.plantas_mapeadas?.length || 0 }}</Badge></template>
              <div class="p-3 sm:p-4">
                <DataTable :columns="COLUNAS_PLANTAS" :rows="building.plantas_mapeadas || []" row-key="idplanta_mapeada" clickable sort-by="nome"
                  @row-click="abrirLink($event.link)">
                  <template #cell-nome="{ row }"><span class="font-medium text-ink">{{ row.nome }}</span></template>
                  <template #actions="{ row }">
                    <IconButton icon="fas fa-arrow-up-right-from-square" size="sm" label="Abrir" @click.stop="abrirLink(row.link)" />
                  </template>
                </DataTable>
              </div>
            </Panel>
          </div>

          <Panel v-if="building.latitude && building.longitude" title="Mapa" icon="fas fa-map-location-dot" :padded="false">
            <template #actions>
              <a :href="`https://www.google.com/maps?q=${building.latitude},${building.longitude}`" target="_blank" rel="noopener"
                class="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors focus-ring rounded">
                <i class="fas fa-arrow-up-right-from-square text-[10px]"></i> Google Maps
              </a>
            </template>
            <iframe
              :src="`https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d1579.2792625838822!2d${building.longitude}!3d${building.latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e1!3m2!1spt-BR!2sbr!4v1738328467636!5m2!1spt-BR!2sbr`"
              allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
              class="w-full h-72 block"></iframe>
          </Panel>
        </template>
      </div>
    </div>
  </Modal>
</template>
