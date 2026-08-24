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
import Skeleton from '@/components/UI/Skeleton.vue';

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

const carregando = computed(() => ts.loading && !ts.events.length);

function passou(e) { return minutos(e.end) <= minutosAgora.value; }

// A ordem do trilho responde "onde eu estou no dia": o que está acontecendo
// agora fica no topo, embaixo vem o que ainda vai acontecer, e por último o que
// já passou - da mais recente para a mais antiga, que é a ordem em que a pessoa
// procura ("o que era mesmo a reunião de agora há pouco?").
const grupos = computed(() => {
  const atual = emAndamento.value ? [emAndamento.value] : [];
  const proximas = doDia.value.filter(e => minutos(e.start) > minutosAgora.value);
  const passadas = doDia.value
    .filter(e => passou(e) && e.id !== emAndamento.value?.id)
    .reverse();

  return [
    { chave: "agora",    rotulo: "Agora",     itens: atual },
    { chave: "proximas", rotulo: "A seguir",  itens: proximas },
    { chave: "passadas", rotulo: "Já passou", itens: passadas },
  ].filter(g => g.itens.length);
});
</script>

<template>
  <aside class="w-full space-y-5">

    <!-- O que vem agora -->
    <section>
      <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide mb-2">Acompanhamento</p>

      <div v-if="carregando" class="rounded-2xl border border-line bg-surface-raised p-3 space-y-2">
        <Skeleton class="h-3 w-20 rounded" />
        <Skeleton class="h-4 w-4/5 rounded" />
        <Skeleton class="h-3 w-2/3 rounded" />
        <Skeleton class="h-10 w-full rounded-xl mt-1" />
      </div>

      <div v-else-if="destaque" class="rounded-2xl border border-accent/25 bg-accent-soft p-3">
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
    <section v-if="carregando">
      <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide mb-2">Agenda de hoje</p>
      <div class="flex flex-col gap-1.5">
        <Skeleton v-for="i in 4" :key="i" class="h-10 rounded-lg" />
      </div>
    </section>

    <section v-else-if="doDia.length">
      <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide mb-2">Agenda de hoje</p>
      <div v-for="g in grupos" :key="g.chave" class="mb-1.5 last:mb-0">
        <p class="text-micro text-ink-subtle px-2 pb-0.5 flex items-center gap-1.5">
          <span v-if="g.chave === 'agora'" class="w-1 h-1 rounded-full bg-accent animate-pulse"></span>
          {{ g.rotulo }}
        </p>
        <TransitionGroup
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          leave-active-class="transition duration-150 ease-in absolute"
          leave-to-class="opacity-0">
          <button v-for="e in g.itens" :key="e.id" type="button" @click="emit('ir', 'agenda')"
            class="w-full flex items-center gap-2.5 px-2 py-2 min-h-10 rounded-lg text-left
                   hover:bg-surface-hover hover:translate-x-0.5 transition-all duration-150"
            :class="g.chave === 'passadas' ? 'opacity-45 hover:opacity-70' : ''">
            <span class="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
              :class="g.chave === 'agora' ? 'bg-accent animate-pulse'
                    : g.chave === 'proximas' ? 'bg-ink-subtle/50' : 'bg-ink-subtle/25'"></span>
            <span class="w-9 shrink-0 text-micro tabular-nums text-ink-subtle">{{ hhmm(e.start) }}</span>
            <span class="flex-1 min-w-0 text-xs truncate"
              :class="g.chave === 'agora' ? 'text-ink font-medium' : 'text-ink-muted'">{{ e.subject }}</span>
            <i v-if="e.isOnlineMeeting" class="fas fa-video text-micro text-ink-subtle shrink-0"></i>
          </button>
        </TransitionGroup>
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
