<template>
    <div v-if="modalVisivel"
        class="absolute left-0 top-0 w-full h-full bg-gray-900/25 flex justify-center md:items-center z-20"
        @click="fecharModal">

        <div @click.stop
            class="bg-gray-200 dark:bg-gray-600 relative m-4 ms-20 p-2 md:p-4 rounded-lg w-full md:w-1/2 mt-[6vh] md:mt-0 h-[80vh] overflow-y-auto">
            <i class="fas fa-xmark text-3xl absolute right-3 cursor-pointer" @click="fecharModal"></i>

            <div :class="{ '!grid-cols-1': filtrosAtivos.empreendimento.length === 1 }"
                class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                <!-- Coluna de Empreendimentos: só exibe se nenhum filtro estiver ativo -->
                <div v-if="filtrosAtivos.empreendimento.length === 0">
                    <h3 class="text-lg font-semibold my-2 text-gray-800 dark:text-gray-200">
                        <i class="fas fa-building mx-2"></i> Empreendimentos
                    </h3>
                    <ul class="space-y-1">
                        <li v-for="item in ordenarPorContagem(agruparPor(filtrarReservas(reservas), 'unidade.empreendimento'))"
                            :key="item.nome" @click="aplicarFiltro(item.nome, 'empreendimento')"
                            :class="{ 'bg-sky-200': filtrosAtivos.empreendimento.includes(item.nome) }"
                            class="flex justify-between items-center bg-gray-100 dark:bg-gray-700 hover:dark:bg-gray-800 hover:bg-gray-50 duration-150 cursor-pointer py-1.5 px-3 rounded-lg">
                            <span class="text-sm md:text-lg truncate" :title="item.nome">
                                {{ item.nome || 'Não definido' }}
                            </span>
                            <span class="bg-sky-400 text-white text-sm font-medium px-2 py-0.5 rounded">
                                {{ item.count }}
                            </span>
                        </li>
                    </ul>
                </div>

                <!-- Coluna de Situações -->
                <div :class="{ '!flex !justify-around gap-2': filtrosAtivos.empreendimento.length === 1 }">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold py-2 text-gray-800 dark:text-gray-200">
                            <i class="fas fa-chart-pie mx-2"></i> Situações
                        </h3>
                        <ul class="space-y-1">
                            <li v-for="item in ordenarPorContagem(agruparPor(filtrarReservas(reservas), 'situacao.situacao'))"
                                :key="item.nome" @click="aplicarFiltro(item.nome, 'situacao')"
                                class="flex justify-between items-center bg-gray-100 dark:bg-gray-700 hover:dark:bg-gray-800 hover:bg-gray-50 duration-150 cursor-pointer py-1.5 px-3 rounded-lg">
                                <span class="text-sm md:text-lg truncate" :title="item.nome">
                                    {{ item.nome || 'Não definido' }}
                                </span>
                                <span class="bg-amber-400 text-white text-sm font-medium px-2 py-0.5 rounded">
                                    {{ item.count }}
                                </span>
                            </li>
                        </ul>
                    </div>

                    <!-- Coluna de Imobiliárias -->
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold py-2 text-gray-800 dark:text-gray-200">
                            <i class="fas fa-trowel-bricks mx-2"></i> Imobiliárias
                        </h3>
                        <ul class="space-y-1">
                            <li v-for="item in ordenarPorContagem(agruparPor(filtrarReservas(reservas), 'corretor.imobiliaria'))"
                                :key="item.nome" @click="aplicarFiltro(item.nome, 'imobiliaria')"
                                :class="{ 'bg-sky-200': filtrosAtivos.imobiliaria.includes(item.nome) }"
                                class="flex justify-between items-center bg-gray-100 dark:bg-gray-700 hover:dark:bg-gray-800 hover:bg-gray-50 duration-150 cursor-pointer py-1.5 px-3 rounded-lg">
                                <span class="text-sm md:text-lg truncate" :title="item.nome">
                                    {{ item.nome || 'Não informado' }}
                                </span>
                                <span class="bg-emerald-500 text-white text-sm font-medium px-2 py-0.5 rounded">
                                    {{ item.count }}
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Chips de filtros ativos -->
            <div class="mb-4"
                v-if="filtrosAtivos.empreendimento.length > 0 || filtrosAtivos.imobiliaria.length > 0 || filtrosAtivos.situacao.length > 0">
                <div class="flex flex-wrap gap-2">
                    <div v-for="(filtro, index) in filtrosAtivos.empreendimento" :key="index"
                        class="bg-gray-50 dark:bg-gray-500 text-sm font-medium px-2 py-0.5 rounded-lg flex items-center">
                        {{ filtro }}
                        <i @click="removerFiltro(filtro, 'empreendimento')"
                            class="fas fa-xmark ml-2 cursor-pointer"></i>
                    </div>
                    <div v-for="(filtro, index) in filtrosAtivos.imobiliaria" :key="index"
                        class="bg-gray-50 dark:bg-gray-500 text-sm font-medium px-2 py-0.5 rounded-lg flex items-center">
                        {{ filtro }}
                        <i @click="removerFiltro(filtro, 'imobiliaria')" class="fas fa-xmark ml-2 cursor-pointer"></i>
                    </div>
                    <div v-for="(filtro, index) in filtrosAtivos.situacao" :key="index"
                        class="bg-gray-50 dark:bg-gray-500 text-sm font-medium px-2 py-0.5 rounded-lg flex items-center">
                        {{ filtro }}
                        <i @click="removerFiltro(filtro, 'situacao')" class="fas fa-xmark ml-2 cursor-pointer"></i>
                    </div>
                </div>
            </div>

            <!-- Lista de reservas -->
            <ul>
                <div class="flex justify-between">
                    <p class="text-gray-500 dark:text-gray-300">Reservas: {{ filtrarReservas(reservas).length }}</p>
                    <p class="text-gray-500 dark:text-gray-300">{{ obterIntervaloDeDatas(reservas) }}</p>
                </div>
                <li v-for="reserva in filtrarReservas(reservas)" :key="reserva.idproposta_cv || reserva.idcontrato"
                    class="bg-gray-100 dark:bg-gray-700 my-2 p-2 rounded-lg relative shadow-sm">
                    <!-- Cabeçalho da Reserva -->
                    <div class="line flex justify-between">
                        <div class="name flex truncate">
                            <p @click="toggleDetalhes(reserva.idproposta_cv || reserva.idcontrato)"
                                class="truncate flex-1 text-md md:text-xl cursor-pointer">
                                {{ reserva.titular?.nome || 'Cliente' }}<i class="fas m-auto ms-1.5"
                                    :class="detalhesVisiveis[reserva.idproposta_cv || reserva.idcontrato] ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                            </p>
                        </div>
                        <div class="flex">
                            <div class="hidden md:flex m-1 gap-1.5 text-sm truncate">
                                <button v-tippy="'Valor Contrato'" class="truncate">
                                    <p class="py-0.5 px-1.5 rounded-lg bg-gray-200 dark:bg-gray-500 truncate">
                                        {{ formatMoney(reserva.condicoes?.valor_contrato ||
                                            reserva.condicoes?.total_proposta) }}
                                    </p>
                                </button>
                                <button v-tippy="'Situação'" class="truncate">
                                    <p class="py-0.5 px-1.5 rounded-lg bg-gray-200 dark:bg-gray-500 truncate">
                                        {{ reserva.situacao?.situacao || 'Não definido' }}
                                    </p>
                                </button>
                                <button v-tippy="'Unidade'" class="truncate">
                                    <p class="py-0.5 px-1.5 rounded-lg bg-gray-200 dark:bg-gray-500 truncate">
                                        {{ reserva.unidade?.unidade || 'Não definido' }}
                                    </p>
                                </button>
                            </div>

                            <div class="redirects flex gap-2 p-2">
                                <button v-tippy="'CV CRM'">
                                    <a :href="'https://menin.cvcrm.com.br/gestor/comercial/contratos/' + (reserva.idproposta_cv || reserva.idcontrato) + '/administrar'"
                                        target="_blank">
                                        <img src="/CVLogo.png" alt="CV CRM" class="h-4 min-w-4 drop-shadow">
                                    </a>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="flex md:hidden gap-1.5 text-xs md:text-sm truncate">
                        <button v-tippy="'Situação'">
                            <p class="py-0.5 px-1.5 rounded-lg bg-gray-500 truncate">
                                {{ reserva.situacao?.situacao || 'Não definido' }}
                            </p>
                        </button>
                        <button v-tippy="'Unidade'">
                            <p class="py-0.5 px-1.5 rounded-lg bg-gray-500 truncate">
                                {{ reserva.unidade?.unidade || 'Não definido' }}
                            </p>
                        </button>
                    </div>

                    <!-- Detalhes da Reserva (expansível) -->
                    <div v-if="detalhesVisiveis[reserva.idproposta_cv || reserva.idcontrato]" class="mt-2">
                        <!-- Dados do Cliente -->
                        <div v-if="reserva.titular"
                            class="bg-gray-200 dark:bg-gray-600 relative px-1 sm:px-2 pb-1 md:pb-2 pt-2 md:pt-3 rounded-xl flex text-center my-3">
                            <label class="absolute ms-2 md:ms-3 -mt-6 font-semibold text-md md:text-lg">Dados
                                Cliente</label>
                            <button v-tippy="'Email'" class="flex-1 truncate" v-if="reserva.titular.email">
                                <a class="text-sm md:text-md truncate" :href="'mailto:' + reserva.titular.email">
                                    <i class="fas fa-envelope"></i> {{ reserva.titular.email }}
                                </a>
                            </button>
                            <button v-tippy="'Telefone'" class="flex-1 truncate"
                                v-if="reserva.titular.telefone || reserva.titular.celular">
                                <a class="text-sm md:text-md truncate"
                                    :href="'https://wa.me/' + (reserva.titular.telefone || reserva.titular.celular).replace(/\D/g, '')"
                                    target="_blank">
                                    <i class="fab fa-whatsapp"></i> {{ reserva.titular.telefone ||
                                        reserva.titular.celular }}
                                </a>
                            </button>
                        </div>

                        <!-- Dados da Imobiliária/Corretor -->
                        <div v-if="reserva.corretor?.imobiliaria || reserva.corretor?.corretor || reserva.imobiliaria?.cnpj"
                            class="bg-gray-200 dark:bg-gray-600 relative px-0.5 md:px-2 pb-0.5 md:pb-2 pt-3 rounded-xl flex text-center my-1 md:my-3">
                            <label class="absolute ms-2 md:ms-3 -mt-6 font-semibold text-md md:text-lg">Dados
                                Imobiliária</label>
                            <button v-tippy="'CV Imobiliária'" class="flex-1 truncate"
                                v-if="reserva.corretor?.imobiliaria || reserva.imobiliaria?.cnpj">
                                <a class="text-sm md:text-md truncate" target="_blank"
                                    :href="'https://menin.cvcrm.com.br/gestor/cadastros/imobiliarias?q%5B2%7Cimobiliarias.nome%5D=' + (reserva.corretor?.imobiliaria || 'CNPJ: ' + reserva.imobiliaria?.cnpj)">
                                    <i class="fas fa-trowel-bricks"></i> {{ reserva.corretor?.imobiliaria || 'CNPJ: ' +
                                        reserva.imobiliaria?.cnpj }}
                                </a>
                            </button>
                            <button v-tippy="'CV Corretor'" class="flex-1 truncate" v-if="reserva.corretor?.corretor">
                                <a class="text-sm md:text-md truncate" target="_blank"
                                    :href="'https://menin.cvcrm.com.br/gestor/cadastros/corretores?q%5B2%7Cc.nome%5D=' + reserva.corretor.corretor">
                                    <i class="fas fa-clipboard"></i> {{ reserva.corretor.corretor }}
                                </a>
                            </button>
                        </div>

                        <!-- Empresa Correspondente -->
                        <div v-if="reserva.empresaCorrespondente?.nome"
                            class="bg-gray-200 dark:bg-gray-600 relative px-0.5 md:px-2 pb-0.5 md:pb-2 pt-3 rounded-xl flex text-center my-1 md:my-3">
                            <label class="absolute ms-2 md:ms-3 -mt-6 font-semibold text-md md:text-lg">Empresa
                                Correspondente</label>
                            <button v-tippy="'Correspondente Bancário'" class="flex-1 truncate">
                                <a class="text-sm md:text-md truncate" target="_blank"
                                    :href="`https://menin.cvcrm.com.br/gestor/cadastros/correpondentesempresas/${reserva.empresaCorrespondente.idempresa}/editar`">
                                    <i class="fas fa-building-columns"></i> {{ reserva.empresaCorrespondente.nome }}
                                </a>
                            </button>
                        </div>

                        <!-- Dados Financeiros -->
                        <div v-if="reserva.condicoes"
                            class="bg-gray-200 dark:bg-gray-600 relative px-0.5 md:px-2 pb-0.5 md:pb-2 pt-3 rounded-xl flex flex-col text-center my-1 md:my-3">
                            <label class="absolute ms-2 md:ms-3 -mt-6 font-semibold text-md md:text-lg">Dados
                                Financeiros</label>
                            <!-- Séries/Parcelas -->
                            <div class="flex flex-wrap justify-center gap-2 mt-1"
                                v-if="reserva.condicoes?.series && reserva.condicoes.series.length > 0">
                                <span v-for="(serie, index) in reserva.condicoes.series" :key="index"
                                    class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    {{ serie.quantidade }}x {{ serie.serie.substring(0, 15) }}
                                    {{ formatMoney(serie.valor) }}
                                </span>
                            </div>
                        </div>

                        <!-- Contratos Assinados -->
                        <div v-if="reserva.contratos && reserva.contratos.length > 0"
                            class="bg-gray-200 dark:bg-gray-600 relative px-0.5 md:px-2 pb-0.5 md:pb-2 pt-3 rounded-xl flex flex-col text-center my-1 md:my-3">
                            <label class="absolute ms-2 md:ms-3 -mt-6 font-semibold text-md md:text-lg">Contratos
                                Assinados</label>
                            <div class="flex flex-wrap justify-center gap-2 mt-1">
                                <span v-for="(contrato, index) in reserva.contratos" :key="index"
                                    class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm">
                                    {{ contrato.contrato }} - {{ formatDate(contrato.data) }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Rodapé da Reserva -->
                    <div class="w-full justify-between flex gap-1.5 overflow-x-auto mt-2 text-xs md:text-lg">
                        <a v-tippy="'Visualizar Empreendimento'"
                            :href="'/buildings?search=' + reserva.unidade?.empreendimento" target="_blank"
                            class="bg-gray-200 dark:bg-gray-600 rounded-md px-2 truncate"
                            v-if="reserva.unidade?.empreendimento">
                            {{ reserva.unidade.empreendimento }}
                        </a>
                        <div v-else class="bg-gray-200 dark:bg-gray-600 rounded-md px-2 truncate">SEM EMPREENDIMENTO
                        </div>
                        <div class="text-gray-500 pe-1.5 truncate" v-if="reserva.data">
                            {{ formatDateTime(reserva.data) }}
                        </div>
                    </div>
                </li>
            </ul>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
    reservas: {
        type: Array,
        required: true,
    },
    modalVisivel: {
        type: Boolean,
        required: true,
    }
});

