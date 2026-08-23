<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Favorite from '@/components/config/Favorite.vue';

import ProfileSection from './ProfileSection.vue';
import PasswordSection from './PasswordSection.vue';
import MicrosoftSection from './MicrosoftSection.vue';
import SiengeSection from './SiengeSection.vue';

const authStore = useAuthStore();

onMounted(async () => {
  if (!authStore.user) await authStore.fetchUserInfo();
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="md">
      <PageHeader
        title="Minha conta"
        subtitle="Gerencie suas informações pessoais e segurança"
        icon="fas fa-user-cog">
        <template #title>
          <span>Minha conta</span>
          <Favorite :router="'/settings/Account'" :section="'Minha Conta'" />
        </template>
        <template #actions>
          <PageHelp
            storage-key="minha-conta"
            title="Como cuidar da sua conta"
            intro="Seus dados e as formas de entrar no Office. Tudo aqui é seu: nada nesta tela muda o acesso de outra pessoa."
            :steps="[
              { title: 'Confira seus dados', text: 'Nome e contato aparecem para os colegas em comentários, chamados e atribuições.' },
              { title: 'Escolha como entrar', text: 'Senha, conta Microsoft e reconhecimento facial convivem: você usa o que preferir.' },
              { title: 'Conecte o Sienge', text: 'Sem essa credencial, as telas que consultam o Sienge no seu nome não funcionam para você.' },
            ]"
            :tips="[
              'Trocar a senha não desconecta a conta Microsoft, e vice-versa.',
              'Número de WhatsApp confirmado é o que permite receber aviso por lá.',
            ]" />
        </template>
      </PageHeader>

      <div class="space-y-3">
        <ProfileSection />
        <PasswordSection />
        <MicrosoftSection />
        <SiengeSection />
      </div>
    </PageContainer>
  </div>
</template>
