<template>
    <div class="min-h-screen dark:bg-gray-900 bg-gray-100">

        <div class="max-w-7xl mx-auto px-6 py-8">
            <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">

                <!-- Sidebar de Filtros -->
                <aside class="lg:col-span-1">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                        Filtros
                    </h3>
                    <div
                        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-6 sticky top-8">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Buscar</label>
                        <div class="flex items-center space-x-4 mb-6 w-full">
                            <div class="relative w-full">
                                <input v-model="searchQuery" type="text" placeholder="Buscar atualizações..."
                                    class="w-full pl-10 pr-4 py-2 border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 placeholder:text-gray-800 placeholder:dark:text-gray-200 placeholder:font-normal rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                                <i class="fas fa-magnifying-glass absolute left-3 top-3.5"></i>
                            </div>
                        </div>

                        <!-- Filtro por Tipo -->
                        <div class="mb-6">
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de
                                Release</label>
                            <select v-model="filters.type"
                                class="w-full border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                                <option value="all">Todos</option>
                                <option value="major">Major</option>
                                <option value="minor">Minor</option>
                                <option value="patch">Patch</option>
                                <option value="hotfix">Hotfix</option>
                            </select>
                        </div>

                        <!-- Filtro por Categoria -->
                        <div class="mb-6">
                            <label
                                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoria</label>
                            <select v-model="filters.category"
                                class="w-full border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                                <option value="all">Todas</option>
                                <option value="frontend">Frontend</option>
                                <option value="backend">Backend</option>
                                <option value="api">API</option>
                                <option value="mobile">Mobile</option>
                                <option value="security">Segurança</option>
                            </select>
                        </div>

                        <!-- Filtro por Período -->
                        <div class="mb-6">
                            <label
                                class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Período</label>
                            <select v-model="filters.period"
                                class="w-full border bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500">
                                <option value="all">Todo período</option>
                                <option value="week">Última semana</option>
                                <option value="month">Último mês</option>
                                <option value="quarter">Último trimestre</option>
                            </select>
                        </div>

                        <!-- Estatísticas Rápidas -->
                        <div class="border-t border-gray-300 dark:border-gray-700 pt-6">
                            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Estatísticas</h4>
                            <div class="space-y-2">
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-500">Total atualizações</span>
                                    <span class="font-medium">{{ releases.length }}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-500">Bugs Corrigidos</span>
                                    <span class="font-medium">{{ totalBugsFixed }}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-500">Novas Funcionalidades</span>
                                    <span class="font-medium">{{ totalFeatures }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                <!-- Conteúdo Principal -->
                <main class="lg:col-span-3">

                    <!-- <section class="mb-8">
                        <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white p-6 shadow-lg">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h2 class="text-2xl font-bold mb-2">Sistema Comercial Construtora</h2>
                                    <p class="text-blue-100 mb-4">Versão {{ currentVersion }} - Status: Estável</p>
                                    <div class="flex items-center space-x-4">
                                        <span
                                            class="bg-green-500 bg-opacity-20 text-green-100 px-3 py-1 rounded-full text-sm">
                                            ✅ Produção
                                        </span>
                                        <span
                                            class="bg-blue-500 bg-opacity-20 text-blue-100 px-3 py-1 rounded-full text-sm">
                                            🚀 Performance: 98%
                                        </span>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="text-blue-100 text-sm">Próximo Release</p>
                                    <p class="text-white font-semibold">{{ nextRelease.version }}</p>
                                    <p class="text-blue-200 text-sm">{{ nextRelease.date }}</p>
                                </div>
                            </div>
                        </div>
                    </section> -->

                    <!-- Roadmap -->
                    <section class="mb-4">
                        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                            Atualizações Futuras
                        </h3>
                        <div class="overflow-x-auto">
                            <div class="flex gap-4 mb-4 min-w-full">
                                <div v-for="milestone in roadmap" :key="milestone.version"
                                    class="min-w-72 max-w-[250px] flex-shrink-0 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="font-semibold">{{ milestone.version }}</span>
                                        <span v-if="milestone?.date" class="text-xs">{{ formatDate(milestone.date)
                                        }}</span>
                                        <span v-else class="text-xs">Em Programação</span>
                                    </div>
                                    <p class="text-sm mb-3">{{ milestone.description }}</p>
                                    <div class="flex flex-wrap gap-1">
                                        <span v-for="feature in milestone.features" :key="feature"
                                            class="bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                                            {{ feature }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>


                    <!-- Lista de Releases -->
                    <section>
                        <div class="flex items-center justify-between mb-6">
                            <h3 class="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                Histórico de atualizações
                            </h3>
                            <span class="text-sm text-gray-500">
                                {{ filteredReleases.length }} de {{ releases.length }} atualizações
                            </span>
                        </div>

                        <!-- Cards de Release -->
                        <div class="space-y-6">
                            <div v-for="release in paginatedReleases" :key="release.version"
                                class="bg-white dark:bg-gray-800/40 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
                                <!-- Header do Release -->
                                <div
                                    class="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-300 dark:border-gray-700">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center space-x-3">
                                            <span :class="getReleaseTypeClass(release.type)"
                                                class="px-3 py-1 rounded-full text-xs font-medium">
                                                {{ getReleaseTypeLabel(release.type) }}
                                            </span>
                                            <h4 class="text-lg font-semibold text-gray-900 dark:text-white">{{
                                                release.version }}</h4>
                                        </div>

                                        <div class="text-right">
                                            <p class="text-gray-600 text-sm">{{ formatDate(release.date) }}</p>
                                            <p class="text-gray-500 text-xs">{{ getRelativeTime(release.date) }}</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- Conteúdo do Release -->
                                <div class="p-6">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        <!-- Novas Funcionalidades -->
                                        <div v-if="release.features?.length">
                                            <h5
                                                class="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                                                Novas Funcionalidades
                                            </h5>
                                            <ul class="space-y-2">
                                                <li v-for="feature in release.features" :key="feature.id"
                                                    class="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                                                    <span class="text-green-500 mr-2 mt-0.5">•</span>
                                                    <span><strong>{{ feature.title }}:</strong> {{ feature.description
                                                    }}</span>
                                                </li>
                                            </ul>
                                        </div>

                                        <!-- Melhorias -->
                                        <div v-if="release.improvements?.length">
                                            <h5
                                                class="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3 flex items-center">
                                                Melhorias
                                            </h5>
                                            <ul class="space-y-2">
                                                <li v-for="improvement in release.improvements" :key="improvement.id"
                                                    class="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                                                    <span class="text-blue-500 mr-2 mt-0.5">•</span>
                                                    <span><strong>{{ improvement.category }}:</strong> {{
                                                        improvement.description }}</span>
                                                </li>
                                            </ul>
                                        </div>

                                        <!-- Correções -->
                                        <div v-if="release.fixes?.length">
                                            <h5
                                                class="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                                                Correções
                                            </h5>
                                            <ul class="space-y-2">
                                                <li v-for="fix in release.fixes" :key="fix.id"
                                                    class="text-sm text-gray-700 dark:text-gray-300 flex items-start">
                                                    <span class="text-orange-500 mr-2 mt-0.5">•</span>
                                                    <span>{{ fix.description }}</span>
                                                </li>
                                            </ul>
                                        </div>

                                        <!-- Breaking Changes -->
                                        <div v-if="release.breakingChanges?.length">
                                            <h5 class="text-sm font-semibold text-red-700 mb-3 flex items-center">
                                                Breaking Changes
                                            </h5>
                                            <ul class="space-y-2">
                                                <li v-for="change in release.breakingChanges" :key="change.id"
                                                    class="text-sm bg-red-200/20 p-3 rounded-md border border-red-500/20">
                                                    <div class="text-red-400">
                                                        <strong>{{ change.component }}:</strong> {{ change.description
                                                        }}
                                                    </div>
                                                    <div class="text-red-400 text-xs mt-1">
                                                        <strong>Ação:</strong> {{ change.migrationGuide }}
                                                    </div>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>

                                    <!-- Ações -->
                                    <div
                                        class="flex items-center justify-between mt-4 pt-4 border-t border-gray-300 dark:border-gray-700">
                                        <div class="flex justify-between w-full space-x-3">
                                            <button @click="showDetails(release)"
                                                class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                                Ver Detalhes
                                            </button>
                                            <div class="flex gap-2">
                                                <span v-for="category in release.categories" :key="category"
                                                    :class="getCategoryClass(category)"
                                                    class="px-2 py-1 rounded text-xs font-medium">
                                                    {{ getCategoryLabel(category) }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Paginação -->
                        <div v-if="totalPages > 1" class="flex justify-center mt-8">
                            <nav class="flex space-x-2">
                                <button v-for="page in totalPages" :key="page" @click="currentPage = page" :class="[
                                    'px-3 py-2 text-sm font-medium rounded-md',
                                    currentPage === page
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover: dark:bg-gray-900'
                                ]">
                                    {{ page }}
                                </button>
                            </nav>
                        </div>
                    </section>
                </main>
            </div>
        </div>

        <!-- Modal de Detalhes -->
        <div v-if="selectedRelease"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click="closeModal">
            <div class="bg-white dark:bg-gray-800 rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto" @click.stop>
                <div
                    class="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ selectedRelease.version }} - Detalhes
                    </h3>
                    <i @click="closeModal"
                        class="fas fa-xmark text-gray-400 hover:text-gray-600 text-2xl cursor-pointer"></i>
                </div>

                <div class="p-6">
                    <div class="grid grid-cols-1" :class="{
                        'lg:grid-cols-2 gap-8': selectedRelease.features?.length && (selectedRelease.improvements?.length || selectedRelease.fixes?.length)
                    }">
                        <!-- Coluna Esquerda -->
                        <div>
                            <!-- Funcionalidades Detalhadas -->
                            <div v-if="selectedRelease.features?.length" class="mb-6">
                                <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                    Novas Funcionalidades
                                </h4>
                                <div class="space-y-4">
                                    <div v-for="feature in selectedRelease.features" :key="feature.id"
                                        class="bg-green-200/20 border border-green-300/20 rounded-lg p-4">
                                        <h5 class="font-medium text-green-500 mb-2">{{ feature.title }}</h5>
                                        <p class="text-green-400 text-sm mb-3">{{ feature.description }}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Problemas Conhecidos -->
                            <div v-if="selectedRelease.knownIssues?.length" class="mb-6">
                                <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                    Problemas Conhecidos
                                </h4>
                                <div class="space-y-3">
                                    <div v-for="issue in selectedRelease.knownIssues" :key="issue.id"
                                        class="bg-yellow-200/20 border border-yellow-300/20 rounded-lg p-4">
                                        <p class="text-yellow-400 text-sm mb-2">{{ issue.description }}</p>
                                        <div v-if="issue.workaround" class="text-yellow-400 text-xs">
                                            <strong>Temporária:</strong> {{ issue.workaround }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Coluna Direita -->
                        <div>
                            <!-- Melhorias e Correções -->
                            <div v-if="selectedRelease.improvements?.length || selectedRelease.fixes?.length"
                                class="mb-6">
                                <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                                    Melhorias & Correções
                                </h4>

                                <div v-if="selectedRelease.improvements?.length" class="mb-4">
                                    <h5 class="font-medium text-gray-800 dark:text-white mb-2">Melhorias</h5>
                                    <ul class="space-y-2">
                                        <li v-for="improvement in selectedRelease.improvements" :key="improvement.id"
                                            class="bg-blue-200/20 border border-blue-300/20 rounded p-3 text-sm">
                                            <strong class="text-blue-500">{{ improvement.category }}:</strong>
                                            <span class="text-blue-400 ml-1">{{ improvement.description }}</span>
                                        </li>
                                    </ul>
                                </div>

                                <div v-if="selectedRelease.fixes?.length">
                                    <h5 class="font-medium text-gray-800 dark:text-white mb-2">Correções</h5>
                                    <ul class="space-y-2">
                                        <li v-for="fix in selectedRelease.fixes" :key="fix.id"
                                            class="bg-orange-200/20 border border-orange-300/20 rounded p-3 text-sm text-orange-400">
                                            {{ fix.description }}
                                        </li>
                                    </ul>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'DocumentationPage',
    data() {
        return {
            searchQuery: '',
            selectedRelease: null,
            currentPage: 1,
            itemsPerPage: 6,

            filters: {
                type: 'all',
                category: 'all',
                period: 'all'
            },

            roadmap: [
                {
                    version: 'v2.2.1',
                    date: new Date('2025-10-07T00:00:00'),
                    description: 'Ajuste fino nas permissões de usuários para liberação de uso em periodo de testes.',
                    features: ['Segurança', 'Alçadas', 'Validação']
                },
                {
                    version: 'v2.2.2',
                    date: new Date('2025-10-10T00:00:00'),
                    description: 'Recuperação e alteração de senha via email.',
                    features: ['Segurança', 'Suporte Técnico']
                },
                {
                    version: 'v2.2.3',
                    date: new Date('2025-10-23T00:00:00'),
                    description: 'Relatórios de Leads x Vendas e comparativos de Entradas/Desempenho por campanha..',
                    features: ['Relatórios', 'Leads', 'Desempenho']
                },
            ],
            releases: [
                {
                    version: 'v2.2.0',
                    date: new Date('2025-10-23T00:00:00'),
                    type: 'patch',
                    categories: ['frontend', 'mobile'],
                    features: [
                        {
                            id: 1,
                            title: 'Refaturação do Dashboard',
                            description: 'Reformulado todo o dashboard de vendas para novas funcionalidades e visualizações.',
                        },
                        {
                            id: 2,
                            title: 'Contagem de Mês',
                            description: 'Adicionado contador de tempo para fechamento do mês na tela inicial.'
                        },
                        {
                            id: 3,
                            title: 'Card de Leads',
                            description: 'Criado card com grafico e detalhes sobre leads para pré visualização no dashboard.'
                        },
                        {
                            id: 4,
                            title: 'Card de Validações',
                            description: 'Criado card com grafico e detalhes sobre as validações para pré visualização no dashboard.'
                        }
                    ],
                    improvements: [
                    ],
                    fixes: [ 
                    ],
                    breakingChanges: [],
                    knownIssues: [],
                },
                {
                    version: 'v2.1.9',
                    date: new Date('2025-10-03T00:00:00'),
                    type: 'patch',
                    categories: ['frontend', 'mobile', 'api', 'backend'],
                    features: [
                        {
                            id: 1,
                            title: 'Configuração de envio de "Reports" para erros no sistema e suporte.',
                            description: 'Formulário de suporte/reporte de problemas vinculado a nova funcionalidade de disparos, ajustado lógica para resposta e atualização continua do suporte.',
                        },
                        {
                            id: 2,
                            title: 'Painel de Tickets',
                            description: 'Desenvolvido painel de tickets para acompanhamento dos tickets abertos pelos usuarios.'
                        },
                    ],
                    improvements: [
                    ],
                    fixes: [
                        {
                            id: 1,
                            description: 'Ajuste no disparo de eventos para seleção de usuarios por nome, cargo Ex: Marketing (todos usuarios mkt), e emails externos.'
                        },
                    ],
                    breakingChanges: [],
                    knownIssues: [],
                },
                {
                    version: 'v2.1.8',
                    date: new Date('2025-09-30T00:00:00'),
                    type: 'patch',
                    categories: ['Microsoft', 'api', 'notificação', 'backend'],
                    features: [
                        {
                            id: 1,
                            title: 'Ajuste de Email para notificações do sistema via comercial@menin.com.br',
                            description: 'Não é possivel o envio de emails a partir do contato "comercial@menin.com.br", solicitado um email para notificações internas e utilziado o novo "sistema@menin.com.br" nas notificações.',
                        },
                    ],
                    improvements: [
                        {
                            id: 1,
                            category: 'Controladores',
                            description: 'Feito toda estrutura de mensagens para notificação via email para Eventos e ja disponivel para expansão em outros modulos.'
                        },
                    ],
                    fixes: [
                    ],
                    breakingChanges: [],
                    knownIssues: [],
                },
                {
                    version: 'v2.1.7',
                    date: new Date('2025-09-22T00:00:00'),
                    type: 'patch',
                    categories: ['frontend', 'mobile', 'api', 'backend'],
                    features: [
                        {
                            id: 1,
                            title: 'Relatório Leads X Vendas via Banco de Dados Menin',
                            description: 'Ajustado todas funcionalidades definidas para o relatório, agora contando com busca e filtros detalhados para qualquer paramêtros, vinculo entre CV e Sienge corretor, valores ajustados para VGV do comercial, sendo "VGV" e o "VGV+DC" o valor somado o DC (Desconto Construtora).',
                        },
                    ],
                    improvements: [
                        {
                            id: 1,
                            category: 'Relatórios',
                            description: 'Agora contando com 3 tipos de relatórios podendo ser Listagem, Pizza ou Barra, relatórios reativos e que acompanham a busca do usuario, tendo dados detalhados e precisos automaticamente.'
                        },
                    ],
                    fixes: [
                        {
                            id: 1,
                            description: 'Ajuste na sincronia e dados da API, pego junto das vendas do sienge o REPASSE, RESERVA e demais itens do cliente no CV.'
                        },
                        {
                            id: 2,
                            description: 'Corrigido problema de CM (Comissão) que não era entra no contrato Sienge do residencial Verona, criado uma regra de adição de 4% no VGV das vendas até determinado periodo, podendo ser ajustado conforme valor futuro.'
                        },
                    ],
                    breakingChanges: [],
                    knownIssues: [],
                },
                {
                    version: 'v2.1.6',
                    date: new Date('2025-09-04T00:00:00'),
                    type: 'patch',
                    categories: ['frontend', 'mobile', 'api', 'backend'],
                    features: [
                        {
                            id: 1,
                            title: 'Envio de Corretores para Sienge ou Junção de dados',
                            description: 'Definido vinculo entre corretores no CV e dados do Sienge, impossibilitado conexão de dados internamente, feito vinculo somente no relatório de vendas com base na unidade vendida.',
                        },
                    ],
                    improvements: [],
                    fixes: [
                        {
                            id: 1,
                            description: 'Ajuste na sincronia e dados da API, pego junto das vendas do sienge o REPASSE, RESERVA e demais itens do cliente no CV.'
                        },
                        {
                            id: 2,
                            description: 'Corrigido problema de TR (Terreno) que não era retornado na api, feito um vinculo de backup com o Banco de dados externo BI.'
                        },
                    ],
                    breakingChanges: [],
                    knownIssues: [],
                },
                {
                    version: 'v2.1.5',
                    date: new Date('2025-08-22T00:00:00'),
                    type: 'patch',
                    categories: ['frontend', 'mobile', 'api', 'backend'],
                    features: [
                        {
                            id: 1,
                            title: 'Tela de relatório e filtros personalizados',
                            description: 'Tela de listagem para relatório de vendas com dados de faturamento em tempo real do Sienge.',
                        },
                    ],
                    improvements: [],
                    fixes: [
                        {
                            id: 1,
                            description: 'Getters de API e correlação entre contratos Sienge x CV.'
                        },
                    ],
                    breakingChanges: [],
                    knownIssues: [],
                },
                {
                    version: 'v2.1.4',
                    date: new Date('2025-08-08T00:00:00'),
                    type: 'patch',
                    categories: ['frontend', 'mobile'],
                    features: [
                        {
                            id: 1,
                            title: 'Parametrização de abas do sistema, limpeza de desempenho',
                            description: 'Ajustado layout padrão e menu de navegação, ajustado repetições desnecessarias para desempenho.',
                        },
                    ],
                    improvements: [
                        {
                            id: 2,
                            category: 'UX',
                            description: 'Telas Responsivas, Gráficos Detalhados e Visual Design.'
                        }
                    ],
                    fixes: [
                        {
                            id: 1,
                            description: 'Responsividade geral do sistema em dispositivos moveis.'
                        },
                    ],
                    breakingChanges: [],
                    knownIssues: [],
                },
                {
                    version: 'v2.1.3',
                    date: new Date('2025-07-29T00:00:00'),
                    type: 'patch',
                    categories: ['frontend', 'mobile'],
                    features: [
                        {
                            id: 1,
                            title: 'Reportar Problema adicionado',
                            description: 'Interface de reporte criada e configuração de requisitos definida.',
                        },
                    ],
                    improvements: [
                        {
                            id: 2,
                            category: 'UX',
                            description: 'Layout moderno e responsivo para nova página'
                        }
                    ],
                    fixes: [
                        {
                            id: 1,
                            description: 'Ajuste de TimeZone no sistema por erros em UTF'
                        },
                    ],
                    breakingChanges: [],
                    knownIssues: [
                        {
                            id: 1,
                            description: 'Relatório ainda não funcional',
                            workaround: 'Formulário de suporte ainda em período de testes, pendente da atualização 2.1.5 para funcionamento completo.'
                        }
                    ],
                },
                {
                    version: 'v2.1.2',
                    date: new Date('2025-07-28T00:00:00'),
                    type: 'patch',
                    categories: ['frontend', 'mobile'],
                    features: [],
                    improvements: [
                        {
                            id: 1,
                            category: 'Barra de navegação',
                            description: 'Refaturado toda barra de navegação, garantindo melhor funcionalidade nas abas de "Dropdown" e responsividade em dispositivos móveis. '
                        }
                    ],
                    fixes: [
                        {
                            id: 1,
                            description: 'Ajustado erro ao abrir e fechar item da barra de navegação.'
                        },
                    ],
                    breakingChanges: [],
                    knownIssues: [],
                },
                {
                    version: 'v2.1.0',
                    date: new Date('2025-06-27T00:00:00'),
                    type: 'minor',
                    categories: ['backend', 'frontend', 'api'],
                    features: [
                        {
                            id: 1,
                            title: 'Validador de documentos',
                            description: 'Agente de IA validador de contratos CEF + Confissão de Dívida Menin.'
                        },
                        {
                            id: 2,
                            title: 'Automação de Contratos',
                            description: 'Automação de varredura do CV CRM que pega os clientes pendentes de validação, envia para o agente de IA e retorna o status automaticamente.'
                        },
                        {
                            id: 3,
                            title: 'Ferramentas - Validador',
                            description: 'Novo campo criador para visualizar e gerenciar contratos em validação, com validador integrado e histórico de uso da automação.'
                        }
                    ],
                    improvements: [
                    ],
                    fixes: [
                        {
                            id: 1,
                            description: 'Ajuste de responsividade nas telas do validador e correção no prompt do agente, para garantir mais acertividade nas conferências.'
                        }
                    ],
                    breakingChanges: [
                    ],
                    knownIssues: [],
                },
                {
                    version: 'v2.0.0',
                    date: new Date('2025-06-03T00:00:00'),
                    type: 'major',
                    categories: ['frontend', 'backend', 'api', 'security'],
                    features: [
                    ],
                    improvements: [
                        {
                            id: 1,
                            category: 'Hospedagem',
                            description: 'Alteração dos serviços de host para plataforma "railway" com servidor dedicado.'
                        },
                        {
                            id: 2,
                            category: 'Banco de dados',
                            description: 'Banco de dados integrado no serviço "railway", limpeza dos dados anteriores para inicio do uso em produção.'
                        }
                    ],
                    fixes: [],
                    breakingChanges: [
                        {
                            id: 1,
                            component: 'Servidor em testes',
                            description: 'Novo servidor ainda em teste de performance e sofrendo oscilações.',
                            migrationGuide: 'Em caso de problema, reportar erro no botão lateral do menu a esquerda.'
                        }
                    ],
                    knownIssues: [],
                }
            ]
        }
    },

    computed: {
        filteredReleases() {
            let filtered = [...this.releases]

            // Filtro por busca
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase()
                filtered = filtered.filter(release =>
                    release.version.toLowerCase().includes(query) ||
                    release.features?.some(f =>
                        f.title.toLowerCase().includes(query) ||
                        f.description.toLowerCase().includes(query)
                    ) ||
                    release.fixes?.some(f => f.description.toLowerCase().includes(query))
                )
            }

            // Filtro por tipo
            if (this.filters.type !== 'all') {
                filtered = filtered.filter(release => release.type === this.filters.type)
            }

            // Filtro por categoria
            if (this.filters.category !== 'all') {
                filtered = filtered.filter(release =>
                    release.categories?.includes(this.filters.category)
                )
            }

            // Filtro por período
            if (this.filters.period !== 'all') {
                const now = new Date()
                const periodMap = {
                    week: 7,
                    month: 30,
                    quarter: 90
                }
                const days = periodMap[this.filters.period]
                const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))

                filtered = filtered.filter(release => new Date(release.date) >= cutoffDate)
            }

            return filtered
        },

        paginatedReleases() {
            const startIndex = (this.currentPage - 1) * this.itemsPerPage
            return this.filteredReleases.slice(startIndex, startIndex + this.itemsPerPage)
        },

        totalPages() {
            return Math.ceil(this.filteredReleases.length / this.itemsPerPage)
        },

        totalBugsFixed() {
            return this.releases.reduce((total, release) =>
                total + (release.fixes?.length || 0), 0)
        },

        totalFeatures() {
            return this.releases.reduce((total, release) =>
                total + (release.features?.length || 0), 0)
        }
    },

    watch: {
        'filters': {
            handler() {
                this.currentPage = 1
            },
            deep: true
        },
        'searchQuery'() {
            this.currentPage = 1
        }
    },

    methods: {
        formatDate(date) {
            return new Intl.DateTimeFormat('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            }).format(new Date(date))
        },

        getRelativeTime(date) {
            const now = new Date()
            const releaseDate = new Date(date)
            const diffTime = Math.abs(now - releaseDate)
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

            if (diffDays === 0) return 'hoje'
            if (diffDays === 1) return 'ontem'
            if (diffDays < 7) return `há ${diffDays} dias`
            if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semanas`
            if (diffDays < 365) return `há ${Math.floor(diffDays / 30)} meses`
            return `há ${Math.floor(diffDays / 365)} anos`
        },

        getReleaseTypeClass(type) {
            const classes = {
                major: 'bg-red-100/80 text-red-700',
                minor: 'bg-blue-100/80 text-blue-700',
                patch: 'bg-green-100/80 text-green-700',
                hotfix: 'bg-yellow-100/80 text-yellow-700'
            }
            return classes[type] || 'bg-gray-100 text-gray-700'
        },

        getReleaseTypeLabel(type) {
            const labels = {
                major: 'Major',
                minor: 'Minor',
                patch: 'Patch',
                hotfix: 'Hotfix'
            }
            return labels[type] || type
        },

        getCategoryClass(category) {
            const classes = {
                frontend: 'bg-purple-100/80 text-purple-700',
                backend: 'bg-green-100/80 text-green-700',
                api: 'bg-blue-100/80 text-blue-700',
                mobile: 'bg-pink-100/80 text-pink-700',
                security: 'bg-red-100/80 text-red-700'
            }
            return classes[category] || 'bg-gray-100 text-gray-700'
        },

        getCategoryLabel(category) {
            const labels = {
                frontend: 'Frontend',
                backend: 'Backend',
                api: 'API',
                mobile: 'Mobile',
                security: 'Segurança'
            }
            return labels[category] || category
        },

        showDetails(release) {
            this.selectedRelease = release
        },

        closeModal() {
            this.selectedRelease = null
        }
    }
}
</script>
