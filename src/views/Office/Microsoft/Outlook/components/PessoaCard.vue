<script setup>
// Quem é essa pessoa, e o que dá para fazer com ela.
//
// O perfil é o UserInfoModal do design system, o MESMO do organograma - não um
// modal próprio. O Office já tinha dois modais de pessoa com layouts diferentes
// para a mesma pergunta; o terceiro não ia melhorar nada. O que é específico do
// e-mail entra pelo slot `acoes`.
//
// Dois níveis:
//   passar o mouse   cartão pequeno com nome, e-mail e presença
//   clicar           o perfil, com os atalhos
//
// O cartão do hover é CLICÁVEL inteiro: ele dizia "clique para os atalhos" e só
// o avatar embaixo respondia ao clique, então o convite não levava a lugar
// nenhum.

import { ref, computed, inject, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useOutlookStore } from '@/stores/Microsoft/outlookStore';
import { useTeamsChatStore } from '@/stores/Microsoft/teamsChatStore';

import UserInfoModal from '@/components/UI/UserInfoModal.vue';

const props = defineProps({
  pessoa: { type: Object, required: true },   // { name, email }
  size: { type: String, default: 'md' },      // sm | md
  presenca: { type: String, default: '' },
});

const router = useRouter();
const toast = useToast();
const store = useOutlookStore();
const cs = useTeamsChatStore();
const escrever = inject('olEscrever', null);
const setTab = inject('olSetTab', () => {});

const nome = computed(() => props.pessoa?.name || props.pessoa?.email || '?');
const email = computed(() => props.pessoa?.email || '');
const iniciais = computed(() =>
  String(nome.value).split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
);
const daMenin = computed(() => /@menin\.com\.br$/i.test(email.value));

const PRESENCA = {
  Available: { tom: 'pos', cor: 'bg-data-pos', label: 'Disponível' },
  Busy: { tom: 'neg', cor: 'bg-data-neg', label: 'Ocupado' },
  DoNotDisturb: { tom: 'neg', cor: 'bg-data-neg', label: 'Não perturbe' },
  InAMeeting: { tom: 'neg', cor: 'bg-data-neg', label: 'Em reunião' },
  Away: { tom: 'warn', cor: 'bg-data-warn', label: 'Ausente' },
  Offline: { tom: 'neutral', cor: 'bg-ink-subtle', label: 'Offline' },
};
const estado = computed(() => PRESENCA[props.presenca] || null);

// O que o modal do design system recebe.
const comoUsuario = computed(() => ({
  username: nome.value,
  email: email.value,
  position: daMenin.value ? 'Menin' : 'Contato externo',
}));
const selo = computed(() => {
  if (estado.value) return `${estado.value.label} no Teams`;
  if (!daMenin.value) return 'Fora da Menin';
  return '';
});
const seloTom = computed(() => estado.value?.tom || 'neutral');

// ── Cartão no hover, preso à viewport ─────────────────────────────────────────
// No body de propósito: dentro da lista, o `overflow` do contêiner corta o
// cartão e a navbar passa por cima.
const gatilho = ref(null);
const aberto = ref(false);
const pos = ref({ top: 0, left: 0, acima: false });
let timer = null;

const LARGURA = 232;

function medir() {
  const r = gatilho.value?.getBoundingClientRect();
  if (!r) return;
  const acima = window.innerHeight - r.bottom < 150 && r.top > 150;
  pos.value = {
    top: acima ? r.top - 8 : r.bottom + 8,
    left: Math.min(Math.max(8, r.left + r.width / 2 - LARGURA / 2), window.innerWidth - LARGURA - 8),
    acima,
  };
}

function entrar() {
  clearTimeout(timer);
  medir();
  aberto.value = true;
  window.addEventListener('scroll', fecharJa, { passive: true, capture: true });
}
function sair() { timer = setTimeout(fecharJa, 120); }
function fecharJa() {
  aberto.value = false;
  window.removeEventListener('scroll', fecharJa, { capture: true });
}
onUnmounted(() => { clearTimeout(timer); window.removeEventListener('scroll', fecharJa, { capture: true }); });

// ── Perfil ────────────────────────────────────────────────────────────────────
const perfil = ref(false);

function abrirPerfil() {
  fecharJa();
  perfil.value = true;
}

function enviarEmail() {
  perfil.value = false;
  if (escrever) escrever({ to: [{ email: email.value, name: nome.value }] });
}

/** O que essa pessoa já mandou, em qualquer pasta. */
function verEmails() {
  perfil.value = false;
  setTab('caixa');
  store.applyFilters({ from: email.value });
  toast.success(`Mostrando o que ${nome.value.split(' ')[0]} mandou.`);
}

