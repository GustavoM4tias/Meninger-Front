<script setup>
import { computed } from 'vue';

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

const props = defineProps({
  message: { type: Object, required: true },
  streaming: { type: Boolean, default: false },
});

const emit = defineEmits(['feedback', 'retry', 'storageHelp']);

const action = computed(() => props.message.metadata?.action || null);
const isUser = computed(() => props.message.role === 'user');
const isError = computed(() => props.message.response_type === 'error');
</script>

<template>
  <!-- USER -->
  <div v-if="isUser" class="flex justify-end">
    <div class="max-w-[75%] bg-accent text-white rounded-2xl rounded-br-md
                px-4 py-2.5 text-sm leading-relaxed shadow-soft">
      {{ message.content }}
    </div>
  </div>

  <!-- ASSISTANT -->
  <div v-else class="flex gap-3 items-start">
    <img src="/Mlogo.png" class="h-6 md:h-7 invert dark:invert-0 shrink-0 mt-0.5" alt="Eme" />

    <div class="flex-1 min-w-0 space-y-2">
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
      <span v-else-if="isError" class="text-sm text-ink-muted italic">{{ message.content }}</span>

      <!-- Renderers -->
      <template v-else>
        <ChatNavAction v-if="action?.type === 'navigate'" :action="action" />
        <ChatText v-if="message.content" :content="message.content" :streaming="streaming" />

        <ChatTable v-if="action?.type === 'table'"
          :title="action.title" :subtitle="action.subtitle"
          :columns="action.columns" :rows="action.rows" :total="action.total" />

        <ChatChart v-if="action?.type === 'chart'"
          :chart-type="action.chartType" :title="action.title" :subtitle="action.subtitle"
          :labels="action.labels" :data="action.data"
          :total="action.total" :top-breakdown="action.top_breakdown || []" />

        <ChatLeadsActions v-if="action?.context?.source === 'leads'" :context="action.context" />
        <ChatEventsActions v-if="action?.context?.source === 'events'"
          :context="action.context" :rows="action.rows || action.rawRows || []" />
        <ChatEnterprisesActions v-if="action?.context?.source === 'enterprises' || action?.type === 'enterprise_detail'" :context="action.context || {}" />
        <ChatEnterpriseDetail v-if="action?.type === 'detail'" :action="action" />
        <ChatMcmvActions v-if="action?.context?.source === 'mcmv'" :context="action.context" />

        <!-- Pré-cadastros -->
        <ChatPrecadastrosSummary v-if="action?.type === 'precadastros_summary'" :action="action" />
        <ChatPrecadastrosActions v-if="action?.context?.source === 'precadastros'" :context="action.context" />

        <!-- Reservas -->
        <ChatReservasSummary v-if="action?.type === 'reservas_summary'" :action="action" />
        <ChatReservasActions v-if="action?.context?.source === 'reservas'" :context="action.context" />

        <!-- Editor de Alerta inline -->
        <ChatAlertEditor v-if="action?.type === 'open_alert_editor'" :action="action" />

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
