<script setup>
// Cadastro de pessoas da correspondente.
//
// O caminho principal é o FORMULÁRIO, uma pessoa por vez: quem cadastra tem os
// dados na mão e digitar campo a campo erra menos que confiar na leitura de um
// texto colado. A colagem continua ali como atalho para quem recebeu a equipe
// inteira de uma vez, mas é a segunda opção.
//
// Nos dois caminhos a pessoa cai na MESMA lista, que fica visível e editável
// até o envio. Essa revisão não é enfeite: o CV não tem edição nem exclusão por
// integração, então um nome ou CPF errado só se conserta excluindo na tela do
// CV e cadastrando de novo.

import { computed, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useCorrespondentStore } from '@/stores/Comercial/Correspondents/correspondentStore';
import { cpfValido, formatarCpf, soDigitosCpf } from '@/utils/cpf';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['close']);

const store = useCorrespondentStore();
const toast = useToast();

const passo = ref('entrada');   // entrada | resultado
const modo = ref('form');       // form | texto
const empresaId = ref('');
const texto = ref('');
const pessoas = ref([]);
const ignorados = ref([]);
const analisando = ref(false);
const resultado = ref(null);

const novaPessoa = () => ({ nome: '', email: '', documento: '', celular: '', data_nasc: '', gerente: true });
const nova = ref(novaPessoa());

const empresaOptions = computed(() =>
    store.empresasVinculadas.map(e => ({
        value: String(e.id),
        label: `${e.nome}${e.cidade ? ` - ${e.cidade}` : ''} (#${e.cv_idempresa})`,
    })));

const semEmpresa = computed(() => !empresaOptions.value.length);

const selecionadas = computed(() => pessoas.value.filter(p => p.incluir));
const podeEnviar = computed(() =>
    !!empresaId.value
    && selecionadas.value.length > 0
    && selecionadas.value.every(p => p.nome?.trim() && p.email?.trim() && cpfValido(p.documento)));

const novaValida = computed(() =>
    !!nova.value.nome.trim() && !!nova.value.email.trim() && cpfValido(nova.value.documento));

/** CPFs que já estão no CV, de qualquer empresa - o espelho já traz todos. */
const cpfsNoCv = computed(() => {
    const set = new Set();
    for (const e of store.empresas) for (const u of (e.usuarios || [])) {
        if (u.documento) set.add(soDigitosCpf(u.documento));
    }
    return set;
});

function reset() {
    passo.value = 'entrada';
    modo.value = 'form';
    texto.value = '';
    pessoas.value = [];
    ignorados.value = [];
    resultado.value = null;
    nova.value = novaPessoa();
}

watch(() => props.open, (aberto) => {
    if (aberto) {
        reset();
        if (!store.empresas.length) store.fetchOverview();
        if (empresaOptions.value.length === 1) empresaId.value = empresaOptions.value[0].value;
    }
});

/** Avisos de uma pessoa da lista, recalculados a cada edição. */
function avisosDe(p, indice = -1) {
    const avisos = [...(p.avisos_origem || [])];
    const doc = soDigitosCpf(p.documento);
    if (p.documento && !cpfValido(p.documento)) avisos.push('CPF inválido');
    if (doc && cpfsNoCv.value.has(doc)) avisos.push('Já cadastrado no CV');
    if (doc && pessoas.value.some((o, i) => i !== indice && soDigitosCpf(o.documento) === doc)) {
        avisos.push('CPF repetido nesta lista');
    }
    return avisos;
}

function adicionar() {
    if (!novaValida.value) return toast.error('Preencha nome, e-mail e um CPF válido.');
    const doc = soDigitosCpf(nova.value.documento);
    if (cpfsNoCv.value.has(doc)) return toast.error('Esta pessoa já está cadastrada no CV.');
    if (pessoas.value.some(p => soDigitosCpf(p.documento) === doc)) {
        return toast.error('Este CPF já está na lista abaixo.');
    }

    pessoas.value.push({ ...nova.value, documento: doc, incluir: true, avisos_origem: [] });
    nova.value = novaPessoa();
    toast.success('Pessoa adicionada. Envie quando a lista estiver completa.');
}

function remover(i) {
    pessoas.value.splice(i, 1);
}

