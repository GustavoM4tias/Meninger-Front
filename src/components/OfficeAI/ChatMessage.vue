<script setup>
// Balão de mensagem do chat da Eme — ÚNICO renderer das duas superfícies
// (Home.vue e OfficeChatSession.vue via prop `compact`). Antes cada uma tinha
// sua cópia da cadeia de renderers e elas divergiam (warning e action.source
// só funcionavam no flutuante).
import { computed, ref, defineAsyncComponent } from 'vue';

import { ehEscrita } from '@/utils/OfficeAI/toolKind';
// ── O que vem junto, e o que vem quando precisar ──────────────────────────
//
// Só o texto é estático: é o que aparece em quase toda mensagem, e adiar ele
// faria a conversa piscar em branco a cada linha.
//
// TODO O RESTO É SOB DEMANDA, e não é preferência de estilo. Cada renderer
// estático entrava no pedaço baixado ANTES da primeira mensagem aparecer, e
// alguns arrastam bibliotecas inteiras junto - o de gráfico puxa o ECharts,
// mais de 600 KB. Numa conversa comum nenhum deles é usado, e mesmo assim
// todos eram baixados e interpretados só para abrir o chat.
import ChatText from './renderers/ChatText.vue';
// Tudo que não é texto passa pelo dispatcher da galeria (viz/ChatBlock.vue):
// a action vira EmeBlock[] (blocksDe) e cada bloco escolhe o componente. Os
// renderers antigos continuam existindo atrás do bloco `legacy` até a tool
// deles devolver `blocks` (fase 4 do plano).
import ChatBlock from './viz/ChatBlock.vue';
import { blocksDe } from './viz/legacyAdapter.js';
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

// Aparência do aviso do validador:
//  corrected  → a Eme reescreveu a resposta com os dados reais (informativo)
//  blocked    → o texto não passou na validação e foi SUBSTITUÍDO pelos dados do banco
//  unreliable → divergência sem dado autoritativo: a resposta NÃO deve ser usada (alerta)
//  notice     → avisos legados (resposta cortada, filtro do modelo)
const warningStyle = computed(() => ({
  corrected: {
    box: 'bg-accent/10 border-accent/25 text-accent',
    icon: 'fas fa-wand-magic-sparkles text-accent',
    title: 'Resposta corrigida automaticamente',
  },
  blocked: {
    box: 'bg-data-warn/10 border-data-warn/25 text-data-warn',
    icon: 'fas fa-shield-halved text-data-warn',
    title: 'Resposta substituída pelos dados reais',
  },
  unreliable: {
    box: 'bg-data-neg/10 border-data-neg/30 text-data-neg',
    icon: 'fas fa-circle-exclamation text-data-neg',
    title: 'Resposta não confiável',
  },
  notice: {
    box: 'bg-data-warn/10 border-data-warn/20 text-data-warn',
    icon: 'fas fa-triangle-exclamation text-data-warn',
    title: null,
  },
}[warning.value?.kind || 'notice']));

// Blocos da resposta. Navegação vai ANTES do texto (era assim no switch
// antigo: o botão de abrir a tela aparece em cima da frase que o explica).
const blocos = computed(() => blocksDe(action.value));
const blocosAntes = computed(() => blocos.value.filter(bl => bl.kind === 'nav'));
const blocosDepois = computed(() => blocos.value.filter(bl => bl.kind !== 'nav'));

// "O que a Eme fez": passos de tool + tempo total, gravados pelo store no done.
const steps = computed(() => props.message.metadata?.steps || []);
// "3 consultas" mentia quando um dos passos era cancelar uma reunião.
const temEscrita = computed(() => steps.value.some(s => ehEscrita(s.name)));
const rotuloPassos = computed(() => {
  const n = steps.value.length;
  if (temEscrita.value) return `${n} execução${n > 1 ? 'ões' : ''}`;
  return `${n} consulta${n > 1 ? 's' : ''}`;
});
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
        class="flex items-start gap-2 p-3 rounded-xl bg-data-warn/10 border border-data-warn/20 text-sm text-data-warn">
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

        <ChatBlock v-for="bl in blocosAntes" :key="bl.id" :block="bl" :compact="compact" />
        <ChatText v-if="message.content" :content="message.content" :streaming="streaming" />

        <!-- Resposta interrompida (cancelamento/timeout preservou o parcial) -->
        <p v-if="message.metadata?.interrupted"
          class="flex items-center gap-1.5 text-xs text-data-warn">
          <i class="fas fa-triangle-exclamation"></i>
          Resposta interrompida antes do fim.
        </p>

        <!-- Validador: resposta corrigida / não confiável / aviso do modelo -->
        <div v-if="warning"
          class="flex items-start gap-2 px-3 py-2 rounded-xl border text-xs"
          :class="warningStyle.box">
          <i class="mt-0.5 shrink-0" :class="warningStyle.icon"></i>
          <div class="min-w-0">
            <p v-if="warningStyle.title" class="font-semibold">{{ warningStyle.title }}</p>
            <p :class="warningStyle.title ? 'mt-0.5' : ''">{{ warning.message }}</p>
            <p v-if="warning.kind === 'unreliable' && warning.details?.length"
              class="text-micro opacity-80 mt-1 break-words">
              Não use estes valores do texto: {{ warning.details.map(d => d.value).join(', ') }}
            </p>
          </div>
        </div>

        <ChatBlock v-for="bl in blocosDepois" :key="bl.id" :block="bl" :compact="compact" />

        <!-- "O que a Eme fez" — transparência pós-resposta -->
        <div v-if="!streaming && steps.length" class="text-micro text-ink-subtle">
          <button type="button" @click="stepsOpen = !stepsOpen"
            class="inline-flex items-center gap-1.5 hover:text-ink-muted transition-colors">
            <i class="fas fa-circle-check text-data-pos"></i>
            <span>{{ rotuloPassos }}<template v-if="elapsedSec"> · {{ elapsedSec }}s</template></span>
            <i class="fas text-[9px]" :class="stepsOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
          </button>
          <ul v-if="stepsOpen" class="mt-1 space-y-0.5 pl-0.5">
            <li v-for="(s, i) in steps" :key="i" class="flex items-center gap-1.5">
              <i class="shrink-0 text-[10px]"
                :class="s.status === 'error' ? 'fas fa-circle-exclamation text-data-warn' : 'fas fa-check text-data-pos'"></i>
              <span class="truncate">
                {{ s.label }}<span v-if="s.detalhe" class="opacity-70"> · {{ s.detalhe }}</span>
              </span>
              <span v-if="s.ms != null" class="shrink-0 font-mono text-micro opacity-70">{{ (s.ms / 1000).toFixed(1) }}s</span>
            </li>
          </ul>
        </div>

        <!-- Feedback / Retry -->
        <div v-if="!streaming" class="flex items-center gap-1 mt-1.5">
          <button @click="$emit('feedback', 'up')"
            class="h-7 w-7 grid place-items-center rounded-md transition text-xs"
            :class="message.feedback === 'up'
              ? 'text-data-pos bg-data-pos/10'
              : 'text-ink-subtle hover:text-data-pos hover:bg-data-pos/10'"
            title="Boa resposta">
            <i class="fas fa-thumbs-up"></i>
          </button>
          <button @click="$emit('feedback', 'down')"
            class="h-7 w-7 grid place-items-center rounded-md transition text-xs"
            :class="message.feedback === 'down'
              ? 'text-data-neg bg-data-neg/10'
              : 'text-ink-subtle hover:text-data-neg hover:bg-data-neg/10'"
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
