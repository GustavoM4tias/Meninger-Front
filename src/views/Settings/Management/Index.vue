<template>
  <div class="h-full py-6 md:py-8 px-4">
    <div class="max-w-6xl mx-auto">
      <!-- Header -->
      <div class="mb-6 md:mb-8">
        <div class="flex items-center">
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Cargos e Alçadas
          </h1>
          <Favorite class="ml-3" :router="'/settings/management'" :section="'Cargos'" />
        </div>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Configure os cargos e as cidades disponíveis para cadastro e gestão dos usuários.
        </p>
      </div>

      <!-- Tabs -->
      <div class="flex flex-wrap gap-3 md:gap-4 mb-6" role="tablist" aria-label="Tipo de configuração">
        <button v-for="tab in tabs" :key="tab.value" @click="activeTab = tab.value"
          :aria-pressed="activeTab === tab.value" role="tab" :class="[
            'inline-flex items-center gap-2 px-4 md:px-5 py-2 rounded-xl font-semibold transition-all duration-300',
            'border dark:border-gray-700 shadow-sm hover:shadow',
            activeTab === tab.value
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent scale-[1.02]'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          ]">
          <i :class="tab.icon"></i>
          {{ tab.label }}
        </button>
      </div>

      <!-- FAB -->
      <div class="fixed bottom-6 right-6 z-30">
        <button @click="openModal(null)"
          class="group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full w-14 h-14 shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 flex items-center justify-center"
          :title="activeTab === 'positions' ? 'Adicionar Cargo' : 'Adicionar Cidade'">
          <i class="fas fa-plus text-xl group-hover:rotate-90 transition-transform duration-300"></i>
        </button>
      </div>

      <!--Erro -->
      <div v-if="store.error" class="mb-4 text-sm text-red-500 dark:text-red-400">
        {{ store.error }}
      </div>

      <!--Cargos -->
      <div v-if="activeTab === 'positions'">
        <div v-if="!store.positions.length" class="px-1 py-10 text-gray-500 dark:text-gray-400 text-sm">
          Nenhum cargo cadastrado.
        </div>

        <div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          <article v-for="p in store.positions" :key="p.id"
            class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <div
              class="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h2 class="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {{ p.name }}
                </h2>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    <i class="fas fa-hashtag mr-1.5"></i>
                    {{ p.code }}
                  </span>
                  <span v-if="p.is_internal"
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    <i class="fas fa-building mr-1.5"></i>
                    Interno
                  </span>
                  <span v-if="p.is_partner"
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <i class="fas fa-handshake mr-1.5"></i>
                    Parceiro
                  </span>
                </div>
              </div>

              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="px-2 py-0.5 rounded-full text-[11px]" :class="p.active
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'">
                  {{ p.active ? 'Ativo' : 'Inativo' }}
                </span>
                <div class="flex items-center gap-2">
                  <button @click="openModal(p)"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">
                    <i class="fas fa-pen mr-1"></i>
                    Editar
                  </button>
                  <button v-if="p.active" @click="deactivateItem(p)"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300">
                    <i class="fas fa-ban mr-1"></i>
                    Desativar
                  </button>
                </div>
              </div>
            </div>

            <div class="p-4 md:p-5 space-y-3">
              <div class="text-sm text-gray-600 dark:text-gray-300">
                <span class="font-medium">Descrição:</span>
                <span class="ml-1">
                  {{ p.description || '—' }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div v-else>
        <div v-if="!store.userCities.length" class="px-1 py-10 text-gray-500 dark:text-gray-400 text-sm">
          Nenhuma cidade cadastrada.
        </div>

        <div v-else class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          <article v-for="c in store.userCities" :key="c.id"
            class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <div
              class="p-4 md:p-5 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h2 class="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {{ c.name }}
                </h2>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    <i class="fas fa-map-marker-alt mr-1.5"></i>
                    {{ c.uf || 'UF não informada' }}
                  </span>
                </div>
              </div>

              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="px-2 py-0.5 rounded-full text-[11px]" :class="c.active
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'">
                  {{ c.active ? 'Ativo' : 'Inativo' }}
                </span>
                <div class="flex items-center gap-2">
                  <button @click="openModal(c)"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">
                    <i class="fas fa-pen mr-1"></i>
                    Editar
                  </button>
                  <button v-if="c.active" @click="deactivateItem(c)"
                    class="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300">
                    <i class="fas fa-ban mr-1"></i>
                    Desativar
                  </button>
                </div>
              </div>
            </div>

            <div class="p-4 md:p-5 space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <span class="text-xs text-gray-400 dark:text-gray-500">
                ID interno: {{ c.id }}
              </span>
            </div>
          </article>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-gray-900/60" @click="closeModal"></div>

        <div
          class="relative w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          role="dialog" aria-modal="true">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 class="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                {{ modalTitle }}
              </h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{
                  activeTab === 'positions'
                    ? 'Defina nome, código e tipo do cargo.'
                    : 'Defina nome e UF da cidade.'
                }}
              </p>
            </div>
            <button @click="closeModal"
              class="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white text-xl">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="p-6 space-y-4">
            <div v-if="activeTab === 'positions'" class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome do cargo
                </label>
                <input v-model="form.name" type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Gestor Comercial" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Código (único)
                </label>
                <input v-model="form.code" type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="Ex: GESTOR_COMERCIAL" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição
                </label>
                <textarea v-model="form.description" rows="3"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Resumo da função deste cargo (opcional)."></textarea>
              </div>

              <div class="flex items-center gap-4 text-sm">
                <label class="inline-flex items-center gap-2">
                  <input type="checkbox" v-model="form.is_internal" />
                  <span>Interno</span>
                </label>
                <label class="inline-flex items-center gap-2">
                  <input type="checkbox" v-model="form.is_partner" />
                  <span>Parceiro (Imobiliária / Corretor)</span>
                </label>
              </div>
            </div>

            <div v-else class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome da cidade
                </label>
                <input v-model="form.name" type="text"
                  class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Marília" />
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  UF
                </label>
                <input v-model="form.uf" type="text" maxlength="2"
                  class="w-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  placeholder="SP" />
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            <button
              class="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200"
              @click="closeModal">
              Cancelar
            </button>
            <button class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm" @click="saveItem">
              <i class="fas fa-save mr-2"></i>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Favorite from '@/components/config/Favorite.vue';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { useAdminMetaStore } from '@/stores/Settings/Admin/metaStore';

