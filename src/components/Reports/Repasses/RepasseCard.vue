<template>
    <div
        class="relative mb-2 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 filter shadow-md hover:shadow-black/30 shadow-black/20 duration-200">
        <!-- Conteúdo do repasse -->
        <div class="flex flex-col">
            <div class="flex justify-between items-center">
                <div class="flex gap-2 items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <span>#{{ repasse.ID }}</span>
                    <a :href="'https://menin.cvcrm.com.br/gestor/comercial/reservas/' + repasse.idreserva + '/administrar'"
                        target="_blank" v-tippy="repasse.status_reserva" @mousedown.stop
                        class="text-white px-2 py-0.5 rounded-md shadow cursor-pointer"
                        :class="repasse.status_reserva === 'Vendida' ? 'bg-green-600' : 'bg-red-500'">
                        {{ repasse.status_reserva }}
                    </a>
                </div>
                <div class="flex items-center gap-2">
                    <!-- Novo botão para abrir o modal de pagamentos -->
                    <reserva-pagamentos-modal :repasse="props.repasse" :idreserva="repasse.idreserva"
                        :formatMoney="formatMoney" />

                    <button v-tippy="'CV CRM'">
                        <a :href="'https://menin.cvcrm.com.br/gestor/financeiro/repasses/' + repasse.ID + '/documentos'"
                            target="_blank">
                            <img src="/CVLogo.png" alt="CV CRM" class="h-5 min-w-5 drop-shadow">
                        </a>
                    </button>
                </div>
            </div>
            <div class="border-b mt-2 border-gray-300 dark:border-gray-700 w-full"></div>
        </div>

        <div class="text-sm mt-3 mx-1">
            <p class="truncate">
                <i class="fas text-lg fa-building"></i> {{ repasse.empreendimento }}<br>
            </p>
            <p class="text-xs my-0.5 text-gray-400 truncate">
                {{ repasse.etapa }} | {{ repasse.bloco }} | {{ repasse.unidade }}
            </p>
            <p class="truncate text-lg">
                <i class="fas fa-money-bill"></i> {{ formatMoney(repasse.valor_contrato) }}
            </p>
        </div>

        <div class="relative flex items-center w-full">
            <!-- Linha central -->
            <div class="absolute left-0 right-0 h-[1px] bg-gray-300 dark:bg-gray-700"></div>
            <!-- Botão sobreposto -->
            <button @click.stop="$emit('toggle-details', repasse.ID)" @mousedown.stop
                class="relative m-auto z-10 px-3 py-0.5 text-xs dark:bg-gray-800 dark:hover:bg-gray-900 bg-gray-100 hover:bg-gray-100 border-gray-300 border dark:border-gray-700 dark:text-gray-300 text-gray-400 rounded-md">
                {{ expandedDetails[repasse.ID] ? '- Detalhes' : '+ Detalhes' }}
            </button>
        </div>

        <!-- Informações Extras (Exibidas se expandido) -->
        <div v-if="expandedDetails[repasse.ID]" class="text-gray-700 dark:text-gray-400 flex text-center text-sm">
            <div class="flex-1">
                <span class="font-semibold text-xs text-gray-800 dark:text-gray-200">Criado há:</span>
                <br> {{ timeDifference(repasse.data_contrato_contab) }}<br>
            </div>
            <div class="border-[0.5px] mt-2 border-gray-300 dark:border-gray-700"></div>
            <div v-if="status.nome === 'Em espera'" class="flex-1">
                <span class="font-semibold text-xs text-gray-800 dark:text-gray-200">Na situação há:</span>
                <br> {{ timeDifference(repasse.data_contrato_contab) }}<br>
            </div>
            <div v-else class="flex-1">
                <span class="font-semibold text-xs text-gray-800 dark:text-gray-200">Na situação há:</span>
                <br> {{ timeDifference(repasse.data_status_repasse) }}<br>
            </div>
        </div>
    </div>
</template>

<script setup>
import ReservaPagamentosModal from './ReservaPagamentosModal.vue';

const props = defineProps({
    repasse: {
        type: Object,
        required: true
    },
    expandedDetails: {
        type: Object,
        required: true
    },
    status: {
        type: Object,
        required: true
    },
    timeDifference: {
        type: Function,
        required: true
    },
    formatMoney: {
        type: Function,
        required: true
    }
});
</script>