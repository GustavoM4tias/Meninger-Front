<template>
    <div class="w-full h-[calc(100%-4rem)] relative overflow-hidden flex">
        <!-- Área principal -->
        <div class="w-10/12 ps-4 pe-2 py-4 h-full flex flex-col overflow-hidden">
            <div class="flex items-center pb-2">
                <h1 class="text-xl md:text-2xl font-bold">Reservas</h1>
                <Favorite :router="'/comercial/reservas'" :section="'Reservas'" />
            </div>

            <div class="cards flex w-full gap-4 mb-3">
                <!-- Card para o total de reservas -->
                <Card v-if="store.total > 0" :title="'Todas as Reservas'" :icon="'fas fa-tent'"
                    :class="'!bg-blue-500/15 !border-blue-500/30'" :value="store.total"
                    :label="`Desde ${formatDate(dataFiltro)}`" />
                <Card v-if="totalEmpreendimentosComReserva > 0" :title="'Empreendimentos com Reserva'"
                    :icon="'fas fa-building'" :class="'!bg-purple-500/15 !border-purple-500/30'"
                    :value="totalEmpreendimentosComReserva" :label="'Total de empreendimentos com reservas ativas'" />
                <Card v-if="aggregatedInfo.totalValorContrato > 0" :title="'Valor Total dos Contratos'"
                    :icon="'fas fa-dollar-sign'" :class="'!bg-green-500/15 !border-green-500/30'"
                    :value="formatMoney(aggregatedInfo.totalValorContrato)" :label="'Soma dos valores dos contratos'" />
            </div>

            <!-- Cards para reservas por situação -->
            <div class="cards flex w-full gap-4 mb-3">
                <Card v-for="(count, situacao) in aggregatedInfo.porSituacao" :key="situacao" :title="situacao"
                    :icon="'fas fa-sitemap'" :class="'!bg-indigo-500/15 !border-indigo-500/30'" :value="count"
                    :label="`Reservas em ${situacao}`" />
            </div>

            <!-- Filtros do Relatório -->
            <ReservaFilterBar :empreendimentos="store.empreendimentos"
                :initialSelectedEmpreendimentos="selectedEmpreendimentos" :initialDataFiltro="dataFiltro"
                @applyFilters="aplicarFiltros" @update:selectedEmpreendimentos="updateEmpreendimentos"
                @update:dataFiltro="updateDataFiltro" />

            <!-- Tabela de Reservas -->
            <div class="flex-grow overflow-auto overflow-x-auto mt-4 rounded-lg border border-gray-600">
                <table class="table-fixed w-full">
                    <colgroup>
                        <col style="width: 70px;" />
                        <col style="width: 200px;" />
                        <col style="width: 240px;" />
                        <col style="width: 160px;" />
                        <col style="width: 120px;" />
                        <col style="width: 100px;" />
                        <col style="width: 120px;" />
                        <col style="width: 150px;" />
                        <col style="width: 100px;" />
                    </colgroup>
                    <thead class="bg-gray-700 text-white">
                        <tr class="text-start">
                            <th class="py-3 cursor-pointer" @click="changeSort('idproposta_cv')">
                                ID
                                <span v-if="sortColumn === 'idproposta_cv'">
                                    {{ sortOrder === 'asc' ? '▴' : sortOrder === 'desc' ? '▾' : '' }}
                                </span>
                            </th>
                            <th class="py-3 cursor-pointer" @click="changeSort('unidade.empreendimento')">
                                Empreendimento
                                <span v-if="sortColumn === 'unidade.empreendimento'">
                                    {{ sortOrder === 'asc' ? '▴' : sortOrder === 'desc' ? '▾' : '' }}
                                </span>
                            </th>
                            <th class="py-3 cursor-pointer" @click="changeSort('titular.nome')">
                                Cliente
                                <span v-if="sortColumn === 'titular.nome'">
                                    {{ sortOrder === 'asc' ? '▴' : sortOrder === 'desc' ? '▾' : '' }}
                                </span>
                            </th>
                            <th class="py-3 cursor-pointer" @click="changeSort('unidade.etapa')">
                                Etapa
                                <span v-if="sortColumn === 'unidade.etapa'">
                                    {{ sortOrder === 'asc' ? '▴' : sortOrder === 'desc' ? '▾' : '' }}
                                </span>
                            </th>
                            <th class="py-3 cursor-pointer" @click="changeSort('unidade.unidade')">
                                Unidade
                                <span v-if="sortColumn === 'unidade.unidade'">
                                    {{ sortOrder === 'asc' ? '▴' : sortOrder === 'desc' ? '▾' : '' }}
                                </span>
                            </th>
                            <th class="py-3 cursor-pointer" @click="changeSort('data')">
                                Data
                                <span v-if="sortColumn === 'data'">
                                    {{ sortOrder === 'asc' ? '▴' : sortOrder === 'desc' ? '▾' : '' }}
                                </span>
                            </th>
                            <th class="py-3 cursor-pointer" @click="changeSort('condicoes.valor_contrato')">
                                Valor Contrato
                                <span v-if="sortColumn === 'condicoes.valor_contrato'">
                                    {{ sortOrder === 'asc' ? '▴' : sortOrder === 'desc' ? '▾' : '' }}
                                </span>
                            </th>
                            <th class="py-3 cursor-pointer" @click="changeSort('situacao.situacao')">
                                Situação
                                <span v-if="sortColumn === 'situacao.situacao'">
                                    {{ sortOrder === 'asc' ? '▴' : sortOrder === 'desc' ? '▾' : '' }}
                                </span>
                            </th>
                            <th class="py-3">Ações</th>
                        </tr>
                    </thead>
                    <tbody v-if="sortedReservas.length">
                        <tr v-for="reserva in sortedReservas" :key="reserva.ID"
                            class="border-b border-gray-600 text-sm">
                            <td class="p-3 truncate font-semibold">#{{ reserva.idproposta_cv }}</td>
                            <td class="p-3 truncate">{{ reserva.unidade.empreendimento }}</td>
                            <td class="p-3 truncate">{{ reserva.titular.nome }}</td>
                            <td class="p-3 truncate">{{ reserva.unidade.etapa }}</td>
                            <td class="p-3 truncate">{{ reserva.unidade.unidade }}</td>
                            <td class="p-3 truncate">{{ formatDate(reserva.data) }}</td>
                            <td class="p-3 truncate">{{ formatMoney(reserva.condicoes.valor_contrato) }}</td>
                            <td class="p-3">
                                <p class="text-white font-bold text-center px-2 py-0.5 rounded-xl truncate cursor-pointer"
                                    :class="{
                                        'bg-sky-500': reserva.situacao?.situacao === 'Nova Reserva',
                                        'bg-purple-500': reserva.situacao?.situacao === 'Ajustes',
                                        'bg-green-500': reserva.situacao?.situacao === 'Análise Comercial',
                                        'bg-emerald-600': reserva.situacao?.situacao === 'Geração de contratos',
                                        'bg-amber-400': reserva.situacao?.situacao === 'Em Assinatura',
                                        'bg-red-500': reserva.situacao?.situacao === 'Envio Sienge',
                                        'bg-green-600': reserva.situacao?.situacao === 'Vendida',
                                        'bg-gray-300': !(['Ajustes', 'Em Assinatura', 'Envio Sienge', 'Vendida'].includes(reserva.situacao?.situacao))
                                    }">
                                    {{ reserva.situacao?.situacao || 'N/A' }}
                                </p>
                            </td>
                            <td class="p-3 min-w-0 truncate flex">
                                <a :href="`https://menin.cvcrm.com.br/gestor/comercial/reservas/${reserva.idproposta_cv}/administrar?lido=true`"
                                    target="_blank" class="cursor-pointer mx-auto" v-tippy="'CV CRM'">
                                    <img src="/CVLogo.png" alt="CV CRM" class="w-5 min-w-5" />
                                </a>
                                <i class="fas fa-eye text-xl mt-0.5 mx-auto cursor-pointer text-gray-400"
                                    v-tippy="'Detalhes'"></i>
                            </td>
                            <!-- <td class="p-3 min-w-0 truncate">
                                {{ reserva.empresaCorrespondente.nome }}
                            </td>
                            <td class="p-3 min-w-0 truncate">
                                {{ reserva.corretor.imobiliaria }}
                            </td>
                            <td class="p-3 min-w-0 truncate">
                                {{ reserva.corretor.corretor }}
                            </td> -->
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr>
                            <td colspan="9" class="p-3 text-center">Nenhuma reserva encontrada.</td>
                        </tr>
                    </tbody>
                </table>
            </div>

        </div>

        <!-- Aside componentizado -->
        <div class="w-3/12 h-full overflow-hidden py-4">
            <!-- Cards para mostrar a quantidade de reservas por empreendimento -->
            <div class="cards w-full h-full">
                <h2 class="text-2xl font-semibold ps-2">Reservas X Empreendimentos</h2>
                <div class="overflow-y-auto h-[calc(100%-2rem)] px-2 pt-2 flex flex-col gap-4">
                    <div v-for="(count, empreendimento) in aggregatedInfo.porEmpreendimento" :key="empreendimento">
                        <Card :title="empreendimento" :icon="'fas fa-building'"
                            :class="'!bg-gray-500/15 !border-gray-500/30'" :value="count"
                            :label="`Reservas em ${empreendimento}`" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useReservasStore } from '@/stores/Reports/Reservas/reservasStore';
