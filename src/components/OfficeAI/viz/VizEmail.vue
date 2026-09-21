<script setup>
/**
 * VizEmail - o cartão de e-mail dentro do chat: a Eme monta, a pessoa revisa
 * (Para, cópia, assunto e corpo são editáveis ali mesmo) e envia com um clique,
 * ou leva para o Outlook do Office para terminar lá.
 * ─────────────────────────────────────────────────────────────────────────────
 * email: { to: [{ email, name? }], cc?, bcc?, subject, body (texto simples), note?,
 *          replyTo?: { messageId, kind: 'reply'|'replyAll'|'forward', subject, from, preview } }
 *
 * Com `replyTo` o cartão é resposta/encaminhamento: o assunto fica fixo (é a
 * mesma conversa), a citação vai junto montada pelo Outlook, e o envio é por
 * /outlook/messages/:id/:kind/send - o caminho que só precisa de Mail.Send.
 *
 * Quem envia é a rota /outlook/send, com a alçada `send` conferida no servidor;
 * aqui `useCan` só decide se o botão aparece. A tool que gerou o bloco não
 * tocou no Graph - o e-mail só existe quando esta tela chama a rota.
 *
 * Funciona de dentro e de fora da tela de e-mail: o cartão mora no player
 * flutuante, então "Editar no Outlook" entrega o rascunho ao outlookStore e
 * navega; a tela abre o modal de escrever já preenchido.
 *
 * "Já enviado" fica em localStorage por id do bloco: conversa reaberta mostra
 * o cartão fechado em vez de oferecer o mesmo envio pela segunda vez.
 */
import { ref, computed, nextTick, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useCan } from '@/composables/useCan';
import { pedirConfirmacao } from '@/composables/useConfirm';
import { useOutlookStore } from '@/stores/Microsoft/outlookStore';
import { sendMail, sendReply } from '@/utils/Microsoft/apiOutlook';

