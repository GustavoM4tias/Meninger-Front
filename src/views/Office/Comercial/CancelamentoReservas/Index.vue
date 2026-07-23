<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        subtitle="Exclusão automática no Sienge de contratos de reservas canceladas no CV"
        icon="fas fa-eraser">
        <template #title>Cancelamentos CV × Sienge</template>
        <template #actions>
          <PageHelp
            storage-key="cancelamento-reservas"
            intro="Quando uma reserva é cancelada no CV, esta automação confere o contrato no Sienge e, somente se todas as validações de segurança passarem, exclui o contrato aguardando emissão, disponibiliza a unidade no CV e registra uma mensagem na reserva."
            :steps="[
              { title: 'Acompanhe o Histórico', text: 'Cada cancelamento recebido vira um caso com status: Sucesso (executado), Pendência (validação barrou, nada foi alterado - trate manualmente), Não aplicável, Duplicado ou Erro.' },
              { title: 'Abra o detalhe', text: 'Clique em um caso para ver todas as validações executadas (contrato, unidade, cliente, ato) e a linha do tempo completa.' },
              { title: 'Resolva pendências', text: 'Casos barrados movem a reserva para a etapa Pendência no CV. Resolva a causa e use Reprocessar (ou retorne a reserva para Cancelada no CV) - a automação refaz todas as conferências do zero antes de agir.' },
              { title: 'Configurações', text: 'Copie o endereço do webhook para o CV, confira os IDs das etapas Pendência/Cancelada, ative a automação e, se precisar, processe uma reserva manualmente pelo ID.' },
            ]"
            :tips="[
              'A automação NUNCA exclui contrato emitido, com parcela paga ou com boleto de ato pendente/pago - esses casos viram pendência.',
              'Sucesso mantém a reserva em Cancelada; bloqueio/erro move para Pendência no CV. Assim, Cancelada só contém o que foi realmente cancelado nos dois sistemas.',
              'Com a automação pausada, os webhooks continuam sendo registrados e podem ser reprocessados depois.',
            ]" />
          <div v-if="store.settings" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border"
            :class="store.settings.active
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-line bg-surface-sunken text-ink-muted'">
            <span class="relative flex h-2.5 w-2.5">
              <span v-if="store.settings.active"
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5"
                :class="store.settings.active ? 'bg-emerald-500' : 'bg-ink-subtle'"></span>
            </span>
            <span class="text-xs font-medium">
              {{ store.settings.active ? 'Automação ativa' : 'Automação pausada' }}
            </span>
          </div>
        </template>
      </PageHeader>

      <!-- Tabs -->
      <div class="mb-5">
        <SegmentedControl v-model="activeTab" :options="tabOptions" size="md" />
      </div>

      <!-- ── TAB: Histórico ──────────────────────────────────────────────────── -->
      <div v-if="activeTab === 'history'" class="space-y-4">

        <!-- KPIs -->
        <div v-if="store.stats?.byStatus" class="flex flex-wrap gap-2">
          <button v-for="s in kpiChips" :key="s.value"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors min-h-10"
            :class="store.historyFilter.status.includes(s.value)
              ? 'border-accent/50 bg-accent-soft text-accent'
              : 'border-line bg-surface text-ink-muted hover:bg-surface-hover'"
            @click="toggleStatusFilter(s.value)">
            <i :class="s.icon"></i>
            {{ s.label }}
            <span class="font-mono tabular-nums">{{ store.stats.byStatus[s.value] || 0 }}</span>
          </button>
        </div>

        <!-- Filtros -->
        <Surface variant="raised" padding="sm" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input v-model="store.historyFilter.q" placeholder="Titular, unidade, contrato ou motivo..."
              @keyup.enter="applyFilters" />
            <Input v-model="store.historyFilter.idreserva" type="number" placeholder="ID da reserva"
              @keyup.enter="applyFilters" />
            <Input v-model="store.historyFilter.dateFrom" type="date" />
            <Input v-model="store.historyFilter.dateTo" type="date" />
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" size="sm" icon="fas fa-rotate-left" @click="clearFilters">Limpar</Button>
            <Button variant="primary" size="sm" icon="fas fa-magnifying-glass" :loading="store.historyLoading"
              @click="applyFilters">Filtrar</Button>
          </div>
        </Surface>

        <div v-if="store.historyError"
          class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {{ store.historyError }}
        </div>

        <!-- Lista -->
        <Surface variant="raised" padding="none" class="overflow-hidden">
          <div v-if="store.historyLoading" class="py-14 grid place-items-center">
            <Spinner />
          </div>

          <EmptyState v-else-if="!store.history.length"
            icon="fas fa-inbox"
            title="Nenhum cancelamento registrado"
            description="Quando o CV disparar o webhook de cancelamento de reserva, os casos aparecem aqui." />

          <template v-else>
            <!-- Desktop: tabela -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-[11px] uppercase tracking-wider text-ink-subtle border-b border-line">
                    <th class="px-4 py-3 font-medium">Caso</th>
                    <th class="px-4 py-3 font-medium">Reserva / Titular</th>
                    <th class="px-4 py-3 font-medium">Unidade</th>
                    <th class="px-4 py-3 font-medium">Contrato Sienge</th>
                    <th class="px-4 py-3 font-medium">Status</th>
                    <th class="px-4 py-3 font-medium">Ações executadas</th>
                    <th class="px-4 py-3 font-medium text-right">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in store.history" :key="item.id"
                    class="border-b border-line last:border-0 hover:bg-surface-hover cursor-pointer transition-colors"
                    @click="openDetail(item)">
                    <td class="px-4 py-3 font-mono text-ink-muted">#{{ item.id }}</td>
                    <td class="px-4 py-3">
                      <div class="font-medium text-ink">{{ item.titular_nome || '-' }}</div>
                      <div class="text-xs text-ink-muted">Reserva {{ item.idreserva }}</div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="text-ink">{{ item.unidade_nome || '-' }}</div>
                      <div class="text-xs text-ink-muted">{{ item.empreendimento || '-' }}</div>
                    </td>
                    <td class="px-4 py-3">
                      <div v-if="item.contrato_numero" class="font-mono text-xs text-ink">{{ item.contrato_numero }}</div>
                      <div v-else class="text-xs text-ink-subtle">sem contrato</div>
                    </td>
                    <td class="px-4 py-3">
                      <Badge :variant="statusMeta(item.status).variant" size="sm" dot>
                        {{ statusMeta(item.status).label }}
                      </Badge>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex flex-wrap gap-1">
                        <Badge v-if="item.sienge_contrato_excluido" variant="danger" size="sm" outlined>Contrato excluído</Badge>
                        <Badge v-if="item.cv_unidade_disponibilizada" variant="success" size="sm" outlined>Unidade liberada</Badge>
                        <span v-if="!item.sienge_contrato_excluido && !item.cv_unidade_disponibilizada"
                          class="text-xs text-ink-subtle">nenhuma</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right text-xs text-ink-muted whitespace-nowrap">
                      {{ formatDateTime(item.created_at) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile: cards -->
            <div class="md:hidden divide-y divide-line">
              <button v-for="item in store.history" :key="item.id"
                class="w-full text-left px-4 py-3 active:bg-surface-hover"
                @click="openDetail(item)">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="font-medium text-ink truncate">{{ item.titular_nome || `Reserva ${item.idreserva}` }}</span>
                  <Badge :variant="statusMeta(item.status).variant" size="sm" dot>
                    {{ statusMeta(item.status).label }}
                  </Badge>
                </div>
                <div class="text-xs text-ink-muted">
                  Reserva {{ item.idreserva }} · {{ item.unidade_nome || '-' }} · {{ item.empreendimento || '-' }}
                </div>
                <div class="flex items-center justify-between mt-1.5">
                  <div class="flex flex-wrap gap-1">
                    <Badge v-if="item.sienge_contrato_excluido" variant="danger" size="sm" outlined>Contrato excluído</Badge>
                    <Badge v-if="item.cv_unidade_disponibilizada" variant="success" size="sm" outlined>Unidade liberada</Badge>
                  </div>
                  <span class="text-[11px] text-ink-subtle">{{ formatDateTime(item.created_at) }}</span>
                </div>
              </button>
            </div>

            <!-- Paginação -->
            <div v-if="store.totalPages > 1"
              class="flex items-center justify-between gap-3 px-4 py-3 border-t border-line">
              <span class="text-xs text-ink-muted">
                <span class="font-mono tabular-nums">{{ store.historyTotal }}</span> registros
              </span>
              <div class="flex gap-1 flex-wrap justify-end">
                <button v-for="p in store.totalPages" :key="p"
                  @click="store.setPage(p)"
                  class="h-8 min-w-8 px-2.5 rounded-lg text-sm font-medium transition-colors"
                  :class="store.historyPage === p ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-hover'">
                  {{ p }}
                </button>
              </div>
            </div>
          </template>
        </Surface>
      </div>

      <!-- ── TAB: Configurações ──────────────────────────────────────────────── -->
      <div v-if="activeTab === 'settings'" class="space-y-5">

        <!-- Card: Ativação -->
        <Surface variant="raised" padding="md" class="space-y-4 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-accent-soft text-accent border border-accent/20 grid place-items-center">
              <i class="fas fa-power-off"></i>
            </div>
            <div>
              <h2 class="font-semibold text-ink text-sm">Ativação da automação</h2>
              <p class="text-xs text-ink-muted">Com a automação pausada, os webhooks são registrados como "Não aplicável" e podem ser reprocessados depois.</p>
            </div>
          </div>
          <Switch
            :model-value="!!store.settings?.active"
            label="Processar cancelamentos automaticamente"
            :description="store.settings?.active
              ? 'Ativa: exclusão no Sienge e liberação da unidade no CV rodam sozinhas quando todas as validações passam.'
              : 'Pausada: nenhum dado é alterado no Sienge nem no CV.'"
            :disabled="store.settingsLoading"
            @update:model-value="handleToggleActive" />
          <div v-if="store.settingsError"
            class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {{ store.settingsError }}
          </div>
        </Surface>

        <!-- Card: Webhook -->
        <Surface variant="raised" padding="md" class="space-y-3 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 grid place-items-center">
              <i class="fas fa-link"></i>
            </div>
            <div>
              <h2 class="font-semibold text-ink text-sm">Endereço do Webhook</h2>
              <p class="text-xs text-ink-muted">Configure este endereço no cadastro de webhooks do CV</p>
            </div>
          </div>

          <div class="flex items-center gap-2 bg-surface-sunken border border-line rounded-lg px-3 py-2.5">
            <code class="text-xs sm:text-sm text-accent flex-1 break-all select-all font-mono">
              {{ webhookUrl }}
            </code>
            <Button variant="primary" size="sm" :icon="copied ? 'fas fa-check' : 'fas fa-copy'" @click="copyWebhook">
              {{ copied ? 'Copiado!' : 'Copiar' }}
            </Button>
          </div>

          <Surface variant="raised" padding="sm" class="border-amber-500/30 bg-amber-500/10">
            <div class="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
              <i class="fas fa-circle-info mt-0.5"></i>
              <span>
                No CV, crie o webhook para a funcionalidade <strong>Reserva</strong> com gatilho no
                <strong>cancelamento/distrato</strong> apontando para este endereço. A automação sempre
                reconfere a reserva ao vivo no CV antes de agir - webhooks de reservas não canceladas são ignorados.
              </span>
            </div>
          </Surface>
        </Surface>

        <!-- Card: Etapas do workflow CV -->
        <Surface variant="raised" padding="md" class="space-y-4 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 grid place-items-center">
              <i class="fas fa-diagram-project"></i>
            </div>
            <div>
              <h2 class="font-semibold text-ink text-sm">Etapas do workflow CV</h2>
              <p class="text-xs text-ink-muted">
                Sucesso mantém/devolve a reserva para <strong>Cancelada</strong>; bloqueio ou erro move para
                <strong>Pendência</strong>. Mover Pendência de volta para Cancelada no CV re-dispara a automação.
              </p>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input v-model="situacaoForm.situacao_pendencia_id" type="number"
              label="ID da etapa Pendência" placeholder="30"
              hint="Etapa aplicada quando o cancelamento é barrado ou falha." />
            <Input v-model="situacaoForm.situacao_cancelada_id" type="number"
              label="ID da etapa Cancelada" placeholder="4"
              hint="Etapa de cancelamento concluído (mantida no sucesso)." />
          </div>
          <div class="flex justify-end">
            <Button variant="primary" size="sm" icon="fas fa-check" :loading="store.settingsLoading"
              @click="handleSaveSituacoes">Salvar etapas</Button>
          </div>
        </Surface>

        <!-- Card: Processamento manual -->
        <Surface variant="raised" padding="md" class="space-y-3 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 grid place-items-center">
              <i class="fas fa-hand-pointer"></i>
            </div>
            <div>
              <h2 class="font-semibold text-ink text-sm">Processar reserva manualmente</h2>
              <p class="text-xs text-ink-muted">
                Roda o mesmo fluxo completo (com todas as validações) para uma reserva cancelada específica -
                útil para tratar cancelamentos antigos, anteriores à automação.
              </p>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row gap-2">
            <Input v-model="manualIdreserva" type="number" placeholder="ID da reserva no CV" class="flex-1"
              @keyup.enter="handleProcessManual" />
            <Button variant="primary" icon="fas fa-play" :loading="manualLoading"
              :disabled="!manualIdreserva || manualLoading" @click="handleProcessManual">
              Processar
            </Button>
          </div>
          <div v-if="manualResult"
            class="rounded-lg border px-3 py-2 text-sm"
            :class="manualResult.ok
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'">
            {{ manualResult.text }}
          </div>
        </Surface>

        <!-- Card: Requisitos -->
        <Surface variant="raised" padding="md" class="space-y-2 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 grid place-items-center">
              <i class="fas fa-shield-halved"></i>
            </div>
            <div>
              <h2 class="font-semibold text-ink text-sm">Regras de segurança (fixas)</h2>
              <p class="text-xs text-ink-muted">Nenhuma exclusão acontece sem TODAS as condições abaixo.</p>
            </div>
          </div>
          <ul class="text-xs text-ink-muted space-y-1.5 list-disc pl-5">
            <li>Reserva confirmada como cancelada/distratada ao vivo no CV (nunca só pelo webhook).</li>
            <li>Exatamente 1 contrato ativo no Sienge vinculado à reserva, na situação <strong>Autorizado</strong> (aguardando emissão) e sem data de emissão.</li>
            <li>Unidade, empreendimento e cliente (por CPF/CNPJ) do contrato conferidos contra a reserva.</li>
            <li>Nenhuma parcela paga no contrato e nenhum boleto de ato pendente, pago ou em processamento.</li>
            <li>Nenhum outro contrato ativo na mesma unidade no Sienge.</li>
            <li>Exclusão confirmada por releitura (por reserva e por unidade) antes de liberar a unidade no CV.</li>
            <li>Sem contrato no Sienge: a unidade só é liberada após cruzar todas as referências (reserva, unidade, número de integração e documento do cliente) sem achar contrato ativo.</li>
            <li>Sucesso mantém a reserva em <strong>Cancelada</strong>; bloqueio ou erro move para <strong>Pendência</strong> no CV, com mensagem orientando o e-mail ao administrativo interno.</li>
          </ul>
        </Surface>

        <!-- Card: Simulação (dev only) -->
        <Surface v-if="isDev" variant="raised" padding="md" class="space-y-3 surface-gradient">
          <h2 class="font-semibold text-ink text-sm"><i class="fas fa-flask mr-2 text-ink-subtle"></i>Simular Webhook (dev)</h2>
          <div class="flex flex-col sm:flex-row gap-2">
            <Input v-model="simulateIdreserva" type="number" placeholder="ID da reserva" class="flex-1" />
            <Button variant="ghost" icon="fas fa-bolt" :disabled="!simulateIdreserva" @click="handleSimulate">Simular</Button>
          </div>
        </Surface>
      </div>
    </PageContainer>

    <!-- ── Modal de detalhe ──────────────────────────────────────────────────── -->
    <Modal :open="detail.open" size="lg" :title="detail.item ? `Caso #${detail.item.id} - Reserva ${detail.item.idreserva}` : ''"
      :subtitle="detail.item?.titular_nome || ''" @close="closeDetail">
      <div v-if="detail.item" class="space-y-4">

        <!-- Resumo -->
        <div class="flex flex-wrap items-center gap-2">
          <Badge :variant="statusMeta(detail.item.status).variant" dot>{{ statusMeta(detail.item.status).label }}</Badge>
          <Badge v-if="detail.item.manual" variant="info" outlined>Disparo manual</Badge>
          <Badge v-if="detail.item.sienge_contrato_excluido" variant="danger" outlined>Contrato excluído no Sienge</Badge>
          <Badge v-if="detail.item.cv_unidade_disponibilizada" variant="success" outlined>Unidade liberada no CV</Badge>
          <Badge v-if="detail.item.cv_mensagem_enviada" variant="neutral" outlined>Mensagem no CV</Badge>
          <Badge v-if="detail.item.cv_situacao_alterada"
            :variant="detail.item.situacao_aplicada_id === store.settings?.situacao_pendencia_id ? 'warning' : 'success'" outlined>
            {{ detail.item.situacao_aplicada_id === store.settings?.situacao_pendencia_id
              ? 'Reserva movida para Pendência no CV'
              : `Etapa CV aplicada (ID ${detail.item.situacao_aplicada_id})` }}
          </Badge>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div class="bg-surface-sunken border border-line rounded-lg p-3 space-y-1">
            <div class="text-[11px] uppercase tracking-wider text-ink-subtle">Reserva CV</div>
            <div class="text-ink">{{ detail.item.titular_nome || '-' }}</div>
            <div class="text-xs text-ink-muted">Reserva {{ detail.item.idreserva }} · {{ detail.item.unidade_nome || '-' }}</div>
            <div class="text-xs text-ink-muted">{{ detail.item.empreendimento || '-' }}</div>
            <div class="text-xs text-ink-muted">Cancelada em: {{ formatDateBr(detail.item.data_cancelamento) }}</div>
            <div v-if="detail.item.motivo_cancelamento" class="text-xs text-ink-muted">Motivo: {{ detail.item.motivo_cancelamento }}</div>
          </div>
          <div class="bg-surface-sunken border border-line rounded-lg p-3 space-y-1">
            <div class="text-[11px] uppercase tracking-wider text-ink-subtle">Contrato Sienge</div>
            <template v-if="detail.item.contrato_id">
              <div class="text-ink font-mono text-xs">{{ detail.item.contrato_numero }}</div>
              <div class="text-xs text-ink-muted">ID {{ detail.item.contrato_id }} · Situação: {{ detail.item.contrato_situacao || '-' }}</div>
              <div class="text-xs text-ink-muted">Valor: {{ formatCurrency(detail.item.contrato_valor) }}</div>
            </template>
            <div v-else class="text-xs text-ink-muted">Nenhum contrato ativo localizado no Sienge.</div>
          </div>
        </div>

        <div v-if="detail.item.motivo"
          class="rounded-lg border px-3 py-2 text-sm"
          :class="detail.item.status === 'error'
            ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'">
          {{ detail.item.motivo }}
        </div>

        <!-- Validações -->
        <div v-if="detail.item.checks?.length">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-2">Validações</h3>
          <ul class="space-y-1.5">
            <li v-for="(c, i) in detail.item.checks" :key="i" class="flex items-start gap-2 text-sm">
              <i :class="c.ok ? 'fas fa-circle-check text-emerald-500' : 'fas fa-circle-xmark text-red-500'" class="mt-0.5"></i>
              <span class="text-ink"><strong>{{ c.check }}:</strong> <span class="text-ink-muted">{{ c.detalhe }}</span></span>
            </li>
          </ul>
        </div>

        <!-- Warnings -->
        <div v-if="detail.item.warnings?.length">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-2">Avisos</h3>
          <ul class="space-y-1.5">
            <li v-for="(w, i) in detail.item.warnings" :key="i" class="flex items-start gap-2 text-sm">
              <i class="fas fa-triangle-exclamation text-amber-500 mt-0.5"></i>
              <span class="text-ink-muted">{{ w.etapa }}: {{ w.erro }}</span>
            </li>
          </ul>
        </div>

        <!-- Timeline -->
        <div>
          <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-2">Linha do tempo</h3>
          <div v-if="store.timelineLoading" class="py-6 grid place-items-center"><Spinner /></div>
          <div v-else-if="store.timelineError" class="text-sm text-red-600 dark:text-red-400">{{ store.timelineError }}</div>
          <ol v-else class="relative border-l border-line ml-2 space-y-3">
            <li v-for="evt in store.timelineEvents" :key="evt.id" class="ml-4">
              <span class="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border border-surface"
                :class="{
                  'bg-emerald-500': evt.severity === 'success',
                  'bg-amber-500': evt.severity === 'warning',
                  'bg-red-500': evt.severity === 'error',
                  'bg-ink-subtle': !['success','warning','error'].includes(evt.severity),
                }"></span>
              <div class="text-xs text-ink-subtle">{{ formatDateTime(evt.created_at) }} · caso #{{ evt.history_id }}</div>
              <div class="text-sm text-ink">{{ evt.message || evt.type }}</div>
            </li>
          </ol>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between gap-2 w-full">
          <span v-if="retryFeedback" class="text-xs"
            :class="retryFeedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
            {{ retryFeedback.text }}
          </span>
          <div class="flex items-center gap-2 ml-auto">
            <Button variant="ghost" @click="closeDetail">Fechar</Button>
            <Button v-if="detail.item && ['blocked','error','skipped'].includes(detail.item.status)"
              variant="primary" icon="fas fa-rotate-right" :loading="retryLoading" @click="handleRetry">
              Reprocessar
            </Button>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useReservaCancelStore } from '@/stores/Comercial/ReservaCancel/reservaCancelStore';
