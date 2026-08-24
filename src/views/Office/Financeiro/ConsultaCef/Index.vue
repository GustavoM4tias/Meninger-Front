<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        subtitle="Nº do contrato na instituição financeira (Caixa) por empreendimento ou busca geral"
        icon="fas fa-hashtag">
        <template #title>
          Consulta de nº CEF
          <Favorite :router="'/financeiro/consulta-cef'" :section="'Consulta de nº CEF'" />
        </template>
        <template #actions>
          <PageHelp
            storage-key="consulta-cef"
            title="Como usar - Consulta de nº CEF"
            intro="Aqui você encontra o número que a Caixa (CEF) deu para cada contrato - o campo 'nº da instituição financeira' do Sienge - sem precisar abrir contrato por contrato."
            :steps="helpSteps"
            :tips="helpTips" />
        </template>
      </PageHeader>

      <!-- Filtros (padrão da projeção: barra recolhível) -->
      <section class="mb-5 rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
        <div class="filters-toolbar">
          <button @click="filtersExpanded = !filtersExpanded" class="filters-toolbar-trigger">
            <i class="fas fa-filter text-xs text-ink-muted"></i>
            <span>Filtros</span>
            <Badge v-if="activeFiltersCount" variant="accent" size="sm">
              {{ activeFiltersCount }} ativo{{ activeFiltersCount > 1 ? 's' : '' }}
            </Badge>
            <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
              :class="{ 'rotate-180': filtersExpanded }"></i>
          </button>
          <div class="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="clearFilters">
              <span class="hidden sm:inline">Limpar</span>
            </Button>
            <Button size="sm" icon="fas fa-magnifying-glass" :loading="store.loading" @click="apply">
              <span class="hidden sm:inline">Filtrar</span>
            </Button>
          </div>
        </div>

        <div v-show="filtersExpanded" class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="lg:col-span-2">
            <label class="block text-micro font-medium text-ink-muted mb-1.5">
              <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>Empreendimento(s)
            </label>
            <MultiSelector :model-value="selectedEnterpriseLabels" @update:modelValue="onEnterprisesChange"
              :options="enterpriseOptions" placeholder="Selecione..." :page-size="200" :select-all="true" />
          </div>

          <div>
            <label class="block text-micro font-medium text-ink-muted mb-1.5">
              <i class="fas fa-magnifying-glass text-[10px] mr-1 text-ink-subtle"></i>Busca geral
            </label>
            <Input v-model="store.q" placeholder="Cliente, contrato, unidade ou nº CEF" @keyup.enter="apply" />
          </div>

          <div>
            <label class="block text-micro font-medium text-ink-muted mb-1.5">
              <i class="fas fa-hashtag text-[10px] mr-1 text-ink-subtle"></i>Nº CEF
            </label>
            <Select v-model="store.cef" :options="CEF_OPTIONS" />
          </div>
        </div>

        <div v-if="filterHint" class="px-3 sm:px-4 pb-3 text-xs text-data-warn flex items-center gap-1.5">
          <i class="fas fa-circle-info"></i>{{ filterHint }}
        </div>
      </section>

      <Surface v-if="store.error" variant="raised" padding="sm" class="mb-4 border-data-neg/30 bg-data-neg/10">
        <div class="text-sm text-data-neg flex items-center gap-2">
          <i class="fas fa-circle-exclamation"></i>{{ store.error }}
        </div>
      </Surface>

      <!-- Resumo -->
      <div v-if="store.searched" class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <Surface variant="raised" padding="md" class="surface-gradient">
          <div class="text-micro uppercase tracking-wider text-ink-subtle font-mono mb-1">Contratos</div>
          <div class="text-xl font-bold text-ink font-mono tabular-nums">{{ num(store.summary.total) }}</div>
          <div class="text-micro text-ink-subtle mt-0.5">no recorte atual</div>
        </Surface>
        <Surface variant="raised" padding="md" class="border-data-pos/30 bg-data-pos/10 surface-gradient">
          <div class="text-micro uppercase tracking-wider text-data-pos font-mono mb-1 flex items-center gap-1">
            <i class="fas fa-circle-check text-[10px]"></i> Com nº CEF
          </div>
          <div class="text-xl font-bold text-data-pos font-mono tabular-nums">{{ num(store.summary.withCef) }}</div>
        </Surface>
        <Surface variant="raised" padding="md" class="border-data-warn/30 bg-data-warn/10 surface-gradient">
          <div class="text-micro uppercase tracking-wider text-data-warn font-mono mb-1 flex items-center gap-1">
            <i class="fas fa-circle-minus text-[10px]"></i> Sem nº CEF
          </div>
          <div class="text-xl font-bold text-data-warn font-mono tabular-nums">{{ num(store.summary.withoutCef) }}</div>
        </Surface>
      </div>

      <!-- Resultado -->
      <Surface variant="raised" padding="none" class="overflow-hidden surface-gradient">
        <div class="px-5 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40 flex items-center justify-between flex-wrap gap-2">
          <h3 class="text-base font-semibold text-ink flex items-center gap-2">
            <i class="fas fa-list text-accent"></i> Contratos
          </h3>
          <span class="text-xs text-ink-muted">
            <span class="font-mono tabular-nums">{{ num(store.total) }}</span> registro(s)
          </span>
        </div>

        <!-- A listagem é o primitivo. Eram duas listas escritas em paralelo -
             tabela no monitor, cartões no celular - e elas divergiram: só o
             cabeçalho da tabela ordenava, então no telefone não havia como
             ordenar por data nem por cliente. -->
        <div class="p-3 sm:p-4">
          <DataTable
            :columns="columns"
            :rows="store.rows"
            row-key="id"
            :loading="store.loading"
            manual-sort
            v-model:sort-by="ordenarPor"
            v-model:sort-dir="ordenarDir"
            empty-icon="fas fa-hashtag"
            :empty-title="store.searched ? 'Nenhum contrato encontrado' : 'Faça uma consulta'"
            :empty-text="store.searched
              ? 'Nenhum contrato para os filtros selecionados. Ajuste o empreendimento ou a busca.'
              : 'A tela traz só o que você buscar: escolha um empreendimento ou digite o cliente na busca geral e clique em Filtrar.'">

            <template #cell-number="{ row }">
              <span class="font-mono tabular-nums text-ink-muted">{{ row.number }}</span>
            </template>

            <template #cell-customer_name="{ row }">
              <span class="text-ink">{{ row.customer_name || '-' }}</span>
            </template>

            <template #cell-enterprise_name="{ row }">
              <span class="text-ink-muted">{{ row.enterprise_name }}</span>
            </template>

            <template #cell-unit_name="{ row }">
              <span class="text-ink-muted">{{ row.unit_name || '-' }}</span>
            </template>

            <!-- É o dado que a tela existe para achar: quando falta, diz que
                 falta em vez de mostrar um traço. -->
            <template #cell-cef_number="{ row }">
              <span class="font-mono tabular-nums"
                :class="row.financial_institution_number ? 'text-ink font-semibold' : 'text-ink-subtle'">
                {{ row.financial_institution_number || 'Sem número' }}
              </span>
            </template>

            <template #cell-financial_institution_date="{ row }">
              <span class="font-mono text-ink-muted">{{ dataBR(row.financial_institution_date) }}</span>
            </template>

            <template #cell-situation="{ row }">
              <Badge :variant="situacaoVariant(row.situation)" size="sm">{{ row.situation || '-' }}</Badge>
            </template>

            <template #actions="{ row }">
              <Button v-if="row.financial_institution_number" variant="ghost" size="sm"
                :icon="copiedId === row.id ? 'fas fa-check' : 'fas fa-copy'"
                title="Copiar nº CEF"
                @click="copyCef(row)">
                {{ copiedId === row.id ? 'Copiado' : 'Copiar' }}
              </Button>
            </template>
          </DataTable>
        </div>

        <!-- Paginação -->
        <div v-if="store.total > 0" class="px-5 py-3 border-t border-line flex items-center justify-between flex-wrap gap-2 bg-surface-sunken/30">
          <span class="text-xs text-ink-muted font-mono tabular-nums">
            Página {{ store.page }} de {{ store.totalPages }}
          </span>
          <div class="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon="fas fa-chevron-left"
              :disabled="store.page <= 1 || store.loading" @click="store.goToPage(store.page - 1)">
              Anterior
            </Button>
            <Button variant="ghost" size="sm"
              :disabled="store.page >= store.totalPages || store.loading" @click="store.goToPage(store.page + 1)">
              Próxima <i class="fas fa-chevron-right ml-1"></i>
            </Button>
          </div>
        </div>
      </Surface>

      <p class="text-micro text-ink-subtle font-mono mt-3 text-right">
        Contratos sincronizados do Sienge (atualização automática de hora em hora)
      </p>

    </PageContainer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useConsultaCefStore } from '@/stores/Financeiro/ConsultaCef/consultaCefStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Favorite from '@/components/config/Favorite.vue';

