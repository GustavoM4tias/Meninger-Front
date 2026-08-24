<script setup>
// Faixa de acompanhamento do Teams, visível de qualquer aba.
//
// O hub abria direto no calendário do mês: para saber "o que eu tenho agora" a
// pessoa tinha que ler a grade e caçar o horário. E mensagem nova só aparecia
// se ela entrasse na aba certa.
//
// Três respostas, sem nenhuma chamada nova ao Graph - tudo vem do que o hub já
// carregou: o que vem AGORA, como está o dia, e o que está esperando resposta.

import { computed } from 'vue';
import { useTeamsStore } from '@/stores/Microsoft/teamsStore';
import { useTeamsChatStore } from '@/stores/Microsoft/teamsChatStore';

const emit = defineEmits(['ir']);
const ts = useTeamsStore();
const cs = useTeamsChatStore();

function hojeStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const doDia = computed(() =>
  ts.events
    .filter(e => !e.isCancelled && String(e.start || '').startsWith(hojeStr()))
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
);

const agora = computed(() => {
  const t = new Date();
  const hhmm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  // A que está acontecendo tem prioridade sobre a próxima: se você está
  // atrasado para uma reunião, é dela que você precisa saber.
  return doDia.value.find(e => hora(e.start) <= hhmm && hora(e.end) > hhmm)
      || doDia.value.find(e => hora(e.start) > hhmm)
      || null;
});

const emAndamento = computed(() => {
  const e = agora.value;
  if (!e) return false;
  const t = new Date();
  const hhmm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  return hora(e.start) <= hhmm && hora(e.end) > hhmm;
});

const minutosPara = computed(() => {
  const e = agora.value;
  if (!e?.start) return null;
  const [h, m] = hora(e.start).split(':').map(Number);
  const alvo = new Date();
  alvo.setHours(h, m, 0, 0);
  return Math.round((alvo - new Date()) / 60000);
});

function hora(iso) { return String(iso || '').slice(11, 16); }

const online = computed(() => doDia.value.filter(e => e.isOnlineMeeting).length);
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-3 mb-4">

    <!-- Agora / a seguir -->
    <div class="rounded-2xl border border-line bg-surface-raised p-3.5 flex flex-col gap-1">
      <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide">
        {{ emAndamento ? 'Acontecendo agora' : 'A seguir hoje' }}
      </p>

      <template v-if="agora">
        <p class="text-sm font-semibold text-ink truncate" :title="agora.subject">{{ agora.subject }}</p>
        <p class="text-xs text-ink-muted">
          {{ hora(agora.start) }} – {{ hora(agora.end) }}
          <span v-if="!emAndamento && minutosPara !== null && minutosPara <= 120" class="text-accent font-medium">
            · em {{ minutosPara }} min
          </span>
        </p>
        <a v-if="agora.joinUrl" :href="agora.joinUrl" target="_blank" rel="noopener"
          class="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
          <i class="fas fa-video text-micro"></i> Entrar na reunião
        </a>
      </template>

      <p v-else class="text-sm text-ink-muted">Nada mais hoje.</p>
    </div>

    <!-- O dia -->
    <button type="button" @click="emit('ir', 'agenda')"
      class="rounded-2xl border border-line bg-surface-raised p-3.5 text-left hover:border-accent/40 transition-colors">
      <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide">Seu dia</p>
      <p class="text-2xl font-bold text-ink leading-tight mt-0.5 tabular-nums">{{ doDia.length }}</p>
      <p class="text-xs text-ink-muted">
        compromisso(s)<span v-if="online"> · {{ online }} com link do Teams</span>
      </p>
    </button>

    <!-- Esperando resposta -->
    <button type="button" @click="emit('ir', 'mensagens')"
      :class="cs.naoLidos ? 'border-accent/40' : 'border-line'"
      class="rounded-2xl border bg-surface-raised p-3.5 text-left hover:border-accent/40 transition-colors">
      <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide">Mensagens</p>
      <p :class="cs.naoLidos ? 'text-accent' : 'text-ink'"
        class="text-2xl font-bold leading-tight mt-0.5 tabular-nums">{{ cs.naoLidos }}</p>
      <p class="text-xs text-ink-muted">
        {{ cs.naoLidos ? 'conversa(s) com mensagem nova' : 'nenhuma conversa esperando você' }}
      </p>
    </button>
  </div>
</template>
