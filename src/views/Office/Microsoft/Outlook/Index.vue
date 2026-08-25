<script setup>
// /microsoft/outlook — o e-mail dentro do Office.
//
// A tela deixou de ser "a caixa" e virou um hub, no mesmo padrão da Central
// Microsoft (/microsoft/teams): SegmentedControl + deep-link ?tab= + KeepAlive.
// O motivo é o mesmo daquele: a caixa crua é a informação mais FRIA da tela.
// Abrir em cima de 400 mensagens em ordem de chegada obriga a pessoa a fazer a
// triagem com o olho, todo dia, de novo.
//
//   Triagem      o que precisa de você, e por quê — é onde a tela abre
//   Caixa        pastas · lista · leitura, do jeito que sempre foi
//   Automações   o que a IA pode fazer sozinha, e até onde
//   Relatórios   como foi a semana de e-mail
//
// O trilho da direita é persistente: a fila esperando OK, os prazos que a IA
// achou e o que você mandou e ninguém respondeu ficam visíveis de qualquer aba.
// Abaixo de 1280px ele sai — três colunas em tela estreita não é tela.
//
// Permissões: as capacidades (view, organize, send, automate) vêm prontas do
// servidor pelo useCan. A tela só pergunta; nunca recalcula a regra.

import { ref, computed, watch, onMounted, onUnmounted, provide, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useOutlookStore } from '@/stores/Microsoft/outlookStore';
import { useOutlookAiStore } from '@/stores/Microsoft/outlookAiStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';
import { useCan } from '@/composables/useCan';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Button from '@/components/UI/Button.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

import TrilhoLateral from './components/TrilhoLateral.vue';
import ComposeModal from './components/ComposeModal.vue';

const CaixaTab      = defineAsyncComponent(() => import('./components/CaixaTab.vue'));
const TriagemTab    = defineAsyncComponent(() => import('./components/TriagemTab.vue'));
const AutomacoesTab = defineAsyncComponent(() => import('./components/AutomacoesTab.vue'));
const RelatoriosTab = defineAsyncComponent(() => import('./components/RelatoriosTab.vue'));

const store = useOutlookStore();
const ai    = useOutlookAiStore();
const ms    = useMicrosoftStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const can = useCan('/microsoft/outlook');

const podeOrganizar = computed(() => can('organize'));
const podeEnviar    = computed(() => can('send'));
const podeAutomatizar = computed(() => can('automate'));

// ── Abas ──────────────────────────────────────────────────────────────────────
// Automações só entra para quem tem a capacidade: sem ela, a aba abriria só para
// dar 403 no primeiro clique.
const TABS = computed(() => [
  { value: 'triagem', label: 'Triagem', icon: 'fas fa-wand-magic-sparkles', count: ai.precisamDeVoce || undefined },
  { value: 'caixa', label: 'Caixa', icon: 'fas fa-inbox', count: store.unread.unread || undefined },
  ...(podeAutomatizar.value ? [{ value: 'automacoes', label: 'Automações', icon: 'fas fa-robot' }] : []),
  { value: 'relatorios', label: 'Relatórios', icon: 'fas fa-chart-line' },
]);

const VALID = computed(() => TABS.value.map(t => t.value));
const tab = ref(['triagem', 'caixa', 'automacoes', 'relatorios'].includes(route.query.tab) ? route.query.tab : 'triagem');

watch(tab, (v) => {
  if (route.query.tab !== v) router.replace({ query: { ...route.query, tab: v } });
});
watch(() => route.query.tab, (v) => {
  if (v && VALID.value.includes(v) && v !== tab.value) tab.value = v;
});
// Capacidade que sumiu (alçada revista com a tela aberta) não pode deixar a
// pessoa numa aba que não existe mais.
watch(VALID, (v) => { if (!v.includes(tab.value)) tab.value = 'triagem'; });

const PANELS = { triagem: TriagemTab, caixa: CaixaTab, automacoes: AutomacoesTab, relatorios: RelatoriosTab };
const painelAtual = computed(() => PANELS[tab.value] || TriagemTab);