import API_URL from '@/config/apiUrl';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Switch from '@/components/UI/Switch.vue';
import Modal from '@/components/UI/Modal.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Spinner from '@/components/UI/Spinner.vue';

const store = useReservaCancelStore();

// ── Tabs ──────────────────────────────────────────────────────────────────────
const activeTab = ref('history');
const tabOptions = [
  { value: 'history', label: 'Histórico', icon: 'fas fa-clock-rotate-left' },
  { value: 'settings', label: 'Configurações', icon: 'fas fa-gear' },
];

// ── Status ────────────────────────────────────────────────────────────────────
const STATUS_META = {
  processing: { label: 'Processando', variant: 'info', icon: 'fas fa-spinner' },
  success: { label: 'Sucesso', variant: 'success', icon: 'fas fa-circle-check' },
  blocked: { label: 'Pendência', variant: 'warning', icon: 'fas fa-hand' },
  skipped: { label: 'Não aplicável', variant: 'neutral', icon: 'fas fa-forward' },
  ignored: { label: 'Duplicado', variant: 'neutral', icon: 'fas fa-clone' },
  error: { label: 'Erro', variant: 'danger', icon: 'fas fa-circle-exclamation' },
};
function statusMeta(s) {
  return STATUS_META[s] || { label: s, variant: 'neutral', icon: 'fas fa-circle' };
}
const kpiChips = computed(() =>
  Object.entries(STATUS_META).map(([value, m]) => ({ value, ...m })));

