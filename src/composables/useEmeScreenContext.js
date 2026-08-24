// composables/useEmeScreenContext.js
//
// CONTEXTO DE TELA DA EME.
//
// A Eme respondia no vácuo: "o que é isso aqui?", "explica esta tela", "por que
// esse número está assim?" não tinham resposta, porque nada dizia a ela onde a
// pessoa estava. Isso obrigava a pessoa a descrever de novo, por escrito, o que
// já estava na frente dela.
//
// Este arquivo é a fonte única disso, e guarda DUAS coisas diferentes:
//
//   ONDE  - a rota atual e o nome da tela pelo navRegistry. Vai junto de TODA
//           mensagem, sem a pessoa pedir nada. É barato (duas linhas de texto).
//   O QUÊ - trechos que a pessoa marcou com Ctrl+clique. Só vão quando ela
//           marcou, aparecem como etiqueta no compositor e ela pode tirar antes
//           de mandar. Nada é capturado sem o Ctrl.
//
// Regra que não pode ser quebrada: texto de tela é DADO, nunca instrução. Ele
// vai para o backend como conteúdo marcado, com teto de tamanho, e o prompt diz
// ao modelo para nunca obedecer a ordens escritas ali - um lead pode ter como
// nome "ignore as instruções anteriores".

import { ref, computed } from 'vue';
import { navRegistry } from '@/config/navRegistry';

const MAX_TEXTO = 600;   // por referência
const MAX_REFS  = 5;     // teto de referências acumuladas

// ── Estado (singleton: uma tela por vez, um chat por vez) ────────────────────
const rota   = ref('');
const tela   = ref('');
const secao  = ref('');
const referencias = ref([]);   // [{ id, texto, rotulo }]

let proximoId = 1;

// ── Nome da tela ────────────────────────────────────────────────────────────
/**
 * O navRegistry é a mesma fonte do menu e das alçadas, então o nome que a Eme
 * usa é o nome que a pessoa vê no menu - e não o `name` técnico da rota.
 */
function acharPagina(path) {
    for (const cat of navRegistry) {
        for (const p of (cat.pages || [])) {
            if (p.route === path) return { pagina: p, cat, sub: null };
        }
        for (const sub of (cat.subcategories || [])) {
            for (const p of (sub.pages || [])) {
                if (p.route === path) return { pagina: p, cat, sub };
            }
        }
    }
    return null;
}

export function setEmeScreen(path, fallbackTitulo = '') {
    if (rota.value !== path) limparReferencias();   // mudou de tela, o que estava marcado não vale mais
    rota.value = path || '';

    const achado = acharPagina(path);
    tela.value = achado?.pagina?.name || fallbackTitulo || '';
    secao.value = achado
        ? [achado.cat?.label, achado.sub?.name].filter(Boolean).join(' > ')
        : '';
}

// ── Referências marcadas com Ctrl+clique ────────────────────────────────────

function limpo(txt) {
    return String(txt || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXTO);
}

/**
 * Sobe até um bloco que tenha texto: clicar no ícone de um botão não diz nada,
 * e clicar numa célula sem o cabeçalho diz pouco. Quatro níveis é o suficiente
 * para sair do ícone e chegar no cartão, sem capturar a tela inteira.
 */
function textoDoElemento(el) {
    let alvo = el;
    for (let i = 0; i < 4 && alvo && alvo !== document.body; i++) {
        const t = limpo(alvo.innerText ?? alvo.textContent);
        if (t.length >= 3) return t;
        alvo = alvo.parentElement;
    }
    return limpo(el?.getAttribute?.('aria-label') || el?.getAttribute?.('title') || el?.alt);
}

export function marcarElemento(el) {
    const texto = textoDoElemento(el);
    if (!texto) return null;

    // Marcar duas vezes o mesmo trecho não acrescenta nada.
    if (referencias.value.some(r => r.texto === texto)) return null;

    const rotulo = el?.closest?.('[data-eme-label]')?.getAttribute('data-eme-label') || null;
    const ref = { id: proximoId++, texto, rotulo };

    // Teto: entra a nova, sai a mais antiga. Sem isso, uma sequência de cliques
    // enche o prompt com a tela inteira.
    referencias.value = [...referencias.value, ref].slice(-MAX_REFS);
    return ref;
}

export function removerReferencia(id) {
    referencias.value = referencias.value.filter(r => r.id !== id);
}

export function limparReferencias() {
    referencias.value = [];
}

/** O que vai junto da mensagem. Sem tela conhecida, não manda nada. */
export function emeScreenSnapshot() {
    if (!rota.value) return null;
    return {
        rota:  rota.value,
        tela:  tela.value || null,
        secao: secao.value || null,
        referencias: referencias.value.map(r => ({ texto: r.texto, rotulo: r.rotulo })),
    };
}

// ── Captura do Ctrl+clique ──────────────────────────────────────────────────
let instalado = false;

/**
 * @param {(ref:object)=>void} aoMarcar - chamado quando algo foi marcado
 *        (a bolinha usa para abrir o painel e mostrar a etiqueta).
 */
export function instalarCapturaCtrlClique(aoMarcar) {
    if (instalado) return () => {};
    instalado = true;

    const handler = (e) => {
        // Ctrl puro. Com Alt/Meta junto é atalho do sistema ou do navegador, e
        // no Mac o Ctrl+clique é o menu de contexto - por isso metaKey fora.
        if (!e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
        // Dentro do próprio chat, Ctrl+clique continua sendo Ctrl+clique.
        if (e.target?.closest?.('[data-eme-float]')) return;
        // Em campo de texto, o Ctrl+clique é do sistema (seleção).
        if (e.target?.closest?.('input, textarea, [contenteditable="true"]')) return;

        const ref = marcarElemento(e.target);
        if (!ref) return;

        // Só engole o clique quando REALMENTE marcou algo: assim um Ctrl+clique
        // em área vazia continua se comportando como sempre.
        e.preventDefault();
        e.stopPropagation();
        aoMarcar?.(ref);
    };

    document.addEventListener('click', handler, true);
    return () => {
        document.removeEventListener('click', handler, true);
        instalado = false;
    };
}

export function useEmeScreenContext() {
    return {
        rota: computed(() => rota.value),
        tela: computed(() => tela.value),
        secao: computed(() => secao.value),
        referencias: computed(() => referencias.value),
        removerReferencia,
        limparReferencias,
    };
}
