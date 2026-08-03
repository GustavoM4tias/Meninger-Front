<script setup>
// Cadastro de pessoas em lote a partir de texto colado.
//
// O fluxo tem 2 passos de propósito: colar -> REVISAR -> enviar. A revisão não
// é enfeite: o CV não tem edição nem exclusão por integração, então um nome ou
// CPF errado só se conserta excluindo na tela do CV e cadastrando de novo.
// Melhor gastar 10 segundos conferindo do que refazer.

import { computed, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useCorrespondentStore } from '@/stores/Comercial/Correspondents/correspondentStore';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['close']);

const store = useCorrespondentStore();
const toast = useToast();

const passo = ref('colar');   // colar | revisar | resultado
const empresaId = ref('');
const texto = ref('');
const pessoas = ref([]);
const ignorados = ref([]);
const analisando = ref(false);
const resultado = ref(null);

const empresaOptions = computed(() =>
    store.empresasVinculadas.map(e => ({
        value: String(e.id),
        label: `${e.nome}${e.cidade ? ` - ${e.cidade}` : ''} (#${e.cv_idempresa})`,
    })));

const semEmpresa = computed(() => !empresaOptions.value.length);

const selecionadas = computed(() => pessoas.value.filter(p => p.incluir));
const podeEnviar = computed(() =>
    selecionadas.value.length > 0
    && selecionadas.value.every(p => p.nome && p.email && p.documento && p.cpf_valido));

const fmtCpf = (c) => {
    const d = String(c || '').replace(/\D/g, '');
    return d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : c;
};

function reset() {
    passo.value = 'colar';
    texto.value = '';
    pessoas.value = [];
    ignorados.value = [];
    resultado.value = null;
}

watch(() => props.open, (aberto) => {
    if (aberto) {
        reset();
        if (!store.empresas.length) store.fetchOverview();
        if (empresaOptions.value.length === 1) empresaId.value = empresaOptions.value[0].value;
    }
});

async function analisar() {
    if (!empresaId.value) return toast.error('Escolha a empresa.');
    if (!texto.value.trim()) return toast.error('Cole o texto com os dados das pessoas.');

    analisando.value = true;
    try {
        const data = await store.preview(texto.value);
        if (!data.pessoas.length) {
            toast.error('Não encontrei nenhuma pessoa no texto. Cada pessoa precisa ter ao menos CPF ou e-mail.');
            return;
        }
        // Já cadastrado e CPF inválido entram desmarcados: o padrão seguro é
        // não enviar o que a tela sabe que vai dar problema.
        pessoas.value = data.pessoas.map(p => ({
            ...p,
            incluir: !p.ja_cadastrado && p.cpf_valido && !p.duplicado_no_texto,
        }));
        ignorados.value = data.ignorados;
        passo.value = 'revisar';
    } catch (err) {
        toast.error(err?.message || 'Erro ao analisar o texto.');
    } finally {
        analisando.value = false;
    }
}

async function enviar() {
    try {
        const payload = selecionadas.value.map(p => ({
            nome: p.nome,
            email: p.email,
            documento: String(p.documento).replace(/\D/g, ''),
            data_nasc: p.data_nasc || null,
            gerente: true, // correspondente sempre entra como gerente no CV
        }));
        const data = await store.createUsers(Number(empresaId.value), payload);
        resultado.value = data?.registros || [];
        passo.value = 'resultado';

        const ok = resultado.value.filter(r => r.status === 'completed').length;
        const falhas = resultado.value.length - ok;
        if (falhas) toast.warning(`${ok} cadastrados, ${falhas} com pendência.`);
        else toast.success(`${ok} pessoas cadastradas e conferidas no CV!`);
    } catch (err) {
        toast.error(err?.message || 'Erro ao cadastrar.');
    }
}

const STATUS_INFO = {
    completed: { label: 'Cadastrado', variant: 'success', icon: 'fas fa-check' },
    duplicate: { label: 'Já existia', variant: 'warning', icon: 'fas fa-clone' },
    error: { label: 'Falhou', variant: 'danger', icon: 'fas fa-xmark' },
    pending: { label: 'Pendente', variant: 'neutral', icon: 'fas fa-clock' },
};
</script>

