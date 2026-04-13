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

    <!-- Carregando -->
    <div v-if="!detail" class="flex items-center justify-center py-24 text-gray-400">
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
                  <h1 class="text- lg:text-xl font-bold text-gray-900 dark:text-white truncate">
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
              <button
                v-if="detail.status === 'draft'"
                @click="handlePublish"
                :disabled="saving"
                class="flex items-center gap-2 px-3.5 py-2 bg-green-600 text-white text-xs font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition"
              >
                <i class="fas fa-check-circle"></i>
                <span class="hidden sm:inline">Publicar</span>
              </button>
              <button
                @click="handleSaveAll"
                :disabled="saving"
                class="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <i :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" class="fas"></i>
                <span class="hidden sm:inline">{{ saving ? 'Salvando...' : 'Salvar Tudo' }}</span>
              </button>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex gap-0 overflow-x-auto scrollbar-hide -mb-px">
            <button
              v-for="tab in tabs"
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
            :saving="saving"
            @update:modules="localModules = $event"
            @save="handleSaveModules"
            @copy="handleCopyModule"
          />
        </div>

        <!-- Preços -->
        <div v-show="activeTab === 'prices'" class="space-y-5">
          <PriceDistribution
            :distribution="store.priceDistribution"
            :price-tables="store.priceTables"
            :modules="localModules"
            @filter-stage="loadPriceDistribution"
            @refresh="loadPriceDistribution()"
          />

          <!-- ── Tabelas do CV ─────────────────────────────────────────────── -->
          <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 flex items-center justify-between gap-4">
              <div>
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                  <i class="fas fa-table text-blue-500"></i> Tabelas do CV
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 normal-case tracking-normal font-normal">
                  Tabelas sincronizadas com o CV. Selecione as que valem neste mês.
                </p>
              </div>
              <button
                @click="store.fetchPriceTables(detail.idempreendimento)"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-md hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-700 transition"
                title="Recarregar do CV"
              >
                <i class="fas fa-arrows-rotate text-xs"></i>
                Sincronizar
              </button>
            </div>
            <div class="p-5">
              <div v-if="store.priceTables.length" class="space-y-2">
                <label
                  v-for="t in store.priceTables"
                  :key="t.idtabela"
                  class="flex items-center gap-3 cursor-pointer px-4 py-3 rounded-md border transition-all select-none"
                  :class="form.price_table_ids?.includes(t.idtabela)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-600'"
                >
                  <input type="checkbox" :value="t.idtabela" v-model="form.price_table_ids" class="sr-only" />
                  <span
                    class="flex-shrink-0 rounded border-2 flex items-center justify-center transition-all"
                    :class="form.price_table_ids?.includes(t.idtabela)
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'"
                    style="width:18px;height:18px;"
                  >
                    <svg v-if="form.price_table_ids?.includes(t.idtabela)" class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M1 4l2.5 2.5L9 1" />
                    </svg>
                  </span>
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium" :class="form.price_table_ids?.includes(t.idtabela) ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'">
                      {{ t.nome }}
                    </span>
                    <span v-if="t.vigente" class="ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">vigente</span>
                  </div>
                  <span class="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {{ formatDate(t.data_vigencia_de) }} – {{ formatDate(t.data_vigencia_ate) }}
                  </span>
                </label>
              </div>
              <div v-else class="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-600 text-center">
                <i class="fas fa-exclamation-circle text-xl mb-2"></i>
                <p class="text-sm font-medium">Nenhuma tabela encontrada no CV</p>
                <p class="text-xs mt-1">Clique em "Sincronizar" ou cadastre tabelas manuais abaixo.</p>
              </div>
            </div>
          </div>

          <!-- ── Tabelas Manuais ──────────────────────────────────────────── -->
          <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 flex items-center justify-between gap-4">
              <div>
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                  <i class="fas fa-file-invoice-dollar text-orange-400"></i> Tabelas Manuais
                </p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 normal-case tracking-normal font-normal">
                  Tabelas não integradas ao CV — referências externas ou temporárias.
                </p>
              </div>
              <button
                @click="addManualTable"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-md hover:bg-orange-600 transition"
              >
                <i class="fas fa-plus text-xs"></i> Adicionar
              </button>
            </div>
            <div class="p-5 space-y-3">
              <div
                v-for="(mt, mi) in form.manual_price_tables"
                :key="mi"
                class="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50/40 dark:bg-gray-800/20 relative"
              >
                <!-- Remove -->
                <button
                  @click="removeManualTable(mi)"
                  class="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <i class="fas fa-trash text-xs"></i>
                </button>

                <div class="sm:col-span-6">
                  <label class="pt-lbl">Nome da Tabela</label>
                  <input :value="mt.name" @input="patchManualTable(mi, 'name', $event.target.value)" type="text" class="pt-inp" placeholder="Ex: Tabela Especial Lançamento" />
                </div>
                <div class="sm:col-span-3">
                  <label class="pt-lbl">Vigência De</label>
                  <input :value="mt.validity_from" @input="patchManualTable(mi, 'validity_from', $event.target.value)" type="date" class="pt-inp" />
                </div>
                <div class="sm:col-span-3">
                  <label class="pt-lbl">Vigência Até</label>
                  <input :value="mt.validity_to" @input="patchManualTable(mi, 'validity_to', $event.target.value)" type="date" class="pt-inp" />
                </div>
                <div class="sm:col-span-12">
                  <label class="pt-lbl">Observação</label>
                  <input :value="mt.note" @input="patchManualTable(mi, 'note', $event.target.value)" type="text" class="pt-inp" placeholder="Detalhes adicionais, contato, acesso..." />
                </div>
              </div>

              <div v-if="!form.manual_price_tables?.length" class="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-600 text-center">
                <i class="fas fa-file-invoice-dollar text-2xl mb-2"></i>
                <p class="text-sm">Nenhuma tabela manual cadastrada</p>
              </div>
            </div>
          </div>

          <!-- ── Observação de preços ─────────────────────────────────────── -->
          <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Premissa de Preço / Observação</label>
            <textarea
              v-model="form.price_premise_note"
              rows="2"
              class="w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition-all resize-none"
              placeholder="Ex: preços baseados na tabela de março/2026..."
            />
          </div>

          <div class="flex justify-end">
            <button @click="handleSaveMain" :disabled="saving" class="btn-primary">
              <i :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" class="fas text-xs"></i>
              Salvar Tabelas
            </button>
          </div>
        </div>

        <!-- Negociação -->
        <div v-show="activeTab === 'negotiation'">
          <NegotiationRules :form="form" @update="handleFormUpdate" />
          <div class="flex justify-end mt-4">
            <button @click="handleSaveMain" :disabled="saving" class="btn-primary">Salvar Regras</button>
          </div>
        </div>

        <!-- Campanhas -->
        <div v-show="activeTab === 'campaigns'">
          <CampaignManager
            :campaigns="localCampaigns"
            :saving="saving"
            @update:campaigns="localCampaigns = $event"
            @save="handleSaveCampaigns"
          />
        </div>

        <!-- Operacional -->
        <div v-show="activeTab === 'operational'">
          <OperationalSection
            :form="form"
            :correspondents="store.correspondents"
            :office-users="store.officeUsers"
            @update="handleFormUpdate"
          />
          <div class="flex justify-end mt-4">
            <button @click="handleSaveMain" :disabled="saving" class="btn-primary">Salvar Operacional</button>
          </div>
        </div>

        <!-- Resumo / PDF -->
        <div v-show="activeTab === 'summary'">
          <SummaryExport
            :detail="detail"
            :form="form"
            :local-modules="localModules"
            :local-campaigns="localCampaigns"
            :price-tables="store.priceTables"
            :correspondents="store.correspondents"
            :office-users="store.officeUsers"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';
