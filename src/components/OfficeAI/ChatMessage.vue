<script setup>
// Balão de mensagem do chat da Eme — ÚNICO renderer das duas superfícies
// (Home.vue e OfficeChatSession.vue via prop `compact`). Antes cada uma tinha
// sua cópia da cadeia de renderers e elas divergiam (warning e action.source
// só funcionavam no flutuante).
import { computed, ref } from 'vue';

import ChatText from './renderers/ChatText.vue';
import ChatTable from './renderers/ChatTable.vue';
import ChatChart from './renderers/ChatChart.vue';
import ChatNavAction from './renderers/ChatNavAction.vue';
import ChatLeadsActions from './renderers/ChatLeadsActions.vue';
import ChatEventsActions from './renderers/ChatEventsActions.vue';
import ChatEnterprisesActions from './renderers/ChatEnterprisesActions.vue';
import ChatEnterpriseDetail from './renderers/ChatEnterpriseDetail.vue';
import ChatMcmvActions from './renderers/ChatMcmvActions.vue';
import ChatPrecadastrosSummary from './renderers/ChatPrecadastrosSummary.vue';
import ChatPrecadastrosActions from './renderers/ChatPrecadastrosActions.vue';
import ChatReservasSummary from './renderers/ChatReservasSummary.vue';
import ChatReservasActions from './renderers/ChatReservasActions.vue';
import ChatAlertEditor from './renderers/ChatAlertEditor.vue';
import ChatAcademyCards from './renderers/ChatAcademyCards.vue';
import ChatImobiliariaCards from './renderers/ChatImobiliariaCards.vue';
import ChatConditionSheet from './renderers/ChatConditionSheet.vue';
import ChatCampaignCards from './renderers/ChatCampaignCards.vue';
import ChatPersonCards from './renderers/ChatPersonCards.vue';
import ChatNotificationPrefs from './renderers/ChatNotificationPrefs.vue';
import ChatReportCards from './renderers/ChatReportCards.vue';
import ChatChecklistCards from './renderers/ChatChecklistCards.vue';
import EmeAgentStatus from './EmeAgentStatus.vue';

const props = defineProps({
  message: { type: Object, required: true },
  streaming: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
});

const emit = defineEmits(['feedback', 'retry', 'storageHelp']);

const action = computed(() => props.message.metadata?.action || null);
const isUser = computed(() => props.message.role === 'user');
const isError = computed(() => props.message.response_type === 'error');
const warning = computed(() => props.message.metadata?.warning || null);

// Detecta o módulo da action olhando em vários lugares (context.source, source
// top-level e tipo) — robusto a variações entre tools.
const actionSource = computed(() => {
  const a = action.value;
  if (!a) return null;
  if (a.context?.source) return a.context.source;
  if (a.source) return a.source;
  if (a.type === 'precadastros_summary') return 'precadastros';
  if (a.type === 'reservas_summary') return 'reservas';
  if (a.type === 'enterprise_detail') return 'enterprises';
  return null;
});

// "O que a Eme fez": passos de tool + tempo total, gravados pelo store no done.
const steps = computed(() => props.message.metadata?.steps || []);
const elapsedSec = computed(() => {
  const ms = props.message.metadata?.elapsed_ms;
  return ms ? Math.round(ms / 1000) : null;
});
const stepsOpen = ref(false);
</script>

