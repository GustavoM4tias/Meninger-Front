// tests/emeViz.test.mjs
//
// O contrato EmeBlock, a régua de visual e o adaptador do formato antigo.
// Roda com `npm test` (node --test) - o front não tinha teste nenhum até aqui.
import test from 'node:test';
import assert from 'node:assert/strict';

import { validarBlock, normalizarBlock, perfilDoDataset } from '../src/components/OfficeAI/viz/emeBlock.js';
import { escolherVisual, visuaisPossiveis, visualDoBloco } from '../src/components/OfficeAI/viz/escolherVisual.js';
import { legacyActionToBlocks, blocksDe } from '../src/components/OfficeAI/viz/legacyAdapter.js';
import { numeroDe, formatarValor } from '../src/components/OfficeAI/viz/formatos.js';

const ds = (columns, rows, extra = {}) => ({ columns, rows, ...extra });
const cat = (key = 'nome') => ({ key, label: key, type: 'text' });
const num = (key = 'valor', type = 'number') => ({ key, label: key, type });
const mes = (key = 'mes') => ({ key, label: key, type: 'month' });
const linhas = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

test('validarBlock: aceita o mínimo de cada kind e aponta o que falta', () => {
  assert.equal(validarBlock({ kind: 'dataset', dataset: ds([cat()], []) }).ok, true);
  assert.equal(validarBlock({ kind: 'dataset' }).ok, false);
  assert.equal(validarBlock({ kind: 'xpto' }).ok, false);
  assert.equal(validarBlock({ kind: 'dataset', visual: { type: 'bolha' }, dataset: ds([cat()], []) }).ok, false);
  assert.equal(validarBlock({ kind: 'nav', nav: { route: '/x' } }).ok, true);
  assert.equal(validarBlock({ kind: 'kpis', kpis: [] }).ok, true);
  assert.equal(validarBlock({ kind: 'confirm', confirm: {} }).ok, false);
});

test('normalizarBlock: id estável, visual string vira objeto, coluna sem tipo vira text', () => {
  const b = normalizarBlock({ kind: 'dataset', visual: 'bar', dataset: { columns: [{ key: 'a' }], rows: [{ a: 1 }] } });
  assert.ok(b.id);
  assert.deepEqual(b.visual, { type: 'bar' });
  assert.equal(b.dataset.columns[0].type, 'text');
  assert.equal(b.dataset.total, 1);
  assert.deepEqual(b.actions, []);
});

test('perfilDoDataset separa categóricas, numéricas e temporais', () => {
  const p = perfilDoDataset(ds([cat(), num(), num('vgv', 'currency'), mes()], []));
  assert.equal(p.categoricas.length, 1);
  assert.equal(p.numericas.length, 2);
  assert.equal(p.temporais.length, 1);
});

test('escolherVisual: série temporal → line; com meta → combo', () => {
  const rows = linhas(6, (i) => ({ mes: `2026-0${i + 1}`, valor: i * 10 }));
  assert.equal(escolherVisual(ds([mes(), num()], rows)), 'line');
  assert.equal(escolherVisual(ds([mes(), num(), num('meta')], rows.map((r) => ({ ...r, meta: 50 })), { series: [{ key: 'meta', role: 'meta' }] })), 'combo');
});

test('escolherVisual: período x categoria (longo) → heatmap', () => {
  const rows = [];
  for (const m of ['2026-07', '2026-08', '2026-09']) for (const c of ['A', 'B']) rows.push({ mes: m, cca: c, n: 1 });
  assert.equal(escolherVisual(ds([mes(), cat('cca'), num('n')], rows)), 'heatmap');
});

test('escolherVisual: ≤6 partes de um todo → donut; ≤15 → rank; >15 → table; percentual nunca é donut', () => {
  assert.equal(escolherVisual(ds([cat(), num()], linhas(4, (i) => ({ nome: `c${i}`, valor: i + 1 })))), 'donut');
  assert.equal(escolherVisual(ds([cat(), num()], linhas(10, (i) => ({ nome: `c${i}`, valor: i })))), 'rank');
  assert.equal(escolherVisual(ds([cat(), num()], linhas(20, (i) => ({ nome: `c${i}`, valor: i })))), 'table');
  assert.equal(escolherVisual(ds([cat(), num('taxa', 'percent')], linhas(4, (i) => ({ nome: `c${i}`, taxa: 10 })))), 'rank');
  assert.equal(escolherVisual(ds([cat(), num()], linhas(4, (i) => ({ nome: `c${i}`, valor: i - 2 })))), 'rank', 'negativo não é parte de um todo');
});