import ModuleSection from './components/ModuleSection.vue';
import NegotiationRules from './components/NegotiationRules.vue';
import CampaignManager from './components/CampaignManager.vue';
import OperationalSection from './components/OperationalSection.vue';
import PriceDistribution from './components/PriceDistribution.vue';
import SummaryExport from './components/SummaryExport.vue';

const route = useRoute();
const store = useConditionsStore();

const activeTab = ref('modules');
const saving = ref(false);
const toast = reactive({ show: false, type: 'success', message: '' });

const tabs = [
    { id: 'modules',     label: 'Módulos',      icon: 'fas fa-layer-group' },
    { id: 'prices',      label: 'Preços',        icon: 'fas fa-tag' },
    { id: 'negotiation', label: 'Negociação',    icon: 'fas fa-handshake' },
    { id: 'campaigns',   label: 'Campanhas',     icon: 'fas fa-bullhorn' },
    { id: 'operational', label: 'Operacional',   icon: 'fas fa-gears' },
    { id: 'summary',     label: 'Resumo',        icon: 'fas fa-file-pdf' },
];

const detail = computed(() => store.detail);

// ─── Estado local — ref (não reactive) para evitar loop de watchers ───────────
const localModules = ref([]);
const localCampaigns = ref([]);

// form como ref para que v-model com filhos seja sempre unidirecional
const form = ref({
    // Negociação
    max_entry_value: null,
    rp_installment_value: null,
    installment_until_habite_se: '',
    installment_post_habite_se: '',
    act_installment_value: null,
    min_installment_value: null,
    max_installments: null,
    rp_rule: '',
    has_state_subsidy: false,
    state_subsidy_note: '',       // legado
    state_subsidy_state: '',      // 'ms' | 'mt' | 'pr' | 'sp' | 'custom'
    state_subsidy_program: '',
    state_subsidy_custom_state: '',
    state_subsidy_rules: '',
    state_subsidy_conditions: '',
    // Preços
    price_table_ids: [],
    price_premise_note: '',
    manual_price_tables: [],   // tabelas não integradas ao CV
    // Comissão
    commission_pct: null,
    commission_source: 'cv',
    // Operacional
    delivery_deadline_months: null,
    delivery_deadline_note: '',
    contract_registration_by: '',
    contract_registered_by_user_id: null,
    cca_company_id: null,       // legado
    cca_company_name: '',
    cca_cost: null,
    cca_charges_company: false,
    correspondent_id: null,
    has_digital_cert: false,
    digital_cert_provider: '',
    digital_cert_contact: '',
    manager_user_id: null,
    notes: '',
});