const SUBTITULOS = {
  triagem: 'O que chegou, o que precisa de você e por quê. A IA lê antes, você decide.',
  caixa: 'Pastas, lista e leitura. O que você faz aqui vale no Outlook e no celular: é a mesma caixa.',
  automacoes: 'O que a IA pode fazer sozinha na sua caixa, e até onde. Tudo o que ela faz fica registrado.',
  relatorios: 'Como foi a sua semana de e-mail, com os números que dá para medir de verdade.',
};
const subtitulo = computed(() => SUBTITULOS[tab.value] || '');

// Painéis internos trocam de aba sem conhecer o router.
provide('olSetTab', (v) => { if (VALID.value.includes(v)) tab.value = v; });

// Canal para a Triagem pedir um recorte na aba Caixa ("mostre o ruído"). Vai
// por ref compartilhada, e não por evento, porque a Caixa é um componente
// assíncrono dentro de KeepAlive: quando o clique acontece ela pode nem existir
// ainda, e um evento disparado no vazio se perde.
const recortePedido = ref(null);
provide('olRecorte', recortePedido);
provide('olVerRecorte', (qual) => { tab.value = 'caixa'; recortePedido.value = { qual }; });
/**
 * Abrir uma mensagem de qualquer lugar: Triagem, trilho, relatório, histórico.
 *
 * O detalhe que fazia parecer que "nada abre": a mensagem quase sempre está
 * numa PASTA, e a aba Caixa abre na Caixa de Entrada. O e-mail aparecia no
 * painel de leitura mas sumia da lista ao lado, e a impressão era de que o
 * clique não tinha feito nada. Agora, quando ele não está na lista atual, a
 * lista passa para "toda a caixa" - aí a linha existe, fica marcada, e a pessoa
 * vê onde aquilo mora.
 */
provide('olAbrirEmail', async (messageId) => {
  tab.value = 'caixa';
  if (!messageId) return;

  const naLista = store.messages.some(m => m.id === messageId);
  if (!naLista && store.folder !== 'tudo') store.openFolder('tudo');

  store.openMessage(messageId);
});

// ── Escrever ──────────────────────────────────────────────────────────────────
const compondo = ref(false);
const rascunho = ref(null);

function escreverNovo() {
  rascunho.value = null;
  compondo.value = true;
}
provide('olEscrever', (draft = null) => { rascunho.value = draft; compondo.value = true; });

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
    rascunho.value = await store.saveDraft(payload.draftId, payload);
    toast.success('Rascunho salvo. Ele está na pasta Rascunhos, aqui e no Outlook.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível salvar o rascunho.');
  }
}

// ── Ciclo de vida ─────────────────────────────────────────────────────────────
// A caixa e a IA carregam JUNTAS, mas em promessas separadas: a triagem chama o
// modelo e pode demorar; a lista de e-mails não pode esperar por ela.
let contadorTimer = null;

onMounted(async () => {
  // O OfficeShell já pergunta o estado da conexão ao abrir o Office, então na
  // navegação normal isto nem chama. Só quem recarrega direto nesta URL espera.
  if (!ms.connected) await ms.fetchStatus();
  if (!ms.connected) return;

  // A caixa e a configuração saem juntas, sem esperar uma pela outra.
  store.init();
  ai.carregarSettings();

  // O trilho faz DUAS listagens no Graph (enviados + recebidos) e mora numa
  // coluna que nem existe abaixo de 1280px. Ele espera a tela pintar - senão
  // atrasa justamente o que a pessoa veio ver.
  requestAnimationFrame(() => ai.carregarTrilho());

  contadorTimer = setInterval(() => store.fetchUnread(), 120_000);
});

onUnmounted(() => clearInterval(contadorTimer));
</script>

