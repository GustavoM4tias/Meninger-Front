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

const vazio = () => ({
    nome: '', regiao: 'SD', estado: 'SP', cidade: '', endereco: '',
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

const podeSalvar = computed(() => {
    const f = form.value;
    if (!f.nome.trim()) return false;
    if (jaExiste.value) return !!cvIdempresa.value;
    return !!(f.regiao.trim() && f.estado && f.cidade.trim() && f.endereco.trim());
});

async function salvar() {
    try {
        const data = await store.createCompany({
            ...form.value,
            somente_local: jaExiste.value,
            cv_idempresa: jaExiste.value ? Number(cvIdempresa.value) : null,
        });
        if (jaExiste.value) {
            toast.success('Empresa registrada e vinculada.');
            emit('close');
            return;
        }
        enviado.value = data?.envio || {};
        toast.success('Empresa enviada ao CV. Falta confirmar o código.');
    } catch (err) {
        toast.error(err?.message || 'Erro ao cadastrar a empresa.');
    }
}
</script>

<template>
    <Modal :open="open" size="lg"
        :title="enviado ? 'Confirme o código no CV' : 'Nova empresa correspondente'"
        @close="emit('close')">

        <!-- Depois do POST: o CV não devolve o id -->
        <template v-if="enviado">
            <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-ink mb-4">
                <p class="font-medium mb-1"><i class="fas fa-circle-info mr-1.5 text-amber-500"></i>Falta um passo manual</p>
                <p class="text-ink-muted">
                    O CV grava a empresa mas não devolve o código dela, e a listagem por integração está fora do ar.
                    Abra a lista no CV, confirme que <strong class="text-ink">{{ form.nome }}</strong> aparece
                    e anote o código - depois informe na aba Equipes, no aviso "Falta código".
                </p>
            </div>
            <a :href="cvEmpresasUrl(form.nome)" target="_blank" rel="noopener"
                class="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
                <i class="fas fa-arrow-up-right-from-square"></i> Abrir listagem filtrada no CV
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
                    <Input v-model="form.regiao" label="Região (sigla)" required
                        hint="A API exige a sigla, não o nome. SD = Sudeste (confirmado). Confira em Empreendimentos > Regiões no CV." />
                    <Select v-model="form.estado" :options="UF_OPTIONS" label="UF" required />
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
                <Button variant="primary" @click="emit('close')">Fechar</Button>
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
