<script setup>
// Outlook › aba Automações. Onde a pessoa diz até onde a IA vai.
//
// A tela inteira gira em torno de uma ideia: o NÍVEL DE PERMISSÃO É TETO. A
// matriz diz o que você QUER que aconteça por importância; o nível, os assuntos
// protegidos e o teto de valor só REBAIXAM. Por isso cada linha da matriz mostra
// o que vai acontecer DE VERDADE quando o seu nível rebaixa a sua escolha - a
// alternativa seria a pessoa configurar "responde sozinha" e nunca entender por
// que nada saiu.
//
// A mesma regra roda no servidor (MicrosoftOutlookAiService._decidir). Esta tela
// não recalcula permissão: ela EXPLICA a que o servidor já aplicou, e o resumo
// de cada linha vem do mesmo vocabulário.

import { ref, computed, watch, onMounted, inject } from 'vue';
import { useToast } from 'vue-toastification';
import { useOutlookAiStore } from '@/stores/Microsoft/outlookAiStore';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';
import { pedirConfirmacao } from '@/composables/useConfirm';

import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const props = defineProps({
  podeAutomatizar: { type: Boolean, default: false },
});

const ai = useOutlookAiStore();
const perm = usePermissionStore();
const abrirEmail = inject('olAbrirEmail', () => {});
const toast = useToast();

// Admin confirmado pelo SERVIDOR. Nunca `authStore.user.role`, e muito menos
// localStorage - com aquilo dava para se promover a admin no navegador.
const ehAdmin = computed(() => perm.isAdmin);

onMounted(() => {
  if (!ai.settings) ai.carregarSettings();
  if (!ai.regras.length) ai.carregarRegras();
  if (!ai.historico.length) ai.carregarHistorico();
  if (ehAdmin.value && !ai.configEmpresa) ai.carregarConfigEmpresa();
});

// ── Interruptores da empresa ──────────────────────────────────────────────────
// Ligar a execução automática muda o comportamento em TODA caixa da Menin, não
// só na de quem clicou. Por isso a confirmação diz exatamente isso.
async function ligarAutomacaoDaEmpresa(valor) {
  if (valor) {
    const ok = await pedirConfirmacao({
      title: 'Deixar a IA agir sozinha em toda a empresa?',
      consequence: 'A partir de agora, em TODAS as caixas com a IA ligada, ela passa a arquivar e a responder '
        + 'sem passar pela fila - até o limite do nível de permissão de cada pessoa. E-mail enviado não tem desfazer.',
      confirmLabel: 'Ligar para todos',
    });
    if (!ok) return;
  }
  try {
    await ai.salvarConfigEmpresa({ outlook_ai_auto_enabled: valor });
    toast.success(valor
      ? 'Execução automática ligada para a empresa.'
      : 'Execução automática desligada. A IA volta a só ler e escrever.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível salvar.');
  }
}

async function salvarTetoTriagem(valor) {
  try {
    await ai.salvarConfigEmpresa({ outlook_ai_triage_size: Number(valor) });
    toast.success('Teto da triagem salvo.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível salvar.');
  }
}

// ── Rascunho local ────────────────────────────────────────────────────────────
// A tela edita uma cópia e salva no botão. Salvar a cada tecla mandaria dezenas
// de requisições e, pior, mudaria o comportamento da IA no meio da edição.
const form = ref(null);
const sujo = ref(false);

function hidratar(s) {
  if (!s) return;
  form.value = JSON.parse(JSON.stringify({
    contexto: s.contexto || '',
    tom: s.tom || 'Direto',
    temperatura: s.temperatura ?? 25,
    nivel: s.nivel ?? 2,
    teto_mil: s.teto_mil ?? 150,
    janela: s.janela || 'comercial',
    matriz: s.matriz || {},
    limites: s.limites || [],
    ativo: s.ativo !== false,
    assinatura: s.assinatura || '',
    saudacao: s.saudacao || '',
    despedida: s.despedida || '',
    escopo: s.escopo || 'tudo',
    janela_inicio: s.janela_inicio ?? 8,
    janela_fim: s.janela_fim ?? 19,
    janela_dias: Array.isArray(s.janela_dias) && s.janela_dias.length ? [...s.janela_dias] : [1, 2, 3, 4, 5],
  }));
}

watch(() => ai.settings, (s) => {
  // Não sobrescreve edição em andamento: a resposta de um salvamento não pode
  // apagar o que a pessoa digitou depois de clicar. Quem TROCA o texto de
  // propósito (aceitar o contexto proposto) re-hidrata na mão, porque o watch
  // já passou com o formulário sujo.
  if (sujo.value) return;
  hidratar(s);
}, { immediate: true, deep: false });

function mexeu() { sujo.value = true; }

// ── Vocabulário compartilhado com o servidor ──────────────────────────────────
const COMPORTAMENTOS = [
  { id: 'responder', label: 'Responde', frase: 'responde sozinha' },
  { id: 'aprovar', label: 'Pede OK', frase: 'escreve e pede seu OK' },
  { id: 'notificar', label: 'Só notifica', frase: 'só te notifica' },
  { id: 'silenciar', label: 'Silencia', frase: 'fica em silêncio' },
];
const FORCA = { silenciar: 0, notificar: 1, aprovar: 2, responder: 3 };

