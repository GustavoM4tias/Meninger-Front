<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useSupportStore } from '@/stores/Support/supportStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useToast } from 'vue-toastification';

import PageContainer from '@/components/UI/PageContainer.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Select from '@/components/UI/Select.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

// ===== TEMA POR STATUS (semântico) =====
const statusTheme = {
  pending: {
    accent: 'text-amber-600 dark:text-amber-400',
    avatar: 'bg-amber-500 text-white',
    badge:  'warning',
    bar:    'from-amber-500/15 to-amber-500/5 border-amber-500/30',
  },
  in_progress: {
    accent: 'text-yellow-600 dark:text-yellow-400',
    avatar: 'bg-yellow-500 text-white',
    badge:  'warning',
    bar:    'from-yellow-500/15 to-yellow-500/5 border-yellow-500/30',
  },
  resolved: {
    accent: 'text-emerald-600 dark:text-emerald-400',
    avatar: 'bg-emerald-500 text-white',
    badge:  'success',
    bar:    'from-emerald-500/15 to-emerald-500/5 border-emerald-500/30',
  },
  closed: {
    accent: 'text-red-600 dark:text-red-400',
    avatar: 'bg-red-500 text-white',
    badge:  'danger',
    bar:    'from-red-500/15 to-red-500/5 border-red-500/30',
  },
};

const themeFor = (status) => statusTheme[status] ?? statusTheme.pending;

const route   = useRoute();
const router  = useRouter();
const toast   = useToast();
const support = useSupportStore();
const auth    = useAuthStore();

const ticket   = computed(() => support.current);
const messages = computed(() => ticket.value?.messages ?? []);
const isAdmin  = computed(() => auth.user?.role === 'admin');

const currentTheme = computed(() => themeFor(ticket.value?.status || 'pending'));

const statusMap = {
  pending:     'Pendente',
  in_progress: 'Em andamento',
  resolved:    'Resolvido',
  closed:      'Fechado',
};

const statusOptions = [
  { value: 'pending',     label: 'Pendente' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'resolved',    label: 'Resolvido' },
  { value: 'closed',      label: 'Fechado' },
];

const nextStatus = ref('pending');
const replyText  = ref('');
const sending    = ref(false);

const priorityVariant = (priority) => {
  const map = {
    critical: 'danger',
    high:     'warning',
    medium:   'warning',
    low:      'success',
  };
  return map[priority] || 'neutral';
};

const formatProblemType = (type) => {
  const map = {
    bug:         'Bug/Erro',
    performance: 'Performance',
    ui:          'Interface/Visual',
    feature:     'Sugestão',
    security:    'Segurança',
    other:       'Outro',
  };
  return map[type] || type;
};

