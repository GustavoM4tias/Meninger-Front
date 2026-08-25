<script setup>
// Outlook › aba Triagem. A porta de entrada do e-mail.
//
// A pergunta que ela responde é "o que eu preciso fazer?", não "o que chegou?".
// Por isso a lista é ordenada por IMPACTO (crítico, alto, médio) e, dentro da
// mesma classe, por prazo mais próximo - nunca por hora de chegada.
//
// Cada linha diz POR QUE está ali. Lista de prioridade sem o porquê é opinião:
// a pessoa não tem como discordar do que não sabe como foi decidido. E quando a
// IA quis fazer mais do que pôde, a linha mostra o que a rebaixou ("seu nível 2
// rebaixa de responder para pedir OK") - a regra da tela é a mesma da API.
//
// O resumo do topo é montado dos NÚMEROS, não escrito por modelo: ele precisa
// estar certo sempre, inclusive quando o Gemini não responde.

import { ref, computed, inject, onMounted, onActivated } from 'vue';
import { useToast } from 'vue-toastification';
import { useOutlookAiStore } from '@/stores/Microsoft/outlookAiStore';
import { useOutlookStore } from '@/stores/Microsoft/outlookStore';
import { pedirConfirmacao } from '@/composables/useConfirm';

import Button from '@/components/UI/Button.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import PessoaCard from './PessoaCard.vue';

const props = defineProps({
  podeEnviar: { type: Boolean, default: false },
  podeOrganizar: { type: Boolean, default: false },
  podeAutomatizar: { type: Boolean, default: false },
});

const ai = useOutlookAiStore();
const store = useOutlookStore();
const toast = useToast();
const escrever = inject('olEscrever', () => {});

// Qual linha está ocupada. Um flag por item, nunca global: com um só, clicar
// numa deixava a lista inteira girando.
const ocupado = ref(null);
const setTab = inject('olSetTab', () => {});
const abrirEmail = inject('olAbrirEmail', () => {});
const verRecorte = inject('olVerRecorte', () => {});

// KeepAlive: voltar para a aba não deve refazer a triagem (que chama o modelo),
// mas depois de 5 minutos vale atualizar - e-mail chega o tempo todo. O carimbo
// é local: o painel vem do servidor e não carrega hora de leitura.
const lidoEm = ref(0);

/**
 * Duas etapas, e a ordem é o que faz a tela abrir rápido:
 *
 *   1. o painel do CACHE, que responde em milissegundos e já pinta tudo
 *   2. a leitura do que chegou, que fala com o Graph e com o modelo
 *
 * Antes as duas aconteciam na mesma requisição e a tela ficava até 25 segundos
 * em branco esperando o Gemini classificar 40 e-mails.
 */
async function carregar({ force = false } = {}) {
  if (!ai.painel || force) await ai.carregarPainel();
  lidoEm.value = Date.now();
  ai.atualizarPainel({ force });
}

onMounted(() => {
  if (!ai.painel) ai.carregarPainel();
  // Sai da frente do primeiro render: o que importa é a tela aparecer.
  requestAnimationFrame(() => {
    ai.atualizarPainel();
    lidoEm.value = Date.now();
  });
});

onActivated(() => {
  // Voltar para a aba não refaz a leitura antes de 5 min: e-mail chega o tempo
  // todo, mas não a ponto de justificar chamar o modelo a cada clique de aba.
  if (Date.now() - lidoEm.value > 5 * 60_000) carregar();
});

const carregando = computed(() => ai.carregandoPainel && !ai.painel);
const m = computed(() => ai.painel?.metricas || {});

const dataLonga = computed(() =>
  new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
);