const store = useConsultaCefStore();

const CEF_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'com', label: 'Somente com nº CEF' },
  { value: 'sem', label: 'Somente sem nº CEF' },
];

/* `priority` decide a ORDEM no celular. Esta tela existe para achar UM numero,
   entao o cliente e o proprio numero CEF abrem o cartao. */
const columns = [
  { key: 'customer_name', label: 'Cliente', priority: 1, sortable: true },
  { key: 'cef_number', label: 'Nº CEF', priority: 1 },
  { key: 'enterprise_name', label: 'Empreendimento', priority: 2, sortable: true },
  { key: 'number', label: 'Contrato', priority: 2, sortable: true },
  { key: 'situation', label: 'Situação', priority: 2 },
  { key: 'financial_institution_date', label: 'Data CEF', priority: 2, sortable: true, numeric: true },
  { key: 'unit_name', label: 'Unidade', priority: 3 },
];

/* Quem ordena e o servidor (a lista chega paginada), dai o `manual-sort`. */
const ordenarPor = computed({
  get: () => store.sort,
  set: (v) => store.applySort(v, store.dir),
});
const ordenarDir = computed({
  get: () => store.dir,
  set: (v) => store.applySort(store.sort, v),
});

const helpSteps = [
  { title: 'Abra os Filtros', text: 'A tela só consulta o que você pedir: escolha um empreendimento ou digite o cliente na busca geral e clique em Filtrar.' },
  { title: 'Busca geral', text: 'Aceita nome do cliente, nº do contrato, unidade ou o próprio nº CEF. Aperte Enter ou Filtrar.' },
  { title: 'Refine por nº CEF', text: 'Use o filtro "Nº CEF" para ver só contratos que já têm número na Caixa ou só os que ainda não têm.' },
  { title: 'Copie o número', text: 'Toque em "Copiar" na linha do contrato para levar o nº CEF para outro sistema sem erro de digitação.' },
];
const helpTips = [
  'Os dados vêm do Sienge e são atualizados automaticamente a cada hora.',
  '"Sem número" significa que o contrato ainda não teve o nº da instituição financeira registrado no Sienge.',
  'Toque no cabeçalho das colunas (no computador) para ordenar o resultado.',
];

