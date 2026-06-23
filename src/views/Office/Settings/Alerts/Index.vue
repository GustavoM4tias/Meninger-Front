<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAlertStore } from '@/stores/Alerts/alertStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useToast } from 'vue-toastification';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Button from '@/components/UI/Button.vue';
import Switch from '@/components/UI/Switch.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import AlertEditModal from './components/AlertEditModal.vue';
import AlertLogsModal from './components/AlertLogsModal.vue';
import AlertShareModal from './components/AlertShareModal.vue';

const store = useAlertStore();
const auth = useAuthStore();
const toast = useToast();
const router = useRouter();

const editing  = ref(null); // rule sendo editada
const viewLogs = ref(null); // rule cujo histórico está aberto
const sharing  = ref(null); // rule sendo compartilhada
const respondingId = ref(null); // share sendo aceito/recusado

const isAdmin = computed(() => auth.user?.role === 'admin');

onMounted(() => {
  store.fetch();
  store.fetchIncoming();
});

async function onAcceptShare(s) {
  respondingId.value = s.id;
  try { await store.respondShare(s.id, 'accept'); toast.success('Alerta adicionado aos seus.'); }
  catch { toast.error('Falha ao aceitar.'); }
  finally { respondingId.value = null; }
}
async function onDeclineShare(s) {
  respondingId.value = s.id;
  try { await store.respondShare(s.id, 'decline'); toast.success('Convite recusado.'); }
  catch { toast.error('Falha ao recusar.'); }
  finally { respondingId.value = null; }
}

// Abre a Eme com prompt sugerido (FAB escuta o evento e expande + pré-preenche)
function openEmeForCreation() {
  window.dispatchEvent(new CustomEvent('eme:open', {
    detail: { prompt: 'Quero criar um alerta recorrente. Me ajude a configurar.' },
  }));
}

// Abre o editor inline no chat — pede pra Eme abrir esse alerta específico.
function openFullEditor(rule) {
  window.dispatchEvent(new CustomEvent('eme:open', {
    detail: { prompt: `Abre o editor do alerta "${rule.name}" (id ${rule.id}).` },
  }));
}

const formatNext = (cron) => cron || '—';
const formatDate = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';

async function onToggle(rule) {
  try { await store.toggle(rule); }
  catch { toast.error('Falha ao alterar estado.'); }
}

async function onRemove(rule) {
  if (!confirm(`Excluir o alerta "${rule.name}"?`)) return;
  try { await store.remove(rule.id); toast.success('Alerta excluído.'); }
  catch { toast.error('Falha ao excluir.'); }
}

async function onFire(rule) {
  try { await store.fire(rule.id); toast.success('Disparo solicitado.'); }
  catch { toast.error('Falha ao disparar.'); }
}

const channelIcons = (ch = {}) => [
  ch.inapp    && { icon: 'fas fa-bell',           label: 'Sistema',  cls: 'text-accent' },
  ch.email    && { icon: 'fas fa-envelope',       label: 'E-mail',   cls: 'text-sky-500' },
  ch.whatsapp && { icon: 'fa-brands fa-whatsapp', label: 'WhatsApp', cls: 'text-emerald-500' },
].filter(Boolean);
</script>

