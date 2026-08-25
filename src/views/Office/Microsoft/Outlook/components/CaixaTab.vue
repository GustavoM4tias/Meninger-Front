<script setup>
// Outlook › aba Caixa.
//
// É a tela de e-mail que já existia, agora como painel do hub: pastas | lista |
// leitura no desktop, uma coisa de cada vez no celular. O comportamento não
// mudou - o que mudou é que ela deixou de ser a porta de entrada e virou o lugar
// onde se trabalha o e-mail depois que a Triagem disse o que importa.
//
// A pasta "Precisa de você" é a única nova, e ela não existe no Outlook: é um
// recorte da leitura da IA sobre a Caixa de Entrada. Fica junto das outras
// porque é onde a pessoa procura pasta, mas com o ícone da IA para ninguém achar
// que é pasta de verdade que também está no Outlook do celular.

import { ref, computed, inject, watch, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useOutlookStore } from '@/stores/Microsoft/outlookStore';
import { useOutlookAiStore } from '@/stores/Microsoft/outlookAiStore';
import { pedirConfirmacao } from '@/composables/useConfirm';

import Input from '@/components/UI/Input.vue';
import IconButton from '@/components/UI/IconButton.vue';
import MessageList from './MessageList.vue';
import MessageView from './MessageView.vue';
import MenuContexto from './MenuContexto.vue';
import { downloadUrl } from '@/utils/Microsoft/apiOutlook';

const { podeOrganizar, podeEnviar, podeAutomatizar } = defineProps({
  podeOrganizar: { type: Boolean, default: false },
  podeEnviar: { type: Boolean, default: false },
  podeAutomatizar: { type: Boolean, default: false },
});

const store = useOutlookStore();
const ai = useOutlookAiStore();
const toast = useToast();
const escrever = inject('olEscrever', () => {});

// A Triagem manda abrir um recorte pelos cartões de número ("Ruído", "Precisam
// de você"). Sem isto o clique caía na Caixa de Entrada crua e a pessoa tinha
// que reencontrar sozinha o que a tela acabou de mostrar.
const pedirRegra = inject('olPedirRegra', () => {});
const pedido = inject('olRecorte', ref(null));

function atenderPedido(v) {
  if (!v) return;
  abrirRecorte(v.qual);
  pedido.value = null;
}

// O watch sozinho não bastava: a Caixa é um componente ASSÍNCRONO, então no
// primeiro clique o valor já tinha mudado antes de este watch existir para
// ouvir - e o KPI parecia não fazer nada. A leitura no onMounted pega
// justamente esse caso.
watch(pedido, atenderPedido);
onMounted(() => atenderPedido(pedido.value));

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
// Entrada. O backend devolve a árvore achatada, em ordem de exibição; aqui só se
// calcula a indentação relativa ao primeiro ancestral visível - pasta vazia
// inclusive, porque é destino de "mover".
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

const pastasDestino = computed(() => [
  ...pastasPrincipais.value.filter(f => f.wellKnownName !== 'drafts').map(f => ({ ...f, nivel: 0 })),
  ...pastasProprias.value,
]);

// ── Recortes da IA ────────────────────────────────────────────────────────────
// Não são pastas do Outlook: são listas montadas a partir da LEITURA da IA.
//
// Antes o recorte filtrava `store.messages` (a lista da pasta aberta) pelos ids
// prioritários. Só que os prioritários vêm da caixa INTEIRA, e a lista mostrava
// a Caixa de Entrada: a interseção dava vazio e a tela dizia "nada esperando por
// você" com seis pendências existindo. Agora a lista é construída DA TRIAGEM,
// que é onde o dado está - e por isso nunca mais depende de qual pasta está
// aberta.
const recorteIA = ref(null);   // null | 'precisa' | 'ruido'