const detalhesVisiveis = ref({});
const filtrosAtivos = ref({
    empreendimento: [],
    imobiliaria: [],
    situacao: []
});

// Função para aplicar filtro
const aplicarFiltro = (filtro, categoria) => {
    if (categoria === 'situacao') {
        // Para situações: permite múltiplas seleções (toggle)
        if (filtrosAtivos.value[categoria].includes(filtro)) {
            // Se já estiver selecionado, remove
            filtrosAtivos.value[categoria] = filtrosAtivos.value[categoria].filter(item => item !== filtro);
        } else {
            // Senão, adiciona à lista
            filtrosAtivos.value[categoria].push(filtro);
        }
    } else {
        // Para empreendimento e imobiliaria: permite somente uma seleção.
        // Se o filtro já estiver ativo, desativa (toggle off); caso contrário, substitui qualquer seleção anterior.
        if (filtrosAtivos.value[categoria][0] === filtro) {
            filtrosAtivos.value[categoria] = [];
        } else {
            filtrosAtivos.value[categoria] = [filtro];
        }
    }
};

const limparFiltros = () => {
    filtrosAtivos.value = {
        empreendimento: [],
        imobiliaria: [],
        situacao: [],
    };
};

// Função para remover filtro
const removerFiltro = (filtro, categoria) => {
    if (categoria === 'situacao') {
        // Remove somente o filtro selecionado, mantendo os demais.
        filtrosAtivos.value[categoria] = filtrosAtivos.value[categoria].filter(item => item !== filtro);
    } else {
        // Para empreendimento e imobiliaria, limpa a seleção.
        filtrosAtivos.value[categoria] = [];
    }
};

