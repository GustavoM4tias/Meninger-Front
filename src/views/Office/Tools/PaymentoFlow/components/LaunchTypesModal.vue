<script setup>
/**
 * LaunchTypesModal — tipos de lançamento e a RECEITA de cada um.
 *
 * A esteira é feita de módulos (Fornecedor, Contrato, Medição, Título). A
 * receita diz quais o tipo usa e como; as regras dizem o que o portão recusa.
 * Tudo aqui é gravado no tipo e vale no próximo "Processar", sem deploy.
 * Capacidade `configure` (a mesma de cadastrar tipo).
 */
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { usePaymentFlowStore } from '@/stores/Tools/PaymentFlow/paymentFlowStore';
import { pedirConfirmacao } from '@/composables/useConfirm';

import Modal from '@/components/UI/Modal.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Spinner from '@/components/UI/Spinner.vue';

const emit = defineEmits(['close']);
const store = usePaymentFlowStore();
const toast = useToast();

const tipos = ref([]);
const loading = ref(true);
const selId = ref(null);
const form = ref(null);
const saving = ref(false);
const erro = ref(null);

const CONTRATO_OPTS = [
  { value: 'auto', label: 'Automático: acha contrato e faz aditivo; sem contrato, cria' },
  { value: 'existente', label: 'Contrato existente: mede direto, sem aditivo (ex.: salário PJ)' },
  { value: 'criar', label: 'Sempre criar contrato novo' },
];
const PAGAMENTO_OPTS = [
  { value: 'boleto', label: 'Boleto (registra a linha digitável)' },
  { value: 'transferencia', label: 'Transferência (sem boleto)' },
  { value: 'pix', label: 'PIX na chave do credor (escolhido no Sienge)' },
];
const PAGAMENTO_LABEL = { boleto: 'boleto', transferencia: 'transferência', pix: 'PIX' };
const CREDOR_OPTS = [
  { value: 'qualquer', label: 'Qualquer (CNPJ ou CPF)' },
  { value: 'PJ', label: 'Só pessoa jurídica (CNPJ)' },
  { value: 'PF', label: 'Só pessoa física (CPF)' },
];

const selecionado = computed(() => tipos.value.find(t => t.id === selId.value) || null);

function abrir(t) {
  selId.value = t.id;
  erro.value = null;
  const r = t.receitaEfetiva || {};
  const g = t.regrasEfetivas || {};
  form.value = {
    documento: t.documento || '',
    budgetItem: t.budgetItem || '',
    budgetItemCode: t.budgetItemCode || '',
    financialAccountNumber: t.financialAccountNumber || '',
    departamentoId: t.departamentoId || '',
    active: t.active !== false,
    configurada: !!r.configurada,
    contrato: r.contrato || 'auto',
    documentosContrato: (r.documentosContrato || []).join(', '),
    tituloDocumento: r.titulo?.documento || '',
    pagamento: r.titulo?.pagamento || 'boleto',
    medicaoAntesDoDocumento: !!r.medicaoAntesDoDocumento,
    credorTipo: g.credorTipo || 'qualquer',
    exigeContratoVigente: g.exigeContratoVigente !== false,
    exigeContratoAutorizado: g.exigeContratoAutorizado !== false,
    valorMaximo: g.valorMaximo ?? '',
    bloquearNfDuplicada: g.bloquearNfDuplicada !== false,
  };
}

/** Os passos que a esteira vai rodar com o que está no formulário agora. */
const passos = computed(() => {
  const f = form.value;
  if (!f) return [];
  const out = ['Fornecedor'];
  if (f.contrato === 'existente') out.push(`Contrato existente (${f.documentosContrato || f.documento})`);
  else if (f.contrato === 'criar') out.push('Contrato - criação');
  else out.push('Contrato - aditivo ou criação');
  out.push('Medição');
  if (f.medicaoAntesDoDocumento) out.push('Aguarda documento');
  out.push(`Título ${f.tituloDocumento || 'do lançamento'} - ${PAGAMENTO_LABEL[f.pagamento] || f.pagamento}`);
  return out;
});

