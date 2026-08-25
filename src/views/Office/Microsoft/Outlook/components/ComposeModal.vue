<script setup>
// Escrever e-mail.
//
// Resposta e encaminhamento NÃO são montados aqui: quem monta é o Outlook, pelo
// createReply/createReplyAll/createForward. Ele já devolve o rascunho com a
// citação do histórico, os destinatários certos e o "Re:"/"Enc:" no assunto.
// Refazer isso no front daria uma citação pior e diferente da que a pessoa vê
// no Outlook.

import { ref, computed, watch } from 'vue';
import DOMPurify from 'dompurify';
import { useToast } from 'vue-toastification';
import { pedirConfirmacao } from '@/composables/useConfirm';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import PessoaCard from './PessoaCard.vue';
import { addAttachment } from '@/utils/Microsoft/apiOutlook';

const props = defineProps({
  open:    { type: Boolean, default: false },
  // Rascunho já criado (resposta/encaminhamento) ou null para mensagem nova.
  draft:   { type: Object, default: null },
  sending: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'send', 'saved']);
const toast = useToast();

const form = ref({ to: '', cc: '', subject: '', body: '' });
const mostrarCc = ref(false);
const anexos = ref([]);
const anexando = ref(false);
const verHistorico = ref(false);

// ── Que conversa é esta ───────────────────────────────────────────────────────
// O título dizia "Escrever e-mail" mesmo quando a pessoa clicou em "Encaminhar".
// Quem monta o rascunho é o Outlook, e o prefixo que ele põe no assunto é o
// único sinal confiável de qual das três ações foi - então é dele que o título
// sai.
const tipo = computed(() => {
  if (!props.draft?.id) return { titulo: 'Nova mensagem', icone: 'fas fa-pen', dica: '' };
  const a = String(props.draft?.subject || '');
  if (/^(enc|fwd|fw):/i.test(a)) {
    return {
      titulo: 'Encaminhar',
      icone: 'fas fa-share',
      dica: 'Escolha para quem vai. A mensagem original segue inteira, abaixo do que você escrever.',
    };
  }
  const quantos = (props.draft?.to || []).length + (props.draft?.cc || []).length;
  return {
    titulo: quantos > 1 ? 'Responder a todos' : 'Responder',
    icone: quantos > 1 ? 'fas fa-reply-all' : 'fas fa-reply',
    dica: 'A conversa anterior vai junto, abaixo do que você escrever.',
  };
});

// ── Destinatários como PESSOAS, não como texto ────────────────────────────────
// Uma string "a@x.com, b@y.com, c@z.com" num input é ilegível e fácil de
// estragar sem querer - apagar uma vírgula muda para quem o e-mail vai.
const paraLista = computed(() => enderecos(form.value.to));
const ccLista = computed(() => enderecos(form.value.cc));

function tirar(campo, endereco) {
  const atual = enderecos(form.value[campo]).filter(e => e !== endereco);
  form.value[campo] = atual.join(', ');
}

const externos = computed(() =>
  [...paraLista.value, ...ccLista.value].filter(e => !/@menin\.com\.br$/i.test(e))
);

