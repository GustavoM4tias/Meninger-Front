<script setup>
// Leitura de uma mensagem.
//
// Duas defesas que não são opcionais em corpo de e-mail:
//
// 1. SANITIZAÇÃO. O corpo é HTML escrito por quem mandou o e-mail. Vai por
//    DOMPurify antes de encostar no DOM, com script, iframe, form e handler
//    inline fora. Sem isso, qualquer remetente executa código na sessão de quem
//    abriu a mensagem.
//
// 2. IMAGEM REMOTA BLOQUEADA por padrão. Imagem externa em e-mail é como se
//    rastreia leitura ("o pixel"). O Outlook faz igual: mostra só se a pessoa
//    pedir, e diz que bloqueou.

import { ref, computed, watch } from 'vue';
import DOMPurify from 'dompurify';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Badge from '@/components/UI/Badge.vue';
import { attachmentUrl } from '@/utils/Microsoft/apiOutlook';

const props = defineProps({
  message:     { type: Object,  default: null },
  loading:     { type: Boolean, default: false },
  canOrganize: { type: Boolean, default: false },
  canSend:     { type: Boolean, default: false },
  // Destinos de "Mover para": a árvore de pastas da caixa, já com o nível de
  // indentação calculado pela tela.
  folders:     { type: Array,   default: () => [] },
});

const emit = defineEmits(['close', 'reply', 'replyAll', 'forward', 'flag', 'delete', 'move']);

const mostrarImagens = ref(false);
// Painel de "Mover para": abre em cima da mensagem, sem modal, e fecha ao trocar
// de e-mail. Mover exige Mail.ReadWrite no tenant; sem a permissão o Graph
// responde 403 e o erro chega em toast, não em silêncio.
const escolhendoPasta = ref(false);
watch(() => props.message?.id, () => { mostrarImagens.value = false; escolhendoPasta.value = false; });

function mover(pasta) {
  escolhendoPasta.value = false;
  emit('move', { message: props.message, folder: pasta });
}

// Guarda se havia imagem remota, para a tela poder oferecer o botão.
const tinhaImagemRemota = ref(false);

