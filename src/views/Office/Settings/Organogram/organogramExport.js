// Exportação do organograma em PNG, JPG e PDF.
//
// O arquivo NÃO é uma captura de tela. A partir dos nós e ligações que o Vue Flow
// já posicionou, montamos um SVG próprio e só então rasterizamos. Motivo: capturar
// o painel (html2canvas) devolve a resolução da tela, com o zoom/pan do momento e
// cortado pela viewport - exatamente o print ruim que se quer evitar. Redesenhando
// em vetor a folha sai INTEIRA, em fundo claro e na escala que pedirmos (3x por
// padrão), independente de zoom, tema ou tamanho da janela.
//
// Só o organograma entra no arquivo: nada de barra de busca, controles de zoom,
// orbes do fundo ou marcas do modo edição. No rodapé vão o usuário que gerou, a
// data/hora e o sistema.

const FONT = "'Segoe UI', 'Inter', Roboto, Helvetica, Arial, sans-serif";

const PALETTE = {
  bg: '#ffffff',
  card: '#ffffff',
  line: '#e2e8f0',
  ink: '#0f172a',
  inkMuted: '#475569',
  inkSubtle: '#94a3b8',
  accent: '#2563eb',
  edge: '#3b82f6',
};

// Mesma leitura de nível do diagrama (anel do avatar por profundidade).
const LEVEL_RINGS = ['#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981'];

const PAD = 56;         // respiro lateral em volta do diagrama
const HEADER_H = 104;   // faixa do título (inclui o respiro de cima)
const FOOTER_H = 88;    // faixa da assinatura (inclui o respiro de baixo)

// ── Medição de texto ────────────────────────────────────────────────────────
// O SVG não corta texto sozinho; medimos no canvas com a MESMA fonte para saber
// onde pôr as reticências (senão o nome vaza para fora do card).
let measureCtx = null;
function measure(text, font) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}