// ── Formatadores ──
const num = v => Number(v || 0).toLocaleString('pt-BR');
function dataBR(v) {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d) ? '-' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// ── Badges ──
function situacaoVariant(s) {
  return ({ 'Emitido': 'success', 'Autorizado': 'info', 'Cancelado': 'danger' })[s] || 'neutral';
}

// ── Ordenação ──

// ── Seletor de empreendimento (label ↔ id) ──
const labelFor = (e) => `${(e.name || '').toString().trim() || '-'} · ${e.id}`;
const enterpriseOptions = computed(() => store.enterprises.map(labelFor));
const idByLabel = computed(() => new Map(store.enterprises.map(e => [labelFor(e), Number(e.id)])));
const labelById = computed(() => new Map(store.enterprises.map(e => [Number(e.id), labelFor(e)])));
const selectedEnterpriseLabels = computed(() =>
  store.enterpriseIds.map(id => labelById.value.get(Number(id))).filter(Boolean));
function onEnterprisesChange(v) {
  const arr = Array.isArray(v) ? v : [];
  store.enterpriseIds = arr.map(l => idByLabel.value.get(l)).filter(Number.isFinite);
}

// ── Copiar nº CEF ──
const copiedId = ref(null);
let copiedTimer = null;
async function copyCef(r) {
  try {
    await navigator.clipboard.writeText(String(r.financial_institution_number || ''));
    copiedId.value = r.id;
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => { copiedId.value = null; }, 1800);
  } catch (e) {
    console.error('[consulta-cef] clipboard', e);
  }
}

// ── Filtros (barra recolhível, consulta sob demanda) ──
const filtersExpanded = ref(true);
const filterHint = ref('');

const activeFiltersCount = computed(() => {
  let n = 0;
  if (store.enterpriseIds.length) n++;
  if (store.q.trim()) n++;
  if (store.cef) n++;
  return n;
});

function apply() {
  if (!store.q.trim() && !store.enterpriseIds.length) {
    filterHint.value = 'Escolha ao menos um empreendimento ou digite algo na busca geral para consultar.';
    filtersExpanded.value = true;
    return;
  }
  filterHint.value = '';
  store.applyFilters();
}

function clearFilters() {
  filterHint.value = '';
  store.clear();
}

onMounted(() => {
  store.fetchEnterprises();
});
</script>
