<script setup>
// /assistente — "Meu dia".
//
// A tela que responde a pergunta das 8 da manhã: o que eu preciso fazer hoje?
//
// O Office sabia de tudo e não contava nada junto. A reunião estava na Central
// Microsoft, o e-mail que pedia decisão na Triagem, a conversa sem resposta no
// trilho do Outlook, a demanda no Checklist - cinco telas, cinco meias
// respostas. Aqui é uma lista só, ordenada por urgência e prazo, e cada linha
// leva de volta ao lugar onde a coisa se resolve.
//
// NADA AQUI É CÓPIA. Pendência que nasce de um e-mail é lida do e-mail na hora.
// Copiar criaria duas verdades: a pessoa responderia o e-mail e a cópia
// continuaria dizendo que falta responder.

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAssistantStore } from '@/stores/Assistant/assistantStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { pedirConfirmacao } from '@/composables/useConfirm';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Modal from '@/components/UI/Modal.vue';
import Switch from '@/components/UI/Switch.vue';
import TarefaDetalhe from './TarefaDetalhe.vue';
import ParceriaModal from '@/components/Colab/ParceriaModal.vue';
import AvisosPicker from './AvisosPicker.vue';

const a = useAssistantStore();
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const toast = useToast();

// ── Relógio ───────────────────────────────────────────────────────────────────
// A contagem "em 12 min" precisa andar sozinha, senão a pessoa lê um número que
// envelheceu enquanto ela olhava a tela.
const agora = ref(new Date());
let relogio = null;

