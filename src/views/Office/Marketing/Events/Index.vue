<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useEventStore } from '@/stores/Marketing/Event/eventStore';

import EventCard from '@/views/Office/Marketing/Events/components/EventCard.vue';
import EventModal from '@/views/Office/Marketing/Events/components/EventModal.vue';
import AddEventModal from '@/views/Office/Marketing/Events/components/AddEventModal.vue';
import ReportModal from '@/views/Office/Marketing/Events/components/ReportModal.vue';
import Favorite from '@/components/config/Favorite.vue';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const route = useRoute();
const router = useRouter();
const eventStore = useEventStore();

const search = ref('');
const selectedEvent = ref(null);
const addEvent = ref(false);
const showReport = ref(false);
let searchTimer = null;

// ─── Search com debounce + sync com URL ──────────────
function pushSearch(value) {
  router.replace({ query: { search: value || undefined, section: currentSection.value } });
}
watch(search, (v) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => pushSearch(v), 300);
});
watch(() => [route.query.search, route.query.busca],
  ([qSearch, qBusca]) => { search.value = qSearch ?? qBusca ?? ''; },
  { immediate: true }
);

// ─── Filtros ─────────────────────────────────────────
const now = new Date();

const eventsFiltered = computed(() => {
  if (!search.value) return eventStore.events;
  const q = search.value.toLowerCase().trim();
  return eventStore.events.filter(e =>
    e.title?.toLowerCase().includes(q) ||
    e.description?.toLowerCase().includes(q) ||
    e.tags?.some(t => t.toLowerCase().includes(q))
  );
});

const eventsUpcoming = computed(() =>
  eventsFiltered.value
    .filter(e => new Date(e.event_date) >= now)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
);

const eventsFinished = computed(() =>
  eventsFiltered.value
    .filter(e => new Date(e.event_date) < now)
    .sort((a, b) => new Date(b.event_date) - new Date(a.event_date))
);

// ─── Seções ──────────────────────────────────────────
const currentSection = computed(() => route.query.section || 'Geral');

const sections = computed(() => [
  { value: 'Geral',       label: 'Geral',       icon: 'fas fa-th-large',  count: eventsFiltered.value.length },
  { value: 'Próximos',    label: 'Próximos',    icon: 'far fa-calendar',  count: eventsUpcoming.value.length },
  { value: 'Finalizados', label: 'Finalizados', icon: 'fas fa-clock-rotate-left', count: eventsFinished.value.length },
]);

function changeSection(value) {
  router.push({ query: { section: value, search: search.value || undefined } });
}

// ─── Modal handlers ──────────────────────────────────
function openEventModal(event) { selectedEvent.value = event; }
function closeEventModal() { selectedEvent.value = null; eventStore.fetchEvents(); }
function closeAddEventModal() { addEvent.value = false; eventStore.fetchEvents(); }

// ─── Init ────────────────────────────────────────────
onMounted(() => eventStore.fetchEvents());

const hasSearch = computed(() => !!search.value);
const showUpcoming = computed(() =>
  eventsUpcoming.value.length > 0 && (currentSection.value === 'Geral' || currentSection.value === 'Próximos'));
