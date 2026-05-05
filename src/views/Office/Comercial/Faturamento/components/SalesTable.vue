<script setup>
import { ref, computed, watch } from 'vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const props = defineProps({
  sales: { type: Array, required: true },
});

const searchTerm = ref('');
const currentPage = ref(1);
const itemsPerPage = ref(100);
const expandedSales = ref(new Set());
const valueMode = ref('net');
const valueModeLabel = computed(() => valueMode.value === 'net' ? 'VGV' : 'VGV+DC');

const valueModeOptions = [
  { value: 'net',   label: 'VGV' },
  { value: 'gross', label: 'VGV+DC' },
];

const filteredSales = computed(() => {
  if (!searchTerm.value) return props.sales;
  const term = searchTerm.value.toLowerCase();
  return props.sales.filter(sale =>
    (sale.customer_name || '').toLowerCase().includes(term) ||
    (sale.unit_name || '').toLowerCase().includes(term) ||
    (sale.enterprise_name || '').toLowerCase().includes(term)
  );
});

const totalPages = computed(() => Math.ceil(filteredSales.value.length / itemsPerPage.value));
const startItem = computed(() => (currentPage.value - 1) * itemsPerPage.value + 1);
const endItem = computed(() => Math.min(currentPage.value * itemsPerPage.value, filteredSales.value.length));

const paginatedSales = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredSales.value.slice(start, start + itemsPerPage.value);
});

const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages.value, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
});

const toggleDetails = (sale) => {
  const key = `${sale.customer_id}-${sale.unit_name}`;
  if (expandedSales.value.has(key)) expandedSales.value.delete(key);
  else expandedSales.value.add(key);
};

const displayTotal = (sale) => valueMode.value === 'net' ? sale.total_value_net : sale.total_value_gross;

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR');

const discountCodes = new Set(['DC', 'DESCONTO_CONSTRUTORA']);
const isDiscount = (condition) =>
  discountCodes.has(String(condition.condition_type_id || '').toUpperCase());

