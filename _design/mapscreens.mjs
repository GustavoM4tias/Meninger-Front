/**
 * Mapeia todas as telas do Office: rota -> arquivo -> métricas de aderência.
 * Saída: ui-map.json + ui-checklist.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dialogosNativos, overlaysAMao } from './regras-dialogo.mjs';

/* Ancorado no PROPRIO arquivo, nao no diretorio de onde se chama. Antes era
   `process.argv[2]`, entao rodar da raiz do front em vez de dentro de
   `_design/` apontava para a pasta errada, o script morria - e quem tinha
   silenciado a saida ficava lendo o mapa da semana passada achando que era
   o de agora. O argumento continua valendo, para poder apontar outro repo. */
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(AQUI, '..');
const SRC = path.join(ROOT, 'src');

const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);

/* ── 1. navRegistry: rota -> {secao, categoria, subcategoria, nome} ─────────── */
const navSrc = read(path.join(SRC, 'config/navRegistry.js'));
const navByRoute = new Map();
{
  // varre linearmente guardando o contexto mais recente
  let group = '', cat = '', sub = '';
  const lines = navSrc.split('\n');
  let depthOfCat = null;
  for (const raw of lines) {
    const l = raw.trim();
    let m;
    if ((m = l.match(/^group:\s*'([^']+)'/))) group = m[1];
    if ((m = l.match(/^label:\s*'([^']+)'/))) { cat = m[1]; sub = ''; }
    if ((m = l.match(/^name:\s*'([^']+)',?\s*$/)) && /icon/.test(lines[lines.indexOf(raw) + 1] || '')) { /* noop */ }
    if ((m = l.match(/^key:\s*'([^']+)'/))) { /* contexto */ }
    if ((m = l.match(/^route:\s*'([^']+)'/))) {
      navByRoute.set(m[1], { group, cat, sub });
    }
    // subcategoria: bloco com name + pages
    if ((m = l.match(/^name:\s*'([^']+)'/))) sub = m[1];
  }
}

/* ── 2. office.routes.js: componente -> path/name mais próximos ANTES dele ──── */
const routesSrc = read(path.join(SRC, 'router/office.routes.js'));
const routes = [];
{
  const re = /component:\s*\(\)\s*=>\s*import\('@\/(views\/[^']+\.vue)'\)/g;
  let m;
  while ((m = re.exec(routesSrc))) {
    const before = routesSrc.slice(0, m.index);
    const paths = [...before.matchAll(/path:\s*'([^']*)'/g)];
    const names = [...before.matchAll(/name:\s*'([^']*)'/g)];
    const lastPath = paths.length ? paths[paths.length - 1][1] : '';
    const lastName = names.length ? names[names.length - 1][1] : '';
    // name só vale se vier depois do último path (mesmo bloco de rota)
    const nameIdx = names.length ? names[names.length - 1].index : -1;
    const pathIdx = paths.length ? paths[paths.length - 1].index : -1;
    routes.push({ path: lastPath, name: nameIdx > pathIdx ? lastName : '', file: m[1] });
  }
}

/* ── 3. métricas por arquivo ────────────────────────────────────────────────── */
/* Cor fixa de verdade: nao so cinza. A versao antiga so contava gray/slate,
   entao tela cheia de vermelho e ambar cravados marcava zero de divida. */
const HARD = new RegExp('bg-white|(?:bg|text|border|ring|from|to|via|divide)-'
  + '(?:gray|slate|zinc|neutral|stone|red|rose|emerald|green|amber|yellow|orange'
  + '|blue|indigo|sky|cyan|violet|purple|fuchsia|pink|teal|lime)-[0-9]+', 'g');
const TINY = /text-\[(?:[1-9]|10)px\]/g;
/* Tag <i> inteira: icone nao e texto, entao nao entra no piso de 11px.
   Ver DESIGN-LANGUAGE.md. Contar icone aqui punia tela por marcador de lista. */
const ICONE = /<i[ >][^>]*>|<i>/gs;
const semIcone = (s) => s.replace(ICONE, '');
/* Dialogo nativo do navegador. `window.confirm` nao diz consequencia, nao
   se estiliza e bloqueia a pagina; o sistema tem ConfirmDialog para isso. */
const BADSHADOW = /\bshadow-(sm|md|lg|xl|2xl)\b/g;

function count(s, re) { return (s.match(re) || []).length; }



function metrics(file) {
  const abs = path.join(SRC, file);
  if (!exists(abs)) return null;
  const s = read(abs);
  const lines = s.split('\n').length;
  return {
    lines,
    /* Excecao DECLARADA, nao adivinhada. Bancada de tela cheia (builder de
       duas colunas), quadro de largura total e leitor de documento com barra
       fixa nao levam PageContainer/PageHeader: os primitivos quebrariam o
       scroll interno ou a barra grudada. Quem faz a tela declara com o
       marcador `design:tela-cheia`, e o diff mostra a decisao. */
    telaCheia: /design:tela-cheia/.test(s),
    pageContainer: /<PageContainer/.test(s),
    pageHeader: /<PageHeader/.test(s),
    pageHelp: /<PageHelp/.test(s),
    chartTheme: /useChartTheme/.test(s),
    hardcoded: count(s, HARD),
    tinyText: count(semIcone(s), TINY),
    badShadow: count(s, BADSHADOW),
    /* A regra mora em regras-dialogo.mjs, junto com a do dialogos-a-mao.
       Duas copias de uma regra sao duas regras - foi assim que este mapa
       jurou "zero dialogo nativo" com 71 espalhados pelo sistema. */
    nativo: dialogosNativos(s).length,
    handModal: overlaysAMao(s).length,
    table: /<table/.test(s),
    /* Plano mobile de tabela = vira card no estreito OU tem scroll preso ao
       container. Tabela de 3 colunas curtas não precisa virar card, precisa
       não estourar a largura da tela. */
    tableMobile: /<table/.test(s) && (/(md|lg|sm):hidden/.test(s) || /overflow-x-auto/.test(s)),
    chart: /echarts/.test(s),
    spinner: /<Spinner/.test(s),
    skeleton: /animate-shimmer|Skeleton/.test(s),
    breakpoints: count(s, /\b(sm|md|lg|xl):/g),
    divClick: count(s, /<div[^>]*@click/g),
  };
}

/* ── 4. componentes-filhos por pasta da tela ────────────────────────────────── */
function walk(dir, acc = []) {
  if (!exists(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.vue')) acc.push(p);
  }
  return acc;
}

const routedAbs = new Set(routes.map((r) => path.join(SRC, r.file)));
const seen = new Set();
const screens = [];
for (const r of routes) {
  if (seen.has(r.file)) {
    const prev = screens.find((s) => s.file === r.file);
    if (prev && !prev.routes.includes(r.path)) prev.routes.push(r.path);
    continue;
  }
  seen.add(r.file);
  const m = metrics(r.file);
  if (!m) continue;

  // componentes irmãos: pasta do arquivo + subpasta components/
  const dir = path.dirname(path.join(SRC, r.file));
  /* Filhos = arquivos da PROPRIA pasta + tudo sob `components/`. O walk
     recursivo pegava a arvore inteira: `Home.vue` mora na raiz de
     views/Office, entao herdava 200 arquivos e 56 mil linhas - e como ela e
     "Especial" (sem nota), toda essa divida sumia do placar. */
  const soDaPasta = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.vue$/.test(e.name))
    .map((e) => path.join(dir, e.name));
  const subComp = path.join(dir, 'components');
  const daSub = exists(subComp) ? walk(subComp) : [];
  const kids = [...soDaPasta, ...daSub].filter((p) => !routedAbs.has(p));
  const kidStats = kids.map((p) => {
    const s = read(p);
    return {
      file: path.relative(SRC, p).replace(/\\/g, '/'),
      lines: s.split('\n').length,
      hardcoded: count(s, HARD),
      tinyText: count(semIcone(s), TINY),
      nativo: dialogosNativos(s).length,
      chart: /echarts/.test(s),
      table: /<table/.test(s),
      tableMobile: /<table/.test(s) && (/(md|lg|sm):hidden/.test(s) || /overflow-x-auto/.test(s)),
      chartTheme: /useChartTheme/.test(s),
      /* casca tambem no filho: ha rota que so repassa (ver score) */
      pageContainer: /<PageContainer/.test(s),
      pageHeader: /<PageHeader/.test(s),
      pageHelp: /<PageHelp/.test(s),
      skeleton: /animate-shimmer|Skeleton/.test(s),
    };
  });

  const nav = navByRoute.get(r.path) || navByRoute.get('/' + r.path) || {};
  screens.push({
    routes: [r.path],
    name: r.name,
    file: r.file,
    group: nav.group || '',
    cat: nav.cat || '',
    sub: nav.sub || '',
    ...m,
    kids: kidStats,
    totalLines: m.lines + kidStats.reduce((a, k) => a + k.lines, 0),
    totalHardcoded: m.hardcoded + kidStats.reduce((a, k) => a + k.hardcoded, 0),
    totalTiny: m.tinyText + kidStats.reduce((a, k) => a + k.tinyText, 0),
    totalNativo: m.nativo + kidStats.reduce((a, k) => a + k.nativo, 0),
    /* A casca conta na ARVORE, nao so no arquivo da rota. Ha rota que e um
       repasse de 8 linhas para um componente que TEM PageContainer/Header
       (ex.: /account -> components/Form.vue): pontuar so o arquivo da rota
       dizia "sem casca" para uma tela que tem. */
    pageContainer: m.pageContainer || kidStats.some((k) => k.pageContainer),
    pageHeader: m.pageHeader || kidStats.some((k) => k.pageHeader),
    pageHelp: m.pageHelp || kidStats.some((k) => k.pageHelp),
    skeleton: m.skeleton || kidStats.some((k) => k.skeleton),
    totalCharts: (m.chart ? 1 : 0) + kidStats.filter((k) => k.chart).length,
    /* Grafico SEM o tema compartilhado. Antes a penalidade era por existir
       grafico ("nenhum usa tema comum ainda"), o que deixou de ser verdade. */
    chartsSemTema: (m.chart && !m.chartTheme ? 1 : 0)
      + kidStats.filter((k) => k.chart && !k.chartTheme).length,
    totalTables: (m.table ? 1 : 0) + kidStats.filter((k) => k.table).length,
    /* A tabela quase sempre mora num componente-filho, não no arquivo da tela.
       Antes só o arquivo da tela era checado, então telas com plano mobile
       correto apareciam como se não tivessem. */
    tableMobile: (m.table ? m.tableMobile : true) && kidStats.filter((k) => k.table).every((k) => k.tableMobile),
  });
}

/* ── 5. arquétipo heurístico ────────────────────────────────────────────────── */
const ESPECIAL = /Office\/Home\.vue|Auth\/|Config\/OfficeShell|Public\/|Instalar\/|layouts\//;
function archetype(s) {
  if (ESPECIAL.test(s.file)) return 'Especial';
  if (/Settings|Config|Admin|Permissions|Management/.test(s.file)) return 'Configuração';
  if (s.totalCharts >= 1 && s.totalTables >= 1) return 'Painel';
  if (s.totalCharts >= 1) return 'Painel';
  if (s.totalTables >= 1) return 'Operação';
  if (/Detail|Detalhe|View|Report/.test(s.file)) return 'Detalhe';
  return 'Ferramenta';
}
screens.forEach((s) => { s.archetype = archetype(s); });

/* ── 6. score de aderência (0-100) ──────────────────────────────────────────── */
function score(s) {
  if (s.archetype === 'Especial') return null;
  let v = 100;
  if (!s.telaCheia) {
    if (!s.pageContainer) v -= 15;
    if (!s.pageHeader) v -= 15;
  }
  if (!s.pageHelp) v -= 20;
  v -= Math.min(25, s.totalHardcoded * 0.4);
  v -= Math.min(15, s.totalTiny * 0.15);
  if (s.totalTables && !s.tableMobile) v -= 10;
  if (s.chartsSemTema) v -= 10;   // grafico com hex cravado, fora do tema
  v -= Math.min(15, (s.totalNativo || 0) * 3);   // dialogo do navegador
  if (s.handModal) v -= 5;
  return Math.max(0, Math.round(v));
}
screens.forEach((s) => { s.score = score(s); });
screens.sort((a, b) => (a.score ?? 999) - (b.score ?? 999));

/* Rota duplicada: o `path:` extraido e so o segmento do proprio bloco, entao
   duas telas aninhadas em pais diferentes (ex.: /relatorios da Eme e
   /comercial/relatorios) chegam aqui com o MESMO texto. Sao telas distintas -
   arquivos distintos -, so o rotulo colidia, e no checklist parecia que uma
   delas tinha sumido. Aqui o rotulo ganha a pasta que as separa. */
const porRota = new Map();
for (const s of screens) for (const r of s.routes) {
  if (!porRota.has(r)) porRota.set(r, []);
  porRota.get(r).push(s);
}
for (const [rota, lista] of porRota) {
  if (lista.length < 2) continue;
  for (const s of lista) {
    const pasta = s.file.split('/').slice(0, -1).pop() || '';
    const avo = s.file.split('/').slice(-3, -2)[0] || '';
    const i = s.routes.indexOf(rota);
    if (i >= 0) s.routes[i] = `${rota} [${avo}/${pasta}]`;
  }
}

fs.writeFileSync(path.join(ROOT, 'ui-map.json'), /* Data REAL da geracao. Era literal '2026-08-20', entao o checklist
   jurava estar fresco meses depois. */
JSON.stringify({ generated: new Date().toISOString().slice(0, 10), screens }, null, 2));
console.log('telas:', screens.length);
const scored = screens.filter((s) => s.score !== null);
console.log('score medio:', Math.round(scored.reduce((a, s) => a + s.score, 0) / scored.length), '| pontuadas:', scored.length);
const byArch = {};
screens.forEach((s) => { byArch[s.archetype] = (byArch[s.archetype] || 0) + 1; });
console.log('arquetipos:', JSON.stringify(byArch));
console.log('\nPIORES 15:');
scored.slice(0, 15).forEach((s) => console.log(`  ${String(s.score).padStart(3)} ${s.archetype.padEnd(12)} ${s.routes[0].padEnd(28)} ${s.file}`));
console.log('\nMELHORES 10:');
scored.slice(-10).reverse().forEach((s) => console.log(`  ${String(s.score).padStart(3)} ${s.archetype.padEnd(12)} ${s.routes[0].padEnd(28)} ${s.file}`));
