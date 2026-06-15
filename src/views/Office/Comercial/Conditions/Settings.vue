<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import Surface from '@/components/UI/Surface.vue';
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

const editorSearch = ref('');
const authorizerSearch = ref('');

const form = ref({
  editor_user_ids: [],
  authorizer_user_ids: [],
  auto_generate_conditions: true,
});

function filterUsers(q) {
  const s = (q || '').toLowerCase().trim();
  if (!s) return officeUsers.value;
  return officeUsers.value.filter(u =>
    (u.username || '').toLowerCase().includes(s) ||
    (u.email || '').toLowerCase().includes(s)
  );
}
const filteredEditorUsers = computed(() => filterUsers(editorSearch.value));
const filteredAuthorizerUsers = computed(() => filterUsers(authorizerSearch.value));

function toggleId(field, id) {
  const arr = form.value[field];
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1);
  else arr.push(id);
}

async function handleSave() {
  error.value = '';
  saved.value = false;
  saving.value = true;
  try {
    await store.updateSettings({
      editor_user_ids: form.value.editor_user_ids,
      authorizer_user_ids: form.value.authorizer_user_ids,
      auto_generate_conditions: form.value.auto_generate_conditions,
    });
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
        editor_user_ids: [...(store.settings.editor_user_ids ?? [])],
        authorizer_user_ids: [...(store.settings.authorizer_user_ids ?? [])],
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
          <p class="text-sm text-ink-muted mt-0.5">Permissões e comportamentos automáticos</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="py-16 flex flex-col items-center gap-3 text-ink-muted">
        <Spinner size="lg" />
        <p class="text-sm">Carregando configurações...</p>
      </div>

      <template v-else>
        <div class="space-y-4">

          <!-- Editores -->
          <Surface variant="raised" padding="lg" class="space-y-3">
            <div class="flex items-center gap-2">
              <i class="fas fa-pen-to-square text-accent"></i>
              <h2 class="text-xs font-bold text-ink uppercase tracking-wider font-mono">Quem pode editar as fichas</h2>
            </div>
            <p class="text-xs text-ink-muted leading-relaxed">
              Usuários selecionados podem criar, editar e enviar fichas para autorização.
              Administradores sempre podem editar, independentemente desta lista.
            </p>

            <input v-model="editorSearch" type="text" placeholder="Buscar usuário..."
              class="w-full px-3 py-2 text-sm text-ink bg-surface-sunken/60 border border-line rounded-lg outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent-ring/20 transition" />

            <div class="max-h-60 overflow-auto rounded-lg border border-line divide-y divide-line">
              <label v-for="u in filteredEditorUsers" :key="u.id"
                class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-sunken/50 transition">
                <input type="checkbox" :checked="form.editor_user_ids.includes(u.id)"
                  @change="toggleId('editor_user_ids', u.id)"
                  class="w-4 h-4 accent-blue-600 rounded" />
                <span class="min-w-0">
                  <span class="text-sm text-ink">{{ u.username }}</span>
                  <span v-if="u.email" class="text-xs text-ink-subtle ml-1">{{ u.email }}</span>
                </span>
              </label>
              <p v-if="!filteredEditorUsers.length" class="px-3 py-4 text-sm text-ink-subtle text-center">Nenhum usuário encontrado.</p>
            </div>
            <p class="text-xs text-ink-muted">{{ form.editor_user_ids.length }} usuário(s) com permissão de editar.</p>
          </Surface>

          <!-- Autorizadores -->
          <Surface variant="raised" padding="lg" class="space-y-3">
            <div class="flex items-center gap-2">
              <i class="fas fa-user-check text-accent"></i>
              <h2 class="text-xs font-bold text-ink uppercase tracking-wider font-mono">Quem pode autorizar as fichas</h2>
            </div>
            <p class="text-xs text-ink-muted leading-relaxed">
              Usuários selecionados podem autorizar uma ficha enviada — basta <strong>um</strong> autorizador para liberá-la.
              Administradores sempre podem autorizar.
            </p>

            <input v-model="authorizerSearch" type="text" placeholder="Buscar usuário..."
              class="w-full px-3 py-2 text-sm text-ink bg-surface-sunken/60 border border-line rounded-lg outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent-ring/20 transition" />

            <div class="max-h-60 overflow-auto rounded-lg border border-line divide-y divide-line">
              <label v-for="u in filteredAuthorizerUsers" :key="u.id"
                class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-sunken/50 transition">
                <input type="checkbox" :checked="form.authorizer_user_ids.includes(u.id)"
                  @change="toggleId('authorizer_user_ids', u.id)"
                  class="w-4 h-4 accent-blue-600 rounded" />
                <span class="min-w-0">
                  <span class="text-sm text-ink">{{ u.username }}</span>
                  <span v-if="u.email" class="text-xs text-ink-subtle ml-1">{{ u.email }}</span>
                </span>
              </label>
              <p v-if="!filteredAuthorizerUsers.length" class="px-3 py-4 text-sm text-ink-subtle text-center">Nenhum usuário encontrado.</p>
            </div>
            <p class="text-xs text-ink-muted">{{ form.authorizer_user_ids.length }} usuário(s) com permissão de autorizar.</p>
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
                  Cria a ficha do mês para cada série ativa (com ou sem CV), herdando da última ficha.
                  Fichas encerradas não geram a próxima.
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
