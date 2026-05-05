<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import dayjs from 'dayjs';

import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
  filtros: { type: Object, required: true },
  situacoesOptions: { type: Array, default: () => [] },
  imobiliariasOptions: { type: Array, default: () => [] },
  corretoresOptions: { type: Array, default: () => [] },
  correspondentesOptions: { type: Array, default: () => [] },
  empresasCorrespondentesOptions: { type: Array, default: () => [] },
  enterprisesOptions: { type: Array, default: () => [] },
  leadOrigensOptions: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:filtros', 'buscar', 'limpar']);

// ── Locais ────────────────────────────────────────────
const initDate = (d) => d ? dayjs(d).format('YYYY-MM-DD') : '';
const localStart = ref(initDate(props.filtros.data_inicio) || dayjs().startOf('month').format('YYYY-MM-DD'));
const localEnd = ref(initDate(props.filtros.data_fim) || dayjs().endOf('month').format('YYYY-MM-DD'));

const localEnterprises = ref([...(props.filtros.empreendimento || [])]);
const localBanks = ref([...(props.filtros.empresa_correspondente || [])]);
const localStages = ref([...(props.filtros.situacao_nome || [])]);
const localImobs = ref([...(props.filtros.imobiliaria || [])]);
const localCorretores = ref([...(props.filtros.corretor || [])]);
const localCorresps = ref([...(props.filtros.correspondente || [])]);
const localLeadOrigens = ref([...(props.filtros.lead_origem || [])]);
const localOnlyActive = ref(!!props.filtros.only_active);
const localExcluirPainel = ref(!!props.filtros.excluir_painel);
const localNome = ref(props.filtros.nome || '');
const localDoc = ref(props.filtros.documento || '');

watch(() => props.filtros, (f) => {
  localStart.value = initDate(f.data_inicio) || dayjs().startOf('month').format('YYYY-MM-DD');
  localEnd.value = initDate(f.data_fim) || dayjs().endOf('month').format('YYYY-MM-DD');
  localEnterprises.value = [...(f.empreendimento || [])];
  localBanks.value = [...(f.empresa_correspondente || [])];
  localStages.value = [...(f.situacao_nome || [])];
  localImobs.value = [...(f.imobiliaria || [])];
  localCorretores.value = [...(f.corretor || [])];
  localCorresps.value = [...(f.correspondente || [])];
  localLeadOrigens.value = [...(f.lead_origem || [])];
  localOnlyActive.value = !!f.only_active;
  localExcluirPainel.value = !!f.excluir_painel;
  localNome.value = f.nome || '';
  localDoc.value = f.documento || '';
}, { deep: true });

const isValid = computed(() =>
  !!localStart.value && !!localEnd.value && localStart.value <= localEnd.value
);

// ── Filtros ativos ───────────────────────────────────
const activeFiltersCount = computed(() => {
  let n = 0;
  if (localEnterprises.value.length) n++;
  if (localStages.value.length) n++;
  if (localBanks.value.length) n++;
  if (localCorresps.value.length) n++;
  if (localImobs.value.length) n++;
  if (localCorretores.value.length) n++;
  if (localLeadOrigens.value.length) n++;
  if (localNome.value.trim()) n++;
  if (localDoc.value.trim()) n++;
  if (localOnlyActive.value) n++;
  if (localExcluirPainel.value) n++;
  return n;
});

const hasActiveFilters = computed(() => activeFiltersCount.value > 0);

// ── Expandir/recolher ────────────────────────────────
const isExpanded = ref(typeof window !== 'undefined' && window.innerWidth >= 1024);
function toggle() { isExpanded.value = !isExpanded.value; }

// ── Apply / Clear ────────────────────────────────────
function applyFilters() {
  if (!isValid.value) return;
  emit('update:filtros', {
    ...props.filtros,
    data_inicio: localStart.value,
    data_fim: localEnd.value,
    empresa: [],
    empreendimento: [...localEnterprises.value],
    empresa_correspondente: [...localBanks.value],
    situacao_nome: [...localStages.value],
    imobiliaria: [...localImobs.value],
    corretor: [...localCorretores.value],
    correspondente: [...localCorresps.value],
    lead_origem: [...localLeadOrigens.value],
    only_active: localOnlyActive.value,
    excluir_painel: localExcluirPainel.value,
    nome: localNome.value,
    documento: localDoc.value,
  });
  emit('buscar');
}

function clearFilters() {
  localStart.value = dayjs().startOf('month').format('YYYY-MM-DD');
  localEnd.value = dayjs().endOf('month').format('YYYY-MM-DD');
  localEnterprises.value = [];
  localBanks.value = [];
  localStages.value = [];
  localImobs.value = [];
  localCorretores.value = [];
  localCorresps.value = [];
  localLeadOrigens.value = [];
  localOnlyActive.value = false;
  localExcluirPainel.value = false;
  localNome.value = '';
  localDoc.value = '';
  emit('limpar');
}