const showFinished = computed(() =>
  eventsFinished.value.length > 0 && (currentSection.value === 'Geral' || currentSection.value === 'Finalizados'));
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="xl">

      <!-- Header -->
      <PageHeader
        title="Eventos"
        subtitle="Descubra e participe dos eventos da empresa."
        icon="far fa-calendar-check">
        <template #title>
          <span>Eventos</span>
          <Favorite :router="'/marketing/events'" :section="currentSection" />
        </template>
        <template #actions>
          <PageHelp storage-key="marketing-events" title="Como usar os Eventos"
            intro="Aqui você descobre, cria e acompanha os eventos da empresa."
            :steps="[
              { title: 'Navegue pelas abas', text: 'Geral mostra tudo; Próximos e Finalizados separam por data.' },
              { title: 'Ver detalhes', text: 'Clique em qualquer card para abrir o evento completo — fotos, local e organizadores.' },
              { title: 'Criar evento', text: 'Use “Novo evento”. Ao escolher o empreendimento, o endereço é preenchido automaticamente.' },
              { title: 'Relatório', text: 'Gere um relatório dos eventos filtrados no botão “Relatório”.' },
            ]"
            :tips="[
              'A busca encontra por título, descrição ou tag.',
              'O selo colorido no card indica quando o evento acontece (Hoje, Amanhã, em X dias).',
            ]" />
          <Button variant="secondary" icon="fas fa-file-export"
            :disabled="!eventsFiltered.length" @click="showReport = true">
            Relatório
          </Button>
          <Button icon="fas fa-plus" @click="addEvent = true">
            Novo evento
          </Button>
        </template>
      </PageHeader>

      <!-- Busca + tabs -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 min-w-0">
        <div class="flex-1 min-w-0 sm:max-w-xl">
          <Input v-model="search" placeholder="Buscar por título, descrição ou tag..."
            iconLeft="fas fa-magnifying-glass" />
        </div>
        <SegmentedControl v-if="!hasSearch" class="w-full sm:w-auto"
          :model-value="currentSection" :options="sections" @change="changeSection" />
      </div>

      <!-- Resultados de busca -->
      <section v-if="hasSearch && eventsFiltered.length > 0" class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-ink-muted">
            <span class="text-accent font-mono">{{ eventsFiltered.length }}</span>
            resultado{{ eventsFiltered.length !== 1 ? 's' : '' }} para
            <span class="text-ink">"{{ search }}"</span>
          </h2>
          <button @click="search = ''" class="text-xs text-accent hover:underline">Limpar busca</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <EventCard v-for="(event, i) in eventsFiltered" :key="event.id" :event="event"
            class="animate-slide-up [animation-fill-mode:backwards]"
            :style="{ animationDelay: Math.min(i, 10) * 35 + 'ms' }"
            @click="openEventModal(event)" />
        </div>
      </section>

      <EmptyState v-else-if="hasSearch" size="lg"
        icon="fas fa-magnifying-glass"
        title="Nenhum resultado encontrado"
        :description="`Nenhum evento corresponde a &quot;${search}&quot;. Tente outras palavras-chave.`">
        <template #actions>
          <Button variant="secondary" @click="search = ''">Limpar busca</Button>
        </template>
      </EmptyState>

      <!-- Conteúdo por seção -->
      <div v-else class="space-y-12">

        <!-- Próximos -->
        <section v-if="showUpcoming">
          <header class="flex items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-2">
              <i class="far fa-calendar text-accent"></i>
              <h2 class="text-base font-semibold text-ink">Próximos eventos</h2>
              <span class="text-xs font-mono text-ink-subtle px-1.5 py-0.5 rounded-md bg-surface-sunken border border-line">
                {{ eventsUpcoming.length }}
              </span>
            </div>
          </header>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <EventCard v-for="(event, i) in eventsUpcoming" :key="event.id" :event="event"
              class="animate-slide-up [animation-fill-mode:backwards]"
              :style="{ animationDelay: Math.min(i, 10) * 35 + 'ms' }"
              @click="openEventModal(event)" />
          </div>
        </section>

        <EmptyState v-else-if="currentSection === 'Próximos'" size="lg"
          icon="far fa-calendar-xmark"
          title="Nenhum evento próximo"
          description="Novos eventos aparecerão aqui quando agendados." />

        <!-- Finalizados -->
        <section v-if="showFinished">
          <header class="flex items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-2">
              <i class="fas fa-clock-rotate-left text-ink-muted"></i>
              <h2 class="text-base font-semibold text-ink">Finalizados</h2>
              <span class="text-xs font-mono text-ink-subtle px-1.5 py-0.5 rounded-md bg-surface-sunken border border-line">
                {{ eventsFinished.length }}
              </span>
            </div>
          </header>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <EventCard v-for="(event, i) in eventsFinished" :key="event.id" :event="event" past
              class="animate-slide-up [animation-fill-mode:backwards]"
              :style="{ animationDelay: Math.min(i, 10) * 35 + 'ms' }"
              @click="openEventModal(event)" />
          </div>
        </section>

        <EmptyState v-else-if="currentSection === 'Finalizados'" size="lg"
          icon="far fa-clock"
          title="Nenhum evento finalizado"
          description="Eventos passados aparecerão aqui." />

        <!-- Estado vazio geral -->
        <EmptyState v-if="!eventsUpcoming.length && !eventsFinished.length && currentSection === 'Geral'"
          size="lg" icon="far fa-calendar-plus"
          title="Nenhum evento cadastrado"
          description="Crie o primeiro evento para começar.">
          <template #actions>
            <Button icon="fas fa-plus" @click="addEvent = true">Novo evento</Button>
          </template>
        </EmptyState>
      </div>
    </PageContainer>

    <!-- Modais -->
    <EventModal v-if="selectedEvent" :event="selectedEvent" @close="closeEventModal" />
    <AddEventModal v-if="addEvent" @close="closeAddEventModal" />
    <ReportModal v-if="showReport" :events="eventsFiltered" @close="showReport = false" />

    <!-- Toast de erro flutuante -->
    <transition
      enter-active-class="transition ease-out-expo duration-300"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0">
      <div v-if="eventStore.errorMessage"
        class="fixed bottom-5 left-5 z-50 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20
               text-red-700 dark:text-red-300 text-sm shadow-elevated backdrop-blur flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>
        {{ eventStore.errorMessage }}
      </div>
    </transition>
  </div>
</template>
