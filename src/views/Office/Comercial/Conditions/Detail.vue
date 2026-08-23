<template>
  <!-- design:tela-cheia — bancada da ficha. A altura é travada no shell (`md:h-full`
     na cadeia) para que só o corpo role; foi assim que o 2º scroll fantasma
     foi resolvido. PageContainer devolve o problema. -->
  <!-- Desktop: a ficha preenche exatamente a área útil do shell (h-full na cadeia, sem
       depender de calc bater com a altura real) e rola só por dentro. Mobile segue com o
       scroll da página. -->
  <div class="min-h-full md:h-full md:min-h-0 md:flex md:flex-col overflow-hidden bg-surface">

    <!-- Toast -->
    <transition name="fade">
      <div
        v-if="store.toast.show"
        :class="[
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
          store.toast.type === 'success' ? 'bg-data-pos text-white' : 'bg-data-neg text-white'
        ]"
      >
        <i :class="store.toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'" class="fas"></i>
        {{ store.toast.message }}
      </div>
    </transition>

    <!-- ── Diálogos de workflow ──────────────────────────────────────────────
         Todos usam o `Modal` do sistema. A regra da receita executiva: o efeito
         aparece ANTES de salvar, e a confirmação é proporcional ao alcance —
         por isso só "Encerrar" pede a palavra digitada. -->

    <!-- Desbloquear (approved → draft) ou Reabrir (closed → draft) -->
    <Modal v-model:open="showUnlockModal" size="sm"
      :title="isClosed ? 'Reabrir empreendimento' : 'Editar ficha autorizada'">
      <div class="space-y-4">
        <p v-if="isClosed" class="cond-note cond-note--pos">
          <i class="fas fa-circle-info shrink-0 mt-0.5"></i>
          <span>Reabrir o empreendimento volta esta ficha para <strong>Rascunho</strong>. A geração mensal automática retoma a partir do próximo ciclo.</span>
        </p>
        <p v-else class="cond-note cond-note--warn">
          <i class="fas fa-triangle-exclamation shrink-0 mt-0.5"></i>
          <span>Ao confirmar a edição, esta ficha <strong>perde a autorização</strong>: volta para <strong>Rascunho</strong> e precisará ser enviada para autorização de novo.</span>
        </p>
        <div>
          <label class="cond-label">{{ isClosed ? 'Motivo da reabertura (opcional)' : 'Motivo da edição (opcional)' }}</label>
          <textarea v-model="unlockNote" rows="3" class="cond-textarea"
            :placeholder="isClosed ? 'Ex: Empreendimento retomado...' : 'Ex: Correção no valor de comissão...'" />
        </div>
      </div>
      <template #footer>
        <Button variant="ghost" @click="showUnlockModal = false">Cancelar</Button>
        <Button :variant="isClosed ? 'primary' : 'secondary'" :loading="actionLoading" :disabled="actionLoading"
          :icon="isClosed ? 'fas fa-rotate-left' : 'fas fa-pen-to-square'" @click="handleUnlock">
          {{ isClosed ? 'Confirmar reabertura' : 'Confirmar edição' }}
        </Button>
      </template>
    </Modal>

    <!-- Cancelar autorização (pending_approval → draft) -->
    <Modal v-model:open="showCancelApprovalModal" size="sm" title="Cancelar autorização">
      <div class="space-y-4">
        <p class="cond-note cond-note--neg">
          <i class="fas fa-triangle-exclamation shrink-0 mt-0.5"></i>
          <span>Isso <strong>cancela a autorização</strong> em andamento. A ficha volta para <strong>Rascunho</strong> e poderá ser editada e reenviada.</span>
        </p>
        <div>
          <label class="cond-label">Motivo do cancelamento (opcional)</label>
          <textarea v-model="cancelApprovalNote" rows="3" class="cond-textarea"
            placeholder="Ex: Necessário ajustar valor de entrada..." />
        </div>
      </div>
      <template #footer>
        <Button variant="ghost" @click="showCancelApprovalModal = false">Voltar</Button>
        <Button variant="danger" icon="fas fa-ban" :loading="actionLoading" :disabled="actionLoading"
          @click="handleCancelApproval">Cancelar autorização</Button>
      </template>
    </Modal>

    <!-- Salvar em ficha autorizada -->
    <Modal v-model:open="showSaveApprovedModal" size="sm" title="Atenção — ficha autorizada">
      <p class="cond-note cond-note--warn">
        <i class="fas fa-triangle-exclamation shrink-0 mt-0.5"></i>
        <span>Salvar alterações numa ficha <strong>Autorizada</strong> vai <strong>cancelar a autorização</strong> e reverter para <strong>Rascunho</strong>. Será preciso enviar para autorização de novo.</span>
      </p>
      <template #footer>
        <Button variant="ghost" @click="showSaveApprovedModal = false">Cancelar</Button>
        <Button variant="secondary" icon="fas fa-floppy-disk" :loading="actionLoading" :disabled="actionLoading"
          @click="handleConfirmSaveApproved">Desbloquear e salvar</Button>
      </template>
    </Modal>

    <!-- Encerrar empreendimento (dupla validação: alcance é a série inteira) -->
    <Modal :open="showCloseModal" size="md" title="Encerrar empreendimento" @close="closeCloseModal">
      <div class="space-y-4">
        <div class="cond-note cond-note--neg">
          <i class="fas fa-triangle-exclamation shrink-0 mt-0.5"></i>
          <div>
            <p class="font-semibold mb-1">Esta ação não pode ser desfeita por usuários comuns.</p>
            <p>Encerrar o empreendimento significa que ele <strong>não vai mais evoluir</strong>: esta ficha vira histórico imutável e <strong>nenhuma nova ficha mensal será gerada</strong> automaticamente.</p>
          </div>
        </div>
        <div>
          <label class="cond-label">Motivo do encerramento (opcional)</label>
          <textarea v-model="closeNote" rows="2" class="cond-textarea"
            placeholder="Ex: Empreendimento finalizado, todas as unidades vendidas..." />
        </div>
        <div>
          <label class="cond-label">
            Para confirmar, digite <strong class="text-data-neg tracking-widest">ENCERRAR</strong>
          </label>
          <input v-model="closeConfirmation" type="text" placeholder="ENCERRAR"
            class="cond-textarea font-mono"
            :class="closeConfirmation === 'ENCERRAR' ? 'border-data-pos focus:border-data-pos focus:ring-data-pos/20' : ''" />
        </div>
      </div>
      <template #footer>
        <Button variant="ghost" @click="closeCloseModal">Cancelar</Button>
        <Button variant="danger" icon="fas fa-flag-checkered" :loading="actionLoading"
          :disabled="actionLoading || closeConfirmation !== 'ENCERRAR'"
          @click="handleCloseCondition">Encerrar definitivamente</Button>
      </template>
    </Modal>

    <!-- Vincular avulsa ao CV (promove a série inteira) -->
    <Modal v-model:open="showLinkCvModal" size="lg" title="Vincular ao empreendimento do CV">
      <div class="space-y-4">
        <p class="cond-note cond-note--info">
          <i class="fas fa-circle-info shrink-0 mt-0.5"></i>
          <span>Isto promove <strong>toda a série</strong> desta avulsa ({{ detail?.history?.length || 1 }} ficha(s)) para o empreendimento escolhido. O histórico é preservado e nada é apagado.</span>
        </p>

        <Select v-model="linkCvEnterpriseId" label="Empreendimento do CV"
          :options="linkEnterpriseOptions" @change="onLinkEnterpriseChange" />

        <div v-if="linkCvEnterpriseId && localModules.length">
          <label class="cond-label">
            Mapear módulos às etapas <span class="normal-case tracking-normal font-normal">(opcional)</span>
          </label>
          <div class="space-y-2">
            <div v-for="mod in localModules" :key="mod.id ?? mod.module_name" class="flex items-center gap-2">
              <span class="text-sm text-ink flex-1 min-w-0 truncate">{{ mod.module_name || 'Sem nome' }}</span>
              <i class="fas fa-arrow-right text-xs text-ink-subtle shrink-0"></i>
              <div class="flex-1 min-w-0">
                <Select v-model="linkModuleMap[mod.id]" :disabled="!mod.id" :options="linkStageOptions" />
              </div>
            </div>
          </div>
        </div>

        <p v-if="linkError" class="cond-note cond-note--neg">
          <i class="fas fa-triangle-exclamation shrink-0 mt-0.5"></i>
          <span>{{ linkError }}</span>
        </p>
      </div>
      <template #footer>
        <Button variant="ghost" @click="showLinkCvModal = false">Cancelar</Button>
        <Button icon="fas fa-link" :loading="linkLoading" :disabled="!linkCvEnterpriseId || linkLoading"
          @click="handleLinkToCv">Vincular série</Button>
      </template>
    </Modal>

    <!-- Renomear ficha avulsa (o título É a identidade da série) -->
    <Modal v-model:open="showRenameModal" size="sm" title="Renomear ficha">
      <div class="space-y-4">
        <Input v-model="renameValue" label="Nome da ficha"
          placeholder="Ex: RESIDENCIAL SANTA STELLA" @keyup.enter="handleRename" />
        <label class="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-line cursor-pointer text-sm text-ink-muted">
          <input type="checkbox" v-model="renameSeries" class="w-4 h-4 accent-accent rounded" />
          Aplicar a todos os meses desta série ({{ detail?.history?.length ?? 1 }} ficha(s))
        </label>
      </div>
      <template #footer>
        <Button variant="ghost" @click="showRenameModal = false">Cancelar</Button>
        <Button icon="fas fa-check" :loading="renaming" :disabled="renaming || !renameValue.trim()"
          @click="handleRename">Renomear</Button>
      </template>
    </Modal>
    <!-- Erro de carregamento -->
    <div v-if="fetchError && !detail" class="flex flex-col items-center justify-center py-24 text-center px-4">
      <div class="w-14 h-14 rounded-full bg-data-neg/10 flex items-center justify-center mb-4">
        <i class="fas fa-triangle-exclamation text-data-neg text-xl"></i>
      </div>
      <p class="text-base font-semibold text-ink">Erro ao carregar ficha</p>
      <p class="text-sm text-ink-subtle mt-1 max-w-sm">{{ fetchError }}</p>
      <Button class="mt-5" icon="fas fa-arrows-rotate" @click="retryFetch">Tentar novamente</Button>
    </div>

    <!-- Carregando: o esqueleto tem a forma do que vem (cabeçalho, KPIs, blocos),
         então a tela não salta quando os dados chegam. -->
    <div v-else-if="!detail && !fetchError" class="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div class="flex items-center gap-3">
        <Skeleton variant="circle" class="w-8 h-8" />
        <div class="flex-1 space-y-2">
          <Skeleton variant="title" class="max-w-xs" />
          <Skeleton variant="text" class="max-w-[10rem]" />
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Skeleton v-for="i in 5" :key="i" variant="stat" />
      </div>
      <Skeleton variant="card" class="h-40" />
      <Skeleton variant="card" class="h-64" />
    </div>

    <template v-if="detail">
      <!-- ─── Header ─────────────────────────────────────────────────────── -->
      <div ref="headerEl" class="bg-surface-raised border-b border-line sticky top-0 z-20 md:shrink-0">
        <div class="max-w-7xl mx-auto px-4">
          <!-- Top bar -->
          <div class="flex items-center justify-between pb-3 pt-4 sm:pt-6 gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <IconButton icon="fas fa-arrow-left" variant="ghost" size="sm"
                title="Voltar" @click="$router.back()" />
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <i v-if="isAvulsa" class="fas fa-cube text-ink-subtle text-sm" v-tippy="'Ficha avulsa (sem CV)'"></i>
                  <h1 class="text-lg lg:text-xl font-bold text-ink truncate">{{ headerTitle }}</h1>
                  <IconButton v-if="isAvulsa && canEdit && detail.status === 'draft'"
                    icon="fas fa-pen" variant="ghost" size="sm"
                    title="Renomear ficha" @click="openRename" />
                  <Badge :variant="estado.variant" size="sm">{{ estado.rotulo }}</Badge>
                  <Badge v-if="isAvulsa" variant="neutral" size="sm">Avulsa</Badge>
                </div>
                <p class="text-xs text-ink-subtle truncate">
                  <template v-if="!isAvulsa">{{ detail.enterprise?.cidade }} <span class="mx-1">·</span></template>
                  Ref: {{ formatMonth(detail.reference_month) }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <PageHelp
                storage-key="ficha-comercial-detalhe"
                title="Como usar a ficha"
                intro="A ficha é a condição comercial de um empreendimento num mês. Ela se divide em módulos (normalmente uma etapa do CV cada), e cada módulo tem produto, preços, negociação, documentação, campanhas e operacional."
                :steps="[
                  { title: 'Escolha o módulo', text: 'Na lateral direita (ou nas pílulas do topo, em telas menores). Os pontinhos ao lado do nome mostram quantas das cinco frentes já estão preenchidas.' },
                  { title: 'Preencha em Módulos', text: 'O salvamento é automático em vários campos, mas Salvar tudo é o que garante. A linha de estado avisa quando há alteração pendente.' },
                  { title: 'Confira em Resumo', text: 'É a leitura final: KPIs de unidades e todos os blocos como vão sair no papel. Ver documento abre a prévia; Exportar PDF gera o arquivo com TODOS os módulos.' },
                  { title: 'Envie para autorização', text: 'Rascunho → Em autorização → Autorizado. Basta um autorizador. Editar uma ficha autorizada cancela a autorização e devolve para rascunho.' },
                ]"
                :tips="[
                  'As setas ao lado do mês navegam pelo histórico da mesma série — cada mês é uma ficha, e as antigas continuam consultáveis.',
                  'Encerrar o empreendimento congela a ficha como histórico e para a geração mensal. Só um autorizador faz, e a confirmação pede a palavra digitada.',
                  'A aba Histórico registra quem fez o quê e quando, inclusive as autorizações canceladas.',
                ]"
              />
              <!-- Navegação de mês -->
              <div v-if="detail.history?.length > 1" class="flex items-center gap-0.5 bg-surface-sunken rounded-lg p-0.5">
                <IconButton icon="fas fa-chevron-left" variant="ghost" size="sm"
                  :disabled="!olderItem" title="Mês anterior"
                  @click="olderItem && navigateToMonth(olderItem.id)" />
                <span class="text-xs font-semibold text-ink px-2 min-w-[58px] text-center font-mono tabular-nums">
                  {{ formatMonth(detail.reference_month) }}
                </span>
                <IconButton icon="fas fa-chevron-right" variant="ghost" size="sm"
                  :disabled="!newerItem" title="Próximo mês"
                  @click="newerItem && navigateToMonth(newerItem.id)" />
              </div>

              <!-- Ações por status (cada uma conforme a permissão do usuário) -->
              <Button v-if="isAvulsa && canEdit" variant="outline" size="sm" icon="fas fa-link"
                v-tippy="'Vincular esta série avulsa a um empreendimento do CV'" @click="openLinkCv">
                <span class="hidden sm:inline">Vincular ao CV</span>
              </Button>

              <Button v-if="detail.status === 'draft' && canEdit"
                size="sm" icon="fas fa-paper-plane" :loading="actionLoading"
                :disabled="actionLoading || saving"
                v-tippy="isDirty ? 'Salva as alterações pendentes e envia para autorização' : 'Envia para autorização'"
                @click="handleSubmitForApproval">
                <span class="hidden sm:inline">{{ isDirty ? 'Salvar e enviar' : 'Enviar para autorização' }}</span>
              </Button>

              <Button v-if="detail.status === 'pending_approval' && canAuthorize"
                size="sm" icon="fas fa-circle-check" :loading="actionLoading" :disabled="actionLoading"
                @click="handleAuthorize">
                <span class="hidden sm:inline">Autorizar</span>
              </Button>

              <Button v-if="detail.status === 'pending_approval' && (canEdit || canAuthorize)"
                variant="outline" size="sm" icon="fas fa-ban" :disabled="actionLoading"
                @click="showCancelApprovalModal = true">
                <span class="hidden sm:inline">Cancelar autorização</span>
              </Button>

              <Button v-if="detail.status === 'approved' && canAuthorize"
                variant="secondary" size="sm" icon="fas fa-pen-to-square"
                @click="showUnlockModal = true">
                <span class="hidden sm:inline">Editar</span>
              </Button>

              <Button v-if="detail.status === 'closed' && canAuthorize"
                variant="outline" size="sm" icon="fas fa-rotate-left"
                @click="showUnlockModal = true">
                <span class="hidden sm:inline">Reabrir empreendimento</span>
              </Button>

              <Button v-if="detail.status !== 'closed' && detail.status !== 'pending_approval' && canAuthorize"
                variant="ghost" size="sm" icon="fas fa-flag-checkered" :disabled="actionLoading"
                v-tippy="'Encerrar empreendimento (finalização definitiva)'"
                @click="showCloseModal = true">
                <span class="hidden sm:inline">Encerrar</span>
              </Button>

              <Button v-if="canSave" size="sm" icon="fas fa-floppy-disk"
                :loading="saving" :disabled="saving || actionLoading" @click="handleSaveAll">
                <span class="hidden sm:inline">Salvar tudo</span>
              </Button>
            </div>
          </div>

          <!-- Linha de estado: UMA linha diz onde a ficha está e o que falta.
               Antes eram cinco banners concorrendo pelo mesmo espaço. -->
          <p v-if="estado.aviso" class="cond-note mb-3 py-2" :class="`cond-note--${estado.tom}`">
            <i :class="estado.icone" class="fas shrink-0 mt-0.5"></i>
            <span class="text-xs leading-relaxed">
              <strong>{{ estado.aviso }}</strong>
              <template v-if="estado.detalhe"> {{ estado.detalhe }}</template>
            </span>
          </p>

          <!-- Tabs (views) -->
          <div class="flex gap-0 overflow-x-auto scrollbar-hide -mb-px">
            <button
              v-for="tab in visibleTabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition duration-200 ease-out-expo',
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink'
              ]"
            >
              <i :class="tab.icon" class="text-xs"></i>
              {{ tab.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- ─── Corpo: conteúdo + índice flutuante (direita, estilo Academy) ── -->
      <!-- Único scroll da ficha no desktop. `relative` é essencial: os inputs sr-only
           (checkbox/radio, position:absolute) do ModuleSection ancoravam no <html>,
           escapavam do clip do scroller e esticavam o documento — criando o 2º scroll
           fantasma na janela. Com o scroller relative, eles ancoram (e clipam) aqui. -->
      <div class="relative md:flex-1 md:min-h-0 md:overflow-y-auto">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="flex gap-4">
          <main class="flex-1 min-w-0">

            <!-- Navegação compacta (telas < xl, onde o índice flutuante não cabe) -->
            <div v-if="activeTab === 'modules' && localModules.length" class="xl:hidden mb-3 flex gap-1.5 overflow-x-auto scrollbar-hide">
              <button v-for="(mod, i) in localModules" :key="mod.id ?? i" @click="selectModule(i)" :class="['flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition', activeModuleIndex === i ? 'bg-accent-soft border-accent/30 text-accent' : 'border-line text-ink-muted bg-surface-raised']">
                <i :class="mod.idetapa ? 'fas fa-box' : 'fas fa-cube'" class="text-micro"></i>{{ mod.module_name || 'Novo módulo' }}
              </button>
            </div>
            <div v-if="activeTab === 'modules' && activeModule" class="xl:hidden mb-4 flex gap-1.5 overflow-x-auto scrollbar-hide">
              <button v-for="sec in moduleSections" :key="sec.id" @click="scrollToSection(sec.id)" :class="['px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition duration-120 ease-out-expo', activeSection === sec.id ? 'bg-accent-soft border-accent/30 text-accent' : 'border-line text-ink-muted bg-surface-raised']">{{ sec.label }}</button>
            </div>

            <!-- Resumo em telas < xl: sem a lateral, o documento e o PDF ficariam
                 inalcançáveis no celular. Paridade — os dois fazem tudo. -->
            <div v-if="activeTab === 'summary'" class="xl:hidden mb-4 space-y-2">
              <div v-if="localModules.length > 1" class="flex gap-1.5 overflow-x-auto scrollbar-hide">
                <button v-for="(mod, i) in localModules" :key="mod.id ?? i" @click="selectModule(i)"
                  :class="['flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition duration-120 ease-out-expo', activeModuleIndex === i ? 'bg-accent-soft border-accent/30 text-accent' : 'border-line text-ink-muted bg-surface-raised']">
                  <i :class="mod.idetapa ? 'fas fa-box' : 'fas fa-cube'" class="text-micro"></i>{{ mod.module_name || 'Novo módulo' }}
                </button>
              </div>
              <div class="flex gap-2">
                <Button variant="outline" size="sm" icon="fas fa-file-contract" class="flex-1"
                  @click="summaryRef?.openDoc?.()">Ver documento</Button>
                <Button variant="danger" size="sm" icon="fas fa-file-pdf" class="flex-1"
                  @click="summaryRef?.printModule?.()">Exportar PDF</Button>
              </div>
              <p class="text-micro text-ink-subtle leading-snug">
                O PDF sai com <strong>todos</strong> os módulos; a tela mostra um por vez.
              </p>
            </div>

        <!-- Módulos -->
        <div v-show="activeTab === 'modules'">
          <ModuleSection
            :modules="localModules"
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
            v-model:active-index="activeModuleIndex"
            :local-modules="localModules"
            :price-tables="store.priceTables"
            :correspondents="store.correspondents"
            :office-users="store.officeUsers"
            :enterprise-stages="detail.stages ?? []"
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
              <i class="fas fa-timeline text-accent"></i> Linha do tempo: quem, quando, o quê e onde
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
                    <i class="fas fa-user text-micro mr-1"></i>{{ ev.username || 'Sistema' }}
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

          <!-- Índice flutuante (direita, xl+) — sticky no scroll interno da ficha (o header já está fora dele) -->
          <aside v-if="(activeTab === 'modules' || activeTab === 'summary') && localModules.length" class="hidden xl:block w-[240px] shrink-0 self-start sticky top-4">
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
                  <button v-if="canEdit && !isLocked" @click="removeModule(i)" class="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-ink-subtle hover:text-data-neg hover:bg-data-neg/10 transition" title="Remover módulo">
                    <i class="fas fa-trash text-micro"></i>
                  </button>
                </div>
                <!-- Ações do Resumo (na view Resumo): exportar PDF / ver documento -->
                <!-- Documento: ver e exportar andam juntos. O conteúdo é o mesmo
                     que a aba Resumo já mostra, então travar um e liberar o
                     outro só escondia a prévia de quem ia exportar assim mesmo. -->
                <template v-if="activeTab === 'summary'">
                  <p class="cond-toc__grp">Documento</p>
                  <button @click="summaryRef?.openDoc?.()"
                    class="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-accent bg-accent-soft hover:bg-accent-soft/70 transition duration-120 ease-out-expo">
                    <i class="fas fa-file-contract"></i> Ver documento
                  </button>
                  <button @click="summaryRef?.printModule?.()"
                    class="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 mt-1.5 text-xs font-semibold text-white bg-data-neg hover:bg-data-neg/85 transition duration-120 ease-out-expo">
                    <i class="fas fa-file-pdf"></i> Exportar PDF
                  </button>
                  <p class="text-micro text-ink-subtle px-2.5 pt-1.5 leading-snug">
                    O PDF sai com <strong>todos</strong> os módulos; a tela mostra um por vez.
                  </p>
                </template>

                <button v-if="canEdit && !isLocked && activeTab === 'modules'" @click="showAddModuleMenu = !showAddModuleMenu" class="cond-toc__add">
                  <i class="fas fa-plus text-micro mr-1.5"></i> Adicionar módulo
                </button>
                <div v-if="showAddModuleMenu && activeTab === 'modules'" class="ml-1 my-1 pl-2 border-l-2 border-line space-y-0.5">
                  <p v-if="availableStages.length" class="text-micro font-semibold text-ink-subtle uppercase px-1 pt-1">Etapas do CV</p>
                  <button v-for="s in availableStages" :key="s.idetapa" @click="addStageModule(s)" class="w-full flex items-center gap-2 px-2 py-1 text-xs text-ink-muted hover:bg-accent-soft hover:text-accent rounded text-left transition">
                    <i class="fas fa-layer-group text-micro"></i> <span class="truncate">{{ s.nome }}</span>
                  </button>
                  <button @click="addCustomModule" class="w-full flex items-center gap-2 px-2 py-1 text-xs text-ink-muted hover:bg-surface-hover rounded text-left transition">
                    <i class="fas fa-cube text-micro"></i> Módulo avulso
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
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { useConditionsStore } from '@/stores/Comercial/Conditions/conditionsStore';
import { useCan } from '@/composables/useCan';
import ModuleSection from './components/ModuleSection.vue';
import SummaryExport from './components/SummaryExport.vue';
import SignaturePanel from './components/SignaturePanel.vue';

import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import Badge from '@/components/UI/Badge.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import PageHelp from '@/components/UI/PageHelp.vue';

const route = useRoute();
const router = useRouter();
const store = useConditionsStore();

// `configure` (admin) vem das capacidades da tela — lib/screenCapabilities.js.
// Editar/autorizar ficha continua sendo regra de negócio do módulo (canEdit /
// canAuthorize, do GET /conditions/permissions).
const can = useCan('/comercial/conditions');

// Permissões vindas do backend (admin sempre true; demais conforme listas das configurações).
const canEdit = computed(() => !!store.permissions?.canEdit);
const canAuthorize = computed(() => !!store.permissions?.canAuthorize);

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
const fetchError = ref(null);
const isDirty = ref(false);

const enterpriseOptions = ref([]);

// Estado da ficha numa fonte só: o rótulo do selo, o tom da linha de aviso e o
// texto dela. A ordem importa — "reprovada" e "não salvo" ganham do status cru,
// porque é isso que a pessoa precisa ler primeiro.
const estado = computed(() => {
    const d = detail.value;
    if (!d) return { rotulo: '—', variant: 'neutral', tom: 'neutral', icone: 'fa-circle' };

    if (wasRejected.value && d.status === 'draft') {
        return {
            rotulo: 'Reprovada', variant: 'danger', tom: 'neg', icone: 'fa-ban',
            aviso: 'Autorização reprovada.',
            detalhe: [rejectionNote.value, 'Corrija as informações e envie novamente.'].filter(Boolean).join(' '),
        };
    }
    if (d.status === 'approved' || d.status === 'published') {
        return {
            rotulo: 'Autorizado', variant: 'success', tom: 'pos', icone: 'fa-circle-check',
            aviso: 'Ficha autorizada.',
            detalhe: [
                d.approved_at ? `Aprovada em ${formatDateFull(d.approved_at)}.` : '',
                canAuthorize.value ? 'Edições nesta ficha irão cancelar a autorização.' : '',
            ].filter(Boolean).join(' '),
        };
    }
    if (d.status === 'pending_approval') {
        return {
            rotulo: 'Em autorização', variant: 'accent', tom: 'info', icone: 'fa-clock',
            aviso: 'Em autorização — aguardando um autorizador.',
            detalhe: canAuthorize.value ? 'Você pode autorizar esta ficha.' : '',
        };
    }
    if (d.status === 'closed') {
        return {
            rotulo: 'Encerrado', variant: 'neutral', tom: 'neutral', icone: 'fa-flag-checkered',
            aviso: 'Empreendimento encerrado — esta ficha está congelada como histórico.',
            detalhe: canAuthorize.value ? 'Use "Reabrir" para retomar a evolução mensal.' : '',
        };
    }
    const sujo = isDirty.value && !isLocked.value;
    return {
        rotulo: 'Rascunho', variant: 'warning', tom: 'warn', icone: 'fa-circle-dot',
        aviso: sujo ? 'Alterações não salvas.' : '',
        detalhe: sujo ? 'Clique em "Salvar tudo" para não perder os dados.' : '',
    };
});

const ALL_TABS = [
    { id: 'modules', label: 'Módulos', icon: 'fas fa-layer-group', adminOnly: false },
    { id: 'summary', label: 'Resumo',  icon: 'fas fa-file-pdf',    adminOnly: false },
    { id: 'signature', label: 'Assinatura', icon: 'fas fa-file-signature', adminOnly: false },
    { id: 'history', label: 'Histórico', icon: 'fas fa-timeline',  adminOnly: false },
];

const visibleTabs = computed(() =>
    ALL_TABS.filter(t => !t.adminOnly || can('configure'))
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

function selectModule(i) {
    activeModuleIndex.value = i;
    activeSection.value = 'data';
}
function scrollToSection(id) {
    activeSection.value = id;
    document.getElementById(`modsec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

// Toast global das fichas (vive no store; qualquer componente pode notificar).
function showToast(message, type = 'success') {
    store.notify(message, type);
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
    if (isLocked.value) return;
    actionLoading.value = true;
    try {
        // Aguarda auto-saves em voo e persiste TUDO antes de enviar — assim a ficha
        // nunca vai para autorização com edições só na tela (fonte do erro anterior).
        if (savingSilentPromise) { try { await savingSilentPromise; } catch {} }
        const modulesWithSnapshot = await captureAllUnitSnapshots();
        localModules.value = applyIntendedLinks(modulesWithSnapshot);
        const result = await store.saveModules(detail.value.id, localModules.value);
        if (result?.modules) {
            localModules.value = applyIntendedLinks(result.modules.map(m => moduleDefaults(m)));
            for (const mod of localModules.value) rememberStageLink(mod);
        }
        isDirty.value = false;
        // Só envia para autorização depois que o save confirmou (o await acima
        // teria lançado antes de chegar aqui em caso de erro).
        await store.submitForApproval(detail.value.id);
        showToast('Ficha enviada para autorização! Os autorizadores foram notificados.');
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
    } catch (e) {
        const msgs = e.errors ?? [e.message ?? 'Erro ao enviar para autorização.'];
        showToast(`${msgs[0]} — nada foi enviado; corrija e salve antes de enviar.`, 'error');
    } finally {
        actionLoading.value = false;
    }
}

async function handleAuthorize() {
    // Trava de segurança: não autoriza com edições pendentes na tela. (Normalmente
    // a ficha em autorização já está travada, mas isso cobre qualquer estado sujo.)
    if (isDirty.value) {
        showToast('Há alterações não salvas. Salve (ou cancele) antes de autorizar.', 'error');
        return;
    }
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

// ─── Renomear ficha avulsa (título = identidade da série) ────────────────────
const showRenameModal = ref(false);
const renameValue = ref('');
const renameSeries = ref(true);
const renaming = ref(false);

function openRename() {
    renameValue.value = detail.value?.display_name ?? '';
    renameSeries.value = true;
    showRenameModal.value = true;
}

async function handleRename() {
    const name = renameValue.value.trim();
    if (!name) return;
    renaming.value = true;
    try {
        await store.saveCondition(detail.value.id, { display_name: name, rename_series: renameSeries.value });
        showRenameModal.value = false;
        showToast(renameSeries.value ? 'Série renomeada em todos os meses.' : 'Ficha renomeada.');
        await store.fetchDetail(detail.value.id);
        populateFromDetail(store.detail);
    } catch (e) {
        showToast(e.message || 'Erro ao renomear.', 'error');
    } finally {
        renaming.value = false;
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

// Opções dos selects do modal de vínculo — o `Select` do sistema recebe lista
// pronta, então a conversão fica aqui e não no template.
const linkEnterpriseOptions = computed(() => [
    { value: null, label: 'Selecionar empreendimento...' },
    ...cvEnterprises.value.map(e => ({ value: e.idempreendimento, label: e.nome })),
]);
const linkStageOptions = computed(() => [
    { value: null, label: 'Manter livre' },
    ...linkCvStages.value.map(s => ({ value: s.idetapa, label: s.nome })),
]);

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
    if (detail.value?.status === 'approved') {
        // Ficha autorizada não muda no banco pela propagação — a mudança fica na
        // tela e o "Salvar Tudo" confirma (desbloqueia p/ rascunho e reautoriza).
        isDirty.value = true;
        showToast('Campanha atualizada nesta ficha — clique "Salvar Tudo" para confirmar (a ficha volta a rascunho para reautorizar).');
    } else {
        showToast('Campanha atualizada no modelo e nas fichas em rascunho vinculadas.');
    }
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

// ─── Histórico de eventos ─────────────────────────────────────────────────────
// Cada evento tem um TOM, não uma cor própria: 20 pares de cor na mão viraram
// cinco estados. As classes ficam escritas por extenso porque o Tailwind lê o
// texto do arquivo — classe montada em runtime nunca gera CSS.
const TOM_EVENTO = {
    neutro: 'bg-surface-sunken text-ink-muted',
    info:   'bg-accent/10 text-accent',
    pos:    'bg-data-pos/10 text-data-pos',
    warn:   'bg-data-warn/10 text-data-warn',
    neg:    'bg-data-neg/10 text-data-neg',
};

const EVENT_META = {
    created:                   { label: 'Ficha criada',                        icon: 'fa-plus',              tom: 'info' },
    auto_created:              { label: 'Gerada automaticamente',              icon: 'fa-robot',             tom: 'neutro' },
    submitted_for_approval:    { label: 'Enviada para autorização',            icon: 'fa-paper-plane',       tom: 'info' },
    approved:                  { label: 'Autorizada',                          icon: 'fa-check',             tom: 'pos' },
    unlocked:                  { label: 'Desbloqueada para edição',            icon: 'fa-lock-open',         tom: 'warn' },
    closed:                    { label: 'Empreendimento encerrado',            icon: 'fa-flag-checkered',    tom: 'neutro' },
    approval_cancelled:        { label: 'Autorização cancelada',               icon: 'fa-times',             tom: 'neg' },
    approval_rejected:         { label: 'Autorização reprovada',               icon: 'fa-ban',               tom: 'neg' },
    saved:                     { label: 'Alterações salvas (rascunho)',        icon: 'fa-floppy-disk',       tom: 'neutro' },
    edited_after_unlock:       { label: 'Editado após desbloqueio',            icon: 'fa-pen-to-square',     tom: 'warn' },
    module_copied:             { label: 'Módulo copiado',                      icon: 'fa-copy',              tom: 'info' },
    modules_updated:           { label: 'Módulo(s) adicionado(s)',             icon: 'fa-layer-group',       tom: 'info' },
    module_edited:             { label: 'Módulo editado',                      icon: 'fa-pen',               tom: 'neutro' },
    linked_to_cv:              { label: 'Vinculada ao CV',                     icon: 'fa-link',              tom: 'info' },
    campaign_template_updated: { label: 'Campanha atualizada via biblioteca',  icon: 'fa-bullhorn',          tom: 'info' },
    signature_sent:            { label: 'Enviada para assinatura (DocuSign)',  icon: 'fa-file-signature',    tom: 'info' },
    signature_resent:          { label: 'Convite de assinatura reenviado',     icon: 'fa-paper-plane',       tom: 'info' },
    signature_completed:       { label: 'Documento assinado por todos',        icon: 'fa-file-circle-check', tom: 'pos' },
    signature_voided:          { label: 'Envelope de assinatura anulado',      icon: 'fa-ban',               tom: 'neutro' },
};
function eventLabel(action)     { return EVENT_META[action]?.label ?? action; }
function eventIcon(action)      { return EVENT_META[action]?.icon  ?? 'fa-circle'; }
function eventIconClass(action) { return TOM_EVENTO[EVENT_META[action]?.tom ?? 'neutro']; }

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
/* Aviso dentro de diálogo: o tom carrega o significado, o ícone repete ele. */
.cond-note { @apply flex items-start gap-3 p-3.5 rounded-xl border text-sm; }
.cond-note--neg  { @apply bg-data-neg/10  border-data-neg/25  text-data-neg; }
.cond-note--warn { @apply bg-data-warn/10 border-data-warn/25 text-data-warn; }
.cond-note--pos  { @apply bg-data-pos/10  border-data-pos/25  text-data-pos; }
.cond-note--info { @apply bg-accent/10    border-accent/25    text-accent; }
.cond-note--neutral { @apply bg-surface-sunken border-line text-ink-muted; }
.cond-label { @apply block text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5; }
.cond-textarea { @apply w-full px-3.5 py-2.5 text-sm text-ink bg-surface-sunken border border-line rounded-lg
    placeholder:text-ink-subtle outline-none transition duration-120 ease-out-expo resize-none
    focus:border-accent focus:ring-2 focus:ring-accent/15; }
.cond-toc { @apply border border-line rounded-2xl bg-surface-raised p-2.5 overflow-y-auto shadow-sm; max-height: calc(100dvh - 3rem - var(--cond-header-h, 120px) - 3rem); }
.cond-toc__title { @apply text-micro font-bold uppercase tracking-wider text-ink-subtle px-2 pb-1.5 flex items-center; }
.cond-toc__grp { @apply text-micro font-bold uppercase tracking-wider text-ink-subtle px-2 pt-2.5 pb-1; }
.cond-toc__link { @apply w-full flex items-center text-left rounded-lg px-2.5 py-1.5 text-sm text-ink-muted transition; border-left: 2px solid transparent; }
.cond-toc__link:hover { @apply bg-surface-sunken text-ink; }
.cond-toc__link.is-active { @apply bg-accent-soft text-accent font-semibold; border-left-color: currentColor; }
.cond-toc__add { @apply w-full flex items-center rounded-lg px-2.5 py-1.5 mt-1 text-xs font-medium text-accent border border-dashed border-accent/40 hover:bg-accent-soft transition; }
</style>
