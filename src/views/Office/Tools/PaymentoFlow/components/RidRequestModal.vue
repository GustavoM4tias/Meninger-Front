<script setup>
/**
 * RidRequestModal.vue
 * Modal com formulário completo da RID (Planilha de Qualificação de Fornecedores).
 * O usuário preenche os dados → sistema gera o DOCX → envia email automaticamente.
 */
import { ref, computed, reactive, nextTick } from 'vue';
import { usePaymentFlowStore } from '@/stores/Tools/PaymentFlow/paymentFlowStore';

const props = defineProps({
    launch: { type: Object, required: true },
});
const emit = defineEmits(['close']);

const store = usePaymentFlowStore();

// ── Estado do formulário ───────────────────────────────────────────────────────
const step = ref(1); // 1 = identificação, 2 = qualificação, 3 = revisão/envio

const form = reactive({
    // Seção 1 — Identificação
    razaoSocial: props.launch.providerName || '',
    cnpj: props.launch.providerCnpj || '',
    inscricaoEstadual: '',
    endereco: '',
    cep: '',
    cidade: '',
    bairro: '',
    estado: '',
    telefone: '',
    contato: '',
    servicoMaterial: '',
    email: '',
    classificacaoTributaria: '',

    // Seção 2.1 — Sistema de qualidade
    temSistemaQualidade: '',    // 'sim' | 'nao'
    qualSistema: '',

    // Seção 2.2 — Documentos
    alvaraFuncionamento: '',    // 'sim' | 'nao' | 'na'
    avcb: '',
    licencaOperacao: '',
    fispq: '',
    fornecedorControle: '',
    acreditacao: '',            // 'inmetro' | 'iso9001' | 'nao_certificada'

    // Seção 2.3 — Empresas fornecidas (mín. 1)
    empresas: [
        { razaoSocial: '', fone: '', contato: '' },
        { razaoSocial: '', fone: '', contato: '' },
        { razaoSocial: '', fone: '', contato: '' },
    ],

    // Seção 2.4 — Verificação do serviço
    verificacaoServico: '',
    verificacaoServicoAvaliacao: '',

    // Seção 2.5 — Visita às instalações
    visitaInstalacoes: '',
    visitaInstalacoesAvaliacao: '',

    // Seção 2.6 — Análise do curriculum
    analiseCurriculum: '',
    analiseCurriculumAvaliacao: '',

    // Seção 2.7 — Atende requisitos
    atendeRequisitos: '',
});

// ── Outros Anexos ─────────────────────────────────────────────────────────────
const outrosAnexos = ref([]);

function handleOutrosAnexos(e) {
    const files = Array.from(e.target.files || []);
    outrosAnexos.value.push(...files);
    e.target.value = ''; // limpa o input para permitir re-seleção do mesmo arquivo
}

function removerAnexo(idx) {
    outrosAnexos.value.splice(idx, 1);
}

// ── ViaCEP ────────────────────────────────────────────────────────────────────
const fetchingCep = ref(false);

async function buscarCep() {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    fetchingCep.value = true;
    try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
            if (data.logradouro) form.endereco = data.logradouro;
            if (data.localidade) form.cidade   = data.localidade;
            if (data.bairro)     form.bairro   = data.bairro;
            if (data.uf)         form.estado   = data.uf;
        }
    } catch (_) { /* silencioso */ } finally {
        fetchingCep.value = false;
    }
}

// ── Validação ─────────────────────────────────────────────────────────────────
const step1Valid = computed(() =>
    form.razaoSocial.trim() &&
    form.cnpj.trim() &&
    form.inscricaoEstadual.trim() &&
    form.endereco.trim() &&
    form.cep.trim() &&
    form.cidade.trim() &&
    form.bairro.trim() &&
    form.estado.trim() &&
    form.telefone.trim() &&
    form.contato.trim() &&
    form.servicoMaterial.trim() &&
    form.email.trim() &&
    form.classificacaoTributaria.trim()
);

const empresaValida = computed(() =>
    form.empresas.some(e => e.razaoSocial.trim())
);

const step2Valid = computed(() =>
    form.temSistemaQualidade &&
    form.alvaraFuncionamento &&
    form.avcb &&
    form.licencaOperacao &&
    form.fispq &&
    form.fornecedorControle &&
    form.acreditacao &&
    empresaValida.value &&
    form.verificacaoServico &&
    form.visitaInstalacoes &&
    form.analiseCurriculum &&
    form.atendeRequisitos
);

