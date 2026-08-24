<script setup>
// Painel de alertas do sistema: quantos existem, quem criou, o que foi
// compartilhado. É a ABA "Painel" da tela de Notificações, visível só para
// administrador - o mesmo padrão do mural: item de admin DENTRO da tela, em vez
// de uma tela separada no menu.

// Painel admin de alertas — visão geral (admin-only). Mostra totais e um detalhamento
// por usuário (quantos alertas cada um tem, quantos disparos, último disparo).

import { onMounted, ref } from 'vue';
import * as api from '@/utils/Alerts/apiAlerts';
import { useToast } from 'vue-toastification';

import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

const toast = useToast();

const loading = ref(true);
const stats = ref(null);

onMounted(load);
async function load() {
  loading.value = true;
  try {
    stats.value = await api.fetchAdminStats();
  } catch (e) {
    toast.error('Falha ao carregar estatísticas.');
  } finally { loading.value = false; }
}

const fmtDate = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

const cards = (s) => [
  { label: 'Alertas ativos', value: s.totals.rulesEnabled, sub: `de ${s.totals.rules} no total`, icon: 'fas fa-tower-broadcast', cls: 'text-accent' },
  { label: 'Usuários com alertas', value: s.totals.users, sub: 'donos de regras', icon: 'fas fa-users', cls: 'text-accent' },
  { label: 'Disparos hoje', value: s.totals.triggersToday, sub: `${s.totals.triggers7d} nos últimos 7 dias`, icon: 'fas fa-bolt', cls: 'text-data-warn' },
  { label: 'Disparos no total', value: s.totals.triggersTotal, sub: 'acumulado', icon: 'fas fa-chart-column', cls: 'text-data-pos' },
];
</script>

<template>
  <div>


<!-- Carregando: a forma dos quatro cartoes e dos blocos, para nao saltar -->
<div v-if="loading" class="space-y-6">
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <Skeleton v-for="i in 4" :key="i" variant="stat" />
  </div>
  <Skeleton variant="card" class="h-24" />
  <Skeleton variant="table" />
</div>

<EmptyState v-else-if="!stats"
  icon="fas fa-chart-line" title="Sem dados"
  description="Não foi possível carregar as estatísticas." />

<div v-else class="space-y-6">
  <!-- Cards de totais -->
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <div v-for="c in cards(stats)" :key="c.label"
      class="rounded-xl bg-surface-raised border border-line shadow-soft surface-gradient p-4">
      <div class="flex items-center justify-between">
        <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">{{ c.label }}</p>
        <i :class="[c.icon, c.cls, 'text-sm']"></i>
      </div>
      <p class="text-2xl font-bold text-ink mt-2">{{ c.value }}</p>
      <p class="text-micro text-ink-subtle mt-0.5">{{ c.sub }}</p>
    </div>
  </div>

  <!-- Compartilhamentos -->
  <div class="rounded-xl bg-surface-raised border border-line shadow-soft p-4">
    <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-3">
      Compartilhamentos
    </p>
    <div class="flex flex-wrap gap-x-8 gap-y-2 text-sm">
      <span class="text-ink-muted">Pendentes: <strong class="text-ink">{{ stats.shares.pending }}</strong></span>
      <span class="text-ink-muted">Aceitos: <strong class="text-data-pos">{{ stats.shares.accepted }}</strong></span>
      <span class="text-ink-muted">Recusados: <strong class="text-ink">{{ stats.shares.declined }}</strong></span>
      <span class="text-ink-muted">Expirados: <strong class="text-ink">{{ stats.shares.expired }}</strong></span>
    </div>
  </div>

  <!-- Por usuário -->
  <div class="rounded-xl bg-surface-raised border border-line shadow-soft overflow-hidden">
    <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle px-4 pt-4 pb-2">
      Alertas por usuário
    </p>
    <div v-if="!stats.perUser.length" class="px-4 py-6 text-center text-xs text-ink-muted">
      Nenhum usuário com alertas ainda.
    </div>
    <!-- Celular: cartao. Seis colunas num telefone nao se le, e a regra
         do sistema e que toda tabela tenha plano mobile. -->
    <ul v-else class="sm:hidden divide-y divide-line">
      <li v-for="u in stats.perUser" :key="u.user_id" class="px-4 py-3">
        <p class="font-medium text-ink">{{ u.username }}</p>
        <p v-if="u.email" class="text-micro text-ink-subtle">{{ u.email }}</p>
        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
          <span><span class="text-ink-subtle">alertas</span>
            <strong class="text-ink font-mono tabular-nums ml-1">{{ u.rulesCount }}</strong></span>
          <span><span class="text-ink-subtle">ativos</span>
            <strong class="text-ink font-mono tabular-nums ml-1">{{ u.enabledCount }}</strong></span>
          <span><span class="text-ink-subtle">disparos</span>
            <strong class="text-ink font-mono tabular-nums ml-1">{{ u.triggersTotal }}</strong></span>
          <span><span class="text-ink-subtle">7 dias</span>
            <strong class="text-ink font-mono tabular-nums ml-1">{{ u.triggers7d }}</strong></span>
        </div>
        <p class="mt-1 text-micro text-ink-subtle">último disparo: {{ fmtDate(u.lastTriggeredAt) }}</p>
      </li>
    </ul>

    <table v-if="stats.perUser.length" class="hidden sm:table w-full text-sm">
      <thead>
        <tr class="text-left text-micro font-mono uppercase tracking-wider text-ink-subtle border-y border-line bg-surface-sunken/40">
          <th class="px-4 py-2 font-medium">Usuário</th>
          <th class="px-3 py-2 font-medium text-center">Alertas</th>
          <th class="px-3 py-2 font-medium text-center">Ativos</th>
          <th class="px-3 py-2 font-medium text-center">Disparos</th>
          <th class="px-3 py-2 font-medium text-center">7 dias</th>
          <th class="px-4 py-2 font-medium">Último disparo</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in stats.perUser" :key="u.user_id"
          class="border-b border-line last:border-0 hover:bg-surface-sunken/40 transition-colors">
          <td class="px-4 py-2.5">
            <span class="font-medium text-ink">{{ u.username }}</span>
            <span v-if="u.email" class="block text-micro text-ink-subtle">{{ u.email }}</span>
          </td>
          <td class="px-3 py-2.5 text-center font-mono text-ink">{{ u.rulesCount }}</td>
          <td class="px-3 py-2.5 text-center font-mono text-ink-muted">{{ u.enabledCount }}</td>
          <td class="px-3 py-2.5 text-center font-mono text-ink">{{ u.triggersTotal }}</td>
          <td class="px-3 py-2.5 text-center font-mono text-ink-muted">{{ u.triggers7d }}</td>
          <td class="px-4 py-2.5 text-ink-muted text-xs">{{ fmtDate(u.lastTriggeredAt) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
  </div>
</template>
