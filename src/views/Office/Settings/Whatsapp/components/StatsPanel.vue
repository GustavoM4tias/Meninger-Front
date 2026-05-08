<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import Spinner from '@/components/UI/Spinner.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const store = useWhatsappStore();
const days = ref(30);

const ranges = [
  { value: 7,  label: '7 dias' },
  { value: 30, label: '30 dias' },
  { value: 90, label: '90 dias' },
];

const fetchData = () => store.fetchStats(days.value);
onMounted(fetchData);
watch(days, fetchData);

const cards = computed(() => {
  const s = store.stats;
  if (!s) return [];
  const f = (n) => Number(n || 0).toLocaleString('pt-BR');
  return [
    { label: 'Total enviadas',  value: f(s.total),                    accent: 'text-ink' },
    { label: 'Entregues',       value: f(s.byStatus?.delivered),      accent: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Lidas',           value: f(s.byStatus?.read),           accent: 'text-sky-600 dark:text-sky-400' },
    { label: 'Falhas',          value: f(s.byStatus?.failed),         accent: 'text-red-600 dark:text-red-400' },
    { label: 'Simulação (dry_run)', value: f(s.byStatus?.dry_run),    accent: 'text-amber-600 dark:text-amber-400' },
    { label: 'Taxa entrega',    value: ((s.deliveryRate || 0) * 100).toFixed(1) + '%', accent: 'text-ink' },
  ];
});
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-end">
      <SegmentedControl v-model="days" :options="ranges" size="sm" />
    </div>

    <div v-if="store.loadingStats" class="py-12 grid place-items-center"><Spinner /></div>

    <div v-else-if="!store.stats" class="py-12 text-center text-sm text-ink-muted">
      Sem dados.
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <div v-for="c in cards" :key="c.label"
        class="rounded-xl border border-line bg-surface-raised shadow-soft p-4">
        <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">{{ c.label }}</p>
        <p :class="['text-2xl font-semibold mt-1', c.accent]">{{ c.value }}</p>
      </div>
    </div>

    <div v-if="store.stats?.byCostCategory && Object.keys(store.stats.byCostCategory).length"
      class="rounded-xl border border-line bg-surface-raised p-4">
      <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">Por categoria de cobrança</p>
      <div class="flex flex-wrap gap-2">
        <span v-for="(count, cat) in store.stats.byCostCategory" :key="cat"
          class="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-line bg-surface-sunken text-xs">
          <span class="font-medium text-ink">{{ cat }}</span>
          <span class="text-ink-muted">{{ count }}</span>
        </span>
      </div>
    </div>
  </div>
</template>
