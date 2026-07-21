<script setup>
/**
 * EnterpriseFormModal — modal ÚNICO para adicionar e configurar empreendimentos.
 *   mode='add'  → escolher do Sienge (ERP) OU cadastrar manual
 *   mode='edit' → ajustar ticket, marketing, comissão, unidades, cidade, custo loja
 *
 * Emite:
 *   close
 *   submit-add   { erps: [{id,name,city}], manual: {...}|null }
 *   submit-edit  { patch }   (aplicado pelo pai na row alvo)
 */
import { ref, computed, watch } from 'vue';
import { useProjectionsStore } from '@/stores/Comercial/Projections/projectionsStore';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'add' },        // 'add' | 'edit'
  row: { type: Object, default: null },           // alvo no modo edit
  existingErpIds: { type: Array, default: () => [] },
});
const emit = defineEmits(['close', 'submit-add', 'submit-edit']);

const store = useProjectionsStore();

const tab = ref('erp');                            // 'erp' | 'manual'
const search = ref('');
const cityFilter = ref([]);
const picked = ref(new Set());                     // erp ids selecionados

const manual = ref({ name: '', city: '', defaultPrice: 0, defaultMarketingPct: 0, defaultCommissionPct: 0, totalUnits: 0, custoLoja: 0 });
const edit = ref({ name: '', city: '', defaultPrice: 0, defaultMarketingPct: 0, defaultCommissionPct: 0, totalUnits: null, custoLoja: 0, blockedConsideredAvailable: 0 });

const existingSet = computed(() => new Set((props.existingErpIds || []).map(String)));

const cityOptions = computed(() => store.enterprisePickerCities || []);
const results = computed(() =>
  store.filterEnterprisePicker({ search: search.value, selectedCities: cityFilter.value }).slice(0, 400)
);
const pickedCount = computed(() => picked.value.size);

function isErpRow() { return props.mode === 'edit' && !!props.row?.erp_id; }

watch(() => props.open, (v) => {
  if (!v) return;
  if (props.mode === 'add') {
    tab.value = 'erp';
    search.value = '';
    cityFilter.value = [];
    picked.value = new Set();
    manual.value = { name: '', city: '', defaultPrice: 0, defaultMarketingPct: 0, defaultCommissionPct: 0, totalUnits: 0, custoLoja: 0 };
    store.fetchEnterprisePicker();
  } else if (props.row) {
    edit.value = {
      name: props.row.name || '',
      city: props.row.city || '',
      defaultPrice: Number(props.row.defaultPrice || 0),
      defaultMarketingPct: Number(props.row.defaultMarketingPct || 0),
      defaultCommissionPct: Number(props.row.defaultCommissionPct || 0),
      totalUnits: props.row.erp_id ? null : (props.row.totalUnits ?? null),
      custoLoja: Number(props.row.custoLoja || 0),
      blockedConsideredAvailable: Number(props.row.blockedConsideredAvailable || 0),
    };
  }
});

function togglePick(id) {
  const key = String(id);
  if (existingSet.value.has(key)) return;
  const next = new Set(picked.value);
  next.has(key) ? next.delete(key) : next.add(key);
  picked.value = next;
}

function submitAddErp() {
  const chosen = (store.enterprisePicker || [])
    .filter((e) => picked.value.has(String(e.id)))
    .map((e) => ({ id: String(e.id), name: e.name || String(e.id), city: e.city || null }));
  if (!chosen.length) return;
  emit('submit-add', { erps: chosen, manual: null });
}

function submitAddManual() {
  const name = (manual.value.name || '').trim();
  const city = (manual.value.city || '').trim();
  if (!name || !city) return;
  emit('submit-add', {
    erps: [],
    manual: {
      name, city,
      defaultPrice: Number(manual.value.defaultPrice || 0),
      defaultMarketingPct: Number(manual.value.defaultMarketingPct || 0),
      defaultCommissionPct: Number(manual.value.defaultCommissionPct || 0),
      totalUnits: Math.max(0, parseInt(manual.value.totalUnits, 10) || 0),
      custoLoja: Number(manual.value.custoLoja || 0),
    },
  });
}

function submitEdit() {
  const patch = {
    name: (edit.value.name || '').trim() || null,
    city: (edit.value.city || '').trim() || null,
    defaultPrice: Number(edit.value.defaultPrice || 0),
    defaultMarketingPct: Number(edit.value.defaultMarketingPct || 0),
    defaultCommissionPct: Number(edit.value.defaultCommissionPct || 0),
    custoLoja: Number(edit.value.custoLoja || 0),
    blockedConsideredAvailable: Math.max(0, parseInt(edit.value.blockedConsideredAvailable, 10) || 0),
  };
  if (!isErpRow()) {
    const tu = edit.value.totalUnits;
    patch.totalUnits = (tu !== null && tu !== '') ? Math.max(0, parseInt(tu, 10) || 0) : null;
  }
  emit('submit-edit', { patch });
}

const canManual = computed(() => (manual.value.name || '').trim() && (manual.value.city || '').trim());
</script>

