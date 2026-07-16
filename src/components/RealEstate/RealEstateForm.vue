<script setup>
// Formulário de cadastro de imobiliária + gerente, compartilhado entre a tela
// do Office e a página pública do convite (lp.menin.com.br/imobiliaria/<token>).
// A chamada de parse do cartão CNPJ é injetada via prop (autenticada no Office,
// pública no convite). O componente só coleta/valida; quem envia é o pai.

import { reactive, ref, watch, computed } from 'vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Button from '@/components/UI/Button.vue';

const props = defineProps({
    // async (file) => dados extraídos do cartão CNPJ
    parseCard: { type: Function, required: true },
    submitting: { type: Boolean, default: false },
    submitLabel: { type: String, default: 'Cadastrar imobiliária' },
    serverError: { type: String, default: '' },
});

const emit = defineEmits(['submit']);

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
    .map(uf => ({ value: uf, label: uf }));

const imob = reactive({
    nome: '', sigla: '', razao_social: '', cnpj: '', creci: '', validade_creci: '',
    micro_empresa: false, escala_plantao: true,
    email: '', telefone: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
});

const ger = reactive({
    nome: '', documento: '', email: '', data_nasc: '', celular: '', telefone: '', creci: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
});

// ── Sigla automática (1 palavra = 2 primeiras letras; 2+ = iniciais das 2 primeiras) ──
const siglaTouched = ref(false);
function suggestSigla(nome) {
    const words = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '';
    return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}
watch(() => imob.nome, (nome) => {
    if (!siglaTouched.value) imob.sigla = suggestSigla(nome);
});

