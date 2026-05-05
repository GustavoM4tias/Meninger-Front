<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RouterLink } from 'vue-router';
import { useMcmvStore } from '@/stores/Comercial/Mcmv/mcmvStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';

import Favorite from '@/components/config/Favorite.vue';
import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

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

const ufOptions = computed(() => [
  { value: '', label: 'Todos UFs' },
  ...UFS.map(u => ({ value: u, label: u })),
]);

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

function fmtNum(v) {
  if (!v) return '—';
  return new Intl.NumberFormat('pt-BR').format(v);
}

function fmtVigencia(v) {
  if (!v || v.length < 8) return v;
  return `${v.slice(6, 8)}/${v.slice(4, 6)}/${v.slice(0, 4)}`;
}

const RECORTE_CLASSES = {
  A: 'text-purple-600 dark:text-purple-300 bg-purple-500/10 border-purple-500/20',
  B: 'text-blue-600 dark:text-blue-300 bg-blue-500/10 border-blue-500/20',
  C: 'text-green-600 dark:text-green-300 bg-green-500/10 border-green-500/20',
  D: 'text-ink-muted bg-surface-sunken border-line',
};
function recorteClass(r) {
  return RECORTE_CLASSES[r] ?? RECORTE_CLASSES.D;
}
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)] relative">
    <PageContainer size="lg">

      <!-- Header -->
      <PageHeader icon="fas fa-city">
        <template #title>
          <span>MCMV — Limites por município</span>
          <Favorite :router="'/comercial/mcmv'" :section="'MCMV'" />
        </template>
        <template #subtitle>
          <span>Tetos de venda por faixa de renda e cidade</span>
          <span v-if="store.info.co_periodo" class="ml-1 opacity-70">
            · vigência <span class="font-mono">{{ fmtVigencia(store.info.co_periodo) }}</span>
          </span>
        </template>
        <template v-if="isAdmin" #actions>
          <RouterLink to="/comercial/mcmv/settings">
            <Button variant="ghost" size="sm" icon="fas fa-cog">
              <span class="hidden sm:inline">Configurações</span>
            </Button>
          </RouterLink>
        </template>
      </PageHeader>

      <!-- Filtros -->
      <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient mb-4">
        <div class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-[1fr_8rem] gap-3">
          <Input v-model="query" @input="onInput"
            placeholder="Buscar município..."
            iconLeft="fas fa-magnifying-glass" />
          <Select v-model="ufFilter" :options="ufOptions" @change="onInput" />
        </div>
      </section>

      <!-- Erro -->
      <div v-if="store.error"
        class="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
        <i class="fas fa-circle-exclamation"></i>{{ store.error }}
      </div>

      <!-- Estado inicial -->
      <EmptyState v-if="!searched"
        size="lg" icon="fas fa-city"
        title="Digite o nome de um município ou filtre por UF"
        :description="store.info.total ? `${store.info.total.toLocaleString('pt-BR')} municípios cadastrados` : ''" />

      <!-- Sem resultados -->
      <EmptyState v-else-if="searched && store.results.length === 0 && !store.error"
        size="lg" icon="fas fa-magnifying-glass"
        title="Nenhum município encontrado"
        description="Ajuste a busca ou troque o filtro de UF." />

      <!-- Resultados -->
      <div v-if="store.results.length > 0" class="space-y-3">
        <article v-for="m in store.results" :key="m.co_ibge"
          class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient p-4
                 hover:shadow-elevated hover:border-accent/30 transition-all duration-200 ease-out-expo">

          <!-- Cabeçalho -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="font-semibold text-ink">{{ m.no_municipio }}</p>
                <Badge variant="neutral" size="sm" class="font-mono">{{ m.sg_uf }}</Badge>
                <span v-if="m.co_recorte"
                  class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border"
                  :class="recorteClass(m.co_recorte)">
                  {{ m.co_recorte }}<span class="ml-1 opacity-60 font-normal">G{{ m.co_grupo_regional }}</span>
                </span>
              </div>
              <div class="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-ink-subtle">
                <span v-if="m.denominacao_hierarquia">{{ m.denominacao_hierarquia }}</span>
                <span v-if="m.no_regiao">{{ m.no_regiao }}</span>
                <span v-if="m.populacao" class="inline-flex items-center gap-1">
                  <i class="fas fa-users opacity-60"></i>
                  <span class="font-mono tabular-nums">{{ fmtNum(m.populacao) }}</span> hab.
                </span>
                <span class="font-mono">IBGE {{ m.co_ibge }}</span>
              </div>
            </div>
          </div>

          <!-- Tetos -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <!-- Faixa 2 -->
            <div class="rounded-xl p-3 bg-green-500/10 border border-green-500/20 text-center">
              <p class="text-xs font-semibold text-green-700 dark:text-green-300">Faixa 2</p>
              <p class="text-[10px] text-green-600/80 dark:text-green-400/80 mt-0.5">Renda até R$4.700</p>
              <p class="text-base font-bold text-green-700 dark:text-green-200 mt-1.5 tabular-nums">
                {{ fmtCurrency(m.vr_faixa2) }}
              </p>
              <p v-if="m.vr_anterior && m.vr_anterior !== m.vr_faixa2"
                class="text-[10px] text-green-600/70 dark:text-green-400/70 mt-0.5 tabular-nums">
                anterior: {{ fmtCurrency(m.vr_anterior) }}
              </p>
            </div>

            <!-- Faixa 3 -->
            <div class="rounded-xl p-3 bg-blue-500/10 border border-blue-500/20 text-center">
              <p class="text-xs font-semibold text-blue-700 dark:text-blue-300">Faixa 3</p>
              <p class="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">Renda R$4.700–8.000</p>
              <p class="text-base font-bold text-blue-700 dark:text-blue-200 mt-1.5 tabular-nums">
                {{ fmtCurrency(m.vr_faixa3) }}
              </p>
            </div>

            <!-- Faixa 4 -->
            <div class="rounded-xl p-3 bg-purple-500/10 border border-purple-500/20 text-center">
              <p class="text-xs font-semibold text-purple-700 dark:text-purple-300">Faixa 4</p>
              <p class="text-[10px] text-purple-600/80 dark:text-purple-400/80 mt-0.5">Renda até R$12.000</p>
              <p class="text-base font-bold text-purple-700 dark:text-purple-200 mt-1.5 tabular-nums">
                {{ fmtCurrency(store.info.faixa4) }}
              </p>
            </div>
          </div>
        </article>

        <p v-if="store.results.length === 30"
          class="text-xs text-center text-ink-subtle pt-2 font-mono">
          <i class="fas fa-circle-info text-[10px] mr-1"></i>
          Mostrando os primeiros 30 resultados — refine a busca para ver menos
        </p>
      </div>
    </PageContainer>
  </div>
</template>
