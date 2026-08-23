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
              { title: 'Acompanhe o Histórico', text: 'A lista mostra uma linha por RESERVA, com a situação mais recente: Sucesso (executado), Pendência (validação barrou, nada foi alterado - trate manualmente), Retido (rajada), Não aplicável, Duplicado ou Erro. Quando a reserva passou mais de uma vez pela automação, aparece o total de ocorrências ao lado do número do caso.' },
              { title: 'Confira a etapa no CV', text: 'A coluna Etapa CV mostra a etapa atual da reserva e a do repasse, nas cores do workflow do CV. Clique na etapa para abrir a tela correspondente no CV.' },
              { title: 'Abra o detalhe', text: 'Clique em uma linha para ver as validações executadas (contrato, unidade, cliente, ato), a lista de ocorrências da reserva e a linha do tempo consolidada de todas elas.' },
              { title: 'Resolva pendências', text: 'Casos barrados movem a reserva para a etapa Pendência no CV. Resolva a causa e use Reprocessar (ou retorne a reserva para Cancelada no CV) - a automação refaz todas as conferências do zero antes de agir.' },
              { title: 'Configurações', text: 'Copie o endereço do webhook para o CV, confira os IDs das etapas Pendência/Cancelada, regule o freio de rajada (teto, janela e espera), ative a automação e, se precisar, processe uma reserva manualmente pelo ID.' },
            ]"
            :tips="[
              'A automação NUNCA exclui contrato emitido, com parcela paga ou com boleto de ato pendente/pago - esses casos viram pendência.',
              'Sucesso mantém a reserva em Cancelada; bloqueio/erro move para Pendência no CV. Assim, Cancelada só contém o que foi realmente cancelado nos dois sistemas.',
              'Com a automação pausada, os webhooks continuam sendo registrados e podem ser reprocessados depois.',
              'Cancelamento em massa no CV aciona o freio de rajada: NENHUM caso da rajada roda, todos ficam Retido até você conferir a origem e reprocessar o que for legítimo.',
            ]" />
          <div v-if="store.settings" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border"
            :class="store.settings.active
              ? 'border-data-pos/30 bg-data-pos/10 text-data-pos'
              : 'border-line bg-surface-sunken text-ink-muted'">
            <span class="relative flex h-2.5 w-2.5">
              <span v-if="store.settings.active"
                class="animate-ping absolute inline-flex h-full w-full rounded-full bg-data-pos opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5"
                :class="store.settings.active ? 'bg-data-pos' : 'bg-ink-subtle'"></span>
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
        <ReservaCancelFilters @filter-changed="applyFilters" />

        <div v-if="store.historyError"
          class="rounded-lg border border-data-neg/30 bg-data-neg/10 px-3 py-2 text-sm text-data-neg">
          {{ store.historyError }}
        </div>

        <!-- Lista -->
        <!-- A listagem é o primitivo. Era tabela à mão + lista de cartões
             escrita em paralelo, e as duas versões divergiram: ORDENAR só
             existia no cabeçalho da tabela, então quem abria no celular não
             tinha como ordenar por nada. A ordenação vinha do servidor e os
             botões estavam presos ao monitor. -->
        <DataTable
          :columns="histColumns"
          :rows="store.history"
          row-key="id"
          :loading="store.historyLoading"
          manual-sort
          clickable
          v-model:sort-by="ordenarPor"
          v-model:sort-dir="ordenarDir"
          empty-icon="fas fa-inbox"
          empty-title="Nenhum cancelamento registrado"
          empty-text="Quando o CV disparar o webhook de cancelamento de reserva, os casos aparecem aqui."
          @row-click="openDetail">

          <template #cell-caso="{ row }">
            <span class="font-mono text-ink-muted whitespace-nowrap">#{{ row.id }}</span>
            <span v-if="row.casos_count > 1"
              class="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-micro font-semibold bg-ink/5 text-ink-muted border border-line align-middle"
              :title="`${row.casos_count} ocorrências desta reserva - abra o caso para ver todas`">
              <i class="fas fa-layer-group text-[9px]"></i> {{ row.casos_count }}
            </span>
          </template>

          <template #cell-titular="{ row }">
            <span class="font-medium text-ink">{{ row.titular_nome || '-' }}</span>
            <span class="block text-xs text-ink-muted font-normal">Reserva {{ row.idreserva }}</span>
          </template>

          <template #cell-unidade="{ row }">
            <span class="text-ink">{{ row.unidade_nome || '-' }}</span>
            <span class="block text-xs text-ink-muted">{{ row.empreendimento || '-' }}</span>
          </template>

          <template #cell-contrato="{ row }">
            <span v-if="row.contrato_numero" class="font-mono text-xs text-ink">{{ row.contrato_numero }}</span>
            <span v-else class="text-xs text-ink-subtle">sem contrato</span>
          </template>

          <template #cell-status="{ row }">
            <Badge :variant="statusMeta(row.status).variant" size="sm" dot>
              {{ statusMeta(row.status).label }}
            </Badge>
          </template>

          <!-- Reserva e repasse são workflows diferentes no CV: a reserva pode
               estar em Pendência enquanto o repasse segue noutra etapa. -->
          <template #cell-_etapa="{ row }">
            <span class="flex flex-wrap gap-1">
              <a v-if="row.cv_situacao" :href="cvReservaUrl(row)" target="_blank" rel="noopener" @click.stop
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-micro font-semibold border border-line bg-surface-sunken text-ink-muted hover:opacity-80 transition-opacity focus-ring"
                :style="cvBadgeStyle(row.cv_situacao_cor_bg, row.cv_situacao_cor_nome)"
                :title="`Reserva: ${row.cv_situacao} - abrir no CV`">
                <i class="fas fa-flag text-[9px]"></i>{{ row.cv_situacao }}
              </a>
              <a v-if="row.cv_situacao_repasse" :href="cvRepasseUrl(row)" target="_blank" rel="noopener" @click.stop
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-micro font-semibold border border-line bg-surface-sunken text-ink-muted hover:opacity-80 transition-opacity focus-ring"
                :style="cvBadgeStyle(row.cv_repasse_cor_bg, row.cv_repasse_cor_nome)"
                :title="`Repasse: ${row.cv_situacao_repasse} - abrir no CV`">
                <i class="fas fa-building-columns text-[9px]"></i>{{ row.cv_situacao_repasse }}
              </a>
              <span v-if="!row.cv_situacao && !row.cv_situacao_repasse" class="text-xs text-ink-subtle">-</span>
            </span>
          </template>

          <template #cell-_acoes="{ row }">
            <span class="flex flex-wrap gap-1">
              <Badge v-if="row.sienge_contrato_excluido" variant="danger" size="sm" outlined>Contrato excluído</Badge>
              <Badge v-if="row.cv_unidade_disponibilizada" variant="success" size="sm" outlined>Unidade liberada</Badge>
              <span v-if="!row.sienge_contrato_excluido && !row.cv_unidade_disponibilizada"
                class="text-xs text-ink-subtle">nenhuma</span>
            </span>
          </template>

          <template #cell-quando="{ row }">
            <span class="whitespace-nowrap">{{ formatDateTime(row.createdAt ?? row.created_at) }}</span>
          </template>

          <template #actions="{ row }">
            <a :href="cvReservaUrl(row)" target="_blank" rel="noopener"
              class="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-subtle hover:text-accent hover:bg-surface-sunken transition-colors focus-ring"
              title="Abrir reserva no CV">
              <i class="fas fa-arrow-up-right-from-square text-xs"></i>
            </a>
          </template>
        </DataTable>

        <!-- Paginação -->
        <div v-if="store.totalPages > 1"
          class="flex items-center justify-between gap-3 mt-3 px-1">
          <span class="text-xs text-ink-muted">
            <span class="font-mono tabular-nums">{{ store.historyTotal }}</span> registros
          </span>
          <div class="flex gap-1 flex-wrap justify-end">
            <button v-for="p in store.totalPages" :key="p" type="button"
              @click="store.setPage(p)"
              class="h-10 min-w-10 px-2.5 rounded-lg text-sm font-medium transition-colors focus-ring"
              :class="store.historyPage === p ? 'bg-accent text-white' : 'text-ink-muted hover:bg-surface-hover'">
              {{ p }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── TAB: Configurações ──────────────────────────────────────────────── -->
      <div v-if="activeTab === 'settings' && can('configure')" class="space-y-5">

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
            class="rounded-lg border border-data-neg/30 bg-data-neg/10 px-3 py-2 text-sm text-data-neg">
            {{ store.settingsError }}
          </div>
        </Surface>

        <!-- Card: Freio de rajada -->
        <Surface variant="raised" padding="md" class="space-y-4 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-data-warn/10 text-data-warn border border-data-warn/20 grid place-items-center">
              <i class="fas fa-shield-halved"></i>
            </div>
            <div>
              <h2 class="font-semibold text-ink text-sm">Freio de rajada</h2>
              <p class="text-xs text-ink-muted">
                Cancelamento em massa no CV quase nunca é operação legítima. Quando o volume passa do teto,
                <strong>nenhum</strong> caso da rajada é executado - todos ficam "Retido (rajada)" para conferência.
              </p>
            </div>
          </div>

          <Switch
            :model-value="!!store.settings?.burst_guard_active"
            label="Segurar cancelamentos em rajada"
            :description="store.settings?.burst_guard_active
              ? 'Ligado: passou do teto, nada é alterado no Sienge nem no CV até você conferir e reprocessar.'
              : 'Desligado: cada cancelamento é processado assim que chega, sem olhar o volume.'"
            :disabled="store.settingsLoading"
            @update:model-value="handleToggleRajada" />

          <Switch
            :model-value="!!store.settings?.baixar_boleto_no_cancelamento"
            label="Baixar o boleto do ato na hora do cancelamento"
            :description="store.settings?.baixar_boleto_no_cancelamento
              ? 'Ligado: o boleto pendente é baixado no Ecobrança junto com o cancelamento. Numa rajada, isso vira baixa em massa.'
              : 'Desligado: o boleto pendente segue vivo até vencer, e a rotina diária o baixa pelo caminho normal. Até o vencimento o cliente ainda consegue pagar o ato.'"
            :disabled="store.settingsLoading"
            @update:model-value="handleToggleBaixaAto" />

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input v-model="rajadaForm.burst_max_cancels" type="number"
              label="Teto de cancelamentos" placeholder="10"
              hint="Acima disso na janela, a rajada inteira é retida." />
            <Input v-model="rajadaForm.burst_window_seconds" type="number"
              label="Janela (segundos)" placeholder="300"
              hint="Período observado para contar os cancelamentos." />
            <Input v-model="rajadaForm.burst_settle_seconds" type="number"
              label="Espera antes de agir (segundos)" placeholder="15"
              hint="Atrasa cada caso para ele enxergar a rajada inteira." />
          </div>

          <Surface variant="raised" padding="sm" class="border-data-warn/30 bg-data-warn/10">
            <div class="flex items-start gap-2 text-xs text-data-warn">
              <i class="fas fa-circle-info mt-0.5"></i>
              <span>
                A espera é o que garante que <strong>nenhum</strong> cancelamento passe: sem ela, os primeiros
                webhooks da rajada já teriam sido executados antes do teto estourar. Com ela, cada caso aguarda,
                enxerga o volume total e só então decide. Reprocessar pela tela sempre ignora o freio.
              </span>
            </div>
          </Surface>

          <div class="flex justify-end">
            <Button variant="primary" size="sm" icon="fas fa-check" :loading="store.settingsLoading"
              @click="handleSaveRajada">Salvar freio</Button>
          </div>
        </Surface>

        <!-- Card: Webhook -->
        <Surface variant="raised" padding="md" class="space-y-3 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-accent/10 text-accent border border-accent/20 grid place-items-center">
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

          <Surface variant="raised" padding="sm" class="border-data-warn/30 bg-data-warn/10">
            <div class="flex items-start gap-2 text-xs text-data-warn">
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
            <div class="h-9 w-9 rounded-xl bg-data-warn/10 text-data-warn border border-data-warn/20 grid place-items-center">
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
            <div class="h-9 w-9 rounded-xl bg-data-pos/10 text-data-pos border border-data-pos/20 grid place-items-center">
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
              ? 'border-data-pos/30 bg-data-pos/10 text-data-pos'
              : 'border-data-neg/30 bg-data-neg/10 text-data-neg'">
            {{ manualResult.text }}
          </div>
        </Surface>

        <!-- Card: Requisitos -->
        <Surface variant="raised" padding="md" class="space-y-2 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-accent/10 text-accent border border-accent/20 grid place-items-center">
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
            <li>Unidade e cliente (por CPF/CNPJ) do contrato conferidos contra a reserva.</li>
            <li>Empreendimento do contrato conferido por código - centro de custo da etapa, vínculo manual CV × Sienge ou, quando o CV não manda o centro de custo, empresa × empresa. Se a unidade já casou pelo código interno (id único no Sienge), a divergência de código vira aviso; sem esse casamento, bloqueia.</li>
            <li>Nenhuma parcela paga no contrato e nenhum boleto de ato pendente, pago ou em processamento.</li>
            <li>Nenhum outro contrato ativo na mesma unidade no Sienge.</li>
            <li>Exclusão confirmada por releitura (por reserva e por unidade) antes de liberar a unidade no CV.</li>
            <li>Sem contrato no Sienge: a unidade só é liberada após cruzar todas as referências (reserva, unidade, número de integração e documento do cliente) sem achar contrato ativo - e o gate do ato vale aqui também (boleto pendente, pago ou em processamento bloqueia a liberação).</li>
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

    <!-- ── Modal de detalhe (relatório do caso) ─────────────────────────────── -->
    <Modal :open="detail.open" size="xl" :title="detail.item ? `Caso #${detail.item.id} - Reserva ${detail.item.idreserva}` : ''"
      :subtitle="detail.item?.titular_nome || ''" @close="closeDetail">
      <div v-if="detail.item" class="space-y-5">

        <!-- Cabeçalho do caso -->
        <div class="rounded-xl border p-4" :class="heroClass(detail.item.status)">
          <div class="flex items-start gap-3">
            <div class="h-10 w-10 rounded-xl grid place-items-center border shrink-0"
              :class="heroIconClass(detail.item.status)">
              <i :class="statusMeta(detail.item.status).icon"></i>
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold text-ink">{{ statusMeta(detail.item.status).label }}</span>
                <Badge v-if="detail.item.manual" variant="info" size="sm" outlined>Disparo manual</Badge>
                <span class="text-xs text-ink-subtle sm:ml-auto whitespace-nowrap">
                  {{ formatDateTime(detail.item.createdAt ?? detail.item.created_at) }}
                </span>
              </div>
              <p class="text-sm text-ink-muted mt-1">{{ resumoCaso(detail.item) }}</p>
            </div>
          </div>
          <div v-if="detail.item.motivo" class="mt-3 pt-3 border-t border-line/60 text-sm"
            :class="detail.item.status === 'error' ? 'text-data-neg' : 'text-data-warn'">
            <i class="fas fa-circle-info mr-1.5"></i>{{ detail.item.motivo }}
          </div>
        </div>

        <!-- Navegação rápida -->
        <div>
          <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-2">Ir para</h3>
          <div class="flex flex-wrap gap-2">
            <a :href="cvReservaUrl(detail.item)" target="_blank" rel="noopener"
              class="inline-flex items-center gap-2 px-3 py-2 min-h-10 rounded-lg border border-line bg-surface-sunken hover:bg-surface-hover hover:text-accent text-sm text-ink transition-colors">
              <i class="fas fa-bookmark text-ink-subtle"></i>
              Reserva no CV
              <i class="fas fa-arrow-up-right-from-square text-[10px] text-ink-subtle"></i>
            </a>
            <a :href="cvCondicoesUrl(detail.item)" target="_blank" rel="noopener"
              class="inline-flex items-center gap-2 px-3 py-2 min-h-10 rounded-lg border border-line bg-surface-sunken hover:bg-surface-hover hover:text-accent text-sm text-ink transition-colors">
              <i class="fas fa-file-invoice-dollar text-ink-subtle"></i>
              Condições da reserva
              <i class="fas fa-arrow-up-right-from-square text-[10px] text-ink-subtle"></i>
            </a>
            <a v-if="cvMapaUrl(detail.item)" :href="cvMapaUrl(detail.item)" target="_blank" rel="noopener"
              class="inline-flex items-center gap-2 px-3 py-2 min-h-10 rounded-lg border border-line bg-surface-sunken hover:bg-surface-hover hover:text-accent text-sm text-ink transition-colors">
              <i class="fas fa-map-location-dot text-ink-subtle"></i>
              Mapa de disponibilidade
              <i class="fas fa-arrow-up-right-from-square text-[10px] text-ink-subtle"></i>
            </a>
            <a v-if="detail.item.contrato_id" :href="SIENGE_URL" target="_blank" rel="noopener"
              class="inline-flex items-center gap-2 px-3 py-2 min-h-10 rounded-lg border border-line bg-surface-sunken hover:bg-surface-hover hover:text-accent text-sm text-ink transition-colors">
              <i class="fas fa-building-columns text-ink-subtle"></i>
              Sienge
              <i class="fas fa-arrow-up-right-from-square text-[10px] text-ink-subtle"></i>
            </a>
          </div>
        </div>

        <!-- Ações da automação -->
        <div>
          <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-2">Ações da automação</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div v-for="acao in acoesCaso(detail.item)" :key="acao.label"
              class="flex items-center gap-3 rounded-lg border border-line bg-surface-sunken px-3 py-2.5">
              <div class="h-8 w-8 rounded-lg grid place-items-center border shrink-0"
                :class="acao.done
                  ? (acao.warn
                    ? 'bg-data-warn/10 text-data-warn border-data-warn/20'
                    : 'bg-data-pos/10 text-data-pos border-data-pos/20')
                  : 'bg-surface text-ink-subtle border-line'">
                <i :class="acao.icon" class="text-xs"></i>
              </div>
              <div class="min-w-0">
                <div class="text-xs text-ink-subtle">{{ acao.label }}</div>
                <div class="text-sm font-medium truncate"
                  :class="acao.done
                    ? (acao.warn ? 'text-data-warn' : 'text-data-pos')
                    : 'text-ink-muted'">
                  {{ acao.text }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Dados -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div class="bg-surface-sunken border border-line rounded-xl p-3.5 space-y-2">
            <div class="flex items-center gap-2 text-micro uppercase tracking-wider text-ink-subtle">
              <i class="fas fa-bookmark"></i> Reserva no CV
            </div>
            <div class="space-y-1.5">
              <div class="flex justify-between gap-3"><span class="text-ink-muted">Titular</span><span class="text-ink text-right font-medium">{{ detail.item.titular_nome || '-' }}</span></div>
              <div class="flex justify-between gap-3"><span class="text-ink-muted">Documento</span><span class="text-ink font-mono text-xs">{{ formatDoc(detail.item.titular_documento) }}</span></div>
              <div class="flex justify-between gap-3"><span class="text-ink-muted">Reserva</span><span class="text-ink font-mono text-xs">{{ detail.item.idreserva }}</span></div>
              <div class="flex justify-between gap-3"><span class="text-ink-muted">Unidade</span><span class="text-ink text-right">{{ detail.item.unidade_nome || '-' }}</span></div>
              <div class="flex justify-between gap-3"><span class="text-ink-muted">Empreendimento</span><span class="text-ink text-right">{{ detail.item.empreendimento || '-' }}</span></div>
              <div class="flex justify-between gap-3"><span class="text-ink-muted">Cancelada em</span><span class="text-ink">{{ formatDateBr(detail.item.data_cancelamento) }}</span></div>
              <div v-if="detail.item.motivo_cancelamento" class="flex justify-between gap-3"><span class="text-ink-muted">Motivo</span><span class="text-ink text-right">{{ detail.item.motivo_cancelamento }}</span></div>
              <!-- Etapa ATUAL no CV (reserva e repasse são workflows distintos) -->
              <div class="flex justify-between items-center gap-3">
                <span class="text-ink-muted">Etapa da reserva</span>
                <a v-if="etapaCv?.cv_situacao" :href="cvReservaUrl(detail.item)" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-semibold border border-line bg-surface text-ink-muted hover:opacity-80 transition-opacity"
                  :style="cvBadgeStyle(etapaCv.cv_situacao_cor_bg, etapaCv.cv_situacao_cor_nome)">
                  <i class="fas fa-flag text-[9px]"></i>{{ etapaCv.cv_situacao }}
                </a>
                <span v-else class="text-ink-subtle text-xs">-</span>
              </div>
              <div class="flex justify-between items-center gap-3">
                <span class="text-ink-muted">Etapa do repasse</span>
                <a v-if="etapaCv?.cv_situacao_repasse" :href="cvRepasseUrl(etapaCv)" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-semibold border border-line bg-surface text-ink-muted hover:opacity-80 transition-opacity"
                  :style="cvBadgeStyle(etapaCv.cv_repasse_cor_bg, etapaCv.cv_repasse_cor_nome)">
                  <i class="fas fa-building-columns text-[9px]"></i>{{ etapaCv.cv_situacao_repasse }}
                </a>
                <span v-else class="text-ink-subtle text-xs">sem repasse</span>
              </div>
            </div>
          </div>
          <div class="bg-surface-sunken border border-line rounded-xl p-3.5 space-y-2">
            <div class="flex items-center gap-2 text-micro uppercase tracking-wider text-ink-subtle">
              <i class="fas fa-file-contract"></i> Contrato no Sienge
            </div>
            <div v-if="detail.item.contrato_id" class="space-y-1.5">
              <div class="flex justify-between gap-3"><span class="text-ink-muted">Número</span><span class="text-ink font-mono text-xs">{{ detail.item.contrato_numero }}</span></div>
              <div class="flex justify-between gap-3"><span class="text-ink-muted">ID</span><span class="text-ink font-mono text-xs">{{ detail.item.contrato_id }}</span></div>
              <div class="flex justify-between gap-3"><span class="text-ink-muted">Situação</span><span class="text-ink">{{ detail.item.contrato_situacao || '-' }}</span></div>
              <div class="flex justify-between gap-3"><span class="text-ink-muted">Valor</span><span class="text-ink font-medium">{{ formatCurrency(detail.item.contrato_valor) }}</span></div>
              <div class="flex justify-between gap-3"><span class="text-ink-muted">Resultado</span>
                <span :class="detail.item.sienge_contrato_excluido ? 'text-data-pos font-medium' : 'text-ink'">
                  {{ detail.item.sienge_contrato_excluido ? 'Excluído' : 'Mantido' }}
                </span>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-4 text-center gap-1.5">
              <i class="fas fa-file-circle-question text-ink-subtle text-lg"></i>
              <span class="text-xs text-ink-muted">Nenhum contrato ativo localizado no Sienge para esta reserva.</span>
            </div>
          </div>
        </div>

        <!-- Validações -->
        <div v-if="detail.item.checks?.length">
          <div class="flex items-center gap-2 mb-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Validações</h3>
            <Badge :variant="checksFalhas(detail.item) ? 'warning' : 'success'" size="sm" outlined>
              {{ checksOk(detail.item) }} de {{ detail.item.checks.length }} aprovadas
            </Badge>
          </div>
          <ul class="space-y-1.5">
            <li v-for="(c, i) in detail.item.checks" :key="i"
              class="flex items-start gap-2.5 text-sm rounded-lg px-3 py-2 border"
              :class="c.ok ? 'border-line bg-surface-sunken' : 'border-data-neg/30 bg-data-neg/10'">
              <i :class="c.ok ? 'fas fa-circle-check text-data-pos' : 'fas fa-circle-xmark text-data-neg'" class="mt-0.5"></i>
              <span class="text-ink"><strong>{{ c.check }}</strong><span class="text-ink-muted"> - {{ c.detalhe }}</span></span>
            </li>
          </ul>
        </div>

        <!-- Avisos -->
        <div v-if="detail.item.warnings?.length">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-2">Avisos</h3>
          <ul class="space-y-1.5">
            <li v-for="(w, i) in detail.item.warnings" :key="i"
              class="flex items-start gap-2.5 text-sm rounded-lg px-3 py-2 border border-data-warn/30 bg-data-warn/10">
              <i class="fas fa-triangle-exclamation text-data-warn mt-0.5"></i>
              <span class="text-ink-muted"><strong class="text-ink">{{ w.etapa }}</strong> - {{ w.erro }}</span>
            </li>
          </ul>
        </div>

        <!-- Ocorrências desta reserva - toda vez que a reserva passou pela
             automação. Clicar troca o caso exibido acima. -->
        <div v-if="store.timelineAttempts.length > 1">
          <div class="flex items-center gap-2 mb-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle">Ocorrências desta reserva</h3>
            <Badge variant="neutral" size="sm" outlined>{{ store.timelineAttempts.length }}</Badge>
          </div>
          <ul class="space-y-1.5">
            <li v-for="(a, i) in store.timelineAttempts" :key="a.id">
              <button type="button" @click="openOcorrencia(a)"
                class="w-full text-left flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 transition-colors"
                :class="a.id === detail.item.id
                  ? 'border-accent/50 bg-accent-soft'
                  : 'border-line bg-surface-sunken hover:bg-surface-hover'">
                <span class="text-micro font-mono text-ink-subtle">{{ i + 1 }}ª</span>
                <span class="font-mono text-xs text-ink-muted">caso #{{ a.id }}</span>
                <Badge :variant="statusMeta(a.status).variant" size="sm" dot>{{ statusMeta(a.status).label }}</Badge>
                <Badge v-if="a.manual" variant="info" size="sm" outlined>Manual</Badge>
                <span class="text-micro text-ink-subtle ml-auto whitespace-nowrap">
                  {{ formatDateTime(a.createdAt ?? a.created_at) }}
                </span>
                <span v-if="a.motivo" class="w-full text-xs text-ink-muted truncate">{{ a.motivo }}</span>
              </button>
            </li>
          </ul>
        </div>

        <!-- Linha do tempo -->
        <div>
          <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-subtle mb-2">Linha do tempo</h3>
          <!-- Esqueleto na FORMA da linha do tempo, nao roda no meio do vazio:
               o bloco ja nasce com a altura que vai ter, entao o conteudo nao
               empurra o resto do modal quando chega. -->
          <Skeleton v-if="store.timelineLoading" variant="row" :lines="3" class="ml-2" />
          <div v-else-if="store.timelineError" class="text-sm text-data-neg">{{ store.timelineError }}</div>
          <ol v-else class="relative border-l border-line ml-2 space-y-3">
            <li v-for="evt in store.timelineEvents" :key="evt.id" class="ml-4">
              <span class="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border border-surface"
                :class="{
                  'bg-data-pos': evt.severity === 'success',
                  'bg-data-warn': evt.severity === 'warning',
                  'bg-data-neg': evt.severity === 'error',
                  'bg-ink-subtle': !['success','warning','error'].includes(evt.severity),
                }"></span>
              <div class="flex flex-wrap items-center gap-1.5 text-xs text-ink-subtle">
                <span class="font-mono">{{ formatDateTime(evt.created_at) }}</span>
                <span class="px-1.5 py-0.5 rounded bg-surface-sunken border border-line text-micro uppercase tracking-wide">
                  {{ eventTypeLabel(evt.type) }}
                </span>
                <span>caso #{{ evt.history_id }}</span>
              </div>
              <div class="text-sm text-ink mt-0.5">{{ evt.message || evt.type }}</div>
            </li>
          </ol>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between gap-2 w-full">
          <span v-if="retryFeedback" class="text-xs"
            :class="retryFeedback.ok ? 'text-data-pos' : 'text-data-neg'">
            {{ retryFeedback.text }}
          </span>
          <div class="flex items-center gap-2 ml-auto">
            <Button variant="ghost" @click="closeDetail">Fechar</Button>
            <Button v-if="detail.item && ['blocked','held','error','skipped'].includes(detail.item.status)"
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
import { useCan } from '@/composables/useCan';
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
import Skeleton from '@/components/UI/Skeleton.vue';
import DataTable from '@/components/UI/DataTable.vue';
import ReservaCancelFilters from './components/ReservaCancelFilters.vue';

const store = useReservaCancelStore();
// Ações desta tela (lib/screenCapabilities.js no back): view/operate seguem a
// alçada, configure é admin. Ver composables/useCan.js.
const can = useCan('/comercial/cancelamento-reservas');

// ── Tabs ──────────────────────────────────────────────────────────────────────
// A tela virou alçada do Comercial em 2026-08-19: histórico e reprocessamento
// para quem tem a tela; a aba Configurações (que também guarda o processamento
// manual avulso e a simulação) exige a ação `configure`.
const activeTab = ref('history');
const tabOptions = computed(() => {
  const base = [{ value: 'history', label: 'Histórico', icon: 'fas fa-clock-rotate-left' }];
  if (can('configure')) base.push({ value: 'settings', label: 'Configurações', icon: 'fas fa-gear' });
  return base;
});

// ── Status ────────────────────────────────────────────────────────────────────
const STATUS_META = {
  processing: { label: 'Processando', variant: 'info', icon: 'fas fa-spinner' },
  success: { label: 'Sucesso', variant: 'success', icon: 'fas fa-circle-check' },
  blocked: { label: 'Pendência', variant: 'warning', icon: 'fas fa-hand' },
  held: { label: 'Retido (rajada)', variant: 'warning', icon: 'fas fa-shield-halved' },
  skipped: { label: 'Não aplicável', variant: 'neutral', icon: 'fas fa-forward' },
  ignored: { label: 'Duplicado', variant: 'neutral', icon: 'fas fa-clone' },
  error: { label: 'Erro', variant: 'danger', icon: 'fas fa-circle-exclamation' },
};
function statusMeta(s) {
  return STATUS_META[s] || { label: s, variant: 'neutral', icon: 'fas fa-circle' };
}
const kpiChips = computed(() =>
  Object.entries(STATUS_META).map(([value, m]) => ({ value, ...m })));

// ── Links externos (CV / Sienge) ─────────────────────────────────────────────
const SIENGE_URL = 'https://menin.sienge.com.br/sienge/';
const cvReservaUrl = (item) => `https://menin.cvcrm.com.br/gestor/comercial/reservas/${item.idreserva}/administrar`;
const cvCondicoesUrl = (item) => `${cvReservaUrl(item)}#index_condicao_pagamento`;
const cvMapaUrl = (item) => item.idempreendimento_cv
  ? `https://menin.cvcrm.com.br/gestor/comercial/mapadisponibilidade/${item.idempreendimento_cv}`
  : null;

// ── Relatório do caso ────────────────────────────────────────────────────────
function resumoCaso(item) {
  switch (item.status) {
    case 'success':
      return item.sienge_contrato_excluido
        ? 'Contrato excluído no Sienge (exclusão confirmada por releitura) e unidade disponibilizada no CV.'
        : 'Sem contrato ativo no Sienge - unidade disponibilizada no CV após o cruzamento de todas as referências.';
    case 'blocked':
      return 'Uma validação de segurança barrou o cancelamento. Nada foi alterado no Sienge e a reserva foi movida para Pendência no CV.';
    case 'held':
      return 'O freio de rajada segurou este caso: o CV disparou cancelamentos em massa. Nada foi alterado no Sienge nem no CV. Confira o que originou a rajada e reprocesse aqui o que for legítimo.';
    case 'error':
      return 'Falha técnica durante o processamento. Verifique o motivo abaixo e reprocesse.';
    case 'skipped':
      return 'O fluxo não se aplicava a este disparo (reserva não cancelada ou automação pausada).';
    case 'ignored':
      return 'Disparo duplicado - já existia processamento ou sucesso para esta reserva.';
    case 'processing':
      return 'Processamento em andamento.';
    default:
      return '';
  }
}

function heroClass(status) {
  return {
    success: 'border-data-pos/30 bg-data-pos/10',
    blocked: 'border-data-warn/30 bg-data-warn/10',
    held: 'border-data-warn/30 bg-data-warn/10',
    error: 'border-data-neg/30 bg-data-neg/10',
    processing: 'border-accent/30 bg-accent/10',
  }[status] || 'border-line bg-surface-sunken';
}
function heroIconClass(status) {
  return {
    success: 'bg-data-pos/15 text-data-pos border-data-pos/30',
    blocked: 'bg-data-warn/15 text-data-warn border-data-warn/30',
    held: 'bg-data-warn/15 text-data-warn border-data-warn/30',
    error: 'bg-data-neg/15 text-data-neg border-data-neg/30',
    processing: 'bg-accent/15 text-accent border-accent/30',
  }[status] || 'bg-surface text-ink-muted border-line';
}

function acoesCaso(item) {
  const pendencia = item.situacao_aplicada_id != null
    && item.situacao_aplicada_id === store.settings?.situacao_pendencia_id;
  return [
    {
      icon: 'fas fa-file-circle-xmark',
      label: 'Contrato no Sienge',
      done: !!item.sienge_contrato_excluido,
      text: item.sienge_contrato_excluido ? 'Excluído e confirmado' : 'Não alterado',
    },
    {
      icon: 'fas fa-house-circle-check',
      label: 'Unidade no CV',
      done: !!item.cv_unidade_disponibilizada,
      text: item.cv_unidade_disponibilizada ? 'Disponibilizada' : 'Sem alteração',
    },
    {
      icon: 'fas fa-diagram-project',
      label: 'Etapa aplicada pela automação',
      done: !!item.cv_situacao_alterada,
      warn: pendencia,
      text: item.cv_situacao_alterada
        ? (pendencia ? 'Movida para Pendência' : `Etapa ID ${item.situacao_aplicada_id} aplicada`)
        : 'Sem alteração',
    },
    {
      icon: 'fas fa-message',
      label: 'Mensagem na reserva',
      done: !!item.cv_mensagem_enviada,
      text: item.cv_mensagem_enviada ? 'Registrada no CV' : 'Não registrada',
    },
  ];
}

const checksOk = (item) => (item.checks || []).filter(c => c.ok).length;
const checksFalhas = (item) => (item.checks || []).some(c => !c.ok);

const EVENT_TYPE_LABELS = {
  received: 'Recebido',
  reserva_loaded: 'Reserva',
  contract_found: 'Contrato',
  contract_none: 'Contrato',
  check_passed: 'Validação',
  check_failed: 'Validação',
  unit_stock: 'Unidade',
  contract_deleted: 'Exclusão',
  delete_confirmed: 'Confirmação',
  cv_unit_released: 'Unidade CV',
  cv_message_sent: 'Mensagem',
  cv_situacao: 'Etapa CV',
  blocked: 'Bloqueio',
  burst_wait: 'Freio de rajada',
  burst_held: 'Freio de rajada',
  burst_ok: 'Freio de rajada',
  error: 'Erro',
};
const eventTypeLabel = (t) => EVENT_TYPE_LABELS[t] || t;

function formatDoc(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d || '-';
}

// ── Colunas ordenáveis do histórico ───────────────────────────────────────────
/* `priority` decide a ORDEM de aparicao no celular, nunca o que existe:
   1 = titulo do cartao, 2 = corpo, 3 = atras de "Ver detalhes". Quem abre no
   telefone precisa saber DE QUEM e a reserva e em que pe esta - o numero
   interno do caso pode esperar um toque. */
const histColumns = [
  { key: 'titular',  label: 'Reserva / Titular',  priority: 1, sortable: true },
  { key: 'status',   label: 'Status',             priority: 1, sortable: true },
  { key: 'unidade',  label: 'Unidade',            priority: 2, sortable: true },
  { key: '_etapa',   label: 'Etapa CV',           priority: 2 },
  { key: '_acoes',   label: 'Ações executadas',  priority: 2 },
  { key: 'quando',   label: 'Quando',             priority: 2, sortable: true, numeric: true },
  { key: 'contrato', label: 'Contrato Sienge',    priority: 3, sortable: true },
  { key: 'caso',     label: 'Caso',               priority: 3, sortable: true },
];

/* Quem ordena e o SERVIDOR (a lista chega paginada, entao ordenar so a pagina
   seria pior que nao ordenar) - dai o `manual-sort`. O DataTable avisa coluna
   e direcao, e a store aplica os dois de uma vez. */
const ordenarPor = computed({
  get: () => store.sortBy,
  set: (v) => store.applySort(v, store.sortDir),
});
const ordenarDir = computed({
  get: () => store.sortDir,
  set: (v) => store.applySort(store.sortBy, v),
});

// ── Etapa CV: badge na cor do workflow do CV, clicável ────────────────────────
// Reserva e repasse são workflows diferentes no CV: a reserva pode estar em
// Pendência enquanto o repasse segue em outra etapa, então mostramos os dois.
const cvRepasseUrl = (item) => item.cv_idrepasse
  ? `https://menin.cvcrm.com.br/gestor/financeiro/repasses/${item.cv_idrepasse}/administrar`
  : cvReservaUrl(item);
function cvBadgeStyle(bg, txt) {
  if (!bg) return null;
  return { backgroundColor: bg, color: txt || '#fff', borderColor: 'transparent' };
}


function toggleStatusFilter(value) {
  const arr = store.historyFilter.status;
  const idx = arr.indexOf(value);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(value);
  applyFilters();
}

// ── Filtros ───────────────────────────────────────────────────────────────────
// Aplicado pelos KPIs (toggleStatusFilter) e pelo componente ReservaCancelFilters.
function applyFilters() {
  store.historyPage = 1;
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

// Troca o caso exibido no modal entre as ocorrências da MESMA reserva - a
// linha do tempo já é consolidada, então não precisa recarregar.
function openOcorrencia(a) {
  if (!a || a.id === detail.value.item?.id) return;
  detail.value = { open: true, item: a };
  retryFeedback.value = null;
}

// Etapa CV do modal: a da linha clicada, completada pela leitura ao vivo que
// vem junto da timeline (mais recente).
const CV_KEYS = [
  'cv_idsituacao', 'cv_situacao', 'cv_situacao_cor_bg', 'cv_situacao_cor_nome',
  'cv_idsituacao_repasse', 'cv_situacao_repasse', 'cv_repasse_cor_bg', 'cv_repasse_cor_nome',
  'cv_idrepasse',
];
const etapaCv = computed(() => {
  const item = detail.value.item;
  if (!item) return null;
  const doItem = Object.fromEntries(CV_KEYS.filter(k => item[k] != null).map(k => [k, item[k]]));
  return { idreserva: item.idreserva, ...doItem, ...(store.timelineCv || {}) };
});
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

// ── Freio de rajada ───────────────────────────────────────────────────────────
const rajadaForm = ref({ burst_window_seconds: '', burst_max_cancels: '', burst_settle_seconds: '' });

watch(() => store.settings, (s) => {
  if (!s) return;
  rajadaForm.value = {
    burst_window_seconds: s.burst_window_seconds ?? '',
    burst_max_cancels: s.burst_max_cancels ?? '',
    burst_settle_seconds: s.burst_settle_seconds ?? '',
  };
}, { immediate: true });

async function handleToggleRajada(value) {
  await store.saveSettings({ burst_guard_active: value });
}

async function handleToggleBaixaAto(value) {
  await store.saveSettings({ baixar_boleto_no_cancelamento: value });
}

async function handleSaveRajada() {
  await store.saveSettings({
    burst_window_seconds: Number(rajadaForm.value.burst_window_seconds),
    burst_max_cancels: Number(rajadaForm.value.burst_max_cancels),
    burst_settle_seconds: Number(rajadaForm.value.burst_settle_seconds),
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
  if (can('configure')) store.fetchSettings();
  store.fetchHistory();
  store.fetchStats();
  store.fetchFacets();
});
</script>
