<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        subtitle="Acompanhamento da inadimplência de clientes — baseado no backup diário do Sienge"
        icon="fas fa-triangle-exclamation">
        <template #title>
          Inadimplência
          <Favorite :router="'/financeiro/inadimplencia'" :section="'Inadimplência'" />
        </template>
        <template #actions>
          <div class="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" icon="fas fa-rotate" size="sm"
              :loading="store.loading" :disabled="store.loading || !isAdmin"
              @click="refresh">
              Atualizar
            </Button>
            <Button variant="secondary" icon="fas fa-file-csv" size="sm"
              :loading="store.exporting" :disabled="store.exporting || !isAdmin"
              @click="store.exportCsv">
              Exportar CSV
            </Button>
          </div>
        </template>
      </PageHeader>

      <!-- Gate admin -->
      <Surface v-if="!isAdmin" variant="raised" padding="lg" class="surface-gradient text-center">
        <div class="py-10">
          <div class="h-14 w-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 grid place-items-center text-red-500 mb-4">
            <i class="fas fa-lock text-xl"></i>
          </div>
          <h3 class="text-base font-semibold text-ink">Acesso restrito</h3>
          <p class="text-sm text-ink-muted mt-1">Esta tela é exclusiva para administradores.</p>
        </div>
      </Surface>

      <template v-else>
        <!-- Filtros -->
        <Surface variant="raised" padding="md" class="mb-5 surface-gradient">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
            <div>
              <label class="text-[11px] font-medium text-ink-muted mb-1.5 flex items-center gap-1.5">
                <i class="fas fa-building text-ink-subtle text-[10px]"></i> Empresa
              </label>
              <MultiSelector :model-value="selectedEmpresaLabels" @update:modelValue="onEmpresasChange"
                :options="empresaOptions" placeholder="Todas as empresas" :page-size="200" />
            </div>

            <div>
              <label class="text-[11px] font-medium text-ink-muted mb-1.5 flex items-center gap-1.5">
                <i class="fas fa-city text-ink-subtle text-[10px]"></i> Empreendimento
              </label>
              <MultiSelector :model-value="selectedEmpreendLabels" @update:modelValue="onEmpreendChange"
                :options="empreendOptions" placeholder="Todos os empreendimentos" :page-size="200" />
            </div>

            <div>
              <label class="text-[11px] font-medium text-ink-muted mb-1.5 flex items-center gap-1.5">
                <i class="fas fa-flag text-ink-subtle text-[10px]"></i> Situação
              </label>
              <MultiSelector :model-value="store.situacoes"
                @update:modelValue="v => (store.situacoes = Array.isArray(v) ? v : [])"
                :options="SITUACAO_OPTIONS" placeholder="Todas as situações" :page-size="20" />
            </div>

            <div>
              <label class="text-[11px] font-medium text-ink-muted mb-1.5 flex items-center gap-1.5">
                <i class="fas fa-calendar-day text-ink-subtle text-[10px]"></i> Vencimento de
              </label>
              <Input v-model="store.startDate" type="date" />
            </div>

            <div>
              <label class="text-[11px] font-medium text-ink-muted mb-1.5 flex items-center gap-1.5">
                <i class="fas fa-calendar-check text-ink-subtle text-[10px]"></i> Vencimento até
              </label>
              <Input v-model="store.endDate" type="date" />
            </div>

            <div>
              <label class="text-[11px] font-medium text-ink-muted mb-1.5 flex items-center gap-1.5">
                <i class="fas fa-magnifying-glass text-ink-subtle text-[10px]"></i> Buscar (título / cliente / unidade)
              </label>
              <Input v-model="store.search" placeholder="Ex.: 25570" @keyup.enter="apply" />
            </div>
          </div>

          <div class="flex justify-end mt-3">
            <Button variant="primary" icon="fas fa-filter"
              class="!bg-amber-600 hover:!bg-amber-700"
              :loading="store.loading" :disabled="store.loading"
              @click="apply">
              {{ store.loading ? 'Carregando...' : 'Filtrar' }}
            </Button>
          </div>

          <Surface v-if="store.error" variant="raised" padding="sm"
            class="mt-3 border-red-500/30 bg-red-500/10">
            <div class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <i class="fas fa-circle-exclamation"></i>{{ store.error }}
            </div>
          </Surface>
        </Surface>

        <!-- KPIs -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          <Surface variant="raised" padding="md" class="border-amber-500/30 bg-amber-500/10 surface-gradient">
            <div class="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-mono mb-1 flex items-center gap-1">
              <i class="fas fa-sack-dollar text-[10px]"></i> Valor Atual
            </div>
            <div class="text-xl font-bold text-amber-700 dark:text-amber-200 font-mono tabular-nums">{{ brl(s.valorAtual) }}</div>
            <div class="text-[10px] text-amber-700/70 dark:text-amber-300/70 mt-0.5">Saldo corrigido em aberto</div>
          </Surface>

          <Surface variant="raised" padding="md" class="surface-gradient">
            <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Valor Original</div>
            <div class="text-xl font-bold text-ink font-mono tabular-nums">{{ brl(s.valorOriginal) }}</div>
          </Surface>

          <Surface variant="raised" padding="md" class="surface-gradient">
            <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Multa (2%)</div>
            <div class="text-xl font-bold text-ink font-mono tabular-nums">{{ brl(s.valorMulta) }}</div>
          </Surface>

          <Surface variant="raised" padding="md" class="surface-gradient">
            <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Juros</div>
            <div class="text-xl font-bold text-ink font-mono tabular-nums">{{ brl(s.valorJuros) }}</div>
          </Surface>

          <Surface variant="raised" padding="md" class="surface-gradient">
            <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Títulos</div>
            <div class="text-xl font-bold text-ink font-mono tabular-nums">{{ num(s.titulos) }}</div>
            <div class="text-[10px] text-ink-subtle mt-0.5">{{ num(s.parcelas) }} parcela(s)</div>
          </Surface>

          <Surface variant="raised" padding="md" class="surface-gradient">
            <div class="text-[10px] uppercase tracking-wider text-ink-subtle font-mono mb-1">Clientes</div>
            <div class="text-xl font-bold text-ink font-mono tabular-nums">{{ num(s.clientes) }}</div>
            <div class="text-[10px] text-ink-subtle mt-0.5">inadimplentes</div>
          </Surface>
        </div>

        <!-- Aging + Top empreendimentos -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <Surface variant="raised" padding="md" class="surface-gradient">
            <h3 class="text-sm font-semibold text-ink flex items-center gap-2 mb-3">
              <i class="fas fa-hourglass-half text-amber-500"></i> Faixas de atraso (dias)
            </h3>
            <div v-if="store.aging.length" class="space-y-2.5">
              <div v-for="a in store.aging" :key="a.bucket">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="text-ink-muted font-mono">{{ a.bucket }} dias</span>
                  <span class="text-ink font-mono tabular-nums">{{ brl(a.valor) }}
                    <span class="text-ink-subtle">· {{ num(a.parcelas) }}p</span>
                  </span>
                </div>
                <div class="h-2 bg-surface-sunken rounded-full overflow-hidden">
                  <div class="h-full bg-amber-500/80 rounded-full transition-all duration-500"
                    :style="{ width: barW(a.valor, maxAging) }"></div>
                </div>
              </div>
            </div>
            <EmptyState v-else size="sm" icon="fas fa-hourglass" title="Sem dados" description="Aplique um filtro para ver as faixas." />
          </Surface>

          <Surface variant="raised" padding="md" class="surface-gradient">
            <h3 class="text-sm font-semibold text-ink flex items-center gap-2 mb-3">
              <i class="fas fa-ranking-star text-amber-500"></i> Maiores empreendimentos
            </h3>
            <div v-if="topEmpreend.length" class="space-y-2.5">
              <div v-for="e in topEmpreend" :key="e.cc">
                <div class="flex items-center justify-between text-xs mb-1 gap-2">
                  <span class="text-ink-muted truncate" :title="store.empreendName(e.cc)">{{ store.empreendName(e.cc) }}</span>
                  <span class="text-ink font-mono tabular-nums shrink-0">{{ brl(e.valor) }}</span>
                </div>
                <div class="h-2 bg-surface-sunken rounded-full overflow-hidden">
                  <div class="h-full bg-accent/70 rounded-full transition-all duration-500"
                    :style="{ width: barW(e.valor, maxEmpreend) }"></div>
                </div>
              </div>
            </div>
            <EmptyState v-else size="sm" icon="fas fa-building" title="Sem dados" description="Aplique um filtro para ver o ranking." />
          </Surface>
        </div>

        <!-- Detalhamento -->
        <Surface variant="raised" padding="none" class="overflow-hidden surface-gradient">
          <div class="px-5 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40 flex items-center justify-between flex-wrap gap-2">
            <h3 class="text-base font-semibold text-ink flex items-center gap-2">
              <i class="fas fa-table text-amber-500"></i> Detalhamento (título / parcela)
            </h3>
            <span class="text-xs text-ink-muted">
              <span class="font-mono tabular-nums">{{ num(store.detailTotal) }}</span> registro(s)
            </span>
          </div>

          <div class="overflow-x-auto relative">
            <div v-if="store.loadingDetail" class="absolute inset-0 bg-surface/60 backdrop-blur-[1px] grid place-items-center z-10">
              <i class="fas fa-circle-notch fa-spin text-amber-500 text-xl"></i>
            </div>
            <table class="min-w-full text-sm">
              <thead class="bg-surface-sunken/60 border-b border-line">
                <tr>
                  <th v-for="col in columns" :key="col.key"
                    @click="col.sortable && store.setSort(col.key)"
                    class="px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle whitespace-nowrap"
                    :class="[col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
                             col.sortable ? 'cursor-pointer hover:text-ink transition-colors' : '']">
                    <span class="inline-flex items-center gap-1.5" :class="col.align === 'right' ? 'justify-end' : ''">
                      {{ col.label }}
                      <i v-if="col.sortable" :class="sortIcon(col.key)"></i>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                <tr v-for="(r, i) in store.detailRows" :key="`${r.nutitulo}-${r.nuparcela}-${i}`"
                  class="hover:bg-surface-hover/40 transition-colors">
                  <td class="px-4 py-2.5 whitespace-nowrap font-mono tabular-nums text-ink">{{ r.nutitulo }}</td>
                  <td class="px-4 py-2.5 whitespace-nowrap font-mono tabular-nums text-ink-muted">{{ r.nuparcela }}</td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-ink-muted max-w-[160px] truncate" :title="r.unidade">{{ r.unidade || '—' }}</td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-ink-muted">{{ r.cod_cliente }}</td>
                  <td class="px-4 py-2.5 text-ink-muted max-w-[220px] truncate" :title="store.empreendName(r.centro_de_custo)">
                    {{ store.empreendName(r.centro_de_custo) }}
                  </td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-ink-muted max-w-[160px] truncate" :title="store.empresaName(r.empresa)">{{ store.empresaName(r.empresa) }}</td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-ink-muted font-mono">{{ dataBR(r.data_vencimento) }}</td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-right font-mono tabular-nums"
                    :class="Number(r.dias_em_atraso) > 90 ? 'text-red-500 font-semibold' : 'text-ink'">
                    {{ r.dias_em_atraso }}
                  </td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-center">
                    <Badge :variant="situacaoVariant(r.situacao)" size="sm">{{ r.situacao }}</Badge>
                  </td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-center">
                    <Badge :variant="tipoBaixaVariant(r.tipo_baixa)" size="sm">{{ r.tipo_baixa }}</Badge>
                  </td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-right font-mono tabular-nums font-semibold text-amber-700 dark:text-amber-300">{{ brl(r.valor_atual) }}</td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-right font-mono tabular-nums text-ink-muted">{{ brl(r.valor_multa) }}</td>
                  <td class="px-4 py-2.5 whitespace-nowrap text-right font-mono tabular-nums text-ink-muted">{{ brl(r.valor_juros) }}</td>
                </tr>
              </tbody>
            </table>

            <EmptyState v-if="!store.loadingDetail && !store.detailRows.length"
              icon="fas fa-circle-check" title="Nenhum registro" description="Nenhum título inadimplente para os filtros selecionados." />
          </div>

          <!-- Paginação -->
          <div v-if="store.detailTotal > 0" class="px-5 py-3 border-t border-line flex items-center justify-between flex-wrap gap-2 bg-surface-sunken/30">
            <span class="text-xs text-ink-muted font-mono tabular-nums">
              Página {{ store.page }} de {{ store.totalPages }}
            </span>
            <div class="flex items-center gap-2">
              <Button variant="ghost" size="sm" icon="fas fa-chevron-left"
                :disabled="store.page <= 1 || store.loadingDetail" @click="store.goToPage(store.page - 1)">
                Anterior
              </Button>
              <Button variant="ghost" size="sm"
                :disabled="store.page >= store.totalPages || store.loadingDetail" @click="store.goToPage(store.page + 1)">
                Próxima <i class="fas fa-chevron-right ml-1"></i>
              </Button>
            </div>
          </div>
        </Surface>

        <p v-if="store.dashboard?.generatedAt" class="text-[10px] text-ink-subtle font-mono mt-3 text-right">
          Dados do backup Sienge · atualizado {{ dataHoraBR(store.dashboard.generatedAt) }}
        </p>
      </template>

    </PageContainer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useInadimplenciaStore } from '@/stores/Financeiro/Inadimplencia/inadimplenciaStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Favorite from '@/components/config/Favorite.vue';

