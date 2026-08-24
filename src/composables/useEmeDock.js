// composables/useEmeDock.js
//
// A Eme encostada na lateral, em vez de flutuando por cima.
//
// O painel flutuante tapa a tela: para ler um dado e perguntar sobre ele, a
// pessoa abre, lê a resposta, fecha, confere, abre de novo. Docada, ela vira
// uma coluna à direita e o conteúdo do Office ENCOLHE em vez de ficar coberto -
// dá para ler a tabela e conversar sobre ela ao mesmo tempo.
//
// Como o empurrão acontece: quem lê este estado e aplica o recuo são o
// OfficeShell (padding no conteúdo) e o Nav (a barra do topo termina antes do
// painel). A primeira tentativa fazia isso por regra global no CSS e QUEBRAVA o
// layout - o padding no #app não alcançava os elementos fixos do Nav, então a
// barra e o menu lateral ficavam por baixo do painel.
//
// A classe no <body> e a variável CSS continuam sendo escritas: servem para
// quem precisar reagir ao dock sem importar o composable (CSS de terceiros,
// impressão, teste).
//
// O QUE PERSISTE E O QUE NÃO PERSISTE (a regra que evita o resto dos bugs):
//
//   TAMANHO persiste     - largura do dock e caixa do flutuante são preferência,
//                          e não mudam nada enquanto ela está fechada.
//   ESTADO não persiste  - a Eme SEMPRE começa fechada e flutuante.
//
// Guardar "aberta" e "docada" parecia conveniente e era a fonte da bagunça:
// recarregar trazia a página com um pedaço da largura reservado antes de a Eme
// existir, o shell e a barra do topo recuavam por causa de um painel que ainda
// não tinha montado, e qualquer recarga no meio de um ajuste deixava a tela num
// estado que a pessoa não pediu. Colar é gesto: vale para a sessão em que foi
// feito, e recomeça limpo.

import { ref, computed, watch } from 'vue';

const LARGURA_KEY = 'eme:dock:largura';
const CAIXA_KEY   = 'eme:flutuante:caixa';

const MIN = 320;
const MAX = 720;
const PADRAO = 400;

// O flutuante também é redimensionável: 384x512 era o tamanho fixo de antes.
const CAIXA_MIN = { w: 320, h: 320 };
const CAIXA_PADRAO = { w: 384, h: 512 };

function lerCaixa() {
    try {
        const c = JSON.parse(localStorage.getItem(CAIXA_KEY) || 'null');
        if (c && Number.isFinite(c.w) && Number.isFinite(c.h)) return c;
    } catch { /* valor estragado: cai no padrão */ }
    return { ...CAIXA_PADRAO };
}

function lerLargura() {
    const n = Number(localStorage.getItem(LARGURA_KEY));
    return Number.isFinite(n) && n >= MIN && n <= MAX ? n : PADRAO;
}

// Estado único para o app inteiro: a bolinha e o shell precisam concordar.
// Começa SEMPRE flutuante e fechada - ver a regra no topo do arquivo.
const modo    = ref('flutuante');
const largura = ref(lerLargura());
const caixa   = ref(lerCaixa());
// Durante o arrasto da largura, shell e nav NÃO podem animar: a transição de
// 200ms brigava com um evento de ponteiro a cada frame e a barra do topo ficava
// tremendo atrás do painel.
const ajustando = ref(false);

// Recarregar a página fechava o painel (o estado era local do componente) mas o
// espaço continuava reservado: ficava uma faixa vazia à direita e a bolinha no
// canto. Agora o "aberta" mora aqui, junto do modo, e é ele quem manda no recuo.
const aberta = ref(false);

const docada = computed(() => modo.value === 'docada');
/** Docada E aberta: é isto que empurra o Office. */
const ocupando = computed(() => docada.value && aberta.value);

// Versões anteriores gravavam modo e aberto: sem esta limpeza, quem já usou a
// Eme continuaria abrindo o Office com o espaço reservado até trocar de máquina.
try {
    localStorage.removeItem('eme:dock:modo');
    localStorage.removeItem('eme:aberta');
} catch { /* navegador sem storage: nada a limpar */ }

function aplicar() {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--eme-dock-w', `${largura.value}px`);
    document.body.classList.toggle('eme-docada', ocupando.value);
}

watch([modo, largura, aberta], () => {
    // Só o tamanho é lembrado. Modo e aberto/fechado morrem com a aba, de
    // propósito.
    localStorage.setItem(LARGURA_KEY, String(largura.value));
    aplicar();
}, { immediate: true });

watch(caixa, (c) => {
    localStorage.setItem(CAIXA_KEY, JSON.stringify(c));
}, { deep: true });

export function useEmeDock() {
    return {
        modo,
        docada,
        ocupando,
        aberta,
        largura,
        MIN,
        MAX,
        /** Alterna entre flutuante e docada. */
        alternar() { modo.value = docada.value ? 'flutuante' : 'docada'; },
        /** Largura nova, presa entre o mínimo e o máximo. */
        redimensionar(px) { largura.value = Math.max(MIN, Math.min(MAX, Math.round(px))); },
        /** Liga/desliga o modo arrasto (desliga as transições de layout). */
        ajustar(v) { ajustando.value = !!v; },
        /** Sair do modo docado sem fechar a Eme (ex.: virou celular). */
        soltar() { modo.value = 'flutuante'; },
        /** Encostar (usado pelo arrastar-até-a-borda). */
        docar() { modo.value = 'docada'; },

        ajustando,
        caixa,
        /** Tamanho do painel flutuante, preso ao mínimo e à viewport. */
        redimensionarCaixa(w, h) {
            const maxW = Math.max(CAIXA_MIN.w, window.innerWidth - 40);
            const maxH = Math.max(CAIXA_MIN.h, window.innerHeight - 40);
            caixa.value = {
                w: Math.round(Math.max(CAIXA_MIN.w, Math.min(w, maxW))),
                h: Math.round(Math.max(CAIXA_MIN.h, Math.min(h, maxH))),
            };
        },
    };
}
