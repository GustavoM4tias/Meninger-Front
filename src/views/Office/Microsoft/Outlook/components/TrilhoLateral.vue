<script setup>
// Outlook › trilho lateral. Persistente em todas as abas.
//
// Três coisas, e todas são FATO da caixa, não previsão:
//
//   Aguardando seu OK   o que a IA escreveu e ainda não saiu. Enquanto está
//                       aqui, o e-mail não existe no mundo.
//   Prazos              datas que ela achou dentro de e-mails, com link para a
//                       mensagem que as gerou.
//   Sem resposta        conversas em que você falou por último e ninguém voltou
//                       há dois dias ou mais.
//
// O cartão daqui é um AVISO, não a decisão. Aprovar é ENVIAR, e ninguém deveria
// mandar e-mail sem reler o que está respondendo - por isso a decisão acontece
// no modal, que mostra a mensagem original inteira ao lado do rascunho.

import { ref, inject, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useOutlookAiStore } from '@/stores/Microsoft/outlookAiStore';

import Button from '@/components/UI/Button.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import AprovacaoModal from './AprovacaoModal.vue';

defineProps({
  podeEnviar: { type: Boolean, default: false },
});

const ai = useOutlookAiStore();
const toast = useToast();
const setTab = inject('olSetTab', () => {});
const abrirEmail = inject('olAbrirEmail', () => {});

onMounted(() => { if (!ai.trilho?.fila?.length) ai.carregarTrilho(); });

// ── A decisão acontece no modal ───────────────────────────────────────────────
const aberto = ref(null);

function abrir(f) { aberto.value = f; }
function fechar() { aberto.value = null; }

// ── Prazos e cobranças ────────────────────────────────────────────────────────
// Os dois blocos de baixo eram texto morto: mostravam o problema e não davam
// como resolver. Agora cada um abre o e-mail e oferece a ação óbvia - escrever
// a cobrança, ou tirar da lista dizendo por quê.
const menuAberto = ref(null);

async function redigirPara(messageId) {
  try {
    await ai.redigir(messageId);
    toast.success('Rascunho pronto aqui em cima, esperando o seu OK.');
  } catch (err) {
    toast.error(err?.message || 'Não consegui redigir agora.');
  }
}

async function tirarDaLista(messageId, motivo) {
  menuAberto.value = null;
  try {
    await ai.resolver(messageId, motivo, '');
    await ai.carregarTrilho();
    toast.success('Saiu da lista. O e-mail continua na caixa.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível tirar da lista.');
  }
}

const MOTIVOS = [
  { id: 'ja_respondi', label: 'já respondi' },
  { id: 'outra_pessoa', label: 'é de outra pessoa' },
  { id: 'nao_precisa', label: 'não precisa' },
  { id: 'resolvido_fora', label: 'resolvido fora' },
];

// Descartar direto do cartão: é a única ação sem consequência fora do Office
// (nada foi enviado), então não precisa tirar a pessoa da tela.
async function descartar(f) {
  try {
    await ai.descartarDaFila(f.id);
    toast.success('Descartado. Nada foi enviado.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível descartar.');
  }
}
</script>

