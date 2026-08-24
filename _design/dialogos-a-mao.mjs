/**
 * Acha aviso, confirmação e modal escritos à mão.
 *
 * As três dívidas que esta varredura fechou têm a mesma forma: alguém precisou
 * de um aviso, de um "tem certeza?" ou de um diálogo, não achou o primitivo, e
 * escreveu o seu. Cada cópia parece igual e erra em algo diferente - o balão
 * próprio perde a fila, o `confirm()` não tem onde escrever a consequência, e
 * o `fixed inset-0` à mão perde o Escape e a trava de rolagem.
 *
 * A REGRA vive em `regras-dialogo.mjs`, importada também pelo `mapscreens`:
 * enquanto ela estava duplicada, um dizia "zero" e o outro contava dívida já
 * resolvida.
 *
 * Rodar:  node _design/dialogos-a-mao.mjs
 * Sai com 1 se achar alguma, para caber em hook ou CI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dialogosNativos, overlaysAMao, baloesProprios } from './regras-dialogo.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(process.argv[2] ? path.resolve(process.argv[2]) : path.join(AQUI, '..'), 'src');

/* Academy é outro host e está fora do design system (ver o pivot do Academy). */
const FORA_DE_ESCOPO = ['Academy'];

const REGRAS = [
    { nome: 'dialogo do navegador', achar: dialogosNativos, conserto: 'use pedirConfirmacao() ou useToast()' },
    { nome: 'balao proprio no canto', achar: baloesProprios, conserto: 'use useToast()' },
    { nome: 'overlay a mao', achar: overlaysAMao, conserto: 'use o primitivo Modal' },
];

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
    for (const r of REGRAS) {
        for (const a of r.achar(fonte)) {
            achados++;
            console.log(`${path.relative(RAIZ, f).split(path.sep).join('/')}:${a.linha}`);
            console.log(`   ${r.nome} -> ${r.conserto}`);
            console.log(`   ${a.texto.slice(0, 100)}`);
        }
    }
}

console.log(achados
    ? `
${achados} peça(s) escrita(s) à mão. Cada uma vira um jeito diferente de errar.`
    : 'Nenhum aviso, confirmação ou modal escrito à mão.');
process.exit(achados ? 1 : 0);
