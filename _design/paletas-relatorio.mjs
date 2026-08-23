/**
 * Conserta o daltonismo das paletas de relatório MEXENDO O MÍNIMO.
 *
 * Gerar paletas do zero passa nos testes mas mata a identidade: o Executivo
 * (azul-marinho sóbrio) virava azul claro com salmão, e o Minimalista, que é
 * cinza de propósito, virava arco-íris. Então aqui a busca parte das cores
 * ATUAIS e só move o slot que está quebrando — primeiro a luminância, que é o
 * eixo que nenhum daltonismo perde, e só depois a matiz, em passos pequenos.
 *
 * O slot 0 nunca se move: é o acento do tema, a cor que a pessoa escolheu.
 *
 * Como rodar (a partir de _design/):
 *   node paletas-relatorio.mjs temas.json saida.json
 * onde temas.json é [{tema, claro:[6 hex], escuro:[6 hex]}, ...] extraído de
 * src/components/Reports/themes.js. O validate_palette.js ao lado vem da
 * skill dataviz - é ele que mede, para ninguém julgar cor no olho.
 */
import { validate } from './validate_palette.js';
import fs from 'node:fs';

const hex2 = (h) => { h = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
const s2lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lin2s = (c) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };

function okl([r, g, b]) {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function lino([L, a, b]) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
}
const toHex = (rgb) => '#' + rgb.map((c) => Math.round(lin2s(c) * 255).toString(16).padStart(2, '0')).join('');
const inGamut = (rgb) => rgb.every((c) => c >= -0.003 && c <= 1.003);

const lch = (hex) => { const [L, a, b] = okl(hex2(hex).map(s2lin)); return [L, Math.hypot(a, b), Math.atan2(b, a)]; };
function daLCH(L, C, H) {
    let c = C; let rgb;
    do { rgb = lino([L, c * Math.cos(H), c * Math.sin(H)]); c -= 0.004; } while (!inGamut(rgb) && c > 0.02);
    return toHex(rgb.map((x) => Math.max(0, Math.min(1, x))));
}

const num = (msg) => Number((msg.match(/ΔE ([\d.]+)/) || [])[1] ?? 0);
function medir(cores, modo) {
    const r = validate(cores, { mode: modo });
    const g = Object.fromEntries(r.report.map(([n, st, m]) => [n, { ok: st === true || st === 'pass', msg: m }]));
    return { cvd: num(g['CVD separation'].msg), nrm: num(g['Normal-vision floor'].msg) };
}
/* Nota mede o par MAIS FRACO: é ele que decide se o gráfico é legível. */
const nota = (c, modo) => {
    const m = medir(c, modo);
    const ilegiveis = c.slice(1).filter((x) => !legivel(x, modo)).length;
    return Math.min(m.cvd, 13) * 3 + Math.min(m.nrm, 20) - ilegiveis * 40;
};
const passa = (c, modo) => {
    const m = medir(c, modo);
    return m.cvd >= 8 && m.nrm >= 15 && c.slice(1).every((x) => legivel(x, modo));
};

/* As duas restricoes duras dos slots 1..5, alem do daltonismo:
   - BANDA: a faixa de luminancia de cada modo. NAO e a banda estreita do
     validador de propósito. Forcar a banda dele repinta as 9 paletas escuras
     inteiras e deixa o acento (slot 0, que nao se move) brilhando sozinho
     acima do resto — fica pior do que estava. As paletas escuras seguem a
     convencao 400 do Tailwind de forma uniforme, e ser mais claro que a banda
     sobre fundo escuro e o lado seguro. Aqui a banda so evita extremos.
   - CONTRASTE: 3:1 contra o fundo. Amarelo em fundo claro e quem reprova. */