async function analisar() {
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
        const novas = data.pessoas
            .filter(p => !pessoas.value.some(j => soDigitosCpf(j.documento) === soDigitosCpf(p.documento)))
            .map(p => ({
                nome: p.nome || '',
                email: p.email || '',
                documento: p.documento || '',
                celular: p.celular || '', // o parser não lê telefone; fica para preencher na lista
                data_nasc: p.data_nasc || '',
                gerente: true,
                incluir: !p.ja_cadastrado && p.cpf_valido && !p.duplicado_no_texto,
                avisos_origem: p.avisos || [],
            }));

        pessoas.value.push(...novas);
        ignorados.value = data.ignorados;
        texto.value = '';
        modo.value = 'form';
        toast.success(`${novas.length} pessoa(s) na lista. Confira antes de enviar.`);
    } catch (err) {
        toast.error(err?.message || 'Erro ao analisar o texto.');
    } finally {
        analisando.value = false;
    }
}

async function enviar() {
    try {
        const payload = selecionadas.value.map(p => ({
            nome: p.nome.trim(),
            email: p.email.trim(),
            documento: soDigitosCpf(p.documento),
            celular: p.celular?.trim() || null,
            data_nasc: p.data_nasc || null,
            gerente: p.gerente !== false,
        }));
        const data = await store.createUsers(Number(empresaId.value), payload);
        resultado.value = data?.registros || [];
        passo.value = 'resultado';

        const ok = resultado.value.filter(r => r.status === 'completed').length;
        const falhas = resultado.value.length - ok;
        if (falhas) toast.warning(`${ok} cadastrados, ${falhas} com pendência.`);
        else toast.success(`${ok} pessoa(s) cadastrada(s) e conferida(s) no CV!`);
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
        :subtitle="passo === 'entrada' ? 'Uma pessoa por vez - a lista só vai ao CV quando você enviar' : ''"
        @close="emit('close')">

        <!-- Sem empresa vinculada: não dá para cadastrar ninguém -->
        <div v-if="semEmpresa" class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-ink">
            <p class="font-medium mb-1"><i class="fas fa-triangle-exclamation mr-1.5 text-amber-500"></i>Nenhuma empresa pronta</p>
            <p class="text-ink-muted">
                Para cadastrar pessoas é preciso uma empresa correspondente com o código do CV vinculado.
                Cadastre a empresa em "Nova empresa" e confirme o código na aba Equipes.
            </p>
        </div>

        <template v-else-if="passo === 'entrada'">
            <Select v-model="empresaId" :options="empresaOptions" label="Empresa correspondente"
                placeholder="Escolha a empresa" required class="mb-4" />

            <!-- Formulário é o padrão; colar é atalho para equipe inteira -->
            <div class="flex items-center gap-1 rounded-xl border border-line bg-surface-sunken/60 p-1 mb-4">
                <button type="button" class="flex-1 rounded-lg px-3 py-2 text-sm min-h-[40px] transition-colors"
                    :class="modo === 'form' ? 'bg-surface-raised text-ink shadow-soft font-medium' : 'text-ink-muted hover:text-ink'"
                    @click="modo = 'form'">
                    <i class="fas fa-user-plus mr-1.5"></i>Uma a uma
                </button>
                <button type="button" class="flex-1 rounded-lg px-3 py-2 text-sm min-h-[40px] transition-colors"
                    :class="modo === 'texto' ? 'bg-surface-raised text-ink shadow-soft font-medium' : 'text-ink-muted hover:text-ink'"
                    @click="modo = 'texto'">
                    <i class="fas fa-paste mr-1.5"></i>Colar lista
                </button>
            </div>

            <!-- Modo formulário -->
            <div v-if="modo === 'form'" class="rounded-xl border border-line bg-surface-raised p-3 sm:p-4 mb-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input v-model="nova.nome" label="Nome completo" placeholder="Ex.: Maria Souza da Silva"
                        required class="sm:col-span-2" @keyup.enter="adicionar" />
                    <Input v-model="nova.email" type="email" label="E-mail" placeholder="maria@empresa.com"
                        required hint="É por ele que o CV manda o acesso." @keyup.enter="adicionar" />
                    <Input v-model="nova.documento" label="CPF" placeholder="000.000.000-00" required
                        :error="nova.documento && !cpfValido(nova.documento) ? 'CPF inválido' : ''"
                        @keyup.enter="adicionar" />
                    <Input v-model="nova.celular" label="Celular" placeholder="(17) 99999-9999"
                        hint="Opcional. Vira o atalho de WhatsApp na ficha." @keyup.enter="adicionar" />
                    <Input v-model="nova.data_nasc" type="date" label="Nascimento" hint="Opcional." />
                    <div class="flex items-end pb-1 sm:col-span-2">
                        <Switch v-model="nova.gerente" label="Gerente"
                            description="Padrão do correspondente no CV." />
                    </div>
                </div>

                <div class="flex justify-end mt-3">
                    <Button variant="secondary" icon="fas fa-plus" :disabled="!novaValida" @click="adicionar">
                        Adicionar à lista
                    </Button>
                </div>
            </div>

            <!-- Modo colagem -->
            <div v-else class="mb-4">
                <label class="block text-sm font-medium text-ink mb-1.5">Dados das pessoas</label>
                <textarea v-model="texto" rows="8"
                    class="w-full rounded-xl border border-line bg-surface-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:border-accent focus:ring-2 focus:ring-accent/30 outline-none font-mono"
                    placeholder="Cole aqui. Exemplo:&#10;&#10;Maria Souza da Silva&#10;maria@empresa.com&#10;20/05/2003&#10;554.579.848-00"></textarea>
                <div class="flex flex-wrap items-center justify-between gap-2 mt-2">
                    <p class="text-xs text-ink-muted flex-1 min-w-[200px]">
                        Aceita conversa do WhatsApp, lista com hífens ou com rótulos. As pessoas entram na
                        lista abaixo para você conferir.
                    </p>
                    <Button variant="secondary" icon="fas fa-wand-magic-sparkles" :loading="analisando" @click="analisar">
                        Analisar texto
                    </Button>
                </div>
                <p v-if="ignorados.length" class="text-xs text-ink-subtle mt-2">
                    <i class="fas fa-filter mr-1"></i>{{ ignorados.length }} trecho(s) descartado(s) por não ter CPF nem e-mail
                    (ex.: "{{ ignorados[0] }}").
                </p>
            </div>

            <!-- Lista a enviar -->
            <div class="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="accent" outlined>{{ selecionadas.length }} para enviar</Badge>
                <Badge v-if="pessoas.length !== selecionadas.length" variant="neutral" outlined>
                    {{ pessoas.length - selecionadas.length }} desmarcada(s)
                </Badge>
            </div>

            <p v-if="!pessoas.length" class="rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm text-ink-muted">
                Ninguém na lista ainda. Preencha os dados acima e clique em Adicionar.
            </p>

            <div v-else class="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                <div v-for="(p, i) in pessoas" :key="i"
                    class="rounded-xl border p-3"
                    :class="p.incluir ? 'border-line bg-surface-raised' : 'border-line-subtle bg-surface-sunken/40 opacity-70'">

                    <div class="flex items-start gap-3">
                        <input type="checkbox" v-model="p.incluir" class="mt-2 h-4 w-4 rounded border-line accent-accent" />

                        <div class="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Input v-model="p.nome" size="sm" label="Nome" placeholder="Nome completo" />
                            <Input v-model="p.email" size="sm" label="E-mail" placeholder="email@empresa.com" />
                            <Input v-model="p.documento" size="sm" label="CPF"
                                :error="p.documento && !cpfValido(p.documento) ? 'CPF inválido' : ''" />
                            <Input v-model="p.celular" size="sm" label="Celular" placeholder="(17) 99999-9999" />
                            <Input v-model="p.data_nasc" size="sm" type="date" label="Nascimento" />
                        </div>

                        <button type="button" class="mt-1 h-10 w-10 shrink-0 rounded-lg text-ink-subtle hover:text-rose-500"
                            v-tippy="'Tirar da lista'" @click="remover(i)">
                            <i class="fas fa-trash-can"></i>
                        </button>
                    </div>

                    <div class="flex flex-wrap items-center gap-1.5 mt-2 pl-7">
                        <Badge v-if="!p.gerente" variant="neutral" size="sm">Sem marcação de gerente</Badge>
                        <Badge v-for="a in avisosDe(p, i)" :key="a"
                            :variant="a.includes('inválido') ? 'danger' : 'warning'" size="sm">{{ a }}</Badge>
                    </div>
                </div>
            </div>

            <p v-if="pessoas.length && !podeEnviar && selecionadas.length" class="text-xs text-rose-500 mt-2">
                Complete nome, e-mail e um CPF válido em todas as pessoas marcadas para continuar.
            </p>
        </template>

        <!-- Resultado -->
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
                            {{ formatarCpf(r.documento) }}
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
            <template v-else-if="passo === 'entrada'">
                <Button variant="ghost" @click="emit('close')">Cancelar</Button>
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