const router = useRouter();
const authStore = useAuthStore();
const store = useAdminMetaStore();

const tabs = [
  { value: 'positions', label: 'Cargos', icon: 'fas fa-id-badge' },
  { value: 'cities', label: 'Cidades', icon: 'fas fa-city' }
];

const activeTab = ref('positions');
const showModal = ref(false);
const editingItem = ref(null);

const form = ref({
  name: '',
  code: '',
  description: '',
  is_internal: true,
  is_partner: false,
  uf: ''
});

const modalTitle = computed(() => {
  if (activeTab.value === 'positions') {
    return editingItem.value ? 'Editar Cargo' : 'Novo Cargo';
  }
  return editingItem.value ? 'Editar Cidade' : 'Nova Cidade';
});

const resetForm = () => {
  form.value = {
    name: '',
    code: '',
    description: '',
    is_internal: true,
    is_partner: false,
    uf: ''
  };
};

const openModal = (item) => {
  editingItem.value = item || null;

  if (!item) {
    resetForm();
  } else if (activeTab.value === 'positions') {
    form.value = {
      name: item.name,
      code: item.code,
      description: item.description || '',
      is_internal: !!item.is_internal,
      is_partner: !!item.is_partner,
      uf: ''
    };
  } else {
    form.value = {
      name: item.name,
      uf: item.uf || '',
      code: '',
      description: '',
      is_internal: true,
      is_partner: false
    };
  }

  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveItem = async () => {
  try {
    if (activeTab.value === 'positions') {
      if (!form.value.name.trim() || !form.value.code.trim()) {
        alert('Nome e código do cargo são obrigatórios.');
        return;
      }

      const payload = {
        name: form.value.name.trim(),
        code: form.value.code.trim().toUpperCase(),
        description: form.value.description ? form.value.description.trim() : null,
        is_internal: !!form.value.is_internal,
        is_partner: !!form.value.is_partner
      };

      if (editingItem.value && editingItem.value.id) {
        await store.updatePosition(editingItem.value.id, payload);
      } else {
        await store.createPosition(payload);
      }
    } else {
      if (!form.value.name.trim()) {
        alert('Nome da cidade é obrigatório.');
        return;
      }

      const payload = {
        name: form.value.name.trim(),
        uf: form.value.uf ? form.value.uf.trim().toUpperCase() : null
      };

      if (editingItem.value && editingItem.value.id) {
        await store.updateUserCity(editingItem.value.id, payload);
      } else {
        await store.createUserCity(payload);
      }
    }

    closeModal();
  } catch (e) {
    alert(e.message || 'Erro ao salvar dados.');
  }
};

const deactivateItem = async (item) => {
  const label =
    activeTab.value === 'positions'
      ? `cargo "${item.name}"`
      : `cidade "${item.name}"`;

  if (!confirm(`Desativar ${label}?`)) {
    return;
  }

  try {
    if (activeTab.value === 'positions') {
      await store.deactivatePosition(item.id);
    } else {
      await store.deactivateUserCity(item.id);
    }
  } catch (e) {
    alert(e.message || 'Erro ao desativar.');
  }
};

onMounted(async () => {
  if (!authStore.hasRole('admin')) {
    router.push('/');
    return;
  }

  await Promise.all([
    store.fetchPositions(),
    store.fetchUserCities()
  ]);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
