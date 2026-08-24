<script setup>
// Teams › aba Hoje.
//
// O hub abria no calendário do mês, que é onde a informação está mais fria: a
// pessoa lia a grade inteira para descobrir o que tem AGORA. Esta aba responde
// as três perguntas do começo do expediente, na ordem em que elas aparecem:
//
//   1. O que vem agora?        cartão grande, com o botão de entrar
//   2. Como está o meu dia?    a faixa das 8h às 19h, com os blocos no lugar
//   3. O que espera por mim?   conversa sem resposta, convite sem resposta, ata nova
//
// Tudo sai do que o hub já carregou (calendário, conversas) mais a lista de
// relatórios, que é barata. Nenhuma chamada nova ao Graph.

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useTeamsStore } from '@/stores/Microsoft/teamsStore';
import { useTeamsChatStore } from '@/stores/Microsoft/teamsChatStore';
import { useTranscriptStore } from '@/stores/Microsoft/transcriptStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import Button from '@/components/UI/Button.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import PessoaHover from './PessoaHover.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const emit = defineEmits(['ir', 'abrir-relatorio']);

const ts = useTeamsStore();
const cs = useTeamsChatStore();
const tr = useTranscriptStore();
const auth = useAuthStore();

// ── Relógio ───────────────────────────────────────────────────────────────────
// Ele existe por um motivo: a contagem "em 12 min" precisa andar sozinha, senão
// a pessoa lê um número que envelheceu enquanto ela olhava a tela.
const agora = ref(new Date());
let relogio = null;
onMounted(() => {
  relogio = setInterval(() => { agora.value = new Date(); }, 30_000);
  tr.fetchReports?.();
});
onUnmounted(() => clearInterval(relogio));

const primeiroNome = computed(() => String(auth.user?.username || '').split(' ')[0] || '');

const saudacao = computed(() => {
  const h = agora.value.getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
});

const dataLonga = computed(() =>
  agora.value.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
);
const horaAgora = computed(() =>
  agora.value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
);

// ── O dia ─────────────────────────────────────────────────────────────────────
function diaStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function hhmm(iso) { return String(iso || '').slice(11, 16); }
function minutos(iso) {
  const [h, m] = hhmm(iso).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const doDia = computed(() =>
  ts.events
    .filter(e => !e.isCancelled && String(e.start || '').startsWith(diaStr(agora.value)))
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))
);

const minutosAgora = computed(() => agora.value.getHours() * 60 + agora.value.getMinutes());

const emAndamento = computed(() =>
  doDia.value.find(e => minutos(e.start) <= minutosAgora.value && minutos(e.end) > minutosAgora.value) || null
);
const aSeguir = computed(() => doDia.value.find(e => minutos(e.start) > minutosAgora.value) || null);
const destaque = computed(() => emAndamento.value || aSeguir.value);

const faltam = computed(() => {
  if (!destaque.value || emAndamento.value) return null;
  return Math.max(0, minutos(destaque.value.start) - minutosAgora.value);
});

