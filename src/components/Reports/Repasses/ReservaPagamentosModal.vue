<template>
    <div>
        <!-- Botão de ícone de cifrão para abrir o modal -->
        <button @click="openModal"
            class="text-xl text-gray-500 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-400 focus:outline-none transition-colors duration-200"
            v-tippy="'Ver condições de pagamento'">
            <i class="fas fa-dollar-sign"></i>
        </button>

        <!-- Modal de pagamentos -->
        <div v-if="isModalOpen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            @click.self="closeModal">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-11/12 max-w-4xl max-h-[90vh] overflow-hidden">
                <!-- Cabeçalho do modal -->
                <div class="border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
                    <h2 class="text-xl font-semibold text-gray-800 dark:text-white">
                        Condições de Pagamento - Reserva #{{ idreserva }}
                    </h2>
                    <button @click="closeModal" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>

                <!-- Corpo do modal -->
                <div class="p-6 overflow-y-auto max-h-[calc(90vh-9rem)]">
                    <!-- Loading -->
                    <Carregamento v-if="carregamentoStore.carregando" />
                    <!-- Erro -->
                    <div v-if="error" class="text-red-500 text-center p-4">
                        <p>{{ error }}</p>
                    </div>

                    <!-- Dados de pagamento -->
                    <div v-else-if="processedPaymentData">
                        <!-- Resumo do contrato - Card mais compacto e com melhor visualização -->
                        <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg mb-6">
                            <div class="flex items-center pb-2">
                                <div class="flex border-blue-500 border-l-4 pl-3 h-12 items-center text-xl"></div>
                                <div>
                                    <h3 class="text-xl font-semibold text-gray-800 dark:text-white">Resumo do Contrato
                                    </h3>
                                    <p class="text-sm text-gray-600 dark:text-gray-400">Valores</p>
                                </div>
                            </div>

                            <!-- Resumo com informações diferentes baseado na presença do "Desconto Construtora" -->
                            <div v-if="hasDescontoConstrutora" class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div class="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                                    <p class="text-sm text-gray-600 dark:text-gray-400">Valor Total:</p>
                                    <p class="text-xl font-bold text-gray-800 dark:text-white">
                                        {{ formatMoney(processedPaymentData.dados.valor_total_contrato) }}
                                    </p>
                                </div>
                                <div class="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                                    <p class="text-sm text-gray-600 dark:text-gray-400">Com Juros:</p>
                                    <p class="text-xl font-bold text-gray-800 dark:text-white">
                                        {{ formatMoney(processedPaymentData.dados.valor_total_com_juros) }}
                                    </p>
                                </div>
                                <div class="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                                    <p class="text-sm text-gray-600 dark:text-gray-400">Desconto Construtora:</p>
                                    <p class="text-xl font-bold text-gray-800 dark:text-white">
                                        {{ formatMoney(descontoConstrutora) }}
                                    </p>
                                </div>
                                <div class="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                                    <p class="text-sm text-gray-600 dark:text-gray-400">Valor de Venda:</p>
                                    <p class="text-xl font-bold text-gray-800 dark:text-white">
                                        {{ formatMoney(valorDeVenda) }}
                                    </p>
                                </div>
                            </div>

                            <!-- Resumo padrão quando não há desconto construtora -->
                            <div v-else class="grid grid-cols-2 md:grid-cols-2 gap-4">
                                <div class="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                                    <p class="text-sm text-gray-600 dark:text-gray-400">Valor Total:</p>
                                    <p class="text-xl font-bold text-gray-800 dark:text-white">
                                        {{ formatMoney(processedPaymentData.dados.valor_total_contrato) }}
                                    </p>
                                </div>
                                <div class="bg-white dark:bg-gray-800 p-3 rounded shadow-sm">
                                    <p class="text-sm text-gray-600 dark:text-gray-400">Com Juros:</p>
                                    <p class="text-xl font-bold text-gray-800 dark:text-white">
                                        {{ formatMoney(processedPaymentData.dados.valor_total_com_juros) }}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <!-- Condições de pagamento -->
                        <div v-for="(condicao, index) in processedPaymentData.dados.condicao" :key="index" class="mb-6">
                            <!-- Cabeçalho da condição com barra de progresso indicando série -->
                            <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-3 mb-4">
                                <div class="flex items-center justify-between mb-2">
                                    <div class="flex items-center">
                                        <div
                                            class="flex border-blue-500 border-l-4 pl-3 mr-5 h-12 items-center text-xl">
                                            {{ index + 1 }}
                                        </div>
                                        <div>
                                            <h3 class="text-lg font-semibold text-gray-800 dark:text-white">{{
                                                condicao.serie }}</h3>
                                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                                {{ condicao.quantidade_parcelas }} parcela(s) - {{
                                                    condicao.tipo_juros_descricao }}
                                            </p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-sm text-gray-500 dark:text-gray-400">Total com juros</p>
                                        <p class="text-xl font-bold text-blue-600 dark:text-blue-400">
                                            {{ formatMoney(condicao.valor_total_com_juros) }}
                                        </p>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                                    <div class="bg-gray-50 dark:bg-gray-800 rounded p-2 text-center">
                                        <p class="text-sm text-gray-500 dark:text-gray-400">Valor Total</p>
                                        <p class="font-medium text-lg">{{ formatMoney(condicao.valor_total) }}</p>
                                    </div>
                                    <div class="bg-gray-50 dark:bg-gray-800 rounded p-2 text-center">
                                        <p class="text-sm text-gray-500 dark:text-gray-400">Valor com Juros</p>
                                        <p class="font-medium text-lg">{{ formatMoney(condicao.valor_total_com_juros) }}</p>
                                    </div>
                                    <div class="bg-gray-50 dark:bg-gray-800 rounded p-2 text-center">
                                        <p class="text-sm text-gray-500 dark:text-gray-400">Indexador</p>
                                        <p class="font-medium text-lg">{{ condicao.indexador || '-' }}</p>
                                    </div>
                                    <div class="bg-gray-50 dark:bg-gray-800 rounded p-2 text-center">
                                        <p class="text-sm text-gray-500 dark:text-gray-400">Portador</p>
                                        <p class="font-medium text-lg">{{ condicao.portador }}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Parcelas -->
                            <div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden">
                                <!-- Primeira parcela sempre visível -->
                                <div v-if="condicao.parcelas && condicao.parcelas.length > 0"
                                    class="border-b border-gray-100 dark:border-gray-800">
                                    <div class="grid grid-cols-4 gap-2 p-4">
                                        <div>
                                            <p class="text-sm text-gray-500 dark:text-gray-400">Vencimento</p>
                                            <p class="font-medium text-gray-800 dark:text-white">
                                                {{ formatDate(condicao.parcelas[0].vencimento) }}
                                            </p>
                                        </div>
                                        <div>
                                            <p class="text-sm text-gray-500 dark:text-gray-400">Valor</p>
                                            <p class="font-medium text-gray-800 dark:text-white">
                                                {{ formatMoney(condicao.parcelas[0].valor) }}
                                            </p>
                                        </div>
                                        <div>
                                            <p class="text-sm text-gray-500 dark:text-gray-400">Valor Líquido</p>
                                            <p class="font-medium text-gray-800 dark:text-white">
                                                {{ formatMoney(condicao.parcelas[0].valor_liquido) }}
                                            </p>
                                        </div>
                                        <div>
                                            <p class="text-sm text-gray-500 dark:text-gray-400">Valor com Juros</p>
                                            <p class="font-medium text-gray-800 dark:text-white">
                                                {{ formatMoney(condicao.parcelas[0].valor_com_juros) }}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Botão para expandir/colapsar restante das parcelas (apenas se houver mais de uma parcela) -->
                                <div v-if="condicao.parcelas && condicao.parcelas.length > 1"
                                    class="border-t border-gray-100 dark:border-gray-800 p-2">
                                    <button @click="toggleParcelas(index)"
                                        class="w-full flex justify-center items-center py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded transition-colors">
                                        <span v-if="!expandedSeries.includes(index)">
                                            Ver mais {{ condicao.parcelas.length - 1 }} parcela(s)
                                            <i class="fas fa-chevron-down ml-2"></i>
                                        </span>
                                        <span v-else>
                                            Ocultar parcelas
                                            <i class="fas fa-chevron-up ml-2"></i>
                                        </span>
                                    </button>
                                </div>

                                <!-- Restante das parcelas (colapsáveis) -->
                                <div v-if="expandedSeries.includes(index) && condicao.parcelas && condicao.parcelas.length > 1"
                                    class="bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                                    <div v-for="(parcela, pIndex) in condicao.parcelas.slice(1)" :key="pIndex"
                                        class="grid grid-cols-4 gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                        <div>
                                            <p class="text-sm text-gray-500 dark:text-gray-400">Vencimento</p>
                                            <p class="font-medium text-gray-800 dark:text-white">
                                                {{ formatDate(parcela.vencimento) }}
                                            </p>
                                        </div>
                                        <div>
                                            <p class="text-sm text-gray-500 dark:text-gray-400">Valor</p>
                                            <p class="font-medium text-gray-800 dark:text-white">
                                                {{ formatMoney(parcela.valor) }}
                                            </p>
                                        </div>
                                        <div>
                                            <p class="text-sm text-gray-500 dark:text-gray-400">Valor Líquido</p>
                                            <p class="font-medium text-gray-800 dark:text-white">
                                                {{ formatMoney(parcela.valor_liquido) }}
                                            </p>
                                        </div>
                                        <div>
                                            <p class="text-sm text-gray-500 dark:text-gray-400">Valor com Juros</p>
                                            <p class="font-medium text-gray-800 dark:text-white">
                                                {{ formatMoney(parcela.valor_com_juros) }}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else
                        class="text-center p-8 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <i class="fas fa-money-bill-wave text-4xl mb-3 text-gray-400 dark:text-gray-500"></i>
                        <p>Nenhuma informação de pagamento disponível.</p>
                    </div>
                </div>
 
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, defineProps, watch, computed } from 'vue';
import Carregamento from '@/components/Loading/Carregamento.vue';
import { useCarregamentoStore } from '@/stores/Config/carregamento';
import API_URL from '@/config/apiUrl';

