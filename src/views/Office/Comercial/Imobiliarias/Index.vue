<script setup>
// Tela unificada de Imobiliárias: a aba "Imobiliárias" lista o backup do CV
// (filtros, atalhos de contato, detalhe) e a aba "Cadastros e convites"
// acompanha os cadastros feitos pelo Office (internos e via link público).
// As ações de criar (Nova imobiliária / Gerar link) ficam no cabeçalho.

import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';
import { useCan } from '@/composables/useCan';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Button from '@/components/UI/Button.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';

import ImobiliariasTab from './components/ImobiliariasTab.vue';
import RegistrationsTab from './components/RegistrationsTab.vue';
import InviteModal from './components/InviteModal.vue';
import CreateModal from './components/CreateModal.vue';
import CvPanelModal from './components/CvPanelModal.vue';

const store = useRealEstateStore();
const toast = useToast();
const route = useRoute();
// Permissão DENTRO da tela (lib/screenCapabilities.js): consultar é `view`,
// cadastrar/gerar link é `register`, forçar a varredura do CV é `sync`.
// Esconder o botão é cosmético — quem barra de verdade é o requireCapability.
const can = useCan('/comercial/imobiliarias');

// Deep-link (usado pela Eme e por atalhos): ?tab=cadastros abre direto a aba
// de cadastros; ?q=<termo> é repassado à aba de imobiliárias (prefiltra).
const tab = ref(route.query.tab === 'cadastros' ? 'cadastros' : 'imobiliarias');
const initialQuery = String(route.query.q || '');
const inviteOpen = ref(false);
const createOpen = ref(false);
const cvPanelOpen = ref(false);

// A leitura de "quais empreendimentos esta imobiliária atende" depende de uma
// credencial do CV que o próprio CV expira de tempos em tempos. Quando ela cai,
// o vínculo apenas para de atualizar - sem este aviso, ninguém percebe.
const credencialCaida = computed(() =>
    can('configure') && store.cvPanel && store.cvPanel.configurado && !store.cvPanel.saudavel);

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
    // O erro fica guardado na store e cada aba o mostra com "Tentar de novo";
    // aqui só evitamos a promise rejeitada solta.
    store.fetchReport().catch(() => {});
    store.fetchRegistrations().catch(() => {});
    store.fetchEnterprises().catch(() => {});
    // Só quem pode configurar precisa saber do estado da credencial.
    if (can('configure')) store.fetchCvPanel().catch(() => {});
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
                <Button v-if="can('sync')" variant="ghost" icon="fas fa-rotate" :loading="store.syncing"
                    v-tippy="'Sincronizar com o CV agora (o espelho já atualiza sozinho de hora em hora)'" @click="syncNow" />
                <PageHelp
                    storage-key="comercial-imobiliarias"
                    title="Como usar a tela de Imobiliárias"
                    intro="A aba Imobiliárias lista as parceiras cadastradas no CV. A aba Cadastros e convites acompanha os cadastros feitos por aqui."
                    :steps="[
                        { title: 'Consulte', text: 'A lista abre completa, com todas as imobiliárias do CV. Use os filtros para recortar por situação, vínculo, cidade ou empreendimento - sempre que um filtro esconder alguma, a tela avisa quantas ficaram de fora. Clique numa linha para o detalhe completo.' },
                        { title: 'Atalhos', text: 'O telefone abre o WhatsApp, o e-mail abre seu app de e-mail, o gerente abre o cartão da pessoa e cada empreendimento leva à tela de Empreendimentos.' },
                        { title: 'Cadastro direto', text: 'Clique em Nova imobiliária, envie o cartão CNPJ (PDF) para preencher automaticamente, complete o restante e confirme.' },
                        { title: 'Ou gere um link', text: 'Clique em Gerar link, escolha os empreendimentos e envie ao responsável da imobiliária - ele preenche e o cadastro roda sozinho. Acompanhe na aba Cadastros e convites.' },
                    ]"
                    :tips="[
                        'Se um cadastro der erro na integração com o CV, abra o detalhe e clique em Reprocessar.',
                        'Num link de vários cadastros dá para editar o período: abra o detalhe e clique no lápis ao lado das datas - estender o encerramento reabre um link já encerrado.',
                        'O ícone de link/computador ao lado do nome indica imobiliárias cadastradas por aqui (via link ou pela tela).',
                        'A validade do CRECI em branco assume 31/12 do ano que vem.',
                        'O espelho do CV se atualiza sozinho de hora em hora. Imobiliária recém-criada no CV aparece aqui no máximo na hora seguinte, mesmo sem nenhum vínculo ainda.',
                    ]"
                />
                <Button v-if="can('register')" variant="secondary" icon="fas fa-link" @click="inviteOpen = true">Gerar link</Button>
                <Button v-if="can('configure')" variant="ghost" icon="fas fa-key"
                    v-tippy="'Credencial do CV: login usado para ler os empreendimentos de cada imobiliária'"
                    @click="cvPanelOpen = true" />
                <Button v-if="can('register')" variant="primary" icon="fas fa-plus" @click="createOpen = true">Nova imobiliária</Button>
            </template>
        </PageHeader>

        <button v-if="credencialCaida" type="button"
            class="mb-4 w-full flex items-start gap-3 rounded-xl border border-data-neg/30 bg-data-neg/10 p-3.5 text-left"
            @click="cvPanelOpen = true">
            <i class="fas fa-triangle-exclamation text-data-neg mt-0.5"></i>
            <span class="min-w-0">
                <span class="block text-sm font-medium text-ink">A credencial do CV parou de funcionar</span>
                <span class="block text-xs text-ink-muted">
                    Os empreendimentos de cada imobiliária pararam de atualizar. Normalmente é o CV forçando
                    troca de senha - clique para corrigir.
                </span>
            </span>
        </button>

        <div class="mb-4">
            <SegmentedControl v-model="tab" :options="tabOptions" />
        </div>

        <ImobiliariasTab v-show="tab === 'imobiliarias'" :initial-query="initialQuery" />
        <RegistrationsTab v-show="tab === 'cadastros'" />

        <InviteModal :open="inviteOpen" @close="inviteOpen = false" />
        <CreateModal :open="createOpen" @close="createOpen = false" />
        <CvPanelModal :open="cvPanelOpen" @close="cvPanelOpen = false" />
    </PageContainer>
</template>