// A citação que o Outlook montou, para a pessoa CONFERIR o que vai junto.
// Sanitizada: é HTML de terceiro, igual ao corpo na leitura.
const historicoSeguro = computed(() => {
  const bruto = props.draft?.body || '';
  if (!bruto) return '';
  return DOMPurify.sanitize(bruto, {
    FORBID_TAGS: ['script', 'iframe', 'form', 'style', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
});

// Limite do anexo em base64 pelo caminho simples do Graph.
const ANEXO_MAX_MB = 3;

watch(() => props.open, (aberto) => {
  if (!aberto) return;
  const d = props.draft;
  form.value = {
    to:      (d?.to || []).map(t => t.email).join(', '),
    cc:      (d?.cc || []).map(t => t.email).join(', '),
    subject: d?.subject === '(sem assunto)' ? '' : (d?.subject || ''),
    // Rascunho de verdade do Outlook (tem id) traz a CITAÇÃO da conversa no
    // corpo. Jogar isso na caixa de texto mostrava o HTML cru para a pessoa e
    // ainda mandava a citação duas vezes, porque montarCorpo() a acrescenta de
    // novo no fim. A caixa começa vazia; a citação continua indo junto.
    body:    d?.id ? '' : (d?.body || ''),
  };
  mostrarCc.value = !!(d?.cc || []).length;
  anexos.value = [];
  verHistorico.value = false;
});

const enderecos = (texto) =>
  String(texto || '').split(/[;,]/).map(s => s.trim()).filter(Boolean);

const podeEnviar = computed(() =>
  enderecos(form.value.to).length > 0 && !props.sending && !anexando.value
);

// A citação do Outlook vem em HTML; o que a pessoa escreve é texto simples.
// Juntar os dois sem escapar deixaria o texto dela virar marcação por acidente.
function montarCorpo() {
  const original = props.draft?.body || '';
  const escrito = String(form.value.body || '');

  // Sem id nao ha citacao do Outlook para preservar (mensagem nova, ou texto
  // que veio pronto de uma sugestao da IA): o que a pessoa ve e tudo o que vai.
  if (!props.draft?.id) {
    return escrito.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                  .replace(/\n/g, '<br>');
  }
  // Em resposta, o corpo já é o do rascunho; o que a pessoa digitou vai antes.
  const novo = escrito
    ? `<div>${escrito.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div><br>`
    : '';
  return novo + original;
}

async function escolherAnexo(e) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;

  if (file.size > ANEXO_MAX_MB * 1024 * 1024) {
    toast.error(`"${file.name}" tem ${(file.size / 1024 / 1024).toFixed(1)} MB. O limite por anexo é ${ANEXO_MAX_MB} MB.`);
    return;
  }
  if (!props.draft?.id) {
    toast.error('Salve o rascunho antes de anexar. Escreva o assunto e clique em Salvar rascunho.');
    return;
  }

  anexando.value = true;
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await addAttachment(props.draft.id, {
      name: file.name,
      contentType: file.type || 'application/octet-stream',
      contentBytes: base64,
    });
    anexos.value.push({ name: file.name, size: file.size });
    toast.success(`"${file.name}" anexado.`);
  } catch (err) {
    toast.error(err?.message || 'Não foi possível anexar o arquivo.');
  } finally {
    anexando.value = false;
  }
}

async function enviar() {
  const destinos = enderecos(form.value.to);
  const externos = destinos.filter(e => !/@menin\.com\.br$/i.test(e));

  // Enviar não tem desfazer, e sair da empresa é o caso que dói. A confirmação
  // diz PARA QUEM vai, não "tem certeza?".
  if (externos.length) {
    const ok = await pedirConfirmacao({
      title: 'Enviar para fora da Menin?',
      consequence: `Este e-mail sai do seu endereço para ${externos.join(', ')}. `
                 + 'E-mail enviado não tem como voltar atrás.',
      confirmLabel: 'Enviar',
    });
    if (!ok) return;
  }

  emit('send', {
    draftId: props.draft?.id || null,
    to: destinos,
    cc: enderecos(form.value.cc),
    subject: form.value.subject,
    body: montarCorpo(),
  });
}

function salvarRascunho() {
  emit('saved', {
    draftId: props.draft?.id || null,
    to: enderecos(form.value.to),
    cc: enderecos(form.value.cc),
    subject: form.value.subject,
    body: montarCorpo(),
  });
}
</script>

<template>
  <Modal :open="open" size="lg" :title="tipo.titulo"
    :subtitle="draft?.subject || ''" @close="emit('close')">

    <div class="space-y-3">

      <!-- Para quem vai. Chips com a pessoa, não uma linha de texto. -->
      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">Para</label>

        <div v-if="paraLista.length" class="flex flex-wrap gap-1.5 mb-1.5">
          <span v-for="e in paraLista" :key="e"
            class="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-full border border-line
                   bg-surface-sunken animate-slide-up">
            <PessoaCard :pessoa="{ email: e, name: e.split('@')[0] }" size="sm" />
            <span class="text-micro text-ink-muted truncate max-w-[11rem]">{{ e }}</span>
            <button type="button" class="w-5 h-5 rounded-full grid place-items-center text-ink-subtle
                                         hover:text-data-neg transition-colors duration-120"
              title="Tirar" @click="tirar('to', e)">
              <i class="fas fa-xmark text-micro"></i>
            </button>
          </span>
        </div>

        <Input v-model="form.to" placeholder="fulano@menin.com.br, outro@empresa.com"
          hint="Separe por vírgula ou ponto e vírgula." />
      </div>

      <!-- Cópia -->
      <div v-if="mostrarCc || ccLista.length">
        <label class="block text-xs font-medium text-ink-muted mb-1.5">Cópia</label>
        <div v-if="ccLista.length" class="flex flex-wrap gap-1.5 mb-1.5">
          <span v-for="e in ccLista" :key="e"
            class="inline-flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-full border border-line
                   bg-surface-sunken">
            <PessoaCard :pessoa="{ email: e, name: e.split('@')[0] }" size="sm" />
            <span class="text-micro text-ink-muted truncate max-w-[11rem]">{{ e }}</span>
            <button type="button" class="w-5 h-5 rounded-full grid place-items-center text-ink-subtle
                                         hover:text-data-neg transition-colors duration-120"
              title="Tirar" @click="tirar('cc', e)">
              <i class="fas fa-xmark text-micro"></i>
            </button>
          </span>
        </div>
        <Input v-model="form.cc" placeholder="fulano@menin.com.br" />
      </div>
      <button v-else type="button" @click="mostrarCc = true"
        class="text-xs text-accent hover:underline min-h-10">
        + Adicionar cópia
      </button>

      <!-- Sair da Menin é o caso que dói, e ele fica visível ANTES de enviar -->
      <div v-if="externos.length"
        class="flex items-start gap-2 px-3 py-2 rounded-xl border border-data-warn/30 bg-data-warn-soft
               animate-slide-down">
        <i class="fas fa-globe text-data-warn text-micro mt-0.5 shrink-0"></i>
        <p class="text-micro text-ink-muted leading-relaxed">
          <span class="font-semibold text-data-warn">Sai da Menin:</span>
          {{ externos.join(', ') }}. E-mail enviado não tem desfazer.
        </p>
      </div>

      <Input v-model="form.subject" label="Assunto" placeholder="Sobre o quê?" />

      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">Mensagem</label>
        <textarea v-model="form.body" rows="9"
          :placeholder="draft?.id ? 'Escreva a sua parte. O histórico vai abaixo, sozinho.' : 'Escreva sua mensagem...'"
          class="w-full px-3 py-2.5 text-sm rounded-lg border border-line bg-surface-raised text-ink
                 leading-relaxed placeholder:text-ink-subtle outline-none resize-y
                 transition-colors duration-120 focus:border-accent focus:ring-2 focus:ring-accent-ring"></textarea>
        <p v-if="tipo.dica" class="text-micro text-ink-subtle mt-1">{{ tipo.dica }}</p>
      </div>

      <!-- A conversa que vai junto: dava para conferir só depois de enviar -->
      <div v-if="draft?.id && historicoSeguro" class="rounded-xl border border-line bg-surface-sunken">
        <button type="button" @click="verHistorico = !verHistorico"
          class="flex items-center gap-2 w-full px-3 py-2.5 min-h-10 text-left">
          <i class="fas fa-quote-left text-micro text-ink-subtle"></i>
          <span class="text-micro text-ink-muted flex-1">
            {{ verHistorico ? 'Esconder' : 'Ver' }} a conversa que vai junto
          </span>
          <i class="fas fa-chevron-down text-micro text-ink-subtle transition-transform duration-200"
            :class="verHistorico ? 'rotate-180' : ''"></i>
        </button>
        <Transition
          enter-active-class="transition duration-200 ease-out-expo"
          enter-from-class="opacity-0 -translate-y-1"
          leave-active-class="transition duration-120" leave-to-class="opacity-0">
          <!-- eslint-disable-next-line vue/no-v-html -- passou por DOMPurify acima -->
          <div v-if="verHistorico"
            class="mail-body px-3 pb-3 text-xs text-ink-muted leading-relaxed max-h-56 overflow-y-auto"
            v-html="historicoSeguro"></div>
        </Transition>
      </div>

      <!-- Anexos -->
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <label class="inline-flex items-center gap-2 px-3 py-2 min-h-10 rounded-lg border border-dashed
                        border-line text-xs text-ink-muted cursor-pointer
                        hover:text-accent hover:border-accent/40 transition-colors duration-120">
            <i class="fas fa-paperclip text-micro"></i>
            {{ anexando ? 'Anexando...' : 'Anexar arquivo' }}
            <input type="file" class="hidden" :disabled="anexando" @change="escolherAnexo" />
          </label>
          <span v-for="a in anexos" :key="a.name"
            class="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-surface-sunken
                   text-ink-muted truncate max-w-[12rem] animate-pop-in">
            <i class="fas fa-file text-micro"></i>{{ a.name }}
          </span>
        </div>
        <p v-if="!draft?.id" class="text-micro text-ink-subtle mt-1">
          Para anexar, salve o rascunho primeiro.
        </p>
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" @click="emit('close')">Cancelar</Button>
      <div class="flex-1"></div>
      <Button variant="outline" icon="fas fa-floppy-disk" @click="salvarRascunho">Salvar rascunho</Button>
      <Button :icon="tipo.icone" :disabled="!podeEnviar" :loading="sending" @click="enviar">
        Enviar
      </Button>
    </template>
  </Modal>
</template>
