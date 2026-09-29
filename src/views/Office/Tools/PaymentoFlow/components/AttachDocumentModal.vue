<script setup>
/**
 * AttachDocumentModal — nota fiscal (e boleto) de um lançamento que MEDIU ANTES
 * do documento (receita do tipo). A medição já existe; ao confirmar, o servidor
 * passa o documento pelo portão de regras e, se a medição já estiver
 * autorizada, gera o título na hora.
 */
import { ref, computed } from 'vue';
import { usePaymentFlowStore } from '@/stores/Tools/PaymentFlow/paymentFlowStore';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';

const props = defineProps({
  launch: { type: Object, required: true },
  receita: { type: Object, default: null },
});
const emit = defineEmits(['close', 'attached']);

const store = usePaymentFlowStore();
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const docEsperado = computed(() => props.receita?.titulo?.documento || '');
const pagaPorBoleto = computed(() => (props.receita?.titulo?.pagamento || 'boleto') === 'boleto');

const nf = ref({ file: null, busy: false, error: null, result: null });
const boleto = ref({ file: null, busy: false, error: null, result: null });
const form = ref({
  nfType: docEsperado.value || props.launch.nfType || 'NFS',
  nfNumber: '', nfIssueDate: '', nfAccessKey: '',
  boletoBarcode: '', boletoDueDate: '', boletoAmount: '',
});
const saving = ref(false);
const motivos = ref([]);

const ehNfe = computed(() => String(form.value.nfType).toUpperCase() === 'NFE');
const canSave = computed(() =>
  !!nf.value.result && !!form.value.nfNumber.trim()
  && (!ehNfe.value || form.value.nfAccessKey.replace(/\D/g, '').length === 44)
  && (!pagaPorBoleto.value || (!!boleto.value.result && !!form.value.boletoBarcode.trim()))
  && !saving.value,
);

async function processar(slot, file, kind) {
  if (!file) return;
  if (file.size > MAX_FILE_SIZE) { slot.value.error = `"${file.name}" passa de 2 MB.`; return; }
  slot.value = { file, busy: true, error: null, result: null };
  try {
    slot.value.result = await store.uploadDocument(file, kind === 'nf' ? 'payment_flow_nf' : 'payment_flow_boleto', props.launch.id);
    const { prefill } = await store.extractDocument(file, kind).catch(() => ({}));
    if (prefill && kind === 'nf') {
      form.value.nfNumber = prefill.nfNumber || '';
      form.value.nfIssueDate = prefill.documentDate || '';
      form.value.nfAccessKey = prefill.nfAccessKey || '';
      if (!docEsperado.value && prefill.nfType) {
        // A IA devolve "NFe", "NFS-e"... O Sienge usa a sigla: NFE, NFS.
        const s = String(prefill.nfType).toUpperCase().replace(/[^A-Z]/g, '');
        form.value.nfType = s.startsWith('NFS') ? 'NFS' : s === 'NFE' ? 'NFE' : s.slice(0, 10);
      }
    }
    if (prefill && kind === 'boleto') {
      form.value.boletoBarcode = prefill.boletoBarcode || '';
      form.value.boletoDueDate = prefill.boletoDueDate || '';
      form.value.boletoAmount = prefill.boletoAmount || '';
    }
  } catch (err) {
    slot.value.error = err.message || 'Falha no envio.';
  } finally {
    slot.value.busy = false;
  }
}

