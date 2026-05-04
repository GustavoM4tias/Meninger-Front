<template>
    <div v-if="visivel" class="fixed inset-0 z-50 overflow-y-auto" @click="emit('fechar')">
        <div class="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
            <div class="fixed inset-0 bg-gray-900/60 transition-opacity"></div>

            <div class="relative inline-block w-full max-w-7xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-50 dark:bg-gray-800 shadow-xl rounded-2xl"
                @click.stop>

                <!-- ── Header ─────────────────────────────────────────── -->
                <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-xl font-bold">Pré-Cadastros</h3>
                            <p class="text-sm text-gray-500">{{ kpis.total }} análise(s) — {{ kpis.bancos }} empresa(s) — {{ kpis.clientes }} cliente(s)</p>
                        </div>

                        <div class="flex items-center gap-2 flex-wrap">
                            <!-- View mode -->
                            <div class="inline-flex rounded-md border dark:border-gray-600 overflow-hidden">
                                <button v-for="m in viewModes" :key="m.k" type="button" @click="viewMode = m.k"
                                    :class="['px-3 py-1 text-sm font-medium', viewMode === m.k ? 'bg-purple-600 text-white' : 'bg-white dark:bg-gray-600', m.border ? 'border-l border-gray-300 dark:border-gray-700' : '']">
                                    <i :class="m.icon" class="mr-1"></i>{{ m.label }}
                                </button>
                            </div>

                            <!-- Export -->
                            <button class="text-2xl ps-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                                v-tippy="'Exportar Dados'" @click="exportOpen = true">
                                <i class="fas fa-download"></i>
                            </button>

                            <!-- Close -->
                            <button type="button" @click="emit('fechar')"
                                class="text-dark hover:text-gray-700 ps-3 pt-1 dark:text-white dark:hover:text-blue-100 text-2xl transition-colors">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="max-h-[80vh] overflow-y-auto bg-gray-50 dark:bg-gray-900/40">

                    <!-- ── KPI Cards ──────────────────────────────────── -->
                    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

                            <!-- Total / Em análise -->
                            <div class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 shadow-sm dark:shadow-lg dark:shadow-gray-50/5 border-blue-500">
                                <div class="flex items-center justify-between h-full">
                                    <div>
                                        <p class="text-sm font-medium">Total</p>
                                        <p class="text-2xl font-bold text-blue-400">{{ kpis.total }}</p>
                                        <p class="text-xs text-gray-500">Em análise: <b>{{ kpis.emAnalise }}</b></p>
                                    </div>
                                    <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                                        <i class="fas fa-id-card-clip text-blue-600"></i>
                                    </div>
                                </div>
                            </div>

                            <!-- Tempo médio até finalizar -->
                            <div class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 shadow-sm dark:shadow-lg dark:shadow-gray-50/5 border-amber-500">
                                <div class="flex items-center justify-between h-full">
                                    <div>
                                        <p class="text-sm font-medium">Tempo até finalizar</p>
                                        <p class="text-lg font-bold text-amber-400">{{ kpis.tempoMedioFin.toFixed(1) }} dias</p>
                                        <p class="text-xs text-gray-500">{{ kpis.totalFin }} finalizada(s)</p>
                                    </div>
                                    <div class="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">
                                        <i class="fas fa-stopwatch text-amber-600"></i>
                                    </div>
                                </div>
                            </div>

                            <!-- % Aprovação -->
                            <div class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 shadow-sm dark:shadow-lg dark:shadow-gray-50/5 border-emerald-500"
                                v-tippy="'Sobre o total de pastas: % aprovadas (inclui Em Reserva)'">
                                <div class="flex items-center justify-between h-full">
                                    <div>
                                        <p class="text-sm font-medium">% Aprovação</p>
                                        <p class="text-2xl font-bold text-emerald-500">{{ pctStr(kpis.pctAprov) }}</p>
                                        <p class="text-xs text-gray-500">{{ kpis.aprov }} ({{ kpis.aprovSemReserva }}+{{ kpis.reserva }})</p>
                                    </div>
                                    <div class="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-2xl">
                                        <i class="fas fa-check text-emerald-600"></i>
                                    </div>
                                </div>
                            </div>

                            <!-- % Conv. Reserva -->
                            <div class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 shadow-sm dark:shadow-lg dark:shadow-gray-50/5 border-yellow-500"
                                v-tippy="'Sobre o total: % que viraram reserva'">
                                <div class="flex items-center justify-between h-full">
                                    <div>
                                        <p class="text-sm font-medium">% Conv. Reserva</p>
                                        <p class="text-2xl font-bold text-yellow-500">{{ pctStr(kpis.pctConversao) }}</p>
                                        <p class="text-xs text-gray-500">{{ kpis.reserva }} de {{ kpis.total }}</p>
                                    </div>
                                    <div class="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center text-2xl">
                                        <i class="fas fa-bookmark text-yellow-600"></i>
                                    </div>
                                </div>
                            </div>

                            <!-- % Reprovação -->
                            <div class="bg-white dark:bg-gray-900/80 rounded-lg p-4 border-l-4 shadow-sm dark:shadow-lg dark:shadow-gray-50/5 border-red-500"
                                v-tippy="'Sobre o total: % reprovadas / canceladas'">
                                <div class="flex items-center justify-between h-full">
                                    <div>
                                        <p class="text-sm font-medium">% Reprovação</p>
                                        <p class="text-2xl font-bold text-red-500">{{ pctStr(kpis.pctReprov) }}</p>
                                        <p class="text-xs text-gray-500">{{ kpis.reprov }} de {{ kpis.total }}</p>
                                    </div>
                                    <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-2xl">
                                        <i class="fas fa-times text-red-600"></i>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    <!-- ── Filtros internos (draft + aplicar no botão) ── -->
                    <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40">
                        <div class="flex flex-wrap gap-3 items-end">
                            <div class="flex-1 min-w-44">
                                <label class="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">Empreendimento</label>
                                <MultiSelector v-model="draftEmpreendimentoArr" :options="opcoesEmpreendimento" placeholder="Selecione..." :page-size="200" :select-all="true" :close-on-outside="true" />
                            </div>
                            <div class="flex-1 min-w-44">
                                <label class="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">Empresa</label>
                                <MultiSelector v-model="draftEmpresaArr" :options="opcoesEmpresa" placeholder="Selecione..." :page-size="150" :select-all="true" :close-on-outside="true" />
                            </div>
                            <div class="flex-1 min-w-44">
                                <label class="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">Etapa</label>
                                <MultiSelector v-model="draftEtapaArr" :options="opcoesEtapa" placeholder="Selecione..." :page-size="150" :select-all="true" :close-on-outside="true" />
                            </div>
                            <div class="flex-1 min-w-44">
                                <label class="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">Imobiliária</label>
                                <MultiSelector v-model="draftImobArr" :options="opcoesImob" placeholder="Selecione..." :page-size="150" :select-all="true" :close-on-outside="true" />
                            </div>
                            <div class="flex-1 min-w-44">
                                <label class="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">Corretor</label>
                                <MultiSelector v-model="draftCorretorArr" :options="opcoesCorretor" placeholder="Selecione..." :page-size="150" :select-all="true" :close-on-outside="true" />
                            </div>
                            <div class="flex-1 min-w-44">
                                <label class="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">Origem do Lead</label>
                                <MultiSelector v-model="draftOrigemArr" :options="opcoesOrigem" placeholder="Origens..." :page-size="150" :select-all="true" :close-on-outside="true" />
                            </div>
                            <div class="flex gap-2">
                                <button @click="onLimparModal"
                                    class="flex items-center px-3 py-2 text-sm font-semibold bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none">
                                    <i class="fas fa-broom pe-1 my-auto"></i> Limpar
                                </button>
                                <button @click="onAplicarModal"
                                    class="flex items-center px-3 py-2 text-sm font-semibold bg-sky-500 text-white rounded-lg hover:bg-sky-600 focus:outline-none">
                                    <i class="fas fa-filter pe-1 my-auto"></i> Filtrar
                                </button>
                            </div>
                        </div>
                        <div v-if="hasFiltrosAplicados" class="mt-2 text-xs text-purple-600 dark:text-purple-300">
                            <i class="fas fa-info-circle mr-1"></i>{{ activeFiltrosCount }} filtro(s) aplicado(s) — {{ precadastrosFiltrados.length }} de {{ precadastros.length }} pré-cadastro(s)
                        </div>
                    </div>

                    <!-- ── Busca + paginação ──────────────────────────── -->
                    <div class="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40">
                        <div class="flex flex-wrap gap-4 items-end justify-between">
                            <div class="flex-1">
                                <label class="block text-sm font-medium mb-2">
                                    Cliente | CPF | Empreendimento | Empresa | Etapa
                                </label>
                                <div class="relative">
                                    <input v-model="search" type="text" placeholder="Digite para buscar..."
                                        class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-500 text-start" />
                                    <button v-if="search" @click="search = ''"
                                        class="absolute right-2 top-2 text-gray-400 hover:text-gray-600">
                                        <i class="fas fa-times-circle"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="flex-none">
                                <label class="block text-sm font-medium mb-2">Itens por página</label>
                                <select v-model="itemsPerPage"
                                    class="w-full px-2 py-1.5 border rounded-lg bg-transparent text-gray-400 border-gray-200 dark:border-gray-500 text-center">
                                    <option :value="10">10</option>
                                    <option :value="25">25</option>
                                    <option :value="50">50</option>
                                    <option :value="100">100</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- ── Charts (pizza/colunas/funil) ───────────────── -->
                    <div v-if="viewMode !== 'list'"
                        class="p-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <div class="flex justify-between items-center mb-4">
                            <div class="text-sm text-gray-500">
                                <span v-if="search" class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                    Filtro ativo: {{ search }}
                                    <button @click="search = ''" class="ml-1 hover:text-blue-900 font-bold">x</button>
                                </span>
                                <span v-else>Clique no gráfico para filtrar a lista abaixo.</span>
                            </div>
                            <select v-model="chartGroup"
                                class="px-2 py-1 text-xs border rounded bg-white dark:bg-gray-700 dark:border-gray-600">
                                <option value="empresa">Por Empresa Correspondente</option>
                                <option value="etapa">Por Etapa</option>
                                <option value="empreendimento">Por Empreendimento</option>
                                <option value="bucket">Por Grupo (Funil)</option>
                            </select>
                        </div>
                        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                            <VChart :option="chartOption" autoresize style="height: 400px; width: 100%;" @click="onChartClick" />
                        </div>
                    </div>

                    <!-- ── Tabela ─────────────────────────────────────── -->
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Cliente</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">CPF</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Empreendimento</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Empresa</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Etapa</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Aprovado</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Dias</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Cad.</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-700/40 dark:divide-gray-700">
                                <template v-for="p in paginated" :key="p.idprecadastro">
                                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                        @click="toggleExpand(p)">
                                        <td class="px-3 py-3">
                                            <div class="text-sm font-medium">{{ p.nome_cliente || p.cliente?.nome || '—' }}</div>
                                            <div class="text-gray-400 text-xs">#{{ p.idprecadastro }}</div>
                                        </td>
                                        <td class="px-3 py-3 text-center text-xs font-mono">{{ p.documento || '—' }}</td>
                                        <td class="px-3 py-3 text-center">
                                            <div class="text-sm truncate max-w-40">{{ p.empreendimento?.nome || '—' }}</div>
                                            <div class="text-[10px] text-gray-400 truncate max-w-40">{{ p.unidade?.nome || '' }}</div>
                                        </td>
                                        <td class="px-3 py-3 text-center text-xs truncate max-w-32">{{ p.empresa_correspondente?.nome || '—' }}</td>
                                        <td class="px-3 py-3 text-center">
                                            <span :class="['px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1', clsForStage(p.situacao_nome)]">
                                                <i :class="iconForStage(p.situacao_nome)"></i>
                                                <span class="truncate max-w-32">{{ p.situacao_nome || '—' }}</span>
                                            </span>
                                        </td>
                                        <td class="px-3 py-3 text-center text-sm font-semibold text-emerald-600">{{ fmtMoney(p.valor_aprovado) }}</td>
                                        <td class="px-3 py-3 text-center text-sm tabular-nums">{{ Number(p.dias_em_analise || 0).toFixed(0) }}</td>
                                        <td class="px-3 py-3 text-center text-xs">{{ fmtDate(p.data_cad) }}</td>
                                        <td class="px-3 py-3 text-center">
                                            <a v-if="p.link" :href="p.link" target="_blank" rel="noopener" @click.stop
                                                v-tippy="'Abrir no CV CRM'"
                                                class="inline-block group">
                                                <img src="/CVLogo.png" alt="CV CRM" class="w-5 inline grayscale group-hover:grayscale-0" />
                                            </a>
                                            <button @click.stop="toggleExpand(p)"
                                                class="ml-2 text-sm font-medium text-blue-600 hover:text-blue-900 dark:hover:text-blue-400">
                                                {{ expanded.has(p.idprecadastro) ? 'Ocultar' : 'Detalhes' }}
                                            </button>
                                        </td>
                                    </tr>

                                    <!-- Linha expandida -->
                                    <tr v-show="expanded.has(p.idprecadastro)" class="bg-gray-50 dark:bg-gray-900/60">
                                        <td colspan="9">
                                            <div class="p-4 space-y-3">
                                                <!-- Resumo financeiro -->
                                                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                    <div class="bg-white dark:bg-gray-900/40 rounded-lg p-3 border-l-4 border-blue-400 shadow-sm">
                                                        <p class="text-[10px] text-gray-500 uppercase">Avaliação</p>
                                                        <p class="text-sm font-semibold">{{ fmtMoney(p.valor_avaliacao) }}</p>
                                                    </div>
                                                    <div class="bg-white dark:bg-gray-900/40 rounded-lg p-3 border-l-4 border-emerald-400 shadow-sm">
                                                        <p class="text-[10px] text-gray-500 uppercase">Aprovado</p>
                                                        <p class="text-sm font-semibold text-emerald-600">{{ fmtMoney(p.valor_aprovado) }}</p>
                                                    </div>
                                                    <div class="bg-white dark:bg-gray-900/40 rounded-lg p-3 border-l-4 border-purple-400 shadow-sm">
                                                        <p class="text-[10px] text-gray-500 uppercase">Subsídio</p>
                                                        <p class="text-sm font-semibold">{{ fmtMoney(p.valor_subsidio) }}</p>
                                                    </div>
                                                    <div class="bg-white dark:bg-gray-900/40 rounded-lg p-3 border-l-4 border-amber-400 shadow-sm">
                                                        <p class="text-[10px] text-gray-500 uppercase">FGTS</p>
                                                        <p class="text-sm font-semibold">{{ fmtMoney(p.valor_fgts) }}</p>
                                                    </div>
                                                    <div class="bg-white dark:bg-gray-900/40 rounded-lg p-3 border-l-4 border-cyan-400 shadow-sm">
                                                        <p class="text-[10px] text-gray-500 uppercase">Total</p>
                                                        <p class="text-sm font-semibold">{{ fmtMoney(p.valor_total) }}</p>
                                                    </div>
                                                    <div class="bg-white dark:bg-gray-900/40 rounded-lg p-3 border-l-4 border-orange-400 shadow-sm">
                                                        <p class="text-[10px] text-gray-500 uppercase">Renda</p>
                                                        <p class="text-sm font-semibold">{{ fmtMoney(p.renda_total) }}</p>
                                                    </div>
                                                </div>

                                                <!-- Info linhas -->
                                                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                    <div><span class="text-xs text-gray-500">Imobiliária</span><div>{{ p.imobiliaria?.nome || '—' }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Corretor</span><div>{{ p.corretor?.nome || '—' }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Correspondente</span><div>{{ p.correspondente?.nome || '—' }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Aprovado por</span><div>{{ p.usuario_aprovou?.nome || '—' }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Cadastro</span><div>{{ fmtDateTime(p.data_cad) }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Finalização</span><div>{{ fmtDateTime(p.data_fim) }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Cancelamento</span><div>{{ fmtDateTime(p.data_cancelamento) }}</div></div>
                                                    <div><span class="text-xs text-gray-500">Vencimento Aprov.</span><div>{{ p.vencimento_aprovacao || '—' }}</div></div>
                                                </div>

                                                <!-- Atalhos pro detalhe completo -->
                                                <div class="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <button @click.stop="abrirDetalhe(p)"
                                                        class="px-3 py-1.5 rounded text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 hover:bg-purple-600 hover:text-white">
                                                        <i class="fas fa-list-check mr-1"></i>Histórico / Leads
                                                    </button>
                                                    <a v-if="p.link" :href="p.link" target="_blank" rel="noopener"
                                                        class="px-3 py-1.5 rounded text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white">
                                                        <i class="fas fa-arrow-up-right-from-square mr-1"></i>Administrar no CV
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </template>
                                <tr v-if="!paginated.length">
                                    <td colspan="9" class="text-center py-12 text-gray-400">
                                        <i class="fas fa-inbox text-4xl mb-2"></i>
                                        <p>Nenhum pré-cadastro encontrado</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- ── Paginação completa ─────────────────────────── -->
                    <div v-if="totalPages > 1" class="m-4 flex items-center justify-between">
                        <div class="text-sm text-gray-500">
                            Mostrando {{ startItem }} a {{ endItem }} de {{ filtered.length }} pré-cadastro(s)
                        </div>
                        <div class="flex items-center gap-2">
                            <button @click="currentPage = 1" :disabled="currentPage === 1"
                                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50">
                                Primeira
                            </button>
                            <button @click="currentPage--" :disabled="currentPage === 1"
                                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <div class="flex gap-1">
                                <button v-for="page in visiblePages" :key="page" @click="currentPage = page"
                                    :class="['px-3 py-1 text-sm border rounded-md', page === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900']">
                                    {{ page }}
                                </button>
                            </div>
                            <button @click="currentPage++" :disabled="currentPage === totalPages"
                                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                            <button @click="currentPage = totalPages" :disabled="currentPage === totalPages"
                                class="px-3 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-50">
                                Última
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <!-- Export -->
    <Export v-model="exportOpen" :source="filtered" title="Exportação de Pré-Cadastros"
        filename="pre-cadastros" initial-delimiter=";" initial-array-mode="join"
        :preselect="[
            'idprecadastro', 'codigointerno',
            'nome_cliente', 'documento', 'email_cliente',
            'empreendimento.nome', 'unidade.nome',
            'imobiliaria.nome', 'corretor.nome',
            'empresa_correspondente.nome', 'correspondente.nome',
            'situacao_nome', 'data_cad', 'data_fim', 'dias_em_analise',
            'valor_avaliacao', 'valor_aprovado', 'valor_total', 'valor_fgts', 'valor_subsidio',
            'renda_total', 'link'
        ]" />

    <!-- Detalhe full (com aba Documentos/Histórico/Leads) -->
    <PrecadastroDetailModal :precadastro="detailItem" :visivel="detailVisible" @fechar="detailVisible = false" />
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import VChart from 'vue-echarts'
import * as echarts from 'echarts/core'
import { PieChart, BarChart, FunnelChart } from 'echarts/charts'
import {
    TooltipComponent, LegendComponent, GridComponent, TitleComponent, DataZoomComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import Export from '@/components/config/Export.vue'
import MultiSelector from '@/components/UI/MultiSelector.vue'
import PrecadastroDetailModal from './PrecadastroDetailModal.vue'
import { iconForStage, clsForStage, bucketOf, STAGE_GROUPS } from '../stages.js'

echarts.use([PieChart, BarChart, FunnelChart, TooltipComponent, LegendComponent, GridComponent, TitleComponent, DataZoomComponent, CanvasRenderer])

const props = defineProps({
    precadastros: { type: Array, default: () => [] },
    visivel: { type: Boolean, default: false },
    initialMode: { type: String, default: 'list' },
})
const emit = defineEmits(['fechar'])

// ── Modos ────────────────────────────────────────────────────────────────
const viewModes = [
    { k: 'list',   label: 'Listagem', icon: 'fas fa-list',         border: false },
    { k: 'pie',    label: 'Pizza',    icon: 'fas fa-chart-pie',    border: true },
    { k: 'bar',    label: 'Colunas',  icon: 'fas fa-chart-column', border: true },
    { k: 'funnel', label: 'Funil',    icon: 'fas fa-filter',       border: true },
]
const normalizeMode = (m) => ['list','pie','bar','funnel'].includes(m) ? m : 'list'
const viewMode = ref(normalizeMode(props.initialMode))
const chartGroup = ref('empresa')

// Sincroniza viewMode quando o pai trocar initialMode ou quando reabrir o modal.
// (O modal fica sempre montado por causa do v-if no template; sem isso,
//  o ref(initialMode) só dispara na primeira montagem.)
watch(() => props.initialMode, (m) => { viewMode.value = normalizeMode(m) })
watch(() => props.visivel, (v) => { if (v) viewMode.value = normalizeMode(props.initialMode) })

// ── Estado ───────────────────────────────────────────────────────────────
const search = ref('')
const itemsPerPage = ref(25)
const currentPage = ref(1)
const expanded = ref(new Set())
const exportOpen = ref(false)
const detailVisible = ref(false)
const detailItem = ref(null)

// ── Filtros internos do modal (estilo LeadModal: drafts + aplicar) ───────
// Drafts (UI, controlados pelos MultiSelector)
const draftEmpreendimento = ref(new Set())
const draftEmpresa        = ref(new Set())
const draftEtapa          = ref(new Set())
const draftImob           = ref(new Set())
const draftCorretor       = ref(new Set())
const draftOrigem         = ref(new Set())
// Aplicados (usados em precadastrosFiltrados)
const aplEmpreendimento   = ref(new Set())
const aplEmpresa          = ref(new Set())
const aplEtapa            = ref(new Set())
const aplImob             = ref(new Set())
const aplCorretor         = ref(new Set())
const aplOrigem           = ref(new Set())

const setSet = (r, arr) => { r.value = new Set(Array.isArray(arr) ? arr : []) }
const toArr  = (r) => ({ get: () => Array.from(r.value), set: (v) => setSet(r, v) })
const draftEmpreendimentoArr = computed(toArr(draftEmpreendimento))
const draftEmpresaArr        = computed(toArr(draftEmpresa))
const draftEtapaArr          = computed(toArr(draftEtapa))
const draftImobArr           = computed(toArr(draftImob))
const draftCorretorArr       = computed(toArr(draftCorretor))
const draftOrigemArr         = computed(toArr(draftOrigem))

// Opções derivadas dos pré-cadastros recebidos no modal
const _extractOptions = (list, accessor) => {
    const set = new Set()
    for (const p of (list || [])) {
        const v = accessor(p)
        if (Array.isArray(v)) v.forEach(x => x && set.add(String(x).trim()))
        else if (v) set.add(String(v).trim())
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
const opcoesEmpreendimento = computed(() => _extractOptions(props.precadastros, p => p?.empreendimento?.nome))
const opcoesEmpresa        = computed(() => _extractOptions(props.precadastros, p => p?.empresa_correspondente?.nome))
const opcoesEtapa          = computed(() => _extractOptions(props.precadastros, p => p?.situacao_nome))
const opcoesImob           = computed(() => _extractOptions(props.precadastros, p => p?.imobiliaria?.nome))
const opcoesCorretor       = computed(() => _extractOptions(props.precadastros, p => p?.corretor?.nome))
const opcoesOrigem         = computed(() => _extractOptions(props.precadastros, p => p?.lead_origens))

const hasFiltrosAplicados = computed(() =>
    aplEmpreendimento.value.size + aplEmpresa.value.size + aplEtapa.value.size +
    aplImob.value.size + aplCorretor.value.size + aplOrigem.value.size > 0
)
const activeFiltrosCount = computed(() =>
    [aplEmpreendimento, aplEmpresa, aplEtapa, aplImob, aplCorretor, aplOrigem]
        .filter(r => r.value.size > 0).length
)

// Lista filtrada pelos filtros internos do modal (antes de search/paginação)
const precadastrosFiltrados = computed(() => {
    return (props.precadastros || []).filter(p => {
        if (aplEmpreendimento.value.size && !aplEmpreendimento.value.has(p?.empreendimento?.nome?.trim())) return false
        if (aplEmpresa.value.size        && !aplEmpresa.value.has(p?.empresa_correspondente?.nome?.trim())) return false
        if (aplEtapa.value.size          && !aplEtapa.value.has(String(p?.situacao_nome || '').trim())) return false
        if (aplImob.value.size           && !aplImob.value.has(p?.imobiliaria?.nome?.trim())) return false
        if (aplCorretor.value.size       && !aplCorretor.value.has(p?.corretor?.nome?.trim())) return false
        if (aplOrigem.value.size) {
            const arr = Array.isArray(p?.lead_origens) ? p.lead_origens : []
            if (!arr.some(o => aplOrigem.value.has(String(o).trim()))) return false
        }
        return true
    })
})

function onAplicarModal() {
    aplEmpreendimento.value = new Set(draftEmpreendimento.value)
    aplEmpresa.value        = new Set(draftEmpresa.value)
    aplEtapa.value          = new Set(draftEtapa.value)
    aplImob.value           = new Set(draftImob.value)
    aplCorretor.value       = new Set(draftCorretor.value)
    aplOrigem.value         = new Set(draftOrigem.value)
    currentPage.value = 1
}
function onLimparModal() {
    draftEmpreendimento.value = new Set()
    draftEmpresa.value        = new Set()
    draftEtapa.value          = new Set()
    draftImob.value           = new Set()
    draftCorretor.value       = new Set()
    draftOrigem.value         = new Set()
    aplEmpreendimento.value = new Set()
    aplEmpresa.value        = new Set()
    aplEtapa.value          = new Set()
    aplImob.value           = new Set()
    aplCorretor.value       = new Set()
    aplOrigem.value         = new Set()
    currentPage.value = 1
}

watch(() => props.visivel, v => {
    if (!v) {
        search.value = ''; currentPage.value = 1; expanded.value = new Set()
        onLimparModal()
    }
})
watch(search,        () => { currentPage.value = 1 })
watch(itemsPerPage,  () => { currentPage.value = 1 })
watch(precadastrosFiltrados, () => { currentPage.value = 1 })

// ── Filter & paginação (search + filtros internos) ───────────────────────
const filtered = computed(() => {
    const term = search.value.trim().toLowerCase()
    const base = precadastrosFiltrados.value
    if (!term) return base
    return base.filter(p =>
        String(p.idprecadastro).includes(term) ||
        (p.nome_cliente || '').toLowerCase().includes(term) ||
        (p.documento || '').toLowerCase().includes(term) ||
        (p.empreendimento?.nome || '').toLowerCase().includes(term) ||
        (p.empresa_correspondente?.nome || '').toLowerCase().includes(term) ||
        (p.situacao_nome || '').toLowerCase().includes(term)
    )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / Number(itemsPerPage.value))))
const startItem  = computed(() => (currentPage.value - 1) * Number(itemsPerPage.value) + 1)
const endItem    = computed(() => Math.min(currentPage.value * Number(itemsPerPage.value), filtered.value.length))
const paginated  = computed(() => {
    const ipp = Number(itemsPerPage.value)
    const start = (currentPage.value - 1) * ipp
    return filtered.value.slice(start, start + ipp)
})

const visiblePages = computed(() => {
    const tp = totalPages.value
    const cp = currentPage.value
    const pages = []
    const show = 5
    let start = Math.max(1, cp - Math.floor(show / 2))
    let end = Math.min(tp, start + show - 1)
    if (end - start + 1 < show) start = Math.max(1, end - show + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
})

// ── KPIs (sobre os pré-cadastros JÁ filtrados pelos drafts aplicados) ───
const kpis = computed(() => {
    const list = precadastrosFiltrados.value || []
    let aprovSemReserva = 0, reprov = 0, reserva = 0, emAnalise = 0, somaDias = 0, qtdFin = 0
    const empresas = new Set()
    const clientes = new Set()
    let valorAprov = 0
    for (const p of list) {
        const b = bucketOf(p.situacao_nome)
        if (b.key === 'aprovado')   aprovSemReserva++
        if (b.key === 'reprovado')  reprov++
        if (b.key === 'reserva')    reserva++
        if (!p.data_fim && !p.data_cancelamento) emAnalise++
        if (p.data_fim || p.data_cancelamento) {
            const d = Number(p.dias_em_analise)
            if (Number.isFinite(d)) { somaDias += d; qtdFin++ }
        }
        if (p.empresa_correspondente?.nome) empresas.add(p.empresa_correspondente.nome)
        if (p.documento) clientes.add(p.documento)
        const va = Number(p.valor_aprovado)
        if (Number.isFinite(va)) valorAprov += va
    }
    const aprov    = aprovSemReserva + reserva
    const totalFin = aprov + reprov
    const total    = list.length
    return {
        total, emAnalise,
        aprov, aprovSemReserva, reprov, reserva, totalFin,
        pctAprov:     total ? aprov   / total : 0,
        pctConversao: total ? reserva / total : 0,
        pctReprov:    total ? reprov  / total : 0,
        tempoMedioFin: qtdFin ? somaDias / qtdFin : 0,
        bancos: empresas.size,
        clientes: clientes.size,
        valorAprov,
    }
})

// ── Charts ───────────────────────────────────────────────────────────────
const palette = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1']
const baseTooltip = {
    confine: true,
    extraCssText: 'max-width:320px; white-space:normal; font-size:12px; line-height:1.2; padding:6px 8px;'
}

function groupByKey(list) {
    const map = new Map()
    for (const p of list) {
        let key
        if (chartGroup.value === 'empresa')        key = p?.empresa_correspondente?.nome || 'Sem empresa'
        else if (chartGroup.value === 'etapa')      key = p?.situacao_nome || 'Sem etapa'
        else if (chartGroup.value === 'empreendimento') key = p?.empreendimento?.nome || 'Sem empreendimento'
        else if (chartGroup.value === 'bucket')     key = bucketOf(p?.situacao_nome).label
        const cur = map.get(key) || { name: key, value: 0 }
        cur.value++
        map.set(key, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
}

const chartData = computed(() => groupByKey(precadastrosFiltrados.value))

const chartOption = computed(() => {
    if (viewMode.value === 'pie') {
        return {
            color: palette,
            tooltip: { ...baseTooltip, trigger: 'item', formatter: p => `${p.name}<br/><b>${p.value}</b> (${p.percent}%)` },
            legend: { type: 'scroll', orient: 'vertical', left: 'left', top: 'middle', textStyle: { fontSize: 11 } },
            series: [{
                name: 'Pré-Cadastros',
                type: 'pie', radius: ['40%', '70%'], padAngle: 1,
                itemStyle: { borderRadius: 6, borderWidth: 0 },
                label: { show: false },
                emphasis: { label: { show: true, fontWeight: 'bold' } },
                data: chartData.value,
            }],
        }
    }
    if (viewMode.value === 'funnel') {
        const data = STAGE_GROUPS.filter(g => g.key !== 'outros').map(g => {
            const count = precadastrosFiltrados.value.filter(p => bucketOf(p.situacao_nome).key === g.key).length
            return { name: g.label, value: count }
        }).filter(d => d.value > 0)
        return {
            color: palette,
            tooltip: { ...baseTooltip, trigger: 'item', formatter: '{b}: <b>{c}</b>' },
            series: [{
                type: 'funnel', left: '10%', width: '80%', sort: 'descending',
                label: { color: '#888', formatter: '{b}: {c}' },
                data,
            }],
        }
    }
    // bar
    return {
        color: palette,
        tooltip: { ...baseTooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: 32, right: 32, top: 30, bottom: 80, containLabel: true },
        dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 20 }],
        xAxis: {
            type: 'category',
            data: chartData.value.map(r => r.name),
            axisLabel: { interval: 0, rotate: 25, fontSize: 10, formatter: v => v.length > 18 ? v.slice(0, 18) + '…' : v },
        },
        yAxis: { type: 'value' },
        series: [{
            name: 'Quantidade', type: 'bar', barWidth: '60%',
            data: chartData.value.map(r => r.value),
            itemStyle: { borderRadius: [6, 6, 0, 0] },
            label: { show: true, position: 'top', fontSize: 10 },
        }],
    }
})

function onChartClick(params) {
    if (params && params.name) search.value = params.name
}

// ── Helpers ──────────────────────────────────────────────────────────────
function toggleExpand(p) {
    const next = new Set(expanded.value)
    if (next.has(p.idprecadastro)) next.delete(p.idprecadastro)
    else next.add(p.idprecadastro)
    expanded.value = next
}

function abrirDetalhe(p) { detailItem.value = p; detailVisible.value = true }

const fmtMoney = (v) => {
    const n = Number(v)
    if (!Number.isFinite(n)) return '—'
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
const fmtDate = (d) => {
    if (!d) return '—'
    const dt = new Date(d)
    return isNaN(dt) ? '—' : dt.toLocaleDateString('pt-BR')
}
const fmtDateTime = (d) => {
    if (!d) return '—'
    const dt = new Date(d)
    return isNaN(dt) ? '—' : dt.toLocaleString('pt-BR')
}
const pctStr = (v) => `${(v * 100).toFixed(1)}%`
</script>
