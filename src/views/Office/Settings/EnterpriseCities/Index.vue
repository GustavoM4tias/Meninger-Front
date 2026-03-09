<template>
    <div class="min-h-full py-6 md:py-8 px-4 bg-gray-50 dark:bg-gray-950">
        <div class="max-w-7xl mx-auto">

            <!-- Header -->
            <div class="mb-6">
                <div class="flex items-center">
                    <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Vínculos de Cidades
                    </h1>
                    <Favorite class="my-auto" :router="'/settings/cidades'" :section="'Cidades'" />
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    Mapeamento de empreendimentos para cidades. <span
                        class="font-medium text-gray-600 dark:text-gray-300">Overrides</span> prevalecem sobre o valor
                    padrão.
                    Empreendimentos vinculados a cidades controlam a visibilidade de produtos, exceto para
                    Administradores.
                </p>
            </div>

            <!-- Filtros -->
            <div
                class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5 mb-6 space-y-2">

                <!-- Busca -->
                <div class="relative">
                    <i
                        class="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                    <input v-model="searchQuery" type="text" placeholder="Buscar por nome, ID ou cidade…"
                        @keyup.enter="buscar(true)"
                        class="w-full pl-9 pr-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 placeholder:text-gray-400 transition" />
                </div>

                <!-- Filtros secundários -->
                <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div class="space-y-1">
                        <label
                            class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fonte</label>
                        <select v-model="filterSource"
                            class="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15">
                            <option value="">Todas</option>
                            <option value="crm">CRM</option>
                            <option value="erp">ERP</option>
                        </select>
                    </div>

                    <div class="space-y-1">
                        <label
                            class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Override</label>
                        <select v-model="filterOverride"
                            class="w-full px-3 py-2 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15">
                            <option value="">Todos</option>
                            <option value="true">Com override</option>
                            <option value="false">Sem override</option>
                        </select>
                    </div>

                    <div class="flex items-end">
                        <button @click="buscar(true)"
                            class="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition">
                            <i class="fas fa-search text-xs"></i> Buscar
                        </button>
                    </div>

                    <div class="flex items-end">
                        <button @click="clearFilters"
                            class="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                            <i class="fas fa-eraser text-xs"></i> Limpar
                        </button>
                    </div>

                    <div class="flex items-end gap-2">
                        <button
                            class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition"
                            @click="openConfirm('crm')">
                            <img src="/CVLogo.png" alt="CRM" class="h-3.5 w-3.5 drop-shadow" />
                            CRM
                        </button>
                        <button
                            class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition"
                            @click="openConfirm('erp')">
                            <i class="fas fa-arrows-rotate text-xs"></i>
                            ERP
                        </button>
                    </div>
                </div>

                <!-- Parâmetros ERP -->
                <div class="pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="space-y-1">
                        <label
                            class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">ERP
                            Limit</label>
                        <input v-model.number="erpLimit" type="number" min="50" step="50"
                            class="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15" />
                        <p class="text-xs text-gray-400">Tamanho de página na API do ERP (Sienge).</p>
                    </div>
                    <div class="space-y-1">
                        <label
                            class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">ERP
                            Máx</label>
                        <input v-model="erpMaxCount" type="number" min="1"
                            class="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15" />
                        <p class="text-xs text-gray-400">Opcional. Limita o total processado.</p>
                    </div>
                    <div class="flex flex-col justify-center gap-2 pt-1">
                        <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" v-model="erpVerbose" class="accent-blue-600 rounded" />
                            <span>Logs verbose</span>
                            <i class="fas fa-info-circle text-gray-400 cursor-pointer"
                                v-tippy="'Logs de andamento do Sync no servidor'"></i>
                        </label>
                        <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox" v-model="showRaw" @change="buscar(true)"
                                class="accent-blue-600 rounded" />
                            <span>Mostrar JSON (debug)</span>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Tabela -->
            <div
                class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden mb-4">

                <!-- Error -->
                <div v-if="error" class="p-8 text-center">
                    <i class="fas fa-triangle-exclamation text-red-400 text-2xl mb-2"></i>
                    <p class="text-sm text-gray-600 dark:text-gray-400">{{ error }}</p>
                </div>

                <!-- Skeleton -->
                <div v-else-if="loading" class="animate-pulse divide-y divide-gray-100 dark:divide-gray-800">
                    <div class="h-10 bg-gray-50 dark:bg-gray-800/50"></div>
                    <div v-for="i in 8" :key="i" class="h-12 bg-white dark:bg-gray-900"></div>
                </div>

                <!-- Table -->
                <div v-else class="overflow-x-auto">
                    <table class="min-w-full text-sm">
                        <thead>
                            <tr class="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                                <th
                                    class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Fonte</th>
                                <th
                                    class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    CRM ID</th>
                                <th
                                    class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    ERP ID</th>
                                <th
                                    class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Empreendimento</th>
                                <th
                                    class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Padrão</th>
                                <th
                                    class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Override</th>
                                <th
                                    class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Efetiva</th>
                                <th
                                    class="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    JSON</th>
                                <th class="px-4 py-3 w-20"></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50 dark:divide-gray-800/50">
                            <tr v-if="!items.length">
                                <td colspan="9" class="px-4 py-10 text-center text-sm text-gray-400">Nenhum registro.
                                </td>
                            </tr>
                            <tr v-for="row in items" :key="row.id"
                                class="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                                <td class="px-4 py-3">
                                    <span
                                        :class="['px-2 py-0.5 text-xs rounded-full inline-flex items-center gap-1 font-medium', badgeSource(row.source)]">
                                        <i class="fas"
                                            :class="row.source === 'crm' ? 'fa-database' : 'fa-building'"></i>
                                        {{ fmtSource(row.source) }}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{{ row.crm_id ?? '-' }}
                                </td>
                                <td class="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{{ row.erp_id ?? '-' }}
                                </td>
                                <td class="px-4 py-3 max-w-xs truncate text-gray-900 dark:text-gray-100"
                                    :title="row.enterprise_name">{{ row.enterprise_name }}</td>
                                <td class="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{{ row.default_city ||
                                    '-' }}</td>
                                <td class="px-4 py-3">
                                    <span v-if="row.city_override"
                                        class="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                        {{ row.city_override }}
                                    </span>
                                    <span v-else class="text-gray-300 dark:text-gray-600">—</span>
                                </td>
                                <td class="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 text-xs">
                                    {{ row.effective_city || '-' }}
                                    <span v-if="row.city_override"
                                        class="ml-1 text-[10px] text-gray-400">(override)</span>
                                </td>
                                <td class="px-4 py-3 relative">
                                    <button v-if="'raw_payload' in row"
                                        :disabled="!row.raw_payload || (typeof row.raw_payload === 'object' && !Object.keys(row.raw_payload).length)"
                                        class="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                        @click.stop="toggleJson(row.id)">
                                        JSON
                                    </button>

                                    <!-- JSON Popover -->
                                    <div v-if="jsonPopoverOpenId === row.id"
                                        class="absolute z-20 mt-2 w-[36rem] max-w-xl right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4"
                                        @click.stop>
                                        <div class="flex items-center justify-between mb-3">
                                            <span
                                                class="text-xs font-semibold text-gray-700 dark:text-gray-300">raw_payload</span>
                                            <div class="flex items-center gap-1.5">
                                                <button
                                                    class="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                                    @click="navigator.clipboard.writeText(JSON.stringify(row.raw_payload, null, 2))">Copiar</button>
                                                <a :href="'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(row.raw_payload, null, 2))"
                                                    :download="`raw-${row.source}-${row.erp_id || row.crm_id || row.id}.json`"
                                                    class="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition">Baixar</a>
                                                <button
                                                    class="px-2 py-1 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                                    @click="jsonPopoverOpenId = null">Fechar</button>
                                            </div>
                                        </div>
                                        <pre
                                            class="text-xs leading-5 whitespace-pre-wrap overflow-auto max-h-72 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">{{ JSON.stringify(row.raw_payload, null, 2) }}</pre>
                                    </div>
                                </td>
                                <td class="px-4 py-3 text-right">
                                    <button
                                        class="px-3 py-1.5 text-xs rounded-lg bg-gray-900 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white transition"
                                        @click="openOverride(row)">
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Pagination -->
            <div class="flex items-center justify-between">
                <p class="text-xs text-gray-500 dark:text-gray-400">
                    Total: <span class="font-medium text-gray-700 dark:text-gray-300">{{ total }}</span> — Página <span
                        class="font-medium text-gray-700 dark:text-gray-300">{{ page }}</span> de <span
                        class="font-medium text-gray-700 dark:text-gray-300">{{ totalPages }}</span>
                </p>
                <div class="flex items-center gap-2">
                    <button :disabled="page <= 1" @click="goTo(page - 1)"
                        class="px-3 py-1.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
                        <i class="fas fa-chevron-left text-xs mr-1"></i>Anterior
                    </button>
                    <button :disabled="page >= totalPages" @click="goTo(page + 1)"
                        class="px-3 py-1.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
                        Próxima<i class="fas fa-chevron-right text-xs ml-1"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Modal Override -->
        <transition name="fade">
            <div v-if="showOverrideModal" class="fixed inset-0 z-40 flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showOverrideModal = false" />
                <div
                    class="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4">
                    <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Editar cidade do empreendimento</h3>
                    <div class="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                        <p class="truncate font-medium text-gray-700 dark:text-gray-300">{{ editingRow?.enterprise_name
                            }}</p>
                        <p>Padrão: <strong class="text-gray-900 dark:text-white">{{ editingRow?.default_city || '-'
                                }}</strong></p>
                    </div>
                    <div class="space-y-1.5">
                        <label
                            class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Override</label>
                        <input v-model.trim="newCity" type="text" placeholder="Deixe vazio para remover"
                            class="w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 placeholder:text-gray-400" />
                    </div>
                    <div class="flex justify-end gap-2 pt-1">
                        <button
                            class="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                            @click="showOverrideModal = false">Cancelar</button>
                        <button
                            class="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition"
                            @click="saveOverride">Salvar</button>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Drawer Logs -->
        <transition name="slide-right">
            <div v-if="showLogs" class="fixed inset-0 z-30 flex justify-end">
                <div class="absolute inset-0 bg-black/40" @click="showLogs = false" />
                <div
                    class="relative w-full max-w-2xl h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col">
                    <div
                        class="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Logs do Sync ERP</h3>
                        <div class="flex items-center gap-2">
                            <button
                                class="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                @click="navigator.clipboard.writeText((logs || []).join('\n'))">Copiar</button>
                            <a :href="'data:text/plain;charset=utf-8,' + encodeURIComponent((logs || []).join('\n'))"
                                download="erp-sync.log"
                                class="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">Baixar</a>
                            <button
                                class="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                @click="store.clearLogs()">Limpar</button>
                            <button
                                class="w-7 h-7 grid place-items-center rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                @click="showLogs = false"><i class="fas fa-times text-xs"></i></button>
                        </div>
                    </div>
                    <div
                        class="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-950 font-mono text-xs leading-5 whitespace-pre-wrap">
                        <template v-if="logs?.length">
                            <div v-for="(l, i) in logs" :key="i" class="text-gray-700 dark:text-gray-300">{{ l }}</div>
                        </template>
                        <div v-else class="text-gray-400">Sem logs para exibir.</div>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Modal Confirmação Dupla -->
        <transition name="fade">
            <div v-if="confirmVisible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeConfirm" />
                <div
                    class="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4">

                    <!-- Step 1 -->
                    <template v-if="confirmStep === 1">
                        <div class="flex items-center gap-3">
                            <div
                                class="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 grid place-items-center shrink-0">
                                <i class="fas fa-triangle-exclamation text-amber-600 dark:text-amber-400 text-sm"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Sincronizar {{
                                    confirmSource === 'crm' ? 'CRM' : 'ERP' }}</h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Esta operação pode ser
                                    demorada.</p>
                            </div>
                        </div>
                        <div
                            class="text-sm text-gray-600 dark:text-gray-300 space-y-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                            <p>Irá <strong>recalcular todos os empreendimentos</strong> do {{ confirmSource === 'crm' ?
                                'CRM' : 'ERP (Sienge)' }}.</p>
                            <ul class="list-disc pl-4 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                                <li>Consulta a API de origem com paginação.</li>
                                <li>Atualiza/insere vínculos conforme as regras.</li>
                                <li>Não remove overrides existentes.</li>
                            </ul>
                        </div>
                        <div class="flex justify-end gap-2">
                            <button
                                class="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                @click="closeConfirm">Cancelar</button>
                            <button
                                class="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition"
                                @click="goToConfirmStep2">Continuar</button>
                        </div>
                    </template>

                    <!-- Step 2 -->
                    <template v-else>
                        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Confirmação final</h3>
                        <div class="text-sm text-gray-600 dark:text-gray-300 space-y-3">
                            <p>Digite exatamente a frase abaixo para confirmar:</p>
                            <div
                                class="px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-400/20 text-sm font-mono font-semibold text-amber-800 dark:text-amber-300 text-center tracking-wide">
                                {{ confirmRequiredPhrase }}
                            </div>
                            <div class="space-y-1.5">
                                <input v-model.trim="confirmPhraseInput" type="text" placeholder="Digite aqui…"
                                    class="w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 placeholder:text-gray-400" />
                                <p class="text-xs text-gray-400">Tudo em maiúsculo.</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-1">
                            <button
                                class="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                @click="confirmStep = 1">Voltar</button>
                            <div class="flex gap-2">
                                <button
                                    class="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                    @click="closeConfirm">Cancelar</button>
                                <button :disabled="!canConfirm" @click="runConfirmedSync"
                                    class="px-4 py-2 rounded-xl text-sm font-medium text-white transition"
                                    :class="canConfirm ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600/30 cursor-not-allowed'">
                                    Iniciar
                                </button>
                            </div>
                        </div>
                    </template>

                </div>
            </div>
        </transition>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import Favorite from '@/components/config/Favorite.vue'