onMounted(() => {
  a.carregarDia();
  a.carregarSettings();
  a.carregarConvites();

  // Atalho da Eme: o botão dela promete "Nova tarefa" / "Convites", e a tela
  // precisa cumprir. Levar para cá e não abrir nada é o tipo de atalho que a
  // pessoa clica uma vez e nunca mais.
  if (route.query.nova) abrirNova();
  if (route.query.convites) {
    document.querySelector('[data-convites]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  relogio = setInterval(() => { agora.value = new Date(); }, 30_000);
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

// ── Filtros ───────────────────────────────────────────────────────────────────
const filtro = ref('tudo');

const TIPOS = {
  email:     { label: 'E-mail', icone: 'fas fa-envelope', cor: 'text-accent' },
  aprovacao: { label: 'Aprovar', icone: 'fas fa-check-double', cor: 'text-accent' },
  prazo:     { label: 'Prazo', icone: 'fas fa-calendar-day', cor: 'text-data-warn' },
  cobranca:  { label: 'Cobrar', icone: 'fas fa-rotate-left', cor: 'text-ink-subtle' },
  tarefa:    { label: 'Tarefa', icone: 'fas fa-list-check', cor: 'text-ink-muted' },
};
const tipoDe = (t) => TIPOS[t] || TIPOS.tarefa;

const FILTROS = computed(() => {
  const conta = {};
  for (const p of a.pendencias) conta[p.tipo] = (conta[p.tipo] || 0) + 1;
  return [
    { id: 'tudo', label: 'Tudo', n: a.pendencias.length },
    { id: 'urgente', label: 'Urgente', n: a.urgentes.length },
    ...Object.keys(TIPOS).filter(t => conta[t]).map(t => ({ id: t, label: TIPOS[t].label, n: conta[t] })),
  ];
});

const visiveis = computed(() => {
  if (filtro.value === 'tudo') return a.pendencias;
  if (filtro.value === 'urgente') return a.urgentes;
  return a.pendencias.filter(p => p.tipo === filtro.value);
});

// ── Anotar e ajustar ──────────────────────────────────────────────────────────
// O MESMO modal serve para os dois. Uma tela de criar e outra de editar, com os
// mesmos oito campos, divergiriam no primeiro campo novo - foi assim que
// "editar" acabou não existindo até agora.
const novaAberta = ref(false);
const editandoId = ref(null);
const VAZIA = { titulo: '', detalhe: '', quando: '', prioridade: 2, repete: '', avisos: [], acompanhar: false, acompanharCada: 2, partes: '' };
const nova = ref({ ...VAZIA });

function abrirNova() {
  editandoId.value = null;
  nova.value = { ...VAZIA, avisos: [] };
  novaAberta.value = true;
}

/** Data do servidor → o formato que o <input datetime-local> entende. */
function paraCampo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

function abrirEdicao(t) {
  editandoId.value = t.id;
  nova.value = {
    titulo: t.titulo || '',
    detalhe: t.detalhe || '',
    quando: paraCampo(t.prazo),
    prioridade: t.prioridade || 2,
    repete: t.repete || '',
    avisos: [...(t.avisos || [])],
    acompanhar: !!t.acompanhar,
    acompanharCada: t.acompanharCada || 2,
    partes: '',
  };
  novaAberta.value = true;
}

// ── Parceria ──────────────────────────────────────────────────────────────────
const pessoasDe = ref(null);

// ── Convites esperando resposta ───────────────────────────────────────────────
// Ficam no TOPO, acima da lista. Um convite parado é a única coisa nesta tela
// que trava outra pessoa - deixá-lo na lateral, junto dos números, seria dar a
// ele o peso de um indicador.
const recusando = ref(null);
const motivoRecusa = ref('');

async function aceitar(c) {
  try {
    await a.responderConvite(c.id, true);
    toast.success(`Você entrou em "${c.titulo}".`);
  } catch (err) { toast.error(err?.message || 'Não foi possível.'); }
}

async function recusar(c) {
  try {
    await a.responderConvite(c.id, false, motivoRecusa.value);
    toast.success('Recusado. Avisei quem convidou.');
  } catch (err) { toast.error(err?.message || 'Não foi possível.'); }
  finally { recusando.value = null; motivoRecusa.value = ''; }
}

const ATALHOS_DATA = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'amanha', label: 'Amanhã' },
  { id: 'semana', label: 'Em 7 dias' },
];

function dataDoAtalho(id) {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  if (id === 'amanha') d.setDate(d.getDate() + 1);
  if (id === 'semana') d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 16);
}

async function salvarNova() {
  if (!nova.value.titulo.trim()) return;
  const dados = {
    titulo: nova.value.titulo,
    detalhe: nova.value.detalhe,
    prazo: nova.value.quando || null,
    prioridade: nova.value.prioridade,
    repete: nova.value.repete || null,
    avisos: nova.value.avisos,
    acompanhar: nova.value.acompanhar,
    acompanharCada: nova.value.acompanharCada,
  };

  try {
    if (editandoId.value) {
      await a.atualizar(editandoId.value, dados);
      if (nova.value.partes.trim()) await a.addSubtarefas(editandoId.value, nova.value.partes);
      toast.success('Ajustado.');
    } else {
      const t = await a.criar({ ...dados, itens: nova.value.partes || null });
      // As partes precisam voltar do servidor com id, senão a lista da tela
      // mostraria itens que não dá para riscar.
      if (nova.value.partes.trim()) await a.carregarTarefas();
      toast.success(nova.value.repete
        ? 'Anotado. Ela se recria sozinha depois de concluída.'
        : (t?.prazo ? 'Anotado. Eu aviso na hora certa.' : 'Anotado.'));
    }
    novaAberta.value = false;
  } catch (err) {
    toast.error(err?.message || 'Não foi possível salvar.');
  }
}

// ── Ações na pendência ────────────────────────────────────────────────────────
function resolver(p) {
  if (p.tipo === 'tarefa') return concluirTarefa(p);
  // O resto se resolve onde nasceu: mandar para lá é mais honesto que fingir
  // que dá para "concluir" um e-mail daqui.
  router.push(p.link || '/microsoft/outlook');
}

async function concluirTarefa(p) {
  const id = Number(p.refId);
  try {
    const r = await a.concluir(id);
    // O aviso É o desfazer: clicar nele reabre a tarefa.
    //
    // Concluir não pergunta "tem certeza?" - e essa escolha só se sustenta
    // porque existe volta. O toast fica 8s (o dobro do normal) porque é o
    // tempo de perceber o clique errado, e some sozinho quando não foi erro.
    const feito = r?.proxima
      ? `Feito. A próxima ficou para ${new Date(r.proxima.prazo).toLocaleDateString('pt-BR')}.`
      : 'Feito.';
    toast.success(`${feito}  ·  clique aqui para desfazer`, {
      timeout: 8000,
      onClick: () => desfazerConclusao(id),
    });
  } catch (err) {
    toast.error(err?.message || 'Não foi possível concluir.');
  }
}

async function desfazerConclusao(id) {
  try {
    const t = await a.reabrir(id);
    toast.success(`"${t.titulo}" voltou para a lista.`);
  } catch (err) {
    toast.error(err?.message || 'Não foi possível reabrir.');
  }
}

async function descartarTarefa(p) {
  const ok = await pedirConfirmacao({
    title: 'Tirar esta tarefa da lista?',
    consequence: `"${p.titulo}" some da sua lista sem ser marcada como feita. Não dá para trazer de volta pela tela.`,
    confirmLabel: 'Tirar da lista',
  });
  if (!ok) return;
  try { await a.descartar(Number(p.refId)); toast.success('Tirada da lista.'); }
  catch (err) { toast.error(err?.message || 'Não foi possível.'); }
}

// ── Preferências ──────────────────────────────────────────────────────────────
const prefsAberta = ref(false);

async function mudarPref(campo, valor) {
  try {
    await a.salvarSettings({ [campo]: valor });
    toast.success('Salvo.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível salvar.');
  }
}

async function sincronizar() {
  try {
    const r = await a.sincronizar();
    toast.success(r.criadas || r.fechadas
      ? `${r.criadas} tarefa(s) criada(s) do e-mail, ${r.fechadas} fechada(s).`
      : 'Tudo em dia.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível sincronizar.');
  }
}

// ── Formatação ────────────────────────────────────────────────────────────────
// Dias de CALENDÁRIO, não de 24 horas corridas: contando por horas, uma tarefa
// para hoje às 12h lida às 10h dava "em 1d". Quem lê a etiqueta quer o dia.
function prazoCurto(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const soDia = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dias = Math.round((soDia(d) - soDia(agora.value)) / 86400000);
  if (dias === 0) {
    // No mesmo dia, a hora é o que importa - inclusive para dizer que passou.
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return d < agora.value ? `passou (${hora})` : `hoje ${hora}`;
  }
  if (dias < 0) return `${Math.abs(dias)}d atrás`;
  if (dias === 1) return 'amanhã';
  if (dias <= 7) return `em ${dias}d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function minutosAte(iso) {
  return Math.max(0, Math.round((new Date(iso).getTime() - agora.value.getTime()) / 60000));
}
</script>

<template>
  <PageContainer>
    <PageHeader title="Meu dia" :subtitle="a.dia?.resumo || 'Juntando o que precisa de você...'"
      icon="fas fa-compass">
      <template #actions>
        <Button icon="fas fa-plus" @click="abrirNova">Anotar</Button>
        <Button variant="ghost" icon="fas fa-list-check" title="Checklist da equipe"
          @click="router.push('/checklist')" />
        <Button variant="ghost" icon="fas fa-inbox" title="Caixa de entrada"
          @click="router.push('/microsoft/outlook')" />
        <Button variant="ghost" icon="fas fa-calendar-days" title="Agenda e reuniões"
          @click="router.push('/microsoft/teams?tab=agenda')" />
        <Button variant="ghost" icon="fas fa-sliders" title="Como quero ser avisado"
          @click="prefsAberta = true" />
        <Button variant="ghost" icon="fas fa-rotate" :loading="a.carregando" @click="sincronizar" />
        <PageHelp
          storage-key="assistente"
          title="Como usar o Meu dia"
          intro="É a lista única do que precisa de você: agenda, e-mail que pede decisão, texto esperando seu OK, prazo e tarefa - tudo junto, ordenado por urgência."
          :steps="[
            { title: 'Nada aqui é cópia', text: 'A pendência que nasce de um e-mail é lida do e-mail na hora. Se você responder lá, ela some daqui sozinha - não existem duas listas para manter.' },
            { title: 'Anotar', text: 'O botão Anotar cria uma tarefa sua. Se marcar prazo, o Office te avisa quando chegar perto. Se marcar repetição, concluir cria a próxima.' },
            { title: 'Resolver', text: 'Tarefa você conclui aqui. E-mail, aprovação e prazo abrem onde se resolvem: fingir que dá para concluir um e-mail nesta tela seria mentira.' },
            { title: 'Partes e avisos', text: 'Uma tarefa pode ser dividida em partes que você risca separado, e ter vários avisos: 2 dias antes E 1 hora antes. Mudar o prazo move todos os avisos junto.' },
            { title: 'Fazer junto', text: 'Quem está abaixo de você no organograma entra na hora. Todo o resto - mesmo nível, acima, ou quem não está no organograma - recebe um pedido e decide. O pedido volta a aparecer até ser respondido, e só some sozinho se a tarefa for concluída, se o prazo passar ou se quem pediu desistir. Vale igual no Checklist.' },
            { title: 'Pela Eme', text: 'Diga “me lembra de ligar para a Julia amanhã, 2 dias antes” e ela anota. “Adiciona Marília e Sinop no do Alelo” ajusta a que já existe. “Põe o Lúcio junto” segue a mesma regra do organograma.' },
          ]"
          :tips="[
            'O resumo do dia chega no sino na hora que você escolher, em dia útil.',
            'Coisa parada há dias vira uma cobrança no fim da tarde - sem push, porque não é urgência.',
          ]" />
      </template>
    </PageHeader>

    <!-- Carregando -->
    <template v-if="a.carregando && !a.dia">
      <Skeleton class="h-28 rounded-2xl mb-3" />
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton class="h-96 rounded-2xl" />
        <Skeleton class="h-64 rounded-2xl" />
      </div>
    </template>

    <template v-else-if="a.dia">
      <!-- Saudação + o que acontece agora -->
      <section class="rounded-2xl border p-5 mb-3 animate-slide-up transition-colors duration-420"
        :class="a.acontecendoAgora
          ? 'border-accent/30 bg-gradient-to-br from-accent-soft to-surface-raised'
          : 'border-line bg-surface-raised'">
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div class="min-w-0">
            <h2 class="text-xl font-bold text-ink leading-tight">
              {{ saudacao }}<span v-if="primeiroNome">, {{ primeiroNome }}</span>
            </h2>
            <p class="text-sm text-ink-muted capitalize mt-0.5">{{ dataLonga }}</p>
            <p class="text-[0.95rem] text-ink mt-2.5 max-w-[70ch] leading-relaxed">{{ a.dia.resumo }}</p>
          </div>

          <!-- O compromisso de agora, ou o próximo -->
          <div v-if="a.acontecendoAgora || a.proximo"
            class="rounded-xl border px-4 py-3 min-w-[13rem] animate-pop-in"
            :class="a.acontecendoAgora ? 'border-accent/30 bg-surface-raised' : 'border-line bg-surface-sunken'">
            <p class="flex items-center gap-2 text-micro font-semibold uppercase tracking-wide"
              :class="a.acontecendoAgora ? 'text-accent' : 'text-ink-subtle'">
              <span v-if="a.acontecendoAgora" class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
              {{ a.acontecendoAgora ? 'Acontecendo agora' : 'A seguir' }}
            </p>
            <p class="text-sm font-semibold text-ink mt-1 truncate max-w-[16rem]">
              {{ (a.acontecendoAgora || a.proximo).titulo }}
            </p>
            <p class="text-micro text-ink-muted mt-0.5">
              {{ (a.acontecendoAgora || a.proximo).hora }}
              <span v-if="!a.acontecendoAgora && a.proximo">
                · em {{ minutosAte(a.proximo.inicio) }} min
              </span>
            </p>
            <a v-if="(a.acontecendoAgora || a.proximo).joinUrl"
              :href="(a.acontecendoAgora || a.proximo).joinUrl" target="_blank" rel="noopener"
              class="inline-flex items-center gap-1.5 mt-2 text-micro font-medium text-accent hover:underline">
              <i class="fas fa-video"></i> Entrar
            </a>
          </div>
        </div>

        <!-- Sem conta Microsoft, metade das fontes não existe: dizer é melhor
             que mostrar uma lista curta sem explicação. -->
        <p v-if="!a.dia.temMicrosoft"
          class="flex items-start gap-2 mt-3 text-micro text-data-warn">
          <i class="fas fa-circle-info mt-0.5"></i>
          Sua conta Microsoft não está vinculada, então agenda e e-mail ficaram de fora desta lista.
        </p>
      </section>

      <!-- ── Convites esperando VOCÊ ─────────────────────────────────────
           Acima de tudo, e não na lateral: é a única coisa desta tela em que
           outra pessoa está parada esperando uma resposta sua. -->
      <TransitionGroup tag="div" data-convites class="flex flex-col gap-2 mb-3"
        enter-active-class="transition duration-420 ease-out-expo"
        enter-from-class="opacity-0 -translate-y-2"
        leave-active-class="transition duration-200 ease-out-expo"
        leave-to-class="opacity-0 translate-x-4">
        <article v-for="c in a.convites" :key="c.id"
          class="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent-soft to-surface-raised
                 p-4 animate-pop-in">
          <div class="flex items-start gap-3 flex-wrap">
            <span class="w-9 h-9 shrink-0 grid place-items-center rounded-xl bg-surface-raised
                         border border-accent/30 text-accent">
              <i class="fas fa-handshake"></i>
            </span>

            <div class="flex-1 min-w-0">
              <p class="text-micro font-semibold uppercase tracking-wide text-accent">
                {{ c.onde === 'checklist' || c.escopo === 'checklist' ? 'Checklist' : 'Tarefa' }}
                <span v-if="c.esperando" class="normal-case tracking-normal font-normal text-ink-subtle">
                  · esperando há {{ c.esperando }}
                </span>
              </p>
              <h4 class="text-sm font-semibold text-ink mt-0.5">
                {{ c.de || 'Alguém' }} quer você junto em "{{ c.titulo }}"
              </h4>
              <p v-if="c.mensagem" class="text-xs text-ink-muted mt-1 leading-relaxed">"{{ c.mensagem }}"</p>
              <p class="text-micro text-ink-subtle mt-1">
                Enquanto você não responder, este pedido continua aparecendo aqui - não há um prazo
                em que ele desista sozinho.
              </p>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <Button size="sm" variant="primary" icon="fas fa-check" @click="aceitar(c)">Aceitar</Button>
              <Button size="sm" variant="ghost" class="text-ink-subtle"
                @click="recusando = (recusando === c.id ? null : c.id); motivoRecusa = ''">
                Recusar
              </Button>
            </div>
          </div>

          <!-- Recusar pede um motivo: quem convidou recebe a resposta, e "não"
               sem explicação obriga a pessoa a perguntar de novo. -->
          <Transition
            enter-active-class="transition duration-200 ease-out-expo"
            enter-from-class="opacity-0 -translate-y-1"
            leave-active-class="transition duration-120" leave-to-class="opacity-0">
            <div v-if="recusando === c.id" class="flex items-center gap-2 mt-3 pt-3 border-t border-line">
              <input v-model="motivoRecusa" type="text" placeholder="Por quê? (opcional, vai para quem convidou)"
                @keydown.enter="recusar(c)"
                class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-line bg-surface-sunken
                       text-ink text-xs outline-none focus:border-accent/50" />
              <Button size="sm" variant="outline" @click="recusar(c)">Recusar</Button>
            </div>
          </Transition>
        </article>
      </TransitionGroup>

      <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_19rem] items-start">

        <!-- ── A lista ──────────────────────────────────────────────── -->
        <section class="rounded-2xl border border-line bg-surface-raised p-4">
          <div class="flex items-center gap-1.5 flex-wrap mb-3">
            <button v-for="f in FILTROS" :key="f.id" type="button" @click="filtro = f.id"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-9 rounded-lg text-micro font-medium
                     border transition-all duration-120 ease-out-expo"
              :class="filtro === f.id
                ? 'bg-accent-soft border-accent/40 text-accent'
                : 'border-line text-ink-muted hover:text-ink hover:border-line-strong'">
              {{ f.label }}
              <span class="tabular-nums opacity-70">{{ f.n }}</span>
            </button>
          </div>

          <EmptyState v-if="!visiveis.length" icon="fas fa-mug-hot" size="sm"
            :title="filtro === 'tudo' ? 'Nada pendente' : 'Nada neste filtro'"
            :description="filtro === 'tudo'
              ? 'Sua agenda está limpa e ninguém está esperando por você.'
              : 'Troque o filtro para ver o resto.'" />

          <TransitionGroup v-else tag="div" class="flex flex-col gap-2"
            enter-active-class="transition duration-200 ease-out-expo"
            enter-from-class="opacity-0 -translate-y-1"
            leave-active-class="transition duration-200 ease-out-expo absolute"
            leave-to-class="opacity-0 translate-x-3">
            <article v-for="(p, i) in visiveis" :key="p.id"
              class="group rounded-xl border bg-surface-sunken p-3 animate-slide-up
                     transition-all duration-200 ease-out-expo hover:shadow-soft"
              :class="p.urgencia === 1 ? 'border-data-warn/30' : 'border-line hover:border-accent/40'"
              :style="{ animationDelay: `${Math.min(i, 12) * 40}ms` }">

              <div class="flex items-start gap-2.5">
                <i :class="[tipoDe(p.tipo).icone, tipoDe(p.tipo).cor]"
                  class="text-xs mt-0.5 w-4 text-center shrink-0"></i>

                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-2 flex-wrap">
                    <h4 class="text-sm font-semibold text-ink truncate flex-1 min-w-0">{{ p.titulo }}</h4>
                    <span v-if="p.prazo"
                      class="text-micro font-semibold px-1.5 py-0.5 rounded-md shrink-0 tabular-nums"
                      :class="p.urgencia === 1 ? 'text-data-warn bg-data-warn-soft' : 'text-ink-muted bg-surface-raised'">
                      {{ prazoCurto(p.prazo) }}
                    </span>
                  </div>

                  <p v-if="p.detalhe" class="text-xs text-ink-muted mt-1 leading-relaxed line-clamp-2">
                    {{ p.detalhe }}
                  </p>

                  <p class="text-micro text-ink-subtle mt-1">
                    {{ tipoDe(p.tipo).label }}<span v-if="p.de"> · {{ p.de }}</span>
                  </p>
                </div>
              </div>

              <!-- Partes, parceiros e acompanhamento: sempre visíveis na tarefa.
                   Escondê-los atrás do hover faria o "2 de 3" - que é o dado que
                   diz se ainda falta algo - depender de o mouse estar em cima. -->
              <TarefaDetalhe v-if="p.tipo === 'tarefa' && p.tarefa" :tarefa="p.tarefa"
                @concluir="concluirTarefa(p)" @pessoas="pessoasDe = $event" @editar="abrirEdicao($event)" />

              <div class="flex flex-wrap gap-1.5 mt-2.5 pl-6.5 opacity-0 max-h-0 overflow-hidden
                          group-hover:opacity-100 group-hover:max-h-16 focus-within:opacity-100
                          focus-within:max-h-16 transition-all duration-200 ease-out-expo">
                <Button size="sm" variant="primary"
                  :icon="p.tipo === 'tarefa' ? 'fas fa-check' : 'fas fa-arrow-right'"
                  @click="resolver(p)">
                  {{ p.acao }}
                </Button>
                <Button v-if="p.tipo === 'tarefa'" size="sm" variant="ghost" class="text-ink-subtle"
                  @click="descartarTarefa(p)">Tirar da lista</Button>
                <Button v-else size="sm" variant="ghost" class="text-ink-subtle"
                  @click="router.push(p.link)">Abrir onde nasceu</Button>
              </div>
            </article>
          </TransitionGroup>
        </section>

        <!-- ── A agenda do dia ──────────────────────────────────────── -->
        <div class="flex flex-col gap-3">
          <section class="rounded-2xl border border-line bg-surface-raised p-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold text-ink">Agenda de hoje</h3>
              <button type="button" class="text-micro text-accent hover:underline"
                @click="router.push('/microsoft/teams?tab=agenda')">ver tudo</button>
            </div>

            <EmptyState v-if="!a.agenda.length" icon="fas fa-calendar-check" size="sm"
              title="Dia livre" description="Nenhum compromisso na sua agenda hoje." />

            <div v-else class="flex flex-col">
              <div v-for="(e, i) in a.agenda" :key="e.id"
                class="flex items-start gap-2.5 py-2 border-b border-line-subtle last:border-0
                       animate-slide-up transition-opacity duration-200"
                :class="e.jaPassou ? 'opacity-45' : ''"
                :style="{ animationDelay: `${i * 40}ms` }">
                <span class="text-micro font-mono tabular-nums shrink-0 w-9 pt-0.5"
                  :class="e.agora ? 'text-accent font-bold' : 'text-ink-subtle'">{{ e.hora }}</span>
                <span class="flex-1 min-w-0">
                  <span class="block text-xs font-medium text-ink truncate">{{ e.titulo }}</span>
                  <span class="block text-micro text-ink-subtle">
                    <span v-if="e.agora" class="text-accent font-semibold">acontecendo agora · </span>
                    {{ e.participantes }} pessoa(s)<span v-if="e.online"> · Teams</span>
                  </span>
                </span>
                <a v-if="e.joinUrl && !e.jaPassou" :href="e.joinUrl" target="_blank" rel="noopener"
                  class="text-micro text-accent hover:underline shrink-0 pt-0.5">entrar</a>
              </div>
            </div>
          </section>

          <!-- Os números, cada um levando para onde se resolve -->
          <section class="rounded-2xl border border-line bg-surface-raised p-4">
            <h3 class="text-sm font-semibold text-ink mb-2">Em números</h3>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="k in [
                  { rot: 'Urgentes', v: a.numeros.urgentes, ir: () => (filtro = 'urgente') },
                  { rot: 'E-mail', v: a.numeros.emailsComDecisao, ir: () => router.push('/microsoft/outlook?tab=triagem') },
                  { rot: 'Esperando OK', v: a.numeros.esperandoOK, ir: () => router.push('/microsoft/outlook?tab=triagem') },
                  { rot: 'Tarefas', v: a.numeros.tarefasAbertas, ir: () => (filtro = 'tarefa') },
                ]" :key="k.rot" type="button" @click="k.ir()"
                class="group rounded-xl border border-line bg-surface-sunken px-3 py-2 text-left
                       hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-200 ease-out-expo">
                <p class="text-micro text-ink-subtle uppercase tracking-wide">{{ k.rot }}</p>
                <p class="text-metric-sm font-bold text-ink tabular-nums
                          group-hover:text-accent transition-colors duration-120">{{ k.v ?? 0 }}</p>
              </button>
            </div>
          </section>
        </div>
      </div>
    </template>

    <EmptyState v-else icon="fas fa-triangle-exclamation" size="lg"
      title="Não consegui montar o seu dia" :description="a.erro || 'Tente de novo em instantes.'">
      <template #actions>
        <Button variant="outline" icon="fas fa-rotate" @click="a.carregarDia()">Tentar de novo</Button>
      </template>
    </EmptyState>

    <!-- ── Anotar ─────────────────────────────────────────────────────── -->
    <Modal :open="novaAberta" size="md" :title="editandoId ? 'Ajustar a tarefa' : 'Anotar uma tarefa'"
      @close="novaAberta = false">
      <div class="space-y-3">
        <Input v-model="nova.titulo" label="O que precisa ser feito"
          placeholder="ex.: Ligar para a Julia sobre o laudo" autofocus />
        <Input v-model="nova.detalhe" label="Detalhe (opcional)" placeholder="Contexto que você não quer esquecer" />

        <div>
          <label class="block text-xs font-medium text-ink-muted mb-1.5">Prazo</label>
          <div class="flex gap-1.5 flex-wrap mb-2">
            <button v-for="d in ATALHOS_DATA" :key="d.id" type="button"
              @click="nova.quando = dataDoAtalho(d.id)"
              class="px-2.5 py-1.5 min-h-9 rounded-lg text-micro font-medium border border-line
                     text-ink-muted hover:text-accent hover:border-accent/40 transition-all duration-120">
              {{ d.label }}
            </button>
            <button v-if="nova.quando" type="button" @click="nova.quando = ''"
              class="px-2.5 py-1.5 min-h-9 rounded-lg text-micro text-ink-subtle hover:text-ink">
              sem prazo
            </button>
          </div>
          <input v-model="nova.quando" type="datetime-local"
            class="w-full px-3 py-2 rounded-lg border border-line bg-surface-sunken text-ink text-sm
                   outline-none focus:border-accent/50" />
        </div>

        <!-- Quando avisar: vários, e contados a partir do prazo -->
        <AvisosPicker v-model="nova.avisos" :tem-prazo="!!nova.quando" />

        <!-- As partes -->
        <div>
          <label class="block text-xs font-medium text-ink-muted mb-1.5">
            {{ editandoId ? 'Somar partes' : 'Dividir em partes (opcional)' }}
          </label>
          <textarea v-model="nova.partes" rows="2"
            placeholder="ex.: Marília, Sinop — uma por linha ou separadas por vírgula"
            class="w-full px-3 py-2 rounded-lg border border-line bg-surface-sunken text-ink text-sm
                   outline-none focus:border-accent/50 resize-y"></textarea>
          <p class="text-micro text-ink-subtle mt-1">
            Cada parte vira um item que você risca separado.<span v-if="editandoId">
            O que já existe continua lá.</span>
          </p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-ink-muted mb-1.5">Prioridade</label>
            <div class="flex gap-1">
              <button v-for="p in [{ v: 1, l: 'Alta' }, { v: 2, l: 'Normal' }, { v: 3, l: 'Baixa' }]" :key="p.v"
                type="button" @click="nova.prioridade = p.v"
                class="flex-1 px-2 py-1.5 min-h-9 rounded-lg text-micro font-medium border transition-all duration-120"
                :class="nova.prioridade === p.v
                  ? 'bg-accent-soft border-accent/40 text-accent'
                  : 'border-line text-ink-muted hover:text-ink'">{{ p.l }}</button>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-ink-muted mb-1.5">Repete</label>
            <select v-model="nova.repete"
              class="w-full px-2.5 py-2 min-h-9 rounded-lg border border-line bg-surface-sunken
                     text-ink text-xs outline-none focus:border-accent/50">
              <option value="">não repete</option>
              <option value="dias_uteis">todo dia útil</option>
              <option value="diaria">todo dia</option>
              <option value="semanal">toda semana</option>
              <option value="quinzenal">a cada 15 dias</option>
              <option value="mensal">todo mês</option>
            </select>
          </div>
        </div>

        <p v-if="nova.repete" class="text-micro text-ink-subtle">
          Ao concluir, a próxima é criada sozinha.
        </p>

        <!-- Acompanhamento: a tarefa que depende de OUTRA pessoa responder -->
        <div class="p-3 rounded-xl border border-line bg-surface-sunken">
          <Switch v-model="nova.acompanhar" size="sm" label="Ficar me cobrando disso" />
          <p class="text-micro text-ink-subtle mt-1.5 leading-relaxed">
            Para o que depende de outra pessoa responder. Enquanto estiver aberta, eu volto a lembrar
            de tempos em tempos - mesmo sem prazo.
          </p>
          <div v-if="nova.acompanhar" class="flex items-center gap-2 mt-2">
            <span class="text-micro text-ink-muted">a cada</span>
            <input v-model.number="nova.acompanharCada" type="number" min="1" max="30"
              class="w-16 px-2 py-1 rounded-lg border border-line bg-surface text-ink text-sm
                     tabular-nums outline-none focus:border-accent/50" />
            <span class="text-micro text-ink-muted">dia(s)</span>
          </div>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="novaAberta = false">Cancelar</Button>
        <div class="flex-1"></div>
        <Button variant="primary" icon="fas fa-check" :disabled="!nova.titulo.trim()" @click="salvarNova">
          {{ editandoId ? 'Salvar' : 'Anotar' }}
        </Button>
      </template>
    </Modal>

    <!-- ── Fazer junto com ────────────────────────────────────────────── -->
    <ParceriaModal :open="!!pessoasDe" escopo="assistente" :id="pessoasDe?.id"
      :titulo="pessoasDe?.titulo" :parceiros="pessoasDe?.parceiros || []"
      @close="pessoasDe = null" @mudou="a.carregarTarefas()" />

    <!-- ── Como quero ser avisado ─────────────────────────────────────── -->
    <Modal :open="prefsAberta" size="sm" title="Como quero ser avisado" @close="prefsAberta = false">
      <div v-if="a.settings" class="space-y-3">
        <div class="p-3 rounded-xl border border-line bg-surface-sunken">
          <Switch :model-value="a.settings.resumo_diario" size="sm" label="Resumo do dia"
            @change="mudarPref('resumo_diario', $event)" />
          <p class="text-micro text-ink-subtle mt-1.5 leading-relaxed">
            Uma vez por dia útil, com os compromissos e o que espera por você.
          </p>
          <div v-if="a.settings.resumo_diario" class="flex items-center gap-2 mt-2">
            <span class="text-micro text-ink-muted">às</span>
            <input type="number" min="0" max="23" :value="a.settings.resumo_hora"
              @change="mudarPref('resumo_hora', Number($event.target.value))"
              class="w-16 px-2 py-1 rounded-lg border border-line bg-surface text-ink text-sm
                     tabular-nums outline-none focus:border-accent/50" />
            <span class="text-micro text-ink-muted">horas</span>
          </div>
        </div>

        <div class="p-3 rounded-xl border border-line bg-surface-sunken">
          <Switch :model-value="a.settings.alerta_prazo" size="sm" label="Avisar de prazo chegando"
            @change="mudarPref('alerta_prazo', $event)" />
          <p class="text-micro text-ink-subtle mt-1.5">
            Na hora que você marcou em cada tarefa - "1h antes" chega 1h antes mesmo.
          </p>
        </div>

        <div class="p-3 rounded-xl border border-line bg-surface-sunken">
          <Switch :model-value="a.settings.alerta_parado" size="sm" label="Cobrar o que está parado"
            @change="mudarPref('alerta_parado', $event)" />
          <p class="text-micro text-ink-subtle mt-1.5">
            No fim da tarde, sem vibrar o celular: é cobrança de coisa antiga, não urgência.
          </p>
        </div>

        <div class="p-3 rounded-xl border border-line bg-surface-sunken">
          <Switch :model-value="a.settings.criar_tarefa_de_email" size="sm"
            label="E-mail importante vira tarefa"
            @change="mudarPref('criar_tarefa_de_email', $event)" />
          <p class="text-micro text-ink-subtle mt-1.5">
            Só o que a IA marcou como crítico ou de decisão. Responder o e-mail fecha a tarefa sozinho.
          </p>
        </div>

        <div class="p-3 rounded-xl border border-line bg-surface-sunken">
          <Switch :model-value="a.settings.por_email" size="sm" label="Mandar também por e-mail"
            @change="mudarPref('por_email', $event)" />
          <p class="text-micro text-ink-subtle mt-1.5">
            Além do sino. Mensagem no Teams ainda não é possível: depende de registrar o Office como
            aplicativo do Teams.
          </p>
        </div>
      </div>
      <Skeleton v-else class="h-64 rounded-xl" />
    </Modal>
  </PageContainer>
</template>
