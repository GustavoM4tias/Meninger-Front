<script setup>
import { ref, computed, watch } from 'vue';
import { useLandSyncStore } from '@/stores/Comercial/Contracts/landSyncStore';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useHiddenEnterprisesStore } from '@/stores/Comercial/Contracts/hiddenEnterprisesStore';
import { useStageCommissionRulesStore } from '@/stores/Comercial/Contracts/stageCommissionRulesStore';
import { useTrSatelliteStore } from '@/stores/Comercial/Contracts/trSatelliteStore';

import Modal from '@/components/UI/Modal.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';

const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['close']);

const landSyncStore = useLandSyncStore();
const contractsStore = useContractsStore();
const hiddenStore = useHiddenEnterprisesStore();
const commissionRulesStore = useStageCommissionRulesStore();
const trSatStore = useTrSatelliteStore();

const activeTab = ref('obstit');
const tabOptions = [
  { value: 'obstit',     label: 'Terreno externo',     icon: 'fas fa-mountain' },
  { value: 'hidden',     label: 'Ocultar empreend.',   icon: 'fas fa-eye-slash' },
  { value: 'commission', label: 'Comissão por etapa',  icon: 'fas fa-percent' },
  { value: 'trsat',      label: 'Satélite de TR',      icon: 'fas fa-link' },
];

const selectedLandNames = ref([]);
const selectedHiddenNames = ref([]);

// ── Commission rule form ───────────────────────────────────────────
const newRule = ref({
  enterprise_id: '',
  stage_id: null,
  commission_pct_display: null,
  stage_name: '',
  description: '',
});

// ── TR-satellite form ──────────────────────────────────────────────
const newTrSat = ref({
  satellite_enterprise_id: '',
  partner_names: [],
  description: '',
});

const isNewTrSatValid = computed(() => {
  const sid = Number(newTrSat.value.satellite_enterprise_id);
  if (!Number.isInteger(sid) || sid <= 0) return false;
  const partners = (newTrSat.value.partner_names || [])
    .map(n => contractsStore.enterprises.find(e => e.name === n)?.id)
    .map(Number)
    .filter(n => Number.isFinite(n) && n > 0);
  if (!partners.length) return false;
  if (partners.includes(sid)) return false;
  return true;
});

const enterpriseNameById = computed(() => {
  const m = new Map();
  for (const e of contractsStore.enterprises || []) m.set(Number(e.id), e.name);
  return m;
});

const isNewRuleValid = computed(() =>
  newRule.value.enterprise_id !== '' &&
  Number.isInteger(newRule.value.stage_id) && newRule.value.stage_id > 0 &&
  Number.isFinite(newRule.value.commission_pct_display) && newRule.value.commission_pct_display > 0 && newRule.value.commission_pct_display < 100
);

const enterprisesOptions = computed(() =>
  [...new Set((contractsStore.enterprises || []).map(e => e.name).filter(Boolean))]
);

const enterprisesNotHiddenOptions = computed(() => {
  const hiddenIds = hiddenStore.hiddenIds;
  const names = (contractsStore.enterprises || [])
    .filter(e => !hiddenIds.has(Number(e.id)))
    .map(e => e.name)
    .filter(Boolean);
  return [...new Set(names)];
});

const enterpriseSelectOptions = computed(() => [
  { value: '', label: 'Selecione...' },
  ...(contractsStore.enterprises || []).map(e => ({
    value: e.id,
    label: `${e.name} (${e.id})`,
  })),
]);

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return;
  activeTab.value = 'obstit';
  selectedLandNames.value = [];
  selectedHiddenNames.value = [];
  newRule.value = { enterprise_id: '', stage_id: null, commission_pct_display: null, stage_name: '', description: '' };
  newTrSat.value = { satellite_enterprise_id: '', partner_names: [], description: '' };

  if (!contractsStore.enterprises.length) await contractsStore.fetchEnterprises();
  await Promise.all([
    landSyncStore.fetchAll(),
    hiddenStore.fetchAll(),
    commissionRulesStore.fetchAll(),
    trSatStore.fetchAll(),
  ]);
});

// ── OBSTIT handlers ────────────────────────────────────────────────
async function handleLandAdd() {
  if (!selectedLandNames.value.length) return;
  const byName = new Map();
  for (const e of contractsStore.enterprises || []) {
    const key = (e.name || '').toString();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(e);
  }
  for (const name of selectedLandNames.value) {
    for (const ent of byName.get(name) || []) {
      await landSyncStore.addItem({ enterprise_id: ent.id, enterprise_name: ent.name });
    }
  }
  selectedLandNames.value = [];
}

