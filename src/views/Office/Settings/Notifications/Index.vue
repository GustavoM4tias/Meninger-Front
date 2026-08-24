<script setup>
// Notificações: UMA tela para "como quero ser avisado".
//
// Eram três itens diferentes no menu para a mesma pergunta: as preferências de
// canal, os alertas que a pessoa mandou a Eme vigiar e o painel de uso dos
// alertas. Alerta é notificação que ela mesma programou - separar isso da tela
// onde ela liga e desliga canal era pedir para ninguém achar nenhum dos dois.
// Medido em 24/08/2026: 1 pessoa em 30 tinha mexido nas preferências, e as 7
// regras de alerta eram de 4 donos.
//
// O painel é a aba de administrador, DENTRO da tela - mesmo padrão do mural.
// Aqui a fonte é `permissionStore.isAdmin` (confirmada pelo servidor) e não o
// authStore: alerta não tem linha em screenCapabilities, é tela livre com um
// extra de admin. Ver o CLAUDE.md do backend.
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import { useAlertStore } from '@/stores/Alerts/alertStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import PreferenciasCanais from './components/PreferenciasCanais.vue';
import MeusAlertas from '@/views/Office/Settings/Alerts/MeusAlertas.vue';
import PainelAlertas from '@/views/Office/Settings/Alerts/Admin/PainelAlertas.vue';

const route = useRoute();
const router = useRouter();
const perm = usePermissionStore();
const alertas = useAlertStore();

const isAdmin = computed(() => perm.isAdmin);

// A aba vive na URL. É o que mantém de pé os links antigos: /settings/alerts e
// /settings/alerts/admin apontam para esta tela e trocam a URL ao montar.
const aba = computed({
  get() {
    const q = String(route.query.tab || '').toLowerCase();
    if (route.path.startsWith('/settings/alerts/admin')) return isAdmin.value ? 'painel' : 'alertas';
    if (route.path.startsWith('/settings/alerts')) return 'alertas';
    if (q === 'painel') return isAdmin.value ? 'painel' : 'preferencias';
    if (q === 'alertas') return 'alertas';
    return 'preferencias';
  },
  set(v) {
    router.replace({
      path: '/settings/notifications',
      query: v === 'preferencias' ? {} : { tab: v },
    });
  },
});

watch(() => route.path, (p) => {
  if (!p.startsWith('/settings/alerts')) return;
  const destino = p.startsWith('/settings/alerts/admin') ? 'painel' : 'alertas';
  router.replace({ path: '/settings/notifications', query: { tab: destino } });
}, { immediate: true });

const abas = computed(() => {
  const lista = [
    { value: 'preferencias', label: 'Preferências', icon: 'fas fa-sliders' },
    { value: 'alertas', label: 'Meus alertas', icon: 'fas fa-tower-broadcast',
      count: alertas.items?.length || undefined },
  ];
  if (isAdmin.value) {
    lista.push({ value: 'painel', label: 'Painel', icon: 'fas fa-chart-line' });
  }
  return lista;
});

const SUBTITULO = {
  preferencias: 'Escolha por onde cada tipo de aviso chega até você.',
  alertas: 'O que você mandou a Eme vigiar, e o horário de cada consulta.',
  painel: 'Visão geral dos alertas do sistema e do uso por pessoa.',
};
</script>

<template>
  <PageContainer size="xl">
    <PageHeader
      icon="fas fa-bell"
      title="Notificações"
      :subtitle="SUBTITULO[aba]"
      :eyebrow="aba === 'painel' ? 'Notificações · Admin' : 'Suas preferências'">
      <template #actions>
        <PageHelp
          storage-key="prefs-notificacao"
          title="Como escolher seus avisos"
          intro="Esta tela é sua: ela decide por onde cada aviso chega até você e o que o sistema vigia no seu lugar. Nada aqui muda o de outra pessoa."
          :steps="[
            { title: 'Preferências', text: 'Cada linha é um tipo de aviso; você liga e desliga canal por canal, no app, e-mail e WhatsApp.' },
            { title: 'Meus alertas', text: 'Alerta é uma pergunta que a Eme repete sozinha no horário marcado e te avisa do resultado. Cria-se pela conversa com ela.' },
            { title: 'Pese o silêncio', text: 'Desligar tudo de um tipo significa não ser avisado nem quando algo depende de você.' },
          ]"
          :tips="[
            'Alguns avisos críticos ignoram a preferência de propósito, para não passarem em branco.',
            'O alerta roda com a SUA alçada: quem recebe uma cópia compartilhada pode ver número diferente do seu.',
          ]" />
      </template>
    </PageHeader>

    <div class="mb-4">
      <SegmentedControl v-model="aba" :options="abas" size="sm" />
    </div>

    <PainelAlertas v-if="aba === 'painel' && isAdmin" />
    <MeusAlertas v-else-if="aba === 'alertas'" />
    <PreferenciasCanais v-else />
  </PageContainer>
</template>
