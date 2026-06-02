<script setup>
// View Timeline: tipo Gantt — cada campanha é uma linha com uma barra horizontal
// indicando o período (start_time → stop_time ou "hoje" se ativa).
// A largura da barra é proporcional à duração; a cor representa o status.
//
// Marcador vertical do "hoje" cruza todas as linhas pra dar orientação temporal.

import { computed } from 'vue';

const props = defineProps({
    campaigns: { type: Array, required: true },
    currency: { type: String, default: 'BRL' },
    // Janela temporal vinda do filtro (data_inicio / data_fim).
    // Se vazia, computamos do min/max das campanhas.
    periodStart: { type: String, default: null },
    periodEnd:   { type: String, default: null },
});
const emit = defineEmits(['select']);

const window = computed(() => {
    const now = new Date();
    let start, end;

    if (props.periodStart && props.periodEnd) {
        // Usa exatamente a janela do filtro
        start = new Date(props.periodStart);
        end = new Date(props.periodEnd);
        end.setHours(23, 59, 59, 999);
    } else {
        // Fallback: min(start) → max(stop ou hoje) das campanhas
        let minStart = null, maxEnd = null;
        for (const c of props.campaigns) {
            if (c.start_time) {
                const s = new Date(c.start_time);
                if (!minStart || s < minStart) minStart = s;
            }
            const e = c.stop_time ? new Date(c.stop_time) : now;
            if (!maxEnd || e > maxEnd) maxEnd = e;
        }
        if (!minStart) minStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        if (!maxEnd)   maxEnd = now;
        const pad = (maxEnd.getTime() - minStart.getTime()) * 0.04;
        start = new Date(minStart.getTime() - pad);
        end   = new Date(maxEnd.getTime() + pad);
    }

    return { start, end, now };
});

const totalMs = computed(() => window.value.end.getTime() - window.value.start.getTime());

function posPct(date) {
    if (!date) return 0;
    const t = new Date(date).getTime();
    const p = ((t - window.value.start.getTime()) / totalMs.value) * 100;
    return Math.max(0, Math.min(100, p));
}

/**
 * Trim do range da campanha à janela visível.
 * Retorna { left, width, leftClipped, rightClipped }.
 *  leftClipped  = a campanha começou antes da janela (mostra setinha)
 *  rightClipped = continua após a janela (campanha ativa estendendo)
 */
function rangeOnWindow(c) {
    const w = window.value;
    const start = c.start_time ? new Date(c.start_time) : null;
    const isActive = String(c.effective_status || c.status || '').toUpperCase().includes('ACTIVE');
    const stop = c.stop_time
        ? new Date(c.stop_time)
        : (isActive ? w.now : (c.last_synced_at ? new Date(c.last_synced_at) : w.now));

    if (!start) return { left: 0, width: 0, leftClipped: false, rightClipped: false };

    const leftClipped  = start < w.start;
    const rightClipped = stop > w.end;

    const effectiveStart = leftClipped  ? w.start : start;
    const effectiveStop  = rightClipped ? w.end   : stop;

    const left = posPct(effectiveStart);
    const right = posPct(effectiveStop);
    return {
        left,
        width: Math.max(0.5, right - left),
        leftClipped,
        rightClipped,
    };
}

const months = computed(() => {
    const arr = [];
    const start = new Date(window.value.start.getFullYear(), window.value.start.getMonth(), 1);
    const end = window.value.end;
    let cur = new Date(start);
    while (cur < end) {
        arr.push({
            label: cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            position: posPct(cur),
        });
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return arr;
});

const nowPos = computed(() => posPct(window.value.now));

function barColor(c) {
    const s = String(c.effective_status || c.status || '').toUpperCase();
    if (s.includes('ACTIVE'))   return 'bg-emerald-500/70 hover:bg-emerald-500 border-emerald-700';
    if (s.includes('PAUSED'))   return 'bg-amber-500/60 hover:bg-amber-500 border-amber-700';
    if (s.includes('DELETED'))  return 'bg-red-500/50 hover:bg-red-500 border-red-700';
    if (s.includes('ARCHIVED')) return 'bg-slate-400/40 hover:bg-slate-400 border-slate-600';
    return 'bg-slate-400/40 hover:bg-slate-400 border-slate-600';
}

function fmtMoney(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: props.currency || 'BRL' }).format(Number(v));
}
function fmtShortDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return '—'; }
}

