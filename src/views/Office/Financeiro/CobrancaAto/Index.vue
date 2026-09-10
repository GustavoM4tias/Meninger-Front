<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">

      <PageHeader
        subtitle="Cobrança da entrada (boleto Caixa ou link de cartão) e das parcelas mensais até o Sienge faturar o contrato"
        icon="fas fa-file-invoice-dollar">
        <template #title>
          <span>Ato e Parcelas</span>
          <Favorite :router="'/financeiro/cobranca/ato'" :section="'Ato e Parcelas'" />
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
            title="Como usar - Ato e Parcelas"
            intro="Esta tela cuida da cobrança da venda antes do Sienge assumir: a entrada (o ato) e as parcelas mensais. Quando uma reserva entra na situação combinada no CV, o sistema emite sozinho o boleto Caixa ou o link de cartão do ato. Pago o ato, nasce o plano de parcelas: o Office emite cada mensal com antecedência, avisa o cliente quando vence, reemite a pedido (sem multa nem juros) e para sozinho quando o Financeiro fatura a venda no Sienge. A aba Conciliação mostra se o que o cliente pagou já foi lançado no ERP."
            :steps="[
              { title: 'Histórico: acompanhe as cobranças do ato', text: 'Lista o que foi emitido no período. Os cartões do topo contam quantos foram pagos, quantos ainda esperam e quantos falharam. Clique em um cartão para recortar a tabela (clicar de novo desfaz) e na linha para abrir o detalhe, com a linha do tempo e o PDF.' },
              { title: 'Parcelas: as mensais depois do ato', text: 'Uma linha por reserva com plano: quantas parcelas foram pagas, qual é a próxima, o que está em atraso e se o Sienge já faturou. Abra a linha para ver parcela a parcela, emitir ou reemitir um boleto, marcar como paga, pausar ou encerrar o plano. O plano nasce sozinho quando o ato é pago e encerra sozinho quando a venda é faturada no Sienge.' },
              { title: 'Parcelas: confira o que a rodada fez', text: 'O painel Acompanhamento lista boleto a boleto o que saiu no dia (ou em 7 e 30 dias): quem recebeu, por qual canal (anexo no CV, e-mail, WhatsApp) e, quando não saiu, o motivo escrito (CEP recusado pela Caixa, titular sem número no CV). Os selos do topo recortam a lista; clique na linha para abrir o boleto. Em Últimas rodadas fica o histórico de cada ciclo: quando rodou, quanto emitiu, o que falhou e onde caiu.' },
              { title: 'Conciliação: confira o que entrou', text: 'É o relatório “Contas Recebidas” do Sienge no documento AVC, lido ao vivo da API, com filtro de período (data do recebimento), empresa e empreendimento. Serve para bater com o ERP sem abrir o ERP.' },
              { title: 'Leia os quatro grupos', text: 'O confronto com o ato já vem ligado e separa tudo em: conciliados, o que falta lançar no Sienge, o que foi abatido sem ato correspondente, e os que bateram mas com valor diferente. Passe o mouse no selo da coluna Ato, ou abra a linha, para ver de quanto é a diferença.' },
              { title: 'Ataque a lista “Falta lançar”', text: 'É o ato que o cliente já pagou e que ninguém lançou no Sienge ainda - a fila do administrativo. Ela traz cliente, unidade, valor e reserva, e vai junto no CSV do botão Exportar.' },
              { title: 'Configurações: ajuste a automação', text: 'A régua do topo responde na hora se o ato está sendo cobrado, em que horário e se as parcelas estão rodando; o interruptor da cobrança fica ali. Abaixo, cada assunto é um cartão fechado cujo selo já mostra como está configurado - clique para abrir só o que vai mexer. Ficam ali as séries e limites do ato, a comissão embutida, o link de cartão, as parcelas mensais, o envio ao cliente e o acesso à Caixa com o endereço do webhook.' },
              { title: 'Configurações: quem salva o quê', text: 'Os cartões marcados com “Salva neste cartão” (séries do ato, comissão, Userede, parcelas) gravam pelo próprio botão Salvar, lá dentro. O resto - cobrança ligada, janela de horário e credenciais do Ecobrança - junta na barra que aparece no rodapé quando existe ajuste pendente, dizendo quais são. Sair da aba sem salvar descarta essa barra.' },
            ]"
            :tips="[
              'O plano de parcelas é definido uma vez, no Envio Sienge, e não acompanha mudanças feitas depois no CV: o que mudou lá aparece como aviso no plano, e só administrador altera, dentro do Office (editando a parcela ou aplicando as condições do CV de propósito).',
              'A cobrança das parcelas está ligada desde 08/09/2026 e só cobra parcela com vencimento a partir da data de corte configurada. O que venceu antes é retroativo: aparece como atraso na aba Parcelas e só sai pelo botão Emitir agora, dentro do plano.',
              'A Caixa não aceita o CEP genérico da cidade (86360-000, por exemplo). Quando isso acontece o boleto sai mesmo assim com o endereço da Menin, que também está no contrato, e a reserva fica com o alerta “CEP a corrigir no CV” na tabela, no plano e no painel Acompanhamento; o corretor recebe a mensagem no CV. Corrigido o cadastro, o alerta some na emissão seguinte. O endereço de contingência é configurável em Configurações > Parcelas mensais.',
              'Outros erros de emissão ficam marcados como erro no plano e no painel Acompanhamento, com o motivo escrito. A rodada seguinte tenta de novo, até cinco vezes.',
              'Empreendimento que não deve cobrar parcelas: tire dele em Configurações > Parcelas mensais > “Empreendimentos fora da cobrança”. O ato tem webhook por empreendimento no CV; a parcela não tem: a adesão pega toda reserva com ato pago, e essa lista é o único filtro. Ao salvar, os planos ativos são pausados na hora.',
              'Parcela vencida: o cliente recebe um aviso de que a reserva pode ser cancelada, com um botão SIM para pedir a nova via. Respondeu SIM, o Office reemite na hora; a tela também tem o botão Reemitir. Sempre com o mesmo valor e vencimento no próximo dia útil. Nesta etapa não há multa nem juros. São duas vias novas por parcela (configurável): venceu a última, ou o aviso ficou 15 dias sem resposta, o cliente recebe o aviso final, sem nova via, orientado a procurar o corretor, e a parcela fica em atraso para alguém decidir.',
              'O plano encerra sozinho por qualquer uma de duas regras: a venda foi faturada no Sienge (a mesma regra do relatório de Faturamento) ou o repasse no CV chegou a “Contrato Emitido CAIXA” ou a uma etapa seguinte (daí vêm a confissão de dívida, a assinatura e o faturamento). Nos dois casos os boletos em aberto do Office são baixados, para o cliente não pagar sem a informação para os contratos. Contrato lançado ou título gerado no Sienge NÃO encerram: o título pode ser um adiantamento. As etapas do repasse que encerram são escolhidas em Configurações > Parcelas mensais. Ao encerrar, o cliente recebe o aviso de encerramento (e-mail e WhatsApp): o contrato chegou à emissão pela Caixa e as parcelas passam para a Confissão de Dívida, com a frase certa para o caso dele (boleto baixado, parcela paga ou sem boleto). O envio fica no histórico do boleto e vai como mensagem ao corretor no CV.',
              'A automação pode ser pausada sem perder nada: os webhooks que chegarem ficam registrados e voltam a ser processados quando ela for religada.',
              'Em alguns empreendimentos a série do ato vem com a comissão da imobiliária dentro. Ligando “deduzir a comissão do CV” naquele empreendimento, a cobrança passa a ser o ato menos a comissão fora do contrato que o CV informa na reserva: ato de R$ 27.310,66 com R$ 21.848,51 de comissão vira uma cobrança de R$ 5.462,15, o mesmo número da coluna “sem comissão fora do contrato” do CV.',
              'Antes de ligar essa dedução num empreendimento, abra as condições de uma reserva dele no CV: ela só serve quando a coluna “sem comissão fora do contrato” muda apenas na linha do ato. Onde a comissão está espalhada nas parcelas, use o percentual fixo ou o valor cheio.',
              'Quando a comissão é maior que o ato, não sobra nada a cobrar: a emissão para, e a reserva recebe mensagem de divergência em vez de um boleto de valor inventado.',
              'Boleto fora da janela de horário não falha: fica agendado, e a tabela mostra a hora em que vai sair.',
              'O selo com um número ao lado da reserva quer dizer que já houve mais de um boleto para ela.',
              'A Conciliação lê a API do Sienge AO VIVO, não o backup diário: um recebimento lançado há cinco minutos já aparece. O rodapé da aba diz a fonte e a hora exata da consulta.',
              'Por ser ao vivo, a consulta leva alguns segundos - mais ainda sem filtrar a empresa, porque aí vem o grupo inteiro.',
              'O confronto casa os dois lados pelo NOME do cliente, dentro do empreendimento. Onde aparecer o triângulo de aviso, havia mais de um ato com o mesmo nome - vale conferir na mão.',
              'O campo “Olhar p/ trás” (90 dias por padrão) evita acusar de pendente um ato que já foi lançado antes do período consultado. Se o administrativo estiver muito atrasado, aumente esse número.',
              'Ato de empreendimento ainda não pareado com o ERP fica de fora do confronto, e a aba avisa quantos foram. O pareamento é feito em Configurações > Empresas.',
              'Em AVC as colunas acréscimo, seguro, taxa adm e desconto são sempre zero, então o líquido é igual ao valor da baixa. Elas ficam na aba Acessórios do detalhe.',
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

      <!-- ── TAB: Configurações ─────────────────────────────────────────────
           A aba era uma coluna de nove painéis abertos, e o texto dentro deles
           tinha três tamanhos por acidente: um codemod antigo de cores comeu as
           classes de tamanho (a armadilha do tokenizador), e todo parágrafo sem
           `text-*` voltou aos 16px do browser, colado num rótulo de 11px.

           A escala desta aba, agora explícita em todo lugar:
             11px  text-micro   rótulo de campo e de grupo (mono, caixa alta)
             12px  text-xs      nota, hint, célula de tabela
             14px  text-sm      parágrafo, valor, título de cartão
           Valor de campo passa pelo CampoConfig, que é quem guarda esse par.

           A régua do topo responde "está cobrando?" sem clique; cada assunto é
           um cartão fechado cujo selo diz como está configurado. Os cartões
           gravam de jeitos diferentes, e o selo avisa qual: séries do ato,
           comissão, Userede e parcelas têm Salvar próprio; o resto cai na barra
           de alterações pendentes do rodapé. -->
      <div v-if="activeTab === 'settings' && can('configure')" class="space-y-6 pb-24">

        <!-- ── Régua de estado ──────────────────────────────────────────────
             As três leituras que respondem "o que está saindo agora". Ficam
             fora dos cartões porque são o que se olha sem querer configurar.
             Empilham até `lg`: em três colunas o texto quebrava no meio. -->
        <Panel>
          <div class="grid grid-cols-1 lg:grid-cols-3
                      divide-y divide-line lg:divide-y-0 lg:divide-x">
            <!-- Cobrança do ato: o interruptor mestre -->
            <div class="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0
                        lg:py-0 lg:pr-5">
              <div class="min-w-0">
                <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
                  Cobrança do ato
                </p>
                <p class="mt-1 text-sm font-semibold"
                  :class="form.active ? 'text-data-pos' : 'text-ink-muted'">
                  {{ form.active ? 'Emitindo automaticamente' : 'Pausada' }}
                </p>
                <p class="mt-1 text-xs text-ink-muted leading-relaxed">
                  {{ form.active
                    ? 'Webhook do CV vira boleto ou link de cartão.'
                    : 'Webhook fica guardado e é processado quando religar.' }}
                </p>
              </div>
              <Switch v-model="form.active" size="md" />
            </div>

            <!-- Janela de emissão -->
            <div class="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0
                        lg:py-0 lg:px-5">
              <div class="min-w-0">
                <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
                  Janela de emissão
                </p>
                <p class="mt-1 text-sm font-semibold text-ink tabular-nums">
                  {{ form.janela_ativa ? janelaLabel : 'A qualquer hora' }}
                </p>
                <p class="mt-1 text-xs text-ink-muted leading-relaxed">
                  {{ form.janela_ativa
                    ? 'Fora da janela o boleto fica agendado.'
                    : 'Inclusive de madrugada.' }}
                </p>
              </div>
              <i class="fas fa-clock text-sm mt-0.5 shrink-0"
                :class="form.janela_ativa ? 'text-accent' : 'text-ink-subtle'"></i>
            </div>

            <!-- Parcelas mensais (quem grava é o cartão do grupo lá embaixo) -->
            <div class="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0
                        lg:py-0 lg:pl-5">
              <div class="min-w-0">
                <p class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
                  Parcelas mensais
                </p>
                <p class="mt-1 text-sm font-semibold"
                  :class="store.settings?.parcelas_ativo ? 'text-data-pos' : 'text-ink-muted'">
                  {{ store.settings?.parcelas_ativo ? 'Cobrando' : 'Pausada' }}
                </p>
                <p class="mt-1 text-xs text-ink-muted leading-relaxed">
                  {{ store.settings?.parcelas_ativo
                    ? 'A rodada diária emite até o Sienge faturar.'
                    : 'Os planos são calculados, mas nenhum boleto sai.' }}
                </p>
              </div>
              <i class="fas fa-calendar-check text-sm mt-0.5 shrink-0"
                :class="store.settings?.parcelas_ativo ? 'text-data-pos' : 'text-ink-subtle'"></i>
            </div>
          </div>
        </Panel>

        <!-- ═══ GRUPO: O que é cobrado ═══════════════════════════════════ -->
        <section class="space-y-3">
          <h2 class="px-1 text-micro font-mono uppercase tracking-wider text-ink-subtle">
            O que é cobrado
          </h2>

          <!-- Séries e limites do ato (o antigo "Configurações do CV") -->
          <SettingsCard icon="fas fa-sliders" icon-color="accent"
            title="Séries e limites do ato"
            :badge="editingCv ? 'Editando' : 'Salva neste cartão'"
            :badge-variant="editingCv ? 'warning' : 'neutral'"
            :description="resumoSeriesAto">

            <div class="space-y-5 text-sm">
              <!-- ── MODO LEITURA ──────────────────────────────────────── -->
              <div v-if="!editingCv"
                class="rounded-lg border border-line bg-surface-sunken/40 p-4
                       grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <CampoConfig label="IDs de série CV (entrada)">
                  <div class="flex flex-wrap gap-1">
                    <ChipId v-for="id in form.idserie_ra" :key="id" :id="id" />
                    <span v-if="!form.idserie_ra.length" class="text-ink-subtle italic font-sans">
                      Nenhuma série configurada
                    </span>
                  </div>
                </CampoConfig>

                <CampoConfig label="ID tipo documento (anexo)"
                  :value="form.cv_idtipo_documento"
                  note="Tipo de arquivo do CV usado ao anexar o boleto na reserva." />

                <CampoConfig label="Tolerância"
                  :value="form.tolerancia_dias_uteis != null ? `${form.tolerancia_dias_uteis} dias úteis` : ''"
                  note="Prazo depois do vencimento antes de baixar o boleto." />

                <CampoConfig label="Situações de reserva encerrada"
                  :value="form.cv_situacoes_reserva_morta?.length ? form.cv_situacoes_reserva_morta.join(', ') : ''"
                  note="Boleto parado nessas situações conta em Canceladas, não em Com erro." />

                <CampoConfig label="Revalidar baixa"
                  :value="form.revalidacao_baixado_dias != null ? `${form.revalidacao_baixado_dias} dias` : ''"
                  note="Boleto baixado segue sendo reconsultado por este prazo. 0 desliga." />

                <CampoConfig label="Máx. dias de vencimento"
                  :value="`${form.max_dias_vencimento ?? 10} dias`"
                  note="Padrão geral; a regra de comissão pode sobrescrever por empreendimento." />

                <CampoConfig label="Teto de valor por boleto" :value="valorMaximoLabel"
                  note="Série acima do teto não é registrada no banco: fica como erro para conferência." />
              </div>

              <!-- ── MODO EDIÇÃO ───────────────────────────────────────── -->
              <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <ChipListField v-model="form.idserie_ra"
                  label="IDs de série CV (entrada)"
                  placeholder="Ex.: 21"
                  empty-text="Nenhuma série configurada"
                  remove-label="Remover série"
                  hint="Séries cuja parcela de entrada dispara a emissão. Regra: só 1 parcela destas séries por reserva." />

                <Input
                  v-model.number="form.cv_idtipo_documento"
                  type="number"
                  label="ID tipo documento (CV) para anexo"
                  placeholder="Ex.: 14"
                  hint="Obtido nos tipos de arquivo do CV." />

                <Input
                  v-model.number="form.tolerancia_dias_uteis"
                  type="number"
                  label="Tolerância (dias úteis)"
                  placeholder="Ex.: 1"
                  hint="Dias úteis após o vencimento antes de baixar (já considera sábado, domingo e feriado)." />

                <ChipListField v-model="form.cv_situacoes_reserva_morta"
                  label="Situações CV de reserva encerrada"
                  placeholder="Ex.: 4"
                  empty-text="Nenhuma situação configurada"
                  remove-label="Remover situação"
                  hint="Reserva nessas situações está encerrada: o boleto que ficou pelo caminho sai da fila de trabalho. Hoje 4 = Cancelada, 11 = Vencida." />

                <Input
                  v-model.number="form.revalidacao_baixado_dias"
                  type="number"
                  label="Revalidar baixa (dias)"
                  placeholder="Ex.: 5"
                  hint="O banco já devolveu baixa por devolução em boleto que dias depois constava pago. Por este prazo a rodada diária reconsulta (só leitura) e promove para pago. 0 desliga." />

                <Input
                  v-model.number="form.max_dias_vencimento"
                  type="number"
                  label="Máx. dias de vencimento (geral)"
                  placeholder="Ex.: 10"
                  hint="Vencimento acima deste limite é rejeitado. A regra de comissão sobrescreve por empreendimento." />

                <Input
                  v-model.number="form.valor_maximo"
                  type="number"
                  label="Teto de valor por boleto (R$)"
                  placeholder="Ex.: 300000"
                  hint="Valor acima do teto não vira boleto no banco: fica como erro para conferência da condição no CV. Vazio = sem teto." />
              </div>

              <!-- Ação do cartão no rodapé: primeiro se lê, depois se decide. -->
              <div class="flex items-center justify-end gap-2 pt-4 border-t border-line-subtle">
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
          </SettingsCard>

          <!-- Comissão embutida por empreendimento -->
          <SettingsCard icon="fas fa-percent" icon-color="warning"
            title="Comissão embutida por empreendimento"
            :badge="store.rules.length ? `${store.rules.length} regra(s) própria(s)` : 'Só o padrão geral'"
            :badge-variant="store.rules.length ? 'warning' : 'neutral'"
            :description="comissaoModoLabel">

            <div class="space-y-5 text-sm">
              <p class="text-sm text-ink-muted leading-relaxed">
                A série do ato traz junto a comissão que o cliente paga à imobiliária.
                Aqui se define quanto dela sai da cobrança.
              </p>

              <!-- Padrão geral: vale para todo empreendimento sem regra própria.
                   O CV informa a comissão fora do contrato reserva a reserva, então
                   este é o cálculo exato; "valor cheio" é o comportamento antigo.
                   Grava sozinho, com confirmação: por isso fica fora do Salvar. -->
              <div class="rounded-lg border border-line bg-surface-sunken p-3 space-y-2">
                <Select
                  :model-value="form.comissao_modo"
                  :options="comissaoModoOptions"
                  label="Como calcular o valor da cobrança (padrão geral)"
                  :disabled="salvandoComissaoModo"
                  @update:model-value="onChangeComissaoModo" />
                <p class="text-xs text-ink-muted leading-relaxed">
                  <template v-if="form.comissao_modo === 'cv'">
                    Cobra a série do ato menos a comissão fora do contrato que o CV informa na reserva.
                    Só serve onde a comissão cai toda no ato: confira nas condições do CV antes de ligar para todos.
                  </template>
                  <template v-else>
                    Cobra a série do ato inteira, sem descontar comissão.
                    Quem desconta é só o empreendimento com regra própria.
                  </template>
                </p>
              </div>

              <!-- Regras próprias -->
              <div class="space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
                    Regras próprias
                  </h3>
                  <Button variant="ghost" size="sm" icon="fas fa-plus" @click="openRuleModal()">
                    Nova regra
                  </Button>
                </div>

                <p v-if="store.rulesError" class="flex items-center gap-1.5 text-xs text-data-neg">
                  <i class="fas fa-circle-exclamation"></i>{{ store.rulesError }}
                </p>

                <p v-if="store.rulesLoading" class="flex items-center gap-1.5 text-xs text-ink-muted">
                  <i class="fas fa-spinner fa-spin"></i> Carregando regras...
                </p>

                <p v-else-if="!store.rules.length" class="text-xs text-ink-subtle italic">
                  Nenhuma regra cadastrada. Todos os empreendimentos seguem o padrão geral acima.
                </p>

                <!-- Era um <table> de OITO colunas escrito à mão, dentro de um
                     cartão: no celular virava rolagem horizontal dentro de um
                     bloco que já rolava, e a coluna de ações ficava fora da
                     vista. É o DataTable do sistema, que no estreito vira
                     cartão e traz a coluna de ações para o topo. -->
                <DataTable v-else :columns="COLUNAS_REGRAS" :rows="store.rules" row-key="id"
                  density="compact"
                  empty-title="Nenhuma regra cadastrada"
                  empty-text="Todos os empreendimentos seguem o padrão geral acima.">

                  <template #cell-idempreendimento_cv="{ row }">
                    <span class="font-mono tabular-nums text-accent">{{ row.idempreendimento_cv }}</span>
                  </template>

                  <template #cell-_modo="{ row }">
                    <Badge :variant="modoDaRegra(row) === 'percentual' ? 'warning' : 'info'" size="sm">
                      {{ modoLabel(row) }}
                    </Badge>
                    <span v-if="modoHerdado(row)" class="ml-1.5 text-micro text-ink-subtle">herdado</span>
                  </template>

                  <template #cell-percentual_boleto="{ row }">
                    <span v-if="modoDaRegra(row) === 'percentual'" class="font-semibold text-ink">
                      {{ Number(row.percentual_boleto).toFixed(2) }}%
                    </span>
                    <span v-else class="italic text-ink-subtle"
                      v-tippy="'O valor sai da comissão informada pelo CV, não deste percentual.'">
                      não usado
                    </span>
                  </template>

                  <template #cell-max_dias_vencimento="{ row }">
                    <template v-if="row.max_dias_vencimento">
                      <span class="font-semibold text-ink">{{ row.max_dias_vencimento }}</span>
                      <span class="text-ink-subtle"> d</span>
                    </template>
                    <span v-else class="italic text-ink-subtle"
                      v-tippy="`Usa o padrão geral (${form.max_dias_vencimento ?? 10} dias)`">
                      padrão
                    </span>
                  </template>

                  <template #cell-active="{ row }">
                    <Badge :variant="row.active ? 'success' : 'neutral'" size="sm">
                      {{ row.active ? 'Sim' : 'Não' }}
                    </Badge>
                  </template>

                  <template #actions="{ row }">
                    <div class="flex items-center justify-end gap-1">
                      <IconButton icon="fas fa-pen-to-square" size="sm" label="Editar regra"
                        @click="openRuleModal(row)" />
                      <IconButton icon="fas fa-trash" size="sm" label="Excluir regra"
                        variant="danger" @click="confirmDeleteRule(row)" />
                    </div>
                  </template>
                </DataTable>
              </div>
            </div>
          </SettingsCard>

          <!-- Link de cartão (portal Userede) ──────────────────────────────
               A outra forma de cobrar o mesmo ato. Credenciais, tetos e teste de
               conexão têm salvamento próprio (store diferente), por isso o selo
               do cartão avisa e o botão Salvar mora lá dentro. -->
          <SettingsCard icon="fas fa-credit-card" icon-color="accent"
            title="Link de cartão (Userede)"
            badge="Salva neste cartão" badge-variant="neutral"
            description="A mesma cobrança do ato, paga no cartão.">
            <UseredeSettings />
          </SettingsCard>
        </section>

        <!-- ═══ GRUPO: Quando e como sai ═════════════════════════════════ -->
        <section class="space-y-3">
          <h2 class="px-1 text-micro font-mono uppercase tracking-wider text-ink-subtle">
            Quando e como sai
          </h2>

          <!-- Janela de emissão -->
          <SettingsCard icon="fas fa-clock"
            :icon-color="form.janela_ativa ? 'accent' : 'neutral'"
            title="Janela de emissão"
            :badge="form.janela_ativa ? janelaLabel : 'Sem janela'"
            :badge-variant="form.janela_ativa ? 'accent' : 'neutral'"
            :description="form.janela_ativa
              ? 'Horário de Brasília; fora dele o boleto fica agendado.'
              : 'Emite a qualquer hora, inclusive de madrugada.'">

            <div class="space-y-5 text-sm">
              <Switch v-model="form.janela_ativa"
                label="Só emitir dentro do horário comercial"
                description="Desligado, o webhook do CV vira boleto na hora que chegar." />

              <div v-if="form.janela_ativa" class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Input
                  v-model.number="form.janela_inicio_hora"
                  type="number" min="0" max="23"
                  label="Abre às (hora cheia)"
                  placeholder="Ex.: 6"
                  hint="Antes deste horário a emissão fica agendada." />
                <Input
                  v-model.number="form.janela_fim_hora"
                  type="number" min="1" max="24"
                  label="Fecha às (hora cheia)"
                  placeholder="Ex.: 23"
                  hint="A partir deste horário a emissão fica agendada para o dia seguinte." />
              </div>

              <div v-if="form.janela_ativa"
                class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5">
                <p class="flex items-start gap-2 text-xs text-ink-muted leading-relaxed">
                  <i class="fas fa-circle-info mt-0.5 text-accent shrink-0"></i>
                  <span>
                    Acionamento recebido fora do horário não vira erro: o registro fica como
                    <span class="font-semibold text-ink">Agendado</span> e o boleto sai sozinho na abertura
                    seguinte. Uma mensagem avisa o gestor na timeline da reserva, e a etapa no CV não é
                    alterada. Tentar de novo ou gerar pela tela continua funcionando a qualquer hora.
                  </span>
                </p>
              </div>
            </div>
          </SettingsCard>

          <!-- Envio do boleto ao cliente (e-mail + WhatsApp) -->
          <SettingsCard icon="fas fa-paper-plane"
            :icon-color="store.whatsappTemplate?.approved_locally ? 'success' : 'warning'"
            title="Envio do boleto ao cliente"
            :badge="store.whatsappTemplate?.approved_locally ? 'Template aprovado' : 'Template não aprovado'"
            :badge-variant="store.whatsappTemplate?.approved_locally ? 'success' : 'warning'"
            description="E-mail e WhatsApp para o titular, logo após a emissão.">

            <div class="space-y-5 text-sm">
              <div class="rounded-lg border border-line bg-surface-sunken px-3 py-2.5 space-y-2">
                <p class="flex items-start gap-2 text-xs text-ink-muted leading-relaxed">
                  <i class="fas fa-envelope mt-0.5 text-data-pos shrink-0"></i>
                  <span>
                    <strong class="font-semibold text-ink">E-mail:</strong> vai para o e-mail do titular
                    cadastrado no CV. O rodapé deixa claro que é canal só de envio, que não aceita respostas.
                  </span>
                </p>
                <p class="flex items-start gap-2 text-xs text-ink-muted leading-relaxed">
                  <i class="fab fa-whatsapp mt-0.5 text-data-pos shrink-0"></i>
                  <span>
                    <strong class="font-semibold text-ink">WhatsApp:</strong> se o cliente nos escreveu nas
                    últimas 24h, o boleto vai como documento gratuito (janela de serviço); fora disso usa o
                    template HSM
                    <code class="px-1 rounded bg-surface-raised border border-line font-mono text-micro text-accent">{{ store.whatsappTemplate?.name || 'boleto_caixa_ato_v2' }}</code>.
                    Cliente que responder recebe aviso automático de que é canal só de avisos.
                  </span>
                </p>
              </div>

              <!-- Estado do template na Meta -->
              <div class="flex flex-wrap items-center justify-between gap-3
                          rounded-lg border border-line bg-surface-sunken px-3 py-2.5">
                <p class="flex items-center gap-2 min-w-0 text-xs text-ink">
                  <i class="shrink-0"
                    :class="store.whatsappTemplate?.approved_locally
                      ? 'fas fa-circle-check text-data-pos'
                      : 'fas fa-circle-exclamation text-data-warn'"></i>
                  <span>
                    <template v-if="store.whatsappTemplate?.approved_locally">
                      Template <strong class="font-semibold">aprovado</strong> e pronto para uso.
                    </template>
                    <template v-else>
                      Template <strong class="font-semibold">não aprovado</strong>: envio por WhatsApp vai falhar.
                    </template>
                    <span v-if="store.whatsappTemplate?.status" class="text-ink-muted">
                      ({{ store.whatsappTemplate.status }})
                    </span>
                  </span>
                </p>
                <Button variant="ghost" size="sm"
                  :icon="store.whatsappTemplateLoading ? 'fas fa-spinner fa-spin' : 'fas fa-rotate'"
                  :disabled="store.whatsappTemplateLoading"
                  @click="handleSyncTemplate">
                  {{ store.whatsappTemplate?.approved_locally ? 'Re-sincronizar' : 'Criar na Meta' }}
                </Button>
              </div>

              <p v-if="store.whatsappTemplateMsg" class="flex items-start gap-1.5 text-xs text-data-pos">
                <i class="fas fa-check mt-0.5"></i><span>{{ store.whatsappTemplateMsg }}</span>
              </p>
              <p v-if="store.whatsappTemplateError" class="flex items-start gap-1.5 text-xs text-data-neg">
                <i class="fas fa-circle-exclamation mt-0.5"></i><span>{{ store.whatsappTemplateError }}</span>
              </p>
            </div>
          </SettingsCard>
        </section>

        <!-- ═══ GRUPO: Parcelas mensais ══════════════════════════════════ -->
        <section class="space-y-3">
          <h2 class="px-1 text-micro font-mono uppercase tracking-wider text-ink-subtle">
            Parcelas mensais
          </h2>
          <!-- Cartão com salvamento próprio; ver ParcelasSettings.vue. -->
          <ParcelasSettings />
        </section>

        <!-- ═══ GRUPO: Conexão ═══════════════════════════════════════════ -->
        <section class="space-y-3">
          <h2 class="px-1 text-micro font-mono uppercase tracking-wider text-ink-subtle">
            Conexão
          </h2>

          <!-- Ecobrança e webhook: as duas pontas do canal (banco e CV) -->
          <SettingsCard icon="fas fa-lock"
            :icon-color="store.settings?.eco_senha_set ? 'success' : 'warning'"
            title="Acesso à Caixa e webhook do CV"
            :badge="store.settings?.eco_senha_set ? 'Credenciais gravadas' : 'Senha não configurada'"
            :badge-variant="store.settings?.eco_senha_set ? 'success' : 'warning'"
            description="Por onde o boleto é registrado e por onde a reserva chega.">

            <div class="space-y-6">
              <!-- Credenciais Ecobrança -->
              <section class="space-y-3">
                <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
                  Credenciais Ecobrança
                </h3>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <Input
                    v-model="form.eco_usuario"
                    label="Usuário (CPF)"
                    placeholder="00000000000"
                    maxlength="11"
                    hint="Só os 11 dígitos, sem ponto nem traço." />
                  <Input
                    v-model="form.eco_senha"
                    type="password"
                    :label="store.settings?.eco_senha_set ? 'Senha (já configurada)' : 'Senha'"
                    placeholder="••••••"
                    maxlength="6"
                    hint="Deixe em branco para manter a senha atual." />
                </div>
              </section>

              <!-- Webhook -->
              <section class="space-y-3">
                <h3 class="text-micro font-mono uppercase tracking-wider text-ink-subtle">
                  Endereço do webhook
                </h3>
                <div class="flex flex-wrap items-center gap-2 rounded-lg border border-line
                            bg-surface-sunken px-3 py-2.5">
                  <code class="flex-1 min-w-0 break-all select-all font-mono text-xs text-accent">
                    {{ webhookUrl }}
                  </code>
                  <Button variant="ghost" size="sm" :icon="copied ? 'fas fa-check' : 'fas fa-copy'"
                    @click="copyWebhook">
                    {{ copied ? 'Copiado!' : 'Copiar' }}
                  </Button>
                </div>
                <p class="flex items-start gap-2 rounded-lg border border-data-warn/30
                          bg-data-warn/10 px-3 py-2.5 text-xs text-data-warn leading-relaxed">
                  <i class="fas fa-circle-info mt-0.5 shrink-0"></i>
                  <span>
                    No CV, configure o gatilho <strong class="font-semibold">Quando entrar na situação...</strong>
                    da funcionalidade <strong class="font-semibold">Reserva</strong> com este endereço.
                  </span>
                </p>
              </section>
            </div>
          </SettingsCard>

          <!-- Simulação de webhook (dev only) -->
          <SettingsCard v-if="isDev" icon="fas fa-flask" icon-color="warning"
            title="Simular webhook"
            badge="Dev only" badge-variant="warning"
            description="Dispara o processamento sem passar pelo CV.">

            <div class="space-y-4">
              <p class="text-xs text-ink-muted leading-relaxed">
                Dispara o processamento de boleto de uma reserva na mão, sem precisar configurar o CV.
                Bloqueado automaticamente em produção.
              </p>

              <div class="flex flex-col sm:flex-row sm:items-end gap-3">
                <Input
                  v-model="simulateIdreserva"
                  type="number"
                  label="ID da reserva"
                  placeholder="Ex.: 12345"
                  class="flex-1" />
                <Button variant="primary" class="!bg-data-warn hover:!bg-data-warn"
                  :icon="store.simulateLoading ? 'fas fa-spinner fa-spin' : 'fas fa-play'"
                  :disabled="store.simulateLoading || !simulateIdreserva"
                  @click="handleSimulate">
                  {{ store.simulateLoading ? 'Disparando...' : 'Disparar' }}
                </Button>
              </div>

              <p v-if="store.simulateSuccess" class="flex items-center gap-2 text-xs text-data-pos">
                <i class="fas fa-circle-check"></i>
                Webhook simulado. Acompanhe o progresso na aba Histórico.
              </p>
              <p v-if="store.simulateError" class="flex items-center gap-2 text-xs text-data-neg">
                <i class="fas fa-circle-xmark"></i>
                {{ store.simulateError }}
              </p>
            </div>
          </SettingsCard>
        </section>

        <p v-if="store.settingsError" class="flex items-center gap-1.5 px-1 text-xs text-data-neg">
          <i class="fas fa-circle-exclamation"></i>{{ store.settingsError }}
        </p>

        <!-- Regra de comissão. Era um modal montado na mão (backdrop e caixa
             próprios); virou o primitivo, que já traz tela cheia no celular,
             fecha no Esc e fica na camada certa. -->
        <Modal :open="ruleModal.open" size="md"
          :title="ruleModal.id ? 'Editar regra' : 'Nova regra de comissão'"
          subtitle="Como descontar, nesta reserva, a comissão que vem embutida na série do ato."
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
              <label class="block text-xs font-medium text-ink-muted mb-1.5">
                Empreendimento
              </label>
              <div class="px-3 py-2 rounded-lg border border-line bg-surface-sunken text-sm text-ink">
                <span class="font-mono tabular-nums text-accent">#{{ ruleModal.form.idempreendimento_cv }}</span>
                <span class="ml-2">{{ ruleModal.form.empreendimento_nome || '—' }}</span>
              </div>
              <p class="mt-1 text-xs text-ink-muted">O empreendimento não pode ser alterado em uma regra existente.</p>
            </div>

            <Select
              :model-value="ruleModal.form.modo || ''"
              :options="regraModoOptions"
              label="Cálculo do valor"
              hint="Deduzir do CV usa a conta da própria reserva e acompanha ato negociado e venda à vista, mas só vale onde a comissão cai toda no ato. O percentual fixo só fecha enquanto o ato for sempre a mesma fração do contrato."
              @update:model-value="v => ruleModal.form.modo = v || null" />

            <Input
              v-if="modoDaRegra(ruleModal.form) === 'percentual'"
              v-model.number="ruleModal.form.percentual_boleto"
              type="number"
              step="0.01"
              min="0"
              max="100"
              label="% do valor da série que vai para o boleto"
              placeholder="Ex.: 20"
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
              <label class="block text-xs font-medium text-ink-muted mb-1.5">
                Observação
              </label>
              <textarea v-model="ruleModal.form.observacao" rows="2"
                class="w-full px-3.5 py-2 rounded-lg text-sm bg-surface-raised text-ink
                       border border-line placeholder:text-ink-subtle shadow-inner-soft
                       transition-all duration-150 ease-out-expo outline-none
                       focus:border-accent-ring focus:ring-2 focus:ring-accent-ring/20"
                placeholder="Anotações internas (opcional)"></textarea>
            </div>

            <label class="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" v-model="ruleModal.form.active" />
              Regra ativa
            </label>

            <p v-if="ruleModal.error" class="text-xs text-data-neg">{{ ruleModal.error }}</p>

          </div>
          <template #footer>
            <Button variant="ghost" @click="closeRuleModal">Cancelar</Button>
            <Button icon="fas fa-save" :loading="ruleModal.saving" :disabled="ruleModal.saving"
              @click="saveRule">
              Salvar regra
            </Button>
          </template>
        </Modal>

        <!-- ── Alterações pendentes ─────────────────────────────────────────
             O botão "Salvar Configurações" ficava no fim de uma coluna de
             painéis abertos, longe do campo que se acabou de mexer, e salvava
             coisas que os outros cartões já tinham gravado sozinhos. Com os
             cartões fechados ele sumiria de vez, então virou a barra do rodapé:
             só aparece quando existe ajuste não salvo, diz quais são pelo nome,
             e some quando não há nada pendente. -->
        <ActionBar :count="alteracoesPendentes" unit="ajuste(s) não salvo(s)"
          :summary="resumoPendencias" clear-label="Descartar alterações"
          @clear="descartarAlteracoes">
          <Button variant="primary" size="sm" icon="fas fa-save"
            :loading="store.settingsLoading" :disabled="store.settingsLoading"
            @click="handleSave">
            {{ store.settingsLoading ? 'Salvando...' : 'Salvar' }}
          </Button>
        </ActionBar>
      </div>

      <!-- ── TAB: Histórico ───────────────────────────────────────────────────── -->
      <!-- ── TAB: Conciliação ─────────────────────────────────────────────────
           Confronto do que foi COBRADO aqui com o que foi LANÇADO no Sienge
           (documento AVC). Fica nesta tela porque é a mesma conversa do
           Histórico, só do outro lado do balcão. -->
      <Conciliacao v-if="activeTab === 'conciliacao'" />

      <!-- ── TAB: Parcelas (mensais depois do ato) ─────────────────────────── -->
      <Parcelas v-if="activeTab === 'parcelas'" />

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

            <template #cell-forma="{ row }">
              <Badge :variant="formaVariant(row.forma)" size="sm">
                <i :class="formaIcon(row.forma)" class="mr-1"></i>{{ formaLabel(row.forma) }}
              </Badge>
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
                <!-- A Caixa recusou o CEP do CV e o boleto saiu com o endereço da Menin. -->
                <span v-if="alertaCep(row)" class="text-micro text-data-warn" :title="alertaCep(row)">
                  <i class="fas fa-location-dot" style="font-size:9px"></i> CEP a corrigir no CV
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

            <template #cell-created_at="{ row }">{{ formatDateTime(row.created_at) }}</template>

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
import { useRoute, useRouter } from 'vue-router';
import { useBoletoStore } from '@/stores/Financeiro/BoletoCaixa/boletoStore';
import { useCan } from '@/composables/useCan';
import UseredeSettings from './components/UseredeSettings.vue';
import API_URL from '@/config/apiUrl';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Panel from '@/components/UI/Panel.vue';
import SettingsCard from '@/components/UI/SettingsCard.vue';
import Switch from '@/components/UI/Switch.vue';
import ActionBar from '@/components/UI/ActionBar.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import SegmentedControl from '@/components/UI/SegmentedControl.vue';
import Modal from '@/components/UI/Modal.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import StatRow from '@/components/UI/StatRow.vue';
import DataTable from '@/components/UI/DataTable.vue';
import Conciliacao from './components/Conciliacao.vue';
import Parcelas from './components/Parcelas.vue';
import ParcelasSettings from './components/ParcelasSettings.vue';
import CampoConfig from './components/CampoConfig.vue';
import ChipId from './components/ChipId.vue';
import IconButton from '@/components/UI/IconButton.vue';
import Skeleton from '@/components/UI/Skeleton.vue';
import Spinner from '@/components/UI/Spinner.vue';
import Favorite from '@/components/config/Favorite.vue';
import { useIncrementalList } from '@/composables/useIncrementalList';

