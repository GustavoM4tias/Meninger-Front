<script setup>
// Host dos avisos que aparecem sozinhos, no canto. Não desenha nada: decide
// QUANDO um aviso vira toast e entrega o card (NotificationToastBody) para a
// fila do vue-toastification — a mesma fila do "salvo com sucesso" das telas,
// para que os dois nunca se sobreponham (ver reference_aviso_confirmacao_modal).
//
// Dispara em três momentos:
//   1. ao abrir o Office (logo depois do boot);
//   2. ao chegar na tela inicial, respeitando um intervalo mínimo;
//   3. quando o polling da store traz aviso novo com a pessoa usando o sistema.
//
// Nunca repete: o que já virou toast fica registrado no aparelho. É por isso que
// abrir o Office cinco vezes no dia não devolve o mesmo balão cinco vezes.
import { onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useNotificationStore } from '@/stores/Config/notificationStore';
import { useAuthStore } from '@/stores/Settings/Auth/authStore';
import { notificationTarget } from '@/utils/Config/notificationMeta';
import NotificationToastBody from './NotificationToastBody.vue';

const MAX_POR_LEVA = 3;          // três balões é o teto do que se lê de relance
const INTERVALO_LEVA_MS = 10 * 60 * 1000;
const ATRASO_BOOT_MS = 1500;     // deixa a tela pintar antes de chamar atenção
const TEMPO_NA_TELA_MS = 9000;   // mais que os 4s de um "salvo": aqui há o que ler
const INTERVALO_ENTRE_BALOES_MS = 2000;  // um de cada vez, com tempo de ler o anterior
const ESPERA_MODAL_MS = 5000;    // enquanto houver diálogo na tela, o balão espera
const TETO_REGISTRO = 400;       // ids guardados por aparelho
// Aviso de dois meses atrás chegando como balão parece novidade e não é. Fora
// desta janela, o pendente vira UMA linha de resumo em vez de três balões.
const JANELA_RECENTE_MS = 7 * 24 * 60 * 60 * 1000;

const toast = useToast();
const route = useRoute();
const router = useRouter();
const store = useNotificationStore();
const auth = useAuthStore();

let ultimaLeva = 0;
let timerBoot = null;
let timerEspera = null;

// ─── Registro do que já foi mostrado ────────────────────────────────────────
const chaveRegistro = () => `menin.notif.toasted.${auth.user?.id || 'anon'}`;

function lidos() {
  try {
    const cru = JSON.parse(localStorage.getItem(chaveRegistro()) || '[]');
    return new Set(Array.isArray(cru) ? cru : []);
  } catch { return new Set(); }
}

function registrar(ids) {
  try {
    const atual = Array.from(lidos());
    const novo = [...atual, ...ids].slice(-TETO_REGISTRO);
    localStorage.setItem(chaveRegistro(), JSON.stringify(novo));
  } catch { /* aparelho sem localStorage: pior caso, o aviso repete */ }
}

// ─── Abrir o aviso ──────────────────────────────────────────────────────────
function abrir(n) {
  // O resumo não tem id: é um aviso sobre a caixa, não um item dela.
  if (n?.id && !n?.read_at) {
    store.markRead(n.id);
    store.refreshUnreadCount();
  }
  const alvo = notificationTarget(n);
  if (!alvo.has) return;
  if (alvo.external) window.open(alvo.to, '_blank', 'noopener');
  else router.push(alvo.to).catch(() => { /* já está na rota */ });
}

// ─── Mostrar uma leva ───────────────────────────────────────────────────────
function mostrar(candidatas, { contarRestantes = true } = {}) {
  const registrados = lidos();
  const naoLidas = candidatas.filter(n => n && !n.read_at);
  const ineditas = naoLidas.filter(n => !registrados.has(n.id));
  if (!ineditas.length) return 0;

  const leva = ineditas.slice(0, MAX_POR_LEVA);
  // "+N não lidas" no último balão: dá o tamanho do que ficou para trás sem
  // empilhar um balão por aviso.
  const restantes = contarRestantes
    ? Math.max(0, store.unread - leva.length)
    : 0;

  leva.forEach((n, i) => {
    // Escalonado: os balões entram um a um, não os três de uma vez.
    setTimeout(() => {
      toast({
        component: NotificationToastBody,
        props: {
          notification: n,
          restantes: i === leva.length - 1 ? restantes : 0,
        },
      }, {
        timeout: TEMPO_NA_TELA_MS,
        closeOnClick: true,
        hideProgressBar: false,   // a barra é o que mostra a pausa no hover
        icon: false,
        toastClassName: 'menin-toast-notif',
        bodyClassName: 'menin-toast-notif-body',
        onClick: () => abrir(n),
      });
    }, i * INTERVALO_ENTRE_BALOES_MS);
  });

  registrar(leva.map(n => n.id));
  ultimaLeva = Date.now();
  return leva.length;
}

