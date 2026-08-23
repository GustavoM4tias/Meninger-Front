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

        <div v-if="filterHint" class="px-3 sm:px-4 pb-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
          <i class="fas fa-circle-info"></i>{{ filterHint }}
        </div>
      </section>

      <Surface v-if="store.error" variant="raised" padding="sm" class="mb-4 border-red-500/30 bg-red-500/10">
        <div class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
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
        <Surface variant="raised" padding="md" class="border-emerald-500/30 bg-emerald-500/10 surface-gradient">
          <div class="text-micro uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-mono mb-1 flex items-center gap-1">
            <i class="fas fa-circle-check text-[10px]"></i> Com nº CEF
          </div>
          <div class="text-xl font-bold text-emerald-700 dark:text-emerald-200 font-mono tabular-nums">{{ num(store.summary.withCef) }}</div>
        </Surface>
        <Surface variant="raised" padding="md" class="border-amber-500/30 bg-amber-500/10 surface-gradient">
          <div class="text-micro uppercase tracking-wider text-amber-700 dark:text-amber-300 font-mono mb-1 flex items-center gap-1">
            <i class="fas fa-circle-minus text-[10px]"></i> Sem nº CEF
          </div>
          <div class="text-xl font-bold text-amber-700 dark:text-amber-200 font-mono tabular-nums">{{ num(store.summary.withoutCef) }}</div>
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

        <div class="relative">
          <div v-if="store.loading" class="absolute inset-0 bg-surface/60 backdrop-blur-[1px] grid place-items-center z-10">
            <i class="fas fa-circle-notch fa-spin text-accent text-xl"></i>
          </div>

          <!-- Mobile: cards -->
          <div class="md:hidden divide-y divide-line">
            <div v-for="r in store.rows" :key="r.id" class="p-4">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-ink truncate">{{ r.customer_name || 'Sem cliente' }}</div>
                  <div class="text-xs text-ink-muted truncate mt-0.5">{{ r.enterprise_name }}</div>
                  <div class="text-micro text-ink-subtle mt-0.5">
                    Contrato <span class="font-mono">{{ r.number }}</span>
                    <template v-if="r.unit_name"> · Unid. {{ r.unit_name }}</template>
                  </div>
                </div>
                <Badge :variant="situacaoVariant(r.situation)" size="sm" class="shrink-0">{{ r.situation || '-' }}</Badge>
              </div>

              <div class="mt-3 flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-sunken/50 px-3 py-2">
                <div class="min-w-0">
                  <div class="text-micro uppercase tracking-wider text-ink-subtle font-mono">Nº CEF</div>
                  <div class="text-sm font-mono tabular-nums truncate" :class="r.financial_institution_number ? 'text-ink font-semibold' : 'text-ink-subtle'">
                    {{ r.financial_institution_number || 'Sem número' }}
                  </div>
                  <div v-if="r.financial_institution_date" class="text-micro text-ink-subtle font-mono mt-0.5">
                    em {{ dataBR(r.financial_institution_date) }}
                  </div>
                </div>
                <Button v-if="r.financial_institution_number" variant="ghost" size="sm"
                  class="shrink-0 min-h-[40px]"
                  :icon="copiedId === r.id ? 'fas fa-check' : 'fas fa-copy'"
                  @click="copyCef(r)">
                  {{ copiedId === r.id ? 'Copiado' : 'Copiar' }}
                </Button>
              </div>
            </div>
          </div>

          <!-- Desktop: tabela -->
          <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-surface-sunken/60 border-b border-line">
                <tr>
                  <th v-for="col in columns" :key="col.key"
                    @click="col.sortable && store.setSort(col.key)"
                    class="px-4 py-3 text-micro font-mono uppercase tracking-wider text-ink-subtle whitespace-nowrap"
                    :class="[col.align === 'center' ? 'text-center' : 'text-left',
                             col.sortable ? 'cursor-pointer hover:text-ink transition-colors' : '']">
                    <span class="inline-flex items-center gap-1.5">
                      {{ col.label }}
                      <i v-if="col.sortable" :class="sortIcon(col.key)"></i>
                    </span>
                  </th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                <tr v-for="r in store.rows" :key="r.id" class="hover:bg-surface-hover/40 transition-colors">
                  <td class="px-4 py-2.5 whitespace-nowrap font-mono tabular-nums text-ink-muted">{{ r.number }}</td>
                  <td class="px-4 py-2.5 text-ink max-w-[240px] truncate" :title="r.customer_name || ''">{{ r.customer_name || '-' }}</td>
                  <td class="px-4 py-2.5 text-ink-muted max-w-[220px] truncate" :title="r.enterprise_name">{{ r.enterprise_name }}</td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-ink-muted max-w-[140px] truncate" :title="r.unit_name || ''">{{ r.unit_name || '-' }}</td>
                  <td class="px-4 py-2.5 whitespace-nowrap font-mono tabular-nums"
                    :class="r.financial_institution_number ? 'text-ink font-semibold' : 'text-ink-subtle'">
                    {{ r.financial_institution_number || 'Sem número' }}
                  </td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-ink-muted font-mono">{{ dataBR(r.financial_institution_date) }}</td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-center">
                    <Badge :variant="situacaoVariant(r.situation)" size="sm">{{ r.situation || '-' }}</Badge>
                  </td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-right">
                    <Button v-if="r.financial_institution_number" variant="ghost" size="sm"
                      :icon="copiedId === r.id ? 'fas fa-check' : 'fas fa-copy'"
                      :title="'Copiar nº CEF'"
                      @click="copyCef(r)">
                      {{ copiedId === r.id ? 'Copiado' : 'Copiar' }}
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <EmptyState v-if="!store.loading && !store.rows.length"
            icon="fas fa-hashtag"
            :title="store.searched ? 'Nenhum contrato encontrado' : 'Faça uma consulta'"
            :description="store.searched
              ? 'Nenhum contrato para os filtros selecionados. Ajuste o empreendimento ou a busca.'
              : 'A tela traz só o que você buscar: escolha um empreendimento ou digite o cliente na busca geral e clique em Filtrar.'" />
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
import EmptyState from '@/components/UI/EmptyState.vue';
import Favorite from '@/components/config/Favorite.vue';

const store = useConsultaCefStore();

const CEF_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'com', label: 'Somente com nº CEF' },
  { value: 'sem', label: 'Somente sem nº CEF' },
];

const columns = [
  { key: 'number', label: 'Contrato', sortable: true },
  { key: 'customer_name', label: 'Cliente', sortable: true },
  { key: 'enterprise_name', label: 'Empreendimento', sortable: true },
  { key: 'unit_name', label: 'Unidade', sortable: false },
  { key: 'cef_number', label: 'Nº CEF', sortable: false },
  { key: 'financial_institution_date', label: 'Data CEF', sortable: true },
  { key: 'situation', label: 'Situação', sortable: false, align: 'center' },
];

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
function sortIcon(key) {
  if (store.sort !== key) return 'fas fa-sort text-ink-subtle/40';
  return store.dir === 'asc' ? 'fas fa-sort-up text-accent' : 'fas fa-sort-down text-accent';
}

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
