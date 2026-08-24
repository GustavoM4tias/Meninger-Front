<script setup>
// Aba Mensagens do Teams.
//
// Faltava o canal onde a empresa conversa: o Office já tinha agenda, reunião e
// transcrição, e para responder uma linha a pessoa saía para o Teams. Aqui a
// conversa acontece no mesmo lugar em que ela viu a reunião.
//
// Layout: no desktop, lista de conversas | conversa aberta, lado a lado. No
// celular é uma coisa de cada vez (lista → conversa → voltar), porque a
// diretoria acessa o Office pelo telefone.
//
// O corpo da mensagem é HTML escrito por outra pessoa: passa por DOMPurify
// antes de encostar no DOM, com a mesma regra do módulo de e-mail.

import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import DOMPurify from 'dompurify';
import { useTeamsChatStore } from '@/stores/Microsoft/teamsChatStore';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';

const emit = defineEmits(['toast']);
const cs = useTeamsChatStore();

const busca = ref('');
const rascunho = ref('');
const novaConversa = ref(false);
const emailNovo = ref('');
const listaEl = ref(null);

const filtradas = computed(() => {
  const t = busca.value.trim().toLowerCase();
  if (!t) return cs.chats;
  return cs.chats.filter(c =>
    c.titulo.toLowerCase().includes(t) ||
    (c.ultimaMensagem?.texto || '').toLowerCase().includes(t)
  );
});

// No celular, lista e conversa não cabem juntas.
const mostrandoConversa = computed(() => !!cs.chatId);

