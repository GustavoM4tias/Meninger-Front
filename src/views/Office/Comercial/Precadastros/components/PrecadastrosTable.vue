<script setup>
import { computed, ref } from 'vue';
import IconButton from '@/components/UI/IconButton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Select from '@/components/UI/Select.vue';
import { STAGE_GROUPS, bucketOf } from '../stages.js';

const props = defineProps({
  data: { type: Array, default: () => [] },
});
const emit = defineEmits(['abrirModal']);

const sortBy = ref('count-desc');
const selectedNames = ref(new Set());

const lastView = ref('list');
const viewOptions = [
  { value: 'list',   label: 'Listagem', icon: 'fas fa-list' },
  { value: 'pie',    label: 'Pizza',    icon: 'fas fa-chart-pie' },
  { value: 'bar',    label: 'Colunas',  icon: 'fas fa-chart-column' },
  { value: 'funnel', label: 'Funil',    icon: 'fas fa-filter' },
];

const sortOptions = [
  { value: 'count-desc', label: 'Total ↓' },
  { value: 'count-asc',  label: 'Total ↑' },
  { value: 'aprov-desc', label: 'Aprovados ↓' },
  { value: 'taxa-desc',  label: '% Aprovação ↓' },
  { value: 'name-asc',   label: 'Nome A→Z' },
];

// Apenas grupos visíveis (excluindo 'outros')
const groupCols = computed(() => STAGE_GROUPS.filter(g => g.key !== 'outros'));

// Pré-calcula breakdown
const enriched = computed(() => {
  return (props.data || []).map(e => {
    const breakdown = Object.fromEntries(STAGE_GROUPS.map(g => [g.key, 0]));
    for (const p of (e.precadastros || [])) {
      const b = bucketOf(p.situacao_nome);
      breakdown[b.key] = (breakdown[b.key] || 0) + 1;
    }
    return { ...e, breakdown };
  });
});

const stageCount = (e, key) => e.breakdown?.[key] ?? 0;

const taxaAprov = (e) => {
  const aprov = stageCount(e, 'aprovado');
  const reserva = stageCount(e, 'reserva');
  return e.count ? (aprov + reserva) / e.count : null;
};
const taxaColor = (t) => {
  if (t === null) return 'text-ink-subtle';
  if (t >= 0.8) return 'text-emerald-500';
  if (t >= 0.5) return 'text-amber-500';
  return 'text-red-500';
};

const sorted = computed(() => {
  const arr = [...enriched.value];
  switch (sortBy.value) {
    case 'count-asc':  return arr.sort((a, b) => a.count - b.count);
    case 'aprov-desc': return arr.sort((a, b) => stageCount(b, 'aprovado') - stageCount(a, 'aprovado'));
    case 'taxa-desc':  return arr.sort((a, b) => (taxaAprov(b) ?? -1) - (taxaAprov(a) ?? -1));
    case 'name-asc':   return arr.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    default:           return arr.sort((a, b) => b.count - a.count);
  }
});

const pctOf = (n, d) => d > 0 ? (n / d) * 100 : 0;
const totalCount = computed(() => sorted.value.reduce((s, e) => s + e.count, 0));
const maxCount = computed(() => Math.max(...sorted.value.map(e => e.count), 1));

const totals = computed(() => {
  const t = { count: 0 };
  for (const g of STAGE_GROUPS) t[g.key] = 0;
  for (const e of enriched.value) {
    t.count += e.count;
    for (const g of STAGE_GROUPS) t[g.key] += e.breakdown[g.key] || 0;
  }
  return t;
});
const totalTaxa = computed(() => {
  const sucesso = (totals.value.aprovado || 0) + (totals.value.reserva || 0);
  return totals.value.count ? sucesso / totals.value.count : null;
});

