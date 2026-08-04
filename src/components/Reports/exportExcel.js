// Exportação Excel dos relatórios da Eme.
//
// Duas origens de dados:
//  - Relatório INTERATIVO: o backend devolve as linhas cruas de cada consulta
//    (POST /reports/:id/data/export), já com as alçadas e filtros do leitor
//    aplicados. Cada consulta vira uma aba.
//  - Relatório sem consultas: exporta as tabelas visíveis do próprio spec.
//
// exceljs e file-saver entram por import dinâmico: só carregam ao exportar.

import { safeFilename } from './exportReport.js';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Cabeçalho escuro + zebra sutil, mesmo padrão das planilhas da casa
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
const ZEBRA_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

async function novoWorkbook() {
  const { default: ExcelJS } = await import('exceljs/dist/exceljs.min.js');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Menin Office';
  wb.created = new Date();
  return wb;
}

async function salvar(wb, title) {
  const { saveAs } = await import('file-saver');
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: XLSX_MIME }), safeFilename(title, 'xlsx'));
}

// Nome de aba válido no Excel: sem \/*?:[] e no máximo 31 chars, sem repetir
function nomeAba(label, usados, fallback) {
  let nome = String(label || fallback || 'Dados').replace(/[\\/*?:[\]]/g, ' ').trim().slice(0, 28) || 'Dados';
  let final = nome;
  let n = 2;
  while (usados.has(final.toLowerCase())) final = `${nome} ${n++}`;
  usados.add(final.toLowerCase());
  return final;
}

function larguraColuna(col, rows) {
  let max = String(col.label || col.key).length;
  for (const r of rows.slice(0, 200)) {
    const len = String(r?.[col.key] ?? '').length;
    if (len > max) max = len;
  }
  return Math.min(Math.max(max + 2, 10), 44);
}

// Datas ISO viram Date de verdade (célula de data no Excel); número fica número
function valorCelula(v) {
  if (v == null) return null;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(s)) {
    const d = new Date(s.length === 10 ? `${s}T00:00:00` : s);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return s;
}

function addAbaDados(wb, usados, { label, columns, rows, truncated, total }) {
  const ws = wb.addWorksheet(nomeAba(label, usados), {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  ws.columns = columns.map((c) => ({
    header: c.label || c.key,
    key: c.key,
    width: larguraColuna(c, rows),
  }));

  const header = ws.getRow(1);
  header.height = 18;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = HEADER_FILL;
    cell.alignment = { vertical: 'middle' };
  });

  rows.forEach((r, ri) => {
    const linha = {};
    for (const c of columns) linha[c.key] = valorCelula(r?.[c.key]);
    const row = ws.addRow(linha);
    if (ri % 2 === 1) row.eachCell((cell) => { cell.fill = ZEBRA_FILL; });
    row.eachCell((cell) => {
      if (cell.value instanceof Date) cell.numFmt = 'dd/mm/yyyy';
    });
  });

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  if (truncated) {
    const aviso = ws.addRow([`Mostrando ${rows.length} de ${total} registros. Refine os filtros do relatório para exportar o restante.`]);
    aviso.getCell(1).font = { italic: true, color: { argb: 'FF64748B' }, size: 10 };
  }
  return ws;
}

function addAbaSobre(wb, usados, { title, filtros, filterLabels, refreshedAt }) {
  const ws = wb.addWorksheet(nomeAba('Sobre', usados));
  ws.columns = [{ width: 26 }, { width: 60 }];
  const add = (rotulo, valor) => {
    const row = ws.addRow([rotulo, valor]);
    row.getCell(1).font = { bold: true, size: 11 };
  };
  add('Relatório', title);
  add('Exportado em', new Date().toLocaleString('pt-BR'));
  if (refreshedAt) add('Dados consultados em', new Date(refreshedAt).toLocaleString('pt-BR'));
  const chaves = Object.keys(filtros || {});
  if (chaves.length) {
    ws.addRow([]);
    add('Filtros aplicados', '');
    for (const k of chaves) {
      const v = filtros[k];
      const texto = v && typeof v === 'object'
        ? [v.from ? `de ${v.from}` : '', v.to ? `até ${v.to}` : ''].filter(Boolean).join(' ')
        : String(v);
      ws.addRow([`  ${filterLabels?.[k] || k}`, texto]);
    }
  } else {
    add('Filtros aplicados', 'Nenhum (dados completos do relatório)');
  }
  ws.addRow([]);
  const nota = ws.addRow(['Gerado pelo Menin Office. Dados restritos ao acesso de quem exportou.']);
  nota.getCell(1).font = { italic: true, color: { argb: 'FF64748B' }, size: 10 };
}

/**
 * Planilha completa do relatório: uma aba por consulta + aba "Sobre" com os
 * filtros que estavam aplicados no momento do export.
 * sheets: [{ id, label, columns: [{key,label}], rows, total, truncated }]
 */
export async function exportSheetsXlsx({ sheets, title, filtros, filterLabels, refreshedAt }) {
  const wb = await novoWorkbook();
  const usados = new Set();
  for (const sheet of sheets) addAbaDados(wb, usados, sheet);
  addAbaSobre(wb, usados, { title, filtros, filterLabels, refreshedAt });
  await salvar(wb, title);
}

/** Uma lista só (ex.: registros do drill-down) em planilha. */
export async function exportRowsXlsx({ rows, columns, title, sheetName }) {
  const wb = await novoWorkbook();
  const usados = new Set();
  addAbaDados(wb, usados, { label: sheetName || title, columns, rows, truncated: false, total: rows.length });
  await salvar(wb, title);
}

/**
 * Fallback para relatório SEM consultas interativas: exporta as tabelas
 * visíveis do spec (com as props recalculadas ao vivo, quando houver).
 */
export function tablesFromSpec(spec, liveProps = {}) {
  const sheets = [];
  for (const block of spec?.blocks || []) {
    if (block?.type !== 'table') continue;
    const props = { ...(block.props || {}), ...(liveProps[block.id] || {}) };
    const columns = Array.isArray(props.columns) ? props.columns : [];
    const rows = Array.isArray(props.rows) ? props.rows : [];
    if (!columns.length || !rows.length) continue;
    sheets.push({
      id: block.id,
      label: props.title || `Tabela ${sheets.length + 1}`,
      columns: columns.map((c) => ({ key: c.key, label: c.label || c.key })),
      rows,
      total: rows.length,
      truncated: false,
    });
  }
  return sheets;
}

export default { exportSheetsXlsx, exportRowsXlsx, tablesFromSpec };