const LINHAS = [
  { id: 'critica', nome: 'Crítica', ponto: 'bg-data-neg', ajuda: 'prazo legal, órgão público, risco de parar obra' },
  { id: 'alta', nome: 'Alta', ponto: 'bg-data-warn', ajuda: 'decisão que trava o trabalho de alguém' },
  { id: 'media', nome: 'Média', ponto: 'bg-accent', ajuda: 'pedido comum que merece resposta' },
  { id: 'ruido', nome: 'Ruído', ponto: 'bg-ink-subtle', ajuda: 'newsletter, confirmação automática, cópia de sistema' },
];

const NIVEIS = [
  { n: 1, titulo: 'Só observa', descricao: 'Classifica e resume. Nada sai da caixa sem você.' },
  { n: 2, titulo: 'Escreve e espera', descricao: 'Redige a resposta no seu tom e deixa na fila de aprovação.' },
  { n: 3, titulo: 'Responde o rotineiro', descricao: 'O que é médio ou ruído ela resolve sozinha; crítico e alto sempre pedem OK.' },
  { n: 4, titulo: 'Age por você', descricao: 'Responde, arquiva e cobra. Você vê o registro depois, no histórico abaixo.' },
];

/** O mesmo teto do servidor, para a tela poder EXPLICAR o rebaixamento. */
function tetoDoNivel(nivel, classe) {
  const n = Number(nivel) || 2;
  if (n <= 1) return 'notificar';
  if (n === 2) return 'aprovar';
  if (n === 3) return (classe === 'media' || classe === 'ruido') ? 'responder' : 'aprovar';
  return 'responder';
}

/** O que acontece de verdade nesta linha, depois do teto do nível. */
function efetivo(classeId) {
  const querido = form.value?.matriz?.[classeId] || 'aprovar';
  const teto = tetoDoNivel(form.value?.nivel, classeId);
  return FORCA[teto] < FORCA[querido] ? teto : querido;
}
function rebaixada(classeId) {
  return efetivo(classeId) !== (form.value?.matriz?.[classeId] || 'aprovar');
}
const frase = (id) => COMPORTAMENTOS.find(c => c.id === id)?.frase || id;

const resumoMatriz = computed(() => {
  if (!form.value) return '';
  return `Hoje, na prática: e-mail crítico ${frase(efetivo('critica'))}, `
    + `alto ${frase(efetivo('alta'))}, médio ${frase(efetivo('media'))} `
    + `e ruído ${frase(efetivo('ruido'))}.`;
});

function escolherComportamento(classeId, comportamentoId) {
  form.value.matriz = { ...form.value.matriz, [classeId]: comportamentoId };
  mexeu();
}

// ── Temperatura e teto ────────────────────────────────────────────────────────
const rotuloTemperatura = computed(() => {
  const t = form.value?.temperatura ?? 25;
  if (t <= 20) return `Muito literal · ${t}`;
  if (t <= 45) return `Conservadora · ${t}`;
  if (t <= 70) return `Equilibrada · ${t}`;
  return `Criativa · ${t}`;
});

const rotuloTeto = computed(() => {
  const v = form.value?.teto_mil ?? 0;
  return v === 0 ? 'Sempre pede OK' : `R$ ${v} mil`;
});

const JANELAS = [
  { id: 'comercial', label: 'Dias úteis, 8h às 19h' },
  { id: 'sempre', label: 'Qualquer horário' },
  { id: 'manha', label: 'Só de manhã (8h às 12h)' },
  { id: 'custom', label: 'Personalizada' },
];

// De onde a IA le. Quem separa e-mail em pastas tem a Caixa de Entrada com o
// que SOBROU, nao com o que importa - por isso o padrao e a caixa inteira.
const ESCOPOS = [
  { id: 'tudo', label: 'A caixa inteira', ajuda: 'inclui o que suas regras ja arquivaram em pastas' },
  { id: 'inbox', label: 'So a Caixa de Entrada', ajuda: 'ignora o que esta em pastas' },
];

const resumoEscopo = computed(() => (form.value?.escopo === 'inbox'
  ? 'Ela lê só o que está na Caixa de Entrada. O que suas regras arquivaram fica de fora.'
  : 'Ela lê a caixa toda, menos Enviados, Rascunhos e Lixeira. É o certo para quem separa e-mail em pastas.'));

const DIAS_SEMANA = [
  { n: 1, label: 'seg' }, { n: 2, label: 'ter' }, { n: 3, label: 'qua' },
  { n: 4, label: 'qui' }, { n: 5, label: 'sex' }, { n: 6, label: 'sáb' }, { n: 0, label: 'dom' },
];

function alternarDia(n) {
  const atual = form.value.janela_dias || [];
  form.value.janela_dias = atual.includes(n) ? atual.filter(d => d !== n) : [...atual, n].sort();
  mexeu();
}

/** A janela em uma frase, para a pessoa conferir sem interpretar campo. */
const resumoJanela = computed(() => {
  const f = form.value;
  if (!f) return '';
  if (f.janela === 'sempre') return 'Ela pode enviar a qualquer hora, qualquer dia.';
  if (f.janela === 'manha') return 'Ela só envia de manhã, em dia útil.';
  if (f.janela === 'comercial') return 'Ela só envia em dia útil, das 8h às 19h.';

  const dias = (f.janela_dias || []).length
    ? DIAS_SEMANA.filter(d => f.janela_dias.includes(d.n)).map(d => d.label).join(', ')
    : 'nenhum dia';
  const viraNoite = f.janela_fim <= f.janela_inicio;
  return `Ela só envia ${dias}, das ${f.janela_inicio}h às ${f.janela_fim}h`
    + (viraNoite ? ' (atravessa a meia-noite).' : '.');
});

