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

        <!-- Card: Configurações do CV (modo leitura por padrão; botão Editar habilita) -->
        <Surface variant="raised" padding="md" class="space-y-4 surface-gradient">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 grid place-items-center">
                <i class="fas fa-sliders"></i>
              </div>
              <div>
                <h2 class="font-semibold text-ink text-sm">Configurações do CV</h2>
                <p class="text-xs text-ink-muted">Mapeamentos de série, tipo de documento e situações de workflow.</p>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <template v-if="!editingCv">
                <Button variant="ghost" size="sm" icon="fas fa-pen-to-square" @click="startEditCv">
                  Editar
                </Button>
              </template>
              <template v-else>
                <Button variant="ghost" size="sm" icon="fas fa-xmark" @click="cancelEditCv">
                  Cancelar
                </Button>
                <Button variant="primary" size="sm" icon="fas fa-check"
                  :loading="store.settingsLoading" :disabled="store.settingsLoading"
                  @click="handleSaveCv">
                  Salvar
                </Button>
              </template>
            </div>
          </div>

          <!-- ── MODO LEITURA ──────────────────────────────────────────────── -->
          <div v-if="!editingCv" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1">IDs de Série CV (Entrada)</p>
              <div class="flex flex-wrap gap-1">
                <span v-for="id in form.idserie_ra" :key="id"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 text-xs font-mono">
                  {{ id }}
                </span>
                <span v-if="!form.idserie_ra.length" class="text-sm text-ink-subtle italic">
                  Nenhuma série configurada
                </span>
              </div>
            </div>
            <div>
              <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1">ID Tipo Documento (Anexo)</p>
              <p class="text-sm text-ink font-mono">{{ form.cv_idtipo_documento ?? '—' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1">Situação — Sucesso</p>
              <p class="text-sm text-ink font-mono">{{ form.situacao_sucesso_id ?? '—' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1">Situação — Erro</p>
              <p class="text-sm text-ink font-mono">{{ form.situacao_erro_id ?? '—' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1">Situação — Pago</p>
              <p class="text-sm text-ink font-mono">{{ form.situacao_pago_id ?? '—' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1">Situação — Baixado</p>
              <p class="text-sm text-ink font-mono">{{ form.situacao_baixado_id ?? '—' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1">Tolerância (dias úteis)</p>
              <p class="text-sm text-ink font-mono">{{ form.tolerancia_dias_uteis ?? '—' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1">Safety lote Sienge (min)</p>
              <p class="text-sm text-ink font-mono">{{ form.delay_situacao_sucesso_min ?? '—' }}</p>
            </div>
            <div>
              <p class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1">Máx. dias vencimento (geral)</p>
              <p class="text-sm text-ink font-mono">{{ form.max_dias_vencimento ?? '—' }} dias</p>
              <p class="text-[10px] text-ink-subtle mt-0.5">Override por empreendimento configurável na regra de comissão.</p>
            </div>
          </div>

          <!-- ── MODO EDIÇÃO ───────────────────────────────────────────────── -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Input
              v-model.number="form.situacao_pago_id"
              type="number"
              label="ID Situação CV — Pago"
              placeholder="Ex: 28"
              hint="Quando o boleto é detectado como LIQUIDADO no Ecobrança." />
            <Input
              v-model.number="form.situacao_baixado_id"
              type="number"
              label="ID Situação CV — Baixado"
              placeholder="Ex: 29"
              hint="Quando o boleto vencido é baixado por devolução." />
            <Input
              v-model.number="form.tolerancia_dias_uteis"
              type="number"
              label="Tolerância (dias úteis)"
              placeholder="Ex: 1"
              hint="Dias úteis após vencimento antes de baixar (já considera sáb/dom/feriados)." />
            <Input
              v-model.number="form.delay_situacao_sucesso_min"
              type="number"
              label="Safety lote Sienge (min)"
              placeholder="Ex: 2"
              hint="Se faltam menos que isto pro próximo lote (5/5min), pula pro seguinte. Default 2 → delay efetivo 3-7 min." />
            <Input
              v-model.number="form.max_dias_vencimento"
              type="number"
              label="Máx. dias vencimento (geral)"
              placeholder="Ex: 10"
              hint="Vencimentos acima deste limite são rejeitados. Override por empreendimento na regra de comissão." />
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
                  <th class="text-center px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Máx dias</th>
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
                  <td class="px-3 py-2 text-center font-mono text-xs">
                    <template v-if="rule.max_dias_vencimento">
                      <span class="text-ink font-semibold">{{ rule.max_dias_vencimento }}</span>
                      <span class="text-ink-subtle"> d</span>
                    </template>
                    <span v-else class="text-ink-subtle italic" :title="`Usa padrão geral (${form.max_dias_vencimento ?? 10} dias)`">
                      padrão
                    </span>
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

            <Input
              v-model.number="ruleModal.form.max_dias_vencimento"
              type="number"
              min="1"
              max="90"
              label="Máx. dias vencimento (override)"
              :placeholder="`Vazio = usa padrão geral (${form.max_dias_vencimento ?? 10} dias)`"
              hint="Override do limite de vencimento só para este empreendimento. Deixe vazio para usar o padrão geral." />

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

        <!-- Card: Notificações ao Cliente (e-mail + WhatsApp) -->
        <Surface variant="raised" padding="md" class="space-y-4 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 grid place-items-center">
              <i class="fas fa-paper-plane"></i>
            </div>
            <div>
              <h2 class="font-semibold text-ink text-sm">Envio do boleto ao cliente</h2>
              <p class="text-xs text-ink-muted">Após emissão, enviamos o boleto pro titular por e-mail e WhatsApp.</p>
            </div>
          </div>

          <Surface variant="raised" padding="sm" class="border-emerald-500/30 bg-emerald-500/5">
            <div class="text-xs text-ink leading-relaxed space-y-1">
              <p class="flex items-start gap-1.5">
                <i class="fas fa-envelope text-emerald-600 mt-0.5"></i>
                <span><strong>E-mail:</strong> enviado pro e-mail do titular cadastrado no CV. Rodapé deixa claro que é canal só de envio (não aceita respostas).</span>
              </p>
              <p class="flex items-start gap-1.5">
                <i class="fab fa-whatsapp text-emerald-600 mt-0.5"></i>
                <span><strong>WhatsApp:</strong> usa o template HSM <code class="font-mono bg-surface-sunken px-1 rounded text-[10px]">{{ store.whatsappTemplate?.name || 'boleto_caixa_ato_v1' }}</code>. Cliente que responder recebe aviso automático informando que é canal só de avisos.</span>
              </p>
            </div>
          </Surface>

          <!-- Status do template WhatsApp -->
          <div class="flex items-center justify-between gap-3 p-3 rounded-lg border border-line bg-surface-sunken">
            <div class="flex items-center gap-2 text-sm">
              <i v-if="store.whatsappTemplate?.approved_locally"
                class="fas fa-circle-check text-emerald-500"></i>
              <i v-else class="fas fa-circle-exclamation text-amber-500"></i>
              <span v-if="store.whatsappTemplate?.approved_locally" class="text-ink">
                Template WhatsApp <strong>aprovado</strong> e pronto pra uso.
              </span>
              <span v-else class="text-ink">
                Template WhatsApp <strong>não aprovado</strong> ainda — envios por WhatsApp vão falhar.
              </span>
              <span v-if="store.whatsappTemplate?.status"
                class="text-xs text-ink-muted ml-1">({{ store.whatsappTemplate.status }})</span>
            </div>
            <Button variant="primary" size="sm"
              :icon="store.whatsappTemplateLoading ? 'fas fa-spinner fa-spin' : 'fas fa-rotate'"
              :disabled="store.whatsappTemplateLoading"
              @click="handleSyncTemplate">
              {{ store.whatsappTemplate?.approved_locally ? 'Re-sincronizar' : 'Criar na Meta' }}
            </Button>
          </div>

          <p v-if="store.whatsappTemplateMsg" class="text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-1.5">
            <i class="fas fa-check mt-0.5"></i><span>{{ store.whatsappTemplateMsg }}</span>
          </p>
          <p v-if="store.whatsappTemplateError" class="text-xs text-red-500 flex items-start gap-1.5">
            <i class="fas fa-circle-exclamation mt-0.5"></i><span>{{ store.whatsappTemplateError }}</span>
          </p>
        </Surface>

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

        <!-- Filtros (componente dedicado, padrão DashboardFilters) -->
        <BoletoFilters @filter-changed="onFiltersChanged" />

        <!-- KPIs (reflete o conjunto filtrado) -->
        <div v-if="store.stats" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Surface v-for="kpi in kpiCards" :key="kpi.label"
            variant="raised" padding="sm" class="surface-gradient relative overflow-hidden">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-[10px] font-mono uppercase tracking-wider text-ink-subtle">{{ kpi.label }}</p>
                <p class="mt-1 text-xl font-semibold text-ink tabular-nums leading-tight truncate" :title="kpi.value">
                  {{ kpi.value }}
                </p>
                <p v-if="kpi.sub" class="mt-0.5 text-[11px] text-ink-muted truncate" :title="kpi.sub">
                  {{ kpi.sub }}
                </p>
              </div>
              <div class="h-8 w-8 rounded-lg grid place-items-center border shrink-0" :class="kpi.iconClass">
                <i :class="kpi.icon" class="text-xs"></i>
              </div>
            </div>
          </Surface>
        </div>

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

        <!-- Tabela enxuta — detalhes/ações vão pro modal -->
        <Surface v-else variant="raised" padding="none" class="overflow-hidden surface-gradient">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-surface-sunken/60 border-b border-line">
                  <th class="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">#Reserva</th>
                  <th class="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Titular / Empreendimento</th>
                  <th class="text-right px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Valor</th>
                  <th class="text-center px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Vencimento</th>
                  <th class="text-center px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Emissão</th>
                  <th class="text-center px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Pagamento</th>
                  <th class="text-center px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle">Data</th>
                  <th class="text-center px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-ink-subtle"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!store.history.length">
                  <td colspan="8" class="text-center py-12">
                    <EmptyState icon="fas fa-inbox" title="Sem registros" description="Nenhum registro encontrado com os filtros atuais." />
                  </td>
                </tr>
                <tr v-for="item in store.history" :key="item.id"
                  class="border-b border-line hover:bg-surface-hover/40 transition-colors cursor-pointer"
                  @click="openDetail(item)">
                  <td class="px-4 py-3 font-mono text-accent font-semibold whitespace-nowrap">
                    #{{ item.idreserva }}
                    <span v-if="item.attempts_count > 1"
                      class="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-ink/5 text-ink-muted border border-line align-middle"
                      :title="`${item.attempts_count} boletos emitidos para esta reserva`">
                      <i class="fas fa-layer-group text-[9px]"></i> {{ item.attempts_count }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-ink truncate max-w-[260px]">{{ item.titular_nome || '—' }}</div>
                    <div class="text-ink-subtle text-[11px] truncate max-w-[260px]">{{ item.empreendimento || '—' }}</div>
                  </td>
                  <td class="px-4 py-3 text-right font-semibold text-ink whitespace-nowrap font-mono tabular-nums">
                    {{ item.valor ? formatCurrency(item.valor) : '—' }}
                  </td>
                  <td class="px-4 py-3 text-center text-ink-muted whitespace-nowrap font-mono tabular-nums">
                    {{ item.vencimento ? formatDate(item.vencimento) : '—' }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <Badge :variant="statusVariant(item.status)" size="sm">
                      <i :class="statusIcon(item.status)" class="mr-1"></i>
                      {{ statusLabel(item.status) }}
                    </Badge>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      :class="paymentBadgeClass(item.payment_status || 'pending')">
                      <i :class="paymentBadgeIcon(item.payment_status || 'pending')"></i>
                      {{ paymentBadgeLabel(item.payment_status || 'pending') }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-center text-xs text-ink-subtle whitespace-nowrap font-mono tabular-nums">
                    {{ formatDateTime(item.createdAt) }}
                  </td>
                  <td class="px-4 py-3 text-center whitespace-nowrap">
                    <button @click.stop="openDetail(item)"
                      class="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-accent-soft text-accent rounded-lg hover:bg-accent/15 transition-colors">
                      <i class="fas fa-arrow-up-right-from-square"></i>
                      Detalhes
                    </button>
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

    <!-- Modal consolidado de detalhes (Resumo / Timeline / PDF) -->
    <BoletoDetailModal
      :open="detailModal.open"
      :item="detailModal.item"
      @close="closeDetail"
      @changed="store.fetchHistory()" />
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

// Componentes próprios desta tela
import BoletoFilters from './components/BoletoFilters.vue';
import BoletoDetailModal from './components/BoletoDetailModal.vue';

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

// ── Modal de detalhes (Resumo / Timeline / PDF) ──────────────────────────────
const detailModal = ref({ open: false, item: null });
function openDetail(item) {
  detailModal.value = { open: true, item };
}
function closeDetail() {
  detailModal.value = { open: false, item: null };
}

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
  situacao_pago_id: 28,
  situacao_baixado_id: 29,
  tolerancia_dias_uteis: 1,
  delay_situacao_sucesso_min: 2,
  max_dias_vencimento: 10,
  active: false,
});

// ── Modo edição do card "Configurações do CV" ─────────────────────────────────
// Por padrão o card mostra os valores em modo leitura. Botão "Editar" abre
// inputs; "Cancelar" reverte pro snapshot; "Salvar" persiste e fecha.
const editingCv = ref(false);
let cvSnapshot = null;

function snapshotCvFields() {
  return {
    idserie_ra: Array.isArray(form.value.idserie_ra) ? [...form.value.idserie_ra] : [],
    cv_idtipo_documento: form.value.cv_idtipo_documento,
    situacao_sucesso_id: form.value.situacao_sucesso_id,
    situacao_erro_id: form.value.situacao_erro_id,
    situacao_pago_id: form.value.situacao_pago_id,
    situacao_baixado_id: form.value.situacao_baixado_id,
    tolerancia_dias_uteis: form.value.tolerancia_dias_uteis,
    delay_situacao_sucesso_min: form.value.delay_situacao_sucesso_min,
    max_dias_vencimento: form.value.max_dias_vencimento,
  };
}

function startEditCv() {
  cvSnapshot = snapshotCvFields();
  editingCv.value = true;
}

function cancelEditCv() {
  if (cvSnapshot) Object.assign(form.value, cvSnapshot);
  novaSerieId.value = null;
  editingCv.value = false;
}

async function handleSaveCv() {
  const payload = snapshotCvFields();
  await store.saveSettings(payload);
  if (!store.settingsError) {
    cvSnapshot = null;
    editingCv.value = false;
  }
}

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

// ── Filtros: ao aplicar, refaz history + stats em paralelo ────────────────────
function onFiltersChanged() {
  store.fetchHistory();
  store.fetchStats();
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
const kpiCards = computed(() => {
  const s = store.stats;
  if (!s) return [];
  const pct = (key) => s.percent?.[key] ?? 0;
  return [
    {
      label: 'Emitidos',
      value: s.emitidos.qty,
      sub: formatCurrency(s.emitidos.valor),
      icon: 'fas fa-barcode',
      iconClass: 'bg-accent-soft text-accent border-accent/20',
    },
    {
      label: 'Pagos',
      value: s.paid.qty,
      sub: `${pct('paid')}% · ${formatCurrency(s.paid.valor)}`,
      icon: 'fas fa-circle-check',
      iconClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    {
      label: 'Pendentes',
      value: s.pending.qty,
      sub: `${pct('pending')}% · ${formatCurrency(s.pending.valor)}`,
      icon: 'fas fa-clock',
      iconClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    {
      label: 'Baixados',
      value: s.cancelled.qty,
      sub: `${pct('cancelled')}% evasão · ${formatCurrency(s.cancelled.valor)}`,
      icon: 'fas fa-ban',
      iconClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    },
    {
      label: 'Erros emissão',
      value: s.errors.qty,
      sub: `${pct('errorEmissao')}% do total`,
      icon: 'fas fa-circle-exclamation',
      iconClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    {
      label: 'Valor pago',
      value: formatCurrency(s.paid.valor),
      sub: `de ${formatCurrency(s.emitidos.valor)} emitido`,
      icon: 'fas fa-sack-dollar',
      iconClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
  ];
});

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

// ── Status helpers ────────────────────────────────────────────────────────────
function statusVariant(status) {
  return {
    processing: 'info',
    success:    'success',
    error:      'danger',
    skipped:    'neutral',
  }[status] || 'neutral';
}

function statusIcon(status) {
  return {
    processing: 'fas fa-spinner fa-spin',
    success:    'fas fa-check',
    error:      'fas fa-times',
    skipped:    'fas fa-forward',
  }[status] || 'fas fa-question';
}

function statusLabel(status) {
  return {
    processing: 'Processando',
    success: 'Sucesso',
    error: 'Erro',
    skipped: 'Sem série',
  }[status] || status;
}

// ── Payment status (pending/paid/cancelled/error) ─────────────────────────────
function paymentBadgeLabel(s) {
  return ({
    pending:   'Pendente',
    paid:      'Pago',
    cancelled: 'Baixado',
    error:     'Erro na verificação',
  })[s] || s;
}
function paymentBadgeClass(s) {
  return ({
    pending:   'bg-ink/5 text-ink-muted border border-line',
    paid:      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
    cancelled: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30',
    error:     'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30',
  })[s] || 'bg-surface-sunken border border-line';
}
function paymentBadgeIcon(s) {
  return ({
    pending:   'fas fa-clock',
    paid:      'fas fa-circle-check',
    cancelled: 'fas fa-ban',
    error:     'fas fa-circle-exclamation',
  })[s] || 'fas fa-circle';
}

// ── Regras de Comissão por Empreendimento ─────────────────────────────────────
const ruleModal = ref({
  open: false,
  id: null,
  saving: false,
  error: '',
  form: { idempreendimento_cv: null, empreendimento_nome: '', percentual_boleto: 100, max_dias_vencimento: null, observacao: '', active: true },
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
        max_dias_vencimento: rule.max_dias_vencimento ?? null,
        observacao: rule.observacao || '',
        active: rule.active,
      },
    };
  } else {
    ruleModal.value = {
      open: true, id: null, saving: false, error: '',
      form: { idempreendimento_cv: null, empreendimento_nome: '', percentual_boleto: 100, max_dias_vencimento: null, observacao: '', active: true },
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

async function handleSyncTemplate() {
  const isCreate = !store.whatsappTemplate?.approved_locally;
  if (isCreate) {
    const ok = confirm(
      'Enviar o template "boleto_caixa_ato_v1" para a Meta?\n\n'
      + 'O template ficará em revisão por alguns minutos/horas antes de ser aprovado.\n'
      + 'Enquanto não estiver aprovado, envios por WhatsApp falharão.'
    );
    if (!ok) return;
  }
  await store.syncWhatsappTemplate();
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
      form.value.situacao_pago_id    = store.settings.situacao_pago_id ?? 28;
      form.value.situacao_baixado_id = store.settings.situacao_baixado_id ?? 29;
      form.value.tolerancia_dias_uteis = store.settings.tolerancia_dias_uteis ?? 1;
      form.value.delay_situacao_sucesso_min = store.settings.delay_situacao_sucesso_min ?? 2;
      form.value.max_dias_vencimento = store.settings.max_dias_vencimento ?? 10;
      form.value.active = store.settings.active ?? false;
    }
    await store.fetchComissionRules();
    await store.fetchWhatsappTemplate();
  }
  // fetchHistory/fetchStats são disparados pelo BoletoFilters.onMounted via
  // emit('filter-changed') → onFiltersChanged() (com os defaults de 30 dias).
});
</script>
