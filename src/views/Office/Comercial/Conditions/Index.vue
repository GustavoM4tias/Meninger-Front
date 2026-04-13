<template>
  <div class="min-h-full bg-gray-50 dark:bg-gray-950">
    <div class="max-w-7xl mx-auto px-4 py-8 space-y-6">

      <!-- Cabeçalho -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Fichas Comerciais</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Condições mensais de produto por empreendimento</p>
        </div>
        <button
          @click="openCreate = true"
          class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm"
        >
          <i class="fas fa-plus text-xs"></i> Nova Ficha
        </button>
      </div>

      <!-- Filtros -->
      <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
        <div class="flex flex-wrap gap-3">
          <div class="relative flex-1 min-w-48">
            <i class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
            <input
              v-model="search"
              type="text"
              placeholder="Buscar empreendimento..."
              class="w-full pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150"
            />
          </div>
          <select
            v-model="filterStatus"
            class="px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150"
          >
            <option value="">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
          <select
            v-model="filterMonth"
            class="px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150"
          >
            <option value="">Todos os meses</option>
            <option v-for="m in availableMonths" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
      </div>

      <!-- Erro -->
      <div v-if="store.error" class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
        <i class="fas fa-exclamation-circle"></i>
        {{ store.error }}
      </div>

      <!-- Carregando -->
      <div v-if="loading" class="flex items-center justify-center py-20 text-gray-400 dark:text-gray-500">
        <i class="fas fa-spinner fa-spin text-2xl"></i>
      </div>

      <!-- Grid -->
      <div v-else-if="filtered.length > 0" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="item in filtered"
          :key="item.id"
          class="flex flex-col justify-between relative group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer"
          @click="$router.push(`/comercial/conditions/${item.id}`)"
        >
          <!-- Status + mês -->
          <div class="flex items-center justify-between mb-3">
            <span class="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
              <i class="fas fa-calendar-alt"></i>
              {{ formatMonth(item.reference_month) }}
            </span>
            <span :class="badgeClass(item.status)" class="px-2.5 py-0.5 rounded-full text-xs font-semibold">
              {{ statusLabel(item.status) }}
            </span>
          </div>

          <!-- Nome do empreendimento -->
          <div class="mb-3">
            <p class="font-bold text-gray-900 dark:text-white text-base leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
              {{ item.enterprise?.nome ?? '—' }}
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {{ [item.enterprise?.cidade, item.enterprise?.segmento_nome].filter(Boolean).join(' · ') }}
            </p>
          </div>

          <!-- Módulos -->
          <div v-if="item.modules?.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="mod in item.modules.slice(0, 3)"
              :key="mod.id"
              class="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium"
            >
              {{ mod.module_name }}: {{ mod.total_units }} un.
            </span>
            <span v-if="item.modules.length > 3" class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg text-xs">
              +{{ item.modules.length - 3 }}
            </span>
          </div>

          <!-- Seta -->
          <div class="absolute bottom-3 right-4">
            <i class="fas fa-arrow-right text-xs text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition"></i>
          </div>
        </div>
      </div>

      <!-- Vazio -->
      <div v-else-if="!loading" class="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
        <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
          <i class="fas fa-file-contract text-2xl"></i>
        </div>
        <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Nenhuma ficha encontrada</p>
        <p class="text-xs mt-1">Crie a primeira ficha para começar.</p>
      </div>
    </div>

    <!-- Modal criar -->
    <transition name="modal">
      <div
        v-if="openCreate"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="openCreate = false"
      >
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 class="text-base font-bold text-gray-900 dark:text-white">Nova Ficha Comercial</h2>
            <button @click="openCreate = false" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>

          <div class="px-6 py-5 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Empreendimento</label>
              <select
                v-model="newForm.idempreendimento"
                class="w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150"
              >
                <option value="">Selecionar empreendimento...</option>
                <option v-for="ent in enterprises" :key="ent.idempreendimento" :value="ent.idempreendimento">
                  {{ ent.nome }}{{ ent.cidade ? ` — ${ent.cidade}` : '' }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Mês de Referência</label>
              <input
                v-model="newForm.reference_month"
                type="month"
                class="w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150"
              />
            </div>

            <div v-if="createError" class="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <i class="fas fa-exclamation-circle flex-shrink-0"></i>
              {{ createError }}
            </div>
          </div>

          <div class="flex justify-end gap-3 px-6 pb-5">
            <button @click="openCreate = false" class="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition">
              Cancelar
            </button>
            <button
              @click="handleCreate"
              :disabled="creating || !newForm.idempreendimento || !newForm.reference_month"
              class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <i class="fas fa-plus text-xs"></i>
              {{ creating ? 'Criando...' : 'Criar Ficha' }}
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
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';

const store = useConditionsStore();
const router = useRouter();

const loading = ref(true);
const search = ref('');
const filterStatus = ref('');
const filterMonth = ref('');
const openCreate = ref(false);
const creating = ref(false);
const createError = ref('');
const enterprises = ref([]);
const newForm = ref({ idempreendimento: '', reference_month: '' });

const availableMonths = computed(() => {
    const set = new Set((store.list ?? []).map(c => c.reference_month?.substring(0, 7)).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a)).map(v => {
        const [y, m] = v.split('-');
        const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        return { value: v, label: `${months[Number(m) - 1]}/${y}` };
    });
});

const filtered = computed(() => {
    let r = store.list ?? [];
    if (filterStatus.value) r = r.filter(c => c.status === filterStatus.value);
    if (filterMonth.value) r = r.filter(c => c.reference_month?.startsWith(filterMonth.value));
    if (search.value.trim()) {
        const s = search.value.toLowerCase();
        r = r.filter(c => c.enterprise?.nome?.toLowerCase().includes(s) || c.enterprise?.cidade?.toLowerCase().includes(s));
    }
    return r;
});

function badgeClass(status) {
    return status === 'published'
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
}

function statusLabel(status) {
    return status === 'published' ? 'Publicado' : 'Rascunho';
}

function formatMonth(dateStr) {
    if (!dateStr) return '—';
    const [y, m] = dateStr.split('-');
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return `${months[Number(m) - 1]}/${y}`;
}

async function handleCreate() {
    createError.value = '';
    creating.value = true;
    try {
        const result = await store.createCondition({
            idempreendimento: Number(newForm.value.idempreendimento),
            reference_month: newForm.value.reference_month,
        });
        openCreate.value = false;
        newForm.value = { idempreendimento: '', reference_month: '' };
        router.push(`/comercial/conditions/${result.id}`);
    } catch (e) {
        createError.value = e.message || 'Erro ao criar ficha.';
    } finally {
        creating.value = false;
    }
}

onMounted(async () => {
    try {
        await store.fetchList();
        const data = await requestWithAuth(`${API_URL}/cv/empreendimentos`);
        enterprises.value = (data ?? []).sort((a, b) => a.nome?.localeCompare(b.nome, 'pt-BR'));
    } finally {
        loading.value = false;
    }
});
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity .2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