<template>
  <aside class="flex-col gap-4 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-0.5">

    <!-- ── Aguardando seu OK ─────────────────────────────────────────── -->
    <section>
      <div class="flex items-center justify-between gap-2 mb-2">
        <h3 class="text-micro font-semibold uppercase tracking-wide text-ink-subtle">Aguardando seu OK</h3>
        <span v-if="ai.pendentes"
          class="text-micro font-bold text-accent tabular-nums animate-pop-in">{{ ai.pendentes }}</span>
      </div>

      <Skeleton v-if="ai.carregandoTrilho && !ai.trilho.fila.length" class="h-28 rounded-xl" />

      <p v-else-if="!ai.trilho.fila.length"
        class="text-micro text-ink-subtle leading-relaxed p-3 rounded-xl border border-dashed border-line">
        Nada esperando. Quando a IA escrever uma resposta, ela aparece aqui antes de sair.
      </p>

      <TransitionGroup v-else tag="div" class="flex flex-col gap-2"
        enter-active-class="transition duration-200 ease-out-expo"
        enter-from-class="opacity-0 -translate-y-1"
        leave-active-class="transition duration-200 ease-out-expo absolute"
        leave-to-class="opacity-0 translate-x-3">
        <article v-for="f in ai.trilho.fila" :key="f.id"
          class="rounded-xl border border-accent/25 bg-gradient-to-br from-accent-soft to-surface-raised p-3
                 animate-slide-up">
          <p class="text-micro font-semibold uppercase tracking-wide text-accent">
            {{ f.tipo === 'cobranca' ? 'Cobrança de prazo' : 'Resposta escrita pela IA' }}
          </p>
          <h4 class="text-xs font-semibold text-ink mt-1 leading-snug">{{ f.assunto }}</h4>

          <!-- Para quem vai fica VISÍVEL antes do OK, não escondido na
               confirmação. -->
          <p v-if="f.destinatarios?.length" class="text-micro text-ink-muted mt-1 truncate">
            para {{ f.destinatarios.join(', ') }}
          </p>

          <p class="text-micro text-ink-muted mt-1.5 leading-relaxed line-clamp-3 whitespace-pre-wrap">{{ f.corpo }}</p>
          <p v-if="f.motivo" class="text-micro text-ink-subtle mt-1.5 italic">{{ f.motivo }}</p>

          <div class="flex flex-wrap gap-1.5 mt-2.5">
            <Button size="sm" variant="primary" class="flex-1" icon="fas fa-up-right-and-down-left-from-center"
              @click="abrir(f)">
              Abrir e decidir
            </Button>
            <Button size="sm" variant="ghost" class="text-ink-subtle" title="Descartar sem enviar"
              @click="descartar(f)"><i class="fas fa-xmark"></i></Button>
          </div>
        </article>
      </TransitionGroup>
    </section>

    <!-- ── Prazos ────────────────────────────────────────────────────── -->
    <section v-if="ai.trilho.compromissos?.length">
      <h3 class="text-micro font-semibold uppercase tracking-wide text-ink-subtle mb-2">Prazos detectados</h3>
      <div class="flex flex-col gap-1.5">
        <article v-for="c in ai.trilho.compromissos" :key="c.messageId"
          class="group rounded-xl border p-2.5 transition-all duration-200 ease-out-expo
                 hover:-translate-y-0.5 hover:shadow-soft"
          :class="c.critico
            ? 'border-data-neg/30 bg-data-neg-soft hover:border-data-neg/50'
            : 'border-line bg-surface-raised hover:border-accent/40'">

          <button type="button" class="flex items-start gap-2 w-full text-left"
            @click="abrirEmail(c.messageId)">
            <i class="fas fa-calendar-day text-micro mt-0.5 shrink-0"
              :class="c.critico ? 'text-data-neg' : 'text-accent'"></i>
            <span class="flex-1 min-w-0">
              <span class="block text-micro font-medium text-ink truncate">{{ c.titulo }}</span>
              <span class="block text-micro mt-0.5"
                :class="c.critico ? 'text-data-neg' : 'text-ink-subtle'">{{ c.quando }}</span>
            </span>
            <i class="fas fa-arrow-right text-micro text-accent shrink-0 mt-0.5 opacity-0 -translate-x-1
                      group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"></i>
          </button>

          <div class="flex gap-1 mt-1.5 opacity-0 max-h-0 overflow-hidden
                      group-hover:opacity-100 group-hover:max-h-16 focus-within:opacity-100
                      focus-within:max-h-16 transition-all duration-200 ease-out-expo">
            <button v-if="podeEnviar" type="button" @click="redigirPara(c.messageId)"
              class="px-2 py-1 min-h-8 rounded-lg text-micro font-medium border border-accent/30
                     bg-accent-soft text-accent hover:border-accent/60 transition-all duration-120">
              <i class="fas fa-wand-magic-sparkles mr-1"></i>Responder
            </button>
            <button type="button" @click="menuAberto = menuAberto === c.messageId ? null : c.messageId"
              class="px-2 py-1 min-h-8 rounded-lg text-micro border border-line text-ink-subtle
                     hover:text-ink transition-all duration-120">Já resolvi</button>
          </div>

          <Transition
            enter-active-class="transition duration-200 ease-out-expo"
            enter-from-class="opacity-0 -translate-y-1"
            leave-active-class="transition duration-120" leave-to-class="opacity-0">
            <div v-if="menuAberto === c.messageId" class="flex flex-wrap gap-1 mt-1.5">
              <button v-for="mo in MOTIVOS" :key="mo.id" type="button"
                @click="tirarDaLista(c.messageId, mo.id)"
                class="px-2 py-1 min-h-8 rounded-lg text-micro border border-line text-ink-muted
                       hover:text-accent hover:border-accent/40 transition-all duration-120">{{ mo.label }}</button>
            </div>
          </Transition>
        </article>
      </div>
    </section>

    <!-- ── Sem resposta ──────────────────────────────────────────────── -->
    <section v-if="ai.trilho.semResposta?.length">
      <h3 class="text-micro font-semibold uppercase tracking-wide text-ink-subtle mb-2">
        Você mandou e ninguém voltou
      </h3>
      <div class="flex flex-col gap-1">
        <article v-for="sr in ai.trilho.semResposta" :key="sr.messageId"
          class="group rounded-lg px-2 -mx-2 py-1.5 transition-colors duration-120 hover:bg-surface-sunken">
          <button type="button" class="flex items-center gap-2 w-full text-left"
            @click="abrirEmail(sr.messageId)">
            <span class="w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-120"
              :class="sr.dias >= 7 ? 'bg-data-warn' : 'bg-ink-subtle group-hover:bg-accent'"></span>
            <span class="flex-1 min-w-0">
              <span class="block text-micro text-ink-muted truncate
                           group-hover:text-ink transition-colors duration-120">{{ sr.titulo }}</span>
              <span v-if="sr.para" class="block text-micro text-ink-subtle truncate">para {{ sr.para }}</span>
            </span>
            <span class="text-micro shrink-0 tabular-nums"
              :class="sr.dias >= 7 ? 'text-data-warn font-semibold' : 'text-ink-subtle'">{{ sr.dias }} d</span>
          </button>

          <!-- Cobrar é a ação óbvia aqui, e ela não existia: a lista dizia que
               ninguém respondeu e parava nisso. -->
          <div v-if="podeEnviar"
            class="opacity-0 max-h-0 overflow-hidden group-hover:opacity-100 group-hover:max-h-10
                   focus-within:opacity-100 focus-within:max-h-10 transition-all duration-200 ease-out-expo">
            <button type="button" @click="redigirPara(sr.messageId)"
              class="mt-1 ml-3.5 px-2 py-1 min-h-8 rounded-lg text-micro font-medium border
                     border-accent/30 bg-accent-soft text-accent hover:border-accent/60
                     transition-all duration-120">
              <i class="fas fa-wand-magic-sparkles mr-1"></i>Escrever cobrança
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- Rodapé: onde se muda o que ela pode fazer -->
    <div class="mt-auto p-3 rounded-xl border border-dashed border-line">
      <p class="flex items-center gap-2 text-micro font-semibold text-ink-muted">
        <i class="fas fa-robot text-accent"></i> A IA da sua caixa
      </p>
      <p class="text-micro text-ink-subtle mt-1.5 leading-relaxed">
        Ela lê o que chega e escreve no seu tom. O que ela pode fazer sozinha - e o que nunca pode - é você
        quem decide.
      </p>
      <button type="button" class="text-micro text-accent hover:underline mt-2"
        @click="setTab('automacoes')">Ver e mudar as permissões →</button>
    </div>

    <AprovacaoModal :open="!!aberto" :item="aberto" :pode-enviar="podeEnviar" @close="fechar" />
  </aside>
</template>
