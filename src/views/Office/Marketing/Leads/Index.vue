<script setup>
import { onMounted, onUnmounted, ref, toRef, computed } from 'vue';
import { useCan } from '@/composables/useCan';
import { useRoute, useRouter } from 'vue-router';
import { useLeadsStore } from '@/stores/Marketing/Lead/leadsStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';

import Filas from './components/Filas.vue';
// SummaryCards (bloco "Período" + situações detalhadas) está oculto por
// enquanto — descomente junto com o uso no template para trazer de volta.
// import SummaryCards from './components/SummaryCards.vue';
import FiltersBar from './components/FiltersBar.vue';
import LeadsTable from './components/LeadsTable.vue';
import LeadModal from './components/LeadModal.vue';
import LeadDetailModal from './components/LeadDetailModal.vue';
import LeadsKpiCards from './components/LeadsKpiCards.vue';
import CommercialFunnel from './components/CommercialFunnel.vue';
import LeadsTrendCard from './components/LeadsTrendCard.vue';
import EnterpriseDonut from './components/EnterpriseDonut.vue';
import CaptureHeatmap from './components/CaptureHeatmap.vue';
import RecentLeads from './components/RecentLeads.vue';
import LeadsBySource from './components/LeadsBySource.vue';
import Dropdown from '@/components/UI/Dropdown.vue';
import ExportDisclaimerModal from '@/components/config/ExportDisclaimerModal.vue';
import ExportLogModal from './components/ExportLogModal.vue';
import { exportReportPdf, exportReportHtml } from '@/utils/Leads/exportLeads';
import { registrarExport } from '@/utils/Config/exportLog';
import dayjs from 'dayjs';

const store = useLeadsStore();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const leads = toRef(store, 'leads');
const periodo = toRef(store, 'periodo');
const filas = toRef(store, 'filas');
const filasSemVinculo = toRef(store, 'filasSemVinculo');
const filaEmpreendimentos = toRef(store, 'filaEmpreendimentos');
const error = toRef(store, 'error');
const filtros = toRef(store, 'filtros');
const kpiSituacoes = toRef(store, 'kpiSituacoes');
const leadsByEnterprise = toRef(store, 'leadsByEnterprise');
const situationsList = toRef(store, 'situationsList');
const prevCount = toRef(store, 'prevCount');
const prevSituacoes = toRef(store, 'prevSituacoes');
// "Leads recentes": lista à parte, sempre os últimos captados (fora do filtro).
const recentLeads = toRef(store, 'recentLeads');

// Período padrão = mês atual. As datas moram nos Filtros (Data início/fim);
// não há seletor de período separado.
const defaultSince = () => dayjs().startOf('month').format('YYYY-MM-DD');
const defaultUntil = () => dayjs().format('YYYY-MM-DD');

// Busca leads + período anterior (pros deltas) de uma vez.
async function refreshLeads() {
  await store.fetchLeads(true);
  await store.fetchComparison();
  atualizadoEm.value = dayjs();
}

const ARRAY_FIELDS = ['imobiliaria', 'corretor', 'situacao_nome', 'midia_principal', 'origem', 'empreendimento'];
const STRING_FIELDS = ['nome', 'email', 'telefone', 'data_inicio', 'data_fim', 'cidade'];

