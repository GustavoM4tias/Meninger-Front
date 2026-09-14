<script setup>
/**
 * LancamentoDetailModal - um lançamento por inteiro.
 *
 * Mesmo desenho dos detalhes de Pré-Cadastro e Reserva: faixa com identidade e
 * estado, blocos de campo em duas ou três colunas no largo e uma no estreito,
 * ações no rodapé. A observação, único campo editável, se edita aqui mesmo -
 * não existe um segundo modal só para ela.
 */
import { computed, ref, watch } from 'vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
  expense: { type: Object, default: null },
  visivel: { type: Boolean, default: false },
  enterpriseName: { type: String, default: '' },
  costCenterId: { type: [String, Number], default: '' },
  saving: { type: Boolean, default: false },
});
const emit = defineEmits(['fechar', 'salvar', 'excluir']);

const descricao = ref('');
watch(() => [props.visivel, props.expense?.id], ([v]) => {
  if (v) descricao.value = props.expense?.description || '';
}, { immediate: true });

const alterou = computed(() => (descricao.value || '') !== (props.expense?.description || ''));

const fmtMoney = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-';
};
const fmtDate = (d) => {
  if (!d) return '-';
  const s = String(d);
  const date = new Date(s + (s.length === 10 ? 'T12:00:00' : ''));
  return isNaN(date) ? '-' : date.toLocaleDateString('pt-BR');
};

const bill = computed(() => props.expense?.bill || null);
const fornecedor = computed(() => bill.value?.creditor_json?.tradeName || bill.value?.creditor_json?.name || '');
const departamento = computed(() => props.expense?.departmentName || bill.value?.mainDepartmentName || '');
const parcela = computed(() => (props.expense?.installmentsNumber > 1
  ? `${props.expense.installmentNumber}/${props.expense.installmentsNumber}`
  : '1/1'));
const cancelado = computed(() => props.expense?.status === 'cancelled');

const STATUS = {
  paid:      { label: 'Pago',       icon: 'fas fa-circle-check', banner: 'from-data-pos to-data-pos/60' },
  cancelled: { label: 'Cancelado',  icon: 'fas fa-ban',          banner: 'from-data-neg to-data-neg/60' },
  open:      { label: 'Em aberto',  icon: 'fas fa-clock',        banner: 'from-accent to-accent/60' },
};
const status = computed(() => STATUS[props.expense?.status] || { label: '-', icon: 'fas fa-circle', banner: 'from-accent to-accent/60' });

const financeiro = computed(() => [
  { label: 'Valor da parcela', value: fmtMoney(props.expense?.amount),
    accent: cancelado.value ? 'text-ink-subtle line-through' : 'text-data-pos' },
  { label: 'Valor do título', value: bill.value?.totalInvoiceAmount ? fmtMoney(bill.value.totalInvoiceAmount) : '-', accent: 'text-ink' },
  { label: 'Parcela', value: parcela.value, accent: 'text-ink' },
  { label: 'Situação', value: status.value.label, accent: cancelado.value ? 'text-data-neg' : 'text-ink' },
]);

const datas = computed(() => [
  { label: 'Pagamento', value: fmtDate(props.expense?.paidAt) },
  { label: 'Vencimento', value: fmtDate(props.expense?.dueDate) },
  { label: 'Emissão', value: fmtDate(bill.value?.issueDate) },
]);

const detalhes = computed(() => [
  { label: 'Empreendimento', value: props.enterpriseName ? `${props.enterpriseName} (CC ${props.costCenterId})` : `CC ${props.costCenterId}` },
  { label: 'Departamento (Sienge)', value: departamento.value || '(sem departamento)' },
  { label: 'Documento', value: bill.value ? `${bill.value.document_identification_id || ''} ${bill.value.document_number || ''}`.trim() : '' },
  { label: 'Título no Sienge', value: bill.value?.id ? `#${bill.value.id}` : '' },
  { label: 'CNPJ', value: bill.value?.creditor_json?.cnpj || '' },
  { label: 'Fornecedor (razão)', value: bill.value?.creditor_json?.name || '' },
]);
</script>

