<script setup>
/**
 * Panel — o bloco de conteúdo do Office.
 * ─────────────────────────────────────────────────────────────────────────────
 * É o segundo degrau da escada de elevação (chão → PAINEL → foco → flutuante).
 * Tudo que hoje é escrito à mão como
 * `bg-surface-raised border border-line rounded-xl shadow-soft` vira isto.
 *
 * Cuida sozinho de carga, vazio e cabeçalho com ação no canto, que é onde as
 * telas divergiam mais.
 *
 *   <Panel title="Vendas por empreendimento" icon="fas fa-chart-column"
 *          :loading="carregando" :empty="!linhas.length">
 *     <template #actions><Button size="sm" variant="ghost">Exportar</Button></template>
 *     ...conteúdo...
 *   </Panel>
 */
import EmptyState from './EmptyState.vue';
import Skeleton from './Skeleton.vue';

defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  icon: { type: String, default: '' },
  /* padding interno; desligue para conteúdo que encosta na borda (tabela) */
  padded: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
  /* forma do esqueleto enquanto carrega: text | row | table | chart | stat */
  loadingVariant: { type: String, default: 'text' },
  empty: { type: Boolean, default: false },
  emptyIcon: { type: String, default: 'far fa-folder-open' },
  emptyTitle: { type: String, default: 'Nada por aqui' },
  emptyText: { type: String, default: '' },
});
</script>

<template>
  <section class="panel flex flex-col min-w-0">
    <!-- cabeçalho com altura mínima fixa: a linha não pula quando a ação
         aparece ou some -->
    <!-- `min-w-0` em toda a cadeia: sem isso o título longo estica o flex e
         empurra as ações para fora, ou quebra em duas linhas. -->
    <header v-if="title || $slots.actions || $slots.title" class="panel-head py-2 gap-3">
      <div class="flex items-center gap-2.5 min-w-0 flex-1">
        <span v-if="icon" class="h-7 w-7 rounded-lg grid place-items-center text-xs shrink-0
                                 bg-accent-soft text-accent">
          <i :class="icon"></i>
        </span>
        <div class="min-w-0">
          <h2 class="text-sm font-semibold text-ink truncate" :title="title || undefined">
            <slot name="title">{{ title }}</slot>
          </h2>
          <p v-if="subtitle || $slots.subtitle" class="text-micro text-ink-subtle truncate">
            <slot name="subtitle">{{ subtitle }}</slot>
          </p>
        </div>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-1.5 shrink-0">
        <slot name="actions" />
      </div>
    </header>

    <div class="flex-1 min-w-0" :class="padded ? 'p-4' : ''">
      <Skeleton v-if="loading" :variant="loadingVariant" :lines="4" />
      <EmptyState v-else-if="empty" size="sm" :icon="emptyIcon" :title="emptyTitle" :description="emptyText">
        <template v-if="$slots.emptyActions" #actions><slot name="emptyActions" /></template>
      </EmptyState>
      <slot v-else />
    </div>

    <footer v-if="$slots.footer" class="px-4 py-2.5 border-t border-line-subtle text-micro text-ink-subtle">
      <slot name="footer" />
    </footer>
  </section>
</template>
