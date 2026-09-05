<!--
  Detalhe do plano de parcelas de uma reserva: cabeçalho (reserva, titular,
  empreendimento, situação, Sienge), ações do plano e a lista parcela a parcela
  com o boleto atual de cada uma. Abrir um boleto reaproveita o modal do Ato
  (BoletoDetailModal), que já sabe mostrar PDF, linha do tempo e reenvio.
-->
<template>
  <Modal :open="open" size="xl" :title="titulo" :subtitle="subtitulo" @close="$emit('close')">
    <div v-if="store.detalheError" class="rounded-xl border border-data-neg/25 bg-data-neg/10 p-4 text-sm text-data-neg">
      {{ store.detalheError }}
    </div>
    <div v-else-if="store.detalheLoading && !det" class="space-y-3">
      <Skeleton variant="stat" /><Skeleton variant="table" :lines="6" />
    </div>

    <div v-else-if="det" class="space-y-4">

      <!-- Cabeçalho -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Plano</p>
          <Badge :variant="planoVariant(det.plano.status)" size="sm">{{ planoLabel(det.plano.status) }}</Badge>
          <p v-if="det.plano.encerrado_motivo" class="text-micro text-ink-muted mt-1">
            {{ motivoLabel(det.plano.encerrado_motivo) }}<span v-if="det.plano.encerrado_detalhe"> · {{ det.plano.encerrado_detalhe }}</span>
          </p>
        </div>
        <div>
          <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Sienge</p>
          <Badge v-if="det.contrato?.receivable_bill_id" variant="info" size="sm">faturado (título {{ det.contrato.receivable_bill_id }})</Badge>
          <Badge v-else-if="det.contrato" variant="neutral" size="sm">contrato {{ det.contrato.id }} · {{ det.contrato.situation }}</Badge>
          <span v-else class="text-sm text-ink-subtle">sem contrato</span>
        </div>
        <div>
          <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Pagas</p>
          <p class="text-sm text-ink tabular-nums">{{ resumo.pagas }} de {{ resumo.total }} · {{ formatCurrency(resumo.valorPago) }}</p>
        </div>
        <div>
          <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Em atraso</p>
          <p class="text-sm tabular-nums" :class="resumo.atraso ? 'text-data-neg' : 'text-ink'">
            {{ resumo.atraso }} parcela{{ resumo.atraso === 1 ? '' : 's' }} · {{ formatCurrency(resumo.valorAtraso) }}
          </p>
        </div>
      </div>

      <!-- Divergências (condição mudou no CV depois de emitir) -->
      <div v-if="det.plano.divergencias?.length"
        class="rounded-xl border border-data-warn/30 bg-data-warn/10 p-3 text-sm text-data-warn">
        <p class="font-semibold"><i class="fas fa-triangle-exclamation mr-1"></i> A condição mudou no CV depois de parcela emitida</p>
        <ul class="mt-1 list-disc pl-5 text-xs">
          <li v-for="(d, i) in det.plano.divergencias" :key="i">
            <template v-if="d.tipo === 'condicao_mudou'">
              parcela #{{ d.parcelaId }}: gravada {{ formatCurrency(d.atual.valor) }} em {{ formatDate(d.atual.vencimento) }},
              CV diz {{ formatCurrency(d.cv.valor) }} em {{ formatDate(d.cv.vencimento) }}
            </template>
            <template v-else>parcela {{ d.numero }} (#{{ d.parcelaId }}) já emitida não existe mais nas condições do CV</template>
          </li>
        </ul>
        <p class="text-xs mt-1">Boleto já emitido não muda sozinho. Se precisar, baixe o boleto da parcela e emita de novo.</p>
      </div>

      <!-- Ações do plano -->
      <div v-if="can('operate')" class="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" icon="fas fa-rotate" :loading="store.acting" @click="sincronizar">Sincronizar com o CV</Button>
        <Button v-if="det.plano.status === 'ativo'" variant="outline" size="sm" icon="fas fa-pause" :loading="store.acting" @click="pausar">Pausar</Button>
        <Button v-if="det.plano.status === 'pausado' || (det.plano.status === 'encerrado' && det.plano.encerrado_motivo === 'manual')"
          variant="outline" size="sm" icon="fas fa-play" :loading="store.acting" @click="reativar">Reativar</Button>
        <Button v-if="['ativo', 'pausado'].includes(det.plano.status)" variant="danger" size="sm" icon="fas fa-stop" :loading="store.acting" @click="encerrar">Encerrar plano</Button>
        <a :href="cvLink" target="_blank" rel="noopener" class="ml-auto text-xs text-accent hover:underline">
          Abrir reserva no CV <i class="fas fa-arrow-up-right-from-square" style="font-size:10px"></i>
        </a>
      </div>
      <p v-if="store.actionError" class="text-sm text-data-neg">{{ store.actionError }}</p>

      <!-- Parcelas -->
      <DataTable :columns="COLS" :rows="det.parcelas" row-key="id" density="compact" :sortable="false"
        more-label="Ver detalhes" empty-title="Sem parcelas" empty-text="O CV não trouxe série mensal para esta reserva.">
        <template #cell-numero="{ row }">
          <span class="font-mono tabular-nums text-ink">{{ row.numero }}/{{ row.total }}</span>
        </template>
        <template #cell-vencimento="{ row }">
          <span class="block">
            <span class="text-ink">{{ formatDate(row.vencimento) }}</span>
            <span v-if="row.vencimento_cobrado && row.vencimento_cobrado !== row.vencimento" class="block text-micro text-ink-subtle">
              boleto: {{ formatDate(row.vencimento_cobrado) }}
            </span>
          </span>
        </template>
        <template #cell-valor="{ row }">
          <span class="block">
            <span class="metric text-sm">{{ formatCurrency(row.valor_cobrado || row.valor) }}</span>
            <span v-if="Number(row.encargos_valor) > 0" class="block text-micro text-data-warn">
              inclui {{ formatCurrency(row.encargos_valor) }} de encargos
            </span>
          </span>
        </template>
        <template #cell-status="{ row }">
          <span class="inline-flex flex-col items-start gap-0.5">
            <Badge :variant="parcelaVariant(row.status)" size="sm">{{ parcelaLabel(row.status) }}</Badge>
            <span v-if="row.status === 'emitida' && row.vencimento_cobrado < det.hoje" class="text-micro text-data-neg">venceu {{ diasLabel(row.vencimento_cobrado) }}</span>
            <span v-else-if="row.status === 'prevista' && row.vencimento < det.hoje" class="text-micro text-data-neg">venceu {{ diasLabel(row.vencimento) }} · nunca cobrada</span>
            <span v-else-if="row.status === 'paga' && row.pago_em" class="text-micro text-ink-subtle">{{ formatDate(row.pago_em) }}</span>
            <span v-else-if="row.status === 'erro'" class="text-micro text-data-neg truncate max-w-[14rem]" :title="row.erro_mensagem">{{ row.erro_mensagem }}</span>
            <span v-else-if="row.emissoes > 1" class="text-micro text-ink-subtle">{{ row.emissoes }}ª via</span>
          </span>
        </template>
        <template #cell-boleto="{ row }">
          <button v-if="boletoDe(row)" type="button" class="text-xs font-mono text-accent hover:underline" @click.stop="abrirBoleto(row)">
            {{ boletoDe(row).nosso_numero || `#${boletoDe(row).id}` }}
          </button>
          <span v-else class="text-ink-subtle">-</span>
        </template>
        <template #actions="{ row }">
          <span v-if="can('operate')" class="inline-flex items-center gap-1">
            <IconButton v-if="['prevista', 'vencida', 'erro'].includes(row.status) && det.plano.status === 'ativo'"
              icon="fas fa-file-invoice-dollar" size="sm" :label="row.status === 'vencida' ? 'Reemitir boleto' : 'Emitir boleto agora'"
              @click.stop="emitir(row)" />
            <IconButton v-if="row.status === 'emitida'" icon="fas fa-ban" size="sm" label="Baixar boleto no Ecobrança" @click.stop="baixar(row)" />
            <IconButton v-if="['emitida', 'vencida'].includes(row.status)" icon="fas fa-check-double" size="sm" label="Marcar como paga" @click.stop="marcarPaga(row)" />
          </span>
        </template>
      </DataTable>

      <p class="text-micro text-ink-subtle">
        A rodada diária emite cada parcela com a antecedência configurada e reemite as vencidas com multa e juros.
        Quando o Sienge fatura o contrato, o plano encerra sozinho e o ERP passa a cobrar.
      </p>
    </div>

    <!-- Boleto da parcela: o mesmo modal do Ato, por cima deste. -->
    <BoletoDetailModal :open="boletoModal.open" :item="boletoModal.item" :z-index="10050"
      @close="boletoModal = { open: false, item: null }" @changed="recarregar" />
  </Modal>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useParcelasStore } from '@/stores/Financeiro/CobrancaAto/parcelasStore';
