<script setup>
// /microsoft/outlook — a caixa de e-mail da própria pessoa dentro do Office.
//
// Layout: no desktop, pastas | lista | leitura, lado a lado. No celular vira uma
// coisa de cada vez (lista OU leitura), porque três colunas em 375px não é
// tela, é miniatura.
//
// Permissões: as três capacidades da tela (ver, organizar, enviar) vêm prontas
// do servidor pelo useCan. A tela só pergunta - nunca recalcula a regra, então
// não tem como ficar mais permissiva que a API.

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useOutlookStore } from '@/stores/Microsoft/outlookStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import { useCan } from '@/composables/useCan';
import { pedirConfirmacao } from '@/composables/useConfirm';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Input from '@/components/UI/Input.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Badge from '@/components/UI/Badge.vue';

import MessageList from './components/MessageList.vue';
import MessageView from './components/MessageView.vue';
import ComposeModal from './components/ComposeModal.vue';

const store = useOutlookStore();
const ms = useMicrosoftStore();
const toast = useToast();
const can = useCan('/microsoft/outlook');

const podeOrganizar = computed(() => can('organize'));
const podeEnviar    = computed(() => can('send'));

// ── Pastas ────────────────────────────────────────────────────────────────────
// A ordem do Outlook, não a alfabética do Graph: é a ordem que a pessoa conhece.
const ORDEM = ['inbox', 'drafts', 'sentitems', 'archive', 'junkemail', 'deleteditems'];
const ICONES = {
  inbox: 'fas fa-inbox', drafts: 'fas fa-file-pen', sentitems: 'fas fa-paper-plane',
  archive: 'fas fa-box-archive', junkemail: 'fas fa-ban', deleteditems: 'fas fa-trash',
};

const pastasPrincipais = computed(() =>
  ORDEM.map(k => store.folders.find(f => f.wellKnownName === k))
       .filter(Boolean)
       .map(f => ({ ...f, icon: ICONES[f.wellKnownName] || 'far fa-folder' }))
);

// Pastas de serviço que o Outlook também não mostra na barra lateral. Sem esta
// lista, tirar o filtro de "pasta vazia" traria Histórico de Conversas,
// Problemas de Sincronização e companhia.
const OCULTAS = new Set([
  ...ORDEM, 'outbox', 'conversationhistory', 'syncissues', 'serverfailures',
  'localfailures', 'conflicts', 'recoverableitemsdeletions', 'scheduled',
  'clutter', 'searchfolders', 'msgfolderroot', 'archivemsgfolderroot',
]);

// A caixa é uma ÁRVORE: quase toda pasta de trabalho mora dentro da Caixa de
// Entrada. Antes daqui só o primeiro nível aparecia (e só se tivesse mensagem),
// então a pessoa via as pastas do sistema e mais nada. O backend devolve a
// árvore achatada, em ordem de exibição; aqui só se calcula a indentação
// relativa ao primeiro ancestral visível - pasta vazia inclusive, porque é
// destino de "mover".
const pastasProprias = computed(() => {
  const porId = Object.fromEntries(store.folders.map(f => [f.id, f]));
  const visivel = f => !!f && !OCULTAS.has(f.wellKnownName);

  const nivel = (f) => {
    let d = 0;
    let p = porId[f.parentId];
    while (p) { if (visivel(p)) d++; p = porId[p.parentId]; }
    return d;
  };

  return store.folders.filter(visivel).map(f => ({ ...f, nivel: nivel(f) }));
});

// Destinos de "mover": as do sistema que fazem sentido, mais as da pessoa.
const pastasDestino = computed(() => [
  ...pastasPrincipais.value.filter(f => f.wellKnownName !== 'drafts').map(f => ({ ...f, nivel: 0 })),
  ...pastasProprias.value,
]);

const pastaAtual = computed(() => store.currentFolder?.name || 'Caixa de Entrada');

// ── Busca ─────────────────────────────────────────────────────────────────────
const busca = ref('');
let buscaTimer = null;

function digitouBusca() {
  clearTimeout(buscaTimer);
  buscaTimer = setTimeout(() => store.applySearch(busca.value), 400);
}
function limparBusca() {
  busca.value = '';
  clearTimeout(buscaTimer);
  store.applySearch('');
}