/** Uma linha da triagem no formato que a lista de mensagens sabe desenhar. */
function comoMensagem(p) {
  return {
    id: p.messageId,
    subject: p.assunto || '(sem assunto)',
    from: { name: p.de, email: p.email },
    to: [],
    cc: [],
    preview: p.porque || p.resumo || '',
    receivedAt: p.quando,
    // O recorte é sobre o que a IA entendeu, não sobre o estado da mensagem.
    // Marcar tudo como lido evita a lista sugerir um "não lido" que não é dela.
    isRead: true,
    hasAttachments: false,
    flagged: false,
    categories: [],
    folderId: null,
  };
}

const mensagensVisiveis = computed(() => {
  if (recorteIA.value === 'precisa') return (ai.painel?.prioritarios || []).map(comoMensagem);
  if (recorteIA.value === 'ruido') return (ai.painel?.ruidos || []).map(comoMensagem);
  return store.messages;
});

const RECORTES = {
  precisa: {
    titulo: 'Precisa de você',
    aviso: 'Recorte da leitura da IA sobre a caixa inteira. Não é uma pasta do Outlook.',
    vazioTitulo: 'Nada esperando por você',
    vazioTexto: 'A IA não encontrou nada na sua caixa que dependa de uma decisão sua.',
  },
  ruido: {
    titulo: 'Ruído',
    aviso: 'O que a IA classificou como ruído: newsletter, confirmação automática e cópia de sistema. Confira se ela não errou.',
    vazioTitulo: 'Nada marcado como ruído',
    vazioTexto: 'Tudo que chegou pareceu relevante para a IA.',
  },
};
const recorte = computed(() => RECORTES[recorteIA.value] || null);

function abrirPasta(id) {
  recorteIA.value = null;
  store.openFolder(id);
}

function abrirRecorte(qual) {
  recorteIA.value = qual;
  busca.value = '';
  store.applySearch('', { emTodaCaixa: false });
}

// ── Busca ─────────────────────────────────────────────────────────────────────
const busca = ref('');
let buscaTimer = null;

// Buscar SEMPRE varre a caixa inteira, nunca só a pasta aberta. Procurar um
// e-mail é justamente o momento em que a pessoa não sabe onde ele está - e
// numa caixa com 60 pastas, buscar dentro de uma só quase nunca acha.
function digitouBusca() {
  clearTimeout(buscaTimer);
  buscaTimer = setTimeout(() => {
    if (busca.value) recorteIA.value = false;
    store.applySearch(busca.value, { emTodaCaixa: true });
  }, 400);
}
function limparBusca() {
  busca.value = '';
  clearTimeout(buscaTimer);
  store.applySearch('', { emTodaCaixa: false });
}

// ── Mobile: lista OU leitura ──────────────────────────────────────────────────
const vendoMensagem = computed(() => !!store.selected || store.loadingMessage);

// ── Menu do botão direito ─────────────────────────────────────────────────────
//
// Quem monta a lista é a TELA, não o menu: aqui já se sabe o que a pessoa pode
// (organizar, enviar), então a linha que ela não pode simplesmente não existe.
// Menu que mostra opção desabilitada só ensina o que ela não tem.
const menu = ref({ aberto: false, x: 0, y: 0, alvo: null, tipo: null });

function fecharMenu() { menu.value = { ...menu.value, aberto: false }; }

function abrirMenuMensagem({ evento, mensagem }) {
  menu.value = { aberto: true, x: evento.clientX, y: evento.clientY, alvo: mensagem, tipo: 'mensagem' };
}

function abrirMenuPasta(evento, pasta) {
  evento.preventDefault();
  menu.value = { aberto: true, x: evento.clientX, y: evento.clientY, alvo: pasta, tipo: 'pasta' };
}

const IMPORTANCIAS = [
  { id: 'high', label: 'Alta', icone: 'fas fa-arrow-up', cor: 'rgb(var(--data-neg))' },
  { id: 'normal', label: 'Normal', icone: 'fas fa-minus' },
  { id: 'low', label: 'Baixa', icone: 'fas fa-arrow-down' },
];