const contagem = computed(() => {
  if (emAndamento.value) return 'agora';
  const m = faltam.value;
  if (m === null) return '';
  if (m < 60) return `em ${m} min`;
  return `em ${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
});

// ── Faixa do dia (08h — 19h) ─────────────────────────────────────────────────
// Uma barra em vez de uma grade: no celular a grade de semana não cabe, e o que
// a pessoa quer saber de manhã é onde estão os buracos.
const INICIO = 8 * 60;
const FIM    = 19 * 60;
const JANELA = FIM - INICIO;

function faixa(e) {
  const ini = Math.max(minutos(e.start), INICIO);
  const fim = Math.min(minutos(e.end), FIM);
  const largura = Math.max(((fim - ini) / JANELA) * 100, 2.5);
  return {
    left: `${((ini - INICIO) / JANELA) * 100}%`,
    width: `${largura}%`,
  };
}

const blocosDoDia = computed(() =>
  doDia.value
    .filter(e => !e.isAllDay && minutos(e.end) > INICIO && minutos(e.start) < FIM)
    .map(e => ({ ...e, pos: faixa(e) }))
);

const marcaAgora = computed(() => {
  const m = minutosAgora.value;
  if (m < INICIO || m > FIM) return null;
  return `${((m - INICIO) / JANELA) * 100}%`;
});

// ── Números do dia ────────────────────────────────────────────────────────────
const online = computed(() => doDia.value.filter(e => e.isOnlineMeeting).length);

const horasEmReuniao = computed(() => {
  const total = doDia.value
    .filter(e => !e.isAllDay)
    .reduce((soma, e) => soma + Math.max(0, minutos(e.end) - minutos(e.start)), 0);
  if (!total) return '0h';
  return total >= 60 ? `${Math.floor(total / 60)}h${total % 60 ? String(total % 60).padStart(2, '0') : ''}` : `${total} min`;
});

// Cada número leva para onde ele é resolvido: número que não é clicável obriga
// a pessoa a procurar de novo o que a tela acabou de mostrar.
const metricas = computed(() => [
  {
    rotulo: 'Compromissos hoje', valor: doDia.value.length,
    nota: online.value ? `${online.value} no Teams` : 'nenhum online',
    icone: 'fas fa-calendar-day', ir: 'agenda', cta: 'Ver a agenda',
  },
  {
    rotulo: 'Tempo em reunião', valor: horasEmReuniao.value,
    nota: 'das 8h às 19h',
    icone: 'fas fa-hourglass-half', ir: 'agenda', cta: 'Ver a agenda',
  },
  {
    rotulo: 'Conversas novas', valor: cs.naoLidos,
    nota: cs.naoLidos ? 'esperando resposta' : 'tudo respondido',
    icone: 'fas fa-comments', ir: 'mensagens', cta: 'Abrir mensagens',
  },
]);

// ── Esperando você ────────────────────────────────────────────────────────────
// Só entra o que tem ação clara. Lista de pendência que não leva a lugar nenhum
// é decoração.
const convitesSemResposta = computed(() =>
  ts.events.filter(e =>
    !e.isCancelled &&
    e.responseStatus === 'none' &&
    !e.isOrganizer &&
    minutos(e.start) >= 0 &&
    new Date(e.start) > agora.value
  )
);

const atasNovas = computed(() => {
  const corte = Date.now() - 48 * 60 * 60 * 1000;
  return (tr.reports || []).filter(r => r.reportGeneratedAt && new Date(r.reportGeneratedAt).getTime() > corte);
});

const pendencias = computed(() => {
  const lista = [];
  if (cs.naoLidos) {
    lista.push({
      id: 'chats',
      icone: 'fas fa-comment-dots',
      titulo: `${cs.naoLidos} conversa(s) com mensagem nova`,
      detalhe: cs.chats.filter(c => c.naoLido).slice(0, 2).map(c => c.titulo).join(' · ') || 'no Teams',
      quando: 'agora',
      ir: 'mensagens',
    });
  }
  if (convitesSemResposta.value.length) {
    lista.push({
      id: 'convites',
      icone: 'fas fa-envelope-open-text',
      titulo: `${convitesSemResposta.value.length} convite(s) sem resposta`,
      detalhe: convitesSemResposta.value.slice(0, 2).map(e => e.subject).join(' · '),
      quando: 'a confirmar',
      ir: 'agenda',
    });
  }
  if (atasNovas.value.length) {
    lista.push({
      id: 'atas',
      icone: 'fas fa-wand-magic-sparkles',
      titulo: `${atasNovas.value.length} ata(s) prontas`,
      detalhe: atasNovas.value.slice(0, 2).map(r => r.subject).join(' · '),
      quando: 'últimas 48h',
      ir: 'reunioes',
    });
  }
  return lista;
});

const carregandoAgenda = computed(() => ts.loading && !ts.events.length);
const carregandoAtas   = computed(() => tr.loadingReports && !(tr.reports || []).length);

// Quando não há mais nada hoje, o lugar nobre da tela não pode dizer só "nada
// mais hoje": mostra o PRÓXIMO compromisso que existe na agenda carregada e o
// fechamento do dia que passou.
const proximoFuturo = computed(() => {
  const agoraISO = agora.value;
  return ts.events
    .filter(e => !e.isCancelled && !e.isAllDay && new Date(e.start) > agoraISO)
    .sort((a, b) => String(a.start).localeCompare(String(b.start)))[0] || null;
});

function quandoEvento(e) {
  if (!e?.start) return '';
  const d = new Date(e.start);
  const hoje = new Date();
  const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
  if (d.toDateString() === amanha.toDateString()) return `amanhã, ${hhmm(e.start)}`;
  return `${d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}, ${hhmm(e.start)}`;
}

const jaPassaram = computed(() => doDia.value.filter(e => minutos(e.end) <= minutosAgora.value));

const relatoriosRecentes = computed(() => (tr.reports || []).slice(0, 3));

// Abrir conversa com alguém a partir do cartão da pessoa.
function conversarCom(pessoa) {
  if (!pessoa?.email) return;
  emit('ir', 'mensagens');
  cs.conversarCom(pessoa.email).catch(() => {});
}

function quandoRelatorio(r) {
  if (!r.meetingDate) return '';
  const d = new Date(r.meetingDate);
  const hoje = new Date();
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === hoje.toDateString()) return 'hoje';
  if (d.toDateString() === ontem.toDateString()) return 'ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
</script>

<template>
  <div class="space-y-4">

    <!-- Saudação -->
    <div class="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-xl font-bold text-ink leading-tight">
          {{ saudacao }}<span v-if="primeiroNome">, {{ primeiroNome }}</span>
        </h2>
        <p class="text-sm text-ink-muted capitalize">{{ dataLonga }} · {{ horaAgora }}</p>
      </div>
      <div class="flex gap-2">
        <Button size="sm" variant="outline" icon="fas fa-calendar-plus" @click="emit('ir', 'agenda')">Agendar</Button>
        <Button size="sm" variant="outline" icon="fas fa-wand-magic-sparkles" @click="emit('ir', 'reunioes')">Atas</Button>
      </div>
    </div>

    <!-- A seguir + números -->
    <div class="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">

      <section v-if="carregandoAgenda" class="rounded-2xl border border-line bg-surface-raised p-4 space-y-3">
        <Skeleton class="h-3 w-24 rounded" />
        <Skeleton class="h-6 w-2/3 rounded" />
        <Skeleton class="h-3 w-1/2 rounded" />
        <div class="flex gap-1 pt-2">
          <Skeleton v-for="i in 4" :key="i" class="h-7 w-7 rounded-full" />
        </div>
        <Skeleton class="h-10 w-40 rounded-xl mt-auto" />
      </section>

      <section v-else class="rounded-2xl border p-4 flex flex-col transition-colors duration-300"
        :class="destaque ? 'border-accent/25 bg-accent-soft' : 'border-line bg-surface-raised'">
        <p class="text-micro font-semibold uppercase tracking-wide flex items-center gap-2"
          :class="destaque ? 'text-accent' : 'text-ink-subtle'">
          <span v-if="emAndamento" class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
          {{ emAndamento ? 'Acontecendo agora' : 'A seguir hoje' }}
        </p>

        <template v-if="destaque">
          <h3 class="text-lg font-bold text-ink mt-1.5 leading-snug">{{ destaque.subject }}</h3>
          <p class="text-sm text-ink-muted mt-0.5">
            {{ hhmm(destaque.start) }} – {{ hhmm(destaque.end) }}
            <span v-if="destaque.location"> · {{ destaque.location }}</span>
            <span v-if="destaque.attendees?.length"> · {{ destaque.attendees.length }} participante(s)</span>
          </p>

          <!-- Quem vai estar: iniciais, que é o que cabe e o que basta -->
          <div v-if="destaque.attendees?.length" class="flex items-center mt-3">
            <PessoaHover v-for="(a, i) in destaque.attendees.slice(0, 6)" :key="a.email"
              :pessoa="a" :style="{ marginLeft: i ? '-0.4rem' : 0 }"
              class="shrink-0" @conversar="conversarCom" />
            <span v-if="destaque.attendees.length > 6" class="text-micro text-ink-subtle ml-2">
              +{{ destaque.attendees.length - 6 }}
            </span>
          </div>

          <div class="flex flex-wrap items-center gap-2 mt-auto pt-4">
            <a v-if="destaque.joinUrl" :href="destaque.joinUrl" target="_blank" rel="noopener"
              class="inline-flex items-center gap-2 px-4 py-2 min-h-10 rounded-xl bg-accent hover:bg-accent-hover
                     text-white text-sm font-medium transition-colors">
              <i class="fas fa-video"></i> Entrar<span v-if="contagem"> · {{ contagem }}</span>
            </a>
            <Button size="sm" variant="ghost" icon="fas fa-list-check" @click="emit('ir', 'agenda')">
              Ver na agenda
            </Button>
          </div>
        </template>

        <template v-else>
          <h3 class="text-lg font-bold text-ink mt-1.5 leading-snug">
            {{ jaPassaram.length ? 'Dia encerrado' : 'Nenhum compromisso hoje' }}
          </h3>
          <p class="text-sm text-ink-muted mt-0.5">
            <template v-if="jaPassaram.length">
              {{ jaPassaram.length }} compromisso(s) atrás de você, {{ horasEmReuniao }} em reunião.
            </template>
            <template v-else>A agenda de hoje está livre.</template>
          </p>

          <!-- O lugar nobre da tela não pode ficar vazio: se não há mais nada
               hoje, o que interessa é o que vem depois. -->
          <div v-if="proximoFuturo"
            class="mt-3 p-3 rounded-xl border border-line bg-surface-raised">
            <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide">Próximo compromisso</p>
            <p class="text-sm font-medium text-ink mt-1 truncate">{{ proximoFuturo.subject }}</p>
            <p class="text-micro text-ink-muted mt-0.5">
              {{ quandoEvento(proximoFuturo) }}
              <span v-if="proximoFuturo.attendees?.length"> · {{ proximoFuturo.attendees.length }} participante(s)</span>
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2 mt-auto pt-4">
            <Button size="sm" variant="outline" icon="fas fa-calendar-days" @click="emit('ir', 'agenda')">
              Ver a semana
            </Button>
            <Button v-if="jaPassaram.length" size="sm" variant="ghost"
              icon="fas fa-wand-magic-sparkles" @click="emit('ir', 'reunioes')">
              Atas de hoje
            </Button>
          </div>
        </template>
      </section>

      <div class="grid grid-rows-3 gap-2.5">
        <template v-if="carregandoAgenda">
          <Skeleton v-for="i in 3" :key="i" class="h-full min-h-[4.25rem] rounded-2xl" />
        </template>
        <button v-else v-for="m in metricas" :key="m.rotulo" type="button"
          :title="m.cta" @click="emit('ir', m.ir)"
          class="group rounded-2xl border border-line bg-surface-raised px-3.5 py-3 text-left
                 hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-150">
          <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide flex items-center gap-2">
            <i :class="m.icone" class="text-micro text-ink-subtle group-hover:text-accent transition-colors"></i>
            {{ m.rotulo }}
            <i class="fas fa-arrow-right text-micro ml-auto opacity-0 -translate-x-1
                      group-hover:opacity-100 group-hover:translate-x-0 text-accent transition-all"></i>
          </p>
          <p class="flex items-baseline gap-2 mt-0.5">
            <span class="text-xl font-bold text-ink tabular-nums group-hover:text-accent transition-colors">{{ m.valor }}</span>
            <span class="text-xs text-ink-muted">{{ m.nota }}</span>
          </p>
        </button>
      </div>
    </div>

    <!-- A faixa do dia -->
    <section class="rounded-2xl border border-line bg-surface-raised p-4">
      <div class="flex items-center justify-between mb-2.5">
        <h4 class="text-sm font-semibold text-ink">Seu dia</h4>
        <span class="text-micro text-ink-subtle">08h — 19h</span>
      </div>

      <Skeleton v-if="carregandoAgenda" class="h-12 rounded-xl" />

      <div v-else class="relative h-12 rounded-xl bg-surface-sunken border border-line overflow-hidden">
        <button v-for="b in blocosDoDia" :key="b.id" type="button"
          :title="`${b.subject} · ${hhmm(b.start)}–${hhmm(b.end)}`"
          :style="{ left: b.pos.left, width: b.pos.width }"
          @click="emit('ir', 'agenda')"
          class="absolute top-1.5 bottom-1.5 rounded-lg px-2 overflow-hidden text-left
                 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
          :class="b.isOnlineMeeting
            ? 'bg-accent/15 border-accent/30 hover:bg-accent/25'
            : 'bg-surface-hover border-line hover:bg-surface-sunken'">
          <span class="block text-micro font-medium text-ink truncate leading-tight mt-1">{{ b.subject }}</span>
          <span class="block text-micro text-ink-subtle truncate">{{ hhmm(b.start) }}</span>
        </button>

        <!-- Onde estamos agora -->
        <div v-if="marcaAgora" :style="{ left: marcaAgora }"
          class="absolute top-0 bottom-0 w-px bg-data-neg">
          <span class="absolute -top-0.5 -left-1 w-2 h-2 rounded-full bg-data-neg"></span>
        </div>

        <p v-if="!blocosDoDia.length"
          class="absolute inset-0 grid place-items-center text-micro text-ink-subtle">
          Dia livre
        </p>
      </div>

      <div class="flex justify-between mt-1.5 text-micro text-ink-subtle">
        <span>08h</span><span>10h</span><span>12h</span><span>14h</span><span>16h</span><span>18h</span>
      </div>
    </section>

    <!-- Esperando você · Atas recentes -->
    <div class="grid gap-3 lg:grid-cols-2">

      <section class="rounded-2xl border border-line bg-surface-raised p-4">
        <h4 class="text-sm font-semibold text-ink mb-2">Esperando você</h4>

        <EmptyState v-if="!pendencias.length" icon="fas fa-check" size="sm"
          title="Nada pendente" description="Nenhuma conversa, convite ou ata esperando por você." />

        <TransitionGroup v-else tag="div" class="flex flex-col"
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          leave-active-class="transition duration-150 ease-in absolute"
          leave-to-class="opacity-0">
          <button v-for="p in pendencias" :key="p.id" type="button" @click="emit('ir', p.ir)"
            class="flex items-start gap-3 px-2 py-2.5 min-h-11 rounded-xl text-left
                   hover:bg-surface-hover hover:translate-x-0.5 transition-all duration-150">
            <i :class="p.icone" class="text-sm text-accent mt-0.5 w-4 text-center shrink-0"></i>
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-medium text-ink">{{ p.titulo }}</span>
              <span class="block text-micro text-ink-subtle truncate mt-0.5">{{ p.detalhe }}</span>
            </span>
            <span class="text-micro text-ink-subtle shrink-0 pt-0.5">{{ p.quando }}</span>
          </button>
        </TransitionGroup>
      </section>

      <section class="rounded-2xl border border-line bg-surface-raised p-4">
        <div class="flex items-center justify-between mb-2">
          <h4 class="text-sm font-semibold text-ink">Atas recentes</h4>
          <button class="text-micro text-accent hover:underline" @click="emit('ir', 'reunioes')">Ver todas</button>
        </div>

        <div v-if="carregandoAtas" class="flex flex-col gap-2">
          <Skeleton v-for="i in 3" :key="i" class="h-14 rounded-xl" />
        </div>

        <EmptyState v-else-if="!relatoriosRecentes.length" icon="fas fa-wand-magic-sparkles" size="sm"
          title="Nenhuma ata ainda"
          description="Depois de uma reunião com transcrição, a ata aparece aqui sozinha." />

        <div v-else class="flex flex-col gap-2">
          <button v-for="r in relatoriosRecentes" :key="r.id" type="button"
            @click="emit('abrir-relatorio', r)"
            class="flex items-start gap-2.5 p-2.5 rounded-xl border border-line bg-surface-sunken
                   hover:border-accent/30 hover:-translate-y-0.5 transition-all duration-150 text-left">
            <i class="fas fa-wand-magic-sparkles text-accent text-xs mt-0.5 shrink-0"></i>
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-medium text-ink truncate">{{ r.subject || 'Reunião' }}</span>
              <span class="block text-micro text-ink-subtle mt-0.5">
                {{ quandoRelatorio(r) }}<span v-if="r.durationMin"> · {{ r.durationMin }} min</span>
              </span>
            </span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
