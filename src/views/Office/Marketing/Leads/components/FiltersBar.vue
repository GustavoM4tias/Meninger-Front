<script setup>
import { computed, onMounted, ref } from 'vue';
import dayjs from 'dayjs';

import MultiSelector from '@/components/UI/MultiSelector.vue';
import Input from '@/components/UI/Input.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';

const props = defineProps({
  filtros: { type: Object, required: true },
  empreendimentosOptions: { type: Array, default: () => [] },
  origensOptions: { type: Array, default: () => [] },
  situacoesOptions: { type: Array, default: () => [] },
  midiasOptions: { type: Array, default: () => [] },
  imobiliariasOptions: { type: Array, default: () => [] },
  corretoresOptions: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:filtros', 'buscar', 'limpar']);

function updateField(key, val) {
  const next = { ...props.filtros, [key]: Array.isArray(val) ? [...val] : val };
  emit('update:filtros', next);
}

// ── Defaults de data (mês atual ATÉ HOJE) ────────────
// Mesmo default do PeriodPicker do topo da tela — antes este bar usava
// endOf('month') e a tela nascia com dois períodos diferentes.
const defaultStart = dayjs().startOf('month').format('YYYY-MM-DD');
const defaultEnd = dayjs().format('YYYY-MM-DD');

const dataInicio = computed({
  get: () => props.filtros.data_inicio || defaultStart,
  set: v => updateField('data_inicio', v || ''),
});
const dataFim = computed({
  get: () => props.filtros.data_fim || defaultEnd,
  set: v => updateField('data_fim', v || ''),
});

onMounted(() => {
  if (!props.filtros.data_inicio) updateField('data_inicio', defaultStart);
  if (!props.filtros.data_fim) updateField('data_fim', defaultEnd);
});

// ── Filtros ativos ───────────────────────────────────
const activeFiltersCount = computed(() => {
  const f = props.filtros || {};
  return Object.values(f).reduce((acc, v) => {
    if (Array.isArray(v)) return acc + (v.length > 0 ? 1 : 0);
    return acc + (v && String(v).trim() !== '' ? 1 : 0);
  }, 0);
});

const hasActiveFilters = computed(() => activeFiltersCount.value > 0);

// ── Expandir/recolher ────────────────────────────────
// No desktop: aberto por default. No mobile: recolhido.
const isExpanded = ref(window.innerWidth >= 1024);
function toggle() { isExpanded.value = !isExpanded.value; }
</script>

<template>
  <section class="rounded-xl border border-line bg-surface-raised shadow-soft surface-gradient">
    <!-- Toolbar header (sempre visível) -->
    <div class="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-line bg-surface-sunken/40 rounded-t-xl">
      <button @click="toggle"
        class="flex items-center gap-2 text-sm font-medium text-ink hover:text-accent transition-colors">
        <i class="fas fa-filter text-xs text-ink-muted"></i>
        <span>Filtros</span>
        <Badge v-if="hasActiveFilters" variant="accent" size="sm">{{ activeFiltersCount }} ativo{{ activeFiltersCount > 1 ? 's' : '' }}</Badge>
        <i class="fas fa-chevron-down text-[10px] text-ink-subtle transition-transform duration-200"
          :class="{ 'rotate-180': isExpanded }"></i>
      </button>

      <div class="ml-auto flex items-center gap-1.5">
        <slot name="extra-actions" />
        <Button variant="ghost" size="sm" icon="fas fa-eraser" @click="$emit('limpar')">
          <span class="hidden sm:inline">Limpar</span>
        </Button>
        <Button size="sm" icon="fas fa-magnifying-glass" @click="$emit('buscar')">
          <span class="hidden sm:inline">Buscar</span>
        </Button>
      </div>
    </div>

    <!-- Campos: simple v-show para não cortar o dropdown do MultiSelector -->
    <div v-show="isExpanded"
      class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in"
      style="overflow: visible;">

        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-city text-[10px] mr-1 text-ink-subtle"></i>Empreendimento(s)
          </label>
          <MultiSelector :model-value="filtros.empreendimento"
            @update:modelValue="v => updateField('empreendimento', v)"
            :options="empreendimentosOptions" placeholder="Selecione..." :page-size="150" />
        </div>

        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-building text-[10px] mr-1 text-ink-subtle"></i>Imobiliária
          </label>
          <MultiSelector :model-value="filtros.imobiliaria"
            @update:modelValue="v => updateField('imobiliaria', v)"
            :options="imobiliariasOptions" placeholder="Selecione..." :page-size="150" />
        </div>

        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-user-tie text-[10px] mr-1 text-ink-subtle"></i>Corretor
          </label>
          <MultiSelector :model-value="filtros.corretor"
            @update:modelValue="v => updateField('corretor', v)"
            :options="corretoresOptions" placeholder="Selecione..." :page-size="150" />
        </div>

        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-bullhorn text-[10px] mr-1 text-ink-subtle"></i>Mídia Principal
          </label>
          <MultiSelector :model-value="filtros.midia_principal"
            @update:modelValue="v => updateField('midia_principal', v)"
            :options="midiasOptions" placeholder="Selecione..." :page-size="150" />
        </div>

        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-chart-pie text-[10px] mr-1 text-ink-subtle"></i>Situação
          </label>
          <MultiSelector :model-value="filtros.situacao_nome"
            @update:modelValue="v => updateField('situacao_nome', v)"
            :options="situacoesOptions" placeholder="Selecione..." :page-size="150" />
        </div>

        <div>
          <label class="block text-[11px] font-medium text-ink-muted mb-1.5">
            <i class="fas fa-compass text-[10px] mr-1 text-ink-subtle"></i>Origem
          </label>
          <MultiSelector :model-value="filtros.origem"
            @update:modelValue="v => updateField('origem', v)"
            :options="origensOptions" placeholder="Selecione..." :page-size="150" />
        </div>

        <Input v-model="dataInicio" type="date" label="Data início" />
        <Input v-model="dataFim" type="date" label="Data fim" />
    </div>
  </section>
</template>