const itensDoMenu = computed(() => {
  const alvo = menu.value.alvo;
  if (!alvo) return [];

  // ── Pasta ────────────────────────────────────────────────────────────────
  if (menu.value.tipo === 'pasta') {
    const doSistema = !!alvo.wellKnownName;
    return [
      { id: 'abrir-pasta', label: 'Abrir', icone: 'fas fa-folder-open' },
      { id: 'sub', label: 'Criar pasta dentro', icone: 'fas fa-folder-plus' },
      { separador: true },
      {
        id: 'renomear', label: 'Renomear', icone: 'fas fa-pen',
        desabilitado: doSistema || !podeOrganizar,
        dica: doSistema ? 'As pastas do sistema não podem ser renomeadas.' : '',
      },
      {
        id: 'excluir-pasta', label: 'Excluir pasta', icone: 'fas fa-trash', perigo: true,
        desabilitado: doSistema || !podeOrganizar,
        dica: doSistema ? 'As pastas do sistema não podem ser excluídas.' : '',
      },
    ];
  }

  // ── Mensagem ─────────────────────────────────────────────────────────────
  const m = alvo;
  const itens = [
    { id: 'abrir', label: 'Abrir', icone: 'fas fa-envelope-open' },
  ];

  if (podeEnviar) {
    itens.push(
      { id: 'responder', label: 'Responder', icone: 'fas fa-reply' },
      { id: 'responder-todos', label: 'Responder a todos', icone: 'fas fa-reply-all' },
      { id: 'encaminhar', label: 'Encaminhar', icone: 'fas fa-share' },
    );
  }

  itens.push({ separador: true });

  if (podeOrganizar) {
    itens.push(
      {
        id: 'lido', icone: m.isRead ? 'fas fa-envelope' : 'fas fa-envelope-open',
        label: m.isRead ? 'Marcar como não lida' : 'Marcar como lida',
      },
      {
        id: 'sinalizar', icone: 'fas fa-flag',
        label: m.flagged ? 'Tirar o sinalizador' : 'Sinalizar para acompanhar',
        cor: m.flagged ? 'rgb(var(--data-warn))' : undefined,
      },
      {
        id: 'importancia', label: 'Importância', icone: 'fas fa-exclamation',
        submenu: IMPORTANCIAS.map(i => ({ ...i, ativo: (m.importance || 'normal') === i.id })),
      },
      {
        id: 'mover', label: 'Mover para', icone: 'fas fa-folder-open',
        submenu: pastasDestino.value.map(f => ({
          id: f.id, label: f.name, nivel: f.nivel || 0, icone: f.icon || 'far fa-folder',
        })),
      },
      { id: 'arquivar', label: 'Arquivar', icone: 'fas fa-box-archive' },
    );
  }

  itens.push({ separador: true });

  // Baixar depende só de ver: é levar embora o que já se pode ler.
  itens.push({ id: 'baixar', label: 'Baixar o e-mail (.eml)', icone: 'fas fa-download' });

  if (m.hasAttachments) {
    itens.push({ id: 'anexos', label: 'Ver os anexos', icone: 'fas fa-paperclip' });
  }

  itens.push(
    { id: 'copiar-remetente', label: 'Copiar o e-mail de quem mandou', icone: 'fas fa-copy' },
    { id: 'do-remetente', label: 'Ver tudo desta pessoa', icone: 'fas fa-user' },
  );

  if (podeAutomatizar) {
    itens.push({ separador: true },
      { id: 'regra', label: 'Criar regra a partir deste', icone: 'fas fa-wand-magic-sparkles' });
  }

  if (podeOrganizar) {
    itens.push({ separador: true },
      { id: 'excluir', label: 'Excluir', icone: 'fas fa-trash', perigo: true });
  }

  return itens;
});

