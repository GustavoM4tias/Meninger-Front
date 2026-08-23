<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        subtitle="Cobrança da entrada por boleto Caixa ou link de cartão, acionada pelo webhook do CV"
        icon="fas fa-file-invoice-dollar">
        <template #title>
          <span>Ato</span>
          <Favorite :router="'/financeiro/cobranca/ato'" :section="'Ato'" />
        </template>
        <template #actions>
          <!-- Status indicator -->
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
          <PageHelp
            storage-key="cobranca-ato"
            title="Como usar o Boleto Caixa"
            intro="Quando uma reserva entra na situação combinada no CV, o sistema emite sozinho o boleto do ato no Ecobrança, anexa na reserva e devolve a situação. Esta tela mostra o que já foi emitido e deixa ajustar como a automação se comporta."
            :steps="[
              { title: 'Acompanhe as emissões', text: 'A aba Histórico lista os boletos do período. Os cartões do topo contam quantos foram pagos, quantos ainda esperam e quantos falharam.' },
              { title: 'Recorte pelo cartão', text: 'Clique em Com erro para deixar na tabela só o que falhou, ou em Pagos para o contrário. Clicar de novo desfaz.' },
              { title: 'Abra um boleto', text: 'Clique na linha para ver o resumo, a linha do tempo da emissão e o PDF. Dali dá para reprocessar, reenviar ao cliente ou marcar como baixado.' },
              { title: 'Ajuste a automação', text: 'A aba Configurações guarda as credenciais do Ecobrança, o endereço do webhook, a janela de horário, o percentual de comissão por empreendimento e o envio ao cliente.' },
            ]"
            :tips="[
              'A automação pode ser pausada sem perder nada: os webhooks que chegarem ficam registrados e voltam a ser processados quando ela for religada.',
              'A comissão embutida multiplica o valor da série antes de emitir. Série de R$ 10.000 com 20% vira um boleto de R$ 2.000.',
              'Boleto fora da janela de horário não falha: fica agendado, e a tabela mostra a hora em que vai sair.',
              'O selo com um número ao lado da reserva quer dizer que já houve mais de um boleto para ela.',
            ]"
          />
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
      <div v-if="activeTab === 'settings' && can('configure')" class="space-y-5">

        <!-- Card: Credenciais Ecobrança -->
        <Panel class="space-y-4 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-accent-soft text-accent border border-accent/20 grid place-items-center">
              <i class="fas fa-lock"></i>
            </div>
            <div>
              <h2 class="font-semibold text-sm">Credenciais Ecobrança</h2>
              <p class="text-ink-muted">Acesso ao portal da Caixa Econômica Federal</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              v-model="form.eco_usuario"
              label="Usuário (CPF)"
              placeholder="00000000000"
              maxlength="11" />
            <div>
              <label class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                Senha
                <span v-if="store.settings?.eco_senha_set"
                  class="ml-1.5 text-micro normal-case text-data-pos font-normal">
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
        </Panel>

        <!-- Card: Webhook -->
        <Panel class="space-y-3 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-accent/10 text-accent border border-accent/20 grid place-items-center">
              <i class="fas fa-link"></i>
            </div>
            <div>
              <h2 class="font-semibold text-sm">Endereço do Webhook</h2>
              <p class="text-ink-muted">Configure este endereço no cadastro do webhook do CV</p>
            </div>
          </div>

          <div class="flex items-center gap-2 bg-surface-sunken border border-line rounded-lg px-3 py-2.5">
            <code class="text-xs sm:text-accent flex-1 break-all select-all font-mono">
              {{ webhookUrl }}
            </code>
            <Button variant="primary" size="sm" :icon="copied ? 'fas fa-check' : 'fas fa-copy'"
              @click="copyWebhook">
              {{ copied ? 'Copiado!' : 'Copiar' }}
            </Button>
          </div>

          <Panel class="border-data-warn/30 bg-data-warn/10">
            <div class="flex items-start gap-2 text-data-warn">
              <i class="fas fa-circle-info mt-0.5"></i>
              <span>
                Configure o gatilho <strong>"Quando entrar na situação..."</strong> para a funcionalidade
                <strong>Reserva</strong> no CV com este endereço.
              </span>
            </div>
          </Panel>
        </Panel>

        <!-- Card: Configurações do CV (modo leitura por padrão; botão Editar habilita) -->
        <Panel class="space-y-4 surface-gradient">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="h-9 w-9 rounded-xl bg-data-pos/10 text-data-pos border border-data-pos/20 grid place-items-center">
                <i class="fas fa-sliders"></i>
              </div>
              <div>
                <h2 class="font-semibold text-sm">Configurações do CV</h2>
                <p class="text-ink-muted">Mapeamentos de série, tipo de documento e situações de workflow.</p>
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
              <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">IDs de Série CV (Entrada)</p>
              <div class="flex flex-wrap gap-1">
                <span v-for="id in form.idserie_ra" :key="id"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 text-xs font-mono">
                  {{ id }}
                </span>
                <span v-if="!form.idserie_ra.length" class="text-ink-subtle italic">
                  Nenhuma série configurada
                </span>
              </div>
            </div>
            <div>
              <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">ID Tipo Documento (Anexo)</p>
              <p class="text-ink font-mono">{{ form.cv_idtipo_documento ?? '—' }}</p>
            </div>
            <div>
              <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Situação — Sucesso</p>
              <p class="text-ink font-mono">{{ form.situacao_sucesso_id ?? '—' }}</p>
            </div>
            <div>
              <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Situação — Erro</p>
              <p class="text-ink font-mono">{{ form.situacao_erro_id ?? '—' }}</p>
            </div>
            <div>
              <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Situação — Pago</p>
              <p class="text-ink font-mono">{{ form.situacao_pago_id ?? '—' }}</p>
            </div>
            <div>
              <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Situação — Baixado</p>
              <p class="text-ink font-mono">{{ form.situacao_baixado_id ?? '—' }}</p>
            </div>
            <div>
              <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Tolerância (dias úteis)</p>
              <p class="text-ink font-mono">{{ form.tolerancia_dias_uteis ?? '—' }}</p>
            </div>
            <div>
              <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Situações de reserva encerrada</p>
              <p class="text-ink font-mono">{{ form.cv_situacoes_reserva_morta?.length ? form.cv_situacoes_reserva_morta.join(', ') : '—' }}</p>
              <p class="text-ink-subtle mt-0.5">Boleto parado nessas situações conta em "Canceladas", não em "Com erro".</p>
            </div>
            <div>
              <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Revalidar baixa (dias)</p>
              <p class="text-ink font-mono">{{ form.revalidacao_baixado_dias ?? '—' }}</p>
              <p class="text-ink-subtle mt-0.5">Boleto baixado segue sendo reconsultado por este prazo. 0 desliga.</p>
            </div>
            <div>
              <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Safety lote Sienge (min)</p>
              <p class="text-ink font-mono">{{ form.delay_situacao_sucesso_min ?? '—' }}</p>
            </div>
            <div>
              <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Máx. dias vencimento (geral)</p>
              <p class="text-ink font-mono">{{ form.max_dias_vencimento ?? '—' }} dias</p>
              <p class="text-ink-subtle mt-0.5">Override por empreendimento configurável na regra de comissão.</p>
            </div>
            <div>
              <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1">Teto de valor por boleto</p>
              <p class="text-ink font-mono">{{ valorMaximoLabel }}</p>
              <p class="text-ink-subtle mt-0.5">Série acima do teto não é registrada no banco, fica como erro para conferência.</p>
            </div>
          </div>

          <!-- ── MODO EDIÇÃO ───────────────────────────────────────────────── -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- IDs de Série — chip input (múltiplos) -->
            <div class="md:col-span-1">
              <label class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
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
                    class="hover:text-data-neg transition-colors leading-none">
                    <i class="fas fa-times text-micro"></i>
                  </button>
                </span>
                <span v-if="!form.idserie_ra.length" class="text-ink-subtle italic self-center">
                  Nenhuma série configurada
                </span>
              </div>
              <p class="text-ink-subtle mt-1.5">
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
            <div class="md:col-span-1">
              <label class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                Situações CV de reserva encerrada
              </label>
              <div class="flex gap-2">
                <Input
                  v-model.number="novaSituacaoMorta"
                  type="number"
                  placeholder="Ex: 4"
                  @keydown.enter.prevent="addSituacaoMorta" />
                <Button variant="primary" size="sm" icon="fas fa-plus" @click="addSituacaoMorta">
                  Adicionar
                </Button>
              </div>
              <div class="flex flex-wrap gap-1 mt-2">
                <span v-for="id in form.cv_situacoes_reserva_morta" :key="id"
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-soft text-accent border border-accent/20 text-xs font-medium font-mono">
                  {{ id }}
                  <button type="button" @click="removeSituacaoMorta(id)"
                    class="hover:text-data-neg transition-colors leading-none">
                    <i class="fas fa-times text-micro"></i>
                  </button>
                </span>
                <span v-if="!form.cv_situacoes_reserva_morta.length" class="text-ink-subtle italic self-center">
                  Nenhuma situação configurada
                </span>
              </div>
              <p class="text-ink-subtle mt-1.5">
                Reserva nessas situações está encerrada: o boleto que ficou pelo caminho não é erro a resolver, e sai da fila de trabalho. Hoje 4 = Cancelada, 11 = Vencida.
              </p>
            </div>
            <Input
              v-model.number="form.revalidacao_baixado_dias"
              type="number"
              label="Revalidar baixa (dias)"
              placeholder="Ex: 5"
              hint="O banco já devolveu &quot;baixado por devolução&quot; em boleto que dias depois constava pago. Por este prazo a rodada diária reconsulta o boleto baixado (só leitura) e promove para pago se o pagamento aparecer. 0 desliga." />
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
            <Input
              v-model.number="form.valor_maximo"
              type="number"
              label="Teto de valor por boleto (R$)"
              placeholder="Ex: 300000"
              hint="Valor acima do teto não vira boleto no banco: fica como erro para conferência da condição no CV. Vazio = sem teto." />
          </div>
        </Panel>

        <!-- Card: Regras de Comissão Embutida por Empreendimento -->
        <Panel class="space-y-4 surface-gradient">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="h-9 w-9 rounded-xl bg-data-warn/10 text-data-warn border border-data-warn/20 grid place-items-center">
                <i class="fas fa-percent"></i>
              </div>
              <div>
                <h2 class="font-semibold text-sm">Comissão Embutida por Empreendimento</h2>
                <p class="text-ink-muted">
                  Quando o valor da série já inclui a comissão, defina aqui o % do valor que deve ir para o boleto.
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm" icon="fas fa-plus" @click="openRuleModal()">
              Nova regra
            </Button>
          </div>

          <p v-if="store.rulesError" class="text-data-neg flex items-center gap-1.5">
            <i class="fas fa-circle-exclamation"></i>{{ store.rulesError }}
          </p>

          <div v-if="store.rulesLoading" class="text-ink-muted py-2">
            <i class="fas fa-spinner fa-spin mr-1"></i> Carregando regras...
          </div>

          <div v-else-if="!store.rules.length" class="text-ink-subtle italic py-2">
            Nenhuma regra cadastrada. Todos os empreendimentos usam o valor cheio da série.
          </div>

          <div v-else class="overflow-x-auto -mx-3">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-surface-sunken/60 border-b border-line">
                  <th class="text-left px-3 py-2 text-micro font-mono uppercase tracking-wider text-ink-subtle">ID Emp.</th>
                  <th class="text-left px-3 py-2 text-micro font-mono uppercase tracking-wider text-ink-subtle">Empreendimento</th>
                  <th class="text-right px-3 py-2 text-micro font-mono uppercase tracking-wider text-ink-subtle">% Boleto</th>
                  <th class="text-center px-3 py-2 text-micro font-mono uppercase tracking-wider text-ink-subtle">Máx dias</th>
                  <th class="text-left px-3 py-2 text-micro font-mono uppercase tracking-wider text-ink-subtle">Observação</th>
                  <th class="text-center px-3 py-2 text-micro font-mono uppercase tracking-wider text-ink-subtle">Ativo</th>
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
                  <td class="px-3 py-2 text-ink-muted">{{ rule.observacao || '—' }}</td>
                  <td class="px-3 py-2 text-center">
                    <Badge :variant="rule.active ? 'success' : 'neutral'" size="sm">
                      {{ rule.active ? 'Sim' : 'Não' }}
                    </Badge>
                  </td>
                  <td class="px-3 py-2 text-right whitespace-nowrap">
                    <button @click="openRuleModal(rule)"
                      class="text-accent hover:text-xs mr-3">
                      <i class="fas fa-pen-to-square"></i> Editar
                    </button>
                    <button @click="confirmDeleteRule(rule)"
                      class="text-data-neg hover:text-xs">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>

        <!-- Regra de comissão. Era um modal montado na mão (backdrop e caixa
             próprios); virou o primitivo, que já traz tela cheia no celular,
             fecha no Esc e fica na camada certa. -->
        <Modal :open="ruleModal.open" size="md"
          :title="ruleModal.id ? 'Editar regra' : 'Nova regra de comissão'"
          subtitle="O valor da série é multiplicado por este percentual antes de virar boleto."
          @close="closeRuleModal">
          <div class="space-y-4">

            <Select
              v-if="!ruleModal.id"
              :model-value="ruleModal.form.idempreendimento_cv || ''"
              :options="enterpriseOptions"
              label="Empreendimento"
              :placeholder="store.enterprisesLoading ? 'Carregando...' : 'Selecione um empreendimento'"
              hint="Lista de Empreendimentos do CV."
              @update:model-value="onSelectEnterprise" />

            <div v-else>
              <label class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                Empreendimento
              </label>
              <div class="px-3 py-2 rounded-lg border border-line bg-surface-sunken text-ink">
                <span class="font-mono text-accent">#{{ ruleModal.form.idempreendimento_cv }}</span>
                <span class="ml-2">{{ ruleModal.form.empreendimento_nome || '—' }}</span>
              </div>
              <p class="text-ink-subtle mt-1">O empreendimento não pode ser alterado em uma regra existente.</p>
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
              <label class="text-micro font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                Observação
              </label>
              <textarea v-model="ruleModal.form.observacao" rows="2"
                class="w-full px-3 py-2 rounded-lg border border-line bg-surface-sunken text-ink focus:outline-none focus:border-accent"
                placeholder="Anotações internas (opcional)"></textarea>
            </div>

            <label class="flex items-center gap-2 text-ink cursor-pointer">
              <input type="checkbox" v-model="ruleModal.form.active" />
              Regra ativa
            </label>

            <p v-if="ruleModal.error" class="text-data-neg">{{ ruleModal.error }}</p>

          </div>
          <template #footer>
            <Button variant="ghost" @click="closeRuleModal">Cancelar</Button>
            <Button icon="fas fa-save" :loading="ruleModal.saving" :disabled="ruleModal.saving"
              @click="saveRule">
              Salvar regra
            </Button>
          </template>
        </Modal>

        <!-- Card: Notificações ao Cliente (e-mail + WhatsApp) -->
        <Panel class="space-y-4 surface-gradient">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-xl bg-data-pos/10 text-data-pos border border-data-pos/20 grid place-items-center">
              <i class="fas fa-paper-plane"></i>
            </div>
            <div>
              <h2 class="font-semibold text-sm">Envio do boleto ao cliente</h2>
              <p class="text-ink-muted">Após emissão, enviamos o boleto pro titular por e-mail e WhatsApp.</p>
            </div>
          </div>

          <Panel class="border-data-pos/30 bg-data-pos/5">
            <div class="text-ink leading-relaxed space-y-1">
              <p class="flex items-start gap-1.5">
                <i class="fas fa-envelope text-data-pos mt-0.5"></i>
                <span><strong>E-mail:</strong> enviado pro e-mail do titular cadastrado no CV. Rodapé deixa claro que é canal só de envio (não aceita respostas).</span>
              </p>
              <p class="flex items-start gap-1.5">
                <i class="fab fa-whatsapp text-data-pos mt-0.5"></i>
                <span><strong>WhatsApp:</strong> se o cliente nos escreveu nas últimas 24h, o boleto vai como documento <strong>gratuito</strong> (janela de serviço); fora disso, usa o template HSM <code class="font-mono bg-surface-sunken px-1 rounded text-micro">{{ store.whatsappTemplate?.name || 'boleto_caixa_ato_v2' }}</code>. Cliente que responder recebe aviso automático informando que é canal só de avisos.</span>
              </p>
            </div>
          </Panel>

          <!-- Status do template WhatsApp -->
          <div class="flex items-center justify-between gap-3 p-3 rounded-lg border border-line bg-surface-sunken">
            <div class="flex items-center gap-2 text-sm">
              <i v-if="store.whatsappTemplate?.approved_locally"
                class="fas fa-circle-check text-data-pos"></i>
              <i v-else class="fas fa-circle-exclamation text-data-warn"></i>
              <span v-if="store.whatsappTemplate?.approved_locally" class="text-ink">
                Template WhatsApp <strong>aprovado</strong> e pronto pra uso.
              </span>
              <span v-else class="text-ink">
                Template WhatsApp <strong>não aprovado</strong> ainda — envios por WhatsApp vão falhar.
              </span>
              <span v-if="store.whatsappTemplate?.status"
                class="text-ink-muted ml-1">({{ store.whatsappTemplate.status }})</span>
            </div>
            <Button variant="primary" size="sm"
              :icon="store.whatsappTemplateLoading ? 'fas fa-spinner fa-spin' : 'fas fa-rotate'"
              :disabled="store.whatsappTemplateLoading"
              @click="handleSyncTemplate">
              {{ store.whatsappTemplate?.approved_locally ? 'Re-sincronizar' : 'Criar na Meta' }}
            </Button>
          </div>

          <p v-if="store.whatsappTemplateMsg" class="text-data-pos flex items-start gap-1.5">
            <i class="fas fa-check mt-0.5"></i><span>{{ store.whatsappTemplateMsg }}</span>
          </p>
          <p v-if="store.whatsappTemplateError" class="text-data-neg flex items-start gap-1.5">
            <i class="fas fa-circle-exclamation mt-0.5"></i><span>{{ store.whatsappTemplateError }}</span>
          </p>
        </Panel>

        <!-- Card: Controle de ativação -->
        <Panel class="surface-gradient">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="h-9 w-9 rounded-xl grid place-items-center"
                :class="form.active
                  ? 'bg-data-pos/10 text-data-pos border border-data-pos/20'
                  : 'bg-surface-sunken text-ink-subtle border border-line'">
                <i :class="form.active ? 'fas fa-play' : 'fas fa-pause'"></i>
              </div>
              <div class="min-w-0">
                <h2 class="font-semibold text-sm">Automação</h2>
                <p class="text-ink-muted">
                  {{ form.active ? 'Processando webhooks automaticamente' : 'Webhooks recebidos mas não processados' }}
                </p>
              </div>
            </div>
            <button @click="form.active = !form.active"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0"
              :class="form.active ? 'bg-data-pos' : 'bg-surface-sunken border border-line'">
              <span class="inline-block h-4 w-4 transform rounded-full bg-surface-raised shadow transition-transform"
                :class="form.active ? 'translate-x-6' : 'translate-x-1'"></span>
            </button>
          </div>
        </Panel>

        <!-- Card: Horário de funcionamento (janela de emissão) -->
        <Panel class="space-y-4 surface-gradient">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="h-9 w-9 rounded-xl grid place-items-center shrink-0"
                :class="form.janela_ativa
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'bg-surface-sunken text-ink-subtle border border-line'">
                <i class="fas fa-clock"></i>
              </div>
              <div class="min-w-0">
                <h2 class="font-semibold text-sm">Horário de funcionamento</h2>
                <p class="text-ink-muted">
                  {{ form.janela_ativa
                    ? `Emite das ${janelaLabel} (horário de Brasília)`
                    : 'Emite a qualquer hora, inclusive de madrugada' }}
                </p>
              </div>
            </div>
            <button @click="form.janela_ativa = !form.janela_ativa"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0"
              :class="form.janela_ativa ? 'bg-accent' : 'bg-surface-sunken border border-line'">
              <span class="inline-block h-4 w-4 transform rounded-full bg-surface-raised shadow transition-transform"
                :class="form.janela_ativa ? 'translate-x-6' : 'translate-x-1'"></span>
            </button>
          </div>

          <div v-if="form.janela_ativa" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              v-model.number="form.janela_inicio_hora"
              type="number" min="0" max="23"
              label="Abre às (hora cheia)"
              placeholder="Ex: 6"
              hint="Antes deste horário a emissão fica agendada." />
            <Input
              v-model.number="form.janela_fim_hora"
              type="number" min="1" max="24"
              label="Fecha às (hora cheia)"
              placeholder="Ex: 23"
              hint="A partir deste horário a emissão fica agendada para o dia seguinte." />
          </div>
          <p v-if="form.janela_ativa" class="text-ink-muted flex items-start gap-1.5">
            <i class="fas fa-circle-info mt-0.5 text-accent"></i>
            <span>
              Acionamento recebido fora do horário não vira erro: o registro fica como
              <span class="font-semibold text-ink">Agendado</span> e o boleto é emitido sozinho na abertura seguinte.
              Uma mensagem avisa o gestor na timeline da reserva, e a etapa no CV não é alterada.
              Tentar de novo ou gerar pela tela continua funcionando a qualquer hora.
            </span>
          </p>
        </Panel>

        <!-- ── Link de cartão (portal Userede) ────────────────────────────
             A outra forma de cobrar o mesmo ato. Credenciais, tetos e teste de
             conexão têm salvamento próprio (store diferente), por isso ficam
             num bloco separado e NÃO dependem do botão salvar abaixo, que é do
             boleto. -->
        <div class="pt-2 border-t border-line">
          <div class="flex items-center gap-3 mb-4">
            <div class="h-9 w-9 rounded-xl grid place-items-center shrink-0
                        bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <i class="fas fa-credit-card"></i>
            </div>
            <div class="min-w-0">
              <h2 class="font-semibold text-ink text-sm">Link de cartão (Userede)</h2>
              <p class="text-xs text-ink-muted">
                A mesma cobrança do ato, paga no cartão em vez de boleto.
              </p>
            </div>
          </div>
          <UseredeSettings />
        </div>

        <!-- Botão salvar -->
        <div class="flex flex-wrap items-center justify-end gap-3">
          <p v-if="store.settingsError" class="text-data-neg flex items-center gap-1.5">
            <i class="fas fa-circle-exclamation"></i>{{ store.settingsError }}
          </p>
          <p v-if="store.settingsSaved" class="text-data-pos flex items-center gap-1.5">
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
        <Panel v-if="isDev"
          class="border-data-warn/40 bg-data-warn/5 space-y-4">
          <div class="flex items-center gap-3">
            <Badge variant="warning" size="sm">
              <i class="fas fa-flask mr-1"></i> Dev Only
            </Badge>
            <h3 class="text-sm font-semibold text-data-warn">
              Simular Webhook
            </h3>
          </div>
          <p class="text-data-warn leading-relaxed">
            Dispara o processamento de boleto manualmente para uma reserva, sem precisar configurar o CV.
            Bloqueado automaticamente em produção.
          </p>

          <div class="flex flex-col sm:flex-row gap-3">
            <Input
              v-model="simulateIdreserva"
              type="number"
              placeholder="ID da Reserva (ex: 12345)" />
            <Button variant="primary" class="!bg-data-warn hover:!bg-data-warn"
              :icon="store.simulateLoading ? 'fas fa-spinner fa-spin' : 'fas fa-play'"
              :disabled="store.simulateLoading || !simulateIdreserva"
              @click="handleSimulate">
              {{ store.simulateLoading ? 'Disparando...' : 'Disparar' }}
            </Button>
          </div>

          <p v-if="store.simulateSuccess" class="text-data-pos flex items-center gap-2">
            <i class="fas fa-circle-check"></i>
            Webhook simulado! Acompanhe o progresso na aba Histórico.
          </p>
          <p v-if="store.simulateError" class="text-data-neg flex items-center gap-2">
            <i class="fas fa-circle-xmark"></i>
            {{ store.simulateError }}
          </p>
        </Panel>
      </div>

      <!-- ── TAB: Histórico ───────────────────────────────────────────────────── -->
      <div v-if="activeTab === 'history'" class="space-y-4">

        <!-- Filtros (componente dedicado, padrão DashboardFilters) -->
        <BoletoFilters @filter-changed="onFiltersChanged" />

        <!-- KPIs do conjunto filtrado. Clicar recorta a TABELA (os cartões
             seguem descrevendo o período filtrado, senão clicar em "Pagos"
             levaria o próprio cartão a 100%). -->
        <StatRow v-if="!carregandoHistorico && store.stats" :items="kpiCards"
          :cols="{ sm: 2, md: 3, lg: 6 }" size="sm"
          selectable :active-key="recorte" @select="aoClicarKpi" />

        <!-- Linha de estado -->
        <div class="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <span class="tabular-nums">
            <b class="text-ink">{{ listaRecortada.length }}</b>
            de {{ store.historyTotal || store.history.length }} registro{{ (store.historyTotal || 0) === 1 ? '' : 's' }}
          </span>
          <button v-if="recorteAtivo" type="button"
            class="inline-flex items-center gap-1.5 h-7 px-2 rounded-md bg-accent-soft text-accent
                   text-micro font-medium hover:bg-accent/15 transition-colors duration-120 focus-ring"
            @click="recorte = ''">
            só {{ recorteAtivo.label }}
            <i class="fas fa-xmark text-micro"></i>
          </button>
        </div>

        <div v-if="store.historyError"
          class="rounded-xl border border-data-neg/25 bg-data-neg/10 p-4 text-sm text-data-neg
                 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-start gap-2 min-w-0">
            <i class="fas fa-circle-exclamation mt-0.5 shrink-0"></i>
            <span class="min-w-0">{{ store.historyError }}</span>
          </div>
          <Button variant="outline" size="sm" icon="fas fa-rotate-right" class="shrink-0"
            @click="store.fetchHistory()">
            Tentar novamente
          </Button>
        </div>

        <!-- Esqueleto na forma exata do que vem: seis cartões e a tabela. -->
        <div v-else-if="carregandoHistorico" class="space-y-4">
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
            <Skeleton v-for="i in 7" :key="i" variant="stat" />
          </div>
          <Skeleton variant="table" :lines="8" />
        </div>

        <template v-else>
          <DataTable :columns="COLUNAS" :rows="inc.visiveis.value" row-key="id"
            manual-sort clickable density="compact"
            v-model:sort-by="ordem.by" v-model:sort-dir="ordem.dir"
            more-label="Ver mais campos"
            empty-title="Sem registros"
            empty-text="Nenhum boleto encontrado com os filtros atuais."
            @row-click="openDetail">

            <template #cell-idreserva="{ row }">
              <span class="inline-flex items-center gap-1.5">
                <span class="font-mono font-semibold text-accent tabular-nums">#{{ row.idreserva }}</span>
                <!-- Mais de um boleto para a mesma reserva: é o que explica
                     valor repetido na lista. -->
                <span v-if="row.attempts_count > 1"
                  v-tippy="`${row.attempts_count} boletos emitidos para esta reserva`"
                  class="inline-flex items-center gap-1 px-1.5 rounded-full text-micro font-semibold
                         bg-surface-sunken text-ink-muted border border-line">
                  <i class="fas fa-layer-group" style="font-size:9px"></i>{{ row.attempts_count }}
                </span>
              </span>
            </template>

            <template #cell-titular_nome="{ row }">
              <span class="block min-w-0">
                <span class="block text-ink truncate">{{ row.titular_nome || '-' }}</span>
                <span class="block text-micro text-ink-subtle truncate">{{ row.empreendimento || '-' }}</span>
              </span>
            </template>

            <template #cell-valor="{ row }">
              <span class="metric text-sm">{{ row.valor ? formatCurrency(row.valor) : '-' }}</span>
            </template>

            <template #cell-vencimento="{ row }">
              {{ row.vencimento ? formatDate(row.vencimento) : '-' }}
            </template>

            <template #cell-status="{ row }">
              <span class="inline-flex flex-col items-start gap-0.5">
                <Badge :variant="statusVariant(row.status)" size="sm">{{ statusLabel(row.status) }}</Badge>
                <!-- Agendado pela janela de emissão: mostra QUANDO vai sair. -->
                <span v-if="row.emissao_agendada_para" class="text-micro text-ink-subtle tabular-nums">
                  {{ formatDateTime(row.emissao_agendada_para) }}
                </span>
              </span>
            </template>

            <template #cell-payment_status="{ row }">
              <Badge :variant="paymentVariant(row.payment_status || 'pending')" size="sm">
                {{ paymentBadgeLabel(row.payment_status || 'pending') }}
              </Badge>
            </template>

            <template #cell-cv_situacao="{ row }">
              <span class="inline-flex flex-wrap items-center gap-1">
                <Badge v-if="row.cv_situacao" variant="neutral" size="sm">
                  <i class="fas fa-flag" style="font-size:9px"></i>{{ row.cv_situacao }}
                </Badge>
                <Badge v-if="row.cv_situacao_repasse" variant="info" size="sm">
                  <i class="fas fa-building-columns" style="font-size:9px"></i>{{ row.cv_situacao_repasse }}
                </Badge>
                <span v-if="!row.cv_situacao && !row.cv_situacao_repasse" class="text-ink-subtle">-</span>
              </span>
            </template>

            <template #cell-createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>

            <template #actions="{ row }">
              <IconButton icon="fas fa-up-right-and-down-left-from-center" size="sm"
                label="Abrir detalhes" @click.stop="openDetail(row)" />
            </template>
          </DataTable>

          <!-- Gatilho do scroll: mais 50, e busca no servidor quando a memória
               acaba e ainda há página. -->
          <div v-if="!inc.acabou.value || faltaNoServidor" ref="sentinela"
            class="py-6 flex items-center justify-center gap-2 text-micro text-ink-subtle">
            <Spinner v-if="!inc.acabou.value || store.historyLoadingMore" size="sm" />
            <span v-if="!inc.acabou.value">
              carregando mais {{ Math.min(inc.step, inc.restantes.value) }} de {{ inc.restantes.value }} restantes
            </span>
            <span v-else-if="store.historyLoadingMore">buscando mais {{ faltaNoServidor }} no servidor</span>
            <button v-else type="button" class="underline hover:text-ink" @click="store.loadMoreHistory()">
              carregar mais {{ faltaNoServidor }} registros
            </button>
          </div>
        </template>
      </div>

      <!-- Modal consolidado de detalhes (Resumo / Timeline / PDF) -->
      <BoletoDetailModal
        :open="detailModal.open"
        :item="detailModal.item"
        @close="closeDetail"
        @changed="store.fetchHistory()" />

    </PageContainer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useBoletoStore } from '@/stores/Financeiro/BoletoCaixa/boletoStore';