const props = defineProps({
  block: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const store = useOutlookStore();
const can = useCan('/microsoft/outlook');
const podeEnviar = computed(() => can('send'));

const ROTA_OUTLOOK = '/microsoft/outlook';
const CHAVE_ENVIADOS = 'eme_email_enviados';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Estado do formulário ──────────────────────────────────────────────────────
const e = computed(() => props.block?.email || {});
const enderecosDe = (lista) => (Array.isArray(lista) ? lista : [])
  .map(p => String(typeof p === 'string' ? p : p?.email || '').trim().toLowerCase())
  .filter(Boolean);

const form = ref({
  to: enderecosDe(e.value.to),
  cc: enderecosDe(e.value.cc),
  bcc: enderecosDe(e.value.bcc),
  subject: String(e.value.subject || ''),
  body: String(e.value.body || ''),
});
const digitando = ref({ to: '', cc: '', bcc: '' });
const mostrar = ref({ cc: form.value.cc.length > 0, bcc: form.value.bcc.length > 0 });

const replyTo = computed(() => (e.value.replyTo?.messageId ? e.value.replyTo : null));
const TIPO = {
  reply: { titulo: 'Responder', icone: 'fas fa-reply', dica: 'A conversa anterior vai junto, abaixo do que você escrever.' },
  replyAll: { titulo: 'Responder a todos', icone: 'fas fa-reply-all', dica: 'A conversa anterior vai junto, abaixo do que você escrever.' },
  forward: { titulo: 'Encaminhar', icone: 'fas fa-share', dica: 'A mensagem original segue inteira, abaixo do que você escrever.' },
};
const tipo = computed(() => (replyTo.value ? TIPO[replyTo.value.kind] || TIPO.reply : null));

const estado = ref('idle');   // idle | sending | sent | cancelled | error
const erro = ref('');
const corpoRef = ref(null);

// ── Chips de destinatário ─────────────────────────────────────────────────────
// Digitar vírgula, ponto e vírgula, espaço ou Enter fecha o endereço num chip;
// Backspace no campo vazio tira o último. Endereço inválido fica como texto e
// o botão de enviar avisa, em vez de sumir com o que a pessoa escreveu.
function fecharChips(campo) {
  const bruto = digitando.value[campo];
  const partes = String(bruto || '').split(/[\s,;]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  const restos = [];
  for (const p of partes) {
    if (EMAIL_RE.test(p)) { if (!form.value[campo].includes(p)) form.value[campo].push(p); }
    else restos.push(p);
  }
  digitando.value[campo] = restos.join(' ');
}
function teclaChip(campo, ev) {
  if (['Enter', ',', ';', ' ', 'Tab'].includes(ev.key)) {
    if (ev.key !== 'Tab' || digitando.value[campo]) { ev.preventDefault(); fecharChips(campo); }
    return;
  }
  if (ev.key === 'Backspace' && !digitando.value[campo] && form.value[campo].length) {
    form.value[campo].pop();
  }
}
function tirar(campo, endereco) {
  form.value[campo] = form.value[campo].filter(x => x !== endereco);
}
const invalidos = computed(() => ['to', 'cc', 'bcc'].flatMap(c => String(digitando.value[c] || '').split(/\s+/).filter(Boolean)));
const externos = computed(() => [...form.value.to, ...form.value.cc, ...form.value.bcc].filter(x => !/@menin\.com\.br$/i.test(x)));
const nomeDe = (endereco) => {
  const p = [...(e.value.to || []), ...(e.value.cc || []), ...(e.value.bcc || [])].find(x => x?.email?.toLowerCase() === endereco);
  return p?.name || endereco.split('@')[0];
};

const podeClicarEnviar = computed(() => podeEnviar.value && form.value.to.length > 0 && !invalidos.value.length && estado.value !== 'sending');
const motivoBloqueio = computed(() => {
  if (!podeEnviar.value) return 'Você não tem a ação de envio na tela de e-mail.';
  if (invalidos.value.length) return `Endereço inválido: ${invalidos.value.join(', ')}.`;
  if (!form.value.to.length) return 'Informe para quem vai.';
  return '';
});

// ── Corpo: cresce com o texto até um teto, depois rola (como o cartão do Gmail) ─
function ajustarAltura() {
  const el = corpoRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 288)}px`;
}
onMounted(() => nextTick(ajustarAltura));

// ── Já enviado (conversa reaberta) ────────────────────────────────────────────
function lerEnviados() {
  try { const v = JSON.parse(localStorage.getItem(CHAVE_ENVIADOS) || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function marcarEnviado(id) {
  try {
    const lista = lerEnviados().filter(x => x !== id);
    lista.push(id);
    localStorage.setItem(CHAVE_ENVIADOS, JSON.stringify(lista.slice(-50)));
  } catch { /* sem storage: o cartão só não lembra depois de recarregar */ }
}
if (props.block?.id && lerEnviados().includes(props.block.id)) estado.value = 'sent';

// Texto simples vira HTML do mesmo jeito que o modal de escrever da tela faz:
// escapado e com <br>, para o que a pessoa digitou nunca virar marcação.
const paraHtml = (txt) => String(txt || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/\n/g, '<br>');

// ── Ações ─────────────────────────────────────────────────────────────────────
async function enviar() {
  ['to', 'cc', 'bcc'].forEach(fecharChips);
  if (!podeClicarEnviar.value) return;

  // Sair da Menin é o caso que dói, e e-mail enviado não tem desfazer: a
  // confirmação diz PARA QUEM vai, não "tem certeza?".
  if (externos.value.length) {
    const ok = await pedirConfirmacao({
      title: 'Enviar para fora da Menin?',
      consequence: `Este e-mail sai do seu endereço para ${externos.value.join(', ')}. `
        + 'E-mail enviado não tem como voltar atrás.',
      confirmLabel: 'Enviar',
    });
    if (!ok) return;
  }

  estado.value = 'sending';
  erro.value = '';
  try {
    if (replyTo.value) {
      await sendReply(replyTo.value.messageId, replyTo.value.kind, {
        comment: paraHtml(form.value.body),
        to: form.value.to,
        cc: form.value.cc,
      });
    } else {
      await sendMail({
        to: form.value.to,
        cc: form.value.cc,
        bcc: form.value.bcc,
        subject: form.value.subject,
        body: paraHtml(form.value.body),
      });
    }
    estado.value = 'sent';
    marcarEnviado(props.block?.id);
    toast.success('E-mail enviado.');
  } catch (err) {
    estado.value = 'error';
    erro.value = err?.message || 'Não foi possível enviar.';
  }
}

function editarNoOutlook() {
  ['to', 'cc', 'bcc'].forEach(fecharChips);
  store.pedirComposicao({
    to: form.value.to.map(email => ({ email })),
    cc: form.value.cc.map(email => ({ email })),
    subject: form.value.subject,
    body: form.value.body,
    // Em resposta a tela pede o rascunho ao Outlook (createReply) e põe o
    // texto daqui em cima da citação.
    replyTo: replyTo.value ? { messageId: replyTo.value.messageId, kind: replyTo.value.kind } : undefined,
  });
  if (route.path !== ROTA_OUTLOOK) router.push({ path: ROTA_OUTLOOK, query: { tab: 'caixa' } });
}

function cancelar() { estado.value = 'cancelled'; }
function voltar() { estado.value = 'idle'; erro.value = ''; nextTick(ajustarAltura); }

const campoChip = 'flex flex-wrap items-center gap-1.5 min-h-10 px-2.5 py-1.5 rounded-lg border border-line bg-surface-raised focus-within:border-accent/60 transition-colors duration-120';
const chip = 'inline-flex items-center gap-1 h-7 pl-2 pr-1 rounded-full text-xs bg-surface-sunken border border-line text-ink max-w-full';
const inputChip = 'flex-1 min-w-[8rem] h-7 bg-transparent text-sm text-ink placeholder:text-ink-subtle outline-none';
const botaoTexto = 'h-9 px-3 rounded-lg text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-sunken transition-colors duration-120 focus-ring';
</script>

<template>
  <div class="mt-2 rounded-xl border border-line bg-surface-raised overflow-hidden max-w-2xl">

    <!-- Cabeçalho: de onde sai -->
    <div class="flex items-center gap-2 px-3 py-2 border-b border-line bg-surface-sunken/50">
      <img src="/icons/ms-outlook.svg" alt="" class="w-4 h-4" />
      <span class="text-xs font-medium text-ink">Outlook<span v-if="tipo" class="text-ink-muted font-normal"> · {{ tipo.titulo }}</span></span>
      <span class="text-micro text-ink-subtle ml-auto" v-if="estado === 'sent'"><i class="fas fa-check text-data-pos mr-1"></i>Enviado</span>
      <span class="text-micro text-ink-subtle ml-auto" v-else-if="estado === 'cancelled'">Descartado</span>
      <span class="text-micro text-ink-subtle ml-auto" v-else>Sai no seu nome</span>
    </div>

    <!-- Enviado: o cartão fecha e diz o que aconteceu -->
    <div v-if="estado === 'sent'" class="px-3 py-3 space-y-1">
      <p class="text-sm text-ink"><i class="fas fa-paper-plane text-data-pos mr-1.5 text-xs"></i>{{ form.subject || '(sem assunto)' }}</p>
      <p class="text-xs text-ink-muted">{{ replyTo && replyTo.kind !== 'forward' ? 'Respondido' : 'Enviado' }} para {{ form.to.join(', ') }}<span v-if="form.cc.length"> · cópia: {{ form.cc.join(', ') }}</span>. Está na sua pasta Enviados, aqui e no Outlook.</p>
    </div>

    <!-- Descartado: nada saiu, dá para voltar -->
    <div v-else-if="estado === 'cancelled'" class="px-3 py-3 flex items-center gap-3">
      <p class="text-xs text-ink-muted flex-1">Tudo bem, não enviei. O texto continua aqui se mudar de ideia.</p>
      <button type="button" :class="botaoTexto" @click="voltar">Voltar a editar</button>
    </div>

    <template v-else>
      <div class="px-3 pt-3 space-y-2.5">

        <!-- A que mensagem isto responde -->
        <div v-if="replyTo" class="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-line bg-surface-sunken/60">
          <i :class="tipo.icone" class="text-accent text-micro mt-0.5 shrink-0"></i>
          <div class="min-w-0 flex-1">
            <p class="text-xs text-ink truncate" :title="replyTo.subject">{{ replyTo.subject || '(sem assunto)' }}<span v-if="replyTo.from" class="text-ink-muted"> · de {{ replyTo.from }}</span></p>
            <p v-if="replyTo.preview" class="text-micro text-ink-subtle truncate">{{ replyTo.preview }}</p>
            <p class="text-micro text-ink-subtle mt-0.5">{{ tipo.dica }}</p>
          </div>
        </div>

        <!-- Para -->
        <div>
          <div :class="campoChip" @click="$event.currentTarget.querySelector('input')?.focus()">
            <span class="text-xs text-ink-muted shrink-0">Para</span>
            <span v-for="x in form.to" :key="x" :class="chip" :title="x">
              <span class="truncate max-w-[12rem]">{{ nomeDe(x) }}</span>
              <button type="button" class="w-5 h-5 grid place-items-center rounded-full text-ink-subtle hover:text-data-neg" title="Tirar" @click.stop="tirar('to', x)"><i class="fas fa-xmark text-micro"></i></button>
            </span>
            <input v-model="digitando.to" :class="inputChip" type="text" autocomplete="off" spellcheck="false"
              :placeholder="form.to.length ? '' : 'fulano@menin.com.br'"
              @keydown="teclaChip('to', $event)" @blur="fecharChips('to')" />
            <span class="flex items-center gap-2 text-micro text-ink-subtle shrink-0">
              <button v-if="!mostrar.cc" type="button" class="hover:text-accent" @click.stop="mostrar.cc = true">Cc</button>
              <button v-if="!mostrar.bcc && !replyTo" type="button" class="hover:text-accent" @click.stop="mostrar.bcc = true">Cco</button>
            </span>
          </div>
        </div>

        <!-- Cópia / cópia oculta -->
        <div v-for="campo in ['cc', 'bcc'].filter(c => mostrar[c])" :key="campo">
          <div :class="campoChip" @click="$event.currentTarget.querySelector('input')?.focus()">
            <span class="text-xs text-ink-muted shrink-0">{{ campo === 'cc' ? 'Cc' : 'Cco' }}</span>
            <span v-for="x in form[campo]" :key="x" :class="chip" :title="x">
              <span class="truncate max-w-[12rem]">{{ nomeDe(x) }}</span>
              <button type="button" class="w-5 h-5 grid place-items-center rounded-full text-ink-subtle hover:text-data-neg" title="Tirar" @click.stop="tirar(campo, x)"><i class="fas fa-xmark text-micro"></i></button>
            </span>
            <input v-model="digitando[campo]" :class="inputChip" type="text" autocomplete="off" spellcheck="false"
              @keydown="teclaChip(campo, $event)" @blur="fecharChips(campo)" />
          </div>
        </div>

        <!-- Assunto: em resposta fica fixo, é o que mantém a conversa no mesmo fio -->
        <p v-if="replyTo" class="h-10 px-2.5 flex items-center rounded-lg border border-line bg-surface-sunken/40 text-sm text-ink-muted truncate" :title="form.subject">{{ form.subject }}</p>
        <input v-else v-model="form.subject" type="text" placeholder="Assunto"
          class="w-full h-10 px-2.5 rounded-lg border border-line bg-surface-raised text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-accent/60 transition-colors duration-120" />

        <!-- Corpo -->
        <textarea ref="corpoRef" v-model="form.body" rows="4" placeholder="Escreva a mensagem"
          class="w-full px-2.5 py-2 rounded-lg border border-line bg-surface-raised text-sm text-ink placeholder:text-ink-subtle outline-none focus:border-accent/60 transition-colors duration-120 resize-none leading-relaxed"
          @input="ajustarAltura"></textarea>

        <!-- Sair da Menin fica visível ANTES de enviar -->
        <div v-if="externos.length" class="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-data-warn/30 bg-data-warn-soft">
          <i class="fas fa-globe text-data-warn text-micro mt-0.5 shrink-0"></i>
          <p class="text-micro text-ink-muted leading-relaxed">Vai para fora da Menin: {{ externos.join(', ') }}. Confirmo com você antes de enviar.</p>
        </div>
        <p v-if="e.note" class="text-micro text-ink-subtle">{{ e.note }}</p>
        <!-- Por que Enviar está apagado (só quando não é óbvio) -->
        <p v-if="motivoBloqueio && (invalidos.length || !podeEnviar)" class="text-micro text-data-warn">{{ motivoBloqueio }}</p>
        <p v-if="erro" class="text-micro text-data-neg"><i class="fas fa-triangle-exclamation mr-1"></i>{{ erro }}</p>
      </div>

      <!-- Rodapé -->
      <div class="flex items-center gap-2 px-3 py-2.5 mt-1">
        <button v-if="podeEnviar" type="button" :class="botaoTexto" @click="editarNoOutlook">
          <i class="fas fa-pen text-micro mr-1.5"></i>Editar no Outlook
        </button>
        <span class="flex-1"></span>
        <button type="button" :class="botaoTexto" :disabled="estado === 'sending'" @click="cancelar">Cancelar</button>
        <button type="button" :disabled="!podeClicarEnviar" @click="enviar"
          class="h-9 px-4 rounded-lg text-xs font-medium bg-accent text-white hover:brightness-105 disabled:opacity-50 transition-all duration-120 focus-ring">
          <i v-if="estado === 'sending'" class="fas fa-circle-notch fa-spin mr-1.5"></i>
          <i v-else class="fas fa-paper-plane mr-1.5 text-micro"></i>Enviar
        </button>
      </div>
    </template>
  </div>
</template>