// Handler recebe objeto parcial com os campos alterados
function handleFormUpdate(patch) {
    form.value = { ...form.value, ...patch };
}

function populateFromDetail(d) {
    if (!d) return;
    localModules.value = JSON.parse(JSON.stringify(d.modules ?? []));
    localCampaigns.value = JSON.parse(JSON.stringify(d.campaigns ?? []));
    form.value = {
        max_entry_value: d.max_entry_value ?? null,
        rp_installment_value: d.rp_installment_value ?? null,
        installment_until_habite_se: d.installment_until_habite_se ?? '',
        installment_post_habite_se: d.installment_post_habite_se ?? '',
        act_installment_value: d.act_installment_value ?? null,
        min_installment_value: d.min_installment_value ?? null,
        max_installments: d.max_installments ?? null,
        rp_rule: d.rp_rule ?? '',
        has_state_subsidy: d.has_state_subsidy ?? false,
        state_subsidy_note: d.state_subsidy_note ?? '',       // legado
        state_subsidy_state: d.state_subsidy_state ?? '',
        state_subsidy_program: d.state_subsidy_program ?? '',
        state_subsidy_custom_state: d.state_subsidy_custom_state ?? '',
        state_subsidy_rules: d.state_subsidy_rules ?? '',
        state_subsidy_conditions: d.state_subsidy_conditions ?? '',
        price_table_ids: Array.isArray(d.price_table_ids) ? [...d.price_table_ids] : [],
        price_premise_note: d.price_premise_note ?? '',
        manual_price_tables: Array.isArray(d.manual_price_tables) ? JSON.parse(JSON.stringify(d.manual_price_tables)) : [],
        commission_pct: d.commission_pct ?? null,
        commission_source: d.commission_source ?? 'cv',
        delivery_deadline_months: d.delivery_deadline_months ?? null,
        delivery_deadline_note: d.delivery_deadline_note ?? '',
        contract_registration_by: d.contract_registration_by ?? '',
        contract_registered_by_user_id: d.contract_registered_by_user_id ?? null,
        cca_company_id: d.cca_company_id ?? null,     // legado
        cca_company_name: d.cca_company_name ?? '',
        cca_cost: d.cca_cost ?? null,
        cca_charges_company: d.cca_charges_company ?? false,
        correspondent_id: d.correspondent_id ?? null,
        has_digital_cert: d.has_digital_cert ?? false,
        digital_cert_provider: d.digital_cert_provider ?? '',
        digital_cert_contact: d.digital_cert_contact ?? '',
        manager_user_id: d.manager_user_id ?? null,
        notes: d.notes ?? '',
    };
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    toast.show = true; toast.type = type; toast.message = message;
    setTimeout(() => { toast.show = false; }, 3000);
}

