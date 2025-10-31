<template>

    <div class="h-auto min-h-full overflow-x-hidden relative dark:bg-gray-900 bg-gray-100">
        <div class="max-w-7xl mx-auto px-6 py-8">
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">

                <!-- Sidebar -->
                <aside class="lg:col-span-1 order-2">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
                        Como Validar
                    </h3>

                    <div
                        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6 sticky top-8">
                        <div class="mb-6">
                            <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Dicas Rápidas</h4>
                            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li class="flex items-start"><span class="text-green-500 mr-2 mt-0.5">•</span> Envie
                                    apenas PDFs legíveis <br>(até 1MB)</li>
                                <li class="flex items-start"><span class="text-green-500 mr-2 mt-0.5">•</span> Envie os
                                    documentos na ordem correta<br>(Contrato CEF | Confissão)</li>
                                <li class="flex items-start"><span class="text-green-500 mr-2 mt-0.5">•</span> Aguarde o
                                    resultado <br>(pode levar até 100 segundos).</li>
                                <li class="flex items-start"><span class="text-green-500 mr-2 mt-0.5">•</span> Consulte
                                    o histórico na tela ou no painel lateral</li>
                            </ul>
                        </div>

                        <!-- Estatísticas simples (usa aiStore se já estiver populado) -->
                        <div class="border-t border-gray-300 dark:border-gray-700 pt-6">
                            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Estatísticas</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-500">Validações totais</span>
                                    <span class="font-medium">{{ aiStore.validatorHistory?.length || 0 }}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-500">Aprovadas</span>
                                    <span class="font-medium text-green-600">
                                        {{(aiStore.validatorHistory || []).filter(v => v.status === 'APROVADO').length
                                        }}
                                    </span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-500">Reprovadas</span>
                                    <span class="font-medium text-red-600">
                                        {{(aiStore.validatorHistory || []).filter(v => v.status === 'REPROVADO').length
                                        }}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                <!-- Main Content -->
                <main class="lg:col-span-3 md:order-3">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Validador de
                                Contratos</h1>
                            <Favorite :router="'/tools/validator'" :section="'Validador'" />
                        </div>
                    </div>
                    <p class="text-gray-700 dark:text-gray-400 mb-4">Validação automática de documentos da construtora
                    </p>

                    <!-- Card do Form -->
                    <section class="mb-8">
                        <div
                            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
                            <div
                                class="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-300 dark:border-gray-700">
                                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Enviar Documentos</h2>
                                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Selecione os arquivos em PDF
                                    (máx. 1MB cada)</p>
                            </div>

                            <!-- Formulário de Upload -->
                            <form @submit.prevent="handleSubmit" class="p-6 space-y-6" novalidate>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <!-- Upload Contrato Caixa -->
                                    <div>
                                        <label for="dropzone-contrato"
                                            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Contrato Caixa <span class="text-red-500">*</span>
                                        </label>
                                        <label for="dropzone-contrato"
                                            class="flex flex-col items-center justify-center relative w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-100 dark:bg-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600">
                                            <div
                                                class="flex flex-col items-center justify-center px-3 text-gray-500 dark:text-gray-300">
                                                <i class="far fa-file-pdf text-3xl mb-2"></i>
                                                <p v-if="contratoCaixa?.name"
                                                    class="mt-1 text-xs text-center font-medium text-gray-700 dark:text-gray-200 truncate w-11/12">
                                                    {{ contratoCaixa?.name }}
                                                </p>
                                                <p v-else class="mb-2 text-sm text-center">
                                                    <span class="font-semibold">Clique para selecionar</span><br />
                                                    ou arraste e solte seu arquivo<br />
                                                    <span class="text-xs text-gray-500">Somente PDF (MAX. 1MB)</span>
                                                </p>
                                            </div>
                                            <input type="file" id="dropzone-contrato" accept="application/pdf"
                                                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                @change="e => contratoCaixa = e.target.files[0]"
                                                aria-label="Selecionar PDF de Contrato Caixa" />
                                        </label>
                                    </div>

                                    <!-- Upload Confissão de Dívida -->
                                    <div>
                                        <label for="dropzone-confissao"
                                            class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Confissão de Dívida <span class="text-red-500">*</span>
                                        </label>
                                        <label for="dropzone-confissao"
                                            class="flex flex-col items-center justify-center relative w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-100 dark:bg-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600">
                                            <div
                                                class="flex flex-col items-center justify-center px-3 text-gray-500 dark:text-gray-300">
                                                <i class="far fa-file-pdf text-3xl mb-2"></i>
                                                <p v-if="confissaoDivida?.name"
                                                    class="mt-1 text-xs text-center font-medium text-gray-700 dark:text-gray-200 truncate w-11/12">
                                                    {{ confissaoDivida?.name }}
                                                </p>
                                                <p v-else class="mb-2 text-sm text-center">
                                                    <span class="font-semibold">Clique para selecionar</span><br />
                                                    ou arraste e solte seu arquivo<br />
                                                    <span class="text-xs text-gray-500">Somente PDF (MAX. 1MB)</span>
                                                </p>
                                            </div>
                                            <input type="file" id="dropzone-confissao" accept="application/pdf"
                                                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                @change="e => confissaoDivida = e.target.files[0]"
                                                aria-label="Selecionar PDF de Confissão de Dívida" />
                                        </label>
                                    </div>
                                </div>

                                <!-- Ações -->
                                <div
                                    class="flex items-center justify-end pt-4 border-t border-gray-300 dark:border-gray-700">
                                    <button type="submit" :disabled="loading"
                                        class="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                        :aria-busy="loading ? 'true' : 'false'"
                                        :aria-disabled="loading ? 'true' : 'false'">
                                        <i v-if="loading" class="fas fa-spinner fa-spin mr-2"></i>
                                        <i v-else class="fas fa-robot mr-2"></i>
                                        {{ loading ? 'Validando documentos...' : 'Validar Documentos' }}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>

                    <!-- Resultado da Validação -->
                    <section v-if="resultado" class="mb-8" aria-live="polite">
                        <div
                            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
                            <div
                                class="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-300 dark:border-gray-700">
                                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Resultado da Validação
                                </h2>
                            </div>

                            <div class="p-6 space-y-6">
                                <!-- Status Geral -->
                                <div class="text-center">
                                    <div v-if="resultado.status === 'APROVADO'"
                                        class="inline-flex items-center px-6 py-3 bg-green-100/20 text-green-800 dark:text-green-200 rounded-full font-bold">
                                        <i class="fas fa-check mr-2"></i> DOCUMENTOS APROVADOS
                                    </div>
                                    <div v-else-if="resultado.status === 'REPROVADO'"
                                        class="inline-flex items-center px-6 py-3 bg-red-100/20 text-red-800 dark:text-red-200 rounded-full font-bold">
                                        <i class="fas fa-xmark mr-2"></i> DOCUMENTOS REPROVADOS
                                    </div>
                                    <div v-else
                                        class="inline-flex items-center px-6 py-3 bg-yellow-100/20 text-yellow-800 dark:text-yellow-200 rounded-full font-bold">
                                        <i class="fas fa-triangle-exclamation mr-2"></i> ERRO NA VALIDAÇÃO
                                    </div>
                                </div>

                                <!-- Detalhes das Mensagens -->
                                <div v-if="resultado.mensagens && Array.isArray(resultado.mensagens)" class="space-y-4">
                                    <h3
                                        class="text-base font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                                        📋 Detalhes da Validação
                                    </h3>

                                    <div v-for="(msg, index) in resultado.mensagens" :key="index"
                                        class="border-l-4 p-4 rounded-r-lg transition-all shadow-sm"
                                        :class="getMessageStyle(msg.nivel)">
                                        <div class="flex items-start justify-between gap-3">
                                            <div class="flex-1">
                                                <div class="flex items-center gap-2 mb-2">
                                                    <span class="text-lg">{{ getIcon(msg.nivel) }}</span>
                                                    <h4 class="font-bold text-gray-700 dark:text-gray-200">{{ msg.tipo
                                                        }}</h4>
                                                </div>
                                                <p class="text-gray-700 dark:text-gray-300 leading-relaxed">{{
                                                    msg.descricao }}</p>
                                            </div>
                                            <span class="ml-auto px-3 py-1 text-xs font-semibold rounded-full"
                                                :class="getBadgeStyle(msg.nivel)">
                                                {{ getNivelText(msg.nivel) }}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Resumo -->
                                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mt-4">
                                        <h4 class="font-bold text-gray-700 dark:text-gray-100 mb-3">📊 Resumo da
                                            Validação</h4>
                                        <div class="grid grid-cols-3 gap-4 text-center">
                                            <div class="bg-green-100 rounded-lg p-3">
                                                <div class="text-2xl font-bold text-green-800">{{
                                                    getCountByLevel('correto') }}</div>
                                                <div class="text-sm text-green-700">Corretos</div>
                                            </div>
                                            <div class="bg-yellow-100 rounded-lg p-3">
                                                <div class="text-2xl font-bold text-yellow-800">{{
                                                    getCountByLevel('alerta') }}</div>
                                                <div class="text-sm text-yellow-700">Alertas</div>
                                            </div>
                                            <div class="bg-red-100 rounded-lg p-3">
                                                <div class="text-2xl font-bold text-red-800">{{
                                                    getCountByLevel('incorreto') }}</div>
                                                <div class="text-sm text-red-700">Incorretos</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Erro de parsing -->
                                <div v-else-if="resultado.status === 'ERRO'"
                                    class="bg-red-50 border border-red-200 rounded-lg p-6">
                                    <h3 class="font-bold text-red-800 mb-3">⚠️ Erro na Validação</h3>
                                    <div
                                        class="bg-white dark:bg-gray-700 rounded border border-red-200 p-4 font-mono text-sm whitespace-pre-wrap overflow-auto max-h-64">
                                        {{ resultado.resultado }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>

        <History />

    </div>

</template>

<script setup>
import { ref } from 'vue'
import Favorite from "@/components/config/Favorite.vue";
import { useAIStore } from '@/stores/Config/aiStore.js'
import History from './components/History.vue';

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
            return 'border-green-400/20 bg-green-50 dark:bg-green-300/30'
        case 'alerta':
            return 'border-yellow-400/20 bg-yellow-50 dark:bg-yellow-300/30'
        case 'incorreto':
            return 'border-red-400/20 bg-red-50 dark:bg-red-300/30'
        default:
            return 'border-gray-400/20 bg-gray-50 dark:bg-gray-300/30'
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