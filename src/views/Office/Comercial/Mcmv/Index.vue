<template>
  <div class="min-h-full bg-gray-50 dark:bg-gray-950">
    <div class="max-w-3xl mx-auto px-4 py-8 space-y-5">

      <!-- Cabeçalho -->
      <div class="flex items-start justify-between gap-4">
        <div>
          <div class="flex items-center">
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">MCMV - Limites por Município</h1>
            <Favorite class="m-auto" :router="'/comercial/mcmv'" :section="'MCMV'" />
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Teto variável por cidade
            <span v-if="store.info.co_periodo" class="ml-1 opacity-70">· vigência {{ fmtVigencia(store.info.co_periodo)
            }}</span>
          </p>
        </div>
        <RouterLink v-if="isAdmin" to="/comercial/mcmv/settings"
          class="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition whitespace-nowrap">
          <i class="fas fa-cog text-xs"></i> Configurações
        </RouterLink>
      </div>

      <!-- Filtros -->
      <div class="flex gap-3">
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <i class="fas fa-search text-gray-400 text-xs"></i>
          </div>
          <input v-model="query" @input="onInput" type="text" placeholder="Buscar município..."
            class="w-full pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition" />
        </div>
        <select v-model="ufFilter" @change="onInput"
          class="w-28 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition">
          <option value="">Todos UFs</option>
          <option v-for="uf in UFS" :key="uf" :value="uf">{{ uf }}</option>
        </select>
      </div>

      <!-- Estado inicial -->
      <div v-if="!searched" class="text-center py-16 text-gray-400 dark:text-gray-600">
        <i class="fas fa-city text-4xl mb-3 block opacity-30"></i>
        <p class="text-sm">Digite o nome de um município ou filtre por UF</p>
        <p v-if="store.info.total" class="text-xs mt-1.5 opacity-60">
          {{ store.info.total.toLocaleString('pt-BR') }} municípios cadastrados
        </p>
      </div>

      <!-- Sem resultados -->
      <div v-else-if="searched && store.results.length === 0 && !store.error"
        class="text-center py-16 text-gray-400 dark:text-gray-600">
        <i class="fas fa-search text-3xl mb-3 block opacity-30"></i>
        <p class="text-sm">Nenhum município encontrado</p>
      </div>

      <!-- Erro -->
      <div v-if="store.error"
        class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
        <i class="fas fa-exclamation-circle flex-shrink-0"></i> {{ store.error }}
      </div>

      <!-- Tabela de resultados -->
      <div v-if="store.results.length > 0"
        class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <th
                class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Município</th>
              <th
                class="text-left px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-12">
                UF</th>
              <th
                class="text-left px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden sm:table-cell">
                Região</th>
              <th
                class="text-left px-3 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hidden md:table-cell w-20">
                Recorte</th>
              <th
                class="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Teto Faixa 2</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="m in store.results" :key="m.co_ibge"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
              <td class="px-4 py-3">
                <p class="font-medium text-gray-900 dark:text-white">{{ m.no_municipio }}</p>
                <p class="text-xs text-gray-400 mt-0.5">IBGE {{ m.co_ibge }}</p>
              </td>
              <td class="px-3 py-3">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {{ m.sg_uf }}
                </span>
              </td>
              <td class="px-3 py-3 hidden sm:table-cell text-xs text-gray-500 dark:text-gray-400">
                {{ m.no_regiao ?? '—' }}
              </td>
              <td class="px-3 py-3 hidden md:table-cell">
                <span v-if="m.co_recorte" class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                  :class="recorteClass(m.co_recorte)">
                  {{ m.co_recorte }}
                  <span class="ml-1 opacity-60 font-normal">G{{ m.co_grupo_regional }}</span>
                </span>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
              <td class="px-4 py-3 text-right">
                <span class="font-bold text-gray-900 dark:text-white tabular-nums">{{ fmtCurrency(m.vr_faixa2) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="store.results.length === 30"
          class="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 text-center">
          Mostrando os primeiros 30 resultados — refine a busca para ver menos
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useMcmvStore } from '@/stores/Comercial/Mcmv/mcmvStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import Favorite from "@/components/config/Favorite.vue";

const store = useMcmvStore();
const auth = useAuthStore();
const isAdmin = computed(() => auth?.user?.role === 'admin');

const query = ref('');
const ufFilter = ref('');
const searched = ref(false);
let debounceTimer = null;

const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

onMounted(() => store.fetchInfo());
onUnmounted(() => store.clearResults());

function onInput() {
  clearTimeout(debounceTimer);
  const hasQ = query.value.trim().length >= 2;
  const hasUF = ufFilter.value.trim().length > 0;
  if (!hasQ && !hasUF) {
    store.clearResults();
    searched.value = false;
    return;
  }
  debounceTimer = setTimeout(async () => {
    searched.value = true;
    await store.fetchSearch({ q: query.value, uf: ufFilter.value });
  }, 300);
}

function fmtCurrency(v) {
  if (!v) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

function fmtVigencia(v) {
  if (!v || v.length < 8) return v;
  return `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}`;
}

const RECORTE_CLASSES = {
  A: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  B: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  C: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  D: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
};
function recorteClass(r) {
  return RECORTE_CLASSES[r] ?? RECORTE_CLASSES.D;
}
</script>