const corpoSeguro = computed(() => {
  const bruto = props.message?.body || '';
  if (!bruto) return '';

  if (props.message?.bodyType?.toLowerCase() === 'text') {
    const escapado = bruto
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre class="whitespace-pre-wrap font-sans">${escapado}</pre>`;
  }

  DOMPurify.removeAllHooks();
  tinhaImagemRemota.value = false;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Link sempre abre fora e sem carona na aba de origem.
    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
    // Imagem remota: troca o src por um marcador enquanto estiver bloqueada.
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') || '';
      const remota = /^https?:/i.test(src);
      if (remota) {
        tinhaImagemRemota.value = true;
        if (!mostrarImagens.value) {
          node.removeAttribute('src');
          node.removeAttribute('srcset');
          node.setAttribute('data-bloqueada', '1');
          node.setAttribute('alt', node.getAttribute('alt') || 'imagem bloqueada');
        }
      }
    }
  });

  const limpo = DOMPurify.sanitize(bruto, {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'style', 'link', 'base'],
    FORBID_ATTR: ['srcdoc', 'formaction', 'ping'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target', 'rel', 'data-bloqueada'],
  });

  DOMPurify.removeAllHooks();
  return limpo;
});

function tamanho(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function quandoCompleto(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
</script>

<template>
  <div class="h-full flex flex-col">

    <div v-if="loading" class="p-5 space-y-3">
      <Skeleton variant="text" />
      <Skeleton variant="text" />
      <Skeleton variant="chart" />
    </div>

    <EmptyState v-else-if="!message"
      icon="far fa-envelope-open"
      title="Nenhuma mensagem aberta"
      description="Escolha um e-mail na lista para ler aqui."
      class="my-16" />

    <template v-else>
      <!-- Cabeçalho -->
      <header class="px-4 sm:px-5 py-3.5 border-b border-line shrink-0">
        <div class="flex items-start gap-2">
          <IconButton icon="fas fa-arrow-left" label="Voltar para a lista"
            class="lg:hidden shrink-0" @click="emit('close')" />

          <div class="min-w-0 flex-1">
            <h2 class="text-base font-semibold text-ink leading-snug">{{ message.subject }}</h2>
            <p class="text-sm text-ink-muted mt-1 truncate">
              <span class="text-ink">{{ message.from?.name || message.from?.email }}</span>
              <span v-if="message.from?.name && message.from?.email" class="text-ink-subtle">
                &lt;{{ message.from.email }}&gt;
              </span>
            </p>
            <p class="text-xs text-ink-subtle mt-0.5">
              {{ quandoCompleto(message.receivedAt || message.sentAt) }}
            </p>
            <p v-if="message.to?.length" class="text-xs text-ink-subtle mt-1 truncate">
              para {{ message.to.map(t => t.name || t.email).join(', ') }}
              <span v-if="message.cc?.length"> · cc {{ message.cc.map(t => t.name || t.email).join(', ') }}</span>
            </p>

            <div v-if="message.categories?.length" class="flex flex-wrap gap-1.5 mt-2">
              <Badge v-for="c in message.categories" :key="c" size="sm" variant="neutral">{{ c }}</Badge>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <IconButton v-if="canOrganize && folders.length"
              icon="fas fa-folder-open" label="Mover para outra pasta"
              :class="escolhendoPasta ? 'text-accent' : ''"
              @click="escolhendoPasta = !escolhendoPasta" />
            <IconButton v-if="canOrganize"
              icon="fas fa-flag" :label="message.flagged ? 'Tirar o sinalizador' : 'Sinalizar'"
              :class="message.flagged ? 'text-data-warn' : ''"
              @click="emit('flag', message)" />
            <IconButton v-if="canOrganize" icon="fas fa-trash" label="Excluir"
              @click="emit('delete', message)" />
            <a v-if="message.webLink" :href="message.webLink" target="_blank" rel="noopener"
              class="h-10 w-10 grid place-items-center rounded-lg text-ink-subtle hover:text-accent hover:bg-surface-sunken transition-colors"
              title="Abrir no Outlook">
              <i class="fas fa-arrow-up-right-from-square text-xs"></i>
            </a>
          </div>
        </div>

        <!-- Mover para outra pasta -->
        <div v-if="escolhendoPasta" class="mt-3 rounded-xl border border-line bg-surface-sunken p-2">
          <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide px-1 pb-1">Mover para</p>
          <div class="max-h-56 overflow-y-auto">
            <button v-for="f in folders" :key="f.id" type="button"
              @click="mover(f)"
              class="w-full flex items-center gap-2 px-2 py-2 min-h-10 rounded-lg text-sm text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors text-left"
              :style="{ paddingLeft: `${0.5 + (f.nivel || 0) * 0.9}rem` }">
              <i :class="f.icon || 'far fa-folder'" class="text-xs w-4 shrink-0 text-ink-subtle"></i>
              <span class="truncate">{{ f.name }}</span>
            </button>
          </div>
        </div>

        <!-- Ações de resposta -->
        <div v-if="canSend" class="flex flex-wrap gap-2 mt-3">
          <Button size="sm" variant="outline" icon="fas fa-reply" @click="emit('reply', message)">Responder</Button>
          <Button size="sm" variant="ghost" icon="fas fa-reply-all" @click="emit('replyAll', message)">Todos</Button>
          <Button size="sm" variant="ghost" icon="fas fa-share" @click="emit('forward', message)">Encaminhar</Button>
        </div>
      </header>

      <!-- Anexos -->
      <div v-if="message.attachments?.length" class="px-4 sm:px-5 py-3 border-b border-line bg-surface-sunken/50">
        <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide mb-2">
          {{ message.attachments.length }} anexo(s)
        </p>
        <div class="flex flex-wrap gap-2">
          <a v-for="a in message.attachments" :key="a.id"
            :href="attachmentUrl(message.id, a.id, true)"
            class="inline-flex items-center gap-2 px-3 py-2 min-h-10 rounded-lg border border-line bg-surface-raised hover:border-accent/40 hover:text-accent transition-colors text-xs max-w-full">
            <i class="fas fa-paperclip text-micro shrink-0"></i>
            <span class="truncate max-w-[12rem]">{{ a.name }}</span>
            <span class="text-ink-subtle shrink-0 tabular-nums">{{ tamanho(a.size) }}</span>
          </a>
        </div>
      </div>

      <!-- Aviso de imagem bloqueada -->
      <div v-if="tinhaImagemRemota && !mostrarImagens"
        class="px-4 sm:px-5 py-2 border-b border-data-warn/30 bg-data-warn/10 flex items-center justify-between gap-3 flex-wrap">
        <span class="text-xs text-data-warn">
          <i class="fas fa-image mr-1.5"></i>
          As imagens deste e-mail foram bloqueadas. Elas podem avisar o remetente que você abriu.
        </span>
        <button type="button" @click="mostrarImagens = true"
          class="text-xs font-semibold text-data-warn hover:underline min-h-10 px-2">
          Mostrar imagens
        </button>
      </div>

      <!-- Corpo -->
      <div class="flex-1 overflow-y-auto px-4 sm:px-5 py-4">
        <!-- eslint-disable-next-line vue/no-v-html -- passou por DOMPurify acima -->
        <div class="mail-body text-sm text-ink leading-relaxed" v-html="corpoSeguro"></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* O HTML vem de fora e traz a formatação dele. Aqui só o mínimo para não
   quebrar o layout: nada de largura fixa vazando e tabela que não rola. */
.mail-body :deep(img) { max-width: 100%; height: auto; }
.mail-body :deep(img[data-bloqueada]) {
  min-width: 1.5rem; min-height: 1.5rem;
  border: 1px dashed var(--color-line, currentColor);
  opacity: 0.35;
}
.mail-body :deep(table) { max-width: 100%; display: block; overflow-x: auto; }
.mail-body :deep(a) { color: inherit; text-decoration: underline; }
.mail-body :deep(blockquote) {
  margin: 0.75rem 0; padding-left: 0.85rem;
  border-left: 2px solid currentColor; opacity: 0.65;
}
.mail-body :deep(pre) { white-space: pre-wrap; word-break: break-word; }
</style>
