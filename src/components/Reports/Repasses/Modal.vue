<template>
    <div class="absolute top-0 right-0"> 
        <i @click="openModal" v-tippy="`Tabela Mensal`" class="fas fa-table text-white px-4 py-3 text-3xl cursor-pointer"></i>

        <!-- Modal de Repasses Mensais -->
        <div v-if="isModalOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-11/12 max-w-6xl max-h-[90vh] flex flex-col">
                <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 class="text-xl font-bold">Repasses Finalizados por Mês</h2>
                    <button @click="closeModal" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div class="p-4 overflow-auto">
                    <div class="overflow-x-auto">
                        <table class="min-w-full border-collapse">
                            <thead>
                                <tr class="bg-gray-100 dark:bg-gray-700">
                                    <th
                                        class="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 sticky left-0 z-10">
                                        Empreendimento</th>
                                    <th v-for="(month, index) in months" :key="index" colspan="2"
                                        class="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700">
                                        {{ month }}
                                    </th>
                                    <th colspan="2"
                                        class="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700">
                                        Total</th>
                                </tr>
                                <tr>
                                    <th
                                        class="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 sticky left-0 z-10">
                                    </th>
                                    <template v-for="(month, index) in months" :key="`sub-${index}`">
                                        <th
                                            class="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-sm">
                                            Qtd</th>
                                        <th
                                            class="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-sm">
                                            Valor (R$)</th>
                                    </template>
                                    <th
                                        class="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-sm">
                                        Qtd</th>
                                    <th
                                        class="border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-700 text-sm">
                                        Valor (R$)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr class="bg-gray-100 dark:bg-gray-800" v-for="(empreendimento, empIndex) in empreendimentosData" :key="empIndex">
                                    <td
                                        class="border border-gray-300 dark:border-gray-600 p-2 font-medium bg-gray-50 dark:bg-gray-800 sticky left-0 z-10">
                                        {{ empreendimento.nome }}
                                    </td>
                                    <template v-for="(month, monthIndex) in months"
                                        :key="`data-${empIndex}-${monthIndex}`">
                                        <td class="border border-gray-300 dark:border-gray-600 p-2 text-center">
                                            {{ empreendimento.dados[monthIndex]?.quantidade || 0 }}
                                        </td>
                                        <td class="border border-gray-300 dark:border-gray-600 p-2 text-right">
                                            {{ formatMoney(empreendimento.dados[monthIndex]?.valor || 0) }}
                                        </td>
                                    </template>
                                    <td
                                        class="border border-gray-300 dark:border-gray-600 p-2 text-center font-bold bg-gray-50 dark:bg-gray-800">
                                        {{ empreendimento.totalQuantidade }}
                                    </td>
                                    <td
                                        class="border border-gray-300 dark:border-gray-600 p-2 text-right font-bold bg-gray-50 dark:bg-gray-800">
                                        {{ formatMoney(empreendimento.totalValor) }}
                                    </td>
                                </tr>
                                <tr class="bg-gray-100 dark:bg-gray-700">
                                    <td
                                        class="border border-gray-300 dark:border-gray-600 p-2 font-bold sticky left-0 z-10">
                                        Total Mensal</td>
                                    <template v-for="(total, index) in monthlyTotals" :key="`total-${index}`">
                                        <td
                                            class="border border-gray-300 dark:border-gray-600 p-2 text-center font-bold">
                                            {{ total.quantidade }}
                                        </td>
                                        <td
                                            class="border border-gray-300 dark:border-gray-600 p-2 text-right font-bold">
                                            {{ formatMoney(total.valor) }}
                                        </td>
                                    </template>
                                    <td class="border border-gray-300 dark:border-gray-600 p-2 text-center font-bold">
                                        {{ grandTotal.quantidade }}
                                    </td>
                                    <td class="border border-gray-300 dark:border-gray-600 p-2 text-right font-bold">
                                        {{ formatMoney(grandTotal.valor) }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button @click="closeModal"
                        class="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRepassesStore } from '@/stores/Reports/Repasses/repassesStore';

// Store
const store = useRepassesStore();

// Estado do modal
const isModalOpen = ref(false);

// Meses do ano
const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Dados processados
const empreendimentosData = ref([]);
const monthlyTotals = ref([]);
const grandTotal = ref({ quantidade: 0, valor: 0 });

// Função para formatar valor monetário
const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value || 0);
};

// Função para abrir o modal e processar os dados
const openModal = () => {
    processarDados();
    isModalOpen.value = true;
};

// Função para fechar o modal
const closeModal = () => {
    isModalOpen.value = false;
};

// Função para processar os dados dos repasses
const processarDados = () => {
    // Resetar dados
    empreendimentosData.value = [];
    monthlyTotals.value = Array(12).fill().map(() => ({ quantidade: 0, valor: 0 }));
    grandTotal.value = { quantidade: 0, valor: 0 };

    // Mapear empreendimentos
    const empreendimentosMap = {};

    // Inicializar mapa de empreendimentos
    store.empreendimentos.forEach(emp => {
        empreendimentosMap[emp] = {
            nome: emp,
            dados: Array(12).fill().map(() => ({ quantidade: 0, valor: 0 })),
            totalQuantidade: 0,
            totalValor: 0
        };
    });

    // Processar repasses
    store.repasses.forEach(repasse => {
        // Verificar se é um repasse finalizado
        if (repasse.status_repasse === "Finalizado") {
            // Verificar se tem data de status
            if (repasse.data_status_repasse) {
                const dataStatus = new Date(repasse.data_status_repasse);
                const mes = dataStatus.getMonth(); // 0-11 para Jan-Dez
                const empreendimento = repasse.empreendimento;
                const valorContrato = parseFloat(repasse.valor_contrato || 0);

                // Verificar se o empreendimento existe no mapa
                if (empreendimentosMap[empreendimento]) {
                    // Incrementar contagem para o mês correspondente
                    empreendimentosMap[empreendimento].dados[mes].quantidade++;
                    empreendimentosMap[empreendimento].dados[mes].valor += valorContrato;

                    // Atualizar totais do empreendimento
                    empreendimentosMap[empreendimento].totalQuantidade++;
                    empreendimentosMap[empreendimento].totalValor += valorContrato;

                    // Incrementar total mensal
                    monthlyTotals.value[mes].quantidade++;
                    monthlyTotals.value[mes].valor += valorContrato;

                    // Incrementar total geral
                    grandTotal.value.quantidade++;
                    grandTotal.value.valor += valorContrato;
                }
            }
        }
    });

    // Converter mapa para array
    empreendimentosData.value = Object.values(empreendimentosMap)
        .filter(emp => emp.totalQuantidade > 0) // Apenas empreendimentos com repasses
        .sort((a, b) => a.nome.localeCompare(b.nome)); // Ordenar por nome
};

// Inicializar dados quando o componente for montado
onMounted(() => {
    // Não processamos os dados aqui para evitar sobrecarga
    // Eles serão processados apenas quando o modal for aberto
});
</script>

<style scoped>
/* Garantir que o cabeçalho da tabela e a primeira coluna fiquem fixos durante a rolagem */
.sticky {
    position: sticky;
    background-color: inherit;
}
</style>