const tituloMenu = computed(() => {
  const a = menu.value.alvo;
  if (!a) return '';
  return menu.value.tipo === 'pasta' ? a.name : (a.subject || '(sem assunto)');
});

async function executarMenu({ id, valor, sub }) {
  const alvo = menu.value.alvo;
  if (!alvo) return;

  try {
    switch (id) {
      // ── Pasta ───────────────────────────────────────────────────────────
      case 'abrir-pasta': return abrirPasta(alvo.wellKnownName || alvo.id);
      case 'sub': return criarPasta(alvo.id);
      case 'renomear': return renomearPasta(alvo);
      case 'excluir-pasta': return excluirPasta(alvo);

      // ── Mensagem ────────────────────────────────────────────────────────
      case 'abrir': return store.openMessage(alvo.id);
      case 'responder': return responder(alvo, 'reply');
      case 'responder-todos': return responder(alvo, 'replyAll');
      case 'encaminhar': return responder(alvo, 'forward');

      case 'lido':
        await store.markRead(alvo.id, !alvo.isRead);
        return toast.success(alvo.isRead ? 'Marcada como não lida.' : 'Marcada como lida.');

      case 'sinalizar': return sinalizar(alvo);

      case 'importancia': {
        await store.setImportance(alvo.id, valor);
        return toast.success(`Importância: ${sub?.label?.toLowerCase() || valor}.`);
      }

      case 'mover': {
        const destino = pastasDestino.value.find(f => f.id === valor);
        return mover({ message: alvo, folder: destino });
      }

      case 'arquivar': {
        const arq = pastasDestino.value.find(f => f.wellKnownName === 'archive');
        return mover({ message: alvo, folder: arq || { id: 'archive', name: 'Arquivo Morto' } });
      }

      case 'baixar': {
        // Sai pela rota autenticada, com o assunto virando nome do arquivo.
        window.open(downloadUrl(alvo.id, alvo.subject), '_blank');
        return;
      }

      case 'anexos':
        store.openMessage(alvo.id);
        return toast.success('Os anexos ficam no topo da leitura.');

      case 'copiar-remetente': {
        await navigator.clipboard.writeText(alvo.from?.email || '');
        return toast.success('E-mail copiado.');
      }

      case 'do-remetente': {
        store.applyFilters({ from: alvo.from?.email || '' });
        return toast.success(`Mostrando o que ${alvo.from?.name || 'essa pessoa'} mandou.`);
      }

      case 'regra': return criarRegraDaqui(alvo);

      case 'excluir': return excluir(alvo);
      default: return;
    }
  } catch (err) {
    toast.error(err?.message || 'Não foi possível concluir.');
  }
}

// ── Pastas: criar, renomear, excluir ─────────────────────────────────────────
async function criarPasta(parentId = null) {
  const nome = await pedirConfirmacao({
    tone: 'accent',
    title: parentId ? 'Criar pasta dentro desta?' : 'Criar pasta nova?',
    consequence: 'A pasta é criada na sua caixa e aparece também no Outlook, no celular e no desktop.',
    askNote: true,
    noteLabel: 'Nome da pasta',
    notePlaceholder: 'Ex.: Contratos 2026',
    confirmLabel: 'Criar pasta',
  });
  if (!nome || !nome.trim()) return;
  try {
    await store.criarPasta(nome.trim(), parentId);
    toast.success(`Pasta "${nome.trim()}" criada. Ela também aparece no seu Outlook.`);
  } catch (err) {
    toast.error(erroDePermissao(err) || 'Não foi possível criar a pasta.');
  }
}

