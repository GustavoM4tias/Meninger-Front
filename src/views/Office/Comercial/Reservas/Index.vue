<script setup>
import { onMounted, ref, toRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useReservasStore } from '@/stores/Comercial/Reservas/reservasStore';

import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Button from '@/components/UI/Button.vue';

import SummaryCards from './components/SummaryCards.vue';
import FiltersBar from './components/FiltersBar.vue';
import ReservasTable from './components/ReservasTable.vue';
import ReservaModal from './components/ReservaModal.vue';
import { STAGE_GROUPS } from './stages.js';

const store = useReservasStore();
const route = useRoute();
const router = useRouter();

const reservas = toRef(store, 'reservas');
const periodo = toRef(store, 'periodo');
const error = toRef(store, 'error');
const filtros = toRef(store, 'filtros');
const kpiSituacoes = toRef(store, 'kpiSituacoes');
const porEmpreendimento = toRef(store, 'porEmpreendimento');

const ARRAY_FIELDS = ['empreendimento', 'etapa', 'bloco', 'unidade', 'situacao', 'status_repasse', 'tipovenda', 'imobiliaria', 'corretor', 'empresa_correspondente', 'lead_origem'];
const STR_FIELDS = ['nome', 'documento', 'data_inicio', 'data_fim'];
const BOOL_FIELDS = ['only_active', 'only_vendida', 'with_lead', 'excluir_painel'];

function syncFiltersFromUrl() {
  const q = route.query;
  if (!Object.keys(q).length) return;
  const next = { ...filtros.value };
  for (const k of ARRAY_FIELDS) next[k] = q[k] ? String(q[k]).split(',').filter(Boolean) : [];
  for (const k of STR_FIELDS) next[k] = q[k] ? String(q[k]) : '';
  for (const k of BOOL_FIELDS) next[k] = String(q[k]) === 'true';
  Object.assign(filtros.value, next);
}
function syncUrlFromFilters() {
  const q = {};
  Object.entries(filtros.value).forEach(([k, v]) => {
    if (Array.isArray(v)) { if (v.length) q[k] = v.join(','); }
    else if (typeof v === 'boolean') { if (v) q[k] = 'true'; }
    else if (v && String(v).trim()) q[k] = String(v).trim();
  });
  router.replace({ query: q });
}

const loading = ref(false);
const modalVisivel = ref(false);
const modalLista = ref([]);
const modalMode = ref('list');

function abrirModal([list, mode]) {
  modalLista.value = list || [];
  modalMode.value = mode || 'list';
  modalVisivel.value = true;
}

async function buscar() {
  syncUrlFromFilters();
  loading.value = true;
  try { await store.fetchReservas(true); }
  finally { loading.value = false; }
}

function limpar() {
  Object.assign(filtros.value, {
    nome: '', documento: '',
    empreendimento: [], etapa: [], bloco: [], unidade: [],
    situacao: [], status_repasse: [], tipovenda: [],
    imobiliaria: [], corretor: [],
    empresa_correspondente: [],
    lead_origem: [],
    only_active: false, only_vendida: false, with_lead: false, excluir_painel: false,
    data_inicio: '', data_fim: '',
  });
  router.replace({ query: {} });
  buscar();
}

function onFiltrarSituacao(sit) {
  const set = new Set(filtros.value.situacao || []);
  if (sit && !set.has(sit)) set.add(sit);
  filtros.value.situacao = Array.from(set);
  buscar();
}

function onFiltrarGrupo(g) {
  const items = (kpiSituacoes.value?.items || []);
  const sitsDoGrupo = items.filter(it => {
    const bucket = STAGE_GROUPS.find(b => b.match({ situacao: { nome: it.key } }));
    return bucket?.key === g.key;
  }).map(it => it.key);
  filtros.value.situacao = sitsDoGrupo;
  buscar();
}

onMounted(async () => {
  syncFiltersFromUrl();
  loading.value = true;
  try { await store.fetchReservas(true); }
  finally { loading.value = false; }
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="full">

      <!-- Header -->
      <PageHeader title="Reservas"
        subtitle="Funil pós pré-cadastro — etapas do CRM (reservada, em contrato, em repasse, vendida, cancelada). Período pela data de cadastro."
        icon="fas fa-bookmark">
        <template #title>
          <span>Reservas</span>
          <Favorite :router="'/comercial/reservas-report'" :section="'Reservas'" />
        </template>
      </PageHeader>

      <!-- Filtros -->
      <div class="mb-4">
        <FiltersBar v-model:filtros="filtros"
          :enterprises-options="store.empreendimentosOptions"
          :situacoes-options="store.situacoesOptions"
          :status-repasse-options="store.statusRepasseOptions"
          :tipo-venda-options="store.tipoVendaOptions"
          :imobiliarias-options="store.imobiliariasOptions"
          :corretores-options="store.corretoresOptions"
          :empresas-correspondentes-options="store.empresasCorrespondentesOptions"
          :lead-origens-options="store.leadOrigensOptions"
          @buscar="buscar" @limpar="limpar" />
      </div>

      <!-- Erro -->
      <div v-if="error"
        class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <i class="fas fa-circle-exclamation"></i>{{ error }}
        </div>
        <Button variant="outline" size="sm" icon="fas fa-rotate-right" @click="buscar()">
          Tentar novamente
        </Button>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="py-16 flex flex-col items-center gap-3 text-ink-muted">
        <Spinner size="lg" />
        <p class="text-sm">Carregando reservas...</p>
      </div>

      <!-- Conteúdo -->
      <template v-else>
        <div class="space-y-4">
          <SummaryCards :periodo="periodo" :kpi="kpiSituacoes"
            :tempo-medio="store.tempoMedioReservaDias"
            :tempo-medio-finalizar="store.tempoMedioFinalizar"
            :outcome="store.outcomeBreakdown"
            :taxa-conversao="store.taxaConversao"
            :bucket-counts="store.bucketCounts"
            @filtrarSituacao="onFiltrarSituacao"
            @filtrarGrupo="onFiltrarGrupo" />
          <ReservasTable :data="porEmpreendimento" @abrirModal="abrirModal" />
        </div>
      </template>
    </PageContainer>

    <ReservaModal :reservas="modalLista" :visivel="modalVisivel"
      :initial-mode="modalMode" @fechar="modalVisivel = false" />
  </div>
</template>