import { useEnterpriseCitiesStore } from '@/stores/Settings/Admin/enterpriseCitiesStore'
import { useCarregamentoStore } from '@/stores/Config/carregamento'

const store = useEnterpriseCitiesStore()
const carregamento = useCarregamentoStore()

const { items, total, page, pageSize, loading, error, filtros, logs, showRaw } = storeToRefs(store)

const jsonPopoverOpenId = ref(null)
function toggleJson(id) { jsonPopoverOpenId.value = jsonPopoverOpenId.value === id ? null : id }

const showOverrideModal = ref(false)
const editingRow = ref(null)
const newCity = ref('')
const showLogs = ref(false)

const searchQuery = computed({ get: () => filtros.value.q || '', set: (v) => { filtros.value.q = v } })
const filterSource = computed({ get: () => filtros.value.source || '', set: (v) => { filtros.value.source = v } })
const filterOverride = computed({ get: () => filtros.value.hasOverride ?? '', set: (v) => { filtros.value.hasOverride = v } })

const totalPages = computed(() => Math.max(1, Math.ceil((total.value || 0) / (pageSize.value || 50))))

function fmtSource(s) { return s === 'crm' ? 'CRM' : s === 'erp' ? 'ERP' : s }
function badgeSource(s) {
    return s === 'crm'
        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200'
        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
}

