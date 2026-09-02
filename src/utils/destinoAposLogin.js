/**
 * O destino de quem chegou por link direto.
 * ─────────────────────────────────────────────────────────────────────────────
 * Antes, quem abria um link do Office deslogado caía no login e, depois de
 * entrar, ia parar na Home - com o link perdido. Quem não tem intimidade com o
 * menu simplesmente desistia ali. Vale para link de notificação também: todas
 * as notificações do Office carregam link, e todas caíam nesse mesmo buraco.
 *
 * O caminho fica em dois lugares de propósito:
 *   - na QUERY (`?destino=`), que é o que atravessa o formulário de senha;
 *   - no sessionStorage, que é o que atravessa o desvio até a Microsoft e de
 *     volta (a query não sobrevive ao redirecionamento do OAuth).
 *
 * SEGURANÇA: só caminho interno é aceito. Sem esta checagem, um
 * `?destino=https://site-falso` transformaria a tela de login da empresa numa
 * ponte para fora - o clássico open redirect.
 */
const CHAVE = 'menin:destino-apos-login';

export function destinoValido(caminho) {
    if (!caminho || typeof caminho !== 'string') return null;
    // Precisa começar com uma única barra: `//outro-site` e `https://...` são
    // absolutos e sairiam do Office.
    if (!caminho.startsWith('/') || caminho.startsWith('//')) return null;
    if (caminho.startsWith('/login')) return null;   // laço infinito
    return caminho;
}

export function guardarDestino(caminho) {
    const limpo = destinoValido(caminho);
    try {
        if (limpo) sessionStorage.setItem(CHAVE, limpo);
        else sessionStorage.removeItem(CHAVE);
    } catch { /* navegador sem sessionStorage: o fluxo segue pela query */ }
}

/** Lê e apaga: destino é de uso único, não pode reaparecer no próximo login. */
export function consumirDestino(daQuery = '') {
    const daSessao = (() => {
        try { return sessionStorage.getItem(CHAVE); } catch { return null; }
    })();
    try { sessionStorage.removeItem(CHAVE); } catch { /* ignora */ }

    return destinoValido(daQuery) || destinoValido(daSessao) || null;
}

export default { destinoValido, guardarDestino, consumirDestino };
