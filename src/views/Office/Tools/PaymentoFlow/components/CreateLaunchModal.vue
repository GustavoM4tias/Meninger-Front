<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { usePaymentFlowStore } from '@/stores/Tools/PaymentFlow/paymentFlowStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';

const emit = defineEmits(['close', 'created']);
const store = usePaymentFlowStore();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.hasRole('admin'));

// ── Adicionar novo tipo (admin) ───────────────────────────────────────────────
const showAddType = ref(false);
const newTypeForm = ref({ name: '', documento: '', budgetItem: '', budgetItemCode: '', financialAccountNumber: '', departamentoId: '' });
const addTypeLoading = ref(false);
const addTypeError = ref(null);

async function handleAddType() {
    if (!newTypeForm.value.name?.trim()) return;
    addTypeLoading.value = true;
    addTypeError.value = null;
    try {
        await requestWithAuth(`${API_URL}/sienge/launch-types`, {
            method: 'POST',
            body: JSON.stringify(newTypeForm.value),
        });
        // Recarrega a lista
        store.launchTypes.length = 0; // força re-fetch
        store.launchTypes.splice(0);
        await store.fetchLaunchTypes();
        showAddType.value = false;
        newTypeForm.value = { name: '', documento: '', budgetItem: '', budgetItemCode: '', financialAccountNumber: '', departamentoId: '' };
    } catch (err) {
        addTypeError.value = err.message || 'Erro ao adicionar tipo.';
    } finally {
        addTypeLoading.value = false;
    }
}

// ── Refs dos inputs de arquivo ───────────────────────────────────────────────
const nfInputRef = ref(null);
const boletoInputRef = ref(null);
const extraInputRef = ref(null);

// ── Drag-and-drop ─────────────────────────────────────────────────────────────
const draggingNf = ref(false);
const draggingBoleto = ref(false);
const draggingExtra = ref(false);

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

function fileSizeError(file) {
    if (file.size > MAX_FILE_SIZE) {
        alert(`O arquivo "${file.name}" excede o limite de 2 MB e não foi anexado.`);
        return true;
    }
    return false;
}

async function onNfDrop(e) {
    draggingNf.value = false;
    if (store.nfFile) return;
    const file = e.dataTransfer?.files?.[0];
    if (!file || fileSizeError(file)) return;
    await store.handleNfFile(file);
}

async function onBoletoDrop(e) {
    draggingBoleto.value = false;
    if (store.boletoFile) return;
    const file = e.dataTransfer?.files?.[0];
    if (!file || fileSizeError(file)) return;
    await store.handleBoletoFile(file);
}

async function onExtraDrop(e) {
    draggingExtra.value = false;
    const files = Array.from(e.dataTransfer?.files || []);
    const valid = files.filter(f => !fileSizeError(f));
    await Promise.all(valid.map(f => store.handleExtraFile(f)));
}

// ── Empreendimento resolvido ─────────────────────────────────────────────────
// { erpId, companyId, name, city } | null
const enterpriseResolved = ref(null);
const enterpriseSuggestion = ref(null);
const allEnterprises = ref([]);
let _resolveHintSent = '';

