<script setup>
// Ajuste contábil de um contrato (máscara sobre o dado do Sienge).
//
// O MESMO formulário atende os dois pontos de entrada:
//   • modal de detalhe da venda — já chega com o contrato (e, quando o admin
//     clicou numa série, com ela pré-selecionada);
//   • engrenagem → Ajustes contábeis — chega vazio e busca o contrato.
//
// Nada é gravado em `contracts`: a correção vive numa tabela própria e é
// aplicada na leitura, no servidor. Por isso o formulário sempre recarrega o
// contrato do backend antes de salvar - o que ele mostra como "hoje" é o dado
// já mascarado, e é sobre ele que o antes/depois é montado.
import { ref, computed, watch } from 'vue';
import { useContractAdjustmentsStore, ADJ_TYPE_LABEL } from '@/stores/Comercial/Contracts/contractAdjustmentsStore';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  // Contrato já conhecido (entrada pelo detalhe da venda)
  contractId: { type: [String, Number], default: null },
  // Série pré-selecionada para edição
  initialTargetIndex: { type: Number, default: null },
  initialType: { type: String, default: '' },
  // Ajuste existente sendo editado (entrada pela lista da engrenagem)
  editing: { type: Object, default: null },
});
const emit = defineEmits(['close', 'saved']);

const store = useContractAdjustmentsStore();

const typeOptions = [
  { value: 'FI_DATE', label: 'Data da inst. financeira', icon: 'far fa-calendar-check' },
  { value: 'SERIE_ADD', label: 'Adicionar série', icon: 'fas fa-circle-plus' },
  { value: 'SERIE_EDIT', label: 'Editar série', icon: 'fas fa-pen' },
];

const type = ref('FI_DATE');
const reason = ref('');
const contract = ref(null);
const loadingContract = ref(false);
const loadError = ref('');
const saveError = ref('');
const divergenceWarning = ref(0);

// Busca de contrato (só quando o modal abre sem contrato definido)
const searchTerm = ref('');
const searchResults = ref([]);
const searching = ref(false);

// Campos do formulário
const newDate = ref('');
const serieCode = ref('');
const serieName = ref('');
const serieValue = ref('');
const serieInstallments = ref('');
const serieBaseDate = ref('');
const targetIndex = ref(null);

const isEditingExisting = computed(() => !!props.editing?.id);

const conditions = computed(() =>
  Array.isArray(contract.value?.payment_conditions) ? contract.value.payment_conditions : []
);

const readCondition = (pc) => ({
  code: pc?.condition_type_id ?? pc?.conditionTypeId ?? '',
  name: pc?.condition_type_name ?? pc?.conditionTypeName ?? '',
  value: Number(pc?.total_value ?? pc?.totalValue ?? 0),
  installments: pc?.installments_number ?? pc?.installmentsNumber ?? null,
  baseDate: pc?.base_date ?? pc?.baseDate ?? null,
  adjusted: pc?._adjusted ?? null,
});

const formatCurrency = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const formatDate = (d) => {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split('-');
  return y && m && day ? `${day}/${m}/${y}` : s;
};

const resetForm = () => {
  reason.value = '';
  newDate.value = '';
  serieCode.value = '';
  serieName.value = '';
  serieValue.value = '';
  serieInstallments.value = '';
  serieBaseDate.value = '';
  targetIndex.value = null;
  saveError.value = '';
  divergenceWarning.value = 0;
};

const loadContract = async (id) => {
  if (!id) return;
  loadingContract.value = true;
  loadError.value = '';
  try {
    contract.value = await store.fetchContract(id);
  } catch (e) {
    contract.value = null;
    loadError.value = e.message || 'Não foi possível carregar o contrato.';
  } finally {
    loadingContract.value = false;
  }
};

// Prefill quando o modal abre.
watch(() => props.open, async (isOpen) => {
  if (!isOpen) return;

  resetForm();
  searchTerm.value = '';
  searchResults.value = [];
  contract.value = null;

  const cid = props.editing?.contract_id ?? props.contractId;
  type.value = props.editing?.type || props.initialType || 'FI_DATE';

  if (cid) await loadContract(cid);

  if (isEditingExisting.value) {
    const p = props.editing.payload || {};
    reason.value = props.editing.reason || '';
    targetIndex.value = props.editing.target_index ?? null;
    newDate.value = p.financial_institution_date || '';
    serieCode.value = p.condition_type_id || '';
    serieName.value = p.condition_type_name || '';
    serieValue.value = p.total_value != null ? String(p.total_value) : '';
    serieInstallments.value = p.installments_number != null ? String(p.installments_number) : '';
    serieBaseDate.value = p.base_date || '';
    return;
  }

  if (props.initialTargetIndex != null) {
    targetIndex.value = props.initialTargetIndex;
    prefillFromCondition(props.initialTargetIndex);
  }
  if (type.value === 'FI_DATE') {
    newDate.value = String(contract.value?.financial_institution_date ?? '').slice(0, 10);
  }
});