// ── Assuntos protegidos ───────────────────────────────────────────────────────
const criandoLimite = ref(false);
const novoLimite = ref('');

function alternarLimite(l) {
  form.value.limites = form.value.limites.map(x => (x.id === l.id ? { ...x, on: !x.on } : x));
  mexeu();
}

function salvarLimite() {
  const txt = novoLimite.value.trim();
  if (!txt) { criandoLimite.value = false; return; }
  form.value.limites = [...form.value.limites, { id: `x${Date.now()}`, label: txt, icon: 'fas fa-bookmark', on: true }];
  novoLimite.value = '';
  criandoLimite.value = false;
  mexeu();
  toast.success(`"${txt}" entrou na lista. Salve para valer a partir do próximo e-mail.`);
}

function teclarLimite(e) {
  if (e.key === 'Enter') { e.preventDefault(); salvarLimite(); }
  if (e.key === 'Escape') { criandoLimite.value = false; novoLimite.value = ''; }
}

// ── Salvar ────────────────────────────────────────────────────────────────────
async function salvar() {
  try {
    await ai.salvarSettings(form.value);
    sujo.value = false;
    // O servidor normaliza (limite novo, matriz completa, valor fora de faixa):
    // a tela passa a mostrar o que ficou gravado, não o que foi digitado.
    hidratar(ai.settings);
    toast.success('Salvo. Vale a partir do próximo e-mail que chegar.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível salvar.');
  }
}

// ── Contexto ──────────────────────────────────────────────────────────────────
async function analisar() {
  try {
    await ai.analisarContexto();
    toast.success('Proposta pronta. Compare com o texto atual antes de aceitar.');
  } catch (err) {
    toast.error(err?.message || 'Não consegui analisar agora.');
  }
}

async function aceitarProposta() {
  try {
    await ai.aceitarContexto();
    sujo.value = false;
    // O texto na tela TEM que virar o novo: aceitar a proposta e continuar
    // vendo o contexto antigo faria a pessoa achar que o botão não funcionou.
    hidratar(ai.settings);
    toast.success('Contexto atualizado.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível aplicar.');
  }
}

// ── Regras ────────────────────────────────────────────────────────────────────
const novaRegra = ref('');
const criandoRegra = ref(false);

async function criarRegra() {
  const txt = novaRegra.value.trim();
  if (!txt) return;
  criandoRegra.value = true;
  try {
    await ai.criarRegra(txt);
    novaRegra.value = '';
    toast.success('Regra criada e ativa a partir de agora.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível criar a regra.');
  } finally {
    criandoRegra.value = false;
  }
}

async function alternarRegra(r) {
  try {
    await ai.alternarRegra(r.id, { ativo: !r.ativo });
    toast.success(`${r.titulo} ${r.ativo ? 'desligada' : 'ligada'}.`);
  } catch (err) {
    toast.error(err?.message || 'Não foi possível alterar a regra.');
  }
}

async function trocarModo(r) {
  const virandoAutomatico = r.modo !== 'automatico';
  if (virandoAutomatico) {
    const ok = await pedirConfirmacao({
      title: 'Deixar esta regra agir sozinha?',
      consequence: `"${r.titulo}" passa a executar sem passar pela fila de aprovação. `
        + 'O que ela fizer aparece no histórico abaixo, e só o que mexeu de pasta pode ser desfeito.',
      confirmLabel: 'Deixar automática',
    });
    if (!ok) return;
  }
  try {
    await ai.alternarRegra(r.id, { modo: virandoAutomatico ? 'automatico' : 'aprovacao' });
  } catch (err) {
    toast.error(err?.message || 'Não foi possível alterar o modo.');
  }
}

async function excluirRegra(r) {
  const ok = await pedirConfirmacao({
    title: 'Excluir esta regra?',
    consequence: `"${r.titulo}" some da lista e deixa de rodar. O histórico do que ela já fez continua.`,
    confirmLabel: 'Excluir',
  });
  if (!ok) return;
  try { await ai.excluirRegra(r.id); toast.success('Regra excluída.'); }
  catch (err) { toast.error(err?.message || 'Não foi possível excluir.'); }
}

async function desfazer(a) {
  try {
    await ai.desfazer(a.id);
    toast.success('Ação desfeita: o e-mail voltou para a Caixa de Entrada.');
  } catch (err) {
    toast.error(err?.message || 'Não foi possível desfazer.');
  }
}

