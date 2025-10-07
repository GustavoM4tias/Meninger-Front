<template>
    <div class="min-h-screen dark:bg-gray-900 bg-gray-100">
        <div class="max-w-7xl mx-auto px-6 py-8">
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">

                <!-- Sidebar -->
                <aside class="lg:col-span-1">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
                        Como Reportar
                    </h3>

                    <div
                        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6 sticky top-8">
                        <div class="mb-6">
                            <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Dicas Importantes</h4>
                            <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <li class="flex items-start">
                                    <span class="text-green-500 mr-2 mt-0.5">•</span>
                                    Seja específico sobre o problema
                                </li>
                                <li class="flex items-start">
                                    <span class="text-green-500 mr-2 mt-0.5">•</span>
                                    Descreva os passos para reproduzir
                                </li>
                                <li class="flex items-start">
                                    <span class="text-green-500 mr-2 mt-0.5">•</span>
                                    Inclua capturas de tela se possível
                                </li>
                                <li class="flex items-start">
                                    <span class="text-green-500 mr-2 mt-0.5">•</span>
                                    Mencione o navegador utilizado
                                </li>
                            </ul>
                        </div>

                        <div class="border-t border-gray-300 dark:border-gray-700 pt-6">
                            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Estatísticas</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-500">Problemas Reportados</span>
                                    <span class="font-medium">{{ stats.totalReports }}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-500">Finalizados este mês</span>
                                    <span class="font-medium text-red-600">{{ counts.closed }}</span>
                                </div> 
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-500">Resolvidos este mês</span>
                                    <span class="font-medium text-green-600">{{ stats.resolved }}</span>
                                </div> 
                            </div>
                        </div>
                    </div>
                </aside>

                <!-- Main Content -->
                <main class="lg:col-span-3">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
                        Formulário
                    </h3>
                    <!-- Form -->
                    <section class="mb-8">
                        <div
                            class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
                            <div
                                class="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-300 dark:border-gray-700">
                                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Formulário de Reporte
                                </h3>
                                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Preencha os campos abaixo com o
                                    máximo de detalhes possível</p>
                            </div>

                            <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
                                <!-- Basic Info -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Nome Completo <span class="text-red-500">*</span>
                                        </label>
                                        <input v-model="form.userName" type="text" placeholder="Seu nome completo"
                                            required
                                            class="w-full px-4 py-3 border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            E-mail <span class="text-red-500">*</span>
                                        </label>
                                        <input v-model="form.email" type="email" placeholder="email@empresa.com"
                                            required
                                            class="w-full px-4 py-3 border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                    </div>
                                </div>

                                <!-- Problem Classification -->
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Tipo de Problema <span class="text-red-500">*</span>
                                        </label>
                                        <select v-model="form.problemType" required
                                            class="w-full px-4 py-3 border text-gray-400 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                            <option value="">Selecione o tipo</option>
                                            <option value="bug">Bug/Erro</option>
                                            <option value="performance">Performance</option>
                                            <option value="ui">Interface/Visual</option>
                                            <option value="feature">Sugestão</option>
                                            <option value="security">Segurança</option>
                                            <option value="other">Outro</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Prioridade <span class="text-red-500">*</span>
                                        </label>
                                        <select v-model="form.priority" required
                                            class="w-full px-4 py-3 border text-gray-400 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                            <option value="">Selecione a prioridade</option>
                                            <option value="critical">Crítica</option>
                                            <option value="high">Alta</option>
                                            <option value="medium">Média</option>
                                            <option value="low">Baixa</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Módulo Afetado
                                        </label>
                                        <select v-model="form.module"
                                            class="w-full px-4 py-3 border text-gray-400 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                            <option value="">Selecione o módulo</option>
                                            <option value="dashboard">Dashboard</option>
                                            <option value="vendas">Vendas</option>
                                            <option value="leads">Leads</option>
                                            <option value="relatorios">Relatórios</option>
                                            <option value="validador">Validador</option>
                                            <option value="configuracoes">Configurações</option>
                                            <option value="geral">Sistema Geral</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Problem Title -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Título do Problema <span class="text-red-500">*</span>
                                    </label>
                                    <input v-model="form.title" type="text"
                                        placeholder="Descreva o problema em uma frase" maxlength="100" required
                                        class="w-full px-4 py-3 border text-gray-400 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                    <p class="text-xs text-gray-500 mt-1">{{ form.title.length }}/100 caracteres</p>
                                </div>

                                <!-- Detailed Description -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Descrição Detalhada <span class="text-red-500">*</span>
                                    </label>
                                    <textarea v-model="form.description"
                                        placeholder="Descreva o problema detalhadamente:&#10;- O que você estava fazendo?&#10;- O que esperava que acontecesse?&#10;- O que realmente aconteceu?&#10;- Consegue reproduzir o problema?"
                                        rows="6" required
                                        class="w-full px-4 py-3 border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"></textarea>
                                </div>

                                <!-- Steps to Reproduce -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Passos para Reproduzir
                                    </label>
                                    <textarea v-model="form.stepsToReproduce"
                                        placeholder="Liste os passos numerados:&#10;1. Primeiro passo...&#10;2. Segundo passo...&#10;3. Terceiro passo..."
                                        rows="4"
                                        class="w-full px-4 py-3 border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"></textarea>
                                </div>

                                <!-- System Info -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Navegador Utilizado
                                        </label>
                                        <select v-model="form.browser"
                                            class="w-full px-4 py-3 border  text-gray-400 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                            <option value="">Selecione o navegador</option>
                                            <option value="chrome">Google Chrome</option>
                                            <option value="firefox">Mozilla Firefox</option>
                                            <option value="safari">Safari</option>
                                            <option value="edge">Microsoft Edge</option>
                                            <option value="other">Outro</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Sistema Operacional
                                        </label>
                                        <select v-model="form.os"
                                            class="w-full px-4 py-3 border  text-gray-400 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                            <option value="">Selecione o SO</option>
                                            <option value="windows">Windows</option>
                                            <option value="macos">macOS</option>
                                            <option value="linux">Linux</option>
                                            <option value="ios">iOS</option>
                                            <option value="android">Android</option>
                                        </select>
                                    </div>
                                </div>

                                <!-- Page URL -->
                                <!-- <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        URL da Página (onde ocorreu o problema)
                                    </label>
                                    <input v-model="form.pageUrl" type="url"
                                        placeholder="https://sistema.empresa.com/modulo/pagina"
                                        class="w-full px-4 py-3 border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                </div> -->

                                <!-- File Upload -->
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Capturas de Tela ou Arquivos
                                    </label>
                                    <div
                                        class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center bg-gray-50 dark:bg-gray-700">
                                        <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                                        <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            Arraste arquivos aqui ou clique para selecionar
                                        </p>
                                        <p class="text-xs text-gray-500">
                                            Formatos aceitos: PNG, JPG, GIF, PDF (máx. 10MB cada)
                                        </p>
                                        <input ref="fileInput" type="file" multiple accept="image/*,.pdf" class="hidden"
                                            @change="handleFileSelect" />
                                        <button type="button" @click="$refs.fileInput.click()"
                                            class="mt-3 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                                            Selecionar Arquivos
                                        </button>
                                    </div>

                                    <!-- File List -->
                                    <div v-if="form.attachments.length > 0" class="mt-3 space-y-2">
                                        <div v-for="(file, index) in form.attachments" :key="index"
                                            class="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                                            <div class="flex items-center">
                                                <i class="fas fa-file text-gray-500 mr-2"></i>
                                                <span class="text-sm text-gray-700 dark:text-gray-300">{{ file.name
                                                    }}</span>
                                                <span class="text-xs text-gray-500 ml-2">({{ formatFileSize(file.size)
                                                    }})</span>
                                            </div>
                                            <button type="button" @click="removeFile(index)"
                                                class="text-red-500 hover:text-red-700">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <!-- Actions -->
                                <div
                                    class="flex items-center justify-between pt-6 border-t border-gray-300 dark:border-gray-700">
                                    <div class="flex items-center space-x-3">
                                        <input v-model="form.allowContact" type="checkbox" id="allowContact"
                                            class="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                                        <label for="allowContact" class="text-sm text-gray-700 dark:text-gray-300">
                                            Autorizo contato para esclarecimentos adicionais
                                        </label>
                                    </div>

                                    <div class="flex space-x-3">
                                        <button type="button" @click="resetForm"
                                            class="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            Limpar Formulário
                                        </button>
                                        <button type="submit" :disabled="isSubmitting"
                                            class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center">
                                            <i v-if="isSubmitting" class="fas fa-spinner fa-spin mr-2"></i>
                                            <i v-else class="fas fa-paper-plane mr-2"></i>
                                            {{ isSubmitting ? 'Enviando...' : 'Enviar Reporte' }}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </section>
                </main>
            </div>
        </div>

        <!-- Success Modal -->
        <div v-if="showSuccessModal"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            @click="showSuccessModal = false">
            <div class="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6" @click.stop>
                <div class="text-center">
                    <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                        <i class="fas fa-check text-blue-600 text-4xl pt-1"></i>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Reporte Enviado com Sucesso!
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Seu problema foi reportado e nossa equipe técnica foi notificada.
                        Você receberá uma resposta em até 48 horas.
                    </p>
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                        <p class="text-sm text-gray-700 dark:text-gray-300">
                            <strong>Protocolo:</strong> #{{ reportProtocol }}
                        </p>
                    </div>
                    <button @click="showSuccessModal = false"
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/Auth/authStore';
import { useSupportStore } from '@/stores/Support/supportStore';
import { useToast } from 'vue-toastification';

