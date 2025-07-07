<template>
    <div class="flex-1 min-h-[calc(100%-4rem)] bg-gray-50 dark:bg-gray-800 relative overflow-x-hidden flex ms-4 md:ms-16 p-3 md:p-6">
        <div class="w-full justify-center flex items-center">
            <div class="bg-white dark:bg-gray-700 rounded-2xl shadow-xl p-8 w-full max-w-4xl">
                <div class="text-center mb-6">
                    <div class="flex items-center justify-center">
                        <h1 class="text-xl md:text-2xl font-bold">Validador de Contratos</h1>
                        <Favorite :router="'/tools/validator'" :section="'Validador'" />
                    </div>
                    <p class="text-gray-700 dark:text-gray-400">Validação automática de documentos da construtora</p>
                </div>

                <!-- Formulário de Upload -->
                <form @submit.prevent="handleSubmit" class="space-y-6 mb-8">

                    <div class="flex flex-col md:flex-row items-center justify-center gap-4">
                        <!-- Upload Contrato Caixa -->
                        <div class="w-full">
                            <p class="md:text-2xl text-gray-500 dark:text-gray-300 font-medium p-1">Contrato Caixa</p>
                            <label for="dropzone-contrato"
                                class="flex flex-col items-center justify-center relative w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                                <div
                                    class="flex flex-col items-center justify-center pt-5 pb-6 text-gray-500 dark:text-gray-400">
                                    <i class="far fa-file-pdf text-4xl mb-2"></i>
                                    <p v-if="contratoCaixa?.name"
                                        class="mt-2 text-xs text-center font-medium text-gray-700 dark:text-gray-300">
                                        {{ contratoCaixa?.name }}
                                    </p>
                                    <p v-else class="mb-2 text-sm text-center">
                                        <span class="font-semibold">Clique para selecionar</span><br />
                                        ou arraste e solte seu arquivo<br>
                                        <span class="text-xs">Somente PDF (MAX. 1MB)</span>
                                    </p>
                                </div>
                                <input type="file" id="dropzone-contrato" accept="application/pdf"
                                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    @change="e => contratoCaixa = e.target.files[0]" />
                            </label>
                        </div>

                        <!-- Upload Confissão de Dívida -->
                        <div class="w-full">
                            <p class="md:text-2xl text-gray-500 dark:text-gray-300 font-medium p-1">Confissão de Dívida
                            </p>
                            <label for="dropzone-confissao"
                                class="flex flex-col items-center justify-center relative w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                                <div
                                    class="flex flex-col items-center justify-center pt-5 pb-6 text-gray-500 dark:text-gray-400">
                                    <i class="far fa-file-pdf text-4xl mb-2"></i>
                                    <p v-if="confissaoDivida?.name"
                                        class="mt-2 text-xs text-center font-medium text-gray-700 dark:text-gray-300">
                                        {{ confissaoDivida?.name }}
                                    </p>
                                    <p v-else class="mb-2 text-sm text-center">
                                        <span class="font-semibold">Clique para selecionar</span><br />
                                        ou arraste e solte seu arquivo<br>
                                        <span class="text-xs">Somente PDF (MAX. 1MB)</span>
                                    </p>
                                </div>
                                <input type="file" id="dropzone-confissao" accept="application/pdf"
                                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    @change="e => confissaoDivida = e.target.files[0]" />
                            </label>
                        </div>
                    </div>


                    <button type="submit" :disabled="loading"
                        class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100">
                        <span v-if="loading" class="flex items-center justify-center">
                            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg"
                                fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                    stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                                </path>
                            </svg>
                            Validando documentos...
                        </span>
                        <span v-else><i class="fas fa-robot text-xl"></i> Validar Documentos</span>
                    </button>
                </form>

                <!-- Resultado da Validação -->
                <div v-if="resultado" class="space-y-6">
                    <!-- Status Geral -->
                    <div class="text-center">
                        <div v-if="resultado.status === 'APROVADO'"
                            class="inline-flex items-center px-6 py-3 bg-green-100/80 shadow-sm text-green-800 rounded-full font-bold text-lg">
                            <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clip-rule="evenodd"></path>
                            </svg>
                            DOCUMENTOS APROVADOS
                        </div>
                        <div v-else-if="resultado.status === 'REPROVADO'"
                            class="inline-flex items-center px-6 py-3 bg-red-100/80 shadow-sm text-red-800 rounded-full font-bold text-lg">
                            <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clip-rule="evenodd"></path>
                            </svg>
                            DOCUMENTOS REPROVADOS
                        </div>
                        <div v-else
                            class="inline-flex items-center px-6 py-3 bg-yellow-100/80 shadow-sm text-yellow-800 rounded-full font-bold text-lg">
                            <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clip-rule="evenodd"></path>
                            </svg>
                            ERRO NA VALIDAÇÃO
                        </div>
                    </div>

                    <!-- Detalhes das Mensagens -->
                    <div v-if="resultado.mensagens && Array.isArray(resultado.mensagens)" class="space-y-4">
                        <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 border-b-2 border-gray-200 pb-2">
                            📋 Detalhes da Validação
                        </h2>

                        <div v-for="(msg, index) in resultado.mensagens" :key="index"
                            class="border-l-4 p-4 rounded-r-lg transition-all shadow-sm hover:shadow-md"
                            :class="getMessageStyle(msg.nivel)">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <div class="flex items-center mb-2">
                                        <span class="text-lg mr-2">{{ getIcon(msg.nivel) }}</span>
                                        <h3 class="font-bold text-lg text-gray-600">{{ msg.tipo }}</h3>
                                        <span class="ml-auto px-3 py-1 text-xs font-semibold rounded-full"
                                            :class="getBadgeStyle(msg.nivel)">
                                            {{ getNivelText(msg.nivel) }}
                                        </span>
                                    </div>
                                    <p class="text-gray-700 leading-relaxed">{{ msg.descricao }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Resumo dos níveis -->
                        <div class="bg-gray-50 dark:bg-gray-600 rounded-lg p-4 mt-6">
                            <h3 class="font-bold text-gray-700 dark:text-gray-100 mb-3">📊 Resumo da Validação</h3>
                            <div class="grid grid-cols-3 gap-4 text-center">
                                <div class="bg-green-100/90 shadow-sm hover:shadow-md rounded-lg p-3">
                                    <div class="text-2xl font-bold text-green-800">{{ getCountByLevel('correto') }}
                                    </div>
                                    <div class="text-sm text-green-600">Corretos</div>
                                </div>
                                <div class="bg-yellow-100/90 shadow-sm hover:shadow-md rounded-lg p-3">
                                    <div class="text-2xl font-bold text-yellow-800">{{ getCountByLevel('alerta') }}
                                    </div>
                                    <div class="text-sm text-yellow-600">Alertas</div>
                                </div>
                                <div class="bg-red-100/90 shadow-sm hover:shadow-md rounded-lg p-3">
                                    <div class="text-2xl font-bold text-red-800">{{ getCountByLevel('incorreto') }}
                                    </div>
                                    <div class="text-sm text-red-600">Incorretos</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Erro de parsing -->
                    <div v-else-if="resultado.status === 'ERRO'" class="bg-red-100/90 border border-red-200 rounded-lg p-6">
                        <h3 class="font-bold text-red-800 mb-3">⚠️ Erro na Validação</h3>
                        <div
                            class="bg-white dark:bg-gray-600 rounded border border-red-200 p-4 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-64">
                            {{ resultado.resultado }}</div>
                    </div>
                </div>
            </div>
        </div>

        <History  />

    </div>
</template>

<script setup>
import { ref } from 'vue' 
import Favorite from "@/components/config/Favorite.vue";
import { useAIStore } from '@/stores/Config/aiStore.js'
import History from '@/components/tools/History.vue';

const aiStore = useAIStore();

const contratoCaixa = ref(null)
const confissaoDivida = ref(null)
const resultado = ref(null)
const loading = ref(false)

const handleSubmit = async () => {
  loading.value = true;
  resultado.value = null;

  const formData = new FormData();
  formData.append('contrato_caixa', contratoCaixa.value);
  formData.append('confissao_divida', confissaoDivida.value);

  await aiStore.validateDocuments(formData);
  resultado.value = aiStore.validatorResult;

  loading.value = false;
};

const getMessageStyle = (nivel) => {
    switch (nivel) {
        case 'correto':
            return 'border-green-400/20 bg-green-50'
        case 'alerta':
            return 'border-yellow-400/20 bg-yellow-50'
        case 'incorreto':
            return 'border-red-400/20 bg-red-50'
        default:
            return 'border-gray-400/20 bg-gray-50'
    }
}

const getBadgeStyle = (nivel) => {
    switch (nivel) {
        case 'correto':
            return 'bg-green-200 text-green-800'
        case 'alerta':
            return 'bg-yellow-200 text-yellow-800'
        case 'incorreto':
            return 'bg-red-200 text-red-800'
        default:
            return 'bg-gray-200 text-gray-800'
    }
}

const getIcon = (nivel) => {
    switch (nivel) {
        case 'correto':
            return '✅'
        case 'alerta':
            return '⚠️'
        case 'incorreto':
            return '❌'
        default:
            return '❓'
    }
}

const getNivelText = (nivel) => {
    switch (nivel) {
        case 'correto':
            return 'CORRETO'
        case 'alerta':
            return 'ALERTA'
        case 'incorreto':
            return 'INCORRETO'
        default:
            return 'DESCONHECIDO'
    }
}

const getCountByLevel = (nivel) => {
    if (!resultado.value?.mensagens) return 0
    return resultado.value.mensagens.filter(msg => msg.nivel === nivel).length
}

</script>

<style scoped>
.group:hover {
  transform: translateX(-18rem);
}
</style>