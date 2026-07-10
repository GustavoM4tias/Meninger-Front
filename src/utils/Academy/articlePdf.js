// Emissão de PDF de artigos da Base de Conhecimento (Academy) - apenas admin.
//
// Ao contrário de "printar" a tela (que estica/corta o texto), aqui o conteúdo é
// RENDERIZADO NATIVAMENTE no PDF: o markdown do artigo é interpretado com o
// mesmo markdown-it usado no app e cada bloco (títulos, parágrafos com
// negrito/itálico/código, listas, citações, código, tabelas, imagens e os blocos
// @[TOKEN] de embed) é desenhado com texto nativo do jsPDF - com quebra de
// página que nunca corta uma linha no meio.
//
//  - Header (1ª página): só a logo Menin, em preto, sobre fundo branco.
//  - Rodapé (todas as páginas): quem gerou, horário, sistema, direitos autorais.

import MarkdownIt from 'markdown-it';

const LOGO_SRC = '/Mlogotext.png'; // logo Menin (branca no arquivo -> invertida p/ preto)

// ── Geometria (mm) ───────────────────────────────────────────────────────
const A4 = { w: 210, h: 297 };
const MARGIN = 16;
const CONTENT_W = A4.w - MARGIN * 2;
const FOOTER_H = 18;
const BODY_BOTTOM = A4.h - FOOTER_H;
const PAGE_TOP = 18;
const PT2MM = 0.352778;

// ── Cores ────────────────────────────────────────────────────────────────
const INK = [24, 32, 46];        // texto
const HEAD = [15, 23, 42];       // títulos
const MUTED = [110, 122, 138];   // metadados / rodapé
const ACCENT = [15, 39, 71];     // navy da marca (bullets, filetes, links)
const RULE = [223, 228, 235];    // linhas finas
const CODE_BG = [244, 246, 249];

const md = new MarkdownIt({ html: false, linkify: true, breaks: true, typographer: true });

// ── Helpers de data / texto ──────────────────────────────────────────────
function fmtNow() {
    return new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}
function fmtDate(v) {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function slugifyFilename(str) {
    return String(str || 'artigo')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'artigo';
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// Logo branca do arquivo -> preta (inverte RGB, preserva alpha) para ficar sobre
// o fundo branco do PDF.
async function loadBlackLogo() {
    try {
        const img = await loadImage(LOGO_SRC);
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, c.width, c.height);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
            px[i] = 255 - px[i]; px[i + 1] = 255 - px[i + 1]; px[i + 2] = 255 - px[i + 2];
        }
        ctx.putImageData(data, 0, 0);
        return { dataUrl: c.toDataURL('image/png'), w: c.width, h: c.height };
    } catch {
        return null;
    }
}

async function imageToDataUrl(src) {
    const img = await loadImage(src);
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    return { dataUrl: c.toDataURL('image/jpeg', 0.9), w: c.width, h: c.height };
}

// ── Embeds (@[TOKEN:ref]) ────────────────────────────────────────────────
const TOKEN_RE = /@\[(ARTICLE|COMMUNITY|COMMUNITY_TOPIC|VIDEO|LINK|QUIZ|TASK):([a-zA-Z0-9_-]+)\]/gi;
const KICKERS = { ARTICLE: 'ARTIGO', COMMUNITY: 'COMUNIDADE', COMMUNITY_TOPIC: 'COMUNIDADE', VIDEO: 'VÍDEO', LINK: 'LINK', QUIZ: 'QUIZ', TASK: 'CHECKLIST' };

function normalizePayload(p) {
    if (!p) return {};
    if (typeof p === 'string') { try { return JSON.parse(p); } catch { return {}; } }
    return p;
}

/**
 * Gera e baixa o PDF de um artigo do Academy.
 * @param {Object} opts
 * @param {string} opts.markdown  Corpo do artigo em markdown (já sem o H1 duplicado).
 * @param {Object} opts.payload   Payload do artigo (embeds).
 * @param {Object} opts.article   Metadados { title, categorySlug, createdBy, updatedAt, readingMinutes }.
 * @param {Object} opts.user      Quem gera { username, email }.
 */
