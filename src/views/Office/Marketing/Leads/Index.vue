<script setup>
import { onMounted, ref, toRef, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useLeadsStore } from '@/stores/Marketing/Lead/leadsStore';

import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

import Filas from './components/Filas.vue';
import SummaryCards from './components/SummaryCards.vue';
import DashboardCharts from './components/DashboardCharts.vue';
import FiltersBar from './components/FiltersBar.vue';
import LeadsTable from './components/LeadsTable.vue';
import LeadModal from './components/LeadModal.vue';
import LeadsKpiCards from './components/LeadsKpiCards.vue';
import CommercialFunnel from './components/CommercialFunnel.vue';
import PeriodPicker from '../Campanhas/components/PeriodPicker.vue';
import dayjs from 'dayjs';

const store = useLeadsStore();
const route = useRoute();
const router = useRouter();

const leads = toRef(store, 'leads');
const periodo = toRef(store, 'periodo');
const filas = toRef(store, 'filas');
const error = toRef(store, 'error');
const filtros = toRef(store, 'filtros');
const kpiSituacoes = toRef(store, 'kpiSituacoes');
const leadsByEnterprise = toRef(store, 'leadsByEnterprise');
const situationsList = toRef(store, 'situationsList');
const prevCount = toRef(store, 'prevCount');
const prevSituacoes = toRef(store, 'prevSituacoes');

// ── Período mestre (padrão do relatório Meta) ──────────────────────────────
const periodoPicker = ref({
  since: dayjs().startOf('month').format('YYYY-MM-DD'),
  until: dayjs().format('YYYY-MM-DD'),
  preset: 'this_month',
});

// Busca leads + período anterior (pros deltas) de uma vez.
async function refreshLeads() {
  await store.fetchLeads(true);
  await store.fetchComparison();
}

function onPeriodChange(p) {
  periodoPicker.value = p;
  filtros.value.data_inicio = p.since;
  filtros.value.data_fim = p.until;
  syncUrlFromFilters();
  refreshLeads();
}

const ARRAY_FIELDS = ['imobiliaria', 'corretor', 'situacao_nome', 'midia_principal', 'origem', 'empreendimento'];
const STRING_FIELDS = ['nome', 'email', 'telefone', 'data_inicio', 'data_fim', 'cidade'];

function syncFiltersFromUrl() {
  const q = route.query;
  if (!Object.keys(q).length) return;
  const next = { ...filtros.value };
  for (const key of ARRAY_FIELDS) {
    next[key] = q[key]
      ? String(q[key]).split(',').map(s => s.trim()).filter(Boolean)
      : [];
  }
  for (const key of STRING_FIELDS) {
    next[key] = q[key] ? String(q[key]) : '';
  }
  Object.assign(filtros.value, next);
  if (q.excluir_painel === '1') store.applyDefaultOrigens();
}

function syncUrlFromFilters() {
  const q = {};
  Object.entries(filtros.value).forEach(([k, v]) => {
    if (Array.isArray(v)) { if (v.length) q[k] = v.join(','); }
    else if (v && String(v).trim()) q[k] = String(v).trim();
  });
  router.replace({ query: q });
}

const view = ref('overview'); // overview | dashboard
const viewOptions = computed(() => [
  { value: 'overview',  label: 'Visão geral', icon: 'fas fa-chart-simple' },
  { value: 'dashboard', label: 'Dashboard',   icon: 'fas fa-chart-line' },
]);

const modalVisivel = ref(false);
const modalLeads = ref([]);
const modalMode = ref('list');

function abrirModal([list, mode]) {
  modalLeads.value = list || [];
  modalMode.value = mode || 'list';
  modalVisivel.value = true;
}

function buscar() {
  // Se o usuário mexeu nas datas nos filtros, o picker vira "personalizado".
  const fi = filtros.value.data_inicio, ff = filtros.value.data_fim;
  if (fi && ff && (fi !== periodoPicker.value.since || ff !== periodoPicker.value.until)) {
    periodoPicker.value = { since: fi, until: ff, preset: 'custom' };
  }
  syncUrlFromFilters();
  refreshLeads();
}

function limpar() {
  periodoPicker.value = {
    since: dayjs().startOf('month').format('YYYY-MM-DD'),
    until: dayjs().format('YYYY-MM-DD'),
    preset: 'this_month',
  };
  Object.assign(filtros.value, {
    nome: '', email: '', telefone: '',
    imobiliaria: [], corretor: [],
    midia_principal: [], origem: [], empreendimento: [],
    data_inicio: periodoPicker.value.since, data_fim: periodoPicker.value.until, cidade: '',
  });
  store.applyDefaultSituacoes();
  router.replace({ query: {} });
  refreshLeads();
}