async function salvar() {
  if (!canSave.value) return;
  saving.value = true;
  motivos.value = [];
  try {
    await store.attachDocument(props.launch.id, {
      nfUrl: nf.value.result.url,
      nfPath: nf.value.result.path,
      nfFilename: nf.value.result.fileName || nf.value.file?.name,
      nfType: form.value.nfType,
      nfNumber: form.value.nfNumber.trim(),
      nfIssueDate: form.value.nfIssueDate || null,
      nfAccessKey: ehNfe.value ? form.value.nfAccessKey.replace(/\D/g, '') : null,
      ...(boleto.value.result && {
        boletoUrl: boleto.value.result.url,
        boletoPath: boleto.value.result.path,
        boletoFilename: boleto.value.result.fileName || boleto.value.file?.name,
        boletoBarcode: form.value.boletoBarcode.trim(),
        boletoDueDate: form.value.boletoDueDate || null,
        boletoAmount: form.value.boletoAmount || null,
      }),
    });
    emit('attached');
    emit('close');
  } catch (err) {
    // 422 do portão: a mensagem já vem com os motivos.
    motivos.value = String(err.message || 'Erro ao anexar.').split(/(?<=\.)\s+/).filter(Boolean);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Modal :open="true" size="md" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-data-warn/15 text-data-warn border border-data-warn/20 grid place-items-center shrink-0">
          <i class="fas fa-file-circle-exclamation text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">Anexar nota fiscal</h2>
          <p class="text-ink-muted mt-0.5 truncate">
            Medição <span class="font-mono">#{{ launch.siengeMeasurementNumber || '—' }}</span> · {{ launch.providerName || '—' }}
          </p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <p class="text-ink-muted">
        A medição já foi feita. Com a nota anexada, o título
        <span v-if="docEsperado" class="font-mono">{{ docEsperado }}</span>
        sai no Sienge assim que a medição estiver autorizada.
      </p>

      <!-- Nota -->
      <div class="space-y-2">
        <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono">Nota fiscal (PDF)</p>
        <label class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-line bg-surface-sunken cursor-pointer min-h-[44px]">
          <span class="flex items-center gap-2 min-w-0 text-xs">
            <Spinner v-if="nf.busy" size="sm" />
            <i v-else class="fas fa-file-pdf text-data-neg"></i>
            <span class="truncate">{{ nf.file?.name || 'Escolher arquivo da nota' }}</span>
          </span>
          <i class="fas fa-upload text-ink-subtle"></i>
          <input type="file" accept="application/pdf" class="hidden"
            @change="e => { processar(nf, e.target.files?.[0], 'nf'); e.target.value = ''; }" />
        </label>
        <p v-if="nf.error" class="text-data-neg"><i class="fas fa-circle-exclamation mr-1"></i>{{ nf.error }}</p>
        <div v-if="nf.result" class="grid grid-cols-2 gap-3">
          <Input v-model="form.nfType" label="Tipo" :disabled="!!docEsperado" />
          <Input v-model="form.nfNumber" label="Número" required />
          <Input v-model="form.nfIssueDate" label="Emissão" type="date" />
          <Input v-if="ehNfe" v-model="form.nfAccessKey" label="Chave de acesso (44 dígitos)" class="col-span-2 font-mono" required />
        </div>
      </div>

      <!-- Boleto -->
      <div v-if="pagaPorBoleto" class="space-y-2">
        <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono">Boleto (PDF)</p>
        <label class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-line bg-surface-sunken cursor-pointer min-h-[44px]">
          <span class="flex items-center gap-2 min-w-0 text-xs">
            <Spinner v-if="boleto.busy" size="sm" />
            <i v-else class="fas fa-barcode text-accent"></i>
            <span class="truncate">{{ boleto.file?.name || 'Escolher arquivo do boleto' }}</span>
          </span>
          <i class="fas fa-upload text-ink-subtle"></i>
          <input type="file" accept="application/pdf" class="hidden"
            @change="e => { processar(boleto, e.target.files?.[0], 'boleto'); e.target.value = ''; }" />
        </label>
        <p v-if="boleto.error" class="text-data-neg"><i class="fas fa-circle-exclamation mr-1"></i>{{ boleto.error }}</p>
        <div v-if="boleto.result" class="space-y-3">
          <Input v-model="form.boletoBarcode" label="Linha digitável" required class="font-mono" />
          <div class="grid grid-cols-2 gap-3">
            <Input v-model="form.boletoDueDate" label="Vencimento" type="date" />
            <Input v-model="form.boletoAmount" label="Valor (R$)" />
          </div>
        </div>
      </div>
      <p v-else class="text-ink-muted"><i class="fas fa-building-columns mr-1"></i>Este tipo é pago por transferência: não precisa de boleto.</p>

      <div v-if="motivos.length"
        class="rounded-lg border border-data-neg/20 bg-data-neg/10 px-3 py-2.5 text-data-neg space-y-1">
        <p class="font-semibold flex items-center gap-1.5"><i class="fas fa-shield-halved"></i>O portão de regras recusou</p>
        <p v-for="(m, i) in motivos" :key="i">{{ m }}</p>
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" @click="emit('close')">Cancelar</Button>
      <Button :loading="saving" :disabled="!canSave" icon="fas fa-check" @click="salvar">
        {{ saving ? 'Enviando...' : 'Anexar e gerar título' }}
      </Button>
    </template>
  </Modal>
</template>
