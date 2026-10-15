<script setup>
// Extrato de um contrato, lido na hora do Sienge
// (GET /extrato-cliente/:titulo). O servidor confere a alçada do título antes
// de consultar; aqui só se mostra, recorta e soma o recorte visível.
//
// O PDF é o relatório oficial "Extrato Cliente" do Sienge, repassado pelo
// servidor (GET /extrato-cliente/:titulo/pdf): o link que o Sienge gera expira
// em minutos, então a tela guarda o arquivo enquanto o extrato está aberto.
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useToast } from 'vue-toastification';
import API_URL from '@/config/apiUrl';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { fmtMoney, fmtDate, fmtDateTime } from '@/utils/format';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Select from '@/components/UI/Select.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import Spinner from '@/components/UI/Spinner.vue';
import { fmtDocumento } from './extrato';

const props = defineProps({
  open: { type: Boolean, default: false },
  // Linha da lista: { titulo, clienteEscolhido, cliente, clientes, unidade, ... }
  contrato: { type: Object, default: null },
});
const emit = defineEmits(['update:open']);

const toast = useToast();

const aberto = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
});

// Ampliar = o extrato toma a tela inteira (muitas parcelas de uma vez).
const ampliado = ref(false);

// ── Extrato ─────────────────────────────────────────────────────────────────
const clienteId = ref(null);
const dados = ref(null);
const carregando = ref(false);
const erro = ref('');

let seq = 0;
async function carregar() {
  const titulo = props.contrato?.titulo;
  if (!titulo) return;
  const meu = ++seq;
  carregando.value = true;
  erro.value = '';
  try {
    const qs = clienteId.value ? `?cliente=${encodeURIComponent(clienteId.value)}` : '';
    const r = await requestWithAuth(`/extrato-cliente/${encodeURIComponent(titulo)}${qs}`);
    if (meu !== seq) return;
    dados.value = r;
    if (!clienteId.value) clienteId.value = r.cliente?.id ?? null;
  } catch (e) {
    if (meu !== seq) return;
    erro.value = e.message || 'Não foi possível consultar o extrato no Sienge.';
    dados.value = null;
  } finally {
    if (meu === seq) carregando.value = false;
  }
}

watch(() => [props.open, props.contrato?.titulo], ([open]) => {
  if (!open) { descartarPdf(); return; }
  dados.value = null;
  recorte.value = 'todas';
  ampliado.value = false;
  clienteId.value = props.contrato?.clienteEscolhido || null;
  carregar();
}, { immediate: true });

// Contrato com mais de um comprador: o extrato é por cliente.
const clientes = computed(() => dados.value?.clientes || props.contrato?.clientes || []);
const opcoesCliente = computed(() => clientes.value.map((c) => ({
  value: String(c.id), label: `${c.nome}${c.principal ? ' (principal)' : c.conjuge ? ' (cônjuge)' : ''}`,
})));
const clienteSelecionado = computed({
  get: () => (clienteId.value ? String(clienteId.value) : ''),
  set: (v) => {
    if (!v || Number(v) === Number(clienteId.value)) return;
    clienteId.value = Number(v);
    descartarPdf();
    carregar();
  },
});

// ── Cabeçalho ───────────────────────────────────────────────────────────────
const titulo = computed(() => dados.value?.cliente?.nome || props.contrato?.cliente || 'Extrato do cliente');
const subtitulo = computed(() => {
  const d = dados.value;
  const partes = [];
  if (d?.cliente?.documento) partes.push(fmtDocumento(d.cliente.documento));
  const unidade = d ? d.unidades.map((u) => u.nome).join(', ') : props.contrato?.unidade;
  if (unidade) partes.push(unidade);
  partes.push(`título ${props.contrato?.titulo ?? ''}`);
  return partes.join(' · ');
});

