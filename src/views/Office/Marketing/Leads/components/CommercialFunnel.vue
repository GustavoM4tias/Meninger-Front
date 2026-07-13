<script setup>
// Funil comercial dos leads — agrupa as situações do CV em ETAPAS ordenadas e
// mostra a distribuição atual por etapa (barras estilo funil) + % e variação
// vs o período anterior. Clique numa etapa filtra por ela.
//
// IMPORTANTE: os leads têm UMA situação atual (não é histórico de transições),
// então isto é a DISTRIBUIÇÃO por etapa, não um funil de conversão temporal.
// A "conversão" exibida = (qualificados + reservas) ÷ total do funil.
//
// O mapeamento situação → etapa é heurístico (por palavra-chave) e fácil de
// ajustar: basta editar STAGE_DEFS. Situações não mapeadas caem em "Outros".

import { computed } from 'vue';

const props = defineProps({
    situations: { type: Array, default: () => [] },   // [{ key, label, count }] (situationsList do store)
    prevSituacoes: { type: Object, default: () => ({}) },
    total: { type: Number, default: 0 },
});
const emit = defineEmits(['filtrarSituacao']);

// Etapas do funil, em ordem. `match` = palavras-chave (normalizadas) que caem na etapa.
const STAGE_DEFS = [
    { key: 'novo',        label: 'Novo / Aguardando', icon: 'fas fa-inbox',        color: '#3b82f6', match: ['novo', 'aguardando'] },
    { key: 'contato',     label: 'Em contato',        icon: 'fas fa-phone',        color: '#06b6d4', match: ['tentativa', 'contato'] },
    { key: 'atendimento', label: 'Em atendimento',    icon: 'fas fa-headset',      color: '#8b5cf6', match: ['atendimento', 'externo'] },
    { key: 'qualificado', label: 'Qualificado',       icon: 'fas fa-star',         color: '#f59e0b', match: ['qualificad'] },
    { key: 'reserva',     label: 'Reserva / Proposta', icon: 'fas fa-handshake',   color: '#10b981', match: ['reserva', 'proposta', 'venda', 'contrato'] },
];
const LOST = { key: 'descartado', label: 'Descartado', match: ['descartad', 'perdid', 'sem interesse', 'inválid', 'invalid', 'duplicad'] };

const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function stageForSituacao(name) {
    const n = norm(name);
    if (LOST.match.some(m => n.includes(m))) return 'descartado';
    for (const st of STAGE_DEFS) {
        if (st.match.some(m => n.includes(m))) return st.key;
    }
    return 'outros';
}

// Agrupa contagem atual e anterior por etapa, guardando quais situações caem nela.
const grouped = computed(() => {
    const cur = {}; const situacoesByStage = {};
    for (const s of props.situations) {
        const st = stageForSituacao(s.key);
        cur[st] = (cur[st] || 0) + (s.count || 0);
        (situacoesByStage[st] = situacoesByStage[st] || []).push(s.key);
    }
    const prev = {};
    for (const [name, count] of Object.entries(props.prevSituacoes || {})) {
        const st = stageForSituacao(name);
        prev[st] = (prev[st] || 0) + count;
    }
    return { cur, prev, situacoesByStage };
});

const maxCount = computed(() => {
    return Math.max(1, ...STAGE_DEFS.map(s => grouped.value.cur[s.key] || 0));
});

const stages = computed(() => {
    const g = grouped.value;
    const totalFunnel = STAGE_DEFS.reduce((sum, s) => sum + (g.cur[s.key] || 0), 0);
    return STAGE_DEFS.map(def => {
        const count = g.cur[def.key] || 0;
        const prev = g.prev[def.key] || 0;
        const delta = prev > 0 ? ((count - prev) / prev) * 100 : null;
        return {
            ...def,
            count,
            pct: totalFunnel > 0 ? (count / totalFunnel) * 100 : 0,
            widthPct: (count / maxCount.value) * 100,
            delta,
            situacoes: g.situacoesByStage[def.key] || [],
        };
    });
});