function fitText(text, font, maxWidth) {
  const str = String(text ?? '');
  if (!str) return '';
  if (measure(str, font) <= maxWidth) return str;
  let lo = 0;
  let hi = str.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(str.slice(0, mid) + '…', font) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return str.slice(0, lo).trimEnd() + '…';
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// ── Avatar desenhado (sem rede) ─────────────────────────────────────────────
// Na tela o avatar vem do ui-avatars.com. No export ele é redesenhado: some a
// dependência de rede/CORS (que tinge o canvas e derruba o download) e a inicial
// sai vetorial, nítida em qualquer escala.
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hueFrom(text) {
  let h = 0;
  for (const ch of String(text || '')) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

// ── Imagens (logo) em data URI ──────────────────────────────────────────────
async function imageAsDataUri(src, filter) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = 'anonymous';
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  // A logo do card da empresa é escura e a tela a exibe invertida sobre o azul;
  // filtro CSS não sobrevive à serialização, então rasterizamos já invertida.
  if (filter) ctx.filter = filter;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { uri: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height };
}

async function safeImage(src, filter) {
  try { return await imageAsDataUri(src, filter); } catch { return null; }
}

// ── Ligações ────────────────────────────────────────────────────────────────
function edgePath(s, t) {
  const x1 = s.x + s.w / 2;
  const y1 = s.y + s.h;
  const x2 = t.x + t.w / 2;
  const y2 = t.y;

  // Reta quando estão alinhados ou quando o filho foi arrastado para cima do pai
  // (posição livre do modo edição) - o cotovelo ficaria torto nesse caso.
  if (Math.abs(x1 - x2) < 1.5 || y2 - y1 < 24) return `M${x1},${y1} L${x2},${y2}`;

  const my = (y1 + y2) / 2;
  const r = Math.min(10, Math.abs(x2 - x1) / 2, (y2 - y1) / 2);
  const dir = x2 > x1 ? 1 : -1;
  return [
    `M${x1},${y1}`,
    `L${x1},${my - r}`,
    `Q${x1},${my} ${x1 + dir * r},${my}`,
    `L${x2 - dir * r},${my}`,
    `Q${x2},${my} ${x2},${my + r}`,
    `L${x2},${y2}`,
  ].join(' ');
}

// ── Cards ───────────────────────────────────────────────────────────────────
function personSvg(node, childCount) {
  const { x, y, w, h, data } = node;
  const AV = 44;
  const padL = 13;
  const ax = x + padL;
  const ay = y + (h - AV) / 2;
  const ring = LEVEL_RINGS[Math.min(data.level ?? 0, LEVEL_RINGS.length - 1)];
  const hue = hueFrom(data.name);

  const textX = ax + AV + 12;
  const maxW = x + w - 12 - textX;

  const fName = `600 13.5px ${FONT}`;
  const fTitle = `500 11px ${FONT}`;
  const fCity = `400 10px ${FONT}`;

  const lines = [];
  lines.push({ t: fitText(data.name, fName, maxW), size: 13.5, lh: 17, weight: 600, fill: PALETTE.ink, font: fName });
  if (data.title) lines.push({ t: fitText(data.title, fTitle, maxW), size: 11, lh: 14, weight: 500, fill: PALETTE.accent, font: fTitle });
  if (data.city) lines.push({ t: fitText(data.city, fCity, maxW), size: 10, lh: 14, weight: 400, fill: PALETTE.inkSubtle, font: fCity });

  const totalH = lines.reduce((a, l) => a + l.lh, 0);
  let cursor = y + (h - totalH) / 2;

  const text = lines.map((l) => {
    const baseline = cursor + l.size * 0.78 + (l.lh - l.size) / 2;
    cursor += l.lh;
    return `<text x="${textX}" y="${baseline.toFixed(1)}" font-family="${FONT}" font-size="${l.size}" `
      + `font-weight="${l.weight}" fill="${l.fill}">${esc(l.t)}</text>`;
  }).join('');

  const badge = childCount > 0 ? (() => {
    const bx = ax + AV - 4;
    const by = ay + AV - 4;
    const label = String(childCount);
    const bw = Math.max(18, 10 + label.length * 6);
    return `<g><rect x="${bx - bw / 2}" y="${by - 9}" width="${bw}" height="18" rx="9" fill="${PALETTE.accent}" `
      + `stroke="${PALETTE.card}" stroke-width="2"/>`
      + `<text x="${bx}" y="${by + 4}" font-family="${FONT}" font-size="10" font-weight="700" fill="#ffffff" `
      + `text-anchor="middle">${label}</text></g>`;
  })() : '';

  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${PALETTE.card}" stroke="${PALETTE.line}" filter="url(#cardShadow)"/>
    <rect x="${ax - 4}" y="${ay - 4}" width="${AV + 8}" height="${AV + 8}" rx="16" fill="none" stroke="${ring}" stroke-width="2" opacity="0.55"/>
    <rect x="${ax}" y="${ay}" width="${AV}" height="${AV}" rx="12" fill="hsl(${hue}, 52%, 46%)"/>
    <text x="${ax + AV / 2}" y="${ay + AV / 2 + 6}" font-family="${FONT}" font-size="16" font-weight="700" fill="#ffffff" text-anchor="middle">${esc(initials(data.name))}</text>
    ${badge}
    ${text}
  </g>`;
}

function companySvg(node, logo) {
  const { x, y, w, h, data } = node;
  const cx = x + w / 2;
  const iconSize = 56;
  const iconX = cx - iconSize / 2;
  // Bloco (ícone + nome + cidade) centralizado na altura REAL do card medida pelo
  // Vue Flow - o card muda de altura se a raiz não tiver cidade.
  const blockH = iconSize + 10 + 18 + (data.city ? 17 : 0);
  const iconY = y + (h - blockH) / 2;

  let logoTag = '';
  if (logo) {
    const lw = 38;
    const lh = Math.max(12, Math.round((logo.h / logo.w) * lw));
    logoTag = `<image href="${logo.uri}" x="${cx - lw / 2}" y="${iconY + (iconSize - lh) / 2}" width="${lw}" height="${lh}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const nameY = iconY + iconSize + 22;

  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="url(#companyGrad)"/>
    <rect x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" rx="14" fill="#ffffff" opacity="0.18"/>
    ${logoTag}
    <text x="${cx}" y="${nameY}" font-family="${FONT}" font-size="14" font-weight="600" fill="#ffffff" text-anchor="middle">${esc(data.name)}</text>
    ${data.city ? `<text x="${cx}" y="${nameY + 17}" font-family="${FONT}" font-size="11" fill="#ffffff" opacity="0.75" text-anchor="middle">${esc(data.city)}</text>` : ''}
  </g>`;
}

// ── Documento ───────────────────────────────────────────────────────────────
function formatStamp(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()} às ${p(date.getHours())}:${p(date.getMinutes())}`;
}

function buildSvg({ nodes, edges, meta, logo, brand, pixelRatio }) {
  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.w));
  const maxY = Math.max(...nodes.map((n) => n.y + n.h));

  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const width = Math.max(760, Math.round(contentW + PAD * 2));
  const height = Math.round(contentH + HEADER_H + FOOTER_H);

  const offsetX = (width - contentW) / 2 - minX;   // centraliza quando o diagrama é estreito
  const offsetY = HEADER_H - minY;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childCount = new Map();
  for (const e of edges) childCount.set(e.source, (childCount.get(e.source) || 0) + 1);

  const edgeSvg = edges.map((e) => {
    const s = byId.get(e.source);
    const t = byId.get(e.target);
    if (!s || !t) return '';
    return `<path d="${edgePath(s, t)}" fill="none" stroke="${PALETTE.edge}" stroke-width="1.5" opacity="0.55" marker-end="url(#arrowHead)"/>`;
  }).join('');

  const nodeSvg = nodes.map((n) => (
    n.type === 'company' ? companySvg(n, logo) : personSvg(n, childCount.get(n.id) || 0)
  )).join('');

  // Cabeçalho
  const titleFont = `600 24px ${FONT}`;
  const title = esc(meta.title || 'Organograma');
  const subtitle = esc(meta.subtitle || '');
  let brandTag = '';
  let titleX = PAD;
  if (brand) {
    const bh = 30;
    const bw = Math.round((brand.w / brand.h) * bh);
    brandTag = `<image href="${brand.uri}" x="${PAD}" y="34" width="${bw}" height="${bh}"/>`;
    titleX = PAD + bw + 18;
  }

  // Rodapé: quem gerou, quando e por qual sistema.
  const footerY = height - FOOTER_H + 30;
  const stamp = `Gerado por ${meta.user} em ${meta.stamp}`;
  const systemLabel = meta.system;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" `
    + `width="${Math.round(width * pixelRatio)}" height="${Math.round(height * pixelRatio)}" `
    + `viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="companyGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="50%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.10"/>
    </filter>
    <marker id="arrowHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="${PALETTE.edge}"/>
    </marker>
  </defs>

  <rect width="${width}" height="${height}" fill="${PALETTE.bg}"/>

  ${brandTag}
  <text x="${titleX}" y="${brand ? 52 : 50}" font-family="${FONT}" font-size="24" font-weight="600" fill="${PALETTE.ink}">${title}</text>
  ${subtitle ? `<text x="${titleX}" y="${brand ? 72 : 70}" font-family="${FONT}" font-size="12" fill="${PALETTE.inkMuted}">${subtitle}</text>` : ''}
  <line x1="${PAD}" y1="${HEADER_H - 22}" x2="${width - PAD}" y2="${HEADER_H - 22}" stroke="${PALETTE.line}" stroke-width="1"/>

  <g transform="translate(${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})">
    ${edgeSvg}
    ${nodeSvg}
  </g>

  <line x1="${PAD}" y1="${height - FOOTER_H + 8}" x2="${width - PAD}" y2="${height - FOOTER_H + 8}" stroke="${PALETTE.line}" stroke-width="1"/>
  <text x="${PAD}" y="${footerY}" font-family="${FONT}" font-size="11.5" fill="${PALETTE.inkMuted}">${esc(stamp)}</text>
  <text x="${width - PAD}" y="${footerY}" font-family="${FONT}" font-size="11.5" font-weight="600" fill="${PALETTE.accent}" text-anchor="end">${esc(systemLabel)}</text>
  ${meta.note ? `<text x="${PAD}" y="${footerY + 18}" font-family="${FONT}" font-size="10.5" fill="${PALETTE.inkSubtle}">${esc(meta.note)}</text>` : ''}
</svg>`
    .replace(/\n\s+/g, '\n');
}