const ficha = computed(() => {
  const d = dados.value;
  if (!d) return [];
  return [
    { k: 'Empreendimento', v: `${d.empreendimento.nome} · ${d.empreendimento.id}`, largo: true },
    // Título sem contrato de venda (AVC, taxa...): mostra o documento do título.
    ...(d.contrato.numero
      ? [{ k: 'Contrato', v: d.contrato.numero },
         { k: 'Data do contrato', v: fmtDate(d.contrato.data) },
         { k: 'Valor do contrato', v: fmtMoney(d.contrato.valor) }]
      : [{ k: 'Documento', v: `${d.contrato.documento} · sem contrato` },
         { k: 'Emissão', v: fmtDate(d.contrato.data) },
         { k: 'Valor do título', v: fmtMoney(d.contrato.valor) }]),
    { k: 'Multa / juros', v: `${d.contrato.multaPct || 0}% / ${d.contrato.jurosPct || 0}% a.m.` },
  ];
});

// ── Números do topo ─────────────────────────────────────────────────────────
const parcelas = computed(() => dados.value?.parcelas || []);
const resumo = computed(() => dados.value?.resumo || null);
const brl = (v) => fmtMoney(v);

const kpis = computed(() => {
  const r = resumo.value;
  if (!r) return [];
  const outras = Object.entries(r.outrasBaixas || {});
  const totalOutras = outras.reduce((s, [, v]) => s + v, 0);
  return [
    { key: 'pagas', label: 'Recebido', raw: r.recebido, format: brl, icon: 'fas fa-hand-holding-dollar', tone: 'pos',
      hint: `${r.pagas} ${r.pagas === 1 ? 'parcela paga' : 'parcelas pagas'}${r.ultimoPagamento ? ` · último em ${fmtDate(r.ultimoPagamento)}` : ''}`,
      tooltip: 'Clique para ver só as parcelas pagas' },
    { key: 'abertas', label: 'Em aberto', raw: r.saldoAberto, format: brl, icon: 'fas fa-hourglass-half', tone: 'accent',
      hint: `${r.aVencer + r.vencidas} ${r.aVencer + r.vencidas === 1 ? 'parcela' : 'parcelas'}, valor atualizado`,
      tooltip: 'Clique para ver só as parcelas em aberto' },
    { key: 'vencidas', label: 'Vencido', raw: r.saldoVencido, format: brl, icon: 'fas fa-triangle-exclamation',
      tone: r.vencidas ? 'neg' : 'neutral',
      hint: r.vencidas ? `${r.vencidas} ${r.vencidas === 1 ? 'parcela vencida' : 'parcelas vencidas'}` : 'nada vencido',
      tooltip: 'Clique para ver só as parcelas vencidas' },
    { key: 'baixadas', label: 'Outras baixas', raw: totalOutras, format: brl, icon: 'fas fa-right-left', tone: 'neutral',
      hint: outras.length ? outras.map(([k]) => k.toLowerCase()).join(', ') : 'nenhuma',
      tooltip: 'Reparcelamento, distrato, promoção e outras baixas que não são dinheiro' },
  ];
});

const recorte = ref('todas');
function escolherKpi(item) {
  const key = item?.key ?? item;
  recorte.value = recorte.value === key ? 'todas' : key;
}
const FILTRO = {
  pagas: (p) => p.situacao.chave === 'paga' || p.recebido > 0,
  abertas: (p) => p.situacao.chave === 'aberta' || p.situacao.chave === 'vencida',
  vencidas: (p) => p.situacao.chave === 'vencida',
  baixadas: (p) => p.baixas.some((b) => !b.dinheiro),
};
const ROTULO_RECORTE = { pagas: 'só pagas', abertas: 'só em aberto', vencidas: 'só vencidas', baixadas: 'só com outras baixas' };
const visiveis = computed(() => (FILTRO[recorte.value] ? parcelas.value.filter(FILTRO[recorte.value]) : parcelas.value));

const linhaEstado = computed(() => {
  const r = resumo.value;
  const partes = [`${visiveis.value.length} de ${parcelas.value.length} parcelas`];
  if (r?.proximoVencimento) partes.push(`próxima: ${r.proximoVencimento.numero} em ${fmtDate(r.proximoVencimento.data)}, ${fmtMoney(r.proximoVencimento.valor)}`);
  if (dados.value?.consultadoEm) partes.push(`consultado no Sienge ${fmtDateTime(dados.value.consultadoEm)}`);
  return partes.join(' · ');
});

