<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

/**
 * Modal — padrão único do Office.
 *
 * TAMANHO por PROPÓSITO, não por gosto:
 *   sm | md      confirmar, formulário curto
 *   lg | xl      formulário longo, detalhe de um registro
 *   full         detalhe largo (até 1400px)
 *   screen       LISTAGEM DE REGISTROS — toma a tela inteira
 *
 * `screen` é o padrão de toda listagem: quando o modal existe para ler muitas
 * linhas, cartão flutuando no meio da tela é desperdício de área. Ele sobrepõe
 * tudo, sem borda e sem canto, e a lista ganha o espaço inteiro.
 *
 * NO CELULAR, qualquer tamanho vira tela cheia. Cartão de 90% de largura com
 * canto arredondado em 375px só rouba altura e deixa a lista com metade da
 * tela útil.
 */
const props = defineProps({
  open: { type: Boolean, default: false },
  size: { type: String, default: 'md' },           // sm | md | lg | xl | full | screen
  position: { type: String, default: 'center' },   // center | right | left
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  closeOnBackdrop: { type: Boolean, default: true },
  /* Desligue quando o conteúdo controla o próprio respiro e a própria altura
     (listagem com barra fixa embaixo). Evita a gambiarra de `-m-4` para
     cancelar o padding, que estraga o cálculo de `h-full`. */
  padded: { type: Boolean, default: true },
  hideClose: { type: Boolean, default: false },
  scrollable: { type: Boolean, default: true },
  // Sobreposição de modais (ex.: cartão do gerente sobre o detalhe da
  // imobiliária): passe um valor maior que 9999 no modal de cima.
  zIndex: { type: Number, default: 9999 },
});

const emit = defineEmits(['close', 'update:open']);

/* `max-w-none` no estreito: no celular o modal é sempre tela cheia, então a
   largura máxima só vale a partir de `sm`. */
const sizeMapCenter = {
  sm: 'max-w-none sm:max-w-sm', md: 'max-w-none sm:max-w-md',
  lg: 'max-w-none sm:max-w-2xl', xl: 'max-w-none sm:max-w-4xl',
  full: 'max-w-none sm:max-w-[min(96vw,1400px)]',
  screen: 'max-w-none',
};
const sizeMapDrawer = {
  sm: 'max-w-none sm:max-w-md', md: 'max-w-none sm:max-w-lg',
  lg: 'max-w-none sm:max-w-xl', xl: 'max-w-none sm:max-w-2xl',
  full: 'max-w-none sm:max-w-[min(96vw,900px)]',
  screen: 'max-w-none',
};

const isScreen = computed(() => props.size === 'screen');

/* ── Camadas ──────────────────────────────────────────────────────────────
   `screen` é uma camada de PÁGINA, não um diálogo: ele já não cobre a nav, e
   por isso também não pode ficar na frente dela. Com z 9999 a sidebar abria
   por trás do modal - o menu respondia ao clique e não aparecia.

   A ordem que vale:

     conteúdo da página   auto
     ActionBar            10    flutua sobre o conteúdo
     modal `screen`       20    cobre a página, não a nav
     nav                  30-60 backdrop, sidebar, topbar, flyout
     diálogo              9999  bloqueia tudo, inclusive a nav

   Diálogo continua em 9999 de propósito: uma confirmação tem que barrar a
   navegação, senão a pessoa sai no meio da decisão. */
const zEfetivo = computed(() => (isScreen.value && props.zIndex === 9999 ? 20 : props.zIndex));

/* `screen` respeita a NAV inteira, não só a barra de cima.
   A sidebar tem movimento lateral (rail de 3.5rem ↔ expandida de 18rem) e o
   modal é teleportado para o <body>, então não enxerga o estado dela. A nav
   publica as medidas em CSS vars no <html> (ver Nav.vue) e o modal apenas as
   consome - inclusive a transição, então ele desliza junto quando a sidebar
   recolhe ou expande.

   No celular as vars valem 0px de sidebar (lá ela é overlay) e 4rem de topo,
   então o modal ocupa a largura toda e começa abaixo da barra.

   Os fallbacks cobrem o caso de o modal abrir fora do shell do Office (login,
   link público): sem nav, sem recuo. */
const screenInsetStyle = computed(() => (isScreen.value
    ? {
        top: 'var(--nav-topbar-h, 0px)',
        left: 'var(--nav-sidebar-w, 0px)',
        right: '0px',
        bottom: '0px',
        transition: 'left 200ms cubic-bezier(0.16, 1, 0.3, 1)',
    }
    : null));

const isDrawer = computed(() => props.position === 'right' || props.position === 'left');

const sizeClass = computed(() =>
  (isDrawer.value ? sizeMapDrawer : sizeMapCenter)[props.size] || sizeMapCenter.md
);

const wrapperClass = computed(() => {
  if (props.position === 'right') return 'justify-end items-stretch p-0';
  if (props.position === 'left')  return 'justify-start items-stretch p-0';
  if (isScreen.value)             return 'items-stretch justify-center p-0';
  /* Sem padding no estreito: o painel encosta nas bordas e vira tela cheia. */
  return 'items-center justify-center p-0 sm:p-6';
});