async function renomearPasta(pasta) {
  const nome = await pedirConfirmacao({
    tone: 'accent',
    title: `Renomear a pasta "${pasta.name}"?`,
    consequence: 'O nome muda também no Outlook. As mensagens dentro dela não são afetadas.',
    askNote: true,
    noteLabel: 'Novo nome',
    noteDefault: pasta.name,
    confirmLabel: 'Renomear',
  });
  if (!nome || !nome.trim() || nome.trim() === pasta.name) return;
  try {
    await store.renomearPasta(pasta.id, nome.trim());
    toast.success('Pasta renomeada.');
  } catch (err) {
    toast.error(erroDePermissao(err) || 'Não foi possível renomear.');
  }
}

async function excluirPasta(pasta) {
  const ok = await pedirConfirmacao({
    title: `Excluir a pasta "${pasta.name}"?`,
    consequence: `As ${pasta.total || 0} mensagens dentro dela vão para os Itens Excluídos, `
      + 'aqui e no seu Outlook. A pasta some das duas telas.',
    confirmLabel: 'Excluir pasta',
  });
  if (!ok) return;
  try {
    await store.excluirPasta(pasta.id);
    toast.success('Pasta excluída.');
  } catch (err) {
    toast.error(erroDePermissao(err) || 'Não foi possível excluir a pasta.');
  }
}

/** A frase que diz QUAL permissão falta, em vez de "erro de permissão". */
function erroDePermissao(err) {
  return /permiss|forbidden|accessdenied/i.test(err?.message || '')
    ? 'Isto depende da permissão Mail.ReadWrite no Azure. Fale com quem administra o tenant.'
    : (err?.message || '');
}

/** Manda a IA transformar este e-mail numa regra, já com o remetente dentro. */
function criarRegraDaqui(m) {
  const de = m.from?.email || m.from?.name || '';
  pedirRegra(`Quando chegar e-mail de ${de} com assunto parecido com "${m.subject}", `
    + 'arquive e não me avise.');
}

// ── Ações ─────────────────────────────────────────────────────────────────────

