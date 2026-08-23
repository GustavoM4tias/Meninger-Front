<script setup>
// /microsoft/teams — Central Microsoft: hub de agenda e reuniões.
//
// Consolida (2026-07-27) as telas que viviam soltas na categoria Microsoft:
//   Agenda (calendário Teams) · Reuniões (Transcrições & IA)
//
// Mesmo padrão da Central Meta (/meta): SegmentedControl + deep-link ?tab= +
// rotas antigas vivas como redirect (preservam a query, então links de
// notificação/favoritos antigos continuam funcionando).
//
// Cada aba é o antigo Index da tela, convertido em panel (sem PageContainer/
// PageHeader próprios). Lazy + KeepAlive: só monta a aba visitada e preserva o
// estado (filtros, período, rascunhos) ao alternar.
//
// As notificações de reunião (≤15 min) e o toast vivem AQUI no hub — visíveis
// de qualquer aba.

import { ref, computed, reactive, watch, onMounted, onUnmounted, provide, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTeamsStore } from '@/stores/Microsoft/teamsStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Button from '@/components/UI/Button.vue';

const AgendaTab   = defineAsyncComponent(() => import('./components/AgendaTab.vue'));
const ReunioesTab = defineAsyncComponent(() => import('@/views/Office/Microsoft/Transcripts/Index.vue'));

const ts = useTeamsStore();
const ms = useMicrosoftStore();
const route = useRoute();
const router = useRouter();

// ── Abas ──────────────────────────────────────────────────────────────────────
const TABS = [
  { value: 'agenda',   label: 'Agenda',   icon: 'fas fa-calendar-days' },
  { value: 'reunioes', label: 'Reuniões', icon: 'fas fa-wand-magic-sparkles' },
];
const VALID_TABS = TABS.map(t => t.value);

const tab = ref(VALID_TABS.includes(route.query.tab) ? route.query.tab : 'agenda');

// Aba ↔ URL nos dois sentidos: trocar aba reflete em ?tab= e navegação interna
// (redirect de rota antiga, link de notificação) troca a aba.
watch(tab, (v) => {
  if (route.query.tab !== v) router.replace({ query: { ...route.query, tab: v } });
});
watch(() => route.query.tab, (v) => {
  if (v && VALID_TABS.includes(v) && v !== tab.value) tab.value = v;
});

// Painéis internos (TodayPanel) podem trocar de aba sem conhecer o router
provide('msSetTab', (v) => { if (VALID_TABS.includes(v)) tab.value = v; });

const PANELS = { agenda: AgendaTab, reunioes: ReunioesTab };
const currentPanel = computed(() => PANELS[tab.value] || AgendaTab);

const SUBTITLES = {
  agenda:   'Calendário e reuniões do Teams: agende, entre com um clique e gerencie séries recorrentes.',
  reunioes: 'Transcrições das reuniões (Teams e presenciais) com relatório de IA por e-mail.',
};
const subtitle = computed(() => SUBTITLES[tab.value] || '');

// ── Calendário: fetch inicial (necessário p/ notificações em qualquer aba) ────
// No celular a visão Semana é inutilizável — Lista vira o padrão.
const isMobile = window.matchMedia('(max-width: 767px)').matches;

onMounted(async () => {
  if (!ms.connected) await ms.fetchStatus();
  if (!ms.connected) return;
  if (isMobile && ts.currentView === 'week') ts.currentView = 'list';
  ts.fetchCurrent();
});

// ── Notificações (reuniões que começam em ≤15 min) — globais ao hub ───────────
const notifications = ref([]);
const dismissedIds = ref(new Set());
let notifTimer = null;

function minutesUntil(dt) {
  if (!dt) return 0;
  return Math.max(0, Math.round((new Date(dt).getTime() - Date.now()) / 60000));
}

function checkNotifications() {
  const upcoming = ts.upcomingEvents;
  for (const ev of upcoming) {
    if (dismissedIds.value.has(ev.id)) continue;
    if (notifications.value.find(n => n.id === ev.id)) continue;
    notifications.value.push({ id: ev.id, event: ev });
  }
  const upcomingIds = new Set(upcoming.map(e => e.id));
  notifications.value = notifications.value.filter(n => upcomingIds.has(n.id));
}

function dismissNotification(id) {
  dismissedIds.value.add(id);
  notifications.value = notifications.value.filter(n => n.id !== id);
}

onMounted(() => {
  checkNotifications();
  notifTimer = setInterval(checkNotifications, 60_000);
});
onUnmounted(() => clearInterval(notifTimer));

watch(() => ts.events, checkNotifications, { deep: false });

watch(() => ts.error, (msg) => {
  if (msg) { showToast(msg, 'error'); ts.error = null; }
});