const store = useInadimplenciaStore();
const auth = useAuthStore();
const isAdmin = computed(() => auth?.user?.role === 'admin' || auth?.hasRole?.('admin'));

const SITUACAO_OPTIONS = ['Normal', 'Cobrança', 'Inadimplente', 'Sub-judicie'];

const columns = [
  { key: 'nutitulo', label: 'Título', sortable: true },
  { key: 'nuparcela', label: 'Parc.', sortable: false },
  { key: 'unidade', label: 'Unidade', sortable: false },
  { key: 'cod_cliente', label: 'Cliente', sortable: true },
  { key: 'centro_de_custo', label: 'Empreendimento', sortable: false },
  { key: 'empresa', label: 'Empresa', sortable: false },
  { key: 'data_vencimento', label: 'Vencimento', sortable: true },
  { key: 'dias_em_atraso', label: 'Atraso', sortable: true, align: 'right' },
  { key: 'situacao', label: 'Situação', sortable: false, align: 'center' },
  { key: 'tipo_baixa', label: 'Baixa', sortable: false, align: 'center' },
  { key: 'valor_atual', label: 'Valor Atual', sortable: true, align: 'right' },
  { key: 'valor_multa', label: 'Multa', sortable: true, align: 'right' },
  { key: 'valor_juros', label: 'Juros', sortable: true, align: 'right' },
];

