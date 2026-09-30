// Tabela de preço recortada para UM módulo da ficha.
//
// O CV lista na tabela TODAS as unidades do empreendimento (módulos vendidos
// vêm com valor zerado), e a ficha é por módulo. O back marca cada unidade com
// `idetapa` e `adimplencia` (Desconto Construtora em R$); aqui a tabela vira a
// do módulo: contagem, faixa de preço, adimplência e o fluxo médio das séries.
//
// `unit_count` conta só unidade COM preço: tabela que não precifica o módulo
// fica com 0 e as telas já tratam isso como "sem dados".

const media = (vals) => (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null);

export function recortarTabela(t, idetapa) {
    const todas = t?.unidades ?? [];
    const temEtapa = idetapa != null && todas.some(u => u.idetapa != null);
    const doModulo = temEtapa ? todas.filter(u => String(u.idetapa) === String(idetapa)) : todas;
    const comPreco = doModulo.filter(u => Number(u.valor_total) > 0);

    // Fluxo médio: das disponíveis, que é o que o corretor vende; se o módulo
    // já vendeu tudo, de todas as precificadas.
    const disponiveis = comPreco.filter(u => /dispon/i.test(u.situacao ?? ''));
    const base = disponiveis.length ? disponiveis : comPreco;
    const ordem = [];
    const porSerie = new Map();
    for (const u of base) {
        for (const s of (u.series ?? [])) {
            if (!porSerie.has(s.nome)) {
                ordem.push(s.nome);
                porSerie.set(s.nome, { nome: s.nome, qtd_parcelas: s.qtd_parcelas, data_vencimento: s.data_vencimento, valores: [] });
            }
            porSerie.get(s.nome).valores.push(Number(s.valor) || 0);
        }
    }
    const fluxo = ordem.map(nome => {
        const s = porSerie.get(nome);
        return { nome, qtd_parcelas: s.qtd_parcelas, data_vencimento: s.data_vencimento, valor: media(s.valores) };
    });

    const precos = comPreco.map(u => Number(u.valor_total));
    const adimpl = base.map(u => Number(u.adimplencia)).filter(v => v > 0);
    const liquidos = base.map(u => Number(u.valor_total) - (Number(u.adimplencia) || 0));

    return {
        ...t,
        unidades: doModulo,
        unit_count: comPreco.length,
        disponiveis: disponiveis.length,
        price_min: precos.length ? Math.min(...precos) : null,
        price_max: precos.length ? Math.max(...precos) : null,
        price_avg: media(precos),
        price_total: precos.length ? precos.reduce((a, b) => a + b, 0) : null,
        fluxo,
        fluxo_base: disponiveis.length ? 'disponíveis' : 'unidades precificadas',
        fluxo_n: base.length,
        adimplencia_n: adimpl.length,
        adimplencia_min: adimpl.length ? Math.min(...adimpl) : null,
        adimplencia_max: adimpl.length ? Math.max(...adimpl) : null,
        adimplencia_avg: media(adimpl),
        liquido_avg: adimpl.length ? media(liquidos) : null,
    };
}
