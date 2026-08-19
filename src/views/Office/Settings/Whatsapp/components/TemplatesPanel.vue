<script setup>
// Templates separados por DESTINO (colaborador × cliente) e FUNCIONALIDADE.
//
// Antes a lista era um despejo plano vindo da Meta, agrupado por status: dava
// pra ver que existiam 12 templates e nenhum pra que servia. Agora cada um
// aparece embaixo do fluxo que o usa, com gatilho, variáveis e botões — e o que
// sobra (existe na Meta e ninguém usa) fica separado no fim.
import { onMounted, ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useWhatsappStore } from '@/stores/Whatsapp/whatsappStore';
import Button from '@/components/UI/Button.vue';
import Spinner from '@/components/UI/Spinner.vue';
import TemplateCreateModal from './TemplateCreateModal.vue';

const store = useWhatsappStore();
const showCreate = ref(false);
const expanded = ref(null); // name::language aberto
const showOrphans = ref(false);

onMounted(() => store.fetchTemplates());

const onCreated = () => store.fetchTemplates();
const onSync = () => store.syncTemplates().catch(() => null);

const keyOf = (t) => `${t.name}::${t.language}`;
const toggle = (t) => { expanded.value = expanded.value === keyOf(t) ? null : keyOf(t); };

// Agrupa por destino e, dentro dele, por funcionalidade.
const groups = computed(() => {
  const byAudience = new Map();
  for (const t of store.catalog) {
    if (!byAudience.has(t.audience)) byAudience.set(t.audience, new Map());
    const feats = byAudience.get(t.audience);
    if (!feats.has(t.feature)) {
      feats.set(t.feature, { key: t.feature, label: t.featureLabel, icon: t.featureIcon, screen: t.featureScreen, items: [] });
    }
    feats.get(t.feature).items.push(t);
  }
  // Cliente primeiro: é o que sai da empresa e merece atenção antes.
  const order = ['cliente', 'interno'];
  return order.filter(a => byAudience.has(a)).map(a => ({
    key: a,
    label: a === 'cliente' ? 'Cliente' : 'Colaborador',
    hint: a === 'cliente'
      ? 'Sai para gente de fora (titular de reserva, lead). Copy e horário pesam mais aqui.'
      : 'Vai para quem tem conta no Office, no telefone do perfil.',
    icon: a === 'cliente' ? 'fas fa-user' : 'fas fa-user-tie',
    features: Array.from(byAudience.get(a).values()),
  }));
});

const broken = computed(() => store.missingTemplates.filter(t => t.critical));

const STATUS_CLS = {
  APPROVED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  PENDING:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  REJECTED: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  AUSENTE:  'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  DISABLED: 'bg-surface-sunken text-ink-muted border-line',
  PAUSED:   'bg-surface-sunken text-ink-muted border-line',
};
const statusCls = (s) => STATUS_CLS[s] || 'bg-surface-sunken text-ink-muted border-line';

// Categoria vem da Meta, não do que pedimos: ela reclassifica na aprovação.
// MARKETING ganha destaque porque é o que custa (~9x a conversa) e o que pesa na
// qualidade do número - aqui o número é COMPARTILHADO com boleto e alerta.
const CATEGORY_CLS = {
  MARKETING:      'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  UTILITY:        'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  AUTHENTICATION: 'bg-surface-sunken text-ink-muted border-line',
};
const categoryCls = (c) => CATEGORY_CLS[c] || 'bg-surface-sunken text-ink-subtle border-line';

