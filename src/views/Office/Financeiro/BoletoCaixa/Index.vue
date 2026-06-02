<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        subtitle="Emissão automática de boletos no Ecobrança via webhook do CV"
        icon="fas fa-barcode">
        <template #title>Boleto Caixa</template>
        <template #actions>
          <!-- Status indicator -->
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
        <SegmentedControl
          v-model="activeTab"
          :options="tabOptions"
          size="md" />
      </div>

      <!-- ── TAB: Configurações ───────────────────────────────────────────────── -->
      <div v-if="activeTab === 'settings' && isAdmin" class="space-y-5">

        <!-- Card: Credenciais Ecobrança -->
        <Surface variant="raised" padding="md" class="space-y-4 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-accent-soft text-accent border border-accent/20 grid place-items-center">
              <i class="fas fa-lock"></i>
            </div>
            <div>
              <h2 class="font-semibold text-ink text-sm">Credenciais Ecobrança</h2>
              <p class="text-xs text-ink-muted">Acesso ao portal da Caixa Econômica Federal</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              v-model="form.eco_usuario"
              label="Usuário (CPF)"
              placeholder="00000000000"
              maxlength="11" />
            <div>
              <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                Senha
                <span v-if="store.settings?.eco_senha_set"
                  class="ml-1.5 text-[10px] normal-case text-emerald-600 dark:text-emerald-400 font-normal">
                  (configurada)
                </span>
              </label>
              <Input
                v-model="form.eco_senha"
                type="password"
                placeholder="••••••"
                maxlength="6"
                hint="Deixe em branco para manter a senha atual." />
            </div>
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
              <p class="text-xs text-ink-muted">Configure este endereço no cadastro do webhook do CV</p>
            </div>
          </div>

          <div class="flex items-center gap-2 bg-surface-sunken border border-line rounded-lg px-3 py-2.5">
            <code class="text-xs sm:text-sm text-accent flex-1 break-all select-all font-mono">
              {{ webhookUrl }}
            </code>
            <Button variant="primary" size="sm" :icon="copied ? 'fas fa-check' : 'fas fa-copy'"
              @click="copyWebhook">
              {{ copied ? 'Copiado!' : 'Copiar' }}
            </Button>
          </div>

          <Surface variant="raised" padding="sm" class="border-amber-500/30 bg-amber-500/10">
            <div class="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
              <i class="fas fa-circle-info mt-0.5"></i>
              <span>
                Configure o gatilho <strong>"Quando entrar na situação..."</strong> para a funcionalidade
                <strong>Reserva</strong> no CV com este endereço.
              </span>
            </div>
          </Surface>
        </Surface>

        <!-- Card: Configurações de Série e CV -->
        <Surface variant="raised" padding="md" class="space-y-4 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 grid place-items-center">
              <i class="fas fa-sliders"></i>
            </div>
            <h2 class="font-semibold text-ink text-sm">Configurações do CV</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- IDs de Série — chip input (múltiplos) -->
            <div class="md:col-span-1">
              <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                IDs de Série CV (Entrada)
              </label>
              <div class="flex gap-2">
                <Input
                  v-model.number="novaSerieId"
                  type="number"
                  placeholder="Ex: 21"
                  @keydown.enter.prevent="addSerieId" />
                <Button variant="primary" size="sm" icon="fas fa-plus" @click="addSerieId">
                  Adicionar
                </Button>
              </div>
              <div class="flex flex-wrap gap-1 mt-2">
                <span v-for="id in form.idserie_ra" :key="id"
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 text-xs font-medium font-mono">
                  {{ id }}
                  <button type="button" @click="removeSerieId(id)"
                    class="hover:text-red-500 transition-colors leading-none">
                    <i class="fas fa-times text-[10px]"></i>
                  </button>
                </span>
                <span v-if="!form.idserie_ra.length" class="text-xs text-ink-subtle italic self-center">
                  Nenhuma série configurada
                </span>
              </div>
              <p class="text-xs text-ink-subtle mt-1.5">
                Séries cujas parcelas de entrada disparam emissão de boleto. Regra: somente 1 parcela destas séries por reserva.
              </p>
            </div>
            <Input
              v-model.number="form.cv_idtipo_documento"
              type="number"
              label="ID Tipo Documento (CV) para Anexo"
              placeholder="Ex: 14"
              hint="Obtido nos tipos de arquivo do CV." />
            <Input
              v-model.number="form.situacao_sucesso_id"
              type="number"
              label="ID Situação CV — Sucesso"
              placeholder="ID da situação"
              hint="Etapa de Sucesso CV." />
            <Input
              v-model.number="form.situacao_erro_id"
              type="number"
              label="ID Situação CV — Erro"
              placeholder="ID da situação"
              hint="Etapa de Erro CV." />
          </div>
        </Surface>

        <!-- Card: Regras de Comissão Embutida por Empreendimento -->
        <Surface variant="raised" padding="md" class="space-y-4 surface-gradient">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 grid place-items-center">
                <i class="fas fa-percent"></i>
              </div>
              <div>
                <h2 class="font-semibold text-ink text-sm">Comissão Embutida por Empreendimento</h2>
                <p class="text-xs text-ink-muted">
                  Quando o valor da série já inclui a comissão, defina aqui o % do valor que deve ir para o boleto.
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm" icon="fas fa-plus" @click="openRuleModal()">
              Nova regra
            </Button>
          </div>

          <p v-if="store.rulesError" class="text-xs text-red-500 flex items-center gap-1.5">
            <i class="fas fa-circle-exclamation"></i>{{ store.rulesError }}
          </p>

          <div v-if="store.rulesLoading" class="text-xs text-ink-muted py-2">
            <i class="fas fa-spinner fa-spin mr-1"></i> Carregando regras...
          </div>

          <div v-else-if="!store.rules.length" class="text-xs text-ink-subtle italic py-2">
            Nenhuma regra cadastrada. Todos os empreendimentos usam o valor cheio da série.
          </div>

          <div v-else class="overflow-x-auto -mx-3">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-surface-sunken/60 border-b border-line">
                  <th class="text-left px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">ID Emp.</th>
                  <th class="text-left px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Empreendimento</th>
                  <th class="text-right px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">% Boleto</th>
                  <th class="text-left px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Observação</th>
                  <th class="text-center px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Ativo</th>
                  <th class="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rule in store.rules" :key="rule.id"
                  class="border-b border-line/60 hover:bg-surface-hover/40 transition-colors">
                  <td class="px-3 py-2 font-mono text-accent">{{ rule.idempreendimento_cv }}</td>
                  <td class="px-3 py-2 text-ink">{{ rule.empreendimento_nome || '—' }}</td>
                  <td class="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                    {{ Number(rule.percentual_boleto).toFixed(2) }}%
                  </td>
                  <td class="px-3 py-2 text-xs text-ink-muted">{{ rule.observacao || '—' }}</td>
                  <td class="px-3 py-2 text-center">
                    <Badge :variant="rule.active ? 'success' : 'neutral'" size="sm">
                      {{ rule.active ? 'Sim' : 'Não' }}
                    </Badge>
                  </td>
                  <td class="px-3 py-2 text-right whitespace-nowrap">
                    <button @click="openRuleModal(rule)"
                      class="text-accent hover:text-accent/80 text-xs mr-3">
                      <i class="fas fa-pen-to-square"></i> Editar
                    </button>
                    <button @click="confirmDeleteRule(rule)"
                      class="text-red-500 hover:text-red-600 text-xs">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Surface>

        <!-- Modal: Criar/Editar regra de comissão -->
        <div v-if="ruleModal.open"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click.self="closeRuleModal">
          <div class="bg-surface rounded-xl shadow-xl border border-line w-full max-w-md p-5 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold text-ink">
                {{ ruleModal.id ? 'Editar regra' : 'Nova regra' }}
              </h3>
              <button @click="closeRuleModal" class="text-ink-muted hover:text-ink">
                <i class="fas fa-times"></i>
              </button>
            </div>

            <Select
              v-if="!ruleModal.id"
              :model-value="ruleModal.form.idempreendimento_cv || ''"
              :options="enterpriseOptions"
              label="Empreendimento"
              :placeholder="store.enterprisesLoading ? 'Carregando...' : 'Selecione um empreendimento'"
              hint="Lista de Empreendimentos do CV."
              @update:model-value="onSelectEnterprise" />

            <div v-else>
              <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                Empreendimento
              </label>
              <div class="px-3 py-2 rounded-lg border border-line bg-surface-sunken text-sm text-ink">
                <span class="font-mono text-accent">#{{ ruleModal.form.idempreendimento_cv }}</span>
                <span class="ml-2">{{ ruleModal.form.empreendimento_nome || '—' }}</span>
              </div>
              <p class="text-xs text-ink-subtle mt-1">O empreendimento não pode ser alterado em uma regra existente.</p>
            </div>

            <Input
              v-model.number="ruleModal.form.percentual_boleto"
              type="number"
              step="0.01"
              min="0"
              max="100"
              label="% do valor da série que vai para o boleto"
              placeholder="Ex: 20 (boleto recebe 20% do valor da série)"
              hint="Ex.: série R$ 10.000 + 20% = boleto de R$ 2.000. Use 100 para emitir valor cheio." />

            <div>
              <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                Observação
              </label>
              <textarea v-model="ruleModal.form.observacao" rows="2"
                class="w-full px-3 py-2 rounded-lg border border-line bg-surface-sunken text-sm text-ink focus:outline-none focus:border-accent"
                placeholder="Anotações internas (opcional)"></textarea>
            </div>

            <label class="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" v-model="ruleModal.form.active" />
              Regra ativa
            </label>

            <p v-if="ruleModal.error" class="text-xs text-red-500">{{ ruleModal.error }}</p>

            <div class="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" @click="closeRuleModal">Cancelar</Button>
              <Button variant="primary" size="sm" icon="fas fa-save"
                :loading="ruleModal.saving" :disabled="ruleModal.saving"
                @click="saveRule">
                Salvar
              </Button>
            </div>
          </div>
        </div>

        <!-- Card: Controle de ativação -->
        <Surface variant="raised" padding="md" class="surface-gradient">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="h-9 w-9 rounded-xl grid place-items-center"
                :class="form.active
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-surface-sunken text-ink-subtle border border-line'">
                <i :class="form.active ? 'fas fa-play' : 'fas fa-pause'"></i>
              </div>
              <div class="min-w-0">
                <h2 class="font-semibold text-ink text-sm">Automação</h2>
                <p class="text-xs text-ink-muted">
                  {{ form.active ? 'Processando webhooks automaticamente' : 'Webhooks recebidos mas não processados' }}
                </p>
              </div>
            </div>
            <button @click="form.active = !form.active"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0"
              :class="form.active ? 'bg-emerald-500' : 'bg-surface-sunken border border-line'">
              <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
                :class="form.active ? 'translate-x-6' : 'translate-x-1'"></span>
            </button>
          </div>
        </Surface>

        <!-- Botão salvar -->
        <div class="flex flex-wrap items-center justify-end gap-3">
          <p v-if="store.settingsError" class="text-xs text-red-500 flex items-center gap-1.5">
            <i class="fas fa-circle-exclamation"></i>{{ store.settingsError }}
          </p>
          <p v-if="store.settingsSaved" class="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <i class="fas fa-check"></i>Configurações salvas!
          </p>
          <Button variant="primary" icon="fas fa-save"
            :loading="store.settingsLoading"
            :disabled="store.settingsLoading"
            @click="handleSave">
            {{ store.settingsLoading ? 'Salvando...' : 'Salvar Configurações' }}
          </Button>
        </div>

        <!-- Card: Simulação de Webhook (dev only) -->
        <Surface v-if="isDev" variant="raised" padding="md"
          class="border-2 border-dashed border-amber-500/40 bg-amber-500/5 space-y-4">
          <div class="flex items-center gap-3">
            <Badge variant="warning" size="sm">
              <i class="fas fa-flask mr-1"></i> Dev Only
            </Badge>
            <h3 class="text-sm font-semibold text-amber-700 dark:text-amber-300">
              Simular Webhook
            </h3>
          </div>
          <p class="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            Dispara o processamento de boleto manualmente para uma reserva, sem precisar configurar o CV.
            Bloqueado automaticamente em produção.
          </p>

          <div class="flex flex-col sm:flex-row gap-3">
            <Input
              v-model="simulateIdreserva"
              type="number"
              placeholder="ID da Reserva (ex: 12345)" />
            <Button variant="primary" class="!bg-amber-500 hover:!bg-amber-600"
              :icon="store.simulateLoading ? 'fas fa-spinner fa-spin' : 'fas fa-play'"
              :disabled="store.simulateLoading || !simulateIdreserva"
              @click="handleSimulate">
              {{ store.simulateLoading ? 'Disparando...' : 'Disparar' }}
            </Button>
          </div>

          <p v-if="store.simulateSuccess" class="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <i class="fas fa-circle-check"></i>
            Webhook simulado! Acompanhe o progresso na aba Histórico.
          </p>
          <p v-if="store.simulateError" class="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
            <i class="fas fa-circle-xmark"></i>
            {{ store.simulateError }}
          </p>
        </Surface>
      </div>

      <!-- ── TAB: Histórico ───────────────────────────────────────────────────── -->
      <div v-if="activeTab === 'history'" class="space-y-4">

        <!-- Filtros -->
        <Surface variant="raised" padding="md" class="surface-gradient">
          <div class="flex flex-wrap gap-3 items-end">
            <div class="min-w-[180px]">
              <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">Status</label>
              <Select
                v-model="store.historyFilter.status"
                :options="statusOptions"
                size="sm"
                @change="store.fetchHistory()" />
            </div>
            <div class="min-w-[150px]">
              <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">ID Reserva</label>
              <Input
                v-model="store.historyFilter.idreserva"
                type="number"
                placeholder="Ex: 7187"
                size="sm"
                @keyup.enter="store.fetchHistory()" />
            </div>
            <Button variant="primary" size="sm" icon="fas fa-filter" @click="store.fetchHistory()">
              Filtrar
            </Button>
          </div>
        </Surface>

        <!-- Loading -->
        <div v-if="store.historyLoading" class="flex items-center justify-center py-12 text-ink-muted">
          <i class="fas fa-spinner fa-spin text-2xl mr-3"></i>
          <span>Carregando histórico...</span>
        </div>

        <!-- Erro -->
        <Surface v-else-if="store.historyError" variant="raised" padding="sm"
          class="border-red-500/30 bg-red-500/10">
          <div class="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <i class="fas fa-circle-exclamation"></i>{{ store.historyError }}
          </div>
        </Surface>

        <!-- Tabela -->
        <Surface v-else variant="raised" padding="none" class="overflow-hidden surface-gradient">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-surface-sunken/60 border-b border-line">
                  <th class="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">ID Reserva</th>
                  <th class="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Titular</th>
                  <th class="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Empreendimento</th>
                  <th class="text-right px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Valor</th>
                  <th class="text-center px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Vencimento</th>
                  <th class="text-center px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Status</th>
                  <th class="text-center px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Data</th>
                  <th class="text-center px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Boleto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!store.history.length">
                  <td colspan="8" class="text-center py-12">
                    <EmptyState icon="fas fa-inbox" title="Sem registros" description="Nenhum registro encontrado." />
                  </td>
                </tr>
                <tr v-for="item in store.history" :key="item.id"
                  class="border-b border-line hover:bg-surface-hover/40 transition-colors">
                  <td class="px-4 py-3 font-mono text-accent font-semibold">
                    #{{ item.idreserva }}
                  </td>
                  <td class="px-4 py-3 text-ink">
                    {{ item.titular_nome || '—' }}
                  </td>
                  <td class="px-4 py-3 text-ink-muted text-xs">
                    {{ item.empreendimento || '—' }}
                  </td>
                  <td class="px-4 py-3 text-right font-semibold text-ink whitespace-nowrap font-mono tabular-nums">
                    {{ item.valor ? formatCurrency(item.valor) : '—' }}
                    <div v-if="item.valor_original && Number(item.valor_original) !== Number(item.valor)"
                      class="text-[10px] font-normal text-ink-subtle"
                      :title="`Valor original: ${formatCurrency(item.valor_original)} — aplicado ${item.comissao_percentual_aplicada}%`">
                      orig. {{ formatCurrency(item.valor_original) }}
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center text-ink-muted whitespace-nowrap font-mono tabular-nums">
                    {{ item.vencimento ? formatDate(item.vencimento) : '—' }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <div class="flex flex-col items-center gap-1">
                      <Badge :variant="statusVariant(item.status)" size="sm">
                        <i :class="statusIcon(item.status)" class="mr-1"></i>
                        {{ statusLabel(item.status) }}
                      </Badge>
                      <span v-if="warningsList(item).length"
                        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[10px]"
                        :title="warningsList(item).map(w => `${warningLabel(w.etapa)}: ${w.erro}`).join('\n')">
                        <i class="fas fa-triangle-exclamation"></i>
                        {{ warningsList(item).length }} aviso{{ warningsList(item).length > 1 ? 's' : '' }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center text-xs text-ink-subtle whitespace-nowrap font-mono tabular-nums">
                    {{ formatDateTime(item.createdAt) }}
                  </td>
                  <td class="px-4 py-3 text-center align-top">
                    <div class="flex flex-col items-center gap-1.5">
                      <a v-if="item.boleto_supabase_url" :href="item.boleto_supabase_url" target="_blank"
                        class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-accent-soft text-accent rounded-lg hover:bg-accent/15 transition-colors">
                        <i class="fas fa-file-pdf"></i> PDF
                      </a>
                      <template v-else-if="item.status === 'error'">
                        <span class="text-xs text-red-500 inline-flex items-center" :title="item.error_message">
                          <i class="fas fa-circle-exclamation"></i>
                          <span class="hidden md:inline ml-1">{{ truncate(item.error_message, 30) }}</span>
                        </span>
                        <button v-if="isAdmin" @click="handleRetry(item)"
                          class="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
                          :title="`Re-disparar processamento da reserva ${item.idreserva}`">
                          <i class="fas fa-rotate-right"></i> Reprocessar
                        </button>
                      </template>
                      <span v-else-if="!warningsList(item).length" class="text-ink-subtle">—</span>

                      <!-- Lista de avisos por etapa (anexo/mensagem/situação) -->
                      <ul v-if="warningsList(item).length"
                        class="text-left mt-1 space-y-0.5 text-[10px] leading-tight text-amber-700 dark:text-amber-300 max-w-[220px]">
                        <li v-for="(w, i) in warningsList(item)" :key="i"
                          class="flex items-start gap-1"
                          :title="`${warningLabel(w.etapa)}${w.httpStatus ? ` (HTTP ${w.httpStatus})` : ''}: ${w.erro}`">
                          <i class="fas fa-circle-exclamation mt-[1px] shrink-0"></i>
                          <span class="truncate">
                            <strong>{{ warningLabel(w.etapa) }}:</strong>
                            {{ truncate(w.erro, 60) }}
                          </span>
                        </li>
                      </ul>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Paginação -->
          <div v-if="store.totalPages > 1"
            class="flex items-center justify-between px-4 py-3 border-t border-line gap-3 flex-wrap">
            <span class="text-xs text-ink-muted">
              <span class="font-mono tabular-nums">{{ store.historyTotal }}</span> registros
            </span>
            <div class="flex gap-1 flex-wrap">
              <button v-for="p in store.totalPages" :key="p"
                @click="store.setPage(p)"
                class="h-8 min-w-8 px-2.5 rounded-lg text-sm font-medium transition-colors"
                :class="store.historyPage === p
                  ? 'bg-accent text-white'
                  : 'text-ink-muted hover:bg-surface-hover'">
                {{ p }}
              </button>
            </div>
          </div>
        </Surface>
      </div>
    </PageContainer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useBoletoStore } from '@/stores/Financeiro/BoletoCaixa/boletoStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import API_URL from '@/config/apiUrl';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import EmptyState from '@/components/UI/EmptyState.vue';

const store = useBoletoStore();
const auth = useAuthStore();
const isAdmin = computed(() => auth.hasRole('admin'));

// ── Tabs ──────────────────────────────────────────────────────────────────────
// Não-admins só veem a aba "Histórico" — a aba de configurações nem aparece.
const activeTab = ref(isAdmin.value ? 'settings' : 'history');

const tabOptions = computed(() => {
  const base = [{ value: 'history', label: 'Histórico', icon: 'fas fa-clock-rotate-left' }];
  if (isAdmin.value) {
    base.unshift({ value: 'settings', label: 'Configurações', icon: 'fas fa-gear' });
  }
  return base;
});

const statusOptions = [
  { value: '',           label: 'Todos' },
  { value: 'processing', label: 'Processando' },
  { value: 'success',    label: 'Sucesso' },
  { value: 'error',      label: 'Erro' },
];

// ── Webhook URL ───────────────────────────────────────────────────────────────
const webhookUrl = computed(() => `${API_URL}/boleto-caixa/webhook`);

const copied = ref(false);
function copyWebhook() {
  navigator.clipboard.writeText(webhookUrl.value).then(() => {
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  });
}

// ── Simulate (dev only) ───────────────────────────────────────────────────────
const isDev = import.meta.env.DEV;
const simulateIdreserva = ref('');

async function handleSimulate() {
  if (!simulateIdreserva.value) return;
  await store.simulateWebhook(simulateIdreserva.value);
  if (store.simulateSuccess) {
    simulateIdreserva.value = '';
    setTimeout(() => {
      activeTab.value = 'history';
      store.fetchHistory();
    }, 2000);
  }
}

// ── Form ──────────────────────────────────────────────────────────────────────
const form = ref({
  eco_usuario: '',
  eco_senha: '',
  idserie_ra: [21],
  cv_idtipo_documento: null,
  situacao_sucesso_id: null,
  situacao_erro_id: null,
  active: false,
});

// ── Chip input para IDs de Série ──────────────────────────────────────────────
const novaSerieId = ref(null);

function addSerieId() {
  const id = Number(novaSerieId.value);
  if (!id || form.value.idserie_ra.includes(id)) return;
  form.value.idserie_ra = [...form.value.idserie_ra, id];
  novaSerieId.value = null;
}

function removeSerieId(id) {
  form.value.idserie_ra = form.value.idserie_ra.filter(s => s !== id);
}

async function handleSave() {
  const payload = { ...form.value };
  await store.saveSettings(payload);
}

// ── Formatação ────────────────────────────────────────────────────────────────
function formatCurrency(value) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.substring(0, n) + '...' : str;
}

