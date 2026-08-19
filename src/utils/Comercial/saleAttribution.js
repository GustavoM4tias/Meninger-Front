// utils/Comercial/saleAttribution.js
//
// Leitura de PROCEDÊNCIA de uma venda do Faturamento: quem captou o cliente
// (lead) e quem fechou (corretor/imobiliária da reserva).
//
// Mora fora dos componentes porque o modal de detalhe e o Relatório Comercial
// precisam ler exatamente do mesmo jeito - se cada tela tivesse a sua cópia,
// o ranking do relatório e o selo do modal acabariam discordando.
//
// Todos os campos abaixo só existem na visão de DETALHE dos contratos
// (`view=detail`); no dashboard eles vêm nulos de propósito.

export const firstContractOf = (sale) => sale?.contracts?.[0] || {};

export const repasseOf = (sale) => firstContractOf(sale)?.repasse?.[0] || null;

export const reservaOf = (sale) => {
  const first = firstContractOf(sale);
  if (first?.reserva) return first.reserva;
  const r = first?.repasse?.[0];
  if (r?.reserva) return r.reserva;
  if (r?.reserva_obj) return r.reserva_obj;
  if (r?.reservaObj) return r.reservaObj;
  return null;
};

// Lead que originou a venda. O servidor só devolve quando a origem está FORA
// dos painéis internos (Corretor/Gestor/Imobiliária), ou seja: se veio objeto,
// o cliente entrou por captação nossa.
export const leadOf = (sale) =>
  (sale?.contracts || []).map((c) => c?.lead_captacao).find(Boolean) || null;

export const saleVeioDeLead = (sale) => !!leadOf(sale);

// Corretor de QUEM VENDEU. Na reserva do CV o nome mora em `corretor.corretor`
// (`nome` não existe lá) e a imobiliária vem como string no mesmo bloco - o
// objeto `imobiliaria` da reserva só está preenchido em parte das linhas.
export const reservaCorretorOf = (sale) =>
  reservaOf(sale)?.corretor?.corretor ||
  repasseOf(sale)?.corretor?.corretor ||
  null;

export const reservaImobiliariaOf = (sale) =>
  reservaOf(sale)?.corretor?.imobiliaria ||
  reservaOf(sale)?.imobiliaria?.nome ||
  repasseOf(sale)?.corretor?.imobiliaria ||
  repasseOf(sale)?.imobiliaria?.nomefantasia ||
  null;

// Corretor/imobiliária que atendeu o LEAD - nem sempre é quem fechou.
export const leadCorretorOf = (sale) => leadOf(sale)?.corretor?.nome || null;
export const leadImobiliariaOf = (sale) => leadOf(sale)?.imobiliaria?.nome || null;

const SEM_ROTULO = 'Sem identificação';

/**
 * Dimensões de análise do Relatório Comercial. Cada uma sabe extrair a chave de
 * agrupamento de uma venda; `vazio` é o rótulo quando a venda não tem o dado.
 */
export const DIMENSOES = {
  imobiliaria: {
    label: 'Imobiliária',
    icon: 'fas fa-building',
    get: reservaImobiliariaOf,
    vazio: 'Venda direta / sem imobiliária',
  },
  corretor: {
    label: 'Corretor',
    icon: 'fas fa-user-tie',
    get: reservaCorretorOf,
    vazio: SEM_ROTULO,
  },
  midia: {
    label: 'Mídia',
    icon: 'fas fa-bullhorn',
    get: (sale) => leadOf(sale)?.midia_principal,
    vazio: 'Sem mídia declarada',
  },
  origem: {
    label: 'Origem',
    icon: 'fas fa-signs-post',
    get: (sale) => leadOf(sale)?.origem,
    vazio: SEM_ROTULO,
  },
  campanha: {
    label: 'Campanha',
    icon: 'fas fa-rectangle-ad',
    get: (sale) => leadOf(sale)?.campanha || leadOf(sale)?.utm_campaign,
    vazio: 'Sem campanha vinculada',
  },
};

/**
 * Agrupa vendas por uma dimensão.
 *
 * @param sales  vendas já deduplicadas (contractsStore.uniqueSales)
 * @param dim    chave de DIMENSOES ou função (sale) => string
 * @param valueOf  como extrair o valor da venda - passe `contractsStore.valuePicker`
 *                 para o ranking seguir o VGV / VGV+DC escolhido na tela.
 * @param opts.incluirVazios  false descarta as vendas sem o dado (padrão: true)
 */
export function agruparVendas(sales, dim, valueOf, { incluirVazios = true } = {}) {
  const def = typeof dim === 'string' ? DIMENSOES[dim] : { get: dim, vazio: SEM_ROTULO };
  if (!def) return [];

  const mapa = new Map();
  let totalValor = 0;
  let totalVendas = 0;

  for (const sale of sales || []) {
    const bruto = def.get(sale);
    const temDado = bruto != null && String(bruto).trim() !== '';
    if (!temDado && !incluirVazios) continue;

    const chave = temDado ? String(bruto).trim() : def.vazio;
    const valor = Number(valueOf(sale)) || 0;

    const linha = mapa.get(chave) || {
      chave, label: chave, semDado: !temDado,
      vendas: 0, valor: 0, comLead: 0,
      // As vendas que compõem a linha seguem junto: é o que o modal de detalhe
      // lista quando o usuário clica no ranking.
      itens: [],
    };
    linha.vendas += 1;
    linha.valor += valor;
    linha.itens.push(sale);
    if (saleVeioDeLead(sale)) linha.comLead += 1;
    mapa.set(chave, linha);

    totalValor += valor;
    totalVendas += 1;
  }

  return [...mapa.values()]
    .map((l) => ({
      ...l,
      ticket: l.vendas ? l.valor / l.vendas : 0,
      shareValor: totalValor ? (l.valor / totalValor) * 100 : 0,
      shareVendas: totalVendas ? (l.vendas / totalVendas) * 100 : 0,
    }))
    .sort((a, b) => b.valor - a.valor);
}
