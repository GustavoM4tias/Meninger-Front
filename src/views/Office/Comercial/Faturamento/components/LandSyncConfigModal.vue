<script setup>
// Configurações do dashboard de Faturamento (e Vendas × Projeção).
//
// Padrões desta tela (revisão 2026-07-29):
//   - TODO seletor de empreendimento usa o MultiSelector padrão do sistema
//     (busca + paginação) com `overlay` — sem overlay o dropdown era CORTADO
//     pelo scroll do modal e parecia "travado".
//   - Onde faz sentido, a seleção é MÚLTIPLA e cria uma regra por
//     empreendimento (Composição de VGV, Comissão, Terreno externo, Ocultar).
//     Satélite de TR e o destino do Vínculo CV↔Sienge são únicos por natureza
//     (MultiSelector em modo `single`).
//   - Toda lista tem EDITAR (prefill do formulário) além de remover.
//   - Trocar de aba ou salvar limpa o formulário correspondente.

import { ref, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import ConfirmDialog from '@/components/UI/ConfirmDialog.vue';
import { useLandSyncStore } from '@/stores/Comercial/Contracts/landSyncStore';
import { useContractsStore } from '@/stores/Comercial/Contracts/contractsStore';
import { useHiddenEnterprisesStore } from '@/stores/Comercial/Contracts/hiddenEnterprisesStore';
import { useStageCommissionRulesStore } from '@/stores/Comercial/Contracts/stageCommissionRulesStore';
import { useEnterpriseValueRulesStore } from '@/stores/Comercial/Contracts/enterpriseValueRulesStore';
import { useEnterpriseErpLinksStore } from '@/stores/Comercial/Contracts/enterpriseErpLinksStore';
import { useTrSatelliteStore } from '@/stores/Comercial/Contracts/trSatelliteStore';
import {
  useContractAdjustmentsStore,
  ADJ_TYPE_LABEL,
  ADJ_TYPE_ICON,
  ADJ_STATUS_LABEL,
  ADJ_STATUS_VARIANT
} from '@/stores/Comercial/Contracts/contractAdjustmentsStore';

import ContractAdjustmentModal from './ContractAdjustmentModal.vue';
import Modal from '@/components/UI/Modal.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Spinner from '@/components/UI/Spinner.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';

import Skeleton from '@/components/UI/Skeleton.vue';
const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(['close']);

const toast = useToast();
/* ── Confirmação ────────────────────────────────────────────────────────────
   Um diálogo só para a tela inteira. Eram oito `window.confirm`: caixa do
   navegador, sem dizer o que se perde e sem o tema do sistema. Aqui cada
   chamada descreve a CONSEQUÊNCIA, que é o que a pessoa precisa para decidir. */
const dialogo = ref(null);      // { title, consequence, hint, confirmLabel, onConfirm }
const dialogoBusy = ref(false);
function pedirConfirmacao(cfg) { dialogo.value = cfg; }
async function confirmarDialogo() {
  const fn = dialogo.value?.onConfirm;
  dialogoBusy.value = true;
  try {
    if (fn) await fn();
    dialogo.value = null;
  } catch (e) {
    toast.error(e?.message || 'Não foi possível concluir.');
  } finally {
    dialogoBusy.value = false;
  }
}

const landSyncStore = useLandSyncStore();
const contractsStore = useContractsStore();
const hiddenStore = useHiddenEnterprisesStore();
const commissionRulesStore = useStageCommissionRulesStore();
const valueRulesStore = useEnterpriseValueRulesStore();
const erpLinksStore = useEnterpriseErpLinksStore();
const trSatStore = useTrSatelliteStore();
const adjustmentsStore = useContractAdjustmentsStore();

const activeTab = ref('links');
const tabOptions = [
  { value: 'links',      label: 'Vínculo CV ↔ Sienge', icon: 'fas fa-code-branch' },
  { value: 'obstit',     label: 'Terreno externo',     icon: 'fas fa-mountain' },
  { value: 'hidden',     label: 'Ocultar empreend.',   icon: 'fas fa-eye-slash' },
  { value: 'value',      label: 'Composição de VGV',   icon: 'fas fa-scale-balanced' },
  { value: 'commission', label: 'Comissão',            icon: 'fas fa-percent' },
  { value: 'trsat',      label: 'Satélite de TR',      icon: 'fas fa-link' },
  { value: 'adjust',     label: 'Ajustes contábeis',   icon: 'fas fa-wand-magic-sparkles' },
];

// ── Opções de empreendimento (padrão em TODAS as abas) ─────────────────────
// Rótulo "id - Nome": o id vem na frente para permitir busca/seleção direta
// pelo código; preciso mesmo com nomes duplicados entre CCs — a seleção
// antiga por nome puro adicionava TODOS os ids com o mesmo nome.
const enterpriseIdOptions = computed(() =>
  (contractsStore.enterprises || [])
    .filter(e => e?.id != null && e?.name)
    .map(e => `${e.id} - ${e.name}`)
);

const idFromLabel = (label) => {
  const m = String(label || '').match(/^(\d+)\s*-/);
  return m ? Number(m[1]) : null;
};
const labelForId = (id) => {
  const ent = (contractsStore.enterprises || []).find(e => Number(e.id) === Number(id));
  return ent ? `${ent.id} - ${ent.name}` : null;
};
const idsFromLabels = (labels) =>
  [...new Set((labels || []).map(idFromLabel).filter(n => Number.isFinite(n) && n > 0))];

const enterpriseNameById = computed(() => {
  const m = new Map();
  for (const e of contractsStore.enterprises || []) m.set(Number(e.id), e.name);
  return m;
});

// ── Vínculo CV ↔ Sienge ────────────────────────────────────────────
const VIA_LABEL = {
  manual: 'Vínculo manual',
  etapa_reserva: 'Código da fase (reserva)',
  etapa_cadastro: 'Código da fase (cadastro CV)',
  empreendimento: 'Código do empreendimento',
  cadastro_cv: 'Cadastro do CV',
};
const VIA_VARIANT = {
  manual: 'accent',
  etapa_reserva: 'success',
  etapa_cadastro: 'success',
  empreendimento: 'info',
  cadastro_cv: 'neutral',
};

const unresolved = computed(() => erpLinksStore.pending.filter(p => !p.via));
const resolved = computed(() => erpLinksStore.pending.filter(p => p.via));
const alertCount = computed(() => erpLinksStore.pending.filter(p => p.alerta_sem_codigo_etapa).length);

const EMPTY_LINK = {
  cv_enterprise_name: '', cv_stage_name: '',
  cv_enterprise_id: null, cv_stage_id: null,
  description: '',
};
const newLink = ref({ ...EMPTY_LINK });
const newLinkErpSel = ref([]);       // MultiSelector single: ["Nome (id)"]
const editingLink = ref(null);       // link ativo sendo editado (remove+add ao salvar)

const newLinkErpId = computed(() => idsFromLabels(newLinkErpSel.value)[0] ?? null);

// A chave é código: etapa do CV (preferida) ou empreendimento do CV.
const isNewLinkValid = computed(() =>
  (newLink.value.cv_stage_id != null || newLink.value.cv_enterprise_id != null) &&
  newLinkErpId.value != null
);

function resetLinkForm() {
  newLink.value = { ...EMPTY_LINK };
  newLinkErpSel.value = [];
  editingLink.value = null;
}

// Preenche o formulário a partir de um pendente do diagnóstico.
// A etapa vem junto: quando o empreendimento do CV se divide em fases e o
// Sienge tem um empreendimento por fase, é a etapa que diz qual é o destino.
function pickPending(p) {
  editingLink.value = null;
  newLink.value = {
    cv_enterprise_name: p.cv_enterprise_name || '',
    cv_stage_name: p.cv_stage_name || '',
    cv_enterprise_id: p.cv_enterprise_id ?? null,
    cv_stage_id: p.cv_stage_id ?? null,
    description: '',
  };
  newLinkErpSel.value = [];
}

// Editar um vínculo ativo: prefill completo; salvar substitui (remove + cria).
function pickLinkForEdit(link) {
  editingLink.value = link;
  newLink.value = {
    cv_enterprise_name: link.cv_enterprise_name || '',
    cv_stage_name: link.cv_stage_name || '',
    cv_enterprise_id: link.cv_enterprise_id ?? null,
    cv_stage_id: link.cv_stage_id ?? null,
    description: link.description || '',
  };
  const label = labelForId(link.erp_enterprise_id);
  newLinkErpSel.value = label ? [label] : [];
}

async function handleLinkSave() {
  if (!isNewLinkValid.value) return;
  const erpId = newLinkErpId.value;
  try {
    if (editingLink.value) await erpLinksStore.removeLink(editingLink.value.id);
    await erpLinksStore.addLink({
      cv_enterprise_id: newLink.value.cv_enterprise_id,
      cv_enterprise_name: (newLink.value.cv_enterprise_name || '').trim() || null,
      cv_stage_id: newLink.value.cv_stage_id,
      cv_stage_name: (newLink.value.cv_stage_name || '').trim() || null,
      erp_enterprise_id: erpId,
      erp_enterprise_name: enterpriseNameById.value.get(erpId) || null,
      description: newLink.value.description || null,
    });
    resetLinkForm();
    contractsStore.clearContractsCache();
  } catch (e) {
    toast.error(e?.message || 'Erro ao salvar vínculo.');
  }
}

async function handleLinkRemove(id) {
  pedirConfirmacao({
    title: 'Remover este vínculo CV ↔ Sienge?',
    consequence: 'A projeção desse empreendimento volta a ficar solta: ele deixa de casar com o contrato do Sienge no Faturamento.',
    hint: 'Nada é apagado no CV nem no Sienge — só o vínculo entre os dois.',
    confirmLabel: 'Remover vínculo',
    onConfirm: async () => {
      await erpLinksStore.removeLink(id);
      if (editingLink.value?.id === id) resetLinkForm();
      contractsStore.clearContractsCache();
    },
  });
}

// ── Composição de VGV ──────────────────────────────────────────────
const VALUE_MODE_LABEL = {
  FULL: 'Condições de pagamento',
  LAND_VALUE_ONLY: 'Somente terreno (land_value)',
  TR_ONLY: 'Somente condições TR',
};

const valueModeSelectOptions = Object.entries(VALUE_MODE_LABEL)
  .map(([value, label]) => ({ value, label }));

const newValueRule = ref({ net_mode: 'FULL', gross_mode: 'FULL', description: '' });
const newValueRuleEnts = ref([]);    // múltiplos: uma regra por empreendimento
const editingValueRule = ref(null);  // backend faz upsert por empreendimento

const isNewValueRuleValid = computed(() =>
  idsFromLabels(newValueRuleEnts.value).length > 0 &&
  !(newValueRule.value.net_mode === 'FULL' && newValueRule.value.gross_mode === 'FULL')
);

function resetValueForm() {
  newValueRule.value = { net_mode: 'FULL', gross_mode: 'FULL', description: '' };
  newValueRuleEnts.value = [];
  editingValueRule.value = null;
}

function pickValueRuleForEdit(rule) {
  editingValueRule.value = rule;
  newValueRule.value = {
    net_mode: rule.net_mode || 'FULL',
    gross_mode: rule.gross_mode || 'FULL',
    description: rule.description || '',
  };
  const label = labelForId(rule.enterprise_id);
  newValueRuleEnts.value = label ? [label] : [];
}

async function handleValueRuleSave() {
  if (!isNewValueRuleValid.value) return;
  try {
    for (const eid of idsFromLabels(newValueRuleEnts.value)) {
      await valueRulesStore.addRule({
        enterprise_id: eid,
        enterprise_name: enterpriseNameById.value.get(eid) || null,
        net_mode: newValueRule.value.net_mode,
        gross_mode: newValueRule.value.gross_mode,
        description: newValueRule.value.description || null,
      });
    }
    resetValueForm();
    contractsStore.clearContractsCache();
  } catch (e) {
    toast.error(e?.message || 'Erro ao salvar regra de composição de VGV.');
  }
}

async function handleValueRuleRemove(id) {
  pedirConfirmacao({
    title: 'Remover esta regra de composição de VGV?',
    consequence: 'O empreendimento volta a somar pelas condições de pagamento, e o VGV dele muda no Faturamento na hora seguinte.',
    confirmLabel: 'Remover regra',
    onConfirm: async () => {
      await valueRulesStore.removeRule(id);
      if (editingValueRule.value?.id === id) resetValueForm();
      contractsStore.clearContractsCache();
    },
  });
}

// ── Terreno externo (OBSTIT) ───────────────────────────────────────
const selectedLandLabels = ref([]);

async function handleLandAdd() {
  const ids = idsFromLabels(selectedLandLabels.value);
  if (!ids.length) return;
  for (const eid of ids) {
    await landSyncStore.addItem({
      enterprise_id: eid,
      enterprise_name: enterpriseNameById.value.get(eid) || null,
    });
  }
  selectedLandLabels.value = [];
}

async function handleLandRemove(id) {
  pedirConfirmacao({
    title: 'Tirar este empreendimento da atualização de terreno?',
    consequence: 'O valor de terreno dele para de ser lido da observação do título no Sienge.',
    hint: 'O valor já gravado continua; só deixa de ser atualizado.',
    confirmLabel: 'Remover',
    onConfirm: () => landSyncStore.removeItem(id),
  });
}

async function handleRunSync() {
  try {
    await landSyncStore.runSync();
    toast.success('Sincronização de terreno disparada com sucesso.');
  } catch (e) {
    toast.error(e?.message || 'Erro ao rodar sincronização OBSTIT.');
  }
}

// ── Ocultar empreendimentos ────────────────────────────────────────
const selectedHiddenLabels = ref([]);

// Opções em dois níveis: empresa ("Empresa id - Nome") e centro de custo
// ("id - Nome"). Selecionar uma empresa expande NA HORA para todos os CCs
// dela ainda visíveis — o ocultar continua sendo por empreendimento.
const COMPANY_LABEL_RE = /^Empresa (\d+) - /;

const hiddenCompanyOptions = computed(() => {
  const hiddenIds = hiddenStore.hiddenIds;
  const byCompany = new Map();
  for (const e of contractsStore.enterprises || []) {
    if (e?.id == null || !e?.name || hiddenIds.has(Number(e.id))) continue;
    if (e?.company_id == null || !e?.company_name) continue;
    if (!byCompany.has(Number(e.company_id))) byCompany.set(Number(e.company_id), e.company_name);
  }
  return [...byCompany.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([cid, cname]) => `Empresa ${cid} - ${cname}`);
});

const hiddenSelectableOptions = computed(() => {
  const hiddenIds = hiddenStore.hiddenIds;
  const ccs = (contractsStore.enterprises || [])
    .filter(e => e?.id != null && e?.name && !hiddenIds.has(Number(e.id)))
    .map(e => `${e.id} - ${e.name}`);
  return [...hiddenCompanyOptions.value, ...ccs];
});

function onHiddenSelectionUpdate(value) {
  const labels = Array.isArray(value) ? value : [];
  const hiddenIds = hiddenStore.hiddenIds;
  const seen = new Set();
  const out = [];
  const push = (l) => { if (!seen.has(l)) { seen.add(l); out.push(l); } };
  for (const label of labels) {
    const m = String(label).match(COMPANY_LABEL_RE);
    if (!m) { push(label); continue; }
    const cid = Number(m[1]);
    for (const e of contractsStore.enterprises || []) {
      if (Number(e?.company_id) !== cid) continue;
      if (e?.id == null || !e?.name || hiddenIds.has(Number(e.id))) continue;
      push(`${e.id} - ${e.name}`);
    }
  }
  selectedHiddenLabels.value = out;
}

// Lista de ocultos agrupada por empresa (resolvida pela lista de
// empreendimentos); sem empresa identificada cai no grupo "Outros".
const hiddenGroups = computed(() => {
  const compByEnt = new Map();
  for (const e of contractsStore.enterprises || []) {
    const eid = Number(e.id);
    if (!Number.isFinite(eid) || compByEnt.has(eid)) continue;
    if (e.company_id == null && !e.company_name) continue;
    compByEnt.set(eid, { company_id: e.company_id ?? null, company_name: e.company_name ?? null });
  }

  const groups = new Map();
  for (const item of hiddenStore.items) {
    const comp = compByEnt.get(Number(item.enterprise_id)) || null;
    const key = comp?.company_id != null
      ? `C:${comp.company_id}`
      : (comp?.company_name ? `N:${comp.company_name}` : 'OUTROS');
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        company_id: comp?.company_id ?? null,
        company_name: comp?.company_name ?? null,
        items: [],
      });
    }
    groups.get(key).items.push(item);
  }

  const arr = [...groups.values()];
  for (const g of arr) g.items.sort((a, b) => Number(a.enterprise_id) - Number(b.enterprise_id));
  arr.sort((a, b) => (a.company_id ?? Infinity) - (b.company_id ?? Infinity));
  return arr;
});

