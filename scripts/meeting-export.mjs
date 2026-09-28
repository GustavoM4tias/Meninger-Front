// scripts/meeting-export.mjs
//
// Gera a versão de contingência de uma apresentação de meeting (public/meeting/<pasta>):
//   • <pasta>.html — arquivo ÚNICO, com imagens e fonte embutidas. Abre com dois
//     cliques, sem internet e sem servidor (pendrive, notebook do evento).
//   • <pasta>.pdf  — um slide por página, 1920×1080, já com as animações
//     concluídas e com os passos internos (galeria, decorado, roleta) expandidos.
//
// Uso:
//   npm run meeting:export                      -> parque-norte-v8AJc2KfXs
//   npm run meeting:export -- <pasta> [--out <dir>] [--no-pdf]
//
// O HTML não precisa de nada além do Node. O PDF usa o Playwright (Chromium);
// se não estiver instalado:  npm i -D playwright && npx playwright install chromium
//
// O sorteio ao vivo depende da API do Office: no HTML offline ele só funciona se
// houver internet; no PDF a API é bloqueada de propósito (nenhum nome de inscrito
// vai parar no arquivo).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const pasta = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out') || 'parque-norte-v8AJc2KfXs';
const outDir = path.resolve(ROOT, opt('--out') || 'meeting-export');

const srcDir = path.join(ROOT, 'public', 'meeting', pasta);
const srcHtml = path.join(srcDir, 'index.html');
if (!fs.existsSync(srcHtml)) { console.error(`[meeting-export] não achei ${srcHtml}`); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

// ---------- 1) HTML offline ----------
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml',
  gif: 'image/gif', woff2: 'font/woff2', mp4: 'video/mp4' };
const cache = new Map();
function dataUri(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const file = path.join(srcDir, rel);
  const ext = path.extname(rel).slice(1).toLowerCase();
  if (!fs.existsSync(file) || !MIME[ext]) return null;
  const uri = `data:${MIME[ext]};base64,${fs.readFileSync(file).toString('base64')}`;
  cache.set(rel, uri);
  return uri;
}

let html = fs.readFileSync(srcHtml, 'utf8');
// o redirect para "pasta/" só faz sentido hospedado; aberto como arquivo ele quebraria a página
html = html.replace(/<script>if\(!\/\\\/\$\/\.test\(location\.pathname\)\)[^<]*<\/script>\n?/, '');
const faltando = new Set();
html = html.replace(/(["'(])(a\/[\w.-]+\.[a-z0-9]+)/gi, (m, pre, rel) => {
  const uri = dataUri(rel);
  if (!uri) { faltando.add(rel); return m; }
  return pre + uri;
});
if (faltando.size) console.warn('[meeting-export] referências sem arquivo (ficaram como estão):', [...faltando].join(', '));

const outHtml = path.join(outDir, `${pasta}.html`);
fs.writeFileSync(outHtml, html);
console.log(`[meeting-export] HTML offline: ${path.relative(ROOT, outHtml)} (${(fs.statSync(outHtml).size / 1048576).toFixed(1)} MB)`);

if (flag('--no-pdf')) process.exit(0);

// ---------- 2) PDF ----------
let chromium;
try { ({ chromium } = await import('playwright')); }
catch {
  console.error('[meeting-export] PDF não gerado: Playwright não instalado.\n  npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const W = 1920, H = 1080;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.route(/^https?:\/\//, (r) => r.abort());          // nada de rede: nem API do sorteio
await page.goto(pathToFileURL(outHtml).href + '#1');
await page.waitForTimeout(3500);

// tempos de espera por cena (animações mais longas: contadores, roleta)
const LONGO = new Set(['s-roleta', 's-comissao', 's-recurso']);
const shots = [];
const total = await page.evaluate(() => document.querySelectorAll('.scene').length);
for (let guard = 0; guard < total * 4; guard++) {
  const id = await page.evaluate(() => document.querySelector('.scene.active')?.id || '');
  await page.waitForTimeout(LONGO.has(id) ? 6500 : 3200);
  shots.push(await page.screenshot({ type: 'jpeg', quality: 88 }));
  process.stdout.write(`\r[meeting-export] capturando ${shots.length} (${id})...          `);
  const antes = await page.evaluate(() => [...document.querySelectorAll('.scene')].findIndex((e) => e.classList.contains('active')));
  if (antes === total - 1) break;                                   // última cena: fim do deck
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
}
process.stdout.write('\n');

const pdfPage = await browser.newPage();
await pdfPage.setContent(`<!doctype html><style>@page{size:${W}px ${H}px;margin:0}body{margin:0}
  img{display:block;width:${W}px;height:${H}px;page-break-after:always}</style>` +
  shots.map((b) => `<img src="data:image/jpeg;base64,${b.toString('base64')}">`).join(''));
const outPdf = path.join(outDir, `${pasta}.pdf`);
await pdfPage.pdf({ path: outPdf, width: `${W}px`, height: `${H}px`, printBackground: true });
await browser.close();
console.log(`[meeting-export] PDF: ${path.relative(ROOT, outPdf)} (${shots.length} páginas, ${(fs.statSync(outPdf).size / 1048576).toFixed(1)} MB)`);