<template>
    <Modal :open="open" size="xl"
        :title="passo === 'resultado' ? 'Resultado do cadastro' : 'Cadastrar pessoas'"
        :subtitle="passo === 'colar' ? 'Cole o texto com os dados da equipe - do WhatsApp, e-mail ou planilha' : ''"
        @close="emit('close')">

        <!-- Sem empresa vinculada: não dá para cadastrar ninguém -->
        <div v-if="semEmpresa" class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-ink">
            <p class="font-medium mb-1"><i class="fas fa-triangle-exclamation mr-1.5 text-amber-500"></i>Nenhuma empresa pronta</p>
            <p class="text-ink-muted">
                Para cadastrar pessoas é preciso uma empresa correspondente com o código do CV vinculado.
                Cadastre a empresa em "Nova empresa" e depois informe o código na aba Equipes.
            </p>
        </div>

        <!-- Passo 1: colar -->
        <template v-else-if="passo === 'colar'">
            <Select v-model="empresaId" :options="empresaOptions" label="Empresa correspondente"
                placeholder="Escolha a empresa" required class="mb-4" />

            <label class="block text-sm font-medium text-ink mb-1.5">Dados das pessoas</label>
            <textarea v-model="texto" rows="12"
                class="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:ring-2 focus:ring-accent/30 outline-none font-mono"
                placeholder="Cole aqui. Exemplo:&#10;&#10;Maria Souza da Silva&#10;maria@empresa.com&#10;20/05/2003&#10;554.579.848-00&#10;&#10;João Pedro Lima&#10;joao@empresa.com&#10;13 maio 97&#10;44718301807"></textarea>
            <p class="text-xs text-ink-muted mt-2">
                Aceita conversa exportada do WhatsApp, lista com hífens ou com rótulos ("Nome completo:", "CPF:").
                Entende CPF com ou sem pontuação e datas como 20/05/2003 ou "13 maio 97".
                Linhas de conversa são descartadas.
            </p>
        </template>

        <!-- Passo 2: revisar -->
        <template v-else-if="passo === 'revisar'">
            <div class="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="accent" outlined>{{ selecionadas.length }} de {{ pessoas.length }} selecionadas</Badge>
                <Badge v-if="pessoas.some(p => p.ja_cadastrado)" variant="warning" outlined>
                    {{ pessoas.filter(p => p.ja_cadastrado).length }} já no CV
                </Badge>
                <Badge v-if="pessoas.some(p => !p.cpf_valido)" variant="danger" outlined>
                    {{ pessoas.filter(p => !p.cpf_valido).length }} com CPF inválido
                </Badge>
            </div>

            <div class="space-y-2 max-h-[52vh] overflow-y-auto pr-1">
                <div v-for="(p, i) in pessoas" :key="i"
                    class="rounded-xl border p-3"
                    :class="p.incluir ? 'border-line bg-surface-raised' : 'border-line-subtle bg-surface-sunken/40 opacity-70'">

                    <div class="flex items-start gap-3">
                        <input type="checkbox" v-model="p.incluir" class="mt-2 h-4 w-4 rounded border-line accent-accent" />

                        <div class="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input v-model="p.nome" size="sm" label="Nome" placeholder="Nome completo" />
                            <Input v-model="p.email" size="sm" label="E-mail" placeholder="email@empresa.com" />
                            <Input v-model="p.documento" size="sm" label="CPF"
                                :error="p.documento && !p.cpf_valido ? 'CPF inválido' : ''" />
                            <Input v-model="p.data_nasc" size="sm" type="date" label="Nascimento" />
                        </div>
                    </div>

                    <div v-if="p.avisos?.length" class="flex flex-wrap gap-1.5 mt-2 pl-7">
                        <Badge v-for="a in p.avisos" :key="a"
                            :variant="a.includes('inválido') ? 'danger' : 'warning'" size="sm">{{ a }}</Badge>
                    </div>
                </div>
            </div>

            <p v-if="ignorados.length" class="text-xs text-ink-subtle mt-3">
                <i class="fas fa-filter mr-1"></i>{{ ignorados.length }} trecho(s) descartado(s) por não ter CPF nem e-mail
                (ex.: "{{ ignorados[0] }}").
            </p>
            <p v-if="!podeEnviar && selecionadas.length" class="text-xs text-rose-500 mt-2">
                Complete nome, e-mail e um CPF válido em todas as pessoas selecionadas para continuar.
            </p>
        </template>

        <!-- Passo 3: resultado -->
        <template v-else>
            <p class="text-sm text-ink-muted mb-3">
                Resultado conferido no CV depois do envio - não é só o que a API respondeu.
            </p>
            <div class="space-y-1.5 max-h-[52vh] overflow-y-auto pr-1">
                <div v-for="r in resultado" :key="r.id"
                    class="flex items-center gap-3 rounded-lg border border-line-subtle bg-surface-raised px-3 py-2">
                    <Badge :variant="STATUS_INFO[r.status]?.variant || 'neutral'" size="sm">
                        <i :class="STATUS_INFO[r.status]?.icon" class="mr-1"></i>{{ STATUS_INFO[r.status]?.label || r.status }}
                    </Badge>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm text-ink truncate">{{ r.nome }}</p>
                        <p class="text-xs text-ink-muted truncate">
                            {{ fmtCpf(r.documento) }}
                            <template v-if="r.cv_idusuario"> · CV #{{ r.cv_idusuario }}</template>
                        </p>
                        <p v-if="r.error" class="text-xs text-amber-600 dark:text-amber-400 truncate">{{ r.error }}</p>
                    </div>
                </div>
            </div>
            <p class="text-xs text-ink-subtle mt-3">
                Quem ficou com pendência aparece na aba Cadastros, onde dá para reenviar.
            </p>
        </template>

        <template #footer>
            <template v-if="semEmpresa">
                <Button variant="primary" @click="emit('close')">Entendi</Button>
            </template>
            <template v-else-if="passo === 'colar'">
                <Button variant="ghost" @click="emit('close')">Cancelar</Button>
                <Button variant="primary" icon="fas fa-wand-magic-sparkles" :loading="analisando" @click="analisar">
                    Analisar texto
                </Button>
            </template>
            <template v-else-if="passo === 'revisar'">
                <Button variant="ghost" icon="fas fa-arrow-left" @click="passo = 'colar'">Voltar</Button>
                <Button variant="primary" icon="fas fa-paper-plane" :disabled="!podeEnviar"
                    :loading="store.saving" @click="enviar">
                    Cadastrar {{ selecionadas.length }} no CV
                </Button>
            </template>
            <template v-else>
                <Button variant="primary" @click="emit('close')">Fechar</Button>
            </template>
        </template>
    </Modal>
</template>
