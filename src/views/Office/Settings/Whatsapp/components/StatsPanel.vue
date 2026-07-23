<script setup>
// Painel de GASTOS — antes só contava mensagens por categoria; agora estima o
// custo em R$ (modelo PMP: cobra por template entregue, por categoria) e mostra
// quanto foi economizado enviando dentro da janela de serviço grátis de 24h.
// Estimativa interna: a fatura real é a da Meta. Tarifas ajustáveis por env.
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

const brl = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const int = (n) => Number(n || 0).toLocaleString('pt-BR');

const cost = computed(() => store.stats?.cost || null);

// Cards principais de custo.
const costCards = computed(() => {
  const c = cost.value;
  if (!c) return [];
  return [
    { label: 'Custo estimado', value: brl(c.estimatedBRL), accent: 'text-ink', hint: 'no período' },
    { label: 'Cobradas', value: int(c.billableCount), accent: 'text-amber-600 dark:text-amber-400', hint: 'geraram custo' },
    { label: 'Gratuitas', value: int(c.freeCount), accent: 'text-emerald-600 dark:text-emerald-400', hint: 'serviço / janela 24h' },
    { label: 'Economia da janela', value: brl(c.freeWindowSavedBRL), accent: 'text-emerald-600 dark:text-emerald-400', hint: 'não viraram template pago' },
  ];
});

// Cards de entrega (secundários).
const deliveryCards = computed(() => {
  const s = store.stats;
  if (!s) return [];
  return [
    { label: 'Total enviadas', value: int(s.total) },
    { label: 'Entregues', value: int(s.byStatus?.delivered) },
    { label: 'Lidas', value: int(s.byStatus?.read) },
    { label: 'Falhas', value: int(s.byStatus?.failed) },
    { label: 'Simulação', value: int(s.byStatus?.dry_run) },
    { label: 'Taxa entrega', value: ((s.deliveryRate || 0) * 100).toFixed(1) + '%' },
  ];
});

const categories = computed(() => {
  const by = cost.value?.byCategory;
  if (!by) return [];
  return Object.entries(by)
    .map(([cat, v]) => ({ cat, ...v }))
    .sort((a, b) => b.estBRL - a.estBRL);
});

const usdToBrl = computed(() => store.stats?.rates?.usdToBrl);
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <p class="text-xs text-ink-muted">
        Custo <strong>estimado</strong> pelas tarifas configuradas — a cobrança real é a fatura da Meta.
        <span v-if="usdToBrl">Câmbio usado: US$ 1 = R$ {{ Number(usdToBrl).toFixed(2) }}.</span>
      </p>
      <SegmentedControl v-model="days" :options="ranges" size="sm" />
    </div>

    <div v-if="store.loadingStats" class="py-12 grid place-items-center"><Spinner /></div>

    <div v-else-if="!store.stats" class="py-12 text-center text-sm text-ink-muted">Sem dados.</div>

    <template v-else>
      <!-- Custo -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="c in costCards" :key="c.label"
          class="rounded-xl border border-line bg-surface-raised shadow-soft p-4">
          <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">{{ c.label }}</p>
          <p :class="['text-2xl font-semibold mt-1', c.accent]">{{ c.value }}</p>
          <p class="text-[11px] text-ink-subtle mt-0.5">{{ c.hint }}</p>
        </div>
      </div>

      <!-- Por categoria de cobrança -->
      <div v-if="categories.length" class="rounded-xl border border-line bg-surface-raised overflow-hidden">
        <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle px-4 pt-4 pb-2">Por categoria de cobrança</p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle border-y border-line">
                <th class="text-left font-medium px-4 py-2">Categoria</th>
                <th class="text-right font-medium px-4 py-2">Total</th>
                <th class="text-right font-medium px-4 py-2">Cobradas</th>
                <th class="text-right font-medium px-4 py-2">Grátis</th>
                <th class="text-right font-medium px-4 py-2">Custo est.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in categories" :key="row.cat" class="border-b border-line/60 last:border-0">
                <td class="px-4 py-2 font-medium text-ink capitalize">{{ row.cat }}</td>
                <td class="px-4 py-2 text-right text-ink-muted">{{ int(row.count) }}</td>
                <td class="px-4 py-2 text-right text-amber-600 dark:text-amber-400">{{ int(row.billable) }}</td>
                <td class="px-4 py-2 text-right text-emerald-600 dark:text-emerald-400">{{ int(row.free) }}</td>
                <td class="px-4 py-2 text-right font-medium text-ink">{{ brl(row.estBRL) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="cost?.unknownCount" class="text-[11px] text-ink-subtle px-4 py-2 border-t border-line">
          {{ int(cost.unknownCount) }} mensagem(ns) ainda sem categoria confirmada pela Meta (status pendente do webhook) — não somadas ao custo.
        </p>
      </div>

      <!-- Entrega -->
      <div>
        <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-2">Entrega</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div v-for="c in deliveryCards" :key="c.label"
            class="rounded-xl border border-line bg-surface-raised p-3">
            <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">{{ c.label }}</p>
            <p class="text-xl font-semibold mt-1 text-ink">{{ c.value }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
