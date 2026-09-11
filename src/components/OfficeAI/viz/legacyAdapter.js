/**
 * legacyActionToBlocks - traduz a `action` no formato antigo (um `type` por
 * tool) para EmeBlock[].
 * ─────────────────────────────────────────────────────────────────────────────
 * É o que faz TODA resposta passar pelo dispatcher novo (ChatBlock) já na
 * fase 1, mesmo vinda de tool que ainda não devolve `blocks`. O que já tem
 * componente na galeria vira bloco de verdade (table, chart, navigate); o
 * resto vira bloco `legacy`, que o ChatBlock entrega ao renderer antigo.
 *
 * Fase 4 do plano: à medida que cada tool passa a devolver `blocks`, o ramo
 * dela aqui deixa de ser usado. Fase 5: este arquivo é apagado.
 */
import { normalizarBlock } from './emeBlock.js';

const CATEGORIA = { key: 'label', label: 'Categoria', type: 'text' };

/** Gráfico antigo (labels[] + data[]) → dataset de duas colunas. */
function chartParaDataset(a) {
  const labels = Array.isArray(a.labels) ? a.labels : [];
  const data = Array.isArray(a.data) ? a.data : [];
  const rows = labels.map((l, i) => ({ label: l ?? '-', value: Number(data[i] ?? 0) }));
  const valorCol = { key: 'value', label: a.valueLabel || 'Total', type: a.valueType || 'number' };
  return {
    columns: [CATEGORIA, valorCol],
    rows,
    total: a.total ?? rows.length,
    // Barra antiga era sempre ranking descendente: mantém a leitura.
    parteDeUmTodo: a.chartType === 'pie' ? true : undefined,
  };
}

export function legacyActionToBlocks(action) {
  if (!action || typeof action !== 'object') return [];
  const blocks = [];
  const base = { title: action.title, subtitle: action.subtitle, source: action.fonte?.tipo ? `${action.fonte.tipo}${action.fonte.mes_referencia ? ` ${action.fonte.mes_referencia}` : ''}` : undefined };

  switch (action.type) {
    case 'table':
      blocks.push({
        ...base, kind: 'dataset', visual: { type: 'table' },
        dataset: { columns: action.columns || [], rows: action.rows || [], total: action.total, truncated: !!action.truncated },
        actions: action.screenLink ? [{ kind: 'navigate', label: 'Abrir tela', payload: { route: action.screenLink } }] : [],
      });
      break;

    case 'chart':
      blocks.push({
        ...base, kind: 'dataset',
        visual: { type: action.chartType === 'pie' ? 'donut' : 'bar' },
        dataset: chartParaDataset(action),
        // Os chips de "top 3" do gráfico antigo viram KPIs de apoio.
        actions: action.screenLink ? [{ kind: 'navigate', label: 'Abrir tela', payload: { route: action.screenLink } }] : [],
      });
      if (Array.isArray(action.top_breakdown) && action.top_breakdown.length) {
        blocks.push({
          kind: 'kpis', inline: true,
          kpis: action.top_breakdown.slice(0, 3).map((t) => ({
            label: t.label, value: t.value, hint: t.percent != null ? `${t.percent}%` : undefined,
          })),
        });
      }
      break;

    case 'navigate':
      blocks.push({ kind: 'nav', nav: { route: action.route, filters: action.filters || {}, message: action.message } });
      break;

    case 'memory_proposal':
      blocks.push({
        kind: 'confirm',
        confirm: {
          title: 'Guardar esta preferência?',
          detail: `${action.proposta?.key} · ${action.proposta?.value}`,
          note: action.substitui ? `Substitui: "${action.substitui}"` : undefined,
          confirmLabel: 'Guardar', declineLabel: 'Agora não',
          effect: { type: 'memory', proposta: action.proposta },
        },
      });
      break;

    default:
      // Sem componente novo ainda: renderer antigo, embrulhado.
      if (action.type) blocks.push({ kind: 'legacy', legacyType: action.type, action });
  }

  // Faixas de sugestão por módulo (LeadsActions, PrecadastrosActions...).
  // Continuam como renderer antigo até virarem `choice` (fase 3/4).
  const source = action.context?.source || action.source
    || ({ precadastros_summary: 'precadastros', reservas_summary: 'reservas', enterprise_detail: 'enterprises' })[action.type]
    || null;
  if (source && ['leads', 'events', 'enterprises', 'mcmv', 'precadastros', 'reservas'].includes(source)) {
    blocks.push({ kind: 'legacy', legacyType: `source:${source}`, action });
  }

  return blocks.map(normalizarBlock);
}

/**
 * Blocos de uma action, venha ela nova (`blocks[]`) ou antiga (`type`).
 * É a única porta que o ChatMessage usa.
 */
export function blocksDe(action) {
  if (!action) return [];
  if (Array.isArray(action.blocks) && action.blocks.length) {
    const out = action.blocks.map(normalizarBlock);
    // Uma tool nova ainda pode mandar a faixa de sugestões antiga junto.
    const source = action.context?.source;
    if (source && ['leads', 'events', 'enterprises', 'mcmv', 'precadastros', 'reservas'].includes(source)) {
      out.push(normalizarBlock({ kind: 'legacy', legacyType: `source:${source}`, action }));
    }
    return out;
  }
  return legacyActionToBlocks(action);
}

export default { legacyActionToBlocks, blocksDe };