// ── Status helpers ────────────────────────────────────────────────────────────
function statusVariant(status) {
  return {
    processing: 'info',
    success:    'success',
    error:      'danger',
  }[status] || 'neutral';
}

function statusIcon(status) {
  return {
    processing: 'fas fa-spinner fa-spin',
    success:    'fas fa-check',
    error:      'fas fa-times',
  }[status] || 'fas fa-question';
}

function statusLabel(status) {
  return { processing: 'Processando', success: 'Sucesso', error: 'Erro' }[status] || status;
}

// ── Warnings por etapa ────────────────────────────────────────────────────────
// `item.warnings` chega como string (TEXT no DB) ou array (getter do model).
// Normalizamos pra array, robusto a JSON malformado e a registros antigos.
function warningsList(item) {
  const raw = item?.warnings;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const WARNING_LABELS = {
  cv_anexo: 'Anexo no CV',
  cv_mensagem: 'Mensagem no CV',
  cv_situacao: 'Mudança de situação no CV',
};
function warningLabel(etapa) {
  return WARNING_LABELS[etapa] || etapa || 'Etapa desconhecida';
}

// ── Regras de Comissão por Empreendimento ─────────────────────────────────────
const ruleModal = ref({
  open: false,
  id: null,
  saving: false,
  error: '',
  form: { idempreendimento_cv: null, empreendimento_nome: '', percentual_boleto: 100, observacao: '', active: true },
});

// Opções para o select de empreendimentos no modal.
// Filtra empreendimentos já vinculados a uma regra (exceto o da regra atual).
const enterpriseOptions = computed(() => {
  const usedIds = new Set(
    store.rules
      .filter(r => r.id !== ruleModal.value.id)
      .map(r => Number(r.idempreendimento_cv))
  );
  return store.enterprises
    .filter(e => !usedIds.has(e.idempreendimento))
    .map(e => ({ value: e.idempreendimento, label: `${e.nome}` }));
});

function onSelectEnterprise(value) {
  const id = Number(value);
  ruleModal.value.form.idempreendimento_cv = id;
  const ent = store.enterprises.find(e => e.idempreendimento === id);
  if (ent) ruleModal.value.form.empreendimento_nome = ent.nome;
}

function openRuleModal(rule = null) {
  store.fetchEnterprises();
  if (rule) {
    ruleModal.value = {
      open: true,
      id: rule.id,
      saving: false,
      error: '',
      form: {
        idempreendimento_cv: rule.idempreendimento_cv,
        empreendimento_nome: rule.empreendimento_nome || '',
        percentual_boleto: Number(rule.percentual_boleto),
        observacao: rule.observacao || '',
        active: rule.active,
      },
    };
  } else {
    ruleModal.value = {
      open: true, id: null, saving: false, error: '',
      form: { idempreendimento_cv: null, empreendimento_nome: '', percentual_boleto: 100, observacao: '', active: true },
    };
  }
}

function closeRuleModal() {
  ruleModal.value.open = false;
}

async function saveRule() {
  const f = ruleModal.value.form;
  if (!f.idempreendimento_cv) {
    ruleModal.value.error = 'Informe o ID do empreendimento.';
    return;
  }
  if (f.percentual_boleto == null || f.percentual_boleto < 0 || f.percentual_boleto > 100) {
    ruleModal.value.error = 'Percentual deve estar entre 0 e 100.';
    return;
  }
  ruleModal.value.saving = true;
  ruleModal.value.error = '';
  const ok = ruleModal.value.id
    ? await store.updateComissionRule(ruleModal.value.id, f)
    : await store.createComissionRule(f);
  ruleModal.value.saving = false;
  if (ok) closeRuleModal();
  else ruleModal.value.error = store.rulesError || 'Erro ao salvar.';
}

async function confirmDeleteRule(rule) {
  if (!confirm(`Excluir regra do empreendimento ${rule.empreendimento_nome || rule.idempreendimento_cv}?`)) return;
  await store.deleteComissionRule(rule.id);
}

async function handleRetry(item) {
  if (!confirm(`Re-disparar emissão de boleto para a reserva ${item.idreserva}?`)) return;
  const ok = await store.retryHistoryItem(item.id);
  if (ok) setTimeout(() => store.fetchHistory(), 1500);
}

// ── Mount ─────────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (isAdmin.value) {
    await store.fetchSettings();
    if (store.settings) {
      form.value.eco_usuario = store.settings.eco_usuario || '';
      const rawSerie = store.settings.idserie_ra;
      form.value.idserie_ra = Array.isArray(rawSerie) ? rawSerie
        : rawSerie ? [Number(rawSerie)] : [21];
      form.value.cv_idtipo_documento = store.settings.cv_idtipo_documento || null;
      form.value.situacao_sucesso_id = store.settings.situacao_sucesso_id || null;
      form.value.situacao_erro_id = store.settings.situacao_erro_id || null;
      form.value.active = store.settings.active ?? false;
    }
    await store.fetchComissionRules();
  }
  await store.fetchHistory();
});
</script>