const hiddenSaving = ref(false);
const hiddenRemoving = ref(false);

async function refreshAfterHiddenChange() {
  contractsStore.clearContractsCache();
  await contractsStore.fetchContracts({ force: true });
}

async function handleHiddenAdd() {
  const ids = idsFromLabels(selectedHiddenLabels.value);
  if (!ids.length || hiddenSaving.value) return;
  hiddenSaving.value = true;
  try {
    await hiddenStore.addItems(ids.map((eid) => ({
      enterprise_id: eid,
      enterprise_name: enterpriseNameById.value.get(eid) || null,
    })));
    selectedHiddenLabels.value = [];
    await refreshAfterHiddenChange();
  } finally {
    hiddenSaving.value = false;
  }
}

async function handleHiddenRemove(id) {
  if (hiddenRemoving.value) return;
  pedirConfirmacao({
    title: 'Voltar a mostrar este empreendimento?',
    consequence: 'Ele reaparece no Faturamento e volta a somar nos totais.',
    tone: 'accent',
    confirmLabel: 'Restaurar',
    onConfirm: () => restaurarOculto(id),
  });
}

async function restaurarOculto(id) {
  hiddenRemoving.value = true;
  try {
    await hiddenStore.removeItem(id);
    await refreshAfterHiddenChange();
  } finally {
    hiddenRemoving.value = false;
  }
}

