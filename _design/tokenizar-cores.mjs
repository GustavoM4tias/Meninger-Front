/**
 * tokenizar-cores.mjs — troca cor fixa do Tailwind pelos tokens do sistema.
 *
 *   node _design/tokenizar-cores.mjs <arquivo|pasta> [--dry]
 *
 * Nasceu na migração do Fluxo de Pagamento (415 ocorrências em 5 arquivos) e
 * é a ferramenta da Onda 5 do `ui-checklist.md`.
 *
 * ── O QUE ELE ACERTA, E POR QUE ISSO IMPORTA ─────────────────────────────
 *
 * A primeira versão trocava tudo por `cor/10` e transformou botão sólido em
 * transparente: `bg-blue-600 text-white` virou `bg-accent/10 text-white`, ou
 * seja, texto branco sobre quase nada. As três regras que consertaram:
 *
 *  1. PAR ANTES DE PEÇA. `text-gray-500 dark:text-slate-400` é UM token
 *     (`text-ink-muted`), não duas trocas. Trocar peça por peça deixa metade
 *     do par para trás e o resultado fica pior que o original.
 *  2. TINTA != SÓLIDO. Tom 50-200 é fundo esmaecido (vira `/10`); 500+ é cor
 *     chapada e continua chapada.
 *  3. `dark:` de estado SOME depois que o par foi resolvido. O token já troca
 *     sozinho entre os temas; manter o `dark:` recria o problema.
 *
 * ── O QUE ELE NÃO FAZ ────────────────────────────────────────────────────
 *
 * - Não decide semântica: assume vermelho=negativo, verde=positivo,
 *   âmbar=atenção, azul=acento. Se a tela usa vermelho como categoria (e não
 *   como erro), REVISE o resultado.
 * - Não toca em `text-white`: sobre botão de cor chapada ele está certo.
 * - Não conserta hover que virou igual ao normal - avisa no fim.
 * - NÃO distingue atributo `class` de SELETOR CSS. Dentro de `<style>`, uma
 *   regra como `.border-green-200 { }` vira `.border-data-pos/25 { }` e a barra
 *   sem escape QUEBRA o build (postcss). Depois de rodar em arquivo com bloco
 *   `<style>`, procure por seletor com `/` e escape (`.border-data-pos\/25`).
 *
 * SEMPRE rode `--dry` primeiro, e confira o diff antes de commitar.
 */
import fs from 'node:fs';
import path from 'node:path';

const FAM = {
    red: 'data-neg', rose: 'data-neg',
    emerald: 'data-pos', green: 'data-pos',
    amber: 'data-warn', yellow: 'data-warn', orange: 'data-warn',
    blue: 'accent', indigo: 'accent', sky: 'accent', cyan: 'accent',
    violet: 'accent', purple: 'accent',
};
const FAMS = Object.keys(FAM).join('|');
const CINZA = 'gray|slate|zinc|neutral|stone';

/* 1) Pares light/dark que já significam um token. */
const PARES = [
    [new RegExp(`\\btext-(?:${CINZA})-(?:700|800|900)\\s+dark:text-(?:${CINZA})-(?:100|200|300)\\b`, 'g'), 'text-ink'],
    [new RegExp(`\\btext-(?:${CINZA})-(?:500|600)\\s+dark:text-(?:${CINZA})-(?:300|400)\\b`, 'g'), 'text-ink-muted'],
    [new RegExp(`\\btext-(?:${CINZA})-400\\s+dark:text-(?:${CINZA})-(?:500|600)\\b`, 'g'), 'text-ink-subtle'],
    [new RegExp(`\\bbg-white\\s+dark:bg-(?:${CINZA})-(?:800|900)(?:/\\d+)?\\b`, 'g'), 'bg-surface-raised'],
    [new RegExp(`\\bbg-(?:${CINZA})-(?:50|100)\\s+dark:bg-(?:${CINZA})-(?:700|800|900)(?:/\\d+)?\\b`, 'g'), 'bg-surface-sunken'],
    [new RegExp(`\\bborder-(?:${CINZA})-(?:100|200|300)\\s+dark:border-(?:${CINZA})-(?:600|700|800)\\b`, 'g'), 'border-line'],
    [new RegExp(`\\bhover:bg-(?:${CINZA})-(?:50|100|200)\\s+dark:hover:bg-(?:${CINZA})-(?:700|800)(?:/\\d+)?\\b`, 'g'), 'hover:bg-surface-sunken'],
    [new RegExp(`\\bdivide-(?:${CINZA})-(?:100|200)\\s+dark:divide-(?:${CINZA})-(?:700|800)\\b`, 'g'), 'divide-line'],
];

