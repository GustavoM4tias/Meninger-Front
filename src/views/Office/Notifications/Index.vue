<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';

const store = useNotificationStore();

const tab = ref('all'); // all | unread
const limit = 30;
const offset = ref(0);

const TYPE_META = {
  'event.created':   { icon: 'fas fa-calendar-plus',   accent: 'text-emerald-500',  label: 'Evento' },
  'event.reminder':  { icon: 'fas fa-bell',            accent: 'text-amber-500',    label: 'Lembrete' },
  'support.opened':  { icon: 'fas fa-life-ring',       accent: 'text-sky-500',      label: 'Suporte' },
  'support.updated': { icon: 'fas fa-comments',        accent: 'text-sky-500',      label: 'Suporte' },
  'generic':         { icon: 'fas fa-circle-info',     accent: 'text-ink-muted',    label: 'Aviso' },
};
const metaOf = (t) => TYPE_META[t] || TYPE_META.generic;

const tabs = computed(() => [
  { value: 'all',    label: 'Todas',     icon: 'fas fa-list',          count: store.total },
  { value: 'unread', label: 'Não lidas', icon: 'fas fa-circle-dot',    count: store.unread },
]);

const items = computed(() => store.notifications);
const hasMore = computed(() => items.value.length < store.total);

async function load(reset = true) {
  if (reset) offset.value = 0;
  await store.fetchNotifications({
    unread: tab.value === 'unread',
    limit,
    offset: offset.value,
  });
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

const formatFull = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.toLocaleDateString('pt-BR')} • ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

const handleClick = (n) => { if (!n.read_at) store.markRead(n.id); };
const handleRemove = (e, n) => { e.preventDefault(); e.stopPropagation(); store.remove(n.id); };
</script>

<template>
  <PageContainer size="lg">
    <PageHeader
      icon="fas fa-bell"
      title="Notificações"
      subtitle="Histórico de avisos do sistema."
      eyebrow="Caixa de entrada">
      <template #actions>
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

    <div v-if="store.loading && !items.length" class="py-16 grid place-items-center">
      <Spinner />
    </div>

    <div v-else-if="!items.length" class="py-16 text-center">
      <div class="w-12 h-12 rounded-2xl bg-surface-sunken border border-line grid place-items-center mx-auto mb-3">
        <i class="far fa-bell-slash text-ink-subtle"></i>
      </div>
      <p class="text-sm text-ink-muted">
        {{ tab === 'unread' ? 'Sem notificações não lidas' : 'Sem notificações' }}
      </p>
    </div>

    <div v-else class="space-y-2">
      <RouterLink v-for="n in items" :key="n.id" :to="n.link || '#'" @click="handleClick(n)"
        :class="[
          'group relative flex items-stretch gap-3 p-3 rounded-lg border transition-all',
          !n.read_at
            ? 'bg-accent-soft/40 border-accent/20 hover:bg-accent-soft/60'
            : 'bg-surface-raised border-line hover:bg-surface-sunken',
        ]">
        <div v-if="n.data?.image" class="w-14 h-14 rounded-md overflow-hidden shrink-0">
          <img :src="n.data.image" alt="" class="h-full w-full object-cover" />
        </div>
        <div v-else
          class="shrink-0 w-14 h-14 rounded-md grid place-items-center bg-surface-sunken border border-line">
          <i :class="[metaOf(n.type).icon, metaOf(n.type).accent, 'text-base']"></i>
        </div>

        <div class="flex flex-col min-w-0 flex-1 justify-center">
          <div class="flex items-center gap-2">
            <span :class="['text-[10px] font-medium uppercase tracking-wide', metaOf(n.type).accent]">
              {{ metaOf(n.type).label }}
            </span>
            <span v-if="!n.read_at" class="h-1.5 w-1.5 rounded-full bg-accent shrink-0"></span>
          </div>
          <h4 :class="['text-sm', !n.read_at ? 'font-semibold text-ink' : 'font-medium text-ink-muted']">
            {{ n.title }}
          </h4>
          <p v-if="n.body" class="text-xs text-ink-muted line-clamp-2">{{ n.body }}</p>
          <p class="text-[11px] text-ink-subtle mt-0.5">{{ formatFull(n.created_at) }}</p>
        </div>

        <button type="button" @click="(e) => handleRemove(e, n)"
          class="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-md
                 text-ink-subtle opacity-0 group-hover:opacity-100
                 hover:bg-surface-sunken hover:text-red-500 transition-all"
          title="Remover">
          <i class="fas fa-xmark text-[11px]"></i>
        </button>
      </RouterLink>

      <div v-if="hasMore" class="pt-3 text-center">
        <Button variant="secondary" size="sm" :loading="store.loading" @click="loadMore">
          Carregar mais
        </Button>
      </div>
    </div>
  </PageContainer>
</template>