// ── O resumo ──────────────────────────────────────────────────────────────────
// Frase montada dos números. Nada aqui é gerado: se disser "quatro precisam de
// você", são quatro linhas na lista abaixo.
const resumo = computed(() => {
  if (!ai.painel) return '';
  const { chegaram = 0, tratados = 0, precisamDeVoce = 0, comPrazoLegal = 0, ruido = 0 } = m.value;

  if (!chegaram && !precisamDeVoce) {
    return 'Nada novo desde ontem. Quando chegar e-mail, ele aparece aqui já classificado - '
      + 'e o que depender de você fica no topo.';
  }

  const rascunhos = m.value.rascunhos || 0;

  const partes = [];
  partes.push(chegaram === 1 ? 'Chegou 1 e-mail nas últimas 24 horas.' : `Chegaram ${chegaram} e-mails nas últimas 24 horas.`);

  // "Tratado" é o que ela RESOLVEU (arquivou, respondeu). Rascunho não é
  // tratamento: ele está na fila esperando você, e juntar os dois fazia a tela
  // dizer que a IA cuidou de coisas que continuavam paradas.
  if (tratados) partes.push(`Ela resolveu ${tratados} sozinha.`);
  if (rascunhos) {
    partes.push(rascunhos === 1
      ? 'Escreveu 1 resposta que está esperando o seu OK no painel da direita.'
      : `Escreveu ${rascunhos} respostas que estão esperando o seu OK no painel da direita.`);
  }
  if (!tratados && !rascunhos && ruido) {
    partes.push(`${ruido} deles são ruído: newsletter, confirmação automática e cópia de sistema.`);
  }

  if (!precisamDeVoce) {
    partes.push('Nenhum depende de uma decisão sua neste momento.');
  } else {
    // "Na caixa" de propósito: chegaram/ruído são das últimas 24h, mas o que
    // espera decisão é saldo acumulado. Sem esta palavra a frase daria a
    // entender que os dois números falam do mesmo lote.
    partes.push(precisamDeVoce === 1
      ? 'Na caixa, um depende de uma decisão sua.'
      : `Na caixa, ${precisamDeVoce} dependem de uma decisão sua.`);
    if (comPrazoLegal) {
      const primeiro = (ai.painel.prioritarios || []).find(p => p.classe === 'critica');
      partes.push(comPrazoLegal === 1
        ? `E um deles tem prazo${primeiro?.prazo ? ` que vence ${primeiro.prazo}` : ' legal'}.`
        : `E ${comPrazoLegal} deles têm prazo legal.`);
    }
  }
  return partes.join(' ');
});

// ── Métricas ──────────────────────────────────────────────────────────────────
// Cada número leva para onde ele é resolvido. Número que não é clicável obriga a
// pessoa a procurar de novo o que a tela acabou de mostrar.
const metricas = computed(() => [
  {
    rotulo: 'Chegaram', valor: m.value.chegaram ?? 0, nota: 'nas últimas 24h',
    icone: 'fas fa-inbox', cor: 'text-ink-subtle', ir: () => verRecorte(null),
  },
  {
    rotulo: 'Ela resolveu', valor: m.value.tratados ?? 0,
    nota: m.value.rascunhos ? `+ ${m.value.rascunhos} esperando OK` : 'sem você abrir',
    icone: 'fas fa-robot', cor: 'text-accent', ir: irParaFeito,
  },
  {
    rotulo: 'Precisam de você', valor: m.value.precisamDeVoce ?? 0,
    nota: m.value.comPrazoLegal ? `${m.value.comPrazoLegal} com prazo` : 'sem prazo crítico',
    icone: 'fas fa-hand-point-up', cor: m.value.comPrazoLegal ? 'text-data-warn' : 'text-ink-subtle',
    destaque: !!m.value.comPrazoLegal, ir: () => verRecorte('precisa'),
  },
  {
    rotulo: 'Ruído', valor: m.value.ruido ?? 0, nota: 'confira se ela não errou',
    icone: 'fas fa-filter', cor: 'text-ink-subtle', ir: () => verRecorte('ruido'),
  },
]);

// ── Cor da classe ─────────────────────────────────────────────────────────────
// Cor de ESTADO, nunca sozinha: toda ocorrência vem com o rótulo escrito ao lado.
const CLASSES = {
  critica: { label: 'Prazo legal', ponto: 'bg-data-neg', texto: 'text-data-neg', borda: 'border-data-neg/30', tinta: 'bg-data-neg-soft' },
  alta:    { label: 'Decisão',     ponto: 'bg-data-warn', texto: 'text-data-warn', borda: 'border-data-warn/30', tinta: 'bg-data-warn-soft' },
  media:   { label: 'Responder',   ponto: 'bg-accent',    texto: 'text-accent',    borda: 'border-accent/25',    tinta: 'bg-accent-soft' },
  ruido:   { label: 'Ruído',       ponto: 'bg-ink-subtle', texto: 'text-ink-subtle', borda: 'border-line',       tinta: 'bg-surface-sunken' },
};
const classeDe = (c) => CLASSES[c] || CLASSES.media;

