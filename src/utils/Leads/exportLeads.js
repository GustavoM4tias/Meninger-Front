// Exportação do Relatório de Leads.
//  • HTML → relatório interativo autocontido (reportHtml.js), fácil de encaminhar
//  • PDF  → o mesmo relatório aberto para impressão: vetorial, texto selecionável
// Excel NÃO sai daqui: é gerado pelo modal de leads (components/config/Export.vue).
// file-saver entra por import dinâmico: só carrega ao exportar.
import dayjs from 'dayjs';
import { buildReportModel, buildReportHtml } from './reportHtml';

function stamp() { return dayjs().format('YYYY-MM-DD_HH-mm'); }

// ─── HTML interativo (arquivo único, para encaminhar) ───────────────────────
export async function exportReportHtml({ leads = [], from, to, geradoPor = null } = {}) {
  const { saveAs } = await import('file-saver');
  const model = buildReportModel({ leads, from, to, geradoPor });
  const html = buildReportHtml(model);
  saveAs(new Blob([html], { type: 'text/html;charset=utf-8' }), `Relatorio_Leads_${stamp()}.html`);
}

// ─── PDF ────────────────────────────────────────────────────────────────────
// Usa o MESMO relatório HTML e manda imprimir: sai vetorial, com texto
// selecionável e quebra de página correta. O caminho antigo (html2canvas →
// imagem no jsPDF) gerava bordas, corte no meio de card e texto embaçado.
export async function exportReportPdf({ leads = [], from, to, geradoPor = null } = {}) {
  const model = buildReportModel({ leads, from, to, geradoPor });
  const html = buildReportHtml(model);

  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('O navegador bloqueou a janela de impressão. Libere pop-ups para este site e tente de novo.');
  }
  win.document.open();
  win.document.write(html);
  win.document.close();

  // Espera o layout assentar antes de abrir a caixa de impressão.
  await new Promise(resolve => {
    if (win.document.readyState === 'complete') return resolve();
    win.addEventListener('load', resolve, { once: true });
    setTimeout(resolve, 1200);
  });

  win.focus();
  win.print();
}
