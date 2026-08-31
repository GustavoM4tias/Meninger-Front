<script setup>
// Um aviso na lista do sino. O MESMO card serve a caixa de entrada (a tela usa
// este componente com `size="lg"`), então corrigir aqui corrige nos dois lugares
// — antes eram duas cópias com mapas de ícone diferentes e uma delas usava cor
// crua (emerald/sky/red) em vez de token.
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import { notificationMeta, notificationTarget, formatNotificationDate } from '@/utils/Config/notificationMeta';

const props = defineProps({
  notification: { type: Object, required: true },
  // 'md' = dentro do sino, 'lg' = caixa de entrada (mais respiro e corpo maior)
  size: { type: String, default: 'md' },
  // Corpo longo ganha "Ler tudo" em vez de ficar cortado em duas linhas. É o que
  // permite LER um comunicado inteiro sem sair da caixa - antes isso obrigava a
  // ir até a tela do mural.
  expansivel: { type: Boolean, default: false },
  // Item que NÃO é uma linha da tabela de notificações (ex.: um comunicado do
  // mural mostrado na mesma caixa). Sem id próprio, marcar como lido ou remover
  // bateria numa API que não conhece esse id.
  gerenciavel: { type: Boolean, default: true },
});

const store = useNotificationStore();

const meta = computed(() => notificationMeta(props.notification?.type, props.notification?.data));
const isUnread = computed(() => !props.notification?.read_at);
const image = computed(() => props.notification?.data?.image || null);
const target = computed(() => notificationTarget(props.notification));
const big = computed(() => props.size === 'lg');

// Sem destino, o card NÃO é link. Antes ele apontava para '#' quando não havia
// link: parecia clicável, e o clique só sujava a URL sem sair do lugar.
const tag = computed(() => (target.value.has ? (target.value.external ? 'a' : RouterLink) : 'div'));
const linkProps = computed(() => {
  if (!target.value.has) return {};
  return target.value.external
    ? { href: target.value.to, target: '_blank', rel: 'noopener' }
    : { to: target.value.to };
});

const aberto = ref(false);
const corpoLongo = computed(() => props.expansivel && String(props.notification?.body || '').length > 180);
const alternarCorpo = (e) => { e.preventDefault(); e.stopPropagation(); aberto.value = !aberto.value; };

const handleClick = (e) => {
  // O toque que terminou um arraste ainda dispara clique: sem este freio, puxar
  // o card para remover ABRIA o destino do aviso.
  if (eixo === 'x') { e.preventDefault(); e.stopPropagation(); eixo = null; return; }
  if (props.gerenciavel && isUnread.value) store.markRead(props.notification.id);
};

const handleRemove = (e) => {
  e.preventDefault();
  e.stopPropagation();
  store.remove(props.notification.id);
};

// ─── Arrastar para remover ──────────────────────────────────────────────────
// No celular o "x" tem 28px e mora no canto do card, colado no texto: erra-se o
// alvo e abre-se o aviso sem querer. Puxar o card para o lado remove - o mesmo
// gesto da caixa de e-mail do telefone. No desktop nada muda: o hover já traz o
// botão.
const PUXAR_PARA_REMOVER = 96;  // px de arrasto que confirmam a remoção
const DECIDIR_EIXO = 10;        // px antes disso o gesto ainda pode ser rolagem

const desloc = ref(0);
const saindo = ref(false);
let arrastando = false;
let x0 = 0;
let y0 = 0;
let eixo = null;

const emGesto = computed(() => desloc.value !== 0 || saindo.value);
const vaiRemover = computed(() => Math.abs(desloc.value) >= PUXAR_PARA_REMOVER);

function toqueInicio(e) {
  if (!props.gerenciavel || saindo.value || e.touches.length !== 1) return;
  x0 = e.touches[0].clientX;
  y0 = e.touches[0].clientY;
  eixo = null;
  arrastando = true;
}

function toqueMove(e) {
  if (!arrastando) return;
  const dx = e.touches[0].clientX - x0;
  const dy = e.touches[0].clientY - y0;
  if (!eixo) {
    if (Math.abs(dx) < DECIDIR_EIXO && Math.abs(dy) < DECIDIR_EIXO) return;
    eixo = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  }
  // Rolagem vertical continua sendo da lista: o card solta o gesto e volta.
  if (eixo !== 'x') { arrastando = false; desloc.value = 0; return; }
  e.preventDefault();
  desloc.value = dx;
}

function toqueFim() {
  if (!arrastando) { desloc.value = 0; return; }
  arrastando = false;
  if (Math.abs(desloc.value) < PUXAR_PARA_REMOVER) { desloc.value = 0; return; }
  // Sai pelo lado para onde foi puxado, e só then some da lista: sem isso o card
  // pisca no lugar antes de desaparecer.
  saindo.value = true;
  desloc.value = desloc.value > 0 ? 400 : -400;
  setTimeout(() => store.remove(props.notification.id), 180);
}

const estiloGesto = computed(() => {
  if (!emGesto.value) return null;
  return {
    transform: `translateX(${desloc.value}px)`,
    opacity: saindo.value ? 0 : Math.max(0.35, 1 - Math.abs(desloc.value) / 260),
    transition: arrastando ? 'none' : 'transform .18s ease-out, opacity .18s ease-out',
  };
});
</script>