// ── Rasterização ────────────────────────────────────────────────────────────
// O canvas do navegador tem teto (~16k px por lado e área total); organogramas
// largos estourariam em 3x e o download sairia em branco. A escala cai só o
// necessário para caber.
function safeRatio(width, height, wanted) {
  const MAX_SIDE = 14000;
  const MAX_AREA = 180e6;
  return Math.max(1, Math.min(
    wanted,
    MAX_SIDE / width,
    MAX_SIDE / height,
    Math.sqrt(MAX_AREA / (width * height)),
  ));
}

async function svgToCanvas(svg, width, height, ratio) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Falha ao rasterizar o organograma.'));
      el.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d');
    // Fundo opaco: JPG não tem transparência e PNG colado no Word/Slides fica
    // com "buraco" cinza sem isso.
    ctx.fillStyle = PALETTE.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível gerar a imagem.'))), type, quality);
  });
}

function filenameFor(format, date) {
  const p = (n) => String(n).padStart(2, '0');
  const base = `organograma-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}`;
  return `${base}.${format}`;
}

/**
 * Gera o arquivo do organograma.
 *
 * @param {object}   opts
 * @param {Array}    opts.nodes    [{ id, type, x, y, w, h, data }] já posicionados
 * @param {Array}    opts.edges    [{ source, target }]
 * @param {'png'|'jpg'|'pdf'} opts.format
 * @param {object}   opts.meta     { user, system, title, subtitle, note }
 * @param {number}   [opts.quality] multiplicador de resolução (padrão 3)
 */
