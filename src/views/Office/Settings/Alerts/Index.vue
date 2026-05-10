<script setup>
import { onMounted, ref, computed } from 'vue';
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

const store = useAlertStore();
const auth = useAuthStore();
const toast = useToast();

const editing  = ref(null); // rule sendo editada
const viewLogs = ref(null); // rule cujo histórico está aberto

const isAdmin = computed(() => auth.user?.role === 'admin');

onMounted(() => store.fetch());

// Abre a Eme com prompt sugerido (FAB escuta o evento e expande + pré-preenche)
function openEmeForCreation() {
  window.dispatchEvent(new CustomEvent('eme:open', {
    detail: { prompt: 'Quero criar um alerta recorrente. Me ajude a configurar.' },
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
        <Button icon="fas fa-wand-magic-sparkles" @click="openEmeForCreation">
          Criar via Eme
        </Button>
      </template>
    </PageHeader>

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
          <Button size="sm" variant="ghost" icon="fas fa-pen"
            @click="editing = rule" v-tippy="'Editar horário/canais'" />
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
  </PageContainer>
</template>
