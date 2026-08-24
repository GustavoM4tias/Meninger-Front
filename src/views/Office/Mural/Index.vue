<script setup>
// Mural de avisos: UMA tela, dois papéis.
//
// Eram duas telas com o mesmo nome no menu - "Mural de Avisos" e "Gestão do
// Mural" - e a mesma pessoa transitava entre elas o tempo todo: quem publica
// comunicado também recebe comunicado. Agora a gestão é uma ABA daqui, oferecida
// a quem tem a capacidade da tela.
//
// A permissão continua sendo a do backend: `useCan('/mural/admin')` consulta as
// capacidades que o servidor mandou prontas (lib/screenCapabilities.js). Esconder
// a aba é COSMÉTICO - quem barra de verdade é o requireCapability em cada rota
// da API. Nunca escrever `role === 'admin'` aqui.
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMuralStore } from '@/stores/Mural/muralStore';
import { useCan } from '@/composables/useCan';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Badge from '@/components/UI/Badge.vue';
import MuralAvisos from './components/MuralAvisos.vue';
import MuralGestao from './components/MuralGestao.vue';

const route = useRoute();
const router = useRouter();
const store = useMuralStore();
const can = useCan('/mural/admin');

const podeGerir = computed(() => can('view') || can('manage'));

// A aba vive na URL: /mural?tab=gestao. É o que mantém de pé o link antigo de
// /mural/admin (a rota aponta para cá) e o que deixa a aba de gestão ser
// compartilhada por link.
const aba = computed({
  get() {
    const q = String(route.query.tab || '').toLowerCase();
    const querGestao = q === 'gestao' || route.path.startsWith('/mural/admin');
    return querGestao && podeGerir.value ? 'gestao' : 'avisos';
  },
  set(v) {
    router.replace({ path: '/mural', query: v === 'gestao' ? { tab: 'gestao' } : {} });
  },
});

// Quem chega em /mural/admin cai na tela nova sem perceber, com a aba certa e a
// URL limpa. Sem isto, a rota antiga ficaria com duas verdades na barra.
watch(() => route.path, (p) => {
  if (p.startsWith('/mural/admin')) {
    router.replace({ path: '/mural', query: { tab: 'gestao' } });
  }
}, { immediate: true });

const abas = computed(() => {
  const lista = [
    { value: 'avisos', label: 'Avisos', icon: 'fas fa-bullhorn', count: store.items.length || undefined },
  ];
  if (podeGerir.value) {
    lista.push({ value: 'gestao', label: 'Gestão', icon: 'fas fa-sliders' });
  }
  return lista;
});
</script>

<template>
  <PageContainer size="full">
    <PageHeader
      title="Mural de avisos"
      :subtitle="aba === 'gestao'
        ? 'Escrever, publicar e acompanhar a leitura dos comunicados.'
        : 'Comunicados internos direcionados a você.'"
      icon="fas fa-bullhorn">
      <template #actions>
        <PageHelp
          storage-key="mural"
          title="Como usar o Mural"
          intro="O Mural é o canal de comunicado interno. Em Avisos ficam os que foram endereçados a você; em Gestão, para quem tem a alçada, é onde eles são escritos e publicados."
          :steps="[
            { title: 'Resolva o que espera por você', text: 'Comunicado que pede confirmação aparece separado, no topo. Confirmar registra o seu nome e a data.' },
            { title: 'Leia o resto', text: 'Abaixo ficam os demais comunicados ativos, do mais recente para o mais antigo.' },
            { title: 'Publicando (aba Gestão)', text: 'Escreva, escolha o público e publique. Publicar dispara a notificação; antes disso é rascunho e ninguém vê.' },
          ]"
          :tips="[
            'O que aparece depende do público que quem publicou escolheu, então dois colegas veem murais diferentes.',
            'Os comunicados também chegam na sua caixa de notificações, e a confirmação pode ser dada de lá.',
          ]" />
        <Badge v-if="store.hasPending && aba === 'avisos'" variant="warning" size="md">
          <i class="fas fa-clock"></i>
          {{ store.pending }} pendente{{ store.pending > 1 ? 's' : '' }}
        </Badge>
      </template>
    </PageHeader>

    <div v-if="podeGerir" class="mb-4">
      <SegmentedControl v-model="aba" :options="abas" size="sm" />
    </div>

    <MuralGestao v-if="aba === 'gestao'" />
    <MuralAvisos v-else />
  </PageContainer>
</template>
