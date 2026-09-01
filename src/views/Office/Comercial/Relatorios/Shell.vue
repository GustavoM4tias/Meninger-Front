<script setup>
// Casca do Relatório Comercial: cabeçalho + barra de guias + <router-view>.
//
// Cada relatório é uma ROTA PRÓPRIA (/comercial/relatorios/<relatorio>), e não
// uma aba em ?tab=. É o que permite conceder um a um na tela de Alçadas: o
// backend casa alçada por igualdade exata de rota, então guia sem rota própria
// seria tudo-ou-nada.
//
// A barra mostra só as guias que o usuário pode abrir; quem tem um relatório
// só nem vê a barra.
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, onBeforeRouteUpdate } from 'vue-router';

import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Spinner from '@/components/UI/Spinner.vue';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import { RELATORIOS } from './relatorios';

const route = useRoute();
const router = useRouter();
const perm = usePermissionStore();

const guias = computed(() =>
  RELATORIOS.filter((r) => perm.hasAccess(r.route))
    .map((r) => ({ value: r.route, label: r.label, icon: r.icon })));

const atual = computed({
  get: () => route.path,
  set: (path) => { if (path !== route.path) router.push({ path, query: route.query }); },
});

const definicao = computed(() => RELATORIOS.find((r) => r.route === route.path));

// As guias de Faturamento e Vendas × Projeção são as telas inteiras rodando em
// modo embedded — elas trazem o próprio PageContainer.
const trazContainer = computed(() => !!definicao.value?.embedded);

// ── Feedback na troca de guia ────────────────────────────────────────────────
// Cada relatório é um chunk carregado sob demanda. Enquanto o chunk baixa, o
// vue-router segura a navegação e a tela ANTERIOR fica parada: clicar na guia
// parecia não fazer nada por vários segundos. Trocamos o conteúdo por um
// indicador assim que a navegação começa.
const navegando = ref(false);
const destino = ref(null);

onBeforeRouteUpdate((to, from) => {
  // Mudar SÓ a query nao e troca de guia: os filtros chamam router.replace ao
  // aplicar o recorte, e isso passa por aqui. Marcar navegacao nesse caso
  // trocava o relatorio pelo indicador e, como route.path nao muda, o watch
  // abaixo nunca desligava - a tela ficava presa em "Abrindo ..." ate um F5.
  if (to.path === from.path) return;
  destino.value = RELATORIOS.find((r) => r.route === to.path) || null;
  navegando.value = true;
});

// route.path só muda quando a navegação foi confirmada (chunk resolvido).
watch(() => route.path, () => { navegando.value = false; });

const rotuloDestino = computed(() => destino.value?.pageTitle || 'relatório');

// Não pré-carregamos os chunks dos outros relatórios: baixar Faturamento e
// Projeção (que carregam gráficos) em segundo plano competia com a carga da
// tela aberta e deixava a primeira pintura mais lenta. O indicador de "Abrindo
// ..." abaixo cobre a espera do chunk na troca de guia.
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="full">
      <PageHeader :subtitle="definicao?.subtitle || ''" icon="fas fa-chart-column">
        <template #title>
          <span>{{ definicao?.pageTitle || 'Relatório Comercial' }}</span>
          <Favorite :router="route.path" :section="definicao?.label || 'Relatório Comercial'" />
        </template>
        <template #actions>
          <PageHelp
            storage-key="relatorio-comercial"
            title="Como usar os Relatórios Comerciais"
            intro="Todas as leituras de venda no mesmo lugar. Cada relatório é uma tela própria, liberada individualmente na alçada — você pode ver alguns e não ver outros."
            :steps="[
              { title: 'Escolha o relatório', text: 'Faturamento e Vendas × Projeção respondem quanto vendemos. Pré-Cadastros e Reservas mostram por onde a venda passou antes de fechar. Leads, Imobiliárias e Corretores respondem de onde ela veio.' },
              { title: 'Filtre', text: 'Cada relatório tem seu filtro de período, empresa e cidade.' },
              { title: 'Compare', text: 'Nos rankings, a barra de participação mostra o peso de cada um no VGV do período.' },
              { title: 'Veja de onde veio', text: 'Em Imobiliárias e Corretores a barra vem repartida por empreendimento. Clique na linha para abrir a composição ali mesmo; o botão da linha leva às vendas.' },
            ]"
            :tips="[
              'Leads, Imobiliárias e Corretores precisam do detalhamento das vendas (contrato + reserva + lead), que é mais pesado. Filtre por cidade, empresa ou um período menor para acelerar.',
              'Quem aparece nos rankings é quem FECHOU a venda, lido da reserva do CV. O corretor que atendeu o lead pode ser outro — o cartão do selo Lead, no detalhe do Faturamento, mostra os dois lado a lado.',
              'O relatório de Leads considera captação nossa todo lead que não foi cadastrado nos painéis de gestor, corretor ou imobiliária — a mesma régua da tela de Leads.',
              'Pré-Cadastros e Reservas trazem o filtro e as instruções dentro da própria guia - eles não usam o filtro das outras.',
              'Na barra repartida, cada cor é um empreendimento e a mesma cor é sempre o mesmo empreendimento. Acima de oito, os menores entram como Outros, em cinza.',
              'A barra de guias só mostra os relatórios que a sua alçada libera.',
            ]"
          />
        </template>
      </PageHeader>

      <div v-if="guias.length > 1" class="overflow-x-auto -mx-1 px-1">
        <SegmentedControl v-model="atual" :options="guias" size="sm" />
      </div>
    </PageContainer>

    <PageContainer v-if="navegando" size="full" class="!pt-0">
      <div class="py-16 flex flex-col items-center gap-3 text-ink-muted">
        <Spinner size="lg" />
        <p class="text-sm">Abrindo {{ rotuloDestino }}...</p>
      </div>
    </PageContainer>

    <template v-else>
      <router-view v-if="trazContainer" />
      <PageContainer v-else size="full" class="!pt-0">
        <router-view />
      </PageContainer>
    </template>
  </div>
</template>
