// Fontes de dados oferecidas no modal de exportação em Excel.
// Compartilhado pela visualização interna (/relatorios/:id/view) e pela página
// do link público (/r/:token) — as duas exportam pelo mesmo motor no servidor.

// Rótulo da FONTE (não do bloco): é assim que o leitor pensa o dado, e é o
// mesmo vocabulário do rodapé do relatório.
export const FONTE_LABEL = {
  query_leads: 'CRM de Leads',
  query_precadastros: 'Pré-cadastros (CV)',
  query_reservas: 'Reservas (CV)',
  query_repasses: 'Repasses (CV)',
  query_repasses_contratos: 'Fila do validador de contratos',
  query_enterprises: 'Empreendimentos',
  query_custos: 'Custos financeiros',
  query_boletos: 'Boletos Caixa',
  query_condition_sheets: 'Fichas comerciais',
  query_projections: 'Projeção de vendas',
  get_consolidated_sales: 'Vendas (Faturamento)',
  query_checklists: 'Checklists',
  query_event_plans: 'Plano de eventos',
  query_people: 'Pessoas',
  query_events: 'Eventos',
  imobiliarias_search: 'Imobiliárias parceiras',
}

// A exportação reconsulta em modo lista, sem group_by: datasets da mesma fonte
// com o mesmo recorte devolvem as MESMAS linhas. Ofertar os 7 datasets de um
// painel daria 7 abas com 3 pares repetidos — aqui vira uma opção por fonte,
// exatamente como o servidor deduplica na hora de montar as abas.
export function datasetsExportaveis(spec) {
  const porFonte = new Map()
  for (const d of (spec?.datasets || [])) {
    const semForma = { ...(d.base_args || {}) }
    for (const k of ['group_by', 'metric', 'format', 'limit']) delete semForma[k]
    const chave = `${d.tool}|${Object.keys(semForma).sort().map((k) => `${k}=${semForma[k]}`).join('&')}`
    if (porFonte.has(chave)) continue
    porFonte.set(chave, {
      id: d.id,
      label: FONTE_LABEL[d.tool] || d.label || d.id,
      hint: d.label && d.label !== FONTE_LABEL[d.tool] ? d.label : '',
    })
  }
  return [...porFonte.values()]
}