function syncFiltersFromUrl() {
  const q = route.query;
  // ?idlead= sozinho é deep link de UM lead, não recorte de dashboard: deixa os
  // filtros padrão em pé (senão a tela abriria sem o corte de origem/situação).
  if (!Object.keys(q).filter((k) => k !== 'idlead').length) return;
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

// ── Cabeçalho dinâmico ─────────────────────────────────────────────────────
const atualizadoEm = ref(dayjs());
const subtitleText = computed(() => {
  const n = kpiSituacoes.value.total || 0;
  const emps = leadsByEnterprise.value.length || 0;
  const intFmt = new Intl.NumberFormat('pt-BR');
  return `${intFmt.format(n)} leads captados · ${emps} empreendimento${emps === 1 ? '' : 's'} · atualizado ${atualizadoEm.value.format('HH:mm')}`;
});

// ── Exportação ─────────────────────────────────────────────────────────────
const exporting = ref('');
const exportError = ref('');

// Só os filtros realmente preenchidos, para a trilha guardar o recorte exato.
function filtrosAplicados() {
  const out = {};
  Object.entries(filtros.value).forEach(([k, v]) => {
    if (Array.isArray(v)) { if (v.length) out[k] = v; }
    else if (v && String(v).trim()) out[k] = v;
  });
  return out;
}

// Toda exportação passa pelo aviso de responsabilidade antes de gerar.
const disclaimer = ref({ open: false, kind: '' });
const autorExport = computed(() => ({
  nome: authStore.user?.username || '',
  email: authStore.user?.email || '',
}));

// Trilha de exportações — exclusiva do admin.
// Acao da tela (lib/screenCapabilities.js no back). Ver composables/useCan.js.
const can = useCan('/marketing/leads');
const logAberto = ref(false);

function pedirExport(kind) {
  if (exporting.value) return;
  disclaimer.value = { open: true, kind };
}
function cancelarExport() {
  disclaimer.value = { open: false, kind: '' };
}
function confirmarExport() {
  const kind = disclaimer.value.kind;
  disclaimer.value = { open: false, kind: '' };
  doExport(kind);
}

async function doExport(kind) {
  if (exporting.value) return;
  exporting.value = kind;
  exportError.value = '';
  try {
    // Carimbo de autoria: quem exportou e quando (vai no HTML e no PDF).
    const range = {
      leads: leads.value,
      from: filtros.value.data_inicio,
      to: filtros.value.data_fim,
      geradoPor: autorExport.value,
    };
    if (kind === 'pdf') {
      await exportReportPdf(range);
    } else if (kind === 'html') {
      await exportReportHtml(range);
    }

    // Trilha de auditoria — só depois de a exportação ter dado certo.
    registrarExport({
      report: 'leads',
      format: kind,
      periodStart: filtros.value.data_inicio || null,
      periodEnd: filtros.value.data_fim || null,
      recordCount: leads.value.length,
      filters: filtrosAplicados(),
    });
  } catch (e) {
    exportError.value = e?.message || 'Falha ao exportar.';
  } finally {
    exporting.value = '';
  }
}

// Detalhe de um lead — abre direto no modal do próprio lead.
const leadDetalhe = ref(null);
const leadDetalheVisivel = ref(false);
function abrirLeadDetalhe(lead) {
  if (!lead) return;
  leadDetalhe.value = lead;
  leadDetalheVisivel.value = true;
}

// Deep link ?idlead=123 — chega do selo "Lead" na listagem do Faturamento /
// Vendas x Projeção. Abre o detalhe direto, sem depender do período do
// dashboard (o lead costuma ser bem anterior ao mês corrente).
async function abrirLeadDaUrl() {
  const id = route.query.idlead;
  if (!id) return;
  const lead = await store.fetchLeadById(id);
  if (lead) abrirLeadDetalhe(lead);
}

const modalVisivel = ref(false);
const modalLeads = ref([]);
const modalMode = ref('list');

function abrirModal([list, mode]) {
  modalLeads.value = list || [];
  modalMode.value = mode || 'list';
  modalVisivel.value = true;
}

function buscar() {
  syncUrlFromFilters();
  refreshLeads();
}

function limpar() {
  Object.assign(filtros.value, {
    nome: '', email: '', telefone: '',
    imobiliaria: [], corretor: [],
    midia_principal: [], origem: [], empreendimento: [],
    data_inicio: defaultSince(), data_fim: defaultUntil(), cidade: '',
  });
  store.applyDefaultSituacoes();
  store.applyDefaultOrigens();
  router.replace({ query: {} });
  refreshLeads();
}

function onFiltrarOrigem(origem) {
  const set = new Set(filtros.value.origem || []);
  if (origem && !set.has(origem)) set.add(origem);
  filtros.value.origem = Array.from(set);
  syncUrlFromFilters();
  refreshLeads();
}

function onFiltrarSituacao(situacao) {
  const set = new Set(filtros.value.situacao_nome || []);
  if (situacao && !set.has(situacao)) set.add(situacao);
  filtros.value.situacao_nome = Array.from(set);
  syncUrlFromFilters();
  refreshLeads();
}

// Painel "Leads recentes" atualiza ao ABRIR a tela e ao FOCAR a aba (sem polling).
function refreshRecent() { store.fetchRecentLeads(); }
function onVisibility() { if (document.visibilityState === 'visible') refreshRecent(); }

onMounted(async () => {
  syncFiltersFromUrl();
  // A URL manda; sem datas nela, cai no default (mês atual).
  if (!filtros.value.data_inicio) filtros.value.data_inicio = defaultSince();
  if (!filtros.value.data_fim)    filtros.value.data_fim    = defaultUntil();
  await store.fetchFilas();
  await refreshLeads();
  refreshRecent(); // últimos leads captados, independente do filtro do dashboard
  window.addEventListener('focus', refreshRecent);
  document.addEventListener('visibilitychange', onVisibility);
  if (route.query.excluir_painel === '1') store.applyDefaultOrigens();
  await abrirLeadDaUrl();
});

onUnmounted(() => {
  window.removeEventListener('focus', refreshRecent);
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="full">

      <!-- Header -->
      <PageHeader title="Leads"
        :subtitle="subtitleText"
        icon="fas fa-chart-line">
        <template #title>
          <span>Leads</span>
          <Favorite :router="'/marketing/leads'" :section="'Leads'" />
        </template>
        <template #actions>
          <!-- Exportar: PDF/HTML saem do próprio relatório renderizado -->
          <Dropdown align="right" :offset="8">
            <template #trigger>
              <button type="button" :disabled="!!exporting"
                class="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium
                       border border-line bg-surface-raised text-ink
                       hover:bg-surface-sunken hover:border-accent/40
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <i :class="exporting ? 'fas fa-circle-notch fa-spin' : 'fas fa-file-export'" class="text-xs"></i>
                {{ exporting ? 'Gerando...' : 'Exportar' }}
              </button>
            </template>

            <div class="w-60 bg-surface-overlay border border-line rounded-xl shadow-overlay overflow-hidden py-1">
              <!-- Excel não entra aqui: sai pelo modal de leads (Export.vue) -->
              <button v-for="opt in [
                  { k: 'pdf',  i: 'fas fa-file-pdf',  t: 'PDF',  d: 'Relatório como está na tela' },
                  { k: 'html', i: 'fas fa-file-code', t: 'HTML', d: 'Arquivo único p/ encaminhar' },
                ]" :key="opt.k"
                type="button" data-dropdown-item @click="pedirExport(opt.k)"
                class="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-surface-sunken transition-colors group">
                <i :class="opt.i" class="mt-0.5 w-4 text-ink-muted group-hover:text-accent transition-colors"></i>
                <span class="min-w-0">
                  <span class="block text-sm text-ink group-hover:text-accent transition-colors">{{ opt.t }}</span>
                  <span class="block text-micro text-ink-subtle">{{ opt.d }}</span>
                </span>
              </button>

              <!-- Trilha de exportações: admin apenas -->
              <template v-if="can('audit')">
                <div class="my-1 border-t border-line"></div>
                <button type="button" data-dropdown-item @click="logAberto = true"
                  class="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-surface-sunken transition-colors group">
                  <i class="fas fa-clipboard-list mt-0.5 w-4 text-ink-muted group-hover:text-accent transition-colors"></i>
                  <span class="min-w-0">
                    <span class="block text-sm text-ink group-hover:text-accent transition-colors">
                      Trilha de exportações
                    </span>
                    <span class="block text-micro text-ink-subtle">Quem exportou o quê e quando</span>
                  </span>
                </button>
              </template>
            </div>
          </Dropdown>

          <PageHelp storage-key="marketing-leads" title="Como usar o Relatório de Leads"
            intro="Acompanhe em tempo real o desempenho dos leads captados — por situação e por empreendimento."
            :steps="[
              { title: 'Filtre o período', text: 'Na barra de Filtros, ajuste datas, empreendimento, mídia, situação e mais; depois clique em Buscar.' },
              { title: 'Leia os indicadores', text: 'Os cartões mostram os leads por situação. Clique em um para filtrar por ele.' },
              { title: 'Por empreendimento', text: 'Na tabela, veja a distribuição e abra os leads de cada empreendimento em lista, funil, barras ou pizza.' },
              { title: 'Exporte e compartilhe', text: 'Em “Exportar” você gera o relatório em HTML interativo ou PDF. Para planilha, abra os leads e use Exportar dentro do modal.' },
            ]"
            :tips="[
              'As filas de atendimento ficam no botão ao lado de Exportar.',
              'Nas Filas, escolha qual fila atende cada empreendimento: é ela que recebe o lead que volta com interesse novo. Empreendimento sem fila aparece em destaque no topo da gaveta.',
              'Selecione vários empreendimentos na tabela para abri-los juntos.',
            ]" />
          <Filas :filas="filas" :sem-vinculo="filasSemVinculo" :empreendimentos="filaEmpreendimentos" />
        </template>
      </PageHeader>

      <!-- Filtros (inclui Data início/fim) -->
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
        class="mb-4 rounded-lg border border-data-neg/20 bg-data-neg/10 px-3 py-2.5 text-sm text-data-neg flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ error }}
      </div>
      <div v-if="exportError"
        class="mb-4 rounded-lg border border-data-warn/20 bg-data-warn/10 px-3 py-2.5 text-sm text-data-warn flex items-center gap-2">
        <i class="fas fa-triangle-exclamation"></i>{{ exportError }}
      </div>

      <!-- Visão geral (única visão da tela) -->
      <div class="space-y-4">
          <!-- KPIs com variação vs período anterior + sparkline do período -->
          <LeadsKpiCards
            :total="kpiSituacoes.total"
            :prev-total="prevCount"
            :situations="situationsList"
            :prev-situacoes="prevSituacoes"
            :leads="leads"
            :from="filtros.data_inicio"
            :to="filtros.data_fim" />

          <!-- Entradas de leads (série diária) + funil comercial -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <LeadsTrendCard class="lg:col-span-2"
              :leads="leads"
              :from="filtros.data_inicio"
              :to="filtros.data_fim" />
            <CommercialFunnel
              :situations="situationsList"
              :prev-situacoes="prevSituacoes"
              :total="kpiSituacoes.total"
              @filtrarSituacao="onFiltrarSituacao" />
          </div>

          <!-- Leads por empreendimento + distribuição.
               items-start: cada card usa a altura natural (o donut não estica
               atrás da listagem, que é bem mais alta). -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div class="lg:col-span-2 space-y-4 min-w-0">
              <LeadsTable :data="leadsByEnterprise" @abrirModal="abrirModal" />
              <CaptureHeatmap :leads="leads" />
            </div>
            <!-- Coluna lateral: distribuição, origem, captação e recentes -->
            <div class="space-y-4 min-w-0">
              <EnterpriseDonut :data="leadsByEnterprise" />
              <LeadsBySource :leads="leads" @filtrarOrigem="onFiltrarOrigem" />
              <RecentLeads :leads="recentLeads"
                @verTodos="abrirModal([recentLeads, 'list'])"
                @abrirLead="abrirLeadDetalhe" />
            </div>
          </div>

          <!-- Situações detalhadas (Período + lista de situações) — OCULTO por
               enquanto a pedido. Para reativar, descomente aqui e o import de
               SummaryCards no topo do arquivo.
          <SummaryCards :periodo="periodo" :kpi="kpiSituacoes" @filtrarSituacao="onFiltrarSituacao" />
          -->
      </div>
    </PageContainer>

    <LeadModal :leads="modalLeads" :visivel="modalVisivel" :initial-mode="modalMode"
      @fechar="modalVisivel = false" />

    <LeadDetailModal v-if="leadDetalhe" :lead="leadDetalhe" :visivel="leadDetalheVisivel"
      @fechar="leadDetalheVisivel = false" />

    <ExportDisclaimerModal :open="disclaimer.open" :formato="disclaimer.kind" :autor="autorExport"
      @confirmar="confirmarExport" @cancelar="cancelarExport" />

    <ExportLogModal v-if="can('audit')" :open="logAberto" @fechar="logAberto = false" />
  </div>
</template>
