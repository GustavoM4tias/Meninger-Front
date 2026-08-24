<script setup>
// Cartão da pessoa ao passar o mouse.
//
// A lista de participantes mostrava só a inicial num círculo: para saber quem
// era "R", a pessoa tinha que abrir o evento. Aqui o cartão traz nome, e-mail,
// presença no Teams, a resposta ao convite e o atalho para conversar.
//
// POR QUE ELE VAI PARA O <body> (Teleport):
// posicionado dentro do cartão, ele era cortado pelo `overflow` do contêiner e
// passava POR BAIXO da navbar. Agora ele é fixo na viewport, com a posição
// calculada a partir do avatar, e escolhe o lado que tem espaço: abre para
// baixo se couber, para cima se não couber, e desliza na horizontal para não
// vazar pela borda. Some sozinho ao sair; no toque, abre no clique - celular
// não tem hover, e sem isso o recurso não existiria para quem acessa pelo
// telefone.

import { ref, computed, onUnmounted } from 'vue';
import { useTeamsChatStore } from '@/stores/Microsoft/teamsChatStore';

const props = defineProps({
  pessoa: { type: Object, required: true },   // { name, email, status?, id? }
});

const emit = defineEmits(['conversar']);
const cs = useTeamsChatStore();

const gatilho = ref(null);
const aberto = ref(false);
const pos = ref({ top: 0, left: 0, acima: false });
let fecharTimer = null;

const LARGURA = 240;   // tem que bater com a w-60 do cartão
const ALTURA  = 190;   // altura típica; serve só para decidir o lado
const MARGEM  = 10;

function posicionar() {
  const el = gatilho.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Vertical: para baixo se couber; senão para cima.
  const cabeAbaixo = r.bottom + ALTURA + MARGEM < vh;
  const acima = !cabeAbaixo && r.top - ALTURA - MARGEM > 0;

  // Horizontal: centralizado no avatar, mas preso dentro da tela.
  let left = r.left + r.width / 2 - LARGURA / 2;
  left = Math.max(MARGEM, Math.min(left, vw - LARGURA - MARGEM));

  pos.value = {
    left,
    top: acima ? r.top - MARGEM : r.bottom + MARGEM,
    acima,
  };
}

function abrir() {
  clearTimeout(fecharTimer);
  posicionar();
  aberto.value = true;
}
function fechar() {
  fecharTimer = setTimeout(() => { aberto.value = false; }, 120);
}
function alternar() {
  if (aberto.value) { aberto.value = false; return; }
  abrir();
}

// Rolar ou redimensionar com o cartão aberto o deixaria flutuando longe do
// avatar: nesse caso ele fecha, que é mais honesto do que perseguir.
function aoMover() { if (aberto.value) aberto.value = false; }
window.addEventListener('scroll', aoMover, true);
window.addEventListener('resize', aoMover);
onUnmounted(() => {
  clearTimeout(fecharTimer);
  window.removeEventListener('scroll', aoMover, true);
  window.removeEventListener('resize', aoMover);
});

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
  accepted: { texto: 'Aceitou o convite', cor: 'text-data-pos' },
  declined: { texto: 'Recusou o convite', cor: 'text-data-neg' },
  tentativelyAccepted: { texto: 'Respondeu talvez', cor: 'text-data-warn' },
};
const resposta = computed(() => RESPOSTA[props.pessoa?.status] || null);

const rotuloPresenca = computed(() => {
  const p = presenca.value;
  if (!p) return '';
  return p.atividade === 'InAMeeting' ? 'Em reunião'
       : p.atividade === 'InACall'    ? 'Em chamada'
       : p.atividade === 'Presenting' ? 'Apresentando'
       : p.rotulo;
});
</script>

<template>
  <span ref="gatilho" class="relative inline-flex"
    @mouseenter="abrir" @mouseleave="fechar" @click="alternar">
    <slot :inicial="inicial">
      <span class="w-7 h-7 rounded-full bg-surface-raised border border-line grid place-items-center
                   text-micro font-semibold text-ink-muted cursor-pointer transition-all duration-150
                   hover:scale-110 hover:border-accent/40 hover:z-10">
        {{ inicial }}
      </span>
    </slot>
  </span>

  <!-- Fora do fluxo: preso à viewport, acima de tudo, sem ser cortado. -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-1 scale-95"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 scale-95">
      <div v-if="aberto"
        :style="{
          top: `${pos.top}px`,
          left: `${pos.left}px`,
          transform: pos.acima ? 'translateY(-100%)' : 'none',
        }"
        class="fixed z-[70] w-60 p-3 rounded-xl border border-line bg-surface-overlay shadow-overlay"
        @mouseenter="abrir" @mouseleave="fechar">

        <div class="flex items-start gap-2.5">
          <div class="relative shrink-0">
            <span class="w-9 h-9 rounded-full bg-accent-soft grid place-items-center text-sm font-semibold text-accent">
              {{ inicial }}
            </span>
            <span v-if="presenca" :class="CORES[presenca.estado] || 'bg-ink-subtle/30'"
              class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-surface-overlay"></span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-ink truncate">{{ nome }}</p>
            <p v-if="pessoa.email" class="text-micro text-ink-subtle truncate">{{ pessoa.email }}</p>
            <p v-if="rotuloPresenca" class="text-micro text-ink-muted mt-0.5">{{ rotuloPresenca }}</p>
          </div>
        </div>

        <p v-if="resposta" class="text-micro mt-2" :class="resposta.cor">
          <i class="fas fa-circle text-[6px] mr-1 align-middle"></i>{{ resposta.texto }}
        </p>

        <button v-if="pessoa.email" type="button"
          @click.stop="emit('conversar', pessoa); aberto = false"
          class="mt-2.5 w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 min-h-9
                 rounded-lg border border-line text-xs text-ink-muted
                 hover:border-accent/40 hover:text-accent transition-colors">
          <i class="fas fa-comment-dots text-micro"></i> Conversar no Teams
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