function horaDe(iso) {
  return iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
}
function diaDe(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return 'hoje';
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return 'ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
</script>

<template>
  <div v-if="!podeAutomatizar" class="py-12">
    <EmptyState icon="fas fa-lock" size="lg"
      title="Você não tem esta ação nesta tela"
      description="Configurar o que a IA faz sozinha na caixa depende de uma alçada própria. Quem administra as alçadas pode liberar." />
  </div>

  <div v-else-if="!form" class="space-y-3">
    <Skeleton class="h-8 w-56 rounded" />
    <Skeleton class="h-96 rounded-2xl" />
  </div>

  <div v-else class="space-y-4">

    <!-- Cabeçalho + interruptor geral -->
    <div class="flex items-start justify-between gap-3 flex-wrap">
      <div class="max-w-[70ch]">
        <h2 class="text-xl font-bold text-ink leading-tight">Automações</h2>
        <p class="text-sm text-ink-muted mt-0.5">
          O que a IA faz sozinha na sua caixa, e até onde. Tudo o que ela faz fica registrado aqui embaixo.
        </p>
      </div>
      <Switch v-model="form.ativo" size="sm"
        :label="form.ativo ? 'IA ligada nesta caixa' : 'IA desligada nesta caixa'"
        @change="mexeu" />
    </div>

    <!-- A automação pode estar desligada na EMPRESA, e nesse caso a config da
         pessoa não muda nada. Dizer isso é obrigatório: sem esta faixa, ela
         configuraria o nível 4 e ficaria esperando um e-mail que nunca sai. -->
    <div v-if="!ai.automacaoLigadaNaEmpresa"
      class="flex items-start gap-3 p-3 rounded-xl border border-data-warn/30 bg-data-warn-soft animate-slide-down">
      <i class="fas fa-circle-info text-data-warn mt-0.5 shrink-0"></i>
      <p class="text-xs text-ink-muted leading-relaxed">
        <span class="font-semibold text-data-warn">A execução automática está desligada para a empresa inteira.</span>
        A IA continua lendo e classificando, e continua escrevendo rascunhos para a sua fila - mas nada é enviado
        nem muda de pasta sozinho, independente do nível que você escolher aqui. Quem administra a integração
        Microsoft liga isso.
      </p>
    </div>

    <!-- ── Interruptores da empresa (só admin) ──────────────────────────── -->
    <!-- Fica aqui, e não numa tela de configuração à parte, porque é aqui que a
         consequência aparece: é a mesma tela onde a pessoa lê o que a IA faz. -->
    <section v-if="ehAdmin && ai.configEmpresa"
      class="rounded-2xl border border-line-strong bg-surface-sunken p-4">
      <div class="flex items-center gap-2 mb-3">
        <i class="fas fa-building-shield text-ink-muted"></i>
        <h3 class="text-sm font-semibold text-ink flex-1">Vale para a empresa inteira</h3>
        <span class="text-micro font-semibold uppercase tracking-wide text-ink-subtle px-2 py-0.5
                     rounded-md bg-surface-raised border border-line">admin</span>
      </div>

      <div class="grid gap-3 md:grid-cols-3">
        <div class="p-3 rounded-xl border border-line bg-surface-raised">
          <Switch :model-value="ai.configEmpresa.outlook_ai_enabled" size="sm" label="IA do e-mail"
            @change="ai.salvarConfigEmpresa({ outlook_ai_enabled: $event })" />
          <p class="text-micro text-ink-subtle mt-1.5 leading-relaxed">
            Desligada, a aba Triagem some para todo mundo e a Caixa continua funcionando igual.
          </p>
        </div>

        <div class="p-3 rounded-xl border bg-surface-raised"
          :class="ai.configEmpresa.outlook_ai_auto_enabled ? 'border-data-warn/40' : 'border-line'">
          <Switch :model-value="ai.configEmpresa.outlook_ai_auto_enabled" size="sm" label="Execução automática"
            @change="ligarAutomacaoDaEmpresa($event)" />
          <p class="text-micro mt-1.5 leading-relaxed"
            :class="ai.configEmpresa.outlook_ai_auto_enabled ? 'text-data-warn' : 'text-ink-subtle'">
            {{ ai.configEmpresa.outlook_ai_auto_enabled
              ? 'A IA está arquivando e respondendo sozinha, dentro do nível de cada pessoa.'
              : 'Desligada, ela só lê e escreve. Nada sai da caixa sem alguém aprovar.' }}
          </p>
        </div>

        <div class="p-3 rounded-xl border border-line bg-surface-raised">
          <p class="text-micro font-semibold text-ink-muted uppercase tracking-wide">Teto da triagem</p>
          <div class="flex items-center gap-2 mt-1.5">
            <input type="number" min="5" max="60" :value="ai.configEmpresa.outlook_ai_triage_size"
              @change="salvarTetoTriagem($event.target.value)"
              class="w-20 px-2 py-1.5 rounded-lg border border-line bg-surface-sunken text-ink text-sm
                     tabular-nums outline-none focus:border-accent/50" />
            <span class="text-micro text-ink-subtle">mensagens por passada</span>
          </div>
          <p class="text-micro text-ink-subtle mt-1.5 leading-relaxed">
            É o teto de custo de IA por caixa: quanto maior, mais e-mails ela lê de uma vez.
          </p>
        </div>
      </div>
    </section>

    <!-- ── Contexto e permissão ─────────────────────────────────────────── -->
    <div class="grid gap-4 lg:grid-cols-2 rounded-2xl border border-line bg-surface-raised p-4">

      <!-- Coluna 1: como ela escreve -->
      <div class="space-y-4 min-w-0">
        <div>
          <p class="flex items-center gap-2 text-micro font-semibold uppercase tracking-wide text-accent">
            <i class="fas fa-brain"></i> Contexto
          </p>
          <p class="text-xs text-ink-muted mt-1 mb-2 leading-relaxed">
            O que a IA sabe sobre o seu jeito de trabalhar. Ela lê isto antes de escrever qualquer coisa no seu nome.
          </p>

          <textarea v-model="form.contexto" rows="7" @input="mexeu"
            class="w-full px-3 py-2.5 rounded-lg border border-line bg-surface-sunken text-ink text-xs
                   leading-relaxed outline-none resize-y transition-colors duration-120
                   focus:border-accent/50 focus:ring-2 focus:ring-accent-ring"></textarea>

          <div class="flex items-center gap-2 flex-wrap mt-2">
            <Button size="sm" variant="outline"
              :icon="ai.analisando ? 'fas fa-circle-notch fa-spin' : 'fas fa-wand-magic-sparkles'"
              :loading="ai.analisando" @click="analisar">
              {{ ai.settings?.sugestao_contexto ? 'Analisar de novo' : 'Analisar meu contexto' }}
            </Button>
            <span class="text-micro text-ink-subtle">
              {{ ai.settings?.ultima_analise_base
                  ? `analisado com ${ai.settings.ultima_analise_base}`
                  : 'ela lê os seus e-mails enviados para descrever como você escreve' }}
            </span>
          </div>

          <!-- Análise em andamento: passos reais, não barra falsa -->
          <div v-if="ai.analisando"
            class="mt-2.5 p-3 rounded-xl border border-line bg-surface-sunken animate-slide-down">
            <p class="flex items-center gap-2 text-xs text-ink-muted">
              <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
              Lendo os seus e-mails enviados e comparando com o contexto atual...
            </p>
            <div class="h-1 rounded-full bg-surface overflow-hidden mt-2.5">
              <div class="h-full w-1/3 rounded-full bg-accent animate-pulse"></div>
            </div>
          </div>

          <!-- Proposta lado a lado com o atual -->
          <div v-else-if="ai.settings?.sugestao_contexto"
            class="mt-2.5 p-3 rounded-xl border border-accent/30 bg-accent-soft animate-slide-up">
            <p class="flex items-center gap-2 text-micro font-semibold uppercase tracking-wide text-accent mb-1.5">
              <i class="fas fa-wand-magic-sparkles"></i> Contexto proposto
            </p>
            <p v-if="ai.settings.sugestao_base" class="text-micro text-ink-muted mb-2">
              {{ ai.settings.sugestao_base }}
            </p>
            <div class="p-2.5 rounded-lg border border-line bg-surface text-xs leading-relaxed text-ink
                        whitespace-pre-wrap max-h-48 overflow-y-auto">{{ ai.settings.sugestao_contexto }}</div>
            <div class="flex gap-2 mt-2.5">
              <Button size="sm" variant="primary" @click="aceitarProposta">Usar este contexto</Button>
              <Button size="sm" variant="ghost" @click="ai.descartarContexto()">Manter o atual</Button>
            </div>
          </div>
        </div>

        <!-- Assinatura e aberturas: vao LITERAIS, o modelo nao reescreve -->
        <div>
          <p class="text-micro font-semibold text-ink-muted mb-1">Como você abre, fecha e assina</p>
          <p class="text-micro text-ink-subtle mb-2 leading-relaxed">
            Isto vai <span class="text-ink">exatamente como você escrever</span>. O modelo não reformula:
            assinatura parafraseada não é assinatura.
          </p>

          <div class="grid grid-cols-2 gap-2">
            <input v-model="form.saudacao" @input="mexeu" placeholder="Abertura: ex. Bom dia,"
              class="px-2.5 py-2 rounded-lg border border-line bg-surface-sunken text-ink text-micro
                     outline-none focus:border-accent/50" />
            <input v-model="form.despedida" @input="mexeu" placeholder="Fecho: ex. Abraço,"
              class="px-2.5 py-2 rounded-lg border border-line bg-surface-sunken text-ink text-micro
                     outline-none focus:border-accent/50" />
          </div>

          <textarea v-model="form.assinatura" rows="4" @input="mexeu"
            placeholder="Sua assinatura, do jeito que ela sai hoje. Nome, cargo, empresa, telefone..."
            class="w-full mt-2 px-3 py-2.5 rounded-lg border bg-surface-sunken text-ink text-micro
                   leading-relaxed outline-none resize-y transition-colors duration-120
                   focus:border-accent/50 focus:ring-2 focus:ring-accent-ring"
            :class="form.assinatura ? 'border-line' : 'border-data-warn/40'"></textarea>
          <p v-if="!form.assinatura" class="text-micro text-data-warn mt-1">
            <i class="fas fa-circle-info mr-1"></i>
            Sem assinatura, ela fecha o e-mail sem assinar - em vez de inventar uma.
          </p>
        </div>

        <!-- Escopo: de onde ela le -->
        <div>
          <p class="text-micro font-semibold text-ink-muted mb-1.5">De onde ela lê</p>
          <div class="flex gap-1.5">
            <button v-for="e in ESCOPOS" :key="e.id" type="button" @click="form.escopo = e.id; mexeu()"
              :title="e.ajuda"
              class="flex-1 px-3 py-2 min-h-10 rounded-lg text-micro font-medium border text-left
                     transition-all duration-120 ease-out-expo"
              :class="form.escopo === e.id
                ? 'bg-accent-soft border-accent/40 text-accent'
                : 'border-line text-ink-muted hover:text-ink hover:border-line-strong'">
              {{ e.label }}
            </button>
          </div>
          <p class="text-micro text-ink-subtle mt-1.5 leading-relaxed">{{ resumoEscopo }}</p>
        </div>

        <!-- Tom -->
        <div>
          <p class="text-micro font-semibold text-ink-muted mb-1.5">Tom padrão</p>
          <div class="flex gap-1.5 flex-wrap">
            <button v-for="t in ['Direto', 'Cordial', 'Formal', 'Técnico']" :key="t" type="button"
              @click="form.tom = t; mexeu()"
              class="px-3 py-1.5 min-h-9 rounded-lg text-xs font-medium border transition-all duration-120 ease-out-expo"
              :class="form.tom === t
                ? 'bg-accent-soft border-accent/40 text-accent'
                : 'border-line text-ink-muted hover:text-ink hover:border-line-strong'">{{ t }}</button>
          </div>
        </div>

        <!-- Temperatura -->
        <div>
          <div class="flex items-baseline justify-between gap-2">
            <span class="text-micro font-semibold text-ink-muted">Liberdade de escrita</span>
            <span class="text-micro font-semibold text-accent tabular-nums">{{ rotuloTemperatura }}</span>
          </div>
          <input type="range" min="0" max="100" step="5" v-model.number="form.temperatura" @change="mexeu"
            class="w-full mt-2 accent-accent" />
          <div class="flex justify-between text-micro text-ink-subtle">
            <span>Repete o que você já escreveu</span><span>Livre</span>
          </div>
        </div>

        <!-- Nível -->
        <div>
          <div class="flex items-baseline justify-between gap-2 mb-2">
            <span class="text-micro font-semibold text-ink-muted">Nível de permissão</span>
            <span class="text-micro font-semibold text-accent">Nível {{ form.nivel }}</span>
          </div>
          <div class="flex flex-col gap-1.5">
            <button v-for="n in NIVEIS" :key="n.n" type="button" @click="form.nivel = n.n; mexeu()"
              class="flex items-start gap-2.5 p-2.5 rounded-xl border text-left
                     transition-all duration-200 ease-out-expo"
              :class="form.nivel === n.n
                ? 'border-accent/40 bg-accent-soft'
                : 'border-line bg-surface-sunken hover:border-line-strong hover:translate-x-0.5'">
              <span class="w-3 h-3 rounded-full shrink-0 mt-0.5 border-2 transition-colors duration-120"
                :class="form.nivel === n.n ? 'border-accent bg-accent' : 'border-line-strong bg-transparent'"></span>
              <span class="flex-1 min-w-0">
                <span class="block text-xs font-semibold"
                  :class="form.nivel === n.n ? 'text-accent' : 'text-ink'">{{ n.titulo }}</span>
                <span class="block text-micro text-ink-muted mt-0.5 leading-relaxed">{{ n.descricao }}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- Coluna 2: o que ela faz por importância -->
      <div class="space-y-4 min-w-0">
        <div>
          <p class="flex items-center gap-2 text-micro font-semibold uppercase tracking-wide text-accent">
            <i class="fas fa-sliders"></i> O que ela faz, por importância
          </p>
          <p class="text-xs text-ink-muted mt-1 mb-2 leading-relaxed">
            Uma linha por importância. Se o seu nível for mais baixo do que a escolha, a linha mostra o que
            acontece de verdade.
          </p>

          <div class="rounded-xl border border-line overflow-hidden">
            <div v-for="l in LINHAS" :key="l.id"
              class="p-2.5 border-b border-line-subtle last:border-0 transition-colors duration-120
                     hover:bg-surface-sunken">
              <div class="flex items-center gap-2 mb-1.5">
                <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="l.ponto"></span>
                <span class="text-xs font-semibold text-ink">{{ l.nome }}</span>
                <span class="text-micro text-ink-subtle truncate">{{ l.ajuda }}</span>
              </div>
              <div class="flex gap-1 flex-wrap">
                <button v-for="c in COMPORTAMENTOS" :key="c.id" type="button"
                  @click="escolherComportamento(l.id, c.id)"
                  class="px-2 py-1 min-h-8 rounded-lg text-micro font-medium border
                         transition-all duration-120 ease-out-expo"
                  :class="form.matriz[l.id] === c.id
                    ? 'bg-accent-soft border-accent/40 text-accent'
                    : 'border-line text-ink-subtle hover:text-ink hover:border-line-strong'">{{ c.label }}</button>
              </div>
              <!-- O rebaixamento explicado na própria linha -->
              <p v-if="rebaixada(l.id)"
                class="flex items-center gap-1.5 text-micro text-data-warn mt-1.5 animate-fade-in">
                <i class="fas fa-arrow-turn-down rotate-90"></i>
                Com o nível {{ form.nivel }}, aqui ela {{ frase(efetivo(l.id)) }}.
              </p>
            </div>
          </div>

          <p class="text-xs text-ink-muted mt-2 leading-relaxed">{{ resumoMatriz }}</p>
        </div>

        <!-- Assuntos protegidos -->
        <div>
          <p class="text-micro font-semibold text-ink-muted mb-1.5">Nunca responder sozinha sobre</p>
          <div class="flex gap-1.5 flex-wrap">
            <button v-for="l in form.limites" :key="l.id" type="button" @click="alternarLimite(l)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-9 rounded-full text-micro font-medium border
                     transition-all duration-120 ease-out-expo"
              :class="l.on
                ? 'bg-accent-soft border-accent/40 text-accent'
                : 'border-line text-ink-subtle hover:text-ink hover:border-line-strong'">
              <i :class="l.icon || 'fas fa-bookmark'" class="text-micro"></i>{{ l.label }}
            </button>

            <button v-if="!criandoLimite" type="button" @click="criandoLimite = true"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-9 rounded-full text-micro font-medium
                     border border-dashed border-line text-ink-subtle
                     hover:text-accent hover:border-accent/50 transition-all duration-120">
              <i class="fas fa-plus text-micro"></i> Adicionar
            </button>

            <span v-else class="inline-flex items-center gap-1 pl-3 pr-1 py-1 rounded-full border border-accent/40
                                bg-accent-soft animate-scale-in">
              <input v-model="novoLimite" placeholder="ex.: seguro e sinistro" autofocus
                @keydown="teclarLimite"
                class="w-36 bg-transparent border-0 outline-none text-micro text-ink placeholder:text-ink-subtle" />
              <button type="button" class="w-6 h-6 rounded-full grid place-items-center bg-accent text-white"
                title="Adicionar" @click="salvarLimite"><i class="fas fa-check text-micro"></i></button>
              <button type="button" class="w-6 h-6 rounded-full grid place-items-center text-ink-subtle"
                title="Cancelar" @click="criandoLimite = false; novoLimite = ''"><i class="fas fa-xmark text-micro"></i></button>
            </span>
          </div>
        </div>

        <!-- Teto e janela -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div class="p-3 rounded-xl border border-line bg-surface-sunken">
            <p class="text-micro font-semibold text-ink-muted uppercase tracking-wide">Teto de valor</p>
            <p class="text-micro text-ink-subtle mt-0.5 mb-2 leading-relaxed">
              E-mail que cita valor acima disto sempre pede aprovação.
            </p>
            <input type="range" min="0" max="500" step="1" v-model.number="form.teto_mil" @change="mexeu"
              class="w-full accent-accent" />
            <!-- O passo de 25 mil nao deixava dizer "acima de 12 mil". Agora vai
                 de 1 em 1 mil, e o campo aceita qualquer valor digitado. -->
            <div class="flex items-center gap-2 mt-1">
              <span class="text-micro text-ink-subtle">R$</span>
              <input type="number" min="0" step="1" v-model.number="form.teto_mil" @change="mexeu"
                class="w-20 px-2 py-1 rounded-lg border border-line bg-surface text-ink text-sm
                       tabular-nums outline-none focus:border-accent/50" />
              <span class="text-micro text-ink-subtle">mil</span>
              <span class="text-micro font-semibold text-accent ml-auto">{{ rotuloTeto }}</span>
            </div>
          </div>

          <div class="p-3 rounded-xl border border-line bg-surface-sunken">
            <p class="text-micro font-semibold text-ink-muted uppercase tracking-wide">Janela de envio</p>
            <p class="text-micro text-ink-subtle mt-0.5 mb-2 leading-relaxed">
              Fora dela, ela segura o envio até abrir.
            </p>
            <div class="flex flex-col gap-1">
              <button v-for="j in JANELAS" :key="j.id" type="button" @click="form.janela = j.id; mexeu()"
                class="px-2.5 py-1.5 min-h-9 rounded-lg text-micro text-left border transition-all duration-120"
                :class="form.janela === j.id
                  ? 'bg-accent-soft border-accent/40 text-accent font-medium'
                  : 'border-line text-ink-muted hover:text-ink'">{{ j.label }}</button>
            </div>

            <!-- Personalizada: horas e dias de verdade, para quem nao trabalha
                 em horario comercial. -->
            <Transition
              enter-active-class="transition duration-200 ease-out-expo"
              enter-from-class="opacity-0 -translate-y-1"
              leave-active-class="transition duration-120" leave-to-class="opacity-0">
              <div v-if="form.janela === 'custom'" class="mt-2 pt-2 border-t border-line">
                <div class="flex items-center gap-2">
                  <input type="number" min="0" max="23" v-model.number="form.janela_inicio" @change="mexeu"
                    class="w-14 px-2 py-1 rounded-lg border border-line bg-surface text-ink text-micro
                           tabular-nums outline-none focus:border-accent/50" />
                  <span class="text-micro text-ink-subtle">h ate</span>
                  <input type="number" min="1" max="24" v-model.number="form.janela_fim" @change="mexeu"
                    class="w-14 px-2 py-1 rounded-lg border border-line bg-surface text-ink text-micro
                           tabular-nums outline-none focus:border-accent/50" />
                  <span class="text-micro text-ink-subtle">h</span>
                </div>
                <div class="flex gap-1 flex-wrap mt-2">
                  <button v-for="d in DIAS_SEMANA" :key="d.n" type="button" @click="alternarDia(d.n)"
                    class="w-9 h-8 rounded-lg text-micro font-medium border transition-all duration-120"
                    :class="(form.janela_dias || []).includes(d.n)
                      ? 'bg-accent-soft border-accent/40 text-accent'
                      : 'border-line text-ink-subtle hover:text-ink'">{{ d.label }}</button>
                </div>
              </div>
            </Transition>

            <p class="text-micro text-ink-subtle mt-2 leading-relaxed">{{ resumoJanela }}</p>
          </div>
        </div>

        <!-- Salvar: a barra só aparece quando há o que salvar -->
        <Transition
          enter-active-class="transition duration-200 ease-out-expo"
          enter-from-class="opacity-0 translate-y-1"
          leave-active-class="transition duration-120"
          leave-to-class="opacity-0">
          <div v-if="sujo" class="flex items-center gap-3 pt-1">
            <Button variant="primary" size="sm" icon="fas fa-check" :loading="ai.salvando" @click="salvar">
              Salvar contexto e permissões
            </Button>
            <span class="text-micro text-ink-subtle">vale a partir do próximo e-mail que chegar</span>
          </div>
        </Transition>
      </div>
    </div>

    <!-- ── Criar regra em texto ─────────────────────────────────────────── -->
    <div class="flex items-center gap-2.5 p-3 rounded-2xl border border-accent/25
                bg-gradient-to-r from-accent-soft to-surface-raised">
      <i class="fas fa-wand-magic-sparkles text-accent shrink-0"></i>
      <Input v-model="novaRegra" size="sm" class="flex-1"
        placeholder="Descreva uma regra: “arquive newsletters e me avise só se citarem a Menin”"
        @keyup.enter="criarRegra" />
      <Button size="sm" variant="primary" :loading="criandoRegra"
        :disabled="!novaRegra.trim()" @click="criarRegra">Criar regra</Button>
    </div>

    <!-- ── Regras ───────────────────────────────────────────────────────── -->
    <div class="grid gap-2.5 md:grid-cols-2">
      <article v-for="(r, i) in ai.regras" :key="r.id"
        class="rounded-2xl border p-4 animate-slide-up transition-all duration-200 ease-out-expo"
        :class="r.ativo
          ? 'border-accent/25 bg-gradient-to-br from-accent-soft/60 to-surface-raised hover:shadow-soft'
          : 'border-line bg-surface-raised opacity-60 hover:opacity-90'"
        :style="{ animationDelay: `${i * 45}ms` }">

        <div class="flex items-start gap-3">
          <i class="text-base mt-0.5 shrink-0 transition-colors duration-200"
            :class="[r.icone, r.ativo ? 'text-accent' : 'text-ink-subtle']"></i>

          <div class="flex-1 min-w-0">
            <h4 class="text-sm font-semibold text-ink">{{ r.titulo }}</h4>
            <p class="text-xs text-ink-muted mt-1 leading-relaxed">{{ r.descricao }}</p>

            <div class="flex items-center gap-3 flex-wrap mt-2 text-micro text-ink-subtle">
              <span><i class="fas fa-bolt mr-1"></i>{{ r.execucoesHoje }} hoje · {{ r.execucoes }} no total</span>
              <span v-if="r.ultimaExecucaoEm">
                <i class="fas fa-clock-rotate-left mr-1"></i>{{ diaDe(r.ultimaExecucaoEm) }}, {{ horaDe(r.ultimaExecucaoEm) }}
              </span>
              <button type="button" @click="trocarModo(r)"
                class="px-2 py-0.5 rounded-md font-semibold border transition-all duration-120"
                :class="r.modo === 'automatico'
                  ? 'border-accent/40 bg-accent-soft text-accent'
                  : 'border-line text-ink-muted hover:text-ink'">
                {{ r.modo === 'automatico' ? 'age sozinha' : 'pede seu OK' }}
              </button>
              <button v-if="r.origem === 'texto'" type="button"
                class="text-ink-subtle hover:text-data-neg transition-colors" title="Excluir regra"
                @click="excluirRegra(r)"><i class="fas fa-trash"></i></button>
            </div>
          </div>

          <Switch :model-value="r.ativo" size="sm" @change="alternarRegra(r)" />
        </div>
      </article>
    </div>

    <!-- ── Histórico ────────────────────────────────────────────────────── -->
    <section class="rounded-2xl border border-line bg-surface-raised p-4">
      <div class="flex items-center justify-between gap-2 mb-2">
        <h3 class="text-sm font-semibold text-ink">Histórico da automação</h3>
        <button type="button" class="text-micro text-accent hover:underline" @click="ai.carregarHistorico()">
          atualizar
        </button>
      </div>

      <EmptyState v-if="!ai.historico.length" icon="fas fa-clock-rotate-left" size="sm"
        title="Ela ainda não fez nada"
        description="Cada coisa que a IA fizer na sua caixa aparece aqui, com a hora e o que dá para desfazer." />

      <div v-else class="flex flex-col">
        <!-- A linha inteira abre o e-mail. Antes era texto morto: a pessoa lia
             "arquivado em Leitura" e não tinha como ver QUAL e-mail era. -->
        <div v-for="(h, i) in ai.historico" :key="h.id"
          class="group flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-lg border-b border-line-subtle
                 last:border-0 animate-slide-up transition-all duration-120 ease-out-expo"
          :class="h.messageId ? 'hover:bg-surface-sunken cursor-pointer' : ''"
          :style="{ animationDelay: `${Math.min(i, 8) * 35}ms` }"
          @click="h.messageId && abrirEmail(h.messageId)">
          <span class="w-10 shrink-0 text-micro font-mono tabular-nums text-ink-subtle">{{ horaDe(h.quando) }}</span>
          <i class="text-xs w-4 text-center shrink-0"
            :class="h.estado === 'bloqueado' ? 'fas fa-triangle-exclamation text-data-warn'
                  : h.estado === 'desfeito' ? 'fas fa-rotate-left text-ink-subtle'
                  : h.tipo === 'rascunho' ? 'fas fa-hourglass-half text-ink-subtle'
                  : 'fas fa-check text-accent'"></i>
          <div class="flex-1 min-w-0">
            <p class="text-xs text-ink truncate group-hover:text-accent transition-colors duration-120">
              {{ h.titulo }}
            </p>
            <p class="text-micro truncate"
              :class="h.estado === 'bloqueado' ? 'text-data-warn' : 'text-ink-subtle'">{{ h.texto }}</p>
          </div>
          <span class="text-micro text-ink-subtle shrink-0 hidden sm:inline">{{ h.tag }}</span>
          <i v-if="h.messageId"
            class="fas fa-arrow-right text-micro text-accent shrink-0 opacity-0 -translate-x-1
                   group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200"></i>
          <button v-if="h.reversivel && h.estado === 'feito'" type="button"
            class="text-micro text-accent hover:underline shrink-0"
            @click.stop="desfazer(h)">desfazer</button>
          <span v-else-if="h.estado === 'desfeito'" class="text-micro text-ink-subtle shrink-0">desfeito</span>
        </div>
      </div>
    </section>
  </div>
</template>