/* 2) Pares da MESMA família de estado. */
const PAR_TEXT = new RegExp(`\\btext-(${FAMS})-(?:500|600|700|800)\\s+dark:text-\\1-(?:200|300|400|500)\\b`, 'g');
const PAR_BG = new RegExp(`\\bbg-(${FAMS})-(?:50|100)\\s+dark:bg-\\1-(?:800|900)(/\\d+)?\\b`, 'g');
const PAR_BORDER = new RegExp(`\\bborder-(${FAMS})-(?:200|300)\\s+dark:border-\\1-(?:600|700|800)\\b`, 'g');

/* 3) Sobras de estado, uma a uma. */
const SOBRA = new RegExp(
    `\\b((?:dark:|hover:|focus:|group-hover:|dark:hover:)*)(bg|text|border|ring|from|to)-(${FAMS})-(\\d{2,3})(/\\d+)?\\b`, 'g');

/* 4) Cinzas soltos. */
const CINZAS = [
    [new RegExp(`\\b(?:dark:)?text-(?:${CINZA})-(?:100|200|700|800|900)\\b`, 'g'), 'text-ink'],
    [new RegExp(`\\b(?:dark:)?text-(?:${CINZA})-(?:300|400)\\b`, 'g'), 'text-ink-subtle'],
    [new RegExp(`\\b(?:dark:)?text-(?:${CINZA})-(?:500|600)\\b`, 'g'), 'text-ink-muted'],
    [new RegExp(`\\b(?:dark:)?hover:bg-(?:${CINZA})-\\d{2,3}(?:/\\d+)?\\b`, 'g'), 'hover:bg-surface-sunken'],
    [new RegExp(`\\b(?:dark:)?bg-(?:${CINZA})-(?:50|100|200|700|800)(?:/\\d+)?\\b`, 'g'), 'bg-surface-sunken'],
    [new RegExp(`\\b(?:dark:)?bg-(?:${CINZA})-(?:900|950)(?:/\\d+)?\\b`, 'g'), 'bg-surface'],
    [/\bbg-white\b/g, 'bg-surface-raised'],
    [new RegExp(`\\b(?:dark:)?border-(?:${CINZA})-\\d{2,3}\\b`, 'g'), 'border-line'],
    [new RegExp(`\\b(?:dark:)?divide-(?:${CINZA})-\\d{2,3}\\b`, 'g'), 'divide-line'],
];

const CONTA = new RegExp(`\\b(?:bg|text|border|ring|divide|from|to)-(?:white|black|${CINZA}|${FAMS})(?:-\\d{2,3})?\\b`, 'g');

function sobraEstado(_m, mod, pre, fam, tom, op) {
    const tok = FAM[fam];
    if (mod.startsWith('dark:')) return '';          // o par já resolveu
    if (pre === 'text') return `${mod}text-${tok}`;
    /* TINTA primeiro, opacidade depois. `bg-blue-50/60` é um azul quase branco
       a 60%; herdar esse `/60` no token forte devolve um acento saturado no
       lugar de um fundo esmaecido. O tom claro define o nível, não o sufixo. */
    if (Number(tom) <= 200) return `${mod}${pre}-${tok}${pre === 'bg' ? '/10' : '/25'}`;
    if (op) return `${mod}${pre}-${tok}${op}`;
    return `${mod}${pre}-${tok}`;                    // sólido continua sólido
}

/* Só isto conta como COR nossa, e serve para o colapso saber o que pode comer.
   `text-` é sobrecarregado (`text-sm`, `text-center`, `text-accent`): colapsar
   sem esta lista transforma `text-accent text-sm` em `text-sm` e a cor SOME —
   foi assim que o `.op-icon` da Ficha Comercial perdeu o azul. */