// Trocar de tipo limpa o que não pertence ao tipo novo (mesmo padrão das
// outras abas da engrenagem: formulário nunca carrega resto de outro fluxo).
watch(type, (t) => {
  if (isEditingExisting.value) return;
  saveError.value = '';
  if (t === 'FI_DATE') {
    newDate.value = String(contract.value?.financial_institution_date ?? '').slice(0, 10);
    targetIndex.value = null;
  } else if (t === 'SERIE_ADD') {
    targetIndex.value = null;
    serieCode.value = '';
    serieName.value = '';
    serieValue.value = '';
    serieInstallments.value = '';
    serieBaseDate.value = '';
  }
});

function prefillFromCondition(idx) {
  const pc = conditions.value[idx];
  if (!pc) return;
  const c = readCondition(pc);
  serieCode.value = c.code || '';
  serieName.value = c.name || '';
  serieValue.value = c.value != null ? String(c.value) : '';
  serieInstallments.value = c.installments != null ? String(c.installments) : '';
  serieBaseDate.value = c.baseDate ? String(c.baseDate).slice(0, 10) : '';
}

const selectCondition = (idx) => {
  targetIndex.value = idx;
  prefillFromCondition(idx);
};

const runSearch = async () => {
  const q = searchTerm.value.trim();
  if (q.length < 2) { searchResults.value = []; return; }
  searching.value = true;
  try {
    searchResults.value = await store.searchContracts(q);
  } catch (e) {
    loadError.value = e.message;
  } finally {
    searching.value = false;
  }
};

const pickContract = async (row) => {
  searchResults.value = [];
  searchTerm.value = '';
  await loadContract(row.contract_id);
  if (type.value === 'FI_DATE') {
    newDate.value = String(contract.value?.financial_institution_date ?? '').slice(0, 10);
  }
};

// Antes/depois, para o admin conferir o que vai mudar antes de gravar.
const preview = computed(() => {
  if (!contract.value) return null;
  if (type.value === 'FI_DATE') {
    return {
      label: 'Data da instituição financeira',
      before: formatDate(contract.value.financial_institution_date),
      after: newDate.value ? formatDate(newDate.value) : '—',
    };
  }
  if (type.value === 'SERIE_ADD') {
    return {
      label: `Nova série ${serieCode.value || '—'}`,
      before: 'não existe no contrato',
      after: formatCurrency(serieValue.value),
    };
  }
  if (targetIndex.value == null) return null;
  const c = readCondition(conditions.value[targetIndex.value] || {});
  return {
    label: `Série ${c.code || '—'}`,
    before: formatCurrency(c.value),
    after: serieValue.value !== '' ? formatCurrency(serieValue.value) : formatCurrency(c.value),
  };
});

const canSave = computed(() => {
  if (!contract.value || reason.value.trim().length < 3) return false;
  if (type.value === 'FI_DATE') return /^\d{4}-\d{2}-\d{2}$/.test(newDate.value);
  if (type.value === 'SERIE_ADD') return !!serieCode.value.trim() && serieValue.value !== '';
  return targetIndex.value != null && (
    serieValue.value !== '' || !!serieCode.value.trim() || !!serieName.value.trim() ||
    serieInstallments.value !== '' || !!serieBaseDate.value
  );
});

const buildPayload = () => {
  if (type.value === 'FI_DATE') return { financial_institution_date: newDate.value };
  return {
    condition_type_id: serieCode.value.trim() || null,
    condition_type_name: serieName.value.trim() || null,
    total_value: serieValue.value !== '' ? serieValue.value : null,
    installments_number: serieInstallments.value !== '' ? serieInstallments.value : null,
    base_date: serieBaseDate.value || null,
  };
};

