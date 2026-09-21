<script setup>
/**
 * PROCESSOS DA EME - o mapa de como a empresa trabalha.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A TELA RESPONDE TRÊS PERGUNTAS, NESTA ORDEM
 *
 *   1. O que a Eme já entendeu do nosso processo?   (o mapa)
 *   2. O que ela quer acrescentar?                  (a fila)
 *   3. Até onde ela pode ir sozinha?                (a autonomia)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * O QUE A FILA NÃO FAZ, E POR QUÊ
 *
 * A fila NÃO mostra tudo o que o motor produziu. Mostra o que passou pelo
 * portão (evidência e confiança mínimas, sem repetir regra existente) e
 * respeita um teto por dia. Isso é a funcionalidade, não uma limitação: uma
 * fila de trinta itens por dia vira um badge vermelho que se aprende a
 * ignorar, e motor de aprendizado cuja fila ninguém lê não aprende, só acumula.
 *
 * O que não coube aparece como "adiadas" e volta amanhã com mais evidência.
 * O que ainda não tem evidência aparece como "em observação". Nada se perde.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONFLITO VEM PRIMEIRO, SEMPRE
 *
 * É o único item cuja demora deixa o mapa se contradizendo. Ele não pergunta
 * "quer adicionar esta regra?" e sim "o processo mudou?" - misturar os dois é
 * como se aprova uma contradição sem perceber que contradiz.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PERMISSÃO
 *
 * Tela delegável. As ações saem do servidor via useCan, então a UI e a API não
 * divergem. NUNCA ler role do usuário aqui.
 */
import { ref, reactive, computed, onMounted } from 'vue';
import { useCan } from '@/composables/useCan';
import {
    carregar, trocarAutonomia, decidir, salvarSettings, observacoesDe,
} from '@/utils/Processos/apiProcessos';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Modal from '@/components/UI/Modal.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const can = useCan('/tools/eme-processos');

const carregando = ref(true);
const salvando = ref(false);
const erro = ref('');
const aviso = ref('');
const dados = ref(null);

const aba = ref('mapa');
const abas = computed(() => [
    { value: 'mapa', label: 'Mapa' },
    { value: 'fila', label: `Fila${pendentes.value.length ? ` (${pendentes.value.length})` : ''}` },
    ...(can('configurar') ? [{ value: 'config', label: 'Ajustes' }] : []),
]);

const processos = computed(() => dados.value?.processos || []);
const pendentes = computed(() => dados.value?.fila?.mostrar || []);
const adiadas = computed(() => dados.value?.fila?.adiadas || []);
const paradas = computed(() => dados.value?.fila?.paradas || []);
const promocoes = computed(() => dados.value?.promocoes || []);

// ── Vocabulário ──────────────────────────────────────────────────────────────

const NIVEIS = ['observar', 'propor', 'agir', 'decidir'];

const ROTULO_NIVEL = {
    observar: 'Observar', propor: 'Propor', agir: 'Agir', decidir: 'Decidir',
};

const EXPLICA_NIVEL = {
    observar: 'Registra o que acontece e monta o mapa. Não sugere nada e não aparece para ninguém.',
    propor: 'Sugere a ação na fila, com a evidência. Nada acontece sem alguém clicar.',
    agir: 'Executa sozinha as ações deste processo, dentro do escopo, e registra cada uma.',
    decidir: 'Escolhe entre os caminhos previstos no processo, em vez de executar um caminho único.',
};

const TOM_NIVEL = {
    observar: 'neutral', propor: 'info', agir: 'warning', decidir: 'danger',
};

const ROTULO_ALCANCE = {
    empresa: 'Toda a empresa',
    cidade: 'Só nas cidades da evidência',
    empreendimento: 'Só nos empreendimentos da evidência',
};

const opcoesNivel = computed(() =>
    NIVEIS.map(n => ({ value: n, label: ROTULO_NIVEL[n] })));

function quando(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
}

// ── Autonomia ────────────────────────────────────────────────────────────────

const modalAutonomia = ref(false);
const alvo = ref(null);
const formAut = reactive({ autonomia: 'observar', autonomia_teto: 'propor', nota: '' });

