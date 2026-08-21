/**
 * A frase de erro que vai para a tela.
 * ─────────────────────────────────────────────────────────────────────────────
 * O `fetch` do navegador lança `TypeError: Failed to fetch` quando não conseguiu
 * falar com o servidor - rede caiu, backend reiniciando, CORS. Jogar isso na
 * tela entrega ao usuário uma frase em inglês que não diz o que aconteceu nem o
 * que fazer, e ainda parece defeito do sistema.
 *
 * Aqui a mensagem técnica vira frase de gente, e o detalhe original vai para o
 * console - que é onde ele serve para alguma coisa.
 *
 * Regra do padrão (ver `_design/RECEITA-TELA-EXECUTIVA.md`, seção Estados):
 * todo bloco de erro de tela passa por aqui. A mensagem que o NOSSO backend
 * escreve é preservada: ela já vem em português e já é específica.
 *
 *   catch (e) { erro.value = mensagemDeErro(e, 'Não foi possível carregar X.'); }
 */

/* `Failed to fetch` (Chrome), `NetworkError`/`Load failed` (Firefox/Safari) e
   `AbortError` de timeout: todos querem dizer "não houve resposta". */
const SEM_RESPOSTA = /failed to fetch|networkerror|load failed|network request failed|fetch failed/i;

export function ehFalhaDeRede(erro) {
    if (!erro) return false;
    if (erro.status) return false;              // houve resposta HTTP: não é rede
    if (erro.name === 'AbortError') return true;
    return SEM_RESPOSTA.test(String(erro.message || erro));
}

export function mensagemDeErro(erro, padrao = 'Não foi possível concluir a operação.') {
    if (ehFalhaDeRede(erro)) {
        console.warn('[rede]', erro?.message || erro);
        return 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo.';
    }

    const msg = String(erro?.message || '').trim();

    /* Mensagem vazia ou que é só o código HTTP não ajuda ninguém na tela. */
    if (!msg || /^HTTP \d+$/i.test(msg)) {
        console.warn('[erro]', erro);
        return padrao;
    }

    return msg;
}

export default mensagemDeErro;
