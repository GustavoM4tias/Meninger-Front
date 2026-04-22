<template>
  <div class="min-h-full bg-gray-50 dark:bg-gray-950">
    <div class="max-w-2xl mx-auto px-4 py-8 space-y-6">

      <!-- Cabeçalho -->
      <div class="flex items-center gap-3">
        <button @click="$router.back()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <i class="fas fa-arrow-left text-sm"></i>
        </button>
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Configurações — Fichas Comerciais</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Aprovadores e comportamentos automáticos</p>
        </div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-20 text-gray-400">
        <i class="fas fa-spinner fa-spin text-2xl"></i>
      </div>

      <template v-else>
        <!-- Card: Aprovadores -->
        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-5">
          <div class="flex items-center gap-2 mb-1">
            <i class="fas fa-user-check text-blue-500"></i>
            <h2 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Aprovadores das Fichas</h2>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Ao enviar uma ficha para autorização, o sistema cria automaticamente um documento de assinatura
            para os dois usuários abaixo. Ambos precisam assinar para a ficha ser aprovada.
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Aprovador 1</label>
              <select
                v-model="form.approver_1_id"
                class="w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition"
              >
                <option :value="null">— Nenhum —</option>
                <option v-for="u in officeUsers" :key="u.id" :value="u.id">{{ u.username }}{{ u.email ? ` (${u.email})` : '' }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Aprovador 2</label>
              <select
                v-model="form.approver_2_id"
                class="w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition"
              >
                <option :value="null">— Nenhum —</option>
                <option v-for="u in officeUsers" :key="u.id" :value="u.id">{{ u.username }}{{ u.email ? ` (${u.email})` : '' }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Card: Auto-geração -->
        <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
          <div class="flex items-center gap-2 mb-1">
            <i class="fas fa-calendar-alt text-indigo-500"></i>
            <h2 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wide">Auto-geração Mensal</h2>
          </div>

          <label class="flex items-center justify-between gap-4 cursor-pointer select-none">
            <div>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200">Gerar fichas automaticamente todo dia 1</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Cria automaticamente uma ficha em rascunho para cada empreendimento que tenha ao menos uma ficha aprovada,
                sempre que ainda não exista ficha para o mês corrente.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="form.auto_generate_conditions"
              @click="form.auto_generate_conditions = !form.auto_generate_conditions"
              :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                form.auto_generate_conditions ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              ]"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  form.auto_generate_conditions ? 'translate-x-5' : 'translate-x-0'
                ]"
              />
            </button>
          </label>
        </div>

        <!-- Erro / Sucesso -->
        <div v-if="error" class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
          <i class="fas fa-exclamation-circle flex-shrink-0"></i> {{ error }}
        </div>
        <div v-if="saved" class="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 text-sm">
          <i class="fas fa-check-circle flex-shrink-0"></i> Configurações salvas com sucesso.
        </div>

        <!-- Ações -->
        <div class="flex justify-end">
          <button
            @click="handleSave"
            :disabled="saving"
            class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
          >
            <i class="fas fa-save text-xs"></i>
            {{ saving ? 'Salvando...' : 'Salvar Configurações' }}
          </button>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';

const store = useConditionsStore();

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