const s = computed(() => store.summary || {});

// ── Formatadores ──
const brl = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = v => Number(v || 0).toLocaleString('pt-BR');
function dataBR(v) {
  if (!v) return '—';
  const d = new Date(v);
  return isNaN(d) ? '—' : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
function dataHoraBR(v) {
  if (!v) return '';
  const d = new Date(v);
  return isNaN(d) ? '' : d.toLocaleString('pt-BR');
}

// ── Aging / ranking bars ──
const maxAging = computed(() => Math.max(1, ...store.aging.map(a => Number(a.valor) || 0)));
const topEmpreend = computed(() => store.byEmpreendimento.slice(0, 12));
const maxEmpreend = computed(() => Math.max(1, ...topEmpreend.value.map(e => Number(e.valor) || 0)));
const barW = (v, max) => `${Math.min(100, (Number(v || 0) / max) * 100)}%`;

// ── Badges ──
function situacaoVariant(situacao) {
  return ({ 'Normal': 'neutral', 'Cobrança': 'warning', 'Inadimplente': 'danger', 'Sub-judicie': 'info' })[situacao] || 'neutral';
}
function tipoBaixaVariant(tb) {
  if (tb === 'Aberto') return 'warning';
  if (tb === 'Pago Parcialmente') return 'info';
  return 'neutral';
}

// ── Ordenação ──
function sortIcon(key) {
  if (store.sort !== key) return 'fas fa-sort text-ink-subtle/40';
  return store.dir === 'asc' ? 'fas fa-sort-up text-amber-500' : 'fas fa-sort-down text-amber-500';
}

// ── Seletores empresa / empreendimento (label ↔ código) ──
const labelFor = (e) => `${(e.name || '').toString().trim() || '—'} · ${e.code}`;

const empresaOptions = computed(() => store.filterOptions.empresas.map(labelFor));
const empreendOptions = computed(() => store.filterOptions.empreendimentos.map(labelFor));

const empresaCodeByLabel = computed(() => new Map(store.filterOptions.empresas.map(e => [labelFor(e), Number(e.code)])));
const empresaLabelByCode = computed(() => new Map(store.filterOptions.empresas.map(e => [Number(e.code), labelFor(e)])));
const empreendCodeByLabel = computed(() => new Map(store.filterOptions.empreendimentos.map(e => [labelFor(e), Number(e.code)])));
const empreendLabelByCode = computed(() => new Map(store.filterOptions.empreendimentos.map(e => [Number(e.code), labelFor(e)])));

const selectedEmpresaLabels = computed(() =>
  store.empresas.map(c => empresaLabelByCode.value.get(Number(c))).filter(Boolean));
const selectedEmpreendLabels = computed(() =>
  store.empreendimentos.map(c => empreendLabelByCode.value.get(Number(c))).filter(Boolean));

function onEmpresasChange(v) {
  const arr = Array.isArray(v) ? v : [];
  store.empresas = arr.map(l => empresaCodeByLabel.value.get(l)).filter(Number.isFinite);
}
function onEmpreendChange(v) {
  const arr = Array.isArray(v) ? v : [];
  store.empreendimentos = arr.map(l => empreendCodeByLabel.value.get(l)).filter(Number.isFinite);
}

// ── Ações ──
function apply() { store.applyFilters(); }
function refresh() { store.applyFilters({ refresh: true }); }

onMounted(async () => {
  if (!isAdmin.value) return;
  await store.fetchFilters();
  await store.applyFilters();
});
</script>
