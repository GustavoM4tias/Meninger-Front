/**
 * Exportar/copiar um dataset - o mesmo botão em toda a galeria.
 * O ExcelJS é pesado (1,5 MB): entra só quando alguém clica.
 */
import { formatarValor } from './formatos.js';

function celula(row, col) {
  const v = row[col.key];
  if (v == null) return '';
  // Excel recebe número cru para poder somar; texto vai formatado.
  if (['number', 'currency', 'percent'].includes(col.type)) {
    const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : String(v);
  }
  return formatarValor(v, col.type);
}

export async function exportarDatasetExcel(dataset, titulo = 'dados') {
  const [{ default: ExcelJS }, { default: saveAs }] = await Promise.all([
    import('exceljs/dist/exceljs.min.js'),
    import('file-saver'),
  ]);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Eme - Menin Office';
  const ws = wb.addWorksheet('Dados');
  const cols = dataset.columns || [];
  ws.addRow(cols.map((c) => c.label || c.key));
  ws.getRow(1).font = { bold: true };
  for (const row of dataset.rows || []) ws.addRow(cols.map((c) => celula(row, c)));
  ws.columns.forEach((col, i) => {
    const label = cols[i]?.label ?? '';
    const maxLen = Math.max(label.length, ...(dataset.rows || []).map((r) => String(r[cols[i]?.key] ?? '').length));
    col.width = Math.min(Math.max(maxLen + 4, 12), 40);
    if (cols[i]?.type === 'currency') col.numFmt = '"R$" #,##0.00';
    if (cols[i]?.type === 'percent') col.numFmt = '0.0"%"';
  });
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `${String(titulo || 'dados').replace(/[\\/:*?"<>|]+/g, '-')}.xlsx`);
}

export async function copiarDataset(dataset) {
  const cols = dataset.columns || [];
  const header = cols.map((c) => c.label || c.key).join('\t');
  const body = (dataset.rows || []).map((r) => cols.map((c) => formatarValor(r[c.key], c.type)).join('\t')).join('\n');
  await navigator.clipboard.writeText(`${header}\n${body}`);
}

export default { exportarDatasetExcel, copiarDataset };
