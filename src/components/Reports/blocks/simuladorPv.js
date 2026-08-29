// A conta do simulador de proposta, fora do componente de propósito.
//
// Fluxo de pagamento é a parte que não pode estar errada: o veredito
// "fecha / não fecha" é a única coisa que a pessoa lê. Num .vue a conta só se
// testa abrindo a tela; aqui ela se testa sozinha, com a tabela real de um
// empreendimento, e é assim que os números foram conferidos contra o
// valor_total que o CV informa por unidade.
//
// O QUE O CLIENTE PAGA NÃO É O QUE A COMPANHIA RECEBE
//
// A comissão da imobiliária sai do ato. Num ato de 5% com comissão de 4%,
// entram 1% - e é sobre esse 1% que o corte do ato foi escrito. Medir o corte
// no bruto dava 5% e aprovava com folga um ato que, para a companhia, está
// exatamente no limite.
//
// Por isso cada indicador existe nas duas bases: o BRUTO (o que o cliente paga)
// e o LÍQUIDO (o que entra, já sem a comissão). O corte do ato usa o líquido;
// os cortes de desenho do produto - em Sinop, 30% de recurso próprio até a
// entrega e 70% de financiamento na chave - usam o bruto. A porcentagem é
// sempre sobre o valor da venda.
//
// Tudo em meses de calendário a partir de um MÊS BASE comum. Comparar proposta
// e tabela em bases diferentes daria diferença de valor presente que não
// existe - é o mesmo dinheiro lido de dois relógios.

/** Distância em meses de calendário entre duas datas ISO (nunca negativa). */
export function mesesEntre(iso, baseIso) {
  if (!iso || !baseIso) return 0
  const [ay, am] = String(iso).split('-').map(Number)
  const [by, bm] = String(baseIso).split('-').map(Number)
  if (!ay || !by) return 0
  return Math.max(0, (ay - by) * 12 + (am - bm))
}

/**
 * Séries -> fluxo mês a mês.
 *
 * Cada série vira `qtd` lançamentos espaçados pela periodicidade: 4 semestrais
 * caem em 0, 6, 12 e 18 meses depois do primeiro vencimento, e não em quatro
 * meses seguidos - o erro que faz uma proposta ruim parecer excelente.
 */
export function montarFluxo(series, mesBase) {
  const arr = []
  let ultimo = 0
  for (const s of series || []) {
    const inicio = mesesEntre(s.vencimento, mesBase)
    const passo = Math.max(1, Number(s.periodicidade) || 1)
    const qtd = Math.max(0, Math.round(Number(s.qtd) || 0))
    const valor = Number(s.valor) || 0
    for (let i = 0; i < qtd; i++) {
      const m = inicio + i * passo
      arr[m] = (arr[m] || 0) + valor
      if (m > ultimo) ultimo = m
    }
  }
  for (let m = 0; m <= ultimo; m++) if (!arr[m]) arr[m] = 0
  return arr
}

/** Taxa mensal equivalente à anual. Juro composto, não anual/12. */
export function taxaMensal(anual) {
  return Math.pow(1 + (Number(anual) || 0), 1 / 12) - 1
}

/** Mês da entrega, lido da série de chaves (é ela que define "até chaves"). */
export function mesDasChaves(series, mesBase) {
  const s = (series || []).find(x => x.papel === 'chaves' || /CHAVE/i.test(x.nome || ''))
  return s ? mesesEntre(s.vencimento, mesBase) : null
}

/**
 * Os números de um fluxo: total, comissão, valor presente e os acumulados que
 * viram corte.
 *
 * `chaves` vem de fora porque quem manda é a entrega da TABELA - a proposta não
 * pode mudar a data da obra para caber na regra.
 */
