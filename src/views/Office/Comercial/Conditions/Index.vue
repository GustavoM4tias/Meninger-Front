<template>
  <div class="min-h-full bg-gray-50 dark:bg-gray-950">
    <div class="max-w-7xl mx-auto px-4 py-8 space-y-6">

      <!-- Cabeçalho -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Fichas Comerciais</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Condições mensais de produto por empreendimento</p>
        </div>
        <div v-if="isAdmin" class="flex items-center gap-2">
          <button
            @click="$router.push('/comercial/conditions/settings')"
            class="flex items-center gap-2 px-3 py-2.5 text-gray-500 dark:text-gray-400 text-sm font-medium rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            title="Configurações"
          >
            <i class="fas fa-cog text-sm"></i>
          </button>
          <button
            @click="openCreate = true"
            class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm"
          >
            <i class="fas fa-plus text-xs"></i> Nova Ficha
          </button>
        </div>
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
              class="w-full pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150"
            />
          </div>
          <select
            v-model="filterStatus"
            class="px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150"
          >
            <option value="">Todos os status</option>
            <option v-if="isAdmin" value="draft">Rascunho</option>
            <option v-if="isAdmin" value="pending_approval">Em Autorização</option>
            <option value="approved">Autorizado</option>
          </select>
        </div>
      </div>

      <!-- Erro -->
      <div v-if="store.error" class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
        <i class="fas fa-exclamation-circle"></i> {{ store.error }}
      </div>

      <!-- Carregando -->
      <div v-if="loading" class="flex items-center justify-center py-20 text-gray-400">
        <i class="fas fa-spinner fa-spin text-2xl"></i>
      </div>

      <!-- Grid agrupado por empreendimento -->
      <div v-else-if="filteredGroups.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="group in filteredGroups"
          :key="group.enterprise.idempreendimento"
          class="relative group bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer overflow-hidden"
          @click="openGroup(group)"
        >
          <!-- Faixa de status no topo -->
          <div :class="['h-1', statusBarClass(group.latest.status)]"></div>

          <div class="p-5">
            <!-- Nome do empreendimento -->
            <div class="mb-3">
              <p class="font-bold text-gray-900 dark:text-white text-base leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                {{ group.enterprise.nome ?? '—' }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {{ [group.enterprise.cidade, group.enterprise.segmento_nome].filter(Boolean).join(' · ') }}
              </p>
            </div>

            <!-- Ficha mais recente -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <i class="fas fa-calendar-alt text-gray-300 dark:text-gray-600 text-xs"></i>
                <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">{{ formatMonth(group.latest.reference_month) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span :class="badgeClass(group.latest.status)" class="px-2.5 py-0.5 rounded-full text-xs font-semibold">
                  {{ statusLabel(group.latest.status) }}
                </span>
                <span v-if="group.conditions.length > 1"
                  class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  :title="`${group.conditions.length} fichas no histórico`">
                  {{ group.conditions.length }} fichas
                </span>
              </div>
            </div>

            <!-- Módulos da ficha mais recente -->
            <div v-if="group.latest.modules?.length" class="flex flex-wrap gap-1.5">
              <span
                v-for="mod in group.latest.modules.slice(0, 4)"
                :key="mod.id"
                class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium"
              >
                <span class="truncate max-w-[90px]">{{ mod.module_name }}</span>
                <span class="text-blue-400 dark:text-blue-500 font-normal">{{ mod.total_units }}u</span>
              </span>
              <span v-if="group.latest.modules.length > 4" class="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg text-xs">
                +{{ group.latest.modules.length - 4 }}
              </span>
            </div>
            <p v-else class="text-xs text-gray-300 dark:text-gray-700 italic">Sem módulos</p>
          </div>

          <div class="absolute bottom-4 right-4">
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

    <!-- ── Modal criar ──────────────────────────────────────────────────────── -->
    <transition name="modal">
      <div
        v-if="openCreate"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="closeCreate"
      >
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">

          <!-- Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            <div class="flex items-center gap-2">
              <i class="fas fa-file-plus text-blue-500"></i>
              <h2 class="text-base font-bold text-gray-900 dark:text-white">Nova Ficha Comercial</h2>
            </div>
            <button @click="closeCreate" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="px-6 py-5 space-y-5 overflow-y-auto flex-1">

            <!-- Empreendimento -->
            <div>
              <label class="lbl">Empreendimento</label>
              <select
                v-model="newForm.idempreendimento"
                @change="onEnterpriseChange"
                class="inp"
              >
                <option value="">Selecionar empreendimento...</option>
                <option v-for="ent in enterprises" :key="ent.idempreendimento" :value="ent.idempreendimento">
                  {{ ent.nome }}{{ ent.cidade ? ` — ${ent.cidade}` : '' }}
                </option>
              </select>
            </div>

            <!-- Mês de Referência -->
            <div>
              <label class="lbl">Mês de Referência</label>
              <input
                v-model="newForm.reference_month"
                type="month"
                class="inp"
              />
            </div>

            <!-- Módulos / Etapas do CV -->
            <div v-if="newForm.idempreendimento">
              <div class="flex items-center justify-between mb-2">
                <label class="lbl mb-0">Módulos a incluir</label>
                <div v-if="enterpriseStages.length && !loadingStages" class="flex items-center gap-2">
                  <button @click="selectAllStages" class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Todos</button>
                  <span class="text-gray-300 dark:text-gray-600">·</span>
                  <button @click="newForm.selectedStageIds = []" class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:underline">Nenhum</button>
                </div>
              </div>

              <!-- Carregando etapas -->
              <div v-if="loadingStages" class="flex items-center gap-2 py-3 text-xs text-gray-400">
                <i class="fas fa-spinner fa-spin"></i> Carregando etapas do CV...
              </div>

              <!-- Etapas disponíveis -->
              <div v-else-if="enterpriseStages.length" class="space-y-2">
                <div
                  v-for="stage in enterpriseStages"
                  :key="stage.idetapa"
                  :class="[
                    'rounded-xl border transition-all',
                    newForm.selectedStageIds.includes(stage.idetapa)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40'
                  ]"
                >
                  <!-- Linha principal da etapa -->
                  <label class="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      :value="stage.idetapa"
                      v-model="newForm.selectedStageIds"
                      class="sr-only"
                    />
                    <!-- Checkbox visual -->
                    <span
                      :class="[
                        'flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all',
                        newForm.selectedStageIds.includes(stage.idetapa)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 dark:border-gray-600'
                      ]"
                    >
                      <svg v-if="newForm.selectedStageIds.includes(stage.idetapa)" class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M1 4l2.5 2.5L9 1"/>
                      </svg>
                    </span>

                    <div class="flex-1 min-w-0">
                      <p :class="['text-sm font-semibold', newForm.selectedStageIds.includes(stage.idetapa) ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200']">
                        {{ stage.nome }}
                      </p>
                      <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {{ stage.total_units ?? 0 }} unidades
                        <span v-if="stage.blocos?.length" class="ml-1">· {{ stage.blocos.length }} bloco{{ stage.blocos.length > 1 ? 's' : '' }}</span>
                      </p>
                    </div>

                    <!-- Botão expandir blocos -->
                    <button
                      v-if="stage.blocos?.length"
                      type="button"
                      @click.prevent="toggleStageExpand(stage.idetapa)"
                      :class="['w-6 h-6 flex items-center justify-center rounded transition-transform text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                        expandedStages.has(stage.idetapa) ? 'rotate-90' : '']"
                    >
                      <i class="fas fa-chevron-right text-[10px]"></i>
                    </button>
                    <i v-else class="fas fa-layer-group text-xs flex-shrink-0"
                      :class="newForm.selectedStageIds.includes(stage.idetapa) ? 'text-blue-400' : 'text-gray-300 dark:text-gray-600'">
                    </i>
                  </label>

                  <!-- Blocos expandidos -->
                  <div v-if="expandedStages.has(stage.idetapa) && stage.blocos?.length"
                    class="px-4 pb-3 space-y-1 border-t border-gray-100 dark:border-gray-800 pt-2">
                    <div
                      v-for="bloco in stage.blocos"
                      :key="bloco.idbloco"
                      class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/80 dark:bg-gray-800/60 text-xs"
                    >
                      <div class="flex items-center gap-2">
                        <i class="fas fa-building text-gray-300 dark:text-gray-600"></i>
                        <span class="text-gray-700 dark:text-gray-300 font-medium">{{ bloco.nome }}</span>
                      </div>
                      <span class="text-gray-400 dark:text-gray-500">{{ bloco.total_unidades ?? 0 }} un.</span>
                    </div>
                  </div>
                </div>

                <!-- Opção: módulo avulso (sem etapa) -->
                <label
                  :class="[
                    'flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all select-none',
                    newForm.includeCustom
                      ? 'border-gray-500 bg-gray-50 dark:bg-gray-800/40'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 hover:border-gray-300'
                  ]"
                >
                  <input type="checkbox" v-model="newForm.includeCustom" class="sr-only"/>
                  <span :class="['flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all', newForm.includeCustom ? 'border-gray-600 bg-gray-600' : 'border-gray-300 dark:border-gray-600']">
                    <svg v-if="newForm.includeCustom" class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M1 4l2.5 2.5L9 1"/>
                    </svg>
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Módulo avulso</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Sem etapa do CV — preencher manualmente</p>
                  </div>
                  <i class="fas fa-cube text-xs text-gray-300 dark:text-gray-600 flex-shrink-0"></i>
                </label>
              </div>

              <!-- Sem etapas no CV -->
              <div v-else class="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
                <i class="fas fa-exclamation-triangle flex-shrink-0"></i>
                Nenhuma etapa cadastrada no CV para este empreendimento.
                <span class="text-amber-600">Você pode criar a ficha e adicionar módulos avulsos depois.</span>
              </div>

              <!-- Resumo da seleção -->
              <p v-if="totalSelectedModules > 0" class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <i class="fas fa-check-circle text-blue-400 mr-1"></i>
                {{ totalSelectedModules }} módulo{{ totalSelectedModules > 1 ? 's' : '' }} selecionado{{ totalSelectedModules > 1 ? 's' : '' }}
              </p>
              <p v-else class="text-xs text-amber-600 dark:text-amber-400 mt-2">
                <i class="fas fa-exclamation-circle mr-1"></i>
                Selecione ao menos um módulo ou marque "Módulo avulso".
              </p>
            </div>

            <!-- Erro -->
            <div v-if="createError" class="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <i class="fas fa-exclamation-circle flex-shrink-0"></i>
              {{ createError }}
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end gap-3 px-6 pb-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
            <button @click="closeCreate" class="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition">
              Cancelar
            </button>
            <button
              @click="handleCreate"
              :disabled="creating || !newForm.idempreendimento || !newForm.reference_month || totalSelectedModules === 0"
              class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
            >
              <i :class="creating ? 'fa-spinner fa-spin' : 'fa-plus'" class="fas text-xs"></i>
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
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import API_URL from '@/config/apiUrl';

