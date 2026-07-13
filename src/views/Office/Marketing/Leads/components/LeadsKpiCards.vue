<script setup>
// KPIs de leads no padrão do relatório Meta — valor grande + variação vs o
// período anterior (mesma duração). Métrica "menor é melhor" (descartados)
// inverte a cor do delta.

import { computed } from 'vue';

const props = defineProps({
    total:      { type: Number, default: 0 },
    prevTotal:  { type: Number, default: 0 },
    situations: { type: Array, default: () => [] },   // [{ key, count }] período atual
    prevSituacoes: { type: Object, default: () => ({}) },
});

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Soma as situações (atuais/anteriores) cujo nome bate alguma keyword.
function sumBy(list, keywords, isPrev = false) {
    let sum = 0;
    if (isPrev) {
        for (const [name, count] of Object.entries(props.prevSituacoes || {})) {
            if (keywords.some(k => norm(name).includes(k))) sum += count;
        }
    } else {
        for (const s of list) {
            if (keywords.some(k => norm(s.key).includes(k))) sum += (s.count || 0);
        }
    }
    return sum;
}

const KW = {
    atendimento: ['atendimento', 'externo', 'tentativa', 'contato'],
    qualificado: ['qualificad'],
    reserva:     ['reserva', 'proposta', 'venda', 'contrato'],
    descartado:  ['descartad', 'perdid', 'sem interesse'],
};

function delta(curr, prev) {
    if (!prev) return null;
    return ((curr - prev) / prev) * 100;
}

const kpis = computed(() => {
    const s = props.situations;
    const atd = sumBy(s, KW.atendimento);
    const qual = sumBy(s, KW.qualificado);
    const res = sumBy(s, KW.reserva);
    const desc = sumBy(s, KW.descartado);

    const atdP = sumBy(null, KW.atendimento, true);
    const qualP = sumBy(null, KW.qualificado, true);
    const resP = sumBy(null, KW.reserva, true);
    const descP = sumBy(null, KW.descartado, true);

    const conv = props.total > 0 ? +(((qual + res) / props.total) * 100).toFixed(1) : null;
    const convP = props.prevTotal > 0 ? ((qualP + resP) / props.prevTotal) * 100 : null;

    return [
        { key: 'total', label: 'Total de leads', icon: 'fas fa-users', accent: 'text-blue-500 bg-blue-500/10',
          value: props.total, delta: delta(props.total, props.prevTotal), invert: false },
        { key: 'atd', label: 'Em atendimento', icon: 'fas fa-headset', accent: 'text-violet-500 bg-violet-500/10',
          value: atd, delta: delta(atd, atdP), invert: false },
        { key: 'qual', label: 'Qualificados', icon: 'fas fa-star', accent: 'text-amber-500 bg-amber-500/10',
          value: qual, delta: delta(qual, qualP), invert: false },
        { key: 'res', label: 'Reservas', icon: 'fas fa-handshake', accent: 'text-emerald-500 bg-emerald-500/10',
          value: res, delta: delta(res, resP), invert: false },
        { key: 'conv', label: 'Conversão', icon: 'fas fa-percent', accent: 'text-teal-500 bg-teal-500/10',
          value: conv, isPct: true, delta: conv != null && convP != null ? delta(conv, convP) : null, invert: false },
        { key: 'desc', label: 'Descartados', icon: 'fas fa-ban', accent: 'text-rose-500 bg-rose-500/10',
          value: desc, delta: delta(desc, descP), invert: true },
    ];
});

const intFmt = new Intl.NumberFormat('pt-BR');
function fmtValue(k) {
    if (k.value == null) return '—';
    return k.isPct ? `${k.value}%` : intFmt.format(k.value);
}
function deltaView(k) {
    if (k.delta == null) return null;
    const up = k.delta >= 0;
    const good = k.invert ? !up : up;
    return {
        text: `${up ? '+' : ''}${k.delta.toFixed(k.delta >= 100 ? 0 : 1)}%`,
        icon: up ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down',
        cls: good ? 'text-emerald-600 dark:text-emerald-300 bg-emerald-500/10'
                  : 'text-red-600 dark:text-red-300 bg-red-500/10',
    };
}
</script>

<template>
  <div class="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible no-scrollbar">
    <div class="flex sm:grid gap-2.5 sm:gap-3 sm:grid-cols-3 lg:grid-cols-6 min-w-max sm:min-w-0">
      <div v-for="k in kpis" :key="k.key"
        class="group flex flex-col gap-1 p-3 rounded-xl border border-line bg-surface-raised
               shadow-soft hover:shadow-elevated hover:border-accent/30 hover:-translate-y-0.5
               transition-all duration-200 ease-out-expo w-36 sm:w-auto shrink-0 surface-gradient">
        <div class="flex items-center justify-between gap-2">
          <span class="h-7 w-7 rounded-lg grid place-items-center text-xs" :class="k.accent">
            <i :class="k.icon"></i>
          </span>
          <span v-if="deltaView(k)"
            :class="['inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums', deltaView(k).cls]"
            title="vs período anterior">
            <i :class="['fas text-[8px]', deltaView(k).icon]"></i>{{ deltaView(k).text }}
          </span>
        </div>
        <span class="text-lg font-semibold text-ink tabular-nums tracking-tight leading-none mt-1">{{ fmtValue(k) }}</span>
        <span class="text-[11px] text-ink-muted">{{ k.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar { scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
</style>