// ── Tabela de parcelas ──────────────────────────────────────────────────────
const COLUNAS = [
  { key: 'numero', label: 'Parcela', priority: 1, sortable: false },
  { key: 'vencimento', label: 'Vencimento', priority: 1, sortable: false, width: '7rem' },
  { key: 'valorOriginal', label: 'Valor original', priority: 3, numeric: true, sortable: false, width: '8rem' },
  { key: 'recebido', label: 'Pago', priority: 2, numeric: true, sortable: false, width: '8rem' },
  { key: 'ultimaBaixa', label: 'Pago em', priority: 3, sortable: false, width: '7rem' },
  { key: 'saldo', label: 'Saldo atual', priority: 2, numeric: true, sortable: false, width: '8rem' },
  { key: 'situacao', label: 'Situação', priority: 1, sortable: false, width: '9rem' },
];

const VARIANTE = { paga: 'success', aberta: 'neutral', vencida: 'danger', baixada: 'info' };
const variante = (p) => (p.situacao.chave === 'aberta' && p.recebido > 0 ? 'warning' : VARIANTE[p.situacao.chave] || 'neutral');

// ── PDF oficial ─────────────────────────────────────────────────────────────
const pdfUrl = ref('');
const pdfNome = ref('');
const pdfCarregando = ref(false);
const pdfAberto = ref(false);

function descartarPdf() {
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value);
  pdfUrl.value = '';
  pdfNome.value = '';
  pdfAberto.value = false;
}
onBeforeUnmount(descartarPdf);

async function obterPdf() {
  if (pdfUrl.value) return true;
  pdfCarregando.value = true;
  try {
    const token = localStorage.getItem('token');
    const qs = clienteId.value ? `?cliente=${encodeURIComponent(clienteId.value)}` : '';
    const r = await fetch(`${API_URL}/extrato-cliente/${encodeURIComponent(props.contrato.titulo)}/pdf${qs}`, {
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      throw new Error(corpo.error || `Falha ao gerar o PDF (${r.status}).`);
    }
    pdfNome.value = /filename="([^"]+)"/.exec(r.headers.get('content-disposition') || '')?.[1] || `extrato-${props.contrato.titulo}.pdf`;
    pdfUrl.value = URL.createObjectURL(await r.blob());
    return true;
  } catch (e) {
    toast.error(e.message || 'Não foi possível gerar o PDF do extrato.');
    return false;
  } finally {
    pdfCarregando.value = false;
  }
}

async function verPdf() {
  if (await obterPdf()) pdfAberto.value = true;
}

