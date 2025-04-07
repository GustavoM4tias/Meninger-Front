<template>
    <section class="flex flex-wrap items-center gap-2">
        <!-- Select nativo para escolher um empreendimento por vez -->
        <div class="search flex gap-2">
            <div class="relative">
                <select v-model="selectedValue" @change="onSelectChange"
                    class="py-3 px-2 border text-md md:text-lg text-gray-700 dark:text-gray-300 dark:bg-gray-500 border-gray-100 dark:border-gray-600 rounded-lg focus:outline-none shadow-sm w-full appearance-none">
                    <option disabled value="">Todos os Empreendimentos</option>
                    <option v-for="option in empreendimentosOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center pe-3 pointer-events-none">
                    <i class="fas fa-chevron-down"></i>
                </div>
            </div>
            <!-- Botão para aplicar o filtro -->
            <button @click="onSearch"
                class="flex items-center py-4 px-4 text-lg md:text-xl border border-gray-400 rounded-md bg-gray-900/5 hover:bg-gray-900/10 cursor-pointer">
                <i class="fas fa-magnifying-glass"></i>
            </button>
        </div>
        <div class="filters flex gap-2">
            <!-- Botão para expandir/recolher -->
            <button @click="onToggleAll"
                class="flex items-center py-4 px-3.5 text-lg md:text-xl border border-gray-400 rounded-md bg-gray-900/5 hover:bg-gray-900/10 cursor-pointer">
                <i v-if="allExpanded" class="fas fa-eye"></i>
                <i v-else class="fas fa-eye-slash"></i>
                <!-- {{ allExpanded ? 'Recolher Todos' : 'Expandir Todos' }} -->
            </button>

            <!-- Checkboxes dos filtros -->
            <div class="flex flex-col gap-0.5">
                <filter-toggle id="mostrarCancelados" v-model="filtros.mostrarCancelados" label="Mostrar Cancelados"
                    @change="onFiltersChange" />
                <filter-toggle id="mostrarDistratos" v-model="filtros.mostrarDistratos" label="Mostrar Distratos"
                    @change="onFiltersChange" />
                <filter-toggle id="mostrarCessoes" v-model="filtros.mostrarCessoes" label="Mostrar Cessões"
                    @change="onFiltersChange" />
            </div>
            <!-- Container com scroll horizontal para os chips -->
            <div v-if="selectedEmpreendimento.length > 0"
                class="overflow-y-auto overflow-x-hidden flex-1 bg-gray-400 rounded-lg p-1 max-w-48 max-h-14">
                <div class="flex flex-wrap gap-[2px] whitespace-nowrap">
                    <div @click="removeItem(index)" v-for="(item, index) in selectedEmpreendimento" :key="index"
                        class="flex items-center bg-gray-100 dark:bg-gray-500 text-[10px] dark:text-gray-200 px-2 py-1 rounded-lg cursor-pointer truncate">
                        <i class="mr-1 fas fa-xmark mt-0.5"></i>
                        <span>{{ item }}</span>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import FilterToggle from '@/components/Reports/Repasses/FilterToggle.vue';

const props = defineProps({
    initialSelectedEmpreendimento: {
        type: Array,
        default: () => []
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

// Guarda os empreendimentos selecionados em um array
const selectedEmpreendimento = ref([...props.initialSelectedEmpreendimento]);
// Valor temporário para o select
const selectedValue = ref("");

// Estado do botão de expandir/recolher e dos filtros
const allExpanded = ref(props.initialAllExpanded);
const filtros = reactive({
    mostrarCancelados: props.initialFiltros.mostrarCancelados,
    mostrarDistratos: props.initialFiltros.mostrarDistratos,
    mostrarCessoes: props.initialFiltros.mostrarCessoes
});

// Gera as opções para o select a partir do array recebido
const empreendimentosOptions = computed(() =>
    props.empreendimentos.map(empreendimento => ({
        value: empreendimento,
        label: empreendimento
    }))
);

// Quando o usuário seleciona um empreendimento, adiciona-o à lista se não estiver duplicado
const onSelectChange = () => {
    if (selectedValue.value && !selectedEmpreendimento.value.includes(selectedValue.value)) {
        selectedEmpreendimento.value.push(selectedValue.value);
    }
    // Reseta o select para permitir nova seleção
    selectedValue.value = "";
};

// Remove um item da lista de selecionados
const removeItem = (index) => {
    selectedEmpreendimento.value.splice(index, 1);
};

// Emite o array de selecionados para o componente pai
const onSearch = () => {
    emit('update:empreendimento', selectedEmpreendimento.value);
};

// Alterna o estado de expansão e emite o evento para o pai
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