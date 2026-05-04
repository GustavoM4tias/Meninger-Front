<script setup>
import { ref, computed, onMounted } from 'vue';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useMicrosoftStore } from '@/stores/Microsoft/microsoftStore';

import SettingsCard from '@/components/UI/SettingsCard.vue';
import Button from '@/components/UI/Button.vue';

const toast = useToast();
const authStore = useAuthStore();
const microsoftStore = useMicrosoftStore();

const open = ref(false);

const badgeText = computed(() =>
  microsoftStore.connected ? `Conectada — ${authStore.user?.email}` : 'Não conectada'
);

const canUnlink = computed(() =>
  !microsoftStore.isMicrosoftOnly || authStore.isInternal
);

async function handleUnlink() {
  try {
    await microsoftStore.unlink();
    toast.success('Conta Microsoft desvinculada.');
  } catch (err) {
    toast.error(err?.message || 'Erro ao desvincular conta Microsoft.');
  }
}

onMounted(() => microsoftStore.fetchStatus());
</script>

<template>
  <SettingsCard
    icon="fab fa-windows"
    :iconColor="microsoftStore.connected ? 'accent' : 'neutral'"
    title="Conta Microsoft"
    :badge="microsoftStore.connected ? badgeText : ''"
    :badgeVariant="microsoftStore.connected ? 'success' : 'neutral'"
    :description="microsoftStore.connected
      ? '' : 'Não conectada — faça login com sua conta @menin.com.br'"
    v-model="open">

    <template v-if="microsoftStore.connected">
      <div class="rounded-lg border border-accent/20 bg-accent-soft/40 px-3 py-2.5 text-xs text-accent leading-relaxed">
        <i class="fas fa-circle-check mr-1.5"></i>
        Sua conta Microsoft está vinculada. O sistema usa ela para autenticar e acessar recursos
        do ecossistema Microsoft (SharePoint, Teams, etc.) em seu nome.
      </div>

      <div v-if="canUnlink" class="mt-4">
        <Button variant="outline" :loading="microsoftStore.loading" icon="fas fa-unlink" @click="handleUnlink">
          {{ microsoftStore.loading ? 'Desvinculando...' : 'Desvincular conta Microsoft' }}
        </Button>
      </div>
      <p v-else class="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
        <i class="fas fa-triangle-exclamation"></i>
        Esta é sua única forma de login — não é possível desvincular sem configurar uma senha.
      </p>
    </template>

    <template v-else>
      <div class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-xs text-ink-muted leading-relaxed">
        <i class="fas fa-circle-info mr-1.5"></i>
        Conecte sua conta <strong class="text-ink">@menin.com.br</strong> para habilitar login simplificado
        e integração com SharePoint, Teams e outros serviços Microsoft.
      </div>

      <Button class="mt-4" @click="microsoftStore.redirectToLogin()">
        <svg width="14" height="14" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0"  y="0"  width="10" height="10" fill="#F25022" />
          <rect x="11" y="0"  width="10" height="10" fill="#7FBA00" />
          <rect x="0"  y="11" width="10" height="10" fill="#00A4EF" />
          <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
        </svg>
        Conectar conta Microsoft
      </Button>
    </template>
  </SettingsCard>
</template>
