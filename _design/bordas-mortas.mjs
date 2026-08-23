/**
 * bordas-mortas.mjs — acha borda que não desenha nada.
 *
 *   node _design/bordas-mortas.mjs <arquivo|pasta>
 *
 * No Tailwind, `border-line` define SÓ a cor. Sem `border` (largura), `border-2`
 * ou `border-b`, a largura é 0 e NADA aparece. O mesmo vale para `divide-line`
 * sem `divide-y` e `ring-accent` sem `ring`.
 *
 * ── POR QUE ISTO EXISTE ──────────────────────────────────────────────────
 *
 * O `tokenizar-cores.mjs` tinha um colapso que comia a peça útil quando duas
 * classes do mesmo prefixo ficavam lado a lado: `border-b border-line` virava
 * `border-line`, e a divisória sumia da tela sem quebrar o build. O bug já foi
 * corrigido lá, mas as telas tokenizadas antes disso ficaram com as bordas
 * comidas — foi assim que o Fluxo de Pagamento e o Boleto Caixa perderam as
 * suas. Este script encontra o estrago sem precisar do histórico.
 *
 * ── COMO LER O RESULTADO ─────────────────────────────────────────────────
 *
 * A checagem é por TAG, não por linha (o atributo `class` quebra em várias
 * linhas). Mesmo assim há FALSO POSITIVO, e ele é sempre o mesmo caso:
 * componente cuja raiz já traz a largura, e a classe de fora só troca a cor.
 *
 *     <Panel class="border-data-warn/30">   <- ok: `.panel` já tem `border`
 *
 * Por isso o relatório separa "tag de componente" (revisar) de "tag HTML"
 * (quase sempre bug de verdade).
 */
import fs from 'node:fs';
import path from 'node:path';

/* Os tokens de cor do sistema. Cor fora desta lista não interessa aqui. */
const COR = '(?:ink|ink-muted|ink-subtle|accent|accent-soft|accent-hover|accent-ring'
    + '|data-(?:pos|neg|warn|neutral)(?:-soft|-area)?'
    + '|surface|surface-raised|surface-sunken|surface-hover'
    + '|line|line-strong|line-subtle|series-[1-8](?:-soft)?'
    + '|white|black|transparent|current)';

/* O que DÁ largura. Aceita lado, espessura, estilo e as combinações
   (`border`, `border-2`, `border-b`, `border-l-2`, `border-dashed`). */
const LARGURA = {
    border: new RegExp('\\bborder(?:-[btlrxyse])?(?:-(?:\\d+|solid|dashed|dotted|double|none|\\[[^\\]]+\\]))?(?![\\w-])'),
    divide: new RegExp('\\bdivide-(?:[xy](?:-\\d+)?|solid|dashed|dotted|double|none)(?![\\w-])'),
    ring: new RegExp('\\bring(?:-(?:\\d+|inset))?(?![\\w-])'),
};
const APENAS_COR = Object.fromEntries(
    Object.keys(LARGURA).map((p) => [p, new RegExp(`\\b${p}-(?:${COR})(?:/\\d+)?(?![\\w-])`)]),
);

/* Classes do projeto que JÁ trazem largura de borda (ver main.css). Um
   `hover:border-accent/40` em cima de `.surface-card` é válido: a largura vem
   da classe. Sem esta lista, todo cartão do sistema virava falso positivo. */
const CLASSE_COM_BORDA = /(?:surface-card|panel-focus|panel-head|panel)/;

const TAG = /<[a-zA-Z][^>]*?>/gs;

const alvo = process.argv[2];
if (!alvo) {
    console.error('uso: node _design/bordas-mortas.mjs <arquivo|pasta>');
    process.exit(2);
}

const arquivos = [];
(function juntar(p) {
    const st = fs.statSync(p);
    if (st.isDirectory()) for (const e of fs.readdirSync(p)) juntar(path.join(p, e));
    else if (/\.vue$/.test(p)) arquivos.push(p);
})(alvo);

const componente = [];
const html = [];

for (const f of arquivos) {
    const src = fs.readFileSync(f, 'utf8');
    const i = src.indexOf('<template>');
    if (i < 0) continue;
    const tpl = src.slice(i, src.lastIndexOf('</template>'));

    for (const m of tpl.matchAll(TAG)) {
        const tag = m[0];
        /* `.surface-card` e `.panel` já trazem `border border-line`, então um
           `hover:border-accent/40` em cima delas é válido: a largura vem dali. */
        const temClasse = CLASSE_COM_BORDA.test(tag);
        for (const pre of Object.keys(LARGURA)) {
            const soCor = APENAS_COR[pre].test(tag);
            const temLargura = LARGURA[pre].test(tag) || (pre === 'border' && temClasse);
            if (soCor && !temLargura) {
                const linha = src.slice(0, i + m.index).split('\n').length;
                /* Tag que começa com maiúscula é componente: a largura pode vir
                   da raiz dele, então isso é "revisar", não "bug". */
                const ehComponente = /^<[A-Z]/.test(tag);
                (ehComponente ? componente : html).push({
                    f: path.relative(process.cwd(), f), linha, pre,
                    trecho: tag.replace(/\s+/g, ' ').slice(0, 100),
                });
                break;
            }
        }
    }
}

if (html.length) {
    console.log('\nBORDA MORTA (tag HTML - quase sempre bug de verdade):');
    for (const a of html) console.log(`  ${a.f}:${a.linha} [${a.pre}]\n      ${a.trecho}`);
}
if (componente.length) {
    console.log('\nREVISAR (tag de componente - a largura pode vir da raiz dele):');
    for (const a of componente) console.log(`  ${a.f}:${a.linha} [${a.pre}]  ${a.trecho}`);
}
console.log(`\ntotal: ${html.length} provável(is) + ${componente.length} a revisar`);
if (!html.length && !componente.length) console.log('nenhuma borda morta.');
