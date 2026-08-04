// Exportação de relatórios: PNG, PDF e HTML.
//
// Os três exports passam pelo MESMO clone preparado (`comCloneParaExport`),
// porque os defeitos encontrados eram de serialização, não de formato:
//
// 1. GRÁFICO SUMIA NO HTML. O ECharts desenha num <canvas>, e outerHTML
//    serializa a tag mas não o bitmap — o arquivo saía com um quadro vazio.
//    Agora cada canvas vira um <img> com o desenho embutido, o que também
//    torna a captura do html2canvas mais fiel.
//
// 2. LOGO NÃO CARREGAVA NO HTML. O markup referenciava "/Mlogotext.png", um
//    caminho absoluto do servidor: abrindo o arquivo salvo (file://) não existe
//    servidor para resolver. As imagens agora são embutidas como data URI.
//    De quebra, o filtro `invert` da logo é RASTERIZADO no clone: o html2canvas
//    não aplica filtro CSS, então a logo clara sairia invisível sobre fundo
//    claro no PNG e no PDF.
//
// 3. SELO "AO VIVO" QUEBRAVA NO PNG/PDF. O html2canvas tropeça no pill
//    (inline-flex + margem automática + cor com alpha via token). No clone ele
//    vira um inline-block simples, com as cores já resolvidas em rgb() literal.
//
// O export respeita o TEMA ATUAL da tela: não alternamos mais a classe `dark`
// da raiz, que resolvia a cor mas fazia a tela piscar para quem usa o escuro.

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
 * background opaco — o container costuma ser transparente, e assumir branco
 * quebrava o export no modo escuro.
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
 * Converte a cor do getComputedStyle ("rgb(15, 23, 42)") nos componentes que o
 * jsPDF espera — ele não interpreta essa string e pintaria a página errada.
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

