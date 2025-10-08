<template>
    <div class="mt-4">
        <div class="overflow-x-auto rounded-lg border border-gray-400/30 shadow-md">
            <table class="min-w-full text-sm">
                <thead
                    class="bg-gradient-to-r from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700 text-left sticky top-0">
                    <tr>
                        <th class="p-3 font-semibold">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-user text-blue-500"></i>
                                Nome
                            </div>
                        </th>
                        <!-- <th class="p-3 font-semibold">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-envelope text-green-500"></i>
                                Email
                            </div>
                        </th>
                        <th class="p-3 font-semibold">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-phone text-purple-500"></i>
                                Telefone
                            </div>
                        </th> -->
                        <th class="p-3 font-semibold hidden md:table-cell">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-building text-orange-500"></i>
                                Imobiliária
                            </div>
                        </th>
                        <th class="p-3 font-semibold hidden lg:table-cell">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-user-tie text-indigo-500"></i>
                                Corretor
                            </div>
                        </th>
                        <th class="p-3 font-semibold hidden xl:table-cell">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-bullhorn text-pink-500"></i>
                                Mídia
                            </div>
                        </th>
                        <th class="p-3 font-semibold hidden xl:table-cell">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-bullhorn text-pink-500"></i>
                                Origem
                            </div>
                        </th>
                        <th class="p-3 font-semibold">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-chart-pie text-yellow-500"></i>
                                Situação
                            </div>
                        </th>
                        <th class="p-3 font-semibold hidden lg:table-cell">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-city text-teal-500"></i>
                                Empreendimento
                            </div>
                        </th>
                        <th class="p-3 font-semibold">
                            <div class="flex items-center gap-2">
                                <i class="fas fa-calendar text-red-500"></i>
                                Cadastro
                            </div>
                        </th>
                        <th class="p-3 text-right font-semibold">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="lead in leads" :key="lead.idlead"
                        class="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <td class="p-3">
                            <span class="font-medium truncate block max-w-[200px]" :title="lead.nome">
                                {{ lead.nome }}
                            </span>
                        </td>

                        <!-- <td class="p-3">
                            <a v-if="lead.email" :href="`mailto:${lead.email}`"
                                class="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                                :title="lead.email">
                                <i class="fas fa-envelope text-xs"></i>
                                {{ lead.email }}
                            </a>
                            <span v-else class="text-gray-400">—</span>
                        </td>

                        <td class="p-3">
                            <a v-if="lead.telefone" :href="`https://wa.me/${lead.telefone.replace(/\D/g, '')}`"
                                target="_blank"
                                class="text-green-600 dark:text-green-400 hover:underline flex items-center gap-1">
                                <i class="fab fa-whatsapp text-xs"></i>
                                {{ lead.telefone }}
                            </a>
                            <span v-else class="text-gray-400">—</span>
                        </td> -->

                        <td class="p-3 truncate max-w-[150px] hidden md:table-cell" :title="lead.imobiliaria?.nome">
                            {{ lead.imobiliaria?.nome || '—' }}
                        </td>

                        <td class="p-3 truncate max-w-[150px] hidden lg:table-cell" :title="lead.corretor?.nome">
                            {{ lead.corretor?.nome || '—' }}
                        </td>

                        <td class="p-3 hidden xl:table-cell">
                            <span v-if="lead.midia_principal"
                                class="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs truncate max-w-[120px]"
                                :title="lead.midia_principal">
                                {{ lead.midia_principal }}
                            </span>
                            <span v-else class="text-gray-400">—</span>
                        </td>

                        <td class="p-3 hidden xl:table-cell">
                            <span v-if="lead.origem"
                                class="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs truncate max-w-[120px]"
                                :title="lead.midia_principal">
                                {{ lead.origem }}
                            </span>
                            <span v-else class="text-gray-400">—</span>
                        </td>

                        <td class="p-3">
                            <span :class="[
                                'inline-block px-2 py-1 rounded text-xs font-medium truncate max-w-[140px]',
                                getStatusColor(lead.situacao_nome)
                            ]" :title="lead.situacao_nome">
                                {{ lead.situacao_nome || 'Sem situação' }}
                            </span>
                        </td>

                        <td class="p-3 truncate max-w-[180px] hidden lg:table-cell">
                            <a v-if="lead.empreendimento?.[0]?.nome"
                                :href="`/buildings?search=${lead.empreendimento[0].nome}`" target="_blank"
                                class="text-indigo-600 dark:text-indigo-400 hover:underline"
                                :title="lead.empreendimento[0].nome">
                                {{ lead.empreendimento[0].nome }}
                            </a>
                            <span v-else class="text-gray-400">—</span>
                        </td>

                        <td class="p-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {{ formatDateHour(lead.data_cad) }}
                        </td>

                        <td class="p-3 text-right">
                            <button @click="$emit('abrirModal', [lead])"
                                class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium transition-colors">
                                <i class="fas fa-eye mr-1"></i>
                                Ver
                            </button>
                        </td>
                    </tr>

                    <!-- Estado vazio -->
                    <tr v-if="!leads?.length">
                        <td colspan="10" class="p-8 text-center">
                            <div class="flex flex-col items-center gap-3">
                                <i class="fas fa-inbox text-5xl text-gray-400"></i>
                                <p class="text-gray-400 text-lg">Nenhum lead encontrado</p>
                                <p class="text-gray-500 text-sm">Tente ajustar os filtros ou adicionar novos leads</p>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Paginação simples (se necessário) -->
        <div v-if="leads?.length > 0"
            class="mt-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <span>Mostrando {{ leads.length }} leads</span>
        </div>
    </div>
</template>

<script setup>
import { formatDateHour } from '@/utils/Leads/formatters';

defineProps({
    leads: { type: Array, required: true }
});

defineEmits(['abrirModal']);

function getStatusColor(status) {
    const colorMap = {
        'Aguardando Atendimento Corretor': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        'Em Atendimento': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'Lead Qualificado': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'Em Negociação': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'Descartado': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        'Em Análise de Crédito': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        'Com Reserva': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
        'Venda Realizada': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
}
</script>