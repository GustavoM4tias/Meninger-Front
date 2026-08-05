// Emissão do PDF da Visão Executiva (Sobre o Office) - apenas admin.
//
// Segue o mesmo princípio do PDF do Academy (utils/Academy/articlePdf.js): o
// conteúdo é DESENHADO NATIVAMENTE no jsPDF em vez de capturar a tela, então o
// texto sai selecionável, nítido e com quebra de página que não corta linha.
// Os blocos vêm de config/aboutOffice.js, os mesmos que a tela renderiza.
//
//  - Capa: logo Menin em preto, título, subtítulo e os números de topo.
//  - Rodapé (todas as páginas): quem gerou, quando, e aviso de confidencialidade.

const LOGO_SRC = '/Mlogotext.png'; // logo branca no arquivo -> invertida p/ preto

// ── Geometria (mm) ───────────────────────────────────────────────────────────
const A4 = { w: 210, h: 297 };
const MARGIN = 16;
const CONTENT_W = A4.w - MARGIN * 2;
const FOOTER_H = 18;
const BODY_BOTTOM = A4.h - FOOTER_H;
const PAGE_TOP = 18;

// ── Cores ────────────────────────────────────────────────────────────────────
const INK = [24, 32, 46];
const HEAD = [15, 23, 42];
const MUTED = [110, 122, 138];
const ACCENT = [46, 117, 182];    // azul do relatório
const RULE = [223, 228, 235];
const SOFT_BG = [245, 248, 251];