import { useCan } from '@/composables/useCan';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { pedirConfirmacao } from '@/composables/useConfirm';
import Modal from '@/components/UI/Modal.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import BoletoDetailModal from './BoletoDetailModal.vue';
import { planoLabel, planoVariant, motivoLabel, parcelaLabel, parcelaVariant, formatCurrency, formatDate, diasLabel } from './parcelasFormat';

const props = defineProps({
  open: { type: Boolean, default: false },
  idreserva: { type: Number, default: null },
});
const emit = defineEmits(['close', 'changed']);

const store = useParcelasStore();
const can = useCan('/financeiro/cobranca/ato');

const det = computed(() => (props.open && store.detalhe?.plano?.idreserva === props.idreserva ? store.detalhe : null));
const titulo = computed(() => (det.value ? `Parcelas da reserva #${det.value.plano.idreserva}` : 'Parcelas'));
const subtitulo = computed(() => (det.value
  ? [det.value.plano.titular_nome, det.value.plano.empreendimento, det.value.plano.unidade].filter(Boolean).join(' · ')
  : ''));
const cvLink = computed(() => `https://menin.cvcrm.com.br/gestor/comercial/reservas/${props.idreserva}/administrar#index_condicao_pagamento`);

const resumo = computed(() => {
  const ps = det.value?.parcelas || [];
  const hoje = det.value?.hoje;
  const atrasadas = ps.filter(p => p.status === 'vencida'
    || (p.status === 'emitida' && p.vencimento_cobrado < hoje)
    || (['prevista', 'erro'].includes(p.status) && p.vencimento < hoje));
  return {
    total: ps.length,
    pagas: ps.filter(p => p.status === 'paga').length,
    valorPago: ps.filter(p => p.status === 'paga').reduce((s, p) => s + Number(p.valor_cobrado || p.valor), 0),
    atraso: atrasadas.length,
    valorAtraso: atrasadas.reduce((s, p) => s + Number(p.valor_cobrado || p.valor), 0),
  };
});

