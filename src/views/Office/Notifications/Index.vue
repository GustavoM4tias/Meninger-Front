<script setup>
// Avisos e notificações: UMA tela para o assunto inteiro.
//
// Eram cinco telas e quatro itens de menu - mural, gestão do mural, caixa de
// notificações, preferências e painel de alertas -, com dois sinos na barra de
// cima e dois itens de menu com "notificações" no nome. Tudo isso responde a uma
// pergunta só: o que me avisaram, e como quero ser avisado.
//
// Cinco portas chegam aqui, e cada uma abre na seção certa:
//
//   /notifications             caixa
//   /mural                     caixa recortada na origem mural
//   /mural/admin               comunicados (gestão)
//   /settings/alerts           alertas
//   /settings/alerts/admin     painel de alertas
//   /settings/notifications    preferências
//
// Nenhuma rota morreu: elas são o nome que a empresa conhece, o alvo dos links
// já espalhados (card flutuante, notificação de comunicado, botão do editor de
// alertas da Eme) e o que as alçadas nomeiam.
//
// As seções condicionais seguem cada uma a sua regra, e as duas são COSMÉTICAS -
// quem barra de verdade é o backend:
//   Comunicados → useCan('/mural/admin'), porque a tela tem capacidades
//   Painel      → permissionStore.isAdmin, porque alerta não tem capacidade
// (a regra de escolha está no CLAUDE.md do backend, item 2c).
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCan } from '@/composables/useCan';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Button from '@/components/UI/Button.vue';
import CaixaEntrada from './components/CaixaEntrada.vue';
import MuralGestao from '@/views/Office/Mural/components/MuralGestao.vue';
import MeusAlertas from '@/views/Office/Settings/Alerts/MeusAlertas.vue';
import PainelAlertas from '@/views/Office/Settings/Alerts/Admin/PainelAlertas.vue';
import PreferenciasCanais from '@/views/Office/Settings/Notifications/components/PreferenciasCanais.vue';

const route = useRoute();
const router = useRouter();
const perm = usePermissionStore();
const can = useCan('/mural/admin');
const store = useNotificationStore();

const isAdmin = computed(() => perm.isAdmin);
const podeGerirMural = computed(() => can('view') || can('manage'));

// Qual seção a URL pede. A rota manda; a query é para quem troca de seção aqui.
function secaoDaRota() {
  const p = route.path;
  const q = String(route.query.secao || '').toLowerCase();
  if (p.startsWith('/mural/admin')) return 'comunicados';
  if (p.startsWith('/settings/alerts/admin')) return 'painel';
  if (p.startsWith('/settings/alerts')) return 'alertas';
  if (p.startsWith('/settings/notifications')) return 'preferencias';
  return q || 'caixa';
}

const secao = ref(secaoDaRota());
watch(() => route.fullPath, () => { secao.value = secaoDaRota(); });

// Trocar de seção não inventa rota nova: fica tudo em /notifications?secao=…
function irPara(v) {
  secao.value = v;
  router.replace({ path: '/notifications', query: v === 'caixa' ? {} : { secao: v } });
}

const secoes = computed(() => {
  const lista = [{ value: 'caixa', label: 'Caixa', icon: 'fas fa-inbox', count: store.unread || undefined }];
  if (podeGerirMural.value) lista.push({ value: 'comunicados', label: 'Comunicados', icon: 'fas fa-bullhorn' });
  lista.push({ value: 'alertas', label: 'Alertas', icon: 'fas fa-tower-broadcast' });
  if (isAdmin.value) lista.push({ value: 'painel', label: 'Painel', icon: 'fas fa-chart-line' });
  lista.push({ value: 'preferencias', label: 'Preferências', icon: 'fas fa-sliders' });
  return lista;
});

// Seção que a pessoa não pode ver cai na caixa: link antigo ou URL colada não
// pode abrir tela vazia.
const secaoValida = computed(() => {
  if (secao.value === 'comunicados' && !podeGerirMural.value) return 'caixa';
  if (secao.value === 'painel' && !isAdmin.value) return 'alertas';
  return secao.value;
});

const CABECALHO = {
  caixa: {
    eyebrow: 'Caixa de entrada',
    title: 'Avisos e notificações',
    subtitle: 'Avisos do sistema, comunicados do mural e seus alertas, do mais recente para o mais antigo.',
  },
  comunicados: {
    eyebrow: 'Mural · Gestão',
    title: 'Comunicados',
    subtitle: 'Escrever, publicar e acompanhar a leitura dos comunicados do mural.',
  },
  alertas: {
    eyebrow: 'Alertas',
    title: 'Meus alertas',
    subtitle: 'O que você mandou a Eme vigiar, e o horário de cada consulta.',
  },
  painel: {
    eyebrow: 'Alertas · Admin',
    title: 'Painel de alertas',
    subtitle: 'Visão geral dos alertas do sistema e do uso por pessoa.',
  },
  preferencias: {
    eyebrow: 'Preferências',
    title: 'Como quero ser avisado',
    subtitle: 'Escolha por onde cada tipo de aviso chega até você.',
  },
};

const cabecalho = computed(() => CABECALHO[secaoValida.value] || CABECALHO.caixa);
</script>

<template>
  <PageContainer size="lg">
    <PageHeader
      icon="fas fa-bell"
      :title="cabecalho.title"
      :subtitle="cabecalho.subtitle"
      :eyebrow="cabecalho.eyebrow">
      <template #actions>
        <PageHelp
          storage-key="avisos-e-notificacoes"
          title="Como usar os avisos"
          intro="Tudo que o sistema te avisa fica aqui, e é aqui também que você escolhe como quer ser avisado."
          :steps="[
            { title: 'Caixa', text: 'Aviso automático, comunicado do mural e o retorno dos seus alertas, na mesma lista. Filtre por origem quando procurar algo específico.' },
            { title: 'Confirme o que é obrigatório', text: 'Comunicado que pede ciência traz o botão no próprio card: confirmar não tira você da lista.' },
            { title: 'Alertas', text: 'Alerta é uma pergunta que a Eme repete sozinha no horário marcado e te avisa do resultado. Cria-se pela conversa com ela.' },
            { title: 'Preferências', text: 'Cada tipo de aviso liga e desliga por canal: no app, e-mail e WhatsApp.' },
          ]"
          :tips="[
            'Alguns avisos críticos ignoram a preferência de propósito, para não passarem em branco.',
            'O que você vê do mural depende do público que quem publicou escolheu.',
          ]" />
        <Button v-if="secaoValida === 'caixa' && store.unread > 0" variant="secondary" size="sm"
          icon="fas fa-check-double" @click="store.markAllRead()">
          <span class="hidden sm:inline">Marcar tudo</span>
        </Button>
      </template>
    </PageHeader>

    <div class="mb-4">
      <SegmentedControl :model-value="secaoValida" :options="secoes" size="sm"
        @update:model-value="irPara" />
    </div>

    <MuralGestao v-if="secaoValida === 'comunicados'" />
    <MeusAlertas v-else-if="secaoValida === 'alertas'" />
    <PainelAlertas v-else-if="secaoValida === 'painel'" />
    <PreferenciasCanais v-else-if="secaoValida === 'preferencias'" />
    <CaixaEntrada v-else />
  </PageContainer>
</template>