import Favorite from "@/components/config/Favorite.vue";
import ReservaFilterBar from '@/components/Reports/Reservas/ReservaFilterBar.vue';
import Card from '@/components/Reports/Reservas/Card.vue';

const store = useReservasStore();

// Estados reativos para os filtros
const selectedEmpreendimentos = ref([]);
const dataFiltro = ref('');

// Função para atualizar os filtros e recarregar os dados
const aplicarFiltros = async (filters) => {
    // Atualiza o filtro de data se informado
    if (filters.dataFiltro) {
        dataFiltro.value = filters.dataFiltro;
    }
    // Atualiza os empreendimentos selecionados
    if (filters.selectedEmpreendimentos) {
        selectedEmpreendimentos.value = filters.selectedEmpreendimentos;
    }
    // Chama o método do store para buscar reservas com os parâmetros de filtro
    await store.fetchReservas({
        a_partir_de: dataFiltro.value,
        idempreendimento: selectedEmpreendimentos.value.join(','),
        faturar: filters.faturar === 'ambas' ? 'ambos' : (filters.faturar || 'false')
    });

};

// Funções para atualizar os filtros conforme os eventos do componente ReservaFilterBar
const updateEmpreendimentos = (empreendimentos) => {
    selectedEmpreendimentos.value = empreendimentos;
};