<template>
  <!-- Casca do gesto: o card anda dentro dela, e a pista de remoção aparece
       atrás conforme ele sai do lugar. `pan-y` deixa a lista rolar normalmente. -->
  <div class="relative rounded-lg" :class="emGesto ? 'overflow-hidden' : ''"
    :style="gerenciavel ? { touchAction: 'pan-y' } : null"
    @touchstart.passive="toqueInicio" @touchmove="toqueMove"
    @touchend="toqueFim" @touchcancel="toqueFim">

    <!-- Pista atrás do card: diz o que o arraste vai fazer, e fica sólida quando
         já passou do ponto de soltar. -->
    <div v-if="emGesto" aria-hidden="true"
      class="absolute inset-0 rounded-lg border flex items-center justify-between px-4 transition-colors duration-120"
      :class="vaiRemover
        ? 'bg-data-neg-soft border-data-neg/40 text-data-neg'
        : 'bg-surface-sunken border-line text-ink-subtle'">
      <span class="inline-flex items-center gap-2 text-micro font-medium">
        <i class="fas fa-trash-can text-[11px]"></i> Remover
      </span>
      <span class="inline-flex items-center gap-2 text-micro font-medium">
        Remover <i class="fas fa-trash-can text-[11px]"></i>
      </span>
    </div>

  <component :is="tag" v-bind="linkProps" @click="handleClick" :style="estiloGesto"
    :class="[
      'group relative flex items-stretch gap-3 rounded-lg border transition-all duration-120',
      big ? 'p-3 sm:p-3.5' : 'p-2.5',
      isUnread
        ? 'bg-accent-soft/40 border-accent/20'
        : 'bg-surface-raised border-line',
      target.has
        ? 'cursor-pointer hover:border-accent/40 hover:shadow-soft hover:-translate-y-px active:translate-y-0'
        : 'cursor-default',
      target.has && !isUnread ? 'hover:bg-surface-sunken' : '',
      target.has && isUnread ? 'hover:bg-accent-soft/60' : '',
    ]">

    <!-- Faixa de não lida: some assim que a pessoa abre, e é ela que dá o
         "isto é novo" mesmo com o card inteiro em cinza. -->
    <span v-if="isUnread"
      class="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent"></span>

    <!-- Imagem ou ícone do tipo -->
    <div v-if="image"
      :class="['rounded-md overflow-hidden shrink-0', big ? 'w-14 h-14' : 'w-11 h-11']">
      <img :src="image" alt="" class="h-full w-full object-cover" />
    </div>
    <div v-else
      :class="['shrink-0 rounded-md grid place-items-center border',
               meta.soft, meta.ring, big ? 'w-14 h-14' : 'w-11 h-11']">
      <i :class="[meta.icon, meta.text, big ? 'text-base' : 'text-sm']"></i>
    </div>

    <!-- Conteúdo -->
    <div class="flex flex-col min-w-0 flex-1 justify-center gap-0.5">
      <div class="flex items-center gap-2 min-w-0">
        <span :class="['text-micro font-medium uppercase tracking-wide truncate', meta.text]">
          {{ meta.label }}
        </span>
        <span v-if="isUnread"
          class="text-micro font-medium text-accent px-1.5 rounded bg-accent-soft border border-accent/20 shrink-0">
          nova
        </span>
      </div>

      <h4 :class="[
        'text-sm leading-snug',
        big ? 'line-clamp-2' : 'truncate',
        isUnread ? 'font-semibold text-ink' : 'font-medium text-ink-muted',
      ]">
        {{ notification.title }}
      </h4>

      <p v-if="notification.body"
        :class="[
          'text-xs text-ink-muted',
          expansivel ? 'whitespace-pre-line leading-relaxed' : '',
          aberto ? '' : (big ? 'line-clamp-2' : 'truncate'),
        ]">
        {{ notification.body }}
      </p>

      <button v-if="corpoLongo" type="button" @click="alternarCorpo"
        class="self-start text-micro text-accent hover:underline inline-flex items-center gap-1">
        <i class="fas fa-chevron-down text-[9px] transition-transform duration-200"
           :class="{ 'rotate-180': aberto }"></i>
        {{ aberto ? 'Recolher' : 'Ler tudo' }}
      </button>

      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-micro text-ink-subtle">{{ formatNotificationDate(notification.created_at) }}</span>
        <!-- A maioria dos avisos leva a uma tela. Dizer isso em palavra evita o
             clique de teste: quem não quer sair da página sabe antes. -->
        <span v-if="target.has"
          class="text-micro text-accent inline-flex items-center gap-1 opacity-80 group-hover:opacity-100
                 transition-opacity duration-120">
          <i :class="target.external ? 'fas fa-arrow-up-right-from-square' : 'fas fa-arrow-right'"
             class="text-[9px] transition-transform duration-120 group-hover:translate-x-0.5"></i>
          {{ target.external ? 'Abrir link' : 'Abrir' }}
        </span>
      </div>

      <!-- Ação que pertence ao próprio aviso (hoje: o "Li e estou ciente" de um
           comunicado lido dentro da caixa de entrada). Fica aqui para a pessoa
           resolver sem sair da lista. -->
      <div v-if="$slots.acoes" class="mt-1.5" @click.stop.prevent>
        <slot name="acoes" />
      </div>
    </div>

    <!-- Remover. No celular não existe hover: fica visível sempre abaixo de sm. -->
    <button v-if="gerenciavel" type="button" @click="handleRemove"
      class="absolute top-1.5 right-1.5 h-7 w-7 grid place-items-center rounded-md
             text-ink-subtle opacity-60 sm:opacity-0 sm:group-hover:opacity-100
             hover:bg-surface-sunken hover:text-data-neg transition-all duration-120"
      title="Remover" aria-label="Remover notificação">
      <i class="fas fa-xmark text-[11px]"></i>
    </button>
  </component>
  </div>
</template>
