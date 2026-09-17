<script setup>
// KPIs do relatório com variação vs período anterior - a mesma StatRow das
// outras telas (número conta, selo de variação pousa, cor pelo juízo).
// Métricas "menor é melhor" (CAC, CPM) invertem o juízo do delta.

import { computed } from 'vue';
import StatRow from '@/components/UI/StatRow.vue';

const props = defineProps({
    totals:      { type: Object, default: null },   // período atual (derive() do back)
    totalsPrev:  { type: Object, default: null },   // período anterior
    periodPrev:  { type: Object, default: null },   // { since, until }
    currency:    { type: String, default: 'BRL' },
    loading:     { type: Boolean, default: false },
});

const moneyFmt = computed(() => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: props.currency || 'BRL', maximumFractionDigits: 2,
}));
const moneyFmt0 = computed(() => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: props.currency || 'BRL', maximumFractionDigits: 0,
}));
const intFmt = new Intl.NumberFormat('pt-BR');

const prevLabel = computed(() => {
    if (!props.periodPrev?.since) return 'vs período anterior';
    const f = (d) => d ? d.split('-').reverse().slice(0, 2).join('/') : '';
    return `vs ${f(props.periodPrev.since)} a ${f(props.periodPrev.until)}`;
});

// { value, dir, good, label } no formato do StatCard. `invert` = menor é melhor.
function delta(curr, prev, invert = false) {
    const c = Number(curr), p = Number(prev);
    if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
    const pct = ((c - p) / Math.abs(p)) * 100;
    const dir = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
    const good = dir === 'flat' ? true : (invert ? dir === 'down' : dir === 'up');
    return { value: Math.abs(pct), dir, good, label: prevLabel.value };
}

const items = computed(() => {
    const t = props.totals || {};
    const p = props.totalsPrev || {};
    return [
        { key: 'spend',       label: 'Investido',  raw: Number(t.spend) || 0,       format: v => moneyFmt0.value.format(v), icon: 'fas fa-sack-dollar',  tone: 'accent',  delta: delta(t.spend, p.spend) },
        // Leads da NOSSA base (inbound_leads), não a contagem da Meta: só aqui
        // existe pessoa com nome/telefone/e-mail para conferir no CV.
        { key: 'leads',       label: 'Leads',      raw: Number(t.office_leads) || 0, format: v => intFmt.format(v),        icon: 'fas fa-user-check',   tone: 'pos',     delta: delta(t.office_leads, p.office_leads),
          hint: Number(t.office_leads_delivered) > 0 ? `${intFmt.format(t.office_leads_delivered)} no CV` : '', tooltip: 'Leads da nossa base no período (com nome, telefone e e-mail). Spam fora.' },
        { key: 'cac',         label: 'CAC',        raw: t.cac != null ? Number(t.cac) : 0, format: v => t.cac != null ? moneyFmt.value.format(v) : '-', decimals: 2, icon: 'fas fa-coins', tone: 'warn', delta: delta(t.cac, p.cac, true), tooltip: 'Investido ÷ leads da nossa base no período.' },
        { key: 'ctr',         label: 'CTR',        value: t.ctr != null ? `${Number(t.ctr).toFixed(2)}%` : '-', icon: 'fas fa-arrow-pointer', tone: 'neutral', delta: delta(t.ctr, p.ctr) },
        { key: 'cpm',         label: 'CPM',        raw: t.cpm != null ? Number(t.cpm) : 0, format: v => t.cpm != null ? moneyFmt.value.format(v) : '-', decimals: 2, icon: 'fas fa-bullseye', tone: 'neutral', delta: delta(t.cpm, p.cpm, true) },
        { key: 'clicks',      label: 'Cliques',    raw: Number(t.clicks) || 0,      format: v => intFmt.format(v),        icon: 'fas fa-hand-pointer', tone: 'neutral', delta: delta(t.clicks, p.clicks) },
        { key: 'impressions', label: 'Impressões', raw: Number(t.impressions) || 0, format: v => intFmt.format(v),        icon: 'fas fa-eye',          tone: 'neutral', delta: delta(t.impressions, p.impressions) },
    ];
});
</script>

<template>
  <StatRow :items="items" :loading="loading" :cols="{ sm: 3, md: 4, lg: 7 }" size="sm" />
</template>