onMounted(() => {
  if (!props.filtros.data_inicio) localStart.value = dayjs().startOf('month').format('YYYY-MM-DD');
  if (!props.filtros.data_fim) localEnd.value = dayjs().endOf('month').format('YYYY-MM-DD');
});
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
    <!-- Toolbar -->
    <div class="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-line bg-surface-sunken/40 rounded-t-xl">
      <button @click="toggle"
        class="flex items-center gap-2 text-sm font-medium text-ink hover:text-accent transition-colors">
        <i class="fas fa-filter text-xs text-ink-muted"></i>
        <span>Filtros</span>
        <Badge v-if="hasActiveFilters" variant="accent" size="sm">
          {{ activeFiltersCount }} ativo{{ activeFiltersCount > 1 ? 's' : '' }}
        </Badge>
        <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"></i>
      </button>

      <div class="ml-auto flex items-center gap-1.5">
        <slot name="extra-actions" />
        <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="clearFilters">
          <span class="hidden sm:inline">Limpar</span>
        </Button>
        <Button size="sm" icon="fas fa-magnifying-glass" :disabled="!isValid" @click="applyFilters">
          <span class="hidden sm:inline">Buscar</span>
        </Button>
      </div>
    </div>

    <!-- Campos -->
    <div v-show="isExpanded" class="p-3 sm:p-4 animate-fade-in space-y-3" style="overflow:visible">

      <!-- Datas + Cliente/CPF (linha 1) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input v-model="localStart" type="date" label="Data início" />
        <Input v-model="localEnd" type="date" label="Data fim" />
        <Input v-model="localNome" label="Nome" placeholder="Nome do cliente" iconLeft="fas fa-user" />
        <Input v-model="localDoc" label="Documento" placeholder="CPF / CNPJ" iconLeft="fas fa-id-card" />
      </div>

      <!-- Linha 2: Empreendimento, Etapa, Empresa Corresp., Correspondente -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-building text-[10px] mr-1 text-ink-subtle"></i>Empreendimento(s)
          </label>
          <MultiSelector :model-value="localEnterprises"
            @update:modelValue="v => localEnterprises = Array.isArray(v) ? v : []"
            :options="enterprisesOptions" placeholder="Selecione..." :page-size="200" :select-all="true" />
        </div>
        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-list-check text-[10px] mr-1 text-ink-subtle"></i>Etapa
          </label>
          <MultiSelector :model-value="localStages"
            @update:modelValue="v => localStages = Array.isArray(v) ? v : []"
            :options="situacoesOptions" placeholder="Selecione..." :page-size="150" :select-all="true" />
        </div>
        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>Empresa correspondente
          </label>
          <MultiSelector :model-value="localBanks"
            @update:modelValue="v => localBanks = Array.isArray(v) ? v : []"
            :options="empresasCorrespondentesOptions" placeholder="Selecione..." :page-size="150" :select-all="true" />
        </div>
        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-user-tag text-[10px] mr-1 text-ink-subtle"></i>Correspondente (usuário)
          </label>
          <MultiSelector :model-value="localCorresps"
            @update:modelValue="v => localCorresps = Array.isArray(v) ? v : []"
            :options="correspondentesOptions" placeholder="Selecione..." :page-size="150" :select-all="true" />
        </div>
      </div>

      <!-- Linha 3: Imobiliária, Corretor, Origem, Toggles -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-store text-[10px] mr-1 text-ink-subtle"></i>Imobiliária
          </label>
          <MultiSelector :model-value="localImobs"
            @update:modelValue="v => localImobs = Array.isArray(v) ? v : []"
            :options="imobiliariasOptions" placeholder="Selecione..." :page-size="150" :select-all="true" />
        </div>
        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-user-tie text-[10px] mr-1 text-ink-subtle"></i>Corretor
          </label>
          <MultiSelector :model-value="localCorretores"
            @update:modelValue="v => localCorretores = Array.isArray(v) ? v : []"
            :options="corretoresOptions" placeholder="Selecione..." :page-size="150" :select-all="true" />
        </div>
        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-compass text-[10px] mr-1 text-ink-subtle"></i>Origem do lead
          </label>
          <MultiSelector :model-value="localLeadOrigens"
            @update:modelValue="v => localLeadOrigens = Array.isArray(v) ? v : []"
            :options="leadOrigensOptions" placeholder="Selecione..." :page-size="150" :select-all="true" />
        </div>

        <!-- Toggles -->
        <div class="flex flex-col gap-2 sm:pt-6">
          <label class="inline-flex items-center gap-2 text-xs cursor-pointer text-ink-muted hover:text-ink transition">
            <input type="checkbox" v-model="localOnlyActive"
              class="rounded border-line accent-accent" />
            <span>Em análise (em curso)</span>
          </label>
          <label v-tippy="'Mostra só pré-cadastros cujo lead NÃO veio de Painel — ou seja, leads externos.'"
            class="inline-flex items-center gap-2 text-xs cursor-pointer text-ink-muted hover:text-ink transition">
            <input type="checkbox" v-model="localExcluirPainel"
              class="rounded border-line accent-accent" />
            <span>Excluir leads de painel</span>
          </label>
        </div>
      </div>
    </div>
  </section>
</template>
