<template>
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
                <tr v-for="reserva in sortedReservas" :key="reserva.ID" class="border-b border-gray-600 text-sm">
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
                            @click="emitShowReservaDetails(reserva)" v-tippy="'Detalhes'"></i>
                    </td>
                </tr>
            </tbody>
            <tbody v-else>
                <tr>
                    <td colspan="9" class="p-3 text-center">Nenhuma reserva encontrada.</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    reservas: {
        type: Array,
        required: true,
    }
});

const emit = defineEmits(['show-reserva-details']);

// Função para emitir o evento com a reserva selecionada
const emitShowReservaDetails = (reserva) => {
    emit('show-reserva-details', reserva);
};

// Estado de ordenação
const sortColumn = ref(null);
const sortOrder = ref(null);

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

// Computed que retorna o array ordenado
const sortedReservas = computed(() => {
    const data = [...props.reservas];
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