function openOverride(row) { editingRow.value = row; newCity.value = row.city_override || row.effective_city || ''; showOverrideModal.value = true; }
async function saveOverride() {
    try { await store.setOverride(editingRow.value.id, newCity.value.trim() || null); showOverrideModal.value = false; }
    catch (e) { alert(e.message) }
}

async function buscar(reset = false) { await store.fetchList({ resetPage: reset }) }
function clearFilters() { searchQuery.value = ''; filterSource.value = ''; filterOverride.value = ''; buscar(true); }
async function goTo(p) { if (p < 1 || p > totalPages.value) return; page.value = p; await buscar(false); }

const erpLimit = ref(200)
const erpMaxCount = ref('')
const erpVerbose = ref(false)

const confirmVisible = ref(false)
const confirmStep = ref(1)
const confirmSource = ref('')
const confirmPhraseInput = ref('')
const confirmRequiredPhrase = computed(() => confirmSource.value === 'crm' ? 'RECALCULAR CRM' : 'RECALCULAR ERP')
const canConfirm = computed(() => confirmPhraseInput.value.trim().toUpperCase() === confirmRequiredPhrase.value)

function openConfirm(source) { confirmSource.value = source; confirmStep.value = 1; confirmPhraseInput.value = ''; confirmVisible.value = true; }
function closeConfirm() { confirmVisible.value = false; confirmPhraseInput.value = ''; confirmStep.value = 1; confirmSource.value = ''; }
function goToConfirmStep2() { confirmStep.value = 2 }

async function runConfirmedSync() {
    try { confirmSource.value === 'crm' ? await doSyncCRM() : await doSyncERP(); }
    finally { closeConfirm() }
}

async function doSyncCRM() {
    try { carregamento.iniciarCarregamento(); const r = await store.syncCRM(); await buscar(false); alert(`CRM sync ok. Itens: ${r.count ?? 0}`); }
    catch (e) { alert(e.message) }
    finally { carregamento.finalizarCarregamento() }
}

async function doSyncERP() {
    try {
        carregamento.iniciarCarregamento()
        const opts = { limit: Number(erpLimit.value) || 200, verbose: !!erpVerbose.value }
        if (erpMaxCount.value) opts.maxCount = Number(erpMaxCount.value)
        const res = await store.syncERP(opts)
        await buscar(false)
        if (opts.verbose) { showLogs.value = true; }
        else { alert(`ERP sync ok. upserts=${res.upserts}, matched=${res.matched}, skipped=${res.skipped}`) }
    } catch (e) { alert(e.message) }
    finally { carregamento.finalizarCarregamento() }
}

onMounted(() => buscar(true))
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
    transition: transform 0.25s ease, opacity 0.2s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
    transform: translateX(100%);
    opacity: 0;
}
</style>