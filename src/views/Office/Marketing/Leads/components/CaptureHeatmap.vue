<script setup>
// "Melhores horários de captação" — mapa de calor dia da semana × hora, a partir
// do data_cad dos leads. CSS puro (sem ECharts): são 168 células simples.
import { computed } from 'vue';
import dayjs from 'dayjs';

const props = defineProps({
  leads: { type: Array, default: () => [] },
});

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// matriz[dia][hora] = contagem
const matriz = computed(() => {
  const m = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const l of props.leads || []) {
    if (!l?.data_cad) continue;
    const d = dayjs(l.data_cad);
    if (!d.isValid()) continue;
    m[d.day()][d.hour()] += 1;
  }
  return m;
});

const max = computed(() => Math.max(1, ...matriz.value.flat()));

// 5 níveis de intensidade — nível 0 fica quase transparente.
function cellStyle(v) {
  if (!v) return { backgroundColor: 'rgb(59 130 246 / 0.07)' };
  const ratio = v / max.value;
  const alpha = 0.18 + ratio * 0.82;   // 0.18 → 1.0
  return { backgroundColor: `rgb(59 130 246 / ${alpha.toFixed(2)})` };
}

const rows = computed(() =>
  DIAS.map((label, i) => ({ label, cells: matriz.value[i] }))
);

const cols = { gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' };

// Rótulos do eixo de horas nas posições 0, 6, 12, 18 e 23.
const HOURS = [0, 6, 12, 18, 23];
function hourStyle(h) {
  return { gridColumn: `${h + 1} / span 1` };
}

const temDados = computed(() => matriz.value.some(r => r.some(v => v > 0)));
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-4">
    <div class="flex items-start justify-between gap-3 mb-3 flex-wrap">
      <div class="min-w-0">
        <h2 class="text-micro font-semibold uppercase tracking-wider text-ink-subtle flex items-center gap-2">
          <i class="fas fa-clock text-accent"></i>Melhores horários de captação
        </h2>
        <p class="text-xs text-ink-muted mt-1">
          Dia da semana × hora - concentre o atendimento onde o lead chega
        </p>
      </div>
      <!-- Legenda -->
      <div class="flex items-center gap-1.5 text-micro text-ink-subtle shrink-0">
        <span>menos</span>
        <span v-for="a in [0.12, 0.4, 0.7, 1]" :key="a"
          class="h-3 w-3 rounded-[3px]"
          :style="{ backgroundColor: `rgb(59 130 246 / ${a})` }"></span>
        <span>mais</span>
      </div>
    </div>

    <div v-if="temDados" class="overflow-x-auto no-scrollbar">
      <div class="min-w-[460px]">
        <div v-for="row in rows" :key="row.label" class="flex items-center gap-2 mb-[3px]">
          <span class="w-8 shrink-0 text-micro text-ink-subtle text-right">{{ row.label }}</span>
          <div class="flex-1 grid gap-[3px]" :style="cols">
            <span v-for="(v, h) in row.cells" :key="h"
              class="aspect-square rounded-[3px]"
              :style="cellStyle(v)"
              :title="`${row.label} ${String(h).padStart(2, '0')}h — ${v} lead(s)`"></span>
          </div>
        </div>

        <!-- Eixo de horas -->
        <div class="flex items-center gap-2 mt-1.5">
          <span class="w-8 shrink-0"></span>
          <div class="flex-1 grid" :style="cols">
            <span v-for="h in HOURS" :key="h"
              class="text-micro text-ink-subtle font-mono"
              :style="hourStyle(h)">
              {{ String(h).padStart(2, '0') }}h
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="h-32 grid place-items-center text-sm text-ink-subtle">
      Sem dados no período
    </div>
  </section>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
