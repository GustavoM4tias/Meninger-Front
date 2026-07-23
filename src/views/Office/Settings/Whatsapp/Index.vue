<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

import ConfigPanel from './components/ConfigPanel.vue';
import TemplatesPanel from './components/TemplatesPanel.vue';
import AutomationsPanel from './components/AutomationsPanel.vue';
import MessagesPanel from './components/MessagesPanel.vue';
import StatsPanel from './components/StatsPanel.vue';

const store = useWhatsappStore();
const route = useRoute();
const router = useRouter();

const VALID_TABS = ['config', 'templates', 'automations', 'stats', 'messages'];
const tab = ref(VALID_TABS.includes(route.query.tab) ? route.query.tab : 'config');

// Deep-link por ?tab= — o redirect da rota antiga /tools/whatsapp-automations
// cai aqui em ?tab=automations, e trocar de aba reflete na URL.
watch(tab, (v) => {
  if (route.query.tab !== v) router.replace({ query: { ...route.query, tab: v } });
});

const tabs = computed(() => [
  { value: 'config',      label: 'Configuração', icon: 'fas fa-plug' },
  { value: 'templates',   label: 'Templates',    icon: 'fas fa-file-lines',
    count: store.templates.length || undefined },
  { value: 'automations', label: 'Automações',   icon: 'fas fa-bolt' },
  { value: 'stats',       label: 'Gastos',       icon: 'fas fa-coins' },
  { value: 'messages',    label: 'Mensagens',    icon: 'fas fa-envelope-open-text',
    count: store.messagesTotal || undefined },
]);

onMounted(() => store.fetchConfig());

const statusBadge = computed(() => {
  if (!store.config) return { label: '—', cls: 'text-ink-muted bg-surface-sunken border-line' };
  if (!store.config.has_access_token) return { label: 'Sem token', cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' };
  if (store.config.dry_run) return { label: 'Modo simulação', cls: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' };
  if (store.config.active && store.config.last_health_ok) return { label: 'Conectado', cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  if (store.config.active) return { label: 'Ativo (sem health)', cls: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20' };
  return { label: 'Inativo', cls: 'text-ink-muted bg-surface-sunken border-line' };
});
</script>

<template>
  <PageContainer size="xl">
    <PageHeader
      icon="fa-brands fa-whatsapp"
      title="WhatsApp Business"
      subtitle="Configuração da conta, templates e log de envios."
      eyebrow="Integrações">
      <template #actions>
        <span :class="['inline-flex items-center gap-2 px-3 h-8 rounded-lg border text-xs font-medium', statusBadge.cls]">
          <span class="h-1.5 w-1.5 rounded-full bg-current opacity-75"></span>
          {{ statusBadge.label }}
        </span>
      </template>
    </PageHeader>

    <div class="mb-4">
      <SegmentedControl v-model="tab" :options="tabs" size="sm" />
    </div>

    <ConfigPanel      v-if="tab === 'config'" />
    <TemplatesPanel   v-else-if="tab === 'templates'" />
    <AutomationsPanel v-else-if="tab === 'automations'" />
    <StatsPanel       v-else-if="tab === 'stats'" />
    <MessagesPanel    v-else-if="tab === 'messages'" />
  </PageContainer>
</template>