// ── Toast (global ao hub; painéis emitem via @toast) ──────────────────────────
const toast = reactive({ show: false, message: '', type: 'success' });
let toastTimer = null;

function showToast(message, type = 'success') {
  toast.message = message;
  toast.type = type;
  toast.show = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.show = false; }, 3500);
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="full">

      <!-- Header -->
      <PageHeader
        title="Central Microsoft"
        :subtitle="subtitle"
        icon-img="/icons/ms-teams.svg">
        <template #actions>
          <PageHelp storage-key="central-microsoft" title="Como usar a Central Microsoft"
            intro="Sua agenda do Teams e o registro das reuniões num lugar só."
            :steps="[
              { title: 'Agenda', text: 'Seu calendário do Teams. Toque num horário vazio para agendar, ou num evento para ver detalhes, entrar na reunião, editar ou cancelar.' },
              { title: 'Reuniões recorrentes', text: 'Ao editar ou cancelar uma reunião que se repete, o sistema pergunta se a ação vale só para aquele dia ou para a série toda.' },
              { title: 'Instantânea', text: 'Cria uma reunião Teams na hora, com link pronto para copiar ou enviar por e-mail.' },
              { title: 'Reuniões (transcrições)', text: 'Transcrições das reuniões do Teams e das presenciais (gravadas pelo navegador), com relatório de IA que pode ser enviado por e-mail.' },
            ]"
            :tips="[
              'No celular, a visão Lista é a mais confortável; a visão Dia mostra os horários lado a lado.',
              'O aviso de reunião começando aparece nas duas abas.',
            ]" />
        </template>
      </PageHeader>

      <!-- Sem conta Microsoft conectada -->
      <div v-if="!ms.connected && !ms.loading" class="py-16">
        <EmptyState icon="fab fa-microsoft" size="lg"
          title="Conecte sua conta Microsoft"
          description="A Central Microsoft precisa da sua conta @menin.com.br para mostrar sua agenda e suas reuniões.">
          <template #actions>
            <Button variant="primary" icon="fab fa-microsoft" @click="ms.redirectToLogin()">
              Conectar conta Microsoft
            </Button>
          </template>
        </EmptyState>
      </div>

      <template v-else>
        <!-- Notificações de eventos próximos (visíveis de qualquer aba) -->
        <Transition name="slide">
          <div v-if="notifications.length" class="space-y-2 mb-4">
            <div v-for="notif in notifications" :key="notif.id"
              class="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl
                     bg-data-warn/10 border border-data-warn/30 surface-gradient">
              <div class="flex items-center gap-2.5 min-w-0 flex-1">
                <div class="h-9 w-9 rounded-lg bg-data-warn flex items-center justify-center shrink-0">
                  <i class="fas fa-bell text-white text-sm"></i>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-data-warn truncate">
                    {{ notif.event.subject }}
                  </p>
                  <p class="text-xs text-data-warn">
                    Começa em <span class="font-mono font-bold">{{ minutesUntil(notif.event.start) }}</span> min
                    <span v-if="notif.event.location"> · {{ notif.event.location }}</span>
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <a v-if="notif.event.joinUrl" :href="notif.event.joinUrl" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1.5 px-3 py-2 min-h-10 rounded-lg bg-data-warn hover:bg-data-warn/85 text-white text-xs font-semibold transition-colors">
                  <i class="fas fa-video text-[10px]"></i> Entrar agora
                </a>
                <button @click="dismissNotification(notif.id)"
                  class="h-10 w-10 rounded-lg flex items-center justify-center text-data-warn hover:bg-data-warn/20 transition-colors">
                  <i class="fas fa-xmark text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Abas (o SegmentedControl é scrollável no mobile) -->
        <div class="mb-4">
          <SegmentedControl v-model="tab" :options="TABS" size="sm" />
        </div>

        <KeepAlive>
          <component :is="currentPanel" @toast="showToast" />
        </KeepAlive>
      </template>

    </PageContainer>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.show"
          class="fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl shadow-overlay border text-sm max-w-sm"
          :class="toast.type === 'success'
            ? 'bg-surface-raised border-data-pos/30 text-data-pos'
            : 'bg-surface-raised border-data-neg/30 text-data-neg'">
          <i :class="toast.type === 'success'
            ? 'fas fa-circle-check text-data-pos'
            : 'fas fa-circle-exclamation text-data-neg'" class="text-base shrink-0"></i>
          <span>{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active { transition: opacity 0.2s, transform 0.2s; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(-6px); }

.toast-enter-active { transition: opacity 0.2s, transform 0.2s; }
.toast-leave-active { transition: opacity 0.15s, transform 0.15s; }
.toast-enter-from { opacity: 0; transform: translateY(10px) scale(0.97); }
.toast-leave-to   { opacity: 0; transform: translateY(4px)  scale(0.97); }
</style>