const descartados = computed(() => grouped.value.cur.descartado || 0);
const outros = computed(() => grouped.value.cur.outros || 0);

// Conversão = (qualificados + reservas) ÷ total do funil.
const conversao = computed(() => {
    const g = grouped.value.cur;
    const totalFunnel = STAGE_DEFS.reduce((sum, s) => sum + (g[s.key] || 0), 0);
    if (!totalFunnel) return null;
    const won = (g.qualificado || 0) + (g.reserva || 0);
    return +((won / totalFunnel) * 100).toFixed(1);
});

function fmtInt(v) { return new Intl.NumberFormat('pt-BR').format(Number(v) || 0); }
function deltaBadge(d) {
    if (d == null) return null;
    const up = d >= 0;
    return {
        text: `${up ? '+' : ''}${d.toFixed(d >= 100 ? 0 : 1)}%`,
        cls: up ? 'text-emerald-600 dark:text-emerald-300' : 'text-red-600 dark:text-red-300',
        icon: up ? 'fa-arrow-up' : 'fa-arrow-down',
    };
}

function clickStage(st) {
    // Filtra por todas as situações que compõem a etapa.
    for (const sit of st.situacoes) emit('filtrarSituacao', sit);
}
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-4">
    <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
      <h2 class="text-sm font-semibold text-ink flex items-center gap-2">
        <i class="fas fa-filter text-accent"></i>Funil comercial
      </h2>
      <div v-if="conversao != null" class="flex items-baseline gap-1.5">
        <span class="text-2xl font-bold text-emerald-600 dark:text-emerald-300 tabular-nums">{{ conversao }}%</span>
        <span class="text-[11px] text-ink-subtle">qualificados + reservas</span>
      </div>
    </div>

    <!-- Barras de funil -->
    <div class="space-y-2">
      <button v-for="st in stages" :key="st.key" @click="clickStage(st)"
        class="w-full group text-left" :title="`Filtrar por ${st.label}`">
        <div class="flex items-center gap-2 mb-1">
          <i :class="[st.icon, 'text-xs w-4 text-center']" :style="{ color: st.color }"></i>
          <span class="text-xs font-medium text-ink">{{ st.label }}</span>
          <span class="text-[10px] text-ink-subtle">{{ st.pct.toFixed(0) }}%</span>
          <span v-if="deltaBadge(st.delta)" :class="['text-[10px] ml-auto tabular-nums flex items-center gap-0.5', deltaBadge(st.delta).cls]">
            <i :class="['fas text-[7px]', deltaBadge(st.delta).icon]"></i>{{ deltaBadge(st.delta).text }}
          </span>
          <span class="text-sm font-semibold text-ink tabular-nums" :class="{ 'ml-auto': !deltaBadge(st.delta) }">{{ fmtInt(st.count) }}</span>
        </div>
        <div class="h-3 rounded-full bg-surface-sunken/60 overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500 ease-out-expo group-hover:opacity-90"
            :style="{ width: Math.max(2, st.widthPct) + '%', backgroundColor: st.color }"></div>
        </div>
      </button>
    </div>

    <!-- Rodapé: descartados + outros -->
    <div v-if="descartados || outros" class="mt-4 pt-3 border-t border-line/60 flex items-center gap-4 text-xs">
      <span v-if="descartados" class="flex items-center gap-1.5 text-ink-muted">
        <i class="fas fa-ban text-red-400"></i>
        <b class="text-ink">{{ fmtInt(descartados) }}</b> descartado(s)
      </span>
      <span v-if="outros" class="flex items-center gap-1.5 text-ink-muted">
        <i class="fas fa-ellipsis text-ink-subtle"></i>
        <b class="text-ink">{{ fmtInt(outros) }}</b> em outras situações
      </span>
    </div>
  </section>
</template>