async function handleHiddenRemoveGroup(group) {
  if (hiddenRemoving.value || !group?.items?.length) return;
  const label = group.company_name
    ? `da empresa ${group.company_id != null ? group.company_id + ' - ' : ''}${group.company_name}`
    : 'deste grupo';
  pedirConfirmacao({
    title: `Voltar a mostrar ${group.items.length} empreendimento(s)?`,
    consequence: `${label} reaparece(m) no Faturamento e volta(m) a somar nos totais.`,
    tone: 'accent',
    confirmLabel: `Restaurar ${group.items.length}`,
    onConfirm: () => restaurarGrupo(group),
  });
}

async function restaurarGrupo(group) {
  hiddenRemoving.value = true;
  try {
    await hiddenStore.removeItems(group.items.map((i) => i.id));
    await refreshAfterHiddenChange();
  } finally {
    hiddenRemoving.value = false;
  }
}

// ── Comissão por etapa ─────────────────────────────────────────────
const newRule = ref({ stage_id: null, commission_pct_display: null, stage_name: '', description: '' });
const newRuleEnts = ref([]);         // múltiplos: uma regra por empreendimento
const editingCommission = ref(null); // sem PUT no backend: salvar = remove + cria

// Etapa é opcional: sem etapa, a comissão vale para toda venda do empreendimento.
const normalizedStageId = computed(() => {
  const v = newRule.value.stage_id;
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : NaN;
});

const isNewRuleValid = computed(() =>
  idsFromLabels(newRuleEnts.value).length > 0 &&
  !Number.isNaN(normalizedStageId.value) &&
  Number.isFinite(newRule.value.commission_pct_display) &&
  newRule.value.commission_pct_display > 0 && newRule.value.commission_pct_display < 100
);

function resetCommissionForm() {
  newRule.value = { stage_id: null, commission_pct_display: null, stage_name: '', description: '' };
  newRuleEnts.value = [];
  editingCommission.value = null;
}

function pickCommissionForEdit(rule) {
  editingCommission.value = rule;
  newRule.value = {
    stage_id: rule.stage_id ?? null,
    commission_pct_display: Math.round(rule.commission_pct * 10000) / 100,
    stage_name: rule.stage_name || '',
    description: rule.description || '',
  };
  const label = labelForId(rule.enterprise_id);
  newRuleEnts.value = label ? [label] : [];
}

async function handleCommissionSave() {
  if (!isNewRuleValid.value) return;
  try {
    if (editingCommission.value) await commissionRulesStore.removeRule(editingCommission.value.id);
    for (const eid of idsFromLabels(newRuleEnts.value)) {
      await commissionRulesStore.addRule({
        enterprise_id: eid,
        enterprise_name: enterpriseNameById.value.get(eid) || null,
        stage_id: normalizedStageId.value,
        stage_name: newRule.value.stage_name || null,
        commission_pct: newRule.value.commission_pct_display / 100,
        description: newRule.value.description || null,
      });
    }
    resetCommissionForm();
    contractsStore.clearContractsCache();
  } catch (e) {
    toast.error(e?.message || 'Erro ao salvar regra.');
  }
}

async function handleCommissionRemove(id) {
  pedirConfirmacao({
    title: 'Remover esta regra de comissão por etapa?',
    consequence: 'A etapa volta a usar a comissão padrão, e o valor de comissão muda no Faturamento.',
    confirmLabel: 'Remover regra',
    onConfirm: async () => {
      await commissionRulesStore.removeRule(id);
      if (editingCommission.value?.id === id) resetCommissionForm();
      contractsStore.clearContractsCache();
    },
  });
}

// ── Satélite de TR ─────────────────────────────────────────────────
const newTrSat = ref({ description: '' });
const newTrSatSel = ref([]);          // MultiSelector single: satélite
const newTrSatPartnersSel = ref([]);  // múltiplos: partners
const editingTrSat = ref(null);       // backend tem PUT: salvar = updateItem

const newTrSatId = computed(() => idsFromLabels(newTrSatSel.value)[0] ?? null);
const newTrSatPartnerIds = computed(() =>
  idsFromLabels(newTrSatPartnersSel.value).filter(id => id !== newTrSatId.value)
);

const isNewTrSatValid = computed(() =>
  newTrSatId.value != null && newTrSatPartnerIds.value.length > 0
);

function resetTrSatForm() {
  newTrSat.value = { description: '' };
  newTrSatSel.value = [];
  newTrSatPartnersSel.value = [];
  editingTrSat.value = null;
}

function pickTrSatForEdit(item) {
  editingTrSat.value = item;
  newTrSat.value = { description: item.description || '' };
  const satLabel = labelForId(item.satellite_enterprise_id);
  newTrSatSel.value = satLabel ? [satLabel] : [];
  newTrSatPartnersSel.value = (item.partner_enterprise_ids || [])
    .map(labelForId)
    .filter(Boolean);
}

async function handleTrSatSave() {
  if (!isNewTrSatValid.value) return;
  const sid = newTrSatId.value;
  try {
    if (editingTrSat.value) {
      await trSatStore.updateItem(editingTrSat.value.id, {
        satellite_enterprise_name: enterpriseNameById.value.get(sid) || null,
        partner_enterprise_ids: newTrSatPartnerIds.value,
        description: newTrSat.value.description || null,
      });
    } else {
      await trSatStore.addItem({
        satellite_enterprise_id: sid,
        satellite_enterprise_name: enterpriseNameById.value.get(sid) || null,
        partner_enterprise_ids: newTrSatPartnerIds.value,
        description: newTrSat.value.description || null,
      });
    }
    resetTrSatForm();
    contractsStore.clearContractsCache();
  } catch (e) {
    toast.error(e?.message || 'Erro ao salvar satélite de TR.');
  }
}

async function handleTrSatRemove(id) {
  pedirConfirmacao({
    title: 'Remover este vínculo de satélite de TR?',
    consequence: 'O satélite deixa de somar no empreendimento principal e passa a contar sozinho.',
    confirmLabel: 'Remover vínculo',
    onConfirm: async () => {
      await trSatStore.removeItem(id);
      if (editingTrSat.value?.id === id) resetTrSatForm();
      contractsStore.clearContractsCache();
    },
  });
}

// ── Reset de formulários ───────────────────────────────────────────
function resetAllForms() {
  resetLinkForm();
  resetValueForm();
  resetCommissionForm();
  resetTrSatForm();
  selectedLandLabels.value = [];
  selectedHiddenLabels.value = [];
}

// Trocar de aba limpa o formulário — nada de campo "esquecido" de uma aba
// aparecer preenchido quando o admin volta nela.
watch(activeTab, () => resetAllForms());

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return;
  activeTab.value = 'links';
  resetAllForms();

  if (!contractsStore.enterprises.length) await contractsStore.fetchEnterprises();
  await Promise.all([
    landSyncStore.fetchAll(),
    hiddenStore.fetchAll(),
    commissionRulesStore.fetchAll(),
    valueRulesStore.fetchAll(),
    erpLinksStore.fetchAll(),
    erpLinksStore.fetchPending(),
    trSatStore.fetchAll(),
    adjustmentsStore.fetchAll(),
  ]);
});