<template>
  <PageContainer size="xl">
    <PageHeader
      icon="fas fa-bell-concierge"
      title="Alertas"
      subtitle="Notificações automáticas configuradas via Eme. Aqui você gerencia, edita horários e exclui."
      eyebrow="Notificações">
      <template #actions>
        <Button v-if="isAdmin" variant="ghost" icon="fas fa-chart-line"
          @click="router.push('/settings/alerts/admin')">
          Painel admin
        </Button>
        <Button icon="fas fa-wand-magic-sparkles" @click="openEmeForCreation">
          Criar via Eme
        </Button>
      </template>
    </PageHeader>

    <!-- Compartilhados comigo (convites pendentes) -->
    <div v-if="store.incomingShares.length" class="mb-5 space-y-2">
      <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle px-1">
        Compartilhados comigo
      </p>
      <article v-for="s in store.incomingShares" :key="s.id"
        class="flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl
               bg-accent-soft border border-accent/30 shadow-soft">
        <i class="fas fa-share-nodes text-accent text-base shrink-0"></i>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-ink truncate">{{ s.rule?.name || 'Alerta' }}</p>
          <p class="text-xs text-ink-muted truncate">
            de <strong>{{ s.fromUser?.username || 'colega' }}</strong>
            <template v-if="s.recurrence"> · <i class="far fa-clock"></i> {{ s.recurrence }}</template>
            <template v-if="s.note"> · "{{ s.note }}"</template>
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="ghost" :disabled="respondingId === s.id"
            @click="onDeclineShare(s)">Recusar</Button>
          <Button size="sm" icon="fas fa-check" :loading="respondingId === s.id"
            @click="onAcceptShare(s)">Aceitar</Button>
        </div>
      </article>
    </div>

    <div v-if="store.loading" class="py-16 grid place-items-center"><Spinner /></div>

    <EmptyState v-else-if="!store.items.length"
      icon="fas fa-bell-slash" title="Nenhum alerta configurado"
      description="Use a Eme pra criar um alerta — diga o que quer monitorar e em que horário." />

    <div v-else class="space-y-2">
      <article v-for="rule in store.items" :key="rule.id"
        class="group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3
               rounded-xl bg-surface-raised border border-line shadow-soft surface-gradient
               hover:border-accent/30 transition-all">

        <!-- Toggle -->
        <Switch :model-value="rule.enabled" size="sm"
          @update:model-value="() => onToggle(rule)" />

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-sm font-semibold text-ink truncate">{{ rule.name }}</p>
            <span v-if="!rule.enabled"
              class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle px-1.5 py-0.5 rounded bg-surface-sunken border border-line">
              desativado
            </span>
          </div>
          <p class="text-xs text-ink-muted truncate">
            <span class="font-mono">{{ formatNext(rule.cron) }}</span>
            <span class="mx-2">·</span>
            <span>tool: <code class="font-mono">{{ rule.tool_call?.tool || '—' }}</code></span>
            <span v-if="isAdmin && rule.owner" class="mx-2">·</span>
            <span v-if="isAdmin && rule.owner">de <strong>{{ rule.owner.username }}</strong></span>
          </p>
          <p class="text-[11px] text-ink-subtle mt-0.5">
            Disparos: <span class="font-mono">{{ rule.trigger_count }}</span>
            <span class="mx-1">·</span>
            Último: {{ formatDate(rule.last_triggered_at) }}
          </p>
        </div>

        <!-- Channels -->
        <div class="hidden sm:flex items-center gap-2">
          <i v-for="c in channelIcons(rule.channels)" :key="c.label"
            :class="[c.icon, c.cls, 'text-sm']"
            v-tippy="c.label"></i>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-1">
          <Button size="sm" variant="ghost" icon="fas fa-bolt"
            @click="onFire(rule)" v-tippy="'Disparar agora'" />
          <Button size="sm" variant="ghost" icon="fas fa-clock-rotate-left"
            @click="viewLogs = rule" v-tippy="'Histórico'" />
          <Button size="sm" variant="ghost" icon="fas fa-share-nodes"
            @click="sharing = rule" v-tippy="'Compartilhar'" />
          <Button size="sm" variant="ghost" icon="fas fa-sliders"
            @click="openFullEditor(rule)" v-tippy="'Editor avançado'" />
          <Button size="sm" variant="ghost" icon="fas fa-pen"
            @click="editing = rule" v-tippy="'Editar horário/canais (rápido)'" />
          <Button size="sm" variant="ghost" icon="fas fa-trash"
            @click="onRemove(rule)" v-tippy="'Excluir'" />
        </div>
      </article>
    </div>

    <AlertEditModal v-if="editing" :rule="editing"
      @close="editing = null"
      @saved="editing = null; store.fetch()" />

    <AlertLogsModal v-if="viewLogs" :rule="viewLogs"
      @close="viewLogs = null" />

    <AlertShareModal v-if="sharing" :rule="sharing"
      @close="sharing = null"
      @shared="sharing = null" />
  </PageContainer>
</template>
