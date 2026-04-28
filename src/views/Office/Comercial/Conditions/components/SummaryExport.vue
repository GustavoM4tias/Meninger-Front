<template>
  <div class="summary-root">

    <!-- ── Modal: Visualizar documento (aprovadores) ──────────────────────────── -->
    <transition name="fade">
      <div
        v-if="showDocModal"
        class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4"
        @click.self="closeDocModal"
      >
        <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl">
          <!-- Header fixo da modal -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl z-10">
            <div class="flex items-center gap-2">
              <i class="fas fa-file-contract text-blue-500"></i>
              <span class="text-sm font-bold text-gray-900 dark:text-white">
                Ficha Comercial — {{ detail?.enterprise?.nome }}
                <span class="ml-2 text-xs font-normal text-gray-400">{{ currentMonthLabel }}</span>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button @click="printModule"
                class="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition">
                <i class="fas fa-file-pdf text-xs"></i> Exportar PDF
              </button>
              <button @click="closeDocModal"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <i class="fas fa-times text-sm"></i>
              </button>
            </div>
          </div>
          <!-- Módulos empilhados: usa mesma lógica de renderização do template principal -->
          <div class="p-6 space-y-6">
            <div v-for="(mod, idx) in localModules" :key="mod.id ?? idx">
              <!-- Separador entre módulos -->
              <div v-if="localModules.length > 1" class="flex items-center gap-3 mb-5" :class="idx > 0 ? 'mt-4' : ''">
                <div class="h-px flex-1 bg-blue-100 dark:bg-blue-900/40"></div>
                <span class="text-xs font-bold text-blue-500 uppercase tracking-widest px-3">
                  {{ mod.module_name || `Módulo ${idx + 1}` }}
                </span>
                <div class="h-px flex-1 bg-blue-100 dark:bg-blue-900/40"></div>
              </div>
              <!-- KPIs do módulo -->
              <div class="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
                <div class="kpi-card">
                  <span class="kpi-label">Unidades</span>
                  <span class="kpi-value" :class="mod.total_units == null ? 'kpi-empty' : ''">{{ mod.total_units ?? '—' }}</span>
                </div>
                <div class="kpi-card">
                  <span class="kpi-label">Máx. Entrada</span>
                  <span class="kpi-value text-lg" :class="mod.max_entry_value == null ? 'kpi-empty' : ''">{{ mod.max_entry_value != null ? formatCurrencyShort(mod.max_entry_value) : '—' }}</span>
                </div>
                <div class="kpi-card">
                  <span class="kpi-label">Comissão</span>
                  <span class="kpi-value" :class="mod.commission_pct == null ? 'kpi-empty' : ''">{{ mod.commission_pct != null ? `${parseFloat(mod.commission_pct).toFixed(1)}%` : '—' }}</span>
                </div>
                <div class="kpi-card">
                  <span class="kpi-label">Prazo Entrega</span>
                  <span class="kpi-value" :class="mod.delivery_deadline_months == null ? 'kpi-empty' : ''">{{ mod.delivery_deadline_months ?? '—' }}</span>
                  <span v-if="mod.delivery_deadline_months != null" class="kpi-sub">meses</span>
                </div>
                <div class="kpi-card">
                  <span class="kpi-label">Parc. RP</span>
                  <span class="kpi-value text-base" :class="mod.rp_installment_value == null ? 'kpi-empty' : ''">{{ mod.rp_installment_value != null ? formatCurrencyShort(mod.rp_installment_value) : '—' }}</span>
                </div>
              </div>
              <!-- Campos essenciais em dois cards lado a lado -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <!-- Negociação resumida -->
                <div class="info-card">
                  <div class="info-card-header"><i class="fas fa-handshake text-blue-500"></i> Negociação</div>
                  <div class="info-card-body">
                    <div class="field-grid">
                      <div class="field-item"><span class="field-label">Parcela RP</span><span class="field-value accent" :class="mod.rp_installment_value == null ? 'field-empty' : ''">{{ mod.rp_installment_value != null ? formatCurrency(mod.rp_installment_value) : 'Não informado' }}</span></div>
                      <div class="field-item"><span class="field-label">Parcela Ato</span><span class="field-value accent" :class="mod.act_installment_value == null ? 'field-empty' : ''">{{ mod.act_installment_value != null ? formatCurrency(mod.act_installment_value) : 'Não informado' }}</span></div>
                      <div class="field-item"><span class="field-label">Parc. Mínima</span><span class="field-value" :class="mod.min_installment_value == null ? 'field-empty' : ''">{{ mod.min_installment_value != null ? formatCurrency(mod.min_installment_value) : 'Não informado' }}</span></div>
                      <div class="field-item"><span class="field-label">Máx. Parcelas</span><span class="field-value" :class="mod.max_installments == null ? 'field-empty' : ''">{{ mod.max_installments != null ? `${mod.max_installments}x` : 'Não informado' }}</span></div>
                      <div class="field-item"><span class="field-label">Até Habite-se</span><span class="field-value" :class="!mod.installment_until_habite_se ? 'field-empty' : ''">{{ mod.installment_until_habite_se || 'Não informado' }}</span></div>
                      <div class="field-item"><span class="field-label">Pós Habite-se</span><span class="field-value" :class="!mod.installment_post_habite_se ? 'field-empty' : ''">{{ mod.installment_post_habite_se || 'Não informado' }}</span></div>
                    </div>
                    <div v-if="mod.has_state_subsidy" class="subsidy-badge mt-3">
                      <i class="fas fa-hand-holding-usd text-xs"></i>
                      <span class="font-semibold">Subsídio Estadual{{ modSubsidyLabel(mod) ? ` — ${modSubsidyLabel(mod)}` : '' }}</span>
                    </div>
                    <div v-if="mod.rp_rule" class="note-block mt-3"><span class="note-label">Regra RP</span><p>{{ mod.rp_rule }}</p></div>
                  </div>
                </div>
                <!-- Operacional resumido -->
                <div class="info-card">
                  <div class="info-card-header"><i class="fas fa-gears text-blue-500"></i> Operacional</div>
                  <div class="info-card-body">
                    <div class="op-grid" style="grid-template-columns: 1fr;">
                      <div class="op-item"><i class="fas fa-user-tie op-icon"></i><div><span class="field-label">Gestor</span><span class="field-value" :class="!modManagerLabel(mod) ? 'field-empty' : ''">{{ modManagerLabel(mod) || 'Não informado' }}</span></div></div>
                      <div class="op-item"><i class="fas fa-file-signature op-icon"></i><div><span class="field-label">Registro do Contrato</span><span class="field-value" :class="!mod.contract_registration_by ? 'field-empty' : ''">{{ mod.contract_registration_by ? contractLabel(mod) : 'Não informado' }}</span></div></div>
                      <div class="op-item"><i class="fas fa-handshake op-icon"></i><div><span class="field-label">Correspondente</span><span class="field-value" :class="!modCorrespondent(mod) ? 'field-empty' : ''">{{ modCorrespondent(mod)?.nome || 'Não informado' }}</span></div></div>
                      <div class="op-item"><i class="fas fa-shield-check op-icon"></i><div><span class="field-label">Cert. Digital</span><span class="field-value" :class="!mod.has_digital_cert ? 'field-empty' : ''">{{ mod.has_digital_cert ? (mod.digital_cert_provider || 'Sim') : 'Não utiliza' }}</span></div></div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Tabelas de preço -->
              <div v-if="modSelectedPriceTables(mod).length || (mod.manual_price_tables ?? []).length" class="info-card mb-4">
                <div class="info-card-header"><i class="fas fa-tag text-blue-500"></i> Tabelas de Preço</div>
                <div class="info-card-body space-y-2">
                  <div v-for="t in modSelectedPriceTables(mod)" :key="t.idtabela" class="price-table-row flex-col items-start gap-1">
                    <div class="flex items-center justify-between w-full gap-2">
                      <span class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{{ t.nome }}</span>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <span v-if="t.vigente" class="badge-green">vigente</span>
                        <span class="text-xs text-gray-400">{{ formatDate(t.data_vigencia_de) }} → {{ formatDate(t.data_vigencia_ate) }}</span>
                      </div>
                    </div>
                    <div v-if="t.unit_count > 0" class="text-xs text-gray-500 flex gap-3 pl-0 flex-wrap">
                      <span><strong>{{ t.unit_count }}</strong> unidades</span>
                      <span v-if="t.price_min != null">{{ formatCurrencyShort(t.price_min) }} — {{ formatCurrencyShort(t.price_max) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Campanhas ativas -->
              <div v-if="modActiveCampaigns(mod).length" class="info-card mb-4">
                <div class="info-card-header"><i class="fas fa-bullhorn text-blue-500"></i> Campanhas Ativas</div>
                <div class="info-card-body grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div v-for="(camp, ci) in modActiveCampaigns(mod)" :key="camp.id ?? ci" class="campaign-card">
                    <p class="text-sm font-bold text-gray-900 dark:text-white">{{ camp.title }}</p>
                    <p v-if="camp.description" class="text-xs text-gray-500 mt-0.5">{{ camp.description }}</p>
                    <div class="flex gap-3 mt-1 flex-wrap">
                      <span v-if="camp.value" class="campaign-value">{{ formatCurrency(camp.value) }}</span>
                      <span v-if="camp.start_date" class="text-xs text-gray-400">{{ formatDate(camp.start_date) }}{{ camp.end_date ? ` → ${formatDate(camp.end_date)}` : '' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ── Controles (não imprime) ──────────────────────────────────────────── -->
    <div class="no-print bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-5">

      <!-- Barra superior: mês + ações -->
      <div class="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-gray-800/60 dark:to-blue-950/20 border-b border-gray-100 dark:border-gray-800 flex-wrap">
        <div class="flex items-center gap-2">
          <button @click="navigatePrev" :disabled="!prevItem"
            :class="['w-7 h-7 flex items-center justify-center rounded-lg transition text-xs',
              prevItem ? 'text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-700'
                       : 'text-gray-300 dark:text-gray-600 cursor-not-allowed']">
            <i class="fas fa-chevron-left"></i>
          </button>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 font-medium">Ref:</span>
            <span class="text-sm font-bold text-gray-800 dark:text-white">{{ currentMonthLabel }}</span>
            <!-- Status badge -->
            <span v-if="wasRejected && detail?.status === 'draft'"
              class="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              Reprovada
            </span>
            <span v-else :class="statusChipClass(detail?.status)" class="px-2 py-0.5 rounded-full text-xs font-semibold">
              {{ STATUS_LABELS[detail?.status] ?? detail?.status }}
            </span>
          </div>
          <button @click="navigateNext" :disabled="!nextItem"
            :class="['w-7 h-7 flex items-center justify-center rounded-lg transition text-xs',
              nextItem ? 'text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-700'
                       : 'text-gray-300 dark:text-gray-600 cursor-not-allowed']">
            <i class="fas fa-chevron-right"></i>
          </button>
          <span v-if="history.length > 1" class="text-xs text-gray-400 dark:text-gray-600">{{ currentHistoryPos }}/{{ history.length }}</span>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Ver documento (só aprovadores, quando em autorização) -->
          <button v-if="isApprover && detail?.status === 'pending_approval'" @click="showDocModal = true"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition">
            <i class="fas fa-file-contract text-xs"></i> Ver Documento
          </button>

          <button @click="printModule"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition">
            <i class="fas fa-file-pdf text-xs"></i> Exportar PDF
          </button>

          <!-- Ações de workflow -->
          <button v-if="isAdmin && detail?.status === 'draft'" @click="$emit('submit-for-approval')" :disabled="actionLoading"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
            <i class="fas fa-paper-plane text-xs"></i> Enviar para Autorização
          </button>
          <button v-else-if="isAdmin && detail?.status === 'pending_approval'" @click="$emit('cancel-approval')"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 transition">
            <i class="fas fa-ban text-xs"></i> Cancelar Autorização
          </button>
          <div v-else-if="!isAdmin && detail?.status === 'pending_approval'"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg border border-blue-200 dark:border-blue-800">
            <i class="fas fa-signature text-xs"></i> Aguardando Assinaturas
          </div>
          <button v-else-if="isAdmin && detail?.status === 'approved'" @click="$emit('unlock')"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition">
            <i class="fas fa-lock-open text-xs"></i> Desbloquear
          </button>
        </div>
      </div>

      <!-- Pills de módulo -->
      <div v-if="localModules.length" class="flex overflow-x-auto scrollbar-hide">
        <button v-for="(mod, i) in localModules" :key="mod.id ?? i" @click="activeIdx = i"
          :class="['flex flex-col items-center gap-1 px-8 py-2.5 transition border-r border-gray-100 dark:border-gray-800 flex-shrink-0 relative text-xs font-semibold',
            activeIdx === i ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600']">
          <span class="truncate max-w-[120px]">{{ mod.module_name || `Módulo ${i+1}` }}</span>
          <span class="flex items-center gap-0.5 ml-1 flex-shrink-0">
            <span v-for="(filled, k) in moduleCompleteness(mod)" :key="k"
              :class="['w-1.5 h-1.5 rounded-full', activeIdx===i ? (filled?'bg-white':'bg-white/30') : (filled?'bg-blue-400':'bg-gray-200 dark:bg-gray-700')]">
            </span>
          </span>
          <span v-if="activeIdx === i" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-t"></span>
        </button>
        <div class="flex-1 bg-white dark:bg-gray-900"></div>
      </div>
    </div>

    <!-- ── Área de conteúdo (tela + impressão) ──────────────────────────────── -->
    <div class="print-area">

      <!-- Cabeçalho do documento -->
      <div class="doc-header mb-5">
        <div class="print-accent-bar"></div>
        <div class="doc-header-body">
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div class="min-w-0">
              <p class="doc-eyebrow">Ficha Comercial</p>
              <h1 class="doc-title">{{ detail?.enterprise?.nome ?? '—' }}</h1>
              <div class="flex items-center gap-2 flex-wrap mt-1.5">
                <span class="doc-meta-chip"><i class="fas fa-map-marker-alt text-[10px]"></i> {{ detail?.enterprise?.cidade ?? '—' }}</span>
                <span class="doc-meta-chip"><i class="fas fa-calendar text-[10px]"></i> {{ currentMonthLabel }}</span>
                <!-- No print: mostra módulo ativo; em tela com 1 módulo tb -->
                <span v-if="!isPrinting && activeModule" class="doc-meta-chip">
                  <i class="fas fa-layer-group text-[10px]"></i> {{ activeModule.module_name }}
                </span>
                <span v-if="!isPrinting && stageNameForModule(activeModule)" class="doc-meta-chip">
                  <i class="fas fa-building text-[10px]"></i> {{ stageNameForModule(activeModule) }}
                </span>
                <span v-if="wasRejected && detail?.status === 'draft'"
                  class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                  Reprovada
                </span>
                <span v-else :class="['px-2.5 py-0.5 rounded-full text-xs font-bold', statusBadgePrint(detail?.status)]">
                  {{ STATUS_LABELS[detail?.status] ?? detail?.status }}
                </span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Menin Office</p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{{ formatDateFull(new Date()) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Banner de reprovação -->
      <div v-if="wasRejected && detail?.status === 'draft'"
        class="no-print mb-4 flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
        <i class="fas fa-ban text-lg flex-shrink-0 mt-0.5"></i>
        <div>
          <p class="text-sm font-bold">Autorização reprovada</p>
          <p v-if="rejectionNote" class="text-xs mt-0.5">{{ rejectionNote }}</p>
          <p class="text-xs mt-1 text-red-500 dark:text-red-500">Corrija as informações necessárias e envie novamente para autorização.</p>
        </div>
      </div>

      <!-- Sem módulo -->
      <div v-if="!localModules.length" class="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600 text-center">
        <i class="fas fa-layer-group text-3xl mb-3 opacity-40"></i>
        <p class="text-sm">Nenhum módulo encontrado</p>
      </div>

      <!-- Tela: módulo ativo. Impressão: todos os módulos -->
      <template v-else>
        <!-- Loop de módulos: 1 item em tela (activeModule), todos no print -->
        <div v-for="(mod, idx) in displayModules" :key="mod.id ?? idx">
          <!-- Separador de módulo no print (só quando mais de 1) -->
          <div v-if="isPrinting && localModules.length > 1" class="print-module-sep">
            <span>{{ mod.module_name || `Módulo ${idx + 1}` }}</span>
          </div>

          <!-- ── KPIs ─────────────────────────────────────────────────────── -->
          <div class="kpi-row mb-5">
            <!-- Unidades -->
            <div class="kpi-card">
              <span class="kpi-label">Unidades</span>
              <span class="kpi-value" :class="mod.total_units == null ? 'kpi-empty' : ''">
                {{ mod.total_units ?? '—' }}
              </span>
              <span v-if="mod.min_demand != null" class="kpi-sub">mín. {{ mod.min_demand }} demanda</span>
              <span v-else class="kpi-sub kpi-sub-empty">demanda não definida</span>
              <span v-if="mod.unit_snapshot?.capturedAt" class="kpi-sub flex items-center gap-1 mt-0.5 justify-center">
                <i class="fas fa-snowflake text-blue-400 text-[9px]"></i>
                Foto em {{ formatSnapshotDate(mod.unit_snapshot.capturedAt) }}
              </span>
            </div>
            <!-- Faixas MCMV -->
            <template v-for="f in enabledFaixas(mod)" :key="f.faixa">
              <div class="kpi-card">
                <span class="kpi-label">MCMV {{ faixaLabel(f.faixa) }}</span>
                <span class="kpi-value">{{ f.avg_ticket != null ? formatCurrencyShort(f.avg_ticket) : (f.appraisal_value != null ? formatCurrencyShort(f.appraisal_value) : '—') }}</span>
                <span v-if="f.appraisal_ceiling != null" class="kpi-sub">teto {{ formatCurrencyShort(f.appraisal_ceiling) }}</span>
              </div>
            </template>
            <!-- Legado sem faixas -->
            <div v-if="!enabledFaixas(mod).length && mod.appraisal_value != null" class="kpi-card">
              <span class="kpi-label">Avaliação MCMV</span>
              <span class="kpi-value">{{ formatCurrencyShort(mod.appraisal_value) }}</span>
              <span v-if="mod.appraisal_ceiling != null" class="kpi-sub">teto {{ formatCurrencyShort(mod.appraisal_ceiling) }}</span>
            </div>
            <!-- Máx. Entrada -->
            <div class="kpi-card">
              <span class="kpi-label">Máx. Entrada</span>
              <span class="kpi-value" :class="mod.max_entry_value == null ? 'kpi-empty' : ''">
                {{ mod.max_entry_value != null ? formatCurrencyShort(mod.max_entry_value) : '—' }}
              </span>
            </div>
            <!-- Comissão -->
            <div class="kpi-card">
              <span class="kpi-label">Comissão</span>
              <span class="kpi-value" :class="mod.commission_pct == null ? 'kpi-empty' : ''">
                {{ mod.commission_pct != null ? `${parseFloat(mod.commission_pct).toFixed(1)}%` : '—' }}
              </span>
              <span v-if="mod.commission_pct != null" class="kpi-sub">
                {{ mod.commission_source === 'cv' ? 'via CV' : 'manual' }}
              </span>
            </div>
            <!-- Prazo Entrega -->
            <div class="kpi-card">
              <span class="kpi-label">Prazo Entrega</span>
              <span class="kpi-value" :class="mod.delivery_deadline_months == null ? 'kpi-empty' : ''">
                {{ mod.delivery_deadline_months ?? '—' }}
              </span>
              <span v-if="mod.delivery_deadline_months != null" class="kpi-sub">meses</span>
            </div>
          </div>

          <!-- ── Produto ──────────────────────────────────────────────────── -->
          <div class="info-card mb-4">
            <div class="info-card-header">
              <i class="fas fa-building text-blue-500"></i>
              Produto — {{ mod.module_name || '—' }}
            </div>
            <div class="info-card-body">
              <div class="field-grid">
                <div class="field-item">
                  <span class="field-label">Etapa do CV</span>
                  <span class="field-value" :class="!stageNameForModule(mod) ? 'field-empty' : ''">
                    {{ stageNameForModule(mod) || 'Módulo avulso' }}
                  </span>
                </div>
                <div class="field-item">
                  <span class="field-label">Total de Unidades</span>
                  <span class="field-value" :class="mod.total_units == null ? 'field-empty' : ''">
                    {{ mod.total_units ?? 'Não informado' }}
                  </span>
                </div>
                <div class="field-item">
                  <span class="field-label">Demanda Mínima</span>
                  <span class="field-value" :class="mod.min_demand == null ? 'field-empty' : ''">
                    {{ mod.min_demand != null ? `${mod.min_demand} unid. (≥ 20%)` : 'Não informado' }}
                  </span>
                </div>
              </div>
              <div v-if="mod.min_demand_note" class="note-block mt-3">
                <span class="note-label">Obs. Demanda</span>
                <p>{{ mod.min_demand_note }}</p>
              </div>
            </div>
          </div>

          <!-- ── Negociação + Tabelas de Preço ───────────────────────────── -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

            <!-- Negociação — sempre visível -->
            <div class="info-card">
              <div class="info-card-header">
                <i class="fas fa-handshake text-blue-500"></i>
                Condições de Negociação
              </div>
              <div class="info-card-body">
                <div class="field-grid">
                  <div class="field-item">
                    <span class="field-label">Parcela RP</span>
                    <span class="field-value accent" :class="mod.rp_installment_value == null ? 'field-empty' : ''">
                      {{ mod.rp_installment_value != null ? formatCurrency(mod.rp_installment_value) : 'Não informado' }}
                    </span>
                  </div>
                  <div class="field-item">
                    <span class="field-label">Parcela Ato</span>
                    <span class="field-value accent" :class="mod.act_installment_value == null ? 'field-empty' : ''">
                      {{ mod.act_installment_value != null ? formatCurrency(mod.act_installment_value) : 'Não informado' }}
                    </span>
                  </div>
                  <div class="field-item">
                    <span class="field-label">Parcela Mínima</span>
                    <span class="field-value" :class="mod.min_installment_value == null ? 'field-empty' : ''">
                      {{ mod.min_installment_value != null ? formatCurrency(mod.min_installment_value) : 'Não informado' }}
                    </span>
                  </div>
                  <div class="field-item">
                    <span class="field-label">Máx. Parcelas</span>
                    <span class="field-value" :class="mod.max_installments == null ? 'field-empty' : ''">
                      {{ mod.max_installments != null ? `${mod.max_installments}x` : 'Não informado' }}
                    </span>
                  </div>
                  <div class="field-item">
                    <span class="field-label">Até Habite-se</span>
                    <span class="field-value" :class="!mod.installment_until_habite_se ? 'field-empty' : ''">
                      {{ mod.installment_until_habite_se || 'Não informado' }}
                    </span>
                  </div>
                  <div class="field-item">
                    <span class="field-label">Pós Habite-se</span>
                    <span class="field-value" :class="!mod.installment_post_habite_se ? 'field-empty' : ''">
                      {{ mod.installment_post_habite_se || 'Não informado' }}
                    </span>
                  </div>
                </div>

                <!-- Subsídio estadual -->
                <div v-if="mod.has_state_subsidy" class="subsidy-badge mt-3">
                  <i class="fas fa-hand-holding-usd text-xs"></i>
                  <span class="font-semibold">Subsídio Estadual</span>
                  <span v-if="modSubsidyLabel(mod)" class="opacity-80">— {{ modSubsidyLabel(mod) }}</span>
                  <span v-if="mod.state_subsidy_program" class="opacity-80">· {{ mod.state_subsidy_program }}</span>
                </div>
                <div v-else class="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-600 border border-gray-100 dark:border-gray-800">
                  <i class="fas fa-hand-holding-usd text-xs"></i>
                  Sem subsídio estadual
                </div>

                <div v-if="mod.rp_rule" class="note-block mt-3">
                  <span class="note-label">Regra RP</span>
                  <p>{{ mod.rp_rule }}</p>
                </div>
                <div v-if="mod.state_subsidy_rules" class="note-block mt-2">
                  <span class="note-label">Regras do Subsídio</span>
                  <p>{{ mod.state_subsidy_rules }}</p>
                </div>
                <div v-if="mod.state_subsidy_conditions" class="note-block mt-2">
                  <span class="note-label">Condições do Subsídio</span>
                  <p>{{ mod.state_subsidy_conditions }}</p>
                </div>
              </div>
            </div>

            <!-- Tabelas de Preço — sempre visível -->
            <div class="info-card">
              <div class="info-card-header">
                <i class="fas fa-tag text-blue-500"></i>
                Tabelas de Preço
              </div>
              <div class="info-card-body space-y-3">
                <!-- CV -->
                <div v-if="modSelectedPriceTables(mod).length">
                  <p class="section-sublabel">Tabelas do CV</p>
                  <div class="space-y-2">
                    <div v-for="t in modSelectedPriceTables(mod)" :key="t.idtabela"
                      class="price-table-row flex-col items-start gap-1.5">
                      <div class="flex items-center justify-between w-full gap-2">
                        <div class="flex items-center gap-2 min-w-0">
                          <i class="fas fa-table text-blue-400 text-xs flex-shrink-0"></i>
                          <span class="text-sm text-gray-800 dark:text-gray-200 font-medium truncate">{{ t.nome }}</span>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                          <span v-if="t.vigente" class="badge-green">vigente</span>
                          <span class="text-xs text-gray-400">{{ formatDate(t.data_vigencia_de) }} → {{ formatDate(t.data_vigencia_ate) }}</span>
                        </div>
                      </div>
                      <div v-if="t.unit_count > 0" class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap pl-5">
                        <span><strong class="text-gray-700 dark:text-gray-300">{{ t.unit_count }}</strong> unidades</span>
                        <span v-if="t.price_min != null">De <strong>{{ formatCurrencyShort(t.price_min) }}</strong> até <strong>{{ formatCurrencyShort(t.price_max) }}</strong></span>
                        <span v-if="t.price_avg">· Média <strong>{{ formatCurrencyShort(t.price_avg) }}</strong></span>
                        <span v-if="t.forma" class="text-gray-400">· {{ t.forma }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-info-row">
                  <i class="fas fa-table text-gray-300 dark:text-gray-600 text-sm"></i>
                  <span>Nenhuma tabela do CV selecionada</span>
                </div>

                <!-- Manuais -->
                <div v-if="(mod.manual_price_tables ?? []).length">
                  <p class="section-sublabel">Manuais</p>
                  <div class="space-y-2">
                    <div v-for="(mt, mi) in mod.manual_price_tables" :key="mi" class="manual-table-card">
                      <div class="flex items-center justify-between gap-2 flex-wrap">
                        <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">{{ mt.name || '(sem nome)' }}</span>
                        <span v-if="mt.validity_from || mt.validity_to" class="text-xs text-gray-400">
                          {{ mt.validity_from ? formatDate(mt.validity_from) : '—' }} → {{ mt.validity_to ? formatDate(mt.validity_to) : '—' }}
                        </span>
                      </div>
                      <p v-if="mt.note" class="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{{ mt.note }}</p>
                      <div v-if="mt.units?.length" class="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                        <span><strong class="text-gray-700 dark:text-gray-300">{{ mt.units.filter(u=>u.value!=null).length }}</strong>/{{ mt.units.length }} unidades</span>
                        <span v-if="unitMin(mt.units) != null">Mín: <strong>{{ formatCurrency(unitMin(mt.units)) }}</strong></span>
                        <span v-if="unitMax(mt.units) != null">Máx: <strong>{{ formatCurrency(unitMax(mt.units)) }}</strong></span>
                        <span v-if="unitAvg(mt.units) != null">Média: <strong>{{ formatCurrency(unitAvg(mt.units)) }}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="mod.price_premise_note" class="note-block">
                  <span class="note-label">Premissa de Preço</span>
                  <p>{{ mod.price_premise_note }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Operacional — sempre visível ───────────────────────────── -->
          <div class="info-card mb-4">
            <div class="info-card-header">
              <i class="fas fa-gears text-blue-500"></i>
              Operacional
            </div>
            <div class="info-card-body">
              <div class="op-grid">

                <!-- Gestor -->
                <div class="op-item">
                  <i class="fas fa-user-tie op-icon"></i>
                  <div>
                    <span class="field-label">Gestor Responsável</span>
                    <span class="field-value" :class="!modManagerLabel(mod) ? 'field-empty' : ''">
                      {{ modManagerLabel(mod) || 'Não informado' }}
                    </span>
                  </div>
                </div>

                <!-- Prazo -->
                <div class="op-item">
                  <i class="fas fa-calendar-check op-icon"></i>
                  <div>
                    <span class="field-label">Prazo de Entrega</span>
                    <span class="field-value" :class="mod.delivery_deadline_months == null ? 'field-empty' : ''">
                      <template v-if="mod.delivery_deadline_months != null">
                        {{ mod.delivery_deadline_months }} meses
                        <span v-if="mod.delivery_deadline_note" class="text-gray-400"> · {{ mod.delivery_deadline_note }}</span>
                      </template>
                      <template v-else>Não informado</template>
                    </span>
                  </div>
                </div>

                <!-- Registro do contrato -->
                <div class="op-item">
                  <i class="fas fa-file-signature op-icon"></i>
                  <div>
                    <span class="field-label">Registro do Contrato</span>
                    <span class="field-value" :class="!mod.contract_registration_by ? 'field-empty' : ''">
                      {{ mod.contract_registration_by ? contractLabel(mod) : 'Não informado' }}
                    </span>
                  </div>
                </div>

                <!-- CCA -->
                <div v-if="mod.contract_registration_by === 'cca'" class="op-item">
                  <i class="fas fa-building-columns op-icon"></i>
                  <div>
                    <span class="field-label">CCA</span>
                    <span class="field-value" :class="!mod.cca_company_name ? 'field-empty' : ''">
                      {{ mod.cca_company_name || 'Nome não informado' }}
                      <span v-if="mod.cca_cost != null" class="text-gray-400"> · {{ formatCurrency(mod.cca_cost) }}</span>
                      <span v-if="mod.cca_charges_company" class="text-xs ml-1 text-blue-500">(cobra da empresa)</span>
                    </span>
                  </div>
                </div>

                <!-- Correspondente -->
                <div class="op-item">
                  <i class="fas fa-handshake op-icon"></i>
                  <div>
                    <span class="field-label">Correspondente Bancário</span>
                    <span class="field-value" :class="!modCorrespondent(mod) ? 'field-empty' : ''">
                      <template v-if="modCorrespondent(mod)">
                        {{ modCorrespondent(mod).nome }}
                        <span v-if="modCorrespondent(mod).email" class="text-gray-400"> · {{ modCorrespondent(mod).email }}</span>
                      </template>
                      <template v-else>Não informado</template>
                    </span>
                  </div>
                </div>

                <!-- Certificação digital -->
                <div class="op-item">
                  <i class="fas fa-shield-check op-icon"></i>
                  <div>
                    <span class="field-label">Certificação Digital</span>
                    <span class="field-value" :class="!mod.has_digital_cert ? 'field-empty' : ''">
                      <template v-if="mod.has_digital_cert">
                        {{ mod.digital_cert_provider || 'Sim' }}
                        <span v-if="mod.digital_cert_contact" class="text-gray-400"> · {{ mod.digital_cert_contact }}</span>
                      </template>
                      <template v-else>Não utiliza</template>
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="mod.notes" class="note-block mt-4">
                <span class="note-label">Observações</span>
                <p>{{ mod.notes }}</p>
              </div>
            </div>
          </div>

          <!-- ── Campanhas ───────────────────────────────────────────────── -->
          <div class="info-card mb-4">
            <div class="info-card-header">
              <i class="fas fa-bullhorn text-blue-500"></i>
              Campanhas
            </div>
            <div class="info-card-body">
              <div v-if="modActiveCampaigns(mod).length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div v-for="(camp, ci) in modActiveCampaigns(mod)" :key="camp.id ?? ci" class="campaign-card">
                  <p class="text-sm font-bold text-gray-900 dark:text-white">{{ camp.title || `Campanha ${ci + 1}` }}</p>
                  <p v-if="camp.description" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ camp.description }}</p>
                  <div class="flex items-center gap-3 mt-2 flex-wrap">
                    <span v-if="camp.value" class="campaign-value">{{ formatCurrency(camp.value) }}</span>
                    <span v-if="camp.start_date" class="text-xs text-gray-400">
                      {{ formatDate(camp.start_date) }}{{ camp.end_date ? ` → ${formatDate(camp.end_date)}` : '' }}
                    </span>
                  </div>
                  <p v-if="camp.rules" class="text-xs text-gray-500 dark:text-gray-400 mt-2 italic border-t border-gray-100 dark:border-gray-800 pt-2">{{ camp.rules }}</p>
                </div>
              </div>
              <div v-else class="empty-info-row">
                <i class="fas fa-bullhorn text-gray-300 dark:text-gray-600 text-sm"></i>
                <span>Nenhuma campanha ativa neste módulo</span>
              </div>
            </div>
          </div>

          <!-- ── Avaliação MCMV ──────────────────────────────────────────── -->
          <div class="info-card mb-4">
            <div class="info-card-header">
              <i class="fas fa-house-chimney text-blue-500"></i>
              Avaliação MCMV
            </div>
            <div class="info-card-body space-y-3">
              <div v-if="enabledFaixas(mod).length">
                <p class="section-sublabel">Faixas Selecionadas</p>
                <div class="field-grid">
                  <template v-for="f in enabledFaixas(mod)" :key="f.faixa">
                    <div class="field-item col-span-1">
                      <span class="field-label">{{ faixaLabel(f.faixa) }}</span>
                      <div class="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                        <span v-if="f.appraisal_value != null" class="text-xs text-gray-700 dark:text-gray-300">
                          Avaliação: <strong>{{ formatCurrency(f.appraisal_value) }}</strong>
                        </span>
                        <span v-if="f.appraisal_ceiling != null" class="text-xs text-gray-500">
                          Teto: <strong>{{ formatCurrency(f.appraisal_ceiling) }}</strong>
                        </span>
                        <span v-if="f.avg_ticket != null" class="text-xs text-blue-600 dark:text-blue-400">
                          Ticket Médio: <strong>{{ formatCurrency(f.avg_ticket) }}</strong>
                        </span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
              <div v-else class="empty-info-row">
                <i class="fas fa-house-chimney text-gray-300 dark:text-gray-600 text-sm"></i>
                <span>Nenhuma faixa MCMV configurada</span>
              </div>

              <div v-if="mod.appraisal_note" class="note-block">
                <span class="note-label">Obs. Avaliação</span>
                <p>{{ mod.appraisal_note }}</p>
              </div>
            </div>
          </div>

          <!-- ── Unidades (snapshot) ─────────────────────────────────────── -->
          <div v-if="snapshotBlocos(mod).length" class="info-card mb-4">
            <div class="info-card-header">
              <i class="fas fa-home text-blue-500"></i>
              Unidades
              <span class="ml-auto flex items-center gap-1.5 text-[10px] font-normal text-gray-400 normal-case tracking-normal">
                <i class="fas fa-snowflake text-blue-400 text-[9px]"></i>
                Congelado em {{ formatSnapshotDate(mod.unit_snapshot.capturedAt) }}
              </span>
            </div>
            <div class="info-card-body">
              <div class="flex flex-wrap gap-3 mb-4 text-xs">
                <span class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-green-400 inline-block"></span>
                  <strong>{{ snapshotStats(mod).disp }}</strong> Disponíveis
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span>
                  <strong>{{ snapshotStats(mod).res }}</strong> Reservadas
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>
                  <strong>{{ snapshotStats(mod).vend }}</strong> Vendidas
                </span>
                <span v-if="snapshotStats(mod).bloq > 0" class="flex items-center gap-1.5">
                  <span class="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block"></span>
                  <strong>{{ snapshotStats(mod).bloq }}</strong> Bloqueadas
                </span>
                <span class="text-gray-400">· Total: {{ snapshotStats(mod).total }}</span>
              </div>
              <div class="space-y-4">
                <div v-for="bloco in snapshotBlocos(mod)" :key="bloco.idbloco">
                  <p class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    {{ bloco.nome }}
                    <span class="font-normal normal-case">· {{ (bloco.unidades ?? []).length }} unid.</span>
                  </p>
                  <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1">
                    <div v-for="u in (bloco.unidades ?? [])" :key="u.idunidade"
                      :class="[
                        'rounded px-1.5 py-1 text-center border text-[10px] leading-tight',
                        u.situacao_mapa_disponibilidade === 1 ? 'border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800' :
                        u.situacao_mapa_disponibilidade === 2 ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-700' :
                        u.situacao_mapa_disponibilidade === 3 ? 'border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800' :
                        'border-gray-200 bg-gray-50 dark:bg-gray-800/30 dark:border-gray-700'
                      ]">
                      <p class="font-semibold text-gray-800 dark:text-gray-200 truncate">{{ u.nome }}</p>
                      <p v-if="u.valor_total != null" class="text-blue-600 dark:text-blue-400 font-bold">{{ formatCurrencyShort(u.valor_total) }}</p>
                      <p v-if="u.area_privativa" class="text-gray-400">{{ u.area_privativa }}m²</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Separador de módulos no print -->
          <div v-if="isPrinting && idx < displayModules.length - 1" class="print-only" style="page-break-after: always;"></div>
        </div>
      </template>

      <!-- Rodapé — só impresso -->
      <div class="print-only print-footer">
        <div class="flex items-center justify-between text-xs text-gray-400">
          <span>Menin Office — Ficha Comercial Confidencial</span>
          <span>Gerado em {{ formatDateFull(new Date()) }}</span>
        </div>
      </div>
    </div>

    <!-- Rodapé de tela -->
    <p class="no-print text-center text-xs text-gray-400 dark:text-gray-600 mt-4">
      Gerado em {{ formatDateFull(new Date()) }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';

const props = defineProps({
    detail:           { type: Object,  default: null },
    localModules:     { type: Array,   default: () => [] },
    priceTables:      { type: Array,   default: () => [] },
    correspondents:   { type: Array,   default: () => [] },
    officeUsers:      { type: Array,   default: () => [] },
    enterpriseStages: { type: Array,   default: () => [] },
    isAdmin:          { type: Boolean, default: false },
    isApprover:       { type: Boolean, default: false },
    actionLoading:    { type: Boolean, default: false },
    wasRejected:      { type: Boolean, default: false },
    rejectionNote:    { type: String,  default: null },
});

const emit = defineEmits(['navigate-month', 'submit-for-approval', 'unlock', 'cancel-approval']);

const activeIdx = ref(0);
const activeModule = computed(() => props.localModules[activeIdx.value] ?? null);
const isPrinting = ref(false);
const showDocModal = ref(false);

// Tela: mostra apenas módulo ativo. Impressão: todos os módulos.
const displayModules = computed(() =>
    isPrinting.value
        ? props.localModules
        : (activeModule.value ? [activeModule.value] : [])
);

// ── Navegação de meses ────────────────────────────────────────────────────────

const history = computed(() => props.detail?.history ?? []);

const currentHistoryIdx = computed(() =>
    history.value.findIndex(h => String(h.id) === String(props.detail?.id))
);

const prevItem = computed(() =>
    currentHistoryIdx.value < history.value.length - 1
        ? history.value[currentHistoryIdx.value + 1] : null
);

const nextItem = computed(() =>
    currentHistoryIdx.value > 0
        ? history.value[currentHistoryIdx.value - 1] : null
);

const currentHistoryPos = computed(() =>
    history.value.length ? currentHistoryIdx.value + 1 : 1
);

const currentMonthLabel = computed(() => {
    const h = history.value[currentHistoryIdx.value];
    return h ? formatMonth(h.reference_month) : formatMonth(props.detail?.reference_month);
});

function navigatePrev() { if (prevItem.value) emit('navigate-month', prevItem.value.id); }
function navigateNext() { if (nextItem.value) emit('navigate-month', nextItem.value.id); }

// ── Status ────────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
    draft:            'Rascunho',
    pending_approval: 'Em Autorização',
    approved:         'Autorizado',
};

function statusChipClass(s) {
    const map = {
        draft:            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        pending_approval: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        approved:         'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return map[s] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
}

function statusBadgePrint(s) {
    const map = {
        draft:            'bg-amber-100 text-amber-800',
        pending_approval: 'bg-blue-100 text-blue-800',
        approved:         'bg-green-100 text-green-800',
    };
    return map[s] ?? 'bg-gray-100 text-gray-700';
}

// ── Completude ────────────────────────────────────────────────────────────────

function moduleCompleteness(mod) {
    return {
        data:        !!(mod.module_name && mod.total_units),
        prices:      (mod.price_table_ids?.length > 0) || (mod.manual_price_tables?.length > 0),
        negotiation: !!(mod.max_entry_value || mod.rp_rule || mod.max_installments),
        campaigns:   (mod.campaigns?.length > 0),
        operational: !!(mod.manager_user_id || mod.manager_name || mod.correspondent_id || mod.contract_registration_by),
    };
}

// ── Helpers de módulo ─────────────────────────────────────────────────────────

function modManagerLabel(mod) {
    if (mod.manager_mode === 'manual' || (!mod.manager_user_id && mod.manager_name)) {
        const parts = [mod.manager_name, mod.manager_email, mod.manager_phone].filter(Boolean);
        return parts.join(' · ') || null;
    }
    const u = props.officeUsers.find(u => u.id === mod.manager_user_id);
    if (!u) return null;
    return u.username + (u.position ? ` — ${u.position}` : '');
}

function modCorrespondent(mod) {
    return props.correspondents.find(c => c.idusuario === mod.correspondent_id) ?? null;
}

function modSubsidyLabel(mod) {
    const map = { ms: 'Mato Grosso do Sul', mt: 'Mato Grosso', pr: 'Paraná', sp: 'São Paulo' };
    const s = mod.state_subsidy_state;
    if (!s) return '';
    if (s === 'custom') return mod.state_subsidy_custom_state || 'Outro Estado';
    return map[s] ?? s.toUpperCase();
}

function modSelectedPriceTables(mod) {
    const ids = mod.price_table_ids ?? [];
    return props.priceTables.filter(t => ids.includes(t.idtabela));
}

function modActiveCampaigns(mod) {
    return (mod.campaigns ?? []).filter(c => c.is_active !== false);
}

function contractLabel(mod) {
    if (mod.contract_registration_by === 'cca') return `CCA${mod.cca_company_name ? ` — ${mod.cca_company_name}` : ''}`;
    if (mod.contract_registration_by === 'menin') {
        const u = props.officeUsers.find(u => u.id === mod.contract_registered_by_user_id);
        if (u) return `Menin — ${u.username}`;
        if (mod.outros_contact_name) return `Menin — ${mod.outros_contact_name}`;
        return 'Menin (interno)';
    }
    if (mod.contract_registration_by === 'outros')
        return `Terceiros${mod.outros_contact_name ? ` — ${mod.outros_contact_name}` : ''}`;
    return mod.contract_registration_by ?? '—';
}

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

function formatSnapshotDate(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Etapa do CV ───────────────────────────────────────────────────────────────

function stageNameForModule(mod) {
    if (!mod?.idetapa) return null;
    return props.enterpriseStages.find(s => s.idetapa === mod.idetapa)?.nome
        ?? props.detail?.stages?.find(s => s.idetapa === mod.idetapa)?.nome
        ?? `Etapa #${mod.idetapa}`;
}

// ── Snapshot de unidades ──────────────────────────────────────────────────────

function snapshotBlocos(mod) {
    return mod?.unit_snapshot?.data ?? [];
}

function snapshotStats(mod) {
    const blocos = snapshotBlocos(mod);
    let disp = 0, res = 0, vend = 0, bloq = 0, total = 0;
    for (const b of blocos) {
        for (const u of (b.unidades ?? [])) {
            total++;
            const s = u.situacao_mapa_disponibilidade;
            if (s === 1) disp++;
            else if (s === 2) res++;
            else if (s === 3) vend++;
            else bloq++;
        }
    }
    return { disp, res, vend, bloq, total };
}

// ── Faixas MCMV ───────────────────────────────────────────────────────────────

function enabledFaixas(mod) {
    return (mod?.appraisal_faixas ?? []).filter(f => f.enabled);
}

function faixaLabel(faixa) {
    return { 1: 'Faixa 1', 2: 'Faixa 2', 3: 'Faixa 3', 4: 'Faixa 4' }[faixa] ?? `Faixa ${faixa}`;
}

// ── Modal de documento ────────────────────────────────────────────────────────

function closeDocModal() {
    showDocModal.value = false;
}

// ── Print ─────────────────────────────────────────────────────────────────────

function printModule() {
    showDocModal.value = false;
    isPrinting.value = true;
    nextTick(() => {
        window.print();
        const handler = () => {
            isPrinting.value = false;
            window.removeEventListener('afterprint', handler);
        };
        window.addEventListener('afterprint', handler);
        // fallback timeout caso afterprint não dispare
        setTimeout(() => { isPrinting.value = false; }, 3000);
    });
}

// ── Formatadores ──────────────────────────────────────────────────────────────

function formatCurrency(val) {
    if (val == null || val === '') return '—';
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCurrencyShort(val) {
    if (val == null) return '—';
    const n = Number(val);
    if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
    return formatCurrency(n);
}

function formatDate(d) {
    if (!d) return '—';
    const [y, m, day] = String(d).split('T')[0].split('-');
    return `${day}/${m}/${y}`;
}

function formatMonth(dateStr) {
    if (!dateStr) return '—';
    const [y, m] = String(dateStr).split('-');
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${months[Number(m) - 1]}/${y}`;
}

function formatDateFull(date) {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
/* ── Cabeçalho do documento ─────────────────────────────────────────────────── */
.doc-header {
    @apply bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden;
}
.doc-header-body { @apply px-6 py-5; }
.doc-eyebrow { @apply text-xs font-bold text-blue-500 uppercase tracking-widest mb-1; }
.doc-title   { @apply text-2xl font-bold text-gray-900 dark:text-white leading-tight; }
.doc-meta-chip {
    @apply inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium
           bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400;
}

/* ── KPIs ───────────────────────────────────────────────────────────────────── */
.kpi-row   { @apply grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3; }
.kpi-card  {
    @apply flex flex-col items-center justify-center p-4 rounded-2xl text-center
           bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-sm;
}
.kpi-label { @apply text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1; }
.kpi-value { @apply text-2xl font-black text-gray-900 dark:text-white leading-none; }
.kpi-value.kpi-empty { @apply text-gray-300 dark:text-gray-600; }
.kpi-sub   { @apply text-xs text-gray-400 dark:text-gray-500 mt-1; }
.kpi-sub-empty { @apply text-gray-300 dark:text-gray-700 italic; }

/* ── Cards de informação ─────────────────────────────────────────────────────── */
.info-card {
    @apply bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden;
}
.info-card-header {
    @apply flex items-center gap-2 px-5 py-3 text-xs font-bold text-gray-500 dark:text-gray-400
           uppercase tracking-wider bg-gray-50/70 dark:bg-gray-800/40
           border-b border-gray-100 dark:border-gray-800;
}
.info-card-body { @apply p-5; }

/* ── Grade de campos ─────────────────────────────────────────────────────────── */
.field-grid { @apply grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3; }
.field-item { @apply flex flex-col; }
.field-label { @apply text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5; }
.field-value { @apply text-sm font-semibold text-gray-800 dark:text-gray-200; }
.field-value.accent { @apply text-blue-600 dark:text-blue-400; }
.field-value.field-empty { @apply text-gray-300 dark:text-gray-600 italic font-normal; }

/* ── Linha vazia de info ─────────────────────────────────────────────────────── */
.empty-info-row {
    @apply flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600 italic py-1;
}

/* ── Subsídio ────────────────────────────────────────────────────────────────── */
.subsidy-badge {
    @apply inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs
           bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400
           border border-emerald-200 dark:border-emerald-800;
}

/* ── Sublabel ────────────────────────────────────────────────────────────────── */
.section-sublabel {
    @apply text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2;
}

/* ── Tabela de preço row ─────────────────────────────────────────────────────── */
.price-table-row {
    @apply flex gap-2 px-3 py-2 rounded-lg
           bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800;
}
.badge-green {
    @apply px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700
           dark:bg-green-900/30 dark:text-green-400;
}
.manual-table-card {
    @apply px-3 py-2.5 rounded-lg border border-orange-100 dark:border-orange-900/30
           bg-orange-50/60 dark:bg-orange-900/10;
}

/* ── Operacional grid ────────────────────────────────────────────────────────── */
.op-grid  { @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4; }
.op-item  { @apply flex items-start gap-3; }
.op-icon  { @apply text-blue-400 text-sm mt-0.5 w-4 flex-shrink-0; }

/* ── Campanhas ───────────────────────────────────────────────────────────────── */
.campaign-card {
    @apply p-4 rounded-xl border border-gray-100 dark:border-gray-800
           bg-gray-50/60 dark:bg-gray-800/20;
}
.campaign-value { @apply text-sm font-bold text-blue-600 dark:text-blue-400; }

/* ── Notas ───────────────────────────────────────────────────────────────────── */
.note-block {
    @apply p-3 rounded-lg bg-gray-50 dark:bg-gray-800/40 border-l-2 border-gray-200 dark:border-gray-700;
}
.note-block p { @apply text-sm text-gray-700 dark:text-gray-300 mt-0.5; }
.note-label   { @apply block text-[10px] font-bold text-gray-400 uppercase tracking-wider; }

/* ── Separador de módulo no print ────────────────────────────────────────────── */
.print-module-sep {
    @apply flex items-center gap-3 mb-5 mt-2;
}
.print-module-sep::before,
.print-module-sep::after {
    content: '';
    @apply flex-1 h-px bg-blue-200 dark:bg-blue-800;
}
.print-module-sep span {
    @apply text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest px-3;
}

/* ── Print-only ──────────────────────────────────────────────────────────────── */
.print-only       { display: none; }
.print-accent-bar { display: none; }

/* ── Modal fade ──────────────────────────────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity .25s; }
.fade-enter-from,   .fade-leave-to     { opacity: 0; }

/* ── Print ───────────────────────────────────────────────────────────────────── */
@media print {
    @page { margin: 12mm 14mm 16mm 14mm; size: A4 portrait; }

    body * { visibility: hidden; }
    .print-area,
    .print-area * { visibility: visible; }
    .no-print { display: none !important; }
    .print-only { display: block !important; }

    .print-area {
        position: absolute;
        left: 0; top: 0;
        width: 100%;
        background: white !important;
        color: black !important;
        padding: 0 !important;
    }

    .print-accent-bar {
        display: block !important;
        height: 5px;
        background: linear-gradient(90deg, #1d4ed8 0%, #3b82f6 60%, #93c5fd 100%);
        width: 100%;
    }

    .doc-header-body { padding: 16px 20px 12px !important; border-bottom: 1px solid #e5e7eb; }
    .doc-title   { font-size: 1.3rem !important; color: #111827 !important; }
    .doc-eyebrow { color: #1d4ed8 !important; }
    .doc-meta-chip {
        background: #f3f4f6 !important; color: #4b5563 !important;
        border-radius: 99px; padding: 2px 7px; font-size: 9px;
    }

    /* KPIs — cabe até 6 por linha */
    .kpi-row {
        grid-template-columns: repeat(6, 1fr) !important;
        gap: 5px !important;
        padding: 8px 20px !important;
    }
    .kpi-card {
        background: #f8fafc !important; border: 1px solid #e2e8f0 !important;
        border-radius: 6px !important; padding: 7px 4px !important;
    }
    .kpi-value { font-size: 1rem !important; color: #1e40af !important; }
    .kpi-value.kpi-empty { color: #d1d5db !important; }
    .kpi-label { color: #6b7280 !important; font-size: 8px !important; }
    .kpi-sub   { color: #9ca3af !important; font-size: 8px !important; }
    .kpi-sub-empty { color: #e5e7eb !important; }

    /* Cards */
    .info-card {
        border: 1px solid #e5e7eb !important; border-radius: 6px !important;
        margin: 0 20px 8px !important;
        page-break-inside: avoid; break-inside: avoid;
        background: white !important;
    }
    .info-card-header {
        background: #f8fafc !important; color: #374151 !important;
        border-bottom: 1px solid #e5e7eb !important;
        padding: 5px 14px !important; font-size: 8px !important; letter-spacing: 0.06em;
    }
    .info-card-body { padding: 9px 14px !important; }

    .field-label { color: #6b7280 !important; font-size: 8px !important; }
    .field-value { color: #111827 !important; font-size: 10px !important; }
    .field-value.accent { color: #1d4ed8 !important; }
    .field-value.field-empty { color: #d1d5db !important; font-style: italic; }

    .empty-info-row { color: #d1d5db !important; font-size: 9px !important; }

    /* Layout */
    .print-area > .kpi-row { margin: 0; }
    .print-area > .grid    { margin: 0 20px 8px; gap: 8px; }
    .print-area > .info-card { margin: 0 20px 8px; }

    .price-table-row { background: #f9fafb !important; border-color: #e5e7eb !important; }
    .manual-table-card { background: #fff7ed !important; border-color: #fed7aa !important; }
    .campaign-card { background: #f9fafb !important; border-color: #e5e7eb !important; }
    .campaign-value { color: #1d4ed8 !important; }
    .note-block { background: #f9fafb !important; border-color: #d1d5db !important; }
    .note-block p { color: #374151 !important; font-size: 10px !important; }
    .note-label { color: #6b7280 !important; }
    .subsidy-badge { background: #d1fae5 !important; color: #065f46 !important; border-color: #6ee7b7 !important; }
    .badge-green   { background: #d1fae5 !important; color: #065f46 !important; }
    .op-icon { color: #1d4ed8 !important; }

    .print-area * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    /* Unidades */
    .border-green-200  { border-color: #bbf7d0 !important; background: #f0fdf4 !important; }
    .border-yellow-200 { border-color: #fef08a !important; background: #fefce8 !important; }
    .border-red-200    { border-color: #fecaca !important; background: #fef2f2 !important; }
    .text-blue-600     { color: #2563eb !important; }

    .info-card-body .grid-cols-3,
    .info-card-body .grid-cols-4,
    .info-card-body .grid-cols-6,
    .info-card-body .grid-cols-8 {
        grid-template-columns: repeat(8, minmax(0, 1fr)) !important;
        gap: 3px !important;
    }

    /* Separador de módulos */
    .print-module-sep {
        margin: 10px 20px 6px !important;
    }
    .print-module-sep span {
        color: #1d4ed8 !important; font-size: 9px !important;
    }

    /* Rodapé fixo na impressão */
    .print-footer {
        position: fixed; bottom: 0; left: 0; right: 0;
        padding: 5px 20px;
        border-top: 1px solid #e5e7eb;
        background: white;
        font-size: 8px !important;
    }
}
</style>