export async function exportArticleToPdf({ markdown, payload, article, user }) {
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const logo = await loadBlackLogo();
    const embeds = Array.isArray(normalizePayload(payload).embeds) ? normalizePayload(payload).embeds : [];

    const cursor = { y: PAGE_TOP };

    // ── util de layout ───────────────────────────────────────────────────
    function ensureSpace(h) {
        if (cursor.y + h > BODY_BOTTOM) {
            pdf.addPage();
            cursor.y = PAGE_TOP;
        }
    }
    function setFont(style, fs) {
        const fam = style?.code ? 'courier' : 'helvetica';
        const s = style?.bold && style?.italic ? 'bolditalic' : style?.bold ? 'bold' : style?.italic ? 'italic' : 'normal';
        pdf.setFont(fam, s);
        pdf.setFontSize(fs);
    }

    // Fluxo de "runs" inline (texto com estilos) com quebra por palavra.
    function flowRuns(runs, { fontSize, x = MARGIN, maxWidth = CONTENT_W, color = INK, quoteBar = null }) {
        const lh = fontSize * 1.42 * PT2MM;
        const ascent = fontSize * 0.36 * PT2MM * 2.4; // aproxima o baseline dentro da linha
        let line = [];   // { text, style, w }
        let lineW = 0;

        const spaceW = (style) => { setFont(style, fontSize); return pdf.getTextWidth(' '); };

        function flush() {
            ensureSpace(lh);
            const baseY = cursor.y + ascent;
            if (quoteBar != null) {
                pdf.setDrawColor(...ACCENT); pdf.setLineWidth(0.8);
                pdf.line(quoteBar, cursor.y + 0.5, quoteBar, cursor.y + lh - 0.3);
            }
            let cx = x;
            for (const w of line) {
                setFont(w.style, fontSize);
                pdf.setTextColor(...(w.style.link ? ACCENT : color));
                pdf.text(w.text, cx, baseY);
                if (w.style.link) {
                    pdf.setDrawColor(...ACCENT); pdf.setLineWidth(0.2);
                    pdf.line(cx, baseY + 0.7, cx + w.w, baseY + 0.7);
                }
                cx += w.w + w.sp;
            }
            cursor.y += lh;
            line = []; lineW = 0;
        }

        function pushWord(text, style) {
            setFont(style, fontSize);
            let w = pdf.getTextWidth(text);
            const sp = spaceW(style);
            // palavra maior que a linha inteira -> quebra por caractere
            if (w > maxWidth) {
                let chunk = '';
                for (const ch of text) {
                    setFont(style, fontSize);
                    if (pdf.getTextWidth(chunk + ch) > maxWidth && chunk) {
                        pushWord(chunk, style); chunk = ch;
                    } else chunk += ch;
                }
                if (chunk) pushWord(chunk, style);
                return;
            }
            const add = lineW === 0 ? w : lineW + sp + w;
            if (add > maxWidth && line.length) flush();
            setFont(style, fontSize);
            w = pdf.getTextWidth(text);
            lineW = lineW === 0 ? w : lineW + sp + w;
            line.push({ text, style, w, sp });
        }

        for (const run of runs) {
            if (run.br) { flush(); continue; }
            const words = String(run.text || '').split(/\s+/).filter(Boolean);
            for (const word of words) pushWord(word, run);
        }
        if (line.length) flush();
    }

    // markdown-it inline -> runs
    function inlineToSegments(inlineToken) {
        // Divide em segmentos separados por imagens; cada segmento é lista de runs.
        const segments = [];
        let runs = [];
        let bold = 0, italic = 0, link = null;
        for (const t of inlineToken.children || []) {
            switch (t.type) {
                case 'text': runs.push({ text: t.content, bold: !!bold, italic: !!italic, link }); break;
                case 'strong_open': bold++; break;
                case 'strong_close': bold = Math.max(0, bold - 1); break;
                case 'em_open': italic++; break;
                case 'em_close': italic = Math.max(0, italic - 1); break;
                case 'code_inline': runs.push({ text: t.content, code: true, bold: !!bold, italic: !!italic }); break;
                case 'link_open': link = t.attrGet('href'); break;
                case 'link_close': link = null; break;
                case 'softbreak':
                case 'hardbreak': runs.push({ br: true }); break;
                case 'image':
                    segments.push({ runs }); runs = [];
                    segments.push({ image: t.attrGet('src'), alt: t.content });
                    break;
                default: if (t.content) runs.push({ text: t.content, bold: !!bold, italic: !!italic, link });
            }
        }
        segments.push({ runs });
        return segments;
    }

    function inlineToPlain(inlineToken) {
        return (inlineToken.children || []).map((t) => (t.type === 'softbreak' || t.type === 'hardbreak' ? ' ' : t.content || '')).join('');
    }

    async function renderImage(src) {
        if (!src) return;
        try {
            const { dataUrl, w, h } = await imageToDataUrl(src);
            const natMm = w / 3.7795;
            let dw = Math.min(CONTENT_W, natMm);
            let dh = dw * h / w;
            const maxH = BODY_BOTTOM - PAGE_TOP - 2;
            if (dh > maxH) { dh = maxH; dw = dh * w / h; }
            ensureSpace(dh + 3);
            pdf.addImage(dataUrl, 'JPEG', MARGIN, cursor.y, dw, dh, undefined, 'FAST');
            pdf.setDrawColor(...RULE); pdf.setLineWidth(0.2);
            pdf.rect(MARGIN, cursor.y, dw, dh);
            cursor.y += dh + 4;
        } catch {
            flowRuns([{ text: '[imagem indisponível]', italic: true }], { fontSize: 9, color: MUTED });
            cursor.y += 1;
        }
    }

    async function renderInline(inlineToken, opts) {
        for (const seg of inlineToSegments(inlineToken)) {
            if (seg.image !== undefined) await renderImage(seg.image);
            else if (seg.runs?.length) flowRuns(seg.runs, opts);
        }
    }

    function renderHeading(level, inlineToken) {
        const sizes = { 1: 18, 2: 14.5, 3: 12.5 };
        const fs = sizes[level] || 11.5;
        cursor.y += level <= 2 ? 4 : 2.5;
        if (level === 2) {
            ensureSpace(6);
            pdf.setDrawColor(...RULE); pdf.setLineWidth(0.3);
            pdf.line(MARGIN, cursor.y, A4.w - MARGIN, cursor.y);
            cursor.y += 3.5;
        }
        const runs = inlineToSegments(inlineToken).flatMap((s) => s.runs || []).map((r) => ({ ...r, bold: true }));
        flowRuns(runs, { fontSize: fs, color: HEAD });
        cursor.y += 1.5;
    }

    function renderCode(content) {
        const fs = 8.6;
        const lh = fs * 1.4 * PT2MM;
        setFont({ code: true }, fs);
        const raw = String(content || '').replace(/\n$/, '').split('\n');
        const lines = [];
        for (const ln of raw) lines.push(...pdf.splitTextToSize(ln || ' ', CONTENT_W - 6));
        const boxH = lines.length * lh + 5;
        ensureSpace(boxH + 2);
        pdf.setFillColor(...CODE_BG); pdf.setDrawColor(...RULE); pdf.setLineWidth(0.2);
        pdf.roundedRect(MARGIN, cursor.y, CONTENT_W, boxH, 1.5, 1.5, 'FD');
        setFont({ code: true }, fs); pdf.setTextColor(...INK);
        let ty = cursor.y + 3.5 + fs * 0.3 * PT2MM * 2;
        for (const ln of lines) { pdf.text(ln, MARGIN + 3, ty); ty += lh; }
        cursor.y += boxH + 3;
    }

    function renderHr() {
        cursor.y += 2;
        ensureSpace(4);
        pdf.setDrawColor(...RULE); pdf.setLineWidth(0.4);
        pdf.line(MARGIN, cursor.y, A4.w - MARGIN, cursor.y);
        cursor.y += 4;
    }

    function renderTable(rows, hasHead) {
        if (!rows.length) return;
        const nCols = Math.max(...rows.map((r) => r.length));
        const colW = CONTENT_W / nCols;
        const fs = 9;
        const lh = fs * 1.3 * PT2MM;
        const pad = 2;

        for (let r = 0; r < rows.length; r++) {
            const cells = rows[r];
            const wrapped = [];
            let maxLines = 1;
            for (let c = 0; c < nCols; c++) {
                setFont({ bold: r === 0 && hasHead }, fs);
                const lns = pdf.splitTextToSize(String(cells[c] ?? ''), colW - pad * 2);
                wrapped.push(lns); maxLines = Math.max(maxLines, lns.length);
            }
            const rowH = maxLines * lh + pad * 2;
            ensureSpace(rowH);
            const y0 = cursor.y;
            if (r === 0 && hasHead) { pdf.setFillColor(...CODE_BG); pdf.rect(MARGIN, y0, CONTENT_W, rowH, 'F'); }
            pdf.setDrawColor(...RULE); pdf.setLineWidth(0.2);
            for (let c = 0; c < nCols; c++) {
                const x0 = MARGIN + c * colW;
                pdf.rect(x0, y0, colW, rowH);
                setFont({ bold: r === 0 && hasHead }, fs);
                pdf.setTextColor(...(r === 0 && hasHead ? HEAD : INK));
                let ty = y0 + pad + fs * 0.3 * PT2MM * 2;
                for (const ln of wrapped[c]) { pdf.text(ln, x0 + pad, ty); ty += lh; }
            }
            cursor.y += rowH;
        }
        cursor.y += 3;
    }

    function renderEmbed(type, ref) {
        const t = String(type || '').toUpperCase();
        const e = embeds.find((x) => String(x?.type || '').toUpperCase() === t && String(x?.ref ?? '') === String(ref)) || null;
        const kicker = KICKERS[t] || 'BLOCO';
        const title = e?.title || `${kicker} ${ref}`;
        const url = e?.url || '';

        setFont({}, 10);
        const titleLines = pdf.splitTextToSize(title, CONTENT_W - 8);
        const urlLines = url ? pdf.splitTextToSize(url, CONTENT_W - 8) : [];
        const boxH = 7 + titleLines.length * 5 + (urlLines.length ? urlLines.length * 4 + 1 : 0) + 4;
        ensureSpace(boxH + 2);
        const y0 = cursor.y;
        pdf.setFillColor(250, 251, 253); pdf.setDrawColor(...RULE); pdf.setLineWidth(0.3);
        pdf.roundedRect(MARGIN, y0, CONTENT_W, boxH, 2, 2, 'FD');
        pdf.setDrawColor(...ACCENT); pdf.setLineWidth(1.1);
        pdf.line(MARGIN + 0.6, y0 + 2, MARGIN + 0.6, y0 + boxH - 2);

        let ty = y0 + 6;
        setFont({ bold: true }, 7); pdf.setTextColor(...ACCENT);
        pdf.text(kicker, MARGIN + 5, ty);
        ty += 4.5;
        setFont({ bold: true }, 10.5); pdf.setTextColor(...HEAD);
        for (const ln of titleLines) { pdf.text(ln, MARGIN + 5, ty); ty += 5; }
        if (urlLines.length) {
            ty += 0.5;
            setFont({}, 8.5); pdf.setTextColor(...ACCENT);
            for (const ln of urlLines) { pdf.text(ln, MARGIN + 5, ty); ty += 4; }
        }
        cursor.y = y0 + boxH + 3;
    }

    // ── Walker de tokens de um bloco markdown ────────────────────────────
    async function renderMarkdown(src) {
        const tokens = md.parse(String(src || ''), {});
        const listStack = [];
        let quoteDepth = 0;
        let pendingMarker = null;

        const indent = () => MARGIN + listStack.length * 6 + quoteDepth * 5;

        for (let i = 0; i < tokens.length; i++) {
            const tk = tokens[i];
            switch (tk.type) {
                case 'heading_open': {
                    renderHeading(Number(tk.tag[1]) || 3, tokens[i + 1]);
                    i += 2; break;
                }
                case 'paragraph_open': {
                    const inline = tokens[i + 1];
                    const x = indent();
                    const maxW = CONTENT_W - (x - MARGIN);
                    if (pendingMarker) {
                        ensureSpace(6);
                        const baseY = cursor.y + 10.5 * 0.36 * PT2MM * 2.4;
                        if (pendingMarker.ordered) {
                            setFont({ bold: false }, 10.5);
                            pdf.setTextColor(...INK);
                            pdf.text(pendingMarker.text, x - 5, baseY);
                        } else {
                            // U+2022 não existe na codificação das fontes padrão do
                            // jsPDF; desenha um disco em vez de texto.
                            pdf.setFillColor(...ACCENT);
                            pdf.circle(x - 3.6, baseY - 1.1, 0.62, 'F');
                        }
                        pendingMarker = null;
                    }
                    await renderInline(inline, {
                        fontSize: 10.5, x, maxWidth: maxW, color: INK,
                        quoteBar: quoteDepth > 0 ? indent() - quoteDepth * 5 + 1 : null,
                    });
                    cursor.y += 2;
                    i += 2; break;
                }
                case 'bullet_list_open': listStack.push({ ordered: false }); break;
                case 'ordered_list_open': listStack.push({ ordered: true, idx: Number(tk.attrGet('start')) || 1 }); break;
                case 'bullet_list_close':
                case 'ordered_list_close': listStack.pop(); cursor.y += 1.5; break;
                case 'list_item_open': {
                    const top = listStack[listStack.length - 1];
                    pendingMarker = top?.ordered
                        ? { text: `${top.idx++}.`, ordered: true }
                        : { text: '•', ordered: false };
                    break;
                }
                case 'blockquote_open': quoteDepth++; cursor.y += 1; break;
                case 'blockquote_close': quoteDepth--; cursor.y += 2; break;
                case 'fence':
                case 'code_block': renderCode(tk.content); break;
                case 'hr': renderHr(); break;
                case 'table_open': {
                    const rows = []; let hasHead = false; let j = i + 1;
                    for (; j < tokens.length && tokens[j].type !== 'table_close'; j++) {
                        const tt = tokens[j];
                        if (tt.type === 'thead_open') hasHead = true;
                        if (tt.type === 'tr_open') {
                            const cells = [];
                            for (j++; tokens[j] && tokens[j].type !== 'tr_close'; j++) {
                                if (tokens[j].type === 'inline') cells.push(inlineToPlain(tokens[j]));
                            }
                            rows.push(cells);
                        }
                    }
                    renderTable(rows, hasHead);
                    i = j; break;
                }
                default: break;
            }
        }
    }

    // ── Header da 1ª página (só a logo, preta) ───────────────────────────
    cursor.y = 15;
    if (logo) {
        const lh = 8.5;
        const lw = (logo.w / logo.h) * lh;
        pdf.addImage(logo.dataUrl, 'PNG', MARGIN, cursor.y, lw, lh);
        cursor.y += lh + 6;
    } else {
        setFont({ bold: true }, 20); pdf.setTextColor(...HEAD);
        pdf.text('menin', MARGIN, cursor.y + 7); cursor.y += 14;
    }

    // Título + metadados
    setFont({ bold: true }, 19); pdf.setTextColor(...HEAD);
    const titleLines = pdf.splitTextToSize(String(article?.title || 'Artigo'), CONTENT_W);
    for (const ln of titleLines) { pdf.text(ln, MARGIN, cursor.y + 6); cursor.y += 7.6; }
    cursor.y += 1.5;

    const meta = [];
    if (article?.categorySlug) meta.push(`Categoria: ${article.categorySlug}`);
    const authorName = article?.createdBy?.username || 'Equipe Menin';
    meta.push(`Autor: ${authorName}`);
    if (article?.updatedAt) meta.push(`Atualizado: ${fmtDate(article.updatedAt)}`);
    if (article?.readingMinutes) meta.push(`${article.readingMinutes} min de leitura`);
    setFont({}, 9); pdf.setTextColor(...MUTED);
    pdf.text(meta.join('   ·   '), MARGIN, cursor.y + 3); cursor.y += 6;

    pdf.setDrawColor(...RULE); pdf.setLineWidth(0.4);
    pdf.line(MARGIN, cursor.y, A4.w - MARGIN, cursor.y);
    cursor.y += 6;

    // ── Corpo: alterna markdown e blocos @[TOKEN] ────────────────────────
    const body = String(markdown || '');
    let last = 0;
    for (const m of body.matchAll(TOKEN_RE)) {
        const before = body.slice(last, m.index);
        if (before.trim()) await renderMarkdown(before);
        renderEmbed(m[1], m[2]);
        last = m.index + m[0].length;
    }
    const tail = body.slice(last);
    if (tail.trim()) await renderMarkdown(tail);

    // ── Rodapé em todas as páginas ───────────────────────────────────────
    const gerouEm = fmtNow();
    const ano = new Date().getFullYear();
    const quem = user?.username || user?.email || 'Usuário';
    const quemLinha = user?.email && user?.username ? `${quem} (${user.email})` : quem;
    const line1 = `Gerado por ${quemLinha} em ${gerouEm} - Sistema: Menin Office - Academy`;
    const line2 = `© ${ano} Menin Engenharia - Documento interno e confidencial. Todos os direitos reservados. Autor do artigo: ${authorName}.`;

    const total = pdf.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        const fy = A4.h - FOOTER_H + 4;
        pdf.setDrawColor(...RULE); pdf.setLineWidth(0.3);
        pdf.line(MARGIN, fy - 2, A4.w - MARGIN, fy - 2);
        setFont({}, 7); pdf.setTextColor(...MUTED);
        pdf.text(line1, MARGIN, fy + 2.5);
        pdf.text(line2, MARGIN, fy + 6.5);
        setFont({ bold: true }, 7);
        pdf.text(`Página ${i}/${total}`, A4.w - MARGIN, fy + 2.5, { align: 'right' });
    }

    const stamp = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    pdf.save(`Academy_${slugifyFilename(article?.title)}_${stamp}.pdf`);
}