// Função de agrupamento
function agruparPor(array, propriedade) {
    return array.reduce((acc, item) => {
        const valor = propriedade.split('.').reduce((obj, chave) => {
            if (chave.endsWith(']')) {
                const [base, index] = chave.replace(']', '').split('[');
                return obj?.[base]?.[parseInt(index)] ?? null;
            }
            return obj?.[chave];
        }, item);

        if (valor) {
            acc[valor] = (acc[valor] || 0) + 1;
        }
        return acc;
    }, {});
}

// Nova função para ordenar os resultados do agrupamento por contagem (quantidade)
function ordenarPorContagem(objetoAgrupado) {
    // Converter o objeto em um array de objetos {nome, count}
    const arrayOrdenado = Object.entries(objetoAgrupado).map(([nome, count]) => ({
        nome,
        count
    }));

    // Ordenar o array em ordem decrescente de contagem
    return arrayOrdenado.sort((a, b) => b.count - a.count);
}

const filtrarReservas = (reservas) => {
    return reservas.filter(reserva => {
        const empreendimentoNome = reserva.unidade?.empreendimento || null;
        const imobiliariaNome = reserva.corretor?.imobiliaria || null;
        const situacaoNome = reserva.situacao?.situacao || null;

        return (
            (filtrosAtivos.value.empreendimento.length === 0 ||
                filtrosAtivos.value.empreendimento.includes(empreendimentoNome)) &&
            (filtrosAtivos.value.imobiliaria.length === 0 ||
                filtrosAtivos.value.imobiliaria.includes(imobiliariaNome)) &&
            (filtrosAtivos.value.situacao.length === 0 ||
                filtrosAtivos.value.situacao.includes(situacaoNome))
        );
    });
};

