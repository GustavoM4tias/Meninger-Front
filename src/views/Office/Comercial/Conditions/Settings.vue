<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import Surface from '@/components/UI/Surface.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Switch from '@/components/UI/Switch.vue';
import Spinner from '@/components/UI/Spinner.vue';

const store = useConditionsStore();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);
const saved = ref(false);
const error = ref('');
const officeUsers = ref([]);

const form = ref({
  approver_1_id: null,
  approver_2_id: null,
  auto_generate_conditions: true,
});

const userOptions = computed(() => [
  { value: null, label: '— Nenhum —' },
  ...officeUsers.value.map(u => ({
    value: u.id,
    label: u.username + (u.email ? ` (${u.email})` : ''),
  })),
]);

async function handleSave() {
  error.value = '';
  saved.value = false;
  saving.value = true;
  try {
    await store.updateSettings(form.value);
    saved.value = true;
    setTimeout(() => { saved.value = false; }, 3000);
  } catch (e) {
    error.value = e.message || 'Erro ao salvar configurações.';
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  try {
    await Promise.all([store.fetchSettings(), store.fetchOfficeUsers()]);
    officeUsers.value = store.officeUsers;
    if (store.settings) {
      form.value = {
        approver_1_id: store.settings.approver_1_id ?? null,
        approver_2_id: store.settings.approver_2_id ?? null,
        auto_generate_conditions: store.settings.auto_generate_conditions ?? true,
      };
    }
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="md">

      <!-- Header com voltar -->
      <div class="flex items-center gap-3 mb-6">
        <IconButton icon="fas fa-arrow-left" size="md" label="Voltar"
          @click="router.back()" />
        <div class="min-w-0">
          <h1 class="text-xl font-semibold text-ink">Configurações — Fichas comerciais</h1>
          <p class="text-sm text-ink-muted mt-0.5">Aprovadores e comportamentos automáticos</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="py-16 flex flex-col items-center gap-3 text-ink-muted">
        <Spinner size="lg" />
        <p class="text-sm">Carregando configurações...</p>
      </div>

      <template v-else>
        <div class="space-y-4">

          <!-- Aprovadores -->
          <Surface variant="raised" padding="lg" class="space-y-4">
            <div class="flex items-center gap-2">
              <i class="fas fa-user-check text-accent"></i>
              <h2 class="text-xs font-bold text-ink uppercase tracking-wider font-mono">Aprovadores das fichas</h2>
            </div>
            <p class="text-xs text-ink-muted leading-relaxed">
              Ao enviar uma ficha para autorização, o sistema cria automaticamente um documento de assinatura
              para os dois usuários abaixo. Ambos precisam assinar para a ficha ser aprovada.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select v-model="form.approver_1_id" :options="userOptions" label="Aprovador 1" />
              <Select v-model="form.approver_2_id" :options="userOptions" label="Aprovador 2" />
            </div>
          </Surface>

          <!-- Auto-geração -->
          <Surface variant="raised" padding="lg" class="space-y-3">
            <div class="flex items-center gap-2">
              <i class="far fa-calendar text-accent"></i>
              <h2 class="text-xs font-bold text-ink uppercase tracking-wider font-mono">Auto-geração mensal</h2>
            </div>

            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-ink">Gerar fichas automaticamente todo dia 1</p>
                <p class="text-xs text-ink-muted mt-1 leading-relaxed">
                  Cria automaticamente uma ficha em rascunho para cada empreendimento que tenha ao menos uma ficha aprovada,
                  sempre que ainda não exista ficha para o mês corrente.
                </p>
              </div>
              <Switch v-model="form.auto_generate_conditions" />
            </div>
          </Surface>

          <!-- Erro / Sucesso -->
          <div v-if="error"
            class="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-600 dark:text-red-400">
            <i class="fas fa-circle-exclamation shrink-0"></i>{{ error }}
          </div>
          <div v-if="saved"
            class="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-600 dark:text-emerald-400">
            <i class="fas fa-circle-check shrink-0"></i>Configurações salvas com sucesso.
          </div>

          <!-- Ações -->
          <div class="flex justify-end">
            <Button :icon="saving ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"
              :disabled="saving"
              @click="handleSave">
              {{ saving ? 'Salvando...' : 'Salvar configurações' }}
            </Button>
          </div>
        </div>
      </template>
    </PageContainer>
  </div>
</template>
