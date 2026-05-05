<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">
      <PageHeader
        subtitle="Gerencie e acompanhe todos os tickets do sistema"
        icon="fas fa-headset">
        <template #title>Tickets de Suporte</template>
        <template #actions>
          <RouterLink :to="{ name: 'Reportar' }">
            <Button variant="primary" icon="fas fa-plus">Novo Chamado</Button>
          </RouterLink>
        </template>
      </PageHeader>

      <!-- Tabs/Filters -->
      <div class="mb-6">
        <SegmentedControl
          v-model="active"
          :options="tabOptions"
          size="md" />
      </div>

      <!-- Tickets List -->
      <div class="grid gap-4">
        <Surface v-for="t in filtered" :key="t.id"
          variant="raised"
          padding="none"
          class="border-l-4 hover:shadow-md transition-all overflow-hidden surface-gradient"
          :class="borderClass(t.status)">
          <div class="p-5 sm:p-6">
            <div class="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-3 mb-2 flex-wrap">
                  <span class="text-sm font-mono text-ink-muted">
                    #{{ t.protocol }}
                  </span>
                  <Badge :variant="priorityVariant(t.priority)" size="sm" class="capitalize">
                    {{ t.priority }}
                  </Badge>
                  <Badge :variant="statusVariant(t.status)" size="sm">
                    {{ statusMap[t.status] || t.status }}
                  </Badge>
                </div>
                <h3 class="text-lg font-semibold text-ink mb-1">
                  {{ t.title }}
                </h3>
                <p v-if="t.description" class="text-sm text-ink-muted line-clamp-2">
                  {{ t.description }}
                </p>
              </div>

              <RouterLink :to="{ name: 'Detalhes Suporte', params: { id: t.id } }">
                <Button variant="secondary" size="sm" icon-right="fas fa-arrow-right">
                  Ver Detalhes
                </Button>
              </RouterLink>
            </div>

            <!-- Meta Info -->
            <div class="flex items-center gap-4 sm:gap-6 text-xs text-ink-muted flex-wrap">
              <div class="flex items-center gap-2">
                <i class="fas fa-user text-ink-subtle"></i>
                <span>{{ t.requester?.username || 'Usuário' }}</span>
              </div>
              <div v-if="t.module" class="flex items-center gap-2">
                <i class="fas fa-cube text-ink-subtle"></i>
                <span class="capitalize">{{ t.module }}</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="fas fa-clock text-ink-subtle"></i>
                <span>{{ formatDate(t.created_at) }}</span>
              </div>
              <div v-if="t.messages_count > 0" class="flex items-center gap-2">
                <i class="fas fa-comments text-ink-subtle"></i>
                <span><span class="font-mono tabular-nums">{{ t.messages_count }}</span> mensagens</span>
              </div>
            </div>
          </div>
        </Surface>

        <!-- Empty State -->
        <EmptyState v-if="!filtered.length"
          icon="fas fa-inbox"
          title="Nenhum chamado encontrado"
          :description="`Não há chamados com status “${tabs.find(t => t.key === active)?.label}” no momento.`" />
      </div>
    </PageContainer>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useSupportStore } from '@/stores/Support/supportStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const support = useSupportStore();
const active = ref('pending');

const tabs = [
  { key: 'pending',     label: 'Pendentes',    icon: 'fas fa-circle-half-stroke' },
  { key: 'in_progress', label: 'Em Andamento', icon: 'fas fa-spinner' },
  { key: 'resolved',    label: 'Resolvidos',   icon: 'fas fa-circle-check' },
  { key: 'closed',      label: 'Fechados',     icon: 'fas fa-lock' },
];

const counts = computed(() => support.counts || {});

const tabOptions = computed(() =>
  tabs.map(t => ({
    value: t.key,
    label: t.label,
    icon: t.icon,
    count: counts.value[t.key] || 0,
  }))
);

const statusMap = {
  pending:     'Pendente',
  in_progress: 'Em andamento',
  resolved:    'Resolvido',
  closed:      'Fechado',
};

const filtered = computed(() => support.list.filter(t => t.status === active.value));

const priorityVariant = (priority) => {
  const map = {
    critical: 'danger',
    high:     'warning',
    medium:   'warning',
    low:      'success',
  };
  return map[priority] || 'neutral';
};

const statusVariant = (status) => {
  const map = {
    pending:     'warning',
    in_progress: 'info',
    resolved:    'success',
    closed:      'danger',
  };
  return map[status] || 'neutral';
};

const borderClass = (status) => {
  const map = {
    pending:     'border-l-amber-400 dark:border-l-amber-500',
    in_progress: 'border-l-yellow-400 dark:border-l-yellow-500',
    resolved:    'border-l-emerald-400 dark:border-l-emerald-500',
    closed:      'border-l-red-400 dark:border-l-red-500',
  };
  return map[status] || 'border-l-line';
};

const formatDate = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return 'Agora mesmo';
  if (hours < 24) return `Há ${hours}h`;
  if (hours < 48) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

onMounted(async () => {
  await Promise.all([
    support.fetchCounts(),
    support.fetchTickets({ status: active.value }),
  ]);
});

watch(active, async (st) => {
  await support.fetchTickets({ status: st });
});
</script>