// ── Máscaras leves ───────────────────────────────────────────────────────────
const onlyDigits = (s) => String(s || '').replace(/\D/g, '');
function maskCnpj(v) {
    const d = onlyDigits(v).slice(0, 14);
    return d
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
}
function maskCpf(v) {
    const d = onlyDigits(v).slice(0, 11);
    return d
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}
function maskPhone(v) {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
    return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

// ── Upload do cartão CNPJ ────────────────────────────────────────────────────
const fileInput = ref(null);
const dragging = ref(false);
const parsing = ref(false);
const parseError = ref('');
const parsedFileName = ref('');

function pickFile() { fileInput.value?.click(); }
function onFileSelected(e) {
    const file = e.target.files?.[0];
    if (file) handleCardFile(file);
    e.target.value = '';
}
function onDrop(e) {
    dragging.value = false;
    const file = e.dataTransfer?.files?.[0];
    if (file) handleCardFile(file);
}

async function handleCardFile(file) {
    parseError.value = '';
    if (file.type !== 'application/pdf') {
        parseError.value = 'Envie o cartão CNPJ em PDF.';
        return;
    }
    parsing.value = true;
    try {
        const data = await props.parseCard(file);
        applyCardData(data);
        parsedFileName.value = file.name;
    } catch (err) {
        parseError.value = err?.message || 'Não foi possível ler este PDF. Preencha manualmente.';
    } finally {
        parsing.value = false;
    }
}

function applyCardData(data) {
    if (!data) return;
    const set = (key, value) => { if (value) imob[key] = value; };
    set('cnpj', maskCnpj(data.cnpj));
    set('razao_social', data.razao_social);
    set('nome', data.nome_fantasia || data.razao_social);
    set('email', data.email);
    set('telefone', data.telefone);
    set('logradouro', data.logradouro);
    set('numero', data.numero);
    set('complemento', data.complemento);
    set('bairro', data.bairro);
    set('cidade', data.cidade);
    set('estado', data.estado);
    set('cep', data.cep);
    if (data.micro_empresa) imob.micro_empresa = data.micro_empresa === 'S';
}

// ── Copiar dados da imobiliária para o gerente ───────────────────────────────
function copyFromImobiliaria() {
    ger.email = ger.email || imob.email;
    ger.celular = ger.celular || imob.telefone;
    ger.telefone = ger.telefone || imob.telefone;
    ger.creci = ger.creci || imob.creci;
    ger.cep = ger.cep || imob.cep;
    ger.logradouro = ger.logradouro || imob.logradouro;
    ger.numero = ger.numero || imob.numero;
    ger.complemento = ger.complemento || imob.complemento;
    ger.bairro = ger.bairro || imob.bairro;
    ger.cidade = ger.cidade || imob.cidade;
    ger.estado = ger.estado || imob.estado;
}

// ── Validação ────────────────────────────────────────────────────────────────
const errors = ref([]);

function validate() {
    const errs = [];
    if (!imob.nome.trim()) errs.push('Informe o nome da imobiliária.');
    if (!imob.razao_social.trim()) errs.push('Informe a razão social.');
    if (onlyDigits(imob.cnpj).length !== 14) errs.push('CNPJ incompleto.');
    if (!imob.creci.trim()) errs.push('Informe o CRECI da imobiliária.');
    if (!ger.nome.trim()) errs.push('Informe o nome do gerente.');
    if (onlyDigits(ger.documento).length !== 11) errs.push('CPF do gerente incompleto.');
    if (!/^\S+@\S+\.\S+$/.test(ger.email.trim())) errs.push('E-mail do gerente inválido.');
    if (!ger.data_nasc) errs.push('Informe a data de nascimento do gerente.');
    if (onlyDigits(ger.celular).length < 10) errs.push('Celular do gerente incompleto.');
    return errs;
}

function submit() {
    errors.value = validate();
    if (errors.value.length) return;
    emit('submit', {
        imobiliaria: {
            ...imob,
            micro_empresa: imob.micro_empresa ? 'S' : 'N',
            escala_plantao: imob.escala_plantao ? 'S' : 'N',
        },
        gerente: { ...ger },
    });
}

const nextYearHint = computed(() => `Se ficar vazio, usamos 31/12/${new Date().getFullYear() + 1}.`);
</script>

<template>
    <form class="space-y-8" @submit.prevent="submit">
        <!-- Cartão CNPJ -->
        <section>
            <h3 class="text-sm font-semibold text-ink mb-1">Cartão CNPJ</h3>
            <p class="text-xs text-ink-muted mb-3">
                Envie o cartão CNPJ (PDF da Receita Federal) para preencher os dados automaticamente. Todos os campos continuam editáveis.
            </p>
            <div
                class="rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors"
                :class="dragging ? 'border-accent bg-accent-soft' : 'border-line hover:border-accent/60'"
                @click="pickFile"
                @dragover.prevent="dragging = true"
                @dragleave.prevent="dragging = false"
                @drop.prevent="onDrop"
            >
                <input ref="fileInput" type="file" accept="application/pdf" class="hidden" @change="onFileSelected" />
                <template v-if="parsing">
                    <i class="fas fa-circle-notch fa-spin text-accent text-lg"></i>
                    <p class="mt-2 text-sm text-ink-muted">Lendo o cartão CNPJ...</p>
                </template>
                <template v-else-if="parsedFileName">
                    <i class="fas fa-file-circle-check text-emerald-500 text-lg"></i>
                    <p class="mt-2 text-sm text-ink">{{ parsedFileName }}</p>
                    <p class="text-xs text-ink-muted">Dados aplicados. Toque para enviar outro arquivo.</p>
                </template>
                <template v-else>
                    <i class="fas fa-file-arrow-up text-ink-subtle text-lg"></i>
                    <p class="mt-2 text-sm text-ink">Toque para escolher o PDF ou arraste aqui</p>
                    <p class="text-xs text-ink-muted">Somente PDF, até 10 MB</p>
                </template>
            </div>
            <p v-if="parseError" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
                <i class="fas fa-triangle-exclamation mr-1"></i>{{ parseError }}
            </p>
        </section>

        <!-- Dados da imobiliária -->
        <section>
            <h3 class="text-sm font-semibold text-ink mb-3">Dados da imobiliária</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input v-model="imob.nome" label="Nome (fantasia)" required placeholder="Ex.: Menin Imóveis" class="sm:col-span-2" />
                <Input v-model="imob.razao_social" label="Razão social" required placeholder="Como consta no cartão CNPJ" class="sm:col-span-2" />
                <Input
                    :model-value="imob.cnpj"
                    label="CNPJ" required placeholder="00.000.000/0000-00"
                    @update:model-value="v => imob.cnpj = maskCnpj(v)"
                />
                <Input
                    :model-value="imob.sigla"
                    label="Sigla" required hint="Sugerida a partir do nome; pode ajustar."
                    @update:model-value="v => { siglaTouched = true; imob.sigla = String(v).toUpperCase().slice(0, 10); }"
                />
                <Input v-model="imob.creci" label="CRECI da imobiliária" required placeholder="Ex.: 12345-J" />
                <Input v-model="imob.validade_creci" type="date" label="Validade do CRECI" :hint="nextYearHint" />
                <Input v-model="imob.email" type="email" label="E-mail" placeholder="contato@imobiliaria.com.br" />
                <Input
                    :model-value="imob.telefone"
                    label="Telefone" placeholder="(00) 00000-0000"
                    @update:model-value="v => imob.telefone = maskPhone(v)"
                />
                <div class="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Switch v-model="imob.micro_empresa" label="Microempresa (ME/EPP)" description="Vem preenchido pelo porte do cartão CNPJ." />
                    <Switch v-model="imob.escala_plantao" label="Administra escala de plantão" description="Padrão: sim." />
                </div>
            </div>
        </section>

        <!-- Endereço da imobiliária -->
        <section>
            <h3 class="text-sm font-semibold text-ink mb-3">Endereço da imobiliária</h3>
            <div class="grid grid-cols-2 sm:grid-cols-6 gap-4">
                <Input v-model="imob.cep" label="CEP" class="col-span-1 sm:col-span-2" />
                <Input v-model="imob.logradouro" label="Logradouro" class="col-span-1 sm:col-span-4" />
                <Input v-model="imob.numero" label="Número" class="col-span-1 sm:col-span-1" />
                <Input v-model="imob.complemento" label="Complemento" class="col-span-1 sm:col-span-2" />
                <Input v-model="imob.bairro" label="Bairro" class="col-span-2 sm:col-span-3" />
                <Input v-model="imob.cidade" label="Cidade" class="col-span-1 sm:col-span-4" />
                <Select v-model="imob.estado" :options="UFS" label="UF" placeholder="UF" class="col-span-1 sm:col-span-2" />
            </div>
        </section>

        <!-- Gerente -->
        <section>
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                    <h3 class="text-sm font-semibold text-ink">Gerente da imobiliária</h3>
                    <p class="text-xs text-ink-muted">Usuário que vai administrar a imobiliária no painel.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" icon="fas fa-copy" @click="copyFromImobiliaria">
                    Copiar dados da imobiliária
                </Button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input v-model="ger.nome" label="Nome completo" required class="sm:col-span-2" />
                <Input
                    :model-value="ger.documento"
                    label="CPF" required placeholder="000.000.000-00"
                    @update:model-value="v => ger.documento = maskCpf(v)"
                />
                <Input v-model="ger.data_nasc" type="date" label="Data de nascimento" required />
                <Input v-model="ger.email" type="email" label="E-mail" required />
                <Input
                    :model-value="ger.celular"
                    label="Celular" required placeholder="(00) 00000-0000"
                    @update:model-value="v => ger.celular = maskPhone(v)"
                />
                <Input
                    :model-value="ger.telefone"
                    label="Telefone" hint="Se vazio, usamos o celular."
                    @update:model-value="v => ger.telefone = maskPhone(v)"
                />
                <Input v-model="ger.creci" label="CRECI do gerente" hint="Opcional." />
            </div>
            <details class="mt-4 group">
                <summary class="text-xs font-medium text-accent cursor-pointer select-none">
                    <i class="fas fa-chevron-right mr-1 transition-transform group-open:rotate-90"></i>
                    Endereço do gerente (opcional)
                </summary>
                <div class="grid grid-cols-2 sm:grid-cols-6 gap-4 mt-3">
                    <Input v-model="ger.cep" label="CEP" class="col-span-1 sm:col-span-2" />
                    <Input v-model="ger.logradouro" label="Logradouro" class="col-span-1 sm:col-span-4" />
                    <Input v-model="ger.numero" label="Número" class="col-span-1 sm:col-span-1" />
                    <Input v-model="ger.complemento" label="Complemento" class="col-span-1 sm:col-span-2" />
                    <Input v-model="ger.bairro" label="Bairro" class="col-span-2 sm:col-span-3" />
                    <Input v-model="ger.cidade" label="Cidade" class="col-span-1 sm:col-span-4" />
                    <Select v-model="ger.estado" :options="UFS" label="UF" placeholder="UF" class="col-span-1 sm:col-span-2" />
                </div>
            </details>
        </section>

        <!-- Erros -->
        <div v-if="errors.length || serverError" class="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 p-3">
            <p v-if="serverError" class="text-sm text-red-700 dark:text-red-300 font-medium">{{ serverError }}</p>
            <ul class="text-sm text-red-700 dark:text-red-300 list-disc list-inside space-y-0.5">
                <li v-for="e in errors" :key="e">{{ e }}</li>
            </ul>
        </div>

        <Button type="submit" variant="primary" block :loading="submitting" icon="fas fa-house-flag">
            {{ submitLabel }}
        </Button>
    </form>
</template>