const toast = useToast();
const authStore = useAuthStore();
const supportStore = useSupportStore();
const { stats } = storeToRefs(supportStore); // ← PEGA DA STORE
const { counts } = storeToRefs(supportStore); // ← PEGA DA STORE

// State
const isSubmitting = ref(false)
const showSuccessModal = ref(false)
const reportProtocol = ref('')

// sem estado local; usar stats da store
onMounted(async () => {
    try {
        await Promise.all([supportStore.fetchStats(), supportStore.fetchCounts()]);
    } catch (e) {
        console.warn('Falha ao buscar estatísticas:', e);
    }
})

const form = reactive({
    userName: authStore.user?.username || '',
    email: authStore.user?.email || '',
    problemType: '',
    priority: '',
    module: '',
    title: '',
    description: '',
    stepsToReproduce: '',
    browser: '',
    os: '',
    pageUrl: '',
    attachments: [],
    allowContact: true
})

// Methods
const validateForm = () => {
    const requiredFields = [
        { field: 'userName', label: 'Nome Completo' },
        { field: 'email', label: 'E-mail' },
        { field: 'problemType', label: 'Tipo de Problema' },
        { field: 'priority', label: 'Prioridade' },
        { field: 'title', label: 'Título do Problema' },
        { field: 'description', label: 'Descrição Detalhada' }
    ]

    for (const { field, label } of requiredFields) {
        if (!form[field] || form[field].trim() === '') {
            alert(`Por favor, preencha o campo: ${label}`)
            return false
        }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
        alert('Por favor, insira um e-mail válido')
        return false
    }

    return true
}

