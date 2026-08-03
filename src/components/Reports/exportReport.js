// Exportação de relatórios: PNG, PDF e HTML.
//
// O export respeita o TEMA ATUAL da tela. A primeira versão forçava o modo
// claro durante a captura (removia a classe `dark` da raiz e devolvia depois),
// o que resolvia a cor mas fazia a tela inteira piscar em branco para quem
// usava o modo escuro. Agora nada é alternado: o arquivo sai igual ao que está
// na tela, claro ou escuro, e o fundo é lido do próprio documento em vez de um
// branco fixo — era esse branco fixo que gerava texto claro sobre fundo branco
// no PDF de quem exportava no escuro.
//
// A outra correção segue valendo: as páginas do PDF quebram ENTRE blocos, com
// as bordas medidas no DOM, em vez de fatiar em altura fixa cortando gráfico e
// tabela ao meio.

const A4 = { w: 210, h: 297 }; // mm
const MARGIN = 10;             // mm

/** Nome de arquivo seguro a partir do título do relatório. */
export function safeFilename(title, ext) {
  const base = String(title || 'relatorio')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'relatorio';
  return `${base}.${ext}`;
}

const estaEscuro = () => document.documentElement.classList.contains('dark');

/**
 * Cor de fundo real por trás do relatório. Sobe na árvore até achar um
 * background opaco — o container do relatório costuma ser transparente, e
 * assumir branco quebrava o export no modo escuro.
 */
function fundoDe(el) {
  let node = el;
  while (node && node !== document.documentElement) {
    const cor = getComputedStyle(node).backgroundColor;
    if (cor && cor !== 'transparent' && !cor.startsWith('rgba(0, 0, 0, 0')) return cor;
    node = node.parentElement;
  }
  const body = getComputedStyle(document.body).backgroundColor;
  if (body && body !== 'transparent' && !body.startsWith('rgba(0, 0, 0, 0')) return body;
  return estaEscuro() ? '#0f172a' : '#ffffff';
}

/**
 * Converte a cor devolvida pelo getComputedStyle ("rgb(15, 23, 42)") nos
 * componentes numéricos que o jsPDF espera — ele não interpreta essa string,
 * e passá-la direto pintaria a página com a cor errada.
 */
function rgbDe(cor) {
  const m = String(cor).match(/(\d+(?:\.\d+)?)/g);
  if (m && m.length >= 3) return m.slice(0, 3).map((n) => Math.round(Number(n)));
  const hex = String(cor).trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const v = parseInt(hex[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  return [255, 255, 255];
}

/** Captura o elemento em canvas, no tema em que ele está. */
async function capture(el, { scale = 2 } = {}) {
  const { default: html2canvas } = await import('html2canvas');
  return html2canvas(el, {
    scale,
    useCORS: true,
    backgroundColor: fundoDe(el),
    logging: false,
    windowWidth: el.scrollWidth,
  });
}

/**
 * Pontos de corte em pixels de canvas que NÃO partem um bloco ao meio.
 * Retorna as posições onde é seguro terminar uma página.
 */
function safeCuts(el, scale) {
  const base = el.getBoundingClientRect().top;
  return [...el.querySelectorAll('[data-block-id]')]
    .map((b) => (b.getBoundingClientRect().bottom - base) * scale)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
}

// ── PNG ──────────────────────────────────────────────────────────────────────
export async function exportPng(el, title) {
  const canvas = await capture(el, { scale: 2 });
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = safeFilename(title, 'png');
  a.click();
}

// ── PDF ──────────────────────────────────────────────────────────────────────
export async function exportPdf(el, title) {
  const scale = 2;
  const fundo = fundoDe(el);
  const canvas = await capture(el, { scale });
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const contentW = A4.w - MARGIN * 2;
  const contentH = A4.h - MARGIN * 2;

  // px de canvas por mm de página
  const pxPorMm = canvas.width / contentW;
  const paginaPx = contentH * pxPorMm;
  const cortes = safeCuts(el, scale);

  // No tema escuro a página inteira leva o fundo do documento; sem isso
  // sobraria uma moldura branca em volta do conteúdo.
  const [fr, fg, fb] = rgbDe(fundo);
  const pintarPagina = () => {
    pdf.setFillColor(fr, fg, fb);
    pdf.rect(0, 0, A4.w, A4.h, 'F');
  };

  let inicio = 0;
  let primeira = true;
  while (inicio < canvas.height) {
    const limite = inicio + paginaPx;
    // Maior corte de bloco que ainda cabe nesta página
    let fim = cortes.filter((c) => c > inicio + 1 && c <= limite).pop();
    // Nenhum corte cabe: o bloco é mais alto que a página, então divide nela mesma
    if (!fim) fim = Math.min(limite, canvas.height);
    // Sobrou uma sobra mínima até o fim: leva tudo e encerra
    if (canvas.height - fim < paginaPx * 0.08) fim = canvas.height;

    const alturaFatia = Math.ceil(fim - inicio);
    const fatia = document.createElement('canvas');
    fatia.width = canvas.width;
    fatia.height = alturaFatia;
    const ctx = fatia.getContext('2d');
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, fatia.width, fatia.height);
    ctx.drawImage(canvas, 0, inicio, canvas.width, alturaFatia, 0, 0, canvas.width, alturaFatia);

    if (!primeira) pdf.addPage();
    pintarPagina();
    pdf.addImage(
      fatia.toDataURL('image/jpeg', 0.94), 'JPEG',
      MARGIN, MARGIN, contentW, alturaFatia / pxPorMm,
    );
    primeira = false;
    inicio = fim;
  }

  pdf.save(safeFilename(title, 'pdf'));
}

// ── HTML ─────────────────────────────────────────────────────────────────────
/** Junta o CSS das folhas de estilo do próprio app (mesma origem). */
function coletarCss() {
  const partes = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) partes.push(rule.cssText);
    } catch {
      // folha de outra origem: sem acesso às regras, ignora
    }
  }
  return partes.join('\n');
}

/**
 * Arquivo HTML autocontido: markup do relatório + CSS do app embutido.
 * Abre em qualquer navegador, sem depender do sistema. O tema acompanha o da
 * tela: se o app está no escuro, a raiz do arquivo leva a classe `dark` para
 * os mesmos tokens valerem lá.
 */
export async function exportHtml(el, title) {
  const escuro = estaEscuro();
  const markup = el.outerHTML;
  const css = coletarCss();
  const fundo = fundoDe(el);
  const escapado = String(title || 'Relatório').replace(/[<>&]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]
  ));

  const html = `<!doctype html>
<html lang="pt-BR"${escuro ? ' class="dark"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapado} · Menin</title>
<style>${css}</style>
<style>
  body { margin: 0; background: ${fundo}; }
  .export-wrap { max-width: 56rem; margin: 0 auto; padding: 24px 16px 48px; }
  @media print {
    .export-wrap { padding: 0; max-width: none; }
    [data-block-id] { break-inside: avoid; page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="export-wrap">${markup}</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename(title, 'html');
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default { exportPng, exportPdf, exportHtml, safeFilename };
