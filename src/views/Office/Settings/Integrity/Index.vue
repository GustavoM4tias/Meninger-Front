<script setup>
// Validador de integridade de segurança — roda a suite do backend
// (security/integrityCheck.js) e exibe o resultado por check.
// Uso: depois de qualquer funcionalidade nova, rodar e garantir zero FAIL.

import { ref, computed } from 'vue';
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';
import { runRouteAudit } from '@/config/routeAudit';
import { usePermissionStore } from '@/stores/Settings/Permissions/permissionStore';

import PageContainer from '@/components/UI/PageContainer.vue';
import PageHeader from '@/components/UI/PageHeader.vue';
import PageHelp from '@/components/UI/PageHelp.vue';
import Surface from '@/components/UI/Surface.vue';
import Button from '@/components/UI/Button.vue';
import Badge from '@/components/UI/Badge.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Favorite from '@/components/config/Favorite.vue';

const report = ref(null);
const running = ref(false);
const error = ref('');
const expanded = ref(new Set());

const statusMeta = {
  ok:   { label: 'OK',      variant: 'success', icon: 'fa-circle-check' },
  warn: { label: 'Atenção', variant: 'warning', icon: 'fa-triangle-exclamation' },
  fail: { label: 'FALHA',   variant: 'danger',  icon: 'fa-circle-xmark' },
  info: { label: 'Info',    variant: 'neutral', icon: 'fa-circle-info' },
};

async function run() {
  running.value = true;
  error.value = '';
  try {
    report.value = await requestWithAuth('/admin/integrity-check', { method: 'POST' });
    expanded.value = new Set(
      (report.value?.checks || []).filter(c => c.status === 'fail').map(c => c.id)
    );
  } catch (e) {
    error.value = e.message || 'Erro ao rodar a validação.';
  } finally {
    running.value = false;
  }
}

function toggle(id) {
  const s = new Set(expanded.value);
  if (s.has(id)) s.delete(id); else s.add(id);
  expanded.value = s;
}

// ── Auditoria de rotas do FRONT (pontas soltas) ──────────────────────────────
// Calculada localmente (o front conhece as próprias rotas + navRegistry) —
// sempre atual com o build em produção, sem depender do backend. As telas
// travadas como somente-admin na tela de Alçadas entram como "admin".
const permissionStore = usePermissionStore();
const routeAudit = computed(() =>
  runRouteAudit({ adminOnlyRoutes: permissionStore.adminOnlyRoutes }));
const routeListOpen = ref(false);

const clsMeta = {
  gerenciada:  { label: 'Gerenciada (Alçadas)', variant: 'success' },
  admin:       { label: 'Exclusiva admin',      variant: 'accent' },
  livre:       { label: 'Sempre liberada',      variant: 'neutral' },
  publica:     { label: 'Pública',              variant: 'neutral' },
  ponta_solta: { label: 'PONTA SOLTA',          variant: 'danger' },
};
</script>

