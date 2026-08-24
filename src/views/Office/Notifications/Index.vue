<script setup>
// Caixa de entrada. A tela É a listagem (mesma receita do Pré-Cadastros).
//
// O card de cada aviso é o MESMO do sino (NotificationItem), só que em `lg`:
// enquanto eram dois arquivos, o ícone e o rótulo do tipo divergiam e 42 dos 47
// tipos apareciam como "Aviso" cinza aqui.
import { onMounted, ref, computed, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import NotificationItem from '@/components/Navigation/components/NotificationItem.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Button from '@/components/UI/Button.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

const store = useNotificationStore();

const tab = ref('all'); // all | unread
const limit = 30;
const offset = ref(0);

// O total da store é o da CONSULTA atual (na aba "Não lidas" ele vira o total de
// não lidas). Guardar o total geral à parte evita o chip de "Todas" encolher
// quando a pessoa alterna de aba.
const totalAll = ref(0);
watch(() => store.total, (v) => { if (tab.value === 'all') totalAll.value = v; });

const tabs = computed(() => [
  { value: 'all',    label: 'Todas',     icon: 'fas fa-list',       count: totalAll.value },
  { value: 'unread', label: 'Não lidas', icon: 'fas fa-circle-dot', count: store.unread },
]);

const items = computed(() => store.notifications.filter(n => (tab.value === 'unread' ? !n.read_at : true)));
// Quanto já foi pedido ao servidor, e não quanto está na tela: marcar um aviso
// como lido tira ele da aba "Não lidas" e faria o botão reaparecer sem ter mais
// página para buscar.
const hasMore = computed(() => (offset.value + limit) < store.total);

// Agrupa por dia. Com 300+ avisos, cabeçalho de data é o que deixa evidente que
// a lista começa no mais recente — a queixa que originou esta tela era
// justamente parecer parada em junho.
const diaLabel = (value) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return 'Sem data';
  const hoje = new Date();
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (dt.toDateString() === hoje.toDateString()) return 'Hoje';
  if (dt.toDateString() === ontem.toDateString()) return 'Ontem';
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const grupos = computed(() => {
  const out = [];
  for (const n of items.value) {
    const label = diaLabel(n.created_at);
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.label === label) ultimo.items.push(n);
    else out.push({ label, items: [n] });
  }
  return out;
});

async function load(reset = true) {
  if (reset) offset.value = 0;
  await store.fetchNotifications({
    unread: tab.value === 'unread',
    limit,
    offset: offset.value,
  });
  if (tab.value === 'all') totalAll.value = store.total;
}

async function loadMore() {
  offset.value += limit;
  await store.fetchNotifications({
    unread: tab.value === 'unread',
    limit,
    offset: offset.value,
    append: true,
  });
}

watch(tab, () => load(true));
onMounted(() => load(true));
</script>

<template>
  <PageContainer size="lg">
    <PageHeader
      icon="fas fa-bell"
      title="Notificações"
      subtitle="Histórico de avisos do sistema, do mais recente para o mais antigo."
      eyebrow="Caixa de entrada">
      <template #actions>
        <PageHelp
          storage-key="caixa-notificacoes"
          title="Como usar a caixa de notificações"
          intro="O histórico do que o sistema te avisou. É consulta: nada aqui dispara ação sozinho."
          :steps="[
            { title: 'Procure o aviso', text: 'As mais recentes primeiro, agrupadas por dia. O que você ainda não abriu fica marcado como novo.' },
            { title: 'Vá para a origem', text: 'O aviso que mostra “Abrir” leva à tela que o gerou, já no registro certo.' },
            { title: 'Limpe o que não serve', text: 'O X remove o aviso da sua caixa. Só da sua: não apaga para mais ninguém.' },
          ]"
          :tips="[
            'Não recebeu algo que esperava? Confira Preferências: o tipo pode estar desligado para você.',
            'O aviso fica no histórico mesmo depois de lido.',
          ]" />
        <RouterLink to="/settings/notifications">
          <Button variant="secondary" size="sm" icon="fas fa-sliders">Preferências</Button>
        </RouterLink>
        <Button v-if="store.unread > 0" variant="secondary" size="sm"
          icon="fas fa-check-double" @click="store.markAllRead()">
          Marcar tudo
        </Button>
      </template>
    </PageHeader>

    <div class="mb-4">
      <SegmentedControl v-model="tab" :options="tabs" size="sm" />
    </div>

    <Skeleton v-if="store.loading && !items.length" variant="row" :lines="5" />

    <div v-else-if="!items.length" class="py-16 text-center">
      <div class="w-12 h-12 rounded-2xl bg-surface-sunken border border-line grid place-items-center mx-auto mb-3">
        <i class="far fa-bell-slash text-ink-subtle"></i>
      </div>
      <p class="text-sm text-ink-muted">
        {{ tab === 'unread' ? 'Sem notificações não lidas' : 'Sem notificações' }}
      </p>
    </div>

    <div v-else class="space-y-6">
      <section v-for="grupo in grupos" :key="grupo.label">
        <h2 class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-2 sticky top-14 z-10
                   bg-surface/90 backdrop-blur py-1">
          {{ grupo.label }}
        </h2>
        <div class="space-y-2">
          <NotificationItem v-for="n in grupo.items" :key="n.id" :notification="n" size="lg" />
        </div>
      </section>

      <div v-if="hasMore" class="pt-1 text-center">
        <Button variant="secondary" size="sm" :loading="store.loading" @click="loadMore">
          Carregar mais
        </Button>
      </div>
    </div>
  </PageContainer>
</template>
