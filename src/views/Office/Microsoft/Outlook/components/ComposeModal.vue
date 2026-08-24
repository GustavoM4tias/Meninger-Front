<script setup>
// Escrever e-mail.
//
// Resposta e encaminhamento NÃO são montados aqui: quem monta é o Outlook, pelo
// createReply/createReplyAll/createForward. Ele já devolve o rascunho com a
// citação do histórico, os destinatários certos e o "Re:"/"Enc:" no assunto.
// Refazer isso no front daria uma citação pior e diferente da que a pessoa vê
// no Outlook.

import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { pedirConfirmacao } from '@/composables/useConfirm';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
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

// Limite do anexo em base64 pelo caminho simples do Graph.
const ANEXO_MAX_MB = 3;

watch(() => props.open, (aberto) => {
  if (!aberto) return;
  const d = props.draft;
  form.value = {
    to:      (d?.to || []).map(t => t.email).join(', '),
    cc:      (d?.cc || []).map(t => t.email).join(', '),
    subject: d?.subject === '(sem assunto)' ? '' : (d?.subject || ''),
    body:    d?.body || '',
  };
  mostrarCc.value = !!(d?.cc || []).length;
  anexos.value = [];
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

  if (!props.draft) {
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
  <Modal :open="open" size="lg" title="Escrever e-mail" @close="emit('close')">
    <div class="space-y-3">

      <Input v-model="form.to" label="Para" placeholder="fulano@menin.com.br, outro@empresa.com"
        hint="Separe por vírgula ou ponto e vírgula." />

      <button v-if="!mostrarCc" type="button" @click="mostrarCc = true"
        class="text-xs text-accent hover:underline min-h-10">
        + Adicionar cópia
      </button>
      <Input v-else v-model="form.cc" label="Cópia" placeholder="fulano@menin.com.br" />

      <Input v-model="form.subject" label="Assunto" placeholder="Sobre o quê?" />

      <div>
        <label class="block text-xs font-medium text-ink-muted mb-1.5">Mensagem</label>
        <textarea v-model="form.body" rows="10"
          :placeholder="draft ? 'Escreva sua resposta. O histórico da conversa vai abaixo.' : 'Escreva sua mensagem...'"
          class="w-full px-3 py-2.5 text-sm rounded-lg border border-line bg-surface-raised text-ink
                 placeholder:text-ink-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/10
                 resize-y transition"></textarea>
        <p v-if="draft" class="text-micro text-ink-subtle mt-1">
          A conversa anterior já está no rascunho e vai junto, abaixo do que você escrever.
        </p>
      </div>

      <!-- Anexos -->
      <div>
        <div class="flex items-center gap-2 flex-wrap">
          <label class="inline-flex items-center gap-2 px-3 py-2 min-h-10 rounded-lg border border-dashed border-line
                        text-xs text-ink-muted hover:text-accent hover:border-accent/40 transition cursor-pointer">
            <i class="fas fa-paperclip text-micro"></i>
            {{ anexando ? 'Anexando...' : 'Anexar arquivo' }}
            <input type="file" class="hidden" :disabled="anexando" @change="escolherAnexo" />
          </label>
          <span v-for="a in anexos" :key="a.name"
            class="text-xs px-2 py-1 rounded-lg bg-surface-sunken text-ink-muted truncate max-w-[12rem]">
            {{ a.name }}
          </span>
        </div>
        <p v-if="!draft?.id" class="text-micro text-ink-subtle mt-1">
          Para anexar, salve o rascunho primeiro.
        </p>
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" @click="emit('close')">Cancelar</Button>
      <Button variant="outline" icon="fas fa-floppy-disk" @click="salvarRascunho">Salvar rascunho</Button>
      <Button icon="fas fa-paper-plane" :disabled="!podeEnviar" :loading="sending" @click="enviar">
        Enviar
      </Button>
    </template>
  </Modal>
</template>