export async function exportOrganogram({ nodes, edges, format = 'png', meta = {}, quality = 3 }) {
  if (!nodes?.length) throw new Error('Nada para exportar.');

  const now = new Date();
  const [logo, brand] = await Promise.all([
    safeImage('/Mlogo.png', 'invert(1)'),   // card da empresa: fundo azul, logo branca
    safeImage('/Mlogotext.png'),            // cabeçalho da folha
  ]);

  const fullMeta = {
    title: 'Organograma',
    system: 'Menin Office',
    user: 'Usuário',
    ...meta,
    stamp: formatStamp(now),
  };

  const minX = Math.min(...nodes.map((n) => n.x));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxX = Math.max(...nodes.map((n) => n.x + n.w));
  const maxY = Math.max(...nodes.map((n) => n.y + n.h));
  const width = Math.max(760, Math.round(maxX - minX + PAD * 2));
  const height = Math.round(maxY - minY + HEADER_H + FOOTER_H);

  const ratio = safeRatio(width, height, quality);
  const svg = buildSvg({ nodes, edges, meta: fullMeta, logo, brand, pixelRatio: ratio });
  const canvas = await svgToCanvas(svg, width, height, ratio);

  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf');
    // Página do tamanho exato do desenho (px CSS -> mm a 96 dpi): o organograma
    // cabe em UMA página, sem margem sobrando e sem encolher os cards. Folhas
    // muito largas são reduzidas proporcionalmente até 1400 mm.
    const PX_TO_MM = 25.4 / 96;
    let wMm = width * PX_TO_MM;
    let hMm = height * PX_TO_MM;
    const cap = 1400;
    const shrink = Math.min(1, cap / wMm, cap / hMm);
    wMm *= shrink;
    hMm *= shrink;

    const pdf = new jsPDF({
      unit: 'mm',
      format: [wMm, hMm],
      orientation: wMm >= hMm ? 'landscape' : 'portrait',
      compress: true,
    });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, wMm, hMm, undefined, 'FAST');
    pdf.save(filenameFor('pdf', now));
    return { width: canvas.width, height: canvas.height, ratio };
  }

  const isJpg = format === 'jpg' || format === 'jpeg';
  const blob = await canvasToBlob(canvas, isJpg ? 'image/jpeg' : 'image/png', isJpg ? 0.95 : undefined);
  download(blob, filenameFor(isJpg ? 'jpg' : 'png', now));
  return { width: canvas.width, height: canvas.height, ratio };
}
