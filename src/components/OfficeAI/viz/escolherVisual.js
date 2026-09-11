/**
 * escolherVisual - a régua que decide COMO um dataset aparece quando ninguém
 * pediu um visual.
 * ─────────────────────────────────────────────────────────────────────────────
 * Determinística e testada (tests/emeViz.test.mjs). A ordem das regras é a
 * do plano (seção 4), e ela importa:
 *
 *   1. data/mês + 1 numérica + série com papel 'meta'   → combo
 *   2. data/mês + 1 numérica                             → line
 *   3. data/mês x categoria x numérica (pivot longo)     → heatmap
 *   4. 1 categórica + 1 numérica, ≤ 6 linhas, parte-de-um-todo → donut
 *   5. 1 categórica + 1 numérica, ≤ 15 linhas            → rank
 *   6. 1 categórica + 2+ numéricas comparáveis, ≤ 12     → column (agrupadas)
 *   7. > 15 linhas ou > 4 colunas                        → table
 *   8. fallback                                          → table
 *
 * "Parte de um todo": a tool diz (`dataset.parteDeUmTodo: true`) ou os valores
 * são todos ≥ 0 e a coluna é `number`/`currency` (percentual não soma).
 *
 * Pizza acima de 6 fatias está proibida na prática (design language v2):
 * vira ranking ordenado.
 */
import { perfilDoDataset, VISUAIS_DE_DATASET } from './emeBlock.js';

const somaFazSentido = (ds, col) => {
  if (ds.parteDeUmTodo === true) return true;
  if (ds.parteDeUmTodo === false) return false;
  if (col.type === 'percent') return false;
  return (ds.rows || []).every((r) => Number(r[col.key] ?? 0) >= 0);
};

const mesmaUnidade = (cols) => new Set(cols.map((c) => c.type)).size === 1;

/**
 * @param {object} dataset  { columns, rows, series?, parteDeUmTodo? }
 * @returns {string} um de VISUAIS_DE_DATASET
 */
export function escolherVisual(dataset) {
  if (!dataset || !Array.isArray(dataset.columns) || !Array.isArray(dataset.rows)) return 'table';
  const p = perfilDoDataset(dataset);
  const temMeta = p.series.some((s) => s.role === 'meta' || s.role === 'target');

  if (p.temporais.length === 1 && p.numericas.length >= 1) {
    if (p.categoricas.length === 1 && p.numericas.length === 1 && p.linhas > 1) {
      // Longo: uma linha por (período, categoria). Só é heatmap se houver
      // repetição de período - senão é uma série com um rótulo a mais.
      const periodos = new Set(dataset.rows.map((r) => r[p.temporais[0].key]));
      if (periodos.size < p.linhas) return 'heatmap';
    }
    if (p.categoricas.length === 0) return temMeta ? 'combo' : 'line';
  }

  if (p.categoricas.length === 1 && p.numericas.length === 1) {
    if (p.linhas <= 6 && p.linhas >= 2 && somaFazSentido(dataset, p.numericas[0])) return 'donut';
    if (p.linhas <= 15) return 'rank';
    return 'table';
  }

  if (p.categoricas.length === 1 && p.numericas.length >= 2 && p.numericas.length <= 4) {
    if (p.linhas <= 12 && mesmaUnidade(p.numericas)) return 'column';
  }

  return 'table';
}

/**
 * Visuais que FAZEM SENTIDO para este dataset - alimenta o botão "trocar
 * visual". Tabela sempre entra (é a forma acessível de qualquer dado).
 */
export function visuaisPossiveis(dataset) {
  const out = new Set(['table']);
  if (!dataset || !Array.isArray(dataset.columns)) return [...out];
  const p = perfilDoDataset(dataset);

  if (p.categoricas.length >= 1 && p.numericas.length >= 1) {
    out.add('bar'); out.add('column'); out.add('rank');
    if (p.numericas.length === 1 && p.linhas <= 8 && somaFazSentido(dataset, p.numericas[0])) { out.add('donut'); out.add('pie'); }
    if (p.numericas.length === 1 && p.linhas <= 8 && p.linhas >= 2) out.add('funnel');
    if (p.numericas.length >= 2) out.add('comparison');
  }
  if (p.temporais.length === 1 && p.numericas.length >= 1) {
    out.add('line'); out.add('area');
    if (p.numericas.length >= 2 || p.series.some((s) => s.role === 'meta')) out.add('combo');
    if (p.categoricas.length === 1) out.add('heatmap');
  }
  return VISUAIS_DE_DATASET.filter((v) => out.has(v));
}

/** Visual final de um bloco: o pedido, se couber; senão a régua. */
export function visualDoBloco(block) {
  const pedido = block?.visual?.type;
  if (block?.kind !== 'dataset') return pedido || null;
  const possiveis = visuaisPossiveis(block.dataset);
  if (pedido && possiveis.includes(pedido)) return pedido;
  return escolherVisual(block.dataset);
}

export default { escolherVisual, visuaisPossiveis, visualDoBloco };
