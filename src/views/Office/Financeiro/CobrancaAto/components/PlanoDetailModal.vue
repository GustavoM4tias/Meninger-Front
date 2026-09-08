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
          <p v-else-if="det.plano.observacao" class="text-micro text-data-warn mt-1">{{ det.plano.observacao }}</p>
        </div>
        <div>
          <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Sienge</p>
          <span v-if="det.contrato" class="inline-flex flex-wrap gap-1">
            <Badge variant="neutral" size="sm">contrato {{ det.contrato.id }} · {{ det.contrato.situation }}</Badge>
            <Badge :variant="det.contrato.financial_institution_date ? 'info' : 'neutral'" size="sm">
              {{ det.contrato.financial_institution_date ? `venda faturada ${formatDate(det.contrato.financial_institution_date)}` : 'venda não faturada' }}
            </Badge>
          </span>
          <span v-else class="text-sm text-ink-subtle">sem contrato</span>
        </div>
        <div>
          <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Repasse (CV)</p>
          <span v-if="det.plano.cv_repasse_situacao" class="inline-flex flex-col items-start gap-0.5">
            <Badge :variant="det.plano.encerrado_motivo === 'repasse_contrato_emitido' ? 'info' : 'neutral'" size="sm">{{ det.plano.cv_repasse_situacao }}</Badge>
            <span class="text-micro text-ink-subtle">repasse {{ det.plano.cv_repasse_id }} · etapa {{ det.plano.cv_repasse_situacao_id }}</span>
          </span>
          <span v-else class="text-sm text-ink-subtle">{{ det.plano.sienge_verificado_em ? 'sem repasse' : 'ainda não verificado' }}</span>
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

      <!-- Alerta de cadastro: a Caixa recusou o CEP do CV, o boleto saiu com o endereço da Menin. -->
      <div v-if="det.plano.cadastro_alerta"
        class="rounded-xl border border-data-warn/30 bg-data-warn/10 p-3 text-sm text-data-warn">
        <p class="font-semibold"><i class="fas fa-location-dot mr-1"></i> CEP a corrigir no CV</p>
        <p class="text-xs mt-1">{{ det.plano.cadastro_alerta }} O alerta some sozinho quando a Caixa voltar a aceitar o endereço do cadastro.</p>
      </div>

      <!-- Divergências: o plano é CONGELADO, o CV não o altera. Isto só informa. -->
      <div v-if="det.plano.divergencias?.length"
        class="rounded-xl border border-data-warn/30 bg-data-warn/10 p-3 text-sm text-data-warn">
        <p class="font-semibold"><i class="fas fa-triangle-exclamation mr-1"></i> A condição no CV está diferente do plano</p>
        <ul class="mt-1 list-disc pl-5 text-xs">
          <li v-for="(d, i) in det.plano.divergencias" :key="i">
            <template v-if="d.tipo === 'prevista_mudou'">
              parcela {{ d.numero }}: o CV diz {{ formatCurrency(d.cv.valor) }} em {{ formatDate(d.cv.vencimento) }}
            </template>
            <template v-else-if="d.tipo === 'condicao_mudou'">
              parcela #{{ d.parcelaId }} (já com boleto): gravada {{ formatCurrency(d.atual.valor) }} em {{ formatDate(d.atual.vencimento) }},
              CV diz {{ formatCurrency(d.cv.valor) }} em {{ formatDate(d.cv.vencimento) }}
            </template>
            <template v-else-if="d.tipo === 'serie_nova'">
              o CV tem uma parcela nova ({{ formatCurrency(d.cv.valor) }} em {{ formatDate(d.cv.vencimento) }}) que não está no plano
            </template>
            <template v-else>parcela {{ d.numero }} não existe mais nas condições do CV</template>
          </li>
        </ul>
        <p class="text-xs mt-1">
          O plano foi definido no Envio Sienge e não acompanha o CV. Mudança só por administrador, aqui no Office:
          editando a parcela (lápis) ou aplicando as condições do CV de propósito.
        </p>
      </div>

      <!-- Ações do plano -->
      <div v-if="can('operate')" class="flex flex-wrap items-center gap-2">
        <Button v-if="can('configure')" variant="outline" size="sm" icon="fas fa-rotate" :loading="store.acting" @click="sincronizar">Aplicar condições do CV</Button>
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
            <!-- Botão com rótulo, não ícone: é a ação que o corretor pede
                 ("gera a nova via") e precisa ser achada de primeira. -->
            <Button v-if="reemitivel(row)" variant="primary" size="sm" icon="fas fa-rotate" :loading="store.acting" @click.stop="emitir(row)">
              Reemitir
            </Button>
            <Button v-else-if="['prevista', 'erro'].includes(row.status) && det.plano.status === 'ativo'" variant="outline" size="sm"
              icon="fas fa-file-invoice-dollar" :loading="store.acting" @click.stop="emitir(row)">
              Emitir agora
            </Button>
            <IconButton v-if="row.status === 'emitida'" icon="fas fa-ban" size="sm" label="Baixar boleto no Ecobrança" @click.stop="baixar(row)" />
            <IconButton v-if="['emitida', 'vencida'].includes(row.status)" icon="fas fa-check-double" size="sm" label="Marcar como paga" @click.stop="marcarPaga(row)" />
            <IconButton v-if="can('configure') && ['prevista', 'vencida', 'erro'].includes(row.status)" icon="fas fa-pen-to-square" size="sm"
              label="Editar valor ou vencimento (admin)" @click.stop="abrirEdicao(row)" />
          </span>
        </template>
      </DataTable>

      <p class="text-micro text-ink-subtle">
        O plano é definido no Envio Sienge e não muda pelo CV; só administrador altera, aqui.
        A rodada diária emite cada parcela com a antecedência configurada. Parcela vencida recebe aviso (a reserva pode ser cancelada);
        a nova via sai quando o cliente responde SIM no WhatsApp ou pelo botão Reemitir, sempre com o mesmo valor e vencimento no próximo dia útil.
        Quando a venda é faturada no Sienge, ou o repasse no CV chega a “Contrato Emitido CAIXA”, o plano encerra sozinho e o ERP passa a cobrar. Título gerado no Sienge não encerra.
      </p>
    </div>

    <!-- Edição de parcela (admin): valor e vencimento originais -->
    <Modal :open="edicao.open" title="Editar parcela" :subtitle="edicao.row ? `Parcela ${edicao.row.numero}/${edicao.row.total}` : ''" size="sm" :z-index="10050" @close="edicao.open = false">
      <div class="space-y-3">
        <p class="text-sm text-ink-muted">Isto muda o que o Office vai cobrar nesta parcela. O CV não é alterado.</p>
        <Input v-model.number="edicao.valor" type="number" step="0.01" label="Valor (R$)" />
        <Input v-model="edicao.vencimento" type="date" label="Vencimento" />
        <Input v-model="edicao.motivo" label="Motivo" placeholder="Ex.: acordo com o cliente em 07/09" />
        <p v-if="edicao.erro" class="text-sm text-data-neg">{{ edicao.erro }}</p>
        <div class="flex justify-end gap-2">
          <Button variant="ghost" size="sm" @click="edicao.open = false">Cancelar</Button>
          <Button size="sm" icon="fas fa-check" :loading="store.acting" :disabled="!edicao.motivo || edicao.motivo.length < 5" @click="salvarEdicao">Salvar</Button>
        </div>
      </div>
    </Modal>

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
import Input from '@/components/UI/Input.vue';
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
  const n = (det.value?.plano?.divergencias || []).length;
  if (!await pedirConfirmacao({
    title: 'Aplicar as condições atuais do CV neste plano?',
    consequence: `O plano é congelado no Envio Sienge; isto é a exceção. As parcelas ainda sem boleto passam a seguir o CV (${n} diferença${n === 1 ? '' : 's'} registrada${n === 1 ? '' : 's'}). Parcelas com boleto emitido não mudam.`,
    confirmLabel: 'Aplicar CV', tone: 'primary',
  })) return;
  try { await store.sincronizar(props.idreserva); recarregar(); } catch { /* actionError já mostra */ }
}