// Uma linha só para o acumulado: quem tem 38 pendentes de meses atrás não
// precisa de 38 balões, precisa saber que a caixa está cheia. Uma vez por
// sessão do navegador.
function resumoPendente() {
  if (store.unread <= 0) return;
  try {
    if (sessionStorage.getItem('menin.notif.resumo') === '1') return;
    sessionStorage.setItem('menin.notif.resumo', '1');
  } catch { /* sem sessionStorage: mostra uma vez por carga de página */ }

  const resumo = {
    id: null,
    type: 'generic',
    title: `Você tem ${store.unread} ${store.unread === 1 ? 'aviso não lido' : 'avisos não lidos'}`,
    body: 'Abra a caixa de entrada para ver o que ficou para trás.',
    link: '/notifications',
    created_at: null,
    read_at: null,
  };

  toast({
    component: NotificationToastBody,
    props: { notification: resumo, restantes: 0 },
  }, {
    timeout: TEMPO_NA_TELA_MS,
    closeOnClick: true,
    hideProgressBar: false,
    icon: false,
    toastClassName: 'menin-toast-notif',
    bodyClassName: 'menin-toast-notif-body',
    onClick: () => abrir(resumo),
  });
  ultimaLeva = Date.now();
}

// A leva de abertura pega o topo da caixa; a de chegada, só o que acabou de
// entrar. Fora da tela de notificações: lá a lista já está na frente da pessoa.
async function levaDeAbertura() {
  if (route.path.startsWith('/notifications')) return;
  if (Date.now() - ultimaLeva < INTERVALO_LEVA_MS) return;

  // Modal aberto na tela tem a palavra: o mural de novidades e o convite para
  // instalar o app disparam no mesmo instante do boot que esta leva, e balão
  // pipocando por cima de um diálogo é ruído em cima de decisão. O contador de
  // modais abertos é mantido pelo primitivo Modal (trava de rolagem contada).
  if (Number(document.body.dataset.modaisAbertos || 0) > 0) {
    clearTimeout(timerEspera);
    timerEspera = setTimeout(() => levaDeAbertura(), ESPERA_MODAL_MS);
    return;
  }
  if (!store.notifications.length) await store.syncLatest({ limit: 20 });

  const corte = Date.now() - JANELA_RECENTE_MS;
  const recentes = store.notifications.filter(n => (
    !n.read_at && new Date(n.created_at || 0).getTime() >= corte
  ));

  if (!mostrar(recentes)) resumoPendente();
}

// ─── Pausa coletiva no hover ────────────────────────────────────────────────
//
// A lib pausa SÓ o balão sob o cursor: com três empilhados, ler o de cima
// deixava os outros dois vencendo a contagem e sumindo antes da vez deles.
//
// Quem fecha o toast é o fim da animação da barra de progresso (`animationend`),
// então congelar a animação congela o fechamento — sem timer paralelo nosso.
// A classe entra por JS e não por `:hover` no container porque o container tem
// `pointer-events: none`, e depender da propagação do hover por ali seria
// apostar em detalhe de motor de renderização.
const CLASSE_PAUSA = 'menin-toast-hold';

function marcarPausa(pausado) {
  document.querySelectorAll('.Vue-Toastification__container')
    .forEach(c => c.classList.toggle(CLASSE_PAUSA, pausado));
}

const aoPassarMouse = (e) => marcarPausa(!!e.target?.closest?.('.menin-toast-notif'));
const aoSairDaJanela = () => marcarPausa(false);

onMounted(() => {
  timerBoot = setTimeout(() => { levaDeAbertura(); }, ATRASO_BOOT_MS);
  document.addEventListener('mouseover', aoPassarMouse, true);
  document.documentElement.addEventListener('mouseleave', aoSairDaJanela);
});

onBeforeUnmount(() => {
  clearTimeout(timerBoot);
  clearTimeout(timerEspera);
  document.removeEventListener('mouseover', aoPassarMouse, true);
  document.documentElement.removeEventListener('mouseleave', aoSairDaJanela);
  marcarPausa(false);
});

// Voltar para a tela inicial é o momento em que a pessoa "olha o painel".
watch(() => route.name, (nome) => {
  if (nome === 'Home') levaDeAbertura();
});

// Chegou aviso novo com o Office aberto.
watch(() => store.lastArrivals, (chegaram) => {
  if (!chegaram?.length) return;
  if (route.path.startsWith('/notifications')) return;
  mostrar(chegaram, { contarRestantes: false });
});
</script>

<template>
  <span class="hidden" aria-hidden="true"></span>
</template>