export function indicadores(series, {
  mesBase, vplAnual = 0.06, chaves = null, comissaoPct = 0, mesDaComissao = 0,
} = {}) {
  const bruto = montarFluxo(series, mesBase)
  const total = bruto.reduce((a, v) => a + v, 0)

  // Comissão: percentual do valor da venda, saindo de uma vez no mês do ato.
  // É uma saída, não um desconto do preço - o cliente paga o cheio.
  const comissao = total * (Number(comissaoPct) || 0)
  const liquido = bruto.slice()
  const mc = Math.max(0, Math.min(mesDaComissao || 0, liquido.length - 1))
  if (comissao) liquido[mc] = (liquido[mc] || 0) - comissao

  const i = taxaMensal(vplAnual)
  const vpl = liquido.reduce((a, v, m) => a + v / Math.pow(1 + i, m), 0)
  const vplBruto = bruto.reduce((a, v, m) => a + v / Math.pow(1 + i, m), 0)

  const ate = (arr) => (n) => (n == null ? arr.reduce((a, v) => a + v, 0)
    : arr.slice(0, n + 1).reduce((a, v) => a + v, 0))
  const ateL = ate(liquido)
  const ateB = ate(bruto)

  // RECURSO PRÓPRIO É O QUE NÃO É FINANCIAMENTO - não importa a data.
  //
  // O 30 do 30/70 é a natureza do dinheiro, não o calendário: parcela de
  // recurso próprio que cai depois da entrega continua compondo os 30%. Contar
  // "o que caiu até a chave" tirava dos 30% a última mensal do Verona e dava
  // 29,46% num plano que soma exatos 30,00%.
  //
  // O calendário vira uma regra à parte (quantos meses depois da chave a última
  // parcela pode cair), que é onde ele de fato importa.
  const somaSeries = (filtro) => (series || []).filter(filtro)
    .reduce((a, x) => a + (Number(x.valor) || 0) * Math.max(0, Math.round(Number(x.qtd) || 0)), 0)

  const ehFinanciamento = (x) => x.papel === 'chaves' || x.papel === 'financiamento' || /CHAVE/i.test(x.nome || '')
  const valorDasChaves = somaSeries(x => x.papel === 'chaves' || /CHAVE/i.test(x.nome || ''))
  const valorFinanciado = somaSeries(ehFinanciamento)

  return {
    fluxo: liquido,
    fluxoBruto: bruto,
    total,                     // valor da venda (o que o cliente paga)
    comissao,
    liquidoTotal: total - comissao,
    vpl,                       // valor presente do que ENTRA
    vplBruto,
    ato: ateL(0),
    atoBruto: ateB(0),
    entrada6m: ateL(5),
    ano1: ateL(11),
    ano2: ateL(23),
    ateChaves: ateL(chaves),
    // O que entrou durante a obra, sem a parcela da entrega (que é o repasse
    // do banco). É o corte de caixa de obra - em Sinop, os 30% do 30/70.
    ateChavesSemChaves: ateL(chaves) - valorDasChaves,
    // Os 30%: tudo que o cliente paga com o próprio dinheiro, fora o
    // financiamento da entrega.
    recursoProprio: total - valorFinanciado,
    valorDasChaves,
    valorFinanciado,
    // Quantos meses depois da entrega vai a última parcela do fluxo.
    mesesAposChaves: chaves == null ? 0 : Math.max(0, bruto.length - 1 - chaves),
    aposChaves: chaves == null ? 0 : ateB(null) - ateB(chaves),
    ultimoMes: bruto.length - 1,
  }
}

const fracao = (parte, todo) => (todo > 0 ? parte / todo : 0)

// Quanto um corte pode faltar em REAIS e ainda ser arredondamento, não desconto.
const TOLERANCIA_REAIS = 1

/**
 * O veredito. Devolve os cortes um a um (para a tela mostrar qual reprovou) e
 * o `fecha` só quando TODOS passam - inclusive o valor presente, que é o corte
 * que a soma nominal esconde.
 */