function fmtNow() {
    return new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
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

/**
 * Gera e baixa o PDF da Visão Executiva.
 * @param {Object}   opts
 * @param {Array}    opts.sections     officeReport (seções com blocos)
 * @param {Array}    opts.highlights   números de topo já resolvidos (ao vivo ou fixos)
 * @param {Object}   opts.user         quem gera { username, email }
 * @param {string}   opts.updatedLabel texto curto sobre a data dos números
 */
export async function exportExecutiveReportToPdf({ sections, highlights = [], user, updatedLabel = '' }) {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const logo = await loadBlackLogo();

    const cursor = { y: PAGE_TOP };

    function ensureSpace(h) {
        if (cursor.y + h > BODY_BOTTOM) {
            pdf.addPage();
            cursor.y = PAGE_TOP;
        }
    }
    function setFont(bold, size) {
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setFontSize(size);
    }
    /** Escreve texto com quebra automática e devolve a altura usada. */
    function writeText(text, { size = 9.5, bold = false, color = INK, x = MARGIN, width = CONTENT_W, lead = 1.42, gapAfter = 3 } = {}) {
        setFont(bold, size);
        pdf.setTextColor(...color);
        const lines = pdf.splitTextToSize(String(text ?? ''), width);
        const lh = size * 0.352778 * lead;
        for (const line of lines) {
            ensureSpace(lh);
            pdf.text(line, x, cursor.y + lh * 0.78);
            cursor.y += lh;
        }
        cursor.y += gapAfter;
    }
    /** Altura que um texto ocuparia, sem desenhar. */
    function measureText(text, size, width) {
        setFont(false, size);
        return pdf.splitTextToSize(String(text ?? ''), width).length * size * 0.352778 * 1.4;
    }

    // ── Capa ─────────────────────────────────────────────────────────────────
    cursor.y = 15;
    if (logo) {
        const lh = 8.5;
        pdf.addImage(logo.dataUrl, 'PNG', MARGIN, cursor.y, (logo.w / logo.h) * lh, lh);
        cursor.y += lh + 8;
    }

    setFont(false, 9);
    pdf.setTextColor(...ACCENT);
    pdf.text('VISÃO EXECUTIVA', MARGIN, cursor.y);
    cursor.y += 7;

    writeText('Menin Office', { size: 24, bold: true, color: HEAD, gapAfter: 1.5 });
    writeText('A camada que une os sistemas da companhia: o que o sistema já faz pela Menin.',
        { size: 11, color: MUTED, gapAfter: 6 });

    // Números de topo em faixa
    if (highlights.length) {
        const cols = 2;
        const gap = 4;
        const boxW = (CONTENT_W - gap * (cols - 1)) / cols;
        for (let i = 0; i < highlights.length; i += cols) {
            const row = highlights.slice(i, i + cols);
            const heights = row.map(k => 9 + measureText(k.s || '', 7.5, boxW - 8));
            const boxH = Math.max(...heights, 18);
            ensureSpace(boxH + gap);
            row.forEach((kpi, ci) => {
                const x = MARGIN + ci * (boxW + gap);
                pdf.setFillColor(...SOFT_BG);
                pdf.setDrawColor(...RULE);
                pdf.setLineWidth(0.3);
                pdf.roundedRect(x, cursor.y, boxW, boxH, 2, 2, 'FD');
                pdf.setDrawColor(...ACCENT);
                pdf.setLineWidth(0.9);
                pdf.line(x + 0.45, cursor.y + 1.5, x + 0.45, cursor.y + boxH - 1.5);

                setFont(true, 13); pdf.setTextColor(...ACCENT);
                pdf.text(String(kpi.v), x + 4, cursor.y + 7);
                setFont(true, 8); pdf.setTextColor(...HEAD);
                pdf.text(String(kpi.l), x + 4, cursor.y + 11.6);
                if (kpi.s) {
                    setFont(false, 7.5); pdf.setTextColor(...MUTED);
                    const lines = pdf.splitTextToSize(String(kpi.s), boxW - 8);
                    lines.forEach((ln, li) => pdf.text(ln, x + 4, cursor.y + 15.6 + li * 3));
                }
            });
            cursor.y += boxH + gap;
        }
        cursor.y += 2;
    }

    if (updatedLabel) {
        writeText(updatedLabel, { size: 8, color: MUTED, gapAfter: 4 });
    }

    pdf.setDrawColor(...RULE); pdf.setLineWidth(0.4);
    pdf.line(MARGIN, cursor.y, A4.w - MARGIN, cursor.y);
    cursor.y += 7;

    // ── Blocos ───────────────────────────────────────────────────────────────
    function renderTable(head, rows) {
        const cols = head.length;
        // Primeira coluna mais estreita: é sempre o rótulo da linha.
        const weights = cols === 2 ? [0.32, 0.68]
            : cols === 3 ? [0.24, 0.24, 0.52]
                : Array(cols).fill(1 / cols);
        const widths = weights.map(w => w * CONTENT_W);
        const padX = 2, padY = 1.8;

        const drawRow = (cells, { bold = false, bg = null, size = 8 } = {}) => {
            setFont(bold, size);
            const cellLines = cells.map((cell, i) => pdf.splitTextToSize(String(cell ?? ''), widths[i] - padX * 2));
            const lh = size * 0.352778 * 1.35;
            const rowH = Math.max(...cellLines.map(l => l.length)) * lh + padY * 2;
            ensureSpace(rowH);
            if (bg) {
                pdf.setFillColor(...bg);
                pdf.rect(MARGIN, cursor.y, CONTENT_W, rowH, 'F');
            }
            let x = MARGIN;
            cellLines.forEach((lines, i) => {
                setFont(bold || i === 0, size);
                pdf.setTextColor(...(i === 0 ? HEAD : INK));
                lines.forEach((ln, li) => pdf.text(ln, x + padX, cursor.y + padY + lh * (li + 0.78)));
                x += widths[i];
            });
            cursor.y += rowH;
            pdf.setDrawColor(...RULE); pdf.setLineWidth(0.2);
            pdf.line(MARGIN, cursor.y, A4.w - MARGIN, cursor.y);
        };

        pdf.setDrawColor(...RULE); pdf.setLineWidth(0.2);
        pdf.line(MARGIN, cursor.y, A4.w - MARGIN, cursor.y);
        drawRow(head, { bold: true, bg: SOFT_BG, size: 7.5 });
        rows.forEach(row => drawRow(row));
        cursor.y += 4;
    }

    function renderKpis(items) {
        const gap = 4;
        const boxW = (CONTENT_W - gap) / 2;
        for (let i = 0; i < items.length; i += 2) {
            const row = items.slice(i, i + 2);
            const boxH = Math.max(...row.map(k => 12 + measureText(k.s || '', 7.5, boxW - 8)), 18);
            ensureSpace(boxH + gap);
            row.forEach((kpi, ci) => {
                const x = MARGIN + ci * (boxW + gap);
                pdf.setFillColor(...SOFT_BG); pdf.setDrawColor(...RULE); pdf.setLineWidth(0.3);
                pdf.roundedRect(x, cursor.y, boxW, boxH, 2, 2, 'FD');
                setFont(true, 12); pdf.setTextColor(...ACCENT);
                pdf.text(String(kpi.v), x + 4, cursor.y + 6.5);
                setFont(true, 8); pdf.setTextColor(...HEAD);
                pdf.text(String(kpi.l), x + 4, cursor.y + 11);
                if (kpi.s) {
                    setFont(false, 7.5); pdf.setTextColor(...MUTED);
                    pdf.splitTextToSize(String(kpi.s), boxW - 8)
                        .forEach((ln, li) => pdf.text(ln, x + 4, cursor.y + 15 + li * 3));
                }
            });
            cursor.y += boxH + gap;
        }
    }

    function renderModule(block) {
        const fields = [
            ['O que é', block.what],
            ['Resultado', block.result],
            ['Novidade', block.extra],
            ['Por que existe', block.why],
        ].filter(([, v]) => v);

        // Mede antes para não partir o cartão entre páginas quando ele couber inteiro.
        const innerW = CONTENT_W - 8;
        const needed = 8 + fields.reduce((h, [k, v]) => h + 3.4 + measureText(v, 9, innerW), 0);
        if (needed < BODY_BOTTOM - PAGE_TOP) ensureSpace(needed);

        const top = cursor.y;
        cursor.y += 3;
        writeText(block.name, { size: 11, bold: true, color: HEAD, x: MARGIN + 4, width: innerW, gapAfter: 1.5 });
        fields.forEach(([label, value]) => {
            writeText(label.toUpperCase(), { size: 6.8, bold: true, color: MUTED, x: MARGIN + 4, width: innerW, gapAfter: 0.4 });
            writeText(value, { size: 9, color: INK, x: MARGIN + 4, width: innerW, gapAfter: 2.2 });
        });
        cursor.y += 1;
        // Filete lateral do cartão (só quando não houve quebra de página no meio).
        if (cursor.y > top) {
            pdf.setDrawColor(...ACCENT); pdf.setLineWidth(0.9);
            pdf.line(MARGIN + 0.45, top + 1, MARGIN + 0.45, cursor.y - 1);
        }
        cursor.y += 3;
    }

    sections.forEach((section, si) => {
        ensureSpace(16);
        cursor.y += 3;
        setFont(true, 14); pdf.setTextColor(...HEAD);
        pdf.text(`${si + 1}. ${section.title}`, MARGIN, cursor.y + 5);
        cursor.y += 8.5;
        pdf.setDrawColor(...ACCENT); pdf.setLineWidth(0.6);
        pdf.line(MARGIN, cursor.y, MARGIN + 24, cursor.y);
        pdf.setDrawColor(...RULE); pdf.setLineWidth(0.3);
        pdf.line(MARGIN + 24, cursor.y, A4.w - MARGIN, cursor.y);
        cursor.y += 5;

        section.blocks.forEach(block => {
            switch (block.type) {
                case 'p':
                    writeText(block.text, { size: 9.5, color: INK, gapAfter: 3.5 });
                    break;

                case 'quote': {
                    const h = measureText(block.text, 10.5, CONTENT_W - 6) + 4;
                    ensureSpace(h);
                    const top = cursor.y;
                    cursor.y += 2;
                    writeText(block.text, { size: 10.5, bold: true, color: HEAD, x: MARGIN + 5, width: CONTENT_W - 6, gapAfter: 2 });
                    pdf.setDrawColor(...ACCENT); pdf.setLineWidth(1.1);
                    pdf.line(MARGIN + 0.6, top + 1, MARGIN + 0.6, cursor.y - 1);
                    cursor.y += 3;
                    break;
                }

                case 'kpis':
                    if (block.caption) writeText(block.caption, { size: 8, color: MUTED, gapAfter: 2 });
                    renderKpis(block.items);
                    cursor.y += 2;
                    break;

                case 'table':
                    if (block.caption) writeText(block.caption, { size: 8, color: MUTED, gapAfter: 2 });
                    renderTable(block.head, block.rows);
                    break;

                case 'list':
                    if (block.caption) writeText(block.caption, { size: 10, bold: true, color: HEAD, gapAfter: 2 });
                    block.items.forEach(item => {
                        const bulletY = cursor.y;
                        writeText(item, { size: 9.5, color: INK, x: MARGIN + 4.5, width: CONTENT_W - 4.5, gapAfter: 2 });
                        pdf.setFillColor(...ACCENT);
                        pdf.circle(MARGIN + 1.6, bulletY + 2.4, 0.7, 'F');
                    });
                    cursor.y += 2;
                    break;

                case 'module':
                    renderModule(block);
                    break;

                default:
                    break;
            }
        });
        cursor.y += 3;
    });

    // ── Rodapé ───────────────────────────────────────────────────────────────
    const quem = user?.username || user?.email || 'Usuário';
    const quemLinha = user?.email && user?.username ? `${quem} (${user.email})` : quem;
    const line1 = `Gerado por ${quemLinha} em ${fmtNow()} - Sistema: Menin Office`;
    const line2 = `© ${new Date().getFullYear()} Menin Engenharia - Documento interno e confidencial. Todos os direitos reservados.`;

    const total = pdf.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
        pdf.setPage(i);
        const fy = A4.h - FOOTER_H + 4;
        pdf.setDrawColor(...RULE); pdf.setLineWidth(0.3);
        pdf.line(MARGIN, fy - 2, A4.w - MARGIN, fy - 2);
        setFont(false, 7); pdf.setTextColor(...MUTED);
        pdf.text(line1, MARGIN, fy + 2.5);
        pdf.text(line2, MARGIN, fy + 6.5);
        setFont(true, 7);
        pdf.text(`Página ${i}/${total}`, A4.w - MARGIN, fy + 2.5, { align: 'right' });
    }

    const stamp = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    pdf.save(`Menin_Office_Visao_Executiva_${stamp}.pdf`);
}
