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

const badgeText = computed(() => {
  if (microsoftStore.connected) return `Conectada - ${authStore.user?.email}`;
  if (microsoftStore.needsReconnect) return 'Sessão expirada';
  return 'Não conectada';
});

async function handleConnect() {
  try {
    await microsoftStore.startLink();
  } catch (err) {
    toast.error(err?.message || 'Erro ao iniciar a conexão com a Microsoft.');
  }
}

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
    :badge="badgeText"
    :badgeVariant="microsoftStore.connected ? 'success' : (microsoftStore.needsReconnect ? 'warning' : 'neutral')"
    :description="microsoftStore.connected
      ? ''
      : (microsoftStore.needsReconnect
          ? 'A conta segue vinculada, mas o acesso caducou - entre de novo para renovar'
          : 'Não conectada - conecte sua conta @menin.com.br')"
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
      <p v-else class="mt-3 text-xs text-data-warn flex items-center gap-1">
        <i class="fas fa-triangle-exclamation"></i>
        Esta é sua única forma de login — não é possível desvincular sem configurar uma senha.
      </p>
    </template>

    <template v-else>
      <div class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5 text-xs text-ink-muted leading-relaxed">
        <i class="fas fa-circle-info mr-1.5"></i>
        <template v-if="microsoftStore.needsReconnect">
          O acesso à sua conta Microsoft caducou (troca de senha ou muito tempo sem uso).
          Entre de novo para voltar a usar Agenda, SharePoint e Planner.
        </template>
        <template v-else>
          Conecte sua conta <strong class="text-ink">@menin.com.br</strong> para habilitar login simplificado
          e integração com SharePoint, Teams e outros serviços Microsoft.
        </template>
      </div>

      <!-- Vincular, nao entrar: o backend amarra a conta a ESTA sessao e recusa
           se o e-mail da conta escolhida na Microsoft nao for o seu. -->
      <Button class="mt-4" :loading="microsoftStore.loading" @click="handleConnect">
        <svg width="14" height="14" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0"  y="0"  width="10" height="10" fill="#F25022" />
          <rect x="11" y="0"  width="10" height="10" fill="#7FBA00" />
          <rect x="0"  y="11" width="10" height="10" fill="#00A4EF" />
          <rect x="11" y="11" width="10" height="10" fill="#FFB900" />
        </svg>
        {{ microsoftStore.needsReconnect ? 'Reconectar conta Microsoft' : 'Conectar conta Microsoft' }}
      </Button>
    </template>
  </SettingsCard>
</template>