const BANDA = { light: [0.42, 0.80], dark: [0.62, 0.88] };
const CROMA_MIN = 0.085; // sem isto a busca ganha separacao virando pastel quase branco
const FUNDO = { light: '#fcfcfb', dark: '#1a1a19' };
const relLum = (hex) => { const [r, g, b] = hex2(hex).map(s2lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
function contraste(hex, modo) {
    const a = relLum(hex); const b = relLum(FUNDO[modo]);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
const legivel = (hex, modo) => {
    const [L, C] = lch(hex);
    return L >= BANDA[modo][0] && L <= BANDA[modo][1]
        && C >= CROMA_MIN && contraste(hex, modo) >= 3.05;
};

/* Candidatos para um slot, do mais parecido com o original ao menos parecido. */
function* candidatos(hex, modo) {
    const [L0, C0, H0] = lch(hex);
    const faixa = BANDA[modo];
    const preso = (L) => Math.min(faixa[1], Math.max(faixa[0], L));
    for (const dH of [0, 0.08, -0.08, 0.16, -0.16, 0.24, -0.24, 0.34, -0.34, 0.45, -0.45, 0.6, -0.6]) {
        for (const dL of [0, 0.05, -0.05, 0.10, -0.10, 0.15, -0.15, 0.20, -0.20, 0.26, -0.26]) {
            for (const C of [Math.max(C0, 0.11), 0.15, 0.19]) {
                const c = daLCH(preso(L0 + dL), C, H0 + dH);
                if (legivel(c, modo)) yield c;
            }
        }
    }
}

/** Passa slot a slot (do 1 ao 5) trocando só quem melhora a nota. */
function reparar(orig, modo) {
    const dentro = (hex) => {
        if (legivel(hex, modo)) return hex;
        const [L, C, H] = lch(hex);
        const [lo, hi] = BANDA[modo];
        let alvo = Math.min(hi, Math.max(lo, L)); let c = daLCH(alvo, Math.max(C, 0.11), H);
        /* Amarelo em fundo claro so alcanca 3:1 escurecendo: desce ate passar. */
        for (let k = 0; k < 30 && contraste(c, modo) < 3.05; k++) {
            alvo += modo === 'light' ? -0.012 : 0.012;
            if (alvo < 0.2 || alvo > 0.95) break;
            c = daLCH(alvo, Math.max(C, 0.11), H);
        }
        return c;
    };
    let atual = [orig[0], ...orig.slice(1).map(dentro)];
    for (let volta = 0; volta < 4; volta++) {
        for (let i = 1; i < atual.length; i++) {
            let melhorCor = atual[i]; let melhorNota = nota(atual, modo);
            for (const cand of candidatos(orig[i], modo)) {
                const tent = atual.slice(); tent[i] = cand;
                const n = nota(tent, modo);
                if (n > melhorNota + 0.01) { melhorNota = n; melhorCor = cand; }
            }
            atual[i] = melhorCor;
        }
        if (passa(atual, modo)) break;
    }
    return atual;
}

/* A ordem dos slots muda quais cores ficam LADO A LADO, e é a vizinhanca que
   o teste mede. Trocar a ordem conserta sem repintar nada — por isso vem
   antes de continuar mexendo em cor. O slot 0 (o acento) fica onde esta. */
function melhorOrdem(cores, modo) {
    const resto = cores.slice(1);
    let melhor = cores; let melhorNota = nota(cores, modo);
    const perm = (arr, atual = []) => {
        if (!arr.length) {
            const tent = [cores[0], ...atual];
            const n = nota(tent, modo);
            if (n > melhorNota + 0.01) { melhorNota = n; melhor = tent; }
            return;
        }
        for (let i = 0; i < arr.length; i++) perm([...arr.slice(0, i), ...arr.slice(i + 1)], [...atual, arr[i]]);
    };
    perm(resto);
    return melhor;
}

const temas = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const PULAR = new Set(['minimal']); // cinza de propósito: ver nota no themes.js
const saida = {};

console.log('tema        modo    CVD antes/depois   normal   slots trocados');
for (const t of temas) {
    if (PULAR.has(t.tema)) { console.log(`${t.tema.padEnd(11)} (preservado: tema neutro)`); continue; }
    for (const [modo, cores] of [['light', t.claro], ['dark', t.escuro]]) {
        const orig = cores.slice(0, 6);
        const antes = medir(orig, modo);
        let novo = reparar(orig, modo);
        novo = reparar(melhorOrdem(novo, modo), modo);
        novo = reparar(melhorOrdem(novo, modo), modo);
        const dep = medir(novo, modo);
        const trocados = novo.filter((c) => !orig.includes(c)).length;
        saida[`${t.tema}:${modo}`] = novo;
        console.log(`${t.tema.padEnd(11)} ${modo.padEnd(6)} ${String(antes.cvd).padStart(4)} -> ${String(dep.cvd).padStart(4)}   ${String(antes.nrm).padStart(4)}->${String(dep.nrm).padStart(4)}   ${trocados}/5  ${dep.cvd >= 8 && dep.nrm >= 15 ? 'OK' : 'AINDA REPROVA'}`);
    }
}
fs.writeFileSync(process.argv[3], JSON.stringify(saida, null, 1));
