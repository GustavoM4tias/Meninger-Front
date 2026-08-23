<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
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
  if (!store.config.has_access_token) return { label: 'Sem token', cls: 'text-data-warn bg-data-warn/10 border-data-warn/20' };
  if (store.config.dry_run) return { label: 'Modo simulação', cls: 'text-data-warn bg-data-warn/10 border-data-warn/20' };
  if (store.config.active && store.config.last_health_ok) return { label: 'Conectado', cls: 'text-data-pos bg-data-pos/10 border-data-pos/20' };
  if (store.config.active) return { label: 'Ativo (sem health)', cls: 'text-accent bg-accent/10 border-accent/20' };
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
        <PageHelp
          storage-key="whatsapp"
          title="Como funciona o WhatsApp"
          intro="Esta tela liga o Office a uma conta WhatsApp Business. É por ela que saem cobranças, alertas e o Eme Atende — todos pelo mesmo número."
          :steps="[
            { title: 'Configure a conta', text: 'Credenciais e número. Enquanto não estiver conectado, nenhum envio por WhatsApp acontece.' },
            { title: 'Aprove os templates', text: 'A Meta exige template aprovado para mensagem iniciada pela empresa. Template pendente não envia, e isso não é erro do Office.' },
            { title: 'Acompanhe o log', text: 'O histórico mostra o que saiu e o que falhou, com o motivo devolvido pela Meta.' },
          ]"
          :tips="[
            'Template reprovado pela Meta costuma ser texto promocional demais: o motivo aparece no log.',
            'O mesmo número atende o Office e o Eme Atende; o roteamento é por remetente.',
          ]" />
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