// Ordena: ativas primeiro, depois por start_time asc
const sorted = computed(() => {
    return [...props.campaigns].sort((a, b) => {
        const aActive = String(a.effective_status || a.status).toUpperCase().includes('ACTIVE');
        const bActive = String(b.effective_status || b.status).toUpperCase().includes('ACTIVE');
        if (aActive !== bActive) return aActive ? -1 : 1;
        const at = a.start_time ? new Date(a.start_time).getTime() : 0;
        const bt = b.start_time ? new Date(b.start_time).getTime() : 0;
        return bt - at;
    });
});
</script>

<template>
  <div class="rounded-xl border border-line bg-surface overflow-hidden">

    <!-- Eixo de meses no topo -->
    <div class="relative h-7 border-b border-line bg-surface-sunken/40">
      <div v-for="(m, i) in months" :key="i"
        class="absolute top-0 bottom-0 flex items-center"
        :style="{ left: m.position + '%' }">
        <span class="text-[9px] uppercase tracking-wider text-ink-subtle font-mono pl-1 border-l border-line/40 h-full flex items-center">
          {{ m.label }}
        </span>
      </div>
      <!-- Marca "hoje" -->
      <div class="absolute top-0 bottom-0 w-px bg-red-500/80 z-10"
        :style="{ left: nowPos + '%' }">
        <div class="absolute -top-1 -translate-x-1/2 text-[8px] font-mono text-red-500 bg-surface px-1 rounded whitespace-nowrap">
          hoje
        </div>
      </div>
    </div>

    <!-- Linhas de campanha -->
    <div class="relative max-h-[60vh] overflow-y-auto">
      <!-- Marca "hoje" full height -->
      <div class="absolute top-0 bottom-0 w-px bg-red-500/40 z-10 pointer-events-none"
        :style="{ left: nowPos + '%' }"></div>

      <div v-for="c in sorted" :key="c.id"
        class="relative h-10 border-b border-line/40 hover:bg-surface-hover/40 cursor-pointer"
        @click="emit('select', c)">

        <!-- Nome da campanha (esquerda, sticky) -->
        <div class="absolute left-2 top-0 bottom-0 z-20 flex items-center pr-2 pointer-events-none"
          style="background: linear-gradient(90deg, var(--surface) 80%, transparent);">
          <span class="text-[11px] text-ink font-medium truncate max-w-[200px]" :title="c.name">{{ c.name }}</span>
        </div>

        <!-- Barra Gantt (trimada à janela) -->
        <div :class="['absolute top-2 bottom-2 rounded border flex items-center overflow-hidden', barColor(c)]"
          :style="{ left: rangeOnWindow(c).left + '%', width: rangeOnWindow(c).width + '%' }"
          :title="`${c.name}\n${fmtShortDate(c.start_time)} → ${c.stop_time ? fmtShortDate(c.stop_time) : 'em andamento'}\nGasto: ${fmtMoney(c.spend)} · Leads: ${c.meta_leads_total || 0}`">
          <!-- Indicador clip à esquerda (começou antes da janela) -->
          <span v-if="rangeOnWindow(c).leftClipped" class="text-white/80 text-[9px] px-0.5">‹‹</span>
          <span class="flex-1 text-[10px] text-white font-medium truncate flex items-center gap-1 px-1">
            <span v-if="c.spend" class="opacity-90 font-mono shrink-0">{{ fmtMoney(c.spend) }}</span>
            <span v-if="c.meta_leads_total" class="opacity-80 shrink-0">· {{ c.meta_leads_total }}L</span>
          </span>
          <!-- Indicador clip à direita (continua após a janela) -->
          <span v-if="rangeOnWindow(c).rightClipped" class="text-white/80 text-[9px] px-0.5">››</span>
        </div>
      </div>

      <div v-if="!sorted.length" class="text-center py-12 text-ink-subtle">
        <i class="fas fa-chart-gantt text-3xl mb-2 block"></i>
        <p class="text-sm">Sem campanhas no filtro</p>
      </div>
    </div>

    <!-- Legenda -->
    <div class="px-3 py-2 border-t border-line/60 bg-surface-sunken/30 flex flex-wrap items-center gap-3 text-[10px] text-ink-subtle">
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-emerald-500/70"></span>Ativa</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-amber-500/60"></span>Pausada</span>
      <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-slate-400/40"></span>Arquivada / Outras</span>
      <span class="ml-auto">{{ sorted.length }} campanha(s) no período</span>
    </div>
  </div>
</template>