const save = async () => {
  saveError.value = '';
  divergenceWarning.value = 0;
  try {
    let saved;
    if (isEditingExisting.value) {
      saved = await store.updateItem(props.editing.id, {
        payload: buildPayload(),
        reason: reason.value.trim(),
      });
    } else {
      const targetCode = type.value === 'SERIE_EDIT'
        ? readCondition(conditions.value[targetIndex.value] || {}).code
        : null;
      saved = await store.createItem({
        contract_id: String(contract.value.contract_id),
        type: type.value,
        target_index: type.value === 'SERIE_EDIT' ? targetIndex.value : null,
        target_code: targetCode,
        payload: buildPayload(),
        reason: reason.value.trim(),
      });
    }

    // Mês já consolidado: a divergência foi registrada agora e os admins
    // notificados. O consolidado NÃO muda sozinho.
    divergenceWarning.value = Number(saved?.new_divergences) || 0;
    emit('saved', { adjustment: saved, divergences: divergenceWarning.value });
    if (!divergenceWarning.value) emit('close');
  } catch (e) {
    saveError.value = e.message || 'Erro ao salvar o ajuste.';
  }
};
</script>

<template>
  <Modal :open="open" size="lg" :title="isEditingExisting ? 'Editar ajuste contábil' : 'Ajuste contábil'"
    subtitle="Corrige o dado do contrato só para o relatório. O Sienge não é alterado."
    :z-index="10050" @close="emit('close')">

    <div class="space-y-4">

      <!-- Busca de contrato (entrada pela engrenagem) -->
      <div v-if="!contract && !loadingContract" class="space-y-3">
        <Input v-model="searchTerm" label="Contrato" size="sm" icon-left="fas fa-magnifying-glass"
          placeholder="Nº do contrato, nome do cliente ou unidade" @keyup.enter="runSearch" />
        <Button variant="outline" size="sm" icon="fas fa-magnifying-glass" :disabled="searching"
          @click="runSearch">Buscar</Button>

        <div v-if="searching" class="py-6 flex justify-center"><Spinner size="sm" /></div>

        <div v-else-if="searchResults.length" class="space-y-1.5 max-h-72 overflow-y-auto">
          <button v-for="row in searchResults" :key="row.contract_id" type="button"
            class="w-full text-left rounded-lg border border-line bg-surface-raised px-3 py-2 hover:border-accent/40 transition-colors"
            @click="pickContract(row)">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="text-sm font-medium text-ink truncate">{{ row.customer_name || '—' }}</span>
              <span class="text-[11px] font-mono text-ink-subtle">#{{ row.contract_id }}</span>
            </div>
            <div class="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-ink-muted font-mono">
              <span>{{ row.unit_name || '—' }}</span>
              <span>{{ formatDate(row.financial_institution_date) }}</span>
              <span class="truncate max-w-[220px]">{{ row.enterprise_name || '—' }}</span>
            </div>
          </button>
        </div>

        <EmptyState v-else-if="searchTerm.trim().length >= 2" icon="fas fa-file-invoice"
          title="Nenhum contrato encontrado" description="Confira o número, o nome do cliente ou a unidade." />
      </div>

      <div v-if="loadingContract" class="py-10 flex justify-center"><Spinner size="lg" /></div>

      <p v-if="loadError" class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
        {{ loadError }}
      </p>

      <template v-if="contract && !loadingContract">
        <!-- Cabeçalho do contrato -->
        <div class="rounded-xl border border-line bg-surface-sunken p-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <span class="text-sm font-semibold text-ink truncate">{{ contract.customer_name || '—' }}</span>
            <span class="text-[11px] font-mono text-ink-subtle">Contrato #{{ contract.contract_id }}</span>
          </div>
          <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-muted font-mono">
            <span><i class="fas fa-hashtag text-[9px] mr-1"></i>{{ contract.unit_name || '—' }}</span>
            <span><i class="far fa-calendar text-[9px] mr-1"></i>{{ formatDate(contract.financial_institution_date) }}</span>
            <span class="truncate max-w-[240px]"><i class="fas fa-building text-[9px] mr-1"></i>{{ contract.enterprise_name || '—' }}</span>
          </div>
        </div>

        <!-- Tipo de ajuste -->
        <div v-if="!isEditingExisting">
          <p class="text-xs font-medium text-ink-muted mb-1.5">O que precisa ser corrigido?</p>
          <SegmentedControl v-model="type" :options="typeOptions" size="sm" class="overflow-x-auto" />
        </div>
        <div v-else class="flex items-center gap-2">
          <Badge variant="accent" size="sm">{{ ADJ_TYPE_LABEL[type] || type }}</Badge>
          <span class="text-[11px] text-ink-subtle">Para trocar o tipo, remova este ajuste e crie outro.</span>
        </div>

        <!-- FI_DATE -->
        <div v-if="type === 'FI_DATE'" class="space-y-2">
          <Input v-model="newDate" type="date" size="sm" label="Nova data da instituição financeira" required />
          <p class="text-[11px] text-ink-subtle leading-tight">
            Esta data é o recorte do período: mudá-la MOVE a venda de mês no dashboard.
          </p>
        </div>

        <!-- SERIE_EDIT: escolher a série -->
        <div v-if="type === 'SERIE_EDIT' && !isEditingExisting" class="space-y-2">
          <p class="text-xs font-medium text-ink-muted">Qual série será editada?</p>
          <EmptyState v-if="!conditions.length" icon="fas fa-layer-group"
            title="Contrato sem condições de pagamento" description="Use 'Adicionar série' para incluir uma." />
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button v-for="(pc, idx) in conditions" :key="`${idx}-${readCondition(pc).code}`" type="button"
              class="text-left rounded-lg border px-3 py-2 transition-colors"
              :class="targetIndex === idx
                ? 'border-accent bg-accent-soft'
                : 'border-line bg-surface-raised hover:border-accent/40'"
              @click="selectCondition(idx)">
              <div class="flex items-center gap-1.5 flex-wrap text-xs font-medium text-ink">
                <span class="truncate">{{ readCondition(pc).name || 'Não informado' }}</span>
                <Badge v-if="readCondition(pc).adjusted === 'added'" variant="info" size="sm">Adicionada</Badge>
                <Badge v-else-if="readCondition(pc).adjusted === 'edited'" variant="info" size="sm">Editada</Badge>
              </div>
              <div class="text-sm font-semibold tabular-nums text-ink mt-0.5">
                {{ formatCurrency(readCondition(pc).value) }}
              </div>
              <div class="text-[10px] font-mono text-ink-subtle">Cód: {{ readCondition(pc).code || '—' }}</div>
            </button>
          </div>
        </div>

        <!-- Campos da série -->
        <div v-if="type === 'SERIE_ADD' || (type === 'SERIE_EDIT' && targetIndex !== null)"
          class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="serieCode" size="sm" label="Código da série"
            :required="type === 'SERIE_ADD'" placeholder="Ex.: PM, AT, TR" />
          <Input v-model="serieName" size="sm" label="Descrição" placeholder="Ex.: Parcela mensal" />
          <Input v-model="serieValue" type="number" step="0.01" size="sm" label="Valor total"
            :required="type === 'SERIE_ADD'" placeholder="0,00" />
          <Input v-model="serieInstallments" type="number" size="sm" label="Parcelas" placeholder="1" />
          <Input v-model="serieBaseDate" type="date" size="sm" label="Data base" class="sm:col-span-2" />
          <p v-if="type === 'SERIE_EDIT'" class="sm:col-span-2 text-[11px] text-ink-subtle leading-tight">
            Campo em branco mantém o valor que veio do Sienge.
          </p>
        </div>

        <!-- Antes / depois -->
        <div v-if="preview" class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p class="text-[11px] font-medium text-amber-700 dark:text-amber-400 mb-1">{{ preview.label }}</p>
          <div class="flex items-center gap-2 text-sm flex-wrap">
            <span class="text-ink-muted line-through tabular-nums">{{ preview.before }}</span>
            <i class="fas fa-arrow-right text-[10px] text-ink-subtle"></i>
            <span class="font-semibold text-ink tabular-nums">{{ preview.after }}</span>
          </div>
        </div>

        <!-- Motivo -->
        <div>
          <label class="block text-xs font-medium text-ink-muted mb-1">
            Motivo contábil <span class="text-red-500">*</span>
          </label>
          <textarea v-model="reason" rows="2"
            class="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-ink
                   placeholder:text-ink-subtle focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
            placeholder="Ex.: contrato assinado em 05/07, lançado no Sienge com data de junho"></textarea>
          <p class="text-[11px] text-ink-subtle mt-1">Fica registrado com seu nome e aparece na auditoria do ajuste.</p>
        </div>

        <p v-if="saveError"
          class="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {{ saveError }}
        </p>

        <p v-if="divergenceWarning > 0"
          class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <i class="fas fa-triangle-exclamation mr-1"></i>
          Ajuste salvo. Ele mexeu em mês já consolidado:
          {{ divergenceWarning }} divergência(s) registrada(s) e os admins foram notificados.
          O fechamento congelado não mudou - reconsolide o mês se for o caso.
        </p>
      </template>
    </div>

    <template #footer>
      <Button variant="ghost" @click="emit('close')">
        {{ divergenceWarning > 0 ? 'Fechar' : 'Cancelar' }}
      </Button>
      <Button variant="primary" icon="fas fa-check" :disabled="!canSave || store.saving"
        @click="save">
        {{ store.saving ? 'Salvando...' : 'Salvar ajuste' }}
      </Button>
    </template>
  </Modal>
</template>
