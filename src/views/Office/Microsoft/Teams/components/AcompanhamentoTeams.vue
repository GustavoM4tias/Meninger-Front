<script setup>
// Trilho de acompanhamento do Teams.
//
// Era uma faixa de três cartões acima das abas. Virou trilho vertical, à
// direita, por dois motivos: a faixa roubava a primeira dobra de todas as abas,
// e o contexto que ela carrega ("o que vem agora", "o resto do dia") é
// justamente o que a pessoa quer ter DO LADO enquanto lê uma conversa ou uma
// ata - não em cima, empurrando o conteúdo para baixo.
//
// Na aba Hoje ele não aparece: lá esse conteúdo é a própria tela, em tamanho
// grande. No celular também não - lá a coluna única já é a tela inteira.
//
// Nenhuma chamada nova ao Graph: tudo vem do que o hub já carregou.

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useTeamsStore } from '@/stores/Microsoft/teamsStore';
import { useTeamsChatStore } from '@/stores/Microsoft/teamsChatStore';

const emit = defineEmits(['ir']);
const ts = useTeamsStore();
const cs = useTeamsChatStore();

// A contagem precisa andar sozinha: número que envelhece na tela engana.
const agora = ref(new Date());
let relogio = null;
onMounted(() => { relogio = setInterval(() => { agora.value = new Date(); }, 30_000); });
onUnmounted(() => clearInterval(relogio));

function diaStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function hhmm(iso) { return String(iso || '').slice(11, 16); }
function minutos(iso) {
  const [h, m] = hhmm(iso).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const minutosAgora = computed(() => agora.value.getHours() * 60 + agora.value.getMinutes());

const doDia = computed(() =>
  ts.events
    .filter(e => !e.isCancelled && String(e.start || '').startsWith(diaStr(agora.value)))
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
);

const emAndamento = computed(() =>
  doDia.value.find(e => minutos(e.start) <= minutosAgora.value && minutos(e.end) > minutosAgora.value) || null
);
const aSeguir = computed(() => doDia.value.find(e => minutos(e.start) > minutosAgora.value) || null);
const destaque = computed(() => emAndamento.value || aSeguir.value);

const contagem = computed(() => {
  if (!destaque.value) return '';
  if (emAndamento.value) return 'agora';
  const m = Math.max(0, minutos(destaque.value.start) - minutosAgora.value);
  return m < 60 ? `em ${m} min` : `em ${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
});

function passou(e) { return minutos(e.end) <= minutosAgora.value; }
</script>

<template>
  <aside class="w-full space-y-5">

    <!-- O que vem agora -->
    <section>
      <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide mb-2">Acompanhamento</p>

      <div v-if="destaque" class="rounded-2xl border border-accent/25 bg-accent-soft p-3">
        <p class="text-micro font-semibold text-accent flex items-center gap-1.5">
          <span v-if="emAndamento" class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
          {{ emAndamento ? 'Acontecendo agora' : 'A seguir' }}
        </p>
        <p class="text-sm font-semibold text-ink mt-1 leading-snug">{{ destaque.subject }}</p>
        <p class="text-micro text-ink-muted mt-0.5">
          {{ hhmm(destaque.start) }} – {{ hhmm(destaque.end) }}
          <span v-if="destaque.location"> · {{ destaque.location }}</span>
        </p>
        <a v-if="destaque.joinUrl" :href="destaque.joinUrl" target="_blank" rel="noopener"
          class="mt-2.5 w-full inline-flex items-center justify-center gap-2 px-3 py-2 min-h-10 rounded-xl
                 bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors">
          <i class="fas fa-video text-micro"></i> Entrar<span v-if="contagem"> · {{ contagem }}</span>
        </a>
      </div>

      <p v-else class="text-sm text-ink-muted rounded-2xl border border-line bg-surface-raised p-3">
        Nada mais hoje.
      </p>
    </section>

    <!-- O resto do dia -->
    <section v-if="doDia.length">
      <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide mb-2">Agenda de hoje</p>
      <div class="flex flex-col">
        <button v-for="e in doDia" :key="e.id" type="button" @click="emit('ir', 'agenda')"
          class="flex items-center gap-2.5 px-2 py-2 min-h-10 rounded-lg text-left hover:bg-surface-hover transition-colors"
          :class="passou(e) ? 'opacity-50' : ''">
          <span class="w-1.5 h-1.5 rounded-full shrink-0"
            :class="e.id === destaque?.id ? 'bg-accent' : 'bg-ink-subtle/40'"></span>
          <span class="w-9 shrink-0 text-micro tabular-nums text-ink-subtle">{{ hhmm(e.start) }}</span>
          <span class="flex-1 min-w-0 text-xs truncate"
            :class="e.id === destaque?.id ? 'text-ink font-medium' : 'text-ink-muted'">{{ e.subject }}</span>
          <i v-if="e.isOnlineMeeting" class="fas fa-video text-micro text-ink-subtle shrink-0"></i>
        </button>
      </div>
    </section>

    <!-- O que espera resposta -->
    <section v-if="cs.naoLidos">
      <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide mb-2">Esperando você</p>
      <button type="button" @click="emit('ir', 'mensagens')"
        class="w-full flex items-start gap-2.5 p-3 rounded-xl border border-line bg-surface-raised
               hover:border-accent/30 transition-colors text-left">
        <i class="fas fa-comment-dots text-accent text-xs mt-0.5 shrink-0"></i>
        <span class="flex-1 min-w-0">
          <span class="block text-xs font-medium text-ink">{{ cs.naoLidos }} conversa(s) com mensagem nova</span>
          <span class="block text-micro text-ink-subtle truncate mt-0.5">
            {{ cs.chats.filter(c => c.naoLido).slice(0, 2).map(c => c.titulo).join(' · ') }}
          </span>
        </span>
      </button>
    </section>
  </aside>
</template>
