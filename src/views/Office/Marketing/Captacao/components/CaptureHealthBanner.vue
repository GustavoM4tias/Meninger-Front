<script setup>
// Banner de saúde da captação — só aparece quando há sinais que merecem ação.
// Cada "sinal" é uma faixa colorida discreta no topo da tela.

import { computed } from 'vue';

const props = defineProps({
    health: { type: Object, default: null },
});

const ageInDays = (iso) => {
    if (!iso) return null;
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms)) return null;
    return Math.floor(ms / (24 * 60 * 60 * 1000));
};

const oldestHeldAge = computed(() => ageInDays(props.health?.oldest_held?.created_at));

const signals = computed(() => {
    const h = props.health;
    if (!h) return [];
    const arr = [];

    if (h.dry_run) {
        arr.push({
            tone: 'warning',
            icon: 'fas fa-eye-slash',
            title: 'Modo sombra ativo',
            detail: 'Os leads não estão sendo enviados ao CV — desligue MARKETING_CAPTURE_DRY_RUN no .env quando estiver pronto pra cortar o RD.',
        });
    }

    if (h.dead_letter > 0) {
        arr.push({
            tone: 'danger',
            icon: 'fas fa-skull-crossbones',
            title: `${h.dead_letter} lead${h.dead_letter > 1 ? 's' : ''} em dead-letter`,
            detail: 'Atingiram o limite de tentativas e não serão re-disparados sozinhos. Abra cada um e use "Redisparar" depois de checar a causa.',
        });
    }

    if (oldestHeldAge.value != null && oldestHeldAge.value >= 2) {
        arr.push({
            tone: 'warning',
            icon: 'fas fa-hourglass-half',
            title: `Lead mais antigo em "Aguardando vínculo": ${oldestHeldAge.value} dia${oldestHeldAge.value > 1 ? 's' : ''}`,
            detail: 'Defina mapping de campanha em /marketing/campanhas pra rotear automaticamente — ou abra os leads e resolva o vínculo no inbox.',
        });
    }

    if (h.failed_24h > 0 && h.failed_24h !== h.dead_letter) {
        arr.push({
            tone: 'info',
            icon: 'fas fa-arrows-rotate',
            title: `${h.failed_24h} falha${h.failed_24h > 1 ? 's' : ''} de despacho nas últimas 24h`,
            detail: 'O scheduler já está re-tentando com backoff exponencial. Investigue só se persistir.',
        });
    }

    return arr;
});

const TONE = {
    danger:  'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300',
    warning: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    info:    'border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300',
};
</script>

<template>
  <div v-if="signals.length" class="space-y-2 mb-4">
    <div v-for="(s, i) in signals" :key="i"
      class="rounded-xl border px-3.5 py-2.5 flex items-start gap-3"
      :class="TONE[s.tone]">
      <i :class="s.icon" class="text-base mt-0.5 shrink-0"></i>
      <div class="min-w-0 flex-1">
        <div class="text-sm font-medium leading-tight">{{ s.title }}</div>
        <div class="text-xs opacity-80 mt-0.5">{{ s.detail }}</div>
      </div>
    </div>
  </div>
</template>