const store = useConditionsStore();
const auth  = useAuthStore();
const router = useRouter();

const isAdmin = computed(() => auth.hasRole('admin'));

const loading = ref(true);
const search = ref('');
const filterStatus = ref('');

// ── Criação ───────────────────────────────────────────────────────────────────

const openCreate     = ref(false);
const creating       = ref(false);
const createError    = ref('');
const enterprises    = ref([]);
const enterpriseStages = ref([]);
const loadingStages  = ref(false);

const newForm = ref({
    idempreendimento: '',
    reference_month: '',
    selectedStageIds: [],
    includeCustom: false,
});

const expandedStages = ref(new Set());

function toggleStageExpand(idetapa) {
    const next = new Set(expandedStages.value);
    if (next.has(idetapa)) next.delete(idetapa);
    else next.add(idetapa);
    expandedStages.value = next;
}

const totalSelectedModules = computed(() =>
    newForm.value.selectedStageIds.length + (newForm.value.includeCustom ? 1 : 0)
);

function closeCreate() {
    openCreate.value = false;
    newForm.value = { idempreendimento: '', reference_month: '', selectedStageIds: [], includeCustom: false };
    enterpriseStages.value = [];
    expandedStages.value = new Set();
    createError.value = '';
}

function selectAllStages() {
    newForm.value.selectedStageIds = enterpriseStages.value.map(s => s.idetapa);
}