const carregamentoStore = useCarregamentoStore()

const props = defineProps({
    idreserva: {
        type: [Number, String],
        required: true
    },
    formatMoney: {
        type: Function,
        required: true
    }
});

const isModalOpen = ref(false);
const error = ref(null);
const pagamentosData = ref(null);
const expandedSeries = ref([]); // Armazena quais séries estão expandidas

// Verifica se existe a série "Desconto Construtora"
const hasDescontoConstrutora = computed(() => {
    if (!processedPaymentData.value ||
        !processedPaymentData.value.dados ||
        !processedPaymentData.value.dados.condicao) {
        return false;
    }

    return processedPaymentData.value.dados.condicao.some(
        condicao => condicao.serie === 'Desconto Construtora'
    );
});

// Calcula o valor do desconto construtora
const descontoConstrutora = computed(() => {
    if (!hasDescontoConstrutora.value) return 0;

    const desconto = processedPaymentData.value.dados.condicao.find(
        condicao => condicao.serie === 'Desconto Construtora'
    );

    return desconto ? parseFloat(desconto.valor_total) || 0 : 0;
});

// Calcula o valor de venda (valor total - desconto construtora)
const valorDeVenda = computed(() => {
    if (!hasDescontoConstrutora.value) return 0;

    const valorTotal = parseFloat(processedPaymentData.value.dados.valor_total_contrato) || 0;
    return valorTotal - descontoConstrutora.value;
});