// ── Mobile: lista OU leitura ──────────────────────────────────────────────────
const vendoMensagem = computed(() => !!store.selected || store.loadingMessage);

// ── Escrever ──────────────────────────────────────────────────────────────────
const compondo = ref(false);
const rascunho = ref(null);

function escreverNovo() {
  rascunho.value = null;
  compondo.value = true;
}

async function responder(mensagem, kind) {
  try {
    rascunho.value = await store.startReply(mensagem.id, kind);
    compondo.value = true;
  } catch (err) {
    toast.error(err?.message || 'Não foi possível preparar a resposta.');
  }
}

async function enviar(payload) {
  try {
    await store.send(payload);
    compondo.value = false;
    rascunho.value = null;
    toast.success('E-mail enviado.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível enviar.');
  }
}

async function salvarRascunho(payload) {
  try {
    const salvo = await store.saveDraft(payload.draftId, payload);
    rascunho.value = salvo;
    toast.success('Rascunho salvo. Ele está na pasta Rascunhos, aqui e no Outlook.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível salvar o rascunho.');
  }
}

// ── Organizar ─────────────────────────────────────────────────────────────────

async function sinalizar(m) {
  try { await store.toggleFlag(m.id); }
  catch (err) { toast.error(err?.message || 'Não foi possível sinalizar.'); }
}

// Mover não pede confirmação: a consequência é pequena e reversível (a mensagem
// continua na caixa, em outra pasta), e o toast diz para onde ela foi.
async function mover({ message, folder }) {
  if (!message || !folder) return;
  try {
    await store.moveMessage(message.id, folder.id);
    toast.success(`Movido para ${folder.name}.`);
  } catch (err) {
    // Mover é escrita na caixa: enquanto o tenant não conceder Mail.ReadWrite,
    // o Graph responde 403. Dizer isso é melhor do que "erro de permissão".
    const msg = /permiss|forbidden|accessdenied/i.test(err?.message || '')
      ? 'Mover ainda não está liberado: falta a permissão Mail.ReadWrite no Azure. Fale com quem administra o tenant.'
      : (err?.message || 'Não foi possível mover a mensagem.');
    toast.error(msg);
  }
}

async function excluir(m) {
  const naLixeira = store.currentFolder?.wellKnownName === 'deleteditems';
  const ok = await pedirConfirmacao({
    title: naLixeira ? 'Excluir de vez?' : 'Mover para Itens Excluídos?',
    consequence: naLixeira
      ? `"${m.subject}" some da caixa e não dá para recuperar pelo Office.`
      : `"${m.subject}" sai da lista e vai para Itens Excluídos, onde você pode recuperar.`,
    confirmLabel: naLixeira ? 'Excluir de vez' : 'Mover',
  });
  if (!ok) return;

  try {
    await store.deleteMessage(m.id);
    toast.success(naLixeira ? 'Excluído.' : 'Movido para Itens Excluídos.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível excluir.');
  }
}

// ── Ciclo de vida ─────────────────────────────────────────────────────────────
let contadorTimer = null;

onMounted(async () => {
  if (!ms.connected) await ms.fetchStatus();
  await store.init();
  // Contador de não lidos: a cada 2 min, barato (só a contagem da pasta).
  contadorTimer = setInterval(() => store.fetchUnread(), 120_000);
});

onUnmounted(() => clearInterval(contadorTimer));
</script>