function toggleStatusFilter(value) {
  const arr = store.historyFilter.status;
  const idx = arr.indexOf(value);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(value);
  applyFilters();
}

// ── Filtros ───────────────────────────────────────────────────────────────────
function applyFilters() {
  store.historyPage = 1;
  store.fetchHistory();
  store.fetchStats();
}
function clearFilters() {
  store.resetHistoryFilters();
  store.fetchHistory();
  store.fetchStats();
}

// ── Detalhe ───────────────────────────────────────────────────────────────────
const detail = ref({ open: false, item: null });
const retryLoading = ref(false);
const retryFeedback = ref(null);

function openDetail(item) {
  detail.value = { open: true, item };
  retryFeedback.value = null;
  store.fetchTimeline(item.id);
}
function closeDetail() {
  detail.value = { open: false, item: null };
}

async function handleRetry() {
  if (!detail.value.item) return;
  retryLoading.value = true;
  retryFeedback.value = null;
  const res = await store.retryHistoryItem(detail.value.item.id);
  retryLoading.value = false;
  if (res.ok) {
    const meta = statusMeta(res.data?.status);
    retryFeedback.value = {
      ok: res.data?.status === 'success',
      text: `Reprocessado: ${meta.label}${res.data?.motivo ? ` - ${res.data.motivo}` : ''}`,
    };
    await store.fetchHistory({ silent: true });
    await store.fetchStats();
    const updated = store.history.find(h => h.id === res.data?.id);
    if (updated) {
      detail.value.item = updated;
      store.fetchTimeline(updated.id, { silent: true });
    }
  } else {
    retryFeedback.value = { ok: false, text: res.error };
  }
}

