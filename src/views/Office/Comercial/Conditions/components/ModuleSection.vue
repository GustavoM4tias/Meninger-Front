<template>
  <div class="space-y-4">

    <!-- ── Modal: Copiar de outro empreendimento/mês ─────────────────────── -->
    <transition name="fade">
      <div
        v-if="showCopyModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="showCopyModal = false"
      >
        <div class="bg-white z-50 dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-line">
          <div class="flex items-center justify-between px-6 py-4 border-b border-line">
            <div class="flex items-center gap-2">
              <i class="fas fa-copy text-blue-500"></i>
              <h2 class="text-base font-bold text-ink">Copiar Dados de Módulo</h2>
            </div>
            <button @click="showCopyModal = false" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-surface-hover transition">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>

          <div class="px-6 py-5 space-y-4">
            <!-- Empreendimento de origem -->
            <div>
              <label class="lbl">Empreendimento de Origem</label>
              <select v-model="copyFrom.idempreendimento" @change="onCopyEnterpriseChange" class="inp">
                <option value="">Selecionar empreendimento...</option>
                <option v-for="e in enterpriseOptions" :key="e.idempreendimento" :value="e.idempreendimento">
                  {{ e.nome }}
                </option>
              </select>
            </div>

            <!-- Ficha / Mês -->
            <div v-if="copyFrom.idempreendimento && copySourceConditions.length">
              <label class="lbl">Mês de Referência</label>
              <select v-model="copyFrom.conditionId" @change="onCopyConditionChange" class="inp">
                <option value="">Selecionar mês...</option>
                <option v-for="c in copySourceConditions" :key="c.id" :value="c.id" :disabled="String(c.id) === String(currentConditionId)">
                  {{ formatMonth(c.reference_month) }}
                  <template v-if="String(c.id) === String(currentConditionId)"> — (este mês)</template>
                  <template v-else> — {{ STATUS_LABELS[c.status] ?? c.status }}</template>
                </option>
              </select>
            </div>

            <!-- Módulo de origem -->
            <div v-if="copyFrom.conditionId && copySourceModules.length">
              <label class="lbl">Módulo de Origem</label>
              <select v-model="copyFrom.moduleId" class="inp">
                <option value="">Selecionar módulo...</option>
                <option v-for="m in copySourceModules" :key="m.id" :value="m.id">
                  {{ m.module_name }}
                </option>
              </select>
            </div>

            <!-- Seções a copiar -->
            <div v-if="copyFrom.moduleId">
              <div class="flex items-center justify-between mb-1.5">
                <label class="lbl mb-0">O que copiar</label>
                <div class="flex items-center gap-2">
                  <button type="button" @click="copyFrom.fields = copyFieldOptions.map(o => o.value)" class="text-xs text-accent hover:underline">Todos</button>
                  <span class="text-ink-subtle">·</span>
                  <button type="button" @click="copyFrom.fields = []" class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:underline">Nenhum</button>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  v-for="opt in copyFieldOptions"
                  :key="opt.value"
                  :class="[
                    'flex items-start gap-2.5 cursor-pointer select-none p-3 rounded-lg border transition',
                    copyFrom.fields.includes(opt.value)
                      ? 'border-accent bg-accent-soft'
                      : 'border-line bg-surface-raised/40 hover:border-gray-300'
                  ]"
                >
                  <input type="checkbox" :value="opt.value" v-model="copyFrom.fields" class="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <div class="min-w-0 flex-1">
                    <p :class="['text-sm font-semibold', copyFrom.fields.includes(opt.value) ? 'text-accent' : 'text-ink']">{{ opt.label }}</p>
                    <p class="text-[10px] text-ink-subtle mt-0.5 leading-tight">{{ opt.hint }}</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 px-6 pb-5">
            <button @click="showCopyModal = false" class="px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-gray-800 dark:hover:text-white transition">
              Cancelar
            </button>
            <button
              @click="handleCopyFromEnterprise"
              :disabled="!copyFrom.moduleId || !copyFrom.fields.length || copying"
              class="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-accent-hover disabled:opacity-50 transition"
            >
              <i class="fas fa-arrows-rotate text-xs"></i>
              {{ copying ? 'Copiando...' : 'Copiar' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ── HEADER principal (mês/cópia/pills) — escondido quando o Detail tem a lateral ── -->
    <div v-if="!hideChrome" class="bg-surface-raised rounded-2xl border border-line shadow-sm">

      <!-- Linha 1: Navegação de mês + status + ações -->
      <div class="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-gray-800/60 dark:to-blue-950/20 border-b border-line">

        <!-- Navegador de mês (escondido quando o Detail tem o stepper na lateral) -->
        <div v-if="!hideChrome" class="flex items-center gap-2">
          <button
            @click="navigatePrev"
            :disabled="!prevItem"
            :class="[
              'w-7 h-7 flex items-center justify-center rounded-lg transition text-xs',
              prevItem
                ? 'text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 shadow-sm border border-line'
                : 'text-ink-subtle cursor-not-allowed'
            ]"
            title="Mês anterior"
          >
            <i class="fas fa-chevron-left"></i>
          </button>

          <div class="flex items-center gap-2">
            <span class="text-xs text-ink-subtle font-medium">Ref:</span>
            <span class="text-sm font-bold text-gray-800 dark:text-white tracking-wide">{{ currentMonthLabel }}</span>
            <span
              :class="statusChipClass(conditionStatus)"
              class="px-2 py-0.5 rounded-full text-xs font-semibold"
            >
              {{ STATUS_LABELS[conditionStatus] ?? conditionStatus }}
            </span>
          </div>

          <button
            @click="navigateNext"
            :disabled="!nextItem"
            :class="[
              'w-7 h-7 flex items-center justify-center rounded-lg transition text-xs',
              nextItem
                ? 'text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 shadow-sm border border-line'
                : 'text-ink-subtle cursor-not-allowed'
            ]"
            title="Próximo mês"
          >
            <i class="fas fa-chevron-right"></i>
          </button>

          <!-- Indicador de histórico total -->
          <span v-if="history.length > 1" class="text-xs text-ink-subtle ml-1">
            {{ currentHistoryPos }}/{{ history.length }}
          </span>
        </div>

        <!-- Ações -->
        <div class="flex items-center gap-2">
          <!-- Copiar de outro módulo desta ficha -->
          <template v-if="!readonly && modules.length > 1">
            <div class="flex items-center gap-1.5">
              <select
                v-model="copySourceId"
                class="text-xs text-ink bg-surface-raised border border-line rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[160px]"
              >
                <option value="">Copiar de módulo...</option>
                <option v-for="m in otherModules" :key="m.id ?? m.module_name" :value="m.id">
                  {{ m.module_name || `Módulo ${modules.indexOf(m) + 1}` }}
                </option>
              </select>
              <button
                @click="handleCopyIntra"
                :disabled="!copySourceId || copying"
                class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-700 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-800 disabled:opacity-40 transition"
              >
                <i class="fas fa-arrows-rotate text-xs"></i>
                Copiar
              </button>
            </div>
            <div class="w-px h-5 bg-surface-sunken mx-1"></div>
          </template>

          <!-- Copiar de outro empreendimento / outro mês -->
          <button
            v-if="!readonly && enterpriseOptions?.length"
            @click="openCopyModal"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <i class="fas fa-copy text-xs"></i>
            Outro Mês / Empreendimento
          </button>
        </div>
      </div>

      <!-- Linha 2: Módulos como pills + botão de adicionar (na lateral quando hideChrome) -->
      <div v-if="!hideChrome" class="relative">
        <div class="flex items-stretch overflow-x-auto scrollbar-hide border-b border-line">
          <button
            v-for="(mod, i) in modules"
            :key="mod.id ?? i"
            @click="activeIdx = i"
            :class="[
              'group flex flex-col items-center justify-center px-4 py-2.5 text-center transition border-r border-line flex-shrink-0 relative',
              activeIdx === i
                ? 'bg-blue-600 text-white'
                : 'bg-surface-raised text-ink-muted hover:bg-accent-soft hover:text-blue-600 dark:hover:text-blue-400'
            ]"
            style="min-width: 110px"
          >
            <div class="flex items-center gap-1.5">
              <i v-if="!mod.idetapa" class="fas fa-cube text-xs opacity-50" title="Módulo avulso (sem etapa CV)"></i>
              <span class="text-xs font-semibold truncate max-w-[90px]">
                {{ mod.module_name || (mod.idetapa ? '—' : 'Novo módulo') }}
              </span>
            </div>
            <div class="flex items-center gap-0.5 mt-1" :title="completenessTooltip(mod)">
              <span
                v-for="(filled, key) in moduleCompleteness(mod)" :key="key"
                :class="[
                  'w-1.5 h-1.5 rounded-full transition',
                  activeIdx === i
                    ? (filled ? 'bg-white' : 'bg-white/25')
                    : (filled ? 'bg-blue-500 dark:bg-blue-400' : 'bg-surface-sunken')
                ]"
              ></span>
            </div>
            <span v-if="activeIdx === i" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-t"></span>
            <button
              v-if="!readonly && mod.id"
              @click.stop="handleDeleteModule(mod)"
              class="absolute top-1 right-1 w-3.5 h-3.5 flex items-center justify-center rounded text-xs opacity-0 group-hover:opacity-100 transition"
              :class="activeIdx === i ? 'text-white/60 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'"
              title="Remover módulo"
            >
              <i class="fas fa-times text-[10px]"></i>
            </button>
          </button>

          <!-- Botão adicionar módulo -->
          <button
            v-if="!readonly"
            @click="showAddPanel = !showAddPanel"
            :class="[
              'flex items-center gap-1 px-3 py-2 border-r border-line flex-shrink-0 text-xs font-medium transition',
              showAddPanel
                ? 'bg-accent-soft text-accent'
                : 'bg-surface-raised text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/10'
            ]"
            title="Adicionar módulo"
          >
            <i class="fas fa-plus text-[10px]"></i>
          </button>

          <div class="flex-1 bg-surface-raised"></div>
        </div>

        <!-- Painel de adição (dropdown inline) -->
        <transition name="slide-down">
          <div
            v-if="showAddPanel && !readonly"
            class="absolute left-0 top-full z-30 min-w-[240px] bg-surface-raised border border-line rounded-b-xl shadow-xl"
          >
            <!-- Etapas do CV disponíveis -->
            <div v-if="availableStages.length" class="p-2">
              <p class="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider px-2 mb-1">Etapas do CV</p>
              <button
                v-for="stage in availableStages"
                :key="stage.idetapa"
                @click="addStageModule(stage)"
                class="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-accent-soft hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition text-left"
              >
                <i class="fas fa-layer-group text-blue-400 text-[10px] flex-shrink-0"></i>
                {{ stage.nome }}
              </button>
            </div>
            <div v-else-if="enterpriseStages.length" class="px-4 py-3">
              <p class="text-xs text-ink-subtle italic">Todas as etapas do CV já estão adicionadas</p>
            </div>
            <div v-else class="px-4 py-3">
              <p class="text-xs text-ink-subtle italic">Nenhuma etapa no CV para este empreendimento</p>
            </div>

            <div class="border-t border-line p-2">
              <button
                @click="addCustomModule"
                class="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink-muted hover:bg-surface-hover rounded-lg transition text-left"
              >
                <i class="fas fa-cube text-gray-400 text-[10px] flex-shrink-0"></i>
                Módulo avulso (sem etapa CV)
              </button>
            </div>
          </div>
        </transition>
      </div>

      <!-- Navegação por seções (âncora) — na lateral quando hideChrome -->
      <div v-if="!hideChrome" class="flex gap-1.5 overflow-x-auto scrollbar-hide bg-surface-sunken/60 rounded-xl p-1.5 mb-3">
        <button
          v-for="st in subTabs"
          :key="st.id"
          @click="scrollToSection(st.id)"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-lg border transition',
            activeSubTab === st.id
              ? 'bg-accent-soft border-accent/30 text-accent'
              : 'border-transparent text-ink-muted hover:text-gray-700 dark:hover:text-gray-200'
          ]"
        >
          <i :class="st.icon" class="text-xs"></i>
          {{ st.label }}
        </button>
      </div>
    </div>

    <!-- ── Conteúdo do módulo ────────────────────────────────────────────── -->
    <div v-if="activeModule" class="bg-surface-raised rounded-2xl border border-line shadow-sm overflow-hidden">

      <!-- Copiar dados (botão claro; o modal deixa escolher a origem e quais seções copiar) -->
      <div v-if="hideChrome && !readonly && enterpriseOptions?.length" class="px-5 pt-4">
        <button @click="openCopyModal" class="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-accent bg-accent-soft border border-accent/20 rounded-lg hover:bg-accent-soft/70 transition">
          <i class="fas fa-copy text-xs"></i>
          Copiar dados de outro módulo ou mês
        </button>
      </div>

      <!-- ── Seção: Produto ──────────────────────────────────────────────── -->
      <div id="modsec-data" class="p-5 space-y-5 scroll-mt-40 md:scroll-mt-4">
        <h3 class="flex items-center gap-2 text-sm font-bold text-ink mb-1"><i class="fas fa-box text-blue-500"></i> Produto</h3>
        <!-- Números do Módulo -->
        <div>
          <p class="lbl-section mb-3"><i class="fas fa-hashtag text-blue-500"></i> Números do Módulo</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="sm:col-span-2 lg:col-span-1">
              <label class="lbl">Nome do Módulo</label>
              <input
                :value="activeModule.module_name"
                @input="patch('module_name', $event.target.value)"
                type="text"
                class="inp"
                placeholder="Ex: Fase 1 — Torre A"
                :disabled="readonly"
              />
              <!-- Vincular a etapa do CV (apenas para módulos avulsos) -->
              <div v-if="!activeModule.idetapa && availableStagesForLink.length && !readonly" class="mt-2">
                <label class="lbl">Vincular à Etapa do CV</label>
                <select
                  :value="activeModule.idetapa ?? ''"
                  @change="onStageLinkChange"
                  class="inp text-xs"
                  :disabled="readonly"
                >
                  <option value="">Módulo avulso (sem etapa)</option>
                  <option v-for="s in availableStagesForLink" :key="s.idetapa" :value="s.idetapa">
                    {{ s.nome }}
                  </option>
                </select>
              </div>
              <div v-else-if="activeModule.idetapa" class="mt-1.5 flex items-center gap-1 text-[11px] text-ink-subtle">
                <i class="fas fa-layer-group text-blue-400"></i>
                Etapa do CV: <span class="font-medium text-ink-muted">{{ enterpriseStages.find(s => s.idetapa === activeModule.idetapa)?.nome ?? `#${activeModule.idetapa}` }}</span>
              </div>
            </div>
            <div>
              <label class="lbl">Total de Unidades</label>
              <input
                :value="activeModule.total_units"
                @input="patchWithMinDemand($event)"
                type="number"
                min="0"
                class="inp"
                placeholder="Ex: 200"
                :disabled="readonly"
              />
            </div>
            <div>
              <label class="lbl">
                Demanda Mínima
                <span class="text-ink-subtle font-normal normal-case tracking-normal ml-1">(≥ 20%)</span>
              </label>
              <input
                :value="activeModule.min_demand"
                @input="patch('min_demand', numOrNull($event.target.value))"
                type="number"
                min="0"
                class="inp"
                placeholder="Auto"
                :disabled="readonly"
              />
            </div>
            <div class="sm:col-span-2 lg:col-span-3">
              <label class="lbl">Obs. Demanda Mínima</label>
              <input
                :value="activeModule.min_demand_note"
                @input="patch('min_demand_note', $event.target.value)"
                type="text"
                class="inp"
                placeholder="Ex: Assinar em demanda fracionada"
                :disabled="readonly"
              />
            </div>
          </div>
        </div>

        <!-- Avaliação MCMV -->
        <div>
          <p class="lbl-section mb-3"><i class="fas fa-house-chimney text-blue-500"></i> Avaliação MCMV</p>
          <div class="space-y-2">
            <!-- Faixas -->
            <div
              v-for="fc in FAIXAS_CONFIG"
              :key="fc.faixa"
              :class="['rounded-xl border overflow-hidden transition-all', faixaEnabled(fc.faixa) ? fc.borderActive : 'border-line']"
            >
              <!-- Toggle header -->
              <div
                :class="['flex items-center gap-3 px-4 py-3 transition select-none', readonly ? 'cursor-default' : 'cursor-pointer',
                  faixaEnabled(fc.faixa) ? fc.bgActive : 'bg-surface-raised/40 hover:bg-surface-hover/40']"
                @click="!readonly && toggleFaixa(fc.faixa)"
              >
                <span
                  :class="['flex-shrink-0 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all',
                    faixaEnabled(fc.faixa) ? fc.checkActive : 'border-line bg-surface-raised']"
                >
                  <svg v-if="faixaEnabled(fc.faixa)" class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M1 4l2.5 2.5L9 1" />
                  </svg>
                </span>
                <div class="flex-1 min-w-0">
                  <span :class="['text-sm font-semibold', faixaEnabled(fc.faixa) ? fc.textActive : 'text-ink']">{{ fc.label }}</span>
                  <!-- <span class="ml-2 text-xs text-ink-subtle">{{ fc.desc }}</span> -->
                </div>
                <i v-if="faixaEnabled(fc.faixa)" class="fas fa-chevron-down text-xs text-ink-subtle"></i>
              </div>

              <!-- Expanded fields -->
              <div v-if="faixaEnabled(fc.faixa)" class="border-t border-line p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/40 dark:bg-gray-800/10">
                <div>
                  <label class="lbl">Valor de Avaliação</label>
                  <div class="relative">
                    <span class="pfx">R$</span>
                    <input type="text"
                      :value="fmtBR(getFaixa(fc.faixa).appraisal_value)"
                      @focus="e => { e.target.value = getFaixa(fc.faixa).appraisal_value ?? ''; e.target.select(); }"
                      @blur="e => patchFaixa(fc.faixa, 'appraisal_value', parseBR(e.target.value))"
                      class="inp-pfx" :placeholder="fc.placeholders.appraisal_value" :disabled="readonly" />
                  </div>
                </div>
                <div>
                  <label class="lbl">Teto da Cidade</label>
                  <div class="relative">
                    <span class="pfx">R$</span>
                    <input type="text"
                      :value="fmtBR(getFaixa(fc.faixa).appraisal_ceiling)"
                      @focus="e => { e.target.value = getFaixa(fc.faixa).appraisal_ceiling ?? ''; e.target.select(); }"
                      @blur="e => patchFaixa(fc.faixa, 'appraisal_ceiling', parseBR(e.target.value))"
                      class="inp-pfx" :placeholder="fc.placeholders.appraisal_ceiling" :disabled="readonly" />
                  </div>
                </div>
                <div>
                  <label class="lbl">Ticket Médio</label>
                  <div class="relative">
                    <span class="pfx">R$</span>
                    <input type="text"
                      :value="fmtBR(getFaixa(fc.faixa).avg_ticket)"
                      @focus="e => { e.target.value = getFaixa(fc.faixa).avg_ticket ?? ''; e.target.select(); }"
                      @blur="e => patchFaixa(fc.faixa, 'avg_ticket', parseBR(e.target.value))"
                      class="inp-pfx" :placeholder="fc.placeholders.avg_ticket" :disabled="readonly" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Nota e laudo (compartilhados) -->
            <div class="pt-1">
              <label class="lbl">Observação da Avaliação</label>
              <textarea
                :value="activeModule.appraisal_note"
                @input="patch('appraisal_note', $event.target.value)"
                rows="2" class="inp resize-none"
                placeholder="Observações adicionais sobre a avaliação..."
                :disabled="readonly"
              />
            </div>
            <div>
              <label class="lbl">Arquivo / Laudo Oficial</label>
              <div class="flex items-start gap-3">
                <div class="flex-1">
                  <AttachmentPicker
                    :model-value="activeModule.appraisal_file_url"
                    @update:model-value="patch('appraisal_file_url', $event)"
                    :reference-id="activeModule.id"
                    upload-context="appraisal_laudo"
                    hint="Vincule um arquivo do seu computador, SharePoint ou cole um link direto. Um QR Code será gerado automaticamente para o resumo."
                  />
                </div>
                <AppraisalQrCode v-if="activeModule.appraisal_file_url" :url="activeModule.appraisal_file_url" :size="120" caption="Avaliação" />
              </div>
            </div>
          </div>
        </div>

        <!-- ── Condições Comerciais ───────────────────────────────────────── -->
        <div>
          <p class="lbl-section mb-3"><i class="fas fa-percent text-blue-500"></i> Condições Comerciais</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="lbl">Comissão (%)</label>
              <div class="relative">
                <input type="text"
                  :value="activeModule.commission_pct != null ? String(Number(activeModule.commission_pct).toFixed(2)).replace('.', ',') : ''"
                  @focus="e => { e.target.value = activeModule.commission_pct ?? ''; e.target.select(); }"
                  @blur="e => { const raw = String(e.target.value).replace(',', '.'); const n = parseFloat(raw); patchMulti({ commission_pct: isNaN(n) ? null : Math.round(n * 100) / 100, commission_source: 'manual' }); }"
                  class="inp pr-9" placeholder="0,00" :disabled="readonly" />
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle text-xs pointer-events-none">%</span>
              </div>
              <p class="mt-1 text-xs text-ink-subtle">
                Fonte: {{ activeModule.commission_source === 'cv' ? 'tabela do CV' : 'manual' }}
              </p>
            </div>
            <div>
              <label class="lbl">Prazo de Entrega (meses)</label>
              <input
                :value="activeModule.delivery_deadline_months"
                @input="patch('delivery_deadline_months', numOrNull($event.target.value))"
                type="number" min="1" max="120" class="inp" placeholder="Ex: 24"
                :disabled="readonly"
              />
            </div>
            <div>
              <label class="lbl">Observação do Prazo</label>
              <input
                :value="activeModule.delivery_deadline_note"
                @input="patch('delivery_deadline_note', $event.target.value)"
                type="text" class="inp" placeholder="Ex: a partir da assinatura do contrato CEF"
                :disabled="readonly"
              />
            </div>
          </div>
          <!-- Observação da Comissão (linha cheia) -->
          <div class="mt-4">
            <label class="lbl">Observações da Comissão</label>
            <textarea
              :value="activeModule.commission_note"
              @input="patch('commission_note', $event.target.value)"
              rows="2" class="inp resize-none"
              placeholder="Ex: Comissão extra para venda em caixa de 60 dias, base de cálculo sobre VGV líquido..."
              :disabled="readonly"
            />
          </div>
          <div v-if="activeModule.unit_snapshot?.data?.length && snapshotM2Stats" class="mt-4 p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-accent/20 rounded-xl">
            <p class="text-xs font-semibold text-accent mb-2 flex items-center gap-1.5">
              <i class="fas fa-snowflake text-[9px]"></i>
              Preço/m² congelado em {{ formatSnapshotDate(activeModule.unit_snapshot.capturedAt) }}
            </p>
            <div class="flex flex-wrap gap-4 text-xs text-ink-muted">
              <span>Mín: <strong class="text-ink">{{ formatM2(snapshotM2Stats.min) }}</strong></span>
              <span>Máx: <strong class="text-ink">{{ formatM2(snapshotM2Stats.max) }}</strong></span>
              <span>Média: <strong class="text-ink">{{ formatM2(snapshotM2Stats.avg) }}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Seção: Preços ───────────────────────────────────────────────── -->
      <div id="modsec-prices" class="p-5 space-y-5 scroll-mt-40 md:scroll-mt-4 border-t border-line">
        <h3 class="flex items-center gap-2 text-sm font-bold text-ink mb-1"><i class="fas fa-tag text-blue-500"></i> Preços</h3>
        <!-- Tabelas do CV -->
        <div>
          <p class="lbl-section mb-3"><i class="fas fa-table text-blue-500"></i> Tabelas do CV</p>
          <p class="text-xs text-ink-subtle mb-3">Selecione as tabelas que valem para este módulo.</p>
          <!-- Aviso de tabelas selecionadas mas inativas no CV -->
          <div v-if="orphanedPriceTableIds.length" class="flex items-start gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md mb-3">
            <i class="fas fa-exclamation-triangle text-amber-500 text-sm flex-shrink-0 mt-0.5"></i>
            <div class="text-xs text-amber-800 dark:text-amber-300">
              <p class="font-semibold mb-0.5">Tabela(s) selecionada(s) não encontradas no CV</p>
              <p class="opacity-80">
                As seguintes tabelas estão marcadas neste módulo mas foram desativadas ou removidas no CV:
                <strong>{{ orphanedPriceTableIds.join(', ') }}</strong>.
              </p>
              <button
                v-if="!readonly"
                @click="removeOrphanedTables"
                class="mt-1.5 underline underline-offset-2 hover:no-underline font-medium"
              >
                Remover referências inativas
              </button>
            </div>
          </div>

          <div v-if="priceTables.length" class="space-y-2">
            <div
              v-for="t in priceTables"
              :key="t.idtabela"
              :class="[
                'rounded-xl border overflow-hidden transition-all',
                (activeModule.price_table_ids ?? []).includes(t.idtabela)
                  ? 'border-blue-400 dark:border-blue-600 shadow-sm'
                  : 'border-line'
              ]"
            >
              <!-- Card header -->
              <div
                :class="[
                  'flex items-center gap-3 px-4 py-3 transition-all select-none',
                  readonly ? 'cursor-default' : 'cursor-pointer',
                  (activeModule.price_table_ids ?? []).includes(t.idtabela)
                    ? 'bg-accent-soft'
                    : 'bg-surface-raised/40 hover:bg-surface-hover/40'
                ]"
                @click="!readonly && togglePriceTable(t.idtabela)"
              >
                <!-- Checkbox -->
                <span
                  class="flex-shrink-0 rounded border-2 flex items-center justify-center transition-all"
                  :class="(activeModule.price_table_ids ?? []).includes(t.idtabela)
                    ? 'border-accent bg-blue-500'
                    : 'border-line bg-surface-raised'"
                  style="width:18px;height:18px;"
                >
                  <svg v-if="(activeModule.price_table_ids ?? []).includes(t.idtabela)" class="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M1 4l2.5 2.5L9 1" />
                  </svg>
                </span>

                <!-- Name + stats -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-semibold" :class="(activeModule.price_table_ids ?? []).includes(t.idtabela) ? 'text-accent' : 'text-ink'">
                      {{ t.nome }}
                    </span>
                    <span v-if="t.vigente" class="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">vigente</span>
                  </div>
                  <div class="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span class="text-xs text-ink-subtle">{{ formatDate(t.data_vigencia_de) }} – {{ formatDate(t.data_vigencia_ate) }}</span>
                    <template v-if="t.unit_count > 0">
                      <span class="text-xs text-ink-muted">
                        <strong class="text-ink">{{ t.unit_count }}</strong> unidades
                      </span>
                      <span v-if="t.price_min != null" class="text-xs text-ink-muted">
                        De <strong class="text-ink">{{ fmtCurrencyShort(t.price_min) }}</strong>
                        até <strong class="text-ink">{{ fmtCurrencyShort(t.price_max) }}</strong>
                      </span>
                      <span v-if="t.price_avg != null" class="text-xs text-ink-muted">
                        · Média <strong class="text-ink">{{ fmtCurrencyShort(t.price_avg) }}</strong>
                      </span>
                    </template>
                    <span v-else class="text-xs text-ink-subtle italic">Sem dados de unidades</span>
                  </div>
                </div>

                <!-- Expand toggle -->
                <button
                  v-if="t.unit_count > 0"
                  @click.stop="togglePriceTableExpand(t.idtabela)"
                  class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-500 hover:bg-accent-soft transition"
                  :title="expandedPriceTables.has(t.idtabela) ? 'Fechar unidades' : 'Ver unidades'"
                >
                  <i :class="expandedPriceTables.has(t.idtabela) ? 'fas fa-chevron-up' : 'fas fa-chevron-down'" class="text-xs"></i>
                </button>
              </div>

              <!-- Expanded unit list -->
              <div v-if="expandedPriceTables.has(t.idtabela) && t.unidades?.length" class="border-t border-line bg-gray-50/50 dark:bg-gray-800/20 p-4 space-y-3">
                <div v-for="group in groupByBloco(t.unidades)" :key="group.bloco">
                  <p class="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider mb-1.5">Bloco {{ group.bloco }}</p>
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
                    <div
                      v-for="u in group.units"
                      :key="u.idunidade ?? u.numerounidade"
                      :title="`${u.numerounidade}${u.situacao ? ' · ' + u.situacao : ''}${u.valor_total ? ' · ' + fmtCurrency(u.valor_total) : ''}`"
                      class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-line bg-surface-raised/40 text-xs"
                    >
                      <span :class="['w-2 h-2 rounded-full flex-shrink-0', unitSituacaoDot(u.situacao)]"></span>
                      <div class="min-w-0">
                        <span class="font-mono font-medium text-ink truncate block leading-tight">{{ u.numerounidade }}</span>
                        <span v-if="u.valor_total" class="text-[10px] text-accent font-semibold leading-tight">{{ fmtCurrencyShort(u.valor_total) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="flex flex-col items-center justify-center py-8 text-ink-subtle text-center">
            <i class="fas fa-exclamation-circle text-xl mb-2"></i>
            <p class="text-sm">Nenhuma tabela disponível</p>
          </div>
        </div>

        <!-- Tabelas Manuais -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <p class="lbl-section"><i class="fas fa-file-invoice-dollar text-orange-400"></i> Tabelas Manuais</p>
            <button v-if="!readonly" @click="addManualTable" class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-500 text-white rounded-md hover:bg-orange-600 transition">
              <i class="fas fa-plus text-xs"></i> Adicionar
            </button>
          </div>
          <div class="space-y-4">
            <div
              v-for="(mt, mi) in (activeModule.manual_price_tables ?? [])"
              :key="mi"
              class="border border-line rounded-xl bg-gray-50/40 dark:bg-gray-800/20 overflow-hidden"
            >
              <!-- Cabeçalho da tabela manual -->
              <div class="flex items-center justify-between gap-3 px-4 py-3 bg-surface-raised/50 border-b border-line">
                <input :value="mt.name" @input="patchManualTable(mi, 'name', $event.target.value)"
                  type="text" class="inp-inline flex-1 font-semibold" :disabled="readonly"
                  placeholder="Nome da tabela..." />
                <div class="flex items-center gap-2 flex-shrink-0">
                  <input :value="mt.validity_from" @input="patchManualTable(mi, 'validity_from', $event.target.value)"
                    type="date" class="inp-sm" :disabled="readonly" title="Vigência de" />
                  <span class="text-ink-subtle text-xs">→</span>
                  <input :value="mt.validity_to" @input="patchManualTable(mi, 'validity_to', $event.target.value)"
                    type="date" class="inp-sm" :disabled="readonly" title="Vigência até" />
                  <button v-if="!readonly" @click="removeManualTable(mi)"
                    class="w-6 h-6 flex items-center justify-center rounded text-ink-subtle hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0">
                    <i class="fas fa-trash text-xs"></i>
                  </button>
                </div>
              </div>

              <div class="p-4 space-y-4">
                <!-- Observação -->
                <input :value="mt.note" @input="patchManualTable(mi, 'note', $event.target.value)"
                  type="text" class="inp text-xs" :disabled="readonly" placeholder="Observação da tabela..." />

                <!-- Quick fill de unidades -->
                <div class="flex items-center gap-2 flex-wrap p-3 bg-blue-50/60 dark:bg-blue-950/10 border border-accent/20/30 rounded-lg">
                  <i class="fas fa-bolt text-blue-400 text-xs flex-shrink-0"></i>
                  <span class="text-xs text-ink-muted font-medium flex-shrink-0">Preenchimento rápido:</span>

                  <!-- Gerar unidades (a partir do total_units do módulo) -->
                  <button v-if="!readonly" @click="generateUnits(mi)"
                    :disabled="!activeModule.total_units"
                    class="flex items-center gap-1 p-3 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-accent-hover disabled:opacity-40 transition flex-shrink-0">
                    <i class="fas fa-list text-[10px]"></i>
                    Gerar {{ activeModule.total_units ?? 0 }} unidades
                  </button>

                  <!-- Ticket médio -->
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <span class="text-xs text-ink-muted">Ticket médio:</span>
                    <div class="relative">
                      <span class="pfx">R$</span>
                      <input type="text" :value="fmtBR(mt.avg_ticket)"
                        @focus="e => { e.target.value = mt.avg_ticket ?? ''; e.target.select(); }"
                        @blur="e => patchManualTable(mi, 'avg_ticket', parseBR(e.target.value))"
                        class="inp-pfx" :disabled="readonly" placeholder="0,00" />
                    </div>

                    <button v-if="!readonly" @click="applyAvgTicket(mi)"
                      :disabled="!mt.avg_ticket || !(mt.units?.length)"
                      class="flex items-center gap-1 p-3 text-xs font-semibold bg-gray-700 dark:bg-gray-600 text-white rounded-md hover:bg-gray-800 disabled:opacity-40 transition">
                      Aplicar
                    </button>
                  </div>

                  <!-- Estatísticas das unidades preenchidas -->
                  <template v-if="mt.units?.length">
                    <span class="text-xs text-ink-subtle ml-1">
                      {{ mt.units.filter(u => u.value != null).length }}/{{ mt.units.length }} preenchidas
                      <template v-if="unitAvg(mt.units) != null">
                        · Mín <strong class="text-ink-muted">{{ fmtCurrency(unitMin(mt.units)) }}</strong>
                        · Máx <strong class="text-ink-muted">{{ fmtCurrency(unitMax(mt.units)) }}</strong>
                        · Média <strong class="text-ink-muted">{{ fmtCurrency(unitAvg(mt.units)) }}</strong>
                      </template>
                    </span>
                  </template>
                </div>

                <!-- Lista de unidades -->
                <div v-if="mt.units?.length">
                  <div class="max-h-56 overflow-y-auto rounded-lg border border-line">
                    <div class="grid grid-cols-[auto_1fr_auto] items-center text-[10px] font-semibold text-ink-subtle uppercase tracking-wider px-3 py-1.5 bg-surface-sunken/50 border-b border-line">
                      <span class="w-10">Unid.</span>
                      <span>Valor</span>
                      <span></span>
                    </div>
                    <div
                      v-for="(u, ui) in mt.units"
                      :key="ui"
                      class="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 py-1.5 border-b border-gray-50 dark:border-gray-800/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                    >
                      <span class="w-10 text-xs font-mono text-ink-muted flex-shrink-0">{{ u.label }}</span>
                      <div class="relative">
                        <span class="pfx">R$</span>
                        <input type="text" :value="fmtBR(u.value)"
                          @focus="e => { e.target.value = u.value ?? ''; e.target.select(); }"
                          @blur="e => patchUnit(mi, ui, parseBR(e.target.value))"
                          class="inp-pfx pl-8 w-full" :disabled="readonly" placeholder="—" />
                      </div>
                      <button v-if="!readonly" @click="removeUnit(mi, ui)"
                        class="w-5 h-5 flex items-center justify-center rounded text-ink-subtle hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0">
                        <i class="fas fa-times text-[9px]"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div v-else-if="!activeModule.total_units" class="text-xs text-ink-subtle italic">
                  Defina o total de unidades no módulo (aba Dados) para gerar automaticamente.
                </div>
              </div>
            </div>

            <div v-if="!(activeModule.manual_price_tables ?? []).length" class="flex flex-col items-center justify-center py-6 text-ink-subtle text-center">
              <i class="fas fa-file-invoice-dollar text-xl mb-2"></i>
              <p class="text-sm">Nenhuma tabela manual cadastrada</p>
            </div>
          </div>
        </div>

        <!-- Premissa de preço -->
        <div>
          <label class="lbl">Premissa de Preço / Observação</label>
          <textarea
            :value="activeModule.price_premise_note"
            @input="patch('price_premise_note', $event.target.value)"
            rows="2"
            :disabled="readonly"
            class="inp resize-none"
            placeholder="Ex: preços baseados na tabela de março/2026..."
          />
        </div>
      </div>

      <!-- ── Seção: Negociação ───────────────────────────────────────────── -->
      <div id="modsec-negotiation" class="p-5 scroll-mt-40 md:scroll-mt-4 border-t border-line">
        <h3 class="flex items-center gap-2 text-sm font-bold text-ink mb-3"><i class="fas fa-handshake text-blue-500"></i> Negociação</h3>
        <NegotiationRules
          :form="activeModule"
          :readonly="readonly"
          @update="patchMulti"
        />
      </div>

      <!-- ── Seção: Documentação ────────────────────────────────────────── -->
      <div id="modsec-docs" class="p-5 scroll-mt-40 md:scroll-mt-4 border-t border-line">
        <h3 class="flex items-center gap-2 text-sm font-bold text-ink mb-3"><i class="fas fa-file-contract text-blue-500"></i> Documentação</h3>
        <DocsSection
          :form="activeModule"
          :readonly="readonly"
          @update="patchMulti"
        />
      </div>

      <!-- ── Seção: Campanhas ───────────────────────────────────────────── -->
      <div id="modsec-campaigns" class="p-5 scroll-mt-40 md:scroll-mt-4 border-t border-line">
        <h3 class="flex items-center gap-2 text-sm font-bold text-ink mb-3"><i class="fas fa-bullhorn text-blue-500"></i> Campanhas</h3>
        <CampaignManager
          :campaigns="activeModule.campaigns ?? []"
          :saving="saving"
          :readonly="readonly"
          :condition-status="conditionStatus"
          @update:campaigns="patchCampaigns"
          @save="$emit('save')"
          @template-propagated="$emit('template-propagated', $event)"
        />
      </div>

      <!-- ── Seção: Operacional ─────────────────────────────────────────── -->
      <div id="modsec-operational" class="p-5 scroll-mt-40 md:scroll-mt-4 border-t border-line">
        <h3 class="flex items-center gap-2 text-sm font-bold text-ink mb-3"><i class="fas fa-gears text-blue-500"></i> Operacional</h3>
        <OperationalSection
          :form="activeModule"
          :correspondents="correspondents"
          :office-users="officeUsers"
          :readonly="readonly"
          @update="patchMulti"
        />
      </div>

      <!-- ── Seção: Unidades (só módulos do CV) ──────────────────────────── -->
      <div v-if="activeModule?.idetapa" id="modsec-units" class="p-5 scroll-mt-40 md:scroll-mt-4 border-t border-line">
        <h3 class="flex items-center gap-2 text-sm font-bold text-ink mb-3"><i class="fas fa-layer-group text-blue-500"></i> Unidades</h3>

        <!-- Barra de snapshot -->
        <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div class="flex items-center gap-2">
            <template v-if="activeModule.unit_snapshot?.capturedAt">
              <button
                @click="showingSnapshot = !showingSnapshot"
                :class="['flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition',
                  showingSnapshot
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                    : 'bg-accent-soft border-accent/30 text-accent']"
              >
                <i :class="showingSnapshot ? 'fas fa-snowflake' : 'fas fa-circle-dot'" class="text-[10px]"></i>
                {{ showingSnapshot ? 'Snapshot: ' + formatSnapshotDate(activeModule.unit_snapshot.capturedAt) : 'Ao vivo' }}
              </button>
            </template>
            <template v-else>
              <span class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-accent-soft border border-accent/30 text-accent">
                <i class="fas fa-circle-dot text-[10px]"></i> Ao vivo
              </span>
            </template>
          </div>
          <button
            v-if="!readonly && unitsData.length"
            @click="captureUnitSnapshot"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-700 dark:bg-gray-600 text-white rounded-lg hover:bg-gray-800 transition"
            title="Congela o estado atual das unidades para referência histórica"
          >
            <i class="fas fa-snowflake text-[10px]"></i> Capturar estado
          </button>
        </div>

        <!-- Carregando -->
        <div v-if="loadingUnits" class="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
          <i class="fas fa-spinner fa-spin"></i> Carregando unidades...
        </div>

        <!-- Seletor de tabela de preços -->
        <template v-else-if="displayUnits.length">
        <div v-if="selectedTablesWithPrices.length" class="flex items-center gap-2 mb-3 flex-wrap">
          <span class="text-xs text-ink-subtle font-medium flex-shrink-0">Preços de:</span>
          <div class="flex items-center gap-1 flex-wrap">
            <button
              v-for="t in selectedTablesWithPrices"
              :key="t.idtabela"
              @click="selectedPriceTableForUnits = t.idtabela"
              :class="[
                'px-2.5 py-1 text-xs font-semibold rounded-lg border transition',
                (selectedPriceTableForUnits ?? selectedTablesWithPrices[0]?.idtabela) === t.idtabela
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-surface-raised border-line text-ink-muted hover:border-blue-300'
              ]"
            >
              {{ t.nome }}
            </button>
          </div>
        </div>

        <!-- Blocos -->
        <div class="space-y-5">
          <div v-for="bloco in displayUnits" :key="bloco.idbloco">
            <!-- Header do bloco -->
            <div class="flex items-center justify-between mb-2 flex-wrap gap-1">
              <div class="flex items-center gap-2">
                <i class="fas fa-building text-blue-400 text-xs"></i>
                <span class="text-sm font-bold text-gray-800 dark:text-white">{{ bloco.nome }}</span>
                <span class="text-xs text-gray-400">{{ bloco.unidades?.length ?? 0 }} un.</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-gray-500">
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                  <strong class="text-ink">{{ countByStatus(bloco.unidades, 'available') }}</strong> Disp.
                </span>
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                  <strong class="text-ink">{{ countByStatus(bloco.unidades, 'reserved') }}</strong> Res.
                </span>
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                  <strong class="text-ink">{{ countByStatus(bloco.unidades, 'sold') }}</strong> Vend.
                </span>
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-gray-400 inline-block"></span>
                  <strong class="text-ink">{{ countByStatus(bloco.unidades, 'blocked') }}</strong> Bloq.
                </span>
              </div>
            </div>

            <!-- Grade de unidades -->
            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
              <div
                v-for="unit in bloco.unidades"
                :key="unit.idunidade"
                :title="`${unit.nome}${unit.tipologia ? ' · ' + unit.tipologia : ''}${unit.area_privativa ? ' · ' + Number(unit.area_privativa).toFixed(0) + 'm²' : ''}${unitDisplayPrice(unit) != null ? ' · ' + fmtCurrency(unitDisplayPrice(unit)) : ''}`"
                :class="['rounded-lg px-2 py-1.5 text-center text-[11px] font-medium transition cursor-default border', unitStatusClass(unit)]"
              >
                <span class="truncate block leading-tight">{{ unit.nome }}</span>
                <span v-if="unitDisplayPrice(unit)" class="text-[9px] font-bold text-accent block leading-tight">{{ fmtCurrencyShort(unitDisplayPrice(unit)) }}</span>
                <span v-if="unit.area_privativa" class="text-[9px] opacity-60 font-normal">{{ Number(unit.area_privativa).toFixed(0) }}m²</span>
              </div>
            </div>

            <!-- Barra de disponibilidade -->
            <div v-if="bloco.unidades?.length" class="mt-2 flex h-1.5 rounded-full overflow-hidden gap-px">
              <div :style="{ width: pctAvail(bloco.unidades) + '%' }" class="bg-green-400 transition-all"></div>
              <div :style="{ width: pctReserv(bloco.unidades) + '%' }" class="bg-amber-400 transition-all"></div>
              <div :style="{ width: pctSold(bloco.unidades) + '%' }" class="bg-red-400 transition-all"></div>
              <div :style="{ width: pctBlock(bloco.unidades) + '%' }" class="bg-gray-300 dark:bg-gray-600 transition-all"></div>
            </div>
          </div>
        </div>

        </template><!-- /v-else-if displayUnits -->

        <!-- Vazio -->
        <div v-else-if="!loadingUnits" class="flex flex-col items-center justify-center py-10 text-gray-400 text-sm">
          <i class="fas fa-layer-group text-2xl mb-2 text-ink-subtle"></i>
          <p>Nenhuma unidade encontrada para esta etapa.</p>
        </div>
      </div>
    </div>

    <!-- Vazio -->
    <div v-else class="flex flex-col items-center justify-center py-12 bg-surface-raised rounded-2xl border border-dashed border-line text-center px-6">
      <div class="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center mb-3">
        <i class="fas fa-layer-group text-ink-subtle text-lg"></i>
      </div>
      <p class="text-sm font-semibold text-ink-muted mb-1">Nenhum módulo adicionado</p>
      <p class="text-xs text-ink-subtle max-w-xs mb-4">
        Adicione etapas do CV pelo botão <strong>+</strong> acima, ou crie um módulo avulso.
      </p>
      <div v-if="!readonly && (availableStages.length || true)" class="flex flex-wrap gap-2 justify-center">
        <button
          v-for="stage in availableStages.slice(0, 4)"
          :key="stage.idetapa"
          @click="addStageModule(stage)"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent-soft text-accent border border-accent/30 rounded-lg hover:bg-accent-soft transition"
        >
          <i class="fas fa-layer-group text-[10px]"></i>
          {{ stage.nome }}
        </button>
        <button
          @click="addCustomModule"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface-sunken text-ink-muted border border-line rounded-lg hover:bg-surface-hover transition"
        >
          <i class="fas fa-cube text-[10px]"></i>
          Módulo avulso
        </button>
      </div>
    </div>

    <!-- Salvar (escondido quando o Detail tem a lateral: o header do Detail salva) -->
    <div v-if="!readonly && !hideChrome" class="flex justify-end">
      <button @click="$emit('save')" :disabled="saving" class="btn-primary">
        <i :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" class="fas text-xs"></i>
        {{ saving ? 'Salvando...' : 'Salvar Módulos' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';
import AttachmentPicker from './AttachmentPicker.vue';
import AppraisalQrCode from './AppraisalQrCode.vue';
import NegotiationRules from './NegotiationRules.vue';
import CampaignManager from './CampaignManager.vue';
import OperationalSection from './OperationalSection.vue';
import DocsSection from './DocsSection.vue';

const props = defineProps({
    modules:            { type: Array,            default: () => [] },
    conditionId:        { type: [Number, String], required: true },
    conditionStatus:    { type: String,           default: 'draft' },
    saving:             { type: Boolean,          default: false },
    readonly:           { type: Boolean,          default: false },
    priceTables:        { type: Array,            default: () => [] },
    correspondents:     { type: Array,            default: () => [] },
    officeUsers:        { type: Array,            default: () => [] },
    enterpriseOptions:  { type: Array,            default: () => [] }, // [{idempreendimento, nome}]
    enterpriseStages:   { type: Array,            default: () => [] }, // [{idetapa, nome}] from CV
    history:            { type: Array,            default: () => [] }, // [{id, reference_month, status}]
    currentConditionId:         { type: [Number, String], default: null },
    conditionIdempreendimento:  { type: [Number, String], default: null },
    activeIndex:        { type: Number,           default: 0 },     // módulo ativo (controlado pelo Detail)
    hideChrome:         { type: Boolean,          default: false }, // esconde a nav própria quando o Detail tem a lateral
});

const emit = defineEmits(['update:modules', 'save', 'save-silent', 'copy', 'copy-from-enterprise', 'navigate-month', 'delete-module', 'update:activeIndex', 'template-propagated']);

const store = useConditionsStore();

// Módulo ativo controlado pelo Detail (v-model:activeIndex); proxy mantém todas as
// referências internas a activeIdx.value funcionando.
const activeIdx = computed({
    get: () => props.activeIndex,
    set: (v) => emit('update:activeIndex', v),
});
const activeSubTab = ref('data');
const copying      = ref(false);
const copySourceId = ref('');
const showAddPanel = ref(false);

// Navegação por âncora: destaca a seção e rola até ela (seções sempre visíveis).
function scrollToSection(id) {
    activeSubTab.value = id;
    const el = typeof document !== 'undefined' ? document.getElementById(`modsec-${id}`) : null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const STATUS_LABELS = {
    draft:            'Rascunho',
    pending_approval: 'Em Autorização',
    approved:         'Autorizado',
};

// ── Faixas MCMV ──────────────────────────────────────────────────────────────

const FAIXAS_CONFIG = [
    {
        faixa: 1, label: 'Faixa 1',
        borderActive: 'border-blue-400 dark:border-blue-600 shadow-sm',
        bgActive: 'bg-accent-soft',
        checkActive: 'border-accent bg-blue-500',
        textActive: 'text-accent',
        placeholders: {
            appraisal_value: 'Ex: R$ 210.000 – R$ 275.000',
            appraisal_ceiling: 'Ex: R$ 230.000 (cidades médias)',
            avg_ticket: 'Ex: R$ 220.000',
        },
    },
    {
        faixa: 2, label: 'Faixa 2',
        borderActive: 'border-green-400 dark:border-green-600 shadow-sm',
        bgActive: 'bg-green-50 dark:bg-green-950/30',
        checkActive: 'border-green-500 bg-green-500',
        textActive: 'text-green-700 dark:text-green-300',
        placeholders: {
            appraisal_value: 'Ex: R$ 210.000 – R$ 275.000',
            appraisal_ceiling: 'Ex: R$ 275.000 (capitais) · R$ 255.000 (cidades médias)',
            avg_ticket: 'Ex: R$ 240.000',
        },
    },
    {
        faixa: 3, label: 'Faixa 3',
        borderActive: 'border-amber-400 dark:border-amber-600 shadow-sm',
        bgActive: 'bg-amber-50 dark:bg-amber-950/30',
        checkActive: 'border-amber-500 bg-amber-500',
        textActive: 'text-amber-700 dark:text-amber-300',
        placeholders: {
            appraisal_value: 'Ex: R$ 400.000',
            appraisal_ceiling: 'R$ 400.000 (nacional)',
            avg_ticket: 'Ex: R$ 380.000',
        },
    },
    {
        faixa: 4, label: 'Faixa 4',
        borderActive: 'border-orange-400 dark:border-orange-600 shadow-sm',
        bgActive: 'bg-orange-50 dark:bg-orange-950/30',
        checkActive: 'border-orange-500 bg-orange-500',
        textActive: 'text-orange-700 dark:text-orange-300',
        placeholders: {
            appraisal_value: 'Ex: R$ 600.000',
            appraisal_ceiling: 'R$ 600.000 (nacional)',
            avg_ticket: 'Ex: R$ 560.000',
        },
    },
];

function getFaixa(faixa) {
    return (activeModule.value?.appraisal_faixas ?? []).find(f => f.faixa === faixa) ?? {};
}

function faixaEnabled(faixa) {
    return getFaixa(faixa).enabled === true;
}

function toggleFaixa(faixa) {
    const current = (activeModule.value?.appraisal_faixas ?? []).map(f => ({ ...f }));
    const idx = current.findIndex(f => f.faixa === faixa);
    if (idx >= 0) {
        current[idx] = { ...current[idx], enabled: !current[idx].enabled };
    } else {
        current.push({ faixa, enabled: true, appraisal_value: null, appraisal_ceiling: null, avg_ticket: null });
        // Ensure all 4 faixas exist in correct order
        for (const fc of FAIXAS_CONFIG) {
            if (!current.find(f => f.faixa === fc.faixa)) {
                current.push({ faixa: fc.faixa, enabled: false, appraisal_value: null, appraisal_ceiling: null, avg_ticket: null });
            }
        }
        current.sort((a, b) => a.faixa - b.faixa);
    }
    patch('appraisal_faixas', current);
}

function patchFaixa(faixa, field, val) {
    const current = (activeModule.value?.appraisal_faixas ?? []).map(f => ({ ...f }));
    const idx = current.findIndex(f => f.faixa === faixa);
    if (idx >= 0) {
        current[idx] = { ...current[idx], [field]: val };
        patch('appraisal_faixas', current);
    }
}

const BASE_SUB_TABS = [
    { id: 'data',        label: 'Dados',         icon: 'fas fa-hashtag' },
    { id: 'prices',      label: 'Preços',        icon: 'fas fa-tag' },
    { id: 'negotiation', label: 'Negociação',    icon: 'fas fa-handshake' },
    { id: 'docs',        label: 'Documentação',  icon: 'fas fa-file-contract' },
    { id: 'campaigns',   label: 'Campanhas',     icon: 'fas fa-bullhorn' },
    { id: 'operational', label: 'Operacional',   icon: 'fas fa-gears' },
    { id: 'units',       label: 'Unidades',      icon: 'fas fa-layer-group' },
];

const subTabs = computed(() => {
    // Só mostra a tab de Unidades se o módulo ativo está vinculado a uma etapa do CV
    if (activeModule.value?.idetapa) return BASE_SUB_TABS;
    return BASE_SUB_TABS.filter(t => t.id !== 'units');
});

// ── Unidades do estágio ───────────────────────────────────────────────────────
const unitsData    = ref([]);
const loadingUnits = ref(false);
const showingSnapshot = ref(false);
const selectedPriceTableForUnits = ref(null);

const displayUnits = computed(() =>
    showingSnapshot.value && activeModule.value?.unit_snapshot?.data?.length
        ? activeModule.value.unit_snapshot.data
        : unitsData.value
);

function captureUnitSnapshot() {
    if (!unitsData.value.length) {
        store.notify('Sem unidades carregadas para capturar.', 'error');
        return;
    }
    patch('unit_snapshot', {
        capturedAt: new Date().toISOString(),
        data: JSON.parse(JSON.stringify(unitsData.value)),
    });
    const total = unitsData.value.reduce((sum, b) => sum + (b.unidades?.length ?? 0), 0);
    store.notify(`Estado capturado: ${total} unidade(s) congeladas para o resumo/PDF. Salve para gravar.`);
}

function formatSnapshotDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const snapshotM2Stats = computed(() => {
    const blocos = activeModule.value?.unit_snapshot?.data ?? [];
    if (!blocos.length) return null;
    const prices = [];
    for (const b of blocos) {
        for (const u of (b.unidades ?? [])) {
            if (u.valor_total != null && u.area_privativa && Number(u.area_privativa) > 0) {
                prices.push(Number(u.valor_total) / Number(u.area_privativa));
            }
        }
    }
    if (!prices.length) return null;
    return {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    };
});

function formatM2(v) {
    if (v == null) return '—';
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) + '/m²';
}

async function loadUnits() {
    const mod = activeModule.value;
    if (!mod?.idetapa || !props.conditionIdempreendimento) return;
    loadingUnits.value = true;
    unitsData.value = [];
    try {
        unitsData.value = await store.fetchUnitsForStage(props.conditionIdempreendimento, mod.idetapa);
    } catch (e) {
        console.warn('[ModuleSection] loadUnits:', e.message);
    } finally {
        loadingUnits.value = false;
    }
}

const activeModule = computed(() => props.modules[activeIdx.value] ?? null);

// Carrega unidades quando o módulo ativo (com etapa do CV) muda — seções roláveis.
watch(() => activeModule.value?.idetapa, (idetapa) => {
    if (idetapa) loadUnits();
    else unitsData.value = [];
}, { immediate: true });
const otherModules = computed(() => props.modules.filter((_, i) => i !== activeIdx.value));

// Etapas do CV ainda não vinculadas a nenhum módulo desta ficha
const availableStages = computed(() => {
    const used = new Set(props.modules.map(m => m.idetapa).filter(Boolean));
    return props.enterpriseStages.filter(s => !used.has(s.idetapa));
});

// Para o módulo ativo avulso: etapas disponíveis para vinculação (não usadas por outros módulos)
const availableStagesForLink = computed(() => {
    const usedByOthers = new Set(
        props.modules
            .filter((_, i) => i !== activeIdx.value)
            .map(m => m.idetapa)
            .filter(Boolean)
    );
    return props.enterpriseStages.filter(s => !usedByOthers.has(s.idetapa));
});

function addStageModule(stage) {
    const newMod = {
        idetapa: stage.idetapa,
        module_name: stage.nome,
        sort_order: props.modules.length,
        price_table_ids: [],
        manual_price_tables: [],
        campaigns: [],
    };
    emit('update:modules', [...props.modules, newMod]);
    activeIdx.value = props.modules.length;
    showAddPanel.value = false;
}

function addCustomModule() {
    const newMod = {
        idetapa: null,
        module_name: '',
        sort_order: props.modules.length,
        price_table_ids: [],
        manual_price_tables: [],
        campaigns: [],
    };
    emit('update:modules', [...props.modules, newMod]);
    activeIdx.value = props.modules.length;
    showAddPanel.value = false;
    activeSubTab.value = 'data';
}

// IDs selecionados no módulo ativo que não existem mais na lista ativa do CV
const orphanedPriceTableIds = computed(() => {
    const selected = activeModule.value?.price_table_ids ?? [];
    if (!selected.length) return [];
    const activeIds = new Set(props.priceTables.map(t => t.idtabela));
    return selected.filter(id => !activeIds.has(id));
});

function removeOrphanedTables() {
    const activeIds = new Set(props.priceTables.map(t => t.idtabela));
    const cleaned = (activeModule.value?.price_table_ids ?? []).filter(id => activeIds.has(id));
    patch('price_table_ids', cleaned);
    store.notify('Tabelas inativas do CV removidas da seleção.');
}

// Tables selected for this module that have price data
const selectedTablesWithPrices = computed(() => {
    const selectedIds = new Set(activeModule.value?.price_table_ids ?? []);
    return props.priceTables.filter(t => selectedIds.has(t.idtabela) && t.unit_count > 0);
});

// Map: idunidade → valor_total from the active price table selector
const unitPriceMap = computed(() => {
    const map = new Map();
    const tables = selectedTablesWithPrices.value;
    if (!tables.length) return map;
    const tableId = selectedPriceTableForUnits.value ?? tables[0]?.idtabela;
    const table = props.priceTables.find(t => t.idtabela === tableId);
    for (const u of (table?.unidades ?? [])) {
        if (u.idunidade != null) map.set(String(u.idunidade), u.valor_total ?? null);
    }
    return map;
});

function onStageLinkChange(event) {
    const value = event.target.value;
    const idetapa = value === "" ? null : Number(value);
 
    const updated = props.modules.map((m, i) => {
        if (i !== activeIdx.value) return m;

        // Buscamos o nome da etapa para atualizar o nome do módulo junto
        const stage = props.enterpriseStages.find(s => Number(s.idetapa) === idetapa);

        return {
            ...m,
            idetapa: idetapa, // Aqui vai null ou o ID correto
            module_name: idetapa ? (stage?.nome || m.module_name) : m.module_name
        };
    });

    emit('update:modules', updated);

    if (idetapa) {
      emit('save-silent', updated);
      const stage = props.enterpriseStages.find(s => Number(s.idetapa) === idetapa);
      store.notify(`Módulo vinculado à etapa "${stage?.nome ?? idetapa}" do CV.`);
    }
}

// Reset sub-tab and close add panel when switching module
watch(activeIdx, () => {
    activeSubTab.value = 'data';
    showAddPanel.value = false;
    unitsData.value = [];
    expandedPriceTables.value = new Set();
    showingSnapshot.value = false;
    selectedPriceTableForUnits.value = null;
});

// Garante que activeIdx não fique fora dos limites quando os módulos mudam (ex: após save)
watch(() => props.modules, (mods) => {
    if (activeIdx.value >= mods.length) {
        activeIdx.value = Math.max(0, mods.length - 1);
    }
}, { flush: 'sync' });

// ── Navegação de meses ────────────────────────────────────────────────────────
// history vem ordenado DESC (mais recente = índice 0)
const currentHistoryIdx = computed(() =>
    props.history.findIndex(h => String(h.id) === String(props.currentConditionId))
);

// "Anterior" = mês mais antigo = índice maior no array DESC
const prevItem = computed(() =>
    currentHistoryIdx.value < props.history.length - 1
        ? props.history[currentHistoryIdx.value + 1]
        : null
);

// "Próximo" = mês mais recente = índice menor no array DESC
const nextItem = computed(() =>
    currentHistoryIdx.value > 0
        ? props.history[currentHistoryIdx.value - 1]
        : null
);

const currentHistoryPos = computed(() => {
    if (!props.history.length) return 1;
    // Posição humanizada: 1 = mais recente
    return currentHistoryIdx.value + 1;
});

const currentMonthLabel = computed(() => {
    const h = props.history[currentHistoryIdx.value];
    return h ? formatMonth(h.reference_month) : formatMonth(null);
});

function navigatePrev() {
    if (prevItem.value) emit('navigate-month', prevItem.value.id);
}

function navigateNext() {
    if (nextItem.value) emit('navigate-month', nextItem.value.id);
}

function statusChipClass(s) {
    const map = {
        draft:            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        pending_approval: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        approved:         'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return map[s] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
}

// ── Remover módulo ────────────────────────────────────────────────────────────

function handleDeleteModule(mod) {
    const name = mod.module_name || `Módulo #${mod.id}`;
    if (!window.confirm(`Remover o módulo "${name}"?\n\nEsta ação não pode ser desfeita.`)) return;
    emit('delete-module', mod.id);
}

// ── Patch helpers ─────────────────────────────────────────────────────────────

function patch(field, val) {
    const updated = props.modules.map((m, i) =>
        i === activeIdx.value ? { ...m, [field]: val } : m
    );
    emit('update:modules', updated);
}

function patchMulti(obj) {
    const updated = props.modules.map((m, i) =>
        i === activeIdx.value ? { ...m, ...obj } : m
    );
    emit('update:modules', updated);
}

function patchWithMinDemand(evt) {
    const val = numOrNull(evt.target.value);
    const updated = props.modules.map((m, i) => {
        if (i !== activeIdx.value) return m;
        return { ...m, total_units: val, min_demand: val != null ? Math.ceil(val * 0.2) : m.min_demand };
    });
    emit('update:modules', updated);
}

function patchCampaigns(newCampaigns) {
    const updated = props.modules.map((m, i) =>
        i === activeIdx.value ? { ...m, campaigns: newCampaigns } : m
    );
    emit('update:modules', updated);
}

// ── Preços ────────────────────────────────────────────────────────────────────

const expandedPriceTables = ref(new Set());

function togglePriceTableExpand(idtabela) {
    const s = new Set(expandedPriceTables.value);
    if (s.has(idtabela)) s.delete(idtabela); else s.add(idtabela);
    expandedPriceTables.value = s;
}

function groupByBloco(unidades) {
    const map = new Map();
    for (const u of (unidades ?? [])) {
        const key = u.bloco ?? '—';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(u);
    }
    return [...map.entries()].map(([bloco, units]) => ({ bloco, units }));
}

function unitSituacaoDot(situacao) {
    const s = (situacao ?? '').toLowerCase();
    if (s.includes('dispon')) return 'bg-green-500';
    if (s.includes('reserv')) return 'bg-amber-500';
    if (s.includes('vend') || s.includes('contrat')) return 'bg-red-500';
    return 'bg-gray-400';
}

// Auto-seleciona vigentes — separado por fonte para evitar race com patch de idetapa
// Usa save-silent para persistir imediatamente e não deixar isDirty=true sem motivo
function autoSelectVigentes() {
    if (!props.priceTables?.length || props.readonly) return;
    const mod = activeModule.value;
    if (!mod || (mod.price_table_ids ?? []).length > 0) return;
    const vigentes = props.priceTables.filter(t => t.vigente).map(t => t.idtabela);
    if (!vigentes.length) return;
    // Constrói updated sem usar patch() para poder chamar save-silent sem marcar dirty
    const updated = props.modules.map((m, i) =>
        i === activeIdx.value ? { ...m, price_table_ids: vigentes } : m
    );
    emit('update:modules', updated);
    // Persiste silenciosamente para que o auto-select não apareça como alteração não salva
    nextTick(() => emit('save-silent', updated));
}
watch(() => props.priceTables, autoSelectVigentes, { immediate: true });
// nextTick garante que props.modules já reflete o estado após o módulo ser adicionado
watch(activeIdx, () => nextTick(autoSelectVigentes));

function togglePriceTable(idtabela) {
    const current = Array.isArray(activeModule.value?.price_table_ids)
        ? [...activeModule.value.price_table_ids]
        : [];
    const idx = current.indexOf(idtabela);
    if (idx >= 0) current.splice(idx, 1);
    else current.push(idtabela);
    patch('price_table_ids', current);
}

function addManualTable() {
    const current = [...(activeModule.value?.manual_price_tables ?? [])];
    current.push({ name: '', validity_from: '', validity_to: '', note: '', avg_ticket: null, units: [] });
    patch('manual_price_tables', current);
}

function removeManualTable(mi) {
    const current = (activeModule.value?.manual_price_tables ?? []).filter((_, i) => i !== mi);
    patch('manual_price_tables', current);
}

function patchManualTable(mi, field, val) {
    const current = (activeModule.value?.manual_price_tables ?? []).map((t, i) =>
        i === mi ? { ...t, [field]: val } : t
    );
    patch('manual_price_tables', current);
}

function generateUnits(mi) {
    const count = activeModule.value?.total_units;
    if (!count) return;
    const existing = activeModule.value.manual_price_tables[mi]?.units ?? [];
    const existingMap = new Map(existing.map(u => [u.label, u.value]));
    const units = Array.from({ length: Number(count) }, (_, i) => {
        const label = String(i + 1).padStart(3, '0');
        return { label, value: existingMap.get(label) ?? null };
    });
    patchManualTable(mi, 'units', units);
}

function applyAvgTicket(mi) {
    const mt = activeModule.value?.manual_price_tables[mi];
    if (!mt?.avg_ticket || !mt.units?.length) return;
    const units = mt.units.map(u => ({ ...u, value: mt.avg_ticket }));
    patchManualTable(mi, 'units', units);
}

function patchUnit(mi, ui, val) {
    const units = [...(activeModule.value.manual_price_tables[mi]?.units ?? [])];
    units[ui] = { ...units[ui], value: val };
    patchManualTable(mi, 'units', units);
}

function removeUnit(mi, ui) {
    const units = (activeModule.value.manual_price_tables[mi]?.units ?? []).filter((_, i) => i !== ui);
    patchManualTable(mi, 'units', units);
}

// ── Helpers de disponibilidade de unidades ────────────────────────────────────
// Espelha Meninger-Back/services/cv/enterpriseUnitsSummaryService.js (classifyUnitStatus)

function classifyUnit(unit) {
    const raw = unit?.situacao_mapa_disponibilidade;
    const numeric = Number(raw);
    const statusNum = !Number.isNaN(numeric) && numeric > 0 ? numeric : null;
    let isSold = false, isReserved = false, isBlocked = false;
    if (statusNum !== null) {
        isSold = statusNum === 3;
        isReserved = statusNum === 2 || statusNum === 5;
        isBlocked = statusNum === 4;
    } else {
        const s = String(raw || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        if (s.includes('vend')) isSold = true;
        if (s.includes('reserv')) isReserved = true;
        if (s.includes('bloq')) isBlocked = true;
    }
    if (unit?.data_bloqueio) { isBlocked = true; isSold = false; isReserved = false; }
    return { isSold, isReserved, isBlocked };
}

function unitStatusClass(unit) {
    const st = classifyUnit(unit);
    if (st.isSold)     return 'bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-700    text-red-700    dark:text-red-400';
    if (st.isReserved) return 'bg-amber-50  dark:bg-amber-900/20  border-amber-200  dark:border-amber-700  text-amber-800  dark:text-amber-300';
    if (st.isBlocked)  return 'bg-gray-100  dark:bg-gray-800      border-gray-200   dark:border-gray-700   text-gray-400';
    return                    'bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-700  text-green-800  dark:text-green-300';
}

function countByStatus(units, kind) {
    if (!units?.length) return 0;
    return units.filter(u => {
        const st = classifyUnit(u);
        if (kind === 'available') return !st.isSold && !st.isReserved && !st.isBlocked;
        if (kind === 'reserved')  return st.isReserved;
        if (kind === 'sold')      return st.isSold;
        if (kind === 'blocked')   return st.isBlocked;
        return false;
    }).length;
}

const pctAvail  = (u) => u?.length ? Math.round((countByStatus(u, 'available') / u.length) * 100) : 0;
const pctReserv = (u) => u?.length ? Math.round((countByStatus(u, 'reserved')  / u.length) * 100) : 0;
const pctSold   = (u) => u?.length ? Math.round((countByStatus(u, 'sold')      / u.length) * 100) : 0;
const pctBlock  = (u) => u?.length ? Math.round((countByStatus(u, 'blocked')   / u.length) * 100) : 0;

function unitAvg(units) {
    const vals = (units ?? []).map(u => u.value).filter(v => v != null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function unitMin(units) {
    const vals = (units ?? []).map(u => u.value).filter(v => v != null);
    return vals.length ? Math.min(...vals) : null;
}

function unitMax(units) {
    const vals = (units ?? []).map(u => u.value).filter(v => v != null);
    return vals.length ? Math.max(...vals) : null;
}

function unitTotal(units) {
    const vals = (units ?? []).map(u => u.value).filter(v => v != null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0);
}

// Returns the price to display for a unit cell — snapshot price takes priority
function unitDisplayPrice(unit) {
    if (showingSnapshot.value && unit.valor_total != null) return unit.valor_total;
    return unitPriceMap.value.get(String(unit.idunidade)) ?? null;
}

// ── Completude por módulo ─────────────────────────────────────────────────────

const COMPLETENESS_LABELS = {
    data:        'Dados básicos',
    prices:      'Preços',
    negotiation: 'Negociação',
    campaigns:   'Campanhas',
    operational: 'Operacional',
};

function moduleCompleteness(mod) {
    return {
        data:        !!(mod.module_name && mod.total_units),
        prices:      (mod.price_table_ids?.length > 0) || (mod.manual_price_tables?.length > 0),
        negotiation: !!(mod.max_entry_value || mod.rp_rule || mod.max_installments),
        campaigns:   (mod.campaigns?.length > 0),
        operational: !!(mod.manager_user_id || mod.correspondent_id || mod.contract_registration_by),
    };
}

function completenessTooltip(mod) {
    const c = moduleCompleteness(mod);
    const filled = Object.entries(c).filter(([, v]) => v).map(([k]) => COMPLETENESS_LABELS[k]);
    const missing = Object.entries(c).filter(([, v]) => !v).map(([k]) => COMPLETENESS_LABELS[k]);
    const parts = [];
    if (filled.length) parts.push(`✓ ${filled.join(', ')}`);
    if (missing.length) parts.push(`○ Pendente: ${missing.join(', ')}`);
    return parts.join('\n');
}

// ── Copiar de mesmo módulo da ficha ──────────────────────────────────────────

async function handleCopyIntra() {
    if (!copySourceId.value) return;
    const sourceMod = props.modules.find(m => String(m.id) === String(copySourceId.value));
    const srcName = sourceMod?.module_name || 'módulo de origem';
    const dstName = activeModule.value?.module_name || 'este módulo';
    if (!window.confirm(`Copiar todos os dados de "${srcName}" para "${dstName}"?\n\nIsso substituirá todos os campos do módulo destino e não pode ser desfeito.`)) return;
    copying.value = true;
    try {
        emit('copy', { targetId: activeModule.value?.id, sourceId: copySourceId.value });
        copySourceId.value = '';
    } finally {
        copying.value = false;
    }
}

// ── Modal: Copiar de outro empreendimento/mês ─────────────────────────────────

const showCopyModal = ref(false);
const copyFrom = ref({
    idempreendimento: '',
    conditionId: '',
    moduleId: '',
    fields: ['negotiation', 'prices', 'operational', 'campaigns'],
});
const copySourceConditions = ref([]);
const copySourceModules = computed(() => {
    const cond = copySourceConditions.value.find(c => c.id === copyFrom.value.conditionId);
    return cond?.modules ?? [];
});

const copyFieldOptions = [
    { value: 'data',        label: 'Dados (Produto)',   hint: 'Total unidades, MCMV, comissão, prazo de entrega' },
    { value: 'prices',      label: 'Preços',            hint: 'Tabelas (CV se mesmo empreendimento) + manuais' },
    { value: 'negotiation', label: 'Negociação',        hint: 'Parcelas, entrada, regras, subsídio' },
    { value: 'docs',        label: 'Documentação',      hint: 'Pacote CEF, ITBI, Cartório' },
    { value: 'operational', label: 'Operacional',       hint: 'Gestor, registro do contrato, CCA, certificação' },
    { value: 'campaigns',   label: 'Campanhas',         hint: 'Campanhas ativas/desativadas' },
];

function openCopyModal() {
    copyFrom.value = {
        idempreendimento: '',
        conditionId: '',
        moduleId: '',
        fields: copyFieldOptions.map(o => o.value), // todas selecionadas por padrão
    };
    copySourceConditions.value = [];
    showCopyModal.value = true;
}

async function onCopyEnterpriseChange() {
    copyFrom.value.conditionId = '';
    copyFrom.value.moduleId = '';
    copySourceConditions.value = [];
    if (!copyFrom.value.idempreendimento) return;
    try {
        copySourceConditions.value = await store.fetchModulesForEnterprise(copyFrom.value.idempreendimento);
    } catch (e) {
        console.warn('[ModuleSection] fetchModulesForEnterprise:', e);
    }
}

function onCopyConditionChange() {
    copyFrom.value.moduleId = '';
}

async function handleCopyFromEnterprise() {
    if (!copyFrom.value.moduleId || !copyFrom.value.fields.length) return;
    copying.value = true;
    try {
        emit('copy-from-enterprise', {
            moduleId: activeModule.value?.id,
            sourceConditionId: copyFrom.value.conditionId,
            sourceModuleId: copyFrom.value.moduleId,
            fields: copyFrom.value.fields,
        });
        showCopyModal.value = false;
    } finally {
        copying.value = false;
    }
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function numOrNull(v) {
    return v === '' || v == null ? null : Number(v);
}

function fmtBR(val) {
    if (val == null || val === '') return '';
    return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseBR(str) {
    if (str === '' || str == null) return null;
    const n = parseFloat(String(str).replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? null : n;
}

function fmtCurrency(val) {
    if (val == null) return '—';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtCurrencyShort(val) {
    if (val == null) return '—';
    const n = Number(val);
    if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    if (n >= 1_000) return `R$ ${(n / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}k`;
    return fmtCurrency(n);
}

// Fecha o painel ao pressionar Escape
function onKeydown(e) { if (e.key === 'Escape') showAddPanel.value = false; }
onMounted(() => document.addEventListener('keydown', onKeydown));
onUnmounted(() => document.removeEventListener('keydown', onKeydown));

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

function formatMonth(dateStr) {
    if (!dateStr) return '—';
    const [y, m] = dateStr.split('-');
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${months[Number(m) - 1]}/${y}`;
}
</script>

<style scoped>
.lbl-section { @apply text-xs font-semibold text-ink-muted uppercase tracking-wide flex items-center gap-2; }
.lbl     { @apply block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5; }
.inp     { @apply w-full px-3.5 py-2.5 text-sm text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-accent focus:ring-2 focus:ring-blue-500/15 transition-all duration-150 disabled:opacity-60 disabled:cursor-default; }
.inp-pfx { @apply w-full pl-9 pr-3.5 py-2.5 text-sm text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:border-blue-400 dark:focus:border-accent focus:ring-2 focus:ring-blue-500/15 transition-all duration-150 disabled:opacity-60 disabled:cursor-default; }
.inp-sm  { @apply px-2.5 py-1.5 text-xs text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm placeholder:text-gray-400 outline-none focus:border-blue-400 dark:focus:border-accent focus:ring-1 focus:ring-blue-500/15 transition-all duration-150 disabled:opacity-60 disabled:cursor-default; }
.inp-inline { @apply px-2 py-1.5 text-sm text-ink bg-transparent border border-transparent rounded-md placeholder:text-gray-400 outline-none focus:border-blue-400 dark:focus:border-accent focus:bg-white dark:focus:bg-gray-900/60 focus:ring-1 focus:ring-blue-500/15 transition-all duration-150 disabled:opacity-60 disabled:cursor-default; }
.pfx     { @apply absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle text-xs pointer-events-none; }
.btn-primary { @apply flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-accent-hover disabled:opacity-50 transition; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-down-enter-active { transition: all .15s ease-out; }
.slide-down-leave-active { transition: all .1s ease-in; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