const COMPORTAMENTO = {
  responder: 'ela responde sozinha',
  aprovar: 'ela escreve e espera seu OK',
  notificar: 'ela só te avisa',
  silenciar: 'ela fica em silêncio',
};

// Leva o olho até a lista do que ela fez, nesta mesma tela, e pisca uma vez
// para a pessoa achar onde parou.
const blocoFeito = ref(null);
const destacando = ref(false);

function irParaFeito() {
  blocoFeito.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  destacando.value = true;
  setTimeout(() => { destacando.value = false; }, 1600);
}

function quando(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return 'ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// ── Ações ─────────────────────────────────────────────────────────────────────

/**
 * Passar para frente. É a saída que faltava: "precisa de você" nem sempre quer
 * dizer que a resposta é sua - às vezes é da engenharia, do financeiro, de
 * quem cuida daquele contrato. Sem isto a única alternativa a responder era
 * fingir que o e-mail não existe.
 *
 * O encaminhamento é montado pelo PRÓPRIO Outlook (createForward), com o
 * histórico junto, igual ao que a pessoa veria lá.
 */
async function encaminhar(p) {
  ocupado.value = p.messageId;
  try {
    const rascunho = await store.startReply(p.messageId, 'forward');
    escrever(rascunho);
  } catch (err) {
    toast.error(err?.message || 'Não foi possível preparar o encaminhamento.');
  } finally {
    ocupado.value = null;
  }
}

/** Tira da caixa de verdade, não só da lista. Tem desfazer pelo histórico. */
async function arquivar(p) {
  const ok = await pedirConfirmacao({
    title: 'Arquivar este e-mail?',
    consequence: `"${p.assunto}" sai da Caixa de Entrada e vai para o Arquivo Morto, `
      + 'aqui e no seu Outlook. Ele continua existindo e dá para achar na busca.',
    confirmLabel: 'Arquivar',
  });
  if (!ok) return;

  ocupado.value = p.messageId;
  try {
    await store.moveMessage(p.messageId, 'archive');
    await ai.resolver(p.messageId, 'nao_precisa', 'arquivado direto da triagem');
    toast.success('Arquivado.');
  } catch (err) {
    const msg = /permiss|forbidden|accessdenied/i.test(err?.message || '')
      ? 'Arquivar depende da permissão Mail.ReadWrite no Azure.'
      : (err?.message || 'Não foi possível arquivar.');
    toast.error(msg);
  } finally {
    ocupado.value = null;
  }
}

async function redigir(p) {
  try {
    await ai.redigir(p.messageId);
    toast.success('Rascunho pronto no painel da direita, esperando o seu OK.');
  } catch (err) {
    toast.error(err?.message || 'Não consegui redigir agora.');
  }
}

// ── Tirar da lista ────────────────────────────────────────────────────────────
// "Adiar" era a única saída e ela mente: devolve o e-mail amanhã mesmo quando
// você já resolveu. Agora a saída pede o motivo - e o motivo é o que ensina a
// IA a não insistir no mesmo tipo de mensagem.
const menuAberto = ref(null);   // messageId com o menu de motivos aberto
const notaMotivo = ref('');

const MOTIVOS_FALLBACK = [
  { id: 'ja_respondi', label: 'já respondi por fora' },
  { id: 'outra_pessoa', label: 'outra pessoa vai cuidar' },
  { id: 'nao_precisa', label: 'não precisa de resposta' },
  { id: 'resolvido_fora', label: 'resolvido fora do e-mail' },
  { id: 'adiado', label: 'adiado para depois' },
];
const motivos = computed(() => ai.painel?.motivos?.length ? ai.painel.motivos : MOTIVOS_FALLBACK);

function abrirMenu(p) {
  menuAberto.value = menuAberto.value === p.messageId ? null : p.messageId;
  notaMotivo.value = '';
}

async function resolver(p, motivo) {
  menuAberto.value = null;
  try {
    const r = await ai.resolver(p.messageId, motivo.id, notaMotivo.value);
    notaMotivo.value = '';
    toast.success(`Saiu da lista: ${r?.rotulo || motivo.label}. O e-mail continua na caixa.`);
  } catch (err) {
    toast.error(err?.message || 'Não foi possível tirar da lista.');
  }
}

async function desfazer(a) {
  try {
    await ai.desfazer(a.id);
    toast.success('Ação desfeita: o e-mail voltou para a Caixa de Entrada.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível desfazer.');
  }
}
</script>

<template>
  <div class="space-y-4">

    <!-- Cabeçalho -->
    <div class="flex items-end justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-xl font-bold text-ink leading-tight">Triagem de hoje</h2>
        <p class="text-sm text-ink-muted capitalize">{{ dataLonga }}</p>
      </div>
      <div class="flex gap-2">
        <Button v-if="podeAutomatizar" size="sm" variant="outline" icon="fas fa-robot" @click="setTab('automacoes')">
          Automações
        </Button>
        <Button size="sm" variant="outline" icon="fas fa-chart-line" @click="setTab('relatorios')">
          Relatório
        </Button>
        <Button size="sm" variant="ghost" icon="fas fa-rotate"
          :loading="ai.carregandoPainel" @click="carregar({ force: true })">
          Reler
        </Button>
      </div>
    </div>

    <!-- A IA está lendo AGORA, com a tela já montada. Faixa fina de propósito:
         não é bloqueio, é aviso de que o número pode mudar em instantes. -->
    <Transition
      enter-active-class="transition duration-200 ease-out-expo"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-200" leave-to-class="opacity-0">
      <div v-if="ai.lendo && ai.painel"
        class="flex items-center gap-2 px-3 py-2 rounded-xl border border-accent/25 bg-accent-soft">
        <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0"></span>
        <p class="text-micro text-accent">Lendo o que chegou desde a última vez...</p>
      </div>
    </Transition>

    <!-- Esqueleto: a forma do que vem, para a tela não parecer quebrada no
         primeiro acesso (que é justamente o mais lento). -->
    <template v-if="carregando">
      <Skeleton class="h-28 rounded-2xl" />
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Skeleton v-for="i in 4" :key="i" class="h-20 rounded-2xl" />
      </div>
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Skeleton class="h-72 rounded-2xl" />
        <Skeleton class="h-72 rounded-2xl" />
      </div>
    </template>

    <template v-else-if="ai.painel">

      <!-- ── O resumo ─────────────────────────────────────────────────── -->
      <section class="relative overflow-hidden rounded-2xl border border-accent/25 p-5
                      bg-gradient-to-br from-accent-soft to-surface-raised animate-slide-up">
        <p class="flex items-center gap-2 text-micro font-semibold uppercase tracking-wide text-accent">
          <i class="fas fa-wand-magic-sparkles"></i>
          Resumo da caixa
        </p>
        <p class="mt-2 text-[0.95rem] leading-relaxed text-ink max-w-[78ch] text-pretty">{{ resumo }}</p>

        <div class="flex flex-wrap gap-2 mt-4">
          <Button v-if="m.precisamDeVoce" size="sm" variant="primary" icon="fas fa-inbox" @click="verRecorte('precisa')">
            Abrir {{ m.precisamDeVoce === 1 ? 'o que precisa' : `os ${m.precisamDeVoce} que precisam` }} de você
          </Button>
          <!-- Levava para Automações, que é a tela de CONFIGURAÇÃO - a pessoa
               clicava em "ver o que ela fez" e caía num painel dizendo que a
               execução automática está desligada. O que ela fez está logo
               abaixo, nesta mesma tela. -->
          <Button v-if="m.tratados || m.rascunhos" size="sm" variant="ghost"
            icon="fas fa-list-check" @click="irParaFeito">
            Ver o que ela fez
          </Button>
        </div>
      </section>

      <!-- ── Números ──────────────────────────────────────────────────── -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <button v-for="(k, i) in metricas" :key="k.rotulo" type="button" @click="k.ir()"
          class="group rounded-2xl border bg-surface-raised px-3.5 py-3 text-left animate-slide-up
                 hover:-translate-y-0.5 hover:shadow-soft transition-all duration-200 ease-out-expo"
          :class="k.destaque ? 'border-data-warn/35' : 'border-line hover:border-accent/40'"
          :style="{ animationDelay: `${i * 45}ms` }">
          <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide flex items-center gap-2">
            <i :class="[k.icone, k.cor]" class="text-micro"></i>
            {{ k.rotulo }}
            <i class="fas fa-arrow-right text-micro ml-auto text-accent opacity-0 -translate-x-1
                      group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"></i>
          </p>
          <p class="flex items-baseline gap-2 mt-1">
            <span class="text-metric-sm font-bold text-ink tabular-nums
                         group-hover:text-accent transition-colors duration-120">{{ k.valor }}</span>
            <span class="text-xs text-ink-muted">{{ k.nota }}</span>
          </p>
        </button>
      </div>

      <!-- ── Precisa de você · o que ela tratou · prazos ───────────────── -->
      <!-- ALTURA DECLARADA nas duas colunas.
           Antes cada uma crescia com o próprio conteúdo: seis pendências de
           três linhas puxavam a esquerda para 900px enquanto a direita parava
           em 300, e a página inteira virava um scroll comprido com metade da
           tela vazia. Agora cada bloco rola DENTRO de si, a página fica do
           tamanho da tela, e as duas colunas terminam juntas. -->
      <div class="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-stretch">

        <!-- Precisa de você -->
        <section class="rounded-2xl border border-line bg-surface-raised p-4 flex flex-col
                        lg:max-h-[32rem] min-h-0">
          <div class="flex items-center justify-between gap-2 mb-3 shrink-0">
            <h3 class="text-sm font-semibold text-ink">
              Precisa de você
              <span v-if="ai.painel?.prioritarios?.length" class="text-ink-subtle font-normal">
                · {{ ai.painel.prioritarios.length }}
              </span>
            </h3>
            <span class="text-micro text-ink-subtle">por impacto, não por hora</span>
          </div>

          <EmptyState v-if="!ai.painel.prioritarios.length" icon="fas fa-check" size="sm"
            title="Nada esperando decisão"
            description="Nenhum e-mail na caixa depende de uma escolha sua agora." />

          <TransitionGroup v-else tag="div"
            class="flex flex-col gap-2.5 overflow-y-auto min-h-0 -mr-1 pr-1"
            enter-active-class="transition duration-200 ease-out-expo"
            enter-from-class="opacity-0 -translate-y-1"
            leave-active-class="transition duration-120 ease-out-expo absolute"
            leave-to-class="opacity-0 translate-x-2">
            <article v-for="(p, i) in ai.painel.prioritarios" :key="p.messageId"
              class="group rounded-xl border bg-surface-sunken p-3 animate-slide-up
                     hover:shadow-soft transition-all duration-200 ease-out-expo"
              :class="classeDe(p.classe).borda"
              :style="{ animationDelay: `${i * 55}ms` }">

              <div class="flex items-start gap-2.5">
                <PessoaCard :pessoa="{ name: p.de, email: p.email }" class="mt-0.5" />

                <div class="flex-1 min-w-0">
                  <div class="flex items-baseline gap-2">
                    <h4 class="text-sm font-semibold text-ink truncate flex-1 min-w-0">{{ p.assunto }}</h4>
                    <span class="inline-flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-md text-micro font-semibold"
                      :class="[classeDe(p.classe).tinta, classeDe(p.classe).texto]">
                      <span class="w-1.5 h-1.5 rounded-full" :class="classeDe(p.classe).ponto"></span>
                      {{ classeDe(p.classe).label }}
                    </span>
                  </div>

                  <p class="text-micro text-ink-subtle mt-0.5">
                    {{ p.de }} · {{ quando(p.quando) }}
                    <span v-if="p.prazo"> · <span class="text-data-warn font-medium">{{ p.prazo }}</span></span>
                  </p>

                  <p v-if="p.porque" class="text-xs leading-relaxed text-ink-muted mt-2">{{ p.porque }}</p>

                  <!-- O que a IA FARIA, e o que a rebaixou. É aqui que a
                       configuração da aba Automações vira consequência visível. -->
                  <p v-if="p.comportamento" class="text-micro text-ink-subtle mt-1.5 flex items-start gap-1.5">
                    <i class="fas fa-robot mt-0.5 shrink-0 text-accent/70"></i>
                    <span>
                      Neste, {{ COMPORTAMENTO[p.comportamento] }}<template v-if="p.motivoRebaixe">
                        <span class="text-ink-subtle"> — {{ p.motivoRebaixe }}</span>
                      </template>.
                    </span>
                  </p>
                </div>
              </div>

              <!-- Responder não pode ser a única saída. Este e-mail pode ser
                   antigo, pode ser de outra área, pode não merecer resposta -
                   e sem alternativa a pessoa só tinha como ignorar a lista. -->
              <div class="flex flex-wrap gap-1.5 mt-3 pl-9">
                <Button v-if="podeEnviar" size="sm" variant="primary" icon="fas fa-wand-magic-sparkles"
                  :loading="ai.redigindoEste(p.messageId)"
                  :disabled="!!ai.redigindoId && !ai.redigindoEste(p.messageId)"
                  @click="redigir(p)">
                  {{ p.acao || 'Escrever resposta' }}
                </Button>

                <Button v-if="podeEnviar" size="sm" variant="outline" icon="fas fa-share"
                  :loading="ocupado === p.messageId" @click="encaminhar(p)">
                  Passar adiante
                </Button>

                <Button size="sm" variant="ghost" icon="fas fa-envelope-open"
                  @click="abrirEmail(p.messageId)">Abrir</Button>

                <Button v-if="podeOrganizar" size="sm" variant="ghost" class="text-ink-subtle"
                  icon="fas fa-box-archive" :loading="ocupado === p.messageId"
                  @click="arquivar(p)">Arquivar</Button>

                <Button size="sm" variant="ghost" class="text-ink-subtle"
                  :icon="menuAberto === p.messageId ? 'fas fa-xmark' : 'fas fa-circle-check'"
                  @click="abrirMenu(p)">
                  {{ menuAberto === p.messageId ? 'Cancelar' : 'Tirar da lista' }}
                </Button>
              </div>

              <!-- Por que está saindo. A pergunta não é burocracia: ela separa
                   "já resolvi" de "não era para mim", e é isso que a IA lê. -->
              <Transition
                enter-active-class="transition duration-200 ease-out-expo"
                enter-from-class="opacity-0 -translate-y-1"
                leave-active-class="transition duration-120"
                leave-to-class="opacity-0">
                <div v-if="menuAberto === p.messageId"
                  class="mt-2.5 ml-9 p-3 rounded-xl border border-line bg-surface-raised">
                  <p class="text-micro font-semibold text-ink-muted mb-2">Por que está saindo da lista?</p>
                  <div class="flex flex-wrap gap-1.5">
                    <button v-for="mo in motivos" :key="mo.id" type="button"
                      @click="resolver(p, mo)"
                      class="px-2.5 py-1.5 min-h-9 rounded-lg text-micro font-medium border border-line
                             text-ink-muted hover:text-accent hover:border-accent/40
                             transition-all duration-120 ease-out-expo">{{ mo.label }}</button>
                  </div>
                  <input v-model="notaMotivo" placeholder="Quer detalhar? (opcional - a IA lê isto)"
                    class="w-full mt-2 px-2.5 py-2 rounded-lg border border-line bg-surface-sunken text-ink
                           text-micro outline-none focus:border-accent/50" />
                </div>
              </Transition>
            </article>
          </TransitionGroup>
        </section>

        <div class="flex flex-col gap-3 lg:max-h-[32rem] min-h-0">
          <!-- O que a IA já tratou -->
          <section ref="blocoFeito"
            class="rounded-2xl border bg-surface-raised p-4 flex flex-col min-h-0 flex-1
                   transition-colors duration-420"
            :class="destacando ? 'border-accent ring-2 ring-accent-ring' : 'border-line'">
            <h3 class="text-sm font-semibold text-ink mb-2">O que ela fez</h3>

            <EmptyState v-if="!ai.painel.tratados.length" icon="fas fa-robot" size="sm"
              title="Ela ainda não agiu"
              description="Ela lê e classifica sempre. Arquivar e responder sozinha dependem da execução automática, que hoje está desligada." />

            <TransitionGroup v-else tag="div" class="flex flex-col overflow-y-auto min-h-0 -mr-1 pr-1"
              enter-active-class="transition duration-200 ease-out-expo"
              enter-from-class="opacity-0 -translate-y-1"
              leave-active-class="transition duration-120 absolute"
              leave-to-class="opacity-0">
              <div v-for="a in ai.painel.tratados" :key="a.id"
                class="group flex items-start gap-2.5 py-2.5 px-2 -mx-2 rounded-lg border-b
                       border-line-subtle last:border-0 transition-colors duration-120"
                :class="a.messageId ? 'hover:bg-surface-sunken cursor-pointer' : ''"
                @click="a.messageId && abrirEmail(a.messageId)">
                <i class="text-xs mt-0.5 w-4 text-center shrink-0"
                  :class="a.estado === 'bloqueado' ? 'fas fa-triangle-exclamation text-data-warn'
                        : a.tipo === 'rascunho' ? 'fas fa-hourglass-half text-ink-subtle'
                        : 'fas fa-check text-accent'"></i>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-ink truncate
                            group-hover:text-accent transition-colors duration-120">{{ a.titulo }}</p>
                  <p class="text-micro mt-0.5"
                    :class="a.estado === 'bloqueado' ? 'text-data-warn' : 'text-ink-subtle'">{{ a.texto }}</p>
                </div>
                <!-- Rascunho não é coisa feita: ele está na fila. Dizer isso na
                     própria linha evita a pessoa achar que já saiu. -->
                <button v-if="a.tipo === 'rascunho'" type="button"
                  class="text-micro text-accent hover:underline shrink-0 pt-0.5"
                  title="Está no painel da direita, esperando o seu OK">esperando OK</button>
                <!-- Desfazer aparece SÓ no que tem volta. E-mail enviado não tem,
                     e oferecer o botão ali seria mentir. -->
                <button v-if="a.reversivel && a.estado === 'feito'" type="button"
                  class="text-micro text-accent hover:underline shrink-0 pt-0.5"
                  @click.stop="desfazer(a)">desfazer</button>
              </div>
            </TransitionGroup>
          </section>

          <!-- Prazos extraídos -->
          <section class="rounded-2xl border border-line bg-surface-raised p-4 flex flex-col min-h-0 flex-1">
            <h3 class="text-sm font-semibold text-ink mb-2 shrink-0">Prazos que ela encontrou</h3>

            <EmptyState v-if="!ai.painel.extraidos.length" icon="fas fa-calendar-check" size="sm"
              title="Nenhum prazo no radar"
              description="Data citada dentro de um e-mail aparece aqui, com o link para a mensagem." />

            <div v-else class="flex flex-col gap-2 overflow-y-auto min-h-0 -mr-1 pr-1">
              <button v-for="(x, i) in ai.painel.extraidos" :key="x.messageId" type="button"
                @click="abrirEmail(x.messageId)"
                class="group flex items-start gap-2.5 p-2.5 rounded-xl border text-left animate-slide-up
                       hover:-translate-y-0.5 hover:shadow-soft transition-all duration-200 ease-out-expo"
                :class="x.critico
                  ? 'border-data-neg/30 bg-data-neg-soft hover:border-data-neg/50'
                  : 'border-line bg-surface-sunken hover:border-accent/40'"
                :style="{ animationDelay: `${i * 50}ms` }">
                <i class="fas fa-calendar-day text-xs mt-0.5 shrink-0"
                  :class="x.critico ? 'text-data-neg' : 'text-accent'"></i>
                <span class="flex-1 min-w-0">
                  <span class="block text-xs font-medium text-ink truncate">{{ x.titulo }}</span>
                  <span class="block text-micro text-ink-subtle truncate mt-0.5">{{ x.detalhe }}</span>
                </span>
                <span class="text-micro font-semibold shrink-0 px-1.5 py-0.5 rounded-md"
                  :class="x.critico ? 'text-data-neg bg-data-neg/10' : 'text-ink-muted bg-surface-raised'">
                  {{ x.prazo || x.prazoEm }}
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </template>

    <!-- Falhou de vez -->
    <EmptyState v-else icon="fas fa-triangle-exclamation" size="lg"
      title="Não consegui montar a triagem"
      :description="ai.erro || 'Tente recarregar em alguns instantes.'">
      <template #actions>
        <Button variant="outline" icon="fas fa-rotate" @click="carregar()">Tentar de novo</Button>
      </template>
    </EmptyState>
  </div>
</template>