// ── Seleção ───────────────────────────────────────────
const visibleNames = computed(() => sorted.value.map(e => e.name));
const allVisibleChecked = computed(() =>
  visibleNames.value.length > 0 && visibleNames.value.every(n => selectedNames.value.has(n))
);
function toggleAllVisible(evt) {
  const next = new Set(selectedNames.value);
  if (evt.target.checked) visibleNames.value.forEach(n => next.add(n));
  else visibleNames.value.forEach(n => next.delete(n));
  selectedNames.value = next;
}
function toggleOne(name, evt) {
  const next = new Set(selectedNames.value);
  if (evt.target.checked) next.add(name);
  else next.delete(name);
  selectedNames.value = next;
}

// ── Open ──────────────────────────────────────────────
function openInView(mode) {
  if (!sorted.value.length) return;
  lastView.value = mode;
  const names = selectedNames.value.size > 0 ? selectedNames.value : new Set(visibleNames.value);
  const flat = [];
  for (const e of sorted.value) {
    if (!names.has(e.name)) continue;
    for (const p of (e.precadastros || [])) flat.push(p);
  }
  emit('abrirModal', [flat, mode]);
}
function openSingle(e, mode = 'list') {
  emit('abrirModal', [e.precadastros || [], mode]);
}

const palette = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'];
const getColor = (idx) => palette[idx % palette.length];
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden surface-gradient">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border-b border-line">
      <div class="flex items-center gap-2 min-w-0 w-96">
        <div>
          <h3 class="text-sm font-semibold text-ink">Pré-Cadastros por empreendimento</h3>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="font-mono text-ink">{{ sorted.length }}</span> empreendimento(s) ·
            <span class="font-mono text-ink">{{ totalCount }}</span> pasta(s)
            <span v-if="selectedNames.size" class="text-accent">
              · <span class="font-mono">{{ selectedNames.size }}</span> selecionado(s)
            </span>
          </p>
        </div>
      </div>

      <div class="flex items-center w-full gap-2 md:flex-nowrap flex-wrap justify-center md:justify-end">
        <Select v-model="sortBy" :options="sortOptions" size="sm" class="md:max-w-20" />
        <SegmentedControl :model-value="lastView" :options="viewOptions" size="md" @change="openInView" />
      </div>
    </div>

    <!-- Empty -->
    <EmptyState v-if="!sorted.length"
      icon="fas fa-inbox" title="Nenhum empreendimento encontrado"
      description="Ajuste os filtros para ver resultados." />

    <!-- Mobile: cards -->
    <div v-else class="md:hidden divide-y divide-line">
      <div v-for="(e, idx) in sorted" :key="e.name"
        class="flex items-start gap-3 p-3 hover:bg-surface-sunken/40 transition-colors cursor-pointer"
        @click="openSingle(e)">
        <input type="checkbox" :checked="selectedNames.has(e.name)"
          @click.stop @change="toggleOne(e.name, $event)"
          class="mt-1 shrink-0 accent-accent" />
        <div :style="{ backgroundColor: getColor(idx) }"
          class="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"></div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-ink truncate">{{ e.name }}</p>
          <div class="mt-1.5 h-1.5 rounded-full bg-surface-sunken overflow-hidden flex">
            <div v-for="g in groupCols" :key="g.key" class="h-full transition-all"
              :class="g.bar"
              :style="{ width: `${pctOf(stageCount(e, g.key), e.count)}%` }"></div>
          </div>
          <div class="flex items-baseline gap-2 mt-1.5">
            <span class="text-base font-semibold text-ink tabular-nums">{{ e.count }}</span>
            <span class="text-[11px] font-mono" :class="taxaColor(taxaAprov(e))">
              {{ taxaAprov(e) === null ? '—' : (taxaAprov(e) * 100).toFixed(1) + '% aprov.' }}
            </span>
          </div>
        </div>
        <i class="fas fa-chevron-right text-xs text-ink-subtle mt-2"></i>
      </div>
    </div>

    <!-- Desktop: tabela -->
    <div v-if="sorted.length" class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-surface-sunken/40 border-b border-line">
          <tr>
            <th class="px-4 py-2.5 w-10">
              <input type="checkbox" :checked="allVisibleChecked" @change="toggleAllVisible($event)"
                class="accent-accent" />
            </th>
            <th class="px-4 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Empreendimento</th>
            <th class="px-4 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Total</th>
            <th v-for="g in groupCols" :key="g.key" v-tippy="g.label"
              class="px-3 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">
              <i :class="[g.icon, g.text]"></i>
            </th>
            <th class="px-4 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle"
              v-tippy="'(Aprovados + Em Reserva) ÷ Total de pastas'">% Aprov.</th>
            <th class="px-4 py-2.5 text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="(e, idx) in sorted" :key="e.name" class="hover:bg-surface-sunken/40 transition-colors">
            <td class="px-4 py-3">
              <input type="checkbox" :checked="selectedNames.has(e.name)"
                @change="toggleOne(e.name, $event)" class="accent-accent" />
            </td>
            <td class="px-4 py-3 cursor-pointer"
              @click="toggleOne(e.name, { target: { checked: !selectedNames.has(e.name) } })">
              <div class="flex items-center gap-3 min-w-0">
                <div :style="{ backgroundColor: getColor(idx) }" class="w-2.5 h-2.5 rounded-full shrink-0"></div>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-ink truncate">{{ e.name }}</div>
                  <div class="mt-1 h-1 rounded-full bg-surface-sunken overflow-hidden flex">
                    <div v-for="g in groupCols" :key="g.key" class="h-full transition-all"
                      :class="g.bar"
                      :style="{ width: `${pctOf(stageCount(e, g.key), e.count)}%` }"></div>
                  </div>
                </div>
              </div>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="text-sm font-semibold text-ink tabular-nums">{{ e.count }}</div>
              <div class="text-[10px] text-ink-subtle font-mono">
                {{ totalCount ? ((e.count / totalCount) * 100).toFixed(1) : 0 }}%
              </div>
            </td>
            <td v-for="g in groupCols" :key="g.key"
              class="px-3 py-3 text-right tabular-nums text-sm">
              <span :class="stageCount(e, g.key) > 0 ? g.text + ' font-semibold' : 'text-ink-subtle'">
                {{ stageCount(e, g.key) }}
              </span>
            </td>
            <td class="px-4 py-3 text-right tabular-nums">
              <span class="text-sm font-medium" :class="taxaColor(taxaAprov(e))">
                {{ taxaAprov(e) === null ? '—' : (taxaAprov(e) * 100).toFixed(1) + '%' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-1 justify-center">
                <IconButton icon="fas fa-eye" size="sm" label="Listagem" @click.stop="openSingle(e, 'list')" />
                <IconButton icon="fas fa-chart-pie" size="sm" label="Pizza" @click.stop="openSingle(e, 'pie')" />
                <IconButton icon="fas fa-chart-column" size="sm" label="Colunas" @click.stop="openSingle(e, 'bar')" />
                <IconButton icon="fas fa-filter" size="sm" label="Funil" @click.stop="openSingle(e, 'funnel')" />
              </div>
            </td>
          </tr>
        </tbody>
        <!-- Totais -->
        <tfoot class="bg-surface-sunken/40 border-t border-line">
          <tr>
            <td></td>
            <td class="px-4 py-3 text-sm font-semibold text-ink-muted">
              Total ({{ sorted.length }} empreendimento{{ sorted.length !== 1 ? 's' : '' }})
            </td>
            <td class="px-4 py-3 text-right tabular-nums font-bold text-ink">{{ totals.count }}</td>
            <td v-for="g in groupCols" :key="g.key"
              class="px-3 py-3 text-right tabular-nums text-sm font-semibold" :class="g.text">
              {{ totals[g.key] }}
            </td>
            <td class="px-4 py-3 text-right tabular-nums text-sm font-semibold" :class="taxaColor(totalTaxa)">
              {{ totalTaxa === null ? '—' : (totalTaxa * 100).toFixed(1) + '%' }}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>
</template>
