<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="lg">
      <PageHeader
        subtitle="Acompanhe as entregas, melhorias e correções publicadas no sistema."
        eyebrow="Sobre o Office"
        icon="fas fa-code-branch">
        <template #title>Atualizações</template>
        <template #actions>
          <PageHelp
            storage-key="sobre-docs"
            title="Como usar as Atualizações"
            intro="Esta é a linha do tempo do Office: cada entrega publicada, com o que mudou e em qual área."
            :steps="[
              { title: 'Atualizações futuras', text: 'A primeira faixa é o plano de desenvolvimento: as frentes que vêm a seguir, sem data porque a variável é o tempo dedicado, não a tecnologia. É o mesmo conteúdo do O que vem a seguir da Visão Executiva.' },
              { title: 'Filtrar', text: 'Use a busca e os filtros de tipo, categoria e período para achar uma entrega específica.' },
              { title: 'Abrir uma versão', text: 'Clique em uma atualização para ver os itens de melhoria e correção daquela publicação.' },
              { title: 'Ver o conjunto', text: 'Mapa do Sistema mostra o que existe hoje e a Visão Executiva explica o resultado de cada frente.' },
            ]"
            :tips="[
              'O que aparece no histórico é o registro do que foi ao ar, na ordem em que foi publicado.',
              'Versão marcada com Breaking change mudou algum número ou comportamento que já estava em uso: vale ler antes de comparar com um relatório antigo.',
            ]" />
        </template>
      </PageHeader>

      <SobreNav />

      <!-- Números de topo: mesmo componente do Mapa e da Visão Executiva, para as
           três telas do Sobre abrirem com a mesma leitura -->
      <HighlightCards :items="highlights" class="mb-6" />

      <!-- Plano de desenvolvimento. Fica FORA da grade do histórico de propósito:
           os filtros da lateral valem para o que já foi publicado, não para o que
           ainda vem. Cartão de altura fixa, com o texto longo indo pro modal. -->
      <section class="mb-8">
        <header class="flex items-center gap-3 mb-4 pb-2 border-b border-line">
          <span class="grid place-items-center h-9 w-9 rounded-xl bg-accent-soft text-accent
                       border border-accent/20 shrink-0">
            <i class="fas fa-road"></i>
          </span>
          <div class="min-w-0">
            <h2 class="text-base sm:text-xl font-semibold text-ink tracking-tight">
              Atualizações futuras
            </h2>
            <p class="hidden sm:block text-micro text-ink-subtle leading-snug">
              Próximas inovações em andamento
            </p>
          </div>
          <Badge variant="accent" size="sm" class="ml-auto shrink-0">
            {{ roadmap.length }} frentes
          </Badge>
        </header>

        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <Surface v-for="milestone in visibleRoadmap" :key="milestone.version"
            variant="raised" padding="none"
            class="h-full flex flex-col hover:border-accent/30 hover:shadow-elevated">

            <div class="p-4 flex flex-col gap-2 grow">
              <div class="flex items-center gap-2">
                <span class="font-mono text-micro text-ink-subtle">{{ milestone.version }}</span>
                <span v-if="milestone.date" class="ml-auto text-micro text-ink-subtle font-mono">
                  {{ formatDate(milestone.date) }}
                </span>
                <Badge v-else variant="warning" size="sm" class="ml-auto shrink-0">Em programação</Badge>
              </div>

              <h3 class="text-sm font-semibold text-ink leading-snug">{{ milestone.title }}</h3>

              <!-- min-h de 3 linhas: sem isso o valor de economia dança de altura
                   entre um cartão e outro da mesma linha. -->
              <p class="text-[13px] text-ink-muted leading-relaxed line-clamp-3 sm:min-h-[4.875em]">
                {{ milestone.summary }}
              </p>

              <p v-if="milestone.impact"
                 class="text-sm font-semibold text-accent tabular-nums tracking-tight">
                {{ milestone.impact }}
                <span class="text-micro font-normal text-ink-subtle">de economia estimada</span>
              </p>
            </div>

            <!-- Rodapé ancorado embaixo: com mt-auto os cartões terminam alinhados
                 mesmo com resumos de tamanhos diferentes. -->
            <div class="mt-auto px-4 pb-3 pt-2 border-t border-line flex items-center gap-2 flex-wrap">
              <span v-for="feature in milestone.features" :key="feature"
                class="text-micro px-2 py-0.5 rounded-full bg-surface-sunken text-ink-muted border border-line">
                {{ feature }}
              </span>
              <button type="button" @click="selectedMilestone = milestone"
                class="ml-auto shrink-0 text-accent hover:underline text-xs font-medium
                       inline-flex items-center gap-1 min-h-[32px]">
                Detalhes
                <i class="fas fa-arrow-right text-[9px]"></i>
              </button>
            </div>
          </Surface>
        </div>

        <button v-if="roadmap.length > ROADMAP_PREVIEW" type="button"
                @click="showAllRoadmap = !showAllRoadmap"
                class="w-full mt-3 min-h-[40px] rounded-lg border border-line bg-surface-raised
                       text-sm text-ink-muted hover:text-ink hover:border-line-strong
                       transition-all duration-150 ease-out-expo">
          {{ showAllRoadmap
            ? 'Mostrar menos'
            : `Ver as outras ${roadmap.length - ROADMAP_PREVIEW} frentes` }}
        </button>
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">

        <!-- Filtros. No celular os três seletores ficam lado a lado: empilhados,
             viravam uma parede de controles antes do primeiro item da lista. -->
        <aside class="lg:sticky lg:top-4 lg:self-start space-y-3">
          <p class="hidden lg:block text-micro font-mono uppercase tracking-wider text-ink-subtle">
            Filtrar
          </p>

          <Input
            v-model="searchQuery"
            placeholder="Buscar atualizações..."
            icon-left="fas fa-magnifying-glass" />

          <div class="grid grid-cols-3 gap-2 lg:grid-cols-1 lg:gap-3">
            <Select v-model="filters.type"     label="Tipo"      :options="typeOptions" />
            <Select v-model="filters.category" label="Categoria" :options="categoryOptions" />
            <Select v-model="filters.period"   label="Período"   :options="periodOptions" />
          </div>

          <button v-if="hasFilters" type="button" @click="clearFilters"
                  class="w-full min-h-[40px] rounded-lg border border-line bg-surface-raised
                         text-sm text-ink-muted hover:text-ink hover:border-line-strong
                         transition-all duration-150 ease-out-expo">
            Limpar filtros
          </button>
        </aside>

        <!-- Conteúdo Principal -->
        <main class="min-w-0">

          <!-- Lista de Releases -->
          <section>
            <header class="flex items-center gap-3 mb-4 pb-2 border-b border-line">
              <span class="grid place-items-center h-9 w-9 rounded-xl bg-accent-soft text-accent
                           border border-accent/20 shrink-0">
                <i class="fas fa-clock-rotate-left"></i>
              </span>
              <h2 class="text-base sm:text-xl font-semibold text-ink tracking-tight">
                Histórico
              </h2>
              <span class="ml-auto shrink-0 text-micro text-ink-subtle font-mono tabular-nums">
                {{ filteredReleases.length }} de {{ releases.length }}
              </span>
            </header>

            <!-- Cards de Release -->
            <div class="space-y-4">
              <Surface v-for="release in paginatedReleases" :key="release.version"
                variant="raised"
                padding="none"
                class="overflow-hidden hover:border-accent/30 hover:shadow-elevated">

                <!-- Header do Release -->
                <div class="px-5 sm:px-6 py-3.5 border-b border-line bg-surface-sunken/40 flex items-center justify-between flex-wrap gap-2">
                  <div class="flex items-center gap-3 flex-wrap">
                    <Badge :variant="getReleaseTypeVariant(release.type)" size="sm">
                      {{ getReleaseTypeLabel(release.type) }}
                    </Badge>
                    <h4 class="text-base font-semibold text-ink font-mono">{{ release.version }}</h4>
                  </div>
                  <div class="text-right">
                    <p class="text-xs text-ink-muted">{{ formatDate(release.date) }}</p>
                    <p class="text-micro text-ink-subtle font-mono">{{ getRelativeTime(release.date) }}</p>
                  </div>
                </div>

                <!-- Conteúdo do Release -->
                <div class="p-5 sm:p-6">
                  <p v-if="release.description" class="text-sm text-ink-muted mb-4 leading-relaxed">
                    {{ release.description }}
                  </p>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

                    <!-- Novas Funcionalidades -->
                    <div v-if="release.features?.length">
                      <h5 class="text-xs font-mono uppercase tracking-wider text-ink-subtle mb-2 flex items-center gap-1.5">
                        <i class="fas fa-sparkles text-data-pos text-[10px]"></i>
                        Novas funcionalidades
                      </h5>
                      <ul class="space-y-2">
                        <li v-for="feature in release.features" :key="feature.id"
                          class="text-sm text-ink-muted flex items-start gap-2">
                          <i class="fas fa-circle text-data-pos mt-1.5 text-[6px] shrink-0"></i>
                          <span><strong class="text-ink">{{ feature.title }}:</strong> {{ feature.description }}</span>
                        </li>
                      </ul>
                    </div>

                    <!-- Melhorias -->
                    <div v-if="release.improvements?.length">
                      <h5 class="text-xs font-mono uppercase tracking-wider text-ink-subtle mb-2 flex items-center gap-1.5">
                        <i class="fas fa-arrow-up text-accent text-[10px]"></i>
                        Melhorias
                      </h5>
                      <ul class="space-y-2">
                        <li v-for="improvement in release.improvements" :key="improvement.id"
                          class="text-sm text-ink-muted flex items-start gap-2">
                          <i class="fas fa-circle text-accent mt-1.5 text-[6px] shrink-0"></i>
                          <span><strong class="text-ink">{{ improvement.category }}:</strong> {{ improvement.description }}</span>
                        </li>
                      </ul>
                    </div>

                    <!-- Correções -->
                    <div v-if="release.fixes?.length">
                      <h5 class="text-xs font-mono uppercase tracking-wider text-ink-subtle mb-2 flex items-center gap-1.5">
                        <i class="fas fa-bug-slash text-data-warn text-[10px]"></i>
                        Correções
                      </h5>
                      <ul class="space-y-2">
                        <li v-for="fix in release.fixes" :key="fix.id"
                          class="text-sm text-ink-muted flex items-start gap-2">
                          <i class="fas fa-circle text-data-warn mt-1.5 text-[6px] shrink-0"></i>
                          <span>{{ fix.description }}</span>
                        </li>
                      </ul>
                    </div>

                    <!-- Breaking Changes -->
                    <div v-if="release.breakingChanges?.length">
                      <h5 class="text-xs font-mono uppercase tracking-wider text-data-neg mb-2 flex items-center gap-1.5">
                        <i class="fas fa-triangle-exclamation text-data-neg text-[10px]"></i>
                        Breaking changes
                      </h5>
                      <ul class="space-y-2">
                        <li v-for="change in release.breakingChanges" :key="change.id"
                          class="text-sm rounded-lg bg-data-neg/10 border border-data-neg/20 p-3">
                          <div class="text-data-neg">
                            <strong>{{ change.component }}:</strong> {{ change.description }}
                          </div>
                          <div class="text-data-neg text-xs mt-1">
                            <strong>Ação:</strong> {{ change.migrationGuide }}
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <!-- Ações -->
                  <div class="flex items-center justify-between mt-5 pt-4 border-t border-line gap-3 flex-wrap">
                    <button @click="showDetails(release)"
                      class="text-accent hover:underline text-sm font-medium flex items-center gap-1.5">
                      Ver Detalhes
                      <i class="fas fa-arrow-right text-[10px]"></i>
                    </button>
                    <div class="flex flex-wrap gap-1.5">
                      <span v-for="category in release.categories" :key="category"
                        class="text-micro px-2 py-0.5 rounded-full font-medium border"
                        :class="getCategoryClass(category)">
                        {{ getCategoryLabel(category) }}
                      </span>
                    </div>
                  </div>
                </div>
              </Surface>

              <!-- Empty filtered -->
              <EmptyState v-if="!filteredReleases.length"
                icon="fas fa-folder-open"
                title="Nenhuma atualização"
                description="Nenhuma atualização corresponde aos filtros aplicados." />
            </div>

            <!-- Paginação -->
            <div v-if="totalPages > 1" class="flex justify-center mt-6 gap-1.5 flex-wrap">
              <button v-for="page in totalPages" :key="page" type="button"
                @click="currentPage = page"
                class="h-10 min-w-10 px-3 text-sm rounded-lg border tabular-nums
                       transition-all duration-150 ease-out-expo"
                :class="currentPage === page
                  ? 'bg-accent-soft text-accent border-accent/30 font-medium'
                  : 'bg-surface-raised text-ink-muted border-line hover:text-ink hover:border-line-strong'">
                {{ page }}
              </button>
            </div>
          </section>
        </main>
      </div>
    </PageContainer>

    <!-- Detalhe de uma frente do plano -->
    <Modal :open="!!selectedMilestone"
      size="md"
      :title="selectedMilestone?.title || ''"
      :subtitle="selectedMilestone ? `${selectedMilestone.version} · sem data definida` : ''"
      @close="selectedMilestone = null">

      <div v-if="selectedMilestone" class="space-y-4">
        <p class="text-sm text-ink font-medium leading-relaxed">{{ selectedMilestone.summary }}</p>

        <div v-if="selectedMilestone.impact"
             class="rounded-xl border border-accent/20 bg-accent-soft/40 p-4">
          <p class="text-xl font-semibold text-accent tracking-tight tabular-nums">
            {{ selectedMilestone.impact }}
          </p>
          <p class="text-xs text-ink-muted mt-0.5">
            Economia estimada, comparada ao custo da ferramenta usada hoje
          </p>
        </div>

        <p class="text-sm text-ink-muted leading-relaxed">{{ selectedMilestone.description }}</p>

        <div class="flex flex-wrap gap-1.5 pt-1">
          <span v-for="feature in selectedMilestone.features" :key="feature"
            class="text-micro px-2 py-0.5 rounded-full bg-surface-sunken text-ink-muted border border-line">
            {{ feature }}
          </span>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="selectedMilestone = null">Fechar</Button>
      </template>
    </Modal>

    <!-- Modal de Detalhes -->
    <Modal :open="!!selectedRelease"
      size="xl"
      :title="`${selectedRelease?.version} — Detalhes`"
      :subtitle="selectedRelease ? formatDate(selectedRelease.date) : ''"
      @close="closeModal">

      <div v-if="selectedRelease" class="grid grid-cols-1"
        :class="{ 'lg:grid-cols-2 gap-6': selectedRelease.features?.length && (selectedRelease.improvements?.length || selectedRelease.fixes?.length) }">

        <!-- Coluna Esquerda -->
        <div class="space-y-5">

          <!-- Funcionalidades Detalhadas -->
          <div v-if="selectedRelease.features?.length">
            <h4 class="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <i class="fas fa-sparkles text-data-pos"></i>
              Novas Funcionalidades
            </h4>
            <div class="space-y-3">
              <div v-for="feature in selectedRelease.features" :key="feature.id"
                class="rounded-xl bg-data-pos/10 border border-data-pos/20 p-4">
                <h5 class="font-medium text-data-pos mb-1.5 text-sm">
                  {{ feature.title }}
                </h5>
                <p class="text-data-pos  text-xs leading-relaxed">
                  {{ feature.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- Problemas Conhecidos -->
          <div v-if="selectedRelease.knownIssues?.length">
            <h4 class="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <i class="fas fa-triangle-exclamation text-data-warn"></i>
              Problemas Conhecidos
            </h4>
            <div class="space-y-3">
              <div v-for="issue in selectedRelease.knownIssues" :key="issue.id"
                class="rounded-xl bg-data-warn/10 border border-data-warn/20 p-4">
                <p class="text-data-warn text-xs mb-2 leading-relaxed">
                  {{ issue.description }}
                </p>
                <div v-if="issue.workaround" class="text-data-warn  text-xs">
                  <strong>Solução temporária:</strong> {{ issue.workaround }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Coluna Direita -->
        <div class="space-y-5">

          <!-- Melhorias e Correções -->
          <div v-if="selectedRelease.improvements?.length || selectedRelease.fixes?.length">
            <h4 class="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <i class="fas fa-screwdriver-wrench text-accent"></i>
              Melhorias & Correções
            </h4>

            <div v-if="selectedRelease.improvements?.length" class="mb-4 space-y-2">
              <h5 class="text-xs font-mono uppercase tracking-wider text-ink-subtle">Melhorias</h5>
              <ul class="space-y-2">
                <li v-for="improvement in selectedRelease.improvements" :key="improvement.id"
                  class="rounded-lg bg-accent/10 border border-accent/20 p-3 text-xs">
                  <strong class="text-accent">{{ improvement.category }}:</strong>
                  <span class="text-accent  ml-1">{{ improvement.description }}</span>
                </li>
              </ul>
            </div>

            <div v-if="selectedRelease.fixes?.length" class="space-y-2">
              <h5 class="text-xs font-mono uppercase tracking-wider text-ink-subtle">Correções</h5>
              <ul class="space-y-2">
                <li v-for="fix in selectedRelease.fixes" :key="fix.id"
                  class="rounded-lg bg-data-warn/10 border border-data-warn/20 p-3 text-xs text-data-warn">
                  {{ fix.description }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button variant="ghost" @click="closeModal">Fechar</Button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { releases } from '@/config/changelog';
import { ref, computed, watch } from 'vue';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import Surface from '@/components/UI/Surface.vue';
import Modal from '@/components/UI/Modal.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import Input from '@/components/UI/Input.vue';
import Select from '@/components/UI/Select.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import SobreNav from '@/components/Sobre/SobreNav.vue';
import HighlightCards from '@/components/Sobre/HighlightCards.vue';

// ── State ─────────────────────────────────────────────────────────────────────
const searchQuery = ref('');
const selectedRelease = ref(null);
const selectedMilestone = ref(null);
const currentPage = ref(1);
const itemsPerPage = 6;

// Plano completo tem 11 frentes: mostrar todas de cara empurraria o histórico
// pra fora da tela. Duas linhas no desktop e o resto sob demanda.
const ROADMAP_PREVIEW = 3;
const showAllRoadmap = ref(false);

const filters = ref({
  type: 'all',
  category: 'all',
  period: 'all',
});

// ── Select options ────────────────────────────────────────────────────────────
const typeOptions = [
  { value: 'all',    label: 'Todos' },
  { value: 'major',  label: 'Major' },
  { value: 'minor',  label: 'Minor' },
  { value: 'patch',  label: 'Patch' },
  { value: 'hotfix', label: 'Hotfix' },
];

const categoryOptions = [
  { value: 'all',      label: 'Todas' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend',  label: 'Backend' },
  { value: 'api',      label: 'API' },
  { value: 'mobile',   label: 'Mobile' },
  { value: 'security', label: 'Segurança' },
];

const periodOptions = [
  { value: 'all',     label: 'Todo período' },
  { value: 'week',    label: 'Última semana' },
  { value: 'month',   label: 'Último mês' },
  { value: 'quarter', label: 'Último trimestre' },
];

// ── Roadmap ───────────────────────────────────────────────────────────────────
// ── Atualizações futuras ──────────────────────────────────────────────────────
// É o "O que vem a seguir" da Visão Executiva em formato de entrega. Sem data:
// a variável não é a tecnologia, é o tempo dedicado. Cada frente se apoia em
// infraestrutura que o Office já opera, então nenhuma começa do zero.
// Ao concluir uma frente, mover o item daqui para `releases` com a data real.
const roadmap = [
  {
    version: 'v4.0.0',
    date: null,
    title: 'Atendimento de leads por IA',
    summary: 'A Eme recebe o lead, informa, qualifica e devolve para finalização por corretores parceiros da Menin no CRM.',
    impact: '~R$ 86 mil/ano',
    description: 'Já construído: falta ativar em modo de teste. A conversa roda no WhatsApp corporativo que o sistema já opera, então a mensagem de abertura custa centavos, as respostas dentro da janela de 24 horas são gratuitas e o processamento de IA custa frações de centavo. A estimativa conservadora fica abaixo de R$ 0,40 por lead atendido, contra os cerca de R$ 4,00 cobrados por ferramentas de mercado. Em 2.000 leads por mês, é a diferença entre R$ 9,6 mil e R$ 96 mil por ano. Além do custo, resposta em minutos é o que mais segura lead vivo.',
    features: ['IA', 'WhatsApp', 'Leads'],
  },
  {
    version: 'v4.1.0',
    date: null,
    title: 'Régua de cobrança e VAN pelo Sienge',
    summary: 'A automação do boleto do ato estendida a todas as parcelas anteriores à assinatura com a Caixa.',
    impact: '~R$ 150 mil/ano',
    description: 'Hoje esse período depende de esforço manual ou de custo percentual sobre os valores pagos. A evolução é registrar e dar baixa no boleto direto pela VAN, dentro do ERP, do mesmo jeito que a ferramenta CUB faz, mas pagando apenas pelo disparo da mensagem em vez de um percentual sobre o valor. Só em maio de 2026 a CUB custou R$ 13.293,36 apenas para enviar boletos; o mesmo volume pela VAN sairia por pouco mais de R$ 800.',
    features: ['Cobrança', 'Sienge', 'Boleto'],
  },
  {
    version: 'v4.2.0',
    date: null,
    title: 'WhatsApp na cobrança e no relacionamento',
    summary: 'Estender ao Contas a Receber o canal que já envia boleto com PDF e aprovação com botão.',
    impact: '~R$ 96 mil/ano',
    description: 'O WhatsApp corporativo já opera dentro do Office, com histórico e alçada. Levá-lo para a cobrança e o relacionamento do Contas a Receber substitui o BlipDesk, que custa cerca de R$ 8 mil por mês entre Contas a Receber e Assistência Técnica, e traz a conversa para dentro do sistema em vez de deixá-la em uma ferramenta à parte.',
    features: ['WhatsApp', 'Contas a Receber'],
  },
  {
    version: 'v4.3.0',
    date: null,
    title: 'Inadimplência e distratos',
    summary: 'Inadimplência conduzida pela área comercial e o distrato virando processo com dono e prazo.',
    impact: null,
    description: 'O motor de cálculo da inadimplência já existe, validado e corrigido: falta a tela e a régua de tratativa, conduzidas pela gestão comercial em vez de relatório passivo. No distrato, o cancelamento automático já devolve a unidade ao estoque; a evolução é o fluxo completo dentro do Office, com solicitação, aprovação por alçada, registro do motivo e das condições de devolução, alimentando o indicador que o Faturamento já exibe. O distrato deixa de ser um evento espalhado entre CRM, ERP e conversas.',
    features: ['Comercial', 'Carteira'],
  },
  {
    version: 'v4.4.0',
    date: null,
    title: 'Fluxo de caixa e previsibilidade de gastos',
    summary: 'Previsão de entrada por período, empreendimento e empresa, e teto de gasto para a empresa inteira.',
    impact: null,
    description: 'No Contas a Receber, a previsão de entrada sai dos títulos que o sistema já lê, sem cadastro novo. No Contas a Pagar, a lógica de teto, realizado e projetado que hoje só o marketing usa na Viabilidade passa a valer para a empresa inteira.',
    features: ['Financeiro', 'Projeção'],
  },
  {
    version: 'v4.5.0',
    date: null,
    title: 'Insumos e solicitações de compra',
    summary: 'Pedido, aprovação e acompanhamento de compra dentro do Office.',
    impact: null,
    description: 'Construído sobre o módulo de Aprovações e a esteira de cadastro de fornecedor que já estão prontos e em uso, o que torna a frente incremental em vez de um módulo novo do zero.',
    features: ['Compras', 'Aprovações'],
  },
  {
    version: 'v4.6.0',
    date: null,
    title: 'Venda assistida por IA',
    summary: 'Conduzir as etapas iniciais da venda de forma automatizada utilizando a IA de atendimento, dentro das condições autorizadas.',
    impact: null,
    description: 'Passo seguinte ao atendimento por IA: validado o atendimento, a automação conduz o início da venda sempre dentro das condições autorizadas na ficha comercial do mês, que é a mesma fonte que hoje já limita o que a Eme pode informar ao lead.',
    features: ['IA', 'Comercial'],
  },
  {
    version: 'v4.7.0',
    date: null,
    title: 'Obra e pós-venda',
    summary: 'Evolução de obra publicada automaticamente no site e assistência técnica filtrada pelo Office.',
    impact: null,
    description: 'Na obra, integração com o sistema da engenharia para que o avanço chegue ao site sem repasse manual. No pós-venda, chamado, manual do imóvel, chaves, assinaturas e acompanhamento passando pelo Office, com automação nos pontos repetitivos.',
    features: ['Obra', 'Pós-venda'],
  },
  {
    version: 'v4.8.0',
    date: null,
    title: 'Google Ads e controle do stand',
    summary: 'Google Ads no mesmo modelo já rodando na Meta, fechando o funil de mídia.',
    impact: null,
    description: 'A captação, o vínculo com empreendimento e o custo por lead já funcionam para a Meta; replicar para o Google Ads fecha o funil de mídia em uma leitura só. Junto vem o percentual de manutenção do stand controlado automaticamente dentro da viabilidade, com alerta de gasto.',
    features: ['Marketing', 'Mídia'],
  },
  {
    version: 'v4.9.0',
    date: null,
    title: 'Academy para a rede de vendas',
    summary: 'Abrir o Academy a corretores, imobiliárias e correspondentes, com certificação.',
    impact: null,
    description: 'A base de conhecimento, as trilhas e o controle de audiência já existem para o público interno. Abrir para a rede externa transforma o material que já foi produzido em qualificação e certificação de quem vende.',
    features: ['Academy', 'Certificação'],
  },
  {
    version: 'v5.0.0',
    date: null,
    title: 'App mobile nativo',
    summary: 'Aplicativo para iOS e Android com notificação push.',
    impact: null,
    description: 'As telas já são desenhadas para o celular e a notificação já sai por três canais. O aplicativo nativo entra para resolver o que a web não entrega: push direto no aparelho e acesso sem passar pelo navegador.',
    features: ['Mobile', 'Notificações'],
  },
];

// ── Releases ──────────────────────────────────────────────────────────────────
// Ordem decrescente: a entrega mais recente primeiro.
// O catálogo de releases vive em config/changelog.js: a mesma lista alimenta
// esta tela e o mural de atualizações que abre sozinho. Ver o arquivo para o
// formato de uma entrada nova.

// ── Computed ──────────────────────────────────────────────────────────────────
const filteredReleases = computed(() => {
  let filtered = [...releases];

  // Filtro por busca
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(release =>
      release.version.toLowerCase().includes(query) ||
      release.features?.some(f =>
        f.title.toLowerCase().includes(query) ||
        f.description.toLowerCase().includes(query),
      ) ||
      release.fixes?.some(f => f.description.toLowerCase().includes(query)),
    );
  }

  // Filtro por tipo
  if (filters.value.type !== 'all') {
    filtered = filtered.filter(release => release.type === filters.value.type);
  }

  // Filtro por categoria
  if (filters.value.category !== 'all') {
    filtered = filtered.filter(release =>
      release.categories?.includes(filters.value.category),
    );
  }

  // Filtro por período
  if (filters.value.period !== 'all') {
    const now = new Date();
    const periodMap = { week: 7, month: 30, quarter: 90 };
    const days = periodMap[filters.value.period];
    const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

    filtered = filtered.filter(release => new Date(release.date) >= cutoffDate);
  }

  return filtered;
});

const paginatedReleases = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  return filteredReleases.value.slice(startIndex, startIndex + itemsPerPage);
});

const totalPages = computed(() =>
  Math.ceil(filteredReleases.value.length / itemsPerPage),
);

const totalBugsFixed = computed(() =>
  releases.reduce((total, release) => total + (release.fixes?.length || 0), 0),
);

const totalFeatures = computed(() =>
  releases.reduce((total, release) => total + (release.features?.length || 0), 0),
);

const visibleRoadmap = computed(() =>
  showAllRoadmap.value ? roadmap : roadmap.slice(0, ROADMAP_PREVIEW),
);

const firstReleaseLabel = computed(() => {
  const dates = releases.map(r => r.date).filter(Boolean).map(d => new Date(d));
  if (!dates.length) return 'o início';
  const oldest = new Date(Math.min(...dates));
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(oldest);
});

// Faixa de topo no mesmo formato do Mapa e da Visão Executiva.
const highlights = computed(() => [
  { v: String(releases.length), l: 'Atualizações publicadas', s: `Desde ${firstReleaseLabel.value}` },
  { v: String(totalFeatures.value), l: 'Novas funcionalidades', s: 'Entregas que criaram algo que não existia' },
  { v: String(totalBugsFixed.value), l: 'Correções', s: 'Problemas resolvidos e publicados' },
  {
    v: String(roadmap.length),
    l: 'Frentes em desenvolvimento',
    s: 'O que vem a seguir, tudo apoiado no que o sistema já opera',
    info: 'São as frentes do plano de desenvolvimento da Visão Executiva. Nenhuma começa do zero: todas se apoiam em integração, alçada ou automação que o Office já roda hoje.',
  },
]);

const hasFilters = computed(() =>
  !!searchQuery.value.trim()
  || filters.value.type !== 'all'
  || filters.value.category !== 'all'
  || filters.value.period !== 'all',
);

function clearFilters() {
  searchQuery.value = '';
  filters.value = { type: 'all', category: 'all', period: 'all' };
}

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(filters, () => { currentPage.value = 1; }, { deep: true });
watch(searchQuery, () => { currentPage.value = 1; });

// ── Methods ───────────────────────────────────────────────────────────────────
function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function getRelativeTime(date) {
  const now = new Date();
  const releaseDate = new Date(date);
  const diffTime = Math.abs(now - releaseDate);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'hoje';
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `há ${Math.floor(diffDays / 30)} meses`;
  return `há ${Math.floor(diffDays / 365)} anos`;
}

function getReleaseTypeVariant(type) {
  const map = {
    major:  'danger',
    minor:  'info',
    patch:  'success',
    hotfix: 'warning',
  };
  return map[type] || 'neutral';
}

function getReleaseTypeLabel(type) {
  const labels = { major: 'Major', minor: 'Minor', patch: 'Patch', hotfix: 'Hotfix' };
  return labels[type] || type;
}

function getCategoryClass(category) {
  const classes = {
    frontend: 'bg-accent/10 text-accent border-accent/20',
    backend:  'bg-data-pos/10 text-data-pos border-data-pos/20',
    api:      'bg-accent/10 text-accent border-accent/20',
    mobile:   'bg-series-5/10 text-series-5 border-series-5/25',
    security: 'bg-data-neg/10 text-data-neg border-data-neg/20',
  };
  return classes[category] || 'bg-surface-sunken text-ink-muted border-line';
}

function getCategoryLabel(category) {
  const labels = {
    frontend: 'Frontend',
    backend:  'Backend',
    api:      'API',
    mobile:   'Mobile',
    security: 'Segurança',
  };
  return labels[category] || category;
}

function showDetails(release) {
  selectedRelease.value = release;
}

function closeModal() {
  selectedRelease.value = null;
}
</script>