const updateDataFiltro = (data) => {
    dataFiltro.value = data;
};

// Funções utilitárias
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR');
};

const formatMoney = (value) =>
    new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);

// Carregamento inicial dos dadosblu
onMounted(async () => {
    await store.fetchEmpreendimentos();
    const hoje = new Date();
    const dataInicial = `01/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;
    dataFiltro.value = dataInicial;
    await store.fetchReservas({ a_partir_de: dataInicial, faturar: 'false' });
});


const aggregatedInfo = computed(() => {
    const info = {
        totalReservas: store.reservas.length,
        porSituacao: {},
        totalValorContrato: 0,
        porEmpreendimento: {}
    };

    store.reservas.forEach((reserva) => {
        // Agrupamento por situação
        const situacao = reserva.situacao?.situacao || 'N/A';
        if (!info.porSituacao[situacao]) {
            info.porSituacao[situacao] = 0;
        }
        info.porSituacao[situacao]++;

        // Soma dos valores de contrato
        const valor = parseFloat(reserva.condicoes?.valor_contrato) || 0;
        info.totalValorContrato += valor;

        // Agrupamento por empreendimento
        const empreendimento = reserva.unidade?.empreendimento || 'N/A';
        if (!info.porEmpreendimento[empreendimento]) {
            info.porEmpreendimento[empreendimento] = 0;
        }
        info.porEmpreendimento[empreendimento]++;
    });

    // Ordenar os empreendimentos por quantidade de reservas (do maior para o menor)
    info.porSituacao = Object.entries(info.porSituacao)
        .sort((a, b) => b[1] - a[1])  // Ordenar de forma decrescente
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});

    // Ordenar os empreendimentos por quantidade de reservas (do maior para o menor)
    info.porEmpreendimento = Object.entries(info.porEmpreendimento)
        .sort((a, b) => b[1] - a[1])  // Ordenar de forma decrescente
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});

    return info;
});

// Computed para contar os empreendimentos com reservas ativas
const totalEmpreendimentosComReserva = computed(() => {
    return Object.keys(aggregatedInfo.value.porEmpreendimento)
        .filter(key => key !== 'N/A') // remova esta linha se quiser contar até as chaves 'N/A'
        .length;
});



// Estado de ordenação
const sortColumn = ref(null);        // e.g. 'data', 'idproposta_cv', 'unidade.empreendimento', etc.
const sortOrder = ref(null);         // 'asc' | 'desc' | null

// Função para alternar o estado de ordenação
function changeSort(column) {
    if (sortColumn.value !== column) {
        sortColumn.value = column;
        sortOrder.value = 'asc';
    } else if (sortOrder.value === 'asc') {
        sortOrder.value = 'desc';
    } else {
        sortColumn.value = null;
        sortOrder.value = null;
    }
}

// Computed que retorna o array ordenado
const sortedReservas = computed(() => {
    const data = [...store.reservas];
    if (!sortColumn.value || !sortOrder.value) {
        return data;
    }
    // Extrai o valor do campo, suportando keys aninhadas
    const getValue = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
    return data.sort((a, b) => {
        let va = getValue(a, sortColumn.value);
        let vb = getValue(b, sortColumn.value);

        // Converte datas
        if (sortColumn.value === 'data') {
            va = new Date(va);
            vb = new Date(vb);
        }
        // Converte números
        else if (sortColumn.value === 'idproposta_cv' || sortColumn.value.includes('valor')) {
            va = parseFloat(va) || 0;
            vb = parseFloat(vb) || 0;
        }
        // Strings
        else {
            va = String(va || '').toLowerCase();
            vb = String(vb || '').toLowerCase();
        }

        if (va < vb) return sortOrder.value === 'asc' ? -1 : 1;
        if (va > vb) return sortOrder.value === 'asc' ? 1 : -1;
        return 0;
    });
});


</script>