const onDelete = async (t) => {
  if (!confirm(`Excluir o template "${t.name}"? Isso remove na Meta também.`)) return;
  try {
    await store.deleteTemplate(t.name);
  } catch (e) {
    // 409 = template em uso por fluxo crítico; oferece a confirmação extra.
    const msg = String(e?.message || '');
    if (msg.includes('TEMPLATE_IN_USE') && confirm(`${t.name} está em uso por um fluxo crítico. Excluir mesmo assim?`)) {
      await store.deleteTemplate(t.name, { force: true }).catch(err => alert('Falha ao excluir: ' + (err?.message || '')));
      return;
    }
    alert('Falha ao excluir: ' + msg);
  }
};
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <p class="text-xs text-ink-muted flex-1 min-w-[200px]">
        Cada template abaixo pertence a um fluxo. Só <strong>APPROVED</strong> é usado em envio, e
        template aprovado na Meta é imutável: pra mudar a copy, crie a versão seguinte (v2, v3).
      </p>
      <div class="flex gap-2">
        <Button :loading="store.syncing" icon="fas fa-rotate" size="sm" variant="secondary" @click="onSync">
          Sincronizar
        </Button>
        <Button icon="fas fa-plus" size="sm" @click="showCreate = true">Novo template</Button>
      </div>
    </div>

    <TemplateCreateModal v-model:open="showCreate" @created="onCreated" />

    <div v-if="store.loadingTemplates" class="py-12 grid place-items-center"><Spinner /></div>

    <template v-else>
      <!-- Fluxo quebrado: template obrigatório sem aprovação -->
      <div v-if="broken.length"
        class="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 space-y-1">
        <p class="text-xs font-semibold text-red-600 dark:text-red-400">
          <i class="fas fa-triangle-exclamation mr-1"></i>
          {{ broken.length }} fluxo(s) sem template aprovado
        </p>
        <p v-for="t in broken" :key="t.name" class="text-xs text-ink">
          <strong>{{ t.featureLabel }}</strong> depende de
          <code class="font-mono">{{ t.name }}</code> ({{ t.status }}) - {{ t.purpose }}
        </p>
      </div>

      <!-- Catálogo por destino > funcionalidade -->
      <section v-for="g in groups" :key="g.key" class="space-y-3">
        <header class="flex items-start gap-2">
          <i :class="[g.icon, 'text-ink-subtle mt-0.5']"></i>
          <div>
            <h3 class="text-sm font-semibold text-ink">{{ g.label }}</h3>
            <p class="text-xs text-ink-muted">{{ g.hint }}</p>
          </div>
        </header>

        <div v-for="f in g.features" :key="f.key"
          class="rounded-xl border border-line bg-surface-raised overflow-hidden">
          <div class="px-4 py-2.5 border-b border-line bg-surface-sunken/40 flex items-center gap-2">
            <i :class="[f.icon, 'text-[11px] text-ink-subtle']"></i>
            <span class="text-[11px] font-mono uppercase tracking-wider text-ink-subtle">{{ f.label }}</span>
            <RouterLink v-if="f.screen" :to="f.screen"
              class="ml-auto text-[11px] text-accent hover:underline">abrir tela</RouterLink>
          </div>

          <div class="divide-y divide-line">
            <div v-for="t in f.items" :key="keyOf(t)">
              <button type="button" @click="toggle(t)"
                class="w-full text-left px-4 py-3 min-h-[44px] hover:bg-surface-sunken/40 transition-colors">
                <div class="flex items-start gap-3">
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-ink truncate flex items-center gap-2">
                      {{ t.name }}
                      <span v-if="t.fallbackOf" v-tippy="`Só entra se ${t.fallbackOf} não estiver aprovado`"
                        class="text-[10px] px-1.5 py-0.5 rounded border border-line text-ink-subtle">reserva</span>
                    </p>
                    <p class="text-xs text-ink-muted line-clamp-2 mt-0.5">{{ t.purpose }}</p>
                  </div>
                  <div class="shrink-0 flex flex-col items-end gap-1">
                    <span :class="['text-[11px] px-2 py-0.5 rounded-md border', statusCls(t.status)]">
                      {{ t.status }}
                    </span>
                    <span :class="['text-[11px] px-2 py-0.5 rounded-md border', categoryCls(t.category)]"
                      v-tippy="t.categoryReclassified
                        ? `Enviado como ${t.categoryIntended}; a Meta reclassificou para ${t.category}.`
                        : 'Categoria definida pela Meta na aprovação.'">
                      {{ t.category || 'sem categoria' }}
                      <i v-if="t.categoryReclassified" class="fas fa-arrow-right-arrow-left ml-0.5 text-[9px]"></i>
                    </span>
                  </div>
                </div>
              </button>

              <div v-if="expanded === keyOf(t)" class="px-4 pb-4 -mt-1 space-y-3 text-xs">
                <div v-if="t.variablesMismatch"
                  class="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-ink">
                  A Meta espera {{ t.variablesCount }} variável(is) e o código manda {{ t.variables.length }}.
                  O envio falha com VARIABLES_MISMATCH.
                </div>

                <div v-if="t.categoryReclassified"
                  class="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-ink">
                  Enviado como <strong>{{ t.categoryIntended }}</strong> e reclassificado pela Meta para
                  <strong>{{ t.category }}</strong> na aprovação. Quem decide é a copy, não o pedido.
                  Marketing custa mais por conversa e pesa mais na qualidade do número.
                </div>

                <div>
                  <p class="text-ink-subtle mb-1">Dispara quando</p>
                  <p class="text-ink">{{ t.trigger }}</p>
                </div>

                <div v-if="t.variables?.length">
                  <p class="text-ink-subtle mb-1">Variáveis, na ordem</p>
                  <ol class="space-y-0.5">
                    <li v-for="(v, i) in t.variables" :key="i" class="text-ink">
                      <code class="font-mono text-ink-muted">&#123;&#123;{{ i + 1 }}&#125;&#125;</code> {{ v }}
                    </li>
                  </ol>
                </div>

                <div v-if="t.buttons?.length">
                  <p class="text-ink-subtle mb-1">Botões</p>
                  <p v-for="b in t.buttons" :key="b.text" class="text-ink">
                    <strong>{{ b.text }}</strong> - {{ b.does }}
                  </p>
                </div>

                <div v-if="t.header"><p class="text-ink-subtle mb-1">Cabeçalho</p><p class="text-ink">{{ t.header }}</p></div>
                <div v-if="t.note" class="text-ink-muted">{{ t.note }}</div>

                <div class="flex flex-wrap gap-2 pt-1">
                  <span :class="['px-2 py-0.5 rounded-md border', categoryCls(t.category)]">
                    {{ t.category || 'sem categoria na Meta' }}
                  </span>
                  <span class="px-2 py-0.5 rounded-md border border-line bg-surface-sunken text-ink-muted">
                    {{ t.managedBy === 'automacao' ? 'trocável em Automações' : 'fixo no código' }}
                  </span>
                  <span v-if="t.autoProvisioned"
                    class="px-2 py-0.5 rounded-md border border-line bg-surface-sunken text-ink-muted">
                    recriado no boot se sumir
                  </span>
                  <span v-if="t.critical"
                    class="px-2 py-0.5 rounded-md border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400">
                    crítico
                  </span>
                </div>

                <p class="text-ink-subtle font-mono text-[11px]">{{ t.source }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Sobras: existem na Meta e nenhum fluxo usa -->
      <section v-if="store.orphanTemplates.length" class="space-y-2">
        <button type="button" @click="showOrphans = !showOrphans"
          class="w-full flex items-center justify-between gap-2 rounded-xl border border-line
                 bg-surface-raised px-4 py-3 min-h-[44px] text-left">
          <span class="text-xs text-ink">
            <strong>{{ store.orphanTemplates.length }}</strong> template(s) na Meta que nenhum fluxo usa
          </span>
          <i :class="['fas text-[11px] text-ink-subtle', showOrphans ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
        </button>

        <div v-if="showOrphans" class="rounded-xl border border-line bg-surface-raised divide-y divide-line overflow-hidden">
          <div v-for="t in store.orphanTemplates" :key="t.metaId"
            class="group px-4 py-3 flex items-center gap-3 text-sm">
            <div class="min-w-0 flex-1">
              <p class="font-medium text-ink truncate">{{ t.name }}</p>
              <p v-if="t.bodyText" class="text-xs text-ink-muted line-clamp-1">{{ t.bodyText }}</p>
            </div>
            <span class="text-xs text-ink-subtle hidden sm:block">{{ t.language }}</span>
            <span v-if="t.category" :class="['text-[11px] px-2 py-0.5 rounded-md border hidden sm:block', categoryCls(t.category)]">{{ t.category }}</span>
            <span :class="['text-[11px] px-2 py-0.5 rounded-md border', statusCls(t.status)]">{{ t.status }}</span>
            <button type="button" @click="onDelete(t)"
              class="h-8 w-8 grid place-items-center rounded-md text-ink-subtle
                     hover:bg-red-500/10 hover:text-red-500 transition-colors"
              title="Excluir template">
              <i class="fas fa-trash text-[11px]"></i>
            </button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
