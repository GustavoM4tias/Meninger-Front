<template>
    <div class="h-auto min-h-full overflow-x-hidden relative">
        <div class="max-w-7xl mx-auto px-6 py-8">

            <!-- Header -->
            <div class="flex items-center gap-2 mb-2">
                <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Envio ao Bucket GCS</h1>
                <Favorite :router="'/tools/bucket-upload'" :section="'Envio ao Bucket'" />
            </div>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
                Converta e envie as abas <strong>Engenharia</strong> e <strong>Area Contruida Total</strong> da planilha para o bucket GCS.
            </p>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <!-- ── Coluna principal ── -->
                <div class="lg:col-span-2 space-y-6">

                    <!-- CARD: Modo de envio -->
                    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-5">
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-base font-semibold text-gray-900 dark:text-white">Pasta de destino</h2>
                                <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Use <strong>test-robot</strong> para testar a integração antes de enviar para produção.
                                </p>
                            </div>
                            <!-- Toggle -->
                            <div class="flex items-center gap-3 flex-shrink-0">
                                <span class="text-sm font-medium" :class="!store.testMode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'">
                                    encaminhados
                                </span>
                                <button
                                    @click="store.testMode = !store.testMode"
                                    :disabled="!!store.preview"
                                    class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                    :class="store.testMode ? 'bg-amber-400' : 'bg-blue-600'"
                                >
                                    <span
                                        class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                                        :class="store.testMode ? 'translate-x-6' : 'translate-x-1'"
                                    />
                                </button>
                                <span class="text-sm font-medium" :class="store.testMode ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'">
                                    test-robot
                                </span>
                            </div>
                        </div>

                        <!-- Badge da pasta ativa -->
                        <div class="mt-3 flex items-center gap-2">
                            <span class="text-xs text-gray-500 dark:text-gray-400">Destino atual:</span>
                            <span
                                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                                :class="store.testMode
                                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                    : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'"
                            >
                                <i :class="store.testMode ? 'fas fa-flask' : 'fas fa-paper-plane'" class="text-xs"></i>
                                <span class="font-mono">bucket-menin/{{ store.testMode ? 'test-robot' : 'encaminhados' }}/</span>
                            </span>
                        </div>
                    </div>

                    <!-- CARD: Upload -->
                    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
                        <div class="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-300 dark:border-gray-700">
                            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">1. Selecionar Planilha</h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Arquivo .xlsx com as abas necessárias</p>
                        </div>

                        <div class="p-6">
                            <!-- Drop zone -->
                            <div
                                v-if="!store.preview && !store.loading"
                                class="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors"
                                :class="dragging
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'"
                                @dragover.prevent="dragging = true"
                                @dragleave="dragging = false"
                                @drop.prevent="onDrop"
                                @click="fileInput.click()"
                            >
                                <i class="fas fa-file-excel text-4xl text-green-500 mb-3"></i>
                                <p class="font-medium text-gray-700 dark:text-gray-300">Arraste o arquivo aqui ou clique para selecionar</p>
                                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Apenas .xlsx · máx. 20 MB</p>
                                <input ref="fileInput" type="file" accept=".xlsx" class="hidden" @change="onFileSelected" />
                            </div>

                            <!-- Loading processamento -->
                            <div v-if="store.loading" class="flex flex-col items-center justify-center py-12">
                                <i class="fas fa-spinner fa-spin text-3xl text-blue-500 mb-3"></i>
                                <p class="text-gray-600 dark:text-gray-400">Processando planilha...</p>
                            </div>

                            <!-- Arquivo selecionado + info -->
                            <div v-if="store.preview && !store.loading" class="space-y-4">
                                <div class="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <i class="fas fa-check-circle text-green-500 text-xl"></i>
                                    <div class="flex-1 min-w-0">
                                        <p class="font-medium text-green-800 dark:text-green-300 truncate">{{ selectedFileName }}</p>
                                        <p class="text-sm text-green-600 dark:text-green-400">
                                            {{ store.preview.files.length }} arquivo(s) gerado(s) — pronto para envio
                                        </p>
                                    </div>
                                    <button @click="resetFile" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>

                                <!-- Arquivos gerados com nomes no padrão da doc -->
                                <div class="space-y-2">
                                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Arquivos que serão enviados</p>
                                    <div class="flex flex-wrap gap-2">
                                        <div
                                            v-for="file in store.preview.files"
                                            :key="file.name"
                                            class="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm border border-gray-200 dark:border-gray-700"
                                        >
                                            <i class="fas fa-file-csv text-blue-500"></i>
                                            <div>
                                                <span class="font-mono text-gray-700 dark:text-gray-300 text-xs">{{ file.name }}</span>
                                                <span class="ml-2 text-gray-400 text-xs">({{ file.totalRows }} linhas)</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p class="text-xs text-gray-400 dark:text-gray-500">
                                        Destino:
                                        <span class="font-mono">bucket-menin/{{ store.testMode ? 'test-robot' : 'encaminhados' }}/</span>
                                    </p>
                                </div>

                                <!-- Botões de ação -->
                                <div class="flex gap-3 pt-2">
                                    <button
                                        @click="handleConfirm"
                                        :disabled="store.uploading"
                                        class="flex items-center gap-2 px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                                        :class="store.testMode
                                            ? 'bg-amber-500 hover:bg-amber-600'
                                            : 'bg-blue-600 hover:bg-blue-700'"
                                    >
                                        <i v-if="store.uploading" class="fas fa-spinner fa-spin"></i>
                                        <i v-else :class="store.testMode ? 'fas fa-flask' : 'fas fa-cloud-upload-alt'"></i>
                                        {{ store.uploading ? 'Enviando...' : (store.testMode ? 'Enviar para test-robot' : 'Enviar ao Bucket') }}
                                    </button>
                                    <button
                                        @click="resetFile"
                                        :disabled="store.uploading"
                                        class="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                                    >
                                        <i class="fas fa-times"></i>
                                        Cancelar
                                    </button>
                                </div>
                            </div>

                            <!-- Erro -->
                            <div v-if="store.error" class="mt-4 flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <i class="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
                                <p class="text-sm text-red-700 dark:text-red-300">{{ store.error }}</p>
                            </div>

                            <!-- Confirmação de sucesso -->
                            <div v-if="successResult" class="mt-4 flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <i class="fas fa-check-circle text-green-500 mt-0.5"></i>
                                <div>
                                    <p class="text-sm font-medium text-green-800 dark:text-green-300">{{ successResult.message }}</p>
                                    <div class="flex flex-wrap gap-1 mt-1">
                                        <span
                                            v-for="f in successResult.files"
                                            :key="f.path"
                                            class="text-xs font-mono text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-0.5 rounded"
                                        >{{ f.path }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- CARD: Preview das abas -->
                    <div v-if="store.preview" class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
                        <div class="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-300 dark:border-gray-700">
                            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">2. Pré-visualização dos CSVs</h2>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Todas as linhas de cada arquivo gerado</p>
                        </div>

                        <div class="p-6 space-y-8">
                            <div v-for="file in store.preview.files" :key="file.name">
                                <!-- Cabeçalho do arquivo -->
                                <div class="flex items-center gap-2 mb-3">
                                    <i class="fas fa-file-csv text-blue-500"></i>
                                    <h3 class="font-semibold text-gray-800 dark:text-gray-200 font-mono text-sm">{{ file.name }}</h3>
                                    <span class="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                        {{ file.totalRows }} linhas
                                    </span>
                                </div>

                                <!-- Tabela -->
                                <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                    <table class="min-w-full text-xs">
                                        <thead>
                                            <tr class="bg-gray-100 dark:bg-gray-800">
                                                <th
                                                    v-for="(col, ci) in (file.previewRows[0] || [])"
                                                    :key="ci"
                                                    class="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                                                >{{ col || '—' }}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr
                                                v-for="(row, ri) in getPageRows(file)"
                                                :key="ri"
                                                class="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                            >
                                                <td
                                                    v-for="(cell, ci) in row"
                                                    :key="ci"
                                                    class="px-3 py-1.5 text-gray-700 dark:text-gray-300 whitespace-nowrap border-r border-gray-100 dark:border-gray-800 last:border-r-0"
                                                >{{ cell || '' }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <!-- Paginação -->
                                <div class="flex items-center justify-between mt-3">
                                    <p class="text-xs text-gray-400">
                                        Exibindo {{ pageRangeLabel(file) }} de {{ file.totalRows }} linhas
                                    </p>
                                    <div class="flex items-center gap-1">
                                        <!-- Primeira -->
                                        <button
                                            @click="setPage(file, 1)"
                                            :disabled="getPage(file) === 1"
                                            class="px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                                            title="Primeira página"
                                        ><i class="fas fa-angle-double-left"></i></button>
                                        <!-- Anterior -->
                                        <button
                                            @click="setPage(file, getPage(file) - 1)"
                                            :disabled="getPage(file) === 1"
                                            class="px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                                            title="Página anterior"
                                        ><i class="fas fa-angle-left"></i></button>

                                        <!-- Páginas numéricas -->
                                        <template v-for="p in visiblePages(file)" :key="p">
                                            <span v-if="p === '...'" class="px-1 text-xs text-gray-400">…</span>
                                            <button
                                                v-else
                                                @click="setPage(file, p)"
                                                class="min-w-[28px] px-2 py-1 rounded text-xs border transition-colors"
                                                :class="getPage(file) === p
                                                    ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                                                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'"
                                            >{{ p }}</button>
                                        </template>

                                        <!-- Próxima -->
                                        <button
                                            @click="setPage(file, getPage(file) + 1)"
                                            :disabled="getPage(file) === totalPages(file)"
                                            class="px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                                            title="Próxima página"
                                        ><i class="fas fa-angle-right"></i></button>
                                        <!-- Última -->
                                        <button
                                            @click="setPage(file, totalPages(file))"
                                            :disabled="getPage(file) === totalPages(file)"
                                            class="px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                                            title="Última página"
                                        ><i class="fas fa-angle-double-right"></i></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- ── Sidebar ── -->
                <aside class="space-y-6">

                    <!-- Info do bucket -->
                    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-5">
                        <h3 class="font-semibold text-gray-900 dark:text-white mb-3">Destino</h3>
                        <div class="space-y-2 text-sm">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-database text-blue-500 mt-0.5"></i>
                                <div>
                                    <p class="text-gray-500 dark:text-gray-400 text-xs">Bucket</p>
                                    <p class="font-mono text-gray-800 dark:text-gray-200">bucket-menin</p>
                                </div>
                            </div>
                            <div class="flex items-start gap-2">
                                <i
                                    class="mt-0.5"
                                    :class="store.testMode ? 'fas fa-flask text-amber-500' : 'fas fa-folder text-yellow-500'"
                                ></i>
                                <div>
                                    <p class="text-gray-500 dark:text-gray-400 text-xs">Pasta ativa</p>
                                    <p class="font-mono text-gray-800 dark:text-gray-200">{{ store.testMode ? 'test-robot/' : 'encaminhados/' }}</p>
                                </div>
                            </div>
                        </div>

                        <div class="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Arquivos gerados</h4>
                            <ul class="space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                                <li class="flex items-center gap-2">
                                    <i class="fas fa-file-csv text-blue-400"></i>
                                    <span class="font-mono">Engenharia.csv</span>
                                </li>
                                <li class="flex items-center gap-2">
                                    <i class="fas fa-file-csv text-blue-400"></i>
                                    <span class="font-mono">Area_construida_total.csv</span>
                                </li>
                            </ul>
                        </div>

                        <div class="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-1.5">
                            <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Pastas do bucket</h4>
                            <div class="flex items-center gap-2 text-xs">
                                <i class="fas fa-flask text-amber-400 w-4 text-center"></i>
                                <span class="font-mono text-gray-700 dark:text-gray-300">test-robot/</span>
                                <span class="text-gray-400">testes</span>
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                                <i class="fas fa-paper-plane text-blue-400 w-4 text-center"></i>
                                <span class="font-mono text-gray-700 dark:text-gray-300">encaminhados/</span>
                                <span class="text-gray-400">produção</span>
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                                <i class="fas fa-archive text-gray-400 w-4 text-center"></i>
                                <span class="font-mono text-gray-700 dark:text-gray-300">processados/</span>
                                <span class="text-gray-400">pós-processamento</span>
                            </div>
                        </div>
                    </div>

                    <!-- Instrucoes -->
                    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 p-5">
                        <h3 class="font-semibold text-gray-900 dark:text-white mb-3">Como usar</h3>
                        <ol class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <li class="flex items-start gap-2">
                                <span class="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                                Selecione o arquivo <strong>Valores Projetados - 2025.xlsx</strong>
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                                Teste primeiro em <strong>test-robot</strong> antes de enviar para produção
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                                Revise a pré-visualização dos dados
                            </li>
                            <li class="flex items-start gap-2">
                                <span class="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                                Clique em <strong>Enviar ao Bucket</strong> para confirmar
                            </li>
                        </ol>
                    </div>

                </aside>
            </div>

            <!-- ── Histórico ── -->
            <div class="mt-8 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
                <div class="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Histórico de Envios</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Últimos 50 envios ao bucket</p>
                    </div>
                    <button @click="store.fetchHistory()" class="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                        <i class="fas fa-sync-alt text-xs"></i> Atualizar
                    </button>
                </div>

                <div class="overflow-x-auto">
                    <table v-if="store.history.length > 0" class="min-w-full text-sm">
                        <thead>
                            <tr class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Data/Hora</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Usuário</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Arquivo Origem</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Pasta</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Arquivos Enviados</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Detalhe</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="item in store.history"
                                :key="item.id"
                                class="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                            >
                                <td class="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                    {{ formatDate(item.createdAt) }}
                                </td>
                                <td class="px-4 py-3">
                                    <div class="flex flex-col">
                                        <span class="font-medium text-gray-800 dark:text-gray-200">{{ item.userName || '—' }}</span>
                                        <span class="text-xs text-gray-400">{{ item.userEmail || '' }}</span>
                                    </div>
                                </td>
                                <td class="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                                    {{ item.sourceFile || '—' }}
                                </td>
                                <td class="px-4 py-3">
                                    <span
                                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium font-mono"
                                        :class="item.folder === 'test-robot'
                                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                                            : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'"
                                    >
                                        <i :class="item.folder === 'test-robot' ? 'fas fa-flask' : 'fas fa-paper-plane'" class="text-xs"></i>
                                        {{ item.folder || 'encaminhados' }}
                                    </span>
                                </td>
                                <td class="px-4 py-3">
                                    <div v-if="item.filesUploaded?.length" class="flex flex-wrap gap-1">
                                        <span
                                            v-for="f in item.filesUploaded"
                                            :key="f"
                                            class="inline-block bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded px-2 py-0.5 text-xs font-mono"
                                        >{{ f }}</span>
                                    </div>
                                    <span v-else class="text-gray-400">—</span>
                                </td>
                                <td class="px-4 py-3">
                                    <span
                                        class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                        :class="item.status === 'success'
                                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                            : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'"
                                    >
                                        <i :class="item.status === 'success' ? 'fas fa-check' : 'fas fa-times'" class="text-xs"></i>
                                        {{ item.status === 'success' ? 'Sucesso' : 'Erro' }}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                    {{ item.status === 'error' ? item.errorMessage : (item.gcsPaths?.join(', ') || '—') }}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div v-else class="py-12 text-center text-gray-500 dark:text-gray-400">
                        <i class="fas fa-history text-3xl mb-3 opacity-40"></i>
                        <p>Nenhum envio registrado ainda.</p>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useBucketUploadStore } from '@/stores/Tools/BucketUpload/bucketUploadStore';
import Favorite from '@/components/config/Favorite.vue'

const store = useBucketUploadStore();
const fileInput = ref(null);
const dragging = ref(false);
const selectedFileName = ref('');
const successResult = ref(null);

onMounted(() => store.fetchHistory());

// ── Paginação ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;
const pageMap = ref({});  // { [file.name]: currentPage }

watch(() => store.preview, () => { pageMap.value = {}; });

function getPage(file)  { return pageMap.value[file.name] ?? 1; }
function setPage(file, p) {
    const max = totalPages(file);
    pageMap.value[file.name] = Math.max(1, Math.min(p, max));
}
function totalPages(file) {
    return Math.max(1, Math.ceil(file.totalRows / PAGE_SIZE));
}
function getPageRows(file) {
    const dataRows = file.previewRows.slice(1); // exclui header
    const page = getPage(file);
    const start = (page - 1) * PAGE_SIZE;
    return dataRows.slice(start, start + PAGE_SIZE);
}
function pageRangeLabel(file) {
    const page = getPage(file);
    const start = (page - 1) * PAGE_SIZE + 1;
    const end   = Math.min(page * PAGE_SIZE, file.totalRows);
    return `${start}–${end}`;
}
function visiblePages(file) {
    const current = getPage(file);
    const total   = totalPages(file);
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const pages = [];
    if (current <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', total);
    } else if (current >= total - 3) {
        pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
    } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
    return pages;
}

function onDrop(e) {
    dragging.value = false;
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
}

function onFileSelected(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
    e.target.value = '';
}

async function processFile(file) {
    if (!file.name.endsWith('.xlsx')) {
        store.error = 'Apenas arquivos .xlsx são aceitos.';
        return;
    }
    selectedFileName.value = file.name;
    successResult.value = null;
    store.error = null;
    await store.processFile(file);
}

async function handleConfirm() {
    successResult.value = null;
    try {
        const result = await store.confirmSend();
        successResult.value = result;
        selectedFileName.value = '';
    } catch {
        // error já está em store.error
    }
}

function resetFile() {
    store.cancelPreview();
    selectedFileName.value = '';
    successResult.value = null;
    if (fileInput.value) fileInput.value.value = '';
}

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}
</script>
