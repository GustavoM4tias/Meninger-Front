// composables/useEmeDock.js
//
// A Eme encostada na lateral, em vez de flutuando por cima.
//
// O painel flutuante tapa a tela: para ler um dado e perguntar sobre ele, a
// pessoa abre, lê a resposta, fecha, confere, abre de novo. Docada, ela vira
// uma coluna à direita e o conteúdo do Office ENCOLHE em vez de ficar coberto -
// dá para ler a tabela e conversar sobre ela ao mesmo tempo.
//
// Como o empurrão acontece: uma classe no <body> e uma variável CSS com a
// largura. As duas regras que consomem isso estão em assets/main.css, perto do
// resto do layout - aqui fica só o estado.
//
// A largura é arrastável e persistida: quem usa a Eme o dia todo quer ela
// larga; quem usa de vez em quando quer ela estreita.

import { ref, computed, watch } from 'vue';

const MODO_KEY    = 'eme:dock:modo';
const LARGURA_KEY = 'eme:dock:largura';

const MIN = 320;
const MAX = 720;
const PADRAO = 400;

function lerLargura() {
    const n = Number(localStorage.getItem(LARGURA_KEY));
    return Number.isFinite(n) && n >= MIN && n <= MAX ? n : PADRAO;
}

// Estado único para o app inteiro: a bolinha e o shell precisam concordar.
const modo    = ref(localStorage.getItem(MODO_KEY) === 'docada' ? 'docada' : 'flutuante');
const largura = ref(lerLargura());

const docada = computed(() => modo.value === 'docada');

function aplicar() {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--eme-dock-w', `${largura.value}px`);
    document.body.classList.toggle('eme-docada', docada.value);
}

watch([modo, largura], () => {
    localStorage.setItem(MODO_KEY, modo.value);
    localStorage.setItem(LARGURA_KEY, String(largura.value));
    aplicar();
}, { immediate: true });

export function useEmeDock() {
    return {
        modo,
        docada,
        largura,
        MIN,
        MAX,
        /** Alterna entre flutuante e docada. */
        alternar() { modo.value = docada.value ? 'flutuante' : 'docada'; },
        /** Largura nova, presa entre o mínimo e o máximo. */
        redimensionar(px) { largura.value = Math.max(MIN, Math.min(MAX, Math.round(px))); },
        /** Sair do modo docado sem fechar a Eme (ex.: virou celular). */
        soltar() { modo.value = 'flutuante'; },
    };
}
