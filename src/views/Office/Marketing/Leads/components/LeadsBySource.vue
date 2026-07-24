<script setup>
// "Origem dos leads" — ranking por origem, com barra proporcional. Clicar
// aplica o filtro de origem na tela.
import { computed } from 'vue';

const props = defineProps({
  leads: { type: Array, default: () => [] },
  limit: { type: Number, default: 8 },
});
const emit = defineEmits(['filtrarOrigem']);

const PALETTE = ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#f97316', '#64748b'];

const total = computed(() => props.leads?.length || 0);

const fontes = computed(() => {
  const map = new Map();
  for (const l of props.leads || []) {
    const key = String(l?.origem || '').trim() || 'Sem origem';
    map.set(key, (map.get(key) || 0) + 1);
  }
  const sorted = Array.from(map, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, props.limit);

  const max = Math.max(1, ...sorted.map(s => s.count));
  return sorted.map((s, i) => ({
    ...s,
    color: PALETTE[i % PALETTE.length],
    widthPct: (s.count / max) * 100,
    pct: total.value ? Math.round((s.count / total.value) * 100) : 0,
  }));
});

const intFmt = new Intl.NumberFormat('pt-BR');
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-4">
    <div class="flex items-center justify-between gap-3 mb-3">
      <h2 class="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle flex items-center gap-2">
        <i class="fas fa-signal-stream text-accent"></i>Origem dos leads
      </h2>
      <span v-if="fontes.length" class="text-[10px] text-ink-subtle shrink-0">clique p/ filtrar</span>
    </div>

    <div v-if="fontes.length" class="space-y-2.5">
      <button v-for="f in fontes" :key="f.name"
        type="button" @click="emit('filtrarOrigem', f.name)"
        :title="`Filtrar por ${f.name}`"
        class="w-full text-left group rounded-lg px-1 -mx-1 py-0.5
               hover:bg-accent-soft/30 transition-colors">
        <div class="flex items-baseline justify-between gap-3 mb-1">
          <span class="text-sm text-ink truncate group-hover:text-accent transition-colors">{{ f.name }}</span>
          <span class="text-xs shrink-0 tabular-nums">
            <b class="text-ink">{{ intFmt.format(f.count) }}</b>
            <span class="text-ink-subtle"> · {{ f.pct }}%</span>
          </span>
        </div>
        <div class="h-2 rounded-full bg-surface-sunken/70 overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500 ease-out-expo group-hover:opacity-90"
            :style="{ width: Math.max(2, f.widthPct) + '%', backgroundColor: f.color }"></div>
        </div>
      </button>
    </div>

    <div v-else class="h-32 grid place-items-center text-sm text-ink-subtle">
      Sem dados no período
    </div>
  </section>
</template>