const formatFullDate = (date) => {
  return new Date(date).toLocaleString('pt-BR', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
};

const load = async () => {
  const rawId = route.params.id;
  const id = Number(rawId);
  if (!Number.isInteger(id)) {
    toast.error('ID inválido');
    router.push({ name: 'Suporte' });
    return;
  }
  try {
    await support.fetchTicket(id);
    nextStatus.value = ticket.value?.status || 'pending';
  } catch {
    toast.error('Falha ao carregar ticket');
    router.push({ name: 'Suporte' });
  }
};

onMounted(load);

const sendReply = async () => {
  if (!isAdmin.value) {
    toast.warning('Apenas administradores podem responder.');
    return;
  }
  try {
    sending.value = true;
    await support.reply(ticket.value.id, replyText.value);
    replyText.value = '';
    toast.success('Resposta enviada e e-mail encaminhado ao solicitante.');
  } catch (e) {
    toast.error(e.message || 'Falha ao enviar resposta');
  } finally {
    sending.value = false;
  }
};

const changeStatus = async () => {
  try {
    await support.updateStatus(ticket.value.id, nextStatus.value);
    toast.success('Status atualizado (o solicitante será notificado).');
  } catch (e) {
    toast.error(e.message || 'Falha ao atualizar status');
  }
};
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <!-- Back Button -->
      <RouterLink :to="{ name: 'Suporte' }"
        class="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink mb-5 transition-colors">
        <i class="fas fa-arrow-left text-xs"></i>
        <span>Voltar para lista</span>
      </RouterLink>

      <div v-if="ticket" class="space-y-5">

        <!-- Header Card -->
        <Surface variant="raised" padding="none" class="overflow-hidden surface-gradient">
          <!-- Status bar -->
          <div class="px-5 sm:px-6 py-4 border-b bg-gradient-to-r"
            :class="currentTheme.bar">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-3 mb-2 flex-wrap">
                  <span class="text-sm font-mono text-ink-muted">#{{ ticket.protocol }}</span>
                  <Badge :variant="priorityVariant(ticket.priority)" size="sm" class="capitalize">
                    {{ ticket.priority }}
                  </Badge>
                  <Badge :variant="currentTheme.badge" size="sm">
                    {{ statusMap[ticket.status] || ticket.status }}
                  </Badge>
                </div>
                <h1 class="text-xl sm:text-2xl font-semibold text-ink mb-2">{{ ticket.title }}</h1>
                <div class="flex items-center gap-x-4 gap-y-1 text-xs text-ink-muted flex-wrap">
                  <div class="flex items-center gap-1.5">
                    <i class="fas fa-user text-ink-subtle"></i>
                    <span>{{ ticket.requester?.username }}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <i class="fas fa-envelope text-ink-subtle"></i>
                    <span>{{ ticket.requester?.email }}</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <i class="fas fa-clock text-ink-subtle"></i>
                    <span>{{ formatFullDate(ticket.created_at) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Info Grid -->
          <div class="p-5 sm:p-6">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div>
                <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                  Status
                </label>

                <!-- Admin: seletor + botão -->
                <div v-if="isAdmin" class="flex items-center gap-2">
                  <Select
                    v-model="nextStatus"
                    :options="statusOptions"
                    size="sm" />
                  <Button v-if="nextStatus !== ticket.status"
                    variant="primary"
                    size="sm"
                    icon="fas fa-check"
                    @click="changeStatus" />
                </div>

                <!-- Viewer: badge -->
                <Badge v-else :variant="currentTheme.badge" size="md">
                  {{ statusMap[ticket.status] || ticket.status }}
                </Badge>
              </div>

              <div v-if="ticket.module">
                <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                  Módulo
                </label>
                <p class="text-sm font-medium text-ink capitalize">{{ ticket.module }}</p>
              </div>

              <div v-if="ticket.problemType">
                <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                  Tipo
                </label>
                <p class="text-sm font-medium text-ink">{{ formatProblemType(ticket.problemType) }}</p>
              </div>

              <div v-if="ticket.browser || ticket.os">
                <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                  Ambiente
                </label>
                <p class="text-sm text-ink-muted">
                  {{ ticket.browser || 'N/A' }} · {{ ticket.os || 'N/A' }}
                </p>
              </div>
            </div>
          </div>
        </Surface>

        <!-- Description Card -->
        <Surface v-if="ticket.description" variant="raised" padding="md" class="surface-gradient">
          <h2 class="text-base font-semibold text-ink mb-3 flex items-center gap-2">
            <i class="fas fa-file-lines" :class="currentTheme.accent"></i>
            Descrição do Problema
          </h2>
          <pre class="whitespace-pre-wrap text-sm text-ink-muted font-sans leading-relaxed">{{ ticket.description }}</pre>

          <div v-if="ticket.stepsToReproduce" class="mt-5 pt-5 border-t border-line">
            <h3 class="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
              <i class="fas fa-list-ol text-ink-subtle text-xs"></i>
              Passos para Reproduzir
            </h3>
            <pre class="whitespace-pre-wrap text-sm text-ink-muted font-sans leading-relaxed">{{ ticket.stepsToReproduce }}</pre>
          </div>

          <div v-if="ticket.pageUrl" class="mt-4 pt-4 border-t border-line">
            <h3 class="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
              <i class="fas fa-link text-ink-subtle text-xs"></i>
              URL da Página
            </h3>
            <a :href="ticket.pageUrl" target="_blank"
              class="text-sm text-accent hover:underline break-all">
              {{ ticket.pageUrl }}
            </a>
          </div>
        </Surface>

        <!-- Messages Thread -->
        <Surface variant="raised" padding="none" class="overflow-hidden surface-gradient">
          <div class="px-5 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40">
            <h2 class="text-base font-semibold text-ink flex items-center gap-2">
              <i class="fas fa-comments" :class="currentTheme.accent"></i>
              Conversas
              <span class="text-xs font-normal text-ink-subtle font-mono tabular-nums">({{ messages.length }})</span>
            </h2>
          </div>

          <div class="p-5 sm:p-6">
            <div v-if="messages.length" class="space-y-3">
              <div v-for="m in messages" :key="m.id"
                class="flex gap-3 sm:gap-4 p-4 rounded-xl border border-line bg-surface-sunken/40">
                <div class="shrink-0">
                  <div class="w-10 h-10 rounded-full grid place-items-center font-semibold text-sm"
                    :class="currentTheme.avatar">
                    {{ (m.author_name || 'U')[0].toUpperCase() }}
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-3 mb-2 flex-wrap">
                    <div class="min-w-0">
                      <p class="font-semibold text-ink text-sm">
                        {{ m.author_name || 'Usuário' }}
                      </p>
                      <p v-if="m.author_email" class="text-xs text-ink-subtle">
                        {{ m.author_email }}
                      </p>
                    </div>
                    <span class="text-xs text-ink-subtle whitespace-nowrap">
                      {{ formatFullDate(m.created_at) }}
                    </span>
                  </div>
                  <pre class="whitespace-pre-wrap text-sm text-ink-muted font-sans leading-relaxed">{{ m.body }}</pre>
                  <div v-if="m.attachments?.length"
                    class="mt-3 flex items-center gap-2 text-xs text-ink-subtle">
                    <i class="fas fa-paperclip"></i>
                    <span><span class="font-mono tabular-nums">{{ m.attachments.length }}</span> anexo(s)</span>
                  </div>
                </div>
              </div>
            </div>

            <EmptyState v-else
              icon="fas fa-comment-slash"
              title="Sem mensagens"
              description="Nenhuma mensagem registrada neste ticket ainda." />
          </div>
        </Surface>

        <!-- Reply Form (Admin Only) -->
        <Surface v-if="isAdmin" variant="raised" padding="none" class="overflow-hidden surface-gradient">
          <div class="px-5 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40">
            <h2 class="text-base font-semibold text-ink flex items-center gap-2">
              <i class="fas fa-reply" :class="currentTheme.accent"></i>
              Responder ao Solicitante
            </h2>
          </div>

          <div class="p-5 sm:p-6">
            <textarea v-model="replyText" rows="5"
              placeholder="Digite sua resposta detalhada para o usuário..."
              class="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-raised text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-accent-ring/40 focus:border-accent transition-colors resize-none">
            </textarea>

            <div class="mt-4 flex items-center justify-between flex-wrap gap-3">
              <p class="text-xs text-ink-subtle flex items-center gap-1.5">
                <i class="fas fa-circle-info"></i>
                O usuário receberá um e-mail com esta resposta
              </p>
              <Button
                variant="primary"
                icon="fas fa-paper-plane"
                :loading="sending"
                :disabled="!replyText.trim() || sending"
                @click="sendReply">
                {{ sending ? 'Enviando...' : 'Enviar Resposta' }}
              </Button>
            </div>
          </div>
        </Surface>
      </div>

      <!-- Empty -->
      <Surface v-else variant="raised" padding="lg" class="text-center surface-gradient">
        <i class="fas fa-circle-exclamation text-4xl text-ink-subtle mb-3 block"></i>
        <h2 class="text-lg font-semibold text-ink mb-1">Ticket não encontrado</h2>
        <p class="text-sm text-ink-muted mb-5">O ticket solicitado não existe ou foi removido.</p>
        <RouterLink :to="{ name: 'Suporte' }">
          <Button variant="primary" icon="fas fa-arrow-left">Voltar para lista</Button>
        </RouterLink>
      </Surface>
    </PageContainer>
  </div>
</template>