test('escolherVisual: 2+ numéricas comparáveis → column; unidades diferentes → table', () => {
  assert.equal(escolherVisual(ds([cat(), num('a'), num('b')], linhas(5, (i) => ({ nome: `c${i}`, a: i, b: i * 2 })))), 'column');
  assert.equal(escolherVisual(ds([cat(), num('a'), num('b', 'currency')], linhas(5, (i) => ({ nome: `c${i}`, a: i, b: i * 2 })))), 'table');
  assert.equal(escolherVisual(ds([cat(), num('a'), num('b'), num('c'), num('d'), num('e')], linhas(3, (i) => ({ nome: `c${i}` })))), 'table');
});

test('visuaisPossiveis e visualDoBloco: tabela sempre; pedido inválido cai na régua', () => {
  const d = ds([cat(), num()], linhas(4, (i) => ({ nome: `c${i}`, valor: i + 1 })));
  const poss = visuaisPossiveis(d);
  assert.ok(poss.includes('table') && poss.includes('donut') && poss.includes('rank'));
  assert.ok(!poss.includes('line'));
  // Duas numéricas: rosca continua possível (usa a primeira); pedido de donut vale.
  const d2 = ds([cat(), num(), num('b')], linhas(4, (i) => ({ nome: `c${i}`, valor: i + 1, b: 2 })));
  assert.ok(visuaisPossiveis(d2).includes('donut'));
  assert.equal(visualDoBloco({ kind: 'dataset', visual: { type: 'donut' }, dataset: d2 }), 'donut');
  assert.equal(visualDoBloco({ kind: 'dataset', visual: { type: 'bar' }, dataset: d }), 'bar');
  assert.equal(visualDoBloco({ kind: 'dataset', visual: { type: 'line' }, dataset: d }), 'donut');
  assert.equal(visualDoBloco({ kind: 'nav', visual: null }), null);
});

test('legacyActionToBlocks: table → dataset/table; chart → dataset + kpis do top3; pie → donut', () => {
  const t = legacyActionToBlocks({ type: 'table', title: 'X', columns: [{ key: 'a', label: 'A' }], rows: [{ a: 1 }], total: 1 });
  assert.equal(t.length, 1);
  assert.equal(t[0].kind, 'dataset');
  assert.equal(t[0].visual.type, 'table');
  const c = legacyActionToBlocks({ type: 'chart', chartType: 'bar', labels: ['a', 'b'], data: [3, 1], top_breakdown: [{ label: 'a', value: 3, percent: 75 }] });
  assert.equal(c[0].kind, 'dataset');
  assert.equal(c[0].visual.type, 'bar');
  assert.deepEqual(c[0].dataset.rows, [{ label: 'a', value: 3 }, { label: 'b', value: 1 }]);
  assert.equal(c[1].kind, 'kpis');
  assert.equal(legacyActionToBlocks({ type: 'chart', chartType: 'pie', labels: ['a'], data: [1] })[0].visual.type, 'donut');
});

test('legacyActionToBlocks: navigate → nav; desconhecido → legacy; faixa de sugestão por source', () => {
  assert.equal(legacyActionToBlocks({ type: 'navigate', route: '/x' })[0].kind, 'nav');
  const l = legacyActionToBlocks({ type: 'imobiliaria_cards', cards: [] });
  assert.equal(l[0].kind, 'legacy');
  assert.equal(l[0].legacyType, 'imobiliaria_cards');
  const s = legacyActionToBlocks({ type: 'table', columns: [], rows: [], context: { source: 'leads' } });
  assert.equal(s.length, 2);
  assert.equal(s[1].legacyType, 'source:leads');
  assert.equal(legacyActionToBlocks({ type: 'precadastros_summary' }).at(-1).legacyType, 'source:precadastros');
});

test('blocksDe: action nova com blocks passa direto (normalizada); sem action → []', () => {
  const b = blocksDe({ type: 'blocks', blocks: [{ kind: 'kpis', kpis: [{ label: 'x', value: 1 }] }] });
  assert.equal(b.length, 1);
  assert.ok(b[0].id);
  assert.deepEqual(blocksDe(null), []);
});

test('formatos: numeroDe lê valor formatado; formatarValor por tipo', () => {
  assert.equal(numeroDe('R$ 3.597.425'), 3597425);
  assert.equal(numeroDe('13,5%'), 13.5);
  assert.equal(numeroDe('1.234,56'), 1234.56);
  assert.equal(numeroDe(null), null);
  assert.equal(formatarValor(1234, 'number'), '1.234');
  assert.equal(formatarValor(1500000, 'currency', { compacto: true }), 'R$ 1,5 mi');
  assert.equal(formatarValor(12.34, 'percent'), '12,3%');
  assert.equal(formatarValor('2026-09-01', 'month'), 'set/26');
  assert.equal(formatarValor('2026-09-11', 'date'), '11/09/2026');
  assert.equal(formatarValor(null, 'number'), '-');
});
