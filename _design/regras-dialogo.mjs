/**
 * A regra de "isto é um diálogo escrito à mão" — UMA só, importada pelos dois
 * verificadores.
 *
 * Ela existia duplicada: o `dialogos-a-mao` tinha a versão corrigida e o
 * `mapscreens` tinha a ingênua. O resultado foi o placar jurar "zero diálogo
 * nativo" enquanto havia 71 espalhados pelo sistema, e depois acusar dívida
 * que já tinha sido resolvida. Duas cópias de uma regra são duas regras.
 */

/* Comentário não é código. Sem isto, o próprio texto que EXPLICA por que um
   `confirm()` saiu dali conta como um `confirm()` vivo. */
const COMENTARIO = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|<!--[\s\S]*?-->/g;
export const semComentarios = (s) => s.replace(COMENTARIO, '');

/* Desvio DECLARADO, com o motivo escrito no arquivo:
     design:dialogo-proprio            vale para as 8 linhas seguintes
     design:dialogo-proprio(arquivo)   vale para o arquivo inteiro */
export const MARCA_LOCAL = /design:dialogo-proprio(?!\(arquivo\))/;
export const MARCA_DE_ARQUIVO = /design:dialogo-proprio\(arquivo\)/;

const CHAMADA = /(?<![\w.$'"])(?:window\.)?(alert|confirm|prompt)\s*\(/g;

/* `emit('confirm')`, `function confirm()` e `const confirm = ...` NÃO são
   diálogo do navegador: são o nome de um evento ou de uma função da própria
   tela. Sem esta peneira, todo modal com um botão "Confirmar" virava achado. */
const FALSO_POSITIVO = /(emit|\$emit)\s*\(\s*$|(function|const)\s+$|async function\s+$/;

/** Ocorrências de diálogo nativo em um arquivo, já filtradas. */
export function dialogosNativos(fonte) {
    if (MARCA_DE_ARQUIVO.test(fonte)) return [];
    const linhas = fonte.split('\n');
    const limpo = semComentarios(fonte).split('\n');
    const achados = [];
    limpo.forEach((linha, i) => {
        if (linha.includes('defineEmits')) return;
        for (const m of linha.matchAll(CHAMADA)) {
            if (FALSO_POSITIVO.test(linha.slice(0, m.index))) continue;
            const vizinhanca = linhas.slice(Math.max(0, i - 8), i + 1).join('\n');
            if (MARCA_LOCAL.test(vizinhanca)) continue;
            achados.push({ linha: i + 1, tipo: m[1], texto: (linhas[i] || '').trim() });
        }
    });
    return achados;
}

/** Overlay de diálogo escrito à mão (o primitivo Modal é quem deveria fazer). */
export function overlaysAMao(fonte) {
    if (MARCA_DE_ARQUIVO.test(fonte)) return [];
    const linhas = fonte.split('\n');
    const achados = [];
    semComentarios(fonte).split('\n').forEach((linha, i) => {
        if (!/class="[^"]*fixed inset-0 z-/.test(linha)) return;
        const vizinhanca = linhas.slice(Math.max(0, i - 8), i + 1).join('\n');
        if (MARCA_LOCAL.test(vizinhanca)) return;
        achados.push({ linha: i + 1, texto: (linhas[i] || '').trim() });
    });
    return achados;
}

/** Balão de aviso próprio no canto (o `useToast()` é quem deveria fazer). */
export function baloesProprios(fonte) {
    if (MARCA_DE_ARQUIVO.test(fonte)) return [];
    const linhas = fonte.split('\n');
    const achados = [];
    semComentarios(fonte).split('\n').forEach((linha, i) => {
        /* Só conta quando aparece POR MENSAGEM (`v-if` num texto). A ActionBar
           também mora no canto e é outra coisa: parte da página, não um aviso
           que vai e volta. */
        if (!/v-if="[^"]*(msg|message|texto|text|toast|feedback|flash)[^"]*"/i.test(linha)) return;
        if (!/class="[^"]*fixed bottom-/.test(linhas.slice(i, i + 4).join('\n'))) return;
        const vizinhanca = linhas.slice(Math.max(0, i - 8), i + 1).join('\n');
        if (MARCA_LOCAL.test(vizinhanca)) return;
        achados.push({ linha: i + 1, texto: (linhas[i] || '').trim() });
    });
    return achados;
}