export function avaliar({ tabela = [], proposta = [], mesBase, regras = {} } = {}) {
  const opts = {
    mesBase,
    vplAnual: regras.vplAnual ?? 0.06,
    chaves: mesDasChaves(tabela, mesBase),
    comissaoPct: regras.comissaoPct ?? 0,
    mesDaComissao: regras.mesDaComissao ?? 0,
  }
  const t = indicadores(tabela, opts)
  const p = indicadores(proposta, opts)

  // Os mesmos cortes medidos NA TABELA também, não só na proposta.
  //
  // Sem isso o simulador mente por omissão: a tabela REV08 do Verona já entrega
  // 28,9% até as chaves contra uma meta de 30%, então abrir a tela numa unidade
  // intocada pintava tudo de vermelho e parecia defeito da conta. Com o valor
  // da tabela ao lado, a leitura certa aparece sozinha - quem está fora do
  // corte é a tabela, não a proposta que a pessoa acabou de montar.
  //
  // E CADA CORTE DIZ SOBRE QUAL DINHEIRO ELE FALA.
  //
  // O do ato é sobre o LÍQUIDO: a comissão sai dali, e um ato de 5% com 4% de
  // comissão deixa 1% na companhia - é esse 1% que o corte sempre mediu.
  // Os outros são sobre o que o CLIENTE PAGA, porque o desenho do produto é
  // dito assim: em Sinop, 30% de recurso próprio até a entrega e 70% de
  // financiamento na chave. Misturar as duas bases faria a mesma tabela passar
  // ou reprovar dependendo de qual linha se olha.
  //
  // Como a comissão sai de uma vez no ato, o bruto de qualquer acumulado é o
  // líquido mais ela - não precisa de um segundo fluxo só para isso.
  const medir = (ind) => {
    const bruto = (v) => v + ind.comissao
    return [
      { chave: 'ato', rotulo: 'Ato, já sem a comissão', base: 'líquido', valor: fracao(ind.ato, ind.total), minimo: regras.atoMin },
      { chave: 'entrada6m', rotulo: 'Pago nos 6 primeiros meses', base: 'bruto', valor: fracao(bruto(ind.entrada6m), ind.total), minimo: regras.entrada6mMin },
      { chave: 'ano1', rotulo: 'Pago no 1º ano', base: 'bruto', valor: fracao(bruto(ind.ano1), ind.total), minimo: regras.primeiroAnoMin },
      { chave: 'ano2', rotulo: 'Pago no 2º ano', base: 'bruto', valor: fracao(bruto(ind.ano2), ind.total), minimo: regras.segundoAnoMin },
      { chave: 'proprio', rotulo: 'Recurso próprio (fora o financiamento)', base: 'bruto', valor: fracao(ind.recursoProprio, ind.total), minimo: regras.recursoProprioMin },
      { chave: 'ateChaves', rotulo: 'Pago até as chaves', base: 'bruto', valor: fracao(bruto(ind.ateChaves), ind.total), minimo: regras.ateChavesMin },
    ]
      // Corte sem mínimo configurado não vira reprovação silenciosa: some da
      // lista. É o que permite desligar um corte que não vale para o produto -
      // em Sinop, o 1º e o 2º ano, que vinham do produto de Marília.
      // Number(null) e Number('') dao 0, e 0 e finito: sem esta primeira
      // condicao o corte desligado voltava como "min 0,00%" e passava sempre,
      // que e pior do que reprovar - poluia a lista fingindo que foi conferido.
      .filter(c => c.minimo !== null && c.minimo !== undefined && c.minimo !== ''
        && Number.isFinite(Number(c.minimo)))
      // A TOLERÂNCIA É EM DINHEIRO, não um epsilon de ponto flutuante.
      //
      // As parcelas da tabela são arredondadas ao centavo, então o plano quase
      // nunca cai exatamente no corte. A tabela do Verona soma R$ 199.137,97 de
      // recurso próprio numa venda de R$ 663.793,24, e 30% seriam R$ 199.137,972:
      // dois milésimos de centavo abaixo. Com `- 1e-9` isso reprovava, e a tela
      // dizia "não fecha" numa proposta IDÊNTICA à tabela, sem nenhum número
      // fora do lugar - foi o que o Gustavo viu na BL A - AP 153.
      //
      // Medido nas 140 unidades da REV08: o maior desvio de arredondamento é de
      // R$ 0,12 (no ato) e o menor de R$ 0,001. Um real cobre todos com folga e
      // ainda é 0,0002% de uma venda de R$ 600 mil - desconto de verdade é
      // ordens de grandeza maior, e tirar R$ 400 de uma semestral continua
      // reprovando.
      .map((c) => {
        const minimo = Number(c.minimo)
        const folga = ind.total > 0 ? TOLERANCIA_REAIS / ind.total : 0
        return { ...c, minimo, ok: c.valor >= minimo - folga }
      })
  }

  const daTabela = medir(t)
  const cortes = medir(p).map((c, i) => ({
    ...c,
    valorTabela: daTabela[i]?.valor ?? null,
    tabelaOk: daTabela[i]?.ok ?? true,
  }))

  const difVp = p.vpl - t.vpl
  const vpOk = difVp >= -1e-6

  // A FOLGA É DE DATA, EM MESES - não de valor.
  //
  // A tabela do Verona tem 24 mensais a partir do mês 1 com a chave no mês 23,
  // então a última cai UM mês depois da entrega. Um mês é o padrão da casa e
  // passa; dois ou mais é proposta empurrando parcela para depois da chave, e
  // aí bloqueia. O dinheiro dessa parcela continua contando nos 30% - ela é
  // recurso próprio, só está atrasada.
  const folgaMeses = Number(regras.aposChavesMesesTolerancia ?? 0)
  const chavesOk = !regras.semParcelaAposChaves || p.mesesAposChaves <= folgaMeses
  const chavesAviso = p.mesesAposChaves > 0 && chavesOk

  return {
    tabela: t,
    proposta: p,
    chaves: opts.chaves,
    cortes,
    cortesTabela: daTabela,
    difVp,
    difNominal: p.total - t.total,
    vpOk,
    chavesOk,
    chavesAviso,
    folgaMeses,
    fecha: cortes.every(c => c.ok) && vpOk && chavesOk,
  }
}