const generateProtocol = () => {
    const timestamp = Date.now().toString()
    const random = Math.random().toString(36).substr(2, 4).toUpperCase()
    return `${timestamp.substr(-6)}${random}`
}

const generateEmailBody = () => {
    const priorityLabels = {
        critical: 'Crítica',
        high: 'Alta',
        medium: 'Média',
        low: 'Baixa'
    }

    const typeLabels = {
        bug: 'Bug/Erro',
        performance: 'Performance',
        ui: 'Interface/Visual',
        feature: 'Sugestão',
        security: 'Segurança',
        other: 'Outro'
    }

    return `RELATÓRIO DE PROBLEMA - PROTOCOLO #${reportProtocol.value}
================================================================

INFORMAÇÕES DO USUÁRIO:
- Nome: ${form.userName}
- E-mail: ${form.email}
- Data/Hora: ${new Date().toLocaleString('pt-BR')}

CLASSIFICAÇÃO DO PROBLEMA:
- Tipo: ${typeLabels[form.problemType] || form.problemType}
- Prioridade: ${priorityLabels[form.priority] || form.priority}
- Módulo Afetado: ${form.module || 'Não especificado'}

DESCRIÇÃO DO PROBLEMA:
- Título: ${form.title}

- Descrição Detalhada:
${form.description}

${form.stepsToReproduce ? `- Passos para Reproduzir:
${form.stepsToReproduce}` : ''}

INFORMAÇÕES TÉCNICAS:
- URL da Página: ${form.pageUrl || 'Não informada'}
- Navegador: ${form.browser || 'Não especificado'}
- Sistema Operacional: ${form.os || 'Não especificado'}
- Anexos: ${form.attachments.length} arquivo(s)

CONTATO:
- Permitir contato para esclarecimentos: ${form.allowContact ? 'Sim' : 'Não'}

================================================================
Este relatório foi gerado automaticamente pelo sistema.`
}

const handleSubmit = async () => {
    if (!validateForm()) return;
    isSubmitting.value = true;

    try {
        const payload = {
            userName: form.userName,
            email: form.email,
            problemType: form.problemType,
            priority: form.priority,
            module: form.module,
            title: form.title,
            description: form.description,
            stepsToReproduce: form.stepsToReproduce,
            browser: form.browser,
            os: form.os,
            pageUrl: form.pageUrl,
            attachments: [],        // implementar upload depois
            allowContact: form.allowContact,
        };

        const res = await supportStore.openTicket(payload);
        reportProtocol.value = res.protocol;

        // A store já atualiza stats/counts em openTicket; se quiser garantir:
        await Promise.all([supportStore.fetchStats(), supportStore.fetchCounts()]);

        toast.success('Reporte enviado com sucesso!');
        showSuccessModal.value = true;
        resetForm();
    } catch (e) {
        toast.error('Erro ao enviar o reporte. Tente novamente.');
    } finally {
        isSubmitting.value = false;
    }
};

const resetForm = () => {
    Object.assign(form, {
        userName: '',
        email: '',
        problemType: '',
        priority: '',
        module: '',
        title: '',
        description: '',
        stepsToReproduce: '',
        browser: '',
        os: '',
        pageUrl: '',
        attachments: [],
        allowContact: true
    })
}

const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files)
    const maxSize = 10 * 1024 * 1024

    for (const file of selectedFiles) {
        if (file.size > maxSize) {
            toast.warning(`O arquivo "${file.name}" excede o tamanho máximo de 10MB`)
            continue
        }

        if (!form.attachments.find(f => f.name === file.name)) {
            form.attachments.push(file)
        }
    }

    event.target.value = ''
}

const removeFile = (index) => {
    form.attachments.splice(index, 1)
}

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>