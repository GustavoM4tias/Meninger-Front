<script setup>
// Banner de saúde da captação — só aparece quando há sinais que merecem ação.
// Cada "sinal" é uma faixa colorida discreta no topo da tela. Sinais com
// `filter` são clicáveis: aplicam o filtro de status no inbox SEM recorte de
// período (os problemas podem ser antigos e sumiriam no mês atual).

import { computed } from 'vue';

const props = defineProps({
    health: { type: Object, default: null },
});

const emit = defineEmits(['focus-status']);

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
            detail: 'Os leads não estão sendo enviados ao CV — desligue o modo sombra na aba Configurações quando estiver pronto.',
        });
    }

    if (h.dead_letter > 0) {
        arr.push({
            tone: 'danger',
            icon: 'fas fa-skull-crossbones',
            title: `${h.dead_letter} lead${h.dead_letter > 1 ? 's' : ''} em dead-letter`,
            detail: 'Atingiram o limite de tentativas e não serão re-disparados sozinhos. Clique pra ver e use "Redisparar" depois de checar a causa.',
            filter: 'failed',
        });
    }

    // Recusados pelo CV (4xx / sucesso:false) NUNCA são re-tentados sozinhos —
    // antes acumulavam em silêncio, sem nenhum alerta.
    const rejectedTotal = h.counts?.rejected || 0;
    if (rejectedTotal > 0) {
        arr.push({
            tone: 'danger',
            icon: 'fas fa-ban',
            title: `${rejectedTotal} lead${rejectedTotal > 1 ? 's' : ''} recusado${rejectedTotal > 1 ? 's' : ''} pelo CV`,
            detail: 'O CV rejeitou o cadastro (dado inválido, duplicidade ou vínculo errado). Não há retry automático: clique pra ver, corrija e redispare.',
            filter: 'rejected',
        });
    }

    // Webhook chegou mas o fetch dos dados na Graph API falhou — o scheduler
    // re-tenta com backoff; se persistir, é token/permissão da Meta.
    if (h.pending_fetch > 0) {
        arr.push({
            tone: 'warning',
            icon: 'fas fa-cloud-arrow-down',
            title: `${h.pending_fetch} lead${h.pending_fetch > 1 ? 's' : ''} aguardando dados da Meta`,
            detail: 'O webhook avisou do lead, mas a busca dos dados na Graph API falhou. Re-tentando automaticamente — se persistir, confira o token na aba Credenciais.',
            filter: 'received',
        });
    }

    if (oldestHeldAge.value != null && oldestHeldAge.value >= 2) {
        arr.push({
            tone: 'warning',
            icon: 'fas fa-hourglass-half',
            title: `Lead mais antigo em "Aguardando vínculo": ${oldestHeldAge.value} dia${oldestHeldAge.value > 1 ? 's' : ''}`,
            detail: 'Defina mapping de campanha na aba Campanhas pra rotear automaticamente — ou clique pra abrir os leads e resolver o vínculo.',
            filter: 'held',
        });
    }

    if (h.failed_24h > 0 && h.failed_24h !== h.dead_letter) {
        arr.push({
            tone: 'info',
            icon: 'fas fa-arrows-rotate',
            title: `${h.failed_24h} falha${h.failed_24h > 1 ? 's' : ''} de despacho nas últimas 24h`,
            detail: 'O scheduler já está re-tentando com backoff exponencial. Investigue só se persistir.',
            filter: 'failed',
        });
    }

    return arr;
});

function onClick(s) {
    if (s.filter) emit('focus-status', s.filter, { global: true });
}

const TONE = {
    danger:  'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300',
    warning: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    info:    'border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300',
};
</script>

<template>
  <div v-if="signals.length" class="space-y-2 mb-4">
    <component :is="s.filter ? 'button' : 'div'" v-for="(s, i) in signals" :key="i"
      @click="onClick(s)"
      class="w-full rounded-xl border px-3.5 py-2.5 flex items-start gap-3 text-left"
      :class="[TONE[s.tone], s.filter ? 'cursor-pointer hover:shadow-soft transition-shadow' : '']">
      <i :class="s.icon" class="text-base mt-0.5 shrink-0"></i>
      <div class="min-w-0 flex-1">
        <div class="text-sm font-medium leading-tight">{{ s.title }}</div>
        <div class="text-xs opacity-80 mt-0.5">{{ s.detail }}</div>
      </div>
      <i v-if="s.filter" class="fas fa-chevron-right text-xs mt-1 shrink-0 opacity-60"></i>
    </component>
  </div>
</template>
