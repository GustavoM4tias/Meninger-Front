<template>
    <div class="flex flex-wrap items-center gap-2">
        <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <i class="fas fa-chevron-down"></i>
            </div>
            <select v-model="selectedEmpreendimento" @change="onEmpreendimentoChange"
                class="block w-full pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md appearance-none">
                <option value="">Todos os Empreendimentos</option>
                <option v-for="empreendimento in empreendimentos" :key="empreendimento" :value="empreendimento">
                    {{ empreendimento }}
                </option>
            </select>
        </div>
        <button @click="onToggleAll"
            class="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md transition-colors duration-150 shadow-sm">
            <i v-if="allExpanded" class="fas fa-chevron-up w-4 h-4"></i>
            <i v-else class="fas fa-chevron-down w-4 h-4"></i>
            {{ allExpanded ? 'Recolher Todos' : 'Expandir Todos' }}
        </button>
        <!-- Checkboxes com estilo moderno -->
        <div class="flex flex-wrap items-center gap-4">
            <filter-toggle id="mostrarCancelados" v-model="filtros.mostrarCancelados" @change="onFiltersChange"
                label="Mostrar Cancelados" />
            <filter-toggle id="mostrarDistratos" v-model="filtros.mostrarDistratos" @change="onFiltersChange"
                label="Mostrar Distratos" />
            <filter-toggle id="mostrarCessoes" v-model="filtros.mostrarCessoes" @change="onFiltersChange"
                label="Mostrar Cessões" />
        </div>
    </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import FilterToggle from '@/components/Reports/Repasses/FilterToggle.vue';

const props = defineProps({
    initialSelectedEmpreendimento: {
        type: String,
        default: ''
    },
    initialAllExpanded: {
        type: Boolean,
        default: false
    },
    initialFiltros: {
        type: Object,
        default: () => ({
            mostrarCancelados: false,
            mostrarDistratos: false,
            mostrarCessoes: false
        })
    },
    empreendimentos: {
        type: Array,
        required: true
    }
});

const emit = defineEmits([
    'update:empreendimento',
    'update:allExpanded',
    'update:filtros'
]);

const selectedEmpreendimento = ref(props.initialSelectedEmpreendimento);
const allExpanded = ref(props.initialAllExpanded);
const filtros = reactive({
    mostrarCancelados: props.initialFiltros.mostrarCancelados,
    mostrarDistratos: props.initialFiltros.mostrarDistratos,
    mostrarCessoes: props.initialFiltros.mostrarCessoes
});

const onEmpreendimentoChange = () => {
    emit('update:empreendimento', selectedEmpreendimento.value);
};

const onToggleAll = () => {
    allExpanded.value = !allExpanded.value;
    emit('update:allExpanded', allExpanded.value);
};

const onFiltersChange = () => {
    emit('update:filtros', {
        mostrarCancelados: filtros.mostrarCancelados,
        mostrarDistratos: filtros.mostrarDistratos,
        mostrarCessoes: filtros.mostrarCessoes
    });
};
</script>