// Componentes próprios desta tela
import BoletoFilters from './components/BoletoFilters.vue';
import BoletoDetailModal from './components/BoletoDetailModal.vue';
import { pedirConfirmacao } from '@/composables/useConfirm';

const store = useBoletoStore();
// Ações desta tela (lib/screenCapabilities.js no back): view/operate seguem a
// alçada, configure é admin. Ver composables/useCan.js.
const can = useCan('/financeiro/cobranca/ato');

// ── Tabs ──────────────────────────────────────────────────────────────────────
// Abre no Histórico. A aba "Configurações" só aparece para quem tem a ação
// `configure` — o backend cobra a mesma regra nas rotas de config. A aba
// "Conciliação" é leitura, então segue o `view` da própria tela.
const route = useRoute();
const router = useRouter();

const ABAS_VALIDAS = ['history', 'parcelas', 'conciliacao', 'settings'];
const activeTab = ref(ABAS_VALIDAS.includes(route.query.tab) ? route.query.tab : 'history');

const tabOptions = computed(() => {
  const base = [
    { value: 'history', label: 'Histórico', icon: 'fas fa-clock-rotate-left' },
    // As mensais depois do ato: plano por reserva, até o Sienge faturar.
    { value: 'parcelas', label: 'Parcelas', icon: 'fas fa-calendar-check' },
    { value: 'conciliacao', label: 'Conciliação', icon: 'fas fa-code-compare' },
  ];
  if (can('configure')) {
    base.push({ value: 'settings', label: 'Configurações', icon: 'fas fa-gear' });
  }
  return base;
});

