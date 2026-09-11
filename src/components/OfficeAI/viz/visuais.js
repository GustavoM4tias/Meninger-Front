/** Rótulo e ícone de cada visual - a mesma lista no botão de trocar e na galeria. */
export const ROTULO_VISUAL = {
  table: 'Tabela', bar: 'Barras', column: 'Colunas', line: 'Linha', area: 'Área',
  pie: 'Pizza', donut: 'Rosca', heatmap: 'Mapa de calor', combo: 'Combinado',
  comparison: 'Comparativo', funnel: 'Funil', rank: 'Ranking', cards: 'Cards', kpis: 'Números',
};
export const ICONE_VISUAL = {
  table: 'fas fa-table', bar: 'fas fa-chart-bar', column: 'fas fa-chart-column', line: 'fas fa-chart-line',
  area: 'fas fa-chart-area', pie: 'fas fa-chart-pie', donut: 'far fa-circle-dot', heatmap: 'fas fa-table-cells',
  combo: 'fas fa-chart-simple', comparison: 'fas fa-scale-balanced', funnel: 'fas fa-filter', rank: 'fas fa-ranking-star',
  cards: 'fas fa-id-card', kpis: 'fas fa-hashtag',
};
export const rotuloVisual = (v) => ROTULO_VISUAL[v] || v;
export const iconeVisual = (v) => ICONE_VISUAL[v] || 'fas fa-shapes';