// ── Edição de parcela (admin) ─────────────────────────────────────────────────
const edicao = ref({ open: false, row: null, valor: null, vencimento: '', motivo: '', erro: null });
function abrirEdicao(row) {
  edicao.value = { open: true, row, valor: Number(row.valor), vencimento: String(row.vencimento).slice(0, 10), motivo: '', erro: null };
}
async function salvarEdicao() {
  edicao.value.erro = null;
  try {
    await store.editarParcela(edicao.value.row.id, { valor: edicao.value.valor, vencimento: edicao.value.vencimento, motivo: edicao.value.motivo });
    edicao.value.open = false;
    recarregar();
  } catch (e) {
    edicao.value.erro = e.message || 'Falha ao editar.';
  }
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
/* Reemitir: parcela vencida (boleto já baixado) ou boleto vivo que passou do
   vencimento (a rodada das 08h ainda não baixou). No segundo caso a emissão
   baixa o boleto antigo antes de gerar o novo. */
const reemitivel = (row) => det.value?.plano?.status === 'ativo'
  && (row.status === 'vencida' || (row.status === 'emitida' && row.vencimento_cobrado && row.vencimento_cobrado < det.value.hoje));

async function emitir(row) {
  const reemissao = row.status === 'vencida' || row.status === 'emitida';
  if (!await pedirConfirmacao({
    title: `${reemissao ? 'Reemitir' : 'Emitir'} o boleto da parcela ${row.numero}/${row.total}?`,
    consequence: reemissao
      ? `Gera uma nova via de ${formatCurrency(row.valor)} com vencimento no próximo dia útil e envia ao cliente por e-mail e WhatsApp${row.status === 'emitida' ? '. O boleto vencido é baixado no Ecobrança antes' : ''}.`
      : `Emite agora o boleto de ${formatCurrency(row.valor)} com vencimento ${formatDate(row.vencimento)}${row.vencimento < det.value.hoje ? ' (já vencido: sai com vencimento no próximo dia útil)' : ''} e envia ao cliente por e-mail e WhatsApp.`,
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
