/**
 * EmeBlock - o contrato entre uma tool da Eme e o que aparece no chat.
 * ─────────────────────────────────────────────────────────────────────────────
 * Ver _design/EME-COMPONENTES-PLANO.md, seção 2. A tool devolve DADO num
 * formato único; o VISUAL (tabela, barras, rosca...) é uma escolha por cima,
 * feita pela Eme (`visual`), pela pessoa (botão "trocar") ou pela régua
 * automática (`escolherVisual`). A mesma resposta vira tabela ou gráfico sem
 * voltar ao servidor.
 *
 * Este módulo é JS puro de propósito: roda nos testes (`node --test`) e no
 * navegador sem Vue.
 */

export const KINDS = [
  'dataset', 'kpis', 'cards', 'detail', 'text', 'form', 'choice', 'confirm',
  'timeline', 'map', 'nav',
  // Bloco de transição: embrulha uma action no formato antigo para o renderer
  // antigo. Some na fase 5 do plano.
  'legacy',
];

export const VISUALS = [
  'table', 'bar', 'column', 'line', 'area', 'pie', 'donut', 'heatmap', 'combo',
  'comparison', 'funnel', 'rank', 'cards', 'kpis',
];

/** Visuais que precisam de um dataset por baixo (o resto é próprio do kind). */
export const VISUAIS_DE_DATASET = [
  'table', 'bar', 'column', 'line', 'area', 'pie', 'donut', 'heatmap', 'combo', 'comparison', 'funnel', 'rank',
];

export const COLUMN_TYPES = ['text', 'number', 'currency', 'percent', 'date', 'month', 'badge', 'link'];

export const TIPOS_NUMERICOS = new Set(['number', 'currency', 'percent']);
export const TIPOS_TEMPORAIS = new Set(['date', 'month']);

let seq = 0;
const novoId = (prefixo = 'b') => `${prefixo}_${++seq}`;

/**
 * Valida um bloco. Não lança: devolve o que está errado para o dispatcher
 * decidir (bloco inválido vira um aviso discreto, nunca uma tela branca).
 * @returns {{ ok: boolean, erros: string[] }}
 */
export function validarBlock(b) {
  const erros = [];
  if (!b || typeof b !== 'object') return { ok: false, erros: ['bloco não é objeto'] };
  if (!KINDS.includes(b.kind)) erros.push(`kind desconhecido: ${b.kind}`);
  if (b.visual && b.visual.type && !VISUALS.includes(b.visual.type)) erros.push(`visual desconhecido: ${b.visual.type}`);

  if (b.kind === 'dataset') {
    const ds = b.dataset;
    if (!ds || !Array.isArray(ds.columns) || !Array.isArray(ds.rows)) erros.push('dataset precisa de columns[] e rows[]');
    else {
      for (const c of ds.columns) {
        if (!c?.key) erros.push('coluna sem key');
        if (c?.type && !COLUMN_TYPES.includes(c.type)) erros.push(`coluna ${c.key}: tipo desconhecido ${c.type}`);
      }
    }
  }
  if (b.kind === 'kpis' && !Array.isArray(b.kpis)) erros.push('kpis precisa de kpis[]');
  if (b.kind === 'cards' && !Array.isArray(b.cards)) erros.push('cards precisa de cards[]');
  if (b.kind === 'detail' && !b.detail) erros.push('detail precisa de detail{}');
  if (b.kind === 'choice' && !Array.isArray(b.choice?.options)) erros.push('choice precisa de choice.options[]');
  if (b.kind === 'nav' && !b.nav?.route) erros.push('nav precisa de nav.route');
  if (b.kind === 'text' && typeof b.text !== 'string') erros.push('text precisa de text (string)');
  if (b.kind === 'timeline' && !Array.isArray(b.timeline?.events)) erros.push('timeline precisa de timeline.events[]');
  if (b.kind === 'map' && !Array.isArray(b.map?.points)) erros.push('map precisa de map.points[]');
  if (b.kind === 'form' && !Array.isArray(b.form?.fields)) erros.push('form precisa de form.fields[]');
  if (b.kind === 'confirm' && !b.confirm?.title) erros.push('confirm precisa de confirm.title');

  return { ok: erros.length === 0, erros };
}

/** Preenche id e normaliza campos opcionais. Não muda o dado. */
export function normalizarBlock(b) {
  const out = { ...b };
  if (!out.id) out.id = novoId(out.kind || 'b');
  if (out.visual && typeof out.visual === 'string') out.visual = { type: out.visual };
  if (out.kind === 'dataset' && out.dataset) {
    const ds = out.dataset;
    out.dataset = {
      ...ds,
      columns: (ds.columns || []).map((c) => ({ type: 'text', ...c })),
      rows: Array.isArray(ds.rows) ? ds.rows : [],
      total: ds.total ?? (Array.isArray(ds.rows) ? ds.rows.length : 0),
      truncated: !!ds.truncated,
    };
  }
  if (!Array.isArray(out.actions)) out.actions = out.actions ? [out.actions] : [];
  return out;
}

/** Colunas de um dataset separadas por papel. */
export function perfilDoDataset(ds) {
  const cols = ds?.columns || [];
  const numericas = cols.filter((c) => TIPOS_NUMERICOS.has(c.type));
  const temporais = cols.filter((c) => TIPOS_TEMPORAIS.has(c.type));
  const categoricas = cols.filter((c) => !TIPOS_NUMERICOS.has(c.type) && !TIPOS_TEMPORAIS.has(c.type));
  return {
    colunas: cols.length,
    linhas: (ds?.rows || []).length,
    numericas, temporais, categoricas,
    // Papéis declarados pela tool em `series` (ex.: meta): { key, label, role }
    series: Array.isArray(ds?.series) ? ds.series : [],
  };
}

export default { KINDS, VISUALS, VISUAIS_DE_DATASET, COLUMN_TYPES, validarBlock, normalizarBlock, perfilDoDataset };
