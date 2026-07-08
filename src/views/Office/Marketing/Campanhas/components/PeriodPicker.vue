<script setup>
// Seletor de PERÍODO mestre do relatório — padrão Gerenciador de Anúncios:
// presets rápidos (Hoje, 7d, 14d, 30d, Este mês, Mês passado...) + intervalo
// personalizado. Tudo que a tela mostra é recortado por este período.
//
// v-model:periodo = { since: 'YYYY-MM-DD', until: 'YYYY-MM-DD', preset: 'this_month' | ... | 'custom' }

import { computed, ref, watch } from 'vue';
import dayjs from 'dayjs';
import Input from '@/components/UI/Input.vue';

const props = defineProps({
    periodo: { type: Object, required: true },
});
const emit = defineEmits(['update:periodo']);

const PRESETS = [
    { key: 'today',      label: 'Hoje' },
    { key: 'yesterday',  label: 'Ontem' },
    { key: 'last_7d',    label: '7 dias' },
    { key: 'last_14d',   label: '14 dias' },
    { key: 'last_30d',   label: '30 dias' },
    { key: 'this_month', label: 'Este mês' },
    { key: 'last_month', label: 'Mês passado' },
    { key: 'last_90d',   label: '90 dias' },
];

function rangeForPreset(key) {
    const today = dayjs();
    switch (key) {
        case 'today':      return { since: today.format('YYYY-MM-DD'), until: today.format('YYYY-MM-DD') };
        case 'yesterday': {
            const y = today.subtract(1, 'day');
            return { since: y.format('YYYY-MM-DD'), until: y.format('YYYY-MM-DD') };
        }
        case 'last_7d':    return { since: today.subtract(6,  'day').format('YYYY-MM-DD'), until: today.format('YYYY-MM-DD') };
        case 'last_14d':   return { since: today.subtract(13, 'day').format('YYYY-MM-DD'), until: today.format('YYYY-MM-DD') };
        case 'last_30d':   return { since: today.subtract(29, 'day').format('YYYY-MM-DD'), until: today.format('YYYY-MM-DD') };
        case 'this_month': return { since: today.startOf('month').format('YYYY-MM-DD'), until: today.format('YYYY-MM-DD') };
        case 'last_month': {
            const m = today.subtract(1, 'month');
            return { since: m.startOf('month').format('YYYY-MM-DD'), until: m.endOf('month').format('YYYY-MM-DD') };
        }
        case 'last_90d':   return { since: today.subtract(89, 'day').format('YYYY-MM-DD'), until: today.format('YYYY-MM-DD') };
        default:           return null;
    }
}

function applyPreset(key) {
    const range = rangeForPreset(key);
    if (range) emit('update:periodo', { ...range, preset: key });
}

// ── Intervalo personalizado (popover simples) ──────────────────────────────
const customOpen = ref(false);
const customSince = ref(props.periodo.since);
const customUntil = ref(props.periodo.until);

watch(() => props.periodo, (p) => {
    customSince.value = p.since;
    customUntil.value = p.until;
});

function applyCustom() {
    if (!customSince.value || !customUntil.value) return;
    let s = customSince.value, u = customUntil.value;
    if (s > u) [s, u] = [u, s];
    emit('update:periodo', { since: s, until: u, preset: 'custom' });
    customOpen.value = false;
}

const rangeLabel = computed(() => {
    const f = (d) => d ? d.split('-').reverse().slice(0, 2).join('/') : '—';
    const y = props.periodo.since?.slice(0, 4) !== props.periodo.until?.slice(0, 4);
    const fy = (d) => d ? d.split('-').reverse().join('/') : '—';
    return y ? `${fy(props.periodo.since)} – ${fy(props.periodo.until)}`
             : `${f(props.periodo.since)} – ${f(props.periodo.until)}`;
});

const daysCount = computed(() => {
    if (!props.periodo.since || !props.periodo.until) return null;
    return dayjs(props.periodo.until).diff(dayjs(props.periodo.since), 'day') + 1;
});
</script>

<template>
  <div class="flex items-center gap-2 flex-wrap">
    <!-- Presets: pill segmented -->
    <div class="inline-flex rounded-lg border border-line bg-surface p-0.5 flex-wrap">
      <button v-for="p in PRESETS" :key="p.key"
        @click="applyPreset(p.key)"
        :class="['px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
          periodo.preset === p.key
            ? 'bg-accent text-white shadow-sm'
            : 'text-ink-muted hover:text-ink hover:bg-surface-hover']">
        {{ p.label }}
      </button>
    </div>

    <!-- Personalizado -->
    <div class="relative">
      <button @click="customOpen = !customOpen"
        :class="['inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
          periodo.preset === 'custom'
            ? 'border-accent/50 bg-accent/10 text-accent'
            : 'border-line bg-surface text-ink-muted hover:text-ink hover:bg-surface-hover']">
        <i class="fas fa-calendar-days text-[10px]"></i>
        <span class="font-mono tabular-nums">{{ rangeLabel }}</span>
        <span v-if="daysCount" class="text-[10px] text-ink-subtle">({{ daysCount }}d)</span>
        <i class="fas fa-chevron-down text-[9px] transition-transform" :class="{ 'rotate-180': customOpen }"></i>
      </button>

      <!-- Popover -->
      <div v-if="customOpen"
        class="absolute z-30 mt-1.5 right-0 sm:left-0 sm:right-auto w-[280px] rounded-xl border border-line bg-surface-raised shadow-elevated p-3 space-y-2.5">
        <div class="text-[10px] uppercase tracking-wider font-mono text-ink-subtle">Intervalo personalizado</div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[11px] text-ink-muted mb-1">Início</label>
            <Input v-model="customSince" type="date" size="sm" />
          </div>
          <div>
            <label class="block text-[11px] text-ink-muted mb-1">Fim</label>
            <Input v-model="customUntil" type="date" size="sm" />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button @click="customOpen = false"
            class="px-2.5 py-1.5 rounded-md text-xs text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors">
            Cancelar
          </button>
          <button @click="applyCustom"
            class="px-3 py-1.5 rounded-md text-xs font-medium bg-accent text-white hover:opacity-90 transition-opacity">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
