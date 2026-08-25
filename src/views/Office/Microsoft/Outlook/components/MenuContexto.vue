<script setup>
// Menu do botão direito.
//
// Ele existe porque a caixa tinha as ferramentas e nenhum caminho até elas:
// mover só aparecia depois de abrir a mensagem, importância não existia, criar
// pasta não existia, e baixar o e-mail também não. Quem usa Outlook procura
// isso no botão direito - é o gesto, não uma preferência.
//
// Um componente só para os dois alvos (mensagem e pasta): o menu é a mesma
// mecânica (posicionar sem vazar da tela, fechar ao clicar fora, navegar pelo
// teclado) e só o conteúdo muda. Dois componentes seriam a mesma correção de
// posicionamento feita duas vezes.
//
// Quem decide O QUE aparece é quem chama, passando `itens`. Assim a permissão
// mora num lugar só: a tela já sabe se pode organizar ou enviar, e simplesmente
// não monta a linha que não pode.

import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  aberto: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  titulo: { type: String, default: '' },
  // [{ id, label, icone, perigo?, separador?, submenu?, desabilitado?, dica? }]
  itens: { type: Array, default: () => [] },
});

const emit = defineEmits(['fechar', 'acao']);

const menu = ref(null);
const submenuAberto = ref(null);
const foco = ref(-1);

const LARGURA = 232;

// Posiciona pelo espaço que existe, não pelo clique cru: perto da borda de
// baixo o menu abriria fora da tela.
const estilo = ref({ top: '0px', left: '0px' });

async function posicionar() {
  await nextTick();
  const el = menu.value;
  const alt = el?.offsetHeight || 320;
  const larg = el?.offsetWidth || LARGURA;

  let top = props.y;
  let left = props.x;
  if (top + alt > window.innerHeight - 8) top = Math.max(8, window.innerHeight - alt - 8);
  if (left + larg > window.innerWidth - 8) left = Math.max(8, props.x - larg);

  estilo.value = { top: `${top}px`, left: `${left}px` };
}

watch(() => props.aberto, (v) => {
  submenuAberto.value = null;
  foco.value = -1;
  if (v) posicionar();
});

const selecionaveis = computed(() => props.itens.filter(i => !i.separador && !i.desabilitado));

function escolher(item) {
  if (item.desabilitado || item.separador) return;
  if (item.submenu?.length) {
    submenuAberto.value = submenuAberto.value === item.id ? null : item.id;
    return;
  }
  emit('acao', { id: item.id });
  emit('fechar');
}

function escolherSub(pai, sub) {
  emit('acao', { id: pai.id, valor: sub.id, sub });
  emit('fechar');
}

function teclado(e) {
  if (!props.aberto) return;
  if (e.key === 'Escape') { emit('fechar'); return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const n = selecionaveis.value.length;
    if (!n) return;
    foco.value = (foco.value + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
  }
  if (e.key === 'Enter' && foco.value >= 0) {
    e.preventDefault();
    escolher(selecionaveis.value[foco.value]);
  }
}

function foraDaqui(e) {
  if (props.aberto && menu.value && !menu.value.contains(e.target)) emit('fechar');
}

onMounted(() => {
  document.addEventListener('mousedown', foraDaqui);
  document.addEventListener('keydown', teclado);
  window.addEventListener('resize', () => props.aberto && emit('fechar'));
});
onUnmounted(() => {
  document.removeEventListener('mousedown', foraDaqui);
  document.removeEventListener('keydown', teclado);
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-120 ease-out-expo"
      enter-from-class="opacity-0 scale-95"
      leave-active-class="transition duration-120" leave-to-class="opacity-0">
      <div v-if="aberto" ref="menu" :style="estilo"
        class="fixed z-[80] rounded-xl border border-line bg-surface-overlay shadow-overlay py-1.5"
        :style-width="LARGURA"
        style="min-width: 14.5rem"
        role="menu">

        <p v-if="titulo"
          class="px-3 pb-1.5 mb-1 border-b border-line text-micro font-semibold text-ink-subtle
                 uppercase tracking-wide truncate">
          {{ titulo }}
        </p>

        <template v-for="(it, i) in itens" :key="it.id || `sep-${i}`">
          <div v-if="it.separador" class="h-px bg-line my-1 mx-2"></div>

          <div v-else class="relative">
            <button type="button" role="menuitem"
              :disabled="it.desabilitado"
              :title="it.dica || ''"
              @click="escolher(it)"
              @mouseenter="it.submenu?.length && (submenuAberto = it.id)"
              class="w-full flex items-center gap-2.5 px-3 py-2 min-h-9 text-left text-xs
                     transition-colors duration-120"
              :class="[
                it.desabilitado ? 'text-ink-subtle cursor-not-allowed opacity-60'
                  : it.perigo ? 'text-ink hover:bg-data-neg-soft hover:text-data-neg'
                  : 'text-ink hover:bg-surface-sunken',
                foco >= 0 && selecionaveis[foco]?.id === it.id ? 'bg-surface-sunken' : '',
              ]">
              <i :class="it.icone" class="text-micro w-4 text-center shrink-0"
                :style="it.cor ? { color: it.cor } : undefined"></i>
              <span class="flex-1 truncate">{{ it.label }}</span>
              <span v-if="it.atalho" class="text-micro text-ink-subtle shrink-0">{{ it.atalho }}</span>
              <i v-if="it.submenu?.length" class="fas fa-chevron-right text-micro text-ink-subtle shrink-0"></i>
            </button>

            <!-- Submenu: mover para pasta, importância, categoria -->
            <Transition
              enter-active-class="transition duration-120 ease-out-expo"
              enter-from-class="opacity-0 -translate-x-1">
              <div v-if="submenuAberto === it.id && it.submenu?.length"
                class="ml-3 mr-1.5 mb-1 rounded-lg border border-line bg-surface-sunken py-1
                       max-h-56 overflow-y-auto">
                <button v-for="sub in it.submenu" :key="sub.id" type="button"
                  @click="escolherSub(it, sub)"
                  class="w-full flex items-center gap-2 px-2.5 py-1.5 min-h-8 text-left text-micro
                         text-ink-muted hover:bg-surface-hover hover:text-ink transition-colors duration-120"
                  :style="{ paddingLeft: `${0.625 + (sub.nivel || 0) * 0.7}rem` }">
                  <i v-if="sub.icone" :class="sub.icone" class="text-micro w-3.5 text-center shrink-0"
                    :style="sub.cor ? { color: sub.cor } : undefined"></i>
                  <span class="truncate flex-1">{{ sub.label }}</span>
                  <i v-if="sub.ativo" class="fas fa-check text-micro text-accent shrink-0"></i>
                </button>
              </div>
            </Transition>
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>
