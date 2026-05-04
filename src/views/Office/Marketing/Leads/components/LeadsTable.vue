<script setup>
import { ref, computed } from 'vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const props = defineProps({ data: { type: Array, required: true } });
const emit = defineEmits(['abrirModal']);

const colors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
];
const getColor = (i) => colors[i % colors.length];

// Última visualização aberta (visual feedback no segmented)
const lastView = ref('list');
const viewOptions = [
  { value: 'list',    label: 'Listagem', icon: 'fas fa-list' },
  { value: 'funnel',  label: 'Funil',    icon: 'fas fa-filter' },
  { value: 'stacked', label: 'Barras',   icon: 'fas fa-chart-column' },
  { value: 'pie',     label: 'Pizza',    icon: 'fas fa-chart-pie' },
];

const selectedNames = ref(new Set());
const visibleNames = computed(() => props.data.map(e => e.name));
const allVisibleChecked = computed(() =>
  visibleNames.value.length > 0 && visibleNames.value.every(n => selectedNames.value.has(n))
);

const sortedData = computed(() => [...props.data].sort((a, b) => b.count - a.count));
const maxCount = computed(() => Math.max(...(props.data.map(e => e.count)), 1));
const totalCount = computed(() => props.data.reduce((s, e) => s + e.count, 0));

function toggleAllVisible(evt) {
  const next = new Set(selectedNames.value);
  if (evt.target.checked) visibleNames.value.forEach(n => next.add(n));
  else visibleNames.value.forEach(n => next.delete(n));
  selectedNames.value = next;
}

function toggleOne(name, evt) {
  const next = new Set(selectedNames.value);
  evt.target.checked ? next.add(name) : next.delete(name);
  selectedNames.value = next;
}

// Abre o modal com os empreendimentos selecionados (ou todos visíveis) na visão escolhida
function openInView(mode) {
  if (!props.data?.length) return;
  lastView.value = mode;
  const namesSet = selectedNames.value.size ? new Set(selectedNames.value) : new Set(visibleNames.value);
  const leads = props.data.filter(e => namesSet.has(e.name)).flatMap(e => e.leads);
  emit('abrirModal', [leads, mode]);
}

// Abre 1 empreendimento (linha clicada)
function openSingle(entry, mode = 'list') {
  emit('abrirModal', [entry.leads, mode]);
}
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft overflow-hidden surface-gradient">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 border-b border-line">
      <div class="flex items-center gap-2 min-w-0">
        <div>
          <h3 class="text-sm font-semibold text-ink">Leads por empreendimento</h3>
          <p class="text-xs text-ink-muted mt-0.5">
            <span class="font-mono text-ink">{{ data?.length || 0 }}</span> empreendimento(s) ·
            <span class="font-mono text-ink">{{ totalCount }}</span> lead(s)
            <span v-if="selectedNames.size" class="text-accent">
              · <span class="font-mono">{{ selectedNames.size }}</span> selecionado(s)
            </span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <SegmentedControl :model-value="lastView" :options="viewOptions" size="sm"
          @change="openInView" />
      </div>
    </div>

    <!-- Empty -->
    <EmptyState v-if="!sortedData.length"
      icon="fas fa-inbox" title="Nenhum empreendimento encontrado"
      description="Ajuste os filtros para ver resultados." />

    <!-- Mobile: cards -->
    <div v-else class="md:hidden divide-y divide-line">
      <div v-for="(e, idx) in sortedData" :key="e.name"
        class="flex items-start gap-3 p-3 hover:bg-surface-sunken/40 transition-colors cursor-pointer"
        @click="openSingle(e)">
        <input type="checkbox" :checked="selectedNames.has(e.name)"
          @click.stop @change="toggleOne(e.name, $event)"
          class="mt-1 shrink-0" />
        <div :style="{ backgroundColor: getColor(idx) }"
          class="mt-1.5 w-2.5 h-2.5 rounded-full shrink-0"></div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-ink truncate">{{ e.name }}</p>
          <div class="mt-1.5 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500"
              :style="{ width: `${(e.count / maxCount) * 100}%`, backgroundColor: getColor(idx) }"></div>
          </div>
          <div class="flex items-baseline gap-2 mt-1">
            <span class="text-base font-semibold text-ink tabular-nums">{{ e.count }}</span>
            <span class="text-[11px] text-ink-subtle font-mono">
              {{ totalCount ? ((e.count / totalCount) * 100).toFixed(1) : 0 }}%
            </span>
          </div>
        </div>
        <i class="fas fa-chevron-right text-xs text-ink-subtle mt-2"></i>
      </div>
    </div>

    <!-- Desktop: tabela -->
    <div v-if="sortedData.length" class="hidden md:block overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-surface-sunken/40 border-b border-line">
          <tr>
            <th class="px-4 py-2.5 w-10">
              <input type="checkbox" :checked="allVisibleChecked" @change="toggleAllVisible($event)" />
            </th>
            <th class="px-4 py-2.5 text-left text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Empreendimento</th>
            <th class="px-4 py-2.5 text-right text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Leads</th>
            <th class="px-4 py-2.5 text-center text-[10px] font-mono uppercase tracking-wider text-ink-subtle">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="(e, idx) in sortedData" :key="e.name"
            class="hover:bg-surface-sunken/40 transition-colors">
            <td class="px-4 py-3">
              <input type="checkbox" :checked="selectedNames.has(e.name)"
                @change="toggleOne(e.name, $event)" />
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-3 min-w-0">
                <div :style="{ backgroundColor: getColor(idx) }" class="w-2.5 h-2.5 rounded-full shrink-0"></div>
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-ink truncate">{{ e.name }}</div>
                  <div class="mt-1 h-1 rounded-full bg-surface-sunken overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500"
                      :style="{ width: `${(e.count / maxCount) * 100}%`, backgroundColor: getColor(idx) }"></div>
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
            <td class="px-4 py-3">
              <div class="flex gap-1 justify-center">
                <IconButton icon="fas fa-eye" size="sm" label="Ver leads" @click="emit('abrirModal', [e.leads, 'list'])" />
                <IconButton icon="fas fa-filter" size="sm" label="Funil" @click="emit('abrirModal', [e.leads, 'funnel'])" />
                <IconButton icon="fas fa-chart-pie" size="sm" label="Pizza" @click="emit('abrirModal', [e.leads, 'pie'])" />
                <IconButton icon="fas fa-chart-column" size="sm" label="Barras" @click="emit('abrirModal', [e.leads, 'stacked'])" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
