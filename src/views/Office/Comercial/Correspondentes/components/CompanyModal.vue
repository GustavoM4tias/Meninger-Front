<script setup>
// Cadastro de empresa correspondente.
//
// Dois modos: criar no CV (POST) ou apenas registrar aqui uma empresa que já
// existe lá. O segundo modo existe porque o GET de empresas do CV está fora
// do ar - sem ele, não temos como puxar as empresas antigas automaticamente.

import { computed, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useCorrespondentStore } from '@/stores/Comercial/Correspondents/correspondentStore';
import { cvEmpresasUrl } from '@/utils/cvLinks';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Switch from '@/components/UI/Switch.vue';

const props = defineProps({
    open: { type: Boolean, default: false },
    // Empresa que já existe no CV e está sendo "adotada" pelo Office: abre o
    // form no modo de registro local, com nome e código já preenchidos.
    prefill: { type: Object, default: null },
});
const emit = defineEmits(['close']);

const store = useCorrespondentStore();
const toast = useToast();

const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
    'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
const UF_OPTIONS = UFS.map(u => ({ value: u, label: u }));

// Região é sigla no CV e era digitada à mão aqui - foi assim que um "IA" chegou
// ao CV e derrubou o cadastro em silêncio (HTTP 200 com erro genérico, nada
// gravado). Agora sai da UF; o mesmo mapa vale no servidor (REGIOES no
// correspondentService), que é quem valida de verdade.
const REGIOES = [
    { sigla: 'N', nome: 'Norte', ufs: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR', 'TO'] },
    { sigla: 'NE', nome: 'Nordeste', ufs: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'] },
    { sigla: 'CO', nome: 'Centro-Oeste', ufs: ['DF', 'GO', 'MS', 'MT'] },
    { sigla: 'SD', nome: 'Sudeste', ufs: ['ES', 'MG', 'RJ', 'SP'] },
    { sigla: 'S', nome: 'Sul', ufs: ['PR', 'RS', 'SC'] },
];
const regiaoDaUf = (uf) => REGIOES.find(r => r.ufs.includes(String(uf || '').toUpperCase()))?.sigla || null;
const nomeDaRegiao = (sigla) => REGIOES.find(r => r.sigla === sigla)?.nome || null;

const vazio = () => ({
    nome: '', estado: 'SP', cidade: '', endereco: '',
    telefone: '', email: '', dias_agendamento: 5, observacao: '',
});

const form = ref(vazio());
const jaExiste = ref(false);      // empresa já cadastrada no CV
const cvIdempresa = ref('');
const enviado = ref(null);

watch(() => props.open, (aberto) => {
    if (!aberto) return;
    form.value = vazio();
    enviado.value = null;
    criada.value = null;
    codigo.value = '';

    const p = props.prefill;
    jaExiste.value = !!p;
    cvIdempresa.value = p?.cv_idempresa ? String(p.cv_idempresa) : '';
    if (p) {
        // Nome deduzido do pré-cadastro serve de ponto de partida, mas o
        // operador confirma antes de virar cadastro oficial do Office.
        form.value.nome = p.nome || '';
        form.value.cidade = p.cidade || '';
        if (p.estado) form.value.estado = p.estado;
    }
});

const regiao = computed(() => regiaoDaUf(form.value.estado));

const podeSalvar = computed(() => {
    const f = form.value;
    if (!f.nome.trim()) return false;
    if (jaExiste.value) return !!cvIdempresa.value;
    return !!(regiao.value && f.estado && f.cidade.trim() && f.endereco.trim());
});

// Empresa criada aqui, esperando o código. Guardada para o passo seguinte, que
// acontece no mesmo modal: confirmar o código provável sem sair da tela.
const criada = ref(null);
const codigo = ref('');
const vinculando = ref(false);

async function salvar() {
    try {
        const data = await store.createCompany({
            ...form.value,
            regiao: regiao.value,
            somente_local: jaExiste.value,
            cv_idempresa: jaExiste.value ? Number(cvIdempresa.value) : null,
        });
        if (jaExiste.value) {
            toast.success('Empresa registrada e vinculada.');
            emit('close');
            return;
        }
        enviado.value = data?.envio || {};
        criada.value = data?.empresa || null;
        codigo.value = enviado.value?.codigo_sugerido ? String(enviado.value.codigo_sugerido) : '';
        toast.success('Empresa enviada ao CV. Falta confirmar o código.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao cadastrar a empresa.');
    }
}

async function vincular() {
    if (!codigo.value) return toast.error('Informe o código da empresa no CV.');
    vinculando.value = true;
    try {
        await store.linkCompany(criada.value.id, Number(codigo.value));
        toast.success('Empresa vinculada. Já dá para cadastrar as pessoas dela.');
        emit('close');
    } catch (err) {
        toast.error(err?.message || 'Não foi possível vincular.');
    } finally {
        vinculando.value = false;
    }
}
</script>

<template>
    <Modal :open="open" size="lg"
        :title="enviado ? 'Confirme o código da empresa' : 'Nova empresa correspondente'"
        @close="emit('close')">

        <!-- Depois do POST: o CV não devolve o id, então confirmamos o provável -->
        <template v-if="enviado">
            <div class="rounded-lg border border-line bg-surface-sunken/60 p-4 text-sm text-ink mb-4">
                <p class="font-medium mb-1">
                    <i class="fas fa-paper-plane mr-1.5 text-accent"></i>
                    {{ form.nome }} enviada ao CV
                </p>
                <p class="text-ink-muted">
                    O CV cadastra a empresa mas não devolve o código dela. Como ele numera em sequência,
                    o próximo código é <strong class="text-ink">{{ enviado.codigo_sugerido }}</strong> -
                    a última empresa conhecida é a {{ enviado.codigo_base }}. Confirme para liberar o
                    cadastro de pessoas.
                </p>
            </div>

            <Input v-model="codigo" type="number" label="Código da empresa no CV"
                hint="Deixe o sugerido se ninguém tiver criado outra empresa direto no CV agora." />

            <a :href="cvEmpresasUrl(form.nome)" target="_blank" rel="noopener"
                class="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-accent mt-3">
                <i class="fas fa-arrow-up-right-from-square"></i> Conferir na listagem do CV
            </a>
        </template>

        <template v-else>
            <Switch v-model="jaExiste" label="Esta empresa já existe no CV"
                description="Use para trazer para o Office uma correspondente cadastrada antes. Nada é enviado ao CV." />

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <Input v-model="form.nome" label="Nome da empresa" placeholder="Ex.: Premium Créditos" required
                    class="sm:col-span-2" />

                <template v-if="jaExiste">
                    <Input v-model="cvIdempresa" type="number" label="Código no CV" placeholder="Ex.: 36" required />
                    <Input v-model="form.cidade" label="Cidade" placeholder="Ex.: Votuporanga" />
                    <Select v-model="form.estado" :options="UF_OPTIONS" label="UF" />
                </template>

                <template v-else>
                    <Select v-model="form.estado" :options="UF_OPTIONS" label="UF" required
                        :hint="regiao ? `Região ${nomeDaRegiao(regiao)} (${regiao}), enviada automaticamente ao CV.` : ''" />
                    <Input v-model="form.cidade" label="Cidade" placeholder="Ex.: Votuporanga" required
                        hint="Precisa pertencer à UF escolhida." />
                    <Input v-model="form.dias_agendamento" type="number" label="Dias de agendamento" required
                        hint="A doc do CV diz opcional, mas o cadastro falha sem este campo." />
                    <Input v-model="form.endereco" label="Endereço" placeholder="Rua, número - bairro" required
                        class="sm:col-span-2" />
                    <Input v-model="form.telefone" label="Telefone" placeholder="(17) 99999-9999" />
                    <Input v-model="form.email" type="email" label="E-mail"
                        hint="Vira o remetente dos e-mails automáticos do CV para esta correspondente." />
                </template>
            </div>
        </template>

        <template #footer>
            <template v-if="enviado">
                <Button variant="ghost" @click="emit('close')">Depois</Button>
                <Button variant="primary" icon="fas fa-link" :disabled="!codigo" :loading="vinculando"
                    @click="vincular">
                    Vincular código
                </Button>
            </template>
            <template v-else>
                <Button variant="ghost" @click="emit('close')">Cancelar</Button>
                <Button variant="primary" icon="fas fa-check" :disabled="!podeSalvar"
                    :loading="store.saving" @click="salvar">
                    {{ jaExiste ? 'Registrar aqui' : 'Cadastrar no CV' }}
                </Button>
            </template>
        </template>
    </Modal>
</template>