const emailAlreadySent = computed(() => !!props.launch.ridEmailSent);

const sentAtLabel = computed(() => {
    if (!props.launch.ridEmailSentAt) return null;
    return new Date(props.launch.ridEmailSentAt).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
});

// ── Ações ─────────────────────────────────────────────────────────────────────
async function handleSend() {
    try {
        await store.sendRidForm(props.launch.id, { ...form }, outrosAnexos.value);
    } catch (_) {
        // erro já capturado no store
    }
}

function handleClose() {
    emit('close');
    store.closeRidModal();
}

// ── Painel de perguntas ────────────────────────────────────────────────────────
const showQuestions = ref(false);
const copySuccess = ref(false);

const QUESTIONS_TEXT = `PLANILHA DE QUALIFICAÇÃO DE FORNECEDORES — RID

1. IDENTIFICAÇÃO DO FORNECEDOR
• Razão Social
• CNPJ
• Inscrição Estadual
• CEP / Endereço completo (Rua, Número, Bairro, Cidade, Estado)
• Telefone
• Nome do Contato
• Serviço ou Material que fornece
• E-mail
• Classificação Tributária (MEI / Simples Nacional / Lucro Presumido / Lucro Real / Isenta / Imune)

2. QUALIFICAÇÃO PARA FORNECIMENTO

2.1 Possui sistema de qualidade (ISO 9001 ou PBQP-H)?
     — Se sim, qual?

2.2 A empresa possui os seguintes documentos? (SIM / NÃO / Não se aplica)
     • Alvará de Funcionamento (Prefeitura Municipal)
     • Auto de Vistoria do Corpo de Bombeiros (AVCB)
     • Licença de Operação (CETESB, IBAMA, etc.)
     • Apresenta FISPQ ou similar dos produtos?
     • É fornecedor de controle tecnológico?
     • Tipo de acreditação: INMETRO / ISO 9001 / Não certificada

2.3 Informe ao menos 1 empresa para a qual fornece:
     (Razão Social, Telefone, Contato)

2.4 Verificação do serviço aplicado em outros locais (SIM / NÃO / Não se aplica)

2.5 Visita às instalações do fornecedor (SIM / NÃO / Não se aplica)

2.6 Análise do curriculum do fornecedor (SIM / NÃO / Não se aplica)

2.7 Atende aos requisitos de fornecimento da Empresa? (SIM / NÃO)`;

async function copyQuestions() {
    try {
        await navigator.clipboard.writeText(QUESTIONS_TEXT);
        copySuccess.value = true;
        setTimeout(() => { copySuccess.value = false; }, 2500);
    } catch (_) { /* silencioso */ }
}

// ── UI Helpers ────────────────────────────────────────────────────────────────
const SIM_NAO = [
    { value: 'sim', label: 'SIM' },
    { value: 'nao', label: 'NÃO' },
];
const SIM_NAO_NA = [
    { value: 'sim', label: 'SIM' },
    { value: 'nao', label: 'NÃO' },
    { value: 'na', label: 'Não se aplica' },
];
const ACREDITACAO = [
    { value: 'inmetro', label: 'INMETRO' },
    { value: 'iso9001', label: 'ISO 9001' },
    { value: 'nao_certificada', label: 'Não certificada' },
];
const CLASSIFICACAO_TRIBUTARIA = [
    { value: 'MEI', label: 'MEI' },
    { value: 'Simples Nacional', label: 'Simples Nacional' },
    { value: 'Lucro Presumido', label: 'Lucro Presumido' },
    { value: 'Lucro Real', label: 'Lucro Real' },
    { value: 'Lucro Arbitrado', label: 'Lucro Arbitrado' },
    { value: 'Isenta', label: 'Isenta' },
    { value: 'Imune', label: 'Imune' },
];
</script>

