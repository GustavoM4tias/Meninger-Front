<script setup>
// Aprovar uma resposta escrita pela IA.
//
// Aprovar É ENVIAR, e enviar não tem desfazer. Um cartão de 4 linhas no trilho
// não é base para essa decisão: aqui a pessoa lê o e-mail ORIGINAL inteiro,
// rolando, vê o que a IA escreveu, edita se quiser, e só então manda.
//
// O bloco de baixo é o que faz a IA melhorar. Duas fontes, e a segunda vale
// mais que a primeira:
//
//   o que a pessoa DIZ    "ficou formal demais", "sempre copie o Rafael"
//   o que a pessoa FAZ    a diferença entre o texto da IA e o que ela deixou.
//                         Ninguém comenta o que corrige no automático.
//
// As duas viram lição e entram no prompt da próxima redação.

import { ref, computed, watch } from 'vue';
import DOMPurify from 'dompurify';
import { useToast } from 'vue-toastification';
import { useOutlookAiStore } from '@/stores/Microsoft/outlookAiStore';
import { getMessage } from '@/utils/Microsoft/apiOutlook';
import { pedirConfirmacao } from '@/composables/useConfirm';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  item: { type: Object, default: null },
  podeEnviar: { type: Boolean, default: false },
});

const emit = defineEmits(['close']);

const ai = useOutlookAiStore();
const toast = useToast();

const original = ref(null);
const carregando = ref(false);
const corpo = ref('');
const corpoInicial = ref('');
const comentario = ref('');
const nota = ref(null);          // 'bom' | 'ruim' | null
const enviando = ref(false);
const salvando = ref(false);

watch(() => [props.open, props.item?.id], async () => {
  if (!props.open || !props.item) return;
  corpo.value = props.item.corpo || '';
  corpoInicial.value = props.item.corpo || '';
  comentario.value = '';
  nota.value = null;
  original.value = null;

  // O e-mail que está sendo respondido. Sem ele a pessoa aprova no escuro.
  if (props.item.messageId) {
    carregando.value = true;
    try { original.value = await getMessage(props.item.messageId); }
    catch { original.value = null; }
    finally { carregando.value = false; }
  }
}, { immediate: true });

const editou = computed(() => corpo.value.trim() !== corpoInicial.value.trim());
const temLicao = computed(() => editou.value || !!comentario.value.trim() || !!nota.value);

