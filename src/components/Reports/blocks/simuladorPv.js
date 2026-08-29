// A conta do simulador de proposta, fora do componente de propósito.
//
// Fluxo de pagamento é a parte que não pode estar errada: o veredito
// "fecha / não fecha" é a única coisa que a pessoa lê. Num .vue a conta só se
// testa abrindo a tela; aqui ela se testa sozinha, com a tabela real de um
// empreendimento, e é assim que os números foram conferidos contra o
// valor_total que o CV informa por unidade.
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
 * Os números de um fluxo: total, valor presente e os acumulados que viram
 * corte. `chaves` vem de fora porque quem manda é a entrega da TABELA - a
 * proposta não pode mudar a data da obra para caber na regra.
 */
export function indicadores(series, { mesBase, vplAnual = 0.06, chaves = null } = {}) {
  const fluxo = montarFluxo(series, mesBase)
  const i = taxaMensal(vplAnual)
  const total = fluxo.reduce((a, v) => a + v, 0)
  const vpl = fluxo.reduce((a, v, m) => a + v / Math.pow(1 + i, m), 0)
  const ate = (n) => (n == null ? total : fluxo.slice(0, n + 1).reduce((a, v) => a + v, 0))
  const noMes = chaves == null ? 0 : (fluxo[chaves] || 0)
  return {
    fluxo,
    total,
    vpl,
    ato: fluxo[0] || 0,
    entrada6m: ate(5),
    ano1: ate(11),
    ano2: ate(23),
    ateChaves: ate(chaves),
    // "Até chaves, sem chaves": o que o cliente pagou com recurso próprio
    // durante a obra, sem a parcela da entrega (que costuma ser o repasse).
    // É o corte que a diretoria de fato usa em lançamento.
    ateChavesSemChaves: ate(chaves) - noMes,
    aposChaves: chaves == null ? 0 : total - ate(chaves),
    ultimoMes: fluxo.length - 1,
  }
}

const fracao = (parte, todo) => (todo > 0 ? parte / todo : 0)

/**
 * O veredito. Devolve os cortes um a um (para a tela mostrar qual reprovou) e
 * o `fecha` só quando TODOS passam - inclusive o valor presente, que é o corte
 * que a soma nominal esconde.
 */
export function avaliar({ tabela = [], proposta = [], mesBase, regras = {} } = {}) {
  const vplAnual = regras.vplAnual ?? 0.06
  const chaves = mesDasChaves(tabela, mesBase)
  const t = indicadores(tabela, { mesBase, vplAnual, chaves })
  const p = indicadores(proposta, { mesBase, vplAnual, chaves })

  // Os mesmos cortes medidos NA TABELA também, não só na proposta.
  //
  // Sem isso o simulador mente por omissão: a tabela REV08 do Verona já entrega
  // 28,91% até as chaves contra uma meta de 30%, então abrir a tela numa
  // unidade intocada pintava tudo de vermelho e parecia defeito da conta. Com o
  // valor da tabela ao lado, a leitura certa aparece sozinha - quem está fora
  // do corte é a tabela, não a proposta que a pessoa acabou de montar.
  const medir = (ind) => [
    { chave: 'ato', rotulo: 'Ato', valor: fracao(ind.ato, ind.total), minimo: regras.atoMin },
    { chave: 'entrada6m', rotulo: 'Entrada (6 primeiros meses)', valor: fracao(ind.entrada6m, ind.total), minimo: regras.entrada6mMin },
    { chave: 'ano1', rotulo: 'Pago no 1º ano', valor: fracao(ind.ano1, ind.total), minimo: regras.primeiroAnoMin },
    { chave: 'ano2', rotulo: 'Pago no 2º ano', valor: fracao(ind.ano2, ind.total), minimo: regras.segundoAnoMin },
    { chave: 'obra', rotulo: 'Até as chaves, sem as chaves', valor: fracao(ind.ateChavesSemChaves, ind.total), minimo: regras.ateChavesSemChavesMin },
    { chave: 'ateChaves', rotulo: 'Até as chaves', valor: fracao(ind.ateChaves, ind.total), minimo: regras.ateChavesMin },
  ]
    // Corte sem mínimo configurado não vira reprovação silenciosa: some da
    // lista. É o que permite desligar um corte que não vale para o produto.
    .filter(c => Number.isFinite(Number(c.minimo)))
    .map(c => ({ ...c, minimo: Number(c.minimo), ok: c.valor >= Number(c.minimo) - 1e-9 }))

  const daTabela = medir(t)
  const cortes = medir(p).map((c, i) => ({
    ...c,
    valorTabela: daTabela[i]?.valor ?? null,
    tabelaOk: daTabela[i]?.ok ?? true,
  }))

  const difVp = p.vpl - t.vpl
  const vpOk = difVp >= -1e-6
  const chavesOk = !regras.semParcelaAposChaves || p.aposChaves <= 1e-6

  return {
    tabela: t,
    proposta: p,
    chaves,
    cortes,
    cortesTabela: daTabela,
    difVp,
    difNominal: p.total - t.total,
    vpOk,
    chavesOk,
    fecha: cortes.every(c => c.ok) && vpOk && chavesOk,
  }
}