<template>
  <!-- USER -->
  <div v-if="isUser" class="flex justify-end">
    <div class="bg-accent text-white rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-soft
                whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
      :class="compact ? 'max-w-[85%] rounded-br-sm' : 'max-w-[85%] sm:max-w-[75%] rounded-br-md'">
      {{ message.content }}
    </div>
  </div>

  <!-- ASSISTANT -->
  <div v-else class="flex items-start" :class="compact ? 'gap-2.5' : 'gap-3'">
    <img src="/Mlogo.png" alt="Eme" class="invert dark:invert-0 shrink-0 mt-0.5"
      :class="compact ? 'h-5' : 'h-6 md:h-7'" />

    <div class="flex-1 min-w-0" :class="compact ? 'space-y-1.5' : 'space-y-2'">
      <!-- Erro com limite de storage -->
      <div v-if="isError && message.metadata?.storageLimit"
        class="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
        <i class="fas fa-database mt-0.5 shrink-0"></i>
        <span>
          Limite de 20 MB atingido.
          <button class="underline ml-1" @click="$emit('storageHelp')">Exclua alguns chats</button> para continuar.
        </span>
      </div>

      <!-- Erro genérico -->
      <span v-else-if="isError" class="text-sm text-ink-muted italic break-words">{{ message.content }}</span>

      <!-- Renderers -->
      <template v-else>
        <!-- Timeline do agente (só durante o streaming) -->
        <EmeAgentStatus v-if="streaming" :compact="compact" />

        <ChatNavAction v-if="action?.type === 'navigate'" :action="action" />
        <ChatText v-if="message.content" :content="message.content" :streaming="streaming" />

        <!-- Resposta interrompida (cancelamento/timeout preservou o parcial) -->
        <p v-if="message.metadata?.interrupted"
          class="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <i class="fas fa-triangle-exclamation"></i>
          Resposta interrompida antes do fim.
        </p>

        <!-- Warning anti-alucinação: número/nome não verificado no texto -->
        <div v-if="warning"
          class="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
          <i class="fas fa-triangle-exclamation mt-0.5 text-amber-500"></i>
          <div class="min-w-0">
            <p>{{ warning.message }}</p>
            <p v-if="warning.details?.length" class="text-[10px] opacity-80 mt-0.5 break-words">
              Valor(es) suspeito(s): {{ warning.details.map(d => d.value).join(', ') }}
            </p>
          </div>
        </div>

        <ChatTable v-if="action?.type === 'table'"
          :title="action.title" :subtitle="action.subtitle"
          :columns="action.columns" :rows="action.rows" :total="action.total" />

        <ChatChart v-if="action?.type === 'chart'"
          :chart-type="action.chartType" :title="action.title" :subtitle="action.subtitle"
          :labels="action.labels" :data="action.data"
          :total="action.total" :top-breakdown="action.top_breakdown || []" />

        <ChatLeadsActions v-if="actionSource === 'leads'" :context="action.context || {}" />
        <ChatEventsActions v-if="actionSource === 'events'"
          :context="action.context || {}" :rows="action.rows || action.rawRows || []" />
        <ChatEnterprisesActions v-if="actionSource === 'enterprises'" :context="action.context || {}" />
        <ChatEnterpriseDetail v-if="action?.type === 'detail'" :action="action" />
        <ChatMcmvActions v-if="actionSource === 'mcmv'" :context="action.context || {}" />

        <!-- Pré-cadastros -->
        <ChatPrecadastrosSummary v-if="action?.type === 'precadastros_summary'" :action="action" />
        <ChatPrecadastrosActions v-if="actionSource === 'precadastros'" :context="action.context || {}" />

        <!-- Reservas -->
        <ChatReservasSummary v-if="action?.type === 'reservas_summary'" :action="action" />
        <ChatReservasActions v-if="actionSource === 'reservas'" :context="action.context || {}" />

        <!-- Editor de Alerta inline -->
        <ChatAlertEditor v-if="action?.type === 'open_alert_editor'" :action="action" />

        <!-- Academy: cards de processos / certificados / comunidade -->
        <ChatAcademyCards v-if="action?.type === 'academy_cards'" :action="action" />

        <!-- Imobiliárias: cards de parceiras / cadastros e convites -->
        <ChatImobiliariaCards v-if="action?.type === 'imobiliaria_cards'" :action="action" />

        <!-- Ficha Comercial: card com dados + sugestões + abrir ficha.
             precisa_desambiguar não renderiza card (viria com header vazio). -->
        <ChatConditionSheet v-if="action?.type === 'condition_sheet' && !action?.precisa_desambiguar" :action="action" />

        <!-- Campanhas das fichas (busca plural): cards com descrição/regulamento -->
        <ChatCampaignCards v-if="action?.type === 'campaign_cards'" :action="action" />

        <!-- Pessoas/Organograma: cards com modal de detalhe -->
        <ChatPersonCards v-if="action?.type === 'person_cards'" :action="action" />

        <!-- Preferências de notificação: painel de toggles -->
        <ChatNotificationPrefs v-if="action?.type === 'notification_prefs'" :action="action" />

        <!-- Relatórios: cards de resumo -->
        <ChatReportCards v-if="action?.type === 'report_cards'" :action="action" />

        <!-- Checklist: cards de checklist / tarefas -->
        <ChatChecklistCards v-if="action?.type === 'checklist_cards' || action?.type === 'checklist_tasks'" :action="action" />

        <!-- "O que a Eme fez" — transparência pós-resposta -->
        <div v-if="!streaming && steps.length" class="text-[11px] text-ink-subtle">
          <button type="button" @click="stepsOpen = !stepsOpen"
            class="inline-flex items-center gap-1.5 hover:text-ink-muted transition-colors">
            <i class="fas fa-circle-check text-emerald-500/80"></i>
            <span>{{ steps.length }} consulta{{ steps.length > 1 ? 's' : '' }}<template v-if="elapsedSec"> · {{ elapsedSec }}s</template></span>
            <i class="fas text-[9px]" :class="stepsOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
          </button>
          <ul v-if="stepsOpen" class="mt-1 space-y-0.5 pl-0.5">
            <li v-for="(s, i) in steps" :key="i" class="flex items-center gap-1.5">
              <i class="shrink-0 text-[10px]"
                :class="s.status === 'error' ? 'fas fa-circle-exclamation text-amber-500' : 'fas fa-check text-emerald-500/80'"></i>
              <span class="truncate">{{ s.label }}</span>
              <span v-if="s.ms != null" class="shrink-0 font-mono text-[10px] opacity-70">{{ (s.ms / 1000).toFixed(1) }}s</span>
            </li>
          </ul>
        </div>

        <!-- Feedback / Retry -->
        <div v-if="!streaming" class="flex items-center gap-1 mt-1.5">
          <button @click="$emit('feedback', 'up')"
            class="h-7 w-7 grid place-items-center rounded-md transition text-xs"
            :class="message.feedback === 'up'
              ? 'text-emerald-500 bg-emerald-500/10'
              : 'text-ink-subtle hover:text-emerald-500 hover:bg-emerald-500/10'"
            title="Boa resposta">
            <i class="fas fa-thumbs-up"></i>
          </button>
          <button @click="$emit('feedback', 'down')"
            class="h-7 w-7 grid place-items-center rounded-md transition text-xs"
            :class="message.feedback === 'down'
              ? 'text-red-500 bg-red-500/10'
              : 'text-ink-subtle hover:text-red-500 hover:bg-red-500/10'"
            title="Resposta ruim">
            <i class="fas fa-thumbs-down"></i>
          </button>
          <button @click="$emit('retry')"
            class="h-7 w-7 grid place-items-center rounded-md transition text-xs
                   text-ink-subtle hover:text-accent hover:bg-accent-soft"
            title="Refazer resposta">
            <i class="fas fa-rotate-right"></i>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
