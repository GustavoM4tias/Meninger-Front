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

  // "Recurso próprio até a entrega" tira A PARCELA DAS CHAVES, não o mês
  // inteiro dela.
  //
  // Descontar `fluxo[chaves]` levava junto a mensal que cai no mesmo mês da
  // entrega, e o Verona aparecia com 28,91% quando o plano dele soma exatos
  // 30,00%. Dois erros de R$ 3.100 viravam um diagnóstico errado: parecia
  // tabela mal desenhada, quando o desenho está certo e o problema é só o
  // cronograma da última mensal.
  const valorDasChaves = (series || [])
    .filter(x => x.papel === 'chaves' || /CHAVE/i.test(x.nome || ''))
    .reduce((a, x) => a + (Number(x.valor) || 0) * Math.max(0, Math.round(Number(x.qtd) || 0)), 0)

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
    valorDasChaves,
    aposChaves: chaves == null ? 0 : ateB(null) - ateB(chaves),
    ultimoMes: bruto.length - 1,
  }
}

const fracao = (parte, todo) => (todo > 0 ? parte / todo : 0)

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
      { chave: 'obra', rotulo: 'Recurso próprio até a entrega', base: 'bruto', valor: fracao(bruto(ind.ateChavesSemChaves), ind.total), minimo: regras.ateChavesSemChavesMin },
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
      .map(c => ({ ...c, minimo: Number(c.minimo), ok: c.valor >= Number(c.minimo) - 1e-9 }))
  }

  const daTabela = medir(t)
  const cortes = medir(p).map((c, i) => ({
    ...c,
    valorTabela: daTabela[i]?.valor ?? null,
    tabelaOk: daTabela[i]?.ok ?? true,
  }))

  const difVp = p.vpl - t.vpl
  const vpOk = difVp >= -1e-6

  // Parcela depois da entrega: reprova só acima de uma folga.
  //
  // A própria tabela do Verona tem 24 mensais começando no mês 1 com as chaves
  // no 23, então a última cai um mês depois - R$ 3.100 numa venda de R$ 568 mil,
  // 0,5%. Reprovar por isso seria transformar um arredondamento de cronograma
  // em impedimento; ignorar seria deixar passar uma proposta que empurra meio
  // ano de parcela para depois da chave. A folga é a linha entre as duas.
  const folgaAposChaves = p.total * (Number(regras.aposChavesTolerancia) || 0)
  const chavesOk = !regras.semParcelaAposChaves || p.aposChaves <= folgaAposChaves + 1e-6
  const chavesAviso = p.aposChaves > 1e-6 && chavesOk

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
    folgaAposChaves,
    fecha: cortes.every(c => c.ok) && vpOk && chavesOk,
  }
}
