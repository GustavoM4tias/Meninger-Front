<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="full">
      <PageHeader
        subtitle="Acompanhe atualizações, melhorias e correções do sistema"
        icon="fas fa-book-open">
        <template #title>Documentação</template>
      </PageHeader>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">

        <!-- Sidebar de Filtros -->
        <aside class="lg:col-span-1 space-y-4">
          <Surface variant="raised" padding="md" class="surface-gradient lg:sticky lg:top-4 space-y-5">

            <!-- Busca -->
            <div>
              <label class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle mb-1.5 block">
                Buscar
              </label>
              <Input
                v-model="searchQuery"
                placeholder="Buscar atualizações..."
                icon-left="fas fa-magnifying-glass" />
            </div>

            <!-- Tipo de Release -->
            <Select
              v-model="filters.type"
              label="Tipo de Release"
              :options="typeOptions" />

            <!-- Categoria -->
            <Select
              v-model="filters.category"
              label="Categoria"
              :options="categoryOptions" />

            <!-- Período -->
            <Select
              v-model="filters.period"
              label="Período"
              :options="periodOptions" />

            <!-- Estatísticas -->
            <div class="border-t border-line pt-4">
              <div class="flex items-center gap-2 mb-3">
                <i class="fas fa-chart-simple text-accent text-sm"></i>
                <h4 class="text-xs uppercase tracking-wider font-mono text-ink-muted">
                  Estatísticas
                </h4>
              </div>
              <div class="space-y-2.5">
                <div class="flex justify-between text-sm">
                  <span class="text-ink-muted">Total atualizações</span>
                  <span class="font-mono tabular-nums font-medium text-ink">{{ releases.length }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-ink-muted">Bugs corrigidos</span>
                  <span class="font-mono tabular-nums font-medium text-amber-500">{{ totalBugsFixed }}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-ink-muted">Novas funcionalidades</span>
                  <span class="font-mono tabular-nums font-medium text-emerald-500">{{ totalFeatures }}</span>
                </div>
              </div>
            </div>
          </Surface>
        </aside>

        <!-- Conteúdo Principal -->
        <main class="lg:col-span-3 space-y-6">

          <!-- Roadmap -->
          <section>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-base font-semibold text-ink flex items-center gap-2">
                <i class="fas fa-road text-accent text-sm"></i>
                Atualizações Futuras
              </h3>
              <Badge variant="accent" size="sm">{{ roadmap.length }} planejadas</Badge>
            </div>
            <div class="overflow-x-auto -mx-1 px-1">
              <div class="flex gap-3 pb-2 min-w-min">
                <Surface v-for="milestone in roadmap" :key="milestone.version"
                  variant="raised"
                  padding="md"
                  class="min-w-[280px] max-w-[280px] flex-shrink-0 hover:shadow-md transition-shadow surface-gradient">
                  <div class="flex items-center justify-between mb-2 gap-2">
                    <span class="font-semibold text-ink font-mono text-sm">{{ milestone.version }}</span>
                    <span v-if="milestone?.date" class="text-[11px] text-ink-subtle font-mono">
                      {{ formatDate(milestone.date) }}
                    </span>
                    <Badge v-else variant="warning" size="sm">Em programação</Badge>
                  </div>
                  <p class="text-sm text-ink-muted mb-3 leading-relaxed">{{ milestone.description }}</p>
                  <div class="flex flex-wrap gap-1">
                    <span v-for="feature in milestone.features" :key="feature"
                      class="text-[10px] px-2 py-0.5 rounded-full bg-surface-sunken text-ink-muted border border-line">
                      {{ feature }}
                    </span>
                  </div>
                </Surface>
              </div>
            </div>
          </section>

          <!-- Lista de Releases -->
          <section>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-base font-semibold text-ink flex items-center gap-2">
                <i class="fas fa-clock-rotate-left text-accent text-sm"></i>
                Histórico de atualizações
              </h3>
              <span class="text-xs text-ink-muted">
                <span class="font-mono tabular-nums">{{ filteredReleases.length }}</span>
                de
                <span class="font-mono tabular-nums">{{ releases.length }}</span>
                atualizações
              </span>
            </div>

            <!-- Cards de Release -->
            <div class="space-y-4">
              <Surface v-for="release in paginatedReleases" :key="release.version"
                variant="raised"
                padding="none"
                class="overflow-hidden hover:shadow-md transition-shadow surface-gradient">

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
                    <p class="text-[10px] text-ink-subtle font-mono">{{ getRelativeTime(release.date) }}</p>
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
                        <i class="fas fa-sparkles text-emerald-500 text-[10px]"></i>
                        Novas funcionalidades
                      </h5>
                      <ul class="space-y-2">
                        <li v-for="feature in release.features" :key="feature.id"
                          class="text-sm text-ink-muted flex items-start gap-2">
                          <i class="fas fa-circle text-emerald-500 mt-1.5 text-[6px] shrink-0"></i>
                          <span><strong class="text-ink">{{ feature.title }}:</strong> {{ feature.description }}</span>
                        </li>
                      </ul>
                    </div>

                    <!-- Melhorias -->
                    <div v-if="release.improvements?.length">
                      <h5 class="text-xs font-mono uppercase tracking-wider text-ink-subtle mb-2 flex items-center gap-1.5">
                        <i class="fas fa-arrow-up text-sky-500 text-[10px]"></i>
                        Melhorias
                      </h5>
                      <ul class="space-y-2">
                        <li v-for="improvement in release.improvements" :key="improvement.id"
                          class="text-sm text-ink-muted flex items-start gap-2">
                          <i class="fas fa-circle text-sky-500 mt-1.5 text-[6px] shrink-0"></i>
                          <span><strong class="text-ink">{{ improvement.category }}:</strong> {{ improvement.description }}</span>
                        </li>
                      </ul>
                    </div>

                    <!-- Correções -->
                    <div v-if="release.fixes?.length">
                      <h5 class="text-xs font-mono uppercase tracking-wider text-ink-subtle mb-2 flex items-center gap-1.5">
                        <i class="fas fa-bug-slash text-amber-500 text-[10px]"></i>
                        Correções
                      </h5>
                      <ul class="space-y-2">
                        <li v-for="fix in release.fixes" :key="fix.id"
                          class="text-sm text-ink-muted flex items-start gap-2">
                          <i class="fas fa-circle text-amber-500 mt-1.5 text-[6px] shrink-0"></i>
                          <span>{{ fix.description }}</span>
                        </li>
                      </ul>
                    </div>

                    <!-- Breaking Changes -->
                    <div v-if="release.breakingChanges?.length">
                      <h5 class="text-xs font-mono uppercase tracking-wider text-red-600 dark:text-red-400 mb-2 flex items-center gap-1.5">
                        <i class="fas fa-triangle-exclamation text-red-500 text-[10px]"></i>
                        Breaking changes
                      </h5>
                      <ul class="space-y-2">
                        <li v-for="change in release.breakingChanges" :key="change.id"
                          class="text-sm rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                          <div class="text-red-700 dark:text-red-300">
                            <strong>{{ change.component }}:</strong> {{ change.description }}
                          </div>
                          <div class="text-red-600 dark:text-red-400 text-xs mt-1">
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
                        class="text-[10px] px-2 py-0.5 rounded-full font-medium border"
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
              <button v-for="page in totalPages" :key="page"
                @click="currentPage = page"
                class="h-9 min-w-9 px-3 text-sm font-medium rounded-lg transition-colors"
                :class="currentPage === page
                  ? 'bg-accent text-white'
                  : 'bg-surface-raised text-ink-muted border border-line hover:bg-surface-hover'">
                {{ page }}
              </button>
            </div>
          </section>
        </main>
      </div>
    </PageContainer>

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
              <i class="fas fa-sparkles text-emerald-500"></i>
              Novas Funcionalidades
            </h4>
            <div class="space-y-3">
              <div v-for="feature in selectedRelease.features" :key="feature.id"
                class="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                <h5 class="font-medium text-emerald-700 dark:text-emerald-300 mb-1.5 text-sm">
                  {{ feature.title }}
                </h5>
                <p class="text-emerald-700/80 dark:text-emerald-300/80 text-xs leading-relaxed">
                  {{ feature.description }}
                </p>
              </div>
            </div>
          </div>

          <!-- Problemas Conhecidos -->
          <div v-if="selectedRelease.knownIssues?.length">
            <h4 class="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
              <i class="fas fa-triangle-exclamation text-amber-500"></i>
              Problemas Conhecidos
            </h4>
            <div class="space-y-3">
              <div v-for="issue in selectedRelease.knownIssues" :key="issue.id"
                class="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                <p class="text-amber-700 dark:text-amber-300 text-xs mb-2 leading-relaxed">
                  {{ issue.description }}
                </p>
                <div v-if="issue.workaround" class="text-amber-700/80 dark:text-amber-300/80 text-xs">
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
                  class="rounded-lg bg-sky-500/10 border border-sky-500/20 p-3 text-xs">
                  <strong class="text-sky-700 dark:text-sky-300">{{ improvement.category }}:</strong>
                  <span class="text-sky-700/80 dark:text-sky-300/80 ml-1">{{ improvement.description }}</span>
                </li>
              </ul>
            </div>

            <div v-if="selectedRelease.fixes?.length" class="space-y-2">
              <h5 class="text-xs font-mono uppercase tracking-wider text-ink-subtle">Correções</h5>
              <ul class="space-y-2">
                <li v-for="fix in selectedRelease.fixes" :key="fix.id"
                  class="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-300">
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

// ── State ─────────────────────────────────────────────────────────────────────
const searchQuery = ref('');
const selectedRelease = ref(null);
const currentPage = ref(1);
const itemsPerPage = 6;

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
const roadmap = [
  {
    version: 'v2.6.1',
    date: null,
    description: 'App mobile nativo para iOS e Android com push notifications.',
    features: ['Mobile', 'Notificações'],
  },
  {
    version: 'v2.7.0',
    date: new Date('2026-05-15T00:00:00'),
    description: 'Dashboard executivo com KPIs consolidados e BI avançado.',
    features: ['BI', 'Relatórios', 'Dashboard'],
  },
  {
    version: 'v2.7.1',
    date: null,
    description: 'Expansão do ecossistema Microsoft: integração de eventos com Teams e busca semântica em transcrições.',
    features: ['Microsoft', 'IA', 'Teams'],
  },
];

// ── Releases ──────────────────────────────────────────────────────────────────
const releases = [
  {
    version: 'v2.6.0',
    date: new Date('2026-04-23T00:00:00'),
    description: 'Primeira automação completa de pagamento via eCobrança com headless browser.',
    type: 'major',
    categories: ['backend', 'api'],
    features: [
      { id: 1, title: 'Automação eCobrança', description: 'Integração completa com o portal eCobrança via Playwright headless (Chromium). O sistema navega automaticamente no portal, cria o ticket, gera o boleto e captura os dados de retorno sem intervenção manual.' },
      { id: 2, title: 'Geração e Aceite de Boleto', description: 'Fluxo automatizado de geração de boleto com confirmação de aceite e envio de mensagem associada. O boleto concluído é vinculado ao lançamento de pagamento correspondente.' },
    ],
    improvements: [
      { id: 1, category: 'PaymentFlow', description: 'Pipeline de pagamento estendido com etapa de boleto eCobrança como passo final após emissão do título.' },
      { id: 2, category: 'Infraestrutura', description: 'Adicionado suporte a proxy e dependências Chromium no servidor para execução do headless browser em produção.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.7',
    date: new Date('2026-04-16T00:00:00'),
    description: 'Dashboard Vendas × Projeção com filtros por empresa e modo de meta configurável.',
    type: 'minor',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Filtro por Empresa no Dashboard de Vendas', description: 'Filtro do relatório Vendas × Projeção migrado de empreendimento para empresa, com toggle para agrupar por empreendimento ou empresa, alinhando com o painel de Faturamento.' },
      { id: 2, title: 'Modo de Meta por Empreendimento', description: 'Configuração de meta global (unidades ou VGV) com override individual por empreendimento. Administradores acessam via modal de configurações direto do dashboard. Persiste em localStorage.' },
      { id: 3, title: 'Modal de Comparação Realizado × Projetado', description: 'Ao clicar no empreendimento na tabela de projeção, abre modal com aba "Comparação" mostrando realizado vs projetado em unidades e VGV.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.6',
    date: new Date('2026-04-14T00:00:00'),
    description: 'Assinatura digital finalizada, módulo de Eventos e ajustes no PaymentFlow.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Assinatura Digital — Versão Final', description: 'Módulo de assinatura eletrônica de documentos concluído. Suporta fluxo completo com dois aprovadores, rastreamento de status (PENDING → SIGNED/CANCELLED/REJECTED/EXPIRED) e polling automático a cada 10 minutos.' },
      { id: 2, title: 'Fichas Comerciais — Aprovação por Assinatura', description: 'Fichas Comerciais integradas ao módulo de assinatura digital: submit gera SignatureDocument para os aprovadores configurados; ao assinar, ficha passa para status "approved" automaticamente.' },
      { id: 3, title: 'Módulo de Eventos', description: 'Gestão de eventos de marketing com upload de imagens direto ao Supabase, criação, edição e visualização de eventos por empreendimento.' },
    ],
    improvements: [
      { id: 1, category: 'PaymentFlow', description: 'Ajustes no fluxo e integração do PaymentFlow com melhorias na consulta e regras de validação.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.5',
    date: new Date('2026-04-10T00:00:00'),
    description: 'Assinatura digital v1 e Fichas Comerciais com condições mensais por empreendimento.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Assinatura Digital v1', description: 'Primeira versão funcional do módulo de assinatura eletrônica: upload de documentos PDF ao Supabase, criação de SignatureDocument com aprovadores, rastreamento de status e integração com schedulers.' },
      { id: 2, title: 'Fichas Comerciais', description: 'Novo módulo de condições comerciais mensais por empreendimento, substituindo planilhas Excel. Inclui módulos por etapa (idetapa CV), campanhas, distribuição de preços, regras de negociação e seção operacional (CEF/ITBI/cartório). RBAC: admin CRUD completo, usuário vê apenas fichas aprovadas.' },
      { id: 3, title: 'Fichas Comerciais — Auto-geração Mensal', description: 'Scheduler que gera automaticamente a ficha do mês seguinte no dia 1 às 1h para empreendimentos com ao menos 1 ficha aprovada no histórico.' },
    ],
    improvements: [
      { id: 1, category: 'Vendas × Projeção', description: 'Cruzamento de dados de vendas realizadas com projeção de metas, integrado ao novo dashboard comercial.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.4',
    date: new Date('2026-04-08T00:00:00'),
    description: 'Novas funções de gerenciamento de senha para usuários.',
    type: 'patch',
    categories: ['frontend', 'backend', 'security'],
    features: [
      { id: 1, title: 'Novas Funções de Senha', description: 'Expansão das funcionalidades de gerenciamento de senha: alteração de senha para usuários autenticados e recuperação via e-mail com token seguro.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.3',
    date: new Date('2026-04-02T00:00:00'),
    description: 'PaymentFlow com Playwright, RID integrado, filtros e ajustes no Sienge.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Playwright no PaymentFlow', description: 'Automação de etapas do Sienge via Playwright headless, utilizado nas etapas de criação de contrato e navegação no portal quando a API não é suficiente.' },
      { id: 2, title: 'RID integrado ao PaymentFlow', description: 'Fluxo de Solicitação de Cadastro de Fornecedor (RID) integrado diretamente no pipeline de pagamento: quando fornecedor não é encontrado no Sienge, notificação aparece no card do lançamento para abertura do modal de RID.' },
    ],
    improvements: [
      { id: 1, category: 'Sienge — Filtros e Queries', description: 'Ajustes nos filtros do PaymentFlow, queries otimizadas e regras de negócio revisadas para maior precisão nos resultados.' },
      { id: 2, category: 'Sienge — ParseObstit', description: 'Ajuste no parsing de obstáculos com validação de valores mínimos e máximos (min/max) para evitar lançamentos incorretos.' },
      { id: 3, category: 'SiengeCredentialsModal', description: 'Atualização do modal de credenciais Sienge com melhorias de UX no fluxo de configuração.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.2',
    date: new Date('2026-03-30T00:00:00'),
    description: 'PaymentFlow base e sistema de alçadas de aprovação.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'PaymentFlow — Fluxo Base', description: 'Lançamento do módulo de Fluxo de Pagamento com pipeline visual de 5 etapas: fornecedor → contrato → aditivo → medição → título. Integração com API Sienge para validação automática de cada etapa.' },
      { id: 2, title: 'Alçadas de Aprovação', description: 'Sistema de alçadas (limites de valor por nível hierárquico) integrado ao PaymentFlow. Define quais usuários/cargos podem aprovar lançamentos acima de determinados valores, garantindo controle financeiro por camadas.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.1',
    date: new Date('2026-03-24T00:00:00'),
    description: 'Módulo de Distratos e melhorias na Projeção de Vendas.',
    type: 'minor',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Módulo de Distratos', description: 'Nova página para gestão de distratos (cancelamentos de venda). Permite registrar, acompanhar e controlar cancelamentos de contratos de venda de imóveis diretamente no sistema, substituindo controle manual em planilhas.' },
      { id: 2, title: 'Projeção de Vendas — Atualização', description: 'Melhorias no módulo de projeção com dados mais precisos e novos filtros para acompanhamento de metas de venda por empreendimento.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.5.0',
    date: new Date('2026-03-23T00:00:00'),
    description: 'Ecossistema Microsoft 365 completo com IA embarcada.',
    type: 'major',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Microsoft Teams — Calendário Integrado', description: 'Calendário completo com visões Mês e Semana integrado ao Microsoft Teams. Mês responsivo com hover visual, chips compactos para reuniões sobrepostas, popup de overflow sem criar novo evento e cursor crosshair na semana. Semana com ghost de hover mostrando onde o evento será criado e snap automático a 30 minutos.' },
      { id: 2, title: 'Microsoft SharePoint — Gestão de Arquivos', description: 'Navegação completa por sites e drives do SharePoint com visualização em grid/lista. Preview inline de imagens, PDFs e documentos Office, download via proxy autenticado, upload com progresso, links de compartilhamento, renomeação, exclusão, movimentação e busca global.' },
      { id: 3, title: 'Transcrições em Tempo Real com IA', description: 'Gravação e transcrição em tempo real de reuniões presenciais usando Web Speech API. A transcrição persiste enquanto navega pelo sistema, com timer, visualização de ondas de áudio, pausar/retomar e relatório gerado por IA ao finalizar.' },
      { id: 4, title: 'Relatórios de Reuniões com IA', description: 'Geração automática de relatório estruturado (resumo, pontos-chave, decisões e próximos passos) para reuniões do Teams e reuniões presenciais, com envio direto por e-mail.' },
      { id: 5, title: 'Abrir Arquivos no Office Nativo', description: 'Suporte a protocol handlers do Microsoft Office (ms-word, ms-excel, ms-powerpoint) para abrir documentos diretamente no aplicativo desktop a partir do SharePoint.' },
    ],
    improvements: [
      { id: 1, category: 'SharePoint — Preview', description: 'Visualização de imagens com zoom via scroll/pinch, PDFs e documentos Office via Office Online Viewer embutido, com download nativo corrigido para cross-origin.' },
      { id: 2, category: 'Teams — Reuniões Presenciais', description: 'Modal de nova reunião presencial integrado na aba de transcrições, eliminando a necessidade de rota separada. Título, local e participantes configuráveis antes de iniciar.' },
      { id: 3, category: 'Calendário — Modo Claro/Escuro', description: 'Todos os componentes do ecossistema Microsoft com suporte completo a dark mode usando a paleta padrão do sistema.' },
    ],
    fixes: [
      { id: 1, description: 'Corrigido envio de e-mail no painel de relatórios (emit @email não propagado para Index.vue).' },
      { id: 2, description: 'Corrigido "Abrir no aplicativo" — Chrome bloqueava protocol handlers em iframe; substituído por <a>.click().' },
      { id: 3, description: 'Corrigido download de arquivos SharePoint que retornava apenas abertura em nova aba por falha de CORS; agora roteado via proxy autenticado do backend.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.4.3',
    date: new Date('2026-03-20T00:00:00'),
    description: 'Melhorias no módulo financeiro de despesas e contas.',
    type: 'patch',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Despesas e Contas — Novas Funcionalidades', description: 'Expansão do módulo Bills & Expenses com novas regras de lançamento, categorização e relatórios de despesas por período.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.4.2',
    date: new Date('2026-03-18T00:00:00'),
    description: 'Fluxo de pagamento Sienge e filtros de vendas.',
    type: 'minor',
    categories: ['frontend', 'backend', 'api'],
    features: [
      { id: 1, title: 'Pipeline de Pagamento — Fluxo Sienge (RID)', description: 'Implementado fluxo completo de cadastro de fornecedor via RID no Sienge, com pipeline visual das etapas: validação → cadastro → aprovação → pagamento. Integração com a API do Sienge para acompanhar status em tempo real.' },
    ],
    improvements: [
      { id: 1, category: 'Relatório de Vendas', description: 'Adicionado filtro por URL de vendas para segmentação avançada de resultados no relatório comercial.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.4.1',
    date: new Date('2026-03-09T00:00:00'),
    description: 'Recuperação e alteração de senha via email.',
    type: 'minor',
    categories: ['security'],
    features: [
      { id: 1, title: 'Alteração de senha', description: 'Alteração de senha para usuários logados e deslogados, usando notificações via email.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.4.0',
    date: new Date('2026-01-29T00:00:00'),
    description: 'Menin Academy, ajustes no reconhecimento facial e expansão financeira.',
    type: 'minor',
    categories: ['frontend', 'api', 'backend'],
    features: [
      { id: 1, title: 'Menin Academy', description: 'Lançamento da estrutura inicial do módulo educacional "Academy", incluindo login externo para alunos e layout dedicado para cursos e treinamentos.' },
      { id: 2, title: 'Reconhecimento Facial (Ajustes)', description: 'Refatoração do layout de cadastro facial para melhor usabilidade em dispositivos móveis e validação de imagem.' },
    ],
    improvements: [
      { id: 1, category: 'Infraestrutura', description: 'Padronização global de URLs e domínios da aplicação para melhorar SEO e segurança.' },
      { id: 2, category: 'Financeiro', description: 'Implementação inicial do módulo de Despesas e Contas (Bills & Expenses).' },
    ],
    fixes: [
      { id: 1, description: 'Correção no envio de e-mails transacionais (Email Sent Ajust).' },
      { id: 2, description: 'Ajuste de rotas internas para evitar conflitos na navegação.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.3.5',
    date: new Date('2026-01-09T00:00:00'),
    description: 'UX — Menu retrátil e melhorias na projeção.',
    type: 'patch',
    categories: ['frontend'],
    features: [
      { id: 1, title: 'UX - Menu Retrátil', description: 'Implementada funcionalidade de "Minimizar Menu" (Navbar Minimalize), aumentando a área útil de trabalho em telas menores.' },
    ],
    improvements: [
      { id: 1, category: 'Projeção de Vendas', description: 'Adicionado filtro de busca por Cidades na tabela de projeção.' },
      { id: 2, category: 'Layout', description: 'Melhoria no detalhamento das tabelas de projeção (Table Details).' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.3.0',
    date: new Date('2025-12-19T00:00:00'),
    description: 'Premiações, contratos digitais e viabilidade de marketing.',
    type: 'minor',
    categories: ['backend', 'frontend', 'mobile'],
    features: [
      { id: 1, title: 'Módulo de Premiações (Awards)', description: 'Início da implementação do sistema de gamificação e premiações para a equipe comercial.' },
      { id: 2, title: 'Gestão de Contratos (Store Contracts)', description: 'Novo fluxo para armazenamento e recuperação de contratos digitais.' },
      { id: 3, title: 'Viabilidade de Marketing', description: 'Ferramenta para análise de viabilidade de novos empreendimentos baseada em dados de marketing (Land Settings & Viability).' },
    ],
    improvements: [
      { id: 1, category: 'Financeiro', description: 'Gestão de Títulos e Custos operacionais adicionada ao painel administrativo.' },
      { id: 2, category: 'Repasse', description: 'Ajustes na lógica de repasse financeiro integrados à API.' },
    ],
    fixes: [
      { id: 1, description: 'Correção na seleção de departamentos e categorias financeiras.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.2.5',
    date: new Date('2025-11-27T00:00:00'),
    description: 'Posições, cidades e despesas de marketing.',
    type: 'patch',
    categories: ['frontend', 'api'],
    features: [
      { id: 1, title: 'Gestão de Posições e Cidades', description: 'Atualização robusta no gerenciamento de cargos (positions) e vinculação de usuários a cidades específicas.' },
      { id: 2, title: 'Despesas de Marketing', description: 'Nova tela para lançamento e acompanhamento de despesas exclusivas do setor de Marketing.' },
    ],
    improvements: [],
    fixes: [
      { id: 1, description: 'Correção crítica: Tela preta ao acessar a área de Favoritos (Login Black Screen Error).' },
      { id: 2, description: 'Ajuste no cálculo de comissão específico para o empreendimento "Parque das Flores".' },
      { id: 3, description: 'Correção de erro de agrupamento no relatório de faturamento.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.2.4',
    date: new Date('2025-11-11T00:00:00'),
    description: 'Organograma interativo e multiselector para projeções.',
    type: 'minor',
    categories: ['frontend', 'backend'],
    features: [
      { id: 1, title: 'Organograma Interativo', description: 'Novo visualizador de hierarquia corporativa (Organogram) integrado aos perfis de usuário.' },
      { id: 2, title: 'Multiselector para Projeções', description: 'Capacidade de selecionar múltiplos empreendimentos simultaneamente para criação de projeções de vendas.' },
    ],
    improvements: [
      { id: 1, category: 'Regras de Venda', description: 'Refinamento das regras de validação para novas vendas (Sales Ajust Rules).' },
      { id: 2, category: 'Workflow', description: 'Melhorias no fluxo de trabalho de grupos de venda.' },
    ],
    fixes: [
      { id: 1, description: 'Ajustes nas rotas de autenticação do validador.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.2.3',
    date: new Date('2025-10-30T00:00:00'),
    description: 'Sistema gerencial de Projeção de Vendas.',
    type: 'patch',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Sistema gerencial de Projeção de Vendas', description: 'Criado um sistema de gerenciamento de metas por empreendimento, com criação, adição, exclusão e revisões de projeção.' },
    ],
    improvements: [
      { id: 1, category: 'Comercial - Projeção de Vendas', description: 'Criada tela para novo relatório gerencial.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.2.2',
    date: new Date('2025-10-29T00:00:00'),
    description: 'Gerenciamento global de cidades CRM × ERP.',
    type: 'patch',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Gerenciamento Global de Cidades CRM × ERP', description: 'Adicionado um gerenciamento global de cidades e empreendimentos do CV CRM e Sienge, vinculando + 2000 centros de custos e + 20 empreendimentos do CRM, agora podendo gerenciar e vincular a cidades, que são vinculadas a usuários limitando a visualização permitida.' },
    ],
    improvements: [
      { id: 1, category: 'Relatórios de Leads', description: 'Adaptado relatório de Leads para novo gerenciamento de cidades.' },
      { id: 2, category: 'Relatórios de Faturamento', description: 'Adaptado relatório de Faturamento para novo gerenciamento de cidades.' },
      { id: 3, category: 'Relatórios de Eventos', description: 'Adaptado Eventos para visualização com novo gerenciamento de cidades.' },
      { id: 4, category: 'Relatórios de Empreendimentos', description: 'Adaptado Empreendimentos para visualização com novo gerenciamento de cidades.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.2.1',
    date: new Date('2025-10-28T00:00:00'),
    description: 'Reconhecimento facial e melhorias no organograma.',
    type: 'minor',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Reconhecimento Facial', description: 'Reconhecimento facial vinculado na aba de perfil, podendo ativar, reativar e recadastrar.' },
    ],
    improvements: [
      { id: 1, category: 'Perfil de usuários', description: 'Ajuste no layout no perfil de usuário.' },
      { id: 2, category: 'Perfil de usuários', description: 'Ajuste no layout da aba de usuários.' },
      { id: 3, category: 'Organograma', description: 'Ajuste na regra de "manager" para vincular superior e hierarquia de usuários.' },
      { id: 4, category: 'Organograma', description: 'Ajustado componente de hierarquia para visualização de usuários do sistema.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.2.0',
    date: new Date('2025-10-23T00:00:00'),
    description: 'Refaturação completa do dashboard de vendas.',
    type: 'patch',
    categories: ['frontend', 'mobile'],
    features: [
      { id: 1, title: 'Refaturação do Dashboard', description: 'Reformulado todo o dashboard de vendas para novas funcionalidades e visualizações.' },
      { id: 2, title: 'Contagem de Mês', description: 'Adicionado contador de tempo para fechamento do mês na tela inicial.' },
      { id: 3, title: 'Card de Leads', description: 'Criado card com gráfico e detalhes sobre leads para pré-visualização no dashboard.' },
      { id: 4, title: 'Card de Validações', description: 'Criado card com gráfico e detalhes sobre as validações para pré-visualização no dashboard.' },
    ],
    improvements: [], fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.9',
    date: new Date('2025-10-03T00:00:00'),
    description: 'Sistema de tickets e configuração de "Reports".',
    type: 'patch',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Configuração de envio de "Reports" para erros no sistema e suporte', description: 'Formulário de suporte/reporte de problemas vinculado a nova funcionalidade de disparos, ajustada lógica para resposta e atualização contínua do suporte.' },
      { id: 2, title: 'Painel de Tickets', description: 'Desenvolvido painel de tickets para acompanhamento dos tickets abertos pelos usuários.' },
    ],
    improvements: [
      { id: 1, category: 'Eventos', description: 'Ajuste no disparo de eventos para seleção de usuários por nome, cargo (Ex: Marketing — todos usuários mkt) e e-mails externos.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.8',
    date: new Date('2025-09-30T00:00:00'),
    description: 'Ajuste de e-mail para notificações via sistema@menin.com.br.',
    type: 'patch',
    categories: ['api', 'backend'],
    features: [
      { id: 1, title: 'Ajuste de E-mail para notificações do sistema', description: 'Não é possível o envio de e-mails a partir de "comercial@menin.com.br". Solicitado um e-mail para notificações internas, utilizado o novo "sistema@menin.com.br" nas notificações.' },
    ],
    improvements: [
      { id: 1, category: 'Controladores', description: 'Feita toda estrutura de mensagens para notificação via e-mail para Eventos e disponível para expansão em outros módulos.' },
    ],
    fixes: [], breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.7',
    date: new Date('2025-09-22T00:00:00'),
    description: 'Relatório Leads × Vendas com banco de dados Menin.',
    type: 'patch',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Relatório Leads × Vendas via Banco de Dados Menin', description: 'Ajustadas todas funcionalidades definidas para o relatório, agora contando com busca e filtros detalhados, vínculo entre CV e Sienge corretor, valores ajustados para VGV do comercial, sendo "VGV" e "VGV+DC" o valor somado o DC (Desconto Construtora).' },
    ],
    improvements: [
      { id: 1, category: 'Relatórios', description: 'Agora contando com 3 tipos de relatórios podendo ser Listagem, Pizza ou Barra, relatórios reativos e que acompanham a busca do usuário, com dados detalhados e precisos automaticamente.' },
    ],
    fixes: [
      { id: 1, description: 'Ajuste na sincronia e dados da API, pego junto das vendas do Sienge: REPASSE, RESERVA e demais itens do cliente no CV.' },
      { id: 2, description: 'Corrigido problema de CM (Comissão) que não entrava no contrato Sienge do residencial Verona; criada regra de adição de 4% no VGV das vendas até determinado período.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.6',
    date: new Date('2025-09-04T00:00:00'),
    description: 'Vínculo de corretores CV × Sienge.',
    type: 'patch',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Envio de Corretores para Sienge ou Junção de dados', description: 'Definido vínculo entre corretores no CV e dados do Sienge; impossibilitada conexão de dados internamente, feito vínculo somente no relatório de vendas com base na unidade vendida.' },
    ],
    improvements: [],
    fixes: [
      { id: 1, description: 'Ajuste na sincronia e dados da API, pego junto das vendas do Sienge: REPASSE, RESERVA e demais itens do cliente no CV.' },
      { id: 2, description: 'Corrigido problema de TR (Terreno) que não era retornado na API; feito vínculo de backup com o Banco de dados externo BI.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.5',
    date: new Date('2025-08-22T00:00:00'),
    description: 'Tela de relatório com dados Sienge em tempo real.',
    type: 'patch',
    categories: ['frontend', 'mobile', 'api', 'backend'],
    features: [
      { id: 1, title: 'Tela de relatório e filtros personalizados', description: 'Tela de listagem para relatório de vendas com dados de faturamento em tempo real do Sienge.' },
    ],
    improvements: [],
    fixes: [
      { id: 1, description: 'Getters de API e correlação entre contratos Sienge × CV.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.4',
    date: new Date('2025-08-08T00:00:00'),
    description: 'Parametrização de abas e limpeza de desempenho.',
    type: 'patch',
    categories: ['frontend', 'mobile'],
    features: [
      { id: 1, title: 'Parametrização de abas do sistema, limpeza de desempenho', description: 'Ajustado layout padrão e menu de navegação, ajustadas repetições desnecessárias para desempenho.' },
    ],
    improvements: [
      { id: 2, category: 'UX', description: 'Telas Responsivas, Gráficos Detalhados e Visual Design.' },
    ],
    fixes: [
      { id: 1, description: 'Responsividade geral do sistema em dispositivos móveis.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.3',
    date: new Date('2025-07-29T00:00:00'),
    description: 'Reportar problema adicionado.',
    type: 'patch',
    categories: ['frontend', 'mobile'],
    features: [
      { id: 1, title: 'Reportar Problema adicionado', description: 'Interface de reporte criada e configuração de requisitos definida.' },
    ],
    improvements: [
      { id: 2, category: 'UX', description: 'Layout moderno e responsivo para nova página.' },
    ],
    fixes: [
      { id: 1, description: 'Ajuste de TimeZone no sistema por erros em UTF.' },
    ],
    breakingChanges: [],
    knownIssues: [
      { id: 1, description: 'Relatório ainda não funcional.', workaround: 'Formulário de suporte ainda em período de testes, pendente da atualização 2.1.5 para funcionamento completo.' },
    ],
  },
  {
    version: 'v2.1.2',
    date: new Date('2025-07-28T00:00:00'),
    description: 'Refaturação da barra de navegação.',
    type: 'patch',
    categories: ['frontend', 'mobile'],
    features: [],
    improvements: [
      { id: 1, category: 'Barra de navegação', description: 'Refaturada toda barra de navegação, garantindo melhor funcionalidade nas abas de "Dropdown" e responsividade em dispositivos móveis.' },
    ],
    fixes: [
      { id: 1, description: 'Ajustado erro ao abrir e fechar item da barra de navegação.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.1.0',
    date: new Date('2025-06-27T00:00:00'),
    description: 'Validador de documentos com IA.',
    type: 'minor',
    categories: ['backend', 'frontend', 'api'],
    features: [
      { id: 1, title: 'Validador de documentos', description: 'Agente de IA validador de contratos CEF + Confissão de Dívida Menin.' },
      { id: 2, title: 'Automação de Contratos', description: 'Automação de varredura do CV CRM que pega os clientes pendentes de validação, envia para o agente de IA e retorna o status automaticamente.' },
      { id: 3, title: 'Ferramentas - Validador', description: 'Novo campo criado para visualizar e gerenciar contratos em validação, com validador integrado e histórico de uso da automação.' },
    ],
    improvements: [],
    fixes: [
      { id: 1, description: 'Ajuste de responsividade nas telas do validador e correção no prompt do agente, para garantir mais assertividade nas conferências.' },
    ],
    breakingChanges: [], knownIssues: [],
  },
  {
    version: 'v2.0.0',
    date: new Date('2025-06-03T00:00:00'),
    description: 'Migração para servidor dedicado Railway.',
    type: 'major',
    categories: ['frontend', 'backend', 'api', 'security'],
    features: [],
    improvements: [
      { id: 1, category: 'Hospedagem', description: 'Alteração dos serviços de host para plataforma "railway" com servidor dedicado.' },
      { id: 2, category: 'Banco de dados', description: 'Banco de dados integrado no serviço "railway", limpeza dos dados anteriores para início do uso em produção.' },
    ],
    fixes: [],
    breakingChanges: [
      { id: 1, component: 'Servidor em testes', description: 'Novo servidor ainda em teste de performance e sofrendo oscilações.', migrationGuide: 'Em caso de problema, reportar erro no botão lateral do menu à esquerda.' },
    ],
    knownIssues: [],
  },
];

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
    frontend: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
    backend:  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    api:      'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    mobile:   'bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20',
    security: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
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
