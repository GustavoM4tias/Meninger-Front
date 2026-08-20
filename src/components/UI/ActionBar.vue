<script setup>
/**
 * ActionBar — barra de ação para seleção múltipla.
 * ─────────────────────────────────────────────────────────────────────────────
 * Aparece FIXA no rodapé assim que algo é selecionado, e some quando a seleção
 * é limpa. Fica no rodapé porque no celular é onde o polegar alcança, e no
 * monitor porque a ação sobre uma seleção pertence ao fim do fluxo (escolhe,
 * depois faz), não ao topo da página.
 *
 * Acompanha a nav: usa as mesmas CSS vars do modal de tela cheia, então não
 * cobre a sidebar e desliza junto quando ela recolhe.
 *
 * Fica na camada 10: acima do conteúdo, abaixo do modal de tela cheia (20) e
 * bem abaixo da nav (30-60). É uma barra da página, não um diálogo.
 *
 *   <ActionBar :count="n" unit="pastas" @clear="limpar">
 *     <Button size="sm" @click="abrir">Ver pastas</Button>
 *   </ActionBar>
 */
defineProps({
  count: { type: Number, default: 0 },
  /* o que está selecionado, no plural */
  unit: { type: String, default: 'itens' },
  /* resumo do que a seleção significa (ex.: "2 empreendimentos · 1 etapa") */
  summary: { type: String, default: '' },
});

const emit = defineEmits(['clear']);
</script>

<template>
  <teleport to="body">
    <transition
      enter-active-class="transition-all duration-200 ease-out-expo"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4">
      <div v-if="count > 0"
        class="fixed bottom-0 right-0 z-10 p-3 sm:p-4"
        :style="{ left: 'var(--nav-sidebar-w, 0px)', transition: 'left 200ms cubic-bezier(0.16, 1, 0.3, 1)' }">
        <div class="mx-auto max-w-3xl panel shadow-overlay
                    flex items-center gap-3 px-3 sm:px-4 py-2.5">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-ink tabular-nums">
              {{ count }} {{ unit }}
            </p>
            <p v-if="summary" class="text-micro text-ink-subtle truncate">{{ summary }}</p>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <slot />
            <button type="button" aria-label="Limpar seleção" v-tippy="'Limpar seleção'"
              class="h-10 w-10 grid place-items-center rounded-lg text-ink-subtle
                     hover:text-ink hover:bg-surface-sunken transition-colors duration-120 focus-ring"
              @click="emit('clear')">
              <i class="fas fa-xmark text-sm"></i>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>