// ── Ajustes contábeis ───────────────────────────────────────────────────────
// Máscara sobre o dado do contrato. Aqui é a mesa de auditoria: lista tudo que
// está mascarado hoje, permite editar/remover e mostra os ajustes ÓRFÃOS (a
// série sumiu do contrato num sync e a correção parou de valer).
const adjustModalOpen = ref(false);
const editingAdjustment = ref(null);
const adjustFeedback = ref('');

const openNewAdjustment = () => {
  editingAdjustment.value = null;
  adjustFeedback.value = '';
  adjustModalOpen.value = true;
};

const openEditAdjustment = (item) => {
  editingAdjustment.value = item;
  adjustFeedback.value = '';
  adjustModalOpen.value = true;
};

const handleAdjustmentSaved = async ({ divergences }) => {
  await adjustmentsStore.fetchAll();
  // O ajuste pode ter movido a venda de mês: o dashboard precisa reler.
  await contractsStore.refreshAfterAdjustment();
  adjustFeedback.value = divergences > 0
    ? `Ajuste salvo. Mexeu em mês consolidado: ${divergences} divergência(s) registrada(s).`
    : 'Ajuste salvo.';
};

const handleAdjustmentCheck = async () => {
  adjustFeedback.value = '';
  const r = await adjustmentsStore.runCheck();
  adjustFeedback.value = `${r.checked} ajuste(s) conferido(s): ${r.needsReview} a revisar, `
    + `${r.autoResolved} resolvido(s) sozinho(s).`;
};

const handleAdjustmentReview = async (item) => {
  await adjustmentsStore.reviewItem(item.id);
  adjustFeedback.value = 'Ajuste mantido. A origem atual virou a nova referência.';
};

const handleAdjustmentRemove = async (item) => {
  pedirConfirmacao({
    title: `Remover o ajuste ${ADJ_TYPE_LABEL[item.type] || item.type}?`,
    consequence: `O contrato #${item.contract_id} volta a mostrar o dado como veio do Sienge, e o selo Ajustada some dele.`,
    confirmLabel: 'Remover ajuste',
    onConfirm: async () => {
      await adjustmentsStore.removeItem(item.id);
      await contractsStore.refreshAfterAdjustment();
    },
  });
  adjustFeedback.value = adjustmentsStore.lastDivergences > 0
    ? `Ajuste removido. ${adjustmentsStore.lastDivergences} divergência(s) registrada(s) em mês consolidado.`
    : 'Ajuste removido.';
};

const formatAdjDate = (d) => {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split('-');
  return y && m && day ? `${day}/${m}/${y}` : s;
};

const formatAdjMoney = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

