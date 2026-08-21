<script setup>
/**
 * Aba TELAS — o sujeito aqui é a tela, não a pessoa.
 *
 * Antes isto era um bloco solto no fim da aba Usuários ("telas travadas"), o
 * que obrigava a abrir alguém para mexer em algo que não é de ninguém: travar
 * uma tela atinge todo mundo de uma vez.
 *
 * A aba também é o primeiro lugar do sistema a mostrar as AÇÕES dentro da tela
 * (lib/screenCapabilities.js no backend). A alçada continua sendo por tela; o
 * que muda é que agora dá para ler "Boleto Caixa: histórico e operação por
 * alçada, configuração só admin" em vez de adivinhar.
 */
import { ref, computed } from 'vue';
import Panel from '@/components/UI/Panel.vue';
import Badge from '@/components/UI/Badge.vue';
import Button from '@/components/UI/Button.vue';
import Input from '@/components/UI/Input.vue';
import EmptyState from '@/components/UI/EmptyState.vue';
import Skeleton from '@/components/UI/Skeleton.vue';

const props = defineProps({
  /* [{ key, label, pages: [{route, name, icon}] }] — categorias delegáveis */
  grupos: { type: Array, default: () => [] },
  adminOnlyPages: { type: Array, default: () => [] },
  alwaysFreePages: { type: Array, default: () => [] },
  /* { '/rota': { actions: [{action, rule}], delegableActions, adminActions } } */
  capabilities: { type: Object, default: () => ({}) },
  /* { '/rota': quantidade de pessoas com a tela hoje } */
  alcance: { type: Object, default: () => ({}) },
  lockedRoutes: { type: Object, default: () => new Set() },
  orphanPolicies: { type: Array, default: () => [] },
  retired: { type: Array, default: () => [] },
  exclusive: { type: Array, default: () => [] },
  busy: { type: String, default: '' },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['lock', 'unlock']);

const busca = ref('');

const casa = (p) => {
  const q = busca.value.trim().toLowerCase();
  if (!q) return true;
  return p.name.toLowerCase().includes(q) || p.route.toLowerCase().includes(q);
};

const gruposFiltrados = computed(() => props.grupos
  .map(g => ({ ...g, pages: g.pages.filter(casa) }))
  .filter(g => g.pages.length));

const totalComAcoes = computed(() => Object.keys(props.capabilities).length);

const REGRA = {
  screen: { texto: 'por alçada', variante: 'accent', dica: 'Quem tem a tela pode fazer' },
  admin: { texto: 'só admin', variante: 'warning', dica: 'Nem quem tem a tela faz: exige administrador' },
};
</script>

<template>
  <div class="space-y-4">
    <!-- Explicação curta: a aba mistura dois assuntos (trava e ações) e é
         preciso deixar claro que só o primeiro é editável aqui. -->
    <Panel padded>
      <div class="flex flex-col sm:flex-row sm:items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-sm text-ink">
            Travar uma tela tira ela de <b>todos os não-administradores</b> de uma vez -
            menu, rota, API e a Eme fecham juntos, sem depender de perfil.
          </p>
          <p class="text-micro text-ink-subtle mt-1">
            As <b>ações</b> de cada tela vêm do código e não se editam aqui: elas dizem o que
            a alçada libera por dentro. {{ totalComAcoes }} telas já têm ações declaradas.
          </p>
        </div>
        <div class="w-full sm:w-72 shrink-0">
          <Input v-model="busca" placeholder="Buscar tela ou rota" iconLeft="fas fa-magnifying-glass" />
        </div>
      </div>
    </Panel>

    <Skeleton v-if="loading" variant="table" :lines="8" />

    <template v-else>
      <EmptyState v-if="!gruposFiltrados.length" icon="fas fa-magnifying-glass"
        title="Nenhuma tela encontrada" description="Ajuste a busca para ver as telas delegáveis." />

      <Panel v-for="grupo in gruposFiltrados" :key="grupo.key" :padded="false" :title="grupo.label">
        <ul class="divide-y divide-line-subtle">
          <li v-for="page in grupo.pages" :key="page.route"
            class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-ink truncate flex items-center gap-1.5">
                <i v-if="page.icon" :class="[page.icon, 'text-micro text-ink-subtle shrink-0']"></i>
                {{ page.name }}
                <Badge v-if="lockedRoutes.has(page.route.toLowerCase())" variant="warning" size="sm">
                  somente admin
                </Badge>
              </p>
              <p class="text-micro font-mono text-ink-subtle truncate">{{ page.route }}</p>

              <!-- Ações da tela: o que a alçada libera por dentro -->
              <div v-if="capabilities[page.route]" class="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span v-for="a in capabilities[page.route].actions" :key="a.action"
                  v-tippy="REGRA[a.rule]?.dica"
                  class="inline-flex items-center gap-1 text-micro">
                  <Badge :variant="REGRA[a.rule]?.variante || 'neutral'" size="sm">
                    {{ a.action }} · {{ REGRA[a.rule]?.texto || a.rule }}
                  </Badge>
                </span>
              </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <span class="text-micro text-ink-subtle tabular-nums whitespace-nowrap"
                v-tippy="'Pessoas que têm esta tela hoje (fora administradores)'">
                {{ alcance[page.route] || 0 }} pessoa{{ (alcance[page.route] || 0) === 1 ? '' : 's' }}
              </span>

              <Button v-if="lockedRoutes.has(page.route.toLowerCase())"
                size="sm" variant="secondary" icon="fas fa-lock-open"
                :loading="busy === page.route" @click="emit('unlock', page)">
                Destravar
              </Button>
              <Button v-else size="sm" variant="ghost" icon="fas fa-lock"
                :loading="busy === page.route" @click="emit('lock', page)">
                Travar
              </Button>
            </div>
          </li>
        </ul>
      </Panel>

      <!-- Trava apontando para rota que não existe mais no menu -->
      <Panel v-if="orphanPolicies.length" :padded="false"
        title="Travas sem tela correspondente"
        subtitle="A tela mudou de endereço ou saiu do sistema. Destrave para limpar.">
        <ul class="divide-y divide-line-subtle">
          <li v-for="p in orphanPolicies" :key="p.route"
            class="flex items-center gap-3 px-4 py-2.5">
            <span class="min-w-0 flex-1 text-micro font-mono text-ink-muted truncate">{{ p.route }}</span>
            <Button size="sm" variant="ghost" icon="fas fa-lock-open"
              :loading="busy === p.route" @click="emit('unlock', { route: p.route, name: p.route })">
              Destravar
            </Button>
          </li>
        </ul>
      </Panel>

      <!-- Aposentadas: o boot tira sozinho, e a tela precisa dizer isso -->
      <Panel v-if="retired.length || exclusive.length" :padded="false"
        title="Rotas aposentadas"
        subtitle="Saem de perfis e exceções a cada reinício do sistema. Religar aqui não adianta.">
        <ul class="divide-y divide-line-subtle">
          <li v-for="r in retired" :key="r.route" class="px-4 py-2.5">
            <p class="text-micro font-mono text-ink-muted">{{ r.route }}</p>
            <p class="text-xs text-ink-subtle mt-0.5">{{ r.reason }}</p>
          </li>
          <li v-for="e in exclusive" :key="e.route" class="px-4 py-2.5">
            <p class="text-micro font-mono text-ink-muted">
              {{ e.route }}
              <Badge variant="info" size="sm" class="ml-1.5">só em {{ e.profile }}</Badge>
            </p>
            <p class="text-xs text-ink-subtle mt-0.5">{{ e.reason }}</p>
          </li>
        </ul>
      </Panel>

      <!-- Informativo: fora de alçada por natureza -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Panel :padded="false" title="Somente admin por código"
          subtitle="Não aparecem nas alçadas e não podem ser delegadas.">
          <ul class="divide-y divide-line-subtle">
            <li v-for="p in adminOnlyPages" :key="p.route" class="px-4 py-2 flex items-center gap-2">
              <span class="text-sm text-ink truncate flex-1">{{ p.name }}</span>
              <span class="text-micro font-mono text-ink-subtle truncate">{{ p.route }}</span>
            </li>
          </ul>
        </Panel>

        <Panel :padded="false" title="Sempre liberadas"
          subtitle="Pessoais ou de uso geral: todo mundo tem, independente de alçada.">
          <ul class="divide-y divide-line-subtle">
            <li v-for="p in alwaysFreePages" :key="p.route" class="px-4 py-2 flex items-center gap-2">
              <span class="text-sm text-ink truncate flex-1">{{ p.name }}</span>
              <span class="text-micro font-mono text-ink-subtle truncate">{{ p.route }}</span>
            </li>
          </ul>
        </Panel>
      </div>
    </template>
  </div>
</template>
