<script setup>
// Cartão da pessoa ao passar o mouse.
//
// A lista de participantes mostrava só a inicial num círculo: para saber quem
// era "R", a pessoa tinha que abrir o evento. Aqui o cartão aparece no hover
// com nome, e-mail, presença no Teams e o que dá para fazer com aquela pessoa.
//
// Ele é preso ao avatar (não é véu sobre a tela) e some sozinho ao sair. No
// toque, abre no clique - celular não tem hover, e sem isso o recurso não
// existiria para a diretoria, que acessa pelo telefone.

import { ref, computed } from 'vue';
import { useTeamsChatStore } from '@/stores/Microsoft/teamsChatStore';

const props = defineProps({
  pessoa: { type: Object, required: true },   // { name, email, status?, id? }
  // Onde abrir: para avatar no topo da tela, embaixo; no rodapé, em cima.
  posicao: { type: String, default: 'bottom' },
});

const emit = defineEmits(['conversar']);
const cs = useTeamsChatStore();

const aberto = ref(false);
let fecharTimer = null;

function abrir() { clearTimeout(fecharTimer); aberto.value = true; }
function fechar() { fecharTimer = setTimeout(() => { aberto.value = false; }, 120); }

const nome = computed(() => props.pessoa?.name || props.pessoa?.email || 'Sem nome');
const inicial = computed(() => String(nome.value).charAt(0).toUpperCase());

// A presença vem do que a aba Mensagens já carregou. Sem ela, o cartão
// simplesmente não fala de presença - inventar "offline" seria pior.
const presenca = computed(() => {
  const id = props.pessoa?.id;
  return id ? cs.presencas?.[id] || null : null;
});

const CORES = {
  Available: 'bg-data-pos', AvailableIdle: 'bg-data-pos',
  Busy: 'bg-data-neg', BusyIdle: 'bg-data-neg', DoNotDisturb: 'bg-data-neg',
  Away: 'bg-data-warn', BeRightBack: 'bg-data-warn',
  Offline: 'bg-ink-subtle/40',
};

const RESPOSTA = {
  accepted: { texto: 'Aceitou', cor: 'text-data-pos' },
  declined: { texto: 'Recusou', cor: 'text-data-neg' },
  tentativelyAccepted: { texto: 'Talvez', cor: 'text-data-warn' },
};
const resposta = computed(() => RESPOSTA[props.pessoa?.status] || null);
</script>

<template>
  <span class="relative inline-flex" @mouseenter="abrir" @mouseleave="fechar" @click="aberto = !aberto">
    <slot :inicial="inicial">
      <span class="w-7 h-7 rounded-full bg-surface-raised border border-line grid place-items-center
                   text-micro font-semibold text-ink-muted cursor-default transition-transform
                   hover:scale-110 hover:border-accent/40">
        {{ inicial }}
      </span>
    </slot>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 scale-95">
      <span v-if="aberto"
        :class="posicao === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'"
        class="absolute left-1/2 -translate-x-1/2 z-30 w-60 p-3 rounded-xl border border-line
               bg-surface-overlay shadow-overlay text-left cursor-default"
        @mouseenter="abrir" @mouseleave="fechar">

        <span class="flex items-start gap-2.5">
          <span class="relative shrink-0">
            <span class="w-9 h-9 rounded-full bg-accent-soft grid place-items-center text-sm font-semibold text-accent">
              {{ inicial }}
            </span>
            <span v-if="presenca" :class="CORES[presenca.estado] || 'bg-ink-subtle/30'"
              class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-surface-overlay"></span>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold text-ink truncate">{{ nome }}</span>
            <span v-if="pessoa.email" class="block text-micro text-ink-subtle truncate">{{ pessoa.email }}</span>
            <span v-if="presenca" class="block text-micro text-ink-muted mt-0.5">
              {{ presenca.atividade === 'InAMeeting' ? 'Em reunião'
               : presenca.atividade === 'InACall' ? 'Em chamada'
               : presenca.rotulo }}
            </span>
          </span>
        </span>

        <span v-if="resposta" class="block text-micro mt-2" :class="resposta.cor">
          <i class="fas fa-circle text-[6px] mr-1 align-middle"></i>{{ resposta.texto }} o convite
        </span>

        <button v-if="pessoa.email" type="button"
          @click.stop="emit('conversar', pessoa); aberto = false"
          class="mt-2.5 w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 min-h-9
                 rounded-lg border border-line text-xs text-ink-muted
                 hover:border-accent/40 hover:text-accent transition-colors">
          <i class="fas fa-comment-dots text-micro"></i> Conversar no Teams
        </button>
      </span>
    </Transition>
  </span>
</template>
