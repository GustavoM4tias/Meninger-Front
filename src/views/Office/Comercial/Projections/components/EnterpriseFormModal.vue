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
    linkOpen.value = false;
    linkSearch.value = '';
    linkCityFilter.value = [];
    linkPick.value = null;
    edit.value = {
      name: props.row.name || '',
      city: props.row.city || '',
      defaultPrice: Number(props.row.defaultPrice || 0),
      defaultMarketingPct: Number(props.row.defaultMarketingPct || 0),
      defaultCommissionPct: Number(props.row.defaultCommissionPct || 0),
      totalUnits: props.row.totalUnits ?? null,
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
  if (!isErpRow() || !stock.value) {
    // Sem estoque do CV, o total manual vale como fallback (CC ou não);
    // quando o CV trouxer as unidades, o resumo sobrepõe.
    const tu = edit.value.totalUnits;
    patch.totalUnits = (tu !== null && tu !== '') ? Math.max(0, parseInt(tu, 10) || 0) : null;
  }
  if (linkPick.value) {
    patch.erp_id = String(linkPick.value.id);
    patch.city = linkPick.value.city || null;
    patch.units_summary = null;   // estoque re-enriquecido no próximo load
  }
  emit('submit-edit', { patch });
}

const canManual = computed(() => (manual.value.name || '').trim() && (manual.value.city || '').trim());

/* Estoque ao vivo do CV (units_summary da linha vinculada a CC do Sienge) */
const stock = computed(() => {
  const s = props.row?.units_summary;
  if (!s) return null;
  return {
    total: Number(s.totalUnits || 0),
    sold: Number(s.soldUnitsStock ?? s.soldUnits ?? 0),
    reserved: Number(s.reservedUnits || 0),
    blocked: Number(s.blockedUnits || 0),
    available: Number(s.availableUnits || 0),
  };
});
const stockPct = (v) => (stock.value?.total ? Math.min(100, Math.round((v / stock.value.total) * 100)) : 0);

/* Vínculo com CC do Sienge (modo edit): vincular linha manual ou trocar o CC */
const linkOpen = ref(false);
const linkSearch = ref('');
const linkCityFilter = ref([]);
const linkPick = ref(null); // { id, name, city } pendente até Aplicar

const linkResults = computed(() =>
  store.filterEnterprisePicker({ search: linkSearch.value, selectedCities: linkCityFilter.value }).slice(0, 400)
);

