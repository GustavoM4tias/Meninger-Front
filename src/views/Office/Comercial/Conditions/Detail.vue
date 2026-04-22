<template>
  <div class="min-h-full bg-gray-50 dark:bg-gray-950">

    <!-- Toast -->
    <transition name="fade">
      <div
        v-if="toast.show"
        :class="[
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        ]"
      >
        <i :class="toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'" class="fas"></i>
        {{ toast.message }}
      </div>
    </transition>

    <!-- Modal: Desbloquear -->
    <transition name="fade">
      <div
        v-if="showUnlockModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="showUnlockModal = false"
      >
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-2">
              <i class="fas fa-lock-open text-amber-500"></i>
              <h2 class="text-base font-bold text-gray-900 dark:text-white">Desbloquear Ficha</h2>
            </div>
            <button @click="showUnlockModal = false" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div class="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-sm">
              <i class="fas fa-exclamation-triangle flex-shrink-0 mt-0.5"></i>
              <p>
                Desbloquear esta ficha irá <strong>desautorizá-la</strong> e cancelar o processo de assinatura vigente.
                Ela voltará ao status <strong>Rascunho</strong> e precisará ser enviada para autorização novamente.
              </p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Motivo do desbloqueio (opcional)</label>
              <textarea
                v-model="unlockNote"
                rows="3"
                placeholder="Ex: Correção no valor de comissão..."
                class="w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder:text-gray-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 transition resize-none"
              />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 pb-5">
            <button @click="showUnlockModal = false" class="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition">
              Cancelar
            </button>
            <button
              @click="handleUnlock"
              :disabled="actionLoading"
              class="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition"
            >
              <i class="fas fa-lock-open text-xs"></i>
              {{ actionLoading ? 'Desbloqueando...' : 'Confirmar Desbloqueio' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Erro de carregamento -->
    <div v-if="fetchError && !detail" class="flex flex-col items-center justify-center py-24 text-center px-4">
      <div class="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>
      </div>
      <p class="text-base font-semibold text-gray-800 dark:text-gray-200">Erro ao carregar ficha</p>
      <p class="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-sm">{{ fetchError }}</p>
      <button @click="retryFetch" class="mt-5 flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition">
        <i class="fas fa-arrows-rotate text-xs"></i>
        Tentar novamente
      </button>
    </div>

    <!-- Carregando -->
    <div v-else-if="!detail && !fetchError" class="flex items-center justify-center py-24 text-gray-400">
      <i class="fas fa-spinner fa-spin text-2xl"></i>
    </div>

    <template v-if="detail">
      <!-- ─── Header ─────────────────────────────────────────────────────── -->
      <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div class="max-w-7xl mx-auto px-4">
          <!-- Top bar -->
          <div class="flex items-center justify-between pb-4 pt-6 gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <button @click="$router.back()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex-shrink-0">
                <i class="fas fa-arrow-left text-sm"></i>
              </button>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h1 class="text-lg lg:text-xl font-bold text-gray-900 dark:text-white truncate">
                    {{ detail.enterprise?.nome ?? '...' }}
                  </h1>
                  <span :class="badgeClass(detail.status)" class="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0">
                    {{ statusLabel(detail.status) }}
                  </span>
                </div>
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  {{ detail.enterprise?.cidade }}
                  <span class="mx-1">·</span>
                  Ref: {{ formatMonth(detail.reference_month) }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              <!-- Navegador de histórico (meses anteriores) -->
              <div v-if="detail.history?.length > 1" class="flex items-center gap-1.5">
                <i class="fas fa-history text-xs text-gray-400"></i>
                <select
                  :value="detail.id"
                  @change="navigateToMonth($event.target.value)"
                  class="text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  title="Navegar pelo histórico"
                >
                  <option v-for="h in detail.history" :key="h.id" :value="h.id">
                    {{ formatMonth(h.reference_month) }}
                    <template v-if="isAdmin">· {{ STATUS_MAP[h.status]?.label }}</template>
                  </option>
                </select>
              </div>

              <!-- Ações por status (admin only) -->
              <template v-if="isAdmin">
                <!-- draft → Enviar para Autorização -->
                <button
                  v-if="detail.status === 'draft'"
                  @click="handleSubmitForApproval"
                  :disabled="actionLoading"
                  class="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  <i class="fas fa-paper-plane text-xs"></i>
                  <span class="hidden sm:inline">Enviar para Autorização</span>
                </button>

                <!-- pending_approval → aguardando assinaturas -->
                <div
                  v-else-if="detail.status === 'pending_approval'"
                  class="flex items-center gap-2 px-3.5 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-xl border border-blue-200 dark:border-blue-800"
                >
                  <i class="fas fa-signature text-xs"></i>
                  <span class="hidden sm:inline">Aguardando assinaturas</span>
                </div>

                <!-- approved → Desbloquear -->
                <button
                  v-else-if="detail.status === 'approved'"
                  @click="showUnlockModal = true"
                  class="flex items-center gap-2 px-3.5 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl hover:bg-amber-600 transition"
                >
                  <i class="fas fa-lock-open text-xs"></i>
                  <span class="hidden sm:inline">Desbloquear</span>
                </button>
              </template>

              <!-- Salvar Tudo — apenas quando editável -->
              <button
                v-if="!isLocked"
                @click="handleSaveAll"
                :disabled="saving"
                class="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <i :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" class="fas"></i>
                <span class="hidden sm:inline">{{ saving ? 'Salvando...' : 'Salvar Tudo' }}</span>
              </button>
            </div>
          </div>

          <!-- Banner de status locked -->
          <div
            v-if="detail.status === 'approved'"
            class="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-xs"
          >
            <i class="fas fa-lock"></i>
            <span>Ficha autorizada e bloqueada para edição.
              <template v-if="detail.approved_at"> Aprovada em {{ formatDateFull(detail.approved_at) }}.</template>
              <template v-if="isAdmin"> Clique em <strong>Desbloquear</strong> para editar.</template>
            </span>
          </div>

          <div
            v-else-if="detail.status === 'pending_approval'"
            class="flex items-center gap-2 mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-700 dark:text-blue-400 text-xs"
          >
            <i class="fas fa-clock"></i>
            <span>Em processo de autorização — aguardando assinaturas dos aprovadores.</span>
          </div>

          <!-- Banner: alterações não salvas -->
          <div
            v-else-if="isDirty && !isLocked"
            class="flex items-center justify-between gap-2 mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-800 dark:text-amber-300 text-xs"
          >
            <div class="flex items-center gap-2">
              <i class="fas fa-circle-dot animate-pulse"></i>
              <span>Alterações não salvas — clique em <strong>Salvar Tudo</strong> para não perder os dados.</span>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex gap-0 overflow-x-auto scrollbar-hide -mb-px">
            <button
              v-for="tab in visibleTabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              ]"
            >
              <i :class="tab.icon" class="text-xs"></i>
              {{ tab.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- ─── Content ────────────────────────────────────────────────────── -->
      <div class="max-w-7xl mx-auto px-4 py-6">

        <!-- Módulos -->
        <div v-show="activeTab === 'modules'">
          <ModuleSection
            :modules="localModules"
            :condition-id="detail.id"
            :condition-status="detail.status"
            :saving="saving"
            :readonly="isLocked"
            :price-tables="store.priceTables"
            :correspondents="store.correspondents"
            :office-users="store.officeUsers"
            :enterprise-options="enterpriseOptions"
            :enterprise-stages="detail.stages ?? []"
            :history="detail.history ?? []"
            :current-condition-id="detail.id"
            :condition-idempreendimento="detail.idempreendimento"
            @update:modules="onModulesChange"
            @save="handleSaveModules"
            @save-silent="handleSaveModulesSilent"
            @copy="handleCopyModule"
            @copy-from-enterprise="handleCopyFromEnterprise"
            @navigate-month="navigateToMonth"
            @delete-module="handleDeleteModule"
          />
        </div>

        <!-- Resumo / PDF -->
        <div v-show="activeTab === 'summary'">
          <SummaryExport
            :detail="detail"
            :local-modules="localModules"
            :price-tables="store.priceTables"
            :correspondents="store.correspondents"
            :office-users="store.officeUsers"
            :enterprise-stages="detail.stages ?? []"
            :is-admin="isAdmin"
            :action-loading="actionLoading"
            @navigate-month="navigateToMonth"
            @submit-for-approval="handleSubmitForApproval"
            @unlock="showUnlockModal = true"
          />
        </div>

        <!-- Histórico -->
        <div v-if="activeTab === 'history'">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <!-- Histórico de Aprovação -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <i class="fas fa-shield-check text-indigo-500"></i> Histórico de Aprovação
              </p>
              <div v-if="approvalHistory.length" class="space-y-3">
                <div
                  v-for="(ev, i) in approvalHistory"
                  :key="i"
                  class="flex items-start gap-3"
                >
                  <div class="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    :class="eventIconClass(ev.action)">
                    <i :class="eventIcon(ev.action)" class="fas"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ eventLabel(ev.action) }}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500">
                      {{ ev.username || 'Sistema' }}
                      <span class="mx-1">·</span>
                      {{ formatDateFull(ev.at) }}
                    </p>
                    <p v-if="ev.note" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic">{{ ev.note }}</p>
                  </div>
                </div>
              </div>
              <div v-else class="flex items-center justify-center py-10 text-gray-400 dark:text-gray-600 text-sm">
                Nenhum evento de aprovação registrado.
              </div>
            </div>

            <!-- Histórico de Alterações -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <i class="fas fa-pen-to-square text-amber-500"></i> Histórico de Alterações
              </p>
              <div v-if="changeHistory.length" class="space-y-3">
                <div
                  v-for="(ev, i) in changeHistory"
                  :key="i"
                  class="flex items-start gap-3"
                >
                  <div class="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs"
                    :class="eventIconClass(ev.action)">
                    <i :class="eventIcon(ev.action)" class="fas"></i>
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ eventLabel(ev.action) }}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500">
                      {{ ev.username || 'Sistema' }}
                      <span class="mx-1">·</span>
                      {{ formatDateFull(ev.at) }}
                    </p>
                    <p v-if="ev.note" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic break-words">{{ ev.note }}</p>
                  </div>
                </div>
              </div>
              <div v-else class="flex items-center justify-center py-10 text-gray-400 dark:text-gray-600 text-sm">
                Nenhuma alteração registrada.
              </div>
            </div>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import ModuleSection from './components/ModuleSection.vue';
import SummaryExport from './components/SummaryExport.vue';

const route = useRoute();
const router = useRouter();
const store = useConditionsStore();
const auth = useAuthStore();

const isAdmin = computed(() => auth.hasRole('admin'));

// Ficha bloqueada quando aprovada OU quando o usuário não é admin
const isLocked = computed(() =>
    !isAdmin.value || detail.value?.status === 'approved' || detail.value?.status === 'pending_approval'
);

const activeTab = ref('modules');
const saving = ref(false);
const actionLoading = ref(false);
const showUnlockModal = ref(false);
const unlockNote = ref('');
const toast = reactive({ show: false, type: 'success', message: '' });
const fetchError = ref(null);
const isDirty = ref(false);

// Empreendimentos para o modal de copiar de outro empreendimento
const enterpriseOptions = ref([]);

const STATUS_MAP = {
    draft:            { label: 'Rascunho',       cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    pending_approval: { label: 'Em Autorização', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    approved:         { label: 'Autorizado',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    published:        { label: 'Autorizado',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

const ALL_TABS = [
    { id: 'modules', label: 'Módulos', icon: 'fas fa-layer-group', adminOnly: false },
    { id: 'summary', label: 'Resumo',  icon: 'fas fa-file-pdf',    adminOnly: false },
    { id: 'history', label: 'Histórico', icon: 'fas fa-timeline',  adminOnly: false },
];

const visibleTabs = computed(() =>
    ALL_TABS.filter(t => !t.adminOnly || isAdmin.value)
);

const detail = computed(() => store.detail);

// localModules: cada módulo carrega todos os seus campos + campaigns[]
const localModules = ref([]);

// Campos mínimos do nível da condition (mantidos para compatibilidade)
// Não são mais o foco da edição; os dados por módulo substituem isso
const form = ref({
    notes: '',
});

// ─── Defaults de módulo novo ──────────────────────────────────────────────────
function moduleDefaults(m = {}) {
    // structuredClone para deep-copy total segura (arrays, objetos aninhados, JSONB)
    const base = {
        campaigns: [],
        price_table_ids: [],
        manual_price_tables: [],
        appraisal_faixas: null,
        price_premise_note: '',
        max_entry_value: null,
        rp_installment_value: null,
        act_installment_value: null,
        min_installment_value: null,
        max_installments: null,
        rp_rule: '',
        installment_until_habite_se: '',
        installment_post_habite_se: '',
        has_state_subsidy: false,
        state_subsidy_note: '',
        state_subsidy_state: '',
        state_subsidy_program: '',
        state_subsidy_custom_state: '',
        state_subsidy_rules: '',
        state_subsidy_conditions: '',
        manager_user_id: null,
        manager_mode: 'sistema',
        manager_name: '',
        manager_email: '',
        manager_phone: '',
        delivery_deadline_months: null,
        delivery_deadline_note: '',
        commission_pct: null,
        commission_source: 'cv',
        contract_registration_by: '',
        contract_registered_by_user_id: null,
        outros_contact_name: '',
        outros_contact_email: '',
        outros_contact_phone: '',
        cca_company_name: '',
        cca_cost: null,
        cca_charges_company: false,
        correspondent_id: null,
        has_digital_cert: false,
        digital_cert_provider: '',
        digital_cert_contact: '',
        notes: '',
    };
    // Merge com clone profundo dos valores vindos da API
    // idetapa is always preserved from m; base never shadows it
    try {
        return structuredClone({ ...base, ...m });
    } catch {
        return JSON.parse(JSON.stringify({ ...base, ...m }));
    }
}

function populateFromDetail(d) {
    if (!d) return;
    try {
        localModules.value = (d.modules ?? []).map(m => moduleDefaults(m));
    } catch (e) {
        console.error('[Detail] populateFromDetail error:', e);
        localModules.value = [];
    }
    form.value = { notes: d.notes ?? '' };
}

// ─── Alterações não salvas ────────────────────────────────────────────────────
function onModulesChange(newModules) {
    localModules.value = newModules;
    isDirty.value = true;
}

onBeforeRouteLeave((to, from, next) => {
    if (isDirty.value) {
        const ok = window.confirm('Você tem alterações não salvas.\nDeseja realmente sair e perder as alterações?');
        ok ? next() : next(false);
    } else {
        next();
    }
});

// Aviso nativo ao fechar a aba/janela
function beforeUnloadHandler(e) {
    if (isDirty.value) {
        e.preventDefault();
        e.returnValue = '';
    }
}
onMounted(() => window.addEventListener('beforeunload', beforeUnloadHandler));
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnloadHandler));

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    toast.show = true; toast.type = type; toast.message = message;
    setTimeout(() => { toast.show = false; }, 3500);
}

// ─── Navegação de histórico ───────────────────────────────────────────────────
async function navigateToMonth(id) {
    if (String(id) === String(detail.value?.id)) return;
    router.push(`/comercial/conditions/${id}`);
    store.detail = null;
    await store.fetchDetail(id);
    if (store.detail) {
        populateFromDetail(store.detail);
        const eid = store.detail.idempreendimento;
        await Promise.all([
            store.fetchPriceTables(eid),
            store.fetchPriceDistribution(eid),
        ]);
    }
}

// ─── Ações de workflow ────────────────────────────────────────────────────────

// Captura snapshot de unidades (com preços) para todos os módulos antes de enviar
async function captureAllUnitSnapshots() {
    const idempreendimento = detail.value?.idempreendimento;
    if (!idempreendimento) return localModules.value;
    const priceTables = store.priceTables ?? [];

    return Promise.all(localModules.value.map(async (mod) => {
        if (!mod.idetapa) return mod;
        try {
            const units = await store.fetchUnitsForStage(idempreendimento, mod.idetapa);

            // Build idunidade → valor_total map from all selected tables (vigente first)
            const priceMap = new Map();
            const orderedTableIds = [...(mod.price_table_ids ?? [])].sort((a, b) => {
                const ta = priceTables.find(t => t.idtabela === a);
                const tb = priceTables.find(t => t.idtabela === b);
                return (tb?.vigente ? 1 : 0) - (ta?.vigente ? 1 : 0);
            });
            for (const tableId of orderedTableIds) {
                const table = priceTables.find(t => t.idtabela === tableId && t.unit_count > 0);
                if (table?.unidades) {
                    for (const u of table.unidades) {
                        if (u.idunidade != null && !priceMap.has(String(u.idunidade))) {
                            priceMap.set(String(u.idunidade), u.valor_total ?? null);
                        }
                    }
                }
            }

            // Merge price into each unit using idunidade as the shared key
            const enriched = units.map(bloco => ({
                ...bloco,
                unidades: (bloco.unidades ?? []).map(u => ({
                    ...u,
                    valor_total: priceMap.get(String(u.idunidade)) ?? null,
                })),
            }));

            return {
                ...mod,
                unit_snapshot: {
                    capturedAt: new Date().toISOString(),
                    data: enriched,
                },
            };
        } catch (e) {
            console.warn('[Detail] captureUnitSnapshot module', mod.id, e.message);
            return mod;
        }
    }));
}

async function handleSubmitForApproval() {
    actionLoading.value = true;
    try {
        // Congela estado das unidades (com preços) em todos os módulos
        const modulesWithSnapshot = await captureAllUnitSnapshots();
        localModules.value = modulesWithSnapshot;
        await store.saveModules(detail.value.id, localModules.value);
        await store.submitForApproval(detail.value.id);
        showToast('Ficha enviada para autorização! Os aprovadores receberão o documento para assinar.');
        await store.fetchDetail(detail.value.id);
    } catch (e) {
        showToast(e.message || 'Erro ao enviar para autorização.', 'error');
    } finally {
        actionLoading.value = false;
    }
}

async function handleUnlock() {
    actionLoading.value = true;
    try {
        await store.unlockCondition(detail.value.id, unlockNote.value);
        showUnlockModal.value = false;
        unlockNote.value = '';
        showToast('Ficha desbloqueada — voltou para Rascunho.');
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
    } catch (e) {
        showToast(e.message || 'Erro ao desbloquear.', 'error');
    } finally {
        actionLoading.value = false;
    }
}

// ─── Saves ────────────────────────────────────────────────────────────────────
async function handleSaveModules() {
    if (isLocked.value) return;
    saving.value = true;
    try {
        const result = await store.saveModules(detail.value.id, localModules.value);
        if (result?.modules) {
            localModules.value = result.modules.map(m => moduleDefaults(m));
        }
        isDirty.value = false;
        showToast('Módulos salvos!');
    } catch (e) {
        const msgs = e.errors ?? [e.message ?? 'Erro ao salvar módulos.'];
        showToast(msgs[0], 'error');
    }
    finally { saving.value = false; }
}

// Save silencioso — usado para auto-save de campos estruturais (ex: idetapa).
// Persiste no banco sem substituir o estado local (evita apagar edições em andamento).
async function handleSaveModulesSilent() {
    if (isLocked.value) return;
    try {
        await store.saveModules(detail.value.id, localModules.value);
        isDirty.value = false;
    } catch (e) {
        // Falha silenciosa no auto-save; o usuário ainda pode salvar manualmente
        console.warn('[Detail] auto-save idetapa failed:', e.message);
    }
}

async function handleDeleteModule(moduleId) {
    try {
        await store.deleteModule(detail.value.id, moduleId);
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
        showToast('Módulo removido.');
    } catch (e) { showToast(e.message || 'Erro ao remover módulo.', 'error'); }
}

async function handleCopyModule({ targetId, sourceId }) {
    try {
        await store.copyModule(detail.value.id, targetId, sourceId);
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
        showToast('Dados copiados!');
    } catch (e) { showToast(e.message || 'Erro ao copiar.', 'error'); }
}

async function handleCopyFromEnterprise({ moduleId, sourceConditionId, sourceModuleId, fields }) {
    try {
        await store.copyModuleFromSource(detail.value.id, moduleId, sourceConditionId, sourceModuleId, fields);
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
        showToast('Dados copiados de outro empreendimento!');
    } catch (e) { showToast(e.message || 'Erro ao copiar de outro empreendimento.', 'error'); }
}

async function handleSaveAll() {
    if (isLocked.value) return;
    saving.value = true;
    try {
        const result = await store.saveModules(detail.value.id, localModules.value);
        if (result?.modules) {
            localModules.value = result.modules.map(m => moduleDefaults(m));
        }
        isDirty.value = false;
        showToast('Tudo salvo com sucesso!');
    } catch (e) {
        const msgs = e.errors ?? [e.message ?? 'Erro ao salvar.'];
        showToast(msgs[0], 'error');
    }
    finally { saving.value = false; }
}

// ─── Formatadores ─────────────────────────────────────────────────────────────
function formatMonth(dateStr) {
    if (!dateStr) return '—';
    const [y, m] = dateStr.split('-');
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${months[Number(m) - 1]}/${y}`;
}
function formatDateFull(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function badgeClass(s) { return STATUS_MAP[s]?.cls ?? 'bg-gray-100 text-gray-600'; }
function statusLabel(s) { return STATUS_MAP[s]?.label ?? s; }

// ─── Histórico de eventos ─────────────────────────────────────────────────────
const EVENT_META = {
    created:                 { label: 'Ficha criada',                    icon: 'fa-plus',        cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',    type: 'approval' },
    auto_created:            { label: 'Gerada automaticamente',          icon: 'fa-robot',       cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800',       type: 'approval' },
    submitted_for_approval:  { label: 'Enviada para autorização',        icon: 'fa-paper-plane', cls: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30', type: 'approval' },
    approved:                { label: 'Autorizada',                      icon: 'fa-check',       cls: 'bg-green-100 text-green-600 dark:bg-green-900/30', type: 'approval' },
    unlocked:                { label: 'Desbloqueada para edição',        icon: 'fa-lock-open',   cls: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30', type: 'approval' },
    approval_cancelled:      { label: 'Autorização cancelada',           icon: 'fa-times',       cls: 'bg-red-100 text-red-600 dark:bg-red-900/30',       type: 'approval' },
    approval_rejected:       { label: 'Autorização reprovada',           icon: 'fa-ban',         cls: 'bg-red-100 text-red-700 dark:bg-red-900/40',       type: 'approval' },
    saved:                   { label: 'Alterações salvas (rascunho)',     icon: 'fa-floppy-disk',   cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800',         type: 'change' },
    edited_after_unlock:     { label: 'Editado após desbloqueio',        icon: 'fa-pen-to-square', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',   type: 'change' },
    module_copied:           { label: 'Módulo copiado',                  icon: 'fa-copy',          cls: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30', type: 'change' },
    modules_updated:         { label: 'Módulo(s) adicionado(s)',         icon: 'fa-layer-group',   cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',       type: 'change' },
};
function eventLabel(action)     { return EVENT_META[action]?.label    ?? action; }
function eventIcon(action)      { return EVENT_META[action]?.icon     ?? 'fa-circle'; }
function eventIconClass(action) { return EVENT_META[action]?.cls      ?? 'bg-gray-100 text-gray-400'; }

// Splitados por tipo: aprovação vs alterações
const approvalHistory = computed(() => {
    const hist = detail.value?.approval_history ?? [];
    return [...hist].reverse().filter(ev => (EVENT_META[ev.action]?.type ?? 'approval') === 'approval');
});
const changeHistory = computed(() => {
    const hist = detail.value?.approval_history ?? [];
    return [...hist].reverse().filter(ev => (EVENT_META[ev.action]?.type) === 'change');
});

// ─── Fetch / retry ───────────────────────────────────────────────────────────
async function retryFetch() {
    fetchError.value = null;
    await loadDetail(route.params.id);
}

async function loadDetail(id) {
    fetchError.value = null;
    await store.fetchDetail(id);
    if (store.error) {
        fetchError.value = store.error;
        return;
    }
    if (store.detail) {
        populateFromDetail(store.detail);
        const eid = store.detail.idempreendimento;
        await Promise.all([
            store.fetchPriceTables(eid),
            store.fetchPriceDistribution(eid),
            store.fetchCorrespondents(),
            store.fetchCorrespondentCompanies(),
            store.fetchOfficeUsers(),
        ]);
        try {
            await store.fetchList({});
            const seen = new Set();
            const opts = [];
            if (eid) {
                opts.push({ idempreendimento: eid, nome: `${store.detail.enterprise?.nome ?? `Empr. #${eid}`} (este empreendimento)` });
                seen.add(eid);
            }
            for (const c of (store.list ?? [])) {
                const eid2 = c.enterprise?.idempreendimento ?? c.idempreendimento;
                if (!eid2 || seen.has(eid2)) continue;
                seen.add(eid2);
                opts.push({ idempreendimento: eid2, nome: c.enterprise?.nome ?? `Empr. #${eid2}` });
            }
            enterpriseOptions.value = opts.sort((a, b) => {
                if (a.idempreendimento === eid) return -1;
                if (b.idempreendimento === eid) return 1;
                return a.nome.localeCompare(b.nome);
            });
        } catch (_) {}
    }
}

// ─── Mount ────────────────────────────────────────────────────────────────────
onMounted(() => loadDetail(route.params.id));
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
