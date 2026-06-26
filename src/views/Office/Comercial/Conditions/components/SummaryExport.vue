<template>
  <div class="summary-root">

    <!-- ── Modal: Visualizar documento (aprovadores) ──────────────────────────── -->
    <transition name="fade">
      <div
        v-if="showDocModal"
        class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8 px-4"
        @click.self="closeDocModal"
      >
        <div class="bg-surface-raised rounded-2xl shadow-2xl w-full max-w-4xl">
          <!-- Header fixo da modal -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-line sticky top-0 bg-surface-raised rounded-t-2xl z-10">
            <div class="flex items-center gap-2">
              <i class="fas fa-file-contract text-blue-500"></i>
              <span class="text-sm font-bold text-ink">
                Ficha Comercial — {{ detail?.enterprise?.nome }}
                <span class="ml-2 text-xs font-normal text-gray-400 dark:text-slate-500">{{ currentMonthLabel }}</span>
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button @click="printModule"
                class="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition">
                <i class="fas fa-file-pdf text-xs"></i> Exportar PDF
              </button>
              <button @click="closeDocModal"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                <i class="fas fa-times text-sm"></i>
              </button>
            </div>
          </div>
          <!-- Módulos empilhados: usa mesma lógica de renderização do template principal -->
          <div class="p-6 space-y-6">
            <div v-for="(mod, idx) in localModules" :key="mod.id ?? idx">
              <!-- Separador entre módulos -->
              <div v-if="localModules.length > 1" class="flex items-center gap-3 mb-5" :class="idx > 0 ? 'mt-4' : ''">
                <div class="h-px flex-1 bg-accent-soft"></div>
                <span class="text-xs font-bold text-blue-500 uppercase tracking-widest px-3">
                  {{ mod.module_name || `Módulo ${idx + 1}` }}
                </span>
                <div class="h-px flex-1 bg-accent-soft"></div>
              </div>
              <!-- KPIs do módulo -->
              <div class="kpi-row compact mb-4">
                <div class="kpi-card">
                  <span class="kpi-label">Unidades</span>
                  <span class="kpi-value" :class="mod.total_units == null ? 'kpi-empty' : ''">{{ mod.total_units ?? '—' }}</span>
                </div> 
                <div class="kpi-card">
                  <span class="kpi-label">Comissão</span>
                  <span class="kpi-value" :class="mod.commission_pct == null ? 'kpi-empty' : ''">{{ mod.commission_pct != null ? `${parseFloat(mod.commission_pct).toFixed(1)}%` : '—' }}</span>
                </div> 
                <div class="kpi-card">
                  <span class="kpi-label">Parc. RP</span>
                  <span class="kpi-value text-base" :class="mod.rp_installment_value == null ? 'kpi-empty' : ''">{{ mod.rp_installment_value != null ? formatCurrencyShort(mod.rp_installment_value) : '—' }}</span>
                </div>
              </div>
              <!-- Campos essenciais em dois cards lado a lado -->
              <div class="responsive-card-row mb-4">
                <!-- Negociação resumida -->
                <div class="info-card">
                  <div class="info-card-header"><i class="fas fa-handshake text-blue-500"></i> Negociação</div>
                  <div class="info-card-body">
                    <div class="field-grid">
                      <div class="field-item"><span class="field-label">Parcela mín RP</span><span class="field-value accent" :class="mod.rp_installment_value == null ? 'field-empty' : ''">{{ mod.rp_installment_value != null ? formatCurrency(mod.rp_installment_value) : 'Não informado' }}</span></div>
                      <div class="field-item"><span class="field-label">Parcela mín Ato</span><span class="field-value accent" :class="mod.act_installment_value == null ? 'field-empty' : ''">{{ mod.act_installment_value != null ? formatCurrency(mod.act_installment_value) : 'Não informado' }}</span></div>
                      <div class="field-item"><span class="field-label">Máx. Entrada</span><span class="field-value" :class="mod.max_entry_value == null ? 'field-empty' : ''">{{ mod.max_entry_value != null ? `${parseFloat(mod.max_entry_value).toFixed(0)}%` : 'Não informado' }}</span></div>
                      <div class="field-item"><span class="field-label">Máximo Parcelas RP</span><span class="field-value" :class="mod.max_installments == null ? 'field-empty' : ''">{{ mod.max_installments != null ? `${mod.max_installments}x` : 'Não informado' }}</span></div>
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
              <div v-if="modSelectedPriceTables(mod).length || (mod.manual_price_tables ?? []).length" class="info-card">
                <div class="info-card-header"><i class="fas fa-tag text-blue-500"></i> Tabelas de Preço</div>
                <div class="info-card-body space-y-2">
                  <div v-for="t in modSelectedPriceTables(mod)" :key="t.idtabela" class="price-table-row flex-col items-start gap-1">
                    <div class="flex items-center justify-between w-full gap-2">
                      <span class="text-sm font-medium text-ink truncate">{{ t.nome }}</span>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <span v-if="t.vigente" class="badge-green">vigente</span>
                        <span class="text-xs text-gray-400 dark:text-slate-500">{{ formatDate(t.data_vigencia_de) }} → {{ formatDate(t.data_vigencia_ate) }}</span>
                      </div>
                    </div>
                    <div v-if="t.unit_count > 0" class="text-xs text-gray-500 dark:text-slate-400 flex gap-3 pl-0 flex-wrap">
                      <span><strong>{{ t.unit_count }}</strong> unidades</span>
                      <span v-if="t.price_min != null">{{ formatCurrencyShort(t.price_min) }} — {{ formatCurrencyShort(t.price_max) }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Campanhas ativas -->
              <div v-if="modActiveCampaigns(mod).length" class="info-card mb-4">
                <div class="info-card-header"><i class="fas fa-bullhorn text-blue-500"></i> Campanhas Ativas</div>
                <div class="info-card-body campaign-row">
                  <div v-for="(camp, ci) in modActiveCampaigns(mod)" :key="camp.id ?? ci" class="campaign-card">
                    <p class="text-sm font-bold text-ink">{{ camp.title }}</p>
                    <p v-if="camp.description" class="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{{ camp.description }}</p>
                    <div class="flex gap-3 mt-1 flex-wrap">
                      <span v-if="camp.value" class="campaign-value">{{ formatCurrency(camp.value) }}</span>
                      <span v-if="camp.start_date" class="text-xs text-gray-400 dark:text-slate-500">{{ formatDate(camp.start_date) }}{{ camp.end_date ? ` → ${formatDate(camp.end_date)}` : '' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ── Controles (não imprime) — escondido no novo layout (ações vão p/ a lateral) ── -->
    <div v-if="!hideChrome" class="no-print bg-surface-raised rounded-2xl border border-line shadow-sm overflow-hidden mb-5">

      <!-- Barra superior: mês + ações -->
      <div class="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-slate-50 to-blue-50/40 dark:from-gray-800/60 dark:to-blue-950/20 border-b border-line flex-wrap">
        <div v-if="!hideChrome" class="flex items-center gap-2">
          <button @click="navigatePrev" :disabled="!prevItem"
            :class="['w-7 h-7 flex items-center justify-center rounded-lg transition text-xs',
              prevItem ? 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 shadow-sm border border-line'
                       : 'text-ink-subtle cursor-not-allowed']">
            <i class="fas fa-chevron-left"></i>
          </button>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500 dark:text-slate-400 font-medium">Ref:</span>
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
              nextItem ? 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 shadow-sm border border-line'
                       : 'text-ink-subtle cursor-not-allowed']">
            <i class="fas fa-chevron-right"></i>
          </button>
          <span v-if="history.length > 1" class="text-xs text-ink-subtle">{{ currentHistoryPos }}/{{ history.length }}</span>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Ver documento (só aprovadores, quando em autorização) -->
          <button v-if="isApprover && detail?.status === 'pending_approval'" @click="showDocModal = true"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-accent-hover transition">
            <i class="fas fa-file-contract text-xs"></i> Ver Documento
          </button>

          <button @click="printModule"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition">
            <i class="fas fa-file-pdf text-xs"></i> Exportar PDF
          </button>

          <!-- Ações de workflow (conforme permissão) — no novo layout vêm do header do Detail -->
          <template v-if="!hideChrome">
            <button v-if="canEdit && detail?.status === 'draft'" @click="$emit('submit-for-approval')" :disabled="actionLoading"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
              <i class="fas fa-paper-plane text-xs"></i> Enviar para Autorização
            </button>
            <button v-if="canAuthorize && detail?.status === 'pending_approval'" @click="$emit('authorize')" :disabled="actionLoading"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition">
              <i class="fas fa-circle-check text-xs"></i> Autorizar
            </button>
            <button v-if="(canEdit || canAuthorize) && detail?.status === 'pending_approval'" @click="$emit('cancel-approval')"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 transition">
              <i class="fas fa-ban text-xs"></i> Cancelar Autorização
            </button>
            <div v-if="!canEdit && !canAuthorize && detail?.status === 'pending_approval'"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-accent-soft text-accent text-xs font-semibold rounded-lg border border-accent/30">
              <i class="fas fa-clock text-xs"></i> Aguardando autorização
            </div>
            <button v-if="canAuthorize && detail?.status === 'approved'" @click="$emit('unlock')"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition">
              <i class="fas fa-lock-open text-xs"></i> Desbloquear
            </button>
          </template>
        </div>
      </div>

      <!-- Pills de módulo (no novo layout, a seleção vem do índice flutuante) -->
      <div v-if="localModules.length && !hideChrome" class="flex overflow-x-auto scrollbar-hide">
        <button v-for="(mod, i) in localModules" :key="mod.id ?? i" @click="activeIdx = i"
          :class="['flex flex-col items-center gap-1 px-8 py-2.5 transition border-r border-line flex-shrink-0 relative text-xs font-semibold',
            activeIdx === i ? 'bg-blue-600 text-white' : 'bg-surface-raised text-ink-muted hover:bg-accent-soft hover:text-blue-600']">
          <span class="truncate max-w-[120px]">{{ mod.module_name || `Módulo ${i+1}` }}</span>
          <span class="flex items-center gap-0.5 ml-1 flex-shrink-0">
            <span v-for="(filled, k) in moduleCompleteness(mod)" :key="k"
              :class="['w-1.5 h-1.5 rounded-full', activeIdx===i ? (filled?'bg-white':'bg-white/30') : (filled?'bg-blue-400':'bg-surface-sunken')]">
            </span>
          </span>
          <span v-if="activeIdx === i" class="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-t"></span>
        </button>
        <div class="flex-1 bg-surface-raised"></div>
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
              <p class="text-xs font-bold text-ink-muted uppercase tracking-wider">Menin Office</p>
              <p class="text-xs text-ink-subtle mt-0.5">{{ formatDateFull(new Date()) }}</p>
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
      <div v-if="!localModules.length" class="flex flex-col items-center justify-center py-16 text-ink-subtle text-center">
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
              <span v-if="mod.unit_snapshot?.capturedAt" class="kpi-sub flex items-center gap-1 mt-0.5 justify-center">
                <i class="fas fa-snowflake text-blue-400 text-[9px]"></i>
                Foto em {{ formatSnapshotDate(mod.unit_snapshot.capturedAt) }}
              </span>
            </div>
            <!-- Disponibilidade (do snapshot) -->
            <div class="kpi-card">
              <span class="kpi-label">Disponíveis</span>
              <span class="kpi-value" :class="!mod.unit_snapshot?.data?.length ? 'kpi-empty' : ''">
                {{ mod.unit_snapshot?.data?.length ? snapshotStats(mod).disp : '—' }}
              </span>
              <span class="kpi-sub">unidades</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Vendidas</span>
              <span class="kpi-value" :class="!mod.unit_snapshot?.data?.length ? 'kpi-empty' : ''">
                {{ mod.unit_snapshot?.data?.length ? snapshotStats(mod).vend : '—' }}
              </span>
              <span class="kpi-sub">unidades</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">% Vendido</span>
              <span class="kpi-value" :class="!mod.unit_snapshot?.data?.length ? 'kpi-empty' : ''">
                {{ mod.unit_snapshot?.data?.length && snapshotStats(mod).total > 0 ? ((snapshotStats(mod).vend / snapshotStats(mod).total) * 100).toFixed(1) + '%' : '—' }}
              </span>
              <span class="kpi-sub">do total</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-label">Reservadas</span>
              <span class="kpi-value" :class="!mod.unit_snapshot?.data?.length ? 'kpi-empty' : ''">
                {{ mod.unit_snapshot?.data?.length ? snapshotStats(mod).res : '—' }}
              </span>
              <span class="kpi-sub">unidades</span>
            </div>
            <div v-if="mod.unit_snapshot?.data?.length && snapshotStats(mod).bloq > 0" class="kpi-card">
              <span class="kpi-label">Bloqueadas</span>
              <span class="kpi-value">{{ snapshotStats(mod).bloq }}</span>
              <span class="kpi-sub">unidades</span>
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
                <div class="field-item">
                  <span class="field-label">Comissão</span>
                  <span class="field-value" :class="mod.commission_pct == null ? 'field-empty' : ''">
                    {{ mod.commission_pct != null ? `${parseFloat(mod.commission_pct).toFixed(1)}%` : 'Não informado' }}
                    <span v-if="mod.commission_pct != null" class="text-xs text-gray-400 dark:text-slate-500 ml-1">({{ mod.commission_source === 'cv' ? 'via CV' : 'manual' }})</span>
                  </span>
                </div>
                <div class="field-item">
                  <span class="field-label">Prazo de Entrega</span>
                  <span class="field-value" :class="mod.delivery_deadline_months == null ? 'field-empty' : ''">
                    {{ mod.delivery_deadline_months != null ? `${mod.delivery_deadline_months} meses` : 'Não informado' }}
                    <span v-if="mod.delivery_deadline_note" class="block text-xs text-gray-400 dark:text-slate-500 mt-0.5">{{ mod.delivery_deadline_note }}</span>
                  </span>
                </div>
              </div>
              <div v-if="mod.min_demand_note" class="note-block mt-3">
                <span class="note-label">Obs. Demanda</span>
                <p>{{ mod.min_demand_note }}</p>
              </div>
              <div v-if="mod.commission_note" class="note-block mt-2">
                <span class="note-label"><i class="fas fa-percent text-[10px] mr-1"></i>Obs. Comissão</span>
                <p>{{ mod.commission_note }}</p>
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
                  <div class="min-w-0">
                    <span class="field-label block mb-1">Gestor Responsável</span>
                    <span
                      class="field-value block leading-snug break-words"
                      :class="!modManagerLabel(mod) ? 'field-empty' : ''"
                    >
                      {{ modManagerLabel(mod) || 'Não informado' }}
                    </span>
                  </div>
                </div> 

                <!-- Registro do contrato -->
                <div class="op-item">
                  <i class="fas fa-file-signature op-icon"></i>
                  <div class="min-w-0">
                    <span class="field-label block mb-1">Registro do Contrato</span>
                    <span
                      class="field-value block leading-snug break-words"
                      :class="!mod.contract_registration_by ? 'field-empty' : ''"
                    >
                      {{ mod.contract_registration_by ? contractLabel(mod) : 'Não informado' }}
                    </span>
                  </div>
                </div>

                <!-- CCA -->
                <div v-if="mod.contract_registration_by === 'cca'" class="op-item">
                  <i class="fas fa-building-columns op-icon"></i>
                  <div class="min-w-0">
                    <span class="field-label block mb-1">CCA</span>
                    <span class="field-value block leading-snug break-words" :class="!mod.cca_company_name ? 'field-empty' : ''">
                      {{ mod.cca_company_name || 'Nome não informado' }}
                      <span class="block mt-1 text-xs font-medium" :class="mod.cca_charges_company ? 'text-accent' : 'text-gray-400 dark:text-slate-500'">
                        <i :class="mod.cca_charges_company ? 'fa-square-check' : 'fa-square'" class="far mr-1"></i>
                        Pago pela Menin: <strong>{{ mod.cca_charges_company ? 'Sim' : 'Não' }}</strong>
                        <span v-if="mod.cca_charges_company && mod.cca_cost != null" class="ml-1 text-ink-muted">— {{ formatCurrency(mod.cca_cost) }}</span>
                      </span>
                    </span>
                  </div>
                </div>

                <!-- Correspondente -->
                <div class="op-item">
                  <i class="fas fa-handshake op-icon"></i>
                  <div class="min-w-0">
                    <span class="field-label block mb-1">Correspondente Bancário</span>
                    <span
                      class="field-value block leading-snug break-words"
                      :class="!modCorrespondent(mod) ? 'field-empty' : ''"
                    >
                      <template v-if="modCorrespondent(mod)">
                        {{ modCorrespondent(mod).nome }}

                        <span
                          v-if="modCorrespondent(mod).email"
                          class="block mt-0.5 text-xs font-normal text-gray-400 dark:text-slate-500"
                        >
                          {{ modCorrespondent(mod).email }}
                        </span>
                      </template>

                      <template v-else>
                        Não informado
                      </template>
                    </span>
                  </div>
                </div>

                <!-- Certificação digital -->
                <div class="op-item">
                  <i class="fas fa-shield op-icon"></i>
                  <div class="min-w-0">
                    <span class="field-label block mb-1">Certificação Digital</span>
                    <span
                      class="field-value block leading-snug break-words"
                      :class="!mod.has_digital_cert ? 'field-empty' : ''"
                    >
                      <template v-if="mod.has_digital_cert">
                        {{ mod.digital_cert_provider || 'Sim' }}

                        <span
                          v-if="mod.digital_cert_contact"
                          class="block mt-0.5 text-xs font-normal text-gray-400 dark:text-slate-500"
                        >
                          {{ mod.digital_cert_contact }}
                        </span>
                        <span
                          v-if="mod.digital_cert_has_cost && mod.digital_cert_cost != null"
                          class="block mt-1 text-xs font-medium text-accent"
                        >
                          <i class="fas fa-building text-[9px] mr-1"></i>{{ formatCurrency(mod.digital_cert_cost) }} (Menin)
                        </span>
                        <span
                          v-else-if="mod.has_digital_cert"
                          class="block mt-1 text-[10px] text-gray-400 dark:text-slate-500"
                        >
                          Sem custo
                        </span>
                      </template>

                      <template v-else>
                        Não utiliza
                      </template>
                    </span>
                  </div>
                </div>

                <!-- Arquivos do Empreendimento (QR Code) -->
                <div v-if="mod.enterprise_files_url" class="mt-4 flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-accent/20 rounded-xl">
                  <AppraisalQrCode :url="mod.enterprise_files_url" :size="80" />
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold text-accent mb-1">
                      <i class="fas fa-folder-open text-[10px] mr-1"></i>Arquivos do Empreendimento
                    </p>
                    <p class="text-[10px] text-ink-muted">Aponte a câmera no QR Code para acessar a pasta de arquivos.</p>
                    <a :href="mod.enterprise_files_url" target="_blank" rel="noopener" class="text-[10px] text-blue-500 hover:underline truncate block mt-1">{{ mod.enterprise_files_url }}</a>
                  </div>
                </div>
              </div>

              <div v-if="mod.notes" class="note-block mt-4">
                <span class="note-label">Observações</span>
                <p>{{ mod.notes }}</p>
              </div>
            </div>
          </div>

            <!-- Negociação — sempre visível -->
            <div class="info-card mb-4">
              <div class="info-card-header">
                <i class="fas fa-handshake text-blue-500"></i>
                Condições de Negociação
              </div>
              <div class="info-card-body">
                <div class="field-grid">
                  <div class="field-item">
                    <span class="field-label">Parcela mín RP</span>
                    <span class="field-value accent" :class="mod.rp_installment_value == null ? 'field-empty' : ''">
                      {{ mod.rp_installment_value != null ? formatCurrency(mod.rp_installment_value) : 'Não informado' }}
                    </span>
                  </div>
                  <div class="field-item">
                    <span class="field-label">Parcela mín Ato</span>
                    <span class="field-value accent" :class="mod.act_installment_value == null ? 'field-empty' : ''">
                      {{ mod.act_installment_value != null ? formatCurrency(mod.act_installment_value) : 'Não informado' }}
                    </span>
                  </div>
                  <div class="field-item">
                    <span class="field-label">Máx. Entrada</span>
                    <span class="field-value" :class="mod.max_entry_value == null ? 'field-empty' : ''">
                      {{ mod.max_entry_value != null ? `${parseFloat(mod.max_entry_value).toFixed(0)}%` : 'Não informado' }}
                    </span>
                  </div>
                  <div class="field-item">
                    <span class="field-label">Máximo Parcelas RP</span>
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
                <div v-else class="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-surface-sunken/40 text-ink-subtle border border-line">
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
                        <span v-if="f.appraisal_value != null" class="text-xs text-ink-muted">
                          Avaliação: <strong>{{ formatCurrency(f.appraisal_value) }}</strong>
                        </span>
                        <span v-if="f.appraisal_ceiling != null" class="text-xs text-gray-500 dark:text-slate-400">
                          Teto: <strong>{{ formatCurrency(f.appraisal_ceiling) }}</strong>
                        </span>
                        <span v-if="f.avg_ticket != null" class="text-xs text-accent">
                          Ticket Médio: <strong>{{ formatCurrency(f.avg_ticket) }}</strong>
                        </span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <div v-else class="empty-info-row">
                  <i class="fas fa-table text-ink-subtle text-sm"></i>
                  <span>Nenhuma faixa Minha Casa Minha Vida selecionada.</span>
                </div>
                
              <div v-if="mod.appraisal_note" class="note-block">
                <span class="note-label">Obs. Avaliação</span>
                <p>{{ mod.appraisal_note }}</p>
              </div>

              <!-- QR Code do laudo de avaliação -->
              <div v-if="mod.appraisal_file_url" class="mt-3 flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-accent/20 rounded-xl">
                <AppraisalQrCode :url="mod.appraisal_file_url" :size="120" />
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-accent mb-1">Avaliação CEF</p>
                  <p class="text-[10px] text-ink-muted">Aponte a câmera no QR Code para acessar o laudo de avaliação.</p>
                  <a :href="mod.appraisal_file_url" target="_blank" rel="noopener" class="text-[10px] text-blue-500 hover:underline truncate block mt-1">{{ mod.appraisal_file_url }}</a>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Documentação ──────────────────────────────────────────── -->
          <div v-if="hasDocsInfo(mod)" class="info-card mb-4">
            <div class="info-card-header">
              <i class="fas fa-file-contract text-blue-500"></i>
              Documentação
            </div>
            <div class="info-card-body space-y-4">
              <!-- Pacote CEF + ITBI + Cartório -->
              <div class="field-grid">
                <div v-if="mod.cef_package_paid_by || mod.cef_package_avg_value != null" class="field-item">
                  <span class="field-label">Pacote CEF</span>
                  <span class="field-value">
                    {{ mod.cef_package_avg_value != null ? formatCurrency(mod.cef_package_avg_value) : 'Valor não informado' }}
                    <span v-if="mod.cef_package_paid_by" class="block text-xs text-gray-400 dark:text-slate-500 mt-0.5">Pago por: <strong class="text-ink-muted">{{ mod.cef_package_paid_by === 'menin' ? 'Menin' : 'Cliente' }}</strong></span>
                  </span>
                </div>
                <div class="field-item">
                  <span class="field-label">ITBI</span>
                  <span class="field-value">
                    <template v-if="mod.itbi_exempt">
                      <span class="text-emerald-600 dark:text-emerald-400 font-semibold">Isento</span>
                    </template>
                    <template v-else-if="mod.itbi_avg_value != null">
                      {{ formatCurrency(mod.itbi_avg_value) }}
                      <span class="block text-xs text-gray-400 dark:text-slate-500 mt-0.5">Pago por: <strong class="text-ink-muted">Cliente</strong></span>
                    </template>
                    <template v-else>
                      <span class="field-empty">Não informado</span>
                    </template>
                  </span>
                </div>
                <div v-if="mod.cartorio_prenotacao_value != null" class="field-item">
                  <span class="field-label">Cartório — Prenotação</span>
                  <span class="field-value">{{ formatCurrency(mod.cartorio_prenotacao_value) }}</span>
                </div>
                <div v-if="mod.cartorio_registration_value != null" class="field-item">
                  <span class="field-label">Cartório — Registro</span>
                  <span class="field-value">
                    {{ formatCurrency(mod.cartorio_registration_value) }}
                    <span v-if="mod.cartorio_paid_by" class="block text-xs text-gray-400 dark:text-slate-500 mt-0.5">Pago por: <strong class="text-ink-muted">{{ mod.cartorio_paid_by === 'menin' ? 'Menin' : 'Cliente' }}</strong></span>
                  </span>
                </div>
              </div>

              <!-- QR Code do documento de isenção do ITBI -->
              <div v-if="mod.itbi_exempt && mod.itbi_exemption_doc_url" class="flex items-center gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl">
                <AppraisalQrCode :url="mod.itbi_exemption_doc_url" :size="120" />
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">Comprovante de Isenção do ITBI</p>
                  <p class="text-[10px] text-ink-muted">Aponte a câmera no QR Code para acessar o documento.</p>
                  <a :href="mod.itbi_exemption_doc_url" target="_blank" rel="noopener" class="text-[10px] text-emerald-500 hover:underline truncate block mt-1">{{ mod.itbi_exemption_doc_url }}</a>
                </div>
              </div>

              <!-- Resumo de Custos por Pagador -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="bg-surface-raised/60 rounded-xl p-3 border border-line">
                  <p class="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">Pago pela Menin</p>
                  <ul class="space-y-1 text-xs">
                    <li v-for="item in modCostSummary(mod).menin" :key="`m-${item.label}`" class="flex justify-between">
                      <span class="text-ink-muted">{{ item.label }}</span>
                      <strong class="text-ink">{{ formatCurrency(item.value) }}</strong>
                    </li>
                    <li v-if="!modCostSummary(mod).menin.length" class="text-gray-400 dark:text-slate-500 italic">—</li>
                  </ul>
                  <div class="mt-2 pt-2 border-t border-line flex justify-between text-xs">
                    <span class="font-semibold text-ink">Total</span>
                    <strong class="text-accent">{{ formatCurrency(modCostSummary(mod).totalMenin) }}</strong>
                  </div>
                </div>
                <div class="bg-surface-raised/60 rounded-xl p-3 border border-line">
                  <p class="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2">Pago pelo Cliente</p>
                  <ul class="space-y-1 text-xs">
                    <li v-for="item in modCostSummary(mod).client" :key="`c-${item.label}`" class="flex justify-between">
                      <span class="text-ink-muted">{{ item.label }}</span>
                      <strong class="text-ink">{{ formatCurrency(item.value) }}</strong>
                    </li>
                    <li v-if="!modCostSummary(mod).client.length" class="text-gray-400 dark:text-slate-500 italic">—</li>
                  </ul>
                  <div class="mt-2 pt-2 border-t border-line flex justify-between text-xs">
                    <span class="font-semibold text-ink">Total</span>
                    <strong class="text-accent">{{ formatCurrency(modCostSummary(mod).totalClient) }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

            <!-- Tabelas de Preço — sempre visível -->
            <div class="info-card mb-4">
              <div class="info-card-header">
                <i class="fas fa-tag text-blue-500"></i>
                Tabelas de Preço
              </div>
              <div v-if="modSelectedPriceTables(mod).length"> 
                <div class="space-y-4 flex flex-col gap-4 p-4"> <div v-for="t in modSelectedPriceTables(mod)" :key="t.idtabela"
                    class="price-table-row flex-col items-start gap-3 p-4 bg-surface-sunken/40 rounded-xl border border-line">
                    
                    <div class="flex items-center justify-between w-full gap-2">
                      <div class="flex items-center gap-2 min-w-0">
                        <i class="fas fa-table text-blue-400 text-xs flex-shrink-0"></i>
                        <span class="text-sm text-ink font-bold truncate">{{ t.nome }}</span>
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <span v-if="t.vigente" class="badge-green">vigente</span>
                        <span class="text-xs text-gray-400 dark:text-slate-500">{{ formatDate(t.data_vigencia_de) }} → {{ formatDate(t.data_vigencia_ate) }}</span>
                      </div>
                    </div>

                    <div v-if="t.unit_count > 0" class="flex items-center gap-4 text-xs text-ink-muted flex-wrap border-b border-gray-200/50 dark:border-gray-700/50 pb-3 w-full">
                      <span><i class="fas fa-home mr-1"></i><strong>{{ t.unit_count }}</strong> unidades</span>
                      <span><i class="fas fa-tag mr-1"></i>De <strong>{{ formatCurrencyShort(t.price_min) }}</strong> até <strong>{{ formatCurrencyShort(t.price_max) }}</strong></span>
                      <span><i class="fas fa-chart-line mr-1"></i>Média <strong>{{ formatCurrencyShort(t.price_avg) }}</strong></span>
                      <template v-if="tableM2Stats(mod, t)">
                        <span class="border-l border-line pl-4"><i class="fas fa-ruler-combined mr-1"></i>m²: Mín <strong>{{ formatM2(tableM2Stats(mod, t).min) }}</strong> · Máx <strong>{{ formatM2(tableM2Stats(mod, t).max) }}</strong> · Média <strong>{{ formatM2(tableM2Stats(mod, t).avg) }}</strong></span>
                      </template>
                    </div>

                    <div v-if="t.unidades?.length" class="w-full">
                      <p class="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">Fluxo Médio (Ref: {{ t.unidades[0].unidade }})</p>
                      <div class="flex flex-wrap gap-2 w-full">
                        <div v-for="serie in t.unidades[0].series" :key="serie.nome" 
                          class="bg-surface-raised/60 p-2 rounded-lg border border-line flex flex-col justify-between flex-grow flex-shrink-0 basis-[calc(25%-0.5rem)] min-w-[120px] max-w-full">
                          
                          <p class="text-[9px] text-gray-400 dark:text-slate-500 uppercase font-bold whitespace-normal leading-tight mb-1">
                            {{ serie.nome }}
                          </p>
                          
                          <div>
                            <p class="text-sm font-black text-ink">{{ formatCurrencyShort(serie.valor) }}</p>
                            <p class="text-[10px] text-gray-500 dark:text-slate-400">
                              {{ serie.qtd_parcelas }}x 
                              <span v-if="serie.data_vencimento" class="text-[9px]">({{ serie.data_vencimento.split('/')[2] }})</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div v-if="t.forma" class="bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded-lg w-full">
                      <p class="text-[10px] text-accent font-medium italic">
                        <i class="fas fa-info-circle mr-1"></i>{{ t.forma }}
                      </p>
                    </div>
                  </div>
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
              <div v-if="modActiveCampaigns(mod).length" class="campaign-row">
                <div v-for="(camp, ci) in modActiveCampaigns(mod)" :key="camp.id ?? ci" class="campaign-card">
                  <p class="text-sm font-bold text-ink">{{ camp.title || `Campanha ${ci + 1}` }}</p>
                  <p v-if="camp.description" class="text-xs text-ink-muted mt-0.5">{{ camp.description }}</p>
                  <div class="flex items-center gap-3 mt-2 flex-wrap">
                    <span v-if="camp.value" class="campaign-value">{{ formatCurrency(camp.value) }}</span>
                    <span v-if="camp.start_date" class="text-xs text-gray-400 dark:text-slate-500">
                      {{ formatDate(camp.start_date) }}{{ camp.end_date ? ` → ${formatDate(camp.end_date)}` : '' }}
                    </span>
                  </div>
                  <p v-if="camp.rules" class="text-xs text-ink-muted mt-2 italic border-t border-line pt-2">{{ camp.rules }}</p>
                </div>
              </div>
              <div v-else class="empty-info-row">
                <i class="fas fa-bullhorn text-ink-subtle text-sm"></i>
                <span>Nenhuma campanha ativa neste módulo</span>
              </div>
            </div>
          </div>

          <!-- ── Unidades (snapshot) ─────────────────────────────────────── -->
          <div v-if="snapshotBlocos(mod).length" class="info-card mb-4">
            <div class="info-card-header">
              <i class="fas fa-home text-blue-500"></i>
              Unidades
              <span class="ml-auto flex items-center gap-1.5 text-[10px] font-normal text-gray-400 dark:text-slate-500 normal-case tracking-normal">
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
                <span class="text-gray-400 dark:text-slate-500">· Total: {{ snapshotStats(mod).total }}</span>
              </div>
              <div class="space-y-4">
                <div v-for="bloco in snapshotBlocos(mod)" :key="bloco.idbloco">
                  <p class="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                    {{ bloco.nome }}
                    <span class="font-normal normal-case">· {{ (bloco.unidades ?? []).length }} unid.</span>
                  </p>
                  <div class="unit-row">
                    <div v-for="u in (bloco.unidades ?? [])" :key="u.idunidade"
                      :class="['rounded px-1.5 py-1 text-center border text-[10px] leading-tight', unitStatusClass(u)]">
                      <p class="font-semibold text-ink truncate">{{ u.nome }}</p>
                      <p v-if="u.valor_total != null" class="text-accent font-bold">{{ formatCurrencyShort(u.valor_total) }}</p>
                      <p v-if="u.area_privativa" class="text-gray-400 dark:text-slate-500">{{ Number(u.area_privativa).toFixed(2) }}m²</p>
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

      <!-- ── Resumo Total de Custos da FICHA — APENAS NA TELA (oculto no PDF) ──── -->
      <div v-if="!isPrinting && localModules.length && fichaCosts.totalMenin + fichaCosts.totalClient > 0"
        class="no-print bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-2xl border-2 border-accent/40 overflow-hidden mb-4 mt-2">
        <div class="px-5 py-3 bg-blue-100/60 dark:bg-blue-900/30 border-b border-accent/30">
          <p class="text-sm font-bold text-accent flex items-center gap-2">
            <i class="fas fa-coins"></i> Resumo Total de Custos da Ficha
            <span v-if="localModules.length > 1" class="text-[10px] font-medium text-blue-500 dark:text-blue-400">
              (somando todos os {{ localModules.length }} módulos)
            </span>
          </p>
        </div>
        <div class="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="bg-surface-raised/60 rounded-xl p-4 border border-accent/20">
            <p class="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <i class="fas fa-building text-blue-500"></i> Pago pela Menin
            </p>
            <ul class="space-y-1 text-xs">
              <li v-for="item in fichaCosts.menin" :key="`fm-${item.label}`" class="flex justify-between">
                <span class="text-ink-muted">{{ item.label }}</span>
                <strong class="text-ink">{{ formatCurrency(item.value) }}</strong>
              </li>
              <li v-if="!fichaCosts.menin.length" class="text-gray-400 dark:text-slate-500 italic">—</li>
            </ul>
            <div class="mt-3 pt-3 border-t-2 border-accent/30 flex justify-between text-sm">
              <span class="font-bold text-ink">Total Menin</span>
              <strong class="text-base text-accent">{{ formatCurrency(fichaCosts.totalMenin) }}</strong>
            </div>
          </div>
          <div class="bg-surface-raised/60 rounded-xl p-4 border border-accent/20">
            <p class="text-[10px] font-bold text-ink-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <i class="fas fa-user text-blue-500"></i> Pago pelo Cliente
            </p>
            <ul class="space-y-1 text-xs">
              <li v-for="item in fichaCosts.client" :key="`fc-${item.label}`" class="flex justify-between">
                <span class="text-ink-muted">{{ item.label }}</span>
                <strong class="text-ink">{{ formatCurrency(item.value) }}</strong>
              </li>
              <li v-if="!fichaCosts.client.length" class="text-gray-400 dark:text-slate-500 italic">—</li>
            </ul>
            <div class="mt-3 pt-3 border-t-2 border-accent/30 flex justify-between text-sm">
              <span class="font-bold text-ink">Total Cliente</span>
              <strong class="text-base text-accent">{{ formatCurrency(fichaCosts.totalClient) }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Rodapé — só impresso -->
      <div class="print-only print-footer">
        <div class="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
          <span>Menin Office — Ficha Comercial Confidencial</span>
          <span>Gerado em {{ formatDateFull(new Date()) }}</span>
        </div>
      </div>
    </div>

    <!-- Rodapé de tela -->
    <p class="no-print text-center text-xs text-ink-subtle mt-4">
      Gerado em {{ formatDateFull(new Date()) }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import QRCode from 'qrcode';
import AppraisalQrCode from './AppraisalQrCode.vue';
import { computeCostSummary } from './costSummary.js';

const props = defineProps({
    detail:           { type: Object,  default: null },
    localModules:     { type: Array,   default: () => [] },
    priceTables:      { type: Array,   default: () => [] },
    correspondents:   { type: Array,   default: () => [] },
    officeUsers:      { type: Array,   default: () => [] },
    enterpriseStages: { type: Array,   default: () => [] },
    isAdmin:          { type: Boolean, default: false },
    isApprover:       { type: Boolean, default: false },
    canEdit:          { type: Boolean, default: false },
    canAuthorize:     { type: Boolean, default: false },
    actionLoading:    { type: Boolean, default: false },
    wasRejected:      { type: Boolean, default: false },
    rejectionNote:    { type: String,  default: null },
    activeIndex:      { type: Number,  default: 0 },     // módulo ativo (compartilhado com o índice do Detail)
    hideChrome:       { type: Boolean, default: false }, // esconde o header redundante (mês/ações/pills) no novo layout
});

const emit = defineEmits(['navigate-month', 'submit-for-approval', 'unlock', 'cancel-approval', 'authorize', 'update:activeIndex']);

const activeIdx = computed({
    get: () => props.activeIndex,
    set: (v) => emit('update:activeIndex', v),
});
const activeModule = computed(() => props.localModules[activeIdx.value] ?? null);
const isPrinting = ref(false);
const showDocModal = ref(false);
function openDoc() { showDocModal.value = true; }
// Exposto p/ o índice flutuante do Detail acionar (printModule é function declaration, hoisted).
defineExpose({ printModule, openDoc });

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
    closed:           'Encerrado',
};

function statusChipClass(s) {
    const map = {
        draft:            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        pending_approval: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        approved:         'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        closed:           'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
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

function tableM2Stats(mod, table) {
    const areaMap = {};
    for (const b of (mod.unit_snapshot?.data ?? [])) {
        for (const u of (b.unidades ?? [])) {
            if (u.idunidade) areaMap[String(u.idunidade)] = Number(u.area_privativa) || 0;
        }
    }
    const prices = [];
    for (const tu of (table.unidades ?? [])) {
        if (tu.idunidade == null || tu.valor_total == null) continue;
        const area = areaMap[String(tu.idunidade)];
        if (area > 0) prices.push(Number(tu.valor_total) / area);
    }
    if (!prices.length) return null;
    return {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    };
}

function modM2Stats(mod) {
    const blocos = mod?.unit_snapshot?.data ?? [];
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
}

function formatM2(v) {
    if (v == null) return '—';
    return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) + '/m²';
}

function hasDocsInfo(mod) {
    return !!(
        mod.cef_package_paid_by || mod.cef_package_avg_value != null ||
        mod.itbi_exempt || mod.itbi_avg_value != null || mod.itbi_exemption_doc_url ||
        mod.cartorio_prenotacao_value != null || mod.cartorio_registration_value != null || mod.cartorio_paid_by ||
        mod.cca_charges_company ||      // basta o toggle estar ON, mesmo sem valor
        mod.digital_cert_has_cost       // idem
    );
}

function modCostSummary(mod) {
    return computeCostSummary(mod);
}

// Agregação no nível da FICHA — soma os custos de todos os módulos.
// EXIBIDA APENAS NA VISUALIZAÇÃO (tela) — fica oculta no PDF/impressão.
function fichaCostSummary(modules) {
    const out = { menin: [], client: [], totalMenin: 0, totalClient: 0 };
    const meninAcc = new Map();
    const clientAcc = new Map();
    for (const m of (modules ?? [])) {
        const cs = computeCostSummary(m);
        for (const it of cs.menin)  meninAcc.set(it.label, (meninAcc.get(it.label) ?? 0) + it.value);
        for (const it of cs.client) clientAcc.set(it.label, (clientAcc.get(it.label) ?? 0) + it.value);
    }
    for (const [label, value] of meninAcc)  out.menin.push({ label, value });
    for (const [label, value] of clientAcc) out.client.push({ label, value });
    out.totalMenin  = out.menin.reduce((s, i) => s + i.value, 0);
    out.totalClient = out.client.reduce((s, i) => s + i.value, 0);
    return out;
}

// Reativo: agrega custos de TODOS os módulos da ficha
const fichaCosts = computed(() => fichaCostSummary(props.localModules));

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

// Espelha Meninger-Back/services/cv/enterpriseUnitsSummaryService.js (classifyUnitStatus)
// para Conditions e Projections classificarem unidades de forma idêntica.
function classifySnapshotUnit(unit) {
    const raw = unit?.situacao_mapa_disponibilidade;
    const numeric = Number(raw);
    const statusNum = !Number.isNaN(numeric) && numeric > 0 ? numeric : null;

    let isSold = false;
    let isReserved = false;
    let isBlocked = false;

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

    if (unit?.data_bloqueio) {
        isBlocked = true;
        isSold = false;
        isReserved = false;
    }

    return { isSold, isReserved, isBlocked };
}

function snapshotStats(mod) {
    const blocos = snapshotBlocos(mod);
    let disp = 0, res = 0, vend = 0, bloq = 0, total = 0;
    for (const b of blocos) {
        for (const u of (b.unidades ?? [])) {
            total++;
            const st = classifySnapshotUnit(u);
            if (st.isSold) vend++;
            else if (st.isReserved) res++;
            else if (st.isBlocked) bloq++;
            else disp++;
        }
    }
    return { disp, res, vend, bloq, total };
}

function unitStatusClass(unit) {
    const st = classifySnapshotUnit(unit);
    if (st.isSold) return 'border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-800';
    if (st.isReserved) return 'border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700';
    if (st.isBlocked) return 'border-gray-200 bg-surface-sunken/30 dark:border-gray-700';
    return 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800';
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

// ── Print (janela isolada) ─────────────────────────────────────────────────────


async function printModule() {
    showDocModal.value = false;

    const modules = props.localModules;
    if (!modules.length) return;

    // Pré-gera QR Codes (data URLs) para todos os anexos antes de montar o HTML
    const qrCache = {};
    const collectUrls = [];
    for (const mod of modules) {
        if (mod.appraisal_file_url) collectUrls.push(mod.appraisal_file_url);
        if (mod.itbi_exempt && mod.itbi_exemption_doc_url) collectUrls.push(mod.itbi_exemption_doc_url);
        if (mod.enterprise_files_url) collectUrls.push(mod.enterprise_files_url);
    }
    for (const url of collectUrls) {
        try {
            qrCache[url] = await QRCode.toDataURL(url, { width: 160, margin: 1, errorCorrectionLevel: 'M' });
        } catch (e) {
            qrCache[url] = '';
        }
    }

    const detail     = props.detail;
    const enterprise = detail?.enterprise ?? {};
    const now        = new Date();

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const fmtCurrency = v => (v == null || v === '') ? '—'
        : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const fmtShort = v => {
        if (v == null || v === '') return '—';
        const n = Number(v);
        if (Number.isNaN(n)) return '—';
        if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
        if (n >= 1_000)     return `R$ ${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
        return fmtCurrency(n);
    };

    const fmtDate = d => {
        if (!d) return '—';
        const [y, m, day] = String(d).split('T')[0].split('-');
        if (!y || !m || !day) return '—';
        return `${day}/${m}/${y}`;
    };

    const fmtMonth = s => {
        if (!s) return '—';
        const [y, m] = String(s).split('-');
        const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
        return `${months[Number(m) - 1] ?? '--'}/${y}`;
    };

    const fmtFull = d => d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const fmtSnap = iso => iso ? new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }) : '';

    const pct = v => v != null ? `${parseFloat(v).toFixed(1)}%` : '—';

    const ni = v => (v != null && v !== '')
        ? escapeHtml(v)
        : '<span class="empty">Não informado</span>';

    const field = (label, value) => `
        <div class="field">
          <span class="field-label">${escapeHtml(label)}</span>
          <span class="field-value">${value}</span>
        </div>`;

    const fieldRow = (...items) => `
        <div class="field-row">
          ${items.join('')}
        </div>`;

    const note = (label, text) => text ? `
        <div class="note">
          <span class="note-label">${escapeHtml(label)}</span>
          <p>${escapeHtml(text)}</p>
        </div>` : '';

    const card = (icon, title, body, extraClass = '') => `
        <div class="card ${extraClass}">
          <div class="card-header">
            <span class="card-icon">${icon}</span>
            ${escapeHtml(title)}
          </div>
          <div class="card-body">${body}</div>
        </div>`;

    const kpi = (label, value, sub = '') => `
        <div class="kpi">
          <span class="kpi-label">${escapeHtml(label)}</span>
          <span class="kpi-val">${value}</span>
          ${sub ? `<span class="kpi-sub">${escapeHtml(sub)}</span>` : ''}
        </div>`;

    const FAIXA_NAMES = { 1: 'Faixa 1', 2: 'Faixa 2', 3: 'Faixa 3', 4: 'Faixa 4' };

    const STATUS_LABELS_PRINT = {
        draft:            'Rascunho',
        pending_approval: 'Em Autorização',
        approved:         'Autorizado',
        closed:           'Encerrado',
    };

    const STATUS_COLORS = {
        draft:            '#92400e|#fef3c7',
        pending_approval: '#1e40af|#dbeafe',
        approved:         '#065f46|#d1fae5',
        closed:           '#374151|#e5e7eb',
    };

    const stageName = mod => {
        if (!mod?.idetapa) return null;
        return props.enterpriseStages?.find(s => Number(s.idetapa) === Number(mod.idetapa))?.nome
            ?? props.detail?.stages?.find(s => Number(s.idetapa) === Number(mod.idetapa))?.nome
            ?? `Etapa #${mod.idetapa}`;
    };

    const manager = mod => {
        if (mod.manager_mode === 'manual' || (!mod.manager_user_id && mod.manager_name)) {
            return [mod.manager_name, mod.manager_email, mod.manager_phone].filter(Boolean).join(' · ') || null;
        }
        const u = props.officeUsers?.find(u => Number(u.id) === Number(mod.manager_user_id));
        return u ? (u.username + (u.position ? ` — ${u.position}` : '')) : null;
    };

    const correspondent = mod =>
        props.correspondents?.find(c => Number(c.idusuario) === Number(mod.correspondent_id)) ?? null;

    const contractLbl = mod => {
        if (mod.contract_registration_by === 'cca') {
            return `CCA${mod.cca_company_name ? ` — ${mod.cca_company_name}` : ''}`;
        }

        if (mod.contract_registration_by === 'menin') {
            const u = props.officeUsers?.find(u => Number(u.id) === Number(mod.contract_registered_by_user_id));
            if (u) return `Menin — ${u.username}`;
            return mod.outros_contact_name ? `Menin — ${mod.outros_contact_name}` : 'Menin (interno)';
        }

        if (mod.contract_registration_by === 'outros') {
            return `Terceiros${mod.outros_contact_name ? ` — ${mod.outros_contact_name}` : ''}`;
        }

        return mod.contract_registration_by ?? null;
    };

    const subsidyLabel = mod => {
        const map = { ms: 'Mato Grosso do Sul', mt: 'Mato Grosso', pr: 'Paraná', sp: 'São Paulo' };
        const s = mod.state_subsidy_state;
        if (!s) return '';
        return s === 'custom'
            ? (mod.state_subsidy_custom_state || 'Outro Estado')
            : (map[s] ?? String(s).toUpperCase());
    };

    const classifyUnitPrint = (unit) => {
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
    };

    const enabledFaixasPrint = mod =>
        (mod?.appraisal_faixas ?? []).filter(f => f.enabled);

    const hasMcmvPrint = mod =>
        enabledFaixasPrint(mod).length > 0 || !!mod.appraisal_note;

    const activeCampaigns = mod =>
        (mod?.campaigns ?? []).filter(c => c.is_active !== false);

    const priceTables = mod => {
        const ids = mod.price_table_ids ?? [];
        return (props.priceTables ?? []).filter(t => ids.includes(t.idtabela));
    };

    const unitMinPrint = units => {
        const values = (units ?? []).map(u => u.value).filter(v => v != null);
        return values.length ? Math.min(...values) : null;
    };

    const unitMaxPrint = units => {
        const values = (units ?? []).map(u => u.value).filter(v => v != null);
        return values.length ? Math.max(...values) : null;
    };

    const unitAvgPrint = units => {
        const values = (units ?? []).map(u => u.value).filter(v => v != null);
        return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };

    const renderModule = (mod, idx) => {
        const faixas = enabledFaixasPrint(mod);
        const camps  = activeCampaigns(mod);
        const tables = priceTables(mod);
        const manual = mod.manual_price_tables ?? [];
        const blocos = mod?.unit_snapshot?.data ?? [];
        const hasMcmv = hasMcmvPrint(mod);

        const availStats = (() => {
            const blocos = mod?.unit_snapshot?.data ?? [];
            if (!blocos.length) return null;
            let disp=0, res=0, vend=0, bloq=0, total=0;
            for (const b of blocos) {
                for (const u of (b.unidades ?? [])) {
                    total++;
                    const st = classifyUnitPrint(u);
                    if (st.isSold) vend++;
                    else if (st.isReserved) res++;
                    else if (st.isBlocked) bloq++;
                    else disp++;
                }
            }
            return { disp, res, vend, bloq, total };
        })();

        const kpis = [
            kpi(
                'Unidades',
                mod.total_units ?? '<span class="empty-kpi">—</span>', 
            ),
            kpi('Disponíveis', availStats ? String(availStats.disp) : '<span class="empty-kpi">—</span>', 'unidades'),
            kpi('Vendidas', availStats ? String(availStats.vend) : '<span class="empty-kpi">—</span>', 'unidades'),
            kpi('% Vendido', availStats && availStats.total > 0 ? `${((availStats.vend / availStats.total) * 100).toFixed(1)}%` : '<span class="empty-kpi">—</span>', 'do total'),
            kpi('Reservadas', availStats ? String(availStats.res) : '<span class="empty-kpi">—</span>', 'unidades'),
            ...(availStats && availStats.bloq > 0 ? [kpi('Bloqueadas', String(availStats.bloq), 'unidades')] : []),
        ];

        const productStage = stageName(mod);

        const commissionLabel = mod.commission_pct != null
            ? `${pct(mod.commission_pct)} <span style="color:#9ca3af;font-size:9px;">(${mod.commission_source === 'cv' ? 'via CV' : 'manual'})</span>`
            : '<span class="empty">Não informado</span>';

        const deadlineLabel = mod.delivery_deadline_months != null
            ? escapeHtml(`${mod.delivery_deadline_months} meses${mod.delivery_deadline_note ? ` — ${mod.delivery_deadline_note}` : ''}`)
            : '<span class="empty">Não informado</span>';

        const prodBody = `
            ${fieldRow(
                field('Etapa do CV', productStage ? escapeHtml(productStage) : '<span class="empty">Sem etapa vinculada</span>'),
                field('Total de Unidades', ni(mod.total_units)),
                field('Demanda Mínima', ni(mod.min_demand != null ? `${mod.min_demand} unid. (≥ 20%)` : null)),
                field('Comissão', commissionLabel),
                field('Prazo de Entrega', deadlineLabel),
            )}
            ${note('Obs. Demanda', mod.min_demand_note)}
            ${note('Obs. Comissão', mod.commission_note)}`;

        const negocBody = `
            ${fieldRow(
                field('Parcela mín RP', `<span class="accent">${mod.rp_installment_value != null ? fmtCurrency(mod.rp_installment_value) : '<span class="empty">Não informado</span>'}</span>`),
                field('Parcela mín Ato', `<span class="accent">${mod.act_installment_value != null ? fmtCurrency(mod.act_installment_value) : '<span class="empty">Não informado</span>'}</span>`),
                field('Máx. Entrada', ni(mod.max_entry_value != null ? `${parseFloat(mod.max_entry_value).toFixed(0)}%` : null)),
                field('Máximo Parcelas RP', ni(mod.max_installments != null ? `${mod.max_installments}x` : null)),
                field('Até Habite-se', ni(mod.installment_until_habite_se)),
                field('Pós Habite-se', ni(mod.installment_post_habite_se)),
            )}
            ${mod.has_state_subsidy
                ? `<div class="subsidy">Subsídio Estadual${subsidyLabel(mod) ? ` — ${escapeHtml(subsidyLabel(mod))}` : ''}${mod.state_subsidy_program ? ` · ${escapeHtml(mod.state_subsidy_program)}` : ''}</div>`
                : `<div class="muted-badge">Sem subsídio estadual</div>`}
            ${note('Regra RP', mod.rp_rule)}
            ${note('Regras do Subsídio', mod.state_subsidy_rules)}
            ${note('Condições do Subsídio', mod.state_subsidy_conditions)}`;

        const tablesHtml = `
            ${tables.length
                ? `<div style="display: flex; flex-direction: column; gap: 12px;">
           ${tables.map(t => {
               // Extrai as séries da primeira unidade se existir
                const firstUnit = t.unidades?.[0];
                const seriesHtml = firstUnit?.series?.length 
                    ? `<p style="font-size: 8px; font-weight: 700; color: #3b82f6; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">
                        Fluxo Médio (Ref: ${escapeHtml(firstUnit.unidade)})
                      </p>
                      <div style="display: flex; flex-wrap: wrap; gap: 6px; width: 100%; margin-bottom: 8px;">
                        ${firstUnit.series.map(serie => `
                            <div style="background: #ffffff; padding: 6px; border-radius: 6px; border: 1px solid #e5e7eb; 
                                        display: flex; flex-direction: column; justify-content: space-between;
                                        flex-grow: 1; flex-shrink: 0; flex-basis: 22%; min-width: 100px; min-height: 55px;">
                                
                                <span style="font-size: 7px; color: #9ca3af; font-weight: 700; text-transform: uppercase; white-space: normal; line-height: 1.1; margin-bottom: 4px;">
                                    ${escapeHtml(serie.nome)}
                                </span>
                                
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-size: 10px; color: #111827; font-weight: 800; line-height: 1;">
                                        ${fmtShort(serie.valor)}
                                    </span>
                                    <span style="font-size: 8px; color: #6b7280; margin-top: 2px;">
                                        ${serie.qtd_parcelas}x ${serie.data_vencimento ? `<small>(${serie.data_vencimento.split('/')[2]})</small>` : ''}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                      </div>`
                    : '';

               return `
                <div class="price-row" style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; break-inside: avoid;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 11px; font-weight: 800; color: #1e40af;">${escapeHtml(t.nome)}</span>
                        ${t.vigente ? '<span class="badge-green">vigente</span>' : ''}
                    </div>

                    <div style="display: flex; gap: 12px; font-size: 9px; color: #64748b; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; margin-bottom: 10px; flex-wrap: wrap;">
                        <span>🏠 <strong>${t.unit_count}</strong> unid.</span>
                        <span>🏷️ De <strong>${fmtShort(t.price_min)}</strong> a <strong>${fmtShort(t.price_max)}</strong></span>
                        <span>📈 Média <strong>${fmtShort(t.price_avg)}</strong></span>
                        ${(() => {
                            const am = {};
                            for (const b of (mod.unit_snapshot?.data ?? [])) {
                                for (const u of (b.unidades ?? [])) {
                                    if (u.idunidade) am[String(u.idunidade)] = Number(u.area_privativa) || 0;
                                }
                            }
                            const p = [];
                            for (const tu of (t.unidades ?? [])) {
                                if (tu.idunidade == null || tu.valor_total == null) continue;
                                const area = am[String(tu.idunidade)];
                                if (area > 0) p.push(Number(tu.valor_total) / area);
                            }
                            if (!p.length) return '';
                            const fmtM2p = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) + '/m²';
                            const mn = Math.min(...p), mx = Math.max(...p), av = p.reduce((a,b)=>a+b,0)/p.length;
                            return `<span style="border-left:1px solid #e2e8f0;padding-left:8px;margin-left:4px;">📐 m²: Mín <strong>${fmtM2p(mn)}</strong> · Máx <strong>${fmtM2p(mx)}</strong> · Média <strong>${fmtM2p(av)}</strong></span>`;
                        })()}
                    </div>

                    ${seriesHtml}

                    ${t.forma ? `
                        <div style="background: #eff6ff; padding: 5px 8px; border-radius: 4px; border-left: 3px solid #3b82f6;">
                            <p style="font-size: 8px; color: #1d4ed8; font-style: italic; line-height: 1.2;">
                                ℹ️ ${escapeHtml(t.forma)}
                            </p>
                        </div>` : ''}
                </div>`;
           }).join('')}
           </div>`
        : `<div class="empty-line">Nenhuma tabela do CV selecionada</div>`}

            ${manual.length
                ? `<p class="section-sublabel manual-label">Manuais</p>
                   ${manual.map(mt => `
                    <div class="manual-row">
                      <div class="manual-top">
                        <span class="manual-name">${escapeHtml(mt.name || '(sem nome)')}</span>
                        ${mt.validity_from || mt.validity_to
                            ? `<span class="manual-date">${fmtDate(mt.validity_from)} → ${fmtDate(mt.validity_to)}</span>`
                            : ''}
                      </div>
                      ${mt.note ? `<p class="manual-note">${escapeHtml(mt.note)}</p>` : ''}
                      ${mt.units?.length ? `
                        <div class="price-stats">
                          <span><strong>${mt.units.filter(u=>u.value!=null).length}</strong>/${mt.units.length} unidades</span>
                          ${unitMinPrint(mt.units) != null ? `<span>Mín: <strong>${fmtCurrency(unitMinPrint(mt.units))}</strong></span>` : ''}
                          ${unitMaxPrint(mt.units) != null ? `<span>Máx: <strong>${fmtCurrency(unitMaxPrint(mt.units))}</strong></span>` : ''}
                          ${unitAvgPrint(mt.units) != null ? `<span>Média: <strong>${fmtCurrency(unitAvgPrint(mt.units))}</strong></span>` : ''}
                        </div>` : ''}
                    </div>`).join('')}`
                : ''}

            ${note('Premissa de Preço', mod.price_premise_note)}`;

        const corr = correspondent(mod);

        const opItems = [
            {
                icon: '👤',
                label: 'Gestor Responsável',
                main: manager(mod),
            }, 
            {
                icon: '📄',
                label: 'Registro do Contrato',
                main: mod.contract_registration_by ? contractLbl(mod) : null,
            },
            ...(mod.contract_registration_by === 'cca'
                ? [{
                    icon: '🏦',
                    label: 'CCA',
                    main: mod.cca_company_name || null,
                    sub: mod.cca_charges_company
                        ? `☑ Pago pela Menin: Sim${mod.cca_cost != null ? ` — ${fmtCurrency(mod.cca_cost)}` : ''}`
                        : '☐ Pago pela Menin: Não',
                }]
                : []),
            {
                icon: '🤝',
                label: 'Correspondente Bancário',
                main: corr?.nome || null,
                sub: corr?.email,
            },
            {
                icon: '🛡️',
                label: 'Certificação Digital',
                main: mod.has_digital_cert ? (mod.digital_cert_provider || 'Sim') : 'Não utiliza',
                sub: [
                    mod.digital_cert_contact || null,
                    (mod.has_digital_cert && mod.digital_cert_has_cost && mod.digital_cert_cost != null)
                        ? `${fmtCurrency(mod.digital_cert_cost)} (Menin)`
                        : (mod.has_digital_cert ? 'Sem custo' : null),
                ].filter(Boolean).join(' · '),
            },
        ];

        const filesQrHtml = (mod.enterprise_files_url && qrCache[mod.enterprise_files_url])
            ? `<div style="margin-top:10px;display:flex;align-items:center;gap:10px;padding:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;break-inside:avoid;">
                  <img src="${qrCache[mod.enterprise_files_url]}" alt="QR Arquivos" style="width:80px;height:80px;border:1px solid #e5e7eb;background:#fff;padding:4px;border-radius:4px;flex-shrink:0;" />
                  <div style="flex:1;min-width:0;">
                    <p style="font-size:10px;font-weight:700;color:#2563eb;margin-bottom:2px;">📁 Arquivos do Empreendimento</p>
                    <p style="font-size:9px;color:#6b7280;">Aponte a câmera no QR Code para acessar a pasta de arquivos.</p>
                    <p style="font-size:8px;color:#3b82f6;margin-top:2px;word-break:break-all;">${escapeHtml(mod.enterprise_files_url)}</p>
                  </div>
                </div>`
            : '';

        const opHtml = `
            <div class="op-row-print">
              ${opItems.map(op => `
                <div class="op-item-print">
                  <span class="op-icon-print">${op.icon}</span>
                  <div class="op-text-print">
                    <span class="field-label">${escapeHtml(op.label)}</span>
                    <span class="field-value">${op.main ? escapeHtml(op.main) : '<span class="empty">Não informado</span>'}</span>
                    ${op.sub ? `<span class="op-sub-print">${escapeHtml(op.sub)}</span>` : ''}
                  </div>
                </div>`).join('')}
            </div>
            ${filesQrHtml}
            ${note('Observações', mod.notes)}`;

        const campHtml = camps.length
            ? `<div class="campaign-row-print">
                ${camps.map(c => `
                  <div class="campaign-card-print">
                    <p class="campaign-title">${escapeHtml(c.title || 'Campanha')}</p>
                    ${c.description ? `<p class="campaign-desc">${escapeHtml(c.description)}</p>` : ''}
                    <div class="campaign-meta">
                      ${c.value ? `<span class="campaign-value">${fmtCurrency(c.value)}</span>` : ''}
                      ${c.start_date ? `<span>${fmtDate(c.start_date)}${c.end_date ? ` → ${fmtDate(c.end_date)}` : ''}</span>` : ''}
                    </div>
                    ${c.rules ? `<p class="campaign-rules">${escapeHtml(c.rules)}</p>` : ''}
                  </div>`).join('')}
               </div>`
            : `<span class="empty-line">Nenhuma campanha ativa neste módulo</span>`;

        const appraisalQrHtml = (mod.appraisal_file_url && qrCache[mod.appraisal_file_url])
            ? `<div style="margin-top:10px;display:flex;align-items:center;gap:10px;padding:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;break-inside:avoid;">
                  <img src="${qrCache[mod.appraisal_file_url]}" alt="QR Avaliação" style="width:80px;height:80px;border:1px solid #e5e7eb;background:#fff;padding:4px;border-radius:4px;flex-shrink:0;" />
                  <div style="flex:1;min-width:0;">
                    <p style="font-size:10px;font-weight:700;color:#2563eb;margin-bottom:2px;">Avaliação CEF</p>
                    <p style="font-size:9px;color:#6b7280;">Aponte a câmera no QR Code para acessar o laudo de avaliação.</p>
                    <p style="font-size:8px;color:#3b82f6;margin-top:2px;word-break:break-all;">${escapeHtml(mod.appraisal_file_url)}</p>
                  </div>
                </div>`
            : '';

        const mcmvHtml = faixas.length
            ? `<div class="mcmv-row-print">
                ${faixas.map(f => `
                  <div class="mcmv-item-print">
                    <span class="field-label">${escapeHtml(FAIXA_NAMES[f.faixa] ?? `Faixa ${f.faixa}`)}</span>
                    <div class="mcmv-values">
                      ${f.appraisal_value != null ? `<span>Avaliação: <strong>${fmtCurrency(f.appraisal_value)}</strong></span>` : ''}
                      ${f.appraisal_ceiling != null ? `<span>Teto: <strong>${fmtCurrency(f.appraisal_ceiling)}</strong></span>` : ''}
                      ${f.avg_ticket != null ? `<span class="accent">Ticket Médio: <strong>${fmtCurrency(f.avg_ticket)}</strong></span>` : ''}
                    </div>
                  </div>`).join('')}
               </div>
               ${note('Obs. Avaliação', mod.appraisal_note)}
               ${appraisalQrHtml}`
            : `${note('Obs. Avaliação', mod.appraisal_note)}${appraisalQrHtml}`;

        // ── Documentação ────────────────────────────────────────────────────
        const docsItems = [];
        if (mod.cef_package_paid_by || mod.cef_package_avg_value != null) {
            const val = mod.cef_package_avg_value != null ? fmtCurrency(mod.cef_package_avg_value) : '<span class="empty">Valor não informado</span>';
            const payer = mod.cef_package_paid_by ? `<span style="display:block;color:#9ca3af;font-size:9px;margin-top:2px;">Pago por: <strong style="color:#4b5563;">${mod.cef_package_paid_by === 'menin' ? 'Menin' : 'Cliente'}</strong></span>` : '';
            docsItems.push(field('Pacote CEF', `${val}${payer}`));
        }
        if (mod.itbi_exempt) {
            docsItems.push(field('ITBI', `<span style="color:#059669;font-weight:700;">Isento</span>`));
        } else if (mod.itbi_avg_value != null) {
            docsItems.push(field('ITBI', `${fmtCurrency(mod.itbi_avg_value)}<span style="display:block;color:#9ca3af;font-size:9px;margin-top:2px;">Pago por: <strong style="color:#4b5563;">Cliente</strong></span>`));
        }
        if (mod.cartorio_prenotacao_value != null) {
            docsItems.push(field('Cartório — Prenotação', fmtCurrency(mod.cartorio_prenotacao_value)));
        }
        if (mod.cartorio_registration_value != null) {
            const payer = mod.cartorio_paid_by ? `<span style="display:block;color:#9ca3af;font-size:9px;margin-top:2px;">Pago por: <strong style="color:#4b5563;">${mod.cartorio_paid_by === 'menin' ? 'Menin' : 'Cliente'}</strong></span>` : '';
            docsItems.push(field('Cartório — Registro', `${fmtCurrency(mod.cartorio_registration_value)}${payer}`));
        }

        const itbiQrHtml = (mod.itbi_exempt && mod.itbi_exemption_doc_url && qrCache[mod.itbi_exemption_doc_url])
            ? `<div style="margin-top:10px;display:flex;align-items:center;gap:10px;padding:10px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;break-inside:avoid;">
                  <img src="${qrCache[mod.itbi_exemption_doc_url]}" alt="QR Isenção ITBI" style="width:80px;height:80px;border:1px solid #e5e7eb;background:#fff;padding:4px;border-radius:4px;flex-shrink:0;" />
                  <div style="flex:1;min-width:0;">
                    <p style="font-size:10px;font-weight:700;color:#059669;margin-bottom:2px;">Comprovante de Isenção do ITBI</p>
                    <p style="font-size:9px;color:#6b7280;">Aponte a câmera no QR Code para acessar o documento.</p>
                    <p style="font-size:8px;color:#10b981;margin-top:2px;word-break:break-all;">${escapeHtml(mod.itbi_exemption_doc_url)}</p>
                  </div>
                </div>`
            : '';

        const cs = computeCostSummary(mod);
        const renderCostList = (items, totalLabel, totalVal) => `
            <div style="background:#fff;border:1px solid #f3f4f6;border-radius:8px;padding:10px;">
              <p style="font-size:8px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">${escapeHtml(totalLabel)}</p>
              ${items.length ? items.map(it => `<div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:3px;"><span style="color:#6b7280;">${escapeHtml(it.label)}</span><strong style="color:#1f2937;">${fmtCurrency(it.value)}</strong></div>`).join('') : '<p style="font-size:9px;color:#9ca3af;font-style:italic;">—</p>'}
              <div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px solid #f3f4f6;font-size:10px;"><span style="font-weight:700;color:#374151;">Total</span><strong style="color:#2563eb;">${fmtCurrency(totalVal)}</strong></div>
            </div>`;

        const costSummaryHtml = `
            <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;break-inside:avoid;">
              ${renderCostList(cs.menin, 'Pago pela Menin', cs.totalMenin)}
              ${renderCostList(cs.client, 'Pago pelo Cliente', cs.totalClient)}
            </div>`;

        const hasDocs = docsItems.length || itbiQrHtml || cs.menin.length || cs.client.length;
        const docsBody = `${docsItems.length ? fieldRow(...docsItems) : ''}${itbiQrHtml}${costSummaryHtml}`;

        let unidadesHtml = '';
        if (blocos.length) {
            let disp=0, res=0, vend=0, bloq=0, total=0;

            for (const b of blocos) {
                for (const u of (b.unidades ?? [])) {
                    total++;
                    const st = classifyUnitPrint(u);
                    if (st.isSold) vend++;
                    else if (st.isReserved) res++;
                    else if (st.isBlocked) bloq++;
                    else disp++;
                }
            }

            unidadesHtml = `
                <div class="card avoid-break">
                  <div class="card-header">
                    <span class="card-icon">🏠</span>
                    Unidades
                    <span class="snapshot-label">❄️ Congelado em ${escapeHtml(fmtSnap(mod.unit_snapshot.capturedAt))}</span>
                  </div>
                  <div class="card-body">
                    <div class="unit-summary">
                      <span><span class="dot green"></span><strong>${disp}</strong> Disponíveis</span>
                      <span><span class="dot yellow"></span><strong>${res}</strong> Reservadas</span>
                      <span><span class="dot red"></span><strong>${vend}</strong> Vendidas</span>
                      ${bloq > 0 ? `<span><span class="dot gray"></span><strong>${bloq}</strong> Bloqueadas</span>` : ''}
                      <span class="muted">· Total: ${total}</span>
                    </div>

                    ${blocos.map(bloco => `
                      <div class="block-unit-group">
                        <p class="block-title">
                          ${escapeHtml(bloco.nome)}
                          <span>· ${(bloco.unidades??[]).length} unid.</span>
                        </p>

                        <div class="unit-row-print">
                          ${(bloco.unidades??[]).map(u => {
                              const st = classifyUnitPrint(u);
                              const statusClass = st.isSold ? 'unit-sold' : st.isReserved ? 'unit-reserved' : st.isBlocked ? 'unit-blocked' : 'unit-available';
                              return `<div class="unit-card-print ${statusClass}">
                                <p>${escapeHtml(u.nome)}</p>
                                ${u.valor_total != null ? `<span class="unit-price">${fmtShort(u.valor_total)}</span>` : ''}
                                ${u.area_privativa ? `<span class="unit-area">${Number(u.area_privativa).toFixed(2)}m²</span>` : ''}
                              </div>`;
                          }).join('')}
                        </div>
                      </div>`).join('')}
                  </div>
                </div>`;
        }

        const sepStyle = idx > 0
            ? `<div class="module-sep">
                <div></div>
                <span>${escapeHtml(mod.module_name || `Módulo ${idx + 1}`)}</span>
                <div></div>
               </div>`
            : '';

        return `
            ${sepStyle}

            <div class="kpi-row-print">
              ${kpis.join('')}
            </div>

            ${card('🏢', `Produto — ${mod.module_name || '—'}`, prodBody)}

            <div class="spacer"></div>

            ${card('⚙️', 'Operacional', opHtml)} 

            <div class="spacer"></div>

            ${card('🤝', 'Condições de Negociação', negocBody)}

            <div class="spacer"></div>

            ${hasDocs ? `${card('📋', 'Documentação', docsBody)}<div class="spacer"></div>` : ''}

            ${hasMcmv ? `${card('🏠', 'Avaliação MCMV', mcmvHtml)}<div class="spacer"></div>` : ''}

            <div class="spacer"></div>

            ${card('🏷️', 'Tabelas de Preço', tablesHtml)}

            <div class="spacer"></div>

            ${card('📣', 'Campanhas', campHtml)}

            ${unidadesHtml}`;
    };

    const statusLabel = props.wasRejected && detail?.status === 'draft'
        ? 'Reprovada'
        : (STATUS_LABELS_PRINT[detail?.status] ?? detail?.status ?? '—');

    const statusColor = props.wasRejected && detail?.status === 'draft'
        ? '#7f1d1d|#fee2e2'
        : (STATUS_COLORS[detail?.status] ?? '#374151|#f3f4f6');

    const [sfg, sbgc] = statusColor.split('|');
    const monthLabel = fmtMonth(detail?.reference_month);

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Ficha Comercial — ${escapeHtml(enterprise.nome ?? '')} — ${escapeHtml(monthLabel)}</title>
<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  @page {
    size: A4 portrait;
    margin: 12mm 14mm 16mm 14mm;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 10px;
    color: #111827;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .accent-bar {
    height: 5px;
    background: linear-gradient(90deg, #1d4ed8 0%, #3b82f6 60%, #93c5fd 100%);
  }

  .header {
    padding: 14px 20px 12px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .eyebrow {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: #1d4ed8;
    margin-bottom: 4px;
  }

  .enterprise-name {
    font-size: 18px;
    font-weight: 900;
    color: #111827;
    line-height: 1.2;
  }

  .chip-row {
    margin-top: 6px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 600;
    background: #f3f4f6;
    color: #4b5563;
  }

  .status-chip {
    background: ${sbgc};
    color: ${sfg};
  }

  .meta-right {
    text-align: right;
    flex-shrink: 0;
  }

  .meta-right p {
    font-size: 9px;
    color: #6b7280;
  }

  .content {
    padding: 14px 20px;
  }

  .spacer {
    height: 10px;
  }

  .kpi-row-print {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
    width: 100%;
  }

  .kpi-row-print > .kpi {
    flex: 1 1 105px;
    min-width: 105px;
  }

  .kpi {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 54px;
    padding: 8px 6px;
    border-radius: 8px;
    text-align: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }

  .kpi-label {
    font-size: 7.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: #9ca3af;
    margin-bottom: 3px;
  }

  .kpi-val {
    font-size: 14px;
    font-weight: 900;
    color: #1e40af;
    line-height: 1.05;
  }

  .kpi-sub {
    font-size: 8px;
    color: #9ca3af;
    margin-top: 3px;
  }

  .empty-kpi {
    color: #cbd5e1;
  }

  .card-row-print {
    display: flex !important;
    flex-direction: row !important;
    align-items: flex-start !important; /* Garante que um card não estique o outro */
    gap: 10px !important;
    width: 100% !important;
  }

  .card-row-print > .card {
    flex: 1 !important; /* Faz os dois cards dividirem o espaço 50/50 */
    min-width: 0 !important; /* Evita que o card estoure a largura */
  }

  .card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
    background: #ffffff;
  }

  .avoid-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: #374151;
    background: #f8fafc;
    border-bottom: 1px solid #e5e7eb;
  }

  .card-icon {
    color: #3b82f6;
  }

  .card-body {
    padding: 10px 14px;
  }

.field-row {
    display: flex !important;
    flex-direction: row !important; /* Força ficar um ao lado do outro */
    flex-wrap: wrap !important;
    gap: 8px 15px !important;
    width: 100% !important;
}

.field-row > .field {
    /* Divide em 3 colunas iguais no PDF */
    flex: 1 1 30% !important; 
    min-width: 30% !important;
    margin-bottom: 5px !important;
}
  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .field-label {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: #9ca3af;
  }

  .field-value {
    font-size: 10px;
    font-weight: 600;
    color: #111827;
    line-height: 1.35;
    word-break: break-word;
  }

  .accent {
    color: #2563eb;
    font-weight: 700;
  }

  .empty,
  .empty-line {
    color: #bbbbbb;
    font-style: italic;
  }

  .empty-line {
    font-size: 10px;
  }

  .note {
    padding: 8px 12px;
    border-radius: 5px;
    background: #f9fafb;
    border-left: 3px solid #d1d5db;
    margin-top: 8px;
  }

  .note-label {
    font-size: 7px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: #9ca3af;
    display: block;
  }

  .note p {
    font-size: 10px;
    color: #374151;
    margin-top: 3px;
    line-height: 1.35;
  }

  .subsidy {
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 6px;
    background: #d1fae5;
    border: 1px solid #6ee7b7;
    color: #065f46;
    font-size: 10px;
    font-weight: 600;
  }

  .muted-badge {
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 6px;
    background: #f3f4f6;
    color: #9ca3af;
    font-size: 10px;
  }

  .section-sublabel {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: #9ca3af;
    margin-bottom: 6px;
  }

  .manual-label {
    margin-top: 10px;
  }

  .price-row,
  .manual-row {
    padding: 7px 10px;
    border-radius: 6px;
    margin-bottom: 5px;
  }

  .price-row {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
  }

  .manual-row {
    background: #fff7ed;
    border: 1px solid #fed7aa;
  }

  .price-row-top,
  .manual-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .price-name,
  .manual-name {
    font-size: 11px;
    font-weight: 700;
    color: #1f2937;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .price-meta,
  .manual-date {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    font-size: 8px;
    color: #9ca3af;
  }

  .badge-green {
    background: #d1fae5;
    color: #065f46;
    font-size: 8px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
  }

  .price-stats {
    font-size: 9px;
    color: #6b7280;
    margin-top: 4px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .manual-note {
    font-size: 9px;
    color: #6b7280;
    margin-top: 3px;
    font-style: italic;
  }

  .op-row-print {
    display: flex !important;
    flex-direction: row !important;
    flex-wrap: wrap !important;
    gap: 10px !important;
  }

  .op-item-print {
    flex: 1 1 45% !important;
    min-width: 45% !important;
  }

  .op-item-print {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .op-icon-print {
    font-size: 13px;
    margin-top: 1px;
    flex-shrink: 0;
  }

  .op-text-print {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .op-sub-print {
    display: block;
    font-size: 9px;
    font-weight: 400;
    color: #9ca3af;
    line-height: 1.25;
    margin-top: 1px;
    word-break: break-word;
  }

  .campaign-row-print {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    width: 100%;
  }

  .campaign-row-print > .campaign-card-print {
    flex: 1 1 180px;
    min-width: 180px;
  }

  .campaign-card-print {
    padding: 10px;
    border-radius: 6px;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
  }

  .campaign-title {
    font-size: 11px;
    font-weight: 700;
    color: #111827;
  }

  .campaign-desc {
    font-size: 9px;
    color: #6b7280;
    margin-top: 3px;
    line-height: 1.3;
  }

  .campaign-meta {
    display: flex;
    gap: 10px;
    margin-top: 6px;
    flex-wrap: wrap;
    align-items: center;
    font-size: 9px;
    color: #9ca3af;
  }

  .campaign-value {
    font-size: 11px;
    font-weight: 700;
    color: #2563eb;
  }

  .campaign-rules {
    font-size: 9px;
    color: #6b7280;
    margin-top: 6px;
    border-top: 1px solid #e5e7eb;
    padding-top: 6px;
    font-style: italic;
    line-height: 1.3;
  }

  .mcmv-row-print {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 20px;
  }

  .mcmv-row-print > .mcmv-item-print {
    flex: 1 1 180px;
    min-width: 180px;
  }

  .mcmv-item-print {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mcmv-values {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 2px;
    font-size: 10px;
    color: #374151;
  }

  .snapshot-label {
    margin-left: auto;
    font-size: 9px;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: #9ca3af;
  }

  .unit-summary {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 12px;
    font-size: 10px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    display: inline-block;
    margin-right: 4px;
  }

  .green { background: #4ade80; }
  .yellow { background: #facc15; }
  .red { background: #f87171; }
  .gray { background: #9ca3af; }
  .muted { color: #9ca3af; }

  .block-unit-group {
    margin-bottom: 14px;
  }

  .block-title {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .05em;
    color: #6b7280;
    margin-bottom: 6px;
  }

  .block-title span {
    font-weight: 400;
    text-transform: none;
  }

  .unit-row-print {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }

  .unit-row-print > .unit-card-print {
    flex: 1 1 58px;
    min-width: 58px;
    max-width: 92px;
  }

  .unit-card-print {
    border-radius: 4px;
    border: 1px solid #e5e7eb;
    background: #f9fafb;
    padding: 3px 2px;
    text-align: center;
    font-size: 9px;
    line-height: 1.3;
  }

  .unit-card-print p {
    font-weight: 700;
    color: #1f2937;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .unit-price {
    display: block;
    color: #2563eb;
    font-weight: 700;
    margin-top: 1px;
    font-size: 8px;
  }

  .unit-area {
    display: block;
    color: #9ca3af;
    margin-top: 1px;
    font-size: 7px;
  }

  .unit-available {
    border-color: #bbf7d0;
    background: #f0fdf4;
  }

  .unit-reserved {
    border-color: #fef08a;
    background: #fefce8;
  }

  .unit-sold {
    border-color: #fecaca;
    background: #fef2f2;
  }

  .unit-blocked {
    border-color: #e5e7eb;
    background: #f9fafb;
  }

  .module-sep {
    margin: 20px 0 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    page-break-before: always;
  }

  .module-sep div {
    flex: 1;
    height: 1px;
    background: #bfdbfe;
  }

  .module-sep span {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: #3b82f6;
    padding: 0 12px;
  }

  .footer {
    margin-top: 14px;
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: #9ca3af;
  }

  @media print {
    body {
      background: #ffffff;
    }

    .no-print {
      display: none !important;
    }
  }
</style>
</head>
<body>
  <div class="accent-bar"></div>

  <div class="header">
    <div>
      <p class="eyebrow">Ficha Comercial</p>
      <h1 class="enterprise-name">${escapeHtml(enterprise.nome ?? '—')}</h1>
      <div class="chip-row">
        ${enterprise.cidade ? `<span class="chip">📍 ${escapeHtml(enterprise.cidade)}</span>` : ''}
        <span class="chip">📅 ${escapeHtml(monthLabel)}</span>
        <span class="chip status-chip">${escapeHtml(statusLabel)}</span>
        ${props.wasRejected && detail?.status === 'draft' && props.rejectionNote
            ? `<span class="chip" style="background:#fee2e2;color:#7f1d1d;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(props.rejectionNote)}">Motivo: ${escapeHtml(props.rejectionNote)}</span>`
            : ''}
      </div>
    </div>

    <div class="meta-right">
      <p style="font-weight:700;color:#374151">Menin Office</p>
      <p style="margin-top:2px">${escapeHtml(fmtFull(now))}</p>
    </div>
  </div>

  <div class="content">
    ${modules.map((mod, idx) => renderModule(mod, idx)).join('')}

    <div class="footer">
      <span>Menin Office — Ficha Comercial Confidencial</span>
      <span>Gerado em ${escapeHtml(fmtFull(now))}</span>
    </div>
  </div>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');

    if (!printWin) {
        alert('Popup bloqueado. Permita popups para este site e tente novamente.');
        return;
    }

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();

    printWin.onload = () => {
        setTimeout(() => {
            printWin.focus();
            printWin.print();
            printWin.addEventListener('afterprint', () => printWin.close());
        }, 400);
    };
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
    @apply bg-surface-raised rounded-2xl border border-line shadow-sm overflow-hidden;
}
.doc-header-body { @apply px-6 py-5; }
.doc-eyebrow { @apply text-xs font-bold text-blue-500 uppercase tracking-widest mb-1; }
.doc-title   { @apply text-2xl font-bold text-ink leading-tight; }
.doc-meta-chip {
    @apply inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium
           bg-surface-sunken text-ink-muted;
}

/* ── KPIs ───────────────────────────────────────────────────────────────────── */
.kpi-row {
    @apply flex flex-wrap gap-3;
}
.kpi-row > .kpi-card {
    flex: 1 1 140px;
    min-width: 140px;
}
.kpi-row-print {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}
.kpi-row-print .kpi {
  flex: 1 1 110px;
  min-width: 110px;
}
.kpi-row.compact > .kpi-card {
    flex: 1 1 120px;
    min-width: 120px;
}
.kpi-card  {
    @apply flex flex-col items-center justify-center p-4 rounded-2xl text-center
           bg-surface-raised border border-line shadow-sm;
}
.kpi-label { @apply text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-1; }
.kpi-value { @apply text-2xl font-black text-ink leading-none; }
.kpi-value.kpi-empty { @apply text-ink-subtle; }
.kpi-sub   { @apply text-xs text-ink-subtle mt-1; }
.kpi-sub-empty { @apply text-ink-subtle italic; }

/* ── Linhas flex responsivas ────────────────────────────────────────────────── */
.responsive-card-row {
    @apply flex flex-wrap gap-4;
}
.responsive-card-row > .info-card {
    flex: 1 1 360px;
    min-width: min(100%, 360px);
}
.campaign-row {
    @apply flex flex-wrap gap-3;
}
.campaign-row > .campaign-card {
    flex: 1 1 260px;
    min-width: min(100%, 260px);
}
.unit-row {
    @apply flex flex-wrap gap-1;
}
.unit-row > div {
    flex: 1 1 74px;
    min-width: 74px;
    max-width: 120px;
}

/* ── Cards de informação ─────────────────────────────────────────────────────── */
.info-card {
    @apply bg-surface-raised rounded-2xl border border-line shadow-sm overflow-hidden;
}
.info-card-header {
    @apply flex items-center gap-2 px-5 py-3 text-xs font-bold text-ink-muted
           uppercase tracking-wider bg-gray-50/70 dark:bg-gray-800/40
           border-b border-line;
}
.info-card-body { @apply p-5; }

/* ── Grade de campos ─────────────────────────────────────────────────────────── */
.field-grid { @apply grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3; }
.field-item { @apply flex flex-col; }
.field-label { @apply text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-0.5; }
.field-value { @apply text-sm font-semibold text-ink; }
.field-value.accent { @apply text-accent; }
.field-value.field-empty { @apply text-ink-subtle italic font-normal; }

/* ── Linha vazia de info ─────────────────────────────────────────────────────── */
.empty-info-row {
    @apply flex items-center gap-2 text-xs text-ink-subtle italic py-1;
}

/* ── Subsídio ────────────────────────────────────────────────────────────────── */
.subsidy-badge {
    @apply inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs
           bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400
           border border-emerald-200 dark:border-emerald-800;
}

/* ── Sublabel ────────────────────────────────────────────────────────────────── */
.section-sublabel {
    @apply text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-2;
}

/* ── Tabela de preço row ─────────────────────────────────────────────────────── */
.price-table-row {
    @apply flex gap-2 px-3 py-2 rounded-lg
           bg-surface-sunken/40 border border-line;
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
.op-grid  { @apply grid grid-cols-1 sm:grid-cols-2 gap-4; }
.op-item  { @apply flex items-start gap-3; }
.op-icon  { @apply text-blue-400 text-sm mt-0.5 w-4 flex-shrink-0; }

/* ── Campanhas ───────────────────────────────────────────────────────────────── */
.campaign-card {
    @apply p-4 rounded-xl border border-line
           bg-gray-50/60 dark:bg-gray-800/20;
}
.campaign-value { @apply text-sm font-bold text-accent; }

/* ── Notas ───────────────────────────────────────────────────────────────────── */
.note-block {
    @apply p-3 rounded-lg bg-surface-sunken/40 border-l-2 border-line;
}
.note-block p { @apply text-sm text-ink-muted mt-0.5; }
.note-label   { @apply block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider; }

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
    @apply text-xs font-bold text-accent uppercase tracking-widest px-3;
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

    /* KPIs — flex com wrap */
    .kpi-row {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 5px !important;
        padding: 8px 20px !important;
    }
    .kpi-row > .kpi-card {
        flex: 1 1 95px !important;
        min-width: 95px !important;
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

    .responsive-card-row {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
        margin: 0 20px 8px !important;
    }
    .responsive-card-row > .info-card {
        flex: 1 1 250px !important;
        min-width: 250px !important;
        margin: 0 !important;
    }
    .campaign-row {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
    }
    .campaign-row > .campaign-card {
        flex: 1 1 180px !important;
        min-width: 180px !important;
    }
    .unit-row {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 3px !important;
    }
    .unit-row > div {
        flex: 1 1 58px !important;
        min-width: 58px !important;
        max-width: 90px !important;
    }

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