async function carregar() {
  loading.value = true;
  try {
    tipos.value = await store.fetchAllLaunchTypes();
    if (selId.value) {
      const t = tipos.value.find(x => x.id === selId.value);
      if (t) abrir(t);
    }
  } catch (err) {
    erro.value = err.message;
  } finally {
    loading.value = false;
  }
}

function payload(comReceita = true) {
  const f = form.value;
  return {
    documento: f.documento.trim().toUpperCase(),
    budgetItem: f.budgetItem.trim(),
    budgetItemCode: f.budgetItemCode.trim() || null,
    financialAccountNumber: f.financialAccountNumber.trim(),
    departamentoId: String(f.departamentoId || '').trim() || null,
    active: f.active,
    ...(comReceita && {
      receita: {
        contrato: f.contrato,
        documentosContrato: f.documentosContrato,
        titulo: { documento: f.tituloDocumento.trim().toUpperCase(), pagamento: f.pagamento },
        medicaoAntesDoDocumento: f.medicaoAntesDoDocumento,
      },
      regras: {
        credorTipo: f.credorTipo,
        exigeContratoVigente: f.exigeContratoVigente,
        exigeContratoAutorizado: f.exigeContratoAutorizado,
        valorMaximo: f.valorMaximo === '' ? null : Number(f.valorMaximo),
        bloquearNfDuplicada: f.bloquearNfDuplicada,
      },
    }),
  };
}

async function salvar() {
  if (!selecionado.value) return;
  if (!form.value.configurada && !await pedirConfirmacao({
    title: `Ativar a receita de "${selecionado.value.name}"?`,
    consequence: 'A partir do próximo Processar, o portão de regras passa a valer para este tipo: lançamento sem número de nota ou, se for boleto, sem linha digitável e vencimento, é recusado antes de ir ao Sienge.',
    confirmLabel: 'Ativar receita',
    tone: 'accent',
  })) return;
  saving.value = true;
  erro.value = null;
  try {
    await store.saveLaunchType(selecionado.value.id, payload(true));
    toast.success('Receita salva.');
    await carregar();
  } catch (err) {
    erro.value = err.message;
  } finally {
    saving.value = false;
  }
}

async function voltarAuto() {
  if (!selecionado.value) return;
  if (!await pedirConfirmacao({
    title: `Voltar "${selecionado.value.name}" ao modo automático?`,
    consequence: 'O tipo volta a rodar como antes da receita: acha contrato e faz aditivo, ou cria. O portão deixa de exigir nota e boleto. Lançamentos já em andamento seguem na etapa em que estão.',
    confirmLabel: 'Voltar ao automático',
  })) return;
  saving.value = true;
  try {
    await store.saveLaunchType(selecionado.value.id, { ...payload(false), receita: null, regras: null });
    toast.success('Tipo voltou ao modo automático.');
    await carregar();
  } catch (err) {
    erro.value = err.message;
  } finally {
    saving.value = false;
  }
}

onMounted(carregar);
</script>

