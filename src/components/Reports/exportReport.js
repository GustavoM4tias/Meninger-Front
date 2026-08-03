// Exportação de relatórios: PNG, PDF e HTML.
//
// Dois problemas do export antigo, corrigidos aqui:
//
// 1. COR ERRADA. O PDF era gerado com backgroundColor '#ffffff' fixo, mas o
//    documento renderiza com os tokens do tema vigente. Quem exportava no modo
//    escuro recebia texto claro sobre fundo branco. Agora a captura força o
//    modo claro (removendo a classe `dark` da raiz) e restaura no final, então
//    o arquivo sai sempre igual, venha de onde vier.
//
// 2. QUEBRA NO MEIO DO BLOCO. As páginas eram fatiadas em altura fixa, cortando
//    gráfico e tabela ao meio. Agora as bordas dos blocos são medidas no DOM e
//    a página quebra ENTRE blocos; só um bloco maior que a página inteira é
//    dividido, porque aí não há alternativa.

const A4 = { w: 210, h: 297 }; // mm
const MARGIN = 10;             // mm

/** Nome de arquivo seguro a partir do título do relatório. */
export function safeFilename(title, ext) {
  const base = String(title || 'relatorio')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'relatorio';
  return `${base}.${ext}`;
}

/**
 * Executa `fn` com o documento forçado em modo claro.
 * Sem isso, exportar no dark gera arquivo com as cores trocadas.
 */
async function withLightTheme(fn) {
  const root = document.documentElement;
  const eraDark = root.classList.contains('dark');
  if (eraDark) root.classList.remove('dark');
  // Deixa o browser repintar com os tokens claros antes de capturar
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  try {
    return await fn();
  } finally {
    if (eraDark) root.classList.add('dark');
  }
}

/** Captura o elemento em canvas, já no tema claro. */
async function capture(el, { scale = 2 } = {}) {
  const { default: html2canvas } = await import('html2canvas');
  return withLightTheme(() => html2canvas(el, {
    scale,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: el.scrollWidth,
  }));
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
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename(title, 'png');
  a.click();
}

// ── PDF ──────────────────────────────────────────────────────────────────────
export async function exportPdf(el, title) {
  const scale = 2;
  const canvas = await capture(el, { scale });
  const { jsPDF } = await import('jspdf');

  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const contentW = A4.w - MARGIN * 2;
  const contentH = A4.h - MARGIN * 2;

  // px de canvas por mm de página
  const pxPorMm = canvas.width / contentW;
  const paginaPx = contentH * pxPorMm;
  const cortes = safeCuts(el, scale);

  let inicio = 0;
  let primeira = true;
  while (inicio < canvas.height) {
    const limite = inicio + paginaPx;
    // Maior corte de bloco que ainda cabe nesta página
    let fim = cortes.filter((c) => c > inicio + 1 && c <= limite).pop();
    // Nenhum corte cabe: o bloco é mais alto que a página, então divide nela mesma
    if (!fim) fim = Math.min(limite, canvas.height);
    // Sobrou menos de uma página até o fim: leva tudo e encerra
    if (canvas.height - fim < paginaPx * 0.08) fim = canvas.height;

    const alturaFatia = Math.ceil(fim - inicio);
    const fatia = document.createElement('canvas');
    fatia.width = canvas.width;
    fatia.height = alturaFatia;
    const ctx = fatia.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, fatia.width, fatia.height);
    ctx.drawImage(canvas, 0, inicio, canvas.width, alturaFatia, 0, 0, canvas.width, alturaFatia);

    if (!primeira) pdf.addPage();
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
 * Abre em qualquer navegador, sem depender do sistema.
 */
export async function exportHtml(el, title, { periodo = '' } = {}) {
  const markup = await withLightTheme(async () => el.outerHTML);
  const css = coletarCss();
  const escapado = String(title || 'Relatório').replace(/[<>&]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]
  ));

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapado} · Menin</title>
<style>${css}</style>
<style>
  body { margin: 0; background: #fff; }
  .export-wrap { max-width: 56rem; margin: 0 auto; padding: 24px 16px 48px; }
  @media print { .export-wrap { padding: 0; } }
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
  return periodo;
}

export default { exportPng, exportPdf, exportHtml, safeFilename };
