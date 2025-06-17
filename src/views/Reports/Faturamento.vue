<template>
    <div class="w-full h-[calc(100%-4rem)] relative overflow-hidden flex">
        <!-- Área principal -->
        <div class="w-10/12 ps-4 pe-2 py-4 h-full flex flex-col overflow-hidden">
            <div class="flex items-center pb-2">
                <h1 class="text-xl md:text-2xl font-bold">Faturamento Sienge</h1>
                <Favorite :router="'/comercial/faturamento'" :section="'Faturamento'" />
            </div>


            <div class="max-w-5xl mx-auto p-4 space-y-6">
                <h1 class="text-2xl font-bold">Buscar Contratos</h1>

                <form @submit.prevent="aplicarFiltros" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input v-model="filtros.companyId" type="number" placeholder="ID da Empresa" class="input" />
                    <input v-model="filtros.enterpriseId" type="number" placeholder="ID do Empreendimento"
                        class="input" />
                    <input v-model="filtros.enterpriseName" type="text" placeholder="Nome do Empreendimento"
                        class="input" />

                    <div>
                        <label class="block text-sm font-medium">Situação (segure Ctrl p/ múltiplos)</label>
                        <select v-model="filtros.situation" multiple class="input">
                            <option value="0">0 - Solicitado</option>
                            <option value="1">1 - Autorizado</option>
                            <option value="2">2 - Emitido</option>
                            <option value="3">3 - Cancelado</option>
                        </select>
                    </div>

                    <input v-model="filtros.initialIssueDate" type="date" placeholder="Data Emissão Início"
                        class="input" />
                    <input v-model="filtros.finalIssueDate" type="date" placeholder="Data Emissão Fim" class="input" />

                    <input v-model="filtros.initialCancelDate" type="date" placeholder="Data Cancelamento Início"
                        class="input" />
                    <input v-model="filtros.finalCancelDate" type="date" placeholder="Data Cancelamento Fim"
                        class="input" />

                    <label class="flex items-center space-x-2">
                        <input v-model="filtros.distrato" type="checkbox" />
                        <span>Buscar Distratos</span>
                    </label>

                    <button type="submit" class="btn col-span-full">Buscar</button>
                </form>

                <div v-if="store.loading" class="text-blue-500">Carregando contratos...</div>
                <div v-if="store.error" class="text-red-500">{{ store.error }}</div>

                <div v-if="store.contratos.length > 0">
                    <h2 class="text-lg font-bold mt-6">
                        Resultados: {{ store.count }}
                    </h2>

                    <!-- Soma de contratos com financialInstitutionDate -->
                    <p class="text-sm text-gray-500 mb-2">
                        Com data de instituição financeira:
                        {{
                            store.contratos.filter(c => c.financialInstitutionDate).length
                        }}
                    </p>

                    <ul class="divide-y">
                        <li v-for="contrato in store.contratos" :key="contrato.id" class="py-2">
                            <pre>{{ contrato.financialInstitutionDate }}</pre>
                        </li>
                    </ul>
                </div>


                <div v-else-if="!store.loading" class="text-gray-500">Nenhum contrato encontrado.</div>
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

    const query = {
        ...filtros.value,
        initialIssueDate: filtros.value.initialIssueDate || firstDayOfMonth,
        finalIssueDate: filtros.value.finalIssueDate || today,
    }

    if (filtros.value.distrato) {
        query.initialCancelDate = filtros.value.initialCancelDate || firstDayOfMonth
        query.finalCancelDate = filtros.value.finalCancelDate || today
    }

    // Remove campos vazios
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