// Resumo em uma linha do que o ajuste faz, para a lista não exigir abrir o item.
const adjustmentSummary = (item) => {
  const p = item.payload || {};
  if (item.type === 'FI_DATE') {
    return `${formatAdjDate(item.original?.financial_institution_date)} → ${formatAdjDate(p.financial_institution_date)}`;
  }
  if (item.type === 'SERIE_ADD') {
    return `${p.condition_type_id || '—'} · ${formatAdjMoney(p.total_value)}`;
  }
  const de = item.original?.total_value;
  const para = p.total_value;
  if (para != null && de != null) {
    return `${item.target_code || '—'} · ${formatAdjMoney(de)} → ${formatAdjMoney(para)}`;
  }
  return `${item.target_code || '—'} · campos alterados`;
};

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

        <!-- ═══════════════ TAB: VÍNCULO CV ↔ SIENGE ═══════════════ -->
        <div v-if="activeTab === 'links'" class="p-4 sm:p-5 space-y-4">

          <div v-if="erpLinksStore.error"
            class="rounded-xl border border-data-neg/20 bg-data-neg/10 px-3 py-2.5 text-xs text-data-neg flex items-center gap-2">
            <i class="fas fa-circle-exclamation"></i>{{ erpLinksStore.error }}
          </div>

          <div class="rounded-xl border border-line bg-surface-sunken px-3 py-2.5 text-micro text-ink-muted">
            A projeção vem dos Grupos de Workflow (CV) e precisa achar o empreendimento
            correspondente no Sienge. Normalmente isso acontece sozinho, pelo campo
            <code class="font-mono">idempreendimento_int</code> do cadastro do CV. Quando esse campo
            está vazio, o empreendimento aparece como linha separada no dashboard. Vincule aqui e ele
            passa a somar junto das vendas reais.
          </div>

          <!-- Raio-X: cada origem do CV e o centro de custo que ela resolve -->
          <Surface variant="raised" padding="md" class="space-y-3">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="min-w-0">
                <h3 class="text-sm font-semibold text-ink">De onde vem cada projeção</h3>
                <p class="text-micro text-ink-muted">
                  Cada empreendimento e fase do CV que está gerando projeção, e o centro de custo do
                  Sienge em que ele cai.
                </p>
              </div>
              <div class="flex items-center gap-1.5">
                <Badge v-if="unresolved.length" variant="danger" size="sm">
                  <span class="font-mono tabular-nums">{{ unresolved.length }}</span> sem vínculo
                </Badge>
                <Badge v-if="alertCount" variant="warning" size="sm">
                  <span class="font-mono tabular-nums">{{ alertCount }}</span> a conferir
                </Badge>
                <Badge v-if="!unresolved.length && !alertCount" variant="success" size="sm">
                  <i class="fas fa-circle-check text-[9px]"></i>Tudo resolvido
                </Badge>
              </div>
            </div>

            <div v-if="erpLinksStore.loadingPending" class="flex items-center gap-2 text-xs text-ink-muted">
              <Spinner size="sm" /> Levantando as origens das projeções...
            </div>

            <div v-else class="rounded-lg border border-line bg-surface-sunken max-h-80 overflow-y-auto">
              <EmptyState v-if="!erpLinksStore.pending.length"
                size="sm" icon="fas fa-diagram-project"
                title="Nenhuma projeção em aberto"
                description="Não há reservas nas etapas dos grupos de workflow ativos." />
              <ul v-else class="divide-y divide-line">
                <li v-for="p in [...unresolved, ...resolved]"
                  :key="`${p.cv_enterprise_name}|${p.cv_stage_name || ''}`"
                  class="px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-surface-hover transition-colors"
                  :class="!p.via ? 'bg-data-neg/5' : (p.alerta_sem_codigo_etapa ? 'bg-data-warn/5' : '')">
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-ink truncate">
                      {{ p.cv_enterprise_name }}
                      <span v-if="p.cv_stage_name" class="text-ink-muted font-normal">
                        · {{ p.cv_stage_name }}
                      </span>
                      <span class="text-micro text-ink-subtle font-mono ml-1">
                        ({{ p.reservas }})
                      </span>
                    </p>

                    <!-- Resolveu: mostra o centro de custo e o caminho -->
                    <p v-if="p.via" class="text-micro text-ink-subtle font-mono mt-0.5 truncate">
                      <i class="fas fa-arrow-right text-[8px] mr-0.5"></i>
                      <span class="text-ink">{{ p.erp_enterprise_id }}</span>
                      {{ p.erp_enterprise_name || '(sem contrato no período)' }}
                    </p>
                    <p v-else class="text-micro text-data-neg mt-0.5">
                      Não achou centro de custo. Aparece como linha separada no dashboard.
                    </p>

                    <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge v-if="p.via" :variant="VIA_VARIANT[p.via] || 'neutral'" size="sm">
                        {{ VIA_LABEL[p.via] || p.via }}
                      </Badge>
                      <span v-if="p.cv_stage_int_id" class="text-micro text-ink-subtle font-mono">
                        etapa {{ p.cv_stage_id }} → CC {{ p.cv_stage_int_id }}
                      </span>
                      <span v-else class="text-micro text-ink-subtle font-mono">
                        etapa {{ p.cv_stage_id ?? '—' }} sem código
                      </span>
                    </div>

                    <p v-if="p.alerta_sem_codigo_etapa"
                      class="text-micro text-data-warn mt-1">
                      <i class="fas fa-triangle-exclamation text-[9px] mr-0.5"></i>
                      A fase não tem código no CV, então a resolução caiu no nível do empreendimento
                      e todas as fases dele vão para este mesmo centro de custo. O certo é preencher
                      o código interno da etapa no CV; enquanto isso, dá para vincular por aqui.
                    </p>
                  </div>

                  <Button :variant="p.via ? 'ghost' : 'outline'" size="sm" icon="fas fa-link"
                    class="shrink-0" @click="pickPending(p)">
                    <span class="hidden sm:inline">{{ p.via ? 'Corrigir' : 'Vincular' }}</span>
                  </Button>
                </li>
              </ul>
            </div>
          </Surface>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <!-- Novo vínculo / edição -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <h3 class="text-sm font-semibold text-ink">
                    {{ editingLink ? 'Editando vínculo' : 'Novo vínculo' }}
                  </h3>
                  <p class="text-micro text-ink-muted">
                    Use "Vincular" na lista acima (ou "Editar" num vínculo ativo) para preencher.
                  </p>
                </div>
                <Button v-if="editingLink" variant="ghost" size="sm" icon="fas fa-xmark"
                  @click="resetLinkForm">Cancelar</Button>
              </div>

              <div class="rounded-lg border border-line bg-surface-sunken px-2.5 py-2 text-micro text-ink-muted">
                <span v-if="newLink.cv_enterprise_name || newLink.cv_enterprise_id != null || newLink.cv_stage_id != null">
                  <span class="text-ink font-medium">{{ newLink.cv_enterprise_name || `CV #${newLink.cv_enterprise_id}` }}</span>
                  <span v-if="newLink.cv_stage_name"> · {{ newLink.cv_stage_name }}</span>
                  <span class="block font-mono text-micro text-ink-subtle mt-0.5">
                    etapa CV {{ newLink.cv_stage_id ?? '—' }} · empreendimento CV
                    {{ newLink.cv_enterprise_id ?? '—' }}
                  </span>
                </span>
                <span v-else>Clique em "Vincular" na lista acima para escolher a origem.</span>
              </div>

              <div>
                <label class="block text-micro font-medium text-ink-muted mb-1.5">
                  <i class="fas fa-building text-[10px] mr-1 text-ink-subtle"></i>
                  Empreendimento no Sienge
                </label>
                <MultiSelector :model-value="newLinkErpSel"
                  @update:modelValue="newLinkErpSel = Array.isArray($event) ? $event : []"
                  :options="enterpriseIdOptions" placeholder="Busque o empreendimento..."
                  :single="true" :overlay="true" :page-size="150" />
              </div>

              <Input v-model="newLink.description"
                label="Observação (opcional)"
                placeholder="ex: cadastro do CV sem o ID do Sienge" />

              <div class="flex justify-end pt-1">
                <Button size="sm" :icon="editingLink ? 'fas fa-floppy-disk' : 'fas fa-plus'"
                  :disabled="!isNewLinkValid" @click="handleLinkSave">
                  {{ editingLink ? 'Salvar alterações' : 'Salvar vínculo' }}
                </Button>
              </div>
            </Surface>

            <!-- Vínculos ativos -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-ink">Vínculos ativos</h3>
                  <p class="text-micro text-ink-muted">Valem para todos os usuários.</p>
                </div>
                <Badge variant="accent" size="sm">
                  <span class="font-mono tabular-nums">{{ erpLinksStore.items.length }}</span>
                </Badge>
              </div>

              <div class="rounded-lg border border-line bg-surface-sunken max-h-72 overflow-y-auto">
                <EmptyState v-if="!erpLinksStore.items.length && !erpLinksStore.loading"
                  size="sm" icon="fas fa-code-branch"
                  title="Nenhum vínculo manual"
                  description="Todos resolvem pelo cadastro do CV." />
                <ul v-else class="divide-y divide-line">
                  <li v-for="link in erpLinksStore.items" :key="link.id"
                    class="px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-surface-hover transition-colors"
                    :class="editingLink?.id === link.id ? 'bg-accent-soft/40' : ''">
                    <div class="min-w-0">
                      <p class="text-xs font-medium text-ink truncate">
                        {{ link.cv_enterprise_name || `CV #${link.cv_enterprise_id}` }}
                        <span v-if="link.cv_stage_name" class="text-ink-muted font-normal">
                          · {{ link.cv_stage_name }}
                        </span>
                      </p>
                      <p class="text-micro text-ink-subtle font-mono mt-0.5 truncate">
                        <i class="fas fa-arrow-right text-[8px] mx-0.5"></i>
                        {{ link.erp_enterprise_name || enterpriseNameById.get(Number(link.erp_enterprise_id)) || '—' }}
                        ({{ link.erp_enterprise_id }})
                      </p>
                      <p v-if="link.description" class="text-micro text-ink-subtle mt-0.5 truncate">
                        {{ link.description }}
                      </p>
                    </div>
                    <div class="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="sm" icon="fas fa-pen"
                        @click="pickLinkForEdit(link)">
                        <span class="hidden sm:inline">Editar</span>
                      </Button>
                      <Button variant="ghost" size="sm" icon="fas fa-trash"
                        class="!text-data-neg hover:!bg-data-neg/10"
                        @click="handleLinkRemove(link.id)" />
                    </div>
                  </li>
                </ul>
              </div>
            </Surface>
          </div>
        </div>

        <!-- ═══════════════ TAB: TERRENO EXTERNO (OBSTIT) ═══════════════ -->
        <div v-if="activeTab === 'obstit'" class="p-4 sm:p-5 space-y-4">

          <div v-if="landSyncStore.error"
            class="rounded-xl border border-data-neg/20 bg-data-neg/10 px-3 py-2.5 text-xs text-data-neg flex items-center gap-2">
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
                  <p class="text-micro text-ink-muted">Estes terão o terreno buscado externamente.</p>
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
                      <p class="text-micro text-ink-subtle font-mono mt-0.5">
                        ID ERP: {{ item.enterprise_id }}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" icon="fas fa-trash"
                      class="!text-data-neg hover:!bg-data-neg/10"
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
                <p class="text-micro text-ink-muted">Vincule empreendimentos com atualização externa de terreno.</p>
              </div>

              <div>
                <label class="block text-micro font-medium text-ink-muted mb-1.5">
                  <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>
                  Empreendimento(s)
                </label>
                <MultiSelector :model-value="selectedLandLabels"
                  @update:modelValue="selectedLandLabels = Array.isArray($event) ? $event : []"
                  :options="enterpriseIdOptions" placeholder="Selecione empreendimentos"
                  :overlay="true" :page-size="150" :select-all="true" />
              </div>

              <div class="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <p class="text-micro text-ink-subtle inline-flex items-center gap-1.5">
                  <span class="inline-flex w-2 h-2 rounded-full bg-data-pos"></span>
                  Ao salvar, o próximo job de OBSTIT usará essa configuração.
                </p>
                <Button size="sm" icon="fas fa-plus"
                  :disabled="!selectedLandLabels.length"
                  @click="handleLandAdd">
                  Adicionar
                </Button>
              </div>
            </Surface>
          </div>
        </div>

        <!-- ═══════════════ TAB: OCULTAR EMPREENDIMENTOS ═══════════════ -->
        <div v-if="activeTab === 'hidden'" class="p-4 sm:p-5 space-y-4">

          <div class="rounded-xl border border-data-warn/20 bg-data-warn/10 p-3 text-xs text-data-warn flex items-start gap-2">
            <i class="fas fa-circle-info mt-0.5 shrink-0"></i>
            <span>
              Empreendimentos ocultos <strong>não aparecem na listagem</strong> e
              <strong>não são somados nos resultados</strong>, mas continuam sendo consultados internamente
              (regras de série, terreno, etc.).
            </span>
          </div>

          <div v-if="hiddenStore.error"
            class="rounded-xl border border-data-neg/20 bg-data-neg/10 px-3 py-2.5 text-xs text-data-neg flex items-center gap-2">
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
                  <p class="text-micro text-ink-muted">Excluídos da listagem e dos cálculos.</p>
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
                <div v-else>
                  <div v-for="group in hiddenGroups" :key="group.key">
                    <!-- Cabeçalho do grupo: empresa + restaurar todos -->
                    <div
                      class="sticky top-0 z-10 px-3 py-1.5 bg-surface-raised border-y border-line first:border-t-0 flex items-center justify-between gap-2">
                      <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle truncate">
                        <span v-if="group.company_id != null" class="text-ink font-semibold">{{ group.company_id }}</span>
                        <span v-if="group.company_id != null"> - </span>
                        <span :class="group.company_name ? 'text-ink' : ''">{{ group.company_name || 'Sem empresa identificada' }}</span>
                        <span class="ml-1">({{ group.items.length }})</span>
                      </p>
                      <button type="button"
                        class="shrink-0 text-micro font-medium text-data-pos hover:underline disabled:opacity-50"
                        :disabled="hiddenRemoving"
                        v-tippy="'Restaurar todos os empreendimentos deste grupo'"
                        @click="handleHiddenRemoveGroup(group)">
                        <i class="fas fa-eye text-[9px] mr-0.5"></i>Restaurar todos
                      </button>
                    </div>

                    <ul class="divide-y divide-line">
                      <li v-for="item in group.items" :key="item.id"
                        class="px-3 py-2 flex items-center justify-between gap-2 hover:bg-surface-hover transition-colors">
                        <p class="min-w-0 text-xs text-ink truncate">
                          <span class="font-mono font-semibold">{{ item.enterprise_id }}</span>
                          <span class="text-ink-muted"> - {{ item.enterprise_name || 'Sem nome' }}</span>
                        </p>
                        <Button variant="ghost" size="sm" icon="fas fa-eye"
                          class="!text-data-pos hover:!bg-data-pos/10 shrink-0"
                          :disabled="hiddenRemoving"
                          v-tippy="'Restaurar visibilidade'"
                          @click="handleHiddenRemove(item.id)" />
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </Surface>

            <!-- Adicionar à lista de ocultos -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div>
                <h3 class="text-sm font-semibold text-ink">Ocultar empreendimento</h3>
                <p class="text-micro text-ink-muted">
                  Selecione empreendimentos ou uma empresa inteira — a empresa vira
                  automaticamente todos os centros de custo dela.
                </p>
              </div>

              <div>
                <label class="block text-micro font-medium text-ink-muted mb-1.5">
                  <i class="fas fa-eye-slash text-[10px] mr-1 text-ink-subtle"></i>
                  Empresa ou empreendimento(s)
                </label>
                <MultiSelector :model-value="selectedHiddenLabels"
                  @update:modelValue="onHiddenSelectionUpdate($event)"
                  :options="hiddenSelectableOptions" placeholder="Busque por id, nome ou empresa"
                  :overlay="true" :page-size="150" :select-all="false" />
              </div>

              <div class="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <p v-if="selectedHiddenLabels.length" class="text-micro text-ink-subtle">
                  <span class="font-mono text-ink">{{ selectedHiddenLabels.length }}</span>
                  empreendimento(s) na seleção
                </p>
                <Button size="sm"
                  :icon="hiddenSaving ? 'fas fa-circle-notch fa-spin' : 'fas fa-eye-slash'"
                  class="!bg-data-warn hover:!bg-data-warn ml-auto"
                  :disabled="!selectedHiddenLabels.length || hiddenSaving"
                  @click="handleHiddenAdd">
                  {{ hiddenSaving ? 'Ocultando...' : 'Ocultar selecionados' }}
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
              <code class="font-mono text-micro bg-surface-sunken text-ink px-1.5 py-0.5 rounded ml-1">VGV_real = VGV_recebido / (1 − comissão)</code>
            </span>
          </div>

          <div v-if="commissionRulesStore.error"
            class="rounded-xl border border-data-neg/20 bg-data-neg/10 px-3 py-2.5 text-xs text-data-neg flex items-center gap-2">
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
                  <p class="text-micro text-ink-muted">Comissão apartada aplicada por etapa do repasse.</p>
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
                    class="px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-surface-hover transition-colors"
                    :class="editingCommission?.id === rule.id ? 'bg-accent-soft/40' : ''">
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-medium text-ink truncate">
                        {{ rule.enterprise_name || `Empreendimento ${rule.enterprise_id}` }}
                      </p>
                      <p class="text-micro text-ink-subtle mt-0.5 flex flex-wrap items-center gap-x-2">
                        <span class="font-mono">ERP: {{ rule.enterprise_id }}</span>
                        <span>·</span>
                        <span class="font-mono">
                          {{ rule.stage_id == null ? 'Todas as vendas' : `Etapa: ${rule.stage_id}` }}
                        </span>
                        <span v-if="rule.stage_name" class="truncate">({{ rule.stage_name }})</span>
                        <span>·</span>
                        <span class="text-data-pos font-semibold tabular-nums">
                          {{ (rule.commission_pct * 100).toFixed(2) }}%
                        </span>
                      </p>
                      <p v-if="rule.description"
                        class="text-micro text-ink-subtle mt-0.5 italic truncate">{{ rule.description }}</p>
                    </div>
                    <div class="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="sm" icon="fas fa-pen"
                        @click="pickCommissionForEdit(rule)">
                        <span class="hidden sm:inline">Editar</span>
                      </Button>
                      <Button variant="ghost" size="sm" icon="fas fa-trash"
                        class="!text-data-neg hover:!bg-data-neg/10"
                        @click="handleCommissionRemove(rule.id)" />
                    </div>
                  </li>
                </ul>
              </div>
            </Surface>

            <!-- Adicionar/editar regra -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <h3 class="text-sm font-semibold text-ink">
                    {{ editingCommission ? 'Editando regra' : 'Adicionar regra' }}
                  </h3>
                  <p class="text-micro text-ink-muted">
                    Com etapa, aplica-se apenas a contratos cujo repasse <em>já passou</em> por ela.
                    Sem etapa, vale para toda venda. Selecione vários empreendimentos para criar a
                    mesma regra em lote.
                  </p>
                </div>
                <Button v-if="editingCommission" variant="ghost" size="sm" icon="fas fa-xmark"
                  @click="resetCommissionForm">Cancelar</Button>
              </div>

              <div>
                <label class="block text-micro font-medium text-ink-muted mb-1.5">
                  <i class="fas fa-building text-[10px] mr-1 text-ink-subtle"></i>
                  Empreendimento(s) (ERP)
                </label>
                <MultiSelector :model-value="newRuleEnts"
                  @update:modelValue="newRuleEnts = Array.isArray($event) ? $event : []"
                  :options="enterpriseIdOptions" placeholder="Busque o(s) empreendimento(s)..."
                  :single="!!editingCommission" :overlay="true" :page-size="150" />
              </div>

              <div class="grid grid-cols-2 gap-2">
                <Input v-model.number="newRule.stage_id" type="number" min="1"
                  label="Repasse CV ID (opcional)" placeholder="vazio = todas" />
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
                <Button size="sm" :icon="editingCommission ? 'fas fa-floppy-disk' : 'fas fa-plus'"
                  :disabled="!isNewRuleValid"
                  @click="handleCommissionSave">
                  {{ editingCommission ? 'Salvar alterações' : 'Adicionar regra' }}
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
              mescladas com as do(s) <strong>partner(s)</strong> casando por <code class="font-mono text-micro bg-surface-sunken px-1.5 py-0.5 rounded">cliente + unidade</code>.
              Sem partner correspondente, o contrato satélite é descartado para evitar contagem dupla.
            </span>
          </div>

          <div v-if="trSatStore.error"
            class="rounded-xl border border-data-neg/20 bg-data-neg/10 px-3 py-2.5 text-xs text-data-neg flex items-center gap-2">
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
                  <p class="text-micro text-ink-muted">Satélite → partner(s) que recebem o merge.</p>
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
                    class="px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-surface-hover transition-colors"
                    :class="editingTrSat?.id === item.id ? 'bg-accent-soft/40' : ''">
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-medium text-ink truncate">
                        {{ item.satellite_enterprise_name || `Empreendimento ${item.satellite_enterprise_id}` }}
                      </p>
                      <p class="text-micro text-ink-subtle font-mono mt-0.5">
                        ID satélite: {{ item.satellite_enterprise_id }}
                      </p>
                      <p class="text-micro text-ink-muted mt-1">
                        <i class="fas fa-arrow-right text-accent mr-1"></i>
                        <span class="text-ink">Partners:</span>
                        <span v-for="(pid, idx) in item.partner_enterprise_ids" :key="pid">
                          <span v-if="idx > 0">, </span>
                          <span class="font-medium">{{ enterpriseNameById.get(Number(pid)) || `ERP ${pid}` }}</span>
                          <span class="font-mono text-ink-subtle">({{ pid }})</span>
                        </span>
                      </p>
                      <p v-if="item.description"
                        class="text-micro text-ink-subtle mt-0.5 italic truncate">{{ item.description }}</p>
                    </div>
                    <div class="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="sm" icon="fas fa-pen"
                        @click="pickTrSatForEdit(item)">
                        <span class="hidden sm:inline">Editar</span>
                      </Button>
                      <Button variant="ghost" size="sm" icon="fas fa-trash"
                        class="!text-data-neg hover:!bg-data-neg/10"
                        @click="handleTrSatRemove(item.id)" />
                    </div>
                  </li>
                </ul>
              </div>
            </Surface>

            <!-- Adicionar/editar vínculo -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <h3 class="text-sm font-semibold text-ink">
                    {{ editingTrSat ? 'Editando vínculo' : 'Adicionar vínculo' }}
                  </h3>
                  <p class="text-micro text-ink-muted">
                    Selecione o empreendimento <em>satélite</em> (que carrega o TR) e os <em>partners</em> de incorporação.
                  </p>
                </div>
                <Button v-if="editingTrSat" variant="ghost" size="sm" icon="fas fa-xmark"
                  @click="resetTrSatForm">Cancelar</Button>
              </div>

              <div>
                <label class="block text-micro font-medium text-ink-muted mb-1.5">
                  <i class="fas fa-building text-[10px] mr-1 text-ink-subtle"></i>
                  Empreendimento satélite (TR)
                </label>
                <MultiSelector :model-value="newTrSatSel"
                  @update:modelValue="newTrSatSel = Array.isArray($event) ? $event : []"
                  :options="enterpriseIdOptions" placeholder="Busque o satélite..."
                  :single="true" :overlay="true" :page-size="150"
                  :disabled="!!editingTrSat" />
                <p v-if="editingTrSat" class="text-micro text-ink-subtle mt-1">
                  O satélite não muda na edição — para trocar, remova e crie outro vínculo.
                </p>
              </div>

              <div>
                <label class="block text-micro font-medium text-ink-muted mb-1.5">
                  <i class="fas fa-handshake text-[10px] mr-1 text-ink-subtle"></i>
                  Partners (incorporação)
                </label>
                <MultiSelector :model-value="newTrSatPartnersSel"
                  @update:modelValue="newTrSatPartnersSel = Array.isArray($event) ? $event : []"
                  :options="enterpriseIdOptions" placeholder="Selecione um ou mais partners"
                  :overlay="true" :page-size="150" :select-all="false" />
              </div>

              <Input v-model="newTrSat.description"
                label="Descrição (opcional)"
                placeholder="ex: Parque dos Ipês — TR no pai, incorporação nos módulos" />

              <div class="flex justify-end pt-1">
                <Button size="sm" :icon="editingTrSat ? 'fas fa-floppy-disk' : 'fas fa-plus'"
                  :disabled="!isNewTrSatValid"
                  @click="handleTrSatSave">
                  {{ editingTrSat ? 'Salvar alterações' : 'Adicionar vínculo' }}
                </Button>
              </div>
            </Surface>
          </div>
        </div>

        <!-- ═══════════════ TAB: COMPOSIÇÃO DE VGV ═══════════════ -->
        <div v-if="activeTab === 'value'" class="p-4 sm:p-5 space-y-4">

          <div v-if="valueRulesStore.error"
            class="rounded-xl border border-data-neg/20 bg-data-neg/10 px-3 py-2.5 text-xs text-data-neg flex items-center gap-2">
            <i class="fas fa-circle-exclamation"></i>{{ valueRulesStore.error }}
          </div>

          <div class="rounded-xl border border-line bg-surface-sunken px-3 py-2.5 text-micro text-ink-muted">
            Por padrão o VGV de um empreendimento é a soma das condições de pagamento do contrato.
            Use esta aba quando um empreendimento precisar de outra conta: apenas o valor do terreno
            (campo <code class="font-mono">land_value</code>) ou apenas as condições de Terreno (TR).
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <!-- Lista -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="text-sm font-semibold text-ink">Regras ativas</h3>
                  <p class="text-micro text-ink-muted">Valem para todos os usuários do dashboard.</p>
                </div>
                <Badge variant="accent" size="sm">
                  <span class="font-mono tabular-nums">{{ valueRulesStore.items.length }}</span>
                </Badge>
              </div>

              <div class="rounded-lg border border-line bg-surface-sunken max-h-72 overflow-y-auto">
                <EmptyState v-if="!valueRulesStore.items.length && !valueRulesStore.loading"
                  size="sm" icon="fas fa-scale-balanced"
                  title="Nenhuma regra"
                  description="Todos os empreendimentos somam pelas condições de pagamento." />
                <ul v-else class="divide-y divide-line">
                  <li v-for="rule in valueRulesStore.items" :key="rule.id"
                    class="px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-surface-hover transition-colors"
                    :class="editingValueRule?.id === rule.id ? 'bg-accent-soft/40' : ''">
                    <div class="min-w-0">
                      <p class="text-xs font-medium text-ink truncate">
                        {{ rule.enterprise_name || enterpriseNameById.get(Number(rule.enterprise_id)) || 'Sem nome' }}
                      </p>
                      <p class="text-micro text-ink-subtle font-mono mt-0.5">
                        ID {{ rule.enterprise_id }} · VGV: {{ VALUE_MODE_LABEL[rule.net_mode] || rule.net_mode }}
                        · VGV+DC: {{ VALUE_MODE_LABEL[rule.gross_mode] || rule.gross_mode }}
                      </p>
                      <p v-if="rule.description" class="text-micro text-ink-subtle mt-0.5 truncate">
                        {{ rule.description }}
                      </p>
                    </div>
                    <div class="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="sm" icon="fas fa-pen"
                        @click="pickValueRuleForEdit(rule)">
                        <span class="hidden sm:inline">Editar</span>
                      </Button>
                      <Button variant="ghost" size="sm" icon="fas fa-trash"
                        class="!text-data-neg hover:!bg-data-neg/10"
                        @click="handleValueRuleRemove(rule.id)" />
                    </div>
                  </li>
                </ul>
              </div>
            </Surface>

            <!-- Adicionar/editar -->
            <Surface variant="raised" padding="md" class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <div>
                  <h3 class="text-sm font-semibold text-ink">
                    {{ editingValueRule ? 'Editando regra' : 'Nova regra' }}
                  </h3>
                  <p class="text-micro text-ink-muted">
                    Uma regra por empreendimento (salvar de novo sobrescreve). Selecione vários
                    para aplicar a mesma composição em lote.
                  </p>
                </div>
                <Button v-if="editingValueRule" variant="ghost" size="sm" icon="fas fa-xmark"
                  @click="resetValueForm">Cancelar</Button>
              </div>

              <div>
                <label class="block text-micro font-medium text-ink-muted mb-1.5">
                  <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>Empreendimento(s)
                </label>
                <MultiSelector :model-value="newValueRuleEnts"
                  @update:modelValue="newValueRuleEnts = Array.isArray($event) ? $event : []"
                  :options="enterpriseIdOptions" placeholder="Busque o(s) empreendimento(s)..."
                  :single="!!editingValueRule" :overlay="true" :page-size="150" />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-micro font-medium text-ink-muted mb-1.5">Modo no VGV</label>
                  <Select v-model="newValueRule.net_mode" :options="valueModeSelectOptions" />
                </div>
                <div>
                  <label class="block text-micro font-medium text-ink-muted mb-1.5">Modo no VGV+DC</label>
                  <Select v-model="newValueRule.gross_mode" :options="valueModeSelectOptions" />
                </div>
              </div>

              <Input v-model="newValueRule.description"
                label="Descrição (opcional)"
                placeholder="ex: só o terreno entra no faturamento deste estoque" />

              <div class="flex justify-end pt-1">
                <Button size="sm" :icon="editingValueRule ? 'fas fa-floppy-disk' : 'fas fa-plus'"
                  :disabled="!isNewValueRuleValid"
                  @click="handleValueRuleSave">
                  {{ editingValueRule ? 'Salvar alterações' : 'Salvar regra' }}
                </Button>
              </div>
            </Surface>
          </div>
        </div>

        <!-- ═══════════════ TAB: AJUSTES CONTÁBEIS ═══════════════ -->
        <div v-if="activeTab === 'adjust'" class="p-4 sm:p-5 space-y-4">

          <div v-if="adjustmentsStore.error"
            class="rounded-xl border border-data-neg/20 bg-data-neg/10 px-3 py-2.5 text-xs text-data-neg flex items-center gap-2">
            <i class="fas fa-circle-exclamation"></i>{{ adjustmentsStore.error }}
          </div>

          <div v-if="adjustFeedback"
            class="rounded-xl border border-data-pos/20 bg-data-pos/10 px-3 py-2.5 text-xs text-data-pos flex items-center gap-2">
            <i class="fas fa-circle-check"></i>{{ adjustFeedback }}
          </div>

          <div class="rounded-xl border border-line bg-surface-sunken px-3 py-2.5 text-micro text-ink-muted">
            Corrige, só para o relatório, o dado que veio errado do Sienge: data da instituição
            financeira, série adicionada à mão ou série editada. Nada é gravado no Sienge - a
            correção é uma máscara aplicada na leitura, e toda venda ajustada mostra o selo
            <span class="text-accent font-medium">Ajustada</span> na listagem.
            Ajuste em mês já consolidado registra divergência na hora.
            <br>
            A máscara sobrevive ao sync e ao backup: fica em tabela própria e só sai se um admin
            remover. Todo dia às 03:40 o sistema confere se o contrato mudou no Sienge depois da
            correção - se mudou, vira <strong>Conferir</strong> e você é notificado; se o Sienge
            passou a trazer exatamente o valor ajustado, o ajuste se resolve sozinho, sem aviso.
          </div>

          <div v-if="adjustmentsStore.needsReview.length"
            class="rounded-xl border border-data-warn/30 bg-data-warn/10 px-3 py-2.5 text-micro text-data-warn">
            <i class="fas fa-triangle-exclamation mr-1"></i>
            {{ adjustmentsStore.needsReview.length }} ajuste(s) para conferir: o dado mudou no
            Sienge depois da correção. A correção continua valendo no relatório - decida manter
            ("Já conferi"), editar ou remover.
          </div>

          <Surface variant="raised" padding="md" class="space-y-3">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="min-w-0">
                <h3 class="text-sm font-semibold text-ink">Ajustes ativos</h3>
                <p class="text-micro text-ink-muted">
                  Valem para todos os usuários do dashboard, do fechamento e da Eme.
                </p>
              </div>
              <div class="flex items-center gap-2">
                <Badge variant="accent" size="sm">
                  <span class="font-mono tabular-nums">{{ adjustmentsStore.items.length }}</span>
                </Badge>
                <Button variant="outline" size="sm"
                  :icon="adjustmentsStore.saving ? 'fas fa-circle-notch fa-spin' : 'fas fa-rotate-right'"
                  :disabled="adjustmentsStore.saving" @click="handleAdjustmentCheck">
                  Conferir agora
                </Button>
                <Button size="sm" icon="fas fa-plus" @click="openNewAdjustment">Novo ajuste</Button>
              </div>
            </div>

            <div class="rounded-lg border border-line bg-surface-sunken max-h-80 overflow-y-auto">
              <Skeleton v-if="adjustmentsStore.loading" variant="row" :lines="3" />

              <EmptyState v-else-if="!adjustmentsStore.items.length"
                size="sm" icon="fas fa-wand-magic-sparkles"
                title="Nenhum ajuste"
                description="Todos os contratos estão exatamente como vieram do Sienge." />

              <ul v-else class="divide-y divide-line">
                <li v-for="item in adjustmentsStore.items" :key="item.id"
                  class="px-3 py-2.5 flex items-start justify-between gap-2 hover:bg-surface-hover transition-colors">
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <i :class="ADJ_TYPE_ICON[item.type]" class="text-[10px] text-accent"></i>
                      <span class="text-xs font-medium text-ink">{{ ADJ_TYPE_LABEL[item.type] || item.type }}</span>
                      <Badge :variant="ADJ_STATUS_VARIANT[item.status] || 'neutral'" size="sm"
                        v-tippy="item.status === 'auto_resolved'
                          ? 'O Sienge passou a trazer esse valor; a máscara saiu de cena sozinha.'
                          : (item.status === 'needs_review'
                            ? 'A origem mudou. A máscara continua valendo até você decidir.'
                            : 'Origem igual à do momento do ajuste.')">
                        {{ ADJ_STATUS_LABEL[item.status] || item.status }}
                      </Badge>
                    </div>
                    <p class="text-micro text-ink font-mono mt-0.5">{{ adjustmentSummary(item) }}</p>
                    <p class="text-micro text-ink-subtle font-mono mt-0.5 truncate">
                      #{{ item.contract_id }} · {{ item.customer_name || '—' }} ·
                      {{ item.unit_name || '—' }} · {{ item.enterprise_name || '—' }}
                    </p>
                    <p class="text-micro text-ink-muted mt-0.5 truncate">
                      {{ item.reason }}
                      <span class="text-ink-subtle">— {{ item.created_by_name || 'sem autor' }}</span>
                    </p>
                    <p v-if="item.status_message"
                      class="text-micro mt-0.5"
                      :class="item.status === 'needs_review'
                        ? 'text-data-warn'
                        : 'text-ink-subtle'">
                      {{ item.status_message }}
                    </p>
                    <p v-if="item.reviewed_by_name" class="text-micro text-ink-subtle mt-0.5">
                      Conferido por {{ item.reviewed_by_name }}
                    </p>
                  </div>
                  <div class="flex items-center gap-0.5 shrink-0">
                    <Button v-if="item.status === 'needs_review'" variant="ghost" size="sm"
                      icon="fas fa-check" class="!text-data-pos hover:!bg-data-pos/10"
                      v-tippy="'Manter o ajuste como está e adotar a origem atual como referência'"
                      @click="handleAdjustmentReview(item)">
                      <span class="hidden sm:inline">Já conferi</span>
                    </Button>
                    <Button variant="ghost" size="sm" icon="fas fa-pen" @click="openEditAdjustment(item)">
                      <span class="hidden sm:inline">Editar</span>
                    </Button>
                    <Button variant="ghost" size="sm" icon="fas fa-trash"
                      class="!text-data-neg hover:!bg-data-neg/10"
                      @click="handleAdjustmentRemove(item)" />
                  </div>
                </li>
              </ul>
            </div>
          </Surface>
        </div>
      </div>
    </div>

    <template #footer>
      <p v-if="activeTab === 'obstit'" class="text-micro text-ink-subtle leading-tight mr-auto hidden sm:block">
        Coleta de TR é D-1, feita 1×/dia às 07:05.<br>
        Sincronização manual: 1–10 minutos.
      </p>
      <p v-else-if="activeTab === 'commission'" class="text-micro text-ink-subtle leading-tight mr-auto hidden sm:block">
        Sem etapa, a comissão vale para toda venda do empreendimento.<br>
        Alterações são aplicadas imediatamente. Recarregue os contratos para ver os novos valores.
      </p>
      <p v-else-if="activeTab === 'links'" class="text-micro text-ink-subtle leading-tight mr-auto hidden sm:block">
        O vínculo é resolvido no servidor: a projeção passa a chegar já casada.<br>
        Recarregue os contratos para ver o efeito no dashboard.
      </p>
      <p v-else-if="activeTab === 'value'" class="text-micro text-ink-subtle leading-tight mr-auto hidden sm:block">
        Vale para todos os usuários, no Faturamento e no Vendas × Projeção.<br>
        Recarregue os contratos para ver os novos valores.
      </p>
      <p v-else-if="activeTab === 'trsat'" class="text-micro text-ink-subtle leading-tight mr-auto hidden sm:block">
        Match por <code class="font-mono">customer_id + unit_name</code>.<br>
        Satélites sem partner correspondente são descartados do relatório.
      </p>
      <p v-else-if="activeTab === 'adjust'" class="text-micro text-ink-subtle leading-tight mr-auto hidden sm:block">
        O Sienge não é alterado: a correção é aplicada na leitura, para todo mundo.<br>
        Conferência automática às 03:40, depois do sync de contratos.
      </p>
      <p v-else class="text-micro text-ink-subtle leading-tight mr-auto hidden sm:block">
        Alterações são aplicadas imediatamente no dashboard.<br>
        Os ocultos continuam sendo consultados internamente.
      </p>

      <Button variant="ghost" @click="closeModal">Fechar</Button>
      <Button v-if="activeTab === 'obstit'"
        :icon="landSyncStore.syncLoading ? 'fas fa-circle-notch fa-spin' : 'fas fa-play'"
        class="!bg-data-pos hover:!bg-data-pos"
        :disabled="landSyncStore.syncLoading"
        @click="handleRunSync">
        {{ landSyncStore.syncLoading ? 'Sincronizando...' : 'Sincronizar' }}
      </Button>
    </template>
  </Modal>

  <!-- Formulário do ajuste contábil (o mesmo usado no detalhe da venda) -->
  <ContractAdjustmentModal
    :open="adjustModalOpen"
    :editing="editingAdjustment"
    @close="adjustModalOpen = false"
    @saved="handleAdjustmentSaved" />

  <!-- Um diálogo para as sete confirmações desta tela. Cada chamada informa a
       consequência; o `window.confirm` que estava aqui não informava nenhuma. -->
  <ConfirmDialog :open="!!dialogo"
    :tone="dialogo?.tone || 'danger'"
    :title="dialogo?.title || ''"
    :consequence="dialogo?.consequence || ''"
    :hint="dialogo?.hint || ''"
    :confirm-label="dialogo?.confirmLabel || 'Confirmar'"
    :loading="dialogoBusy"
    @confirm="confirmarDialogo" @cancel="dialogo = null" />
</template>
