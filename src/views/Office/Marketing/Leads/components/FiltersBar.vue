<script setup>
import { computed, onMounted } from 'vue';
import MultiSelector from '@/components/UI/MultiSelector.vue';
import dayjs from 'dayjs';

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

/* -------------------- NOVO: defaults de data -------------------- */
const defaultStart = dayjs().startOf('month').format('YYYY-MM-DD');
const defaultEnd = dayjs().endOf('month').format('YYYY-MM-DD');

/* proxies v-model -> usam default quando estiver vazio */
const dataInicio = computed({
    get: () => props.filtros.data_inicio || defaultStart,
    set: v => updateField('data_inicio', v || '')
});
const dataFim = computed({
    get: () => props.filtros.data_fim || defaultEnd,
    set: v => updateField('data_fim', v || '')
});

/* seta os defaults na 1ª carga, caso venham vazios */
onMounted(() => {
    if (!props.filtros.data_inicio) updateField('data_inicio', defaultStart);
    if (!props.filtros.data_fim) updateField('data_fim', defaultEnd);
});
/* --------------------------------------------------------------- */

const hasActiveFilters = computed(() => {
    const f = props.filtros || {};
    return Object.entries(f).some(([k, v]) => Array.isArray(v) ? v.length > 0 : (v && String(v).trim() !== ''));
});
const activeFiltersCount = computed(() => {
    const f = props.filtros || {};
    return Object.values(f).reduce((acc, v) => acc + (Array.isArray(v) ? (v.length > 0) : (v && String(v).trim() !== '') ? 1 : 0), 0);
});
</script>

<template>
    <div class="p-4 rounded-lg shadow bg-white dark:bg-gray-800">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
            <!-- Empreendimento(s) -->
            <div>
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-city mr-1"></i>Empreendimento(s)
                </label>
                <MultiSelector :model-value="filtros.empreendimento"
                    @update:modelValue="v => updateField('empreendimento', v)" :options="empreendimentosOptions"
                    placeholder="Selecione..." :page-size="150" :select-all="true" />
            </div>

            <!-- Imobiliária -->
            <div>
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-building mr-1"></i>Imobiliária
                </label>
                <MultiSelector :model-value="filtros.imobiliaria"
                    @update:modelValue="v => updateField('imobiliaria', v)" :options="imobiliariasOptions"
                    placeholder="Selecione imobiliária..." :page-size="150" :select-all="true" />
            </div>

            <!-- Corretor -->
            <div>
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-user-tie mr-1"></i>Corretor
                </label>
                <MultiSelector :model-value="filtros.corretor" @update:modelValue="v => updateField('corretor', v)"
                    :options="corretoresOptions" placeholder="Selecione corretor..." :page-size="150"
                    :select-all="true" />
            </div>

            <!-- Mídia Principal -->
            <div>
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-bullhorn mr-1"></i>Mídia Principal
                </label>
                <MultiSelector :model-value="filtros.midia_principal"
                    @update:modelValue="v => updateField('midia_principal', v)" :options="midiasOptions"
                    placeholder="Selecione mídia..." :page-size="150" :select-all="true" />
            </div>

            <!-- Situação -->
            <div>
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-chart-pie mr-1"></i>Situação
                </label>
                <MultiSelector :model-value="filtros.situacao_nome"
                    @update:modelValue="v => updateField('situacao_nome', v)" :options="situacoesOptions"
                    placeholder="Selecione situação..." :page-size="150" :select-all="true" />
            </div>

            <!-- Origem -->
            <div>
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-compass mr-1"></i>Origem
                </label>
                <MultiSelector :model-value="filtros.origem" @update:modelValue="v => updateField('origem', v)"
                    :options="origensOptions" placeholder="Selecione origem..." :page-size="150" :select-all="true" />
            </div>

            <!-- Data Início -->
            <div>
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-calendar-day mr-1"></i>Data Início
                </label>
                <!-- usa proxy computed (c/ default do mês) -->
                <input v-model="dataInicio" type="date"
                    class="w-full px-2 py-[.7rem] border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-600 dark:bg-gray-900/60 text-center" />
            </div>

            <!-- Data Fim -->
            <div>
                <label class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    <i class="fas fa-calendar-check mr-1"></i>Data Fim
                </label>
                <!-- usa proxy computed (c/ default do mês) -->
                <input v-model="dataFim" type="date"
                    class="w-full px-2 py-[.7rem] border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-600 dark:bg-gray-900/60 text-center" />
            </div>
        </div>

        <div class="flex gap-2 justify-end">

            <div v-if="hasActiveFilters" class="p-3 w-full bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div class="flex items-center gap-2 text-sm">
                    <i class="fas fa-info-circle text-blue-600 dark:text-blue-400"></i>
                    <span class="text-blue-800 dark:text-blue-200 font-medium">
                        {{ activeFiltersCount }} filtro(s) ativo(s)
                    </span>
                </div>
            </div>

            <button @click="$emit('limpar')"
                class="px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <i class="fas fa-eraser"></i> Limpar
            </button>
            <button @click="$emit('buscar')" 
                class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <i class="fas fa-search"></i>
                Buscar
            </button>
        </div>

    </div>
</template>
