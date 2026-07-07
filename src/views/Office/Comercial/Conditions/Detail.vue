<template>
  <div class="min-h-full bg-surface">

    <!-- Toast -->
    <transition name="fade">
      <div
        v-if="toast.show"
        :class="[
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        ]"
      >
        <i :class="toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'" class="fas"></i>
        {{ toast.message }}
      </div>
    </transition>

    <!-- Modal: Desbloquear (approved → draft) -->
    <transition name="fade">
      <div
        v-if="showUnlockModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="showUnlockModal = false"
      >
        <div class="bg-surface-raised rounded-2xl shadow-2xl w-full max-w-md border border-line">
          <div class="flex items-center justify-between px-6 py-4 border-b border-line">
            <div class="flex items-center gap-2">
              <i :class="isClosed ? 'fa-rotate-left text-emerald-500' : 'fa-pen-to-square text-amber-500'" class="fas"></i>
              <h2 class="text-base font-bold text-ink">
                {{ isClosed ? 'Reabrir Empreendimento' : 'Editar Ficha Autorizada' }}
              </h2>
            </div>
            <button @click="showUnlockModal = false" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-surface-hover transition">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div v-if="isClosed" class="flex items-start gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm">
              <i class="fas fa-info-circle flex-shrink-0 mt-0.5"></i>
              <p>
                Reabrir o empreendimento volta esta ficha para <strong>Rascunho</strong>. A geração mensal automática vai retomar a partir do próximo ciclo.
              </p>
            </div>
            <div v-else class="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-sm">
              <i class="fas fa-exclamation-triangle flex-shrink-0 mt-0.5"></i>
              <p>
                Ao confirmar a edição, esta ficha <strong>perde a autorização</strong>.
                Ela voltará ao status <strong>Rascunho</strong> e precisará ser enviada para autorização novamente.
              </p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                {{ isClosed ? 'Motivo da reabertura (opcional)' : 'Motivo da edição (opcional)' }}
              </label>
              <textarea
                v-model="unlockNote"
                rows="3"
                :placeholder="isClosed ? 'Ex: Empreendimento retomado...' : 'Ex: Correção no valor de comissão...'"
                class="w-full px-3.5 py-2.5 text-sm text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/15 transition resize-none"
              />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 pb-5">
            <button @click="showUnlockModal = false" class="px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-gray-800 dark:hover:text-white transition">
              Cancelar
            </button>
            <button
              @click="handleUnlock"
              :disabled="actionLoading"
              :class="[
                'flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition',
                isClosed ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'
              ]"
            >
              <i :class="isClosed ? 'fa-rotate-left' : 'fa-pen-to-square'" class="fas text-xs"></i>
              {{ actionLoading ? 'Processando...' : (isClosed ? 'Confirmar reabertura' : 'Confirmar edição') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modal: Cancelar Autorização (pending_approval → draft) -->
    <transition name="fade">
      <div
        v-if="showCancelApprovalModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="showCancelApprovalModal = false"
      >
        <div class="bg-surface-raised rounded-2xl shadow-2xl w-full max-w-md border border-line">
          <div class="flex items-center justify-between px-6 py-4 border-b border-line">
            <div class="flex items-center gap-2">
              <i class="fas fa-ban text-red-500"></i>
              <h2 class="text-base font-bold text-ink">Cancelar Autorização</h2>
            </div>
            <button @click="showCancelApprovalModal = false" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-surface-hover transition">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <div class="flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300 text-sm">
              <i class="fas fa-exclamation-triangle flex-shrink-0 mt-0.5"></i>
              <p>
                Isso irá <strong>cancelar a autorização</strong> em andamento.
                A ficha voltará ao status <strong>Rascunho</strong> e poderá ser editada e reenviada.
              </p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">Motivo do cancelamento (opcional)</label>
              <textarea
                v-model="cancelApprovalNote"
                rows="3"
                placeholder="Ex: Necessário ajustar valor de entrada..."
                class="w-full px-3.5 py-2.5 text-sm text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/15 transition resize-none"
              />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 pb-5">
            <button @click="showCancelApprovalModal = false" class="px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-gray-800 dark:hover:text-white transition">
              Voltar
            </button>
            <button
              @click="handleCancelApproval"
              :disabled="actionLoading"
              class="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition"
            >
              <i class="fas fa-ban text-xs"></i>
              {{ actionLoading ? 'Cancelando...' : 'Cancelar Autorização' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modal: Salvar em ficha Autorizada -->
    <transition name="fade">
      <div
        v-if="showSaveApprovedModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="showSaveApprovedModal = false"
      >
        <div class="bg-surface-raised rounded-2xl shadow-2xl w-full max-w-md border border-line">
          <div class="flex items-center justify-between px-6 py-4 border-b border-line">
            <div class="flex items-center gap-2">
              <i class="fas fa-triangle-exclamation text-amber-500"></i>
              <h2 class="text-base font-bold text-ink">Atenção — Ficha Autorizada</h2>
            </div>
            <button @click="showSaveApprovedModal = false" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-surface-hover transition">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>
          <div class="px-6 py-5">
            <div class="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-sm">
              <i class="fas fa-exclamation-triangle flex-shrink-0 mt-0.5"></i>
              <p>
                Salvar alterações em uma ficha <strong>Autorizada</strong> irá <strong>cancelar a autorização</strong> e reverter ao status <strong>Rascunho</strong>.
                Será necessário enviar para autorização novamente.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 pb-5">
            <button @click="showSaveApprovedModal = false" class="px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-gray-800 dark:hover:text-white transition">
              Cancelar
            </button>
            <button
              @click="handleConfirmSaveApproved"
              :disabled="actionLoading"
              class="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 disabled:opacity-50 transition"
            >
              <i class="fas fa-floppy-disk text-xs"></i>
              {{ actionLoading ? 'Salvando...' : 'Desbloquear e Salvar' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modal: Encerrar Empreendimento (dupla validação) -->
    <transition name="fade">
      <div
        v-if="showCloseModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="closeCloseModal"
      >
        <div class="bg-surface-raised rounded-2xl shadow-2xl w-full max-w-md border border-line">
          <div class="flex items-center justify-between px-6 py-4 border-b border-line">
            <div class="flex items-center gap-2">
              <i class="fas fa-flag-checkered text-gray-500 dark:text-slate-400"></i>
              <h2 class="text-base font-bold text-ink">Encerrar Empreendimento</h2>
            </div>
            <button @click="closeCloseModal" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-surface-hover transition">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4">
            <!-- Etapa 1: aviso -->
            <div class="flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300 text-sm">
              <i class="fas fa-triangle-exclamation flex-shrink-0 mt-0.5"></i>
              <div>
                <p class="font-semibold mb-1">Esta ação não pode ser desfeita por usuários comuns.</p>
                <p>
                  Encerrar o empreendimento significa que ele <strong>não vai mais evoluir</strong>:
                  esta ficha vira histórico imutável e <strong>nenhuma nova ficha mensal será gerada</strong> automaticamente.
                </p>
              </div>
            </div>

            <!-- Motivo -->
            <div>
              <label class="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                Motivo do encerramento (opcional)
              </label>
              <textarea
                v-model="closeNote"
                rows="2"
                placeholder="Ex: Empreendimento finalizado, todas as unidades vendidas..."
                class="w-full px-3.5 py-2.5 text-sm text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/15 transition resize-none"
              />
            </div>

            <!-- Etapa 2: dupla validação por digitação -->
            <div>
              <label class="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                Para confirmar, digite <strong class="text-red-600 dark:text-red-400 tracking-widest">ENCERRAR</strong>
              </label>
              <input
                v-model="closeConfirmation"
                type="text"
                placeholder="ENCERRAR"
                class="w-full px-3.5 py-2.5 text-sm font-mono text-ink bg-surface-raised/60 border-2 rounded-md shadow-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 transition"
                :class="closeConfirmation === 'ENCERRAR'
                  ? 'border-emerald-500 focus:border-emerald-600 focus:ring-emerald-500/20'
                  : 'border-red-300 dark:border-red-800 focus:border-red-500 focus:ring-red-500/15'"
              />
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 pb-5">
            <button @click="closeCloseModal" class="px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-gray-800 dark:hover:text-white transition">
              Cancelar
            </button>
            <button
              @click="handleCloseCondition"
              :disabled="actionLoading || closeConfirmation !== 'ENCERRAR'"
              class="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <i :class="actionLoading ? 'fa-spinner fa-spin' : 'fa-flag-checkered'" class="fas text-xs"></i>
              {{ actionLoading ? 'Encerrando...' : 'Encerrar definitivamente' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Modal: Vincular avulsa ao CV -->
    <transition name="fade">
      <div
        v-if="showLinkCvModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="showLinkCvModal = false"
      >
        <div class="bg-surface-raised rounded-2xl shadow-2xl w-full max-w-lg border border-line max-h-[85vh] flex flex-col">
          <div class="flex items-center justify-between px-6 py-4 border-b border-line">
            <div class="flex items-center gap-2">
              <i class="fas fa-link text-teal-500"></i>
              <h2 class="text-base font-bold text-ink">Vincular ao empreendimento do CV</h2>
            </div>
            <button @click="showLinkCvModal = false" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-surface-hover transition">
              <i class="fas fa-times text-sm"></i>
            </button>
          </div>
          <div class="px-6 py-5 space-y-4 overflow-y-auto">
            <div class="flex items-start gap-3 p-3.5 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl text-teal-800 dark:text-teal-300 text-sm">
              <i class="fas fa-circle-info flex-shrink-0 mt-0.5"></i>
              <p>Isto promove <strong>toda a série</strong> desta avulsa ({{ detail.history?.length || 1 }} ficha(s)) para o empreendimento escolhido. O histórico é preservado e nada é apagado.</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">Empreendimento do CV</label>
              <select
                v-model="linkCvEnterpriseId"
                @change="onLinkEnterpriseChange"
                class="w-full px-3.5 py-2.5 text-sm text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition"
              >
                <option :value="null">Selecionar empreendimento...</option>
                <option v-for="e in cvEnterprises" :key="e.idempreendimento" :value="e.idempreendimento">{{ e.nome }}</option>
              </select>
            </div>
            <div v-if="linkCvEnterpriseId && localModules.length">
              <label class="block text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">Mapear módulos às etapas <span class="normal-case font-normal text-ink-subtle">(opcional)</span></label>
              <div class="space-y-2">
                <div v-for="mod in localModules" :key="mod.id ?? mod.module_name" class="flex items-center gap-2">
                  <span class="text-sm text-ink flex-1 min-w-0 truncate">{{ mod.module_name || 'Sem nome' }}</span>
                  <i class="fas fa-arrow-right text-xs text-ink-subtle flex-shrink-0"></i>
                  <select
                    v-model="linkModuleMap[mod.id]"
                    :disabled="!mod.id"
                    class="flex-1 min-w-0 px-3 py-2 text-sm text-ink bg-surface-raised/60 border border-line rounded-md shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 transition disabled:opacity-50"
                  >
                    <option :value="null">Manter livre</option>
                    <option v-for="s in linkCvStages" :key="s.idetapa" :value="s.idetapa">{{ s.nome }}</option>
                  </select>
                </div>
              </div>
            </div>
            <div v-if="linkError" class="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-xs">
              <i class="fas fa-exclamation-triangle flex-shrink-0 mt-0.5"></i>
              <span>{{ linkError }}</span>
            </div>
          </div>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-line">
            <button @click="showLinkCvModal = false" class="px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-gray-800 dark:hover:text-white transition">
              Cancelar
            </button>
            <button
              @click="handleLinkToCv"
              :disabled="!linkCvEnterpriseId || linkLoading"
              class="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 transition"
            >
              <i :class="linkLoading ? 'fa-spinner fa-spin' : 'fa-link'" class="fas text-xs"></i>
              {{ linkLoading ? 'Vinculando...' : 'Vincular série' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Erro de carregamento -->
    <div v-if="fetchError && !detail" class="flex flex-col items-center justify-center py-24 text-center px-4">
      <div class="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <i class="fas fa-exclamation-triangle text-red-500 text-xl"></i>
      </div>
      <p class="text-base font-semibold text-ink">Erro ao carregar ficha</p>
      <p class="text-sm text-ink-subtle mt-1 max-w-sm">{{ fetchError }}</p>
      <button @click="retryFetch" class="mt-5 flex items-center gap-2 px-5 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent-hover transition">
        <i class="fas fa-arrows-rotate text-xs"></i>
        Tentar novamente
      </button>
    </div>

    <!-- Carregando -->
    <div v-else-if="!detail && !fetchError" class="flex items-center justify-center py-24 text-gray-400 dark:text-slate-500">
      <i class="fas fa-spinner fa-spin text-2xl"></i>
    </div>

    <template v-if="detail">
      <!-- ─── Header ─────────────────────────────────────────────────────── -->
      <div ref="headerEl" class="bg-surface-raised border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div class="max-w-7xl mx-auto px-4">
          <!-- Top bar -->
          <div class="flex items-center justify-between pb-4 pt-6 gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <button @click="$router.back()" class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-surface-hover transition flex-shrink-0">
                <i class="fas fa-arrow-left text-sm"></i>
              </button>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <i v-if="isAvulsa" class="fas fa-cube text-gray-400 dark:text-slate-500 text-sm" title="Ficha avulsa (sem CV)"></i>
                  <h1 class="text-lg lg:text-xl font-bold text-ink truncate">
                    {{ headerTitle }}
                  </h1>
                  <!-- Badge: mostra "Reprovada" se foi rejeitada, senão status normal -->
                  <span v-if="wasRejected && detail.status === 'draft'"
                    class="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Reprovada
                  </span>
                  <span v-else :class="badgeClass(detail.status)" class="px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0">
                    {{ statusLabel(detail.status) }}
                  </span>
                  <span v-if="isAvulsa" class="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 flex-shrink-0">
                    Avulsa
                  </span>
                </div>
                <p class="text-xs text-ink-subtle">
                  <template v-if="!isAvulsa">{{ detail.enterprise?.cidade }} <span class="mx-1">·</span></template>
                  Ref: {{ formatMonth(detail.reference_month) }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              <!-- Navegação de mês (setas) -->
              <div v-if="detail.history?.length > 1" class="flex items-center gap-0.5 bg-surface-sunken rounded-lg p-0.5">
                <button
                  @click="olderItem && navigateToMonth(olderItem.id)"
                  :disabled="!olderItem"
                  class="w-7 h-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-hover disabled:opacity-30 disabled:cursor-default transition"
                  title="Mês anterior"
                >
                  <i class="fas fa-chevron-left text-xs"></i>
                </button>
                <span class="text-xs font-semibold text-ink px-2 min-w-[58px] text-center">{{ formatMonth(detail.reference_month) }}</span>
                <button
                  @click="newerItem && navigateToMonth(newerItem.id)"
                  :disabled="!newerItem"
                  class="w-7 h-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-hover disabled:opacity-30 disabled:cursor-default transition"
                  title="Próximo mês"
                >
                  <i class="fas fa-chevron-right text-xs"></i>
                </button>
              </div>

              <!-- Avulsa → Vincular ao CV (editores) -->
              <button
                v-if="isAvulsa && canEdit"
                @click="openLinkCv"
                title="Vincular esta série avulsa a um empreendimento do CV"
                class="flex items-center gap-2 px-3.5 py-2 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 text-xs font-semibold rounded-xl border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition"
              >
                <i class="fas fa-link text-xs"></i>
                <span class="hidden sm:inline">Vincular ao CV</span>
              </button>

              <!-- Ações por status (conforme permissão do usuário) -->
              <!-- draft → Enviar para Autorização (editores) -->
              <button
                v-if="detail.status === 'draft' && canEdit"
                @click="handleSubmitForApproval"
                :disabled="actionLoading"
                class="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                <i class="fas fa-paper-plane text-xs"></i>
                <span class="hidden sm:inline">Enviar para Autorização</span>
              </button>

              <!-- pending_approval → Autorizar (autorizadores) -->
              <button
                v-if="detail.status === 'pending_approval' && canAuthorize"
                @click="handleAuthorize"
                :disabled="actionLoading"
                class="flex items-center gap-2 px-3.5 py-2 bg-green-600 text-white text-xs font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50 transition"
              >
                <i :class="actionLoading ? 'fa-spinner fa-spin' : 'fa-circle-check'" class="fas text-xs"></i>
                <span class="hidden sm:inline">Autorizar</span>
              </button>

              <!-- pending_approval → Cancelar Autorização (editores ou autorizadores) -->
              <button
                v-if="detail.status === 'pending_approval' && (canEdit || canAuthorize)"
                @click="showCancelApprovalModal = true"
                :disabled="actionLoading"
                class="flex items-center gap-2 px-3.5 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
              >
                <i class="fas fa-ban text-xs"></i>
                <span class="hidden sm:inline">Cancelar Autorização</span>
              </button>

              <!-- approved → Editar (= desbloquear) (autorizadores) -->
              <button
                v-if="detail.status === 'approved' && canAuthorize"
                @click="showUnlockModal = true"
                class="flex items-center gap-2 px-3.5 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl hover:bg-amber-600 transition"
              >
                <i class="fas fa-pen-to-square text-xs"></i>
                <span class="hidden sm:inline">Editar</span>
              </button>

              <!-- closed → Reabrir Empreendimento (autorizadores) -->
              <button
                v-if="detail.status === 'closed' && canAuthorize"
                @click="showUnlockModal = true"
                class="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition"
              >
                <i class="fas fa-rotate-left text-xs"></i>
                <span class="hidden sm:inline">Reabrir Empreendimento</span>
              </button>

              <!-- Encerrar Ficha (autorizadores, qualquer status exceto closed/pending_approval) -->
              <button
                v-if="detail.status !== 'closed' && detail.status !== 'pending_approval' && canAuthorize"
                @click="showCloseModal = true"
                :disabled="actionLoading"
                title="Encerrar empreendimento (finalização definitiva)"
                class="flex items-center gap-2 px-3.5 py-2 bg-surface-sunken text-ink text-xs font-semibold rounded-xl border border-line hover:bg-surface-sunken/70 transition"
              >
                <i class="fas fa-flag-checkered text-xs"></i>
                <span class="hidden sm:inline">Encerrar</span>
              </button>

              <!-- Salvar Tudo — quando editável ou approved (admin pode editar) -->
              <button
                v-if="canSave"
                @click="handleSaveAll"
                :disabled="saving || actionLoading"
                class="flex items-center gap-2 px-3.5 py-2 bg-accent text-white text-xs font-semibold rounded-xl hover:bg-accent-hover disabled:opacity-50 transition"
              >
                <i :class="saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'" class="fas"></i>
                <span class="hidden sm:inline">{{ saving ? 'Salvando...' : 'Salvar Tudo' }}</span>
              </button>
            </div>
          </div>

          <!-- Banner: Reprovada -->
          <div
            v-if="wasRejected && detail.status === 'draft'"
            class="flex items-start gap-2 mb-3 px-3 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-xs"
          >
            <i class="fas fa-ban flex-shrink-0 mt-0.5"></i>
            <div>
              <span class="font-semibold">Autorização reprovada.</span>
              <span v-if="rejectionNote" class="ml-1">{{ rejectionNote }}</span>
              <span class="ml-1 text-red-500 dark:text-red-500">Corrija as informações e envie novamente.</span>
            </div>
          </div>

          <!-- Banner: Autorizada -->
          <div
            v-else-if="detail.status === 'approved'"
            class="flex items-center gap-2 mb-3 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-xs"
          >
            <i class="fas fa-check-circle"></i>
            <span>
              Ficha autorizada.
              <template v-if="detail.approved_at"> Aprovada em {{ formatDateFull(detail.approved_at) }}.</template>
              <template v-if="canAuthorize"> Edições nesta ficha irão cancelar a autorização.</template>
            </span>
          </div>

          <!-- Banner: Em Autorização -->
          <div
            v-else-if="detail.status === 'pending_approval'"
            class="flex items-center gap-2 mb-3 px-3 py-2 bg-accent-soft border border-accent/30 rounded-lg text-accent text-xs"
          >
            <i class="fas fa-clock"></i>
            <span>
              Em autorização — aguardando um autorizador.
              <template v-if="canAuthorize"> Você pode autorizar esta ficha.</template>
            </span>
          </div>

          <!-- Banner: Encerrada -->
          <div
            v-else-if="detail.status === 'closed'"
            class="flex items-center gap-2 mb-3 px-3 py-2 bg-surface-sunken/60 border border-gray-300 dark:border-gray-700 rounded-lg text-ink-muted text-xs"
          >
            <i class="fas fa-flag-checkered"></i>
            <span>
              Empreendimento encerrado — esta ficha está congelada como histórico.
              <template v-if="canAuthorize"> Use "Reabrir" para retomar a evolução mensal.</template>
            </span>
          </div>

          <!-- Banner: alterações não salvas -->
          <div
            v-else-if="isDirty && !isLocked"
            class="flex items-center justify-between gap-2 mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-800 dark:text-amber-300 text-xs"
          >
            <div class="flex items-center gap-2">
              <i class="fas fa-circle-dot animate-pulse"></i>
              <span>Alterações não salvas — clique em <strong>Salvar Tudo</strong> para não perder os dados.</span>
            </div>
          </div>

          <!-- Tabs (views) -->
          <div class="flex gap-0 overflow-x-auto scrollbar-hide -mb-px">
            <button
              v-for="tab in visibleTabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition',
                activeTab === tab.id
                  ? 'border-blue-600 text-accent'
                  : 'border-transparent text-ink-muted hover:text-gray-700 dark:hover:text-gray-200'
              ]"
            >
              <i :class="tab.icon" class="text-xs"></i>
              {{ tab.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- ─── Corpo: conteúdo + índice flutuante (direita, estilo Academy) ── -->
      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="flex gap-4">
          <main class="flex-1 min-w-0">

            <!-- Navegação compacta (telas < xl, onde o índice flutuante não cabe) -->
            <div v-if="activeTab === 'modules' && localModules.length" class="xl:hidden mb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
              <button v-for="(mod, i) in localModules" :key="mod.id ?? i" @click="selectModule(i)" :class="['flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition', activeModuleIndex === i ? 'bg-accent-soft border-accent/30 text-accent' : 'border-line text-ink-muted bg-surface-raised']">
                <i :class="mod.idetapa ? 'fas fa-box' : 'fas fa-cube'" class="text-[10px]"></i>{{ mod.module_name || 'Novo módulo' }}
              </button>
            </div>
            <div v-if="activeTab === 'modules' && activeModule" class="xl:hidden mb-4 flex gap-1.5 overflow-x-auto scrollbar-hide">
              <button v-for="sec in moduleSections" :key="sec.id" @click="scrollToSection(sec.id)" :class="['px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition', activeSection === sec.id ? 'bg-accent-soft border-accent/30 text-accent' : 'border-line text-ink-muted bg-surface-raised']">{{ sec.label }}</button>
            </div>

        <!-- Módulos -->
        <div v-show="activeTab === 'modules'">
          <ModuleSection
            :modules="localModules"
            :hide-chrome="true"
            v-model:active-index="activeModuleIndex"
            :condition-id="detail.id"
            :condition-status="detail.status"
            :saving="saving"
            :readonly="isLocked"
            :price-tables="store.priceTables"
            :correspondents="store.correspondents"
            :office-users="store.officeUsers"
            :enterprise-options="enterpriseOptions"
            :enterprise-stages="detail.stages ?? []"
            :history="detail.history ?? []"
            :current-condition-id="detail.id"
            :condition-idempreendimento="detail.idempreendimento"
            @update:modules="onModulesChange"
            @save="handleSaveModules"
            @save-silent="handleSaveModulesSilent"
            @copy="handleCopyModule"
            @copy-from-enterprise="handleCopyFromEnterprise"
            @navigate-month="navigateToMonth"
            @delete-module="handleDeleteModule"
            @template-propagated="handleTemplatePropagated"
          />
        </div>

        <!-- Resumo / PDF -->
        <div v-show="activeTab === 'summary'">
          <SummaryExport
            ref="summaryRef"
            :detail="detail"
            :hide-chrome="true"
            v-model:active-index="activeModuleIndex"
            :local-modules="localModules"
            :price-tables="store.priceTables"
            :correspondents="store.correspondents"
            :office-users="store.officeUsers"
            :enterprise-stages="detail.stages ?? []"
            :is-admin="isAdmin"
            :is-approver="canAuthorize"
            :can-edit="canEdit"
            :can-authorize="canAuthorize"
            :action-loading="actionLoading"
            :was-rejected="wasRejected"
            :rejection-note="rejectionNote"
            @navigate-month="navigateToMonth"
            @submit-for-approval="handleSubmitForApproval"
            @authorize="handleAuthorize"
            @unlock="showUnlockModal = true"
            @cancel-approval="showCancelApprovalModal = true"
          />
        </div>

        <!-- Assinatura (DocuSign) -->
        <div v-if="activeTab === 'signature'">
          <SignaturePanel
            :detail="detail"
            :can-authorize="canAuthorize"
            :get-document-html="() => summaryRef?.buildPrintHtml?.()"
            @changed="reloadAfterSignature"
          />
        </div>

        <!-- Histórico: linha do tempo única -->
        <div v-if="activeTab === 'history'">
          <div class="bg-surface-raised rounded-2xl border border-line shadow-sm p-6 max-w-3xl">
            <p class="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-5 flex items-center gap-2">
              <i class="fas fa-timeline text-indigo-500"></i> Linha do tempo: quem, quando, o quê e onde
            </p>
            <div v-if="timeline.length" class="relative">
              <div
                v-for="(ev, i) in timeline"
                :key="ev._i ?? i"
                class="relative flex items-start gap-3 pb-5 last:pb-0"
              >
                <div v-if="i < timeline.length - 1" class="absolute left-[13px] top-7 -bottom-0 w-px bg-line"></div>
                <div class="relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs"
                  :class="eventIconClass(ev.action)">
                  <i :class="eventIcon(ev.action)" class="fas"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-ink">{{ eventLabel(ev.action) }}</p>
                  <p class="text-xs text-ink-subtle">
                    <i class="fas fa-user text-[10px] mr-1"></i>{{ ev.username || 'Sistema' }}
                    <span class="mx-1">·</span>
                    {{ formatDateFull(ev.at) }}
                  </p>
                  <p v-if="ev.note" class="text-xs text-ink-muted mt-1 italic break-words">{{ ev.note }}</p>
                </div>
              </div>
            </div>
            <div v-else class="flex items-center justify-center py-12 text-ink-subtle text-sm">
              Nenhum evento registrado ainda.
            </div>
          </div>
        </div>

          </main>

          <!-- Índice flutuante (direita, xl+) — estilo Academy -->
          <aside v-if="(activeTab === 'modules' || activeTab === 'summary') && localModules.length" class="hidden xl:block w-[240px] shrink-0 self-start sticky" :style="{ top: 'calc(var(--cond-header-h, 120px) + 16px)' }">
              <div class="cond-toc">
                <p class="cond-toc__title"><i class="fas fa-list-ul mr-1.5 text-accent"></i> Neste módulo</p>

                <p class="cond-toc__grp">Módulos</p>
                <div v-for="(mod, i) in localModules" :key="mod.id ?? i" class="flex items-center gap-1 mb-1.5">
                  <button @click="selectModule(i)" :class="['cond-toc__link flex-1 min-w-0', { 'is-active': activeModuleIndex === i }]">
                    <i :class="mod.idetapa ? 'fas fa-box' : 'fas fa-cube'" class="mr-2 text-xs shrink-0"></i>
                    <span class="truncate flex-1">{{ mod.module_name || 'Novo módulo' }}</span>
                    <span class="ml-1.5 flex gap-0.5 shrink-0">
                      <span v-for="(f, k) in moduleCompleteness(mod)" :key="k" class="w-1 h-1 rounded-full" :class="f ? 'bg-accent' : 'bg-surface-sunken'"></span>
                    </span>
                  </button>
                  <button v-if="canEdit && !isLocked" @click="removeModule(i)" class="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-ink-subtle hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Remover módulo">
                    <i class="fas fa-trash text-[11px]"></i>
                  </button>
                </div>
                <!-- Ações do Resumo (na view Resumo): exportar PDF / ver documento -->
                <template v-if="activeTab === 'summary'">
                  <p class="cond-toc__grp">Ações</p>
                  <button @click="summaryRef?.printModule?.()" class="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition">
                    <i class="fas fa-file-pdf"></i> Exportar PDF
                  </button>
                  <button v-if="canAuthorize && detail.status === 'pending_approval'" @click="summaryRef?.openDoc?.()" class="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 mt-1.5 text-xs font-semibold text-accent bg-accent-soft hover:bg-accent-soft/70 transition">
                    <i class="fas fa-file-contract"></i> Ver documento
                  </button>
                </template>

                <button v-if="canEdit && !isLocked && activeTab === 'modules'" @click="showAddModuleMenu = !showAddModuleMenu" class="cond-toc__add">
                  <i class="fas fa-plus text-[10px] mr-1.5"></i> Adicionar módulo
                </button>
                <div v-if="showAddModuleMenu && activeTab === 'modules'" class="ml-1 my-1 pl-2 border-l-2 border-line space-y-0.5">
                  <p v-if="availableStages.length" class="text-[10px] font-semibold text-ink-subtle uppercase px-1 pt-1">Etapas do CV</p>
                  <button v-for="s in availableStages" :key="s.idetapa" @click="addStageModule(s)" class="w-full flex items-center gap-2 px-2 py-1 text-xs text-ink-muted hover:bg-accent-soft hover:text-accent rounded text-left transition">
                    <i class="fas fa-layer-group text-[10px]"></i> <span class="truncate">{{ s.nome }}</span>
                  </button>
                  <button @click="addCustomModule" class="w-full flex items-center gap-2 px-2 py-1 text-xs text-ink-muted hover:bg-surface-hover rounded text-left transition">
                    <i class="fas fa-cube text-[10px]"></i> Módulo avulso
                  </button>
                </div>

                <template v-if="activeModule && activeTab === 'modules'">
                  <p class="cond-toc__grp">Seções</p>
                  <button v-for="sec in moduleSections" :key="sec.id" @click="scrollToSection(sec.id)" :class="['cond-toc__link mb-1', { 'is-active': activeSection === sec.id }]">
                    <i :class="sec.icon" class="mr-2 text-xs shrink-0"></i>
                    <span class="truncate">{{ sec.label }}</span>
                  </button>
                </template>
                
              </div>
          </aside>

        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import ModuleSection from './components/ModuleSection.vue';
import SummaryExport from './components/SummaryExport.vue';
import SignaturePanel from './components/SignaturePanel.vue';

const route = useRoute();
const router = useRouter();
const store = useConditionsStore();
const auth = useAuthStore();

const isAdmin = computed(() => auth.hasRole('admin'));

// Permissões vindas do backend (admin sempre true; demais conforme listas das configurações).
const canEdit = computed(() => !!store.permissions?.canEdit);
const canAuthorize = computed(() => !!store.permissions?.canAuthorize);
const canManage = computed(() => canEdit.value || canAuthorize.value);

// Ficha editável quando: tem permissão de editar E (é rascunho, ou é autorizada e o
// usuário também pode autorizar — caso em que salvar desbloqueia automaticamente).
const isLocked = computed(() => {
    const s = detail.value?.status;
    if (!canEdit.value) return true;
    if (s === 'draft') return false;
    if (s === 'approved' && canAuthorize.value) return false;
    return true;
});

// Pode salvar = ficha não está bloqueada para o usuário atual.
const canSave = computed(() => !isLocked.value);

const isClosed = computed(() => detail.value?.status === 'closed');
const isApproved = computed(() => detail.value?.status === 'approved');
const isAvulsa = computed(() => detail.value && !detail.value.idempreendimento);
const headerTitle = computed(() => {
    if (!detail.value) return '...';
    if (isAvulsa.value) return detail.value.display_name || '(Ficha avulsa sem nome)';
    return detail.value.enterprise?.nome ?? '...';
});

// Estado de reprovação: verificar se o último evento de aprovação foi reprovado
const wasRejected = computed(() => {
    const hist = detail.value?.approval_history ?? [];
    // Procura o último evento de aprovação relevante (da lista reversa)
    for (let i = hist.length - 1; i >= 0; i--) {
        const ev = hist[i];
        const approvalActions = ['approval_rejected', 'approved', 'submitted_for_approval', 'unlocked', 'approval_cancelled'];
        if (approvalActions.includes(ev.action)) {
            return ev.action === 'approval_rejected';
        }
    }
    return false;
});

const rejectionNote = computed(() => {
    const hist = detail.value?.approval_history ?? [];
    for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i].action === 'approval_rejected') {
            return hist[i].note ?? null;
        }
    }
    return null;
});

const activeTab = ref('modules');
const saving = ref(false);
const actionLoading = ref(false);
const showUnlockModal = ref(false);
const showCancelApprovalModal = ref(false);
const showCloseModal = ref(false);
const closeNote = ref('');
const closeConfirmation = ref('');

function closeCloseModal() {
    showCloseModal.value = false;
    closeNote.value = '';
    closeConfirmation.value = '';
}

async function handleCloseCondition() {
    if (closeConfirmation.value !== 'ENCERRAR') return;
    actionLoading.value = true;
    try {
        await store.closeCondition(detail.value.id, {
            note: closeNote.value || null,
            confirmation: closeConfirmation.value,
        });
        showToast('Empreendimento encerrado. A ficha agora é histórico imutável.');
        closeCloseModal();
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
    } catch (e) {
        showToast(e.message || 'Erro ao encerrar.', 'error');
    } finally {
        actionLoading.value = false;
    }
}
const showSaveApprovedModal = ref(false);
const unlockNote = ref('');
const cancelApprovalNote = ref('');
const toast = reactive({ show: false, type: 'success', message: '' });
const fetchError = ref(null);
const isDirty = ref(false);

const enterpriseOptions = ref([]);

const STATUS_MAP = {
    draft:            { label: 'Rascunho',       cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    pending_approval: { label: 'Em Autorização', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    approved:         { label: 'Autorizado',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    published:        { label: 'Autorizado',     cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    closed:           { label: 'Encerrado',      cls: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

const ALL_TABS = [
    { id: 'modules', label: 'Módulos', icon: 'fas fa-layer-group', adminOnly: false },
    { id: 'summary', label: 'Resumo',  icon: 'fas fa-file-pdf',    adminOnly: false },
    { id: 'signature', label: 'Assinatura', icon: 'fas fa-file-signature', adminOnly: false },
    { id: 'history', label: 'Histórico', icon: 'fas fa-timeline',  adminOnly: false },
];

const visibleTabs = computed(() =>
    ALL_TABS.filter(t => !t.adminOnly || isAdmin.value)
);

const detail = computed(() => store.detail);
const localModules = ref([]);
const form = ref({ notes: '' });

// Navegação de mês: detail.history vem ordenada por reference_month DESC.
const historyIndex = computed(() => {
    const h = detail.value?.history ?? [];
    return h.findIndex(x => String(x.id) === String(detail.value?.id));
});
const olderItem = computed(() => {
    const h = detail.value?.history ?? [];
    const i = historyIndex.value;
    return i >= 0 && i < h.length - 1 ? h[i + 1] : null;
});
const newerItem = computed(() => {
    const h = detail.value?.history ?? [];
    const i = historyIndex.value;
    return i > 0 ? h[i - 1] : null;
});

// ── Navegação lateral (estilo Academy, controla módulo ativo + seções) ────────
const activeModuleIndex = ref(0);
const activeSection = ref('data');
const sidebarCollapsed = ref(false);
const sidebarMobileOpen = ref(false);
const showAddModuleMenu = ref(false);
const summaryRef = ref(null); // ref do SummaryExport (p/ acionar Exportar PDF pela lateral)

const activeModule = computed(() => localModules.value[activeModuleIndex.value] ?? null);

const ALL_SECTIONS = [
    { id: 'data',        label: 'Produto',       icon: 'fas fa-box' },
    { id: 'prices',      label: 'Preços',        icon: 'fas fa-tag' },
    { id: 'negotiation', label: 'Negociação',    icon: 'fas fa-handshake' },
    { id: 'docs',        label: 'Documentação',  icon: 'fas fa-file-contract' },
    { id: 'campaigns',   label: 'Campanhas',     icon: 'fas fa-bullhorn' },
    { id: 'operational', label: 'Operacional',   icon: 'fas fa-gears' },
    { id: 'units',       label: 'Unidades',      icon: 'fas fa-layer-group' },
];
const moduleSections = computed(() => {
    const hasUnits = !!activeModule.value?.idetapa;
    return ALL_SECTIONS.filter(s => s.id !== 'units' || hasUnits);
});

// Etapas do CV ainda não vinculadas a um módulo desta ficha.
const availableStages = computed(() => {
    const used = new Set(localModules.value.map(m => m.idetapa).filter(Boolean));
    return (detail.value?.stages ?? []).filter(s => !used.has(s.idetapa));
});

function moduleCompleteness(mod) {
    return [
        !!(mod.module_name && mod.total_units),
        (mod.price_table_ids?.length > 0) || (mod.manual_price_tables?.length > 0),
        !!(mod.max_entry_value || mod.rp_rule || mod.max_installments),
        (mod.campaigns?.length > 0),
        !!(mod.manager_user_id || mod.correspondent_id || mod.contract_registration_by),
    ];
}

function navItemClass(active) {
    return [
        'group relative w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm font-medium transition',
        active ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-hover hover:text-ink',
    ];
}

function selectModule(i) {
    activeModuleIndex.value = i;
    activeSection.value = 'data';
    sidebarMobileOpen.value = false;
}
function scrollToSection(id) {
    activeSection.value = id;
    document.getElementById(`modsec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    sidebarMobileOpen.value = false;
}
function addStageModule(stage) {
    const newMod = moduleDefaults({ idetapa: stage.idetapa, module_name: stage.nome || `Etapa ${stage.idetapa}`, sort_order: localModules.value.length });
    localModules.value = [...localModules.value, newMod];
    activeModuleIndex.value = localModules.value.length - 1;
    activeSection.value = 'data';
    isDirty.value = true;
    showAddModuleMenu.value = false;
}
function addCustomModule() {
    const newMod = moduleDefaults({ idetapa: null, module_name: '', sort_order: localModules.value.length });
    localModules.value = [...localModules.value, newMod];
    activeModuleIndex.value = localModules.value.length - 1;
    activeSection.value = 'data';
    isDirty.value = true;
    showAddModuleMenu.value = false;
}

// Remove o módulo i: se já salvo (tem id) deleta no backend; senão tira da lista local.
function removeModule(i) {
    const mod = localModules.value[i];
    if (!mod) return;
    const name = mod.module_name || 'este módulo';
    if (!window.confirm(`Remover "${name}"? Esta ação não pode ser desfeita.`)) return;
    if (mod.id) {
        handleDeleteModule(mod.id);
    } else {
        localModules.value = localModules.value.filter((_, idx) => idx !== i);
        if (activeModuleIndex.value >= localModules.value.length) {
            activeModuleIndex.value = Math.max(0, localModules.value.length - 1);
        }
        isDirty.value = true;
    }
}

// Mantém o índice ativo no range quando a lista muda (ex.: após remover módulo).
watch(() => localModules.value.length, (len) => {
    if (activeModuleIndex.value >= len) activeModuleIndex.value = Math.max(0, len - 1);
});

// Altura real do header → var CSS, para a lateral grudar logo abaixo (padrão Academy).
const headerEl = ref(null);
let headerRO = null;
// O header só existe depois que `detail` carrega, então observamos o ref (não onMounted,
// que rodaria antes do header existir e deixaria o --cond-header-h no fallback).
watch(headerEl, (el) => {
    if (headerRO) { headerRO.disconnect(); headerRO = null; }
    if (!el || typeof ResizeObserver === 'undefined') return;
    const setVar = () => document.documentElement.style.setProperty('--cond-header-h', `${Math.ceil(el.getBoundingClientRect().height)}px`);
    setVar();
    headerRO = new ResizeObserver(setVar);
    headerRO.observe(el);
}, { immediate: true });
onBeforeUnmount(() => { if (headerRO) headerRO.disconnect(); });

// Destaca a seção atual no índice flutuante conforme o scroll (padrão Academy).
let sectionObserver = null;
function observeSections() {
    if (typeof IntersectionObserver === 'undefined') return;
    if (sectionObserver) sectionObserver.disconnect();
    sectionObserver = new IntersectionObserver((entries) => {
        for (const e of entries) {
            if (e.isIntersecting) {
                const id = e.target.id.replace('modsec-', '');
                if (id) activeSection.value = id;
            }
        }
    }, { rootMargin: '-25% 0px -65% 0px', threshold: 0 });
    nextTick(() => {
        for (const s of moduleSections.value) {
            const el = document.getElementById(`modsec-${s.id}`);
            if (el) sectionObserver.observe(el);
        }
    });
}
watch([activeModuleIndex, () => activeTab.value, () => localModules.value.length], () => {
    if (activeTab.value === 'modules') nextTick(observeSections);
});
onMounted(() => { if (activeTab.value === 'modules') nextTick(observeSections); });
onBeforeUnmount(() => { if (sectionObserver) sectionObserver.disconnect(); });

function moduleDefaults(m = {}) {
    const base = {
        // Dados do módulo
        idetapa: null,
        module_name: '',
        sort_order: 0,
        total_units: null,
        min_demand: null,
        min_demand_note: '',
        // Avaliação MCMV
        appraisal_faixas: null,
        appraisal_value: null,
        appraisal_ceiling: null,
        appraisal_note: '',
        appraisal_file_url: '',
        // Preços
        price_table_ids: [],
        manual_price_tables: [],
        price_premise_note: '',
        // Negociação
        max_entry_value: null,
        rp_installment_value: null,
        act_installment_value: null,
        min_installment_value: null,
        max_installments: null,
        rp_rule: '',
        installment_until_habite_se: '',
        installment_post_habite_se: '',
        has_state_subsidy: false,
        state_subsidy_note: '',
        state_subsidy_state: '',
        state_subsidy_program: '',
        state_subsidy_custom_state: '',
        state_subsidy_rules: '',
        state_subsidy_conditions: '',
        // Operacional
        manager_user_id: null,
        manager_mode: 'sistema',
        manager_name: '',
        manager_email: '',
        manager_phone: '',
        delivery_deadline_months: null,
        delivery_deadline_note: '',
        commission_pct: null,
        commission_source: 'cv',
        commission_note: '',
        contract_registration_by: '',
        contract_registered_by_user_id: null,
        outros_contact_name: '',
        outros_contact_email: '',
        outros_contact_phone: '',
        cca_company_name: '',
        cca_cost: null,
        cca_charges_company: false,
        correspondent_id: null,
        has_digital_cert: false,
        digital_cert_provider: '',
        digital_cert_contact: '',
        digital_cert_has_cost: false,
        digital_cert_cost: null,
        enterprise_files_url: '',
        notes: '',
        // Documentação
        cef_package_paid_by: null,            // 'client' | 'menin'
        cef_package_avg_value: null,
        itbi_exempt: false,
        itbi_avg_value: null,
        itbi_exemption_doc_url: '',
        cartorio_prenotacao_value: null,
        cartorio_registration_value: null,
        cartorio_paid_by: null,               // 'client' | 'menin'
        // Snapshot de unidades
        unit_snapshot: null,
        // Campanhas
        campaigns: [],
    };
    try {
        return structuredClone({ ...base, ...m });
    } catch {
        return JSON.parse(JSON.stringify({ ...base, ...m }));
    }
}

function populateFromDetail(d) {
    if (!d) return;
    try {
        localModules.value = (d.modules ?? []).map(m => moduleDefaults(m));
        // Reset + repovoa intendedStageLinks com os vínculos persistidos no DB
        intendedStageLinks.value = {};
        for (const mod of localModules.value) rememberStageLink(mod);
    } catch (e) {
        console.error('[Detail] populateFromDetail error:', e);
        localModules.value = [];
    }
    form.value = { notes: d.notes ?? '' };
}

function onModulesChange(newModules) {
    localModules.value = newModules;
    isDirty.value = true;
}

onBeforeRouteLeave((to, from, next) => {
    if (isDirty.value) {
        const ok = window.confirm('Você tem alterações não salvas.\nDeseja realmente sair e perder as alterações?');
        ok ? next() : next(false);
    } else {
        next();
    }
});

function beforeUnloadHandler(e) {
    if (isDirty.value) {
        e.preventDefault();
        e.returnValue = '';
    }
}
onMounted(() => window.addEventListener('beforeunload', beforeUnloadHandler));
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnloadHandler));

function showToast(message, type = 'success') {
    toast.show = true; toast.type = type; toast.message = message;
    setTimeout(() => { toast.show = false; }, 3500);
}

async function navigateToMonth(id) {
    if (String(id) === String(detail.value?.id)) return;
    router.push(`/comercial/conditions/${id}`);
    store.detail = null;
    await store.fetchDetail(id);
    if (store.detail) {
        populateFromDetail(store.detail);
        const eid = store.detail.idempreendimento;
        await Promise.all([
            store.fetchPriceTables(eid),
            store.fetchPriceDistribution(eid),
        ]);
    }
}

// ─── Ações de workflow ────────────────────────────────────────────────────────

async function captureAllUnitSnapshots() {
    const idempreendimento = detail.value?.idempreendimento;
    if (!idempreendimento) return localModules.value;
    const priceTables = store.priceTables ?? [];

    return Promise.all(localModules.value.map(async (mod) => {
        if (!mod.idetapa) return mod;
        try {
            const units = await store.fetchUnitsForStage(idempreendimento, mod.idetapa);

            const priceMap = new Map();
            const orderedTableIds = [...(mod.price_table_ids ?? [])].sort((a, b) => {
                const ta = priceTables.find(t => t.idtabela === a);
                const tb = priceTables.find(t => t.idtabela === b);
                return (tb?.vigente ? 1 : 0) - (ta?.vigente ? 1 : 0);
            });
            for (const tableId of orderedTableIds) {
                const table = priceTables.find(t => t.idtabela === tableId && t.unit_count > 0);
                if (table?.unidades) {
                    for (const u of table.unidades) {
                        if (u.idunidade != null && !priceMap.has(String(u.idunidade))) {
                            priceMap.set(String(u.idunidade), u.valor_total ?? null);
                        }
                    }
                }
            }

            const enriched = units.map(bloco => ({
                ...bloco,
                unidades: (bloco.unidades ?? []).map(u => ({
                    ...u,
                    valor_total: priceMap.get(String(u.idunidade)) ?? null,
                })),
            }));

            return {
                ...mod,
                unit_snapshot: {
                    capturedAt: new Date().toISOString(),
                    data: enriched,
                },
            };
        } catch (e) {
            console.warn('[Detail] captureUnitSnapshot module', mod.id, e.message);
            return mod;
        }
    }));
}

async function handleSubmitForApproval() {
    actionLoading.value = true;
    try {
        const modulesWithSnapshot = await captureAllUnitSnapshots();
        localModules.value = modulesWithSnapshot;
        await store.saveModules(detail.value.id, localModules.value);
        await store.submitForApproval(detail.value.id);
        showToast('Ficha enviada para autorização! Os autorizadores foram notificados.');
        await store.fetchDetail(detail.value.id);
    } catch (e) {
        showToast(e.message || 'Erro ao enviar para autorização.', 'error');
    } finally {
        actionLoading.value = false;
    }
}

async function handleAuthorize() {
    actionLoading.value = true;
    try {
        await store.authorizeCondition(detail.value.id);
        showToast('Ficha autorizada com sucesso!');
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
    } catch (e) {
        showToast(e.message || 'Erro ao autorizar.', 'error');
    } finally {
        actionLoading.value = false;
    }
}

async function handleCancelApproval() {
    actionLoading.value = true;
    try {
        await store.cancelApproval(detail.value.id, cancelApprovalNote.value);
        showCancelApprovalModal.value = false;
        cancelApprovalNote.value = '';
        showToast('Autorização cancelada — ficha voltou para Rascunho.');
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
    } catch (e) {
        showToast(e.message || 'Erro ao cancelar autorização.', 'error');
    } finally {
        actionLoading.value = false;
    }
}

async function handleUnlock() {
    actionLoading.value = true;
    try {
        await store.unlockCondition(detail.value.id, unlockNote.value);
        showUnlockModal.value = false;
        unlockNote.value = '';
        showToast('Ficha desbloqueada — voltou para Rascunho.');
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
    } catch (e) {
        showToast(e.message || 'Erro ao desbloquear.', 'error');
    } finally {
        actionLoading.value = false;
    }
}

// ─── Vincular avulsa ao CV (promove a série inteira) ──────────────────────────
const showLinkCvModal = ref(false);
const cvEnterprises = ref([]);
const linkCvEnterpriseId = ref(null);
const linkCvStages = ref([]);
const linkModuleMap = ref({});
const linkLoading = ref(false);
const linkError = ref(null);

async function openLinkCv() {
    linkError.value = null;
    linkCvEnterpriseId.value = null;
    linkCvStages.value = [];
    linkModuleMap.value = {};
    showLinkCvModal.value = true;
    if (!cvEnterprises.value.length) {
        try { cvEnterprises.value = await store.fetchCvEnterprises(); }
        catch (e) { linkError.value = e.message || 'Erro ao carregar empreendimentos do CV.'; }
    }
}

async function onLinkEnterpriseChange() {
    linkCvStages.value = [];
    linkModuleMap.value = {};
    linkError.value = null;
    if (!linkCvEnterpriseId.value) return;
    try {
        linkCvStages.value = await store.fetchEnterpriseStages(linkCvEnterpriseId.value);
        // Pré-cria as chaves do mapa (= null) para o select mostrar "Manter livre".
        const m = {};
        for (const mod of localModules.value) if (mod.id != null) m[mod.id] = null;
        linkModuleMap.value = m;
    } catch (e) {
        linkError.value = e.message || 'Erro ao carregar etapas do empreendimento.';
    }
}

async function handleLinkToCv() {
    if (!linkCvEnterpriseId.value) return;
    linkLoading.value = true;
    linkError.value = null;
    try {
        const map = {};
        for (const [k, v] of Object.entries(linkModuleMap.value)) {
            if (v != null) map[k] = v;
        }
        const res = await store.linkSeriesToCv(detail.value.id, linkCvEnterpriseId.value, map);
        showLinkCvModal.value = false;
        showToast(`Série vinculada ao CV (${res?.affected || 1} ficha(s)).`);
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
        const eid = store.detail?.idempreendimento;
        if (eid) await Promise.all([store.fetchPriceTables(eid), store.fetchPriceDistribution(eid)]);
    } catch (e) {
        linkError.value = e.message || 'Erro ao vincular ao CV.';
    } finally {
        linkLoading.value = false;
    }
}

// ─── Saves ────────────────────────────────────────────────────────────────────

async function handleSaveModules() {
    if (isLocked.value) return;
    // Aguarda qualquer save-silent em voo antes do save explícito (evita race)
    if (savingSilentPromise) {
        try { await savingSilentPromise; } catch {}
    }
    saving.value = true;
    try {
        const toSave = applyIntendedLinks(localModules.value);
        localModules.value = toSave;
        const result = await store.saveModules(detail.value.id, toSave);
        if (result?.modules) {
            const fromBackend = result.modules.map(m => moduleDefaults(m));
            localModules.value = applyIntendedLinks(fromBackend);
            for (const mod of localModules.value) rememberStageLink(mod);
        }
        isDirty.value = false;
        showToast('Módulos salvos!');
    } catch (e) {
        const msgs = e.errors ?? [e.message ?? 'Erro ao salvar módulos.'];
        showToast(msgs[0], 'error');
    }
    finally { saving.value = false; }
}

// ─── Mutex serializa save-silent's concorrentes ──────────────────────────────
// Sem isso, dois auto-saves em voo (ex: autoSelectVigentes + onStageLinkChange)
// causavam (a) duplicação de módulos sem id e (b) sobrescrita de idetapa por payload stale.
let savingSilentPromise = null;
let pendingSilent = false;

// Mapa de vínculos "intencionais" idetapa por módulo, registrados pelo onStageLinkChange.
// Atua como fonte da verdade local — qualquer save-silent que tente desvincular é bloqueado.
const intendedStageLinks = ref({});  // { moduleId|sortOrder: idetapa }

function rememberStageLink(mod) {
    if (mod?.idetapa == null) return;
    const key = mod.id != null ? `id:${mod.id}` : `sort:${mod.sort_order}`;
    intendedStageLinks.value[key] = mod.idetapa;
}

function applyIntendedLinks(modules) {
    return modules.map((m) => {
        const keys = [];
        if (m.id != null) keys.push(`id:${m.id}`);
        if (m.sort_order != null) keys.push(`sort:${m.sort_order}`);
        for (const key of keys) {
            const intended = intendedStageLinks.value[key];
            if (intended != null && (m.idetapa == null || m.idetapa !== intended)) {
                return { ...m, idetapa: intended };
            }
        }
        return m;
    });
}

async function handleSaveModulesSilent(modulesPayload = null) {
    if (isLocked.value) return;

    // 1) Aplica payload incoming em localModules antes de tudo
    if (modulesPayload) {
        const safe = applyIntendedLinks(modulesPayload);
        // Captura links intencionais que vêm da própria payload (caso onStageLinkChange)
        for (const m of safe) rememberStageLink(m);
        localModules.value = safe;
    }
    isDirty.value = true;

    // 2) Se já tem um save em voo, marca pendente e sai. O loop vai re-saver com state mais recente.
    if (savingSilentPromise) {
        pendingSilent = true;
        return;
    }

    // 3) Loop: salva, e se durante a saída chegou outro save-silent, salva de novo.
    do {
        pendingSilent = false;

        // Reaplica intendedStageLinks no estado mais recente antes de mandar
        const toSave = applyIntendedLinks(localModules.value);
        localModules.value = toSave;

        savingSilentPromise = (async () => {
            try {
                const result = await store.saveModules(detail.value.id, toSave, { silent: true });
                if (result?.modules) {
                    // Reaplica intendedLinks também no resultado, caso o backend tenha falhado em persistir
                    const fromBackend = result.modules.map(m => moduleDefaults(m));
                    localModules.value = applyIntendedLinks(fromBackend);
                    // Reindexa intendedStageLinks por id (módulos novos ganharam id agora)
                    for (const mod of localModules.value) rememberStageLink(mod);
                }
                isDirty.value = false;
            } catch (e) {
                console.warn('[Detail] auto-save idetapa failed:', e.message);
            }
        })();

        try { await savingSilentPromise; } finally { savingSilentPromise = null; }
    } while (pendingSilent);
}

// Propagação da biblioteca de campanhas: o backend já atualizou as instâncias das
// fichas em rascunho (incluindo esta); aqui só sincronizamos as cópias locais de
// TODOS os módulos, sem marcar isDirty (nada pendente de salvar).
function handleTemplatePropagated({ templateId, fields }) {
    localModules.value = localModules.value.map(m => ({
        ...m,
        campaigns: (m.campaigns ?? []).map(c =>
            c.template_id === templateId ? { ...c, ...fields } : c
        ),
    }));
    showToast('Campanha atualizada em todos os empreendimentos vinculados (fichas em rascunho).');
}

// Após ações de assinatura (enviar/anular/concluir), recarrega a ficha para a
// timeline refletir os eventos. Ficha autorizada está bloqueada — sem edições a perder.
async function reloadAfterSignature() {
    await store.fetchDetail(detail.value.id);
    if (store.detail) populateFromDetail(store.detail);
}

async function handleDeleteModule(moduleId) {
    try {
        await store.deleteModule(detail.value.id, moduleId);
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
        showToast('Módulo removido.');
    } catch (e) { showToast(e.message || 'Erro ao remover módulo.', 'error'); }
}

async function handleCopyModule({ targetId, sourceId }) {
    try {
        await store.copyModule(detail.value.id, targetId, sourceId);
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
        showToast('Dados copiados!');
    } catch (e) { showToast(e.message || 'Erro ao copiar.', 'error'); }
}

async function handleCopyFromEnterprise({ moduleId, sourceConditionId, sourceModuleId, fields }) {
    try {
        await store.copyModuleFromSource(detail.value.id, moduleId, sourceConditionId, sourceModuleId, fields);
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
        showToast('Dados copiados de outro empreendimento!');
    } catch (e) { showToast(e.message || 'Erro ao copiar de outro empreendimento.', 'error'); }
}

async function handleSaveAll() {
    if (isLocked.value) return;
    // Ficha autorizada: pede confirmação antes de cancelar autorização
    if (detail.value?.status === 'approved') {
        showSaveApprovedModal.value = true;
        return;
    }
    saving.value = true;
    try {
        const result = await store.saveModules(detail.value.id, localModules.value);
        if (result?.modules) {
            localModules.value = result.modules.map(m => moduleDefaults(m));
        }
        isDirty.value = false;
        showToast('Tudo salvo com sucesso!');
    } catch (e) {
        const msgs = e.errors ?? [e.message ?? 'Erro ao salvar.'];
        showToast(msgs[0], 'error');
    }
    finally { saving.value = false; }
}

async function handleConfirmSaveApproved() {
    actionLoading.value = true;
    try {
        // Desbloquear (cancela autorização) e depois salvar
        await store.unlockCondition(detail.value.id, 'Editado pelo administrador após autorização.');
        await store.fetchDetail(detail.value.id);
        const result = await store.saveModules(detail.value.id, localModules.value);
        if (result?.modules) {
            localModules.value = result.modules.map(m => moduleDefaults(m));
        }
        isDirty.value = false;
        showSaveApprovedModal.value = false;
        showToast('Ficha desbloqueada e salva com sucesso!');
        await store.fetchDetail(detail.value.id);
    } catch (e) {
        showToast(e.message || 'Erro ao salvar.', 'error');
    } finally {
        actionLoading.value = false;
    }
}

// ─── Formatadores ─────────────────────────────────────────────────────────────
function formatMonth(dateStr) {
    if (!dateStr) return '—';
    const [y, m] = dateStr.split('-');
    const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    return `${months[Number(m) - 1]}/${y}`;
}
function formatDateFull(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function badgeClass(s) { return STATUS_MAP[s]?.cls ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'; }
function statusLabel(s) { return STATUS_MAP[s]?.label ?? s; }

// ─── Histórico de eventos ─────────────────────────────────────────────────────
const EVENT_META = {
    created:                 { label: 'Ficha criada',                    icon: 'fa-plus',        cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',    type: 'approval' },
    auto_created:            { label: 'Gerada automaticamente',          icon: 'fa-robot',       cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',       type: 'approval' },
    submitted_for_approval:  { label: 'Enviada para autorização',        icon: 'fa-paper-plane', cls: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30', type: 'approval' },
    approved:                { label: 'Autorizada',                      icon: 'fa-check',       cls: 'bg-green-100 text-green-600 dark:bg-green-900/30', type: 'approval' },
    unlocked:                { label: 'Desbloqueada para edição',        icon: 'fa-lock-open',   cls: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30', type: 'approval' },
    closed:                  { label: 'Empreendimento encerrado',        icon: 'fa-flag-checkered', cls: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300', type: 'approval' },
    approval_cancelled:      { label: 'Autorização cancelada',           icon: 'fa-times',       cls: 'bg-red-100 text-red-600 dark:bg-red-900/30',       type: 'approval' },
    approval_rejected:       { label: 'Autorização reprovada',           icon: 'fa-ban',         cls: 'bg-red-100 text-red-700 dark:bg-red-900/40',       type: 'approval' },
    saved:                   { label: 'Alterações salvas (rascunho)',     icon: 'fa-floppy-disk',   cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',         type: 'change' },
    edited_after_unlock:     { label: 'Editado após desbloqueio',        icon: 'fa-pen-to-square', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',   type: 'change' },
    module_copied:           { label: 'Módulo copiado',                  icon: 'fa-copy',          cls: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30', type: 'change' },
    modules_updated:         { label: 'Módulo(s) adicionado(s)',         icon: 'fa-layer-group',   cls: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',       type: 'change' },
    module_edited:           { label: 'Módulo editado',                 icon: 'fa-pen',           cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',   type: 'change' },
    linked_to_cv:            { label: 'Vinculada ao CV',                icon: 'fa-link',          cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30',       type: 'approval' },
    campaign_template_updated: { label: 'Campanha atualizada via biblioteca', icon: 'fa-bullhorn', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30',  type: 'change' },
    signature_sent:      { label: 'Enviada para assinatura (DocuSign)', icon: 'fa-file-signature', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30', type: 'approval' },
    signature_resent:    { label: 'Convite de assinatura reenviado',    icon: 'fa-paper-plane',    cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30', type: 'approval' },
    signature_completed: { label: 'Documento assinado por todos',       icon: 'fa-file-circle-check', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30', type: 'approval' },
    signature_voided:    { label: 'Envelope de assinatura anulado',     icon: 'fa-ban',            cls: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300', type: 'approval' },
};
function eventLabel(action)     { return EVENT_META[action]?.label    ?? action; }
function eventIcon(action)      { return EVENT_META[action]?.icon     ?? 'fa-circle'; }
function eventIconClass(action) { return EVENT_META[action]?.cls      ?? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'; }

// Linha do tempo única (cronológica reversa): quem, quando, o quê, onde (na nota).
const timeline = computed(() => {
    const hist = detail.value?.approval_history ?? [];
    return hist.map((ev, i) => ({ ...ev, _i: i })).reverse();
});

// ─── Fetch / retry ───────────────────────────────────────────────────────────
async function retryFetch() {
    fetchError.value = null;
    await loadDetail(route.params.id);
}

async function loadDetail(id) {
    fetchError.value = null;
    await store.fetchDetail(id);
    if (store.error) {
        fetchError.value = store.error;
        return;
    }
    if (store.detail) {
        populateFromDetail(store.detail);
        const eid = store.detail.idempreendimento;
        await Promise.all([
            store.fetchPriceTables(eid),
            store.fetchPriceDistribution(eid),
            store.fetchCorrespondents(),
            store.fetchCorrespondentCompanies(),
            store.fetchOfficeUsers(),
            store.fetchSettings(),
            store.fetchMyPermissions(),
        ]);
        try {
            await store.fetchList({});
            const seen = new Set();
            const opts = [];
            if (eid) {
                opts.push({ idempreendimento: eid, nome: `${store.detail.enterprise?.nome ?? `Empr. #${eid}`} (este empreendimento)` });
                seen.add(eid);
            }
            for (const c of (store.list ?? [])) {
                const eid2 = c.enterprise?.idempreendimento ?? c.idempreendimento;
                if (!eid2 || seen.has(eid2)) continue;
                seen.add(eid2);
                opts.push({ idempreendimento: eid2, nome: c.enterprise?.nome ?? `Empr. #${eid2}` });
            }
            enterpriseOptions.value = opts.sort((a, b) => {
                if (a.idempreendimento === eid) return -1;
                if (b.idempreendimento === eid) return 1;
                return a.nome.localeCompare(b.nome);
            });
        } catch (_) {}
    }
}

onMounted(() => loadDetail(route.params.id));
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.nav-grp { @apply px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-ink-subtle; }
.cond-toc { @apply border border-line rounded-2xl bg-surface-raised p-2.5 overflow-y-auto shadow-sm; max-height: calc(100vh - var(--cond-header-h, 56px) - 1.5rem); }
.cond-toc__title { @apply text-[11px] font-bold uppercase tracking-wider text-ink-subtle px-2 pb-1.5 flex items-center; }
.cond-toc__grp { @apply text-[10px] font-bold uppercase tracking-wider text-ink-subtle px-2 pt-2.5 pb-1; }
.cond-toc__link { @apply w-full flex items-center text-left rounded-lg px-2.5 py-1.5 text-sm text-ink-muted transition; border-left: 2px solid transparent; }
.cond-toc__link:hover { @apply bg-surface-sunken text-ink; }
.cond-toc__link.is-active { @apply bg-accent-soft text-accent font-semibold; border-left-color: currentColor; }
.cond-toc__add { @apply w-full flex items-center rounded-lg px-2.5 py-1.5 mt-1 text-xs font-medium text-accent border border-dashed border-accent/40 hover:bg-accent-soft transition; }
</style>
