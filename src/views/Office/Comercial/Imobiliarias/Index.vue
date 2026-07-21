<script setup>
// Tela unificada de Imobiliárias: a aba "Imobiliárias" lista o backup do CV
// (filtros, atalhos de contato, detalhe) e a aba "Cadastros e convites"
// acompanha os cadastros feitos pelo Office (internos e via link público).
// As ações de criar (Nova imobiliária / Gerar link) ficam no cabeçalho.

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Button from '@/components/UI/Button.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

import ImobiliariasTab from './components/ImobiliariasTab.vue';
import RegistrationsTab from './components/RegistrationsTab.vue';
import InviteModal from './components/InviteModal.vue';
import CreateModal from './components/CreateModal.vue';

const store = useRealEstateStore();
const toast = useToast();
const route = useRoute();

// Deep-link (usado pela Eme e por atalhos): ?tab=cadastros abre direto a aba
// de cadastros; ?q=<termo> é repassado à aba de imobiliárias (prefiltra).
const tab = ref(route.query.tab === 'cadastros' ? 'cadastros' : 'imobiliarias');
const initialQuery = String(route.query.q || '');
const inviteOpen = ref(false);
const createOpen = ref(false);

const pendentes = computed(() =>
    store.registrations.filter(r => r.status === 'invite' || r.status === 'error' || r.status === 'processing').length);

const tabOptions = computed(() => [
    { value: 'imobiliarias', label: 'Imobiliárias', icon: 'fas fa-house-flag', count: store.report?.imobiliarias?.length || 0 },
    { value: 'cadastros', label: 'Cadastros e convites', icon: 'fas fa-file-signature', count: pendentes.value || store.registrations.length },
]);

async function syncNow() {
    try {
        await store.syncImobiliarias();
        toast.success('Imobiliárias sincronizadas com o CV!');
    } catch (err) {
        toast.error(err?.message || 'Erro ao sincronizar.');
    }
}

onMounted(() => {
    store.fetchReport();
    store.fetchRegistrations();
    store.fetchEnterprises();
});
</script>

<template>
    <PageContainer>
        <PageHeader
            title="Imobiliárias"
            subtitle="Parceiras cadastradas no CV: consulte, cadastre direto ou envie um link para o responsável preencher"
            icon="fas fa-house-flag"
        >
            <template #actions>
                <Button variant="ghost" icon="fas fa-rotate" :loading="store.syncing" v-tippy="'Sincronizar com o CV'" @click="syncNow" />
                <PageHelp
                    storage-key="comercial-imobiliarias"
                    title="Como usar a tela de Imobiliárias"
                    intro="A aba Imobiliárias lista as parceiras cadastradas no CV. A aba Cadastros e convites acompanha os cadastros feitos por aqui."
                    :steps="[
                        { title: 'Consulte', text: 'Por padrão aparecem só imobiliárias ativas e com empreendimento vinculado - use os filtros para ver inativas ou sem vínculo. Clique numa linha para o detalhe completo.' },
                        { title: 'Atalhos', text: 'O telefone abre o WhatsApp, o e-mail abre seu app de e-mail, o gerente abre o cartão da pessoa e cada empreendimento leva à tela de Empreendimentos.' },
                        { title: 'Cadastro direto', text: 'Clique em Nova imobiliária, envie o cartão CNPJ (PDF) para preencher automaticamente, complete o restante e confirme.' },
                        { title: 'Ou gere um link', text: 'Clique em Gerar link, escolha os empreendimentos e envie ao responsável da imobiliária - ele preenche e o cadastro roda sozinho. Acompanhe na aba Cadastros e convites.' },
                    ]"
                    :tips="[
                        'Se um cadastro der erro na integração com o CV, abra o detalhe e clique em Reprocessar.',
                        'O ícone de link/computador ao lado do nome indica imobiliárias cadastradas por aqui (via link ou pela tela).',
                        'A validade do CRECI em branco assume 31/12 do ano que vem.',
                    ]"
                />
                <Button variant="secondary" icon="fas fa-link" @click="inviteOpen = true">Gerar link</Button>
                <Button variant="primary" icon="fas fa-plus" @click="createOpen = true">Nova imobiliária</Button>
            </template>
        </PageHeader>

        <div class="mb-4">
            <SegmentedControl v-model="tab" :options="tabOptions" />
        </div>

        <ImobiliariasTab v-show="tab === 'imobiliarias'" :initial-query="initialQuery" />
        <RegistrationsTab v-show="tab === 'cadastros'" />

        <InviteModal :open="inviteOpen" @close="inviteOpen = false" />
        <CreateModal :open="createOpen" @close="createOpen = false" />
    </PageContainer>
</template>
