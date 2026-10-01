<script setup>
// Relatório de Recurso Próprio por cliente (/comercial/relatorios/recurso-proprio).
//
// Padrão do relatório feito à mão para o Residencial Ingá (set/2026), agora
// para qualquer empreendimento. Três fontes que não se misturam (detalhe no
// backend, services/comercial/recursoProprioService.js):
//   - CONDIÇÃO: financeiro da reserva no CV, sem recálculo;
//   - REGRA: Ficha Comercial mais recente, só para conferir;
//   - RECEBIDO: Sienge ao vivo + boleto pago no Office ainda não lançado.
// A tela não recalcula número nenhum do servidor: só filtra, ordena e soma o
// recorte visível.
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { fmtMoney, fmtNum, fmtDate, fmtDateTime } from '@/utils/format';
import { useCan } from '@/composables/useCan';

import PageHelp from '@/components/UI/PageHelp.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Panel from '@/components/UI/Panel.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import ConfigModal from './ConfigModal.vue';
import DetalheModal from './DetalheModal.vue';
import { cvReservaFinanceiroUrl } from './cvLinks';

const TELA = '/comercial/relatorios/recurso-proprio';
const can = useCan(TELA);
const toast = useToast();
const route = useRoute();
const router = useRouter();


// ── Empreendimento (fica na URL: o link compartilhado abre no mesmo) ────────
const empreendimentos = ref([]);
const idemp = ref(route.query.empreendimento ? String(route.query.empreendimento) : '');
const opcoesEmp = computed(() => empreendimentos.value.map((e) => ({
  value: String(e.id), label: `${e.nome} (${e.reservas})`,
})));
// Seletor padrão do Office (busca + lista), em modo de um só.
const empSelecionado = computed({
  get: () => (idemp.value ? [idemp.value] : []),
  set: (v) => { idemp.value = Array.isArray(v) && v.length ? String(v[v.length - 1]) : ''; },
});

async function carregarEmpreendimentos() {
  try {
    const r = await requestWithAuth('/recurso-proprio/empreendimentos');
    empreendimentos.value = r.empreendimentos || [];
  } catch (e) {
    toast.error(e.message || 'Não foi possível listar os empreendimentos.');
  }
}

// ── Relatório ───────────────────────────────────────────────────────────────
const dados = ref(null);
const carregando = ref(false);
const erro = ref('');

async function carregar() {
  if (!idemp.value) { dados.value = null; return; }
  carregando.value = true;
  erro.value = '';
  try {
    dados.value = await requestWithAuth(`/recurso-proprio?idempreendimento=${encodeURIComponent(idemp.value)}`);
  } catch (e) {
    erro.value = e.message || 'Não foi possível montar o relatório.';
    dados.value = null;
  } finally {
    carregando.value = false;
  }
}

watch(idemp, (v) => {
  filtro.value = 'todos';
  busca.value = '';
  router.replace({ query: { ...route.query, empreendimento: v || undefined } });
  carregar();
});

onMounted(async () => {
  await carregarEmpreendimentos();
  if (idemp.value) carregar();
});

const linhas = computed(() => dados.value?.linhas || []);

// ── Contas do recorte ───────────────────────────────────────────────────────
const soma = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);
const recebido = (l) => (l.recebidoAto || 0) + (l.recebidoMensais || 0);
const brl0 = (v) => fmtMoney(v, { casas: 0 });
const brl = (v) => fmtMoney(v);
const n2 = (v) => fmtNum(v, 2);
const pct = (v, casas = 0) => `${fmtNum(v * 100, casas)}%`;

const filtro = ref('todos');
const busca = ref('');

const contagens = computed(() => {
  const L = linhas.value;
  return {
    acima: L.filter((l) => l.nivelRenda !== 'ok').length,
    atencao: L.filter((l) => l.nivelRenda === 'atencao').length,
    alto: L.filter((l) => l.nivelRenda === 'alto').length,
    comFiador: L.filter((l) => l.rendaComFiador).length,
    semRec: L.filter((l) => recebido(l) === 0).length,
    regra: L.filter((l) => l.foraDaRegra.length).length,
    pend: L.filter((l) => l.pendencias.length).length,
    semRenda: L.filter((l) => !l.renda).length,
  };
});

