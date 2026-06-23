<script setup>
// Painel admin de alertas — visão geral (admin-only). Mostra totais e um detalhamento
// por usuário (quantos alertas cada um tem, quantos disparos, último disparo).

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import * as api from '@/utils/Alerts/apiAlerts';
import { useToast } from 'vue-toastification';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const router = useRouter();
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
  { label: 'Usuários com alertas', value: s.totals.users, sub: 'donos de regras', icon: 'fas fa-users', cls: 'text-sky-500' },
  { label: 'Disparos hoje', value: s.totals.triggersToday, sub: `${s.totals.triggers7d} nos últimos 7 dias`, icon: 'fas fa-bolt', cls: 'text-amber-500' },
  { label: 'Disparos no total', value: s.totals.triggersTotal, sub: 'acumulado', icon: 'fas fa-chart-column', cls: 'text-emerald-500' },
];
</script>

<template>
  <PageContainer size="xl">
    <PageHeader
      icon="fas fa-chart-line"
      title="Painel de alertas"
      subtitle="Visão geral de todos os alertas do sistema e do uso por usuário."
      eyebrow="Notificações · Admin">
      <template #actions>
        <Button variant="ghost" icon="fas fa-arrow-left" @click="router.push('/settings/alerts')">
          Voltar
        </Button>
      </template>
    </PageHeader>

    <div v-if="loading" class="py-16 grid place-items-center"><Spinner /></div>

    <EmptyState v-else-if="!stats"
      icon="fas fa-chart-line" title="Sem dados"
      description="Não foi possível carregar as estatísticas." />

    <div v-else class="space-y-6">
      <!-- Cards de totais -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div v-for="c in cards(stats)" :key="c.label"
          class="rounded-xl bg-surface-raised border border-line shadow-soft surface-gradient p-4">
          <div class="flex items-center justify-between">
            <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">{{ c.label }}</p>
            <i :class="[c.icon, c.cls, 'text-sm']"></i>
          </div>
          <p class="text-2xl font-bold text-ink mt-2">{{ c.value }}</p>
          <p class="text-[11px] text-ink-subtle mt-0.5">{{ c.sub }}</p>
        </div>
      </div>

      <!-- Compartilhamentos -->
      <div class="rounded-xl bg-surface-raised border border-line shadow-soft p-4">
        <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-3">
          Compartilhamentos
        </p>
        <div class="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span class="text-ink-muted">Pendentes: <strong class="text-ink">{{ stats.shares.pending }}</strong></span>
          <span class="text-ink-muted">Aceitos: <strong class="text-emerald-600">{{ stats.shares.accepted }}</strong></span>
          <span class="text-ink-muted">Recusados: <strong class="text-ink">{{ stats.shares.declined }}</strong></span>
          <span class="text-ink-muted">Expirados: <strong class="text-ink">{{ stats.shares.expired }}</strong></span>
        </div>
      </div>

      <!-- Por usuário -->
      <div class="rounded-xl bg-surface-raised border border-line shadow-soft overflow-hidden">
        <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle px-4 pt-4 pb-2">
          Alertas por usuário
        </p>
        <div v-if="!stats.perUser.length" class="px-4 py-6 text-center text-xs text-ink-muted">
          Nenhum usuário com alertas ainda.
        </div>
        <table v-else class="w-full text-sm">
          <thead>
            <tr class="text-left text-[11px] font-mono uppercase tracking-wider text-ink-subtle border-y border-line bg-surface-sunken/40">
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
                <span v-if="u.email" class="block text-[11px] text-ink-subtle">{{ u.email }}</span>
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
  </PageContainer>
</template>