<template>
  <PageContainer size="full">
    <PageHeader
      title="E-mail"
      :subtitle="subtitulo"
      icon-img="/icons/ms-outlook.svg"
      icon="fas fa-envelope">
      <template #actions>
        <Button v-if="podeEnviar" icon="fas fa-pen" @click="escreverNovo">Escrever</Button>
        <PageHelp
          storage-key="outlook"
          title="Como usar o e-mail no Office"
          intro="É a sua caixa do Outlook, dentro do Office - e uma IA que lê a caixa antes de você. O que você faz aqui aparece no Outlook e no celular, porque é a mesma caixa, não é cópia."
          :steps="[
            { title: 'Comece pela Triagem', text: 'Ela mostra o que precisa de você e por quê, ordenado por impacto e não por hora. Cada linha diz o que a IA entendeu do e-mail e qual seria a ação.' },
            { title: 'Ler e organizar', text: 'Na aba Caixa: abrir marca como lida, igual ao Outlook. Sinalizar e excluir estão na própria linha da lista, sem precisar abrir.' },
            { title: 'Quem manda é você', text: 'Em Automações você define até onde a IA vai. O nível de permissão é TETO: ele rebaixa o que a matriz pede, nunca promove. Enquanto ela estiver no nível 2, nada sai sem o seu OK.' },
            { title: 'A fila da direita', text: 'O que a IA escreveu fica ali esperando. Aprovar é enviar, e mostra para quem vai antes.' },
            { title: 'Buscar', text: 'A busca procura no assunto e no corpo de toda a pasta. Enquanto ela está ativa os filtros ficam de lado: a Microsoft não aceita os dois juntos.' },
          ]"
          :tips="[
            'A IA nunca responde sozinha sobre os assuntos que você marcou como protegidos, nem acima do seu teto de valor - mesmo que a matriz mande.',
            'As imagens de e-mail externo vêm bloqueadas: imagem remota costuma avisar o remetente que você abriu.',
            'Enviar não tem desfazer. Por isso o histórico da IA mostra desfazer só no que mexeu de pasta.',
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

    <template v-else>
      <!-- Barra de abas + selo da IA ao vivo -->
      <div class="flex items-center gap-3 flex-wrap mb-4">
        <SegmentedControl v-model="tab" :options="TABS" size="sm" />

        <!-- O selo é o único lugar que diz, de qualquer aba, se a IA está de
             pé e o que ela já fez hoje. Sem ele, "a IA trabalhou" é invisível. -->
        <span v-if="ai.painel"
          class="inline-flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border text-micro font-semibold
                 transition-colors duration-200 animate-pop-in"
          :class="ai.porHeuristica
            ? 'border-line bg-surface-sunken text-ink-muted'
            : 'border-accent/30 bg-accent-soft text-accent'">
          <span class="w-1.5 h-1.5 rounded-full"
            :class="ai.porHeuristica ? 'bg-ink-subtle' : 'bg-accent animate-pulse'"></span>
          <template v-if="ai.porHeuristica">
            Triagem por regra · o modelo de IA não está configurado aqui
          </template>
          <template v-else>
            IA ativa · {{ ai.painel.metricas.classificados }} lidos hoje
          </template>
        </span>
      </div>

      <!-- Corpo: painel + trilho persistente -->
      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem] items-start">
        <div class="min-w-0">
          <!-- SEM `mode="out-in"` de propósito.
               Com ele, mais KeepAlive, mais componente assíncrono, o Vue tentava
               inserir o painel novo num pai que a saída do anterior já tinha
               desmontado: "Cannot read properties of null (reading
               'insertBefore')", e a aba Caixa parava de responder. A entrada
               simples dá o mesmo movimento sem a corrida entre sair e entrar. -->
          <Transition
            enter-active-class="transition duration-200 ease-out-expo"
            enter-from-class="opacity-0 translate-y-1">
            <KeepAlive>
              <component
                :is="painelAtual"
                :key="tab"
                :pode-organizar="podeOrganizar"
                :pode-enviar="podeEnviar"
                :pode-automatizar="podeAutomatizar" />
            </KeepAlive>
          </Transition>
        </div>

        <TrilhoLateral class="hidden xl:flex" :pode-enviar="podeEnviar" />
      </div>
    </template>

    <ComposeModal
      :open="compondo"
      :draft="rascunho"
      :sending="store.sending"
      @close="compondo = false"
      @send="enviar"
      @saved="salvarRascunho" />
  </PageContainer>
</template>