async function responder(mensagem, kind) {
  try {
    escrever(await store.startReply(mensagem.id, kind));
  } catch (err) {
    toast.error(err?.message || 'Não foi possível preparar a resposta.');
  }
}

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
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-[13rem_minmax(19rem,25rem)_1fr] gap-4
              h-[calc(100vh-17rem)] min-h-[32rem]">

    <!-- ── Pastas (some no celular; lá a navegação é pelo seletor de cima) ── -->
    <nav class="hidden lg:flex flex-col gap-0.5 overflow-y-auto pr-1">

      <!-- O recorte da IA vem primeiro porque é o que a pessoa quer depois de
           ver a Triagem. Ícone diferente: não é pasta do Outlook. -->
      <button type="button" @click="abrirRecorte('precisa')"
        class="group flex items-center gap-2.5 px-3 py-2.5 min-h-11 rounded-lg text-sm text-left
               border transition-all duration-120 ease-out-expo"
        :class="recorteIA === 'precisa'
          ? 'bg-accent-soft border-accent/30 text-accent font-semibold'
          : 'border-transparent text-ink-muted hover:bg-surface-hover hover:text-ink hover:border-line'">
        <i class="fas fa-wand-magic-sparkles text-xs w-4 shrink-0 transition-colors"
          :class="recorteIA === 'precisa' ? 'text-accent' : 'text-ink-subtle group-hover:text-accent'"></i>
        <span class="truncate flex-1">Precisa de você</span>
        <span v-if="ai.precisamDeVoce"
          class="text-micro font-mono tabular-nums shrink-0 px-1.5 rounded-md"
          :class="recorteIA === 'precisa' ? 'bg-accent/15' : 'bg-surface-sunken'">{{ ai.precisamDeVoce }}</span>
      </button>

      <!-- O ruído também é recorte: é o que a pessoa quer CONFERIR, porque é
           onde a IA pode ter jogado fora algo que importava. -->
      <button type="button" @click="abrirRecorte('ruido')"
        class="group flex items-center gap-2.5 px-3 py-2.5 min-h-11 rounded-lg text-sm text-left
               border transition-all duration-120 ease-out-expo"
        :class="recorteIA === 'ruido'
          ? 'bg-accent-soft border-accent/30 text-accent font-semibold'
          : 'border-transparent text-ink-muted hover:bg-surface-hover hover:text-ink hover:border-line'">
        <i class="fas fa-filter text-xs w-4 shrink-0"></i>
        <span class="truncate flex-1">Ruído</span>
        <span v-if="ai.painel?.metricas?.ruido"
          class="text-micro font-mono tabular-nums shrink-0 px-1.5 rounded-md"
          :class="recorteIA === 'ruido' ? 'bg-accent/15' : 'bg-surface-sunken'">
          {{ ai.painel.metricas.ruido }}
        </span>
      </button>

      <!-- A caixa INTEIRA. Quem organiza e-mail em pastas tem a Caixa de
           Entrada com o que sobrou, e ate aqui a tela so sabia mostrar ela. -->
      <button type="button" @click="abrirPasta('tudo')"
        class="group flex items-center gap-2.5 px-3 py-2.5 min-h-11 rounded-lg text-sm text-left
               border transition-all duration-120 ease-out-expo"
        :class="!recorteIA && store.folder === 'tudo'
          ? 'bg-accent-soft border-accent/30 text-accent font-semibold'
          : 'border-transparent text-ink-muted hover:bg-surface-hover hover:text-ink hover:border-line'">
        <i class="fas fa-layer-group text-xs w-4 shrink-0"></i>
        <span class="truncate flex-1">Toda a caixa</span>
      </button>

      <div class="h-px bg-line my-1.5 mx-2"></div>

      <button v-for="f in pastasPrincipais" :key="f.id" type="button"
        @click="abrirPasta(f.wellKnownName)"
        @contextmenu="abrirMenuPasta($event, f)"
        class="flex items-center gap-2.5 px-3 py-2.5 min-h-11 rounded-lg text-sm text-left
               transition-all duration-120 ease-out-expo"
        :class="!recorteIA && store.folder === f.wellKnownName
          ? 'bg-accent-soft text-accent font-semibold'
          : 'text-ink-muted hover:bg-surface-hover hover:text-ink hover:translate-x-0.5'">
        <i :class="f.icon" class="text-xs w-4 shrink-0"></i>
        <span class="truncate flex-1">{{ f.name }}</span>
        <span v-if="f.unread" class="text-micro font-mono tabular-nums shrink-0">{{ f.unread }}</span>
      </button>

      <template v-if="pastasProprias.length || podeOrganizar">
        <div class="flex items-center justify-between px-3 pt-4 pb-1">
          <p class="text-micro font-semibold text-ink-subtle uppercase tracking-wide">Suas pastas</p>
          <button v-if="podeOrganizar" type="button" title="Criar pasta"
            class="w-6 h-6 rounded-md grid place-items-center text-ink-subtle
                   hover:text-accent hover:bg-surface-hover transition-colors duration-120"
            @click="criarPasta(null)">
            <i class="fas fa-plus text-micro"></i>
          </button>
        </div>
        <button v-for="f in pastasProprias" :key="f.id" type="button"
          @click="abrirPasta(f.id)"
          @contextmenu="abrirMenuPasta($event, f)"
          class="flex items-center gap-2.5 px-3 py-2.5 min-h-11 rounded-lg text-sm text-left
                 transition-all duration-120 ease-out-expo"
          :class="!recorteIA && store.folder === f.id
            ? 'bg-accent-soft text-accent font-semibold'
            : 'text-ink-muted hover:bg-surface-hover hover:text-ink hover:translate-x-0.5'">
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

      <div class="p-2.5 border-b border-line space-y-2 shrink-0">
        <div class="flex gap-2">
          <!-- Seletor de pasta no celular -->
          <select :value="store.folder" @change="abrirPasta($event.target.value)"
            class="lg:hidden px-2 py-2 text-xs rounded-lg border border-line bg-surface-sunken text-ink outline-none max-w-[9rem]">
            <option value="tudo">Toda a caixa</option>
            <option v-for="f in pastasPrincipais" :key="f.id" :value="f.wellKnownName">{{ f.name }}</option>
            <option v-for="f in pastasProprias" :key="f.id" :value="f.id">
              {{ '· '.repeat(f.nivel || 0) }}{{ f.name }}
            </option>
          </select>

          <Input v-model="busca" placeholder="Buscar no e-mail..." size="sm"
            icon-left="fas fa-magnifying-glass" class="flex-1" @update:modelValue="digitouBusca" />
          <IconButton v-if="store.search" icon="fas fa-xmark" label="Limpar busca" @click="limparBusca" />
        </div>

        <!-- Faixa do recorte: ele não é pasta, então precisa dizer o que é e
             como sair. -->
        <div v-if="recorte"
          class="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-accent-soft border border-accent/25 animate-slide-down">
          <i class="fas fa-wand-magic-sparkles text-micro text-accent shrink-0"></i>
          <p class="text-micro text-accent flex-1">{{ recorte.aviso }}</p>
          <button type="button" class="text-micro text-accent underline shrink-0" @click="abrirPasta('tudo')">
            ver toda a caixa
          </button>
        </div>

        <!-- Filtros. Escondidos durante a busca: o Graph não aceita os dois. -->
        <div v-if="!store.search && !recorteIA" class="flex items-center gap-1.5 flex-wrap" >
          <button v-for="f in [
              { k: 'unread', label: 'Não lidos', icon: 'fas fa-envelope' },
              { k: 'attachments', label: 'Com anexo', icon: 'fas fa-paperclip' },
              { k: 'flagged', label: 'Sinalizados', icon: 'fas fa-flag' },
            ]" :key="f.k"
            type="button"
            @click="store.applyFilters({ [f.k]: !store.filters[f.k] })"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-9 rounded-lg text-micro font-medium border
                   transition-all duration-120 ease-out-expo"
            :class="store.filters[f.k]
              ? 'bg-accent-soft border-accent/30 text-accent'
              : 'border-line text-ink-muted hover:text-ink hover:border-line-strong'">
            <i :class="f.icon" class="text-micro"></i>{{ f.label }}
          </button>
          <button v-if="store.hasFilters" type="button" @click="store.clearFilters()"
            class="text-micro text-ink-subtle hover:text-ink underline min-h-9 px-1">
            limpar
          </button>
        </div>
        <p v-else-if="store.search" class="text-micro text-ink-subtle">
          Buscando em <span class="text-ink">todas as pastas</span> da sua caixa. Os filtros voltam quando
          você limpar a busca.
        </p>
      </div>

      <MessageList
        :messages="mensagensVisiveis"
        :selected-id="store.selected?.id || ''"
        :loading="store.loadingList"
        :has-more="store.hasMore && !recorteIA"
        :can-organize="podeOrganizar"
        :leituras="ai.painel?.prioritarios || []"
        :pastas="store.folder === 'tudo' || store.search ? store.folders : []"
        :empty-title="recorte ? recorte.vazioTitulo : (store.search ? 'Nada encontrado' : 'Pasta vazia')"
        :empty-text="recorte ? recorte.vazioTexto
          : (store.search ? `Nenhum e-mail com '${store.search}' em nenhuma pasta.` : 'Nenhuma mensagem aqui.')"
        @open="store.openMessage($event.id)"
        @menu="abrirMenuMensagem"
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

    <!-- Um menu para os dois alvos: a mecânica é a mesma, só o conteúdo muda. -->
    <MenuContexto :aberto="menu.aberto" :x="menu.x" :y="menu.y"
      :titulo="tituloMenu" :itens="itensDoMenu"
      @fechar="fecharMenu" @acao="executarMenu" />
  </div>
</template>