async function onEnterpriseChange() {
    newForm.value.selectedStageIds = [];
    newForm.value.includeCustom = false;
    enterpriseStages.value = [];
    if (!newForm.value.idempreendimento) return;
    loadingStages.value = true;
    try {
        enterpriseStages.value = await store.fetchEnterpriseStages(newForm.value.idempreendimento);
        // Pré-seleciona todas as etapas
        selectAllStages();
    } catch (e) {
        console.warn('[Index] fetchEnterpriseStages:', e.message);
    } finally {
        loadingStages.value = false;
    }
}

async function handleCreate() {
    createError.value = '';
    creating.value = true;
    try {
        const payload = {
            idempreendimento: Number(newForm.value.idempreendimento),
            reference_month:  newForm.value.reference_month,
            selectedStageIds: newForm.value.selectedStageIds,
        };
        // Se incluiu módulo avulso: manda um módulo vazio extra para o backend criar
        // O backend ignora selectedStageIds para avulso — adicionamos depois no Detail
        const result = await store.createCondition(payload);
        closeCreate();
        router.push(`/comercial/conditions/${result.id}`);
    } catch (e) {
        createError.value = e.message || 'Erro ao criar ficha.';
    } finally {
        creating.value = false;
    }
}

// ── Agrupamento por empreendimento ────────────────────────────────────────────

