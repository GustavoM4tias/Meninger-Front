/**
 * Acha aviso, confirmação e modal escritos à mão.
 *
 * As três dívidas que esta varredura fechou têm a mesma forma: alguém precisou
 * de um aviso, de um "tem certeza?" ou de um diálogo, não achou o primitivo, e
 * escreveu o seu. Cada cópia parece igual e erra em algo diferente - o balão
 * próprio perde a fila, o `confirm()` não tem onde escrever a consequência, e
 * o `fixed inset-0` à mão perde o Escape e a trava de rolagem.
 *
 * Rodar:  node _design/dialogos-a-mao.mjs
 * Sai com 1 se achar alguma, para caber em hook ou CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* Ancorado no proprio arquivo, nao no cwd: assim roda de qualquer pasta. */
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(process.argv[2] ? path.resolve(process.argv[2]) : path.join(AQUI, '..'), 'src');

/* Academy é outro host e está fora do design system (ver o pivot do Academy). */
const FORA_DE_ESCOPO = ['Academy'];

/* Onde o desvio é DECLARADO, com o motivo escrito no próprio arquivo. Um
   marcador precisa dizer POR QUE, senão vira licença para tudo.
   Dois alcances:
     design:dialogo-proprio            vale para as 8 linhas seguintes
     design:dialogo-proprio(arquivo)   vale para o arquivo inteiro
   O de arquivo é para o caso em que o arquivo TODO é a exceção - o trecho
   que o Office gera para rodar no site do cliente, por exemplo. */
const MARCA_LOCAL = /design:dialogo-proprio(?!\(arquivo\))/;
const MARCA_DE_ARQUIVO = /design:dialogo-proprio\(arquivo\)/;

const REGRAS = [
    {
        nome: 'dialogo do navegador',
        // `window.` opcional; ignora `emit('confirm')` e `function confirm()`
        rx: /(?<![\w.$'"])(?:window\.)?(alert|confirm|prompt)\s*\(/,
        antes: /(emit|\$emit)\s*\(\s*$|(function|const)\s+$/,
        conserto: 'use pedirConfirmacao() ou useToast()',
    },
    {
        /* Balão no canto SÓ conta quando aparece por mensagem (`v-if` num
           texto). A ActionBar também mora no canto e é outra coisa: ela é
           parte da página, não um aviso que vai e volta. */
        nome: 'balao proprio no canto',
        rx: /v-if="[^"]*(msg|message|texto|text|toast|feedback|flash)[^"]*"/i,
        exige: /class="[^"]*fixed bottom-/,
        conserto: 'use useToast()',
    },
    {
        nome: 'overlay a mao',
        rx: /class="[^"]*fixed inset-0 z-/,
        conserto: 'use o primitivo Modal',
    },
];

const LINHA_DE_COMENTARIO = /^\s*(\/\/|\*|<!--)/;

/* Comentário de bloco cujas linhas do meio NÃO começam com `*` enganava a
   varredura: três "achados" eram só a palavra confirm() dentro de um texto
   explicando por que ela saiu dali. */
function marcarComentarios(linhas) {
    let dentro = false;
    return linhas.map((l) => {
        const abre = l.lastIndexOf('/*');
        const fecha = l.lastIndexOf('*/');
        const era = dentro;
        if (abre > fecha) dentro = true;
        else if (fecha > abre && fecha !== -1) dentro = false;
        return era || dentro || LINHA_DE_COMENTARIO.test(l);
    });
}

function* arquivos(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (FORA_DE_ESCOPO.includes(e.name)) continue;
            yield* arquivos(p);
        } else if (/\.(vue|js)$/.test(e.name)) {
            yield p;
        }
    }
}

let achados = 0;
for (const f of arquivos(RAIZ)) {
    const fonte = fs.readFileSync(f, 'utf8');
    if (MARCA_DE_ARQUIVO.test(fonte)) continue;
    const linhas = fonte.split('\n');
    const comentario = marcarComentarios(linhas);
    linhas.forEach((linha, i) => {
        if (comentario[i]) return;
        for (const r of REGRAS) {
            const m = r.rx.exec(linha);
            if (!m) continue;
            if (r.antes && r.antes.test(linha.slice(0, m.index))) continue;
            if (r.exige && !r.exige.test(linhas.slice(i, i + 4).join('\n'))) continue;
            /* Exceção declarada: o motivo tem que estar escrito por perto. */
            const vizinhanca = linhas.slice(Math.max(0, i - 8), i + 1).join('\n');
            if (MARCA_LOCAL.test(vizinhanca)) continue;
            achados++;
            console.log(`${path.relative(RAIZ, f).replace(/\\/g, '/')}:${i + 1}`);
            console.log(`   ${r.nome} -> ${r.conserto}`);
            console.log(`   ${linha.trim().slice(0, 100)}`);
        }
    });
}

console.log(achados
    ? `\n${achados} peça(s) escrita(s) à mão. Cada uma vira um jeito diferente de errar.`
    : 'Nenhum aviso, confirmação ou modal escrito à mão.');
process.exit(achados ? 1 : 0);