const COLS = [
  { key: 'numero', label: 'Parcela', priority: 1, width: '6rem' },
  { key: 'vencimento', label: 'Vencimento', priority: 1, width: '8rem' },
  { key: 'valor', label: 'Valor', priority: 1, numeric: true, width: '9rem' },
  { key: 'status', label: 'Situação', priority: 1, width: '11rem' },
  { key: 'boleto', label: 'Boleto', priority: 2, width: '10rem' },
];

const boletoDe = (row) => (row.boleto_history_id ? (det.value?.boletos || []).find(b => b.id === row.boleto_history_id) : null);

/* Polling curto depois de ações assíncronas (emissão roda em background). */
let timer = null;
function pararPolling() { if (timer) { clearInterval(timer); timer = null; } }
function acompanhar(ms = 90000) {
  pararPolling();
  const fim = Date.now() + ms;
  timer = setInterval(async () => {
    await store.fetchDetalhe(props.idreserva, { silent: true });
    if (Date.now() > fim) pararPolling();
  }, 5000);
}
function recarregar() { store.fetchDetalhe(props.idreserva, { silent: true }); emit('changed'); }

watch(() => [props.open, props.idreserva], ([open, id]) => {
  pararPolling();
  if (open && id) store.fetchDetalhe(id);
}, { immediate: true });
onUnmounted(pararPolling);