const panelClass = computed(() => {
  if (props.position === 'right') {
    return 'h-full rounded-none border-l shadow-overlay';
  }
  if (props.position === 'left') {
    return 'h-full rounded-none border-r shadow-overlay';
  }
  /* Tela cheia: sem canto, sem borda, altura toda. */
  if (isScreen.value) return 'h-full rounded-none border-0 max-h-none';
  /* Demais tamanhos: tela cheia no estreito, cartão a partir de `sm`. */
  return 'h-full sm:h-auto max-h-none sm:max-h-[92vh] rounded-none sm:rounded-2xl border-0 sm:border shadow-overlay';
});

const enterFromClass = computed(() => {
  if (props.position === 'right') return 'opacity-0 translate-x-8';
  if (props.position === 'left')  return 'opacity-0 -translate-x-8';
  /* Tela cheia sobe em vez de crescer: escalar a tela inteira embrulha o
     estômago e ainda pesa para animar. */
  if (isScreen.value) return 'opacity-0 translate-y-6';
  return 'opacity-0 scale-95 translate-y-4';
});
const leaveToClass = computed(() => {
  if (props.position === 'right') return 'opacity-0 translate-x-8';
  if (props.position === 'left')  return 'opacity-0 -translate-x-8';
  if (isScreen.value) return 'opacity-0 translate-y-4';
  return 'opacity-0 scale-95';
});

/* O painel ENTRA em 300ms com translate + scale. Durante esse tempo ele se
   move debaixo do cursor: o `mousedown` cai num alvo e o `mouseup` em outro, e
   o navegador não gera `click` nenhum. O clique some sem deixar rastro - a
   pessoa aperta "Cancelar", nada acontece, e ela aperta de novo. Num diálogo
   que age sobre 15 pessoas, apertar duas vezes é o oposto do que se quer.

   Enquanto a animação corre, a camada inteira fica inerte (nem painel nem
   backdrop respondem), e volta a responder quando ela termina. O Escape
   continua valendo o tempo todo: teclado não depende de posição. */
const pronto = ref(false);

function close() {
  emit('close');
  emit('update:open', false);
}

// Como o painel tem @mousedown.stop, qualquer mousedown que chega aqui veio
// do wrapper OU do backdrop (filho visual). Em ambos os casos: fechar.
function onBackdrop() {
  if (!pronto.value) return;
  if (props.closeOnBackdrop) close();
}

function onKey(e) {
  if (e.key === 'Escape' && props.open) close();
}

function applyOpen(v) {
  if (typeof window === 'undefined') return;
  if (v) {
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
  } else {
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
  }
}

onMounted(() => applyOpen(props.open));
watch(() => props.open, (v) => {
  applyOpen(v);
  if (!v) pronto.value = false;   // re-arma para a próxima abertura
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<template>
  <teleport to="body">
    <transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        :class="[isScreen ? 'fixed' : 'fixed inset-0', 'flex', wrapperClass,
                 pronto ? '' : 'pointer-events-none']"
        :style="{ zIndex: zEfetivo, ...(screenInsetStyle || {}) }"
        @mousedown="onBackdrop"
      >
        <div class="absolute inset-0 bg-scrim/70"></div>

        <transition
          appear
          enter-active-class="transition-all duration-300 ease-out-expo"
          :enter-from-class="enterFromClass"
          enter-to-class="opacity-100 scale-100 translate-y-0 translate-x-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0 translate-x-0"
          :leave-to-class="leaveToClass"
          @before-enter="pronto = false"
          @after-enter="pronto = true"
          @after-appear="pronto = true"
        >
        <div
          :class="[
            'relative w-full border-none border-line flex flex-col overflow-hidden',
            /* `screen` é uma PÁGINA, então usa o chão da plataforma
               (bg-surface). Cartão flutuante usa a superfície elevada, que é o
               que o separa do fundo - num modal que ocupa tudo, esse degrau
               não separa nada e só deixa a cor diferente do resto do sistema. */
            isScreen ? 'bg-surface' : 'bg-surface-raised surface-gradient',
            sizeClass, panelClass,
          ]"
          @mousedown.stop
        >
          <!-- Header -->
          <div v-if="$slots.header || title || !hideClose"
               class="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-line shrink-0">
            <div class="flex-1 min-w-0">
              <slot name="header">
                <h2 v-if="title" class="text-base font-semibold text-ink truncate">{{ title }}</h2>
                <p v-if="subtitle" class="text-xs text-ink-muted mt-0.5">{{ subtitle }}</p>
              </slot>
            </div>
            <button v-if="!hideClose" type="button" @click="close"
              class="h-10 w-10 grid place-items-center rounded-lg text-ink-muted
                     hover:bg-surface-sunken hover:text-ink transition-colors duration-120
                     shrink-0 focus-ring"
              aria-label="Fechar">
              <i class="fas fa-xmark text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div :class="['flex-1 min-h-0',
                        scrollable ? 'overflow-y-auto' : 'overflow-hidden',
                        padded ? 'p-4 sm:p-5' : '']">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer"
               class="flex flex-wrap items-center justify-end gap-2 px-4 sm:px-5 py-3 sm:py-4 border-t border-line bg-surface shrink-0">
            <slot name="footer" />
          </div>
        </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>