/* A aba vive na URL (?tab=): é o que faz o link antigo
   /financeiro/recebimentos-ato cair direto na Conciliação, e o que deixa
   alguém mandar "olha a conciliação" com um link em vez de instruções.
   `replace` para não encher o botão voltar a cada clique de aba. */
watch(activeTab, (v) => {
  if (route.query.tab === v) return;
  router.replace({ query: { ...route.query, tab: v } });
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
  tolerancia_dias_uteis: 1,
  revalidacao_baixado_dias: 5,
  cv_situacoes_reserva_morta: [4],
  max_dias_vencimento: 10,
  valor_maximo: 300000,
  comissao_modo: 'nenhum',
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

/* Linha de resumo do cartão fechado "Séries e limites do ato". O cartão só vale
   como índice se o selo disser como está configurado sem precisar abrir. */
const resumoSeriesAto = computed(() => {
  const series = form.value.idserie_ra?.length
    ? `Série ${form.value.idserie_ra.join(', ')}`
    : 'Nenhuma série';
  return `${series} · teto ${valorMaximoLabel.value}`;
});

/* ── Alterações pendentes ─────────────────────────────────────────────────
   Só estes campos dependem do botão Salvar. Os outros cartões da aba (séries
   do ato, comissão, Userede, parcelas) gravam por conta própria, e entrariam
   aqui como pendência de trabalho já salvo. */
const CAMPOS_DO_SALVAR = [
  { key: 'eco_usuario', label: 'usuário do Ecobrança' },
  { key: 'eco_senha', label: 'senha do Ecobrança' },
  { key: 'active', label: 'cobrança do ato' },
  { key: 'janela_ativa', label: 'janela de emissão' },
  { key: 'janela_inicio_hora', label: 'abertura da janela' },
  { key: 'janela_fim_hora', label: 'fechamento da janela' },
];

const baseDoSalvar = ref(null);

function fotografarSalvar() {
  const foto = {};
  for (const { key } of CAMPOS_DO_SALVAR) foto[key] = form.value[key];
  baseDoSalvar.value = foto;
}

const pendencias = computed(() => {
  if (!baseDoSalvar.value) return [];
  return CAMPOS_DO_SALVAR.filter(({ key }) => form.value[key] !== baseDoSalvar.value[key]);
});

const alteracoesPendentes = computed(() => pendencias.value.length);

const resumoPendencias = computed(() => pendencias.value.map(p => p.label).join(' · '));

async function descartarAlteracoes() {
  if (!baseDoSalvar.value) return;
  const ok = await pedirConfirmacao({
    title: 'Descartar os ajustes não salvos?',
    consequence: `Os campos voltam como estavam antes: ${resumoPendencias.value}. Nada do que já foi salvo muda.`,
    confirmLabel: 'Descartar',
    tone: 'danger',
  });
  if (!ok) return;
  Object.assign(form.value, baseDoSalvar.value);
}

// ── Modo edição do card "Configurações do CV" ─────────────────────────────────
// Por padrão o card mostra os valores em modo leitura. Botão "Editar" abre
// inputs; "Cancelar" reverte pro snapshot; "Salvar" persiste e fecha.
const editingCv = ref(false);
let cvSnapshot = null;

function snapshotCvFields() {
  return {
    idserie_ra: Array.isArray(form.value.idserie_ra) ? [...form.value.idserie_ra] : [],
    cv_idtipo_documento: form.value.cv_idtipo_documento,
    tolerancia_dias_uteis: form.value.tolerancia_dias_uteis,
    revalidacao_baixado_dias: form.value.revalidacao_baixado_dias,
    cv_situacoes_reserva_morta: [...(form.value.cv_situacoes_reserva_morta || [])],
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

// Os campos de lista de ids vivem no ChipListField (add/remove e validacao).

async function handleSave() {
  const payload = { ...form.value };
  await store.saveSettings(payload);
  // Salvou: a foto vira a nova referência e a barra do rodapé se recolhe.
  if (!store.settingsError) fotografarSalvar();
}

// ── Colunas ordenáveis do histórico ───────────────────────────────────────────
/* Prioridade decide a ORDEM de aparição no estreito, nunca o que existe.
   Ordenação é `manual-sort`: a tabela recebe a lista já fatiada pelo scroll. */
const COLUNAS = [
  { key: 'idreserva', label: '#Reserva', priority: 1, sortable: true, width: '8rem' },
  // Boleto ou cartão: a mesma cobrança do ato, formas diferentes.
  { key: 'forma', label: 'Forma', priority: 2, sortable: true, width: '7rem' },
  { key: 'titular_nome', label: 'Titular / Empreendimento', priority: 1, sortable: true },
  { key: 'status', label: 'Emissão', priority: 1, sortable: true, width: '10rem' },
  { key: 'valor', label: 'Valor', priority: 2, numeric: true, sortable: true, width: '8rem' },
  { key: 'payment_status', label: 'Pagamento', priority: 2, sortable: true, width: '8rem' },
  { key: 'vencimento', label: 'Vencimento', priority: 2, sortable: true, width: '7rem' },
  { key: 'cv_situacao', label: 'Etapa no CV', priority: 3, truncate: false },
  { key: 'created_at', label: 'Emitido em', priority: 3, sortable: true, width: '9rem' },
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
  skipped: { label: 'ignoradas', teste: (r) => r.status === 'skipped' || r.ignorado },
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

/* Forma de pagamento. Os registros antigos vêm sem o campo porque nasceram
   quando só existia boleto - tratamos a ausência como boleto. */
const formaLabel = (f) => ({ boleto: 'Boleto', cartao: 'Cartão' }[f] || 'Boleto');
const formaIcon = (f) => (f === 'cartao' ? 'fas fa-credit-card' : 'fas fa-barcode');
const formaVariant = (f) => (f === 'cartao' ? 'info' : 'neutral');

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
  /* A tela lê o histórico UNIFICADO (/cobranca-ato), cujos baldes vêm em
     português. Denominador dos percentuais é `emitidos`, igual ao endpoint
     antigo — assim o número na tela não muda de significado. */
  const b = (k) => st[k] || { qty: 0, valor: 0 };
  const pct = (k) => (st.emitidos?.qty ? Math.round((b(k).qty / st.emitidos.qty) * 1000) / 10 : 0);
  return [
    { key: 'emitidos', label: 'Emitidos', value: b('emitidos').qty,
      hint: formatCurrency(b('emitidos').valor), icon: 'fas fa-barcode', tone: 'accent',
      tooltip: 'Clique para ver todos os registros' },
    { key: 'paid', label: 'Pagos', value: b('pagos').qty,
      hint: `${pct('pagos')}% · ${formatCurrency(b('pagos').valor)}`,
      icon: 'fas fa-circle-check', tone: 'pos', tooltip: 'Clique para ver só os pagos' },
    { key: 'pending', label: 'Pendentes', value: b('pendentes').qty,
      hint: `${pct('pendentes')}% · ${formatCurrency(b('pendentes').valor)}`,
      icon: 'fas fa-clock', tone: 2, tooltip: 'Clique para ver só os pendentes' },
    { key: 'cancelled', label: 'Baixados', value: b('cancelados').qty,
      hint: `${pct('cancelados')}% evasão · ${formatCurrency(b('cancelados').valor)}`,
      icon: 'fas fa-ban', tone: 'neutral',
      tooltip: 'Boleto vencido sem pagamento, com a reserva viva. Esta é a evasão de verdade' },
    { key: 'error', label: 'Com erro', value: b('erros').qty,
      hint: formatCurrency(b('erros').valor),
      icon: 'fas fa-triangle-exclamation', tone: 'neg',
      tooltip: 'Reservas que hoje estão sem boleto por falha. Clique para ver só elas' },
    { key: 'skipped', label: 'Ignoradas', value: b('ignorados').qty,
      hint: b('ignorados').valor ? formatCurrency(b('ignorados').valor) : 'sem série de Ato',
      icon: 'fas fa-user-slash', tone: 'neutral',
      tooltip: 'Reserva sem série de Ato: a cobrança nem chegou a sair. Não é evasão nem erro a resolver' },
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
/* Aviso de CEP: a Caixa recusou o CEP do CV e o boleto saiu com o endereço da Menin. */
function alertaCep(row) {
  let w = row?.warnings;
  if (typeof w === 'string') { try { w = JSON.parse(w); } catch { w = null; } }
  return Array.isArray(w) ? (w.find(x => x?.etapa === 'cep_contingencia')?.erro || null) : null;
}

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
// Duas formas de achar quanto da série é da incorporadora: a comissão que o CV
// informa na reserva (exata, por venda) ou um percentual fixo do empreendimento
// (só fecha enquanto o ato for sempre a mesma fração do contrato).
const comissaoModoOptions = [
  { value: 'nenhum', label: 'Emitir o valor cheio da série' },
  { value: 'cv', label: 'Deduzir a comissão informada pelo CV' },
];

/* Descrição do cartão fechado: o padrão geral é o que vale para quase todo
   empreendimento, então é o que precisa aparecer sem abrir. Rótulo próprio e
   curto - o do Select é uma frase, e cabe no campo, não no selo do cartão
   (que trunca em uma linha). E nada de toLowerCase aqui: come o "CV". */
const comissaoModoLabel = computed(() => (form.value.comissao_modo === 'cv'
  ? 'Padrão: descontar a comissão do CV'
  : 'Padrão: valor cheio da série'));

const regraModoOptions = [
  { value: '', label: 'Usar o padrão geral' },
  { value: 'cv', label: 'Deduzir a comissão informada pelo CV' },
  { value: 'percentual', label: 'Percentual fixo da série' },
];

// Regra sem modo escolhido: percentual gravado continua mandando (era assim
// antes do campo existir); sem percentual, herda o padrão geral.
const modoDaRegra = (rule) => {
  if (rule?.modo) return rule.modo;
  const pct = Number(rule?.percentual_boleto);
  if (Number.isFinite(pct) && pct >= 0 && pct < 100) return 'percentual';
  return form.value.comissao_modo || 'nenhum';
};

const modoLabel = (rule) => ({
  cv: 'Comissão do CV',
  percentual: 'Percentual fixo',
  nenhum: 'Valor cheio',
}[modoDaRegra(rule)] || 'Valor cheio');

// Herda de verdade quem não tem modo escolhido nem percentual gravado.
const modoHerdado = (rule) => {
  if (rule?.modo) return false;
  const pct = Number(rule?.percentual_boleto);
  return !(Number.isFinite(pct) && pct >= 0 && pct < 100);
};

/* Colunas da tabela de regras de comissão.

   `priority` decide a ORDEM no celular, não o que existe: a regra é "deste
   empreendimento, cobra assim", então empreendimento e cálculo abrem o cartão.
   Observação e o selo de ativo descem para "Ver detalhes" - são o que menos se
   consulta e o que mais ocupa largura.

   Sem ordenação: a lista é curta e vem na ordem que o servidor devolve. */
/* A lista chega inteira, então quem ordena é a própria tabela. `sortValue`
   onde a célula é montada no slot e o valor cru não serve para comparar. */
const COLUNAS_REGRAS = [
  { key: 'idempreendimento_cv', label: 'ID emp.', priority: 2, numeric: true, sortable: true, width: '88px' },
  { key: 'empreendimento_nome', label: 'Empreendimento', priority: 1, sortable: true,
    format: (v) => v || '-' },
  { key: '_modo', label: 'Cálculo', priority: 1, sortable: true, width: '170px',
    sortValue: (r) => modoLabel(r) },
  { key: 'percentual_boleto', label: '% boleto', priority: 2, numeric: true, sortable: true, width: '104px',
    sortValue: (r) => (modoDaRegra(r) === 'percentual' ? Number(r.percentual_boleto) || 0 : -1) },
  { key: 'max_dias_vencimento', label: 'Máx. dias', priority: 2, align: 'center', sortable: true, width: '96px',
    sortValue: (r) => Number(r.max_dias_vencimento) || 0 },
  { key: 'active', label: 'Ativo', priority: 3, align: 'center', sortable: true, width: '80px' },
  { key: 'observacao', label: 'Observação', priority: 3, truncate: false, sortable: true,
    format: (v) => v || '-' },
];

const salvandoComissaoModo = ref(false);

async function onChangeComissaoModo(valor) {
  if (!valor || valor === form.value.comissao_modo) return;
  const anterior = form.value.comissao_modo;
  const alvo = comissaoModoOptions.find(o => o.value === valor)?.label || valor;
  const quantas = store.rules.filter(modoHerdado).length;
  const ok = await pedirConfirmacao({
    title: `Mudar o cálculo padrão para "${alvo}"?`,
    consequence: valor === 'cv'
      ? `As próximas cobranças de todo empreendimento sem regra própria passam a descontar a comissão que o CV informa em cada reserva${quantas ? `, mais ${quantas} regra(s) que herdam o padrão` : ''}. As já emitidas continuam como estão.`
      : `As próximas cobranças de todo empreendimento sem regra própria passam a sair pelo valor cheio da série, com a comissão dentro${quantas ? `, mais ${quantas} regra(s) que herdam o padrão` : ''}. As já emitidas continuam como estão.`,
    confirmLabel: 'Mudar o cálculo',
  });
  if (!ok) return;
  form.value.comissao_modo = valor;
  salvandoComissaoModo.value = true;
  await store.saveSettings({ comissao_modo: valor });
  salvandoComissaoModo.value = false;
  if (store.settingsError) form.value.comissao_modo = anterior;
}

const ruleModal = ref({
  open: false,
  id: null,
  saving: false,
  error: '',
  form: { idempreendimento_cv: null, empreendimento_nome: '', modo: null, percentual_boleto: 100, max_dias_vencimento: null, observacao: '', active: true },
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
        modo: rule.modo || null,
        percentual_boleto: Number(rule.percentual_boleto),
        max_dias_vencimento: rule.max_dias_vencimento ?? null,
        observacao: rule.observacao || '',
        active: rule.active,
      },
    };
  } else {
    ruleModal.value = {
      open: true, id: null, saving: false, error: '',
      form: { idempreendimento_cv: null, empreendimento_nome: '', modo: null, percentual_boleto: 100, max_dias_vencimento: null, observacao: '', active: true },
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
  if (modoDaRegra(f) === 'percentual'
    && (f.percentual_boleto == null || f.percentual_boleto < 0 || f.percentual_boleto > 100)) {
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
  if (!await pedirConfirmacao({
    title: `Excluir a regra de ${rule.empreendimento_nome || rule.idempreendimento_cv}?`,
    consequence: 'As cobrancas ja emitidas continuam como estao. As proximas deste empreendimento passam a usar o calculo padrao da tela.',
    confirmLabel: 'Excluir regra',
  })) return;
  await store.deleteComissionRule(rule.id);
}

async function handleSyncTemplate() {
  const isCreate = !store.whatsappTemplate?.approved_locally;
  if (isCreate) {
    const ok = await pedirConfirmacao({
      title: 'Enviar o template "boleto_caixa_ato_v1" para a Meta?',
      consequence: 'Enquanto a Meta nao aprovar, todo envio de boleto por WhatsApp falha.',
      hint: 'A revisao da Meta leva de alguns minutos a algumas horas.',
      tone: 'accent',
      confirmLabel: 'Enviar para revisao',
    });
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
      form.value.tolerancia_dias_uteis = store.settings.tolerancia_dias_uteis ?? 1;
      form.value.revalidacao_baixado_dias = store.settings.revalidacao_baixado_dias ?? 5;
      form.value.cv_situacoes_reserva_morta = [...(store.settings.cv_situacoes_reserva_morta || [4])];
      form.value.max_dias_vencimento = store.settings.max_dias_vencimento ?? 10;
      form.value.valor_maximo = store.settings.valor_maximo != null ? Number(store.settings.valor_maximo) : null;
      form.value.comissao_modo = store.settings.comissao_modo || 'nenhum';
      form.value.janela_ativa = store.settings.janela_ativa ?? true;
      form.value.janela_inicio_hora = store.settings.janela_inicio_hora ?? 6;
      form.value.janela_fim_hora = store.settings.janela_fim_hora ?? 23;
      form.value.active = store.settings.active ?? false;
    }
    // Referência da barra de alterações pendentes: o que está gravado hoje.
    fotografarSalvar();
    await store.fetchComissionRules();
    await store.fetchWhatsappTemplate();
  }
  // fetchHistory/fetchStats são disparados pelo BoletoFilters.onMounted via
  // emit('filter-changed') → onFiltersChanged() (com os defaults de 30 dias).
});
</script>