<template>
    <!-- Backdrop fixo -->
    <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" @click="handleClose"></div>

    <!-- Container de scroll -->
    <div class="fixed inset-0 z-50 overflow-y-auto" @click.self="handleClose">
        <div class="flex items-start justify-center p-4 pt-6 min-h-full">

            <!-- Modal -->
            <div
                class="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">

                <!-- Header sticky -->
                <div
                    class="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white sticky top-0 z-10">
                    <div class="flex items-center gap-3">
                        <i class="fas fa-user-plus text-lg"></i>
                        <div>
                            <div class="font-bold text-sm">Solicitar Cadastro de Fornecedor</div>
                            <div class="text-xs text-amber-100">Formulário RID — Planilha de Qualificação de Fornecedores
                            </div>
                        </div>
                    </div>
                    <button @click="handleClose"
                        class="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition">
                        <i class="fas fa-xmark text-sm"></i>
                    </button>
                </div>

                <!-- Fornecedor info + alerta -->
                <div class="px-6 pt-5">
                    <div
                        class="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-start gap-3">
                        <i class="fas fa-circle-xmark text-red-500 mt-0.5 flex-shrink-0"></i>
                        <div>
                            <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Fornecedor não
                                encontrado no Sienge</div>
                            <div class="text-sm font-semibold text-gray-900 dark:text-white">{{ launch.providerName || '—'
                                }}</div>
                            <div class="text-xs font-mono text-gray-500">{{ launch.providerCnpj || '—' }}</div>
                        </div>
                    </div>
                </div>

                <!-- Painel "Ver perguntas" — copiar para WhatsApp/email -->
                <div class="px-6 pt-4">
                    <button
                        type="button"
                        class="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition"
                        @click="showQuestions = !showQuestions">
                        <i class="fas fa-list-check text-sm"></i>
                        Ver perguntas para o fornecedor
                        <i :class="showQuestions ? 'fas fa-chevron-up' : 'fas fa-chevron-down'" class="text-[10px] ml-0.5"></i>
                    </button>

                    <div v-if="showQuestions"
                        class="mt-2 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 overflow-hidden">
                        <div class="flex items-center justify-between px-4 py-2.5 border-b border-amber-200 dark:border-amber-700">
                            <span class="text-xs font-semibold text-amber-700 dark:text-amber-300">
                                Campos que precisam ser preenchidos pelo fornecedor
                            </span>
                            <button
                                type="button"
                                class="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition"
                                :class="copySuccess
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white'"
                                @click="copyQuestions">
                                <i :class="copySuccess ? 'fas fa-check' : 'fas fa-copy'" class="text-[11px]"></i>
                                {{ copySuccess ? 'Copiado!' : 'Copiar perguntas' }}
                            </button>
                        </div>
                        <pre class="px-4 py-3 text-[11px] text-amber-900 dark:text-amber-100 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-64">{{ QUESTIONS_TEXT }}</pre>
                    </div>
                </div>

                <!-- Já enviado -->
                <div v-if="emailAlreadySent" class="px-6 py-5 space-y-4">
                    <div
                        class="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 px-4 py-4 space-y-2">
                        <div class="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-semibold text-sm">
                            <i class="fas fa-envelope-circle-check"></i>
                            Solicitação já enviada
                        </div>
                        <p class="text-xs text-blue-600 dark:text-blue-400">
                            O formulário RID foi gerado e o email enviado para
                            <strong>fornecedores@menin.com.br</strong> em <strong>{{ sentAtLabel }}</strong>.
                            <template v-if="launch.ridRequestedByEmail">
                                Uma cópia foi enviada para <strong>{{ launch.ridRequestedByEmail }}</strong>.
                            </template>
                        </p>
                        <p class="text-xs text-blue-500">
                            O sistema verificará automaticamente a cada 20 minutos se o fornecedor foi cadastrado.
                            Quando isso ocorrer, a esteira continuará para a etapa de contrato.
                        </p>
                    </div>
                    <div class="flex justify-end">
                        <button @click="handleClose"
                            class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                            Fechar
                        </button>
                    </div>
                </div>

                <!-- Formulário (quando ainda não enviou) -->
                <template v-else>

                    <!-- Steps indicator -->
                    <div class="px-6 pt-4 pb-2">
                        <div class="flex items-center gap-2">
                            <template v-for="(label, idx) in ['Identificação', 'Qualificação', 'Enviar']" :key="idx">
                                <button
                                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                    :class="step === idx + 1
                                        ? 'bg-amber-500 text-white shadow'
                                        : step > idx + 1
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'"
                                    @click="step > idx + 1 ? (step = idx + 1) : null">
                                    <i v-if="step > idx + 1" class="fas fa-check text-[10px]"></i>
                                    <span>{{ idx + 1 }}. {{ label }}</span>
                                </button>
                                <div v-if="idx < 2" class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                            </template>
                        </div>
                    </div>

                    <div class="px-6 py-4 space-y-4">

                        <!-- ═══════════════════ STEP 1: IDENTIFICAÇÃO ═══════════════════ -->
                        <template v-if="step === 1">
                            <div class="text-xs font-bold text-gray-500 uppercase tracking-wider">1. Identificação do
                                Fornecedor</div>

                            <div class="grid grid-cols-2 gap-3">
                                <div class="col-span-2">
                                    <label class="field-label">Razão Social *</label>
                                    <input v-model="form.razaoSocial" class="field-input" placeholder="Nome completo da empresa" />
                                </div>
                                <div>
                                    <label class="field-label">CNPJ *</label>
                                    <input v-model="form.cnpj" class="field-input" placeholder="00.000.000/0000-00" />
                                </div>
                                <div>
                                    <label class="field-label">Inscrição Estadual *</label>
                                    <input v-model="form.inscricaoEstadual" class="field-input" placeholder="Número ou ISENTO" />
                                </div>

                                <!-- CEP com busca automática ViaCEP -->
                                <div>
                                    <label class="field-label">CEP *</label>
                                    <div class="relative">
                                        <input
                                            v-model="form.cep"
                                            class="field-input pr-8"
                                            placeholder="00000-000"
                                            @blur="buscarCep"
                                        />
                                        <span v-if="fetchingCep" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-500">
                                            <i class="fas fa-spinner fa-spin text-xs"></i>
                                        </span>
                                    </div>
                                </div>

                                <div class="col-span-2">
                                    <label class="field-label">Endereço *</label>
                                    <input v-model="form.endereco" class="field-input" placeholder="Rua, número — preenchido pelo CEP" />
                                </div>

                                <div>
                                    <label class="field-label">Cidade *</label>
                                    <input v-model="form.cidade" class="field-input" placeholder="Preenchido pelo CEP" />
                                </div>
                                
                                <div>
                                    <label class="field-label">Bairro *</label>
                                    <input v-model="form.bairro" class="field-input" placeholder="Preenchido pelo CEP" />
                                </div>
                                
                                <div>
                                    <label class="field-label">Estado *</label>
                                    <input v-model="form.estado" class="field-input" placeholder="SP" maxlength="2" />
                                </div>

                                <div>
                                    <label class="field-label">Telefone *</label>
                                    <input v-model="form.telefone" class="field-input" placeholder="(11) 99999-9999" />
                                </div>
                                <div>
                                    <label class="field-label">Contato *</label>
                                    <input v-model="form.contato" class="field-input" placeholder="Nome da pessoa" />
                                </div>

                                <div class="col-span-2">
                                    <label class="field-label">Serviço / Material que fornece *</label>
                                    <input v-model="form.servicoMaterial" class="field-input" placeholder="Ex: Concreto usinado, Mão de obra civil..." />
                                </div>
                                <div class="col-span-2">
                                    <label class="field-label">E-mail *</label>
                                    <input v-model="form.email" type="email" class="field-input" placeholder="contato@fornecedor.com.br" />
                                </div>
                                <div class="col-span-2">
                                    <label class="field-label">Classificação Tributária *</label>
                                    <select v-model="form.classificacaoTributaria" class="field-input">
                                        <option value="" disabled>Selecione...</option>
                                        <option v-for="op in CLASSIFICACAO_TRIBUTARIA" :key="op.value" :value="op.value">
                                            {{ op.label }}
                                        </option>
                                    </select>
                                </div>
                            </div>

                            <div class="flex justify-end pt-1">
                                <button @click="step = 2" :disabled="!step1Valid"
                                    class="btn-primary" :class="!step1Valid ? 'opacity-40 cursor-not-allowed' : ''">
                                    Próximo <i class="fas fa-arrow-right ml-1"></i>
                                </button>
                            </div>
                        </template>

                        <!-- ═══════════════════ STEP 2: QUALIFICAÇÃO ═══════════════════ -->
                        <template v-else-if="step === 2">
                            <div class="text-xs font-bold text-gray-500 uppercase tracking-wider">2. Qualificação para
                                Fornecimento</div>

                            <!-- 2.1 Sistema de qualidade -->
                            <div class="form-group">
                                <label class="field-label">2.1. Tem sistema da qualidade (ISO 9001 ou PBQP-H)? *</label>
                                <div class="radio-row">
                                    <label v-for="op in SIM_NAO" :key="op.value" class="radio-opt">
                                        <input type="radio" v-model="form.temSistemaQualidade" :value="op.value" />
                                        {{ op.label }}
                                    </label>
                                </div>
                                <div v-if="form.temSistemaQualidade === 'sim'" class="mt-2">
                                    <label class="field-label">Qual sistema?</label>
                                    <input v-model="form.qualSistema" class="field-input" placeholder="Ex: ISO 9001:2015, PBQP-H nível A..." />
                                </div>
                            </div>

                            <!-- 2.2 Documentos -->
                            <div class="form-group">
                                <label class="field-label mb-2 block">2.2. A empresa possui os seguintes documentos? *</label>
                                <div class="space-y-2">
                                    <div v-for="item in [
                                        { key: 'alvaraFuncionamento', label: 'Alvará de funcionamento (Prefeitura Municipal)' },
                                        { key: 'avcb', label: 'Auto de Vistoria do Corpo de Bombeiros (AVCB)' },
                                        { key: 'licencaOperacao', label: 'Licença de Operação (CETESB, IBAMA, etc.)' },
                                        { key: 'fispq', label: 'Apresenta FISPQ ou similar dos produtos?' },
                                        { key: 'fornecedorControle', label: 'É fornecedor de controle tecnológico?' },
                                    ]" :key="item.key"
                                        class="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
                                        <span class="text-xs text-gray-700 dark:text-gray-300 flex-1">{{ item.label }}</span>
                                        <div class="radio-row shrink-0">
                                            <label v-for="op in SIM_NAO_NA" :key="op.value" class="radio-opt">
                                                <input type="radio" v-model="form[item.key]" :value="op.value" />
                                                <span class="whitespace-nowrap">{{ op.label }}</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <!-- Subitem acreditação -->
                                <div class="mt-3">
                                    <label class="field-label">Se acreditada — tipo de acreditação: *</label>
                                    <div class="radio-row">
                                        <label v-for="op in ACREDITACAO" :key="op.value" class="radio-opt">
                                            <input type="radio" v-model="form.acreditacao" :value="op.value" />
                                            {{ op.label }}
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <!-- 2.3 Empresas fornecidas -->
                            <div class="form-group">
                                <label class="field-label mb-1 block">2.3. Empresas para as quais fornece <span
                                        class="text-red-500">*</span> (ao menos 1)</label>
                                <div class="space-y-2">
                                    <div v-for="(emp, idx) in form.empresas" :key="idx"
                                        class="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                                        <div>
                                            <label class="field-label text-[10px]">Razão Social</label>
                                            <input v-model="emp.razaoSocial" class="field-input text-xs" :placeholder="idx === 0 ? 'Obrigatório' : 'Opcional'" />
                                        </div>
                                        <div>
                                            <label class="field-label text-[10px]">Telefone</label>
                                            <input v-model="emp.fone" class="field-input text-xs" />
                                        </div>
                                        <div>
                                            <label class="field-label text-[10px]">Contato</label>
                                            <input v-model="emp.contato" class="field-input text-xs" />
                                        </div>
                                    </div>
                                </div>
                                <p v-if="!empresaValida" class="text-xs text-red-500 mt-1">
                                    <i class="fas fa-triangle-exclamation mr-1"></i>Informe ao menos 1 empresa
                                </p>
                            </div>

                            <!-- 2.4 Verificação do serviço -->
                            <div class="form-group">
                                <label class="field-label">2.4. Verificação do serviço aplicado em outros locais: *</label>
                                <div class="radio-row">
                                    <label v-for="op in SIM_NAO_NA" :key="op.value" class="radio-opt">
                                        <input type="radio" v-model="form.verificacaoServico" :value="op.value" />
                                        {{ op.label }}
                                    </label>
                                </div>
                                <div v-if="form.verificacaoServico === 'sim'" class="mt-2">
                                    <label class="field-label">Avaliação</label>
                                    <input v-model="form.verificacaoServicoAvaliacao" class="field-input" />
                                </div>
                            </div>

                            <!-- 2.5 Visita -->
                            <div class="form-group">
                                <label class="field-label">2.5. Visita às instalações do fornecedor: *</label>
                                <div class="radio-row">
                                    <label v-for="op in SIM_NAO_NA" :key="op.value" class="radio-opt">
                                        <input type="radio" v-model="form.visitaInstalacoes" :value="op.value" />
                                        {{ op.label }}
                                    </label>
                                </div>
                                <div v-if="form.visitaInstalacoes === 'sim'" class="mt-2">
                                    <label class="field-label">Avaliação</label>
                                    <input v-model="form.visitaInstalacoesAvaliacao" class="field-input" />
                                </div>
                            </div>

                            <!-- 2.6 Curriculum -->
                            <div class="form-group">
                                <label class="field-label">2.6. Análise do curriculum do fornecedor: *</label>
                                <div class="radio-row">
                                    <label v-for="op in SIM_NAO_NA" :key="op.value" class="radio-opt">
                                        <input type="radio" v-model="form.analiseCurriculum" :value="op.value" />
                                        {{ op.label }}
                                    </label>
                                </div>
                                <div v-if="form.analiseCurriculum === 'sim'" class="mt-2">
                                    <label class="field-label">Avaliação</label>
                                    <input v-model="form.analiseCurriculumAvaliacao" class="field-input" />
                                </div>
                            </div>

                            <!-- 2.7 Atende requisitos -->
                            <div class="form-group">
                                <label class="field-label">2.7. Atende aos requisitos de fornecimento da Empresa? *</label>
                                <div class="radio-row">
                                    <label v-for="op in SIM_NAO" :key="op.value" class="radio-opt">
                                        <input type="radio" v-model="form.atendeRequisitos" :value="op.value" />
                                        {{ op.label }}
                                    </label>
                                </div>
                            </div>

                            <div class="flex justify-between pt-1">
                                <button @click="step = 1" class="btn-secondary">
                                    <i class="fas fa-arrow-left mr-1"></i> Voltar
                                </button>
                                <button @click="step = 3" :disabled="!step2Valid"
                                    class="btn-primary" :class="!step2Valid ? 'opacity-40 cursor-not-allowed' : ''">
                                    Revisar e Enviar <i class="fas fa-arrow-right ml-1"></i>
                                </button>
                            </div>
                        </template>

                        <!-- ═══════════════════ STEP 3: REVISÃO E ENVIO ═══════════════════ -->
                        <template v-else-if="step === 3">
                            <div class="text-xs font-bold text-gray-500 uppercase tracking-wider">Revisar e Enviar</div>

                            <!-- Resumo identificação -->
                            <div class="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 space-y-1 text-xs">
                                <div class="font-semibold text-gray-700 dark:text-gray-200 mb-2">Identificação do Fornecedor
                                </div>
                                <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400">
                                    <div><span class="font-medium text-gray-700 dark:text-gray-300">Razão Social:</span> {{ form.razaoSocial }}</div>
                                    <div><span class="font-medium text-gray-700 dark:text-gray-300">CNPJ:</span> {{ form.cnpj }}</div>
                                    <div><span class="font-medium text-gray-700 dark:text-gray-300">Insc. Estadual:</span> {{ form.inscricaoEstadual }}</div>
                                    <div><span class="font-medium text-gray-700 dark:text-gray-300">Telefone:</span> {{ form.telefone }}</div>
                                    <div class="col-span-2"><span class="font-medium text-gray-700 dark:text-gray-300">Endereço:</span> {{ form.endereco }}, — {{ form.cep }}, {{ form.bairro }} {{ form.cidade }}/{{ form.estado }}</div>
                                    <div><span class="font-medium text-gray-700 dark:text-gray-300">Classif. Tributária:</span> {{ form.classificacaoTributaria }}</div>
                                    <div class="col-span-2"><span class="font-medium text-gray-700 dark:text-gray-300">Serviço/Material:</span> {{ form.servicoMaterial }}</div>
                                    <div class="col-span-2"><span class="font-medium text-gray-700 dark:text-gray-300">E-mail:</span> {{ form.email }}</div>
                                </div>
                            </div>

                            <!-- Outros Anexos -->
                            <div class="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                                <div class="font-semibold text-xs text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    <i class="fas fa-paperclip text-gray-400"></i>
                                    Outros Anexos
                                    <span class="text-gray-400 font-normal">(opcional)</span>
                                </div>
                                <p class="text-xs text-gray-500 dark:text-gray-400">
                                    Documentos adicionais que serão enviados junto com a RID no email.
                                </p>

                                <!-- Lista de arquivos selecionados -->
                                <div v-if="outrosAnexos.length" class="space-y-1">
                                    <div v-for="(file, idx) in outrosAnexos" :key="idx"
                                        class="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600">
                                        <span class="text-gray-700 dark:text-gray-200 truncate">
                                            <i class="fas fa-file mr-1.5 text-gray-400"></i>{{ file.name }}
                                        </span>
                                        <button @click="removerAnexo(idx)"
                                            class="ml-2 text-red-400 hover:text-red-600 transition flex-shrink-0">
                                            <i class="fas fa-xmark"></i>
                                        </button>
                                    </div>
                                </div>

                                <!-- Botão adicionar -->
                                <label
                                    class="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-300 text-xs font-medium transition">
                                    <i class="fas fa-plus text-[10px]"></i>
                                    Adicionar arquivo
                                    <input type="file" class="hidden" multiple @change="handleOutrosAnexos" />
                                </label>
                            </div>

                            <!-- Aviso do email -->
                            <div class="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-4 py-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                                <div class="font-semibold flex items-center gap-2">
                                    <i class="fas fa-paper-plane"></i> O que acontece ao enviar:
                                </div>
                                <ul class="list-disc list-inside space-y-0.5 text-amber-600 dark:text-amber-500">
                                    <li>O sistema gera automaticamente o documento RID preenchido (Word)</li>
                                    <li>Envia por email para <strong>fornecedores@menin.com.br</strong></li>
                                    <li>Você recebe uma cópia no seu email</li>
                                    <li v-if="outrosAnexos.length">
                                        {{ outrosAnexos.length }} anexo{{ outrosAnexos.length > 1 ? 's adicional será incluído' : ' adicional serão incluídos' }} no email
                                    </li>
                                    <li>A cada 20 minutos o sistema verifica se o cadastro foi concluído</li>
                                </ul>
                            </div>

                            <!-- Erro -->
                            <div v-if="store.ridError"
                                class="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                                <i class="fas fa-triangle-exclamation"></i>
                                {{ store.ridError }}
                            </div>

                            <!-- Sucesso -->
                            <div v-if="store.ridSuccess"
                                class="px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                                <i class="fas fa-circle-check"></i>
                                {{ store.ridSuccess }}
                            </div>

                            <div class="flex justify-between pt-1">
                                <button @click="step = 2" :disabled="store.ridSending || !!store.ridSuccess"
                                    class="btn-secondary" :class="store.ridSending || !!store.ridSuccess ? 'opacity-40 cursor-not-allowed' : ''">
                                    <i class="fas fa-arrow-left mr-1"></i> Voltar
                                </button>
                                <button @click="handleSend"
                                    :disabled="store.ridSending || !!store.ridSuccess"
                                    class="btn-primary px-6"
                                    :class="store.ridSending || !!store.ridSuccess ? 'opacity-60 cursor-not-allowed' : ''">
                                    <i :class="store.ridSending ? 'fas fa-spinner fa-spin' : store.ridSuccess ? 'fas fa-check' : 'fas fa-paper-plane'" class="mr-2"></i>
                                    {{ store.ridSending ? 'Gerando e enviando...' : store.ridSuccess ? 'Enviado!' : 'Gerar RID e enviar email' }}
                                </button>
                            </div>
                        </template>

                    </div><!-- /px-6 py-4 -->

                    <!-- Info automação -->
                    <div class="mx-6 mb-5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-start gap-3">
                        <i class="fas fa-robot text-gray-400 mt-0.5 flex-shrink-0 text-sm"></i>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            Após o envio, o sistema verificará a cada
                            <strong class="text-gray-700 dark:text-gray-300">20 minutos</strong>
                            se o fornecedor foi cadastrado no Sienge.
                            Quando cadastrado, a esteira continuará automaticamente para contrato.
                        </p>
                    </div>

                </template><!-- /v-else (não enviado) -->
            </div>

        </div>
    </div>
</template>

<style scoped>
.field-label {
    @apply block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1;
}

.field-input {
    @apply w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 transition;
}

.form-group {
    @apply space-y-1.5;
}

.radio-row {
    @apply flex flex-wrap items-center gap-3;
}

.radio-opt {
    @apply flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none;
}

.radio-opt input[type="radio"] {
    @apply h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer;
}

.btn-primary {
    @apply inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold shadow transition;
}

.btn-secondary {
    @apply inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition;
}
</style>