function abrirAutonomia(p) {
    alvo.value = p;
    Object.assign(formAut, {
        autonomia: p.autonomia,
        autonomia_teto: p.autonomia_teto,
        nota: p.autonomia_nota || '',
    });
    erro.value = '';
    modalAutonomia.value = true;
}

async function gravarAutonomia() {
    salvando.value = true;
    erro.value = '';
    try {
        await trocarAutonomia(alvo.value.key, { ...formAut });
        modalAutonomia.value = false;
        aviso.value = `"${alvo.value.nome}" agora está em "${ROTULO_NIVEL[formAut.autonomia]}".`;
        await recarregar();
    } catch (e) {
        // O servidor explica o motivo ("o teto deste processo é Propor").
        erro.value = e.message;
    } finally {
        salvando.value = false;
    }
}

// ── Fila ─────────────────────────────────────────────────────────────────────

const decidindo = ref(null);

async function responder(proposta, decisao) {
    decidindo.value = proposta.id;
    erro.value = '';
    aviso.value = '';
    try {
        await decidir(proposta.id, decisao);
        aviso.value = decisao === 'aprovar'
            ? 'Regra incorporada ao processo. A Eme passa a segui-la.'
            : 'Proposta recusada. O motor não insiste nela.';
        await recarregar();
    } catch (e) {
        erro.value = e.message;
    } finally {
        decidindo.value = null;
    }
}

// ── Evidência ────────────────────────────────────────────────────────────────

const modalEvidencia = ref(false);
const evidencia = ref([]);
const evidenciaDe = ref('');

async function verEvidencia(p) {
    evidenciaDe.value = p.processo_key;
    erro.value = '';
    try {
        evidencia.value = await observacoesDe(p.processo_key, 50);
        modalEvidencia.value = true;
    } catch (e) { erro.value = e.message; }
}

// ── Ajustes ──────────────────────────────────────────────────────────────────

const formCfg = reactive({
    min_evidencias: 5, min_confianca: 0.6, max_por_dia: 5,
    min_empreendimentos: 3, min_cidades: 2,
    promo_min_aprovadas: 10, promo_min_dias: 14,
});

function carregarCfg() {
    const s = dados.value?.settings || {};
    for (const k of Object.keys(formCfg)) if (s[k] != null) formCfg[k] = Number(s[k]);
}

async function gravarCfg() {
    salvando.value = true;
    erro.value = '';
    try {
        await salvarSettings({ ...formCfg });
        aviso.value = 'Ajustes salvos. Valem na próxima rodada de mineração.';
        await recarregar();
    } catch (e) { erro.value = e.message; }
    finally { salvando.value = false; }
}

async function recarregar() {
    carregando.value = true;
    try {
        dados.value = await carregar();
        carregarCfg();
    } catch (e) { erro.value = e.message; }
    finally { carregando.value = false; }
}