watch([searchTerm, itemsPerPage, valueMode], () => { currentPage.value = 1; });
watch(() => props.sales, () => { expandedSales.value.clear(); });
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient overflow-hidden">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-line">
      <div>
        <h3 class="text-sm font-semibold text-ink">Vendas detalhadas</h3>
        <p class="text-xs text-ink-muted mt-0.5">
          <span class="font-mono text-ink">{{ filteredSales.length }}</span> vendas encontradas
        </p>
      </div>
      <SegmentedControl v-model="valueMode" :options="valueModeOptions" size="sm" />
    </div>

    <EmptyState v-if="filteredSales.length === 0"
      icon="fas fa-file-invoice" title="Nenhuma venda encontrada"
      description="Ajuste os filtros para ver resultados." />

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-surface-sunken/40 border-b border-line">
          <tr>
            <th class="px-6 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Cliente</th>
            <th class="px-6 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Unidade</th>
            <th class="px-6 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Empreendimento</th>
            <th class="px-6 py-3 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Data</th>
            <th class="px-6 py-3 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
              Valor total <span class="text-ink-subtle/70">({{ valueModeLabel }})</span>
            </th>
            <th class="px-6 py-3 text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Contratos</th>
            <th class="px-6 py-3 text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <template v-for="sale in paginatedSales" :key="`${sale.customer_id}-${sale.unit_name}`">
            <tr class="hover:bg-surface-sunken/40 transition-colors">
              <td class="px-6 py-4">
                <div class="text-sm font-medium text-ink">{{ sale.customer_name }}</div>
                <div class="text-xs text-ink-subtle font-mono">ID: {{ sale.customer_id }}</div>
              </td>
              <td class="px-6 py-4 text-sm text-ink">{{ sale.unit_name }}</td>
              <td class="px-6 py-4 text-sm text-ink max-w-xs truncate">{{ sale.enterprise_name }}</td>
              <td class="px-6 py-4 text-sm text-ink-muted font-mono">{{ formatDate(sale.financial_institution_date) }}</td>
              <td class="px-6 py-4 text-right">
                <div class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {{ formatCurrency(displayTotal(sale)) }}
                </div>
              </td>
              <td class="px-6 py-4 text-center">
                <Badge variant="accent" size="sm">
                  {{ sale.contracts.length }} {{ sale.contracts.length === 1 ? 'contrato' : 'contratos' }}
                </Badge>
              </td>
              <td class="px-6 py-4 text-center">
                <button @click="toggleDetails(sale)"
                  class="text-accent hover:text-accent-hover text-sm font-medium transition-colors">
                  {{ expandedSales.has(`${sale.customer_id}-${sale.unit_name}`) ? 'Ocultar' : 'Detalhes' }}
                </button>
              </td>
            </tr>

            <tr v-if="expandedSales.has(`${sale.customer_id}-${sale.unit_name}`)"
              class="bg-surface-sunken/40">
              <td colspan="7" class="px-6 py-4">
                <div class="space-y-3">
                  <h4 class="text-xs font-semibold text-ink uppercase tracking-wider font-mono">Condições de pagamento</h4>
                  <div v-for="contract in sale.contracts" :key="contract.contract_id" class="space-y-2">
                    <div class="flex items-center justify-between rounded-lg bg-surface-raised border border-line px-3 py-2">
                      <span class="text-sm font-medium text-ink-muted font-mono">Contrato: {{ contract.contract_id }}</span>
                      <span class="text-sm text-ink-muted">
                        Participação: <span class="font-mono text-ink">{{ contract.participation_percentage }}%</span>
                      </span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-4">
                      <div v-for="condition in contract.payment_conditions"
                        :key="`${contract.contract_id}-${condition.condition_type_id}`"
                        class="rounded-lg p-3 bg-surface-raised border-l-4"
                        :class="isDiscount(condition) ? 'border-red-500 border-y border-r border-line' : 'border-accent border-y border-r border-line'">
                        <div class="text-sm font-medium text-ink">{{ condition.condition_type_name }}</div>
                        <div class="text-lg font-semibold tabular-nums"
                          :class="isDiscount(condition) ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'">
                          {{ formatCurrency(condition.total_value) }}
                          <span v-if="isDiscount(condition)" class="text-xs text-ink-subtle ml-1 font-normal">(desconto)</span>
                        </div>
                        <div class="text-[10px] text-ink-subtle font-mono mt-0.5">{{ condition.condition_type_id }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Paginação -->
    <div v-if="totalPages > 1"
      class="px-6 py-3 border-t border-line bg-surface-sunken/40 flex flex-wrap items-center justify-between gap-2">
      <div class="text-xs text-ink-muted font-mono">
        {{ startItem }}–{{ endItem }} de {{ filteredSales.length }}
      </div>
      <div class="flex items-center gap-1">
        <IconButton icon="fas fa-angles-left" size="sm" label="Primeira"
          :disabled="currentPage === 1" @click="currentPage = 1" />
        <IconButton icon="fas fa-chevron-left" size="sm" label="Anterior"
          :disabled="currentPage === 1" @click="currentPage--" />
        <button v-for="page in visiblePages" :key="page" @click="currentPage = page"
          class="min-w-[32px] h-8 px-2 rounded-md text-xs font-mono transition-colors"
          :class="page === currentPage
            ? 'bg-accent text-white'
            : 'text-ink-muted hover:bg-surface-hover'">
          {{ page }}
        </button>
        <IconButton icon="fas fa-chevron-right" size="sm" label="Próxima"
          :disabled="currentPage === totalPages" @click="currentPage++" />
        <IconButton icon="fas fa-angles-right" size="sm" label="Última"
          :disabled="currentPage === totalPages" @click="currentPage = totalPages" />
      </div>
    </div>
  </section>
</template>