const COR = '(?:ink|ink-muted|ink-subtle|accent|accent-soft|accent-hover|'
    + 'data-(?:pos|neg|warn|neutral)(?:-soft)?|surface|surface-raised|surface-sunken|'
    + 'surface-hover|line|line-strong|line-subtle|series-[1-8](?:-soft)?|'
    + 'white|black|scrim|transparent|current|inherit)(?:\\/\\d+)?';

/** Duas classes do mesmo prefixo lado a lado: fica a última (a do token).
 *  Os DOIS lados precisam ser COR. Todo prefixo do Tailwind é sobrecarregado:
 *  `text-sm` é tamanho, `border-b` é lado, `border-2` é espessura,
 *  `bg-gradient-to-r` é imagem, `divide-x` é eixo, `ring-2` é largura.
 *  Sem esta trava o colapso come a peça útil e a borda/cor SOME da tela. */
function colapsar(txt) {
    const re = new RegExp(
        `\\b((?:hover:|focus:|dark:|group-hover:)*)(bg|text|border|ring|divide)-${COR}` +
        `\\s+\\1(\\2-${COR})\\b`, 'g');
    for (let i = 0; i < 4; i++) {
        const novo = txt.replace(re, '$1$3');
        if (novo === txt) break;
        txt = novo;
    }
    return txt;
}

function tokenizar(src) {
    let s = src;
    s = s.replace(PAR_TEXT, (_m, fam) => `text-${FAM[fam]}`);
    /* Par de TINTA: os dois lados já são fundo esmaecido (claro-100 / escuro-900).
       A opacidade do lado escuro vale para o 900, não para o token do meio -
       herdá-la devolvia um `/30` saturado onde havia um fundo quase branco. */
    s = s.replace(PAR_BG, (_m, fam) => `bg-${FAM[fam]}/10`);
    s = s.replace(PAR_BORDER, (_m, fam) => `border-${FAM[fam]}/25`);
    for (const [re, tok] of PARES) s = s.replace(re, tok);
    s = s.replace(SOBRA, sobraEstado);
    for (const [re, tok] of CINZAS) s = s.replace(re, tok);
    s = colapsar(s);
    /* Piso de 11px: fica com o `piso-tipografia.mjs`, que sabe isentar ícone.
       Aqui a troca cega transformava marcador de 3px em borrão de 11px. */
    return s;
}

/* ── Execução ───────────────────────────────────────────────────────────── */
const alvo = process.argv[2];
const seco = process.argv.includes('--dry');
if (!alvo) {
    console.error('uso: node _design/tokenizar-cores.mjs <arquivo|pasta> [--dry]');
    process.exit(2);
}

const arquivos = [];
(function juntar(p) {
    const st = fs.statSync(p);
    if (st.isDirectory()) {
        for (const e of fs.readdirSync(p)) juntar(path.join(p, e));
    } else if (/\.vue$/.test(p)) {
        arquivos.push(p);
    }
})(alvo);

let totalAntes = 0, totalDepois = 0;
const avisos = [];

for (const f of arquivos) {
    const src = fs.readFileSync(f, 'utf8');
    const antes = (src.match(CONTA) || []).length;
    if (!antes) continue;
    const out = tokenizar(src);
    const depois = (out.match(CONTA) || []).length;
    totalAntes += antes; totalDepois += depois;

    /* Hover que ficou igual ao normal não faz nada - precisa de revisão. */
    for (const m of out.matchAll(/\b(bg-[\w-]+(?:\/\d+)?) hover:\1\b/g)) {
        avisos.push(`${f}: hover igual ao normal em "${m[1]}"`);
    }
    if (!seco) fs.writeFileSync(f, out);
    console.log(`  ${path.relative(process.cwd(), f)}: ${antes} -> ${depois}`);
}

console.log(`\n${seco ? '[seco] ' : ''}total: ${totalAntes} -> ${totalDepois}`);
if (avisos.length) {
    console.log('\nrevisar:');
    avisos.forEach((a) => console.log('  ' + a));
}
console.log('\nSemântica NÃO é verificada: confira o diff antes de commitar.');