// ─── Handlers ─────────────────────────────────────────────────────────────────
async function handleSaveMain() {
    saving.value = true;
    try {
        await store.saveCondition(detail.value.id, { ...form.value });
        showToast('Salvo com sucesso!');
    } catch (e) { showToast(e.message || 'Erro ao salvar.', 'error'); }
    finally { saving.value = false; }
}

async function handleSaveModules() {
    saving.value = true;
    try {
        await store.saveModules(detail.value.id, localModules.value);
        showToast('Módulos salvos!');
    } catch (e) { showToast(e.message || 'Erro ao salvar módulos.', 'error'); }
    finally { saving.value = false; }
}

async function handleCopyModule({ targetId, sourceId }) {
    try {
        await store.copyModule(detail.value.id, targetId, sourceId);
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
        showToast('Dados copiados!');
    } catch (e) { showToast(e.message || 'Erro ao copiar.', 'error'); }
}

async function handleSaveCampaigns() {
    saving.value = true;
    try {
        await store.saveCampaigns(detail.value.id, localCampaigns.value);
        showToast('Campanhas salvas!');
    } catch (e) { showToast(e.message || 'Erro ao salvar campanhas.', 'error'); }
    finally { saving.value = false; }
}

async function handleSaveAll() {
    saving.value = true;
    try {
        await Promise.all([
            store.saveCondition(detail.value.id, { ...form.value }),
            store.saveModules(detail.value.id, localModules.value),
            store.saveCampaigns(detail.value.id, localCampaigns.value),
        ]);
        showToast('Tudo salvo com sucesso!');
    } catch (e) { showToast(e.message || 'Erro ao salvar.', 'error'); }
    finally { saving.value = false; }
}

async function handlePublish() {
    saving.value = true;
    try {
        await handleSaveAll();
        await store.publishCondition(detail.value.id);
        showToast('Ficha publicada!');
    } catch (e) { showToast(e.message || 'Erro ao publicar.', 'error'); }
    finally { saving.value = false; }
}

async function loadPriceDistribution(idetapa = null) {
    if (!detail.value?.idempreendimento) return;
    await store.fetchPriceDistribution(detail.value.idempreendimento, idetapa || null);
}

// ─── Tabelas manuais de preço ──────────────────────────────────────────────
function addManualTable() {
    form.value = {
        ...form.value,
        manual_price_tables: [
            ...(form.value.manual_price_tables ?? []),
            { name: '', validity_from: '', validity_to: '', note: '' },
        ],
    };
}

function removeManualTable(idx) {
    form.value = {
        ...form.value,
        manual_price_tables: form.value.manual_price_tables.filter((_, i) => i !== idx),
    };
}

function patchManualTable(idx, field, val) {
    const updated = form.value.manual_price_tables.map((t, i) =>
        i === idx ? { ...t, [field]: val } : t
    );
    form.value = { ...form.value, manual_price_tables: updated };
}

// ─── Formatadores ─────────────────────────────────────────────────────────────
function formatMonth(dateStr) {
    if (!dateStr) return '—';
    const [y, m] = dateStr.split('-');
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${months[Number(m) - 1]}/${y}`;
}
function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}
function badgeClass(s) {
    return s === 'published'
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
}
function statusLabel(s) { return s === 'published' ? 'Publicado' : 'Rascunho'; }

// ─── Mount ────────────────────────────────────────────────────────────────────
onMounted(async () => {
    const id = route.params.id;
    await store.fetchDetail(id);
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
    }
});
</script>

<style scoped>
.btn-primary { @apply flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition; }
.pt-lbl      { @apply block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1; }
.pt-inp      { @apply w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all duration-150; }
.fade-enter-active, .fade-leave-active { transition: opacity .3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
