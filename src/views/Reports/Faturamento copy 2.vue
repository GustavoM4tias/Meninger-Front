<template>
    <div class="w-full h-[calc(100%-4rem)] relative overflow-hidden flex">
        <!-- Área principal -->
        <div class="w-10/12 ps-4 pe-2 py-4 h-full flex flex-col overflow-hidden">
            <div class="flex items-center pb-2">
                <h1 class="text-xl md:text-2xl font-bold">Faturamento Sienge</h1>
                <Favorite :router="'/comercial/faturamento'" :section="'Faturamento'" />
            </div>

            <div class="max-w-full mx-auto p-4 space-y-6">
                <h1 class="text-2xl font-bold">Buscar Contratos</h1>

                <!-- Formulário mantendo todos os campos e funcionalidades -->
                <form @submit.prevent="aplicarFiltros">
                    <section
                        class="flex items-center h-auto justify-between p-4 rounded-xl shadow bg-gray-200 dark:bg-gray-700">
                        <div class="flex gap-4 flex-wrap items-center">
                            <!-- ID da Empresa -->
                            <input v-model="filtros.companyId" type="number" placeholder="ID da Empresa"
                                class="px-3 py-2.5 border rounded-lg focus:outline-none bg-transparent border-gray-500 text-center" />

                            <!-- ID do Empreendimento -->
                            <input v-model="filtros.enterpriseId" type="number" placeholder="ID do Empreendimento"
                                class="px-3 py-2.5 border rounded-lg focus:outline-none bg-transparent border-gray-500 text-center" />

                            <!-- Nome do Empreendimento -->
                            <div class="select flex relative">
                                <input v-model="filtros.enterpriseName" type="text" placeholder="Nome do Empreendimento"
                                    class="w-full py-2.5 px-3 border rounded-lg focus:outline-none bg-transparent border-gray-500 text-center min-w-48" />
                            </div>

                            <!-- Situação (múltipla seleção) -->
                            <div v-if="!filtros.distrato" class="flex flex-col items-center relative">
                                <label class="block text-sm font-medium mb-1 text-center">Situação (Ctrl p/
                                    múltiplos)</label>
                                <select v-model="filtros.situation" multiple
                                    class="w-full py-2.5 px-3 border rounded-lg appearance-none focus:outline-none z-10 bg-transparent border-gray-500 pe-10 text-center min-w-40">
                                    <option class="text-gray-800" value="0">0 - Solicitado</option>
                                    <option class="text-gray-800" value="1">1 - Autorizado</option>
                                    <option class="text-gray-800" value="2">2 - Emitido</option>
                                    <option class="text-gray-800" value="3">3 - Cancelado</option>
                                </select>
                                <i class="fas fa-chevron-down top-[65%] absolute right-3 pointer-events-none"></i>
                            </div>


                            <!-- Data Emissão Início e Fim -->
                            <div class="flex items-center gap-2">
                                <input v-model="filtros.initialIssueDate" type="date" placeholder="Data Emissão Início"
                                    class="px-1 py-2.5 border rounded-lg focus:outline-none bg-transparent border-gray-500 text-center" />
                                <span class="text-sm">até</span>
                                <input v-model="filtros.finalIssueDate" type="date" placeholder="Data Emissão Fim"
                                    class="px-1 py-2.5 border rounded-lg focus:outline-none bg-transparent border-gray-500 text-center" />
                            </div>


                            <!-- Checkbox Buscar Distratos -->
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input v-model="filtros.distrato" type="checkbox" />
                                <span class="text-sm font-medium">Buscar Distratos</span>
                            </label>

                            <!-- Botão Buscar -->
                            <div>
                                <button type="submit"
                                    class="flex px-4 py-2.5 text-lg font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600 focus:outline-none">
                                    <i class="fas fa-filter pe-1 my-auto"></i>
                                    Buscar
                                </button>
                            </div>
                        </div>
                    </section>
                </form>

                <!-- Mensagem de erro -->
                <div v-if="store.error" class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    {{ store.error }}
                </div>

                <!-- Resultados -->
                <div v-if="store.contratos.length > 0">
                    <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
                        <h2 class="text-lg font-bold mb-4">
                            Resultados: {{ store.count }}
                        </h2>

                        <!-- Soma de contratos com financialInstitutionDate -->
                        <p class="text-sm text-gray-500 mb-4">
                            Com data de instituição financeira:
                            {{store.contratos.filter(c => c.financialInstitutionDate).length}}
                        </p>

                        <div class="divide-y divide-gray-200 dark:divide-gray-700">
                            <div v-for="contrato in store.contratos" :key="contrato.id" class="py-3">
                                <pre class="text-sm">{{ contrato.companyId }}</pre>
                                <pre class="text-sm">{{ contrato.receivableBillId }}</pre>
                                <pre class="text-sm">{{ contrato.situation }}</pre>
                                <pre class="text-sm">{{ contrato.financialInstitutionDate }}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useContratosStore } from '@/stores/Reports/Contracts/contractStore';
import Favorite from "@/components/config/Favorite.vue";
// Toast de notificação
import { useToast } from 'vue-toastification';
const toast = useToast();
import dayjs from 'dayjs'

const store = useContratosStore()

const filtros = ref({
    companyId: '',
    enterpriseId: '',
    enterpriseName: '',
    situation: [],
    initialIssueDate: '',
    finalIssueDate: '',
    initialCancelDate: '',
    finalCancelDate: '',
    distrato: false
})

// Define datas padrão se usuário não preencher
const formatDate = (date) => dayjs(date).format('YYYY-MM-DD')

const aplicarFiltros = async () => {
    const today = formatDate(new Date())
    const firstDayOfMonth = formatDate(dayjs().startOf('month'))

    // Cria cópia dos filtros
    const query = { ...filtros.value }

    // Datas de emissão (usar padrão só se estiver realmente vazio)
    query.initialIssueDate = query.initialIssueDate?.trim() || firstDayOfMonth
    query.finalIssueDate = query.finalIssueDate?.trim() || today

    // Se distrato for true, aplicar padrão se não informado
    if (query.distrato) {
        query.initialCancelDate = query.initialCancelDate?.trim() || firstDayOfMonth
        query.finalCancelDate = query.finalCancelDate?.trim() || today
    } else {
        // Se for falso, remove
        delete query.initialCancelDate
        delete query.finalCancelDate
    }

    // Remove campos vazios ou arrays vazios
    Object.keys(query).forEach((key) => {
        if (query[key] === '' || (Array.isArray(query[key]) && query[key].length === 0)) {
            delete query[key]
        }
    })

    await store.fetchContratos(query)
}


onMounted(() => {
    aplicarFiltros()
})
</script>
