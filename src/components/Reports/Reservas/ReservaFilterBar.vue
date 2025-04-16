<template>
    <section
        class="flex flex-wrap items-center h-auto justify-between p-4 rounded-xl shadow bg-gray-200 dark:bg-gray-700">
        <!-- Filtro por Data -->
        <div class="flex gap-4 text-xl">
            <input type="date" id="dataFiltro" v-model="dataFiltroInput" @change="onDataChange"
                class="px-2 py-1 border rounded-lg focus:outline-none bg-transparent border-gray-500 text-center" />
            <div class="select flex relative">
                <select v-model="selectedValue" @change="onSelectChange"
                    class="w-full py-2 px-3 border rounded-lg appearance-none focus:outline-none z-10 bg-transparent border-gray-500 text-center">
                    <option value="">Todos os Empreendimentos</option>
                    <option v-for="option in empreendimentosOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
                <i class="fas fa-chevron-down top-[28%] absolute right-3 inset-y-0 pointer-events-none"></i>
            </div>
            
            <div class="flex flex-col items-center relative"> 
                <select v-model="faturarInput"
                    class="w-full py-2 px-3 border rounded-lg appearance-none focus:outline-none z-10 bg-transparent border-gray-500 pe-10 text-center">
                    <option value="false">Em Processo</option>
                    <option value="true">Integradas Sienge</option>
                    <option value="ambas">Ambas</option>
                </select>
                <i class="fas fa-chevron-down top-[28%] absolute right-3 inset-y-0 pointer-events-none"></i>
            </div>
        </div>

        <!-- Botão para Aplicar Filtros -->
        <div>
            <button @click="onSearch"
                class="px-4 py-2 text-lg font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600 focus:outline-none">
                <i class="fas fa-filter"></i>
                Filtrar
            </button>
        </div>
    </section>
</template>

<script setup>
import { ref, computed } from 'vue';
import FilterToggle from '@/components/Reports/Reservas/FilterToggle.vue';

// Propriedades recebidas do componente pai
const props = defineProps({
    empreendimentos: {
        type: Array,
        required: true
    },
    initialDataFiltro: {
        type: String,
        default: ''
    },
    initialSelectedEmpreendimentos: {
        type: Array,
        default: () => []
    }
});

// Cálculo do valor padrão: primeiro dia do mês corrente
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const defaultDate = firstDayOfMonth.toISOString().slice(0, 10);

// Se a prop initialDataFiltro não for enviada, usa o default calculado
const dataFiltroInput = ref(props.initialDataFiltro || defaultDate);

const selectedValue = ref('');
const faturarInput = ref(false);

// Computa as opções de empreendimentos (mostrando o nome, mas com valor do id)
const empreendimentosOptions = computed(() =>
    props.empreendimentos.map(empreendimento => ({
        value: empreendimento.id,
        label: empreendimento.nome
    }))
);

// Emite a alteração do empreendimento selecionado.
// Neste caso, como a seleção é única, emitimos um array com o id ou array vazio.
const onSelectChange = () => {
    const empreendimentoSelecionado = selectedValue.value ? [selectedValue.value] : [];
    emit('update:selectedEmpreendimentos', empreendimentoSelecionado);
};

// Quando o campo data mudar, emite a nova data para o componente pai.
const onDataChange = () => {
    emit('update:dataFiltro', dataFiltroInput.value);
};

// Ao clicar no botão Filtrar, monta os filtros para a busca.
// Note que passamos a data usando o nome "a_partir_de" para que a store o interprete corretamente.
const onSearch = () => {
    const filters = {
        a_partir_de: dataFiltroInput.value,
        selectedEmpreendimentos: selectedValue.value ? [selectedValue.value] : [],
        faturar: faturarInput.value // já pode ser 'false', 'true' ou 'ambas'
    };
    emit('applyFilters', filters);
};

// Eventos emitidos para o componente pai
const emit = defineEmits([
    'applyFilters',
    'update:selectedEmpreendimentos',
    'update:dataFiltro'
]);
</script>