<template>
  <Modal :open="open" size="lg" :title="mode === 'add' ? 'Adicionar empreendimento' : 'Configurar empreendimento'"
    @close="emit('close')">

    <!-- ════════ ADD ════════ -->
    <div v-if="mode === 'add'" class="space-y-4">
      <!-- Segmented -->
      <div class="inline-flex rounded-lg border border-line bg-surface-sunken p-0.5 text-sm">
        <button type="button" @click="tab = 'erp'"
          :class="['px-3 py-1.5 rounded-md font-medium transition-colors', tab === 'erp' ? 'bg-surface-raised text-ink shadow-soft' : 'text-ink-muted hover:text-ink']">
          <i class="fas fa-building mr-1.5"></i> Do Sienge
        </button>
        <button type="button" @click="tab = 'manual'"
          :class="['px-3 py-1.5 rounded-md font-medium transition-colors', tab === 'manual' ? 'bg-surface-raised text-ink shadow-soft' : 'text-ink-muted hover:text-ink']">
          <i class="fas fa-pen-to-square mr-1.5"></i> Manual
        </button>
      </div>

      <!-- ERP picker -->
      <div v-if="tab === 'erp'" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="search" placeholder="Buscar por nome ou código..." iconLeft="fas fa-magnifying-glass" />
          <MultiSelector v-model="cityFilter" :options="cityOptions" placeholder="Filtrar por cidade" overlay />
        </div>

        <div class="rounded-xl border border-line divide-y divide-line max-h-72 overflow-auto">
          <p v-if="!results.length" class="p-6 text-center text-sm text-ink-subtle">
            Nenhum empreendimento encontrado.
          </p>
          <label v-for="e in results" :key="e.id"
            class="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-sunken transition-colors"
            :class="existingSet.has(String(e.id)) ? 'opacity-50 cursor-not-allowed' : ''">
            <input type="checkbox" :checked="picked.has(String(e.id))" :disabled="existingSet.has(String(e.id))"
              @change="togglePick(e.id)" class="rounded border-line accent-accent" />
            <div class="min-w-0 flex-1">
              <p class="text-sm text-ink truncate">{{ e.name }}</p>
              <p class="text-[11px] text-ink-subtle font-mono">
                CC {{ e.id }}<span v-if="e.city"> • {{ e.city }}</span>
              </p>
            </div>
            <span v-if="existingSet.has(String(e.id))" class="text-[10px] text-ink-subtle">já incluído</span>
          </label>
        </div>
        <p class="text-xs text-ink-muted">
          <i class="fas fa-circle-info mr-1"></i>
          O ticket, marketing e comissão você define depois, clicando em <strong>Configurar</strong> na linha.
        </p>
      </div>

      <!-- Manual -->
      <div v-else class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input v-model="manual.name" label="Nome do empreendimento" required placeholder="Ex.: Residencial Aurora" />
          <Input v-model="manual.city" label="Cidade" required placeholder="Ex.: Presidente Prudente" />
          <Input v-model.number="manual.totalUnits" type="number" label="Total de unidades" />
          <Input v-model.number="manual.defaultPrice" type="number" label="Ticket médio (R$)" />
          <Input v-model.number="manual.defaultMarketingPct" type="number" label="Marketing (%)" />
          <Input v-model.number="manual.defaultCommissionPct" type="number" label="Comissão (%)" />
        </div>
        <p v-if="!canManual" class="text-xs text-amber-600 dark:text-amber-400">
          <i class="fas fa-circle-exclamation mr-1"></i> Nome e cidade são obrigatórios.
        </p>
      </div>
    </div>

    <!-- ════════ EDIT ════════ -->
    <div v-else class="space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input v-model="edit.name" label="Nome" :disabled="isErpRow()"
          :hint="isErpRow() ? 'Nome vem do Sienge' : ''" />
        <Input v-model="edit.city" label="Cidade" :disabled="isErpRow()"
          :hint="isErpRow() ? 'Cidade vem do Sienge' : ''" />
        <Input v-model.number="edit.defaultPrice" type="number" label="Ticket médio (R$)"
          hint="Usado no VGV de cada mês" />
        <Input v-if="!isErpRow()" v-model.number="edit.totalUnits" type="number" label="Total de unidades" />
        <Input v-model.number="edit.defaultMarketingPct" type="number" label="Marketing (%)" />
        <Input v-model.number="edit.defaultCommissionPct" type="number" label="Comissão (%)" />
        <Input v-model.number="edit.custoLoja" type="number" label="Custo loja (R$)" />
        <Input v-model.number="edit.blockedConsideredAvailable" type="number" label="Bloqueadas contadas como disponíveis" />
      </div>
    </div>

    <template #footer>
      <Button variant="ghost" @click="emit('close')">Cancelar</Button>

      <Button v-if="mode === 'add' && tab === 'erp'" icon="fas fa-plus" :disabled="!pickedCount" @click="submitAddErp">
        Adicionar {{ pickedCount || '' }}
      </Button>
      <Button v-else-if="mode === 'add'" icon="fas fa-plus" :disabled="!canManual" @click="submitAddManual">
        Adicionar
      </Button>
      <Button v-else icon="fas fa-check" @click="submitEdit">Aplicar</Button>
    </template>
  </Modal>
</template>