<template>
  <PageContainer size="full">
    <PageHeader
      title="E-mail"
      :subtitle="`${pastaAtual}${store.unread.unread ? ` · ${store.unread.unread} não lidos` : ''}`"
      icon-img="/icons/ms-outlook.svg"
      icon="fas fa-envelope">
      <template #actions>
        <Button v-if="podeEnviar" icon="fas fa-pen" @click="escreverNovo">Escrever</Button>
        <PageHelp
          storage-key="outlook"
          title="Como usar o e-mail no Office"
          intro="É a sua caixa do Outlook, dentro do Office. O que você faz aqui aparece no Outlook e no celular, porque é a mesma caixa - não é cópia."
          :steps="[
            { title: 'Ler e organizar', text: 'Abrir marca como lida, igual ao Outlook. Sinalizar e excluir estão na própria linha da lista, sem precisar abrir.' },
            { title: 'Buscar', text: 'A busca procura no assunto e no corpo de toda a pasta. Enquanto ela está ativa os filtros ficam de lado: a Microsoft não aceita os dois juntos.' },
            { title: 'Pastas', text: 'A barra da esquerda mostra a árvore inteira da caixa, inclusive as pastas que você criou dentro da Caixa de Entrada. Para mover uma mensagem, abra ela e use o botão de pasta, ao lado do sinalizador.' },
            { title: 'Responder', text: 'Responder e encaminhar são montados pelo próprio Outlook, com o histórico da conversa junto. Você escreve em cima.' },
            { title: 'Anexo', text: 'Para anexar arquivo, salve o rascunho primeiro. O rascunho fica visível também no Outlook, para você revisar antes de mandar.' },
          ]"
          :tips="[
            'As imagens de e-mail externo vêm bloqueadas: imagem remota costuma avisar o remetente que você abriu.',
            'Enviar não tem desfazer. Para endereço de fora da Menin, o Office pergunta antes e mostra para quem vai.',
            'Excluir manda para Itens Excluídos; de lá ainda dá para recuperar.',
          ]" />
      </template>
    </PageHeader>

    <!-- Sem conta vinculada -->
    <div v-if="!ms.connected && !ms.loading" class="py-16">
      <EmptyState icon="fab fa-microsoft" size="lg"
        :title="ms.needsReconnect ? 'Sua sessão Microsoft expirou' : 'Conecte sua conta Microsoft'"
        description="O e-mail usa sua conta @menin.com.br para saber qual caixa abrir.">
        <template #actions>
          <Button variant="primary" icon="fab fa-microsoft" :loading="ms.loading" @click="ms.startLink()">
            {{ ms.needsReconnect ? 'Reconectar' : 'Conectar conta Microsoft' }}
          </Button>
        </template>
      </EmptyState>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-[13rem_minmax(20rem,26rem)_1fr] gap-4 h-[calc(100vh-13rem)] min-h-[30rem]">

      <!-- ── Pastas (some no celular; a navegação lá é pela barra de cima) ── -->
      <nav class="hidden lg:flex flex-col gap-1 overflow-y-auto pr-1">
        <button v-for="f in pastasPrincipais" :key="f.id" type="button"
          @click="store.openFolder(f.wellKnownName)"
          class="flex items-center gap-2.5 px-3 py-2.5 min-h-11 rounded-lg text-sm transition-colors text-left"
          :class="store.folder === f.wellKnownName
            ? 'bg-accent-soft text-accent font-semibold'
            : 'text-ink-muted hover:bg-surface-hover hover:text-ink'">
          <i :class="f.icon" class="text-xs w-4 shrink-0"></i>
          <span class="truncate flex-1">{{ f.name }}</span>
          <span v-if="f.unread" class="text-micro font-mono tabular-nums shrink-0">{{ f.unread }}</span>
        </button>

        <template v-if="pastasProprias.length">
          <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide px-3 pt-4 pb-1">Suas pastas</p>
          <button v-for="f in pastasProprias" :key="f.id" type="button"
            @click="store.openFolder(f.id)"
            class="flex items-center gap-2.5 px-3 py-2.5 min-h-11 rounded-lg text-sm transition-colors text-left"
            :class="store.folder === f.id
              ? 'bg-accent-soft text-accent font-semibold'
              : 'text-ink-muted hover:bg-surface-hover hover:text-ink'">
            <i class="far fa-folder text-xs w-4 shrink-0"
              :style="{ marginLeft: `${(f.nivel || 0) * 0.85}rem` }"></i>
            <span class="truncate flex-1">{{ f.name }}</span>
            <span v-if="f.unread" class="text-micro font-mono tabular-nums shrink-0">{{ f.unread }}</span>
          </button>
        </template>

        <!-- Resposta automática: informação que só aparece se o Graph deixar ler -->
        <div v-if="store.mailbox?.available && store.mailbox.autoReply?.status !== 'disabled'"
          class="mt-4 px-3 py-2.5 rounded-lg bg-data-warn/10 border border-data-warn/25">
          <p class="text-micro font-semibold text-data-warn uppercase tracking-wide">Resposta automática ligada</p>
          <p class="text-xs text-data-warn mt-1 line-clamp-3">
            {{ (store.mailbox.autoReply.internal || '').replace(/<[^>]*>/g, '').slice(0, 120) || 'Sem texto definido.' }}
          </p>
        </div>
      </nav>

      <!-- ── Lista ── -->
      <section
        class="flex flex-col rounded-xl border border-line bg-surface-raised overflow-hidden"
        :class="vendoMensagem ? 'hidden lg:flex' : 'flex'">

        <!-- Barra de busca e filtros -->
        <div class="p-2.5 border-b border-line space-y-2 shrink-0">
          <div class="flex gap-2">
            <!-- Seletor de pasta no celular -->
            <select :value="store.folder" @change="store.openFolder($event.target.value)"
              class="lg:hidden px-2 py-2 text-xs rounded-lg border border-line bg-surface-sunken text-ink outline-none max-w-[9rem]">
              <option v-for="f in pastasPrincipais" :key="f.id" :value="f.wellKnownName">{{ f.name }}</option>
              <option v-for="f in pastasProprias" :key="f.id" :value="f.id">
                {{ '· '.repeat(f.nivel || 0) }}{{ f.name }}
              </option>
            </select>

            <Input v-model="busca" placeholder="Buscar no e-mail..." size="sm"
              icon-left="fas fa-magnifying-glass" class="flex-1" @update:modelValue="digitouBusca" />
            <IconButton v-if="store.search" icon="fas fa-xmark" label="Limpar busca" @click="limparBusca" />
          </div>

          <!-- Filtros. Escondidos durante a busca: o Graph não aceita os dois. -->
          <div v-if="!store.search" class="flex items-center gap-1.5 flex-wrap">
            <button v-for="f in [
                { k: 'unread', label: 'Não lidos', icon: 'fas fa-envelope' },
                { k: 'attachments', label: 'Com anexo', icon: 'fas fa-paperclip' },
                { k: 'flagged', label: 'Sinalizados', icon: 'fas fa-flag' },
              ]" :key="f.k"
              type="button"
              @click="store.applyFilters({ [f.k]: !store.filters[f.k] })"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-9 rounded-lg text-micro font-medium border transition-colors"
              :class="store.filters[f.k]
                ? 'bg-accent-soft border-accent/30 text-accent'
                : 'border-line text-ink-muted hover:text-ink'">
              <i :class="f.icon" class="text-micro"></i>{{ f.label }}
            </button>
            <button v-if="store.hasFilters" type="button" @click="store.clearFilters()"
              class="text-micro text-ink-subtle hover:text-ink underline min-h-9 px-1">
              limpar
            </button>
          </div>
          <p v-else class="text-micro text-ink-subtle">
            Buscando em toda a pasta. Os filtros voltam quando você limpar a busca.
          </p>
        </div>

        <MessageList
          :messages="store.messages"
          :selected-id="store.selected?.id || ''"
          :loading="store.loadingList"
          :has-more="store.hasMore"
          :can-organize="podeOrganizar"
          :empty-title="store.search ? 'Nada encontrado' : 'Pasta vazia'"
          :empty-text="store.search ? `Nenhum e-mail com \'${store.search}\' nesta pasta.` : 'Nenhuma mensagem aqui.'"
          @open="store.openMessage($event.id)"
          @flag="sinalizar"
          @delete="excluir"
          @more="store.loadMore()" />
      </section>

      <!-- ── Leitura ── -->
      <section
        class="rounded-xl border border-line bg-surface-raised overflow-hidden"
        :class="vendoMensagem ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'">
        <MessageView
          :message="store.selected"
          :loading="store.loadingMessage"
          :can-organize="podeOrganizar"
          :can-send="podeEnviar"
          :folders="pastasDestino"
          @close="store.closeMessage()"
          @move="mover"
          @reply="responder($event, 'reply')"
          @replyAll="responder($event, 'replyAll')"
          @forward="responder($event, 'forward')"
          @flag="sinalizar"
          @delete="excluir" />
      </section>
    </div>

    <ComposeModal
      :open="compondo"
      :draft="rascunho"
      :sending="store.sending"
      @close="compondo = false"
      @send="enviar"
      @saved="salvarRascunho" />
  </PageContainer>
</template>