<template>
  <div class="min-h-[calc(100vh-3.5rem)]">
    <PageContainer size="lg">

      <PageHeader
        title="Integridade de segurança"
        subtitle="Valida que todas as rotas, alçadas, tools da Eme e o modelo de acesso estão dentro do padrão."
        icon="fas fa-shield-heart">
        <template #title>
          <span>Integridade de segurança</span>
          <Favorite :router="'/settings/integrity'" :section="'Integridade'" />
        </template>
        <template #actions>
          <PageHelp
            title="Como usar o validador"
            :steps="[
              { title: 'Rodar validação', text: 'Clique no botão e aguarde alguns segundos. A suite varre todas as rotas do servidor, as tools da Eme e o banco.' },
              { title: 'Ler o resultado', text: 'FALHA (vermelho) é quebra de padrão de segurança e deve ser corrigida antes de qualquer coisa. Atenção (amarelo) merece revisão. Info é só panorama.' },
              { title: 'Depois de nova funcionalidade', text: 'Sempre que uma tela ou API nova entrar, rode de novo: rota sem alçada acende FALHA sozinha.' },
            ]"
            :tips="[
              'A mesma checagem roda automaticamente a cada deploy (resumo no log do servidor).',
              'Exceções legítimas (webhooks, rotas públicas) vivem numa allowlist comentada em security/integrityCheck.js.',
            ]" />
          <Button :loading="running" icon="fas fa-play" @click="run">
            {{ running ? 'Validando…' : 'Rodar validação' }}
          </Button>
        </template>
      </PageHeader>

      <div v-if="error"
        class="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
        <i class="fas fa-circle-exclamation mr-1"></i>{{ error }}
      </div>

      <!-- ── Rotas do FRONT (sempre visível, calculado localmente) ────────── -->
      <Surface variant="raised" padding="none" class="overflow-hidden mb-4">
        <button class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-sunken/30 transition-colors"
          @click="routeListOpen = !routeListOpen">
          <i class="fas text-sm w-5 text-center"
            :class="routeAudit.healthy ? 'fa-route text-emerald-500' : 'fa-triangle-exclamation text-red-500'"></i>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-ink">Rotas do front (navbar × alçadas)</p>
            <p class="text-xs text-ink-muted truncate">
              {{ routeAudit.rows.length }} rotas ·
              {{ routeAudit.counts.gerenciada || 0 }} gerenciadas ·
              {{ routeAudit.counts.admin || 0 }} admin ·
              {{ routeAudit.counts.livre || 0 }} livres ·
              {{ routeAudit.counts.publica || 0 }} públicas
              <template v-if="routeAudit.loose.length"> · {{ routeAudit.loose.length }} PONTA(S) SOLTA(S)</template>
              <template v-if="routeAudit.deadLinks.length"> · {{ routeAudit.deadLinks.length }} link(s) morto(s) no menu</template>
            </p>
          </div>
          <Badge :variant="routeAudit.healthy ? 'success' : 'danger'" size="sm">
            {{ routeAudit.healthy ? 'Sem pontas soltas' : 'CORRIGIR' }}
          </Badge>
          <i class="fas fa-chevron-down text-ink-subtle text-xs transition-transform"
            :class="{ 'rotate-180': routeListOpen }"></i>
        </button>

        <div v-if="routeAudit.loose.length || routeAudit.deadLinks.length"
          class="border-t border-line bg-red-500/5 px-4 py-3 space-y-1">
          <p v-for="r in routeAudit.loose" :key="r.path" class="text-xs font-mono text-red-600 dark:text-red-400">
            <i class="fas fa-circle-exclamation mr-1"></i>{{ r.path }} — autenticada sem classificação (navbar/alçada/admin/livre)
          </p>
          <p v-for="d in routeAudit.deadLinks" :key="d" class="text-xs font-mono text-red-600 dark:text-red-400">
            <i class="fas fa-link-slash mr-1"></i>{{ d }} — item do menu sem rota correspondente
          </p>
        </div>

        <div v-if="routeListOpen" class="border-t border-line bg-surface-sunken/40 px-4 py-3">
          <ul class="space-y-1 max-h-80 overflow-y-auto">
            <li v-for="r in routeAudit.rows" :key="r.path"
              class="flex items-center justify-between gap-3 text-xs">
              <span class="font-mono text-ink-muted truncate" :title="r.reason || ''">{{ r.path }}</span>
              <Badge :variant="clsMeta[r.cls]?.variant || 'neutral'" size="sm" class="shrink-0">
                {{ clsMeta[r.cls]?.label || r.cls }}
              </Badge>
            </li>
          </ul>
        </div>
      </Surface>

      <EmptyState v-if="!report && !running"
        icon="fas fa-shield-halved" size="lg"
        title="Nenhuma validação do servidor nesta sessão"
        description="Clique em Rodar validação para varrer rotas de API, tools da Eme e banco.">
        <template #actions>
          <Button icon="fas fa-play" @click="run">Rodar validação</Button>
        </template>
      </EmptyState>

      <div v-else-if="running" class="animate-pulse space-y-3">
        <div v-for="i in 5" :key="i" class="h-14 bg-surface-sunken rounded-xl"></div>
      </div>

      <template v-else-if="report">
        <!-- Resumo -->
        <Surface variant="raised" padding="md" class="mb-4">
          <div class="flex flex-wrap items-center gap-3">
            <div class="h-11 w-11 rounded-xl grid place-items-center border shrink-0"
              :class="report.healthy
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'">
              <i class="fas text-lg" :class="report.healthy ? 'fa-shield-heart' : 'fa-shield-virus'"></i>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold text-ink">
                {{ report.healthy ? 'Sistema íntegro - nenhuma falha de segurança' : 'FALHAS ENCONTRADAS - corrigir antes de prosseguir' }}
              </h3>
              <p class="text-xs text-ink-muted mt-0.5">
                Rodado em {{ new Date(report.ranAt).toLocaleString('pt-BR') }} · {{ report.ms }}ms
              </p>
            </div>
            <div class="flex items-center gap-2">
              <Badge variant="danger" size="sm">{{ report.counts.fail || 0 }} falhas</Badge>
              <Badge variant="warning" size="sm">{{ report.counts.warn || 0 }} atenções</Badge>
              <Badge variant="success" size="sm">{{ report.counts.ok || 0 }} ok</Badge>
            </div>
          </div>
        </Surface>

        <!-- Checks -->
        <div class="space-y-2.5">
          <Surface v-for="c in report.checks" :key="c.id" variant="raised" padding="none" class="overflow-hidden">
            <button class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-sunken/30 transition-colors"
              @click="toggle(c.id)">
              <i class="fas text-sm w-5 text-center"
                :class="[statusMeta[c.status]?.icon,
                  c.status === 'ok' ? 'text-emerald-500'
                  : c.status === 'warn' ? 'text-amber-500'
                  : c.status === 'fail' ? 'text-red-500' : 'text-ink-subtle']"></i>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-ink truncate">{{ c.name }}</p>
                <p class="text-xs text-ink-muted truncate">{{ c.summary }}</p>
              </div>
              <Badge :variant="statusMeta[c.status]?.variant || 'neutral'" size="sm">
                {{ statusMeta[c.status]?.label }}
              </Badge>
              <i v-if="c.details?.length" class="fas fa-chevron-down text-ink-subtle text-xs transition-transform"
                :class="{ 'rotate-180': expanded.has(c.id) }"></i>
            </button>
            <div v-if="expanded.has(c.id) && c.details?.length"
              class="border-t border-line bg-surface-sunken/40 px-4 py-3">
              <ul class="space-y-1 max-h-64 overflow-y-auto">
                <li v-for="(d, i) in c.details" :key="i"
                  class="text-xs font-mono text-ink-muted leading-relaxed">
                  {{ d }}
                </li>
              </ul>
            </div>
          </Surface>
        </div>
      </template>
    </PageContainer>
  </div>
</template>