// ── Helpers de empreendimento ────────────────────────────────────────────────
function normalizeText(value = '') {
    return String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

async function loadAllEnterprises() {
    try {
        const data = await requestWithAuth(`${API_URL}/sienge/payment-flow/enterprises`);
        allEnterprises.value = Array.isArray(data?.results) ? data.results : [];
    } catch (_) {
        allEnterprises.value = [];
    }
}

function enterpriseLabel(ent) {
    const name = String(ent?.name || '').trim();
    const companyId = ent?.companyId ?? '-';
    const erpId = ent?.erpId ?? '-';

    return `${companyId} | ${erpId} | ${name}`;
}

// Pontuação de prioridade: COMERCIAL > INCORPORAÇÃO > ESTOQUE > outros (evita ADMINISTRAÇÃO)
function enterprisePriority(name = '') {
    const n = normalizeText(name);
    if (n.includes('comercial')) return 3;
    if (n.includes('incorporacao') || n.includes('incorporacao')) return 2;
    if (n.includes('estoque')) return 1;
    return 0;
}

const enterpriseOptions = computed(() => {
    const seen = new Set();
    const out = [];

    for (const ent of allEnterprises.value) {
        const name = String(ent?.name || '').trim();
        if (!name) continue;

        const key = `${normalizeText(name)}::${ent?.companyId ?? ''}::${ent?.erpId ?? ''}`;
        if (seen.has(key)) continue;

        seen.add(key);
        out.push(enterpriseLabel(ent));
    }

    return out;
});

const selectedEnterpriseNames = computed({
    get() {
        return enterpriseResolved.value ? [enterpriseLabel(enterpriseResolved.value)] : [];
    },
    set(values) {
        const selectedLabel = Array.isArray(values) && values.length ? values[0] : null;

        if (!selectedLabel) {
            enterpriseResolved.value = null;
            return;
        }

        const found = allEnterprises.value.find(e => enterpriseLabel(e) === selectedLabel);
        enterpriseResolved.value = found || null;
    }
});

function onEnterpriseSelection(values) {
    selectedEnterpriseNames.value = Array.isArray(values) && values.length ? [values[0]] : [];
}

function clearEnterpriseSelection() {
    enterpriseSuggestion.value = null;
    enterpriseResolved.value = null;
    _resolveHintSent = '';
}

async function resolveEnterpriseSuggestion(hint) {
    if (!hint?.trim() || hint === _resolveHintSent) return;

    _resolveHintSent = hint;

    try {
        const data = await requestWithAuth(
            `${API_URL}/sienge/payment-flow/enterprises/resolve?name=${encodeURIComponent(hint.trim())}`
        );

        if (!data?.best) return;

        enterpriseSuggestion.value = data.best;

        // Candidatos pelo erpId (mesmo empreendimento, empresas diferentes)
        const byErpId = allEnterprises.value.filter(e => Number(e?.erpId) === Number(data.best?.erpId));
        // Fallback: candidatos pelo nome normalizado
        const byName = byErpId.length
            ? byErpId
            : allEnterprises.value.filter(e => normalizeText(e?.name) === normalizeText(data.best?.name));

        // Ordena por prioridade: COMERCIAL > INCORPORAÇÃO > ESTOQUE > outros
        const sorted = [...byName].sort((a, b) => enterprisePriority(b.name) - enterprisePriority(a.name));

        enterpriseResolved.value = sorted[0] || data.best;
    } catch (_) {
        // silencioso — usuário pode selecionar manualmente
    }
}

// ── Formulário ───────────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);
const endOfYear = `${today.slice(0, 4)}-12-31`;

const form = ref({
    providerName: '',
    providerCnpj: '',
    contractStartDate: today,
    contractEndDate: endOfYear,
    nfIssueDate: '',
    boletoDueDate: '',
    launchType: '',
    budgetItem: '',
    budgetItemCode: '',
    financialAccountNumber: '',
    allocationPercentage: 100,
    unitPrice: '',
    nfNumber: '',
    nfType: '',
    boletoBarcode: '',
    boletoAmount: '',
    notes: '',
});

const submitError = ref(null);

// ── Aplica prefill da NF ─────────────────────────────────────────────────────
watch(() => store.nfPrefill, (pf) => {
    if (!pf) return;

    if (pf.providerName && !form.value.providerName) form.value.providerName = pf.providerName;
    if (pf.providerCnpj && !form.value.providerCnpj) form.value.providerCnpj = formatCnpj(pf.providerCnpj);
    if (pf.nfIssueDate && !form.value.nfIssueDate) form.value.nfIssueDate = pf.nfIssueDate;
    if (pf.documentDate && !form.value.nfIssueDate) form.value.nfIssueDate = pf.documentDate;
    if (pf.nfNumber && !form.value.nfNumber) form.value.nfNumber = pf.nfNumber;
    if (pf.nfType && !form.value.nfType) form.value.nfType = pf.nfType;
    if (pf.unitPrice && !form.value.unitPrice) form.value.unitPrice = pf.unitPrice;
    if (pf.contractEndDate && !form.value.contractEndDate) form.value.contractEndDate = pf.contractEndDate;

    if (pf.suggestedLaunchType && !form.value.launchType) {
        form.value.launchType = pf.suggestedLaunchType;
        applyTypeDefaults(pf.suggestedLaunchType);
    }

    const hint = pf.enterpriseHint || pf.companyHint;
    if (hint && !enterpriseResolved.value) resolveEnterpriseSuggestion(hint);
});

// ── Aplica prefill do Boleto ─────────────────────────────────────────────────
watch(() => store.boletoPrefill, (pf) => {
    if (!pf) return;

    if (pf.boletoBarcode && !form.value.boletoBarcode) form.value.boletoBarcode = pf.boletoBarcode;
    if (pf.boletoDueDate && !form.value.boletoDueDate) form.value.boletoDueDate = pf.boletoDueDate;
    if (pf.boletoAmount && !form.value.boletoAmount) form.value.boletoAmount = pf.boletoAmount;
    if (pf.providerName && !form.value.providerName) form.value.providerName = pf.providerName;
    if (pf.providerCnpj && !form.value.providerCnpj) form.value.providerCnpj = formatCnpj(pf.providerCnpj);
    // Valor do contrato sempre reflete o valor do boleto (fonte de verdade do pagamento)
    if (pf.boletoAmount) form.value.unitPrice = pf.boletoAmount;
    // Fallback: data de emissão do boleto caso a NF não tenha trazido
    if (pf.documentDate && !form.value.nfIssueDate) form.value.nfIssueDate = pf.documentDate;

    const hint = pf.enterpriseHint || pf.companyHint;
    if (hint && !enterpriseResolved.value && !enterpriseSuggestion.value) {
        resolveEnterpriseSuggestion(hint);
    }
});

// ── Tipo de lançamento ───────────────────────────────────────────────────────
function applyTypeDefaults(type) {
    const d = store.getTypeDefaults(type);
    if (d.budgetItem) form.value.budgetItem = d.budgetItem;
    if (d.budgetItemCode) form.value.budgetItemCode = String(d.budgetItemCode);
    if (d.financialAccountNumber) form.value.financialAccountNumber = d.financialAccountNumber;
}

watch(() => form.value.launchType, t => {
    if (t) applyTypeDefaults(t);
});

// ── Código do documento do tipo selecionado (read-only) ───────────────────────
const selectedDocumento = computed(() =>
    store.launchTypes.find(t => t.name === form.value.launchType)?.documento || null
);

// ── Código do documento do tipo selecionado (read-only) ───────────────────────
const selectedDepartment = computed(() =>
    store.launchTypes.find(t => t.name === form.value.launchType)?.departamentoId || null
);

// ── CNPJ mask ────────────────────────────────────────────────────────────────
function formatCnpj(raw = '') {
    const d = String(raw).replace(/\D/g, '').slice(0, 14);
    return d
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}

function onCnpjInput(e) {
    form.value.providerCnpj = formatCnpj(e.target.value);
}

// ── Handlers de arquivo ──────────────────────────────────────────────────────
async function onNfSelected(e) {
    const file = e.target.files?.[0];
    nfInputRef.value.value = '';
    if (!file || fileSizeError(file)) return;
    await store.handleNfFile(file);
}

async function onBoletoSelected(e) {
    const file = e.target.files?.[0];
    boletoInputRef.value.value = '';
    if (!file || fileSizeError(file)) return;
    await store.handleBoletoFile(file);
}

async function onExtrasSelected(e) {
    const files = Array.from(e.target.files || []);
    extraInputRef.value.value = '';
    const valid = files.filter(f => !fileSizeError(f));
    await Promise.all(valid.map(f => store.handleExtraFile(f)));
}

// ── Reset helpers ────────────────────────────────────────────────────────────
function clearNfState() {
    store.nfFile = null;
    store.nfUploadResult = null;
    store.nfPrefill = null;
    clearEnterpriseSelection();
}

function clearBoletoState() {
    store.boletoFile = null;
    store.boletoUploadResult = null;
    store.boletoPrefill = null;
}

// ── Validação ────────────────────────────────────────────────────────────────
const hasDocument = computed(() => !!(store.nfFile || store.boletoFile));
const hasBoleto = computed(() => !!store.boletoFile);

const formValid = computed(() =>
    form.value.launchType &&
    form.value.unitPrice &&
    hasBoleto.value
);

// Lista completa processada (Removido o "Não" e formatado para busca)
const docTypesList = [
    { value: 'REQ', label: 'REQ - Requisição de Materiais' },
    { value: 'TR', label: 'TR - Documento de Transferência de Materiais' },
    { value: 'AV', label: 'AV - Aviso de Lançamento' },
    { value: 'INIE', label: 'INIE - Inicialização de Estoque' },
    { value: 'TRES', label: 'TRES - Transf/Reserva Estoque por Solicitação' },
    { value: 'TRS', label: 'TRS - Transf. de Materiais por Soliciitação' },
    { value: 'GRCS', label: 'GRCS - Guia Recolhimento de Comissão Sindical' },
    { value: 'MSST', label: 'MSST - Movimento Segurança/Saúde no Trabalho' },
    { value: 'FGTS', label: 'FGTS - FGTS' },
    { value: 'RDV', label: 'RDV - Reembolso de Despesas de Viagem' },
    { value: 'CONT', label: 'CONT - Contribuição Confederativa' },
    { value: 'TB', label: 'TB - Tarifas Bancárias' },
    { value: 'APLI', label: 'APLI - Aplicação' },
    { value: 'RESG', label: 'RESG - Resgate' },
    { value: 'TRF', label: 'TRF - Transferência Entre Contas' },
    { value: 'RENT', label: 'RENT - Rentabilidade' },
    { value: 'IR', label: 'IR - IR Retido sobre Rendim.de Aplic. Financ.' },
    { value: 'ITBI', label: 'ITBI - Imposto S/ Transf. de Bens Imobiliários' },
    { value: 'RPA', label: 'RPA - Recibo de Pagamento Autônomo' },
    { value: 'DEMD', label: 'DEMD - Demonstrativo de Débito' },
    { value: 'MLE', label: 'MLE - Movimento de Locação de Equipamentos' },
    { value: 'MOV1', label: 'MOV1 - Movimento de Transferencia de Equip.' },
    { value: 'GPS', label: 'GPS - Guia da Previdência Social' },
    { value: 'REC', label: 'REC - Recibo' },
    { value: 'MCEF', label: 'MCEF - Medições de Serviços (Contratos e CEF)' },
    { value: 'FAT', label: 'FAT - Fatura' },
    { value: 'DL', label: 'DL - Distribuicao de Lucros' },
    { value: 'GCAS', label: 'GCAS - Guia de Contribuição Assist. Confeder.' },
    { value: 'NFE', label: 'NFE - Nota Fiscal Eletrônica' },
    { value: 'GPAT', label: 'GPAT - Guia de Contribuição Assist. Patronal' },
    { value: 'GCS', label: 'GCS - Guia de Contribuição Sindical' },
    { value: 'GCSP', label: 'GCSP - Guia de Contribuição Sindical Patronal' },
    { value: 'CTE', label: 'CTE - Conhecimento de Transporte Eletronico' },
    { value: 'APOR', label: 'APOR - Aporte de Mutuários CEF' },
    { value: 'RECP', label: 'RECP - Recuperação de DBT de Parc. Mutuário CEF' },
    { value: 'DBTM', label: 'DBTM - Débito de Parc.de Mutuários (Taxa Obra)' },
    { value: 'TAO', label: 'TAO - Taxa Bancária de Acompanhamento de Obras' },
    { value: 'TXAL', label: 'TXAL - Taxa Análise Contratos Mutuários' },
    { value: 'CTA', label: 'CTA - Contrato de Locação de Imóveis Próprios' },
    { value: 'TXCB', label: 'TXCB - Taxa Cetesb' },
    { value: 'TFPJ', label: 'TFPJ - Tarifa de Análise de Projeto' },
    { value: 'GASS', label: 'GASS - Guia de Contribuição Associativa' },
    { value: 'TARC', label: 'TARC - Tarifa de Analise de Risco de Crédito' },
    { value: 'TX', label: 'TX - Taxa Obra Mutuários CEF' },
    { value: 'ART', label: 'ART - Anotação de Responsab. Técnica' },
    { value: 'CRED', label: 'CRED - Créditos Bancários à Identificar' },
    { value: 'RAT', label: 'RAT - Rateio de Cobrança com Parceiro' },
    { value: 'GRU', label: 'GRU - Guia de Recolhimento da União' },
    { value: 'TXBO', label: 'TXBO - Taxa de Serviço de Bombeiro' },
    { value: 'DASP', label: 'DASP - Docto de Arrecadação do Município de SP' },
    { value: 'IOF', label: 'IOF - IOF S/ Operações Financeira' },
    { value: 'RAPL', label: 'RAPL - Rendimento de Aplicações' },
    { value: 'VU', label: 'VU - Venda de Unidades' },
    { value: 'CUPO', label: 'CUPO - Cupom Fiscal' },
    { value: 'TXCD', label: 'TXCD - Taxa de Condomínio' },
    { value: 'REIN', label: 'REIN - Remessa para Industrialização' },
    { value: 'RB', label: 'RB - Reembolsos Diversos' },
    { value: 'TFE', label: 'TFE - Taxa de Fiscalização de Estabelecimento' },
    { value: 'ESTG', label: 'ESTG - Bolsa Auxílio (Estagiário)' },
    { value: 'TXD', label: 'TXD - Taxas Diversas' },
    { value: 'RTRA', label: 'RTRA - Rescisão Trabalhista' },
    { value: 'DARE', label: 'DARE - Doc. Arrecadação de Receitas Estaduais' },
    { value: 'GPJ', label: 'GPJ - Guia de Recolhimento do Poder Judiciário' },
    { value: 'FLOC', label: 'FLOC - Fatura de Locação de Equipamentos' },
    { value: 'DAE', label: 'DAE - Documento de Arrecadação Estadual' },
    { value: 'RCL', label: 'RCL - Reembolso Despesas Pagas para Clientes' },
    { value: 'ADTV', label: 'ADTV - Adiantamento vinculado Pedido/Contrato' },
    { value: 'PCEF', label: 'PCEF - Produtos Caixa (CEF)' },
    { value: 'FEF', label: 'FEF - Faturamento para Entrega Futura' },
    { value: 'REF', label: 'REF - Remessa de Entrega Futura' },
    { value: 'ND', label: 'ND - Nota de Débito' },
    { value: 'AAC', label: 'AAC - Adiantamento ALUGUEL Clientes' },
    { value: 'RGIM', label: 'RGIM - Registro de Imóvel Mutuários' },
    { value: 'RINC', label: 'RINC - Recibo Admin.de Incorp(Taxa ADM e Receb)' },
    { value: 'CAUL', label: 'CAUL - Caução de Locação' },
    { value: 'CC', label: 'CC - Compra Conjunta' },
    { value: 'IPP', label: 'IPP - Instrumento Particular de Parceria' },
    { value: 'RC', label: 'RC - Revisão de Custo' },
    { value: 'REAL', label: 'REAL - REMESSA DE BEM' },
    { value: 'PREM', label: 'PREM - Premiação e/ou Bonificação sob Vendas' },
    { value: 'DAR', label: 'DAR - Documento de Arrecadação' },
    { value: 'APOT', label: 'APOT - Aporte de Capital' },
    { value: 'CF', label: 'CF - Conhecimento de Frete' },
    { value: 'GRRF', label: 'GRRF - Guia de Recolhimento Rescisório do FGTS' },
    { value: 'IPTU', label: 'IPTU - Imposto Predial Territorial Urbano' },
    { value: 'IRRF', label: 'IRRF - IR Folha de Pagamento' },
    { value: 'TXFF', label: 'TXFF - Taxa de Fiscalização para Funcionamento' },
    { value: 'JR', label: 'JR - Pagamento de Juros' },
    { value: 'CTF', label: 'CTF - Contrato de financiamento' },
    { value: 'GISS', label: 'GISS - Guia de Recolhimento de ISS' },
    { value: 'CPC', label: 'CPC - Contrato de Pedido de Compra' },
    { value: 'EMP', label: 'EMP - Empréstimo Entre Empresas' },
    { value: 'GUIA', label: 'GUIA - Guia para Recolhimentos de Impostos' },
    { value: 'DARF', label: 'DARF - DARF' },
    { value: 'NFCA', label: 'NFCA - Nota Fiscal de Fornecimento de Água' },
    { value: 'MULT', label: 'MULT - Multas de Trânsito' },
    { value: 'TTR', label: 'TTR - Termo de Transação' },
    { value: 'NFEE', label: 'NFEE - Nota Fiscal de Energia Eletrica' },
    { value: 'MUTS', label: 'MUTS - Mutuo - Saída' },
    { value: 'ALUG', label: 'ALUG - Aluguel' },
    { value: 'NFC', label: 'NFC - Nota Fiscal de Serviço de Comunicação' },
    { value: 'APSE', label: 'APSE - Apólice de Seguro' },
    { value: 'NFVC', label: 'NFVC - Nota Fiscal de Venda a Consumidor' },
    { value: 'MOV', label: 'MOV - Movimentação Financeira / Contábil' },
    { value: 'EMPJ', label: 'EMPJ - Empréstimos PJ' },
    { value: 'AVC', label: 'AVC - Adiantamento VENDA Clientes' },
    { value: 'DAM', label: 'DAM - Documento de Arrecadação Municipal' },
    { value: 'ADTO', label: 'ADTO - Adto. Pgto. Fornec. e/ou Recbt. Cliente' },
    { value: 'AJUS', label: 'AJUS - AJUSTE FINANCEIRO/CONTÁBIL' },
    { value: 'PROT', label: 'PROT - Protesto' },
    { value: 'PPJ', label: 'PPJ - Pagto Processo Judicial / Bloqueio Judic' },
    { value: 'DIST', label: 'DIST - Distrato de Contrato de Venda' },
    { value: 'RD', label: 'RD - Regularização/Documentação e Decoração' },
    { value: 'CT', label: 'CT - Contrato' },
    { value: 'NFS', label: 'NFS - Nota Fiscal de Serviço' },
    { value: 'MCOI', label: 'MCOI - Doc. Contab. Sistema Custo Orç. e Incorp' },
    { value: 'CTPJ', label: 'CTPJ - Contrato Prest. Serviços Pessoa Juridica' },
    { value: 'CERT', label: 'CERT - Guias Certidões Div. e Reg. em Cartórios' },
    { value: 'ITM', label: 'ITM - ITBI - Adiantamento a Mutuários' },
    { value: 'CART', label: 'CART - Cartório de Registro de Imóveis' }
];

// Computed para o MultiSelector (get: busca o label pela sigla | set: salva a sigla pelo label)
const docTypeOptions = docTypesList.map(item => item.label);

const selectedDocTypeLabel = computed({
    get() {
        const found = docTypesList.find(d => d.value === form.value.nfType);
        return found ? [found.label] : [];
    },
    set(values) {
        const selectedLabel = values.length ? values[0] : '';
        const found = docTypesList.find(d => d.label === selectedLabel);
        form.value.nfType = found ? found.value : '';
    }
});

// ── Submit ───────────────────────────────────────────────────────────────────
// Converte string vazia / undefined para null
function n(v) { return (v === '' || v === null || v === undefined) ? null : v; }

async function handleSubmit() {
    submitError.value = null;

    try {
        // Faz upload de todos os arquivos pendentes (adiados desde a seleção)
        const pending = [];
        if (store.nfFile && !store.nfUploadResult) pending.push(store.uploadNfFile());
        if (store.boletoFile && !store.boletoUploadResult) pending.push(store.uploadBoletoFile());
        for (const e of store.extraFiles.filter(e => !e.result)) {
            pending.push(store.uploadExtraFile(e.id));
        }
        if (pending.length) await Promise.all(pending);

        const nf = store.nfUploadResult;
        const boleto = store.boletoUploadResult;
        const ent = enterpriseResolved.value || null;

        const extras = store.extraFiles
            .filter(e => e.result)
            .map(e => ({
                url: e.result.url,
                path: e.result.path,
                filename: e.result.fileName,
                mimeType: e.result.mimeType,
                uploadedAt: new Date().toISOString(),
            }));

        const payload = {
            // Empresa / empreendimento
            companyId: ent?.companyId || null,
            companyName: n(ent?.name),
            enterpriseId: ent?.erpId || null,
            enterpriseName: n(ent?.name),
            // Fornecedor
            providerName: n(form.value.providerName),
            providerCnpj: String(form.value.providerCnpj || '').replace(/\D/g, '') || null,
            // Tipo e orçamento
            launchType: form.value.launchType,
            budgetItem: n(form.value.budgetItem),
            budgetItemCode: n(form.value.budgetItemCode),
            financialAccountNumber: n(form.value.financialAccountNumber),
            allocationPercentage: form.value.allocationPercentage ?? 100,
            // Valor
            unitPrice: parseFloat(String(form.value.unitPrice).replace(',', '.')) || null,
            // Documento NF
            nfType: n(form.value.nfType),
            nfNumber: n(form.value.nfNumber),
            nfIssueDate: n(form.value.nfIssueDate),
            // Boleto
            boletoDueDate: n(form.value.boletoDueDate),
            boletoBarcode: n(form.value.boletoBarcode),
            boletoAmount: form.value.boletoAmount
                ? parseFloat(String(form.value.boletoAmount).replace(',', '.'))
                : null,
            // Vigência do contrato
            contractStartDate: n(form.value.contractStartDate),
            contractEndDate: n(form.value.contractEndDate),
            // Observações
            notes: n(form.value.notes),
            // Arquivos NF
            nfUrl: nf?.url || null,
            nfPath: nf?.path || null,
            nfFilename: nf?.fileName || null,
            // Arquivos Boleto
            boletoUrl: boleto?.url || null,
            boletoPath: boleto?.path || null,
            boletoFilename: boleto?.fileName || null,
            // Extras e IA
            extraAttachments: extras,
            aiExtractedData: { nf: store.nfPrefill || null, boleto: store.boletoPrefill || null },
            aiModel: store.nfMeta?.model || store.boletoMeta?.model || null,
            aiTokensUsed: (store.nfMeta?.tokensUsed || 0) + (store.boletoMeta?.tokensUsed || 0),
        };

        await store.createLaunch(payload);
        emit('created');
    } catch (e) {
        submitError.value = e.message || 'Erro ao salvar lançamento.';
    }
}

// ── Helpers de exibição ──────────────────────────────────────────────────────
function confidenceClass(c) {
    return c === 'alto'
        ? 'text-green-600 dark:text-green-400'
        : c === 'medio'
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-red-600 dark:text-red-400';
}

onMounted(async () => {
    await Promise.all([loadAllEnterprises(), store.fetchLaunchTypes()]);
});
</script>

<template>
    <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 py-8"
        @click.self="emit('close')">
        <div
            class="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
            <div
                class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl bg-gray-50 dark:bg-gray-800/50">
                <div>
                    <h2 class="text-lg font-bold text-gray-900 dark:text-white">Novo Lançamento</h2>
                    <p class="text-xs text-gray-500 mt-0.5">Campos preenchidos automaticamente pelo documento</p>
                </div>

                <button class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition text-gray-500"
                    @click="emit('close')">
                    <i class="fas fa-xmark"></i>
                </button>
            </div>

            <div class="px-6 py-5 space-y-6">
                <div>
                    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                        <i class="fas fa-paperclip text-gray-400"></i> Documentos
                    </h3>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                                Nota Fiscal
                            </div>

                            <label v-if="!store.nfFile"
                                class="flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed cursor-pointer transition"
                                :class="draggingNf
                                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/20'
                                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'"
                                @click="nfInputRef?.click()" @dragover.prevent="draggingNf = true"
                                @dragleave="draggingNf = false" @drop.prevent="onNfDrop">
                                <i class="fas fa-file-invoice text-2xl text-gray-300 dark:text-gray-600 mb-1"></i>
                                <span class="text-xs text-gray-500 dark:text-gray-400">
                                    {{ draggingNf ? 'Solte o arquivo aqui' : 'Clique ou arraste' }}
                                </span>
                                <span class="text-xs text-gray-400">NFe, NFS, NF, Recibo… (máx. 2 MB)</span>
                            </label>

                            <div v-else-if="store.nfUploading || store.nfExtracting"
                                class="h-28 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-center gap-2">
                                <i class="fas fa-spinner fa-spin text-blue-500"></i>
                                <div class="text-xs text-blue-600 dark:text-blue-300 text-center">
                                    <div v-if="store.nfUploading && store.nfExtracting">Enviando e analisando…</div>
                                    <div v-else-if="store.nfUploading">Enviando arquivo…</div>
                                    <div v-else>IA extraindo dados…</div>
                                </div>
                            </div>

                            <div v-else
                                class="h-28 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 flex flex-col justify-between">
                                <div class="flex items-start justify-between gap-2">
                                    <div class="flex items-center gap-2 min-w-0">
                                        <i class="fas fa-file-pdf text-red-400 flex-shrink-0"></i>
                                        <span class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                            {{ store.nfFile?.name }}
                                        </span>
                                    </div>

                                    <button class="text-gray-400 hover:text-red-500 flex-shrink-0 transition"
                                        @click="clearNfState">
                                        <i class="fas fa-xmark text-xs"></i>
                                    </button>
                                </div>

                                <div v-if="store.nfPrefill" class="text-xs space-y-0.5">
                                    <div v-if="store.nfPrefill.nfNumber" class="text-gray-500">
                                        Nº {{ store.nfPrefill.nfNumber }}
                                    </div>

                                    <div v-if="store.nfPrefill.unitPrice"
                                        class="font-semibold text-gray-700 dark:text-gray-200">
                                        {{
                                            Number(store.nfPrefill.unitPrice).toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL'
                                            })
                                        }}
                                    </div>

                                    <div class="flex items-center gap-1">
                                        <i class="fas fa-robot text-gray-300 text-xs"></i>
                                        <span :class="confidenceClass(store.nfMeta?.confidence)">
                                            {{ store.nfMeta?.confidence || '?' }}
                                        </span>
                                    </div>
                                </div>

                                <div v-else-if="store.nfError" class="text-xs text-red-500 truncate">
                                    {{ store.nfError }}
                                </div>

                                <div v-else class="text-xs text-gray-400">
                                    <i class="fas fa-circle-check text-emerald-500 mr-1"></i> Pronto
                                </div>
                            </div>

                            <div v-if="store.nfError && store.nfFile && !store.nfUploading"
                                class="mt-1 text-xs text-red-500 truncate">
                                {{ store.nfError }}
                            </div>
                        </div>

                        <div>
                            <div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                                Boleto
                            </div>

                            <label v-if="!store.boletoFile"
                                class="flex flex-col items-center justify-center h-28 rounded-xl border-2 border-dashed cursor-pointer transition"
                                :class="draggingBoleto
                                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/20'
                                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'"
                                @click="boletoInputRef?.click()" @dragover.prevent="draggingBoleto = true"
                                @dragleave="draggingBoleto = false" @drop.prevent="onBoletoDrop">
                                <i class="fas fa-barcode text-2xl text-gray-300 dark:text-gray-600 mb-1"></i>
                                <span class="text-xs text-gray-500 dark:text-gray-400">
                                    {{ draggingBoleto ? 'Solte o arquivo aqui' : 'Clique ou arraste' }}
                                </span>
                                <span class="text-xs text-gray-400">Boleto (máx. 2 MB)</span>
                            </label>

                            <div v-else-if="store.boletoUploading || store.boletoExtracting"
                                class="h-28 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-center gap-2">
                                <i class="fas fa-spinner fa-spin text-blue-500"></i>
                                <div class="text-xs text-blue-600 dark:text-blue-300 text-center">
                                    <div v-if="store.boletoUploading && store.boletoExtracting">Enviando e analisando…
                                    </div>
                                    <div v-else-if="store.boletoUploading">Enviando arquivo…</div>
                                    <div v-else>IA extraindo dados…</div>
                                </div>
                            </div>

                            <div v-else
                                class="h-28 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 flex flex-col justify-between">
                                <div class="flex items-start justify-between gap-2">
                                    <div class="flex items-center gap-2 min-w-0">
                                        <i class="fas fa-file-pdf text-red-400 flex-shrink-0"></i>
                                        <span class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                                            {{ store.boletoFile?.name }}
                                        </span>
                                    </div>

                                    <button class="text-gray-400 hover:text-red-500 flex-shrink-0 transition"
                                        @click="clearBoletoState">
                                        <i class="fas fa-xmark text-xs"></i>
                                    </button>
                                </div>

                                <div v-if="store.boletoPrefill" class="text-xs space-y-0.5">
                                    <div v-if="store.boletoPrefill.boletoDueDate" class="text-gray-500">
                                        Vence {{ store.boletoPrefill.boletoDueDate }}
                                    </div>

                                    <div v-if="store.boletoPrefill.boletoAmount"
                                        class="font-semibold text-gray-700 dark:text-gray-200">
                                        {{
                                            Number(store.boletoPrefill.boletoAmount).toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL'
                                            })
                                        }}
                                    </div>

                                    <div v-if="store.boletoPrefill.boletoBarcode"
                                        class="text-gray-400 font-mono truncate">
                                        {{ store.boletoPrefill.boletoBarcode.slice(0, 20) }}…
                                    </div>
                                </div>

                                <div v-else class="text-xs text-gray-400">
                                    <i class="fas fa-circle-check text-emerald-500 mr-1"></i> Pronto
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mt-3">
                        <div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                            Anexos Extras
                            <span class="text-gray-400 font-normal">(PDF, imagem — opcional, máx. 2 MB)</span>
                        </div>

                        <div class="flex flex-wrap gap-2 p-2 rounded-xl border-2 border-dashed transition min-h-[44px]"
                            :class="draggingExtra
                                ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 bg-transparent'"
                            @dragover.prevent="draggingExtra = true" @dragleave="draggingExtra = false"
                            @drop.prevent="onExtraDrop">
                            <div v-if="draggingExtra && !store.extraFiles.length"
                                class="w-full flex items-center justify-center py-1 text-xs text-blue-500">
                                Solte os arquivos aqui
                            </div>

                            <div v-for="entry in store.extraFiles" :key="entry.id"
                                class="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs"
                                :class="entry.error
                                    ? 'border-red-200 bg-red-50 dark:bg-red-900/20 text-red-600'
                                    : entry.uploading
                                        ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                                        : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'">
                                <i v-if="entry.uploading" class="fas fa-spinner fa-spin"></i>
                                <i v-else-if="entry.error" class="fas fa-triangle-exclamation"></i>
                                <i v-else class="fas fa-paperclip"></i>
                                <span class="max-w-28 truncate">{{ entry.file.name }}</span>

                                <button v-if="!entry.uploading" @click="store.removeExtraFile(entry.id)"
                                    class="hover:text-red-500 transition ml-0.5">
                                    <i class="fas fa-xmark"></i>
                                </button>
                            </div>

                            <button
                                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-500 transition"
                                @click="extraInputRef?.click()">
                                <i class="fas fa-plus"></i> Adicionar
                            </button>
                        </div>
                    </div>

                    <input ref="nfInputRef" type="file" accept="application/pdf" class="hidden"
                        @change="onNfSelected" />
                    <input ref="boletoInputRef" type="file" accept="application/pdf" class="hidden"
                        @change="onBoletoSelected" />
                    <input ref="extraInputRef" type="file" accept="application/pdf,image/*" multiple class="hidden"
                        @change="onExtrasSelected" />
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Tipo de Lançamento <span class="text-red-500">*</span>
                    </label>

                    <div class="flex items-center gap-2">
                        <select v-model="form.launchType" class="input-field flex-1">
                            <option value="">Selecione o tipo...</option>
                            <option v-for="t in store.launchTypes" :key="t.id" :value="t.name">{{ t.name }}</option>
                        </select>
                        <button v-if="isAdmin" type="button"
                            class="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition"
                            title="Adicionar novo tipo (admin)" @click="showAddType = !showAddType">
                            <i class="fas fa-plus text-sm"></i>
                        </button>
                    </div>

                    <!-- Tipo de Documento (read-only) -->
                    <div class="flex gap-2">
                        <div v-if="selectedDocumento" class="mt-2 flex items-center gap-2">
                            <span class="text-xs text-gray-500 dark:text-gray-400">Tipo de documento:</span>
                            <span
                                class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-mono font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                                {{ selectedDocumento }}
                            </span>
                        </div>
                        <!-- Tipo de Documento (read-only) -->
                        <div v-if="selectedDepartment" class="mt-2 flex items-center gap-2">
                            <span class="text-xs text-gray-500 dark:text-gray-400">Departamento:</span>
                            <span
                                class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-mono font-semibold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                                {{ selectedDepartment }}
                            </span>
                        </div>
                    </div>

                    <!-- Formulário inline para admin adicionar novo tipo -->
                    <div v-if="showAddType && isAdmin"
                        class="mt-3 p-3 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 space-y-2">
                        <div class="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                            <i class="fas fa-plus-circle"></i> Novo Tipo de Lançamento
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <input v-model="newTypeForm.name" type="text" placeholder="Nome *"
                                class="input-field text-xs" />
                            <input v-model="newTypeForm.documento" type="text" placeholder="Documento (ex: PREM)"
                                class="input-field text-xs font-mono" />
                            <input v-model="newTypeForm.budgetItem" type="text" placeholder="Item do orçamento"
                                class="input-field text-xs col-span-2" />
                            <input v-model="newTypeForm.budgetItemCode" type="text"
                                placeholder="Código item (ex: 80097)" class="input-field text-xs font-mono" />
                            <input v-model="newTypeForm.financialAccountNumber" type="text"
                                placeholder="Conta financeira (ex: 2.02.02.80)" class="input-field text-xs font-mono" />
                            <input v-model="newTypeForm.departamentoId" type="text"
                                placeholder="ID departamento Sienge (ex: 24)" class="input-field text-xs font-mono" />
                        </div>
                        <div v-if="addTypeError" class="text-xs text-red-600">{{ addTypeError }}</div>
                        <div class="flex gap-2">
                            <button type="button"
                                class="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-50"
                                :disabled="addTypeLoading || !newTypeForm.name?.trim()" @click="handleAddType">
                                <i v-if="addTypeLoading" class="fas fa-spinner fa-spin mr-1"></i>
                                Salvar
                            </button>
                            <button type="button"
                                class="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                @click="showAddType = false; addTypeError = null">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                        <i class="fas fa-building mr-1 opacity-50"></i>Empreendimento
                    </label>

                    <MultiSelector :model-value="selectedEnterpriseNames" @update:modelValue="onEnterpriseSelection"
                        :options="enterpriseOptions" placeholder="Selecionar empreendimento..." :page-size="150"
                        :single="true" />

                    <div v-if="enterpriseResolved"
                        class="mt-2 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
                        <div class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {{ enterpriseResolved.name }}
                        </div>

                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                            <span v-if="enterpriseResolved.companyId"
                                class="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                                Empresa:
                                <span class="text-gray-700 dark:text-gray-300">{{ enterpriseResolved.companyId }}</span>
                            </span>

                            <span v-if="enterpriseResolved.erpId"
                                class="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                                CC:
                                <span class="text-gray-700 dark:text-gray-300">{{ enterpriseResolved.erpId }}</span>
                            </span>

                            <span v-if="enterpriseResolved.city"
                                class="text-[11px] italic text-gray-400 dark:text-gray-500">
                                {{ enterpriseResolved.city }}
                            </span>
                        </div>
                    </div>

                    <div v-else-if="enterpriseSuggestion"
                        class="mt-2 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
                        <div class="text-xs text-amber-700 dark:text-amber-300">
                            <i class="fas fa-robot mr-1"></i>
                            Sugestão da IA: <strong>{{ enterpriseSuggestion.name }}</strong>
                        </div>
                    </div>

                    <p v-if="!enterpriseResolved && !enterpriseSuggestion && (store.nfPrefill || store.boletoPrefill)"
                        class="mt-1.5 text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1.5">
                        <i class="fas fa-triangle-exclamation"></i>
                        Empreendimento não identificado automaticamente — selecione abaixo.
                    </p>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="field-label">Fornecedor</label>
                        <input v-model="form.providerName" type="text" placeholder="Razão social" class="input-field" />
                    </div>

                    <div>
                        <label class="field-label">CNPJ</label>
                        <input :value="form.providerCnpj" type="text" placeholder="00.000.000/0000-00" maxlength="18"
                            class="input-field font-mono" @input="onCnpjInput" />
                    </div>
                </div>

                <div class="space-y-3">
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label class="field-label">Tipo Doc</label>
                            <MultiSelector v-model="selectedDocTypeLabel" :options="docTypeOptions"
                                placeholder="Busque por NFe, Fatura..." :single="true" class="text-xs" />
                        </div>

                        <div>
                            <label class="field-label">Nº Documento</label>
                            <input v-model="form.nfNumber" type="text" class="input-field font-mono !pb-[.75rem]" />
                        </div>

                        <div>
                            <label class="field-label">
                                Emissão NF
                                <span class="text-gray-400 font-normal">(doc)</span>
                            </label>
                            <input v-model="form.nfIssueDate" type="date" class="input-field !pb-[.75rem]" />
                        </div>

                        <div>
                            <label class="field-label">
                                Vencimento
                                <span class="text-gray-400 font-normal">(boleto)</span>
                            </label>
                            <input v-model="form.boletoDueDate" type="date" class="input-field !pb-[.75rem]" />
                        </div>
                    </div>

                    <div
                        class="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10 p-3 space-y-2">
                        <div class="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                            <i class="fas fa-file-contract text-blue-400"></i>
                            Vigência do Contrato Sienge
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="field-label">
                                    Início
                                    <span class="text-gray-400 font-normal">(padrão: hoje)</span>
                                </label>
                                <input v-model="form.contractStartDate" type="date" class="input-field" />
                            </div>

                            <div>
                                <label class="field-label">
                                    Término
                                    <span class="text-gray-400 font-normal">(padrão: 31/12)</span>
                                </label>
                                <input v-model="form.contractEndDate" type="date" class="input-field" />
                            </div>
                        </div>

                        <p class="text-xs text-blue-600/70 dark:text-blue-400/70">
                            Período utilizado na criação automática do contrato no Sienge. Independente das datas do
                            documento.
                        </p>
                    </div>
                </div>

                <div v-if="store.boletoFile || form.boletoBarcode"
                    class="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
                    <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Dados do Boleto
                    </div>

                    <div>
                        <label class="field-label">Linha Digitável / Código de Barras</label>
                        <input v-model="form.boletoBarcode" type="text" class="input-field font-mono text-xs" />
                    </div>

                    <div>
                        <label class="field-label">Valor Boleto R$</label>
                        <div class="relative">
                            <input v-model="form.boletoAmount" type="number" step="0.01" class="input-field pl-9" />
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="field-label">Item do Orçamento <span class="text-gray-400">(auto)</span></label>
                        <input v-model="form.budgetItem" type="text" disabled
                            class="input-field opacity-60 bg-gray-50 dark:bg-gray-800/50" />
                    </div>

                    <div>
                        <label class="field-label">Conta Financeira <span class="text-gray-400">(auto)</span></label>
                        <input v-model="form.financialAccountNumber" type="text" disabled
                            class="input-field opacity-60 font-mono bg-gray-50 dark:bg-gray-800/50" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="field-label">Valor do contrato R$ <span class="text-red-500">*</span></label>
                        <div class="relative">
                            <input v-model="form.unitPrice" type="number" step="0.01" min="0" placeholder="0,00"
                                class="input-field pl-9" />
                        </div>
                    </div>

                    <div>
                        <label class="field-label">% Alocação</label>
                        <input v-model="form.allocationPercentage" type="number" disabled
                            class="input-field opacity-60" />
                    </div>
                </div>

                <div>
                    <label class="field-label">Observações</label>
                    <textarea v-model="form.notes" rows="2" class="input-field resize-none"></textarea>
                </div>

                <div v-if="store.boletoUploading || store.boletoExtracting"
                    class="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                    <i class="fas fa-spinner fa-spin"></i> Aguardando conclusão do upload do boleto…
                </div>

                <div v-else-if="!hasBoleto" class="text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5">
                    <i class="fas fa-triangle-exclamation"></i>
                    Boleto é obrigatório. Envie o boleto (e NF, se houver) para salvar.
                </div>

                <div v-if="submitError"
                    class="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    <i class="fas fa-triangle-exclamation mr-2"></i>{{ submitError }}
                </div>
            </div>

            <div
                class="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 rounded-b-2xl bg-gray-50 dark:bg-gray-800/50">
                <button class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                    @click="emit('close')">
                    Cancelar
                </button>

                <button
                    class="px-5 py-2.5 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white transition disabled:cursor-not-allowed"
                    :disabled="!formValid || store.isProcessing" @click="handleSubmit">
                    <i v-if="store.isProcessing" class="fas fa-spinner fa-spin mr-2"></i>
                    {{ store.isProcessing ? 'Processando…' : 'Processar' }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.input-field {
    @apply w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-3 py-2 text-sm text-gray-900 dark:text-white outline-none transition focus:border-blue-500;
}

.field-label {
    @apply block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1;
}
</style>