function onFiltrarSituacao(situacao) {
  const set = new Set(filtros.value.situacao_nome || []);
  if (situacao && !set.has(situacao)) set.add(situacao);
  filtros.value.situacao_nome = Array.from(set);
  syncUrlFromFilters();
  refreshLeads();
}

onMounted(async () => {
  syncFiltersFromUrl();
  // Se a URL trouxe datas, o picker reflete; senão mantém o default (este mês).
  if (filtros.value.data_inicio && filtros.value.data_fim) {
    periodoPicker.value = { since: filtros.value.data_inicio, until: filtros.value.data_fim, preset: 'custom' };
  } else {
    filtros.value.data_inicio = periodoPicker.value.since;
    filtros.value.data_fim = periodoPicker.value.until;
  }
  await store.fetchFilas();
  await refreshLeads();
  if (route.query.excluir_painel === '1') store.applyDefaultOrigens();
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="full">

      <!-- Header -->
      <PageHeader title="Relatório de Leads"
        subtitle="Acompanhe o desempenho dos leads em tempo real."
        icon="fas fa-chart-line">
        <template #title>
          <span>Relatório de Leads</span>
          <Favorite :router="'/marketing/leads'" :section="'Leads'" />
        </template>
        <template #actions>
          <PageHelp storage-key="marketing-leads" title="Como usar o Relatório de Leads"
            intro="Acompanhe em tempo real o desempenho dos leads captados — por situação e por empreendimento."
            :steps="[
              { title: 'Filtre o período', text: 'Na barra de Filtros, ajuste datas, empreendimento, mídia, situação e mais; depois clique em Buscar.' },
              { title: 'Leia os indicadores', text: 'Os cartões mostram os leads por situação. Clique em um para filtrar por ele.' },
              { title: 'Por empreendimento', text: 'Na tabela, veja a distribuição e abra os leads de cada empreendimento em lista, funil, barras ou pizza.' },
              { title: 'Visão analítica', text: 'Alterne para “Dashboard” no topo para os gráficos completos.' },
            ]"
            :tips="[
              'As filas de atendimento ficam no botão ao lado do seletor de visão.',
              'Selecione vários empreendimentos na tabela para abri-los juntos.',
            ]" />
          <Filas :filas="filas" />
          <SegmentedControl v-model="view" :options="viewOptions" size="sm" />
        </template>
      </PageHeader>

      <!-- Período mestre -->
      <div class="mb-3">
        <PeriodPicker :periodo="periodoPicker" @update:periodo="onPeriodChange" />
      </div>

      <!-- Filtros -->
      <div class="mb-4">
        <FiltersBar
          v-model:filtros="filtros"
          :empreendimentos-options="store.empreendimentosOptions"
          :origens-options="store.origensOptions"
          :situacoes-options="store.situacoesOptions"
          :midias-options="store.midiasOptions"
          :imobiliarias-options="store.imobiliariasOptions"
          :corretores-options="store.corretoresOptions"
          @buscar="buscar" @limpar="limpar"
        />
      </div>

      <!-- Erro -->
      <div v-if="error"
        class="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ error }}
      </div>

      <!-- Visão geral -->
      <template v-if="view === 'overview'">
        <div class="space-y-4">
          <!-- KPIs com variação vs período anterior -->
          <LeadsKpiCards
            :total="kpiSituacoes.total"
            :prev-total="prevCount"
            :situations="situationsList"
            :prev-situacoes="prevSituacoes" />

          <!-- Funil comercial (destaque) + situações detalhadas lado a lado -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CommercialFunnel
              :situations="situationsList"
              :prev-situacoes="prevSituacoes"
              :total="kpiSituacoes.total"
              @filtrarSituacao="onFiltrarSituacao" />
            <SummaryCards :periodo="periodo" :kpi="kpiSituacoes" @filtrarSituacao="onFiltrarSituacao" />
          </div>

          <LeadsTable :data="leadsByEnterprise" @abrirModal="abrirModal" />
        </div>
      </template>

      <!-- Dashboard analítico -->
      <template v-else>
        <DashboardCharts :leads="leads" :leads-by-enterprise="leadsByEnterprise"
          @abrirModal="abrirModal" @filtrarSituacao="onFiltrarSituacao" />
      </template>
    </PageContainer>

    <LeadModal :leads="modalLeads" :visivel="modalVisivel" :initial-mode="modalMode"
      @fechar="modalVisivel = false" />
  </div>
</template>