function obterIntervaloDeDatas(reservas) {
    if (!reservas.length) return '';

    const datas = reservas.map(reserva => {
        // Verifica múltiplos campos de data possíveis
        const dataStr = reserva.data || reserva.data_cad || reserva.data_contrato || reserva.data_venda;
        if (!dataStr) return null;

        try {
            const data = new Date(dataStr);
            if (isNaN(data.getTime())) return null;
            return new Date(data.getFullYear(), data.getMonth(), data.getDate());
        } catch (e) {
            return null;
        }
    }).filter(Boolean); // Remove datas inválidas

    if (datas.length === 0) return '';

    datas.sort((a, b) => a - b);
    const todasIguais = datas.every(data => data.getTime() === datas[0].getTime());

    if (todasIguais) {
        const dataReservas = datas[0].toLocaleDateString('pt-BR');
        return `${dataReservas}`;
    } else {
        const dataAntiga = datas[0].toLocaleDateString('pt-BR');
        const dataRecente = datas[datas.length - 1].toLocaleDateString('pt-BR');
        return `${dataAntiga} - ${dataRecente}`;
    }
}

const formatDateTime = (dataString) => {
    if (!dataString) return '';

    try {
        const data = new Date(dataString);
        if (isNaN(data.getTime())) return 'Data inválida';

        return data.toLocaleString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).replace(',', '');
    } catch (e) {
        return 'Data inválida';
    }
};

const formatDate = (dataString) => {
    if (!dataString) return '';

    try {
        const data = new Date(dataString);
        if (isNaN(data.getTime())) return 'Data inválida';

        return data.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch (e) {
        return 'Data inválida';
    }
};

// Função para formatação de valores monetários
const formatMoney = (value) => {
    if (!value) return 'R$ 0,00';

    let numValue;

    // Se for string, remove caracteres não numéricos, exceto ponto e vírgula
    if (typeof value === 'string') {
        // Primeiro trata formato brasileiro (vírgula como decimal)
        if (value.includes(',')) {
            value = value.replace(/\./g, '').replace(',', '.');
        }
        numValue = parseFloat(value);
    } else {
        numValue = value;
    }

    if (isNaN(numValue)) return 'R$ 0,00';

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(numValue);
};

const emit = defineEmits(['update:modalVisivel']);

const fecharModal = () => {
    emit('update:modalVisivel', false);
    limparFiltros(); // Limpa os filtros
};

const toggleDetalhes = (idcontrato) => {
    detalhesVisiveis.value[idcontrato] = !detalhesVisiveis.value[idcontrato];
};
</script>