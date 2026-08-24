/**
 * Acha COMPOSABLE chamado sem import - `useAlgumaCoisa()` que não veio de
 * lugar nenhum.
 *
 * O `vite build` não pega isto: ele resolve import, não identificador. O
 * componente compila, a tela abre e quebra com
 * "ReferenceError: useCan is not defined" na frente do usuário. Aconteceu ao
 * extrair a caixa de entrada para componente: a linha do composable ficou para
 * trás sem o import.
 *
 * A receita de tela executiva já mandava conferir à mão ("identificador do Vue
 * não importado"). Conferência à mão depende de alguém lembrar; esta roda.
 *
 * POR QUE SÓ `use*`: uma primeira versão olhava toda chamada de função e
 * afogava em falso positivo - `async (v) =>` casa com "função chamada", e
 * template string com `${}` desalinha qualquer recorte ingênuo de código.
 * `use[A-Z]` é a convenção de composable do Vue, é onde o erro nasce (store,
 * router, permissão, toast) e não tem homônimo em sintaxe.
 *
 * Rodar:  node _design/identificadores-soltos.mjs [pasta]
 * Sai com 1 se achar algum.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(process.argv[2] || path.join(AQUI, '..', 'src'));

/* Existem sem import dentro do <script setup>. */
const NATIVOS = new Set(['useSlots', 'useAttrs', 'useCssModule', 'useCssVars', 'useId', 'useModel', 'useTemplateRef']);

const FORA_DE_ESCOPO = ['Academy'];

function* arquivos(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (FORA_DE_ESCOPO.includes(e.name)) continue;
            yield* arquivos(p);
        } else if (e.name.endsWith('.vue') || e.name.endsWith('.js')) {
            yield p;
        }
    }
}

const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

let achados = 0;
for (const f of arquivos(RAIZ)) {
    const fonte = fs.readFileSync(f, 'utf8');
    const bloco = f.endsWith('.vue')
        ? (fonte.match(/<script[^>]*>([\s\S]*?)<\/script>/) || [])[1]
        : fonte;
    if (!bloco) continue;

    const limpo = semComentarios(bloco);
    const linhas = bloco.split('\n');

    /* O que o arquivo tem de fato: importado, declarado ou desestruturado. */
    const definidos = new Set(NATIVOS);
    for (const m of limpo.matchAll(/import\s+([\s\S]*?)\s+from\s/g)) {
        for (const n of m[1].split(',')) {
            const nome = n.split(' as ').pop().replace(/[{}\s]/g, '');
            if (nome) definidos.add(nome);
        }
    }
    for (const m of limpo.matchAll(/\b(?:const|let|var|function)\s+(use[A-Z][\w$]*)/g)) definidos.add(m[1]);

    const vistos = new Set();
    for (const m of limpo.matchAll(/(^|[^\w$.?])(use[A-Z][\w$]*)\s*\(/g)) {
        const nome = m[2];
        if (definidos.has(nome) || vistos.has(nome)) continue;
        vistos.add(nome);
        achados++;
        const linha = linhas.findIndex(l => new RegExp(`\\b${nome}\\s*\\(`).test(l)) + 1;
        console.log(`${path.relative(RAIZ, f).split(path.sep).join('/')}:${linha || '?'}`);
        console.log(`   "${nome}" é chamado e não foi importado nem declarado`);
        console.log(`   ${(linhas[linha - 1] || '').trim().slice(0, 100)}`);
    }
}

console.log(achados
    ? `\n${achados} composable(s) sem import. O build passa; a tela quebra ao abrir.`
    : 'Nenhum composable solto: tudo que é chamado veio de algum lugar.');
process.exit(achados ? 1 : 0);