import { useCan } from '@/composables/useCan';
import UseredeSettings from './components/UseredeSettings.vue';
import API_URL from '@/config/apiUrl';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Panel from '@/components/UI/Panel.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Modal from '@/components/UI/Modal.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Favorite from '@/components/config/Favorite.vue';
import { useIncrementalList } from '@/composables/useIncrementalList';

// Componentes próprios desta tela
import BoletoFilters from './components/BoletoFilters.vue';
import BoletoDetailModal from './components/BoletoDetailModal.vue';

const store = useBoletoStore();
// Ações desta tela (lib/screenCapabilities.js no back): view/operate seguem a
// alçada, configure é admin. Ver composables/useCan.js.
const can = useCan('/financeiro/cobranca/ato');

// ── Tabs ──────────────────────────────────────────────────────────────────────
// Sempre abre no Histórico. A aba "Configurações" só aparece para quem tem a
// ação `configure` — o backend cobra a mesma regra nas rotas de config.
const activeTab = ref('history');

const tabOptions = computed(() => {
  const base = [
    { value: 'history', label: 'Histórico', icon: 'fas fa-clock-rotate-left' },
  ];
  if (can('configure')) {
    base.push({ value: 'settings', label: 'Configurações', icon: 'fas fa-gear' });
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
  revalidacao_baixado_dias: 5,
  cv_situacoes_reserva_morta: [4],
  delay_situacao_sucesso_min: 2,
  max_dias_vencimento: 10,
  valor_maximo: 300000,
  janela_ativa: true,
  janela_inicio_hora: 6,
  janela_fim_hora: 23,
  active: false,
});

// Teto de valor em formato legível. Vazio/nulo = sem teto configurado.
const valorMaximoLabel = computed(() => {
  const v = Number(form.value.valor_maximo);
  if (!Number.isFinite(v) || v <= 0) return 'sem teto';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
});

// "06:00 às 23:00" — janela de funcionamento da emissão automática.
const janelaLabel = computed(() => {
  const hh = (h) => `${String(h ?? 0).padStart(2, '0')}:00`;
  return `${hh(form.value.janela_inicio_hora)} às ${hh(form.value.janela_fim_hora)}`;
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
    revalidacao_baixado_dias: form.value.revalidacao_baixado_dias,
    cv_situacoes_reserva_morta: [...(form.value.cv_situacoes_reserva_morta || [])],
    delay_situacao_sucesso_min: form.value.delay_situacao_sucesso_min,
    max_dias_vencimento: form.value.max_dias_vencimento,
    valor_maximo: form.value.valor_maximo,
  };
}

function startEditCv() {
  cvSnapshot = snapshotCvFields();
  editingCv.value = true;
}

function cancelEditCv() {
  if (cvSnapshot) Object.assign(form.value, cvSnapshot);
  novaSerieId.value = null;
  novaSituacaoMorta.value = null;
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

const novaSituacaoMorta = ref(null);

function addSituacaoMorta() {
  const id = Number(novaSituacaoMorta.value);
  if (!id || form.value.cv_situacoes_reserva_morta.includes(id)) return;
  form.value.cv_situacoes_reserva_morta = [...form.value.cv_situacoes_reserva_morta, id];
  novaSituacaoMorta.value = null;
}

function removeSituacaoMorta(id) {
  form.value.cv_situacoes_reserva_morta = form.value.cv_situacoes_reserva_morta.filter(s => s !== id);
}

async function handleSave() {
  const payload = { ...form.value };
  await store.saveSettings(payload);
}

// ── Colunas ordenáveis do histórico ───────────────────────────────────────────
/* Prioridade decide a ORDEM de aparição no estreito, nunca o que existe.
   Ordenação é `manual-sort`: a tabela recebe a lista já fatiada pelo scroll. */
const COLUNAS = [
  { key: 'idreserva', label: '#Reserva', priority: 1, sortable: true, width: '8rem' },
  { key: 'titular_nome', label: 'Titular / Empreendimento', priority: 1, sortable: true },
  { key: 'status', label: 'Emissão', priority: 1, sortable: true, width: '10rem' },
  { key: 'valor', label: 'Valor', priority: 2, numeric: true, sortable: true, width: '8rem' },
  { key: 'payment_status', label: 'Pagamento', priority: 2, sortable: true, width: '8rem' },
  { key: 'vencimento', label: 'Vencimento', priority: 2, sortable: true, width: '7rem' },
  { key: 'cv_situacao', label: 'Etapa no CV', priority: 3, truncate: false },
  { key: 'createdAt', label: 'Emitido em', priority: 3, sortable: true, width: '9rem' },
];

/* ── Recorte pelo KPI ─────────────────────────────────────────────────────
   Recorta a TABELA, não os cartões. Mesmo gesto liga e desliga. */
const recorte = ref('');

const RECORTES = {
  paid: { label: 'pagos', teste: (r) => r.payment_status === 'paid' },
  pending: { label: 'pendentes', teste: (r) => (r.payment_status || 'pending') === 'pending' && r.status === 'success' },
  /* Baixado de reserva CANCELADA não é evasão - o cliente não fugiu do
     pagamento, a reserva morreu. Vai pro recorte "canceladas". */
  cancelled: { label: 'baixados', teste: (r) => r.payment_status === 'cancelled' && !r.reserva_morta },
  /* `has_boleto` fora: reserva que já tem boleto emitido e depois teve uma
     retentativa falha (o CV redisparou o webhook) não é trabalho pendente, e
     inchava o recorte com caso já resolvido. Mesmo critério do cartão.
     `reserva_morta` fora pelo mesmo motivo: reserva cancelada no CV não tem
     boleto a consertar, o cliente desistiu. Elas vão pro cartão Canceladas. */
  error: { label: 'com erro', teste: (r) => r.status === 'error' && !r.has_boleto && !r.reserva_morta },
  dead: {
    label: 'canceladas',
    teste: (r) => r.reserva_morta
      && ((r.status === 'error' && !r.has_boleto) || r.payment_status === 'cancelled'),
  },
};

const recorteAtivo = computed(() => RECORTES[recorte.value] || null);

function aoClicarKpi(item) {
  recorte.value = (item.key === 'emitidos' || recorte.value === item.key) ? '' : item.key;
}

const listaRecortada = computed(() => (recorteAtivo.value
  ? (store.history || []).filter(recorteAtivo.value.teste)
  : (store.history || [])));

/* ── Ordenação + scroll incremental ──────────────────────────────────── */
const ordem = ref({ by: '', dir: 'asc' });

const ordenada = computed(() => {
  const { by, dir } = ordem.value;
  const base = listaRecortada.value;
  if (!by) return base;
  const mul = dir === 'asc' ? 1 : -1;
  return [...base].sort((a, b) => {
    const va = a[by], vb = b[by];
    if (va == null || va === '') return 1;
    if (vb == null || vb === '') return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mul;
    return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' }) * mul;
  });
});

const faltaNoServidor = computed(() =>
  Math.max(0, (store.historyTotal || 0) - (store.history?.length || 0)));

/* `onEsgotado`: a sentinela chegou à vista e não há mais nada em memória, mas o
   servidor ainda tem página. Sem esse gancho o rodapé anunciava "buscando mais
   no servidor" e ninguém buscava - a listagem parava na primeira página. */
const inc = useIncrementalList(ordenada, {
  step: 50,
  onEsgotado: () => { if (faltaNoServidor.value) store.loadMoreHistory(); },
});

/* Ref de template, não `:ref` inline: a arrow function é recriada a cada
   render, e o Vue então chama observar(null) + observar(el) de novo, desligando
   e religando o IntersectionObserver a cada atualização do store. O watch aqui
   dispara só quando o elemento entra ou sai do DOM. */
const sentinela = ref(null);
watch(sentinela, (el) => inc.observar(el));

/* Selo do pagamento pelos tokens. O `statusVariant` da emissão já existia mais
   abaixo, com skipped/queued - não duplicar. */
const paymentVariant = (s) => ({ paid: 'success', cancelled: 'neutral', pending: 'warning' }[s] || 'neutral');

// ── Etapa CV: links diretos + badge na cor do workflow do CV ─────────────────
const cvReservaUrl = (item) => `https://menin.cvcrm.com.br/gestor/comercial/reservas/${item.idreserva}/administrar`;
const cvRepasseUrl = (item) => item.cv_idrepasse
  ? `https://menin.cvcrm.com.br/gestor/financeiro/repasses/${item.cv_idrepasse}/administrar`
  : cvReservaUrl(item);
function cvBadgeStyle(bg, txt) {
  if (!bg) return null;
  return { backgroundColor: bg, color: txt || '#fff', borderColor: 'transparent' };
}


// ── Filtros: ao aplicar, refaz history + stats em paralelo ────────────────────
/* A primeira carga não é disparada aqui: quem dispara é o BoletoFilters, no
   `onMounted` dele. Entre montar a tela e esse emit chegar, `historyLoading`
   ainda é false e a lista está vazia - e a tabela mostrava "Sem registros" por
   um instante, antes do esqueleto. Este sinalizador cobre essa janela: a tela
   nasce carregando e só sai disso depois da primeira resposta. */
const primeiraCarga = ref(true);

const carregandoHistorico = computed(() => primeiraCarga.value || store.historyLoading);

function onFiltersChanged() {
  Promise.allSettled([store.fetchHistory(), store.fetchStats()])
    .finally(() => { primeiraCarga.value = false; });
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
/* Cartões no formato do StatCard. `value` (não `raw`): aqui o número é fila
   de trabalho, e count-up em "3 com erro" é comemorar o que não deve. */
const kpiCards = computed(() => {
  const st = store.stats;
  if (!st) return [];
  const pct = (k) => st.percent?.[k] ?? 0;
  return [
    { key: 'emitidos', label: 'Emitidos', value: st.emitidos.qty,
      hint: formatCurrency(st.emitidos.valor), icon: 'fas fa-barcode', tone: 'accent',
      tooltip: 'Clique para ver todos os registros' },
    { key: 'paid', label: 'Pagos', value: st.paid.qty,
      hint: `${pct('paid')}% · ${formatCurrency(st.paid.valor)}`,
      icon: 'fas fa-circle-check', tone: 'pos', tooltip: 'Clique para ver só os pagos' },
    { key: 'pending', label: 'Pendentes', value: st.pending.qty,
      hint: `${pct('pending')}% · ${formatCurrency(st.pending.valor)}`,
      icon: 'fas fa-clock', tone: 2, tooltip: 'Clique para ver só os pendentes' },
    { key: 'cancelled', label: 'Baixados', value: st.cancelled.qty,
      hint: `${pct('cancelled')}% evasão · ${formatCurrency(st.cancelled.valor)}`,
      icon: 'fas fa-ban', tone: 'neutral',
      tooltip: 'Boleto vencido sem pagamento, com a reserva viva. Esta é a evasão de verdade' },
    { key: 'error', label: 'Com erro', value: st.errors?.qty ?? 0,
      hint: st.errors?.valor != null ? formatCurrency(st.errors.valor) : '',
      icon: 'fas fa-triangle-exclamation', tone: 'neg',
      tooltip: 'Reservas que hoje estão sem boleto por falha. Clique para ver só elas' },
    { key: 'dead', label: 'Canceladas', value: st.dead?.qty ?? 0,
      hint: st.dead?.valor ? formatCurrency(st.dead.valor) : 'reserva encerrada no CV',
      icon: 'fas fa-user-slash', tone: 'neutral',
      tooltip: 'Reserva encerrada no CV: o boleto foi baixado ou nem saiu. Não é evasão nem erro a resolver' },
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
    queued:     'warning',
  }[status] || 'neutral';
}

function statusLabel(status) {
  return {
    processing: 'Processando',
    success: 'Sucesso',
    error: 'Erro',
    skipped: 'Ignorado',
    queued: 'Agendado',
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
  if (can('configure')) {
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
      form.value.revalidacao_baixado_dias = store.settings.revalidacao_baixado_dias ?? 5;
      form.value.cv_situacoes_reserva_morta = [...(store.settings.cv_situacoes_reserva_morta || [4])];
      form.value.delay_situacao_sucesso_min = store.settings.delay_situacao_sucesso_min ?? 2;
      form.value.max_dias_vencimento = store.settings.max_dias_vencimento ?? 10;
      form.value.valor_maximo = store.settings.valor_maximo != null ? Number(store.settings.valor_maximo) : null;
      form.value.janela_ativa = store.settings.janela_ativa ?? true;
      form.value.janela_inicio_hora = store.settings.janela_inicio_hora ?? 6;
      form.value.janela_fim_hora = store.settings.janela_fim_hora ?? 23;
      form.value.active = store.settings.active ?? false;
    }
    await store.fetchComissionRules();
    await store.fetchWhatsappTemplate();
  }
  // fetchHistory/fetchStats são disparados pelo BoletoFilters.onMounted via
  // emit('filter-changed') → onFiltersChanged() (com os defaults de 30 dias).
});
</script>
