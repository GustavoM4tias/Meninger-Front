<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { useDistratosStore } from '@/stores/Comercial/Distratos/distratosStore';

import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const emit = defineEmits(['filter-changed']);
const store = useDistratosStore();
const route = useRoute();
const router = useRouter();

const localFilters = ref({
  startDate: dayjs().startOf('year').format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
  enterpriseName: [],
});

const enterprisesOptions = computed(() =>
  (store.enterprises || []).map(e => e.name)
);

// ── Filtros ativos ───────────────────────────────────
const activeFiltersCount = computed(() => {
  let n = 0;
  if (localFilters.value.enterpriseName.length) n++;
  // Considera datas como filtro se mudaram do default
  const defaultStart = dayjs().startOf('year').format('YYYY-MM-DD');
  const defaultEnd = dayjs().format('YYYY-MM-DD');
  if (localFilters.value.startDate !== defaultStart) n++;
  if (localFilters.value.endDate !== defaultEnd) n++;
  return n;
});
const hasActiveFilters = computed(() => activeFiltersCount.value > 0);

const isExpanded = ref(typeof window !== 'undefined' && window.innerWidth >= 1024);
function toggle() { isExpanded.value = !isExpanded.value; }

// ── URL sync ─────────────────────────────────────────
function syncFromUrl() {
  const q = route.query;
  if (!Object.keys(q).length) return;
  const next = { ...localFilters.value };
  if (q.enterpriseName) next.enterpriseName = String(q.enterpriseName).split(',').map(s => s.trim()).filter(Boolean);
  else                  next.enterpriseName = [];
  if (q.startDate) next.startDate = String(q.startDate);
  if (q.endDate)   next.endDate   = String(q.endDate);
  localFilters.value = next;
  store.setFilters(localFilters.value);
}
function syncToUrl() {
  const q = {};
  if (localFilters.value.startDate) q.startDate = localFilters.value.startDate;
  if (localFilters.value.endDate)   q.endDate   = localFilters.value.endDate;
  if (localFilters.value.enterpriseName.length) q.enterpriseName = localFilters.value.enterpriseName.join(',');
  router.replace({ query: q });
}

function applyFilters() {
  store.setFilters({ ...localFilters.value });
  syncToUrl();
  emit('filter-changed');
}

function clearFilters() {
  localFilters.value = {
    startDate: dayjs().startOf('year').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
    enterpriseName: [],
  };
  store.clearFilters();
  router.replace({ query: {} });
  emit('filter-changed');
}

watch(localFilters, v => store.setFilters({ ...v }), { deep: true });

onMounted(async () => {
  await store.fetchEnterprises();
  syncFromUrl();
});
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
    <!-- Toolbar -->
    <div class="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-line bg-surface-sunken/40 rounded-t-xl">
      <button @click="toggle"
        class="flex items-center gap-2 text-sm font-medium text-ink hover:text-accent transition-colors">
        <i class="fas fa-filter text-xs text-ink-muted"></i>
        <span>Filtros</span>
        <Badge v-if="hasActiveFilters" variant="accent" size="sm">
          {{ activeFiltersCount }} ativo{{ activeFiltersCount > 1 ? 's' : '' }}
        </Badge>
        <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"></i>
      </button>

      <div class="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="clearFilters">
          <span class="hidden sm:inline">Limpar</span>
        </Button>
        <Button size="sm" icon="fas fa-magnifying-glass" @click="applyFilters">
          <span class="hidden sm:inline">Buscar</span>
        </Button>
      </div>
    </div>

    <!-- Campos -->
    <div v-show="isExpanded" class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in"
      style="overflow:visible">
      <Input v-model="localFilters.startDate" type="date" label="Data distrato — início" />
      <Input v-model="localFilters.endDate" type="date" label="Data distrato — fim" />

      <div class="lg:col-span-2">
        <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
          <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>Empreendimento(s)
        </label>
        <MultiSelector
          :model-value="localFilters.enterpriseName"
          @update:modelValue="v => localFilters.enterpriseName = Array.isArray(v) ? v : []"
          :options="enterprisesOptions"
          placeholder="Todos os empreendimentos"
          :page-size="150"
          :select-all="true" />
      </div>
    </div>
  </section>
</template>