const kpis = computed(() => {
  const L = linhas.value;
  const c = contagens.value;
  const rp = soma(L, (l) => l.recursoProprio);
  const rec = soma(L, recebido);
  const lim = dados.value?.limites;
  return [
    { key: 'todos', label: 'Recurso próprio', raw: rp, format: brl0, icon: 'fas fa-wallet', tone: 'accent',
      hint: `${brl0(soma(L, (l) => l.ato))} de ato + ${brl0(soma(L, (l) => l.parcelas))} em parcelas`,
      tooltip: 'Clique para ver todas as reservas' },
    { key: 'recebido', label: 'Recebido', raw: rec, format: brl0, icon: 'fas fa-hand-holding-dollar', tone: 'pos',
      hint: `${rp ? pct(rec / rp, 1) : '-'} do recurso próprio · falta ${brl0(Math.max(0, rp - rec))}`,
      tooltip: 'Ato e mensais recebidos no Sienge, mais o que foi pago no Office e ainda não lançado' },
    { key: 'renda', label: `Acima de ${fmtNum(lim?.rendaPct ?? 30, 0)}% da renda`, raw: c.acima, icon: 'fas fa-scale-unbalanced',
      tone: c.acima ? 'neg' : 'neutral', hint: `${c.atencao} pouco acima · ${c.alto} bem acima${c.comFiador ? ` · ${c.comFiador} com fiador` : ''}`,
      tooltip: 'Clique para ver só esses clientes' },
    { key: 'semrec', label: 'Nada recebido', raw: c.semRec, icon: 'fas fa-circle-exclamation', tone: c.semRec ? 'warn' : 'neutral',
      hint: 'sem ato nem mensal recebidos', tooltip: 'Clique para ver só essas reservas' },
    { key: 'regra', label: 'Fora da regra da ficha', raw: c.regra, icon: 'fas fa-clipboard-check', tone: c.regra ? 'warn' : 'neutral',
      hint: dados.value?.ficha ? '% da renda, ato, parcela mínima ou nº de parcelas' : 'sem ficha comercial', tooltip: 'Clique para ver só essas reservas' },
  ];
});

