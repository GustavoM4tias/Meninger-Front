<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200">Distribuição de Preços</h3>
      <div class="flex items-center gap-2">
        <select
          v-model="selectedStage"
          class="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
          @change="$emit('filter-stage', selectedStage)"
        >
          <option value="">Todos os módulos</option>
          <option v-for="mod in modules" :key="mod.idetapa" :value="mod.idetapa">
            {{ mod.module_name }}
          </option>
        </select>
        <button @click="$emit('refresh')" class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>
    </div>

    <!-- Tabelas de preço ativas -->
    <div v-if="priceTables?.length" class="mb-4 flex flex-wrap gap-2">
      <div
        v-for="t in priceTables"
        :key="t.idtabela"
        :class="[
          'px-3 py-1.5 rounded-lg border text-xs',
          t.vigente
            ? 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700 text-green-700 dark:text-green-300'
            : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        ]"
      >
        <div class="font-medium">{{ t.nome }}</div>
        <div class="text-gray-400 dark:text-gray-500 mt-0.5">
          {{ formatDate(t.data_vigencia_de) }} – {{ formatDate(t.data_vigencia_ate) }}
          <span v-if="t.porcentagem_comissao"> · {{ t.porcentagem_comissao }}% comissão</span>
        </div>
      </div>
    </div>

    <!-- Distribuição -->
    <div v-if="distribution?.length">
      <!-- Barra visual -->
      <div class="flex h-6 rounded-full overflow-hidden mb-3">
        <div
          v-for="(group, i) in topGroups"
          :key="i"
          :style="{ width: `${(group.unit_count / totalUnits) * 100}%`, backgroundColor: colors[i % colors.length] }"
          class="transition-all"
          :title="`${formatCurrency(group.bucket_value)}: ${group.unit_count} unidades`"
        />
      </div>

      <!-- Legenda e detalhes -->
      <div class="space-y-2">
        <div
          v-for="(group, i) in topGroups"
          :key="i"
          class="flex items-start gap-3"
        >
          <span
            class="w-3 h-3 rounded-sm flex-shrink-0 mt-0.5"
            :style="{ backgroundColor: colors[i % colors.length] }"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {{ formatCurrency(group.bucket_value) }}
              </span>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ group.unit_count }} unidades ({{ pct(group.unit_count) }})
              </span>
              <!-- Valores exatos se diferem do bucket -->
              <span
                v-if="group.exact_values.length > 1"
                class="text-xs text-gray-400 dark:text-gray-500"
              >
                — {{ group.exact_values.map(v => formatCurrency(v)).join(', ') }}
              </span>
            </div>
            <!-- Unidades (colapsável) -->
            <div
              v-if="expandedGroup === i"
              class="mt-1 flex flex-wrap gap-1"
            >
              <span
                v-for="u in group.units"
                :key="u.idunidade"
                class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
                :title="formatCurrency(u.valor)"
              >
                {{ u.nome }}
              </span>
            </div>
            <button
              @click="expandedGroup = expandedGroup === i ? null : i"
              class="text-xs text-blue-500 hover:text-blue-700 mt-0.5"
            >
              {{ expandedGroup === i ? 'ocultar unidades' : `ver ${group.units.length} unidades` }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-6 text-xs text-gray-400 dark:text-gray-500">
      Sem dados de preço disponíveis. Execute o sync de tabelas de preço.
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    distribution: { type: Array, default: () => [] },
    priceTables: { type: Array, default: () => [] },
    modules: { type: Array, default: () => [] },
});

const emit = defineEmits(['filter-stage', 'refresh']);

const selectedStage = ref('');
const expandedGroup = ref(null);

const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

const topGroups = computed(() =>
    (props.distribution ?? []).slice(0, 7) // máximo 7 faixas
);

const totalUnits = computed(() =>
    topGroups.value.reduce((sum, g) => sum + g.unit_count, 0)
);

function pct(count) {
    if (!totalUnits.value) return '0%';
    return `${Math.round((count / totalUnits.value) * 100)}%`;
}

function formatCurrency(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

function formatDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}
</script>