<template>
  <Modal :open="true" size="lg" @close="emit('close')">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-9 w-9 rounded-lg bg-accent-soft text-accent border border-accent/20 grid place-items-center shrink-0">
          <i class="fas fa-diagram-project text-sm"></i>
        </div>
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-ink truncate">Tipos de lançamento e receitas</h2>
          <p class="text-ink-muted mt-0.5">O que cada tipo faz no Sienge e o que o portão de regras recusa.</p>
        </div>
      </div>
    </template>

    <div v-if="loading" class="py-10 grid place-items-center"><Spinner size="md" /></div>

    <div v-else class="grid gap-4 md:grid-cols-[14rem_1fr]">
      <!-- Lista -->
      <div class="space-y-1.5">
        <button v-for="t in tipos" :key="t.id" type="button"
          class="w-full text-left rounded-lg border px-3 py-2 min-h-[44px] transition-colors"
          :class="t.id === selId ? 'border-accent bg-accent-soft/40' : 'border-line bg-surface-sunken hover:border-accent/40'"
          @click="abrir(t)">
          <span class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-ink truncate">{{ t.name }}</span>
            <Badge v-if="!t.active" variant="neutral" size="sm">inativo</Badge>
            <Badge v-else-if="t.receitaEfetiva?.configurada" variant="accent" size="sm">receita</Badge>
          </span>
          <span class="text-micro text-ink-subtle font-mono">{{ t.documento }} · {{ (t.passos || []).length }} passos</span>
        </button>
      </div>

      <!-- Editor -->
      <div v-if="form" class="space-y-4">
        <div class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5">
          <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono mb-1.5">A esteira vai rodar</p>
          <ol class="flex flex-wrap items-center gap-1.5 text-xs">
            <li v-for="(p, i) in passos" :key="i" class="flex items-center gap-1.5">
              <span class="rounded-md bg-surface-raised border border-line px-2 py-1 text-ink">{{ p }}</span>
              <i v-if="i < passos.length - 1" class="fas fa-chevron-right text-micro text-ink-subtle"></i>
            </li>
          </ol>
          <p v-if="!form.configurada" class="mt-2 text-ink-muted">
            Sem receita gravada: roda no modo automático de sempre, e o portão não exige nota nem boleto.
          </p>
        </div>

        <section class="space-y-3">
          <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono">Sienge</p>
          <div class="grid grid-cols-2 gap-3">
            <Input v-model="form.documento" label="Documento do contrato" hint="Ex.: CT, CTPJ, PREM" />
            <Input v-model="form.departamentoId" label="Departamento" hint="Ex.: 24 Comercial" />
            <Input v-model="form.budgetItem" label="Item do orçamento" class="col-span-2" hint="A medição procura a linha do contrato por este nome." />
            <Input v-model="form.budgetItemCode" label="Código do item" hint="Deixe vazio se muda por obra." />
            <Input v-model="form.financialAccountNumber" label="Conta financeira" />
          </div>
          <Switch v-model="form.active" label="Tipo ativo" description="Inativo some do cadastro de lançamento e da Eme." />
        </section>

        <section class="space-y-3">
          <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono">Receita</p>
          <Select v-model="form.contrato" :options="CONTRATO_OPTS" label="Contrato" />
          <Input v-if="form.contrato !== 'auto'" v-model="form.documentosContrato" label="Documentos de contrato aceitos"
            hint="Separados por vírgula. Vazio = só o documento do tipo." />
          <div class="grid grid-cols-2 gap-3">
            <Input v-model="form.tituloDocumento" label="Documento do título" hint="NFS, NFE, RPA... Vazio = o do lançamento." />
            <Select v-model="form.pagamento" :options="PAGAMENTO_OPTS" label="Pagamento" />
          </div>
          <Switch v-model="form.medicaoAntesDoDocumento" label="Medição antes da nota"
            description="O lançamento nasce sem NF, a medição roda e o título espera a nota ser anexada." />
        </section>

        <section class="space-y-3">
          <p class="text-micro uppercase tracking-wider text-ink-subtle font-mono">Portão de regras</p>
          <div class="grid grid-cols-2 gap-3">
            <Select v-model="form.credorTipo" :options="CREDOR_OPTS" label="Fornecedor" />
            <Input v-model="form.valorMaximo" type="number" label="Valor máximo (R$)" hint="Vazio = sem teto." />
          </div>
          <Switch v-model="form.exigeContratoAutorizado" label="Contrato aprovado e autorizado" />
          <Switch v-model="form.exigeContratoVigente" label="Contrato dentro da vigência" />
          <Switch v-model="form.bloquearNfDuplicada" label="Recusar nota já lançada para o mesmo fornecedor" />
        </section>

        <p v-if="erro" class="rounded-lg border border-data-neg/20 bg-data-neg/10 px-3 py-2 text-data-neg">
          <i class="fas fa-circle-exclamation mr-1"></i>{{ erro }}
        </p>
      </div>

      <p v-else class="text-ink-muted self-center">Escolha um tipo para ver e editar a receita.</p>
    </div>

    <template #footer>
      <Button v-if="form?.configurada" variant="ghost" :disabled="saving" @click="voltarAuto">Voltar ao automático</Button>
      <Button variant="ghost" @click="emit('close')">Fechar</Button>
      <Button v-if="form" :loading="saving" icon="fas fa-check" @click="salvar">Salvar receita</Button>
    </template>
  </Modal>
</template>
