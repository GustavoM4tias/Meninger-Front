<template>
    <section
        class="flex items-center h-auto justify-between p-4 rounded-xl shadow bg-gray-200 dark:bg-gray-700">
        <!-- Filtro por Data -->
        <div class="flex gap-4">
            <div class="flex items-center gap-2">
                <input type="date" id="dataFiltroInicio" v-model="dataFiltroInput" @change="onDataChange"
                    class="px-1 py-2.5 border rounded-lg focus:outline-none bg-transparent border-gray-500 text-center" />
                <span class="text-sm">até</span>
                <input type="date" id="dataFiltroFim" v-model="dataFiltroFimInput" @change="onDataFimChange"
                    class="px-1 py-2.5 border rounded-lg focus:outline-none bg-transparent border-gray-500 text-center" />
            </div>

            <!-- Dropdown para selecionar empreendimentos -->
            <div class="select flex relative">
                <select v-model="currentEmpreendimento" @change="addEmpreendimento"
                    class="w-full py-2 px-1 border rounded-lg appearance-none focus:outline-none z-10 bg-transparent border-gray-500 pe-4 text-center">
                    <option value="">Selecionar Empreendimentos</option>
                    <option class="text-gray-800" v-for="option in availableEmpreendimentos" :key="option.value" :value="option.value">
                        {{ option.label }}
                    </option>
                </select>
                <i class="fas fa-chevron-down top-[32%] absolute right-3 inset-y-0 pointer-events-none"></i>
            </div>

            <div class="flex flex-col items-center relative">
                <select v-model="faturarInput"
                    class="w-full py-2.5 px-3 border rounded-lg appearance-none focus:outline-none z-10 bg-transparent border-gray-500 pe-10 text-center">
                    <option class="text-gray-800" value="false">Em Processo</option>
                    <option class="text-gray-800" value="true">Integradas Sienge</option>
                    <option class="text-gray-800" value="ambas">Ambas</option>
                </select>
                <i class="fas fa-chevron-down top-[32%] absolute right-3 inset-y-0 pointer-events-none"></i>
            </div>

            <div v-if="selectedEmpreendimentos.length > 0" class="bg-gray-300 dark:bg-gray-800 w-[20%] h-12 overflow-hidden overflow-y-auto rounded-lg text-xs">
                <!-- Tags de Empreendimentos Selecionados -->
                <div class="flex flex-wrap gap-1 my-2 px-2 truncate">
                    <div v-for="id in selectedEmpreendimentos" :key="id"
                        class="flex items-center bg-gray-50 dark:bg-blue-800 text-gray-800 dark:text-gray-50 font-semibold px-3 py-1 rounded-full max-w-full">
                        <span class="truncate">{{ getEmpreendimentoName(id) }}</span>
                        <button @click="removeEmpreendimento(id)"
                            class="ml-2 text-gray-800 hover:text-gray-900 dark:text-gray-100 dark:hover:text-gray-50">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            </div> 
        </div>

        <!-- Botão para Aplicar Filtros -->
        <div>
            <button @click="onSearch"
                class="flex px-4 py-2 text-lg font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600 focus:outline-none">
                <i class="fas fa-filter pe-1 my-auto"></i>
                Filtrar
            </button>
        </div>
    </section>

</template>

<script setup>
import { ref, computed, watch } from 'vue';

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
    initialDataFiltroFim: {
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
const defaultEndDate = today.toISOString().slice(0, 10); // Data atual como data final padrão

// Se a prop initialDataFiltro não for enviada, usa o default calculado
const dataFiltroInput = ref(props.initialDataFiltro || defaultDate);
const dataFiltroFimInput = ref(props.initialDataFiltroFim || defaultEndDate);

// Inicializa com array vazio para suportar múltiplas seleções
const selectedEmpreendimentos = ref(props.initialSelectedEmpreendimentos || []);
const currentEmpreendimento = ref(''); // Para o dropdown atual
const faturarInput = ref("false");

// Computa as opções de empreendimentos (mostrando o nome, mas com valor do id)
const empreendimentosOptions = computed(() =>
    props.empreendimentos.map(empreendimento => ({
        value: empreendimento.id,
        label: empreendimento.nome
    }))
);

// Filtra os empreendimentos disponíveis para não mostrar os já selecionados
const availableEmpreendimentos = computed(() => {
    return empreendimentosOptions.value.filter(
        option => !selectedEmpreendimentos.value.includes(option.value.toString())
    );
});

// Função para adicionar um empreendimento à lista de selecionados
const addEmpreendimento = () => {
    if (currentEmpreendimento.value && !selectedEmpreendimentos.value.includes(currentEmpreendimento.value)) {
        selectedEmpreendimentos.value.push(currentEmpreendimento.value);
        emit('update:selectedEmpreendimentos', selectedEmpreendimentos.value);
        currentEmpreendimento.value = ''; // Limpa a seleção atual
    }
};

// Função para remover um empreendimento da lista de selecionados
const removeEmpreendimento = (id) => {
    selectedEmpreendimentos.value = selectedEmpreendimentos.value.filter(emp => emp !== id);
    emit('update:selectedEmpreendimentos', selectedEmpreendimentos.value);
};

// Função para obter o nome do empreendimento a partir do ID
const getEmpreendimentoName = (id) => {
    const empreendimento = props.empreendimentos.find(emp => emp.id.toString() === id.toString());
    return empreendimento ? empreendimento.nome : `ID: ${id}`;
};

// Observa mudanças na seleção de empreendimentos e emite para o componente pai
watch(selectedEmpreendimentos, (newValue) => {
    emit('update:selectedEmpreendimentos', newValue);
});

// Quando o campo data mudar, emite a nova data para o componente pai.
const onDataChange = () => {
    emit('update:dataFiltro', dataFiltroInput.value);
};

// Quando o campo data fim mudar, emite a nova data para o componente pai.
const onDataFimChange = () => {
    emit('update:dataFiltroFim', dataFiltroFimInput.value);
};

// Ao clicar no botão Filtrar, monta os filtros para a busca.
const onSearch = () => {
    const filters = {
        a_partir_de: dataFiltroInput.value,
        ate: dataFiltroFimInput.value,
        selectedEmpreendimentos: selectedEmpreendimentos.value,
        faturar: faturarInput.value
    };
    emit('applyFilters', filters);
};

// Eventos emitidos para o componente pai
const emit = defineEmits([
    'applyFilters',
    'update:selectedEmpreendimentos',
    'update:dataFiltro',
    'update:dataFiltroFim'
]);
</script>