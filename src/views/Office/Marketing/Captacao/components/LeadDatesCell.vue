<script setup>
// Cell densa com as 3 datas do ciclo de vida do lead:
//   1. Meta   — quando o lead foi criado na plataforma (raw_payload.graph.created_time)
//   2. Office — quando entrou no nosso DB (created_at)
//   3. CV     — quando foi entregue ao CV (last_dispatch_at se status=delivered)
//
// Mostra também a latência Meta → Office (delay do webhook + processamento) e
// Office → CV (tempo até despachar com sucesso). Em "—" quando o passo não
// ocorreu (lead site_form não tem Meta; held não tem CV; etc.).

import { computed } from 'vue';

const props = defineProps({
    metaAt:   { type: [String, Date, null], default: null },
    officeAt: { type: [String, Date, null], default: null },
    cvAt:     { type: [String, Date, null], default: null },
    compact:  { type: Boolean, default: false },
});

const toMs = (d) => {
    if (!d) return null;
    const t = new Date(d).getTime();
    return Number.isFinite(t) ? t : null;
};
const fmt = (d) => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function humanDelta(ms) {
    if (ms == null || ms < 0) return null;
    const s = Math.round(ms / 1000);
    if (s < 60)  return `${s}s`;
    const m = Math.round(s / 60);
    if (m < 60)  return `${m}m`;
    const h = Math.round(m / 60);
    if (h < 24)  return `${h}h`;
    const d = Math.round(h / 24);
    return `${d}d`;
}

const metaMs   = computed(() => toMs(props.metaAt));
const officeMs = computed(() => toMs(props.officeAt));
const cvMs     = computed(() => toMs(props.cvAt));

const metaToOffice = computed(() => (metaMs.value && officeMs.value)
    ? humanDelta(officeMs.value - metaMs.value) : null);
const officeToCv = computed(() => (officeMs.value && cvMs.value)
    ? humanDelta(cvMs.value - officeMs.value) : null);
</script>

<template>
  <div :class="compact ? 'space-y-0.5' : 'space-y-1'">
    <!-- Meta -->
    <div class="flex items-center gap-1.5 text-[11px]">
      <i class="fab fa-meta text-violet-500 w-3"></i>
      <span class="font-mono tabular-nums" :class="metaMs ? 'text-ink' : 'text-ink-subtle'">{{ fmt(metaAt) }}</span>
      <span v-if="metaToOffice" class="text-[10px] text-ink-subtle font-mono"
        :title="`Meta → Office em ${metaToOffice}`">+{{ metaToOffice }}</span>
    </div>

    <!-- Office -->
    <div class="flex items-center gap-1.5 text-[11px]">
      <i class="fas fa-database text-indigo-500 w-3"></i>
      <span class="font-mono tabular-nums" :class="officeMs ? 'text-ink' : 'text-ink-subtle'">{{ fmt(officeAt) }}</span>
      <span v-if="officeToCv" class="text-[10px] text-ink-subtle font-mono"
        :title="`Office → CV em ${officeToCv}`">+{{ officeToCv }}</span>
    </div>

    <!-- CV -->
    <div class="flex items-center gap-1.5 text-[11px]">
      <i class="fas fa-check-double text-emerald-500 w-3"></i>
      <span class="font-mono tabular-nums" :class="cvMs ? 'text-ink' : 'text-ink-subtle'">{{ fmt(cvAt) }}</span>
    </div>
  </div>
</template>