// Mesmo cuidado do painel de leitura: o corpo é HTML de terceiro. Sem
// DOMPurify, qualquer remetente executa código na sessão de quem abriu.
const corpoOriginalSeguro = computed(() => {
  const bruto = original.value?.body || '';
  if (!bruto) return '';
  if (original.value?.bodyType?.toLowerCase() === 'text') {
    const escapado = bruto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre class="whitespace-pre-wrap font-sans">${escapado}</pre>`;
  }
  return DOMPurify.sanitize(bruto, {
    FORBID_TAGS: ['script', 'iframe', 'form', 'style', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
});

const destinatarios = computed(() => (props.item?.destinatarios || []).join(', '));

// ── Guardar a lição sem enviar ────────────────────────────────────────────────
async function salvar() {
  salvando.value = true;
  try {
    await ai.editarFila(props.item.id, {
      corpo: corpo.value,
      comentario: comentario.value,
      nota: nota.value,
    });
    corpoInicial.value = corpo.value;
    comentario.value = '';
    toast.success(temLicao.value
      ? 'Salvo. A IA vai levar isto em conta nas próximas respostas.'
      : 'Salvo.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível salvar.');
  } finally { salvando.value = false; }
}

// ── Aprovar É enviar ──────────────────────────────────────────────────────────
async function aprovar() {
  const ok = await pedirConfirmacao({
    title: 'Enviar esta resposta?',
    consequence: `O e-mail sai agora no seu nome para ${destinatarios.value || 'o remetente'}, `
      + `com o assunto "${props.item.assunto}". E-mail enviado não tem desfazer.`,
    confirmLabel: 'Enviar',
  });
  if (!ok) return;

  enviando.value = true;
  try {
    // A correção e o comentário vão ANTES do envio: depois de aprovado o item
    // sai da fila e a lição se perderia.
    if (temLicao.value) {
      await ai.editarFila(props.item.id, {
        corpo: corpo.value, comentario: comentario.value, nota: nota.value,
      });
    }
    await ai.aprovar(props.item.id);
    toast.success('Enviado.');
    emit('close');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível enviar.');
  } finally { enviando.value = false; }
}

async function descartar() {
  try {
    // Descartar também ensina: se ela escreveu algo que não servia, o comentário
    // é o que impede a próxima sair igual.
    if (comentario.value.trim() || nota.value) {
      await ai.comentar({
        messageId: props.item.messageId, queueId: props.item.id,
        nota: nota.value, comentario: comentario.value,
      });
    }
    await ai.descartarDaFila(props.item.id);
    toast.success('Descartado. Nada foi enviado.');
    emit('close');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível descartar.');
  }
}

function quando(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
}
</script>

<template>
  <Modal :open="open" size="xl" :padded="false"
    :title="item?.tipo === 'cobranca' ? 'Cobrança escrita pela IA' : 'Resposta escrita pela IA'"
    :subtitle="item?.assunto" @close="emit('close')">

    <div v-if="item" class="grid lg:grid-cols-2 gap-0 h-[70vh] max-h-[42rem]">

      <!-- ── O e-mail original, rolável ───────────────────────────────── -->
      <section class="flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-line">
        <header class="px-4 py-3 border-b border-line bg-surface-sunken shrink-0">
          <p class="text-micro font-semibold uppercase tracking-wide text-ink-subtle">Respondendo a</p>
          <template v-if="original">
            <p class="text-sm font-semibold text-ink mt-1 leading-snug">{{ original.subject }}</p>
            <p class="text-micro text-ink-muted mt-0.5 truncate">
              {{ original.from?.name || original.from?.email }} · {{ quando(original.receivedAt) }}
            </p>
          </template>
          <p v-else-if="!carregando" class="text-xs text-ink-muted mt-1">
            A mensagem original não está mais na caixa.
          </p>
        </header>

        <div class="flex-1 overflow-y-auto px-4 py-3 min-h-0">
          <div v-if="carregando" class="space-y-2">
            <Skeleton class="h-3 w-3/4 rounded" />
            <Skeleton class="h-3 w-full rounded" />
            <Skeleton class="h-3 w-5/6 rounded" />
            <Skeleton class="h-24 w-full rounded mt-3" />
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -- passou por DOMPurify acima -->
          <div v-else-if="corpoOriginalSeguro" class="mail-body text-sm text-ink leading-relaxed"
            v-html="corpoOriginalSeguro"></div>
          <p v-else class="text-xs text-ink-subtle">Sem corpo para mostrar.</p>
        </div>
      </section>

      <!-- ── O que a IA escreveu ──────────────────────────────────────── -->
      <section class="flex flex-col min-h-0">
        <header class="px-4 py-3 border-b border-line bg-surface-sunken shrink-0">
          <p class="flex items-center gap-2 text-micro font-semibold uppercase tracking-wide text-accent">
            <i class="fas fa-wand-magic-sparkles"></i> A resposta
          </p>
          <p class="text-micro text-ink-muted mt-1 truncate">
            para <span class="text-ink">{{ destinatarios || 'o remetente' }}</span>
          </p>
          <p v-if="item.motivo" class="text-micro text-ink-subtle mt-0.5 italic">{{ item.motivo }}</p>
        </header>

        <div class="flex-1 overflow-y-auto px-4 py-3 min-h-0 flex flex-col gap-3">
          <textarea v-model="corpo" rows="10"
            class="w-full flex-1 min-h-[10rem] px-3 py-2.5 rounded-lg border border-line bg-surface-sunken
                   text-ink text-sm leading-relaxed outline-none resize-y
                   transition-colors duration-120 focus:border-accent/50 focus:ring-2 focus:ring-accent-ring"></textarea>

          <p v-if="editou" class="text-micro text-accent flex items-center gap-1.5 animate-fade-in">
            <i class="fas fa-graduation-cap"></i>
            A IA aprende com esta correção: ela compara o que escreveu com o que você deixou.
          </p>

          <!-- ── Ensinar a IA ──────────────────────────────────────── -->
          <div class="rounded-xl border border-line bg-surface-sunken p-3">
            <p class="text-micro font-semibold text-ink-muted mb-2">Como ficou?</p>
            <div class="flex gap-1.5 mb-2">
              <button type="button" @click="nota = nota === 'bom' ? null : 'bom'"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-9 rounded-lg text-micro font-medium border
                       transition-all duration-120 ease-out-expo"
                :class="nota === 'bom'
                  ? 'border-data-pos/40 bg-data-pos-soft text-data-pos'
                  : 'border-line text-ink-muted hover:text-ink'">
                <i class="fas fa-thumbs-up"></i> Ficou bom
              </button>
              <button type="button" @click="nota = nota === 'ruim' ? null : 'ruim'"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-9 rounded-lg text-micro font-medium border
                       transition-all duration-120 ease-out-expo"
                :class="nota === 'ruim'
                  ? 'border-data-neg/40 bg-data-neg-soft text-data-neg'
                  : 'border-line text-ink-muted hover:text-ink'">
                <i class="fas fa-thumbs-down"></i> Errou
              </button>
            </div>
            <textarea v-model="comentario" rows="2"
              placeholder="O que ela deve fazer diferente da próxima vez? ex.: “sempre confirme o prazo por escrito”, “não use ‘prezado’ comigo”"
              class="w-full px-2.5 py-2 rounded-lg border border-line bg-surface text-ink text-micro
                     leading-relaxed outline-none resize-y focus:border-accent/50"></textarea>
            <p class="text-micro text-ink-subtle mt-1.5">
              Isto vale para TODAS as próximas respostas, não só para esta.
            </p>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <Button variant="ghost" class="text-ink-subtle" @click="descartar">Descartar</Button>
      <div class="flex-1"></div>
      <Button variant="outline" :loading="salvando" :disabled="!temLicao" @click="salvar">
        Salvar sem enviar
      </Button>
      <Button v-if="podeEnviar" variant="primary" icon="fas fa-paper-plane"
        :loading="enviando" @click="aprovar">
        Aprovar e enviar
      </Button>
    </template>
  </Modal>
</template>