async function sincronizar() {
  try { await store.sincronizar(props.idreserva); recarregar(); } catch { /* actionError já mostra */ }
}
async function pausar() {
  if (!await pedirConfirmacao({ title: `Pausar o plano da reserva #${props.idreserva}?`, consequence: 'A rodada diária deixa de emitir e reemitir parcelas desta reserva até você reativar. Boletos já emitidos continuam valendo e sendo conferidos.', confirmLabel: 'Pausar', tone: 'primary' })) return;
  try { await store.pausar(props.idreserva); recarregar(); } catch { /* */ }
}
async function reativar() {
  try { await store.reativar(props.idreserva); recarregar(); } catch { /* */ }
}
async function encerrar() {
  const motivo = await pedirConfirmacao({
    title: `Encerrar o plano da reserva #${props.idreserva}?`,
    consequence: `As ${det.value.parcelas.filter(p => ['prevista', 'vencida', 'erro'].includes(p.status)).length} parcelas ainda não pagas deixam de ser cobradas pelo Office e os boletos em aberto são baixados no Ecobrança. Só dá para reabrir pela tela se for encerramento manual.`,
    confirmLabel: 'Encerrar plano', askNote: true,
  });
  if (!motivo) return;
  try { await store.encerrar(props.idreserva, motivo); acompanhar(30000); recarregar(); } catch { /* */ }
}
async function emitir(row) {
  const reemissao = row.status === 'vencida';
  if (!await pedirConfirmacao({
    title: `${reemissao ? 'Reemitir' : 'Emitir'} o boleto da parcela ${row.numero}/${row.total}?`,
    consequence: reemissao
      ? `Gera uma nova via com multa e juros (se configurado) e vencimento em alguns dias, e envia ao cliente por e-mail e WhatsApp. Valor base ${formatCurrency(row.valor)}.`
      : `Emite agora o boleto de ${formatCurrency(row.valor)} com vencimento ${formatDate(row.vencimento)}${row.vencimento < det.value.hoje ? ' (já vencido: sai com vencimento novo, sem encargos)' : ''} e envia ao cliente por e-mail e WhatsApp.`,
    confirmLabel: reemissao ? 'Reemitir' : 'Emitir agora', tone: 'primary',
  })) return;
  try { await store.emitirParcela(row.id); acompanhar(); } catch { /* */ }
}
async function baixar(row) {
  if (!await pedirConfirmacao({ title: `Baixar o boleto da parcela ${row.numero}/${row.total}?`, consequence: 'O boleto deixa de poder ser pago (baixa por devolução no Ecobrança). A parcela volta para "vencida" e a rodada pode reemitir.', confirmLabel: 'Baixar boleto' })) return;
  try { await store.baixarParcela(row.id); recarregar(); } catch { /* */ }
}
async function marcarPaga(row) {
  const nota = await pedirConfirmacao({ title: `Marcar a parcela ${row.numero}/${row.total} como paga?`, consequence: 'Use só quando o pagamento foi confirmado por outro meio (comprovante, extrato). O boleto em aberto é marcado como pago no Office, não no banco.', confirmLabel: 'Marcar como paga', tone: 'primary', askNote: true });
  if (!nota) return;
  try { await store.marcarPaga(row.id, nota); recarregar(); } catch { /* */ }
}

// ── Boleto da parcela no modal do Ato ─────────────────────────────────────────
const boletoModal = ref({ open: false, item: null });
async function abrirBoleto(row) {
  const b = boletoDe(row);
  if (!b) return;
  try {
    const item = await requestWithAuth(`/boleto-caixa/history/${b.id}`);
    boletoModal.value = { open: true, item: { ...item, forma: 'boleto' } };
  } catch (e) {
    store.actionError = e.message || 'Falha ao abrir o boleto.';
  }
}
</script>