function mandarTeams() {
  perfil.value = false;
  // NAVEGA PRIMEIRO. Antes esperava a conversa ser criada no Graph para só
  // então trocar de tela - o clique parecia travado por segundos. Quem abre a
  // conversa é a tela do Teams, que já sabe mostrar o próprio carregamento.
  router.push({ path: '/microsoft/teams', query: { tab: 'mensagens', com: email.value } });
  cs.conversarCom?.(email.value).catch(() => {});
}

async function copiarEmail() {
  try {
    await navigator.clipboard.writeText(email.value);
    toast.success('E-mail copiado.');
  } catch {
    toast.error('Não consegui copiar.');
  }
}

const TAM = { sm: 'w-6 h-6 text-[0.6rem]', md: 'w-7 h-7 text-micro' };
const BTN = 'inline-flex items-center justify-center gap-2 px-3 py-2 min-h-10 rounded-lg text-xs '
  + 'font-medium transition-all duration-120 ease-out-expo';
</script>

<template>
  <span class="inline-flex">
    <button ref="gatilho" type="button"
      class="rounded-full grid place-items-center font-bold shrink-0 relative border
             transition-all duration-120 ease-out-expo hover:scale-110 hover:z-10"
      :class="[TAM[size] || TAM.md,
               daMenin ? 'bg-accent-soft text-accent border-accent/20'
                       : 'bg-surface-sunken text-ink-muted border-line']"
      :title="nome"
      @mouseenter="entrar" @mouseleave="sair" @focus="entrar" @blur="sair"
      @click.stop="abrirPerfil">
      {{ iniciais }}
      <span v-if="estado"
        class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-surface-raised"
        :class="estado.cor"></span>
    </button>

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-120 ease-out-expo"
        enter-from-class="opacity-0 scale-95"
        leave-active-class="transition duration-120" leave-to-class="opacity-0">
        <!-- O cartão inteiro abre o perfil: o texto convidava ao clique e só o
             avatar respondia. -->
        <button v-if="aberto" type="button"
          :style="{ top: `${pos.top}px`, left: `${pos.left}px`, width: `${LARGURA}px` }"
          class="fixed z-[70] rounded-xl border border-line bg-surface-raised shadow-overlay p-3 text-left
                 hover:border-accent/40 transition-colors duration-120"
          :class="pos.acima ? '-translate-y-full' : ''"
          @mouseenter="entrar" @mouseleave="sair" @click="abrirPerfil">
          <span class="block text-xs font-semibold text-ink truncate">{{ nome }}</span>
          <span class="block text-micro text-ink-subtle truncate mt-0.5">{{ email }}</span>

          <span v-if="estado" class="flex items-center gap-1.5 text-micro text-ink-muted mt-1.5">
            <span class="w-1.5 h-1.5 rounded-full" :class="estado.cor"></span>{{ estado.label }}
          </span>
          <span v-else-if="daMenin" class="block text-micro text-ink-subtle mt-1.5">
            Presença não disponível
          </span>
          <span v-else class="block text-micro text-ink-subtle mt-1.5">Fora da Menin</span>

          <span class="flex items-center gap-1.5 text-micro text-accent mt-2">
            <i class="fas fa-arrow-right text-micro"></i> Abrir o perfil
          </span>
        </button>
      </Transition>
    </Teleport>

    <!-- O perfil é o modal do design system, com os atalhos do e-mail no slot -->
    <UserInfoModal :user="perfil ? comoUsuario : null" :badge="selo" :badge-tone="seloTom"
      @close="perfil = false">
      <template #acoes>
        <button v-if="escrever" type="button" :class="BTN"
          class="bg-accent text-white hover:bg-accent-hover shadow-soft" @click="enviarEmail">
          <i class="fas fa-pen text-[11px]"></i> Escrever para {{ nome.split(' ')[0] }}
        </button>

        <button type="button" :class="BTN"
          class="border border-line text-ink-muted hover:text-ink hover:border-line-strong"
          @click="verEmails">
          <i class="fas fa-inbox text-[11px]"></i> Ver o que já mandou
        </button>

        <button v-if="daMenin" type="button" :class="BTN"
          class="border border-line text-ink-muted hover:text-ink hover:border-line-strong"
          @click="mandarTeams">
          <i class="fab fa-microsoft text-[11px]"></i> Mensagem no Teams
        </button>

        <button type="button" :class="BTN" class="text-ink-subtle hover:text-ink" @click="copiarEmail">
          <i class="fas fa-copy text-[11px]"></i> Copiar o e-mail
        </button>
      </template>
    </UserInfoModal>
  </span>
</template>
