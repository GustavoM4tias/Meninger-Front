<script setup>
// CV CRM > Configurações: as CREDENCIAIS do CV, e só elas.
//
// São três acessos, cada um para uma porta do CV:
//   • chave de integração (API v1/v2) - a maior parte das chamadas;
//   • login de um usuário (API v3) - o que a v1 não lê, como os
//     empreendimentos de cada imobiliária;
//   • sessão do robô no painel - aprovar reserva só existe no painel, e o
//     login dele tem CAPTCHA, então a sessão é colada por uma pessoa.
//
// Esta tela chegou a juntar também o espelho de imobiliárias, o robô, o
// estoque bloqueado e os crons (out/2026), e virou um depósito. Cada um foi
// para onde o assunto mora: espelho em Imobiliárias, robô e estoque em telas
// próprias, crons em Integrações. Quando uma credencial cai, os avisos e as
// outras telas apontam para cá.

import { onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useRealEstateStore } from '@/stores/Comercial/RealEstate/realEstateStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import CvCredentialCard from '@/components/Cv/CvCredentialCard.vue';
import CvRoboSessaoCard from '@/components/Cv/CvRoboSessaoCard.vue';

const store = useRealEstateStore();
const toast = useToast();

onMounted(() => {
    store.fetchCvPanel().catch(err => toast.error(err?.message || 'Não foi possível carregar o painel.'));
});
</script>

<template>
    <PageContainer>
        <PageHeader
            title="Configurações do CV"
            subtitle="As credenciais que o Office usa para conversar com o CV"
            icon-img="/CVLogo.png"
        >
            <template #actions>
                <PageHelp
                    storage-key="cv-central"
                    title="Como usar as Configurações do CV"
                    intro="Aqui ficam os acessos do Office ao CV. Sem eles, nada sincroniza. O resto do módulo fica nos outros itens do menu CV CRM."
                    :steps="[
                        { title: 'Chave de integração', text: 'É a credencial da API do CV (e-mail + token) e responde pela maior parte das chamadas: reservas, leads, empreendimentos. Salvar já testa a conexão.' },
                        { title: 'Login do usuário do CV', text: 'É o login de um usuário dedicado, usado para o que a chave não alcança, como quais empreendimentos cada imobiliária atende. Use um usuário de sistema, não o de uma pessoa.' },
                        { title: 'Quando o CV trocar a senha', text: 'O CV força troca de senha de tempos em tempos. Quem estiver na lista de avisados recebe notificação e o cartão mostra a falha - basta digitar a nova senha e salvar.' },
                        { title: 'Sessão do robô', text: 'O robô que reaprova reservas entra pelo painel do CV, que pede CAPTCHA no login. Por isso uma pessoa entra numa janela anônima com o usuário do robô e cola o cookie CVid aqui.' },
                    ]"
                    :tips="[
                        'Deixando a lista de avisados vazia, o aviso vai para todos os administradores.',
                        'Sincronizações automáticas e webhooks ficam em Integrações; o robô e o estoque bloqueado têm telas próprias.',
                    ]"
                />
            </template>
        </PageHeader>

        <Skeleton v-if="store.cvPanelLoading && !store.cvPanel" variant="row" :lines="4" />

        <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <CvCredentialCard />
            <CvRoboSessaoCard />
        </div>
    </PageContainer>
</template>