function corpoSeguro(m) {
  const bruto = m.corpoTipo === 'html' ? m.corpo : escapar(m.corpo);
  return DOMPurify.sanitize(bruto, {
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
}

function escapar(txt) {
  return String(txt || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\r?\n/g, '<br>');
}

// Presença: bolinha ao lado do nome. Cinza é "não sei", e não pode parecer
// "offline" - dizer o que não se sabe é pior que não dizer.
const CORES = {
  Available: "bg-data-pos", AvailableIdle: "bg-data-pos",
  Busy: "bg-data-neg", BusyIdle: "bg-data-neg", DoNotDisturb: "bg-data-neg",
  Away: "bg-data-warn", BeRightBack: "bg-data-warn",
  Offline: "bg-ink-subtle/40",
};
function presencaDe(c) {
  if (c.tipo !== "oneOnOne") return null;
  const id = (c.participantes || [])[0]?.id;
  return id ? cs.presencas[id] || null : null;
}
function corPresenca(p) { return CORES[p?.estado] || "bg-ink-subtle/30"; }
function rotuloPresenca(p) {
  if (!p) return "";
  return p.atividade === "InAMeeting" ? "Em reunião"
       : p.atividade === "InACall"    ? "Em chamada"
       : p.atividade === "Presenting" ? "Apresentando"
       : p.rotulo;
}

function quando(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  return mesmoDia
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function horaCheia(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
}

async function abrir(c) {
  await cs.abrir(c.id);
  rolarParaOFim();
}

function rolarParaOFim() {
  nextTick(() => {
    const el = listaEl.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

watch(() => cs.mensagens.length, rolarParaOFim);

async function mandar() {
  const texto = rascunho.value.trim();
  if (!texto) return;
  rascunho.value = '';
  try {
    await cs.enviar(texto);
    rolarParaOFim();
  } catch (err) {
    rascunho.value = texto;   // não perde o que a pessoa escreveu
    emit('toast', err?.message || 'Não foi possível enviar.', 'error');
  }
}

function aoTeclar(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); mandar(); }
}

async function iniciar() {
  const email = emailNovo.value.trim();
  if (!email) return;
  try {
    await cs.conversarCom(email);
    novaConversa.value = false;
    emailNovo.value = '';
    rolarParaOFim();
  } catch (err) {
    emit('toast', err?.message || 'Não foi possível abrir a conversa.', 'error');
  }
}

onMounted(async () => {
  await cs.carregarChats();
  cs.carregarPessoas();
  cs.ligarAtualizacao();
});
onUnmounted(() => cs.desligarAtualizacao());
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[20rem_1fr]">

    <!-- ── Conversas ───────────────────────────────────────────────────────── -->
    <section :class="mostrandoConversa ? 'max-lg:hidden' : ''"
      class="rounded-2xl border border-line bg-surface-raised overflow-hidden flex flex-col max-h-[34rem]">

      <div class="p-3 border-b border-line space-y-2">
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <i class="fas fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-subtle"></i>
            <input v-model="busca" type="text" placeholder="Buscar conversa"
              class="w-full pl-8 pr-3 py-2 min-h-10 rounded-xl border border-line bg-surface text-sm text-ink
                     focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <IconButton icon="fas fa-pen-to-square" label="Nova conversa"
            @click="novaConversa = !novaConversa" />
        </div>

        <div v-if="novaConversa" class="flex items-center gap-2">
          <input v-model="emailNovo" list="eme-pessoas-teams" type="email" placeholder="e-mail da pessoa"
            @keydown.enter="iniciar"
            class="flex-1 px-3 py-2 min-h-10 rounded-xl border border-line bg-surface text-sm text-ink
                   focus:outline-none focus:ring-2 focus:ring-accent" />
          <datalist id="eme-pessoas-teams">
            <option v-for="p in cs.pessoas" :key="p.microsoftId" :value="p.email">{{ p.name }}</option>
          </datalist>
          <Button size="sm" variant="primary" @click="iniciar">Abrir</Button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div v-if="cs.carregandoLista && !cs.chats.length" class="p-3 space-y-2">
          <Skeleton v-for="i in 6" :key="i" class="h-14 rounded-xl" />
        </div>

        <EmptyState v-else-if="!filtradas.length" icon="fas fa-comments" size="sm"
          title="Nenhuma conversa"
          :description="busca ? 'Nada com esse termo.' : 'Suas conversas do Teams aparecem aqui.'" />

        <button v-for="c in filtradas" :key="c.id" type="button" @click="abrir(c)"
          :class="cs.chatId === c.id ? 'bg-accent-soft' : 'hover:bg-surface-hover'"
          class="w-full text-left px-3 py-2.5 min-h-14 border-b border-line/60 transition-colors flex gap-2.5">
          <div class="relative shrink-0 mt-0.5">
            <div class="w-9 h-9 rounded-full bg-surface-sunken grid place-items-center">
              <i :class="c.tipo === 'group' ? 'fas fa-user-group' : c.tipo === 'meeting' ? 'fas fa-video' : 'fas fa-user'"
                class="text-xs text-ink-subtle"></i>
            </div>
            <span v-if="presencaDe(c)" :class="corPresenca(presencaDe(c))"
              :title="rotuloPresenca(presencaDe(c))"
              class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-surface-raised"></span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline gap-2">
              <span :class="c.naoLido ? 'font-bold text-ink' : 'font-medium text-ink-muted'"
                class="truncate text-sm flex-1">{{ c.titulo }}</span>
              <span class="text-micro text-ink-subtle shrink-0">{{ quando(c.atualizadoEm) }}</span>
            </div>
            <p class="text-micro text-ink-subtle truncate mt-0.5">
              <span v-if="c.ultimaMensagem?.de" class="text-ink-muted">{{ c.ultimaMensagem.de }}: </span>
              {{ c.ultimaMensagem?.texto || 'Sem mensagens' }}
            </p>
          </div>
          <span v-if="c.naoLido" class="w-2 h-2 rounded-full bg-accent shrink-0 mt-2"></span>
        </button>
      </div>
    </section>

    <!-- ── Conversa aberta ─────────────────────────────────────────────────── -->
    <section :class="mostrandoConversa ? '' : 'max-lg:hidden'"
      class="rounded-2xl border border-line bg-surface-raised overflow-hidden flex flex-col max-h-[34rem]">

      <EmptyState v-if="!cs.chatId" icon="fas fa-comment-dots" size="sm" class="my-auto"
        title="Escolha uma conversa"
        description="As mensagens do Teams abrem aqui, e o que você responder sai no seu nome." />

      <template v-else>
        <div class="flex items-center gap-2 px-3 py-2.5 border-b border-line bg-surface">
          <IconButton icon="fas fa-arrow-left" label="Voltar" class="lg:hidden" @click="cs.chatId = null" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-ink truncate">{{ cs.chatAtual?.titulo }}</p>
            <p v-if="cs.chatAtual?.participantes?.length" class="text-micro text-ink-subtle truncate flex items-center gap-1.5">
              <span v-if="presencaDe(cs.chatAtual)" :class="corPresenca(presencaDe(cs.chatAtual))"
                class="w-2 h-2 rounded-full shrink-0"></span>
              <span v-if="presencaDe(cs.chatAtual)">{{ rotuloPresenca(presencaDe(cs.chatAtual)) }} ·</span>
              {{ cs.chatAtual.participantes.map(p => p.nome || p.email).join(', ') }}
            </p>
          </div>
          <a v-if="cs.chatAtual?.webUrl" :href="cs.chatAtual.webUrl" target="_blank" rel="noopener"
            class="h-10 w-10 grid place-items-center rounded-lg text-ink-subtle hover:text-accent hover:bg-surface-sunken transition-colors"
            title="Abrir no Teams">
            <i class="fas fa-arrow-up-right-from-square text-xs"></i>
          </a>
        </div>

        <div ref="listaEl" class="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
          <div v-if="cs.carregandoMensagens" class="space-y-2">
            <Skeleton v-for="i in 5" :key="i" class="h-12 rounded-xl" />
          </div>

          <EmptyState v-else-if="!cs.mensagens.length" icon="fas fa-comment" size="sm"
            title="Conversa vazia" description="Escreva a primeira mensagem." />

          <div v-for="m in cs.mensagens" :key="m.id"
            :class="m.minha ? 'items-end' : 'items-start'" class="flex flex-col">
            <div :class="m.minha
                  ? 'bg-accent text-white rounded-br-sm'
                  : 'bg-surface-sunken text-ink rounded-bl-sm'"
              class="max-w-[85%] rounded-2xl px-3 py-2">
              <p v-if="!m.minha" class="text-micro font-semibold opacity-70 mb-0.5">{{ m.de.nome }}</p>
              <div class="text-sm leading-relaxed break-words chat-corpo" v-html="corpoSeguro(m)"></div>
              <div v-if="m.anexos.length" class="mt-1.5 flex flex-wrap gap-1">
                <a v-for="a in m.anexos" :key="a.id" :href="a.url" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1 text-micro underline opacity-90">
                  <i class="fas fa-paperclip"></i> {{ a.nome || 'anexo' }}
                </a>
              </div>
            </div>
            <span class="text-micro text-ink-subtle mt-0.5 px-1" :title="horaCheia(m.em)">
              {{ quando(m.em) }}<span v-if="m.editadoEm"> · editada</span>
            </span>
          </div>
        </div>

        <div class="border-t border-line p-2.5 bg-surface">
          <div class="flex items-end gap-2 rounded-2xl border border-line bg-surface-sunken px-2 py-1">
            <textarea v-model="rascunho" @keydown="aoTeclar" rows="1"
              placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter quebra linha)"
              class="flex-1 bg-transparent border-none outline-none resize-none text-sm text-ink
                     placeholder:text-ink-subtle max-h-28 py-2 px-2 leading-relaxed"></textarea>
            <button type="button" @click="mandar" :disabled="!rascunho.trim() || cs.enviando"
              :class="rascunho.trim() && !cs.enviando
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'bg-surface text-ink-subtle cursor-not-allowed'"
              class="w-9 h-9 rounded-full grid place-items-center shrink-0 mb-1 transition-colors">
              <i :class="cs.enviando ? 'fas fa-circle-notch fa-spin' : 'fas fa-paper-plane'" class="text-xs"></i>
            </button>
          </div>
          <p class="text-micro text-ink-subtle mt-1 px-1">
            A mensagem sai no seu nome, e aparece no Teams como se você tivesse escrito por lá.
          </p>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
/* O corpo vem do Teams com marcação própria: sem isto, imagem e tabela grandes
   estouram a largura da bolha. */
.chat-corpo :deep(img) { max-width: 100%; height: auto; border-radius: 0.5rem; }
.chat-corpo :deep(p)   { margin: 0.15rem 0; }
.chat-corpo :deep(a)   { text-decoration: underline; }
.chat-corpo :deep(table) { display: block; overflow-x: auto; max-width: 100%; }
</style>
