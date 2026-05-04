<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import PageContainer from '@/components/UI/PageContainer.vue';
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
