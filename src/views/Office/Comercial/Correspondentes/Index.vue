<script setup>
// Tela de Correspondentes (CV). Duas abas: "Equipes" mostra as empresas com
// seus usuários (espelho do CV) e "Cadastros" acompanha o que foi criado por
// aqui, com o resultado CONFERIDO por leitura - a resposta do POST do CV não
// serve como prova.

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useCorrespondentStore } from '@/stores/Comercial/Correspondents/correspondentStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Button from '@/components/UI/Button.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

import EquipesTab from './components/EquipesTab.vue';
import CadastrosTab from './components/CadastrosTab.vue';
import CompanyModal from './components/CompanyModal.vue';
import ImportModal from './components/ImportModal.vue';
import InviteModal from './components/InviteModal.vue';

const store = useCorrespondentStore();
const toast = useToast();
const route = useRoute();

const tab = ref(route.query.tab === 'cadastros' ? 'cadastros' : 'equipes');
const initialQuery = String(route.query.q || '');

const companyOpen = ref(false);
const importOpen = ref(false);
const inviteOpen = ref(false);
// Empresa vinda do CV que está sendo adotada pelo Office (abre o form já
// preenchido, em modo "já existe no CV").
const companyPrefill = ref(null);

function novaEmpresa() {
    companyPrefill.value = null;
    companyOpen.value = true;
}
function registrarEmpresa(empresa) {
    companyPrefill.value = empresa;
    companyOpen.value = true;
}

const tabOptions = computed(() => [
    { value: 'equipes', label: 'Equipes', icon: 'fas fa-people-group', count: store.empresas.length },
    { value: 'cadastros', label: 'Cadastros', icon: 'fas fa-list-check', count: store.pendentes || store.registros.length },
]);

async function syncNow() {
    try {
        await store.sync();
        toast.success('Correspondentes sincronizados com o CV!');
    } catch (err) {
        toast.error(err?.message || 'Erro ao sincronizar.');
    }
}

onMounted(() => {
    store.fetchOverview();
    store.fetchRegistrations();
});
</script>

<template>
    <PageContainer>
        <PageHeader
            title="Correspondentes"
            subtitle="Empresas correspondentes e suas equipes no CV: consulte, cadastre em lote e acompanhe o resultado"
            icon="fas fa-people-group"
        >
            <template #actions>
                <Button variant="ghost" icon="fas fa-rotate" :loading="store.syncing" v-tippy="'Sincronizar com o CV'" @click="syncNow" />
                <PageHelp
                    storage-key="comercial-correspondentes"
                    title="Como usar a tela de Correspondentes"
                    intro="A aba Equipes lista as empresas correspondentes e quem trabalha em cada uma. A aba Cadastros mostra tudo que foi cadastrado por aqui e se deu certo de verdade."
                    :steps="[
                        { title: 'Cadastre a empresa', text: 'Clique em Nova empresa e preencha. A região vai sozinha pela UF. Como o CV não devolve o código da empresa nova, a tela já sugere o próximo número da sequência: confirme no botão Vincular e as pessoas ficam liberadas.' },
                        { title: 'Cadastre a equipe', text: 'Clique em Cadastrar pessoas, escolha a empresa e preencha uma pessoa por vez (nome, e-mail, CPF e nascimento). Cada Adicionar joga a pessoa na lista de baixo; nada vai ao CV antes de você clicar em Cadastrar.' },
                        { title: 'Revise a lista', text: 'Confira os avisos: CPF inválido, e-mail faltando ou pessoa já cadastrada. Dá para corrigir na hora, desmarcar ou tirar da lista. Se a equipe inteira veio de uma vez, a aba Colar lista lê o texto e enche a mesma lista.' },
                        { title: 'Acompanhe', text: 'Depois de enviar, a tela confere no CV quem realmente entrou. Quem falhar aparece na aba Cadastros com o motivo e um botão de reenviar.' },
                    ]"
                    :tips="[
                        'Todo mundo é cadastrado como gerente por padrão - desmarque na prévia quem não for.',
                        'O código sugerido só erra se alguém criar uma empresa direto no CV no mesmo intervalo. Se isso acontecer, a tela recusa o número que já tem gente e você informa o certo.',
                        'O CV não deixa editar nem excluir por integração: para corrigir alguém já cadastrado, exclua na tela do CV (tem atalho no detalhe) e cadastre de novo por aqui.',
                        'Reenviar é seguro: se a pessoa já existe, o CV recusa pelo CPF e nada é duplicado.',
                        'A senha de acesso é definida pelo próprio CV, não por esta tela.',
                    ]"
                />
                <Button variant="secondary" icon="fas fa-building" @click="novaEmpresa">Nova empresa</Button>
                <Button variant="secondary" icon="fas fa-link" @click="inviteOpen = true">Gerar link</Button>
                <Button variant="primary" icon="fas fa-user-plus" @click="importOpen = true">Cadastrar pessoas</Button>
            </template>
        </PageHeader>

        <div class="mb-4">
            <SegmentedControl v-model="tab" :options="tabOptions" />
        </div>

        <EquipesTab v-show="tab === 'equipes'" :initial-query="initialQuery"
            @cadastrar="importOpen = true" @registrar="registrarEmpresa" />
        <CadastrosTab v-show="tab === 'cadastros'" />

        <CompanyModal :open="companyOpen" :prefill="companyPrefill" @close="companyOpen = false" />
        <ImportModal :open="importOpen" @close="importOpen = false" />
        <InviteModal :open="inviteOpen" @close="inviteOpen = false" />
    </PageContainer>
</template>