/** Rasteriza uma imagem (aplicando o filtro CSS, se houver) num data URI. */
async function imagemEmDataUri(img, filtro) {
  const pronta = img.complete && img.naturalWidth
    ? img
    : await new Promise((resolve, reject) => {
      const novo = new Image();
      novo.crossOrigin = 'anonymous';
      novo.onload = () => resolve(novo);
      novo.onerror = reject;
      novo.src = img.src;
    });

  const canvas = document.createElement('canvas');
  canvas.width = pronta.naturalWidth || pronta.width;
  canvas.height = pronta.naturalHeight || pronta.height;
  const ctx = canvas.getContext('2d');
  if (filtro && filtro !== 'none') ctx.filter = filtro;
  ctx.drawImage(pronta, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/**
 * Clona o relatório, resolve tudo que não sobrevive à serialização/captura e
 * entrega o clone montado fora da tela. O original nunca é tocado.
 */
async function comCloneParaExport(el, fn) {
  const fundo = fundoDe(el);
  const holder = document.createElement('div');
  holder.setAttribute('data-exporting', 'true');
  holder.style.cssText = [
    'position:fixed', 'left:-100000px', 'top:0', 'z-index:-1',
    `width:${el.offsetWidth}px`, `background:${fundo}`,
  ].join(';');

  const clone = el.cloneNode(true);

  // 0) controles de leitura (barra de filtros etc.) não saem no arquivo.
  //    Removidos do clone ANTES dos pareamentos por índice; as queries no
  //    original também os ignoram para os índices continuarem casando 1:1.
  clone.querySelectorAll('[data-export-exclude]').forEach((n) => n.remove());
  const foraDoExport = (n) => n.closest('[data-export-exclude]');

  // 1) imagens → data URI, com o filtro CSS já rasterizado.
  //    Feito ANTES da troca dos canvas: nesse momento o clone ainda é cópia
  //    exata do original, então os índices casam 1:1. Depois da troca o clone
  //    ganha <img> novas e o pareamento por índice quebraria.
  const imgsOrig = [...el.querySelectorAll('img')].filter((n) => !foraDoExport(n));
  const imgsClone = [...clone.querySelectorAll('img')];
  await Promise.all(imgsClone.map(async (alvo, i) => {
    const orig = imgsOrig[i];
    if (!orig || !alvo.src || alvo.src.startsWith('data:')) return;
    const filtro = getComputedStyle(orig).filter;
    try {
      alvo.src = await imagemEmDataUri(orig, filtro);
      alvo.style.filter = 'none';
      alvo.className = alvo.className.replace(/\b(dark:)?invert(-0)?\b/g, '');
    } catch {
      // imagem inacessível: deixa como está, o export segue sem ela
    }
  }));

  // 2) canvas (gráficos) → img com o desenho embutido
  const canvasesOrig = [...el.querySelectorAll('canvas')].filter((n) => !foraDoExport(n));
  const canvasesClone = [...clone.querySelectorAll('canvas')];
  canvasesOrig.forEach((orig, i) => {
    const alvo = canvasesClone[i];
    if (!alvo) return;
    const img = document.createElement('img');
    try { img.src = orig.toDataURL('image/png'); } catch { return; }
    img.style.width = `${orig.clientWidth || orig.width}px`;
    img.style.height = `${orig.clientHeight || orig.height}px`;
    img.style.display = 'block';
    alvo.replaceWith(img);
  });

  // 3) selo "ao vivo" → inline-block com cores literais
  clone.querySelectorAll('.rp-live-badge').forEach((badge, i) => {
    const orig = el.querySelectorAll('.rp-live-badge')[i] || badge;
    const cs = getComputedStyle(orig);
    badge.querySelectorAll('[aria-hidden="true"]').forEach((dot) => dot.remove());
    badge.style.display = 'inline-block';
    badge.style.lineHeight = '1.6';
    badge.style.verticalAlign = 'middle';
    badge.style.color = cs.color;
    badge.style.backgroundColor = cs.backgroundColor;
    badge.style.padding = '1px 8px';
    badge.style.borderRadius = '999px';
    badge.style.marginLeft = cs.marginLeft;
  });

  holder.appendChild(clone);
  document.body.appendChild(holder);
  // Duas rAF: garante que o layout do clone já foi calculado antes de medir
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    return await fn({ clone, fundo });
  } finally {
    holder.remove();
  }
}

/** Captura o clone em canvas. */
async function capture(clone, fundo, { scale = 2 } = {}) {
  const { default: html2canvas } = await import('html2canvas');
  return html2canvas(clone, {
    scale,
    useCORS: true,
    backgroundColor: fundo,
    logging: false,
    windowWidth: clone.scrollWidth,
  });
}

/** Pontos de corte que NÃO partem um bloco ao meio (medidos no clone). */
function safeCuts(clone, scale) {
  const base = clone.getBoundingClientRect().top;
  return [...clone.querySelectorAll('[data-block-id]')]
    .map((b) => (b.getBoundingClientRect().bottom - base) * scale)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
}

// ── PNG ──────────────────────────────────────────────────────────────────────
export async function exportPng(el, title) {
  await comCloneParaExport(el, async ({ clone, fundo }) => {
    const canvas = await capture(clone, fundo, { scale: 2 });
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = safeFilename(title, 'png');
    a.click();
  });
}

// ── PDF ──────────────────────────────────────────────────────────────────────
export async function exportPdf(el, title) {
  await comCloneParaExport(el, async ({ clone, fundo }) => {
    const scale = 2;
    const canvas = await capture(clone, fundo, { scale });
    const { jsPDF } = await import('jspdf');

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const contentW = A4.w - MARGIN * 2;
    const contentH = A4.h - MARGIN * 2;
    const pxPorMm = canvas.width / contentW;
    const paginaPx = contentH * pxPorMm;
    const cortes = safeCuts(clone, scale);

    // No tema escuro a página inteira leva o fundo do documento; sem isso
    // sobraria moldura branca em volta do conteúdo.
    const [fr, fg, fb] = rgbDe(fundo);

    let inicio = 0;
    let primeira = true;
    while (inicio < canvas.height) {
      const limite = inicio + paginaPx;
      let fim = cortes.filter((c) => c > inicio + 1 && c <= limite).pop();
      if (!fim) fim = Math.min(limite, canvas.height);
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
      pdf.setFillColor(fr, fg, fb);
      pdf.rect(0, 0, A4.w, A4.h, 'F');
      pdf.addImage(
        fatia.toDataURL('image/jpeg', 0.94), 'JPEG',
        MARGIN, MARGIN, contentW, alturaFatia / pxPorMm,
      );
      primeira = false;
      inicio = fim;
    }

    pdf.save(safeFilename(title, 'pdf'));
  });
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
 * Arquivo HTML autocontido: markup do relatório (com gráficos e logo
 * embutidos) + CSS do app. Abre em qualquer navegador, offline, sem depender
 * do sistema. O tema acompanha o da tela.
 */
export async function exportHtml(el, title) {
  const escuro = estaEscuro();
  const css = coletarCss();
  const escapado = String(title || 'Relatório').replace(/[<>&]/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]
  ));

  const { markup, fundo } = await comCloneParaExport(el, async ({ clone, fundo: bg }) => ({
    markup: clone.outerHTML,
    fundo: bg,
  }));

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
  .export-wrap img { max-width: 100%; }
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
