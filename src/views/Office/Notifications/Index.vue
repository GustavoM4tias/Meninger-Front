<script setup>
// Caixa de entrada: TUDO que chegou para esta pessoa, em um lugar só.
//
// Eram três caixas. O aviso do sistema ficava aqui; o comunicado do mural, numa
// tela própria que só aparecia quando o card flutuava; o alerta, misturado aos
// avisos sem se identificar. Medido em 24/08/2026: de 36 destinatários de
// comunicado, 13 tinham dado ciência - e o mural passou dois meses sem
// publicação nenhuma, ou seja, invisível no intervalo.
//
// A união é de SUPERFÍCIE, não de motor: comunicado continua com público-alvo e
// trilha de ciência, alerta continua sendo cron + consulta. O que muda é que a
// pessoa lê os três no mesmo lugar, e dá a ciência sem sair da lista.
import { onMounted, ref, computed, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import { useMuralStore } from '@/stores/Mural/muralStore';
import NotificationItem from '@/components/Navigation/components/NotificationItem.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Button from '@/components/UI/Button.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

const store = useNotificationStore();
const mural = useMuralStore();

const tab = ref('all'); // all | unread
const origem = ref('todas');
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

// ─── Origem ─────────────────────────────────────────────────────────────────
// Cada motor deixa a assinatura no próprio aviso, então dá para separar sem
// tocar em nenhum deles: o comunicado vem com tipo `comunicado.*`, e o alerta
// grava `source: 'alert'` no data (ver AlertEngine).
function origemDe(n) {
  if (String(n?.type || '').startsWith('comunicado.')) return 'mural';
  if (n?.data?.source === 'alert') return 'alertas';
  return 'sistema';
}

// Comunicado correspondente a um aviso, quando ele ainda está ativo no mural.
// É o que traz o estado de ciência para dentro do card.
const comunicadoDe = (n) => {
  const id = n?.data?.comunicadoId;
  return id ? mural.items.find(c => Number(c.id) === Number(id)) || null : null;
};

// Comunicado ativo que NÃO tem aviso na lista carregada (publicado antes das
// notificações existirem, aviso apagado, destinatário incluído depois). Sem
// isto, uma pendência de ciência sumiria da caixa.
const comunicadosOrfaos = computed(() => {
  const jaNaLista = new Set(
    store.notifications.map(n => n?.data?.comunicadoId).filter(Boolean).map(Number)
  );
  return (mural.items || [])
    .filter(c => !jaNaLista.has(Number(c.id)))
    .map(c => ({
      id: `com-${c.id}`,
      sintetico: true,
      comunicado: c,
      type: 'comunicado.published',
      title: c.title,
      body: c.body,
      // O comunicado pode apontar para um destino próprio (formulário, artigo);
      // sem ele, a origem é o mural.
      link: c.link || '/mural',
      data: { comunicadoId: c.id, kind: c.kind },
      created_at: c.publishedAt || c.createdAt,
      // Informativo não fica "novo" para sempre: só o que exige ciência e ainda
      // não foi confirmado conta como não lido.
      read_at: c.requiresAck ? (c.acked ? (c.ackedAt || c.publishedAt) : null) : (c.publishedAt || c.createdAt),
    }));
});

const unificados = computed(() => {
  const base = store.notifications.map(n => ({
    ...n,
    sintetico: false,
    comunicado: comunicadoDe(n),
  }));
  const ts = (x) => new Date(x?.created_at || 0).getTime() || 0;
  return [...base, ...comunicadosOrfaos.value].sort((a, b) => ts(b) - ts(a));
});

const porEstado = computed(() => unificados.value.filter(n => (tab.value === 'unread' ? !n.read_at : true)));

const contagemOrigem = computed(() => {
  const c = { todas: 0, sistema: 0, mural: 0, alertas: 0 };
  for (const n of porEstado.value) { c.todas++; c[origemDe(n)]++; }
  return c;
});

const origens = computed(() => [
  { value: 'todas',   label: 'Tudo',     icon: 'fas fa-inbox' },
  { value: 'sistema', label: 'Sistema',  icon: 'fas fa-gear' },
  { value: 'mural',   label: 'Mural',    icon: 'fas fa-thumbtack' },
  { value: 'alertas', label: 'Alertas',  icon: 'fas fa-tower-broadcast' },
].map(o => ({ ...o, count: contagemOrigem.value[o.value] })));

const items = computed(() => (
  origem.value === 'todas'
    ? porEstado.value
    : porEstado.value.filter(n => origemDe(n) === origem.value)
));

// Quanto já foi pedido ao servidor, e não quanto está na tela: marcar um aviso
// como lido tira ele da aba "Não lidas" e faria o botão reaparecer sem ter mais
// página para buscar.
const hasMore = computed(() => (offset.value + limit) < store.total);

// Agrupa por dia. Com 300+ avisos, cabeçalho de data é o que deixa evidente que
// a lista começa no mais recente.
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

// Pendência de ciência dentro do card.
const precisaCiencia = (n) => !!(n.comunicado?.requiresAck && !n.comunicado?.acked);
const confirmando = ref(null);
async function darCiencia(n) {
  const c = n.comunicado;
  if (!c) return;
  confirmando.value = c.id;
  try { await mural.ack(c.id); } finally { confirmando.value = null; }
}

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
onMounted(() => {
  load(true);
  mural.fetchMine();
});
</script>

<template>
  <PageContainer size="lg">
    <PageHeader
      icon="fas fa-bell"
      title="Notificações"
      subtitle="Avisos do sistema, comunicados do mural e seus alertas, do mais recente para o mais antigo."
      eyebrow="Caixa de entrada">
      <template #actions>
        <PageHelp
          storage-key="caixa-notificacoes"
          title="Como usar a caixa de notificações"
          intro="Tudo que o sistema te avisou, num lugar só: aviso automático, comunicado do mural e o retorno dos seus alertas."
          :steps="[
            { title: 'Escolha a origem', text: 'Sistema é o aviso automático. Mural é comunicado da empresa. Alertas é o que você mesmo mandou vigiar.' },
            { title: 'Vá para a origem', text: 'O aviso que mostra “Abrir” leva à tela que o gerou, já no registro certo.' },
            { title: 'Confirme o que é obrigatório', text: 'Comunicado que exige ciência traz o botão aqui mesmo: confirmar não sai da lista.' },
          ]"
          :tips="[
            'Não recebeu algo que esperava? Confira Preferências: o tipo pode estar desligado para você.',
            'Comunicado obrigatório continua cobrando até a ciência, mesmo depois de lido.',
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

    <div class="mb-3">
      <SegmentedControl v-model="tab" :options="tabs" size="sm" />
    </div>

    <!-- Origem: um filtro, não uma aba. A pessoa quase sempre quer "tudo", e
         recorta quando procura algo específico. -->
    <div class="mb-4 flex flex-wrap items-center gap-1.5">
      <button v-for="o in origens" :key="o.value" type="button"
        @click="origem = o.value"
        :class="[
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-micro font-medium transition-colors duration-120',
          origem === o.value
            ? 'bg-accent-soft border-accent/30 text-accent'
            : 'bg-surface-raised border-line text-ink-muted hover:text-ink hover:border-accent/30',
        ]">
        <i :class="[o.icon, 'text-[10px]']"></i>
        {{ o.label }}
        <span class="font-mono opacity-70">{{ o.count }}</span>
      </button>
    </div>

    <Skeleton v-if="store.loading && !items.length" variant="row" :lines="5" />

    <div v-else-if="!items.length" class="py-16 text-center">
      <div class="w-12 h-12 rounded-2xl bg-surface-sunken border border-line grid place-items-center mx-auto mb-3">
        <i class="far fa-bell-slash text-ink-subtle"></i>
      </div>
      <p class="text-sm text-ink-muted">
        {{ tab === 'unread' ? 'Sem notificações não lidas' : 'Sem notificações' }}
        <span v-if="origem !== 'todas'">nesta origem</span>
      </p>
    </div>

    <div v-else class="space-y-6">
      <section v-for="grupo in grupos" :key="grupo.label">
        <h2 class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-2 sticky top-14 z-10
                   bg-surface/90 backdrop-blur py-1">
          {{ grupo.label }}
        </h2>
        <div class="space-y-2">
          <NotificationItem v-for="n in grupo.items" :key="n.id"
            :notification="n" size="lg" :gerenciavel="!n.sintetico">
            <template v-if="precisaCiencia(n)" #acoes>
              <Button size="sm" variant="secondary" icon="fas fa-check"
                :loading="confirmando === n.comunicado.id"
                @click="darCiencia(n)">
                Li e estou ciente
              </Button>
            </template>
          </NotificationItem>
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