const groups = computed(() => {
    const map = new Map();
    for (const c of (store.list ?? [])) {
        const eid = c.enterprise?.idempreendimento ?? c.idempreendimento;
        if (!map.has(eid)) {
            map.set(eid, { enterprise: c.enterprise ?? { idempreendimento: eid }, conditions: [] });
        }
        map.get(eid).conditions.push(c);
    }
    for (const g of map.values()) {
        g.conditions.sort((a, b) => b.reference_month.localeCompare(a.reference_month));
        g.latest = g.conditions[0];
    }
    return [...map.values()].sort((a, b) =>
        (a.enterprise?.nome ?? '').localeCompare(b.enterprise?.nome ?? '', 'pt-BR')
    );
});

const filteredGroups = computed(() => {
    let r = groups.value;
    if (filterStatus.value) {
        r = r.filter(g => g.latest?.status === filterStatus.value);
    }
    if (search.value.trim()) {
        const s = search.value.toLowerCase();
        r = r.filter(g =>
            g.enterprise?.nome?.toLowerCase().includes(s) ||
            g.enterprise?.cidade?.toLowerCase().includes(s)
        );
    }
    return r;
});

function openGroup(group) {
    router.push(`/comercial/conditions/${group.latest.id}`);
}

// ── Helpers visuais ───────────────────────────────────────────────────────────

const STATUS_MAP = {
    draft:            { label: 'Rascunho',       cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',  bar: 'bg-amber-400' },
    pending_approval: { label: 'Em Autorização', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',    bar: 'bg-blue-500' },
    approved:         { label: 'Autorizado',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', bar: 'bg-green-500' },
    published:        { label: 'Autorizado',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', bar: 'bg-green-500' },
};

function badgeClass(s)     { return STATUS_MAP[s]?.cls ?? 'bg-gray-100 text-gray-600'; }
function statusLabel(s)    { return STATUS_MAP[s]?.label ?? s; }
function statusBarClass(s) { return STATUS_MAP[s]?.bar ?? 'bg-gray-300 dark:bg-gray-700'; }

function formatMonth(dateStr) {
    if (!dateStr) return '—';
    const [y, m] = dateStr.split('-');
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${months[Number(m) - 1]}/${y}`;
}

// ── Init ──────────────────────────────────────────────────────────────────────

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
.lbl { @apply block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5; }
.inp { @apply w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150; }
.modal-enter-active, .modal-leave-active { transition: opacity .2s; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
