/**
 * projectionUtils — helpers compartilhados do editor de Projeção (tela nova).
 * Mantém as regras de cálculo (VGV = unidades × ticket) e formatação num só lugar,
 * para que o orquestrador e os componentes filhos não dupliquem lógica.
 */

export const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
export const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/* ── YM (YYYY-MM) ──────────────────────────────────────────────────────────── */
export function ensureYM(v) {
  const ym = String(v || '').slice(0, 7);
  return /^\d{4}-\d{2}$/.test(ym) ? ym : null;
}
export function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m - 1) + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function buildMonthRange(start, end) {
  const out = [];
  let cur = start, guard = 0;
  while (cur <= end && guard < 600) { out.push(cur); cur = addMonths(cur, 1); guard++; }
  return out;
}
export function monthLabel(ym) {
  const [y, m] = String(ym).split('-');
  return `${MONTH_LABELS[Number(m) - 1]}/${y}`;
}
export function shortMonthLabel(ym) {
  const [y, m] = String(ym).split('-');
  return `${SHORT_MONTHS[Number(m) - 1]}/${y.slice(2)}`;
}

/* ── Formatação (pt-BR) ────────────────────────────────────────────────────── */
const nfBRLFull = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const nfInt = new Intl.NumberFormat('pt-BR');
export function brl(v) { const n = Number(v); return nfBRLFull.format(Number.isFinite(n) ? n : 0); }
export function int(v) { const n = Number(v); return nfInt.format(Number.isFinite(n) ? Math.round(n) : 0); }
export function brlCompact(v) {
  const n = Number(v);
  if (!n) return 'R$ 0';
  if (n >= 1e9) return `R$ ${(n / 1e9).toFixed(2).replace('.', ',')} bi`;
  if (n >= 1e6) return `R$ ${(n / 1e6).toFixed(2).replace('.', ',')} mi`;
  if (n >= 1e3) return `R$ ${(n / 1e3).toFixed(0)} mil`;
  return nfBRLFull.format(n);
}
export function formatDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? '—' : dt.toLocaleString('pt-BR');
}
export function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt) ? '—' : dt.toLocaleDateString('pt-BR');
}

/* ── Cidades: normalização (Marília == Marilia == MARÍLIA) ─────────────────── */
/** Chave de comparação: sem acento, sem espaço duplo, maiúsculo. */
export function cityKey(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ').trim().toUpperCase();
}
/** Mapa chave→rótulo canônico. Entre variantes, vence a que tem acento; depois a mais frequente. */
export function buildCityCanonicalMap(cities) {
  const groups = new Map(); // key -> Map(label -> count)
  for (const c of cities || []) {
    const raw = String(c || '').trim();
    if (!raw) continue;
    const k = cityKey(raw);
    if (!groups.has(k)) groups.set(k, new Map());
    const g = groups.get(k);
    g.set(raw, (g.get(raw) || 0) + 1);
  }
  const out = new Map();
  for (const [k, variants] of groups.entries()) {
    let best = null, bestScore = -Infinity;
    for (const [label, count] of variants.entries()) {
      const hasAccent = /[À-ÖØ-öø-ÿ]/.test(label) ? 1 : 0;
      const score = hasAccent * 1000 + count; // acento tem prioridade, depois frequência
      if (score > bestScore) { bestScore = score; best = label; }
    }
    out.set(k, best);
  }
  return out;
}
export function canonicalCity(s, map) {
  if (!s) return null;
  return map?.get(cityKey(s)) || String(s).trim();
}

/* ── Modelo de linha / célula ──────────────────────────────────────────────── */
export function rowKey(r) { return `${String(r.enterprise_key)}|${String(r.alias_id || 'default')}`; }

export function emptyCell() { return { units: 0 }; }

/** VGV de uma célula = unidades × ticket médio do empreendimento (fonte única). */
export function cellVgv(row, ym) {
  const units = Number(row.values?.[ym]?.units || 0);
  return units * Number(row.defaultPrice || 0);
}
export function rowUnits(row, months) {
  let u = 0;
  for (const ym of months) u += Number(row.values?.[ym]?.units || 0);
  return u;
}
export function rowVgv(row, months) {
  let v = 0;
  for (const ym of months) v += cellVgv(row, ym);
  return v;
}
export function rowHasValue(row, months) {
  for (const ym of months) if (Number(row.values?.[ym]?.units || 0) > 0) return true;
  return false;
}