async function baixarPdf() {
  if (!(await obterPdf())) return;
  const a = document.createElement('a');
  a.href = pdfUrl.value;
  a.download = pdfNome.value;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ── Planilha ────────────────────────────────────────────────────────────────
function exportarCsv() {
  const d = dados.value;
  if (!d) return;
  const num = (v) => (v == null ? '' : String(Math.round(Number(v) * 100) / 100).replace('.', ','));
  const txt = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const cab = ['Parcela', 'Condição', 'Vencimento', 'Valor original', 'Saldo atual', 'Situação',
    'Data da baixa', 'Tipo da baixa', 'Valor da baixa', 'Juros', 'Acréscimo', 'Desconto', 'Líquido'];
  const linhas = [];
  for (const p of parcelas.value) {
    const base = [txt(p.numero), txt(p.condicao.nome), fmtDate(p.vencimento, ''), num(p.valorOriginal), num(p.saldo), txt(p.situacao.rotulo)];
    if (!p.baixas.length) linhas.push([...base, '', '', '', '', '', '', ''].join(';'));
    for (const b of p.baixas) {
      linhas.push([...base, fmtDate(b.data, ''), txt(b.tipo), num(b.valor), num(b.juros), num(b.acrescimo), num(b.desconto), num(b.liquido)].join(';'));
    }
  }
  const blob = new Blob([`﻿${[cab.join(';'), ...linhas].join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `extrato-titulo-${d.contrato.titulo}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>

<template>
  <Modal v-model:open="aberto" :size="ampliado ? 'screen' : 'full'">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold text-ink truncate">{{ titulo }}</h2>
          <p class="text-xs text-ink-muted mt-0.5 truncate tabular-nums">{{ subtitulo }}</p>
        </div>
        <Badge v-if="dados" size="sm" class="shrink-0"
          :variant="dados.contrato.situacao === 'Cancelado' ? 'warning' : dados.contrato.numero ? 'success' : 'info'">
          {{ dados.contrato.situacao === 'Cancelado' ? 'Cancelado' : dados.contrato.numero ? 'Ativo' : `Sem contrato · ${dados.contrato.tipoDocumento}` }}
        </Badge>
        <IconButton class="hidden sm:inline-flex shrink-0" :icon="ampliado ? 'fas fa-compress' : 'fas fa-expand'"
          :label="ampliado ? 'Reduzir' : 'Ampliar'" :title="ampliado ? 'Reduzir' : 'Ampliar para a tela inteira'"
          @click="ampliado = !ampliado" />
      </div>
    </template>

    <div v-if="erro"
      class="rounded-xl border border-data-neg/25 bg-data-neg/10 p-4 text-sm text-data-neg flex items-center justify-between gap-3">
      <span class="flex items-center gap-2"><i class="fas fa-circle-exclamation"></i>{{ erro }}</span>
      <Button variant="outline" size="sm" icon="fas fa-rotate-right" @click="carregar">Tentar novamente</Button>
    </div>

    <div v-else-if="!dados" class="space-y-4">
      <Skeleton variant="text" :lines="2" />
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <Skeleton v-for="i in 4" :key="i" variant="stat" />
      </div>
      <Skeleton variant="table" :lines="8" />
    </div>

    <div v-else class="space-y-4">
      <!-- Contrato -->
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-x-4 gap-y-3">
        <div v-if="opcoesCliente.length > 1" class="col-span-2 lg:col-span-6 sm:max-w-md">
          <Select v-model="clienteSelecionado" :options="opcoesCliente" label="Cliente do extrato" />
        </div>
        <div v-for="i in ficha" :key="i.k" :class="['min-w-0', i.largo ? 'col-span-2' : '']">
          <p class="text-micro uppercase tracking-wide text-ink-subtle">{{ i.k }}</p>
          <p class="text-sm text-ink tabular-nums truncate" :title="i.v">{{ i.v }}</p>
        </div>
      </div>

      <StatRow :items="kpis" :cols="{ sm: 2, md: 2, lg: 4 }" selectable :active-key="recorte" @select="escolherKpi" />

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
        <span class="tabular-nums">{{ linhaEstado }}</span>
        <button v-if="recorte !== 'todas'" type="button"
          class="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-accent/10 text-accent font-medium focus-ring"
          @click="recorte = 'todas'">
          {{ ROTULO_RECORTE[recorte] }} <i class="fas fa-xmark text-micro"></i>
        </button>
        <span v-if="dados.contrato.subJudice" class="text-data-warn"><i class="fas fa-scale-balanced mr-1"></i>Título sub judice</span>
        <Spinner v-if="carregando" size="sm" />
      </div>

      <EmptyState v-if="!parcelas.length" icon="fas fa-file-circle-question" title="O Sienge não devolveu parcelas para este título"
        description="Acontece com contrato cancelado ou distratado cujas parcelas saíram do título. O PDF oficial mostra o que o Sienge ainda tem." />

      <DataTable v-else :columns="COLUNAS" :rows="visiveis" row-key="chave" expandable density="compact" :sortable="false"
        empty-title="Nenhuma parcela neste recorte" empty-text="Clique de novo no cartão do topo para ver todas.">
        <template #cell-numero="{ row }">
          <div class="min-w-0">
            <p class="font-semibold text-ink tabular-nums leading-tight">{{ row.numero }}</p>
            <p class="text-micro text-ink-subtle truncate" :title="row.condicao.nome">{{ row.condicao.nome }}</p>
          </div>
        </template>
        <template #cell-vencimento="{ row }"><span class="tabular-nums text-sm">{{ fmtDate(row.vencimento) }}</span></template>
        <template #cell-valorOriginal="{ row }"><span class="tabular-nums text-sm text-ink-muted">{{ fmtMoney(row.valorOriginal) }}</span></template>
        <template #cell-recebido="{ row }">
          <span v-if="row.recebido" class="metric tabular-nums text-data-pos">{{ fmtMoney(row.recebido) }}</span>
          <span v-else class="text-ink-subtle">-</span>
        </template>
        <template #cell-ultimaBaixa="{ row }"><span class="tabular-nums text-sm">{{ fmtDate(row.ultimaBaixa) }}</span></template>
        <template #cell-saldo="{ row }">
          <span :class="['metric tabular-nums', row.situacao.chave === 'vencida' ? 'text-data-neg' : row.saldo ? 'text-ink' : 'text-ink-subtle']">
            {{ row.saldo ? fmtMoney(row.saldo) : '-' }}
          </span>
        </template>
        <template #cell-situacao="{ row }">
          <Badge size="sm" :variant="variante(row)">{{ row.situacao.rotulo }}</Badge>
        </template>

        <template #expanded="{ row }">
          <p v-if="!row.baixas.length" class="text-xs text-ink-muted">
            Nenhum pagamento nesta parcela{{ row.boleto ? ' · boleto já gerado' : '' }}.
          </p>
          <div v-else class="space-y-2">
            <p class="text-micro uppercase tracking-wide text-ink-subtle">Pagamentos e baixas</p>
            <ul class="divide-y divide-line rounded-lg border border-line">
              <li v-for="(b, i) in row.baixas" :key="i" class="px-3 py-2.5 grid grid-cols-2 sm:grid-cols-6 gap-x-4 gap-y-1 text-xs">
                <div class="col-span-2 sm:col-span-2 min-w-0">
                  <p class="font-medium text-ink flex items-center gap-1.5">
                    <i :class="b.dinheiro ? 'fas fa-circle-check text-data-pos' : 'fas fa-right-left text-ink-subtle'"></i>
                    {{ b.tipo || 'Baixa' }} em {{ fmtDate(b.data) }}
                  </p>
                  <p class="text-micro text-ink-subtle tabular-nums">
                    <template v-if="b.conta">conta {{ b.conta }}</template><template v-if="b.calculo"> · corrigido até {{ fmtDate(b.calculo) }}</template>
                  </p>
                </div>
                <div><p class="text-micro text-ink-subtle">Valor</p><p class="tabular-nums text-ink">{{ fmtMoney(b.valor) }}</p></div>
                <div><p class="text-micro text-ink-subtle">Juros + acréscimo</p><p class="tabular-nums text-ink">{{ fmtMoney(b.juros + b.acrescimo) }}</p></div>
                <div><p class="text-micro text-ink-subtle">Desconto</p><p class="tabular-nums text-ink">{{ fmtMoney(b.desconto) }}</p></div>
                <div><p class="text-micro text-ink-subtle">Líquido</p><p :class="['tabular-nums font-semibold', b.dinheiro ? 'text-data-pos' : 'text-ink']">{{ fmtMoney(b.liquido) }}</p></div>
              </li>
            </ul>
          </div>
        </template>
      </DataTable>
    </div>

    <template #footer>
      <Button variant="ghost" icon="fas fa-file-csv" :disabled="!parcelas.length" @click="exportarCsv">
        <span class="hidden sm:inline">Planilha</span>
      </Button>
      <Button variant="secondary" icon="fas fa-eye" :loading="pdfCarregando && !pdfAberto" :disabled="!props.contrato?.titulo" @click="verPdf">
        Ver PDF
      </Button>
      <Button variant="primary" icon="fas fa-download" :loading="pdfCarregando" :disabled="!props.contrato?.titulo" @click="baixarPdf">
        Baixar PDF
      </Button>
    </template>
  </Modal>

  <!-- PDF oficial, ampliado -->
  <Modal v-model:open="pdfAberto" size="screen" :padded="false" :scrollable="false" :z-index="10001">
    <template #header>
      <div class="flex items-center gap-3 min-w-0">
        <div class="min-w-0 flex-1">
          <h2 class="text-base font-semibold text-ink truncate">Extrato oficial do Sienge</h2>
          <p class="text-xs text-ink-muted mt-0.5 truncate">{{ titulo }} · {{ subtitulo }}</p>
        </div>
        <Button size="sm" variant="secondary" icon="fas fa-download" class="shrink-0" @click="baixarPdf">
          <span class="hidden sm:inline">Baixar</span>
        </Button>
      </div>
    </template>
    <iframe v-if="pdfUrl" :src="pdfUrl" title="Extrato do cliente em PDF" class="w-full h-full min-h-[70vh] border-0 bg-surface-sunken"></iframe>
  </Modal>
</template>