const visiveis = computed(() => {
  const q = busca.value.trim().toLowerCase();
  return linhas.value.filter((l) => {
    if (filtro.value === 'renda' && l.nivelRenda === 'ok') return false;
    if (filtro.value === 'semrec' && recebido(l) > 0) return false;
    if (filtro.value === 'regra' && !l.foraDaRegra.length) return false;
    if (filtro.value === 'recebido' && recebido(l) === 0) return false;
    if (q && !`${l.nome} ${l.corretor || ''} ${l.imobiliaria || ''} ${l.unidade || ''} ${l.id} ${l.situacao || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
});

function escolherKpi(item) {
  const key = item?.key ?? item;
  filtro.value = filtro.value === key && key !== 'todos' ? 'todos' : key;
}

const ordem = ref({ by: 'recursoProprio', dir: 'desc' });
const COLUNAS = [
  { key: 'nome', label: 'Cliente', priority: 1, sortable: true },
  { key: 'renda', label: 'Renda', priority: 2, numeric: true, sortable: true, width: '7rem' },
  { key: 'venda', label: 'Venda', priority: 3, numeric: true, sortable: true, width: '7.5rem' },
  { key: 'financiamento', label: 'Financiamento', priority: 3, numeric: true, sortable: true, width: '8rem' },
  { key: 'federal', label: 'Subsídio federal', priority: 3, numeric: true, sortable: true, width: '7rem' },
  { key: 'estadual', label: 'Subsídio estadual', priority: 3, numeric: true, sortable: true, width: '7rem' },
  { key: 'recursoProprio', label: 'Recurso próprio', priority: 1, numeric: true, sortable: true, width: '8rem' },
  { key: 'parcela', label: 'Parcelas', priority: 2, numeric: true, sortable: true, width: '8rem' },
  { key: 'pctRenda', label: '% da renda', priority: 1, numeric: true, sortable: true, width: '6.5rem' },
  { key: 'recebido', label: 'Recebido', priority: 2, numeric: true, sortable: true, width: '8.5rem', value: recebido },
  { key: 'corretor', label: 'Corretor', priority: 3, sortable: true, width: '11rem' },
];

const ordenadas = computed(() => {
  const { by, dir } = ordem.value;
  const col = COLUNAS.find((c) => c.key === by);
  const val = (l) => (col?.value ? col.value(l) : l[by]);
  const mul = dir === 'asc' ? 1 : -1;
  return [...visiveis.value].sort((a, b) => {
    const x = val(a); const y = val(b);
    if (typeof x === 'number' || typeof y === 'number') return ((Number(x) || 0) - (Number(y) || 0)) * mul;
    return String(x ?? '').localeCompare(String(y ?? ''), 'pt-BR') * mul;
  });
});

const rodape = computed(() => {
  const V = visiveis.value;
  return `${V.length} de ${linhas.value.length} reservas · venda ${brl0(soma(V, (l) => l.venda))} · recurso próprio ${brl0(soma(V, (l) => l.recursoProprio))} · recebido ${brl0(soma(V, recebido))}`;
});

// ── Ficha / fontes ──────────────────────────────────────────────────────────
const STATUS_FICHA = { draft: 'rascunho', pending_approval: 'em autorização', approved: 'autorizada', closed: 'encerrada' };
const mesAno = (iso) => {
  if (!iso) return '-';
  const [a, m] = String(iso).split('-');
  return `${m}/${a}`;
};
const regrasFicha = computed(() => {
  const f = dados.value?.ficha;
  if (!f) return [];
  const lista = f.modulos?.length ? f.modulos : [f.regras];
  return lista.map((r) => ({
    nome: r.modulo?.nome || 'Ficha',
    itens: [
      ['Ato mínimo', r.atoMinimo ? brl(r.atoMinimo) : '-'],
      ['Parcela mínima', r.parcelaMinima ? brl(r.parcelaMinima) : '-'],
      ['Máx. parcelas', r.maxParcelas ? `${r.maxParcelas}x` : '-'],
      ['Limite da renda', r.limiteRendaPct ? `${fmtNum(r.limiteRendaPct, 0)}%` : '-'],
      ['Máx. entrada', r.maxEntradaPct ? `${fmtNum(r.maxEntradaPct, 0)}%` : '-'],
    ],
    regraRp: r.regraRp,
  }));
});
const excluidasTexto = computed(() => {
  const e = dados.value?.excluidas || {};
  const partes = Object.entries(e).map(([k, v]) => `${v} ${k.toLowerCase()}${v > 1 ? 's' : ''}`);
  return partes.length ? `Fora do relatório: ${partes.join(', ')}.` : '';
});

// ── Exportar ────────────────────────────────────────────────────────────────
function exportarCsv() {
  const cab = ['Reserva', 'Pré-cadastro', 'Cliente', 'Situação', 'Unidade', 'Módulo', 'Corretor', 'Imobiliária', 'Renda',
    'Venda', 'Financiamento', 'FGTS', 'Subsídio federal', 'Subsídio estadual', 'Desconto', 'Ato', 'Parcelas',
    'Recurso próprio', 'Nº parcelas', 'Parcela', '% da renda', 'Recebido ato', 'Recebido mensais', 'Mensais recebidas',
    'Fora da regra', 'Pendências', 'Observação'];
  const num = (v) => (v == null ? '' : String(Math.round(Number(v) * 100) / 100).replace('.', ','));
  const txt = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const corpo = ordenadas.value.map((l) => [
    l.id, l.pc ?? '', txt(l.nome), txt(l.situacao), txt(l.unidade), txt(l.modulo), txt(l.corretor), txt(l.imobiliaria),
    num(l.renda), num(l.venda), num(l.financiamento), num(l.fgts), num(l.federal), num(l.estadual), num(l.desconto),
    num(l.ato), num(l.parcelas), num(l.recursoProprio), l.nParcelas, num(l.parcela), num(l.pctRenda * 100),
    num(l.recebidoAto), num(l.recebidoMensais), l.nRecebidas,
    txt(l.foraDaRegra.map((f) => f.texto).join('; ')), txt(l.pendencias.join('; ')), txt(l.nota?.texto || ''),
  ].join(';'));
  const blob = new Blob([`﻿${[cab.join(';'), ...corpo].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `recurso-proprio-${(dados.value?.empreendimento?.nome || 'empreendimento').toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Detalhe da reserva (modal) ──────────────────────────────────────────────
const detalheAberto = ref(false);
const detalheLinha = ref(null);
function abrirDetalhe(l) { detalheLinha.value = l; detalheAberto.value = true; }
function aoSalvarNota({ id, nota }) {
  const l = linhas.value.find((x) => x.id === id);
  if (l) l.nota = nota;
}
function abrirCv(l) { window.open(cvReservaFinanceiroUrl(l.id), '_blank', 'noopener'); }

// ── Estoque do empreendimento ───────────────────────────────────────────────
const estoqueItens = computed(() => {
  const e = dados.value?.estoque;
  if (!e) return [];
  const vendidoPct = e.total ? (e.vendidas / e.total) * 100 : 0;
  return [
    { k: 'Unidades', v: e.total, cor: 'text-ink' },
    { k: 'À venda', v: e.aVenda, cor: 'text-accent', dica: 'disponíveis + bloqueadas comercialmente' },
    { k: 'Disponíveis', v: e.disponiveis, cor: 'text-ink' },
    { k: 'Bloqueadas comercialmente', v: e.bloqueadasComercial, cor: 'text-data-warn', dica: 'estoque segurado, conta como à venda' },
    { k: 'Outros bloqueios', v: e.bloqueadasOutras, cor: 'text-ink-muted', dica: 'Sienge, terreno etc.; não é estoque' },
    { k: 'Reservadas', v: e.reservadas, cor: 'text-ink' },
    { k: 'Vendidas', v: e.vendidas, cor: 'text-data-pos', dica: `${fmtNum(vendidoPct, 1)}% do total` },
  ];
});

// ── Configuração ────────────────────────────────────────────────────────────
const configAberta = ref(false);
function aoSalvarConfig() {
  configAberta.value = false;
  carregarEmpreendimentos();
  carregar();
}
</script>

<template>
  <div class="space-y-4">
    <Teleport to="#relatorio-acoes" defer>
      <Button v-if="dados && linhas.length" variant="secondary" icon="fas fa-file-csv" @click="exportarCsv">Exportar</Button>
      <Button v-if="can('configure')" variant="secondary" icon="fas fa-sliders" @click="configAberta = true">Configurar</Button>
      <PageHelp
        storage-key="relatorio-recurso-proprio"
        title="Como usar o Recurso Próprio"
        intro="Mostra, por cliente, o que ele paga direto à Menin (ato + parcelas), quanto isso pesa na renda e quanto já entrou no caixa."
        :steps="[
          { title: 'Escolha o empreendimento', text: 'Entram todas as reservas ativas dele. Canceladas, distratos e vencidas ficam de fora.' },
          { title: 'Leia a condição', text: 'Venda, financiamento, FGTS, subsídios, ato e parcelas vêm do financeiro da reserva no CV, exatamente como estão lá. Nada é recalculado.' },
          { title: 'Confira as regras', text: 'A Ficha Comercial mais recente diz o limite da parcela sobre a renda, o ato mínimo, a parcela mínima e o máximo de parcelas. Passou de qualquer um, a reserva entra em Fora da regra. A ficha só confere, nunca troca valor da reserva.' },
          { title: 'Veja o recebido', text: 'Entrada de caixa no Sienge, consultada na hora, mais o boleto pago no Office que o Sienge ainda não lançou.' },
          { title: 'Abra a linha', text: 'Clique no cliente para abrir o detalhe: séries do financeiro, cada recebimento do Sienge, a conferência da ficha e a observação. O botão no fim da linha abre o financeiro da reserva direto no CV.' },
        ]"
        :tips="[
          'Os cartões do topo filtram a tabela. Clique de novo para voltar a ver todas.',
          '% da renda: amarelo passou do limite até a tolerância; vermelho passou disso. O limite vem do texto da Regra do RP da ficha (ex.: “30% da renda”).',
          'Só são conferidas pela ficha as reservas feitas depois que o empreendimento passou a ter ficha comercial.',
          'Fiador: reserva acima do limite da renda com fiador registrado no CV não conta como fora da regra e aparece marcada “com fiador”. O CV não traz a renda do fiador, então ela precisa ser conferida.',
          'Recebido do Sienge conta só dinheiro que entrou (Recebimento e Adiantamento). Reparcelamento, promoção e abatimento de adiantamento não contam.',
          'A observação da linha aparece para todos que abrem o relatório, com o nome de quem escreveu.',
        ]"
      />
    </Teleport>

    <!-- Empreendimento -->
    <div class="flex flex-col sm:flex-row sm:items-end gap-3">
      <div class="w-full sm:w-96">
        <MultiSelector v-model="empSelecionado" single :options="opcoesEmp" :page-size="200"
          label="Empreendimento" placeholder="Buscar empreendimento..." />
      </div>
      <Button v-if="idemp" variant="secondary" icon="fas fa-rotate-right" :loading="carregando" @click="carregar">Atualizar</Button>
    </div>

    <EmptyState v-if="!idemp" icon="fas fa-wallet" title="Escolha um empreendimento"
      description="O relatório lista as reservas ativas com recurso próprio, peso na renda e recebido." />

    <div v-else-if="erro"
      class="rounded-xl border border-data-neg/20 bg-data-neg/10 p-4 text-sm text-data-neg flex items-center justify-between gap-3">
      <span class="flex items-center gap-2"><i class="fas fa-circle-exclamation"></i>{{ erro }}</span>
      <Button variant="outline" size="sm" icon="fas fa-rotate-right" @click="carregar">Tentar novamente</Button>
    </div>

    <template v-else>
      <Skeleton v-if="carregando && !dados" variant="table" :lines="6" />

      <template v-if="dados">
        <!-- Fontes -->
        <div class="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-muted">
          <span v-if="dados.ficha">
            <i class="fas fa-clipboard-list mr-1"></i>
            Regras da ficha de {{ mesAno(dados.ficha.mes) }}
            <Badge size="sm" :variant="dados.ficha.status === 'approved' || dados.ficha.status === 'closed' ? 'success' : 'warning'">
              {{ STATUS_FICHA[dados.ficha.status] || dados.ficha.status }}
            </Badge>
            <router-link :to="`/comercial/conditions/${dados.ficha.id}`" class="text-accent hover:underline ml-1">abrir ficha</router-link>
          </span>
          <span v-else class="text-data-warn"><i class="fas fa-triangle-exclamation mr-1"></i>Sem ficha comercial: nada é conferido, e o limite da renda é o configurado ({{ fmtNum(dados.limites.rendaPct, 0) }}%).</span>
          <span>
            <i class="fas fa-database mr-1"></i>
            <template v-if="dados.recebido.consultadoEm">Recebido do Sienge consultado {{ fmtDateTime(dados.recebido.consultadoEm) }}</template>
            <span v-if="dados.recebido.erro" class="text-data-warn"><i class="fas fa-triangle-exclamation mx-1"></i>{{ dados.recebido.erro }}</span>
          </span>
          <span v-if="excluidasTexto">{{ excluidasTexto }}</span>
          <span v-if="contagens.semRenda" class="text-data-warn">{{ contagens.semRenda }} sem renda no pré-cadastro (% da renda fica em branco).</span>
        </div>

        <!-- Estoque -->
        <Panel v-if="estoqueItens.length" :padded="false">
          <div class="px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-6">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted lg:w-40 shrink-0">
              <i class="fas fa-building mr-1"></i>Estoque
            </p>
            <dl class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-6 gap-y-2 flex-1">
              <div v-for="i in estoqueItens" :key="i.k" :title="i.dica || ''">
                <dt class="text-micro uppercase tracking-wide text-ink-subtle">{{ i.k }}</dt>
                <dd :class="['text-sm font-semibold tabular-nums', i.cor]">{{ i.v }}</dd>
                <dd v-if="i.dica" class="text-micro text-ink-subtle leading-tight">{{ i.dica }}</dd>
              </div>
            </dl>
          </div>
        </Panel>

        <!-- Regras da ficha -->
        <Panel v-if="regrasFicha.length" :padded="false">
          <div class="divide-y divide-line">
            <div v-for="m in regrasFicha" :key="m.nome" class="px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-6">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted lg:w-40 shrink-0">{{ m.nome }}</p>
              <dl class="grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-1 flex-1">
                <div v-for="[k, v] in m.itens" :key="k">
                  <dt class="text-micro uppercase tracking-wide text-ink-subtle">{{ k }}</dt>
                  <dd class="text-sm font-semibold text-ink tabular-nums">{{ v }}</dd>
                </div>
              </dl>
              <p v-if="m.regraRp" class="text-xs text-ink-muted lg:max-w-md whitespace-pre-line">{{ m.regraRp }}</p>
            </div>
          </div>
        </Panel>

        <StatRow :items="kpis" :cols="{ sm: 2, md: 3, lg: 5 }" selectable :active-key="filtro" @select="escolherKpi" />

        <div class="flex flex-col sm:flex-row sm:items-center gap-3">
          <p class="text-xs text-ink-muted sm:mr-auto">{{ rodape }}</p>
          <div class="w-full sm:w-72">
            <Input v-model="busca" icon-left="fas fa-magnifying-glass" placeholder="Buscar cliente, unidade ou corretor" size="sm" />
          </div>
        </div>

        <DataTable :columns="COLUNAS" :rows="ordenadas" row-key="id" :loading="carregando" manual-sort clickable @row-click="abrirDetalhe"
          v-model:sort-by="ordem.by" v-model:sort-dir="ordem.dir"
          empty-title="Nenhuma reserva neste recorte" empty-text="Limpe a busca ou clique de novo no cartão do topo.">
          <template #cell-nome="{ row }">
            <div class="min-w-0">
              <p class="font-semibold text-ink leading-tight flex items-center gap-1.5">
                <span class="truncate">{{ row.nome }}</span>
                <i v-if="row.nota" :class="[row.nota.tom === 'info' ? 'fas fa-circle-info text-accent' : 'fas fa-triangle-exclamation text-data-neg', 'text-xs shrink-0']"
                  :title="row.nota.texto"></i>
                <i v-if="row.pendencias.length" class="fas fa-clock text-data-warn text-xs shrink-0" :title="row.pendencias.join(' · ')"></i>
              </p>
              <p class="text-micro text-ink-subtle tabular-nums">
                #{{ row.id }} · {{ row.unidade || '-' }}
                <Badge size="sm" :variant="row.situacao === 'Vendida' ? 'success' : 'neutral'" class="ml-1">{{ row.situacao }}</Badge>
              </p>
            </div>
          </template>
          <template #cell-renda="{ row }">
            <span class="tabular-nums">{{ row.renda ? n2(row.renda) : '-' }}</span>
          </template>
          <template #cell-venda="{ row }"><span class="tabular-nums font-semibold">{{ n2(row.venda) }}</span></template>
          <template #cell-financiamento="{ row }">
            <span class="tabular-nums">{{ row.financiamento ? n2(row.financiamento) : '-' }}</span>
            <p v-if="row.fgts" class="text-micro text-ink-subtle tabular-nums">+ FGTS {{ fmtNum(row.fgts, 0) }}</p>
          </template>
          <template #cell-federal="{ row }"><span :class="['tabular-nums', row.federal ? 'text-data-pos font-semibold' : 'text-ink-subtle']">{{ row.federal ? n2(row.federal) : '-' }}</span></template>
          <template #cell-estadual="{ row }"><span :class="['tabular-nums', row.estadual ? 'text-data-pos font-semibold' : 'text-ink-subtle']">{{ row.estadual ? n2(row.estadual) : '-' }}</span></template>
          <template #cell-recursoProprio="{ row }">
            <span class="tabular-nums font-bold">{{ n2(row.recursoProprio) }}</span>
            <p v-if="row.foraDaRegra.length" class="text-micro text-data-warn" :title="row.foraDaRegra.map((f) => f.texto).join(' · ')">
              <i class="fas fa-clipboard-check mr-0.5"></i>fora da regra
            </p>
          </template>
          <template #cell-parcela="{ row }">
            <template v-if="row.nParcelas">
              <span class="tabular-nums font-semibold">{{ row.nParcelas }}x {{ n2(row.parcela) }}</span>
              <p class="text-micro text-ink-subtle tabular-nums">+ ato {{ n2(row.ato) }}</p>
            </template>
            <template v-else>
              <span class="text-ink-muted">só o ato</span>
              <p class="text-micro text-ink-subtle tabular-nums">{{ n2(row.ato) }}</p>
            </template>
          </template>
          <template #cell-pctRenda="{ row }">
            <span v-if="row.pctRenda"
              :class="['tabular-nums font-semibold', row.nivelRenda === 'alto' ? 'text-data-neg' : row.nivelRenda === 'atencao' ? 'text-data-warn' : 'text-ink']">
              {{ pct(row.pctRenda, row.nivelRenda === 'atencao' ? 1 : 0) }}
            </span>
            <p v-if="row.fiadores?.length" class="text-micro text-accent" :title="row.fiadores.map((f) => `${f.tipo}: ${f.nome}`).join(' · ')">
              <i class="fas fa-user-shield mr-0.5"></i>com fiador
            </p>
            <span v-else class="text-ink-subtle">-</span>
          </template>
          <template #cell-recebido="{ row }">
            <span v-if="!recebido(row)" class="text-ink-subtle">nada recebido</span>
            <template v-else>
              <span class="tabular-nums font-semibold text-data-pos">{{ n2(recebido(row)) }}</span>
              <p class="text-micro text-ink-subtle tabular-nums">
                {{ row.recebidoAto ? `ato ${fmtNum(row.recebidoAto, 0)}` : 'sem ato' }}<template v-if="row.nRecebidas"> · {{ row.nRecebidas }} {{ row.nRecebidas > 1 ? 'mensais' : 'mensal' }} {{ fmtNum(row.recebidoMensais, 0) }}</template>
              </p>
            </template>
          </template>
          <template #cell-corretor="{ row }"><span class="text-xs text-ink-muted">{{ row.corretor || '-' }}</span></template>

          <template #actions="{ row }">
            <IconButton icon="fas fa-arrow-up-right-from-square" size="sm" label="Abrir o financeiro da reserva no CV"
              title="Abrir o financeiro da reserva no CV" @click.stop="abrirCv(row)" />
          </template>
        </DataTable>
      </template>
    </template>

    <DetalheModal v-model:open="detalheAberto" :linha="detalheLinha" :pode-anotar="can('annotate')"
      @nota-salva="aoSalvarNota" />
    <ConfigModal v-if="can('configure')" v-model:open="configAberta" @salvo="aoSalvarConfig" />
  </div>
</template>