async function handleLandRemove(id) {
  if (!window.confirm('Remover este empreendimento da atualização de terreno externo?')) return;
  await landSyncStore.removeItem(id);
}

async function handleRunSync() {
  try {
    await landSyncStore.runSync();
    window.alert('Sincronização de terreno disparada com sucesso.');
  } catch (e) {
    window.alert(e?.message || 'Erro ao rodar sincronização OBSTIT.');
  }
}

// ── Hidden enterprises handlers ────────────────────────────────────
async function handleHiddenAdd() {
  if (!selectedHiddenNames.value.length) return;
  const byName = new Map();
  for (const e of contractsStore.enterprises || []) {
    const key = (e.name || '').toString();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(e);
  }
  for (const name of selectedHiddenNames.value) {
    for (const ent of byName.get(name) || []) {
      await hiddenStore.addItem({ enterprise_id: ent.id, enterprise_name: ent.name });
    }
  }
  selectedHiddenNames.value = [];
  contractsStore.clearContractsCache();
  await contractsStore.fetchContracts({ force: true });
}

async function handleHiddenRemove(id) {
  if (!window.confirm('Restaurar visibilidade deste empreendimento?')) return;
  await hiddenStore.removeItem(id);
  contractsStore.clearContractsCache();
  await contractsStore.fetchContracts({ force: true });
}

// ── Commission rule handlers ───────────────────────────────────────
async function handleCommissionAdd() {
  if (!isNewRuleValid.value) return;
  const eid = Number(newRule.value.enterprise_id);
  const ent = contractsStore.enterprises.find(e => Number(e.id) === eid);
  try {
    await commissionRulesStore.addRule({
      enterprise_id: eid,
      enterprise_name: ent?.name || null,
      stage_id: newRule.value.stage_id,
      stage_name: newRule.value.stage_name || null,
      commission_pct: newRule.value.commission_pct_display / 100,
      description: newRule.value.description || null,
    });
    newRule.value = { enterprise_id: '', stage_id: null, commission_pct_display: null, stage_name: '', description: '' };
    contractsStore.clearContractsCache();
  } catch (e) {
    window.alert(e?.message || 'Erro ao adicionar regra.');
  }
}

async function handleCommissionRemove(id) {
  if (!window.confirm('Remover esta regra de comissão por etapa?')) return;
  await commissionRulesStore.removeRule(id);
  contractsStore.clearContractsCache();
}

// ── TR-satellite handlers ──────────────────────────────────────────
async function handleTrSatAdd() {
  if (!isNewTrSatValid.value) return;
  const sid = Number(newTrSat.value.satellite_enterprise_id);
  const satEnt = contractsStore.enterprises.find(e => Number(e.id) === sid);
  const partnerIds = (newTrSat.value.partner_names || [])
    .map(n => Number(contractsStore.enterprises.find(e => e.name === n)?.id))
    .filter(Number.isFinite);
  try {
    await trSatStore.addItem({
      satellite_enterprise_id: sid,
      satellite_enterprise_name: satEnt?.name || null,
      partner_enterprise_ids: partnerIds,
      description: newTrSat.value.description || null,
    });
    newTrSat.value = { satellite_enterprise_id: '', partner_names: [], description: '' };
    contractsStore.clearContractsCache();
  } catch (e) {
    window.alert(e?.message || 'Erro ao adicionar satélite de TR.');
  }
}

async function handleTrSatRemove(id) {
  if (!window.confirm('Remover este vínculo de satélite de TR?')) return;
  await trSatStore.removeItem(id);
  contractsStore.clearContractsCache();
}

const closeModal = () => emit('close');
</script>