<template>
  <Modal :open="visivel" size="xl" hide-close @close="emit('fechar')">
    <template #header><div class="hidden"></div></template>

    <div v-if="expense" class="-m-4 sm:-m-5">

      <!-- Faixa: identidade e estado -->
      <div class="relative bg-gradient-to-br text-white px-5 sm:px-6 pt-5 pb-4 overflow-hidden"
        :class="status.banner">
        <div class="pointer-events-none absolute inset-0 opacity-30"
          style="background-image:radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px); background-size: 18px 18px;"></div>

        <div class="relative flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-2">
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-micro font-medium
                           bg-surface-raised/20 backdrop-blur border border-white/20 text-white">
                <i :class="status.icon" class="text-micro"></i>
                {{ status.label }}
              </span>
              <span v-if="expense.installmentsNumber > 1"
                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-micro font-semibold
                       bg-surface-raised/30 backdrop-blur border border-white/30 text-white font-mono">
                <i class="fas fa-layer-group text-micro"></i>Parcela {{ parcela }}
              </span>
              <span v-if="bill?.id" class="text-micro text-white/70 font-mono">título #{{ bill.id }}</span>
            </div>
            <h2 class="text-xl sm:text-2xl font-semibold leading-tight tracking-tight break-words">
              {{ fornecedor || (bill ? '-' : 'Sem vínculo com título') }}
            </h2>
            <p class="text-xs text-white/70 mt-1 font-mono">
              {{ fmtMoney(expense.amount) }} · pago em {{ fmtDate(expense.paidAt) }}
            </p>
          </div>

          <button type="button" @click="emit('fechar')" aria-label="Fechar"
            class="h-10 w-10 grid place-items-center rounded-lg
                   bg-surface-raised/15 hover:bg-surface-raised/25
                   text-white transition-colors duration-120 shrink-0">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      </div>

      <div class="p-4 sm:p-5 max-h-[60vh] overflow-y-auto space-y-5">

        <section>
          <div class="flex items-center gap-1.5 mb-2">
            <i class="fas fa-coins text-xs text-accent"></i>
            <h4 class="metric-label">Financeiro</h4>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div v-for="c in financeiro" :key="c.label" class="rounded-lg p-2.5 border border-line bg-surface-sunken min-w-0">
              <p class="metric-label">{{ c.label }}</p>
              <p class="text-sm font-semibold tabular-nums truncate" :class="c.accent">{{ c.value }}</p>
            </div>
          </div>
        </section>

        <section>
          <div class="flex items-center gap-1.5 mb-2">
            <i class="far fa-calendar text-xs text-accent"></i>
            <h4 class="metric-label">Datas</h4>
          </div>
          <div class="grid grid-cols-3 gap-2.5">
            <div v-for="d in datas" :key="d.label" class="rounded-lg p-2.5 border border-line bg-surface-sunken min-w-0">
              <p class="metric-label">{{ d.label }}</p>
              <p class="text-sm text-ink font-mono tabular-nums">{{ d.value }}</p>
            </div>
          </div>
        </section>

        <section>
          <div class="flex items-center gap-1.5 mb-2">
            <i class="fas fa-circle-info text-xs text-accent"></i>
            <h4 class="metric-label">Detalhes</h4>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            <div v-for="d in detalhes" :key="d.label" class="rounded-lg p-2.5 border border-line bg-surface-sunken min-w-0">
              <p class="metric-label">{{ d.label }}</p>
              <p class="text-sm text-ink truncate" :title="d.value || undefined">{{ d.value || '-' }}</p>
            </div>
          </div>
        </section>

        <section v-if="bill?.notes">
          <div class="flex items-center gap-1.5 mb-2">
            <i class="fas fa-sticky-note text-xs text-accent"></i>
            <h4 class="metric-label">Nota do título (Sienge)</h4>
          </div>
          <p class="rounded-lg p-2.5 border border-line bg-surface-sunken text-sm text-ink whitespace-pre-line break-words">
            {{ bill.notes }}
          </p>
        </section>

        <!-- Único campo que o Office grava: edita-se aqui mesmo -->
        <section>
          <div class="flex items-center gap-1.5 mb-2">
            <i class="fas fa-pen text-xs text-accent"></i>
            <h4 class="metric-label">Observação do Office</h4>
          </div>
          <label for="lanc-obs" class="sr-only">Observação</label>
          <textarea id="lanc-obs" v-model="descricao" rows="3"
            placeholder="Digite uma observação sobre este lançamento..."
            class="w-full px-3.5 py-2.5 rounded-lg border border-line bg-surface-raised text-sm text-ink
                   placeholder:text-ink-subtle resize-none focus:outline-none focus:ring-2
                   focus:ring-accent-ring/40 focus:border-accent transition-colors"></textarea>
          <p class="text-micro text-ink-subtle mt-1">
            Só a observação é gravada aqui; o resto vem do Sienge.
          </p>
        </section>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-wrap items-center gap-2 w-full">
        <Button variant="danger" size="sm" icon="fas fa-trash" @click="emit('excluir')">
          Excluir
        </Button>
        <div class="ml-auto flex items-center gap-2">
          <Button variant="ghost" @click="emit('fechar')">Fechar</Button>
          <Button variant="primary" icon="fas fa-check"
            :loading="saving" :disabled="saving || !alterou"
            @click="emit('salvar', descricao)">
            {{ saving ? 'Salvando...' : 'Salvar observação' }}
          </Button>
        </div>
      </div>
    </template>
  </Modal>
</template>
