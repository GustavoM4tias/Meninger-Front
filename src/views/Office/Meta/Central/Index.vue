<script setup>
// /meta — Central Meta: hub único de tudo que é Meta + captação de leads.
//
// Consolida (2026-07-23) as 6 telas que viviam soltas em 2 categorias de menu:
//   Captação (inbox) · Campanhas · Vínculos CV · Formulários · Credenciais · Configurações
//
// Mesmo padrão do WhatsApp unificado (/settings/whatsapp): SegmentedControl +
// deep-link ?tab= + rotas antigas vivas como redirect (preservam a query, então
// links de notificação/favoritos antigos continuam funcionando).
//
// Cada aba é o antigo Index da tela, convertido em panel (sem PageContainer/
// PageHeader próprios). Lazy + KeepAlive: só monta a aba visitada e preserva o
// estado (filtros, drill, período) ao alternar.

import { ref, computed, watch, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const CaptacaoPanel    = defineAsyncComponent(() => import('@/views/Office/Marketing/Captacao/Index.vue'));
const CampanhasPanel   = defineAsyncComponent(() => import('@/views/Office/Marketing/Campanhas/Index.vue'));
const VinculosPanel    = defineAsyncComponent(() => import('@/views/Office/Marketing/Vinculos/Index.vue'));
const FormulariosPanel = defineAsyncComponent(() => import('@/views/Office/Marketing/Formularios/Index.vue'));
const CredenciaisPanel = defineAsyncComponent(() => import('./CredenciaisPanel.vue'));
const ConfigPanel      = defineAsyncComponent(() => import('@/views/Office/Marketing/Settings/Index.vue'));

const route = useRoute();
const router = useRouter();

const TABS = [
    { value: 'captacao',    label: 'Captação',      icon: 'fas fa-inbox' },
    { value: 'campanhas',   label: 'Campanhas',     icon: 'fas fa-rectangle-ad' },
    { value: 'vinculos',    label: 'Vínculos CV',   icon: 'fas fa-link' },
    { value: 'formularios', label: 'Formulários',   icon: 'fas fa-rectangle-list' },
    { value: 'credenciais', label: 'Credenciais',   icon: 'fas fa-key' },
    { value: 'config',      label: 'Configurações', icon: 'fas fa-sliders' },
];
const VALID_TABS = TABS.map(t => t.value);

const tab = ref(VALID_TABS.includes(route.query.tab) ? route.query.tab : 'captacao');

// Aba ↔ URL nos dois sentidos: trocar aba reflete em ?tab= e navegação interna
// (redirect de rota antiga, link de notificação) troca a aba.
watch(tab, (v) => {
    if (route.query.tab !== v) router.replace({ query: { ...route.query, tab: v } });
});
watch(() => route.query.tab, (v) => {
    if (v && VALID_TABS.includes(v) && v !== tab.value) tab.value = v;
});

const PANELS = {
    captacao:    CaptacaoPanel,
    campanhas:   CampanhasPanel,
    vinculos:    VinculosPanel,
    formularios: FormulariosPanel,
    credenciais: CredenciaisPanel,
    config:      ConfigPanel,
};
const currentPanel = computed(() => PANELS[tab.value] || CaptacaoPanel);

const SUBTITLES = {
    captacao:    'Inbox dos leads inbound (Meta Lead Ads e formulários do site) até o despacho ao CV CRM.',
    campanhas:   'Desempenho por período: investimento, leads, CAC e artes. Drill campanha → conjunto → anúncio.',
    vinculos:    'Garanta que todo lead captado chega ao CRM. Campanhas sem vínculo represam leads.',
    formularios: 'Formulários internos hospedados (LPs em lp.menin.com.br + embeds em site externo).',
    credenciais: 'Tudo pra conectar a Meta: App, token de campanhas e tokens do Lead Ads. WhatsApp usa o mesmo App.',
    config:      'Regras do pipeline de captação: modo sombra, tentativas de envio, alertas e endpoint do CV.',
};
const subtitle = computed(() => SUBTITLES[tab.value] || '');
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        title="Central Meta"
        :subtitle="subtitle"
        icon="fab fa-meta">
        <template #actions>
          <PageHelp storage-key="central-meta" title="Como usar a Central Meta"
            intro="Tudo da Meta e da captação de leads num lugar só. Cada aba é uma etapa do fluxo: captar, acompanhar, garantir a entrega ao CRM e configurar."
            :steps="[
              { title: 'Captação', text: 'A inbox dos leads recebidos (anúncios Meta e formulários do site). Acompanhe o status de cada lead até chegar ao CV.' },
              { title: 'Campanhas', text: 'Desempenho das campanhas Meta por período: investimento, leads e custo por lead. Clique numa campanha para detalhar.' },
              { title: 'Vínculos CV', text: 'Mostra se todo lead está chegando ao CRM. Campanha sem vínculo represa leads - clique em Vincular para resolver.' },
              { title: 'Formulários', text: 'Crie formulários de captação com página própria (LP) para eventos, outdoors e campanhas.' },
              { title: 'Credenciais e Configurações', text: 'Credenciais: conexões com a Meta (App e tokens). Configurações: regras da captação (modo sombra, alertas).' },
            ]"
            :tips="[
              'Os links antigos (menu, notificações, favoritos) continuam funcionando - eles abrem a aba certa aqui.',
              'O WhatsApp segue em tela própria; só o App da Meta é compartilhado (aba Credenciais).',
            ]" />
        </template>
      </PageHeader>

      <!-- Abas (o SegmentedControl é scrollável no mobile) -->
      <div class="mb-4">
        <SegmentedControl v-model="tab" :options="TABS" size="sm" />
      </div>

      <KeepAlive>
        <component :is="currentPanel" />
      </KeepAlive>

    </PageContainer>
  </div>
</template>