function openLinkPicker() {
  linkOpen.value = !linkOpen.value;
  if (linkOpen.value) {
    linkSearch.value = '';
    linkCityFilter.value = [];
    store.fetchEnterprisePicker();
  }
}
function pickLink(e) {
  if (existingSet.value.has(String(e.id))) return;
  linkPick.value = { id: String(e.id), name: e.name || String(e.id), city: e.city || null };
  linkOpen.value = false;
  // Apelido continua livre; só sugere o nome do Sienge se o campo estiver vazio.
  if (!(edit.value.name || '').trim()) edit.value.name = linkPick.value.name;
}
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
    <div v-else class="space-y-4">
      <!-- Vínculo com CC do Sienge -->
      <div class="rounded-xl border p-3"
        :class="(row?.erp_id || linkPick) ? 'border-line' : 'border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20'">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-ink-subtle uppercase tracking-widest mb-1">
              <i class="fas fa-hashtag mr-1"></i>Centro de custo (Sienge)
            </p>
            <p v-if="linkPick" class="text-sm font-semibold text-accent truncate">
              CC {{ linkPick.id }} <span class="font-normal text-ink-muted">• {{ linkPick.name }}</span>
              <span class="ml-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">(aplica ao confirmar)</span>
            </p>
            <p v-else-if="row?.erp_id" class="text-sm font-semibold text-ink truncate">CC {{ row.erp_id }}</p>
            <p v-else class="text-sm font-medium text-amber-700 dark:text-amber-400">
              <i class="fas fa-triangle-exclamation text-xs mr-1"></i>Sem vínculo (manual)
            </p>
          </div>
          <Button size="sm" variant="ghost" :icon="linkOpen ? 'fas fa-chevron-up' : 'fas fa-link'" @click="openLinkPicker">
            {{ linkOpen ? 'Fechar' : (row?.erp_id || linkPick ? 'Trocar vínculo' : 'Vincular') }}
          </Button>
        </div>

        <div v-if="linkOpen" class="mt-3 space-y-2">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input v-model="linkSearch" placeholder="Buscar por nome ou código..." iconLeft="fas fa-magnifying-glass" />
            <MultiSelector v-model="linkCityFilter" :options="cityOptions" placeholder="Filtrar por cidade" overlay />
          </div>
          <div class="rounded-xl border border-line divide-y divide-line max-h-56 overflow-auto">
            <p v-if="!linkResults.length" class="p-5 text-center text-sm text-ink-subtle">
              Nenhum empreendimento encontrado.
            </p>
            <button v-for="e in linkResults" :key="e.id" type="button" @click="pickLink(e)"
              class="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-sunken transition-colors"
              :class="existingSet.has(String(e.id)) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'"
              :disabled="existingSet.has(String(e.id))">
              <div class="min-w-0 flex-1">
                <p class="text-sm text-ink truncate">{{ e.name }}</p>
                <p class="text-[11px] text-ink-subtle font-mono">
                  CC {{ e.id }}<span v-if="e.city"> • {{ e.city }}</span>
                </p>
              </div>
              <span v-if="existingSet.has(String(e.id))" class="text-[10px] text-ink-subtle shrink-0">já incluído</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Estoque atual (CV) -->
      <div v-if="isErpRow()" class="rounded-xl border border-line bg-surface-sunken p-3">
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-[10px] font-bold text-ink-subtle uppercase tracking-widest">
            <i class="fas fa-cubes mr-1"></i>Estoque atual no CV
          </span>
          <span v-if="stock" class="text-[11px] font-semibold text-ink-muted tabular-nums bg-surface-raised px-2 py-0.5 rounded-full border border-line">
            {{ stock.total }} unidades
          </span>
          <span v-else-if="edit.totalUnits" class="text-[11px] font-semibold text-ink-muted tabular-nums bg-surface-raised px-2 py-0.5 rounded-full border border-line">
            {{ edit.totalUnits }} unidades (manual)
          </span>
        </div>

        <template v-if="stock">
          <div class="h-3 w-full rounded-full bg-emerald-400 overflow-hidden flex"
            v-tippy="`Vendidos: ${stock.sold} · Reservados: ${stock.reserved} · Disponíveis: ${stock.available} · Bloqueados: ${stock.blocked}`">
            <div class="h-full bg-rose-500 transition-all duration-700" :style="{ width: stockPct(stock.sold) + '%' }" />
            <div class="h-full bg-amber-400 transition-all duration-700" :style="{ width: stockPct(stock.reserved) + '%' }" />
            <div class="h-full bg-slate-400 transition-all duration-700" :style="{ width: stockPct(stock.blocked) + '%' }" />
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3">
            <div class="text-center px-1 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
              <p class="text-[9px] text-rose-500 font-bold uppercase tracking-wide">Vendidos</p>
              <p class="text-base font-black text-rose-700 dark:text-rose-400 tabular-nums leading-none mt-0.5">{{ stock.sold }}</p>
              <p class="text-[9px] text-rose-400 tabular-nums">{{ stockPct(stock.sold) }}%</p>
            </div>
            <div class="text-center px-1 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
              <p class="text-[9px] text-amber-500 font-bold uppercase tracking-wide">Reservados</p>
              <p class="text-base font-black text-amber-700 dark:text-amber-400 tabular-nums leading-none mt-0.5">{{ stock.reserved }}</p>
              <p class="text-[9px] text-amber-400 tabular-nums">{{ stockPct(stock.reserved) }}%</p>
            </div>
            <div class="text-center px-1 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
              <p class="text-[9px] text-emerald-600 font-bold uppercase tracking-wide">Disponíveis</p>
              <p class="text-base font-black text-emerald-700 dark:text-emerald-400 tabular-nums leading-none mt-0.5">{{ stock.available }}</p>
              <p class="text-[9px] text-emerald-500 tabular-nums">{{ stockPct(stock.available) }}%</p>
            </div>
            <div class="text-center px-1 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
              <p class="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Bloqueados</p>
              <p class="text-base font-black text-slate-600 dark:text-slate-400 tabular-nums leading-none mt-0.5">{{ stock.blocked }}</p>
              <p class="text-[9px] text-slate-400 tabular-nums">{{ stockPct(stock.blocked) }}%</p>
            </div>
          </div>
        </template>
        <p v-else class="text-[11px] text-ink-subtle italic">
          Dados de estoque do CV indisponíveis para o CC {{ row?.erp_id }}.
          <template v-if="edit.totalUnits">Usando total manual de {{ edit.totalUnits }} unidades.</template>
          <template v-else>Informe o total manual abaixo; quando o CV trouxer as unidades, ele sobrepõe.</template>
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input v-model="edit.name" label="Nome"
          :hint="isErpRow() ? 'Apelido livre; o vínculo com o CC não muda' : ''" />
        <Input v-model="edit.city" label="Cidade" :disabled="isErpRow()"
          :hint="isErpRow() ? 'Cidade vem do Sienge' : ''" />
        <Input v-model.number="edit.defaultPrice" type="number" label="Ticket médio (R$)"
          hint="Usado no VGV de cada mês" />
        <Input v-if="!isErpRow() || !stock" v-model.number="edit.totalUnits" type="number" label="Total de unidades"
          :hint="isErpRow() ? 'Fallback enquanto o CV não trouxer o estoque; quando aparecer, ele sobrepõe' : ''" />
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