// ── Settings ──────────────────────────────────────────────────────────────────
const webhookUrl = computed(() => `${API_URL}/cancelamento-reservas/webhook`);
const copied = ref(false);
function copyWebhook() {
  navigator.clipboard.writeText(webhookUrl.value).then(() => {
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  });
}

async function handleToggleActive(value) {
  await store.saveSettings({ active: value });
}

// ── Etapas do workflow CV ─────────────────────────────────────────────────────
const situacaoForm = ref({ situacao_pendencia_id: '', situacao_cancelada_id: '' });

watch(() => store.settings, (s) => {
  if (!s) return;
  situacaoForm.value = {
    situacao_pendencia_id: s.situacao_pendencia_id ?? '',
    situacao_cancelada_id: s.situacao_cancelada_id ?? '',
  };
}, { immediate: true });

async function handleSaveSituacoes() {
  await store.saveSettings({
    situacao_pendencia_id: Number(situacaoForm.value.situacao_pendencia_id) || null,
    situacao_cancelada_id: Number(situacaoForm.value.situacao_cancelada_id) || null,
  });
}

// ── Processamento manual ──────────────────────────────────────────────────────
const manualIdreserva = ref('');
const manualLoading = ref(false);
const manualResult = ref(null);

async function handleProcessManual() {
  if (!manualIdreserva.value) return;
  manualLoading.value = true;
  manualResult.value = null;
  const res = await store.processManual(manualIdreserva.value);
  manualLoading.value = false;
  if (res.ok) {
    const meta = statusMeta(res.data?.status);
    manualResult.value = {
      ok: res.data?.status === 'success',
      text: `Caso #${res.data?.id}: ${meta.label}${res.data?.motivo ? ` - ${res.data.motivo}` : ''}`,
    };
    manualIdreserva.value = '';
    store.fetchHistory({ silent: true });
    store.fetchStats();
  } else {
    manualResult.value = { ok: false, text: res.error };
  }
}

// ── Simulação (dev) ───────────────────────────────────────────────────────────
const isDev = import.meta.env.DEV;
const simulateIdreserva = ref('');
async function handleSimulate() {
  if (!simulateIdreserva.value) return;
  await store.simulateWebhook(simulateIdreserva.value);
  simulateIdreserva.value = '';
  setTimeout(() => {
    activeTab.value = 'history';
    store.fetchHistory();
    store.fetchStats();
  }, 1500);
}

// ── Formatação ────────────────────────────────────────────────────────────────
function formatDateTime(v) {
  if (!v) return '-';
  return new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function formatDateBr(v) {
  if (!v) return '-';
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v);
}
function formatCurrency(v) {
  if (v == null) return '-';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

onMounted(() => {
  store.fetchSettings();
  store.fetchHistory();
  store.fetchStats();
  store.fetchFacets();
});
</script>