onMounted(recarregar);
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="lg">

      <PageHeader
        title="Processos da Eme"
        subtitle="O mapa de como a empresa trabalha, o que a Eme aprendeu observando e até onde ela pode ir sozinha."
        icon="fas fa-diagram-project">
        <template #actions>
          <PageHelp
            title="Como isto funciona"
            :steps="[
              { title: 'Ela observa', text: 'Todo processo nasce em Observar: ela registra o que acontece e não fala nada. É assim que o mapa se forma a partir do que a empresa FAZ, e não do que alguém supôs.' },
              { title: 'Ela propõe', text: 'Quando um padrão se repete com evidência suficiente, vira uma proposta na fila, com os casos que a sustentam. Você aprova ou recusa.' },
              { title: 'Ela age', text: 'Depois de um histórico limpo, você sobe o degrau. Aí ela executa sozinha o que a regra aprovada manda - e cada ação fica registrada.' },
              { title: 'Ela recua sozinha', text: 'Ação desfeita rebaixa o processo na hora, sem esperar reunião. Subir é decisão sua; descer é automático.' },
            ]"
            :tips="[
              'O teto de cada processo é o limite que ele nunca ultrapassa, mesmo com histórico impecável. É onde assunto sensível fica preso em Observar ou Propor, por decisão.',
              'Regra tirada de um empreendimento só nasce valendo ali. Para virar regra da empresa, o padrão precisa aparecer em vários lugares - é o que impede um dado de X chegar a quem não enxerga X.',
              'A fila tem teto por dia de propósito: fila que ninguém lê não ensina nada.',
            ]" />
          <Button variant="ghost" icon="fas fa-rotate" :loading="carregando" @click="recarregar">Atualizar</Button>
        </template>
      </PageHeader>

      <div v-if="erro" class="mb-4 rounded-lg border border-data-neg/30 bg-data-neg/10 p-3 text-sm text-data-neg">
        <i class="fas fa-triangle-exclamation mr-1.5"></i>{{ erro }}
      </div>
      <div v-if="aviso" class="mb-4 rounded-lg border border-accent/30 bg-accent-soft/40 p-3 text-sm text-ink">
        <i class="fas fa-circle-info mr-1.5 text-accent"></i>{{ aviso }}
      </div>

      <!-- Sugestão de promoção: existe porque, sem lembrete, o processo fica em
           Propor para sempre pedindo aprovação de coisa que acerta há meses. -->
      <Surface v-if="promocoes.length && can('autonomia')" variant="raised" padding="md" class="mb-4">
        <div class="flex items-start gap-3">
          <div class="h-9 w-9 grid place-items-center rounded-xl bg-data-pos/10 border border-data-pos/30 shrink-0">
            <i class="fas fa-arrow-trend-up text-data-pos"></i>
          </div>
          <div class="min-w-0">
            <h3 class="text-sm font-semibold text-ink">Pronto para subir um degrau</h3>
            <ul class="mt-1.5 space-y-1">
              <li v-for="s in promocoes" :key="s.key" class="text-xs text-ink-muted leading-relaxed">
                <strong class="text-ink">{{ s.nome }}</strong>: {{ s.motivo }}
              </li>
            </ul>
          </div>
        </div>
      </Surface>

      <SegmentedControl v-model="aba" :options="abas" class="mb-4" />

      <div v-if="carregando" class="text-sm text-ink-muted py-10 text-center">
        <i class="fas fa-circle-notch fa-spin mr-1.5"></i>Carregando...
      </div>

      <!-- ── MAPA ──────────────────────────────────────────────────────────── -->
      <div v-else-if="aba === 'mapa'" class="space-y-3">
        <EmptyState v-if="!processos.length" icon="fas fa-diagram-project"
          title="Nenhum processo cadastrado"
          description="Os processos comerciais entram na primeira subida do servidor." />

        <Surface v-for="p in processos" :key="p.key" variant="raised" padding="md"
          :class="p.enabled ? '' : 'opacity-60'">

          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-sm font-semibold text-ink">{{ p.nome }}</h3>
                <Badge :variant="TOM_NIVEL[p.autonomia_efetiva]" size="sm">
                  {{ ROTULO_NIVEL[p.autonomia_efetiva] }}
                </Badge>
                <Badge v-if="p.autonomia_teto !== 'decidir'" variant="neutral" size="sm">
                  teto: {{ ROTULO_NIVEL[p.autonomia_teto] }}
                </Badge>
                <Badge v-if="p.alcance !== 'empresa'" variant="warning" size="sm">
                  {{ ROTULO_ALCANCE[p.alcance] }}
                </Badge>
                <Badge v-if="!p.enabled" variant="neutral" size="sm">desligado</Badge>
              </div>

              <p class="text-xs text-ink-muted mt-1.5 leading-relaxed max-w-3xl">{{ p.descricao }}</p>
              <p class="text-micro text-ink-subtle mt-1">{{ EXPLICA_NIVEL[p.autonomia_efetiva] }}</p>
              <p v-if="p.autonomia_nota" class="text-xs text-data-warn mt-1.5 leading-relaxed max-w-3xl">
                <i class="fas fa-circle-info mr-1"></i>{{ p.autonomia_nota }}
              </p>
            </div>

            <Button v-if="can('autonomia')" size="sm" variant="ghost" icon="fas fa-sliders"
              @click="abrirAutonomia(p)">Autonomia</Button>
          </div>

          <!-- Etapas: o workflow, em ordem -->
          <div v-if="(p.etapas || []).length" class="mt-3 flex flex-wrap items-center gap-1.5">
            <template v-for="(e, i) in p.etapas" :key="e.ordem ?? i">
              <span class="rounded-md border border-line bg-surface-sunken px-2.5 py-1 text-micro text-ink">
                {{ e.nome }}
              </span>
              <i v-if="i < p.etapas.length - 1" class="fas fa-chevron-right text-micro text-ink-subtle"></i>
            </template>
          </div>

          <!-- As regras aprendidas: o conteúdo real do "cérebro" -->
          <div class="mt-3">
            <p class="text-micro uppercase tracking-wider text-ink-subtle mb-1.5">
              Regras aprendidas ({{ p.regras_n }})
            </p>
            <p v-if="!p.regras_n" class="text-xs text-ink-subtle leading-relaxed">
              Nenhuma ainda. Ela está observando - as regras aparecem aqui depois que você aprovar as propostas da fila.
            </p>
            <ul v-else class="space-y-1.5">
              <li v-for="r in p.regras" :key="r.id"
                class="rounded-md border border-line bg-surface-sunken px-3 py-2">
                <p class="text-xs text-ink leading-relaxed">{{ r.texto }}</p>
                <p class="text-micro font-mono text-ink-subtle mt-1">
                  {{ r.evidencia_n }} casos · {{ ROTULO_ALCANCE[r.alcance] || r.alcance }} · aprovada {{ quando(r.aprovada_em) }}
                </p>
              </li>
            </ul>
          </div>
        </Surface>
      </div>

      <!-- ── FILA ──────────────────────────────────────────────────────────── -->
      <div v-else-if="aba === 'fila'" class="space-y-4">

        <EmptyState v-if="!pendentes.length" icon="fas fa-inbox"
          title="Nada esperando você"
          description="Quando um padrão se repetir com evidência suficiente, ele aparece aqui." />

        <Surface v-for="p in pendentes" :key="p.id" variant="raised" padding="md"
          :class="p.classe === 'conflito' ? 'border-data-warn/40' : ''">

          <div class="flex items-start gap-3">
            <div class="h-9 w-9 grid place-items-center rounded-xl border shrink-0"
              :class="p.classe === 'conflito'
                ? 'bg-data-warn/10 border-data-warn/30'
                : 'bg-accent-soft border-accent/20'">
              <i :class="p.classe === 'conflito'
                ? 'fas fa-code-branch text-data-warn'
                : 'fas fa-lightbulb text-accent'"></i>
            </div>

            <div class="min-w-0 flex-1">
              <!-- Conflito NÃO pergunta "quer adicionar?": pergunta "mudou?" -->
              <p class="text-xs font-semibold mb-1"
                :class="p.classe === 'conflito' ? 'text-data-warn' : 'text-ink-muted'">
                {{ p.classe === 'conflito' ? 'O processo mudou?' : 'Nova regra' }}
              </p>

              <p class="text-sm text-ink leading-relaxed">{{ p.texto }}</p>

              <p v-if="p.classe === 'conflito'" class="text-xs text-data-warn mt-1.5 leading-relaxed">
                Isto contradiz uma regra que já está ativa neste processo. Aprovar SUBSTITUI a regra antiga;
                as duas no mapa fariam a Eme seguir a que viesse primeiro.
              </p>

              <p class="text-micro font-mono text-ink-subtle mt-2">
                {{ p.processo_key }} · {{ p.evidencia_n }} casos ·
                confiança {{ Math.round(Number(p.confianca) * 100) }}% ·
                {{ ROTULO_ALCANCE[p.alcance] || p.alcance }}
              </p>
              <p v-if="p.alcance_motivo" class="text-xs text-ink-muted mt-1 leading-relaxed">{{ p.alcance_motivo }}</p>

              <div class="flex items-center gap-2 mt-3">
                <Button v-if="can('aprovar')" size="sm" icon="fas fa-check"
                  :loading="decidindo === p.id" @click="responder(p, 'aprovar')">
                  {{ p.classe === 'conflito' ? 'Sim, mudou' : 'Aprovar' }}
                </Button>
                <Button v-if="can('aprovar')" size="sm" variant="ghost" icon="fas fa-xmark"
                  :loading="decidindo === p.id" @click="responder(p, 'recusar')">Recusar</Button>
                <Button v-if="can('aprovar')" size="sm" variant="ghost" icon="fas fa-list-check"
                  @click="verEvidencia(p)">Ver os casos</Button>
              </div>
            </div>
          </div>
        </Surface>

        <!-- O que não coube hoje e o que ainda não tem evidência. Aparecem
             para deixar claro que nada se perde - sem isto, a tela pareceria
             estar escondendo trabalho do motor. -->
        <Surface v-if="adiadas.length || paradas.length" variant="sunken" padding="md">
          <h3 class="text-sm font-semibold text-ink mb-1">Nada se perde</h3>
          <p v-if="adiadas.length" class="text-xs text-ink-muted leading-relaxed">
            <strong>{{ adiadas.length }}</strong> proposta(s) passaram no portão mas não couberam no teto de hoje
            ({{ dados?.fila?.max_por_dia }}/dia). Voltam amanhã, com mais um caso de evidência.
          </p>
          <p v-if="paradas.length" class="text-xs text-ink-muted leading-relaxed mt-1">
            <strong>{{ paradas.length }}</strong> padrão(ões) em observação: o motor já viu, mas ainda não tem
            evidência ou confiança para propor. Ficam acumulando em vez de sumir.
          </p>
        </Surface>
      </div>

      <!-- ── AJUSTES ───────────────────────────────────────────────────────── -->
      <div v-else-if="aba === 'config'" class="space-y-4">
        <Surface variant="raised" padding="md">
          <h3 class="text-sm font-semibold text-ink">O portão da fila</h3>
          <p class="text-xs text-ink-muted mt-0.5 mb-4 leading-relaxed max-w-3xl">
            O que separa uma fila que alguém lê de um alerta vermelho que se aprende a ignorar.
            Exigir mais faz a Eme aprender devagar e certo; exigir menos enche a tela de palpite.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input v-model.number="formCfg.min_evidencias" type="number" label="Casos mínimos"
              hint="Quantas vezes o padrão precisa se repetir. Mínimo 3." />
            <Input v-model.number="formCfg.min_confianca" type="number" step="0.05" label="Confiança mínima"
              hint="De 0 a 1. Abaixo disso a proposta fica em observação." />
            <Input v-model.number="formCfg.max_por_dia" type="number" label="Propostas por dia"
              hint="O teto da fila. Acima de 20 deixa de ser fila e vira relatório." />
          </div>
        </Surface>

        <Surface variant="raised" padding="md">
          <h3 class="text-sm font-semibold text-ink">Largura para virar regra da empresa</h3>
          <p class="text-xs text-ink-muted mt-0.5 mb-4 leading-relaxed max-w-3xl">
            Uma regra tirada de um empreendimento só nasce valendo ali. Para virar regra da casa, o padrão
            precisa aparecer em vários lugares. Isso protege duas coisas ao mesmo tempo: impede que o dado de
            um empreendimento chegue a quem não o enxerga, e impede a Eme de generalizar o que era local.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input v-model.number="formCfg.min_empreendimentos" type="number" label="Empreendimentos mínimos"
              hint="Mínimo 2. Baixar para 1 desligaria a trava." />
            <Input v-model.number="formCfg.min_cidades" type="number" label="Cidades mínimas"
              hint="Padrão que só aparece numa cidade costuma ser da cidade." />
          </div>
        </Surface>

        <Surface variant="raised" padding="md">
          <h3 class="text-sm font-semibold text-ink">Quando sugerir subir um degrau</h3>
          <p class="text-xs text-ink-muted mt-0.5 mb-4 leading-relaxed max-w-3xl">
            A sugestão nunca promove sozinha - quem sobe o degrau é você. Qualquer ação desfeita no período
            cancela a sugestão, por mais bonito que esteja o resto dos números.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input v-model.number="formCfg.promo_min_aprovadas" type="number" label="Aprovações necessárias" />
            <Input v-model.number="formCfg.promo_min_dias" type="number" label="Dias de histórico"
              hint="Volume sem tempo não prova nada: 50 acertos numa terça não passam por um fechamento de mês." />
          </div>

          <div class="mt-4 flex justify-end">
            <Button :loading="salvando" icon="fas fa-check" @click="gravarCfg">Salvar ajustes</Button>
          </div>
        </Surface>
      </div>

      <!-- ── Modal de autonomia ────────────────────────────────────────────── -->
      <Modal :open="modalAutonomia" size="md"
        :title="`Autonomia: ${alvo?.nome || ''}`"
        subtitle="Até onde este processo pode ir sozinho."
        @close="modalAutonomia = false">

        <div class="space-y-4">
          <div v-if="erro" class="rounded-lg border border-data-neg/30 bg-data-neg/10 p-3 text-sm text-data-neg">
            <i class="fas fa-triangle-exclamation mr-1.5"></i>{{ erro }}
          </div>

          <Select v-model="formAut.autonomia" label="Degrau atual" :options="opcoesNivel" />
          <p class="text-xs text-ink-muted -mt-2 leading-relaxed">{{ EXPLICA_NIVEL[formAut.autonomia] }}</p>

          <Select v-model="formAut.autonomia_teto" label="Teto" :options="opcoesNivel"
            hint="O limite que este processo nunca ultrapassa, nem com histórico impecável." />

          <div class="rounded-lg border border-line bg-surface-sunken p-3">
            <p class="text-xs text-ink-muted leading-relaxed">
              <i class="fas fa-circle-info mr-1 text-ink-subtle"></i>
              Sobe um degrau por vez, e nunca acima do teto. <strong class="text-ink">Descer é livre</strong>, e
              acontece sozinho quando uma ação automática é desfeita - recuar depressa nunca é o risco.
            </p>
          </div>

          <div>
            <label class="block text-xs font-medium text-ink-muted mb-1.5">Nota</label>
            <textarea v-model="formAut.nota" rows="3"
              class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink
                     focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              placeholder="Por que este processo tem este teto? Quem decidiu?"></textarea>
            <p class="text-xs text-ink-muted mt-1 leading-relaxed">
              Fica na tela ao lado do processo. Seis meses depois, é o que explica a escolha.
            </p>
          </div>
        </div>

        <template #footer>
          <Button variant="ghost" @click="modalAutonomia = false">Cancelar</Button>
          <Button :loading="salvando" icon="fas fa-check" @click="gravarAutonomia">Salvar</Button>
        </template>
      </Modal>

      <!-- ── Modal de evidência ────────────────────────────────────────────── -->
      <Modal :open="modalEvidencia" size="lg"
        title="Os casos que sustentam a proposta"
        subtitle="O dado cru que o motor observou. Não entra no texto da regra."
        @close="modalEvidencia = false">

        <EmptyState v-if="!evidencia.length" icon="fas fa-list-check"
          title="Sem observações registradas" description="" />

        <ul v-else class="space-y-2">
          <li v-for="o in evidencia" :key="o.id" class="rounded-lg border border-line p-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-xs text-ink leading-relaxed">{{ o.acao || 'sem ação registrada' }}</p>
                <p class="text-micro font-mono text-ink-subtle mt-1">
                  {{ o.caso_tipo }} {{ o.caso_ref }} ·
                  {{ (o.cidades || []).join(', ') || 'sem cidade' }} ·
                  {{ quando(o.occurred_at) }}
                </p>
              </div>
              <Badge v-if="o.resultado" variant="neutral" size="sm">{{ o.resultado }}</Badge>
            </div>
          </li>
        </ul>

        <template #footer>
          <Button variant="ghost" @click="modalEvidencia = false">Fechar</Button>
        </template>
      </Modal>

    </PageContainer>
  </div>
</template>