// Processa os dados de pagamento para combinar séries iguais
const processedPaymentData = computed(() => {
    if (!pagamentosData.value) return null;

    // Create a deep clone to avoid modifying the original data
    const result = JSON.parse(JSON.stringify(pagamentosData.value));

    // Rest of your logic remains the same...
    const seriesMap = new Map();

    if (result.dados && result.dados.condicao && Array.isArray(result.dados.condicao)) {
        // Primeiro, agrupamos por nome de série
        result.dados.condicao.forEach(condicao => {
            const serieKey = condicao.serie;

            if (!seriesMap.has(serieKey)) {
                seriesMap.set(serieKey, {
                    ...condicao,
                    valor_total: parseFloat(condicao.valor_total) || 0,
                    valor_total_com_juros: parseFloat(condicao.valor_total_com_juros) || 0,
                    parcelas: [...(condicao.parcelas || [])]
                });
            } else {
                const existingSeries = seriesMap.get(serieKey);

                // Somar valores
                existingSeries.valor_total += parseFloat(condicao.valor_total) || 0;
                existingSeries.valor_total_com_juros += parseFloat(condicao.valor_total_com_juros) || 0;

                // Atualizar quantidade de parcelas
                existingSeries.quantidade_parcelas = (parseInt(existingSeries.quantidade_parcelas) || 0) +
                    (parseInt(condicao.quantidade_parcelas) || 0);

                // Adicionar parcelas
                if (condicao.parcelas && condicao.parcelas.length) {
                    existingSeries.parcelas = [...existingSeries.parcelas, ...condicao.parcelas];

                    // Ordenar parcelas por data de vencimento
                    existingSeries.parcelas.sort((a, b) => {
                        return new Date(a.vencimento) - new Date(b.vencimento);
                    });
                }
            }
        });

        // Substituir o array de condições pelo array agrupado
        result.dados.condicao = Array.from(seriesMap.values());
    }

    return result;
});

const openModal = async () => {
    isModalOpen.value = true;
    expandedSeries.value = []; // Reset expandido ao abrir
    await fetchPagamentosData();
};

const closeModal = () => {
    isModalOpen.value = false;
};

const toggleParcelas = (index) => {
    if (expandedSeries.value.includes(index)) {
        expandedSeries.value = expandedSeries.value.filter(i => i !== index);
    } else {
        expandedSeries.value.push(index);
    }
};

const formatDate = (dateString) => {
    if (!dateString) return '-';

    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const fetchPagamentosData = async () => {
    if (!props.idreserva) {
        error.value = 'ID da reserva não informado';
        return;
    }

    error.value = null;

    try {
        carregamentoStore.iniciarCarregamento();
        const response = await fetch(`${API_URL}/external/reserva-pagamentos?idreserva=${props.idreserva}`);

        if (!response.ok) {
            throw new Error(`Erro ao buscar dados: ${response.status}`);
        }

        const data = await response.json();
        pagamentosData.value = data;
        console.log(pagamentosData.value);
    } catch (err) {
        console.error('Erro ao buscar condições de pagamento:', err);
        error.value = `Falha ao carregar dados: ${err.message}`;
    } finally {
        carregamentoStore.finalizarCarregamento();
    }
};

// Quando o ID da reserva mudar, recarregar os dados (se o modal estiver aberto)
watch(() => props.idreserva, () => {
    if (isModalOpen.value) {
        fetchPagamentosData();
    }
});
</script>