<template>
  <Modal :open="open" size="xl" title="Configurações do dashboard"
    subtitle="Configurações avançadas de exibição e integração de dados"
    @close="closeModal">

    <div class="-m-4 sm:-m-5 flex flex-col">

      <!-- Tabs -->
      <div class="px-4 sm:px-5 py-3 border-b border-line bg-surface-sunken/40">
        <SegmentedControl v-model="activeTab" :options="tabOptions" size="sm" class="overflow-x-auto" />
      </div>

      <!-- Conteúdo -->
      <div class="flex-1 overflow-y-auto max-h-[60vh]">

        <!-- ═══════════════ TAB: TERRENO EXTERNO (OBSTIT) ═══════════════ -->
        <div v-if="activeTab === 'obstit'" class="p-4 sm:p-5 space-y-4">

          <!-- Erro / Loading -->
          <div v-if="landSyncStore.error"
            class="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <i class="fas fa-circle-exclamation"></i>{{ landSyncStore.error }}
          </div>
          <div v-if="landSyncStore.loading"
            class="flex items-center gap-2 text-xs text-ink-muted">
            <Spinner size="sm" /> Carregando configurações de terreno externo...
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <!-- Lista atual -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-ink">Empreendimentos configurados</h3>
                  <p class="text-[11px] text-ink-muted">Estes terão o terreno buscado externamente.</p>
                </div>
                <Badge variant="accent" size="sm">
                  <span class="font-mono tabular-nums">{{ landSyncStore.items.length }}</span>
                </Badge>
              </div>

              <div class="rounded-lg border border-line bg-surface-sunken max-h-72 overflow-y-auto">
                <EmptyState v-if="!landSyncStore.items.length && !landSyncStore.loading"
                  size="sm" icon="fas fa-mountain"
                  title="Nenhum configurado"
                  description="Use o painel ao lado para adicionar." />
                <ul v-else class="divide-y divide-line">
                  <li v-for="item in landSyncStore.items" :key="item.id"
                    class="px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-surface-hover transition-colors">
                    <div class="min-w-0">
                      <p class="text-xs font-medium text-ink truncate">{{ item.enterprise_name || 'Sem nome' }}</p>
                      <p class="text-[10px] text-ink-subtle font-mono mt-0.5">
                        ID ERP: {{ item.enterprise_id }}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" icon="fas fa-trash"
                      class="!text-red-500 hover:!bg-red-500/10"
                      @click="handleLandRemove(item.id)">
                      <span class="hidden sm:inline">Remover</span>
                    </Button>
                  </li>
                </ul>
              </div>
            </Surface>

            <!-- Adicionar -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div>
                <h3 class="text-sm font-semibold text-ink">Adicionar empreendimento</h3>
                <p class="text-[11px] text-ink-muted">Vincule empreendimentos com atualização externa de terreno.</p>
              </div>

              <div>
                <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
                  <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>
                  Empreendimento(s)
                </label>
                <MultiSelector :model-value="selectedLandNames"
                  @update:modelValue="selectedLandNames = Array.isArray($event) ? $event : []"
                  :options="enterprisesOptions" placeholder="Selecione empreendimentos"
                  :page-size="150" :select-all="true" />
              </div>

              <div class="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <p class="text-[10px] text-ink-subtle inline-flex items-center gap-1.5">
                  <span class="inline-flex w-2 h-2 rounded-full bg-emerald-500"></span>
                  Ao salvar, o próximo job de OBSTIT usará essa configuração.
                </p>
                <Button size="sm" icon="fas fa-plus"
                  :disabled="!selectedLandNames.length"
                  @click="handleLandAdd">
                  Adicionar
                </Button>
              </div>
            </Surface>
          </div>
        </div>

        <!-- ═══════════════ TAB: OCULTAR EMPREENDIMENTOS ═══════════════ -->
        <div v-if="activeTab === 'hidden'" class="p-4 sm:p-5 space-y-4">

          <div class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
            <i class="fas fa-circle-info mt-0.5 shrink-0"></i>
            <span>
              Empreendimentos ocultos <strong>não aparecem na listagem</strong> e
              <strong>não são somados nos resultados</strong>, mas continuam sendo consultados internamente
              (regras de série, terreno, etc.).
            </span>
          </div>

          <div v-if="hiddenStore.error"
            class="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <i class="fas fa-circle-exclamation"></i>{{ hiddenStore.error }}
          </div>
          <div v-if="hiddenStore.loading"
            class="flex items-center gap-2 text-xs text-ink-muted">
            <Spinner size="sm" /> Carregando...
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <!-- Lista de ocultos -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-ink">Empreendimentos ocultos</h3>
                  <p class="text-[11px] text-ink-muted">Excluídos da listagem e dos cálculos.</p>
                </div>
                <Badge variant="warning" size="sm">
                  <span class="font-mono tabular-nums">{{ hiddenStore.items.length }}</span>
                </Badge>
              </div>

              <div class="rounded-lg border border-line bg-surface-sunken max-h-72 overflow-y-auto">
                <EmptyState v-if="!hiddenStore.items.length && !hiddenStore.loading"
                  size="sm" icon="fas fa-eye"
                  title="Nenhum oculto"
                  description="Todos estão visíveis no dashboard." />
                <ul v-else class="divide-y divide-line">
                  <li v-for="item in hiddenStore.items" :key="item.id"
                    class="px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-surface-hover transition-colors">
                    <div class="min-w-0">
                      <p class="text-xs font-medium text-ink truncate">{{ item.enterprise_name || 'Sem nome' }}</p>
                      <p class="text-[10px] text-ink-subtle font-mono mt-0.5">
                        ID ERP: {{ item.enterprise_id }}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" icon="fas fa-eye"
                      class="!text-emerald-600 hover:!bg-emerald-500/10"
                      v-tippy="'Restaurar visibilidade'"
                      @click="handleHiddenRemove(item.id)">
                      <span class="hidden sm:inline">Restaurar</span>
                    </Button>
                  </li>
                </ul>
              </div>
            </Surface>

            <!-- Adicionar à lista de ocultos -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div>
                <h3 class="text-sm font-semibold text-ink">Ocultar empreendimento</h3>
                <p class="text-[11px] text-ink-muted">Selecione empreendimentos para remover da listagem e dos cálculos.</p>
              </div>

              <div>
                <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
                  <i class="fas fa-eye-slash text-[10px] mr-1 text-ink-subtle"></i>
                  Empreendimento(s)
                </label>
                <MultiSelector :model-value="selectedHiddenNames"
                  @update:modelValue="selectedHiddenNames = Array.isArray($event) ? $event : []"
                  :options="enterprisesNotHiddenOptions" placeholder="Selecione para ocultar"
                  :page-size="150" :select-all="false" />
              </div>

              <div class="flex justify-end pt-1">
                <Button size="sm" icon="fas fa-eye-slash"
                  class="!bg-amber-500 hover:!bg-amber-600"
                  :disabled="!selectedHiddenNames.length"
                  @click="handleHiddenAdd">
                  Ocultar selecionados
                </Button>
              </div>
            </Surface>
          </div>
        </div>

        <!-- ═══════════════ TAB: COMISSÃO POR ETAPA ═══════════════ -->
        <div v-if="activeTab === 'commission'" class="p-4 sm:p-5 space-y-4">

          <div class="rounded-xl border border-accent/30 bg-accent-soft p-3 text-xs text-ink-muted flex items-start gap-2">
            <i class="fas fa-circle-info text-accent mt-0.5 shrink-0"></i>
            <span>
              Define que contratos de um empreendimento cujo repasse <strong>passou em algum momento</strong> por uma etapa do CV
              devem ter o VGV recalculado com comissão apartada. Fórmula:
              <code class="font-mono text-[10px] bg-surface-sunken text-ink px-1.5 py-0.5 rounded ml-1">VGV_real = VGV_recebido / (1 − comissão)</code>
            </span>
          </div>

          <div v-if="commissionRulesStore.error"
            class="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <i class="fas fa-circle-exclamation"></i>{{ commissionRulesStore.error }}
          </div>
          <div v-if="commissionRulesStore.loading"
            class="flex items-center gap-2 text-xs text-ink-muted">
            <Spinner size="sm" /> Carregando regras...
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <!-- Lista de regras -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-ink">Regras configuradas</h3>
                  <p class="text-[11px] text-ink-muted">Comissão apartada aplicada por etapa do repasse.</p>
                </div>
                <Badge variant="accent" size="sm">
                  <span class="font-mono tabular-nums">{{ commissionRulesStore.rules.length }}</span>
                </Badge>
              </div>

              <div class="rounded-lg border border-line bg-surface-sunken max-h-72 overflow-y-auto">
                <EmptyState v-if="!commissionRulesStore.rules.length && !commissionRulesStore.loading"
                  size="sm" icon="fas fa-percent"
                  title="Nenhuma regra"
                  description="Use o painel ao lado para adicionar." />
                <ul v-else class="divide-y divide-line">
                  <li v-for="rule in commissionRulesStore.rules" :key="rule.id"
                    class="px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-surface-hover transition-colors">
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-medium text-ink truncate">
                        {{ rule.enterprise_name || `Empreendimento ${rule.enterprise_id}` }}
                      </p>
                      <p class="text-[10px] text-ink-subtle mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span class="font-mono">ERP: {{ rule.enterprise_id }}</span>
                        <span>·</span>
                        <span class="font-mono">Etapa: {{ rule.stage_id }}</span>
                        <span v-if="rule.stage_name" class="truncate">({{ rule.stage_name }})</span>
                        <span>·</span>
                        <span class="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                          {{ (rule.commission_pct * 100).toFixed(2) }}%
                        </span>
                      </p>
                      <p v-if="rule.description"
                        class="text-[10px] text-ink-subtle mt-0.5 italic truncate">{{ rule.description }}</p>
                    </div>
                    <Button variant="ghost" size="sm" icon="fas fa-trash"
                      class="!text-red-500 hover:!bg-red-500/10 shrink-0"
                      @click="handleCommissionRemove(rule.id)">
                      <span class="hidden sm:inline">Remover</span>
                    </Button>
                  </li>
                </ul>
              </div>
            </Surface>

            <!-- Adicionar regra -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div>
                <h3 class="text-sm font-semibold text-ink">Adicionar regra</h3>
                <p class="text-[11px] text-ink-muted">
                  O cálculo aplica-se apenas a contratos cujo repasse <em>já passou</em> pela etapa indicada.
                </p>
              </div>

              <Select v-model="newRule.enterprise_id"
                :options="enterpriseSelectOptions"
                label="Empreendimento (ERP)" />

              <div class="grid grid-cols-2 gap-2">
                <Input v-model.number="newRule.stage_id" type="number" min="1"
                  label="Repasse CV ID" placeholder="ex: 52" />
                <Input v-model.number="newRule.commission_pct_display" type="number" min="0.01" max="99.99" step="0.01"
                  label="Comissão (%)" placeholder="ex: 4" />
              </div>

              <Input v-model="newRule.stage_name"
                label="Nome da etapa (opcional)"
                placeholder="ex: 30/70 Análise Caixa" />

              <Input v-model="newRule.description"
                label="Descrição (opcional)"
                placeholder="ex: Contratos 30/70 — comissão apartada 4%" />

              <div class="flex justify-end pt-1">
                <Button size="sm" icon="fas fa-plus"
                  :disabled="!isNewRuleValid"
                  @click="handleCommissionAdd">
                  Adicionar regra
                </Button>
              </div>
            </Surface>
          </div>
        </div>

        <!-- ═══════════════ TAB: SATÉLITE DE TR ═══════════════ -->
        <div v-if="activeTab === 'trsat'" class="p-4 sm:p-5 space-y-4">

          <div class="rounded-xl border border-accent/30 bg-accent-soft p-3 text-xs text-ink-muted flex items-start gap-2">
            <i class="fas fa-circle-info text-accent mt-0.5 shrink-0"></i>
            <span>
              Quando o Sienge emite o contrato de Terreno (TR) num empreendimento separado dos contratos
              de incorporação, configure aqui o vínculo: as vendas do <strong>satélite</strong> serão
              mescladas com as do(s) <strong>partner(s)</strong> casando por <code class="font-mono text-[10px] bg-surface-sunken px-1.5 py-0.5 rounded">cliente + unidade</code>.
              Sem partner correspondente, o contrato satélite é descartado para evitar contagem dupla.
            </span>
          </div>

          <div v-if="trSatStore.error"
            class="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <i class="fas fa-circle-exclamation"></i>{{ trSatStore.error }}
          </div>
          <div v-if="trSatStore.loading"
            class="flex items-center gap-2 text-xs text-ink-muted">
            <Spinner size="sm" /> Carregando vínculos...
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <!-- Lista de vínculos -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-ink">Vínculos configurados</h3>
                  <p class="text-[11px] text-ink-muted">Satélite → partner(s) que recebem o merge.</p>
                </div>
                <Badge variant="accent" size="sm">
                  <span class="font-mono tabular-nums">{{ trSatStore.items.length }}</span>
                </Badge>
              </div>

              <div class="rounded-lg border border-line bg-surface-sunken max-h-72 overflow-y-auto">
                <EmptyState v-if="!trSatStore.items.length && !trSatStore.loading"
                  size="sm" icon="fas fa-link"
                  title="Nenhum vínculo"
                  description="Use o painel ao lado para adicionar." />
                <ul v-else class="divide-y divide-line">
                  <li v-for="item in trSatStore.items" :key="item.id"
                    class="px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-surface-hover transition-colors">
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-medium text-ink truncate">
                        {{ item.satellite_enterprise_name || `Empreendimento ${item.satellite_enterprise_id}` }}
                      </p>
                      <p class="text-[10px] text-ink-subtle font-mono mt-0.5">
                        ID satélite: {{ item.satellite_enterprise_id }}
                      </p>
                      <p class="text-[10px] text-ink-muted mt-1">
                        <i class="fas fa-arrow-right text-accent mr-1"></i>
                        <span class="text-ink">Partners:</span>
                        <span v-for="(pid, idx) in item.partner_enterprise_ids" :key="pid">
                          <span v-if="idx > 0">, </span>
                          <span class="font-medium">{{ enterpriseNameById.get(Number(pid)) || `ERP ${pid}` }}</span>
                          <span class="font-mono text-ink-subtle">({{ pid }})</span>
                        </span>
                      </p>
                      <p v-if="item.description"
                        class="text-[10px] text-ink-subtle mt-0.5 italic truncate">{{ item.description }}</p>
                    </div>
                    <Button variant="ghost" size="sm" icon="fas fa-trash"
                      class="!text-red-500 hover:!bg-red-500/10 shrink-0"
                      @click="handleTrSatRemove(item.id)">
                      <span class="hidden sm:inline">Remover</span>
                    </Button>
                  </li>
                </ul>
              </div>
            </Surface>

            <!-- Adicionar vínculo -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div>
                <h3 class="text-sm font-semibold text-ink">Adicionar vínculo</h3>
                <p class="text-[11px] text-ink-muted">
                  Selecione o empreendimento <em>satélite</em> (que carrega o TR) e os <em>partners</em> de incorporação.
                </p>
              </div>

              <Select v-model="newTrSat.satellite_enterprise_id"
                :options="enterpriseSelectOptions"
                label="Empreendimento satélite (TR)" />

              <div>
                <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
                  <i class="fas fa-handshake text-[10px] mr-1 text-ink-subtle"></i>
                  Partners (incorporação)
                </label>
                <MultiSelector :model-value="newTrSat.partner_names"
                  @update:modelValue="newTrSat.partner_names = Array.isArray($event) ? $event : []"
                  :options="enterprisesOptions" placeholder="Selecione um ou mais partners"
                  :page-size="150" :select-all="false" />
              </div>

              <Input v-model="newTrSat.description"
                label="Descrição (opcional)"
                placeholder="ex: Parque dos Ipês — TR no pai, incorporação nos módulos" />

              <div class="flex justify-end pt-1">
                <Button size="sm" icon="fas fa-plus"
                  :disabled="!isNewTrSatValid"
                  @click="handleTrSatAdd">
                  Adicionar vínculo
                </Button>
              </div>
            </Surface>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <p v-if="activeTab === 'obstit'" class="text-[10px] text-ink-subtle leading-tight mr-auto hidden sm:block">
        Coleta de TR é D-1, feita 1×/dia às 07:05.<br>
        Sincronização manual: 1–10 minutos.
      </p>
      <p v-else-if="activeTab === 'commission'" class="text-[10px] text-ink-subtle mr-auto hidden sm:block">
        Alterações são aplicadas imediatamente. Recarregue os contratos para ver os novos valores.
      </p>
      <p v-else-if="activeTab === 'trsat'" class="text-[10px] text-ink-subtle leading-tight mr-auto hidden sm:block">
        Match por <code class="font-mono">customer_id + unit_name</code>.<br>
        Satélites sem partner correspondente são descartados do relatório.
      </p>
      <p v-else class="text-[10px] text-ink-subtle leading-tight mr-auto hidden sm:block">
        Alterações são aplicadas imediatamente no dashboard.<br>
        Os ocultos continuam sendo consultados internamente.
      </p>

      <Button variant="ghost" @click="closeModal">Fechar</Button>
      <Button v-if="activeTab === 'obstit'"
        :icon="landSyncStore.syncLoading ? 'fas fa-circle-notch fa-spin' : 'fas fa-play'"
        class="!bg-emerald-600 hover:!bg-emerald-700"
        :disabled="landSyncStore.syncLoading"
        @click="handleRunSync">
        {{ landSyncStore.syncLoading ? 'Sincronizando...' : 'Sincronizar' }}
      </Button>
    </template>
  </Modal>
</template>
