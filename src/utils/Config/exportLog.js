// Trilha de exportações de relatórios (compartilhada por todas as telas).
// O registro é "best effort": se falhar, NÃO atrapalha o download que o usuário
// acabou de fazer — só loga no console.
import { requestWithAuth } from '@/utils/Auth/requestWithAuth';

/** Slug estável do nome do relatório, usado como chave na trilha. */
export function slugReport(titulo) {
  return String(titulo || 'relatorio')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'relatorio';
}

export async function registrarExport({
  report = 'relatorio',
  format,
  periodStart = null,
  periodEnd = null,
  recordCount = null,
  filters = null,
}) {
  try {
    await requestWithAuth('/report-exports', {
      method: 'POST',
      body: JSON.stringify({ report, format, periodStart, periodEnd, recordCount, filters }),
    });
  } catch (e) {
    console.warn('[exportLog] não foi possível registrar a exportação:', e?.message || e);
  }
}

export async function listarExports(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== '') q.append(k, v);
  });
  const qs = q.toString();
  const data = await requestWithAuth(`/report-exports${qs ? `?${qs}` : ''}`);
  return data?.data ?? data;
}
